BEGIN;
-- AlterTable
ALTER TABLE "PriceSnapshot" ADD COLUMN     "costSourceVersionId" TEXT;

-- CreateTable
CREATE TABLE "CostSourceVersion" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourceEdition" TEXT NOT NULL,
    "effectiveDate" TEXT,
    "contentDigest" TEXT NOT NULL,
    "sourceSha256" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "calculatorKind" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "importedById" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostSourceVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CostSourceVersion_organizationId_kind_category_idx" ON "CostSourceVersion"("organizationId", "kind", "category");

-- CreateIndex
CREATE INDEX "CostSourceVersion_organizationId_sourceKey_importedAt_idx" ON "CostSourceVersion"("organizationId", "sourceKey", "importedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CostSourceVersion_organizationId_sourceUrl_contentDigest_key" ON "CostSourceVersion"("organizationId", "sourceUrl", "contentDigest");

-- AddForeignKey
ALTER TABLE "PriceSnapshot" ADD CONSTRAINT "PriceSnapshot_costSourceVersionId_fkey" FOREIGN KEY ("costSourceVersionId") REFERENCES "CostSourceVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostSourceVersion" ADD CONSTRAINT "CostSourceVersion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


CREATE TRIGGER costsourceversion_immutable BEFORE UPDATE OR DELETE ON "CostSourceVersion" FOR EACH ROW EXECUTE FUNCTION flipside_reject_finance_snapshot_mutation();
CREATE TRIGGER costsourceversion_no_truncate BEFORE TRUNCATE ON "CostSourceVersion" FOR EACH STATEMENT EXECUTE FUNCTION flipside_reject_finance_snapshot_mutation();
COMMIT;
