import { requireStaffPage } from "@/lib/staff-access";
import { randomUUID } from "node:crypto";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { jobFinanceReviewData } from "@/lib/job-finance";
import { nativeAcceptedContract } from "@/lib/estimate-acceptance";
import { uploadJobFinanceEvidence, reviewJobFinancialBaseline } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { Panel, Button } from "@/components/ui";
import { money } from "@/lib/format";

export default async function JobFinancialReviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage();
  const actor = await requireStaffPage();
  const { id } = await params;
  const [review, files] = await Promise.all([
    jobFinanceReviewData(prisma, id, DEFAULT_ORG_ID),
    prisma.fileAsset.findMany({ where: { organizationId: DEFAULT_ORG_ID, entityType: "JOB", entityId: id, storageProvider: "private-volume", mimeType: "application/pdf" }, orderBy: { createdAt: "desc" } }),
  ]);
  const baseline = review.job.financialBaseline;
  const accepted = await nativeAcceptedContract(prisma, id);
  const inputClass = "mt-1 w-full rounded-md border border-border bg-white px-3 py-2";
  return <>
    <PageHeader title={`Financial review: ${review.job.jobName}`} body="Document the verified contract and receipts before releasing new financial changes." />
    <div className="mb-4 flex flex-wrap gap-4 text-sm font-semibold"><Link href={`/jobs/${id}`} className="text-primary">← Job</Link><Link href={`/jobs/${id}/billing`} className="text-primary underline">Milestone billing</Link></div>
    {accepted && <Panel className="mb-5 p-5"><h2 className="font-semibold">Client-accepted proposal</h2><p className="mt-2 text-sm">Accepted price {money(accepted.total)}. Documented deposit {money(accepted.requiredDeposit)}. Keep the receipt review and any later approved changes in the job evidence bundle.</p><a className="mt-2 inline-block text-sm text-primary underline" href={`/api/files/${accepted.sourceFileId}`}>Open accepted proposal PDF</a></Panel>}
    <Panel className="mb-5 p-5"><h2 className="font-semibold">Recorded amounts and receipt evidence</h2><dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><dt>Current recorded contract</dt><dd>{money(review.job.contractAmount)}</dd><dt>Recorded job paid</dt><dd>{money(review.job.amountPaid)}</dd><dt>Linked completed receipts</dt><dd>{money(review.receiptTotal)}</dd><dt>Balance from contract less receipts</dt><dd>{money(review.job.contractAmount.minus(review.receiptTotal))}</dd></dl><p className="mt-3 text-sm">Confirm the current contract includes every previously approved change. If the contract amount is wrong, correct it from the source document before adopting a baseline. Record missing receipts with their evidence; do not assume the current receipt list is complete.</p><Link href="/payments/reconciliation" className="mt-3 inline-block text-sm text-primary underline">Review every invoice and payment</Link></Panel>
    <Panel className="mb-5 p-5"><h2 className="font-semibold">Previously approved changes included in this review</h2>{review.job.changeOrders.length ? <ul className="mt-3 space-y-2 text-sm">{review.job.changeOrders.map(change => <li key={change.id}><Link className="text-primary underline" href={`/change-orders/${change.id}`}>{change.changeOrderTitle}</Link> · {money(change.addedCost)}</li>)}</ul> : <p className="mt-2 text-sm">No change orders are currently marked approved. Verify this against the actual documents.</p>}</Panel>
    {baseline ? <Panel className="p-5"><h2 className="font-semibold">Retained owner review</h2><p className="mt-2 text-sm">Reviewed {baseline.createdAt.toISOString().slice(0, 10)}. Baseline contract {money(baseline.contractAmount)}. Documented required deposit {money(baseline.requiredDeposit)}.</p><p className="mt-2 whitespace-pre-wrap text-sm">{baseline.reviewReason}</p><a className="mt-3 inline-block text-sm font-semibold text-primary underline" href={`/api/files/${baseline.sourceFileId}`}>Open retained evidence bundle</a><p className="mt-3 text-sm">Subsequent approved changes and completed receipts update the current totals through the ledger. The original review remains retained.</p></Panel> : <>
      <Panel className="mb-5 p-5"><h2 className="font-semibold">1. Retain the source documents</h2><p className="mt-2 text-sm">Upload a private PDF bundle containing the contract, approved changes and receipt reconciliation evidence. The owner must review its contents; uploading alone does not approve anything.</p><form action={uploadJobFinanceEvidence.bind(null, id)} className="mt-4 grid gap-3"><input type="file" name="file" accept="application/pdf" required aria-label="Financial evidence PDF" /><Button type="submit">Retain evidence PDF</Button></form>{files.length > 0 && <ul className="mt-4 space-y-2 text-sm">{files.map(file => <li key={file.id}><a href={`/api/files/${file.id}`} className="text-primary underline">{file.fileName}</a></li>)}</ul>}</Panel>
      <Panel className="p-5"><h2 className="font-semibold">2. Owner review and adoption</h2><p className="mt-2 text-sm">Adoption keeps the current contract at {money(review.job.contractAmount)} and sets job paid to the verified completed receipts of {money(review.receiptTotal)}. The previous amounts and source document are retained. No payment is collected or refunded.</p>
        {actor.role !== "OWNER" ? <p className="mt-3 text-sm">The current owner must complete this review.</p> : <form action={reviewJobFinancialBaseline.bind(null, id)} className="mt-4 grid gap-4">
          <input type="hidden" name="requestId" value={randomUUID()} /><input type="hidden" name="reviewedDigest" value={review.digest} />
          <label className="text-sm">Reviewed evidence bundle<select name="sourceFileId" required className={inputClass}><option value="">Select the reviewed PDF</option>{files.map(file => <option key={file.id} value={file.id}>{file.fileName}</option>)}</select></label>
          <label className="text-sm">Required deposit from the contract ($)<input type="number" name="requiredDeposit" defaultValue={accepted?.requiredDeposit} min="0" step="0.01" required className={inputClass} /><span className="mt-1 block text-xs text-muted-foreground">Enter 0 only if the reviewed contract requires no deposit. Do not invent a percentage.</span></label>
          <label className="text-sm">Review findings and explanation of any paid-amount difference<textarea name="reviewReason" minLength={20} maxLength={3000} rows={4} required className={inputClass} /></label>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="contractVerified" required className="mt-1" />I verified that the recorded contract includes all previously approved changes and that the deposit requirement matches the source documents.</label>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="receiptsComplete" required className="mt-1" />I verified that the completed receipt records and allocations are complete and correct, and reviewed the resulting job paid amount and balance shown above.</label>
          <Button type="submit">Adopt reviewed financial baseline</Button>
        </form>}
      </Panel>
    </>}
  </>;
}
