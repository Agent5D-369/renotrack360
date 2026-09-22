import { Prisma, PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { z } from "zod";
import { hasStaffAccess } from "./staff-policy";

export const HOMEWYSE_AUTHORIZATION = "Written Homewyse authorization retained by counsel; Rick authorized implementation 2026-09-21.";
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a full calendar date.").refine(value => {
  const parsed = new Date(value + "T00:00:00Z"); return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Invalid calendar date.");
const amount = z.string().trim().regex(/^(0|[1-9]\d{0,10})(\.\d{1,4})?$/, "Use a nonnegative number with at most four decimal places.");
const text = (max: number) => z.string().trim().min(2).max(max);
export const costObservationSchema = z.object({
  name: text(120), layer: z.enum(["MARKET_REFERENCE", "EXPECTED_DIRECT_COST"]), component: z.enum(["LABOR", "MATERIAL", "EQUIPMENT", "DISPOSAL", "ASSEMBLY"]),
  measure: z.enum(["RATE", "INDEX"]), tradeOrClass: text(120), geography: text(120), unit: text(80),
  low: amount, target: z.union([amount, z.literal("")]), high: amount,
  effectiveDate: date, reviewDate: date, basePeriod: z.union([date, z.literal("")]),
  sourceName: text(120), sourceUrl: z.string().url().refine(value => { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; }, "Use an HTTPS source URL without credentials."),
  sourceVersion: text(120), sourceKind: z.enum(["HOMEWYSE", "OFFICIAL_STATISTICS", "SUPPLIER_QUOTE", "FLIPSIDE_RECOMMENDATION", "OTHER"]),
  scope: z.string().trim().min(10).max(3000), modificationNotes: z.string().trim().min(10).max(1500),
  calibrationDate: z.union([date, z.literal("")]), calibrationBasis: z.string().trim().max(1500),
}).superRefine((value, ctx) => {
  const fail = (message: string) => ctx.addIssue({ code: "custom", message });
  if (![value.low, value.high, ...(value.target ? [value.target] : [])].every(item => amount.safeParse(item).success)) return;
  const low = new Prisma.Decimal(value.low), high = new Prisma.Decimal(value.high);
  if (high.lt(low) || (value.target && (new Prisma.Decimal(value.target).lt(low) || new Prisma.Decimal(value.target).gt(high)))) fail("Values must satisfy low ≤ target ≤ high.");
  if (value.reviewDate < value.effectiveDate) fail("Review date cannot precede the effective date.");
  if (value.measure === "INDEX" && (!value.basePeriod || value.layer !== "MARKET_REFERENCE" || value.component === "ASSEMBLY" || low.lte(0))) fail("An index needs a base date, positive values and a specific market component.");
  if (value.basePeriod && value.basePeriod > value.effectiveDate) fail("Index base date cannot follow its effective date.");
  if (value.measure === "RATE" && value.basePeriod) fail("A rate does not use an index base date.");
  if (value.calibrationDate && value.calibrationBasis.length < 10) fail("Calibration needs its evidence and method.");
  if (!value.calibrationDate && value.calibrationBasis) fail("Record a calibration date with its basis, or leave both empty.");
  if (value.layer === "EXPECTED_DIRECT_COST" && (!value.calibrationDate || value.calibrationBasis.length < 10)) fail("Expected direct cost requires a documented calibration date and basis.");
  const source = z.string().url().safeParse(value.sourceUrl);
  if (source.success) {
    const hostname = new URL(source.data).hostname.toLowerCase();
    const isHomewyse = hostname === "homewyse.com" || hostname.endsWith(".homewyse.com");
    if (isHomewyse !== (value.sourceKind === "HOMEWYSE")) fail("Homewyse source URLs must use the Homewyse source category.");
  }
});
export type CostObservationInput = z.infer<typeof costObservationSchema>;
export class CostObservationError extends Error {}
export async function saveCostObservation(db: PrismaClient, actorId: string, requestId: string, raw: unknown) {
  if (!z.string().uuid().safeParse(requestId).success) throw new CostObservationError("Reload the source form before saving.");
  const parsed = costObservationSchema.safeParse(raw);
  if (!parsed.success) throw new CostObservationError(parsed.error.issues[0].message);
  const input = parsed.data;
  if (input.calibrationDate > new Date().toISOString().slice(0, 10)) throw new CostObservationError("Calibration cannot be recorded in the future.");
  const content = { ...input, authorizationReference: input.sourceKind === "HOMEWYSE" ? HOMEWYSE_AUTHORIZATION : "Not a Homewyse import.", flipsideVersion: "cost-observation-v1" };
  const inputDigest = createHash("sha256").update(JSON.stringify(content)).digest("hex");
  return db.$transaction(async tx => {
    const user = await tx.user.findUnique({ where: { id: actorId }, include: { memberships: true } });
    const member = user?.memberships.find(value => value.organizationId === user.organizationId);
    if (!hasStaffAccess(user, member ?? null)) throw new CostObservationError("Staff access denied.");
    const organizationId = user!.organizationId!;
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${organizationId + ":cost-source:" + requestId}, 0))::text`;
    const existing = await tx.costObservation.findUnique({ where: { organizationId_requestId: { organizationId, requestId } } });
    if (existing) {
      if (existing.inputDigest !== inputDigest || existing.createdById !== actorId) throw new CostObservationError("This request was already used. Reload to save another observation.");
      return existing;
    }
    const observation = await tx.costObservation.create({ data: { organizationId, requestId, inputDigest, name: input.name, layer: input.layer,
      component: input.component, measure: input.measure, geography: input.geography, effectiveDate: input.effectiveDate, reviewDate: input.reviewDate,
      low: input.low, target: input.target || null, high: input.high, content, createdById: actorId } });
    await tx.auditEvent.create({ data: { organizationId, actorUserId: actorId, action: "COST_OBSERVATION_SAVED", entityType: "CostObservation", entityId: observation.id,
      metadata: { inputDigest, layer: input.layer, sourceKind: input.sourceKind, automaticRepricing: false } } });
    return observation;
  });
}
