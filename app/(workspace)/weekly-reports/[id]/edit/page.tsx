import { requireStaffPage } from "@/lib/staff-access";
import Link from "next/link";
import { updateWeeklyReport } from "@/app/actions";
import { WeeklyReportForm } from "@/components/weekly-report-form";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { jobInOrganization, weeklyReportInOrganization } from "@/lib/company-scope";
import { notFound } from "next/navigation";

export default async function EditWeeklyReportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const actor = await requireStaffPage();
  const { id } = await params;
  const { error } = await searchParams;
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
      {error && <p role="alert" className="mb-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm">{error}</p>}
      <WeeklyReportForm
        canRememberCompany={actor.role === "OWNER"}
        jobs={jobs.filter(job => job.id === report.jobId)}
        defaultJobId={report.jobId}
        defaultWeekEnding={report.weekEnding.toISOString().slice(0, 10)}
        action={saveReport}
        defaultValues={{
          workCompleted: report.workCompleted, clientSummary: report.clientSummary ?? "",
          nextWeekPlan: report.nextWeekPlan ?? "", issuesFound: report.issuesFound ?? "",
          decisionsNeeded: report.decisionsNeeded ?? "", budgetNotes: report.budgetNotes ?? "",
          scheduleNotes: report.scheduleNotes ?? "", internalNotes: report.internalNotes ?? "",
        }}
      />
    </>
  );
}
