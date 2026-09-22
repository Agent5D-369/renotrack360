import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { costObservationSchema, saveCostObservation, HOMEWYSE_AUTHORIZATION } from "../lib/cost-observation";
import { costSourceReferences } from "../lib/cost-source-references";

const db = new PrismaClient({ log: [] });
const url = new URL(process.env.DATABASE_URL!);
assert.ok(["localhost", "127.0.0.1"].includes(url.hostname) && url.pathname === "/flipside_migration_cost-sources");
const input = { name: "Synthetic market observation", layer: "MARKET_REFERENCE", component: "ASSEMBLY", measure: "RATE", tradeOrClass: "Shower pan installation", geography: "United States national", unit: "USD/pan",
  low: "1536", target: "", high: "2967", effectiveDate: "2026-05-01", reviewDate: "2026-12-21", basePeriod: "", sourceName: "Homewyse", sourceKind: "HOMEWYSE",
  sourceUrl: costSourceReferences[0].url, sourceVersion: "May 2026", scope: "National source benchmark; not a matched KERDI waterproofing package or Austin quote.", modificationNotes: "Unchanged published national range; no invented midpoint.", calibrationDate: "", calibrationBasis: "" };
before(async () => {
  await db.organization.createMany({ data: [{ id: "flipside-org", name: "Flipside test" }, { id: "foreign-org", name: "Foreign test" }] });
  for (const [id, org] of [["source-owner", "flipside-org"], ["source-foreign", "foreign-org"]]) await db.user.create({ data: { id, email: `${id}@example.invalid`, role: "OWNER", organizationId: org,
    memberships: { create: { organizationId: org, role: "OWNER", status: "ACTIVE" } } } });
});
after(() => db.$disconnect());

test("ranges, dates, provenance and component indices cannot masquerade as calibrated direct cost", () => {
  assert.equal(costObservationSchema.safeParse(input).success, true);
  for (const invalid of [{ low: "abc" }, { low: "-1" }, { high: "1" }, { target: "99999" }, { effectiveDate: "2026-02-30" }, { reviewDate: "2025-01-01" }, { sourceUrl: "javascript:alert(1)" }, { sourceUrl: "https://user:password@example.com" }, { sourceKind: "OTHER" }, { layer: "EXPECTED_DIRECT_COST" }, { measure: "INDEX" }]) {
    assert.equal(costObservationSchema.safeParse({ ...input, ...invalid }).success, false, JSON.stringify(invalid));
  }
  const index = { ...input, measure: "INDEX", component: "LABOR", basePeriod: "2025-01-01", low: "1.05", target: "1.1", high: "1.2" };
  assert.equal(costObservationSchema.safeParse(index).success, true);
  assert.equal(costObservationSchema.safeParse({ ...index, low: "0" }).success, false);
  assert.equal(costObservationSchema.safeParse({ ...index, basePeriod: "2027-01-01" }).success, false);
  assert.ok(costSourceReferences.every(source => source.limitation.includes("National") && source.checkedAt === "2026-09-21"));
});

test("source observations retain authorization and unknown target, with safe immutable retries", async () => {
  const request = randomUUID();
  const values = await Promise.all(Array.from({ length: 3 }, () => saveCostObservation(db, "source-owner", request, input)));
  assert.equal(new Set(values.map(value => value.id)).size, 1);
  const value = values[0]; assert.equal(value.target, null);
  assert.equal((value.content as Record<string, unknown>).authorizationReference, HOMEWYSE_AUTHORIZATION);
  assert.equal(await db.auditEvent.count({ where: { entityId: value.id } }), 1);
  await assert.rejects(() => saveCostObservation(db, "source-owner", request, { ...input, high: "3000" }), /already used/);
  await assert.rejects(() => db.costObservation.update({ where: { id: value.id }, data: { high: "9999" } }), /immutable/);
  await assert.rejects(() => db.costObservation.delete({ where: { id: value.id } }), /immutable/);
  await assert.rejects(() => db.$executeRawUnsafe('TRUNCATE TABLE "CostObservation"'), /immutable/);
  assert.deepEqual(await db.costObservation.findUniqueOrThrow({ where: { id: value.id } }), value);
  assert.equal(await db.priceSnapshot.count(), 0);
});

test("foreign/revoked actors and future calibration are refused; failed audit rolls back", async () => {
  await assert.rejects(() => saveCostObservation(db, "source-foreign", randomUUID(), input), /access denied/);
  await assert.rejects(() => saveCostObservation(db, "source-owner", randomUUID(), { ...input, calibrationDate: "2099-01-01", calibrationBasis: "Synthetic future claim" }), /future/);
  await db.membership.updateMany({ where: { userId: "source-owner" }, data: { status: "DISABLED" } });
  try { await assert.rejects(() => saveCostObservation(db, "source-owner", randomUUID(), input), /access denied/); }
  finally { await db.membership.updateMany({ where: { userId: "source-owner" }, data: { status: "ACTIVE" } }); }
  const count = await db.costObservation.count();
  await db.$executeRawUnsafe(`ALTER TABLE "AuditEvent" ADD CONSTRAINT source_test_block CHECK (action <> 'COST_OBSERVATION_SAVED') NOT VALID`);
  try { await assert.rejects(() => saveCostObservation(db, "source-owner", randomUUID(), input)); }
  finally { await db.$executeRawUnsafe('ALTER TABLE "AuditEvent" DROP CONSTRAINT source_test_block'); }
  assert.equal(await db.costObservation.count(), count);
});
