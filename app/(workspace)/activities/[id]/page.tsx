import { requireStaffPage } from "@/lib/staff-access";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { Panel } from "@/components/ui";
import { dateShort } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { activityInOrganization } from "@/lib/company-scope";
import { notFound } from "next/navigation";

export default async function ActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireStaffPage();
  const { id } = await params;
  const activity = await prisma.activity.findFirst({
    where: activityInOrganization(actor.organizationId, { id }),
    include: { profile: true, lead: true, job: true, quote: true, invoice: true }
  });
  if (!activity) notFound();

  const relatedLinks: { label: string; href: string }[] = [];
  if (activity.lead) relatedLinks.push({ label: `Lead: ${activity.lead.leadName}`, href: `/leads/${activity.lead.id}` });
  if (activity.job) relatedLinks.push({ label: `Job: ${activity.job.jobName}`, href: `/jobs/${activity.job.id}` });
  if (activity.profile) relatedLinks.push({ label: `Contact: ${activity.profile.profileName}`, href: `/profiles/${activity.profile.id}` });
  if (activity.quote) relatedLinks.push({ label: `Quote: ${activity.quote.quoteName}`, href: `/quotes/${activity.quote.id}` });
  if (activity.invoice) relatedLinks.push({ label: `Invoice: ${activity.invoice.invoiceNumber}`, href: `/invoices/${activity.invoice.id}` });

  return (
    <>
      <PageHeader title={activity.subject} body="Activity detail" />
      <div className="mb-4">
        <Link href="/activities" className="text-sm font-semibold text-muted-foreground hover:text-foreground">← All activities</Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
        <div className="grid gap-5">
          <Panel className="p-5">
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill value={activity.activityType} />
              {activity.completedAt && (
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">Completed</span>
              )}
            </div>
            <h2 className="mt-4 text-xl font-bold">{activity.subject}</h2>
            {activity.body && (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{activity.body}</p>
            )}
          </Panel>

          {relatedLinks.length > 0 && (
            <Panel className="p-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Related records</h3>
              <div className="grid gap-2">
                {relatedLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-muted hover:text-primary">
                    {link.label} →
                  </Link>
                ))}
              </div>
            </Panel>
          )}
        </div>

        <div className="grid gap-4 self-start">
          <Panel className="p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Due date</p>
            <p className="mt-1 font-semibold">{dateShort(activity.dueDate)}</p>
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Completed</p>
            <p className="mt-1 text-sm">{dateShort(activity.completedAt)}</p>
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Logged</p>
            <p className="mt-1 text-sm">{dateShort(activity.createdAt)}</p>
          </Panel>
        </div>
      </div>
    </>
  );
}
