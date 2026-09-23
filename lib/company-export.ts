import type { PrismaClient } from "@prisma/client";
import { jobInOrganization, weeklyReportInOrganization, estimateInOrganization, quoteInOrganization, profileInOrganization, propertyInOrganization, leadInOrganization } from "./company-scope";
import {
  changeOrderInOrganization,
  fieldReportInOrganization,
  invoiceInOrganization,
  jobPhotoInOrganization,
  paymentInOrganization,
  phaseInOrganization,
  selectionItemInOrganization,
  selectionSheetInOrganization,
  taskInOrganization,
  workPackageInOrganization,
} from "./delivery-scope";

export const COMPANY_EXPORT_VERSION = 1;

/**
 * Render one resource as CSV. Nested objects and arrays are kept as JSON text inside their cell
 * rather than flattened, so nothing is silently dropped and the file stays readable in a
 * spreadsheet. Values are quoted per RFC 4180.
 */
export function resourceToCsv(rows: readonly Record<string, unknown>[]): string {
  const columns = [...new Set(rows.flatMap(row => Object.keys(row)))].sort();
  const cell = (value: unknown) => {
    if (value === null || value === undefined) return "";
    const text = typeof value === "object" ? JSON.stringify(value) : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };
  return [columns.join(","), ...rows.map(row => columns.map(column => cell(row[column])).join(","))].join("\n") + "\n";
}

/** Resource names a caller may request individually. */
export const EXPORTABLE_RESOURCES = [
  "users", "memberships", "profiles", "properties", "leads", "quotes", "estimates", "jobs",
  "phases", "tasks", "fieldReports", "jobPhotos", "invoices", "payments", "changeOrders",
  "selectionSheets", "selectionItems", "workPackages", "weeklyReports", "costCatalogItems",
  "priceSnapshots", "laborRates", "marketCostFactors", "materialItems", "materialAllowances",
  "vendorQuotes", "actualCosts", "projectTemplates", "teamCircles", "dropdownOptions",
  "agreementTemplates", "agreements", "serviceTemplates", "checklistTemplates", "aiAgents",
  "aiProviderConfigs", "aiUsageLogs", "fileAssets", "auditEvents",
] as const;
export type ExportableResource = typeof EXPORTABLE_RESOURCES[number];

/**
 * A company's own records, assembled for self-service download.
 *
 * Two rules shape this list. It contains only rows belonging to the requesting company, using the
 * same scope predicates the rest of the application uses, so the export cannot become a way around
 * company isolation. And it excludes anything that is a credential or an internal secret - provider
 * key references and ciphertext, SMTP passwords, password hashes and invitation tokens - because an
 * export is a file that will be emailed, copied to a laptop and kept.
 *
 * Deliberately excluded and worth saying out loud: the imported Homewyse source catalog is a very
 * large third-party dataset rather than company-authored data, and private media binaries are stored
 * outside the database, so this export carries their metadata and not the files.
 */
export async function buildCompanyExport(db: PrismaClient, organizationId: string) {
  const where = { organizationId };
  const [
    organization, users, memberships, profiles, properties, leads, quotes, estimates,
    jobs, phases, tasks, fieldReports, jobPhotos, invoices, payments, changeOrders,
    selectionSheets, selectionItems, workPackages, weeklyReports,
    costCatalogItems, priceSnapshots, laborRates, marketCostFactors, materialItems,
    materialAllowances, vendorQuotes, actualCosts, projectTemplates, teamCircles,
    dropdownOptions, agreementTemplates, agreements, serviceTemplates, checklistTemplates,
    aiAgents, aiProviderConfigs, aiUsageLogs, fileAssets, auditEvents,
  ] = await Promise.all([
    db.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: {
        id: true, name: true, address: true, phone: true, email: true, website: true,
        logoUrl: true, brandColor: true, brandSecondaryColor: true, companyTagline: true,
        reviewLink: true, defaultMarkup: true, defaultContingency: true,
        defaultTargetMarginPercent: true, ownerExceptionMarginPercent: true,
        changeOrderApprovalThresholdCents: true, invoiceApprovalThresholdCents: true,
        notificationCadence: true, defaultPaymentSchedule: true,
        paymentTerms: true, estimateTerms: true, invoiceTerms: true, weeklyReportFooter: true,
        country: true, themePreference: true, planTier: true, subscriptionStatus: true, createdAt: true,
      },
    }),
    db.user.findMany({ where, select: { id: true, name: true, email: true, role: true, uiMode: true, createdAt: true, updatedAt: true } }),
    db.membership.findMany({ where, select: { id: true, userId: true, role: true, status: true, invitedEmail: true, invitedAt: true, acceptedAt: true, createdAt: true } }),
    db.profile.findMany({ where: profileInOrganization(organizationId) }),
    db.property.findMany({ where: propertyInOrganization(organizationId) }),
    db.lead.findMany({ where: leadInOrganization(organizationId) }),
    db.quote.findMany({ where: quoteInOrganization(organizationId), include: { lineItems: true } }),
    db.estimate.findMany({ where: estimateInOrganization(organizationId) }),
    db.job.findMany({ where: jobInOrganization(organizationId) }),
    db.renovationPhase.findMany({ where: phaseInOrganization(organizationId) }),
    db.task.findMany({ where: taskInOrganization(organizationId) }),
    db.fieldReport.findMany({ where: fieldReportInOrganization(organizationId) }),
    db.jobPhoto.findMany({ where: jobPhotoInOrganization(organizationId) }),
    db.invoice.findMany({ where: invoiceInOrganization(organizationId) }),
    db.payment.findMany({ where: paymentInOrganization(organizationId) }),
    db.changeOrder.findMany({ where: changeOrderInOrganization(organizationId) }),
    db.selectionSheet.findMany({ where: selectionSheetInOrganization(organizationId) }),
    db.selectionItem.findMany({ where: selectionItemInOrganization(organizationId) }),
    db.workPackage.findMany({ where: workPackageInOrganization(organizationId) }),
    db.weeklyReport.findMany({ where: weeklyReportInOrganization(organizationId) }),
    db.costCatalogItem.findMany({ where }),
    db.priceSnapshot.findMany({ where }),
    db.laborRate.findMany({ where }),
    db.marketCostFactor.findMany({ where }),
    db.materialItem.findMany({ where }),
    db.materialAllowance.findMany({ where }),
    db.vendorQuote.findMany({ where }),
    db.actualCost.findMany({ where }),
    db.projectTemplate.findMany({ where }),
    db.teamCircle.findMany({ where }),
    db.dropdownOption.findMany({ where }),
    db.agreementTemplate.findMany({ where }),
    db.agreement.findMany({ where }),
    db.serviceTemplate.findMany({ where }),
    db.checklistTemplate.findMany({ where }),
    db.aiAgent.findMany({ where }),
    db.aiProviderConfig.findMany({
      where,
      select: {
        id: true, provider: true, displayName: true, enabled: true, defaultModel: true,
        baseUrl: true, endpointKind: true, monthlyBudgetCents: true, allowClientData: true,
        dataRetentionMode: true, lastCheckedAt: true, lastCheckStatus: true, notes: true, createdAt: true,
      },
    }),
    db.aiUsageLog.findMany({ where }),
    db.fileAsset.findMany({
      where,
      select: { id: true, entityType: true, entityId: true, fileName: true, mimeType: true, size: true, storageProvider: true, sha256: true, notes: true, createdAt: true },
    }),
    db.auditEvent.findMany({ where, orderBy: { createdAt: "desc" } }),
  ]);

  const resources = {
    users, memberships, profiles, properties, leads, quotes, estimates,
    jobs, phases, tasks, fieldReports, jobPhotos, invoices, payments, changeOrders,
    selectionSheets, selectionItems, workPackages, weeklyReports,
    costCatalogItems, priceSnapshots, laborRates, marketCostFactors, materialItems,
    materialAllowances, vendorQuotes, actualCosts, projectTemplates, teamCircles,
    dropdownOptions, agreementTemplates, agreements, serviceTemplates, checklistTemplates,
    aiAgents, aiProviderConfigs, aiUsageLogs, fileAssets, auditEvents,
  };

  return {
    manifest: {
      formatVersion: COMPANY_EXPORT_VERSION,
      generatedAt: new Date().toISOString(),
      organizationId,
      counts: Object.fromEntries(Object.entries(resources).map(([name, rows]) => [name, rows.length])),
      excluded: [
        "Credential material: provider key references and encrypted key payloads, SMTP passwords, password hashes, invitation tokens.",
        "Private media binaries: photo and document files live outside the database, so only their metadata is included.",
        "Imported third-party source catalog: the Homewyse-derived versions and their raw payloads are not company-authored records.",
      ],
      note: "Records are scoped to this company with the same predicates the application uses for every request.",
    },
    organization,
    resources,
  };
}
