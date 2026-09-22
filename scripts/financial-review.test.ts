import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { adoptJobFinancialBaseline, jobFinanceReviewData, confirmJobDeposit, saveJobDetails } from "../lib/job-finance";
import { createPrivateAsset, storagePath } from "../lib/private-media";
import { saveChangeDraft, issueChangeApproval, changeOrderDigest, decideChangeApproval, readChangeApproval, deleteUnissuedChangeDraft, changeDraftFromRequest } from "../lib/change-order-ledger";
import { recordPayment } from "../lib/payment-ledger";
import { savePriceSnapshot } from "../lib/price-snapshot";
import { jobSchema } from "../lib/validators";
const db = new PrismaClient({ log: [] });
const target = new URL(process.env.DATABASE_URL!);
assert.equal(target.hostname, "127.0.0.1"); assert.equal(target.pathname, "/flipside_migration_financial-review");
const root = path.resolve(".preservation", "finance-test-" + randomUUID());
const actor = { id: "finance-owner", organizationId: "flipside-org" };
const receiptInput = (invoiceId: string, amount = "100", status = "COMPLETED") => ({ invoiceId, clientProfileId: "", amount, status, method: "CHECK", paymentDate: "2026-09-21", stripePaymentIntentId: "", notes: "Synthetic test only" });
const draftInput = (jobId: string, changes = {}) => ({ jobId, clientProfileId: "", priceSnapshotId: "", changeOrderTitle: "Synthetic change", reason: "Install the explicitly reviewed additional scope only.", addedCost: "0", addedTime: 2, clientRequested: true, fieldCondition: "Internal only", signatureApprovalNotes: "Internal only", status: "DRAFT", ...changes });
const job = async (id: string) => db.job.create({ data: { id, organizationId: "flipside-org", jobName: id, contractAmount: "1000", amountPaid: "777", balanceDue: "223" } });
const evidence = async (id: string) => createPrivateAsset(db, actor, { entityType: "JOB", entityId: id, file: new File(["%PDF-1.4\nSynthetic fixture only\n%%EOF"], "review.pdf", { type: "application/pdf" }) }, root);
const reviewInput = async (id: string, sourceFileId: string, requiredDeposit = "100") => ({ requestId: randomUUID(), sourceFileId, reviewedDigest: (await jobFinanceReviewData(db, id, "flipside-org")).digest, requiredDeposit, reviewReason: "Synthetic owner review of contract and complete receipts.", contractVerified: true, receiptsComplete: true });
const adopt = async (id: string, requiredDeposit = "100") => { await job(id); const file = await evidence(id); return adoptJobFinancialBaseline(db, actor.id, id, await reviewInput(id, file.id, requiredDeposit), root); };
const order = async (id: string) => db.changeOrder.findUniqueOrThrow({ where: { id }, include: { job: true } });
const issue = async (id: string, user = actor.id) => issueChangeApproval(db, user, id, changeOrderDigest(await order(id)));
const response = async (token: string, decision = "approved") => ({ decision, signerName: "Synthetic Client", reviewed: true, reviewedDigest: (await readChangeApproval(db, token)).snapshot.contentDigest });
let priceId: string;
before(async () => {
  await mkdir(root, { recursive: true });
  await db.organization.createMany({ data: [{ id: "flipside-org", name: "Synthetic Flipside" }, { id: "foreign-org", name: "Foreign" }] });
  for (const [id, role, organizationId] of [[actor.id, "OWNER", "flipside-org"], ["finance-admin", "ADMIN", "flipside-org"], ["foreign-owner", "OWNER", "foreign-org"]] as const) await db.user.create({ data: { id, email: id + "@example.invalid", role, organizationId, memberships: { create: { organizationId, role, status: "ACTIVE" } } } });
  priceId = (await savePriceSnapshot(db, actor.id, randomUUID(), { name: "Synthetic change price", basis: "Disposable test material allowance only.", subcontractors: "0", materials: "58", fieldLabor: "0", ownerFieldHours: "0", ownerFieldRate: "55", projectManagementHours: "0", projectManagementRate: "95", equipment: "0", protectionCleanup: "0", permitsDesign: "0", otherDirect: "0", riskPercent: "0", targetMarginPercent: "42", ownerApproval: false, ownerExceptionReason: "" })).id;
});
after(async () => { await db.$disconnect(); assert.ok(root.startsWith(path.resolve(".preservation") + path.sep) && path.basename(root).startsWith("finance-test-")); await rm(root, { recursive: true, force: true }); });

test("baseline requires owner, current figures and matching intact private evidence; retry is immutable", async () => {
  await job("review-job"); await job("other-job"); const file = await evidence("review-job"), other = await evidence("other-job");
  const raw = await reviewInput("review-job", file.id);
  await assert.rejects(() => adoptJobFinancialBaseline(db, "finance-admin", "review-job", raw, root), /owner/);
  await assert.rejects(() => adoptJobFinancialBaseline(db, "foreign-owner", "review-job", raw, root));
  await assert.rejects(() => adoptJobFinancialBaseline(db, actor.id, "review-job", { ...raw, sourceFileId: other.id }, root), /belonging/);
  await assert.rejects(() => adoptJobFinancialBaseline(db, actor.id, "review-job", { ...raw, reviewedDigest: "a".repeat(64) }, root), /changed/);
  const bytes = await readFile(storagePath(root, file.storageKey!)); await writeFile(storagePath(root, file.storageKey!), "tampered");
  await assert.rejects(() => adoptJobFinancialBaseline(db, actor.id, "review-job", raw, root)); await writeFile(storagePath(root, file.storageKey!), bytes);
  const baseline = await adoptJobFinancialBaseline(db, actor.id, "review-job", raw, root);
  assert.equal((await adoptJobFinancialBaseline(db, actor.id, "review-job", raw, root)).id, baseline.id);
  assert.equal((await db.job.findUniqueOrThrow({ where: { id: "review-job" } })).amountPaid.toString(), "0");
  await assert.rejects(() => db.jobFinancialBaseline.update({ where: { id: baseline.id }, data: { contractAmount: "2" } }), /immutable/);
  await assert.rejects(() => db.jobFinancialBaseline.delete({ where: { id: baseline.id } }), /immutable/);
});

test("receipt transitions and moves update both reviewed jobs; deposit requires sufficient receipts", async () => {
  await adopt("receipt-a"); await adopt("receipt-b");
  for (const id of ["receipt-a", "receipt-b"]) await db.invoice.create({ data: { id, invoiceNumber: id, jobId: id, subtotal: "1000", total: "1000", balanceDue: "1000" } });
  await assert.rejects(() => confirmJobDeposit(db, actor.id, "receipt-a"), /sufficient/);
  const payment = await recordPayment(db, actor.id, randomUUID(), null, "", receiptInput("receipt-a"));
  assert.equal((await db.job.findUniqueOrThrow({ where: { id: "receipt-a" } })).amountPaid.toString(), "100");
  await confirmJobDeposit(db, actor.id, "receipt-a"); await confirmJobDeposit(db, actor.id, "receipt-a");
  const old = await db.payment.findUniqueOrThrow({ where: { id: payment.id } });
  await recordPayment(db, actor.id, randomUUID(), old.id, old.updatedAt.toISOString(), receiptInput("receipt-b"));
  assert.equal((await db.job.findUniqueOrThrow({ where: { id: "receipt-a" } })).amountPaid.toString(), "0");
  assert.equal((await db.job.findUniqueOrThrow({ where: { id: "receipt-b" } })).balanceDue.toString(), "900");
  const moved = await db.payment.findUniqueOrThrow({ where: { id: payment.id } });
  await recordPayment(db, actor.id, randomUUID(), moved.id, moved.updatedAt.toISOString(), receiptInput("receipt-b", "100", "REFUNDED"));
  assert.equal((await db.job.findUniqueOrThrow({ where: { id: "receipt-b" } })).amountPaid.toString(), "0");
  const current = await db.job.findUniqueOrThrow({ where: { id: "receipt-b" } });
  await assert.rejects(() => saveJobDetails(db, actor.id, current.id, jobSchema.parse({ ...current, contractAmount: 999, amountPaid: 0 })), /overwrite/);
});

test("positive changes require retained matching price; concurrent approvals apply exactly once", async () => {
  await adopt("approve-job"); const request = randomUUID();
  const raw = draftInput("approve-job", { addedCost: "100", priceSnapshotId: priceId });
  const draft = await saveChangeDraft(db, actor.id, request, null, "", raw);
  assert.equal((await saveChangeDraft(db, actor.id, request, null, "", raw)).id, draft.id);
  await assert.rejects(() => issueChangeApproval(db, actor.id, draft.id, "a".repeat(64)), /changed/);
  const approval = await issue(draft.id); assert.equal((await issue(draft.id)).id, approval.id);
  const input = await response(approval.token!);
  await assert.rejects(() => decideChangeApproval(db, approval.token!, { ...input, reviewed: false }, null), /confirm review/);
  const results = await Promise.all(Array.from({ length: 3 }, () => decideChangeApproval(db, approval.token!, input, null)));
  assert.equal(results.filter(x => !x.alreadyRecorded).length, 1);
  assert.equal(await db.appliedChangeOrder.count({ where: { changeOrderId: draft.id } }), 1);
  assert.equal((await db.job.findUniqueOrThrow({ where: { id: "approve-job" } })).contractAmount.toString(), "1100");
  await assert.rejects(() => decideChangeApproval(db, approval.token!, { ...input, decision: "declined" }, null), /recorded response/);
  await assert.rejects(async () => saveChangeDraft(db, actor.id, randomUUID(), draft.id, (await order(draft.id)).updatedAt.toISOString(), raw), /cannot be rewritten/);
  await assert.rejects(() => deleteUnissuedChangeDraft(db, actor.id, draft.id), /unissued/);
  const snapshot = (await readChangeApproval(db, approval.token!)).snapshot;
  await assert.rejects(() => db.changeOrderSnapshot.update({ where: { id: snapshot.id }, data: { contentDigest: "x" } }), /immutable/);
  const applied = await db.appliedChangeOrder.findUniqueOrThrow({ where: { changeOrderId: draft.id } });
  await assert.rejects(() => db.appliedChangeOrder.delete({ where: { id: applied.id } }), /immutable/);
  for (const table of ["JobFinancialBaseline", "ChangeOrderSnapshot", "AppliedChangeOrder"]) await assert.rejects(() => db.$executeRawUnsafe('TRUNCATE TABLE "' + table + '" CASCADE'), /immutable/);
});

test("edited, legacy and expired requests cannot approve; zero price needs owner; decline preserves money", async () => {
  await adopt("revoke-job");
  const positive = await saveChangeDraft(db, actor.id, randomUUID(), null, "", draftInput("revoke-job", { addedCost: "101", priceSnapshotId: priceId }));
  await assert.rejects(() => issue(positive.id), /must match/);
  const draft = await saveChangeDraft(db, actor.id, randomUUID(), null, "", draftInput("revoke-job"));
  await assert.rejects(() => issue(draft.id, "finance-admin"), /owner/);
  const approval = await issue(draft.id), current = await order(draft.id);
  await saveChangeDraft(db, actor.id, randomUUID(), draft.id, current.updatedAt.toISOString(), draftInput("revoke-job", { reason: "Changed scope requires a fresh reviewed request." }));
  await assert.rejects(() => readChangeApproval(db, approval.token!), /expired/);
  await assert.rejects(() => saveChangeDraft(db, actor.id, randomUUID(), draft.id, current.updatedAt.toISOString(), draftInput("revoke-job")), /changed/);
  const next = await issue(draft.id), input = await response(next.token!, "declined");
  await decideChangeApproval(db, next.token!, input, null);
  assert.equal((await db.job.findUniqueOrThrow({ where: { id: "revoke-job" } })).contractAmount.toString(), "1000");
  await db.clientApproval.create({ data: { token: "a".repeat(64), changeOrderId: positive.id, approvalType: "CHANGE_ORDER", status: "SENT" } });
  await assert.rejects(() => readChangeApproval(db, "a".repeat(64)), /earlier link/);
});

test("audit failures roll back baseline and client application atomically", async () => {
  await job("rollback-job"); const file = await evidence("rollback-job"), raw = await reviewInput("rollback-job", file.id);
  await db.$executeRawUnsafe(`ALTER TABLE "AuditEvent" ADD CONSTRAINT finance_test_block CHECK (action <> 'JOB_FINANCIAL_BASELINE_REVIEWED') NOT VALID`);
  try { await assert.rejects(() => adoptJobFinancialBaseline(db, actor.id, "rollback-job", raw, root)); }
  finally { await db.$executeRawUnsafe('ALTER TABLE "AuditEvent" DROP CONSTRAINT finance_test_block'); }
  assert.equal(await db.jobFinancialBaseline.count({ where: { jobId: "rollback-job" } }), 0);
  assert.equal((await db.job.findUniqueOrThrow({ where: { id: "rollback-job" } })).amountPaid.toString(), "777");
  await adoptJobFinancialBaseline(db, actor.id, "rollback-job", raw, root);
  const draft = await saveChangeDraft(db, actor.id, randomUUID(), null, "", draftInput("rollback-job", { addedCost: "100", priceSnapshotId: priceId }));
  const approval = await issue(draft.id), input = await response(approval.token!);
  await db.$executeRawUnsafe(`ALTER TABLE "AuditEvent" ADD CONSTRAINT finance_test_block CHECK (action <> 'CHANGE_APPROVAL_DECIDED') NOT VALID`);
  try { await assert.rejects(() => decideChangeApproval(db, approval.token!, input, null)); }
  finally { await db.$executeRawUnsafe('ALTER TABLE "AuditEvent" DROP CONSTRAINT finance_test_block'); }
  assert.equal(await db.appliedChangeOrder.count({ where: { changeOrderId: draft.id } }), 0);
  assert.equal((await db.job.findUniqueOrThrow({ where: { id: "rollback-job" } })).contractAmount.toString(), "1000");
  assert.equal((await order(draft.id)).status, "SENT");
});

test("scope request conversion checks the job and returns the same draft on retry", async () => {
  const activity = await db.activity.create({ data: { subject: "Synthetic request", body: "Additional scope for review", activityType: "NOTE", relatedJobId: "approve-job", isOutOfScope: true } });
  await assert.rejects(() => changeDraftFromRequest(db, actor.id, activity.id, "revoke-job"), /does not belong/);
  const draft = await changeDraftFromRequest(db, actor.id, activity.id, "approve-job");
  assert.equal((await changeDraftFromRequest(db, actor.id, activity.id, "approve-job")).id, draft.id);
  assert.equal(draft.status, "DRAFT"); assert.equal(draft.addedCost.toString(), "0");
});

test("expired snapshots, altered pending scope, excessive credits and revoked issuers fail closed", async () => {
  const draft = await saveChangeDraft(db, actor.id, randomUUID(), null, "", draftInput("revoke-job"));
  const issued = await issue(draft.id), retained = (await readChangeApproval(db, issued.token!)).snapshot;
  const expired = await db.clientApproval.create({ data: { token: "b".repeat(64), changeOrderId: draft.id, approvalType: "CHANGE_ORDER", status: "SENT" } });
  await db.changeOrderSnapshot.create({ data: { organizationId: "flipside-org", jobId: "revoke-job", changeOrderId: draft.id, approvalId: expired.id, contentDigest: retained.contentDigest, content: retained.content!, expiresAt: new Date(Date.now() - 1000), createdById: actor.id } });
  await assert.rejects(() => readChangeApproval(db, expired.token!), /expired/);
  const decision = await response(issued.token!);
  await db.changeOrder.update({ where: { id: draft.id }, data: { reason: "Simulated direct alteration after the approval request." } });
  await assert.rejects(() => decideChangeApproval(db, issued.token!, decision, null), /scope changed/);
  const credit = await saveChangeDraft(db, actor.id, randomUUID(), null, "", draftInput("revoke-job", { addedCost: "-1001" }));
  await assert.rejects(() => issue(credit.id), /below zero/);
  await db.membership.updateMany({ where: { userId: actor.id }, data: { status: "DISABLED" } });
  try { await assert.rejects(() => issue(credit.id), /access denied/); }
  finally { await db.membership.updateMany({ where: { userId: actor.id }, data: { status: "ACTIVE" } }); }
});
import { money } from "../lib/format";
test("financial display retains cents and credits", () => {
  assert.equal(money("974.50"), "$974.50");
  assert.equal(money("-25.50"), "-$25.50");
  assert.equal(money("0"), "$0.00");
});
