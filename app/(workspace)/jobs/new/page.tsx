import { requireStaffPage } from "@/lib/staff-access";
import { createJob } from "@/app/actions";
import { EntityForm } from "@/components/entity-form";
import { PageHeader } from "@/components/page-header";
import { options, relationOptions } from "@/lib/form-options";
import { prisma } from "@/lib/prisma";

export default async function NewJobPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  await requireStaffPage();
  const { returnTo } = await searchParams;
  const [profiles, properties, quotes] = await Promise.all([
    prisma.profile.findMany({ select: { id: true, profileName: true } }),
    prisma.property.findMany({ select: { id: true, propertyAddress: true } }),
    prisma.quote.findMany({ select: { id: true, quoteName: true } })
  ]);
  return (
    <>
      {returnTo && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-sm font-semibold text-primary">You came from a guide step. After saving, click below to continue.</p>
          <a href={returnTo} className="shrink-0 text-sm font-bold text-primary hover:underline">← Back to guide</a>
        </div>
      )}
      <PageHeader title="New job" body="Creating a job automatically adds the RenoTrack360 construction order of operations." />
      <EntityForm
        formKey="job"
        action={createJob}
        fields={[
          ...(returnTo ? [{ name: "returnTo", type: "hidden" as const, defaultValue: returnTo, label: "" }] : []),
          { name: "jobName", label: "Job name" },
          { name: "clientProfileId", label: "Client", type: "select", options: relationOptions(profiles.map((p) => ({ id: p.id, label: p.profileName }))) },
          { name: "propertyId", label: "Property", type: "select", options: relationOptions(properties.map((p) => ({ id: p.id, label: p.propertyAddress }))) },
          { name: "approvedQuoteId", label: "Approved quote", type: "select", options: relationOptions(quotes.map((q) => ({ id: q.id, label: q.quoteName }))) },
          { name: "jobStatus", label: "Status", type: "select", options: options.jobStatuses, defaultValue: "PRE_CONSTRUCTION" },
          { name: "startDate", label: "Start date", type: "date" },
          { name: "targetCompletion", label: "Target completion", type: "date" },
          { name: "contractAmount", label: "Contract amount", type: "number", defaultValue: 0 },
          { name: "amountPaid", label: "Amount paid", type: "number", defaultValue: 0 },
          { name: "activePhase", label: "Active phase" },
          { name: "weeklyReportDue", label: "Weekly report due", type: "date" },
          { name: "permitStatus", label: "Permit status" },
          { name: "riskLevel", label: "Risk level", type: "select", options: options.riskLevels, defaultValue: "MEDIUM" },
          { name: "notes", label: "Notes", type: "textarea" }
        ]}
      />
    </>
  );
}
