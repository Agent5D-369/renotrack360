import type { Prisma } from "@prisma/client";

function verifiedOrganizationId(organizationId: string): string {
  const value = organizationId.trim();
  if (!value) throw new Error("A verified organization is required.");
  return value;
}

export function jobInOrganization(
  organizationId: string,
  where: Prisma.JobWhereInput = {},
): Prisma.JobWhereInput {
  return { AND: [{ organizationId: verifiedOrganizationId(organizationId) }, where] };
}

export function weeklyReportInOrganization(
  organizationId: string,
  where: Prisma.WeeklyReportWhereInput = {},
): Prisma.WeeklyReportWhereInput {
  return { AND: [{ job: { organizationId: verifiedOrganizationId(organizationId) } }, where] };
}
