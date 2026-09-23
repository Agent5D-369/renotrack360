import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { showerPilot, workItemDigest, workItemSchema } from "../lib/work-item-pilot";
import { adoptShowerPilot } from "../lib/work-item-version";

const db = new PrismaClient({ log: [] });
const target = new URL(process.env.DATABASE_URL!);
assert.ok(["localhost", "127.0.0.1"].includes(target.hostname) && target.pathname === "/flipside_migration_work-items");
const digest = workItemDigest(showerPilot);
before(async () => {
  await db.organization.createMany({ data: [{ id: "flipside-org", name: "Flipside test" }, { id: "foreign-org", name: "Foreign test" }] });
  for (const [id, org] of [["work-owner", "flipside-org"], ["work-foreign", "foreign-org"]]) {
    await db.user.create({ data: { id, email: `${id}@example.invalid`, role: "OWNER", organizationId: org,
      memberships: { create: { organizationId: org, role: "OWNER", status: "ACTIVE" } } } });
  }
});
after(() => db.$disconnect());

test("pilot retains provenance, ordered pre-cover gates and site-specific review limits", () => {
  assert.equal(showerPilot.source.edition, "04/2026");
  assert.equal(showerPilot.source.sha256, "6c7259896f8fab7d34e54a2b4eff307a1f35c12be96e574cacad95a0f8921ea5");
  assert.match(showerPilot.reviewerPolicy, /per job/);
  const order = showerPilot.steps.map(value => value.key);
  for (const [before, after] of [["substrate", "system-install"], ["drain-plan", "drain-before"], ["pre-cover", "cure"], ["cure", "water-test"], ["water-test", "tile-release"]]) assert.ok(order.indexOf(before) < order.indexOf(after));
  for (const key of ["pre-cover", "cure", "water-test", "tile-release"]) assert.equal(showerPilot.steps.find(step => step.key === key)?.holdPoint, true);
  assert.match(showerPilot.steps.find(step => step.key === "drain-before")!.condition!, /no access from below/);
  assert.match(showerPilot.steps.find(step => step.key === "cure")!.instructions, /at least 24 hours/);
  assert.match(showerPilot.costInputs.join(" "), /no default material price or production-hour allowance/);
  assert.equal(workItemSchema.safeParse({ ...showerPilot, steps: [...showerPilot.steps, showerPilot.steps[0]] }).success, false);
  assert.notEqual(workItemDigest({ ...showerPilot, name: "Changed plan" }), digest);
});

test("audit failure rolls adoption back; stale and unauthorized requests make no version", async () => {
  await assert.rejects(() => adoptShowerPilot(db, "work-owner", "stale"), /changed/);
  await assert.rejects(() => adoptShowerPilot(db, "work-foreign", digest), /access denied/);
  await db.membership.updateMany({ where: { userId: "work-owner" }, data: { status: "DISABLED" } });
  try { await assert.rejects(() => adoptShowerPilot(db, "work-owner", digest), /access denied/); }
  finally { await db.membership.updateMany({ where: { userId: "work-owner" }, data: { status: "ACTIVE" } }); }
  await db.$executeRawUnsafe(`ALTER TABLE "AuditEvent" ADD CONSTRAINT work_test_block CHECK (action <> 'WORK_ITEM_ADOPTED') NOT VALID`);
  try { await assert.rejects(() => adoptShowerPilot(db, "work-owner", digest)); }
  finally { await db.$executeRawUnsafe('ALTER TABLE "AuditEvent" DROP CONSTRAINT work_test_block'); }
  assert.equal(await db.workItemVersion.count(), 0);
});

test("concurrent adoption retains exactly one immutable version and audit", async () => {
  const versions = await Promise.all(Array.from({ length: 3 }, () => adoptShowerPilot(db, "work-owner", digest)));
  assert.equal(new Set(versions.map(value => value.id)).size, 1);
  const version = versions[0];
  assert.equal(version.revision, 1);
  assert.deepEqual(version.content, showerPilot);
  assert.equal(await db.auditEvent.count({ where: { entityId: version.id } }), 1);
  await assert.rejects(() => db.workItemVersion.update({ where: { id: version.id }, data: { name: "Rewritten" } }), /immutable/);
  await assert.rejects(() => db.workItemVersion.delete({ where: { id: version.id } }), /immutable/);
  // See the pricing suite: the plain form is refused by the child foreign key, the cascading form
  // is what reaches the BEFORE TRUNCATE trigger.
  await assert.rejects(() => db.$executeRawUnsafe('TRUNCATE TABLE "WorkItemVersion"'), /immutable|cannot truncate/);
  await assert.rejects(() => db.$executeRawUnsafe('TRUNCATE TABLE "WorkItemVersion" CASCADE'), /immutable/);
  assert.deepEqual(await db.workItemVersion.findUniqueOrThrow({ where: { id: version.id } }), version);
});
