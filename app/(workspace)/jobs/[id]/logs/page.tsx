import { requireStaffPage } from "@/lib/staff-access";
﻿import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { LinkButton, Panel } from "@/components/ui";
import { dateShort } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function JobLogsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage();
  const { id } = await params;
  const [job, reports] = await Promise.all([
    prisma.job.findUniqueOrThrow({ where: { id }, select: { id: true, jobName: true, propertyId: true, property: { select: { id: true, propertyAddress: true } } } }),
    prisma.fieldReport.findMany({ where: { jobId: id }, orderBy: { reportDate: "desc" } })
  ]);

  return (
    <>
      <PageHeader
        title="Daily Logs"
        body={`Field reports for ${job.jobName} - crew activity, work completed, blockers, and site photos.`}
        actionHref={`/jobs/${id}/logs/new`}
        actionLabel="+ New log"
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link href={`/jobs/${id}`} className="text-sm font-semibold text-muted-foreground hover:text-foreground">← Back to job</Link>
        {job.property && (
          <>
            <span className="text-muted-foreground">·</span>
            <Link href={`/properties/${job.property.id}`} className="text-sm font-semibold text-muted-foreground hover:text-foreground">{job.property.propertyAddress}</Link>
          </>
        )}
        <span className="text-muted-foreground">·</span>
        <span className="text-sm text-muted-foreground">{reports.length} log{reports.length !== 1 ? "s" : ""}</span>
      </div>

      {reports.length === 0 ? (
        <Panel className="p-10 text-center">
          <p className="text-2xl">📋</p>
          <p className="mt-3 font-semibold">No daily logs yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Log your first day of work - what was done, what was blocked, and photos of the site.</p>
          <div className="mt-5 flex justify-center">
            <LinkButton href={`/jobs/${id}/logs/new`}>Create first log</LinkButton>
          </div>
        </Panel>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => (
            <Link
              key={report.id}
              href={`/jobs/${id}/logs/${report.id}`}
              className="group block rounded-lg border border-border bg-white p-5 shadow-soft transition hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold">{dateShort(report.reportDate)}</p>
                    {report.clientVisible && (
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">Client visible</span>
                    )}
                    {report.blockers && (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800">Blocker</span>
                    )}
                    {report.photos.length > 0 && (
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">{report.photos.length} photo{report.photos.length !== 1 ? "s" : ""}</span>
                    )}
                  </div>
                  <p className="mt-2 text-sm font-semibold">{report.crewSummary}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{report.workCompleted}</p>
                </div>
                {report.photos.length > 0 && (
                  <div className="hidden shrink-0 gap-1 sm:flex">
                    {report.photos.slice(0, 3).map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={url} alt="" className="h-16 w-16 rounded-md border border-border object-cover" />
                    ))}
                    {report.photos.length > 3 && (
                      <div className="flex h-16 w-16 items-center justify-center rounded-md border border-border bg-muted text-xs font-bold text-muted-foreground">
                        +{report.photos.length - 3}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="mt-3 text-xs font-semibold text-primary group-hover:underline">View full log →</p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
