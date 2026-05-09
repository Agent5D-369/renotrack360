import {
  ClipboardCheck,
  FileSignature,
  FolderKanban,
  HandCoins,
  HardHat,
  ListChecks,
  MessagesSquare,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  UploadCloud
} from "lucide-react";

export const guidedWorkflows = [
  {
    title: "Lead to Estimate",
    href: "/guided/lead-to-estimate",
    icon: ClipboardCheck,
    outcome: "Capture a lead, qualify fit, connect the property, and build a tracked estimate.",
    steps: [
      ["Create profile", "/profiles/new", "Add the human/company relationship before the opportunity."],
      ["Create property", "/properties/new", "Tie renovation context to an address, condition, and risk notes."],
      ["Create lead", "/leads/new", "Score budget, urgency, trust fit, scope clarity, and next action."],
      ["Create quote", "/quotes/new", "Start structured scope and pricing."],
      ["Add catalog line items", "/quotes", "Use the RenoTech Cost Catalog, risk factors, markup, and contingency."],
      ["Create tracked estimate", "/quotes", "Generate follow-ups, readiness, revisions, options, and approvals."]
    ]
  },
  {
    title: "Estimate Approval",
    href: "/guided/estimate-approval",
    icon: FileSignature,
    outcome: "Send a professional estimate, track views, follow up, collect approval, and convert to job.",
    steps: [
      ["Check readiness", "/estimates", "Confirm scope clarity, confidence, allowance notes, and client summary."],
      ["Review Good / Better / Best", "/approvals", "Show options without burying the base scope."],
      ["Track follow-up", "/estimates", "Use scheduled follow-ups instead of memory or scattered texts."],
      ["Record approval", "/approvals", "Store signer, timestamp, status, and notes."],
      ["Convert to job", "/quotes", "Create the operating job with phases and financial baseline."]
    ]
  },
  {
    title: "Job Kickoff",
    href: "/guided/job-kickoff",
    icon: FolderKanban,
    outcome: "Turn an approved job into a controlled renovation sequence.",
    steps: [
      ["Review order of operations", "/order-of-operations", "Confirm the canonical operating sequence and active phase."],
      ["Deploy a task template", "/jobs", "Use Kitchen, Bathroom, or Full Interior templates to generate starter tasks in the correct phase order."],
      ["Assign phase tasks", "/jobs", "Every task should be attached to the phase it advances, either from the job-level template or the phase add-task button."],
      ["Run kickoff checklist", "/checklists", "Block missing scope, protection, selections, permits, and proof."],
      ["Assign crew", "/operations", "Match workers/subs to tasks and availability."],
      ["Open selections", "/selections", "Resolve client decisions before procurement or install dates slip."],
      ["Set budget lines", "/budget", "Track estimate vs committed vs actual costs from day one."]
    ]
  },
  {
    title: "Field Day",
    href: "/guided/field-day",
    icon: HardHat,
    outcome: "Give crews one simple screen for the day’s work.",
    steps: [
      ["Open My Day", "/field", "See assigned tasks and required proof."],
      ["Add task", "/jobs", "Add work from the related job and attach it to the correct order-of-operations phase."],
      ["Upload proof", "/jobs", "Capture required photos/documents from the job record before work is hidden."],
      ["Report blocker", "/change-orders/new", "Create a visible issue before delays become surprises."],
      ["Log hours", "/operations", "Capture labor while the work is fresh."]
    ]
  },
  {
    title: "Selections to Procurement",
    href: "/guided/selections",
    icon: PackageCheck,
    outcome: "Keep client choices, allowances, lead times, and orders aligned.",
    steps: [
      ["Create selection sheet", "/selections", "Group choices by room, area, category, and due date."],
      ["Offer options", "/selections", "Present Good / Better / Best with photos, links, pros, cons, and recommendation."],
      ["Approve selection", "/approvals", "Record client approval before ordering or installing."],
      ["Track variance", "/selections", "Flag allowance overages and schedule impact."],
      ["Push procurement", "/resources", "Move approved selections into material requests and ordering."]
    ]
  },
  {
    title: "Change Order Discipline",
    href: "/guided/change-order",
    icon: ListChecks,
    outcome: "Protect margin by documenting changes before work moves forward.",
    steps: [
      ["Capture field condition", "/field", "Attach photos and notes from the jobsite."],
      ["Create change order", "/change-orders/new", "Enter reason, added cost, added time, and client request status."],
      ["Run protection checklist", "/checklists", "Require cost, time, photos, and approval."],
      ["Track approval", "/approvals", "Do not execute changed scope without approval."],
      ["Update budget", "/budget", "Add approved cost into contract and forecast."]
    ]
  },
  {
    title: "Weekly Client Report",
    href: "/guided/client-report",
    icon: MessagesSquare,
    outcome: "Turn field activity into a branded update clients trust.",
    steps: [
      ["Review field reports", "/operations", "Pull completed work, blockers, materials, weather, and photos."],
      ["Create weekly report", "/weekly-reports/new", "Write client summary, budget notes, schedule notes, and next-week plan."],
      ["Publish update", "/client-portal", "Show what changed and what decision is needed."],
      ["Generate PDF", "/weekly-reports", "Create branded record for remote owners and investors."]
    ]
  },
  {
    title: "Closeout and Review",
    href: "/guided/closeout",
    icon: ShieldCheck,
    outcome: "Finish cleanly with proof, punch list, warranty notes, invoice, and testimonial.",
    steps: [
      ["Run closeout checklist", "/checklists", "Require final photos, warranty notes, final invoice, review request, and scorecards."],
      ["Finish punch list", "/jobs", "Assign remaining items and verify completion."],
      ["Send final invoice", "/invoices/new", "Collect balance and document payment status."],
      ["Publish closeout update", "/client-portal", "Give the client a clean final record."],
      ["Request feedback", "/client-portal", "Capture testimonial and subcontractor scorecard."]
    ]
  },
  {
    title: "Migration Setup",
    href: "/guided/migration",
    icon: UploadCloud,
    outcome: "Move from another system without losing history.",
    steps: [
      ["Import contacts", "/imports", "Map people and companies into Profiles."],
      ["Import cost catalog", "/imports", "Preserve pricing history and normalize into catalog items."],
      ["Import jobs", "/imports", "Create job shells, phases, invoices, and documents."],
      ["Review errors", "/imports", "Fix failed rows before go-live."],
      ["Seed templates", "/checklists", "Apply standard workflow templates to active work."]
    ]
  },
  {
    title: "AI Assist",
    href: "/guided/ai-assist",
    icon: Sparkles,
    outcome: "Use AI to reduce admin work while keeping humans in control.",
    steps: [
      ["Review AI queue", "/ai-team", "See drafted follow-ups, risk checks, reports, and review prompts."],
      ["Approve suggestions", "/ai-team", "Human review stays required for client-facing messages."],
      ["Attach to workflow", "/ai-team", "Each AI task targets a lead, estimate, job, report, or approval."],
      ["Close the loop", "/today", "Completed AI work should create visible next actions, not disappear."]
    ]
  }
] as const;

export const helpTopics = [
  {
    title: "Start with Today",
    body: "Use Today as the operating cockpit. It shows follow-ups, reports due, change orders, invoices, active jobs, and pipeline money so the next action is visible without searching."
  },
  {
    title: "Use Profiles before Leads",
    body: "Profiles are relationship records. Add agents, investors, homeowners, designers, vendors, subcontractors, and past clients once, then connect them to leads, jobs, quotes, and follow-ups."
  },
  {
    title: "Use the Order of Operations as the job spine",
    body: "Every job receives the RenoTech360 construction order of operations. The job detail page shows a computed next open phase from phase/task completion, while the job status remains editable for business-level state such as Materials Planning or Final Walkthrough."
  },
  {
    title: "Tasks should live inside phases",
    body: "A task without a phase is harder to schedule, report, and verify. Use the add-task button inside each phase or deploy a common renovation template to create a complete starter task list."
  },
  {
    title: "Job money cards",
    body: "Contract comes from the approved quote plus approved change orders, Paid comes from recorded receipts/job payment tracking, and Balance is contract minus paid. Edit the job if a legacy amount needs correction; invoices and payments should become the system of record as payment automation matures."
  },
  {
    title: "Clickable records and loading feedback",
    body: "Today cards, follow-ups, jobs, source records, and PDF links are designed to navigate to the related record. The workspace shows an animated loading overlay after link clicks and form submissions so field users know the app is working."
  },
  {
    title: "Profile scores",
    body: "Relationship, Trust, Lead, and Referral scores are editable 0-100 profile fields. Use them to decide who needs attention, who is likely to produce work, and who can create strong referrals."
  },
  {
    title: "Estimate confidence matters",
    body: "Do not send vague pricing. Use readiness, confidence, allowances, exclusions, Good / Better / Best options, and follow-up scheduling to reduce pricing surprises."
  },
  {
    title: "Selections protect schedule and margin",
    body: "Every selected product should have a room, category, allowance, vendor, SKU/link, lead time, required-by date, approval status, and change-order flag when it exceeds allowance."
  },
  {
    title: "Photos are proof",
    body: "Use required evidence rules for pre-existing conditions, hidden work, milestone completion, change orders, safety issues, and closeout. Random camera-roll photos do not protect the business."
  },
  {
    title: "Field mode stays simple",
    body: "Crew users should use My Day for assigned work and required proof. Add Task routes to Jobs because a task needs a job and phase; Add Photo routes to Jobs because proof belongs to a job, report, change order, or checklist; blockers route to Change Orders when they may affect cost, schedule, or scope."
  },
  {
    title: "Voice notes need browser microphone support",
    body: "Voice note buttons use the browser speech-recognition feature. Chrome and Edge are the best targets. If a button appears to do nothing, check microphone permission in the browser address bar and allow microphone access for localhost. Unsupported browsers show a visible status message and still allow typing."
  },
  {
    title: "Quote Wizard is the field walkthrough",
    body: "Use Quote Wizard instead of a paper estimate sheet. It autosaves drafts locally, walks through client/property context, material responsibility, whole-property checks, room measurements, cabinet planning, allowances, risk notes, and voice-captured notes."
  },
  {
    title: "AI is review-first",
    body: "AI can draft follow-ups, reports, change orders, and risk checks, but client-facing communication and pricing decisions should remain human-approved."
  },
  {
    title: "Security basics",
    body: "Keep .env out of Git, rotate credentials that were pasted into chat, use Railway environment variables for production, and do not enable fake payment or lending integrations."
  }
] as const;
