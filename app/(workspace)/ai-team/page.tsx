import { requireStaffPage } from "@/lib/staff-access";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { Panel } from "@/components/ui";
import { dateShort } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { reportGuideAvailability } from "@/lib/report-guide";
import { saveAiAgentBinding } from "@/app/actions";

const availabilityMessages: Record<string, string> = {
  ready: "Ready for reviewed weekly-report drafts",
  "agent-inactive": "The Report guide is paused",
  "provider-unavailable": "No enabled provider is available",
  "client-data-disabled": "The provider cannot use client data",
  "budget-reached": "The configured usage limit has been reached",
};

export default async function AiTeamPage() {
  const actor = await requireStaffPage();
  const organizationId = actor.organizationId;
  const [availability, agents, tasks, providers, usage] = await Promise.all([
    reportGuideAvailability(prisma, actor.id),
    prisma.aiAgent.findMany({
      where: { organizationId },
      include: { _count: { select: { tasks: { where: { organizationId } } } } },
      orderBy: { agentName: "asc" },
    }),
    prisma.aiTask.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.aiProviderConfig.findMany({ where: { organizationId }, orderBy: { displayName: "asc" } }),
    prisma.aiUsageLog.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" }, take: 8 })
  ]);
  const enabledProviders = providers.filter((provider) => provider.enabled);
  const providersById = new Map(providers.map((provider) => [provider.id, provider]));
  const tasksNeedingReview = tasks.filter((task) => task.humanReviewRequired && task.status === "NEEDS_REVIEW");
  const agentNames = new Map(agents.map((agent) => [agent.id, agent.agentName]));

  return (
    <>
      <PageHeader title="AI Team" body="Company-scoped, human-reviewed report drafting, with availability and recent work shown below. Other workflows remain future configurations." />

      <div className="grid gap-4 md:grid-cols-4">
        <Panel className="p-4">
          <p className="text-xs font-bold uppercase text-muted-foreground">Report guide</p>
          <p className="mt-1 text-2xl font-bold">{availability.available ? "Available" : "Manual only"}</p>
          <p className="mt-2 text-sm text-muted-foreground">{availabilityMessages[availability.reason] ?? "Setup is incomplete"}</p>
        </Panel>
        <Panel className="p-4">
          <p className="text-xs font-bold uppercase text-muted-foreground">Provider status</p>
          <p className="mt-1 text-2xl font-bold">{enabledProviders.length ? "Configured" : "Not available"}</p>
          <p className="mt-2 text-sm text-muted-foreground">{enabledProviders.length} enabled for this company</p>
        </Panel>
        <Panel className="p-4">
          <p className="text-xs font-bold uppercase text-muted-foreground">Review required</p>
          <p className="mt-1 text-2xl font-bold">{tasksNeedingReview.length}</p>
          <p className="mt-2 text-sm text-muted-foreground">drafts awaiting a person</p>
        </Panel>
        <Panel className="p-4">
          <p className="text-xs font-bold uppercase text-muted-foreground">Recent runs</p>
          <p className="mt-1 text-2xl font-bold">{usage.length}</p>
          <p className="mt-2 text-sm text-muted-foreground">latest usage records for this company</p>
        </Panel>
      </div>

      <Panel className="mt-5 p-5">
        <h3 className="text-lg font-bold">Report guide</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          The guide prepares one client-summary draft inside the weekly-report form. It uses only the current company, selected job, reporting week, staff notes, and eligible dated field reports. A person reviews and applies the draft before saving.
        </p>
        <details className="mt-4 rounded-md border border-border p-3">
          <summary className="cursor-pointer text-sm font-semibold">What the guide checks</summary>
          <div className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground md:grid-cols-2">
            <p>It confirms the staff member, company, job, and reporting week before gathering information.</p>
            <p>It separates staff notes from verified records and keeps dated source references with the draft.</p>
            <p>It focuses on client-relevant progress, decisions, issues, and next steps while identifying missing coverage.</p>
            <p>It uses only approved writing preferences as memory and never turns a correction into a job fact.</p>
            <p>It checks terminology, clarity, uncertainty, and source support before returning a suggestion.</p>
            <p>It can draft only. It cannot save, publish, send, approve pricing, alter invoices, or make commitments.</p>
          </div>
        </details>
      </Panel>

      <Panel className="mt-5 p-5">
        <h3 className="text-lg font-bold">LLM providers</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Provider settings shown here belong to the current company. Company keys are encrypted at rest and are never displayed;
          environment references remain supported for deployment-managed secrets.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {providers.map((provider) => (
            <div key={provider.id} className="rounded-md border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold">{provider.displayName}</p>
                <StatusPill value={provider.enabled ? "ENABLED" : "DISABLED"} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{provider.defaultModel || "No default model set"}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {provider.endpointKind === "LOCAL" ? "Local or self-hosted endpoint" : "Hosted provider"}
                {provider.baseUrl ? ` · ${provider.baseUrl}` : ""}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Credential: {provider.secretCiphertext ? "encrypted company key" : provider.apiKeySecretRef ? "deployment secret reference" : "not set"}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {provider.lastCheckedAt
                  ? `Last check ${dateShort(provider.lastCheckedAt)}: ${provider.lastCheckMessage ?? ""}`
                  : "No reachability check recorded"}
              </p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{provider.notes}</p>
            </div>
          ))}
          {!providers.length && <p className="text-sm text-muted-foreground">No provider settings are available for this company.</p>}
        </div>
      </Panel>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {agents.map((agent) => {
          const bound = agent.providerConfigId ? providersById.get(agent.providerConfigId) : undefined;
          return (
            <Panel key={agent.id} className="p-4">
              <p className="text-xs font-bold uppercase text-muted-foreground">{agent.roleName}</p>
              <p className="mt-1 text-lg font-bold">{agent.agentName}</p>
              <p className="mt-2 text-sm text-muted-foreground">{agent._count.tasks} tasks</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{agent.purpose}</p>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                Inference: {bound ? bound.displayName : "company default connection"} · {agent.model ?? bound?.defaultModel ?? "connection default model"} · thinking {(agent.thinkingMode ?? "AUTO").toLowerCase()}
              </p>
              <form action={saveAiAgentBinding.bind(null, agent.id)} className="mt-3 grid gap-2 border-t border-border pt-3">
                <select name="providerConfigId" defaultValue={agent.providerConfigId ?? ""} className="h-8 rounded-md border border-border px-2 text-xs">
                  <option value="">Company default connection</option>
                  {enabledProviders.map((provider) => (
                    <option key={provider.id} value={provider.id}>{provider.displayName}</option>
                  ))}
                </select>
                <input
                  type="text"
                  name="model"
                  defaultValue={agent.model ?? ""}
                  placeholder="Model for this agent"
                  className="h-8 rounded-md border border-border px-2 text-xs outline-none focus:ring-2 focus:ring-primary"
                />
                <select name="thinkingMode" defaultValue={agent.thinkingMode ?? "AUTO"} className="h-8 rounded-md border border-border px-2 text-xs">
                  <option value="AUTO">Thinking: automatic</option>
                  <option value="OFF">Thinking: off</option>
                  <option value="ON">Thinking: on</option>
                </select>
                <button type="submit" className="h-8 rounded-md border border-border px-3 text-xs font-semibold hover:bg-muted">
                  Save inference binding
                </button>
              </form>
            </Panel>
          );
        })}
        {!agents.length && <Panel className="p-4 text-sm text-muted-foreground">No AI workflows are registered for this company.</Panel>}
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
                <p className="mt-1 text-sm text-muted-foreground">{task.agentId ? agentNames.get(task.agentId) ?? "Unavailable agent" : "Unassigned"} · {task.workflowArea} · due {dateShort(task.dueDate)}</p>
                <p className="mt-2 text-sm">{task.resultSummary ?? task.prompt}</p>
              </div>
            ))
          ) : (
            <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">No Report guide tasks have been created for this company.</p>
          )}
        </div>
      </Panel>
    </>
  );
}
