import { requireStaffPage } from "@/lib/staff-access";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { Panel } from "@/components/ui";
import { dateShort, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function SelectionsPage() {
  await requireStaffPage();
  const sheets = await prisma.selectionSheet.findMany({
    include: { job: true, clientProfile: true, items: { include: { options: true, approvals: true } } },
    orderBy: { updatedAt: "desc" }
  });
  const allItems = sheets.flatMap((sheet) => sheet.items.map((item) => ({ ...item, sheet })));
  const overdue = allItems.filter((item) => item.requiredByDate && item.requiredByDate < new Date() && !["APPROVED", "ORDERED", "RECEIVED", "INSTALLED"].includes(item.decisionStatus)).length;
  const overAllowance = allItems.filter((item) => Number(item.priceVariance) > 0).length;
  const changeOrders = allItems.filter((item) => item.changeOrderNeeded).length;

  return (
    <>
      <PageHeader title="Selections" body="Client/contractor material selections, allowance tracking, lead times, approvals, procurement status, and change-order triggers." />
      <div className="grid gap-4 md:grid-cols-4">
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Sheets</p><p className="text-3xl font-bold">{sheets.length}</p></Panel>
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Decision overdue</p><p className="text-3xl font-bold">{overdue}</p></Panel>
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Over allowance</p><p className="text-3xl font-bold">{overAllowance}</p></Panel>
        <Panel className="p-4"><p className="text-xs font-bold uppercase text-muted-foreground">CO needed</p><p className="text-3xl font-bold">{changeOrders}</p></Panel>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_380px]">
        <Panel className="p-5">
          <h3 className="text-lg font-bold">Selection sheets</h3>
          <div className="mt-4 grid gap-3">
            {sheets.map((sheet) => (
              <div key={sheet.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{sheet.sheetName}</p>
                  <StatusPill value={sheet.status} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{sheet.job.jobName} · {sheet.clientProfile?.profileName ?? "Client"} · due {dateShort(sheet.dueDate)}</p>
                <p className="mt-2 text-sm">{sheet.items.length} selection items</p>
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="p-5">
          <h3 className="text-lg font-bold">Decision risks</h3>
          <div className="mt-4 grid gap-3">
            {allItems.slice(0, 10).map((item) => (
              <div key={item.id} className="rounded-md border border-border p-3">
                <p className="font-semibold">{item.itemName}</p>
                <p className="text-sm text-muted-foreground">{item.roomArea ?? item.category} · {item.decisionStatus} · needed {dateShort(item.requiredByDate)}</p>
                <p className="mt-1 text-sm">Allowance {money(item.allowanceAmount)} · variance {money(item.priceVariance)} · lead time {item.leadTimeDays} days</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
