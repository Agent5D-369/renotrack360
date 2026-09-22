import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {PrismaClient} from '@prisma/client';
import {randomUUID,createHash} from 'node:crypto';
import {encode} from 'next-auth/jwt';
import {savePriceSnapshot} from '../lib/price-snapshot';
import {defaultBillingMilestones} from '../lib/billing-schedule';
async function main(){
 const cfg=JSON.parse(readFileSync('.preservation/media-http-env.json','utf8')),origin='http://localhost:3010';
 const target=new URL(cfg.DATABASE_URL);assert.ok(target.hostname==='127.0.0.1'&&target.pathname.startsWith('/flipside_restore_'));
 const db=new PrismaClient({datasources:{db:{url:cfg.DATABASE_URL}},log:[]});
 try{
  const owner=await db.user.findFirstOrThrow({where:{organizationId:'flipside-org',role:'OWNER',memberships:{some:{role:'OWNER',status:'ACTIVE'}}}});
  const client=await db.profile.create({data:{organizationId:'flipside-org',profileName:'Synthetic HTTP Client',profileType:'HOMEOWNER'}});
  const property=await db.property.create({data:{organizationId:'flipside-org',propertyAddress:'Synthetic test property',city:'Austin',state:'TX',zip:'78704',propertyType:'SINGLE_FAMILY_HOME'}});
  const quote=await db.quote.create({data:{organizationId:'flipside-org',quoteName:'Synthetic HTTP proposal',clientProfileId:client.id,propertyId:property.id}});
  const estimate=await db.estimate.create({data:{quoteId:quote.id,estimateNumber:randomUUID(),clientProfileId:client.id,propertyId:property.id,total:'1000',internalRiskNotes:'PRIVATE INTERNAL RISK TEST MARKER'}});
  const price=await savePriceSnapshot(db,owner.id,randomUUID(),{name:'Synthetic HTTP proposal price',basis:'Synthetic local material allowance for form proof.',materials:'600',fieldLabor:'0',subcontractors:'0',ownerFieldHours:'0',ownerFieldRate:'55',projectManagementHours:'0',projectManagementRate:'95',equipment:'0',protectionCleanup:'0',permitsDesign:'0',otherDirect:'0',riskPercent:'0',targetMarginPercent:'40'});
  const cookie='next-auth.session-token='+await encode({secret:cfg.NEXTAUTH_SECRET,token:{id:owner.id,sub:owner.id,email:owner.email}});
  const http=(route:string,options:RequestInit={})=>fetch(origin+route,{...options,redirect:'manual',headers:{...options.headers,cookie}});
  const decode=(s:string)=>s.replaceAll('&quot;','"').replaceAll('&#x27;',"'").replaceAll('&amp;','&');
  async function fields(route:string,marker:string){const r=await http(route);assert.equal(r.status,200);const html=await r.text();const form=html.match(/<form\b[\s\S]*?<\/form>/g)?.find(f=>f.includes(marker));assert.ok(form,marker);const data:Record<string,string>={};for(const tag of form.match(/<input\b[^>]*>/g)??[]){if(!tag.includes('type="hidden"'))continue;const name=/name="([^"]+)"/.exec(tag)?.[1],value=/value="([^"]*)"/.exec(tag)?.[1]??'';if(name)data[decode(name)]=decode(value);}return data;}
  async function post(route:string,values:Record<string,string|Blob>){const body=new FormData();Object.entries(values).forEach(([k,v])=>body.set(k,v));const r=await http(route,{method:'POST',body,headers:{origin}});assert.equal(r.status,303);const location=r.headers.get('location')!;assert.ok(!location.includes('error='),location);return location;}
  const route='/estimates/'+estimate.id+'/acceptance',pdf='%PDF-1.4\nSynthetic complete proposal\n%%EOF';
  await post(route,{...await fields(route,'name="file"'),file:new File([pdf],'synthetic-proposal.pdf',{type:'application/pdf'})});
  const file=await db.fileAsset.findFirstOrThrow({where:{entityType:'QUOTE',entityId:quote.id,mimeType:'application/pdf'}});
  await post(route,{...await fields(route,'name="ownerReviewed"'),priceSnapshotId:price.id,sourceFileId:file.id,ownerReviewed:'on',scope:'Synthetic client scope in retained contract document.',exclusions:'Synthetic exclusions in retained contract document.',allowances:'Synthetic allowances in retained contract document.',schedule:'Synthetic schedule assumptions in retained contract document.',paymentSchedule:'Synthetic payment schedule in retained contract document.',warranty:'Synthetic warranty terms in retained contract document.',billingMilestones:JSON.stringify(defaultBillingMilestones),requiredDeposit:'200'});
  const link=await db.clientApproval.findFirstOrThrow({where:{estimateId:estimate.id,approvalType:'ESTIMATE',status:'SENT'}}),api='/api/approve/'+link.token;
  const read=await fetch(origin+api);assert.equal(read.status,200);const raw=await read.text();assert.ok(!raw.includes('PRIVATE INTERNAL'));assert.ok(!raw.includes('priceSnapshotId'));assert.ok(!raw.includes('clientProfileId'));const content=JSON.parse(raw);assert.equal(content.total,1000);assert.equal(content.requiredDeposit,'200');assert.deepEqual(content.billingMilestones,defaultBillingMilestones);
  const doc=await fetch(origin+content.documentUrl);assert.equal(doc.status,200);assert.equal(createHash('sha256').update(Buffer.from(await doc.arrayBuffer())).digest('hex'),file.sha256);
  const decision={decision:'approved',signerName:'Synthetic HTTP Client',reviewed:true,reviewedDigest:content.reviewedDigest};
  for(let i=0;i<2;i++){const r=await fetch(origin+api,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(decision)});assert.equal(r.status,200);assert.equal((await r.json()).alreadyRecorded,i>0);}
  const location=await post(route,await fields(route,'Create job from accepted proposal'));assert.match(location,/\/jobs\/[^/]+\/financial-review/);
  const conversion=await db.estimateConversion.findFirstOrThrow({where:{acceptance:{estimateId:estimate.id}},include:{job:true}});assert.equal(conversion.job.contractAmount.toString(),'1000');assert.equal(conversion.job.amountPaid.toString(),'0');
  const review=await http(location);assert.equal(review.status,200);assert.ok((await review.text()).includes('Client-accepted proposal'));
  const reviewRoute=`/jobs/${conversion.job.id}/financial-review`,reviewPdf='%PDF-1.4\nSynthetic complete financial review\n%%EOF';
  await post(reviewRoute,{...await fields(reviewRoute,'name="file"'),file:new File([reviewPdf],'synthetic-financial-review.pdf',{type:'application/pdf'})});
  const reviewFile=await db.fileAsset.findFirstOrThrow({where:{entityType:'JOB',entityId:conversion.job.id,mimeType:'application/pdf'}});
  const baselineFields=await fields(reviewRoute,'name="reviewedDigest"');
  await post(reviewRoute,{...baselineFields,sourceFileId:reviewFile.id,requiredDeposit:'200',reviewReason:'Synthetic owner review confirms the retained contract, milestone schedule, and complete receipt ledger.',contractVerified:'on',receiptsComplete:'on'});
  assert.equal(await db.jobFinancialBaseline.count({where:{jobId:conversion.job.id}}),1);
  const billingRoute=`/jobs/${conversion.job.id}/billing`,billingPage=await http(billingRoute);assert.equal(billingPage.status,200);const billingHtml=await billingPage.text();assert.ok(billingHtml.includes('Accepted payment schedule'));assert.ok(billingHtml.includes('mobilization deposit'));
  const draftFields=await fields(billingRoute,`name="milestoneKey" value="${defaultBillingMilestones[0].key}"`);
  const draftValues={...draftFields,invoiceNumber:`MILESTONE-${estimate.id.slice(-8)}`,dueDate:'2026-10-15',reviewReason:'Synthetic owner review confirms the retained deposit trigger was reached from current project evidence.',triggerVerified:'on'};
  const firstDraft=await post(billingRoute,draftValues),secondDraft=await post(billingRoute,draftValues);assert.equal(firstDraft,secondDraft);assert.match(firstDraft,/\/invoices\/[^?]+\?flash=/);
  const milestone=await db.milestoneInvoiceDraft.findFirstOrThrow({where:{jobId:conversion.job.id},include:{invoice:{include:{payments:true}}}});assert.equal(await db.milestoneInvoiceDraft.count({where:{jobId:conversion.job.id}}),1);assert.equal(milestone.milestoneKey,defaultBillingMilestones[0].key);assert.equal(milestone.amount.toString(),'200');assert.equal(milestone.invoice.status,'DRAFT');assert.equal(milestone.invoice.total.toString(),'200');assert.equal(milestone.invoice.amountPaid.toString(),'0');assert.equal(milestone.invoice.payments.length,0);assert.equal(milestone.invoice.stripePaymentLink,null);
  assert.equal((await fetch(origin+route,{redirect:'manual'})).status,307);
  assert.equal((await fetch(origin+'/api/approve/'+'a'.repeat(64)+'/document')).status,409);
  writeFileSync('.preservation/proposal-local-http.json',JSON.stringify({verifiedAt:new Date().toISOString(),ownerUploadAndIssuance:true,clientPublicContentOnly:true,retainedBillingSchedule:true,exactPdf:true,clientApprovalRetry:true,ownerConversion:true,baselineEntry:true,milestoneDraftRetry:true,noAutomaticSendOrPayment:true,anonymousStaffDenied:true,syntheticEstimateId:estimate.id,syntheticJobId:conversion.job.id,syntheticInvoiceId:milestone.invoice.id},null,2));
  console.log('PASS: actual retained proposal schedule, client approval/retry, owner conversion, reviewed baseline and idempotent unsent milestone invoice draft.');
 }finally{await db.$disconnect();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
