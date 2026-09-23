import { requireStaffPage } from "@/lib/staff-access";
import Link from "next/link";
import { Camera, Clock, FileBarChart2, TriangleAlert } from "lucide-react";
import { completeTask } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { dateShort } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { jobInOrganization } from "@/lib/company-scope";
import { outstandingRequiredEvidenceInOrganization, taskInOrganization } from "@/lib/delivery-scope";

export default async function FieldPage() {
  const actor = await requireStaffPage();
  const now = new Date();

  const [tasks, evidence, activeJobs] = await Promise.all([
    prisma.task.findMany({
      include: { job: true, phase: true, assignedToProfile: true },
      where: taskInOrganization(actor.organizationId, { status: { not: "COMPLETE" } }),
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
      take: 15
    }),
    outstandingRequiredEvidenceInOrganization(prisma, actor.organizationId, 8),
    prisma.job.findMany({
      where: jobInOrganization(actor.organizationId, { jobStatus: { notIn: ["COMPLETE", "WARRANTY_FOLLOW_UP"] } }),
      select: { id: true, jobName: true, weeklyReportDue: true, jobStatus: true },
      orderBy: { updatedAt: "desc" },
      take: 6
    })
  ]);

  const overdueTasks = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < now);
  const todayTasks = tasks.filter((t) => {
    if (!t.dueDate) return false;
    const d = new Date(t.dueDate);
    return d >= now && d.toDateString() === now.toDateString();
  });
  const upcomingTasks = tasks.filter((t) => {
    if (!t.dueDate) return false;
    const d = new Date(t.dueDate);
    return d > now && d.toDateString() !== now.toDateString();
  });
  const undatedTasks = tasks.filter((t) => !t.dueDate);

  return (
    <>
      <PageHeader
        title="My Day"
        body="Field-first work queue: tasks due today, required proof, and quick access to your active jobs."
      />

      {/* Quick action strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {activeJobs[0] ? (
          <Link
            href={`/jobs/${activeJobs[0].id}/logs/new`}
            className="flex min-h-16 flex-col justify-between rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 text-left font-bold text-primary hover:bg-primary/10"
          >
            <Camera className="h-4 w-4" />
            <span className="text-sm">Log today</span>
          </Link>
        ) : (
          <Link
            href="/jobs"
            className="flex min-h-16 flex-col justify-between rounded-lg border border-border bg-white px-4 py-3 text-left font-bold hover:bg-muted"
          >
            <Camera className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Log today</span>
          </Link>
        )}
        <Link
          href="/weekly-reports/new"
          className="flex min-h-16 flex-col justify-between rounded-lg border border-border bg-white px-4 py-3 text-left hover:bg-muted"
        >
          <FileBarChart2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-bold">Write report</span>
        </Link>
        <Link
          href="/change-orders/new"
          className="flex min-h-16 flex-col justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-left hover:bg-amber-100"
        >
          <TriangleAlert className="h-4 w-4 text-amber-700" />
          <span className="text-sm font-bold text-amber-900">Report blocker</span>
        </Link>
        <Link
          href="/operations"
          className="flex min-h-16 flex-col justify-between rounded-lg border border-border bg-white px-4 py-3 text-left hover:bg-muted"
        >
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-bold">All tasks</span>
        </Link>
      </div>

      {/* Active jobs strip */}
      {activeJobs.length > 0 && (
        <div className="mt-5">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Active jobs</h2>
          <div className="grid gap-2 md:grid-cols-3">
            {activeJobs.map((job) => {
              const reportOverdue = job.weeklyReportDue && new Date(job.weeklyReportDue) < now;
              return (
                <div key={job.id} className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 ${reportOverdue ? "border-red-200 bg-red-50" : "border-border bg-white"}`}>
                  <Link href={`/jobs/${job.id}`} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{job.jobName}</p>
                    {reportOverdue && (
                      <p className="text-xs font-semibold text-red-600">Report overdue</p>
                    )}
                  </Link>
                  <div className="flex shrink-0 gap-2">
                    <Link
                      href={`/jobs/${job.id}/logs/new`}
                      className="rounded border border-primary/30 bg-primary/5 px-2 py-1 text-xs font-bold text-primary hover:bg-primary/10"
                    >
                      Log
                    </Link>
                    <Link
                      href={`/weekly-reports/new?jobId=${job.id}`}
                      className={`rounded border px-2 py-1 text-xs font-bold ${reportOverdue ? "border-red-300 bg-red-100 text-red-700 hover:bg-red-200" : "border-border hover:bg-muted"}`}
                    >
                      Report
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_380px]">
        {/* Task queue */}
        <Panel className="p-5">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-bold">Field task queue</h3>
            {tasks.length > 0 && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">{tasks.length} open</span>
            )}
          </div>

          {overdueTasks.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-red-600">Overdue</p>
              <div className="grid gap-2">
                {overdueTasks.map((task) => (
                  <TaskRow key={task.id} task={task} overdue />
                ))}
              </div>
            </div>
          )}

          {todayTasks.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">Due today</p>
              <div className="grid gap-2">
                {todayTasks.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}

          {upcomingTasks.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Upcoming</p>
              <div className="grid gap-2">
                {upcomingTasks.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}

          {undatedTasks.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">No date</p>
              <div className="grid gap-2">
                {undatedTasks.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}

          {tasks.length === 0 && (
            <p className="mt-4 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              No open field tasks. Add tasks from a job so they appear here, or{" "}
              <Link href="/jobs" className="font-semibold text-primary hover:underline">
                open a job
              </Link>
              .
            </p>
          )}
        </Panel>

        {/* Required proof */}
        <Panel className="p-5">
          <h3 className="text-lg font-bold">Required proof</h3>
          <div className="mt-4 grid gap-3">
            {evidence.length ? (
              evidence.map((item) => (
                <div key={item.id} className="rounded-md border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm font-semibold text-amber-900">{item.label}</p>
                  <p className="text-xs text-amber-700">{item.evidenceType} · {item.entityType}</p>
                </div>
              ))
            ) : (
              <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                No required proof outstanding. Good to go.
              </p>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}

function TaskRow({
  task,
  overdue = false
}: {
  task: {
    id: string;
    taskName: string;
    jobId: string;
    job: { jobName: string };
    phase: { phaseName: string } | null;
    assignedToProfile: { profileName: string } | null;
    dueDate: Date | null;
    priority: string;
  };
  overdue?: boolean;
}) {
  return (
    <div className={`grid gap-1 rounded-md border p-3 md:grid-cols-[1fr_auto] md:items-center ${overdue ? "border-red-200 bg-red-50" : "border-border"}`}>
      <div className="min-w-0">
        <p className={`text-sm font-semibold ${overdue ? "text-red-900" : ""}`}>{task.taskName}</p>
        <p className="text-xs text-muted-foreground">
          <Link href={`/jobs/${task.jobId}`} className="hover:underline">{task.job.jobName}</Link>
          {task.phase ? ` · ${task.phase.phaseName}` : ""}
          {task.assignedToProfile ? ` · ${task.assignedToProfile.profileName}` : ""}
          {task.dueDate ? ` · due ${dateShort(task.dueDate)}` : ""}
        </p>
      </div>
      <form action={completeTask} className="flex shrink-0 gap-2">
        <input type="hidden" name="taskId" value={task.id} />
        <input type="hidden" name="returnTo" value="/field" />
        <button
          type="submit"
          className="rounded border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
          title="Mark this task complete"
        >
          Done
        </button>
      </form>
    </div>
  );
}
