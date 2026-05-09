import { createInvoice } from "@/app/actions";
import { EntityForm } from "@/components/entity-form";
import { PageHeader } from "@/components/page-header";
import { options, relationOptions } from "@/lib/form-options";
import { prisma } from "@/lib/prisma";

export default async function NewInvoicePage() {
  const [jobs, profiles] = await Promise.all([
    prisma.job.findMany({ select: { id: true, jobName: true } }),
    prisma.profile.findMany({ select: { id: true, profileName: true } })
  ]);
  return (
    <>
      <PageHeader title="New invoice" body="Create deposit, progress, final, or custom invoices and attach Stripe links when configured." />
      <EntityForm
        formKey="invoice"
        action={createInvoice}
        fields={[
          { name: "invoiceNumber", label: "Invoice number" },
          { name: "jobId", label: "Job", type: "select", options: relationOptions(jobs.map((j) => ({ id: j.id, label: j.jobName }))) },
          { name: "clientProfileId", label: "Client", type: "select", options: relationOptions(profiles.map((p) => ({ id: p.id, label: p.profileName }))) },
          { name: "dueDate", label: "Due date", type: "date" },
          { name: "subtotal", label: "Subtotal", type: "number", defaultValue: 0 },
          { name: "tax", label: "Tax", type: "number", defaultValue: 0 },
          { name: "total", label: "Total", type: "number", defaultValue: 0 },
          { name: "amountPaid", label: "Amount paid", type: "number", defaultValue: 0 },
          { name: "status", label: "Status", type: "select", options: options.invoiceStatuses, defaultValue: "DRAFT" },
          { name: "notes", label: "Notes", type: "textarea" }
        ]}
      />
    </>
  );
}
