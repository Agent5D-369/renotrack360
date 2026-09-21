import { requireStaffPage } from "@/lib/staff-access";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { directCostFields } from "@/lib/gross-margin";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";

export default async function PriceScenarioPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage();
  const { id } = await params;
  const snapshot = await prisma.priceSnapshot.findFirst({ where: { id, organizationId: DEFAULT_ORG_ID } });
  if (!snapshot) notFound();
  const values = snapshot.inputs as Record<string, string | boolean>;
  const usd = (value: unknown) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));
  return <>
    <PageHeader title={snapshot.name} body="Saved internal pricing scenario. No estimate or contract was changed." />
    <Link href="/cost-intelligence" className="mb-5 inline-block text-sm font-semibold text-primary">← All scenarios and new calculation</Link>
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel className="p-5">
        <h2 className="font-semibold">Pricing result</h2>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <dt>Direct cost</dt><dd className="text-right">{usd(snapshot.directCost)}</dd>
          <dt>Risk allowance ({String(values.riskPercent)}%)</dt><dd className="text-right">{usd(snapshot.riskAmount)}</dd>
          <dt>Risk-adjusted direct cost</dt><dd className="text-right font-semibold">{usd(snapshot.riskAdjustedDirectCost)}</dd>
          <dt>Target gross margin</dt><dd className="text-right">{snapshot.targetMarginPercent.toString()}%</dd>
          <dt className="border-t pt-3 font-bold">Selling price</dt><dd className="border-t pt-3 text-right text-xl font-bold">{usd(snapshot.sellingPrice)}</dd>
          <dt>Gross profit after risk allowance</dt><dd className="text-right">{usd(snapshot.grossProfit)}</dd>
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">Selling price = {usd(snapshot.riskAdjustedDirectCost)} ÷ (1 − {snapshot.targetMarginPercent.toString()}%). Rounded upward to the cent.</p>
        {snapshot.ownerExceptionReason && <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm"><p className="font-semibold">Owner-approved margin exception</p><p className="mt-1 whitespace-pre-wrap">{snapshot.ownerExceptionReason}</p></div>}
      </Panel>
      <Panel className="p-5">
        <h2 className="font-semibold">Retained cost assumptions</h2>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">{directCostFields.map(([key, label]) => <div className="contents" key={key}><dt>{label}</dt><dd className="text-right">{usd(values[key])}</dd></div>)}</dl>
        <h3 className="mt-5 font-semibold">Cost and risk basis</h3><p className="mt-2 whitespace-pre-wrap text-sm">{snapshot.basis}</p>
        <p className="mt-3 text-sm">Owner field work: {String(values.ownerFieldHours)} hours × {usd(values.ownerFieldRate)}. Project PM: {String(values.projectManagementHours)} hours × {usd(values.projectManagementRate)}.</p>
        <p className="mt-5 text-xs text-muted-foreground">Saved {snapshot.createdAt.toISOString()}. These assumptions and results are retained as recorded; create a new scenario to revise them.</p>
      </Panel>
    </div>
  </>;
}
