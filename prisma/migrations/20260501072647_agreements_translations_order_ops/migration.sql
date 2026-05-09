-- CreateEnum
CREATE TYPE "AgreementStatus" AS ENUM ('DRAFT', 'COUNSEL_REVIEW', 'APPROVED_TEMPLATE', 'SENT', 'VIEWED', 'SIGNED', 'DECLINED', 'EXPIRED', 'VOID');

-- CreateEnum
CREATE TYPE "TranslationStatus" AS ENUM ('DRAFT', 'MACHINE_TRANSLATED', 'HUMAN_REVIEW_NEEDED', 'APPROVED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "AgreementTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "agreementType" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL DEFAULT 'Multi-state',
    "version" TEXT NOT NULL DEFAULT '1.0',
    "summary" TEXT,
    "body" TEXT NOT NULL,
    "counselReviewed" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgreementTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agreement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "agreementTemplateId" TEXT,
    "profileId" TEXT,
    "jobId" TEXT,
    "agreementName" TEXT NOT NULL,
    "agreementType" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL DEFAULT 'Multi-state',
    "status" "AgreementStatus" NOT NULL DEFAULT 'DRAFT',
    "bodySnapshot" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "externalEnvelopeId" TEXT,
    "pdfUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgreementSignature" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "signerEmail" TEXT,
    "signerRole" TEXT,
    "signatureType" TEXT NOT NULL DEFAULT 'typed',
    "signatureData" TEXT,
    "ipAddressHash" TEXT,
    "userAgent" TEXT,
    "consentText" TEXT,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgreementSignature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgreementAuditEvent" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "actorEmail" TEXT,
    "ipAddressHash" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgreementAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranslationRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceLocale" TEXT NOT NULL DEFAULT 'en',
    "targetLocale" TEXT NOT NULL,
    "sourceText" TEXT NOT NULL,
    "translatedText" TEXT NOT NULL,
    "status" "TranslationStatus" NOT NULL DEFAULT 'MACHINE_TRANSLATED',
    "provider" TEXT,
    "humanReviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TranslationRecord_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AgreementTemplate" ADD CONSTRAINT "AgreementTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_agreementTemplateId_fkey" FOREIGN KEY ("agreementTemplateId") REFERENCES "AgreementTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgreementSignature" ADD CONSTRAINT "AgreementSignature_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgreementAuditEvent" ADD CONSTRAINT "AgreementAuditEvent_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranslationRecord" ADD CONSTRAINT "TranslationRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
