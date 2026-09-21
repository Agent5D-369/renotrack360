import { requireStaffPage } from "@/lib/staff-access";
﻿import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { LinkButton, Panel } from "@/components/ui";
import { buildMailtoLink } from "@/lib/email";
import { dateShort, money, titleFromEnum } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function EstimateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage();
  const { id } = await params;
  const estimate = await prisma.estimate.findUniqueOrThrow({
    where: { id },
    include: {
      quote: { include: { lineItems: true, financingRecords: true } },
      clientProfile: true,
      property: true,
      followUps: { orderBy: { dueDate: "asc" } },
      revisions: { orderBy: { revisionNumber: "desc" } },
      viewEvents: { orderBy: { viewedAt: "desc" } },
      options: { orderBy: { sortOrder: "asc" } }
    }
  });

  const readiness = [
    ["Scope clarity", estimate.scopeClarity],
    ["Readiness", estimate.readinessScore],
    ["Pricing confidence", estimate.confidenceScore]
  ] as const;

  return (
    <>
      <PageHeader title={estimate.estimateNumber} body="Estimate readiness, confidence, client tracking, and follow-up assistance." actionHref={`/estimates/${estimate.id}/edit`} actionLabel="Edit estimate" />
      <div className="grid gap-4 md:grid-cols-3">
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Total</p><p className="text-2xl font-bold">{money(estimate.total)}</p></Panel>
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Status</p><div className="mt-2"><StatusPill value={estimate.status} /></div></Panel>
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Viewed</p><p className="text-2xl font-bold">{estimate.viewEvents.length}</p></Panel>
      </div>
      {/* Good / Better / Best proposal panel */}
      <Panel className="mt-5 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold">Good · Better · Best Proposal</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {estimate.options.length === 0
                ? "Build a three-tier sales proposal to present investment options to your client. Contractors who offer Good/Better/Best close more jobs at higher margins."
                : `${estimate.options.length} tier${estimate.options.length !== 1 ? "s" : ""} defined. Click to edit or present to client.`}
            </p>
          </div>
          <LinkButton href={`/estimates/${estimate.id}/proposal`} variant="primary" className="shrink-0">
            {estimate.options.length === 0 ? "Build proposal" : "Edit proposal →"}
          </LinkButton>
        </div>
        {estimate.options.length > 0 && (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {estimate.options.map((opt) => (
              <div key={opt.id} className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{opt.optionTier}</p>
                <p className="mt-1 font-semibold">{opt.optionName}</p>
                <p className="text-xl font-bold text-primary">{money(opt.total)}</p>
                {opt.included && <p className="mt-1 text-xs font-semibold text-amber-600">★ Recommended</p>}
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Financing panel */}
      {estimate.quote.financingRecords.length > 0 && (
        <Panel className="mt-5 p-5">
          <h3 className="text-lg font-bold">Financing</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {estimate.quote.financingRecords.map((rec) => (
              <div key={rec.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between">
                  <StatusPill value={rec.status} />
                  {rec.desiredAmount && <p className="text-sm font-bold">{money(rec.desiredAmount)}</p>}
                </div>
                {rec.provider && <p className="mt-2 text-sm font-semibold">{rec.provider}</p>}
                {rec.applicationUrl && (
                  <a href={rec.applicationUrl} target="_blank" rel="noopener noreferrer" className="mt-1 block text-sm text-primary hover:underline">
                    Application link →
                  </a>
                )}
                {rec.notes && <p className="mt-2 text-xs text-muted-foreground">{rec.notes}</p>}
              </div>
            ))}
          </div>
          <LinkButton href="/financing" variant="secondary" className="mt-4">
            Manage financing records
          </LinkButton>
        </Panel>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
        <Panel className="p-5">
          <h3 className="text-lg font-bold">Readiness checklist</h3>
          <div className="mt-4 grid gap-3">
            {readiness.map(([label, score]) => (
              <div key={label} className="grid gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">{label}</span>
                  <span>{score}/100</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary" style={{ width: `${score}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm text-muted-foreground">
            {estimate.clientFacingSummary ?? "Add a short client-facing summary before sending so the estimate explains scope, allowances, exclusions, and confidence clearly."}
          </p>
        </Panel>
        {estimate.clientProfile?.email && (
          <Panel className="p-5">
            <h3 className="text-lg font-bold">Email client</h3>
            <p className="mt-1 text-sm text-muted-foreground">Opens your email client pre-filled. Review and send - nothing is sent automatically.</p>
            <div className="mt-4 grid gap-2">
              <a href={buildMailtoLink(estimate.clientProfile.email, `Your estimate ${estimate.estimateNumber}`, `Hi ${estimate.clientProfile.profileName},\n\nPlease find your estimate ${estimate.estimateNumber} for ${estimate.property?.propertyAddress ?? "your project"}.\n\nTotal: $${Number(estimate.total).toLocaleString()}\nExpires: ${estimate.expirationDate ? new Date(estimate.expirationDate).toLocaleDateString() : "TBD"}\n\nPlease let me know if you have any questions.\n\nBest regards`)}
                className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-muted">
                ✉ Send estimate to {estimate.clientProfile.profileName}
              </a>
              <a href={buildMailtoLink(estimate.clientProfile.email, `Following up on estimate ${estimate.estimateNumber}`, `Hi ${estimate.clientProfile.profileName},\n\nI wanted to follow up on estimate ${estimate.estimateNumber}. Have you had a chance to review it?\n\nI'm happy to walk through any questions or adjust the scope.\n\nBest regards`)}
                className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-muted">
                ✉ Follow-up email
              </a>
            </div>
          </Panel>
        )}
        <Panel className="p-5">
          <h3 className="text-lg font-bold">Follow-up plan</h3>
          <div className="mt-4 grid gap-3">
            {estimate.followUps.length === 0 && (
              <p className="text-sm text-muted-foreground">No follow-ups scheduled. Convert this quote to a tracked estimate to generate a follow-up sequence.</p>
            )}
            {estimate.followUps.map((followUp) => (
              <Link
                key={followUp.id}
                href={`/estimates/${estimate.id}/follow-ups/${followUp.id}`}
                className="block rounded-md border border-border p-3 transition hover:border-primary hover:bg-muted/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <StatusPill value={followUp.status} />
                  <span className="text-xs font-semibold text-muted-foreground">{dateShort(followUp.dueDate)}</span>
                </div>
                <p className="mt-2 text-sm font-semibold">{titleFromEnum(followUp.followUpType)}</p>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{followUp.suggestedMessage ?? "Click to view and update this follow-up."}</p>
                <p className="mt-2 text-xs font-semibold text-primary">Open →</p>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
