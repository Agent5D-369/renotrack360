import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { prisma } from "@/lib/prisma";

export default async function ChecklistsPage() {
  const [templates, runs, evidence] = await Promise.all([
    prisma.checklistTemplate.findMany({ include: { items: true, runs: true }, orderBy: { category: "asc" } }),
    prisma.checklistRun.findMany({ include: { template: true, items: true }, orderBy: { updatedAt: "desc" }, take: 10 }),
    prisma.requiredEvidence.findMany({ orderBy: { createdAt: "desc" }, take: 10 })
  ]);

  return (
    <>
      <PageHeader title="Checklists & Templates" body="Reusable process enforcement for leads, estimates, jobs, safety, field work, payments, and closeout." />
      <div className="grid gap-4 md:grid-cols-3">
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Templates</p><p className="text-3xl font-bold">{templates.length}</p></Panel>
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Active runs</p><p className="text-3xl font-bold">{runs.filter((r) => r.status !== "Complete").length}</p></Panel>
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Evidence rules</p><p className="text-3xl font-bold">{evidence.length}</p></Panel>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel className="p-5">
          <h3 className="text-lg font-bold">Template library</h3>
          <div className="mt-4 grid gap-3">
            {templates.map((template) => (
              <div key={template.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{template.templateName}</p>
                  <span className="text-xs font-bold text-muted-foreground">{template.entityType}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{template.category} · {template.items.length} checks · {template.blocksProgress ? "blocks progress" : "advisory"}</p>
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="p-5">
          <h3 className="text-lg font-bold">Recent checklist runs</h3>
          <div className="mt-4 grid gap-3">
            {runs.map((run) => (
              <div key={run.id} className="rounded-md border border-border p-3">
                <p className="font-semibold">{run.title}</p>
                <p className="text-sm text-muted-foreground">{run.template.templateName} · {run.status} · {run.items.length} items</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
