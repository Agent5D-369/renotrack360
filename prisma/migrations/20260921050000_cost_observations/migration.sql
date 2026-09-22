BEGIN;
CREATE TABLE "CostObservation" (
 "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "requestId" TEXT NOT NULL, "inputDigest" TEXT NOT NULL,
 "name" TEXT NOT NULL, "layer" TEXT NOT NULL, "component" TEXT NOT NULL, "measure" TEXT NOT NULL, "geography" TEXT NOT NULL,
 "effectiveDate" TEXT NOT NULL, "reviewDate" TEXT NOT NULL,
 "low" DECIMAL(16,4) NOT NULL, "target" DECIMAL(16,4), "high" DECIMAL(16,4) NOT NULL,
 "content" JSONB NOT NULL, "createdById" TEXT NOT NULL, "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "CostObservation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CostObservation_organizationId_requestId_key" ON "CostObservation"("organizationId", "requestId");
CREATE INDEX "CostObservation_organizationId_component_effectiveDate_idx" ON "CostObservation"("organizationId", "component", "effectiveDate");
ALTER TABLE "CostObservation" ADD CONSTRAINT "CostObservation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE FUNCTION flipside_reject_cost_observation_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Cost observations are immutable'; END $$;
CREATE TRIGGER cost_observation_immutable BEFORE UPDATE OR DELETE ON "CostObservation" FOR EACH ROW EXECUTE FUNCTION flipside_reject_cost_observation_mutation();
CREATE TRIGGER cost_observation_no_truncate BEFORE TRUNCATE ON "CostObservation" FOR EACH STATEMENT EXECUTE FUNCTION flipside_reject_cost_observation_mutation();
COMMIT;
