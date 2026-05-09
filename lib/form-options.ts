import {
  ActivityType,
  ChangeOrderStatus,
  ClientStatus,
  ConfidenceLevel,
  EstimateStatus,
  FinancingStatus,
  InvoiceStatus,
  JobStatus,
  LeadStage,
  PaymentMethod,
  PaymentStatus,
  ProfileType,
  ProfileKind,
  PropertyType,
  QuoteStatus,
  RiskLevel,
  TaskPriority,
  TaskStatus,
  VendorOnboardingStatus,
  W9Status
} from "@prisma/client";
import { titleFromEnum } from "@/lib/format";

function enumOptions<T extends Record<string, string>>(source: T) {
  return Object.values(source).map((value) => ({ value, label: titleFromEnum(value) }));
}

export const options = {
  estimateStatuses: enumOptions(EstimateStatus),
  confidenceLevels: enumOptions(ConfidenceLevel),
  profileTypes: enumOptions(ProfileType),
  profileKinds: enumOptions(ProfileKind),
  clientStatuses: enumOptions(ClientStatus),
  leadStages: enumOptions(LeadStage),
  propertyTypes: enumOptions(PropertyType),
  quoteStatuses: enumOptions(QuoteStatus),
  riskLevels: enumOptions(RiskLevel),
  jobStatuses: enumOptions(JobStatus),
  changeOrderStatuses: enumOptions(ChangeOrderStatus),
  invoiceStatuses: enumOptions(InvoiceStatus),
  paymentMethods: enumOptions(PaymentMethod),
  paymentStatuses: enumOptions(PaymentStatus),
  financingStatuses: enumOptions(FinancingStatus),
  activityTypes: enumOptions(ActivityType),
  taskStatuses: enumOptions(TaskStatus),
  taskPriorities: enumOptions(TaskPriority),
  w9Statuses: enumOptions(W9Status),
  vendorOnboardingStatuses: enumOptions(VendorOnboardingStatus)
};

export function relationOptions(items: Array<{ id: string; label: string }>) {
  const seen = new Set<string>();
  return items
    .filter((item) => {
      const key = item.label.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((item) => ({ value: item.id, label: item.label }));
}
