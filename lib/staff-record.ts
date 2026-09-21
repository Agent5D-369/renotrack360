import { prisma } from "./prisma";
import { DEFAULT_ORG_ID } from "./constants";
import { hasStaffAccess } from "./staff-policy";

export async function findStaff(where: { id: string } | { email: string }) {
  const user = await prisma.user.findUnique({
    where,
    select: {
      id: true, email: true, name: true, organizationId: true, role: true, uiMode: true,
      memberships: { where: { organizationId: DEFAULT_ORG_ID },
        select: { userId: true, organizationId: true, role: true, status: true } },
    },
  });
  const membership = user?.memberships[0] ?? null;
  if (!hasStaffAccess(user, membership)) return null;
  return { id: user!.id, email: user!.email!, name: user!.name,
    organizationId: DEFAULT_ORG_ID, role: membership!.role, uiMode: user!.uiMode };
}
