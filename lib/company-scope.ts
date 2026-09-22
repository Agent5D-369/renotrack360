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
  const id = verifiedOrganizationId(organizationId);
  return { AND: [
    { organizationId: id },
    { OR: [{ clientProfileId: null }, { clientProfile: { organizationId: id } }] },
    { OR: [{ propertyId: null }, { property: { organizationId: id } }] },
    { OR: [{ approvedQuoteId: null }, { approvedQuote: { organizationId: id } }] },
    where,
  ] };
}

export function weeklyReportInOrganization(
  organizationId: string,
  where: Prisma.WeeklyReportWhereInput = {},
): Prisma.WeeklyReportWhereInput {
  return { AND: [{ job: { organizationId: verifiedOrganizationId(organizationId) } }, where] };
}

export function userInOrganization(
  organizationId: string,
  where: Prisma.UserWhereInput = {},
): Prisma.UserWhereInput {
  const id = verifiedOrganizationId(organizationId);
  return { AND: [
    { organizationId: id },
    { memberships: { some: { organizationId: id, status: "ACTIVE" } } },
    where,
  ] };
}

export function profileInOrganization(
  organizationId: string,
  where: Prisma.ProfileWhereInput = {},
): Prisma.ProfileWhereInput {
  const id = verifiedOrganizationId(organizationId);
  return { AND: [
    { organizationId: id },
    { OR: [{ companyProfileId: null }, { companyProfile: { organizationId: id } }] },
    where,
  ] };
}

export function propertyInOrganization(
  organizationId: string,
  where: Prisma.PropertyWhereInput = {},
): Prisma.PropertyWhereInput {
  const id = verifiedOrganizationId(organizationId);
  return { AND: [
    { organizationId: id },
    { OR: [{ agentProfileId: null }, { agentProfile: { organizationId: id } }] },
    { OR: [{ investorProfileId: null }, { investorProfile: { organizationId: id } }] },
    where,
  ] };
}

export function leadInOrganization(
  organizationId: string,
  where: Prisma.LeadWhereInput = {},
): Prisma.LeadWhereInput {
  const id = verifiedOrganizationId(organizationId);
  return { AND: [
    { organizationId: id },
    { OR: [{ ownerUserId: null }, { owner: { organizationId: id } }] },
    { OR: [{ relatedProfileId: null }, { profile: { organizationId: id } }] },
    { OR: [{ relatedPropertyId: null }, { property: { organizationId: id } }] },
    where,
  ] };
}

export function quoteInOrganization(
  organizationId: string,
  where: Prisma.QuoteWhereInput = {},
): Prisma.QuoteWhereInput {
  const id = verifiedOrganizationId(organizationId);
  return { AND: [
    { organizationId: id },
    { OR: [{ clientProfileId: null }, { clientProfile: { organizationId: id } }] },
    { OR: [{ propertyId: null }, { property: { organizationId: id } }] },
    { OR: [{ leadId: null }, { lead: { organizationId: id } }] },
    where,
  ] };
}

export function estimateInOrganization(
  organizationId: string,
  where: Prisma.EstimateWhereInput = {},
): Prisma.EstimateWhereInput {
  const id = verifiedOrganizationId(organizationId);
  return { AND: [
    { quote: { organizationId: id } },
    { OR: [{ clientProfileId: null }, { clientProfile: { organizationId: id } }] },
    { OR: [{ propertyId: null }, { property: { organizationId: id } }] },
    where,
  ] };
}

function invoiceInOrganization(organizationId: string): Prisma.InvoiceWhereInput {
  const id = verifiedOrganizationId(organizationId);
  return { AND: [
    { OR: [{ job: { organizationId: id } }, { clientProfile: { organizationId: id } }] },
    { OR: [{ jobId: null }, { job: { organizationId: id } }] },
    { OR: [{ clientProfileId: null }, { clientProfile: { organizationId: id } }] },
  ] };
}

export function activityInOrganization(
  organizationId: string,
  where: Prisma.ActivityWhereInput = {},
): Prisma.ActivityWhereInput {
  const id = verifiedOrganizationId(organizationId);
  const invoice = invoiceInOrganization(id);
  return { AND: [
    { OR: [
      { profile: { organizationId: id } },
      { lead: { organizationId: id } },
      { property: { organizationId: id } },
      { quote: { organizationId: id } },
      { job: { organizationId: id } },
      { invoice },
    ] },
    { OR: [{ relatedProfileId: null }, { profile: { organizationId: id } }] },
    { OR: [{ relatedLeadId: null }, { lead: { organizationId: id } }] },
    { OR: [{ relatedPropertyId: null }, { property: { organizationId: id } }] },
    { OR: [{ relatedQuoteId: null }, { quote: { organizationId: id } }] },
    { OR: [{ relatedJobId: null }, { job: { organizationId: id } }] },
    { OR: [{ relatedInvoiceId: null }, { invoice }] },
    where,
  ] };
}

export function serviceTagInOrganization(
  organizationId: string,
  where: Prisma.ServiceTagWhereInput = {},
): Prisma.ServiceTagWhereInput {
  return { AND: [{ organizationId: verifiedOrganizationId(organizationId) }, where] };
}

export function costCatalogItemInOrganization(
  organizationId: string,
  where: Prisma.CostCatalogItemWhereInput = {},
): Prisma.CostCatalogItemWhereInput {
  return { AND: [{ organizationId: verifiedOrganizationId(organizationId) }, where] };
}
