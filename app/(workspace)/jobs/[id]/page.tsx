import { requireStaffPage } from "@/lib/staff-access";
﻿import Link from "next/link";
import { BookOpen } from "lucide-react";
import { createTask, deployProjectTaskTemplate, reseedJobPhases, updatePhaseStatus, captureOutOfScopeRequest, generateJobPortalToken } from "@/app/actions";
import { phaseNameToLibrarySlug } from "@/lib/construction-library";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { EntityForm } from "@/components/entity-form";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { LinkButton, Panel } from "@/components/ui";
import { dateShort, money } from "@/lib/format";
import { options, relationOptions } from "@/lib/form-options";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { buildSmsLink } from "@/lib/sms";
import { prisma } from "@/lib/prisma";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage();
  const { id } = await params;
  const job = await prisma.job.findUniqueOrThrow({
    where: { id },
    include: {
      phases: { orderBy: { phaseNumber: "asc" }, include: { tasks: { include: { assignedToProfile: true }, orderBy: { dueDate: "asc" } } } },
      tasks: { include: { phase: true, assignedToProfile: true }, orderBy: { dueDate: "asc" } },
      invoices: { orderBy: { dueDate: "desc" } },
      changeOrders: { orderBy: { createdAt: "desc" } },
      weeklyReports: { orderBy: { weekEnding: "desc" } },
      selectionSheets: { include: { items: true } },
      fieldReports: { orderBy: { reportDate: "desc" }, take: 3 },
      clientProfile: true,
      property: true
    }
  });
  const [assignees, org] = await Promise.all([
    prisma.profile.findMany({ select: { id: true, profileName: true, profileType: true }, orderBy: { profileName: "asc" } }),
    prisma.organization.findUnique({ where: { id: DEFAULT_ORG_ID }, select: { name: true, reviewLink: true } })
  ]);
  const phaseSnapshots = job.phases.map((phase) => {
    const computedStatus = phase.tasks.length
      ? phase.tasks.every((task) => task.status === "COMPLETE")
        ? "COMPLETE"
        : phase.tasks.some((task) => task.status === "BLOCKED")
          ? "BLOCKED"
          : phase.tasks.some((task) => task.status === "IN_PROGRESS")
            ? "IN_PROGRESS"
            : "NOT_STARTED"
      : phase.status;
    return { ...phase, computedStatus };
  });
  const computedActivePhase = phaseSnapshots.find((phase) => phase.computedStatus !== "COMPLETE") ?? phaseSnapshots.at(-1);
  return (
    <>
      <PageHeader title={job.jobName} body="Job execution, order-of-operations phases, financials, reports, change orders, and closeout discipline." actionHref={`/jobs/${job.id}/edit`} actionLabel="Edit job" />
      <div className="grid gap-3 md:grid-cols-6">
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Contract</p><p className="text-2xl font-bold">{money(job.contractAmount)}</p><p className="mt-1 text-xs text-muted-foreground">Approved quote plus approved change orders.</p></Panel>
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Paid</p><p className="text-2xl font-bold">{money(job.amountPaid)}</p><p className="mt-1 text-xs text-muted-foreground">Recorded job payments/invoice receipts.</p></Panel>
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Balance</p><p className="text-2xl font-bold">{money(job.balanceDue)}</p><p className="mt-1 text-xs text-muted-foreground">Contract less paid amount.</p></Panel>
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Status / active phase</p><div className="mt-2"><StatusPill value={job.jobStatus} /></div><p className="mt-2 text-xs text-muted-foreground">{computedActivePhase ? `Next open phase: ${computedActivePhase.phaseNumber}. ${computedActivePhase.phaseName}` : "No phase data yet."}</p></Panel>
        <Link href={`/jobs/${job.id}/budget`} className="flex flex-col rounded-lg border border-primary/30 bg-primary/5 p-4 transition hover:bg-primary/10">
          <p className="text-xs font-bold uppercase text-primary">Budget vs. actual</p>
          <p className="mt-1 text-sm font-semibold text-primary">View margin →</p>
          <p className="mt-1 text-xs text-muted-foreground">Track estimated vs. actual job cost</p>
        </Link>
        <Link href={`/jobs/${job.id}/logs`} className="flex flex-col rounded-lg border border-amber-200 bg-amber-50 p-4 transition hover:bg-amber-100">
          <p className="text-xs font-bold uppercase text-amber-700">Daily logs</p>
          <p className="mt-1 text-2xl font-bold text-amber-900">{job.fieldReports.length}</p>
          <p className="mt-1 text-xs text-amber-700">Field reports + photos →</p>
        </Link>
      </div>
      {/* Client portal */}
      <div className="mt-5 rounded-xl border border-border bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Client portal</p>
            {job.portalToken ? (
              <p className="mt-0.5 text-sm font-semibold text-green-700">
                Active - share the link below with {job.clientProfile?.profileName ?? "your client"}
              </p>
            ) : (
              <p className="mt-0.5 text-sm text-muted-foreground">
                Generate a portal link so your client can see phase status, pending decisions, and change orders.
              </p>
            )}
          </div>
          {job.portalToken ? (
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded bg-slate-100 px-2 py-1 text-xs font-mono truncate max-w-[200px]">
                {`/portal/${job.portalToken.slice(0, 12)}...`}
              </code>
              <a
                href={buildSmsLink(
                  job.clientProfile?.phone ?? "",
                  `Hi ${job.clientProfile?.profileName?.split(" ")[0] ?? "there"}, here is your project update portal for ${job.jobName}: ${process.env.NEXT_PUBLIC_APP_URL ?? "https://renotrack360.com"}/portal/${job.portalToken}`
                )}
                className={`rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted ${!job.clientProfile?.phone ? "pointer-events-none opacity-40" : ""}`}
              >
                📱 Text portal link
              </a>
              <Link
                href={`/portal/${job.portalToken}`}
                target="_blank"
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
              >
                Preview portal →
              </Link>
            </div>
          ) : (
            <form action={generateJobPortalToken.bind(null, job.id)}>
              <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
                Generate portal link
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Lifecycle navigation */}
      <div className="mt-5 flex flex-wrap gap-2">
        {[
          { label: "Pre-construction briefing", href: `/jobs/${job.id}/briefing`, highlight: job.jobStatus === "PRE_CONSTRUCTION" || job.jobStatus === "DEPOSIT_RECEIVED" },
          { label: "Scope creep tracker", href: `/jobs/${job.id}/scope`, highlight: true },
          { label: "Budget vs. actual", href: `/jobs/${job.id}/budget`, highlight: false },
          { label: "Before/After Gallery", href: `/jobs/${job.id}/gallery`, highlight: ["PUNCH_LIST","FINAL_WALKTHROUGH","COMPLETE","WARRANTY_FOLLOW_UP"].includes(job.jobStatus) },
          { label: "Closeout package", href: `/jobs/${job.id}/closeout`, highlight: ["PUNCH_LIST","FINAL_WALKTHROUGH","COMPLETE","WARRANTY_FOLLOW_UP"].includes(job.jobStatus) },
          { label: "Testimonials + reviews", href: `/jobs/${job.id}/feedback`, highlight: ["COMPLETE","WARRANTY_FOLLOW_UP"].includes(job.jobStatus) },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${item.highlight ? "border-primary bg-primary/5 text-primary hover:bg-primary/10" : "border-border hover:bg-muted"}`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <Panel className="mt-5 p-5">
        <h3 className="text-lg font-bold">Related records</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {job.clientProfile ? <Link className="rounded-md border border-border p-3 font-semibold hover:bg-muted" href={`/profiles/${job.clientProfile.id}`}>Client: {job.clientProfile.profileName}</Link> : null}
          {job.property ? <Link className="rounded-md border border-border p-3 font-semibold hover:bg-muted" href={`/properties/${job.property.id}`}>Property: {job.property.propertyAddress}</Link> : null}
          {job.approvedQuoteId ? <Link className="rounded-md border border-border p-3 font-semibold hover:bg-muted" href={`/quotes/${job.approvedQuoteId}`}>Approved quote</Link> : null}
        </div>
      </Panel>
      {/* Daily logs panel */}
      <Panel className="mt-5 p-5">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg font-bold">Daily logs</h3>
          <Link href={`/jobs/${job.id}/logs/new`} className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90">+ New log</Link>
        </div>
        {job.fieldReports.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No logs yet. <Link href={`/jobs/${job.id}/logs/new`} className="font-semibold text-primary hover:underline">Create the first daily log →</Link></p>
        ) : (
          <div className="mt-4 grid gap-3">
            {job.fieldReports.map((report) => (
              <Link key={report.id} href={`/jobs/${job.id}/logs/${report.id}`} className="flex items-start justify-between gap-3 rounded-md border border-border p-3 hover:bg-muted/50">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{dateShort(report.reportDate)} · {report.crewSummary}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{report.workCompleted}</p>
                  <div className="mt-1 flex gap-2">
                    {report.photos.length > 0 && <span className="text-xs font-semibold text-blue-600">{report.photos.length} photo{report.photos.length !== 1 ? "s" : ""}</span>}
                    {report.blockers && <span className="text-xs font-semibold text-red-600">Blocker</span>}
                    {report.clientVisible && <span className="text-xs font-semibold text-emerald-600">Client visible</span>}
                  </div>
                </div>
                {report.photos[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={report.photos[0]} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />
                )}
              </Link>
            ))}
            {job.fieldReports.length >= 3 && (
              <Link href={`/jobs/${job.id}/logs`} className="text-center text-sm font-semibold text-primary hover:underline">View all logs →</Link>
            )}
          </div>
        )}
      </Panel>

      {/* Client communication actions */}
      {job.clientProfile?.phone && (
        <Panel className="mt-5 p-5">
          <h3 className="text-lg font-bold">Client communications</h3>
          <p className="mt-1 text-sm text-muted-foreground">One-tap actions that open your phone&apos;s SMS app pre-filled. Review and send - nothing is sent automatically.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {/* On My Way */}
            <a
              href={buildSmsLink(
                job.clientProfile.phone,
                `Hi ${job.clientProfile.profileName}, I'm on my way to ${job.property?.propertyAddress ?? "your property"}. I'll be there in about 15–20 minutes. - ${org?.name ?? "Your contractor"}`
              )}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              🚗 On My Way
            </a>

            {/* Review request - only show if job is complete or close */}
            {org?.reviewLink && ["COMPLETE", "WARRANTY_FOLLOW_UP", "PUNCH_LIST", "FINAL_WALKTHROUGH"].includes(job.jobStatus) && (
              <a
                href={buildSmsLink(
                  job.clientProfile.phone,
                  `Hi ${job.clientProfile.profileName}, thank you for choosing ${org.name} for your project! We'd love your feedback - please leave us a Google review: ${org.reviewLink}`
                )}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                ⭐ Request review
              </a>
            )}

            <Link
              href={`/profiles/${job.clientProfile.id}`}
              className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted"
            >
              View client profile →
            </Link>
          </div>
          {!org?.reviewLink && (
            <p className="mt-3 text-xs text-muted-foreground">
              Add your Google review link in{" "}
              <Link href="/settings" className="font-semibold text-primary hover:underline">Settings</Link>{" "}
              to enable the review request button.
            </p>
          )}
        </Panel>
      )}

      {/* Scope capture shortcut */}
      <Panel className="mt-5 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-bold">Client asked for something?</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Log it now before it becomes a free gift.</p>
          </div>
          <Link href={`/jobs/${job.id}/scope`} className="shrink-0 text-xs font-semibold text-primary hover:underline">
            View scope tracker →
          </Link>
        </div>
        <form action={captureOutOfScopeRequest} className="mt-3 flex gap-2">
          <input type="hidden" name="jobId" value={job.id} />
          {job.clientProfile && <input type="hidden" name="profileId" value={job.clientProfile.id} />}
          <input
            name="subject"
            required
            placeholder="What did they ask for? (e.g. paint the garage too)"
            className="h-10 flex-1 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <button type="submit" className="h-10 shrink-0 rounded-md bg-amber-600 px-4 text-xs font-bold text-white hover:bg-amber-700">
            Log it
          </button>
        </form>
      </Panel>

      <Panel className="mt-5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold">Construction order of operations</h3>
            <p className="mt-1 text-sm text-muted-foreground">Each project is framed by these phases. Tasks should live inside the phase they advance, so field work, proof photos, reports, and closeout stay ordered.</p>
          </div>
          <form action={reseedJobPhases.bind(null, job.id)}>
            <ConfirmSubmitButton
              message="Reseed all 23 canonical phases? Existing tasks will be kept but lose their phase assignment. This cannot be undone."
              className="shrink-0 rounded border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Reseed phases
            </ConfirmSubmitButton>
          </form>
        </div>
        <div className="mt-4 grid gap-2">
          {phaseSnapshots.map((phase) => (
            <details key={phase.id} className="rounded-md border border-border p-3" open={phase.computedStatus === "IN_PROGRESS" || phase.phaseName === computedActivePhase?.phaseName} suppressHydrationWarning>
              <summary className="grid cursor-pointer gap-2 md:grid-cols-[48px_1fr_160px] md:items-center">
                <span className="font-bold">{String(phase.phaseNumber).padStart(2, "0")}</span>
                <span className="font-semibold">{phase.phaseName}</span>
                <StatusPill value={phase.computedStatus} />
              </summary>
              <div className="mt-3 grid gap-3 pl-0 md:pl-12">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-muted-foreground">{phase.clientUpdate ?? "No phase guidance yet."}</p>
                  {phaseNameToLibrarySlug[phase.phaseName] && (
                    <Link
                      href={`/guided/library/${phaseNameToLibrarySlug[phase.phaseName]}`}
                      className="flex shrink-0 items-center gap-1 rounded border border-border px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="World-class standards for this phase"
                    >
                      <BookOpen className="h-3 w-3" />
                      Phase guide
                    </Link>
                  )}
                </div>
                <div className="grid gap-2">
                  {phase.tasks.length ? phase.tasks.map((task) => (
                    <div key={task.id} className="grid gap-1 rounded-md bg-muted p-3 text-sm md:grid-cols-[1fr_130px_160px] md:items-center">
                      <span className="font-semibold">{task.taskName}</span>
                      <StatusPill value={task.status} />
                      <span className="text-muted-foreground">{task.assignedToProfile?.profileName ?? "Unassigned"}</span>
                    </div>
                  )) : <p className="text-sm text-muted-foreground">No tasks assigned to this phase yet.</p>}
                </div>
                {/* Direct phase status override - useful when no tasks exist */}
                <form action={updatePhaseStatus} className="flex items-center gap-2">
                  <input type="hidden" name="phaseId" value={phase.id} />
                  <input type="hidden" name="jobId" value={job.id} />
                  <select
                    name="status"
                    defaultValue={phase.computedStatus}
                    className="h-8 rounded border border-border bg-white px-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="NOT_STARTED">Not started</option>
                    <option value="IN_PROGRESS">In progress</option>
                    <option value="BLOCKED">Blocked</option>
                    <option value="COMPLETE">Complete</option>
                  </select>
                  <button type="submit" className="h-8 rounded border border-border px-3 text-xs font-semibold hover:bg-muted">
                    Set status
                  </button>
                </form>
                <details className="rounded-md bg-muted/40 p-3">
                  <summary className="cursor-pointer text-sm font-bold text-primary">Add task to this phase</summary>
                  <div className="mt-3">
                    <EntityForm
                      formKey="task"
                      action={createTask}
                      submitLabel="Add phase task"
                      columns={3}
                      fields={[
                        { name: "jobId", label: "Job", type: "hidden", defaultValue: job.id },
                        { name: "phaseId", label: "Phase", type: "hidden", defaultValue: phase.id },
                        { name: "taskName", label: "Task name" },
                        { name: "assignedToProfileId", label: "Assigned to", type: "select", options: relationOptions(assignees.map((profile) => ({ id: profile.id, label: `${profile.profileName} (${profile.profileType.toLowerCase().replaceAll("_", " ")})` }))) },
                        { name: "dueDate", label: "Due date", type: "date" },
                        { name: "status", label: "Status", type: "select", options: options.taskStatuses, defaultValue: "NOT_STARTED" },
                        { name: "priority", label: "Priority", type: "select", options: options.taskPriorities, defaultValue: "MEDIUM" },
                        { name: "notes", label: "Notes", type: "textarea" }
                      ]}
                    />
                  </div>
                </details>
              </div>
            </details>
          ))}
        </div>
      </Panel>
      <Panel className="mt-5 p-5">
        <h3 className="text-lg font-bold">Deploy project task template</h3>
        <p className="mt-1 text-sm text-muted-foreground">Use a proven starter task set, then edit scope, assignees, dates, and proof requirements for this job.</p>
        <form action={deployProjectTaskTemplate} className="mt-4 flex flex-col gap-3 md:flex-row md:items-end">
          <input type="hidden" name="jobId" value={job.id} />
          <label className="grid flex-1 gap-1.5 text-sm font-medium">
            Template
            <select name="templateKey" className="h-11 rounded-md border border-border bg-white px-3 text-base outline-none focus:ring-2 focus:ring-primary md:h-10 md:text-sm">
              <option value="KITCHEN_REFRESH">Kitchen refresh</option>
              <option value="BATHROOM_RENOVATION">Bathroom renovation</option>
              <option value="FULL_INTERIOR_RENOVATION">Full interior renovation</option>
            </select>
          </label>
          <button className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">Deploy tasks</button>
        </form>
      </Panel>
      <Panel className="mt-5 p-5">
        <h3 className="text-lg font-bold">Add task to order of operations</h3>
        <p className="mt-1 text-sm text-muted-foreground">Assign the task to the correct phase now. This keeps My Day, weekly reports, proof photos, and phase status aligned.</p>
        <div className="mt-4">
          <EntityForm
            formKey="task"
            action={createTask}
            submitLabel="Add task"
            columns={3}
            fields={[
              { name: "jobId", label: "Job", type: "hidden", defaultValue: job.id },
              { name: "taskName", label: "Task name", helpText: "Use an action phrase: install vanity, inspect rough plumbing, upload pre-cover photos." },
              { name: "phaseId", label: "Construction phase", type: "select", options: relationOptions(job.phases.map((phase) => ({ id: phase.id, label: `${phase.phaseNumber}. ${phase.phaseName}` }))), helpText: "Choose the order-of-operations phase this task advances." },
              { name: "assignedToProfileId", label: "Assigned to", type: "select", options: relationOptions(assignees.map((profile) => ({ id: profile.id, label: `${profile.profileName} (${profile.profileType.toLowerCase().replaceAll("_", " ")})` }))) },
              { name: "dueDate", label: "Due date", type: "date" },
              { name: "status", label: "Status", type: "select", options: options.taskStatuses, defaultValue: "NOT_STARTED" },
              { name: "priority", label: "Priority", type: "select", options: options.taskPriorities, defaultValue: "MEDIUM" },
              { name: "notes", label: "Notes", type: "textarea", helpText: "Add proof requirements, blockers, measurements, or client-decision dependencies." }
            ]}
          />
        </div>
      </Panel>
      <div className="mt-5 grid gap-5 md:grid-cols-3">
        <Panel className="p-5"><h3 className="font-bold">Tasks</h3><p className="mt-2 text-3xl font-bold">{job.tasks.length}</p><LinkButton href="/operations" variant="secondary" className="mt-3">View tasks</LinkButton></Panel>
        <Panel className="p-5"><h3 className="font-bold">Reports</h3><p className="mt-2 text-3xl font-bold">{job.weeklyReports.length}</p><div className="mt-3 grid gap-2 text-sm">{job.weeklyReports.slice(0, 3).map((report) => <Link key={report.id} className="font-semibold text-primary" href={`/api/pdf/weekly-report/${report.id}`}>PDF for {dateShort(report.weekEnding)}</Link>)}</div></Panel>
        <Panel className="p-5"><h3 className="font-bold">Change orders</h3><p className="mt-2 text-3xl font-bold">{job.changeOrders.length}</p><LinkButton href="/change-orders" variant="secondary" className="mt-3">View changes</LinkButton></Panel>
      </div>
      <Panel className="mt-5 p-5">
        <h3 className="text-lg font-bold">Selections</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {job.selectionSheets.map((sheet) => (
            <div key={sheet.id} className="rounded-md border border-border p-3">
              <p className="font-semibold">{sheet.sheetName}</p>
              <p className="text-sm text-muted-foreground">{sheet.status.replaceAll("_", " ")} · {sheet.items.length} items · {sheet.items.filter((item) => item.changeOrderNeeded).length} CO risks</p>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
