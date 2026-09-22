BEGIN;
CREATE TABLE "WorkItemVersion" (
 "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "templateCode" TEXT NOT NULL, "revision" INTEGER NOT NULL,
 "name" TEXT NOT NULL, "contentDigest" TEXT NOT NULL, "content" JSONB NOT NULL, "adoptedById" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "WorkItemVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WorkItemVersion_organizationId_templateCode_revision_key" ON "WorkItemVersion"("organizationId", "templateCode", "revision");
CREATE UNIQUE INDEX "WorkItemVersion_organizationId_templateCode_contentDigest_key" ON "WorkItemVersion"("organizationId", "templateCode", "contentDigest");
CREATE INDEX "WorkItemVersion_organizationId_createdAt_idx" ON "WorkItemVersion"("organizationId", "createdAt");
ALTER TABLE "WorkItemVersion" ADD CONSTRAINT "WorkItemVersion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE FUNCTION flipside_reject_work_item_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Work item versions are immutable'; END $$;
CREATE TRIGGER work_item_immutable BEFORE UPDATE OR DELETE ON "WorkItemVersion" FOR EACH ROW EXECUTE FUNCTION flipside_reject_work_item_mutation();
CREATE TRIGGER work_item_no_truncate BEFORE TRUNCATE ON "WorkItemVersion" FOR EACH STATEMENT EXECUTE FUNCTION flipside_reject_work_item_mutation();
COMMIT;
