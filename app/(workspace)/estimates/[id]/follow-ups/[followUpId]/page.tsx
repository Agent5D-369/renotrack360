import { requireStaffPage } from "@/lib/staff-access";
import { updateEstimateFollowUp } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { Panel, Button, LinkButton } from "@/components/ui";
import { StatusPill } from "@/components/status-pill";
import { dateShort, titleFromEnum } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { estimateInOrganization, leadInOrganization } from "@/lib/company-scope";
import { notFound } from "next/navigation";

const FOLLOW_UP_STATUSES = ["SCHEDULED", "DUE", "COMPLETED", "SKIPPED"] as const;

export default async function FollowUpDetailPage({ params }: { params: Promise<{ id: string; followUpId: string }> }) {
  const actor = await requireStaffPage();
  const { id, followUpId } = await params;
  const followUp = await prisma.estimateFollowUp.findFirst({
    where: { id: followUpId, estimate: estimateInOrganization(actor.organizationId, { id }), OR: [{ relatedLeadId: null }, { lead: leadInOrganization(actor.organizationId) }] },
    include: { estimate: true }
  });
  if (!followUp) notFound();
  const saveFollowUp = updateEstimateFollowUp.bind(null, followUpId, id);

  return (
    <>
      <PageHeader
        title={titleFromEnum(followUp.followUpType)}
        body={`Follow-up for estimate ${followUp.estimate.estimateNumber} · Due ${dateShort(followUp.dueDate)}`}
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Panel className="p-5">
          <h3 className="font-bold">Suggested outreach message</h3>
          <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {followUp.suggestedMessage ?? "No suggested message for this follow-up type."}
          </p>
          {followUp.outcomeNotes && (
            <>
              <h3 className="mt-5 font-bold">Outcome notes</h3>
              <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{followUp.outcomeNotes}</p>
            </>
          )}
        </Panel>

        <aside className="grid h-fit gap-5">
          <Panel className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">Status</h3>
              <StatusPill value={followUp.status} />
            </div>
            <form action={saveFollowUp} className="mt-4 grid gap-3">
              <div className="grid gap-1">
                <label className="text-xs font-bold uppercase text-muted-foreground">Update status</label>
                <select name="status" defaultValue={followUp.status} className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary">
                  {FOLLOW_UP_STATUSES.map((s) => (
                    <option key={s} value={s}>{titleFromEnum(s)}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1">
                <label className="text-xs font-bold uppercase text-muted-foreground">Reschedule due date</label>
                <input
                  type="date"
                  name="dueDate"
                  defaultValue={followUp.dueDate.toISOString().slice(0, 10)}
                  className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="grid gap-1">
                <label className="text-xs font-bold uppercase text-muted-foreground">Outcome notes</label>
                <textarea
                  name="outcomeNotes"
                  defaultValue={followUp.outcomeNotes ?? ""}
                  rows={3}
                  placeholder="What happened? What was said? What's the next move?"
                  className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <Button>Save follow-up</Button>
            </form>
          </Panel>
          <LinkButton href={`/estimates/${id}`} variant="secondary">Back to estimate</LinkButton>
        </aside>
      </div>
    </>
  );
}
