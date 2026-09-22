import { Prisma, PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { z } from "zod";
import { financeActor } from "./finance-lock";
import { HOMEWYSE_AUTHORIZATION } from "./cost-observation";

const finite = z.number().finite().nonnegative();
const componentSchema = z.object({ index: z.number().int().nonnegative(), name: z.string(), description: z.string(), includedByDefault: z.boolean(), component: z.enum(["LABOR", "MATERIAL", "EQUIPMENT", "DISPOSAL"]) });
const modelSchema = z.discriminatedUnion("kind", [z.object({ kind: z.literal("HOMEWYSE_UC1_V97"), arrays: z.object({ ilp: z.array(finite), vmin: z.array(finite), vmax: z.array(finite), vq: z.array(finite), fq: z.array(finite), ib: z.array(z.string()) }), minimumLaborHours: finite, quantityRoundingOffset: finite, defaultQuantity: z.number().positive(), sourceScripts: z.array(z.string()) }), z.object({ kind: z.literal("SOURCE_REFERENCE"), sourceScripts: z.array(z.string()) })]);
export const homewyseRecordSchema = z.object({ sourceUrl: z.string().url().refine(value => /^https:\/\/www\.homewyse\.com\/(services|costs|maintenance_costs|project_costs)\/cost_[a-z0-9_]+\.html$/.test(value)), slug: z.string().regex(/^[a-z_]+--[a-z0-9_]+$/), kind: z.enum(["INSTALLATION", "MAINTENANCE", "MATERIAL", "PROJECT"]), name: z.string().min(1), categories: z.array(z.string()), sourceEdition: z.string(), effectiveDate: z.string().nullable(), sourceSha256: z.string().regex(/^[a-f0-9]{64}$/), unit: z.string(), headline: z.string(), components: z.array(componentSchema), model: modelSchema, sourceOperations: z.array(z.string()), sourceOptions: z.record(z.array(z.union([z.string(), z.number()]))).default({}), sourceCalculation: z.string().default(""), sourceDescriptions: z.array(z.string()).default([]), inclusions: z.array(z.string()), exclusions: z.array(z.string()), notes: z.array(z.string()), references: z.array(z.object({ title: z.string(), url: z.string() })) }).superRefine((record, ctx) => {
  if (record.model.kind !== "HOMEWYSE_UC1_V97") return;
  const arrays = record.model.arrays, size = arrays.ilp.length;
  if (!size || size > 100 || Object.values(arrays).some(value => value.length !== size) || record.components.some(row => row.index >= size) || arrays.vmin.some((value, index) => value > arrays.vmax[index])) ctx.addIssue({ code: "custom", message: "Source calculator arrays are inconsistent." });
});
export const homewyseImportSchema = z.object({ formatVersion: z.literal("flipside-homewyse-import-v1"), retrievedAt: z.string(), authorizationReference: z.string(), flipsideModification: z.string(), geography: z.object({ zip: z.literal("78704"), label: z.string(), laborFactor: z.number().positive().max(10), factorSourceUrl: z.literal("https://www.homewyse.com/hwref/new4.php?lc=78704"), nonLaborFormula: z.string() }), records: z.array(homewyseRecordSchema).min(1).max(5000), unavailable: z.array(z.object({ url: z.string(), reason: z.string() })) });
export type HomewyseRecord = z.infer<typeof homewyseRecordSchema>;
export type HomewyseImport = z.infer<typeof homewyseImportSchema>;
export type SourceContent = { record: HomewyseRecord; geography: HomewyseImport["geography"]; retrievedAt: string; authorizationReference: string; flipsideModification: string; formatVersion: string };
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const round = (value: Prisma.Decimal) => value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toFixed(2);
export function calculateHomewyse(raw: HomewyseRecord, quantity: string | number, laborFactor = 1) {
  const record = homewyseRecordSchema.parse(raw);
  if (record.model.kind !== "HOMEWYSE_UC1_V97") return null;
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(String(quantity)) || Number(quantity) <= 0 || !Number.isFinite(laborFactor) || laborFactor <= 0 || laborFactor > 10) throw new Error("Enter a positive quantity up to 999999 with at most two decimal places.");
  const model = record.model, a = model.arrays, size = a.ilp.length, q = new Prisma.Decimal(quantity), factor = new Prisma.Decimal(laborFactor), materialFactor = factor.minus(1).mul("0.15").plus(1);
  let low = new Prisma.Decimal(0), high = new Prisma.Decimal(0), hours = new Prisma.Decimal(0);
  const rows = [];
  for (let i = 0; i < size; i++) {
    const source = record.components.find(row => row.index === i); let units = new Prisma.Decimal(0), minimum = false;
    if (a.ilp[i] === 0) units = q.mul(a.vq[i]).plus(a.fq[i]).plus(model.quantityRoundingOffset).plus("0.5").floor();
    else if (i < size - 1) units = q.mul(a.vq[i]).mul(a.ilp[i]).plus(a.fq[i]);
    else if (hours.gt(0) && hours.lt(model.minimumLaborHours)) { units = new Prisma.Decimal(model.minimumLaborHours).minus(hours); minimum = true; }
    const multiplier = a.ilp[i] === 0 ? materialFactor : factor, rowLow = units.mul(a.vmin[i]).mul(multiplier), rowHigh = units.mul(a.vmax[i]).mul(multiplier);
    const included = Boolean((source?.includedByDefault && !a.ib[i].includes("%")) || minimum);
    if (included) { low = low.plus(rowLow); high = high.plus(rowHigh); if (a.ilp[i] !== 0) hours = hours.plus(units); }
    if (source) rows.push({ ...source, component: a.ilp[i] !== 0 ? "LABOR" as const : source.component, included, quantity: units.toString(), unit: a.ilp[i] !== 0 ? "hours" : a.ib[i] || record.unit, low: round(rowLow), high: round(rowHigh), baseLowRate: a.vmin[i], baseHighRate: a.vmax[i], geographicFactor: multiplier.toString() });
  }
  return { quantity: q.toString(), low: round(low), high: round(high), perUnitLow: round(low.div(q)), perUnitHigh: round(high.div(q)), laborHours: hours.toString(), rows, laborFactor: factor.toString(), nonLaborFactor: materialFactor.toString() };
}
export function homewysePriceDraft(sourceId: string, content: SourceContent, quantity: string) {
  const calc = calculateHomewyse(content.record, quantity, content.geography.laborFactor);
  if (!calc) return null;
  let materials = new Prisma.Decimal(0), equipment = new Prisma.Decimal(0), disposal = new Prisma.Decimal(0);
  for (const row of calc.rows.filter(row => row.included && row.component !== "LABOR")) {
    const midpoint = new Prisma.Decimal(row.low).plus(row.high).div(2);
    if (row.component === "EQUIPMENT") equipment = equipment.plus(midpoint); else if (row.component === "DISPOSAL") disposal = disposal.plus(midpoint); else materials = materials.plus(midpoint);
  }
  return { name: (content.record.name + " · " + quantity + " " + content.record.unit).slice(0,120), materials: round(materials), equipment: round(equipment), protectionCleanup: round(disposal), fieldLabor: round(new Prisma.Decimal(calc.laborHours).mul(55)), subcontractors: "0", otherDirect: "0", permitsDesign: "0", ownerFieldHours: "0", projectManagementHours: "0", costSourceVersionId: sourceId, sourceQuantity: quantity,
    basis: `Source version ${sourceId}; ${content.record.sourceUrl}; ${content.record.sourceEdition}; source SHA256 ${content.record.sourceSha256}. Quantity ${quantity} ${content.record.unit}. Austin ZIP 78704 source factors: labor ${calc.laborFactor}, nonlabor ${calc.nonLaborFactor}. Flipside planning adjustment: source labor ${calc.laborHours} hours at $55 loaded field replacement cost; nonlabor midpoint allowances. PM, permits, additional protection, trade-specific rates, risk and actual supplier quotes must be reviewed for this job. This is an editable internal scenario, not a subcontractor quote or client agreement.` };
}
export async function importHomewyseCatalog(db: PrismaClient, actorId: string, raw: unknown) {
  const input = homewyseImportSchema.parse(raw); let imported = 0, retained = 0;
  for (let offset = 0; offset < input.records.length; offset += 100) {
    const batch = input.records.slice(offset, offset + 100);
    const result = await db.$transaction(async tx => {
      const organizationId = await financeActor(tx, actorId, true);
      const data = batch.map(record => {
        const content: SourceContent = { record, geography: input.geography, retrievedAt: input.retrievedAt, authorizationReference: HOMEWYSE_AUTHORIZATION, flipsideModification: input.flipsideModification, formatVersion: input.formatVersion };
        // Retrieval time is provenance, not a new version when the source and model are unchanged.
        const contentDigest = digest({ record, geography: input.geography, authorizationReference: HOMEWYSE_AUTHORIZATION, flipsideModification: input.flipsideModification, formatVersion: input.formatVersion });
        return { organizationId, sourceKey: record.slug, sourceName: "Homewyse", sourceUrl: record.sourceUrl, sourceEdition: record.sourceEdition, effectiveDate: record.effectiveDate, sourceSha256: record.sourceSha256, contentDigest, name: record.name, category: record.categories.join(" / "), kind: record.kind, calculatorKind: record.model.kind, content, importedById: actorId };
      });
      const added = (await tx.costSourceVersion.createMany({ data, skipDuplicates: true })).count, existing = batch.length - added;
      if (added) await tx.auditEvent.create({ data: { organizationId, actorUserId: actorId, action: "AUTHORIZED_COST_CATALOG_IMPORTED", entityType: "CostSourceVersion", entityId: digest(batch.map(record => record.sourceSha256)), metadata: { added, retained: existing, sourceName: "Homewyse", retrievedAt: input.retrievedAt, authorizationReference: HOMEWYSE_AUTHORIZATION, automaticRepricing: false } } });
      return { added, existing };
    }, { timeout: 120000 });
    imported += result.added; retained += result.existing;
  }
  return { imported, retained, sourceRecords: input.records.length, unavailable: input.unavailable.length };
}
