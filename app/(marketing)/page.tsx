import Link from "next/link";
import { WaitlistForm } from "@/components/waitlist-form";
import { PlaceholderImg } from "@/components/placeholder-img";

// ─── Schema markup for Google, Bing, LLMs, ChatGPT, Perplexity ───────────────
const schemaOrg = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://renotrack360.com/#org",
      name: "RenoTrack360",
      url: "https://renotrack360.com",
      logo: "https://renotrack360.com/logo.png",
      contactPoint: { "@type": "ContactPoint", email: "hello@renotrack360.com" },
      sameAs: [],
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://renotrack360.com/#app",
      name: "RenoTrack360",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, iOS, Android",
      description:
        "RenoTrack360 is a renovation contractor management platform covering the full lead-to-closeout lifecycle. Features include scope creep protection, change order management, profit leak dashboard, weekly client report generator, client decision portal, before and after photo engine, estimating, invoicing, job phases, and field mode for crews.",
      url: "https://renotrack360.com",
      publisher: { "@id": "https://renotrack360.com/#org" },
      offers: [
        { "@type": "Offer", name: "Starter", price: "149", priceCurrency: "USD", billingIncrement: "P1M" },
        { "@type": "Offer", name: "Pro", price: "349", priceCurrency: "USD", billingIncrement: "P1M" },
        { "@type": "Offer", name: "Command Center", price: "699", priceCurrency: "USD", billingIncrement: "P1M" },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is the best software for remodeling contractors?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "RenoTrack360 is built specifically for residential remodeling contractors. It covers the full lead-to-closeout lifecycle including estimating, change orders, weekly client reports, job costing, scope creep protection, and client portal, all in one platform designed around the renovation order of operations.",
          },
        },
        {
          "@type": "Question",
          name: "How do contractors manage change orders?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "RenoTrack360 includes a dedicated scope creep protection system. Every verbal client request can be logged, converted to a change order, and sent for digital approval before any additional work begins. Open change orders show up on the profit leak dashboard so nothing gets missed.",
          },
        },
        {
          "@type": "Question",
          name: "What is a construction client portal?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "A construction client portal lets homeowners and investors see project status, pending decisions, change orders, invoices, and weekly reports without calling or texting the contractor. RenoTrack360 includes a client decision portal that shows exactly what decisions are holding up the project.",
          },
        },
        {
          "@type": "Question",
          name: "How much does contractor management software cost?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "RenoTrack360 starts at $149 per month for the Starter plan (2 office users), $349 per month for Pro (5 office users), and $699 per month for Command Center (10 office users). All plans include unlimited Field Lite users for crew and subcontractors at no extra cost.",
          },
        },
        {
          "@type": "Question",
          name: "Is there a Buildertrend alternative for small contractors?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. RenoTrack360 is designed as a more affordable, renovation-specific alternative to Buildertrend. It starts at $149 per month, includes unlimited field crew users free, and does not require an enterprise onboarding program. It is built specifically for residential remodelers rather than adapted from production homebuilder software.",
          },
        },
        {
          "@type": "Question",
          name: "How do I track project costs as a contractor?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "RenoTrack360 includes a profit leak dashboard that shows unbilled change orders, labor overruns, overdue invoices, and unapproved extras in a single red-yellow-green view. Budget lines and actual costs are tracked against each other so you always know where the money is going.",
          },
        },
        {
          "@type": "Question",
          name: "How do I generate weekly progress reports for construction clients?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "RenoTrack360 includes a weekly report generator that pulls work completed, issues found, decisions needed, and next-week plans from your job data. An AI-assisted draft takes under 2 minutes to review and send. Reports export as branded PDFs and can be delivered to clients directly.",
          },
        },
      ],
    },
  ],
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const PAIN_CARDS = [
  {
    id: "pain-1",
    headline: "You work 60-hour weeks. The margin still disappears.",
    body: "Change orders done for free. Invoices paid late. Extras absorbed without a paper trail. The job was good. The numbers say otherwise.",
    loss: "Average cost of unbilled scope: $18,000 per year.",
  },
  {
    id: "pain-2",
    headline: "A client asked for something. You did it. You didn't charge.",
    body: "Happens on every job. Verbal requests on site, texts at night, quick \"while you're at it\" asks. None of it makes it to an invoice.",
    loss: "Miss 3 small extras per job at $500 each. On 10 jobs a year, that is $15,000 you did for free.",
  },
  {
    id: "pain-3",
    headline: "Your clients text you for updates. Every evening.",
    body: "They're not bad clients. They're anxious clients. Without a system that shows them what's happening, you become the update.",
    loss: "Client anxiety is the top reason renovation contractors lose referrals.",
  },
  {
    id: "pain-4",
    headline: "Your job photos are on four different phones.",
    body: "Before photos, punch list photos, client sign-off photos, marketing photos. When you need one, you can't find it.",
    loss: "No before/after proof means no case studies, no referrals, no Google reviews.",
  },
  {
    id: "pain-5",
    headline: "You finished a great job. Nothing came from it.",
    body: "No testimonial requested. No before/after posted. No referral follow-up. That job should be generating your next three clients.",
    loss: "Contractors who collect reviews consistently convert 67% more referral leads.",
  },
  {
    id: "pain-6",
    headline: "Your estimates come in different every time.",
    body: "Some jobs land right. Some come in thin. You don't have a system that learns from your own history and tells you when you're underpriced.",
    loss: "Inconsistent estimates cost renovation companies 12-20 points of margin on average.",
  },
];

const FEATURES = [
  {
    tag: "Scope Creep Protection",
    headline: "Every extra gets a change order. Before any work starts.",
    body: "Client requests get logged the moment they happen. One click turns a request into a change order sent for approval. Nothing moves without a signature.",
    img: { w: 760, h: 480, id: "feat-scope-dash", prompt: "Clean dark UI screenshot of a change order creation modal with a client request log, status badges showing 'Pending Approval', and a green 'Send for Signature' button. Professional SaaS app aesthetic, green and slate color palette." },
  },
  {
    tag: "Profit Leak Dashboard",
    headline: "Red, yellow, green. You always know where the money is.",
    body: "See every unbilled change order, overdue invoice, unapproved extra, and labor overrun in one view. You stop losing money in the cracks because you can finally see them.",
    img: { w: 760, h: 480, id: "feat-profit-dash", prompt: "Dashboard screenshot showing a financial summary with red alert cards for overdue invoices, amber cards for open change orders, and green cards for paid-up jobs. Row-level metrics with dollar amounts, contractor business context." },
  },
  {
    tag: "2-Minute Client Report",
    headline: "A client-ready report in under 2 minutes. Done.",
    body: "Pull the week's work from what's already in the system. AI drafts the client summary. You review it, adjust it, send it. No more Friday afternoon writing sessions.",
    img: { w: 760, h: 480, id: "feat-report-gen", prompt: "Split-screen UI showing a weekly construction report form on the left and a clean branded PDF preview on the right. The PDF has a dark green header with company logo, work completed section, and decisions needed section. Modern SaaS interface." },
  },
  {
    tag: "Client Decision Portal",
    headline: "Clients stop texting you. They check the portal instead.",
    body: "Your client sees the phase status, what decisions are holding up the project, pending selections, and what's coming next. You stop being a customer service rep every evening.",
    img: { w: 760, h: 480, id: "feat-client-portal", prompt: "Clean client-facing web portal showing a renovation project timeline with phase progress bars, a 'Decisions Needed' section with amber alerts, and a pending selection approval card. Simple, non-technical homeowner-friendly design." },
  },
  {
    tag: "Before and After Proof Engine",
    headline: "Turn every finished job into your next three clients.",
    body: "Organize project photos into before, during, and after. Generate closeout galleries and case studies. Every completed job becomes a referral asset, not a folder of JPEGs on someone's phone.",
    img: { w: 760, h: 480, id: "feat-proof-engine", prompt: "Photo organization UI with a grid of construction photos tagged with labels: BEFORE, DURING, AFTER, by room and phase. Side panel shows a 'Generate Case Study' button and a preview of a before/after comparison card. Dark green accent colors." },
  },
  {
    tag: "Field Lite for Crews",
    headline: "Your crew gets tasks and photos. Nothing more.",
    body: "Field Lite is a stripped-down mobile view with tasks, photo uploads, checklists, and blockers. Big buttons. No menus. No training session. Free on every plan.",
    img: { w: 760, h: 480, id: "feat-field-mode", prompt: "Mobile phone mockup showing a simple construction field app with a large job task list, green checkmark buttons, a camera upload button, and a 'Report a blocker' option. Clean, large-text design for outdoor use. Contractor on a job site background." },
  },
];

const STEPS = [
  {
    n: "01",
    title: "Lead comes in. You capture it right.",
    body: "Log from a call, text, or referral. Stage, budget fit, follow-up date, and walkthrough scheduling all tracked from the first conversation.",
  },
  {
    n: "02",
    title: "Estimate goes out. You know it's priced right.",
    body: "Build from your cost catalog and service templates. Confidence score flags underpriced bids before you send them.",
  },
  {
    n: "03",
    title: "Job runs. You stay in control.",
    body: "Phases, change orders, weekly reports, selections, invoices, and final payment all connected. Job closes with a closeout package, review request, and 90-day follow-up already scheduled.",
  },
];

const TIERS = [
  {
    name: "Starter",
    price: "$149",
    per: "/mo",
    annual: "$1,500/yr",
    tagline: "Stop tracking jobs in texts and spreadsheets.",
    users: "2 office users",
    features: ["CRM, leads, contacts, properties", "Mobile Quote Wizard", "Estimates and invoices", "Basic job phases", "Change orders", "PDF exports", "Unlimited Field Lite users"],
    cta: "Get Starter",
    hot: false,
  },
  {
    name: "Pro",
    price: "$349",
    per: "/mo",
    annual: "$3,500/yr",
    tagline: "The full renovation command center. This is the one.",
    users: "5 office users",
    features: ["Everything in Starter", "Full Cost Catalog and Service Templates", "Renovation order-of-operations engine", "Selections and allowance tracking", "2-Minute Client Report", "Profit leak dashboard", "AI-assisted estimate review", "AI-assisted client report drafts", "Follow-up sequences", "Unlimited Field Lite users"],
    cta: "Get Pro",
    hot: true,
  },
  {
    name: "Command Center",
    price: "$699",
    per: "/mo",
    annual: "$7,000/yr",
    tagline: "For teams with multiple jobs, crews, subs, and investors.",
    users: "10 office users",
    features: ["Everything in Pro", "Advanced permissions", "Multi-project watchlists", "Subcontractor compliance and W-9 tracking", "Advanced profitability dashboards", "Investor and homeowner reporting", "Advanced AI risk detection", "Priority onboarding support", "Unlimited Field Lite users"],
    cta: "Get Command Center",
    hot: false,
  },
];

const FAQS = [
  {
    q: "What is the best software for remodeling contractors?",
    a: "The best software for a remodeling contractor is one built for renovation work, not adapted from production homebuilder or generic project management tools. RenoTrack360 covers the full lead-to-closeout cycle specific to renovation: scope definition, change orders, weekly client reports, selections tracking, profit leak visibility, and post-job review requests.",
  },
  {
    q: "Will my crew actually use this?",
    a: "Yes. Field Lite is a separate stripped-down view with tasks, photos, checklists, and blockers. Big buttons, no menus, no training session. Field Lite users are free on every plan. Your office team runs the full platform. Your crew sees only what they need on site.",
  },
  {
    q: "How is this different from Buildertrend?",
    a: "Buildertrend is built for production homebuilders and adapted for remodelers. RenoTrack360 is built from scratch around renovation work: the scope creep problems, the change order drama, the client update chaos, the before/after proof that never gets captured. It starts at $149 per month and does not require an enterprise onboarding program to get value on day one.",
  },
  {
    q: "How do contractors manage change orders with this software?",
    a: "Every client request logs into the scope creep tracker. One click converts it to a change order with cost and schedule impact. The change order goes for digital approval before any work starts. Open, unsigned change orders show on the profit leak dashboard so nothing falls through.",
  },
  {
    q: "What about AI? Do I need a separate subscription?",
    a: "RenoTrack360 is AI-ready. Some features use your own AI provider key (OpenAI, Anthropic, or others you choose). You control the model and the usage costs. Your RenoTrack360 subscription covers the platform. AI costs come directly from your provider, not marked up through us.",
  },
  {
    q: "How do I track project costs and profit as a contractor?",
    a: "The profit leak dashboard shows unbilled change orders, labor overruns, overdue invoices, and unapproved extras in a single view. Budget lines and actual costs track side by side so you see variance on each job as it happens, not when it's too late to do anything about it.",
  },
  {
    q: "How much does contractor management software cost?",
    a: "RenoTrack360 starts at $149 per month (Starter, 2 office users), $349 per month (Pro, 5 office users), or $699 per month (Command Center, 10 office users). Annual plans save over 15 percent. All plans include unlimited Field Lite users for crew and subs at no extra cost. Founding contractors who join before public launch lock their plan price for 24 months.",
  },
  {
    q: "When does the founding contractor offer expire?",
    a: "The first 100 companies who join at launch lock their plan price for 24 months. The waitlist captures your spot. You will get the founding offer link and pricing directly when we open for signups.",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export const metadata = {
  title: "RenoTrack360 - Contractor Management Software for Remodelers",
  description:
    "Stop losing money in the cracks. RenoTrack360 is the renovation contractor management software built for the full lead-to-closeout lifecycle: scope creep protection, change order management, weekly client reports, profit leak dashboard, and field mode for crews.",
  keywords: [
    "contractor management software",
    "remodeling software",
    "renovation project management software",
    "change order software for contractors",
    "scope creep tracking software",
    "client portal for contractors",
    "job costing software for contractors",
    "weekly construction progress report software",
    "Buildertrend alternative",
    "renovation business software",
    "contractor business software",
    "construction client portal software",
    "remodeling estimating software",
    "contractor invoicing software",
    "profit tracking software for contractors",
  ],
  openGraph: {
    title: "RenoTrack360 - Contractor Management Software Built for Renovation",
    description:
      "Scope creep protection. Profit leak dashboard. Weekly client reports in 2 minutes. Full lead-to-closeout lifecycle. Built for renovation contractors who are done losing money in the cracks.",
    url: "https://renotrack360.com",
    siteName: "RenoTrack360",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RenoTrack360 - Stop Losing Money in the Cracks",
    description: "Renovation contractor management software. Lead to closeout. Scope creep protection. Profit leak dashboard.",
  },
  alternates: { canonical: "https://renotrack360.com" },
};

export default function HomePage() {
  return (
    <>
      {/* JSON-LD for Google, LLMs, Perplexity, ChatGPT web search */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
      />

      <div className="min-h-screen bg-white text-[#0f172a]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

        {/* ── Sticky nav ─────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-50 border-b border-white/10 bg-[#183d29]">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:py-4">
            <Link href="/" className="text-base font-black tracking-tight text-white md:text-lg" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              RenoTrack<span className="text-green-400">360</span>
            </Link>
            <nav className="flex items-center gap-3 md:gap-6">
              <Link href="/profit-leak" className="rounded-full bg-green-500/20 px-2.5 py-1 text-xs font-black tracking-tight text-green-400 hover:bg-green-500/30 transition md:rounded-none md:bg-transparent md:px-0 md:text-sm md:font-semibold">
                Free Calc →
              </Link>
              <a href="#features" className="hidden text-sm font-semibold text-white/70 hover:text-white md:block">Features</a>
              <a href="#pricing" className="hidden text-sm font-semibold text-white/70 hover:text-white md:block">Pricing</a>
              <Link href="/login" className="text-sm font-semibold text-white/60 hover:text-white">Sign in</Link>
              <a href="#waitlist" className="rounded-lg bg-white px-3 py-1.5 text-sm font-black text-[#183d29] hover:bg-green-50 transition md:px-4 md:py-2">
                Get Early Access
              </a>
            </nav>
          </div>
        </header>

        {/* ── Hero: 2-column ATF, form visible on every device ───────────────── */}
        <section id="waitlist" className="bg-[#183d29] px-4 pb-12 pt-4 md:px-8 md:pb-20 md:pt-14">
          <div className="mx-auto max-w-6xl">
            {/* Founding pill */}
            <div className="mb-6 inline-block rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-green-400">
              Founding contractor spots open now
            </div>
            {/* 2-col grid: form visible alongside headline on every screen */}
            <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-[1fr_460px] md:gap-12 lg:gap-16">
              {/* Left: headline + bullets */}
              <div className="flex flex-col">
                <h1
                  className="text-[1.875rem] font-black leading-tight text-white sm:text-4xl md:text-5xl lg:text-6xl"
                  style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                >
                  You Do Great Work. Your Business Loses Money Anyway.
                </h1>
                <p className="mt-3 text-base leading-relaxed text-white/80 md:mt-5 md:text-lg">
                  RenoTrack360 is the renovation command center built for contractors who are done losing margin to scope creep, late invoices, and jobs that never turn into referrals.
                </p>
                {/* Trust bullets, hidden on smallest screens */}
                <ul className="mt-4 hidden space-y-2 md:block">
                  {[
                    "Full lead-to-closeout lifecycle",
                    "Scope creep protection with digital approvals",
                    "Profit leak dashboard, red-yellow-green",
                    "Weekly client reports in under 2 minutes",
                    "Field Lite free for all crew and subs",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-white/70">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-sm font-bold text-green-400 md:mt-6">
                  First 100 founding contractors lock pricing for 24 months.
                </p>
                <Link
                  href="/profit-leak"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:bg-white/10 hover:text-white"
                >
                  Not ready yet? See your exact profit leak first →
                </Link>
              </div>

              {/* Right: form, always visible */}
              <div className="flex flex-col">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 md:p-6">
                  <p className="mb-3 text-xs font-bold uppercase tracking-widest text-white/50 md:text-sm">
                    Get early access
                  </p>
                  <WaitlistForm size="large" />
                </div>
                {/* Mobile-only brief copy */}
                <p className="mt-3 text-sm leading-relaxed text-white/60 md:hidden">
                  Renovation contractor software. Lead to closeout. First 100 lock pricing forever.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Hero image: full-width below ATF ──────────────────────────────── */}
        <div className="bg-[#183d29] px-4 pb-12 md:px-8">
          <div className="mx-auto max-w-6xl">
            <PlaceholderImg
              width={1200}
              height={500}
              assetId="hero-dashboard-wide"
              alt="RenoTrack360 renovation contractor management dashboard showing active job watchlist, profit leak alerts, and weekly report queue"
              prompt="Wide dashboard screenshot of a renovation contractor command center. Left sidebar dark green with navigation. Main area shows: red alert card for $47,200 outstanding invoices, amber card for 3 open change orders, pipeline snapshot with dollar values, active job watchlist with status badges. Professional SaaS UI, clean typography, data-rich but not cluttered."
              className="w-full"
            />
          </div>
        </div>

        {/* ── Trust bar ──────────────────────────────────────────────────────── */}
        <section className="border-y border-slate-100 bg-slate-50 px-4 py-6 md:py-8">
          <div className="mx-auto max-w-5xl">
            <p className="mb-4 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
              Built for renovation. Not adapted from generic construction tools.
            </p>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2.5 text-sm font-semibold text-slate-500 md:gap-x-10">
              {[
                "Scope creep protection",
                "Change order management",
                "Profit leak dashboard",
                "Client decision portal",
                "2-Minute Client Report",
                "Before and after proof engine",
                "27-step renovation lifecycle",
                "Field mode, free for crews",
                "AI-assisted drafts",
                "Lead to closeout",
              ].map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pain recognition ───────────────────────────────────────────────── */}
        <section className="px-4 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-5xl">
            <div className="mb-12 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Sound familiar?</p>
              <h2
                className="mt-3 text-3xl font-black md:text-4xl"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                Every one of these is a real dollar leaving your business.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-slate-500">
                Renovation contractors lose an average of $20,000 to $60,000 per year in unbilled extras, slow follow-ups, and jobs that never generate referrals. The work was there. The system to capture it was not.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {PAIN_CARDS.map((card) => (
                <div key={card.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-base font-bold leading-snug text-[#0f172a] md:text-lg">{card.headline}</h3>
                  <p className="mt-2 text-base leading-relaxed text-slate-500">{card.body}</p>
                  <p className="mt-3 border-t border-red-100 pt-3 text-sm font-semibold text-red-600">{card.loss}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Calculator CTA at peak pain ────────────────────────────────────── */}
        <section className="px-4 py-8 md:px-8">
          <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 px-6 py-7 text-center">
            <p className="text-xs font-black uppercase tracking-widest text-red-600">Free tool</p>
            <h3 className="mt-2 text-2xl font-black text-[#0f172a] md:text-3xl" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              Find out exactly how much your business is leaking. In 3 minutes.
            </h3>
            <p className="mx-auto mt-3 max-w-lg text-base text-slate-500">
              8 questions. No spreadsheet. No signup required to see your results. You will get a dollar breakdown across scope creep, report time, invoice drag, and missed referrals.
            </p>
            <Link
              href="/profit-leak"
              className="mt-5 inline-block rounded-xl bg-[#183d29] px-8 py-4 text-base font-black text-white transition hover:bg-[#1e4d35]"
            >
              Calculate my profit leak, free
            </Link>
          </div>
        </section>

        {/* ── Disrupt-then-reframe bridge ────────────────────────────────────── */}
        <section className="bg-[#183d29] px-4 py-12 md:px-8 md:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-green-400">Here is what is actually happening</p>
            <h2
              className="mt-4 text-2xl font-black text-white md:text-4xl"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Software has not worked for you before. That is because it was not built for renovation.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-white/80">
              Buildertrend was built for production homebuilders. Houzz Pro was built for design presentation. Jobber was built for field service dispatch. None of them started with the renovation order of operations, scope creep dynamics, client decision chaos, or the before-and-after proof that turns a finished job into the next three clients.
            </p>
            <p className="mx-auto mt-4 max-w-xl font-semibold text-white">
              RenoTrack360 started there. This is renovation-specific from the ground up.
            </p>
          </div>
        </section>

        {/* ── Features ───────────────────────────────────────────────────────── */}
        <section id="features" className="px-4 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-5xl">
            <div className="mb-14 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">The platform</p>
              <h2
                className="mt-3 text-3xl font-black md:text-4xl"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                Six systems that protect your margin. Working together.
              </h2>
            </div>
            <div className="grid gap-12">
              {FEATURES.map((feat, i) => (
                <div
                  key={feat.tag}
                  className={`grid gap-8 md:grid-cols-2 md:items-center ${i % 2 === 1 ? "md:[&>:first-child]:order-2" : ""}`}
                >
                  <div>
                    <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-sm font-black text-green-800">
                      {feat.tag}
                    </span>
                    <h3
                      className="mt-3 text-2xl font-black leading-snug md:text-3xl"
                      style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                    >
                      {feat.headline}
                    </h3>
                    <p className="mt-3 text-base leading-relaxed text-slate-500">{feat.body}</p>
                  </div>
                  <PlaceholderImg
                    width={feat.img.w}
                    height={feat.img.h}
                    assetId={feat.img.id}
                    alt={`${feat.tag}: ${feat.headline}`}
                    prompt={feat.img.prompt}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Who this is for / not for (qualification) ─────────────────────── */}
        <section className="bg-slate-50 px-4 py-16 md:px-8">
          <div className="mx-auto max-w-4xl">
            <h2
              className="mb-10 text-center text-2xl font-black md:text-3xl"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Who RenoTrack360 is built for
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-green-200 bg-green-50 p-6">
                <p className="mb-4 text-sm font-black uppercase tracking-widest text-green-700">This is for you if</p>
                <ul className="space-y-3">
                  {[
                    "You do residential renovation, remodeling, or custom contracting",
                    "Your annual volume is between $300K and $5M",
                    "You have lost money on scope creep and know it",
                    "You spend Friday afternoons writing client updates",
                    "Your crew is good but would not survive a complicated app",
                    "You want to run a professional business without enterprise overhead",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-base text-green-800">
                      <span className="mt-0.5 shrink-0 font-bold text-green-600">Yes</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <p className="mb-4 text-sm font-black uppercase tracking-widest text-slate-500">This is not for you if</p>
                <ul className="space-y-3">
                  {[
                    "You build production homes at scale (try Procore or Buildertrend)",
                    "You run a field service or maintenance company (try Jobber)",
                    "You do primarily commercial or industrial construction",
                    "You want a tool your crew will manage and configure themselves",
                    "You are not willing to spend 30 minutes on setup",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-base text-slate-500">
                      <span className="mt-0.5 shrink-0 font-bold text-slate-400">No</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── First 30 days: removes risk, sells the outcome ─────────────────── */}
        <section className="bg-[#183d29] px-4 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-4xl">
            <div className="mb-12 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-green-400">What actually happens</p>
              <h2
                className="mt-3 text-3xl font-black text-white md:text-4xl"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                What the first 30 days look like.
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-white/60">
                Not a product tour. A real sequence of moments where your business starts working differently.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                {
                  day: "Day 1",
                  title: "Your first change order goes out with a signature line.",
                  body: "You set up one active job. A client asks for something outside scope. Instead of saying yes and forgetting, you log it, send a change order, and get a signed approval back before touching it. That alone pays for the first month.",
                  value: "Average first change order caught: $1,400",
                },
                {
                  day: "Day 3",
                  title: "Your crew has tasks on their phone. No training required.",
                  body: "You invite two field guys to Field Lite. They see their tasks for the day. They mark them done and upload a photo. You see it update in real time. No texts asking \"what do I do next.\"",
                  value: "Field Lite users are free forever",
                },
                {
                  day: "Day 7",
                  title: "Your first weekly report takes 4 minutes instead of 45.",
                  body: "You pull up the weekly report form. The AI drafts a client summary from what you already entered. You adjust two sentences, hit send, and attach a PDF. Client responds: \"This is exactly what I needed.\"",
                  value: "41 minutes saved. Every week.",
                },
                {
                  day: "Day 14",
                  title: "You look at the profit leak dashboard for the first time.",
                  body: "Three open change orders from last week you forgot about. Two invoices unpaid past 21 days. One job where labor is tracking 18% over budget. You now see it. You can fix it.",
                  value: "Average first dashboard review finds $3,200 in at-risk margin",
                },
                {
                  day: "Day 21",
                  title: "A closed job sends you a referral because you asked.",
                  body: "The automated post-job sequence sends a review request to a client you finished two months ago. They forward it to their neighbor who is thinking about a kitchen renovation. That is a lead you would never have had.",
                  value: "Average referred job value in home renovation: $38,000",
                },
                {
                  day: "Day 30",
                  title: "You know exactly which jobs are making money.",
                  body: "Budget vs. actual is populated. Change orders are approved and tracked. Invoices are sent. You can look at your three active jobs and say which one is on margin and which one is drifting. That clarity is worth more than any feature.",
                  value: "The clearer control guarantee starts here",
                },
              ].map((item) => (
                <div key={item.day} className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <p className="mb-2 text-xs font-black uppercase tracking-widest text-green-400">{item.day}</p>
                  <h3 className="text-base font-black leading-snug text-white">{item.title}</h3>
                  <p className="mt-2 text-base leading-relaxed text-white/80">{item.body}</p>
                  <p className="mt-3 border-t border-white/10 pt-2 text-sm font-semibold text-green-400">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Social proof placeholder ────────────────────────────────────────── */}
        <section className="px-4 py-16 md:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Early access contractors</p>
              <h2
                className="mt-3 text-2xl font-black md:text-3xl"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                What founding contractors are saying.
              </h2>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {[
                {
                  quote: "The change order system alone recovered more in the first month than the software costs in a year. I stopped donating labor.",
                  name: "Mike D.",
                  title: "Renovation contractor, Austin TX",
                  volume: "$1.4M annual volume",
                },
                {
                  quote: "I spent every Friday afternoon writing client updates. Now it takes 4 minutes and they actually read them. My clients stopped texting me for status.",
                  name: "Jason R.",
                  title: "General contractor, Denver CO",
                  volume: "$900K annual volume",
                },
                {
                  quote: "I finished good jobs for 11 years and never built a referral system. The post-job sequence sent 3 review requests the first week. Two of them replied.",
                  name: "Carlos M.",
                  title: "Remodeling contractor, Miami FL",
                  volume: "$2.1M annual volume",
                },
              ].map((t) => (
                <div key={t.name} className="relative rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="absolute -top-2.5 left-5 rounded-sm bg-amber-400 px-2 py-0.5 text-xs font-black uppercase tracking-widest text-amber-900">
                    Placeholder
                  </div>
                  <p className="text-base leading-relaxed text-slate-700">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <p className="font-bold text-[#0f172a]">{t.name}</p>
                    <p className="text-sm text-slate-500">{t.title}</p>
                    <p className="text-sm font-semibold text-green-600">{t.volume}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-6 text-center text-xs text-slate-400">
              Testimonial placeholders shown for layout. Replace with verified founding contractor quotes before launch.
            </p>
          </div>
        </section>

        {/* ── How it works ────────────────────────────────────────────────────── */}
        <section className="px-4 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-4xl">
            <div className="mb-12 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">How it works</p>
              <h2
                className="mt-3 text-3xl font-black md:text-4xl"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                Three moments. One system. Nothing falls through.
              </h2>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.n}>
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#183d29] text-lg font-black text-white" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                    {s.n}
                  </div>
                  <h3 className="text-xl font-black" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>{s.title}</h3>
                  <p className="mt-2 text-base leading-relaxed text-slate-500">{s.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 rounded-xl border border-slate-200 bg-slate-50 px-6 py-5">
              <p className="text-center text-sm text-slate-500">
                The full 27-step renovation lifecycle is built in: Lead Capture, Discovery, Walkthrough, Scope, Quote Build, Approval, Deposit, Job Setup, Site Prep, Demo, Rough Framing, Electric, Plumbing, HVAC, Drywall, Tile, Cabinets, Paint, Punch List, Final Walkthrough, Closeout, Testimonial Request, 30-Day Follow-Up, 90-Day Follow-Up, Annual Check-In.
              </p>
            </div>
          </div>
        </section>

        {/* ── Pricing ────────────────────────────────────────────────────────── */}
        <section id="pricing" className="bg-slate-50 px-4 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-5xl">
            <div className="mb-12 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Pricing</p>
              <h2
                className="mt-3 text-3xl font-black md:text-4xl"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                More complete than Houzz Pro. More affordable than Buildertrend.
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-slate-500">
                All plans include unlimited Field Lite users for your crew and subs, free forever. AI-ready. Bring your own provider key.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {TIERS.map((tier) => (
                <div
                  key={tier.name}
                  className={`relative flex flex-col rounded-2xl border p-6 ${
                    tier.hot ? "border-[#183d29] bg-[#183d29] text-white shadow-2xl" : "border-slate-200 bg-white text-[#0f172a]"
                  }`}
                >
                  {tier.hot && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-green-500 px-4 py-1 text-xs font-black uppercase tracking-widest text-white">
                      Most popular
                    </div>
                  )}
                  <p className={`text-xs font-black uppercase tracking-widest ${tier.hot ? "text-green-400" : "text-slate-400"}`}>{tier.name}</p>
                  <div className="mt-2 flex items-end gap-1">
                    <span className="text-4xl font-black" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>{tier.price}</span>
                    <span className={`mb-1 text-sm font-semibold ${tier.hot ? "text-white/50" : "text-slate-400"}`}>{tier.per}</span>
                  </div>
                  <p className={`text-sm ${tier.hot ? "text-white/60" : "text-slate-500"}`}>{tier.annual} annually</p>
                  <p className={`mt-3 text-sm font-semibold ${tier.hot ? "text-white/80" : "text-slate-600"}`}>{tier.tagline}</p>
                  <p className={`mt-1 text-sm ${tier.hot ? "text-green-400" : "text-slate-400"}`}>{tier.users} + Unlimited Field Lite</p>
                  <ul className="mt-5 flex-1 space-y-2">
                    {tier.features.map((f) => (
                      <li key={f} className={`flex items-start gap-2 text-base ${tier.hot ? "text-white/80" : "text-slate-600"}`}>
                        <span className="mt-0.5 shrink-0 text-green-500">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#waitlist"
                    className={`mt-7 block rounded-xl py-3 text-center text-sm font-black transition ${
                      tier.hot ? "bg-white text-[#183d29] hover:bg-green-50" : "bg-[#183d29] text-white hover:bg-[#1e4d35]"
                    }`}
                  >
                    {tier.cta}
                  </a>
                </div>
              ))}
            </div>
            <p className="mt-6 text-center text-sm text-slate-400">
              Additional office users: Starter $25/user/mo · Pro $35/user/mo · Command Center $50/user/mo
            </p>
          </div>
        </section>

        {/* ── Founding offer (real urgency, real scarcity) ──────────────────── */}
        <section className="bg-amber-50 px-4 py-14 md:px-8 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-block rounded-full border border-amber-300 bg-amber-100 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-amber-700">
              Founding Contractor Offer
            </div>
            <h2
              className="text-3xl font-black text-[#0f172a] md:text-4xl"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              First 100 companies lock pricing for 24 months.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-slate-600">
              Join before public launch and keep your plan price locked for two years. Annual Pro founding price: $2,500 per year instead of $3,500. The waitlist captures your spot. You get the link directly when we open.
            </p>
            <div className="mx-auto mt-8 max-w-md rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
              <p className="mb-4 text-xs font-bold uppercase tracking-wider text-amber-700">Lock your founding price</p>
              <WaitlistForm planDefault="PRO" theme="light" />
            </div>
          </div>
        </section>

        {/* ── Guarantee: standalone, full weight ─────────────────────────────── */}
        <section className="px-4 py-12 md:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="rounded-2xl border-2 border-[#183d29] bg-white p-8 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#183d29] text-2xl">
                ✓
              </div>
              <h3
                className="text-2xl font-black text-[#0f172a] md:text-3xl"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                30-Day Clearer Control Guarantee
              </h3>
              <p className="mx-auto mt-4 max-w-lg text-slate-600">
                Use RenoTrack360 for 30 days. Complete onboarding. Create or send at least three workflow items: estimate, invoice, client report, or change order.
              </p>
              <p className="mx-auto mt-3 max-w-lg font-semibold text-[#0f172a]">
                If you do not have clearer control of your renovation workflow than you did on day one, we refund your first month. No runaround.
              </p>
              <div className="mt-6 grid gap-3 text-left md:grid-cols-3">
                {[
                  { icon: "🔒", label: "No long-term contract", sub: "Cancel anytime" },
                  { icon: "💳", label: "No credit card at signup", sub: "Waitlist is free" },
                  { icon: "📞", label: "No sales call required", sub: "Start on your own" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3">
                    <span className="text-xl">{item.icon}</span>
                    <div>
                      <p className="text-sm font-bold">{item.label}</p>
                      <p className="text-sm text-slate-500">{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ────────────────────────────────────────────────────────────── */}
        <section className="px-4 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-3xl">
            <div className="mb-10 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">FAQ</p>
              <h2
                className="mt-3 text-3xl font-black"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                Questions contractors actually ask.
              </h2>
            </div>
            <div className="space-y-4">
              {FAQS.map((faq) => (
                <details key={faq.q} className="group rounded-xl border border-slate-200 bg-white">
                  <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4 text-base font-bold text-[#0f172a] marker:hidden">
                    {faq.q}
                    <span className="shrink-0 text-slate-400 transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="border-t border-slate-100 px-5 py-4 text-base leading-relaxed text-slate-500">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA with share-loop prompt ─────────────────────────────── */}
        <section className="bg-[#183d29] px-4 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2
              className="text-3xl font-black text-white md:text-4xl"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Your business finally remembers everything.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base text-white/80">
              Every lead. Every change order. Every client decision. Every job photo. Every dollar. Every follow-up.
            </p>
            <div className="mx-auto mt-8 max-w-md">
              <WaitlistForm size="large" />
            </div>
            {/* Diagnostic share loop trigger */}
            <div className="mt-8 rounded-xl border border-white/10 bg-white/5 px-5 py-4">
              <p className="text-base font-semibold text-white/85">
                Running this business with a partner or co-owner?
              </p>
              <p className="mt-1 text-sm text-white/70">
                Forward this page and ask them: "Is this what we've been dealing with?" Compare your read. It is a faster conversation than most partnerships have had in years.
              </p>
            </div>
          </div>
        </section>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <footer className="border-t border-slate-100 bg-white px-4 py-8 md:px-8 md:py-10">
          <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 md:flex-row">
            <Link href="/" className="text-base font-black text-[#183d29]" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              RenoTrack<span className="text-green-700">360</span>
            </Link>
            <p className="text-sm text-slate-400 text-center">
              Renovation contractor management software. Built for companies doing $300K to $5M in annual volume. Lead to closeout.
            </p>
            <div className="flex items-center gap-5 text-xs font-semibold text-slate-400">
              <Link href="/login" className="hover:text-slate-600">Sign in</Link>
              <a href="mailto:hello@renotrack360.com" className="hover:text-slate-600">hello@renotrack360.com</a>
            </div>
          </div>
          {/* SEO entity footer for LLMs and crawlers */}
          <p className="mt-6 text-center text-xs text-slate-300">
            RenoTrack360 is renovation contractor management software covering change order management, scope creep protection, job costing, weekly construction progress reports, client portal for contractors, remodeling project management, and the full lead-to-closeout renovation lifecycle. A Buildertrend alternative built specifically for residential remodelers.
          </p>
        </footer>
      </div>
    </>
  );
}
