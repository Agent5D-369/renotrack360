import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import { calculateGrossMargin, pricingInputSchema } from "../lib/gross-margin";
import {
  applyMarketIndex,
  marketFactorProblem,
  NO_MARKET_INDEX,
  normalizeZip,
  resolveMarketFactor,
  toAppliedMarketIndex,
  type MarketFactorRow,
} from "../lib/market-index";

const factor = (overrides: Partial<MarketFactorRow> & Pick<MarketFactorRow, "id" | "marketName">): MarketFactorRow => ({
  zipPrefix: null,
  laborMultiplier: new Prisma.Decimal("1"),
  materialMultiplier: new Prisma.Decimal("1"),
  permitMultiplier: new Prisma.Decimal("1"),
  ...overrides,
});

const austinFive = factor({ id: "austin-5", marketName: "Austin metro", zipPrefix: "78701", laborMultiplier: "1.10", materialMultiplier: "1.20", permitMultiplier: "1.50" });
const texasThree = factor({ id: "texas-3", marketName: "Central Texas", zipPrefix: "787", laborMultiplier: "1.04" });
const otherMarket = factor({ id: "dallas", marketName: "Dallas", zipPrefix: "752" });

const rawInput = {
  costSourceVersionId: "",
  sourceQuantity: "1",
  name: "Market index test scenario",
  basis: "Documented test basis for the geographic market index check.",
  subcontractors: "1000.00",
  materials: "2000.00",
  fieldLabor: "3000.00",
  ownerFieldHours: "10",
  ownerFieldRate: "55.00",
  projectManagementHours: "5",
  projectManagementRate: "95.00",
  equipment: "400.00",
  protectionCleanup: "100.00",
  permitsDesign: "200.00",
  otherDirect: "0.00",
  riskPercent: "5",
  targetMarginPercent: "40",
  ownerExceptionReason: "",
  ownerApproval: false,
};

test("the longest matching zip prefix wins and a three-digit index still applies", () => {
  const longest = resolveMarketFactor([texasThree, austinFive], "78701-1234");
  assert.equal(longest?.id, "austin-5", "the five-digit prefix beats the three-digit prefix");
  assert.equal(resolveMarketFactor([texasThree, austinFive], "78745")?.id, "texas-3", "a five-digit miss falls back to the three-digit index");
  assert.equal(resolveMarketFactor([texasThree, austinFive], "78701")?.id, "austin-5");
});

test("an absent, blank, non-numeric or unmatched zip resolves to no index rather than another market", () => {
  for (const zip of [undefined, null, "", "   ", "not-a-zip", "10001"]) {
    assert.equal(resolveMarketFactor([austinFive, otherMarket], zip), null, `zip ${JSON.stringify(zip)} must not match`);
  }
  assert.equal(normalizeZip("78701-1234"), "78701", "zip normalization keeps five digits");
  assert.equal(normalizeZip(null), "");
});

test("ties break deterministically by market name so the same records always resolve the same way", () => {
  const left = factor({ id: "z", marketName: "Zeta", zipPrefix: "787" });
  const right = factor({ id: "a", marketName: "Alpha", zipPrefix: "787" });
  assert.equal(resolveMarketFactor([left, right], "78701")?.id, "a");
  assert.equal(resolveMarketFactor([right, left], "78701")?.id, "a");
});

test("a zero, negative or non-numeric multiplier is refused instead of silently changing cost", () => {
  assert.equal(marketFactorProblem(austinFive), null);
  assert.match(String(marketFactorProblem(factor({ id: "zero", marketName: "Zero", laborMultiplier: "0" }))), /labor multiplier for Zero must be greater than zero/);
  assert.match(String(marketFactorProblem(factor({ id: "neg", marketName: "Negative", materialMultiplier: "-1" }))), /material multiplier/);
  assert.match(String(marketFactorProblem(factor({ id: "nan", marketName: "Not a number", permitMultiplier: "abc" }))), /permit multiplier for Not a number is not a number/);
  assert.throws(() => toAppliedMarketIndex(factor({ id: "zero", marketName: "Zero", laborMultiplier: "0" })), /greater than zero/);
});

test("no applied index leaves the pricing input untouched and the calculation identical", () => {
  const parsed = pricingInputSchema.parse(rawInput);
  assert.strictEqual(applyMarketIndex(parsed, NO_MARKET_INDEX), parsed, "an unapplied index returns the same input");

  const totals = calculateGrossMargin(parsed);
  assert.equal(totals.directCost, "7725.00");
  assert.equal(totals.riskAmount, "386.25");
  assert.equal(totals.riskAdjustedDirectCost, "8111.25");
  assert.equal(totals.sellingPrice, "13518.75");
  assert.equal(totals.grossProfit, "5407.50");
});

test("an applied index changes labour, material and permit costs, leaves other costs alone, and raises the selling price", () => {
  const parsed = pricingInputSchema.parse(rawInput);
  const index = toAppliedMarketIndex(austinFive);
  const priced = applyMarketIndex(parsed, index);

  assert.equal(priced.fieldLabor, "3300.00", "crew field labour takes the labour multiplier");
  assert.equal(priced.ownerFieldRate, "60.50", "the owner field rate takes the labour multiplier");
  assert.equal(priced.projectManagementRate, "104.50", "the project management rate takes the labour multiplier");
  assert.equal(priced.materials, "2400.00", "materials take the material multiplier");
  assert.equal(priced.permitsDesign, "300.00", "permits take the permit multiplier");
  assert.equal(priced.subcontractors, "1000.00", "subcontractors are not changed by this factor");
  assert.equal(priced.equipment, "400.00", "equipment is not changed by this factor");
  assert.equal(priced.protectionCleanup, "100.00", "protection and cleanup are not changed by this factor");

  const totals = calculateGrossMargin(priced);
  assert.equal(totals.directCost, "8627.50", "hours x indexed rates flow into the direct cost");
  assert.equal(totals.riskAmount, "431.38");
  assert.equal(totals.riskAdjustedDirectCost, "9058.88");
  assert.equal(totals.sellingPrice, "15098.14", "risk is still added to direct cost before margin");
  assert.equal(totals.grossProfit, "6039.26");
  assert.ok(Number(totals.sellingPrice) > 13518.75, "the index raises the price in the documented direction");
  assert.equal(totals.targetMarginPercent, "40.00", "the index does not change the target margin");
});
