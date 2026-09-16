import {validatePatReview} from './fresh-evidence.mjs';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {authorizePacket,pinned,safeFile,json,record,executionNow,isolatedChildEnvironment,SOURCE_ROOT,sha} from './execution-inputs.mjs';
import {runHelper} from './native-io.mjs';
import {verifyHistory,historyValue} from './accepted-history.mjs';
import {validateHandoff} from './postarm-handoff.mjs';
import {bindAllocation} from './safe-closure-inputs.mjs';
import {prepareServices,observePreparedRuntime} from './preparation-services.mjs';

export async function createPacketHooks(context,{out=()=>{}}={}){
 const root=context.root,now=()=>executionNow(context);
 return {
  now,
  authorize(at){return authorizePacket(root,{now:at});},
  async preflight(){
   // Code availability is only a local prerequisite, never Hosted acceptance.
   for(const name of ['stage-helper.mjs','run-closure.mjs'])assert.ok(fs.existsSync(path.join(SOURCE_ROOT,name)),'EXECUTION_INTEGRATION_INCOMPLETE');
   for(const name of ['history','baseline'])assert.ok(context.manifest[name],'FIXED_HISTORY_AND_BASELINE_REQUIRED');
   for(const name of ['history','baseline'])pinned(root,context.manifest[name]);
   assert.equal(context.manifest.costUSD,0);assert.equal(context.manifest.controllerWorker,'v-streamer-tools-gate1-recovery-controller-live');
   if(!context.local){
    for(const name of ['wrangler.live.json','existing-worker-baseline.json']){const d=context.manifest.files.find(d=>d.file===name);assert.ok(d,'CURRENT_OPERATION_INPUT_NOT_PINNED');pinned(root,d);}
    for(const name of ['previewBinding','recoveryBinding','previewApiInput','recoveryApiInput','localRuntime','handoff'])pinned(root,context.manifest[name]);
    const config=json(root+'/wrangler.live.json');assert.equal(config.name,context.manifest.controllerWorker);assert.equal(sha(config.account_id),context.manifest.accountSha256);assert.deepEqual(config.vars,{CONTROLLER_MODE:'disabled'});assert.deepEqual(config.observability,{enabled:false});assert.equal(config.main,'./worker.bundle.mjs');assert.equal(config.workers_dev,true);
    const bundle=context.manifest.files.find(d=>d.file==='worker.bundle.mjs');assert.ok(bundle);assert.equal(bundle.sha256,context.manifest.controllerBundleSha256);pinned(root,bundle);assert.equal(config.routes,undefined);assert.equal(config.triggers,undefined);
   }
   const history=historyValue(await verifyHistory(context)),baseline=json(pinned(root,context.manifest.baseline));
   assert.equal(baseline.previewStateSha256,history.previewStateSha256);assert.equal(baseline.namespaceSha256,history.namespaceSha256);assert.deepEqual(baseline.predecessor,history.predecessor);
   assert.ok(Object.keys(context.policy).every(k=>k==='sourceCommit'||context.policy[k]===history.policy[k]));
   return {ready:true};
  },
  allocate(clock){return bindAllocation(context,clock);},
  prepareServices(){return prepareServices(context,{out});},
  async assertPreparationStopped(){
   const previous=json(safeFile(root,'control/intake-0-closed.json'));assert.equal(previous.listeners,0);assert.equal(previous.accepting,false);
   try{process.kill(previous.ownerPid,0);assert.fail('PREVIOUS_INTAKE_STILL_RUNNING');}catch(error){assert.equal(error.code,'ESRCH','PREVIOUS_INTAKE_NOT_CONFIRMED_STOPPED');}
  },
  async prepare(){
   const {openIntake}=await import('./control/credential-intake.mjs');const intake=await openIntake(context,{out});await intake.closed;
   return {status:fs.existsSync(safeFile(root,'control/credentials-sealed.json'))?'CREDENTIALS_SEALED_PREPARATION_PENDING':'PREPARATION_INPUT_CLOSED',hostedEvidence:false};
  },
  async sealPreparation(){
   validateHandoff(context,now());validatePatReview(json(root+'/control/pat-scopes-reviewed.json'),json(root+'/control/credentials-sealed.json'),context,now());
   const ready=json(safeFile(root,'control/preparation-ready.json'));assert.equal(ready.manifestSha256,context.manifestSha256);
   assert.equal(ready.status,'PREPARATION_SERVICES_READY');assert.equal(ready.originalStartedAt,json(safeFile(root,'control/preparation-claimed.json')).startedAt);assert.ok(now()<ready.deadlineAt);
   const oauth=json(pinned(root,ready.oauth));assert.equal(oauth.status,'OAUTH_LOGIN_PROCESS_EXITED');assert.equal(oauth.exitCode,0);assert.equal(oauth.uiConsumed,true);assert.equal(oauth.listeners,0);assert.ok(oauth.completedAt<oauth.deadlineAt);
   const intake=json(safeFile(root,fs.existsSync(safeFile(root,'control/intake-1-closed.json'))?'control/intake-1-closed.json':'control/intake-0-closed.json'));assert.equal(intake.reason,'SEALED');assert.equal(intake.listeners,0);
   for(const pid of [oauth.processId,intake.ownerPid])try{process.kill(pid,0);assert.fail('PREPARATION_PROCESS_STILL_RUNNING');}catch(e){assert.equal(e.code,'ESRCH');}
   pinned(root,ready.runtime);const observed=await observePreparedRuntime(context);assert.ok(now()-observed.at<=30000);record(root,'control/runtime-admission.json',observed);
   const sealed=json(safeFile(root,'control/credentials-sealed.json'));assert.equal(sealed.manifestSha256,context.manifestSha256);pinned(root,sealed.credentials);
  },
  async execute(stage,clock){
   const helper=path.join(SOURCE_ROOT,'stage-helper.mjs');
   assert.ok(context.manifest.source.some(d=>path.resolve(SOURCE_ROOT,'../..',d.file)===helper),'HELPER_SOURCE_NOT_PINNED');
   await runHelper({executable:process.execPath,args:[helper,stage],cwd:root,env:isolatedChildEnvironment(context),input:JSON.stringify(clock),timeoutMs:Math.max(1,clock.deadlineAt-now()),
    onStarted:v=>record(root,`control/steps/${stage}-process.json`,v),onFailure:v=>record(root,`control/steps/${stage}-process-failed.json`,v),onStatus:out});
   return json(safeFile(root,`control/steps/${stage}-result.json`));
  },
  async verify(stage,result,clock){
   const {verifyStageResult}=await import('./stage-helper.mjs');await verifyStageResult(stage,result,context,clock,now());
  },
  async close(){const {closeRun}=await import('./run-closure.mjs');return closeRun(context);},
 };
}
