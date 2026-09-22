import { requireStaffPage } from "@/lib/staff-access";
import { createPayment } from "@/app/actions";
import { PaymentForm } from "@/components/payment-form";
import { PageHeader } from "@/components/page-header";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { flipsideInvoiceWhere, flipsidePaymentWhere } from "@/lib/financial-record-scope";

export default async function NewPaymentPage() {
  await requireStaffPage();
  const [invoices, profiles] = await Promise.all([
    prisma.invoice.findMany({ where: flipsideInvoiceWhere, select: { id: true, invoiceNumber: true } }),
    prisma.profile.findMany({ where: { organizationId: DEFAULT_ORG_ID }, select: { id: true, profileName: true } })
  ]);
  return (
    <>
      <PageHeader title="New payment" body="Track Stripe, ACH, check, cash, Zelle, and other payment events." />
      <PaymentForm action={createPayment} invoices={invoices} profiles={profiles} />
    </>
  );
}
