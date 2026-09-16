import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {errorClass,exitCode as safeExitCode,signalClass,readNativeDiagnostic} from './native-diagnostic.mjs';

export const OAUTH_SCOPES=Object.freeze(['account:read','offline_access','user:read','workers_scripts:write']);

export async function launchOwnedNode({file,args=[],cwd,env,out,err,receipt,identity={}}){
 assert.ok(env&&typeof env==='object');assert.ok(path.isAbsolute(file)&&path.isAbsolute(cwd));
 const descriptors=[];let child;
 try{
  descriptors.push(fs.openSync(out,'wx',0o600),fs.openSync(err,'wx',0o600));
  child=spawn(process.execPath,[file,...args],{cwd,env,shell:false,windowsHide:true,detached:true,stdio:['ignore',...descriptors]});
  await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});child.unref();
  const value={at:Date.now(),processId:child.pid,hidden:true,...identity};fs.writeFileSync(receipt,JSON.stringify(value)+'\n',{flag:'wx'});return value;
 }finally{for(const fd of descriptors)fs.closeSync(fd);}
}
const failure=code=>Object.assign(Error(code),{code});

// Do not expose provider stdout/stderr, auth URLs, arguments or stdin. A timeout
// means unconfirmed execution: never kill a mutation helper or retry its action.
export function runHelper({executable,args,cwd,input,env,oauth=false,nativeDiagnostic=false,onStarted=()=>{},onStatus=()=>{},onFailure=()=>{},timeoutMs=300000}){
 assert.ok(env&&typeof env==='object','EXPLICIT_CHILD_ENVIRONMENT_REQUIRED');
 return new Promise((resolve,reject)=>{
  const child=spawn(executable,args,{cwd,env,shell:false,windowsHide:true,stdio:['pipe','pipe','pipe']});
  let settled=false,stdout='',stdoutBytes=0,stderrBytes=0,invalid=false,forwarded=false;
  const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve(value);};
  const fail=(reason,terminal,exitCode=null,signal=null,error=null)=>{
   if(settled)return;
   const outcome={reason,processId:child.pid??null,at:Date.now(),terminal,exitCode:safeExitCode(exitCode),signal:signalClass(signal),errorClass:error?errorClass(error):null,stdoutBytes,stderrBytes,outputRejected:invalid,automaticRetry:false,nativeDiagnostic:terminal&&nativeDiagnostic&&!invalid?readNativeDiagnostic(stdout):null};
   try{onFailure(outcome);}catch{return finish(failure('HELPER_FAILURE_RECORD_UNCONFIRMED'));}
   finish(failure(reason));
  };
  const timer=setTimeout(()=>{
   onStatus({event:'HELPER_COMPLETION_UNCONFIRMED',processId:child.pid??null,automaticRetry:false});
   // The primary retains this PID for closure. Child execution may still finish.
   child.unref();child.stdout.unref?.();child.stderr.unref?.();
   fail('HELPER_COMPLETION_UNCONFIRMED',false);
  },timeoutMs);
  child.once('error',error=>fail('HELPER_START_FAILED',true,null,null,error));
  child.stdin.on('error',()=>{invalid=true;});
  child.stdout.on('data',bytes=>{
   stdoutBytes+=bytes.length;
   if(Buffer.byteLength(stdout)+bytes.length>1048576){invalid=true;return;}stdout+=bytes.toString('utf8');
   if(oauth&&!forwarded){for(const line of stdout.split(/\r?\n/)){let row;try{row=JSON.parse(line);}catch{continue;}
    if(row?.status==='OAUTH_UI_READY'){
     if(row.launcher!=='http://127.0.0.1:8977/start'||JSON.stringify(row.requestedScopes)!==JSON.stringify(OAUTH_SCOPES)){invalid=true;continue;}
     forwarded=true;onStatus({event:'OAUTH_UI_READY',launcher:'http://127.0.0.1:8977/start',requestedScopes:[...OAUTH_SCOPES]});
    }
   }}
  });
  child.stderr.on('data',bytes=>{stderrBytes+=bytes.length;});
  child.once('close',(exitCode,signal)=>{
   if(exitCode!==0||signal||invalid||stderrBytes>0)return fail('HELPER_RESULT_UNCONFIRMED',true,exitCode,signal);
   finish(null,{exitCode:0,completedAt:Date.now()});
  });
  try{onStarted({processId:child.pid??null,at:Date.now()});}catch{invalid=true;}
  child.stdin.end(invalid?'':input??'');
 });
}

export function readJsonReceipt(file){
 assert.equal(fs.lstatSync(file).isSymbolicLink(),false,'RECEIPT_SYMLINK');
 const bytes=fs.readFileSync(file);assert.ok(bytes.length<=1048576,'RECEIPT_SIZE');
 // Creation may become visible before the writer's first byte. Direct readers
 // still reject this; waitReceipt handles it as pending until its same deadline.
 if(bytes.length===0)throw failure('RECEIPT_PENDING');
 return JSON.parse(bytes.toString('utf8'));
}

// Existing helpers can write a receipt in several writes. An incomplete JSON
// document is pending, never accepted; a complete but invalid receipt fails now.
export async function waitReceipt({file,validate,deadlineAt,now=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms))}){
 while(now()<deadlineAt){
  if(fs.existsSync(file)){
   let receipt;try{receipt=readJsonReceipt(file);}catch(e){if(!(e instanceof SyntaxError)&&e.code!=='RECEIPT_PENDING')throw e;}
   if(receipt!==undefined){validate(receipt);assert.ok(now()<deadlineAt,'RECEIPT_DEADLINE');return receipt;}
  }
  await sleep(Math.min(100,Math.max(1,deadlineAt-now())));
 }
 throw failure('RECEIPT_DEADLINE');
}
