import { Prisma, type Invoice, type Payment } from "@prisma/client";
type CollectionInvoice = Pick<Invoice, "id" | "status" | "total" | "amountPaid" | "balanceDue" | "dueDate"> & { payments: Pick<Payment, "status" | "amount">[] };
export const collectionViews = ["all", "overdue", "upcoming", "review", "drafts", "paid"] as const;
export type CollectionView = typeof collectionViews[number];
export function austinDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  return `${parts.find(p => p.type === "year")!.value}-${parts.find(p => p.type === "month")!.value}-${parts.find(p => p.type === "day")!.value}`;
}
const dayNumber = (day: string) => Date.parse(day + "T00:00:00Z") / 86400000;
export function invoiceCollectionState(invoice: CollectionInvoice, today = austinDay()) {
  const receipts = invoice.payments.filter(p => p.status === "COMPLETED").reduce((sum, p) => sum.plus(p.amount), new Prisma.Decimal(0));
  const expectedBalance = invoice.total.minus(receipts);
  const mismatch = !receipts.eq(invoice.amountPaid) || !expectedBalance.eq(invoice.balanceDue);
  const needsReview = mismatch || invoice.balanceDue.lt(0) || (invoice.status === "PAID" && invoice.balanceDue.gt(0));
  const open = ["SENT", "PARTIALLY_PAID", "OVERDUE"].includes(invoice.status) && invoice.balanceDue.gt(0);
  const days = invoice.dueDate ? dayNumber(today) - dayNumber(invoice.dueDate.toISOString().slice(0, 10)) : null;
  const overdue = open && days !== null && days > 0;
  const upcoming = open && days !== null && days <= 0 && days >= -7;
  const aging = !open ? null : days === null ? "No due date" : days <= 0 ? "Current" : days <= 30 ? "1–30 days" : days <= 60 ? "31–60 days" : days <= 90 ? "61–90 days" : "90+ days";
  const dueLabel = days === null ? "No due date" : days === 0 ? "Due today" : days > 0 ? `${days} days past due` : `Due in ${-days} days`;
  const nextAction = needsReview ? "Review receipts" : invoice.status === "DRAFT" ? "Review draft" : overdue ? "Review collection" : open && !invoice.dueDate ? "Set due date" : open ? "Open invoice" : "View record";
  const priority = needsReview ? 0 : overdue ? 1 : open && !invoice.dueDate ? 2 : upcoming ? 3 : invoice.status === "DRAFT" ? 4 : 5;
  return { receipts, expectedBalance, mismatch, needsReview, open, overdue, upcoming, aging, days, dueLabel, nextAction, priority };
}
export function matchesCollectionView(invoice: CollectionInvoice, view: CollectionView, today: string) {
  const state = invoiceCollectionState(invoice, today);
  return view === "all" || (view === "review" && state.needsReview) || (view === "overdue" && state.overdue) || (view === "upcoming" && state.upcoming) || (view === "drafts" && invoice.status === "DRAFT") || (view === "paid" && invoice.status === "PAID");
}
export function summarizeCollections<T extends CollectionInvoice>(invoices: T[], today = austinDay()) {
  const rows = invoices.map(invoice => ({ invoice, state: invoiceCollectionState(invoice, today) }));
  const sum = (predicate: (row: typeof rows[number]) => boolean) => rows.filter(predicate).reduce((total, { invoice }) => total.plus(invoice.balanceDue), new Prisma.Decimal(0));
  const aging = ["Current", "1–30 days", "31–60 days", "61–90 days", "90+ days", "No due date"].map(label => ({ label, amount: sum(row => row.state.aging === label), count: rows.filter(row => row.state.aging === label).length }));
  const queue = rows.filter(row => row.state.priority < 5).sort((a,b) => a.state.priority - b.state.priority || (b.state.days ?? -Infinity) - (a.state.days ?? -Infinity) || b.invoice.balanceDue.comparedTo(a.invoice.balanceDue) || a.invoice.id.localeCompare(b.invoice.id));
  return { rows, queue, aging, outstanding: sum(row => row.state.open), overdue: sum(row => row.state.overdue), upcoming: sum(row => row.state.upcoming), reviewCount: rows.filter(row => row.state.needsReview).length, draftCount: rows.filter(row => row.invoice.status === "DRAFT").length };
}
