import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { prisma } from "../lib/prisma";
import {
  changeOrderInOrganization,
  estimateFollowUpInOrganization,
  feedbackRequestInOrganization,
  fieldReportInOrganization,
  financingInOrganization,
  invoiceInOrganization,
  jobPhotoInOrganization,
  meetingInOrganization,
  outstandingRequiredEvidenceInOrganization,
  paymentInOrganization,
  phaseInOrganization,
  selectionItemInOrganization,
  selectionSheetInOrganization,
  taskInOrganization,
  timeEntryInOrganization,
} from "../lib/delivery-scope";
import { assertDeliveryRelations, DeliveryRelationError } from "../lib/delivery-relations";

const own = "delivery-scope-own";
const foreign = "delivery-scope-foreign";
const ids = {
  ownProfile: "delivery-own-profile", foreignProfile: "delivery-foreign-profile",
  ownJob: "delivery-own-job", foreignJob: "delivery-foreign-job",
  ownPhase: "delivery-own-phase", foreignPhase: "delivery-foreign-phase",
  ownTask: "delivery-own-task", foreignTask: "delivery-foreign-task",
  ownReport: "delivery-own-report", foreignReport: "delivery-foreign-report",
  ownPhoto: "delivery-own-photo", ownMeeting: "delivery-own-meeting", ownTime: "delivery-own-time",
  ownChange: "delivery-own-change", ownInvoice: "delivery-own-invoice", ownPayment: "delivery-own-payment",
  ownFollowUp: "delivery-own-follow-up", ownSheet: "delivery-own-sheet", ownItem: "delivery-own-item",
  ownFeedback: "delivery-own-feedback", ownFinancing: "delivery-own-financing",
};

before(async () => {
  await prisma.organization.createMany({ data: [{ id: own, name: "Delivery fixture" }, { id: foreign, name: "Foreign delivery fixture" }] });
  await prisma.profile.createMany({ data: [
    { id: ids.ownProfile, organizationId: own, profileName: "Owned delivery profile", profileType: "HOMEOWNER" },
    { id: ids.foreignProfile, organizationId: foreign, profileName: "Foreign delivery profile", profileType: "HOMEOWNER" },
  ] });
  await prisma.property.createMany({ data: [
    { id: "delivery-own-property", organizationId: own, propertyAddress: "1 Delivery Way", city: "Austin", state: "TX", zip: "78701", propertyType: "SINGLE_FAMILY_HOME" },
    { id: "delivery-foreign-property", organizationId: foreign, propertyAddress: "2 Delivery Way", city: "Austin", state: "TX", zip: "78702", propertyType: "SINGLE_FAMILY_HOME" },
  ] });
  await prisma.lead.createMany({ data: [
    { id: "delivery-own-lead", organizationId: own, leadName: "Owned delivery lead", relatedProfileId: ids.ownProfile },
    { id: "delivery-foreign-lead", organizationId: foreign, leadName: "Foreign delivery lead", relatedProfileId: ids.foreignProfile },
  ] });
  await prisma.quote.createMany({ data: [
    { id: "delivery-own-quote", organizationId: own, quoteName: "Owned delivery quote", clientProfileId: ids.ownProfile, propertyId: "delivery-own-property" },
    { id: "delivery-foreign-quote", organizationId: foreign, quoteName: "Foreign delivery quote", clientProfileId: ids.foreignProfile, propertyId: "delivery-foreign-property" },
  ] });
  await prisma.estimate.createMany({ data: [
    { id: "delivery-own-estimate", quoteId: "delivery-own-quote", estimateNumber: "DELIVERY-OWN", clientProfileId: ids.ownProfile },
    { id: "delivery-foreign-estimate", quoteId: "delivery-foreign-quote", estimateNumber: "DELIVERY-FOREIGN", clientProfileId: ids.foreignProfile },
  ] });
  await prisma.job.createMany({ data: [
    { id: ids.ownJob, organizationId: own, jobName: "Owned delivery job", clientProfileId: ids.ownProfile },
    { id: ids.foreignJob, organizationId: foreign, jobName: "Foreign delivery job", clientProfileId: ids.foreignProfile },
  ] });
  await prisma.renovationPhase.createMany({ data: [
    { id: ids.ownPhase, jobId: ids.ownJob, phaseNumber: 1, phaseName: "Owned phase" },
    { id: ids.foreignPhase, jobId: ids.foreignJob, phaseNumber: 1, phaseName: "Foreign phase" },
  ] });
  await prisma.task.createMany({ data: [
    { id: ids.ownTask, taskName: "Owned task", jobId: ids.ownJob, phaseId: ids.ownPhase, assignedToProfileId: ids.ownProfile },
    { id: ids.foreignTask, taskName: "Foreign task", jobId: ids.foreignJob, phaseId: ids.foreignPhase, assignedToProfileId: ids.foreignProfile },
    { id: "delivery-task-mixed-phase", taskName: "Mixed phase task", jobId: ids.ownJob, phaseId: ids.foreignPhase },
    { id: "delivery-task-mixed-assignee", taskName: "Mixed assignee task", jobId: ids.ownJob, assignedToProfileId: ids.foreignProfile },
  ] });
  await prisma.fieldReport.createMany({ data: [
    { id: ids.ownReport, jobId: ids.ownJob, crewSummary: "Owned crew", workCompleted: "Owned work" },
    { id: ids.foreignReport, jobId: ids.foreignJob, crewSummary: "Foreign crew", workCompleted: "Foreign work" },
  ] });
  await prisma.jobPhoto.createMany({ data: [
    { id: ids.ownPhoto, jobId: ids.ownJob, url: "https://example.invalid/own.jpg" },
    { id: "delivery-foreign-photo", jobId: ids.foreignJob, url: "https://example.invalid/foreign.jpg" },
  ] });
  await prisma.meeting.createMany({ data: [
    { id: ids.ownMeeting, jobId: ids.ownJob, title: "Owned meeting", meetingType: "SITE", scheduledAt: new Date("2026-09-22") },
    { id: "delivery-foreign-meeting", jobId: ids.foreignJob, title: "Foreign meeting", meetingType: "SITE", scheduledAt: new Date("2026-09-22") },
    { id: "delivery-orphan-meeting", title: "Ownerless meeting", meetingType: "SITE", scheduledAt: new Date("2026-09-22") },
  ] });
  await prisma.timeEntry.createMany({ data: [
    { id: ids.ownTime, jobId: ids.ownJob, profileId: ids.ownProfile, workDate: new Date("2026-09-22"), hours: 1, laborType: "FIELD" },
    { id: "delivery-time-mixed", jobId: ids.ownJob, profileId: ids.foreignProfile, workDate: new Date("2026-09-22"), hours: 1, laborType: "FIELD" },
  ] });
  await prisma.changeOrder.createMany({ data: [
    { id: ids.ownChange, jobId: ids.ownJob, clientProfileId: ids.ownProfile, changeOrderTitle: "Owned change" },
    { id: "delivery-change-mixed", jobId: ids.ownJob, clientProfileId: ids.foreignProfile, changeOrderTitle: "Mixed change" },
  ] });
  await prisma.invoice.createMany({ data: [
    { id: ids.ownInvoice, invoiceNumber: "DELIVERY-INV-OWN", jobId: ids.ownJob, clientProfileId: ids.ownProfile },
    { id: "delivery-foreign-invoice", invoiceNumber: "DELIVERY-INV-FOREIGN", jobId: ids.foreignJob },
    { id: "delivery-mixed-invoice", invoiceNumber: "DELIVERY-INV-MIXED", jobId: ids.ownJob, clientProfileId: ids.foreignProfile },
    { id: "delivery-orphan-invoice", invoiceNumber: "DELIVERY-INV-ORPHAN" },
  ] });
  await prisma.payment.createMany({ data: [
    { id: ids.ownPayment, invoiceId: ids.ownInvoice, clientProfileId: ids.ownProfile, amount: 10 },
    { id: "delivery-payment-mixed", invoiceId: ids.ownInvoice, clientProfileId: ids.foreignProfile, amount: 10 },
  ] });
  await prisma.estimateFollowUp.createMany({ data: [
    { id: ids.ownFollowUp, estimateId: "delivery-own-estimate", relatedLeadId: "delivery-own-lead", followUpType: "CONFIRM_RECEIVED", dueDate: new Date("2026-09-23") },
    { id: "delivery-follow-up-mixed", estimateId: "delivery-own-estimate", relatedLeadId: "delivery-foreign-lead", followUpType: "CONFIRM_RECEIVED", dueDate: new Date("2026-09-23") },
  ] });
  await prisma.selectionSheet.createMany({ data: [
    { id: ids.ownSheet, jobId: ids.ownJob, estimateId: "delivery-own-estimate", clientProfileId: ids.ownProfile, sheetName: "Owned selections" },
    { id: "delivery-sheet-mixed", jobId: ids.ownJob, estimateId: "delivery-foreign-estimate", sheetName: "Mixed selections" },
  ] });
  await prisma.selectionItem.createMany({ data: [
    { id: ids.ownItem, selectionSheetId: ids.ownSheet, category: "Fixture", itemName: "Owned selection" },
    { id: "delivery-item-mixed", selectionSheetId: "delivery-sheet-mixed", category: "Fixture", itemName: "Mixed selection" },
  ] });
  await prisma.feedbackRequest.createMany({ data: [
    { id: ids.ownFeedback, jobId: ids.ownJob, profileId: ids.ownProfile, requestType: "CLOSEOUT" },
    { id: "delivery-feedback-mixed", jobId: ids.ownJob, profileId: ids.foreignProfile, requestType: "CLOSEOUT" },
    { id: "delivery-feedback-orphan", requestType: "CLOSEOUT" },
  ] });
  await prisma.financing.createMany({ data: [
    { id: ids.ownFinancing, jobId: ids.ownJob, clientProfileId: ids.ownProfile },
    { id: "delivery-financing-mixed", jobId: ids.ownJob, clientProfileId: ids.foreignProfile },
  ] });

  const ownTemplate = await prisma.checklistTemplate.create({ data: { id: "delivery-own-template", organizationId: own, templateName: "Owned proof", entityType: "JOB", category: "FIELD" } });
  await prisma.checklistTemplate.create({ data: { id: "delivery-foreign-template", organizationId: foreign, templateName: "Foreign proof", entityType: "JOB", category: "FIELD" } });
  const proof = async (id: string, entityType: "JOB" | "CLOSEOUT" | "PHASE" | "TASK" | "FIELD_REPORT" | "LEAD", entityId: string, evidenceEntityType = entityType, evidenceEntityId = entityId, templateId = ownTemplate.id) => {
    const run = await prisma.checklistRun.create({ data: { id: `${id}-run`, templateId, entityType, entityId, title: id } });
    const item = await prisma.checklistRunItem.create({ data: { id: `${id}-item`, runId: run.id, itemText: id, evidenceRequired: true } });
    await prisma.requiredEvidence.create({ data: { id, runItemId: item.id, entityType: evidenceEntityType, entityId: evidenceEntityId, evidenceType: "PHOTO", label: id } });
  };
  await proof("delivery-proof-job", "JOB", ids.ownJob);
  await proof("delivery-proof-closeout", "CLOSEOUT", ids.ownJob);
  await proof("delivery-proof-phase", "PHASE", ids.ownPhase);
  await proof("delivery-proof-task", "TASK", ids.ownTask);
  await proof("delivery-proof-report", "FIELD_REPORT", ids.ownReport);
  await proof("delivery-proof-foreign-target", "JOB", ids.foreignJob);
  await proof("delivery-proof-mismatch", "TASK", ids.ownTask, "TASK", ids.foreignTask);
  await proof("delivery-proof-unsupported", "LEAD", "delivery-own-lead");
  await proof("delivery-proof-foreign-template", "JOB", ids.foreignJob, "JOB", ids.foreignJob, "delivery-foreign-template");
  await prisma.requiredEvidence.create({ data: { id: "delivery-proof-orphan", entityType: "JOB", entityId: ids.ownJob, evidenceType: "PHOTO", label: "Orphan proof" } });
});

after(async () => { await prisma.$disconnect(); });

test("delivery predicates retain owned roots and exclude foreign or corrupt optional relations", async () => {
  assert.deepEqual((await prisma.task.findMany({ where: taskInOrganization(own), select: { id: true } })).map(x => x.id), [ids.ownTask]);
  assert.deepEqual((await prisma.renovationPhase.findMany({ where: phaseInOrganization(own), select: { id: true } })).map(x => x.id), [ids.ownPhase]);
  assert.deepEqual((await prisma.fieldReport.findMany({ where: fieldReportInOrganization(own), select: { id: true } })).map(x => x.id), [ids.ownReport]);
  assert.deepEqual((await prisma.jobPhoto.findMany({ where: jobPhotoInOrganization(own), select: { id: true } })).map(x => x.id), [ids.ownPhoto]);
  assert.deepEqual((await prisma.meeting.findMany({ where: meetingInOrganization(own), select: { id: true } })).map(x => x.id), [ids.ownMeeting]);
  assert.deepEqual((await prisma.timeEntry.findMany({ where: timeEntryInOrganization(own), select: { id: true } })).map(x => x.id), [ids.ownTime]);
});

test("financial, selection and feedback predicates require one owned parent and agreement of every present parent", async () => {
  assert.deepEqual((await prisma.changeOrder.findMany({ where: changeOrderInOrganization(own), select: { id: true } })).map(x => x.id), [ids.ownChange]);
  assert.deepEqual((await prisma.invoice.findMany({ where: invoiceInOrganization(own), select: { id: true } })).map(x => x.id), [ids.ownInvoice]);
  assert.deepEqual((await prisma.payment.findMany({ where: paymentInOrganization(own), select: { id: true } })).map(x => x.id), [ids.ownPayment]);
  assert.deepEqual((await prisma.estimateFollowUp.findMany({ where: estimateFollowUpInOrganization(own), select: { id: true } })).map(x => x.id), [ids.ownFollowUp]);
  assert.deepEqual((await prisma.selectionSheet.findMany({ where: selectionSheetInOrganization(own), select: { id: true } })).map(x => x.id), [ids.ownSheet]);
  assert.deepEqual((await prisma.selectionItem.findMany({ where: selectionItemInOrganization(own), select: { id: true } })).map(x => x.id), [ids.ownItem]);
  assert.deepEqual((await prisma.feedbackRequest.findMany({ where: feedbackRequestInOrganization(own), select: { id: true } })).map(x => x.id), [ids.ownFeedback]);
  assert.deepEqual((await prisma.financing.findMany({ where: financingInOrganization(own), select: { id: true } })).map(x => x.id), [ids.ownFinancing]);
});

test("predicates compose caller filters and reject unverified organization identifiers", async () => {
  assert.equal(await prisma.task.count({ where: taskInOrganization(own, { id: ids.foreignTask }) }), 0);
  assert.equal(await prisma.invoice.count({ where: invoiceInOrganization(own, { id: ids.ownInvoice, status: "DRAFT" }) }), 1);
  assert.throws(() => taskInOrganization(" "), /verified organization/i);
  assert.throws(() => invoiceInOrganization(` ${own}`), /verified organization/i);
});

test("delivery relation assertion accepts complete owned references and ignores empty optional IDs", async () => {
  await prisma.$transaction(tx => assertDeliveryRelations(tx, own, {
    tasks: [ids.ownTask, ids.ownTask, null, ""], phases: [ids.ownPhase], fieldReports: [ids.ownReport],
    jobPhotos: [ids.ownPhoto], meetings: [ids.ownMeeting], timeEntries: [ids.ownTime], changeOrders: [ids.ownChange],
    invoices: [ids.ownInvoice], payments: [ids.ownPayment], estimateFollowUps: [ids.ownFollowUp],
    selectionSheets: [ids.ownSheet], selectionItems: [ids.ownItem], feedbackRequests: [ids.ownFeedback], financings: [ids.ownFinancing],
  }));
});

test("delivery relation assertion rejects foreign, corrupt, missing and whitespace references", async () => {
  const rejected = [
    { tasks: [ids.foreignTask] }, { tasks: ["delivery-task-mixed-phase"] }, { meetings: ["delivery-orphan-meeting"] },
    { timeEntries: ["delivery-time-mixed"] }, { changeOrders: ["delivery-change-mixed"] }, { invoices: ["delivery-mixed-invoice"] },
    { invoices: ["delivery-orphan-invoice"] }, { payments: ["delivery-payment-mixed"] }, { estimateFollowUps: ["delivery-follow-up-mixed"] },
    { selectionItems: ["delivery-item-mixed"] }, { feedbackRequests: ["delivery-feedback-orphan"] }, { financings: ["missing-delivery"] },
  ];
  for (const refs of rejected) await assert.rejects(() => prisma.$transaction(tx => assertDeliveryRelations(tx, own, refs)), DeliveryRelationError);
  await assert.rejects(() => prisma.$transaction(tx => assertDeliveryRelations(tx, " ", {})), DeliveryRelationError);
  await assert.rejects(() => prisma.$transaction(tx => assertDeliveryRelations(tx, own, { tasks: [` ${ids.ownTask}`] })), DeliveryRelationError);
});

test("required evidence resolver returns only matching supported targets owned by the company", async () => {
  const evidence = await outstandingRequiredEvidenceInOrganization(prisma, own, 25);
  assert.deepEqual(evidence.map(item => item.id).sort(), [
    "delivery-proof-closeout", "delivery-proof-job", "delivery-proof-phase", "delivery-proof-report", "delivery-proof-task",
  ]);
  assert.ok((await outstandingRequiredEvidenceInOrganization(prisma, own, 2)).length <= 2);
});
