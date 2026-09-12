import test from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';
import {EventEmitter} from 'node:events';
import {createControllerClient,createControllerHttpsTransport} from './lib/comment-translator-paid-core-v1-gate1-controller-client.mjs';
import {createRun,publicState,observe,command,tick} from '../workers/gate1-recovery-controller/core.mjs';
import {GRANT_HEADER,previewUnknownClosureStateText,safeClosureGrantText,sha256Text,grantSha256,policySha256} from '../workers/gate1-recovery-controller/safe-closure.mjs';
const policy={mode:'simulation',previewRef:'p'.repeat(20),recoveryRef:'r'.repeat(20),productionRef:'x'.repeat(20),organizationId:'synthetic-org',sourceCommit:'e'.repeat(40),emergencyPreviewResume:true};
async function fixture(t){
 let clock=2000000,remote=null;const calls=[],rows=[];
 const prior={runId:'b'.repeat(64),phase:'RESTORED',reason:'MUTATION_OUTCOME_UNKNOWN',sequence:2,hardEndAt:1000000,leaseEnd:500000,cleanupEnd:1500000,operations:{previewPause:{attempts:1,outcome:'UNKNOWN'},previewResume:{attempts:1,outcome:'UNKNOWN'},recoveryPause:{attempts:0,outcome:null},recoveryResume:{attempts:0,outcome:null}},projects:{preview:'ACTIVE_HEALTHY',recovery:'INACTIVE'},projectObservedAt:{preview:500000,recovery:500000},gate:'NO-GO',formalStopAccepted:false};
 const predecessor={runId:prior.runId,sourceCommit:'a'.repeat(40),stateSha256:await sha256Text(previewUnknownClosureStateText(prior))};
 const grant={schemaVersion:1,kind:'PREVIEW_ONLY_UNKNOWN_SAFE_CLOSURE_V1',grantId:'d'.repeat(64),predecessor,successor:{runId:'f'.repeat(64),sourceCommit:policy.sourceCommit,hardEndAt:clock+900000,manifestSha256:'1'.repeat(64)},policySha256:await policySha256(policy),approvalSha256:'2'.repeat(64),closureEvidenceSha256:'3'.repeat(64),issuedAt:clock,expiresAt:clock+300000};
 const text=safeClosureGrantText(grant),digest=await grantSha256(text);
 const transport=async(route,body)=>{calls.push({route,body});if(route==='/v1/arm'){remote=createRun(policy,body,clock+283);for(const role of ['preview','recovery'])observe(remote,role,{status:role==='preview'?'ACTIVE_HEALTHY':'INACTIVE',startedAt:clock+283,completedAt:clock+283},clock+283);}if(route==='/v1/command'){command(remote,body,clock+283);tick(remote,clock+283);}return {status:200,body:JSON.stringify(remote?publicState(remote):prior),safeClosureGrantSha256:remote?null:digest};};
 const options={runId:grant.successor.runId,sourceCommit:policy.sourceCommit,predecessor,hardEndAt:grant.successor.hardEndAt,manifestSha256:grant.successor.manifestSha256,approvedManifestSha256:grant.successor.manifestSha256,safeClosureGrant:text,transport,journal:{append:r=>rows.push(r)},observeRecoveryStop:async()=>{throw Error('NO_FORMAL_PROOF');},observerBindings:Object.fromEntries(['preview','recovery'].map(role=>[role,{sourceBindingSha256:'c'.repeat(64),observerSha256:'d'.repeat(64),bridgeSha256:'e'.repeat(64)}])),stagePlan:{},now:()=>clock,timers:{setTimeout:()=>1,clearTimeout(){}}};
 const client=(extra={})=>{const c=createControllerClient({...options,...extra});t.after(()=>c.dispose());return c;};
 return {client,options,prior,predecessor,grant,text,digest,calls,rows,transport,advance:ms=>clock+=ms,clock:()=>clock,start:c=>c.start({sha256:'c'.repeat(64),verifiedAt:clock}),remote:()=>remote};
}

test('explicit grant starts from the limited UNKNOWN state and sends frozen digests without old sequence or lease',async t=>{
 const f=await fixture(t),c=f.client(),expected=structuredClone(f.predecessor);f.predecessor.runId='9'.repeat(64);f.grant.successor.runId='8'.repeat(64);
 const result=await f.start(c);assert.equal(result.phase,'ARMED');assert.equal(result.runId,f.options.runId);assert.equal(result.sequence,0);assert.notEqual(result.leaseEnd,f.prior.leaseEnd);assert.deepEqual(f.calls[1].body.predecessor,expected);assert.deepEqual(f.calls[1].body.safeClosure,{grantSha256:f.digest,manifestSha256:f.options.manifestSha256});
 assert.equal(f.rows.filter(r=>r.event==='SAFE_CLOSURE_PREDECESSOR_MATCHED').length,1);assert.equal(f.rows.filter(r=>r.event==='PREDECESSOR_ACCEPTED').length,0);assert.equal(f.rows.find(r=>r.event==='HTTP_ATTEMPT'&&r.route==='/v1/arm').grantSha256,f.digest);assert.equal(c.budget().postCount,1);
});

test('constructor rejects a grant not bound to its predecessor, run, source, manifest and deadline',async t=>{
 const f=await fixture(t);
 for(const update of [{predecessor:null},{predecessor:{...f.predecessor,stateSha256:'0'.repeat(64)}},{runId:'9'.repeat(64)},{sourceCommit:'9'.repeat(40)},{hardEndAt:f.options.hardEndAt+1},{manifestSha256:'0'.repeat(64),approvedManifestSha256:'0'.repeat(64)},{safeClosureGrant:f.grant},{safeClosureGrant:f.text+' '},{safeClosureGrant:safeClosureGrantText({...f.grant,issuedAt:f.clock()+1,expiresAt:f.clock()+300000})}])assert.throws(()=>f.client(update));
 assert.equal(f.calls.length,0);
});

test('missing or wrong digest header and prior-state drift stop before any arm attempt',async t=>{
 for(const mode of ['missing','wrong','uppercase','drift','unknown-profile','ordinary']){const f=await fixture(t);const c=f.client({transport:async(route,body)=>{const r=await f.transport(route,body);if(mode==='missing')delete r.safeClosureGrantSha256;if(mode==='wrong')r.safeClosureGrantSha256='0'.repeat(64);if(mode==='uppercase')r.safeClosureGrantSha256=f.digest.toUpperCase();if(mode==='drift'||mode==='unknown-profile'||mode==='ordinary'){const s=JSON.parse(r.body);if(mode==='drift')s.sequence++;if(mode==='unknown-profile')s.operations.recoveryResume={attempts:1,outcome:'UNKNOWN'};if(mode==='ordinary')s.operations.previewPause.outcome='ACCEPTED';r.body=JSON.stringify(s);}return r;}});await assert.rejects(f.start(c));await assert.rejects(f.start(c));assert.equal(c.budget().postCount,0);assert.equal(f.calls.length,1);}
});

test('grant expiration and local clock regression between GET and arm cannot send a POST',async t=>{
 for(const delta of [300000,-1]){const f=await fixture(t),c=f.client({transport:async(route,body)=>{const r=await f.transport(route,body);f.advance(delta);return r;}});await assert.rejects(f.start(c));assert.equal(f.calls.length,1);assert.equal(c.budget().postCount,0);}
 const f=await fixture(t),c=f.client();f.advance(300000);await assert.rejects(f.start(c));assert.equal(f.calls.length,0);
});

test('a lost arm reply is consumed once and grant expiry does not block registered-run abort',async t=>{
 const f=await fixture(t),c=f.client({transport:async(route,body)=>{const r=await f.transport(route,body);if(route==='/v1/arm')throw Error('LOST_REPLY');return r;}});await assert.rejects(f.start(c));await assert.rejects(f.start(c));assert.equal(f.calls.filter(r=>r.route==='/v1/arm').length,1);assert.equal(await c.stop(),false);assert.equal(f.calls.filter(r=>r.body?.type==='abort').length,1);assert.equal(f.remote().phase,'ENDED_NO_MUTATION');
 const expired=await fixture(t),short=safeClosureGrantText({...expired.grant,expiresAt:expired.clock()+1000}),shortDigest=await grantSha256(short);const running=expired.client({safeClosureGrant:short,transport:async(route,body)=>{const r=await expired.transport(route,body);if(route==='/v1/state'&&!expired.remote())r.safeClosureGrantSha256=shortDigest;return r;}});await expired.start(running);expired.advance(1001);assert.equal(await running.stop(),false);assert.equal(expired.calls.filter(r=>r.body?.type==='abort').length,1);assert.equal(expired.remote().phase,'ENDED_NO_MUTATION');
});

test('normal client still rejects UNKNOWN when no explicit grant is supplied',async t=>{
 const f=await fixture(t),c=f.client({safeClosureGrant:null});await assert.rejects(f.start(c));assert.equal(c.budget().postCount,0);
});

test('native HTTPS exposes only the dedicated grant digest header',async t=>{
 const digest='d'.repeat(64);t.mock.method(https,'request',(_url,_options,callback)=>{const r=new EventEmitter();r.destroy=()=>{};r.end=()=>queueMicrotask(()=>{const response=new EventEmitter();response.complete=true;response.statusCode=200;response.headers={[GRANT_HEADER.toLowerCase()]:digest,'set-cookie':'PRIVATE_COOKIE'};callback(response);response.emit('data',Buffer.from('{}'));response.emit('end');});return r;});
 const transport=createControllerHttpsTransport({origin:'https://v-streamer-tools-gate1-recovery-controller-live.fixture.workers.dev',operatorToken:'s'.repeat(64)}),response=await transport('/v1/state');assert.deepEqual(response,{status:200,body:'{}',safeClosureGrantSha256:digest});
});
