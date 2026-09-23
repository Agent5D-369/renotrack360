-- Company operations settings on the existing company record.
-- Additive only: every new column has a default or is nullable, so existing rows keep their current
-- behaviour and nothing is rewritten beyond the new defaults.

ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "defaultTargetMarginPercent" DECIMAL(6,2) NOT NULL DEFAULT 40,
  ADD COLUMN IF NOT EXISTS "ownerExceptionMarginPercent" DECIMAL(6,2) NOT NULL DEFAULT 35,
  ADD COLUMN IF NOT EXISTS "changeOrderApprovalThresholdCents" INTEGER,
  ADD COLUMN IF NOT EXISTS "invoiceApprovalThresholdCents" INTEGER,
  ADD COLUMN IF NOT EXISTS "notificationCadence" TEXT NOT NULL DEFAULT 'WEEKLY';
