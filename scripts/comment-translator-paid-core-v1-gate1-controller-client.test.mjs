import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import {EventEmitter} from 'node:events';
import {Miniflare} from 'miniflare';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createControllerClient,openControllerClientJournal,createControllerHttpsTransport} from './lib/comment-translator-paid-core-v1-gate1-controller-client.mjs';
import {verifyControllerStopProof} from './lib/comment-translator-paid-core-v1-gate1-controller-proof.mjs';
import {proofFixture} from './fixtures/gate1-controller-proof.mjs';
import {createRun,command,observe,claim,settle,publicState,tick,nextAction} from '../workers/gate1-recovery-controller/core.mjs';
import {createRehearsalExecutor,REHEARSAL_IDENTITY_SQL} from './lib/comment-translator-paid-core-v1-gate1-rehearsal-executor.mjs';
import {REHEARSAL_TRANSFER_TABLES,REHEARSAL_READBACK_SQL} from './lib/comment-translator-paid-core-v1-gate1-rehearsal-transfer.mjs';
const observerBindings=Object.fromEntries(['preview','recovery'].map(role=>[role,{sourceBindingSha256:'c'.repeat(64),observerSha256:'d'.repeat(64),bridgeSha256:'e'.repeat(64)}]));
const policy={mode:'live',previewRef:'p'.repeat(20),recoveryRef:'r'.repeat(20),productionRef:'x'.repeat(20),organizationId:'synthetic-org',sourceCommit:'a'.repeat(40),emergencyPreviewResume:true};
function fixture(t,overrides={},serverOffsetMs=0){
 let clock=Date.now(),remote=null,proofs=0;const calls=[],rows=[],projects={preview:'ACTIVE_HEALTHY',recovery:'INACTIVE'},scheduled=new Map();let nextTimer=0;
 const timers={setTimeout(fn,ms){const id=++nextTimer;scheduled.set(id,{fn,ms});return id;},clearTimeout(id){scheduled.delete(id);}};
 const serverClock=()=>clock+serverOffsetMs;
 const manage=()=>{for(const role of ['preview','recovery'])observe(remote,role,{status:projects[role],startedAt:serverClock(),completedAt:serverClock()},serverClock());};
 const transport=async(route,body)=>{
  calls.push({route,body});if(route==='/v1/arm'){remote=createRun(policy,body,serverClock());manage();}
  if(route==='/v1/command'){
   command(remote,body,serverClock());manage();const op=remote.requested??nextAction(remote,serverClock());
   if(op){claim(remote,op,serverClock());projects[op.startsWith('preview')?'preview':'recovery']=op.endsWith('Pause')?'INACTIVE':'ACTIVE_HEALTHY';settle(remote,op,'ACCEPTED',serverClock());manage();}
  }
  if(remote)tick(remote,serverClock());return {status:200,body:JSON.stringify(remote?publicState(remote):{phase:'UNARMED',gate:'NO-GO',formalStopAccepted:false})};
 };
 const options={runId:'b'.repeat(64),sourceCommit:policy.sourceCommit,hardEndAt:clock+1200000,observerBindings,manifestSha256:'c'.repeat(64),approvedManifestSha256:'c'.repeat(64),transport,journal:{append:r=>rows.push(r)},observeRecoveryStop:async()=>{proofs++;clock+=10000;return verifyControllerStopProof(proofFixture('recovery',clock).encode());},stagePlan:{'synthetic-transfer':r=>r?.status==='SYNTHETIC_TRANSFER_VERIFIED','configuration-closed':r=>r?.status==='CONFIGURATION_READBACK_MATCHED'},now:()=>clock,timers,...overrides};
 const client=createControllerClient(options);t.after(()=>client.dispose());
 return {client,calls,rows,options,scheduled,clock:()=>clock,advance:ms=>{clock+=ms;},remote:()=>remote,proofs:()=>proofs,transport,
  start:()=>client.start({sha256:'d'.repeat(64),verifiedAt:clock}),
  async resumed(){await this.start();await client.pausePreview();clock+=10000;const proof=verifyControllerStopProof(proofFixture('preview',clock).encode());await client.resumeRecovery(proof);},
 };
}
test('requires exact explicit manifest approval before any I/O',t=>{
 let calls=0;assert.throws(()=>fixture(t,{approvedManifestSha256:null,transport:()=>{calls++;}}));assert.equal(calls,0);
 for(const origin of ['http://v-streamer-tools-gate1-recovery-controller-live.example.workers.dev','https://other.example.workers.dev','https://v-streamer-tools-gate1-recovery-controller-live.example.workers.dev/','https://v-streamer-tools-gate1-recovery-controller-live.example.workers.dev@evil.test'])assert.throws(()=>createControllerHttpsTransport({origin,operatorToken:'s'.repeat(64)}));
});
test('controller observation clocks can lead the local receipt without granting extra lease time',async t=>{
 const f=fixture(t,{},283);const startedAt=f.clock();const state=await f.start();
 assert.equal(state.phase,'ARMED');assert.equal(state.projectObservedAt.preview,startedAt+283);
 assert.equal(f.rows.some(r=>r.event==='HTTP_UNCONFIRMED'),false);
 assert.ok([...f.scheduled.values()].some(timer=>timer.ms===120000));
 const calls=f.calls.length;f.advance(120000);await assert.rejects(f.client.pausePreview());assert.equal(f.calls.length,calls);
});
test('lease time is bounded from POST dispatch, including reply delay and a newly accepted command',async t=>{
 const f=fixture(t,{},283);
 const client=createControllerClient({...f.options,transport:async(route,body)=>{const response=await f.transport(route,body);if(body!==undefined)f.advance(1500);return response;}});t.after(()=>client.dispose());
 await client.start({sha256:'d'.repeat(64),verifiedAt:f.clock()});
 assert.ok([...f.scheduled.values()].some(timer=>timer.ms===118500));
 f.advance(1000);await client.pausePreview();
 assert.ok([...f.scheduled.values()].some(timer=>timer.ms===118500));
 f.advance(118499);await client.observeClosure();
 const calls=f.calls.length;f.advance(1);const proof=verifyControllerStopProof(proofFixture('preview',f.clock()).encode());await assert.rejects(client.resumeRecovery(proof));assert.equal(f.calls.length,calls);
 assert.ok([...f.scheduled.values()].every(timer=>timer.ms!==120283));
});
test('an earlier remote lease and the absolute local deadline remain conservative bounds',async t=>{
 const behind=fixture(t,{},-283);await behind.client.start({sha256:'d'.repeat(64),verifiedAt:behind.clock()-1000});
 assert.ok([...behind.scheduled.values()].some(timer=>timer.ms===119717));
 let calls=behind.calls.length;behind.advance(119717);await assert.rejects(behind.client.pausePreview());assert.equal(behind.calls.length,calls);
 const bounded=fixture(t,{},283),client=createControllerClient({...bounded.options,hardEndAt:bounded.clock()+1000});t.after(()=>client.dispose());
 await client.start({sha256:'d'.repeat(64),verifiedAt:bounded.clock()});assert.ok([...bounded.scheduled.values()].some(timer=>timer.ms===1000));
 calls=bounded.calls.length;bounded.advance(1000);await assert.rejects(client.pausePreview());assert.equal(bounded.calls.length,calls);
});
test('observation timestamp shape and local clock regression still fail closed',async t=>{
 for(const invalid of [-1,1.5,Number.MAX_SAFE_INTEGER+1,'283']){
  const f=fixture(t),client=createControllerClient({...f.options,transport:async(route,body)=>{const response=await f.transport(route,body);if(body!==undefined){const state=JSON.parse(response.body);state.projectObservedAt.preview=invalid;response.body=JSON.stringify(state);}return response;}});t.after(()=>client.dispose());
  await assert.rejects(client.start({sha256:'d'.repeat(64),verifiedAt:f.clock()}));assert.equal(f.calls.length,2);assert.equal(f.calls.filter(c=>c.body?.type).length,0);
 }
 const f=fixture(t,{},283);await f.start();const calls=f.calls.length;f.advance(-1);await assert.rejects(f.client.pausePreview());assert.equal(f.calls.length,calls);
});
const canonicalState=value=>value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonicalState(value[key])])):value;
const predecessorPin=state=>({runId:state.runId,sourceCommit:policy.sourceCommit,stateSha256:createHash('sha256').update(JSON.stringify(canonicalState(state))).digest('hex')});
async function endedFixture(t){const f=fixture(t);await f.start();await f.transport('/v1/command',{runId:f.options.runId,sequence:1,type:'abort'});f.client.dispose();return f;}
test('an explicitly pinned predecessor starts a distinct run without adopting its sequence or lease',async t=>{
 const f=await endedFixture(t),prior=publicState(f.remote()),pin=predecessorPin(prior),expected=structuredClone(pin);let client;
 client=createControllerClient({...f.options,runId:'f'.repeat(64),predecessor:pin,transport:async(route,body)=>{if(body){assert.equal(client.state(),null);assert.deepEqual(body.predecessor,expected);}return f.transport(route,body);}});t.after(()=>client.dispose());
 pin.runId='e'.repeat(64);pin.stateSha256='0'.repeat(64);
 const result=await client.start({sha256:'d'.repeat(64),verifiedAt:f.clock()});
 assert.equal(result.runId,'f'.repeat(64));assert.equal(result.sequence,0);assert.equal(result.phase,'ARMED');assert.equal(client.budget().postCount,1);
 assert.deepEqual(f.remote().predecessor,expected);assert.equal(f.rows.filter(r=>r.event==='PREDECESSOR_ACCEPTED').length,1);
});
test('missing, stale or unsafe predecessor state cannot reach a new arm',async t=>{
 for(const mode of ['missing','wrong-digest','wrong-run','armed','closing','needs-operator','unknown-project','pending-operation']){
  const f=await endedFixture(t),prior=publicState(f.remote());
  if(mode==='armed')f.remote().phase='ARMED';
  if(mode==='closing')f.remote().phase='CLOSING';
  if(mode==='needs-operator')f.remote().phase='NEEDS_OPERATOR';
  if(mode==='unknown-project')f.remote().observed.recovery.status='UNKNOWN';
  if(mode==='pending-operation')f.remote().operations.previewPause={attemptedAt:f.clock(),outcome:'PENDING'};
  const pin=predecessorPin(publicState(f.remote()));if(mode==='wrong-digest')pin.stateSha256='0'.repeat(64);if(mode==='wrong-run')pin.runId='e'.repeat(64);
  const client=createControllerClient({...f.options,runId:'f'.repeat(64),...(mode==='missing'?{}:{predecessor:pin})});t.after(()=>client.dispose());
  const count=f.calls.filter(c=>c.route==='/v1/arm').length;await assert.rejects(client.start({sha256:'d'.repeat(64),verifiedAt:f.clock()}));
  assert.equal(f.calls.filter(c=>c.route==='/v1/arm').length,count);assert.equal(client.state(),null);assert.equal(prior.phase,'ENDED_NO_MUTATION');
 }
});
test('a predecessor cannot be silently ignored on empty history or reuse the new run identity',async t=>{
 const f=fixture(t),pin={runId:'f'.repeat(64),sourceCommit:policy.sourceCommit,stateSha256:'d'.repeat(64)};
 for(const value of [{...pin,runId:f.options.runId},{...pin,extra:true},{...pin,sourceCommit:'bad'},{}])assert.throws(()=>createControllerClient({...f.options,predecessor:value}));
 const client=createControllerClient({...f.options,predecessor:pin});t.after(()=>client.dispose());await assert.rejects(client.start({sha256:'d'.repeat(64),verifiedAt:f.clock()}));assert.equal(f.calls.length,1);
});
test('native HTTPS uses one bound request, keeps redirects unaccepted and cancels partial or oversized responses',async t=>{
 for(const mode of ['complete','redirect','partial','oversized','cancel'])await t.test(mode,async t=>{
  const controller=new AbortController();let requests=0,destroyed=0;
  t.mock.method(https,'request',(url,options,callback)=>{
   requests++;assert.equal(url,'https://v-streamer-tools-gate1-recovery-controller-live.fixture.workers.dev/v1/state');assert.equal(options.method,'GET');assert.equal(options.rejectUnauthorized,true);assert.equal(options.headers.Authorization,'Bearer '+'s'.repeat(64));
   const request=new EventEmitter();request.destroy=()=>{destroyed++;};request.end=()=>queueMicrotask(()=>{
    if(mode==='cancel'){controller.abort();return;}
    const response=new EventEmitter();response.statusCode=mode==='redirect'?302:200;response.complete=mode!=='partial';response.destroy=()=>{};callback(response);response.emit('data',Buffer.from(mode==='oversized'?'x'.repeat(16385):'{}'));response.emit('end');
   });return request;
  });
  const transport=createControllerHttpsTransport({origin:'https://v-streamer-tools-gate1-recovery-controller-live.fixture.workers.dev',operatorToken:'s'.repeat(64)});
  const operation=transport('/v1/state',undefined,{signal:controller.signal});
  if(['complete','redirect'].includes(mode)){const result=await operation;assert.equal(result.status,mode==='redirect'?302:200);assert.equal(destroyed,0);}else{await assert.rejects(operation,/CONTROLLER_HTTP_REJECTED/);assert.equal(destroyed,1);}
  assert.equal(requests,1);
 });
});
test('formal Preview proof is required before progress and a distinct resume authority digest',async t=>{
 const f=fixture(t);await f.start();await f.client.pausePreview();
 await assert.rejects(f.client.resumeRecovery({formalStopAccepted:true}),/CONTROLLER_.*REJECTED/);
 assert.equal(f.calls.filter(c=>c.body?.type==='resume-recovery').length,0);
 f.advance(10000);const proof=verifyControllerStopProof(proofFixture('preview',f.clock()).encode());await f.client.resumeRecovery(proof);
 const commands=f.calls.filter(c=>c.route==='/v1/command').map(c=>c.body);assert.deepEqual(commands.map(c=>c.type),['pause-preview','progress','resume-recovery']);assert.notEqual(commands[1].evidenceSha256,commands[2].evidenceSha256);
 await assert.rejects(f.client.resumeRecovery(proof));assert.equal(commands.length,3);
});
test('owned stage failure calls one abort and requires independent formal Recovery proof',async t=>{
 const f=fixture(t);await f.resumed();let observedSignal;
 await assert.rejects(f.client.runStage('synthetic-transfer',async({signal,stop})=>{observedSignal=signal;assert.equal(await stop(),true);throw Error('synthetic uncertain commit');}));
 assert.equal(observedSignal.aborted,true);assert.equal(f.proofs(),1);assert.equal(await f.client.stop(),true);assert.equal(f.proofs(),1);
 assert.equal(f.calls.filter(c=>c.body?.type==='abort').length,1);assert.equal(f.rows.filter(r=>r.event==='STAGE_ACCEPTED'&&r.stage==='synthetic-transfer').length,0);
});
test('RESTORED metadata alone cannot confirm the executor stop hook',async t=>{
 const f=fixture(t,{observeRecoveryStop:async()=>({phase:'RESTORED',formalStopAccepted:true})});await f.resumed();assert.equal(await f.client.stop(),false);assert.equal(f.rows.at(-1).event,'RECOVERY_FORMAL_STOP_UNCONFIRMED');
});
test('lost command response is recorded once; dependent work stops and abort uses fresh sequence',async t=>{
 const f=fixture(t);const original=f.options.transport;
 const transport=async(route,body,args)=>{const response=await original(route,body,args);if(body?.type==='pause-preview')throw Error('response lost after commit');return response;};
 const client=createControllerClient({...f.options,transport});t.after(()=>client.dispose());await client.start({sha256:'d'.repeat(64),verifiedAt:f.clock()});
 await assert.rejects(client.pausePreview());await assert.rejects(client.pausePreview());assert.equal(await client.stop(),true);
 assert.deepEqual(f.calls.filter(c=>c.body?.type).map(c=>[c.body.type,c.body.sequence]),[['pause-preview',1],['abort',2]]);
 assert.equal(f.rows.filter(r=>r.event==='HTTP_UNCONFIRMED'&&r.method==='POST').length,1);
});
test('passive polling does not refresh the lease and closing aborts an active stage',async t=>{
 const f=fixture(t);await f.resumed();const before=f.client.state().leaseEnd;
 let signal;const stage=f.client.runStage('synthetic-transfer',({signal:s})=>{signal=s;return new Promise(()=>{});});
 for(let i=0;i<10&&!signal;i++)await new Promise(r=>setImmediate(r));assert.ok(signal);
 const monitor=[...f.scheduled.values()].find(x=>x.ms===20000);assert.ok(monitor);await monitor.fn();assert.equal(f.client.state().leaseEnd,before);
 f.advance(120001);await monitor.fn();await assert.rejects(stage);assert.equal(signal.aborted,true);
 assert.equal(f.calls.filter(c=>c.body?.type==='progress').length,1);
});
test('durable journal refuses restart, preserves partial claims and writes before HTTP',async t=>{
 fs.mkdirSync('.tmp',{recursive:true});const dir=fs.mkdtempSync(path.resolve('.tmp/gate1-client-journal-')),run='a'.repeat(64);
 const ledger=openControllerClientJournal(dir,run);ledger.append({event:'HTTP_ATTEMPT'});ledger.close();assert.throws(()=>openControllerClientJournal(dir,run));
 const file=path.join(dir,'client-'+run+'.jsonl');fs.appendFileSync(file,'partial');assert.throws(()=>openControllerClientJournal(dir,run));
 const f=fixture(t,{journal:{append:()=>{throw Error('disk failed');}}});await assert.rejects(f.start());assert.equal(f.calls.length,0);
});
test('GET allowance is bounded and reserves cleanup capacity',async t=>{
 const f=fixture(t);await f.start();for(let i=f.client.budget().getCount;i<96;i++)await f.client.observeClosure();
 await assert.rejects(f.client.observeClosure());assert.equal(f.calls.filter(c=>c.body===undefined).length,96);
});
test('successful stages attest once; finish also requires a formal proof and consumes no abort',async t=>{
 const f=fixture(t);await f.resumed();const result={status:'SYNTHETIC_TRANSFER_VERIFIED',stageAuthority:false,gate:'NO-GO'};
 assert.deepEqual(await f.client.runStage('synthetic-transfer',async()=>result),result);
 await assert.rejects(f.client.runStage('synthetic-transfer',async()=>result));
 assert.equal(await f.client.finish(),true);assert.equal(await f.client.stop(),true);
 assert.equal(f.calls.filter(c=>c.body?.type==='finish').length,1);assert.equal(f.calls.filter(c=>c.body?.type==='abort').length,0);
});
test('same-source proof from a different run or observer cannot authorize resume',async t=>{
 const f=fixture(t);await f.start();await f.client.pausePreview();f.advance(10000);
 for(const key of ['runId','sourceBindingSha256','observerSha256','bridgeSha256']){
  const p=proofFixture('preview',f.clock());p.expected[key]='1'.repeat(64);for(const row of p.rows)row[key]=p.expected[key];if(key!=='bridgeSha256')p.terminal[key]=p.expected[key];
  const proof=verifyControllerStopProof(p.encode());await assert.rejects(f.client.resumeRecovery(proof));
 }
 assert.equal(f.calls.filter(c=>c.body?.type==='resume-recovery').length,0);
});
test('fresh stage verification failure does not attest progress',async t=>{
 const f=fixture(t);await f.resumed();await assert.rejects(f.client.runStage('synthetic-transfer',async()=>({status:'NOT_VERIFIED'})));
 assert.equal(f.calls.filter(c=>c.body?.type==='progress').length,1);assert.equal(f.calls.filter(c=>c.body?.type==='abort').length,1);
});
test('POST budget leaves one cleanup command and never starts another stage after exhaustion',async t=>{
 const stagePlan=Object.fromEntries(Array.from({length:32},(_,i)=>['stage-'+i,r=>r?.done===true]));const f=fixture(t,{stagePlan});await f.resumed();
 let passed=0;for(let i=0;i<32;i++){try{await f.client.runStage('stage-'+i,async()=>({done:true,index:i}));passed++;}catch{break;}}
 assert.equal(passed,27);assert.equal(f.client.budget().postCount,32);assert.equal(f.calls.filter(c=>c.body?.type==='abort').length,1);assert.equal(f.calls.filter(c=>c.body!==undefined).length,32);
});
test('formal stop observer is cancelled at the cleanup deadline',async t=>{
 let signal;const f=fixture(t,{observeRecoveryStop:async({signal:s})=>{signal=s;return new Promise(()=>{});}});await f.resumed();
 const stopped=f.client.stop();for(let i=0;i<20&&!signal;i++)await new Promise(r=>setImmediate(r));assert.ok(signal);
 const timer=[...f.scheduled.values()].find(x=>x.ms===600000);assert.ok(timer);await timer.fn();assert.equal(await stopped,false);assert.equal(signal.aborted,true);
});
test('unsolicited command sequences and passive lease extensions cannot become new client authority',async t=>{
 for(const mutation of ['sequence','lease']){
  const f=fixture(t);await f.start();if(mutation==='sequence')f.remote().sequence++;else f.remote().leaseEnd++;
  await assert.rejects(f.client.pausePreview());assert.equal(await f.client.stop(),false);assert.equal(f.calls.filter(c=>c.body?.type).length,0);
 }
});
test('real workerd live adapter closes after client stage failure with four provider claims once',async t=>{
 fs.mkdirSync('.tmp',{recursive:true});const persist=fs.mkdtempSync(path.resolve('.tmp/gate1-client-workerd-')),token='s'.repeat(64),mutations=[],projects={preview:'ACTIVE_HEALTHY',recovery:'INACTIVE'};
 const mf=new Miniflare({modules:true,scriptPath:fileURLToPath(new URL('../workers/gate1-recovery-controller/worker.mjs',import.meta.url)),compatibilityDate:'2026-05-27',bindings:{CONTROLLER_MODE:'live',CONTROLLER_POLICY_JSON:JSON.stringify(policy),CONTROLLER_OPERATOR_TOKEN:token,SUPABASE_SCOPED_TOKEN:'sbp_fc'+'z'.repeat(50)},durableObjects:{GUARDIAN:{className:'Gate1RecoveryController',useSQLite:true}},durableObjectsPersist:persist,
  outboundService:async request=>{const url=new URL(request.url);assert.equal(url.origin,'https://api.supabase.com');const match=/^\/v1\/projects\/([a-z]{20})(\/pause|\/restore)?$/.exec(url.pathname);assert.ok(match);const role=match[1]===policy.previewRef?'preview':match[1]===policy.recoveryRef?'recovery':null;assert.ok(role);
   if(request.method==='GET')return Response.json({id:policy[role+'Ref'],organization_id:policy.organizationId,region:'ap-northeast-1',status:projects[role],database:{host:'db.'+policy[role+'Ref']+'.supabase.co',postgres_engine:'17'}});
   assert.equal(request.method,'POST');mutations.push(role+match[2]);projects[role]=match[2]==='/pause'?'INACTIVE':'ACTIVE_HEALTHY';return Response.json({});},
 });t.after(()=>mf.dispose());await mf.ready;
 let offset=0;const now=()=>Date.now()+offset;const rows=[];
 const client=createControllerClient({runId:'b'.repeat(64),sourceCommit:policy.sourceCommit,hardEndAt:now()+1200000,observerBindings,manifestSha256:'c'.repeat(64),approvedManifestSha256:'c'.repeat(64),now,
  journal:{append:r=>rows.push(r)},stagePlan:{'synthetic-transfer':r=>r?.status==='SYNTHETIC_TRANSFER_VERIFIED'},
  transport:async(route,body)=>{const response=await mf.dispatchFetch('https://controller.invalid'+route,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,body:await response.text()};},
  observeRecoveryStop:async()=>{offset+=10000;return verifyControllerStopProof(proofFixture('recovery',now()).encode());},
 });t.after(()=>client.dispose());await client.start({sha256:'d'.repeat(64),verifiedAt:now()});await client.pausePreview();offset+=10000;await client.resumeRecovery(verifyControllerStopProof(proofFixture('preview',now()).encode()));
 const ids=[1,2,3].map(i=>'00000000-0000-4000-8000-'+String(i).padStart(12,'0'));
 const packet={scope:'LOCAL_SYNTHETIC_ONLY',managedShapeSha256:'2c7ef5df6baeae47ac2dd21b566e77177578cc2aa7c36d5921866434f4bc2d4c',targetBaselineSha256:createHash('sha256').update('{"tables":{}}').digest('hex'),userIds:ids,tables:REHEARSAL_TRANSFER_TABLES.map(name=>({name,columns:[{name:name==='auth.users'?'id':'user_id',type:'uuid',generated:''}],rows:name==='auth.users'?ids.map((id,i)=>({id,email:['magiclink','recovery','email_change'][i]+'@example.test'})):name.startsWith('public.')?ids.map(user_id=>({user_id})):[]}))};
 let nativeClaims=0,nativeStops=0,nativeStopConfirmed=false;
 await assert.rejects(client.runStage('synthetic-transfer',async({signal,timeoutMs,stop})=>{
  const executor=createRehearsalExecutor({requiresTls:true,verify:()=>true,claim:()=>{nativeClaims++;return true;},stop:async()=>{nativeStops++;return stop();},execute:async sql=>{
   if(sql===REHEARSAL_IDENTITY_SQL)return JSON.stringify({role:'postgres',database:'postgres',superuser:false,serverMajor:17,tls:true});
   if(sql===REHEARSAL_READBACK_SQL)return '{"tables":{}}';throw Error('synthetic lost commit response');
  }});
  try{return await executor.run(packet,{signal,timeoutMs,assertFreshFixtures:()=>true});}catch(error){nativeStopConfirmed=error.stopConfirmed;throw error;}
 }));
 assert.equal(nativeClaims,1);assert.equal(nativeStops,1);assert.equal(nativeStopConfirmed,true);
 const deadline=Date.now()+16000;let state;do{state=await client.observeClosure();if(state.phase==='RESTORED')break;await new Promise(r=>setTimeout(r,250));}while(Date.now()<deadline);
 assert.equal(state.phase,'RESTORED');assert.deepEqual(mutations,['preview/pause','recovery/restore','recovery/pause','preview/restore']);assert.equal(state.sequence,4);assert.equal(state.formalStopAccepted,false);assert.equal(rows.filter(r=>r.event==='CLOSE_ATTEMPT').length,1);
});
