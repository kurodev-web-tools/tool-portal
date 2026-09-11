import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Miniflare,Log,LogLevel} from 'miniflare';

const TOKEN='s'.repeat(64),SENSITIVE='PRIVATE_STATE_DIAGNOSTIC_SENTINEL';
const policy={mode:'simulation',previewRef:'p'.repeat(20),recoveryRef:'r'.repeat(20),productionRef:'x'.repeat(20),organizationId:'synthetic-org',sourceCommit:'a'.repeat(40),emergencyPreviewResume:true};
const workerPath=fileURLToPath(new URL('./worker.mjs',import.meta.url));
async function setup(t,{methods='',worker='',bindings={}}={}){
  await fs.mkdir('.tmp',{recursive:true});const folder=await fs.mkdtemp(path.resolve('.tmp/gate1-state-diagnostics-'));
  const relative=path.relative(folder,workerPath).replaceAll('\\','/');
  const scriptPath=path.join(folder,'worker.mjs');
  await fs.writeFile(scriptPath,`import worker from ${JSON.stringify(relative)};import {Gate1RecoveryController as Base} from ${JSON.stringify(relative)};
export class Gate1RecoveryController extends Base {${methods}}
${worker||'export default worker;'}`);
  let outbound=0;
  const mf=new Miniflare({modules:true,scriptPath,compatibilityDate:'2026-05-27',log:new Log(LogLevel.NONE),
    bindings:{CONTROLLER_MODE:'simulation',CONTROLLER_POLICY_JSON:JSON.stringify(policy),CONTROLLER_OPERATOR_TOKEN:TOKEN,...bindings},
    durableObjects:{GUARDIAN:{className:'Gate1RecoveryController',useSQLite:true}},durableObjectsPersist:folder,
    outboundService:()=>{outbound++;throw Error('EXTERNAL_FORBIDDEN');}});
  t.after(async()=>{await mf.dispose();assert.equal(outbound,0);});await mf.ready;
  const request=(route='/v1/state',body,token=TOKEN)=>mf.dispatchFetch('https://controller.invalid'+route,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  return {request,state:async()=> (await request()).json()};
}
async function rejected(response,diagnostic){
  assert.equal(response.status,400);const body=await response.json();
  assert.deepEqual(body,{error:'CONTROLLER_REJECTED',diagnostic});
  for(const value of [TOKEN,SENSITIVE,policy.previewRef,policy.recoveryRef,policy.organizationId,policy.sourceCommit])assert.equal(JSON.stringify(body).includes(value),false);
}

test('state SQLite read failure is classified through real RPC and a later read remains UNARMED',async t=>{
  const f=await setup(t,{methods:"read(){if(!this.faultConsumed){this.faultConsumed=true;this.sql.exec('SELECT * FROM deliberate_state_read_fault');}return super.read();}"});
  await rejected(await f.request(),'STATE_STORAGE');assert.deepEqual(await f.state(),{phase:'UNARMED',gate:'NO-GO',formalStopAccepted:false});
});

test('object configuration rejection including disabled-mode drift is distinct from caller configuration',async t=>{
  const f=await setup(t,{methods:"constructor(ctx,env){super(ctx,{...env,CONTROLLER_MODE:'disabled'});}async state(){try{return await super.state();}finally{this.env.CONTROLLER_MODE='simulation';}}"});
  await rejected(await f.request(),'STATE_CONFIGURATION');assert.equal((await f.state()).phase,'UNARMED');
  const invalid=await setup(t,{bindings:{CONTROLLER_POLICY_JSON:'invalid'}});
  assert.deepEqual(await (await invalid.request()).json(),{error:'CONTROLLER_REJECTED'});
});

test('stored policy mismatch and public-state projection failure identify their own boundaries',async t=>{
  const mismatch=await setup(t,{methods:`read(){if(!this.faultConsumed){this.faultConsumed=true;return {policy:{...${JSON.stringify(policy)},sourceCommit:'d'.repeat(40)}};}return super.read();}`});
  await rejected(await mismatch.request(),'STATE_POLICY');assert.equal((await mismatch.state()).phase,'UNARMED');
  const projection=await setup(t,{methods:`read(){if(!this.faultConsumed){this.faultConsumed=true;return {policy:${JSON.stringify(policy)},operations:null};}return super.read();}`});
  await rejected(await projection.request(),'STATE_PROJECTION');assert.equal((await projection.state()).phase,'UNARMED');
});

test('a real SQLite schema initialization fault is preserved across the constructor concurrency barrier',async t=>{
  const f=await setup(t,{methods:`constructor(ctx,env){const sql=ctx.storage.sql,exec=sql.exec.bind(sql);sql.exec=(...args)=>String(args[0]).startsWith('CREATE TABLE')?exec('SELECT * FROM deliberate_schema_initialization_fault'):exec(...args);super(ctx,env);}`});
  await rejected(await f.request(),'STATE_INITIALIZATION');
});

test('binding acquisition and response serialization have separate caller-side diagnostics',async t=>{
  const binding=await setup(t,{worker:`export default {fetch(request,env){return worker.fetch(request,{...env,GUARDIAN:{idFromName(){throw Object.assign(Error(${JSON.stringify(SENSITIVE)}),{controllerDiagnostic:'STATE_STORAGE'});}}});}};`});
  await rejected(await binding.request(),'STATE_BINDING');
  const response=await setup(t,{worker:"export default {fetch(request,env){return worker.fetch(request,{...env,GUARDIAN:{idFromName(){return 'local';},get(){return {state:async()=>({invalid:1n})};}}});}};"});
  await rejected(await response.request(),'STATE_RESPONSE');
});

test('RPC metadata is allowlisted, overload takes precedence, and no RPC request is retried',async t=>{
  for(const [properties,code] of [
    [{overloaded:true,retryable:true},'STATE_RPC_OVERLOADED'],[{retryable:true},'STATE_RPC_RETRYABLE'],
    [{remote:true},'STATE_RPC_REMOTE'],[{retryable:'true',overloaded:1,remote:1},'STATE_RPC'],
    [{controllerDiagnostic:'ARM_STORAGE'},'STATE_RPC'],[{controllerDiagnostic:SENSITIVE,private:SENSITIVE},'STATE_RPC'],
  ]){
    const f=await setup(t,{worker:`let calls=0;export default {fetch(request,env){return worker.fetch(request,{...env,GUARDIAN:{idFromName(){return 'local';},get(){return {state:async()=>{calls++;if(calls!==1)return {phase:'UNEXPECTED_RETRY'};throw Object.assign(Error(${JSON.stringify(SENSITIVE)}),${JSON.stringify(properties)});}};}}});}};`});
    await rejected(await f.request(),code);
  }
});

test('real RPC unknown errors use a fixed remote classification and cannot leak arbitrary fields',async t=>{
  const f=await setup(t,{methods:`async state(){throw Object.assign(Error(${JSON.stringify(SENSITIVE)}),{controllerDiagnostic:${JSON.stringify(SENSITIVE)},private:${JSON.stringify(SENSITIVE)}});}`});
  await rejected(await f.request(),'STATE_RPC_REMOTE');
});

test('a failed state read cannot replace registered state or renew its lease',async t=>{
  const f=await setup(t,{methods:"async state(){this.inState=true;try{return await super.state();}finally{this.inState=false;}}read(){if(this.inState&&!this.faultConsumed){this.faultConsumed=true;this.sql.exec('SELECT * FROM deliberate_registered_read_fault');}return super.read();}"});
  const now=Date.now(),arm={runId:'b'.repeat(64),sourceCommit:policy.sourceCommit,hardEndAt:now+300000,preservationSha256:'c'.repeat(64),preservationVerifiedAt:now,acknowledgeEmergencyContainment:true};
  const accepted=await f.request('/v1/arm',arm);assert.equal(accepted.status,200);const before=await accepted.json();
  await rejected(await f.request(),'STATE_STORAGE');assert.deepEqual(await f.state(),before);
  const ended=await f.request('/v1/command',{runId:arm.runId,sequence:1,type:'abort'});assert.equal(ended.status,200);
});

test('successful state, live, disabled, unauthorized, invalid route and command contracts are unchanged',async t=>{
  const f=await setup(t);assert.deepEqual(await f.state(),{phase:'UNARMED',gate:'NO-GO',formalStopAccepted:false});
  const unauthorized=await f.request('/v1/state',undefined,'invalid');assert.equal(unauthorized.status,401);assert.deepEqual(await unauthorized.json(),{error:'UNAUTHORIZED'});
  const invalid=await f.request('/v1/state?extra=1');assert.equal(invalid.status,404);assert.deepEqual(await invalid.json(),{error:'NOT_FOUND'});
  const command=await f.request('/v1/command',{});assert.equal(command.status,400);assert.deepEqual(await command.json(),{error:'CONTROLLER_REJECTED'});
  const disabled=await setup(t,{bindings:{CONTROLLER_MODE:'disabled'}});const off=await disabled.request();assert.equal(off.status,503);assert.deepEqual(await off.json(),{error:'DISABLED'});
  const live=await setup(t,{bindings:{CONTROLLER_MODE:'live',CONTROLLER_POLICY_JSON:JSON.stringify({...policy,mode:'live'}),SUPABASE_SCOPED_TOKEN:'sbp_fc'+'z'.repeat(50)},methods:"read(){this.sql.exec('SELECT * FROM deliberate_live_state_read_fault');}"});
  const fail=await live.request();assert.equal(fail.status,400);assert.deepEqual(await fail.json(),{error:'CONTROLLER_REJECTED'});
});
