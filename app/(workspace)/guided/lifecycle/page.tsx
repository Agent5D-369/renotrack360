import { requireStaffPage } from "@/lib/staff-access";
﻿import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";

const stages = [
  {
    number: 1,
    name: "Lead & Scope",
    color: "border-sky-400 bg-sky-50",
    badge: "bg-sky-100 text-sky-800",
    connector: "bg-sky-300",
    icon: "🎯",
    tagline: "Qualify before you quote.",
    what: "Capture the relationship, tie a property to it, and build a lead record that scores budget fit, trust, urgency, and scope clarity. Do not invest quote time until the lead qualifies.",
    tools: [
      ["Create profile", "/profiles/new", "One record per human or company - reused across leads, jobs, and invoices."],
      ["Add property", "/properties/new", "Address, condition, access notes, and risk flags."],
      ["Open lead", "/leads/new", "Stage, budget, urgency, and next action in one place."],
      ["Lead list", "/leads", "Review all open leads and move stages."]
    ],
    doneWhen: [
      "Profile, property, and lead record all exist and are linked",
      "Budget range, urgency, and trust fit scored",
      "Scope walkthrough is scheduled or notes are captured",
      "Next action is set with a date"
    ]
  },
  {
    number: 2,
    name: "Quote & Estimate",
    color: "border-violet-400 bg-violet-50",
    badge: "bg-violet-100 text-violet-800",
    connector: "bg-violet-300",
    icon: "📋",
    tagline: "Price it right. Track confidence.",
    what: "Build a structured quote with catalog line items, markup, contingency, and risk notes. Convert to a tracked estimate with readiness scores, a client-facing summary, and a follow-up sequence.",
    tools: [
      ["Quote Wizard", "/quotes/field-wizard", "Field walkthrough: rooms, catalog items, risk, allowances."],
      ["New quote", "/quotes/new", "Manual scope and pricing with markup and contingency."],
      ["Cost catalog", "/cost-catalog", "Reusable line items with risk factors and units."],
      ["Estimates", "/estimates", "Convert quotes to tracked estimates with confidence and readiness."]
    ],
    doneWhen: [
      "Quote scope covers all rooms and phases discussed",
      "Markup, contingency, and allowances are documented",
      "Estimate readiness, confidence, and scope clarity all above 60",
      "Client-facing summary written - no bare numbers sent",
      "Follow-up schedule set"
    ]
  },
  {
    number: 3,
    name: "Proposal & Approval",
    color: "border-amber-400 bg-amber-50",
    badge: "bg-amber-100 text-amber-800",
    connector: "bg-amber-300",
    icon: "✅",
    tagline: "Present options. Collect approval.",
    what: "Build a Good / Better / Best proposal so the client chooses investment level, not whether to proceed. Track views, run follow-ups, and collect a recorded approval before any work begins.",
    tools: [
      ["Build proposal", "/estimates", "Open estimate → Build proposal to set Good / Better / Best tiers."],
      ["Track views", "/estimates", "View events show when and how many times the estimate was opened."],
      ["Follow-ups", "/estimates", "Scheduled follow-up sequence keeps deals moving without memory."],
      ["Approvals", "/approvals", "Record signer, date, status, and notes before converting to job."]
    ],
    doneWhen: [
      "Good / Better / Best options presented - client chose a tier",
      "Estimate viewed by client (view event recorded)",
      "Follow-up sequence ran at least once",
      "Approval recorded with signer and date",
      "No scope work started before approval"
    ]
  },
  {
    number: 4,
    name: "Job Kickoff",
    color: "border-emerald-400 bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-800",
    connector: "bg-emerald-300",
    icon: "🔨",
    tagline: "Set the spine before breaking ground.",
    what: "Convert the approved quote to an operating job. Deploy an order-of-operations template, assign phase tasks, set budget lines, open selections, run the kickoff checklist, and assign crew before any site work.",
    tools: [
      ["Jobs", "/jobs/new", "Create the job from the approved quote with contract amount."],
      ["Order of operations", "/order-of-operations", "Confirm phase sequence for this project type."],
      ["Selections", "/selections", "Open all client-decision sheets before procurement."],
      ["Budget", "/jobs", "Set budget lines from the quote - track estimate vs actual from day one."],
      ["Kickoff checklist", "/checklists", "Block missing permits, scope, protection, and proof before demo."]
    ],
    doneWhen: [
      "Job record created with contract amount",
      "All phases present - tasks assigned to each phase",
      "Crew assigned to opening tasks",
      "Budget lines match estimate scope",
      "Selections sheet open with client decision dates",
      "Kickoff checklist complete - permits and protection confirmed"
    ]
  },
  {
    number: 5,
    name: "Construction & Execution",
    color: "border-orange-400 bg-orange-50",
    badge: "bg-orange-100 text-orange-800",
    connector: "bg-orange-300",
    icon: "🏗️",
    tagline: "Run the field. Protect the margin.",
    what: "Advance phases by completing tasks and uploading proof photos. Log actual costs against the budget. Document change orders before doing the work. Send weekly client reports to prevent surprise calls. Invoice on milestones.",
    tools: [
      ["My Day", "/field", "Crew view: today's tasks and required proof - nothing extra."],
      ["Job budget", "/jobs", "Open job → Budget to log actual costs and watch margin."],
      ["Change orders", "/change-orders/new", "Document hidden conditions, scope additions, and pricing before work moves."],
      ["Weekly reports", "/weekly-reports/new", "Send a branded client update every Friday - photos, progress, next week."],
      ["Invoices", "/invoices/new", "Bill on deposit, milestone, and progress schedule - not just at the end."]
    ],
    doneWhen: [
      "All phase tasks complete with proof photos attached",
      "No unapproved change orders executed",
      "Actual costs logged - budget variance under control",
      "Weekly reports sent every Friday",
      "Milestone invoices paid before next phase begins"
    ]
  },
  {
    number: 6,
    name: "Closeout & Revenue",
    color: "border-rose-400 bg-rose-50",
    badge: "bg-rose-100 text-rose-800",
    connector: "bg-rose-300",
    icon: "🏁",
    tagline: "Finish clean. Collect everything.",
    what: "Complete the punch list in writing, do a final walkthrough with the client, send the final invoice, collect payment, publish a closeout client portal update, and request a Google review and referral before the crew leaves the site.",
    tools: [
      ["Punch list", "/jobs", "Assign remaining items with due dates and photo proof required."],
      ["Final invoice", "/invoices/new", "Balance due - document payment method and date."],
      ["Client portal", "/client-portal", "Publish closeout update with final photo set."],
      ["Review request", "/jobs", "Open job → Client communications → Request review via SMS."],
      ["Agreements", "/agreements", "Attach warranty scope, duration, exclusions, and signed copy."]
    ],
    doneWhen: [
      "Punch list items all marked complete with photos",
      "Final walkthrough done - client signed off",
      "Final invoice paid - zero balance due",
      "Closeout client portal update published",
      "Google review requested",
      "Warranty terms documented and signed"
    ]
  }
] as const;

export default async function LifecyclePage() {
  await requireStaffPage();
  // Live pipeline counts
  const [
    openLeads,
    activeEstimates,
    pendingApprovals,
    kickoffJobs,
    activeJobs,
    closeoutJobs
  ] = await Promise.all([
    prisma.lead.count({ where: { status: { notIn: ["WON", "LOST", "NURTURE"] } } }),
    prisma.estimate.count({ where: { status: { in: ["DRAFT", "SENT", "VIEWED"] } } }),
    prisma.clientApproval.count({ where: { status: { in: ["SENT", "VIEWED"] } } }),
    prisma.job.count({ where: { jobStatus: { in: ["PRE_CONSTRUCTION", "DEPOSIT_RECEIVED", "MATERIALS_PLANNING"] } } }),
    prisma.job.count({ where: { jobStatus: { in: ["DEMO", "ROUGH_IN", "INSPECTIONS", "DRYWALL_SURFACES", "FINISHES"] } } }),
    prisma.job.count({ where: { jobStatus: { in: ["PUNCH_LIST", "FINAL_WALKTHROUGH"] } } })
  ]);

  const counts = [openLeads, activeEstimates, pendingApprovals, kickoffJobs, activeJobs, closeoutJobs];

  return (
    <>
      <PageHeader
        title="Lead to Punchout"
        body="The complete renovation lifecycle - every stage, every standard, and where your pipeline stands right now."
        actionHref="/guided"
        actionLabel="All guides"
      />

      {/* Pipeline health strip */}
      <div className="mb-8 grid grid-cols-3 gap-2 rounded-xl border border-border bg-white p-4 shadow-soft md:grid-cols-6">
        {stages.map((stage, i) => (
          <div key={stage.number} className="text-center">
            <p className="text-2xl font-black">{counts[i]}</p>
            <p className="mt-0.5 text-xs font-semibold text-muted-foreground leading-tight">{stage.name}</p>
          </div>
        ))}
      </div>

      {/* Stage flow */}
      <div className="grid gap-4">
        {stages.map((stage, i) => (
          <div key={stage.number} className="relative">
            {/* Connector line */}
            {i < stages.length - 1 && (
              <div className={`absolute left-[28px] top-full z-10 h-4 w-1 ${stage.connector}`} />
            )}

            <details className={`group rounded-xl border-2 ${stage.color} overflow-hidden`} open={i === 0} suppressHydrationWarning>
              <summary className="flex cursor-pointer list-none items-center gap-4 p-5">
                <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full border-2 border-current bg-white text-2xl shadow-sm">
                  {stage.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-bold ${stage.badge}`}>Stage {stage.number}</span>
                    {counts[i] > 0 && (
                      <span className="rounded bg-foreground px-2 py-0.5 text-xs font-bold text-background">
                        {counts[i]} active
                      </span>
                    )}
                  </div>
                  <h2 className="mt-1 text-xl font-black">{stage.name}</h2>
                  <p className="text-sm font-semibold text-muted-foreground">{stage.tagline}</p>
                </div>
                <svg className="h-5 w-5 shrink-0 text-muted-foreground transition group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </summary>

              <div className="grid gap-6 border-t border-black/10 p-5 md:grid-cols-[1fr_280px]">
                {/* Left: what + tools */}
                <div className="grid gap-5">
                  <div>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">What happens here</h3>
                    <p className="text-sm leading-relaxed">{stage.what}</p>
                  </div>
                  <div>
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Tools to use</h3>
                    <div className="grid gap-2">
                      {stage.tools.map(([label, href, help]) => (
                        <Link
                          key={label}
                          href={href}
                          className="flex items-start gap-3 rounded-lg border border-black/10 bg-white/70 p-3 transition hover:bg-white"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold">{label}</p>
                            <p className="text-xs text-muted-foreground">{help}</p>
                          </div>
                          <span className="shrink-0 text-xs font-bold text-primary">Open →</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: done when */}
                <div>
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Stage complete when</h3>
                  <ul className="grid gap-2">
                    {stage.doneWhen.map((criterion) => (
                      <li key={criterion} className="flex items-start gap-2 text-sm">
                        <span className="mt-0.5 shrink-0 text-emerald-600">✓</span>
                        <span>{criterion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </details>
          </div>
        ))}
      </div>

      {/* Bottom principle */}
      <div className="mt-8 rounded-xl border border-border bg-white p-5 shadow-soft">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Operating principle</p>
        <p className="mt-2 text-lg font-bold">Every stage must answer three questions before advancing:</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            ["What is the next action?", "Not a status - a specific task with an owner and a date."],
            ["What proof protects the business?", "Photos, approvals, signed documents, and recorded decisions."],
            ["What does the client see?", "Clear communication at each stage prevents disputes at closeout."]
          ].map(([q, a]) => (
            <div key={q} className="rounded-lg border border-border p-4">
              <p className="text-sm font-bold">{q}</p>
              <p className="mt-1 text-xs text-muted-foreground">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
