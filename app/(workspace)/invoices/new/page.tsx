import { requireStaffPage } from "@/lib/staff-access";
import { createInvoice } from "@/app/actions";
import { EntityForm } from "@/components/entity-form";
import { PageHeader } from "@/components/page-header";
import { options, relationOptions } from "@/lib/form-options";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { flipsideInvoiceWhere } from "@/lib/financial-record-scope";

export default async function NewInvoicePage() {
  await requireStaffPage();
  const [jobs, profiles] = await Promise.all([
    prisma.job.findMany({ where: { organizationId: DEFAULT_ORG_ID }, select: { id: true, jobName: true } }),
    prisma.profile.findMany({ where: { organizationId: DEFAULT_ORG_ID }, select: { id: true, profileName: true } })
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
          { name: "status", label: "Status", type: "select", options: options.invoiceStatuses, defaultValue: "DRAFT" },
          { name: "notes", label: "Notes", type: "textarea" }
        ]}
      />
    </>
  );
}
