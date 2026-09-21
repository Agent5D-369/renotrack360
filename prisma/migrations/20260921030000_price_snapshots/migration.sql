BEGIN;
-- CreateTable
CREATE TABLE "PriceSnapshot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "inputDigest" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "basis" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "inputs" JSONB NOT NULL,
    "directCost" DECIMAL(14,2) NOT NULL,
    "riskAmount" DECIMAL(14,2) NOT NULL,
    "riskAdjustedDirectCost" DECIMAL(14,2) NOT NULL,
    "targetMarginPercent" DECIMAL(6,2) NOT NULL,
    "sellingPrice" DECIMAL(14,2) NOT NULL,
    "grossProfit" DECIMAL(14,2) NOT NULL,
    "ownerExceptionReason" TEXT,
    "ownerApprovedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PriceSnapshot_organizationId_createdAt_idx" ON "PriceSnapshot"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PriceSnapshot_organizationId_requestId_key" ON "PriceSnapshot"("organizationId", "requestId");

-- AddForeignKey
ALTER TABLE "PriceSnapshot" ADD CONSTRAINT "PriceSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


CREATE FUNCTION flipside_reject_price_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Price snapshots are immutable'; END $$;
CREATE TRIGGER price_snapshot_immutable BEFORE UPDATE OR DELETE ON "PriceSnapshot" FOR EACH ROW EXECUTE FUNCTION flipside_reject_price_mutation();
CREATE TRIGGER price_snapshot_no_truncate BEFORE TRUNCATE ON "PriceSnapshot" FOR EACH STATEMENT EXECUTE FUNCTION flipside_reject_price_mutation();
COMMIT;
