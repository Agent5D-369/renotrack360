import type { Prisma, PrismaClient, RequiredEvidence } from "@prisma/client";
import { estimateInOrganization, jobInOrganization } from "./company-scope";

function verifiedOrganizationId(organizationId: string): string {
  const value = organizationId.trim();
  if (!value || value !== organizationId) throw new Error("A verified organization is required.");
  return value;
}

export function phaseInOrganization(
  organizationId: string,
  where: Prisma.RenovationPhaseWhereInput = {},
): Prisma.RenovationPhaseWhereInput {
  return { AND: [{ job: jobInOrganization(verifiedOrganizationId(organizationId)) }, where] };
}

export function taskInOrganization(
  organizationId: string,
  where: Prisma.TaskWhereInput = {},
): Prisma.TaskWhereInput {
  const id = verifiedOrganizationId(organizationId);
  return { AND: [
    { job: jobInOrganization(id) },
    { OR: [{ phaseId: null }, { phase: phaseInOrganization(id) }] },
    { OR: [{ assignedToProfileId: null }, { assignedToProfile: { organizationId: id } }] },
    where,
  ] };
}

export function fieldReportInOrganization(
  organizationId: string,
  where: Prisma.FieldReportWhereInput = {},
): Prisma.FieldReportWhereInput {
  return { AND: [{ job: jobInOrganization(verifiedOrganizationId(organizationId)) }, where] };
}

export function jobPhotoInOrganization(
  organizationId: string,
  where: Prisma.JobPhotoWhereInput = {},
): Prisma.JobPhotoWhereInput {
  return { AND: [{ job: jobInOrganization(verifiedOrganizationId(organizationId)) }, where] };
}

export function meetingInOrganization(
  organizationId: string,
  where: Prisma.MeetingWhereInput = {},
): Prisma.MeetingWhereInput {
  const id = verifiedOrganizationId(organizationId);
  return { AND: [{ jobId: { not: null } }, { job: jobInOrganization(id) }, where] };
}

export function timeEntryInOrganization(
  organizationId: string,
  where: Prisma.TimeEntryWhereInput = {},
): Prisma.TimeEntryWhereInput {
  const id = verifiedOrganizationId(organizationId);
  return { AND: [
    { job: jobInOrganization(id) },
    { OR: [{ profileId: null }, { profile: { organizationId: id } }] },
    where,
  ] };
}

export function changeOrderInOrganization(
  organizationId: string,
  where: Prisma.ChangeOrderWhereInput = {},
): Prisma.ChangeOrderWhereInput {
  const id = verifiedOrganizationId(organizationId);
  return { AND: [
    { job: jobInOrganization(id) },
    { OR: [{ clientProfileId: null }, { clientProfile: { organizationId: id } }] },
    { OR: [{ priceSnapshotId: null }, { priceSnapshot: { organizationId: id } }] },
    { OR: [{ sourceActivityId: null }, { sourceActivity: { job: jobInOrganization(id) } }] },
    where,
  ] };
}

export function invoiceInOrganization(
  organizationId: string,
  where: Prisma.InvoiceWhereInput = {},
): Prisma.InvoiceWhereInput {
  const id = verifiedOrganizationId(organizationId);
  return { AND: [
    { OR: [{ job: jobInOrganization(id) }, { clientProfile: { organizationId: id } }] },
    { OR: [{ jobId: null }, { job: jobInOrganization(id) }] },
    { OR: [{ clientProfileId: null }, { clientProfile: { organizationId: id } }] },
    where,
  ] };
}

export function paymentInOrganization(
  organizationId: string,
  where: Prisma.PaymentWhereInput = {},
): Prisma.PaymentWhereInput {
  const id = verifiedOrganizationId(organizationId);
  return { AND: [
    { invoice: invoiceInOrganization(id) },
    { OR: [{ clientProfileId: null }, { clientProfile: { organizationId: id } }] },
    where,
  ] };
}

export function estimateFollowUpInOrganization(
  organizationId: string,
  where: Prisma.EstimateFollowUpWhereInput = {},
): Prisma.EstimateFollowUpWhereInput {
  const id = verifiedOrganizationId(organizationId);
  return { AND: [
    { estimate: estimateInOrganization(id) },
    { OR: [{ relatedLeadId: null }, { lead: { organizationId: id } }] },
    where,
  ] };
}

export function selectionSheetInOrganization(
  organizationId: string,
  where: Prisma.SelectionSheetWhereInput = {},
): Prisma.SelectionSheetWhereInput {
  const id = verifiedOrganizationId(organizationId);
  return { AND: [
    { job: jobInOrganization(id) },
    { OR: [{ estimateId: null }, { estimate: estimateInOrganization(id) }] },
    { OR: [{ clientProfileId: null }, { clientProfile: { organizationId: id } }] },
    where,
  ] };
}

export function selectionItemInOrganization(
  organizationId: string,
  where: Prisma.SelectionItemWhereInput = {},
): Prisma.SelectionItemWhereInput {
  return { AND: [{ selectionSheet: selectionSheetInOrganization(verifiedOrganizationId(organizationId)) }, where] };
}

export function feedbackRequestInOrganization(
  organizationId: string,
  where: Prisma.FeedbackRequestWhereInput = {},
): Prisma.FeedbackRequestWhereInput {
  const id = verifiedOrganizationId(organizationId);
  return { AND: [
    { OR: [{ job: jobInOrganization(id) }, { profile: { organizationId: id } }] },
    { OR: [{ jobId: null }, { job: jobInOrganization(id) }] },
    { OR: [{ profileId: null }, { profile: { organizationId: id } }] },
    where,
  ] };
}

export function financingInOrganization(
  organizationId: string,
  where: Prisma.FinancingWhereInput = {},
): Prisma.FinancingWhereInput {
  const id = verifiedOrganizationId(organizationId);
  return { AND: [
    { OR: [{ clientProfile: { organizationId: id } }, { quote: { organizationId: id } }, { job: jobInOrganization(id) }] },
    { OR: [{ clientProfileId: null }, { clientProfile: { organizationId: id } }] },
    { OR: [{ quoteId: null }, { quote: { organizationId: id } }] },
    { OR: [{ jobId: null }, { job: jobInOrganization(id) }] },
    where,
  ] };
}

export function workPackageInOrganization(
  organizationId: string,
  where: Prisma.WorkPackageWhereInput & { jobId?: string } = {},
): Prisma.WorkPackageWhereInput {
  const id = verifiedOrganizationId(organizationId);
  const { jobId, ...workPackageWhere } = where;
  return { AND: [
    { scopeItem: {
      organizationId: id,
      job: jobInOrganization(id),
      sourceFile: { organizationId: id },
      workItemVersion: { organizationId: id },
      priceSnapshot: { organizationId: id },
    } },
    { phase: phaseInOrganization(id) },
    ...(jobId ? [{ scopeItem: { jobId } }, { phase: { jobId } }] : []),
    workPackageWhere,
  ] };
}

type RequiredEvidenceDb = Pick<PrismaClient, "requiredEvidence" | "job" | "renovationPhase" | "task" | "fieldReport">;

export async function outstandingRequiredEvidenceInOrganization(
  db: RequiredEvidenceDb,
  organizationId: string,
  limit = 8,
): Promise<RequiredEvidence[]> {
  const id = verifiedOrganizationId(organizationId);
  const take = Math.min(25, Math.max(1, Number.isFinite(limit) ? Math.trunc(limit) : 8));
  const candidates = await db.requiredEvidence.findMany({
    where: {
      satisfiedAt: null,
      runItemId: { not: null },
      runItem: { run: { template: { organizationId: id } } },
    },
    include: { runItem: { select: { run: { select: { entityType: true, entityId: true } } } } },
    orderBy: { createdAt: "desc" },
    take: Math.min(100, take * 4),
  });

  const matching = candidates.filter(item =>
    item.runItem?.run.entityType === item.entityType && item.runItem.run.entityId === item.entityId,
  );
  const idsFor = (types: readonly string[]) => [...new Set(matching
    .filter(item => types.includes(item.entityType))
    .map(item => item.entityId))];
  const jobIds = idsFor(["JOB", "CLOSEOUT"]);
  const phaseIds = idsFor(["PHASE"]);
  const taskIds = idsFor(["TASK"]);
  const reportIds = idsFor(["FIELD_REPORT"]);
  const [jobs, phases, tasks, reports] = await Promise.all([
    db.job.findMany({ where: jobInOrganization(id, { id: { in: jobIds } }), select: { id: true } }),
    db.renovationPhase.findMany({ where: phaseInOrganization(id, { id: { in: phaseIds } }), select: { id: true } }),
    db.task.findMany({ where: taskInOrganization(id, { id: { in: taskIds } }), select: { id: true } }),
    db.fieldReport.findMany({ where: fieldReportInOrganization(id, { id: { in: reportIds } }), select: { id: true } }),
  ]);
  const ownedByType = {
    JOB: new Set(jobs.map(item => item.id)),
    CLOSEOUT: new Set(jobs.map(item => item.id)),
    PHASE: new Set(phases.map(item => item.id)),
    TASK: new Set(tasks.map(item => item.id)),
    FIELD_REPORT: new Set(reports.map(item => item.id)),
  } as const;

  return matching.filter(item =>
    item.entityType in ownedByType && ownedByType[item.entityType as keyof typeof ownedByType].has(item.entityId),
  ).slice(0, take);
}
