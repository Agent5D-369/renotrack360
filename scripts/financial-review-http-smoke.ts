import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { encode } from "next-auth/jwt";
async function main() {
  const url = process.env.PRESERVATION_TARGET_URL!, origin = process.env.ACCESS_SMOKE_ORIGIN || "http://localhost:3010";
  const target = new URL(url); assert.ok(["localhost", "127.0.0.1"].includes(target.hostname) && /^\/flipside_(restore|migration)_/.test(target.pathname));
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname)); assert.ok(process.env.NEXTAUTH_SECRET);
  const db = new PrismaClient({ datasources: { db: { url } }, log: [] }), suffix = randomBytes(12).toString("hex");
  try {
    const owner = await db.user.create({ data: { email: `finance-http-${suffix}@example.invalid`, role: "OWNER", organizationId: "flipside-org", memberships: { create: { organizationId: "flipside-org", role: "OWNER", status: "ACTIVE" } } } });
    const job = await db.job.create({ data: { jobName: `HTTP financial review ${suffix}`, organizationId: "flipside-org", contractAmount: "1000", amountPaid: "777", balanceDue: "223" } });
    const cookie = "next-auth.session-token=" + await encode({ secret: process.env.NEXTAUTH_SECRET!, token: { id: owner.id, sub: owner.id, email: owner.email } });
    const http = (route: string, options: RequestInit = {}) => fetch(origin + route, { ...options, redirect: "manual", headers: { ...options.headers, cookie } });
    const decode = (value: string) => value.replaceAll("&quot;", '"').replaceAll("&#x27;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
    const fields = async (route: string, marker: string) => {
      const r = await http(route); assert.equal(r.status, 200); const html = await r.text();
      const form = html.match(/<form\b[\s\S]*?<\/form>/g)?.find(value => value.includes(marker)); assert.ok(form, "Expected form " + marker);
      const values: Record<string, string> = {};
      for (const tag of form.match(/<input\b[^>]*>/g) ?? []) { if (!tag.includes('type="hidden"')) continue; const name = /name="([^"]+)"/.exec(tag)?.[1], value = /value="([^"]*)"/.exec(tag)?.[1] ?? ""; if (name) values[decode(name)] = decode(value); }
      assert.ok(Object.keys(values).some(name => name.startsWith("$ACTION_"))); return values;
    };
    const post = async (route: string, values: Record<string, string | Blob>) => {
      const body = new FormData(); Object.entries(values).forEach(([key, value]) => body.set(key, value));
      const r = await http(route, { method: "POST", body, headers: { origin } }); assert.equal(r.status, 303); assert.ok(!r.headers.get("location")?.includes("error="), r.headers.get("location") ?? "No redirect"); return r;
    };
    const reviewRoute = `/jobs/${job.id}/financial-review`;
    await post(reviewRoute, { ...await fields(reviewRoute, 'name="file"'), file: new File(["%PDF-1.4\nSynthetic HTTP fixture only\n%%EOF"], "review.pdf", { type: "application/pdf" }) });
    const asset = await db.fileAsset.findFirstOrThrow({ where: { entityId: job.id, entityType: "JOB" } });
    const reviewFields = await fields(reviewRoute, 'name="reviewedDigest"');
    const review = { ...reviewFields, sourceFileId: asset.id, requiredDeposit: "100", reviewReason: "Synthetic local owner review of complete contract and receipt evidence.", contractVerified: "on", receiptsComplete: "on" };
    await post(reviewRoute, review); await post(reviewRoute, review);
    assert.equal(await db.jobFinancialBaseline.count({ where: { jobId: job.id } }), 1);
    assert.equal((await db.job.findUniqueOrThrow({ where: { id: job.id } })).amountPaid.toString(), "0");
    const draftFields = await fields("/change-orders/new", 'name="requestId"');
    const created = await post("/change-orders/new", { ...draftFields, jobId: job.id, clientProfileId: "", priceSnapshotId: "", changeOrderTitle: "Synthetic HTTP credit", addedCost: "-25.50", addedTime: "0", reason: "Credit for specifically omitted test scope; no field work is authorized.", status: "DRAFT", fieldCondition: "PRIVATE FIELD NOTE", signatureApprovalNotes: "PRIVATE APPROVAL NOTE" });
    const id = /^\/change-orders\/([a-z0-9]+)\?/.exec(created.headers.get("location")!)?.[1]; assert.ok(id);
    const route = `/change-orders/${id}`;
    await post(route, await fields(route, "Issue reviewed scope and price"));
    const approval = await db.clientApproval.findFirstOrThrow({ where: { changeOrderId: id } });
    const before = await db.clientApproval.findUniqueOrThrow({ where: { id: approval.id } });
    const get = await fetch(origin + `/api/approve/${approval.token}`); assert.equal(get.status, 200); assert.equal(get.headers.get("cache-control"), "private, no-store");
    const data = await get.json(); assert.equal(data.addedCost, -25.5); assert.ok(data.reviewedDigest); assert.ok(!JSON.stringify(data).includes("PRIVATE")); assert.ok(!("smtpPassword" in data));
    assert.deepEqual(await db.clientApproval.findUniqueOrThrow({ where: { id: approval.id } }), before, "GET does not mutate approval");
    const response = { decision: "approved", signerName: "Synthetic Client", reviewed: true, reviewedDigest: data.reviewedDigest };
    const decisions = await Promise.all([1, 2, 3].map(() => fetch(origin + `/api/approve/${approval.token}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(response) })));
    decisions.forEach(r => assert.equal(r.status, 200));
    assert.equal(await db.appliedChangeOrder.count({ where: { changeOrderId: id } }), 1);
    const current = await db.job.findUniqueOrThrow({ where: { id: job.id } }); assert.equal(current.contractAmount.toString(), "974.5"); assert.equal(current.balanceDue.toString(), "974.5");
    const pdf = await http(`/api/jobs/${job.id}/closeout-pdf`); assert.equal(pdf.status, 200); assert.equal(pdf.headers.get("cache-control"), "private, no-store"); assert.ok((await pdf.arrayBuffer()).byteLength > 500);
    const changePdf = await http(`/api/pdf/change-order/${id}`); assert.equal(changePdf.status, 200);
    await writeFile(".preservation/financial-review-change.pdf", Buffer.from(await changePdf.arrayBuffer()));
    await writeFile(".preservation/financial-review-closeout.pdf", Buffer.from(await (await http(`/api/jobs/${job.id}/closeout-pdf`)).arrayBuffer()));
    const oversized = await fetch(origin + `/api/approve/${approval.token}`, { method: "POST", body: "x".repeat(17000) }); assert.equal(oversized.status, 413);
    assert.equal((await fetch(origin + reviewRoute, { redirect: "manual" })).status, 307);
    console.log("PASS: real PDF upload and owner-review forms, idempotent adoption, credit draft and issue forms, private read-only approval API, concurrent single application, closeout PDF and anonymous denial.");
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
