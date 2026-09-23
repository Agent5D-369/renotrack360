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
 * Rows read per resource. A company export is built on the request path, so the query asks for one
 * row more than the limit and the surplus is what proves a resource was cut off. Truncation is
 * reported in the manifest rather than hidden, because a silently partial export is worse than a
 * slow one.
 */
export const EXPORT_ROW_LIMIT = 20_000;

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
/**
 * Exports allowed per company per rolling hour. The audit trail is the source of truth rather than
 * a separate counter, so the limit cannot drift from the record of what actually happened.
 */
export function exportHourlyLimit(environment: Record<string, string | undefined> = process.env): number {
  const configured = Number(environment.EXPORT_HOURLY_LIMIT ?? 10);
  return Number.isFinite(configured) && configured >= 1 ? Math.trunc(configured) : 10;
}

export async function exportAllowance(
  db: PrismaClient,
  organizationId: string,
  environment: Record<string, string | undefined> = process.env,
) {
  const limit = exportHourlyLimit(environment);
  const windowStart = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await db.auditEvent.findMany({
    where: { organizationId, action: "COMPANY_DATA_EXPORTED", createdAt: { gte: windowStart } },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  const used = recent.length;
  const oldest = recent[0]?.createdAt ?? null;
  const resetAt = oldest ? new Date(oldest.getTime() + 60 * 60 * 1000) : null;
  return {
    limit,
    used,
    allowed: used < limit,
    remaining: Math.max(0, limit - used),
    retryAfterSeconds: oldest ? Math.max(1, Math.ceil((resetAt!.getTime() - Date.now()) / 1000)) : 0,
  };
}

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
    db.user.findMany({ take: EXPORT_ROW_LIMIT + 1, where, select: { id: true, name: true, email: true, role: true, uiMode: true, createdAt: true, updatedAt: true } }),
    db.membership.findMany({ take: EXPORT_ROW_LIMIT + 1, where, select: { id: true, userId: true, role: true, status: true, invitedEmail: true, invitedAt: true, acceptedAt: true, createdAt: true } }),
    db.profile.findMany({ take: EXPORT_ROW_LIMIT + 1, where: profileInOrganization(organizationId) }),
    db.property.findMany({ take: EXPORT_ROW_LIMIT + 1, where: propertyInOrganization(organizationId) }),
    db.lead.findMany({ take: EXPORT_ROW_LIMIT + 1, where: leadInOrganization(organizationId) }),
    db.quote.findMany({ take: EXPORT_ROW_LIMIT + 1, where: quoteInOrganization(organizationId), include: { lineItems: true } }),
    db.estimate.findMany({ take: EXPORT_ROW_LIMIT + 1, where: estimateInOrganization(organizationId) }),
    db.job.findMany({ take: EXPORT_ROW_LIMIT + 1, where: jobInOrganization(organizationId) }),
    db.renovationPhase.findMany({ take: EXPORT_ROW_LIMIT + 1, where: phaseInOrganization(organizationId) }),
    db.task.findMany({ take: EXPORT_ROW_LIMIT + 1, where: taskInOrganization(organizationId) }),
    db.fieldReport.findMany({ take: EXPORT_ROW_LIMIT + 1, where: fieldReportInOrganization(organizationId) }),
    db.jobPhoto.findMany({ take: EXPORT_ROW_LIMIT + 1, where: jobPhotoInOrganization(organizationId) }),
    db.invoice.findMany({ take: EXPORT_ROW_LIMIT + 1, where: invoiceInOrganization(organizationId) }),
    db.payment.findMany({ take: EXPORT_ROW_LIMIT + 1, where: paymentInOrganization(organizationId) }),
    db.changeOrder.findMany({ take: EXPORT_ROW_LIMIT + 1, where: changeOrderInOrganization(organizationId) }),
    db.selectionSheet.findMany({ take: EXPORT_ROW_LIMIT + 1, where: selectionSheetInOrganization(organizationId) }),
    db.selectionItem.findMany({ take: EXPORT_ROW_LIMIT + 1, where: selectionItemInOrganization(organizationId) }),
    db.workPackage.findMany({ take: EXPORT_ROW_LIMIT + 1, where: workPackageInOrganization(organizationId) }),
    db.weeklyReport.findMany({ take: EXPORT_ROW_LIMIT + 1, where: weeklyReportInOrganization(organizationId) }),
    db.costCatalogItem.findMany({ take: EXPORT_ROW_LIMIT + 1, where }),
    db.priceSnapshot.findMany({ take: EXPORT_ROW_LIMIT + 1, where }),
    db.laborRate.findMany({ take: EXPORT_ROW_LIMIT + 1, where }),
    db.marketCostFactor.findMany({ take: EXPORT_ROW_LIMIT + 1, where }),
    db.materialItem.findMany({ take: EXPORT_ROW_LIMIT + 1, where }),
    db.materialAllowance.findMany({ take: EXPORT_ROW_LIMIT + 1, where }),
    db.vendorQuote.findMany({ take: EXPORT_ROW_LIMIT + 1, where }),
    db.actualCost.findMany({ take: EXPORT_ROW_LIMIT + 1, where }),
    db.projectTemplate.findMany({ take: EXPORT_ROW_LIMIT + 1, where }),
    db.teamCircle.findMany({ take: EXPORT_ROW_LIMIT + 1, where }),
    db.dropdownOption.findMany({ take: EXPORT_ROW_LIMIT + 1, where }),
    db.agreementTemplate.findMany({ take: EXPORT_ROW_LIMIT + 1, where }),
    db.agreement.findMany({ take: EXPORT_ROW_LIMIT + 1, where }),
    db.serviceTemplate.findMany({ take: EXPORT_ROW_LIMIT + 1, where }),
    db.checklistTemplate.findMany({ take: EXPORT_ROW_LIMIT + 1, where }),
    db.aiAgent.findMany({ take: EXPORT_ROW_LIMIT + 1, where }),
    db.aiProviderConfig.findMany({
      take: EXPORT_ROW_LIMIT + 1,
      where,
      select: {
        id: true, provider: true, displayName: true, enabled: true, defaultModel: true,
        baseUrl: true, endpointKind: true, monthlyBudgetCents: true, allowClientData: true,
        dataRetentionMode: true, lastCheckedAt: true, lastCheckStatus: true, notes: true, createdAt: true,
      },
    }),
    db.aiUsageLog.findMany({ take: EXPORT_ROW_LIMIT + 1, where }),
    db.fileAsset.findMany({
      take: EXPORT_ROW_LIMIT + 1,
      where,
      select: { id: true, entityType: true, entityId: true, fileName: true, mimeType: true, size: true, storageProvider: true, sha256: true, notes: true, createdAt: true },
    }),
    db.auditEvent.findMany({ take: EXPORT_ROW_LIMIT + 1, where, orderBy: { createdAt: "desc" } }),
  ]);

  // One row past the limit means the resource was cut off; record which ones so the file is honest
  // about being partial rather than looking complete.
  const truncated: {resource: string; returned: number; note: string}[] = [];
  const capped = <T,>(rows: T[]): T[] => {
    if (rows.length <= EXPORT_ROW_LIMIT) return rows;
    return rows.slice(0, EXPORT_ROW_LIMIT);
  };
  const limited = {
    users: capped(users), memberships: capped(memberships), profiles: capped(profiles), properties: capped(properties),
    leads: capped(leads), quotes: capped(quotes), estimates: capped(estimates), jobs: capped(jobs), phases: capped(phases),
    tasks: capped(tasks), fieldReports: capped(fieldReports), jobPhotos: capped(jobPhotos), invoices: capped(invoices),
    payments: capped(payments), changeOrders: capped(changeOrders), selectionSheets: capped(selectionSheets),
    selectionItems: capped(selectionItems), workPackages: capped(workPackages), weeklyReports: capped(weeklyReports),
    costCatalogItems: capped(costCatalogItems), priceSnapshots: capped(priceSnapshots), laborRates: capped(laborRates),
    marketCostFactors: capped(marketCostFactors), materialItems: capped(materialItems), materialAllowances: capped(materialAllowances),
    vendorQuotes: capped(vendorQuotes), actualCosts: capped(actualCosts), projectTemplates: capped(projectTemplates),
    teamCircles: capped(teamCircles), dropdownOptions: capped(dropdownOptions), agreementTemplates: capped(agreementTemplates),
    agreements: capped(agreements), serviceTemplates: capped(serviceTemplates), checklistTemplates: capped(checklistTemplates),
    aiAgents: capped(aiAgents), aiProviderConfigs: capped(aiProviderConfigs), aiUsageLogs: capped(aiUsageLogs),
    fileAssets: capped(fileAssets), auditEvents: capped(auditEvents),
  };
  for (const [resource, rows] of Object.entries({users, memberships, profiles, properties, leads, quotes, estimates, jobs, phases, tasks, fieldReports, jobPhotos, invoices, payments, changeOrders, selectionSheets, selectionItems, workPackages, weeklyReports, costCatalogItems, priceSnapshots, laborRates, marketCostFactors, materialItems, materialAllowances, vendorQuotes, actualCosts, projectTemplates, teamCircles, dropdownOptions, agreementTemplates, agreements, serviceTemplates, checklistTemplates, aiAgents, aiProviderConfigs, aiUsageLogs, fileAssets, auditEvents})) {
    if (rows.length > EXPORT_ROW_LIMIT) truncated.push({resource, returned: EXPORT_ROW_LIMIT, note: `Limited to ${EXPORT_ROW_LIMIT} rows; more exist in the application.`});
  }

  const resources = limited;

  return {
    manifest: {
      formatVersion: COMPANY_EXPORT_VERSION,
      generatedAt: new Date().toISOString(),
      organizationId,
      counts: Object.fromEntries(Object.entries(resources).map(([name, rows]) => [name, rows.length])),
      rowLimitPerResource: EXPORT_ROW_LIMIT,
      truncated,
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
