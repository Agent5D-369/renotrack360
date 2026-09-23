import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";

/**
 * HTTP proof that the export routes outside the verified delivery set are scoped to the acting
 * staff member's company: an owned record exports a PDF, a foreign record and an unknown id both
 * return 404 without disclosing any foreign content.
 *
 * Routes: /api/pdf/invoice/[id], /api/pdf/estimate/[id], /api/pdf/weekly-report/[id],
 * /api/pdf/change-order/[id]
 *
 * Requires the local mirror database and a local server on :3010 built from the same commit.
 */

type Fixture = { label: string; route: string; ownedId: string; foreignId: string; bareIdLookup: () => Promise<unknown> };

async function main() {
  const cfg = JSON.parse(readFileSync(".preservation/media-http-env.json", "utf8"));
  const target = new URL(cfg.DATABASE_URL);
  assert.equal(target.hostname, "127.0.0.1");
  assert.equal(target.pathname, "/flipside_restore_media_v2");
  const db = new PrismaClient({ datasources: { db: { url: cfg.DATABASE_URL } }, log: [] });
  const origin = "http://localhost:3010";
  const suffix = randomUUID();
  const marker = `FOREIGN_EXPORT_${suffix}`;
  const unknownId = `unknown-export-${suffix}`;
  const cleanup = { invoiceIds: [] as string[], quoteIds: [] as string[], jobIds: [] as string[], reportIds: [] as string[], orderIds: [] as string[], orgIds: [] as string[] };
  try {
    const owner = await db.user.findUniqueOrThrow({ where: { id: "report-wave-local-owner" } });
    const ownOrgId = owner.organizationId;
    assert.ok(ownOrgId, "the smoke owner must belong to a company");

    const foreignOrg = await db.organization.create({ data: { name: marker } });
    cleanup.orgIds.push(foreignOrg.id);
    const foreignJob = await db.job.create({ data: { organizationId: foreignOrg.id, jobName: marker } });
    const ownJob = await db.job.create({ data: { organizationId: ownOrgId, jobName: `Owned export job ${suffix}` } });
    cleanup.jobIds.push(foreignJob.id, ownJob.id);

    const foreignInvoice = await db.invoice.create({ data: { jobId: foreignJob.id, invoiceNumber: `FOREIGN-INV-${suffix}`, notes: marker, subtotal: 900, total: 900, balanceDue: 900 } });
    const ownInvoice = await db.invoice.create({ data: { jobId: ownJob.id, invoiceNumber: `OWNED-INV-${suffix}`, notes: "Owned invoice notes", subtotal: 900, total: 900, balanceDue: 900 } });
    cleanup.invoiceIds.push(foreignInvoice.id, ownInvoice.id);
    const foreignQuote = await db.quote.create({ data: { organizationId: foreignOrg.id, quoteName: marker, notes: marker, totalTarget: 4321 } });
    const ownQuote = await db.quote.create({ data: { organizationId: ownOrgId, quoteName: `Owned estimate ${suffix}`, notes: "Owned estimate notes", totalTarget: 4321 } });
    cleanup.quoteIds.push(foreignQuote.id, ownQuote.id);
    const weekEnding = new Date("2026-09-19T00:00:00.000Z");
    const foreignReport = await db.weeklyReport.create({ data: { jobId: foreignJob.id, weekEnding, workCompleted: marker, clientSummary: marker } });
    const ownReport = await db.weeklyReport.create({ data: { jobId: ownJob.id, weekEnding, workCompleted: "Owned weekly work completed" } });
    cleanup.reportIds.push(foreignReport.id, ownReport.id);
    const foreignOrder = await db.changeOrder.create({ data: { jobId: foreignJob.id, changeOrderTitle: marker, reason: marker, addedCost: 250, addedTime: 3 } });
    const ownOrder = await db.changeOrder.create({ data: { jobId: ownJob.id, changeOrderTitle: `Owned change ${suffix}`, reason: "Owned change reason", addedCost: 250, addedTime: 3 } });
    cleanup.orderIds.push(foreignOrder.id, ownOrder.id);

    // Fixture control: each foreign row really exists and is findable by its bare id, so the only
    // thing standing between the caller and another company's document is the company predicate.
    const fixtures: Fixture[] = [
      { label: "invoice", route: "/api/pdf/invoice", ownedId: ownInvoice.id, foreignId: foreignInvoice.id, bareIdLookup: () => db.invoice.findUnique({ where: { id: foreignInvoice.id } }) },
      { label: "estimate", route: "/api/pdf/estimate", ownedId: ownQuote.id, foreignId: foreignQuote.id, bareIdLookup: () => db.quote.findUnique({ where: { id: foreignQuote.id } }) },
      { label: "weekly-report", route: "/api/pdf/weekly-report", ownedId: ownReport.id, foreignId: foreignReport.id, bareIdLookup: () => db.weeklyReport.findUnique({ where: { id: foreignReport.id } }) },
      { label: "change-order", route: "/api/pdf/change-order", ownedId: ownOrder.id, foreignId: foreignOrder.id, bareIdLookup: () => db.changeOrder.findUnique({ where: { id: foreignOrder.id } }) }
    ];
    for (const fixture of fixtures) {
      assert.ok(await fixture.bareIdLookup(), `control: the foreign ${fixture.label} row exists and is findable by bare id`);
    }

    const cookie = "next-auth.session-token=" + await encode({ secret: cfg.NEXTAUTH_SECRET, token: { id: owner.id, sub: owner.id, email: owner.email } });
    const http = (path: string, init: RequestInit = {}) => fetch(origin + path, { ...init, redirect: "manual", headers: { ...init.headers, cookie } });
    const httpAnonymous = (path: string) => fetch(origin + path, { redirect: "manual" });

    const report: Record<string, unknown> = {};
    for (const fixture of fixtures) {
      const owned = await http(`${fixture.route}/${fixture.ownedId}`);
      const ownedBody = Buffer.from(await owned.arrayBuffer());
      assert.equal(owned.status, 200, `${fixture.label}: the acting company's own record must export`);
      assert.ok(owned.headers.get("content-type")?.includes("application/pdf"), `${fixture.label}: owned export must be a PDF`);
      assert.ok(ownedBody.byteLength > 500, `${fixture.label}: owned export must contain a real document (${ownedBody.byteLength} bytes)`);
      assert.ok(ownedBody.subarray(0, 5).toString("latin1") === "%PDF-", `${fixture.label}: owned export must start with the PDF header`);

      const foreign = await http(`${fixture.route}/${fixture.foreignId}`);
      const foreignText = await foreign.text();
      assert.equal(foreign.status, 404, `${fixture.label}: another company's record must not export`);
      assert.ok(!foreignText.includes(marker), `${fixture.label}: the denial must not disclose foreign content`);
      assert.ok(!foreignText.includes("FOREIGN-INV-"), `${fixture.label}: the denial must not disclose a foreign number`);

      const unknown = await http(`${fixture.route}/${unknownId}`);
      const unknownText = await unknown.text();
      assert.equal(unknown.status, 404, `${fixture.label}: an unknown id must return 404, not a server error`);
      assert.ok(!unknownText.includes(marker), `${fixture.label}: an unknown id must not disclose foreign content`);

      const anonymous = await httpAnonymous(`${fixture.route}/${fixture.ownedId}`);
      await anonymous.text();
      assert.notEqual(anonymous.status, 200, `${fixture.label}: an unauthenticated caller must not export`);

      report[fixture.label] = {
        ownedStatus: owned.status,
        ownedBytes: ownedBody.byteLength,
        foreignStatus: foreign.status,
        unknownStatus: unknown.status,
        anonymousStatus: anonymous.status,
        foreignRowExistsByBareId: true
      };
      console.log(`PASS ${fixture.label}: owned 200 (${ownedBody.byteLength} bytes), foreign 404, unknown 404, anonymous ${anonymous.status}`);
    }

    writeFileSync(".preservation/pdf-scope-local-http.json", JSON.stringify({
      checkedAt: new Date().toISOString(),
      origin,
      database: target.pathname,
      foreignMarker: marker,
      fixtureControl: "each foreign row is findable by its bare id, so only the company predicate blocks the export",
      routes: report,
      productionMutations: false
    }, null, 2));
    console.log("PASS: invoice, estimate, weekly-report and change-order exports are confined to the acting company.");
  } finally {
    // Remove every synthetic row so a rerun starts clean. A cleanup failure must not mask a real result.
    try {
      await db.invoice.deleteMany({ where: { id: { in: cleanup.invoiceIds } } });
      await db.quote.deleteMany({ where: { id: { in: cleanup.quoteIds } } });
      await db.changeOrder.deleteMany({ where: { id: { in: cleanup.orderIds } } });
      await db.weeklyReport.deleteMany({ where: { id: { in: cleanup.reportIds } } });
      await db.job.deleteMany({ where: { id: { in: cleanup.jobIds } } });
      await db.organization.deleteMany({ where: { id: { in: cleanup.orgIds } } });
    } catch (cleanupError) {
      console.error("Cleanup warning:", cleanupError instanceof Error ? cleanupError.message : String(cleanupError));
    }
    await db.$disconnect();
  }
}

main().catch(error => { console.error(error instanceof Error ? error.message : "Export scope HTTP verification failed"); process.exitCode = 1; });
