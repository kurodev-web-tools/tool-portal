import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {parseRecoveryTargetBinding,buildPsqlInvocation} from '../comment-translator-paid-core-v1-gate1-preflight-readonly.mjs';
import {parseStrictJson} from './comment-translator-paid-core-v1-gate1-evidence.mjs';
import {buildSyntheticRehearsalTransfer,REHEARSAL_READBACK_SQL} from './comment-translator-paid-core-v1-gate1-rehearsal-transfer.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex');
const reject=()=>{throw Error('REHEARSAL_EXECUTION_REJECTED');};
export const REHEARSAL_IDENTITY_SQL=`BEGIN READ ONLY; SELECT json_build_object('role',current_user,'database',current_database(),'superuser',(SELECT rolsuper FROM pg_roles WHERE rolname=current_user),'serverMajor',current_setting('server_version_num')::integer / 10000,'tls',coalesce((SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()),false)); ROLLBACK;`;

// The transport is an internal testing seam. Its result grants no Hosted or
// release authority; the operator still owns the approved run and stop observer.
export function createRehearsalExecutor(transport,{now=()=>performance.now()}={}){
 return {async run(packet,{assertFreshFixtures,timeoutMs=60000,signal}={}){
  let attemptOwned=false,phase='input';
  try{
   if(typeof assertFreshFixtures!=='function'||!Number.isSafeInteger(timeoutMs)||timeoutMs<100||timeoutMs>60000||signal!==undefined&&!(signal instanceof AbortSignal))reject();
   packet=structuredClone(packet);const candidate=buildSyntheticRehearsalTransfer(packet),started=now();
   const remaining=()=>{const elapsed=now()-started;if(!Number.isFinite(elapsed)||elapsed<0||elapsed>=timeoutMs||signal?.aborted||assertFreshFixtures()!==true)reject();return Math.floor(timeoutMs-elapsed);};
   const execute=async sql=>{remaining();if(transport.verify()!==true)reject();const result=await transport.execute(sql,{timeoutMs:remaining(),signal});remaining();if(typeof result!=='string'||Buffer.byteLength(result)>131072)reject();return result.trim();};
   phase='identity';const identity=parseStrictJson(await execute(REHEARSAL_IDENTITY_SQL));
   if(Object.keys(identity??{}).sort().join(',')!=='database,role,serverMajor,superuser,tls'||identity.role!=='postgres'||identity.database!=='postgres'||identity.superuser!==false||identity.serverMajor!==17||typeof identity.tls!=='boolean'||typeof transport.requiresTls!=='boolean'||transport.requiresTls&&!identity.tls)reject();
   phase='baseline';if(hash(await execute(REHEARSAL_READBACK_SQL))!==packet.targetBaselineSha256)reject();
   phase='claim';remaining();if(transport.verify()!==true||transport.claim()!==true)reject();attemptOwned=true;
   phase='transfer';const raw=await execute(candidate.sql),precommit=parseStrictJson(raw);
   if(Object.keys(precommit??{}).sort().join(',')!=='fingerprint,kind'||precommit.kind!=='synthetic-rehearsal-precommit-v1')reject();
   phase='readback';const committed=parseStrictJson(await execute(REHEARSAL_READBACK_SQL));
   if(!isDeepStrictEqual(committed,precommit.fingerprint)||transport.verify()!==true)reject();remaining();
   return Object.freeze({status:'SYNTHETIC_TRANSFER_VERIFIED',scope:'SYNTHETIC_REHEARSAL_ONLY',role:'postgres',independentCommittedReadbackMatched:true,sqlSha256:candidate.sha256,targetReusable:false,stageAuthority:false,hostedReady:false,gate:'NO-GO'});
  }catch{
   let stopConfirmed=false;if(attemptOwned)try{stopConfirmed=await transport.stop()===true;}catch{/* Keep UNKNOWN. Never retry a stop automatically. */}
   throw Object.assign(Error('REHEARSAL_EXECUTION_REJECTED'),{phase,attemptOwned,stopConfirmed,targetReusable:false});
  }
 }};
}

// One resource, one durable claim. A malformed or partial receipt also prevents
// reuse. No cleanup or failure path removes or overwrites these files.
export function createRehearsalAttemptLedger(directory){
 const root=path.resolve(directory);
 if(!fs.existsSync(root))fs.mkdirSync(root);
 const check=()=>{for(let current=root;;current=path.dirname(current)){const s=fs.lstatSync(current);if(!s.isDirectory()||s.isSymbolicLink())reject();if(current===path.dirname(current))break;}};
 return {claim(resourceSha256){
  if(typeof resourceSha256!=='string'||!/^[a-f0-9]{64}$/.test(resourceSha256))reject();check();let fd;
  try{fd=fs.openSync(path.join(root,resourceSha256+'.json'),'wx',0o600);fs.writeFileSync(fd,JSON.stringify({schemaVersion:1,resourceSha256,status:'ATTEMPTED_DO_NOT_REUSE',createdAt:new Date().toISOString()})+'\n');fs.fsyncSync(fd);return true;}catch{reject();}finally{if(fd!==undefined)fs.closeSync(fd);}
 }};
}
export function nativeRehearsalAttemptLedger(){
 const r=spawnSync('git',['--no-optional-locks','rev-parse','--path-format=absolute','--git-common-dir'],{cwd:fileURLToPath(new URL('../..',import.meta.url)),encoding:'utf8',shell:false,windowsHide:true,timeout:5000,maxBuffer:4096,env:{PATH:process.env.PATH,SystemRoot:process.env.SystemRoot}});
 if(r.status!==0||r.error||r.signal||r.stderr?.length||!path.isAbsolute(r.stdout.trim()))reject();
 return createRehearsalAttemptLedger(path.join(r.stdout.trim(),'comment-translator-gate1-rehearsal-attempts-v1'));
}

// Unlike the existing preflight builder this controlled transfer needs writable
// transactions. The existing read-only builder and its contracts are unchanged.
export function prepareManagedRehearsalInvocation({bindingJson,env,approvedRecoveryRef,protectedProjectRefs,fsApi=fs}){
 const parsed=parseRecoveryTargetBinding(bindingJson);
 if(!parsed.ok||parsed.binding.target!=='recovery'||!/^[a-z]{20}$/.test(approvedRecoveryRef)||parsed.binding.projectRef!==approvedRecoveryRef||
 !Array.isArray(protectedProjectRefs)||protectedProjectRefs.length!==2||new Set(protectedProjectRefs).size!==2||protectedProjectRefs.some(ref=>!/^[a-z]{20}$/.test(ref)||ref===approvedRecoveryRef))reject();
 const invocation=buildPsqlInvocation(parsed.binding,env,fsApi);if(!invocation.ok)reject();
 return {command:invocation.command,args:['--no-psqlrc','--no-password','--quiet','--tuples-only','--no-align','--set=ON_ERROR_STOP=1','--dbname=postgres','--file=-'],
  env:{...invocation.env,PGCONNECT_TIMEOUT:'5',PGOPTIONS:'-c default_transaction_read_only=off -c statement_timeout=60000 -c lock_timeout=3000 -c client_min_messages=warning'},shell:false};
}
function nativeExecute(invocation,sql,{timeoutMs,signal}){
 return new Promise((resolve,rejectPromise)=>{
  let child,done=false,timer,size=0;const chunks=[];
  const finish=ok=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);if(ok)resolve(Buffer.concat(chunks).toString('utf8'));else{chunks.length=0;try{child?.stdin.destroy();child?.stdout.destroy();child?.stderr.destroy();child?.kill();child?.unref();}catch{}rejectPromise(Error('REHEARSAL_NATIVE_REJECTED'));}};
  const abort=()=>finish(false);if(signal?.aborted){abort();return;}
  try{child=spawn(invocation.command,invocation.args,{env:invocation.env,shell:false,windowsHide:true,stdio:['pipe','pipe','pipe']});}catch{abort();return;}
  child.on('error',abort);for(const stream of [child.stdin,child.stdout,child.stderr])stream.on('error',abort);
  child.stdout.on('data',b=>{if(done)return;size+=b.length;if(size>131072)abort();else chunks.push(b);});child.stderr.on('data',b=>{if(b.length)abort();});child.on('close',(code,sig)=>finish(code===0&&!sig));
  timer=setTimeout(abort,timeoutMs);signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted){abort();return;}child.stdin.end(sql);
 });
}
// Preparation only: no network call, process or claim occurs until run(). The
// stop hook must be the separately approved Recovery pause/observer operation.
export function createManagedRehearsalExecutor(options,{stop}){
 if(typeof stop!=='function')reject();const pinned={...options,env:{...options.env},protectedProjectRefs:[...options.protectedProjectRefs]};
 prepareManagedRehearsalInvocation(pinned);
 return createRehearsalExecutor({requiresTls:true,verify:()=>{prepareManagedRehearsalInvocation(pinned);return true;},claim:()=>nativeRehearsalAttemptLedger().claim(hash('supabase-project:'+pinned.approvedRecoveryRef)),execute:(sql,bounds)=>nativeExecute(prepareManagedRehearsalInvocation(pinned),sql,bounds),stop});
}
