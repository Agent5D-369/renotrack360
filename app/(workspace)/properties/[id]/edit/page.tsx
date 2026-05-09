import { updateProperty } from "@/app/actions";
import { AddressFields } from "@/components/address-fields";
import { EntityForm } from "@/components/entity-form";
import { PageHeader } from "@/components/page-header";
import { options, relationOptions } from "@/lib/form-options";
import { prisma } from "@/lib/prisma";

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [property, profiles] = await Promise.all([
    prisma.property.findUniqueOrThrow({ where: { id } }),
    prisma.profile.findMany({ select: { id: true, profileName: true }, orderBy: { profileName: "asc" } })
  ]);
  const saveProperty = updateProperty.bind(null, property.id);
  const profileOptions = relationOptions(profiles.map((p) => ({ id: p.id, label: p.profileName })));

  return (
    <>
      <PageHeader title={`Edit ${property.propertyAddress}`} body="Update property details, condition, ARV, related contacts, and risk notes." />
      <EntityForm
        formKey="property"
        action={saveProperty}
        submitLabel="Save property"
        fields={[
          { name: "propertyType", label: "Property type", type: "select", options: options.propertyTypes, defaultValue: property.propertyType },
          { name: "occupancyStatus", label: "Occupancy status", defaultValue: property.occupancyStatus },
          { name: "ownerType", label: "Owner type", defaultValue: property.ownerType },
          { name: "listingStatus", label: "Listing status", defaultValue: property.listingStatus },
          { name: "agentProfileId", label: "Agent", type: "select", options: profileOptions, defaultValue: property.agentProfileId, newHref: "/profiles/new" },
          { name: "investorProfileId", label: "Investor", type: "select", options: profileOptions, defaultValue: property.investorProfileId, newHref: "/profiles/new" },
          { name: "estimatedARV", label: "Estimated ARV", type: "number", defaultValue: Number(property.estimatedARV ?? 0) },
          { name: "currentCondition", label: "Current condition", defaultValue: property.currentCondition },
          { name: "renovationGoal", label: "Renovation goal", defaultValue: property.renovationGoal },
          { name: "riskNotes", label: "Risk notes", type: "textarea", defaultValue: property.riskNotes }
        ]}
      >
        <AddressFields
          defaultCountry={(property as { country?: string }).country ?? "US"}
          defaultAddress={property.propertyAddress}
          defaultCity={property.city}
          defaultState={property.state}
          defaultZip={property.zip}
        />
      </EntityForm>
    </>
  );
}
