"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

// This is a client component because the form needs state for the submit/confirm flow.
// Data fetching for the approval is done via a fetch on mount.

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
  orgName?: string;
  jobName?: string;
  alreadyActed: boolean;
}

export default function ApprovePage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<ApprovalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signerName, setSignerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<"approved" | "declined" | null>(null);

  // Fetch approval details on mount
  useEffect(() => {
    fetch(`/api/approve/${token}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError("Could not load this approval request."); setLoading(false); });
  }, [token]);

  async function submit(decision: "approved" | "declined") {
    if (!signerName.trim()) { setError("Please enter your name to proceed."); return; }
    setSubmitting(true);
    setError("");
    const res = await fetch(`/api/approve/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, signerName }),
    });
    if (res.ok) {
      setResult(decision);
    } else {
      const d = await res.json();
      setError(d.error ?? "Something went wrong. Please try again.");
    }
    setSubmitting(false);
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
              ? "Your approval has been recorded. Your contractor will proceed with the agreed scope."
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
    <div className="min-h-screen bg-slate-50 px-4 py-10" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="mx-auto max-w-lg space-y-5">
        {/* Header */}
        <div>
          {data.orgName && <p className="text-xs font-bold text-[#183d29]">{data.orgName}</p>}
          <h1 className="mt-1 text-2xl font-black text-[#0f172a]">Approval Request</h1>
          {data.jobName && <p className="mt-1 text-sm text-muted-foreground">{data.jobName}</p>}
        </div>

        {/* Document summary */}
        <div className="rounded-xl border border-border bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{data.approvalType}</p>

          {data.changeOrderTitle && (
            <>
              <h2 className="mt-2 text-xl font-black text-[#0f172a]">{data.changeOrderTitle}</h2>
              {data.addedCost !== undefined && data.addedCost > 0 && (
                <div className="mt-3 flex items-center gap-3">
                  <div className="rounded-lg bg-amber-50 px-4 py-2">
                    <p className="text-xs text-amber-700">Added cost</p>
                    <p className="text-xl font-black text-amber-900">+${data.addedCost.toLocaleString()}</p>
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
                <p className="mt-1 text-2xl font-black text-[#183d29]">${data.total.toLocaleString()}</p>
              )}
            </>
          )}
        </div>

        {/* Signature form */}
        <div className="rounded-xl border border-border bg-white p-5">
          <label className="mb-2 block text-sm font-bold">
            Your full name (serves as your electronic signature)
          </label>
          <input
            type="text"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="Enter your full name"
            className="h-11 w-full rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-[#183d29]"
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
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
