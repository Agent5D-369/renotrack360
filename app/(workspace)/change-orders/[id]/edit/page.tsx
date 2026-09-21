import { requireStaffPage } from "@/lib/staff-access";
import Link from "next/link";
import { updateChangeOrder } from "@/app/actions";
import { EntityForm } from "@/components/entity-form";
import { PageHeader } from "@/components/page-header";
import { options, relationOptions } from "@/lib/form-options";
import { prisma } from "@/lib/prisma";

export default async function EditChangeOrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage();
  const { id } = await params;
  const [order, jobs, profiles] = await Promise.all([
    prisma.changeOrder.findUniqueOrThrow({ where: { id } }),
    prisma.job.findMany({ select: { id: true, jobName: true }, orderBy: { jobName: "asc" } }),
    prisma.profile.findMany({ select: { id: true, profileName: true }, orderBy: { profileName: "asc" } })
  ]);
  const saveChangeOrder = updateChangeOrder.bind(null, order.id);

  return (
    <>
      <PageHeader title={`Edit: ${order.changeOrderTitle}`} body="Update scope, cost impact, time impact, field conditions, and approval status." />
      <div className="mb-5">
        <Link href={`/change-orders/${id}`} className="text-sm font-semibold text-muted-foreground hover:text-foreground">
          ← Back to change order
        </Link>
      </div>
      <EntityForm
        formKey="changeOrder"
        action={saveChangeOrder}
        submitLabel="Save change order"
        fields={[
          { name: "jobId", label: "Job", type: "select", options: relationOptions(jobs.map((j) => ({ id: j.id, label: j.jobName }))), defaultValue: order.jobId },
          { name: "clientProfileId", label: "Client", type: "select", options: relationOptions(profiles.map((p) => ({ id: p.id, label: p.profileName }))), defaultValue: order.clientProfileId ?? "" },
          { name: "changeOrderTitle", label: "Title", defaultValue: order.changeOrderTitle },
          { name: "status", label: "Status", type: "select", options: options.changeOrderStatuses, defaultValue: order.status },
          { name: "clientRequested", label: "Client requested", type: "checkbox", defaultValue: order.clientRequested },
          { name: "addedCost", label: "Added cost", type: "number", defaultValue: Number(order.addedCost) },
          { name: "addedTime", label: "Added days", type: "number", defaultValue: Number(order.addedTime) },
          { name: "reason", label: "Reason", type: "textarea", defaultValue: order.reason ?? "" },
          { name: "fieldCondition", label: "Field condition", type: "textarea", defaultValue: order.fieldCondition ?? "" },
          { name: "signatureApprovalNotes", label: "Signature / approval notes", type: "textarea", defaultValue: order.signatureApprovalNotes ?? "" }
        ]}
      />
    </>
  );
}
