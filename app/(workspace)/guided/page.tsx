import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { guidedWorkflows } from "@/lib/help-content";

export default function GuidedPage() {
  return (
    <>
      <PageHeader
        title="Guided Workflows"
        body="Wizard-style paths for the common renovation jobs: estimate, approval, kickoff, field day, selections, reporting, closeout, migration, and AI assistance."
      />
      {/* Hero cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Link href="/guided/lifecycle" className="flex items-center justify-between gap-4 rounded-xl border-2 border-primary/30 bg-primary/5 p-6 transition hover:bg-primary/10">
          <div>
            <span className="rounded bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">Start here</span>
            <h2 className="mt-2 text-xl font-black">Lead to Punchout</h2>
            <p className="mt-1 text-sm text-muted-foreground">The complete renovation lifecycle - 6 stages, live pipeline counts, and every standard you need to advance.</p>
          </div>
          <span className="shrink-0 text-4xl">🏗️</span>
        </Link>
        <Link href="/guided/library" className="flex items-center justify-between gap-4 rounded-xl border-2 border-amber-300/50 bg-amber-50 p-6 transition hover:bg-amber-100">
          <div>
            <span className="rounded bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">54 steps</span>
            <h2 className="mt-2 text-xl font-black">Construction Teaching Library</h2>
            <p className="mt-1 text-sm text-muted-foreground">World-class standards, common mistakes, and proof requirements for every step of a renovation - from first contact to annual follow-up.</p>
          </div>
          <span className="shrink-0 text-4xl">📚</span>
        </Link>
      </div>

      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Individual workflow guides</p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {guidedWorkflows.map((workflow, index) => {
          const Icon = workflow.icon;
          return (
            <Link key={workflow.title} href={workflow.href} className="group rounded-lg border border-border bg-white p-5 shadow-soft transition hover:-translate-y-0.5">
              <div className="flex items-start gap-3">
                <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-md bg-muted text-primary">
                  <Icon className="h-5 w-5" />
                  <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-primary text-[10px] font-black text-primary-foreground">{index + 1}</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold">{workflow.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{workflow.outcome}</p>
                </div>
              </div>
              <p className="mt-4 text-sm font-semibold text-primary">Open guide</p>
            </Link>
          );
        })}
      </div>
      <Panel className="mt-6 p-5">
        <h3 className="text-lg font-bold">Workflow design rule</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          The app should always answer three questions: what is the next action, what is blocking progress, and what proof protects the business?
        </p>
      </Panel>
    </>
  );
}
