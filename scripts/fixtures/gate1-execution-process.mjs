import {observerFinished,readObserverControl} from '../gate1-execution/management-reader.mjs';
// Fixed local fixture process. No HTTP, DNS, CLI auth or service credentials.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {ROOT,authorizePacket,executionNow,json,record,sha} from '../gate1-execution/execution-inputs.mjs';
import {createBoundClient} from '../gate1-execution/postarm-handoff.mjs';
import {runCommandLoop} from '../gate1-execution/client-loop.mjs';
import {openControllerClientJournal} from '../lib/comment-translator-paid-core-v1-gate1-controller-client.mjs';
import {createRun,command,observe,claim,settle,tick,publicState,nextAction} from '../../workers/gate1-recovery-controller/core.mjs';
const c=authorizePacket(ROOT);assert.equal(c.local,true);const allocation=json(ROOT+'/control/allocation-claimed.json'),runtime=ROOT+'/runtime',now=()=>executionNow(c),mode=process.argv[2];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
if(mode==='observer'){
 record(ROOT,'runtime/preview-control.json',{runId:allocation.runId,sequence:0,command:'wait'});
 record(ROOT,'runtime/fixture-observer-ready.json',{runId:allocation.runId,processId:process.pid,baselineAccepted:true,stopEvidence:false,at:now()});
 while(!observerFinished(readObserverControl(runtime,'preview',allocation.runId),allocation.runId)&&now()<allocation.hardEndAt+600000)await sleep(50);
 record(ROOT,'runtime/fixture-observer-exited.json',{runId:allocation.runId,processId:process.pid,at:now()});
}else{
 assert.equal(mode,'client');fs.mkdirSync(runtime,{recursive:true});const base=json(ROOT+'/baseline.json'),scenario=json(ROOT+'/fixture-input.json');
 let remote=null;const journal=openControllerClientJournal(runtime,allocation.runId);
 const persist=()=>fs.writeFileSync(runtime+'/fixture-controller-state.json',JSON.stringify(remote));
 const manage=()=>{for(const role of ['preview','recovery'])observe(remote,role,{status:role==='preview'?'ACTIVE_HEALTHY':'INACTIVE',startedAt:now(),completedAt:now()},now());};
 const transport=async(route,body)=>{
  if(route==='/v1/arm'){remote=createRun(c.policy,body,now());manage();persist();if(scenario.armResponseUnknown)throw Error('LOCAL_SYNTHETIC_RESPONSE_LOST');}
  if(route==='/v1/command'){
   command(remote,body,now());manage();const op=remote.requested??nextAction(remote,now());
   if(op){claim(remote,op,now());settle(remote,op,scenario.mutationUnknown?'UNKNOWN':'ACCEPTED',now());manage();}
  }
  if(remote){manage();tick(remote,now());persist();}
  return {status:200,body:JSON.stringify(remote?publicState(remote):base.controllerState)};
 };
 const bindings=Object.fromEntries(['preview','recovery'].map(r=>[r,{sourceBindingSha256:sha('fixture-binding-'+r),observerSha256:sha('fixture-observer-'+r),bridgeSha256:sha('fixture-bridge')}]));
 const fresh=json(ROOT+'/fresh/approval.json');
 const client=createBoundClient({context:c,allocation,options:{runId:allocation.runId,sourceCommit:c.sourceCommit,predecessor:base.predecessor,hardEndAt:allocation.hardEndAt,manifestSha256:fresh.manifestSha256,approvedManifestSha256:fresh.manifestSha256,transport,journal,observerBindings:bindings,observeRecoveryStop:async()=>{throw Error('RECOVERY_NOT_USED_NO_FORMAL_PROOF');},stagePlan:{},now}});
 const session={client,runId:allocation.runId,close(){client.dispose();journal.close();}};
 record(ROOT,'runtime/identity.json',{runId:allocation.runId,sourceCommit:c.sourceCommit,hardEndAt:allocation.hardEndAt,manifestSha256:fresh.manifestSha256,packetManifestSha256:c.manifestSha256});
 await runCommandLoop({runtime,session,now,sleep,out:v=>console.log(JSON.stringify(v)),execute:async type=>{
  if(type==='arm')return client.start({sha256:sha(fs.readFileSync(ROOT+'/preservation.json')),verifiedAt:now()});
  if(type==='pause-preview')return client.pausePreview();
  assert.ok(['finish','abort'].includes(type),'FIXTURE_DOES_NOT_AUTOMATE_HOSTED');return {formalRecoveryStopAccepted:await client[type==='finish'?'finish':'stop']()};
 }});
}
