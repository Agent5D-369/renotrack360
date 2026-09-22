import { requireStaffPage } from "@/lib/staff-access";
import { createWeeklyReport } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { WeeklyReportForm } from "@/components/weekly-report-form";
import { prisma } from "@/lib/prisma";
import { jobInOrganization } from "@/lib/company-scope";

export default async function NewWeeklyReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const actor = await requireStaffPage();
  const { jobId: defaultJobId = "" } = await searchParams;
  const jobs = await prisma.job.findMany({
    select: { id: true, jobName: true },
    where: jobInOrganization(actor.organizationId, { jobStatus: { notIn: ["COMPLETE", "WARRANTY_FOLLOW_UP"] } }),
    orderBy: { jobName: "asc" },
  });

  const today = new Date();
  const daysUntilSunday = today.getDay() === 0 ? 0 : 7 - today.getDay();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() + daysUntilSunday);
  const defaultWeekEnding = sunday.toISOString().slice(0, 10);

  return (
    <>
      <PageHeader
        title="Write weekly report"
        body="Client-facing update for remote owners and investors. Use AI to draft the client summary from your field notes."
      />
      <WeeklyReportForm
        jobs={jobs}
        defaultJobId={defaultJobId}
        defaultWeekEnding={defaultWeekEnding}
        action={createWeeklyReport}
      />
    </>
  );
}
