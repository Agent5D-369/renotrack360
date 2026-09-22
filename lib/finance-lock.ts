import type { Prisma } from "@prisma/client";
import { hasStaffAccess } from "./staff-policy";

export class FinancialRecordError extends Error {}
export async function lockOrganizationFinance(tx: Prisma.TransactionClient, organizationId: string) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${organizationId + ":invoice-ledger"}, 0))::text`;
}
export async function financeActor(tx: Prisma.TransactionClient, actorId: string, ownerOnly = false) {
  const user = await tx.user.findUnique({ where: { id: actorId }, include: { memberships: true } });
  const member = user?.memberships.find(value => value.organizationId === user.organizationId);
  if (!hasStaffAccess(user, member ?? null)) throw new FinancialRecordError("Staff access denied.");
  if (ownerOnly && (user!.role !== "OWNER" || member!.role !== "OWNER")) throw new FinancialRecordError("The current owner must review this financial baseline.");
  const organizationId = user!.organizationId!;
  await lockOrganizationFinance(tx, organizationId);
  return organizationId;
}
