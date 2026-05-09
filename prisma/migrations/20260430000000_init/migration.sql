-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'PROJECT_MANAGER', 'ESTIMATOR', 'FIELD_CREW', 'CLIENT');

-- CreateEnum
CREATE TYPE "ProfileType" AS ENUM ('AGENT', 'ARCHITECT', 'DESIGNER', 'HOMEOWNER', 'INVESTOR', 'PAST_CLIENT', 'PROPERTY_MANAGER', 'VENDOR_SUBCONTRACTOR');

-- CreateEnum
CREATE TYPE "LeadStage" AS ENUM ('NEW_LEAD', 'RESEARCHING', 'CONTACTED', 'DISCOVERY_SCHEDULED', 'WALKTHROUGH_SCHEDULED', 'SCOPE_REQUESTED', 'QUOTE_IN_PROGRESS', 'QUOTE_SENT', 'FOLLOW_UP_NEEDED', 'WON', 'LOST', 'NURTURE');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('CONDO', 'DUPLEX', 'FOURPLEX', 'LUXURY_HOME', 'MULTIFAMILY', 'RENTAL', 'SINGLE_FAMILY_HOME', 'STALE_LISTING', 'VALUE_ADD_INVESTOR_PROPERTY');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('INTAKE_NEEDED', 'SITE_VISIT_NEEDED', 'SCOPE_DRAFT', 'PRICING', 'REVIEW', 'SENT', 'APPROVED', 'DECLINED', 'CONVERTED_TO_JOB');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'UNKNOWN_CONDITION');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PRE_CONSTRUCTION', 'DEPOSIT_RECEIVED', 'MATERIALS_PLANNING', 'DEMO', 'ROUGH_IN', 'INSPECTIONS', 'DRYWALL_SURFACES', 'FINISHES', 'PUNCH_LIST', 'FINAL_WALKTHROUGH', 'COMPLETE', 'WARRANTY_FOLLOW_UP');

-- CreateEnum
CREATE TYPE "PhaseStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETE');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETE');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "ChangeOrderStatus" AS ENUM ('DRAFT', 'SENT', 'APPROVED', 'DECLINED', 'COMPLETED', 'VOID');

-- CreateEnum
CREATE TYPE "EstimateStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('STRIPE', 'ACH', 'CHECK', 'CASH', 'ZELLE', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "FinancingStatus" AS ENUM ('NOT_NEEDED', 'DISCUSSED', 'CLIENT_INTERESTED', 'APPLICATION_SENT', 'PENDING', 'APPROVED', 'DECLINED', 'SELF_FUNDED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('CALL', 'EMAIL', 'TEXT', 'MEETING', 'SITE_VISIT', 'FOLLOW_UP', 'NOTE', 'TASK', 'QUOTE_SENT', 'INVOICE_SENT', 'PAYMENT_RECEIVED');

-- CreateEnum
CREATE TYPE "FileEntityType" AS ENUM ('PROFILE', 'PROPERTY', 'QUOTE', 'JOB', 'WEEKLY_REPORT', 'CHANGE_ORDER', 'INVOICE');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Flipside Renovations',
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "logoUrl" TEXT,
    "defaultMarkup" DECIMAL(10,2) NOT NULL DEFAULT 18,
    "defaultContingency" DECIMAL(10,2) NOT NULL DEFAULT 8,
    "paymentTerms" TEXT NOT NULL DEFAULT 'Payment is due by the invoice due date. Work changes require written approval.',
    "estimateTerms" TEXT NOT NULL DEFAULT 'Estimate is valid until the expiration date and subject to approved scope, site conditions, selections, and trade pricing.',
    "invoiceTerms" TEXT NOT NULL DEFAULT 'Invoices are payable by the listed due date. Card or ACH processing may be handled by Stripe when configured.',
    "weeklyReportFooter" TEXT NOT NULL DEFAULT 'Prepared by Flipside Renovations. Veteran-owned renovation operations.',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'OWNER',
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "profileName" TEXT NOT NULL,
    "profileType" "ProfileType" NOT NULL,
    "companyName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "location" TEXT,
    "source" TEXT,
    "relationshipStrength" INTEGER NOT NULL DEFAULT 50,
    "trustLevel" INTEGER NOT NULL DEFAULT 50,
    "leadPotential" INTEGER NOT NULL DEFAULT 50,
    "referralPotential" INTEGER NOT NULL DEFAULT 50,
    "notes" TEXT,
    "nextFollowUp" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyAddress" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "propertyType" "PropertyType" NOT NULL,
    "occupancyStatus" TEXT,
    "ownerType" TEXT,
    "listingStatus" TEXT,
    "agentProfileId" TEXT,
    "investorProfileId" TEXT,
    "estimatedARV" DECIMAL(12,2),
    "currentCondition" TEXT,
    "renovationGoal" TEXT,
    "riskNotes" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadName" TEXT NOT NULL,
    "leadType" TEXT,
    "source" TEXT,
    "relatedProfileId" TEXT,
    "relatedPropertyId" TEXT,
    "estimatedBudget" DECIMAL(12,2),
    "urgency" INTEGER NOT NULL DEFAULT 50,
    "jobFitScore" INTEGER NOT NULL DEFAULT 50,
    "trustFitScore" INTEGER NOT NULL DEFAULT 50,
    "scopeClarity" INTEGER NOT NULL DEFAULT 50,
    "financingNeed" BOOLEAN NOT NULL DEFAULT false,
    "probability" INTEGER NOT NULL DEFAULT 50,
    "nextAction" TEXT,
    "followUpDate" TIMESTAMP(3),
    "status" "LeadStage" NOT NULL DEFAULT 'NEW_LEAD',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "quoteName" TEXT NOT NULL,
    "clientProfileId" TEXT,
    "propertyId" TEXT,
    "leadId" TEXT,
    "quoteStatus" "QuoteStatus" NOT NULL DEFAULT 'INTAKE_NEEDED',
    "requestedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetSendDate" TIMESTAMP(3),
    "projectType" TEXT,
    "budgetRange" TEXT,
    "siteVisitRequired" BOOLEAN NOT NULL DEFAULT true,
    "permitLikely" BOOLEAN NOT NULL DEFAULT false,
    "tradesNeeded" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "totalLow" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalTarget" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalHigh" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "gcMarkup" DECIMAL(10,2) NOT NULL DEFAULT 18,
    "contingency" DECIMAL(10,2) NOT NULL DEFAULT 8,
    "finalQuoteAmount" DECIMAL(12,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteLineItem" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "scopeArea" TEXT NOT NULL,
    "costCatalogItemId" TEXT,
    "lineItemName" TEXT NOT NULL,
    "unitType" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 1,
    "laborLow" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "laborTarget" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "laborHigh" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "materialLow" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "materialTarget" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "materialHigh" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "subcontractorCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "markupPercent" DECIMAL(10,2) NOT NULL DEFAULT 18,
    "riskFactor" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "totalLow" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalTarget" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalHigh" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "manualTotalLow" DECIMAL(12,2),
    "manualTotalTarget" DECIMAL(12,2),
    "manualTotalHigh" DECIMAL(12,2),
    "clientFacingDescription" TEXT,
    "internalNotes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostCatalogItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "unitType" TEXT NOT NULL,
    "typicalQuantityRange" TEXT,
    "flipsideLowCost" DECIMAL(12,2) NOT NULL,
    "flipsideTargetCost" DECIMAL(12,2) NOT NULL,
    "flipsideHighCost" DECIMAL(12,2) NOT NULL,
    "laborAssumptions" TEXT,
    "materialAssumptions" TEXT,
    "laborRange" TEXT,
    "materialRange" TEXT,
    "markup" DECIMAL(10,2) NOT NULL DEFAULT 18,
    "riskFactor" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "complexityLevel" TEXT,
    "permitTrigger" TEXT,
    "licensedTradeRequired" BOOLEAN NOT NULL DEFAULT false,
    "austinNotes" TEXT,
    "referenceUrl" TEXT,
    "vendorQuoteNotes" TEXT,
    "projectHistoryNotes" TEXT,
    "internalPricingNotes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostCatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "clientProfileId" TEXT,
    "propertyId" TEXT,
    "approvedQuoteId" TEXT,
    "jobStatus" "JobStatus" NOT NULL DEFAULT 'PRE_CONSTRUCTION',
    "startDate" TIMESTAMP(3),
    "targetCompletion" TIMESTAMP(3),
    "contractAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balanceDue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "activePhase" TEXT,
    "weeklyReportDue" TIMESTAMP(3),
    "permitStatus" TEXT,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RenovationPhase" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "phaseNumber" INTEGER NOT NULL,
    "phaseName" TEXT NOT NULL,
    "status" "PhaseStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "startDate" TIMESTAMP(3),
    "completionDate" TIMESTAMP(3),
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "clientUpdate" TEXT,
    "risks" TEXT,
    "completionCriteria" TEXT,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RenovationPhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "taskName" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "phaseId" TEXT,
    "assignedToProfileId" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "TaskStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyReport" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "weekEnding" TIMESTAMP(3) NOT NULL,
    "workCompleted" TEXT NOT NULL,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "issuesFound" TEXT,
    "decisionsNeeded" TEXT,
    "budgetNotes" TEXT,
    "scheduleNotes" TEXT,
    "nextWeekPlan" TEXT,
    "clientSummary" TEXT,
    "internalNotes" TEXT,
    "sentAt" TIMESTAMP(3),
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeOrder" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "clientProfileId" TEXT,
    "changeOrderTitle" TEXT NOT NULL,
    "reason" TEXT,
    "clientRequested" BOOLEAN NOT NULL DEFAULT false,
    "fieldCondition" TEXT,
    "addedCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "addedTime" INTEGER NOT NULL DEFAULT 0,
    "status" "ChangeOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedDate" TIMESTAMP(3),
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "signatureApprovalNotes" TEXT,
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChangeOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Estimate" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "estimateNumber" TEXT NOT NULL,
    "clientProfileId" TEXT,
    "propertyId" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expirationDate" TIMESTAMP(3),
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "markup" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "contingency" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "EstimateStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "terms" TEXT,
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Estimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "jobId" TEXT,
    "clientProfileId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balanceDue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "stripePaymentLink" TEXT,
    "notes" TEXT,
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "clientProfileId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" "PaymentMethod" NOT NULL DEFAULT 'STRIPE',
    "stripePaymentIntentId" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'COMPLETED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Financing" (
    "id" TEXT NOT NULL,
    "clientProfileId" TEXT,
    "quoteId" TEXT,
    "jobId" TEXT,
    "financingNeeded" BOOLEAN NOT NULL DEFAULT false,
    "desiredAmount" DECIMAL(12,2),
    "status" "FinancingStatus" NOT NULL DEFAULT 'NOT_NEEDED',
    "provider" TEXT,
    "applicationUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Financing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "relatedProfileId" TEXT,
    "relatedLeadId" TEXT,
    "relatedPropertyId" TEXT,
    "relatedQuoteId" TEXT,
    "relatedJobId" TEXT,
    "relatedInvoiceId" TEXT,
    "activityType" "ActivityType" NOT NULL DEFAULT 'NOTE',
    "subject" TEXT NOT NULL,
    "body" TEXT,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileAsset" (
    "id" TEXT NOT NULL,
    "entityType" "FileEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "storageProvider" TEXT NOT NULL DEFAULT 'local',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "RenovationPhase_jobId_phaseNumber_key" ON "RenovationPhase"("jobId", "phaseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Estimate_estimateNumber_key" ON "Estimate"("estimateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_agentProfileId_fkey" FOREIGN KEY ("agentProfileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_investorProfileId_fkey" FOREIGN KEY ("investorProfileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_relatedProfileId_fkey" FOREIGN KEY ("relatedProfileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_relatedPropertyId_fkey" FOREIGN KEY ("relatedPropertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_clientProfileId_fkey" FOREIGN KEY ("clientProfileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLineItem" ADD CONSTRAINT "QuoteLineItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLineItem" ADD CONSTRAINT "QuoteLineItem_costCatalogItemId_fkey" FOREIGN KEY ("costCatalogItemId") REFERENCES "CostCatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostCatalogItem" ADD CONSTRAINT "CostCatalogItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_clientProfileId_fkey" FOREIGN KEY ("clientProfileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_approvedQuoteId_fkey" FOREIGN KEY ("approvedQuoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RenovationPhase" ADD CONSTRAINT "RenovationPhase_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "RenovationPhase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedToProfileId_fkey" FOREIGN KEY ("assignedToProfileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyReport" ADD CONSTRAINT "WeeklyReport_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeOrder" ADD CONSTRAINT "ChangeOrder_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeOrder" ADD CONSTRAINT "ChangeOrder_clientProfileId_fkey" FOREIGN KEY ("clientProfileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_clientProfileId_fkey" FOREIGN KEY ("clientProfileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientProfileId_fkey" FOREIGN KEY ("clientProfileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_clientProfileId_fkey" FOREIGN KEY ("clientProfileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Financing" ADD CONSTRAINT "Financing_clientProfileId_fkey" FOREIGN KEY ("clientProfileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Financing" ADD CONSTRAINT "Financing_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Financing" ADD CONSTRAINT "Financing_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_relatedProfileId_fkey" FOREIGN KEY ("relatedProfileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_relatedLeadId_fkey" FOREIGN KEY ("relatedLeadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_relatedPropertyId_fkey" FOREIGN KEY ("relatedPropertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_relatedQuoteId_fkey" FOREIGN KEY ("relatedQuoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_relatedJobId_fkey" FOREIGN KEY ("relatedJobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_relatedInvoiceId_fkey" FOREIGN KEY ("relatedInvoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
