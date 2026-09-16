import fs from 'node:fs';
import assert from 'node:assert/strict';
import {ROOT,sha} from './execution-inputs.mjs';
export function countControllerJournal(text){
 let previous='0'.repeat(64),sequence=0,gets=0,posts=0;
 for(const line of text.trim().split('\n').filter(Boolean)){
  const row=JSON.parse(line),body={sequence:row.sequence,previousSha256:row.previousSha256,payload:row.payload};
  assert.equal(row.sequence,sequence++);assert.equal(row.previousSha256,previous);assert.equal(sha(JSON.stringify(body)),row.sha256);previous=row.sha256;
  if(row.payload.event==='HTTP_ATTEMPT'){assert.ok(['GET','POST'].includes(row.payload.method));if(row.payload.method==='GET')gets++;else posts++;}
 }
 return {gets,posts};
}
export function controllerBudget({reserve=0}={}){
 const control=ROOT+'/control',runtime=ROOT+'/runtime';
 const journals=fs.existsSync(runtime)?fs.readdirSync(runtime).filter(n=>/^client-[a-f0-9]{64}\.jsonl$/.test(n)):[];assert.ok(journals.length<=1);
 const counted=journals.length?countControllerJournal(fs.readFileSync(runtime+'/'+journals[0],'utf8')):{gets:0,posts:0};
 const names=fs.readdirSync(control);const outside=names.filter(n=>/^closing-state-(initial|terminal|deadline)-claimed\.json$/.test(n)||['fresh-controller-claimed.json','disabled-get-claimed.json','final-worker-read-claimed.json'].includes(n)).length;
 const gets=counted.gets+outside;assert.ok(Number.isInteger(reserve)&&reserve>=0);assert.ok(counted.posts<=32&&gets+reserve<=96,'CONTROLLER_TOTAL_HTTP_BUDGET');
 return {posts:counted.posts,gets,clientGets:counted.gets,independentGets:outside,total:counted.posts+gets};
}
