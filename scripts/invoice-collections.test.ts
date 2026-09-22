import test from "node:test";
import assert from "node:assert/strict";
import { Prisma, type InvoiceStatus } from "@prisma/client";
import { austinDay, invoiceCollectionState, summarizeCollections, matchesCollectionView } from "../lib/invoice-collections";
const decimal = (n: string) => new Prisma.Decimal(n);
const fixture = (id: string, status: InvoiceStatus = "SENT", dueDate: string | null = "2026-09-21", changes = {}) => ({ id,status,dueDate:dueDate?new Date(dueDate+"T00:00:00Z"):null,total:decimal("100.25"),amountPaid:decimal("0"),balanceDue:decimal("100.25"),payments:[],...changes });
test("calendar aging uses Austin today, date-only due dates and precise boundaries",()=>{
 assert.equal(austinDay(new Date("2026-09-22T03:00:00Z")),"2026-09-21");
 assert.equal(austinDay(new Date("2026-01-22T05:30:00Z")),"2026-01-21");
 const today="2026-09-21";
 for(const [date,aging] of [["2026-09-21","Current"],["2026-09-20","1–30 days"],["2026-08-22","1–30 days"],["2026-08-21","31–60 days"],["2026-07-23","31–60 days"],["2026-07-22","61–90 days"],["2026-06-23","61–90 days"],["2026-06-22","90+ days"]])assert.equal(invoiceCollectionState(fixture(date,"SENT",date),today).aging,aging);
 assert.equal(invoiceCollectionState(fixture("today"),today).overdue,false);
 assert.equal(invoiceCollectionState(fixture("7","SENT","2026-09-28"),today).upcoming,true);
 assert.equal(invoiceCollectionState(fixture("8","SENT","2026-09-29"),today).upcoming,false);
 assert.equal(invoiceCollectionState(fixture("no-date","SENT",null),today).aging,"No due date");
});
test("totals exclude draft, paid and void; receipt discrepancies rank ahead of collection",()=>{
 const paid = fixture("paid","PAID",null,{amountPaid:decimal("100.25"),balanceDue:decimal("0"),payments:[{status:"COMPLETED",amount:decimal("100.25")}]});
 const review=fixture("review","SENT",null,{amountPaid:decimal("20"),balanceDue:decimal("80.25"),payments:[{status:"PENDING",amount:decimal("20")}]});
 const invoices=[fixture("late","PARTIALLY_PAID","2026-09-01"),fixture("draft","DRAFT"),fixture("void","VOID"),paid,review];
 const summary=summarizeCollections(invoices,"2026-09-21");
 assert.equal(summary.outstanding.toFixed(2),"180.50");assert.equal(summary.overdue.toFixed(2),"100.25");assert.equal(summary.reviewCount,1);assert.equal(summary.queue[0].invoice.id,"review");
 assert.equal(summary.queue[0].state.nextAction,"Review receipts");assert.equal(matchesCollectionView(invoices[0],"overdue","2026-09-21"),true);
 assert.equal(invoiceCollectionState(fixture("credit","PAID",null,{balanceDue:decimal("-5")}),"2026-09-21").needsReview,true);
 assert.equal(invoiceCollectionState(fixture("bad-paid","PAID"),"2026-09-21").needsReview,true);
 const refunded=fixture("refunded","SENT",null,{payments:[{status:"REFUNDED",amount:decimal("100.25")}]});assert.equal(invoiceCollectionState(refunded).receipts.toFixed(2),"0.00");
 const conflict=invoiceCollectionState(fixture("wrong-client","SENT",null,{clientProfileId:"client-a",job:{clientProfileId:"client-b"}}));assert.equal(conflict.clientConflict,true);assert.equal(conflict.nextAction,"Review client links");assert.equal(conflict.needsReview,true);
});
