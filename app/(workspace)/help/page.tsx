import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { guidedWorkflows, helpTopics } from "@/lib/help-content";

export default function HelpPage() {
  return (
    <>
      <PageHeader title="Help Center" body="Plainspoken operating guidance for renovation workflows, field usage, estimates, selections, client updates, and security basics." />
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <Panel className="p-5">
          <h3 className="text-lg font-bold">Help topics</h3>
          <div className="mt-4 grid gap-3">
            <section className="rounded-md border border-border p-4">
              <h4 className="font-bold">Deletion and archive policy</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Best practice is archive first, soft-delete second, hard-delete almost never. Profiles, leads, jobs, invoices, tasks, reports, approvals, and payments create an audit trail, so destructive deletion should be limited to admins and blocked when financial, legal, or client-facing records exist. The app now has soft-delete/archive foundation for leads; the same pattern should be extended across jobs, tasks, profiles, quotes, invoices, and files before public SaaS launch.
              </p>
            </section>
            {helpTopics.map((topic) => (
              <section key={topic.title} className="rounded-md border border-border p-4">
                <h4 className="font-bold">{topic.title}</h4>
                <p className="mt-1 text-sm text-muted-foreground">{topic.body}</p>
              </section>
            ))}
          </div>
        </Panel>
        <Panel className="p-5">
          <h3 className="text-lg font-bold">Guided workflows</h3>
          <div className="mt-4 grid gap-2">
            {guidedWorkflows.map((workflow) => (
              <Link key={workflow.title} href={workflow.href} className="rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-muted">
                {workflow.title}
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
