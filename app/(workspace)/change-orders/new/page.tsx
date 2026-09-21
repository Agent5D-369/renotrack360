import { requireStaffPage } from "@/lib/staff-access";
import { createChangeOrder } from "@/app/actions";
import { EntityForm } from "@/components/entity-form";
import { PageHeader } from "@/components/page-header";
import { options, relationOptions } from "@/lib/form-options";
import { prisma } from "@/lib/prisma";

export default async function NewChangeOrderPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requireStaffPage();
  const sp = await searchParams;
  const preJobId = sp.jobId ?? "";
  const preReason = sp.reason ? decodeURIComponent(sp.reason) : "";
  const preTitle = sp.title ? decodeURIComponent(sp.title) : "";
  const preClientRequested = sp.clientRequested === "true";

  const [jobs, profiles] = await Promise.all([
    prisma.job.findMany({ select: { id: true, jobName: true, clientProfileId: true }, orderBy: { jobName: "asc" } }),
    prisma.profile.findMany({ select: { id: true, profileName: true }, orderBy: { profileName: "asc" } })
  ]);

  // Auto-select client from the pre-selected job
  const preJob = preJobId ? jobs.find((j) => j.id === preJobId) : null;
  const preClientId = preJob?.clientProfileId ?? "";

  return (
    <>
      <PageHeader title="New change order" body="Document scope changes, field conditions, cost impact, time impact, and approval status." />
      <EntityForm
        formKey="changeOrder"
        action={createChangeOrder}
        fields={[
          { name: "jobId", label: "Job", type: "select", options: relationOptions(jobs.map((j) => ({ id: j.id, label: j.jobName }))), defaultValue: preJobId },
          { name: "clientProfileId", label: "Client", type: "select", options: relationOptions(profiles.map((p) => ({ id: p.id, label: p.profileName }))), defaultValue: preClientId },
          { name: "changeOrderTitle", label: "Title", defaultValue: preTitle },
          { name: "status", label: "Status", type: "select", options: options.changeOrderStatuses, defaultValue: "DRAFT" },
          { name: "clientRequested", label: "Client requested", type: "checkbox", defaultValue: preClientRequested },
          { name: "addedCost", label: "Added cost", type: "number", defaultValue: 0 },
          { name: "addedTime", label: "Added days", type: "number", defaultValue: 0 },
          { name: "reason", label: "Reason", type: "textarea", defaultValue: preReason },
          { name: "fieldCondition", label: "Field condition", type: "textarea" },
          { name: "signatureApprovalNotes", label: "Signature / approval notes", type: "textarea" }
        ]}
      />
    </>
  );
}
