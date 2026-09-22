import { requireStaffPage } from "@/lib/staff-access";
﻿import Link from "next/link";
import { createChangeOrderApproval, deleteChangeOrder } from "@/app/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { LinkButton, Panel } from "@/components/ui";
import { buildMailtoLink } from "@/lib/email";
import { changeOrderDigest } from "@/lib/change-order-ledger";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { buildSmsLink } from "@/lib/sms";
import { dateShort, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function ChangeOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage();
  const { id } = await params;
  const [order, latestApproval] = await Promise.all([
    prisma.changeOrder.findFirstOrThrow({
      where: { id, job: { organizationId: DEFAULT_ORG_ID } },
      include: { job: { include: { financialBaseline: true } }, clientProfile: true },
    }),
    prisma.clientApproval.findFirst({
      where: { changeOrderId: id, snapshot: { organizationId: DEFAULT_ORG_ID } },
      include: { snapshot: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const activeApproval = latestApproval?.token && latestApproval.snapshot && ["SENT", "VIEWED"].includes(latestApproval.status) && latestApproval.snapshot.expiresAt > new Date() && latestApproval.snapshot.contentDigest === changeOrderDigest(order) ? latestApproval : null;

  return (
    <>
      <PageHeader title={order.changeOrderTitle} body={`Change order for ${order.job.jobName}`} />
      <div className="mb-4 flex items-center gap-3">
        <Link href="/change-orders" className="text-sm font-semibold text-muted-foreground hover:text-foreground">← All change orders</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={`/jobs/${order.jobId}`} className="text-sm font-semibold text-muted-foreground hover:text-foreground">View job</Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <div className="grid gap-5">
          <div className="grid gap-4 md:grid-cols-3">
            <Panel className="p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Status</p>
              <div className="mt-2"><StatusPill value={order.status} /></div>
            </Panel>
            <Panel className="p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Added cost</p>
              <p className="mt-2 text-2xl font-bold">{money(order.addedCost)}</p>
            </Panel>
            <Panel className="p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Added time</p>
              <p className="mt-2 text-2xl font-bold">{order.addedTime} day{order.addedTime !== 1 ? "s" : ""}</p>
            </Panel>
          </div>

          {order.reason && (
            <Panel className="p-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Reason for change</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{order.reason}</p>
            </Panel>
          )}

          {order.fieldCondition && (
            <Panel className="p-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Field condition / site notes</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{order.fieldCondition}</p>
            </Panel>
          )}

          {order.photos.length > 0 && (
            <Panel className="overflow-hidden p-0">
              <div className="border-b border-border px-5 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Photos · {order.photos.length}</p>
              </div>
              <div className="grid grid-cols-2 gap-1 p-1 sm:grid-cols-3 md:grid-cols-4">
                {order.photos.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="group aspect-square overflow-hidden rounded">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover transition group-hover:scale-105" />
                  </a>
                ))}
              </div>
            </Panel>
          )}
        </div>

        <div className="grid gap-4 self-start">
          <Panel className="p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Job</p>
            <Link href={`/jobs/${order.jobId}`} className="mt-1 block text-sm font-semibold text-primary hover:underline">{order.job.jobName}</Link>
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Client</p>
            <p className="mt-1 text-sm">{order.clientProfile?.profileName ?? "Not assigned"}</p>
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Requested by client</p>
            <p className="mt-1 text-sm">{order.clientRequested ? "Yes" : "No"}</p>
            {order.approvedDate && (
              <>
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Approved</p>
                <p className="mt-1 text-sm">{dateShort(order.approvedDate)}</p>
              </>
            )}
          </Panel>

          <Panel className="p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Actions</p>
            <div className="grid gap-2">
              <Link href={"/change-orders/" + order.id + "/edit"} className="text-sm text-primary underline">Review or edit draft</Link>
              {!order.job.financialBaseline && <Link href={"/jobs/" + order.jobId + "/financial-review"} className="text-sm text-primary underline">Complete owner financial review before issuing</Link>}
              {latestApproval && !activeApproval && <p className="text-xs text-muted-foreground">Previous request: {latestApproval.status}. Only a current reviewed link can accept a new response.</p>}
              {activeApproval ? (
                <div className="rounded-md border border-green-200 bg-green-50 p-3">
                  <p className="text-xs font-bold text-green-700">Approval link active</p>
                  <p className="mt-1 text-xs text-green-600">
                    Status: <strong>{activeApproval.status}</strong>
                    {activeApproval.signerName && ` · Signed by ${activeApproval.signerName}`}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Link
                      href={`/approve/${activeApproval.token}`}
                      target="_blank"
                      className="text-xs font-semibold text-green-700 hover:underline"
                    >
                      Preview approval page →
                    </Link>
                  </div>
                  {order.clientProfile?.phone && (
                    <a
                      href={buildSmsLink(order.clientProfile.phone, `Hi ${order.clientProfile.profileName}, please review and approve this change order for ${order.job.jobName}: ${process.env.NEXT_PUBLIC_APP_URL ?? "https://renotrack360.com"}/approve/${activeApproval.token}`)}
                      className="mt-2 block rounded-md bg-green-700 px-3 py-2 text-center text-xs font-bold text-white hover:bg-green-800"
                    >
                      📱 Text approval link to client
                    </a>
                  )}
                </div>
              ) : (
                ["DRAFT", "SENT"].includes(order.status) && (
                  <form action={createChangeOrderApproval.bind(null, order.id, changeOrderDigest(order))}>
                    <button type="submit" className="w-full rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10">
                      Issue reviewed scope and price
                    </button>
                  </form>
                )
              )}
              <a href={`/api/pdf/change-order/${order.id}`} download className="block rounded-md border border-border px-3 py-2 text-center text-sm font-semibold hover:bg-muted">
                ↓ Download PDF
              </a>
              <LinkButton href={`/change-orders/new`} variant="secondary">New change order</LinkButton>
              {order.status === "DRAFT" && (
                <form action={deleteChangeOrder.bind(null, order.id)}>
                  <ConfirmSubmitButton
                    message={`Permanently delete change order "${order.changeOrderTitle}"? This cannot be undone.`}
                    className="block w-full rounded-md border border-red-200 bg-red-50 px-3 py-2 text-center text-sm font-semibold text-red-700 hover:bg-red-100"
                  >
                    Delete draft
                  </ConfirmSubmitButton>
                </form>
              )}
              {activeApproval && order.clientProfile?.email && (
                <a href={buildMailtoLink(order.clientProfile.email, "Change order review - " + order.changeOrderTitle, "Please review the retained scope, price and time impact: " + (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.renotrack360.com") + "/approve/" + activeApproval.token)} className="text-sm text-primary underline">Email reviewed approval link</a>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
