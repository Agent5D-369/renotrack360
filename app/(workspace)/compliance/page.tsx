import { requireStaffPage } from "@/lib/staff-access";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { dateShort } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function CompliancePage() {
  await requireStaffPage();
  const [permits, incidents, audits, templates] = await Promise.all([
    prisma.permitRecord.findMany({ include: { job: true }, orderBy: { updatedAt: "desc" } }),
    prisma.incidentReport.findMany({ include: { job: true }, orderBy: { incidentDate: "desc" } }),
    prisma.safetyAudit.findMany({ include: { job: true, template: true }, orderBy: { auditDate: "desc" } }),
    prisma.safetyAuditTemplate.findMany({ orderBy: { templateName: "asc" } })
  ]);

  return (
    <>
      <PageHeader title="Compliance" body="Permit tracking, inspection readiness, incident reporting, and safety audit templates for renovation work." />
      <div className="grid gap-4 md:grid-cols-4">
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Permits</p><p className="text-3xl font-bold">{permits.length}</p></Panel>
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Open incidents</p><p className="text-3xl font-bold">{incidents.filter((i) => !i.resolvedAt).length}</p></Panel>
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Audits</p><p className="text-3xl font-bold">{audits.length}</p></Panel>
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Templates</p><p className="text-3xl font-bold">{templates.length}</p></Panel>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel className="p-5"><h3 className="text-lg font-bold">Permit watchlist</h3><div className="mt-4 grid gap-3">{permits.map((permit) => <div key={permit.id} className="rounded-md border border-border p-3"><p className="font-semibold">{permit.permitName}</p><p className="text-sm text-muted-foreground">{permit.job.jobName} · {permit.status} · inspection {dateShort(permit.inspectionDate)}</p></div>)}</div></Panel>
        <Panel className="p-5"><h3 className="text-lg font-bold">Safety and incidents</h3><div className="mt-4 grid gap-3">{incidents.map((incident) => <div key={incident.id} className="rounded-md border border-border p-3"><p className="font-semibold">{incident.title}</p><p className="text-sm text-muted-foreground">{incident.job.jobName} · {incident.severity} · {dateShort(incident.incidentDate)}</p></div>)}</div></Panel>
      </div>
    </>
  );
}
