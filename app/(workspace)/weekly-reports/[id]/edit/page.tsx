import { requireStaffPage } from "@/lib/staff-access";
import Link from "next/link";
import { updateWeeklyReport } from "@/app/actions";
import { EntityForm } from "@/components/entity-form";
import { PageHeader } from "@/components/page-header";
import { relationOptions } from "@/lib/form-options";
import { prisma } from "@/lib/prisma";
import { jobInOrganization, weeklyReportInOrganization } from "@/lib/company-scope";
import { notFound } from "next/navigation";

export default async function EditWeeklyReportPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireStaffPage();
  const { id } = await params;
  const [report, jobs] = await Promise.all([
    prisma.weeklyReport.findFirst({ where: weeklyReportInOrganization(actor.organizationId, { id }) }),
    prisma.job.findMany({ where: jobInOrganization(actor.organizationId), select: { id: true, jobName: true }, orderBy: { jobName: "asc" } })
  ]);
  if (!report) notFound();
  const saveReport = updateWeeklyReport.bind(null, report.id);

  return (
    <>
      <PageHeader title="Edit weekly report" body="Update field notes, client summary, issues, decisions needed, and budget or schedule notes." />
      <div className="mb-5 flex items-center gap-3">
        <Link href={`/weekly-reports/${id}`} className="text-sm font-semibold text-muted-foreground hover:text-foreground">
          ← Back to report
        </Link>
        {report.jobId && (
          <>
            <span className="text-muted-foreground">·</span>
            <Link href={`/jobs/${report.jobId}`} className="text-sm font-semibold text-muted-foreground hover:text-foreground">
              View job
            </Link>
          </>
        )}
      </div>
      <EntityForm
        formKey="weeklyReport"
        action={saveReport}
        submitLabel="Save report"
        columns={1}
        fields={[
          { name: "jobId", label: "Job", type: "select", options: relationOptions(jobs.map((j) => ({ id: j.id, label: j.jobName }))), defaultValue: report.jobId },
          { name: "weekEnding", label: "Week ending", type: "date", defaultValue: report.weekEnding.toISOString().slice(0, 10) },
          { name: "workCompleted", label: "Work completed this week", type: "textarea", defaultValue: report.workCompleted },
          { name: "clientSummary", label: "Client summary (shown on PDF)", type: "textarea", defaultValue: report.clientSummary ?? "" },
          { name: "nextWeekPlan", label: "Next week plan", type: "textarea", defaultValue: report.nextWeekPlan ?? "" },
          { name: "issuesFound", label: "Issues found", type: "textarea", defaultValue: report.issuesFound ?? "" },
          { name: "decisionsNeeded", label: "Decisions needed", type: "textarea", defaultValue: report.decisionsNeeded ?? "" },
          { name: "budgetNotes", label: "Budget notes", type: "textarea", defaultValue: report.budgetNotes ?? "" },
          { name: "scheduleNotes", label: "Schedule notes", type: "textarea", defaultValue: report.scheduleNotes ?? "" },
          { name: "internalNotes", label: "Internal notes", type: "textarea", defaultValue: report.internalNotes ?? "" }
        ]}
      />
    </>
  );
}
