"use client";

import { useState, useRef, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Answers {
  jobsPerYear: number;
  extrasPerJob: number;
  hourlyRate: number;
  extrasInvoiced: number;   // percent 0-100
  reportMinutesPerWeek: number;
  avgJobValue: number;
  hardInvoicesPerYear: number;
  referralsOutOf10: number;
}

interface LeakResult {
  scopeLeak: number;
  reportLeak: number;
  invoiceLeak: number;
  referralLeak: number;
  total: number;
}

// ─── Math ─────────────────────────────────────────────────────────────────────

function calculate(a: Answers): LeakResult {
  // 1. Unbilled scope creep
  //    Each extra averages 2.5 hours of work. The % not invoiced is the leak.
  const scopeLeak = a.jobsPerYear * a.extrasPerJob * 2.5 * ((100 - a.extrasInvoiced) / 100) * a.hourlyRate;

  // 2. Report-writing opportunity cost
  //    Time spent writing reports = time not billing or bidding.
  const reportHoursPerYear = (a.reportMinutesPerWeek * 52) / 60;
  const reportLeak = reportHoursPerYear * a.hourlyRate;

  // 3. Invoice follow-up drag
  //    Each hard invoice takes ~2.5 hours of follow-up chasing.
  const invoiceLeak = a.hardInvoicesPerYear * 2.5 * a.hourlyRate;

  // 4. Referral revenue gap
  //    Industry benchmark: 30% of satisfied clients refer unprompted.
  //    Each missed referral = avg job value × 40% contribution margin.
  const currentReferralRate = a.referralsOutOf10 / 10;
  const benchmarkReferralRate = 0.30;
  const missedReferrals = a.jobsPerYear * Math.max(0, benchmarkReferralRate - currentReferralRate);
  const referralLeak = missedReferrals * a.avgJobValue * 0.40;

  const total = scopeLeak + reportLeak + invoiceLeak + referralLeak;
  return { scopeLeak, reportLeak, invoiceLeak, referralLeak, total };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function AnimatedNumber({ target }: { target: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 1400;
    const startTime = performance.now();
    function step(now: number) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, [target]);
  return <>{fmt(display)}</>;
}

// ─── Question components ──────────────────────────────────────────────────────

function NumberInput({ value, onChange, prefix, placeholder, min = 0, max }: {
  value: number | ""; onChange: (v: number) => void; prefix?: string; placeholder?: string; min?: number; max?: number;
}) {
  // Local string state so intermediate/empty values don't fight the controlled prop.
  // type="number" suppresses onChange when the field is blank, causing first-char edits to get stuck.
  const [raw, setRaw] = useState<string>(value === "" || value === 0 ? "" : String(value));

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const s = e.target.value.replace(/[^0-9.]/g, "");
    setRaw(s);
    const n = parseFloat(s);
    if (!isNaN(n) && n >= min && (max === undefined || n <= max)) onChange(n);
    else if (s === "") onChange(0);
  }

  function handleBlur() {
    const n = parseFloat(raw);
    if (isNaN(n) || raw === "") setRaw("");
    else setRaw(String(n));
  }

  return (
    <div className="flex items-center gap-0">
      {prefix && (
        <span className="flex h-14 items-center rounded-l-xl border border-r-0 border-white/20 bg-white/10 px-4 text-lg font-bold text-white/60">
          {prefix}
        </span>
      )}
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={raw}
        placeholder={placeholder}
        onChange={handleChange}
        onBlur={handleBlur}
        className={`h-14 w-full border border-white/20 bg-white/10 px-4 text-lg font-bold text-white outline-none placeholder:text-white/30 focus:border-green-400 focus:ring-0 ${prefix ? "rounded-r-xl" : "rounded-xl"}`}
      />
    </div>
  );
}

function SliderInput({ value, onChange, min, max, step = 1, label }: {
  value: number; onChange: (v: number) => void; min: number; max: number; step?: number; label: (v: number) => string;
}) {
  return (
    <div className="space-y-3">
      <div className="text-center text-3xl font-black text-white">{label(value)}</div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-3 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-green-400"
      />
      <div className="flex justify-between text-xs text-white/30">
        <span>{label(min)}</span>
        <span>{label(max)}</span>
      </div>
    </div>
  );
}

// ─── Questions config ─────────────────────────────────────────────────────────

const QUESTIONS = [
  {
    id: "jobsPerYear",
    tag: "Your volume",
    headline: "How many renovation jobs do you finish in a typical year?",
    sublabel: "Count every project you close, big or small.",
    type: "number" as const,
    placeholder: "12",
    defaultValue: 12,
    min: 1,
  },
  {
    id: "extrasPerJob",
    tag: "Scope creep",
    headline: "On a typical job, how many times does a client ask for something outside the original scope?",
    sublabel: "The \"while you're at it\" requests. Verbal ones count.",
    type: "slider" as const,
    min: 0,
    max: 15,
    defaultValue: 3,
    sliderLabel: (v: number) => v === 0 ? "Never" : v === 1 ? "1 time" : `${v} times`,
  },
  {
    id: "hourlyRate",
    tag: "Your rate",
    headline: "What is your average charge-out rate per hour?",
    sublabel: "What you bill clients for labor, not your net pay.",
    type: "number" as const,
    prefix: "$",
    placeholder: "95",
    defaultValue: 95,
    min: 25,
  },
  {
    id: "extrasInvoiced",
    tag: "What gets billed",
    headline: "Honestly, what percentage of those extras actually make it to a change order or invoice?",
    sublabel: "Most contractors bill less than half. No judgment here.",
    type: "slider" as const,
    min: 0,
    max: 100,
    defaultValue: 25,
    sliderLabel: (v: number) => `${v}%`,
  },
  {
    id: "reportMinutesPerWeek",
    tag: "Your time",
    headline: "How many minutes per week do you spend writing client update emails or progress reports?",
    sublabel: "Add up all the texts, emails, and calls where you explain where the job stands.",
    type: "slider" as const,
    min: 0,
    max: 300,
    step: 10,
    defaultValue: 120,
    sliderLabel: (v: number) => v < 60 ? `${v} min` : `${Math.floor(v / 60)}h ${v % 60 > 0 ? `${v % 60}m` : ""}`.trim(),
  },
  {
    id: "avgJobValue",
    tag: "Job size",
    headline: "What is your average job contract value?",
    sublabel: "Rough average across all the projects you completed last year.",
    type: "number" as const,
    prefix: "$",
    placeholder: "45000",
    defaultValue: 45000,
    min: 1000,
  },
  {
    id: "hardInvoicesPerYear",
    tag: "Getting paid",
    headline: "How many invoices last year needed more than two follow-up attempts before they got paid?",
    sublabel: "The ones where you had to chase. Even good clients count.",
    type: "slider" as const,
    min: 0,
    max: 20,
    defaultValue: 5,
    sliderLabel: (v: number) => v === 0 ? "None" : v === 1 ? "1 invoice" : `${v} invoices`,
  },
  {
    id: "referralsOutOf10",
    tag: "Referrals",
    headline: "Out of your last 10 finished jobs, how many clients sent you a referral?",
    sublabel: "Unprompted referrals or direct \"call my contractor\" introductions.",
    type: "slider" as const,
    min: 0,
    max: 10,
    defaultValue: 2,
    sliderLabel: (v: number) => v === 0 ? "None" : v === 1 ? "1 client" : `${v} clients`,
  },
];

// ─── Share helpers ────────────────────────────────────────────────────────────

const CALC_URL = "https://renotrack360.com/profit-leak";

function useCopyState() {
  const [copied, setCopied] = useState(false);
  function copy(text: string) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback for older browsers / non-HTTPS
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return { copied, copy };
}

// Moment 1 - appears RIGHT after the big number, before breakdown.
// Compact. One-click copy. Goal: receiver runs the calculator too.
function ShareAtPeak({ result }: { result: LeakResult }) {
  const { copied, copy } = useCopyState();
  const shareText = `My renovation business leaks ${fmt(result.total)} a year in unbilled scope, report time, and missed referrals. What's your number? 3 minutes: ${CALC_URL}`;

  function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: "Renovation Profit Leak Calculator", text: shareText, url: CALC_URL }).catch(() => {
        copy(shareText);
      });
    } else {
      copy(shareText);
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-white/60">Running this with a business partner?</p>
        <p className="text-xs text-white/35 mt-0.5">Their number is probably different. Send them the link.</p>
      </div>
      <button
        onClick={handleShare}
        className={`shrink-0 rounded-lg px-3 py-2 text-xs font-black transition ${
          copied
            ? "bg-green-500 text-white"
            : "bg-white/10 text-white hover:bg-white/20"
        }`}
      >
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}

// Moment 2 - appears after benchmark, when they have comparison data.
// Three channels. Copy + SMS + Email. No native-share-only dependency.
function ShareAfterBenchmark({ result, stats }: { result: LeakResult; stats: BenchmarkStats | null }) {
  const { copied, copy } = useCopyState();

  const aboveAvg = stats?.enough && stats.avgLeakTotal ? result.total > stats.avgLeakTotal : false;
  const pct = stats?.enough && stats.avgLeakTotal
    ? Math.abs(Math.round(((result.total - stats.avgLeakTotal) / stats.avgLeakTotal) * 100))
    : null;

  const benchmarkLine = pct != null
    ? aboveAvg
      ? `I'm ${pct}% above the average. `
      : `I'm ${pct}% below the average. `
    : "";

  const shareText = `I found out my renovation business is leaking ${fmt(result.total)}/year in unbilled scope, report time, and missed referrals. ${benchmarkLine}What's your number? 3 min free tool: ${CALC_URL}`;
  const subject = "How much is your renovation business leaking?";
  const smsHref = `sms:?body=${encodeURIComponent(shareText)}`;
  const emailHref = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(shareText)}`;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-5 space-y-4">
      <div>
        <p className="text-sm font-black text-white">
          Send this to the person carrying this business with you.
        </p>
        <p className="mt-1 text-xs text-white/50">
          Ask them: "What would your number be?" Most partners get very different answers. That gap is the most useful conversation you can have this week.
        </p>
      </div>

      {/* Pre-filled message preview */}
      <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
        <p className="text-xs leading-relaxed text-white/40 italic">{shareText}</p>
      </div>

      {/* Three share buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => copy(shareText)}
          className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-bold transition ${
            copied
              ? "border-green-500/50 bg-green-500/20 text-green-400"
              : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          <span className="text-lg">{copied ? "✓" : "📋"}</span>
          {copied ? "Copied!" : "Copy"}
        </button>

        <a
          href={smsHref}
          className="flex flex-col items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 py-3 text-xs font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <span className="text-lg">💬</span>
          Text
        </a>

        <a
          href={emailHref}
          className="flex flex-col items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 py-3 text-xs font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <span className="text-lg">📧</span>
          Email
        </a>
      </div>

      <p className="text-center text-xs text-white/25">
        No account needed to run the calculator. They see results before entering an email.
      </p>
    </div>
  );
}

// ─── Benchmark stats ──────────────────────────────────────────────────────────

interface BenchmarkStats {
  enough: boolean;
  count: number;
  avgLeakTotal?: number;
  avgScopeLeak?: number;
  avgReportLeak?: number;
  avgInvoiceLeak?: number;
  avgReferralLeak?: number;
  biggestLeak?: string;
}

function BenchmarkReport({ myResult, stats }: { myResult: LeakResult; stats: BenchmarkStats }) {
  if (!stats.enough || !stats.avgLeakTotal) return null;

  const diff = myResult.total - stats.avgLeakTotal;
  const aboveAvg = diff > 0;
  const pct = Math.abs(Math.round((diff / stats.avgLeakTotal) * 100));

  const myBiggest = [
    { label: "Unbilled scope creep", value: myResult.scopeLeak },
    { label: "Report writing time", value: myResult.reportLeak },
    { label: "Invoice follow-up", value: myResult.invoiceLeak },
    { label: "Referral revenue gap", value: myResult.referralLeak },
  ].sort((a, b) => b.value - a.value)[0].label;

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs font-black uppercase tracking-widest text-white/40">
        Your numbers vs. {stats.count} contractors in our early access group
      </p>

      {/* Comparison bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/60">Average leak in our group</span>
          <span className="font-bold text-white/80">{fmt(stats.avgLeakTotal)}/yr</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold text-white">Your leak</span>
          <span className={`font-black ${aboveAvg ? "text-red-400" : "text-green-400"}`}>
            {fmt(myResult.total)}/yr
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-red-500 transition-all duration-1000"
            style={{ width: `${Math.min(100, (myResult.total / (stats.avgLeakTotal * 1.5)) * 100)}%` }}
          />
        </div>
        <p className={`text-xs font-semibold ${aboveAvg ? "text-red-400" : "text-green-400"}`}>
          {aboveAvg
            ? `Your leak is ${pct}% above the group average.`
            : pct < 5
              ? "Your leak is right at the group average."
              : `Your leak is ${pct}% below the group average. Still worth fixing.`}
        </p>
      </div>

      {/* Where the group is losing most */}
      <div className="border-t border-white/10 pt-4 space-y-1.5">
        <p className="text-xs font-bold text-white/50 uppercase tracking-wider">Biggest leak across all contractors</p>
        <p className="text-sm font-semibold text-white">{stats.biggestLeak}</p>
        <p className="text-xs text-white/40">
          Your biggest leak: <span className="text-white/70">{myBiggest}</span>
        </p>
      </div>

      {/* What to fix first */}
      <div className="border-t border-white/10 pt-4">
        <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">What contractors fix first</p>
        {[
          { rank: "01", action: "Set up scope creep tracking before the next job starts" },
          { rank: "02", action: "Replace weekly report writing with a 2-minute template" },
          { rank: "03", action: "Send a review request to the last 5 completed jobs" },
        ].map((item) => (
          <div key={item.rank} className="flex items-start gap-3 py-1.5">
            <span className="shrink-0 text-xs font-black text-green-500">{item.rank}</span>
            <p className="text-xs text-white/60">{item.action}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Email capture ────────────────────────────────────────────────────────────

function EmailCapture({
  result,
  answers,
  onDone,
}: {
  result: LeakResult;
  answers: Answers;
  onDone: (email: string, stats: BenchmarkStats) => void;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const tracking: Record<string, string> = {};
      try {
        const stored = JSON.parse(sessionStorage.getItem("rt360_tracking") || "{}");
        Object.assign(tracking, stored);
        const params = new URLSearchParams(window.location.search);
        if (params.get("ref")) tracking.referralCode = params.get("ref")!;
      } catch { /* ignore */ }

      const calcPayload = { ...result, answers };

      const [waitlistRes, statsRes] = await Promise.all([
        fetch("/api/waitlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            planInterest: "PRO",
            ...tracking,
            utmCampaign: tracking.utmCampaign || "profit-leak-calculator",
            utmSource: tracking.utmSource || "calculator",
            calcData: calcPayload,
          }),
        }),
        fetch("/api/waitlist/stats"),
      ]);

      const waitlistData = await waitlistRes.json();
      if (!waitlistRes.ok) { setError(waitlistData.error || "Something went wrong."); return; }

      const stats: BenchmarkStats = statsRes.ok ? await statsRes.json() : { enough: false, count: 0 };
      onDone(email, stats);
    } catch {
      setError("Connection error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm font-bold text-white">
        Get your breakdown by email + see how you compare to other contractors.
      </p>
      <input
        required
        type="email"
        placeholder="Your email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="h-14 w-full rounded-xl border border-white/20 bg-white/10 px-4 text-base text-white placeholder:text-white/40 outline-none focus:border-green-400"
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="h-14 w-full rounded-xl bg-green-500 text-base font-black text-white transition hover:bg-green-400 disabled:opacity-60"
      >
        {loading ? "Calculating your benchmark..." : `Show my industry comparison`}
      </button>
      <p className="text-center text-xs text-white/30">
        No spam. Unsubscribe anytime. Your answers stay anonymous in the benchmark.
      </p>
    </form>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProfitLeakCalculator() {
  const total = QUESTIONS.length;
  const [step, setStep] = useState(0); // 0 = intro, 1-8 = questions, 9 = results
  const [answers, setAnswers] = useState<Answers>({
    jobsPerYear: 12,
    extrasPerJob: 3,
    hourlyRate: 95,
    extrasInvoiced: 25,
    reportMinutesPerWeek: 120,
    avgJobValue: 45000,
    hardInvoicesPerYear: 5,
    referralsOutOf10: 2,
  });
  const [currentValue, setCurrentValue] = useState<number | "">(12);
  const [result, setResult] = useState<LeakResult | null>(null);
  const [emailDone, setEmailDone] = useState(false);
  const [benchmarkStats, setBenchmarkStats] = useState<BenchmarkStats | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isIntro = step === 0;
  const isResults = step === total + 1;
  const questionIndex = step - 1; // 0-based
  const question = !isIntro && !isResults ? QUESTIONS[questionIndex] : null;

  // Sync currentValue when navigating between questions
  useEffect(() => {
    if (question) {
      const key = question.id as keyof Answers;
      setCurrentValue(answers[key]);
    }
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  function commitAndAdvance() {
    if (question) {
      const key = question.id as keyof Answers;
      const val = typeof currentValue === "number" ? currentValue : answers[key];
      const updated = { ...answers, [key]: val };
      setAnswers(updated);
      if (step === total) {
        setResult(calculate(updated));
        setStep(total + 1);
        containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        setStep((s) => s + 1);
      }
    }
  }

  function goBack() {
    if (step > 1) setStep((s) => s - 1);
  }

  const canAdvance = question?.type === "slider" || (typeof currentValue === "number" && currentValue > 0);

  return (
    <div ref={containerRef} className="mx-auto max-w-xl">
      {/* Intro */}
      {isIntro && (
        <div className="text-center space-y-6">
          <div className="inline-block rounded-full border border-green-500/30 bg-green-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-green-400">
            Free tool, 3 minutes, no signup required
          </div>
          <h2 className="text-3xl font-black text-white md:text-4xl" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
            How much is your renovation business leaking this year?
          </h2>
          <p className="text-white/60">
            8 questions. No spreadsheet required. You will see exactly where the money is going and how much.
          </p>
          <div className="grid gap-3 text-left text-sm text-white/70">
            {[
              { label: "Unbilled scope creep", detail: "Extras done for free" },
              { label: "Report-writing time", detail: "Hours you can never bill" },
              { label: "Invoice follow-up drag", detail: "Time chasing payments" },
              { label: "Referral revenue gap", detail: "Jobs you never got" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                <span className="text-green-400">+</span>
                <div>
                  <span className="font-semibold text-white">{item.label}</span>
                  <span className="ml-2 text-white/40">{item.detail}</span>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setStep(1)}
            className="h-14 w-full rounded-xl bg-green-500 text-base font-black text-white transition hover:bg-green-400"
          >
            Calculate my profit leak
          </button>
          <p className="text-xs text-white/30">Your answers stay on your screen. Nothing is sent until you choose to share your email.</p>
        </div>
      )}

      {/* Questions */}
      {question && (
        <div className="space-y-6">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-white/40">
              <span>Question {step} of {total}</span>
              <span className="font-bold text-green-400 uppercase tracking-widest">{question.tag}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-green-500 transition-all duration-500"
                style={{ width: `${(step / total) * 100}%` }}
              />
            </div>
          </div>

          {/* Question card */}
          <div className="space-y-2">
            <h3 className="text-xl font-black text-white md:text-2xl" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              {question.headline}
            </h3>
            <p className="text-sm text-white/50">{question.sublabel}</p>
          </div>

          {/* Input */}
          <div className="pt-2">
            {question.type === "number" && (
              <NumberInput
                value={currentValue}
                onChange={setCurrentValue}
                prefix={question.prefix}
                placeholder={question.placeholder}
                min={question.min}
              />
            )}
            {question.type === "slider" && (
              <SliderInput
                value={typeof currentValue === "number" ? currentValue : (question.defaultValue as number)}
                onChange={setCurrentValue}
                min={question.min}
                max={question.max!}
                step={question.step}
                label={question.sliderLabel!}
              />
            )}
          </div>

          {/* Nav */}
          <div className="flex gap-3 pt-2">
            {step > 1 && (
              <button
                onClick={goBack}
                className="h-12 flex-1 rounded-xl border border-white/20 text-sm font-semibold text-white/60 transition hover:border-white/40 hover:text-white"
              >
                Back
              </button>
            )}
            <button
              onClick={commitAndAdvance}
              disabled={!canAdvance}
              className="h-12 flex-[2] rounded-xl bg-white text-sm font-black text-[#183d29] transition hover:bg-green-50 disabled:opacity-40"
            >
              {step === total ? "Show my results" : "Next question"}
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {isResults && result && (
        <div className="space-y-5">

          {/* ── MOMENT 1: Big number reveal ─────────────────────────────────── */}
          {/* Psychology: serial positioning primacy - hit hardest at the top.  */}
          {/* Loss aversion - show what's leaving before showing the breakdown. */}
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-7 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-red-400">Estimated annual profit leak</p>
            <p className="mt-2 text-5xl font-black text-white md:text-6xl" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              <AnimatedNumber target={result.total} />
            </p>
            <p className="mt-2 text-sm text-white/50">per year, based on your answers</p>
          </div>

          {/* ── SHARE MOMENT 1: At peak shock, before breakdown ─────────────── */}
          {/* Position: immediately after the number while emotion is highest.  */}
          {/* Goal: send the link, not the answer. Receiver needs to run it too.*/}
          <ShareAtPeak result={result} />

          {/* Breakdown */}
          <div className="space-y-2.5">
            {[
              { label: "Unbilled scope creep", value: result.scopeLeak, icon: "🔓", desc: "Extras done without a signed change order" },
              { label: "Report-writing time", value: result.reportLeak, icon: "⏱", desc: "Hours per year writing updates you could be billing" },
              { label: "Invoice follow-up drag", value: result.invoiceLeak, icon: "📬", desc: "Time spent chasing payments instead of running jobs" },
              { label: "Referral revenue gap", value: result.referralLeak, icon: "🤝", desc: "Jobs you never got because past clients were not prompted to refer" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3.5">
                <span className="text-2xl">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{item.label}</p>
                  <p className="text-xs text-white/40">{item.desc}</p>
                </div>
                <p className="shrink-0 text-base font-black text-red-400">{fmt(item.value)}</p>
              </div>
            ))}
          </div>

          {/* Context line */}
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center">
            <p className="text-sm text-white/60">
              For a contractor doing{" "}
              <span className="font-bold text-white">{fmt(answers.jobsPerYear * answers.avgJobValue)}/yr in volume</span>,
              this is{" "}
              <span className="font-bold text-white">
                {Math.round((result.total / (answers.jobsPerYear * answers.avgJobValue)) * 100)}% of gross revenue
              </span>{" "}
              leaving before it reaches your pocket.
            </p>
          </div>

          {/* Email capture or post-email state */}
          {!emailDone ? (
            <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-6">
              <EmailCapture
                result={result}
                answers={answers}
                onDone={(_email, stats) => {
                  setBenchmarkStats(stats);
                  setEmailDone(true);
                }}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-5 text-center space-y-1">
                <p className="text-lg font-black text-green-400">You are on the list.</p>
                <p className="text-sm text-white/60">
                  Check your inbox. We will send the founding offer link when we open.
                </p>
              </div>

              {benchmarkStats && <BenchmarkReport myResult={result} stats={benchmarkStats} />}

              {/* ── SHARE MOMENT 2: After benchmark - social comparison trigger ── */}
              {/* Psychology: now they have a comparison number. Sharing feels     */}
              {/* perceptive ("I know something about this industry"). They want   */}
              {/* to know if their partner's number is different.                  */}
              <ShareAfterBenchmark result={result} stats={benchmarkStats} />

              <a
                href="/#waitlist"
                className="block w-full rounded-xl bg-white py-3.5 text-center text-sm font-black text-[#183d29] transition hover:bg-green-50"
              >
                Join the founding contractor waitlist
              </a>
            </div>
          )}

          {/* Retake */}
          <button
            onClick={() => { setStep(0); setEmailDone(false); setBenchmarkStats(null); }}
            className="w-full py-2 text-xs text-white/30 hover:text-white/60 transition"
          >
            Start over with different numbers
          </button>
        </div>
      )}
    </div>
  );
}
