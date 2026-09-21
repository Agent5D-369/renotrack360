import { requireStaffPage } from "@/lib/staff-access";
﻿import { DataTable } from "@/components/data-table";
import { StatusPill } from "@/components/status-pill";
import { dateShort } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function ActivitiesPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireStaffPage();
  const sp = await searchParams;
  const now = new Date();
  const where = sp.due === "true" ? { dueDate: { lte: now }, completedAt: null } : {};
  const activities = await prisma.activity.findMany({ where, include: { profile: true, lead: true, job: true, quote: true }, orderBy: { dueDate: "asc" } });
  return (
    <DataTable
      title={sp.due === "true" ? "Activities - Follow-ups due" : "Activities"}
      actionHref="/activities/new"
      actionLabel="New activity"
      detailBasePath="/activities"
      rows={activities}
      columns={[
        { header: "Type", cell: (row) => <StatusPill value={row.activityType} /> },
        { header: "Subject", cell: (row) => <span className="font-semibold">{row.subject}</span> },
        { header: "Due", cell: (row) => dateShort(row.dueDate) },
        { header: "Completed", cell: (row) => dateShort(row.completedAt) },
        { header: "Related", cell: (row) => row.profile?.profileName ?? row.lead?.leadName ?? row.quote?.quoteName ?? row.job?.jobName ?? "General" }
      ]}
    />
  );
}
