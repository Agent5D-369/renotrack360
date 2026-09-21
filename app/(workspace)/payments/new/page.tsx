import { requireStaffPage } from "@/lib/staff-access";
import { createPayment } from "@/app/actions";
import { EntityForm } from "@/components/entity-form";
import { PageHeader } from "@/components/page-header";
import { options, relationOptions } from "@/lib/form-options";
import { prisma } from "@/lib/prisma";

export default async function NewPaymentPage() {
  await requireStaffPage();
  const [invoices, profiles] = await Promise.all([
    prisma.invoice.findMany({ select: { id: true, invoiceNumber: true } }),
    prisma.profile.findMany({ select: { id: true, profileName: true } })
  ]);
  return (
    <>
      <PageHeader title="New payment" body="Track Stripe, ACH, check, cash, Zelle, and other payment events." />
      <EntityForm
        formKey="payment"
        action={createPayment}
        fields={[
          { name: "invoiceId", label: "Invoice", type: "select", options: relationOptions(invoices.map((i) => ({ id: i.id, label: i.invoiceNumber }))) },
          { name: "clientProfileId", label: "Client", type: "select", options: relationOptions(profiles.map((p) => ({ id: p.id, label: p.profileName }))) },
          { name: "amount", label: "Amount", type: "number" },
          { name: "paymentDate", label: "Payment date", type: "date" },
          { name: "method", label: "Method", type: "select", options: options.paymentMethods, defaultValue: "STRIPE" },
          { name: "status", label: "Status", type: "select", options: options.paymentStatuses, defaultValue: "COMPLETED" },
          { name: "stripePaymentIntentId", label: "Stripe payment intent" },
          { name: "notes", label: "Notes", type: "textarea" }
        ]}
      />
    </>
  );
}
