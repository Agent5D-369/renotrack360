"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { calculateBillingMilestones } from "@/lib/billing-schedule";

interface ApprovalData {
  id: string;
  approvalType: string;
  status: string;
  changeOrderTitle?: string;
  addedCost?: number;
  addedTime?: number;
  reason?: string;
  estimateNumber?: string;
  total?: number;
  title?: string;
  clientName?: string;
  address?: string;
  scope?: string;
  exclusions?: string;
  allowances?: string;
  schedule?: string;
  paymentSchedule?: string;
  warranty?: string;
  requiredDeposit?: string;
  billingMilestones?: Array<{ key: string; label: string; percent: string; triggerEvent: string; clientDescription: string }>;
  documentUrl?: string;
  orgName?: string;
  orgLogoUrl?: string | null;
  orgBrandColor?: string | null;
  orgTagline?: string | null;
  jobName?: string;
  alreadyActed: boolean;
  reviewedDigest: string;
  expiresAt: string;
  scheduleNote: string;
}

function BrandBar({ data, docLabel }: { data: { orgName?: string; orgLogoUrl?: string | null; orgBrandColor?: string | null; orgTagline?: string | null }; docLabel: string }) {
  const bg = data.orgBrandColor ?? "#183d29";
  return (
    <header style={{ backgroundColor: bg }} className="w-full">
      <div className="mx-auto flex max-w-2xl items-center gap-4 px-6 py-4">
        {data.orgLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.orgLogoUrl} alt={data.orgName ?? "Logo"} className="h-9 max-w-[160px] object-contain" />
        ) : (
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-white/20 text-sm font-black text-white">
              {(data.orgName ?? "RT").slice(0, 2).toUpperCase()}
            </div>
            <p className="text-sm font-bold text-white">{data.orgName}</p>
          </div>
        )}
        {data.orgLogoUrl && data.orgName && (
          <div className="border-l border-white/20 pl-4">
            <p className="text-sm font-bold text-white">{data.orgName}</p>
            {data.orgTagline && <p className="text-xs text-white/60">{data.orgTagline}</p>}
          </div>
        )}
        <div className="ml-auto">
          <p className="text-xs font-black uppercase tracking-wider text-white/60">{docLabel}</p>
        </div>
      </div>
    </header>
  );
}

export default function ApprovePage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<ApprovalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signerName, setSignerName] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<"approved" | "declined" | null>(null);

  // Fetch approval details on mount
  useEffect(() => {
    fetch(`/api/approve/${token}`)
      .then(async (r) => { const value = await r.json(); if (!r.ok) throw new Error(value.error ?? "Approval unavailable."); return value; })
      .then((d) => { setData(d); setLoading(false); })
      .catch((error: Error) => { setError(error.message); setLoading(false); });
  }, [token]);

  async function submit(decision: "approved" | "declined") {
    if (!signerName.trim()) { setError("Please enter your name to proceed."); return; }
    if (!reviewed) { setError("Confirm that you reviewed this scope and price before responding."); return; }
    setSubmitting(true);
    setError("");
    try {
    const res = await fetch(`/api/approve/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, signerName, reviewed, reviewedDigest: data?.reviewedDigest }),
    });
    if (res.ok) {
      setResult(decision);
    } else {
      const d = await res.json();
      setError(d.error ?? "Something went wrong. Please try again.");
    }
    } catch {
      setError("The response could not be confirmed. Please try again; a recorded response will not be applied twice.");
    } finally { setSubmitting(false); }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-muted-foreground">Loading approval request...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-bold text-red-800">Unable to load this approval</p>
          <p className="mt-2 text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  if (result || data.alreadyActed) {
    const wasApproved = result === "approved" || data.status === "APPROVED";
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className={`rounded-xl border p-8 text-center max-w-sm w-full ${wasApproved ? "border-green-200 bg-green-50" : "border-slate-200 bg-white"}`}>
          <p className="text-2xl">{wasApproved ? "✓" : "✗"}</p>
          <p className="mt-3 text-lg font-black">
            {wasApproved ? "Approved" : "Declined"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {wasApproved
              ? `Your approval has been retained with this scope and price. ${data.orgName ?? "Your contractor"} will confirm the work schedule.`
              : "Your response has been recorded. Your contractor will be in touch to discuss next steps."}
          </p>
          {data.orgName && (
            <p className="mt-4 text-xs text-muted-foreground">- {data.orgName}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <BrandBar data={data} docLabel="Approval Request" />
      <div className="mx-auto max-w-lg space-y-5 px-4 py-10">
        <div>
          <h1 className="text-2xl font-black text-[#0f172a]">Approval Request</h1>
          {data.jobName && <p className="mt-1 text-sm text-muted-foreground">{data.jobName}</p>}
        </div>

        {/* Document summary */}
        <div className="rounded-xl border border-border bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{data.approvalType}</p>

          {data.changeOrderTitle && (
            <>
              <h2 className="mt-2 text-xl font-black text-[#0f172a]">{data.changeOrderTitle}</h2>
              {data.addedCost !== undefined && (
                <div className="mt-3 flex items-center gap-3">
                  <div className="rounded-lg bg-amber-50 px-4 py-2">
                    <p className="text-xs text-amber-700">Contract price change</p>
                    <p className="text-xl font-black text-amber-900">{data.addedCost.toLocaleString("en-US", { style: "currency", currency: "USD" })}</p>
                  </div>
                  {data.addedTime !== undefined && data.addedTime > 0 && (
                    <div className="rounded-lg bg-slate-100 px-4 py-2">
                      <p className="text-xs text-muted-foreground">Added time</p>
                      <p className="text-xl font-black">+{data.addedTime}d</p>
                    </div>
                  )}
                </div>
              )}
              {data.reason && (
                <div className="mt-3 rounded-md bg-slate-50 p-3">
                  <p className="text-xs font-bold uppercase text-muted-foreground">Reason</p>
                  <p className="mt-1 text-sm">{data.reason}</p>
                </div>
              )}
            </>
          )}

          {data.estimateNumber && (
            <>
              <h2 className="mt-2 text-xl font-black text-[#0f172a]">Estimate {data.estimateNumber}</h2>
              {data.total !== undefined && (
                <p className="mt-1 text-2xl font-black text-[#183d29]">{data.total.toLocaleString("en-US", { style: "currency", currency: "USD" })}</p>
              )}
            </>
          )}
        </div>

        {/* Signature form */}
        {data.approvalType === "ESTIMATE" && <div className="rounded-xl border border-border bg-white p-5"><h2 className="font-bold">{data.title}</h2><p className="mt-2 text-sm">{data.clientName} · {data.address}</p>{([['Scope',data.scope],['Exclusions',data.exclusions],['Allowances and selections',data.allowances],['Schedule assumptions',data.schedule],['Payment schedule and change procedure',data.paymentSchedule],['Warranty and contract terms',data.warranty]] as const).map(([label,value]) => <section className="mt-4" key={label}><h3 className="text-sm font-bold">{label}</h3><p className="mt-1 whitespace-pre-wrap text-sm">{value}</p></section>)}{data.billingMilestones?.length ? <section className="mt-5"><h3 className="text-sm font-bold">Retained payment milestones</h3><div className="mt-2 space-y-2">{calculateBillingMilestones(String(data.total), data.billingMilestones).map(milestone => <div key={milestone.key} className="rounded-md border border-border bg-slate-50 p-3"><div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold">{milestone.label}</p><p className="shrink-0 text-sm font-bold">{Number(milestone.amount).toLocaleString("en-US", { style: "currency", currency: "USD" })} · {milestone.percent}%</p></div><p className="mt-1 text-sm">Eligible when: {milestone.triggerEvent}</p>{milestone.clientDescription && <p className="mt-1 text-xs text-muted-foreground">{milestone.clientDescription}</p>}</div>)}</div></section> : <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">This retained proposal does not include a structured milestone schedule. Contact {data.orgName ?? "your contractor"} before approving if the payment timing is unclear.</p>}<p className="mt-4 text-sm font-semibold">Documented deposit: {Number(data.requiredDeposit).toLocaleString("en-US",{style:"currency",currency:"USD"})}</p><a href={data.documentUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block font-semibold text-primary underline">Open the complete reviewed proposal PDF</a><p className="mt-2 text-xs text-muted-foreground">Read the complete document before responding. Contact {data.orgName ?? "your contractor"} to resolve any difference or unanswered question.</p></div>}
        <div className="rounded-xl border border-border bg-white p-5">
          <label className="mb-2 block text-sm font-bold">
            Your full name for this response
          </label>
          <input
            type="text"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="Enter your full name"
            className="h-11 w-full rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-[#183d29]"
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <label className="mt-3 flex items-start gap-2 text-sm"><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} className="mt-1" />{data.approvalType === "ESTIMATE" ? "I reviewed the complete proposal PDF and the scope, exclusions, allowances, price, payment schedule, warranty and schedule assumptions shown above." : "I reviewed the scope, price change and time impact shown above."}</label>
          <p className="mt-3 text-xs text-muted-foreground">{data.scheduleNote}</p>
          <p className="mt-2 text-xs text-muted-foreground">Link expires {new Date(data.expiresAt).toLocaleDateString()}.</p>
          <p className="mt-3 text-xs text-muted-foreground">
            By clicking Approve below, you confirm your agreement to the scope and cost described above.
            This constitutes your electronic approval.
          </p>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => submit("declined")}
            disabled={submitting}
            className="h-12 rounded-xl border border-border text-sm font-semibold text-muted-foreground transition hover:bg-muted disabled:opacity-50"
          >
            Decline
          </button>
          <button
            onClick={() => submit("approved")}
            disabled={submitting}
            className="h-12 rounded-xl bg-[#183d29] text-sm font-black text-white transition hover:bg-[#1e4d35] disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Approve"}
          </button>
        </div>
      </div>
    </div>
  );
}
