import { requireStaffPage } from "@/lib/staff-access";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function CostIntelligencePage() {
  await requireStaffPage();
  const [assemblies, marketFactors, laborRates, allowances, vendorQuotes, actualCosts] = await Promise.all([
    prisma.costAssembly.findMany({ include: { items: true }, orderBy: { assemblyName: "asc" } }),
    prisma.marketCostFactor.findMany({ orderBy: { marketName: "asc" } }),
    prisma.laborRate.findMany({ orderBy: { tradeName: "asc" } }),
    prisma.materialAllowance.findMany({ orderBy: { category: "asc" } }),
    prisma.vendorQuote.findMany({ orderBy: { quoteDate: "desc" }, take: 8 }),
    prisma.actualCost.findMany({ orderBy: { costDate: "desc" }, take: 8 })
  ]);

  return (
    <>
      <PageHeader title="Cost Intelligence" body="Homewyse-style estimating gets stronger when assemblies, market factors, vendor quotes, and actual project costs feed the catalog." />
      <Panel className="mb-5 p-4">
        <h2 className="font-semibold">Gross-margin pricing scenarios</h2>
        <p className="mt-1 text-sm text-muted-foreground">Calculate risk-adjusted direct costs at Flipside's target margin and retain the assumptions. Existing estimates and the cost records below keep their recorded values.</p>
        <Link href="/cost-intelligence/scenarios" className="mt-3 inline-block font-semibold text-primary hover:underline">Open pricing scenarios →</Link>
      </Panel>
      <div className="grid gap-4 md:grid-cols-4">
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Assemblies</p><p className="text-3xl font-bold">{assemblies.length}</p></Panel>
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Markets</p><p className="text-3xl font-bold">{marketFactors.length}</p></Panel>
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Labor rates</p><p className="text-3xl font-bold">{laborRates.length}</p></Panel>
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Allowances</p><p className="text-3xl font-bold">{allowances.length}</p></Panel>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel className="p-5">
          <h3 className="text-lg font-bold">Assemblies</h3>
          <div className="mt-4 grid gap-3">
            {assemblies.map((assembly) => (
              <div key={assembly.id} className="rounded-md border border-border p-3">
                <p className="font-semibold">{assembly.assemblyName}</p>
                <p className="text-sm text-muted-foreground">{assembly.projectType} · {assembly.items.length} catalog items · {assembly.confidenceLevel}</p>
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="p-5">
          <h3 className="text-lg font-bold">Recent actual costs</h3>
          <div className="mt-4 grid gap-3">
            {actualCosts.map((cost) => (
              <div key={cost.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{cost.description}</p>
                  <p className="font-bold">{money(cost.actualAmount)}</p>
                </div>
                <p className="text-sm text-muted-foreground">{cost.costType} · variance {money(cost.varianceAmount)}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <Panel className="mt-5 p-5">
        <h3 className="text-lg font-bold">Recent vendor quotes</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {vendorQuotes.map((quote) => (
            <div key={quote.id} className="rounded-md border border-border p-3">
              <p className="font-semibold">{quote.vendorName}</p>
              <p className="text-sm text-muted-foreground">{money(quote.quotedAmount)} · {quote.confidenceLevel}</p>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
