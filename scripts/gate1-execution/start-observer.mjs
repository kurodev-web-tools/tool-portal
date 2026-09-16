import {ROOT,SOURCE_ROOT,REPOSITORY,requireLiveAuthorization,isolatedChildEnvironment} from './execution-inputs.mjs';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {spawn,spawnSync} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';
const root=ROOT,repo=REPOSITORY,runtime=root+'/runtime',env=isolatedChildEnvironment(requireLiveAuthorization());
const alive=pid=>{try{process.kill(pid,0);return true;}catch(e){if(e.code==='ESRCH')return false;throw e;}};
async function launch(file,args,input,out,err,receipt){
 const descriptors=[];let child;
 try{
  const stdin=input?fs.openSync(input,'r'):'ignore';if(typeof stdin==='number')descriptors.push(stdin);
  const stdout=fs.openSync(out,'wx',0o600);descriptors.push(stdout);const stderr=fs.openSync(err,'wx',0o600);descriptors.push(stderr);
  child=spawn(process.execPath,[file,...args],{cwd:repo,env,shell:false,windowsHide:true,detached:true,stdio:[stdin,stdout,stderr]});
  await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});child.unref();
  fs.writeFileSync(receipt,JSON.stringify({at:Date.now(),processId:child.pid,hidden:true,status:'STARTED_NOT_YET_BASELINE_VERIFIED'})+'\n',{flag:'wx'});return child.pid;
 }finally{for(const fd of descriptors)fs.closeSync(fd);}
}
try{
 assert.equal(process.argv.length,3);const role=process.argv[2];assert.ok(['preview','recovery'].includes(role));process.chdir(repo);
 for(const leaf of ['management-stdout.jsonl','management-stderr.log','stdout.jsonl','stderr.log','management-process.json','observer-process.json'])assert.equal(fs.existsSync(runtime+'/'+role+'-'+leaf),false,'OBSERVER_OUTPUT_ALREADY_PRESENT');
 const input=spawnSync(process.execPath,[SOURCE_ROOT+'/make-observer-input.mjs',role],{cwd:repo,env,shell:false,windowsHide:true,encoding:'utf8',timeout:15000,maxBuffer:16384});assert.equal(input.status,0);assert.equal(input.stderr,'');
 const managementPid=await launch(SOURCE_ROOT+'/management-reader.mjs',[role],null,runtime+'/'+role+'-management-stdout.jsonl',runtime+'/'+role+'-management-stderr.log',runtime+'/'+role+'-management-process.json');
 const deadline=Date.now()+10000;
 while(!fs.existsSync(runtime+'/'+role+'-management-bridge')){assert.ok(alive(managementPid)&&Date.now()<deadline,'MANAGEMENT_READER_START_UNCONFIRMED');await sleep(100);}
 const observerPid=await launch(SOURCE_ROOT+'/'+role+'-observer.mjs',[],runtime+'/'+role+'-input.json',runtime+'/'+role+'-stdout.jsonl',runtime+'/'+role+'-stderr.log',runtime+'/'+role+'-observer-process.json');
 console.log(JSON.stringify({role,managementPid,observerPid,status:'STARTED_NOT_YET_BASELINE_VERIFIED'}));
}catch{console.log(JSON.stringify({status:'OBSERVER_LAUNCH_REJECTED',automaticRetry:false}));process.exitCode=1;}
