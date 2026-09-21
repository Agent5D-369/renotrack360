import { requireStaffPage } from "@/lib/staff-access";
﻿import Link from "next/link";
import { DataTable } from "@/components/data-table";
import { StatusPill } from "@/components/status-pill";
import { money, dateShort } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function ChangeOrdersPage() {
  await requireStaffPage();
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 86_400_000);
  const orders = await prisma.changeOrder.findMany({ include: { job: true, clientProfile: true }, orderBy: { updatedAt: "desc" } });
  const staleCount = orders.filter((co) => co.status === "DRAFT" && co.createdAt < threeDaysAgo).length;
  return (
    <>
      {staleCount > 0 && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-3.5 text-sm">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
          <span className="font-bold text-red-800">{staleCount} change order{staleCount !== 1 ? "s" : ""} stuck in DRAFT for 3+ days - unsigned work is money at risk.</span>
          <Link href="/budget" className="ml-auto shrink-0 text-xs font-bold text-red-700 hover:text-red-900">View profit leak dashboard →</Link>
        </div>
      )}
      <DataTable
        title="Change Orders"
        actionHref="/change-orders/new"
        actionLabel="New change order"
        rows={orders}
        detailBasePath="/change-orders"
        editBasePath="/change-orders"
        columns={[
          {
            header: "Title",
            cell: (row) => {
              const isStale = row.status === "DRAFT" && row.createdAt < threeDaysAgo;
              return (
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{row.changeOrderTitle}</span>
                  {isStale && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">Stale draft</span>}
                </div>
              );
            },
          },
          { header: "Job", cell: (row) => row.job.jobName },
          { header: "Status", cell: (row) => <StatusPill value={row.status} /> },
          { header: "Added cost", cell: (row) => money(row.addedCost) },
          { header: "Created", cell: (row) => dateShort(row.createdAt) },
          { header: "PDF", cell: (row) => <a href={`/api/pdf/change-order/${row.id}`} download className="font-semibold text-primary hover:underline">Download</a> },
        ]}
      />
    </>
  );
}
