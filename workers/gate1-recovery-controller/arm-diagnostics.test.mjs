import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Miniflare} from 'miniflare';
import {createRun} from './core.mjs';

const NOW=1800000000000,TOKEN='s'.repeat(64),SENSITIVE='PRIVATE_DIAGNOSTIC_SENTINEL';
const policy={mode:'simulation',previewRef:'p'.repeat(20),recoveryRef:'r'.repeat(20),productionRef:'x'.repeat(20),organizationId:'synthetic-org',sourceCommit:'a'.repeat(40),emergencyPreviewResume:true};
const input=(now=Date.now())=>({runId:'b'.repeat(64),sourceCommit:policy.sourceCommit,hardEndAt:now+300000,preservationSha256:'c'.repeat(64),preservationVerifiedAt:now,acknowledgeEmergencyContainment:true});
const workerPath=fileURLToPath(new URL('./worker.mjs',import.meta.url));

async function setup(t,{bindings={},methods=''}={}){
  await fs.mkdir('.tmp',{recursive:true});const folder=await fs.mkdtemp(path.resolve('.tmp/gate1-arm-diagnostics-'));
  let scriptPath=workerPath,outbound=0;
  if(methods){
    scriptPath=path.join(folder,'worker.mjs');const relative=path.relative(folder,workerPath).replaceAll('\\','/');
    await fs.writeFile(scriptPath,`export {default} from ${JSON.stringify(relative)};import {Gate1RecoveryController as Base} from ${JSON.stringify(relative)};export class Gate1RecoveryController extends Base {${methods}}`);
  }
  const mf=new Miniflare({modules:true,scriptPath,compatibilityDate:'2026-05-27',
    bindings:{CONTROLLER_MODE:'simulation',CONTROLLER_POLICY_JSON:JSON.stringify(policy),CONTROLLER_OPERATOR_TOKEN:TOKEN,...bindings},
    durableObjects:{GUARDIAN:{className:'Gate1RecoveryController',useSQLite:true}},durableObjectsPersist:folder,
    outboundService:()=>{outbound++;throw Error('EXTERNAL_FORBIDDEN');}});
  t.after(async()=>{await mf.dispose();assert.equal(outbound,0);});await mf.ready;
  const request=(route,body,token=TOKEN)=>mf.dispatchFetch('https://controller.invalid'+route,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)})});
  return {request,state:async()=> (await request('/v1/state')).json()};
}
async function rejected(response,diagnostic){
  assert.equal(response.status,400);const body=await response.json();
  assert.deepEqual(body,{error:'CONTROLLER_REJECTED',diagnostic});
  const serialized=JSON.stringify(body);for(const value of [TOKEN,SENSITIVE,policy.previewRef,policy.sourceCommit,input(NOW).runId])assert.ok(!serialized.includes(value));
}

test('arm diagnostics identify strict one-millisecond freshness and input boundaries',()=>{
  const cases=[
    [{extra:SENSITIVE},'ARM_INPUT_INVALID'],[{runId:[]},'ARM_INPUT_INVALID'],
    [{sourceCommit:'d'.repeat(40)},'ARM_SOURCE_MISMATCH'],
    [{preservationVerifiedAt:NOW+1},'ARM_PRESERVATION_IN_FUTURE'],
    [{preservationVerifiedAt:NOW-300001},'ARM_PRESERVATION_STALE'],
    [{hardEndAt:NOW},'ARM_DEADLINE_INVALID'],[{hardEndAt:NOW+1800001},'ARM_DEADLINE_INVALID'],
    [{acknowledgeEmergencyContainment:false},'ARM_ACKNOWLEDGEMENT_REQUIRED'],
  ];
  for(const [change,armDiagnostic] of cases){
    assert.throws(()=>createRun(policy,{...input(NOW),...change},NOW),error=>error.message==='CONTROLLER_REJECTED'&&error.armDiagnostic===armDiagnostic);
  }
  assert.equal(createRun(policy,input(NOW),NOW).phase,'ARMED');
  assert.equal(createRun(policy,{...input(NOW),preservationVerifiedAt:NOW-300000,hardEndAt:NOW+1800000},NOW).phase,'ARMED');
});

test('authenticated simulation separates packet, source and future-time rejection over real RPC',async t=>{
  const f=await setup(t),before=await f.state();
  await rejected(await f.request('/v1/arm',JSON.stringify(input())+' '),'ARM_PACKET');
  await rejected(await f.request('/v1/arm',{...input(),sourceCommit:'d'.repeat(40)}),'ARM_SOURCE_MISMATCH');
  await rejected(await f.request('/v1/arm',{...input(),preservationVerifiedAt:Date.now()+10000}),'ARM_PRESERVATION_IN_FUTURE');
  assert.deepEqual(await f.state(),before);
  const accepted=await f.request('/v1/arm',input());assert.equal(accepted.status,200);assert.equal(Object.hasOwn(await accepted.json(),'diagnostic'),false);
  await f.request('/v1/command',{runId:input().runId,sequence:1,type:'abort'});
});

test('a real arm SQLite failure is distinguishable and leaves the registration transaction rolled back',async t=>{
  const f=await setup(t,{methods:"write(){this.sql.exec('SELECT * FROM deliberate_arm_storage_fault');}"});
  const before=await f.state();await rejected(await f.request('/v1/arm',input()),'ARM_STORAGE');assert.deepEqual(await f.state(),before);
});

test('alarm setup failure retains registered state and is never reported as an unused run',async t=>{
  const f=await setup(t,{methods:`async schedule(){throw Error(${JSON.stringify(SENSITIVE)});}`});
  await rejected(await f.request('/v1/arm',input()),'ARM_ALARM');
  const state=await f.state();assert.equal(state.phase,'ARMED');assert.deepEqual(Object.values(state.operations).map(op=>op.attempts),[0,0,0,0]);
});

test('initial observation failure retains its ended run while reporting a fixed stage',async t=>{
  const f=await setup(t,{methods:`provider(){return {read:async()=>{throw Error(${JSON.stringify(SENSITIVE)});}};}`});
  await rejected(await f.request('/v1/arm',input()),'ARM_INITIAL_OBSERVATION');
  const state=await f.state();assert.equal(state.phase,'ENDED_NO_MUTATION');assert.deepEqual(Object.values(state.operations).map(op=>op.attempts),[0,0,0,0]);
});

test('unknown RPC error properties and messages cannot become response diagnostics',async t=>{
  const f=await setup(t,{methods:`async arm(){throw Object.assign(Error(${JSON.stringify(SENSITIVE)}),{controllerDiagnostic:${JSON.stringify(SENSITIVE)}});}`});
  await rejected(await f.request('/v1/arm',input()),'ARM_RPC');assert.equal((await f.state()).phase,'UNARMED');
});

test('live, unauthorized, disabled and command failures keep their existing response contract',async t=>{
  const live=await setup(t,{bindings:{CONTROLLER_MODE:'live',CONTROLLER_POLICY_JSON:JSON.stringify({...policy,mode:'live'}),SUPABASE_SCOPED_TOKEN:'sbp_fc'+'z'.repeat(50)}});
  assert.deepEqual(await (await live.request('/v1/arm',{...input(),sourceCommit:'d'.repeat(40)})).json(),{error:'CONTROLLER_REJECTED'});
  const disabled=await setup(t,{bindings:{CONTROLLER_MODE:'disabled'}}),off=await disabled.request('/v1/arm',input());assert.equal(off.status,503);assert.deepEqual(await off.json(),{error:'DISABLED'});
  const f=await setup(t),unauthorized=await f.request('/v1/arm',input(),'invalid');assert.equal(unauthorized.status,401);assert.deepEqual(await unauthorized.json(),{error:'UNAUTHORIZED'});
  assert.deepEqual(await (await f.request('/v1/command',{runId:input().runId,sequence:1,type:'abort'})).json(),{error:'CONTROLLER_REJECTED'});
  const invalid=await setup(t,{bindings:{CONTROLLER_POLICY_JSON:'invalid'}});
  assert.deepEqual(await (await invalid.request('/v1/arm',input())).json(),{error:'CONTROLLER_REJECTED'});
});
