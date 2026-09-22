import { Prisma, type PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { z } from "zod";
import { financeActor, FinancialRecordError } from "./finance-lock";
import { verifyReviewedJob } from "./job-finance";
import {
  estimateProposalContentDigest,
  parseEstimateProposalContent,
} from "./estimate-acceptance";
import { billingScheduleInputSchema, calculateBillingMilestones, defaultBillingMilestones, type BillingMilestone } from "./billing-schedule";

export { billingScheduleInputSchema, calculateBillingMilestones, defaultBillingMilestones };
export type { BillingMilestone };

type BillingDb = PrismaClient | Prisma.TransactionClient;
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Use a valid due date.");
const draftInputSchema = z.object({
  requestId: z.string().uuid(),
  milestoneKey: z.string().trim().min(1).max(64),
  invoiceNumber: z.string().trim().min(2).max(120),
  dueDate: z.union([dateOnly, z.literal("")]),
  reviewedDigest: z.string().regex(/^[a-f0-9]{64}$/),
  reviewReason: z.string().trim().min(20).max(3000),
  triggerVerified: z.literal(true),
});

async function currentBillingReview(tx: Prisma.TransactionClient, organizationId: string, jobId: string) {
  const conversion = await tx.estimateConversion.findUnique({
    where: { jobId },
    include: { acceptance: { include: { snapshot: true } }, job: true },
  });
  if (!conversion || conversion.job.organizationId !== organizationId) throw new FinancialRecordError("A retained accepted proposal converted to this job is required before milestone billing.");
  const { acceptance } = conversion, { snapshot } = acceptance;
  if (snapshot.organizationId !== organizationId || acceptance.snapshotId !== snapshot.id) throw new FinancialRecordError("The retained accepted proposal does not belong to this company.");
  const content = parseEstimateProposalContent(snapshot.content);
  if (estimateProposalContentDigest(content) !== snapshot.contentDigest || acceptance.contentDigest !== snapshot.contentDigest) throw new FinancialRecordError("The retained accepted proposal could not be verified.");
  if (!content.billingMilestones) throw new FinancialRecordError("This accepted proposal has no retained structured billing schedule. Review a real agreement; do not invent milestone terms.");
  const schedule = billingScheduleInputSchema.parse(content.billingMilestones);
  const totals = await verifyReviewedJob(tx, jobId);
  if (!totals) throw new FinancialRecordError("Complete the reviewed job financial baseline before drafting milestone invoices.");
  if (!totals.baseline.contractAmount.eq(content.total) || !totals.baseline.requiredDeposit.eq(content.requiredDeposit)) throw new FinancialRecordError("The reviewed job baseline does not match the accepted proposal price and deposit.");
  if (conversion.job.clientProfileId !== content.clientProfileId) throw new FinancialRecordError("The job client does not match the accepted proposal.");
  const unallocatedInvoiceCount = await tx.invoice.count({
    where: { jobId, status: { not: "VOID" }, milestoneDraft: { is: null } },
  });
  if (unallocatedInvoiceCount > 0) throw new FinancialRecordError("This job has existing invoices that are not tied to the retained milestone schedule. Review their allocation before drafting another invoice.");
  let calculated: ReturnType<typeof calculateBillingMilestones>;
  try { calculated = calculateBillingMilestones(content.total, schedule); }
  catch { throw new FinancialRecordError("The retained billing schedule contains a nonpositive invoice amount."); }
  if (!new Prisma.Decimal(calculated[0].amount).eq(content.requiredDeposit)) throw new FinancialRecordError("The retained deposit does not match the first billing milestone.");
  const links = await tx.milestoneInvoiceDraft.findMany({
    where: { estimateSnapshotId: snapshot.id },
    include: { invoice: true },
    orderBy: { createdAt: "asc" },
  });
  const byKey = new Map(links.map(link => [link.milestoneKey, link]));
  const milestones = calculated.map((milestone) => {
    const link = byKey.get(milestone.key);
    return {
      ...milestone,
      amount: milestone.amount,
      invoiceDraft: link ? {
        id: link.invoice.id,
        invoiceNumber: link.invoice.invoiceNumber,
        status: link.invoice.status,
        dueDate: link.invoice.dueDate?.toISOString().slice(0, 10) ?? null,
        total: link.invoice.total.toFixed(2),
      } : null,
    };
  });
  const digest = hash({
    job: { id: conversion.job.id, clientProfileId: conversion.job.clientProfileId },
    snapshot: { id: snapshot.id, contentDigest: snapshot.contentDigest },
    baseline: { id: totals.baseline.id, inputDigest: totals.baseline.inputDigest, contractAmount: totals.baseline.contractAmount.toFixed(2), requiredDeposit: totals.baseline.requiredDeposit.toFixed(2) },
    milestones,
  });
  return {
    organizationId,
    job: { id: conversion.job.id, jobName: conversion.job.jobName, clientProfileId: conversion.job.clientProfileId },
    snapshot: { id: snapshot.id, contentDigest: snapshot.contentDigest },
    schedule,
    milestones,
    digest,
  };
}

export async function milestoneBillingReviewData(db: PrismaClient, actorId: string, jobId: string) {
  return db.$transaction(async tx => {
    const organizationId = await financeActor(tx, actorId, true);
    return currentBillingReview(tx, organizationId, jobId);
  });
}

export async function createMilestoneInvoiceDraft(db: PrismaClient, actorId: string, jobId: string, raw: unknown) {
  const parsed = draftInputSchema.safeParse(raw);
  if (!parsed.success) throw new FinancialRecordError(parsed.error.issues[0].message);
  const input = parsed.data;
  const inputDigest = hash({ actorId, jobId, input });
  return db.$transaction(async tx => {
    const organizationId = await financeActor(tx, actorId, true);
    const retry = await tx.milestoneInvoiceDraft.findUnique({
      where: { organizationId_requestId: { organizationId, requestId: input.requestId } },
      include: { invoice: true },
    });
    if (retry) {
      if (retry.inputDigest !== inputDigest || retry.reviewedById !== actorId) throw new FinancialRecordError("This milestone invoice request was already used. Reload the billing review.");
      return retry.invoice;
    }
    const review = await currentBillingReview(tx, organizationId, jobId);
    const selected = review.milestones.find(milestone => milestone.key === input.milestoneKey);
    if (!selected) throw new FinancialRecordError("Select a retained billing milestone.");
    if (selected.invoiceDraft) throw new FinancialRecordError("This milestone already has a retained invoice draft.");
    if (review.digest !== input.reviewedDigest) throw new FinancialRecordError("The billing records changed. Reload and review the current milestone.");
    if (await tx.invoice.count({ where: { invoiceNumber: input.invoiceNumber } })) throw new FinancialRecordError("That invoice number is already in use.");
    const amount = new Prisma.Decimal(selected.amount);
    const dueDate = input.dueDate ? new Date(`${input.dueDate}T00:00:00.000Z`) : null;
    const invoice = await tx.invoice.create({ data: {
      jobId: review.job.id,
      clientProfileId: review.job.clientProfileId,
      invoiceNumber: input.invoiceNumber,
      dueDate,
      subtotal: amount,
      tax: "0",
      total: amount,
      amountPaid: "0",
      balanceDue: amount,
      status: "DRAFT",
      notes: selected.clientDescription || selected.label,
    } });
    const link = await tx.milestoneInvoiceDraft.create({ data: {
      organizationId,
      jobId: review.job.id,
      estimateSnapshotId: review.snapshot.id,
      milestoneKey: selected.key,
      invoiceId: invoice.id,
      requestId: input.requestId,
      inputDigest,
      sourceDigest: review.snapshot.contentDigest,
      percent: selected.percent,
      amount,
      triggerEvent: selected.triggerEvent,
      reviewReason: input.reviewReason,
      reviewedById: actorId,
    } });
    await tx.auditEvent.create({ data: {
      organizationId,
      actorUserId: actorId,
      action: "MILESTONE_INVOICE_DRAFT_CREATED",
      entityType: "Invoice",
      entityId: invoice.id,
      metadata: { milestoneInvoiceDraftId: link.id, estimateSnapshotId: review.snapshot.id, milestoneKey: selected.key, percent: selected.percent, amount: amount.toFixed(2), sourceDigest: review.snapshot.contentDigest, sent: false, paymentCollected: false, triggerAutomaticallyVerified: false },
    } });
    return invoice;
  });
}

export async function assertInvoiceNotMilestoneLinked(db: BillingDb, invoiceId: string) {
  if (await db.milestoneInvoiceDraft.findUnique({ where: { invoiceId }, select: { id: true } })) {
    throw new FinancialRecordError("A retained milestone invoice draft cannot be deleted.");
  }
}
