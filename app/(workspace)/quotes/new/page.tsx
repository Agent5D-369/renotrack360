import { requireStaffPage } from "@/lib/staff-access";
import { createQuote } from "@/app/actions";
import { EntityForm } from "@/components/entity-form";
import { PageHeader } from "@/components/page-header";
import { options, relationOptions } from "@/lib/form-options";
import { prisma } from "@/lib/prisma";

export default async function NewQuotePage() {
  await requireStaffPage();
  const [profiles, properties, leads] = await Promise.all([
    prisma.profile.findMany({ select: { id: true, profileName: true } }),
    prisma.property.findMany({ select: { id: true, propertyAddress: true } }),
    prisma.lead.findMany({ select: { id: true, leadName: true } })
  ]);
  return (
    <>
      <PageHeader title="New quote" body="Turn a lead into structured scope, catalog-driven pricing, markup, contingency, and a client-facing estimate." />
      <EntityForm
        formKey="quote"
        action={createQuote}
        fields={[
          { name: "quoteName", label: "Quote name" },
          { name: "clientProfileId", label: "Client", type: "select", options: relationOptions(profiles.map((p) => ({ id: p.id, label: p.profileName }))) },
          { name: "propertyId", label: "Property", type: "select", options: relationOptions(properties.map((p) => ({ id: p.id, label: p.propertyAddress }))) },
          { name: "leadId", label: "Lead", type: "select", options: relationOptions(leads.map((l) => ({ id: l.id, label: l.leadName }))) },
          { name: "quoteStatus", label: "Status", type: "select", options: options.quoteStatuses, defaultValue: "INTAKE_NEEDED" },
          { name: "targetSendDate", label: "Target send date", type: "date" },
          { name: "projectType", label: "Project type" },
          { name: "budgetRange", label: "Budget range" },
          { name: "siteVisitRequired", label: "Site visit required", type: "checkbox", defaultValue: true },
          { name: "paidSiteVisit", label: "Paid site visit / consultation", type: "checkbox", helpText: "Check if the client is paying for the walkthrough before scope work begins." },
          { name: "consultationFee", label: "Consultation fee ($)", type: "number", helpText: "Creates a deposit invoice when paid site visit is checked." },
          { name: "permitLikely", label: "Permit likely", type: "checkbox" },
          { name: "riskLevel", label: "Risk level", type: "select", options: options.riskLevels, defaultValue: "MEDIUM" },
          { name: "gcMarkup", label: "GC markup %", type: "number", defaultValue: 18 },
          { name: "contingency", label: "Contingency %", type: "number", defaultValue: 8 },
          { name: "finalQuoteAmount", label: "Manual final amount", type: "number" },
          { name: "notes", label: "Notes", type: "textarea" }
        ]}
      />
    </>
  );
}
