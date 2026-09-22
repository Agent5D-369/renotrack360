import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { createPrivateAsset } from "../lib/private-media";
import { savePriceSnapshot } from "../lib/price-snapshot";
import {
  decideEstimateApproval,
  convertAcceptedEstimate,
  estimateReviewDigest,
  issueEstimateApproval,
  ownedEstimate,
  readEstimateApproval,
} from "../lib/estimate-acceptance";
import { adoptJobFinancialBaseline, jobFinanceReviewData } from "../lib/job-finance";
import {
  assertInvoiceNotMilestoneLinked,
  createMilestoneInvoiceDraft,
  defaultBillingMilestones,
  milestoneBillingReviewData,
} from "../lib/milestone-billing";
import { billingScheduleInputSchema, calculateBillingMilestones } from "../lib/billing-schedule";
import { saveInvoiceWithLedger } from "../lib/payment-ledger";

const db = new PrismaClient({ log: [] });
const target = new URL(process.env.DATABASE_URL!);
assert.equal(target.hostname, "127.0.0.1");
assert.equal(target.pathname, "/flipside_migration_milestone-billing");
const root = path.resolve(".preservation", `milestone-billing-test-${randomUUID()}`);
const actor = { id: "milestone-owner", organizationId: "flipside-org" };
let clientId: string, propertyId: string, priceId: string;

before(async () => {
  await mkdir(root, { recursive: true });
  await db.organization.createMany({ data: [{ id: "flipside-org", name: "Milestone fixture" }, { id: "foreign-org", name: "Foreign fixture" }] });
  for (const [id, role, organizationId] of [[actor.id, "OWNER", "flipside-org"], ["milestone-admin", "ADMIN", "flipside-org"], ["foreign-owner", "OWNER", "foreign-org"]] as const) {
    await db.user.create({ data: { id, email: `${id}@example.invalid`, role, organizationId, memberships: { create: { organizationId, role, status: "ACTIVE" } } } });
  }
  clientId = (await db.profile.create({ data: { organizationId: "flipside-org", profileName: "Synthetic Client", profileType: "HOMEOWNER" } })).id;
  propertyId = (await db.property.create({ data: { organizationId: "flipside-org", propertyAddress: "Synthetic property", city: "Austin", state: "TX", zip: "78704", propertyType: "SINGLE_FAMILY_HOME" } })).id;
  priceId = (await savePriceSnapshot(db, actor.id, randomUUID(), { name: "Milestone contract", basis: "Disposable milestone billing fixture only.", materials: "600", fieldLabor: "0", subcontractors: "0", ownerFieldHours: "0", ownerFieldRate: "55", projectManagementHours: "0", projectManagementRate: "95", equipment: "0", protectionCleanup: "0", permitsDesign: "0", otherDirect: "0", riskPercent: "0", targetMarginPercent: "40" })).id;
});
after(async () => {
  await db.$disconnect();
  assert.ok(root.startsWith(path.resolve(".preservation") + path.sep));
  await rm(root, { recursive: true, force: true });
});

async function acceptedJob(schedule: unknown = defaultBillingMilestones, requiredDeposit = "200") {
  const quote = await db.quote.create({ data: { organizationId: "flipside-org", quoteName: `Milestone ${randomUUID()}`, clientProfileId: clientId, propertyId } });
  const estimate = await db.estimate.create({ data: { quoteId: quote.id, estimateNumber: randomUUID(), clientProfileId: clientId, propertyId, total: "1000" } });
  const proposal = await createPrivateAsset(db, actor, { entityType: "QUOTE", entityId: quote.id, file: new File(["%PDF-1.4\nSynthetic milestone proposal\n%%EOF"], "proposal.pdf", { type: "application/pdf" }) }, root);
  const input = {
    requestId: randomUUID(), reviewedDigest: estimateReviewDigest(await ownedEstimate(db, estimate.id)), priceSnapshotId: priceId, sourceFileId: proposal.id, ownerReviewed: true,
    scope: "Synthetic client scope retained for milestone billing tests.", exclusions: "Synthetic client exclusions retained for milestone billing tests.", allowances: "Synthetic client allowances retained for milestone billing tests.",
    schedule: "Synthetic project schedule retained for milestone billing tests.", paymentSchedule: "Synthetic payment terms retained for milestone billing tests.", warranty: "Synthetic warranty terms retained for milestone billing tests.",
    requiredDeposit, ...(schedule === null ? {} : { billingMilestones: JSON.stringify(schedule) }),
  };
  const approval = await issueEstimateApproval(db, actor.id, estimate.id, input, root);
  const reviewedDigest = (await readEstimateApproval(db, approval.token!)).snapshot.contentDigest;
  await decideEstimateApproval(db, approval.token!, { decision: "approved", signerName: "Synthetic Client", reviewed: true, reviewedDigest }, root, null);
  const job = await convertAcceptedEstimate(db, actor.id, estimate.id);
  const financeFile = await createPrivateAsset(db, actor, { entityType: "JOB", entityId: job.id, file: new File(["%PDF-1.4\nSynthetic finance review\n%%EOF"], "finance.pdf", { type: "application/pdf" }) }, root);
  await adoptJobFinancialBaseline(db, actor.id, job.id, { requestId: randomUUID(), sourceFileId: financeFile.id, reviewedDigest: (await jobFinanceReviewData(db, job.id, "flipside-org")).digest, requiredDeposit, reviewReason: "Synthetic owner review of the accepted contract and receipts.", contractVerified: true, receiptsComplete: true }, root);
  return { job, estimate };
}

const draftInput = (review: Awaited<ReturnType<typeof milestoneBillingReviewData>>, changes: Record<string, unknown> = {}) => ({
  requestId: randomUUID(), milestoneKey: review.milestones[0].key, invoiceNumber: `INV-${randomUUID()}`, dueDate: "2026-10-01", reviewedDigest: review.digest,
  reviewReason: "Synthetic owner review of the retained milestone and trigger evidence.", triggerVerified: true, ...changes,
});

test("schedule defaults and custom percentages are bounded and round to an exact residual", () => {
  assert.equal(billingScheduleInputSchema.parse(defaultBillingMilestones).reduce((sum, item) => sum + Number(item.percent), 0), 100);
  assert.equal(billingScheduleInputSchema.safeParse([{ ...defaultBillingMilestones[0], percent: "0.00" }, ...defaultBillingMilestones.slice(1)]).success, false);
  assert.equal(billingScheduleInputSchema.safeParse(defaultBillingMilestones.map((item, index) => index === 0 ? { ...item, percent: "19" } : item)).success, false);
  const calculated = calculateBillingMilestones("1000.01", defaultBillingMilestones);
  assert.deepEqual(calculated.map(item => item.amount), ["200.00", "300.00", "400.00", "100.01"]);
  assert.equal(calculated.reduce((sum, item) => sum + Math.round(Number(item.amount) * 100), 0), 100001);
  assert.throws(() => calculateBillingMilestones("0.01", defaultBillingMilestones), /positive invoice amount/);
});

test("issuance parses schedule JSON and refuses a deposit that differs from the first draw", async () => {
  await assert.rejects(() => acceptedJob(defaultBillingMilestones, "199"), /first billing milestone/);
  const { job } = await acceptedJob();
  const review = await milestoneBillingReviewData(db, actor.id, job.id);
  assert.deepEqual(review.milestones.map(item => item.amount), ["200.00", "300.00", "400.00", "100.00"]);
});

test("owner review creates each draft once with serialized retries and no send or payment side effects", async () => {
  const { job } = await acceptedJob(), review = await milestoneBillingReviewData(db, actor.id, job.id), input = draftInput(review);
  await assert.rejects(() => createMilestoneInvoiceDraft(db, "milestone-admin", job.id, input), /owner/);
  await assert.rejects(() => createMilestoneInvoiceDraft(db, "foreign-owner", job.id, input), /access denied|accepted proposal/i);
  await assert.rejects(() => createMilestoneInvoiceDraft(db, actor.id, job.id, { ...input, reviewedDigest: "a".repeat(64) }), /changed/);
  const invoices = await Promise.all(Array.from({ length: 3 }, () => createMilestoneInvoiceDraft(db, actor.id, job.id, input)));
  assert.equal(new Set(invoices.map(invoice => invoice.id)).size, 1);
  assert.equal(invoices[0].status, "DRAFT"); assert.equal(invoices[0].total.toString(), "200"); assert.equal(invoices[0].amountPaid.toString(), "0");
  assert.equal(await db.milestoneInvoiceDraft.count({ where: { invoiceId: invoices[0].id } }), 1);
  assert.equal(await db.auditEvent.count({ where: { action: "MILESTONE_INVOICE_DRAFT_CREATED", entityId: invoices[0].id } }), 1);
  assert.equal(await db.payment.count({ where: { invoiceId: invoices[0].id } }), 0);
  await assert.rejects(() => createMilestoneInvoiceDraft(db, actor.id, job.id, { ...input, invoiceNumber: `INV-${randomUUID()}` }), /already used/);
  const refreshed = await milestoneBillingReviewData(db, actor.id, job.id);
  await assert.rejects(() => createMilestoneInvoiceDraft(db, actor.id, job.id, draftInput(refreshed)), /already has/);
});

test("legacy schedules and unallocated existing invoices fail closed", async () => {
  const legacy = await acceptedJob(null, "100");
  await assert.rejects(() => milestoneBillingReviewData(db, actor.id, legacy.job.id), /no retained structured billing schedule/);
  const scheduled = await acceptedJob();
  await db.invoice.create({ data: { invoiceNumber: `LEGACY-${randomUUID()}`, jobId: scheduled.job.id, clientProfileId: clientId, subtotal: "200", total: "200", balanceDue: "200", status: "SENT" } });
  await assert.rejects(() => milestoneBillingReviewData(db, actor.id, scheduled.job.id), /existing invoices/);
});

test("retained link blocks financial rewrites and deletion while allowing ordinary draft notes", async () => {
  const { job } = await acceptedJob(), review = await milestoneBillingReviewData(db, actor.id, job.id);
  const invoice = await createMilestoneInvoiceDraft(db, actor.id, job.id, draftInput(review));
  const base = { jobId: job.id, clientProfileId: clientId, invoiceNumber: invoice.invoiceNumber, dueDate: "2026-10-02", subtotal: "200", tax: "0", total: "200", status: "DRAFT", notes: "Reviewed scheduling note" };
  await assert.rejects(() => saveInvoiceWithLedger(db, actor.id, invoice.id, invoice.updatedAt.toISOString(), { ...base, total: "201", subtotal: "201" }), /retained milestone invoice/);
  const updated = await saveInvoiceWithLedger(db, actor.id, invoice.id, invoice.updatedAt.toISOString(), base);
  assert.equal(updated.notes, "Reviewed scheduling note"); assert.equal(updated.dueDate?.toISOString().slice(0, 10), "2026-10-02");
  await assert.rejects(() => assertInvoiceNotMilestoneLinked(db, invoice.id), /cannot be deleted/);
  await assert.rejects(() => db.invoice.delete({ where: { id: invoice.id } }));
  const link = await db.milestoneInvoiceDraft.findUniqueOrThrow({ where: { invoiceId: invoice.id } });
  await assert.rejects(() => db.milestoneInvoiceDraft.update({ where: { id: link.id }, data: { reviewReason: "Overwrite retained review" } }), /immutable/);
  await assert.rejects(() => db.milestoneInvoiceDraft.delete({ where: { id: link.id } }), /immutable/);
  await assert.rejects(() => db.$executeRawUnsafe('TRUNCATE TABLE "MilestoneInvoiceDraft"'), /immutable/);
});

test("audit failure rolls invoice and retained link back atomically", async () => {
  const { job } = await acceptedJob(), review = await milestoneBillingReviewData(db, actor.id, job.id), before = await db.invoice.count();
  await db.$executeRawUnsafe(`ALTER TABLE "AuditEvent" ADD CONSTRAINT milestone_test_block CHECK (action <> 'MILESTONE_INVOICE_DRAFT_CREATED') NOT VALID`);
  try { await assert.rejects(() => createMilestoneInvoiceDraft(db, actor.id, job.id, draftInput(review))); }
  finally { await db.$executeRawUnsafe('ALTER TABLE "AuditEvent" DROP CONSTRAINT milestone_test_block'); }
  assert.equal(await db.invoice.count(), before);
  assert.equal(await db.milestoneInvoiceDraft.count({ where: { jobId: job.id } }), 0);
});
