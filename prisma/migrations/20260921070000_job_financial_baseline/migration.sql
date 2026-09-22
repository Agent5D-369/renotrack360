BEGIN;
-- AlterTable
ALTER TABLE "ChangeOrder" ADD COLUMN     "creationDigest" TEXT,
ADD COLUMN     "creationRequestId" TEXT,
ADD COLUMN     "priceSnapshotId" TEXT,
ADD COLUMN     "sourceActivityId" TEXT;

-- CreateTable
CREATE TABLE "JobFinancialBaseline" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "inputDigest" TEXT NOT NULL,
    "sourceFileId" TEXT NOT NULL,
    "sourceSha256" TEXT NOT NULL,
    "contractAmount" DECIMAL(12,2) NOT NULL,
    "reviewedPaidAmount" DECIMAL(12,2) NOT NULL,
    "requiredDeposit" DECIMAL(12,2) NOT NULL,
    "legacyApprovedChanges" JSONB NOT NULL,
    "before" JSONB NOT NULL,
    "reviewReason" TEXT NOT NULL,
    "reviewedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobFinancialBaseline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeOrderSnapshot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "changeOrderId" TEXT NOT NULL,
    "approvalId" TEXT NOT NULL,
    "contentDigest" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangeOrderSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppliedChangeOrder" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "changeOrderId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "addedDays" INTEGER NOT NULL,
    "signerName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppliedChangeOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobFinancialBaseline_jobId_key" ON "JobFinancialBaseline"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "JobFinancialBaseline_organizationId_requestId_key" ON "JobFinancialBaseline"("organizationId", "requestId");

-- CreateIndex
CREATE UNIQUE INDEX "ChangeOrderSnapshot_approvalId_key" ON "ChangeOrderSnapshot"("approvalId");

-- CreateIndex
CREATE INDEX "ChangeOrderSnapshot_changeOrderId_createdAt_idx" ON "ChangeOrderSnapshot"("changeOrderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AppliedChangeOrder_changeOrderId_key" ON "AppliedChangeOrder"("changeOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "AppliedChangeOrder_snapshotId_key" ON "AppliedChangeOrder"("snapshotId");

-- CreateIndex
CREATE INDEX "AppliedChangeOrder_jobId_createdAt_idx" ON "AppliedChangeOrder"("jobId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChangeOrder_creationRequestId_key" ON "ChangeOrder"("creationRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "ChangeOrder_sourceActivityId_key" ON "ChangeOrder"("sourceActivityId");

-- AddForeignKey
ALTER TABLE "ChangeOrder" ADD CONSTRAINT "ChangeOrder_priceSnapshotId_fkey" FOREIGN KEY ("priceSnapshotId") REFERENCES "PriceSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeOrder" ADD CONSTRAINT "ChangeOrder_sourceActivityId_fkey" FOREIGN KEY ("sourceActivityId") REFERENCES "Activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobFinancialBaseline" ADD CONSTRAINT "JobFinancialBaseline_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobFinancialBaseline" ADD CONSTRAINT "JobFinancialBaseline_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobFinancialBaseline" ADD CONSTRAINT "JobFinancialBaseline_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "FileAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeOrderSnapshot" ADD CONSTRAINT "ChangeOrderSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeOrderSnapshot" ADD CONSTRAINT "ChangeOrderSnapshot_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeOrderSnapshot" ADD CONSTRAINT "ChangeOrderSnapshot_changeOrderId_fkey" FOREIGN KEY ("changeOrderId") REFERENCES "ChangeOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeOrderSnapshot" ADD CONSTRAINT "ChangeOrderSnapshot_approvalId_fkey" FOREIGN KEY ("approvalId") REFERENCES "ClientApproval"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppliedChangeOrder" ADD CONSTRAINT "AppliedChangeOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppliedChangeOrder" ADD CONSTRAINT "AppliedChangeOrder_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppliedChangeOrder" ADD CONSTRAINT "AppliedChangeOrder_changeOrderId_fkey" FOREIGN KEY ("changeOrderId") REFERENCES "ChangeOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppliedChangeOrder" ADD CONSTRAINT "AppliedChangeOrder_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "ChangeOrderSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


CREATE FUNCTION flipside_reject_finance_snapshot_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Financial review and approval snapshots are immutable'; END $$;
CREATE TRIGGER jobfinancialbaseline_immutable BEFORE UPDATE OR DELETE ON "JobFinancialBaseline" FOR EACH ROW EXECUTE FUNCTION flipside_reject_finance_snapshot_mutation();
CREATE TRIGGER jobfinancialbaseline_no_truncate BEFORE TRUNCATE ON "JobFinancialBaseline" FOR EACH STATEMENT EXECUTE FUNCTION flipside_reject_finance_snapshot_mutation();
CREATE TRIGGER changeordersnapshot_immutable BEFORE UPDATE OR DELETE ON "ChangeOrderSnapshot" FOR EACH ROW EXECUTE FUNCTION flipside_reject_finance_snapshot_mutation();
CREATE TRIGGER changeordersnapshot_no_truncate BEFORE TRUNCATE ON "ChangeOrderSnapshot" FOR EACH STATEMENT EXECUTE FUNCTION flipside_reject_finance_snapshot_mutation();
CREATE TRIGGER appliedchangeorder_immutable BEFORE UPDATE OR DELETE ON "AppliedChangeOrder" FOR EACH ROW EXECUTE FUNCTION flipside_reject_finance_snapshot_mutation();
CREATE TRIGGER appliedchangeorder_no_truncate BEFORE TRUNCATE ON "AppliedChangeOrder" FOR EACH STATEMENT EXECUTE FUNCTION flipside_reject_finance_snapshot_mutation();
COMMIT;
