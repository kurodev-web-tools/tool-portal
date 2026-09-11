import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePolicy, createRun, command, observe, claim, confirmDispatch, settle, tick, nextAction, publicState, LEASE_MS, CLEANUP_MS } from './core.mjs';

const NOW=1800000000000;
const policy=()=>({mode:'simulation',previewRef:'p'.repeat(20),recoveryRef:'r'.repeat(20),productionRef:'x'.repeat(20),organizationId:'synthetic-org',sourceCommit:'a'.repeat(40),emergencyPreviewResume:true});
const packet=()=>({runId:'b'.repeat(64),sourceCommit:'a'.repeat(40),hardEndAt:NOW+1800000,preservationSha256:'c'.repeat(64),preservationVerifiedAt:NOW,acknowledgeEmergencyContainment:true});
const make=()=>createRun(validatePolicy(policy()),packet(),NOW);
const cmd=(s,type,extra={},now=NOW)=>command(s,{runId:s.runId,sequence:s.sequence+1,type,...extra},now);
const seen=(s,role,status,now=NOW)=>observe(s,role,{status,startedAt:now,completedAt:now},now);
function paused(){const s=make();seen(s,'preview','ACTIVE_HEALTHY');seen(s,'recovery','INACTIVE');cmd(s,'pause-preview');claim(s,'previewPause',NOW);settle(s,'previewPause','ACCEPTED',NOW);seen(s,'preview','INACTIVE',NOW+1000);return s;}
function resumed(){const s=paused();cmd(s,'resume-recovery',{evidenceSha256:'d'.repeat(64)},NOW+1000);claim(s,'recoveryResume',NOW+1000);settle(s,'recoveryResume','ACCEPTED',NOW+1000);seen(s,'recovery','ACTIVE_HEALTHY',NOW+2000);return s;}

test('rejects protected, duplicate and unbound target policies',()=>{
  assert.throws(()=>validatePolicy({...policy(),previewRef:'x'.repeat(20)}));
  assert.throws(()=>validatePolicy({...policy(),recoveryRef:'p'.repeat(20)}));
  assert.throws(()=>validatePolicy({...policy(),extra:true}));
  assert.throws(()=>validatePolicy({...policy(),mode:'disabled'}));
  assert.throws(()=>validatePolicy({...policy(),mode:'live',previewRef:[policy().previewRef]}));
});
test('arm requires fresh preservation, exact commit and a finite new window',()=>{
  for(const change of [{sourceCommit:'e'.repeat(40)},{runId:['b'.repeat(64)]},{preservationVerifiedAt:NOW-300001},{hardEndAt:NOW+1800001},{hardEndAt:NOW-1},{acknowledgeEmergencyContainment:false}])assert.throws(()=>createRun(policy(),{...packet(),...change},NOW));
  assert.equal(make().phase,'ARMED');
});
test('pause needs fresh original-state metadata and claims once before I/O',()=>{
  const s=make();cmd(s,'pause-preview');assert.throws(()=>claim(s,'previewPause',NOW));
  seen(s,'preview','ACTIVE_HEALTHY');seen(s,'recovery','INACTIVE');claim(s,'previewPause',NOW);
  assert.equal(s.operations.previewPause.outcome,'PENDING');assert.throws(()=>claim(s,'previewPause',NOW));
});

test('preservation must remain fresh when Preview pause is actually claimed',()=>{
  const s=createRun(policy(),{...packet(),preservationVerifiedAt:NOW-270000},NOW),later=NOW+60000;
  seen(s,'preview','ACTIVE_HEALTHY',later);seen(s,'recovery','INACTIVE',later);cmd(s,'pause-preview',{},later);
  assert.throws(()=>claim(s,'previewPause',later));assert.equal(s.operations.previewPause,null);
});

test('an already consumed claim cannot dispatch after abort or stale metadata',()=>{
  const s=make();seen(s,'preview','ACTIVE_HEALTHY');seen(s,'recovery','INACTIVE');cmd(s,'pause-preview');claim(s,'previewPause',NOW);
  confirmDispatch(s,'previewPause',NOW);assert.equal(s.operations.previewPause.attemptedAt,NOW);
  assert.throws(()=>confirmDispatch(s,'previewPause',NOW+10001));
  cmd(s,'abort',{},NOW+1000);assert.throws(()=>confirmDispatch(s,'previewPause',NOW+1000));
  assert.equal(s.operations.previewPause.outcome,'PENDING');
});
test('recovery cannot resume before the owned Preview pause and attestation',()=>{
  const s=make();assert.throws(()=>cmd(s,'resume-recovery',{evidenceSha256:'d'.repeat(64)}));
  const p=paused();assert.throws(()=>claim(p,'recoveryResume',NOW+1000));
  cmd(p,'resume-recovery',{evidenceSha256:'d'.repeat(64)},NOW+1000);claim(p,'recoveryResume',NOW+1000);
});
test('old run, duplicate sequence and repeated progress receipt cannot refresh liveness',()=>{
  const s=make();assert.throws(()=>command(s,{runId:'e'.repeat(64),sequence:1,type:'abort'},NOW));
  const p={runId:s.runId,sequence:1,type:'progress',evidenceSha256:'d'.repeat(64)};command(s,p,NOW+1000);
  const lease=s.leaseEnd;assert.throws(()=>command(s,p,NOW+2000));
  assert.throws(()=>cmd(s,'progress',{evidenceSha256:'d'.repeat(64)},NOW+2000));assert.equal(s.leaseEnd,lease);
});
test('progress can never revive an expired run or extend its fixed end',()=>{
  const s=make();assert.throws(()=>cmd(s,'progress',{evidenceSha256:'d'.repeat(64)},NOW+LEASE_MS));
  assert.equal(s.phase,'ENDED_NO_MUTATION');assert.equal(s.hardEndAt,packet().hardEndAt);
});
test('machine-off elapsed time initiates cleanup, not a new trial',()=>{
  const s=resumed(),expired=s.leaseEnd+1;tick(s,expired);assert.equal(s.phase,'CLOSING');
  seen(s,'recovery','ACTIVE_HEALTHY',expired);assert.equal(nextAction(s,expired),'recoveryPause');
});
test('duplicate cleanup ticks and reconstructed state never resend a mutation',()=>{
  const s=resumed();cmd(s,'abort',{},NOW+2000);claim(s,'recoveryPause',NOW+2000);
  const recovered=JSON.parse(JSON.stringify(s));seen(recovered,'recovery','ACTIVE_HEALTHY',NOW+3000);
  assert.equal(nextAction(recovered,NOW+3000),null);assert.throws(()=>claim(recovered,'recoveryPause',NOW+3000));
});
test('uncertain Recovery resume with no observed active state cannot restore Preview',()=>{
  const s=paused();cmd(s,'resume-recovery',{evidenceSha256:'d'.repeat(64)},NOW+1000);claim(s,'recoveryResume',NOW+1000);settle(s,'recoveryResume','UNKNOWN',NOW+1000);cmd(s,'abort',{},NOW+2000);
  seen(s,'preview','INACTIVE',NOW+3000);seen(s,'recovery','INACTIVE',NOW+3000);seen(s,'recovery','INACTIVE',NOW+5000);
  assert.equal(nextAction(s,NOW+5000),null);assert.throws(()=>claim(s,'previewResume',NOW+5000));
});
test('emergency restore requires owned Recovery stop and separated inactive observations',()=>{
  const s=resumed();cmd(s,'abort',{},NOW+2000);claim(s,'recoveryPause',NOW+2000);settle(s,'recoveryPause','UNKNOWN',NOW+2000);
  seen(s,'preview','INACTIVE',NOW+3000);seen(s,'recovery','INACTIVE',NOW+3000);assert.equal(nextAction(s,NOW+3000),null);
  seen(s,'recovery','INACTIVE',NOW+3500);assert.equal(nextAction(s,NOW+3500),null);
  seen(s,'recovery','INACTIVE',NOW+5000);assert.equal(nextAction(s,NOW+5000),'previewResume');
  claim(s,'previewResume',NOW+5000);settle(s,'previewResume','ACCEPTED',NOW+5000);seen(s,'preview','ACTIVE_HEALTHY',NOW+6000);tick(s,NOW+6000);
  assert.equal(s.phase,'RESTORED');assert.equal(publicState(s).gate,'NO-GO');assert.equal(publicState(s).formalStopAccepted,false);
});
test('abort before any mutation ends with no mutation, and abort after Preview pause can restore',()=>{
  const s=make();cmd(s,'abort');tick(s,NOW);assert.equal(s.phase,'ENDED_NO_MUTATION');
  const p=paused();cmd(p,'abort',{},NOW+1000);seen(p,'recovery','INACTIVE',NOW+2000);assert.equal(nextAction(p,NOW+2000),'previewResume');
});
test('cleanup deadline and disabled emergency resume require operator attention',()=>{
  const s=resumed();cmd(s,'abort',{},NOW+2000);tick(s,NOW+2000+CLEANUP_MS);assert.equal(s.phase,'NEEDS_OPERATOR');assert.equal(nextAction(s,NOW+2000+CLEANUP_MS),null);
  const p=paused();p.policy.emergencyPreviewResume=false;cmd(p,'abort',{},NOW+1000);assert.equal(nextAction(p,NOW+1000),null);
});
test('a backward clock closes the run and stale observations cannot overwrite newer state',()=>{
  const s=resumed();seen(s,'recovery','INACTIVE',NOW+4000);seen(s,'recovery','ACTIVE_HEALTHY',NOW+1000);assert.equal(s.observed.recovery.status,'INACTIVE');
  tick(s,NOW);assert.equal(s.phase,'CLOSING');assert.equal(s.reason,'CLOCK_REGRESSION');
});
test('metadata age and unknown statuses never authorize a mutation',()=>{
  const s=make();seen(s,'preview','ACTIVE_HEALTHY');seen(s,'recovery','INACTIVE');cmd(s,'pause-preview',{},NOW+20000);assert.throws(()=>claim(s,'previewPause',NOW+20000));
  seen(s,'preview','COMING_UP',NOW+20000);seen(s,'recovery','INACTIVE',NOW+20000);assert.throws(()=>claim(s,'previewPause',NOW+20000));
});
