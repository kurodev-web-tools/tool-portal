import {readObserverControl} from './management-reader.mjs';
import {nativeBinding} from './execution-inputs.mjs';
import {ROOT as PACKET_ROOT,SOURCE_ROOT} from './execution-inputs.mjs';
import fs from 'node:fs';
import {requireLiveAuthorization} from './execution-inputs.mjs';
import path from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { buildPsqlInvocation } from '../comment-translator-paid-core-v1-gate1-preflight-readonly.mjs';
import { createGate1PauseEvidenceTracker, STOP_EVIDENCE_POLICY, STOP_ROUND_MS } from '../lib/comment-translator-paid-core-v1-gate1-watchdog.mjs';
import { observeGate1PauseRound } from '../lib/comment-translator-paid-core-v1-gate1-watchdog-transport.mjs';
import { createManagementBridge } from './management-bridge.mjs';
import { baselineAccepted, http, lookup, publicHttp } from './observer-network.mjs';

// Publication is required before changing this fixed source selection. The
// selected merge is checked against every producer byte before native I/O.
let COMMIT;
const ROOT=PACKET_ROOT+'/runtime';
const CONTROL=ROOT+'/preview-control.json';
const LIVE_JOURNAL=ROOT+'/preview-observer.jsonl';

const REST='/rest/v1/comment_translator_paid_entitlements?select=*&limit=0',AUTH='/auth/v1/health';
const sha=x=>createHash('sha256').update(x).digest('hex');
const exact=(v,k)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===[...k].sort().join(',');
let safePhase='input';
function publishedSql(){
 const files=fs.readFileSync('.gitattributes','utf8').split(/\r?\n/).filter(l=>l.startsWith('/')).map(l=>l.split(' ')[0].slice(1));
 assert.equal(files.length,7);
 for(const file of files){const r=spawnSync('git',['show',COMMIT+':'+file],{maxBuffer:1048576,windowsHide:true,timeout:5000});assert.equal(r.status,0);assert.equal(r.stderr.length,0);assert.ok(fs.readFileSync(file).equals(r.stdout));}

 const source=fs.readFileSync('scripts/lib/comment-translator-paid-core-v1-gate1-watchdog-transport.mjs','utf8');
 const match=source.match(/^const SQL = ("(?:[^"\\]|\\.)*");$/m);assert.ok(match);return JSON.parse(match[1]);
}
export async function networkCall(fn,parent,limit=3000){
 const c=new AbortController(),start=performance.now();let timer,listener;
 const abort=()=>c.abort();parent?.addEventListener('abort',abort,{once:true});
 try{
  if(parent?.aborted)throw Error('CANCELLED');
  const result=await Promise.race([Promise.resolve().then(()=>fn(c.signal)),new Promise((_,reject)=>{
   listener=()=>reject(Error('CANCELLED'));c.signal.addEventListener('abort',listener,{once:true});timer=setTimeout(abort,Math.max(1,limit));
  })]);
  assert.ok(!c.signal.aborted&&performance.now()-start<=limit);return result;
 }finally{clearTimeout(timer);parent?.removeEventListener('abort',abort);c.signal.removeEventListener('abort',listener);c.abort();}
}
// Preserve sanitized terminal observations even when the enclosing deadline wins.
// A recorded partial result never changes the original rejection or acceptance.
export async function observeHttpWithDiagnostics({read,signal,record}){
 const started=performance.now();let observed=null;
 try{
  const value=await networkCall(async inner=>{const result=await read(inner);observed=publicHttp(result);return result;},signal);
  record({...publicHttp(value),state:'RETURNED',elapsedMs:Math.ceil(performance.now()-started)});
  return value;
 }catch{
  record({...observed??{status:null,complete:false,classification:'RESULT_UNAVAILABLE',bodyBytes:0},
   state:'WRAPPER_REJECTED',elapsedMs:Math.ceil(performance.now()-started),parentAborted:signal?.aborted===true});
  throw Error('HTTP_OBSERVATION_REJECTED');
 }
}
// One control command starts exactly two complete rounds. Any unknown result
// ends the pair; there is no automatic further round or management mutation.
export async function observePair({policy,elapsed,verifySource,observeRound,record,signal,
 sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))}){
 const tracker=createGate1PauseEvidenceTracker(policy);let evidence=null;
 for(let index=0;index<2;index++){
  if(index)await sleep(1000);
  const start=elapsed();let result=null;
  try{result=await networkCall(async s=>{await verifySource();if(s.aborted)throw Error();const value=await observeRound(s,tracker);await verifySource();return value;},signal,Math.min(STOP_ROUND_MS,1200000-start));}
  catch{tracker.invalidate();}
  const end=elapsed();evidence=tracker.observe(result,start,end);
  await record({stage:'PAUSE_ROUND',round:index+1,startedElapsedMs:start,completedElapsedMs:end,roundComplete:result?.status==='SOURCE_PAUSE_ROUND_COMPLETE'});
  if(!result||result.status!=='SOURCE_PAUSE_ROUND_COMPLETE'||signal.aborted||elapsed()>1200000)return null;
 }
 return signal.aborted||elapsed()>1200000?null:evidence;
}
async function main(){
 const authorized=requireLiveAuthorization();COMMIT=authorized.sourceCommit;
 const preflightOnly=process.argv.length===3&&process.argv[2]==='--preflight-only';assert.ok(preflightOnly||process.argv.length===2);
 let text='';for await(const c of process.stdin){text+=c;if(text.length>16384)throw Error('INPUT_LIMIT');}
 const JOURNAL=preflightOnly?ROOT+'/preview-preflight.jsonl':LIVE_JOURNAL;
 const input=JSON.parse(text);assert.ok(exact(input,['projectRef','key','stopEvidencePolicy','bridgeDirectory','runId']));
 assert.equal(input.stopEvidencePolicy,STOP_EVIDENCE_POLICY);assert.equal(input.bridgeDirectory,ROOT+(preflightOnly?'/preview-preflight-management-bridge':'/preview-management-bridge'));
 safePhase='published-source';const sql=publishedSql();
 const ownFile=fileURLToPath(import.meta.url),observerSha256=sha(fs.readFileSync(ownFile));
 const bridgeSha256=sha(fs.readFileSync((SOURCE_ROOT+'/management-bridge.mjs')));
 const verifySource=()=>{publishedSql();assert.equal(sha(fs.readFileSync(ownFile)),observerSha256);assert.equal(sha(fs.readFileSync((SOURCE_ROOT+'/management-bridge.mjs'))),bridgeSha256);};
 const saved=nativeBinding('preview'),binding=saved.binding;
 assert.equal(binding.target,'preview');assert.equal(input.projectRef,binding.projectRef);assert.match(input.key,/^sb_publishable_[A-Za-z0-9_-]{10,200}$/);
 assert.equal(fs.existsSync(CONTROL),false);assert.equal(fs.existsSync(JOURNAL),false);
 assert.match(input.runId,/^[a-f0-9]{64}$/);assert.equal(input.runId,JSON.parse(fs.readFileSync(ROOT+'/identity.json','utf8')).runId);
 const runId=input.runId,pinSetId=randomBytes(32).toString('hex'),t0=Date.now(),mono=performance.now();let age=0;
 const elapsed=()=>{const m=performance.now()-mono,w=Date.now()-t0;assert.ok(Number.isFinite(m)&&m>=0&&Number.isFinite(w));age=Math.max(age,m,w);return age;};
 const policy={schemaVersion:2,stopEvidencePolicy:STOP_EVIDENCE_POLICY,runId,sourceCommit:COMMIT,sourceBindingSha256:saved.bindingSha256,t0:new Date(t0).toISOString()};
 const handle=fs.openSync(JOURNAL,'wx+',0o600);let journalBytes=Buffer.alloc(0),previous='0'.repeat(64),entry=0;
 const emit=value=>{
  const row={...policy,target:'preview',observerSha256,bridgeSha256,observedAt:new Date().toISOString(),...value};
  const payload={sequence:entry++,previousSha256:previous,payload:row};previous=sha(JSON.stringify(payload));
  const bytes=Buffer.from(JSON.stringify({...payload,sha256:previous})+'\n');fs.writeSync(handle,bytes);fs.fsyncSync(handle);
  journalBytes=Buffer.concat([journalBytes,bytes]);assert.ok(fs.readFileSync(JOURNAL).equals(journalBytes));
  console.log(JSON.stringify(row));
 };
 try{
  const readManagement=createManagementBridge({directory:input.bridgeDirectory,runId,sourceBindingSha256:saved.bindingSha256});
  const management=signal=>networkCall(s=>readManagement(s),signal,4000);
  const sameProject=p=>p?.ref===binding.projectRef&&p.database?.host===binding.host&&p.database.postgres_engine==='17';
  safePhase='management-baseline-before';
  const metaBefore=await management();assert.ok(sameProject(metaBefore)&&metaBefore.status==='ACTIVE_HEALTHY');
  safePhase='native-baseline';const apiHost=binding.projectRef+'.supabase.co';
  const bin=saved.postgresBin;
  const password=fs.readFileSync(saved.credentialFile,'utf8').replace(/^\uFEFF/,'').replace(/\r?\n$/,'');assert.ok(password&&!/[\r\n\0]/.test(password));
  const env={PATH:bin+path.delimiter+process.env.PATH,SystemRoot:process.env.SystemRoot,PGHOST:binding.host,PGPORT:'5432',PGDATABASE:'postgres',PGUSER:'postgres',PGSSLMODE:'verify-full',PGSSLROOTCERT:saved.caFile,PGPASSWORD:password};
  const invocation=buildPsqlInvocation(binding,env);assert.equal(invocation.ok,true);
  const pins=Object.freeze(await networkCall(s=>lookup(binding.host,s)));
  for(const address of pins){
   const r=spawnSync(path.join(bin,'psql.exe'),invocation.args,{env:{...invocation.env,PGHOSTADDR:address,PGCONNECT_TIMEOUT:'3'},input:sql,encoding:'utf8',shell:false,windowsHide:true,timeout:7000,maxBuffer:65536});
   assert.equal(r.status,0);assert.equal(r.stderr,'');const value=JSON.parse(r.stdout);
   assert.ok(exact(value,['serverMajor','readOnly','tls','anonSelect']));assert.equal(value.serverMajor,17);assert.equal(value.readOnly,'on');assert.equal(value.tls,true);assert.equal(value.anonSelect,false);
  }
  const [rest,auth]=await networkCall(s=>Promise.all([http(apiHost,REST,input.key,s),http(apiHost,AUTH,input.key,s)]));
  assert.equal(baselineAccepted(rest,auth),true);
  safePhase='management-baseline-after';
  const [metaAfter,finalDns]=await Promise.all([management(),networkCall(s=>lookup(binding.host,s))]);
  assert.ok(sameProject(metaAfter)&&metaAfter.status==='ACTIVE_HEALTHY');assert.deepEqual(finalDns,pins);assert.ok(elapsed()<=300000);
  emit({stage:'BASELINE_READY',addressCount:pins.length,http:{rest:publicHttp(rest),auth:publicHttp(auth)},elapsedMs:Math.ceil(elapsed()),mutations:0,stopEvidence:false});
  if(preflightOnly){emit({stage:'PREFLIGHT_ONLY_COMPLETE',stopEvidence:false,mutations:0});return;}
  fs.writeFileSync(CONTROL,JSON.stringify({runId,sequence:0,command:'wait'}),{flag:'wx'});
  let sequence=0,invalid=false;
  while(elapsed()<=1200000){
   await new Promise(resolve=>setTimeout(resolve,200));safePhase='control';
   const c=readObserverControl(ROOT,'preview',runId);
   assert.ok(exact(c,['runId','sequence','command']));assert.equal(c.runId,runId);assert.ok(Number.isSafeInteger(c.sequence)&&c.sequence>=sequence);
   if(c.sequence===sequence)continue;assert.equal(c.sequence,sequence+1);sequence=c.sequence;
   if(c.command==='finish'){emit({stage:'OBSERVER_FINISHED',elapsedMs:Math.ceil(elapsed()),mutations:0});return;}
   assert.equal(c.command,'probe');assert.equal(sequence,1);safePhase='pause-pair';
   let diagnostics;
   const evidence=await observePair({policy,elapsed,verifySource,signal:new AbortController().signal,record:row=>emit({...row,diagnostics,mutations:0,stopEvidence:false}),observeRound:async(signal,tracker)=>{
    diagnostics={management:[],dns:[],http:{},direct:{}};
    if(invalid)return null;
    const counts=await observeGate1PauseRound({signal,pins,sameProject,remainingMs:()=>1200000-elapsed(),
     invalidate:reason=>{invalid=true;tracker.invalidate();diagnostics.invalidation=reason;},
     project:async s=>{const value=await management(s);diagnostics.management.push({sourceMatched:sameProject(value),status:['INACTIVE','ACTIVE_HEALTHY','PAUSING'].includes(value.status)?value.status:'OTHER'});return value;},
     addresses:async s=>{const value=await networkCall(inner=>lookup(binding.host,inner,true),s);diagnostics.dns.push(value===null?'ABSENT':'RESOLVED');return value;},
     http:async(route,s)=>{const value=await observeHttpWithDiagnostics({signal:s,read:inner=>http(apiHost,route==='rest'?REST:AUTH,input.key,inner,{readJson:false}),record:value=>{diagnostics.http[route]=value;}});assert.equal(value.complete,true);return value;},
     reportDirect:value=>{diagnostics.direct[value]=(diagnostics.direct[value]??0)+1;},
    });
    return counts&&!invalid?{status:'SOURCE_PAUSE_ROUND_COMPLETE',stopEvidencePolicy:STOP_EVIDENCE_POLICY,runId,sourceCommit:COMMIT,sourceBindingSha256:saved.bindingSha256,pinSetId,...counts}:null;
   }});
   emit({stage:'PAIR_CANDIDATE',stoppingEvidence:evidence,elapsedMs:Math.ceil(elapsed()),stopEvidence:false,mutations:0});
   assert.ok(elapsed()<=1200000);
   // Final stdout is authoritative only with the verified persisted-byte digest.
   console.log(JSON.stringify({...policy,target:'preview',observerSha256,stage:'PAIR_TERMINAL',stoppingEvidence:evidence,stopEvidence:!!evidence,restoreEligible:false,receiptSha256:sha(journalBytes),receiptBytes:journalBytes.length,elapsedMs:Math.ceil(elapsed()),mutations:0}));
   return; // The four-row journal is sealed at terminal; no later append.
  }
  emit({stage:'OBSERVER_EXPIRED',stopEvidence:false,mutations:0});process.exitCode=1;
 }finally{fs.closeSync(handle);}
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]))main().catch(()=>{console.log(JSON.stringify({target:'preview',stage:'OBSERVER_FAILED',phase:safePhase,stopEvidence:false,mutations:0}));process.exitCode=1;});
