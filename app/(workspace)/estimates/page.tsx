import Link from "next/link";
import { DataTable } from "@/components/data-table";
import { StatusPill } from "@/components/status-pill";
import { dateShort, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function EstimatesPage() {
  const estimates = await prisma.estimate.findMany({
    include: { clientProfile: true, property: true, followUps: { orderBy: { dueDate: "asc" } } },
    orderBy: { updatedAt: "desc" }
  });

  return (
    <DataTable
      title="Estimates"
      actionHref="/quotes/field-wizard"
      actionLabel="New estimate"
      detailBasePath="/estimates"
      editBasePath="/estimates"
      rows={estimates}
      emptyTitle="No estimates yet"
      emptyBody="Use the mobile wizard to capture scope from your next job site, then send a professional estimate in minutes."
      emptyActionHref="/quotes/field-wizard"
      emptyActionLabel="Start first estimate"
      columns={[
        { header: "Estimate", cell: (row) => <span className="font-semibold">{row.estimateNumber}</span> },
        { header: "Client", cell: (row) => row.clientProfile?.profileName ?? <span className="text-muted-foreground">Not assigned</span> },
        { header: "Status", cell: (row) => <StatusPill value={row.status} /> },
        { header: "Total", cell: (row) => <span className="font-semibold">{money(row.total)}</span> },
        { header: "Confidence", cell: (row) => `${row.confidenceScore}/100` },
        { header: "Next follow-up", cell: (row) => dateShort(row.nextFollowUpDue ?? row.followUps[0]?.dueDate) },
        {
          header: "PDF",
          cell: (row) => (
            <Link className="font-semibold text-primary hover:underline" href={`/api/pdf/estimate/${row.quoteId}`}>
              Export
            </Link>
          )
        }
      ]}
    />
  );
}
