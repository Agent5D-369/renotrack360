-- CreateEnum
CREATE TYPE "ServiceStepAudience" AS ENUM ('ESTIMATOR', 'FIELD_CREW', 'CLIENT', 'INTERNAL');

-- CreateEnum
CREATE TYPE "QuoteSectionType" AS ENUM ('INCLUDED_SCOPE', 'EXCLUSIONS', 'ASSUMPTIONS', 'ALLOWANCES', 'RISK_NOTES', 'PERMIT_NOTES', 'CLIENT_NOTES');

-- CreateTable
CREATE TABLE "ServiceTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "costCatalogItemId" TEXT,
    "category" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "templateCode" TEXT NOT NULL,
    "defaultUnitType" TEXT NOT NULL,
    "shortDescription" TEXT,
    "estimatorNotes" TEXT,
    "clientSummary" TEXT,
    "permitGuidance" TEXT,
    "riskGuidance" TEXT,
    "defaultMarkup" DECIMAL(10,2) NOT NULL DEFAULT 18,
    "defaultContingency" DECIMAL(10,2) NOT NULL DEFAULT 8,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceTemplateStep" (
    "id" TEXT NOT NULL,
    "serviceTemplateId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "stepName" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "audience" "ServiceStepAudience" NOT NULL DEFAULT 'FIELD_CREW',
    "required" BOOLEAN NOT NULL DEFAULT true,
    "blocksProgress" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceTemplateStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceTemplateQuoteSection" (
    "id" TEXT NOT NULL,
    "serviceTemplateId" TEXT NOT NULL,
    "sectionType" "QuoteSectionType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "clientVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceTemplateQuoteSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceTemplateTask" (
    "id" TEXT NOT NULL,
    "serviceTemplateId" TEXT NOT NULL,
    "taskName" TEXT NOT NULL,
    "phaseName" TEXT,
    "defaultPriority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "defaultDurationDays" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceTemplateTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceTemplateInvoiceMilestone" (
    "id" TEXT NOT NULL,
    "serviceTemplateId" TEXT NOT NULL,
    "milestoneName" TEXT NOT NULL,
    "percentOfScope" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "triggerEvent" TEXT NOT NULL,
    "clientDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceTemplateInvoiceMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceTemplateEvidenceRequirement" (
    "id" TEXT NOT NULL,
    "serviceTemplateId" TEXT NOT NULL,
    "evidenceType" "EvidenceType" NOT NULL,
    "label" TEXT NOT NULL,
    "instructions" TEXT,
    "requiredBefore" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceTemplateEvidenceRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceTemplate_templateCode_key" ON "ServiceTemplate"("templateCode");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceTemplateStep_serviceTemplateId_stepNumber_key" ON "ServiceTemplateStep"("serviceTemplateId", "stepNumber");

-- AddForeignKey
ALTER TABLE "ServiceTemplate" ADD CONSTRAINT "ServiceTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceTemplate" ADD CONSTRAINT "ServiceTemplate_costCatalogItemId_fkey" FOREIGN KEY ("costCatalogItemId") REFERENCES "CostCatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceTemplateStep" ADD CONSTRAINT "ServiceTemplateStep_serviceTemplateId_fkey" FOREIGN KEY ("serviceTemplateId") REFERENCES "ServiceTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceTemplateQuoteSection" ADD CONSTRAINT "ServiceTemplateQuoteSection_serviceTemplateId_fkey" FOREIGN KEY ("serviceTemplateId") REFERENCES "ServiceTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceTemplateTask" ADD CONSTRAINT "ServiceTemplateTask_serviceTemplateId_fkey" FOREIGN KEY ("serviceTemplateId") REFERENCES "ServiceTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceTemplateInvoiceMilestone" ADD CONSTRAINT "ServiceTemplateInvoiceMilestone_serviceTemplateId_fkey" FOREIGN KEY ("serviceTemplateId") REFERENCES "ServiceTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceTemplateEvidenceRequirement" ADD CONSTRAINT "ServiceTemplateEvidenceRequirement_serviceTemplateId_fkey" FOREIGN KEY ("serviceTemplateId") REFERENCES "ServiceTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
