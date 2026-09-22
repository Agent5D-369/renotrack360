import { Prisma, PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { financeActor, FinancialRecordError, lockOrganizationFinance } from "./finance-lock";
import { verifyReviewedJob } from "./job-finance";
import { DEFAULT_ORG_ID } from "./constants";

const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const text = z.string().trim().max(5000).default("");
const cost = z.string().regex(/^-?(0|[1-9]\d{0,8})(\.\d{1,2})?$/, "Use a dollar amount with at most two decimal places.");
const draftSchema = z.object({ jobId: z.string().min(1), clientProfileId: text, priceSnapshotId: text, changeOrderTitle: z.string().trim().min(3).max(180), reason: z.string().trim().min(10).max(5000),
  clientRequested: z.boolean(), fieldCondition: text, addedCost: cost, addedTime: z.coerce.number().int().min(0).max(3650), status: z.enum(["DRAFT", "VOID"]), signatureApprovalNotes: text });
export const changeContentSchema = z.object({ changeOrderTitle: z.string(), reason: z.string(), addedCost: cost, addedTime: z.number().int().min(0), jobName: z.string(),
  scheduleNote: z.string(), formatVersion: z.literal("flipside-change-v1") });
export function changeOrderContent(order: { changeOrderTitle: string; reason: string | null; addedCost: Prisma.Decimal; addedTime: number; job: { jobName: string } }) {
  return changeContentSchema.parse({ changeOrderTitle: order.changeOrderTitle, reason: order.reason ?? "", addedCost: order.addedCost.toFixed(2), addedTime: order.addedTime, jobName: order.job.jobName,
    scheduleNote: "The approved time impact is retained with this change. Flipside will confirm the resulting work schedule before execution.", formatVersion: "flipside-change-v1" });
}
export const changeOrderDigest = (order: Parameters<typeof changeOrderContent>[0]) => hash(changeOrderContent(order));
async function ownedOrder(tx: Prisma.TransactionClient, id: string, organizationId: string) {
  const order = await tx.changeOrder.findFirst({ where: { id, job: { organizationId } }, include: { job: true, clientProfile: true, appliedChange: true } });
  if (!order || (order.clientProfile && order.clientProfile.organizationId !== organizationId)) throw new FinancialRecordError("Change order access denied.");
  return order;
}
export async function saveChangeDraft(db: PrismaClient, actorId: string, requestId: string, id: string | null, expectedUpdatedAt: string, raw: unknown) {
  const parsed = draftSchema.safeParse(raw);
  if (!parsed.success) throw new FinancialRecordError(parsed.error.issues[0].message);
  if (!id && !z.string().uuid().safeParse(requestId).success) throw new FinancialRecordError("Reload the change-order form before saving.");
  const input = parsed.data, digest = hash({ actorId, input });
  return db.$transaction(async tx => {
    const organizationId = await financeActor(tx, actorId);
    if (!id) {
      const retry = await tx.changeOrder.findUnique({ where: { creationRequestId: requestId } });
      if (retry) { await ownedOrder(tx, retry.id, organizationId); if (retry.creationDigest !== digest) throw new FinancialRecordError("This draft request was already used. Reload the form."); return retry; }
    }
    const old = id ? await ownedOrder(tx, id, organizationId) : null;
    if (old && (["APPROVED", "COMPLETED"].includes(old.status) || old.appliedChange)) throw new FinancialRecordError("An approved change cannot be rewritten. Create a new adjustment for review.");
    if (old && old.updatedAt.toISOString() !== expectedUpdatedAt) throw new FinancialRecordError("This change order changed. Reload before editing.");
    if (old && old.jobId !== input.jobId && await tx.changeOrderSnapshot.count({ where: { changeOrderId: old.id } })) throw new FinancialRecordError("A previously issued change cannot be moved to another job.");
    const job = await tx.job.findFirst({ where: { id: input.jobId, organizationId } });
    if (!job) throw new FinancialRecordError("Job access denied.");
    const clientProfileId = input.clientProfileId || job.clientProfileId;
    if (clientProfileId) {
      const client = await tx.profile.findFirst({ where: { id: clientProfileId, organizationId } });
      if (!client || (job.clientProfileId && clientProfileId !== job.clientProfileId)) throw new FinancialRecordError("The change-order client must match the job.");
    }
    if (input.priceSnapshotId && !await tx.priceSnapshot.findFirst({ where: { id: input.priceSnapshotId, organizationId } })) throw new FinancialRecordError("Pricing scenario access denied.");
    const data = { ...input, clientProfileId, priceSnapshotId: input.priceSnapshotId || null, reason: input.reason, fieldCondition: input.fieldCondition || null, signatureApprovalNotes: input.signatureApprovalNotes || null };
    const order = old ? await tx.changeOrder.update({ where: { id: old.id }, data }) : await tx.changeOrder.create({ data: { ...data, creationRequestId: requestId, creationDigest: digest } });
    if (old) await tx.clientApproval.updateMany({ where: { changeOrderId: old.id, status: { in: ["DRAFT", "SENT", "VIEWED", "CHANGES_REQUESTED"] } }, data: { status: "EXPIRED" } });
    await tx.auditEvent.create({ data: { organizationId, actorUserId: actorId, action: "CHANGE_DRAFT_SAVED", entityType: "ChangeOrder", entityId: order.id, metadata: { inputDigest: digest, pendingLinksRevoked: Boolean(old), status: order.status } } });
    return order;
  });
}
export async function deleteUnissuedChangeDraft(db: PrismaClient, actorId: string, id: string) {
  return db.$transaction(async tx => {
    const organizationId = await financeActor(tx, actorId), order = await ownedOrder(tx, id, organizationId);
    if (order.status !== "DRAFT" || order.appliedChange || await tx.changeOrderSnapshot.count({ where: { changeOrderId: id } }) || await tx.clientApproval.count({ where: { changeOrderId: id } })) throw new FinancialRecordError("Only an unissued draft can be deleted. Retain issued or approved history.");
    await tx.auditEvent.create({ data: { organizationId, actorUserId: actorId, action: "UNISSUED_CHANGE_DRAFT_DELETED", entityType: "ChangeOrder", entityId: id, metadata: { title: order.changeOrderTitle, amount: order.addedCost.toString() } } });
    await tx.changeOrder.delete({ where: { id } });
  });
}
export async function changeDraftFromRequest(db: PrismaClient, actorId: string, activityId: string, jobId: string) {
  return db.$transaction(async tx => {
    const organizationId = await financeActor(tx, actorId);
    const job = await tx.job.findFirst({ where: { id: jobId, organizationId } });
    const activity = await tx.activity.findUnique({ where: { id: activityId } });
    if (!job || !activity || activity.relatedJobId !== jobId || !activity.isOutOfScope) throw new FinancialRecordError("The scope request does not belong to this job.");
    const existing = await tx.changeOrder.findUnique({ where: { sourceActivityId: activityId } });
    if (existing) return existing;
    if (activity.completedAt) throw new FinancialRecordError("This earlier request was already resolved. Review its existing change order before creating another.");
    const order = await tx.changeOrder.create({ data: { jobId, clientProfileId: job.clientProfileId, sourceActivityId: activityId,
      changeOrderTitle: activity.subject, reason: activity.body || "Scope request recorded for staff review before pricing and client approval.", status: "DRAFT", clientRequested: true } });
    await tx.activity.update({ where: { id: activityId }, data: { completedAt: new Date() } });
    await tx.auditEvent.create({ data: { organizationId, actorUserId: actorId, action: "SCOPE_REQUEST_DRAFTED", entityType: "ChangeOrder", entityId: order.id, metadata: { sourceActivityId: activityId, executionAuthorized: false } } });
    return order;
  });
}
export async function issueChangeApproval(db: PrismaClient, actorId: string, id: string, reviewedDigest: string) {
  return db.$transaction(async tx => {
    const organizationId = await financeActor(tx, actorId), order = await ownedOrder(tx, id, organizationId);
    if (!["DRAFT", "SENT"].includes(order.status) || order.appliedChange) throw new FinancialRecordError("Only an unapproved change can receive a new approval request.");
    const totals = await verifyReviewedJob(tx, order.jobId);
    if (!totals) throw new FinancialRecordError("Complete the owner's documented job financial review before issuing a contractual change.");
    const content = changeOrderContent(order), contentDigest = hash(content);
    if (reviewedDigest !== contentDigest) throw new FinancialRecordError("The scope or price changed. Reload and review before issuing the link.");
    if (content.reason.length < 10) throw new FinancialRecordError("Document the client-facing scope and reason before issuing an approval.");
    if (order.addedCost.gt(0)) {
      const price = order.priceSnapshotId ? await tx.priceSnapshot.findFirst({ where: { id: order.priceSnapshotId, organizationId } }) : null;
      if (!price || !price.sellingPrice.eq(order.addedCost)) throw new FinancialRecordError("A positive price change must match its retained gross-margin pricing scenario. Use approximately 42% target margin for change orders.");
    } else await financeActor(tx, actorId, true);
    if (totals.contract.plus(content.addedCost).lt(0)) throw new FinancialRecordError("A credit cannot reduce the contract below zero.");
    const existing = await tx.clientApproval.findFirst({ where: { changeOrderId: id, status: { in: ["SENT", "VIEWED"] }, snapshot: { contentDigest, expiresAt: { gt: new Date() } } }, include: { snapshot: true } });
    if (existing) return existing;
    await tx.clientApproval.updateMany({ where: { changeOrderId: id, status: { in: ["DRAFT", "SENT", "VIEWED", "CHANGES_REQUESTED"] } }, data: { status: "EXPIRED" } });
    const approval = await tx.clientApproval.create({ data: { changeOrderId: id, approvalType: "CHANGE_ORDER", token: randomBytes(32).toString("hex"), status: "SENT", sentAt: new Date(), signerEmail: order.clientProfile?.email ?? null } });
    const snapshot = await tx.changeOrderSnapshot.create({ data: { organizationId, jobId: order.jobId, changeOrderId: id, approvalId: approval.id, contentDigest, content, expiresAt: new Date(Date.now() + 14 * 86400000), createdById: actorId } });
    await tx.changeOrder.update({ where: { id }, data: { status: "SENT" } });
    await tx.auditEvent.create({ data: { organizationId, actorUserId: actorId, action: "CHANGE_APPROVAL_ISSUED", entityType: "ChangeOrder", entityId: id, metadata: { snapshotId: snapshot.id, contentDigest, expiresAt: snapshot.expiresAt.toISOString(), emailSent: false } } });
    return approval;
  });
}

export class ChangeApprovalError extends Error { constructor(message: string, public status: number) { super(message); } }
export async function readChangeApproval(db: PrismaClient | Prisma.TransactionClient, token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new ChangeApprovalError("Approval not found.", 404);
  const approval = await db.clientApproval.findUnique({ where: { token }, include: { snapshot: { include: { job: { include: { organization: true } }, changeOrder: true } } } });
  if (!approval) throw new ChangeApprovalError("Approval not found.", 404);
  const snapshot = approval.snapshot;
  if (!snapshot) throw new ChangeApprovalError("This earlier link needs a refreshed, reviewed approval request. Contact Flipside.", 409);
  if (snapshot.organizationId !== DEFAULT_ORG_ID || snapshot.job.organizationId !== snapshot.organizationId || snapshot.changeOrder.jobId !== snapshot.jobId || approval.changeOrderId !== snapshot.changeOrderId || approval.approvalType !== "CHANGE_ORDER") throw new ChangeApprovalError("Approval not found.", 404);
  if (approval.status === "EXPIRED" || snapshot.expiresAt.getTime() <= Date.now()) throw new ChangeApprovalError("This approval link has expired or was replaced. Request a current link.", 410);
  const content = changeContentSchema.parse(snapshot.content);
  if (hash(content) !== snapshot.contentDigest) throw new ChangeApprovalError("Approval content could not be verified.", 409);
  return { approval, snapshot, content };
}
const decisionSchema = z.object({ decision: z.enum(["approved", "declined"]), signerName: z.string().trim().min(2).max(120), reviewedDigest: z.string().regex(/^[a-f0-9]{64}$/), reviewed: z.literal(true) });
export async function decideChangeApproval(db: PrismaClient, token: string, raw: unknown, ipHash: string | null) {
  const parsed = decisionSchema.safeParse(raw);
  if (!parsed.success) throw new ChangeApprovalError("Provide your name and confirm review of this scope and price.", 400);
  const input = parsed.data;
  return db.$transaction(async tx => {
    await lockOrganizationFinance(tx, DEFAULT_ORG_ID);
    const { approval, snapshot, content } = await readChangeApproval(tx, token);
    if (input.reviewedDigest !== snapshot.contentDigest) throw new ChangeApprovalError("The displayed version does not match this approval. Reload the page.", 409);
    const status = input.decision === "approved" ? "APPROVED" : "DECLINED";
    if (["APPROVED", "DECLINED"].includes(approval.status)) {
      if (approval.status === status && approval.signerName === input.signerName) return { success: true, alreadyRecorded: true };
      throw new ChangeApprovalError("This approval already has a recorded response.", 409);
    }
    if (!["SENT", "VIEWED"].includes(approval.status) || snapshot.changeOrder.status !== "SENT") throw new ChangeApprovalError("This request is no longer open for approval.", 409);
    const order = { ...snapshot.changeOrder, job: snapshot.job };
    if (changeOrderDigest(order) !== snapshot.contentDigest) throw new ChangeApprovalError("The scope changed after this request. Ask for a refreshed approval.", 409);
    const now = new Date();
    if (status === "APPROVED") {
      const totals = await verifyReviewedJob(tx, snapshot.jobId);
      if (!totals) throw new ChangeApprovalError("The project needs financial review before this change can be applied.", 409);
      const contract = totals.contract.plus(content.addedCost);
      if (contract.lt(0) || contract.gt("9999999999.99")) throw new ChangeApprovalError("This change needs a corrected contract calculation.", 409);
      const mappedScope = (await tx.scopeItem.aggregate({ where: { jobId: snapshot.jobId }, _sum: { amount: true } }))._sum.amount;
      if (mappedScope && contract.lt(mappedScope)) throw new ChangeApprovalError("This credit conflicts with retained work scope. Resolve the scope adjustment before applying it.", 409);
      await tx.appliedChangeOrder.create({ data: { organizationId: snapshot.organizationId, jobId: snapshot.jobId, changeOrderId: snapshot.changeOrderId, snapshotId: snapshot.id, amount: content.addedCost, addedDays: content.addedTime, signerName: input.signerName } });
      await tx.job.update({ where: { id: snapshot.jobId }, data: { contractAmount: contract, balanceDue: contract.minus(totals.paid) } });
      await tx.changeOrder.update({ where: { id: snapshot.changeOrderId }, data: { status: "APPROVED", approvedDate: now } });
    } else await tx.changeOrder.update({ where: { id: snapshot.changeOrderId }, data: { status: "DECLINED" } });
    await tx.clientApproval.update({ where: { id: approval.id }, data: { status, signerName: input.signerName, ipAddressHash: ipHash, approvedAt: status === "APPROVED" ? now : null, declinedAt: status === "DECLINED" ? now : null, viewedAt: approval.viewedAt ?? now } });
    await tx.auditEvent.create({ data: { organizationId: snapshot.organizationId, action: "CHANGE_APPROVAL_DECIDED", entityType: "ChangeOrder", entityId: snapshot.changeOrderId,
      metadata: { snapshotId: snapshot.id, contentDigest: snapshot.contentDigest, decision: input.decision, signerName: input.signerName, ipHash, amount: content.addedCost, addedDays: content.addedTime, actorKind: "CLIENT_CAPABILITY" } } });
    return { success: true, alreadyRecorded: false };
  });
}
