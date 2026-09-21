-- Complete the committed history without dropping records or rewriting old migrations.
-- Databases already matching this schema must be verified and baselined, not replayed.
BEGIN;

-- DropForeignKey
ALTER TABLE "InviteToken" DROP CONSTRAINT "InviteToken_organizationId_fkey";

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "isOutOfScope" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ClientApproval" ADD COLUMN     "token" TEXT;

-- AlterTable
ALTER TABLE "FeedbackRequest" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "token" TEXT;

-- AlterTable
-- Preserve every existing role; invalid legacy values fail atomically for review.
ALTER TABLE "InviteToken" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "InviteToken" ALTER COLUMN "role" TYPE "Role" USING "role"::text::"Role";
ALTER TABLE "InviteToken" ALTER COLUMN "role" SET DEFAULT 'ADMIN'::"Role";

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "portalToken" TEXT;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'US',
ADD COLUMN     "reviewLink" TEXT,
ADD COLUMN     "smtpFromEmail" TEXT,
ADD COLUMN     "smtpFromName" TEXT,
ADD COLUMN     "smtpPassword" TEXT,
ALTER COLUMN "name" SET DEFAULT 'RenoTrack360';

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'US';

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "consultationFee" DECIMAL(12,2),
ADD COLUMN     "paidSiteVisit" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "uiMode" TEXT NOT NULL DEFAULT 'POWER';

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "company" TEXT,
    "planInterest" TEXT,
    "referralCode" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "ipHash" TEXT,
    "calcLeakTotal" DOUBLE PRECISION,
    "calcData" JSONB,
    "convertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobPhoto" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'DURING',
    "phase" TEXT,
    "roomArea" TEXT,
    "caption" TEXT,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceType" TEXT NOT NULL DEFAULT 'manual',
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_email_key" ON "WaitlistEntry"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ClientApproval_token_key" ON "ClientApproval"("token");

-- CreateIndex
CREATE UNIQUE INDEX "FeedbackRequest_token_key" ON "FeedbackRequest"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Job_portalToken_key" ON "Job"("portalToken");

-- AddForeignKey
ALTER TABLE "InviteToken" ADD CONSTRAINT "InviteToken_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPhoto" ADD CONSTRAINT "JobPhoto_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;


COMMIT;
