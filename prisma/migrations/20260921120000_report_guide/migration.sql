BEGIN;

ALTER TABLE "AiAgent"
  ADD COLUMN "workflowKey" TEXT,
  ADD COLUMN "configVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "configuration" JSONB;

ALTER TABLE "AiTask"
  ADD COLUMN "workflowKey" TEXT,
  ADD COLUMN "requestId" TEXT,
  ADD COLUMN "actorId" TEXT,
  ADD COLUMN "inputDigest" TEXT,
  ADD COLUMN "sourceDigest" TEXT,
  ADD COLUMN "context" JSONB,
  ADD COLUMN "draft" JSONB,
  ADD COLUMN "reviewMetadata" JSONB,
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedById" TEXT,
  ADD COLUMN "finalSummary" TEXT;

CREATE UNIQUE INDEX "AiAgent_organizationId_workflowKey_key" ON "AiAgent"("organizationId", "workflowKey");
CREATE UNIQUE INDEX "AiTask_organizationId_requestId_key" ON "AiTask"("organizationId", "requestId");
CREATE INDEX "AiTask_organizationId_workflowKey_status_idx" ON "AiTask"("organizationId", "workflowKey", "status");

COMMIT;
