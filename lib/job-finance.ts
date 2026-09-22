import { Prisma, PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { z } from "zod";
import { financeActor, FinancialRecordError } from "./finance-lock";
import { readPrivateAsset } from "./private-media";
import { DEFAULT_ORG_ID } from "./constants";
import { jobSchema } from "./validators";

const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
export async function jobFinanceReviewData(db: Prisma.TransactionClient | PrismaClient, jobId: string, organizationId: string) {
  const job = await db.job.findFirst({ where: { id: jobId, organizationId }, include: {
    invoices: { orderBy: { id: "asc" }, include: { clientProfile: true, payments: { orderBy: { id: "asc" }, include: { clientProfile: true } } } },
    changeOrders: { where: { status: { in: ["APPROVED", "COMPLETED"] } }, orderBy: { id: "asc" } }, financialBaseline: true,
  } });
  if (!job) throw new FinancialRecordError("Job access denied.");
  for (const invoice of job.invoices) {
    if ((invoice.clientProfile && invoice.clientProfile.organizationId !== organizationId) || invoice.payments.some(payment => payment.clientProfile && payment.clientProfile.organizationId !== organizationId)) throw new FinancialRecordError("Resolve inconsistent invoice or receipt ownership before financial review.");
  }
  const before = {
    job: { id: job.id, contractAmount: job.contractAmount.toString(), amountPaid: job.amountPaid.toString(), balanceDue: job.balanceDue.toString(), updatedAt: job.updatedAt.toISOString() },
    invoices: job.invoices.map(invoice => ({ id: invoice.id, total: invoice.total.toString(), amountPaid: invoice.amountPaid.toString(), balanceDue: invoice.balanceDue.toString(), updatedAt: invoice.updatedAt.toISOString(),
      payments: invoice.payments.map(payment => ({ id: payment.id, amount: payment.amount.toString(), status: payment.status, paymentDate: payment.paymentDate.toISOString(), updatedAt: payment.updatedAt.toISOString() })) })),
    approvedChanges: job.changeOrders.map(change => ({ id: change.id, title: change.changeOrderTitle, status: change.status, amount: change.addedCost.toString(), approvedDate: change.approvedDate?.toISOString() ?? null, updatedAt: change.updatedAt.toISOString() })),
  };
  const receiptTotal = job.invoices.flatMap(invoice => invoice.payments).filter(payment => payment.status === "COMPLETED").reduce((sum, payment) => sum.plus(payment.amount), new Prisma.Decimal(0));
  return { job, before, receiptTotal, digest: createHash("sha256").update(JSON.stringify(before)).digest("hex") };
}
const baselineSchema = z.object({ requestId: z.string().uuid(), sourceFileId: z.string().min(1), reviewedDigest: z.string().regex(/^[a-f0-9]{64}$/),
  requiredDeposit: z.string().regex(/^(0|[1-9]\d{0,8})(\.\d{1,2})?$/), reviewReason: z.string().trim().min(20).max(3000),
  contractVerified: z.literal(true), receiptsComplete: z.literal(true) });
export async function adoptJobFinancialBaseline(db: PrismaClient, actorId: string, jobId: string, raw: unknown, root: string) {
  const parsed = baselineSchema.safeParse(raw);
  if (!parsed.success) throw new FinancialRecordError("Complete both review acknowledgments, the evidence document, deposit amount and review explanation.");
  const input = parsed.data;
  const { asset } = await readPrivateAsset(db, { id: actorId, organizationId: DEFAULT_ORG_ID }, input.sourceFileId, root);
  if (asset.entityType !== "JOB" || asset.entityId !== jobId || asset.mimeType !== "application/pdf") throw new FinancialRecordError("Use the private PDF evidence bundle belonging to this job.");
  const inputDigest = createHash("sha256").update(JSON.stringify({ jobId, ...input, sourceSha256: asset.sha256 })).digest("hex");
  return db.$transaction(async tx => {
    const organizationId = await financeActor(tx, actorId, true);
    const retry = await tx.jobFinancialBaseline.findUnique({ where: { organizationId_requestId: { organizationId, requestId: input.requestId } } });
    if (retry) {
      if (retry.inputDigest !== inputDigest || retry.reviewedById !== actorId) throw new FinancialRecordError("This review request was already used. Reload the review.");
      return retry;
    }
    const review = await jobFinanceReviewData(tx, jobId, organizationId);
    if (review.job.financialBaseline) throw new FinancialRecordError("This job already has a retained baseline. Use a reviewed change rather than replacing it.");
    if (review.digest !== input.reviewedDigest) throw new FinancialRecordError("The financial records changed. Reload and review the current values.");
    if (review.job.contractAmount.lte(0) || new Prisma.Decimal(input.requiredDeposit).gt(review.job.contractAmount)) throw new FinancialRecordError("Verify a positive current contract amount and a deposit no greater than the contract.");
    for (const invoice of review.job.invoices) {
      const paid = invoice.payments.filter(payment => payment.status === "COMPLETED").reduce((sum, payment) => sum.plus(payment.amount), new Prisma.Decimal(0));
      if (!invoice.amountPaid.eq(paid) || !invoice.balanceDue.eq(invoice.total.minus(paid))) throw new FinancialRecordError("An invoice still needs receipt reconciliation; do not adopt the job baseline yet.");
    }
    const baseline = await tx.jobFinancialBaseline.create({ data: { organizationId, jobId, requestId: input.requestId, inputDigest,
      sourceFileId: asset.id, sourceSha256: asset.sha256!, contractAmount: review.job.contractAmount, reviewedPaidAmount: review.receiptTotal,
      requiredDeposit: input.requiredDeposit, legacyApprovedChanges: json(review.before.approvedChanges), before: json(review.before), reviewReason: input.reviewReason, reviewedById: actorId } });
    await tx.job.update({ where: { id: jobId }, data: { amountPaid: review.receiptTotal, balanceDue: review.job.contractAmount.minus(review.receiptTotal) } });
    await tx.auditEvent.create({ data: { organizationId, actorUserId: actorId, action: "JOB_FINANCIAL_BASELINE_REVIEWED", entityType: "Job", entityId: jobId,
      metadata: { baselineId: baseline.id, inputDigest, sourceSha256: asset.sha256, beforePaid: review.job.amountPaid.toString(), reviewedPaid: review.receiptTotal.toString() } } });
    return baseline;
  });
}

export async function reviewedJobTotals(tx: Prisma.TransactionClient, jobId: string) {
  const baseline = await tx.jobFinancialBaseline.findUnique({ where: { jobId } });
  if (!baseline) return null;
  const job = await tx.job.findUniqueOrThrow({ where: { id: jobId } });
  const changes = (await tx.appliedChangeOrder.aggregate({ where: { jobId }, _sum: { amount: true } }))._sum.amount ?? new Prisma.Decimal(0);
  const paid = (await tx.payment.aggregate({ where: { status: "COMPLETED", invoice: { jobId } }, _sum: { amount: true } }))._sum.amount ?? new Prisma.Decimal(0);
  return { baseline, job, contract: baseline.contractAmount.plus(changes), paid };
}
export async function verifyReviewedJob(tx: Prisma.TransactionClient, jobId: string) {
  const totals = await reviewedJobTotals(tx, jobId);
  if (totals && (!totals.job.contractAmount.eq(totals.contract) || !totals.job.amountPaid.eq(totals.paid) || !totals.job.balanceDue.eq(totals.contract.minus(totals.paid)))) throw new FinancialRecordError("The reviewed job ledger has an unexplained difference. Resolve it before changing finances.");
  return totals;
}
export async function syncReviewedJobReceipts(tx: Prisma.TransactionClient, jobId: string) {
  const totals = await reviewedJobTotals(tx, jobId);
  if (totals) await tx.job.update({ where: { id: jobId }, data: { amountPaid: totals.paid, balanceDue: totals.contract.minus(totals.paid) } });
}
export async function confirmJobDeposit(db: PrismaClient, actorId: string, jobId: string) {
  return db.$transaction(async tx => {
    const organizationId = await financeActor(tx, actorId);
    const totals = await verifyReviewedJob(tx, jobId);
    if (!totals || totals.job.organizationId !== organizationId || totals.baseline.requiredDeposit.lte(0) || totals.paid.lt(totals.baseline.requiredDeposit)) throw new FinancialRecordError("Verify the documented deposit requirement and sufficient completed receipts before marking it received.");
    if (totals.job.jobStatus === "DEPOSIT_RECEIVED") return;
    if (totals.job.jobStatus !== "PRE_CONSTRUCTION") throw new FinancialRecordError("This job is beyond the deposit stage; do not move it backward.");
    await tx.job.update({ where: { id: jobId }, data: { jobStatus: "DEPOSIT_RECEIVED" } });
    await tx.auditEvent.create({ data: { organizationId, actorUserId: actorId, action: "DEPOSIT_RECEIPTS_VERIFIED", entityType: "Job", entityId: jobId,
      metadata: { requiredDeposit: totals.baseline.requiredDeposit.toString(), completedReceipts: totals.paid.toString() } } });
  });
}

export async function saveJobDetails(db: PrismaClient, actorId: string, jobId: string, input: z.infer<typeof jobSchema>) {
  if (![input.contractAmount, input.amountPaid].every(value => /^(0|[1-9]\d{0,9})(\.\d{1,2})?$/.test(String(value)))) throw new FinancialRecordError("Use valid dollar amounts with at most two decimal places.");
  return db.$transaction(async tx => {
    const organizationId = await financeActor(tx, actorId);
    const job = await tx.job.findFirst({ where: { id: jobId, organizationId } });
    if (!job) throw new FinancialRecordError("Job access denied.");
    const reviewed = await verifyReviewedJob(tx, jobId);
    if (reviewed && (!reviewed.contract.eq(input.contractAmount) || !reviewed.paid.eq(input.amountPaid))) throw new FinancialRecordError("Reviewed financial totals come from approved changes and completed receipts. Reload this page; do not overwrite them here.");
    if (reviewed && ["clientProfileId", "propertyId", "approvedQuoteId"].some(key => (input[key as keyof typeof input] || null) !== job[key as "clientProfileId" | "propertyId" | "approvedQuoteId"])) throw new FinancialRecordError("A reviewed contract cannot be reassigned to another client, property or quote.");
    if (!reviewed && (!job.contractAmount.eq(input.contractAmount) || !job.amountPaid.eq(input.amountPaid))) await financeActor(tx, actorId, true);
    if (input.jobStatus === "DEPOSIT_RECEIVED" && job.jobStatus !== "DEPOSIT_RECEIVED") throw new FinancialRecordError("Use the deposit verification action so the documented requirement and receipts are checked.");
    for (const [id, entity] of [[input.clientProfileId, "profile"], [input.propertyId, "property"], [input.approvedQuoteId, "quote"]] as const) {
      if (!id) continue;
      const record = entity === "profile" ? await tx.profile.findUnique({ where: { id } }) : entity === "property" ? await tx.property.findUnique({ where: { id } }) : await tx.quote.findUnique({ where: { id } });
      if (!record || record.organizationId !== organizationId) throw new FinancialRecordError("A linked job record belongs to another organization.");
    }
    const contractAmount = reviewed?.contract ?? new Prisma.Decimal(input.contractAmount), amountPaid = reviewed?.paid ?? new Prisma.Decimal(input.amountPaid);
    if (input.jobStatus === "COMPLETE") {
      const { packageStatusSelect, orderedReviewState } = await import("./work-package");
      const packages = await tx.workPackage.findMany({ where: { scopeItem: { jobId } }, select: packageStatusSelect });
      if (packages.some(work => orderedReviewState(work.steps).some(step => !step.done))) throw new FinancialRecordError("Resolve all package evidence and hold points before closing the job.");
    }
    const updated = await tx.job.update({ where: { id: jobId }, data: { ...input, contractAmount, amountPaid, balanceDue: contractAmount.minus(amountPaid), jobStatus: input.jobStatus as Prisma.JobUpdateInput["jobStatus"], riskLevel: input.riskLevel as Prisma.JobUpdateInput["riskLevel"] } });
    await tx.auditEvent.create({ data: { organizationId, actorUserId: actorId, action: "JOB_DETAILS_UPDATED", entityType: "Job", entityId: jobId,
      metadata: { before: { contract: job.contractAmount.toString(), paid: job.amountPaid.toString(), status: job.jobStatus }, after: { contract: contractAmount.toString(), paid: amountPaid.toString(), status: updated.jobStatus }, reviewedLedger: Boolean(reviewed) } } });
    return updated;
  });
}
