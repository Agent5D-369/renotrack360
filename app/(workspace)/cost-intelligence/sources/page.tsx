import { requireStaffPage } from "@/lib/staff-access";
import { randomUUID } from "node:crypto";
import Link from "next/link";
import { createCostObservation } from "@/app/actions";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { costSourceReferences } from "@/lib/cost-source-references";
import { PageHeader } from "@/components/page-header";
import { Panel, Button } from "@/components/ui";

export default async function CostSourcesPage() {
  await requireStaffPage();
  const records = await prisma.costObservation.findMany({ where: { organizationId: DEFAULT_ORG_ID }, orderBy: { importedAt: "desc" }, take: 40 });
  const inputClass = "mt-1 w-full rounded-md border border-border bg-white px-3 py-2";
  const today = new Date().toISOString().slice(0, 10);
  return <>
    <PageHeader title="Dated cost sources" body="Retain the source, scope and market context behind a cost assumption." />
    <Link href="/cost-intelligence" className="mb-4 inline-block text-sm font-semibold text-primary">← Cost Intelligence</Link>
    <Panel className="mb-5 p-5"><h2 className="font-semibold">National reference examples</h2><p className="mt-2 text-sm">These references do not set Flipside prices. Component-specific indices need their own base date and geography; there is no single Austin multiplier.</p><div className="mt-4 grid gap-4 md:grid-cols-2">{costSourceReferences.map(reference => <div key={reference.url} className="rounded border border-border p-4"><a href={reference.url} target="_blank" rel="noreferrer" className="font-semibold text-primary underline">{reference.name}</a><p className="mt-2 text-sm">${reference.low}–${reference.high} {reference.unit} · {reference.version}</p><p className="mt-2 text-sm">{reference.limitation}</p><p className="mt-2 text-xs text-muted-foreground">Homewyse source checked {reference.checkedAt}.</p></div>)}</div></Panel>
    <Panel className="mb-5 p-5"><h2 className="font-semibold">Retained observations</h2>{records.length ? <ul className="mt-3 space-y-3">{records.map(record => <li key={record.id}><Link className="text-sm font-semibold text-primary underline" href={`/cost-intelligence/sources/${record.id}`}>{record.name}</Link><p className="text-xs text-muted-foreground">{record.component} · {record.geography} · effective {record.effectiveDate} · {record.effectiveDate > today ? "Future dated" : record.reviewDate < today ? "Review overdue" : "Review due " + record.reviewDate}</p></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">No observations saved yet.</p>}</Panel>
    <Panel className="p-5"><h2 className="mb-4 font-semibold">Record a source observation</h2><form action={createCostObservation} className="grid gap-4">
      <input type="hidden" name="requestId" value={randomUUID()} />
      <label className="text-sm">Name<input name="name" required maxLength={120} className={inputClass} /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">Cost layer<select name="layer" className={inputClass}><option value="MARKET_REFERENCE">Market reference</option><option value="EXPECTED_DIRECT_COST">Flipside expected direct cost</option></select></label>
        <label className="text-sm">Component<select name="component" className={inputClass}>{["LABOR", "MATERIAL", "EQUIPMENT", "DISPOSAL", "ASSEMBLY"].map(value => <option key={value}>{value}</option>)}</select></label>
        <label className="text-sm">Measure<select name="measure" className={inputClass}><option value="RATE">Dollar rate</option><option value="INDEX">Component index</option></select></label>
        <label className="text-sm">Source category<select name="sourceKind" className={inputClass}>{["HOMEWYSE", "OFFICIAL_STATISTICS", "SUPPLIER_QUOTE", "FLIPSIDE_RECOMMENDATION", "OTHER"].map(value => <option key={value}>{value}</option>)}</select></label>
        {[["tradeOrClass", "Trade or material class"], ["geography", "Geography / ZIP or national scope"], ["unit", "Unit, such as USD/hour or index base 1"], ["sourceName", "Source name"], ["sourceVersion", "Source edition / quote reference"]].map(([name, label]) => <label key={name} className="text-sm">{label}<input name={name} required maxLength={name === "unit" ? 80 : 120} className={inputClass} /></label>)}
        <label className="text-sm">Source URL<input name="sourceUrl" type="url" required placeholder="https://" className={inputClass} /></label>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">{[["low", "Low"], ["target", "Target, only if supported"], ["high", "High"]].map(([name, label]) => <label key={name} className="text-sm">{label}<input name={name} type="number" min="0" step="0.0001" required={name !== "target"} className={inputClass} /></label>)}</div>
      <p className="text-xs text-muted-foreground">Use the same value for low/target/high only when the source supports one specific rate. Leave target empty if the source publishes only a range.</p>
      <div className="grid gap-4 sm:grid-cols-2">{[["effectiveDate", "Effective date", true], ["reviewDate", "Review due", true], ["basePeriod", "Index base date (indices only)", false], ["calibrationDate", "Last calibration date", false]].map(([name, label, required]) => <label key={String(name)} className="text-sm">{label}<input name={String(name)} type="date" required={Boolean(required)} className={inputClass} /></label>)}</div>
      {[["scope", "Source scope and exclusions", 3000, true], ["modificationNotes", "Flipside changes or unchanged-source explanation", 1500, true], ["calibrationBasis", "Calibration evidence and method (required for expected direct cost)", 1500, false]].map(([name, label, max, required]) => <label key={String(name)} className="text-sm">{label}<textarea name={String(name)} required={Boolean(required)} maxLength={Number(max)} rows={3} className={inputClass} /></label>)}
      <p className="text-sm text-muted-foreground">Saving retains this observation and its provenance. It does not reprice a scenario, estimate or contract. Homewyse entries retain the authorization reference already approved by Rick.</p>
      <Button type="submit">Save dated observation</Button>
    </form></Panel>
  </>;
}
