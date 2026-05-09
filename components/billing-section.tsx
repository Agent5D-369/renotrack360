"use client";

import { useState } from "react";
import type { Subscription } from "@prisma/client";
import { PLAN_CONFIG } from "@/lib/stripe";

const PLAN_LABELS: Record<string, string> = {
  STARTER: "Starter",
  PRO: "Pro",
  COMMAND_CENTER: "Command Center",
  SOLO: "Solo",
  TEAM: "Team",
  ENTERPRISE: "Enterprise"
};

export function BillingSection({ subscription }: { subscription: Subscription | null }) {
  const [portalLoading, setPortalLoading] = useState(false);

  async function openPortal() {
    setPortalLoading(true);
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else { alert("Billing portal not available. Contact support."); setPortalLoading(false); }
  }

  const planLabel = subscription ? (PLAN_LABELS[subscription.planTier] ?? subscription.planTier) : "Free trial";
  const statusLabel = subscription?.status ?? "TRIALING";
  const trialEnd = subscription?.trialEndsAt;
  const periodEnd = subscription?.currentPeriodEnd;

  return (
    <div className="mt-6">
      <h2 className="mb-3 text-lg font-bold">Billing &amp; subscription</h2>
      <div className="rounded-lg border border-border bg-white p-5 shadow-soft">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-bold">{planLabel} plan</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {statusLabel === "TRIALING" && trialEnd
                ? `Free trial ends ${new Date(trialEnd).toLocaleDateString()}`
                : statusLabel === "ACTIVE" && periodEnd
                ? `Renews ${new Date(periodEnd).toLocaleDateString()}`
                : statusLabel === "PAST_DUE"
                ? "⚠️ Payment past due — update billing to continue"
                : statusLabel === "CANCELED"
                ? "Subscription canceled"
                : "Active"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {subscription?.stripeCustomerId && (
              <button onClick={openPortal} disabled={portalLoading}
                className="h-9 rounded-md border border-border px-4 text-sm font-semibold hover:bg-muted disabled:opacity-60">
                {portalLoading ? "Opening…" : "Manage billing →"}
              </button>
            )}
            <a href="/pricing"
              className="h-9 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground hover:opacity-90 flex items-center">
              {subscription?.status === "TRIALING" ? "Upgrade plan" : "Change plan"}
            </a>
          </div>
        </div>

        {(!subscription || statusLabel === "TRIALING") && (
          <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
            <strong>Founding contractor offer:</strong> First 100 contractors lock Pro at $2,500/yr (save $1,000).
            {" "}<a href="/pricing" className="underline font-semibold">Claim it →</a>
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4">
          {["STARTER", "PRO", "COMMAND_CENTER"].map((key) => {
            const cfg = PLAN_CONFIG[key as keyof typeof PLAN_CONFIG];
            const isCurrent = subscription?.planTier === key;
            return (
              <div key={key} className={`rounded-md border p-3 text-center text-xs ${isCurrent ? "border-primary/40 bg-primary/5" : "border-border"}`}>
                <p className="font-bold">{cfg.label}</p>
                <p className="text-muted-foreground mt-0.5">${cfg.monthlyPrice / 100}/mo</p>
                {isCurrent && <p className="mt-1 text-[10px] font-black text-primary uppercase tracking-wide">Current plan</p>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
