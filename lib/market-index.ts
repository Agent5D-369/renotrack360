import { Prisma, type PrismaClient } from "@prisma/client";

/**
 * Geographic market index applied to internal pricing scenarios.
 *
 * A stored market cost factor is a *multiplier* record. Until now these records were seeded and
 * displayed but never used by any calculation, so the "geographic pricing index" idea existed as
 * data only. This module resolves a factor for a company and applies it to the labor, material and
 * permit components of a pricing scenario before risk and gross margin are calculated.
 */
export const MARKET_INDEX_POLICY = "company-market-index-2026-09-23-v1";

export class MarketIndexError extends Error {}

export type MarketFactorRow = {
  id: string;
  marketName: string;
  zipPrefix: string | null;
  laborMultiplier: Prisma.Decimal | number | string;
  materialMultiplier: Prisma.Decimal | number | string;
  permitMultiplier: Prisma.Decimal | number | string;
};

export type MarketIndex = {
  /** Null only when no stored factor was applied. */
  id: string | null;
  marketName: string;
  zipPrefix: string | null;
  laborMultiplier: string;
  materialMultiplier: string;
  permitMultiplier: string;
  /** True only when a stored, active, company-owned factor was applied. */
  applied: boolean;
};

/** The outcome used when no factor applies. Every multiplier is exactly 1, i.e. no price change. */
export const NO_MARKET_INDEX: MarketIndex = {
  id: null,
  marketName: "No market index",
  zipPrefix: null,
  laborMultiplier: "1",
  materialMultiplier: "1",
  permitMultiplier: "1",
  applied: false,
};

/** Digits only, at most five, so "78701-1234" and " 78701 " behave the same. */
export function normalizeZip(value: unknown): string {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.slice(0, 5);
}

/**
 * A stored factor is only usable when every multiplier is a finite number greater than zero.
 * A zero or negative multiplier would silently erase or invert a real cost, so it is refused rather
 * than quietly replaced with 1.
 */
export function marketFactorProblem(row: MarketFactorRow): string | null {
  for (const [label, raw] of [
    ["labor", row.laborMultiplier],
    ["material", row.materialMultiplier],
    ["permit", row.permitMultiplier],
  ] as const) {
    const value = Number(raw);
    if (!Number.isFinite(value)) return `The ${label} multiplier for ${row.marketName} is not a number.`;
    if (value <= 0) return `The ${label} multiplier for ${row.marketName} must be greater than zero.`;
  }
  return null;
}

function multiplier(value: Prisma.Decimal | number | string): string {
  return new Prisma.Decimal(value).toFixed(3);
}

function toMarketIndex(row: MarketFactorRow, applied: boolean): MarketIndex {
  return {
    id: row.id,
    marketName: row.marketName,
    zipPrefix: row.zipPrefix ?? null,
    laborMultiplier: multiplier(row.laborMultiplier),
    materialMultiplier: multiplier(row.materialMultiplier),
    permitMultiplier: multiplier(row.permitMultiplier),
    applied,
  };
}

/**
 * Longest matching zip prefix wins, so a 5-digit prefix beats a 3-digit one. Ties break by market
 * name and then id so the same records always resolve the same way.
 */
export function resolveMarketFactor(factors: MarketFactorRow[], zip: unknown): MarketFactorRow | null {
  const normalized = normalizeZip(zip);
  const matches = factors.filter(factor => {
    const prefix = normalizeZip(factor.zipPrefix);
    return prefix.length > 0 && normalized.startsWith(prefix);
  });
  if (!matches.length) return null;
  return matches.sort((left, right) => {
    const lengthDelta = normalizeZip(right.zipPrefix).length - normalizeZip(left.zipPrefix).length;
    if (lengthDelta !== 0) return lengthDelta;
    const nameDelta = left.marketName.localeCompare(right.marketName);
    if (nameDelta !== 0) return nameDelta;
    return left.id.localeCompare(right.id);
  })[0];
}

/** Minimal structural reader so this works with both a client and a transaction client. */
type MarketFactorReader = { marketCostFactor: PrismaClient["marketCostFactor"] };

/** The company's active factors only. Another company's factor can never be reached from here. */
export async function loadMarketFactors(db: MarketFactorReader, organizationId: string): Promise<MarketFactorRow[]> {
  return db.marketCostFactor.findMany({
    where: { organizationId, active: true },
    select: { id: true, marketName: true, zipPrefix: true, laborMultiplier: true, materialMultiplier: true, permitMultiplier: true },
    orderBy: [{ marketName: "asc" }],
  });
}

/** Resolve by id inside the caller's transaction, refusing another company's factor. */
export async function loadMarketFactorById(
  db: MarketFactorReader,
  organizationId: string,
  id: string
): Promise<MarketFactorRow | null> {
  return db.marketCostFactor.findFirst({
    where: { id, organizationId, active: true },
    select: { id: true, marketName: true, zipPrefix: true, laborMultiplier: true, materialMultiplier: true, permitMultiplier: true },
  });
}

export function toAppliedMarketIndex(row: MarketFactorRow): MarketIndex {
  const problem = marketFactorProblem(row);
  if (problem) throw new MarketIndexError(problem);
  return toMarketIndex(row, true);
}

/**
 * What the index changes, stated plainly so the surface can be honest:
 * labour applies to crew field labour and to both replacement-cost rates (owner field and project
 * management, which are hours x rate), material applies to materials, and permit applies to permits,
 * engineering and design. Subcontractors, equipment, protection/cleanup and other direct costs are
 * left alone because the stored factor has no multiplier for them.
 */
export const marketIndexCoverage =
  "Labour applies to crew field labour and to the owner field and project PM rates. Material applies to materials. Permit applies to permits, engineering and design. Subcontractors, equipment, protection and other direct costs are not changed.";

type PricingAmounts = {
  fieldLabor: string;
  ownerFieldRate: string;
  projectManagementRate: string;
  materials: string;
  permitsDesign: string;
};

function scale(amount: string, factor: string): string {
  return new Prisma.Decimal(amount)
    .mul(new Prisma.Decimal(factor))
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
    .toFixed(2);
}

/**
 * Returns the pricing amounts with the index applied. When no factor applied, the input is returned
 * unchanged, so an unindexed scenario is byte-identical to the pre-index formula.
 */
export function applyMarketIndex<T extends PricingAmounts>(input: T, index: MarketIndex): T {
  if (!index.applied || !index.id) return input;
  return {
    ...input,
    fieldLabor: scale(input.fieldLabor, index.laborMultiplier),
    ownerFieldRate: scale(input.ownerFieldRate, index.laborMultiplier),
    projectManagementRate: scale(input.projectManagementRate, index.laborMultiplier),
    materials: scale(input.materials, index.materialMultiplier),
    permitsDesign: scale(input.permitsDesign, index.permitMultiplier),
  };
}
