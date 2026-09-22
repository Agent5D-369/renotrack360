import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";
import { flipsideInvoiceWhere } from "../lib/financial-record-scope";
async function main() {
 const cfg=JSON.parse(readFileSync(".preservation/media-http-env.json","utf8")), origin="http://localhost:3010";
 const target=new URL(cfg.DATABASE_URL);assert.ok(target.hostname==="127.0.0.1"&&target.pathname.startsWith("/flipside_restore_"));
 const db=new PrismaClient({datasources:{db:{url:cfg.DATABASE_URL}},log:[]});
 try {
  const owner=await db.user.findFirstOrThrow({where:{organizationId:"flipside-org",role:"OWNER",memberships:{some:{role:"OWNER",status:"ACTIVE"}}}});
  const cookie="next-auth.session-token="+await encode({secret:cfg.NEXTAUTH_SECRET,token:{id:owner.id,sub:owner.id,email:owner.email}});
  const get=async(route:string)=>{const r=await fetch(origin+route,{headers:{cookie},redirect:"manual"});assert.equal(r.status,200,route);return r.text();};
  const html=await get("/invoices");for(const text of ["Invoices &amp; collections","Next actions","Balance aging","Receipt review"])assert.ok(html.includes(text),text);
  const invoice=await db.invoice.findFirstOrThrow({where:flipsideInvoiceWhere});
  const search=await get("/invoices?q="+encodeURIComponent(invoice.invoiceNumber));assert.ok(search.includes(invoice.invoiceNumber));
  const none=await get("/invoices?q=nonexistent-invoice-collection-fixture");assert.ok(none.includes("No invoices match this view"));
  const sent=await get("/invoices?status=SENT");assert.ok(sent.includes("Saved status:"));
  const articles=sent.match(/<article\b[\s\S]*?<\/article>/g)??[];for(const article of articles)assert.ok(!article.includes("Partially Paid"));
  for(const view of ["overdue","upcoming","review","drafts","paid"])await get("/invoices?view="+view);
  const detail=await get("/invoices/"+invoice.id);assert.ok(detail.includes('id="receipt-review"'));assert.ok(detail.includes("Completed receipt records"));
  const payment=await get("/payments/new?invoiceId="+invoice.id);assert.ok(payment.includes(`selected="" value="${invoice.id}"`)||payment.includes(`value="${invoice.id}" selected=""`));
  const invalid=await get("/payments/new?invoiceId=foreign-nonexistent");assert.ok(!invalid.includes('value="foreign-nonexistent"'));
  assert.equal((await fetch(origin+"/invoices",{redirect:"manual"})).status,307);
  writeFileSync(".preservation/collections-local-http.json",JSON.stringify({verifiedAt:new Date().toISOString(),overview:true,search:true,filters:true,emptyState:true,receiptDetail:true,ownedInvoicePreselected:true,unknownSelectionIgnored:true,anonymousDenied:true,readOnly:true},null,2));
  console.log("PASS: collections overview/search/filters, receipt detail and owned preselected payment handoff; no business writes.");
 } finally {await db.$disconnect();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
