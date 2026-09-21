import { requireStaffPage } from "@/lib/staff-access";
﻿import Link from "next/link";
import { captureOutOfScopeRequest, createChangeOrderFromRequest } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { dateShort, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function ScopeCreepPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage();
  const { id } = await params;
  const job = await prisma.job.findUniqueOrThrow({
    where: { id },
    include: {
      clientProfile: true,
      activities: {
        where: { isOutOfScope: true },
        orderBy: { createdAt: "desc" },
      },
      changeOrders: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const pendingRequests = job.activities.filter((a) => !a.completedAt);
  const convertedRequests = job.activities.filter((a) => a.completedAt);

  const now = new Date();
  const staleDraftCOs = job.changeOrders.filter(
    (co) => co.status === "DRAFT" && now.getTime() - co.createdAt.getTime() > 3 * 86_400_000
  );

  return (
    <>
      <PageHeader
        title="Scope Creep Tracker"
        body={`${job.jobName} - capture every verbal request before it becomes a free gift`}
      />
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Link href={`/jobs/${id}`} className="font-semibold text-muted-foreground hover:text-foreground">← Job</Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/change-orders/new" className="font-semibold text-primary hover:underline">+ New change order</Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/budget" className="font-semibold text-muted-foreground hover:text-foreground">Profit leak dashboard</Link>
      </div>

      {staleDraftCOs.length > 0 && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="font-bold text-red-800">
            {staleDraftCOs.length} change order{staleDraftCOs.length !== 1 ? "s" : ""} still in DRAFT
          </p>
          <p className="mt-1 text-sm text-red-700">
            {staleDraftCOs.map((co) => co.changeOrderTitle).join(", ")} - unsigned for {Math.floor((now.getTime() - staleDraftCOs[0].createdAt.getTime()) / 86_400_000)}+ days.{" "}
            <Link href={`/change-orders/${staleDraftCOs[0].id}`} className="font-bold underline">Get signed →</Link>
          </p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          {/* Pending requests */}
          <Panel className="p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="font-bold">Pending requests ({pendingRequests.length})</h3>
              <span className="text-xs text-muted-foreground">Not yet in a change order</span>
            </div>
            {pendingRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No untracked requests. Good scope discipline.</p>
            ) : (
              <div className="grid gap-3">
                {pendingRequests.map((activity) => (
                  <div key={activity.id} className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-amber-900">{activity.subject}</p>
                        {activity.body && (
                          <p className="mt-1 text-sm text-amber-800">{activity.body}</p>
                        )}
                        <p className="mt-2 text-xs text-amber-700">
                          Logged {dateShort(activity.createdAt)} - no change order yet
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <form action={createChangeOrderFromRequest.bind(null, activity.id, id)}>
                        <button type="submit" className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-800">
                          Create change order from this
                        </button>
                      </form>
                      <Link
                        href={`/change-orders/new?jobId=${id}&title=${encodeURIComponent(activity.subject)}&reason=${encodeURIComponent(activity.body ?? activity.subject)}&clientRequested=true`}
                        className="rounded-md border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                      >
                        New change order manually
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* All change orders for this job */}
          <Panel className="p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="font-bold">Change orders ({job.changeOrders.length})</h3>
              <Link href="/change-orders/new" className="text-xs font-semibold text-primary hover:underline">+ New</Link>
            </div>
            {job.changeOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No change orders yet on this job.</p>
            ) : (
              <div className="grid gap-2">
                {job.changeOrders.map((co) => {
                  const staleDays = Math.floor((now.getTime() - co.createdAt.getTime()) / 86_400_000);
                  const isStale = co.status === "DRAFT" && staleDays > 3;
                  return (
                    <Link
                      key={co.id}
                      href={`/change-orders/${co.id}`}
                      className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5 hover:bg-muted/50"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold truncate">{co.changeOrderTitle}</p>
                          {isStale && (
                            <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                              {staleDays}d stale
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{co.status.replaceAll("_", " ")} · {dateShort(co.createdAt)}</p>
                      </div>
                      <span className="shrink-0 font-bold text-sm">+{money(co.addedCost)}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </Panel>

          {/* Converted / closed requests */}
          {convertedRequests.length > 0 && (
            <Panel className="p-5">
              <h3 className="mb-4 font-bold text-muted-foreground">Closed requests ({convertedRequests.length})</h3>
              <div className="grid gap-2">
                {convertedRequests.map((activity) => (
                  <div key={activity.id} className="rounded-md border border-border px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium line-through text-muted-foreground">{activity.subject}</p>
                      <span className="text-xs text-green-600 font-semibold">Closed</span>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>

        {/* Capture form */}
        <div className="space-y-4 self-start">
          <Panel className="p-5">
            <p className="mb-1 font-bold">Client asked for something?</p>
            <p className="mb-4 text-xs text-muted-foreground">
              Log it now before you forget. Every verbal request that isn't captured is money you worked for but didn't charge.
            </p>
            <form action={captureOutOfScopeRequest} className="grid gap-3">
              <input type="hidden" name="jobId" value={id} />
              {job.clientProfile && (
                <input type="hidden" name="profileId" value={job.clientProfile.id} />
              )}
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-muted-foreground">What did they ask for?</label>
                <input
                  name="subject"
                  required
                  placeholder="e.g. Paint the garage while you're at it"
                  className="h-10 w-full rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-muted-foreground">Details (optional)</label>
                <textarea
                  name="body"
                  rows={3}
                  placeholder="Any context - how they asked, what triggered it, your estimate of cost"
                  className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <button type="submit" className="h-10 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90">
                Log scope request
              </button>
            </form>
            <p className="mt-3 text-xs text-muted-foreground">
              No credit card needed. Just log it. You can convert it to a change order in one click.
            </p>
          </Panel>

          <Panel className="p-4">
            <p className="mb-2 text-xs font-bold uppercase text-muted-foreground">Scope summary</p>
            <dl className="grid gap-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Total change order value</dt>
                <dd className="font-bold">{money(job.changeOrders.reduce((s, co) => s + Number(co.addedCost), 0))}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Approved</dt>
                <dd className="font-semibold text-green-700">
                  {money(job.changeOrders.filter((co) => co.status === "APPROVED").reduce((s, co) => s + Number(co.addedCost), 0))}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Pending / draft</dt>
                <dd className="font-semibold text-amber-700">
                  {money(job.changeOrders.filter((co) => ["DRAFT", "SENT"].includes(co.status)).reduce((s, co) => s + Number(co.addedCost), 0))}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Unlogged requests</dt>
                <dd className={`font-semibold ${pendingRequests.length > 0 ? "text-red-600" : "text-muted-foreground"}`}>
                  {pendingRequests.length}
                </dd>
              </div>
            </dl>
          </Panel>
        </div>
      </div>
    </>
  );
}
