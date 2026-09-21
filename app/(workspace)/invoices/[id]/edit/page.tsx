import { requireStaffPage } from "@/lib/staff-access";
import Link from "next/link";
import { updateInvoice } from "@/app/actions";
import { EntityForm } from "@/components/entity-form";
import { PageHeader } from "@/components/page-header";
import { options, relationOptions } from "@/lib/form-options";
import { prisma } from "@/lib/prisma";

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage();
  const { id } = await params;
  const [invoice, jobs, profiles] = await Promise.all([
    prisma.invoice.findUniqueOrThrow({ where: { id } }),
    prisma.job.findMany({ select: { id: true, jobName: true }, orderBy: { jobName: "asc" } }),
    prisma.profile.findMany({ select: { id: true, profileName: true }, orderBy: { profileName: "asc" } })
  ]);
  const saveInvoice = updateInvoice.bind(null, invoice.id);

  return (
    <>
      <PageHeader title={`Edit: ${invoice.invoiceNumber}`} body="Update invoice details, amounts, status, and payment records." />
      <div className="mb-5">
        <Link href={`/invoices/${id}`} className="text-sm font-semibold text-muted-foreground hover:text-foreground">
          ← Back to invoice
        </Link>
      </div>
      <EntityForm
        formKey="invoice"
        action={saveInvoice}
        submitLabel="Save invoice"
        fields={[
          { name: "invoiceNumber", label: "Invoice number", defaultValue: invoice.invoiceNumber },
          { name: "jobId", label: "Job", type: "select", options: relationOptions(jobs.map((j) => ({ id: j.id, label: j.jobName }))), defaultValue: invoice.jobId ?? "" },
          { name: "clientProfileId", label: "Client", type: "select", options: relationOptions(profiles.map((p) => ({ id: p.id, label: p.profileName }))), defaultValue: invoice.clientProfileId ?? "" },
          { name: "dueDate", label: "Due date", type: "date", defaultValue: invoice.dueDate?.toISOString().slice(0, 10) ?? "" },
          { name: "subtotal", label: "Subtotal", type: "number", defaultValue: Number(invoice.subtotal) },
          { name: "tax", label: "Tax", type: "number", defaultValue: Number(invoice.tax) },
          { name: "total", label: "Total", type: "number", defaultValue: Number(invoice.total) },
          { name: "amountPaid", label: "Amount paid", type: "number", defaultValue: Number(invoice.amountPaid) },
          { name: "status", label: "Status", type: "select", options: options.invoiceStatuses, defaultValue: invoice.status },
          { name: "notes", label: "Notes", type: "textarea", defaultValue: invoice.notes ?? "" }
        ]}
      />
    </>
  );
}
