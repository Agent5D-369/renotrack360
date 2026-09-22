import { createHash } from "node:crypto";
import { Prisma, type AiTask, type PrismaClient } from "@prisma/client";
import { z } from "zod";
import { callLLM, callLLMWithDependencies, resolveAiSecretRef, type AiRuntimeDependencies } from "./ai";
import { weeklyReportInOrganization } from "./company-scope";
import { DEFAULT_ORG_ID } from "./constants";
import { assembleWeeklyReportEvidence, ReportEvidenceError, type WeeklyReportEvidence } from "./report-evidence";
import {
  buildReportGuideBrain,
  REPORT_GUIDE_CONFIGURATION_VERSION,
  REPORT_GUIDE_WORKFLOW_KEY,
  reportGuideContextSchema,
  reportGuideCorrectionSchema,
  reportGuideDraftSchema,
  reportGuidePrompt,
  reportGuideReviewMetadataSchema,
  reportGuideStaffInputSchema,
  type ApprovedGuideCorrection,
} from "./report-guide-brain";
import { findStaffRecord } from "./staff-record";

const dateOnly = /^\d{4}-\d{2}-\d{2}$/;
const draftRequestSchema = z.object({
  requestId: z.string().uuid(),
  jobId: z.string().min(1).max(128),
  weekEnding: z.string().regex(dateOnly),
  workCompleted: z.string().max(4_000).optional(),
  issuesFound: z.string().max(4_000).optional(),
  decisionsNeeded: z.string().max(4_000).optional(),
  nextWeekPlan: z.string().max(4_000).optional(),
}).strict();

const reviewInputSchema = z.object({
  taskId: z.string().min(1).max(128),
  reportId: z.string().min(1).max(128),
  jobId: z.string().min(1).max(128),
  weekEnding: z.string().regex(dateOnly),
  finalSummary: z.string().trim().min(1).max(8_000),
  correction: reportGuideCorrectionSchema.optional(),
}).strict();

export type ReportGuideDraftRequest = z.infer<typeof draftRequestSchema>;
export type ReportGuideReviewInput = z.infer<typeof reviewInputSchema>;
type GuideDb = PrismaClient | Prisma.TransactionClient;

export class ReportGuideError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = "ReportGuideError";
  }
}

function digest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function validDateOnly(value: string) {
  if (!dateOnly.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function manualFailure(taskId: string, replayed = false) {
  return {
    state: "failed" as const,
    taskId,
    status: "FAILED" as const,
    error: "The Report guide could not prepare a draft. Continue with the report form.",
    manualFallback: true as const,
    requiresNewRequestId: true as const,
    replayed,
  };
}

function publicSources(evidence: WeeklyReportEvidence) {
  return evidence.sources.map(({ type, id, date, label }) => ({ type, id, date, label }));
}

async function capability(db: GuideDb, organizationId: string) {
  const [agent, provider] = await Promise.all([
    db.aiAgent.findFirst({ where: { organizationId, workflowKey: REPORT_GUIDE_WORKFLOW_KEY } }),
    db.aiProviderConfig.findFirst({
      where: { organizationId, enabled: true, apiKeySecretRef: { not: null } },
      orderBy: { updatedAt: "desc" },
    }),
  ]);
  let recordedCostCents = 0;
  if (provider) {
    const now = new Date();
    const total = await db.aiUsageLog.aggregate({
      where: { providerConfigId: provider.id, createdAt: { gte: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)) } },
      _sum: { estimatedCostCents: true },
    });
    recordedCostCents = total._sum.estimatedCostCents ?? 0;
  }
  let credentialAvailable = false;
  if (provider?.apiKeySecretRef) {
    try {
      resolveAiSecretRef(provider.apiKeySecretRef);
      credentialAvailable = true;
    } catch {
      credentialAvailable = false;
    }
  }
  const providerConfigured = credentialAvailable && provider?.dataRetentionMode !== "zero-retention";
  const budgetAvailable = !provider || provider.monthlyBudgetCents === null || recordedCostCents < provider.monthlyBudgetCents;
  return {
    agent,
    provider,
    brain: {
      agentActive: agent?.active ?? true,
      providerConfigured,
      clientDataAllowed: Boolean(provider?.allowClientData),
      budgetAvailable,
    },
  };
}

export async function reportGuideAvailability(db: GuideDb, actorId: string) {
  const actor = await findStaffRecord(db, { id: actorId });
  if (!actor || actor.organizationId !== DEFAULT_ORG_ID) throw new ReportGuideError("Staff access denied.", 403);
  const state = await capability(db, actor.organizationId);
  let reason: "ready" | "agent-inactive" | "provider-unavailable" | "client-data-disabled" | "budget-reached" = "ready";
  if (state.agent?.active === false) reason = "agent-inactive";
  else if (!state.brain.providerConfigured) reason = "provider-unavailable";
  else if (!state.brain.clientDataAllowed) reason = "client-data-disabled";
  else if (!state.brain.budgetAvailable) reason = "budget-reached";
  return {
    workflowKey: REPORT_GUIDE_WORKFLOW_KEY,
    configurationVersion: state.agent?.configVersion ?? REPORT_GUIDE_CONFIGURATION_VERSION,
    label: "Report guide",
    available: reason === "ready",
    reason,
    agentId: state.agent?.id ?? null,
    canRememberCompanyStyle: actor.role === "OWNER",
  };
}

async function ensureReportGuideAgent(db: PrismaClient, organizationId: string) {
  return db.aiAgent.upsert({
    where: { organizationId_workflowKey: { organizationId, workflowKey: REPORT_GUIDE_WORKFLOW_KEY } },
    update: {},
    create: {
      organizationId,
      agentName: "Report guide",
      roleName: "Client update drafting guide",
      purpose: "Prepare source-grounded weekly report drafts for staff review.",
      guardrails: "Draft only. Never publish, send, promise, or treat corrections as project evidence.",
      workflowKey: REPORT_GUIDE_WORKFLOW_KEY,
      configVersion: REPORT_GUIDE_CONFIGURATION_VERSION,
      configuration: {
        label: "Report guide",
        voice: "warm, practical, low-drama",
        disclosure: "AI-assisted draft for staff review",
        authority: "draft-only",
        source: "RenoTrack360 regenerative report workflow v1",
      },
      active: true,
    },
  });
}

async function approvedCorrections(db: GuideDb, organizationId: string, jobId: string) {
  const tasks = await db.aiTask.findMany({
    where: { organizationId, workflowKey: REPORT_GUIDE_WORKFLOW_KEY, status: "COMPLETED", reviewMetadata: { not: Prisma.DbNull } },
    orderBy: { reviewedAt: "desc" },
    take: 100,
    select: { id: true, reviewMetadata: true },
  });
  const retained: ApprovedGuideCorrection[] = [];
  for (const task of tasks.reverse()) {
    const parsed = reportGuideReviewMetadataSchema.safeParse(task.reviewMetadata);
    if (!parsed.success || !parsed.data.correction) continue;
    if (parsed.data.correction.scope === "JOB" && parsed.data.jobId !== jobId) continue;
    retained.push({ id: task.id, jobId: parsed.data.jobId, reviewedById: parsed.data.reviewedById,
      reviewedAt: parsed.data.reviewedAt, ...parsed.data.correction });
  }
  return retained.slice(-20);
}

function readyFromTask(task: AiTask) {
  const context = reportGuideContextSchema.safeParse(task.context);
  const draft = reportGuideDraftSchema.safeParse(task.draft);
  if (!context.success || !draft.success) throw new ReportGuideError("The retained Report guide draft is unavailable.", 409);
  const evidence = context.data.evidence as WeeklyReportEvidence;
  const brain = context.data.brain as ReturnType<typeof buildReportGuideBrain>;
  return {
    state: "ready" as const,
    taskId: task.id,
    status: task.status,
    clientSummary: task.finalSummary ?? draft.data.clientSummary,
    sources: publicSources(evidence),
    missingCoverage: evidence.missingCoverage,
    configurationVersion: context.data.configurationVersion,
    known: brain.metacognition.outputs.known,
    canRememberCompanyStyle: brain.membrane.outputs.role === "OWNER",
  };
}

export async function draftReportGuide(
  db: PrismaClient,
  actorId: string,
  raw: unknown,
  runtimeDependencies?: AiRuntimeDependencies,
) {
  const parsed = draftRequestSchema.safeParse(raw);
  if (!parsed.success || !validDateOnly(parsed.data.weekEnding)) throw new ReportGuideError("Check the Report guide request.");
  const input = parsed.data;
  const actor = await findStaffRecord(db, { id: actorId });
  if (!actor || actor.organizationId !== DEFAULT_ORG_ID) throw new ReportGuideError("Staff access denied.", 403);
  await ensureReportGuideAgent(db, actor.organizationId);
  const staffInput = reportGuideStaffInputSchema.parse({
    workCompleted: input.workCompleted,
    issuesFound: input.issuesFound,
    decisionsNeeded: input.decisionsNeeded,
    nextWeekPlan: input.nextWeekPlan,
  });

  let evidence: WeeklyReportEvidence;
  try {
    evidence = await assembleWeeklyReportEvidence(db, actor.organizationId, input.jobId, input.weekEnding);
  } catch (error) {
    if (error instanceof ReportEvidenceError) throw new ReportGuideError(error.message, error.status);
    throw error;
  }
  const [guideCapability, corrections] = await Promise.all([
    capability(db, actor.organizationId),
    approvedCorrections(db, actor.organizationId, input.jobId),
  ]);
  const sourceDigest = digest(evidence);
  const inputDigest = digest({ jobId: input.jobId, weekEnding: input.weekEnding, staffInput, sourceDigest });
  const brain = buildReportGuideBrain({
    organizationId: actor.organizationId,
    actorId: actor.id,
    actorRole: actor.role as "OWNER" | "ADMIN",
    requestId: input.requestId,
    jobId: input.jobId,
    weekEnding: input.weekEnding,
    evidence,
    staffInput,
    corrections,
    capability: guideCapability.brain,
  });
  const context = reportGuideContextSchema.parse({
    configurationVersion: guideCapability.agent?.configVersion ?? REPORT_GUIDE_CONFIGURATION_VERSION,
    workflowKey: REPORT_GUIDE_WORKFLOW_KEY,
    organizationId: actor.organizationId,
    actorId: actor.id,
    jobId: input.jobId,
    weekEnding: input.weekEnding,
    sourceDigest,
    evidence,
    staffInput,
    brain,
    appliedCorrectionIds: corrections.map(correction => correction.id),
  });

  const claim = await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${actor.organizationId}:report-guide:${input.requestId}`}, 0))::text`;
    const existing = await tx.aiTask.findUnique({
      where: { organizationId_requestId: { organizationId: actor.organizationId, requestId: input.requestId } },
    });
    if (existing) return { task: existing, created: false };
    const task = await tx.aiTask.create({ data: {
      organizationId: actor.organizationId,
      agentId: guideCapability.agent?.id,
      taskName: `Draft weekly report for ${evidence.jobName} through ${input.weekEnding}`,
      workflowArea: REPORT_GUIDE_WORKFLOW_KEY,
      workflowKey: REPORT_GUIDE_WORKFLOW_KEY,
      targetType: "JOB",
      targetId: input.jobId,
      status: "IN_PROGRESS",
      prompt: `Prepare a source-grounded weekly client summary for ${evidence.jobName}, week ending ${input.weekEnding}.`,
      requestId: input.requestId,
      actorId: actor.id,
      inputDigest,
      sourceDigest,
      context: jsonValue(context),
      humanReviewRequired: true,
    } });
    return { task, created: true };
  });

  if (!claim.created) {
    if (claim.task.actorId !== actor.id || claim.task.inputDigest !== inputDigest) {
      throw new ReportGuideError("This request ID was already used for different Report guide inputs.", 409);
    }
    if (claim.task.status === "IN_PROGRESS") return { state: "pending" as const, taskId: claim.task.id, status: "IN_PROGRESS" as const };
    if (claim.task.status === "FAILED") return manualFailure(claim.task.id, true);
    return readyFromTask(claim.task);
  }

  const hasSourceMaterial = evidence.sources.length > 0 || Object.values(staffInput).some(value => value.length > 0);
  if (brain.vitality.state === "blocked" || brain.membrane.state === "blocked" || !hasSourceMaterial) {
    await db.aiTask.update({ where: { id: claim.task.id }, data: {
      status: "FAILED", resultSummary: "Report guide unavailable; continue with the manual report form.",
    } });
    return manualFailure(claim.task.id);
  }

  try {
    const options = { containsClientData: true, organizationId: actor.organizationId, taskId: claim.task.id };
    const result = runtimeDependencies
      ? await callLLMWithDependencies(reportGuidePrompt(context), REPORT_GUIDE_WORKFLOW_KEY, 512, options, runtimeDependencies)
      : await callLLM(reportGuidePrompt(context), REPORT_GUIDE_WORKFLOW_KEY, 512, options);
    const draft = reportGuideDraftSchema.parse({
      clientSummary: result.text,
      model: result.model,
      provider: result.provider,
      generatedAt: new Date().toISOString(),
    });
    const updated = await db.aiTask.updateMany({ where: { id: claim.task.id, status: "IN_PROGRESS" }, data: {
      status: "NEEDS_REVIEW", draft: jsonValue(draft), resultSummary: draft.clientSummary,
    } });
    if (updated.count !== 1) throw new ReportGuideError("The Report guide task changed while drafting.", 409);
    return readyFromTask(await db.aiTask.findUniqueOrThrow({ where: { id: claim.task.id } }));
  } catch (error) {
    if (error instanceof ReportGuideError) throw error;
    await db.aiTask.updateMany({ where: { id: claim.task.id, status: "IN_PROGRESS" }, data: {
      status: "FAILED", resultSummary: "Report guide generation failed; continue with the manual report form.",
    } });
    return manualFailure(claim.task.id);
  }
}

export async function reviewGuideTask(
  tx: Prisma.TransactionClient,
  actorId: string,
  raw: ReportGuideReviewInput,
) {
  const parsed = reviewInputSchema.safeParse(raw);
  if (!parsed.success || !validDateOnly(parsed.data.weekEnding)) throw new ReportGuideError("Check the Report guide review.");
  const input = parsed.data;
  const actor = await findStaffRecord(tx, { id: actorId });
  if (!actor || actor.organizationId !== DEFAULT_ORG_ID) throw new ReportGuideError("Staff access denied.", 403);
  if (input.correction?.scope === "COMPANY" && actor.role !== "OWNER") {
    throw new ReportGuideError("Only an owner can remember company-wide Report guide wording.", 403);
  }

  await tx.$queryRaw`SELECT id FROM "AiTask" WHERE id = ${input.taskId} AND "organizationId" = ${actor.organizationId} FOR UPDATE`;
  const task = await tx.aiTask.findFirst({ where: {
    id: input.taskId, organizationId: actor.organizationId, workflowKey: REPORT_GUIDE_WORKFLOW_KEY,
  } });
  if (!task) throw new ReportGuideError("Report guide task not found.", 404);
  const context = reportGuideContextSchema.safeParse(task.context);
  const draft = reportGuideDraftSchema.safeParse(task.draft);
  if (!context.success || !draft.success) throw new ReportGuideError("Report guide task context is invalid.", 409);
  if (context.data.organizationId !== actor.organizationId || context.data.jobId !== input.jobId || context.data.weekEnding !== input.weekEnding ||
      context.data.sourceDigest !== task.sourceDigest || task.targetId !== input.jobId) {
    throw new ReportGuideError("Report guide task does not match this report.", 409);
  }
  const report = await tx.weeklyReport.findFirst({ where: weeklyReportInOrganization(actor.organizationId, { id: input.reportId }) });
  if (!report || report.jobId !== input.jobId || report.weekEnding.toISOString().slice(0, 10) !== input.weekEnding) {
    throw new ReportGuideError("Report guide review does not match the saved report.", 409);
  }
  if (report.clientSummary?.trim() !== input.finalSummary) {
    throw new ReportGuideError("Save the final client summary before completing the Report guide review.", 409);
  }

  const normalizedCorrection = input.correction ?? null;
  if (task.status === "COMPLETED") {
    const retained = reportGuideReviewMetadataSchema.safeParse(task.reviewMetadata);
    if (retained.success && retained.data.reportId === input.reportId && retained.data.jobId === input.jobId &&
        retained.data.weekEnding === input.weekEnding && retained.data.finalSummary === input.finalSummary &&
        JSON.stringify(retained.data.correction) === JSON.stringify(normalizedCorrection)) return task;
    throw new ReportGuideError("This Report guide task was already reviewed with different final content.", 409);
  }
  if (task.status !== "NEEDS_REVIEW") throw new ReportGuideError("This Report guide task is not ready for review.", 409);

  const reviewedAt = new Date();
  const reviewMetadata = reportGuideReviewMetadataSchema.parse({
    reportId: input.reportId,
    jobId: input.jobId,
    weekEnding: input.weekEnding,
    finalSummary: input.finalSummary,
    correction: normalizedCorrection,
    reviewedById: actorId,
    reviewedAt: reviewedAt.toISOString(),
  });
  const updated = await tx.aiTask.update({ where: { id: task.id }, data: {
    status: "COMPLETED",
    finalSummary: input.finalSummary,
    resultSummary: input.finalSummary,
    reviewedAt,
    reviewedById: actorId,
    reviewMetadata: jsonValue(reviewMetadata),
  } });
  await tx.auditEvent.create({ data: {
    organizationId: actor.organizationId,
    actorUserId: actorId,
    action: "REPORT_GUIDE_REVIEWED",
    entityType: "AiTask",
    entityId: task.id,
    metadata: {
      reportId: input.reportId,
      jobId: input.jobId,
      weekEnding: input.weekEnding,
      corrected: Boolean(normalizedCorrection),
      correctionScope: normalizedCorrection?.scope ?? null,
      correctionCategory: normalizedCorrection?.category ?? null,
    },
  } });
  return updated;
}
