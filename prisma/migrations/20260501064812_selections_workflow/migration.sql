-- CreateEnum
CREATE TYPE "SelectionSheetStatus" AS ENUM ('DRAFT', 'SENT', 'CLIENT_REVIEWING', 'APPROVED', 'NEEDS_REVISION', 'ORDERED', 'INSTALLED');

-- CreateEnum
CREATE TYPE "SelectionDecisionStatus" AS ENUM ('NOT_STARTED', 'OPTIONS_SENT', 'CLIENT_REVIEWING', 'APPROVED', 'NEEDS_REVISION', 'ORDERED', 'RECEIVED', 'INSTALLED', 'BACKORDERED');

-- CreateEnum
CREATE TYPE "GoodBetterBestTier" AS ENUM ('GOOD', 'BETTER', 'BEST', 'CUSTOM');

-- AlterTable
ALTER TABLE "ClientApproval" ADD COLUMN     "selectionItemId" TEXT;

-- CreateTable
CREATE TABLE "SelectionSheet" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "estimateId" TEXT,
    "clientProfileId" TEXT,
    "sheetName" TEXT NOT NULL,
    "roomArea" TEXT,
    "status" "SelectionSheetStatus" NOT NULL DEFAULT 'DRAFT',
    "dueDate" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SelectionSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SelectionItem" (
    "id" TEXT NOT NULL,
    "selectionSheetId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "roomArea" TEXT,
    "itemName" TEXT NOT NULL,
    "allowanceAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "targetBudget" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "selectedVendor" TEXT,
    "selectedSku" TEXT,
    "selectedUrl" TEXT,
    "selectedPhoto" TEXT,
    "leadTimeDays" INTEGER NOT NULL DEFAULT 0,
    "requiredByDate" TIMESTAMP(3),
    "decisionStatus" "SelectionDecisionStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "procurementStatus" TEXT NOT NULL DEFAULT 'Not ordered',
    "selectedOptionId" TEXT,
    "priceVariance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "scheduleImpactDays" INTEGER NOT NULL DEFAULT 0,
    "changeOrderNeeded" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SelectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SelectionOption" (
    "id" TEXT NOT NULL,
    "selectionItemId" TEXT NOT NULL,
    "optionName" TEXT NOT NULL,
    "tier" "GoodBetterBestTier" NOT NULL DEFAULT 'BETTER',
    "unitCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "vendor" TEXT,
    "productUrl" TEXT,
    "imageUrl" TEXT,
    "pros" TEXT,
    "cons" TEXT,
    "contractorRecommendation" BOOLEAN NOT NULL DEFAULT false,
    "clientApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SelectionOption_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ClientApproval" ADD CONSTRAINT "ClientApproval_selectionItemId_fkey" FOREIGN KEY ("selectionItemId") REFERENCES "SelectionItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectionSheet" ADD CONSTRAINT "SelectionSheet_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectionSheet" ADD CONSTRAINT "SelectionSheet_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectionSheet" ADD CONSTRAINT "SelectionSheet_clientProfileId_fkey" FOREIGN KEY ("clientProfileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectionItem" ADD CONSTRAINT "SelectionItem_selectionSheetId_fkey" FOREIGN KEY ("selectionSheetId") REFERENCES "SelectionSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectionOption" ADD CONSTRAINT "SelectionOption_selectionItemId_fkey" FOREIGN KEY ("selectionItemId") REFERENCES "SelectionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
