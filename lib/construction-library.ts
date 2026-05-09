export type LibraryPhase = 1 | 2 | 3;

export interface LibraryStep {
  slug: string;
  phase: LibraryPhase;
  phaseNumber: number;
  globalStepNumber: number;
  title: string;
  tagline: string;
  description: string;
  whyItMatters: string;
  worldClass: string[];
  commonMistakes: string[];
  proofRequired: string[];
  clientFacing: boolean;
  appAction?: { label: string; href: string };
}

export const constructionLibrary: LibraryStep[] = [
  // ─── PHASE 1: Lead-to-Pre-construction Lifecycle ──────────────────────────

  {
    slug: "pre-lead-capture",
    phase: 1,
    phaseNumber: 1,
    globalStepNumber: 1,
    title: "Lead Capture",
    tagline: "Every project starts as a name - record it before it disappears.",
    description:
      "Lead capture is the moment an opportunity enters your pipeline. Whether it arrives via referral, text, web form, or a conversation at a job site, the discipline is the same: get it into the system the same day it happens with a name, source, contact info, and the one-line scope they described.",
    whyItMatters:
      "Contractors lose revenue not because they lack leads but because they lose track of them. A lead captured in your phone notes is a lead that dies. A lead captured in a CRM with a source tag, a follow-up date, and a budget estimate is a lead you can close, measure, and learn from.",
    worldClass: [
      "Every inbound inquiry - text, call, referral, web - logged within 24 hours",
      "Source is always tagged (referral name, platform, campaign) so you know what's working",
      "A profile record is created for the contact before the lead is created",
      "A next action and follow-up date are set at capture, not later",
      "Budget range or project type is estimated even if vague"
    ],
    commonMistakes: [
      "Keeping leads in text threads, sticky notes, or memory instead of a system",
      "Creating a lead without a contact profile attached",
      "No source tag - you can't improve what you can't measure",
      "Skipping the follow-up date because 'I'll remember to call'"
    ],
    proofRequired: [
      "Lead record created with name, contact info, and source",
      "Profile record exists and is linked to the lead",
      "Next action and follow-up date set"
    ],
    clientFacing: false,
    appAction: { label: "Create lead", href: "/leads/new" }
  },

  {
    slug: "pre-lead-qualification",
    phase: 1,
    phaseNumber: 2,
    globalStepNumber: 2,
    title: "Lead Qualification",
    tagline: "Score before you invest time you can't get back.",
    description:
      "Qualification is the rapid assessment of whether this lead is worth your full attention. You are scoring five dimensions: budget fit, urgency, project type fit, trust fit, and scope clarity. A low score is not a rejection - it's a signal to nurture differently or decline gracefully.",
    whyItMatters:
      "Time is your most constrained resource. Chasing unqualified leads is the single largest profit leak in residential renovation. Every hour spent estimating a job you won't win at a price that works is an hour not spent closing a deal that will.",
    worldClass: [
      "Five dimensions scored within the first conversation or inquiry",
      "Budget fit assessed by asking directly, not inferring from the house",
      "Lead type (homeowner, investor, agent, developer) identified immediately",
      "Financing need flagged early - unqualified financing is a change order waiting to happen",
      "A clear 'proceed / nurture / decline' decision made within 48 hours"
    ],
    commonMistakes: [
      "Estimating every lead regardless of fit because you're afraid to say no",
      "Confusing a motivated buyer with a qualified buyer - urgency and budget are not the same",
      "Not asking about decision authority - is this person the decision maker?",
      "Treating investor leads and homeowner leads identically - different buyers, different risks"
    ],
    proofRequired: [
      "Lead scores recorded (urgency, job fit, trust fit, scope clarity, probability)",
      "Budget range documented",
      "Decision made to proceed, nurture, or decline"
    ],
    clientFacing: false,
    appAction: { label: "Edit lead scores", href: "/leads" }
  },

  {
    slug: "pre-discovery-call",
    phase: 1,
    phaseNumber: 3,
    globalStepNumber: 3,
    title: "Discovery Call",
    tagline: "Listen more than you speak - the scope is in what they fear.",
    description:
      "The discovery call is a structured 20–30 minute conversation designed to uncover the real project: motivations, timeline pressures, decision process, budget reality, past contractor experience, and what the client is actually afraid of. It is not a selling call - it is an intelligence-gathering call.",
    whyItMatters:
      "The contractors who close at the highest win rates are the ones who understand the client's actual problem before they ever quote the solution. A client who had a nightmare with a previous contractor needs trust-building before pricing. A client who is selling the house in 90 days needs speed and certifiable quality.",
    worldClass: [
      "Structured question flow - motivations, timeline, budget, decision process, past experience",
      "Listening ratio 70/30 - the client talks more than you",
      "Past contractor experience explored - what went wrong teaches you what to avoid",
      "Decision process mapped - who else is involved, when will they decide?",
      "Call summary sent to client afterward with next steps confirmed"
    ],
    commonMistakes: [
      "Turning the discovery call into a sales pitch before understanding the need",
      "Skipping past contractor history - this is where you learn the real risk",
      "Not confirming the decision process - calling back to a gatekeeper who can't approve",
      "Making verbal pricing commitments before a site walkthrough"
    ],
    proofRequired: [
      "Call notes saved to lead record",
      "Key concerns and motivations documented",
      "Next step scheduled and confirmed with client"
    ],
    clientFacing: true,
    appAction: { label: "Update lead notes", href: "/leads" }
  },

  {
    slug: "pre-property-intake",
    phase: 1,
    phaseNumber: 4,
    globalStepNumber: 4,
    title: "Property / Site Intake",
    tagline: "The property tells the truth about scope before you do.",
    description:
      "Site intake is the structured documentation of the property before any scope commitment. Age, condition, access, existing systems, known defects, HOA restrictions, permit history, and utility locations all shape the true cost of a project. This is done before the walkthrough, not during.",
    whyItMatters:
      "Scope creep and cost overruns are disproportionately caused by conditions that were visible before the job started but never formally documented. A 1960s home with knob-and-tube wiring and galvanized plumbing is a fundamentally different scope than a 1995 home with updated systems - and your pricing should reflect that.",
    worldClass: [
      "Property record created with address, year built, property type, and known systems",
      "HOA restrictions and permit history checked before the walkthrough",
      "Site access documented - parking, dumpster placement, material staging, occupied home protocols",
      "Utility locations noted - shutoffs, panel access, gas meter",
      "Risk flags set for any known or suspected issues (asbestos era, flood zone, prior water damage)"
    ],
    commonMistakes: [
      "Treating every property the same regardless of age or condition",
      "Not checking for active permits or open violations before quoting",
      "Forgetting to ask about HOA - association approval can delay weeks",
      "No staging plan - the first week of a job reveals what site prep missed"
    ],
    proofRequired: [
      "Property record created and linked to the lead",
      "Year built, property type, and known systems documented",
      "Risk flags and access notes added"
    ],
    clientFacing: false,
    appAction: { label: "Create property", href: "/properties/new" }
  },

  {
    slug: "pre-initial-budget",
    phase: 1,
    phaseNumber: 5,
    globalStepNumber: 5,
    title: "Initial Budget Fit",
    tagline: "Align on range before you spend time scoping details.",
    description:
      "Initial budget fit is the honest conversation about investment range before a full scope or quote is developed. You are not pricing the job - you are confirming that the client's expectations and your minimum price for quality work are within range of each other. A $15,000 budget for a $60,000 project means you help them reset expectations or you walk away.",
    whyItMatters:
      "The biggest time-wasters in residential renovation are quotes built for clients who were never willing to pay for the scope. Confirming budget range early protects both parties - the client doesn't get a shock when the quote arrives, and you don't invest 4 hours building a proposal you won't win.",
    worldClass: [
      "Range-based conversation - 'Projects like this typically run between X and Y' - not a commit",
      "Scope assumptions made explicit - what is and isn't included in that range",
      "Client's expectation reality-checked without being dismissive",
      "Financing options surfaced early if the budget gap is closable with financing",
      "A clear proceed/adjust/decline decision before full scoping begins"
    ],
    commonMistakes: [
      "Avoiding the budget conversation entirely and hoping the quote lands",
      "Giving a number without scope context - client remembers the low end",
      "Not separating your budget range from the client's stated budget",
      "Underpricing to get the job instead of pricing to do it right"
    ],
    proofRequired: [
      "Budget range discussed and documented in lead notes",
      "Scope assumptions noted alongside the range",
      "Client proceed/adjust decision recorded"
    ],
    clientFacing: true,
    appAction: { label: "Update lead budget", href: "/leads" }
  },

  {
    slug: "pre-walkthrough-scheduled",
    phase: 1,
    phaseNumber: 6,
    globalStepNumber: 6,
    title: "Walkthrough Scheduled",
    tagline: "A confirmed site visit is a qualified lead - treat it that way.",
    description:
      "Scheduling the walkthrough is not administrative - it is a qualifying signal. A client who confirms a time and shows up has made a real commitment. Prepare for it like a professional: review the discovery call notes, confirm who will be present, and bring your scope capture system.",
    whyItMatters:
      "Contractors who show up to walkthroughs unprepared lose credibility before they quote. Clients who are evaluating multiple contractors remember the one who asked smart questions and arrived with a system. The walkthrough is the first moment the client sees how you operate.",
    worldClass: [
      "Confirmation sent 24 hours before with parking, access, and timing notes",
      "Discovery call notes reviewed - know the client's priorities before you arrive",
      "Decision makers confirmed - both spouses or investor and property manager attending",
      "Quote Wizard or scope form loaded and ready before arrival",
      "Arrival on time - not early, not late - or communicated in advance"
    ],
    commonMistakes: [
      "Confirming a walkthrough and not following up when the client goes silent",
      "Showing up without reviewing prior conversation notes",
      "Only one decision-maker present - quote gets renegotiated later",
      "No digital scope capture - taking handwritten notes you can't price from"
    ],
    proofRequired: [
      "Walkthrough confirmed with date, time, and attendees noted in lead record",
      "Pre-walkthrough prep notes documented"
    ],
    clientFacing: true,
    appAction: { label: "Update lead follow-up", href: "/leads" }
  },

  {
    slug: "pre-site-walkthrough",
    phase: 1,
    phaseNumber: 7,
    globalStepNumber: 7,
    title: "Site Walkthrough",
    tagline: "Every room tells you something - the scope is in the details you capture.",
    description:
      "The site walkthrough is the primary scope-capture event. You are measuring, photographing, noting conditions, confirming client decisions, flagging risks, and capturing the full scope while standing in the space. What you don't capture here will become a change order later.",
    whyItMatters:
      "Quotes built from memory or rough notes consistently underestimate scope. The walkthrough is the one moment you have unfiltered access to the conditions that drive cost. Every skipped room, unmeasured dimension, and unasked question becomes a negotiation at change order time.",
    worldClass: [
      "Every room entered, photographed, and measured - even rooms not in scope",
      "Existing conditions documented: systems, finishes, access, damage, and defects",
      "Scope assumptions confirmed with the client on the spot - not guessed later",
      "Risk conditions flagged: signs of water damage, outdated systems, structural questions",
      "Before photos taken with timestamps and location tags",
      "Quote Wizard or structured form used to capture scope in real time"
    ],
    commonMistakes: [
      "Only entering rooms that are obviously in scope - adjacent rooms affect scope",
      "Not photographing existing conditions before touching anything",
      "Relying on the client's description of what they want without confirming scope boundaries",
      "Missing roof, attic, crawlspace, or mechanical room when they affect the job"
    ],
    proofRequired: [
      "Before photos taken and attached to property/lead record",
      "Room-by-room scope notes captured",
      "Risk conditions documented"
    ],
    clientFacing: true,
    appAction: { label: "Open Quote Wizard", href: "/quotes/field-wizard" }
  },

  {
    slug: "pre-scope-definition",
    phase: 1,
    phaseNumber: 8,
    globalStepNumber: 8,
    title: "Scope Definition",
    tagline: "What is included is worth less than what is explicitly excluded.",
    description:
      "Scope definition is the structured translation of walkthrough notes into a written project scope: what is included, what is excluded, what is an allowance, what requires client decisions, and what conditions could trigger a change order. It is the contract's technical foundation.",
    whyItMatters:
      "Scope disputes are the most common cause of contractor-client conflict. Every dispute traces back to a scope that was assumed, not written. A client who thought painting included the ceilings, the client who assumed the old flooring removal was included, the client who expected trim replacement as part of a paint job - these are scope failures, not client failures.",
    worldClass: [
      "Written scope organized by room and trade - not a narrative paragraph",
      "Exclusions listed explicitly: 'does not include ceiling painting, trim repair, closet interiors'",
      "Allowances stated with amounts: '$800 tile allowance per bathroom - selections to be made by [date]'",
      "Client decision dependencies noted: 'counter template after cabinet install - client to select by Week 2'",
      "Change order triggers stated: 'if concealed water damage is found behind tile, a change order will be issued before work continues'"
    ],
    commonMistakes: [
      "Writing a scope that describes what you plan to do without listing what is excluded",
      "Using allowances without documenting the amount and selection deadline",
      "Vague language: 'paint as needed,' 'repair damaged areas,' 'update fixtures'",
      "Not referencing the scope in the contract - scope lives in email, contract has none"
    ],
    proofRequired: [
      "Written scope document or quote line items covering all rooms discussed",
      "Exclusions listed in writing",
      "Allowances documented with amounts and deadlines"
    ],
    clientFacing: true,
    appAction: { label: "Build quote scope", href: "/quotes/new" }
  },

  {
    slug: "pre-risk-permit-review",
    phase: 1,
    phaseNumber: 9,
    globalStepNumber: 9,
    title: "Risk / Permit / Trade Review",
    tagline: "The permit question and the risk question are the same question.",
    description:
      "Before pricing is finalized, every project must be reviewed for permit requirements, trade licensing needs, and scope risks that could change cost or timeline. This is not optional due diligence - it is the difference between a quote that holds and one that gets repriced mid-job.",
    whyItMatters:
      "Unpermitted work creates legal liability for the contractor and financial liability for the homeowner at resale. Trade work done by unlicensed subs creates insurance exposure. Risk conditions that weren't priced - asbestos tile, active water damage, undersized electrical - become emergency change orders that destroy the client relationship.",
    worldClass: [
      "Permit requirements checked with the local building department before quoting",
      "All trade work (electric, plumbing, HVAC) assigned to licensed subs with verified insurance",
      "Asbestos/lead risk assessed for pre-1980 homes - abatement added to scope if needed",
      "Structural risk questions identified before quoting - engineer review if needed",
      "Insurance and liability coverage confirmed for the specific job type"
    ],
    commonMistakes: [
      "Assuming no permit is needed because the client doesn't want one",
      "Using unlicensed tradespeople to save cost - one callback undoes the savings",
      "Not including permit fees in the quote - they become a surprise add-on",
      "Skipping asbestos risk assessment on older homes because it feels unlikely"
    ],
    proofRequired: [
      "Permit requirements documented and included in scope",
      "Trade licensing and insurance verified",
      "Risk conditions flagged and priced or excluded"
    ],
    clientFacing: false,
    appAction: { label: "View lead risk notes", href: "/leads" }
  },

  {
    slug: "pre-rough-budget",
    phase: 1,
    phaseNumber: 10,
    globalStepNumber: 10,
    title: "Rough Budget Range",
    tagline: "Frame the investment before the detailed number lands.",
    description:
      "The rough budget range is a pre-quote communication that sets the investment frame before the formal estimate is delivered. It uses your scope notes to give the client a confirmed range - not a number - so they are not surprised by the quote and you are not negotiating against a number they invented.",
    whyItMatters:
      "Quotes that land with no prior framing get anchored to the client's expectation, not the market rate. A client who mentally budgeted $40K and receives a $78K quote will renegotiate scope, delay deciding, or go to a lower bidder who will underdeliver. A client who was told 'based on scope, expect $70–85K' will evaluate the $78K quote in context.",
    worldClass: [
      "Range delivered verbally or via email before the formal quote is sent",
      "Range tied to specific scope: 'for the kitchen and two baths as discussed - $70–85K'",
      "Scope change triggers explained: 'if the plumbing needs to be rerouted, that adds $8–15K'",
      "Client's reaction to the range documented - objection handling happens now, not at quote delivery",
      "Range framing used to open the Good / Better / Best conversation"
    ],
    commonMistakes: [
      "Sending the detailed quote without a prior range - client anchors to the lowest line item",
      "Making the range too wide: '$40K–$120K' is not a range, it's a shrug",
      "Not tying the range to specific scope - client assumes the low end includes everything",
      "Avoiding the conversation because you're afraid of a negative reaction"
    ],
    proofRequired: [
      "Range communicated and client response documented in lead notes",
      "Scope assumptions tied to the range"
    ],
    clientFacing: true,
    appAction: { label: "Update lead notes", href: "/leads" }
  },

  {
    slug: "pre-quote-build",
    phase: 1,
    phaseNumber: 11,
    globalStepNumber: 11,
    title: "Quote Build",
    tagline: "Every line item is a claim you're making - price it like you mean it.",
    description:
      "Quote build is the construction of the formal pricing document from walkthrough scope, catalog line items, trade bids, material costs, markup, contingency, and allowances. It must be detailed enough to be compared against your invoice at closeout and defensible in a dispute.",
    whyItMatters:
      "Vague quotes attract problem clients. A quote that says 'kitchen renovation - $45,000' is a lottery ticket, not a contract basis. A quote that itemizes demo, rough trade work, cabinets, counters, tile, paint, flooring, trim, and punch list - with allowances and exclusions - is a project plan.",
    worldClass: [
      "Line items organized by phase and trade - not a single lump sum",
      "Catalog items used - consistent unit pricing that doesn't change bid to bid",
      "Markup applied transparently and consistently (not hidden in line items)",
      "Contingency line included - typically 10–15% for residential, more for older homes",
      "Allowances stated with amounts - not absorbed into the base price",
      "Good / Better / Best options prepared - gives client investment choice, not a take-it-or-leave-it"
    ],
    commonMistakes: [
      "One-line quotes: 'complete renovation - $X' with no breakdown",
      "Pricing from memory instead of catalog - same work priced differently each time",
      "No contingency - every unexpected condition becomes a fight",
      "Burying allowances in the base price - when the client upgrades, you eat the delta"
    ],
    proofRequired: [
      "Quote with itemized line items created and linked to the lead/property",
      "Markup, contingency, and allowances documented",
      "Good / Better / Best tiers prepared"
    ],
    clientFacing: false,
    appAction: { label: "Build quote", href: "/quotes/new" }
  },

  {
    slug: "pre-quote-review",
    phase: 1,
    phaseNumber: 12,
    globalStepNumber: 12,
    title: "Quote Review Call",
    tagline: "Walk them through the quote - don't make them discover it alone.",
    description:
      "The quote review call is a scheduled conversation to walk the client through the estimate before they read it independently. You explain the structure, highlight the assumptions, surface the options, and handle objections in real time rather than letting the quote sit in an inbox for a week.",
    whyItMatters:
      "A quote emailed without a review call has a fraction of the close rate of one walked through personally. The moment a client reads a number without context is the moment they start renegotiating in their head. The review call lets you frame every line before they react to it.",
    worldClass: [
      "Call scheduled before the quote is sent - not after",
      "Walk through in this order: scope summary, assumptions, options, price, next steps",
      "Allowances and exclusions explained explicitly - don't assume they read them",
      "Good / Better / Best presented as investment levels, not as upsells",
      "Objections addressed in real time - 'what would need to change for this to work?'"
    ],
    commonMistakes: [
      "Emailing the quote without a review call - 'let me know if you have questions' is not follow-up",
      "Reviewing the quote in the wrong order - starting with price instead of scope",
      "Treating objections as rejections instead of negotiating conversations",
      "Not capturing the outcome of the review call in the lead record"
    ],
    proofRequired: [
      "Quote review call completed and notes saved to lead",
      "Client questions and objections documented",
      "Next step agreed upon"
    ],
    clientFacing: true,
    appAction: { label: "View estimate", href: "/estimates" }
  },

  {
    slug: "pre-quote-sent",
    phase: 1,
    phaseNumber: 13,
    globalStepNumber: 13,
    title: "Quote Sent",
    tagline: "Sent is not delivered - confirm receipt and set the decision timeline.",
    description:
      "Quote sent is the formal delivery of the estimate document to the client, after the review call. It includes the PDF estimate, a brief cover note that restates scope and key assumptions, and a clear request for a response by a specific date.",
    whyItMatters:
      "Quotes that don't have a response deadline become zombie opportunities. The client doesn't feel urgency, your schedule fills with other work, and the quote dies without a clear resolution. A sent date, view tracking, and a follow-up sequence turn a sent quote into a managed closing process.",
    worldClass: [
      "Estimate PDF sent immediately after the review call - not days later",
      "Cover message includes scope summary, key assumptions, and response-by date",
      "View tracking enabled - you know when the client opens the estimate",
      "Follow-up sequence scheduled from the send date - not improvised",
      "Estimate status updated to SENT in the system - pipeline is current"
    ],
    commonMistakes: [
      "Sending the quote without a response-by date - vague deadlines produce vague decisions",
      "Waiting days to send after the review call - momentum is lost",
      "No view tracking - you don't know if they opened it or if it went to spam",
      "Not updating the estimate status - pipeline data becomes useless"
    ],
    proofRequired: [
      "Estimate status set to SENT with send date",
      "Cover message with response-by date sent",
      "Follow-up sequence scheduled"
    ],
    clientFacing: true,
    appAction: { label: "View estimates", href: "/estimates" }
  },

  {
    slug: "pre-follow-up",
    phase: 1,
    phaseNumber: 14,
    globalStepNumber: 14,
    title: "Follow-Up / Objection Handling",
    tagline: "The deal is won in the follow-up, not the quote.",
    description:
      "Follow-up is the structured sequence of outreach after the quote is sent, designed to keep the opportunity moving toward a decision. It handles silence, resurfaces objections, and provides the client the information or reassurance they need to move forward - without being pushy.",
    whyItMatters:
      "Studies consistently show that most closed deals require five or more touchpoints after the initial quote. Contractors who follow up once and give up leave a third of their pipeline on the table. The follow-up sequence turns a quote into a close.",
    worldClass: [
      "First follow-up at 48 hours if no response - not a week later",
      "Follow-up messages reference specific scope items, not just 'checking in'",
      "Objections logged - price, timeline, competing bid, spouse decision - each handled specifically",
      "Competing bid addressed directly: scope comparison, not price matching",
      "Final follow-up with a clear decision ask and a graceful exit if declined"
    ],
    commonMistakes: [
      "One follow-up then silence - the implicit close is left to the client",
      "Generic 'just checking in' messages that add no value",
      "Price-matching a competitor without understanding their scope difference",
      "Not documenting objections - you repeat the same negotiation on every deal"
    ],
    proofRequired: [
      "Follow-up attempts logged with dates and client responses",
      "Objections documented and handling strategy noted",
      "Lead status updated to reflect current stage"
    ],
    clientFacing: true,
    appAction: { label: "Manage follow-ups", href: "/estimates" }
  },

  {
    slug: "pre-approval-contract",
    phase: 1,
    phaseNumber: 15,
    globalStepNumber: 15,
    title: "Approval / Contract",
    tagline: "No work starts without a signed agreement - ever.",
    description:
      "Approval and contract is the formal commitment milestone: the client signs an agreement that references the scope, price, payment schedule, change order process, and project timeline. A verbal agreement is not a contract. A signed estimate is not a contract. A signed contract is a contract.",
    whyItMatters:
      "The contract is your legal protection when conditions change - and conditions always change. A contractor without a signed contract is doing a favor, not a job. When disputes arise, the contract defines reality.",
    worldClass: [
      "Contract signed by all decision-makers - not just one spouse, not an agent",
      "Scope referenced by attachment - the quote line items are part of the contract",
      "Payment schedule spelled out with trigger conditions: deposit, phase milestones, final",
      "Change order process defined: written, approved, and priced before execution",
      "Dispute resolution, warranty scope, and project timeline included",
      "Signed copy delivered to client - they should have what you have"
    ],
    commonMistakes: [
      "Starting work on a handshake or verbal agreement",
      "Using a contract that doesn't reference the actual scope document",
      "Vague payment terms: 'pay as we go' or 'monthly billing'",
      "Change order process not defined - every change becomes a negotiation"
    ],
    proofRequired: [
      "Signed contract stored and linked to the job record",
      "All decision-makers' signatures confirmed",
      "Payment schedule and change order process documented"
    ],
    clientFacing: true,
    appAction: { label: "View approvals", href: "/approvals" }
  },

  {
    slug: "pre-deposit-invoice",
    phase: 1,
    phaseNumber: 16,
    globalStepNumber: 16,
    title: "Deposit Invoice",
    tagline: "The deposit is the client's first commitment - treat it as a milestone.",
    description:
      "The deposit invoice is typically 25–33% of the contract value, issued immediately after signing. It secures your schedule slot, funds initial material procurement, and confirms the client's financial commitment before any labor begins. An unsigned contract with no deposit is a placeholder, not a commitment.",
    whyItMatters:
      "Contractors who schedule work without a deposit regularly lose that slot to a client who can't fund the project when it starts. The deposit protects your schedule, your cash flow, and your supplier relationships. It also signals whether the client is financially ready - a client who delays the deposit two weeks after signing is showing you something.",
    worldClass: [
      "Deposit invoice sent same day as contract signing",
      "Deposit amount tied to contract payment schedule - no improvisation",
      "Payment method confirmed in advance - check, ACH, or credit card with processing disclosed",
      "Schedule slot confirmed only after deposit received - not after signing",
      "Deposit tracked in the system with payment date recorded"
    ],
    commonMistakes: [
      "Scheduling the job before the deposit clears",
      "Accepting a check and not confirming it cleared before ordering materials",
      "Setting the deposit too low - 10% doesn't fund material procurement",
      "No formal invoice - client pays informally and you have no paper trail"
    ],
    proofRequired: [
      "Deposit invoice created and sent",
      "Payment received and recorded",
      "Schedule slot confirmed after payment"
    ],
    clientFacing: true,
    appAction: { label: "Create invoice", href: "/invoices/new" }
  },

  {
    slug: "pre-payment-received",
    phase: 1,
    phaseNumber: 17,
    globalStepNumber: 17,
    title: "Payment Received",
    tagline: "Recorded payment is the only payment - a cleared check is proof.",
    description:
      "Payment received is the formal recording of the deposit or milestone payment in your system, confirmation that funds have cleared, and the trigger for the next project action. An unrecorded payment doesn't exist in your books and can't be referenced in a dispute.",
    whyItMatters:
      "Revenue that isn't formally recorded creates accounting gaps, tax exposure, and dispute vulnerability. When a client claims they paid for something you say wasn't in scope, your payment records - or lack of them - determine the outcome.",
    worldClass: [
      "Payment recorded in the system on the day it is received - not at month end",
      "Payment method, amount, date, and invoice reference documented",
      "Check cleared confirmation before scheduling material procurement",
      "Receipt sent to client confirming payment and what it covers",
      "Balance due updated in real time - both parties see the same number"
    ],
    commonMistakes: [
      "Depositing checks without recording them in the job's payment history",
      "Treating cash payments as off-book - liability exposure and IRS risk",
      "Starting work before confirming a check cleared",
      "Not issuing a receipt - client disputes 'I already paid for that'"
    ],
    proofRequired: [
      "Payment recorded in system with method, amount, and date",
      "Receipt issued to client",
      "Balance due updated"
    ],
    clientFacing: true,
    appAction: { label: "Record payment", href: "/payments" }
  },

  {
    slug: "pre-job-setup",
    phase: 1,
    phaseNumber: 18,
    globalStepNumber: 18,
    title: "Job Setup",
    tagline: "The job spine is built before a single tool touches the site.",
    description:
      "Job setup is the creation of the operating job record: all phases loaded, tasks assigned to phases, budget lines set from the quote, selections opened, crew assigned, and the kickoff checklist complete. A job that starts without a spine creates management chaos within the first week.",
    whyItMatters:
      "Projects that start without a structured job record are managed by memory, text threads, and improvisation. When something goes wrong - and it always does - there is no documented baseline to reference. The job setup is the moment you translate the contract into an operating plan.",
    worldClass: [
      "Job record created from approved quote with contract amount set",
      "All construction phases present and in the correct sequence",
      "Tasks assigned to phases with due dates and responsible crew",
      "Budget lines created from quote line items - actual vs. estimate visible from day one",
      "Selection sheets opened for all client-decision items",
      "Kickoff checklist complete before any site work begins"
    ],
    commonMistakes: [
      "Starting site work before the job record is fully set up",
      "Creating phases without tasks - phases without tasks can't advance or be reported on",
      "Setting budget as one lump sum instead of line items - variance is invisible",
      "Not opening selection sheets - client decisions get tracked in texts and emails"
    ],
    proofRequired: [
      "Job record created with contract amount",
      "All phases loaded with tasks and assignments",
      "Budget lines and selection sheets created"
    ],
    clientFacing: false,
    appAction: { label: "Create job", href: "/jobs/new" }
  },

  {
    slug: "pre-materials-planning",
    phase: 1,
    phaseNumber: 19,
    globalStepNumber: 19,
    title: "Materials / Selections Planning",
    tagline: "Material delays are schedule killers - plan them before you need them.",
    description:
      "Materials and selections planning is the process of confirming all client product choices, ordering long-lead items, and aligning delivery schedules with the construction sequence. A cabinet with a 6-week lead time must be ordered before demo, not after.",
    whyItMatters:
      "The most common schedule overruns in residential renovation are caused by materials that weren't ordered on time, selections that weren't made by the deadline, or products that arrived damaged and had to be reordered. Lead time planning before work starts eliminates 80% of these delays.",
    worldClass: [
      "All selections required for the project mapped with required-by dates",
      "Lead times researched and documented for every major material",
      "Long-lead items (cabinets, windows, specialty tile, appliances) ordered before demo",
      "Allowance items client-selected and confirmed before procurement",
      "Delivery schedule coordinated with phase sequence - material arrives the week it's needed"
    ],
    commonMistakes: [
      "Ordering everything at once with no phase-sequenced delivery plan",
      "Letting the client 'get back to you' on selections without a hard deadline",
      "Not tracking lead times - a 10-week cabinet order discovered in Week 3 of construction",
      "No damaged/missing material protocol - first discovery is at install, not delivery"
    ],
    proofRequired: [
      "All selections documented with client approval and required-by dates",
      "Long-lead material orders placed with confirmation numbers",
      "Delivery schedule aligned with construction phases"
    ],
    clientFacing: true,
    appAction: { label: "Manage selections", href: "/selections" }
  },

  {
    slug: "pre-permit-scheduling",
    phase: 1,
    phaseNumber: 20,
    globalStepNumber: 20,
    title: "Permit / Trade Scheduling",
    tagline: "The inspector's calendar, not yours, sets the pace of the job.",
    description:
      "Permit and trade scheduling is the coordination of permit applications, inspection scheduling, and licensed trade availability before work begins. Building department timelines, trade backlogs, and inspection windows all affect the construction schedule - and none of them wait for you.",
    whyItMatters:
      "A job that starts without a permit that requires one risks stop-work orders, failed inspections, and mandatory demolition of completed work. A job that starts without confirmed trade availability creates a sequence breakdown: framing can't close until rough trades are done, and rough trades can't start if they're booked 3 weeks out.",
    worldClass: [
      "Permit application submitted as early as possible - most departments have multi-week review",
      "Permit fees included in contract pricing - not discovered after signing",
      "All licensed trades confirmed for their phase dates before job start",
      "Inspection windows scheduled in advance - don't wait until the work is done to call",
      "Trade licenses and insurance certificates collected and filed before they start work"
    ],
    commonMistakes: [
      "Waiting to apply for permits until you're ready to start - adds weeks to the schedule",
      "Not confirming trade availability - sub books another job and your phase slips",
      "Skipping inspection sign-off before closing walls - you may be asked to reopen",
      "No copies of sub licenses/insurance - liability exposure if there's an incident"
    ],
    proofRequired: [
      "Permit application filed with confirmation number",
      "Trade availability confirmed for each phase",
      "Trade licenses and insurance certificates collected"
    ],
    clientFacing: false,
    appAction: { label: "View job phases", href: "/jobs" }
  },

  {
    slug: "pre-construction-briefing",
    phase: 1,
    phaseNumber: 21,
    globalStepNumber: 21,
    title: "Pre-Construction Client Briefing",
    tagline: "Set expectations before the first tool touches the site - disputes are born in the gap.",
    description:
      "The pre-construction briefing is the formal client onboarding meeting before site work begins. It covers project communication protocols, daily access, dust/noise expectations, decision deadlines, change order procedures, payment milestones, and what the client should expect each week.",
    whyItMatters:
      "Clients who don't know what to expect become anxious clients who text hourly and micromanage. The pre-construction briefing is your opportunity to define the relationship rules before the pressure of active construction begins. It is also the last moment to surface any misalignments before they become disputes.",
    worldClass: [
      "Formal meeting or call scheduled specifically for the briefing - not squeezed into another conversation",
      "Communication protocol defined: single point of contact, response time expectations",
      "Daily access agreed: hours, key exchange, alarm codes, parking",
      "Dust/noise/occupancy impacts explained - lived-in homes require more coordination",
      "Change order process walked through before any COs exist",
      "Decision deadline calendar shared - client knows when their choices are needed",
      "Weekly report cadence confirmed - client knows what to expect and when"
    ],
    commonMistakes: [
      "Skipping the briefing - 'we already covered all this in the contract'",
      "Not confirming communication protocol - client texts 4 different numbers",
      "Not explaining what a change order is and how it works before one appears",
      "Letting site access be improvised - crew arriving when client isn't ready"
    ],
    proofRequired: [
      "Pre-construction briefing completed and noted in job record",
      "Communication protocol confirmed",
      "Decision deadline calendar shared with client"
    ],
    clientFacing: true,
    appAction: { label: "View job", href: "/jobs" }
  },

  // ─── PHASE 2: Construction Order of Operations ────────────────────────────

  {
    slug: "build-site-prep",
    phase: 2,
    phaseNumber: 1,
    globalStepNumber: 22,
    title: "Site Prep",
    tagline: "Protect everything that isn't being changed - that's your liability.",
    description:
      "Site prep is the systematic preparation of the job site before any demolition or construction work begins. It includes protecting existing finishes, establishing dust containment, confirming utility shutoffs, staging materials and tools, and documenting pre-existing conditions in photos and notes.",
    whyItMatters:
      "Damage that occurs during site prep - to floors, fixtures, finishes, or personal property - is legally your responsibility. Pre-existing damage that wasn't photographed before work started becomes your fault when the client sees it. A well-executed site prep is invisible to the client; a poorly executed one generates the first complaint within 48 hours.",
    worldClass: [
      "Pre-existing damage photographed and documented before any protection is installed",
      "Floors protected with rosin paper, Ram Board, or Masonite - not plastic that traps moisture",
      "Dust containment erected with ZipWall or similar - negative pressure for lead/asbestos work",
      "Utility shutoffs confirmed and labeled - no surprises when plumbing or electric is opened",
      "Material staging area established to keep work zones clear",
      "Client walkthrough of protection plan completed before work begins"
    ],
    commonMistakes: [
      "No pre-existing condition photos - first scratch found becomes a contractor dispute",
      "Plastic sheeting on hardwood floors - traps moisture and causes cupping",
      "No dust containment in occupied homes - HVAC spreads dust throughout the house",
      "Staging materials in the work zone - blocks crew and damages what you're protecting"
    ],
    proofRequired: [
      "Pre-existing condition photos with timestamps",
      "Floor and surface protection installed and documented",
      "Dust containment confirmed",
      "Utility shutoffs documented"
    ],
    clientFacing: false,
    appAction: { label: "Log site prep", href: "/jobs" }
  },

  {
    slug: "build-demo",
    phase: 2,
    phaseNumber: 2,
    globalStepNumber: 23,
    title: "Demo",
    tagline: "Stop before you cover a hidden condition - that's where change orders are born.",
    description:
      "Demolition is the controlled removal of approved existing materials to expose the conditions below. Every demo phase should produce a set of discovery photos documenting what was found - both expected and unexpected. Hidden conditions discovered during demo must be communicated and documented before any response work proceeds.",
    whyItMatters:
      "Demo is the phase that most frequently produces cost overruns - not because contractors are surprised, but because they didn't have a protocol for handling surprises. Water damage, outdated wiring, improperly installed prior work, mold, and structural issues are all routinely found during demo. The contractor who documents and communicates immediately is protected; the one who just keeps working is exposed.",
    worldClass: [
      "Scope of demo confirmed with client before first tool swings - 'removing this wall' is agreed, not assumed",
      "Discovery photos taken as each layer is opened - drywall off, framing exposed, subfloor revealed",
      "Hidden conditions documented and communicated to client before any response work begins",
      "Change order written, priced, and approved before hidden-condition work proceeds",
      "Debris removed daily or by agreed schedule - not accumulated for 3 weeks",
      "Hazardous material testing completed before disturbing pre-1980 materials"
    ],
    commonMistakes: [
      "Demolishing more than the approved scope because 'it was easier'",
      "Finding water damage and continuing to work without a change order",
      "No discovery photos - can't prove what was found or when",
      "Debris stored on site longer than agreed - neighbors, HOA, and client notice"
    ],
    proofRequired: [
      "Pre-demo photos of all areas being demolished",
      "Discovery photos after demo revealing conditions",
      "Change orders issued for any hidden condition work before proceeding",
      "Debris removal documented"
    ],
    clientFacing: false,
    appAction: { label: "Log demo phase", href: "/jobs" }
  },

  {
    slug: "build-exterior",
    phase: 2,
    phaseNumber: 3,
    globalStepNumber: 24,
    title: "Exterior",
    tagline: "The envelope must be watertight before interior trades begin.",
    description:
      "Exterior work includes roofing, siding, windows, doors, trim, drainage, and any other exterior envelope repairs needed before interior finishes are exposed. It must be completed and weathertight before any interior rough trade work begins, because moisture infiltration after rough-in causes concealed damage.",
    whyItMatters:
      "Moisture is the enemy of every interior finish. New drywall installed in a building with an unresolved exterior penetration will mold. New flooring installed before a foundation drainage issue is corrected will fail. The exterior sequence exists because the building must be a controlled environment before interior trades can do lasting work.",
    worldClass: [
      "Roof, windows, and doors confirmed watertight before interior work begins",
      "All exterior penetrations (vent, pipe, conduit) flashed and caulked",
      "Drainage confirmed away from foundation - roof and grade",
      "Window and door rough openings inspected and flashed before unit installation",
      "Exterior progress documented with photos - especially concealed flashing and WRB laps"
    ],
    commonMistakes: [
      "Starting interior rough work before exterior is weathertight",
      "Installing windows without confirming the rough opening flashing is correct",
      "No photos of concealed flashing or housewrap laps - uninspectable once sided",
      "Grading work deferred to after project - foundation drainage issues arise immediately"
    ],
    proofRequired: [
      "Exterior watertight confirmation photo at each major penetration",
      "Window and door installation with flashing documented",
      "Drainage confirmed with photo documentation"
    ],
    clientFacing: false,
    appAction: { label: "Log exterior phase", href: "/jobs" }
  },

  {
    slug: "build-rough-framing",
    phase: 2,
    phaseNumber: 4,
    globalStepNumber: 25,
    title: "Rough Framing",
    tagline: "Frame to the plan, block for the finishes - framing corrections are the most expensive corrections.",
    description:
      "Rough framing is the construction or modification of wall framing, floor systems, structural openings, headers, blocking, and nailers needed to support the finishes and fixtures that follow. It must be complete, structurally correct, and inspected before any trade rough-in begins.",
    whyItMatters:
      "Framing corrections after rough trades are installed are the most expensive corrections in residential renovation. A wall framed to the wrong dimension forces plumbing relocation. Blocking not installed for a future grab bar means opening the wall after tile. Framing that doesn't match the structural plan creates inspection failures. Get framing right before anything goes inside the walls.",
    worldClass: [
      "Framing matches structural drawings or engineer's specifications exactly",
      "Blocking installed for all wall-hung fixtures: vanities, TV mounts, grab bars, medicine cabinets",
      "Headers sized correctly for all openings - not guessed",
      "Plumb, level, and square confirmed before framing is signed off",
      "Permit inspection requested and passed before trades begin",
      "Framing photos taken of all blocking locations - invisible after drywall"
    ],
    commonMistakes: [
      "Not installing blocking for future fixtures - 'they can add a backer later' means opening the wall",
      "Framing a wall without confirming it matches the electrical and plumbing plan",
      "Non-structural walls framed with structural lumber - or vice versa",
      "No inspection before starting rough trades - inspection requires opening finished work"
    ],
    proofRequired: [
      "Framing inspection passed (if required)",
      "Blocking locations photographed before drywall",
      "Structural openings and headers documented"
    ],
    clientFacing: false,
    appAction: { label: "Log rough framing", href: "/jobs" }
  },

  {
    slug: "build-rough-electric",
    phase: 2,
    phaseNumber: 5,
    globalStepNumber: 26,
    title: "Rough Electric",
    tagline: "Rough electric is a licensed trade - every wire placed now determines what's possible after drywall.",
    description:
      "Rough electric is the installation of all electrical boxes, wiring runs, panel work, and circuit routing before walls are closed. It must be performed by a licensed electrician, inspected and signed off by the building inspector, and photographed before drywall covers it permanently.",
    whyItMatters:
      "Electrical work is the single highest-liability trade in residential renovation. A missed circuit, an undersized panel, a box placed in the wrong location - all of these become expensive corrections after drywall. Electrical fires from improperly done rough-in work have destroyed entire projects and ended contractor careers.",
    worldClass: [
      "Licensed electrician only - no exceptions for cost savings",
      "Complete electrical plan reviewed and agreed before rough-in begins",
      "Box locations confirmed with client and designer before walls close",
      "All rough-in work photographed with measurements to nearest stud before drywall",
      "Rough inspection passed and documented before any wall covering",
      "Panel capacity confirmed - not assumed - before new circuits are added"
    ],
    commonMistakes: [
      "Using an unlicensed handyman for rough electrical to save money",
      "No photos before drywall - can't locate wires after close-up",
      "Not confirming panel capacity - new circuits tripping breakers at move-in",
      "Box heights and locations not confirmed with finishes - switch is behind the door"
    ],
    proofRequired: [
      "Licensed electrician on file with verified license",
      "Rough electrical inspection passed",
      "All rough-in photographed before drywall with measurements",
      "Panel work documented"
    ],
    clientFacing: false,
    appAction: { label: "Log rough electric", href: "/jobs" }
  },

  {
    slug: "build-rough-plumbing",
    phase: 2,
    phaseNumber: 6,
    globalStepNumber: 27,
    title: "Rough Plumbing",
    tagline: "Every drain and supply rough-in is a commitment - pressure test before you close the wall.",
    description:
      "Rough plumbing is the installation of drain, waste, vent, and supply rough-in for all fixtures before walls and ceilings are closed. It must be pressure tested before cover, performed by a licensed plumber, and inspected in jurisdictions requiring plumbing permits.",
    whyItMatters:
      "A plumbing leak inside a closed wall is catastrophic - mold, structural damage, and major remediation costs can result from a single failed fitting. The pressure test before cover is a non-negotiable standard of professional plumbing. Skipping it because 'it looks right' is how $8,000 in drywall gets destroyed 18 months later.",
    worldClass: [
      "Licensed plumber for all supply and drain work - not handyman or unlicensed sub",
      "Pressure test performed and documented before any wall covering",
      "All rough-in photographed with measurements and pipe locations marked",
      "Fixture rough-in heights confirmed with selections before installation",
      "Plumbing inspection passed in permitted jurisdictions",
      "Drain slope confirmed: 1/4 inch per foot minimum for horizontal runs"
    ],
    commonMistakes: [
      "Covering plumbing without a pressure test - the leak is discovered after drywall",
      "Using PEX supply without confirming correct fitting compatibility",
      "No photos of rough-in - can't locate pipes when finishes are installed",
      "Fixture rough-in heights not matched to selected products - toilet flange at wrong height"
    ],
    proofRequired: [
      "Pressure test completed and documented before cover",
      "Rough-in photographed with measurements",
      "Plumbing inspection passed (if required)",
      "Licensed plumber on file"
    ],
    clientFacing: false,
    appAction: { label: "Log rough plumbing", href: "/jobs" }
  },

  {
    slug: "build-rough-hvac",
    phase: 2,
    phaseNumber: 7,
    globalStepNumber: 28,
    title: "Rough HVAC",
    tagline: "Ventilation is building science - bath fans and duct routing done wrong cause mold.",
    description:
      "Rough HVAC covers duct routing, bath fan installation and ducting, ventilation paths, mechanical rough-in, and any air handling changes required by the renovation scope. Ducting must be routed to exterior termination - not into attic or wall cavities - and bath fans must be rated for the room size.",
    whyItMatters:
      "Moisture-related HVAC failures are the silent epidemic of renovation work. A bath fan vented into an attic creates mold within one season. An undersized exhaust fan in a steam shower produces humidity damage. An HVAC system that wasn't balanced after an addition creates comfort and energy complaints that generate callbacks.",
    worldClass: [
      "All bath fans vented directly to exterior - not into attic, not into a nearby wall",
      "Fan CFM rated for room volume - not the cheapest unit available",
      "Humidity-sensing fans specified for bathrooms without windows",
      "All duct work insulated where it runs through unconditioned space",
      "HVAC supply and return balanced after renovation scope - new walls change airflow",
      "Mechanical rough-in inspected and signed off before covering"
    ],
    commonMistakes: [
      "Bath fan vented into attic because it's easier - guaranteed mold within 2 years",
      "Undersized fan in a shower or steam space - humidity causes drywall and paint failure",
      "No HVAC balance after adding or removing walls - hot and cold rooms after project",
      "Flex duct kinked in attic spaces - airflow drops dramatically"
    ],
    proofRequired: [
      "Bath fan duct routing photographed to exterior termination",
      "Fan CFM documented and matched to room size",
      "HVAC rough-in inspection passed (if required)"
    ],
    clientFacing: false,
    appAction: { label: "Log rough HVAC", href: "/jobs" }
  },

  {
    slug: "build-secondary-framing",
    phase: 2,
    phaseNumber: 8,
    globalStepNumber: 29,
    title: "Secondary Framing / Blocking / Insulation",
    tagline: "Insulation and blocking are invisible after drywall - photograph before you cover.",
    description:
      "Secondary framing includes any additional blocking, furring, fire stopping, and structural reinforcement needed after rough trades. Insulation follows immediately, covering both thermal and sound control requirements. Both must be completed and photographed before any wall covering is installed.",
    whyItMatters:
      "Insulation mistakes are invisible until energy bills arrive or a wall is opened. Missing fire blocking in a renovation is a code violation that could affect insurance claims. Blocking not installed for a future TV mount or accessory means opening the wall after painting. This phase has no redo - do it right before the wall closes.",
    worldClass: [
      "Fire blocking installed at all required penetrations and top-plate openings",
      "Sound insulation used in walls between living spaces and bathrooms",
      "Thermal insulation R-value confirmed for the climate zone and wall assembly",
      "All blocking locations photographed with measurements before cover",
      "Vapor barrier or retarder installed correctly for the climate - interior or exterior side",
      "Pre-cover inspection completed if required by jurisdiction"
    ],
    commonMistakes: [
      "Skipping sound insulation in bathroom walls - client hears everything after move-in",
      "No blocking photos - you can't find the nailer after drywall without tearing out",
      "Wrong vapor barrier placement - condensation inside the wall assembly",
      "Fire blocking omitted to save time - code violation discovered at inspection"
    ],
    proofRequired: [
      "Insulation installed and photographed before cover",
      "Blocking locations photographed with measurements",
      "Fire blocking documented at required locations",
      "Pre-cover inspection passed (if required)"
    ],
    clientFacing: false,
    appAction: { label: "Log secondary framing", href: "/jobs" }
  },

  {
    slug: "build-drywall",
    phase: 2,
    phaseNumber: 9,
    globalStepNumber: 30,
    title: "Drywall / Wall Covering",
    tagline: "Level 5 finish requires level 5 prep - skip levels and it shows under paint.",
    description:
      "Drywall installation covers hanging, taping, mudding, and sanding to a finish level appropriate for the paint specification. In wet areas, cement board, Schluter board, or waterproofing membrane systems replace standard drywall. The finish level must match the sheen of the planned paint - a flat finish hides imperfections that semi-gloss will expose.",
    whyItMatters:
      "More client paint complaints trace back to drywall finish quality than to the paint itself. A Level 3 finish under semi-gloss paint in an entryway with sidelights produces shadow lines and ridges that no amount of touch-up will hide. Wet area drywall that wasn't properly protected at the framing stage will fail behind tile and produce mold.",
    worldClass: [
      "Finish level specified before taping: Level 3 for ceilings, Level 4 for walls, Level 5 for smooth/gloss areas",
      "Cement board or waterproof backer in all wet areas - no green board in tile shower surrounds",
      "Drywall joints staggered and screws driven correctly - not popped or sunk too deep",
      "Primer coat applied before final paint evaluation - imperfections visible only after primer",
      "Sidelights, raking light, and high-sheen areas inspected under portable light source before paint",
      "Texture matched to existing areas if patching into older surfaces"
    ],
    commonMistakes: [
      "Using standard drywall in wet areas - mold behind tile within 3 years",
      "Finishing to Level 3 when high-sheen or smooth paint is specified",
      "Popped screws and ridges not addressed before paint - client sees them immediately",
      "No light inspection before paint - imperfections discovered after full paint coat"
    ],
    proofRequired: [
      "Wet area backer material documented and photographed",
      "Finish level specified and confirmed before painting begins",
      "Light inspection documented before primer"
    ],
    clientFacing: false,
    appAction: { label: "Log drywall phase", href: "/jobs" }
  },

  {
    slug: "build-waterproofing",
    phase: 2,
    phaseNumber: 10,
    globalStepNumber: 31,
    title: "Waterproofing / Tile Prep",
    tagline: "The membrane saves the wall - tile is decoration, waterproofing is protection.",
    description:
      "Waterproofing and tile prep covers the installation of the waterproofing membrane system in wet areas - shower pans, curbs, niche backs, and wall transition points - before any tile is set. The waterproofing layer is what protects the structure; tile is the decorative surface on top of it.",
    whyItMatters:
      "The single most common catastrophic renovation failure is water penetration behind tile in a shower that was not properly waterproofed. This failure is invisible for 3–7 years, then presents as mold, failed tile, rotted framing, and a remediation project that costs more than the original renovation. Waterproofing is not optional.",
    worldClass: [
      "Schluter Kerdi, RedGard, Laticrete Hydro Ban, or equivalent system used - not felt paper",
      "All seams, corners, and penetrations sealed with membrane fabric and thinset before flood test",
      "Flood test performed and passed before tile - shower pan holds water for 24 hours",
      "Niche backs and curb tops waterproofed - the most frequently missed locations",
      "Mortar bed sloped to drain: 1/4 inch per foot minimum",
      "System manufacturer's instructions followed precisely - system void if improvised"
    ],
    commonMistakes: [
      "Using cement board alone as waterproofing - it is not waterproof, it is water resistant",
      "Skipping the flood test - 'it looks good' is not a performance standard",
      "Not waterproofing niche backs and curbs - water wicks through grout at these transitions",
      "Using RedGard without sufficient coverage - pink means not thick enough, red means adequate"
    ],
    proofRequired: [
      "Waterproofing system product documented and photographed",
      "Flood test completed and passed - photo with water level and timestamp",
      "Niche and curb waterproofing photographed before tile",
      "Mortar bed slope confirmed"
    ],
    clientFacing: false,
    appAction: { label: "Log waterproofing", href: "/jobs" }
  },

  {
    slug: "build-tile",
    phase: 2,
    phaseNumber: 11,
    globalStepNumber: 32,
    title: "Tile",
    tagline: "Layout is planned on paper, not discovered with the first tile.",
    description:
      "Tile installation covers floor tile, wall tile, backsplash, shower surrounds, niches, and transitions. Layout must be planned before setting begins to ensure symmetrical results and proper tile cuts at focal points. Grout and sealer selection are finishing decisions that affect maintenance and appearance for years.",
    whyItMatters:
      "Tile is one of the highest-visibility finishes in a renovation and one of the hardest to redo without significant cost. Poor layout decisions - tiles cut in half at entry, uneven grout joints, non-plumb vertical lines - are immediately visible to the client and are a permanent record of the quality of your work.",
    worldClass: [
      "Layout dry-set before adhesive - confirmed centered and symmetrical at focal points",
      "Large-format tile (18x18 and above) set with back-buttering and notched trowel for full coverage",
      "Grout joint width consistent - no variation from start to end of run",
      "Transitions planned and material selected before tile begins",
      "Grout sealed after cure - not optional, especially in showers",
      "Movement joints used in large-format floor tile runs - thermal expansion"
    ],
    commonMistakes: [
      "Starting tile without a dry layout - slivers at entries, half tiles at focal points",
      "No back-buttering on large format tile - voids under tile cause cracking and lippage",
      "Inconsistent grout joints - eye-catching variation that no amount of sealer fixes",
      "Grouting before tile has fully cured - grout joint failure at movement areas"
    ],
    proofRequired: [
      "Dry layout photographed before setting begins",
      "Thinset coverage verified - back-butter documented for large format",
      "Grout sealed after cure - sealer product documented",
      "Transition and edge details photographed"
    ],
    clientFacing: true,
    appAction: { label: "Log tile phase", href: "/jobs" }
  },

  {
    slug: "build-cabinets",
    phase: 2,
    phaseNumber: 12,
    globalStepNumber: 33,
    title: "Cabinets",
    tagline: "Cabinets are structural - level and plumb before anything is scribed or trimmed.",
    description:
      "Cabinet installation is the installation of base and upper cabinets, pantry units, and built-ins. It requires a level reference line, confirmed wall stud locations, and correct positioning before any scribe, filler, or trim is applied. The template for countertops should not be pulled until all cabinet doors are hung and adjusted.",
    whyItMatters:
      "Cabinets installed without checking level and plumb produce counter reveals, door gaps, and appliance clearance problems that are expensive to correct after the fact. A dishwasher that doesn't fit because the cabinet run is 1/2 inch too long, or a refrigerator with inadequate clearance because upper cabinets weren't positioned correctly, creates a callback before the job is even complete.",
    worldClass: [
      "Level reference line snapped across entire wall before first cabinet is placed",
      "Stud locations confirmed before hanging uppers - shims and blocking if studs miss cabinet hang rails",
      "Cabinet doors and drawers adjusted before template pull - final position is confirmed position",
      "Appliance clearances verified against spec sheets before cabinets are secured",
      "Scribe and filler pieces fitted and finished - unpainted filler is not an acceptable punch item",
      "Interior cabinet lighting and electrical confirmed with electrician before installation"
    ],
    commonMistakes: [
      "Setting base cabinets without a level line - every out-of-level inch multiplies at the counter",
      "Pulling counter template before doors are adjusted - template captures misalignment",
      "Appliance clearances not checked until appliance delivery - refrigerator doesn't fit",
      "Unfinished filler pieces and undrilled hardware holes called 'punch list'"
    ],
    proofRequired: [
      "Level reference line photo before installation begins",
      "Cabinet plumb and level confirmed before template pull",
      "Appliance clearances documented",
      "All scribe and filler pieces installed and finished before template"
    ],
    clientFacing: true,
    appAction: { label: "Log cabinet phase", href: "/jobs" }
  },

  {
    slug: "build-counters",
    phase: 2,
    phaseNumber: 13,
    globalStepNumber: 34,
    title: "Counters",
    tagline: "Stone counters are precision work - measure twice, template once, fabricate once.",
    description:
      "Counter installation covers stone, quartz, laminate, wood, or concrete tops from template to final install. The template is the most critical step - errors in the template are permanent errors in the fabricated slab. Sink cutouts, cooktop openings, seam locations, and edge profile selection all happen at or before template.",
    whyItMatters:
      "Counter fabrication errors are among the most expensive mistakes in kitchen renovation - a miscut stone slab or wrong-location sink cutout requires ordering and fabricating from scratch, typically adding 3–6 weeks and full material cost to the project. Every detail of the template must be confirmed before the fabricator leaves the job site.",
    worldClass: [
      "Template pulled only after cabinets are fully installed, leveled, and adjusted",
      "Seam locations planned for minimum visibility and maximum structural support",
      "Sink cutout location confirmed with sink specifications and tested for undermount fit",
      "Edge profile selected by client with physical sample - not a catalog photo",
      "Backsplash height and transition detail confirmed at template - not after install",
      "Stone slabs reviewed in person at the yard before cutting - client approves specific slabs"
    ],
    commonMistakes: [
      "Pulling template before cabinets are fully adjusted - fabricated slab matches misaligned base",
      "Sink cutout location guessed instead of measured against sink spec sheet",
      "Client selecting stone from photos - the actual slab looks different",
      "Seam at high-traffic or weak structural location - early failure"
    ],
    proofRequired: [
      "Template confirmed with client before fabrication",
      "Seam location documented and approved",
      "Stone slab selection photographed and approved in person",
      "Final install with seams, edges, and cutouts documented"
    ],
    clientFacing: true,
    appAction: { label: "Log counters phase", href: "/jobs" }
  },

  {
    slug: "build-paint",
    phase: 2,
    phaseNumber: 14,
    globalStepNumber: 35,
    title: "Interior Paint",
    tagline: "Paint is not a finish - it is a revealer. Everything below it shows.",
    description:
      "Interior paint covers prep, priming, painting of walls, ceilings, trim, and doors. Paint sequence matters: ceilings first, walls second, trim last. The quality of the paint job is determined 80% by the prep - patching, sanding, priming - and 20% by the paint application.",
    whyItMatters:
      "Paint is the most visible finish in a home and the benchmark clients use to judge the overall quality of the renovation. A mediocre paint job on high-quality materials makes the whole project look cheap. A clean, full-coverage paint job with sharp cut lines, consistent sheen, and properly prepped surfaces signals craftsmanship.",
    worldClass: [
      "All patching and texture work primed and inspected under raking light before painting",
      "Primer coat applied and reviewed - imperfections corrected before topcoat",
      "Paint sequence: ceilings, then walls, then trim and doors - in that order",
      "Two coats minimum on all surfaces - one-coat coverage is a manufacturer's marketing claim",
      "Cut lines at trim, ceiling, and adjacent colors done with brush, not tape - tape causes peel",
      "Sheen confirmed by room use: flat for ceilings, eggshell for living areas, semi-gloss for trim"
    ],
    commonMistakes: [
      "Skipping primer - especially on new drywall mud and patched areas",
      "One coat of paint declared 'done' - thin coverage visible in raking light within weeks",
      "Using tape for cut lines instead of cutting in by brush - tape peels existing paint",
      "Wrong sheen in high-humidity areas - flat paint in a bathroom is a mold surface"
    ],
    proofRequired: [
      "Primer coat documented before topcoat",
      "Two-coat application confirmed",
      "Light inspection under raking light before completion",
      "Paint products, sheens, and colors documented by room"
    ],
    clientFacing: true,
    appAction: { label: "Log paint phase", href: "/jobs" }
  },

  {
    slug: "build-flooring",
    phase: 2,
    phaseNumber: 15,
    globalStepNumber: 36,
    title: "Flooring",
    tagline: "Flooring fails at the substrate, not the surface - prep is not optional.",
    description:
      "Flooring installation covers hardwood, engineered wood, LVP, laminate, tile, and other floor surfaces. It requires a properly prepared substrate: flat to 3/16 inch in 10 feet for most products, dry, clean, and at the correct height for transitions. Installation direction, acclimation, and expansion gaps are determined before the first board is set.",
    whyItMatters:
      "Flooring failures are almost always substrate failures. Cupping hardwood traces to moisture. Clicking LVP traces to a subfloor that wasn't flat. Cracking tile traces to a deflecting subfloor. Every flooring manufacturer's warranty excludes failures caused by improper substrate preparation - and they're right to, because the substrate is the contractor's responsibility.",
    worldClass: [
      "Subfloor moisture content measured and documented - must be within manufacturer spec",
      "Subfloor flatness checked: no more than 3/16 inch variation in 10 feet for most products",
      "High spots ground, low spots filled - self-leveler or patching compound as appropriate",
      "Wood flooring acclimated to the space per manufacturer spec - typically 48–72 hours",
      "Expansion gaps maintained at all walls, cabinets, and fixed objects",
      "Transitions planned before installation begins - transitions at doorways and between rooms"
    ],
    commonMistakes: [
      "Installing over a wet subfloor - moisture destroys wood and LVP from below",
      "Skipping flatness check - low spots and high spots transfer to finish floor within months",
      "No acclimation for wood products - boards expand after install and buckle",
      "No expansion gaps at walls - floor buckles in summer heat"
    ],
    proofRequired: [
      "Subfloor moisture reading documented before installation",
      "Subfloor flatness confirmed and documented",
      "Acclimation time documented for wood products",
      "Expansion gaps and transitions photographed"
    ],
    clientFacing: true,
    appAction: { label: "Log flooring phase", href: "/jobs" }
  },

  {
    slug: "build-trim",
    phase: 2,
    phaseNumber: 16,
    globalStepNumber: 37,
    title: "Trim / Doors / Hardware",
    tagline: "Trim is the frame - it defines whether the painting looks finished or painted.",
    description:
      "Trim and finish carpentry covers baseboard, casing, crown, door installation and hanging, hardware mounting, and all final carpentry detail work. It is the last structural phase before punch list and the one that most defines the perceived quality of the renovation.",
    whyItMatters:
      "Trim work is what separates a renovation that looks professional from one that looks contractor-grade. Gaps at corners, caulk lines wider than 1/8 inch, doors that don't hang plumb, and hardware installed at inconsistent heights are immediately visible to any client and impossible to miss at closing walkthrough.",
    worldClass: [
      "Cope inside corners - don't miter them, they open with seasonal movement",
      "Doors hung with consistent reveal on all three sides - latch side plumb, hinge side plumb",
      "Hardware installed at consistent heights throughout - measure, don't estimate",
      "All caulk lines finished flush and tooled - excess wiped before cure",
      "Nail holes filled, sanded, and touched up before walk-through",
      "Door stops adjusted so door doesn't slam or bounce - quiet and solid latching"
    ],
    commonMistakes: [
      "Mitered inside corners - they open within the first heating season",
      "Caulk gaps wider than the caulk line itself - look worse than a gap",
      "Hardware heights inconsistent room to room - noticeable to every client",
      "Doors that don't latch without force or that spring open - not adjusted before walkthrough"
    ],
    proofRequired: [
      "All trim installed, caulked, and touched up",
      "Doors hang plumb with consistent reveal - photographed",
      "Hardware heights documented and consistent",
      "Nail holes and touch-up complete before punch list"
    ],
    clientFacing: true,
    appAction: { label: "Log trim phase", href: "/jobs" }
  },

  {
    slug: "build-finish-trades",
    phase: 2,
    phaseNumber: 17,
    globalStepNumber: 38,
    title: "Fixtures / Finish Electric / Finish Plumbing / Finish HVAC",
    tagline: "Every finish trade must be tested before you call it done - function, not installation, is the standard.",
    description:
      "Finish trades is the installation and testing of all electrical fixtures, plumbing fixtures, and HVAC registers and controls. Each trade must be functionally tested - not just physically installed - before the phase is closed. A light switch that doesn't work is a failed installation, not a punch list item.",
    whyItMatters:
      "Punch lists that are full of non-functioning fixtures signal a project that wasn't verified before walkthrough. Clients interpret fixture failures as lack of care. Every item that doesn't work at final walkthrough undermines confidence in everything that does.",
    worldClass: [
      "Every light switch and outlet tested for function before punch list walkthrough",
      "All plumbing fixtures pressure tested and run for leaks before client walkthrough",
      "HVAC registers installed and system run - air flow confirmed at each register",
      "GFCIs tested for trip and reset - all required locations per code",
      "Appliances tested for function - dishwasher run, range checked, hood tested",
      "Finish materials protected during adjacent phase - light fixtures covered during paint"
    ],
    commonMistakes: [
      "Installing but not testing - 'it was installed right, the switch must be wrong'",
      "Plumbing fixtures not run before walkthrough - leak discovered with client present",
      "HVAC registers installed without running system - dead supply registers not caught",
      "GFCIs not tested - installation doesn't guarantee function"
    ],
    proofRequired: [
      "Electrical function test documented - all switches and outlets verified",
      "Plumbing run and leak-tested before walkthrough",
      "HVAC run and airflow confirmed",
      "Appliance function documented"
    ],
    clientFacing: true,
    appAction: { label: "Log finish trades", href: "/jobs" }
  },

  {
    slug: "build-touch-ups",
    phase: 2,
    phaseNumber: 18,
    globalStepNumber: 39,
    title: "Final Touch-Ups",
    tagline: "Walk the job before the client does - catch your own items first.",
    description:
      "Final touch-ups is the contractor's self-inspection and correction of all visible defects, paint touch-ups, caulk gaps, hardware adjustments, and minor corrections before the client's punch list walkthrough. It is the quality control step that separates a polished handover from a contentious punch list.",
    whyItMatters:
      "A client who walks through before you do will find 40 items. A contractor who walks through first and corrects their own work before the client will find 35 of those same items - and the client will find 5. The self-inspection is not an optional nicety; it is the difference between a 3-hour punch walkthrough and a 30-minute one.",
    worldClass: [
      "Complete self-walkthrough with phone camera under good light - photograph every defect",
      "Corrections made before client is called for punch list walkthrough",
      "Touch-up paint matched to original batch - not a new sheen or different lot",
      "All surfaces wiped of construction dust and smudges before client walks in",
      "Appliance protective films removed - protective plastic is not a finished installation",
      "All drawers, doors, and hardware adjusted for smooth operation"
    ],
    commonMistakes: [
      "Skipping the self-walkthrough - 'I know what still needs to be done'",
      "Touch-up paint from a different sheen or lot - sheen mismatch visible under any light",
      "Protective films left on - looks unfinished, client peels them and finds scratches",
      "Not wiping construction dust from surfaces before walkthrough - 'it'll settle'"
    ],
    proofRequired: [
      "Self-walkthrough photos with identified defects",
      "Touch-up corrections completed and documented",
      "All surfaces cleaned before client walkthrough"
    ],
    clientFacing: false,
    appAction: { label: "Create punch list", href: "/jobs" }
  },

  {
    slug: "build-punch-list",
    phase: 2,
    phaseNumber: 19,
    globalStepNumber: 40,
    title: "Punch List",
    tagline: "The punch list is a written agreement - not a memory.",
    description:
      "The punch list is the formal, written list of remaining items identified during the client walkthrough. Each item must have a description, responsible party, completion date, and proof requirement. A verbal punch list is not a punch list - items multiply and scope creep if nothing is written.",
    whyItMatters:
      "Punch lists that aren't written become the source of project-ending disputes. The client remembers 30 items; you remember 12. Without a written list signed by both parties, the punch list is open-ended. A written punch list with completion standards closes the project cleanly and protects final payment.",
    worldClass: [
      "Punch list walkthrough is a scheduled meeting - not a dropped-in surprise",
      "Every punch item written down with description, location, and required standard",
      "Client signs or emails approval of the punch list - confirming it is complete",
      "Each item has a completion date and a responsible crew member",
      "Completion verified with photos for each item - proof before payment",
      "No new scope added to the punch list - change order if scope has grown"
    ],
    commonMistakes: [
      "Verbal punch list - both parties 'remember' different items",
      "No completion standard per item - 'fix the paint' has no completion criterion",
      "Client keeps adding items - punch list becomes an ongoing negotiation",
      "Final payment collected before punch list items are verified complete"
    ],
    proofRequired: [
      "Written punch list with all items documented",
      "Client sign-off on the list",
      "Each completed item documented with photo",
      "Client confirmation that punch list is resolved"
    ],
    clientFacing: true,
    appAction: { label: "Log punch list", href: "/jobs" }
  },

  {
    slug: "build-deep-clean",
    phase: 2,
    phaseNumber: 20,
    globalStepNumber: 41,
    title: "Deep Clean",
    tagline: "The clean is the first impression of the finished project - don't let construction dust be the client's memory.",
    description:
      "Deep clean is the professional post-construction cleaning of the entire work area: all surfaces, fixtures, cabinets, appliances, windows, floors, and areas affected by construction dust. It is performed after all work is complete, before the final walkthrough.",
    whyItMatters:
      "The final walkthrough is the client's first experience of the finished renovation. A project revealed through construction dust, smudged mirrors, and gritty floors cannot be properly appreciated - and clients unconsciously attribute the dust to incompleteness. A professionally cleaned space delivers the emotional impact of a finished project.",
    worldClass: [
      "Professional post-construction cleaning team used - not crew members with brooms",
      "All cabinet interiors, drawers, and shelves cleaned of dust and debris",
      "All light fixtures cleaned - construction dust accumulates inside every fixture",
      "Windows cleaned inside and out if in renovation area",
      "Floors cleaned in the appropriate method for each surface",
      "Construction materials, staging, and tools removed before cleaning begins"
    ],
    commonMistakes: [
      "Leaving construction material staging in place during cleaning - staging blocks cleaning",
      "Crew members sweeping instead of professional cleaning - visible evidence of construction",
      "Cleaning before all work is complete - dusted fixtures get re-dusted at next trade",
      "Skipping interior cabinet cleaning - client opens first drawer and finds sawdust"
    ],
    proofRequired: [
      "Post-construction cleaning completed before final walkthrough",
      "All materials and staging removed",
      "Cleaning documented with before/after photos"
    ],
    clientFacing: false,
    appAction: { label: "Log deep clean", href: "/jobs" }
  },

  {
    slug: "build-final-walkthrough",
    phase: 2,
    phaseNumber: 21,
    globalStepNumber: 42,
    title: "Final Walkthrough",
    tagline: "The walkthrough ends the project - collect the signature before you leave the site.",
    description:
      "The final walkthrough is the formal client acceptance of the completed renovation. It is a scheduled, structured meeting that reviews the completed scope, confirms punch list items are resolved, demonstrates operating systems and fixtures, and collects client sign-off on project completion.",
    whyItMatters:
      "The final walkthrough is the moment the project transitions from contractor responsibility to client ownership. Without a formal sign-off, projects remain technically open indefinitely - client can call back weeks later with 'unresolved' items that were actually resolved. A signed completion document closes the project and triggers final payment.",
    worldClass: [
      "Walkthrough scheduled as a formal meeting - both contractor and client in attendance",
      "Operating demonstration given: appliances, HVAC, fixtures, smart controls",
      "Warranty scope and duration explained in person, not just in paperwork",
      "Product care instructions provided - grout sealing schedule, appliance manuals",
      "Client completion sign-off obtained - email confirmation is acceptable",
      "Final invoice triggered immediately after sign-off - not days later"
    ],
    commonMistakes: [
      "No formal walkthrough - client acceptance assumed because they haven't complained",
      "Walkthrough without demonstrating fixtures and systems - client discovers them alone",
      "No warranty explanation - client assumes everything is warranted indefinitely",
      "Final payment requested before client has formally accepted the project"
    ],
    proofRequired: [
      "Final walkthrough completed with both parties present",
      "Client sign-off documented - email or form",
      "Warranty terms explained and documented",
      "Final invoice issued"
    ],
    clientFacing: true,
    appAction: { label: "Create final invoice", href: "/invoices/new" }
  },

  // ─── PHASE 3: Post-job Follow-up ─────────────────────────────────────────

  {
    slug: "close-final-invoice",
    phase: 3,
    phaseNumber: 1,
    globalStepNumber: 43,
    title: "Final Invoice",
    tagline: "The final invoice is due at walkthrough sign-off - not when you get around to it.",
    description:
      "The final invoice is the billing for the remaining contract balance after all punch list items are resolved and the client has accepted the project. It should be issued same-day as walkthrough sign-off and include the full account of the project: contract value, all payments received, change orders, and balance due.",
    whyItMatters:
      "Every day between project completion and final invoice is a day the client is second-guessing the final amount. Contractors who delay final invoicing consistently report more payment disputes than those who invoice immediately - because the client has already mentally moved on and the invoice feels like an afterthought demand.",
    worldClass: [
      "Final invoice issued on the day of walkthrough sign-off",
      "Invoice shows full account: contract, change orders, payments received, balance",
      "Payment method confirmed in advance - wire, check, card - not discovered at invoicing",
      "Due date clearly stated - typically 5–7 business days from receipt",
      "Invoice references the completion sign-off document as the trigger"
    ],
    commonMistakes: [
      "Issuing the final invoice days or weeks after the walkthrough",
      "Final invoice that doesn't reconcile to contract + COs - payments received",
      "No payment due date stated - client treats it as optional",
      "Accepting a partial final payment without documenting the remaining balance arrangement"
    ],
    proofRequired: [
      "Final invoice issued with full account reconciliation",
      "Payment due date stated",
      "Invoice references completion sign-off"
    ],
    clientFacing: true,
    appAction: { label: "Create invoice", href: "/invoices/new" }
  },

  {
    slug: "close-final-payment",
    phase: 3,
    phaseNumber: 2,
    globalStepNumber: 44,
    title: "Final Payment Received",
    tagline: "Zero balance is the job's final milestone - record it formally.",
    description:
      "Final payment received is the recording of the last payment, confirmation of zero balance, and formal close of the financial record on the job. It closes the AR, triggers the closeout package, and confirms the business relationship is resolved cleanly.",
    whyItMatters:
      "A job with an unresolved final payment is a job that isn't closed. It creates accounting uncertainty, tax complications, and a relationship that's technically in dispute even if informally resolved. Zero balance confirmed in writing ends the project clearly and sets up the referral and review request on the right footing.",
    worldClass: [
      "Payment recorded in system on day received - method, amount, date, check number",
      "Receipt issued to client confirming zero balance",
      "Job closed in the system - status updated to COMPLETE",
      "Closeout package triggered by payment - not deferred to later"
    ],
    commonMistakes: [
      "Not recording final payment - job sits as 'in progress' in the system indefinitely",
      "No receipt issued - client asks months later if they owe anything",
      "Job status not updated to COMPLETE - pipeline reporting is inaccurate"
    ],
    proofRequired: [
      "Final payment recorded with method and date",
      "Receipt issued confirming zero balance",
      "Job status updated to COMPLETE"
    ],
    clientFacing: true,
    appAction: { label: "Record payment", href: "/payments" }
  },

  {
    slug: "close-closeout-package",
    phase: 3,
    phaseNumber: 3,
    globalStepNumber: 45,
    title: "Closeout Package",
    tagline: "The closeout package is the physical proof that the project was done right.",
    description:
      "The closeout package is the delivery of all project documentation to the client: permit sign-offs, material spec sheets, product manuals, warranty documents, care instructions, and the final photo set. It transforms a completed renovation into a documented asset.",
    whyItMatters:
      "Clients who receive a professional closeout package remember their contractor differently than clients who received a handshake and a check. When that homeowner sells the property, the closeout package becomes part of the disclosure. When they refer a friend, they remember that you were the contractor who was organized.",
    worldClass: [
      "All permits with final sign-off copies provided to client",
      "Product manuals for all installed appliances and systems organized",
      "Material spec sheets for flooring, tile, counters, and finishes documented",
      "Warranty documents with scope, duration, and contact information",
      "Final photo set organized and delivered - not a phone camera roll dump",
      "Care instructions for each major finish: grout sealing, stone maintenance, appliance care"
    ],
    commonMistakes: [
      "No closeout package - client has no documentation of what was installed",
      "Permit copies not provided - client can't prove the work was permitted at resale",
      "Warranty document without a service contact number - how does the client call for warranty service?",
      "Photos never organized and delivered - client has no record of before/during/after"
    ],
    proofRequired: [
      "Permit sign-offs collected and delivered",
      "Product documentation organized and delivered",
      "Warranty documents with contact info delivered",
      "Final photo set delivered"
    ],
    clientFacing: true,
    appAction: { label: "View job record", href: "/jobs" }
  },

  {
    slug: "close-warranty",
    phase: 3,
    phaseNumber: 4,
    globalStepNumber: 46,
    title: "Warranty / Care Instructions",
    tagline: "Define what you will and won't stand behind - in writing, before the job closes.",
    description:
      "The warranty defines the contractor's ongoing obligation after project completion: what is covered, what is excluded, the duration, and the response process. Care instructions teach the client how to maintain the finishes so warranty claims don't arise from client neglect.",
    whyItMatters:
      "A contractor without a written warranty has an unlimited implied warranty by default in most states. A written warranty with defined scope, duration, and exclusions limits your liability to the terms you set - not the terms a court decides. It also sets client expectations, which prevents 'warranty' calls about normal settling.",
    worldClass: [
      "Warranty in writing - scope, duration, exclusions, and response time",
      "Separate warranty periods for different work: workmanship (1–2 years), waterproofing (5 years)",
      "Exclusions stated explicitly: normal settling, client-caused damage, product manufacturer defects",
      "Response protocol defined: how to contact, response time commitment",
      "Care instructions specific to finishes: grout sealing schedule, stone care, appliance maintenance",
      "Warranty document signed by client - confirms they received and understood it"
    ],
    commonMistakes: [
      "Verbal warranty - 'I'll take care of anything that goes wrong' is legally broad and undefined",
      "One-size warranty - tile and waterproofing should have longer coverage than paint",
      "No exclusions - client claims warranty on a product that failed due to their own damage",
      "No care instructions - client never seals the grout and claims warranty when it discolors"
    ],
    proofRequired: [
      "Signed warranty document on file",
      "Warranty scope, duration, and exclusions stated",
      "Care instructions delivered and acknowledged"
    ],
    clientFacing: true,
    appAction: { label: "View job record", href: "/jobs" }
  },

  {
    slug: "close-before-after-photos",
    phase: 3,
    phaseNumber: 5,
    globalStepNumber: 47,
    title: "Before / After Photos Organized",
    tagline: "Your portfolio is being built on every job - organize it before you forget.",
    description:
      "Before and after photo organization is the curation of the best before, during, and after shots from the project into a usable portfolio and client record. These photos are used for marketing, testimonials, insurance documentation, and client memories.",
    whyItMatters:
      "Contractors who build a photo library of completed work have a perpetual marketing asset. Before/after pairs on Instagram, Houzz, and your website generate leads. A project with no organized photos is a project that never happened as far as new clients are concerned.",
    worldClass: [
      "Before shots matched angle-for-angle with after shots for maximum impact",
      "Construction process shots documenting craft: waterproofing, tile layout, trim installation",
      "Photos organized by project, room, and trade - not by date taken",
      "High-resolution versions retained - social media crops, project portfolio needs full resolution",
      "Client permission documented for marketing use of their project photos",
      "Before/after set delivered to client as part of closeout package"
    ],
    commonMistakes: [
      "After photos but no before photos - can't show transformation without the starting point",
      "Photos taken in construction dust and clutter - not usable for marketing",
      "No organization - 400 photos in a camera roll with no project or room labels",
      "Using client's photos without their permission"
    ],
    proofRequired: [
      "Before/after pairs organized and filed",
      "Client permission documented for marketing use",
      "Photo set delivered to client"
    ],
    clientFacing: true,
    appAction: { label: "View job record", href: "/jobs" }
  },

  {
    slug: "close-testimonial",
    phase: 3,
    phaseNumber: 6,
    globalStepNumber: 48,
    title: "Testimonial Request",
    tagline: "Ask while the project pride is fresh - gratitude has a short half-life.",
    description:
      "The testimonial request is the formal ask for a written review or testimonial, made at the peak of client satisfaction - immediately after the final walkthrough or within the first week of project completion. It includes a specific ask for a Google review plus an option for a written testimonial.",
    whyItMatters:
      "Google reviews are the highest-ROI marketing activity for residential contractors. A 4.8-star contractor with 50 reviews wins against a 5.0-star contractor with 4 reviews every time. Every job is an opportunity to add a review. Every job that ends without a review request is a missed opportunity.",
    worldClass: [
      "Review request made in person at the final walkthrough - personal ask has 3x the conversion of email",
      "Google review link texted immediately after the ask - friction kills conversion",
      "Review request SMS pre-loaded and ready to send from the job detail page",
      "Video testimonial offered as an option - more compelling than text for high-end projects",
      "Request timed to project completion high - not weeks later when client has moved on"
    ],
    commonMistakes: [
      "No ask at all - assuming a happy client will volunteer a review",
      "Asking by email only - text/SMS has 5x the open rate",
      "Asking weeks after completion - gratitude fades, new problems have arisen",
      "No direct Google link - 'just search for us and leave a review' is too much friction"
    ],
    proofRequired: [
      "Review request made and documented",
      "Google review link sent",
      "Response (or non-response) noted in client record"
    ],
    clientFacing: true,
    appAction: { label: "View job - client comms", href: "/jobs" }
  },

  {
    slug: "close-referral",
    phase: 3,
    phaseNumber: 7,
    globalStepNumber: 49,
    title: "Referral Request",
    tagline: "A referral from a satisfied client is worth a year of advertising.",
    description:
      "The referral request is the direct ask for introductions to people in the client's network who may need renovation work. It is made separately from the review request, after the review is received, and structured as a specific ask rather than a general 'if you know anyone...'",
    whyItMatters:
      "Referred clients close at 4x the rate of cold leads. They come pre-qualified by the person who referred them, have lower price resistance, and are more likely to generate referrals themselves. The contractor who doesn't ask for referrals systematically leaves the most profitable lead source untapped.",
    worldClass: [
      "Referral ask made after the Google review is received - not simultaneously",
      "Specific ask: 'Do you know any neighbors or friends who are thinking about a renovation?'",
      "Referral program explained if one exists: referral bonus or credit",
      "Client's network context used: 'Your neighbor mentioned...' or 'I know you work in real estate...'",
      "Referral documented in the referring client's profile record"
    ],
    commonMistakes: [
      "No direct ask - 'let your friends know about us' is not a referral ask",
      "Asking for referrals before the client is fully satisfied - a punch list item pending",
      "No system for tracking referrals - you can't measure what you don't record",
      "Not following up on soft referrals: 'I'll mention you to my sister'"
    ],
    proofRequired: [
      "Referral ask made and response documented",
      "Any referral contacts captured in the system",
      "Referral source noted in new lead records"
    ],
    clientFacing: true,
    appAction: { label: "View client profile", href: "/profiles" }
  },

  {
    slug: "close-30day",
    phase: 3,
    phaseNumber: 8,
    globalStepNumber: 50,
    title: "30-Day Follow-Up",
    tagline: "Check in before they have a reason to call you - proactive service is a retention strategy.",
    description:
      "The 30-day follow-up is a scheduled outreach to the client one month after project completion to confirm satisfaction, address any emerging concerns, and maintain the relationship. It costs 5 minutes and is the difference between a one-time client and a lifetime client.",
    whyItMatters:
      "The first month after a renovation is when small issues surface - a door that's developed a squeak, a grout line that needs attention, a question about how to care for a new surface. A contractor who proactively calls gets to address these as a service. A contractor who doesn't call gets a Yelp review written about them.",
    worldClass: [
      "Follow-up is scheduled at project close - not improvised when you remember",
      "Call or text - not email - at the 30-day mark",
      "Specific questions asked: 'Any questions about the systems?' 'Any touch-ups needed?'",
      "Issues addressed promptly - 30-day warranty service builds lifetime loyalty",
      "Follow-up documented in the client's profile record with outcome"
    ],
    commonMistakes: [
      "No 30-day follow-up at all - client's minor question becomes an online review",
      "Email-only follow-up - low engagement, client doesn't respond",
      "Generic 'How is everything?' without asking specifically about the renovation",
      "Not documenting the outcome - you have no record of what was discussed"
    ],
    proofRequired: [
      "30-day follow-up contact attempted and outcome documented",
      "Any issues addressed and resolution documented"
    ],
    clientFacing: true,
    appAction: { label: "View client profile", href: "/profiles" }
  },

  {
    slug: "close-90day",
    phase: 3,
    phaseNumber: 9,
    globalStepNumber: 51,
    title: "90-Day Follow-Up",
    tagline: "Three months of living with the renovation reveals what the walkthrough couldn't.",
    description:
      "The 90-day follow-up is a check-in after the client has lived with the renovation through one full seasonal cycle. It surfaces issues that emerge over time - settling, HVAC performance, any material adjustments - and reinforces the relationship before it goes cold.",
    whyItMatters:
      "Many renovation issues - grout cracking at transitions, seasonal door sticking, HVAC comfort variation - don't appear until the client has lived through a change in season or humidity. A 90-day check-in catches these issues in the warranty window, before they compound and before the client concludes they can't trust you.",
    worldClass: [
      "90-day follow-up scheduled as a recurring activity at project close",
      "Contact via call or text - reference the specific project: 'How is the kitchen holding up?'",
      "Seasonal issues anticipated: 'Now that you've run the heat, any comfort issues?'",
      "Any warranty items addressed promptly and documented",
      "Referral ask refreshed if not previously successful - 'Do you know anyone else planning a project?'"
    ],
    commonMistakes: [
      "Missing the 90-day window entirely - project file closed and forgotten",
      "Not addressing warranty items promptly when surfaced",
      "No documentation of the follow-up - can't prove contact in a dispute"
    ],
    proofRequired: [
      "90-day follow-up contact documented with date and outcome",
      "Any warranty items documented and resolution noted"
    ],
    clientFacing: true,
    appAction: { label: "View client profile", href: "/profiles" }
  },

  {
    slug: "close-annual",
    phase: 3,
    phaseNumber: 10,
    globalStepNumber: 52,
    title: "Annual Check-In",
    tagline: "An annual touchpoint keeps you top-of-mind for the next project.",
    description:
      "The annual check-in is a once-yearly outreach to past clients to maintain the relationship, check on the condition of the renovation, offer seasonal maintenance reminders, and stay top-of-mind for future work. Residential clients renovate on average every 7–10 years - and they refer more frequently than that.",
    whyItMatters:
      "The contractor who maintains annual contact with past clients generates a steady flow of repeat work and referrals from a base that required no advertising cost to acquire. A past client who hears from you once a year will think of you first when their neighbor mentions a renovation, when their roof starts showing wear, or when they finally decide to do the basement.",
    worldClass: [
      "Annual check-in scheduled for every past client at the anniversary of their project",
      "Contact is relevant - maintenance reminder, seasonal tip, or check on a known system",
      "Offer of a free walkthrough to assess any developing needs",
      "New portfolio work shared - 'we just completed a project similar to yours'",
      "Referral relationship maintained: 'We're still building in your area if you know anyone'"
    ],
    commonMistakes: [
      "No annual contact - past clients are the highest-quality lead source, entirely abandoned",
      "Generic newsletter email - unsubscribed immediately if the client forgets who you are",
      "Not segmenting contact by project type - kitchen client gets kitchen-relevant tips",
      "Not connecting the check-in to a specific reason - 'just reaching out' converts poorly"
    ],
    proofRequired: [
      "Annual contact attempted and outcome documented",
      "Any new opportunities noted in the lead system"
    ],
    clientFacing: true,
    appAction: { label: "View client profile", href: "/profiles" }
  }
];

export function getLibraryStep(slug: string): LibraryStep | undefined {
  return constructionLibrary.find((step) => step.slug === slug);
}

export function getLibraryPhase(phase: LibraryPhase): LibraryStep[] {
  return constructionLibrary.filter((step) => step.phase === phase);
}

/** Maps the canonical 23 renovation phase names to library slugs for contextual links on the job detail page */
export const phaseNameToLibrarySlug: Record<string, string> = {
  // Original 14 phases - unchanged slugs
  "Site Prep": "build-site-prep",
  "Demo": "build-demo",
  "Exterior": "build-exterior",
  "Rough Framing": "build-rough-framing",
  "Rough Electric": "build-rough-electric",
  "Rough Plumbing": "build-rough-plumbing",
  "Rough HVAC": "build-rough-hvac",
  "Flooring": "build-flooring",
  // Renamed phases - mapped to nearest existing slug
  "Secondary Framing / Blocking": "build-secondary-framing",
  "Insulation": "build-secondary-framing",
  "Drywall / Wall Covering": "build-drywall",
  "Interior Paint": "build-paint",
  "Cabinets": "build-cabinets",
  "Counters": "build-cabinets",
  "Trim / Doors / Hardware": "build-trim",
  "Punch List": "build-punch-list",
  "Final Touch-Ups": "build-punch-list",
  "Deep Clean": "build-punch-list",
  "Final Walkthrough": "build-punch-list",
  // New phases - no library content yet; omitted so no broken link appears
  // "Inspections": - pending library article
  // "Waterproofing / Tile Prep": - pending library article
  // "Tile": - pending library article
  // "Fixtures / Finish Trades": - pending library article
};

export const phaseLabels: Record<LibraryPhase, string> = {
  1: "Lead to Project Start Lifecycle",
  2: "Construction Order of Operations",
  3: "Post-job Follow-up"
};

export const phaseDescriptions: Record<LibraryPhase, string> = {
  1: "21 steps from first contact to site prep day one - qualification, quoting, approval, contract, and job setup.",
  2: "23 construction phases in the sequence that protects quality, budget, and schedule.",
  3: "10 post-project steps that turn a satisfied client into a lifetime referral source."
};
