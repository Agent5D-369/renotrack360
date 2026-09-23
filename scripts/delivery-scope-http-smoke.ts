import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";

async function main() {
  const cfg = JSON.parse(readFileSync(".preservation/media-http-env.json", "utf8"));
  const target = new URL(cfg.DATABASE_URL);
  assert.equal(target.hostname, "127.0.0.1");
  assert.equal(target.pathname, "/flipside_restore_media_v2");
  const db = new PrismaClient({ datasources: { db: { url: cfg.DATABASE_URL } }, log: [] });
  const origin = "http://localhost:3010", suffix = randomUUID(), marker = `FOREIGN_DELIVERY_${suffix}`;
  try {
    const owner = await db.user.findUniqueOrThrow({ where: { id: "report-wave-local-owner" } });
    const org = await db.organization.create({ data: { name: marker } });
    const foreign = await db.job.create({ data: { organizationId: org.id, jobName: marker } });
    const own = await db.job.create({ data: { organizationId: "flipside-org", jobName: `Local delivery ${suffix}` } });
    const otherOwn = await db.job.create({ data: { organizationId: "flipside-org", jobName: `Other delivery ${suffix}` } });
    const phase = await db.renovationPhase.create({ data: { jobId: own.id, phaseNumber: 1, phaseName: "Synthetic preparation" } });
    const wrongPhase = await db.renovationPhase.create({ data: { jobId: otherOwn.id, phaseNumber: 1, phaseName: "Other job phase" } });
    const foreignTask = await db.task.create({ data: { jobId: foreign.id, taskName: marker } });
    const foreignReport = await db.fieldReport.create({ data: { jobId: foreign.id, crewSummary: marker, workCompleted: marker } });
    const otherReport = await db.fieldReport.create({ data: { jobId: otherOwn.id, crewSummary: "Other crew", workCompleted: "Other job work" } });
    const cookie = "next-auth.session-token=" + await encode({ secret: cfg.NEXTAUTH_SECRET, token: { id: owner.id, sub: owner.id, email: owner.email } });
    const http = (path: string, init: RequestInit = {}) => fetch(origin + path, { ...init, redirect: "manual", headers: { ...init.headers, cookie } });
    const hidden = async (path: string) => {
      const response = await http(path), html = await response.text();
      assert.ok(response.status === 404 || html.includes("NEXT_HTTP_ERROR_FALLBACK;404"), path);
      assert.ok(!html.includes(marker), `${path} disclosed foreign content`);
    };
    for (const path of ["/home", "/operations", "/field", "/jobs", "/jobs/new"]) {
      const response = await http(path); assert.equal(response.status, 200, path);
      assert.ok(!(await response.text()).includes(marker), path);
    }
    const detailPaths = ["", "/edit", "/briefing", "/budget", "/scope", "/logs", "/logs/new", "/gallery", "/closeout", "/feedback"];
    for (const path of detailPaths) {
      await hidden(`/jobs/${foreign.id}${path}`);
      assert.equal((await http(`/jobs/${own.id}${path}`)).status, 200, `Owned ${path}`);
    }
    await hidden(`/jobs/${own.id}/logs/${foreignReport.id}`);
    await hidden(`/jobs/${own.id}/logs/${otherReport.id}`);
    for (const route of ["gallery-pdf", "closeout-pdf", "briefing-pdf"]) {
      const init: RequestInit = route === "briefing-pdf" ? { method: "POST", body: new FormData() } : {};
      assert.equal((await http(`/api/jobs/${foreign.id}/${route}`, init)).status, 404, route);
      const valid = await http(`/api/jobs/${own.id}/${route}`, init);
      assert.equal(valid.status, 200, route); assert.ok(valid.headers.get("content-type")?.includes("application/pdf"));
      assert.ok((await valid.arrayBuffer()).byteLength > 100);
    }
    const manifest = JSON.parse(readFileSync(".next/server/server-reference-manifest.json", "utf8")) as { node: Record<string, { exportedName?: string }> };
    const submit = async (name: string, values: Record<string, string>, path = `/jobs/${own.id}`) => {
      const id = Object.entries(manifest.node).find(([, value]) => value.exportedName === name)?.[0];
      assert.ok(id, name);
      const body = new FormData(); body.set(`$ACTION_ID_${id}`, "");
      for (const [key, value] of Object.entries(values)) body.set(key, value);
      const response = await http(path, { method: "POST", headers: { origin }, body }); await response.text();
      return response;
    };
    const taskValues = { taskName: `Task ${suffix}`, jobId: own.id, phaseId: phase.id, status: "NOT_STARTED", priority: "MEDIUM" };
    for (const invalid of [{ ...taskValues, jobId: foreign.id }, { ...taskValues, phaseId: wrongPhase.id }]) {
      await submit("createTask", invalid);
      assert.equal(await db.task.count({ where: { taskName: taskValues.taskName } }), 0);
    }
    assert.equal((await submit("createTask", taskValues)).status, 303);
    const created = await db.task.findFirstOrThrow({ where: { taskName: taskValues.taskName } });
    assert.equal(created.jobId, own.id); assert.equal(created.phaseId, phase.id);
    await submit("completeTask", { taskId: foreignTask.id, returnTo: "/field" });
    assert.deepEqual(await db.task.findUniqueOrThrow({ where: { id: foreignTask.id } }), foreignTask);
    assert.equal((await submit("completeTask", { taskId: created.id, returnTo: "/field" })).status, 303);
    assert.equal((await db.task.findUniqueOrThrow({ where: { id: created.id } })).status, "COMPLETE");
    const reportValues = { jobId: own.id, crewSummary: `Crew ${suffix}`, workCompleted: "Synthetic owned field work", reportDate: "2026-09-22", clientVisible: "false" };
    await submit("createFieldReport", { ...reportValues, jobId: foreign.id });
    assert.equal(await db.fieldReport.count({ where: { crewSummary: reportValues.crewSummary } }), 0);
    assert.equal((await submit("createFieldReport", reportValues)).status, 303);
    const report = await db.fieldReport.findFirstOrThrow({ where: { crewSummary: reportValues.crewSummary } });
    assert.equal(report.jobId, own.id); assert.equal(report.clientVisible, false);
    assert.equal((await http(`/jobs/${own.id}/logs/${report.id}`)).status, 200);
    writeFileSync(".preservation/delivery-scope-local-http.json", JSON.stringify({ checkedAt: new Date().toISOString(), workspacePages: 5, jobDetailPairs: detailPaths.length, nestedReportBinding: true, pdfPairs: 3, taskCreateAndComplete: true, foreignAndMismatchedTaskDenied: true, fieldReportCreateAndForeignDenial: true, productionMutations: false }, null, 2));
    console.log("PASS: delivery pages, nested reports, PDFs, task actions and field report submissions respect company/job boundaries.");
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Delivery HTTP verification failed"); process.exitCode = 1; });
