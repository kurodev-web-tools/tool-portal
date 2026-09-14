import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Miniflare,Log,LogLevel} from 'miniflare';
import {createControllerClient} from '../../scripts/lib/comment-translator-paid-core-v1-gate1-controller-client.mjs';
import {MUTATION_DIAGNOSTICS_HEADER,parseMutationDiagnosticsHeader} from './mutation-diagnostics.mjs';
const TOKEN='s'.repeat(64),PAT='sbp_fc'+'z'.repeat(50),runId='b'.repeat(64);
const policy={mode:'live',previewRef:'p'.repeat(20),recoveryRef:'r'.repeat(20),productionRef:'x'.repeat(20),organizationId:'synthetic-org',sourceCommit:'a'.repeat(40),emergencyPreviewResume:true};
async function setup(t,{guardRejected=false}={}){
 const folder=await fs.mkdtemp(path.resolve('.tmp/gate1-mutation-diagnostics-'));
 const worker=path.relative(folder,fileURLToPath(new URL('./worker.mjs',import.meta.url))).replaceAll('\\','/'),provider=path.relative(folder,fileURLToPath(new URL('./provider.mjs',import.meta.url))).replaceAll('\\','/');
 const script=`import worker,{Gate1RecoveryController as Base} from ${JSON.stringify(worker)};
import {createProvider} from ${JSON.stringify(provider)};
export class Gate1RecoveryController extends Base {
 provider(policy){return createProvider(policy,this.env.SUPABASE_SCOPED_TOKEN,{fetchImpl:async(url,options)=>{
 if(options.method==='POST'){this.posts=(this.posts??0)+1;return new Response('PRIVATE_RESPONSE_SENTINEL',{status:403});}
 const role=url.endsWith(policy.previewRef)?'preview':'recovery';return Response.json({id:policy[role+'Ref'],organization_id:policy.organizationId,region:'ap-northeast-1',status:role==='preview'?'ACTIVE_HEALTHY':'INACTIVE',database:{host:'db.'+policy[role+'Ref']+'.supabase.co',postgres_engine:'17'}});
 }});}
 ${guardRejected?"async schedule(){const state=this.read();if(state?.operations.previewPause?.outcome==='PENDING')this.change(state.runId,s=>{s.phase='CLOSING';s.reason='OPERATOR_ABORT';s.cleanupEnd=Date.now()+600000;});return super.schedule();}":''}
 audit(){const state=this.read();return {posts:this.posts??0,observation:state.operations.previewPause?.observation??null,retained:this.sql.exec('SELECT value FROM used_runs WHERE run_id=?',state.runId).toArray()[0].value===JSON.stringify(state)};}
}
export default {fetch(request,env){if(new URL(request.url).pathname==='/__test/audit'){const id=env.GUARDIAN.idFromName('live:'+${JSON.stringify([policy.previewRef,policy.recoveryRef].sort().join(':'))});return env.GUARDIAN.get(id).audit().then(Response.json);}return worker.fetch(request,env);}};`;
 const scriptPath=path.join(folder,'worker.mjs');await fs.writeFile(scriptPath,script);let outbound=0;
 const options={modules:true,scriptPath,compatibilityDate:'2026-05-27',log:new Log(LogLevel.NONE),bindings:{CONTROLLER_MODE:'live',CONTROLLER_POLICY_JSON:JSON.stringify(policy),CONTROLLER_OPERATOR_TOKEN:TOKEN,SUPABASE_SCOPED_TOKEN:PAT},durableObjects:{GUARDIAN:{className:'Gate1RecoveryController',useSQLite:true}},durableObjectsPersist:folder,outboundService:()=>{outbound++;throw Error('NO_EXTERNAL_REQUEST');}};
 let mf=new Miniflare(options);await mf.ready;t.after(async()=>{await mf.dispose();assert.equal(outbound,0);});
 const request=(route,body,token=TOKEN)=>mf.dispatchFetch('https://controller.invalid'+route,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 return {request,reload:async()=>{await mf.dispose();mf=new Miniflare(options);await mf.ready;},audit:async()=> (await request('/__test/audit')).json()};
}
test('live observation survives SQLite reload and authenticated GET reaches the client journal',async t=>{
 const f=await setup(t),journal=[];const client=createControllerClient({runId,sourceCommit:policy.sourceCommit,hardEndAt:Date.now()+900000,manifestSha256:'c'.repeat(64),approvedManifestSha256:'c'.repeat(64),observerBindings:Object.fromEntries(['preview','recovery'].map(role=>[role,{sourceBindingSha256:'c'.repeat(64),observerSha256:'d'.repeat(64),bridgeSha256:'e'.repeat(64)}])),stagePlan:{},observeRecoveryStop:async()=>null,journal:{append:r=>journal.push(r)},transport:async(route,body)=>{const r=await f.request(route,body);return {status:r.status,body:await r.text(),mutationDiagnostics:r.headers.get(MUTATION_DIAGNOSTICS_HEADER)};}});t.after(()=>client.dispose());
 await client.start({sha256:'d'.repeat(64),verifiedAt:Date.now()});await assert.rejects(client.pausePreview());await client.observeClosure();
 const observed=journal.find(row=>row.mutationDiagnostics)?.mutationDiagnostics;assert.equal(observed.operations.previewPause.observation.code,'HTTP_STATUS');assert.equal(observed.operations.previewPause.observation.httpStatus,403);
 const audit=await f.audit();assert.equal(audit.posts,1);assert.equal(audit.retained,true);const current=client.state();assert.equal(current.operations.previewPause.outcome,'UNKNOWN');assert.equal(current.formalStopAccepted,false);assert.equal(current.gate,'NO-GO');assert.equal(Object.hasOwn(current,'mutationDiagnostics'),false);
 for(const [route,token] of [['/v1/state','bad'],['/invalid',TOKEN]]){const r=await f.request(route,undefined,token);assert.equal(r.headers.get(MUTATION_DIAGNOSTICS_HEADER),null);}
 await f.reload();const stateResponse=await f.request('/v1/state');assert.deepEqual(parseMutationDiagnosticsHeader(stateResponse.headers.get(MUTATION_DIAGNOSTICS_HEADER)),observed);assert.equal(JSON.stringify(observed).includes('PRIVATE'),false);assert.equal(JSON.stringify(observed).includes(PAT),false);assert.equal(JSON.stringify(observed).includes(policy.previewRef),false);
});
test('dispatch guard failure consumes the original claim, records no-send and performs no POST',async t=>{
 const f=await setup(t,{guardRejected:true});const now=Date.now();assert.equal((await f.request('/v1/arm',{runId,sourceCommit:policy.sourceCommit,hardEndAt:now+900000,preservationSha256:'d'.repeat(64),preservationVerifiedAt:now,acknowledgeEmergencyContainment:true})).status,200);
 assert.equal((await f.request('/v1/command',{runId,sequence:1,type:'pause-preview'})).status,200);const audit=await f.audit();assert.equal(audit.posts,0);assert.equal(audit.observation.code,'DISPATCH_GUARD');assert.equal(audit.retained,true);
 const response=await f.request('/v1/state'),state=await response.json();assert.equal(state.operations.previewPause.attempts,1);assert.equal(state.operations.previewPause.outcome,'UNKNOWN');assert.equal(parseMutationDiagnosticsHeader(response.headers.get(MUTATION_DIAGNOSTICS_HEADER)).operations.previewPause.observation.stage,'DISPATCH');
});
