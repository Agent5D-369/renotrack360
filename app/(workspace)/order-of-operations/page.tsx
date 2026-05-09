import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { renovationPhaseDetails } from "@/lib/constants";

export default function OrderOfOperationsPage() {
  const guidance = [
    "This is the right default order for most residential renovation work because it protects rough trades and inspections before finish work begins.",
    "For complex jobs, add two management gates around it: preconstruction before Site Prep and closeout/warranty after Punch List.",
    "Exterior envelope, foundation, remediation, permit corrections, or client selections can move earlier when they block downstream work."
  ];
  return (
    <>
      <PageHeader title="Construction Order of Operations" body="The canonical renovation workflow used to frame quotes, jobs, task templates, reporting, evidence requirements, and closeout." />
      <Panel className="mb-5 p-5">
        <h3 className="text-lg font-bold">Recommended operating rule</h3>
        <div className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground">
          {guidance.map((item) => <p key={item}>{item}</p>)}
        </div>
      </Panel>
      <Panel className="p-5">
        <ol className="grid gap-3">
          {renovationPhaseDetails.map(([name, description], index) => (
            <li key={name}>
              <details className="rounded-md border border-border p-4" open={index < 3} suppressHydrationWarning>
                <summary className="grid cursor-pointer gap-3 md:grid-cols-[64px_1fr] md:items-center">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{String(index + 1).padStart(2, "0")}</span>
                  <span className="text-lg font-bold">{name}</span>
                </summary>
                <div className="mt-4 grid gap-4 pl-0 md:pl-16">
                  <p className="text-sm leading-6 text-muted-foreground">{description}</p>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-md bg-muted p-3">
                      <p className="text-xs font-bold uppercase text-muted-foreground">Estimator check</p>
                      <p className="mt-1 text-sm">Confirm this phase is included, excluded, allowance-based, or pending trade review before the quote is sent.</p>
                    </div>
                    <div className="rounded-md bg-muted p-3">
                      <p className="text-xs font-bold uppercase text-muted-foreground">Field proof</p>
                      <p className="mt-1 text-sm">Attach photos, notes, measurements, blockers, and change-order triggers before moving to the next dependent phase.</p>
                    </div>
                    <div className="rounded-md bg-muted p-3">
                      <p className="text-xs font-bold uppercase text-muted-foreground">Client update</p>
                      <p className="mt-1 text-sm">Translate field status into plain language: completed work, decisions needed, budget impact, and schedule impact.</p>
                    </div>
                  </div>
                </div>
              </details>
            </li>
          ))}
        </ol>
      </Panel>
    </>
  );
}
