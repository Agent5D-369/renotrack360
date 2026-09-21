import { DEFAULT_ORG_ID } from "./constants";

type StaffUser = { id: string; email: string | null; organizationId: string | null; role: string };
type StaffMembership = { userId: string; organizationId: string; role: string; status: string };
const managementRoles = new Set(["OWNER", "ADMIN"]);

/** Membership is the authority. A user row or a previously issued JWT is not a grant. */
export function hasStaffAccess(user: StaffUser | null, membership: StaffMembership | null,
  env: Readonly<Record<string, string | undefined>> = process.env): boolean {
  if (!user || !membership || !user.email) return false;
  const demoEmails = ["demo@renotrack360.com", env.DEMO_USER_EMAIL?.toLowerCase()].filter(Boolean);
  if (demoEmails.includes(user.email.toLowerCase())) return false;
  return user.organizationId === DEFAULT_ORG_ID
    && membership.organizationId === DEFAULT_ORG_ID
    && membership.userId === user.id
    && membership.status === "ACTIVE"
    && managementRoles.has(user.role)
    && managementRoles.has(membership.role);
}
