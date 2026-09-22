import { requireStaffPage } from "@/lib/staff-access";
import { updateQuote } from "@/app/actions";
import { EntityForm } from "@/components/entity-form";
import { PageHeader } from "@/components/page-header";
import { options, relationOptions } from "@/lib/form-options";
import { prisma } from "@/lib/prisma";
import { leadInOrganization, profileInOrganization, propertyInOrganization, quoteInOrganization } from "@/lib/company-scope";
import { notFound } from "next/navigation";

export default async function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireStaffPage();
  const { id } = await params;
  const [quote, profiles, properties, leads] = await Promise.all([
    prisma.quote.findFirst({ where: quoteInOrganization(actor.organizationId, { id }) }),
    prisma.profile.findMany({ where: profileInOrganization(actor.organizationId), select: { id: true, profileName: true }, orderBy: { profileName: "asc" } }),
    prisma.property.findMany({ where: propertyInOrganization(actor.organizationId), select: { id: true, propertyAddress: true }, orderBy: { propertyAddress: "asc" } }),
    prisma.lead.findMany({ where: leadInOrganization(actor.organizationId), select: { id: true, leadName: true }, orderBy: { leadName: "asc" } })
  ]);
  if (!quote) notFound();
  const saveQuote = updateQuote.bind(null, quote.id);

  return (
    <>
      <PageHeader title={`Edit ${quote.quoteName}`} body="Update quote details, markup, contingency, status, and risk level." />
      <EntityForm
        formKey="quote"
        action={saveQuote}
        submitLabel="Save quote"
        fields={[
          { name: "quoteName", label: "Quote name", defaultValue: quote.quoteName },
          { name: "clientProfileId", label: "Client", type: "select", options: relationOptions(profiles.map((p) => ({ id: p.id, label: p.profileName }))), defaultValue: quote.clientProfileId, newHref: "/profiles/new" },
          { name: "propertyId", label: "Property", type: "select", options: relationOptions(properties.map((p) => ({ id: p.id, label: p.propertyAddress }))), defaultValue: quote.propertyId, newHref: "/properties/new" },
          { name: "leadId", label: "Lead", type: "select", options: relationOptions(leads.map((l) => ({ id: l.id, label: l.leadName }))), defaultValue: quote.leadId, newHref: "/leads/new" },
          { name: "quoteStatus", label: "Status", type: "select", options: options.quoteStatuses, defaultValue: quote.quoteStatus },
          { name: "riskLevel", label: "Risk level", type: "select", options: options.riskLevels, defaultValue: quote.riskLevel },
          { name: "targetSendDate", label: "Target send date", type: "date", defaultValue: quote.targetSendDate?.toISOString().slice(0, 10) },
          { name: "projectType", label: "Project type", defaultValue: quote.projectType },
          { name: "budgetRange", label: "Budget range", defaultValue: quote.budgetRange },
          { name: "gcMarkup", label: "GC markup %", type: "number", defaultValue: Number(quote.gcMarkup) },
          { name: "contingency", label: "Contingency %", type: "number", defaultValue: Number(quote.contingency) },
          { name: "finalQuoteAmount", label: "Final quote amount", type: "number", defaultValue: Number(quote.finalQuoteAmount ?? 0) },
          { name: "siteVisitRequired", label: "Site visit required", type: "checkbox", defaultValue: quote.siteVisitRequired },
          { name: "paidSiteVisit", label: "Paid site visit / consultation", type: "checkbox", defaultValue: quote.paidSiteVisit },
          { name: "consultationFee", label: "Consultation fee ($)", type: "number", defaultValue: Number(quote.consultationFee ?? 0), helpText: "Creates a deposit invoice when paid site visit is enabled." },
          { name: "permitLikely", label: "Permit likely", type: "checkbox", defaultValue: quote.permitLikely },
          { name: "notes", label: "Notes", type: "textarea", defaultValue: quote.notes }
        ]}
      />
    </>
  );
}
