import Link from "next/link";
import { markJobDepositReceived } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { money, dateShort } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function BriefingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await prisma.job.findUniqueOrThrow({
    where: { id },
    include: {
      clientProfile: true,
      property: true,
      invoices: { where: { status: { not: "VOID" } }, orderBy: { dueDate: "asc" } },
      changeOrders: { where: { status: "APPROVED" } },
    },
  });

  const alreadyDeposit = ["DEPOSIT_RECEIVED", "MATERIALS_PLANNING", "DEMO", "ROUGH_IN", "INSPECTIONS",
    "DRYWALL_SURFACES", "FINISHES", "PUNCH_LIST", "FINAL_WALKTHROUGH", "COMPLETE", "WARRANTY_FOLLOW_UP"].includes(job.jobStatus);

  return (
    <>
      <PageHeader
        title="Pre-Construction Briefing"
        body={`${job.jobName} - scope summary, client responsibilities, and payment schedule`}
      />
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Link href={`/jobs/${id}`} className="font-semibold text-muted-foreground hover:text-foreground">← Job</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={`/jobs/${id}/closeout`} className="font-semibold text-muted-foreground hover:text-foreground">Closeout package</Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        {/* Briefing form */}
        <form action={`/api/jobs/${id}/briefing-pdf`} method="POST" target="_blank" className="space-y-5">
          <Panel className="p-5">
            <h3 className="mb-4 font-bold">Scope of work summary</h3>
            <textarea
              name="scopeSummary"
              rows={5}
              placeholder="Summarize the approved scope in plain language. What are we doing, room by room or phase by phase?"
              className="w-full rounded-md border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
              defaultValue={job.notes ?? ""}
            />
          </Panel>

          <Panel className="p-5">
            <h3 className="mb-4 font-bold">Exclusions</h3>
            <textarea
              name="exclusions"
              rows={4}
              placeholder="What is explicitly NOT included? List anything the client might assume is covered but isn't."
              className="w-full rounded-md border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </Panel>

          <Panel className="p-5">
            <h3 className="mb-4 font-bold">Allowances</h3>
            <textarea
              name="allowances"
              rows={4}
              placeholder="List any allowance amounts included (e.g. tile allowance: $8/sq ft, fixtures allowance: $2,500). Overage is a change order."
              className="w-full rounded-md border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </Panel>

          <Panel className="p-5">
            <h3 className="mb-4 font-bold">Client responsibilities</h3>
            <textarea
              name="clientResponsibilities"
              rows={5}
              placeholder="What does the client need to do? (e.g. clear the workspace by [date], make selections by [date], vacate for demo week, keep pets secured)"
              className="w-full rounded-md border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </Panel>

          <Panel className="p-5">
            <h3 className="mb-4 font-bold">Payment schedule</h3>
            {job.invoices.length > 0 ? (
              <div className="mb-3 grid gap-2">
                {job.invoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
                    <span className="font-medium">{inv.invoiceNumber}</span>
                    <span>{inv.dueDate ? `Due ${dateShort(inv.dueDate)}` : "No due date"}</span>
                    <span className="font-bold">{money(inv.total)}</span>
                  </div>
                ))}
              </div>
            ) : null}
            <textarea
              name="paymentSchedule"
              rows={3}
              placeholder="Describe the payment milestones (e.g. Deposit 30% on signing, 40% at rough-in complete, 30% at final walkthrough)."
              className="w-full rounded-md border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
              defaultValue={job.invoices.length > 0
                ? job.invoices.map((inv) => `${inv.invoiceNumber}: ${money(inv.total)}${inv.dueDate ? ` due ${dateShort(inv.dueDate)}` : ""}`).join("\n")
                : ""}
            />
          </Panel>

          <Panel className="p-5">
            <h3 className="mb-4 font-bold">Warranty and care notes</h3>
            <textarea
              name="warrantyNotes"
              rows={4}
              placeholder="What's covered under warranty and for how long? What maintenance does the client need to do to keep the warranty valid?"
              className="w-full rounded-md border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </Panel>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              ↓ Generate briefing PDF
            </button>
            <p className="self-center text-xs text-muted-foreground">Opens as a downloadable PDF. Save it then share with the client.</p>
          </div>
        </form>

        {/* Right sidebar */}
        <div className="space-y-4 self-start">
          <Panel className="p-4">
            <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Job status</p>
            <p className="text-sm font-semibold">{job.jobStatus.replaceAll("_", " ")}</p>
            {!alreadyDeposit && (
              <>
                <p className="mt-3 text-xs text-muted-foreground">Mark as Deposit Received once the client has signed off and paid the deposit.</p>
                <form action={markJobDepositReceived.bind(null, id)} className="mt-3">
                  <button type="submit" className="w-full rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm font-semibold text-primary hover:bg-primary/10">
                    Mark deposit received
                  </button>
                </form>
              </>
            )}
            {alreadyDeposit && (
              <p className="mt-2 text-xs font-semibold text-green-700">Deposit already recorded.</p>
            )}
          </Panel>

          <Panel className="p-4">
            <p className="text-xs font-bold uppercase text-muted-foreground mb-3">Project details</p>
            <dl className="grid gap-2 text-sm">
              <div><dt className="text-xs text-muted-foreground">Client</dt><dd className="font-semibold">{job.clientProfile?.profileName ?? "-"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Property</dt><dd className="font-semibold">{job.property?.propertyAddress ?? "-"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Contract amount</dt><dd className="font-semibold">{money(job.contractAmount)}</dd></div>
              {job.startDate && <div><dt className="text-xs text-muted-foreground">Start date</dt><dd className="font-semibold">{dateShort(job.startDate)}</dd></div>}
              {job.targetCompletion && <div><dt className="text-xs text-muted-foreground">Target completion</dt><dd className="font-semibold">{dateShort(job.targetCompletion)}</dd></div>}
            </dl>
          </Panel>

          {job.changeOrders.length > 0 && (
            <Panel className="p-4">
              <p className="text-xs font-bold uppercase text-muted-foreground mb-3">Approved change orders</p>
              {job.changeOrders.map((co) => (
                <div key={co.id} className="flex justify-between text-sm py-1">
                  <span className="truncate text-muted-foreground">{co.changeOrderTitle}</span>
                  <span className="ml-3 font-semibold">+{money(co.addedCost)}</span>
                </div>
              ))}
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
