import { requireStaffPage } from "@/lib/staff-access";
import { updateProfile } from "@/app/actions";
import { EntityForm } from "@/components/entity-form";
import { PageHeader } from "@/components/page-header";
import { options, relationOptions } from "@/lib/form-options";
import { prisma } from "@/lib/prisma";
import { profileInOrganization, serviceTagInOrganization } from "@/lib/company-scope";
import { notFound } from "next/navigation";

export default async function EditProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireStaffPage();
  const { id } = await params;
  const [profile, profiles, serviceTags] = await Promise.all([
    prisma.profile.findFirst({ where: profileInOrganization(actor.organizationId, { id, OR: [{ companyProfileId: null }, { companyProfile: { organizationId: actor.organizationId } }] }), include: { serviceTags: { where: { serviceTag: serviceTagInOrganization(actor.organizationId) } } } }),
    prisma.profile.findMany({ where: profileInOrganization(actor.organizationId, { NOT: { id } }), select: { id: true, profileName: true, profileKind: true }, orderBy: { profileName: "asc" } }),
    prisma.serviceTag.findMany({ where: serviceTagInOrganization(actor.organizationId, { active: true }), orderBy: [{ category: "asc" }, { name: "asc" }] })
  ]);
  if (!profile) notFound();
  const selectedTags = new Set(profile.serviceTags.map((tag) => tag.serviceTagId));

  return (
    <>
      <PageHeader title={`Edit ${profile.profileName}`} body="Keep one clean profile record, then use role, client status, company links, and service tags to describe it." />
      <EntityForm
        formKey="profile"
        action={updateProfile.bind(null, profile.id)}
        submitLabel="Save profile"
        fields={[
          // Identity
          { name: "profileName", label: "Name", defaultValue: profile.profileName },
          { name: "profileKind", label: "Person or organization", type: "select", options: options.profileKinds, defaultValue: profile.profileKind },
          { name: "profileType", label: "Role / type", type: "select", options: options.profileTypes, defaultValue: profile.profileType },
          { name: "clientStatus", label: "Client status", type: "select", options: options.clientStatuses, defaultValue: profile.clientStatus },
          { name: "companyName", label: "Company name (text)", defaultValue: profile.companyName },
          { name: "companyProfileId", label: "Linked company profile", type: "select", options: relationOptions(profiles.map((p) => ({ id: p.id, label: `${p.profileName} (${p.profileKind.toLowerCase()})` }))), defaultValue: profile.companyProfileId },

          // Contact info
          { name: "_contact", label: "Contact info", type: "section" },
          { name: "phone", label: "Phone", defaultValue: profile.phone },
          { name: "email", label: "Email", type: "email", defaultValue: profile.email },
          { name: "website", label: "Website", defaultValue: profile.website },
          { name: "location", label: "Location", defaultValue: profile.location },
          { name: "source", label: "Source / referral", defaultValue: profile.source },
          { name: "nextFollowUp", label: "Next follow-up", type: "date", defaultValue: profile.nextFollowUp ? profile.nextFollowUp.toISOString().slice(0, 10) : "" },

          // Relationship scores
          {
            name: "_scores",
            label: "Relationship scores",
            type: "section",
            helpText: "Rate 0–100. These feed the profile score used to prioritize relationship management."
          },
          { name: "relationshipStrength", label: "Relationship strength", type: "slider", defaultValue: profile.relationshipStrength ?? 50 },
          { name: "trustLevel", label: "Trust level", type: "slider", defaultValue: profile.trustLevel ?? 50 },
          { name: "leadPotential", label: "Lead potential", type: "slider", defaultValue: profile.leadPotential ?? 50 },
          { name: "referralPotential", label: "Referral potential", type: "slider", defaultValue: profile.referralPotential ?? 50 },

          // Service tags
          { name: "_tags", label: "Service tags", type: "section" },
          { name: "serviceTagIds", label: "Service tags", type: "checkbox-group", options: serviceTags.map((tag) => ({ value: tag.id, label: `${tag.category}: ${tag.name}`, checked: selectedTags.has(tag.id) })) },

          // Vendor / compliance (only relevant for subs / vendors)
          { name: "_compliance", label: "Vendor compliance", type: "section", helpText: "Only required for subcontractors and vendors on your jobs." },
          { name: "w9Status", label: "W-9 status", type: "select", options: options.w9Statuses, defaultValue: profile.w9Status },
          { name: "w9RequestedAt", label: "W-9 requested", type: "date", defaultValue: profile.w9RequestedAt ? profile.w9RequestedAt.toISOString().slice(0, 10) : "" },
          { name: "w9ReceivedAt", label: "W-9 received", type: "date", defaultValue: profile.w9ReceivedAt ? profile.w9ReceivedAt.toISOString().slice(0, 10) : "" },
          { name: "vendorOnboardingStatus", label: "Vendor onboarding", type: "select", options: options.vendorOnboardingStatuses, defaultValue: profile.vendorOnboardingStatus },
          { name: "insuranceExpiration", label: "Insurance expiration", type: "date", defaultValue: profile.insuranceExpiration ? profile.insuranceExpiration.toISOString().slice(0, 10) : "" },
          { name: "complianceNotes", label: "Compliance notes", type: "textarea", defaultValue: profile.complianceNotes },

          // Notes
          { name: "_notes", label: "Notes", type: "section" },
          { name: "notes", label: "Relationship notes", type: "textarea", defaultValue: profile.notes }
        ]}
      />
    </>
  );
}
