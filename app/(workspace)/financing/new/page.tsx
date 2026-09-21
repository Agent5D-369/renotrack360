import { requireStaffPage } from "@/lib/staff-access";
import { createFinancing } from "@/app/actions";
import { EntityForm } from "@/components/entity-form";
import { PageHeader } from "@/components/page-header";
import { options, relationOptions } from "@/lib/form-options";
import { prisma } from "@/lib/prisma";

export default async function NewFinancingPage() {
  await requireStaffPage();
  const [profiles, quotes, jobs] = await Promise.all([
    prisma.profile.findMany({ select: { id: true, profileName: true } }),
    prisma.quote.findMany({ select: { id: true, quoteName: true } }),
    prisma.job.findMany({ select: { id: true, jobName: true } })
  ]);
  return (
    <>
      <PageHeader title="New financing record" body="Financing is tracked only. Lending decisions and applications are handled by third-party providers." />
      <EntityForm
        formKey="financing"
        action={createFinancing}
        fields={[
          { name: "clientProfileId", label: "Client", type: "select", options: relationOptions(profiles.map((p) => ({ id: p.id, label: p.profileName }))) },
          { name: "quoteId", label: "Quote", type: "select", options: relationOptions(quotes.map((q) => ({ id: q.id, label: q.quoteName }))) },
          { name: "jobId", label: "Job", type: "select", options: relationOptions(jobs.map((j) => ({ id: j.id, label: j.jobName }))) },
          { name: "financingNeeded", label: "Financing needed", type: "checkbox" },
          { name: "desiredAmount", label: "Desired amount", type: "number" },
          { name: "status", label: "Status", type: "select", options: options.financingStatuses, defaultValue: "DISCUSSED" },
          { name: "provider", label: "Provider" },
          { name: "applicationUrl", label: "Application URL" },
          { name: "notes", label: "Notes", type: "textarea" }
        ]}
      />
    </>
  );
}
