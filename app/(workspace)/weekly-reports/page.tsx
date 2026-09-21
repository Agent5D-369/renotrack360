import { requireStaffPage } from "@/lib/staff-access";
import Link from "next/link";
import { DataTable } from "@/components/data-table";
import { dateShort } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function WeeklyReportsPage() {
  await requireStaffPage();
  const reports = await prisma.weeklyReport.findMany({ include: { job: true }, orderBy: { weekEnding: "desc" } });
  return (
    <DataTable
      title="Weekly Reports"
      actionHref="/weekly-reports/new"
      actionLabel="New report"
      rows={reports}
      detailBasePath="/weekly-reports"
      editBasePath="/weekly-reports"
      columns={[
        { header: "Job", cell: (row) => row.job.jobName },
        { header: "Week ending", cell: (row) => dateShort(row.weekEnding) },
        { header: "Client summary", cell: (row) => row.clientSummary ?? row.workCompleted.slice(0, 80) },
        { header: "PDF", cell: (row) => <Link className="font-semibold text-primary" href={`/api/pdf/weekly-report/${row.id}`}>Generate</Link> }
      ]}
    />
  );
}
