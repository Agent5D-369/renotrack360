import { DataTable } from "@/components/data-table";
import { StatusPill } from "@/components/status-pill";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function FinancingPage() {
  const records = await prisma.financing.findMany({ include: { clientProfile: true, quote: true, job: true }, orderBy: { updatedAt: "desc" } });
  return (
    <DataTable
      title="Financing"
      actionHref="/financing/new"
      actionLabel="New financing record"
      rows={records}
      detailBasePath="/financing"
      editBasePath="/financing"
      columns={[
        { header: "Client", cell: (row) => row.clientProfile?.profileName ?? "Not assigned" },
        { header: "Desired amount", cell: (row) => money(row.desiredAmount) },
        { header: "Status", cell: (row) => <StatusPill value={row.status} /> },
        { header: "Provider", cell: (row) => row.provider ?? "Third-party provider TBD" },
        { header: "Needed", cell: (row) => (row.financingNeeded ? "Yes" : "No") }
      ]}
    />
  );
}
