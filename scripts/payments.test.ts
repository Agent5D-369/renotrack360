import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { ledgerPaymentSchema, recordPayment, saveInvoiceWithLedger } from "../lib/payment-ledger";

const db = new PrismaClient({ log: [] });
const url = new URL(process.env.DATABASE_URL!);
assert.ok(["localhost", "127.0.0.1"].includes(url.hostname) && url.pathname === "/flipside_migration_payments");
const input = (invoiceId: string, changes = {}) => ({ invoiceId, clientProfileId: "", amount: "100", paymentDate: "2026-09-21", method: "CHECK", status: "PENDING", stripePaymentIntentId: "", notes: "Synthetic receipt test.", ...changes });
const invoice = async (id: string) => db.invoice.create({ data: { id, invoiceNumber: id, jobId: "ledger-job", subtotal: "1000", total: "1000", balanceDue: "1000", status: "SENT" } });
const revise = async (id: string, changes = {}) => { const old = await db.payment.findUniqueOrThrow({ where: { id } }); return recordPayment(db, "ledger-owner", randomUUID(), id, old.updatedAt.toISOString(), input(old.invoiceId, { amount: old.amount.toString(), status: old.status, ...changes })); };
before(async () => {
  await db.organization.createMany({ data: [{ id: "flipside-org", name: "Flipside test" }, { id: "foreign-org", name: "Foreign test" }] });
  for (const [id, org] of [["ledger-owner", "flipside-org"], ["ledger-foreign", "foreign-org"]]) await db.user.create({ data: { id, email: `${id}@example.invalid`, role: "OWNER", organizationId: org, memberships: { create: { organizationId: org, role: "OWNER", status: "ACTIVE" } } } });
  await db.job.createMany({ data: [{ id: "ledger-job", organizationId: "flipside-org", jobName: "Synthetic ledger job", amountPaid: "777" }, { id: "foreign-job", organizationId: "foreign-org", jobName: "Foreign test job" }] });
  await db.invoice.create({ data: { id: "foreign-invoice", invoiceNumber: "foreign", jobId: "foreign-job" } });
});
after(() => db.$disconnect());

test("pending/failed receipts do not count, completed transitions and full refunds reconcile", async () => {
  await invoice("status-invoice");
  const receipt = await recordPayment(db, "ledger-owner", randomUUID(), null, "", input("status-invoice"));
  assert.equal((await db.invoice.findUniqueOrThrow({ where: { id: "status-invoice" } })).amountPaid.toString(), "0");
  await revise(receipt.id, { status: "FAILED" });
  assert.equal((await db.invoice.findUniqueOrThrow({ where: { id: "status-invoice" } })).balanceDue.toString(), "1000");
  await revise(receipt.id, { status: "COMPLETED", amount: "100.25" });
  let current = await db.invoice.findUniqueOrThrow({ where: { id: "status-invoice" } });
  assert.equal(current.amountPaid.toString(), "100.25"); assert.equal(current.balanceDue.toString(), "899.75"); assert.equal(current.status, "PARTIALLY_PAID");
  await assert.rejects(() => revise(receipt.id, { status: "REFUNDED", amount: "50" }), /full refund/);
  await revise(receipt.id, { status: "REFUNDED" });
  current = await db.invoice.findUniqueOrThrow({ where: { id: "status-invoice" } });
  assert.equal(current.amountPaid.toString(), "0"); assert.equal(current.balanceDue.toString(), "1000");
  assert.equal((await db.job.findUniqueOrThrow({ where: { id: "ledger-job" } })).amountPaid.toString(), "777", "Historical job amount is not guessed or rewritten");
});

test("retries, concurrent receipts, stale edits and invoice moves preserve one ledger", async () => {
  await invoice("move-a"); await invoice("move-b"); const request = randomUUID();
  const results = await Promise.all(Array.from({ length: 3 }, () => recordPayment(db, "ledger-owner", request, null, "", input("move-a", { status: "COMPLETED" }))));
  assert.equal(new Set(results.map(value => value.id)).size, 1);
  assert.equal(await db.paymentRevision.count({ where: { paymentId: results[0].id } }), 1);
  await Promise.all(["25", "75"].map(amount => recordPayment(db, "ledger-owner", randomUUID(), null, "", input("move-a", { amount, status: "COMPLETED" }))));
  assert.equal((await db.invoice.findUniqueOrThrow({ where: { id: "move-a" } })).amountPaid.toString(), "200");
  const old = await db.payment.findUniqueOrThrow({ where: { id: results[0].id } });
  await revise(old.id, { invoiceId: "move-b", amount: "150" });
  assert.equal((await db.invoice.findUniqueOrThrow({ where: { id: "move-a" } })).amountPaid.toString(), "100");
  assert.equal((await db.invoice.findUniqueOrThrow({ where: { id: "move-b" } })).amountPaid.toString(), "150");
  await assert.rejects(() => recordPayment(db, "ledger-owner", randomUUID(), old.id, old.updatedAt.toISOString(), input("move-a")), /changed/);
  await assert.rejects(() => recordPayment(db, "ledger-owner", request, null, "", input("move-a", { amount: "2" })), /already used/);
  const revision = await db.paymentRevision.findFirstOrThrow({ where: { paymentId: old.id } });
  await assert.rejects(() => db.paymentRevision.update({ where: { id: revision.id }, data: { actorId: "changed" } }), /immutable/);
  await assert.rejects(() => db.paymentRevision.delete({ where: { id: revision.id } }), /immutable/);
  await assert.rejects(() => db.$executeRawUnsafe('TRUNCATE TABLE "PaymentRevision"'), /immutable/);
});

test("invalid/foreign/revoked/duplicate-provider writes fail and audit failure rolls back money", async () => {
  for (const amount of ["0", "-1", "abc", "1.001", "Infinity"]) assert.equal(ledgerPaymentSchema.safeParse(input("move-a", { amount })).success, false);
  await assert.rejects(() => recordPayment(db, "ledger-foreign", randomUUID(), null, "", input("move-a")), /access denied/);
  await assert.rejects(() => recordPayment(db, "ledger-owner", randomUUID(), null, "", input("foreign-invoice")), /access denied/);
  await db.membership.updateMany({ where: { userId: "ledger-owner" }, data: { status: "DISABLED" } });
  try { await assert.rejects(() => recordPayment(db, "ledger-owner", randomUUID(), null, "", input("move-a")), /access denied/); }
  finally { await db.membership.updateMany({ where: { userId: "ledger-owner" }, data: { status: "ACTIVE" } }); }
  await recordPayment(db, "ledger-owner", randomUUID(), null, "", input("move-a", { stripePaymentIntentId: "pi_synthetic", method: "STRIPE" }));
  await assert.rejects(() => recordPayment(db, "ledger-owner", randomUUID(), null, "", input("move-b", { stripePaymentIntentId: "pi_synthetic", method: "STRIPE" })), /already recorded/);
  const before = await db.invoice.findUniqueOrThrow({ where: { id: "move-a" } }), count = await db.payment.count(), revisions = await db.paymentRevision.count();
  await db.$executeRawUnsafe(`ALTER TABLE "AuditEvent" ADD CONSTRAINT payment_test_block CHECK (action <> 'PAYMENT_RECORDED') NOT VALID`);
  try { await assert.rejects(() => recordPayment(db, "ledger-owner", randomUUID(), null, "", input("move-a", { status: "COMPLETED" }))); }
  finally { await db.$executeRawUnsafe('ALTER TABLE "AuditEvent" DROP CONSTRAINT payment_test_block'); }
  assert.deepEqual(await db.invoice.findUniqueOrThrow({ where: { id: "move-a" } }), before);
  assert.equal(await db.payment.count(), count); assert.equal(await db.paymentRevision.count(), revisions);
});

test("invoice edits derive paid from receipts, reject reassignment/stale totals and preserve discrepancies", async () => {
  const fields = { jobId: "ledger-job", clientProfileId: "", invoiceNumber: "new-invoice", dueDate: "", subtotal: "1000", tax: "0", total: "1000", status: "PAID", notes: "Synthetic invoice", amountPaid: "9999" };
  const created = await saveInvoiceWithLedger(db, "ledger-owner", null, "", fields);
  assert.equal(created.amountPaid.toString(), "0"); assert.notEqual(created.status, "PAID");
  await recordPayment(db, "ledger-owner", randomUUID(), null, "", input(created.id, { status: "COMPLETED", amount: "200" }));
  const current = await db.invoice.findUniqueOrThrow({ where: { id: created.id } });
  await assert.rejects(() => saveInvoiceWithLedger(db, "ledger-owner", current.id, created.updatedAt.toISOString(), fields), /changed/);
  const edited = await saveInvoiceWithLedger(db, "ledger-owner", current.id, current.updatedAt.toISOString(), { ...fields, subtotal: "1200", total: "1200" });
  assert.equal(edited.amountPaid.toString(), "200"); assert.equal(edited.balanceDue.toString(), "1000");
  await assert.rejects(() => saveInvoiceWithLedger(db, "ledger-owner", edited.id, edited.updatedAt.toISOString(), { ...fields, jobId: "foreign-job" }), /reassigned/);
  await assert.rejects(() => saveInvoiceWithLedger(db, "ledger-owner", edited.id, edited.updatedAt.toISOString(), { ...fields, total: "10" }), /subtotal plus tax/);
  await db.invoice.update({ where: { id: edited.id }, data: { amountPaid: "999" } });
  const discrepancy = await db.invoice.findUniqueOrThrow({ where: { id: edited.id } });
  await assert.rejects(() => recordPayment(db, "ledger-owner", randomUUID(), null, "", input(edited.id)), /reconciliation/);
  assert.deepEqual(await db.invoice.findUniqueOrThrow({ where: { id: edited.id } }), discrepancy);
});
