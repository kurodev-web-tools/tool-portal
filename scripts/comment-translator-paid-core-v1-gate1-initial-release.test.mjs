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
 const post=fs.readFileSync(new URL('./lib/comment-translator-paid-core-v1-gate1-postapply-catalog.mjs',import.meta.url),'utf8');assert.match(post,/value.rows.length !== 56/);assert.match(post,/row.rowCount !== 0/);
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
