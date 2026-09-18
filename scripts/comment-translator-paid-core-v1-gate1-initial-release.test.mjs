import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import { createHash } from 'node:crypto';
import { boundConnection, boundMigrationConnection, boundMigrationRunnerConfig } from './lib/comment-translator-paid-core-v1-gate1-bound-connection.mjs';
import { computeBindingSha256 } from './comment-translator-paid-core-v1-gate1-preflight-readonly.mjs';
import { BACKUP_HISTORIES, validateProfileState } from './lib/comment-translator-paid-core-v1-gate1-backup-profile.mjs';
import { validateBackupSourceState } from './lib/comment-translator-paid-core-v1-gate1-backup-state.mjs';
import { createRehearsalRestore } from './lib/comment-translator-paid-core-v1-gate1-rehearsal-restore.mjs';
const sha=v=>createHash('sha256').update(v).digest('hex');
const ca=Buffer.from('synthetic-ca');
const b={schemaVersion:1,target:'production',connectionMode:'direct',projectRef:'fixtureproject',host:'db.fixtureproject.supabase.co',port:5432,database:'postgres',user:'postgres',sslMode:'verify-full',caSha256:sha(ca)};
const req=()=>({target:'production',bindingJson:JSON.stringify(b),expectedBindingSha256:computeBindingSha256(b),env:{PATH:'fixture',PGHOST:b.host,PGPORT:'5432',PGDATABASE:'postgres',PGUSER:'postgres',PGSSLMODE:'verify-full',PGSSLROOTCERT:'fixture-ca',PGPASSWORD:'synthetic-only'}});
const fakeFs={lstatSync:()=>({isFile:()=>true}),readFileSync:()=>ca};
test('readonly connection owns its timeout after caller validation',()=>{
 const child=boundConnection(req(),fakeFs).invocation.env;
 assert.equal(child.PGCONNECT_TIMEOUT,'15');
 assert.deepEqual(Object.fromEntries(Object.entries(child).filter(([k])=>k.startsWith('PG'))),{
  PGHOST:b.host,PGPORT:'5432',PGDATABASE:'postgres',PGUSER:'postgres',PGSSLMODE:'verify-full',PGSSLROOTCERT:'fixture-ca',
  PGGSSENCMODE:'disable',PGOPTIONS:'-c default_transaction_read_only=on -c statement_timeout=30000 -c lock_timeout=5000',
  PGPASSWORD:'synthetic-only',PGCONNECT_TIMEOUT:'15',
 });
 for(const value of ['1','15','60']){const r=req();r.env.PGCONNECT_TIMEOUT=value;assert.throws(()=>boundConnection(r,fakeFs),/BOUND_TLS_OR_CREDENTIAL_REJECTED/);}
 const file=req();delete file.env.PGPASSWORD;file.env.PGPASSFILE='synthetic-password-file';
 const fileChild=boundConnection(file,fakeFs).invocation.env;
 assert.equal(fileChild.PGCONNECT_TIMEOUT,'15');assert.equal(fileChild.PGPASSFILE,'synthetic-password-file');assert.equal('PGPASSWORD' in fileChild,false);
 file.env.PGPASSWORD='synthetic-only';assert.throws(()=>boundConnection(file,fakeFs));
});
test('shared target, TLS, credential guards precede catalog/apply processes',()=>{
 assert.equal(boundConnection(req(),fakeFs).invocation.env.PGSSLMODE,'verify-full');
 for(const change of [r=>r.target='preview',r=>r.expectedBindingSha256='0'.repeat(64),r=>r.env.PGSSLMODE='require',r=>r.env.PGHOSTADDR='127.0.0.1',r=>r.env.PGSERVICE='private',r=>delete r.env.PGPASSWORD]){
  const r=req();change(r);assert.throws(()=>boundConnection(r,fakeFs));assert.throws(()=>boundMigrationConnection(r,fakeFs));
 }
 assert.throws(()=>boundConnection(req(),{...fakeFs,readFileSync:()=>Buffer.from('wrong-ca')}));
 const m=boundMigrationConnection(req(),fakeFs);assert.ok(!m.connectionArgs.join(' ').includes('synthetic-only'));
 assert.match(m.connectionArgs[1],/sslmode=verify-full/);assert.equal(m.env.SUPABASE_DB_PASSWORD,'synthetic-only');
 for(const mode of ['list','plan','apply']){const c=boundMigrationRunnerConfig(req(),{mode,cliFile:'C:/fixture/supabase-go.exe',workDirectory:'C:/fixture'},fakeFs);assert.ok(c.args.includes('--db-url'));assert.ok(!c.args.includes('--linked'));assert.ok(!c.args.some(x=>x.includes('synthetic-only')));assert.equal(c.env.PGOPTIONS.includes('read_only=on'),mode!=='apply');assert.equal(c.retainOutput,false);assert.equal(c.shell,false);assert.ok(!c.args.includes('--include-seed'));}
 assert.throws(()=>boundMigrationRunnerConfig(req(),{mode:'repair',cliFile:'C:/fixture/supabase-go.exe',workDirectory:'C:/fixture'},fakeFs));
});
export const profileState=(phase='post56')=>({schemaVersion:2,phase,history:structuredClone(BACKUP_HISTORIES[phase]),historyCount:BACKUP_HISTORIES[phase].length,
 historySha256:'1'.repeat(64),rowCounts:[{identitySha256:'2'.repeat(64),rows:9}],rowDigests:[{identitySha256:'2'.repeat(64),sha256:'3'.repeat(64)}],authUsers:3,
 authForeignKeysSha256:'4'.repeat(64),grantsRlsSha256:'5'.repeat(64),structureSha256:'6'.repeat(64),sequencesSha256:'8'.repeat(64),legacyRows:phase==='post56'?4:0,
 vaultRows:0,storageObjects:0,vectorCounts:{'storage.buckets_vectors':0,'storage.vector_indexes':0},archiveSchemaCount:phase==='post56'?1:0,archiveUnsafeCount:0,archiveActiveTriggers:0,archiveRows:0});
test('exact histories and reviewed row-free structure; populated post56 accepted, mixed/partial rejected',()=>{
 for(const phase of ['pre22','post56']){const s=profileState(phase);assert.equal(validateBackupSourceState(s),s);assert.equal(validateProfileState(s,{phase,structureSha256:s.structureSha256,reviewedCatalogSha256:'7'.repeat(64),reviewedCatalogFile:'C:/fixture/review.json'}),s);}
 for(const change of [s=>s.history[0].name='same_count_wrong_history',s=>s.history.pop(),s=>s.history[1]={...s.history[0]},s=>s.historyCount=55,s=>s.phase='unknown',s=>s.archiveRows=1,s=>s.archiveUnsafeCount=1,s=>s.archiveActiveTriggers=1,s=>s.vaultRows=1,s=>s.storageObjects=1,s=>s.vectorCounts['storage.vector_indexes']=1,s=>s.rowDigests[0].sha256=null]){
 const s=profileState();change(s);assert.throws(()=>validateBackupSourceState(s));}
 assert.throws(()=>validateProfileState(profileState(),{phase:'post56',structureSha256:'0'.repeat(64),reviewedCatalogSha256:'7'.repeat(64)}));
});
test('restore refuses same-count changed content at independent readback',async()=>{
 const state=profileState(),names=['roles.sql','schema.sql','auth_storage_changes.sql','data.sql','history_schema.sql','history_data.sql'];
 const artifacts=names.map(name=>({name,sql:'SELECT 1;',bytes:9,sha256:sha('SELECT 1;')}));
 let calls=0;const run=createRehearsalRestore({execute:async()=>{calls++;return{exitCode:0,signal:null,captureComplete:true,stdoutBytes:0,stderrBytes:0,onErrorStop:true,transaction:true};},readState:async()=>{const s=structuredClone(state);s.rowDigests[0].sha256='9'.repeat(64);return s;}});
 await assert.rejects(run.run({artifacts,sourceState:state}),/REHEARSAL_RESTORE_REJECTED/);assert.equal(calls,6);
});
test('reader keeps fixed read-only query and private IPC; postapply policy unchanged',()=>{
 const s=fs.readFileSync(new URL('./comment-translator-paid-core-v1-gate1-catalog-acquire-readonly.ps1',import.meta.url),'utf8');
 assert.match(s,/Environment.Clear\(\)/);assert.match(s,/--no-password/);assert.match(s,/TARGET_TLS_CONTEXT_REJECTED/);assert.doesNotMatch(s,/PGSSLMODE = "require"/);
 const post=fs.readFileSync(new URL('./lib/comment-translator-paid-core-v1-gate1-postapply-catalog.mjs',import.meta.url),'utf8');assert.match(post,/\[56,57\]\.includes\(value.rows.length\)/);assert.match(post,/row.rowCount !== 0/);
});

test('actual Windows reader process helper: private bound input, environment isolation, timeout and child close', {skip:process.platform!=='win32'},()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ct-bound-input-'));
 const caPath=path.join(dir,'synthetic-ca.crt');fs.writeFileSync(caPath,ca);
 const r=req();r.env.PATH=process.env.PATH;r.env.SystemRoot=process.env.SystemRoot;r.env.PGSSLROOTCERT=caPath;
 const command=`$ErrorActionPreference='Stop';$data=[Console]::In.ReadToEnd()|ConvertFrom-Json -AsHashtable;
 $tokens=$null;$errors=$null;$ast=[Management.Automation.Language.Parser]::ParseFile($data.script,[ref]$tokens,[ref]$errors);if($errors.Count){throw 'PS_PARSE'};
 foreach($name in @('Invoke-CapturedProcess','Get-SanitizedPsqlErrorClass')){$fn=$ast.Find({param($n) $n -is [Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq $name},$true);. ([scriptblock]::Create($fn.Extent.Text))};
 $processTimeoutMilliseconds=300000;$env:PGHOST='forbidden-inherited-fixture';
 $checked=Invoke-CapturedProcess -FilePath $data.node -Arguments @($data.helper,'--private-stdin') -EnvironmentVariables @{} -StandardInput ($data.request|ConvertTo-Json -Depth 30 -Compress);
 if($checked.ExitCode -ne 0 -or $checked.StderrBytes -ne 0){throw 'PRIVATE_IPC'};
 $reply=$checked.Stdout|ConvertFrom-Json -AsHashtable;if($reply.env.PGPASSWORD -ne 'synthetic-only' -or $reply.env.PGHOST -ne 'db.fixtureproject.supabase.co' -or $reply.env.PGSSLMODE -ne 'verify-full'){throw 'BINDING_NOT_RETAINED'};
 $processTimeoutMilliseconds=100;$closed=$false;try{Invoke-CapturedProcess -FilePath $data.node -Arguments @('-e','setTimeout(()=>{},10000)') -EnvironmentVariables @{} -StandardInput ''|Out-Null}catch{if($_.Exception.Message -ne 'PROCESS_TIMEOUT'){throw};$closed=$true};
 if(-not $closed){throw 'TIMEOUT_NOT_OBSERVED'};'PRIVATE_IPC_TLS_BINDING_AND_CLOSE_PASS'`;
 try {
  const result=spawnSync('pwsh',['-NoProfile','-NonInteractive','-Command',command],{input:JSON.stringify({script:path.resolve('scripts/comment-translator-paid-core-v1-gate1-catalog-acquire-readonly.ps1'),helper:path.resolve('scripts/lib/comment-translator-paid-core-v1-gate1-bound-connection.mjs'),node:process.execPath,request:r}),encoding:'utf8',windowsHide:true,shell:false,timeout:20000,maxBuffer:65536,env:{PATH:process.env.PATH,SystemRoot:process.env.SystemRoot}});
  assert.equal(result.status,0,result.stderr);assert.equal(result.stdout.trim(),'PRIVATE_IPC_TLS_BINDING_AND_CLOSE_PASS');assert.ok(!result.stdout.includes('synthetic-only'));
 } finally {fs.unlinkSync(caPath);fs.rmdirSync(dir);}
});

test('formal WaitlistChecks spawn fixes timeout despite ambient values and rejects protected overrides', {skip:process.platform!=='win32'},()=>{
 const root=fs.mkdtempSync('D:/Gate1Backups/local-connect-timeout-');
 const caPath=path.join(root,'synthetic-ca.crt');fs.writeFileSync(caPath,ca);
 const source=path.join(root,'psql-fixture.cs'),exe=path.join(root,'psql-fixture.exe'),calls=path.join(root,'calls.txt');
 // Replace only the psql executable; this process never opens a socket.
 fs.writeFileSync(source,`using System;using System.IO;class Fixture {static int Main(string[] args){
 if(args.Length==1&&args[0]=="--version"){Console.WriteLine("psql (PostgreSQL) 17.11");return 0;}
 var sql=Console.In.ReadToEnd();File.AppendAllText(@"${calls}","spawn\\n");
 Func<string,string> e=Environment.GetEnvironmentVariable;
 if(e("PGCONNECT_TIMEOUT")!="15"||e("PGHOST")!="db.fixtureproject.supabase.co"||e("PGPORT")!="5432"||e("PGDATABASE")!="postgres"||e("PGUSER")!="postgres"||e("PGPASSWORD")!="synthetic-only"||e("PGPASSFILE")!=null||e("PGSSLMODE")!="verify-full"||e("PGSSLROOTCERT")!=@"${caPath}"||e("PGGSSENCMODE")!="disable"||e("PGOPTIONS")!="-c default_transaction_read_only=on -c statement_timeout=30000 -c lock_timeout=5000"||e("PGSERVICE")!=null)return 80;
 if(!sql.StartsWith("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;")||!sql.Contains("statement_timeout='60s'")||!sql.Contains("lock_timeout='5s'")||!sql.TrimEnd().EndsWith("ROLLBACK;"))return 81;
 Console.Write(@"{""kind"":""waitlistChecks"",""readOnly"":{""serverVersionMajor"":17,""transactionReadOnly"":""on"",""defaultTransactionReadOnly"":""on"",""transactionIsolation"":""repeatable read""},""counts"":{""total"":0,""campaign"":0,""discountIntent"":0,""email"":0,""displayName"":0,""anyViolation"":0}}");return 0;}}`);
 const env={PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,USERPROFILE:process.env.USERPROFILE};
 const compiled=spawnSync('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe',['/nologo','/target:exe','/out:'+exe,source],{env,timeout:10000,windowsHide:true,encoding:'utf8'});assert.equal(compiled.status,0,compiled.stdout);
 const entry=path.resolve('scripts/comment-translator-paid-core-v1-gate1-catalog-acquire-readonly.ps1');
 const r=req();r.env.PATH=env.PATH;r.env.SystemRoot=env.SystemRoot;r.env.PGSSLROOTCERT=caPath;
 const count=()=>fs.existsSync(calls)?fs.readFileSync(calls,'utf8').trim().split('\n').length:0;
 let index=0;
 function run(request,ambient){
  const destination=path.join(root,'case-'+index++);
  const result=spawnSync('pwsh',['-NoProfile','-NonInteractive','-File',entry,'-Environment','Production','-DestinationRoot',destination,'-ProtectedStdin','-BackupPhase','pre22','-ReadbackKind','WaitlistChecks','-PsqlPath',exe],{
   env:{...env,PGCONNECT_TIMEOUT:ambient,PGHOST:'ambient-forbidden',PGPASSWORD:'ambient-forbidden',PGSERVICE:'ambient-forbidden'},input:JSON.stringify(request),encoding:'utf8',timeout:20000,maxBuffer:65536,windowsHide:true,shell:false});
  assert.equal(result.error,undefined);assert.equal(result.signal,null);assert.equal(result.stderr,'');
  assert.ok(!result.stdout.includes('synthetic-only'));assert.ok(!result.stdout.includes('ambient-forbidden'));
  return {result,receipt:JSON.parse(result.stdout),artifact:path.join(destination,'production','production-waitlist-checks.json')};
 }
 for(const ambient of ['1','60']){const before=count();const x=run(r,ambient);assert.equal(x.result.status,0);assert.equal(x.receipt.status,'WAITLIST_COUNTS_ACQUIRED');assert.equal(count(),before+1);assert.ok(fs.existsSync(x.artifact));}
 for(const value of ['1','15','60']){const input=structuredClone(r);input.env.PGCONNECT_TIMEOUT=value;const before=count();const x=run(input,'1');assert.equal(x.result.status,1);assert.equal(x.receipt.reason,'TARGET_TLS_CONTEXT_REJECTED');assert.equal(count(),before);assert.equal(fs.existsSync(x.artifact),false);}
});
