import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { LinkButton, Panel } from "@/components/ui";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function CostCatalogItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await prisma.costCatalogItem.findUniqueOrThrow({ where: { id } });

  return (
    <>
      <PageHeader title={item.serviceName} body={`${item.category} · ${item.unitType}`} />
      <div className="mb-4 flex items-center gap-3">
        <Link href="/cost-catalog" className="text-sm font-semibold text-muted-foreground hover:text-foreground">← Cost catalog</Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
        <div className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Panel className="p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Low estimate</p>
              <p className="mt-2 text-2xl font-bold">{money(item.flipsideLowCost)}</p>
            </Panel>
            <Panel className="p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Target estimate</p>
              <p className="mt-2 text-2xl font-bold">{money(item.flipsideTargetCost)}</p>
            </Panel>
            <Panel className="p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">High estimate</p>
              <p className="mt-2 text-2xl font-bold">{money(item.flipsideHighCost)}</p>
            </Panel>
          </div>

          {item.laborAssumptions && (
            <Panel className="p-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Labor assumptions</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{item.laborAssumptions}</p>
            </Panel>
          )}

          {item.materialAssumptions && (
            <Panel className="p-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Material assumptions</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{item.materialAssumptions}</p>
            </Panel>
          )}

          {item.austinNotes && (
            <Panel className="p-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Market notes</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{item.austinNotes}</p>
            </Panel>
          )}

          {item.internalPricingNotes && (
            <Panel className="p-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Internal pricing notes</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{item.internalPricingNotes}</p>
            </Panel>
          )}
        </div>

        <div className="grid gap-4 self-start">
          <Panel className="p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Category</p>
            <p className="mt-1 font-semibold">{item.category}</p>
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Unit type</p>
            <p className="mt-1 text-sm">{item.unitType}</p>
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Risk factor</p>
            <div className="mt-1"><StatusPill value={item.riskFactor} /></div>
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Default markup</p>
            <p className="mt-1 text-sm">{String(item.markup)}%</p>
            {item.typicalQuantityRange && (
              <>
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Typical quantity</p>
                <p className="mt-1 text-sm">{item.typicalQuantityRange}</p>
              </>
            )}
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Licensed trade required</p>
            <p className="mt-1 text-sm">{item.licensedTradeRequired ? "Yes" : "No"}</p>
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Status</p>
            <p className="mt-1 text-sm">{item.active ? "Active" : "Inactive"}</p>
          </Panel>

          {item.permitTrigger && (
            <Panel className="border-amber-200 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Permit trigger</p>
              <p className="mt-1 text-sm">{item.permitTrigger}</p>
            </Panel>
          )}

          <Panel className="p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Actions</p>
            <div className="grid gap-2">
              <LinkButton href={`/cost-catalog/${item.id}/edit`}>Edit item</LinkButton>
              <LinkButton href="/cost-catalog/new" variant="secondary">New catalog item</LinkButton>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
