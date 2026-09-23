-- Company default payment schedule.
-- Nullable and additive: a company without a configured schedule keeps the built-in four-draw default.

ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "defaultPaymentSchedule" JSONB;
