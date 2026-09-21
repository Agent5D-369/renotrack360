import { requireStaffPage } from "@/lib/staff-access";
﻿import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { Panel } from "@/components/ui";
import { dateShort, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage();
  const { id } = await params;
  const payment = await prisma.payment.findUniqueOrThrow({
    where: { id },
    include: { invoice: { include: { job: true } }, clientProfile: true }
  });

  return (
    <>
      <PageHeader
        title={`Payment - ${money(payment.amount)}`}
        body={`${payment.clientProfile?.profileName ?? "No client"} · Invoice ${payment.invoice.invoiceNumber}`}
      />
      <div className="mb-4 flex items-center gap-3">
        <Link href="/payments" className="text-sm font-semibold text-muted-foreground hover:text-foreground">← All payments</Link>
        <span className="text-muted-foreground">·</span>
        <Link href={`/invoices/${payment.invoiceId}`} className="text-sm font-semibold text-muted-foreground hover:text-foreground">View invoice</Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
        <div className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Panel className="p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Amount</p>
              <p className="mt-2 text-3xl font-bold">{money(payment.amount)}</p>
            </Panel>
            <Panel className="p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Method</p>
              <div className="mt-2"><StatusPill value={payment.method} /></div>
            </Panel>
            <Panel className="p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Status</p>
              <div className="mt-2"><StatusPill value={payment.status} /></div>
            </Panel>
          </div>

          {payment.notes && (
            <Panel className="p-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Notes</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{payment.notes}</p>
            </Panel>
          )}
        </div>

        <div className="grid gap-4 self-start">
          <Panel className="p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Payment date</p>
            <p className="mt-1 font-semibold">{dateShort(payment.paymentDate)}</p>
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Invoice</p>
            <Link href={`/invoices/${payment.invoiceId}`} className="mt-1 block text-sm font-semibold text-primary hover:underline">{payment.invoice.invoiceNumber}</Link>
            {payment.invoice.job && (
              <>
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Job</p>
                <Link href={`/jobs/${payment.invoice.job.id}`} className="mt-1 block text-sm font-semibold text-primary hover:underline">{payment.invoice.job.jobName}</Link>
              </>
            )}
            {payment.clientProfile && (
              <>
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Client</p>
                <Link href={`/profiles/${payment.clientProfile.id}`} className="mt-1 block text-sm font-semibold text-primary hover:underline">{payment.clientProfile.profileName}</Link>
              </>
            )}
            {payment.stripePaymentIntentId && (
              <>
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Stripe intent</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground break-all">{payment.stripePaymentIntentId}</p>
              </>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
