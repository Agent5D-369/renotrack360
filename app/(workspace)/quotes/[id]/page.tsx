import { requireStaffPage } from "@/lib/staff-access";
import Link from "next/link";
import { addCatalogItemToQuote, convertQuoteToJob, createEstimateFromQuote, createQuoteLineItem, createConsultationDepositInvoice } from "@/app/actions";
import { EntityForm } from "@/components/entity-form";
import { EstimateAiReview } from "@/components/estimate-ai-review";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { Button, Panel } from "@/components/ui";
import { money } from "@/lib/format";
import { options } from "@/lib/form-options";
import { prisma } from "@/lib/prisma";

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage();
  const { id } = await params;
  const [quote, catalog] = await Promise.all([
    prisma.quote.findUniqueOrThrow({
      where: { id },
      include: { clientProfile: true, property: true, lead: true, lineItems: { orderBy: { sortOrder: "asc" } } }
    }),
    prisma.costCatalogItem.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { serviceName: "asc" }] })
  ]);

  return (
    <>
      <PageHeader title={quote.quoteName} body="Quote builder with catalog pull-in, line item ranges, risk, markup, contingency, and PDF output." actionHref={`/quotes/${quote.id}/edit`} actionLabel="Edit quote" />
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-5">
          <div className="grid gap-3 md:grid-cols-4">
            <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Low</p><p className="text-2xl font-bold">{money(quote.totalLow)}</p></Panel>
            <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Target</p><p className="text-2xl font-bold">{money(quote.totalTarget)}</p></Panel>
            <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">High</p><p className="text-2xl font-bold">{money(quote.totalHigh)}</p></Panel>
            <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Final</p><p className="text-2xl font-bold">{money(quote.finalQuoteAmount ?? quote.totalTarget)}</p></Panel>
          </div>
          <Panel className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold">Line items</h3>
              <StatusPill value={quote.quoteStatus} />
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="py-2">Scope</th><th>Name</th><th>Qty</th><th>Risk</th><th>Low</th><th>Target</th><th>High</th></tr>
                </thead>
                <tbody>
                  {quote.lineItems.map((item) => (
                    <tr key={item.id} className="border-t border-border">
                      <td className="py-3">{item.scopeArea}</td>
                      <td className="font-semibold">{item.lineItemName}</td>
                      <td>{Number(item.quantity)}</td>
                      <td><StatusPill value={item.riskFactor} /></td>
                      <td>{money(item.totalLow)}</td>
                      <td>{money(item.totalTarget)}</td>
                      <td>{money(item.totalHigh)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel className="p-5">
            <h3 className="mb-4 text-lg font-bold">Add custom line item</h3>
            <EntityForm
              formKey="quoteLineItem"
              action={createQuoteLineItem}
              submitLabel="Add line item"
              columns={3}
              fields={[
                { name: "quoteId", label: "Quote", type: "hidden", defaultValue: quote.id },
                { name: "scopeArea", label: "Scope area" },
                { name: "lineItemName", label: "Line item" },
                { name: "unitType", label: "Unit", defaultValue: "each" },
                { name: "quantity", label: "Quantity", type: "number", defaultValue: 1 },
                { name: "laborLow", label: "Labor low", type: "number" },
                { name: "laborTarget", label: "Labor target", type: "number" },
                { name: "laborHigh", label: "Labor high", type: "number" },
                { name: "materialLow", label: "Material low", type: "number" },
                { name: "materialTarget", label: "Material target", type: "number" },
                { name: "materialHigh", label: "Material high", type: "number" },
                { name: "subcontractorCost", label: "Subcontractor", type: "number", defaultValue: 0 },
                { name: "markupPercent", label: "Markup %", type: "number", defaultValue: 18 },
                { name: "riskFactor", label: "Risk", type: "select", options: options.riskLevels, defaultValue: "MEDIUM" },
                { name: "clientFacingDescription", label: "Client description", type: "textarea" }
              ]}
            />
          </Panel>
        </div>
        <aside className="grid h-fit gap-5">
          <EstimateAiReview
            quoteId={quote.id}
            projectType={quote.projectType ?? undefined}
            quoteName={quote.quoteName}
            totalTarget={Number(quote.totalTarget)}
            lineItems={quote.lineItems.map((item) => ({
              id: item.id,
              lineItemName: item.lineItemName,
              scopeArea: item.scopeArea,
              quantity: Number(item.quantity),
              totalTarget: Number(item.totalTarget),
            }))}
          />
          <Panel className="p-5">
            <h3 className="font-bold">Actions</h3>
            <div className="mt-4 grid gap-2">
              <Link href={`/api/pdf/estimate/${quote.id}`} className="rounded-md border border-border px-4 py-2 text-center text-sm font-semibold hover:bg-muted">Generate estimate PDF</Link>
              <form action={createEstimateFromQuote.bind(null, quote.id)}><Button className="w-full">Create tracked estimate</Button></form>
              <form action={convertQuoteToJob.bind(null, quote.id)}><Button variant="secondary" className="w-full">Convert to job</Button></form>
              {quote.paidSiteVisit && Number(quote.consultationFee ?? 0) > 0 && (
                <form action={createConsultationDepositInvoice.bind(null, quote.id)}>
                  <Button variant="secondary" className="w-full">
                    Create consultation invoice ({money(quote.consultationFee ?? 0)})
                  </Button>
                </form>
              )}
            </div>
          </Panel>
          <Panel className="p-5">
            <h3 className="font-bold">Add from catalog</h3>
            <form action={addCatalogItemToQuote} className="mt-4 grid gap-3">
              <input type="hidden" name="quoteId" value={quote.id} />
              <select name="catalogItemId" className="h-10 rounded-md border border-border px-3 text-sm">
                {catalog.map((item) => <option key={item.id} value={item.id}>{item.category}: {item.serviceName}</option>)}
              </select>
              <input name="quantity" type="number" defaultValue={1} className="h-10 rounded-md border border-border px-3 text-sm" />
              <Button>Add catalog item</Button>
            </form>
          </Panel>
        </aside>
      </div>
    </>
  );
}
