import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import type { AiRuntimeDependencies } from "../lib/ai";
import { draftReportGuide, reportGuideAvailability, reviewGuideTask } from "../lib/report-guide";
import {
  buildReportGuideBrain,
  reportGuideContextSchema,
  reportGuidePrompt,
  type ReportGuideBrainInput,
} from "../lib/report-guide-brain";

const db = new PrismaClient({ log: [] });
const target = new URL(process.env.DATABASE_URL!);
assert.equal(target.hostname, "127.0.0.1");
assert.equal(target.pathname, "/flipside_migration_report-guide");

const ownerId = "guide-owner";
const adminId = "guide-admin";
const revokedId = "guide-revoked";
const foreignId = "guide-foreign";
let providerId = "";
let jobId = "";
let secondJobId = "";
let foreignJobId = "";
let legacyTaskId = "";

before(async () => {
  await db.organization.createMany({ data: [
    { id: "flipside-org", name: "Report guide fixture" },
    { id: "foreign-org", name: "Foreign report guide fixture" },
  ] });
  for (const [id, role, organizationId, status] of [
    [ownerId, "OWNER", "flipside-org", "ACTIVE"],
    [adminId, "ADMIN", "flipside-org", "ACTIVE"],
    [revokedId, "OWNER", "flipside-org", "DISABLED"],
    [foreignId, "OWNER", "foreign-org", "ACTIVE"],
  ] as const) {
    await db.user.create({ data: {
      id, email: `${id}@example.invalid`, role, organizationId,
      memberships: { create: { organizationId, role, status } },
    } });
  }
  await db.aiAgent.create({ data: {
    id: "guide-agent", organizationId: "flipside-org", agentName: "Report guide",
    roleName: "Client update drafting guide", purpose: "Synthetic guide tests",
    guardrails: "Draft only", workflowKey: "weekly-report-guide", configVersion: 1,
    configuration: { authority: "draft-only" },
  } });
  const legacyAgent = await db.aiAgent.create({ data: {
    organizationId: "flipside-org", agentName: "Legacy assistant", roleName: "Legacy",
    purpose: "Must remain unchanged", guardrails: "Retain this record",
  } });
  const legacyTask = await db.aiTask.create({ data: {
    organizationId: "flipside-org", agentId: legacyAgent.id, taskName: "Legacy task",
    workflowArea: "legacy-workflow", status: "QUEUED", prompt: "Retain legacy prompt",
    resultSummary: "Retain legacy result",
  } });
  legacyTaskId = legacyTask.id;
  providerId = (await db.aiProviderConfig.create({ data: {
    organizationId: "flipside-org", provider: "OPENAI", displayName: "Synthetic provider",
    enabled: true, defaultModel: "gpt-4o-mini", apiKeySecretRef: "synthetic-test-secret",
    allowClientData: true, dataRetentionMode: "standard",
  } })).id;
  jobId = (await db.job.create({ data: { organizationId: "flipside-org", jobName: "Synthetic kitchen" } })).id;
  secondJobId = (await db.job.create({ data: { organizationId: "flipside-org", jobName: "Synthetic bath" } })).id;
  foreignJobId = (await db.job.create({ data: { organizationId: "foreign-org", jobName: "Foreign job" } })).id;
  await db.fieldReport.createMany({ data: [
    { jobId, reportDate: new Date("2026-09-14T00:00:00.000Z"), crewSummary: "Safe crew", workCompleted: "Installed the client-approved cabinet boxes.", clientVisible: true },
    { jobId, reportDate: new Date("2026-09-20T00:00:00.000Z"), crewSummary: "Safe crew", workCompleted: "Completed the visible trim pass.", clientVisible: true },
    { jobId, reportDate: new Date("2026-09-18T00:00:00.000Z"), crewSummary: "PRIVATE CREW SECRET", workCompleted: "PRIVATE REPORT SECRET", blockers: "PRIVATE BLOCKER SECRET", clientVisible: false },
    { jobId, reportDate: new Date("2026-09-13T00:00:00.000Z"), crewSummary: "Old crew", workCompleted: "OUT OF WEEK SECRET", clientVisible: true },
    { jobId: foreignJobId, reportDate: new Date("2026-09-18T00:00:00.000Z"), crewSummary: "Foreign crew", workCompleted: "FOREIGN JOB SECRET", clientVisible: true },
  ] });
});

after(() => db.$disconnect());

function runtime(text = "Cabinet boxes and the visible trim pass were completed. The client needs to select the replacement pull.") {
  let calls = 0;
  const prompts: string[] = [];
  const dependencies: AiRuntimeDependencies = {
    async getProvider(organizationId) {
      assert.equal(organizationId, "flipside-org");
      return { id: providerId, provider: "OPENAI", defaultModel: "gpt-4o-mini", apiKeySecretRef: "synthetic-test-secret", monthlyBudgetCents: null, allowClientData: true, dataRetentionMode: "standard" };
    },
    async getRecordedCostCents() { return 0; },
    async recordUsage(data) { await db.aiUsageLog.create({ data }); },
    async fetch(_input, init) {
      calls += 1;
      const body = JSON.parse(String(init?.body));
      prompts.push(body.messages[0].content);
      return new Response(JSON.stringify({ choices: [{ message: { content: text } }], usage: { prompt_tokens: 31, completion_tokens: 17 } }), { status: 200, headers: { "content-type": "application/json" } });
    },
  };
  return { dependencies, prompts, calls: () => calls };
}

const draftInput = (changes: Record<string, unknown> = {}) => ({
  requestId: randomUUID(), jobId, weekEnding: "2026-09-20",
  workCompleted: "Staff supplied a touch-up observation.",
  issuesFound: "One pull remains backordered.",
  decisionsNeeded: "Select the replacement pull.",
  nextWeekPlan: "Continue trim work next week.",
  ...changes,
});

function brainFixture(): ReportGuideBrainInput {
  return {
    organizationId: "flipside-org",
    actorId: "guide-owner",
    actorRole: "OWNER",
    requestId: randomUUID(),
    jobId: "guide-job",
    weekEnding: "2026-09-20",
    evidence: {
      jobId: "guide-job",
      jobName: "Synthetic kitchen",
      range: {
        timeZone: "America/Chicago",
        startDate: "2026-09-14",
        endDate: "2026-09-20",
        startInclusive: "2026-09-14T00:00:00.000Z",
        endExclusive: "2026-09-21T00:00:00.000Z",
      },
      draft: { workCompleted: "2026-09-18: Installed the reviewed cabinet boxes." },
      sources: [{
        type: "FIELD_REPORT",
        id: "visible-report",
        date: "2026-09-18",
        label: "Client-visible field report",
        clientSafeText: "Installed the reviewed cabinet boxes.",
      }],
      missingCoverage: ["Task records are excluded because completion evidence is unavailable."],
    },
    staffInput: {
      workCompleted: "Staff observed touch-up work in progress.",
      issuesFound: "Backordered pull remains unresolved.",
      decisionsNeeded: "Client selection is needed for the replacement pull.",
      nextWeekPlan: "Plan is to continue trim work.",
    },
    corrections: [{
      id: "reviewed-correction",
      jobId: "guide-job",
      scope: "JOB",
      category: "terminology",
      instruction: "Use cabinet pull instead of hardware knob.",
      reviewedById: "guide-owner",
      reviewedAt: "2026-09-19T12:00:00.000Z",
    }],
    capability: { agentActive: true, providerConfigured: true, clientDataAllowed: true, budgetAvailable: true },
  };
}

test("the safety membrane and twelve functional modules retain real outputs that feed the prompt", () => {
  const input = brainFixture();
  const brain = buildReportGuideBrain(input);
  const expected = [
    "membrane", "vitality", "homeostasis", "perception", "attention", "memory",
    "semanticWorldModel", "threatIntegrity", "executiveJudgment", "actionAuthority",
    "calibration", "socialIdentity", "metacognition",
  ];
  assert.deepEqual(Object.keys(brain), expected);
  for (const key of expected) {
    const module = brain[key as keyof typeof brain];
    assert.ok(module.outputs && Object.keys(module.outputs).length > 0, `${key} must retain structured outputs`);
    assert.ok(Array.isArray(module.failureSignals), `${key} must expose failure signals`);
    assert.ok(Array.isArray(module.feeds), `${key} must declare downstream feeds`);
  }
  assert.equal(brain.membrane.outputs.authority, "DRAFT_ONLY");
  assert.deepEqual(brain.perception.outputs.staffSources.map(source => source.field),
    ["workCompleted", "issuesFound", "decisionsNeeded", "nextWeekPlan"]);
  assert.deepEqual(brain.threatIntegrity.outputs.allowedSourceIds, ["visible-report"]);
  assert.deepEqual(brain.metacognition.outputs.inferred, []);

  const context = reportGuideContextSchema.parse({
    configurationVersion: 1,
    workflowKey: "weekly-report-guide",
    organizationId: input.organizationId,
    actorId: input.actorId,
    jobId: input.jobId,
    weekEnding: input.weekEnding,
    sourceDigest: "a".repeat(64),
    evidence: input.evidence,
    staffInput: input.staffInput,
    brain,
    appliedCorrectionIds: ["reviewed-correction"],
  });
  const prompt = reportGuidePrompt(context);
  assert.match(prompt, /Installed the reviewed cabinet boxes/);
  assert.match(prompt, /Staff observed touch-up work in progress/);
  assert.match(prompt, /Use cabinet pull instead of hardware knob/);
  assert.match(prompt, /requires an explicit inspection record/);
  assert.match(prompt, /Task records are excluded/);
  assert.doesNotMatch(prompt, /private crew secret/i);
});

test("drafting uses an explicit owned job and week, labels staff input, excludes private data, and records task-scoped usage", async () => {
  const available = await reportGuideAvailability(db, ownerId);
  assert.equal(available.available, true);
  assert.equal(available.canRememberCompanyStyle, true);
  assert.equal((await reportGuideAvailability(db, adminId)).canRememberCompanyStyle, false);
  await assert.rejects(() => reportGuideAvailability(db, revokedId), /access denied/i);
  await assert.rejects(() => draftReportGuide(db, ownerId, draftInput({ jobId: foreignJobId }), runtime().dependencies), /not found/i);
  await assert.rejects(() => draftReportGuide(db, foreignId, draftInput(), runtime().dependencies), /access denied/i);

  const mock = runtime();
  const input = draftInput();
  const result = await draftReportGuide(db, ownerId, input, mock.dependencies);
  assert.equal(result.state, "ready");
  assert.equal(mock.calls(), 1);
  assert.match(mock.prompts[0], /Installed the client-approved cabinet boxes/);
  assert.match(mock.prompts[0], /Completed the visible trim pass/);
  assert.match(mock.prompts[0], /Staff supplied a touch-up observation/);
  for (const excluded of ["PRIVATE CREW SECRET", "PRIVATE REPORT SECRET", "PRIVATE BLOCKER SECRET", "OUT OF WEEK SECRET", "FOREIGN JOB SECRET"]) {
    assert.doesNotMatch(mock.prompts[0], new RegExp(excluded));
  }
  const task = await db.aiTask.findUniqueOrThrow({ where: { id: result.taskId } });
  const context = task.context as Record<string, any>;
  assert.equal(context.jobId, jobId);
  assert.equal(context.weekEnding, "2026-09-20");
  assert.equal(context.staffInput.issuesFound, "One pull remains backordered.");
  assert.deepEqual(context.evidence.sources.map((source: { id: string }) => source.id).sort(),
    (await db.fieldReport.findMany({ where: { jobId, clientVisible: true, reportDate: { gte: new Date("2026-09-14T00:00:00.000Z"), lt: new Date("2026-09-21T00:00:00.000Z") } }, select: { id: true } })).map(source => source.id).sort());
  assert.ok(context.brain.perception.outputs.staffSources.every((source: { type: string; actorId: string }) => source.type === "STAFF_INPUT" && source.actorId === ownerId));
  const usage = await db.aiUsageLog.findMany({ where: { taskId: result.taskId } });
  assert.equal(usage.length, 1);
  assert.equal(usage[0].organizationId, "flipside-org");
  assert.equal(usage[0].workflowArea, "weekly-report-guide");
  assert.equal(usage[0].inputTokens, 31);
  assert.equal(usage[0].outputTokens, 17);
});

test("a request calls the provider once; retries retain ready, in-progress, and failed outcomes", async () => {
  const mock = runtime();
  const input = draftInput();
  const concurrent = await Promise.all(Array.from({ length: 4 }, () => draftReportGuide(db, ownerId, input, mock.dependencies)));
  assert.equal(mock.calls(), 1);
  assert.equal(new Set(concurrent.map(item => item.taskId)).size, 1);
  assert.ok(concurrent.every(item => item.state === "ready" || item.state === "pending"));
  const replay = await draftReportGuide(db, ownerId, input, mock.dependencies);
  assert.equal(replay.state, "ready");
  assert.equal(mock.calls(), 1);
  assert.equal(await db.aiUsageLog.count({ where: { taskId: replay.taskId } }), 1);
  await assert.rejects(() => draftReportGuide(db, ownerId, { ...input, issuesFound: "Different replay input" }, mock.dependencies), /different Report guide inputs/i);
  assert.equal(mock.calls(), 1);

  let entered!: () => void;
  let release!: () => void;
  const enteredPromise = new Promise<void>(resolve => { entered = resolve; });
  const releasePromise = new Promise<void>(resolve => { release = resolve; });
  const delayed = runtime();
  const originalFetch = delayed.dependencies.fetch;
  delayed.dependencies.fetch = async (...args) => { entered(); await releasePromise; return originalFetch(...args); };
  const pendingInput = draftInput();
  const first = draftReportGuide(db, ownerId, pendingInput, delayed.dependencies);
  await enteredPromise;
  const pending = await draftReportGuide(db, ownerId, pendingInput, delayed.dependencies);
  assert.equal(pending.state, "pending");
  assert.equal(delayed.calls(), 0);
  release();
  assert.equal((await first).state, "ready");
  assert.equal(delayed.calls(), 1);

  let failures = 0;
  const failedRuntime = runtime();
  failedRuntime.dependencies.fetch = async () => { failures += 1; return new Response("provider unavailable", { status: 503 }); };
  const failedInput = draftInput();
  const failed = await draftReportGuide(db, ownerId, failedInput, failedRuntime.dependencies);
  assert.equal(failed.state, "failed");
  assert.equal(failed.manualFallback, true);
  assert.equal(failed.requiresNewRequestId, true);
  assert.match(failed.error, /continue with the report form/i);
  const failedReplay = await draftReportGuide(db, ownerId, failedInput, failedRuntime.dependencies);
  assert.equal(failedReplay.state, "failed");
  assert.equal(failedReplay.replayed, true);
  assert.equal(failures, 1);
  assert.equal(await db.aiUsageLog.count({ where: { taskId: failed.taskId } }), 0);
});

test("empty staff input can use server evidence, while truly unsupported input fails closed without a provider call", async () => {
  const withEvidence = runtime("Only the client-visible cabinet and trim work is included.");
  const supported = await draftReportGuide(db, ownerId, draftInput({ workCompleted: "", issuesFound: "", decisionsNeeded: "", nextWeekPlan: "" }), withEvidence.dependencies);
  assert.equal(supported.state, "ready");
  assert.equal(withEvidence.calls(), 1);
  const withoutEvidence = runtime("INVENTED UNSUPPORTED SUMMARY");
  const unsupported = await draftReportGuide(db, ownerId, draftInput({ jobId: secondJobId, workCompleted: "", issuesFound: "", decisionsNeeded: "", nextWeekPlan: "" }), withoutEvidence.dependencies);
  assert.equal(unsupported.state, "failed");
  assert.equal(unsupported.manualFallback, true);
  assert.equal(withoutEvidence.calls(), 0);
  assert.equal(await db.aiUsageLog.count({ where: { taskId: unsupported.taskId } }), 0);
});

async function readyTask(actorId = ownerId, targetJobId = jobId) {
  const generated = await draftReportGuide(db, actorId, draftInput({ jobId: targetJobId }), runtime().dependencies);
  assert.equal(generated.state, "ready");
  return generated;
}

async function savedReport(targetJobId: string, summary: string) {
  return db.weeklyReport.create({ data: {
    jobId: targetJobId, weekEnding: new Date("2026-09-20T00:00:00.000Z"),
    workCompleted: "Reviewed weekly work.", clientSummary: summary,
  } });
}

test("explicit review is atomic with report saving, and edits alone create no reusable correction", async () => {
  const generated = await readyTask();
  const report = await savedReport(jobId, "Earlier summary");
  const finalSummary = "Staff reviewed the cabinet and trim summary.";
  await db.$transaction(async tx => {
    await tx.weeklyReport.update({ where: { id: report.id }, data: { clientSummary: finalSummary } });
    await reviewGuideTask(tx, ownerId, { taskId: generated.taskId, reportId: report.id, jobId, weekEnding: "2026-09-20", finalSummary });
  });
  const reviewed = await db.aiTask.findUniqueOrThrow({ where: { id: generated.taskId } });
  assert.equal(reviewed.status, "COMPLETED");
  assert.equal(reviewed.finalSummary, finalSummary);
  assert.equal((reviewed.reviewMetadata as Record<string, unknown>).correction, null);
  assert.equal(await db.auditEvent.count({ where: { action: "REPORT_GUIDE_REVIEWED", entityId: generated.taskId } }), 1);
  const next = await readyTask();
  const nextContext = (await db.aiTask.findUniqueOrThrow({ where: { id: next.taskId } })).context as Record<string, any>;
  assert.doesNotMatch(JSON.stringify(nextContext.appliedCorrectionIds), new RegExp(generated.taskId));

  const rollbackTask = await readyTask();
  const rollbackReport = await savedReport(jobId, "Summary before failed review");
  await db.$executeRawUnsafe(`ALTER TABLE "AuditEvent" ADD CONSTRAINT report_guide_test_block CHECK (action <> 'REPORT_GUIDE_REVIEWED') NOT VALID`);
  try {
    await assert.rejects(() => db.$transaction(async tx => {
      await tx.weeklyReport.update({ where: { id: rollbackReport.id }, data: { clientSummary: "Summary that must roll back" } });
      await reviewGuideTask(tx, ownerId, { taskId: rollbackTask.taskId, reportId: rollbackReport.id, jobId, weekEnding: "2026-09-20", finalSummary: "Summary that must roll back" });
    }));
  } finally {
    await db.$executeRawUnsafe('ALTER TABLE "AuditEvent" DROP CONSTRAINT report_guide_test_block');
  }
  assert.equal((await db.weeklyReport.findUniqueOrThrow({ where: { id: rollbackReport.id } })).clientSummary, "Summary before failed review");
  assert.equal((await db.aiTask.findUniqueOrThrow({ where: { id: rollbackTask.taskId } })).status, "NEEDS_REVIEW");
});

test("reviewed corrections obey job/company scope and owner/company authority", async () => {
  const jobCorrectionTask = await readyTask();
  const jobReport = await savedReport(jobId, "Use cabinet pull terminology.");
  await db.$transaction(tx => reviewGuideTask(tx, ownerId, {
    taskId: jobCorrectionTask.taskId, reportId: jobReport.id, jobId, weekEnding: "2026-09-20",
    finalSummary: "Use cabinet pull terminology.",
    correction: { scope: "JOB", category: "terminology", instruction: "Use cabinet pull instead of hardware knob." },
  }));
  const sameJob = await readyTask(ownerId, jobId);
  const otherJobBeforeCompany = await readyTask(ownerId, secondJobId);
  const sameContext = (await db.aiTask.findUniqueOrThrow({ where: { id: sameJob.taskId } })).context as Record<string, any>;
  const otherContext = (await db.aiTask.findUniqueOrThrow({ where: { id: otherJobBeforeCompany.taskId } })).context as Record<string, any>;
  assert.ok(sameContext.appliedCorrectionIds.includes(jobCorrectionTask.taskId));
  assert.ok(!otherContext.appliedCorrectionIds.includes(jobCorrectionTask.taskId));

  const companyTask = await readyTask();
  const companyReport = await savedReport(jobId, "Keep the summary brief and direct.");
  await db.$transaction(tx => reviewGuideTask(tx, ownerId, {
    taskId: companyTask.taskId, reportId: companyReport.id, jobId, weekEnding: "2026-09-20",
    finalSummary: "Keep the summary brief and direct.",
    correction: { scope: "COMPANY", category: "detail", instruction: "Keep client summaries brief and direct." },
  }));
  const otherJobAfterCompany = await readyTask(ownerId, secondJobId);
  const companyContext = (await db.aiTask.findUniqueOrThrow({ where: { id: otherJobAfterCompany.taskId } })).context as Record<string, any>;
  assert.ok(companyContext.appliedCorrectionIds.includes(companyTask.taskId));
  assert.ok(!companyContext.appliedCorrectionIds.includes(jobCorrectionTask.taskId));

  const adminTask = await readyTask(adminId, jobId);
  const adminReport = await savedReport(jobId, "Admin reviewed summary.");
  await assert.rejects(() => db.$transaction(tx => reviewGuideTask(tx, adminId, {
    taskId: adminTask.taskId, reportId: adminReport.id, jobId, weekEnding: "2026-09-20",
    finalSummary: "Admin reviewed summary.",
    correction: { scope: "COMPANY", category: "formatting", instruction: "Always use one paragraph." },
  })), /only an owner/i);
  await assert.rejects(() => db.$transaction(tx => reviewGuideTask(tx, foreignId, {
    taskId: adminTask.taskId, reportId: adminReport.id, jobId, weekEnding: "2026-09-20", finalSummary: "Admin reviewed summary.",
  })), /access denied/i);
  await assert.rejects(() => db.$transaction(tx => reviewGuideTask(tx, revokedId, {
    taskId: adminTask.taskId, reportId: adminReport.id, jobId, weekEnding: "2026-09-20", finalSummary: "Admin reviewed summary.",
  })), /access denied/i);
});

test("generation and review never publish, send, or modify legacy AI records", async () => {
  assert.equal(await db.weeklyReportPublication.count(), 0);
  assert.equal(await db.weeklyReport.count({ where: { sentAt: { not: null } } }), 0);
  const legacy = await db.aiTask.findUniqueOrThrow({ where: { id: legacyTaskId } });
  assert.equal(legacy.taskName, "Legacy task");
  assert.equal(legacy.workflowArea, "legacy-workflow");
  assert.equal(legacy.status, "QUEUED");
  assert.equal(legacy.prompt, "Retain legacy prompt");
  assert.equal(legacy.resultSummary, "Retain legacy result");
  assert.equal(legacy.workflowKey, null);
  assert.equal(legacy.requestId, null);
  assert.equal(legacy.context, null);
  assert.equal(legacy.draft, null);
  assert.equal(legacy.reviewMetadata, null);
  assert.equal(await db.aiTask.count({ where: { workflowArea: "legacy-workflow" } }), 1);
});
