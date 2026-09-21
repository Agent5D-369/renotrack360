import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { encode } from "next-auth/jwt";
import { publishReport, reportDigest } from "../lib/report-publication";

async function main() {
  const url = process.env.PRESERVATION_TARGET_URL!;
  const target = new URL(url);
  assert.ok(["localhost", "127.0.0.1"].includes(target.hostname) && /^\/flipside_(restore|migration)_/.test(target.pathname));
  const origin = process.env.ACCESS_SMOKE_ORIGIN || "http://localhost:3010";
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname));
  const secret = process.env.NEXTAUTH_SECRET!;
  assert.ok(secret);
  const db = new PrismaClient({ datasources: { db: { url } }, log: [] });
  const suffix = randomBytes(12).toString("hex"), token = randomBytes(32).toString("hex");
  try {
    const owner = await db.user.create({ data: { email: `report-http-${suffix}@example.invalid`, role: "OWNER", organizationId: "flipside-org",
      memberships: { create: { organizationId: "flipside-org", role: "OWNER", status: "ACTIVE" } } } });
    const job = await db.job.create({ data: { organizationId: "flipside-org", jobName: "Report HTTP fixture", portalToken: token } });
    const privateMarker = `PRIVATE_DRAFT_${suffix}`, publicMarker = `REVIEWED_PUBLIC_${suffix}`, internalMarker = `INTERNAL_${suffix}`;
    let report = await db.weeklyReport.create({ data: { jobId: job.id, weekEnding: new Date(), workCompleted: privateMarker, clientSummary: privateMarker, internalNotes: internalMarker } });
    const cookie = "next-auth.session-token=" + await encode({ secret, token: { id: owner.id, sub: owner.id, email: owner.email } });
    const http = (route: string, staff = false) => fetch(origin + route, { redirect: "manual", headers: staff ? { cookie } : {} });
    let response = await http(`/portal/${token}`);
    assert.equal(response.status, 200);
    assert.equal((await response.text()).includes(privateMarker), false);
    const beforePdf = await db.weeklyReport.findUniqueOrThrow({ where: { id: report.id } });
    response = await http(`/api/pdf/weekly-report/${report.id}`, true);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/pdf");
    assert.deepEqual(await db.weeklyReport.findUniqueOrThrow({ where: { id: report.id } }), beforePdf);
    report = await db.weeklyReport.update({ where: { id: report.id }, data: { workCompleted: publicMarker, clientSummary: publicMarker } });
    const publication = await publishReport(db, owner.id, report.id, reportDigest(report));
    await db.weeklyReport.update({ where: { id: report.id }, data: { workCompleted: privateMarker, clientSummary: privateMarker } });
    const html = await http(`/portal/${token}`).then(response => response.text());
    assert.ok(html.includes(publicMarker));
    assert.equal(html.includes(privateMarker), false);
    assert.equal(html.includes(internalMarker), false);
    assert.ok(html.includes(`/api/portal/${token}/reports/${publication.id}`));
    const before = { report: await db.weeklyReport.findUnique({ where: { id: report.id } }), audit: await db.auditEvent.count() };
    response = await http(`/api/portal/${token}/reports/${publication.id}`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.ok((await response.arrayBuffer()).byteLength > 1000);
    assert.equal((await http(`/api/portal/${randomBytes(32).toString("hex")}/reports/${publication.id}`)).status, 404);
    assert.equal((await http(`/api/portal/${token}/reports/${report.id}`)).status, 404);
    assert.deepEqual({ report: await db.weeklyReport.findUnique({ where: { id: report.id } }), audit: await db.auditEvent.count() }, before);
    console.log("PASS: portal hides drafts/internal notes, retains approved copy after edits, scoped client PDF works, wrong token/draft IDs denied, PDF GETs make no report/audit writes.");
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
