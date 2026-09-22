import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {PrismaClient} from '@prisma/client';
import {randomUUID} from 'node:crypto';
import {encode} from 'next-auth/jwt';
import sharp from 'sharp';
import {createPrivateAsset} from '../lib/private-media';
import {adoptJobFinancialBaseline,jobFinanceReviewData} from '../lib/job-finance';
import {adoptShowerPilot} from '../lib/work-item-version';
import {showerPilot,workItemDigest} from '../lib/work-item-pilot';
import {savePriceSnapshot} from '../lib/price-snapshot';
import {getOwnedPackage,packageProgress} from '../lib/work-package';
async function main(){
 const cfg=JSON.parse(readFileSync('.preservation/media-http-env.json','utf8')),origin='http://localhost:3010';
 const target=new URL(cfg.DATABASE_URL);assert.ok(target.hostname==='127.0.0.1'&&target.pathname.startsWith('/flipside_restore_'));
 const db=new PrismaClient({datasources:{db:{url:cfg.DATABASE_URL}},log:[]});
 try{
  const owner=await db.user.findFirstOrThrow({where:{organizationId:'flipside-org',role:'OWNER',memberships:{some:{role:'OWNER',status:'ACTIVE'}}}}),actor={id:owner.id,organizationId:'flipside-org'};
  const job=await db.job.create({data:{organizationId:'flipside-org',jobName:'Synthetic HTTP execution '+randomUUID(),contractAmount:'1000',amountPaid:'0',balanceDue:'1000'}});
  const phase=await db.renovationPhase.create({data:{jobId:job.id,phaseName:'Synthetic shower execution',phaseNumber:1}});
  const file=await createPrivateAsset(db,actor,{entityType:'JOB',entityId:job.id,file:new File(['%PDF-1.4\nSynthetic scope only\n%%EOF'],'synthetic-scope.pdf',{type:'application/pdf'})},cfg.PRIVATE_MEDIA_ROOT);
  await adoptJobFinancialBaseline(db,owner.id,job.id,{requestId:randomUUID(),sourceFileId:file.id,reviewedDigest:(await jobFinanceReviewData(db,job.id,'flipside-org')).digest,requiredDeposit:'100',reviewReason:'Synthetic local full document and receipt review.',contractVerified:true,receiptsComplete:true},cfg.PRIVATE_MEDIA_ROOT);
  const version=await adoptShowerPilot(db,owner.id,workItemDigest(showerPilot));
  const price=await savePriceSnapshot(db,owner.id,randomUUID(),{name:'Synthetic HTTP execution price',basis:'Synthetic local material allowance for form proof.',materials:'600',fieldLabor:'0',subcontractors:'0',ownerFieldHours:'0',ownerFieldRate:'55',projectManagementHours:'0',projectManagementRate:'95',equipment:'0',protectionCleanup:'0',permitsDesign:'0',otherDirect:'0',riskPercent:'0',targetMarginPercent:'40'});
  const cookie='next-auth.session-token='+await encode({secret:cfg.NEXTAUTH_SECRET,token:{id:owner.id,sub:owner.id,email:owner.email}});
  const http=(route:string,options:RequestInit={})=>fetch(origin+route,{...options,redirect:'manual',headers:{...options.headers,cookie}});
  const decode=(s:string)=>s.replaceAll('&quot;','"').replaceAll('&#x27;',"'").replaceAll('&amp;','&');
  async function fields(route:string,marker:string,index=0,stepId=""){const r=await http(route);assert.equal(r.status,200);const html=await r.text();const form=html.match(/<form\b[\s\S]*?<\/form>/g)?.filter(f=>f.includes(marker)&&(!stepId||f.includes(stepId)))[index];assert.ok(form,marker);const data:Record<string,string>={};for(const tag of form.match(/<input\b[^>]*>/g)??[]){if(!tag.includes('type="hidden"'))continue;const name=/name="([^"]+)"/.exec(tag)?.[1],value=/value="([^"]*)"/.exec(tag)?.[1]??'';if(name)data[decode(name)]=decode(value);}return data;}
  async function post(route:string,values:Record<string,string|Blob>,error=false){const body=new FormData();Object.entries(values).forEach(([k,v])=>body.set(k,v));const r=await http(route,{method:'POST',body,headers:{origin}});assert.equal(r.status,303);const location=r.headers.get('location')!;assert.equal(location.includes('error='),error,location);return location;}
  const route='/jobs/'+job.id+'/work-packages';
  const location=await post(route,{...await fields(route,'name="approvedScopeVerified"'),phaseId:phase.id,sourceLineRef:'Signed contract line 1',sourceFileId:file.id,workItemVersionId:version.id,priceSnapshotId:price.id,agreedAmount:'1000',approvedScopeVerified:'on',title:'Synthetic HTTP shower',area:'Primary bath',quantity:'1',unit:'shower',inclusions:'Synthetic matched shower installation only.',exclusions:'No steam installation included.',measurementNotes:'Synthetic measured dimensions and selected products.',installerName:'Synthetic Installer',installerQualifications:'Synthetic competence check for form proof only.',authorityRequirements:'Synthetic inspection requirements and responsibility.'});
  const packageId=/\/work-packages\/([^?]+)/.exec(location)![1],workRoute='/work-packages/'+packageId;
  const firstStep=(await getOwnedPackage(db,packageId)).steps[0].id;
  const firstReview=await fields(workRoute,'name="reviewedDigest"',0,firstStep);
  const fail=await post(workRoute,{...firstReview,outcome:'ACCEPTED',reason:'Synthetic review with missing evidence must fail.'},true);
  assert.ok((await (await http(fail)).text()).includes('Required evidence is missing'),fail);
  for(const requirementKey of ['site-plan','site-release'])await post(workRoute,{...await fields(workRoute,'name="requirementKey"'),requirementKey,notes:'Synthetic site dimensions, product selection and actual reviewer observation.',sourceFileId:''});
  await post(workRoute,{...await fields(workRoute,'name="reviewedDigest"',0,firstStep),outcome:'ACCEPTED',reason:'Synthetic human reviewed site release with no outstanding issue.'});
  assert.equal(packageProgress(await getOwnedPackage(db,packageId))[0].done,true);
  const image=await sharp({create:{width:2,height:2,channels:3,background:'#ffffff'}}).png().toBuffer();
  await post(workRoute,{...await fields(workRoute,'name="file"'),file:new File([new Uint8Array(image)],'synthetic-site.png',{type:'image/png'})});
  const photo=await db.fileAsset.findFirstOrThrow({where:{entityId:job.id,mimeType:'image/png'}});
  await post(workRoute,{...await fields(workRoute,'name="requirementKey"'),requirementKey:'substrate-photos',notes:'Synthetic substrate image linked to actual step for local proof.',sourceFileId:photo.id});
  assert.equal(packageProgress(await getOwnedPackage(db,packageId))[1].step.evidence.length,1);
  assert.equal((await fetch(origin+workRoute,{redirect:'manual'})).status,307);
  writeFileSync('.preservation/execution-local-http.json',JSON.stringify({verifiedAt:new Date().toISOString(),scopeForm:true,missingEvidenceDenied:true,humanReview:true,photoUploadAndStepLink:true,anonymousDenied:true,syntheticJobId:job.id},null,2));
  console.log('PASS: real scope mapping, missing-evidence alert, evidence/review forms, private image upload/link and anonymous denial.');
 }finally{await db.$disconnect();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});




