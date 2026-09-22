import { requireStaffPage } from "@/lib/staff-access";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { flipsideInvoiceWhere, flipsidePaymentWhere } from "@/lib/financial-record-scope";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { money } from "@/lib/format";

export default async function PaymentReconciliationPage() {
  await requireStaffPage();
  const [invoices, jobs] = await Promise.all([
    prisma.invoice.findMany({ where: flipsideInvoiceWhere, include: { payments: true }, orderBy: { invoiceNumber: "asc" } }),
    prisma.job.findMany({ where: { organizationId: DEFAULT_ORG_ID }, include: { invoices: { include: { payments: true } } }, orderBy: { jobName: "asc" } }),
  ]);
  const sum = (payments: Array<{ status: string; amount: Prisma.Decimal }>) => payments.filter(item => item.status === "COMPLETED").reduce((total, item) => total.plus(item.amount), new Prisma.Decimal(0));
  return <>
    <PageHeader title="Payment reconciliation" body="Compare retained amounts with completed receipt records before resolving a difference." />
    <Link href="/payments" className="mb-4 inline-block text-sm font-semibold text-primary">← Payments</Link>
    <Panel className="mb-5 p-5"><h2 className="font-semibold">Review receipt evidence first</h2><p className="mt-2 text-sm">This page performs no writes. A difference may mean missing receipts, an incorrect allocation or a historical manual amount. Do not assume either number is correct without the underlying evidence. Pending, failed and fully refunded payments do not count as completed receipts.</p><p className="mt-2 text-sm">Invoice payment changes stop if that invoice is already inconsistent. Job-level amounts are preserved for explicit reconciliation; they are not certified by these invoice totals.</p></Panel>
    <Panel className="mb-5 overflow-x-auto p-5"><h2 className="mb-3 font-semibold">Invoice checks</h2><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Invoice</th><th className="p-2">Recorded paid</th><th className="p-2">Completed receipts</th><th className="p-2">Balance check</th></tr></thead><tbody>{invoices.map(invoice => { const paid = sum(invoice.payments), matches = paid.eq(invoice.amountPaid) && invoice.total.minus(paid).eq(invoice.balanceDue); return <tr key={invoice.id} className="border-t border-border"><td className="p-2"><Link className="text-primary underline" href={`/invoices/${invoice.id}`}>{invoice.invoiceNumber}</Link></td><td className="p-2">{money(invoice.amountPaid)}</td><td className="p-2">{money(paid)}</td><td className="p-2">{matches ? "Matches receipt records" : "Needs receipt review"}</td></tr>; })}</tbody></table></Panel>
    <Panel className="overflow-x-auto p-5"><h2 className="mb-3 font-semibold">Job checks</h2><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Job</th><th className="p-2">Recorded paid</th><th className="p-2">Linked completed receipts</th><th className="p-2">Review</th></tr></thead><tbody>{jobs.map(job => { const paid = sum(job.invoices.flatMap(invoice => invoice.payments)); return <tr key={job.id} className="border-t border-border"><td className="p-2"><Link className="text-primary underline" href={`/jobs/${job.id}`}>{job.jobName}</Link></td><td className="p-2">{money(job.amountPaid)}</td><td className="p-2">{money(paid)}</td><td className="p-2">{paid.eq(job.amountPaid) ? "Matches linked receipt records" : "Historical difference: review required"}</td></tr>; })}</tbody></table></Panel>
  </>;
}
