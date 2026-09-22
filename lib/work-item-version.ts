import { PrismaClient } from "@prisma/client";
import { hasStaffAccess } from "./staff-policy";
import { showerPilot, workItemDigest } from "./work-item-pilot";

export class WorkItemError extends Error {}
export async function adoptShowerPilot(db: PrismaClient, actorId: string, reviewedDigest: string) {
  const digest = workItemDigest(showerPilot);
  if (reviewedDigest !== digest) throw new WorkItemError("The template changed. Reload and review the current version.");
  return db.$transaction(async tx => {
    const user = await tx.user.findUnique({ where: { id: actorId }, include: { memberships: true } });
    const member = user?.memberships.find(value => value.organizationId === user.organizationId);
    if (!hasStaffAccess(user, member ?? null)) throw new WorkItemError("Staff access denied.");
    const organizationId = user!.organizationId!;
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${organizationId + ":work-item:" + showerPilot.templateCode}, 0))::text`;
    const existing = await tx.workItemVersion.findUnique({ where: { organizationId_templateCode_contentDigest: { organizationId, templateCode: showerPilot.templateCode, contentDigest: digest } } });
    if (existing) return existing;
    const previous = await tx.workItemVersion.findFirst({ where: { organizationId, templateCode: showerPilot.templateCode }, orderBy: { revision: "desc" } });
    const version = await tx.workItemVersion.create({ data: { organizationId, templateCode: showerPilot.templateCode,
      revision: (previous?.revision ?? 0) + 1, name: showerPilot.name, contentDigest: digest, content: showerPilot, adoptedById: actorId } });
    await tx.auditEvent.create({ data: { organizationId, actorUserId: actorId, action: "WORK_ITEM_ADOPTED", entityType: "WorkItemVersion", entityId: version.id,
      metadata: { contentDigest: digest, edition: showerPilot.edition, manufacturerEdition: showerPilot.source.edition, purpose: "INTERNAL_PLANNING" } } });
    return version;
  });
}
