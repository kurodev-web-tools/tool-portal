import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import {createHash} from 'node:crypto';
import {parseStrictJson} from './comment-translator-paid-core-v1-gate1-evidence.mjs';
import {assertControllerStopProof} from './comment-translator-paid-core-v1-gate1-controller-proof.mjs';
import {createManagedRehearsalExecutor} from './comment-translator-paid-core-v1-gate1-rehearsal-executor.mjs';
import {createManagedRehearsalConfiguration} from './comment-translator-paid-core-v1-gate1-rehearsal-configuration-executor.mjs';
import {LEASE_MS,predecessorStateText,validatePredecessor} from '../../workers/gate1-recovery-controller/core.mjs';

const SHA=/^[a-f0-9]{64}$/,COMMIT=/^[a-f0-9]{40}$/;
const final=s=>['RESTORED','ENDED_NO_MUTATION','NEEDS_OPERATOR'].includes(s?.phase);
const reasons=new Set(['WAITING_FOR_OPERATOR','OPERATOR_ABORT','OPERATOR_FINISH','CLOCK_REGRESSION','ABSOLUTE_DEADLINE','CLIENT_LIVENESS_EXPIRED','MUTATION_OUTCOME_UNKNOWN','CLEANUP_UNCONFIRMED']);
const hash=v=>createHash('sha256').update(v).digest('hex');
const reject=()=>{throw Error('CONTROLLER_CLIENT_REJECTED');};
const check=v=>{if(!v)reject();};
const millis=n=>Number.isSafeInteger(n)&&n>=0;
const exact=(o,keys)=>o!==null&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join(',')===[...keys].sort().join(',');

// A new process cannot resume a partially consumed client ledger. Preserve the
// entire directory after a crash; independent observation uses its own budget.
export function openControllerClientJournal(directory,runId){
 check(SHA.test(runId));const root=path.resolve(directory);
 for(let current=root;;current=path.dirname(current)){const s=fs.lstatSync(current);check(s.isDirectory()&&!s.isSymbolicLink());if(current===path.dirname(current))break;}
 const file=path.join(root,'client-'+runId+'.jsonl'),fd=fs.openSync(file,'wx+',0o600);let sequence=0,previous='0'.repeat(64),bytes=Buffer.alloc(0);
 return Object.freeze({append(payload){const base={sequence:sequence++,previousSha256:previous,payload};previous=hash(JSON.stringify(base));const next=Buffer.from(JSON.stringify({...base,sha256:previous})+'\n');fs.writeSync(fd,next);fs.fsyncSync(fd);bytes=Buffer.concat([bytes,next]);check(fs.readFileSync(file).equals(bytes));},close(){fs.closeSync(fd);}});
}

// The exact live origin is pinned by the reviewed execution manifest. There is
// no caller-supplied request URL, redirect following or automatic HTTP retry.
export function createControllerHttpsTransport({origin,operatorToken}){
 check(typeof origin==='string'&&/^https:\/\/v-streamer-tools-gate1-recovery-controller-live\.[a-z0-9-]+\.workers\.dev$/.test(origin)&&typeof operatorToken==='string'&&/^[A-Za-z0-9_-]{64,256}$/.test(operatorToken));
 return async(route,body,{signal}={})=>{
  check(['/v1/arm','/v1/command','/v1/state'].includes(route)&&(body===undefined)===(route==='/v1/state'));
  return new Promise((resolve,rejectPromise)=>{
   let done=false,request,timer,size=0;const chunks=[];
   const finish=(ok,value)=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);if(ok)resolve(value);else{chunks.length=0;request?.destroy();rejectPromise(Error('CONTROLLER_HTTP_REJECTED'));}};
   const abort=()=>finish(false);if(signal?.aborted){abort();return;}
   try{const postData=body===undefined?undefined:JSON.stringify(body);check(postData===undefined||Buffer.byteLength(postData)<=8192);
    request=https.request(origin+route,{method:postData===undefined?'GET':'POST',rejectUnauthorized:true,headers:{Authorization:'Bearer '+operatorToken,'Content-Type':'application/json',...(postData?{'Content-Length':Buffer.byteLength(postData)}:{})}},response=>{
     response.on('data',b=>{if(done)return;size+=b.length;if(size>16384){response.destroy();abort();}else chunks.push(b);});response.on('error',abort);
     response.on('end',()=>{if(!response.complete){abort();return;}finish(true,{status:response.statusCode,body:Buffer.concat(chunks).toString('utf8')});});
    });request.on('error',abort);timer=setTimeout(abort,body===undefined?5000:25000);signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted){abort();return;}request.end(postData);
   }catch{abort();}
  });
 };
}

// Internal transport/clock seams support local workerd acceptance. Approval and
// stage verifiers come from a frozen operator entrypoint, not HTTP input. This
// client never infers user authorization or issues a provider mutation itself.
export function createControllerClient({runId,sourceCommit,predecessor=null,hardEndAt,manifestSha256,approvedManifestSha256,transport,journal,observeRecoveryStop,observerBindings,stagePlan,now=Date.now,timers={setTimeout,clearTimeout}}){
 check(SHA.test(runId)&&COMMIT.test(sourceCommit)&&SHA.test(manifestSha256)&&manifestSha256===approvedManifestSha256&&millis(hardEndAt)&&hardEndAt>now()&&hardEndAt<=now()+1200000);
 check(typeof transport==='function'&&typeof journal?.append==='function'&&typeof observeRecoveryStop==='function'&&stagePlan&&typeof stagePlan==='object');
 const prior=predecessor===null?null:Object.freeze(validatePredecessor(predecessor));if(prior)check(prior.runId!==runId);
 const stages=Object.freeze({...stagePlan});for(const [name,verify] of Object.entries(stages))check(/^[a-z][a-z0-9-]{0,63}$/.test(name)&&typeof verify==='function');
 check(exact(observerBindings,['preview','recovery']));
 const observers=structuredClone(observerBindings);for(const binding of Object.values(observers))check(exact(binding,['sourceBindingSha256','observerSha256','bridgeSha256'])&&Object.values(binding).every(v=>typeof v==='string'&&SHA.test(v)));
 let state=null,postCount=0,getCount=0,normalGets=0,sequence=0,started=false,uncertain=false,closed=false,closeAttempted=false,ioBusy=false,working=false,pauseAt=null,stopPromise=null,monitorTimer,edgeTimer,lastNow=now();
 let active=null,ioIdle=Promise.resolve(),pendingSequence=null,localLeaseEnd=null;const usedStages=new Set(),usedDigests=new Set();
 const stamp=()=>{const value=now();if(!millis(value)||value<lastNow){uncertain=true;active?.abort();reject();}lastNow=value;return value;};
 const record=value=>journal.append({schemaVersion:1,runId,sourceCommit,at:stamp(),...value});
 function block(){closed=true;active?.abort();timers.clearTimeout(monitorTimer);timers.clearTimeout(edgeTimer);}
 const leaseDeadline=()=>Math.min(state.leaseEnd,localLeaseEnd,hardEndAt);
 function requireOpen(){check(started&&!closed&&!uncertain&&state?.phase==='ARMED'&&stamp()<leaseDeadline());}
 function acceptState(value,{unarmed=false,post=false,cleanup=false,requestStartedAt}={}){
  if(unarmed){
   if(prior){check(value?.runId===prior.runId&&hash(predecessorStateText(value))===prior.stateSha256);record({event:'PREDECESSOR_ACCEPTED',predecessor:prior});return value;}
   check(exact(value,['phase','gate','formalStopAccepted'])&&value.phase==='UNARMED'&&value.gate==='NO-GO'&&value.formalStopAccepted===false);return value;
  }
  check(exact(value,['runId','phase','reason','sequence','hardEndAt','leaseEnd','cleanupEnd','operations','projects','projectObservedAt','gate','formalStopAccepted']));
  check(value.runId===runId&&value.hardEndAt===hardEndAt&&millis(value.leaseEnd)&&value.leaseEnd<=hardEndAt&&Number.isSafeInteger(value.sequence)&&value.sequence>=sequence&&value.sequence<=sequence+1&&['ARMED','CLOSING','RESTORED','ENDED_NO_MUTATION','NEEDS_OPERATOR'].includes(value.phase)&&value.gate==='NO-GO'&&value.formalStopAccepted===false);
  check(value.cleanupEnd===null||millis(value.cleanupEnd));
  check(reasons.has(value.reason));
  check(post?value.sequence===pendingSequence:value.sequence===sequence||cleanup&&pendingSequence!==null&&value.sequence===pendingSequence);
  if(state&&!post&&value.sequence===sequence)check(value.leaseEnd===state.leaseEnd);
  check(exact(value.operations,['previewPause','recoveryResume','recoveryPause','previewResume'])&&Object.values(value.operations).every(o=>exact(o,['attempts','outcome'])&&[0,1].includes(o.attempts)&&(o.attempts===0?o.outcome===null:['PENDING','ACCEPTED','UNKNOWN'].includes(o.outcome))));
  // Observation timestamps use the controller clock. Its own freshness checks
  // and the independent stop proof supply authority, not a local-clock comparison.
  check(exact(value.projects,['preview','recovery'])&&Object.values(value.projects).every(s=>typeof s==='string'&&/^[A-Z_]{3,64}$/.test(s))&&exact(value.projectObservedAt,['preview','recovery'])&&Object.values(value.projectObservedAt).every(t=>t===null||millis(t)));
  if(state){check(value.leaseEnd>=state.leaseEnd);for(const op of Object.keys(value.operations))check(value.operations[op].attempts>=state.operations[op].attempts);}
  // An acknowledged command grants at most one lease from local dispatch time.
  // Reply latency and passive GETs cannot extend this conservative local bound.
  if(post)localLeaseEnd=Math.min(value.leaseEnd,requestStartedAt+LEASE_MS,hardEndAt);
  sequence=value.sequence;pendingSequence=null;state=value;if(state.phase!=='ARMED'||stamp()>=leaseDeadline())block();return structuredClone(value);
 }
 async function request(route,body,{cleanup=false,unarmed=false}={}){
  check(!ioBusy);const post=body!==undefined;
  if(post){check(postCount<(cleanup?32:31));postCount++;}else{check(getCount<96&&(cleanup||normalGets<64));getCount++;if(!cleanup)normalGets++;}
  // The fsync'd attempt survives response loss. A failure always stops work.
  const requestStartedAt=stamp();record({event:'HTTP_ATTEMPT',method:post?'POST':'GET',route,postCount,getCount,requestSha256:hash(body===undefined?'':JSON.stringify(body))});ioBusy=true;
  if(post)pendingSequence=route==='/v1/arm'?0:body.sequence;
  let resolveIdle,timer;ioIdle=new Promise(resolve=>{resolveIdle=resolve;});const controller=new AbortController();
  try{const response=await Promise.race([transport(route,body,{signal:controller.signal}),new Promise((_,rejectPromise)=>{timer=timers.setTimeout(()=>{controller.abort();rejectPromise(Error('CONTROLLER_HTTP_TIMEOUT'));},post?25000:5000);})]);check(Number.isInteger(response?.status)&&typeof response.body==='string'&&Buffer.byteLength(response.body)<=16384);
   record({event:'HTTP_RECEIPT',status:response.status,bodySha256:hash(response.body)});check(response.status===200);return acceptState(parseStrictJson(response.body),{unarmed,post,cleanup,requestStartedAt});
  }catch{uncertain=true;active?.abort();record({event:'HTTP_UNCONFIRMED',method:post?'POST':'GET',route});reject();}
  finally{timers.clearTimeout(timer);controller.abort();ioBusy=false;resolveIdle();}
 }
 async function refresh(cleanup=false){return request('/v1/state',undefined,{cleanup});}
 function schedule(){
  timers.clearTimeout(edgeTimer);timers.clearTimeout(monitorTimer);if(closed||!state)return;
  edgeTimer=timers.setTimeout(block,Math.max(1,leaseDeadline()-stamp()));
  monitorTimer=timers.setTimeout(async()=>{try{if(!ioBusy)await refresh();if(!closed)schedule();}catch{block();}},20000);
 }
 async function send(type,evidenceSha256,cleanup=false){
  if(!cleanup)requireOpen();const body={runId,sequence:sequence+1,type,...(evidenceSha256?{evidenceSha256}:{})};
  const next=body.sequence;const result=await request('/v1/command',body,{cleanup});check(result.sequence===next);if(!cleanup){requireOpen();schedule();}return result;
 }
 async function progress(stage,receipt){
  requireOpen();check(!usedStages.has(stage));const digest=hash(JSON.stringify({runId,sourceCommit,stage,receipt}));check(!usedDigests.has(digest));
  usedStages.add(stage);usedDigests.add(digest);record({event:'STAGE_ACCEPTED',stage,evidenceSha256:digest});return send('progress',digest);
 }
 async function start(preservation){
  check(!started&&!closed);check(exact(preservation,['sha256','verifiedAt'])&&SHA.test(preservation.sha256)&&millis(preservation.verifiedAt)&&preservation.verifiedAt<=stamp()&&stamp()-preservation.verifiedAt<=300000);
  started=true;record({event:'CLIENT_STARTED',manifestSha256,hardEndAt});
  await request('/v1/state',undefined,{unarmed:true});
  const result=await request('/v1/arm',{runId,sourceCommit,hardEndAt,preservationSha256:preservation.sha256,preservationVerifiedAt:preservation.verifiedAt,acknowledgeEmergencyContainment:true,...(prior?{predecessor:prior}:{})});
  check(result.sequence===0&&result.projects.preview==='ACTIVE_HEALTHY'&&result.projects.recovery==='INACTIVE'&&Object.values(result.operations).every(o=>o.attempts===0));requireOpen();schedule();return result;
 }
 async function pausePreview(){requireOpen();check(pauseAt===null);await refresh();requireOpen();pauseAt=stamp();return send('pause-preview');}
 async function resumeRecovery(proof){
  requireOpen();check(pauseAt!==null&&state.operations.previewPause.attempts===1&&state.operations.recoveryResume.attempts===0);
  check(proof?.runId===runId&&Object.entries(observers.preview).every(([k,v])=>proof[k]===v));
  assertControllerStopProof(proof,{target:'preview',sourceCommit,notBeforeAt:pauseAt,now:stamp()});
  await progress('preview-formal-stop',{evidenceSha256:proof.evidenceSha256,completedAt:proof.completedAt});
  requireOpen();check(state.projects.preview==='INACTIVE'&&state.projects.recovery==='INACTIVE');
  assertControllerStopProof(proof,{target:'preview',sourceCommit,notBeforeAt:pauseAt,now:stamp()});
  return send('resume-recovery',hash(JSON.stringify({runId,sourceCommit,stage:'recovery-resume-authority',evidenceSha256:proof.evidenceSha256})));
 }
 async function runStage(name,execute){
  requireOpen();check(!working&&!usedStages.has(name)&&Object.hasOwn(stages,name)&&typeof execute==='function'&&state.operations.recoveryResume.attempts===1);working=true;
  let timer;
  try{await refresh();requireOpen();active=new AbortController();const signal=active.signal;
   const limit=Math.min(60000,leaseDeadline()-stamp());check(limit>0);
   const raw=await Promise.race([Promise.resolve().then(()=>execute({signal,timeoutMs:limit,stop})),new Promise((_,rejectPromise)=>{
    signal.addEventListener('abort',()=>rejectPromise(Error('STAGE_ABORTED')),{once:true});timer=timers.setTimeout(()=>active?.abort(),limit);
   })]);requireOpen();check(!signal.aborted&&stages[name](raw)===true);
   const receipt={resultSha256:hash(JSON.stringify(raw)),completedAt:stamp()};await refresh();requireOpen();await progress(name,receipt);return raw;
  }catch{uncertain=true;active?.abort();await stop();reject();}
  finally{timers.clearTimeout(timer);active=null;working=false;}
 }
 async function close(type){
  check(started);block();if(closeAttempted)return state;closeAttempted=true;record({event:'CLOSE_ATTEMPT',type});
  await ioIdle;
  const latest=await refresh(true);if(final(latest))return latest;return send(type,undefined,true);
 }
 async function confirmClose(type){
  if(stopPromise)return stopPromise;block();const notBeforeAt=stamp();
  stopPromise=(async()=>{let timer;const controller=new AbortController();try{
   await close(type);const deadlineAt=Math.min(notBeforeAt+600000,state?.cleanupEnd??notBeforeAt+600000);check(deadlineAt>stamp());
   const proof=await Promise.race([observeRecoveryStop({notBeforeAt,sourceCommit,runId,deadlineAt,signal:controller.signal,observeState:()=>refresh(true)}),new Promise((_,rejectPromise)=>{timer=timers.setTimeout(()=>{controller.abort();rejectPromise(Error('STOP_PROOF_TIMEOUT'));},deadlineAt-stamp());})]);
   check(proof?.runId===runId&&Object.entries(observers.recovery).every(([k,v])=>proof[k]===v));assertControllerStopProof(proof,{target:'recovery',sourceCommit,notBeforeAt,now:stamp()});record({event:'RECOVERY_FORMAL_STOP_ACCEPTED',evidenceSha256:proof.evidenceSha256});return true;
  }catch{record({event:'RECOVERY_FORMAL_STOP_UNCONFIRMED'});return false;}finally{timers.clearTimeout(timer);controller.abort();}})();return stopPromise;
 }
 const stop=()=>confirmClose('abort');
 return Object.freeze({start,pausePreview,resumeRecovery,runStage,stop,finish:()=>confirmClose('finish'),state:()=>structuredClone(state),observeClosure:()=>refresh(true),dispose:block,budget:()=>({postCount,getCount,normalGets})});
}

// These adapters attach the existing real executors to the same cancellation
// signal and single abort/formal-proof hook. No direct pause/restore fallback.
export function runControllerConfiguration(client,name,change,options){
 return client.runStage(name,({signal,stop})=>createManagedRehearsalConfiguration({...options,configurationAttempt:{runId:client.state()?.runId,stage:name},signal,stop}).apply(change));
}
export function runControllerTransfer(client,packet,options,{assertFreshFixtures}){
 return client.runStage('synthetic-transfer',({signal,timeoutMs,stop})=>createManagedRehearsalExecutor(options,{stop}).run(packet,{signal,timeoutMs,assertFreshFixtures}));
}
