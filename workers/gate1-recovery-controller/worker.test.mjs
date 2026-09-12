import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Miniflare} from 'miniflare';
import {createHash} from 'node:crypto';
import {predecessorStateText} from './core.mjs';

const policy={mode:'simulation',previewRef:'p'.repeat(20),recoveryRef:'r'.repeat(20),productionRef:'x'.repeat(20),organizationId:'synthetic-org',sourceCommit:'a'.repeat(40),emergencyPreviewResume:true};
const TOKEN='s'.repeat(64),workerPath=fileURLToPath(new URL('./worker.mjs',import.meta.url));
async function setup(t,extra={},runtime={}){
  await fs.mkdir('.tmp',{recursive:true});const persist=await fs.mkdtemp(path.resolve('.tmp/gate1-controller-test-'));
  let outbound=0;
  const options={modules:true,scriptPath:workerPath,compatibilityDate:'2026-05-27',bindings:{CONTROLLER_MODE:'simulation',CONTROLLER_POLICY_JSON:JSON.stringify(policy),CONTROLLER_OPERATOR_TOKEN:TOKEN,...extra},
    durableObjects:{GUARDIAN:{className:'Gate1RecoveryController',useSQLite:true}},durableObjectsPersist:persist,
    outboundService:runtime.outboundService??(()=>{outbound++;throw Error('UNEXPECTED_EXTERNAL_REQUEST');}),...(runtime.scriptPath?{scriptPath:runtime.scriptPath}:{})};
  const mf=new Miniflare(options);t.after(async()=>{await mf.dispose();assert.equal(outbound,0);});await mf.ready;
  async function request(route,body,token=TOKEN){return mf.dispatchFetch('https://controller.invalid'+route,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)})});}
  const arm=(run='b'.repeat(64),duration=300000,predecessor)=>request('/v1/arm',{runId:run,sourceCommit:policy.sourceCommit,hardEndAt:Date.now()+duration,preservationSha256:'c'.repeat(64),preservationVerifiedAt:Date.now(),acknowledgeEmergencyContainment:true,...(predecessor?{predecessor}:{})});
  const command=(sequence,type,extra={})=>request('/v1/command',{runId:'b'.repeat(64),sequence,type,...extra});
  return {mf,options,request,arm,command};
}
async function eventually(read,predicate,limit=16000){const start=Date.now();let value;do{value=await read();if(predicate(value))return value;await new Promise(r=>setTimeout(r,250));}while(Date.now()-start<limit);assert.fail('expected terminal controller state; actual phase='+value?.phase);}

test('disabled mode and authentication reject requests before creating operational state',async t=>{
  const f=await setup(t,{CONTROLLER_MODE:'disabled'});assert.equal((await f.arm()).status,503);
  const g=await setup(t);assert.equal((await g.request('/v1/state',undefined,'bad')).status,401);assert.equal((await g.request('/unbound')).status,404);
  assert.equal((await g.arm()).status,200);assert.equal((await g.arm()).status,400);
});
test('SQLite claims reject concurrent duplicate commands and persist across object reload',async t=>{
  const f=await setup(t);assert.equal((await f.arm()).status,200);
  const results=await Promise.all([f.command(1,'pause-preview'),f.command(1,'pause-preview')]);assert.deepEqual(results.map(r=>r.status).sort(),[200,400]);
  let state=await (await f.request('/v1/state')).json();assert.equal(state.operations.previewPause.attempts,1);assert.equal(state.projects.preview,'INACTIVE');
  await f.mf.setOptions({...f.options,bindings:{...f.options.bindings,RELOAD_MARKER:'1'}});
  assert.equal((await f.command(1,'pause-preview')).status,400);state=await (await f.request('/v1/state')).json();assert.equal(state.operations.previewPause.attempts,1);
  assert.equal((await f.command(2,'abort')).status,200);
  state=await eventually(async()=> (await f.request('/v1/state')).json(),s=>s.phase==='RESTORED');assert.equal(state.operations.previewResume.attempts,1);
});
test('actual alarm ends a short simulation after client disappearance, without external traffic',async t=>{
  const f=await setup(t);assert.equal((await f.arm('b'.repeat(64),2500)).status,200);
  assert.equal((await f.command(1,'pause-preview')).status,200);
  assert.equal((await f.command(2,'resume-recovery',{evidenceSha256:'d'.repeat(64)})).status,200);
  const state=await eventually(async()=> (await f.request('/v1/state')).json(),s=>s.phase==='RESTORED');
  assert.deepEqual(Object.values(state.operations).map(x=>x.attempts),[1,1,1,1]);assert.equal(state.gate,'NO-GO');assert.equal(state.formalStopAccepted,false);
  const serialized=JSON.stringify(state);for(const secret of [TOKEN,policy.previewRef,policy.recoveryRef,policy.organizationId])assert.ok(!serialized.includes(secret));
});
test('canonical commands reject duplicate fields and policy/target injection',async t=>{
  const f=await setup(t);assert.equal((await f.arm()).status,200);
  assert.equal((await f.request('/v1/command','{"runId":"'+('b'.repeat(64))+'","sequence":1,"type":"abort","type":"pause-preview"}')).status,400);
  assert.equal((await f.command(1,'pause-preview',{projectRef:policy.productionRef})).status,400);
  assert.equal((await f.command(1,'abort')).status,200);
  const state=await (await f.request('/v1/state')).json();assert.equal(state.phase,'ENDED_NO_MUTATION');assert.equal(state.operations.previewPause.attempts,0);
});

test('read-only state polling does not refresh the lease or authorize wrong runs',async t=>{
  const f=await setup(t);await f.arm();
  const before=await (await f.request('/v1/state')).json();
  await new Promise(r=>setTimeout(r,30));
  assert.equal((await f.command(1,'progress',{runId:'e'.repeat(64),evidenceSha256:'d'.repeat(64)})).status,400);
  assert.equal((await f.request('/v1/command','x'.repeat(8193))).status,400);
  assert.equal((await f.request('/v1/state?type=pause-preview')).status,404);
  const after=await (await f.request('/v1/state')).json();assert.equal(after.leaseEnd,before.leaseEnd);assert.equal(after.sequence,0);
  await f.command(1,'abort');
  assert.equal((await f.arm()).status,400);
  const prior=await (await f.request('/v1/state')).json(),predecessor={runId:prior.runId,sourceCommit:policy.sourceCommit,stateSha256:createHash('sha256').update(predecessorStateText(prior)).digest('hex')};
  assert.equal((await f.arm('f'.repeat(64),300000,predecessor)).status,200);
});

test('simulation rejects live credentials and policy drift cannot create a second owner',async t=>{
  const invalid=await setup(t,{SUPABASE_SCOPED_TOKEN:'sbp_fc'+'z'.repeat(50)});assert.equal((await invalid.arm()).status,400);
  const f=await setup(t);await f.arm();await f.command(1,'pause-preview');
  const swapped={...policy,previewRef:policy.recoveryRef,recoveryRef:policy.previewRef};
  await f.mf.setOptions({...f.options,bindings:{...f.options.bindings,CONTROLLER_POLICY_JSON:JSON.stringify(swapped)}});
  assert.equal((await f.arm('f'.repeat(64))).status,400);
  await f.mf.setOptions(f.options);assert.equal((await f.command(2,'abort')).status,200);
});

test('a lost provider reply consumes its claim and cleanup never retries it',async t=>{
  const livePolicy={...policy,mode:'live'},projects={preview:'ACTIVE_HEALTHY',recovery:'INACTIVE'},mutations=[];let reads=0;
  const f=await setup(t,{CONTROLLER_MODE:'live',CONTROLLER_POLICY_JSON:JSON.stringify(livePolicy),SUPABASE_SCOPED_TOKEN:'sbp_fc'+'z'.repeat(50)},{
    outboundService:async request=>{
      const url=new URL(request.url);assert.equal(url.origin,'https://api.supabase.com');
      const match=/^\/v1\/projects\/([a-z]{20})(\/pause|\/restore)?$/.exec(url.pathname);assert.ok(match);
      const role=match[1]===policy.previewRef?'preview':match[1]===policy.recoveryRef?'recovery':null;assert.ok(role);
      if(request.method==='GET'){reads++;return Response.json({id:policy[role+'Ref'],organization_id:policy.organizationId,region:'ap-northeast-1',status:projects[role],database:{host:'db.'+policy[role+'Ref']+'.supabase.co',postgres_engine:'17'}});}
      assert.equal(request.method,'POST');mutations.push(role+match[2]);projects[role]=match[2]==='/pause'?'INACTIVE':'ACTIVE_HEALTHY';
      // The server applied Preview pause, but its reply was lost/invalid.
      return role==='preview'&&match[2]==='/pause'?new Response('private upstream detail',{status:503}):Response.json({});
    },
  });
  const armed=await f.arm();assert.equal(armed.status,200,JSON.stringify({reads,state:await (await f.request('/v1/state')).json()}));assert.equal((await f.command(1,'pause-preview')).status,200);
  await f.mf.setOptions({...f.options,bindings:{...f.options.bindings,RELOAD_MARKER:'lost-reply'}});
  const state=await eventually(async()=> (await f.request('/v1/state')).json(),s=>s.phase==='RESTORED');
  assert.equal(state.operations.previewPause.outcome,'UNKNOWN');assert.deepEqual(mutations,['preview/pause','preview/restore']);
  assert.equal((await f.command(2,'pause-preview')).status,400);assert.equal(mutations.length,2);
  const swapped={...livePolicy,previewRef:livePolicy.recoveryRef,recoveryRef:livePolicy.previewRef};
  await f.mf.setOptions({...f.options,bindings:{...f.options.bindings,CONTROLLER_POLICY_JSON:JSON.stringify(swapped)}});
  const readsBefore=reads;assert.equal((await f.arm('f'.repeat(64))).status,400);assert.equal(reads,readsBefore);assert.equal(mutations.length,2);
});

test('a real SQLite write failure prevents any mutation attempt',async t=>{
  await fs.mkdir('.tmp',{recursive:true});
  const folder=await fs.mkdtemp(path.resolve('.tmp/gate1-storage-fault-')),fixture=path.join(folder,'worker.mjs');
  const relative=path.relative(folder,workerPath).replaceAll('\\','/');
  await fs.writeFile(fixture,`export {default} from ${JSON.stringify(relative)};import {Gate1RecoveryController as Base} from ${JSON.stringify(relative)};
export class Gate1RecoveryController extends Base {write(state){
  if(state.operations.previewPause)this.sql.exec("SELECT * FROM deliberately_missing_claim_storage");
  return super.write(state);
}}`);
  const f=await setup(t,{}, {scriptPath:fixture});assert.equal((await f.arm()).status,200);
  assert.equal((await f.command(1,'pause-preview')).status,400);
  const state=await (await f.request('/v1/state')).json();assert.equal(state.operations.previewPause.attempts,0);assert.equal(state.projects.preview,'ACTIVE_HEALTHY');
  assert.equal((await f.command(2,'abort')).status,200);
});

test('accepted progress observes asynchronous live transitions without replaying a mutation',async t=>{
  const livePolicy={...policy,mode:'live'},projects={preview:'ACTIVE_HEALTHY',recovery:'INACTIVE'},mutations=[];let reads=0,unknown=false;
  const f=await setup(t,{CONTROLLER_MODE:'live',CONTROLLER_POLICY_JSON:JSON.stringify(livePolicy),SUPABASE_SCOPED_TOKEN:'sbp_fc'+'z'.repeat(50)},{
    outboundService:async request=>{
      const url=new URL(request.url);assert.equal(url.origin,'https://api.supabase.com');
      const match=/^\/v1\/projects\/([a-z]{20})(\/pause|\/restore)?$/.exec(url.pathname);assert.ok(match);
      const role=match[1]===policy.previewRef?'preview':match[1]===policy.recoveryRef?'recovery':null;assert.ok(role);
      if(request.method==='GET'){
        reads++;if(unknown)return new Response('unavailable',{status:503});
        return Response.json({id:policy[role+'Ref'],organization_id:policy.organizationId,region:'ap-northeast-1',status:projects[role],database:{host:'db.'+policy[role+'Ref']+'.supabase.co',postgres_engine:'17'}});
      }
      assert.equal(request.method,'POST');mutations.push(role+match[2]);
      projects[role]=match[2]==='/pause'?'PAUSING':'COMING_UP';return Response.json({});
    },
  });
  assert.equal((await f.arm()).status,200);assert.equal((await f.command(1,'pause-preview')).status,200);
  const paused=await (await f.request('/v1/state')).json();assert.equal(paused.projects.preview,'PAUSING');
  const beforeReads=reads;projects.preview='INACTIVE';
  const polled=await (await f.request('/v1/state')).json();assert.equal(reads,beforeReads);assert.equal(polled.leaseEnd,paused.leaseEnd);assert.equal(polled.projects.preview,'PAUSING');
  // A completed independent stopping-evidence stage supplies a fresh digest.
  assert.equal((await f.command(2,'progress',{evidenceSha256:'d'.repeat(64)})).status,200);
  let state=await (await f.request('/v1/state')).json();assert.equal(state.projects.preview,'INACTIVE');assert.equal(reads,beforeReads+2);
  assert.deepEqual(mutations,['preview/pause']);assert.equal(state.hardEndAt,paused.hardEndAt);
  const acceptedReads=reads;
  assert.equal((await f.command(2,'progress',{evidenceSha256:'d'.repeat(64)})).status,400);
  assert.equal((await f.command(3,'progress',{evidenceSha256:'d'.repeat(64)})).status,400);assert.equal(reads,acceptedReads);
  assert.equal((await f.command(3,'resume-recovery',{evidenceSha256:'e'.repeat(64)})).status,200);
  state=await (await f.request('/v1/state')).json();assert.equal(state.projects.recovery,'COMING_UP');
  projects.recovery='ACTIVE_HEALTHY';unknown=true;
  assert.equal((await f.command(4,'progress',{evidenceSha256:'f'.repeat(64)})).status,200);
  state=await (await f.request('/v1/state')).json();assert.equal(state.projects.recovery,'UNKNOWN');assert.deepEqual(mutations,['preview/pause','recovery/restore']);
  unknown=false;
  assert.equal((await f.command(5,'progress',{evidenceSha256:'1'.repeat(64)})).status,200);
  state=await (await f.request('/v1/state')).json();assert.equal(state.projects.recovery,'ACTIVE_HEALTHY');
  assert.equal(state.hardEndAt,paused.hardEndAt);assert.deepEqual(Object.values(state.operations).map(x=>x.attempts),[1,1,0,0]);
  assert.equal(state.gate,'NO-GO');assert.equal(state.formalStopAccepted,false);
  assert.equal((await f.command(6,'finish')).status,200);assert.deepEqual(mutations,['preview/pause','recovery/restore','recovery/pause']);
  projects.recovery='INACTIVE';
  await eventually(async()=> (await f.request('/v1/state')).json(),s=>s.operations.previewResume.attempts===1);
  projects.preview='ACTIVE_HEALTHY';
  state=await eventually(async()=> (await f.request('/v1/state')).json(),s=>s.phase==='RESTORED');
  assert.deepEqual(mutations,['preview/pause','recovery/restore','recovery/pause','preview/restore']);
  assert.deepEqual(Object.values(state.operations).map(x=>x.attempts),[1,1,1,1]);assert.equal(state.formalStopAccepted,false);
});
