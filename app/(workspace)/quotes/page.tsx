import { requireStaffPage } from "@/lib/staff-access";
import { DataTable } from "@/components/data-table";
import { LinkButton } from "@/components/ui";
import { StatusPill } from "@/components/status-pill";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function QuotesPage() {
  await requireStaffPage();
  const quotes = await prisma.quote.findMany({ include: { clientProfile: true, property: true }, orderBy: { updatedAt: "desc" } });
  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-white p-4 shadow-soft md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Quote Wizard</p>
          <h2 className="text-xl font-bold">Walk the property without missing scope</h2>
          <p className="mt-1 text-sm text-muted-foreground">Use the mobile wizard on site, then refine catalog pricing before sending the client estimate.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <LinkButton href="/quotes/field-wizard">Quote Wizard</LinkButton>
          <LinkButton href="/quotes/new" variant="secondary">Basic quote</LinkButton>
        </div>
      </div>
      <DataTable
        title="Quotes"
        detailBasePath="/quotes"
        editBasePath="/quotes"
        rows={quotes}
        columns={[
          { header: "Quote", cell: (row) => <span className="font-semibold">{row.quoteName}</span> },
          { header: "Client", cell: (row) => row.clientProfile?.profileName ?? "Not assigned" },
          { header: "Status", cell: (row) => <StatusPill value={row.quoteStatus} /> },
          { header: "Target", cell: (row) => money(row.totalTarget) },
          { header: "Final", cell: (row) => money(row.finalQuoteAmount ?? row.totalTarget) }
        ]}
      />
    </div>
  );
}
