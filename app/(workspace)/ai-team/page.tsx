import { requireStaffPage } from "@/lib/staff-access";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { Panel } from "@/components/ui";
import { dateShort } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const workflows = [
  ["Estimate Review", "Find missing scope, allowance gaps, weak assumptions, and change-order risks before a quote is sent."],
  ["Lead Follow-Up", "Draft follow-ups based on lead stage, estimate status, decision timeline, and prior activity."],
  ["Weekly Reports", "Turn field notes, tasks, blockers, photos, and phase status into a client-ready report draft."],
  ["Selections", "Summarize client choices, flag allowance overages, and identify lead-time risk before ordering."],
  ["Vendor Compliance", "Check W-9, insurance, agreement, service tags, and onboarding status before assigning work."],
  ["Support Agent", "Future tenant-aware help assistant that answers how-to questions using company settings and app docs."]
] as const;

export default async function AiTeamPage() {
  await requireStaffPage();
  const [agents, tasks, providers, usage] = await Promise.all([
    prisma.aiAgent.findMany({ include: { tasks: true }, orderBy: { agentName: "asc" } }),
    prisma.aiTask.findMany({ include: { agent: true }, orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.aiProviderConfig.findMany({ orderBy: { displayName: "asc" } }),
    prisma.aiUsageLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 })
  ]);
  const enabledProviders = providers.filter((provider) => provider.enabled);
  const tasksNeedingReview = tasks.filter((task) => task.humanReviewRequired && task.status === "NEEDS_REVIEW");

  return (
    <>
      <PageHeader title="AI Team" body="Human-reviewed automation for lead follow-up, estimating assistance, procurement reminders, reporting, safety checks, and review management." />

      <div className="grid gap-4 md:grid-cols-4">
        <Panel className="p-4">
          <p className="text-xs font-bold uppercase text-muted-foreground">Provider status</p>
          <p className="mt-1 text-2xl font-bold">{enabledProviders.length ? "Configured" : "Not live"}</p>
          <p className="mt-2 text-sm text-muted-foreground">{providers.length} provider records</p>
        </Panel>
        <Panel className="p-4">
          <p className="text-xs font-bold uppercase text-muted-foreground">Review required</p>
          <p className="mt-1 text-2xl font-bold">{tasksNeedingReview.length}</p>
          <p className="mt-2 text-sm text-muted-foreground">human approval gate</p>
        </Panel>
        <Panel className="p-4">
          <p className="text-xs font-bold uppercase text-muted-foreground">Usage logs</p>
          <p className="mt-1 text-2xl font-bold">{usage.length}</p>
          <p className="mt-2 text-sm text-muted-foreground">cost tracking foundation</p>
        </Panel>
        <Panel className="p-4">
          <p className="text-xs font-bold uppercase text-muted-foreground">Tenant mode</p>
          <p className="mt-1 text-2xl font-bold">Ready</p>
          <p className="mt-2 text-sm text-muted-foreground">per-org AI settings</p>
        </Panel>
      </div>

      <Panel className="mt-5 p-5">
        <h3 className="text-lg font-bold">How AI will work</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {workflows.map(([title, body]) => (
            <div key={title} className="rounded-md border border-border p-3">
              <p className="font-bold">{title}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-md bg-muted p-3 text-sm leading-6 text-muted-foreground">
          AI is intentionally review-first. The app should draft, classify, extract, summarize, and flag risk. It should not silently send client messages, approve pricing, sign agreements, change invoices, or commit scope without explicit human approval.
        </div>
      </Panel>

      <Panel className="mt-5 p-5">
        <h3 className="text-lg font-bold">LLM providers</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Future multi-tenant setup should let each organization choose one or more providers. API keys should live in Railway variables, a secret manager, or encrypted tenant secrets; the database stores only a secret reference.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {providers.map((provider) => (
            <div key={provider.id} className="rounded-md border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold">{provider.displayName}</p>
                <StatusPill value={provider.enabled ? "ENABLED" : "DISABLED"} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{provider.defaultModel || "No default model set"}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{provider.notes}</p>
            </div>
          ))}
        </div>
      </Panel>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {agents.map((agent) => (
          <Panel key={agent.id} className="p-4">
            <p className="text-xs font-bold uppercase text-muted-foreground">{agent.roleName}</p>
            <p className="mt-1 text-lg font-bold">{agent.agentName}</p>
            <p className="mt-2 text-sm text-muted-foreground">{agent.tasks.length} tasks</p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{agent.purpose}</p>
          </Panel>
        ))}
      </div>

      <Panel className="mt-5 p-5">
        <h3 className="text-lg font-bold">AI task queue</h3>
        <div className="mt-4 grid gap-3">
          {tasks.length ? (
            tasks.map((task) => (
              <div key={task.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{task.taskName}</p>
                  <StatusPill value={task.status} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{task.agent?.agentName ?? "Unassigned"} · {task.workflowArea} · due {dateShort(task.dueDate)}</p>
                <p className="mt-2 text-sm">{task.resultSummary ?? task.prompt}</p>
              </div>
            ))
          ) : (
            <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">No AI tasks yet. Seed or generate tasks from estimates, leads, jobs, or reports once provider execution is enabled.</p>
          )}
        </div>
      </Panel>
    </>
  );
}
