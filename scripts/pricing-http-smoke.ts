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
    const owner = await db.user.create({ data: { email: `price-http-${suffix}@example.invalid`, role: "OWNER", organizationId: "flipside-org",
      memberships: { create: { organizationId: "flipside-org", role: "OWNER", status: "ACTIVE" } } } });
    const cookie = "next-auth.session-token=" + await encode({ secret: process.env.NEXTAUTH_SECRET!, token: { id: owner.id, sub: owner.id, email: owner.email } });
    const http = (route: string, options: RequestInit = {}) => fetch(origin + route, { ...options, redirect: "manual", headers: { ...options.headers, cookie } });
    const dashboard = await http("/cost-intelligence").then(response => response.text());
    for (const section of ["Assemblies", "Recent actual costs", "Recent vendor quotes"]) assert.ok(dashboard.includes(section), `Preserve ${section}`);
    const response = await http("/cost-intelligence/scenarios"); assert.equal(response.status, 200);
    const html = await response.text();
    const form = html.match(/<form\b[\s\S]*?<\/form>/g)?.find(value => value.includes('name="requestId"'));
    assert.ok(form, "Pricing form must be present.");
    const action = /name="(\$ACTION_ID_[a-f0-9]+)"/.exec(form)?.[1];
    const requestId = /name="requestId" value="([^"]+)"/.exec(form)?.[1];
    assert.ok(action && requestId, "The rendered scenario form must expose its action and unique request.");
    assert.ok(html.includes('name="ownerFieldRate"') && html.includes('value="55.00"'));
    const body = new URLSearchParams({ [action]: "", requestId, name: `Pricing HTTP ${suffix}`, basis: "Synthetic documented scenario for local verification only.",
      subcontractors: "0", materials: "58500", fieldLabor: "0", ownerFieldHours: "10", ownerFieldRate: "55", projectManagementHours: "10", projectManagementRate: "95",
      equipment: "0", protectionCleanup: "0", permitsDesign: "0", otherDirect: "0", riskPercent: "0", targetMarginPercent: "40", ownerExceptionReason: "" });
    const post = () => {
      const data = new FormData(); for (const [key, value] of body) data.set(key, value);
      return http("/cost-intelligence/scenarios", { method: "POST", body: data, headers: { origin } });
    };
    const saved = await post();
    assert.equal(saved.status, 303);
    const location = saved.headers.get("location")!;
    assert.ok(/^\/cost-intelligence\/[a-z0-9]+$/.test(location), location);
    const result = await http(location); assert.equal(result.status, 200);
    const resultHtml = await result.text(); assert.ok(resultHtml.includes("$100,000.00"));
    const snapshot = await db.priceSnapshot.findUniqueOrThrow({ where: { organizationId_requestId: { organizationId: "flipside-org", requestId } } });
    assert.equal(snapshot.directCost.toString(), "60000");
    assert.equal(snapshot.sellingPrice.toString(), "100000");
    assert.equal((await post()).headers.get("location"), location);
    assert.equal(await db.auditEvent.count({ where: { entityId: snapshot.id } }), 1);
    await db.membership.updateMany({ where: { userId: owner.id }, data: { status: "DISABLED" } });
    const denied = await http(location); const deniedHtml = await denied.text();
    assert.equal(deniedHtml.includes(snapshot.name), false);
    assert.ok([303, 307].includes(denied.status) || deniedHtml.includes("NEXT_REDIRECT"));
    console.log("PASS: actual rendered form submits to a saved $100,000 scenario, retains hours/rates, retries once and denies revoked access.");
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
