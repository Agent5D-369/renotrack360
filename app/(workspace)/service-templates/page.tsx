import { requireStaffPage } from "@/lib/staff-access";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { prisma } from "@/lib/prisma";

export default async function ServiceTemplatesPage() {
  await requireStaffPage();
  const templates = await prisma.serviceTemplate.findMany({
    include: {
      steps: { orderBy: { stepNumber: "asc" } },
      quoteSections: { orderBy: { sortOrder: "asc" } },
      taskTemplates: true,
      invoiceMilestones: true,
      evidenceRequirements: true
    },
    orderBy: [{ category: "asc" }, { serviceName: "asc" }]
  });
  const categories = [...new Set(templates.map((template) => template.category))];

  return (
    <>
      <PageHeader title="Service Templates" body="Homewyse-style service playbooks for quotes, tasks, invoices, evidence, and crew execution." />
      <Panel className="mb-5 p-4"><h2 className="font-semibold">Versioned work items</h2><p className="mt-1 text-sm text-muted-foreground">Review and retain scope, ordered steps and evidence requirements, starting with the shower waterproofing pilot.</p><Link href="/service-templates/work-items" className="mt-3 inline-block font-semibold text-primary underline">Open work-item library</Link></Panel>
      <div className="grid gap-4 md:grid-cols-4">
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Templates</p><p className="text-3xl font-bold">{templates.length}</p></Panel>
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Categories</p><p className="text-3xl font-bold">{categories.length}</p></Panel>
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Steps</p><p className="text-3xl font-bold">{templates.reduce((sum, template) => sum + template.steps.length, 0)}</p></Panel>
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Evidence rules</p><p className="text-3xl font-bold">{templates.reduce((sum, template) => sum + template.evidenceRequirements.length, 0)}</p></Panel>
      </div>
      <div className="mt-5 grid gap-5">
        {categories.map((category) => (
          <Panel key={category} className="p-5">
            <h3 className="text-lg font-bold">{category}</h3>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {templates.filter((template) => template.category === category).map((template) => (
                <div key={template.id} className="rounded-md border border-border p-4">
                  <div className="flex flex-col justify-between gap-2 md:flex-row md:items-start">
                    <div>
                      <p className="font-bold">{template.serviceName}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{template.shortDescription}</p>
                    </div>
                    <span className="rounded-full bg-muted px-2 py-1 text-xs font-bold">{template.templateCode}</span>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm md:grid-cols-4">
                    <span>{template.steps.length} steps</span>
                    <span>{template.quoteSections.length} quote sections</span>
                    <span>{template.taskTemplates.length} tasks</span>
                    <span>{template.invoiceMilestones.length} milestones</span>
                  </div>
                  <ol className="mt-4 grid gap-1 text-sm text-muted-foreground">
                    {template.steps.slice(0, 4).map((step) => (
                      <li key={step.id}>{step.stepNumber}. {step.stepName}</li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}
