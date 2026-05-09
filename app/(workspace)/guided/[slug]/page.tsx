import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { guidedWorkflows } from "@/lib/help-content";

export default async function GuidedWorkflowPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const workflow = guidedWorkflows.find((item) => item.href.endsWith(slug));
  if (!workflow) notFound();
  const Icon = workflow.icon;

  return (
    <>
      <PageHeader title={workflow.title} body={workflow.outcome} actionHref="/guided" actionLabel="All guides" />
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <Panel className="p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-md bg-muted text-primary">
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Step-by-step path</h3>
              <p className="text-sm text-muted-foreground">Follow in order when training or onboarding. Experienced users can jump straight to the needed step.</p>
            </div>
          </div>
          <ol className="mt-6 grid gap-3">
            {workflow.steps.map(([label, href, help], index) => (
              <li key={label} className="grid gap-3 rounded-md border border-border p-4 md:grid-cols-[48px_1fr_auto] md:items-center">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{index + 1}</span>
                <div>
                  <p className="font-bold">{label}</p>
                  <p className="text-sm text-muted-foreground">{help}</p>
                </div>
                <Link href={href} className="text-sm font-bold text-primary">Open</Link>
              </li>
            ))}
          </ol>
        </Panel>
        <Panel className="p-5">
          <h3 className="text-lg font-bold">Completion standard</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Finish the workflow only when the next action, owner, date, proof, and client/internal visibility are clear.
          </p>
          <div className="mt-5 rounded-md border border-border bg-muted p-4">
            <p className="text-sm font-bold">Shortcut for power users</p>
            <p className="mt-1 text-sm text-muted-foreground">Use the sidebar to jump modules, but return to this guide when training someone or checking process quality.</p>
          </div>
        </Panel>
      </div>
    </>
  );
}
