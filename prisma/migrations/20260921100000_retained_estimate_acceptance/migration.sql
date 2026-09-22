BEGIN;
-- CreateTable
CREATE TABLE "EstimateSnapshot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "inputDigest" TEXT NOT NULL,
    "priceSnapshotId" TEXT NOT NULL,
    "sourceFileId" TEXT NOT NULL,
    "sourceSha256" TEXT NOT NULL,
    "approvalId" TEXT NOT NULL,
    "sourceDigest" TEXT NOT NULL,
    "contentDigest" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "issuedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstimateSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstimateAcceptance" (
    "id" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "ipAddressHash" TEXT,
    "contentDigest" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstimateAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstimateConversion" (
    "id" TEXT NOT NULL,
    "acceptanceId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "convertedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstimateConversion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EstimateSnapshot_requestId_key" ON "EstimateSnapshot"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "EstimateSnapshot_approvalId_key" ON "EstimateSnapshot"("approvalId");

-- CreateIndex
CREATE INDEX "EstimateSnapshot_organizationId_estimateId_createdAt_idx" ON "EstimateSnapshot"("organizationId", "estimateId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EstimateAcceptance_estimateId_key" ON "EstimateAcceptance"("estimateId");

-- CreateIndex
CREATE UNIQUE INDEX "EstimateAcceptance_snapshotId_key" ON "EstimateAcceptance"("snapshotId");

-- CreateIndex
CREATE UNIQUE INDEX "EstimateConversion_acceptanceId_key" ON "EstimateConversion"("acceptanceId");

-- CreateIndex
CREATE UNIQUE INDEX "EstimateConversion_jobId_key" ON "EstimateConversion"("jobId");

-- AddForeignKey
ALTER TABLE "EstimateSnapshot" ADD CONSTRAINT "EstimateSnapshot_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateSnapshot" ADD CONSTRAINT "EstimateSnapshot_priceSnapshotId_fkey" FOREIGN KEY ("priceSnapshotId") REFERENCES "PriceSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateSnapshot" ADD CONSTRAINT "EstimateSnapshot_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "FileAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateSnapshot" ADD CONSTRAINT "EstimateSnapshot_approvalId_fkey" FOREIGN KEY ("approvalId") REFERENCES "ClientApproval"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateAcceptance" ADD CONSTRAINT "EstimateAcceptance_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateAcceptance" ADD CONSTRAINT "EstimateAcceptance_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "EstimateSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateConversion" ADD CONSTRAINT "EstimateConversion_acceptanceId_fkey" FOREIGN KEY ("acceptanceId") REFERENCES "EstimateAcceptance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateConversion" ADD CONSTRAINT "EstimateConversion_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TRIGGER estimatesnapshot_immutable BEFORE UPDATE OR DELETE ON "EstimateSnapshot" FOR EACH ROW EXECUTE FUNCTION flipside_reject_finance_snapshot_mutation();
CREATE TRIGGER estimatesnapshot_no_truncate BEFORE TRUNCATE ON "EstimateSnapshot" FOR EACH STATEMENT EXECUTE FUNCTION flipside_reject_finance_snapshot_mutation();

CREATE TRIGGER estimateacceptance_immutable BEFORE UPDATE OR DELETE ON "EstimateAcceptance" FOR EACH ROW EXECUTE FUNCTION flipside_reject_finance_snapshot_mutation();
CREATE TRIGGER estimateacceptance_no_truncate BEFORE TRUNCATE ON "EstimateAcceptance" FOR EACH STATEMENT EXECUTE FUNCTION flipside_reject_finance_snapshot_mutation();

CREATE TRIGGER estimateconversion_immutable BEFORE UPDATE OR DELETE ON "EstimateConversion" FOR EACH ROW EXECUTE FUNCTION flipside_reject_finance_snapshot_mutation();
CREATE TRIGGER estimateconversion_no_truncate BEFORE TRUNCATE ON "EstimateConversion" FOR EACH STATEMENT EXECUTE FUNCTION flipside_reject_finance_snapshot_mutation();
COMMIT;
