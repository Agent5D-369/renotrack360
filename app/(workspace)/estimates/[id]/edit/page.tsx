import { requireStaffPage } from "@/lib/staff-access";
import { updateEstimate } from "@/app/actions";
import { EntityForm } from "@/components/entity-form";
import { PageHeader } from "@/components/page-header";
import { options } from "@/lib/form-options";
import { prisma } from "@/lib/prisma";
import { estimateInOrganization } from "@/lib/company-scope";
import { notFound } from "next/navigation";

export default async function EditEstimatePage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireStaffPage();
  const { id } = await params;
  const estimate = await prisma.estimate.findFirst({ where: estimateInOrganization(actor.organizationId, { id }) });
  if (!estimate) notFound();
  const saveEstimate = updateEstimate.bind(null, estimate.id);

  return (
    <>
      <PageHeader title={`Edit ${estimate.estimateNumber}`} body="Update estimate status, readiness, confidence, follow-up date, and client-facing summary." />
      <EntityForm
        formKey="estimate"
        action={saveEstimate}
        submitLabel="Save estimate"
        fields={[
          { name: "status", label: "Status", type: "select", options: options.estimateStatuses, defaultValue: estimate.status },
          { name: "confidenceLevel", label: "Confidence level", type: "select", options: options.confidenceLevels, defaultValue: estimate.confidenceLevel },
          { name: "confidenceScore", label: "Confidence score (0–100)", type: "number", defaultValue: estimate.confidenceScore },
          { name: "readinessScore", label: "Readiness score (0–100)", type: "number", defaultValue: estimate.readinessScore },
          { name: "scopeClarity", label: "Scope clarity (0–100)", type: "number", defaultValue: estimate.scopeClarity },
          { name: "expirationDate", label: "Expiration date", type: "date", defaultValue: estimate.expirationDate?.toISOString().slice(0, 10) },
          { name: "nextFollowUpDue", label: "Next follow-up due", type: "date", defaultValue: estimate.nextFollowUpDue?.toISOString().slice(0, 10) },
          { name: "clientFacingSummary", label: "Client-facing summary", type: "textarea", defaultValue: estimate.clientFacingSummary },
          { name: "internalRiskNotes", label: "Internal risk notes", type: "textarea", defaultValue: estimate.internalRiskNotes },
          { name: "notes", label: "Notes", type: "textarea", defaultValue: estimate.notes },
          { name: "terms", label: "Terms", type: "textarea", defaultValue: estimate.terms }
        ]}
      />
    </>
  );
}
