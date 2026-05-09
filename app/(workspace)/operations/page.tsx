import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { dateShort } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function OperationsPage() {
  const [tasks, reports, meetings, timeEntries, jobs] = await Promise.all([
    prisma.task.findMany({ include: { job: true, phase: true, assignedToProfile: true }, orderBy: { dueDate: "asc" }, take: 8 }),
    prisma.fieldReport.findMany({ include: { job: true }, orderBy: { reportDate: "desc" }, take: 6 }),
    prisma.meeting.findMany({ include: { job: true }, orderBy: { scheduledAt: "asc" }, take: 6 }),
    prisma.timeEntry.findMany({ include: { job: true, profile: true }, orderBy: { workDate: "desc" }, take: 6 }),
    prisma.job.findMany({ where: { jobStatus: { notIn: ["COMPLETE", "WARRANTY_FOLLOW_UP"] } }, include: { tasks: true, fieldReports: true }, take: 6 })
  ]);

  return (
    <>
      <PageHeader title="Operations" body="Daily project tracking, task ownership, crew activity, field reports, meetings, and lightweight time capture." />
      <div className="grid gap-4 md:grid-cols-4">
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Open tasks</p><p className="text-3xl font-bold">{tasks.filter((t) => t.status !== "COMPLETE").length}</p></Panel>
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Field reports</p><p className="text-3xl font-bold">{reports.length}</p></Panel>
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Meetings</p><p className="text-3xl font-bold">{meetings.length}</p></Panel>
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Time entries</p><p className="text-3xl font-bold">{timeEntries.length}</p></Panel>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_380px]">
        <Panel className="p-5">
          <h3 className="text-lg font-bold">Active project board</h3>
          <div className="mt-4 grid gap-3">
            {jobs.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`} className="rounded-md border border-border p-3 hover:bg-muted">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{job.jobName}</p>
                  <span className="text-xs font-bold text-muted-foreground">{job.jobStatus.replaceAll("_", " ")}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{job.tasks.length} tasks · {job.fieldReports.length} field reports · active phase {job.activePhase ?? "Not set"}</p>
              </Link>
            ))}
          </div>
        </Panel>
        <Panel className="p-5">
          <h3 className="text-lg font-bold">Upcoming meetings</h3>
          <div className="mt-4 grid gap-3">
            {meetings.map((meeting) => (
              <div key={meeting.id} className="rounded-md border border-border p-3">
                <p className="font-semibold">{meeting.title}</p>
                <p className="text-sm text-muted-foreground">{meeting.meetingType} · {dateShort(meeting.scheduledAt)}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <Panel className="mt-5 p-5">
        <h3 className="text-lg font-bold">Open tasks by order of operations</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {tasks.map((task) => (
            <Link key={task.id} href={`/jobs/${task.jobId}`} className="rounded-md border border-border p-3 hover:bg-muted">
              <p className="font-semibold">{task.taskName}</p>
              <p className="mt-1 text-sm text-muted-foreground">{task.job.jobName} · {task.phase?.phaseName ?? "No phase assigned"} · {task.assignedToProfile?.profileName ?? "Unassigned"}</p>
            </Link>
          ))}
        </div>
      </Panel>
    </>
  );
}
