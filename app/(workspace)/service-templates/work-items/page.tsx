import { requireStaffPage } from "@/lib/staff-access";
import Link from "next/link";
import { adoptWorkItemPilot } from "@/app/actions";
import { showerPilot, workItemDigest } from "@/lib/work-item-pilot";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { PageHeader } from "@/components/page-header";
import { Panel, Button } from "@/components/ui";
import { WorkItemPlan } from "@/components/work-item-plan";

export default async function WorkItemsPage() {
  await requireStaffPage();
  const versions = await prisma.workItemVersion.findMany({ where: { organizationId: DEFAULT_ORG_ID }, orderBy: { createdAt: "desc" }, take: 30 });
  return <>
    <PageHeader title="Versioned work items" body="Retain the scope, sequence and evidence requirements used to plan a job." />
    <Link href="/service-templates" className="mb-4 inline-block text-sm font-semibold text-primary">← Service template library</Link>
    <Panel className="mb-5 p-5"><h2 className="font-semibold">Retained versions</h2>{versions.length ? <ul className="mt-3 space-y-2">{versions.map(version => <li key={version.id}><Link className="text-sm font-semibold text-primary underline" href={`/service-templates/work-items/${version.id}`}>{version.name} · revision {version.revision}</Link></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">No version adopted yet. Review the recommended pilot below.</p>}</Panel>
    <h2 className="mb-4 text-xl font-semibold">Recommended pilot: {showerPilot.name}</h2>
    <WorkItemPlan content={showerPilot} />
    <Panel className="mt-5 p-5"><form action={adoptWorkItemPilot} className="grid gap-3">
      <input type="hidden" name="reviewedDigest" value={workItemDigest(showerPilot)} />
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="planningAcknowledged" required className="mt-1" />I reviewed this internal planning template. Each job still requires its own site review, installer and inspection records, evidence and QC acceptance.</label>
      <Button type="submit">Adopt this planning version</Button>
    </form></Panel>
  </>;
}
