import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {Miniflare} from 'miniflare';
import {createControllerClient} from '../../scripts/lib/comment-translator-paid-core-v1-gate1-controller-client.mjs';

const policy={mode:'simulation',previewRef:'p'.repeat(20),recoveryRef:'r'.repeat(20),productionRef:'x'.repeat(20),organizationId:'synthetic-org',sourceCommit:'a'.repeat(40),emergencyPreviewResume:true};
const token='s'.repeat(64),workerPath=fileURLToPath(new URL('./worker.mjs',import.meta.url));
const canonical=value=>value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const pin=(state,sourceCommit=policy.sourceCommit)=>({runId:state.runId,sourceCommit,stateSha256:createHash('sha256').update(JSON.stringify(canonical(state))).digest('hex')});
const packet=(runId='b'.repeat(64),sourceCommit=policy.sourceCommit,predecessor)=>({runId,sourceCommit,hardEndAt:Date.now()+300000,preservationSha256:'c'.repeat(64),preservationVerifiedAt:Date.now(),acknowledgeEmergencyContainment:true,...(predecessor===undefined?{}:{predecessor})});
async function setup(t){
 await fs.mkdir('.tmp',{recursive:true});const directory=await fs.mkdtemp(path.resolve('.tmp/gate1-predecessor-')),fixture=path.join(directory,'fixture.mjs'),relative=path.relative(directory,workerPath).replaceAll('\\','/');
 // Audit/fault hooks exist only in this generated local synthetic Worker.
 await fs.writeFile(fixture,`import base,{Gate1RecoveryController as Base} from ${JSON.stringify(relative)};
 export class Gate1RecoveryController extends Base {
  audit(){return {current:this.read(),rows:this.sql.exec('SELECT run_id,value FROM used_runs ORDER BY run_id').toArray()};}
  write(state){super.write(state);if(this.env.FAIL_SUCCESSOR_WRITE&&state.predecessor)this.sql.exec('SELECT * FROM deliberately_missing_successor_table');}
  read(){const state=super.read();if(this.injectRace&&state){this.injectRace=false;const concurrent=structuredClone(state);concurrent.lastNow++;super.write(concurrent);}return state;}
  async arm(input){this.injectRace=!!this.env.STALE_SNAPSHOT;if(this.env.LEDGER_MISMATCH)this.sql.exec("UPDATE used_runs SET value='{}'");try{return await super.arm(input);}finally{this.injectRace=false;}}
 }
 export default {async fetch(request,env){if(new URL(request.url).pathname==='/__test/audit'){const object=env.GUARDIAN.get(env.GUARDIAN.idFromName('simulation:'+${JSON.stringify([policy.previewRef,policy.recoveryRef].sort().join(':'))}));return Response.json(await object.audit());}return base.fetch(request,env);}};`);
 let outbound=0;
 const options={modules:true,scriptPath:fixture,compatibilityDate:'2026-05-27',bindings:{CONTROLLER_MODE:'simulation',CONTROLLER_POLICY_JSON:JSON.stringify(policy),CONTROLLER_OPERATOR_TOKEN:token},durableObjects:{GUARDIAN:{className:'Gate1RecoveryController',useSQLite:true}},durableObjectsPersist:directory,outboundService:()=>{outbound++;throw Error('UNEXPECTED_EXTERNAL_REQUEST');}};
 const mf=new Miniflare(options);t.after(async()=>{await mf.dispose();assert.equal(outbound,0);});await mf.ready;
 const request=(route,body)=>mf.dispatchFetch('https://controller.invalid'+route,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const state=async()=>{const r=await request('/v1/state');assert.equal(r.status,200);return r.json();};
 const audit=async()=> (await request('/__test/audit')).json();
 const reload=async(nextPolicy=policy,extra={})=>mf.setOptions({...options,bindings:{...options.bindings,CONTROLLER_POLICY_JSON:JSON.stringify(nextPolicy),...extra}});
 async function ended(){assert.equal((await request('/v1/arm',packet())).status,200);assert.equal((await request('/v1/command',{runId:'b'.repeat(64),sequence:1,type:'abort'})).status,200);const prior=await state();assert.equal(prior.phase,'ENDED_NO_MUTATION');return prior;}
 return {request,state,audit,reload,ended};
}
test('an existing predecessor is mandatory even when the configured source is unchanged',async t=>{
 const f=await setup(t);await f.ended();const before=await f.audit();assert.equal((await f.request('/v1/arm',packet('f'.repeat(64)))).status,400);assert.deepEqual(await f.audit(),before);
});
test('a pinned successor accepts a new source, retains prior bytes and survives reload',async t=>{
 const f=await setup(t),prior=await f.ended(),binding=pin(prior),before=await f.audit(),nextPolicy={...policy,sourceCommit:'e'.repeat(40)};
 await f.reload(nextPolicy);assert.deepEqual(await f.state(),prior);assert.deepEqual(await f.audit(),before);
 const response=await f.request('/v1/arm',packet('f'.repeat(64),nextPolicy.sourceCommit,binding));assert.equal(response.status,200);
 let audit=await f.audit();assert.equal(audit.rows.length,2);assert.deepEqual(audit.rows.find(r=>r.run_id===prior.runId),before.rows[0]);assert.deepEqual(audit.current.predecessor,binding);assert.equal(audit.current.sourceCommit,nextPolicy.sourceCommit);assert.equal(audit.current.sequence,0);
 assert.equal((await f.request('/v1/command',{runId:'f'.repeat(64),sequence:1,type:'abort'})).status,200);
 const next=await f.state();await f.reload(nextPolicy,{RELOAD_MARKER:'1'});const persisted=await f.audit();assert.equal(persisted.rows.length,2);assert.deepEqual(persisted.rows.find(r=>r.run_id===prior.runId),before.rows[0]);
 for(const id of [prior.runId,next.runId])assert.equal((await f.request('/v1/arm',packet(id,nextPolicy.sourceCommit,pin(next,nextPolicy.sourceCommit)))).status,400);
 audit=await f.audit();assert.deepEqual(audit,persisted);assert.equal(next.gate,'NO-GO');assert.equal(next.formalStopAccepted,false);
});
test('wrong predecessor identity, source or digest leaves current state and used runs intact',async t=>{
 const f=await setup(t),prior=await f.ended(),binding=pin(prior),before=await f.audit();
 for(const change of [{runId:'d'.repeat(64)},{sourceCommit:'e'.repeat(40)},{stateSha256:'0'.repeat(64)},{extra:true}]){
  assert.equal((await f.request('/v1/arm',packet('f'.repeat(64),policy.sourceCommit,{...binding,...change}))).status,400);assert.deepEqual(await f.audit(),before);
 }
 assert.equal((await f.request('/v1/arm',packet('f'.repeat(64),policy.sourceCommit,binding))).status,200);
});
test('policy changes other than source, active predecessors and missing history are rejected',async t=>{
 const f=await setup(t);assert.equal((await f.request('/v1/arm',packet())).status,200);const active=await f.state(),before=await f.audit(),nextPolicy={...policy,sourceCommit:'e'.repeat(40)};
 await f.reload(nextPolicy);assert.equal((await f.request('/v1/state')).status,400);assert.equal((await f.request('/v1/arm',packet('f'.repeat(64),nextPolicy.sourceCommit,pin(active)))).status,400);assert.deepEqual(await f.audit(),before);
 await f.reload();assert.equal((await f.request('/v1/command',{runId:active.runId,sequence:1,type:'abort'})).status,200);const prior=await f.state(),closed=await f.audit();
 await f.reload({...nextPolicy,emergencyPreviewResume:false});assert.equal((await f.request('/v1/state')).status,400);assert.equal((await f.request('/v1/arm',packet('f'.repeat(64),nextPolicy.sourceCommit,pin(prior)))).status,400);assert.deepEqual(await f.audit(),closed);
});
test('a predecessor cannot authorize registration in an empty namespace',async t=>{
 const empty=await setup(t),binding={runId:'b'.repeat(64),sourceCommit:policy.sourceCommit,stateSha256:'c'.repeat(64)};assert.equal((await empty.request('/v1/arm',packet('f'.repeat(64),policy.sourceCommit,binding))).status,400);assert.equal((await empty.audit()).rows.length,0);
});
test('concurrent successors consume one new run and a failed write rolls registration back',async t=>{
 const f=await setup(t),prior=await f.ended(),binding=pin(prior),before=await f.audit();
 await f.reload(policy,{FAIL_SUCCESSOR_WRITE:'1'});assert.equal((await f.request('/v1/arm',packet('f'.repeat(64),policy.sourceCommit,binding))).status,400);assert.deepEqual(await f.audit(),before);
 await f.reload();const results=await Promise.all(['f','e'].map(id=>f.request('/v1/arm',packet(id.repeat(64),policy.sourceCommit,binding))));assert.deepEqual(results.map(r=>r.status).sort(),[200,400]);
 const after=await f.audit();assert.equal(after.rows.length,2);assert.deepEqual(after.rows.find(r=>r.run_id===prior.runId),before.rows[0]);
});
test('predecessor snapshot drift and ledger mismatch reject before consuming a successor',async t=>{
 const f=await setup(t),prior=await f.ended(),binding=pin(prior),before=await f.audit();
 await f.reload(policy,{STALE_SNAPSHOT:'1'});assert.equal((await f.request('/v1/arm',packet('f'.repeat(64),policy.sourceCommit,binding))).status,400);
 const changed=await f.audit();assert.equal(changed.rows.length,1);assert.equal(changed.current.lastNow,before.current.lastNow+1);assert.equal(changed.rows[0].value,JSON.stringify(changed.current));assert.deepEqual(await f.state(),prior);
 await f.reload(policy,{LEDGER_MISMATCH:'1'});assert.equal((await f.request('/v1/arm',packet('f'.repeat(64),policy.sourceCommit,binding))).status,400);
 const mismatch=await f.audit();assert.deepEqual(mismatch.current,changed.current);assert.equal(mismatch.rows.length,1);assert.equal(mismatch.rows[0].value,'{}');
});
test('a restored predecessor retains its consumed pause and restore claims after source transition',async t=>{
 const f=await setup(t);assert.equal((await f.request('/v1/arm',packet())).status,200);
 assert.equal((await f.request('/v1/command',{runId:'b'.repeat(64),sequence:1,type:'pause-preview'})).status,200);
 assert.equal((await f.request('/v1/command',{runId:'b'.repeat(64),sequence:2,type:'abort'})).status,200);
 const prior=await f.state(),before=await f.audit();assert.equal(prior.phase,'RESTORED');assert.deepEqual(Object.values(prior.operations).map(o=>o.attempts),[1,0,0,1]);
 const nextPolicy={...policy,sourceCommit:'e'.repeat(40)};await f.reload(nextPolicy);assert.deepEqual(await f.state(),prior);
 assert.equal((await f.request('/v1/arm',packet('f'.repeat(64),nextPolicy.sourceCommit,pin(prior)))).status,200);
 const after=await f.audit();assert.deepEqual(after.rows.find(r=>r.run_id===prior.runId),before.rows[0]);assert.equal(after.rows.length,2);assert.ok(Object.values(after.current.operations).every(o=>o===null));
 assert.equal((await f.request('/v1/command',{runId:prior.runId,sequence:3,type:'pause-preview'})).status,400);
});
test('the real client carries the frozen predecessor through local workerd into the new run',async t=>{
 const f=await setup(t),prior=await f.ended(),binding=pin(prior),nextPolicy={...policy,sourceCommit:'e'.repeat(40)};await f.reload(nextPolicy);
 const client=createControllerClient({runId:'f'.repeat(64),sourceCommit:nextPolicy.sourceCommit,predecessor:binding,hardEndAt:Date.now()+300000,manifestSha256:'c'.repeat(64),approvedManifestSha256:'c'.repeat(64),observerBindings:Object.fromEntries(['preview','recovery'].map(role=>[role,{sourceBindingSha256:'c'.repeat(64),observerSha256:'d'.repeat(64),bridgeSha256:'e'.repeat(64)}])),stagePlan:{},journal:{append(){}},observeRecoveryStop:async()=>{throw Error('NO_FORMAL_PROOF_FROM_METADATA');},transport:async(route,body)=>{const response=await f.request(route,body);return {status:response.status,body:await response.text()};}});t.after(()=>client.dispose());
 const state=await client.start({sha256:'d'.repeat(64),verifiedAt:Date.now()});assert.equal(state.phase,'ARMED');assert.equal(state.runId,'f'.repeat(64));assert.equal(client.budget().postCount,1);
 assert.equal(await client.stop(),false);assert.equal((await f.state()).phase,'ENDED_NO_MUTATION');assert.equal(client.budget().postCount,2);assert.equal((await f.audit()).rows.length,2);
});
