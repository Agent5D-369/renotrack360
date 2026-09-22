import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { calculateHomewyse, homewyseRecordSchema, homewysePriceDraft, importHomewyseCatalog, type SourceContent } from "../lib/homewyse-catalog";
import { savePriceSnapshot } from "../lib/price-snapshot";
const db = new PrismaClient({ log: [] }), url = new URL(process.env.DATABASE_URL!);
assert.ok(url.hostname === "127.0.0.1" && url.pathname === "/flipside_migration_homewyse");
const record = homewyseRecordSchema.parse(JSON.parse(readFileSync("scripts/fixtures/homewyse-shower-pan.json", "utf8")));
const input = { formatVersion: "flipside-homewyse-import-v1", retrievedAt: "2026-09-21T00:00:00Z", authorizationReference: "Authorized source", flipsideModification: "Published source model retained; planning use only.", geography: { zip: "78704", label: "Austin 78704", laborFactor: 0.85, factorSourceUrl: "https://www.homewyse.com/hwref/new4.php?lc=78704", nonLaborFormula: "1 + 0.15 * (laborFactor - 1)" }, records: [record], unavailable: [] };
before(async () => {
  await db.organization.create({ data: { id: "flipside-org", name: "Catalog test" } });
  for (const role of ["OWNER", "ADMIN"] as const) await db.user.create({ data: { id: role, email: `${role}@example.invalid`, role, organizationId: "flipside-org", memberships: { create: { organizationId: "flipside-org", role, status: "ACTIVE" } } } });
});
after(() => db.$disconnect());
test("published shower model matches national component arithmetic and Austin factors", () => {
  const national = calculateHomewyse(record, 1)!;
  assert.equal(national.low, "1536.26"); assert.equal(national.high, "2966.70"); assert.equal(national.laborHours, "4.125");
  const austin = calculateHomewyse(record, 1, .85)!;
  assert.equal(austin.nonLaborFactor, "0.9775"); assert.equal(austin.laborHours, "4.125");
  assert.equal(austin.rows.find(r => r.index === 1)!.low, "421.87");
  assert.ok(Number(calculateHomewyse(record, 2)!.low) > Number(national.low));
  const small = calculateHomewyse(record, .01)!; assert.equal(small.laborHours, "2");
  assert.throws(() => calculateHomewyse(record, "-1"));
  assert.equal(calculateHomewyse({ ...record, model: { kind: "SOURCE_REFERENCE", sourceScripts: [] } }, 1), null);
});
test("bulk import is idempotent and immutable; revised source is a new version", async () => {
  assert.equal((await importHomewyseCatalog(db, "OWNER", input)).imported, 1);
  assert.equal((await importHomewyseCatalog(db, "OWNER", { ...input, retrievedAt: "2026-09-22T00:00:00Z" })).retained, 1);
  const source = await db.costSourceVersion.findFirstOrThrow();
  await assert.rejects(() => db.costSourceVersion.update({ where: { id: source.id }, data: { name: "Rewritten" } }), /immutable/);
  await assert.rejects(() => db.costSourceVersion.delete({ where: { id: source.id } }), /immutable/);
  await assert.rejects(() => importHomewyseCatalog(db, "ADMIN", input), /owner/);
  assert.equal((await importHomewyseCatalog(db, "OWNER", { ...input, records: [{ ...record, notes: [...record.notes, "New source qualification"] }] })).imported, 1);
  assert.equal(await db.priceSnapshot.count(), 0);
  const draft = homewysePriceDraft(source.id, source.content as SourceContent, "1")!;
  assert.equal(draft.fieldLabor, "226.88");
  const price = await savePriceSnapshot(db, "OWNER", randomUUID(), { ...draft, ownerFieldRate: "55", projectManagementRate: "95", riskPercent: "10", targetMarginPercent: "40" });
  assert.equal(price.costSourceVersionId, source.id);
  assert.equal((price.inputs as Record<string,string>).sourceQuantity, "1");
  await assert.rejects(() => savePriceSnapshot(db, "OWNER", randomUUID(), { ...draft, costSourceVersionId: "missing-source", ownerFieldRate: "55", projectManagementRate: "95", riskPercent: "10", targetMarginPercent: "40" }), /access denied/);
});
test("failed audit rolls back the imported batch", async () => {
  const count = await db.costSourceVersion.count();
  await db.$executeRawUnsafe(`ALTER TABLE "AuditEvent" ADD CONSTRAINT catalog_test_block CHECK (action <> 'AUTHORIZED_COST_CATALOG_IMPORTED') NOT VALID`);
  try { await assert.rejects(() => importHomewyseCatalog(db, "OWNER", { ...input, records: [{ ...record, notes: ["rollback fixture"] }] })); }
  finally { await db.$executeRawUnsafe('ALTER TABLE "AuditEvent" DROP CONSTRAINT catalog_test_block'); }
  assert.equal(await db.costSourceVersion.count(), count);
});
