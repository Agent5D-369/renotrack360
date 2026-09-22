import { requireStaffPage } from "@/lib/staff-access";
import Link from "next/link";
import { DataTable } from "@/components/data-table";
import { StatusPill } from "@/components/status-pill";
import { dateShort, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { flipsidePaymentWhere } from "@/lib/financial-record-scope";

export default async function PaymentsPage() {
  await requireStaffPage();
  const payments = await prisma.payment.findMany({ where: flipsidePaymentWhere, include: { invoice: true, clientProfile: true }, orderBy: { paymentDate: "desc" } });
  return (
    <><Link href="/payments/reconciliation" className="mb-4 inline-block text-sm font-semibold text-primary underline">Review receipt reconciliation</Link>
    <DataTable
      title="Payments"
      actionHref="/payments/new"
      actionLabel="New payment"
      rows={payments}
      detailBasePath="/payments"
      editBasePath="/payments"
      columns={[
        { header: "Invoice", cell: (row) => row.invoice.invoiceNumber },
        { header: "Client", cell: (row) => row.clientProfile?.profileName ?? "Not assigned" },
        { header: "Amount", cell: (row) => money(row.amount) },
        { header: "Status", cell: (row) => <StatusPill value={row.status} /> },
        { header: "Date", cell: (row) => dateShort(row.paymentDate) },
        { header: "Method", cell: (row) => <StatusPill value={row.method} /> }
      ]}
    />
    </>
  );
}
