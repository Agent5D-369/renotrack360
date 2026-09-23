import { z } from "zod";

const milestonePercent = z.string().trim().regex(/^(?:0\.\d{1,2}|[1-9]\d?(?:\.\d{1,2})?|100(?:\.0{1,2})?)$/, "Use a positive percentage with at most two decimals.")
  .refine(value => percentageBasisPoints(value) > 0, "Milestone percentages must be greater than zero.");
export const billingMilestoneSchema = z.object({
  key: z.string().trim().min(1).max(64).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a stable lowercase milestone key."),
  label: z.string().trim().min(2).max(120),
  percent: milestonePercent,
  triggerEvent: z.string().trim().min(3).max(500),
  clientDescription: z.string().trim().max(2000).default(""),
});
export const billingScheduleInputSchema = z.array(billingMilestoneSchema).min(1).max(12).superRefine((schedule, ctx) => {
  const seen = new Set<string>();
  for (const [index, milestone] of schedule.entries()) {
    if (seen.has(milestone.key)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [index, "key"], message: "Milestone keys must be unique." });
    seen.add(milestone.key);
  }
  const basisPoints = schedule.reduce((sum, milestone) => sum + percentageBasisPoints(milestone.percent), 0);
  if (basisPoints !== 10_000) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Billing milestone percentages must total exactly 100%." });
});
export type BillingMilestone = z.infer<typeof billingMilestoneSchema>;
export const defaultBillingMilestones: BillingMilestone[] = [
  { key: "execution-mobilization", label: "Execution / mobilization deposit", percent: "20", triggerEvent: "Accepted contract and mobilization conditions reviewed by the owner", clientDescription: "Deposit due under the accepted proposal for execution and mobilization." },
  { key: "rough-in-inspections", label: "Rough-in inspections", percent: "30", triggerEvent: "Required rough-in inspection records reviewed as passed by the owner", clientDescription: "Progress billing tied to the rough-in inspection milestone stated in the accepted proposal." },
  { key: "substantial-completion", label: "Substantial completion", percent: "40", triggerEvent: "Substantial-completion conditions reviewed by the owner", clientDescription: "Progress billing tied to substantial completion under the accepted proposal." },
  { key: "final-closeout", label: "Final walkthrough / closeout", percent: "10", triggerEvent: "Final walkthrough, punch, and closeout conditions reviewed by the owner", clientDescription: "Final billing tied to the walkthrough, punch, and closeout conditions in the accepted proposal." },
];

function percentageBasisPoints(value: string) {
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}
function amountCents(value: string) {
  if (!/^(0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(value)) throw new Error("Use a nonnegative amount with at most two decimals.");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}
function formatCents(value: bigint) {
  const sign = value < 0n ? "-" : "", absolute = value < 0n ? -value : value;
  const whole = absolute / 100n, fraction = (absolute % 100n).toString().padStart(2, "0");
  return `${sign}${whole}.${fraction}`;
}

/** Round each non-final draw half-up to cents; the final draw receives the exact residual. */
export function calculateBillingMilestones(total: string, rawSchedule: unknown) {
  const schedule = billingScheduleInputSchema.parse(rawSchedule), totalCents = amountCents(total);
  let allocated = 0n;
  return schedule.map((milestone, index) => {
    const cents = index === schedule.length - 1
      ? totalCents - allocated
      : (totalCents * BigInt(percentageBasisPoints(milestone.percent)) + 5_000n) / 10_000n;
    if (cents <= 0n) throw new Error("Every billing milestone must produce a positive invoice amount.");
    allocated += cents;
    return { ...milestone, amount: formatCents(cents) };
  });
}

/**
 * Company-editable default schedule: one draw per line,
 * "percent | label | trigger event | client description".
 * Keys are derived from the label so nothing has to be invented by hand.
 */
export function parseDefaultScheduleText(text: string): BillingMilestone[] {
  const lines = String(text ?? "").split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const rows = lines.map((line, index) => {
    const parts = line.split("|").map(part => part.trim());
    if (parts.length !== 4) throw new Error(`Line ${index + 1} needs four parts separated by "|": percent | label | trigger event | client description.`);
    const [percent, label, triggerEvent, clientDescription] = parts;
    return { key: scheduleKey(label, index), percent, label, triggerEvent, clientDescription };
  });
  return billingScheduleInputSchema.parse(rows);
}

function scheduleKey(label: string, index: number) {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
  return `${slug || "draw"}-${index + 1}`;
}

/** Render a schedule back into the editable text form. */
export function defaultScheduleText(schedule: readonly BillingMilestone[] = defaultBillingMilestones): string {
  return schedule.map(milestone => [milestone.percent, milestone.label, milestone.triggerEvent, milestone.clientDescription].join(" | ")).join("\n");
}

/** The stored company schedule, or the built-in four-draw default when it is absent or unusable. */
export function companyBillingSchedule(stored: unknown): BillingMilestone[] {
  const fallback = () => defaultBillingMilestones.map(milestone => ({ ...milestone }));
  if (stored === null || stored === undefined) return fallback();
  const parsed = billingScheduleInputSchema.safeParse(stored);
  return parsed.success ? parsed.data : fallback();
}
