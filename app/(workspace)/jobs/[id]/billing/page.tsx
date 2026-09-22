import Link from "next/link";
import { randomUUID } from "node:crypto";
import { createMilestoneInvoiceDraft } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { Button, Panel } from "@/components/ui";
import { FinancialRecordError } from "@/lib/finance-lock";
import { money } from "@/lib/format";
import { milestoneBillingReviewData } from "@/lib/milestone-billing";
import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-access";

export default async function JobBillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const actor = await requireStaffPage();
  const { id } = await params;
  const query = await searchParams;
  let review: Awaited<ReturnType<typeof milestoneBillingReviewData>>;

  try {
    review = await milestoneBillingReviewData(prisma, actor.id, id);
  } catch (error) {
    if (!(error instanceof FinancialRecordError)) throw error;
    return <>
      <PageHeader title="Milestone billing" body="Prepare invoice drafts from the exact payment schedule accepted by the client." />
      <Link href={`/jobs/${id}`} className="mb-4 inline-block text-sm font-semibold text-primary">← Job</Link>
      <Panel className="p-5">
        <h2 className="font-semibold">Billing prerequisites are incomplete</h2>
        <p className="mt-2 text-sm">{error.message}</p>
        <p className="mt-2 text-sm text-muted-foreground">This job needs a retained client-accepted milestone schedule and an owner-reviewed financial baseline before an invoice draft can be prepared. Older proposals are not changed automatically.</p>
        <Link href={`/jobs/${id}/financial-review`} className="mt-4 inline-block text-sm font-semibold text-primary underline">Review financial prerequisites</Link>
      </Panel>
    </>;
  }

  const field = "mt-1 block w-full rounded border border-border bg-white p-2";
  return <>
    <PageHeader title={`Milestone billing: ${review.job.jobName}`} body="Review the retained client schedule and prepare an invoice draft for an actually reached milestone." />
    <div className="mb-4 flex flex-wrap gap-4 text-sm font-semibold"><Link href={`/jobs/${id}`} className="text-primary">← Job</Link><Link href={`/jobs/${id}/financial-review`} className="text-primary underline">Financial review</Link></div>
    {query.error && <p role="alert" className="mb-5 rounded border border-amber-300 bg-amber-50 p-3 text-sm">{query.error}</p>}
    {query.flash && <p className="mb-5 rounded border border-green-300 bg-green-50 p-3 text-sm">{query.flash}</p>}
    <Panel className="mb-5 p-5">
      <h2 className="font-semibold">Accepted payment schedule</h2>
      <p className="mt-2 text-sm text-muted-foreground">These amounts and triggers come from the retained client acceptance. Preparing a draft does not send an invoice, verify payment, or claim that a milestone happened automatically.</p>
    </Panel>
    <div className="grid gap-5">
      {review.milestones.map(milestone => <Panel key={milestone.key} className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="font-semibold">{milestone.label}</h2><p className="mt-1 text-sm">{milestone.percent}% of accepted contract · {money(milestone.amount)}</p></div>
          <p className="rounded bg-muted px-3 py-1 text-xs font-semibold">{milestone.invoiceDraft ? "Invoice prepared" : "No invoice draft"}</p>
        </div>
        <p className="mt-3 text-sm"><span className="font-semibold">Contract trigger:</span> {milestone.triggerEvent}</p>
        {milestone.clientDescription && <p className="mt-1 text-sm text-muted-foreground">{milestone.clientDescription}</p>}
        {milestone.invoiceDraft ? <div className="mt-4 rounded-md border border-border bg-muted/40 p-3 text-sm"><p className="font-semibold">Invoice {milestone.invoiceDraft.invoiceNumber} · {milestone.invoiceDraft.status}</p><p className="mt-1">Amount {money(milestone.invoiceDraft.total)}{milestone.invoiceDraft.dueDate ? ` · Due ${new Date(milestone.invoiceDraft.dueDate).toISOString().slice(0, 10)}` : " · No due date recorded"}</p><Link href={`/invoices/${milestone.invoiceDraft.id}`} className="mt-2 inline-block font-semibold text-primary underline">Open invoice</Link></div> : actor.role !== "OWNER" ? <p className="mt-4 text-sm">The current owner must review the trigger and prepare this invoice draft.</p> : <form action={createMilestoneInvoiceDraft.bind(null, id)} className="mt-4 grid gap-4 border-t border-border pt-4">
          <input type="hidden" name="requestId" value={randomUUID()} />
          <input type="hidden" name="milestoneKey" value={milestone.key} />
          <input type="hidden" name="reviewedDigest" value={review.digest} />
          <label className="text-sm">Invoice number<input name="invoiceNumber" required maxLength={80} className={field} /></label>
          <label className="text-sm">Due date <span className="text-muted-foreground">(optional)</span><input name="dueDate" type="date" className={field} /></label>
          <label className="text-sm">Owner review notes<textarea name="reviewReason" required minLength={20} maxLength={3000} rows={3} className={field} placeholder="Record the evidence reviewed and why this contract trigger has been reached." /></label>
          <label className="flex items-start gap-2 text-sm"><input name="triggerVerified" type="checkbox" required className="mt-1" />I reviewed current project evidence and verified that “{milestone.triggerEvent}” has actually occurred. Prepare an invoice draft only.</label>
          <Button type="submit">Prepare draft invoice for {milestone.label}</Button>
        </form>}
      </Panel>)}
    </div>
  </>;
}
