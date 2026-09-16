import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {ROOT,LIMITS,authorizePacket,executionNow,isolatedChildEnvironment,powershellPath,json,record,safeFile,pinned,sha,readDpapi} from '../execution-inputs.mjs';
import {preparationClock} from '../prearm-sequence.mjs';

const roles=['controllerPat','configurationToken','metadataReadPat'];
export function protect(context,value,leaf){
 const script="$ErrorActionPreference='Stop';Add-Type -AssemblyName System.Security;$p=[Text.Encoding]::UTF8.GetBytes([Console]::In.ReadToEnd());$b=[Security.Cryptography.ProtectedData]::Protect($p,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser);[Console]::Write([Convert]::ToBase64String($b))";
 const r=spawnSync(powershellPath(),['-NoProfile','-NonInteractive','-Command',script],{input:JSON.stringify(value),encoding:'utf8',env:isolatedChildEnvironment(context),shell:false,windowsHide:true,timeout:10000,maxBuffer:1048576});
 assert.equal(r.status,0,'DPAPI_PROTECTION_FAILED');assert.equal(r.stderr,'','DPAPI_PROTECTION_FAILED');
 const file=safeFile(context.root,leaf);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,r.stdout,{flag:'wx'});
 return {file:leaf,bytes:Buffer.byteLength(r.stdout),sha256:sha(r.stdout)};
}
export async function openIntake(context,{out=()=>{},port=context.local?0:8978}={}){
 const root=context.root,preparation=json(safeFile(root,'control/preparation-claimed.json')),start=executionNow(context);
 assert.equal(preparation.manifestSha256,context.manifestSha256);const preparationEnd=preparationClock(context.approval,preparation.startedAt,start);
 const resumed=fs.existsSync(safeFile(root,'control/intake-0-closed.json')),id=resumed?1:0;
 if(resumed){const previous=json(safeFile(root,'control/intake-0-closed.json'));assert.equal(previous.listeners,0);assert.equal(previous.accepting,false);assert.ok(fs.existsSync(safeFile(root,'control/preparation-resumed.json')));}
 record(root,`control/intake-${id}-claimed.json`,{at:start,ownerPid:process.pid,preparationStartedAt:preparation.startedAt,allowance:1});
 const deadlineAt=Math.min(preparationEnd,resumed?json(safeFile(root,'control/intake-0-ready.json')).deadlineAt:start+LIMITS.intake),csrf=randomBytes(32).toString('hex');assert.ok(start<deadlineAt,'INTAKE_EXPIRED');let busy=false,closing=false,timer,origin;
 function revision(role){return fs.existsSync(safeFile(root,`control/intake/${role}-2.json`))?2:fs.existsSync(safeFile(root,`control/intake/${role}-1.json`))?1:0;}
 function guard(){const now=executionNow(context);authorizePacket(root,{now});preparationClock(context.approval,preparation.startedAt,now);assert.ok(now<deadlineAt,'INTAKE_EXPIRED');assert.equal(fs.existsSync(safeFile(root,'control/allocation-claimed.json')),false,'INPUT_ALREADY_USED');assert.equal(fs.existsSync(safeFile(root,'control/credentials-sealed.json')),false,'INPUT_ALREADY_SEALED');return now;}
 const controls=()=>'<form method="post" action="/seal"><input type="hidden" name="csrf" value="'+csrf+'"><button>Seal all three inputs and close</button></form><form method="post" action="/cancel"><input type="hidden" name="csrf" value="'+csrf+'"><button>Cancel input</button></form>';
 let resolveClosed;const closed=new Promise(resolve=>{resolveClosed=resolve;});
 function close(reason){
  if(closing)return closed;closing=true;clearTimeout(timer);
  server.close(()=>{record(root,`control/intake-${id}-closed.json`,{at:executionNow(context),ownerPid:process.pid,accepting:false,listeners:0,reason});resolveClosed();});
  server.closeAllConnections();return closed;
 }
 const server=http.createServer(async(req,res)=>{
  let ownsBusy=false;
  res.setHeader('Cache-Control','no-store');res.setHeader('Content-Security-Policy',"default-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
  try{
   assert.equal(req.headers.host,new URL(origin).host);assert.equal(busy,false,'INPUT_BUSY');guard();
   const role=req.url?.slice(1);assert.ok(roles.includes(role)||['seal','cancel'].includes(role));
   if(req.method==='GET'){assert.ok(roles.includes(role));res.setHeader('Content-Type','text/html; charset=utf-8');res.end(`<html><title>Gate1 protected input</title><h1>${role}</h1><form method="post"><input type="hidden" name="csrf" value="${csrf}"><label>Token<input type="password" name="token" autocomplete="off"></label><button>Protect locally</button></form>${controls()}</html>`);return;}
   assert.equal(req.method,'POST');assert.equal(req.headers.origin,origin);busy=true;ownsBusy=true;
   let bytes=0,parts=[];for await(const b of req){bytes+=b.length;assert.ok(bytes<=4096);parts.push(b);}const values=new URLSearchParams(Buffer.concat(parts).toString('utf8'));assert.equal(values.get('csrf'),csrf);guard();
   if(role==='cancel'){record(root,`control/intake-${id}-cancelled.json`,{at:executionNow(context)});res.end('INPUT_CANCELLED');setImmediate(()=>close('CANCELLED'));return;}
   if(role==='seal'){
    const pins=roles.map(r=>{const n=revision(r);assert.ok(n>=1);return json(safeFile(root,`control/intake/${r}-${n}.json`));});
    const credentials={operatorToken:randomBytes(48).toString('base64url')};for(let i=0;i<roles.length;i++)credentials[roles[i]]=readDpapi(pinned(root,pins[i].protectedInput)).token;
    assert.equal(new Set(roles.map(r=>credentials[r])).size,3,'TOKENS_MUST_BE_DISTINCT');
    guard();const pin=protect(context,credentials,'credentials.dpapi');guard();record(root,'control/credentials-sealed.json',{at:executionNow(context),manifestSha256:context.manifestSha256,inputs:pins.map(p=>({role:p.role,revision:p.revision,inputSha256:p.protectedInput.sha256})),credentials:pin});
    res.end('INPUT_SEALED');setImmediate(()=>close('SEALED'));return;
   }
   const n=revision(role)+1;assert.ok(n<=2,'CORRECTION_ALLOWANCE_EXHAUSTED');const token=values.get('token');assert.match(token??'',/^sbp_fc[A-Za-z0-9._-]{20,512}$/);
   const protectedInput=protect(context,{token},`control/intake/${role}-${n}.dpapi`);
   guard();
   record(root,`control/intake/${role}-${n}.json`,{at:executionNow(context),role,revision:n,protectedInput,manifestSha256:context.manifestSha256});
   res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<html><p>Protected locally. No token is displayed.</p>'+controls()+'</html>');out({status:'CREDENTIAL_PROTECTED',role,revision:n,complete:roles.every(r=>revision(r)>0)});
  }catch{res.statusCode=400;res.end('INTAKE_REJECTED');if(executionNow(context)>=deadlineAt)setImmediate(()=>close('EXPIRED'));}
  finally{if(ownsBusy)busy=false;}
 });
 server.requestTimeout=10000;server.headersTimeout=10000;server.maxConnections=4;
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});origin='http://127.0.0.1:'+server.address().port;
 record(root,`control/intake-${id}-ready.json`,{at:start,ownerPid:process.pid,origin,deadlineAt,csrf});
 timer=setTimeout(()=>close('EXPIRED'),Math.max(1,deadlineAt-executionNow(context)));
 out({status:'LOCAL_PROTECTED_INTAKE_READY',origin,acceptedTokens:3,deadlineAt});
 return {origin,closed,close};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 try{const context=authorizePacket(ROOT);const intake=await openIntake(context,{out:v=>process.stdout.write(JSON.stringify(v)+'\n')});await intake.closed;}
 catch{process.stdout.write(JSON.stringify({status:'INTAKE_NOT_ACCEPTED'})+'\n');process.exitCode=1;}
}
