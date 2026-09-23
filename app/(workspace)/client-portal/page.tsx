import { requireStaffPage } from "@/lib/staff-access";
﻿import Link from "next/link";
import { generateJobPortalToken } from "@/app/actions";
import { jobInOrganization } from "@/lib/company-scope";
import { clientApprovalInOrganization, selectionItemInOrganization } from "@/lib/delivery-scope";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { StatusPill } from "@/components/status-pill";
import { dateShort, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://renotrack360.com";

export default async function ClientPortalPage() {
  const actor = await requireStaffPage();
  const organizationId = actor.organizationId;
  const now = new Date();

  const [activeJobs, approvals, overdueSelections] = await Promise.all([
    prisma.job.findMany({
      where: jobInOrganization(organizationId, { jobStatus: { notIn: ["COMPLETE", "WARRANTY_FOLLOW_UP"] } }),
      include: {
        clientProfile: true,
        property: true,
        changeOrders: { where: { status: "SENT" } },
        invoices: { where: { status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } } },
        selectionSheets: {
          include: {
            items: {
              where: {
                decisionStatus: { in: ["NOT_STARTED", "OPTIONS_SENT"] },
                requiredByDate: { lt: now },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.clientApproval.findMany({
      where: clientApprovalInOrganization(organizationId, { status: { in: ["SENT", "VIEWED"] } }),
      include: { selectionItem: true },
      orderBy: { sentAt: "desc" },
      take: 20,
    }),
    prisma.selectionItem.count({
      where: selectionItemInOrganization(organizationId, {
        requiredByDate: { lt: now },
        decisionStatus: { in: ["NOT_STARTED", "OPTIONS_SENT"] },
      }),
    }),
  ]);

  const jobsWithPortal = activeJobs.filter((j) => j.portalToken);
  const jobsWithoutPortal = activeJobs.filter((j) => !j.portalToken);

  const pendingApprovals = approvals.length;
  const totalOutstanding = activeJobs.reduce(
    (sum, job) => sum + job.invoices.reduce((s, inv) => s + Number(inv.balanceDue), 0), 0
  );

  return (
    <>
      <PageHeader
        title="Client Portal"
        body="Manage every client's view - portal links, pending approvals, overdue decisions, and outstanding balances."
      />

      {/* Summary tiles */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        {[
          { label: "Active portals", value: jobsWithPortal.length, sub: `${jobsWithoutPortal.length} not yet generated`, color: "" },
          { label: "Pending approvals", value: pendingApprovals, sub: "Sent, awaiting client signature", color: pendingApprovals > 0 ? "border-amber-200 bg-amber-50" : "" },
          { label: "Overdue decisions", value: overdueSelections, sub: "Selections past required-by date", color: overdueSelections > 0 ? "border-red-200 bg-red-50" : "" },
          { label: "Outstanding balance", value: money(totalOutstanding), sub: "Across all active jobs", color: totalOutstanding > 0 ? "border-red-200 bg-red-50" : "" },
        ].map((tile) => (
          <Panel key={tile.label} className={`p-4 ${tile.color}`}>
            <p className="text-xs font-bold uppercase text-muted-foreground">{tile.label}</p>
            <p className={`mt-2 text-2xl font-bold ${tile.color.includes("red") ? "text-red-700" : tile.color.includes("amber") ? "text-amber-700" : ""}`}>
              {tile.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{tile.sub}</p>
          </Panel>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          {/* Active portals */}
          <Panel className="p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="font-bold">Active portal links ({jobsWithPortal.length})</h2>
              <p className="text-xs text-muted-foreground">Click to preview as the client sees it</p>
            </div>
            {jobsWithPortal.length === 0 ? (
              <p className="text-sm text-muted-foreground">No portals active yet. Generate a link from any job below.</p>
            ) : (
              <div className="grid gap-3">
                {jobsWithPortal.map((job) => {
                  const pendingDecisions = job.selectionSheets.flatMap((s) => s.items).length;
                  const pendingCOs = job.changeOrders.length;
                  const balance = job.invoices.reduce((s, inv) => s + Number(inv.balanceDue), 0);
                  const portalUrl = `${APP_URL}/portal/${job.portalToken}`;

                  return (
                    <div key={job.id} className="rounded-lg border border-border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <Link href={`/jobs/${job.id}`} className="font-semibold text-primary hover:underline">
                            {job.jobName}
                          </Link>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {job.clientProfile?.profileName ?? "No client"}
                            {job.property?.propertyAddress && ` · ${job.property.propertyAddress}`}
                          </p>
                        </div>
                        <StatusPill value={job.jobStatus} />
                      </div>

                      {/* Portal health indicators */}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {pendingDecisions > 0 && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                            {pendingDecisions} overdue decision{pendingDecisions !== 1 ? "s" : ""}
                          </span>
                        )}
                        {pendingCOs > 0 && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                            {pendingCOs} change order{pendingCOs !== 1 ? "s" : ""} awaiting approval
                          </span>
                        )}
                        {balance > 0 && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                            {money(balance)} outstanding
                          </span>
                        )}
                        {pendingDecisions === 0 && pendingCOs === 0 && balance === 0 && (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                            All clear
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link
                          href={`/portal/${job.portalToken}`}
                          target="_blank"
                          className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                        >
                          Preview portal →
                        </Link>
                        <button
                          type="button"
                          data-copy={portalUrl}
                          className="copy-btn rounded-md bg-slate-100 px-3 py-1.5 text-xs font-semibold hover:bg-slate-200"
                          title={portalUrl}
                        >
                          Copy link
                        </button>
                        {job.clientProfile?.phone && (
                          <a
                            href={`sms:${job.clientProfile.phone.replace(/\D/g, "")}?body=${encodeURIComponent(`Hi ${job.clientProfile.profileName?.split(" ")[0] ?? "there"}, here is your project update for ${job.jobName}: ${portalUrl}`)}`}
                            className="rounded-md bg-[#183d29] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1e4d35]"
                          >
                            📱 Text link
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          {/* Jobs without portals */}
          {jobsWithoutPortal.length > 0 && (
            <Panel className="p-5">
              <h2 className="mb-4 font-bold">Jobs without a portal link ({jobsWithoutPortal.length})</h2>
              <div className="grid gap-2">
                {jobsWithoutPortal.map((job) => (
                  <div key={job.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-4 py-3">
                    <div>
                      <Link href={`/jobs/${job.id}`} className="text-sm font-semibold text-primary hover:underline">
                        {job.jobName}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {job.clientProfile?.profileName ?? "No client assigned"}
                      </p>
                    </div>
                    <form action={generateJobPortalToken.bind(null, job.id)}>
                      <button type="submit" className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                        Generate portal link
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>

        {/* Right column: pending approvals */}
        <div className="space-y-4 self-start">
          <Panel className="p-4">
            <h2 className="mb-3 font-bold">Pending approvals</h2>
            {approvals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending approvals.</p>
            ) : (
              <div className="grid gap-2">
                {approvals.map((approval) => (
                  <div key={approval.id} className="rounded-md border border-amber-200 bg-amber-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold uppercase text-amber-700">{approval.approvalType.replaceAll("_", " ")}</p>
                      <StatusPill value={approval.status} />
                    </div>
                    {approval.sentAt && (
                      <p className="mt-1 text-xs text-amber-700">Sent {dateShort(approval.sentAt)}</p>
                    )}
                    {approval.viewedAt && (
                      <p className="text-xs text-green-700">Viewed {dateShort(approval.viewedAt)}</p>
                    )}
                    {approval.token && (
                      <Link
                        href={`/approve/${approval.token}`}
                        target="_blank"
                        className="mt-2 block text-xs font-semibold text-amber-800 hover:underline"
                      >
                        Preview approval page →
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>

      {/* Copy-link script */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.querySelectorAll('.copy-btn').forEach(btn => {
              btn.addEventListener('click', () => {
                const url = btn.getAttribute('data-copy');
                navigator.clipboard?.writeText(url).then(() => {
                  const orig = btn.textContent;
                  btn.textContent = 'Copied!';
                  setTimeout(() => { btn.textContent = orig; }, 2000);
                });
              });
            });
          `,
        }}
        suppressHydrationWarning
      />
    </>
  );
}
