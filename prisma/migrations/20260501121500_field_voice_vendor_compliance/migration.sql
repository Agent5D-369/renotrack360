CREATE TYPE "W9Status" AS ENUM ('NOT_REQUIRED', 'NEEDED', 'REQUESTED', 'RECEIVED', 'EXPIRED', 'BLOCKED');
CREATE TYPE "VendorOnboardingStatus" AS ENUM ('NOT_STARTED', 'INVITED', 'DOCS_PENDING', 'READY', 'BLOCKED', 'INACTIVE');

ALTER TABLE "Profile"
  ADD COLUMN "w9Status" "W9Status" NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN "w9RequestedAt" TIMESTAMP(3),
  ADD COLUMN "w9ReceivedAt" TIMESTAMP(3),
  ADD COLUMN "w9FileAssetId" TEXT,
  ADD COLUMN "vendorOnboardingStatus" "VendorOnboardingStatus" NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "insuranceExpiration" TIMESTAMP(3),
  ADD COLUMN "complianceNotes" TEXT;

CREATE TABLE "VoiceNote" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "transcript" TEXT NOT NULL,
  "sourceLocale" TEXT NOT NULL DEFAULT 'en',
  "translatedText" TEXT,
  "targetLocale" TEXT,
  "translationStatus" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
  "audioFileAssetId" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VoiceNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VoiceNote_organizationId_entityType_entityId_idx" ON "VoiceNote"("organizationId", "entityType", "entityId");

ALTER TABLE "VoiceNote"
  ADD CONSTRAINT "VoiceNote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
