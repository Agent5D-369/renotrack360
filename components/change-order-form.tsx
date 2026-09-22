import { randomUUID } from "node:crypto";
import type { ChangeOrder } from "@prisma/client";
import Link from "next/link";
import { Button, Panel } from "@/components/ui";

export function ChangeOrderForm({ action, order, jobs, profiles, prices, defaults = {} }: {
  action: (data: FormData) => Promise<void>; order?: ChangeOrder;
  jobs: Array<{ id: string; jobName: string }>; profiles: Array<{ id: string; profileName: string }>;
  prices: Array<{ id: string; name: string; label: string }>;
  defaults?: { jobId?: string; clientProfileId?: string; title?: string; reason?: string; clientRequested?: boolean };
}) {
  const fieldClass = "mt-1 w-full rounded-md border border-border bg-white px-3 py-2";
  if (order && ["APPROVED", "COMPLETED"].includes(order.status)) return <Panel className="p-5"><p>This approved record is retained. Create a new adjustment to change its scope or price.</p><Link href="/change-orders/new" className="mt-3 inline-block text-primary underline">Create a new adjustment</Link></Panel>;
  return <Panel className="p-5"><form action={action} className="grid gap-4">
    <input type="hidden" name="requestId" value={randomUUID()} /><input type="hidden" name="expectedUpdatedAt" value={order?.updatedAt.toISOString() ?? ""} />
    <p className="text-sm">Saving creates or revises a draft. Issue a reviewed approval link from the detail page after the job financial review is complete. Editing revokes earlier pending links.</p>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm">Job<select name="jobId" required defaultValue={order?.jobId ?? defaults.jobId ?? ""} className={fieldClass}><option value="">Select job</option>{jobs.map(job => <option key={job.id} value={job.id}>{job.jobName}</option>)}</select></label>
      <label className="text-sm">Client<select name="clientProfileId" defaultValue={order?.clientProfileId ?? defaults.clientProfileId ?? ""} className={fieldClass}><option value="">Use job client</option>{profiles.map(profile => <option key={profile.id} value={profile.id}>{profile.profileName}</option>)}</select></label>
      <label className="text-sm">Title<input name="changeOrderTitle" required minLength={3} maxLength={180} defaultValue={order?.changeOrderTitle ?? defaults.title} className={fieldClass} /></label>
      <label className="text-sm">Draft status<select name="status" defaultValue={order?.status === "VOID" ? "VOID" : "DRAFT"} className={fieldClass}><option value="DRAFT">Draft</option><option value="VOID">Void</option></select></label>
      <label className="text-sm">Contract price change ($; negative for a credit)<input name="addedCost" type="number" step="0.01" required defaultValue={order?.addedCost.toString() ?? "0"} className={fieldClass} /></label>
      <label className="text-sm">Added time (days)<input name="addedTime" type="number" min="0" max="3650" step="1" required defaultValue={order?.addedTime ?? 0} className={fieldClass} /></label>
    </div>
    <label className="text-sm">Retained pricing scenario<select name="priceSnapshotId" defaultValue={order?.priceSnapshotId ?? ""} className={fieldClass}><option value="">Select before issuing a positive-price change</option>{prices.map(price => <option key={price.id} value={price.id}>{price.name} · {price.label}</option>)}</select></label>
    <p className="text-xs text-muted-foreground">The issued positive price must match its scenario. Change orders normally target approximately 42% gross margin. A credit or zero-price adjustment requires the owner to issue it. <Link href="/cost-intelligence/scenarios" className="text-primary underline">Create a pricing scenario</Link>.</p>
    <label className="text-sm">Client-facing scope, inclusions, exclusions and reason<textarea name="reason" required minLength={10} maxLength={5000} rows={5} defaultValue={order?.reason ?? defaults.reason} className={fieldClass} /></label>
    <label className="flex gap-2 text-sm"><input name="clientRequested" type="checkbox" defaultChecked={order?.clientRequested ?? defaults.clientRequested} />Requested by the client</label>
    <label className="text-sm">Internal field-condition notes<textarea name="fieldCondition" maxLength={5000} rows={3} defaultValue={order?.fieldCondition ?? ""} className={fieldClass} /></label>
    <label className="text-sm">Internal approval notes<textarea name="signatureApprovalNotes" maxLength={5000} rows={3} defaultValue={order?.signatureApprovalNotes ?? ""} className={fieldClass} /></label>
    <Button type="submit">Save change draft</Button>
  </form></Panel>;
}
