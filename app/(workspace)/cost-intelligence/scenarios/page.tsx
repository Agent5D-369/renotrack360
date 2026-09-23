import { requireStaffPage } from "@/lib/staff-access";
import { randomUUID } from "node:crypto";
import Link from "next/link";
import { createPriceScenario } from "@/app/actions";
import { directCostFields } from "@/lib/gross-margin";
import { homewysePriceDraft, type SourceContent } from "@/lib/homewyse-catalog";
import { replacementRateDefaults } from "@/lib/pricing-defaults";
import { prisma } from "@/lib/prisma";
import { loadMarketFactors, marketFactorProblem } from "@/lib/market-index";
import { PageHeader } from "@/components/page-header";
import { Panel, Button } from "@/components/ui";

export default async function CostIntelligencePage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const actor = await requireStaffPage();
  const query = await searchParams;
  const source = query.source ? await prisma.costSourceVersion.findFirst({ where: { id: query.source, organizationId: actor.organizationId } }) : null;
  const content = source?.content as SourceContent | undefined;
  const quantity = /^\d{1,6}(\.\d{1,2})?$/.test(query.quantity ?? "") && Number(query.quantity) > 0 ? query.quantity : "1";
  const draft = source && content ? homewysePriceDraft(source.id, content, quantity) : null;
  const [snapshots, company, marketFactors] = await Promise.all([
    prisma.priceSnapshot.findMany({ where: { organizationId: actor.organizationId }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.organization.findUniqueOrThrow({
      where: { id: actor.organizationId },
      select: { defaultTargetMarginPercent: true, ownerExceptionMarginPercent: true },
    }),
    loadMarketFactors(prisma, actor.organizationId),
  ]);
  const defaultMargin = Number(company.defaultTargetMarginPercent);
  const exceptionMargin = Number(company.ownerExceptionMarginPercent);
  const inputClass = "mt-1 w-full rounded-md border border-border bg-white px-3 py-2";
  return <>
    <PageHeader title="Flipside Cost Intelligence" body="Price documented project costs to a true gross margin." />
    <Link href="/cost-intelligence" className="mb-4 inline-block text-sm font-semibold text-primary">← Assemblies, vendor quotes and actual costs</Link>
    <Panel className="mb-5 p-4">
      <p className="font-semibold">Internal pricing scenarios</p>
      <p className="mt-1 text-sm text-muted-foreground">Risk is added to direct cost first. Selling price is risk-adjusted direct cost divided by one minus the target margin. The standard target is 40%; renovation rescue usually targets 42–45%, and change orders approximately 42%.</p>
      <p className="mt-2 text-sm">Saved scenarios retain their assumptions and results. They do not change an estimate, contract or client proposal.</p>
    </Panel>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(240px,1fr)]">
      <Panel className="p-5">
        <form action={createPriceScenario} className="grid gap-5">
          <input type="hidden" name="requestId" value={randomUUID()} />
          <input type="hidden" name="costSourceVersionId" value={draft?.costSourceVersionId ?? ""} /><input type="hidden" name="sourceQuantity" value={draft?.sourceQuantity ?? "0"} />
          {draft && <p className="rounded border border-border bg-muted p-3 text-sm">Source-based planning draft: labor hours at $55 loaded field cost and midpoint material/equipment allowances. Review job fit, actual supplier pricing, PM hours, permits and risk before saving. The source market range is not used as direct labor cost.</p>}
          <label className="text-sm font-semibold">Scenario name<input name="name" defaultValue={draft?.name} required minLength={3} maxLength={120} className={inputClass} placeholder="Kitchen renovation: initial cost review" /></label>
          <fieldset>
            <legend className="font-semibold">Direct project costs</legend>
            <p className="mb-3 mt-1 text-sm text-muted-foreground">Enter a total dollar cost for each category. Enter 0 only when that cost does not apply. Include your field labor at replacement value and project-specific supervision. Corporate management and company overhead do not belong here.</p>
            <div className="grid gap-3 sm:grid-cols-2">{directCostFields.filter(([key]) => key !== "ownerFieldLabor" && key !== "projectManagement").map(([key, label]) => <label key={key} className="text-sm">{label}<input name={key} defaultValue={draft?.[key as keyof typeof draft]} required type="number" min="0" max="999999999.99" step="0.01" inputMode="decimal" className={inputClass} /></label>)}</div>
          </fieldset>
          <fieldset>
            <legend className="font-semibold">Owner labor and project supervision</legend>
            <p className="mb-3 mt-1 text-sm text-muted-foreground">Recommended starting replacement costs: $55/hour for field work and $95/hour for project PM, including employer-cost allowance. These are internal planning rates; review against actual Austin hiring or subcontract bids. Enter hours separately for each role without counting the same time twice.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">Owner field hours<input name="ownerFieldHours" defaultValue={draft?.ownerFieldHours} required type="number" min="0" step="0.01" className={inputClass} /></label>
              <label className="text-sm">Owner field cost per hour ($)<input name="ownerFieldRate" required type="number" min="0" step="0.01" defaultValue={replacementRateDefaults.ownerFieldRate} className={inputClass} /></label>
              <label className="text-sm">Project PM/supervision hours<input name="projectManagementHours" defaultValue={draft?.projectManagementHours} required type="number" min="0" step="0.01" className={inputClass} /></label>
              <label className="text-sm">Project PM cost per hour ($)<input name="projectManagementRate" required type="number" min="0" step="0.01" defaultValue={replacementRateDefaults.projectManagementRate} className={inputClass} /></label>
            </div>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">Risk allowance (%)<input name="riskPercent" required type="number" min="0" max="100" step="0.01" inputMode="decimal" className={inputClass} /></label>
            <label className="text-sm">Target gross margin (%)<input name="targetMarginPercent" required type="number" min="0" max="99.99" step="0.01" defaultValue={defaultMargin} inputMode="decimal" className={inputClass} /></label>
          </div>
          <fieldset className="rounded-md border border-border p-3">
            <legend className="px-1 text-sm font-semibold">Geographic market index</legend>
            <label className="block text-sm">Market
              <select name="marketFactorId" defaultValue="" className={inputClass}>
                <option value="">No market index (multipliers of 1, current behaviour)</option>
                {marketFactors.map(factor => {
                  const problem = marketFactorProblem(factor);
                  const multipliers = `labor ×${Number(factor.laborMultiplier)}, material ×${Number(factor.materialMultiplier)}, permit ×${Number(factor.permitMultiplier)}`;
                  return <option key={factor.id} value={factor.id} disabled={Boolean(problem)}>
                    {factor.marketName}{factor.zipPrefix ? ` (${factor.zipPrefix})` : ""} — {problem ? `unusable: ${problem}` : multipliers}
                  </option>;
                })}
              </select>
            </label>
            <p className="mt-2 text-xs text-muted-foreground">
              {marketFactors.length
                ? "Labour applies to crew field labour and to the owner field and project PM rates. Material applies to materials. Permit applies to permits, engineering and design. Subcontractors, equipment, protection and other direct costs are not changed. The applied index is retained with the saved scenario."
                : "No active market cost factors are configured for this company, so no index can be applied. Add market factors on the cost intelligence page first."}
            </p>
          </fieldset>
          <label className="text-sm font-semibold">Cost and risk basis<textarea name="basis" defaultValue={draft?.basis} required minLength={10} maxLength={4000} rows={4} className={inputClass} placeholder="Record quantities, current bids, labor hours and replacement rates, allowances, known exclusions and the reason for the risk allowance." /></label>
          <fieldset className="rounded-md border border-border p-3">
            <legend className="px-1 text-sm font-semibold">{`Owner exception below ${exceptionMargin}% margin`}</legend>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="ownerApproval" className="mt-1" />I am the owner and approve this below-{exceptionMargin}% internal scenario.</label>
            <label className="mt-3 block text-sm">Exception reason<textarea name="ownerExceptionReason" maxLength={2000} rows={2} className={inputClass} /></label>
            <p className="mt-1 text-xs text-muted-foreground">An administrator cannot approve this exception. Approval is recorded with the scenario.</p>
          </fieldset>
          <Button type="submit">Calculate and save internal scenario</Button>
        </form>
      </Panel>
      <Panel className="self-start p-5">
        <h2 className="font-semibold">Saved scenarios</h2>
        {!snapshots.length && <p className="mt-3 text-sm text-muted-foreground">No scenarios saved yet. Enter documented costs to create the first one.</p>}
        <ul className="mt-3 grid gap-3">{snapshots.map(snapshot => <li key={snapshot.id}><Link className="text-sm font-semibold text-primary hover:underline" href={`/cost-intelligence/${snapshot.id}`}>{snapshot.name}</Link><p className="text-xs text-muted-foreground">{snapshot.targetMarginPercent.toString()}% target margin</p></li>)}</ul>
      </Panel>
    </div>
  </>;
}
