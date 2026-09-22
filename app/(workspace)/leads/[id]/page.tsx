import { requireStaffPage } from "@/lib/staff-access";
import { convertQuoteToJob, deleteLead } from "@/app/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { LinkButton, Panel } from "@/components/ui";
import { leadPriorityScore } from "@/lib/calculations";
import { dateShort, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { leadInOrganization, quoteInOrganization } from "@/lib/company-scope";
import { notFound } from "next/navigation";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireStaffPage();
  const { id } = await params;
  const lead = await prisma.lead.findFirst({ where: leadInOrganization(actor.organizationId, { id }), include: { profile: true, property: true, quotes: { where: quoteInOrganization(actor.organizationId) }, owner: true } });
  if (!lead) notFound();
  return (
    <>
      <PageHeader title={lead.leadName} body="Opportunity detail and conversion context." />
      <div className="-mt-3 mb-5 flex items-center justify-between gap-3">
        <form action={deleteLead.bind(null, lead.id)}>
          <ConfirmSubmitButton
            message={`Permanently delete "${lead.leadName}"? This cannot be undone.`}
            className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100"
          >
            Delete lead
          </ConfirmSubmitButton>
        </form>
        <LinkButton href={`/leads/${lead.id}/edit`} variant="secondary">Edit lead</LinkButton>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        <Panel className="p-5"><h3 className="font-bold">Stage</h3><div className="mt-3"><StatusPill value={lead.status} /></div></Panel>
        <Panel className="p-5"><h3 className="font-bold">Priority score</h3><p className="mt-2 text-3xl font-bold">{leadPriorityScore({ ...lead, estimatedBudget: Number(lead.estimatedBudget ?? 0) })}</p></Panel>
        <Panel className="p-5"><h3 className="font-bold">Budget</h3><p className="mt-2 text-3xl font-bold">{money(lead.estimatedBudget)}</p></Panel>
      </div>
      <Panel className="mt-5 p-5">
        <h3 className="font-bold">Ownership</h3>
        <dl className="mt-3 grid gap-3 text-sm md:grid-cols-3">
          <div><dt className="font-semibold text-muted-foreground">Owner / rep</dt><dd>{lead.owner?.name ?? lead.owner?.email ?? "Unassigned"}</dd></div>
          <div><dt className="font-semibold text-muted-foreground">Lead type</dt><dd>{lead.leadType ?? "Not set"}</dd></div>
          <div><dt className="font-semibold text-muted-foreground">Source</dt><dd>{lead.source ?? "Not set"}</dd></div>
        </dl>
      </Panel>
      <Panel className="mt-5 p-5">
        <h3 className="font-bold">Next action</h3>
        <p className="mt-2 text-sm text-muted-foreground">{lead.nextAction ?? "No next action set."}</p>
        <p className="mt-2 text-sm">Follow-up: {dateShort(lead.followUpDate)}</p>
      </Panel>
    </>
  );
}
