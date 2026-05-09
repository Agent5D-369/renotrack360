import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { LinkButton, Panel } from "@/components/ui";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function FinancingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = await prisma.financing.findUniqueOrThrow({
    where: { id },
    include: { clientProfile: true, quote: true, job: true }
  });

  return (
    <>
      <PageHeader
        title={record.clientProfile?.profileName ?? "Financing record"}
        body="Financing record detail"
      />
      <div className="mb-4">
        <Link href="/financing" className="text-sm font-semibold text-muted-foreground hover:text-foreground">← All financing</Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
        <div className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Panel className="p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Status</p>
              <div className="mt-2"><StatusPill value={record.status} /></div>
            </Panel>
            <Panel className="p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Desired amount</p>
              <p className="mt-2 text-3xl font-bold">{money(record.desiredAmount)}</p>
            </Panel>
          </div>

          {record.notes && (
            <Panel className="p-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Notes</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{record.notes}</p>
            </Panel>
          )}
        </div>

        <div className="grid gap-4 self-start">
          <Panel className="p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Client</p>
            {record.clientProfile ? (
              <Link href={`/profiles/${record.clientProfile.id}`} className="mt-1 block text-sm font-semibold text-primary hover:underline">{record.clientProfile.profileName}</Link>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">Not assigned</p>
            )}
            {record.job && (
              <>
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Job</p>
                <Link href={`/jobs/${record.job.id}`} className="mt-1 block text-sm font-semibold text-primary hover:underline">{record.job.jobName}</Link>
              </>
            )}
            {record.quote && (
              <>
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Quote</p>
                <Link href={`/quotes/${record.quote.id}`} className="mt-1 block text-sm font-semibold text-primary hover:underline">{record.quote.quoteName}</Link>
              </>
            )}
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Financing needed</p>
            <p className="mt-1 text-sm">{record.financingNeeded ? "Yes" : "No"}</p>
            {record.provider && (
              <>
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Provider</p>
                <p className="mt-1 text-sm">{record.provider}</p>
              </>
            )}
            {record.applicationUrl && (
              <>
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Application URL</p>
                <a href={record.applicationUrl} target="_blank" rel="noopener noreferrer" className="mt-1 block text-sm font-semibold text-primary hover:underline break-all">
                  Open application →
                </a>
              </>
            )}
          </Panel>

          <Panel className="p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Actions</p>
            <LinkButton href="/financing/new" variant="secondary">New financing record</LinkButton>
          </Panel>
        </div>
      </div>
    </>
  );
}
