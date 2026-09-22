import { requireStaffPage } from "@/lib/staff-access";
﻿import { updateLead } from "@/app/actions";
import { EntityForm } from "@/components/entity-form";
import { PageHeader } from "@/components/page-header";
import { options, relationOptions } from "@/lib/form-options";
import { prisma } from "@/lib/prisma";
import { leadInOrganization, profileInOrganization, propertyInOrganization, userInOrganization } from "@/lib/company-scope";
import { notFound } from "next/navigation";

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireStaffPage();
  const { id } = await params;
  const [lead, profiles, properties, users] = await Promise.all([
    prisma.lead.findFirst({ where: leadInOrganization(actor.organizationId, { id }) }),
    prisma.profile.findMany({ where: profileInOrganization(actor.organizationId), select: { id: true, profileName: true }, orderBy: { profileName: "asc" } }),
    prisma.property.findMany({ where: propertyInOrganization(actor.organizationId), select: { id: true, propertyAddress: true }, orderBy: { propertyAddress: "asc" } }),
    prisma.user.findMany({ where: userInOrganization(actor.organizationId), select: { id: true, name: true, email: true }, orderBy: { email: "asc" } })
  ]);
  if (!lead) notFound();

  return (
    <>
      <PageHeader title={`Edit ${lead.leadName}`} body="Update ownership, stage, scores, next action, and follow-up details." />
      <EntityForm
        formKey="lead"
        action={updateLead.bind(null, lead.id)}
        submitLabel="Save lead"
        fields={[
          { name: "leadName", label: "Lead name", defaultValue: lead.leadName },
          { name: "leadType", label: "Lead type", defaultValue: lead.leadType },
          { name: "source", label: "Source", defaultValue: lead.source },
          { name: "ownerUserId", label: "Owner / rep", type: "select", options: relationOptions(users.map((u) => ({ id: u.id, label: u.name ?? u.email ?? "User" }))), defaultValue: lead.ownerUserId },
          { name: "relatedProfileId", label: "Related contact", type: "select", options: relationOptions(profiles.map((p) => ({ id: p.id, label: p.profileName }))), defaultValue: lead.relatedProfileId, newHref: "/profiles/new" },
          { name: "relatedPropertyId", label: "Related property", type: "select", options: relationOptions(properties.map((p) => ({ id: p.id, label: p.propertyAddress }))), defaultValue: lead.relatedPropertyId, newHref: "/properties/new" },
          { name: "status", label: "Stage", type: "select", options: options.leadStages, defaultValue: lead.status },
          { name: "estimatedBudget", label: "Estimated budget ($)", type: "number", defaultValue: Number(lead.estimatedBudget ?? 0) },
          { name: "financingNeed", label: "Client needs financing", type: "checkbox", defaultValue: lead.financingNeed },

          // Scoring section - sliders
          {
            name: "_scores",
            label: "Scoring",
            type: "section",
            helpText: "Rate 0–100. These four scores feed the priority calculation used to rank your pipeline."
          },
          { name: "urgency", label: "Urgency", type: "slider", defaultValue: lead.urgency ?? 50 },
          { name: "probability", label: "Win probability", type: "slider", defaultValue: lead.probability ?? 50 },
          { name: "jobFitScore", label: "Job fit", type: "slider", defaultValue: lead.jobFitScore ?? 50 },
          { name: "trustFitScore", label: "Trust fit", type: "slider", defaultValue: lead.trustFitScore ?? 50 },
          { name: "scopeClarity", label: "Scope clarity", type: "slider", defaultValue: lead.scopeClarity ?? 50 },

          // Follow-up section
          {
            name: "_followup",
            label: "Follow-up",
            type: "section",
            helpText: "Track what happens next and when to circle back."
          },
          { name: "nextAction", label: "Next action", defaultValue: lead.nextAction },
          { name: "followUpDate", label: "Follow-up date", type: "date", defaultValue: lead.followUpDate ? lead.followUpDate.toISOString().slice(0, 10) : "" },
          { name: "notes", label: "Notes", type: "textarea", defaultValue: lead.notes }
        ]}
      />
    </>
  );
}
