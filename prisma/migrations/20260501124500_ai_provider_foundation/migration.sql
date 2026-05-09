CREATE TYPE "AiProvider" AS ENUM ('OPENAI', 'ANTHROPIC', 'GOOGLE', 'AZURE_OPENAI', 'OPENROUTER', 'XAI', 'MISTRAL', 'LOCAL_CUSTOM');

CREATE TABLE "AiProviderConfig" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "provider" "AiProvider" NOT NULL,
  "displayName" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "defaultModel" TEXT,
  "apiKeySecretRef" TEXT,
  "baseUrl" TEXT,
  "monthlyBudgetCents" INTEGER,
  "allowClientData" BOOLEAN NOT NULL DEFAULT false,
  "dataRetentionMode" TEXT NOT NULL DEFAULT 'standard',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AiProviderConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiUsageLog" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "providerConfigId" TEXT,
  "taskId" TEXT,
  "workflowArea" TEXT NOT NULL,
  "model" TEXT,
  "inputTokens" INTEGER NOT NULL DEFAULT 0,
  "outputTokens" INTEGER NOT NULL DEFAULT 0,
  "estimatedCostCents" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'logged',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiUsageLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiProviderConfig_organizationId_provider_key" ON "AiProviderConfig"("organizationId", "provider");
CREATE INDEX "AiUsageLog_organizationId_workflowArea_idx" ON "AiUsageLog"("organizationId", "workflowArea");
CREATE INDEX "AiUsageLog_providerConfigId_idx" ON "AiUsageLog"("providerConfigId");
CREATE INDEX "AiUsageLog_taskId_idx" ON "AiUsageLog"("taskId");

ALTER TABLE "AiProviderConfig"
  ADD CONSTRAINT "AiProviderConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiUsageLog"
  ADD CONSTRAINT "AiUsageLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "AiUsageLog_providerConfigId_fkey" FOREIGN KEY ("providerConfigId") REFERENCES "AiProviderConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "AiUsageLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "AiTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
