import { createHash } from "node:crypto";
import type { PrismaClient, WeeklyReport } from "@prisma/client";
import { weeklyReportInOrganization } from "./company-scope";
import { findStaffRecord } from "./staff-record";

export class ReportPublicationError extends Error {}
export async function publishedReportForToken(db: PrismaClient, id: string, token: string) {
  if (!token || token.length > 256) return null;
  return db.weeklyReportPublication.findFirst({ where: { id, report: {
    job: { portalToken: token },
  } }, include: { report: { select: { job: { include: { clientProfile: true, property: true, organization: true } } } } } });
}
export function publicReportFields(report: Pick<WeeklyReport, "weekEnding" | "workCompleted" | "issuesFound" | "decisionsNeeded" | "budgetNotes" | "scheduleNotes" | "nextWeekPlan" | "clientSummary">) {
  return { weekEnding: report.weekEnding, workCompleted: report.workCompleted,
    issuesFound: report.issuesFound, decisionsNeeded: report.decisionsNeeded,
    budgetNotes: report.budgetNotes, scheduleNotes: report.scheduleNotes,
    nextWeekPlan: report.nextWeekPlan, clientSummary: report.clientSummary };
}
export function reportDigest(report: Parameters<typeof publicReportFields>[0]) {
  return createHash("sha256").update(JSON.stringify(publicReportFields(report))).digest("hex");
}

export async function publishReport(db: PrismaClient, actorId: string, reportId: string, reviewedDigest: string) {
  return db.$transaction(async tx => {
    const actor = await findStaffRecord(tx, { id: actorId });
    if (!actor) throw new ReportPublicationError("Staff access denied.");
    // Serialize publication and ordinary draft updates on the same report row.
    const locked = await tx.$queryRaw<Array<{ id: string }>>`SELECT report.id FROM "WeeklyReport" report
      INNER JOIN "Job" job ON job.id = report."jobId"
      WHERE report.id = ${reportId} AND job."organizationId" = ${actor.organizationId}
      FOR UPDATE OF report`;
    if (!locked[0]) throw new ReportPublicationError("Report not found.");
    const report = await tx.weeklyReport.findFirst({ where: weeklyReportInOrganization(actor.organizationId, { id: reportId }), include: {
      job: { select: { organizationId: true } }, publications: { orderBy: { revision: "desc" }, take: 1 },
    } });
    if (!report) throw new ReportPublicationError("Report not found.");
    const digest = reportDigest(report);
    if (reviewedDigest !== digest) throw new ReportPublicationError("This draft changed after you opened it. Review the current report before publishing.");
    if (!report.workCompleted.trim()) throw new ReportPublicationError("Describe completed work before publishing.");
    const latest = report.publications[0];
    if (latest?.sourceDigest === digest) return latest;
    const publication = await tx.weeklyReportPublication.create({ data: {
      ...publicReportFields(report), reportId, sourceDigest: digest, reviewedById: actorId,
      revision: (latest?.revision ?? 0) + 1,
    } });
    await tx.auditEvent.create({ data: { organizationId: actor.organizationId, actorUserId: actorId,
      action: "WEEKLY_REPORT_PUBLISHED", entityType: "WeeklyReport", entityId: reportId,
      metadata: { publicationId: publication.id, revision: publication.revision, sourceDigest: digest } } });
    return publication;
  });
}
