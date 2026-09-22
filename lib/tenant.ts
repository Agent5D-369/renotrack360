// Legacy display/configuration helper. This is not an authorization boundary.
// Runtime record access must use the organization from requireStaff/requireStaffPage,
// which verifies current database membership. Do not use a session claim to authorize
// company data, and do not enable MULTI until the complete isolation gate passes.

import type { Session } from "next-auth";
import { DEFAULT_ORG_ID } from "@/lib/constants";

export type TenantMode = "DEMO" | "SINGLE" | "MULTI";

export function getTenantMode(): TenantMode {
  const mode = process.env.TENANT_MODE?.toUpperCase();
  if (mode === "DEMO") return "DEMO";
  if (mode === "MULTI") return "MULTI";
  return "SINGLE";
}

export function getOrgId(session?: Session | null): string {
  if (getTenantMode() === "MULTI") {
    const orgId = (session?.user as Record<string, unknown>)?.organizationId as string | undefined;
    if (!orgId) throw new Error("No organization found for this session. Multi-tenant mode requires an org.");
    return orgId;
  }
  // SINGLE and DEMO modes always use the default org
  return DEFAULT_ORG_ID;
}

export function isSuperAdmin(session?: Session | null): boolean {
  return Boolean((session?.user as Record<string, unknown>)?.isSuperAdmin);
}

export function isDemoMode(): boolean {
  return getTenantMode() === "DEMO";
}

export const DEMO_EMAIL = process.env.DEMO_USER_EMAIL ?? "demo@renotrack360.com";
