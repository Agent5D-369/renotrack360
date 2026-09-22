import { requireStaffPage } from "@/lib/staff-access";
import Link from "next/link";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { ownedEstimate, estimateReviewDigest } from "@/lib/estimate-acceptance";
import { uploadEstimateContract, issueReviewedEstimate, convertReviewedEstimate } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { Panel, Button } from "@/components/ui";
import { money } from "@/lib/format";

export default async function EstimateAcceptancePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string,string>> }) {
  await requireStaffPage();
  const actor = await requireStaffPage(), { id } = await params, query = await searchParams, estimate = await ownedEstimate(prisma,id);
  const [prices, files, snapshots] = await Promise.all([
    prisma.priceSnapshot.findMany({where:{organizationId:DEFAULT_ORG_ID,sellingPrice:estimate.total},orderBy:{createdAt:"desc"},take:100}),
    prisma.fileAsset.findMany({where:{organizationId:DEFAULT_ORG_ID,entityType:"QUOTE",entityId:estimate.quoteId,mimeType:"application/pdf",storageProvider:"private-volume"},orderBy:{createdAt:"desc"}}),
    prisma.estimateSnapshot.findMany({where:{estimateId:id,organizationId:DEFAULT_ORG_ID},include:{approval:true},orderBy:{createdAt:"desc"},take:20}),
  ]);
  const field="mt-1 block w-full rounded border border-border bg-white p-2";
  return <><PageHeader title={`Reviewed proposal · ${estimate.estimateNumber}`} body="Retain the exact document, scope and price before requesting a client response." /><Link href={`/estimates/${id}`} className="text-primary underline">← Estimate</Link>
    {query.error && <p role="alert" className="my-4 rounded border border-amber-300 bg-amber-50 p-3">{query.error}</p>}
    <Panel className="my-5 p-5"><h2 className="font-semibold">Current draft: {money(estimate.total)}</h2><p className="mt-2 text-sm">{estimate.clientProfile?.profileName ?? "Assign the client"} · {estimate.property?.propertyAddress ?? "Assign the property"}</p><p className="mt-2 text-sm">The client receives only the reviewed proposal content and selected PDF. Internal cost assumptions stay private. Creating a link does not send an email, collect a deposit or release construction.</p><div className="mt-3 flex flex-wrap gap-4 text-sm"><Link href={`/estimates/${id}/edit`} className="text-primary underline">Review draft estimate</Link><Link href="/cost-intelligence/scenarios" className="text-primary underline">Review gross-margin pricing</Link></div></Panel>
    {estimate.acceptance ? <Panel className="my-5 p-5"><h2 className="font-semibold">Retained client acceptance</h2><p className="mt-2 text-sm">{estimate.acceptance.signerName} · {estimate.acceptance.acceptedAt.toISOString()}</p><a href={`/api/files/${estimate.acceptance.snapshot.sourceFileId}`} className="mt-3 inline-block text-primary underline">Open accepted contract document</a>{estimate.acceptance.conversion ? <Link href={`/jobs/${estimate.acceptance.conversion.jobId}`} className="ml-4 text-primary underline">Open linked job</Link> : actor.role === "OWNER" && <form action={convertReviewedEstimate.bind(null,id)} className="mt-4"><p className="mb-3 text-sm">Create one job at the accepted price. Financial document review and verified deposit receipts remain required; no schedule is promised here.</p><Button type="submit">Create job from accepted proposal</Button></form>}</Panel> : <>
      <Panel className="my-5 p-5"><h2 className="font-semibold">1. Retain the complete proposal PDF</h2><p className="mt-2 text-sm">Use the actual document intended for this client, including the scope, exclusions, allowances, schedule assumptions, payment schedule, change procedure and warranty. Do not attach internal estimates or private notes.</p><form action={uploadEstimateContract.bind(null,id)} className="mt-4 flex flex-wrap gap-3"><input name="file" type="file" accept="application/pdf" required aria-label="Complete proposal PDF" /><Button type="submit">Retain private PDF</Button></form></Panel>
      <Panel className="my-5 p-5"><h2 className="font-semibold">2. Owner review and link issuance</h2>{actor.role !== "OWNER" ? <p className="mt-3">The current owner must review and issue a contractual proposal.</p> : <form action={issueReviewedEstimate.bind(null,id)} className="mt-4 grid gap-4">
        <input name="requestId" type="hidden" value={randomUUID()} /><input name="reviewedDigest" type="hidden" value={estimateReviewDigest(estimate)} />
        <label className="text-sm">Retained price matching {money(estimate.total)}<select name="priceSnapshotId" required className={field}><option value="">Select reviewed price</option>{prices.map(price=><option key={price.id} value={price.id}>{price.name} · {money(price.sellingPrice)}</option>)}</select></label>
        {!prices.length && <p className="text-sm">No saved gross-margin price matches this draft. Review the pricing scenario and draft total before issuing it.</p>}
        <label className="text-sm">Complete client proposal PDF<select name="sourceFileId" required className={field}><option value="">Select reviewed document</option>{files.map(file=><option key={file.id} value={file.id}>{file.fileName}</option>)}</select></label>
        {([['scope','Included scope'],['exclusions','Exclusions and client responsibilities'],['allowances','Allowances and selection budgets'],['schedule','Schedule assumptions and dependencies'],['paymentSchedule','Payment schedule and change procedure'],['warranty','Warranty and contract terms reference']] as const).map(([name,label])=><label key={name} className="text-sm">{label}<textarea name={name} required minLength={20} maxLength={12000} rows={4} className={field} defaultValue={name==='scope' ? estimate.clientFacingSummary ?? '' : undefined} /></label>)}
        <label className="text-sm">Required deposit in the reviewed contract ($)<input name="requiredDeposit" required type="number" min="0" max={estimate.total.toString()} step="0.01" className={field} /></label>
        <label className="flex items-start gap-2 text-sm"><input name="ownerReviewed" type="checkbox" required className="mt-1" />I reviewed the exact client, property, retained price, complete PDF and the text above. They agree and are approved for this client. The document contains our actual approved contract terms; this form does not supply legal terms.</label>
        <p className="text-xs text-muted-foreground">The link expires in 14 days. Issuing a replacement expires prior open links. Share the resulting link only after your review; no message is sent automatically.</p><Button type="submit">Retain reviewed proposal and create client link</Button>
      </form>}</Panel>
    </>}
    <Panel className="my-5 p-5"><h2 className="font-semibold">Retained proposal versions</h2><ul className="mt-3 space-y-3 text-sm">{snapshots.map(snapshot=><li key={snapshot.id}><p>{snapshot.createdAt.toISOString()} · {snapshot.approval.status} · expires {snapshot.expiresAt.toISOString().slice(0,10)}</p><a className="text-primary underline" href={`/api/files/${snapshot.sourceFileId}`}>Retained PDF</a>{snapshot.approval.token && <Link href={`/approve/${snapshot.approval.token}`} className="ml-4 text-primary underline">Open client review link</Link>}</li>)}</ul>{!snapshots.length && <p className="mt-2 text-sm">No reviewed proposal has been issued.</p>}</Panel>
  </>;
}
