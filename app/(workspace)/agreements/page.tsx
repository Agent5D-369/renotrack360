import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { Panel } from "@/components/ui";
import { dateShort } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function AgreementsPage() {
  const [templates, agreements] = await Promise.all([
    prisma.agreementTemplate.findMany({ orderBy: { templateName: "asc" } }),
    prisma.agreement.findMany({ include: { profile: true, job: true, signatures: true, auditEvents: true }, orderBy: { updatedAt: "desc" } })
  ]);

  return (
    <>
      <PageHeader title="Agreements" body="Counsel-reviewed agreement templates, subcontractor documents, signature status, and audit trails. Use this as tracking infrastructure, not legal advice." />
      <div className="grid gap-4 md:grid-cols-4">
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Templates</p><p className="text-3xl font-bold">{templates.length}</p></Panel>
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Agreements</p><p className="text-3xl font-bold">{agreements.length}</p></Panel>
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Signed</p><p className="text-3xl font-bold">{agreements.filter((a) => a.status === "SIGNED").length}</p></Panel>
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Counsel reviewed</p><p className="text-3xl font-bold">{templates.filter((t) => t.counselReviewed).length}</p></Panel>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel className="p-5">
          <h3 className="text-lg font-bold">Agreement templates</h3>
          <div className="mt-4 grid gap-3">
            {templates.map((template) => (
              <div key={template.id} className="rounded-md border border-border p-3">
                <p className="font-semibold">{template.templateName}</p>
                <p className="text-sm text-muted-foreground">{template.agreementType} · {template.jurisdiction} · v{template.version} · {template.counselReviewed ? "counsel reviewed" : "needs review"}</p>
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="p-5">
          <h3 className="text-lg font-bold">Signature tracking</h3>
          <div className="mt-4 grid gap-3">
            {agreements.map((agreement) => (
              <div key={agreement.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{agreement.agreementName}</p>
                  <StatusPill value={agreement.status} />
                </div>
                <p className="text-sm text-muted-foreground">{agreement.profile?.profileName ?? agreement.job?.jobName ?? "General"} · signed {dateShort(agreement.signedAt)} · {agreement.auditEvents.length} audit events</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
