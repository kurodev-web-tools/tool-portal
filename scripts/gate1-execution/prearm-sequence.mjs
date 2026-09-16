import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {closureRoute} from './run-closure.mjs';
import {LIMITS,json,safeFile,record,sha} from './execution-inputs.mjs';

export const STAGES=Object.freeze(['identity','scope','controller','existing-version','preserve','bind-warm','preview-content','preview-native','metadata-first','metadata-second','grant','secrets','secret-version','deploy-live','live-version','client','observer','arm']);
export const RESERVES=Object.freeze({grant:90000,secrets:85000,'deploy-live':60000,client:20000,observer:15000,arm:5000});
export function preparationClock(approval,startedAt,now){
 assert.ok([startedAt,now].every(Number.isSafeInteger)&&startedAt>=approval.authorizedAt&&now>=startedAt,'CLOCK_REVERSED');
 const end=Math.min(startedAt+LIMITS.preparation,approval.expiresAt-LIMITS.reserve);
 assert.ok(now<end,'PREPARATION_EXPIRED');return end;
}
export function allocateClock(approval,preparedAt,now){
 preparationClock(approval,preparedAt,now);assert.ok(approval.expiresAt-now>=LIMITS.reserve,'APPROVAL_RESERVE');
 return Object.freeze({allocatedAt:now,freshStartedAt:now,freshDeadlineAt:now+LIMITS.fresh,hardEndAt:now+LIMITS.run});
}
export function admissionTime(clock,stage,now){
 assert.ok(Number.isSafeInteger(now)&&now>=clock.allocatedAt,'CLOCK_REVERSED');
 assert.equal(clock.freshStartedAt,clock.allocatedAt);assert.equal(clock.freshDeadlineAt,clock.allocatedAt+LIMITS.fresh);assert.equal(clock.hardEndAt,clock.allocatedAt+LIMITS.run);
 assert.ok(now<clock.freshDeadlineAt&&now<clock.hardEndAt,'FRESH_WINDOW_EXPIRED');
 assert.ok(clock.freshDeadlineAt-now>=(RESERVES[stage]??0),'INSUFFICIENT_ADMISSION_TIME');
}
export function validateBilling(rows,context,now){
 assert.ok(Array.isArray(rows)&&rows.length===2,'BILLING_COVERAGE');
 const expected=[['supabase',context.manifest.organizationSha256],['cloudflare',context.manifest.accountSha256]];
 for(const [service,target] of expected){const matches=rows.filter(r=>r.service===service);assert.equal(matches.length,1);const r=matches[0];
  assert.equal(r.targetSha256,target);assert.equal(r.method,'OPERATOR_IMAGE_REVIEWED_BY_PRIMARY');
  assert.ok(Number.isSafeInteger(r.capturedAt)&&r.capturedAt>=context.approval.authorizedAt&&r.capturedAt<=now&&now-r.capturedAt<=LIMITS.billing,'BILLING_EXPIRED');
  assert.ok(Number.isSafeInteger(r.reviewedAt)&&r.reviewedAt>=r.capturedAt&&r.reviewedAt<=now);assert.equal(r.contradiction,false);assert.equal(r.settingsChanged,false);assert.match(r.imageSha256??'',/^[a-f0-9]{64}$/);
  assert.equal(r.free,true);if(service==='supabase')assert.equal(r.spendCapEnabled,true);else {assert.equal(r.priceUSD,0);assert.equal(r.dailyRequests,100000);}
 }
}
export async function runPrearm({context,hooks,mode,now=Date.now}){
 const root=context.root,at=()=>{const n=now();assert.ok(Number.isSafeInteger(n)&&n>=last,'CLOCK_REVERSED');last=n;return n;};let last=context.approval.authorizedAt,stage=null,allocated=null,started=false;
 try{
  await hooks.preflight();at();
  if(mode==='--prepare'){
   const file=safeFile(root,'control/preparation-claimed.json');let preparation;
   if(fs.existsSync(file)){
    preparation=json(file);preparationClock(context.approval,preparation.startedAt,at());
    assert.equal(preparation.manifestSha256,context.manifestSha256);await hooks.assertPreparationStopped();
    record(root,'control/preparation-resumed.json',{at:at(),originalStartedAt:preparation.startedAt,allowance:1});
   }else {preparation={startedAt:at(),manifestSha256:context.manifestSha256};record(root,'control/preparation-claimed.json',preparation);}
   const deadlineAt=preparationClock(context.approval,preparation.startedAt,at());
   return await hooks.prepare({startedAt:preparation.startedAt,deadlineAt});
  }
  if(mode==='--close')return await hooks.close();
  if(mode==='--prepare-services')return await hooks.prepareServices();
  assert.equal(mode,'--execute');const preparation=json(safeFile(root,'control/preparation-claimed.json'));
  assert.equal(preparation.manifestSha256,context.manifestSha256);preparationClock(context.approval,preparation.startedAt,at());
  validateBilling(json(safeFile(root,'control/billing-reviewed.json')),context,at());
  await hooks.sealPreparation({now:at(),deadlineAt:preparationClock(context.approval,preparation.startedAt,at())});
  const before=at();validateBilling(json(safeFile(root,'control/billing-reviewed.json')),context,before);
  allocated={...allocateClock(context.approval,preparation.startedAt,before),runId:randomBytes(32).toString('hex'),manifestSha256:context.manifestSha256};
  // An existing claim is consumed even if the old process died before a receipt.
  record(root,'control/allocation-claimed.json',allocated);started=true;
  await hooks.allocate(allocated);
  for(stage of STAGES){
   await hooks.authorize(at());admissionTime(allocated,stage,at());
   const claim={stage,at:at(),runId:allocated.runId,hardEndAt:allocated.hardEndAt,freshDeadlineAt:allocated.freshDeadlineAt,manifestSha256:context.manifestSha256};
   const descriptor=record(root,'control/steps/'+stage+'-claimed.json',claim);
   const result=await hooks.execute(stage,{...allocated,deadlineAt:allocated.freshDeadlineAt,claimSha256:descriptor.sha256});
   // Reserve is a before-start budget. Completion must still be fresh, but
   // must not demand the same unspent stage budget for a second time.
   admissionTime(allocated,null,at());await hooks.verify(stage,result,allocated);
   record(root,'control/steps/'+stage+'-verified.json',{...claim,completedAt:at(),resultSha256:sha(JSON.stringify(result))});
  }
  return {status:'ARM_RECEIPT_VERIFIED',...allocated,completedAt:at(),hostedEvidence:false,remainingRunMs:allocated.hardEndAt-at()};
 }catch(error){
  const known=['PREPARATION_EXPIRED','APPROVAL_RESERVE','FRESH_WINDOW_EXPIRED','INSUFFICIENT_ADMISSION_TIME','CLOCK_REVERSED','BILLING_EXPIRED'];
  const reason=known.includes(error.message)?error.message:error.code==='EEXIST'?'CLAIM_ALREADY_CONSUMED':'REQUIRED_EVIDENCE_UNCONFIRMED';
  const result={closure:closureRoute(root),status:mode==='--close'?'CLOSURE_NOT_ACCEPTED':started?'FORWARD_STOP_REQUIRES_CLOSURE':'PREPARATION_NOT_ACCEPTED',stage,reason,at:now(),allocated,automaticRetry:false,deadlineRenewed:false,hostedEvidence:false,...(context.local?{fixtureFailure:error.message}:{})};
  // A second caller must not replace the first caller's evidence.
  if(started&&!fs.existsSync(path.join(root,'control/forward-stop.json')))record(root,'control/forward-stop.json',result);
  return result;
 }
}
