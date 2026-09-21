import { requireStaffPage } from "@/lib/staff-access";
import Link from "next/link";
import { updatePayment } from "@/app/actions";
import { EntityForm } from "@/components/entity-form";
import { PageHeader } from "@/components/page-header";
import { options, relationOptions } from "@/lib/form-options";
import { prisma } from "@/lib/prisma";

export default async function EditPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage();
  const { id } = await params;
  const [payment, invoices, profiles] = await Promise.all([
    prisma.payment.findUniqueOrThrow({ where: { id } }),
    prisma.invoice.findMany({ select: { id: true, invoiceNumber: true }, orderBy: { invoiceNumber: "asc" } }),
    prisma.profile.findMany({ select: { id: true, profileName: true }, orderBy: { profileName: "asc" } })
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
      <EntityForm
        formKey="payment"
        action={savePayment}
        submitLabel="Save payment"
        fields={[
          { name: "invoiceId", label: "Invoice", type: "select", options: relationOptions(invoices.map((i) => ({ id: i.id, label: i.invoiceNumber }))), defaultValue: payment.invoiceId },
          { name: "clientProfileId", label: "Client", type: "select", options: relationOptions(profiles.map((p) => ({ id: p.id, label: p.profileName }))), defaultValue: payment.clientProfileId ?? "" },
          { name: "amount", label: "Amount", type: "number", defaultValue: Number(payment.amount) },
          { name: "paymentDate", label: "Payment date", type: "date", defaultValue: payment.paymentDate.toISOString().slice(0, 10) },
          { name: "method", label: "Method", type: "select", options: options.paymentMethods, defaultValue: payment.method },
          { name: "status", label: "Status", type: "select", options: options.paymentStatuses, defaultValue: payment.status },
          { name: "stripePaymentIntentId", label: "Stripe payment intent", defaultValue: payment.stripePaymentIntentId ?? "" },
          { name: "notes", label: "Notes", type: "textarea", defaultValue: payment.notes ?? "" }
        ]}
      />
    </>
  );
}
