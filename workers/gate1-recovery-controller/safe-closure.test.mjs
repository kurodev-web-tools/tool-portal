import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRun,predecessorStateText,publicState} from './core.mjs';

// Optional import makes the first RED an explicit missing-contract assertion.
const closure=await import('./safe-closure.mjs').catch(error=>{if(error.code!=='ERR_MODULE_NOT_FOUND')throw error;return {};});
const p={mode:'simulation',previewRef:'p'.repeat(20),recoveryRef:'r'.repeat(20),productionRef:'x'.repeat(20),organizationId:'synthetic-org',sourceCommit:'a'.repeat(40),emergencyPreviewResume:true};
const now=2000000,sha=s=>createHash('sha256').update(s).digest('hex');
const old=()=>{const s=createRun(p,{runId:'b'.repeat(64),sourceCommit:p.sourceCommit,hardEndAt:1000000,preservationSha256:'c'.repeat(64),preservationVerifiedAt:100000,acknowledgeEmergencyContainment:true},100000);Object.assign(s,{phase:'RESTORED',reason:'MUTATION_OUTCOME_UNKNOWN',cleanupEnd:1500000,sequence:2});for(const op of ['previewPause','previewResume'])s.operations[op]={attemptedAt:200000,outcome:'UNKNOWN'};for(const role of ['preview','recovery'])s.observed[role]={status:role==='preview'?'ACTIVE_HEALTHY':'INACTIVE',startedAt:300000,completedAt:300001};return s;};
async function valid(){const previous=old(),policy={...p,sourceCommit:'e'.repeat(40)},stateText=closure.previewUnknownClosureStateText(publicState(previous));const grant={schemaVersion:1,kind:'PREVIEW_ONLY_UNKNOWN_SAFE_CLOSURE_V1',grantId:'d'.repeat(64),predecessor:{runId:previous.runId,sourceCommit:previous.sourceCommit,stateSha256:sha(stateText)},successor:{runId:'f'.repeat(64),sourceCommit:policy.sourceCommit,hardEndAt:now+900000,manifestSha256:'1'.repeat(64)},policySha256:await closure.policySha256(policy),approvalSha256:'2'.repeat(64),closureEvidenceSha256:'3'.repeat(64),issuedAt:now,expiresAt:now+300000};return {previous,policy,grant,text:closure.safeClosureGrantText(grant)};}

test('the limited UNKNOWN projection is separate from the ordinary rejected predecessor',()=>{
 assert.equal(typeof closure.previewUnknownClosureStateText,'function','missing limited UNKNOWN contract');
 const s=publicState(old()),before=JSON.stringify(s);assert.throws(()=>predecessorStateText(s));
 const canonical=closure.previewUnknownClosureStateText(s);assert.equal(canonical,closure.canonicalJson(s));assert.equal(JSON.stringify(s),before);
 s.operations.previewResume.outcome='ACCEPTED';assert.doesNotThrow(()=>closure.previewUnknownClosureStateText(s));
 for(const change of [x=>x.operations.previewPause.outcome='ACCEPTED',x=>x.operations.previewResume.outcome='PENDING',x=>x.operations.recoveryResume={attempts:1,outcome:'UNKNOWN'},x=>x.operations.recoveryPause={attempts:1,outcome:'ACCEPTED'},x=>x.phase='NEEDS_OPERATOR',x=>x.phase='CLOSING',x=>x.extra=true,x=>x.projectObservedAt.preview=null,x=>x.leaseEnd=x.hardEndAt+1,x=>x.sequence=257,x=>x.formalStopAccepted=true]){const bad=structuredClone(s);change(bad);assert.throws(()=>closure.previewUnknownClosureStateText(bad));}
});

test('canonical grant binds exact fields and rejects duplicates, whitespace, types and oversized input',async()=>{
 const {grant,text}=await valid();assert.deepEqual(closure.parseSafeClosureGrant(text),grant);
 assert.equal(await closure.grantSha256(text),sha('gate1-safe-closure-grant-v1\n'+text));
 for(const bad of [text+' ',JSON.stringify(grant),'"'+text+'"',text.replace('"schemaVersion":1','"schemaVersion":1,"schemaVersion":1'),' '.repeat(4097),null])assert.throws(()=>closure.parseSafeClosureGrant(bad));
 for(const update of [{kind:'OTHER'},{extra:true},{grantId:'D'.repeat(64)},{issuedAt:'2000000'},{expiresAt:now},{expiresAt:now+300001},{successor:{...grant.successor,runId:grant.predecessor.runId}},{predecessor:{...grant.predecessor,stateSha256:'A'.repeat(64)}}])assert.throws(()=>closure.safeClosureGrantText({...grant,...update}));
 assert.equal(closure.canonicalJson({z:[{z:1,a:2},3],a:0}),'{"a":0,"z":[{"a":2,"z":1},3]}');
});

test('source transition preserves fixed policy and old schema and state identity',async()=>{
 const {previous,policy,grant}=await valid();assert.equal(closure.validateClosureBinding(previous,policy,grant),closure.previewUnknownClosureStateText(publicState(previous)));
 for(const bad of [{...policy,emergencyPreviewResume:false},{...policy,organizationId:'other-org'},{...policy,sourceCommit:'1'.repeat(40)}])assert.throws(()=>closure.validateClosureBinding(previous,bad,grant));
 for(const bad of [{...previous,schemaVersion:2},{...previous,sourceCommit:'1'.repeat(40)},{...previous,runId:'1'.repeat(64)}])assert.throws(()=>closure.validateClosureBinding(bad,policy,grant));
});

test('Worker clock tolerates PC lead but enforces remaining time and old deadlines at admission',async()=>{
 const {previous,grant}=await valid();assert.doesNotThrow(()=>closure.validateWorkerClosureTime(previous,grant,now-500));
 for(const time of [grant.expiresAt,grant.expiresAt+1,grant.expiresAt-600001,NaN,-1])assert.throws(()=>closure.validateWorkerClosureTime(previous,grant,time));
 assert.doesNotThrow(()=>closure.validateWorkerClosureTime(previous,grant,now));
 assert.throws(()=>closure.validateWorkerClosureTime({...previous,cleanupEnd:now-59999},grant,now));
 assert.throws(()=>closure.validateWorkerClosureTime(previous,{...grant,successor:{...grant.successor,hardEndAt:now+1200001}},now));
});

test('core accepts only the two explicit arm digests with a predecessor and creates no authorization marker',async()=>{
 const {grant}=await valid(),policy={...p,sourceCommit:grant.successor.sourceCommit},input={runId:grant.successor.runId,sourceCommit:policy.sourceCommit,hardEndAt:grant.successor.hardEndAt,preservationSha256:'c'.repeat(64),preservationVerifiedAt:now,acknowledgeEmergencyContainment:true,predecessor:grant.predecessor,safeClosure:{grantSha256:'d'.repeat(64),manifestSha256:grant.successor.manifestSha256}};
 const s=createRun(policy,input,now);assert.equal(Object.hasOwn(s,'safeClosureTransition'),false);assert.equal(Object.hasOwn(s,'safeClosure'),false);
 for(const update of [{predecessor:undefined},{safeClosure:{...input.safeClosure,approved:true}},{safeClosure:grant},{safeClosure:{grantSha256:'UPPER',manifestSha256:'c'.repeat(64)}}])assert.throws(()=>createRun(policy,{...input,...update},now));
 const noPrior={...input};delete noPrior.predecessor;assert.throws(()=>createRun(policy,noPrior,now));
});
