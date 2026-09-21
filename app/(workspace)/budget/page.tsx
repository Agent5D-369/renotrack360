import { requireStaffPage } from "@/lib/staff-access";
﻿import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { dateShort, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

function Dot({ color }: { color: "red" | "amber" | "green" }) {
  return (
    <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
      color === "red" ? "bg-red-500" : color === "amber" ? "bg-amber-400" : "bg-green-500"
    }`} />
  );
}

function LeakRow({ severity, label, value, detail, href, action }: {
  severity: "red" | "amber" | "green";
  label: string; value: string; detail: string; href: string; action: string;
}) {
  const s = {
    red: { row: "border-red-100 bg-red-50/60", val: "text-red-700 font-black", act: "text-red-700 hover:text-red-900 font-bold" },
    amber: { row: "border-amber-100 bg-amber-50/60", val: "text-amber-800 font-black", act: "text-amber-800 hover:text-amber-900 font-bold" },
    green: { row: "border-green-100 bg-green-50/60", val: "text-green-700 font-bold", act: "text-green-700 hover:text-green-900 font-bold" },
  }[severity];
  return (
    <div className={`flex items-center gap-4 rounded-lg border px-4 py-3 ${s.row}`}>
      <Dot color={severity} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#0f172a]">{label}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
      <p className={`shrink-0 text-sm ${s.val}`}>{value}</p>
      <Link href={href} className={`shrink-0 text-xs ${s.act}`}>{action} →</Link>
    </div>
  );
}

export default async function ProfitLeakDashboard() {
  await requireStaffPage();
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 86_400_000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86_400_000);

  const [
    draftCOs, sentCOs, overdueInvoices, partialInvoices,
    overdueSelections, outOfScopeRequests, activeJobs, staleEstimates,
  ] = await Promise.all([
    prisma.changeOrder.findMany({
      where: { status: "DRAFT", createdAt: { lt: threeDaysAgo } },
      include: { job: true }, orderBy: { createdAt: "asc" },
    }),
    prisma.changeOrder.findMany({
      where: { status: "SENT" },
      include: { job: true }, orderBy: { updatedAt: "desc" },
    }),
    prisma.invoice.findMany({
      where: { status: "OVERDUE" },
      include: { clientProfile: true }, orderBy: { dueDate: "asc" },
    }),
    prisma.invoice.findMany({
      where: { status: "PARTIALLY_PAID", dueDate: { lt: now } },
      include: { clientProfile: true }, orderBy: { dueDate: "asc" },
    }),
    prisma.selectionItem.findMany({
      where: { requiredByDate: { lt: now }, decisionStatus: { in: ["NOT_STARTED", "OPTIONS_SENT"] } },
      include: { selectionSheet: { include: { job: true } } },
      orderBy: { requiredByDate: "asc" }, take: 15,
    }),
    prisma.activity.findMany({
      where: { isOutOfScope: true, completedAt: null },
      include: { job: true }, orderBy: { createdAt: "desc" }, take: 15,
    }),
    prisma.job.findMany({
      where: { jobStatus: { notIn: ["COMPLETE", "WARRANTY_FOLLOW_UP"] } },
      include: { budgetLines: true, actualCosts: true },
    }),
    prisma.estimate.findMany({
      where: { status: "SENT", sentAt: { lt: fourteenDaysAgo } },
      include: { clientProfile: true }, orderBy: { sentAt: "asc" }, take: 8,
    }),
  ]);

  // Compute per-job margin data
  const jobsWithMargin = activeJobs.map((job) => {
    const contract = Number(job.contractAmount);
    const estimated = job.budgetLines.reduce((s, l) => s + Number(l.estimatedAmount), 0);
    const actual = job.actualCosts.reduce((s, c) => s + Number(c.actualAmount), 0);
    const overrun = actual - estimated;
    const projMargin = contract - estimated;
    const projPct = contract > 0 ? (projMargin / contract) * 100 : 0;
    const health: "red" | "amber" | "green" =
      actual > contract ? "red" : actual > estimated ? "red" : projPct < 10 ? "amber" : "green";
    return { ...job, contract, estimated, actual, overrun, projMargin, projPct, health };
  });

  const overrunJobs = jobsWithMargin.filter((j) => j.overrun > 0);
  const negMarginJobs = jobsWithMargin.filter((j) => j.actual > j.contract);

  const draftTotal = draftCOs.reduce((s, co) => s + Number(co.addedCost), 0);
  const sentTotal = sentCOs.reduce((s, co) => s + Number(co.addedCost), 0);
  const overdueTotal = [...overdueInvoices, ...partialInvoices].reduce((s, inv) => s + Number(inv.balanceDue), 0);
  const overrunTotal = overrunJobs.reduce((s, j) => s + j.overrun, 0);
  const confirmedLeak = draftTotal + overdueTotal + overrunTotal;

  const redCount = draftCOs.length + overdueInvoices.length + partialInvoices.length + negMarginJobs.length;
  const amberCount = sentCOs.length + overdueSelections.length + outOfScopeRequests.length + staleEstimates.length;

  return (
    <>
      <PageHeader
        title="Profit Leak Dashboard"
        body="Red = money leaving now. Amber = money at risk. Click any item to fix it."
      />

      {/* Summary row */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className={`rounded-xl border p-5 ${confirmedLeak > 0 ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}`}>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Confirmed leak</p>
          <p className={`mt-2 text-3xl font-black ${confirmedLeak > 0 ? "text-red-700" : "text-green-700"}`}>{money(confirmedLeak)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{redCount} item{redCount !== 1 ? "s" : ""} need immediate action</p>
        </div>
        <div className={`rounded-xl border p-5 ${sentTotal > 0 ? "border-amber-200 bg-amber-50" : "border-green-200 bg-green-50"}`}>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Pending approval</p>
          <p className={`mt-2 text-3xl font-black ${sentTotal > 0 ? "text-amber-700" : "text-green-700"}`}>{money(sentTotal)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{amberCount} item{amberCount !== 1 ? "s" : ""} at risk this week</p>
        </div>
        <div className={`rounded-xl border p-5 ${outOfScopeRequests.length > 0 ? "border-amber-200 bg-amber-50" : "border-green-200 bg-green-50"}`}>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Untracked scope requests</p>
          <p className={`mt-2 text-3xl font-black ${outOfScopeRequests.length > 0 ? "text-amber-700" : "text-green-700"}`}>{outOfScopeRequests.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Verbal requests not yet in a change order</p>
        </div>
      </div>

      <div className="grid gap-5">
        {/* RED block */}
        <Panel className="overflow-hidden p-0">
          <div className="flex items-center gap-3 border-b border-border bg-red-50 px-5 py-3">
            <Dot color="red" />
            <h2 className="font-bold text-red-800">Active leaks - fix today</h2>
            <span className="ml-auto text-sm font-black text-red-700">{money(confirmedLeak)}</span>
          </div>
          <div className="divide-y divide-border/60 px-4 py-3 space-y-2">
            {redCount === 0 && (
              <p className="py-3 text-center text-sm font-semibold text-green-700">No confirmed leaks. Good discipline.</p>
            )}
            {draftCOs.map((co) => (
              <LeakRow key={co.id} severity="red"
                label={`Unbilled draft: ${co.changeOrderTitle}`}
                value={money(co.addedCost)}
                detail={`${co.job.jobName} - draft ${Math.floor((now.getTime() - co.createdAt.getTime()) / 86_400_000)} days, still unsigned`}
                href={`/change-orders/${co.id}`} action="Get signed" />
            ))}
            {overdueInvoices.map((inv) => (
              <LeakRow key={inv.id} severity="red"
                label={`Overdue invoice: ${inv.invoiceNumber}`}
                value={money(inv.balanceDue)}
                detail={`${inv.clientProfile?.profileName ?? "Client"} - due ${dateShort(inv.dueDate)}`}
                href={`/invoices/${inv.id}`} action="Collect" />
            ))}
            {partialInvoices.map((inv) => (
              <LeakRow key={inv.id} severity="red"
                label={`Partially paid, past due: ${inv.invoiceNumber}`}
                value={money(inv.balanceDue)}
                detail={`${inv.clientProfile?.profileName ?? "Client"} - ${money(inv.amountPaid)} received, ${money(inv.balanceDue)} remaining`}
                href={`/invoices/${inv.id}`} action="Follow up" />
            ))}
            {negMarginJobs.map((job) => (
              <LeakRow key={`neg-${job.id}`} severity="red"
                label={`Costs exceed contract: ${job.jobName}`}
                value={`+${money(job.actual - job.contract)} over`}
                detail={`Contract ${money(job.contract)}, actual spend ${money(job.actual)}`}
                href={`/jobs/${job.id}/budget`} action="Review" />
            ))}
            {overrunJobs.filter((j) => j.actual <= j.contract).map((job) => (
              <LeakRow key={`over-${job.id}`} severity="red"
                label={`Cost overrun: ${job.jobName}`}
                value={`+${money(job.overrun)} over estimate`}
                detail={`Estimated ${money(job.estimated)}, actual ${money(job.actual)} - margin shrinking`}
                href={`/jobs/${job.id}/budget`} action="Review" />
            ))}
          </div>
        </Panel>

        {/* AMBER block */}
        <Panel className="overflow-hidden p-0">
          <div className="flex items-center gap-3 border-b border-border bg-amber-50 px-5 py-3">
            <Dot color="amber" />
            <h2 className="font-bold text-amber-800">At risk - act this week</h2>
            <span className="ml-auto text-sm font-black text-amber-700">{money(sentTotal)} pending</span>
          </div>
          <div className="divide-y divide-border/60 px-4 py-3 space-y-2">
            {amberCount === 0 && (
              <p className="py-3 text-center text-sm font-semibold text-green-700">Nothing at risk right now.</p>
            )}
            {sentCOs.map((co) => (
              <LeakRow key={co.id} severity="amber"
                label={`Awaiting signature: ${co.changeOrderTitle}`}
                value={money(co.addedCost)}
                detail={`${co.job.jobName} - sent ${Math.floor((now.getTime() - co.updatedAt.getTime()) / 86_400_000)} days ago`}
                href={`/change-orders/${co.id}`} action="Follow up" />
            ))}
            {overdueSelections.map((item) => (
              <LeakRow key={item.id} severity="amber"
                label={`Selection overdue: ${item.itemName}`}
                value="Decision needed"
                detail={`${item.selectionSheet.job?.jobName ?? "Job"} - required by ${dateShort(item.requiredByDate)}`}
                href="/selections" action="Review" />
            ))}
            {outOfScopeRequests.map((activity) => (
              <LeakRow key={activity.id} severity="amber"
                label={`Untracked request: ${activity.subject}`}
                value="No change order"
                detail={`${activity.job?.jobName ?? "Job"} - logged ${dateShort(activity.createdAt)}`}
                href={`/jobs/${activity.relatedJobId}/scope`} action="Convert" />
            ))}
            {staleEstimates.map((est) => (
              <LeakRow key={est.id} severity="amber"
                label={`Estimate going cold: ${est.estimateNumber}`}
                value={money(est.total)}
                detail={`${est.clientProfile?.profileName ?? "Client"} - sent ${dateShort(est.sentAt)}, no response`}
                href={`/estimates/${est.id}`} action="Follow up" />
            ))}
          </div>
        </Panel>

        {/* Job margin table */}
        <Panel className="p-5">
          <h2 className="mb-4 font-bold">Active job margin health</h2>
          {activeJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active jobs.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm border-collapse">
                <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left font-bold">Job</th>
                    <th className="px-4 py-2 text-right font-bold">Contract</th>
                    <th className="px-4 py-2 text-right font-bold">Est. cost</th>
                    <th className="px-4 py-2 text-right font-bold">Actual</th>
                    <th className="px-4 py-2 text-right font-bold">Proj. margin</th>
                    <th className="px-4 py-2 text-center font-bold">Health</th>
                  </tr>
                </thead>
                <tbody>
                  {jobsWithMargin.map((job) => {
                    const hc = { red: "text-red-700 bg-red-50", amber: "text-amber-700 bg-amber-50", green: "text-green-700 bg-green-50" }[job.health];
                    const hl = { red: "Over budget", amber: "At risk", green: "On track" }[job.health];
                    return (
                      <tr key={job.id} className="border-t border-border hover:bg-muted/40">
                        <td className="px-4 py-3">
                          <Link href={`/jobs/${job.id}/budget`} className="font-semibold text-primary hover:underline">{job.jobName}</Link>
                        </td>
                        <td className="px-4 py-3 text-right">{money(job.contract)}</td>
                        <td className="px-4 py-3 text-right">{job.estimated > 0 ? money(job.estimated) : <span className="text-xs text-muted-foreground">-</span>}</td>
                        <td className="px-4 py-3 text-right">{job.actual > 0 ? money(job.actual) : <span className="text-xs text-muted-foreground">-</span>}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${job.projPct < 10 ? "text-red-600" : "text-green-700"}`}>
                          {job.estimated > 0 ? `${money(job.projMargin)} (${job.projPct.toFixed(0)}%)` : "-"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${hc}`}>{hl}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
