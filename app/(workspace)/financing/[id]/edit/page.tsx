import { requireStaffPage } from "@/lib/staff-access";
import Link from "next/link";
import { updateFinancing } from "@/app/actions";
import { EntityForm } from "@/components/entity-form";
import { PageHeader } from "@/components/page-header";
import { options, relationOptions } from "@/lib/form-options";
import { prisma } from "@/lib/prisma";

export default async function EditFinancingPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage();
  const { id } = await params;
  const [record, profiles, quotes, jobs] = await Promise.all([
    prisma.financing.findUniqueOrThrow({ where: { id } }),
    prisma.profile.findMany({ select: { id: true, profileName: true }, orderBy: { profileName: "asc" } }),
    prisma.quote.findMany({ select: { id: true, quoteName: true }, orderBy: { quoteName: "asc" } }),
    prisma.job.findMany({ select: { id: true, jobName: true }, orderBy: { jobName: "asc" } })
  ]);
  const saveFinancing = updateFinancing.bind(null, record.id);

  return (
    <>
      <PageHeader title="Edit financing record" body="Update financing status, provider, desired amount, and linked records." />
      <div className="mb-5">
        <Link href={`/financing/${id}`} className="text-sm font-semibold text-muted-foreground hover:text-foreground">
          ← Back to financing record
        </Link>
      </div>
      <EntityForm
        formKey="financing"
        action={saveFinancing}
        submitLabel="Save financing record"
        fields={[
          { name: "clientProfileId", label: "Client", type: "select", options: relationOptions(profiles.map((p) => ({ id: p.id, label: p.profileName }))), defaultValue: record.clientProfileId ?? "" },
          { name: "quoteId", label: "Quote", type: "select", options: relationOptions(quotes.map((q) => ({ id: q.id, label: q.quoteName }))), defaultValue: record.quoteId ?? "" },
          { name: "jobId", label: "Job", type: "select", options: relationOptions(jobs.map((j) => ({ id: j.id, label: j.jobName }))), defaultValue: record.jobId ?? "" },
          { name: "financingNeeded", label: "Financing needed", type: "checkbox", defaultValue: record.financingNeeded },
          { name: "desiredAmount", label: "Desired amount", type: "number", defaultValue: record.desiredAmount != null ? Number(record.desiredAmount) : 0 },
          { name: "status", label: "Status", type: "select", options: options.financingStatuses, defaultValue: record.status },
          { name: "provider", label: "Provider", defaultValue: record.provider ?? "" },
          { name: "applicationUrl", label: "Application URL", defaultValue: record.applicationUrl ?? "" },
          { name: "notes", label: "Notes", type: "textarea", defaultValue: record.notes ?? "" }
        ]}
      />
    </>
  );
}
