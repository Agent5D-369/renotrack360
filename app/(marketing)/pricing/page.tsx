"use client";

import { useState } from "react";
import { PLAN_CONFIG, type PlanKey } from "@/lib/stripe";

const STRIPE_CONFIGURED = !!(
  typeof window === "undefined"
    ? process.env.STRIPE_SECRET_KEY
    : true
);

function fmt(cents: number) {
  return `$${(cents / 100).toLocaleString()}`;
}

function PlanCard({
  planKey,
  billing,
  featured
}: {
  planKey: PlanKey;
  billing: "monthly" | "annual";
  featured?: boolean;
}) {
  const plan = PLAN_CONFIG[planKey];
  const [loading, setLoading] = useState(false);

  const price = billing === "monthly" ? plan.monthlyPrice : plan.annualPrice;
  const foundingPrice = planKey === "PRO" && billing === "annual" ? (plan as typeof PLAN_CONFIG.PRO).foundingAnnualPrice : null;

  async function handleCheckout() {
    setLoading(true);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: planKey, billing })
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else { alert("Billing not configured yet. Contact support."); setLoading(false); }
  }

  const monthly = billing === "annual" ? Math.round(price / 12) : price;

  return (
    <div className={`relative flex flex-col rounded-2xl border p-8 ${featured ? "border-[#183d29] bg-[#183d29] text-white shadow-xl scale-105" : "border-border bg-white shadow-soft"}`}>
      {featured && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-4 py-1 text-xs font-black uppercase tracking-wider text-white">
          Most popular
        </div>
      )}
      <p className={`text-sm font-black uppercase tracking-wider ${featured ? "text-white/70" : "text-muted-foreground"}`}>{plan.label}</p>
      <div className="mt-3 flex items-end gap-1">
        <span className="text-4xl font-black">{fmt(monthly)}</span>
        <span className={`mb-1 text-sm ${featured ? "text-white/60" : "text-muted-foreground"}`}>/mo</span>
      </div>
      {billing === "annual" && (
        <div className="mt-1">
          {foundingPrice ? (
            <p className="text-sm">
              <span className={`line-through ${featured ? "text-white/40" : "text-muted-foreground"}`}>{fmt(price)}/yr</span>
              {" "}
              <span className={`font-bold ${featured ? "text-orange-300" : "text-orange-600"}`}>{fmt(foundingPrice)}/yr — founding price</span>
            </p>
          ) : (
            <p className={`text-sm ${featured ? "text-white/60" : "text-muted-foreground"}`}>{fmt(price)}/yr billed annually</p>
          )}
        </div>
      )}
      <ul className="mt-6 grid gap-2 flex-1">
        {plan.features.map((f) => (
          <li key={f} className={`flex items-start gap-2 text-sm ${featured ? "text-white/90" : ""}`}>
            <svg className={`mt-0.5 h-4 w-4 shrink-0 ${featured ? "text-orange-300" : "text-green-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            {f}
          </li>
        ))}
      </ul>
      <button
        onClick={handleCheckout}
        disabled={loading}
        className={`mt-8 h-11 w-full rounded-lg text-sm font-bold transition-opacity disabled:opacity-60 ${featured ? "bg-white text-[#183d29] hover:opacity-90" : "bg-[#183d29] text-white hover:opacity-90"}`}
      >
        {loading ? "Redirecting…" : "Start 14-day free trial"}
      </button>
      <p className={`mt-3 text-center text-xs ${featured ? "text-white/50" : "text-muted-foreground"}`}>No credit card required to start</p>
    </div>
  );
}

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");

  return (
    <main className="min-h-screen bg-[#f8f6f3] px-4 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-wider text-[#183d29]">Pricing</p>
          <h1 className="mt-2 text-4xl font-black text-foreground">Simple, contractor-focused pricing</h1>
          <p className="mt-3 text-lg text-muted-foreground">Capture the money you already earn. No per-job fees, no surprises.</p>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-sm font-bold text-orange-700">
            First 100 founding contractors lock Pro pricing for 24 months
          </div>
        </div>

        {/* Billing toggle */}
        <div className="mt-10 flex justify-center">
          <div className="flex items-center gap-1 rounded-full border border-border bg-white p-1 shadow-sm">
            <button onClick={() => setBilling("monthly")} className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${billing === "monthly" ? "bg-[#183d29] text-white" : "text-muted-foreground hover:text-foreground"}`}>Monthly</button>
            <button onClick={() => setBilling("annual")} className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${billing === "annual" ? "bg-[#183d29] text-white" : "text-muted-foreground hover:text-foreground"}`}>
              Annual <span className="ml-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">Save ~30%</span>
            </button>
          </div>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3 items-center">
          <PlanCard planKey="STARTER" billing={billing} />
          <PlanCard planKey="PRO" billing={billing} featured />
          <PlanCard planKey="COMMAND_CENTER" billing={billing} />
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          30-day money-back guarantee · No long-term contracts · Field Lite users always free
        </p>
      </div>
    </main>
  );
}
