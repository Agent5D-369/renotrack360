import { randomUUID } from "node:crypto";
import type { Payment } from "@prisma/client";
import { Button, Panel } from "@/components/ui";
import { options } from "@/lib/form-options";

export function PaymentForm({ action, payment, invoices, profiles, initialInvoiceId }: { action: (data: FormData) => Promise<void>; payment?: Payment; initialInvoiceId?: string;
  invoices: Array<{ id: string; invoiceNumber: string }>; profiles: Array<{ id: string; profileName: string }> }) {
  const fieldClass = "mt-1 w-full rounded-md border border-border bg-white px-3 py-2";
  return <Panel className="p-5"><form action={action} className="grid gap-4">
    <input type="hidden" name="requestId" value={randomUUID()} />
    <input type="hidden" name="expectedUpdatedAt" value={payment?.updatedAt.toISOString() ?? ""} />
    <p className="text-sm">Only completed receipts count as paid. Changes retain a history and reconcile the affected invoices. Recording a payment here does not collect or refund money through a provider.</p>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm">Invoice<select name="invoiceId" required defaultValue={payment?.invoiceId ?? initialInvoiceId ?? ""} className={fieldClass}><option value="">Select invoice</option>{invoices.map(item => <option key={item.id} value={item.id}>{item.invoiceNumber}</option>)}</select></label>
      <label className="text-sm">Client<select name="clientProfileId" defaultValue={payment?.clientProfileId ?? ""} className={fieldClass}><option value="">Use invoice client</option>{profiles.map(item => <option key={item.id} value={item.id}>{item.profileName}</option>)}</select></label>
      <label className="text-sm">Amount ($)<input name="amount" type="number" min="0.01" step="0.01" required defaultValue={payment?.amount.toString()} className={fieldClass} /></label>
      <label className="text-sm">Payment date<input name="paymentDate" type="date" required defaultValue={payment?.paymentDate.toISOString().slice(0, 10)} className={fieldClass} /></label>
      <label className="text-sm">Method<select name="method" required defaultValue={payment?.method ?? ""} className={fieldClass}><option value="">Select method</option>{options.paymentMethods.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <label className="text-sm">Status<select name="status" required defaultValue={payment?.status ?? "PENDING"} className={fieldClass}>{options.paymentStatuses.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
    </div>
    <label className="text-sm">Stripe payment intent, if applicable<input name="stripePaymentIntentId" defaultValue={payment?.stripePaymentIntentId ?? ""} maxLength={3000} className={fieldClass} /></label>
    <label className="text-sm">Receipt reference or reason for this change<textarea name="notes" defaultValue={payment?.notes ?? ""} maxLength={3000} rows={3} className={fieldClass} /></label>
    <p className="text-xs text-muted-foreground">Refunded means the full receipt is refunded. Partial refunds need a separate reviewed adjustment; do not replace the original amount to simulate one.</p>
    <Button type="submit">{payment ? "Save payment revision" : "Record payment"}</Button>
  </form></Panel>;
}
