import fs from 'node:fs';
import assert from 'node:assert/strict';
import {json,pinned,safeFile,record,sha,executionNow} from './execution-inputs.mjs';
import {verifyHistory,historyValue,validateKnownClosure} from './accepted-history.mjs';
import {validateContent,validateNative,validateMetadata} from './fresh-evidence.mjs';
import {predecessorStateText} from '../../workers/gate1-recovery-controller/core.mjs';
import {verifyControllerStopProof} from '../lib/comment-translator-paid-core-v1-gate1-controller-proof.mjs';


function recordedProcesses(root){
 const ids=new Set();for(const folder of ['control','runtime']){const directory=safeFile(root,folder);if(!fs.existsSync(directory))continue;const files=fs.readdirSync(directory,{recursive:true}).filter(n=>n.endsWith('.json'));assert.ok(files.length<=256);
  for(const file of files){const row=json(safeFile(directory,file));for(const key of ['processId','ownerPid'])if(Number.isInteger(row[key])&&row[key]>0&&row[key]!==process.pid)ids.add(row[key]);}
 }return [...ids];
}
function requireStopped(ids){for(const pid of ids)try{process.kill(pid,0);assert.fail('OWNED_PROCESS_STILL_RUNNING');}catch(e){assert.equal(e.code,'ESRCH','OWNED_PROCESS_NOT_CONFIRMED_STOPPED');}}

export function closureRoute(root){
 const exists=leaf=>fs.existsSync(safeFile(root,leaf));
 let stage='PREPARATION';
 if(exists('control/allocation-claimed.json'))stage='ALLOCATED';
 for(const s of ['secrets','deploy-live','arm'])if(exists(`control/steps/${s}-claimed.json`))stage=s==='arm'?'ARM_SENT_OR_UNKNOWN':s==='secrets'?'SECRETS_SENT_OR_UNKNOWN':'DEPLOY_SENT_OR_UNKNOWN';
 return {stage,safeToDisable:false,automaticRetry:false,controllerAuthorityRetained:true,requiresIndependentClosure:true};
}

// Finalization only. Existing controller recovery, independent readbacks and
// operator-reviewed cleanup must have produced the current run's evidence.
// This entry neither creates a successful observation nor performs remote I/O.
export async function verifyClosingEnvironment(context){
 const root=context.root,now=executionNow(context),history=historyValue(await verifyHistory(context));
 const allocationFile=safeFile(root,'control/allocation-claimed.json'),allocation=fs.existsSync(allocationFile)?json(allocationFile):null;
 const input=json(safeFile(root,'control/closing-evidence.json'));
 assert.equal(input.manifestSha256,context.manifestSha256);assert.equal(input.approvalId,context.approval.approvalId);
 assert.equal(input.runId,allocation?.runId??null);assert.equal(input.hostedEvidence,!context.local);
 assert.ok(input.startedAt>=context.approval.authorizedAt&&input.completedAt>=input.startedAt&&input.completedAt<=now);
 const descriptors=[],read=name=>{const d=input[name];assert.ok(d,'CLOSURE_EVIDENCE_MISSING');assert.equal(descriptors.some(x=>x.file===d.file),false,'CLOSURE_DUPLICATE_INPUT');descriptors.push(d);return json(pinned(root,d));};
 const review=read('independentReview');assert.equal(review.manifestSha256,context.manifestSha256);assert.equal(review.approvalId,context.approval.approvalId);assert.equal(review.runId,input.runId);assert.equal(review.safeToDisable,true);assert.equal(review.nativeMutationInFlight,false);
 assert.ok(review.at>=input.startedAt&&review.at<=now);assert.deepEqual(review.evidenceSha256,[input.controller,input.content,input.native,input.metadata].map(d=>d.sha256));
 const content=read('content'),native=read('native'),metadata=read('metadata');
 for(const r of [content,native,metadata])assert.ok(r.startedAt>=input.startedAt&&r.completedAt>=r.startedAt&&r.completedAt<=review.at);
 validateContent(content,history);validateNative(native);validateMetadata(metadata,context.policy);
 const controller=read('controller');assert.ok([200,503].includes(controller.httpStatus));assert.equal(controller.complete,true);assert.ok(controller.at>=input.startedAt&&controller.at<=review.at);
 if(controller.httpStatus===503){
  assert.equal(controller.error,'DISABLED');assert.deepEqual(controller.state,history.state??history.controllerState);
  for(const stage of ['secrets','deploy-live','arm'])assert.equal(fs.existsSync(safeFile(root,'control/steps/'+stage+'-claimed.json')),false,'DISABLED_PREDECESSOR_NOT_PROVEN');
 }
 const state=controller.state;let ending,predecessor;
 if(state.runId===history.predecessor.runId){
  assert.deepEqual(state,history.state??history.controllerState);assert.equal(input.armRequests,0);assert.equal(input.hostedLifecycleRequests,0);
  assert.equal(fs.existsSync(safeFile(root,'control/steps/arm-claimed.json')),false,'ARM_OUTCOME_UNCONFIRMED');
  ending=allocation?'SETUP_CLOSED':'PREPARATION_CLOSED';predecessor=history.predecessor;
 }else{
  assert.ok(allocation,'UNALLOCATED_CURRENT_STATE');assert.equal(state.runId,allocation.runId);assert.equal(state.hardEndAt,allocation.hardEndAt);
  predecessor={runId:state.runId,sourceCommit:context.sourceCommit,stateSha256:sha(predecessorStateText(state))};ending=state.phase;
 }
 if(state.runId===allocation?.runId){
  // A caller cannot backdate the closing envelope to reuse pre-mutation data.
  const closingAt=state.cleanupEnd-600000;assert.ok(Number.isSafeInteger(closingAt)&&closingAt>=allocation.allocatedAt);
  for(const r of [content,native,metadata])assert.ok(r.startedAt>=closingAt,'CLOSING_READBACK_TOO_EARLY');assert.ok(controller.at>=closingAt);
 }
 const recoveryUsed=state.runId===allocation?.runId&&state.operations.recoveryResume.attempts===1;
 let formalRecoveryStopAccepted=false;
 if(recoveryUsed){
  const spec=read('formalProof'),j=pinned(root,spec.journal),terminal=pinned(root,spec.terminal);descriptors.push(spec.journal,spec.terminal);
  assert.equal(spec.expected.runId,allocation.runId);assert.equal(spec.expected.sourceCommit,context.sourceCommit);assert.equal(spec.expected.target,'recovery');
  const identity=json(safeFile(root,'runtime/identity.json'));assert.equal(identity.runId,allocation.runId);assert.equal(identity.hardEndAt,allocation.hardEndAt);assert.deepEqual(spec.expected,identity.identities.recovery);
  if(!context.local){assert.equal(spec.expected.observerSha256,context.manifest.source.find(d=>d.file==='scripts/gate1-execution/recovery-observer.mjs').sha256);assert.equal(spec.expected.bridgeSha256,context.manifest.source.find(d=>d.file==='scripts/gate1-execution/management-bridge.mjs').sha256);assert.equal(spec.expected.sourceBindingSha256,json(pinned(root,context.manifest.recoveryBinding)).bindingSha256);}
  assert.ok(spec.notBeforeAt>=input.startedAt);verifyControllerStopProof({journal:fs.readFileSync(j),terminal:fs.readFileSync(terminal),expected:spec.expected,notBeforeAt:spec.notBeforeAt,now});formalRecoveryStopAccepted=true;
 }
 requireStopped(recordedProcesses(root));
 return {root,now,history,allocation,input,descriptors,read,review,content,native,metadata,controller,state,ending,predecessor,recoveryUsed,formalRecoveryStopAccepted};
}
export async function closeRun(context){
 const {root,now,history,allocation,input,descriptors,read,review,state,ending,predecessor,recoveryUsed,formalRecoveryStopAccepted,controller}=await verifyClosingEnvironment(context);
 const worker=read('worker');assert.ok(worker.at>=review.at&&worker.at<=now);assert.equal(worker.namespaceSha256,history.namespaceSha256);assert.equal(worker.policyPreserved,true);
 assert.equal(worker.activeVersionConfirmed,true);assert.equal(worker.trafficPercentage,100);assert.equal(worker.mode,'disabled');assert.equal(worker.httpStatus,503);assert.equal(worker.complete,true);assert.equal(worker.error,'DISABLED');assert.deepEqual(worker.secretNames,['CONTROLLER_POLICY_JSON']);assert.match(worker.versionSha256,/^[a-f0-9]{64}$/);if(controller.httpStatus===503)assert.equal(worker.versionSha256,history.versionSha256);
 const sealed=read('credentials'),deletion=read('deletion'),revocation=read('revocation');
 assert.equal(sealed.manifestSha256,context.manifestSha256);assert.equal(deletion.manifestSha256,context.manifestSha256);assert.equal(deletion.remainingMatchingTokens,0);assert.equal(deletion.reviewedByPrimary,true);assert.match(deletion.imageSha256,/^[a-f0-9]{64}$/);assert.ok(deletion.at>=review.at&&deletion.at<=now);
 assert.deepEqual(deletion.roles.sort(),['configurationToken','controllerPat','metadataReadPat']);
 assert.equal(revocation.manifestSha256,context.manifestSha256);assert.ok(revocation.at>=deletion.at&&revocation.at<=now);
 assert.equal(revocation.rows.length,3);assert.deepEqual(revocation.rows.map(r=>r.role).sort(),['configurationToken','controllerPat','metadataReadPat']);
 const pats=revocation.rows.map(r=>{const inputs=sealed.inputs.filter(i=>i.role===r.role);assert.equal(inputs.length,1);assert.equal(r.inputSha256,inputs[0].inputSha256);assert.equal(r.httpStatus,401);assert.equal(r.complete,true);assert.equal(r.revoked,true);return {...r,deletionEvidenceMatched:true};});
 const oauth=read('oauth');assert.equal(oauth.loggedIn,false);assert.ok(oauth.at>=review.at&&oauth.at<=now);
 if(oauth.notStarted){assert.equal(fs.existsSync(safeFile(root,'control/oauth-login-claimed.json')),false);}else {assert.equal(oauth.revokeHttpStatus,200);assert.equal(oauth.logoutExitCode,0);}
 const owned=read('owned');assert.ok(owned.at>=review.at&&owned.at<=now);assert.equal(owned.independentReadback,true);assert.equal(owned.nativeMutationInFlight,false);assert.deepEqual(owned.remaining,{processes:0,listeners:0,containers:0,volumes:0});
 // Inspect the real recorded Windows processes as well as their result files.
 assert.ok(Array.isArray(owned.processIds)&&owned.processIds.length<=96);for(const pid of recordedProcesses(root))assert.ok(owned.processIds.includes(pid),'OWNED_PROCESS_COVERAGE_MISSING');
 requireStopped(owned.processIds);
 const expected={sourceSha256:sha(JSON.stringify(context.manifest.source)),namespaceSha256:history.namespaceSha256,parentClosureSha256:history.evidenceSha256,previewStateSha256:history.previewStateSha256,predecessor:history.predecessor};
 const receipt={kind:'GATE1_KNOWN_CLOSURE_V1',...expected,policy:context.policy,ending,runId:allocation?.runId??null,hardEndAt:allocation?.hardEndAt??null,closedAt:now,manifestSha256:context.manifestSha256,approvalId:context.approval.approvalId,hostedEvidence:!context.local,gate:'NO-GO',originalUnknownResolved:false,retry12:history.retry12,consumedRunsRetained:true,oldPatQueries:0,
  controllerState:state,state,predecessor,versionSha256:worker.versionSha256,environment:{previewStateSha256:history.previewStateSha256,tableCount:77,dbWrites:0,nativeApiAccepted:true,metadata:['ACTIVE_HEALTHY','INACTIVE','ACTIVE_HEALTHY']},worker:{httpStatus:503,complete:true,mode:'disabled',secretNames:['CONTROLLER_POLICY_JSON']},owned:owned.remaining,oauth,pats,recoveryUsed,formalRecoveryStopAccepted,armRequests:input.armRequests,hostedLifecycleRequests:input.hostedLifecycleRequests};
 validateKnownClosure(receipt,expected);
 const index=record(root,'control/closure-evidence.json',{kind:'GATE1_CLOSURE_INDEX_V1',manifestSha256:context.manifestSha256,approvalId:context.approval.approvalId,runId:receipt.runId,files:descriptors});
 receipt.evidence=index;const pin=record(root,'control/final-receipt.json',receipt);
 return {status:'RUN_SAFE_CLOSED',ending,runId:receipt.runId,receipt:pin,hostedEvidence:receipt.hostedEvidence,gate:'NO-GO'};
}
