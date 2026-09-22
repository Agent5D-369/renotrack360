import { requireStaffPage } from "@/lib/staff-access";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";

export default async function CostSourcePage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage();
  const { id } = await params;
  const record = await prisma.costObservation.findFirst({ where: { id, organizationId: DEFAULT_ORG_ID } });
  if (!record) notFound();
  const content = record.content as Record<string, string>;
  const today = new Date().toISOString().slice(0, 10);
  return <>
    <PageHeader title={record.name} body="Retained source observation. No project or catalog price changed." />
    <Link href="/cost-intelligence/sources" className="mb-4 inline-block text-sm font-semibold text-primary">← Dated cost sources</Link>
    <Panel className="mb-5 p-5"><h2 className="font-semibold">{record.layer === "MARKET_REFERENCE" ? "Market reference" : "Flipside expected direct cost"}</h2><p className="mt-2 text-sm">{record.component} · {content.tradeOrClass} · {record.geography}</p><p className="mt-2 text-sm">Low {record.low.toString()} · Target {record.target?.toString() ?? "Not supplied"} · High {record.high.toString()} {content.unit}</p><p className="mt-2 text-sm">Effective {record.effectiveDate}. Review due {record.reviewDate}. {record.effectiveDate > today ? "Future dated: not yet effective." : record.reviewDate < today ? "Review overdue: recalibrate before use." : "Review against the actual project before use."}</p>{content.basePeriod && <p className="mt-2 text-sm">Index base date: {content.basePeriod}</p>}</Panel>
    <Panel className="p-5"><h2 className="font-semibold">Scope and provenance</h2><p className="mt-3 whitespace-pre-wrap text-sm">{content.scope}</p><a href={content.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-primary underline">{content.sourceName} · {content.sourceVersion}</a><p className="mt-2 text-sm">Imported {record.importedAt.toISOString().slice(0, 10)}. {content.authorizationReference}</p><p className="mt-3 whitespace-pre-wrap text-sm">Flipside modification: {content.modificationNotes}</p><p className="mt-3 whitespace-pre-wrap text-sm">{content.calibrationDate ? `Calibrated ${content.calibrationDate}: ${content.calibrationBasis}` : "Not calibrated to Flipside actual costs."}</p></Panel>
  </>;
}
