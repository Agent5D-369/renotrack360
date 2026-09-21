import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { dateShort, money } from "@/lib/format";
import { ClientRequestForm } from "@/components/client-request-form";
import { ClientBrandHeader } from "@/components/client-brand-header";

export const metadata = { title: "Your Project Update - RenoTrack360" };

export default async function ClientPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const record = await prisma.job.findUnique({
    where: { portalToken: token },
    include: {
      clientProfile: true,
      property: true,
      organization: true,
      phases: {
        orderBy: { phaseNumber: "asc" },
        include: { tasks: true },
      },
      selectionSheets: {
        include: {
          items: {
            where: { decisionStatus: { in: ["NOT_STARTED", "OPTIONS_SENT"] } },
            orderBy: { requiredByDate: "asc" },
          },
        },
      },
      changeOrders: {
        where: { status: "SENT" },
        orderBy: { updatedAt: "desc" },
      },
      weeklyReports: {
        where: { publications: { some: {} } },
        orderBy: { weekEnding: "desc" },
        take: 8,
        select: { publications: { orderBy: { revision: "desc" }, take: 1 } },
      },
      invoices: {
        where: { status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } },
        orderBy: { dueDate: "asc" },
        select: {
          id: true,
          invoiceNumber: true,
          dueDate: true,
          total: true,
          amountPaid: true,
          balanceDue: true,
          status: true,
          stripePaymentLink: true,
        },
      },
    },
  });

  if (!record) notFound();
  const job = { ...record, weeklyReports: record.weeklyReports.flatMap(report => report.publications) };

  // Fetch active approval tokens for each sent change order
  const coApprovals = job.changeOrders.length
    ? await prisma.clientApproval.findMany({
        where: {
          changeOrderId: { in: job.changeOrders.map((co) => co.id) },
          token: { not: null },
          status: { notIn: ["DECLINED", "EXPIRED"] },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];
  const approvalByCoId = new Map(coApprovals.map((a) => [a.changeOrderId, a]));

  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 86_400_000);

  // Phase progress — derive effective status per phase
  function phaseEffectiveStatus(p: NonNullable<typeof job>["phases"][number]) {
    if (p.tasks.length === 0) return p.status;
    if (p.tasks.every((t) => t.status === "COMPLETE")) return "COMPLETE";
    if (p.tasks.some((t) => t.status === "IN_PROGRESS")) return "IN_PROGRESS";
    return "NOT_STARTED";
  }

  const totalPhases = job.phases.length;
  const donePhases = job.phases.filter(
    (p) => phaseEffectiveStatus(p) === "COMPLETE"
  ).length;
  const progressPct =
    totalPhases > 0 ? Math.round((donePhases / totalPhases) * 100) : 0;

  // Current phase = first non-COMPLETE
  const currentPhase = job.phases.find(
    (p) => phaseEffectiveStatus(p) !== "COMPLETE"
  );

  // Pending selections across all sheets
  const pendingSelections = job.selectionSheets.flatMap((sheet) =>
    sheet.items.map((item) => ({ ...item, sheetName: sheet.sheetName }))
  );
  const urgentSelections = pendingSelections.filter(
    (s) => s.requiredByDate && s.requiredByDate <= threeDaysFromNow
  );

  // Outstanding balance
  const outstandingBalance = job.invoices.reduce(
    (sum, inv) => sum + Number(inv.balanceDue),
    0
  );

  const org = job.organization;

  return (
    <div
      className="min-h-screen bg-slate-50"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <ClientBrandHeader
        orgName={org.name ?? "RenoTrack360"}
        logoUrl={org.logoUrl}
        brandColor={org.brandColor}
        tagline={org.companyTagline}
        docLabel="Client Portal"
        docNumber={job.jobName}
      />

      <main className="mx-auto max-w-2xl space-y-5 px-4 py-8">
        {/* Hero */}
        <div>
          <h1 className="text-2xl font-black text-[#0f172a]">{job.jobName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {job.clientProfile?.profileName &&
              `Hi ${job.clientProfile.profileName.split(" ")[0]} — `}
            here is your latest project status.
            {job.property?.propertyAddress &&
              ` · ${job.property.propertyAddress}`}
          </p>
        </div>

        {/* Phase progress + full timeline */}
        <div className="rounded-xl border border-border bg-white p-5">
          {/* Progress bar summary */}
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold">Project progress</h2>
            <span className="text-sm font-black text-[#183d29]">
              {progressPct}%
            </span>
          </div>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#183d29] transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {donePhases} of {totalPhases} phases complete
          </p>

          {/* Scrollable phase timeline */}
          {job.phases.length > 0 && (
            <details open className="mt-4">
              <summary className="cursor-pointer select-none text-sm font-semibold text-[#0f172a] hover:text-[#183d29] list-none flex items-center gap-1.5">
                <span className="text-muted-foreground">▶</span>
                Project timeline — {donePhases} of {totalPhases} phases done
              </summary>
              <div className="mt-3 max-h-80 overflow-y-auto space-y-0.5 pr-1">
                {job.phases.map((phase) => {
                  const status = phaseEffectiveStatus(phase);
                  const isComplete = status === "COMPLETE";
                  const isCurrent =
                    currentPhase && phase.id === currentPhase.id;
                  const isInProgress = status === "IN_PROGRESS";
                  const showUpdate =
                    (isCurrent || isInProgress) && phase.clientUpdate;

                  return (
                    <div
                      key={phase.id}
                      className={`flex gap-3 rounded-md px-2 py-1.5 ${
                        isCurrent ? "bg-[#183d29]/5" : ""
                      }`}
                    >
                      {/* Status icon */}
                      <div className="mt-0.5 w-5 shrink-0 text-center">
                        {isComplete ? (
                          <span className="text-green-600 font-bold text-sm">
                            ✓
                          </span>
                        ) : isCurrent || isInProgress ? (
                          <span
                            className="inline-block h-3 w-3 rounded-full bg-[#183d29] animate-pulse mt-0.5"
                            title="In progress"
                          />
                        ) : (
                          <span className="text-slate-300 text-sm font-bold">
                            ○
                          </span>
                        )}
                      </div>

                      {/* Phase info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs text-muted-foreground font-mono tabular-nums">
                            {String(phase.phaseNumber).padStart(2, "0")}
                          </span>
                          <span
                            className={`text-sm ${
                              isComplete
                                ? "text-muted-foreground"
                                : isCurrent || isInProgress
                                ? "font-semibold text-[#0f172a]"
                                : "text-slate-500"
                            }`}
                          >
                            {phase.phaseName}
                          </span>
                          {isCurrent && !isInProgress && (
                            <span className="text-xs font-bold text-[#183d29] uppercase tracking-wide">
                              In progress
                            </span>
                          )}
                          {isInProgress && !isCurrent && (
                            <span className="text-xs font-bold text-[#183d29] uppercase tracking-wide">
                              In progress
                            </span>
                          )}
                          {isComplete && (
                            <span className="text-xs text-muted-foreground">
                              completed
                            </span>
                          )}
                        </div>
                        {showUpdate && (
                          <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
                            {phase.clientUpdate}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
          )}
        </div>

        {/* Decisions needed */}
        {pendingSelections.length > 0 && (
          <div
            className={`rounded-xl border p-5 ${
              urgentSelections.length > 0
                ? "border-red-200 bg-red-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <div className="flex items-center gap-2">
              {urgentSelections.length > 0 && (
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-black text-white">
                  Urgent
                </span>
              )}
              <h2
                className={`font-bold ${
                  urgentSelections.length > 0
                    ? "text-red-800"
                    : "text-amber-800"
                }`}
              >
                Decisions needed ({pendingSelections.length})
              </h2>
            </div>
            <p
              className={`mt-1 text-sm ${
                urgentSelections.length > 0 ? "text-red-700" : "text-amber-700"
              }`}
            >
              {urgentSelections.length > 0
                ? `${urgentSelections.length} selection${urgentSelections.length !== 1 ? "s" : ""} are due within 3 days. Delays affect the project schedule.`
                : "Your contractor is waiting on these selections to keep the project moving."}
            </p>
            <div className="mt-3 space-y-2">
              {pendingSelections.map((item) => {
                const isUrgent =
                  item.requiredByDate && item.requiredByDate <= threeDaysFromNow;
                const isOverdue =
                  item.requiredByDate && item.requiredByDate < now;
                return (
                  <div
                    key={item.id}
                    className={`rounded-lg border px-3 py-2.5 ${
                      isUrgent
                        ? "border-red-300 bg-white"
                        : "border-amber-200 bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#0f172a]">
                          {item.itemName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.sheetName} · {item.category}
                        </p>
                      </div>
                      {item.requiredByDate && (
                        <p
                          className={`shrink-0 text-xs font-bold ${
                            isOverdue
                              ? "text-red-600"
                              : isUrgent
                              ? "text-amber-700"
                              : "text-muted-foreground"
                          }`}
                        >
                          {isOverdue
                            ? "Overdue"
                            : `By ${dateShort(item.requiredByDate)}`}
                        </p>
                      )}
                    </div>
                    {item.scheduleImpactDays > 0 && (
                      <p className="mt-1 text-xs text-red-600">
                        Delay impact: +{item.scheduleImpactDays} day
                        {item.scheduleImpactDays !== 1 ? "s" : ""} to project
                        timeline
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Change orders awaiting approval */}
        {job.changeOrders.length > 0 && (
          <div className="rounded-xl border border-border bg-white p-5">
            <h2 className="font-bold">
              Awaiting your approval ({job.changeOrders.length})
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              These scope changes require your sign-off before work can proceed.
            </p>
            <div className="mt-3 space-y-2">
              {job.changeOrders.map((co) => {
                const approvalToken = approvalByCoId.get(co.id)?.token;
                return (
                  <div
                    key={co.id}
                    className="rounded-lg border border-amber-200 bg-amber-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-amber-900">
                          {co.changeOrderTitle}
                        </p>
                        {co.reason && (
                          <p className="mt-1 text-sm text-amber-800">
                            {co.reason}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-black text-amber-900">
                          +{money(co.addedCost)}
                        </p>
                        {co.addedTime > 0 && (
                          <p className="text-xs text-amber-700">
                            +{co.addedTime} day{co.addedTime !== 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    </div>
                    {approvalToken ? (
                      <Link
                        href={`/approve/${approvalToken}`}
                        className="mt-3 block rounded-md bg-amber-700 px-4 py-2 text-center text-sm font-bold text-white hover:bg-amber-800"
                      >
                        Review and approve →
                      </Link>
                    ) : (
                      <p className="mt-2 text-xs text-amber-700">
                        Contact your contractor to receive an approval link for
                        this change order.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Weekly reports timeline */}
        {job.weeklyReports.length > 0 && (
          <div className="rounded-xl border border-border bg-white p-5">
            <h2 className="font-bold">Weekly updates</h2>
            <div className="mt-3 space-y-3">
              {job.weeklyReports.map((report, index) => {
                const isLatest = index === 0;
                const preview = report.clientSummary
                  ? report.clientSummary.slice(0, 80) +
                    (report.clientSummary.length > 80 ? "…" : "")
                  : null;

                if (isLatest) {
                  // Most recent: expanded
                  return (
                    <div
                      key={report.id}
                      className="rounded-lg border border-slate-200 p-4"
                    >
                      <p className="text-xs text-muted-foreground font-semibold">
                        Week ending {dateShort(report.weekEnding)}
                      </p>
                      {report.clientSummary && (
                        <p className="mt-2 leading-relaxed text-[#0f172a]">
                          {report.clientSummary}
                        </p>
                      )}
                      {report.decisionsNeeded && (
                        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3">
                          <p className="text-xs font-bold uppercase text-amber-700">
                            Decision needed
                          </p>
                          <p className="mt-1 text-sm text-amber-800">
                            {report.decisionsNeeded}
                          </p>
                        </div>
                      )}
                      {report.nextWeekPlan && (
                        <div className="mt-3 rounded-md bg-slate-50 p-3">
                          <p className="text-xs font-bold uppercase text-muted-foreground">
                            Coming up next week
                          </p>
                          <p className="mt-1 text-sm">{report.nextWeekPlan}</p>
                        </div>
                      )}
                      <a
                        href={`/api/portal/${token}/reports/${report.id}`}
                        download
                        className="mt-3 inline-block text-xs font-semibold text-[#183d29] hover:underline"
                      >
                        ↓ Download full report PDF
                      </a>
                    </div>
                  );
                }

                // Older reports: collapsed
                return (
                  <details key={report.id} className="rounded-lg border border-slate-200">
                    <summary className="cursor-pointer select-none px-4 py-3 text-sm list-none flex items-center justify-between gap-3 hover:bg-slate-50">
                      <span className="text-muted-foreground font-medium">
                        Week ending {dateShort(report.weekEnding)}
                        {preview && (
                          <span className="ml-2 text-slate-400">
                            · {preview}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-muted-foreground text-xs">
                        ▼
                      </span>
                    </summary>
                    <div className="px-4 pb-4 pt-2">
                      {report.clientSummary && (
                        <p className="leading-relaxed text-[#0f172a] text-sm">
                          {report.clientSummary}
                        </p>
                      )}
                      {report.decisionsNeeded && (
                        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3">
                          <p className="text-xs font-bold uppercase text-amber-700">
                            Decision needed
                          </p>
                          <p className="mt-1 text-sm text-amber-800">
                            {report.decisionsNeeded}
                          </p>
                        </div>
                      )}
                      {report.nextWeekPlan && (
                        <div className="mt-3 rounded-md bg-slate-50 p-3">
                          <p className="text-xs font-bold uppercase text-muted-foreground">
                            Coming up next week
                          </p>
                          <p className="mt-1 text-sm">{report.nextWeekPlan}</p>
                        </div>
                      )}
                      <a
                        href={`/api/portal/${token}/reports/${report.id}`}
                        download
                        className="mt-3 inline-block text-xs font-semibold text-[#183d29] hover:underline"
                      >
                        ↓ Download full report PDF
                      </a>
                    </div>
                  </details>
                );
              })}
            </div>
          </div>
        )}

        {/* Invoices / outstanding balance */}
        {job.invoices.length > 0 && (
          <div className="rounded-xl border border-border bg-white p-5">
            <h2 className="font-bold">Outstanding invoices</h2>
            <div className="mt-3 space-y-3">
              {job.invoices.map((inv) => {
                const hasPayLink =
                  inv.stripePaymentLink &&
                  inv.stripePaymentLink.startsWith("http");
                return (
                  <div
                    key={inv.id}
                    className="rounded-lg border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#0f172a]">
                          Invoice #{inv.invoiceNumber}
                        </p>
                        {inv.dueDate && (
                          <p className="text-xs text-muted-foreground">
                            Due {dateShort(inv.dueDate)}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-black text-[#183d29]">
                          {money(inv.balanceDue)}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {inv.status.toLowerCase().replace("_", " ")}
                        </p>
                      </div>
                    </div>
                    {hasPayLink ? (
                      <a
                        href={inv.stripePaymentLink!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 block rounded-md bg-[#183d29] px-4 py-2.5 text-center text-sm font-bold text-white hover:bg-[#143322]"
                      >
                        Pay invoice — {money(inv.balanceDue)}
                      </a>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Contact your contractor to arrange payment.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            {job.invoices.length > 1 && (
              <div className="mt-3 border-t border-slate-100 pt-3 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Total outstanding</p>
                <p className="font-black text-[#183d29]">
                  {money(outstandingBalance)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* All caught up */}
        {pendingSelections.length === 0 &&
          job.changeOrders.length === 0 &&
          outstandingBalance === 0 && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-center">
              <p className="text-lg font-bold text-green-700">All caught up.</p>
              <p className="mt-1 text-sm text-green-600">
                No decisions needed and no outstanding items. Your contractor
                will reach out when something needs your attention.
              </p>
            </div>
          )}

        {/* Client change request form */}
        <ClientRequestForm token={token} />
      </main>

      <footer className="border-t border-border px-4 py-6 text-center">
        <p className="text-xs text-muted-foreground">
          Project update provided by {org.name ?? "your contractor"} via
          RenoTrack360.
          {org.phone && ` · ${org.phone}`}
          {org.email && ` · ${org.email}`}
        </p>
      </footer>
    </div>
  );
}
