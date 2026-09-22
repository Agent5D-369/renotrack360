import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { encode } from "next-auth/jwt";
import { showerPilot, workItemDigest } from "../lib/work-item-pilot";

async function main() {
  const url = process.env.PRESERVATION_TARGET_URL!;
  const target = new URL(url), origin = process.env.ACCESS_SMOKE_ORIGIN || "http://localhost:3010";
  assert.ok(["localhost", "127.0.0.1"].includes(target.hostname) && /^\/flipside_(restore|migration)_/.test(target.pathname));
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname));
  assert.ok(process.env.NEXTAUTH_SECRET);
  const db = new PrismaClient({ datasources: { db: { url } }, log: [] });
  const suffix = randomBytes(12).toString("hex");
  try {
    const owner = await db.user.create({ data: { email: `work-http-${suffix}@example.invalid`, role: "OWNER", organizationId: "flipside-org",
      memberships: { create: { organizationId: "flipside-org", role: "OWNER", status: "ACTIVE" } } } });
    const cookie = "next-auth.session-token=" + await encode({ secret: process.env.NEXTAUTH_SECRET!, token: { id: owner.id, sub: owner.id, email: owner.email } });
    const http = (route: string, options: RequestInit = {}) => fetch(origin + route, { ...options, redirect: "manual", headers: { ...options.headers, cookie } });
    const library = await http("/service-templates").then(response => response.text());
    for (const heading of ["Service Templates", "Categories", "Evidence rules"]) assert.ok(library.includes(heading));
    const response = await http("/service-templates/work-items"); assert.equal(response.status, 200);
    const html = await response.text();
    for (const text of ["04/2026", "Hold point", "no access from below", "24 hours", "Cost inputs to measure"]) assert.ok(html.includes(text), text);
    const form = html.match(/<form\b[\s\S]*?<\/form>/g)?.find(value => value.includes('name="reviewedDigest"'));
    assert.ok(form);
    const action = /name="(\$ACTION_ID_[a-f0-9]+)"/.exec(form)?.[1]; assert.ok(action);
    const submit = (acknowledged: boolean, digest = workItemDigest(showerPilot)) => {
      const body = new FormData(); body.set(action, ""); body.set("reviewedDigest", digest);
      if (acknowledged) body.set("planningAcknowledged", "on");
      return http("/service-templates/work-items", { method: "POST", body, headers: { origin } });
    };
    assert.ok((await submit(false)).headers.get("location")?.includes("error="));
    assert.ok((await submit(true, "stale")).headers.get("location")?.includes("error="));
    const saved = await submit(true); assert.equal(saved.status, 303);
    const location = saved.headers.get("location")!; assert.match(location, /^\/service-templates\/work-items\/[a-z0-9]+$/);
    assert.equal((await submit(true)).headers.get("location"), location);
    const detail = await http(location); assert.equal(detail.status, 200); assert.ok((await detail.text()).includes("revision 1"));
    const version = await db.workItemVersion.findUniqueOrThrow({ where: { id: location.split("/").pop() } });
    assert.deepEqual(version.content, showerPilot); assert.equal(await db.auditEvent.count({ where: { entityId: version.id } }), 1);
    await db.membership.updateMany({ where: { userId: owner.id }, data: { status: "DISABLED" } });
    const denied = await http(location); const deniedHtml = await denied.text();
    assert.ok([303, 307].includes(denied.status) || deniedHtml.includes("NEXT_REDIRECT"));
    assert.ok(!deniedHtml.includes("Retained planning version"));
    console.log("PASS: preserved library, reviewed pilot form, stale/unchecked refusal, immutable adoption/retry and revoked detail denial.");
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
