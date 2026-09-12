import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Miniflare,Log,LogLevel} from 'miniflare';
import {createRun,publicState} from './core.mjs';
import {GRANT_HEADER,previewUnknownClosureStateText,safeClosureGrantText,sha256Text,grantSha256,policySha256} from './safe-closure.mjs';
import {createControllerClient} from '../../scripts/lib/comment-translator-paid-core-v1-gate1-controller-client.mjs';
import {verifyControllerStopProof} from '../../scripts/lib/comment-translator-paid-core-v1-gate1-controller-proof.mjs';
import {proofFixture} from '../../scripts/fixtures/gate1-controller-proof.mjs';

const token='s'.repeat(64),workerPath=fileURLToPath(new URL('./worker.mjs',import.meta.url));
const policy={mode:'simulation',previewRef:'p'.repeat(20),recoveryRef:'r'.repeat(20),productionRef:'x'.repeat(20),organizationId:'synthetic-org',sourceCommit:'a'.repeat(40),emergencyPreviewResume:true};
function priorState(p){const now=Date.now(),s=createRun(p,{runId:'b'.repeat(64),sourceCommit:p.sourceCommit,hardEndAt:now-1200000,preservationSha256:'c'.repeat(64),preservationVerifiedAt:now-1800000,acknowledgeEmergencyContainment:true},now-1800000);Object.assign(s,{phase:'RESTORED',reason:'MUTATION_OUTCOME_UNKNOWN',cleanupEnd:now-600000,sequence:2});for(const op of ['previewPause','previewResume'])s.operations[op]={attemptedAt:now-1500000,outcome:'UNKNOWN'};for(const role of ['preview','recovery'])s.observed[role]={status:role==='preview'?'ACTIVE_HEALTHY':'INACTIVE',startedAt:now-1400000,completedAt:now-1400000};return s;}
async function setup(t,{mode='simulation',sameSource=false,empty=false,alterPrior,bindings={},outbound}={}){
 const oldPolicy={...policy,mode},nextPolicy={...oldPolicy,sourceCommit:sameSource?oldPolicy.sourceCommit:'e'.repeat(40)},prior=priorState(oldPolicy);if(alterPrior)alterPrior(prior);
 // Hash any synthetic malformed profile independently for rejection tests.
 const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
 const predecessor={runId:prior.runId,sourceCommit:prior.sourceCommit,stateSha256:await sha256Text(JSON.stringify(canonical(publicState(prior))))},now=Date.now();
 const grant={schemaVersion:1,kind:'PREVIEW_ONLY_UNKNOWN_SAFE_CLOSURE_V1',grantId:'d'.repeat(64),predecessor,successor:{runId:'f'.repeat(64),sourceCommit:nextPolicy.sourceCommit,hardEndAt:now+900000,manifestSha256:'1'.repeat(64)},policySha256:await policySha256(nextPolicy),approvalSha256:'2'.repeat(64),closureEvidenceSha256:'3'.repeat(64),issuedAt:now,expiresAt:now+300000};
 const text=safeClosureGrantText(grant),digest=await grantSha256(text);
 await fs.mkdir('.tmp',{recursive:true});const directory=await fs.mkdtemp(path.resolve('.tmp/gate1-safe-closure-worker-')),fixture=path.join(directory,'fixture.mjs'),relative=path.relative(directory,workerPath).replaceAll('\\','/');
 await fs.writeFile(fixture,`import base,{Gate1RecoveryController as Base} from ${JSON.stringify(relative)};
 export class Gate1RecoveryController extends Base {
  constructor(ctx,env){if(env.FAULT==='schema')ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS safe_closure_transitions (grant_id TEXT PRIMARY KEY, unexpected TEXT)');super(ctx,env);this.reads=0;this.mutations=[];}
  seed(){if(this.read())throw Error('ALREADY_SEEDED');const s=${JSON.stringify(prior)};this.sql.exec('INSERT INTO used_runs(run_id,value) VALUES(?,?)',s.runId,JSON.stringify(s));super.write(s);this.sql.exec("INSERT INTO simulation(role,status) VALUES('preview','ACTIVE_HEALTHY'),('recovery','INACTIVE')");}
  audit(){return {current:super.read(),rows:this.sql.exec('SELECT run_id,value FROM used_runs ORDER BY run_id').toArray(),grants:this.sql.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='safe_closure_transitions'").toArray().length?this.sql.exec('SELECT * FROM safe_closure_transitions ORDER BY grant_id').toArray():[],reads:this.reads,mutations:this.mutations};}
  uniqueConstraints(){const row=this.sql.exec('SELECT * FROM safe_closure_transitions').toArray()[0];let rejected=0;for(const key of ['grant_id','prior_run_id','successor_run_id','grant_sha256']){const copy={...row,grant_id:'new-grant',prior_run_id:'new-prior',successor_run_id:'new-successor',grant_sha256:'new-digest',[key]:row[key]};try{this.ctx.storage.transactionSync(()=>{this.sql.exec('INSERT INTO safe_closure_transitions(grant_id,prior_run_id,successor_run_id,grant_sha256,grant_json,prior_state_json,closure_evidence_sha256,registered_at) VALUES(?,?,?,?,?,?,?,?)',copy.grant_id,copy.prior_run_id,copy.successor_run_id,copy.grant_sha256,copy.grant_json,copy.prior_state_json,copy.closure_evidence_sha256,copy.registered_at);throw Error('UNEXPECTED_CONSTRAINT_ACCEPTANCE');});}catch(e){if(!e.message.includes('UNIQUE constraint failed'))throw e;rejected++;}}return {rejected};}
  read(){const s=super.read();if(this.injectRace&&s){this.injectRace=false;const changed=structuredClone(s);changed.lastNow++;super.write(changed);}return s;}
  write(s){super.write(s);if(this.env.FAULT==='current-write'&&s.safeClosureTransition)this.sql.exec('SELECT * FROM deliberate_closure_current_fault');}
  async schedule(){if(this.env.FAULT==='alarm'&&super.read()?.safeClosureTransition)throw Error('SYNTHETIC_ALARM_FAULT');return super.schedule();}
  provider(p){const provider=super.provider(p);return {read:async role=>{this.reads++;const result=await provider.read(role);if(this.env.FAULT==='grant-drift')this.env.CONTROLLER_SAFE_CLOSURE_GRANT_JSON='invalid';if(this.env.FAULT==='metadata'||this.env.FAULT==='initial-observation'&&super.read()?.safeClosureTransition)result.status='UNKNOWN';if(this.env.FAULT==='stale-metadata')result.startedAt=result.completedAt=Date.now()-10001;if(this.env.FAULT==='deadline-drift'&&role==='recovery'){this.clockBefore=Date.now;const end=JSON.parse(this.env.CONTROLLER_SAFE_CLOSURE_GRANT_JSON).expiresAt;Date.now=()=>end;}return result;},mutate:async op=>{this.mutations.push(op);return provider.mutate(op);}};}
  async arm(input){this.injectRace=this.env.FAULT==='state-drift';if(this.env.FAULT==='ledger-mismatch')this.sql.exec("UPDATE used_runs SET value='{}'");if(this.env.FAULT==='ledger-missing')this.sql.exec('DELETE FROM used_runs');
   if(['grant-insert','run-insert'].includes(this.env.FAULT)){const table=this.env.FAULT==='grant-insert'?'safe_closure_transitions':'used_runs';this.sql.exec("CREATE TRIGGER fail_insert BEFORE INSERT ON "+table+" BEGIN SELECT RAISE(ABORT, 'deliberate closure failure'); END");}
   try{return await super.arm(input);}finally{this.injectRace=false;if(this.clockBefore)Date.now=this.clockBefore;}}
  async state(envelope){this.injectRace=this.env.STATE_DRIFT==='1';try{return await super.state(envelope);}finally{this.injectRace=false;}}
  wake(){return this.alarm();}
 }
 export default {async fetch(request,env){const route=new URL(request.url).pathname;if(route.startsWith('/__test/')){const object=env.GUARDIAN.get(env.GUARDIAN.idFromName(${JSON.stringify(mode+':'+[policy.previewRef,policy.recoveryRef].sort().join(':'))}));if(route==='/__test/seed'){await object.seed();return new Response('ok');}if(route==='/__test/wake'){await object.wake();return new Response('ok');}if(route==='/__test/unique')return Response.json(await object.uniqueConstraints());return Response.json(await object.audit());}return base.fetch(request,env);}};`);
 let outboundCalls=0;
 const options={modules:true,scriptPath:fixture,compatibilityDate:'2026-05-27',log:new Log(LogLevel.NONE),bindings:{CONTROLLER_MODE:mode,CONTROLLER_POLICY_JSON:JSON.stringify(nextPolicy),CONTROLLER_OPERATOR_TOKEN:token,CONTROLLER_SAFE_CLOSURE_GRANT_JSON:text,...(mode==='live'?{SUPABASE_SCOPED_TOKEN:'sbp_fc'+'z'.repeat(50)}:{}),...bindings},durableObjects:{GUARDIAN:{className:'Gate1RecoveryController',useSQLite:true}},durableObjectsPersist:directory,outboundService:request=>{outboundCalls++;if(outbound)return outbound(request);throw Error('EXTERNAL_FORBIDDEN');}};
 const mf=new Miniflare(options);t.after(async()=>{await mf.dispose();if(!outbound)assert.equal(outboundCalls,0);});await mf.ready;
 const request=(route,body,auth=token)=>mf.dispatchFetch('https://controller.invalid'+route,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+auth,'Content-Type':'application/json'},...(body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)})});
 if(!empty)assert.equal((await request('/__test/seed')).status,200);
 const audit=async()=> (await request('/__test/audit')).json();
 const reload=async(extra={})=>mf.setOptions({...options,bindings:{...options.bindings,...extra}});
 const packet=()=>({runId:grant.successor.runId,sourceCommit:nextPolicy.sourceCommit,hardEndAt:grant.successor.hardEndAt,preservationSha256:'c'.repeat(64),preservationVerifiedAt:Date.now(),acknowledgeEmergencyContainment:true,predecessor,safeClosure:{grantSha256:digest,manifestSha256:grant.successor.manifestSha256}});
 const arm=()=>request('/v1/arm',packet()),command=(sequence,type,extra={})=>request('/v1/command',{runId:grant.successor.runId,sequence,type,...extra});
 return {request,audit,reload,packet,arm,command,grant,digest,text,prior,nextPolicy};
}
const ledger=a=>({current:a.current,rows:a.rows,grants:a.grants});

test('configured closure GET returns the bound digest with an unchanged 12-field state and no writes',async t=>{
 for(const sameSource of [false,true]){const f=await setup(t,{sameSource}),before=await f.audit(),response=await f.request('/v1/state');assert.equal(response.status,200);assert.equal(response.headers.get(GRANT_HEADER),f.digest);assert.deepEqual(await response.json(),publicState(f.prior));assert.deepEqual(await f.audit(),before);
 const unauthorized=await f.request('/v1/state',undefined,'invalid');assert.equal(unauthorized.status,401);assert.equal(unauthorized.headers.get(GRANT_HEADER),null);
 await f.reload({CONTROLLER_MODE:'disabled'});const disabled=await f.request('/v1/state');assert.equal(disabled.status,503);assert.equal(disabled.headers.get(GRANT_HEADER),null);
 }
});

test('one closure arm preserves prior bytes, records the grant, resets all new counters and survives reload',async t=>{
 const f=await setup(t),before=await f.audit();assert.equal((await f.arm()).status,200);const a=await f.audit();assert.equal(a.rows.length,2);assert.deepEqual(a.rows.find(r=>r.run_id===f.prior.runId),before.rows[0]);assert.equal(a.current.sequence,0);assert.ok(Object.values(a.current.operations).every(o=>o===null));assert.equal(a.grants.length,1);assert.equal(a.grants[0].grant_json,f.text);assert.equal(a.grants[0].prior_state_json,previewUnknownClosureStateText(publicState(f.prior)));assert.equal(a.current.safeClosureTransition.grantSha256,f.digest);assert.equal(a.reads,4);assert.deepEqual(a.mutations,[]);
 const state=await f.request('/v1/state');assert.equal(state.headers.get(GRANT_HEADER),null);assert.equal(Object.keys(await state.json()).length,12);assert.equal((await f.arm()).status,400);
 await f.reload({RELOAD_MARKER:'retained'});assert.deepEqual(ledger(await f.audit()),ledger(a));assert.equal((await f.arm()).status,400);
});

test('missing, malformed, unbound or implicit grants cannot admit UNKNOWN and normal same-policy GET is retained',async t=>{
 const f=await setup(t,{sameSource:true}),before=await f.audit();
 for(const text of ['',undefined,'{}',f.text+' ']){await f.reload({CONTROLLER_SAFE_CLOSURE_GRANT_JSON:text??''});const r=await f.request('/v1/state');assert.equal(r.status,200);assert.equal(r.headers.get(GRANT_HEADER),null);assert.equal((await f.arm()).status,400);assert.deepEqual(ledger(await f.audit()),ledger(before));}
 await f.reload();const implicit=f.packet();delete implicit.safeClosure;assert.equal((await f.request('/v1/arm',implicit)).status,400);
 for(const update of [{safeClosure:{grantSha256:'0'.repeat(64),manifestSha256:'1'.repeat(64)}},{safeClosure:{grantSha256:f.digest,manifestSha256:'0'.repeat(64)}},{hardEndAt:f.grant.successor.hardEndAt+1},{runId:'9'.repeat(64)},{predecessor:{...f.grant.predecessor,stateSha256:'0'.repeat(64)}}])assert.equal((await f.request('/v1/arm',{...f.packet(),...update})).status,400);
 assert.deepEqual(ledger(await f.audit()),ledger(before));assert.equal((await f.audit()).reads,0);
});

test('safe closure rejects an empty namespace and ordinary or out-of-profile predecessors',async t=>{
 for(const options of [{empty:true},{alterPrior:s=>{s.operations.previewPause.outcome='ACCEPTED';s.operations.previewResume.outcome='ACCEPTED';}},{alterPrior:s=>s.operations.recoveryResume={attemptedAt:1,outcome:'UNKNOWN'}},{alterPrior:s=>s.phase='NEEDS_OPERATOR'},{alterPrior:s=>s.phase='CLOSING'}]){const f=await setup(t,options),before=await f.audit();assert.equal((await f.arm()).status,400);assert.deepEqual(await f.audit(),before);}
});

test('expired grants allow fixed old-state GET only and cannot admit a new run',async t=>{
 const f=await setup(t),expired=safeClosureGrantText({...f.grant,issuedAt:Date.now()-400000,expiresAt:Date.now()-100000});await f.reload({CONTROLLER_SAFE_CLOSURE_GRANT_JSON:expired});const r=await f.request('/v1/state');assert.equal(r.status,200);assert.equal(r.headers.get(GRANT_HEADER),await grantSha256(expired));const p=f.packet();p.safeClosure.grantSha256=await grantSha256(expired);assert.equal((await f.request('/v1/arm',p)).status,400);assert.equal((await f.audit()).grants.length,0);
});

test('metadata, state, ledger, grant and deadline drift reject before registration or mutation',async t=>{
 for(const fault of ['metadata','stale-metadata','state-drift','ledger-mismatch','ledger-missing','grant-drift','deadline-drift']){const f=await setup(t,{bindings:{FAULT:fault}}),before=await f.audit();assert.equal((await f.arm()).status,400,fault);const a=await f.audit();assert.equal(a.grants.length,0);assert.ok(a.rows.length<=1);assert.equal(a.current.runId,f.prior.runId);assert.deepEqual(a.mutations,[]);if(!['state-drift','ledger-mismatch','ledger-missing'].includes(fault))assert.deepEqual(ledger(a),ledger(before));}
 const f=await setup(t,{bindings:{STATE_DRIFT:'1'}});assert.equal((await f.request('/v1/state')).status,400);assert.equal((await f.audit()).grants.length,0);
});

test('real SQLite failures at each write roll back grant, new run and current slot together',async t=>{
 for(const fault of ['grant-insert','run-insert','current-write']){const f=await setup(t,{bindings:{FAULT:fault}}),before=await f.audit();assert.equal((await f.arm()).status,400,fault);const a=await f.audit();assert.deepEqual(ledger(a),ledger(before));assert.deepEqual(a.mutations,[]);}
});

test('concurrent or lost-response replay can consume only one registration',async t=>{
 const f=await setup(t),before=await f.audit();const responses=await Promise.all([f.arm(),f.arm()]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,400]);assert.equal((await f.arm()).status,400);const a=await f.audit();assert.equal(a.grants.length,1);assert.equal(a.rows.length,2);assert.deepEqual(a.rows.find(r=>r.run_id===f.prior.runId),before.rows[0]);assert.deepEqual(a.mutations,[]);
});

test('all four audit identities have real SQLite uniqueness constraints and unknown schemas fail initialization',async t=>{
 const f=await setup(t);assert.equal((await f.arm()).status,200);const before=await f.audit();assert.deepEqual(await (await f.request('/__test/unique')).json(),{rejected:4});assert.deepEqual(await f.audit(),before);
 const unknown=await setup(t,{empty:true,bindings:{FAULT:'schema'}}),response=await unknown.request('/v1/state');assert.equal(response.status,400);assert.deepEqual(await response.json(),{error:'CONTROLLER_REJECTED',diagnostic:'STATE_INITIALIZATION'});
});

test('post-registration failures consume the grant and malformed or removed grants do not prevent closure',async t=>{
 for(const fault of ['alarm','initial-observation']){const f=await setup(t,{bindings:{FAULT:fault}});assert.equal((await f.arm()).status,400);let a=await f.audit();assert.equal(a.grants.length,1);assert.equal(a.rows.length,2);assert.equal(a.current.runId,f.grant.successor.runId);await f.reload({FAULT:'',CONTROLLER_SAFE_CLOSURE_GRANT_JSON:'invalid'});if(a.current.phase==='ARMED')assert.equal((await f.command(1,'abort')).status,200);a=await f.audit();assert.equal(a.current.phase,'ENDED_NO_MUTATION');assert.equal(a.grants.length,1);assert.equal((await f.arm()).status,400);}
 const f=await setup(t);assert.equal((await f.arm()).status,200);assert.equal((await f.command(1,'pause-preview')).status,200);await f.reload({CONTROLLER_SAFE_CLOSURE_GRANT_JSON:''});assert.equal((await f.command(2,'abort')).status,200);const a=await f.audit();assert.equal(a.current.phase,'RESTORED');assert.deepEqual(Object.values(a.current.operations).map(o=>o?1:0),[1,0,0,1]);assert.equal(a.grants.length,1);
});

test('a live provider fixture validates targets before admission without dispatching any mutation',async t=>{
 let reads=0;const f=await setup(t,{mode:'live',outbound:request=>{assert.equal(request.method,'GET');reads++;const id=new URL(request.url).pathname.split('/').at(-1);assert.ok([policy.previewRef,policy.recoveryRef].includes(id));return Response.json({id,organization_id:'wrong-org',region:'ap-northeast-1',status:id===policy.previewRef?'ACTIVE_HEALTHY':'INACTIVE',database:{host:'db.'+id+'.supabase.co',postgres_engine:'17'}});}});assert.equal((await f.arm()).status,400);assert.equal(reads,2);const a=await f.audit();assert.equal(a.rows.length,1);assert.equal(a.grants.length,0);assert.deepEqual(a.mutations,[]);
});

test('the real client, independent synthetic proofs and reload complete all four claims after closure transition',async t=>{
 const mutations=[],projects={preview:'ACTIVE_HEALTHY',recovery:'INACTIVE'};
 const f=await setup(t,{mode:'live',outbound:request=>{const url=new URL(request.url);assert.equal(url.origin,'https://api.supabase.com');const match=/^\/v1\/projects\/([a-z]{20})(\/pause|\/restore)?$/.exec(url.pathname);assert.ok(match);const role=match[1]===policy.previewRef?'preview':match[1]===policy.recoveryRef?'recovery':null;assert.ok(role);if(request.method==='GET')return Response.json({id:policy[role+'Ref'],organization_id:policy.organizationId,region:'ap-northeast-1',status:projects[role],database:{host:'db.'+policy[role+'Ref']+'.supabase.co',postgres_engine:'17'}});assert.equal(request.method,'POST');mutations.push(role+match[2]);projects[role]=match[2]==='/pause'?'INACTIVE':'ACTIVE_HEALTHY';return new Response(null,{status:200});}}),before=await f.audit();
 let offset=0;const now=()=>Date.now()+offset;
 const proof=target=>{const fixture=proofFixture(target,now());for(const row of [fixture.expected,...fixture.rows,fixture.terminal]){row.runId=f.grant.successor.runId;row.sourceCommit=f.nextPolicy.sourceCommit;}return verifyControllerStopProof(fixture.encode());};
 const client=createControllerClient({runId:f.grant.successor.runId,sourceCommit:f.nextPolicy.sourceCommit,predecessor:f.grant.predecessor,safeClosureGrant:f.text,hardEndAt:f.grant.successor.hardEndAt,manifestSha256:f.grant.successor.manifestSha256,approvedManifestSha256:f.grant.successor.manifestSha256,now,journal:{append(){}},stagePlan:{},observerBindings:Object.fromEntries(['preview','recovery'].map(role=>[role,{sourceBindingSha256:'c'.repeat(64),observerSha256:'d'.repeat(64),bridgeSha256:'e'.repeat(64)}])),observeRecoveryStop:async()=>{offset+=10000;return proof('recovery');},transport:async(route,body)=>{const r=await f.request(route,body);return {status:r.status,body:await r.text(),safeClosureGrantSha256:r.headers.get(GRANT_HEADER)};}});t.after(()=>client.dispose());
 await client.start({sha256:'c'.repeat(64),verifiedAt:now()});await client.pausePreview();await f.reload({CONTROLLER_SAFE_CLOSURE_GRANT_JSON:'invalid'});assert.equal((await f.request('/__test/wake')).status,200);offset+=10000;await client.resumeRecovery(proof('preview'));assert.equal(await client.stop(),true);
 const deadline=Date.now()+16000;let state;do{state=await client.observeClosure();if(state.phase==='RESTORED')break;await new Promise(r=>setTimeout(r,250));}while(Date.now()<deadline);
 assert.equal(state.phase,'RESTORED');assert.deepEqual(mutations,['preview/pause','recovery/restore','recovery/pause','preview/restore']);assert.ok(Object.values(state.operations).every(o=>o.attempts===1&&o.outcome==='ACCEPTED'));assert.equal(state.formalStopAccepted,false);assert.equal(state.gate,'NO-GO');
 const a=await f.audit();assert.equal(a.grants.length,1);assert.deepEqual(a.rows.find(r=>r.run_id===f.prior.runId),before.rows[0]);assert.equal((await f.command(state.sequence,'abort')).status,400);await f.request('/__test/wake');await f.reload({CONTROLLER_SAFE_CLOSURE_GRANT_JSON:''});assert.deepEqual(ledger(await f.audit()),ledger(a));assert.equal((await f.arm()).status,400);assert.equal(mutations.length,4);
});
