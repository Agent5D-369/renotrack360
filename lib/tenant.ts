// Tenant resolution — resolves the correct organizationId for the current request.
// Currently single-tenant (always returns DEFAULT_ORG_ID).
// When TENANT_MODE=MULTI, reads from the authenticated session instead.
// All server actions should use getOrgId() instead of DEFAULT_ORG_ID directly.

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
