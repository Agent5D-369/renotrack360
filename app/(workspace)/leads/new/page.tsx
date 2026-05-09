import { EntityForm } from "@/components/entity-form";
import { PageHeader } from "@/components/page-header";
import { createLead } from "@/app/actions";
import { options, relationOptions } from "@/lib/form-options";
import { prisma } from "@/lib/prisma";

export default async function NewLeadPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const { returnTo } = await searchParams;
  const [profiles, properties, users] = await Promise.all([
    prisma.profile.findMany({ select: { id: true, profileName: true } }),
    prisma.property.findMany({ select: { id: true, propertyAddress: true } }),
    prisma.user.findMany({ select: { id: true, name: true, email: true }, orderBy: { email: "asc" } })
  ]);
  return (
    <>
      {returnTo && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-sm font-semibold text-primary">You came from a guide step. After saving, click the link below to continue.</p>
          <a href={returnTo} className="shrink-0 text-sm font-bold text-primary hover:underline">← Back to guide</a>
        </div>
      )}
      <PageHeader title="New lead" body="Track opportunity quality, trust fit, urgency, financing need, and next action." />
      <EntityForm
        formKey="lead"
        action={createLead}
        fields={[
          ...(returnTo ? [{ name: "returnTo", type: "hidden" as const, defaultValue: returnTo, label: "" }] : []),
          { name: "leadName", label: "Lead name" },
          { name: "leadType", label: "Lead type", placeholder: "Residential remodel, commercial buildout, investor turn..." },
          { name: "source", label: "Source", placeholder: "Referral, agent, website, past client..." },
          { name: "ownerUserId", label: "Owner / rep", type: "select", options: relationOptions(users.map((u) => ({ id: u.id, label: u.name ?? u.email ?? "User" }))) },
          { name: "relatedProfileId", label: "Related contact", type: "select", options: relationOptions(profiles.map((p) => ({ id: p.id, label: p.profileName }))), newHref: "/profiles/new" },
          { name: "relatedPropertyId", label: "Related property", type: "select", options: relationOptions(properties.map((p) => ({ id: p.id, label: p.propertyAddress }))), newHref: "/properties/new" },
          { name: "status", label: "Stage", type: "select", options: options.leadStages, defaultValue: "NEW_LEAD" },
          { name: "estimatedBudget", label: "Estimated budget ($)", type: "number" },
          { name: "financingNeed", label: "Client needs financing", type: "checkbox" },

          {
            name: "_scores",
            label: "Scoring",
            type: "section",
            helpText: "Rate 0–100. Feeds the priority calculation used to rank your pipeline."
          },
          { name: "urgency", label: "Urgency", type: "slider", defaultValue: 50 },
          { name: "probability", label: "Win probability", type: "slider", defaultValue: 50 },
          { name: "jobFitScore", label: "Job fit", type: "slider", defaultValue: 50 },
          { name: "trustFitScore", label: "Trust fit", type: "slider", defaultValue: 50 },
          { name: "scopeClarity", label: "Scope clarity", type: "slider", defaultValue: 50 },

          { name: "_followup", label: "Follow-up", type: "section" },
          { name: "nextAction", label: "Next action", placeholder: "Call to discuss scope, send estimate, schedule site visit..." },
          { name: "followUpDate", label: "Follow-up date", type: "date" },
          { name: "notes", label: "Notes", type: "textarea" }
        ]}
      />
    </>
  );
}
