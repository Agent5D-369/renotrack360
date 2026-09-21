import { Prisma } from "@prisma/client";
import { z } from "zod";
import { replacementRateDefaults } from "./pricing-defaults";

export const PRICING_POLICY = "flipside-gross-margin-2026-09-21-v1";
export const directCostFields = [
  ["subcontractors", "Subcontractors"], ["materials", "Materials, waste and freight"],
  ["fieldLabor", "Crew field labor"], ["ownerFieldLabor", "Rick's field labor at replacement cost"],
  ["projectManagement", "Project-specific PM and supervision"], ["equipment", "Equipment and mobilization"],
  ["protectionCleanup", "Protection, cleanup and disposal"], ["permitsDesign", "Project permits, engineering and design"],
  ["otherDirect", "Other project-caused direct costs"],
] as const;
const amount = z.string().trim().regex(/^\d{1,9}(\.\d{1,2})?$/, "Enter a non-negative dollar amount with up to two decimals.");
const percent = z.string().trim().regex(/^\d{1,3}(\.\d{1,2})?$/, "Enter a percentage with up to two decimals.");
export const pricingInputSchema = z.object({
  name: z.string().trim().min(3).max(120), basis: z.string().trim().min(10).max(4000),
  subcontractors: amount, materials: amount, fieldLabor: amount,
  ownerFieldHours: amount, ownerFieldRate: amount, projectManagementHours: amount, projectManagementRate: amount,
  equipment: amount, protectionCleanup: amount, permitsDesign: amount, otherDirect: amount,
  riskPercent: percent.refine(value => Number(value) <= 100, "Risk must be between 0 and 100%."),
  targetMarginPercent: percent.refine(value => Number(value) < 100, "Gross margin must be below 100%."),
  ownerExceptionReason: z.string().trim().max(2000).default(""), ownerApproval: z.boolean().default(false),
}).superRefine((values, ctx) => {
  for (const [hours, rate] of [["ownerFieldHours", "ownerFieldRate"], ["projectManagementHours", "projectManagementRate"]] as const) {
    if (Number(values[hours]) > 0 && Number(values[rate]) === 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [rate], message: "Working hours require a non-zero replacement cost rate." });
  }
}).transform(values => ({ ...values,
  ownerFieldLabor: new Prisma.Decimal(values.ownerFieldHours).mul(values.ownerFieldRate).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toFixed(2),
  projectManagement: new Prisma.Decimal(values.projectManagementHours).mul(values.projectManagementRate).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toFixed(2),
  rateRecommendationVersion: replacementRateDefaults.version,
}));
export type PricingInput = z.infer<typeof pricingInputSchema>;
export function calculateGrossMargin(input: PricingInput) {
  const values = pricingInputSchema.parse(input);
  const directCost = directCostFields.reduce((sum, [key]) => sum.plus(values[key]), new Prisma.Decimal(0));
  if (directCost.lte(0)) throw new Error("Enter the documented direct costs for this scenario.");
  const riskAmount = directCost.mul(values.riskPercent).div(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  const riskAdjustedDirectCost = directCost.plus(riskAmount);
  // Round selling price upward to the cent so rounding cannot undercut the target margin.
  const sellingPrice = riskAdjustedDirectCost.div(new Prisma.Decimal(1).minus(new Prisma.Decimal(values.targetMarginPercent).div(100))).toDecimalPlaces(2, Prisma.Decimal.ROUND_CEIL);
  if (sellingPrice.gte("1000000000000")) throw new Error("This scenario exceeds the supported amount.");
  return { directCost: directCost.toFixed(2), riskAmount: riskAmount.toFixed(2),
    riskAdjustedDirectCost: riskAdjustedDirectCost.toFixed(2), sellingPrice: sellingPrice.toFixed(2),
    grossProfit: sellingPrice.minus(riskAdjustedDirectCost).toFixed(2), targetMarginPercent: new Prisma.Decimal(values.targetMarginPercent).toFixed(2) };
}
