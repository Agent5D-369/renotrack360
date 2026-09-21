import { requireStaffPage } from "@/lib/staff-access";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui";
import { dateShort } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function ResourcesPage() {
  await requireStaffPage();
  const [materials, requests, equipment, tools] = await Promise.all([
    prisma.materialItem.findMany({ orderBy: { itemName: "asc" } }),
    prisma.materialRequest.findMany({ include: { job: true }, orderBy: { neededBy: "asc" }, take: 8 }),
    prisma.equipmentAsset.findMany({ include: { assignments: true }, orderBy: { assetName: "asc" } }),
    prisma.toolAsset.findMany({ include: { assignments: true }, orderBy: { toolName: "asc" } })
  ]);

  return (
    <>
      <PageHeader title="Resources" body="Material management, procurement status, equipment utilization, tool tracking, maintenance, and barcode-ready inventory." />
      <div className="grid gap-4 md:grid-cols-4">
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Materials</p><p className="text-3xl font-bold">{materials.length}</p></Panel>
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Requests</p><p className="text-3xl font-bold">{requests.length}</p></Panel>
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Equipment</p><p className="text-3xl font-bold">{equipment.length}</p></Panel>
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Tools</p><p className="text-3xl font-bold">{tools.length}</p></Panel>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel className="p-5"><h3 className="text-lg font-bold">Material requests</h3><div className="mt-4 grid gap-3">{requests.map((request) => <div key={request.id} className="rounded-md border border-border p-3"><p className="font-semibold">{request.itemName}</p><p className="text-sm text-muted-foreground">{request.job.jobName} · needed {dateShort(request.neededBy)} · {request.status}</p></div>)}</div></Panel>
        <Panel className="p-5"><h3 className="text-lg font-bold">Equipment and tools</h3><div className="mt-4 grid gap-3">{[...equipment.map((e) => ({ id: e.id, name: e.assetName, status: e.status, meta: e.assetType })), ...tools.map((t) => ({ id: t.id, name: t.toolName, status: t.status, meta: t.category }))].map((asset) => <div key={asset.id} className="rounded-md border border-border p-3"><p className="font-semibold">{asset.name}</p><p className="text-sm text-muted-foreground">{asset.meta} · {asset.status}</p></div>)}</div></Panel>
      </div>
    </>
  );
}
