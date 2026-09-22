import { requireStaffPage } from "@/lib/staff-access";
import Link from "next/link";
import { DataTable } from "@/components/data-table";
import { StatusPill } from "@/components/status-pill";
import { profileScore } from "@/lib/calculations";
import { dateShort } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { profileInOrganization, serviceTagInOrganization } from "@/lib/company-scope";

const KIND_FILTERS = [
  { label: "All contacts", kind: undefined, type: undefined },
  { label: "People", kind: "PERSON", type: undefined },
  { label: "Companies / Orgs", kind: "ORGANIZATION", type: undefined },
] as const;

const TYPE_FILTERS = [
  { label: "Clients", type: "CLIENT" },
  { label: "Vendors", type: "VENDOR" },
  { label: "Subs", type: "SUBCONTRACTOR" },
  { label: "Realtors", type: "REALTOR" },
  { label: "Investors", type: "INVESTOR" },
  { label: "Attorneys", type: "ATTORNEY" },
] as const;

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; type?: string }>;
}) {
  const actor = await requireStaffPage();
  const { kind, type } = await searchParams;

  const where: Prisma.ProfileWhereInput = {};
  if (kind) where.profileKind = kind as Prisma.ProfileWhereInput["profileKind"];
  if (type) where.profileType = type as Prisma.ProfileWhereInput["profileType"];

  const profiles = await prisma.profile.findMany({
    where: profileInOrganization(actor.organizationId, { AND: [where, {
      OR: [{ companyProfileId: null }, { companyProfile: { organizationId: actor.organizationId } }],
    }] }),
    include: { serviceTags: { where: { serviceTag: serviceTagInOrganization(actor.organizationId) }, include: { serviceTag: true } }, companyProfile: true },
    orderBy: { updatedAt: "desc" }
  });

  const activeKind = kind ?? "";
  const activeType = type ?? "";

  return (
    <div className="grid gap-4">
      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {KIND_FILTERS.map((f) => {
          const isActive = f.kind ? activeKind === f.kind : !activeKind && !activeType;
          const href = f.kind ? `/profiles?kind=${f.kind}` : "/profiles";
          return (
            <Link
              key={f.label}
              href={href}
              className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-white text-foreground hover:bg-muted"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
        <span className="self-center text-muted-foreground text-xs px-1">|</span>
        {TYPE_FILTERS.map((f) => {
          const isActive = activeType === f.type;
          const href = `/profiles?type=${f.type}`;
          return (
            <Link
              key={f.label}
              href={href}
              className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-white text-foreground hover:bg-muted"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <DataTable
        title={type ? `${type.charAt(0) + type.slice(1).toLowerCase().replace("_", " ")}s` : kind === "PERSON" ? "People" : kind === "ORGANIZATION" ? "Companies and Orgs" : "Contacts"}
        actionHref="/profiles/new"
        actionLabel="New contact"
        detailBasePath="/profiles"
        editBasePath="/profiles"
        rows={profiles}
        emptyTitle="No contacts match this filter"
        emptyBody="Try a different filter or add a new contact."
        emptyActionHref="/profiles/new"
        emptyActionLabel="Add contact"
        columns={[
          { header: "Name", cell: (row) => <span className="font-semibold">{row.profileName}</span> },
          { header: "Kind", cell: (row) => <StatusPill value={row.profileKind} /> },
          { header: "Type", cell: (row) => <StatusPill value={row.profileType} /> },
          { header: "Company", cell: (row) => row.companyProfile?.profileName ?? row.companyName ?? "Independent" },
          { header: "Services", cell: (row) => row.serviceTags.slice(0, 3).map((tag) => tag.serviceTag.name).join(", ") || "-" },
          { header: "Score", cell: (row) => profileScore(row) },
          { header: "Next follow-up", cell: (row) => dateShort(row.nextFollowUp) }
        ]}
      />
    </div>
  );
}
