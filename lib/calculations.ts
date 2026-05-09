import type { RiskLevel } from "@prisma/client";

export type LineInput = {
  quantity: number;
  laborLow: number;
  laborTarget: number;
  laborHigh: number;
  materialLow: number;
  materialTarget: number;
  materialHigh: number;
  subcontractorCost: number;
  markupPercent: number;
  riskFactor: RiskLevel;
  manualTotalLow?: number | null;
  manualTotalTarget?: number | null;
  manualTotalHigh?: number | null;
};

export function riskMultiplier(risk: RiskLevel) {
  return {
    LOW: 1,
    MEDIUM: 1.1,
    HIGH: 1.2,
    UNKNOWN_CONDITION: 1.3
  }[risk];
}

export function calculateLineItem(input: LineInput) {
  const multiplier = riskMultiplier(input.riskFactor) * (1 + input.markupPercent / 100);
  const baseLow = input.quantity * (input.laborLow + input.materialLow) + input.subcontractorCost;
  const baseTarget = input.quantity * (input.laborTarget + input.materialTarget) + input.subcontractorCost;
  const baseHigh = input.quantity * (input.laborHigh + input.materialHigh) + input.subcontractorCost;

  return {
    totalLow: roundMoney(input.manualTotalLow ?? baseLow * multiplier),
    totalTarget: roundMoney(input.manualTotalTarget ?? baseTarget * multiplier),
    totalHigh: roundMoney(input.manualTotalHigh ?? baseHigh * multiplier)
  };
}

export function calculateQuoteTotals(
  lineTotals: Array<{ totalLow: number; totalTarget: number; totalHigh: number }>,
  gcMarkup: number,
  contingency: number,
  finalQuoteAmount?: number | null
) {
  const subtotalLow = lineTotals.reduce((sum, item) => sum + item.totalLow, 0);
  const subtotalTarget = lineTotals.reduce((sum, item) => sum + item.totalTarget, 0);
  const subtotalHigh = lineTotals.reduce((sum, item) => sum + item.totalHigh, 0);
  const quoteMultiplier = (1 + gcMarkup / 100) * (1 + contingency / 100);

  return {
    totalLow: roundMoney(subtotalLow * quoteMultiplier),
    totalTarget: roundMoney(subtotalTarget * quoteMultiplier),
    totalHigh: roundMoney(subtotalHigh * quoteMultiplier),
    finalQuoteAmount: roundMoney(finalQuoteAmount ?? subtotalTarget * quoteMultiplier)
  };
}

export function leadPriorityScore(input: {
  estimatedBudget?: number | null;
  urgency: number;
  jobFitScore: number;
  trustFitScore: number;
  scopeClarity: number;
  probability: number;
}) {
  const budgetNormalized = Math.min((input.estimatedBudget ?? 0) / 250000, 1) * 100;
  return Math.round(
    budgetNormalized * 0.25 +
      input.urgency * 0.2 +
      input.jobFitScore * 0.2 +
      input.trustFitScore * 0.15 +
      input.scopeClarity * 0.1 +
      input.probability * 0.1
  );
}

export function profileScore(input: {
  relationshipStrength: number;
  trustLevel: number;
  leadPotential: number;
  referralPotential: number;
}) {
  return Math.round(
    input.relationshipStrength * 0.3 +
      input.trustLevel * 0.3 +
      input.leadPotential * 0.2 +
      input.referralPotential * 0.2
  );
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
