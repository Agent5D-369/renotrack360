import { DataTable } from "@/components/data-table";
import { StatusPill } from "@/components/status-pill";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function CostCatalogPage() {
  const items = await prisma.costCatalogItem.findMany({ orderBy: [{ category: "asc" }, { serviceName: "asc" }] });
  return (
    <div className="grid gap-4">
      <p className="rounded-lg border border-border bg-white p-4 text-sm text-muted-foreground shadow-soft">
        Catalog pricing is an internal planning estimate. Final pricing depends on site conditions, material selections, trade quotes, permitting, and approved scope.
      </p>
      <DataTable
        title="RenoTech Cost Catalog"
        actionHref="/cost-catalog/new"
        actionLabel="New catalog item"
        rows={items}
        detailBasePath="/cost-catalog"
        editBasePath="/cost-catalog"
        columns={[
          { header: "Category", cell: (row) => row.category },
          { header: "Service", cell: (row) => <span className="font-semibold">{row.serviceName}</span> },
          { header: "Unit", cell: (row) => row.unitType },
          { header: "Target", cell: (row) => money(row.flipsideTargetCost) },
          { header: "Risk", cell: (row) => <StatusPill value={row.riskFactor} /> }
        ]}
      />
    </div>
  );
}
