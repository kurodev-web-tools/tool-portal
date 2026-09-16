import assert from 'node:assert/strict';
import path from 'node:path';
import {readPinnedSafeClosureJson} from '../lib/comment-translator-paid-core-v1-gate1-safe-closure.mjs';
import {predecessorStateText,validatePredecessor} from '../../workers/gate1-recovery-controller/core.mjs';
import {previewUnknownClosureStateText} from '../../workers/gate1-recovery-controller/safe-closure.mjs';
import {REPOSITORY,sha,pinned,json} from './execution-inputs.mjs';

// Reviewed once against the accepted final receipt/index/audit. Never refreshed
// from live bytes at admission. Raw tokens and the old credential files are not read.
export const ACCEPTED_HISTORY_ANCHOR=Object.freeze({
 receipt:Object.freeze({file:'.tmp/gate1-live-execution-20260915-retry14/control/final-receipt.json',bytes:5398,sha256:'8f3b5ee52f0b8d1b27b8777812b979e5f7a5a74f9594ce7489cabdae27818614'}),
 index:Object.freeze({file:'.tmp/gate1-live-execution-20260915-retry14/control/closure-evidence.json',bytes:35702,sha256:'a49c9e1b26580fc2a590dc754d54def7d180532709f2b12f7bf1d8560bd5f770'}),
 audit:Object.freeze({file:'.tmp/gate1-live-execution-20260915-retry14/control/primary-final-audit.json',bytes:2305,sha256:'07854ebb26bc30cfbdb96f349c9d3b48be89f6c461d3ad9d9ec26c442eeba40d'}),
});
const proofs=new WeakMap();
function brand(value){const out=Object.freeze({kind:'GATE1_FIXED_HISTORY_VERIFIED',evidenceSha256:value.evidenceSha256});proofs.set(out,structuredClone(value));return out;}
export function historyValue(proof){const value=proofs.get(proof);assert.ok(value,'VERIFIED_HISTORY_REQUIRED');return structuredClone(value);}
export async function readInitialHistory(root=REPOSITORY){
 const read=descriptor=>readPinnedSafeClosureJson({root,descriptor});
 const receipt=await read(ACCEPTED_HISTORY_ANCHOR.receipt),index=await read(ACCEPTED_HISTORY_ANCHOR.index),audit=await read(ACCEPTED_HISTORY_ANCHOR.audit);
 assert.equal(receipt.closureEvidenceSha256,ACCEPTED_HISTORY_ANCHOR.index.sha256);assert.equal(receipt.verification.audit.sha256,ACCEPTED_HISTORY_ANCHOR.audit.sha256);
 assert.equal(receipt.status,'PREALLOCATION_UI_FAILED_CREDENTIAL_CONTINUATION_SAFE_CLOSED');assert.equal(receipt.scopeClosed,true);assert.equal(receipt.closure.safeClosureAccepted,true);
 assert.equal(receipt.acceptance.gate1,'NO_GO');assert.equal(receipt.limits.originalPauseUnknownResolved,false);assert.equal(audit.externalVerification.inheritedPatComplete401,3);
 const indexed=async leaf=>{const file='.tmp/gate1-live-execution-20260915-retry14/'+leaf;const matches=index.files.filter(d=>d.file===file);assert.equal(matches.length,1,'INDEX_COVERAGE');return read(matches[0]);};
 const baseline=await indexed('existing-worker-baseline.json'),predecessor=await indexed('predecessor.json'),state=await indexed('predecessor-state.json');
 validatePredecessor(predecessor);assert.equal(sha(previewUnknownClosureStateText(state)),predecessor.stateSha256);assert.equal(predecessor.stateSha256,baseline.predecessorStateSha256);
 assert.equal(baseline.namespaceSha256,receipt.closure.namespaceSha256);assert.equal(sha(baseline.version),receipt.closure.finalWorkerVersionSha256);
 const content=await indexed('control/independent-close-preview-content.json');assert.equal(content.tableCount,77);assert.equal(content.dbWrites,0);assert.match(content.stateSha256,/^[a-f0-9]{64}$/);
 const cancelled=await indexed('cancelled-allocation.json');
 return brand({evidenceSha256:ACCEPTED_HISTORY_ANCHOR.receipt.sha256,closedAt:Date.parse(receipt.closedAt),predecessor,state,namespaceSha256:baseline.namespaceSha256,versionSha256:sha(baseline.version),policy:baseline.oldPolicy,previewStateSha256:content.stateSha256,
  originalUnknownResolved:false,retry12:{safeClosureAccepted:false,controllerPatHttp401:'UNVERIFIED_IMAGE_EXCEPTION',incorrectControllerPatQueried:false,descriptor:cancelled},consumedRunsRetained:true,oldPatEvidence:'ACCEPTED_HISTORICAL_DELETION_AND_COMPLETE_401_NOT_CURRENT_REQUERY',oldPatQueries:0});
}
export function validateKnownClosure(receipt,expected){
 assert.equal(receipt.kind,'GATE1_KNOWN_CLOSURE_V1');assert.equal(receipt.sourceSha256,expected.sourceSha256);assert.equal(receipt.namespaceSha256,expected.namespaceSha256);
 assert.equal(receipt.parentClosureSha256,expected.parentClosureSha256);assert.equal(receipt.gate,'NO-GO');assert.equal(receipt.originalUnknownResolved,false);
 assert.equal(receipt.retry12.safeClosureAccepted,false);assert.equal(receipt.retry12.controllerPatHttp401,'UNVERIFIED_IMAGE_EXCEPTION');assert.equal(receipt.retry12.incorrectControllerPatQueried,false);
 assert.ok(['PREPARATION_CLOSED','SETUP_CLOSED','ENDED_NO_MUTATION','RESTORED'].includes(receipt.ending),'UNKNOWN_ENDING');
 if(receipt.ending==='PREPARATION_CLOSED')assert.equal(receipt.runId,null);else assert.match(receipt.runId,/^[a-f0-9]{64}$/);assert.match(receipt.versionSha256,/^[a-f0-9]{64}$/);assert.ok(Number.isSafeInteger(receipt.closedAt));
 assert.equal(receipt.environment.previewStateSha256,expected.previewStateSha256);assert.equal(receipt.environment.tableCount,77);assert.equal(receipt.environment.dbWrites,0);assert.equal(receipt.environment.nativeApiAccepted,true);
 assert.deepEqual(receipt.environment.metadata,['ACTIVE_HEALTHY','INACTIVE','ACTIVE_HEALTHY']);
 assert.equal(receipt.worker.httpStatus,503);assert.equal(receipt.worker.complete,true);assert.equal(receipt.worker.mode,'disabled');assert.deepEqual(receipt.worker.secretNames,['CONTROLLER_POLICY_JSON']);
 assert.deepEqual(receipt.owned,{processes:0,listeners:0,containers:0,volumes:0});assert.equal(receipt.oauth.loggedIn,false);assert.ok(receipt.oauth.notStarted===true||receipt.oauth.revokeHttpStatus===200);
 assert.ok(Array.isArray(receipt.pats)&&receipt.pats.length===3);assert.deepEqual(receipt.pats.map(p=>p.role).sort(),['configurationToken','controllerPat','metadataReadPat']);
 for(const p of receipt.pats){assert.equal(p.httpStatus,401);assert.equal(p.complete,true);assert.equal(p.deletionEvidenceMatched,true);assert.match(p.inputSha256,/^[a-f0-9]{64}$/);}
 if(['ENDED_NO_MUTATION','RESTORED'].includes(receipt.ending)){
  const text=predecessorStateText(receipt.controllerState);assert.equal(receipt.controllerState.runId,receipt.runId);assert.equal(receipt.controllerState.phase,receipt.ending);assert.equal(receipt.predecessor.stateSha256,sha(text));
  const used=receipt.controllerState.operations.recoveryResume.attempts===1;assert.equal(receipt.recoveryUsed,used);if(used)assert.equal(receipt.formalRecoveryStopAccepted,true);
 }else {assert.equal(receipt.armRequests,0);assert.equal(receipt.hostedLifecycleRequests,0);assert.deepEqual(receipt.predecessor,expected.predecessor);}
 validatePredecessor(receipt.predecessor);return receipt;
}
export async function verifyHistory(context){
 const ref=json(pinned(context.root,context.manifest.history));
 if(ref.kind==='LOCAL_SYNTHETIC_INITIAL_CHECKPOINT'){
  assert.equal(context.local,true,'FIXTURE_HISTORY_FORBIDDEN');const b=json(pinned(context.root,ref.baseline));
  assert.equal(sha(predecessorStateText(b.controllerState)),b.predecessor.stateSha256);assert.equal(b.policy.organizationId,'synthetic-org');
  return brand({...b,state:b.controllerState,evidenceSha256:context.manifest.history.sha256,closedAt:b.controllerState.cleanupEnd,originalUnknownResolved:false,retry12:{safeClosureAccepted:false,controllerPatHttp401:'UNVERIFIED_IMAGE_EXCEPTION',incorrectControllerPatQueried:false},consumedRunsRetained:true,oldPatQueries:0});
 }
 if(ref.kind==='ACCEPTED_INITIAL_CHECKPOINT'){
  assert.equal(ref.expectedReceiptSha256,ACCEPTED_HISTORY_ANCHOR.receipt.sha256);assert.equal(context.local,false,'REAL_HISTORY_FORBIDDEN_IN_FIXTURE');return readInitialHistory();
 }
 assert.equal(ref.kind,'ACCEPTED_GENERATED_CLOSURE');assert.equal(ref.receipt.sha256,context.approval.previousClosureSha256,'EXPLICIT_PREVIOUS_CLOSURE_PIN_REQUIRED');
 const previousRoot=ref.root??context.root;assert.ok(path.resolve(previousRoot).startsWith(path.join(REPOSITORY,'.tmp')+path.sep),'PREVIOUS_PACKET_ROOT_REJECTED');
 const expected=json(pinned(context.root,ref.expected)),receipt=await readPinnedSafeClosureJson({root:previousRoot,descriptor:ref.receipt});
 validateKnownClosure(receipt,expected);assert.equal(receipt.hostedEvidence,!context.local,'EVIDENCE_DOMAIN_MISMATCH');
 assert.ok(context.approval.authorizedAt>receipt.closedAt,'NEW_APPROVAL_MUST_FOLLOW_CLOSURE');assert.notEqual(context.approval.approvalId,receipt.approvalId);
 const index=await readPinnedSafeClosureJson({root:previousRoot,descriptor:ref.evidence});assert.equal(ref.evidence.sha256,receipt.evidence.sha256);assert.equal(index.manifestSha256,receipt.manifestSha256);assert.equal(index.approvalId,receipt.approvalId);assert.equal(index.runId,receipt.runId);
 // Receipt/index were accepted and pinned for this approval. Rehash the fixed
 // local evidence; never query revoked historical credentials again.
 assert.ok(Array.isArray(index.files)&&index.files.length>=11&&index.files.length<=32,'CLOSURE_INDEX_COVERAGE');
 assert.equal(new Set(index.files.map(d=>d.file)).size,index.files.length,'CLOSURE_INDEX_DUPLICATE');
 for(const d of index.files)await readPinnedSafeClosureJson({root:previousRoot,descriptor:d});
 assert.ok(Object.keys(context.policy).every(k=>k==='sourceCommit'||context.policy[k]===receipt.policy[k]),'PREVIOUS_TARGET_POLICY_CHANGED');
 return brand({...expected,...receipt,evidenceSha256:ref.receipt.sha256,oldPatQueries:0,oldPatEvidence:'ACCEPTED_HISTORICAL_DELETION_AND_COMPLETE_401_NOT_CURRENT_REQUERY'});
}
