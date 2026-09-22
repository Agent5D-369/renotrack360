import type { Prisma } from "@prisma/client";
import {
  activityInOrganization,
  costCatalogItemInOrganization,
  estimateInOrganization,
  jobInOrganization,
  leadInOrganization,
  profileInOrganization,
  propertyInOrganization,
  quoteInOrganization,
  serviceTagInOrganization,
  userInOrganization,
} from "./company-scope";

export type NullableCompanyId = string | null | undefined;

export type CompanyRelationRefs = {
  profiles?: readonly NullableCompanyId[];
  properties?: readonly NullableCompanyId[];
  leads?: readonly NullableCompanyId[];
  quotes?: readonly NullableCompanyId[];
  estimates?: readonly NullableCompanyId[];
  activities?: readonly NullableCompanyId[];
  jobs?: readonly NullableCompanyId[];
  users?: readonly NullableCompanyId[];
  profileRelationships?: readonly NullableCompanyId[];
  quoteLineItems?: readonly NullableCompanyId[];
  estimateFollowUps?: readonly NullableCompanyId[];
  estimateOptions?: readonly NullableCompanyId[];
  serviceTags?: readonly NullableCompanyId[];
  catalogItems?: readonly NullableCompanyId[];
};

export type ActivityCompanyRelationRefs = {
  profileId?: NullableCompanyId;
  leadId?: NullableCompanyId;
  propertyId?: NullableCompanyId;
  quoteId?: NullableCompanyId;
  jobId?: NullableCompanyId;
  invoiceId?: NullableCompanyId;
};

export class CompanyRelationError extends Error {
  readonly status = 404;

  constructor() {
    super("A related record was not found.");
  }
}

function ids(values: readonly NullableCompanyId[] | undefined): string[] {
  const result: string[] = [];
  for (const value of values ?? []) {
    if (value === null || value === undefined || value === "") continue;
    if (value.trim() !== value || !value) throw new CompanyRelationError();
    result.push(value);
  }
  return [...new Set(result)];
}

async function exactCount(values: string[], count: () => Promise<number>) {
  if (values.length && await count() !== values.length) throw new CompanyRelationError();
}

export async function assertCompanyRelations(
  tx: Prisma.TransactionClient,
  organizationId: string,
  refs: CompanyRelationRefs,
): Promise<void> {
  if (!organizationId || organizationId.trim() !== organizationId) throw new CompanyRelationError();
  const profiles = ids(refs.profiles);
  const properties = ids(refs.properties);
  const leads = ids(refs.leads);
  const quotes = ids(refs.quotes);
  const estimates = ids(refs.estimates);
  const activities = ids(refs.activities);
  const jobs = ids(refs.jobs);
  const users = ids(refs.users);
  const profileRelationships = ids(refs.profileRelationships);
  const quoteLineItems = ids(refs.quoteLineItems);
  const estimateFollowUps = ids(refs.estimateFollowUps);
  const estimateOptions = ids(refs.estimateOptions);
  const serviceTags = ids(refs.serviceTags);
  const catalogItems = ids(refs.catalogItems);

  await exactCount(profiles, () => tx.profile.count({ where: profileInOrganization(organizationId, { id: { in: profiles } }) }));
  await exactCount(properties, () => tx.property.count({ where: propertyInOrganization(organizationId, { id: { in: properties } }) }));
  await exactCount(leads, () => tx.lead.count({ where: leadInOrganization(organizationId, { id: { in: leads } }) }));
  await exactCount(quotes, () => tx.quote.count({ where: quoteInOrganization(organizationId, { id: { in: quotes } }) }));
  await exactCount(estimates, () => tx.estimate.count({ where: estimateInOrganization(organizationId, { id: { in: estimates } }) }));
  await exactCount(activities, () => tx.activity.count({ where: activityInOrganization(organizationId, { id: { in: activities } }) }));
  await exactCount(jobs, () => tx.job.count({ where: jobInOrganization(organizationId, { id: { in: jobs } }) }));
  await exactCount(users, () => tx.user.count({ where: userInOrganization(organizationId, { id: { in: users } }) }));
  await exactCount(profileRelationships, () => tx.profileRelationship.count({ where: { AND: [
    { id: { in: profileRelationships } },
    { organizationId },
    { fromProfile: profileInOrganization(organizationId) },
    { toProfile: profileInOrganization(organizationId) },
  ] } }));
  await exactCount(quoteLineItems, () => tx.quoteLineItem.count({ where: { AND: [
    { id: { in: quoteLineItems } },
    { quote: quoteInOrganization(organizationId) },
    { OR: [{ costCatalogItemId: null }, { costCatalogItem: { organizationId } }] },
  ] } }));
  await exactCount(estimateFollowUps, () => tx.estimateFollowUp.count({ where: { AND: [
    { id: { in: estimateFollowUps } },
    { estimate: estimateInOrganization(organizationId) },
    { OR: [{ relatedLeadId: null }, { lead: { organizationId } }] },
  ] } }));
  await exactCount(estimateOptions, () => tx.estimateOption.count({ where: {
    id: { in: estimateOptions }, estimate: estimateInOrganization(organizationId),
  } }));
  await exactCount(serviceTags, () => tx.serviceTag.count({ where: serviceTagInOrganization(organizationId, { id: { in: serviceTags } }) }));
  await exactCount(catalogItems, () => tx.costCatalogItem.count({ where: costCatalogItemInOrganization(organizationId, { id: { in: catalogItems } }) }));
}

export async function assertActivityCompanyRelations(
  tx: Prisma.TransactionClient,
  organizationId: string,
  refs: ActivityCompanyRelationRefs,
): Promise<void> {
  const profileId = ids([refs.profileId]);
  const leadId = ids([refs.leadId]);
  const propertyId = ids([refs.propertyId]);
  const quoteId = ids([refs.quoteId]);
  const jobId = ids([refs.jobId]);
  const invoiceId = ids([refs.invoiceId]);
  if (![profileId, leadId, propertyId, quoteId, jobId, invoiceId].some(value => value.length)) {
    throw new CompanyRelationError();
  }
  await assertCompanyRelations(tx, organizationId, {
    profiles: profileId,
    leads: leadId,
    properties: propertyId,
    quotes: quoteId,
    jobs: jobId,
  });
  await exactCount(invoiceId, () => tx.invoice.count({ where: { AND: [
    { id: { in: invoiceId } },
    { OR: [{ job: { organizationId } }, { clientProfile: { organizationId } }] },
    { OR: [{ jobId: null }, { job: { organizationId } }] },
    { OR: [{ clientProfileId: null }, { clientProfile: { organizationId } }] },
  ] } }));
}
