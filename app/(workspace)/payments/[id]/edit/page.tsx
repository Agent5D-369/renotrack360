import { requireStaffPage } from "@/lib/staff-access";
import Link from "next/link";
import { updatePayment } from "@/app/actions";
import { PaymentForm } from "@/components/payment-form";
import { PageHeader } from "@/components/page-header";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { flipsideInvoiceWhere, flipsidePaymentWhere } from "@/lib/financial-record-scope";

export default async function EditPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage();
  const { id } = await params;
  const [payment, invoices, profiles] = await Promise.all([
    prisma.payment.findFirstOrThrow({ where: { id, ...flipsidePaymentWhere } }),
    prisma.invoice.findMany({ where: flipsideInvoiceWhere, select: { id: true, invoiceNumber: true }, orderBy: { invoiceNumber: "asc" } }),
    prisma.profile.findMany({ where: { organizationId: DEFAULT_ORG_ID }, select: { id: true, profileName: true }, orderBy: { profileName: "asc" } })
  ]);
  const savePayment = updatePayment.bind(null, payment.id);

  const backHref = payment.invoiceId ? `/invoices/${payment.invoiceId}` : "/payments";
  const backLabel = payment.invoiceId ? "← Back to invoice" : "← All payments";

  return (
    <>
      <PageHeader title={`Edit payment`} body="Update payment details, method, status, and reference information." />
      <div className="mb-5">
        <Link href={backHref} className="text-sm font-semibold text-muted-foreground hover:text-foreground">
          {backLabel}
        </Link>
      </div>
      <PaymentForm action={savePayment} payment={payment} invoices={invoices} profiles={profiles} />
    </>
  );
}
