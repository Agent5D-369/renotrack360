BEGIN;
-- CreateTable
CREATE TABLE "ScopeItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "inputDigest" TEXT NOT NULL,
    "sourceLineRef" TEXT NOT NULL,
    "sourceFileId" TEXT NOT NULL,
    "sourceSha256" TEXT NOT NULL,
    "workItemVersionId" TEXT NOT NULL,
    "priceSnapshotId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "reviewedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScopeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkPackage" (
    "id" TEXT NOT NULL,
    "scopeItemId" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkStepInstance" (
    "id" TEXT NOT NULL,
    "workPackageId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "templateKey" TEXT NOT NULL,
    "definition" JSONB NOT NULL,

    CONSTRAINT "WorkStepInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionEvidence" (
    "id" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "inputDigest" TEXT NOT NULL,
    "requirementKey" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "sourceFileId" TEXT,
    "sourceSha256" TEXT,
    "submittedById" TEXT NOT NULL,
    "submittedByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecutionEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkStepReview" (
    "id" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "requestId" TEXT NOT NULL,
    "inputDigest" TEXT NOT NULL,
    "evidenceDigest" TEXT NOT NULL,
    "prerequisiteDigest" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "reviewedById" TEXT NOT NULL,
    "reviewedByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkStepReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScopeItem_organizationId_requestId_key" ON "ScopeItem"("organizationId", "requestId");

-- CreateIndex
CREATE UNIQUE INDEX "ScopeItem_jobId_sourceLineRef_key" ON "ScopeItem"("jobId", "sourceLineRef");

-- CreateIndex
CREATE UNIQUE INDEX "WorkPackage_scopeItemId_key" ON "WorkPackage"("scopeItemId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkStepInstance_workPackageId_position_key" ON "WorkStepInstance"("workPackageId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "WorkStepInstance_workPackageId_templateKey_key" ON "WorkStepInstance"("workPackageId", "templateKey");

-- CreateIndex
CREATE UNIQUE INDEX "ExecutionEvidence_requestId_key" ON "ExecutionEvidence"("requestId");

-- CreateIndex
CREATE INDEX "ExecutionEvidence_stepId_createdAt_idx" ON "ExecutionEvidence"("stepId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkStepReview_requestId_key" ON "WorkStepReview"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkStepReview_stepId_sequence_key" ON "WorkStepReview"("stepId", "sequence");

-- AddForeignKey
ALTER TABLE "ScopeItem" ADD CONSTRAINT "ScopeItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScopeItem" ADD CONSTRAINT "ScopeItem_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScopeItem" ADD CONSTRAINT "ScopeItem_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "FileAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScopeItem" ADD CONSTRAINT "ScopeItem_workItemVersionId_fkey" FOREIGN KEY ("workItemVersionId") REFERENCES "WorkItemVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScopeItem" ADD CONSTRAINT "ScopeItem_priceSnapshotId_fkey" FOREIGN KEY ("priceSnapshotId") REFERENCES "PriceSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkPackage" ADD CONSTRAINT "WorkPackage_scopeItemId_fkey" FOREIGN KEY ("scopeItemId") REFERENCES "ScopeItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkPackage" ADD CONSTRAINT "WorkPackage_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "RenovationPhase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkStepInstance" ADD CONSTRAINT "WorkStepInstance_workPackageId_fkey" FOREIGN KEY ("workPackageId") REFERENCES "WorkPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionEvidence" ADD CONSTRAINT "ExecutionEvidence_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "WorkStepInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionEvidence" ADD CONSTRAINT "ExecutionEvidence_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "FileAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkStepReview" ADD CONSTRAINT "WorkStepReview_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "WorkStepInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TRIGGER scopeitem_immutable BEFORE UPDATE OR DELETE ON "ScopeItem" FOR EACH ROW EXECUTE FUNCTION flipside_reject_finance_snapshot_mutation();
CREATE TRIGGER scopeitem_no_truncate BEFORE TRUNCATE ON "ScopeItem" FOR EACH STATEMENT EXECUTE FUNCTION flipside_reject_finance_snapshot_mutation();
CREATE TRIGGER workpackage_immutable BEFORE UPDATE OR DELETE ON "WorkPackage" FOR EACH ROW EXECUTE FUNCTION flipside_reject_finance_snapshot_mutation();
CREATE TRIGGER workpackage_no_truncate BEFORE TRUNCATE ON "WorkPackage" FOR EACH STATEMENT EXECUTE FUNCTION flipside_reject_finance_snapshot_mutation();
CREATE TRIGGER workstepinstance_immutable BEFORE UPDATE OR DELETE ON "WorkStepInstance" FOR EACH ROW EXECUTE FUNCTION flipside_reject_finance_snapshot_mutation();
CREATE TRIGGER workstepinstance_no_truncate BEFORE TRUNCATE ON "WorkStepInstance" FOR EACH STATEMENT EXECUTE FUNCTION flipside_reject_finance_snapshot_mutation();
CREATE TRIGGER executionevidence_immutable BEFORE UPDATE OR DELETE ON "ExecutionEvidence" FOR EACH ROW EXECUTE FUNCTION flipside_reject_finance_snapshot_mutation();
CREATE TRIGGER executionevidence_no_truncate BEFORE TRUNCATE ON "ExecutionEvidence" FOR EACH STATEMENT EXECUTE FUNCTION flipside_reject_finance_snapshot_mutation();
CREATE TRIGGER workstepreview_immutable BEFORE UPDATE OR DELETE ON "WorkStepReview" FOR EACH ROW EXECUTE FUNCTION flipside_reject_finance_snapshot_mutation();
CREATE TRIGGER workstepreview_no_truncate BEFORE TRUNCATE ON "WorkStepReview" FOR EACH STATEMENT EXECUTE FUNCTION flipside_reject_finance_snapshot_mutation();
COMMIT;
