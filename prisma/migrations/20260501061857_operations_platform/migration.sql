-- CreateEnum
CREATE TYPE "BudgetLineType" AS ENUM ('LABOR', 'MATERIAL', 'SUBCONTRACTOR', 'EQUIPMENT', 'PERMIT', 'REIMBURSEMENT', 'OVERHEAD', 'CONTINGENCY');

-- CreateEnum
CREATE TYPE "ResourceStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'LOST', 'RETIRED');

-- CreateEnum
CREATE TYPE "PermitStatus" AS ENUM ('NOT_REQUIRED', 'NEEDS_REVIEW', 'DRAFTING', 'SUBMITTED', 'APPROVED', 'INSPECTION_SCHEDULED', 'PASSED', 'FAILED', 'CLOSED');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('REQUESTED', 'RECEIVED', 'REVIEW_REQUESTED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AiTaskStatus" AS ENUM ('QUEUED', 'IN_PROGRESS', 'NEEDS_REVIEW', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "BudgetLine" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "lineType" "BudgetLineType" NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "estimatedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "committedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "actualAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "forecastAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "varianceAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reimbursement" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "profileId" TEXT,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "receiptUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Submitted',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "reimbursedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reimbursement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamCircle" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "circleName" TEXT NOT NULL,
    "purpose" TEXT,
    "defaultRole" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamCircle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamCircleMember" (
    "id" TEXT NOT NULL,
    "teamCircleId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "role" TEXT,
    "skillTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "availability" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamCircleMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "profileId" TEXT,
    "workDate" TIMESTAMP(3) NOT NULL,
    "hours" DECIMAL(8,2) NOT NULL,
    "laborType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Submitted',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "jobId" TEXT,
    "title" TEXT NOT NULL,
    "meetingType" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "attendees" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "agenda" TEXT,
    "decisions" TEXT,
    "actionItems" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldReport" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "reportDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "crewSummary" TEXT NOT NULL,
    "workCompleted" TEXT NOT NULL,
    "blockers" TEXT,
    "materialsUsed" TEXT,
    "equipmentUsed" TEXT,
    "weatherNotes" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "clientVisible" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermitRecord" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "permitName" TEXT NOT NULL,
    "jurisdiction" TEXT,
    "permitNumber" TEXT,
    "status" "PermitStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "inspectionDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermitRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentReport" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "incidentDate" TIMESTAMP(3) NOT NULL,
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'LOW',
    "description" TEXT NOT NULL,
    "correctiveAction" TEXT,
    "reportedBy" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncidentReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyAuditTemplate" (
    "id" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "checklist" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyAuditTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyAudit" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "templateId" TEXT,
    "auditDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" INTEGER NOT NULL DEFAULT 100,
    "findings" TEXT,
    "correctiveActions" TEXT,
    "completedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unitType" TEXT NOT NULL,
    "quantityOnHand" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "reorderPoint" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "preferredVendor" TEXT,
    "barcode" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialRequest" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "materialItemId" TEXT,
    "itemName" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "neededBy" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Requested',
    "deliveryNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentAsset" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assetName" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "status" "ResourceStatus" NOT NULL DEFAULT 'AVAILABLE',
    "barcode" TEXT,
    "maintenanceDue" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentAssignment" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "assignedFrom" TIMESTAMP(3) NOT NULL,
    "assignedUntil" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolAsset" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" "ResourceStatus" NOT NULL DEFAULT 'AVAILABLE',
    "barcode" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToolAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolAssignment" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToolAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "projectType" TEXT NOT NULL,
    "description" TEXT,
    "rollbackPlan" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectTemplateStep" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "stepName" TEXT NOT NULL,
    "defaultDurationDays" INTEGER NOT NULL DEFAULT 1,
    "checklist" JSONB,
    "rollbackNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectTemplateStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientPortalUpdate" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "visibleAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requiresDecision" BOOLEAN NOT NULL DEFAULT false,
    "decisionPrompt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientPortalUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackRequest" (
    "id" TEXT NOT NULL,
    "jobId" TEXT,
    "profileId" TEXT,
    "requestType" TEXT NOT NULL,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedAt" TIMESTAMP(3),
    "rating" INTEGER,
    "feedback" TEXT,
    "publicTestimonial" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedbackRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAgent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "roleName" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "guardrails" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiTask" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "agentId" TEXT,
    "taskName" TEXT NOT NULL,
    "workflowArea" TEXT NOT NULL,
    "status" "AiTaskStatus" NOT NULL DEFAULT 'QUEUED',
    "prompt" TEXT NOT NULL,
    "resultSummary" TEXT,
    "humanReviewRequired" BOOLEAN NOT NULL DEFAULT true,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamCircleMember_teamCircleId_profileId_key" ON "TeamCircleMember"("teamCircleId", "profileId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectTemplateStep_templateId_stepNumber_key" ON "ProjectTemplateStep"("templateId", "stepNumber");

-- AddForeignKey
ALTER TABLE "BudgetLine" ADD CONSTRAINT "BudgetLine_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reimbursement" ADD CONSTRAINT "Reimbursement_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reimbursement" ADD CONSTRAINT "Reimbursement_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamCircle" ADD CONSTRAINT "TeamCircle_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamCircleMember" ADD CONSTRAINT "TeamCircleMember_teamCircleId_fkey" FOREIGN KEY ("teamCircleId") REFERENCES "TeamCircle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamCircleMember" ADD CONSTRAINT "TeamCircleMember_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldReport" ADD CONSTRAINT "FieldReport_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermitRecord" ADD CONSTRAINT "PermitRecord_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentReport" ADD CONSTRAINT "IncidentReport_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyAudit" ADD CONSTRAINT "SafetyAudit_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyAudit" ADD CONSTRAINT "SafetyAudit_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "SafetyAuditTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialItem" ADD CONSTRAINT "MaterialItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRequest" ADD CONSTRAINT "MaterialRequest_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRequest" ADD CONSTRAINT "MaterialRequest_materialItemId_fkey" FOREIGN KEY ("materialItemId") REFERENCES "MaterialItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentAsset" ADD CONSTRAINT "EquipmentAsset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentAssignment" ADD CONSTRAINT "EquipmentAssignment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentAssignment" ADD CONSTRAINT "EquipmentAssignment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "EquipmentAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolAsset" ADD CONSTRAINT "ToolAsset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolAssignment" ADD CONSTRAINT "ToolAssignment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolAssignment" ADD CONSTRAINT "ToolAssignment_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "ToolAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTemplate" ADD CONSTRAINT "ProjectTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTemplateStep" ADD CONSTRAINT "ProjectTemplateStep_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProjectTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPortalUpdate" ADD CONSTRAINT "ClientPortalUpdate_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackRequest" ADD CONSTRAINT "FeedbackRequest_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackRequest" ADD CONSTRAINT "FeedbackRequest_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAgent" ADD CONSTRAINT "AiAgent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiTask" ADD CONSTRAINT "AiTask_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiTask" ADD CONSTRAINT "AiTask_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AiAgent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
