import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { encode } from "next-auth/jwt";

async function main() {
  const url = process.env.PRESERVATION_TARGET_URL!;
  const target = new URL(url), origin = process.env.ACCESS_SMOKE_ORIGIN || "http://localhost:3010";
  assert.ok(["localhost", "127.0.0.1"].includes(target.hostname) && /^\/flipside_(restore|migration)_/.test(target.pathname));
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname));
  assert.ok(process.env.NEXTAUTH_SECRET);
  const db = new PrismaClient({ datasources: { db: { url } }, log: [] });
  const suffix = randomBytes(12).toString("hex");
  try {
    const owner = await db.user.create({ data: { email: `source-http-${suffix}@example.invalid`, role: "OWNER", organizationId: "flipside-org",
      memberships: { create: { organizationId: "flipside-org", role: "OWNER", status: "ACTIVE" } } } });
    const cookie = "next-auth.session-token=" + await encode({ secret: process.env.NEXTAUTH_SECRET!, token: { id: owner.id, sub: owner.id, email: owner.email } });
    const http = (route: string, options: RequestInit = {}) => fetch(origin + route, { ...options, redirect: "manual", headers: { ...options.headers, cookie } });
    const response = await http("/cost-intelligence/sources"); assert.equal(response.status, 200);
    const html = await response.text(); assert.ok(html.includes("National reference examples"));
    const form = html.match(/<form\b[\s\S]*?<\/form>/g)?.find(value => value.includes('name="requestId"')); assert.ok(form);
    const action = /name="(\$ACTION_ID_[a-f0-9]+)"/.exec(form)?.[1], requestId = /name="requestId" value="([^"]+)"/.exec(form)?.[1]; assert.ok(action && requestId);
    const fields = { [action]: "", requestId, name: `Source HTTP ${suffix}`, layer: "MARKET_REFERENCE", component: "ASSEMBLY", measure: "RATE", tradeOrClass: "Shower pan", geography: "United States national", unit: "USD/pan", low: "1536", target: "", high: "2967", effectiveDate: "2026-05-01", reviewDate: "2026-12-21", basePeriod: "", sourceName: "Homewyse", sourceKind: "HOMEWYSE", sourceUrl: "https://www.homewyse.com/services/cost_to_install_shower_pan.html", sourceVersion: "May 2026", scope: "Synthetic local verification of a national source range, not a KERDI quote.", modificationNotes: "No midpoint or local component breakdown inferred.", calibrationDate: "", calibrationBasis: "" };
    const submit = (overrides = {}) => { const body = new FormData(); Object.entries({ ...fields, ...overrides }).forEach(([key, value]) => body.set(key, value)); return http("/cost-intelligence/sources", { method: "POST", body, headers: { origin } }); };
    assert.ok((await submit({ high: "1" })).headers.get("location")?.includes("error="));
    const saved = await submit(); assert.equal(saved.status, 303); const location = saved.headers.get("location")!; assert.match(location, /^\/cost-intelligence\/sources\/[a-z0-9]+$/);
    assert.equal((await submit()).headers.get("location"), location);
    const detail = await http(location); assert.equal(detail.status, 200); const detailHtml = await detail.text();
    for (const text of ["Not supplied", "authorization retained by counsel", "Not calibrated to Flipside actual costs"]) assert.ok(detailHtml.includes(text), text);
    const record = await db.costObservation.findUniqueOrThrow({ where: { organizationId_requestId: { organizationId: "flipside-org", requestId } } });
    assert.equal(record.target, null); assert.equal(await db.auditEvent.count({ where: { entityId: record.id } }), 1);
    await db.membership.updateMany({ where: { userId: owner.id }, data: { status: "DISABLED" } });
    const denied = await http(location); const deniedHtml = await denied.text(); assert.ok(!deniedHtml.includes(record.name));
    assert.ok([303, 307].includes(denied.status) || deniedHtml.includes("NEXT_REDIRECT"));
    console.log("PASS: real source form rejects invalid range, retains provenance/unknown target, retries safely and denies revoked access.");
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
