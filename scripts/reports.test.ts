import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { publishReport, publishedReportForToken, publicReportFields, reportDigest, ReportPublicationError } from "../lib/report-publication";
import { jobInOrganization, weeklyReportInOrganization } from "../lib/company-scope";
import { assembleWeeklyReportEvidence, weeklyEvidenceWindow } from "../lib/report-evidence";

const db = new PrismaClient({ log: [] });
const target = new URL(process.env.DATABASE_URL!);
assert.ok(["localhost", "127.0.0.1"].includes(target.hostname) && target.pathname === "/flipside_migration_reports");
const token = "report-test-capability-not-production-0123456789";
before(async () => {
  await db.organization.createMany({ data: [{ id: "flipside-org", name: "Flipside fixture" }, { id: "foreign-org", name: "Foreign fixture" }] });
  await db.user.create({ data: { id: "report-owner", email: "report-owner@example.invalid", role: "OWNER", organizationId: "flipside-org",
    memberships: { create: { organizationId: "flipside-org", role: "OWNER", status: "ACTIVE" } } } });
  await db.job.createMany({ data: [{ id: "report-job", organizationId: "flipside-org", jobName: "Report fixture", portalToken: token },
    { id: "foreign-job", organizationId: "foreign-org", jobName: "Foreign" }] });
});
after(() => db.$disconnect());
const draft = (jobId = "report-job") => db.weeklyReport.create({ data: { jobId, weekEnding: new Date("2026-09-20T00:00:00Z"), workCompleted: "Reviewed completed work", clientSummary: "Approved summary", internalNotes: "Never publish this private note" } });

test("only explicit publication exposes immutable client fields, with atomic audit and retry/concurrency safety", async () => {
  const report = await draft();
  assert.equal(await publishedReportForToken(db, report.id, token), null);
  const publications = await Promise.all(Array.from({ length: 3 }, () => publishReport(db, "report-owner", report.id, reportDigest(report))));
  assert.equal(new Set(publications.map(value => value.id)).size, 1);
  const publication = publications[0];
  assert.equal(publication.revision, 1);
  assert.equal(await db.auditEvent.count({ where: { action: "WEEKLY_REPORT_PUBLISHED", entityId: report.id } }), 1);
  assert.equal("internalNotes" in publication, false);
  assert.equal((await publishedReportForToken(db, publication.id, token))?.clientSummary, "Approved summary");
  assert.equal(await publishedReportForToken(db, publication.id, "other-project-token"), null);
  const changed = await db.weeklyReport.update({ where: { id: report.id }, data: { clientSummary: "Unreviewed draft change" } });
  assert.equal((await publishedReportForToken(db, publication.id, token))?.clientSummary, "Approved summary");
  await assert.rejects(() => publishReport(db, "report-owner", report.id, reportDigest(report)), /changed after/);
  const next = await publishReport(db, "report-owner", report.id, reportDigest(changed));
  assert.equal(next.revision, 2);
  assert.equal((await publishedReportForToken(db, publication.id, token))?.clientSummary, "Approved summary");
  assert.equal((await db.weeklyReport.findUniqueOrThrow({ where: { id: report.id } })).sentAt, null);
});

test("missing, foreign and revoked identities cannot publish", async () => {
  const foreign = await draft("foreign-job");
  await assert.rejects(() => publishReport(db, "report-owner", foreign.id, reportDigest(foreign)), /not found/);
  const report = await draft();
  await assert.rejects(() => publishReport(db, "unknown", report.id, reportDigest(report)), ReportPublicationError);
  await db.membership.updateMany({ where: { userId: "report-owner" }, data: { status: "DISABLED" } });
  try { await assert.rejects(() => publishReport(db, "report-owner", report.id, reportDigest(report)), /access denied/); }
  finally { await db.membership.updateMany({ where: { userId: "report-owner" }, data: { status: "ACTIVE" } }); }
  assert.equal(await db.weeklyReportPublication.count({ where: { reportId: report.id } }), 0);
});

test("company scope excludes foreign report and job identifiers", async () => {
  const owned = await draft();
  const foreign = await draft("foreign-job");
  const visible = (await db.weeklyReport.findMany({
    where: weeklyReportInOrganization("flipside-org"), orderBy: { id: "asc" }, select: { id: true },
  })).map(value => value.id);
  assert.ok(visible.includes(owned.id));
  assert.ok(!visible.includes(foreign.id));
  assert.equal(await db.weeklyReport.findFirst({
    where: weeklyReportInOrganization("flipside-org", { id: foreign.id }), select: { id: true },
  }), null);
  assert.equal(await db.job.findFirst({
    where: jobInOrganization("flipside-org", { id: "foreign-job" }), select: { id: true },
  }), null);
  assert.throws(() => weeklyReportInOrganization(" "), /verified organization/);
});

test("a public report remains capability-bound across organization scopes", async () => {
  await db.job.update({ where: { id: "foreign-job" }, data: { portalToken: "foreign-report-capability-token" } });
  const report = await draft("foreign-job");
  const publication = await db.weeklyReportPublication.create({ data: {
    reportId: report.id, revision: 1, sourceDigest: reportDigest(report), reviewedById: "external-review-fixture",
    ...publicReportFields(report),
  } });
  assert.equal((await publishedReportForToken(db, publication.id, "foreign-report-capability-token"))?.report.job.organizationId, "foreign-org");
  assert.equal(await publishedReportForToken(db, publication.id, token), null);
});

test("published reports reject update, delete and truncate", async () => {
  const report = await draft(), publication = await publishReport(db, "report-owner", report.id, reportDigest(report));
  await assert.rejects(() => db.weeklyReportPublication.update({ where: { id: publication.id }, data: { clientSummary: "Overwrite" } }), /immutable/);
  await assert.rejects(() => db.weeklyReportPublication.delete({ where: { id: publication.id } }), /immutable/);
  await assert.rejects(() => db.$executeRawUnsafe('TRUNCATE TABLE "WeeklyReportPublication"'), /immutable/);
});

test("audit failure prevents publication without changing the draft", async () => {
  const report = await draft();
  await db.$executeRawUnsafe(`ALTER TABLE "AuditEvent" ADD CONSTRAINT report_test_block CHECK (action <> 'WEEKLY_REPORT_PUBLISHED') NOT VALID`);
  try { await assert.rejects(() => publishReport(db, "report-owner", report.id, reportDigest(report))); }
  finally { await db.$executeRawUnsafe('ALTER TABLE "AuditEvent" DROP CONSTRAINT report_test_block'); }
  assert.equal(await db.weeklyReportPublication.count({ where: { reportId: report.id } }), 0);
  assert.deepEqual(await db.weeklyReport.findUniqueOrThrow({ where: { id: report.id } }), report);
});

test("weekly evidence uses the same seven-day date-only convention as the field-log form", () => {
  const spring = weeklyEvidenceWindow("2026-03-15");
  assert.equal(spring.startDate, "2026-03-09");
  assert.equal(spring.startInclusive.toISOString(), "2026-03-09T00:00:00.000Z");
  assert.equal(spring.endExclusive.toISOString(), "2026-03-16T00:00:00.000Z");
  const fall = weeklyEvidenceWindow("2026-11-01");
  assert.equal(fall.startInclusive.toISOString(), "2026-10-26T00:00:00.000Z");
  assert.equal(fall.endExclusive.toISOString(), "2026-11-02T00:00:00.000Z");
  assert.throws(() => weeklyEvidenceWindow("2026-02-30"), /valid calendar date/);
});

test("report evidence uses only bounded client-visible completed-work logs and states missing task coverage", async () => {
  await db.fieldReport.createMany({ data: [
    { id: "visible-start-date", jobId: "report-job", reportDate: new Date("2026-03-09"), crewSummary: "Private crew", workCompleted: "  Installed reviewed cabinet boxes.  ", blockers: "Private blocker", clientVisible: true },
    { id: "visible-end-date", jobId: "report-job", reportDate: new Date("2026-03-15"), crewSummary: "Crew", workCompleted: "Completed client-reviewed trim.", clientVisible: true },
    { id: "private-in-window", jobId: "report-job", reportDate: new Date("2026-03-10"), crewSummary: "Private crew", workCompleted: "Never expose private log text", clientVisible: false },
    { id: "visible-after-window", jobId: "report-job", reportDate: new Date("2026-03-16"), crewSummary: "Crew", workCompleted: "Outside the requested week", clientVisible: true },
  ] });
  await db.task.create({ data: { id: "completed-without-date", jobId: "report-job", taskName: "Private task name", status: "COMPLETE" } });

  const evidence = await assembleWeeklyReportEvidence(db, "flipside-org", "report-job", "2026-03-15");
  assert.equal(evidence.range.startDate, "2026-03-09");
  assert.equal(evidence.range.endDate, "2026-03-15");
  assert.deepEqual(evidence.sources.map(source => source.id), ["visible-start-date", "visible-end-date"]);
  assert.equal(evidence.draft.workCompleted, "2026-03-09: Installed reviewed cabinet boxes.\n\n2026-03-15: Completed client-reviewed trim.");
  assert.equal(JSON.stringify(evidence).includes("Never expose private log text"), false);
  assert.equal(JSON.stringify(evidence).includes("Private blocker"), false);
  assert.equal(JSON.stringify(evidence).includes("Private task name"), false);
  assert.ok(evidence.missingCoverage.some(item => item.includes("private field report")));
  assert.ok(evidence.missingCoverage.some(item => item.includes("neither a completion timestamp nor a client-visibility review")));
  await assert.rejects(() => assembleWeeklyReportEvidence(db, "flipside-org", "foreign-job", "2026-03-15"), /Job not found/);
  await assert.rejects(() => assembleWeeklyReportEvidence(db, "", "report-job", "2026-03-15"), /verified organization/);
});
