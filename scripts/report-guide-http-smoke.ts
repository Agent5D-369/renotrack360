import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";
import type { AiRuntimeDependencies } from "../lib/ai";
import { draftReportGuide } from "../lib/report-guide";

type LocalConfig = { DATABASE_URL?: string; NEXTAUTH_SECRET?: string };

async function main() {
  const config = JSON.parse(await readFile(".preservation/media-http-env.json", "utf8")) as LocalConfig;
  assert.ok(config.DATABASE_URL && config.NEXTAUTH_SECRET, "Local verification configuration is incomplete.");
  const target = new URL(config.DATABASE_URL);
  assert.equal(target.hostname, "127.0.0.1");
  assert.equal(target.pathname, "/flipside_restore_media_v2");

  const origin = process.env.ACCESS_SMOKE_ORIGIN ?? "http://127.0.0.1:3010";
  assert.ok(["127.0.0.1", "localhost"].includes(new URL(origin).hostname));
  const db = new PrismaClient({ datasources: { db: { url: config.DATABASE_URL } }, log: [] });
  const ownerId = "report-wave-local-owner";
  const jobId = "report-wave-local-job";
  const sourceId = "report-wave-visible";
  const weekEnding = "2026-09-20";
  const request = {
    requestId: randomUUID(),
    jobId,
    weekEnding,
    workCompleted: "",
    issuesFound: "",
    decisionsNeeded: "",
    nextWeekPlan: "",
  };

  try {
    const owner = await db.user.findUniqueOrThrow({
      where: { id: ownerId },
      include: { memberships: { where: { organizationId: "flipside-org" } } },
    });
    assert.equal(owner.organizationId, "flipside-org");
    assert.equal(owner.role, "OWNER");
    assert.ok(owner.memberships.some(membership => membership.status === "ACTIVE" && membership.role === "OWNER"));
    const job = await db.job.findUniqueOrThrow({ where: { id: jobId } });
    assert.equal(job.organizationId, "flipside-org");
    const source = await db.fieldReport.findUniqueOrThrow({ where: { id: sourceId } });
    assert.equal(source.jobId, jobId);
    assert.equal(source.clientVisible, true);
    assert.equal(source.reportDate.toISOString().slice(0, 10), "2026-09-14");
    const sideEffectsBefore = {
      publications: await db.weeklyReportPublication.count(),
      sentReports: await db.weeklyReport.count({ where: { sentAt: { not: null } } }),
    };

    await db.aiProviderConfig.updateMany({ where: { organizationId: "flipside-org" }, data: { enabled: false } });
    const provider = await db.aiProviderConfig.upsert({
      where: { organizationId_provider: { organizationId: "flipside-org", provider: "OPENAI" } },
      update: {
        displayName: "Local Report guide mock",
        enabled: true,
        defaultModel: "gpt-4o-mini",
        apiKeySecretRef: "env:RENOTRACK_AI_REPORT_GUIDE_LOCAL_FAKE",
        allowClientData: true,
        dataRetentionMode: "standard",
        monthlyBudgetCents: null,
        notes: "Local-only mocked Report guide verification. No provider call is permitted.",
      },
      create: {
        organizationId: "flipside-org",
        provider: "OPENAI",
        displayName: "Local Report guide mock",
        enabled: true,
        defaultModel: "gpt-4o-mini",
        apiKeySecretRef: "env:RENOTRACK_AI_REPORT_GUIDE_LOCAL_FAKE",
        allowClientData: true,
        dataRetentionMode: "standard",
        notes: "Local-only mocked Report guide verification. No provider call is permitted.",
      },
    });

    let mockCalls = 0;
    const dependencies: AiRuntimeDependencies = {
      async getProvider(organizationId) {
        assert.equal(organizationId, "flipside-org");
        return {
          id: provider.id,
          provider: "OPENAI",
          defaultModel: "gpt-4o-mini",
          apiKeySecretRef: "local-only-mocked-key",
          monthlyBudgetCents: null,
          allowClientData: true,
          dataRetentionMode: "standard",
        };
      },
      async getRecordedCostCents(providerId) {
        assert.equal(providerId, provider.id);
        return 0;
      },
      async recordUsage(data) {
        await db.aiUsageLog.create({ data });
      },
      async fetch(_input, init) {
        mockCalls += 1;
        const payload = JSON.parse(String(init?.body));
        const prompt = String(payload.messages?.[0]?.content ?? "");
        assert.match(prompt, /Installed synthetic shower backing for local verification/);
        assert.doesNotMatch(prompt, /PRIVATE (?:CREW|BLOCKER|WORK) SENTINEL/);
        return new Response(JSON.stringify({
          choices: [{ message: { content: "Synthetic shower backing was installed during this reporting period." } }],
          usage: { prompt_tokens: 23, completion_tokens: 11 },
        }), { status: 200, headers: { "content-type": "application/json" } });
      },
    };

    const localSecretName = "RENOTRACK_AI_REPORT_GUIDE_LOCAL_FAKE";
    const priorLocalSecret = process.env[localSecretName];
    process.env[localSecretName] = "local-only-mocked-key";
    let prepared: Awaited<ReturnType<typeof draftReportGuide>>;
    try {
      prepared = await draftReportGuide(db, ownerId, request, dependencies);
    } finally {
      if (priorLocalSecret === undefined) delete process.env[localSecretName];
      else process.env[localSecretName] = priorLocalSecret;
    }
    assert.equal(prepared.state, "ready");
    assert.equal(mockCalls, 1);
    assert.ok(prepared.sources.some(item => item.id === sourceId));
    assert.equal(await db.aiTask.count({ where: { organizationId: "flipside-org", requestId: request.requestId } }), 1);
    assert.equal(await db.aiUsageLog.count({ where: { taskId: prepared.taskId } }), 1);
    assert.deepEqual({
      publications: await db.weeklyReportPublication.count(),
      sentReports: await db.weeklyReport.count({ where: { sentAt: { not: null } } }),
    }, sideEffectsBefore);

    const cookie = "next-auth.session-token=" + await encode({
      secret: config.NEXTAUTH_SECRET,
      token: { id: owner.id, sub: owner.id, email: owner.email },
    });
    const post = (authenticated: boolean) => fetch(origin + "/api/weekly-reports/guide/draft", {
      method: "POST",
      redirect: "manual",
      headers: {
        "content-type": "application/json",
        ...(authenticated ? { cookie } : {}),
      },
      body: JSON.stringify(request),
    });
    let response = await post(true);
    assert.equal(response.status, 200, await response.clone().text());
    assert.match(response.headers.get("cache-control") ?? "", /private/);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
    const replay = await response.json();
    assert.equal(replay.state, "ready");
    assert.equal(replay.taskId, prepared.taskId);
    assert.equal(replay.status, "NEEDS_REVIEW");
    assert.ok(replay.sources.some((item: { id: string }) => item.id === sourceId));
    assert.ok(replay.clientSummary.includes("Synthetic shower backing"));
    assert.doesNotMatch(JSON.stringify(replay), /PRIVATE (?:CREW|BLOCKER|WORK) SENTINEL/);
    assert.equal(await db.aiTask.count({ where: { organizationId: "flipside-org", requestId: request.requestId } }), 1);
    assert.equal(await db.aiUsageLog.count({ where: { taskId: prepared.taskId } }), 1);

    response = await post(false);
    assert.ok(response.status === 401 || response.status === 307);
    await writeFile(".preservation/report-guide-local-http.json", JSON.stringify({
      checkedAt: new Date().toISOString(),
      origin,
      request,
      taskId: prepared.taskId,
      jobId,
      sourceId,
      authenticatedReplay: true,
      cachePrivateNoStore: true,
      retainedTaskCount: 1,
      retainedUsageCount: 1,
      mockProviderCalls: mockCalls,
      actualProviderCalls: 0,
      generatedOrSent: false,
    }, null, 2));
    console.log("PASS: retained mocked Report guide draft replayed through the authenticated local API with one safe source, private no-store caching, and no provider, publication, or send call.");
  } finally {
    await db.$disconnect();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : "Report guide HTTP smoke failed.");
  process.exitCode = 1;
});
