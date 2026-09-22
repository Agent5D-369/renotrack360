import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { prisma } from "../lib/prisma";
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
  weeklyReportInOrganization,
} from "../lib/company-scope";
import {
  assertActivityCompanyRelations,
  assertCompanyRelations,
  CompanyRelationError,
} from "../lib/company-relations";

const own = "company-scope-own";
const foreign = "company-scope-foreign";

const ownIds = {
  user: "company-scope-user",
  disabledUser: "company-scope-disabled-user",
  profile: "company-scope-profile",
  property: "company-scope-property",
  lead: "company-scope-lead",
  quote: "company-scope-quote",
  estimate: "company-scope-estimate",
  job: "company-scope-job",
  activity: "company-scope-activity",
  invoice: "company-scope-invoice",
  report: "company-scope-report",
  relationship: "company-scope-relationship",
  lineItem: "company-scope-line-item",
  followUp: "company-scope-follow-up",
  option: "company-scope-option",
  tag: "company-scope-tag",
  catalog: "company-scope-catalog",
};

const foreignIds = {
  user: "company-scope-foreign-user",
  profile: "company-scope-foreign-profile",
  property: "company-scope-foreign-property",
  lead: "company-scope-foreign-lead",
  quote: "company-scope-foreign-quote",
  estimate: "company-scope-foreign-estimate",
  job: "company-scope-foreign-job",
  activity: "company-scope-foreign-activity",
  invoice: "company-scope-foreign-invoice",
  tag: "company-scope-foreign-tag",
  catalog: "company-scope-foreign-catalog",
};

before(async () => {
  await prisma.organization.createMany({ data: [
    { id: own, name: "Company scope fixture" },
    { id: foreign, name: "Foreign company scope fixture" },
  ] });
  await prisma.user.createMany({ data: [
    { id: ownIds.user, email: "company-scope-owner@example.invalid", role: "OWNER", organizationId: own },
    { id: ownIds.disabledUser, email: "company-scope-disabled@example.invalid", role: "ADMIN", organizationId: own },
    { id: foreignIds.user, email: "company-scope-foreign@example.invalid", role: "OWNER", organizationId: foreign },
  ] });
  await prisma.membership.createMany({ data: [
    { userId: ownIds.user, organizationId: own, role: "OWNER", status: "ACTIVE" },
    { userId: ownIds.disabledUser, organizationId: own, role: "ADMIN", status: "DISABLED" },
    { userId: foreignIds.user, organizationId: foreign, role: "OWNER", status: "ACTIVE" },
  ] });
  await prisma.profile.createMany({ data: [
    { id: ownIds.profile, organizationId: own, profileName: "Owned profile", profileType: "HOMEOWNER" },
    { id: "company-scope-profile-secondary", organizationId: own, profileName: "Owned secondary profile", profileType: "OTHER" },
    { id: foreignIds.profile, organizationId: foreign, profileName: "Foreign profile", profileType: "HOMEOWNER" },
    { id: "company-scope-profile-link", organizationId: own, profileName: "Owned linked profile", profileType: "OTHER", companyProfileId: foreignIds.profile },
  ] });
  await prisma.property.createMany({ data: [
    { id: ownIds.property, organizationId: own, propertyAddress: "1 Own St", city: "Austin", state: "TX", zip: "78701", propertyType: "SINGLE_FAMILY_HOME" },
    { id: foreignIds.property, organizationId: foreign, propertyAddress: "2 Foreign St", city: "Austin", state: "TX", zip: "78702", propertyType: "SINGLE_FAMILY_HOME" },
    { id: "company-scope-property-mixed", organizationId: own, propertyAddress: "3 Mixed St", city: "Austin", state: "TX", zip: "78703", propertyType: "SINGLE_FAMILY_HOME", agentProfileId: foreignIds.profile },
  ] });
  await prisma.lead.createMany({ data: [
    { id: ownIds.lead, organizationId: own, leadName: "Owned lead", ownerUserId: ownIds.user, relatedProfileId: ownIds.profile, relatedPropertyId: ownIds.property },
    { id: foreignIds.lead, organizationId: foreign, leadName: "Foreign lead", relatedProfileId: foreignIds.profile, relatedPropertyId: foreignIds.property },
    { id: "company-scope-lead-mixed", organizationId: own, leadName: "Mixed lead", relatedProfileId: foreignIds.profile },
    { id: "company-scope-lead-disabled", organizationId: own, leadName: "Disabled owner lead", ownerUserId: ownIds.disabledUser },
  ] });
  await prisma.quote.createMany({ data: [
    { id: ownIds.quote, organizationId: own, quoteName: "Owned quote", clientProfileId: ownIds.profile, propertyId: ownIds.property, leadId: ownIds.lead },
    { id: foreignIds.quote, organizationId: foreign, quoteName: "Foreign quote", clientProfileId: foreignIds.profile, propertyId: foreignIds.property, leadId: foreignIds.lead },
    { id: "company-scope-quote-mixed", organizationId: own, quoteName: "Mixed quote", clientProfileId: foreignIds.profile },
  ] });
  await prisma.estimate.createMany({ data: [
    { id: ownIds.estimate, quoteId: ownIds.quote, estimateNumber: "CS-OWN", clientProfileId: ownIds.profile, propertyId: ownIds.property },
    { id: foreignIds.estimate, quoteId: foreignIds.quote, estimateNumber: "CS-FOREIGN", clientProfileId: foreignIds.profile, propertyId: foreignIds.property },
    { id: "company-scope-estimate-mixed", quoteId: ownIds.quote, estimateNumber: "CS-MIXED", clientProfileId: foreignIds.profile },
  ] });
  await prisma.job.createMany({ data: [
    { id: ownIds.job, organizationId: own, jobName: "Owned job", clientProfileId: ownIds.profile, propertyId: ownIds.property, approvedQuoteId: ownIds.quote },
    { id: foreignIds.job, organizationId: foreign, jobName: "Foreign job", clientProfileId: foreignIds.profile, propertyId: foreignIds.property, approvedQuoteId: foreignIds.quote },
    { id: "company-scope-job-mixed", organizationId: own, jobName: "Mixed job", approvedQuoteId: foreignIds.quote },
  ] });
  await prisma.invoice.createMany({ data: [
    { id: ownIds.invoice, invoiceNumber: "CS-INV-OWN", jobId: ownIds.job },
    { id: foreignIds.invoice, invoiceNumber: "CS-INV-FOREIGN", jobId: foreignIds.job },
    { id: "company-scope-invoice-mixed", invoiceNumber: "CS-INV-MIXED", jobId: ownIds.job, clientProfileId: foreignIds.profile },
  ] });
  await prisma.activity.createMany({ data: [
    { id: ownIds.activity, subject: "Owned activity", relatedProfileId: ownIds.profile, relatedJobId: ownIds.job },
    { id: foreignIds.activity, subject: "Foreign activity", relatedProfileId: foreignIds.profile },
    { id: "company-scope-activity-mixed", subject: "Mixed activity", relatedProfileId: ownIds.profile, relatedJobId: foreignIds.job },
    { id: "company-scope-activity-orphan", subject: "Ownerless activity" },
    { id: "company-scope-activity-invoice", subject: "Owned invoice activity", relatedInvoiceId: ownIds.invoice },
    { id: "company-scope-activity-invoice-mixed", subject: "Mixed invoice activity", relatedInvoiceId: "company-scope-invoice-mixed" },
  ] });
  await prisma.weeklyReport.create({ data: { id: ownIds.report, jobId: ownIds.job, weekEnding: new Date("2026-09-20"), workCompleted: "Fixture work" } });
  await prisma.serviceTag.createMany({ data: [
    { id: ownIds.tag, organizationId: own, name: "Owned tag" },
    { id: foreignIds.tag, organizationId: foreign, name: "Foreign tag" },
  ] });
  await prisma.profileServiceTag.create({ data: { profileId: ownIds.profile, serviceTagId: foreignIds.tag } });
  await prisma.costCatalogItem.createMany({ data: [
    { id: ownIds.catalog, organizationId: own, category: "Fixture", serviceName: "Owned catalog", unitType: "each", flipsideLowCost: 1, flipsideTargetCost: 2, flipsideHighCost: 3 },
    { id: foreignIds.catalog, organizationId: foreign, category: "Fixture", serviceName: "Foreign catalog", unitType: "each", flipsideLowCost: 1, flipsideTargetCost: 2, flipsideHighCost: 3 },
  ] });
  await prisma.profileRelationship.createMany({ data: [
    { id: ownIds.relationship, organizationId: own, fromProfileId: ownIds.profile, toProfileId: "company-scope-profile-secondary", relationshipType: "CLIENT" },
    { id: "company-scope-relationship-mixed", organizationId: own, fromProfileId: ownIds.profile, toProfileId: foreignIds.profile, relationshipType: "CLIENT" },
    { id: "company-scope-relationship-foreign-reverse", organizationId: foreign, fromProfileId: ownIds.profile, toProfileId: foreignIds.profile, relationshipType: "REFERRAL_PARTNER" },
  ] });
  await prisma.quoteLineItem.createMany({ data: [
    { id: ownIds.lineItem, quoteId: ownIds.quote, costCatalogItemId: ownIds.catalog, scopeArea: "Fixture", lineItemName: "Owned line", unitType: "each" },
    { id: "company-scope-line-mixed", quoteId: ownIds.quote, costCatalogItemId: foreignIds.catalog, scopeArea: "Fixture", lineItemName: "Mixed line", unitType: "each" },
  ] });
  await prisma.estimateFollowUp.createMany({ data: [
    { id: ownIds.followUp, estimateId: ownIds.estimate, relatedLeadId: ownIds.lead, followUpType: "CONFIRM_RECEIVED", dueDate: new Date("2026-09-21") },
    { id: "company-scope-follow-up-mixed", estimateId: ownIds.estimate, relatedLeadId: foreignIds.lead, followUpType: "CONFIRM_RECEIVED", dueDate: new Date("2026-09-21") },
  ] });
  await prisma.estimateOption.create({ data: { id: ownIds.option, estimateId: ownIds.estimate, optionName: "Owned option", optionTier: "Good" } });
  await prisma.lead.create({ data: { id: "company-scope-foreign-property-lead", organizationId: foreign, leadName: "Foreign property lead", relatedPropertyId: ownIds.property } });
  await prisma.quote.create({ data: { id: "company-scope-foreign-reverse-quote", organizationId: foreign, quoteName: "Foreign reverse quote", propertyId: ownIds.property, leadId: ownIds.lead } });
  await prisma.estimate.create({ data: { id: "company-scope-foreign-property-estimate", quoteId: foreignIds.quote, estimateNumber: "CS-FOREIGN-REVERSE", propertyId: ownIds.property } });
  await prisma.job.create({ data: { id: "company-scope-foreign-property-job", organizationId: foreign, jobName: "Foreign property job", propertyId: ownIds.property } });
  await prisma.estimateFollowUp.create({ data: { id: "company-scope-foreign-lead-follow-up", estimateId: foreignIds.estimate, relatedLeadId: ownIds.lead, followUpType: "NURTURE", dueDate: new Date("2026-09-22") } });
});

after(async () => { await prisma.$disconnect(); });

test("typed company predicates return only intact records for one company", async () => {
  assert.deepEqual((await prisma.user.findMany({ where: userInOrganization(own), select: { id: true } })).map(x => x.id), [ownIds.user]);
  assert.deepEqual((await prisma.profile.findMany({ where: profileInOrganization(own), orderBy: { id: "asc" }, select: { id: true } })).map(x => x.id), [ownIds.profile, "company-scope-profile-secondary"].sort());
  assert.deepEqual((await prisma.property.findMany({ where: propertyInOrganization(own), select: { id: true } })).map(x => x.id), [ownIds.property]);
  assert.deepEqual((await prisma.lead.findMany({ where: leadInOrganization(own), orderBy: { id: "asc" }, select: { id: true } })).map(x => x.id), ["company-scope-lead-disabled", ownIds.lead].sort());
  assert.deepEqual((await prisma.quote.findMany({ where: quoteInOrganization(own), select: { id: true } })).map(x => x.id), [ownIds.quote]);
  assert.deepEqual((await prisma.estimate.findMany({ where: estimateInOrganization(own), select: { id: true } })).map(x => x.id), [ownIds.estimate]);
  assert.deepEqual((await prisma.job.findMany({ where: jobInOrganization(own), select: { id: true } })).map(x => x.id), [ownIds.job]);
  assert.deepEqual((await prisma.activity.findMany({ where: activityInOrganization(own), orderBy: { id: "asc" }, select: { id: true } })).map(x => x.id), [ownIds.activity, "company-scope-activity-invoice"].sort());
  assert.equal(await prisma.weeklyReport.count({ where: weeklyReportInOrganization(own, { id: ownIds.report }) }), 1);
  assert.equal(await prisma.serviceTag.count({ where: serviceTagInOrganization(own, { id: ownIds.tag }) }), 1);
  assert.equal(await prisma.costCatalogItem.count({ where: costCatalogItemInOrganization(own, { id: ownIds.catalog }) }), 1);
});

test("scoped predicates compose caller filters and reject blank organizations", async () => {
  assert.equal(await prisma.profile.count({ where: profileInOrganization(own, { id: foreignIds.profile }) }), 0);
  assert.equal(await prisma.job.count({ where: jobInOrganization(own, { id: foreignIds.job }) }), 0);
  assert.throws(() => quoteInOrganization(" "), /verified organization/i);
});

test("owned roots remain identifiable for guarded deletion despite corrupt foreign reverse links", async () => {
  assert.equal(await prisma.profile.count({ where: profileInOrganization(own, { id: ownIds.profile }) }), 1);
  assert.equal(await prisma.property.count({ where: propertyInOrganization(own, { id: ownIds.property }) }), 1);
  assert.equal(await prisma.lead.count({ where: leadInOrganization(own, { id: ownIds.lead }) }), 1);
  assert.equal(await prisma.profileRelationship.count({ where: { fromProfileId: ownIds.profile, organizationId: foreign } }), 1);
  assert.equal(await prisma.profileServiceTag.count({ where: { profileId: ownIds.profile, serviceTag: { organizationId: foreign } } }), 1);
  assert.equal(await prisma.lead.count({ where: { relatedPropertyId: ownIds.property, organizationId: foreign } }), 1);
  assert.equal(await prisma.quote.count({ where: { OR: [{ propertyId: ownIds.property }, { leadId: ownIds.lead }], organizationId: foreign } }), 1);
  assert.equal(await prisma.job.count({ where: { propertyId: ownIds.property, organizationId: foreign } }), 1);
  assert.equal(await prisma.estimate.count({ where: { propertyId: ownIds.property, quote: { organizationId: foreign } } }), 1);
  assert.equal(await prisma.estimateFollowUp.count({ where: { relatedLeadId: ownIds.lead, estimate: { quote: { organizationId: foreign } } } }), 1);
});

test("batch relation assertion accepts complete owned graphs", async () => {
  await prisma.$transaction(tx => assertCompanyRelations(tx, own, {
    profiles: [ownIds.profile, null, ""], properties: [ownIds.property], leads: [ownIds.lead],
    quotes: [ownIds.quote], estimates: [ownIds.estimate], activities: [ownIds.activity], jobs: [ownIds.job],
    users: [ownIds.user, ownIds.user], profileRelationships: [ownIds.relationship], quoteLineItems: [ownIds.lineItem],
    estimateFollowUps: [ownIds.followUp], estimateOptions: [ownIds.option], serviceTags: [ownIds.tag], catalogItems: [ownIds.catalog],
  }));
});

test("batch relation assertion hides missing, foreign, disabled and corrupt records", async () => {
  const rejected = [
    { profiles: [foreignIds.profile] }, { properties: ["company-scope-property-mixed"] },
    { leads: ["company-scope-lead-mixed"] },
    { quotes: ["company-scope-quote-mixed"] }, { estimates: ["company-scope-estimate-mixed"] },
    { jobs: ["company-scope-job-mixed"] }, { activities: ["company-scope-activity-orphan"] },
    { users: [ownIds.disabledUser] }, { users: [foreignIds.user] },
    { profileRelationships: ["company-scope-relationship-mixed"] }, { quoteLineItems: ["company-scope-line-mixed"] },
    { estimateFollowUps: ["company-scope-follow-up-mixed"] }, { serviceTags: [foreignIds.tag] },
    { catalogItems: [foreignIds.catalog] }, { profiles: ["missing-company-scope-id"] },
  ];
  for (const refs of rejected) {
    await assert.rejects(() => prisma.$transaction(tx => assertCompanyRelations(tx, own, refs)), CompanyRelationError);
  }
  await assert.rejects(() => prisma.$transaction(tx => assertCompanyRelations(tx, " ", {})), CompanyRelationError);
  await assert.rejects(() => prisma.$transaction(tx => assertCompanyRelations(tx, own, { profiles: [` ${ownIds.profile}`] })), CompanyRelationError);
});

test("activity relation assertion requires an owner and checks every supplied parent", async () => {
  await prisma.$transaction(tx => assertActivityCompanyRelations(tx, own, { profileId: ownIds.profile, jobId: ownIds.job }));
  await prisma.$transaction(tx => assertActivityCompanyRelations(tx, own, { invoiceId: ownIds.invoice }));
  await assert.rejects(() => prisma.$transaction(tx => assertActivityCompanyRelations(tx, own, {})), CompanyRelationError);
  await assert.rejects(() => prisma.$transaction(tx => assertActivityCompanyRelations(tx, own, { profileId: ownIds.profile, jobId: foreignIds.job })), CompanyRelationError);
  await assert.rejects(() => prisma.$transaction(tx => assertActivityCompanyRelations(tx, own, { invoiceId: "company-scope-invoice-mixed" })), CompanyRelationError);
});
