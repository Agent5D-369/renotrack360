import assert from "node:assert/strict";
import test from "node:test";
import { companySettingsSchema } from "../lib/validators";
import { ownerExceptionThreshold } from "../lib/price-snapshot";

test("company settings accept bounded margins and treat a blank threshold as unset", () => {
  const parsed = companySettingsSchema.parse({
    defaultTargetMarginPercent: "42.5",
    ownerExceptionMarginPercent: "30",
    changeOrderApprovalThreshold: "",
    invoiceApprovalThreshold: "2500",
    notificationCadence: "BIMONTHLY",
  });
  assert.deepEqual(parsed, {
    defaultTargetMarginPercent: 42.5,
    ownerExceptionMarginPercent: 30,
    changeOrderApprovalThreshold: undefined,
    invoiceApprovalThreshold: 2500,
    notificationCadence: "BIMONTHLY",
  });
  assert.equal(
    companySettingsSchema.parse({ defaultTargetMarginPercent: 40, ownerExceptionMarginPercent: 35 }).notificationCadence,
    "WEEKLY",
    "cadence defaults rather than failing when the field is absent"
  );
  assert.throws(() => companySettingsSchema.parse({ defaultTargetMarginPercent: 120, ownerExceptionMarginPercent: 35 }));
  assert.throws(() => companySettingsSchema.parse({ defaultTargetMarginPercent: 40, ownerExceptionMarginPercent: -1 }));
  assert.throws(() => companySettingsSchema.parse({ defaultTargetMarginPercent: 40, ownerExceptionMarginPercent: 35, notificationCadence: "HOURLY" }));
});

test("the owner exception floor falls back to 35 only for unusable values", () => {
  assert.equal(ownerExceptionThreshold("30"), 30);
  assert.equal(ownerExceptionThreshold(0), 0, "zero disables the exception floor rather than defaulting");
  assert.equal(ownerExceptionThreshold(undefined), 35);
  assert.equal(ownerExceptionThreshold(null), 35);
  assert.equal(ownerExceptionThreshold("not-a-number"), 35);
  assert.equal(ownerExceptionThreshold(120), 35);
  assert.equal(ownerExceptionThreshold(-5), 35);
});
