import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {predecessorStateText} from '../../workers/gate1-recovery-controller/core.mjs';
import {previewUnknownClosureStateText} from '../../workers/gate1-recovery-controller/safe-closure.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
// This classifies controller evidence only. Independent environment readbacks
// and, after Recovery use, formal observer proof remain mandatory for closure.
export function classifyClosingState(state,{runId,predecessor}){
 const isPrior=state?.runId===predecessor.runId;
 let canonical;try{canonical=predecessorStateText(state);}catch(error){
  // Only the already pinned predecessor can retain the historical exception.
  if(!isPrior)throw error;canonical=previewUnknownClosureStateText(state);
 }
 assert.ok(state&&typeof state==='object');assert.equal(state.gate,'NO-GO');assert.equal(state.formalStopAccepted,false);
 assert.ok(['ENDED_NO_MUTATION','RESTORED'].includes(state.phase),'CONTROLLER_NOT_TERMINAL');
 assert.equal(state.projects.preview,'ACTIVE_HEALTHY');assert.equal(state.projects.recovery,'INACTIVE');
 assert.equal(Object.keys(state.operations).sort().join(','),'previewPause,previewResume,recoveryPause,recoveryResume');
 if(isPrior){assert.equal(sha(canonical),predecessor.stateSha256,'PREDECESSOR_STATE_CHANGED');return {kind:'PREARM_SAFE_CLOSURE_PREDECESSOR_UNCHANGED',formalProofRequired:false};}
 assert.match(runId??'',/^[a-f0-9]{64}$/);assert.equal(state.runId,runId,'WRONG_RUN');
 const any=Object.values(state.operations).some(op=>op.attempts===1);
 if(!any){assert.equal(state.phase,'ENDED_NO_MUTATION');return {kind:'CURRENT_RUN_NO_MUTATION',formalProofRequired:false};}
 assert.equal(state.phase,'RESTORED');assert.equal(state.operations.previewPause.attempts,1);assert.equal(state.operations.previewResume.attempts,1);
 const recoveryUsed=state.operations.recoveryResume.attempts===1;
 if(recoveryUsed)assert.equal(state.operations.recoveryPause.attempts,1);
 return {kind:'CURRENT_RUN_RESTORED',formalProofRequired:recoveryUsed};
}
