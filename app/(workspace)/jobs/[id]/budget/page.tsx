import { requireStaffPage } from "@/lib/staff-access";
﻿import { createBudgetLine, logActualCost } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { BudgetLineType } from "@prisma/client";
import { titleFromEnum } from "@/lib/format";
import { jobInOrganization } from "@/lib/company-scope";
import { notFound } from "next/navigation";

const LINE_TYPE_COLORS: Record<string, string> = {
  LABOR: "bg-blue-100 text-blue-800",
  MATERIAL: "bg-amber-100 text-amber-800",
  SUBCONTRACTOR: "bg-purple-100 text-purple-800",
  EQUIPMENT: "bg-slate-100 text-slate-800",
  PERMIT: "bg-red-100 text-red-800",
  REIMBURSEMENT: "bg-green-100 text-green-800",
  OVERHEAD: "bg-orange-100 text-orange-800",
  CONTINGENCY: "bg-gray-100 text-gray-800"
};

export default async function JobBudgetPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireStaffPage();
  const { id } = await params;
  const job = await prisma.job.findFirst({
    where: jobInOrganization(actor.organizationId, { id }),
    select: {
      id: true,
      jobName: true,
      contractAmount: true,
      budgetLines: { where: { job: jobInOrganization(actor.organizationId) }, orderBy: [{ lineType: "asc" }, { category: "asc" }] },
      actualCosts: { where: { job: jobInOrganization(actor.organizationId) }, orderBy: { costDate: "desc" } }
    }
  });
  if (!job) notFound();

  const contract = Number(job.contractAmount);
  const totalEstimated = job.budgetLines.reduce((s, l) => s + Number(l.estimatedAmount), 0);
  const totalActual = job.actualCosts.reduce((s, c) => s + Number(c.actualAmount), 0);
  const totalCommitted = job.budgetLines.reduce((s, l) => s + Number(l.committedAmount), 0);
  const budgetVariance = totalEstimated - totalActual;
  const projectedMargin = contract - totalEstimated;
  const projectedMarginPct = contract > 0 ? (projectedMargin / contract) * 100 : 0;
  const actualMargin = contract - totalActual;
  const actualMarginPct = contract > 0 ? (actualMargin / contract) * 100 : 0;

  // Group budget lines by type
  const byType = Object.values(BudgetLineType).reduce<Record<string, typeof job.budgetLines>>(
    (acc, type) => {
      const lines = job.budgetLines.filter((l) => l.lineType === type);
      if (lines.length) acc[type] = lines;
      return acc;
    },
    {}
  );

  const varianceColor = (v: number) =>
    v >= 0 ? "text-emerald-600 font-bold" : "text-red-600 font-bold";

  return (
    <>
      <PageHeader
        title={`${job.jobName} - Budget`}
        body="Estimated cost vs. actual spend. Track margin in real time as costs are logged."
        actionHref={`/jobs/${id}`}
        actionLabel="← Back to job"
      />

      {/* Margin health alert */}
      {totalActual > contract && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-3.5 text-sm font-semibold text-red-800">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
          Actual costs ({money(totalActual)}) have exceeded the contract amount ({money(contract)}). This job is currently losing money.
        </div>
      )}
      {totalActual > totalEstimated && totalActual <= contract && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3.5 text-sm font-semibold text-amber-800">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400" />
          Actual spend ({money(totalActual)}) is tracking above the estimate ({money(totalEstimated)}). Projected margin is shrinking - review costs now.
        </div>
      )}
      {totalEstimated > 0 && projectedMarginPct < 10 && totalActual <= totalEstimated && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3.5 text-sm font-semibold text-amber-800">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400" />
          Projected margin is {projectedMarginPct.toFixed(1)}% - below the 10% healthy threshold. Review scope and change orders.
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Panel className="p-4">
          <p className="text-xs font-bold uppercase text-muted-foreground">Contract amount</p>
          <p className="mt-1 text-2xl font-bold">{money(contract)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Approved + change orders</p>
        </Panel>
        <Panel className="p-4">
          <p className="text-xs font-bold uppercase text-muted-foreground">Estimated cost</p>
          <p className="mt-1 text-2xl font-bold">{money(totalEstimated)}</p>
          <p className={`mt-1 text-xs ${varianceColor(projectedMargin)}`}>
            {money(projectedMargin)} margin ({projectedMarginPct.toFixed(1)}%)
          </p>
        </Panel>
        <Panel className="p-4">
          <p className="text-xs font-bold uppercase text-muted-foreground">Actual spend</p>
          <p className="mt-1 text-2xl font-bold">{money(totalActual)}</p>
          <p className={`mt-1 text-xs ${varianceColor(actualMargin)}`}>
            {money(actualMargin)} margin ({actualMarginPct.toFixed(1)}%)
          </p>
        </Panel>
        <Panel className="p-4">
          <p className="text-xs font-bold uppercase text-muted-foreground">Budget variance</p>
          <p className={`mt-1 text-2xl ${varianceColor(budgetVariance)}`}>{money(budgetVariance)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {budgetVariance >= 0 ? "Under budget" : "Over budget"} · {money(totalCommitted)} committed
          </p>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Budget lines */}
        <div className="grid gap-5">
          {Object.keys(byType).length === 0 ? (
            <Panel className="p-8 text-center">
              <p className="text-sm font-semibold text-muted-foreground">No budget lines yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Add your first line using the form on the right to start tracking margin.</p>
            </Panel>
          ) : (
            Object.entries(byType).map(([type, lines]) => {
              const typeEstimated = lines.reduce((s, l) => s + Number(l.estimatedAmount), 0);
              const typeActual = lines.reduce((s, l) => s + Number(l.actualAmount), 0);
              return (
                <div key={type}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className={`rounded px-2 py-1 text-xs font-bold ${LINE_TYPE_COLORS[type] ?? "bg-muted text-foreground"}`}>
                      {titleFromEnum(type)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {money(typeEstimated)} est · {money(typeActual)} actual
                    </span>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-border bg-white">
                    <table className="w-full min-w-[520px] text-sm">
                      <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-4 py-2 font-bold">Category / description</th>
                          <th className="px-4 py-2 font-bold text-right">Estimated</th>
                          <th className="px-4 py-2 font-bold text-right">Actual</th>
                          <th className="px-4 py-2 font-bold text-right">Variance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lines.map((line) => {
                          const variance = Number(line.estimatedAmount) - Number(line.actualAmount);
                          return (
                            <tr key={line.id} className="border-t border-border">
                              <td className="px-4 py-3">
                                <p className="font-semibold">{line.description}</p>
                                <p className="text-xs text-muted-foreground">{line.category}</p>
                              </td>
                              <td className="px-4 py-3 text-right">{money(line.estimatedAmount)}</td>
                              <td className="px-4 py-3 text-right">{money(line.actualAmount)}</td>
                              <td className={`px-4 py-3 text-right text-xs ${varianceColor(variance)}`}>
                                {variance >= 0 ? "+" : ""}{money(variance)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-muted/50">
                        <tr>
                          <td className="px-4 py-2 text-xs font-bold">Subtotal</td>
                          <td className="px-4 py-2 text-right text-xs font-bold">{money(typeEstimated)}</td>
                          <td className="px-4 py-2 text-right text-xs font-bold">{money(typeActual)}</td>
                          <td className={`px-4 py-2 text-right text-xs ${varianceColor(typeEstimated - typeActual)}`}>
                            {typeEstimated - typeActual >= 0 ? "+" : ""}{money(typeEstimated - typeActual)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              );
            })
          )}

          {/* Actual cost log */}
          {job.actualCosts.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">Actual cost log</h3>
              <div className="overflow-hidden rounded-lg border border-border bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 font-bold">Description</th>
                      <th className="px-4 py-2 font-bold">Type</th>
                      <th className="px-4 py-2 font-bold text-right">Amount</th>
                      <th className="px-4 py-2 font-bold text-right">Variance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {job.actualCosts.map((cost) => {
                      const variance = cost.varianceAmount ? Number(cost.varianceAmount) : null;
                      return (
                        <tr key={cost.id} className="border-t border-border">
                          <td className="px-4 py-3">
                            <p className="font-semibold">{cost.description}</p>
                            {cost.notes && <p className="text-xs text-muted-foreground">{cost.notes}</p>}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{cost.costType}</td>
                          <td className="px-4 py-3 text-right font-semibold">{money(cost.actualAmount)}</td>
                          <td className={`px-4 py-3 text-right text-xs ${variance != null ? varianceColor(variance) : "text-muted-foreground"}`}>
                            {variance != null ? `${variance >= 0 ? "+" : ""}${money(variance)}` : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar forms */}
        <div className="grid gap-5 self-start">
          {/* Add budget line */}
          <Panel className="p-5">
            <h3 className="mb-4 text-sm font-bold">Add budget line</h3>
            <form action={createBudgetLine} className="grid gap-3">
              <input type="hidden" name="jobId" value={id} />
              <div className="grid gap-1">
                <label className="text-xs font-bold uppercase text-muted-foreground">Type</label>
                <select name="lineType" className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary">
                  {Object.values(BudgetLineType).map((t) => (
                    <option key={t} value={t}>{titleFromEnum(t)}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1">
                <label className="text-xs font-bold uppercase text-muted-foreground">Category</label>
                <input name="category" required placeholder="e.g. Framing, Tile, Electrical" className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="grid gap-1">
                <label className="text-xs font-bold uppercase text-muted-foreground">Description</label>
                <input name="description" required placeholder="What this line covers" className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="grid gap-1">
                <label className="text-xs font-bold uppercase text-muted-foreground">Estimated amount ($)</label>
                <input name="estimatedAmount" type="number" min="0" step="0.01" required placeholder="0.00" className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="grid gap-1">
                <label className="text-xs font-bold uppercase text-muted-foreground">Notes (optional)</label>
                <textarea name="notes" rows={2} placeholder="Vendor, scope assumptions, etc." className="rounded-md border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <button type="submit" className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90">
                Add line
              </button>
            </form>
          </Panel>

          {/* Log actual cost */}
          <Panel className="p-5">
            <h3 className="mb-4 text-sm font-bold">Log actual cost</h3>
            <form action={logActualCost} className="grid gap-3">
              <input type="hidden" name="jobId" value={id} />
              <div className="grid gap-1">
                <label className="text-xs font-bold uppercase text-muted-foreground">Cost type</label>
                <select name="costType" className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary">
                  {Object.values(BudgetLineType).map((t) => (
                    <option key={t} value={t}>{titleFromEnum(t)}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1">
                <label className="text-xs font-bold uppercase text-muted-foreground">Description</label>
                <input name="description" required placeholder="What was purchased / paid" className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="grid gap-1">
                <label className="text-xs font-bold uppercase text-muted-foreground">Amount paid ($)</label>
                <input name="actualAmount" type="number" min="0" step="0.01" required placeholder="0.00" className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="grid gap-1">
                <label className="text-xs font-bold uppercase text-muted-foreground">Budget estimate for this ($)</label>
                <input name="estimatedAmount" type="number" min="0" step="0.01" placeholder="Optional - calculates variance" className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="grid gap-1">
                <label className="text-xs font-bold uppercase text-muted-foreground">Notes (optional)</label>
                <textarea name="notes" rows={2} placeholder="Invoice #, vendor, PO, etc." className="rounded-md border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <button type="submit" className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90">
                Log cost
              </button>
            </form>
          </Panel>
        </div>
      </div>
    </>
  );
}
