import { requireStaffPage } from "@/lib/staff-access";
﻿import Link from "next/link";
import { deleteFieldReport } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { dateShort } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { jobInOrganization } from "@/lib/company-scope";
import { fieldReportInOrganization } from "@/lib/delivery-scope";
import { notFound } from "next/navigation";

export default async function FieldReportPage({ params }: { params: Promise<{ id: string; reportId: string }> }) {
  const actor = await requireStaffPage();
  const { id, reportId } = await params;
  const [job, report] = await Promise.all([
    prisma.job.findFirst({ where: jobInOrganization(actor.organizationId, { id }), select: { id: true, jobName: true } }),
    prisma.fieldReport.findFirst({ where: fieldReportInOrganization(actor.organizationId, { id: reportId, jobId: id }) })
  ]);
  if (!job || !report) notFound();

  return (
    <>
      <PageHeader title={`Log - ${dateShort(report.reportDate)}`} body={job.jobName} />
      <div className="mb-4 flex items-center gap-3">
        <Link href={`/jobs/${id}/logs`} className="text-sm font-semibold text-muted-foreground hover:text-foreground">← All logs</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={`/jobs/${id}`} className="text-sm font-semibold text-muted-foreground hover:text-foreground">Job detail</Link>
        {report.clientVisible && (
          <>
            <span className="text-muted-foreground">·</span>
            <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">Client visible</span>
          </>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <div className="grid gap-5">
          {/* Photo gallery */}
          {report.photos.length > 0 && (
            <Panel className="overflow-hidden p-0">
              <div className="border-b border-border px-5 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Site photos · {report.photos.length}</p>
              </div>
              <div className="grid grid-cols-2 gap-1 p-1 sm:grid-cols-3 md:grid-cols-4">
                {report.photos.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="group aspect-square overflow-hidden rounded">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Site photo ${i + 1}`} className="h-full w-full object-cover transition group-hover:scale-105" />
                  </a>
                ))}
              </div>
            </Panel>
          )}

          {/* Work completed */}
          <Panel className="p-5">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Work completed</h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{report.workCompleted}</p>
          </Panel>

          {/* Blockers */}
          {report.blockers && (
            <Panel className="border-red-200 p-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-red-600">Blockers / issues</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{report.blockers}</p>
            </Panel>
          )}

          {/* Materials + Equipment */}
          {(report.materialsUsed || report.equipmentUsed) && (
            <div className="grid gap-5 md:grid-cols-2">
              {report.materialsUsed && (
                <Panel className="p-5">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Materials used</h3>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{report.materialsUsed}</p>
                </Panel>
              )}
              {report.equipmentUsed && (
                <Panel className="p-5">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Equipment used</h3>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{report.equipmentUsed}</p>
                </Panel>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="grid gap-4 self-start">
          <Panel className="p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Date</p>
            <p className="mt-1 font-semibold">{dateShort(report.reportDate)}</p>
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Crew on site</p>
            <p className="mt-1 text-sm">{report.crewSummary}</p>
            {report.weatherNotes && (
              <>
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Weather</p>
                <p className="mt-1 text-sm">{report.weatherNotes}</p>
              </>
            )}
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Photos</p>
            <p className="mt-1 text-sm">{report.photos.length > 0 ? `${report.photos.length} attached` : "None"}</p>
          </Panel>

          <Panel className="p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Client visibility</p>
            <p className="mt-1 text-sm">{report.clientVisible ? "Visible in client portal" : "Internal only"}</p>
          </Panel>

          <Panel className="p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Actions</p>
            <div className="grid gap-2">
              <Link href={`/jobs/${id}/logs/new`} className="block rounded-md border border-border px-3 py-2 text-center text-sm font-semibold hover:bg-muted">
                + New log for today
              </Link>
              <form action={deleteFieldReport}>
                <input type="hidden" name="reportId" value={report.id} />
                <button type="submit" className="w-full rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">
                  Delete this log
                </button>
              </form>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
