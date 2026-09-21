import { requireStaffPage } from "@/lib/staff-access";
import { createProperty } from "@/app/actions";
import { AddressFields } from "@/components/address-fields";
import { EntityForm } from "@/components/entity-form";
import { PageHeader } from "@/components/page-header";
import { options, relationOptions } from "@/lib/form-options";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export default async function NewPropertyPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  await requireStaffPage();
  const { returnTo } = await searchParams;
  const [profiles, org] = await Promise.all([
    prisma.profile.findMany({ select: { id: true, profileName: true }, orderBy: { profileName: "asc" } }),
    prisma.organization.findUnique({ where: { id: DEFAULT_ORG_ID }, select: { country: true } })
  ]);
  const profileOptions = relationOptions(profiles.map((p) => ({ id: p.id, label: p.profileName })));
  const defaultCountry = (org as { country?: string } | null)?.country ?? "US";

  return (
    <>
      {returnTo && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-sm font-semibold text-primary">You came from a guide step. After saving, click below to continue.</p>
          <a href={returnTo} className="shrink-0 text-sm font-bold text-primary hover:underline">← Back to guide</a>
        </div>
      )}
      <PageHeader title="New property" body="Property-specific renovation context, owners, agents, risk notes, photos, and future job history." />
      <EntityForm
        formKey="property"
        action={createProperty}
        fields={[
          ...(returnTo ? [{ name: "returnTo", type: "hidden" as const, defaultValue: returnTo, label: "" }] : []),
          { name: "propertyType", label: "Property type", type: "select", options: options.propertyTypes },
          { name: "occupancyStatus", label: "Occupancy status" },
          { name: "ownerType", label: "Owner type" },
          { name: "listingStatus", label: "Listing status" },
          { name: "agentProfileId", label: "Agent profile", type: "select", options: profileOptions, newHref: "/profiles/new" },
          { name: "investorProfileId", label: "Investor profile", type: "select", options: profileOptions, newHref: "/profiles/new" },
          { name: "estimatedARV", label: "Estimated ARV", type: "number" },
          { name: "currentCondition", label: "Current condition" },
          { name: "renovationGoal", label: "Renovation goal" },
          { name: "riskNotes", label: "Risk notes", type: "textarea" }
        ]}
      >
        <AddressFields defaultCountry={defaultCountry} />
      </EntityForm>
    </>
  );
}
