import { requireStaffPage } from "@/lib/staff-access";
﻿import Link from "next/link";
import { createFieldReport } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { phaseNameToLibrarySlug } from "@/lib/construction-library";
import { prisma } from "@/lib/prisma";

export default async function NewFieldReportPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage();
  const { id } = await params;
  const job = await prisma.job.findUniqueOrThrow({
    where: { id },
    select: { id: true, jobName: true, activePhase: true }
  });
  const today = new Date().toISOString().slice(0, 10);
  const activePhaseSlug = job.activePhase ? phaseNameToLibrarySlug[job.activePhase] : null;

  return (
    <>
      <PageHeader title="New Daily Log" body={`Documenting field activity for ${job.jobName}.`} />
      <div className="mb-4 flex items-center justify-between gap-4">
        <Link href={`/jobs/${id}/logs`} className="text-sm font-semibold text-muted-foreground hover:text-foreground">← Back to logs</Link>
        {activePhaseSlug && (
          <Link
            href={`/guided/library/${activePhaseSlug}`}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            📚 Phase guide: {job.activePhase}
          </Link>
        )}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Panel className="p-5">
          <form action={createFieldReport} encType="multipart/form-data" className="grid gap-5">
            <input type="hidden" name="jobId" value={id} />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-1">
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Report date</label>
                <input name="reportDate" type="date" defaultValue={today} required className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="grid gap-1">
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Weather</label>
                <input name="weatherNotes" type="text" placeholder="e.g. Clear, 72°F" className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>

            <div className="grid gap-1">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Crew on site</label>
              <input name="crewSummary" type="text" required placeholder="e.g. Lead + 2 carpenters, electrical sub" className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </div>

            <div className="grid gap-1">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Work completed today</label>
              <textarea
                name="workCompleted"
                rows={4}
                placeholder="Describe what was actually finished - phases advanced, tasks completed, milestones hit."
                className="rounded-md border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid gap-1">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Blockers / issues <span className="font-normal normal-case text-muted-foreground">(optional)</span></label>
              <textarea
                name="blockers"
                rows={3}
                placeholder="Concealed conditions, missing materials, subcontractor delays, inspection holds, client decisions needed."
                className="rounded-md border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-1">
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Materials used <span className="font-normal normal-case text-muted-foreground">(optional)</span></label>
                <textarea name="materialsUsed" rows={3} placeholder="Lumber, drywall, fixtures delivered or consumed today." className="rounded-md border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="grid gap-1">
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Equipment used <span className="font-normal normal-case text-muted-foreground">(optional)</span></label>
                <textarea name="equipmentUsed" rows={3} placeholder="Tools, rentals, lifts on site today." className="rounded-md border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>

            {/* Photo upload */}
            <div className="grid gap-1">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Site photos</label>
              <div className="rounded-md border-2 border-dashed border-border p-4">
                <input
                  name="photos"
                  type="file"
                  multiple
                  accept="image/*"
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary-foreground hover:file:opacity-90"
                />
                <p className="mt-2 text-xs text-muted-foreground">Before / during / after shots. Hidden conditions, completed work, material deliveries. JPG, PNG, HEIC accepted.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-md border border-border bg-muted/30 p-3">
              <input type="hidden" name="clientVisible" value="false" />
              <input name="clientVisible" id="clientVisible" type="checkbox" value="true" className="h-4 w-4 accent-primary" />
              <label htmlFor="clientVisible" className="text-sm font-semibold">
                Share with client
                <span className="ml-1 font-normal text-muted-foreground">- visible in client portal when checked</span>
              </label>
            </div>

            <button type="submit" className="h-11 rounded-md bg-primary px-6 text-sm font-bold text-primary-foreground hover:opacity-90">
              Save daily log
            </button>
          </form>
        </Panel>

        {/* Guidance sidebar */}
        <div className="grid gap-4 self-start">
          <Panel className="p-4">
            <h3 className="text-sm font-bold">What makes a good log</h3>
            <ul className="mt-3 grid gap-2 text-xs text-muted-foreground">
              {[
                "Name specific crew and subs - not just 'the guys'",
                "List tasks completed, not tasks started",
                "Every blocker needs an owner and a resolution date",
                "Photo every concealed condition before covering it",
                "Photo milestones your contract references",
                "Mark client-visible only when the content is appropriate"
              ].map((tip) => (
                <li key={tip} className="flex gap-2">
                  <span className="shrink-0 text-primary">→</span>
                  {tip}
                </li>
              ))}
            </ul>
          </Panel>
          <Panel className="p-4">
            <h3 className="text-sm font-bold">Legal protection</h3>
            <p className="mt-2 text-xs text-muted-foreground">Daily logs are your timestamped record of site conditions and progress. In a dispute, a complete log trail is worth more than any contract clause.</p>
          </Panel>
        </div>
      </div>
    </>
  );
}
