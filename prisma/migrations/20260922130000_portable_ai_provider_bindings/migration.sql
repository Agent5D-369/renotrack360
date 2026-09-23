-- Portable AI provider connections with write-only bring-your-own-key storage and per-agent bindings.
-- Additive only: no existing column changes type or loses data, and existing rows keep their env-reference credential.

ALTER TYPE "AiProvider" ADD VALUE IF NOT EXISTS 'DEEPSEEK';
ALTER TYPE "AiProvider" ADD VALUE IF NOT EXISTS 'OPENAI_COMPATIBLE';

ALTER TABLE "AiProviderConfig"
  ADD COLUMN IF NOT EXISTS "endpointKind" TEXT NOT NULL DEFAULT 'HOSTED',
  ADD COLUMN IF NOT EXISTS "secretCiphertext" TEXT,
  ADD COLUMN IF NOT EXISTS "secretKeyId" TEXT,
  ADD COLUMN IF NOT EXISTS "secretUpdatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "capabilities" JSONB,
  ADD COLUMN IF NOT EXISTS "lastCheckedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastCheckStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "lastCheckMessage" TEXT;

ALTER TABLE "AiAgent"
  ADD COLUMN IF NOT EXISTS "providerConfigId" TEXT,
  ADD COLUMN IF NOT EXISTS "model" TEXT,
  ADD COLUMN IF NOT EXISTS "thinkingMode" TEXT,
  ADD COLUMN IF NOT EXISTS "taskSettings" JSONB;

CREATE INDEX IF NOT EXISTS "AiAgent_organizationId_providerConfigId_idx" ON "AiAgent"("organizationId", "providerConfigId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AiAgent_providerConfigId_fkey'
  ) THEN
    ALTER TABLE "AiAgent"
      ADD CONSTRAINT "AiAgent_providerConfigId_fkey"
      FOREIGN KEY ("providerConfigId") REFERENCES "AiProviderConfig"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
