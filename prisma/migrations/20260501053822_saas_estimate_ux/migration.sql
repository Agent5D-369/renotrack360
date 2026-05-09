-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE', 'UNPAID');

-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('SOLO', 'TEAM', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "EstimateFollowUpStatus" AS ENUM ('SCHEDULED', 'DUE', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "EstimateFollowUpType" AS ENUM ('CONFIRM_RECEIVED', 'ANSWER_QUESTIONS', 'DECISION_TIMELINE', 'FINAL_CHECK_IN', 'NURTURE');

-- CreateEnum
CREATE TYPE "ConfidenceLevel" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- AlterTable
ALTER TABLE "Estimate" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "clientFacingSummary" TEXT,
ADD COLUMN     "confidenceLevel" "ConfidenceLevel" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "confidenceScore" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "declinedAt" TIMESTAMP(3),
ADD COLUMN     "internalRiskNotes" TEXT,
ADD COLUMN     "nextFollowUpDue" TIMESTAMP(3),
ADD COLUMN     "pricingSource" TEXT,
ADD COLUMN     "readinessScore" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "scopeClarity" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "sentAt" TIMESTAMP(3),
ADD COLUMN     "viewedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "planTier" "PlanTier" NOT NULL DEFAULT 'SOLO',
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "subscriptionEndsAt" TIMESTAMP(3),
ADD COLUMN     "subscriptionStatus" "SubscriptionStatus",
ADD COLUMN     "themePreference" TEXT NOT NULL DEFAULT 'flipside-field-light';

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ADMIN',
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "invitedEmail" TEXT,
    "invitedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "planTier" "PlanTier" NOT NULL DEFAULT 'SOLO',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "currentPeriodEnd" TIMESTAMP(3),
    "activeJobLimit" INTEGER NOT NULL DEFAULT 3,
    "monthlyEstimateLimit" INTEGER NOT NULL DEFAULT 25,
    "userLimit" INTEGER NOT NULL DEFAULT 2,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostAssembly" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assemblyName" TEXT NOT NULL,
    "projectType" TEXT NOT NULL,
    "description" TEXT,
    "defaultScopeNotes" TEXT,
    "market" TEXT NOT NULL DEFAULT 'Austin, TX',
    "complexityLevel" TEXT NOT NULL DEFAULT 'Standard',
    "confidenceLevel" "ConfidenceLevel" NOT NULL DEFAULT 'MEDIUM',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostAssembly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostAssemblyItem" (
    "id" TEXT NOT NULL,
    "assemblyId" TEXT NOT NULL,
    "costCatalogItemId" TEXT NOT NULL,
    "scopeArea" TEXT NOT NULL,
    "defaultQuantity" DECIMAL(12,2) NOT NULL DEFAULT 1,
    "quantityFormula" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostAssemblyItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketCostFactor" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "marketName" TEXT NOT NULL,
    "zipPrefix" TEXT,
    "laborMultiplier" DECIMAL(6,3) NOT NULL DEFAULT 1,
    "materialMultiplier" DECIMAL(6,3) NOT NULL DEFAULT 1,
    "permitMultiplier" DECIMAL(6,3) NOT NULL DEFAULT 1,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketCostFactor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaborRate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tradeName" TEXT NOT NULL,
    "crewType" TEXT,
    "hourlyRate" DECIMAL(10,2) NOT NULL,
    "burdenPercent" DECIMAL(10,2) NOT NULL DEFAULT 18,
    "marketName" TEXT NOT NULL DEFAULT 'Austin, TX',
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaborRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialAllowance" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "allowanceName" TEXT NOT NULL,
    "qualityTier" TEXT NOT NULL DEFAULT 'Better',
    "unitType" TEXT NOT NULL,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialAllowance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorQuote" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorProfileId" TEXT,
    "costCatalogItemId" TEXT,
    "quoteLineItemId" TEXT,
    "vendorName" TEXT NOT NULL,
    "quotedAmount" DECIMAL(12,2) NOT NULL,
    "quoteDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "confidenceLevel" "ConfidenceLevel" NOT NULL DEFAULT 'HIGH',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActualCost" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "jobId" TEXT,
    "quoteLineItemId" TEXT,
    "costCatalogItemId" TEXT,
    "costType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "estimatedAmount" DECIMAL(12,2),
    "actualAmount" DECIMAL(12,2) NOT NULL,
    "varianceAmount" DECIMAL(12,2),
    "costDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActualCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstimateRevision" (
    "id" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "reason" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "snapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstimateRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstimateViewEvent" (
    "id" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipHash" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "EstimateViewEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstimateFollowUp" (
    "id" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "relatedLeadId" TEXT,
    "followUpType" "EstimateFollowUpType" NOT NULL,
    "status" "EstimateFollowUpStatus" NOT NULL DEFAULT 'SCHEDULED',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "suggestedMessage" TEXT,
    "outcomeNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstimateFollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_organizationId_key" ON "Membership"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_organizationId_key" ON "Subscription"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "EstimateRevision_estimateId_revisionNumber_key" ON "EstimateRevision"("estimateId", "revisionNumber");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostAssembly" ADD CONSTRAINT "CostAssembly_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostAssemblyItem" ADD CONSTRAINT "CostAssemblyItem_assemblyId_fkey" FOREIGN KEY ("assemblyId") REFERENCES "CostAssembly"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostAssemblyItem" ADD CONSTRAINT "CostAssemblyItem_costCatalogItemId_fkey" FOREIGN KEY ("costCatalogItemId") REFERENCES "CostCatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketCostFactor" ADD CONSTRAINT "MarketCostFactor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaborRate" ADD CONSTRAINT "LaborRate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialAllowance" ADD CONSTRAINT "MaterialAllowance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorQuote" ADD CONSTRAINT "VendorQuote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorQuote" ADD CONSTRAINT "VendorQuote_costCatalogItemId_fkey" FOREIGN KEY ("costCatalogItemId") REFERENCES "CostCatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorQuote" ADD CONSTRAINT "VendorQuote_quoteLineItemId_fkey" FOREIGN KEY ("quoteLineItemId") REFERENCES "QuoteLineItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActualCost" ADD CONSTRAINT "ActualCost_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActualCost" ADD CONSTRAINT "ActualCost_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActualCost" ADD CONSTRAINT "ActualCost_quoteLineItemId_fkey" FOREIGN KEY ("quoteLineItemId") REFERENCES "QuoteLineItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActualCost" ADD CONSTRAINT "ActualCost_costCatalogItemId_fkey" FOREIGN KEY ("costCatalogItemId") REFERENCES "CostCatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateRevision" ADD CONSTRAINT "EstimateRevision_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateViewEvent" ADD CONSTRAINT "EstimateViewEvent_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateFollowUp" ADD CONSTRAINT "EstimateFollowUp_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateFollowUp" ADD CONSTRAINT "EstimateFollowUp_relatedLeadId_fkey" FOREIGN KEY ("relatedLeadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
