import { createHash } from "node:crypto";
import { z } from "zod";

const evidenceSchema = z.object({ key: z.string().min(1), label: z.string().min(1), kind: z.enum(["PHOTO", "RECORD", "REVIEW"]), required: z.literal(true) });
const stepSchema = z.object({
  key: z.string().min(1), title: z.string().min(1), instructions: z.string().min(1),
  holdPoint: z.boolean(), condition: z.string().nullable(), evidence: z.array(evidenceSchema).min(1),
  // The frame asks each ordered step to say what good work looks like, whether a reviewer must see it,
  // and what "finished" means - otherwise a tick in a box is the only record of completion.
  qualityRequirements: z.array(z.string().min(1)).default([]),
  inspectionPoint: z.boolean().default(false),
  definitionOfDone: z.string().min(10),
});
export const workItemSchema = z.object({
  // Identity: what this item is, in the company vocabulary.
  identity: z.object({ trade: z.string().min(1), category: z.string().min(1), unit: z.string().min(1) }),
  // Cost model: the components and their basis. Deliberately no invented numbers, because an unmeasured
  // number gets quoted as though it were known.
  costModel: z.object({
    basis: z.string().min(10), labor: z.string().min(1), materials: z.string().min(1), equipment: z.string().min(1),
    productivity: z.string().min(1), waste: z.string().min(1), mobilization: z.string().min(1), cleanup: z.string().min(1),
    disposal: z.string().min(1), rangeBasis: z.string().min(10), complexityModifiers: z.array(z.string()).default([]),
    marketIndexNote: z.string().min(10),
  }),
  // Scope: what the client is told, kept separate from the internal detail.
  clientDescription: z.string().min(20),
  allowances: z.array(z.string()).min(1),
  // Operations: how this item relates to the rest of the job.
  operations: z.object({
    predecessors: z.array(z.string()).default([]), successors: z.array(z.string()).default([]),
    tradeResponsibility: z.string().min(10), expectedDuration: z.string().min(1), crewAssumptions: z.array(z.string()).min(1),
    selectionRequirements: z.array(z.string()).default([]), procurementRequirements: z.array(z.string()).default([]),
    permitDependencies: z.array(z.string()).default([]),
  }),
  templateCode: z.string().min(1), name: z.string().min(1), edition: z.string().min(1),
  purpose: z.string().min(1), scope: z.array(z.string()).min(1), exclusions: z.array(z.string()).min(1),
  assumptions: z.array(z.string()).min(1), costInputs: z.array(z.string()).min(1),
  reviewerPolicy: z.string().min(1), source: z.object({ title: z.string(), url: z.string().url(), edition: z.string(), retrievedAt: z.string(), sha256: z.string().regex(/^[a-f0-9]{64}$/), pages: z.string() }),
  steps: z.array(stepSchema).min(1),
}).superRefine((value, ctx) => {
  const keys = value.steps.map(step => step.key);
  const evidence = value.steps.flatMap(step => step.evidence.map(item => item.key));
  if (new Set(keys).size !== keys.length || new Set(evidence).size !== evidence.length) ctx.addIssue({ code: "custom", message: "Step and evidence identifiers must be unique." });
});
export type WorkItemContent = z.infer<typeof workItemSchema>;
const evidence = (key: string, label: string, kind: "PHOTO" | "RECORD" | "REVIEW") => ({ key, label, kind, required: true as const });

// An internal scope/QC plan with source pointers, not a substitute installation manual.
const showerPilotContent = {
  templateCode: "FS-SHOWER-KERDI-CURBED", name: "Curbed shower waterproofing", edition: "2026-09-21-v1",
  purpose: "Internal planning template. Adoption retains this plan; each job still needs site-specific scope, qualified installation and documented acceptance.",
  scope: ["Matched Schluter KERDI membrane system, standard prefabricated tray, compatible curb and standard KERDI-DRAIN for a residential non-steam shower.", "Substrate and drain readiness review, waterproofing, pre-cover evidence, water-test record and QC handoff before tile."],
  exclusions: ["Tile, grout, finish fixtures and glass; demolition, structural repair and plumbing relocation unless separately scoped.", "Curbless or steam showers, mortar-bed bases, horizontal or adapter drains, mixed-manufacturer assemblies and other unreviewed substitutions."],
  assumptions: ["Measure the actual site before ordering or pricing; resolve concealed damage through a documented scope change.", "Verify the current manufacturer instructions and applicable project inspection requirements before work. Stop and obtain a reviewed variation when this configuration does not fit.", "Rick is accountable for Flipside QC. Record the actual competent installer and any required licensed-trade or authority reviewer for this job."],
  costInputs: ["Measured membrane area, seam/corner/penetration quantities and specified compatible products, including waste and freight.", "Actual tray, curb and drain selection; current supplier quote and its date.", "Separate field installation, preparation, return-visit and PM/QC hours at documented replacement rates; do not double-count hours.", "Protection, disposal, testing and any required trade/permit costs. Apply documented risk before the target gross margin; no default material price or production-hour allowance is invented."],
  reviewerPolicy: "Rick: accountable Flipside QC. Installer competence, trade responsibility and applicable inspection signoffs must be recorded per job. Template adoption is not manufacturer certification, a site inspection or permission to cover failed work.",
  source: { title: "Schluter Shower System Installation Handbook", url: "https://assets.schluter.com/asset/570120892212/document_i2tt9fh4sp2n562jmirhppbv4o/shower-system-installation-handbook.pdf?content-disposition=inline", edition: "04/2026", retrievedAt: "2026-09-21", sha256: "6c7259896f8fab7d34e54a2b4eff307a1f35c12be96e574cacad95a0f8921ea5", pages: "6-7, 22, 24; consult the full handbook for the selected components" },
  steps: [
    { key: "site-release", title: "Confirm scope and responsible people", holdPoint: true, condition: null, instructions: "Record dimensions, selected configuration, installer competence, required inspections and named QC responsibility. Resolve exclusions and open design issues before releasing work.", evidence: [evidence("site-plan", "Measured scope, products and responsible people", "RECORD"), evidence("site-release", "Readiness review and unresolved-issue disposition", "REVIEW")] },
    { key: "substrate", title: "Inspect preparation and substrate", holdPoint: true, condition: null, instructions: "Document substrate condition and suitability against the selected handbook detail. Resolve damage, support, level and required drainage slopes before installation.", evidence: [evidence("substrate-photos", "Wide and detail photos before membrane", "PHOTO"), evidence("substrate-review", "Recorded measurements and substrate acceptance", "REVIEW")] },
    { key: "drain-plan", title: "Confirm drain access and connection sequence", holdPoint: true, condition: null, instructions: "Record whether the waste connection is accessible from below and follow the corresponding order in handbook page 24. Verify the trade responsibility and connection test required for this site.", evidence: [evidence("drain-access", "Access route, connection plan and responsible trade", "RECORD")] },
    { key: "drain-before", title: "Connect drain before tray where access requires it", holdPoint: true, condition: "Required when there is no access from below. Otherwise record the access-based reason for skipping this branch.", instructions: "Complete and document the applicable drain connection before the tray blocks access, following the selected component instructions and inspection requirements.", evidence: [evidence("drain-before-record", "Connection and required test/inspection record, or reviewed branch exclusion", "REVIEW")] },
    { key: "system-install", title: "Install the selected matched system", holdPoint: false, condition: null, instructions: "Use the selected handbook assembly and approved compatible materials. Where access remains below, complete the drain connection in its applicable sequence. Record actual products and any deviation before proceeding.", evidence: [evidence("product-record", "Product identifiers, batch/date where available and installed configuration", "RECORD"), evidence("installation-photos", "Tray, curb, drain and wall installation before concealment", "PHOTO")] },
    { key: "pre-cover", title: "Review waterproofing before covering", holdPoint: true, condition: null, instructions: "Review membrane coverage, seams, corners, penetrations and drain transitions against the selected details. Record required overlaps and slopes. Keep each failed or uncertain item open until corrected and re-reviewed.", evidence: [evidence("detail-photos", "Labeled seams, corners, penetrations and drain details", "PHOTO"), evidence("pre-cover-review", "QC findings, measurements and correction acceptance", "REVIEW")] },
    { key: "cure", title: "Record curing readiness for testing", holdPoint: true, condition: null, instructions: "Record completion time and conditions. Allow at least 24 hours after KERDI installation before water testing under normal conditions, and longer when conditions or product instructions require it.", evidence: [evidence("cure-log", "Installation finish, conditions and earliest permitted test time", "RECORD")] },
    { key: "water-test", title: "Document the water test", holdPoint: true, condition: null, instructions: "Use the manufacturer test guidance and applicable inspection requirements. Record plug check, marked water level, start/end times, observations and results. A failed or inconclusive result requires correction and a new documented test before release.", evidence: [evidence("water-test-photos", "Dated start and end water-level evidence", "PHOTO"), evidence("water-test-record", "Test duration, observations, result and required inspection", "RECORD")] },
    { key: "tile-release", title: "Accept the record before tile", holdPoint: true, condition: null, instructions: "Rick or the recorded authorized QC reviewer checks the evidence and issue resolution, plus any required authority acceptance. Record the release decision before tile starts; a checklist alone is not proof of acceptance.", evidence: [evidence("final-qc", "Named reviewer, date, evidence reviewed and release decision", "REVIEW")] },
  ],
};

// Per-step quality and completion, kept beside the seed so the operational detail reads in one place.
const stepQuality: Record<string, string[]> = {
  "site-release": [
    "Dimensions and selected configuration recorded before ordering",
    "Named installer competence and required inspections recorded"
  ],
  "substrate": [
    "Substrate flatness and drainage slope measured rather than eyeballed",
    "Unresolved damage or support issues left open, never covered"
  ],
  "drain-plan": [
    "Access route confirmed on site",
    "Responsible trade named for the waste connection"
  ],
  "drain-before": [
    "Connection completed before the tray blocks access where access is only from above",
    "Required test or inspection recorded"
  ],
  "system-install": [
    "Only matched, compatible system components installed",
    "Actual products recorded with batch or date where available"
  ],
  "pre-cover": [
    "Seams, corners, penetrations and drain transitions reviewed against the selected details",
    "Required overlaps and slopes recorded"
  ],
  "cure": [
    "Installation completion and site conditions recorded",
    "Earliest permitted test time stated from the product instructions"
  ],
  "water-test": [
    "Water level marked and dated at start and end",
    "Failed or inconclusive results corrected and retested, never passed by assumption"
  ],
  "tile-release": [
    "Recorded reviewer has seen the evidence",
    "Release decision written before tile starts"
  ]
};
const stepDefinitionOfDone: Record<string, string> = {
  "site-release": "Measured scope, selected products and named responsible people are recorded, and every open design issue has a disposition.",
  "substrate": "Substrate condition and suitability are documented against the selected detail, with every corrective item closed or explicitly open.",
  "drain-plan": "The drain connection sequence for this site is written down with the responsible trade named.",
  "drain-before": "The connection and any required test are recorded before access is lost, or the access-based reason for skipping the branch is recorded and reviewed.",
  "system-install": "The installed assembly matches the selected system, and the actual products are recorded with any deviation noted.",
  "pre-cover": "Membrane coverage, seams, corners, penetrations and transitions are photographed and accepted before anything covers them.",
  "cure": "Installation time and conditions are recorded, and the earliest permitted test time is stated.",
  "water-test": "A dated test with marked levels, duration, observations and a passing result is on file, or the item stays open.",
  "tile-release": "A named reviewer has accepted the evidence, and the release decision is recorded before tile begins."
};

export const showerPilot: WorkItemContent = workItemSchema.parse({
  ...showerPilotContent,
  identity: { trade: "Tile and waterproofing", category: "Wet area waterproofing", unit: "each" },
  clientDescription: "Waterproofing for a curbed, non-steam residential shower using one matched membrane system, including the pre-cover review and water test that show it was done properly before tile covers it.",
  allowances: ["No material allowance is implied: the selected tray, curb, drain and membrane are priced from the current supplier quote for this job."],
  costModel: {
    basis: "Priced per job from measured membrane area, the actual selected components and recorded field hours. No default material price or production-hour allowance is invented.",
    labor: "Recorded field installation, preparation and return-visit hours at documented replacement rates.",
    materials: "The selected matched system components and compatible accessories at the current, dated supplier quote.",
    equipment: "Only equipment this site actually requires, such as mixing or test equipment.",
    productivity: "Actual installer hours per measured area, accumulated across completed jobs rather than assumed.",
    waste: "Measured membrane area plus the seam, corner and penetration quantities the selected details require.",
    mobilization: "Mobilization and site setup recorded when the job needs a separate visit.",
    cleanup: "Protection and cleanup recorded as its own line rather than absorbed silently.",
    disposal: "Disposal of removed or waste material where the job produces it.",
    rangeBasis: "A low, target and high range is quoted only from comparable completed jobs; until then the estimate rests on the measured basis above.",
    complexityModifiers: ["Access and occupancy", "Finish level", "Concealed or damaged conditions found on site", "Schedule compression"],
    marketIndexNote: "The applicable market cost factor is applied to labour, material and permit costs at pricing time, and the applied index is retained with the scenario.",
  },
  operations: {
    predecessors: ["Framing and substrate preparation accepted", "Plumbing rough-in and drain location verified", "Tile selection confirmed, because pattern and trim constrain the layout"],
    successors: ["Tile and finish installation", "Fixture set and final clean"],
    tradeResponsibility: "The recorded competent installer performs the waterproofing; plumbing connection responsibility is named per job; Flipside QC reviews and releases before anything is covered.",
    expectedDuration: "Recorded per job; the cure period alone needs at least 24 hours before water testing under normal conditions.",
    crewAssumptions: ["One competent waterproofing installer plus QC review time", "Access to water for testing and a protected drying period"],
    selectionRequirements: ["Tray, curb, drain and membrane selections confirmed before ordering", "Tile pattern and trim confirmed before layout"],
    procurementRequirements: ["Matched system components on site before work starts", "Supplier quote dated and attached to the price"],
    permitDependencies: ["Any plumbing or inspection requirement applicable to this jurisdiction recorded before work"],
  },
  steps: showerPilotContent.steps.map(step => ({
    ...step,
    qualityRequirements: stepQuality[step.key] ?? [],
    inspectionPoint: step.holdPoint,
    definitionOfDone: stepDefinitionOfDone[step.key] ?? "Reviewed and accepted by the recorded QC reviewer.",
  })),
});

export function workItemDigest(content: WorkItemContent) {
  return createHash("sha256").update(JSON.stringify(workItemSchema.parse(content))).digest("hex");
}
