import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { randomBytes, randomUUID } from "node:crypto";
import { encode } from "next-auth/jwt";

async function main() {
  const url = process.env.PRESERVATION_TARGET_URL!;
  const target = new URL(url), origin = process.env.ACCESS_SMOKE_ORIGIN || "http://localhost:3010";
  assert.ok(["localhost", "127.0.0.1"].includes(target.hostname) && /^\/flipside_(restore|migration)_/.test(target.pathname));
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname)); assert.ok(process.env.NEXTAUTH_SECRET);
  const db = new PrismaClient({ datasources: { db: { url } }, log: [] });
  const suffix = randomBytes(12).toString("hex");
  try {
    const owner = await db.user.create({ data: { email: `payment-http-${suffix}@example.invalid`, role: "OWNER", organizationId: "flipside-org", memberships: { create: { organizationId: "flipside-org", role: "OWNER", status: "ACTIVE" } } } });
    const job = await db.job.create({ data: { jobName: `HTTP ledger ${suffix}`, organizationId: "flipside-org", amountPaid: "777" } });
    const invoice = await db.invoice.create({ data: { invoiceNumber: `HTTP-${suffix}`, jobId: job.id, subtotal: "1000", total: "1000", balanceDue: "1000", status: "SENT" } });
    const cookie = "next-auth.session-token=" + await encode({ secret: process.env.NEXTAUTH_SECRET!, token: { id: owner.id, sub: owner.id, email: owner.email } });
    const http = (route: string, options: RequestInit = {}) => fetch(origin + route, { ...options, redirect: "manual", headers: { ...options.headers, cookie } });
    const decode = (value: string) => value.replaceAll("&quot;", '"').replaceAll("&#x27;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
    const fields = async (route: string) => {
      const response = await http(route); assert.equal(response.status, 200); const html = await response.text();
      const form = html.match(/<form\b[\s\S]*?<\/form>/g)?.find(value => value.includes('name="requestId"')); assert.ok(form);
      const values: Record<string, string> = {};
      for (const tag of form.match(/<input\b[^>]*>/g) ?? []) {
        if (!tag.includes('type="hidden"')) continue;
        const name = /name="([^"]+)"/.exec(tag)?.[1], value = /value="([^"]*)"/.exec(tag)?.[1] ?? "";
        if (name) values[decode(name)] = decode(value);
      }
      assert.ok(Object.keys(values).some(name => name.startsWith("$ACTION_"))); return values;
    };
    const post = (route: string, hidden: Record<string, string>, status: string, extra = {}) => {
      const body = new FormData(); const values = { ...hidden, invoiceId: invoice.id, clientProfileId: "", amount: "100.25", paymentDate: "2026-09-21", method: "CHECK", status, stripePaymentIntentId: "", notes: "Synthetic local payment workflow only.", ...extra };
      Object.entries(values).forEach(([key, value]) => body.set(key, value)); return http(route, { method: "POST", body, headers: { origin } });
    };
    const createFields = await fields("/payments/new"), saved = await post("/payments/new", createFields, "PENDING"); assert.equal(saved.status, 303);
    const location = saved.headers.get("location")!; const id = /^\/payments\/([a-z0-9]+)\?/.exec(location)?.[1]; assert.ok(id);
    assert.equal((await post("/payments/new", createFields, "PENDING")).headers.get("location"), location);
    assert.equal((await db.invoice.findUniqueOrThrow({ where: { id: invoice.id } })).amountPaid.toString(), "0");
    const editRoute = `/payments/${id}/edit`, editFields = await fields(editRoute);
    assert.equal((await post(editRoute, editFields, "COMPLETED")).status, 303);
    assert.equal((await db.invoice.findUniqueOrThrow({ where: { id: invoice.id } })).amountPaid.toString(), "100.25");
    assert.equal((await post(editRoute, editFields, "COMPLETED")).status, 303);
    assert.ok((await post(editRoute, editFields, "FAILED", { requestId: randomUUID() })).headers.get("location")?.includes("error="));
    assert.equal((await post(editRoute, await fields(editRoute), "REFUNDED")).status, 303);
    assert.equal((await db.invoice.findUniqueOrThrow({ where: { id: invoice.id } })).balanceDue.toString(), "1000");
    assert.equal(await db.paymentRevision.count({ where: { paymentId: id } }), 3);
    assert.ok((await http(`/payments/${id}`).then(r => r.text())).includes("Retained payment history"));
    assert.ok((await http("/payments/reconciliation").then(r => r.text())).includes("Historical difference: review required"));
    assert.ok((await http(`/jobs/${job.id}`).then(r => r.text())).includes("Payment reconciliation required"));
    assert.equal((await db.job.findUniqueOrThrow({ where: { id: job.id } })).amountPaid.toString(), "777");
    await db.membership.updateMany({ where: { userId: owner.id }, data: { status: "DISABLED" } });
    const denied = await http(`/payments/${id}`), deniedHtml = await denied.text();
    assert.ok([303, 307].includes(denied.status) || deniedHtml.includes("NEXT_REDIRECT")); assert.ok(!deniedHtml.includes(invoice.invoiceNumber));
    console.log("PASS: real payment create/edit/refund forms, exact cents, retry/stale protection, retained history, reconciliation warning and revoked denial.");
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
