"use server";

import { requireStaff } from "@/lib/staff-access";


import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { AiProvider, ClientStatus, ImportStatus, JobStatus, ProfileKind, ProfileType, RiskLevel, VendorOnboardingStatus, W9Status } from "@prisma/client";
import { ZodError } from "zod";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ORG_ID, renovationPhaseDetails, renovationPhases } from "@/lib/constants";
import {
  actualCostSchema,
  budgetLineSchema,
  catalogSchema,
  changeOrderSchema,
  estimateSchema,
  financingSchema,
  invoiceSchema,
  jobSchema,
  leadSchema,
  paymentSchema,
  profileSchema,
  propertySchema,
  quoteLineItemSchema,
  quoteSchema,
  settingsSchema,
  settingsTermsSchema,
  companySettingsSchema,
  taskSchema,
  weeklyReportSchema
} from "@/lib/validators";
import { calculateLineItem, calculateQuoteTotals } from "@/lib/calculations";
import { allowanceItems, categoryForPhase, exteriorChecks, fieldStandardChecks, garageChecks, roomPresets } from "@/lib/field-estimate-wizard";
import { createStripePaymentLink } from "@/lib/stripe";
import { reportGuideCorrectionSchema } from "@/lib/report-guide-brain";
import { ReportGuideError, reviewGuideTask } from "@/lib/report-guide";
import { assertActivityCompanyRelations, assertCompanyRelations, CompanyRelationError } from "@/lib/company-relations";

function data(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

// Catch ZodError from a .parse() call and redirect back with a user-facing error flash.
// Re-throws everything else (including the NEXT_REDIRECT signal from redirect()).
function zodCatch(err: unknown, back: string): never {
  if (err instanceof ZodError) {
    const msg = err.issues.map(i => i.message).join(". ");
    redirect(`${back}?error=${encodeURIComponent(msg)}`);
  }
  throw err;
}

function nullable<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, entry === "" ? null : entry])
  ) as T;
}

async function assertOwnedFileAsset(tx: Prisma.TransactionClient, organizationId: string, assetId: string | null | undefined) {
  if (!assetId) return;
  if (await tx.fileAsset.count({ where: { id: assetId, organizationId } }) !== 1) throw new CompanyRelationError();
}

export async function createProfile(formData: FormData) {
  const actor = await requireStaff();
  let parsed: ReturnType<typeof profileSchema.parse>;
  try { parsed = profileSchema.parse(nullable(data(formData))); } catch (e) { zodCatch(e, "/profiles/new"); }
  const serviceTagIds = [...new Set(formArray(formData, "serviceTagIds"))];
  const dedupeKey = [
    parsed.profileName.toLowerCase().trim(),
    parsed.email?.toLowerCase().trim() || "",
    parsed.phone?.replace(/\D/g, "") || ""
  ].join("|");
  const result = await prisma.$transaction(async tx => {
    await assertCompanyRelations(tx, actor.organizationId, {
      profiles: [parsed.companyProfileId], serviceTags: serviceTagIds,
    });
    await assertOwnedFileAsset(tx, actor.organizationId, parsed.w9FileAssetId);
    const existing = await tx.profile.findFirst({ where: {
      organizationId: actor.organizationId,
      OR: [parsed.email ? { email: parsed.email.toLowerCase() } : undefined,
        parsed.phone ? { phone: parsed.phone } : undefined, { dedupeKey }]
        .filter(Boolean) as Prisma.ProfileWhereInput[],
    } });
    if (existing) return { existingId: existing.id };
    const profile = await tx.profile.create({ data: {
      ...parsed,
      email: parsed.email?.toLowerCase() || null,
      profileKind: parsed.profileKind as ProfileKind,
      profileType: parsed.profileType as ProfileType,
      clientStatus: parsed.clientStatus as ClientStatus,
      w9Status: parsed.w9Status as W9Status,
      vendorOnboardingStatus: parsed.vendorOnboardingStatus as VendorOnboardingStatus,
      organizationId: actor.organizationId,
      dedupeKey,
      serviceTags: { create: serviceTagIds.map((serviceTagId) => ({ serviceTagId })) },
    } });
    return { profileId: profile.id };
  });
  if ("existingId" in result) redirect(`/profiles/${result.existingId}`);
  revalidatePath("/profiles");
  redirect("/profiles?flash=Contact+created");
}

export async function updateProfile(profileId: string, formData: FormData) {
  const actor = await requireStaff();
  const parsed = profileSchema.parse(nullable(data(formData)));
  const serviceTagIds = [...new Set(formArray(formData, "serviceTagIds"))];
  if (parsed.companyProfileId === profileId) throw new CompanyRelationError();
  const dedupeKey = [parsed.profileName.toLowerCase().trim(), parsed.email?.toLowerCase().trim() || "",
    parsed.phone?.replace(/\D/g, "") || ""].join("|");
  await prisma.$transaction(async tx => {
    await assertCompanyRelations(tx, actor.organizationId, {
      profiles: [profileId, parsed.companyProfileId], serviceTags: serviceTagIds,
    });
    await assertOwnedFileAsset(tx, actor.organizationId, parsed.w9FileAssetId);
    const duplicate = await tx.profile.findFirst({ where: {
      organizationId: actor.organizationId, id: { not: profileId },
      OR: [parsed.email ? { email: parsed.email.toLowerCase() } : undefined,
        parsed.phone ? { phone: parsed.phone } : undefined, { dedupeKey }]
        .filter(Boolean) as Prisma.ProfileWhereInput[],
    }, select: { id: true } });
    if (duplicate) throw new Error("A matching contact already exists.");
    await tx.profile.update({
      where: { id: profileId },
      data: {
        ...parsed,
        email: parsed.email?.toLowerCase() || null,
        profileKind: parsed.profileKind as ProfileKind,
        profileType: parsed.profileType as ProfileType,
        clientStatus: parsed.clientStatus as ClientStatus,
        w9Status: parsed.w9Status as W9Status,
        vendorOnboardingStatus: parsed.vendorOnboardingStatus as VendorOnboardingStatus,
        dedupeKey,
        serviceTags: {
          deleteMany: {},
          create: serviceTagIds.map((serviceTagId) => ({ serviceTagId }))
        }
      }
    });
  });
  revalidatePath("/profiles");
  revalidatePath(`/profiles/${profileId}`);
  redirect(`/profiles/${profileId}?flash=Changes+saved`);
}

export async function createLead(formData: FormData) {
  const actor = await requireStaff();
  const returnTo = String(formData.get("returnTo") || "");
  let parsed: ReturnType<typeof leadSchema.parse>;
  try { parsed = leadSchema.parse(nullable(data(formData))); } catch (e) { zodCatch(e, "/leads/new"); }
  await prisma.$transaction(async tx => {
    await assertCompanyRelations(tx, actor.organizationId, {
      users: [parsed.ownerUserId], profiles: [parsed.relatedProfileId], properties: [parsed.relatedPropertyId],
    });
    await tx.lead.create({ data: {
      ...parsed, status: parsed.status as Prisma.LeadCreateInput["status"], organizationId: actor.organizationId,
    } });
  });
  revalidatePath("/leads");
  if (returnTo?.startsWith("/guided/")) redirect(returnTo);
  redirect("/leads?flash=Lead+created");
}

export async function updateLead(leadId: string, formData: FormData) {
  const actor = await requireStaff();
  const parsed = leadSchema.parse(nullable(data(formData)));
  await prisma.$transaction(async tx => {
    await assertCompanyRelations(tx, actor.organizationId, {
      leads: [leadId], users: [parsed.ownerUserId], profiles: [parsed.relatedProfileId], properties: [parsed.relatedPropertyId],
    });
    await tx.lead.update({ where: { id: leadId }, data: {
      ...parsed, status: parsed.status as Prisma.LeadUpdateInput["status"],
    } });
  });
  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  redirect(`/leads/${leadId}?flash=Changes+saved`);
}

export async function createProperty(formData: FormData) {
  const actor = await requireStaff();
  const returnTo = String(formData.get("returnTo") || "");
  const parsed = propertySchema.parse(nullable(data(formData)));
  await prisma.$transaction(async tx => {
    await assertCompanyRelations(tx, actor.organizationId, { profiles: [parsed.agentProfileId, parsed.investorProfileId] });
    await tx.property.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { ...parsed, propertyType: parsed.propertyType as Prisma.PropertyCreateInput["propertyType"],
        organizationId: actor.organizationId } as any,
    });
  });
  revalidatePath("/properties");
  if (returnTo?.startsWith("/guided/")) redirect(returnTo);
  redirect("/properties?flash=Property+created");
}

export async function createQuote(formData: FormData) {
  const actor = await requireStaff();
  const parsed = quoteSchema.parse(nullable(data(formData)));
  await prisma.$transaction(async tx => {
    await assertCompanyRelations(tx, actor.organizationId, {
      profiles: [parsed.clientProfileId], properties: [parsed.propertyId], leads: [parsed.leadId],
    });
    await tx.quote.create({ data: {
      ...parsed, quoteStatus: parsed.quoteStatus as Prisma.QuoteCreateInput["quoteStatus"],
      riskLevel: parsed.riskLevel as Prisma.QuoteCreateInput["riskLevel"], tradesNeeded: [],
      organizationId: actor.organizationId,
    } });
  });
  revalidatePath("/quotes");
  redirect("/quotes");
}

function formArray(formData: FormData, name: string) {
  return formData.getAll(name).map((value) => String(value)).filter(Boolean);
}

function numberField(formData: FormData, name: string, fallback = 0) {
  const value = Number(formData.get(name) ?? fallback);
  return Number.isFinite(value) ? value : fallback;
}

export async function createQuoteFromFieldWizard(formData: FormData) {
  const actor = await requireStaff();
  const clientProfileId = String(formData.get("clientProfileId") || "") || null;
  const propertyId = String(formData.get("propertyId") || "") || null;
  const leadId = String(formData.get("leadId") || "") || null;
  const quoteName = String(formData.get("quoteName") || "Field quote draft");
  const gcMarkup = numberField(formData, "gcMarkup", 18);
  const contingency = numberField(formData, "contingency", 8);
  const selectedChecks = new Set(formArray(formData, "scopeChecks"));
  const ownerProvides = formArray(formData, "ownerProvides");
  const contractorProvides = formArray(formData, "contractorProvides");

  const quote = await prisma.$transaction(async tx => {
    await assertCompanyRelations(tx, actor.organizationId, {
      profiles: [clientProfileId], properties: [propertyId], leads: [leadId],
    });
    const quote = await tx.quote.create({
    data: {
      organizationId: actor.organizationId,
      quoteName,
      clientProfileId,
      propertyId,
      leadId,
      quoteStatus: "SCOPE_DRAFT",
      targetSendDate: formData.get("targetSendDate") ? new Date(String(formData.get("targetSendDate"))) : null,
      projectType: String(formData.get("projectType") || "Field walkthrough estimate"),
      budgetRange: String(formData.get("budgetRange") || ""),
      siteVisitRequired: false,
      permitLikely: selectedChecks.has("permits"),
      riskLevel: String(formData.get("riskLevel") || "MEDIUM") as RiskLevel,
      gcMarkup,
      contingency,
      notes: [
        "Created from the mobile field quote wizard.",
        `Owner-provided items: ${ownerProvides.join(", ") || "None marked"}.`,
        `Contractor-provided items: ${contractorProvides.join(", ") || "None marked"}.`,
        `Overview: ${String(formData.get("overview") || "Not captured")}`,
        `Site risks: ${String(formData.get("riskNotes") || "Not captured")}`,
        `Selection notes: ${String(formData.get("selectionNotes") || "Not captured")}`
      ].join("\n")
    }
  });

  const catalog = await tx.costCatalogItem.findMany({ where: { organizationId: actor.organizationId, active: true } });
  const catalogByCategory = new Map<string, (typeof catalog)[number]>();
  for (const item of catalog) if (!catalogByCategory.has(item.category)) catalogByCategory.set(item.category, item);

  async function addDraftLine(category: string, name: string, quantity: number, description: string, internalNotes?: string, allowanceAmount?: number) {
    const catalogItem = catalogByCategory.get(category);
    const unitCostLow = allowanceAmount ? allowanceAmount * 0.9 : Number(catalogItem?.flipsideLowCost ?? 125);
    const unitCostTarget = allowanceAmount ?? Number(catalogItem?.flipsideTargetCost ?? 185);
    const unitCostHigh = allowanceAmount ? allowanceAmount * 1.15 : Number(catalogItem?.flipsideHighCost ?? 260);
    const laborLow = unitCostLow * 0.55;
    const laborTarget = unitCostTarget * 0.55;
    const laborHigh = unitCostHigh * 0.55;
    const materialLow = unitCostLow * 0.45;
    const materialTarget = unitCostTarget * 0.45;
    const materialHigh = unitCostHigh * 0.45;
    const totals = calculateLineItem({
      quantity,
      laborLow,
      laborTarget,
      laborHigh,
      materialLow,
      materialTarget,
      materialHigh,
      subcontractorCost: 0,
      markupPercent: gcMarkup,
      riskFactor: String(formData.get("riskLevel") || catalogItem?.riskFactor || "MEDIUM") as RiskLevel
    });

    await tx.quoteLineItem.create({
      data: {
        quoteId: quote.id,
        scopeArea: category,
        costCatalogItemId: catalogItem?.id,
        lineItemName: name,
        unitType: catalogItem?.unitType ?? "allowance",
        quantity,
        laborLow,
        laborTarget,
        laborHigh,
        materialLow,
        materialTarget,
        materialHigh,
        markupPercent: gcMarkup,
        riskFactor: String(formData.get("riskLevel") || catalogItem?.riskFactor || "MEDIUM") as RiskLevel,
        clientFacingDescription: description,
        internalNotes,
        ...totals
      }
    });
  }

  for (const item of [...fieldStandardChecks, ...exteriorChecks, ...garageChecks]) {
    if (selectedChecks.has(item.key)) {
      await addDraftLine(item.category, item.label, 1, `${item.label} captured during field walkthrough.`);
    }
  }

  for (const room of roomPresets) {
    if (!formData.get(`${room.key}.include`)) continue;
    const length = numberField(formData, `${room.key}.length`);
    const width = numberField(formData, `${room.key}.width`);
    const sqft = Math.max(1, length * width || numberField(formData, `${room.key}.sqft`, 1));
    const measurementNotes = [
      `Room: ${room.label}`,
      `Approx. dimensions: ${length || "?"} x ${width || "?"}, sqft ${sqft}.`,
      `Windows: ${numberField(formData, `${room.key}.windows`)}, doors: ${numberField(formData, `${room.key}.doors`)}, outlets: ${numberField(formData, `${room.key}.outlets`)}, switches: ${numberField(formData, `${room.key}.switches`)}, GFI: ${numberField(formData, `${room.key}.gfi`)}.`,
      `Overview: ${String(formData.get(`${room.key}.overview`) || "Not captured")}`
    ].join("\n");

    for (const phase of room.phases) {
      const phaseNote = String(formData.get(`${room.key}.${phase}`) || "").trim();
      if (phaseNote) {
        await addDraftLine(categoryForPhase(phase), `${room.label}: ${phase}`, sqft, `${phase} scope for ${room.label}.`, `${measurementNotes}\n${phase}: ${phaseNote}`);
      }
    }
  }

  for (let slot = 1; slot <= 6; slot++) {
    if (!formData.get(`customRoom${slot}.include`)) continue;
    const type = String(formData.get(`customRoom${slot}.type`) || "Custom room");
    const label = String(formData.get(`customRoom${slot}.label`) || `${type} ${slot}`);
    const length = numberField(formData, `customRoom${slot}.length`);
    const width = numberField(formData, `customRoom${slot}.width`);
    const sqft = Math.max(1, length * width || numberField(formData, `customRoom${slot}.sqft`, 1));
    const measurementNotes = [
      `Room: ${label}`,
      `Type: ${type}`,
      `Approx. dimensions: ${length || "?"} x ${width || "?"}, sqft ${sqft}.`,
      `Windows: ${numberField(formData, `customRoom${slot}.windows`)}, doors: ${numberField(formData, `customRoom${slot}.doors`)}, outlets: ${numberField(formData, `customRoom${slot}.outlets`)}, switches: ${numberField(formData, `customRoom${slot}.switches`)}.`,
      `Overview: ${String(formData.get(`customRoom${slot}.overview`) || "Not captured")}`
    ].join("\n");
    for (const phase of ["Demo", "Rough Electric", "Rough Plumbing", "Wall Covering", "Paint", "Flooring", "Cabinets / Counters", "Trim"]) {
      const phaseNote = String(formData.get(`customRoom${slot}.${phase}`) || "").trim();
      if (phaseNote) {
        await addDraftLine(categoryForPhase(phase), `${label}: ${phase}`, sqft, `${phase} scope for ${label}.`, `${measurementNotes}\n${phase}: ${phaseNote}`);
      }
    }
  }

  const cabinetFields = [
    ["baseCabinets", "Base cabinets", "Cabinets"],
    ["wallCabinets", "Wall cabinets", "Cabinets"],
    ["tallCabinets", "Tall/pantry cabinets", "Cabinets"],
    ["islandLength", "Island cabinet run", "Cabinets"],
    ["countertopSqft", "Countertop planning", "Countertops"],
    ["applianceOpenings", "Appliance openings", "Appliances"]
  ] as const;
  const cabinetNotes = String(formData.get("cabinet.notes") || "").trim();
  const availableWallLength = String(formData.get("cabinet.wallLength") || "").trim();
  for (const [field, label, category] of cabinetFields) {
    const quantity = numberField(formData, `cabinet.${field}`);
    if (quantity > 0) {
      await addDraftLine(category, `Cabinet plan: ${label}`, quantity, `${label} captured in the cabinet planning section.`, `Available wall length: ${availableWallLength || "not captured"}.\nCabinet notes: ${cabinetNotes || "not captured"}.`);
    }
  }

  for (const item of allowanceItems) {
    const amount = numberField(formData, `allowance.${item.name}`);
    const quantityBasis = String(formData.get(`allowanceQty.${item.name}`) || "").trim();
    if (amount > 0) {
      await addDraftLine(item.category, `Allowance: ${item.name}`, 1, `${item.name} allowance captured during field walkthrough.`, `Allowance amount entered: $${amount}. Unit: ${item.unit}. Quantity/basis: ${quantityBasis || "not captured"}. Verify against selections, vendor quotes, and final scope.`, amount);
    }
  }

  await tx.activity.create({
    data: {
      relatedProfileId: clientProfileId,
      relatedLeadId: leadId,
      relatedPropertyId: propertyId,
      relatedQuoteId: quote.id,
      activityType: "SITE_VISIT",
      subject: "Field estimate walkthrough completed",
      body: "Mobile quote wizard captured measurements, material responsibility, standard checks, room notes, allowances, and draft line items. Review pricing before sending."
    }
  });

    await recalculateQuote(tx, actor.organizationId, quote.id);
    return quote;
  }, { timeout: 30_000 });
  revalidatePath("/quotes");
  redirect(`/quotes/${quote.id}`);
}

export async function createQuoteLineItem(formData: FormData) {
  const actor = await requireStaff();
  const parsed = quoteLineItemSchema.parse(nullable(data(formData)));
  const totals = calculateLineItem({
    ...parsed,
    riskFactor: parsed.riskFactor as RiskLevel
  });
  await prisma.$transaction(async tx => {
    await assertCompanyRelations(tx, actor.organizationId, {
      quotes: [parsed.quoteId], catalogItems: [parsed.costCatalogItemId],
    });
    await tx.quoteLineItem.create({ data: {
      ...parsed,
      riskFactor: parsed.riskFactor as RiskLevel,
      ...totals
    } });
    await recalculateQuote(tx, actor.organizationId, parsed.quoteId);
  });
  revalidatePath(`/quotes/${parsed.quoteId}`);
  redirect(`/quotes/${parsed.quoteId}`);
}

export async function addCatalogItemToQuote(formData: FormData) {
  const actor = await requireStaff();
  const quoteId = String(formData.get("quoteId"));
  const catalogItemId = String(formData.get("catalogItemId"));
  const quantity = Number(formData.get("quantity") ?? 1);
  await prisma.$transaction(async tx => {
    await assertCompanyRelations(tx, actor.organizationId, { quotes: [quoteId], catalogItems: [catalogItemId] });
    const item = await tx.costCatalogItem.findUniqueOrThrow({ where: { id: catalogItemId } });
    const target = Number(item.flipsideTargetCost);
    const low = Number(item.flipsideLowCost);
    const high = Number(item.flipsideHighCost);
    const laborLow = low * 0.55;
    const laborTarget = target * 0.55;
    const laborHigh = high * 0.55;
    const materialLow = low * 0.45;
    const materialTarget = target * 0.45;
    const materialHigh = high * 0.45;
    const totals = calculateLineItem({ quantity, laborLow, laborTarget, laborHigh, materialLow,
      materialTarget, materialHigh, subcontractorCost: 0, markupPercent: Number(item.markup), riskFactor: item.riskFactor });
    await tx.quoteLineItem.create({ data: {
      quoteId,
      costCatalogItemId: catalogItemId,
      scopeArea: item.category,
      lineItemName: item.serviceName,
      unitType: item.unitType,
      quantity,
      laborLow,
      laborTarget,
      laborHigh,
      materialLow,
      materialTarget,
      materialHigh,
      markupPercent: item.markup,
      riskFactor: item.riskFactor,
      clientFacingDescription: `${item.serviceName} based on RenoTech Cost Catalog planning ranges.`,
      ...totals
    } });
    await recalculateQuote(tx, actor.organizationId, quoteId);
  });
  revalidatePath(`/quotes/${quoteId}`);
  redirect(`/quotes/${quoteId}`);
}

export async function createCatalogItem(formData: FormData) {
  await requireStaff();
  const parsed = catalogSchema.parse(nullable(data(formData)));
  await prisma.costCatalogItem.create({
    data: {
      ...parsed,
      riskFactor: parsed.riskFactor as Prisma.CostCatalogItemCreateInput["riskFactor"],
      organizationId: DEFAULT_ORG_ID
    }
  });
  revalidatePath("/cost-catalog");
  redirect("/cost-catalog");
}

export async function updateCatalog(itemId: string, formData: FormData) {
  await requireStaff();
  const parsed = catalogSchema.parse(nullable(data(formData)));
  await prisma.costCatalogItem.update({
    where: { id: itemId },
    data: {
      ...parsed,
      riskFactor: parsed.riskFactor as Prisma.CostCatalogItemUpdateInput["riskFactor"],
    }
  });
  revalidatePath("/cost-catalog");
  revalidatePath(`/cost-catalog/${itemId}`);
  redirect(`/cost-catalog/${itemId}?flash=Item+updated`);
}

export async function createActivity(formData: FormData) {
  const actor = await requireStaff();
  const subject = String(formData.get("subject") ?? "");
  const activityType = String(formData.get("activityType") ?? "NOTE");
  const body = String(formData.get("body") ?? "") || null;
  const dueDateRaw = String(formData.get("dueDate") ?? "");
  const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;
  const relatedProfileId = String(formData.get("relatedProfileId") ?? "") || null;
  const relatedLeadId = String(formData.get("relatedLeadId") ?? "") || null;
  const relatedJobId = String(formData.get("relatedJobId") ?? "") || null;
  const activity = await prisma.$transaction(async tx => {
    await assertActivityCompanyRelations(tx, actor.organizationId, {
      profileId: relatedProfileId, leadId: relatedLeadId, jobId: relatedJobId,
    });
    return tx.activity.create({ data: {
      subject,
      activityType: activityType as Prisma.ActivityCreateInput["activityType"],
      body,
      dueDate,
      relatedProfileId,
      relatedLeadId,
      relatedJobId
    } });
  });
  revalidatePath("/activities");
  redirect(`/activities/${activity.id}?flash=Activity+created`);
}

export async function deleteLead(leadId: string) {
  const actor = await requireStaff();
  await prisma.$transaction(async tx => {
    await assertCompanyRelations(tx, actor.organizationId, { leads: [leadId] });
    const foreignLinks = await Promise.all([
      tx.quote.count({ where: { leadId, organizationId: { not: actor.organizationId } } }),
      tx.estimateFollowUp.count({ where: { relatedLeadId: leadId, estimate: { quote: { organizationId: { not: actor.organizationId } } } } }),
    ]);
    if (foreignLinks.some(Boolean)) throw new CompanyRelationError();
    await tx.lead.update({ where: { id: leadId }, data: { deletedAt: new Date() } });
  });
  revalidatePath("/leads");
  redirect("/leads?flash=Lead+deleted");
}

export async function deleteProfile(profileId: string) {
  const actor = await requireStaff();
  await prisma.$transaction(async tx => {
    await assertCompanyRelations(tx, actor.organizationId, { profiles: [profileId] });
    const foreignLinks = await Promise.all([
      tx.profileRelationship.count({ where: { OR: [{ fromProfileId: profileId }, { toProfileId: profileId }],
        NOT: { AND: [{ organizationId: actor.organizationId }, { fromProfile: { organizationId: actor.organizationId } }, { toProfile: { organizationId: actor.organizationId } }] } } }),
      tx.profileServiceTag.count({ where: { profileId, serviceTag: { organizationId: { not: actor.organizationId } } } }),
      tx.property.count({ where: { OR: [{ agentProfileId: profileId }, { investorProfileId: profileId }], organizationId: { not: actor.organizationId } } }),
      tx.lead.count({ where: { relatedProfileId: profileId, organizationId: { not: actor.organizationId } } }),
      tx.quote.count({ where: { clientProfileId: profileId, organizationId: { not: actor.organizationId } } }),
      tx.job.count({ where: { clientProfileId: profileId, organizationId: { not: actor.organizationId } } }),
      tx.estimate.count({ where: { clientProfileId: profileId, quote: { organizationId: { not: actor.organizationId } } } }),
    ]);
    if (foreignLinks.some(Boolean)) throw new CompanyRelationError();
    await tx.profile.delete({ where: { id: profileId } });
  });
  revalidatePath("/profiles");
  redirect("/profiles?flash=Contact+deleted");
}

export async function deleteProperty(propertyId: string) {
  const actor = await requireStaff();
  await prisma.$transaction(async tx => {
    await assertCompanyRelations(tx, actor.organizationId, { properties: [propertyId] });
    const foreignLinks = await Promise.all([
      tx.lead.count({ where: { relatedPropertyId: propertyId, organizationId: { not: actor.organizationId } } }),
      tx.quote.count({ where: { propertyId, organizationId: { not: actor.organizationId } } }),
      tx.job.count({ where: { propertyId, organizationId: { not: actor.organizationId } } }),
      tx.estimate.count({ where: { propertyId, quote: { organizationId: { not: actor.organizationId } } } }),
    ]);
    if (foreignLinks.some(Boolean)) throw new CompanyRelationError();
    await tx.property.delete({ where: { id: propertyId } });
  });
  revalidatePath("/properties");
  redirect("/properties?flash=Property+deleted");
}

export async function deleteInvoice(invoiceId: string) {
  const actor = await requireStaff();
  const { financeActor, FinancialRecordError } = await import("@/lib/finance-lock");
  const { assertInvoiceNotMilestoneLinked } = await import("@/lib/milestone-billing");
  try {
    await prisma.$transaction(async tx => {
      const organizationId = await financeActor(tx, actor.id);
      const invoice = await tx.invoice.findUnique({ where: { id: invoiceId }, include: { job: true, clientProfile: true } });
      if (!invoice || (!invoice.job && !invoice.clientProfile) || (invoice.job && invoice.job.organizationId !== organizationId) || (invoice.clientProfile && invoice.clientProfile.organizationId !== organizationId)) throw new FinancialRecordError("Invoice access denied.");
      await assertInvoiceNotMilestoneLinked(tx, invoiceId);
      await tx.invoice.delete({ where: { id: invoiceId } });
    });
  } catch (error) {
    if (error instanceof FinancialRecordError) redirect(`/invoices/${invoiceId}?error=${encodeURIComponent(error.message)}`);
    throw error;
  }
  revalidatePath("/invoices");
  redirect("/invoices?flash=Invoice+deleted");
}

export async function deleteChangeOrder(changeOrderId: string) {
  await requireStaff();
  const actor = await requireStaff();
  const { deleteUnissuedChangeDraft } = await import("@/lib/change-order-ledger");
  const { FinancialRecordError } = await import("@/lib/finance-lock");
  try { await deleteUnissuedChangeDraft(prisma, actor.id, changeOrderId); }
  catch (error) { if (error instanceof FinancialRecordError) redirect("/change-orders/" + changeOrderId + "?error=" + encodeURIComponent(error.message)); throw error; }
  revalidatePath("/change-orders");
  redirect("/change-orders?flash=Unissued+draft+deleted");
}

export async function createJob(formData: FormData) {
  const actor = await requireStaff();
  const returnTo = String(formData.get("returnTo") || "");
  let parsed: ReturnType<typeof jobSchema.parse>;
  try { parsed = jobSchema.parse(nullable(data(formData))); } catch (e) { zodCatch(e, "/jobs/new"); }
  if (parsed.jobStatus === "DEPOSIT_RECEIVED") redirect("/jobs/new?error=Create+the+job+then+verify+the+documented+deposit+and+receipts");
  const balanceDue = Number(parsed.contractAmount) - Number(parsed.amountPaid);
  const job = await prisma.$transaction(async tx => {
    await assertCompanyRelations(tx, actor.organizationId, {
      profiles: [parsed.clientProfileId], properties: [parsed.propertyId], quotes: [parsed.approvedQuoteId],
    });
    if (parsed.approvedQuoteId) {
      const quote = await tx.quote.findUniqueOrThrow({
        where: { id: parsed.approvedQuoteId }, select: { clientProfileId: true, propertyId: true },
      });
      if ((parsed.clientProfileId && quote.clientProfileId !== parsed.clientProfileId)
        || (parsed.propertyId && quote.propertyId !== parsed.propertyId)) throw new CompanyRelationError();
    }
    return tx.job.create({
      data: {
        ...parsed,
        jobStatus: parsed.jobStatus as Prisma.JobCreateInput["jobStatus"],
        riskLevel: parsed.riskLevel as Prisma.JobCreateInput["riskLevel"],
        balanceDue,
        organizationId: actor.organizationId,
        phases: {
          create: renovationPhaseDetails.map(([phaseName, description], index) => ({
            phaseNumber: index + 1,
            phaseName,
            clientUpdate: description,
            completionCriteria: `Phase ${index + 1} is complete when ${phaseName.toLowerCase()} work is verified, required proof is attached, blockers are resolved, and client-facing status is ready.`
          }))
        }
      }
    });
  });
  revalidatePath("/jobs");
  if (returnTo?.startsWith("/guided/")) redirect(returnTo);
  redirect(`/jobs/${job.id}?flash=Job+created`);
}

export async function updateJob(jobId: string, formData: FormData) {
  await requireStaff();
  const actor = await requireStaff();
  const parsed = jobSchema.parse(nullable(data(formData)));
  const { saveJobDetails } = await import("@/lib/job-finance");
  const { FinancialRecordError } = await import("@/lib/finance-lock");
  try { await saveJobDetails(prisma, actor.id, jobId, parsed); }
  catch (error) { if (error instanceof FinancialRecordError) redirect("/jobs/" + jobId + "/edit?error=" + encodeURIComponent(error.message)); throw error; }
  revalidatePath("/jobs", "layout");
  redirect("/jobs/" + jobId + "?flash=Changes+saved");
}

export async function updateProperty(propertyId: string, formData: FormData) {
  const actor = await requireStaff();
  const parsed = propertySchema.parse(nullable(data(formData)));
  await prisma.$transaction(async tx => {
    await assertCompanyRelations(tx, actor.organizationId, {
      properties: [propertyId], profiles: [parsed.agentProfileId, parsed.investorProfileId],
    });
    await tx.property.update({ where: { id: propertyId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { ...parsed, propertyType: parsed.propertyType as Prisma.PropertyUpdateInput["propertyType"] } as any,
    });
  });
  revalidatePath("/properties");
  revalidatePath(`/properties/${propertyId}`);
  redirect(`/properties/${propertyId}?flash=Property+saved`);
}

export async function updateQuote(quoteId: string, formData: FormData) {
  const actor = await requireStaff();
  const parsed = quoteSchema.parse(nullable(data(formData)));
  await prisma.$transaction(async tx => {
    await assertCompanyRelations(tx, actor.organizationId, {
      quotes: [quoteId], profiles: [parsed.clientProfileId], properties: [parsed.propertyId], leads: [parsed.leadId],
    });
    await tx.quote.update({ where: { id: quoteId }, data: {
      ...parsed, quoteStatus: parsed.quoteStatus as Prisma.QuoteUpdateInput["quoteStatus"],
      riskLevel: parsed.riskLevel as Prisma.QuoteUpdateInput["riskLevel"],
    } });
  });
  revalidatePath("/quotes");
  revalidatePath(`/quotes/${quoteId}`);
  redirect(`/quotes/${quoteId}`);
}

export async function updateEstimateFollowUp(followUpId: string, estimateId: string, formData: FormData) {
  const actor = await requireStaff();
  const status = String(formData.get("status") || "SCHEDULED");
  const outcomeNotes = String(formData.get("outcomeNotes") || "") || null;
  const dueDateRaw = formData.get("dueDate");
  const dueDate = dueDateRaw ? new Date(String(dueDateRaw)) : undefined;
  await prisma.$transaction(async tx => {
    await assertCompanyRelations(tx, actor.organizationId, {
      estimates: [estimateId], estimateFollowUps: [followUpId],
    });
    const followUp = await tx.estimateFollowUp.findUniqueOrThrow({ where: { id: followUpId }, select: { estimateId: true } });
    if (followUp.estimateId !== estimateId) throw new CompanyRelationError();
    await tx.estimateFollowUp.update({ where: { id: followUpId }, data: {
      status: status as Prisma.EstimateFollowUpUpdateInput["status"],
      outcomeNotes,
      ...(dueDate ? { dueDate } : {}),
      ...(status === "COMPLETED" ? { completedAt: new Date() } : {})
    } });
  });
  revalidatePath(`/estimates/${estimateId}`);
  redirect(`/estimates/${estimateId}`);
}

export async function updateEstimate(estimateId: string, formData: FormData) {
  const actor = await requireStaff();
  const parsed = estimateSchema.parse(nullable(data(formData)));
  await prisma.$transaction(async tx => {
    await assertCompanyRelations(tx, actor.organizationId, { estimates: [estimateId] });
    await tx.estimate.update({ where: { id: estimateId }, data: {
      ...parsed,
      status: parsed.status as Prisma.EstimateUpdateInput["status"],
      confidenceLevel: parsed.confidenceLevel as Prisma.EstimateUpdateInput["confidenceLevel"]
    } });
  });
  revalidatePath("/estimates");
  revalidatePath(`/estimates/${estimateId}`);
  redirect(`/estimates/${estimateId}`);
}

export async function createTask(formData: FormData) {
  const actor = await requireStaff();
  const parsed = taskSchema.parse(nullable(data(formData)));
  const { assertDeliveryRelations, DeliveryRelationError } = await import("@/lib/delivery-relations");
  await prisma.$transaction(async tx => {
    await assertDeliveryRelations(tx, actor.organizationId, { phases: [parsed.phaseId] });
    await assertCompanyRelations(tx, actor.organizationId, {
      jobs: [parsed.jobId], profiles: [parsed.assignedToProfileId],
    });
    if (parsed.phaseId) {
      const phase = await tx.renovationPhase.findUniqueOrThrow({ where: { id: parsed.phaseId }, select: { jobId: true } });
      if (phase.jobId !== parsed.jobId) throw new DeliveryRelationError();
    }
    await tx.task.create({
      data: {
        ...parsed,
        status: parsed.status as Prisma.TaskCreateInput["status"],
        priority: parsed.priority as Prisma.TaskCreateInput["priority"]
      }
    });
  });
  revalidatePath("/operations");
  revalidatePath("/field");
  revalidatePath(`/jobs/${parsed.jobId}`);
  redirect(`/jobs/${parsed.jobId}`);
}

export async function completeTask(formData: FormData) {
  const actor = await requireStaff();
  const taskId = String(formData.get("taskId") ?? "");
  const requestedReturn = String(formData.get("returnTo") ?? "/field");
  const returnTo = requestedReturn === "/field" || requestedReturn === "/operations" || /^\/jobs\/[^/?#]+$/.test(requestedReturn)
    ? requestedReturn : "/field";
  const { assertDeliveryRelations } = await import("@/lib/delivery-relations");
  await prisma.$transaction(async tx => {
    await assertDeliveryRelations(tx, actor.organizationId, { tasks: [taskId] });
    await tx.task.update({ where: { id: taskId }, data: { status: "COMPLETE" } });
  });
  revalidatePath("/field");
  revalidatePath("/operations");
  redirect(returnTo + "?flash=Task+marked+complete");
}

const projectTaskTemplates = {
  KITCHEN_REFRESH: {
    label: "Kitchen refresh",
    tasks: [
      ["Site Prep", "Protect floors, cabinets staging path, and occupied areas", "HIGH"],
      ["Demo", "Remove approved cabinets, counters, fixtures, and backsplash", "HIGH"],
      ["Rough Electric", "Confirm appliance circuits, GFI locations, lighting, and switch plan", "HIGH"],
      ["Rough Plumbing", "Confirm sink, dishwasher, disposal, fridge line, and shutoff plan", "HIGH"],
      ["Wall Covering", "Patch drywall, backer, and backsplash substrate", "MEDIUM"],
      ["Paint", "Prime and paint kitchen walls, ceiling, and exposed trim areas", "MEDIUM"],
      ["Flooring", "Patch or protect flooring and install transitions", "MEDIUM"],
      ["Cabinets / Counters", "Install cabinets, hardware, templates, counters, sink, and punch items", "HIGH"],
      ["Trim", "Install toe kick, scribe, casing touchups, caulk, and finish details", "MEDIUM"],
      ["Punch List / Clean Up", "Final clean, appliance function check, photos, and client walkthrough", "HIGH"]
    ]
  },
  BATHROOM_RENOVATION: {
    label: "Bathroom renovation",
    tasks: [
      ["Site Prep", "Protect access path, dust control, water shutoff, and client access plan", "HIGH"],
      ["Demo", "Remove approved tile, vanity, toilet, fixtures, and damaged substrate", "HIGH"],
      ["Rough Framing", "Add blocking for vanity, accessories, glass, grab bars, and niches", "HIGH"],
      ["Rough Electric", "Rough vanity light, fan, GFI, switches, and required dedicated circuits", "HIGH"],
      ["Rough Plumbing", "Rough shower valve, drains, supply lines, toilet flange, and vanity plumbing", "HIGH"],
      ["Rough HVAC", "Confirm bath fan ducting, timer/humidity control, and vent termination", "MEDIUM"],
      ["Sec. Framing / Insulation", "Install insulation, sound control, fire blocking, and pre-cover photos", "MEDIUM"],
      ["Wall Covering", "Install waterproofing, backer board, drywall, tile substrate, and inspection photos", "HIGH"],
      ["Paint", "Prime and paint moisture-rated surfaces", "MEDIUM"],
      ["Flooring", "Install floor tile, underlayment, transitions, and grout/seal steps", "HIGH"],
      ["Cabinets / Counters", "Install vanity, top, sink, faucets, mirrors, and accessories", "HIGH"],
      ["Trim", "Install base, casing, caulk, touchups, and hardware", "MEDIUM"],
      ["Punch List / Clean Up", "Leak test, fan test, final photos, client walkthrough, and closeout notes", "HIGH"]
    ]
  },
  FULL_INTERIOR_RENOVATION: {
    label: "Full interior renovation",
    tasks: renovationPhaseDetails.map(([phaseName, description]) => [phaseName, description, phaseName.includes("Punch") || phaseName.includes("Rough") ? "HIGH" : "MEDIUM"])
  }
} as const;

export async function deployProjectTaskTemplate(formData: FormData) {
  const actor = await requireStaff();
  const jobId = String(formData.get("jobId") || "");
  const templateKey = String(formData.get("templateKey") || "FULL_INTERIOR_RENOVATION") as keyof typeof projectTaskTemplates;
  const template = projectTaskTemplates[templateKey] ?? projectTaskTemplates.FULL_INTERIOR_RENOVATION;
  await prisma.$transaction(async tx => {
    await assertCompanyRelations(tx, actor.organizationId, { jobs: [jobId] });
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${actor.organizationId + ":delivery-job:" + jobId}, 0))::text`;
    const job = await tx.job.findUniqueOrThrow({ where: { id: jobId }, include: { phases: true } });
    const phaseByName = new Map(job.phases.map((phase) => [phase.phaseName, phase]));
    for (const [phaseName, taskName, priority] of template.tasks) {
      const phase = phaseByName.get(phaseName);
      const exists = await tx.task.findFirst({ where: { jobId, phaseId: phase?.id, taskName } });
      if (!exists) {
        await tx.task.create({ data: { jobId, phaseId: phase?.id, taskName,
          priority: priority as Prisma.TaskCreateInput["priority"],
          notes: `Deployed from ${template.label} project template. Adjust scope, assignee, dates, and proof requirements for the actual job.` } });
      }
    }
  });

  revalidatePath(`/jobs/${jobId}`);
  redirect(`/jobs/${jobId}`);
}

export async function convertQuoteToJob(quoteId: string) {
  const actor = await requireStaff();
  const { existing, estimate } = await prisma.$transaction(async tx => {
    await assertCompanyRelations(tx, actor.organizationId, { quotes: [quoteId] });
    return {
      existing: await tx.job.findFirst({ where: { approvedQuoteId: quoteId, organizationId: actor.organizationId }, select: { id: true } }),
      estimate: await tx.estimate.findFirst({ where: { quoteId, quote: { organizationId: actor.organizationId }, acceptance: { isNot: null } }, select: { id: true } }),
    };
  });
  if (existing) redirect(`/jobs/${existing.id}`);
  if (!estimate) redirect(`/quotes/${quoteId}?error=Issue+a+reviewed+estimate+and+retain+client+acceptance+before+creating+the+job`);
  await convertReviewedEstimate(estimate.id);
}

export async function createEstimateFromQuote(quoteId: string) {
  const actor = await requireStaff();
  const estimate = await prisma.$transaction(async tx => {
    await assertCompanyRelations(tx, actor.organizationId, { quotes: [quoteId] });
    const quote = await tx.quote.findUniqueOrThrow({ where: { id: quoteId },
      include: { lead: true, clientProfile: true, property: true, lineItems: true } });
    await assertCompanyRelations(tx, actor.organizationId, {
      profiles: [quote.clientProfileId], properties: [quote.propertyId], leads: [quote.leadId],
      catalogItems: quote.lineItems.map(line => line.costCatalogItemId),
    });
    const estimateCount = await tx.estimate.count({ where: { quote: { organizationId: actor.organizationId } } });
    const subtotal = Number(quote.totalTarget);
    const total = Number(quote.finalQuoteAmount ?? quote.totalTarget);
    const confidenceScore = quote.lineItems.length >= 4 && quote.siteVisitRequired === false ? 78 : quote.lineItems.length >= 3 ? 68 : 48;
    const created = await tx.estimate.create({
    data: {
      quoteId,
      estimateNumber: `EST-${String(estimateCount + 1001).padStart(4, "0")}-${randomUUID().slice(0, 8).toUpperCase()}`,
      clientProfileId: quote.clientProfileId,
      propertyId: quote.propertyId,
      subtotal,
      markup: Number(quote.gcMarkup),
      contingency: Number(quote.contingency),
      tax: 0,
      total,
      status: "DRAFT",
      confidenceLevel: confidenceScore >= 75 ? "HIGH" : confidenceScore >= 55 ? "MEDIUM" : "LOW",
      confidenceScore,
      readinessScore: quote.lineItems.length >= 3 ? 72 : 45,
      scopeClarity: quote.lead?.scopeClarity ?? 55,
      pricingSource: "RenoTech Cost Catalog + quote line items",
      clientFacingSummary: "Estimate prepared from approved scope assumptions. Final pricing depends on site conditions, selections, trade quotes, permitting, and approved scope.",
      internalRiskNotes: quote.notes,
      nextFollowUpDue: new Date(Date.now() + 86400000),
      revisions: {
        create: {
          revisionNumber: 1,
          reason: "Initial estimate generated from quote.",
          subtotal,
          total,
          snapshot: {
            quoteId,
            lineItems: quote.lineItems.map((line) => ({ name: line.lineItemName, total: String(line.totalTarget) }))
          }
        }
      },
      followUps: {
        create: [
          {
            relatedLeadId: quote.leadId,
            followUpType: "CONFIRM_RECEIVED",
            dueDate: new Date(Date.now() + 86400000),
            suggestedMessage: "Just confirming you received the estimate. What questions can I answer about scope, allowances, or timing?"
          },
          {
            relatedLeadId: quote.leadId,
            followUpType: "ANSWER_QUESTIONS",
            dueDate: new Date(Date.now() + 3 * 86400000),
            suggestedMessage: "Checking in on the estimate. Are there any scope items you want clarified or separated as alternates?"
          },
          {
            relatedLeadId: quote.leadId,
            followUpType: "DECISION_TIMELINE",
            dueDate: new Date(Date.now() + 7 * 86400000),
            suggestedMessage: "Do you have a target decision timeline so we can plan scheduling and trade availability?"
          },
          {
            relatedLeadId: quote.leadId,
            followUpType: "NURTURE",
            dueDate: new Date(Date.now() + 14 * 86400000),
            suggestedMessage: "Keeping this on my radar. If timing changes or you want to revise scope, I can update the estimate."
          }
        ]
      }
    }
    });
    await tx.quote.update({ where: { id: quoteId }, data: { quoteStatus: "SENT" } });
    return created;
  });
  revalidatePath("/estimates");
  revalidatePath(`/quotes/${quoteId}`);
  redirect(`/estimates/${estimate.id}`);
}

async function retainReportGuideReview(tx: Prisma.TransactionClient, actorId: string, report: { id: string; jobId: string; weekEnding: Date; clientSummary: string | null }, formData: FormData) {
  const taskId = String(formData.get("guideTaskId") ?? "").trim();
  const remember = formData.get("guideRememberCorrection") === "on";
  if (!taskId) {
    if (remember) throw new ReportGuideError("Apply a guide draft before remembering a correction.");
    return;
  }
  const correction = remember ? reportGuideCorrectionSchema.parse({
    scope: formData.get("guideCorrectionScope"),
    category: formData.get("guideCorrectionCategory"),
    instruction: formData.get("guideCorrectionInstruction"),
  }) : undefined;
  await reviewGuideTask(tx, actorId, {
    taskId, reportId: report.id, jobId: report.jobId,
    weekEnding: report.weekEnding.toISOString().slice(0, 10),
    finalSummary: report.clientSummary ?? "", correction,
  });
}

export async function createWeeklyReport(formData: FormData) {
  const actor = await requireStaff();
  let parsed: ReturnType<typeof weeklyReportSchema.parse>;
  try { parsed = weeklyReportSchema.parse(nullable(data(formData))); } catch (error) {
    if (error instanceof ZodError) return { error: error.issues.map(issue => issue.message).join(". ") };
    throw error;
  }
  const { assertEntityOwnership } = await import("@/lib/private-media");
  await assertEntityOwnership(prisma, "JOB", parsed.jobId, actor.organizationId);
  try {
    await prisma.$transaction(async tx => {
      const report = await tx.weeklyReport.create({ data: parsed });
      await retainReportGuideReview(tx, actor.id, report, formData);
    });
  } catch (error) {
    if (error instanceof ReportGuideError) return { error: error.message };
    if (error instanceof ZodError) return { error: error.issues.map(issue => issue.message).join(". ") };
    throw error;
  }
  revalidatePath("/weekly-reports");
  return { redirectTo: "/weekly-reports?flash=Report+saved" };
}

export async function updateWeeklyReport(reportId: string, formData: FormData) {
  const actor = await requireStaff();
  let parsed: ReturnType<typeof weeklyReportSchema.parse>;
  try { parsed = weeklyReportSchema.parse(nullable(data(formData))); } catch (error) {
    if (error instanceof ZodError) return { error: error.issues.map(issue => issue.message).join(". ") };
    throw error;
  }
  const { assertEntityOwnership } = await import("@/lib/private-media");
  await assertEntityOwnership(prisma, "WEEKLY_REPORT", reportId, actor.organizationId);
  const existing = await prisma.weeklyReport.findUniqueOrThrow({ where: { id: reportId } });
  if (parsed.jobId !== existing.jobId) throw new Error("A report cannot be moved to another project.");
  try {
    await prisma.$transaction(async tx => {
      const report = await tx.weeklyReport.update({ where: { id: reportId }, data: parsed });
      await retainReportGuideReview(tx, actor.id, report, formData);
    });
  } catch (error) {
    if (error instanceof ReportGuideError) return { error: error.message };
    if (error instanceof ZodError) return { error: error.issues.map(issue => issue.message).join(". ") };
    throw error;
  }
  revalidatePath("/weekly-reports");
  revalidatePath(`/weekly-reports/${reportId}`);
  return { redirectTo: `/weekly-reports/${reportId}?flash=Changes+saved` };
}

export async function publishWeeklyReport(reportId: string, reviewedDigest: string) {
  await requireStaff();
  const actor = await requireStaff();
  const { publishReport, ReportPublicationError } = await import("@/lib/report-publication");
  try { await publishReport(prisma, actor.id, reportId, reviewedDigest); }
  catch (error) {
    if (error instanceof ReportPublicationError) redirect(`/weekly-reports/${reportId}?error=${encodeURIComponent(error.message)}`);
    throw error;
  }
  revalidatePath(`/weekly-reports/${reportId}`);
  revalidatePath("/portal", "layout");
  redirect(`/weekly-reports/${reportId}?flash=Reviewed+report+published`);
}

export async function createPriceScenario(formData: FormData) {
  await requireStaff();
  const actor = await requireStaff();
  const { savePriceSnapshot, PricingError } = await import("@/lib/price-snapshot");
  const company = await prisma.organization.findUnique({
    where: { id: actor.organizationId }, select: { ownerExceptionMarginPercent: true },
  });
  let id: string;
  try {
    const snapshot = await savePriceSnapshot(prisma, actor.id, String(formData.get("requestId") ?? ""), {
      ...Object.fromEntries(formData), ownerApproval: formData.get("ownerApproval") === "on",
    }, { ownerExceptionMarginPercent: company?.ownerExceptionMarginPercent });
    id = snapshot.id;
  } catch (error) {
    if (error instanceof PricingError) redirect(`/cost-intelligence/scenarios?error=${encodeURIComponent(error.message)}`);
    throw error;
  }
  revalidatePath("/cost-intelligence");
  revalidatePath("/cost-intelligence/scenarios");
  redirect(`/cost-intelligence/${id}`);
}

export async function createChangeOrder(formData: FormData) {
  await requireStaff();
  const actor = await requireStaff();
  const { saveChangeDraft } = await import("@/lib/change-order-ledger");
  const { FinancialRecordError } = await import("@/lib/finance-lock");
  let id: string;
  try { id = (await saveChangeDraft(prisma, actor.id, String(formData.get("requestId") || ""), null, "", { ...Object.fromEntries(formData), clientRequested: ["on", "true"].includes(String(formData.get("clientRequested"))) })).id; }
  catch (error) { if (error instanceof FinancialRecordError) redirect("/change-orders/new?error=" + encodeURIComponent(error.message)); throw error; }
  revalidatePath("/change-orders");
  redirect("/change-orders/" + id + "?flash=Change+draft+saved");
}

export async function updateChangeOrder(changeOrderId: string, formData: FormData) {
  await requireStaff();
  const actor = await requireStaff();
  const { saveChangeDraft } = await import("@/lib/change-order-ledger");
  const { FinancialRecordError } = await import("@/lib/finance-lock");
  try { await saveChangeDraft(prisma, actor.id, "", changeOrderId, String(formData.get("expectedUpdatedAt") || ""), { ...Object.fromEntries(formData), clientRequested: ["on", "true"].includes(String(formData.get("clientRequested"))) }); }
  catch (error) { if (error instanceof FinancialRecordError) redirect("/change-orders/" + changeOrderId + "/edit?error=" + encodeURIComponent(error.message)); throw error; }
  revalidatePath("/change-orders", "layout");
  redirect("/change-orders/" + changeOrderId + "?flash=Draft+saved+and+old+pending+links+revoked");
}

export async function createInvoice(formData: FormData) {
  await requireStaff();
  const actor = await requireStaff();
  const { saveInvoiceWithLedger, PaymentLedgerError } = await import("@/lib/payment-ledger");
  try { await saveInvoiceWithLedger(prisma, actor.id, null, "", Object.fromEntries(formData)); }
  catch (error) { if (error instanceof PaymentLedgerError) redirect("/invoices/new?error=" + encodeURIComponent(error.message)); throw error; }
  revalidatePath("/invoices");
  redirect("/invoices?flash=Invoice+created");
}

export async function updateInvoice(invoiceId: string, formData: FormData) {
  await requireStaff();
  const actor = await requireStaff();
  const { saveInvoiceWithLedger, PaymentLedgerError } = await import("@/lib/payment-ledger");
  try { await saveInvoiceWithLedger(prisma, actor.id, invoiceId, String(formData.get("expectedUpdatedAt") || ""), Object.fromEntries(formData)); }
  catch (error) { if (error instanceof PaymentLedgerError) redirect("/invoices/" + invoiceId + "/edit?error=" + encodeURIComponent(error.message)); throw error; }
  revalidatePath("/invoices");
  revalidatePath("/payments/reconciliation");
  revalidatePath("/invoices/" + invoiceId);
  redirect("/invoices/" + invoiceId + "?flash=Changes+saved");
}

export async function createPayment(formData: FormData) {
  await requireStaff();
  const actor = await requireStaff();
  const { recordPayment, PaymentLedgerError } = await import("@/lib/payment-ledger");
  let id: string;
  try { id = (await recordPayment(prisma, actor.id, String(formData.get("requestId") || ""), null, "", Object.fromEntries(formData))).id; }
  catch (error) { if (error instanceof PaymentLedgerError) redirect("/payments/new?error=" + encodeURIComponent(error.message)); throw error; }
  revalidatePath("/payments");
  revalidatePath("/payments/reconciliation");
  revalidatePath("/invoices", "layout");
  redirect("/payments/" + id + "?flash=Payment+recorded");
}

export async function updatePayment(paymentId: string, formData: FormData) {
  await requireStaff();
  const actor = await requireStaff();
  const { recordPayment, PaymentLedgerError } = await import("@/lib/payment-ledger");
  try { await recordPayment(prisma, actor.id, String(formData.get("requestId") || ""), paymentId, String(formData.get("expectedUpdatedAt") || ""), Object.fromEntries(formData)); }
  catch (error) { if (error instanceof PaymentLedgerError) redirect("/payments/" + paymentId + "/edit?error=" + encodeURIComponent(error.message)); throw error; }
  revalidatePath("/payments");
  revalidatePath("/payments/reconciliation");
  revalidatePath("/payments/" + paymentId);
  revalidatePath("/invoices", "layout");
  redirect("/payments/" + paymentId + "?flash=Changes+saved");
}

export async function createFinancing(formData: FormData) {
  await requireStaff();
  const parsed = financingSchema.parse(nullable(data(formData)));
  await prisma.financing.create({
    data: { ...parsed, status: parsed.status as Prisma.FinancingCreateInput["status"] }
  });
  revalidatePath("/financing");
  redirect("/financing");
}

export async function updateFinancing(financingId: string, formData: FormData) {
  await requireStaff();
  const parsed = financingSchema.parse(nullable(data(formData)));
  await prisma.financing.update({
    where: { id: financingId },
    data: { ...parsed, status: parsed.status as Prisma.FinancingUpdateInput["status"] }
  });
  revalidatePath("/financing");
  revalidatePath(`/financing/${financingId}`);
  redirect(`/financing/${financingId}?flash=Changes+saved`);
}

export async function updateSettings(formData: FormData) {
  const actor = await requireStaff();
  let parsed: ReturnType<typeof settingsSchema.parse>;
  try { parsed = settingsSchema.parse(nullable(data(formData))); } catch (e) { zodCatch(e, "/settings"); }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await prisma.organization.update({ where: { id: actor.organizationId }, data: parsed as any });
  revalidatePath("/settings");
  redirect("/settings?flash=Settings+saved");
}

export async function updateSettingsTerms(formData: FormData) {
  const actor = await requireStaff();
  let parsed: ReturnType<typeof settingsTermsSchema.parse>;
  try { parsed = settingsTermsSchema.parse(nullable(data(formData))); } catch (e) { zodCatch(e, "/settings"); }
  await prisma.organization.update({ where: { id: actor.organizationId }, data: parsed });
  revalidatePath("/settings");
  redirect("/settings?flash=Terms+saved");
}

/** Company operations defaults. Target margin and the owner exception threshold are enforced in pricing. */
export async function updateCompanySettings(formData: FormData) {
  const actor = await requireStaff();
  let parsed: ReturnType<typeof companySettingsSchema.parse>;
  try { parsed = companySettingsSchema.parse(nullable(data(formData))); } catch (e) { zodCatch(e, "/settings"); }
  await prisma.organization.update({
    where: { id: actor.organizationId },
    data: {
      defaultTargetMarginPercent: parsed.defaultTargetMarginPercent,
      ownerExceptionMarginPercent: parsed.ownerExceptionMarginPercent,
      changeOrderApprovalThresholdCents: parsed.changeOrderApprovalThreshold === undefined ? null : Math.round(parsed.changeOrderApprovalThreshold * 100),
      invoiceApprovalThresholdCents: parsed.invoiceApprovalThreshold === undefined ? null : Math.round(parsed.invoiceApprovalThreshold * 100),
      notificationCadence: parsed.notificationCadence,
    },
  });
  revalidatePath("/settings");
  revalidatePath("/cost-intelligence");
  revalidatePath("/cost-intelligence/scenarios");
  redirect("/settings?flash=Company+operations+saved");
}

export async function createPaymentLink(invoiceId: string) {
  await requireStaff();
  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId }, include: { clientProfile: true } });
  const link = await createStripePaymentLink({
    amount: Number(invoice.balanceDue || invoice.total),
    invoiceNumber: invoice.invoiceNumber,
    clientEmail: invoice.clientProfile?.email ?? undefined
  });
  await prisma.invoice.update({ where: { id: invoiceId }, data: { stripePaymentLink: link } });
  revalidatePath("/invoices");
  redirect("/invoices");
}

export async function saveEstimateOption(formData: FormData) {
  const actor = await requireStaff();
  const estimateId = String(formData.get("estimateId") || "");
  const optionId = String(formData.get("optionId") || "") || null;
  const optionTier = String(formData.get("optionTier") || "BETTER");
  const optionName = String(formData.get("optionName") || `${optionTier.charAt(0) + optionTier.slice(1).toLowerCase()} Package`);
  const description = String(formData.get("description") || "") || null;
  const total = Number(formData.get("total") || 0);
  const included = formData.get("included") === "true";

  await prisma.$transaction(async tx => {
    await assertCompanyRelations(tx, actor.organizationId, {
      estimates: [estimateId], estimateOptions: [optionId],
    });
    if (optionId) {
      const option = await tx.estimateOption.findUniqueOrThrow({ where: { id: optionId }, select: { estimateId: true } });
      if (option.estimateId !== estimateId) throw new CompanyRelationError();
      await tx.estimateOption.update({ where: { id: optionId }, data: { optionName, description, total, included } });
    } else {
      const sortOrder = optionTier === "GOOD" ? 1 : optionTier === "BETTER" ? 2 : 3;
      await tx.estimateOption.create({ data: { estimateId, optionTier, optionName, description, total, included, sortOrder } });
    }
  });
  revalidatePath(`/estimates/${estimateId}`);
  revalidatePath(`/estimates/${estimateId}/proposal`);
  redirect(`/estimates/${estimateId}/proposal`);
}

export async function deleteEstimateOption(formData: FormData) {
  const actor = await requireStaff();
  const optionId = String(formData.get("optionId") || "");
  const estimateId = String(formData.get("estimateId") || "");
  await prisma.$transaction(async tx => {
    await assertCompanyRelations(tx, actor.organizationId, { estimates: [estimateId], estimateOptions: [optionId] });
    const option = await tx.estimateOption.findUniqueOrThrow({ where: { id: optionId }, select: { estimateId: true } });
    if (option.estimateId !== estimateId) throw new CompanyRelationError();
    await tx.estimateOption.delete({ where: { id: optionId } });
  });
  revalidatePath(`/estimates/${estimateId}`);
  revalidatePath(`/estimates/${estimateId}/proposal`);
  redirect(`/estimates/${estimateId}/proposal`);
}

async function recalculateQuote(tx: Prisma.TransactionClient, organizationId: string, quoteId: string) {
  await assertCompanyRelations(tx, organizationId, { quotes: [quoteId] });
  const quote = await tx.quote.findUniqueOrThrow({ where: { id: quoteId }, include: { lineItems: true } });
  const totals = calculateQuoteTotals(
    quote.lineItems.map((item) => ({
      totalLow: Number(item.totalLow),
      totalTarget: Number(item.totalTarget),
      totalHigh: Number(item.totalHigh)
    })),
    Number(quote.gcMarkup),
    Number(quote.contingency),
    quote.finalQuoteAmount ? Number(quote.finalQuoteAmount) : null
  );
  await tx.quote.update({
    where: { id: quoteId },
    data: {
      totalLow: totals.totalLow,
      totalTarget: totals.totalTarget,
      totalHigh: totals.totalHigh,
      finalQuoteAmount: quote.finalQuoteAmount ?? totals.finalQuoteAmount
    }
  });
}

export async function createBudgetLine(formData: FormData) {
  await requireStaff();
  const parsed = budgetLineSchema.parse(nullable(data(formData)));
  await prisma.budgetLine.create({
    data: {
      jobId: parsed.jobId,
      lineType: parsed.lineType as Prisma.BudgetLineCreateInput["lineType"],
      category: parsed.category,
      description: parsed.description,
      estimatedAmount: parsed.estimatedAmount,
      committedAmount: parsed.committedAmount ?? 0,
      actualAmount: parsed.actualAmount ?? 0,
      forecastAmount: parsed.estimatedAmount,
      varianceAmount: 0,
      notes: parsed.notes
    }
  });
  revalidatePath(`/jobs/${parsed.jobId}/budget`);
  redirect(`/jobs/${parsed.jobId}/budget`);
}

export async function logActualCost(formData: FormData) {
  await requireStaff();
  const parsed = actualCostSchema.parse(nullable(data(formData)));
  const cost = await prisma.actualCost.create({
    data: {
      organizationId: DEFAULT_ORG_ID,
      jobId: parsed.jobId,
      costType: parsed.costType,
      description: parsed.description,
      estimatedAmount: parsed.estimatedAmount ?? null,
      actualAmount: parsed.actualAmount,
      varianceAmount: parsed.estimatedAmount != null ? parsed.estimatedAmount - parsed.actualAmount : null,
      notes: parsed.notes
    }
  });
  revalidatePath(`/jobs/${cost.jobId}/budget`);
  redirect(`/jobs/${cost.jobId}/budget`);
}

export async function createFieldReport(formData: FormData) {
  const actor = await requireStaff();
  const { inspectContent, MediaError } = await import("@/lib/private-media");
  const { storeFile } = await import("@/lib/storage");

  const jobId = String(formData.get("jobId") || "");
  await prisma.$transaction(tx => assertCompanyRelations(tx, actor.organizationId, { jobs: [jobId] }));
  const crewSummary = String(formData.get("crewSummary") || "");
  const workCompleted = String(formData.get("workCompleted") || "");
  const blockers = String(formData.get("blockers") || "") || null;
  const materialsUsed = String(formData.get("materialsUsed") || "") || null;
  const equipmentUsed = String(formData.get("equipmentUsed") || "") || null;
  const weatherNotes = String(formData.get("weatherNotes") || "") || null;
  const clientVisible = formData.get("clientVisible") === "true";
  const reportDateRaw = String(formData.get("reportDate") || "");
  const reportDate = reportDateRaw ? new Date(reportDateRaw) : new Date();
  if (!crewSummary.trim() || !workCompleted.trim() || Number.isNaN(reportDate.getTime())) {
    throw new MediaError("Crew, completed work and a valid report date are required.");
  }

  // Project photos stay private and durable; public sharing requires a separate publication flow.
  const photoFiles = formData.getAll("photos") as File[];
  const retainedPhotos = photoFiles.filter(file => file instanceof File && file.size > 0);
  for (const file of retainedPhotos) {
    if (!file.type.startsWith("image/")) throw new MediaError("Field report photos must be JPG, PNG or WebP images.");
    inspectContent(Buffer.from(await file.arrayBuffer()), file.type);
  }
  const photoUrls: string[] = [];
  // FileAsset and private-volume writes have their own integrity transaction. A later report
  // write failure can leave an unreferenced private asset for an operator to remove safely.
  for (const file of retainedPhotos) {
    const asset = await storeFile({ entityType: "JOB", entityId: jobId, file, notes: "Field report photo" });
    photoUrls.push(asset.url);
  }

  const report = await prisma.$transaction(async tx => {
    await assertCompanyRelations(tx, actor.organizationId, { jobs: [jobId] });
    return tx.fieldReport.create({
      data: { jobId, crewSummary, workCompleted, blockers, materialsUsed, equipmentUsed, weatherNotes, clientVisible, reportDate, photos: photoUrls }
    });
  });

  revalidatePath(`/jobs/${jobId}/logs`);
  revalidatePath(`/jobs/${jobId}`);
  redirect(`/jobs/${jobId}/logs/${report.id}`);
}

export async function deleteFieldReport(formData: FormData) {
  const actor = await requireStaff();
  const reportId = String(formData.get("reportId") || "");
  const { assertDeliveryRelations } = await import("@/lib/delivery-relations");
  const report = await prisma.$transaction(async tx => {
    await assertDeliveryRelations(tx, actor.organizationId, { fieldReports: [reportId] });
    const owned = await tx.fieldReport.findUniqueOrThrow({ where: { id: reportId }, select: { jobId: true } });
    await tx.fieldReport.delete({ where: { id: reportId } });
    return owned;
  });
  revalidatePath(`/jobs/${report.jobId}/logs`);
  revalidatePath(`/jobs/${report.jobId}`);
  redirect(`/jobs/${report.jobId}/logs`);
}

export async function createProfileRelationship(formData: FormData) {
  const actor = await requireStaff();
  const fromProfileId = String(formData.get("fromProfileId") || "");
  const toProfileId = String(formData.get("toProfileId") || "");
  const relationshipType = String(formData.get("relationshipType") || "").trim();
  const notes = String(formData.get("notes") || "").trim() || null;
  if (!fromProfileId || !toProfileId || !relationshipType || fromProfileId === toProfileId) {
    redirect(`/profiles/${fromProfileId}`);
  }
  await prisma.$transaction(async tx => {
    await assertCompanyRelations(tx, actor.organizationId, { profiles: [fromProfileId, toProfileId] });
    await tx.profileRelationship.upsert({
      where: { fromProfileId_toProfileId_relationshipType: { fromProfileId, toProfileId, relationshipType } },
      create: { fromProfileId, toProfileId, relationshipType, notes, organizationId: actor.organizationId },
      update: { notes },
    });
  });
  revalidatePath(`/profiles/${fromProfileId}`);
  revalidatePath(`/profiles/${toProfileId}`);
  redirect(`/profiles/${fromProfileId}`);
}

export async function deleteProfileRelationship(formData: FormData) {
  const actor = await requireStaff();
  const id = String(formData.get("id") || "");
  const profileId = String(formData.get("profileId") || "");
  await prisma.$transaction(async tx => {
    await assertCompanyRelations(tx, actor.organizationId, { profiles: [profileId], profileRelationships: [id] });
    const relationship = await tx.profileRelationship.findUniqueOrThrow({ where: { id }, select: { fromProfileId: true, toProfileId: true } });
    if (relationship.fromProfileId !== profileId && relationship.toProfileId !== profileId) throw new CompanyRelationError();
    await tx.profileRelationship.delete({ where: { id } });
  });
  revalidatePath(`/profiles/${profileId}`);
  redirect(`/profiles/${profileId}`);
}

// ─── Phase 1 lifecycle actions ────────────────────────────────────────────────

export async function reseedJobPhases(jobId: string) {
  const actor = await requireStaff();
  const blocked = await prisma.$transaction(async tx => {
    await assertCompanyRelations(tx, actor.organizationId, { jobs: [jobId] });
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${actor.organizationId + ":delivery-job:" + jobId}, 0))::text`;
    if (await tx.workPackage.count({ where: { scopeItem: { jobId } } })) return true;
    await tx.renovationPhase.deleteMany({ where: { jobId } });
    await tx.renovationPhase.createMany({
      data: renovationPhaseDetails.map(([phaseName, description], index) => ({
        jobId,
        phaseNumber: index + 1,
        phaseName,
        clientUpdate: description,
        completionCriteria: `Phase ${index + 1} is complete when ${phaseName.toLowerCase()} work is verified, required proof is attached, blockers are resolved, and client-facing status is ready.`,
      })),
    });
    return false;
  });
  if (blocked) redirect(`/jobs/${jobId}?error=Retained+work+packages+prevent+phase+reset`);
  revalidatePath(`/jobs/${jobId}`);
  redirect(`/jobs/${jobId}?flash=Phases+reset+to+canonical+order`);
}

export async function scheduleFollowUps(jobId: string) {
  const actor = await requireStaff();
  const now = new Date();
  const add = (days: number) => new Date(now.getTime() + days * 86_400_000);
  await prisma.$transaction(async tx => {
    await assertCompanyRelations(tx, actor.organizationId, { jobs: [jobId] });
    const job = await tx.job.findUniqueOrThrow({ where: { id: jobId }, select: { clientProfileId: true, jobName: true } });
    await assertCompanyRelations(tx, actor.organizationId, { profiles: [job.clientProfileId] });
    await tx.activity.createMany({ data: [
      { relatedJobId: jobId, relatedProfileId: job.clientProfileId, activityType: "FOLLOW_UP", subject: `30-day follow-up - ${job.jobName}`, body: "Check in with client 30 days after closeout. Ask about warranty items, satisfaction, and referrals.", dueDate: add(30) },
      { relatedJobId: jobId, relatedProfileId: job.clientProfileId, activityType: "FOLLOW_UP", subject: `90-day follow-up - ${job.jobName}`, body: "90-day check-in. Confirm everything is holding well. Ask if they know anyone planning a renovation.", dueDate: add(90) },
      { relatedJobId: jobId, relatedProfileId: job.clientProfileId, activityType: "FOLLOW_UP", subject: `Annual check-in - ${job.jobName}`, body: "Annual touch-base. Mention seasonal maintenance, ask about any new projects, and request an updated referral.", dueDate: add(365) },
    ] });
  });
  revalidatePath(`/jobs/${jobId}`);
  redirect(`/jobs/${jobId}/closeout?flash=Follow-ups+scheduled`);
}

export async function createFeedbackRequest(formData: FormData) {
  await requireStaff();
  const jobId = String(formData.get("jobId") || "");
  const profileId = String(formData.get("profileId") || "") || null;
  const requestType = String(formData.get("requestType") || "TESTIMONIAL");
  await prisma.feedbackRequest.create({
    data: { jobId, profileId, requestType, status: "REQUESTED" },
  });
  revalidatePath(`/jobs/${jobId}/feedback`);
  redirect(`/jobs/${jobId}/feedback?flash=Request+created`);
}

export async function updateFeedbackStatus(formData: FormData) {
  await requireStaff();
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");
  const rating = formData.get("rating") ? Number(formData.get("rating")) : null;
  const feedback = formData.get("feedback") ? String(formData.get("feedback")) : null;
  const publicTestimonial = formData.get("publicTestimonial") ? String(formData.get("publicTestimonial")) : null;
  const record = await prisma.feedbackRequest.findUniqueOrThrow({ where: { id }, select: { jobId: true } });
  await prisma.feedbackRequest.update({
    where: { id },
    data: {
      status: status as Parameters<typeof prisma.feedbackRequest.update>[0]["data"]["status"],
      rating,
      feedback,
      publicTestimonial,
      receivedAt: ["RECEIVED", "PUBLISHED"].includes(status) ? new Date() : undefined,
    },
  });
  revalidatePath(`/jobs/${record.jobId}/feedback`);
  redirect(`/jobs/${record.jobId}/feedback?flash=Updated`);
}

export async function markJobDepositReceived(jobId: string) {
  await requireStaff();
  const actor = await requireStaff();
  const { confirmJobDeposit } = await import("@/lib/job-finance");
  const { FinancialRecordError } = await import("@/lib/finance-lock");
  try { await confirmJobDeposit(prisma, actor.id, jobId); }
  catch (error) { if (error instanceof FinancialRecordError) redirect("/jobs/" + jobId + "?error=" + encodeURIComponent(error.message)); throw error; }
  revalidatePath("/jobs/" + jobId);
  redirect("/jobs/" + jobId + "?flash=Deposit+receipts+verified");
}

// ─── Phase 6A: Transactional email ───────────────────────────────────────────

export async function sendWeeklyReportEmail(reportId: string) {
  const actor = await requireStaff();
  const { weeklyReportInOrganization } = await import("@/lib/company-scope");
  const { sendEmail } = await import("@/lib/email-sender");
  const { dateShort } = await import("@/lib/format");

  const report = await prisma.weeklyReport.findFirstOrThrow({
    where: weeklyReportInOrganization(actor.organizationId, { id: reportId }),
    include: { job: { include: { clientProfile: true, organization: true } }, publications: { orderBy: { revision: "desc" }, take: 1 } },
  });

  if (report.job.organizationId !== actor.organizationId) throw new Error("Report not found.");
  const publication = report.publications[0];
  if (!publication) throw new Error("Review and publish this report before sending it.");

  const client = report.job.clientProfile;
  if (!client?.email) {
    revalidatePath(`/weekly-reports/${reportId}`);
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://renotrack360.com";
  const subject = `Weekly update - ${report.job.jobName} - week ending ${dateShort(publication.weekEnding)}`;
  const portalLink = report.job.portalToken ? `\n\nYour project portal: ${appUrl}/portal/${report.job.portalToken}` : "";
  const body = `Hi ${client.profileName},\n\nHere is your project update for the week ending ${dateShort(publication.weekEnding)}.\n\n${publication.clientSummary ?? publication.workCompleted}${publication.decisionsNeeded ? `\n\nDecisions needed:\n${publication.decisionsNeeded}` : ""}${publication.nextWeekPlan ? `\n\nNext week:\n${publication.nextWeekPlan}` : ""}${portalLink}\n\nBest regards\n${report.job.organization.name}`;

  const smtpOrg = await prisma.organization.findUnique({ where: { id: actor.organizationId }, select: { smtpFromName: true, smtpFromEmail: true, smtpPassword: true } });
  const smtpConfig = smtpOrg?.smtpFromEmail && smtpOrg?.smtpPassword ? { fromName: smtpOrg.smtpFromName ?? smtpOrg.smtpFromEmail, fromEmail: smtpOrg.smtpFromEmail, password: smtpOrg.smtpPassword } : null;
  const result = await sendEmail({ to: client.email, subject, text: body }, smtpConfig);

  if (result.sent) {
    await prisma.weeklyReport.update({ where: { id: reportId }, data: { sentAt: new Date() } });
    revalidatePath(`/weekly-reports/${reportId}`);
  } else if (result.mailtoFallback) {
    // No API key - redirect to mailto so the user can send manually
    redirect(result.mailtoFallback);
  }
}

export async function sendInvoiceEmail(invoiceId: string) {
  await requireStaff();
  const { sendEmail } = await import("@/lib/email-sender");
  const { money, dateShort } = await import("@/lib/format");

  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { clientProfile: true, job: { include: { organization: true } } },
  });

  const client = invoice.clientProfile;
  if (!client?.email) {
    revalidatePath(`/invoices/${invoiceId}`);
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://renotrack360.com";
  const subject = `Invoice ${invoice.invoiceNumber} - ${money(invoice.total)} due`;
  const dueText = invoice.dueDate ? ` due ${dateShort(invoice.dueDate)}` : "";
  const payText = invoice.stripePaymentLink ? `\n\nPay online: ${invoice.stripePaymentLink}` : "";
  const body = `Hi ${client.profileName},\n\nPlease find your invoice attached.\n\nInvoice: ${invoice.invoiceNumber}\nAmount: ${money(invoice.total)}${dueText}\nBalance due: ${money(invoice.balanceDue)}${payText}\n\nDownload PDF: ${appUrl}/api/pdf/invoice/${invoiceId}\n\nBest regards\n${invoice.job?.organization.name ?? "Your contractor"}`;

  const smtpOrg = await prisma.organization.findUnique({ where: { id: DEFAULT_ORG_ID }, select: { smtpFromName: true, smtpFromEmail: true, smtpPassword: true } });
  const smtpConfig = smtpOrg?.smtpFromEmail && smtpOrg?.smtpPassword ? { fromName: smtpOrg.smtpFromName ?? smtpOrg.smtpFromEmail, fromEmail: smtpOrg.smtpFromEmail, password: smtpOrg.smtpPassword } : null;
  const result = await sendEmail({ to: client.email, subject, text: body }, smtpConfig);

  if (result.sent) {
    await prisma.invoice.update({ where: { id: invoiceId }, data: { status: "SENT" } });
    revalidatePath(`/invoices/${invoiceId}`);
  } else if (result.mailtoFallback) {
    redirect(result.mailtoFallback);
  }
}

export async function sendChangeOrderApprovalEmail(changeOrderId: string) {
  await requireStaff();
  const { sendEmail } = await import("@/lib/email-sender");
  const { money } = await import("@/lib/format");

  const [co, approval] = await Promise.all([
    prisma.changeOrder.findUniqueOrThrow({
      where: { id: changeOrderId },
      include: {
        clientProfile: true,
        job: { include: { organization: true } },
      },
    }),
    prisma.clientApproval.findFirst({
      where: { changeOrderId, token: { not: null } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const client = co.clientProfile;
  if (!client?.email) {
    revalidatePath(`/change-orders/${changeOrderId}`);
    return;
  }

  const { readChangeApproval, changeOrderDigest } = await import("@/lib/change-order-ledger");
  if (!approval?.token || co.job.organizationId !== DEFAULT_ORG_ID || client.organizationId !== DEFAULT_ORG_ID) redirect("/change-orders/" + changeOrderId + "?error=Issue+a+reviewed+approval+link+first");
  let reviewed;
  try { reviewed = await readChangeApproval(prisma, approval.token); }
  catch { redirect("/change-orders/" + changeOrderId + "?error=Issue+a+current+reviewed+approval+link"); }
  if (!["SENT", "VIEWED"].includes(reviewed.approval.status) || reviewed.snapshot.contentDigest !== changeOrderDigest(co)) redirect("/change-orders/" + changeOrderId + "?error=Approval+request+is+not+current");
  const content = reviewed.content;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.renotrack360.com";
  const subject = "Change order approval needed - " + content.changeOrderTitle;
  const body = "Hi " + client.profileName + ",\n\nPlease review this change for " + content.jobName + ".\n\n" + content.changeOrderTitle + "\n" + content.reason + "\nContract price change: " + money(content.addedCost) + "\nAdded time: " + content.addedTime + " days\n" + content.scheduleNote + "\n\nApprove or decline the retained version: " + appUrl + "/approve/" + approval.token;

  const smtpOrg = await prisma.organization.findUnique({ where: { id: DEFAULT_ORG_ID }, select: { smtpFromName: true, smtpFromEmail: true, smtpPassword: true } });
  const smtpConfig = smtpOrg?.smtpFromEmail && smtpOrg?.smtpPassword ? { fromName: smtpOrg.smtpFromName ?? smtpOrg.smtpFromEmail, fromEmail: smtpOrg.smtpFromEmail, password: smtpOrg.smtpPassword } : null;
  const result = await sendEmail({ to: client.email, subject, text: body }, smtpConfig);
  if (!result.sent && result.mailtoFallback) {
    redirect(result.mailtoFallback);
  } else {
    revalidatePath(`/change-orders/${changeOrderId}`);
  }
}

export async function sendReviewRequestEmail(feedbackRequestId: string) {
  await requireStaff();
  const { sendEmail } = await import("@/lib/email-sender");

  const req = await prisma.feedbackRequest.findUniqueOrThrow({
    where: { id: feedbackRequestId },
    include: { job: { include: { clientProfile: true, organization: true } }, profile: true },
  });

  const client = req.profile ?? req.job?.clientProfile;
  if (!client?.email) {
    revalidatePath(`/jobs/${req.jobId}/feedback`);
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://renotrack360.com";
  const reviewLink = req.token ? `\n\nLeave your feedback here: ${appUrl}/review/${req.token}` : "";
  const org = req.job?.organization;
  const subject = `How did we do? - ${req.job?.jobName ?? "Your project"}`;
  const body = `Hi ${client.profileName?.split(" ")[0] ?? "there"},\n\nThank you for trusting us with your project. We'd love to hear how everything went.${reviewLink}${org?.reviewLink ? `\n\nIf you're happy with the work, a quick Google review means the world: ${org.reviewLink}` : ""}\n\nBest regards\n${org?.name ?? "Your contractor"}`;

  const smtpOrg = await prisma.organization.findUnique({ where: { id: DEFAULT_ORG_ID }, select: { smtpFromName: true, smtpFromEmail: true, smtpPassword: true } });
  const smtpConfig = smtpOrg?.smtpFromEmail && smtpOrg?.smtpPassword ? { fromName: smtpOrg.smtpFromName ?? smtpOrg.smtpFromEmail, fromEmail: smtpOrg.smtpFromEmail, password: smtpOrg.smtpPassword } : null;
  const result = await sendEmail({ to: client.email, subject, text: body }, smtpConfig);

  if (result.sent) {
    revalidatePath(`/jobs/${req.jobId}/feedback`);
  } else if (result.mailtoFallback) {
    redirect(result.mailtoFallback);
  }
}

// ─── Phase 6B: CSV import ─────────────────────────────────────────────────────

export async function processLeadImport(formData: FormData) {
  await requireStaff();
  const rawCsv = String(formData.get("csvData") || "");
  const colName = Number(formData.get("col_name") ?? 0);
  const colType = Number(formData.get("col_type") ?? -1);
  const colSource = Number(formData.get("col_source") ?? -1);
  const colBudget = Number(formData.get("col_budget") ?? -1);
  const colNotes = Number(formData.get("col_notes") ?? -1);
  const lines = rawCsv.trim().split("\n").slice(1);

  const importRecord = await prisma.importJob.create({
    data: { organizationId: DEFAULT_ORG_ID, importType: "LEADS", totalRows: lines.length, status: ImportStatus.UPLOADED },
  });

  let imported = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const line of lines) {
    const cols = parseCsvLine(line);
    const leadName = cols[colName]?.trim();
    if (!leadName) { failed++; continue; }
    try {
      await prisma.lead.create({
        data: {
          organizationId: DEFAULT_ORG_ID,
          leadName,
          leadType: colType >= 0 ? cols[colType]?.trim() || null : null,
          source: colSource >= 0 ? cols[colSource]?.trim() || null : null,
          estimatedBudget: colBudget >= 0 ? parseFloat(cols[colBudget]?.replace(/[^0-9.]/g, "") || "0") || null : null,
          notes: colNotes >= 0 ? cols[colNotes]?.trim() || null : null,
        },
      });
      imported++;
    } catch { failed++; errors.push(`Row: ${leadName}`); }
  }

  await prisma.importJob.update({
    where: { id: importRecord.id },
    data: { status: "IMPORTED", importedRows: imported, failedRows: failed, errorSummary: errors.slice(0, 10).join("\n") || null },
  });

  revalidatePath("/leads");
  revalidatePath("/imports");
  redirect(`/imports?flash=${imported}+leads+imported`);
}

export async function processContactImport(formData: FormData) {
  await requireStaff();
  const rawCsv = String(formData.get("csvData") || "");
  const colName = Number(formData.get("col_name") ?? 0);
  const colEmail = Number(formData.get("col_email") ?? -1);
  const colPhone = Number(formData.get("col_phone") ?? -1);
  const colCompany = Number(formData.get("col_company") ?? -1);
  const colNotes = Number(formData.get("col_notes") ?? -1);
  const lines = rawCsv.trim().split("\n").slice(1);

  const importRecord = await prisma.importJob.create({
    data: { organizationId: DEFAULT_ORG_ID, importType: "CONTACTS", totalRows: lines.length, status: ImportStatus.UPLOADED },
  });

  let imported = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const line of lines) {
    const cols = parseCsvLine(line);
    const profileName = cols[colName]?.trim();
    if (!profileName) { failed++; continue; }
    try {
      await prisma.profile.create({
        data: {
          organizationId: DEFAULT_ORG_ID,
          profileName,
          profileType: "OTHER",
          email: colEmail >= 0 ? cols[colEmail]?.trim() || null : null,
          phone: colPhone >= 0 ? cols[colPhone]?.trim() || null : null,
          companyName: colCompany >= 0 ? cols[colCompany]?.trim() || null : null,
          notes: colNotes >= 0 ? cols[colNotes]?.trim() || null : null,
        },
      });
      imported++;
    } catch { failed++; errors.push(`Row: ${profileName}`); }
  }

  await prisma.importJob.update({
    where: { id: importRecord.id },
    data: { status: "IMPORTED", importedRows: imported, failedRows: failed, errorSummary: errors.slice(0, 10).join("\n") || null },
  });

  revalidatePath("/profiles");
  revalidatePath("/imports");
  redirect(`/imports?flash=${imported}+contacts+imported`);
}

export async function processJobImport(formData: FormData) {
  await requireStaff();
  const rawCsv = String(formData.get("csvData") || "");
  const colName = Number(formData.get("col_name") ?? 0);
  const colAmount = Number(formData.get("col_contractAmount") ?? -1);
  const colStatus = Number(formData.get("col_status") ?? -1);
  const colNotes = Number(formData.get("col_notes") ?? -1);
  const lines = rawCsv.trim().split("\n").slice(1);

  const importRecord = await prisma.importJob.create({
    data: { organizationId: DEFAULT_ORG_ID, importType: "JOBS", totalRows: lines.length, status: ImportStatus.UPLOADED },
  });

  let imported = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const line of lines) {
    const cols = parseCsvLine(line);
    const jobName = cols[colName]?.trim();
    if (!jobName) { failed++; continue; }
    try {
      const rawStatus = colStatus >= 0 ? cols[colStatus]?.trim().toUpperCase() : null;
      const validStatuses: string[] = Object.values(JobStatus);
      const jobStatus: JobStatus = rawStatus && validStatuses.includes(rawStatus) ? rawStatus as JobStatus : JobStatus.PRE_CONSTRUCTION;
      await prisma.job.create({
        data: {
          organizationId: DEFAULT_ORG_ID,
          jobName,
          contractAmount: colAmount >= 0 ? parseFloat(cols[colAmount]?.replace(/[^0-9.]/g, "") || "0") || 0 : 0,
          jobStatus,
          notes: colNotes >= 0 ? cols[colNotes]?.trim() || null : null,
        },
      });
      imported++;
    } catch { failed++; errors.push(`Row: ${jobName}`); }
  }

  await prisma.importJob.update({
    where: { id: importRecord.id },
    data: { status: "IMPORTED", importedRows: imported, failedRows: failed, errorSummary: errors.slice(0, 10).join("\n") || null },
  });

  revalidatePath("/jobs");
  revalidatePath("/imports");
  redirect(`/imports?flash=${imported}+jobs+imported`);
}

export async function processCostCatalogImport(formData: FormData) {
  await requireStaff();
  const rawCsv = String(formData.get("csvData") || "");
  const colCategory = Number(formData.get("col_category") ?? 0);
  const colName = Number(formData.get("col_serviceName") ?? 1);
  const colUnit = Number(formData.get("col_unitType") ?? -1);
  const colTarget = Number(formData.get("col_targetCost") ?? -1);
  const colLow = Number(formData.get("col_lowCost") ?? -1);
  const colHigh = Number(formData.get("col_highCost") ?? -1);
  const lines = rawCsv.trim().split("\n").slice(1);

  const importRecord = await prisma.importJob.create({
    data: { organizationId: DEFAULT_ORG_ID, importType: "COST_CATALOG", totalRows: lines.length, status: ImportStatus.UPLOADED },
  });

  let imported = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const line of lines) {
    const cols = parseCsvLine(line);
    const category = cols[colCategory]?.trim();
    const serviceName = cols[colName]?.trim();
    if (!category || !serviceName) { failed++; continue; }
    try {
      const targetCost = colTarget >= 0 ? parseFloat(cols[colTarget]?.replace(/[^0-9.]/g, "") || "0") || 0 : 0;
      const lowCost = colLow >= 0 ? parseFloat(cols[colLow]?.replace(/[^0-9.]/g, "") || "0") || targetCost * 0.85 : targetCost * 0.85;
      const highCost = colHigh >= 0 ? parseFloat(cols[colHigh]?.replace(/[^0-9.]/g, "") || "0") || targetCost * 1.15 : targetCost * 1.15;
      await prisma.costCatalogItem.create({
        data: {
          organizationId: DEFAULT_ORG_ID,
          category,
          serviceName,
          unitType: colUnit >= 0 ? cols[colUnit]?.trim() || "EA" : "EA",
          flipsideTargetCost: targetCost,
          flipsideLowCost: lowCost,
          flipsideHighCost: highCost,
        },
      });
      imported++;
    } catch { failed++; errors.push(`Row: ${serviceName}`); }
  }

  await prisma.importJob.update({
    where: { id: importRecord.id },
    data: { status: "IMPORTED", importedRows: imported, failedRows: failed, errorSummary: errors.slice(0, 10).join("\n") || null },
  });

  revalidatePath("/cost-catalog");
  revalidatePath("/imports");
  redirect(`/imports?flash=${imported}+catalog+items+imported`);
}

function parseCsvLine(line: string): string[] {
  const cols: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === "," && !inQuotes) {
      cols.push(cur); cur = "";
    } else {
      cur += ch;
    }
  }
  cols.push(cur);
  return cols;
}

// ─── Phase 6C: UI mode toggle ─────────────────────────────────────────────────

export async function toggleUiMode(formData: FormData) {
  await requireStaff();
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return;
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true, uiMode: true } });
  if (!user) return;
  await prisma.user.update({ where: { id: user.id }, data: { uiMode: user.uiMode === "SIMPLE" ? "POWER" : "SIMPLE" } });
  revalidatePath("/home");
  revalidatePath("/");
}

// ─── Phase 5: Before/after proof engine ──────────────────────────────────────

export async function importPhotosFromLogs(jobId: string) {
  const actor = await requireStaff();
  const rows = await prisma.$transaction(async tx => {
    await assertCompanyRelations(tx, actor.organizationId, { jobs: [jobId] });
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${actor.organizationId + ":delivery-job:" + jobId}, 0))::text`;
    const [fieldReports, weeklyReports, changeOrders, existing] = await Promise.all([
      tx.fieldReport.findMany({ where: { jobId }, select: { id: true, photos: true, reportDate: true } }),
      tx.weeklyReport.findMany({ where: { jobId }, select: { id: true, photos: true, weekEnding: true } }),
      tx.changeOrder.findMany({ where: { jobId }, select: { id: true, photos: true, createdAt: true } }),
      tx.jobPhoto.findMany({ where: { jobId }, select: { url: true } }),
    ]);
    const existingUrls = new Set(existing.map((p) => p.url));
    type JobPhotoRow = { jobId: string; url: string; label: string; sourceType: string; sourceId: string; takenAt: Date };
    const imported: JobPhotoRow[] = [];
    for (const report of fieldReports) {
      for (const url of report.photos) {
        if (!existingUrls.has(url)) {
          imported.push({ jobId, url, label: "DURING", sourceType: "field_report", sourceId: report.id, takenAt: report.reportDate });
          existingUrls.add(url);
        }
      }
    }
    for (const report of weeklyReports) {
      for (const url of report.photos) {
        if (!existingUrls.has(url)) {
          imported.push({ jobId, url, label: "DURING", sourceType: "weekly_report", sourceId: report.id, takenAt: report.weekEnding });
          existingUrls.add(url);
        }
      }
    }
    for (const co of changeOrders) {
      for (const url of co.photos) {
        if (!existingUrls.has(url)) {
          imported.push({ jobId, url, label: "DURING", sourceType: "change_order", sourceId: co.id, takenAt: co.createdAt });
          existingUrls.add(url);
        }
      }
    }
    if (imported.length) await tx.jobPhoto.createMany({ data: imported });
    return imported;
  });
  revalidatePath(`/jobs/${jobId}/gallery`);
  redirect(`/jobs/${jobId}/gallery?flash=${rows.length}+photos+imported`);
}

export async function deleteJobPhoto(formData: FormData) {
  const actor = await requireStaff();
  const id = String(formData.get("id") || "");
  const { assertDeliveryRelations } = await import("@/lib/delivery-relations");
  const photo = await prisma.$transaction(async tx => {
    await assertDeliveryRelations(tx, actor.organizationId, { jobPhotos: [id] });
    const owned = await tx.jobPhoto.findUniqueOrThrow({ where: { id }, select: { jobId: true } });
    await tx.jobPhoto.delete({ where: { id } });
    return owned;
  });
  revalidatePath(`/jobs/${photo.jobId}/gallery`);
}

export async function tagJobPhoto(formData: FormData) {
  const actor = await requireStaff();
  const id = String(formData.get("id") || "");
  const label = String(formData.get("label") || "DURING");
  const phase = String(formData.get("phase") || "") || null;
  const roomArea = String(formData.get("roomArea") || "") || null;
  const caption = String(formData.get("caption") || "") || null;
  const { assertDeliveryRelations } = await import("@/lib/delivery-relations");
  const photo = await prisma.$transaction(async tx => {
    await assertDeliveryRelations(tx, actor.organizationId, { jobPhotos: [id] });
    const owned = await tx.jobPhoto.findUniqueOrThrow({ where: { id }, select: { jobId: true } });
    await tx.jobPhoto.update({ where: { id }, data: { label, phase, roomArea, caption } });
    return owned;
  });
  revalidatePath(`/jobs/${photo.jobId}/gallery`);
}

export async function addJobPhoto(formData: FormData) {
  const actor = await requireStaff();
  const jobId = String(formData.get("jobId") || "");
  const url = String(formData.get("url") || "").trim();
  const label = String(formData.get("label") || "DURING");
  const phase = String(formData.get("phase") || "") || null;
  const roomArea = String(formData.get("roomArea") || "") || null;
  const caption = String(formData.get("caption") || "") || null;
  if (!url || !jobId) return;
  await prisma.$transaction(async tx => {
    await assertCompanyRelations(tx, actor.organizationId, { jobs: [jobId] });
    const privateAssetId = /^\/api\/files\/([^/?#]+)$/.exec(url)?.[1];
    await assertOwnedFileAsset(tx, actor.organizationId, privateAssetId);
    await tx.jobPhoto.create({ data: { jobId, url, label, phase, roomArea, caption } });
  });
  revalidatePath(`/jobs/${jobId}/gallery`);
}

export async function generateReviewToken(feedbackRequestId: string) {
  await requireStaff();
  const { randomBytes } = await import("crypto");
  const existing = await prisma.feedbackRequest.findUniqueOrThrow({ where: { id: feedbackRequestId }, select: { token: true, jobId: true } });
  if (existing.token) {
    revalidatePath(`/jobs/${existing.jobId}/feedback`);
    return;
  }
  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days
  await prisma.feedbackRequest.update({ where: { id: feedbackRequestId }, data: { token, expiresAt } });
  revalidatePath(`/jobs/${existing.jobId}/feedback`);
}

// ─── Phase 4: AI provider config ─────────────────────────────────────────────

export async function saveAiProviderConfig(formData: FormData) {
  const actor = await requireStaff();
  const { parseAiProviderSettings, credentialWriteData } = await import("@/lib/ai");
  const provider = String(formData.get("provider") || "");
  if (!Object.values(AiProvider).includes(provider as AiProvider)) redirect("/settings?error=Choose+a+supported+AI+provider");
  const providerEnum = provider as AiProvider;
  const existing = await prisma.aiProviderConfig.findUnique({
    where: { organizationId_provider: { organizationId: actor.organizationId, provider: providerEnum } },
  });
  let parsed: ReturnType<typeof parseAiProviderSettings>;
  let credential: ReturnType<typeof credentialWriteData>;
  try {
    parsed = parseAiProviderSettings(formData, {
      apiKeySecretRef: existing?.apiKeySecretRef ?? null,
      hasStoredCredential: Boolean(existing?.secretCiphertext),
    });
    credential = credentialWriteData(parsed.credential);
  } catch { redirect("/settings?error=Check+the+endpoint,+model,+retention+policy+and+budget.+Stored+company+keys+need+an+operator+encryption+key"); }
  const { credential: submittedCredential, ...settings } = parsed;
  void submittedCredential;
  await prisma.$transaction(async (tx) => {
    if (parsed.enabled) await tx.aiProviderConfig.updateMany({ where: { organizationId: actor.organizationId }, data: { enabled: false } });
    const data = { ...settings, displayName: provider, ...(credential ?? {}) };
    await tx.aiProviderConfig.upsert({
      where: { organizationId_provider: { organizationId: actor.organizationId, provider: providerEnum } },
      update: data,
      create: { ...data, organizationId: actor.organizationId },
    });
  });

  revalidatePath("/settings");
  revalidatePath("/ai-team");
}

/** Per-agent provider, model and thinking binding. Personality, memory and authority are unaffected. */
export async function saveAiAgentBinding(agentId: string, formData: FormData) {
  const actor = await requireStaff();
  const { parseAgentBindingSettings } = await import("@/lib/ai");
  let parsed: ReturnType<typeof parseAgentBindingSettings>;
  try { parsed = parseAgentBindingSettings(formData); }
  catch { redirect("/ai-team?error=Check+the+provider+connection,+model+and+thinking+mode"); }
  await prisma.$transaction(async (tx) => {
    const agent = await tx.aiAgent.findFirst({ where: { id: agentId, organizationId: actor.organizationId }, select: { id: true } });
    if (!agent) redirect("/ai-team?error=That+agent+is+not+available+to+this+company");
    if (parsed.providerConfigId) {
      const connection = await tx.aiProviderConfig.findFirst({
        where: { id: parsed.providerConfigId, organizationId: actor.organizationId },
        select: { id: true },
      });
      if (!connection) redirect("/ai-team?error=Choose+a+provider+connection+from+this+company");
    }
    await tx.aiAgent.update({
      where: { id: agent.id },
      data: {
        providerConfigId: parsed.providerConfigId,
        model: parsed.model,
        thinkingMode: parsed.thinkingMode,
        configVersion: { increment: 1 },
      },
    });
  });
  revalidatePath("/ai-team");
}

/** Bounded read-only reachability check for a company connection; records the sanitized outcome. */
export async function checkAiProviderConnection(providerId: string) {
  const actor = await requireStaff();
  const { probeProviderConnection, resolveProviderBaseUrl, resolveProviderCredential } = await import("@/lib/ai");
  const connection = await prisma.aiProviderConfig.findFirst({
    where: { id: providerId, organizationId: actor.organizationId },
  });
  if (!connection) redirect("/settings?error=That+provider+connection+is+not+available+to+this+company");
  let result: { status: "ok" | "error"; message: string };
  try {
    const credential = resolveProviderCredential(connection);
    result = await probeProviderConnection({ baseUrl: resolveProviderBaseUrl(connection), credential });
  } catch {
    result = { status: "error", message: "The stored credential or endpoint could not be used." };
  }
  await prisma.aiProviderConfig.update({
    where: { id: connection.id },
    data: { lastCheckedAt: new Date(), lastCheckStatus: result.status, lastCheckMessage: result.message },
  });
  revalidatePath("/settings");
  revalidatePath("/ai-team");
}

// ─── Phase 3: client portal + approval actions ───────────────────────────────

export async function generateJobPortalToken(jobId: string) {
  const actor = await requireStaff();
  const { randomBytes } = await import("crypto");
  await prisma.$transaction(async tx => {
    await assertCompanyRelations(tx, actor.organizationId, { jobs: [jobId] });
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${actor.organizationId + ":delivery-job:" + jobId}, 0))::text`;
    const existing = await tx.job.findUniqueOrThrow({ where: { id: jobId }, select: { portalToken: true } });
    if (!existing.portalToken) {
      const token = randomBytes(32).toString("hex");
      await tx.job.update({ where: { id: jobId }, data: { portalToken: token } });
    }
  });
  revalidatePath(`/jobs/${jobId}`);
}

export async function createChangeOrderApproval(changeOrderId: string, reviewedDigest: string) {
  await requireStaff();
  const actor = await requireStaff();
  const { issueChangeApproval } = await import("@/lib/change-order-ledger");
  const { FinancialRecordError } = await import("@/lib/finance-lock");
  try { await issueChangeApproval(prisma, actor.id, changeOrderId, reviewedDigest); }
  catch (error) { if (error instanceof FinancialRecordError) redirect("/change-orders/" + changeOrderId + "?error=" + encodeURIComponent(error.message)); throw error; }
  revalidatePath("/change-orders/" + changeOrderId);
  redirect("/change-orders/" + changeOrderId + "?flash=Reviewed+approval+link+created");
}

// ─── Phase 2: scope creep actions ────────────────────────────────────────────

export async function captureOutOfScopeRequest(formData: FormData) {
  const actor = await requireStaff();
  const jobId = String(formData.get("jobId") || "");
  const profileId = String(formData.get("profileId") || "") || null;
  const subject = String(formData.get("subject") || "").trim();
  const body = String(formData.get("body") || "").trim() || null;
  if (!subject) return;
  await prisma.$transaction(async tx => {
    await assertActivityCompanyRelations(tx, actor.organizationId, { jobId, profileId });
    await tx.activity.create({ data: { relatedJobId: jobId, relatedProfileId: profileId,
      activityType: "NOTE", subject, body, isOutOfScope: true } });
  });
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/jobs/${jobId}/scope`);
  redirect(`/jobs/${jobId}/scope?flash=Request+logged`);
}

export async function createChangeOrderFromRequest(activityId: string, jobId: string) {
  await requireStaff();
  const actor = await requireStaff();
  const { changeDraftFromRequest } = await import("@/lib/change-order-ledger");
  const { FinancialRecordError } = await import("@/lib/finance-lock");
  let id: string;
  try { id = (await changeDraftFromRequest(prisma, actor.id, activityId, jobId)).id; }
  catch (error) { if (error instanceof FinancialRecordError) redirect("/jobs/" + jobId + "/scope?error=" + encodeURIComponent(error.message)); throw error; }
  revalidatePath("/jobs/" + jobId + "/scope");
  revalidatePath("/change-orders");
  redirect("/change-orders/" + id + "?flash=Scope+request+linked+to+draft");
}

export async function updatePhaseStatus(formData: FormData) {
  await requireStaff();
  const phaseId = String(formData.get("phaseId") || "");
  const status = String(formData.get("status") || "");
  const jobId = String(formData.get("jobId") || "");
  const actor = await requireStaff();
  const { setReviewedPhaseStatus } = await import("@/lib/work-package");
  const { FinancialRecordError } = await import("@/lib/finance-lock");
  try { await setReviewedPhaseStatus(prisma, actor.id, jobId, phaseId, status); }
  catch (error) { if (error instanceof FinancialRecordError) redirect("/jobs/" + jobId + "?error=" + encodeURIComponent(error.message)); throw error; }
  revalidatePath(`/jobs/${jobId}`);
}

export async function createConsultationDepositInvoice(quoteId: string) {
  await requireStaff();
  const quote = await prisma.quote.findUniqueOrThrow({
    where: { id: quoteId },
    select: { clientProfileId: true, consultationFee: true, quoteName: true },
  });
  const fee = Number(quote.consultationFee ?? 0);
  if (fee <= 0) throw new Error("No consultation fee set on this quote.");
  const count = await prisma.invoice.count();
  const invoice = await prisma.invoice.create({
    data: {
      clientProfileId: quote.clientProfileId,
      invoiceNumber: `CONSULT-${String(count + 1).padStart(4, "0")}`,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 7 * 86_400_000),
      subtotal: fee,
      total: fee,
      balanceDue: fee,
      status: "SENT",
      notes: `Paid consultation fee for: ${quote.quoteName}`,
    },
  });
  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}?flash=Consultation+invoice+created`);
}

// ─── SMTP email settings ──────────────────────────────────────────────────────

export async function updateSmtpSettings(formData: FormData) {
  const actor = await requireStaff();
  const password = String(formData.get("smtpPassword") || "").trim();
  await prisma.organization.update({
    where: { id: actor.organizationId },
    data: {
      smtpFromName: String(formData.get("smtpFromName") || ""),
      smtpFromEmail: String(formData.get("smtpFromEmail") || ""),
      ...(password ? { smtpPassword: password } : {}),
    },
  });
  revalidatePath("/settings");
  redirect("/settings?flash=Email+settings+saved");
}

export async function testSmtpConnection(formData: FormData) {
  const actor = await requireStaff();
  const saved = await prisma.organization.findUniqueOrThrow({ where: { id: actor.organizationId }, select: { smtpFromName: true, smtpFromEmail: true, smtpPassword: true } });
  const fromName = saved.smtpFromName;
  const fromEmail = saved.smtpFromEmail;
  const password = saved.smtpPassword;
  const testTo = String(formData.get("testTo") || fromEmail);

  if (!fromEmail || !password) {
    redirect("/settings?error=Enter+your+email+and+App+Password+first");
  }

  const { sendEmail } = await import("@/lib/email-sender");
  const result = await sendEmail(
    {
      to: testTo,
      subject: "RenoTrack360 email test",
      text: "Your email is configured correctly. Invoices, reports, and approvals will send from your Gmail address.",
    },
    { fromName: fromName || fromEmail, fromEmail, password }
  );

  if (result.sent) {
    redirect("/settings?flash=Test+email+sent+successfully");
  } else {
    redirect("/settings?error=Email+test+failed.+Check+your+saved+Gmail+address,+App+Password+and+2-Step+Verification");
  }
}

export async function adoptWorkItemPilot(formData: FormData) {
  await requireStaff();
  const actor = await requireStaff();
  const { adoptShowerPilot, WorkItemError } = await import("@/lib/work-item-version");
  if (formData.get("planningAcknowledged") !== "on") redirect("/service-templates/work-items?error=Review+the+planning+acknowledgment+first");
  let id: string;
  try { id = (await adoptShowerPilot(prisma, actor.id, String(formData.get("reviewedDigest") || ""))).id; }
  catch (error) { if (error instanceof WorkItemError) redirect("/service-templates/work-items?error=" + encodeURIComponent(error.message)); throw error; }
  revalidatePath("/service-templates/work-items");
  redirect("/service-templates/work-items/" + id);
}

export async function createCostObservation(formData: FormData) {
  await requireStaff();
  const actor = await requireStaff();
  const { saveCostObservation, CostObservationError } = await import("@/lib/cost-observation");
  let id: string;
  try { id = (await saveCostObservation(prisma, actor.id, String(formData.get("requestId") || ""), Object.fromEntries(formData))).id; }
  catch (error) { if (error instanceof CostObservationError) redirect("/cost-intelligence/sources?error=" + encodeURIComponent(error.message)); throw error; }
  revalidatePath("/cost-intelligence/sources");
  redirect("/cost-intelligence/sources/" + id);
}

export async function uploadJobFinanceEvidence(jobId: string, formData: FormData) {
  await requireStaff();
  const actor = await requireStaff();
  const { createPrivateAsset, storageRoot, MediaError } = await import("@/lib/private-media");
  const file = formData.get("file");
  if (!(file instanceof File) || file.type !== "application/pdf") redirect("/jobs/" + jobId + "/financial-review?error=Choose+a+PDF+evidence+bundle");
  try { await createPrivateAsset(prisma, actor, { entityType: "JOB", entityId: jobId, file, notes: "Financial review evidence; upload alone is not approval." }, await storageRoot()); }
  catch (error) { if (error instanceof MediaError) redirect("/jobs/" + jobId + "/financial-review?error=" + encodeURIComponent(error.message)); throw error; }
  revalidatePath("/jobs/" + jobId + "/financial-review");
  redirect("/jobs/" + jobId + "/financial-review?flash=Evidence+retained+for+review");
}

export async function reviewJobFinancialBaseline(jobId: string, formData: FormData) {
  await requireStaff();
  const actor = await requireStaff();
  const { adoptJobFinancialBaseline } = await import("@/lib/job-finance");
  const { FinancialRecordError } = await import("@/lib/finance-lock");
  const { storageRoot, MediaError } = await import("@/lib/private-media");
  try { await adoptJobFinancialBaseline(prisma, actor.id, jobId, { ...Object.fromEntries(formData), contractVerified: formData.get("contractVerified") === "on", receiptsComplete: formData.get("receiptsComplete") === "on" }, await storageRoot()); }
  catch (error) { if (error instanceof FinancialRecordError || error instanceof MediaError) redirect("/jobs/" + jobId + "/financial-review?error=" + encodeURIComponent(error.message)); throw error; }
  revalidatePath("/jobs", "layout");
  revalidatePath("/payments/reconciliation");
  redirect("/jobs/" + jobId + "/financial-review?flash=Reviewed+baseline+retained");
}

export async function adoptJobScopePackage(jobId: string, formData: FormData) {
  await requireStaff();
  const actor = await requireStaff();
  const { adoptScopePackage } = await import("@/lib/work-package");
  const { storageRoot, MediaError } = await import("@/lib/private-media");
  const { FinancialRecordError } = await import("@/lib/finance-lock");
  let id: string;
  try { const result = await adoptScopePackage(prisma, actor.id, jobId, { ...Object.fromEntries(formData), approvedScopeVerified: formData.get("approvedScopeVerified") === "on" }, await storageRoot()); id = result.id; }
  catch (error) { if (error instanceof FinancialRecordError || error instanceof MediaError) redirect(`/jobs/${jobId}/work-packages?error=` + encodeURIComponent(error.message)); throw error; }
  revalidatePath(`/jobs/${jobId}`); revalidatePath(`/jobs/${jobId}/work-packages`);
  redirect(`/work-packages/${id}?flash=Scope+retained+and+ordered+work+generated`);
}
export async function addWorkStepEvidence(packageId: string, stepId: string, formData: FormData) {
  await requireStaff();
  const actor = await requireStaff();
  const { submitStepEvidence } = await import("@/lib/work-package");
  const { storageRoot, MediaError } = await import("@/lib/private-media");
  const { FinancialRecordError } = await import("@/lib/finance-lock");
  try { await submitStepEvidence(prisma, actor.id, packageId, stepId, Object.fromEntries(formData), await storageRoot()); }
  catch (error) { if (error instanceof FinancialRecordError || error instanceof MediaError) redirect(`/work-packages/${packageId}?error=` + encodeURIComponent(error.message)); throw error; }
  revalidatePath(`/work-packages/${packageId}`); redirect(`/work-packages/${packageId}?flash=Evidence+retained`);
}
export async function recordWorkStepReview(packageId: string, stepId: string, formData: FormData) {
  await requireStaff();
  const actor = await requireStaff();
  const { reviewWorkStep } = await import("@/lib/work-package");
  const { storageRoot, MediaError } = await import("@/lib/private-media");
  const { FinancialRecordError } = await import("@/lib/finance-lock");
  try { await reviewWorkStep(prisma, actor.id, packageId, stepId, Object.fromEntries(formData), await storageRoot()); }
  catch (error) { if (error instanceof FinancialRecordError || error instanceof MediaError) redirect(`/work-packages/${packageId}?error=` + encodeURIComponent(error.message)); throw error; }
  revalidatePath(`/work-packages/${packageId}`); revalidatePath("/jobs"); redirect(`/work-packages/${packageId}?flash=Human+review+retained`);
}
export async function uploadWorkPackageEvidence(packageId: string, formData: FormData) {
  await requireStaff();
  const actor = await requireStaff();
  const { getOwnedPackage } = await import("@/lib/work-package");
  const { createPrivateAsset, storageRoot, MediaError } = await import("@/lib/private-media");
  const { FinancialRecordError } = await import("@/lib/finance-lock");
  try {
    const work = await getOwnedPackage(prisma, packageId), file = formData.get("file");
    if (!(file instanceof File)) throw new MediaError("Choose a photo or PDF.");
    await createPrivateAsset(prisma, actor, { entityType: "JOB", entityId: work.scopeItem.jobId, file, notes: "Work package evidence upload; link it to its actual step before review." }, await storageRoot());
  } catch (error) { if (error instanceof FinancialRecordError || error instanceof MediaError) redirect(`/work-packages/${packageId}?error=` + encodeURIComponent(error.message)); throw error; }
  revalidatePath(`/work-packages/${packageId}`); redirect(`/work-packages/${packageId}?flash=Private+file+retained.+Assign+it+to+the+correct+step`);
}

export async function uploadEstimateContract(estimateId: string, formData: FormData) {
  await requireStaff();
  const actor = await requireStaff();
  const { ownedEstimate } = await import("@/lib/estimate-acceptance");
  const { createPrivateAsset, storageRoot, MediaError } = await import("@/lib/private-media");
  const { FinancialRecordError } = await import("@/lib/finance-lock");
  try {
    const estimate = await ownedEstimate(prisma, estimateId), file = formData.get("file");
    if (!(file instanceof File)) throw new MediaError("Choose the reviewed proposal PDF.");
    const asset = await createPrivateAsset(prisma, actor, { entityType: "QUOTE", entityId: estimate.quoteId, file, notes: "Proposal document; owner review and link issuance are separate actions." }, await storageRoot());
    if (asset.mimeType !== "application/pdf") throw new MediaError("The proposal requires a PDF. This file remains a private attachment only.");
  } catch (error) { if (error instanceof MediaError || error instanceof FinancialRecordError) redirect(`/estimates/${estimateId}/acceptance?error=` + encodeURIComponent(error.message)); throw error; }
  revalidatePath(`/estimates/${estimateId}/acceptance`); redirect(`/estimates/${estimateId}/acceptance?flash=Private+proposal+document+retained`);
}
export async function issueReviewedEstimate(estimateId: string, formData: FormData) {
  await requireStaff();
  const actor = await requireStaff();
  const { issueEstimateApproval } = await import("@/lib/estimate-acceptance");
  const { storageRoot, MediaError } = await import("@/lib/private-media");
  const { FinancialRecordError } = await import("@/lib/finance-lock");
  try { await issueEstimateApproval(prisma, actor.id, estimateId, { ...Object.fromEntries(formData), ownerReviewed: formData.get("ownerReviewed") === "on" }, await storageRoot()); }
  catch (error) { if (error instanceof MediaError || error instanceof FinancialRecordError) redirect(`/estimates/${estimateId}/acceptance?error=` + encodeURIComponent(error.message)); throw error; }
  revalidatePath(`/estimates/${estimateId}/acceptance`); revalidatePath(`/estimates/${estimateId}`); redirect(`/estimates/${estimateId}/acceptance?flash=Reviewed+link+created.+No+message+was+sent`);
}
export async function createMilestoneInvoiceDraft(jobId: string, formData: FormData) {
  const actor = await requireStaff();
  const { createMilestoneInvoiceDraft: createDraft } = await import("@/lib/milestone-billing");
  const { FinancialRecordError } = await import("@/lib/finance-lock");
  let invoiceId: string;
  try {
    invoiceId = (await createDraft(prisma, actor.id, jobId, {
      ...Object.fromEntries(formData), triggerVerified: formData.get("triggerVerified") === "on",
    })).id;
  } catch (error) {
    if (error instanceof FinancialRecordError) redirect(`/jobs/${jobId}/billing?error=${encodeURIComponent(error.message)}`);
    throw error;
  }
  revalidatePath(`/jobs/${jobId}/billing`);
  revalidatePath("/invoices");
  redirect(`/invoices/${invoiceId}?flash=Milestone+invoice+draft+created.+Review+before+sending`);
}
export async function convertReviewedEstimate(estimateId: string) {
  await requireStaff();
  const actor = await requireStaff();
  const { convertAcceptedEstimate } = await import("@/lib/estimate-acceptance");
  const { FinancialRecordError } = await import("@/lib/finance-lock");
  let id: string;
  try { id = (await convertAcceptedEstimate(prisma, actor.id, estimateId)).id; }
  catch (error) { if (error instanceof FinancialRecordError) redirect(`/estimates/${estimateId}/acceptance?error=` + encodeURIComponent(error.message)); throw error; }
  revalidatePath("/jobs"); revalidatePath("/estimates"); redirect(`/jobs/${id}/financial-review?flash=Accepted+proposal+linked.+Review+documents+and+receipts+before+execution`);
}
