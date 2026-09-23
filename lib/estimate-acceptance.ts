import { Prisma, PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { financeActor, FinancialRecordError } from "./finance-lock";
import { ChangeApprovalError } from "./change-order-ledger";
import { hasStaffAccess } from "./staff-policy";
import { readPrivateAsset } from "./private-media";
import { DEFAULT_ORG_ID, renovationPhaseDetails } from "./constants";
import { billingScheduleInputSchema, calculateBillingMilestones, type BillingMilestone } from "./billing-schedule";
export { defaultBillingMilestones } from "./billing-schedule";

const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const text = z.string().trim().min(20).max(12000);
const amount = z.string().regex(/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/);
function billingScheduleFormValue(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return value; }
}
export const proposalFields = z.object({ scope: text, exclusions: text, allowances: text, schedule: text, paymentSchedule: text, warranty: text, requiredDeposit: amount, billingMilestones: billingScheduleInputSchema.optional() });
const inputSchema = proposalFields.extend({ billingMilestones: z.preprocess(billingScheduleFormValue, billingScheduleInputSchema.optional()), requestId: z.string().uuid(), reviewedDigest: z.string().regex(/^[a-f0-9]{64}$/), priceSnapshotId: z.string().min(1), sourceFileId: z.string().min(1), ownerReviewed: z.literal(true) });
export const estimateProposalContentSchema = proposalFields.extend({ estimateNumber: z.string(), title: z.string(), clientName: z.string(), address: z.string(), total: amount, quoteId: z.string(), clientProfileId: z.string(), propertyId: z.string() });
export type EstimateProposalContent = z.infer<typeof estimateProposalContentSchema>;
export const parseEstimateProposalContent = (value: unknown) => estimateProposalContentSchema.parse(value);
export const estimateProposalContentDigest = (value: EstimateProposalContent) => hash(value);
const estimateInclude = { quote: { include: { lineItems: { orderBy: { id: "asc" } } } }, clientProfile: true, property: true, acceptance: { include: { snapshot: true, conversion: true } } } satisfies Prisma.EstimateInclude;
type EstimateRecord = Prisma.EstimateGetPayload<{ include: typeof estimateInclude }>;
/** Actor-scoped lookup. Converting this to the acting company is tracked as company-isolation work. */
export async function ownedEstimate(db: PrismaClient | Prisma.TransactionClient, id: string) {
  return ownedEstimateInCompany(db, id, DEFAULT_ORG_ID);
}
/**
 * Company-explicit lookup, used by the public approval token surface: the snapshot records the company
 * that owns the estimate, so a token never resolves against the default organization.
 */
export async function ownedEstimateInCompany(db: PrismaClient | Prisma.TransactionClient, id: string, organizationId: string) {
  if (!organizationId) throw new FinancialRecordError("Estimate access denied.");
  const estimate = await db.estimate.findFirst({ where: { id, quote: { organizationId } }, include: estimateInclude });
  if (!estimate) throw new FinancialRecordError("Estimate access denied.");
  return estimate;
}
export const estimateReviewDigest = (e: EstimateRecord) => hash({ id: e.id, number: e.estimateNumber, client: e.clientProfileId, property: e.propertyId, total: e.total.toFixed(2), terms: e.terms, summary: e.clientFacingSummary, quote: { id: e.quote.id, name: e.quote.quoteName, client: e.quote.clientProfileId, property: e.quote.propertyId, lines: e.quote.lineItems }, clientName: e.clientProfile?.profileName, address: e.property?.propertyAddress });

export async function issueEstimateApproval(db: PrismaClient, actorId: string, estimateId: string, raw: unknown, root: string) {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) throw new FinancialRecordError("Complete the reviewed proposal and document acknowledgment: " + parsed.error.issues[0].path.join("."));
  const input = parsed.data, { asset } = await readPrivateAsset(db, { id: actorId, organizationId: DEFAULT_ORG_ID }, input.sourceFileId, root);
  const inputDigest = hash({ actorId, estimateId, input, sourceSha256: asset.sha256 });
  return db.$transaction(async tx => {
    const organizationId = await financeActor(tx, actorId, true), estimate = await ownedEstimate(tx, estimateId);
    const retry = await tx.estimateSnapshot.findUnique({ where: { requestId: input.requestId }, include: { approval: true } });
    if (retry) { if (retry.inputDigest !== inputDigest || retry.organizationId !== organizationId) throw new FinancialRecordError("This proposal request was already used. Reload the form."); return retry.approval; }
    if (estimate.acceptance || estimate.status === "ACCEPTED") throw new FinancialRecordError("Accepted scope requires a documented change; it cannot be replaced here.");
    if (await tx.job.count({ where: { approvedQuoteId: estimate.quoteId } })) throw new FinancialRecordError("This quote already has a job. Use its reviewed change workflow.");
    if (estimateReviewDigest(estimate) !== input.reviewedDigest) throw new FinancialRecordError("The estimate changed. Reload and review the current record.");
    if (!estimate.clientProfile || !estimate.property || estimate.clientProfile.organizationId !== organizationId || estimate.property.organizationId !== organizationId || estimate.clientProfileId !== estimate.quote.clientProfileId || estimate.propertyId !== estimate.quote.propertyId) throw new FinancialRecordError("Assign the same owned client and property to this estimate and quote before issuing it.");
    if (asset.entityType !== "QUOTE" || asset.entityId !== estimate.quoteId || asset.mimeType !== "application/pdf") throw new FinancialRecordError("Select the reviewed contract PDF belonging to this quote.");
    const price = await tx.priceSnapshot.findFirst({ where: { id: input.priceSnapshotId, organizationId } });
    if (!price || !price.sellingPrice.eq(estimate.total) || price.sellingPrice.lte(0) || price.sellingPrice.gt("9999999999.99")) throw new FinancialRecordError("The estimate total must exactly match a positive retained gross-margin price. Review and update the draft estimate first; no legacy price is changed automatically.");
    if (new Prisma.Decimal(input.requiredDeposit).gt(price.sellingPrice)) throw new FinancialRecordError("The documented deposit cannot exceed the contract price.");
    if (input.billingMilestones) {
      let milestoneAmounts: ReturnType<typeof calculateBillingMilestones>;
      try { milestoneAmounts = calculateBillingMilestones(price.sellingPrice.toFixed(2), input.billingMilestones); }
      catch (error) { throw new FinancialRecordError(error instanceof Error ? error.message : "The billing milestone amounts are invalid."); }
      if (!new Prisma.Decimal(milestoneAmounts[0].amount).eq(input.requiredDeposit)) throw new FinancialRecordError("The required deposit must equal the first billing milestone amount.");
    }
    const content = estimateProposalContentSchema.parse({ ...proposalFields.parse(input), estimateNumber: estimate.estimateNumber, title: estimate.quote.quoteName, clientName: estimate.clientProfile.profileName, address: estimate.property.propertyAddress, total: price.sellingPrice.toFixed(2), quoteId: estimate.quoteId, clientProfileId: estimate.clientProfile.id, propertyId: estimate.property.id });
    await tx.clientApproval.updateMany({ where: { estimateId, status: { in: ["DRAFT", "SENT", "VIEWED", "CHANGES_REQUESTED"] } }, data: { status: "EXPIRED" } });
    const approval = await tx.clientApproval.create({ data: { estimateId, approvalType: "ESTIMATE", token: randomBytes(32).toString("hex"), status: "SENT", sentAt: new Date(), signerEmail: estimate.clientProfile.email } });
    const snapshot = await tx.estimateSnapshot.create({ data: { organizationId, estimateId, requestId: input.requestId, inputDigest, priceSnapshotId: price.id, sourceFileId: asset.id, sourceSha256: asset.sha256!, approvalId: approval.id, sourceDigest: input.reviewedDigest, contentDigest: hash(content), content, expiresAt: new Date(Date.now() + 14 * 86400000), issuedById: actorId } });
    await tx.estimate.update({ where: { id: estimateId }, data: { status: "SENT", sentAt: new Date() } });
    await tx.auditEvent.create({ data: { organizationId, actorUserId: actorId, action: "ESTIMATE_APPROVAL_ISSUED", entityType: "Estimate", entityId: estimateId, metadata: { snapshotId: snapshot.id, contentDigest: snapshot.contentDigest, sourceSha256: asset.sha256, emailSent: false, priceChanged: false } } });
    return approval;
  });
}

export async function readEstimateApproval(db: PrismaClient | Prisma.TransactionClient, token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new ChangeApprovalError("Approval not found.", 404);
  const approval = await db.clientApproval.findUnique({ where: { token }, include: { estimateSnapshot: { include: { sourceFile: true } } } });
  const snapshot = approval?.estimateSnapshot;
  if (!approval || !snapshot || approval.approvalType !== "ESTIMATE" || approval.estimateId !== snapshot.estimateId) throw new ChangeApprovalError("This estimate needs a current, reviewed approval link. Contact your contractor.", 409);
  if (approval.status === "EXPIRED" || snapshot.expiresAt.getTime() <= Date.now()) throw new ChangeApprovalError("This proposal link has expired. Contact your contractor.", 410);
  // The token is the secret; the snapshot records the owning company, and that company must still own the estimate.
  const estimate = await ownedEstimateInCompany(db, snapshot.estimateId, snapshot.organizationId), content = estimateProposalContentSchema.parse(snapshot.content);
  if (hash(content) !== snapshot.contentDigest || snapshot.sourceFile.sha256 !== snapshot.sourceSha256 || snapshot.sourceFile.entityType !== "QUOTE" || snapshot.sourceFile.entityId !== estimate.quoteId) throw new ChangeApprovalError("The retained proposal could not be verified.", 409);
  if (["SENT", "VIEWED"].includes(approval.status) && estimateReviewDigest(estimate) !== snapshot.sourceDigest) throw new ChangeApprovalError("This estimate changed and needs a refreshed approval link.", 409);
  const issuer = await db.user.findUnique({ where: { id: snapshot.issuedById }, include: { memberships: true } }), membership = issuer?.memberships.find(m => m.organizationId === snapshot.organizationId);
  if (!hasStaffAccess(issuer, membership ?? null) || issuer?.role !== "OWNER" || membership?.role !== "OWNER") throw new ChangeApprovalError("This proposal needs review by the current owner.", 409);
  return { approval, snapshot, estimate, content };
}
export async function estimateApprovalDocument(db: PrismaClient, token: string, root: string) {
  const record = await readEstimateApproval(db, token);
  const file = await readPrivateAsset(db, { id: record.snapshot.issuedById, organizationId: record.snapshot.organizationId }, record.snapshot.sourceFileId, root);
  if (file.asset.sha256 !== record.snapshot.sourceSha256) throw new ChangeApprovalError("The retained document could not be verified.", 409);
  return file;
}
const responseSchema = z.object({ decision: z.enum(["approved", "declined"]), signerName: z.string().trim().min(2).max(160), reviewed: z.literal(true), reviewedDigest: z.string().regex(/^[a-f0-9]{64}$/) });
export async function decideEstimateApproval(db: PrismaClient, token: string, raw: unknown, root: string, ipAddressHash: string | null) {
  const parsed = responseSchema.safeParse(raw);
  if (!parsed.success) throw new ChangeApprovalError("Enter your name and confirm review of the displayed proposal and document.", 400);
  const input = parsed.data, preview = await readEstimateApproval(db, token);
  await estimateApprovalDocument(db, token, root);
  return db.$transaction(async tx => {
    const organizationId = await financeActor(tx, preview.snapshot.issuedById, true), current = await readEstimateApproval(tx, token);
    if (input.reviewedDigest !== current.snapshot.contentDigest) throw new ChangeApprovalError("The displayed proposal does not match this response. Reload it.", 409);
    const status = input.decision === "approved" ? "APPROVED" : "DECLINED";
    if (["APPROVED", "DECLINED"].includes(current.approval.status)) {
      if (current.approval.status !== status || current.approval.signerName !== input.signerName) throw new ChangeApprovalError("A different response is already recorded.", 409);
      return { success: true, alreadyRecorded: true };
    }
    if (!["SENT", "VIEWED"].includes(current.approval.status) || current.estimate.acceptance) throw new ChangeApprovalError("This request is no longer open.", 409);
    if (input.decision === "approved") await tx.estimateAcceptance.create({ data: { estimateId: current.estimate.id, snapshotId: current.snapshot.id, signerName: input.signerName, ipAddressHash, contentDigest: current.snapshot.contentDigest } });
    await tx.clientApproval.update({ where: { id: current.approval.id }, data: { status, signerName: input.signerName, ipAddressHash, ...(status === "APPROVED" ? { approvedAt: new Date() } : { declinedAt: new Date() }) } });
    await tx.estimate.update({ where: { id: current.estimate.id }, data: { status: status === "APPROVED" ? "ACCEPTED" : "DECLINED", ...(status === "APPROVED" ? { acceptedAt: new Date() } : { declinedAt: new Date() }) } });
    await tx.auditEvent.create({ data: { organizationId, action: "ESTIMATE_CLIENT_RESPONSE", entityType: "Estimate", entityId: current.estimate.id, metadata: { snapshotId: current.snapshot.id, approvalId: current.approval.id, decision: input.decision, signerName: input.signerName, contentDigest: current.snapshot.contentDigest, jobCreated: false, paymentCollected: false } } });
    return { success: true, alreadyRecorded: false };
  });
}
export async function convertAcceptedEstimate(db: PrismaClient, actorId: string, estimateId: string) {
  return db.$transaction(async tx => {
    const organizationId = await financeActor(tx, actorId, true), estimate = await ownedEstimate(tx, estimateId), acceptance = estimate.acceptance;
    if (!acceptance) throw new FinancialRecordError("A retained client acceptance is required before creating the job.");
    if (acceptance.conversion) return tx.job.findUniqueOrThrow({ where: { id: acceptance.conversion.jobId } });
    if (await tx.job.count({ where: { approvedQuoteId: estimate.quoteId } })) throw new FinancialRecordError("This quote already has a job. Review it instead of creating a duplicate.");
    const content = estimateProposalContentSchema.parse(acceptance.snapshot.content);
    if (hash(content) !== acceptance.contentDigest || acceptance.snapshot.contentDigest !== acceptance.contentDigest || !estimate.clientProfile || !estimate.property || estimate.clientProfile.organizationId !== organizationId || estimate.property.organizationId !== organizationId || estimate.clientProfile.id !== content.clientProfileId || estimate.property.id !== content.propertyId) throw new FinancialRecordError("The accepted client, property or proposal no longer matches. Review the retained contract.");
    const job = await tx.job.create({ data: { organizationId, jobName: content.title, clientProfileId: content.clientProfileId, propertyId: content.propertyId, approvedQuoteId: content.quoteId, contractAmount: content.total, amountPaid: "0", balanceDue: content.total, activePhase: renovationPhaseDetails[0][0], phases: { create: renovationPhaseDetails.map(([phaseName, description], index) => ({ phaseNumber: index + 1, phaseName, clientUpdate: description })) } } });
    await tx.estimateConversion.create({ data: { acceptanceId: acceptance.id, jobId: job.id, convertedById: actorId } });
    await tx.quote.update({ where: { id: estimate.quoteId }, data: { quoteStatus: "CONVERTED_TO_JOB", finalQuoteAmount: content.total } });
    await tx.auditEvent.create({ data: { organizationId, actorUserId: actorId, action: "ACCEPTED_ESTIMATE_CONVERTED", entityType: "Job", entityId: job.id, metadata: { estimateId, acceptanceId: acceptance.id, snapshotId: acceptance.snapshotId, total: content.total, requiredDeposit: content.requiredDeposit, receiptsVerified: false, fieldWorkReleased: false, previousQuoteFinal: estimate.quote.finalQuoteAmount?.toString() ?? null } } });
    return job;
  });
}

export async function nativeAcceptedContract(db: PrismaClient | Prisma.TransactionClient, jobId: string) {
  const conversion = await db.estimateConversion.findUnique({ where: { jobId }, include: { acceptance: { include: { snapshot: true } } } });
  if (!conversion) return null;
  const { acceptance } = conversion, content = estimateProposalContentSchema.parse(acceptance.snapshot.content);
  if (hash(content) !== acceptance.contentDigest || acceptance.snapshot.contentDigest !== acceptance.contentDigest) throw new FinancialRecordError("The retained accepted contract could not be verified.");
  return { ...content, sourceFileId: acceptance.snapshot.sourceFileId };
}
