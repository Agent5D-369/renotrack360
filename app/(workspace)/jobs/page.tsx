import { requireStaffPage } from "@/lib/staff-access";
﻿import Link from "next/link";
import { DataTable } from "@/components/data-table";
import { StatusPill } from "@/components/status-pill";
import { dateShort, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function JobsPage() {
  await requireStaffPage();
  const now = new Date();
  const jobs = await prisma.job.findMany({
    include: { clientProfile: true, property: true },
    orderBy: { updatedAt: "desc" }
  });

  return (
    <DataTable
      title="Jobs"
      actionHref="/jobs/new"
      actionLabel="New job"
      detailBasePath="/jobs"
      editBasePath="/jobs"
      rows={jobs}
      emptyTitle="No jobs yet"
      emptyBody="Jobs are created when you win an estimate. Convert an approved estimate to start your first job, or create one manually."
      emptyActionHref="/jobs/new"
      emptyActionLabel="Create a job"
      columns={[
        { header: "Job", cell: (row) => <span className="font-semibold">{row.jobName}</span> },
        { header: "Client", cell: (row) => row.clientProfile?.profileName ?? <span className="text-muted-foreground">Not assigned</span> },
        { header: "Phase", cell: (row) => <span className="text-sm">{row.activePhase ?? row.jobStatus.replaceAll("_", " ")}</span> },
        { header: "Status", cell: (row) => <StatusPill value={row.jobStatus} /> },
        { header: "Balance", cell: (row) => <span className="font-semibold">{money(row.balanceDue)}</span> },
        {
          header: "Report due",
          cell: (row) => {
            if (!row.weeklyReportDue) return <span className="text-muted-foreground">-</span>;
            const overdue = new Date(row.weeklyReportDue) < now && !["COMPLETE", "WARRANTY_FOLLOW_UP"].includes(row.jobStatus);
            return (
              <span className={overdue ? "font-semibold text-red-600" : "text-muted-foreground"}>
                {overdue ? "⚠ " : ""}{dateShort(row.weeklyReportDue)}
              </span>
            );
          }
        },
        {
          header: "Report",
          cell: (row) => (
            <Link
              href={`/weekly-reports/new?jobId=${row.id}`}
              className="rounded border border-primary/30 bg-primary/5 px-2 py-1 text-xs font-bold text-primary hover:bg-primary/10"
            >
              Write
            </Link>
          )
        }
      ]}
    />
  );
}
