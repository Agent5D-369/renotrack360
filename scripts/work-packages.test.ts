import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {PrismaClient} from '@prisma/client';
import {adoptScopePackage,scopeReviewState,getOwnedPackage,packageProgress,submitStepEvidence,reviewWorkStep,setReviewedPhaseStatus,phaseWithPackageEvidence} from '../lib/work-package';
import {adoptJobFinancialBaseline,jobFinanceReviewData} from '../lib/job-finance';
import {createPrivateAsset,storagePath} from '../lib/private-media';
import {adoptShowerPilot} from '../lib/work-item-version';
import {showerPilot,workItemDigest} from '../lib/work-item-pilot';
import {savePriceSnapshot} from '../lib/price-snapshot';
const db=new PrismaClient({log:[]}),url=new URL(process.env.DATABASE_URL!);
assert.ok(url.hostname==='127.0.0.1'&&url.pathname==='/flipside_migration_work-packages');
const root=path.resolve('.preservation','execution-test-'+randomUUID()),actor={id:'execution-owner',organizationId:'flipside-org'};
let priceId:string,versionId:string;
before(async()=>{
 await mkdir(root,{recursive:true});
 await db.organization.createMany({data:[{id:'flipside-org',name:'Execution fixture'},{id:'foreign-org',name:'Foreign fixture'}]});
 for(const [id,role,organizationId]of [[actor.id,'OWNER','flipside-org'],['execution-admin','ADMIN','flipside-org'],['foreign-owner','OWNER','foreign-org']] as const)await db.user.create({data:{id,email:id+'@example.invalid',role,organizationId,memberships:{create:{organizationId,role,status:'ACTIVE'}}}});
 versionId=(await adoptShowerPilot(db,actor.id,workItemDigest(showerPilot))).id;
 priceId=(await savePriceSnapshot(db,actor.id,randomUUID(),{name:'Synthetic execution price',basis:'Disposable execution test material allowance.',materials:'600',fieldLabor:'0',subcontractors:'0',ownerFieldHours:'0',ownerFieldRate:'55',projectManagementHours:'0',projectManagementRate:'95',equipment:'0',protectionCleanup:'0',permitsDesign:'0',otherDirect:'0',riskPercent:'0',targetMarginPercent:'40'})).id;
});
after(()=>db.$disconnect());
async function fixture(){
 const job=await db.job.create({data:{organizationId:'flipside-org',jobName:'Synthetic execution '+randomUUID(),contractAmount:'1000',amountPaid:'0',balanceDue:'1000'}});
 const phase=await db.renovationPhase.create({data:{jobId:job.id,phaseNumber:1,phaseName:'Synthetic shower work'}});
 const file=await createPrivateAsset(db,actor,{entityType:'JOB',entityId:job.id,file:new File(['%PDF-1.4\nSynthetic accepted scope\n%%EOF'],'scope.pdf',{type:'application/pdf'})},root);
 await adoptJobFinancialBaseline(db,actor.id,job.id,{requestId:randomUUID(),sourceFileId:file.id,reviewedDigest:(await jobFinanceReviewData(db,job.id,'flipside-org')).digest,requiredDeposit:'100',reviewReason:'Synthetic full contract and receipt review only.',contractVerified:true,receiptsComplete:true},root);
 const input={requestId:randomUUID(),phaseId:phase.id,sourceLineRef:'Contract line 1',sourceFileId:file.id,workItemVersionId:versionId,priceSnapshotId:priceId,reviewedDigest:(await scopeReviewState(db,job.id)).digest,agreedAmount:'1000',approvedScopeVerified:true,title:'Synthetic curbed shower',area:'Primary bath',quantity:'1',unit:'shower',inclusions:'Matched system and exact synthetic scope only.',exclusions:'No steam installation included.',measurementNotes:'Synthetic measured shower dimensions and product record.',installerName:'Synthetic Installer',installerQualifications:'Synthetic reviewer competence statement for test only.',authorityRequirements:'Synthetic site inspection requirements; no actual approval.'};
 return {job,phase,file,input};
}
test('scope adoption binds reviewed contract, owned files, template and price; concurrent retry creates one package',async()=>{
 const a=await fixture(),b=await fixture();
 for(const [who,change]of [['execution-admin',{}],['foreign-owner',{}],[actor.id,{phaseId:b.phase.id}],[actor.id,{sourceFileId:b.file.id}],[actor.id,{priceSnapshotId:'missing'}],[actor.id,{workItemVersionId:'missing'}],[actor.id,{agreedAmount:'999'}],[actor.id,{reviewedDigest:'a'.repeat(64)}]] as const)await assert.rejects(()=>adoptScopePackage(db,who,a.job.id,{...a.input,...change},root));
 const bytes=await readFile(storagePath(root,a.file.storageKey!));await writeFile(storagePath(root,a.file.storageKey!),'tampered');
 await assert.rejects(()=>adoptScopePackage(db,actor.id,a.job.id,a.input,root));await writeFile(storagePath(root,a.file.storageKey!),bytes);
 const packages=await Promise.all([1,2,3].map(()=>adoptScopePackage(db,actor.id,a.job.id,a.input,root)));
 assert.equal(new Set(packages.map(p=>p.id)).size,1);const work=await getOwnedPackage(db,packages[0].id);
 assert.deepEqual(work.steps.map(s=>s.templateKey),showerPilot.steps.map(s=>s.key));assert.equal(work.scopeItem.workItemVersionId,versionId);
 await assert.rejects(async()=>adoptScopePackage(db,actor.id,a.job.id,{...a.input,requestId:randomUUID(),sourceLineRef:'Line 2',reviewedDigest:(await scopeReviewState(db,a.job.id)).digest},root),/exceed/);
 for(const [table,id]of [['ScopeItem',work.scopeItem.id],['WorkPackage',work.id],['WorkStepInstance',work.steps[0].id]])await assert.rejects(()=>db.$executeRawUnsafe(`DELETE FROM "${table}" WHERE id=$1`,id),/immutable/);
 assert.equal((await db.job.findUniqueOrThrow({where:{id:a.job.id}})).contractAmount.toString(),'1000');
});
test('required evidence and ordered human reviews gate completion; reopening invalidates downstream acceptance',async()=>{
 const f=await fixture(),pkg=await adoptScopePackage(db,actor.id,f.job.id,f.input,root);
 const state=async()=>packageProgress(await getOwnedPackage(db,pkg.id));
 const review=async(index:number,outcome='ACCEPTED',who=actor.id)=>{const s=(await state())[index];return reviewWorkStep(db,who,pkg.id,s.step.id,{requestId:randomUUID(),reviewedDigest:s.reviewDigest,outcome,reason:'Synthetic human review with observed findings and result.'},root);};
 await assert.rejects(()=>review(0),/missing/);await assert.rejects(()=>review(1),/Prior/);await assert.rejects(()=>review(0,'NOT_APPLICABLE'),/conditional/);
 await assert.rejects(()=>setReviewedPhaseStatus(db,actor.id,f.job.id,f.phase.id,'COMPLETE'),/evidence/);
 const image=await sharp({create:{width:2,height:2,channels:3,background:'#ffffff'}}).png().toBuffer();
 const photo=await createPrivateAsset(db,actor,{entityType:'JOB',entityId:f.job.id,file:new File([new Uint8Array(image)],'synthetic.png',{type:'image/png'})},root);
 for(let i=0;i<showerPilot.steps.length;i++){
  const s=(await state())[i];
  if(s.definition.condition){await review(i,'NOT_APPLICABLE');continue;}
  for(const req of s.definition.evidence){
   const input={requestId:randomUUID(),requirementKey:req.key,notes:'Synthetic observed measurements, dates and responsible person.',sourceFileId:req.kind==='PHOTO'?photo.id:''};
   if(req.kind==='PHOTO')await assert.rejects(()=>submitStepEvidence(db,actor.id,pkg.id,s.step.id,{...input,sourceFileId:''},root),/photo/);
   const evidence=await submitStepEvidence(db,actor.id,pkg.id,s.step.id,input,root);
   assert.equal((await submitStepEvidence(db,actor.id,pkg.id,s.step.id,input,root)).id,evidence.id);
  }
  await assert.rejects(()=>review(i,'ACCEPTED','execution-admin'),/owner/);
  await review(i);
 }
 assert.ok((await state()).every(s=>s.done));await setReviewedPhaseStatus(db,actor.id,f.job.id,f.phase.id,'COMPLETE');
 const prior=(await state())[0];await review(0,'BLOCKED','execution-admin');assert.ok((await state()).every(s=>!s.done));
 assert.equal(phaseWithPackageEvidence('COMPLETE',[await getOwnedPackage(db,pkg.id)]),'BLOCKED');
 await assert.rejects(()=>reviewWorkStep(db,actor.id,pkg.id,prior.step.id,{requestId:randomUUID(),reviewedDigest:prior.reviewDigest,outcome:'ACCEPTED',reason:'Stale synthetic review must not overwrite the block.'},root),/changed/);
 await review(0);assert.equal((await state())[1].done,false);
});
test('audit failure rolls scope creation back atomically',async()=>{
 const f=await fixture();await db.$executeRawUnsafe(`ALTER TABLE "AuditEvent" ADD CONSTRAINT execution_test_block CHECK (action <> 'ACCEPTED_SCOPE_MAPPED') NOT VALID`);
 try{await assert.rejects(()=>adoptScopePackage(db,actor.id,f.job.id,f.input,root));}finally{await db.$executeRawUnsafe('ALTER TABLE "AuditEvent" DROP CONSTRAINT execution_test_block');}
 assert.equal(await db.scopeItem.count({where:{jobId:f.job.id}}),0);
});

