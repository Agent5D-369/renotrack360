import { DataTable } from "@/components/data-table";
import { StatusPill } from "@/components/status-pill";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function PropertiesPage() {
  const properties = await prisma.property.findMany({ include: { agentProfile: true, investorProfile: true }, orderBy: { updatedAt: "desc" } });
  return (
    <DataTable
      title="Properties"
      actionHref="/properties/new"
      actionLabel="New property"
      detailBasePath="/properties"
      editBasePath="/properties"
      rows={properties}
      columns={[
        { header: "Address", cell: (row) => <span className="font-semibold">{row.propertyAddress}</span> },
        { header: "Type", cell: (row) => <StatusPill value={row.propertyType} /> },
        { header: "City", cell: (row) => `${row.city}, ${row.state}` },
        { header: "ARV", cell: (row) => money(row.estimatedARV) },
        { header: "Goal", cell: (row) => row.renovationGoal ?? "Not set" }
      ]}
    />
  );
}
