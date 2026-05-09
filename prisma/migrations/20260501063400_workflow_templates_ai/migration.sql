-- CreateEnum
CREATE TYPE "ChecklistEntityType" AS ENUM ('LEAD', 'PROPERTY', 'QUOTE', 'ESTIMATE', 'JOB', 'PHASE', 'TASK', 'CHANGE_ORDER', 'INVOICE', 'PERMIT', 'SAFETY_AUDIT', 'FIELD_REPORT', 'CLOSEOUT');

-- CreateEnum
CREATE TYPE "ChecklistItemAction" AS ENUM ('NONE', 'CREATE_TASK', 'REQUIRE_PHOTO', 'REQUIRE_SIGNATURE', 'CREATE_CHANGE_ORDER', 'BLOCK_PHASE', 'BLOCK_INVOICE', 'CLIENT_DECISION');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('PHOTO', 'DOCUMENT', 'SIGNATURE', 'NOTE', 'VIDEO');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'APPROVED', 'DECLINED', 'CHANGES_REQUESTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('UPLOADED', 'MAPPING', 'VALIDATING', 'READY', 'IMPORTED', 'FAILED');

-- AlterTable
ALTER TABLE "AiTask" ADD COLUMN     "targetId" TEXT,
ADD COLUMN     "targetType" "ChecklistEntityType";

-- CreateTable
CREATE TABLE "EstimateOption" (
    "id" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "optionName" TEXT NOT NULL,
    "optionTier" TEXT NOT NULL,
    "description" TEXT,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "included" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstimateOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "entityType" "ChecklistEntityType" NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "blocksProgress" BOOLEAN NOT NULL DEFAULT false,
    "clientVisibleDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistTemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "itemText" TEXT NOT NULL,
    "helpText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "clientVisible" BOOLEAN NOT NULL DEFAULT false,
    "actionOnFail" "ChecklistItemAction" NOT NULL DEFAULT 'NONE',
    "evidenceType" "EvidenceType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistRun" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "entityType" "ChecklistEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Open',
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistRunItem" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "templateItemId" TEXT,
    "itemText" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Open',
    "completedAt" TIMESTAMP(3),
    "failedReason" TEXT,
    "evidenceRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistRunItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequiredEvidence" (
    "id" TEXT NOT NULL,
    "runItemId" TEXT,
    "entityType" "ChecklistEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "evidenceType" "EvidenceType" NOT NULL,
    "label" TEXT NOT NULL,
    "instructions" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "satisfiedAt" TIMESTAMP(3),
    "fileAssetId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequiredEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientApproval" (
    "id" TEXT NOT NULL,
    "estimateId" TEXT,
    "changeOrderId" TEXT,
    "invoiceId" TEXT,
    "approvalType" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "sentAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "signerName" TEXT,
    "signerEmail" TEXT,
    "ipAddressHash" TEXT,
    "signatureData" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldAssignment" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "jobId" TEXT,
    "taskId" TEXT,
    "assignmentDate" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Scheduled',
    "instructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "importType" TEXT NOT NULL,
    "sourceSystem" TEXT,
    "fileName" TEXT,
    "status" "ImportStatus" NOT NULL DEFAULT 'UPLOADED',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "importedRows" INTEGER NOT NULL DEFAULT 0,
    "failedRows" INTEGER NOT NULL DEFAULT 0,
    "mapping" JSONB,
    "errorSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EstimateOption" ADD CONSTRAINT "EstimateOption_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistTemplate" ADD CONSTRAINT "ChecklistTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistTemplateItem" ADD CONSTRAINT "ChecklistTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChecklistTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistRun" ADD CONSTRAINT "ChecklistRun_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChecklistTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistRunItem" ADD CONSTRAINT "ChecklistRunItem_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ChecklistRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistRunItem" ADD CONSTRAINT "ChecklistRunItem_templateItemId_fkey" FOREIGN KEY ("templateItemId") REFERENCES "ChecklistTemplateItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequiredEvidence" ADD CONSTRAINT "RequiredEvidence_runItemId_fkey" FOREIGN KEY ("runItemId") REFERENCES "ChecklistRunItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientApproval" ADD CONSTRAINT "ClientApproval_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldAssignment" ADD CONSTRAINT "FieldAssignment_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
