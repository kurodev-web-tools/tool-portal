import assert from 'node:assert/strict';
import {createControllerClient} from '../lib/comment-translator-paid-core-v1-gate1-controller-client.mjs';
import {LIMITS,pinned,json,sha,safeFile} from './execution-inputs.mjs';

export const POSTARM_STEPS=Object.freeze(['pause-preview','resume-recovery','setup','baseline','fixtures','close-services','transfer','reopen','finish-or-abort','independent-closure']);
export function validateHandoff(context,now){
 const plan=json(pinned(context.root,context.manifest.handoff));
 assert.equal(plan.kind,'GATE1_EXISTING_POSTARM_HANDOFF_V1');
 assert.deepEqual(plan.steps,POSTARM_STEPS);assert.equal(plan.newWorkflowAutomation,false);
 assert.equal(plan.ordinaryApprovalWait,false);assert.equal(plan.procedureCreationAfterArm,false);
 assert.ok(typeof plan.responsibleOperator==='string'&&plan.responsibleOperator.length>0&&plan.responsibleOperator.length<=160);
 assert.equal(plan.recoveryOwner,'EXTERNAL_CONTROLLER');assert.equal(plan.acceptanceOwner,plan.responsibleOperator);
 assert.equal(plan.approvalId,context.approval.approvalId);assert.equal(plan.policySha256,context.approval.policySha256);
 assert.ok(plan.instructions.length>=2&&plan.instructions.length<=4);for(const d of plan.instructions)pinned(context.root,d);
 assert.deepEqual(plan.inputs.map(x=>x.purpose).sort(),['configuration','fixtures','observers','transfer']);
 for(const d of plan.inputs)pinned(context.root,d);
 assert.equal(plan.perNativeStageLimitMs,60000);assert.equal(plan.leaseMs,LIMITS.lease);
 const review=json(safeFile(context.root,'control/handoff-reviewed.json'));
 assert.equal(review.planSha256,context.manifest.handoff.sha256);assert.equal(review.approvalId,context.approval.approvalId);
 assert.equal(review.responsibleOperator,plan.responsibleOperator);assert.equal(review.ready,true);
 assert.ok(Number.isSafeInteger(review.at)&&review.at>=context.approval.authorizedAt&&review.at<=now);
 return Object.freeze({planSha256:context.manifest.handoff.sha256,responsibleOperator:plan.responsibleOperator});
}

// Same existing client, transport, journal, stop verifier and stage acceptors.
// Only the allocation/continuation boundary is added; no Hosted steps are run.
export function createBoundClient({allocation,context,options}){
 assert.equal(allocation.manifestSha256,context.manifestSha256);
 assert.equal(allocation.hardEndAt,allocation.allocatedAt+LIMITS.run);
 assert.equal(options.runId,allocation.runId);assert.equal(options.hardEndAt,allocation.hardEndAt);
 assert.equal(options.sourceCommit,context.sourceCommit);
 let latestPostAt=null;const now=options.now??Date.now;
 const client=createControllerClient({...options,transport:async(route,body,extra)=>{
  if(body!==undefined)latestPostAt=now();return options.transport(route,body,extra);
 }});
 return Object.freeze({...client,continuationDeadline(){
  const state=client.state();return Math.min(allocation.hardEndAt,state?.leaseEnd??Infinity,latestPostAt===null?Infinity:latestPostAt+LIMITS.lease);
 }});
}

export function verifyArmConnection({allocation,state,armDispatchAt,now,handoff,identity,clientProcess,observer}){
 assert.equal(state.runId,allocation.runId);assert.equal(state.hardEndAt,allocation.hardEndAt);assert.equal(state.phase,'ARMED');assert.equal(state.sequence,0);
 assert.equal(identity.runId,allocation.runId);assert.equal(identity.hardEndAt,allocation.hardEndAt);assert.equal(identity.packetManifestSha256,allocation.manifestSha256);
 assert.equal(state.projects.preview,'ACTIVE_HEALTHY');assert.equal(state.projects.recovery,'INACTIVE');
 assert.equal(Object.values(state.operations).every(x=>x.attempts===0&&x.outcome===null),true);
 assert.ok(Number.isSafeInteger(armDispatchAt)&&armDispatchAt>=allocation.allocatedAt&&armDispatchAt<=now);
 const leaseEnd=Math.min(armDispatchAt+LIMITS.lease,state.leaseEnd,allocation.hardEndAt);
 assert.ok(now<leaseEnd,'POSTARM_LEASE_EXPIRED');assert.ok(now<allocation.hardEndAt,'POSTARM_RUN_EXPIRED');
 for(const x of [clientProcess,observer]){assert.equal(x.runId,allocation.runId);assert.ok(Number.isInteger(x.processId)&&x.processId>0);assert.equal(x.alive,true);}
 assert.equal(observer.baselineAccepted,true);assert.equal(observer.stopEvidence,false);
 return {kind:'GATE1_ARM_HANDOFF_V1',runId:allocation.runId,hardEndAt:allocation.hardEndAt,leaseDeadlineAt:leaseEnd,planSha256:handoff.planSha256,armStateSha256:sha(JSON.stringify(state)),controllerRecoveryOwner:'EXTERNAL_CONTROLLER',hostedAcceptance:false};
}
