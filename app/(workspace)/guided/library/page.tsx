import { requireStaffPage } from "@/lib/staff-access";
﻿import Link from "next/link";
import { BookOpen, CheckCircle2, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import {
  constructionLibrary,
  getLibraryPhase,
  phaseDescriptions,
  phaseLabels,
  type LibraryPhase
} from "@/lib/construction-library";

const phaseColors: Record<LibraryPhase, { badge: string; border: string; dot: string }> = {
  1: { badge: "bg-sky-100 text-sky-800", border: "border-sky-200", dot: "bg-sky-400" },
  2: { badge: "bg-emerald-100 text-emerald-800", border: "border-emerald-200", dot: "bg-emerald-500" },
  3: { badge: "bg-violet-100 text-violet-800", border: "border-violet-200", dot: "bg-violet-400" }
};

export default async function LibraryPage() {
  await requireStaffPage();
  const phases: LibraryPhase[] = [1, 2, 3];

  return (
    <>
      <PageHeader
        title="Construction Teaching Library"
        body="54 steps across the complete renovation lifecycle - from first contact to annual follow-up. Each step includes world-class standards, common mistakes, and the proof required to advance."
        actionHref="/guided"
        actionLabel="All guides"
      />

      {/* Stats strip */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { icon: BookOpen, label: "Total steps", value: constructionLibrary.length },
          { icon: CheckCircle2, label: "Client-facing", value: constructionLibrary.filter((s) => s.clientFacing).length },
          { icon: Users, label: "Internal only", value: constructionLibrary.filter((s) => !s.clientFacing).length }
        ].map(({ icon: Icon, label, value }) => (
          <Panel key={label} className="flex items-center gap-3 p-4">
            <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-2xl font-black">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </Panel>
        ))}
      </div>

      {/* Phase sections */}
      <div className="grid gap-6">
        {phases.map((phase) => {
          const steps = getLibraryPhase(phase);
          const colors = phaseColors[phase];
          return (
            <details key={phase} className={`group rounded-xl border-2 ${colors.border} overflow-hidden bg-white`} open={phase === 2} suppressHydrationWarning>
              <summary className="flex cursor-pointer list-none items-center gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <span className={`rounded px-2 py-0.5 text-xs font-bold ${colors.badge}`}>Phase {phase} · {steps.length} steps</span>
                  <h2 className="mt-1.5 text-lg font-black">{phaseLabels[phase]}</h2>
                  <p className="text-sm text-muted-foreground">{phaseDescriptions[phase]}</p>
                </div>
                <svg className="h-5 w-5 shrink-0 text-muted-foreground transition group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </summary>
              <div className="border-t border-black/10 p-5">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {steps.map((step) => (
                    <Link
                      key={step.slug}
                      href={`/guided/library/${step.slug}`}
                      className="group/card flex items-start gap-3 rounded-lg border border-border p-3 transition hover:border-primary/30 hover:bg-primary/5"
                    >
                      <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-black text-muted-foreground">
                        {step.phaseNumber}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold leading-snug">{step.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{step.tagline}</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          {step.clientFacing ? (
                            <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">Client-facing</span>
                          ) : (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">Internal</span>
                          )}
                          <span className="text-[10px] font-bold text-primary opacity-0 transition group-hover/card:opacity-100">Learn →</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </details>
          );
        })}
      </div>

      <Panel className="mt-6 p-5">
        <h3 className="text-sm font-bold">How this library is used</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Each step appears contextually throughout the app - job phases link to the relevant construction step, the Guided Workflows reference the lifecycle steps, and the post-job sequence connects to your Contacts module. You can browse the full library here or find a step directly from the phase it belongs to.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/guided/lifecycle" className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold hover:bg-muted">View full lifecycle →</Link>
          <Link href="/jobs" className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold hover:bg-muted">Go to jobs →</Link>
        </div>
      </Panel>
    </>
  );
}
