BEGIN;
CREATE TABLE "PaymentRevision" (
 "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "paymentId" TEXT NOT NULL, "requestId" TEXT NOT NULL,
 "inputDigest" TEXT NOT NULL, "actorId" TEXT NOT NULL, "before" JSONB, "after" JSONB NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "PaymentRevision_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PaymentRevision_organizationId_requestId_key" ON "PaymentRevision"("organizationId", "requestId");
CREATE INDEX "PaymentRevision_paymentId_createdAt_idx" ON "PaymentRevision"("paymentId", "createdAt");
ALTER TABLE "PaymentRevision" ADD CONSTRAINT "PaymentRevision_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentRevision" ADD CONSTRAINT "PaymentRevision_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE FUNCTION flipside_reject_payment_revision_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Payment revisions are immutable'; END $$;
CREATE TRIGGER payment_revision_immutable BEFORE UPDATE OR DELETE ON "PaymentRevision" FOR EACH ROW EXECUTE FUNCTION flipside_reject_payment_revision_mutation();
CREATE TRIGGER payment_revision_no_truncate BEFORE TRUNCATE ON "PaymentRevision" FOR EACH STATEMENT EXECUTE FUNCTION flipside_reject_payment_revision_mutation();
COMMIT;
