import { requireStaffPage } from "@/lib/staff-access";
﻿import Link from "next/link";
import { publishWeeklyReport, sendWeeklyReportEmail } from "@/app/actions";
import { reportDigest } from "@/lib/report-publication";
import { weeklyReportInOrganization } from "@/lib/company-scope";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { dateShort } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function WeeklyReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireStaffPage();
  const { id } = await params;
  const report = await prisma.weeklyReport.findFirst({
    where: weeklyReportInOrganization(actor.organizationId, { id }),
    include: { job: { include: { clientProfile: true } }, publications: { orderBy: { revision: "desc" }, take: 1 } }
  });
  if (!report) notFound();
  const publication = report.publications[0];
  const digest = reportDigest(report);
  const hasUnpublishedChanges = publication?.sourceDigest !== digest;

  return (
    <>
      <PageHeader title={`Week ending ${dateShort(report.weekEnding)}`} body={report.job.jobName} />
      <Panel className="mb-5 p-4">
        <p className="font-semibold">{!publication ? "Draft: only visible to Flipside staff" : hasUnpublishedChanges ? "Draft changes await review" : `Published revision ${publication.revision}`}</p>
        <p className="mt-1 text-sm text-muted-foreground">Review the report below before publishing. Internal notes and unreviewed photos stay private. {publication && "Clients continue to see the last published revision until you publish a new one."}</p>
        {hasUnpublishedChanges && (
          <form action={publishWeeklyReport.bind(null, report.id, digest)} className="mt-3">
            <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Approve and publish current draft</button>
          </form>
        )}
        <Link href={`/weekly-reports/${report.id}/edit`} className="mt-3 inline-block text-sm font-semibold text-primary">Edit draft</Link>
      </Panel>
      <div className="mb-4 flex items-center gap-3">
        <Link href="/weekly-reports" className="text-sm font-semibold text-muted-foreground hover:text-foreground">← All reports</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={`/jobs/${report.jobId}`} className="text-sm font-semibold text-muted-foreground hover:text-foreground">View job</Link>
        <span className="text-muted-foreground">·</span>
        <a href={`/api/pdf/weekly-report/${report.id}`} download className="text-sm font-semibold text-primary hover:underline">↓ Download PDF</a>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
        <div className="grid gap-5">
          <Panel className="p-5">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Work completed</h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{report.workCompleted}</p>
          </Panel>

          {report.clientSummary && (
            <Panel className="p-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Client summary</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{report.clientSummary}</p>
            </Panel>
          )}

          {report.nextWeekPlan && (
            <Panel className="p-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Next week plan</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{report.nextWeekPlan}</p>
            </Panel>
          )}

          {(report.issuesFound || report.decisionsNeeded) && (
            <div className="grid gap-5 md:grid-cols-2">
              {report.issuesFound && (
                <Panel className="border-red-200 p-5">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-red-600">Issues found</h3>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{report.issuesFound}</p>
                </Panel>
              )}
              {report.decisionsNeeded && (
                <Panel className="border-amber-200 p-5">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-amber-700">Decisions needed</h3>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{report.decisionsNeeded}</p>
                </Panel>
              )}
            </div>
          )}

          {(report.budgetNotes || report.scheduleNotes) && (
            <div className="grid gap-5 md:grid-cols-2">
              {report.budgetNotes && (
                <Panel className="p-5">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Budget notes</h3>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{report.budgetNotes}</p>
                </Panel>
              )}
              {report.scheduleNotes && (
                <Panel className="p-5">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Schedule notes</h3>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{report.scheduleNotes}</p>
                </Panel>
              )}
            </div>
          )}

          {report.internalNotes && (
            <Panel className="p-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Internal notes</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{report.internalNotes}</p>
            </Panel>
          )}
        </div>

        <div className="grid gap-4 self-start">
          <Panel className="p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Job</p>
            <Link href={`/jobs/${report.jobId}`} className="mt-1 block text-sm font-semibold text-primary hover:underline">{report.job.jobName}</Link>
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Week ending</p>
            <p className="mt-1 font-semibold">{dateShort(report.weekEnding)}</p>
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Photos</p>
            <p className="mt-1 text-sm">{report.photos.length > 0 ? `${report.photos.length} attached` : "None"}</p>
            {report.sentAt && (
              <>
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Last recorded send</p>
                <p className="mt-1 text-sm">{dateShort(report.sentAt)}</p>
              </>
            )}
          </Panel>
          <Panel className="p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Actions</p>
            <a
              href={`/api/pdf/weekly-report/${report.id}`}
              download
              className="flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-center text-sm font-semibold hover:bg-muted"
            >
              ↓ Download PDF
            </a>
            {report.job.clientProfile?.email && publication && (
              <>
                <form action={sendWeeklyReportEmail.bind(null, report.id)} className="mt-2">
                  <button type="submit" className="w-full rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-center text-sm font-semibold text-primary hover:bg-primary/10">
                    ✉ Send published report to client
                  </button>
                </form>
                {report.sentAt && (
                  <p className="mt-1 text-xs text-green-700">Sent {dateShort(report.sentAt)}</p>
                )}
                <p className="mt-1 text-center text-xs text-muted-foreground">
                  Sends email directly if Resend is configured - otherwise opens your mail client.
                </p>
              </>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
