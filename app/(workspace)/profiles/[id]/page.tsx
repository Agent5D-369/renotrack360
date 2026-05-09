import Link from "next/link";
import { createProfileRelationship, deleteProfile, deleteProfileRelationship } from "@/app/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PageHeader } from "@/components/page-header";
import { LinkButton, Panel } from "@/components/ui";
import { StatusPill } from "@/components/status-pill";
import { profileScore } from "@/lib/calculations";
import { dateShort, money, titleFromEnum } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function ProfileDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [profile, allProfiles] = await Promise.all([
    prisma.profile.findUniqueOrThrow({
      where: { id },
      include: {
        leads: { orderBy: { createdAt: "desc" }, take: 5 },
        quotes: { orderBy: { createdAt: "desc" }, take: 5, select: { id: true, quoteName: true, finalQuoteAmount: true, totalTarget: true, quoteStatus: true } },
        jobs: { orderBy: { updatedAt: "desc" }, take: 5, select: { id: true, jobName: true, jobStatus: true, contractAmount: true } },
        activities: { orderBy: { createdAt: "desc" }, take: 3 },
        companyProfile: true,
        companyContacts: { orderBy: { profileName: "asc" } },
        serviceTags: { include: { serviceTag: true } },
        relationshipsFrom: { include: { toProfile: true } },
        relationshipsTo: { include: { fromProfile: true } }
      }
    }),
    prisma.profile.findMany({ select: { id: true, profileName: true, profileType: true }, orderBy: { profileName: "asc" } })
  ]);
  const otherProfiles = allProfiles.filter((p) => p.id !== id);
  const hasComplianceData = profile.w9Status !== "NOT_REQUIRED" || profile.vendorOnboardingStatus !== "NOT_STARTED" || profile.insuranceExpiration || profile.complianceNotes;

  return (
    <>
      <PageHeader
        title={profile.profileName}
        body={`${titleFromEnum(profile.profileKind)} · ${titleFromEnum(profile.profileType)} · ${titleFromEnum(profile.clientStatus)}`}
      />
      <div className="-mt-3 mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">Score: {profileScore(profile)}</p>
          <form action={deleteProfile.bind(null, profile.id)}>
            <ConfirmSubmitButton
              message={`Permanently delete "${profile.profileName}"? This will also remove all related data.`}
              className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100"
            >
              Delete contact
            </ConfirmSubmitButton>
          </form>
        </div>
        <LinkButton href={`/profiles/${profile.id}/edit`} variant="secondary">Edit profile</LinkButton>
      </div>

      {/* Contact bar — tap to call/email is #1 priority */}
      <Panel className="mb-5 p-4">
        <div className="flex flex-wrap gap-4">
          {profile.phone ? (
            <a href={`tel:${profile.phone}`} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted transition">
              <span className="text-base">📞</span> {profile.phone}
            </a>
          ) : (
            <span className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2.5 text-sm text-muted-foreground">No phone</span>
          )}
          {profile.email ? (
            <a href={`mailto:${profile.email}`} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted transition">
              <span className="text-base">✉</span> {profile.email}
            </a>
          ) : (
            <span className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2.5 text-sm text-muted-foreground">No email</span>
          )}
          {(profile.companyProfile || profile.companyName) && (
            <span className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">🏢</span>
              {profile.companyProfile
                ? <Link href={`/profiles/${profile.companyProfile.id}`} className="font-semibold text-primary hover:underline">{profile.companyProfile.profileName}</Link>
                : <span className="font-semibold">{profile.companyName}</span>}
            </span>
          )}
          {profile.nextFollowUp && (
            <span className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800">
              <span>📅</span> Follow up {dateShort(profile.nextFollowUp)}
            </span>
          )}
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Left column */}
        <div className="grid gap-5">
          {/* Notes + scores */}
          <Panel className="p-5">
            <div className="flex items-start justify-between gap-4 mb-3">
              <h3 className="font-bold">Notes</h3>
              <div className="flex shrink-0 gap-3 text-xs">
                {([["Rel", profile.relationshipStrength], ["Trust", profile.trustLevel], ["Lead", profile.leadPotential], ["Ref", profile.referralPotential]] as [string, number | null][]).map(([label, val]) => (
                  <div key={label} className="text-center">
                    <div className="font-black text-lg leading-none">{val ?? "-"}</div>
                    <div className="text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>
            </div>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">{profile.notes || "No notes yet. Edit this contact to add relationship context."}</p>
          </Panel>

          {/* Jobs */}
          <Panel className="p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="font-bold">Jobs <span className="text-muted-foreground font-normal">({profile.jobs.length})</span></h3>
              <Link href={`/jobs/new?clientProfileId=${id}`} className="text-xs font-bold text-primary hover:underline">+ New job</Link>
            </div>
            {profile.jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No jobs yet.</p>
            ) : (
              <div className="grid gap-2">
                {profile.jobs.map((job) => (
                  <Link key={job.id} href={`/jobs/${job.id}`} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5 text-sm hover:bg-muted transition">
                    <span className="font-semibold">{job.jobName}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-muted-foreground">{money(job.contractAmount)}</span>
                      <StatusPill value={job.jobStatus} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Panel>

          {/* Quotes */}
          <Panel className="p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="font-bold">Estimates <span className="text-muted-foreground font-normal">({profile.quotes.length})</span></h3>
              <Link href={`/quotes/new?clientProfileId=${id}`} className="text-xs font-bold text-primary hover:underline">+ New estimate</Link>
            </div>
            {profile.quotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No estimates yet.</p>
            ) : (
              <div className="grid gap-2">
                {profile.quotes.map((q) => (
                  <Link key={q.id} href={`/quotes/${q.id}`} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5 text-sm hover:bg-muted transition">
                    <span className="font-semibold">{q.quoteName}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-muted-foreground">{money(q.finalQuoteAmount ?? q.totalTarget)}</span>
                      <StatusPill value={q.quoteStatus} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* Right column */}
        <div className="grid gap-5 self-start">
          {/* Service tags */}
          {profile.serviceTags.length > 0 && (
            <Panel className="p-4">
              <h3 className="font-bold mb-3">Service tags</h3>
              <div className="flex flex-wrap gap-2">
                {profile.serviceTags.map((tag) => (
                  <span key={tag.serviceTagId} className="rounded-md bg-muted px-2 py-1 text-xs font-bold">{tag.serviceTag.name}</span>
                ))}
              </div>
            </Panel>
          )}

          {/* Company contacts (when this is a company profile) */}
          {profile.companyContacts.length > 0 && (
            <Panel className="p-4">
              <h3 className="font-bold mb-3">People at this company</h3>
              <div className="grid gap-2 text-sm">
                {profile.companyContacts.map((c) => (
                  <Link key={c.id} href={`/profiles/${c.id}`} className="font-semibold text-primary hover:underline">{c.profileName}</Link>
                ))}
              </div>
            </Panel>
          )}

          {/* Related profiles */}
          <Panel className="p-4">
            <h3 className="font-bold mb-3">Relationships</h3>
            <div className="grid gap-2 text-sm">
              {[
                ...profile.relationshipsFrom.map((r) => ({ relId: r.id, id: r.toProfile.id, name: r.toProfile.profileName, type: r.relationshipType })),
                ...profile.relationshipsTo.map((r) => ({ relId: r.id, id: r.fromProfile.id, name: r.fromProfile.profileName, type: r.relationshipType }))
              ].map((rel) => (
                <div key={rel.relId} className="flex items-center justify-between gap-2">
                  <Link href={`/profiles/${rel.id}`} className="font-semibold text-primary hover:underline">
                    {rel.name} <span className="font-normal text-muted-foreground text-xs">({rel.type})</span>
                  </Link>
                  <form action={deleteProfileRelationship}>
                    <input type="hidden" name="id" value={rel.relId} />
                    <input type="hidden" name="profileId" value={id} />
                    <button type="submit" className="text-xs text-red-500 hover:text-red-700">Remove</button>
                  </form>
                </div>
              ))}
              {!profile.relationshipsFrom.length && !profile.relationshipsTo.length && (
                <p className="text-muted-foreground text-xs">No relationships yet.</p>
              )}
            </div>
            <details className="mt-3 rounded-md bg-muted/40 p-3">
              <summary className="cursor-pointer text-sm font-bold text-primary">+ Add relationship</summary>
              <form action={createProfileRelationship} className="mt-3 grid gap-3">
                <input type="hidden" name="fromProfileId" value={id} />
                <select name="toProfileId" required className="h-9 rounded-md border border-border bg-white px-2 text-sm outline-none focus:ring-2 focus:ring-primary">
                  <option value="">Select contact...</option>
                  {otherProfiles.map((p) => (
                    <option key={p.id} value={p.id}>{p.profileName} ({p.profileType.toLowerCase().replaceAll("_", " ")})</option>
                  ))}
                </select>
                <input name="relationshipType" required list="rel-types" placeholder="Relationship type..." className="h-9 rounded-md border border-border bg-white px-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
                <datalist id="rel-types">
                  {["Referral source", "Referred by", "Colleague", "Vendor", "Subcontractor", "Partner", "Investor", "Client", "Agent", "Lender", "Attorney", "Parent company", "Subsidiary"].map((t) => <option key={t} value={t} />)}
                </datalist>
                <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90">Save</button>
              </form>
            </details>
          </Panel>
        </div>
      </div>

      {/* Vendor compliance — only when relevant */}
      {hasComplianceData && (
        <Panel className="mt-5 p-5">
          <h3 className="font-bold mb-3">Vendor compliance</h3>
          <dl className="grid gap-3 text-sm md:grid-cols-4">
            <div><dt className="font-semibold text-muted-foreground">W-9 status</dt><dd>{titleFromEnum(profile.w9Status)}</dd></div>
            <div><dt className="font-semibold text-muted-foreground">W-9 received</dt><dd>{dateShort(profile.w9ReceivedAt)}</dd></div>
            <div><dt className="font-semibold text-muted-foreground">Onboarding</dt><dd>{titleFromEnum(profile.vendorOnboardingStatus)}</dd></div>
            <div><dt className="font-semibold text-muted-foreground">Insurance expires</dt><dd>{dateShort(profile.insuranceExpiration)}</dd></div>
          </dl>
          {profile.complianceNotes && <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{profile.complianceNotes}</p>}
        </Panel>
      )}
    </>
  );
}
