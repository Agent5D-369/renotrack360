import { requireStaffPage } from "@/lib/staff-access";
import Link from "next/link";
import { createPaymentLink, deleteInvoice, sendInvoiceEmail } from "@/app/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { Button, Panel } from "@/components/ui";
import { dateShort, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { flipsideInvoiceWhere } from "@/lib/financial-record-scope";
import { invoiceCollectionState } from "@/lib/invoice-collections";
import { notFound } from "next/navigation";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage();
  const { id } = await params;
  const invoice = await prisma.invoice.findFirst({
    where: { AND: [{ id }, flipsideInvoiceWhere] },
    include: { job: true, clientProfile: true, payments: { orderBy: { paymentDate: "desc" } } }
  });
  if (!invoice) notFound();
  const collection = invoiceCollectionState(invoice);

  return (
    <>
      <PageHeader title={`Invoice ${invoice.invoiceNumber}`} body={invoice.clientProfile?.profileName ?? "No client"} />
      <div className="mb-4 flex items-center gap-3">
        <Link href="/invoices" className="text-sm font-semibold text-muted-foreground hover:text-foreground">← All invoices</Link>
        {invoice.job && (
          <>
            <span className="text-muted-foreground">·</span>
            <Link href={`/jobs/${invoice.job.id}`} className="text-sm font-semibold text-muted-foreground hover:text-foreground">View job</Link>
          </>
        )}
      </div>

      <section id="receipt-review" className={`mb-5 scroll-mt-6 border-l-4 bg-white p-5 ${collection.needsReview ? "border-destructive" : "border-accent"}`}>
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Next step</p><h2 className="mt-1 text-lg font-semibold">{collection.nextAction}</h2><p className="mt-2 max-w-2xl text-sm text-muted-foreground">{collection.clientConflict ? "The invoice client and linked job client differ. Confirm the correct association from the source documents before requesting payment." : collection.needsReview ? "The recorded amounts or credit balance need review. Compare the receipt evidence before requesting payment." : invoice.status === "DRAFT" ? "Confirm the agreed scope, amount and payment milestone before issuing this draft." : collection.overdue ? `${collection.dueLabel}. Confirm delivery and any outstanding client questions, then choose the appropriate follow-up.` : collection.open ? `${collection.dueLabel}. Record payment only when you have the actual receipt.` : "Review the retained invoice and receipt history below."}</p></div><Link href={collection.clientConflict?`/invoices/${id}/edit`:collection.needsReview?"/payments/reconciliation":invoice.status==="DRAFT"||(!invoice.dueDate&&collection.open)?`/invoices/${id}/edit`:collection.open?`/payments/new?invoiceId=${id}`:"#payment-history"} className="rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">{collection.clientConflict?"Review client links":collection.needsReview?"Reconcile records":invoice.status==="DRAFT"||(!invoice.dueDate&&collection.open)?"Review invoice":collection.open?"Record receipt":"View history"}</Link></div>
        <dl className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-3"><div><dt className="text-xs text-muted-foreground">Recorded paid</dt><dd className="mt-1 font-semibold tabular-nums">{money(invoice.amountPaid)}</dd></div><div><dt className="text-xs text-muted-foreground">Completed receipt records</dt><dd className="mt-1 font-semibold tabular-nums">{money(collection.receipts)}</dd></div><div><dt className="text-xs text-muted-foreground">Balance from completed receipts</dt><dd className="mt-1 font-semibold tabular-nums">{money(collection.expectedBalance)}</dd></div></dl>
      </section>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Panel className="p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Status</p>
              <div className="mt-2"><StatusPill value={invoice.status} /></div>
            </Panel>
            <Panel className="p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Total</p>
              <p className="mt-2 text-2xl font-bold">{money(invoice.total)}</p>
            </Panel>
            <Panel className="p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Paid</p>
              <p className="mt-2 text-2xl font-bold text-emerald-600">{money(invoice.amountPaid)}</p>
            </Panel>
            <Panel className="p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Balance due</p>
              <p className={["mt-2 text-2xl font-bold", Number(invoice.balanceDue) > 0 ? "text-red-600" : "text-emerald-600"].join(" ")}>{money(invoice.balanceDue)}</p>
            </Panel>
          </div>

          {invoice.notes && (
            <Panel className="p-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Notes</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{invoice.notes}</p>
            </Panel>
          )}

          {invoice.payments.length > 0 && (
            <Panel className="overflow-hidden p-0">
              <div id="payment-history" className="border-b border-border px-5 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Payment history · {invoice.payments.length}</p>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-bold">Date</th>
                    <th className="px-4 py-2 font-bold">Method</th>
                    <th className="px-4 py-2 font-bold">Amount</th>
                    <th className="px-4 py-2 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.payments.map((p) => (
                    <tr key={p.id} className="border-t border-border">
                      <td className="px-4 py-2">{dateShort(p.paymentDate)}</td>
                      <td className="px-4 py-2"><StatusPill value={p.method} /></td>
                      <td className="px-4 py-2 font-semibold">{money(p.amount)}</td>
                      <td className="px-4 py-2"><StatusPill value={p.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          )}
        </div>

        <div className="grid gap-4 self-start">
          <Panel className="p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Client</p>
            {invoice.clientProfile ? (
              <Link href={`/profiles/${invoice.clientProfile.id}`} className="mt-1 block text-sm font-semibold text-primary hover:underline">{invoice.clientProfile.profileName}</Link>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">Not assigned</p>
            )}
            {invoice.job && (
              <>
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Job</p>
                <Link href={`/jobs/${invoice.job.id}`} className="mt-1 block text-sm font-semibold text-primary hover:underline">{invoice.job.jobName}</Link>
              </>
            )}
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Issued</p>
            <p className="mt-1 text-sm">{dateShort(invoice.issueDate)}</p>
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Due</p>
            <p className="mt-1 text-sm">{dateShort(invoice.dueDate)}</p>
          </Panel>

          <Panel className="p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Actions</p>
            <div className="grid gap-2">
              <Link href={`/invoices/${invoice.id}/edit`} className="block rounded-md border border-border px-3 py-2 text-center text-sm font-semibold hover:bg-muted">Edit invoice</Link>
              <Link href={`/api/pdf/invoice/${invoice.id}`} className="block rounded-md border border-border px-3 py-2 text-center text-sm font-semibold hover:bg-muted">
                Download PDF
              </Link>
              {collection.open && !collection.needsReview && (invoice.stripePaymentLink?.startsWith("http") ? (
                <Link href={invoice.stripePaymentLink} className="block rounded-md bg-primary px-3 py-2 text-center text-sm font-bold text-primary-foreground hover:opacity-90">
                  Pay now →
                </Link>
              ) : (
                <form action={createPaymentLink.bind(null, invoice.id)}>
                  <Button className="w-full" variant="secondary">Generate Stripe link</Button>
                </form>
              ))}
              <Link href={`/payments/new?invoiceId=${invoice.id}`} className="block rounded-md border border-border px-3 py-2 text-center text-sm font-semibold hover:bg-muted">
                Record payment
              </Link>
              {invoice.status !== "PAID" && (
                <form action={deleteInvoice.bind(null, invoice.id)}>
                  <ConfirmSubmitButton
                    message={`Permanently delete invoice ${invoice.invoiceNumber}? This cannot be undone.`}
                    className="block w-full rounded-md border border-red-200 bg-red-50 px-3 py-2 text-center text-sm font-semibold text-red-700 hover:bg-red-100"
                  >
                    Delete invoice
                  </ConfirmSubmitButton>
                </form>
              )}
              {invoice.clientProfile?.email && !collection.needsReview && invoice.status !== "VOID" && invoice.status !== "PAID" && (
                <form action={sendInvoiceEmail.bind(null, invoice.id)}>
                  <button type="submit" className="block w-full rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-center text-sm font-semibold text-primary hover:bg-primary/10">
                    ✉ Send invoice to client
                  </button>
                </form>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
