import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseStrictJson} from '../lib/comment-translator-paid-core-v1-gate1-evidence.mjs';
import {validatePolicy} from '../../workers/gate1-recovery-controller/core.mjs';
import {prepareManagedRehearsalInvocation} from '../lib/comment-translator-paid-core-v1-gate1-rehearsal-executor.mjs';

export const SOURCE_ROOT=path.dirname(fileURLToPath(import.meta.url));
export const REPOSITORY=path.resolve(SOURCE_ROOT,'../..');
export const ROOT=process.env.GATE1_PACKET_ROOT??'';
export const sha=value=>createHash('sha256').update(value).digest('hex');
export const LIMITS=Object.freeze({approval:7200000,preparation:3600000,intake:1800000,oauth:180000,billing:1800000,fresh:300000,run:1200000,closure:600000,reserve:2100000,lease:120000});
export function safeFile(root,relative){
 assert.ok(typeof relative==='string'&&!path.isAbsolute(relative)&&!/[\x00-\x1f:*?"<>|]/.test(relative),'FILE_PATH_REJECTED');
 const parts=relative.replaceAll('\\','/').split('/');assert.ok(parts.every(p=>p&&p!=='.'&&p!=='..'&&!/[. ]$/.test(p)),'FILE_PATH_REJECTED');
 let current=path.resolve(root);assert.equal(fs.lstatSync(current).isSymbolicLink(),false);
 for(const part of parts){current=path.join(current,part);if(fs.existsSync(current))assert.equal(fs.lstatSync(current).isSymbolicLink(),false,'FILE_LINK_REJECTED');}
 return current;
}
export function json(file){
 assert.equal(fs.lstatSync(file).isSymbolicLink(),false);const b=fs.readFileSync(file);assert.ok(b.length>0&&b.length<=1048576,'JSON_SIZE');
 return structuredClone(parseStrictJson(new TextDecoder('utf-8',{fatal:true}).decode(b)));
}
export function pinned(root,d){
 assert.match(d?.sha256??'',/^[a-f0-9]{64}$/,'EXPECTED_DIGEST_REQUIRED');assert.ok(Number.isSafeInteger(d.bytes)&&d.bytes>=0&&d.bytes<=1073741824);
 const file=safeFile(root,d.file),bytes=fs.readFileSync(file);assert.equal(bytes.length,d.bytes,'PIN_SIZE_CHANGED');assert.equal(sha(bytes),d.sha256,'PIN_CHANGED');return file;
}
export function record(root,leaf,value){const file=safeFile(root,leaf);fs.mkdirSync(path.dirname(file),{recursive:true});const fd=fs.openSync(file,'wx');try{fs.writeFileSync(fd,JSON.stringify(value)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}return {file:leaf,bytes:fs.statSync(file).size,sha256:sha(fs.readFileSync(file))};}
export function validateApproval(a,now){
 assert.ok(a&&a.reviewOnly===false&&['LIVE_HOSTED_ONE_RUN','ISOLATED_LOCAL_ACCEPTANCE'].includes(a.action),'EXPLICIT_APPROVAL_REQUIRED');
 assert.match(a.approvalId??'',/^[a-f0-9]{64}$/);assert.match(a.manifestSha256??'',/^[a-f0-9]{64}$/);
 assert.ok([a.authorizedAt,a.expiresAt,now].every(Number.isSafeInteger)&&a.authorizedAt<=now&&now<a.expiresAt&&a.expiresAt-a.authorizedAt<=LIMITS.approval,'APPROVAL_EXPIRED');
 assert.equal(a.extraChargeCeilingUSD,0);assert.equal(a.liveRunAllowance,1);assert.equal(a.grantAllowance,1);assert.equal(a.deploymentAllowance,2);assert.equal(a.oauthAllowance,1);
 assert.equal(a.emergencyPreviewResume,true);assert.equal(a.newProjectAllowance,0);assert.equal(a.newNamespaceAllowance,0);
 assert.equal(a.manualBillingMinutes,30);assert.equal(a.acceptHistoricalRevocationEvidence,true);assert.equal(a.controllerGetLimit,96);assert.equal(a.controllerPostLimit,32);assert.equal(a.independentManagementGetLimit,21);
 assert.equal(a.automaticMutationRetries,0);assert.equal(a.preparationResumeAllowance,1);assert.equal(a.correctionsPerRole,1);
}
// Dependency names are discovered for coverage only; expected bytes/hashes must
// still come from the approved source manifest, never from this discovery.
export function requiredSources(){
 const found=new Set(fs.readdirSync(SOURCE_ROOT,{recursive:true}).filter(f=>f.endsWith('.mjs')).map(f=>'scripts/gate1-execution/'+f.replaceAll('\\','/')));
 // Native synthetic generation executes this unchanged local foundation SQL.
 // Pin its published bytes as source, not just the importing JavaScript.
 found.add('supabase/migrations/20260527000000_account_preferences_foundation.sql');
 for(const file of found){const text=fs.readFileSync(safeFile(REPOSITORY,file),'utf8');
  for(const m of text.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"]([^'"]+\.mjs)['"]/g)){
   if(!m[1].startsWith('.'))continue;const absolute=path.resolve(REPOSITORY,path.dirname(file),m[1]);assert.ok(absolute.startsWith(REPOSITORY+path.sep));found.add(path.relative(REPOSITORY,absolute).replaceAll('\\','/'));
  }
 }
 return [...found].sort();
}
export function authorizePacket(root,{now,closure=false}={}){
 assert.ok(path.isAbsolute(root)&&fs.realpathSync(root)===path.resolve(root),'PACKET_ROOT_REJECTED');
 assert.equal(fs.existsSync(path.join(root,'control/final-receipt.json')),false,'EXECUTION_ALLOCATION_CLOSED');
 const approval=json(safeFile(root,'approval.json'));
 if(now===undefined){const clock=safeFile(root,'control/fixture-clock.json');now=approval.action==='ISOLATED_LOCAL_ACCEPTANCE'&&fs.existsSync(clock)?json(clock).now:Date.now();}
 if(closure){validateApproval(approval,Math.min(now,approval.expiresAt-1));}else validateApproval(approval,now);
 const mf=safeFile(root,'manifest.json');assert.equal(sha(fs.readFileSync(mf)),approval.manifestSha256,'MANIFEST_CHANGED');const manifest=json(mf);
 assert.equal(manifest.kind,'GATE1_FIXED_EXECUTION_V1');assert.equal(manifest.packetRoot,path.resolve(root));assert.equal(manifest.action,approval.action);
 assert.ok(Array.isArray(manifest.files)&&manifest.files.length>0&&manifest.files.length<=128);const names=new Set();
 for(const d of manifest.files){assert.equal(names.has(d.file),false);names.add(d.file);pinned(root,d);}
 assert.ok(Array.isArray(manifest.source)&&manifest.source.length>0&&manifest.source.length<=128);const sourceNames=new Set();
 for(const d of manifest.source){assert.equal(sourceNames.has(d.file),false);sourceNames.add(d.file);pinned(REPOSITORY,d);}
 for(const file of requiredSources())assert.ok(sourceNames.has(file),'RUNNER_SOURCE_NOT_PINNED');
 const local=approval.action==='ISOLATED_LOCAL_ACCEPTANCE';
 if(local){assert.equal(manifest.hostedEvidence,false);assert.ok(path.resolve(root).startsWith(path.join(REPOSITORY,'.tmp','gate1-local-acceptance')+path.sep),'FIXTURE_ROOT_REJECTED');}
 else {
  assert.match(manifest.sourceCommit??'',/^[a-f0-9]{40}$/);const publication=json(pinned(root,manifest.publication));
  assert.equal(publication.status,'PUBLISHED_SOURCE_PINNED_EXECUTION_UNAPPROVED');assert.equal(publication.sourceCommit,manifest.sourceCommit);
  assert.equal(publication.sourceEntriesSha256,sha(JSON.stringify(manifest.source)));assert.equal(approval.sourceCommit,manifest.sourceCommit);
  const r=spawnSync(json(pinned(root,manifest.localRuntime)).gitExecutable,['cat-file','--batch'],{input:manifest.source.map(d=>manifest.sourceCommit+':'+d.file).join('\n')+'\n',cwd:REPOSITORY,windowsHide:true,shell:false,timeout:5000,maxBuffer:16777216});assert.equal(r.status,0,'PUBLISHED_SOURCE_REQUIRED');
  let offset=0;for(const d of manifest.source){const end=r.stdout.indexOf(10,offset),header=r.stdout.subarray(offset,end).toString('ascii').match(/^[a-f0-9]{40} blob (\d+)$/);assert.ok(header,'PUBLISHED_SOURCE_REQUIRED');const bytes=Number(header[1]),blob=r.stdout.subarray(end+1,end+1+bytes);assert.equal(r.stdout[end+1+bytes],10);offset=end+2+bytes;assert.ok(blob.equals(Buffer.from(fs.readFileSync(pinned(REPOSITORY,d),'utf8').replaceAll('\r\n','\n'))),'PUBLISHED_SOURCE_CHANGED');}assert.equal(offset,r.stdout.length);
 }
 const policy=json(pinned(root,manifest.policy));assert.equal(sha(JSON.stringify(policy)),approval.policySha256,'POLICY_CHANGED');
 assert.equal(policy.mode,'live');assert.equal(new Set([policy.previewRef,policy.recoveryRef,policy.productionRef]).size,3);
 validatePolicy(policy);assert.equal(policy.sourceCommit,manifest.sourceCommit);
 if(local){assert.equal(policy.organizationId,'synthetic-org');assert.deepEqual([policy.previewRef,policy.recoveryRef,policy.productionRef],['p'.repeat(20),'r'.repeat(20),'x'.repeat(20)]);}
 const baseline=manifest.baseline?json(pinned(root,manifest.baseline)):null;
 return {approval,manifest,manifestSha256:approval.manifestSha256,policy,sourceCommit:manifest.sourceCommit,local,root,predecessor:baseline?.predecessor};
}
export const requireLiveAuthorization=options=>{const c=authorizePacket(ROOT,options);assert.equal(c.local,false,'NATIVE_HELPER_FORBIDDEN_IN_FIXTURE');return c;};
export function verifyCandidate(){return authorizePacket(ROOT);}
// Run-specific inputs are explicitly pinned by the current manifest. Historical
// descriptors are never used as current credentials or current observations.
export function nativeBinding(role,{closure=false}={}){
 assert.ok(['preview','recovery'].includes(role));const c=requireLiveAuthorization({closure});
 const pin=c.manifest[role+'Binding'],s=json(pinned(c.root,pin));
 assert.equal(s.binding.target,role);assert.equal(s.binding.projectRef,c.policy[role+'Ref']);
 assert.equal(s.bindingSha256,sha(JSON.stringify(s.binding)));
 return {...s,credentialFile:pinned(c.root,s.credential),caFile:pinned(c.root,s.ca),postgresBin:json(pinned(c.root,c.manifest.localRuntime)).postgresBin,restoreBin:json(pinned(c.root,c.manifest.localRuntime)).restoreBin};
}
export function nativeApiInput(role,{closure=false}={}){
 assert.ok(['preview','recovery'].includes(role));const c=requireLiveAuthorization({closure});const v=json(pinned(c.root,c.manifest[role+'ApiInput']));assert.equal(v.projectRef,c.policy[role+'Ref']);assert.match(v.key,/^sb_publishable_[A-Za-z0-9_-]{10,200}$/);return v;
}
export function recoveryOptions(policy){
 const c=requireLiveAuthorization(),s=json(pinned(c.root,c.manifest.recoveryBinding));assert.equal(s.binding.target,'recovery');assert.equal(s.binding.projectRef,policy.recoveryRef);
 const password=fs.readFileSync(pinned(c.root,s.credential),'utf8').replace(/^\uFEFF/,'').replace(/\r?\n$/,'');assert.ok(password&&!/[\r\n\0]/.test(password));
 const bin=json(pinned(c.root,c.manifest.localRuntime)).postgresBin;
 const options={bindingJson:JSON.stringify(s.binding),approvedRecoveryRef:policy.recoveryRef,protectedProjectRefs:[policy.previewRef,policy.productionRef],env:{...isolatedChildEnvironment(c),PATH:bin+path.delimiter+path.join(process.env.SystemRoot??'C:/Windows','System32'),PGHOST:s.binding.host,PGPORT:'5432',PGDATABASE:'postgres',PGUSER:'postgres',PGSSLMODE:'verify-full',PGSSLROOTCERT:pinned(c.root,s.ca),PGPASSWORD:password}};
 prepareManagedRehearsalInvocation(options);return options;
}
export function executionNow(context){
 const file=safeFile(context.root,'control/fixture-clock.json');
 if(context.local&&fs.existsSync(file)){const n=json(file).now;assert.ok(Number.isSafeInteger(n));return n;}
 return Date.now();
}
export function isolatedChildEnvironment(context){
 // Never inherit NODE_OPTIONS, service credentials, PG*, HOME, cookies or proxies.
 const env={SystemRoot:process.env.SystemRoot??'C:/Windows',WINDIR:process.env.WINDIR??'C:/Windows',GATE1_PACKET_ROOT:context.root,CI:'true',CLOUDFLARE_SEND_METRICS:'false',WRANGLER_WRITE_LOGS:'false'};
 const tmp=safeFile(context.root,'owned-temp');fs.mkdirSync(tmp,{recursive:true});env.TEMP=tmp;env.TMP=tmp;
 const profile=safeFile(context.root,'owned-profile');fs.mkdirSync(profile,{recursive:true});
 Object.assign(env,{USERPROFILE:profile,APPDATA:profile,LOCALAPPDATA:profile,XDG_CONFIG_HOME:profile,XDG_CACHE_HOME:profile});
 env.PATH=path.dirname(process.execPath)+path.delimiter+path.join(env.SystemRoot,'System32');
 if(!context.local&&context.manifest.localRuntime){const r=json(pinned(context.root,context.manifest.localRuntime));assert.ok(path.isAbsolute(r.dockerExecutable));assert.ok(path.isAbsolute(r.gitExecutable));env.PATH+=path.delimiter+path.dirname(r.dockerExecutable)+path.delimiter+path.dirname(r.gitExecutable);}
 return env;
}
export function powershellPath(){return path.join(process.env.SystemRoot??'C:/Windows','System32/WindowsPowerShell/v1.0/powershell.exe');}
export function readDpapi(file){
 assert.equal(fs.lstatSync(file).isSymbolicLink(),false);assert.ok(fs.statSync(file).size<=1048576);
 const code="$ErrorActionPreference='Stop';Add-Type -AssemblyName System.Security;$b=[Convert]::FromBase64String([Console]::In.ReadToEnd());$p=[Security.Cryptography.ProtectedData]::Unprotect($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser);[Console]::Write([Text.Encoding]::UTF8.GetString($p))";
 const r=spawnSync(powershellPath(),['-NoProfile','-NonInteractive','-Command',code],{input:fs.readFileSync(file),env:{SystemRoot:process.env.SystemRoot??'C:/Windows'},encoding:'utf8',windowsHide:true,shell:false,timeout:10000,maxBuffer:1048576});
 assert.equal(r.status,0,'DPAPI_READ_FAILED');assert.equal(r.stderr,'','DPAPI_READ_FAILED');return parseStrictJson(r.stdout);
}
export function readCredentials(options={}){const a=requireLiveAuthorization(options);const sealed=json(safeFile(ROOT,'control/credentials-sealed.json'));assert.equal(sealed.manifestSha256,a.manifestSha256);return readDpapi(pinned(ROOT,sealed.credentials));}
