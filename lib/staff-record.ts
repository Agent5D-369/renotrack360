import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";
import { hasStaffAccess } from "./staff-policy";

type StaffRecordDb = PrismaClient | Prisma.TransactionClient;

export async function findStaffRecord(db: StaffRecordDb, where: { id: string } | { email: string }) {
  const user = await db.user.findUnique({
    where,
    select: {
      id: true, email: true, name: true, organizationId: true, role: true, uiMode: true,
      memberships: { select: { userId: true, organizationId: true, role: true, status: true } },
    },
  });
  const membership = user?.memberships.find(value => value.organizationId === user.organizationId) ?? null;
  if (!hasStaffAccess(user, membership)) return null;
  return { id: user!.id, email: user!.email!, name: user!.name,
    organizationId: user!.organizationId!, role: membership!.role, uiMode: user!.uiMode };
}

export function findStaff(where: { id: string } | { email: string }) {
  return findStaffRecord(prisma, where);
}
