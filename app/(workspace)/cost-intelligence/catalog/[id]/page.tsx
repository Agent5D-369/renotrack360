import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffPage } from "@/lib/staff-access";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { calculateHomewyse, type SourceContent } from "@/lib/homewyse-catalog";
import { PageHeader } from "@/components/page-header";
import { Panel, Button } from "@/components/ui";
import { money } from "@/lib/format";

export default async function CatalogDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  await requireStaffPage();
  const { id } = await params, query = await searchParams;
  const source = await prisma.costSourceVersion.findFirst({ where: { id, organizationId: DEFAULT_ORG_ID } });
  if (!source) notFound();
  const content = source.content as SourceContent, record = content.record;
  const defaultQuantity = record.model.kind === "HOMEWYSE_UC1_V97" ? String(record.model.defaultQuantity) : "1";
  const quantity = /^\d{1,6}(\.\d{1,2})?$/.test(query.quantity ?? "") && Number(query.quantity) > 0 ? query.quantity : defaultQuantity;
  const calc = calculateHomewyse(record, quantity, content.geography.laborFactor), national = calc ? calculateHomewyse(record, quantity) : null;
  return <>
    <PageHeader title={record.name} body={`${record.sourceEdition} · ${source.category}`} />
    <Link href="/cost-intelligence/catalog" className="text-sm font-semibold text-primary">← Search catalog</Link>
    {calc && <Panel className="my-5 p-5">
      <form className="flex items-end gap-3"><label className="text-sm">Quantity ({record.unit || "source units"})<input name="quantity" type="number" min="0.01" max="999999" step="0.01" required defaultValue={quantity} className="mt-1 block rounded border p-2" /></label><Button type="submit">Recalculate</Button></form>
      <h2 className="mt-5 font-semibold">Austin 78704 source market range: {money(calc.low)}–{money(calc.high)}</h2>
      <p className="mt-1 text-sm">{money(calc.perUnitLow)}–{money(calc.perUnitHigh)} per {record.unit || "unit"}. Source labor allowance: {Number(calc.laborHours).toFixed(2)} hours.</p>
      <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2">Component</th><th className="p-2">Source quantity</th><th className="p-2">Low</th><th className="p-2">High</th></tr></thead><tbody>{calc.rows.map(row => <tr key={row.index} className="border-b"><td className="p-2">{row.name}{!row.included && <span className="block text-xs text-muted-foreground">Excluded from total</span>}</td><td className="p-2">{Number(row.quantity).toFixed(2)} {row.unit}</td><td className="p-2">{money(row.low)}</td><td className="p-2">{money(row.high)}</td></tr>)}</tbody></table></div>
      <p className="mt-3 text-xs text-muted-foreground">National comparison: {money(national!.low)}–{money(national!.high)}. Published ZIP adjustment: labor × {calc.laborFactor}; nonlabor × {calc.nonLaborFactor}. Source defaults and minimum labor charges are retained.</p>
      <Link href={`/cost-intelligence/scenarios?${new URLSearchParams({ source: id, quantity })}`} className="mt-5 inline-block rounded bg-primary px-4 py-2 font-semibold text-white">Prepare Flipside pricing scenario →</Link>
      <p className="mt-2 text-sm">The scenario uses source hours at $55 loaded field cost and midpoint nonlabor allowances. Review trade rates, actual quotes, supervision and risk before saving.</p>
    </Panel>}
    {!calc && <Panel className="my-5 p-5"><h2 className="font-semibold">Retained source reference</h2><p className="mt-2 text-sm">Scope, descriptions and published options are captured. Use the original calculator for its interactive price model; this entry does not yet generate a Flipside price draft.</p></Panel>}
    <Panel className="my-5 p-5"><h2 className="font-semibold">Work and component scope</h2><p className="mt-2 text-sm">{record.headline}</p><div className="mt-4 grid gap-4">{record.components.map(row => <div key={row.index}><h3 className="font-semibold">{row.name}</h3><p className="mt-1 text-sm">{row.description}</p></div>)}{record.sourceDescriptions.map((text, index) => <p key={index} className="text-sm">{text}</p>)}</div>
      {[["Included in source scope", record.inclusions], ["Source exclusions", record.exclusions], ["Source qualifications", record.notes]].map(([title, values]) => (values as string[]).length > 0 && <section key={String(title)} className="mt-5"><h3 className="font-semibold">{String(title)}</h3><ul className="mt-2 list-disc space-y-2 pl-5 text-sm">{(values as string[]).map((value, index) => <li key={index}>{value}</li>)}</ul></section>)}
    </Panel>
    <Panel className="my-5 p-5"><h2 className="font-semibold">Source record</h2><p className="mt-2 text-sm"><a href={source.sourceUrl} target="_blank" rel="noreferrer" className="text-primary underline">Open original Homewyse source</a> · {source.sourceEdition}</p><p className="mt-2 text-sm">Retrieved {content.retrievedAt.slice(0,10)}. {content.flipsideModification}</p><p className="mt-2 text-xs text-muted-foreground">{content.authorizationReference}</p><details className="mt-4 text-sm"><summary className="cursor-pointer">Retained source options and provenance</summary><dl className="mt-3 grid gap-2">{Object.entries(record.sourceOptions).map(([key, values]) => <div key={key}><dt className="font-semibold">{key}</dt><dd>{values.join(" · ")}</dd></div>)}</dl><p className="mt-3 break-all text-xs">Source SHA256: {source.sourceSha256}</p><p className="mt-2 break-all text-xs">Version: {source.id}</p></details></Panel>
  </>;
}
