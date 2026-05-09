export const DEFAULT_ORG_ID = "flipside-org";

export const renovationPhaseDetails = [
  ["Site Prep", "Protect the property, confirm access, stage tools and materials, document existing conditions, and make the job ready for controlled work."],
  ["Demo", "Remove approved items, manage debris, expose concealed conditions, and stop for change-order review when hidden issues appear."],
  ["Exterior", "Complete exterior envelope, access, drainage, siding, trim, roofing, or exterior repair work needed before interior finishes are exposed."],
  ["Rough Framing", "Frame walls, openings, blocking, substrate support, and structural prep needed for trades and finishes."],
  ["Rough Electric", "Complete electrical rough-in, boxes, wiring paths, panel coordination, and inspection-ready documentation."],
  ["Rough Plumbing", "Complete plumbing rough-in, supply and drain changes, fixture locations, pressure checks, and inspection readiness."],
  ["Rough HVAC", "Complete HVAC rough-in, ducting, ventilation, bath fans, air movement, and mechanical coordination."],
  ["Secondary Framing / Blocking", "Close secondary framing needs and add blocking for cabinetry, grab bars, fixtures, and finish attachment points."],
  ["Insulation", "Install fire, sound, and thermal insulation. Take pre-cover proof photos before drywall closes the wall."],
  ["Inspections", "Schedule and pass all required rough inspections. Collect inspection cards and resolve any corrections before proceeding."],
  ["Drywall / Wall Covering", "Install and finish drywall, plaster, backer board, and other wall substrates. Sand and prime before paint."],
  ["Waterproofing / Tile Prep", "Apply waterproofing membranes, cement board, and tile substrate in wet areas. Allow full cure time before tile."],
  ["Tile", "Install all tile, grout, caulk joints, and verify slope and alignment. Document with progress photos."],
  ["Cabinets", "Install base and upper cabinets, verify level and square, and coordinate countertop template schedule."],
  ["Counters", "Template, fabricate, and install countertops. Seal as required. Coordinate plumbing cutouts."],
  ["Interior Paint", "Prep, prime, paint, touch up, and verify finish quality before flooring and final trim installation."],
  ["Flooring", "Prepare substrates, install flooring, transitions, and protection. Document completed surfaces before heavy traffic."],
  ["Trim / Doors / Hardware", "Install casing, base trim, doors, handles, hinges, and all final carpentry and caulk details."],
  ["Fixtures / Finish Trades", "Install all finish electrical, plumbing, HVAC, and lighting fixtures. Test each system before client walkthrough."],
  ["Final Touch-Ups", "Address remaining cosmetic items, paint touch-ups, caulk gaps, and minor corrections from the pre-walkthrough review."],
  ["Punch List", "Walk the job with a client-facing punch list. Document every open item with a photo and assign a close-out date."],
  ["Deep Clean", "Complete a professional clean of all surfaces, fixtures, windows, and floors. Remove all debris and staging materials."],
  ["Final Walkthrough", "Walk with client, confirm punch list resolved, collect signatures, deliver warranty documentation, and trigger final invoice."],
] as const;

export const renovationPhases = renovationPhaseDetails.map(([phaseName]) => phaseName);

export const catalogCategories = [
  "Appliances",
  "Cabinets",
  "Countertops",
  "Demolition",
  "Doors",
  "Drywall",
  "Electrical",
  "Exterior",
  "Flooring",
  "Framing",
  "Insulation",
  "Landscaping",
  "Masonry",
  "Painting",
  "Permits",
  "Plumbing",
  "Roofing",
  "Tile",
  "Trim",
  "Windows"
] as const;

export const dashboardFilters = {
  newLeads: "/leads?status=NEW_LEAD",
  hotLeads: "/leads?hot=true",
  followUpsDue: "/activities?due=true",
  quotesInProgress: "/quotes?status=PRICING",
  quotesSent: "/quotes?status=SENT",
  approvedJobs: "/jobs?status=PRE_CONSTRUCTION",
  activeJobs: "/jobs?active=true",
  weeklyReportsDue: "/weekly-reports?due=true",
  openChangeOrders: "/change-orders?open=true",
  outstandingInvoices: "/invoices?status=SENT"
};

export const appThemes = [
  {
    id: "flipside-field-light",
    name: "RenoTech Field Light",
    mode: "Light",
    swatches: ["#f7f4ee", "#123f33", "#f59f3a"]
  },
  {
    id: "clean-contractor",
    name: "Clean Contractor",
    mode: "Light",
    swatches: ["#f8fafc", "#0f766e", "#2563eb"]
  },
  {
    id: "high-contrast-light",
    name: "High Contrast Light",
    mode: "Light",
    swatches: ["#ffffff", "#000000", "#b45309"]
  },
  {
    id: "jobsite-dark",
    name: "Jobsite Dark",
    mode: "Dark",
    swatches: ["#111827", "#f8fafc", "#f97316"]
  },
  {
    id: "slate-office",
    name: "Slate Office",
    mode: "Dark",
    swatches: ["#0f172a", "#e2e8f0", "#22c55e"]
  },
  {
    id: "high-contrast-dark",
    name: "High Contrast Dark",
    mode: "Dark",
    swatches: ["#000000", "#ffffff", "#facc15"]
  }
] as const;
