import {readJsonReceipt} from './native-io.mjs';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createProvider} from '../../workers/gate1-recovery-controller/provider.mjs';
import {ROOT,json,requireLiveAuthorization,readCredentials} from './execution-inputs.mjs';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
// One immutable local finish request avoids replacing a Windows file while a
// reader has it open. It carries the existing finish command, never progress.
export function readObserverControl(runtime,role,runId){
 assert.ok(['preview','recovery'].includes(role));assert.ok(fs.statSync(runtime+'/'+role+'-control.json').size<=4096);const file=runtime+'/'+role+'-finish.json';
 if(fs.existsSync(file)){assert.ok(fs.statSync(file).size<=4096);let ready=true;try{readJsonReceipt(file);}catch(e){if(e instanceof SyntaxError||e.code==='RECEIPT_PENDING')ready=false;else throw e;}if(!ready)return json(runtime+'/'+role+'-control.json');const value=json(file);assert.equal(value.runId,runId);assert.equal(value.command,'finish');assert.deepEqual(Object.keys(value).sort(),['command','runId','sequence']);return value;}
 assert.ok(fs.statSync(runtime+'/'+role+'-control.json').size<=4096);return json(runtime+'/'+role+'-control.json');
}
export function observerFinished(control,runId){
 assert.equal(control.runId,runId);assert.ok(Number.isInteger(control.sequence)&&control.sequence>=0);assert.ok(['wait','probe','finish'].includes(control.command));return control.command==='finish';
}
export async function serveManagementBridge(role){
 assert.ok(['preview','recovery'].includes(role));const {policy,sourceCommit}=requireLiveAuthorization();
 const runtime=ROOT+'/runtime',identity=json(runtime+'/identity.json'),allocation=json(ROOT+'/control/allocation-claimed.json');assert.equal(identity.sourceCommit,sourceCommit);assert.equal(identity.runId,allocation.runId);assert.equal(identity.hardEndAt,allocation.hardEndAt);
 assert.notEqual(process.env.NODE_TLS_REJECT_UNAUTHORIZED,'0');
 const secrets=readCredentials(),provider=createProvider(policy,secrets.controllerPat);
 const binding=identity.identities[role],directory=runtime+'/'+role+'-management-bridge';assert.equal(fs.existsSync(directory),false);fs.mkdirSync(directory);
 let sequence=0;const deadline=Date.now()+1200000;
 while(sequence<6&&Date.now()<deadline){
  if(fs.existsSync(runtime+'/'+role+'-control.json')&&observerFinished(readObserverControl(runtime,role,identity.runId),identity.runId))return {status:'OWNED_READONLY_READER_FINISHED',role,reads:sequence,mutations:0,formalStopProof:false};
  if(!fs.existsSync(directory+'/request.json')){await sleep(20);continue;}
  const request=json(directory+'/request.json');if(request.sequence===sequence){await sleep(20);continue;}
  assert.equal(Object.keys(request).sort().join(','),'requestId,runId,schemaVersion,sequence,sourceBindingSha256,type');
  assert.equal(request.schemaVersion,1);assert.equal(request.type,'SUPABASE_GET_PROJECT');assert.equal(request.runId,identity.runId);assert.equal(request.sourceBindingSha256,binding.sourceBindingSha256);assert.equal(request.sequence,sequence+1);assert.match(request.requestId,/^[a-f0-9]{64}$/);
  sequence=request.sequence;fs.writeFileSync(directory+'/read-'+sequence+'.claim.json',JSON.stringify({sequence,at:Date.now()})+'\n',{flag:'wx'});
  const started=Date.now(),observation=await provider.read(role),networkElapsedMs=Date.now()-started;assert.ok(networkElapsedMs<=3000);
  const reply={...request,type:'SUPABASE_GET_PROJECT_RESULT',networkElapsedMs,project:{ref:policy[role+'Ref'],status:observation.status,database:{host:'db.'+policy[role+'Ref']+'.supabase.co',postgres_engine:'17'}}};
  const next=directory+'/reply-next.json';fs.writeFileSync(next,JSON.stringify(reply),{flag:'wx'});fs.renameSync(next,directory+'/reply.json');
 }
 assert.equal(sequence,6);return {status:'SIX_BOUND_PROJECT_READS_COMPLETED',role,mutations:0};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 try{assert.equal(process.argv.length,3);const result=await serveManagementBridge(process.argv[2]);console.log(JSON.stringify(result));}catch{console.log(JSON.stringify({status:'MANAGEMENT_READER_REJECTED',mutations:0}));process.exitCode=1;}
}
