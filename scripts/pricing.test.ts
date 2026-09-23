import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { calculateGrossMargin, pricingInputSchema, type PricingInput } from "../lib/gross-margin";
import { savePriceSnapshot } from "../lib/price-snapshot";

const db = new PrismaClient({ log: [] });
const target = new URL(process.env.DATABASE_URL!);
assert.ok(["localhost", "127.0.0.1"].includes(target.hostname) && target.pathname === "/flipside_migration_pricing");
const input = (changes: Partial<PricingInput> = {}): PricingInput => pricingInputSchema.parse({ name: "Synthetic price proof", basis: "Synthetic costs for a disposable pricing test only.",
  subcontractors: "0", materials: "60000", fieldLabor: "0", ownerFieldHours: "0", ownerFieldRate: "55", projectManagementHours: "0", projectManagementRate: "95", equipment: "0", protectionCleanup: "0", permitsDesign: "0", otherDirect: "0",
  riskPercent: "0", targetMarginPercent: "40", ownerApproval: false, ownerExceptionReason: "", ...changes });
before(async () => {
  await db.organization.createMany({ data: [{ id: "flipside-org", name: "Flipside test" }, { id: "foreign-org", name: "Foreign test" }] });
  for (const [id, role, org] of [["price-owner", "OWNER", "flipside-org"], ["price-admin", "ADMIN", "flipside-org"], ["price-foreign", "OWNER", "foreign-org"]] as const) {
    await db.user.create({ data: { id, email: `${id}@example.invalid`, role, organizationId: org,
      memberships: { create: { organizationId: org, role, status: "ACTIVE" } } } });
  }
});
after(() => db.$disconnect());

test("canon gross margin and risk ordering use decimal money without compound markup", () => {
  assert.equal(calculateGrossMargin(input()).sellingPrice, "100000.00");
  const risk = calculateGrossMargin(input({ materials: "50000", riskPercent: "20" }));
  assert.equal(risk.riskAdjustedDirectCost, "60000.00");
  assert.equal(risk.sellingPrice, "100000.00");
  assert.equal(calculateGrossMargin(input({ materials: "0", ownerFieldHours: "10", projectManagementHours: "10" })).directCost, "1500.00");
  assert.equal(calculateGrossMargin(input({ materials: "0.01" })).sellingPrice, "0.02");
  for (const bad of [{ targetMarginPercent: "100" }, { materials: "-1" }, { materials: "Infinity" }, { materials: "1e8" }, { riskPercent: "100.01" }, { materials: "0.001" }]) {
    assert.equal(pricingInputSchema.safeParse({ ...input(), ...bad }).success, false);
  }
  assert.throws(() => calculateGrossMargin(input({ materials: "0" })), /direct costs/);
  assert.equal(pricingInputSchema.safeParse({ ...input(), ownerFieldHours: "10", ownerFieldRate: "0" }).success, false);
});

test("below-35% requires explicit active owner approval and a reason", async () => {
  const low = input({ targetMarginPercent: "34.99" });
  await assert.rejects(() => savePriceSnapshot(db, "price-owner", randomUUID(), low), /owner approval/);
  const approved = { ...low, ownerApproval: true, ownerExceptionReason: "Documented strategic exception for this synthetic case." };
  await assert.rejects(() => savePriceSnapshot(db, "price-admin", randomUUID(), approved), /owner approval/);
  const snapshot = await savePriceSnapshot(db, "price-owner", randomUUID(), approved);
  assert.equal(snapshot.ownerApprovedById, "price-owner");
  assert.equal(snapshot.ownerExceptionReason, approved.ownerExceptionReason);
  assert.equal((await savePriceSnapshot(db, "price-admin", randomUUID(), input({ targetMarginPercent: "35" }))).ownerApprovedById, null);
});

test("snapshot/audit save once across retries and old scenarios remain unchanged", async () => {
  const requestId = randomUUID();
  const results = await Promise.all(Array.from({ length: 3 }, () => savePriceSnapshot(db, "price-owner", requestId, input())));
  assert.equal(new Set(results.map(value => value.id)).size, 1);
  const snapshot = results[0];
  assert.equal(await db.auditEvent.count({ where: { entityId: snapshot.id } }), 1);
  await assert.rejects(() => savePriceSnapshot(db, "price-owner", requestId, input({ materials: "99999" })), /already used/);
  await savePriceSnapshot(db, "price-owner", randomUUID(), input({ materials: "70000" }));
  assert.deepEqual(await db.priceSnapshot.findUniqueOrThrow({ where: { id: snapshot.id } }), snapshot);
  await assert.rejects(() => db.priceSnapshot.update({ where: { id: snapshot.id }, data: { sellingPrice: "1" } }), /immutable/);
  await assert.rejects(() => db.priceSnapshot.delete({ where: { id: snapshot.id } }), /immutable/);
  // A plain TRUNCATE is refused by the child foreign keys before the immutability trigger can
  // run; TRUNCATE CASCADE is the path that reaches the BEFORE TRUNCATE trigger itself.
  await assert.rejects(() => db.$executeRawUnsafe('TRUNCATE TABLE "PriceSnapshot"'), /immutable|cannot truncate/);
  await assert.rejects(() => db.$executeRawUnsafe('TRUNCATE TABLE "PriceSnapshot" CASCADE'), /immutable/);
  assert.ok(await db.priceSnapshot.findUnique({ where: { id: snapshot.id } }), "the snapshot survives both refused truncates");
});

test("foreign and revoked users cannot save; failed audit leaves no price snapshot", async () => {
  await assert.rejects(() => savePriceSnapshot(db, "price-foreign", randomUUID(), input()), /access denied/);
  await db.membership.updateMany({ where: { userId: "price-owner" }, data: { status: "DISABLED" } });
  try { await assert.rejects(() => savePriceSnapshot(db, "price-owner", randomUUID(), input()), /access denied/); }
  finally { await db.membership.updateMany({ where: { userId: "price-owner" }, data: { status: "ACTIVE" } }); }
  const count = await db.priceSnapshot.count();
  await db.$executeRawUnsafe(`ALTER TABLE "AuditEvent" ADD CONSTRAINT price_test_block CHECK (action <> 'PRICE_SCENARIO_SAVED') NOT VALID`);
  try { await assert.rejects(() => savePriceSnapshot(db, "price-owner", randomUUID(), input())); }
  finally { await db.$executeRawUnsafe('ALTER TABLE "AuditEvent" DROP CONSTRAINT price_test_block'); }
  assert.equal(await db.priceSnapshot.count(), count);
});

test("a company market index is applied to labour, material and permit costs and retained with the scenario", async () => {
  const own = await db.marketCostFactor.create({ data: { organizationId: "flipside-org", marketName: "Synthetic Austin index", zipPrefix: "787", laborMultiplier: "1.10", materialMultiplier: "1.20", permitMultiplier: "1.50" } });
  const foreign = await db.marketCostFactor.create({ data: { organizationId: "foreign-org", marketName: "Synthetic foreign index", zipPrefix: "787", laborMultiplier: "9", materialMultiplier: "9", permitMultiplier: "9" } });
  const amounts = { materials: "1000", fieldLabor: "1000", permitsDesign: "1000" };

  const plain = await savePriceSnapshot(db, "price-owner", randomUUID(), input(amounts));
  assert.equal(plain.directCost.toFixed(2), "3000.00");
  assert.equal(plain.sellingPrice.toFixed(2), "5000.00");
  assert.equal((plain.inputs as { marketIndex?: { applied?: boolean } }).marketIndex?.applied, false, "an unindexed scenario records that no index applied");

  const indexed = await savePriceSnapshot(db, "price-owner", randomUUID(), { ...input(amounts), marketFactorId: own.id });
  assert.equal(indexed.directCost.toFixed(2), "3800.00", "1000 materials x1.20, 1000 field labour x1.10 and 1000 permits x1.50");
  assert.equal(indexed.sellingPrice.toFixed(2), "6333.34", "risk still precedes margin and the price still rounds upward to the cent");
  const retained = (indexed.inputs as { marketIndex?: { applied?: boolean; marketName?: string; laborMultiplier?: string } }).marketIndex;
  assert.equal(retained?.applied, true);
  assert.equal(retained?.marketName, "Synthetic Austin index");
  assert.equal(retained?.laborMultiplier, "1.100");
  assert.equal((indexed.inputs as { materials?: string }).materials, "1200.00", "the retained assumptions keep the indexed amounts");

  const before = await db.priceSnapshot.count();
  await assert.rejects(() => savePriceSnapshot(db, "price-owner", randomUUID(), { ...input(amounts), marketFactorId: foreign.id }), /not available to this company/);
  assert.equal(await db.priceSnapshot.count(), before, "a refused index writes nothing");
});
