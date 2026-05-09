-- Extend profiles from flat contacts into a person/organization relationship graph.

ALTER TYPE "ProfileType" ADD VALUE IF NOT EXISTS 'COMMERCIAL_BUSINESS_OWNER';
ALTER TYPE "ProfileType" ADD VALUE IF NOT EXISTS 'COMMERCIAL_TENANT';
ALTER TYPE "ProfileType" ADD VALUE IF NOT EXISTS 'DEVELOPER';
ALTER TYPE "ProfileType" ADD VALUE IF NOT EXISTS 'CURRENT_CLIENT';
ALTER TYPE "ProfileType" ADD VALUE IF NOT EXISTS 'GENERAL_CONTRACTOR';
ALTER TYPE "ProfileType" ADD VALUE IF NOT EXISTS 'INSURANCE_ADJUSTER';
ALTER TYPE "ProfileType" ADD VALUE IF NOT EXISTS 'LENDER';
ALTER TYPE "ProfileType" ADD VALUE IF NOT EXISTS 'ATTORNEY';
ALTER TYPE "ProfileType" ADD VALUE IF NOT EXISTS 'MUNICIPAL_CONTACT';
ALTER TYPE "ProfileType" ADD VALUE IF NOT EXISTS 'OTHER';

CREATE TYPE "ProfileKind" AS ENUM ('PERSON', 'ORGANIZATION');
CREATE TYPE "ClientStatus" AS ENUM ('NOT_CLIENT', 'PROSPECT', 'ACTIVE_CLIENT', 'PAST_CLIENT', 'VIP_CLIENT', 'DO_NOT_WORK_WITH');

ALTER TABLE "Profile"
  ADD COLUMN "profileKind" "ProfileKind" NOT NULL DEFAULT 'PERSON',
  ADD COLUMN "clientStatus" "ClientStatus" NOT NULL DEFAULT 'PROSPECT',
  ADD COLUMN "companyProfileId" TEXT,
  ADD COLUMN "dedupeKey" TEXT;

CREATE TABLE "ProfileRelationship" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "fromProfileId" TEXT NOT NULL,
  "toProfileId" TEXT NOT NULL,
  "relationshipType" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProfileRelationship_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceTag" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'Trade',
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceTag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProfileServiceTag" (
  "profileId" TEXT NOT NULL,
  "serviceTagId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProfileServiceTag_pkey" PRIMARY KEY ("profileId","serviceTagId")
);

CREATE UNIQUE INDEX "Profile_dedupeKey_key" ON "Profile"("dedupeKey");
CREATE INDEX "Profile_organizationId_profileName_idx" ON "Profile"("organizationId", "profileName");
CREATE INDEX "Profile_organizationId_email_idx" ON "Profile"("organizationId", "email");
CREATE INDEX "Profile_companyProfileId_idx" ON "Profile"("companyProfileId");
CREATE INDEX "ProfileRelationship_organizationId_idx" ON "ProfileRelationship"("organizationId");
CREATE UNIQUE INDEX "ProfileRelationship_fromProfileId_toProfileId_relationshipType_key" ON "ProfileRelationship"("fromProfileId", "toProfileId", "relationshipType");
CREATE UNIQUE INDEX "ServiceTag_organizationId_name_key" ON "ServiceTag"("organizationId", "name");

ALTER TABLE "Profile"
  ADD CONSTRAINT "Profile_companyProfileId_fkey" FOREIGN KEY ("companyProfileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProfileRelationship"
  ADD CONSTRAINT "ProfileRelationship_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ProfileRelationship_fromProfileId_fkey" FOREIGN KEY ("fromProfileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ProfileRelationship_toProfileId_fkey" FOREIGN KEY ("toProfileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ServiceTag"
  ADD CONSTRAINT "ServiceTag_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProfileServiceTag"
  ADD CONSTRAINT "ProfileServiceTag_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ProfileServiceTag_serviceTagId_fkey" FOREIGN KEY ("serviceTagId") REFERENCES "ServiceTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
