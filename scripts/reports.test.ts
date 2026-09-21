import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { publishReport, publishedReportForToken, reportDigest, ReportPublicationError } from "../lib/report-publication";

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
