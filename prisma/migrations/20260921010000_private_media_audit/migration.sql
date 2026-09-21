BEGIN;

-- AlterTable
ALTER TABLE "FileAsset" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "sha256" TEXT,
ADD COLUMN     "storageKey" TEXT,
ADD COLUMN     "uploadedByUserId" TEXT;

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditEvent_organizationId_entityType_entityId_createdAt_idx" ON "AuditEvent"("organizationId", "entityType", "entityId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FileAsset_storageKey_key" ON "FileAsset"("storageKey");

-- CreateIndex
CREATE INDEX "FileAsset_organizationId_entityType_entityId_idx" ON "FileAsset"("organizationId", "entityType", "entityId");

-- AddForeignKey
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Operational audit records are append-only, including for ordinary application SQL.
CREATE FUNCTION "flipside_reject_audit_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'AuditEvent records are append-only';
END;
$$;
CREATE TRIGGER "AuditEvent_immutable" BEFORE UPDATE OR DELETE ON "AuditEvent"
FOR EACH ROW EXECUTE FUNCTION "flipside_reject_audit_mutation"();
CREATE TRIGGER "AuditEvent_no_truncate" BEFORE TRUNCATE ON "AuditEvent"
FOR EACH STATEMENT EXECUTE FUNCTION "flipside_reject_audit_mutation"();

COMMIT;
