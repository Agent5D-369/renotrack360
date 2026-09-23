import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { z } from "zod";
import { calculateGrossMargin, pricingInputSchema, PRICING_POLICY } from "./gross-margin";
import { hasStaffAccess } from "./staff-policy";
import {
  applyMarketIndex,
  loadMarketFactorById,
  MARKET_INDEX_POLICY,
  MarketIndexError,
  NO_MARKET_INDEX,
  toAppliedMarketIndex,
} from "./market-index";

export class PricingError extends Error {}
/** The owner-exception floor is a company setting; 35% remains the fallback when none is supplied. */
export function ownerExceptionThreshold(value: unknown): number {
  // A missing setting must never collapse to zero: zero would make every scenario an exception.
  if (value === null || value === undefined) return 35;
  if (typeof value === "string" && value.trim() === "") return 35;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed < 100 ? parsed : 35;
}

export async function savePriceSnapshot(
  db: PrismaClient,
  actorId: string,
  requestId: string,
  raw: unknown,
  options: { ownerExceptionMarginPercent?: unknown } = {}
) {
  if (!z.string().uuid().safeParse(requestId).success) throw new PricingError("Invalid pricing request. Reload the form.");
  const parsed = pricingInputSchema.safeParse(raw);
  if (!parsed.success) throw new PricingError(parsed.error.issues[0].message);
  const input = parsed.data;
  // Optional geographic index. Unknown keys are stripped by the schema above, so read it from the raw form.
  const rawRecord = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const marketFactorId = String(rawRecord.marketFactorId ?? "").trim();
  const inputDigest = createHash("sha256").update(JSON.stringify({ policy: PRICING_POLICY, input, marketFactorId })).digest("hex");
  return db.$transaction(async tx => {
    const user = await tx.user.findUnique({ where: { id: actorId }, include: { memberships: true } });
    const member = user?.memberships.find(value => value.organizationId === user.organizationId);
    if (!hasStaffAccess(user, member ?? null)) throw new PricingError("Staff access denied.");
    // The index is resolved inside the transaction and refused when the company does not own it.
    let marketIndex = NO_MARKET_INDEX;
    if (marketFactorId) {
      const factor = await loadMarketFactorById(tx, user!.organizationId!, marketFactorId);
      if (!factor) throw new PricingError("That market index is not available to this company.");
      try { marketIndex = toAppliedMarketIndex(factor); }
      catch (error) { throw new PricingError(error instanceof MarketIndexError ? error.message : "That market index cannot be applied."); }
    }
    const pricedInput = applyMarketIndex(input, marketIndex);
    let totals: ReturnType<typeof calculateGrossMargin>;
    try { totals = calculateGrossMargin(pricedInput); } catch (error) { throw new PricingError((error as Error).message); }
    const exceptionFloor = ownerExceptionThreshold(options.ownerExceptionMarginPercent);
    const exception = Number(input.targetMarginPercent) < exceptionFloor;
    if (exception && (member!.role !== "OWNER" || user!.role !== "OWNER" || !input.ownerApproval || input.ownerExceptionReason.length < 10)) {
      throw new PricingError(`Below ${exceptionFloor}% gross margin requires owner approval and a specific exception reason.`);
    }
    // Serialize retries of this request; the unique database constraint remains the final guard.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${user!.organizationId + ":" + requestId}, 0))::text`;
    const existing = await tx.priceSnapshot.findUnique({ where: { organizationId_requestId: { organizationId: user!.organizationId!, requestId } } });
    if (existing) {
      if (existing.inputDigest !== inputDigest || existing.createdById !== actorId) throw new PricingError("This request was already used. Reload to save a new scenario.");
      return existing;
    }
    if (input.costSourceVersionId && !await tx.costSourceVersion.findFirst({ where: { id: input.costSourceVersionId, organizationId: user!.organizationId! }, select: { id: true } })) throw new PricingError("Cost source access denied.");
    const snapshot = await tx.priceSnapshot.create({ data: {
      costSourceVersionId: input.costSourceVersionId || null, organizationId: user!.organizationId!, requestId, inputDigest, createdById: actorId, name: input.name, basis: input.basis,
      policyVersion: PRICING_POLICY,
      // The applied index is retained with the assumptions, so a saved scenario keeps its own history.
      inputs: { ...pricedInput, marketIndexPolicy: MARKET_INDEX_POLICY, marketIndex },
      ...totals,
      ownerExceptionReason: exception ? input.ownerExceptionReason : null, ownerApprovedById: exception ? actorId : null,
    } });
    await tx.auditEvent.create({ data: { organizationId: user!.organizationId!, actorUserId: actorId,
      action: "PRICE_SCENARIO_SAVED", entityType: "PriceSnapshot", entityId: snapshot.id,
      metadata: { inputDigest, policyVersion: PRICING_POLICY, ownerException: exception,
        marketFactorId: marketIndex.id, marketName: marketIndex.marketName, marketApplied: marketIndex.applied } } });
    return snapshot;
  });
}
