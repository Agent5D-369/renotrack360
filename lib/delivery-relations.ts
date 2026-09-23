import type { Prisma } from "@prisma/client";
import {
  changeOrderInOrganization,
  estimateFollowUpInOrganization,
  feedbackRequestInOrganization,
  fieldReportInOrganization,
  financingInOrganization,
  invoiceInOrganization,
  jobPhotoInOrganization,
  meetingInOrganization,
  paymentInOrganization,
  phaseInOrganization,
  selectionItemInOrganization,
  selectionSheetInOrganization,
  taskInOrganization,
  timeEntryInOrganization,
  workPackageInOrganization,
} from "./delivery-scope";

export type NullableDeliveryId = string | null | undefined;

export type DeliveryRelationRefs = {
  tasks?: readonly NullableDeliveryId[];
  phases?: readonly NullableDeliveryId[];
  fieldReports?: readonly NullableDeliveryId[];
  jobPhotos?: readonly NullableDeliveryId[];
  meetings?: readonly NullableDeliveryId[];
  timeEntries?: readonly NullableDeliveryId[];
  changeOrders?: readonly NullableDeliveryId[];
  invoices?: readonly NullableDeliveryId[];
  payments?: readonly NullableDeliveryId[];
  estimateFollowUps?: readonly NullableDeliveryId[];
  selectionSheets?: readonly NullableDeliveryId[];
  selectionItems?: readonly NullableDeliveryId[];
  feedbackRequests?: readonly NullableDeliveryId[];
  financings?: readonly NullableDeliveryId[];
  workPackages?: readonly NullableDeliveryId[];
};

export class DeliveryRelationError extends Error {
  readonly status = 404;

  constructor() {
    super("A related delivery record was not found.");
  }
}

function ids(values: readonly NullableDeliveryId[] | undefined): string[] {
  const result: string[] = [];
  for (const value of values ?? []) {
    if (value === null || value === undefined || value === "") continue;
    if (value.trim() !== value || !value) throw new DeliveryRelationError();
    result.push(value);
  }
  return [...new Set(result)];
}

async function exactCount(values: string[], count: () => Promise<number>) {
  if (values.length && await count() !== values.length) throw new DeliveryRelationError();
}

export async function assertDeliveryRelations(
  tx: Prisma.TransactionClient,
  organizationId: string,
  refs: DeliveryRelationRefs,
): Promise<void> {
  if (!organizationId || organizationId.trim() !== organizationId) throw new DeliveryRelationError();
  const tasks = ids(refs.tasks);
  const phases = ids(refs.phases);
  const fieldReports = ids(refs.fieldReports);
  const jobPhotos = ids(refs.jobPhotos);
  const meetings = ids(refs.meetings);
  const timeEntries = ids(refs.timeEntries);
  const changeOrders = ids(refs.changeOrders);
  const invoices = ids(refs.invoices);
  const payments = ids(refs.payments);
  const estimateFollowUps = ids(refs.estimateFollowUps);
  const selectionSheets = ids(refs.selectionSheets);
  const selectionItems = ids(refs.selectionItems);
  const feedbackRequests = ids(refs.feedbackRequests);
  const financings = ids(refs.financings);
  const workPackages = ids(refs.workPackages);

  await exactCount(tasks, () => tx.task.count({ where: taskInOrganization(organizationId, { id: { in: tasks } }) }));
  await exactCount(phases, () => tx.renovationPhase.count({ where: phaseInOrganization(organizationId, { id: { in: phases } }) }));
  await exactCount(fieldReports, () => tx.fieldReport.count({ where: fieldReportInOrganization(organizationId, { id: { in: fieldReports } }) }));
  await exactCount(jobPhotos, () => tx.jobPhoto.count({ where: jobPhotoInOrganization(organizationId, { id: { in: jobPhotos } }) }));
  await exactCount(meetings, () => tx.meeting.count({ where: meetingInOrganization(organizationId, { id: { in: meetings } }) }));
  await exactCount(timeEntries, () => tx.timeEntry.count({ where: timeEntryInOrganization(organizationId, { id: { in: timeEntries } }) }));
  await exactCount(changeOrders, () => tx.changeOrder.count({ where: changeOrderInOrganization(organizationId, { id: { in: changeOrders } }) }));
  await exactCount(invoices, () => tx.invoice.count({ where: invoiceInOrganization(organizationId, { id: { in: invoices } }) }));
  await exactCount(payments, () => tx.payment.count({ where: paymentInOrganization(organizationId, { id: { in: payments } }) }));
  await exactCount(estimateFollowUps, () => tx.estimateFollowUp.count({ where: estimateFollowUpInOrganization(organizationId, { id: { in: estimateFollowUps } }) }));
  await exactCount(selectionSheets, () => tx.selectionSheet.count({ where: selectionSheetInOrganization(organizationId, { id: { in: selectionSheets } }) }));
  await exactCount(selectionItems, () => tx.selectionItem.count({ where: selectionItemInOrganization(organizationId, { id: { in: selectionItems } }) }));
  await exactCount(feedbackRequests, () => tx.feedbackRequest.count({ where: feedbackRequestInOrganization(organizationId, { id: { in: feedbackRequests } }) }));
  await exactCount(financings, () => tx.financing.count({ where: financingInOrganization(organizationId, { id: { in: financings } }) }));
  await exactCount(workPackages, () => tx.workPackage.count({ where: workPackageInOrganization(organizationId, { id: { in: workPackages } }) }));
}
