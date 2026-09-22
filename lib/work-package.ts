import { Prisma, PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { z } from "zod";
import { financeActor, FinancialRecordError } from "./finance-lock";
import { verifyReviewedJob } from "./job-finance";
import { readPrivateAsset } from "./private-media";
import { DEFAULT_ORG_ID } from "./constants";
import { workItemSchema, workItemDigest } from "./work-item-pilot";

const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const description = z.string().trim().min(20).max(5000);
export const scopeContentSchema = z.object({ title: z.string().trim().min(3).max(180), area: z.string().trim().min(2).max(180),
  quantity: z.string().regex(/^(0|[1-9]\d{0,5})(\.\d{1,2})?$/).refine(value => Number(value) > 0), unit: z.string().trim().min(1).max(40),
  inclusions: description, exclusions: z.string().trim().min(10).max(5000), measurementNotes: description,
  installerName: z.string().trim().min(2).max(120), installerQualifications: description, authorityRequirements: description });
const scopeInputSchema = scopeContentSchema.extend({ requestId: z.string().uuid(), phaseId: z.string().min(1), sourceLineRef: z.string().trim().min(3).max(180).transform(value => value.toLowerCase()),
  sourceFileId: z.string().min(1), workItemVersionId: z.string().min(1), priceSnapshotId: z.string().min(1),
  reviewedDigest: z.string().regex(/^[a-f0-9]{64}$/), agreedAmount: z.string().regex(/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/), approvedScopeVerified: z.literal(true) });
export async function scopeReviewState(db: PrismaClient | Prisma.TransactionClient, jobId: string) {
  const job = await db.job.findFirst({ where: { id: jobId, organizationId: DEFAULT_ORG_ID }, include: { financialBaseline: true } });
  if (!job || !job.financialBaseline) throw new FinancialRecordError("Complete the owner's documented financial baseline first.");
  const items = await db.scopeItem.findMany({ where: { jobId }, orderBy: { id: "asc" } });
  const allocated = items.reduce((sum, item) => sum.plus(item.amount), new Prisma.Decimal(0));
  return { job, items, allocated, digest: hash({ jobId, baselineId: job.financialBaseline.id, contract: job.contractAmount.toFixed(2), updatedAt: job.updatedAt.toISOString(), items: items.map(item => ({ id: item.id, amount: item.amount.toFixed(2) })) }) };
}
export async function adoptScopePackage(db: PrismaClient, actorId: string, jobId: string, raw: unknown, root: string) {
  const parsed = scopeInputSchema.safeParse(raw);
  if (!parsed.success) throw new FinancialRecordError("Complete the documented scope, responsible people, measurements and owner acknowledgment: " + parsed.error.issues[0].path.join("."));
  const input = parsed.data;
  const { asset } = await readPrivateAsset(db, { id: actorId, organizationId: DEFAULT_ORG_ID }, input.sourceFileId, root);
  if (asset.entityType !== "JOB" || asset.entityId !== jobId || asset.mimeType !== "application/pdf") throw new FinancialRecordError("Select the private accepted-scope PDF belonging to this job.");
  const inputDigest = hash({ actorId, jobId, input, sourceSha256: asset.sha256 });
  return db.$transaction(async tx => {
    const organizationId = await financeActor(tx, actorId, true);
    const existing = await tx.scopeItem.findUnique({ where: { organizationId_requestId: { organizationId, requestId: input.requestId } }, include: { workPackage: true } });
    if (existing) { if (existing.inputDigest !== inputDigest || !existing.workPackage) throw new FinancialRecordError("This scope request was already used. Reload the page."); return existing.workPackage; }
    const totals = await verifyReviewedJob(tx, jobId), current = await scopeReviewState(tx, jobId);
    if (!totals || current.digest !== input.reviewedDigest) throw new FinancialRecordError("The contract or scoped allocation changed. Reload and review before adopting scope.");
    const phase = await tx.renovationPhase.findFirst({ where: { id: input.phaseId, jobId } });
    if (!phase) throw new FinancialRecordError("Select an existing phase belonging to this job.");
    const version = await tx.workItemVersion.findFirst({ where: { id: input.workItemVersionId, organizationId } });
    const price = await tx.priceSnapshot.findFirst({ where: { id: input.priceSnapshotId, organizationId } });
    if (!version || !price) throw new FinancialRecordError("Work version or pricing scenario access denied.");
    const template = workItemSchema.parse(version.content);
    if (workItemDigest(template) !== version.contentDigest) throw new FinancialRecordError("The retained work definition could not be verified.");
    if (!price.sellingPrice.eq(input.agreedAmount)) throw new FinancialRecordError("The agreed scope amount must match its retained pricing scenario. Do not reprice an old contract here.");
    if (current.allocated.plus(price.sellingPrice).gt(totals.contract)) throw new FinancialRecordError("Scoped allocations cannot exceed the reviewed current contract. Resolve the scope or approved change first.");
    if (await tx.scopeItem.findUnique({ where: { jobId_sourceLineRef: { jobId, sourceLineRef: input.sourceLineRef } } })) throw new FinancialRecordError("That contract line is already mapped. Do not generate its work twice.");
    const scope = await tx.scopeItem.create({ data: { organizationId, jobId, requestId: input.requestId, inputDigest, sourceLineRef: input.sourceLineRef,
      sourceFileId: asset.id, sourceSha256: asset.sha256!, workItemVersionId: version.id, priceSnapshotId: price.id, amount: price.sellingPrice,
      reviewedById: actorId, content: scopeContentSchema.parse(input) } });
    const workPackage = await tx.workPackage.create({ data: { scopeItemId: scope.id, phaseId: phase.id, createdById: actorId,
      steps: { create: template.steps.map((step, position) => ({ position, templateKey: step.key, definition: step })) } } });
    await tx.auditEvent.create({ data: { organizationId, actorUserId: actorId, action: "ACCEPTED_SCOPE_MAPPED", entityType: "WorkPackage", entityId: workPackage.id,
      metadata: { scopeItemId: scope.id, inputDigest, sourceSha256: asset.sha256, templateDigest: version.contentDigest, amount: price.sellingPrice.toFixed(2), contractChanged: false, fieldWorkReleased: false } } });
    return workPackage;
  });
}

export const packageInclude = { scopeItem: { include: { job: true, workItemVersion: true, priceSnapshot: true } }, phase: true,
  steps: { orderBy: { position: "asc" as const }, include: { evidence: { orderBy: { id: "asc" as const } }, reviews: { orderBy: { sequence: "desc" as const } } } } } satisfies Prisma.WorkPackageInclude;
export type PackageRecord = Prisma.WorkPackageGetPayload<{ include: typeof packageInclude }>;
export const stepDefinition = (value: unknown) => workItemSchema.innerType().shape.steps.element.parse(value);
type StepStateInput = { position: number; evidence: Array<{ id: string; inputDigest: string }>; reviews: Array<{ id: string; outcome: string; evidenceDigest: string; prerequisiteDigest: string }> };
export const evidenceDigest = (step: Pick<StepStateInput, "evidence">) => hash(step.evidence.map(evidence => ({ id: evidence.id, inputDigest: evidence.inputDigest })));
export const packageStatusSelect = { steps: { orderBy: { position: "asc" as const }, select: { position: true, evidence: { orderBy: { id: "asc" as const }, select: { id: true, inputDigest: true } }, reviews: { orderBy: { sequence: "desc" as const }, select: { id: true, outcome: true, evidenceDigest: true, prerequisiteDigest: true } } } } } satisfies Prisma.WorkPackageSelect;
export function orderedReviewState<T extends StepStateInput>(steps: T[]) {
  const accepted: string[] = [];
  return steps.map(step => {
    const review = step.reviews[0], prerequisiteDigest = hash(accepted);
    const priorReady = accepted.length === step.position;
    const done = Boolean(priorReady && review && ["ACCEPTED", "NOT_APPLICABLE"].includes(review.outcome) && review.evidenceDigest === evidenceDigest(step) && review.prerequisiteDigest === prerequisiteDigest);
    const state = done ? review!.outcome : review?.outcome === "BLOCKED" ? "BLOCKED" : review ? "REVIEW_REQUIRED" : "NOT_STARTED";
    if (done) accepted.push(review!.id);
    return { step, review, prerequisiteDigest, priorReady, done, state, evidenceDigest: evidenceDigest(step), reviewDigest: hash({ evidence: evidenceDigest(step), latestReviewId: review?.id ?? null, prerequisiteDigest }) };
  });
}
export function packageProgress(work: PackageRecord) {
  return orderedReviewState(work.steps).map(value => ({ ...value, definition: stepDefinition(value.step.definition) }));
}
export async function getOwnedPackage(db: PrismaClient | Prisma.TransactionClient, id: string) {
  const work = await db.workPackage.findFirst({ where: { id, scopeItem: { organizationId: DEFAULT_ORG_ID } }, include: packageInclude });
  if (!work || work.scopeItem.job.organizationId !== DEFAULT_ORG_ID || work.phase.jobId !== work.scopeItem.jobId) throw new FinancialRecordError("Work package access denied.");
  return work;
}
const evidenceInputSchema = z.object({ requestId: z.string().uuid(), requirementKey: z.string().min(1), notes: description, sourceFileId: z.string().default("") });
export async function submitStepEvidence(db: PrismaClient, actorId: string, packageId: string, stepId: string, raw: unknown, root: string) {
  const parsed = evidenceInputSchema.safeParse(raw);
  if (!parsed.success) throw new FinancialRecordError("Provide the evidence requirement and a specific observation of at least 20 characters.");
  const input = parsed.data;
  const file = input.sourceFileId ? (await readPrivateAsset(db, { id: actorId, organizationId: DEFAULT_ORG_ID }, input.sourceFileId, root)).asset : null;
  const digest = hash({ actorId, packageId, stepId, input, sourceSha256: file?.sha256 });
  return db.$transaction(async tx => {
    const organizationId = await financeActor(tx, actorId);
    const work = await getOwnedPackage(tx, packageId), progress = packageProgress(work), current = progress.find(value => value.step.id === stepId);
    if (!current) throw new FinancialRecordError("Step access denied.");
    const retry = await tx.executionEvidence.findUnique({ where: { requestId: input.requestId } });
    if (retry) { if (retry.inputDigest !== digest) throw new FinancialRecordError("This evidence request was already used."); return retry; }
    if (!current.priorReady || current.done) throw new FinancialRecordError("Complete prior hold points first. Reopen accepted work with a blocking review before adding corrections.");
    const requirement = current.definition.evidence.find(value => value.key === input.requirementKey);
    if (!requirement) throw new FinancialRecordError("This evidence requirement does not belong to the step.");
    if (requirement.kind === "REVIEW") await financeActor(tx, actorId, true);
    if (file && (file.entityType !== "JOB" || file.entityId !== work.scopeItem.jobId)) throw new FinancialRecordError("Evidence file must belong to this job.");
    if (requirement.kind === "PHOTO" && (!file || !file.mimeType?.startsWith("image/"))) throw new FinancialRecordError("This requirement needs a retained private photo, not a checkbox or note.");
    const person = await tx.user.findUniqueOrThrow({ where: { id: actorId }, select: { name: true, email: true } });
    const evidence = await tx.executionEvidence.create({ data: { stepId, requestId: input.requestId, inputDigest: digest, requirementKey: input.requirementKey, notes: input.notes,
      sourceFileId: file?.id, sourceSha256: file?.sha256, submittedById: actorId, submittedByName: person.name || person.email || actorId } });
    await tx.auditEvent.create({ data: { organizationId, actorUserId: actorId, action: "EXECUTION_EVIDENCE_RECORDED", entityType: "WorkStepInstance", entityId: stepId,
      metadata: { packageId, evidenceId: evidence.id, requirementKey: input.requirementKey, inputDigest: digest } } });
    return evidence;
  });
}
const reviewInputSchema = z.object({ requestId: z.string().uuid(), reviewedDigest: z.string().regex(/^[a-f0-9]{64}$/), outcome: z.enum(["ACCEPTED", "BLOCKED", "NOT_APPLICABLE"]), reason: description });
export async function reviewWorkStep(db: PrismaClient, actorId: string, packageId: string, stepId: string, raw: unknown, root: string) {
  const parsed = reviewInputSchema.safeParse(raw);
  if (!parsed.success) throw new FinancialRecordError("Select a review outcome and record a specific reason of at least 20 characters.");
  const input = parsed.data, inputDigest = hash({ actorId, packageId, stepId, input });
  return db.$transaction(async tx => {
    const organizationId = await financeActor(tx, actorId, input.outcome !== "BLOCKED");
    const work = await getOwnedPackage(tx, packageId), current = packageProgress(work).find(value => value.step.id === stepId);
    if (!current) throw new FinancialRecordError("Step access denied.");
    const retry = await tx.workStepReview.findUnique({ where: { requestId: input.requestId } });
    if (retry) { if (retry.inputDigest !== inputDigest) throw new FinancialRecordError("This review request was already used."); return retry; }
    if (input.reviewedDigest !== current.reviewDigest) throw new FinancialRecordError("The evidence changed. Reload and review the current record.");
    if (input.outcome !== "BLOCKED") {
      if (!current.priorReady || current.done) throw new FinancialRecordError("Prior hold points must be accepted, and completed steps must be explicitly reopened before a new review.");
      if (input.outcome === "NOT_APPLICABLE" && !current.definition.condition) throw new FinancialRecordError("Only a conditional branch can be marked not applicable, with the actual reason.");
      if (input.outcome === "ACCEPTED") {
        for (const requirement of current.definition.evidence) if (!current.step.evidence.some(value => value.requirementKey === requirement.key)) throw new FinancialRecordError("Required evidence is missing: " + requirement.label);
        for (const evidence of current.step.evidence) if (evidence.sourceFileId) {
          const { asset } = await readPrivateAsset(db, { id: actorId, organizationId }, evidence.sourceFileId, root);
          if (asset.sha256 !== evidence.sourceSha256 || asset.entityType !== "JOB" || asset.entityId !== work.scopeItem.jobId) throw new FinancialRecordError("Retained evidence no longer matches this job's record.");
        }
      }
    }
    const person = await tx.user.findUniqueOrThrow({ where: { id: actorId }, select: { name: true, email: true } });
    const review = await tx.workStepReview.create({ data: { stepId, sequence: (current.step.reviews[0]?.sequence ?? 0) + 1, requestId: input.requestId, inputDigest,
      evidenceDigest: current.evidenceDigest, prerequisiteDigest: current.prerequisiteDigest, outcome: input.outcome, reason: input.reason,
      reviewedById: actorId, reviewedByName: person.name || person.email || actorId } });
    await tx.auditEvent.create({ data: { organizationId, actorUserId: actorId, action: "WORK_STEP_REVIEWED", entityType: "WorkStepInstance", entityId: stepId,
      metadata: { packageId, reviewId: review.id, outcome: input.outcome, evidenceDigest: current.evidenceDigest, prerequisiteDigest: current.prerequisiteDigest, downstreamReviewRequired: input.outcome === "BLOCKED" } } });
    return review;
  }, { timeout: 20000 });
}

export function phaseWithPackageEvidence(legacyStatus: string, packages: Array<{ steps: StepStateInput[] }>) {
  if (!packages.length) return legacyStatus;
  const steps = packages.flatMap(work => orderedReviewState(work.steps));
  if (steps.every(step => step.done)) return legacyStatus;
  if (steps.some(step => step.state === "BLOCKED")) return "BLOCKED";
  return steps.some(step => step.step.evidence.length || step.step.reviews.length) ? "IN_PROGRESS" : "NOT_STARTED";
}
export async function setReviewedPhaseStatus(db: PrismaClient, actorId: string, jobId: string, phaseId: string, status: string) {
  if (!["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "COMPLETE"].includes(status)) throw new FinancialRecordError("Choose a valid phase status.");
  return db.$transaction(async tx => {
    const organizationId = await financeActor(tx, actorId);
    const phase = await tx.renovationPhase.findFirst({ where: { id: phaseId, jobId, job: { organizationId } }, include: { workPackages: { include: packageInclude } } });
    if (!phase) throw new FinancialRecordError("Phase access denied.");
    if (status === "COMPLETE" && phase.workPackages.some(work => packageProgress(work).some(step => !step.done))) throw new FinancialRecordError("Accept all required package evidence and resolve hold points before completing this phase.");
    await tx.renovationPhase.update({ where: { id: phase.id }, data: { status: status as Prisma.RenovationPhaseUpdateInput["status"], completionDate: status === "COMPLETE" ? new Date() : null } });
    await tx.auditEvent.create({ data: { organizationId, actorUserId: actorId, action: "PHASE_STATUS_REVIEWED", entityType: "RenovationPhase", entityId: phase.id, metadata: { before: phase.status, after: status } } });
  });
}
