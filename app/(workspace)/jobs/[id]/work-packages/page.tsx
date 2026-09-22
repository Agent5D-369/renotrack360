import { requireStaffPage } from "@/lib/staff-access";
import { randomUUID } from "node:crypto";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { scopeReviewState, scopeContentSchema } from "@/lib/work-package";
import { adoptJobScopePackage } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { Panel, Button } from "@/components/ui";
import { money } from "@/lib/format";

export default async function JobWorkPackagesPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  await requireStaffPage();
  const actor = await requireStaffPage(), { id } = await params;
  const query = await searchParams;
  const job = await prisma.job.findFirstOrThrow({ where: { id, organizationId: DEFAULT_ORG_ID }, include: { financialBaseline: true, phases: { orderBy: { phaseNumber: "asc" } }, scopeItems: { include: { workPackage: true } } } });
  if (!job.financialBaseline) return <><PageHeader title="Ordered work packages" body={job.jobName} /><Panel className="p-5"><p>Review the actual contract and complete receipts before mapping accepted scope into work.</p><Link className="mt-3 inline-block text-primary underline" href={`/jobs/${id}/financial-review`}>Complete owner financial review</Link></Panel></>;
  const [review, versions, prices, files] = await Promise.all([
    scopeReviewState(prisma, id), prisma.workItemVersion.findMany({ where: { organizationId: DEFAULT_ORG_ID }, orderBy: { createdAt: "desc" } }),
    prisma.priceSnapshot.findMany({ where: { organizationId: DEFAULT_ORG_ID }, orderBy: { createdAt: "desc" } }),
    prisma.fileAsset.findMany({ where: { organizationId: DEFAULT_ORG_ID, entityType: "JOB", entityId: id, mimeType: "application/pdf", storageProvider: "private-volume" }, orderBy: { createdAt: "desc" } }),
  ]);
  const field = "mt-1 w-full rounded-md border border-border bg-white px-3 py-2";
  return <><PageHeader title="Accepted scope to ordered work" body={job.jobName} /><Link href={`/jobs/${id}`} className="mb-4 inline-block text-primary underline">← Job</Link>
    {query.error && <p role="alert" className="mb-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm">{query.error}</p>}
    <Panel className="mb-5 p-5"><h2 className="font-semibold">Retained scope mappings</h2><p className="mt-2 text-sm">Current contract {money(job.contractAmount)} · mapped scope {money(review.allocated)} · unmapped {money(job.contractAmount.minus(review.allocated))}. Mapping creates no additional charge.</p>
      {job.scopeItems.length ? <ul className="mt-3 space-y-2">{job.scopeItems.map(item => <li key={item.id}><Link className="text-primary underline" href={`/work-packages/${item.workPackage?.id}`}>{scopeContentSchema.parse(item.content).title}</Link> · {item.sourceLineRef} · {money(item.amount)}</li>)}</ul> : <p className="mt-3 text-sm">No accepted scope has been mapped into evidence-backed work yet. Older task status is retained separately.</p>}
    </Panel>
    <Panel className="p-5"><h2 className="font-semibold">Map one documented contract line</h2><p className="mt-2 text-sm">Use the exact client-agreed source line, measured scope and retained price. This retains an owner review of existing acceptance; it does not obtain client approval or authorize installation. Review the selected work version and resolve its exclusions before adopting.</p>
      <div className="my-3 flex flex-wrap gap-4 text-sm"><Link className="text-primary underline" href="/service-templates/work-items">Review and adopt work versions</Link><Link className="text-primary underline" href="/cost-intelligence/scenarios">Retained pricing</Link><Link className="text-primary underline" href={`/jobs/${id}/financial-review`}>Retain source PDF</Link></div>
      {actor.role !== "OWNER" ? <p>The current owner must adopt the accepted scope mapping.</p> : <form action={adoptJobScopePackage.bind(null, id)} className="grid gap-4">
        <input type="hidden" name="requestId" value={randomUUID()} /><input type="hidden" name="reviewedDigest" value={review.digest} />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">Contract line reference<input name="sourceLineRef" required minLength={3} maxLength={180} placeholder="Signed contract, section and line" className={field} /></label>
          <label className="text-sm">Work title<input name="title" required minLength={3} maxLength={180} className={field} /></label>
          <label className="text-sm">Room or area<input name="area" required minLength={2} maxLength={180} className={field} /></label>
          <label className="text-sm">Phase<select name="phaseId" required className={field}><option value="">Select existing phase</option>{job.phases.map(phase => <option key={phase.id} value={phase.id}>{phase.phaseNumber}. {phase.phaseName}</option>)}</select></label>
          <label className="text-sm">Measured quantity<input name="quantity" type="number" min="0.01" step="0.01" required className={field} /></label>
          <label className="text-sm">Unit<input name="unit" required maxLength={40} placeholder="shower, square feet, etc." className={field} /></label>
          <label className="text-sm">Work version<select name="workItemVersionId" required className={field}><option value="">Select reviewed version</option>{versions.map(version => <option key={version.id} value={version.id}>{version.name} · revision {version.revision}</option>)}</select></label>
          <label className="text-sm">Pricing scenario<select name="priceSnapshotId" required className={field}><option value="">Select retained price</option>{prices.map(price => <option key={price.id} value={price.id}>{price.name} · {money(price.sellingPrice)}</option>)}</select></label>
          <label className="text-sm">Client-agreed line amount ($)<input name="agreedAmount" required type="number" min="0.01" step="0.01" className={field} /></label>
          <label className="text-sm">Accepted-scope evidence PDF<select name="sourceFileId" required className={field}><option value="">Select reviewed source</option>{files.map(file => <option key={file.id} value={file.id}>{file.fileName}</option>)}</select></label>
        </div>
        {([['inclusions','Client-agreed inclusions'],['exclusions','Client-agreed exclusions'],['measurementNotes','Site dimensions, products and measurement basis'],['installerQualifications','Verified installer competence and trade responsibility'],['authorityRequirements','Applicable permits, inspections and required authority acceptance']] as const).map(([name,label]) => <label key={name} className="text-sm">{label}<textarea name={name} required minLength={name === 'exclusions' ? 10 : 20} maxLength={5000} rows={3} className={field} /></label>)}
        <label className="text-sm">Actual responsible installer<input name="installerName" required minLength={2} maxLength={120} className={field} /></label>
        <label className="flex items-start gap-2 text-sm"><input name="approvedScopeVerified" type="checkbox" required className="mt-1" />I reviewed the source documents and confirm this exact scope and amount were accepted by the client, are included in the current contract, and match the selected work version. This mapping does not replace site readiness, inspections or QC.</label>
        <Button type="submit">Retain accepted scope and generate ordered work</Button>
      </form>}
    </Panel></>;
}
