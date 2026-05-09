import Link from "next/link";
import { createPaymentLink } from "@/app/actions";
import { DataTable } from "@/components/data-table";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui";
import { dateShort, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function InvoicesPage() {
  const invoices = await prisma.invoice.findMany({ include: { job: true, clientProfile: true }, orderBy: { issueDate: "desc" } });
  return (
    <DataTable
      title="Invoices"
      actionHref="/invoices/new"
      actionLabel="New invoice"
      rows={invoices}
      detailBasePath="/invoices"
      editBasePath="/invoices"
      columns={[
        { header: "Invoice", cell: (row) => <span className="font-semibold">{row.invoiceNumber}</span> },
        { header: "Client", cell: (row) => row.clientProfile?.profileName ?? "Not assigned" },
        { header: "Due", cell: (row) => dateShort(row.dueDate) },
        { header: "Balance", cell: (row) => money(row.balanceDue) },
        { header: "Status", cell: (row) => <StatusPill value={row.status} /> },
        { header: "Actions", cell: (row) => (
          <div className="flex flex-wrap gap-2">
            <Link className="font-semibold text-primary" href={`/api/pdf/invoice/${row.id}`}>PDF</Link>
            {row.stripePaymentLink?.startsWith("http") ? <Link className="font-semibold text-primary" href={row.stripePaymentLink}>Pay</Link> : <form action={createPaymentLink.bind(null, row.id)}><Button variant="ghost" className="h-auto px-2 py-0">Stripe link</Button></form>}
          </div>
        ) }
      ]}
    />
  );
}
