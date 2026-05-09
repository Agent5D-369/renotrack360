import { DataTable } from "@/components/data-table";
import { StatusPill } from "@/components/status-pill";
import { dateShort, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function PaymentsPage() {
  const payments = await prisma.payment.findMany({ include: { invoice: true, clientProfile: true }, orderBy: { paymentDate: "desc" } });
  return (
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
        { header: "Date", cell: (row) => dateShort(row.paymentDate) },
        { header: "Method", cell: (row) => <StatusPill value={row.method} /> }
      ]}
    />
  );
}
