import { requireStaffPage } from "@/lib/staff-access";
﻿import Link from "next/link";
import { scheduleFollowUps } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { StatusPill } from "@/components/status-pill";
import { dateShort, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function CloseoutPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage();
  const { id } = await params;
  const job = await prisma.job.findUniqueOrThrow({
    where: { id },
    include: {
      phases: { orderBy: { phaseNumber: "asc" }, include: { tasks: true } },
      weeklyReports: { orderBy: { weekEnding: "desc" } },
      changeOrders: { orderBy: { createdAt: "desc" } },
      invoices: { orderBy: { dueDate: "desc" } },
      clientProfile: true,
      property: true,
    },
  });

  const phasesDone = job.phases.filter((p) => {
    if (p.tasks.length === 0) return p.status === "COMPLETE";
    return p.tasks.every((t) => t.status === "COMPLETE");
  }).length;

  const openChangeOrders = job.changeOrders.filter((co) => ["DRAFT", "SENT"].includes(co.status));
  const unpaidInvoices = job.invoices.filter((inv) => ["SENT", "PARTIALLY_PAID", "OVERDUE"].includes(inv.status));
  const totalBalance = job.invoices.reduce((sum, inv) => sum + Number(inv.balanceDue), 0);

  const hasFollowUps = await prisma.activity.count({
    where: { relatedJobId: id, activityType: "FOLLOW_UP" },
  });

  return (
    <>
      <PageHeader
        title="Closeout Package"
        body={`${job.jobName} - final status, follow-ups, and client delivery`}
        actionHref={`/api/jobs/${id}/closeout-pdf`}
        actionLabel="Download PDF"
      />

      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Link href={`/jobs/${id}`} className="font-semibold text-muted-foreground hover:text-foreground">← Job</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={`/jobs/${id}/feedback`} className="font-semibold text-primary hover:underline">Testimonial requests →</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={`/jobs/${id}/briefing`} className="font-semibold text-muted-foreground hover:text-foreground">Pre-construction briefing</Link>
      </div>

      {/* Readiness checklist */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-5">
        {[
          {
            label: "Phases complete",
            value: `${phasesDone} / ${job.phases.length}`,
            ok: phasesDone === job.phases.length,
            detail: phasesDone < job.phases.length ? `${job.phases.length - phasesDone} phases still open` : "All phases done",
          },
          {
            label: "Open change orders",
            value: openChangeOrders.length,
            ok: openChangeOrders.length === 0,
            detail: openChangeOrders.length > 0 ? `${openChangeOrders.length} unsigned` : "All signed or closed",
          },
          {
            label: "Outstanding balance",
            value: money(totalBalance),
            ok: totalBalance === 0,
            detail: unpaidInvoices.length > 0 ? `${unpaidInvoices.length} invoice${unpaidInvoices.length !== 1 ? "s" : ""} unpaid` : "Fully paid",
          },
          {
            label: "Follow-ups scheduled",
            value: hasFollowUps > 0 ? "Yes" : "No",
            ok: hasFollowUps > 0,
            detail: hasFollowUps > 0 ? `${hasFollowUps} activities queued` : "Not scheduled yet",
          },
        ].map((item) => (
          <Panel key={item.label} className={`p-4 ${!item.ok ? "border-amber-200 bg-amber-50" : ""}`}>
            <p className="text-xs font-bold uppercase text-muted-foreground">{item.label}</p>
            <p className={`mt-2 text-2xl font-bold ${!item.ok ? "text-amber-700" : ""}`}>{item.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
          </Panel>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <div className="space-y-5">
          {/* Phase summary */}
          <Panel className="p-5">
            <h3 className="mb-3 font-bold">Phase summary</h3>
            <div className="grid gap-2">
              {job.phases.map((phase) => {
                const phaseStatus = phase.tasks.length
                  ? phase.tasks.every((t) => t.status === "COMPLETE") ? "COMPLETE"
                  : phase.tasks.some((t) => t.status === "BLOCKED") ? "BLOCKED"
                  : phase.tasks.some((t) => t.status === "IN_PROGRESS") ? "IN_PROGRESS"
                  : "NOT_STARTED"
                  : phase.status;
                return (
                  <div key={phase.id} className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                    <span className="w-8 text-xs font-bold text-muted-foreground">{String(phase.phaseNumber).padStart(2, "0")}</span>
                    <span className="flex-1 text-sm font-medium">{phase.phaseName}</span>
                    <StatusPill value={phaseStatus} />
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* Weekly reports */}
          <Panel className="p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="font-bold">Weekly reports ({job.weeklyReports.length})</h3>
              <Link href={`/weekly-reports/new?jobId=${id}`} className="text-xs font-semibold text-primary hover:underline">+ Add report</Link>
            </div>
            {job.weeklyReports.length === 0 ? (
              <p className="text-sm text-muted-foreground">No weekly reports yet.</p>
            ) : (
              <div className="grid gap-2">
                {job.weeklyReports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
                    <span className="font-medium">Week ending {dateShort(report.weekEnding)}</span>
                    <div className="flex gap-3">
                      <Link href={`/weekly-reports/${report.id}`} className="font-semibold text-primary hover:underline">View</Link>
                      <a href={`/api/pdf/weekly-report/${report.id}`} download className="font-semibold text-muted-foreground hover:text-foreground">PDF</a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Change orders */}
          {job.changeOrders.length > 0 && (
            <Panel className="p-5">
              <h3 className="mb-3 font-bold">Change orders ({job.changeOrders.length})</h3>
              <div className="grid gap-2">
                {job.changeOrders.map((co) => (
                  <div key={co.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
                    <span className="font-medium">{co.changeOrderTitle}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{money(co.addedCost)}</span>
                      <StatusPill value={co.status} />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>

        {/* Right column actions */}
        <div className="space-y-4 self-start">
          {/* Before/after gallery */}
          <Panel className="p-4">
            <p className="mb-1 text-xs font-bold uppercase text-muted-foreground">Before / after gallery</p>
            <p className="mb-3 text-xs text-muted-foreground">Organize photos by label, generate a proof PDF to share with clients and use as marketing.</p>
            <Link
              href={`/jobs/${id}/gallery`}
              className="block rounded-lg bg-primary px-3 py-2.5 text-center text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Open gallery →
            </Link>
          </Panel>

          {/* Referral campaign */}
          {job.clientProfile && (
            <Panel className="p-4">
              <p className="mb-1 text-xs font-bold uppercase text-muted-foreground">Referral campaign</p>
              <p className="mb-3 text-xs text-muted-foreground">Send a one-tap message to your client asking if they know anyone who needs renovation work.</p>
              {job.clientProfile.phone ? (
                <a
                  href={`sms:${job.clientProfile.phone.replace(/\D/g, "")}?body=${encodeURIComponent(`Hi ${job.clientProfile.profileName?.split(" ")[0] ?? "there"}, we just wrapped up your project and loved working with you. If you know anyone in ${job.property?.propertyAddress?.split(",")[1]?.trim() ?? "your area"} who is thinking about a renovation, we'd be grateful for the introduction. No pressure at all - just wanted to let you know we're taking on new projects!`)}`}
                  className="block rounded-lg border border-border px-3 py-2.5 text-center text-sm font-semibold hover:bg-muted"
                >
                  📱 Send referral request
                </a>
              ) : job.clientProfile.email ? (
                <a
                  href={`mailto:${job.clientProfile.email}?subject=${encodeURIComponent(`Referral request - ${job.jobName}`)}&body=${encodeURIComponent(`Hi ${job.clientProfile.profileName?.split(" ")[0] ?? "there"},\n\nWe just wrapped up your project and we really enjoyed working with you. If you know anyone thinking about a renovation, we'd love an introduction.\n\nThank you again for trusting us with your home.\n\nBest regards`)}`}
                  className="block rounded-lg border border-border px-3 py-2.5 text-center text-sm font-semibold hover:bg-muted"
                >
                  ✉ Email referral request
                </a>
              ) : (
                <p className="text-xs text-muted-foreground">No phone or email on file for this client.</p>
              )}
            </Panel>
          )}

          {/* Download closeout PDF */}
          <Panel className="p-4">
            <p className="mb-3 text-xs font-bold uppercase text-muted-foreground">Closeout package</p>
            <a
              href={`/api/jobs/${id}/closeout-pdf`}
              download
              className="block rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-center text-sm font-semibold text-primary hover:bg-primary/10"
            >
              ↓ Download closeout PDF
            </a>
            <p className="mt-2 text-xs text-muted-foreground">Includes phases, reports, change orders, and balance summary.</p>
          </Panel>

          {/* Follow-up scheduler */}
          <Panel className="p-4">
            <p className="mb-1 text-xs font-bold uppercase text-muted-foreground">Follow-up schedule</p>
            <p className="mb-3 text-xs text-muted-foreground">Creates activities at 30 days, 90 days, and 1 year from today.</p>
            {hasFollowUps > 0 ? (
              <div className="rounded-md bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground">
                {hasFollowUps} follow-up activities already scheduled.
                <Link href="/activities?type=FOLLOW_UP" className="ml-1 text-primary hover:underline">View →</Link>
              </div>
            ) : (
              <form action={scheduleFollowUps.bind(null, id)}>
                <button type="submit" className="w-full rounded-lg border border-border px-3 py-2.5 text-sm font-semibold hover:bg-muted">
                  Schedule 30 / 90 / 365-day follow-ups
                </button>
              </form>
            )}
          </Panel>

          {/* Invoices */}
          <Panel className="p-4">
            <p className="mb-3 text-xs font-bold uppercase text-muted-foreground">Invoice summary</p>
            {job.invoices.length === 0 ? (
              <p className="text-xs text-muted-foreground">No invoices yet.</p>
            ) : (
              <div className="space-y-2">
                {job.invoices.map((inv) => (
                  <div key={inv.id} className="flex justify-between text-sm">
                    <Link href={`/invoices/${inv.id}`} className="font-semibold text-primary hover:underline">{inv.invoiceNumber}</Link>
                    <span className={Number(inv.balanceDue) > 0 ? "font-bold text-red-600" : "text-muted-foreground"}>{money(inv.balanceDue)}</span>
                  </div>
                ))}
                <div className="border-t border-border pt-2 flex justify-between text-sm font-bold">
                  <span>Total outstanding</span>
                  <span className={totalBalance > 0 ? "text-red-600" : ""}>{money(totalBalance)}</span>
                </div>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
