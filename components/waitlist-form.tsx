"use client";

import { useEffect, useRef, useState } from "react";

type Plan = "STARTER" | "PRO" | "COMMAND_CENTER" | "";

interface Tracking {
  referralCode?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
}

function readTracking(): Tracking {
  try {
    const params = new URLSearchParams(window.location.search);
    const stored: Tracking = JSON.parse(sessionStorage.getItem("rt360_tracking") || "{}");
    const fresh: Tracking = {
      referralCode: params.get("ref") || params.get("aff") || stored.referralCode || undefined,
      utmSource: params.get("utm_source") || stored.utmSource || undefined,
      utmMedium: params.get("utm_medium") || stored.utmMedium || undefined,
      utmCampaign: params.get("utm_campaign") || stored.utmCampaign || undefined,
      utmTerm: params.get("utm_term") || stored.utmTerm || undefined,
    };
    const merged = Object.fromEntries(Object.entries(fresh).filter(([, v]) => v));
    if (Object.keys(merged).length) sessionStorage.setItem("rt360_tracking", JSON.stringify(merged));
    return fresh;
  } catch {
    return {};
  }
}

const STORAGE_KEY = "rt360_waitlist_confirmed";

function readConfirmed(): { position: number; email: string } | null {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); }
  catch { return null; }
}

function saveConfirmed(position: number, email: string) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ position, email })); }
  catch { /* ignore */ }
}

export function WaitlistForm({
  planDefault = "" as Plan,
  size = "default",
  theme = "dark",
}: {
  planDefault?: Plan;
  size?: "default" | "large";
  theme?: "dark" | "light";
}) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [plan, setPlan] = useState<Plan>(planDefault);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ position: number; already?: boolean } | null>(null);
  const [error, setError] = useState("");
  const tracking = useRef<Tracking>({});

  useEffect(() => {
    tracking.current = readTracking();
    // If already submitted in this session/browser, show confirmed state immediately
    const confirmed = readConfirmed();
    if (confirmed) setResult({ position: confirmed.position });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName, planInterest: plan, ...tracking.current }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong. Try again."); return; }
      saveConfirmed(data.position, email);
      setResult(data);
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const isLarge = size === "large";
  const isLight = theme === "light";

  if (result) {
    return (
      <div className={`rounded-xl border border-green-200 bg-green-50 p-6 text-center ${isLarge ? "py-10" : ""}`}>
        <p className="text-2xl font-black text-green-700">You&apos;re #{result.position} on the list.</p>
        <p className="mt-2 text-base text-green-800">
          {result.already
            ? "You're already on the list. We'll email you when the founding offer opens."
            : `We'll email you at ${email} when the founding offer opens. Tell a contractor friend. The first 100 companies lock pricing forever.`}
        </p>
      </div>
    );
  }

  // Use solid colors for all form elements: browsers frequently override
  // semi-transparent backgrounds (bg-white/15) on inputs/selects with system
  // defaults, which makes white text invisible.
  const inputClass = isLight
    ? `rounded-lg border border-gray-300 bg-white px-4 text-gray-900 placeholder:text-gray-400 shadow-sm outline-none focus:border-[#183d29] focus:ring-1 focus:ring-[#183d29]/20 ${isLarge ? "h-14 text-base" : "h-12 text-base"}`
    : `rounded-lg border border-white/25 bg-[#1a4a35] px-4 text-white placeholder:text-white/55 outline-none focus:border-white/60 focus:ring-0 ${isLarge ? "h-14 text-base" : "h-12 text-base"}`;

  const selectClass = isLight
    ? `rounded-lg border border-gray-300 bg-white px-4 text-gray-900 shadow-sm outline-none focus:border-[#183d29] focus:ring-1 focus:ring-[#183d29]/20 ${isLarge ? "h-14 text-base" : "h-12 text-base"}`
    : `rounded-lg border border-white/25 bg-[#1a4a35] px-4 text-white outline-none focus:border-white/60 ${isLarge ? "h-14 text-base" : "h-12 text-base"}`;

  const buttonClass = isLight
    ? `rounded-lg bg-[#183d29] font-black text-white transition hover:bg-[#1e4d35] disabled:opacity-60 ${isLarge ? "h-14 text-base" : "h-12 text-base"}`
    : `rounded-lg bg-white font-black text-[#183d29] transition hover:bg-green-50 disabled:opacity-60 ${isLarge ? "h-14 text-base" : "h-12 text-base"}`;

  const subTextClass = isLight
    ? "text-center text-sm text-gray-400"
    : "text-center text-sm text-white/65";

  const errorClass = isLight
    ? "text-sm font-semibold text-red-600"
    : "text-sm font-semibold text-red-300";

  return (
    <form onSubmit={submit} className="grid gap-3">
      <div className={`grid gap-3 ${isLarge ? "md:grid-cols-2" : ""}`}>
        <input
          type="text"
          placeholder="First name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className={inputClass}
        />
        <input
          required
          type="email"
          placeholder="Work email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </div>
      <select
        value={plan}
        onChange={(e) => setPlan(e.target.value as Plan)}
        className={selectClass}
      >
        <option value="">Which plan interests you? (optional)</option>
        <option value="STARTER">Starter · $149/mo</option>
        <option value="PRO">Pro · $349/mo (most popular)</option>
        <option value="COMMAND_CENTER">Command Center · $699/mo</option>
      </select>
      {error && <p className={errorClass}>{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className={buttonClass}
      >
        {loading ? "Saving your spot..." : "Get Early Access →"}
      </button>
      <p className={subTextClass}>No credit card. No spam. Unsubscribe anytime.</p>
    </form>
  );
}
