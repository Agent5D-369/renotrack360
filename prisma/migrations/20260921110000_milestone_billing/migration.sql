BEGIN;

CREATE TABLE "MilestoneInvoiceDraft" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "estimateSnapshotId" TEXT NOT NULL,
    "milestoneKey" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "inputDigest" TEXT NOT NULL,
    "sourceDigest" TEXT NOT NULL,
    "percent" DECIMAL(5,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "triggerEvent" TEXT NOT NULL,
    "reviewReason" TEXT NOT NULL,
    "reviewedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MilestoneInvoiceDraft_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MilestoneInvoiceDraft_invoiceId_key" ON "MilestoneInvoiceDraft"("invoiceId");
CREATE UNIQUE INDEX "MilestoneInvoiceDraft_organizationId_requestId_key" ON "MilestoneInvoiceDraft"("organizationId", "requestId");
CREATE UNIQUE INDEX "MilestoneInvoiceDraft_estimateSnapshotId_milestoneKey_key" ON "MilestoneInvoiceDraft"("estimateSnapshotId", "milestoneKey");
CREATE INDEX "MilestoneInvoiceDraft_jobId_createdAt_idx" ON "MilestoneInvoiceDraft"("jobId", "createdAt");

ALTER TABLE "MilestoneInvoiceDraft" ADD CONSTRAINT "MilestoneInvoiceDraft_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MilestoneInvoiceDraft" ADD CONSTRAINT "MilestoneInvoiceDraft_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MilestoneInvoiceDraft" ADD CONSTRAINT "MilestoneInvoiceDraft_estimateSnapshotId_fkey" FOREIGN KEY ("estimateSnapshotId") REFERENCES "EstimateSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MilestoneInvoiceDraft" ADD CONSTRAINT "MilestoneInvoiceDraft_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TRIGGER milestone_invoice_draft_immutable BEFORE UPDATE OR DELETE ON "MilestoneInvoiceDraft" FOR EACH ROW EXECUTE FUNCTION flipside_reject_finance_snapshot_mutation();
CREATE TRIGGER milestone_invoice_draft_no_truncate BEFORE TRUNCATE ON "MilestoneInvoiceDraft" FOR EACH STATEMENT EXECUTE FUNCTION flipside_reject_finance_snapshot_mutation();

COMMIT;
