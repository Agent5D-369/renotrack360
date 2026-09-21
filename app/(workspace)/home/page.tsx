import { requireStaffPage } from "@/lib/staff-access";
﻿import Link from "next/link";
import { AlertCircle, ArrowRight, Zap } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Panel } from "@/components/ui";
import { dashboardFilters } from "@/lib/constants";
import { dateShort, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const FOLLOW_UP_LABELS: Record<string, string> = {
  CONFIRM_RECEIVED: "Confirm received",
  ANSWER_QUESTIONS: "Answer questions",
  DECISION_TIMELINE: "Decision timeline",
  FINAL_CHECK_IN: "Final check-in",
  NURTURE: "Nurture",
};

export default async function TodayPage() {
  await requireStaffPage();
  const session = await getServerSession(authOptions);
  const uiMode = (session?.user as { uiMode?: string } | undefined)?.uiMode ?? "POWER";
  const now = new Date();
  const [
    newLeads,
    hotLeads,
    leadFollowUps,
    estimateFollowUps,
    sentEstimates,
    activeJobs,
    weeklyReportsDue,
    openChangeOrders,
    changeOrderValue,
    outstandingInvoices,
    leadPipeline,
    quotePipeline,
    activeJobValue,
    nextEstimateFollowUps,
    nextActivities,
    activeJobList
  ] = await Promise.all([
    prisma.lead.count({ where: { status: "NEW_LEAD", deletedAt: null } }),
    prisma.lead.count({ where: { probability: { gte: 70 }, deletedAt: null } }),
    prisma.activity.count({ where: { dueDate: { lte: now }, completedAt: null } }),
    prisma.estimateFollowUp.count({ where: { dueDate: { lte: now }, completedAt: null, status: { in: ["SCHEDULED", "DUE"] } } }),
    prisma.estimate.count({ where: { status: "SENT" } }),
    prisma.job.count({ where: { jobStatus: { notIn: ["COMPLETE", "WARRANTY_FOLLOW_UP"] } } }),
    prisma.job.count({ where: { weeklyReportDue: { lte: now }, jobStatus: { notIn: ["COMPLETE", "WARRANTY_FOLLOW_UP"] } } }),
    prisma.changeOrder.count({ where: { status: { in: ["DRAFT", "SENT"] } } }),
    prisma.changeOrder.aggregate({ _sum: { addedCost: true }, where: { status: { in: ["DRAFT", "SENT"] } } }),
    prisma.invoice.aggregate({ _sum: { balanceDue: true }, where: { status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } } }),
    prisma.lead.aggregate({ _sum: { estimatedBudget: true }, where: { status: { notIn: ["LOST", "WON"] }, deletedAt: null } }),
    prisma.quote.aggregate({ _sum: { finalQuoteAmount: true }, where: { quoteStatus: { notIn: ["DECLINED", "CONVERTED_TO_JOB"] } } }),
    prisma.job.aggregate({ _sum: { contractAmount: true }, where: { jobStatus: { notIn: ["COMPLETE", "WARRANTY_FOLLOW_UP"] } } }),
    prisma.estimateFollowUp.findMany({
      include: { estimate: { include: { clientProfile: true } } },
      where: { completedAt: null },
      orderBy: { dueDate: "asc" },
      take: 5
    }),
    prisma.activity.findMany({
      where: { completedAt: null },
      include: { profile: true, lead: true, property: true, quote: true, job: true },
      orderBy: { dueDate: "asc" },
      take: 5
    }),
    prisma.job.findMany({
      where: { jobStatus: { notIn: ["COMPLETE", "WARRANTY_FOLLOW_UP"] } },
      orderBy: { weeklyReportDue: "asc" },
      take: 8,
      select: {
        id: true, jobName: true, activePhase: true, jobStatus: true,
        weeklyReportDue: true, balanceDue: true, contractAmount: true
      }
    })
  ]);

  // 3B: overdue selections for dashboard badge
  const overdueSelectionCount = await prisma.selectionItem.count({
    where: {
      requiredByDate: { lt: now },
      decisionStatus: { in: ["NOT_STARTED", "OPTIONS_SENT"] },
    },
  });

  const isNewAccount = activeJobs === 0 && newLeads === 0 && sentEstimates === 0;
  const outstandingAmount = Number(outstandingInvoices._sum.balanceDue ?? 0);
  const changeOrderAmount = Number(changeOrderValue._sum.addedCost ?? 0);

  // Simple Mode: surface only the 5 most important actions
  if (uiMode === "SIMPLE") {
    const doNext: Array<{ label: string; sub: string; href: string; urgent: boolean }> = [];
    if (leadFollowUps > 0) doNext.push({ label: `Follow up on ${leadFollowUps} lead${leadFollowUps !== 1 ? "s" : ""}`, sub: "Overdue activities", href: dashboardFilters.followUpsDue, urgent: true });
    if (weeklyReportsDue > 0) doNext.push({ label: `Write ${weeklyReportsDue} weekly report${weeklyReportsDue !== 1 ? "s" : ""}`, sub: "Reports overdue", href: "/weekly-reports/new", urgent: true });
    if (openChangeOrders > 0) doNext.push({ label: `Get ${openChangeOrders} change order${openChangeOrders !== 1 ? "s" : ""} signed`, sub: `${money(changeOrderAmount)} unsigned`, href: dashboardFilters.openChangeOrders, urgent: true });
    if (Number(outstandingInvoices._sum.balanceDue ?? 0) > 0) doNext.push({ label: "Collect outstanding invoices", sub: money(outstandingInvoices._sum.balanceDue), href: dashboardFilters.outstandingInvoices, urgent: false });
    if (estimateFollowUps > 0) doNext.push({ label: `Follow up on ${estimateFollowUps} estimate${estimateFollowUps !== 1 ? "s" : ""}`, sub: "Awaiting decision", href: "/estimates", urgent: false });
    if (doNext.length === 0) doNext.push({ label: "Start a new estimate", sub: "Nothing urgent right now", href: "/quotes/field-wizard", urgent: false });

    return (
      <div className="grid gap-6 max-w-2xl">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Simple Mode - today</p>
          <h1 className="mt-0.5 text-2xl font-bold">Do this next.</h1>
        </div>
        <div className="grid gap-3">
          {doNext.map((item, i) => (
            <Link
              key={item.href + i}
              href={item.href}
              className={`flex items-center justify-between gap-4 rounded-xl border p-5 transition hover:-translate-y-0.5 ${item.urgent ? "border-red-200 bg-red-50" : "border-border bg-white"}`}
            >
              <div>
                <p className={`font-bold ${item.urgent ? "text-red-800" : ""}`}>{item.label}</p>
                <p className={`text-sm ${item.urgent ? "text-red-600" : "text-muted-foreground"}`}>{item.sub}</p>
              </div>
              <ArrowRight className={`h-5 w-5 shrink-0 ${item.urgent ? "text-red-400" : "text-muted-foreground"}`} />
            </Link>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Link href="/leads/new" className="rounded-xl border border-border bg-white p-4 text-center hover:bg-muted">
            <p className="text-sm font-bold">New lead</p>
          </Link>
          <Link href="/quotes/field-wizard" className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center hover:bg-primary/10">
            <p className="text-sm font-bold text-primary">New estimate</p>
          </Link>
          <Link href="/jobs/new" className="rounded-xl border border-border bg-white p-4 text-center hover:bg-muted">
            <p className="text-sm font-bold">New job</p>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <section className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Today</p>
          <h1 className="mt-0.5 text-2xl font-bold md:text-3xl">Command Center</h1>
        </div>
        <Link
          href="/quotes/field-wizard"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow hover:opacity-90"
        >
          <Zap className="h-4 w-4" />
          New estimate
        </Link>
      </section>

      {isNewAccount && (
        <Panel className="p-6">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Get started</p>
          <h2 className="mt-1 text-xl font-bold">Your renovation command center is ready.</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            You&apos;re set up. Start by adding a lead from a recent conversation, or jump straight into an estimate from your next job site.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/quotes/field-wizard" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">
              <Zap className="h-4 w-4" /> Start an estimate
            </Link>
            <Link href="/leads/new" className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold hover:bg-muted">
              Add a lead
            </Link>
            <Link href="/guided/lifecycle" className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold hover:bg-muted">
              See how it works
            </Link>
          </div>
        </Panel>
      )}

      {!isNewAccount && (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Link href={dashboardFilters.outstandingInvoices} className={["group rounded-lg border p-5 shadow-soft transition hover:-translate-y-0.5", outstandingAmount > 0 ? "border-red-200 bg-red-50" : "border-border bg-white"].join(" ")}>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Outstanding invoices</p>
            <p className={["mt-2 text-3xl font-bold", outstandingAmount > 0 ? "text-red-700" : "text-foreground"].join(" ")}>{money(outstandingAmount)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{outstandingAmount > 0 ? "Collect now →" : "All invoices current"}</p>
          </Link>
          <Link href={dashboardFilters.openChangeOrders} className={["group rounded-lg border p-5 shadow-soft transition hover:-translate-y-0.5", openChangeOrders > 0 ? "border-amber-200 bg-amber-50" : "border-border bg-white"].join(" ")}>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Open change orders</p>
            <p className={["mt-2 text-3xl font-bold", openChangeOrders > 0 ? "text-amber-800" : "text-foreground"].join(" ")}>{openChangeOrders}</p>
            <p className="mt-1 text-xs text-muted-foreground">{openChangeOrders > 0 ? `${money(changeOrderAmount)} at risk · Get signed` : "No open changes"}</p>
          </Link>
          <Link href="/estimates" className={["group rounded-lg border p-5 shadow-soft transition hover:-translate-y-0.5", estimateFollowUps > 0 ? "border-primary/30 bg-primary/5" : "border-border bg-white"].join(" ")}>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Estimate follow-ups due</p>
            <p className={["mt-2 text-3xl font-bold", estimateFollowUps > 0 ? "text-primary" : "text-foreground"].join(" ")}>{estimateFollowUps}</p>
            <p className="mt-1 text-xs text-muted-foreground">{sentEstimates} sent · {estimateFollowUps > 0 ? "Follow up today →" : "All followed up"}</p>
          </Link>
          <Link href={dashboardFilters.followUpsDue} className={["group rounded-lg border p-5 shadow-soft transition hover:-translate-y-0.5", leadFollowUps > 0 || weeklyReportsDue > 0 ? "border-orange-200 bg-orange-50" : "border-border bg-white"].join(" ")}>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Attention needed</p>
            <p className={["mt-2 text-3xl font-bold", (leadFollowUps + weeklyReportsDue) > 0 ? "text-orange-700" : "text-foreground"].join(" ")}>{leadFollowUps + weeklyReportsDue}</p>
            <p className="mt-1 text-xs text-muted-foreground">{leadFollowUps} lead follow-ups · {weeklyReportsDue} reports due</p>
          </Link>
        </section>
      )}

      {/* 3B: overdue client decisions banner */}
      {!isNewAccount && overdueSelectionCount > 0 && (
        <Link
          href="/selections"
          className="flex items-center gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 transition hover:bg-red-100"
        >
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
          <span>
            <strong>{overdueSelectionCount} client selection{overdueSelectionCount !== 1 ? "s" : ""}</strong> past due - decisions overdue affect the project schedule.
          </span>
          <span className="ml-auto shrink-0 text-xs font-bold">Review →</span>
        </Link>
      )}

      {openChangeOrders > 0 && (
        <Link href={dashboardFilters.openChangeOrders} className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 transition hover:bg-amber-100">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
          <span><strong>{openChangeOrders} change order{openChangeOrders !== 1 ? "s" : ""}</strong> open - {money(changeOrderAmount)} in extra scope not yet approved. Protect your margin.</span>
          <ArrowRight className="ml-auto h-4 w-4 shrink-0" />
        </Link>
      )}

      <section className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="grid gap-5">
          <Panel className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold">Estimate follow-up queue</h2>
              <Link href="/estimates" className="text-xs font-semibold text-primary hover:underline">All estimates →</Link>
            </div>
            {nextEstimateFollowUps.length === 0 ? (
              <div className="mt-4 rounded-md bg-muted/50 p-4 text-center">
                <p className="text-sm text-muted-foreground">No follow-ups due. Send an estimate to start the queue.</p>
                <Link href="/quotes/field-wizard" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"><Zap className="h-3 w-3" /> Start an estimate</Link>
              </div>
            ) : (
              <div className="mt-4 grid gap-2">
                {nextEstimateFollowUps.map((followUp) => {
                  const isOverdue = followUp.dueDate && new Date(followUp.dueDate) < now;
                  return (
                    <Link key={followUp.id} href={`/estimates/${followUp.estimateId}`} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5 transition hover:bg-muted/50">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{followUp.estimate.clientProfile?.profileName ?? "Client"}</p>
                        <p className="text-xs text-muted-foreground">{followUp.estimate.estimateNumber} · {FOLLOW_UP_LABELS[followUp.followUpType] ?? followUp.followUpType.replaceAll("_", " ").toLowerCase()}</p>
                      </div>
                      <span className={["shrink-0 text-xs font-bold", isOverdue ? "text-red-600" : "text-muted-foreground"].join(" ")}>{isOverdue ? "Overdue · " : ""}{dateShort(followUp.dueDate)}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold">Lead &amp; relationship follow-ups</h2>
              <Link href={dashboardFilters.followUpsDue} className="text-xs font-semibold text-primary hover:underline">All activities →</Link>
            </div>
            {nextActivities.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No follow-ups due. Good work keeping up with your pipeline.</p>
            ) : (
              <div className="mt-4 grid gap-2">
                {nextActivities.map((activity) => {
                  const isOverdue = activity.dueDate && new Date(activity.dueDate) < now;
                  const context = activity.profile?.profileName ?? activity.lead?.leadName ?? activity.property?.propertyAddress ?? activity.job?.jobName ?? "General";
                  return (
                    <Link key={activity.id} href={activityHref(activity)} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5 transition hover:bg-muted/50">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{activity.subject}</p>
                        <p className="truncate text-xs text-muted-foreground">{context}</p>
                      </div>
                      <span className={["shrink-0 text-xs font-bold", isOverdue ? "text-red-600" : "text-muted-foreground"].join(" ")}>{isOverdue ? "Overdue · " : ""}{dateShort(activity.dueDate)}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>

        <div className="grid gap-5 self-start">
          <Panel className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold">Active job watchlist</h2>
              <Link href={dashboardFilters.activeJobs} className="text-xs font-semibold text-primary hover:underline">All jobs →</Link>
            </div>
            {activeJobList.length === 0 ? (
              <div className="mt-4 rounded-md bg-muted/50 p-4 text-center">
                <p className="text-sm text-muted-foreground">No active jobs. Convert a won estimate to start a job.</p>
                <Link href="/jobs/new" className="mt-2 inline-block text-xs font-bold text-primary hover:underline">Create a job →</Link>
              </div>
            ) : (
              <div className="mt-4 grid gap-2">
                {activeJobList.map((job) => {
                  const reportOverdue = job.weeklyReportDue && new Date(job.weeklyReportDue) < now;
                  return (
                    <div key={job.id} className="rounded-md border border-border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/jobs/${job.id}`} className="min-w-0">
                          <p className="truncate text-sm font-semibold hover:text-primary">{job.jobName}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{job.activePhase ?? job.jobStatus.replaceAll("_", " ")} · {money(job.balanceDue)} due</p>
                        </Link>
                        <Link href={`/weekly-reports/new?jobId=${job.id}`} className="shrink-0 rounded border border-primary/30 bg-primary/5 px-2 py-1 text-xs font-bold text-primary hover:bg-primary/10" title="Write weekly report">Report</Link>
                      </div>
                      {job.weeklyReportDue && (
                        <p className={["mt-1 text-xs font-semibold", reportOverdue ? "text-red-600" : "text-muted-foreground"].join(" ")}>
                          {reportOverdue ? "⚠ Report overdue · " : "Report due "}{dateShort(job.weeklyReportDue)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel className="p-5">
            <h2 className="text-base font-bold">Pipeline snapshot</h2>
            <div className="mt-4 grid gap-2">
              {[
                { label: "New leads", value: newLeads, href: dashboardFilters.newLeads },
                { label: "Hot leads (≥70%)", value: hotLeads, href: dashboardFilters.hotLeads },
                { label: "Sent estimates", value: sentEstimates, href: "/estimates" },
                { label: "Active jobs", value: activeJobs, href: dashboardFilters.activeJobs },
                { label: "Lead pipeline", value: money(leadPipeline._sum.estimatedBudget), href: "/leads" },
                { label: "Quote pipeline", value: money(quotePipeline._sum.finalQuoteAmount), href: "/quotes" },
                { label: "Active contracts", value: money(activeJobValue._sum.contractAmount), href: "/jobs" }
              ].map(({ label, value, href }) => (
                <Link key={label} href={href} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-bold">{value}</span>
                </Link>
              ))}
            </div>
          </Panel>
        </div>
      </section>
    </div>
  );
}

function activityHref(activity: {
  relatedLeadId: string | null;
  relatedProfileId: string | null;
  relatedPropertyId: string | null;
  relatedQuoteId: string | null;
  relatedJobId: string | null;
}) {
  if (activity.relatedLeadId) return `/leads/${activity.relatedLeadId}`;
  if (activity.relatedProfileId) return `/profiles/${activity.relatedProfileId}`;
  if (activity.relatedPropertyId) return `/properties/${activity.relatedPropertyId}`;
  if (activity.relatedQuoteId) return `/quotes/${activity.relatedQuoteId}`;
  if (activity.relatedJobId) return `/jobs/${activity.relatedJobId}`;
  return "/activities";
}
