import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {PrismaClient} from '@prisma/client';
import {issueEstimateApproval,readEstimateApproval,estimateApprovalDocument,decideEstimateApproval,convertAcceptedEstimate,ownedEstimate,estimateReviewDigest,nativeAcceptedContract} from '../lib/estimate-acceptance';
import {createPrivateAsset,storagePath} from '../lib/private-media';
import {savePriceSnapshot} from '../lib/price-snapshot';
import {adoptJobFinancialBaseline,jobFinanceReviewData,saveJobDetails} from '../lib/job-finance';
const db=new PrismaClient({log:[]}),url=new URL(process.env.DATABASE_URL!);
assert.ok(url.hostname==='127.0.0.1'&&url.pathname==='/flipside_migration_estimate-acceptance');
const root=path.resolve('.preservation','proposal-test-'+randomUUID()),actor={id:'proposal-owner',organizationId:'flipside-org'};
let priceId:string,clientId:string,propertyId:string;
before(async()=>{
 await mkdir(root,{recursive:true});
 await db.organization.createMany({data:[{id:'flipside-org',name:'Proposal fixture'},{id:'foreign-org',name:'Foreign fixture'}]});
 for(const [id,role,organizationId]of [[actor.id,'OWNER','flipside-org'],['proposal-admin','ADMIN','flipside-org'],['foreign-owner','OWNER','foreign-org']] as const)await db.user.create({data:{id,email:id+'@example.invalid',role,organizationId,memberships:{create:{organizationId,role,status:'ACTIVE'}}}});
 clientId=(await db.profile.create({data:{organizationId:'flipside-org',profileName:'Synthetic Client',profileType:'HOMEOWNER'}})).id;
 propertyId=(await db.property.create({data:{organizationId:'flipside-org',propertyAddress:'Synthetic test property',city:'Austin',state:'TX',zip:'78704',propertyType:'SINGLE_FAMILY_HOME'}})).id;
 priceId=(await savePriceSnapshot(db,actor.id,randomUUID(),{name:'Synthetic proposal price',basis:'Disposable proposal test material allowance.',materials:'600',fieldLabor:'0',subcontractors:'0',ownerFieldHours:'0',ownerFieldRate:'55',projectManagementHours:'0',projectManagementRate:'95',equipment:'0',protectionCleanup:'0',permitsDesign:'0',otherDirect:'0',riskPercent:'0',targetMarginPercent:'40'})).id;
});
after(()=>db.$disconnect());
async function fixture(){
 const quote=await db.quote.create({data:{organizationId:'flipside-org',quoteName:'Synthetic proposal',clientProfileId:clientId,propertyId}});
 const estimate=await db.estimate.create({data:{quoteId:quote.id,estimateNumber:randomUUID(),clientProfileId:clientId,propertyId,total:'1000',internalRiskNotes:'Never publish internal risk notes'}});
 const file=await createPrivateAsset(db,actor,{entityType:'QUOTE',entityId:quote.id,file:new File(['%PDF-1.4\nSynthetic proposal contract\n%%EOF'],'proposal.pdf',{type:'application/pdf'})},root);
 const input={requestId:randomUUID(),reviewedDigest:estimateReviewDigest(await ownedEstimate(db,estimate.id)),priceSnapshotId:priceId,sourceFileId:file.id,ownerReviewed:true,scope:'Synthetic client scope described in the retained document.',exclusions:'Synthetic exclusions described in the retained document.',allowances:'Synthetic allowances described in the retained document.',schedule:'Synthetic schedule described in the retained document.',paymentSchedule:'Synthetic payment terms described in the retained document.',warranty:'Synthetic warranty terms described in the retained document.',requiredDeposit:'100'};
 return {quote,estimate,file,input};
}
async function response(token:string,decision='approved') {return {decision,signerName:'Synthetic Client',reviewed:true,reviewedDigest:(await readEstimateApproval(db,token)).snapshot.contentDigest};}
test('issuance requires owner, exact reviewed price and owned PDF; retries, replacement, stale source and revoked issuer are enforced',async()=>{
 const a=await fixture(),b=await fixture();
 for(const [who,change]of [['proposal-admin',{}],['foreign-owner',{}],[actor.id,{sourceFileId:b.file.id}],[actor.id,{priceSnapshotId:'missing'}],[actor.id,{reviewedDigest:'a'.repeat(64)}],[actor.id,{requiredDeposit:'1001'}]] as const)await assert.rejects(()=>issueEstimateApproval(db,who,a.estimate.id,{...a.input,...change},root));
 const links=await Promise.all([1,2,3].map(()=>issueEstimateApproval(db,actor.id,a.estimate.id,a.input,root)));assert.equal(new Set(links.map(x=>x.id)).size,1);
 const next=await issueEstimateApproval(db,actor.id,a.estimate.id,{...a.input,requestId:randomUUID()},root);await assert.rejects(()=>readEstimateApproval(db,links[0].token),/expired/);
 assert.equal((await estimateApprovalDocument(db,next.token,root)).asset.id,a.file.id);
 await db.estimate.update({where:{id:a.estimate.id},data:{total:'999'}});await assert.rejects(()=>readEstimateApproval(db,next.token),/changed/);
 await db.estimate.update({where:{id:a.estimate.id},data:{total:'1000'}});
 await db.user.update({where:{id:actor.id},data:{role:'ADMIN'}});try{await assert.rejects(()=>readEstimateApproval(db,next.token),/current owner/);}finally{await db.user.update({where:{id:actor.id},data:{role:'OWNER'}});}
 const bytes=await readFile(storagePath(root,a.file.storageKey!));await writeFile(storagePath(root,a.file.storageKey!),'tampered');
 try{await assert.rejects(()=>estimateApprovalDocument(db,next.token,root));}finally{await writeFile(storagePath(root,a.file.storageKey!),bytes);}
});
test('client acceptance and owner conversion happen once at the retained price; baseline and later edits respect accepted terms',async()=>{
 const f=await fixture(),link=await issueEstimateApproval(db,actor.id,f.estimate.id,f.input,root),input=await response(link.token);
 await assert.rejects(()=>decideEstimateApproval(db,link.token,{...input,reviewedDigest:'a'.repeat(64)},root,null),/does not match/);
 await assert.rejects(()=>convertAcceptedEstimate(db,actor.id,f.estimate.id),/acceptance/);
 const decisions=await Promise.all([1,2,3].map(()=>decideEstimateApproval(db,link.token,input,root,null)));assert.equal(decisions.filter(r=>!r.alreadyRecorded).length,1);
 await assert.rejects(()=>decideEstimateApproval(db,link.token,{...input,decision:'declined'},root,null),/different response/);
 await assert.rejects(()=>convertAcceptedEstimate(db,'proposal-admin',f.estimate.id),/owner/);
 await db.estimate.update({where:{id:f.estimate.id},data:{total:'9999'}});
 const jobs=await Promise.all([1,2,3].map(()=>convertAcceptedEstimate(db,actor.id,f.estimate.id)));assert.equal(new Set(jobs.map(j=>j.id)).size,1);const job=jobs[0];
 assert.equal(job.contractAmount.toString(),'1000');assert.equal(job.amountPaid.toString(),'0');assert.equal(job.jobStatus,'PRE_CONSTRUCTION');
 assert.equal((await nativeAcceptedContract(db,job.id))?.requiredDeposit,'100');
 await assert.rejects(()=>saveJobDetails(db,actor.id,job.id,{...job,contractAmount:'999',amountPaid:'0'} as never),/retained client acceptance/);
 const pdf=await createPrivateAsset(db,actor,{entityType:'JOB',entityId:job.id,file:new File(['%PDF-1.4\nSynthetic reconciliation\n%%EOF'],'review.pdf',{type:'application/pdf'})},root);
 const baseline={requestId:randomUUID(),sourceFileId:pdf.id,reviewedDigest:(await jobFinanceReviewData(db,job.id,'flipside-org')).digest,requiredDeposit:'101',reviewReason:'Synthetic owner contract and receipt review only.',contractVerified:true,receiptsComplete:true};
 await assert.rejects(()=>adoptJobFinancialBaseline(db,actor.id,job.id,baseline,root),/client acceptance/);
 await adoptJobFinancialBaseline(db,actor.id,job.id,{...baseline,requiredDeposit:'100'},root);
 const accepted=await db.estimateAcceptance.findUniqueOrThrow({where:{estimateId:f.estimate.id}}),conversion=await db.estimateConversion.findUniqueOrThrow({where:{jobId:job.id}});
 for(const [table,id]of [['EstimateSnapshot',accepted.snapshotId],['EstimateAcceptance',accepted.id],['EstimateConversion',conversion.id]])await assert.rejects(()=>db.$executeRawUnsafe(`DELETE FROM "${table}" WHERE id=$1`,id),/immutable/);
 await assert.rejects(()=>db.job.delete({where:{id:job.id}}));
});
test('decline creates no acceptance; failed audit rolls acceptance and issuance back',async()=>{
 const f=await fixture(),link=await issueEstimateApproval(db,actor.id,f.estimate.id,f.input,root);
 await db.$executeRawUnsafe(`ALTER TABLE "AuditEvent" ADD CONSTRAINT proposal_test_block CHECK (action <> 'ESTIMATE_CLIENT_RESPONSE') NOT VALID`);
 try{await assert.rejects(async()=>decideEstimateApproval(db,link.token,await response(link.token),root,null));}finally{await db.$executeRawUnsafe('ALTER TABLE "AuditEvent" DROP CONSTRAINT proposal_test_block');}
 assert.equal(await db.estimateAcceptance.count({where:{estimateId:f.estimate.id}}),0);assert.equal((await readEstimateApproval(db,link.token)).approval.status,'SENT');
 await decideEstimateApproval(db,link.token,await response(link.token,'declined'),root,null);assert.equal(await db.estimateAcceptance.count({where:{estimateId:f.estimate.id}}),0);
 await assert.rejects(()=>convertAcceptedEstimate(db,actor.id,f.estimate.id),/acceptance/);
 const other=await fixture();await db.$executeRawUnsafe(`ALTER TABLE "AuditEvent" ADD CONSTRAINT proposal_issue_block CHECK (action <> 'ESTIMATE_APPROVAL_ISSUED') NOT VALID`);
 try{await assert.rejects(()=>issueEstimateApproval(db,actor.id,other.estimate.id,other.input,root));}finally{await db.$executeRawUnsafe('ALTER TABLE "AuditEvent" DROP CONSTRAINT proposal_issue_block');}
 assert.equal(await db.estimateSnapshot.count({where:{estimateId:other.estimate.id}}),0);
});
