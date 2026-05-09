import Link from "next/link";
import { deleteProperty } from "@/app/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { money, titleFromEnum, dateShort } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await prisma.property.findUniqueOrThrow({
    where: { id },
    include: {
      agentProfile: true,
      investorProfile: true,
      leads: { orderBy: { createdAt: "desc" } },
      quotes: { orderBy: { createdAt: "desc" }, select: { id: true, quoteName: true, finalQuoteAmount: true, totalTarget: true, quoteStatus: true } },
      jobs: { orderBy: { updatedAt: "desc" }, select: { id: true, jobName: true, jobStatus: true, contractAmount: true } }
    }
  });

  return (
    <>
      <PageHeader
        title={property.propertyAddress}
        body={`${titleFromEnum(property.propertyType)} · ${property.city}, ${property.state}`}
        actionHref={`/properties/${property.id}/edit`}
        actionLabel="Edit property"
      />
      <div className="mb-5 flex justify-start">
        <form action={deleteProperty.bind(null, property.id)}>
          <ConfirmSubmitButton
            message={`Permanently delete "${property.propertyAddress}"? This cannot be undone.`}
            className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100"
          >
            Delete property
          </ConfirmSubmitButton>
        </form>
      </div>

      {/* Key stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Panel className="p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Estimated ARV</p>
          <p className="mt-2 text-3xl font-bold">{money(property.estimatedARV)}</p>
        </Panel>
        <Panel className="p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Related quotes</p>
          <p className="mt-2 text-3xl font-bold">{property.quotes.length}</p>
        </Panel>
        <Panel className="p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Related jobs</p>
          <p className="mt-2 text-3xl font-bold">{property.jobs.length}</p>
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-5">
          {/* Jobs */}
          <Panel className="p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="font-bold">Jobs at this property</h3>
              <Link href={`/jobs/new?propertyId=${property.id}`} className="text-xs font-bold text-primary hover:underline">+ New job</Link>
            </div>
            {property.jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No jobs linked yet.</p>
            ) : (
              <div className="grid gap-2">
                {property.jobs.map((job) => (
                  <Link key={job.id} href={`/jobs/${job.id}`} className="flex items-center justify-between gap-3 rounded-md border border-border px-4 py-3 text-sm hover:bg-muted transition">
                    <span className="font-semibold">{job.jobName}</span>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span>{money(job.contractAmount)}</span>
                      <span className="text-xs">{titleFromEnum(job.jobStatus)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Panel>

          {/* Quotes */}
          <Panel className="p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="font-bold">Estimates at this property</h3>
              <Link href={`/quotes/new?propertyId=${property.id}`} className="text-xs font-bold text-primary hover:underline">+ New estimate</Link>
            </div>
            {property.quotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No estimates linked yet.</p>
            ) : (
              <div className="grid gap-2">
                {property.quotes.map((q) => (
                  <Link key={q.id} href={`/quotes/${q.id}`} className="flex items-center justify-between gap-3 rounded-md border border-border px-4 py-3 text-sm hover:bg-muted transition">
                    <span className="font-semibold">{q.quoteName}</span>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span>{money(q.finalQuoteAmount ?? q.totalTarget)}</span>
                      <span className="text-xs">{titleFromEnum(q.quoteStatus)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Panel>

          {/* Leads */}
          {property.leads.length > 0 && (
            <Panel className="p-5">
              <h3 className="font-bold mb-4">Leads at this property</h3>
              <div className="grid gap-2">
                {property.leads.map((lead) => (
                  <Link key={lead.id} href={`/leads/${lead.id}`} className="flex items-center justify-between gap-3 rounded-md border border-border px-4 py-3 text-sm hover:bg-muted transition">
                    <span className="font-semibold">{lead.leadName}</span>
                    <span className="text-xs text-muted-foreground">{dateShort(lead.createdAt)}</span>
                  </Link>
                ))}
              </div>
            </Panel>
          )}
        </div>

        {/* Right sidebar */}
        <div className="grid gap-5 self-start">
          <Panel className="p-5">
            <h3 className="font-bold mb-3">Property details</h3>
            <dl className="grid gap-2 text-sm">
              <div><dt className="font-semibold text-muted-foreground">Type</dt><dd>{titleFromEnum(property.propertyType)}</dd></div>
              <div><dt className="font-semibold text-muted-foreground">City / State</dt><dd>{property.city}, {property.state} {property.zip}</dd></div>
              {property.occupancyStatus && <div><dt className="font-semibold text-muted-foreground">Occupancy</dt><dd>{property.occupancyStatus}</dd></div>}
              {property.ownerType && <div><dt className="font-semibold text-muted-foreground">Owner type</dt><dd>{property.ownerType}</dd></div>}
              {property.currentCondition && <div><dt className="font-semibold text-muted-foreground">Condition</dt><dd>{property.currentCondition}</dd></div>}
              {property.renovationGoal && <div><dt className="font-semibold text-muted-foreground">Renovation goal</dt><dd>{property.renovationGoal}</dd></div>}
            </dl>
          </Panel>

          {(property.agentProfile || property.investorProfile) && (
            <Panel className="p-5">
              <h3 className="font-bold mb-3">Related contacts</h3>
              <div className="grid gap-3 text-sm">
                {property.agentProfile && (
                  <div>
                    <p className="text-xs font-bold uppercase text-muted-foreground">Agent</p>
                    <Link href={`/profiles/${property.agentProfile.id}`} className="font-semibold text-primary hover:underline">{property.agentProfile.profileName}</Link>
                  </div>
                )}
                {property.investorProfile && (
                  <div>
                    <p className="text-xs font-bold uppercase text-muted-foreground">Investor / Owner</p>
                    <Link href={`/profiles/${property.investorProfile.id}`} className="font-semibold text-primary hover:underline">{property.investorProfile.profileName}</Link>
                  </div>
                )}
              </div>
            </Panel>
          )}

          {property.riskNotes && (
            <Panel className="p-5">
              <h3 className="font-bold mb-2">Risk notes</h3>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{property.riskNotes}</p>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
