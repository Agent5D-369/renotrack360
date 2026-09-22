import { requireStaffPage } from "@/lib/staff-access";
import { createPayment } from "@/app/actions";
import { PaymentForm } from "@/components/payment-form";
import { PageHeader } from "@/components/page-header";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { flipsideInvoiceWhere } from "@/lib/financial-record-scope";
import Link from "next/link";

export default async function NewPaymentPage({ searchParams }: { searchParams: Promise<{ invoiceId?: string }> }) {
  await requireStaffPage();
  const [invoices, profiles] = await Promise.all([
    prisma.invoice.findMany({ where: flipsideInvoiceWhere, select: { id: true, invoiceNumber: true } }),
    prisma.profile.findMany({ where: { organizationId: DEFAULT_ORG_ID }, select: { id: true, profileName: true } })
  ]);
  const query = await searchParams;
  const selected = invoices.find(invoice => invoice.id === query.invoiceId);
  return (
    <>
      <PageHeader title="New payment" body="Track Stripe, ACH, check, cash, Zelle, and other payment events." />
      {selected && <p className="mb-4 text-sm">Recording a receipt for <Link href={`/invoices/${selected.id}`} className="font-semibold text-primary underline">{selected.invoiceNumber}</Link>. Enter the amount and date from the actual receipt.</p>}
      <PaymentForm action={createPayment} invoices={invoices} profiles={profiles} initialInvoiceId={selected?.id} />
    </>
  );
}
