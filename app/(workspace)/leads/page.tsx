import { requireStaffPage } from "@/lib/staff-access";
﻿import Link from "next/link";
import { DataTable } from "@/components/data-table";
import { StatusPill } from "@/components/status-pill";
import { leadPriorityScore } from "@/lib/calculations";
import { dateShort, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { leadInOrganization } from "@/lib/company-scope";

const STAGE_COLORS: Record<string, string> = {
  NEW_LEAD: "bg-blue-50 border-blue-200 text-blue-800",
  QUALIFIED: "bg-sky-50 border-sky-200 text-sky-800",
  PROPOSAL: "bg-violet-50 border-violet-200 text-violet-800",
  CONVERTED: "bg-amber-50 border-amber-200 text-amber-800",
  WON: "bg-emerald-50 border-emerald-200 text-emerald-800",
  LOST: "bg-muted border-border text-muted-foreground"
};

export default async function LeadsPage() {
  const actor = await requireStaffPage();
  const [leads, stages] = await Promise.all([
    prisma.lead.findMany({
      where: leadInOrganization(actor.organizationId, { deletedAt: null }),
      include: { profile: true, property: true, owner: true },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.lead.groupBy({ by: ["status"], _count: true, where: leadInOrganization(actor.organizationId, { deletedAt: null }) })
  ]);

  const stageOrder = ["NEW_LEAD", "QUALIFIED", "PROPOSAL", "CONVERTED", "WON", "LOST"];
  const sortedStages = [...stages].sort((a, b) => stageOrder.indexOf(a.status) - stageOrder.indexOf(b.status));

  return (
    <div className="grid gap-5">
      {/* Stage pipeline cards */}
      <div className="overflow-x-auto rounded-lg border border-border bg-white p-4 shadow-soft">
        <div className="flex gap-3">
          {sortedStages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leads yet - add your first lead to populate the pipeline.</p>
          ) : (
            sortedStages.map((stage) => (
              <Link
                key={stage.status}
                href={`/leads?status=${stage.status}`}
                className={[
                  "flex min-w-32 flex-col rounded-md border p-3 transition hover:-translate-y-0.5",
                  STAGE_COLORS[stage.status] ?? "bg-muted border-border"
                ].join(" ")}
              >
                <p className="text-xs font-bold uppercase tracking-wide opacity-70">
                  {stage.status.replaceAll("_", " ")}
                </p>
                <p className="mt-1 text-2xl font-bold">{stage._count}</p>
              </Link>
            ))
          )}
        </div>
      </div>

      <DataTable
        title="Leads"
        actionHref="/leads/new"
        actionLabel="New lead"
        detailBasePath="/leads"
        editBasePath="/leads"
        rows={leads}
        emptyTitle="No leads yet"
        emptyBody="Start capturing renovation opportunities. Every lead you add goes into your pipeline so you never lose track of a conversation."
        emptyActionHref="/leads/new"
        emptyActionLabel="Add first lead"
        columns={[
          { header: "Lead", cell: (row) => <span className="font-semibold">{row.leadName}</span> },
          { header: "Stage", cell: (row) => <StatusPill value={row.status} /> },
          { header: "Owner", cell: (row) => row.owner?.name ?? row.owner?.email ?? <span className="text-muted-foreground">Unassigned</span> },
          { header: "Type", cell: (row) => row.leadType ?? <span className="text-muted-foreground">Not set</span> },
          { header: "Budget", cell: (row) => money(row.estimatedBudget) },
          { header: "Priority", cell: (row) => leadPriorityScore({ ...row, estimatedBudget: Number(row.estimatedBudget ?? 0) }) },
          { header: "Follow-up", cell: (row) => dateShort(row.followUpDate) }
        ]}
      />
    </div>
  );
}
