import { requireStaffPage } from "@/lib/staff-access";
import { EntityForm } from "@/components/entity-form";
import { PageHeader } from "@/components/page-header";
import { createProfile } from "@/app/actions";
import { options, relationOptions } from "@/lib/form-options";
import { prisma } from "@/lib/prisma";

export default async function NewProfilePage() {
  await requireStaffPage();
  const [profiles, serviceTags] = await Promise.all([
    prisma.profile.findMany({ select: { id: true, profileName: true, profileKind: true }, orderBy: { profileName: "asc" } }),
    prisma.serviceTag.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { name: "asc" }] })
  ]);

  return (
    <>
      <PageHeader title="New contact" body="Create one clean relationship record. Connect it to companies, jobs, estimates, and follow-ups." />
      <EntityForm
        formKey="profile"
        action={createProfile}
        fields={[
          { name: "profileName", label: "Name" },
          { name: "profileKind", label: "Person or organization", type: "select", options: options.profileKinds, defaultValue: "PERSON" },
          { name: "profileType", label: "Role / type", type: "select", options: options.profileTypes },
          { name: "clientStatus", label: "Client status", type: "select", options: options.clientStatuses, defaultValue: "PROSPECT" },
          { name: "companyName", label: "Company name (text)" },
          { name: "companyProfileId", label: "Linked company profile", type: "select", options: relationOptions(profiles.map((p) => ({ id: p.id, label: `${p.profileName} (${p.profileKind.toLowerCase()})` }))) },

          { name: "_contact", label: "Contact info", type: "section" },
          { name: "phone", label: "Phone" },
          { name: "email", label: "Email", type: "email" },
          { name: "website", label: "Website" },
          { name: "location", label: "Location" },
          { name: "source", label: "Source / referral" },
          { name: "nextFollowUp", label: "Next follow-up", type: "date" },

          {
            name: "_scores",
            label: "Relationship scores",
            type: "section",
            helpText: "Rate 0–100. These feed the profile score used to prioritize relationship management."
          },
          { name: "relationshipStrength", label: "Relationship strength", type: "slider", defaultValue: 50 },
          { name: "trustLevel", label: "Trust level", type: "slider", defaultValue: 50 },
          { name: "leadPotential", label: "Lead potential", type: "slider", defaultValue: 50 },
          { name: "referralPotential", label: "Referral potential", type: "slider", defaultValue: 50 },

          { name: "_tags", label: "Service tags", type: "section" },
          { name: "serviceTagIds", label: "Service tags", type: "checkbox-group", options: serviceTags.map((tag) => ({ value: tag.id, label: `${tag.category}: ${tag.name}` })) },

          { name: "_compliance", label: "Vendor compliance", type: "section", helpText: "Only required for subcontractors and vendors." },
          { name: "w9Status", label: "W-9 status", type: "select", options: options.w9Statuses, defaultValue: "NOT_REQUIRED" },
          { name: "w9RequestedAt", label: "W-9 requested", type: "date" },
          { name: "w9ReceivedAt", label: "W-9 received", type: "date" },
          { name: "vendorOnboardingStatus", label: "Vendor onboarding", type: "select", options: options.vendorOnboardingStatuses, defaultValue: "NOT_STARTED" },
          { name: "insuranceExpiration", label: "Insurance expiration", type: "date" },
          { name: "complianceNotes", label: "Compliance notes", type: "textarea" },

          { name: "_notes", label: "Notes", type: "section" },
          { name: "notes", label: "Relationship notes", type: "textarea" }
        ]}
      />
    </>
  );
}
