import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { z } from "zod";
import { calculateGrossMargin, pricingInputSchema, PRICING_POLICY } from "./gross-margin";
import { hasStaffAccess } from "./staff-policy";

export class PricingError extends Error {}
export async function savePriceSnapshot(db: PrismaClient, actorId: string, requestId: string, raw: unknown) {
  if (!z.string().uuid().safeParse(requestId).success) throw new PricingError("Invalid pricing request. Reload the form.");
  const parsed = pricingInputSchema.safeParse(raw);
  if (!parsed.success) throw new PricingError(parsed.error.issues[0].message);
  const input = parsed.data;
  let totals: ReturnType<typeof calculateGrossMargin>;
  try { totals = calculateGrossMargin(input); } catch (error) { throw new PricingError((error as Error).message); }
  const inputDigest = createHash("sha256").update(JSON.stringify({ policy: PRICING_POLICY, input })).digest("hex");
  return db.$transaction(async tx => {
    const user = await tx.user.findUnique({ where: { id: actorId }, include: { memberships: true } });
    const member = user?.memberships.find(value => value.organizationId === user.organizationId);
    if (!hasStaffAccess(user, member ?? null)) throw new PricingError("Staff access denied.");
    const exception = Number(input.targetMarginPercent) < 35;
    if (exception && (member!.role !== "OWNER" || user!.role !== "OWNER" || !input.ownerApproval || input.ownerExceptionReason.length < 10)) {
      throw new PricingError("Below 35% gross margin requires owner approval and a specific exception reason.");
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
      policyVersion: PRICING_POLICY, inputs: input, ...totals,
      ownerExceptionReason: exception ? input.ownerExceptionReason : null, ownerApprovedById: exception ? actorId : null,
    } });
    await tx.auditEvent.create({ data: { organizationId: user!.organizationId!, actorUserId: actorId,
      action: "PRICE_SCENARIO_SAVED", entityType: "PriceSnapshot", entityId: snapshot.id,
      metadata: { inputDigest, policyVersion: PRICING_POLICY, ownerException: exception } } });
    return snapshot;
  });
}
