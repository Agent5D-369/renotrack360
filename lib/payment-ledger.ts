import { Prisma, PrismaClient, InvoiceStatus, PaymentMethod, PaymentStatus } from "@prisma/client";
import { createHash } from "node:crypto";
import { z } from "zod";
import { hasStaffAccess } from "./staff-policy";

export class PaymentLedgerError extends Error {}
const dollars = z.string().trim().regex(/^(0|[1-9]\d{0,8})(\.\d{1,2})?$/, "Use a nonnegative dollar amount with at most two decimals.");
const optionalText = z.string().trim().max(3000).default("");
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(value + "T00:00:00Z"); return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Invalid payment date.");
export const ledgerPaymentSchema = z.object({
  invoiceId: z.string().min(1), clientProfileId: optionalText, amount: dollars.refine(value => dollars.safeParse(value).success && new Prisma.Decimal(value).gt(0), "Payment amount must be positive."),
  paymentDate: day, method: z.nativeEnum(PaymentMethod), status: z.nativeEnum(PaymentStatus), stripePaymentIntentId: optionalText, notes: optionalText,
});
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
async function staffAndLock(tx: Prisma.TransactionClient, actorId: string) {
  const user = await tx.user.findUnique({ where: { id: actorId }, include: { memberships: true } });
  const member = user?.memberships.find(value => value.organizationId === user.organizationId);
  if (!hasStaffAccess(user, member ?? null)) throw new PaymentLedgerError("Staff access denied.");
  const organizationId = user!.organizationId!;
  // One small-business finance lock covers cross-invoice moves and competing invoice edits.
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${organizationId + ":invoice-ledger"}, 0))::text`;
  return organizationId;
}
async function ownedInvoice(tx: Prisma.TransactionClient, id: string, organizationId: string) {
  const invoice = await tx.invoice.findUnique({ where: { id }, include: { job: true, clientProfile: true } });
  if (!invoice || (!invoice.job && !invoice.clientProfile) || (invoice.job && invoice.job.organizationId !== organizationId) || (invoice.clientProfile && invoice.clientProfile.organizationId !== organizationId)) throw new PaymentLedgerError("Invoice access denied or ownership unresolved.");
  return invoice;
}
async function completedTotal(tx: Prisma.TransactionClient, invoiceId: string) {
  return (await tx.payment.aggregate({ where: { invoiceId, status: "COMPLETED" }, _sum: { amount: true } }))._sum.amount ?? new Prisma.Decimal(0);
}
async function verifyInvoiceLedger(tx: Prisma.TransactionClient, invoice: Awaited<ReturnType<typeof ownedInvoice>>) {
  const paid = await completedTotal(tx, invoice.id);
  if (!invoice.amountPaid.eq(paid) || !invoice.balanceDue.eq(invoice.total.minus(paid))) throw new PaymentLedgerError("Invoice totals need receipt reconciliation before this change. Review the payment reconciliation page.");
}
function derivedStatus(total: Prisma.Decimal, paid: Prisma.Decimal, previous: InvoiceStatus, dueDate: Date | null): InvoiceStatus {
  if (previous === "VOID") return "VOID";
  if (paid.gt(0) && paid.gte(total)) return "PAID";
  if (paid.gt(0)) return "PARTIALLY_PAID";
  if (previous === "DRAFT") return "DRAFT";
  return dueDate && dueDate.getTime() < Date.now() ? "OVERDUE" : "SENT";
}
async function reconcileInvoice(tx: Prisma.TransactionClient, invoiceId: string) {
  const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  const paid = await completedTotal(tx, invoiceId);
  return tx.invoice.update({ where: { id: invoiceId }, data: { amountPaid: paid, balanceDue: invoice.total.minus(paid), status: derivedStatus(invoice.total, paid, invoice.status, invoice.dueDate) } });
}
export async function recordPayment(db: PrismaClient, actorId: string, requestId: string, paymentId: string | null, expectedUpdatedAt: string, raw: unknown) {
  if (!z.string().uuid().safeParse(requestId).success) throw new PaymentLedgerError("Reload the payment form before saving.");
  const parsed = ledgerPaymentSchema.safeParse(raw);
  if (!parsed.success) throw new PaymentLedgerError(parsed.error.issues[0].message);
  const input = parsed.data;
  const inputDigest = createHash("sha256").update(JSON.stringify({ paymentId, expectedUpdatedAt, input })).digest("hex");
  return db.$transaction(async tx => {
    const organizationId = await staffAndLock(tx, actorId);
    const retry = await tx.paymentRevision.findUnique({ where: { organizationId_requestId: { organizationId, requestId } } });
    if (retry) {
      if (retry.inputDigest !== inputDigest || retry.actorId !== actorId) throw new PaymentLedgerError("This request was already used. Reload the payment form.");
      return { id: retry.paymentId };
    }
    const old = paymentId ? await tx.payment.findUnique({ where: { id: paymentId } }) : null;
    if (paymentId && (!old || old.updatedAt.toISOString() !== expectedUpdatedAt)) throw new PaymentLedgerError("The payment changed. Reload before editing it.");
    if (input.status === "REFUNDED" && (!old || !["COMPLETED", "REFUNDED"].includes(old.status) || !old.amount.eq(input.amount))) throw new PaymentLedgerError("A full refund must retain the amount of an existing completed receipt. Partial refunds need a reviewed adjustment.");
    const invoiceIds = [...new Set([input.invoiceId, ...(old ? [old.invoiceId] : [])])].sort();
    const beforeInvoices = [];
    for (const id of invoiceIds) { const invoice = await ownedInvoice(tx, id, organizationId); await verifyInvoiceLedger(tx, invoice); beforeInvoices.push(invoice); }
    const invoice = beforeInvoices.find(value => value.id === input.invoiceId)!;
    if (invoice.status === "VOID" && input.status === "COMPLETED") throw new PaymentLedgerError("A void invoice cannot receive a completed payment.");
    const clientId = input.clientProfileId || invoice.clientProfileId || invoice.job?.clientProfileId || null;
    if (clientId) {
      const client = await tx.profile.findUnique({ where: { id: clientId } });
      if (!client || client.organizationId !== organizationId || (invoice.clientProfileId && clientId !== invoice.clientProfileId) || (invoice.job?.clientProfileId && clientId !== invoice.job.clientProfileId)) throw new PaymentLedgerError("Payment client must match the invoice and job.");
    }
    if (input.stripePaymentIntentId) {
      const duplicate = await tx.payment.findFirst({ where: { stripePaymentIntentId: input.stripePaymentIntentId, ...(paymentId ? { id: { not: paymentId } } : {}) } });
      if (duplicate) throw new PaymentLedgerError("That Stripe payment reference is already recorded.");
    }
    const data = { ...input, clientProfileId: clientId, paymentDate: new Date(input.paymentDate + "T00:00:00Z"), stripePaymentIntentId: input.stripePaymentIntentId || null, notes: input.notes || null };
    const payment = old ? await tx.payment.update({ where: { id: old.id }, data }) : await tx.payment.create({ data });
    const afterInvoices = [];
    for (const id of invoiceIds) afterInvoices.push(await reconcileInvoice(tx, id));
    const revision = await tx.paymentRevision.create({ data: { organizationId, paymentId: payment.id, requestId, inputDigest, actorId,
      before: old ? json({ payment: old, invoices: beforeInvoices.map(({ job, clientProfile, ...value }) => value) }) : json({ payment: null, invoices: beforeInvoices.map(({ job, clientProfile, ...value }) => value) }),
      after: json({ payment, invoices: afterInvoices }) } });
    await tx.auditEvent.create({ data: { organizationId, actorUserId: actorId, action: "PAYMENT_RECORDED", entityType: "Payment", entityId: payment.id,
      metadata: { revisionId: revision.id, invoiceIds, inputDigest, providerTransactionPerformed: false } } });
    return payment;
  });
}

const invoiceInputSchema = z.object({ jobId: optionalText, clientProfileId: optionalText, invoiceNumber: z.string().trim().min(2).max(120),
  dueDate: z.union([day, z.literal("")]), subtotal: dollars, tax: dollars, total: dollars, status: z.nativeEnum(InvoiceStatus), notes: optionalText });
export async function saveInvoiceWithLedger(db: PrismaClient, actorId: string, invoiceId: string | null, expectedUpdatedAt: string, raw: unknown) {
  const parsed = invoiceInputSchema.safeParse(raw);
  if (!parsed.success) throw new PaymentLedgerError(parsed.error.issues[0].message);
  const input = parsed.data;
  if (!new Prisma.Decimal(input.subtotal).plus(input.tax).eq(input.total)) throw new PaymentLedgerError("Invoice total must equal subtotal plus tax.");
  return db.$transaction(async tx => {
    const organizationId = await staffAndLock(tx, actorId);
    const before = invoiceId ? await ownedInvoice(tx, invoiceId, organizationId) : null;
    if (before) {
      if (before.updatedAt.toISOString() !== expectedUpdatedAt) throw new PaymentLedgerError("The invoice changed. Reload before editing it.");
      await verifyInvoiceLedger(tx, before);
      if ((before.jobId || "") !== input.jobId || (before.clientProfileId || "") !== input.clientProfileId) {
        if (await tx.payment.count({ where: { invoiceId: before.id } })) throw new PaymentLedgerError("An invoice with payment records cannot be reassigned. Review the receipt allocation instead.");
      }
    }
    if (!input.jobId && !input.clientProfileId) throw new PaymentLedgerError("Assign this invoice to a Flipside job or client.");
    const job = input.jobId ? await tx.job.findUnique({ where: { id: input.jobId } }) : null;
    const client = input.clientProfileId ? await tx.profile.findUnique({ where: { id: input.clientProfileId } }) : null;
    if ((input.jobId && job?.organizationId !== organizationId) || (input.clientProfileId && client?.organizationId !== organizationId) || (job?.clientProfileId && input.clientProfileId && job.clientProfileId !== input.clientProfileId)) throw new PaymentLedgerError("Invoice ownership or client does not match.");
    const paid = invoiceId ? await completedTotal(tx, invoiceId) : new Prisma.Decimal(0);
    if (input.status === "VOID" && paid.gt(0)) throw new PaymentLedgerError("Resolve completed receipts before voiding this invoice.");
    const dueDate = input.dueDate ? new Date(input.dueDate + "T00:00:00Z") : null;
    const total = new Prisma.Decimal(input.total);
    const data = { ...input, jobId: input.jobId || null, clientProfileId: input.clientProfileId || null, dueDate,
      amountPaid: paid, balanceDue: total.minus(paid), status: derivedStatus(total, paid, input.status, dueDate), notes: input.notes || null };
    const after = invoiceId ? await tx.invoice.update({ where: { id: invoiceId }, data }) : await tx.invoice.create({ data });
    await tx.auditEvent.create({ data: { organizationId, actorUserId: actorId, action: "INVOICE_SAVED", entityType: "Invoice", entityId: after.id,
      metadata: { before: before ? json(before) : null, after: json(after), paidSource: "COMPLETED_PAYMENTS" } } });
    return after;
  });
}
