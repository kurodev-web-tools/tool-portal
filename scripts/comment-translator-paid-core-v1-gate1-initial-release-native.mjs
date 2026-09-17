import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash,randomBytes } from 'node:crypto';
import { spawn,spawnSync } from 'node:child_process';
import { createBackupAcquisition,BACKUP_ACQUISITION_PRODUCERS } from './lib/comment-translator-paid-core-v1-gate1-backup-acquisition.mjs';
import { createBackupCapture } from './lib/comment-translator-paid-core-v1-gate1-backup-capture.mjs';
import { createBackupArtifactStore } from './lib/comment-translator-paid-core-v1-gate1-backup-artifacts.mjs';
import { createRehearsalRestore } from './lib/comment-translator-paid-core-v1-gate1-rehearsal-restore.mjs';
import { BACKUP_SOURCE_STATE_SQL,CURRENT_BACKUP_STATE_SQL,validateBackupSourceState } from './lib/comment-translator-paid-core-v1-gate1-backup-state.mjs';
import { BACKUP_HISTORIES,BACKUP_STRUCTURE_CTES,BACKUP_STRUCTURE_SQL } from './lib/comment-translator-paid-core-v1-gate1-backup-profile.mjs';
import { CATALOG_SUPPLEMENT_SQL } from './lib/comment-translator-paid-core-v1-gate1-catalog-supplement.mjs';
import { computeBindingSha256 } from './comment-translator-paid-core-v1-gate1-preflight-readonly.mjs';
import { boundMigrationRunnerConfig } from './lib/comment-translator-paid-core-v1-gate1-bound-connection.mjs';

// Explicit, owned local integration. Native transport routing is the ONLY DB
// substitution: preserve verify-full, use a synthetic CA, route to loopback.
// No production env, service credential, user row or migration ledger is used.
const root=process.cwd(),runtime=JSON.parse(fs.readFileSync('.tmp/gate1-next-execution-20260916/local-runtime.json','utf8'));
const pgBin=runtime.postgresBin,docker=runtime.dockerExecutable;
const token=randomBytes(12).toString('hex'),name='ct-initial-release-'+token,label='com.comment_translator.initial-release';
const out=path.join(root,'.tmp/gate1-initial-release-20260917/native-'+token);
const privateRoot='D:/Gate1Backups/local-initial-release-'+token;
const envBase={PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,USERPROFILE:process.env.USERPROFILE,APPDATA:process.env.APPDATA,LOCALAPPDATA:process.env.LOCALAPPDATA};
const hash=v=>createHash('sha256').update(v).digest('hex');
const catalogOnly=process.argv[2]==='--catalog-only';
let id,imageId,port,password,phase='setup',report={status:'FAIL',hostedConnections:0},calls=[];
const native=(command,args,{input,env=envBase,allow=false,timeout=60000}={})=>{
 const r=spawnSync(command,args,{input,env,shell:false,windowsHide:true,timeout,maxBuffer:4*1024*1024});
 if(r.error||r.signal||(!allow&&r.status!==0))throw Object.assign(Error('LOCAL_PROCESS_FAILED'),{missingRelation:r.stderr?.toString().match(/relation "([a-z_.]+)" does not exist/)?.[1]??null,missingSchema:r.stderr?.toString().match(/schema "([a-z_]+)" does not exist/)?.[1]??null,sqlState:r.stderr?.toString().match(/ERROR:\s+([A-Z0-9]{5}):/)?.[1]??null,tlsFixtureError:phase==='tls_certificate'?r.stderr?.toString().slice(-800):null,localErrorClass:r.stderr?.toString().match(/not found|does not exist|Permission denied|unrecognized option|not supported|No such file or directory|syntax error/)?.[0]??null});return r;
};
const dock=(args,o)=>native(docker,['--context','desktop-linux',...args],o);
function owned(){const x=JSON.parse(dock(['inspect',id??name]).stdout)[0];assert.equal(x.Name,'/'+name);assert.equal(x.Config.Labels[label],token);assert.equal(x.Image,imageId);assert.equal(x.HostConfig.Privileged,false);assert.equal((x.HostConfig.Binds??[]).length,0);assert.equal(x.Mounts.filter(m=>m.Type!=='tmpfs').length,0);return x;}
function sql(db,q,transaction=false){fs.writeFileSync(path.join(out,'progress.json'),JSON.stringify({phase,at:new Date().toISOString()}));owned();return dock(['exec','-i',id,'psql','-X','-qAt','-U','supabase_admin','-d',db,'-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose',...(transaction?['-1']:[]),'--file=-'],{input:q}).stdout.toString('utf8').trim();}
function row(db){const s=JSON.parse(sql(db,`BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SET LOCAL statement_timeout=10000; SET LOCAL row_security=off; SET LOCAL search_path=pg_catalog,public; SELECT ${CURRENT_BACKUP_STATE_SQL}; ROLLBACK;`));s.phase='post56';validateBackupSourceState(s);return s;}
function differenceEvidence(){
 const security=BACKUP_SOURCE_STATE_SQL.slice(2,BACKUP_SOURCE_STATE_SQL.indexOf("SELECT jsonb_build_object(\n  'historyCount'"))+"SELECT jsonb_agg(row ORDER BY row::text) FROM security_rows";
 const structure=BACKUP_STRUCTURE_CTES+'SELECT jsonb_agg(value ORDER BY value::text) FROM values_to_hash';
 for(const [kind,q] of Object.entries({security,structure})){
  const rows=['gate1_source','gate1_restored'].map(db=>JSON.parse(sql(db,'BEGIN READ ONLY; SET LOCAL search_path=pg_catalog,public; '+q+'; ROLLBACK;')));
  const sets=rows.map(r=>new Set(r.map(v=>JSON.stringify(v))));
  fs.writeFileSync(path.join(out,kind+'-differences.json'),JSON.stringify({source:rows[0].filter(v=>!sets[1].has(JSON.stringify(v))),restored:rows[1].filter(v=>!sets[0].has(JSON.stringify(v)))},null,2));
 }
}
function localConfig(command,config){
 assert.ok(['psql','pg_dump','pg_dumpall'].includes(command));
 assert.equal(config.env.PGHOST,'db.fixtureproject.supabase.co');assert.equal(config.env.PGSSLMODE,'verify-full');assert.equal(config.env.PGPASSWORD,password);
 const env={...config.env,PGHOSTADDR:'127.0.0.1',PGPORT:port,PGDATABASE:'gate1_source'};
 calls.push({command,phase,sslMode:env.PGSSLMODE,loopback:true});return{...config,env};
}
function catalogEntry(request,backupPhase){
 const shim=path.join(out,'psql-local.exe'),source=path.join(out,'psql-local.cs');
 if(!fs.existsSync(shim)){
  // A single native fixture relay for the existing configurable PsqlPath.
  // It can reach only this owned loopback DB. The actual PS entry/helper,
  // libpq TLS, SQL, validation, ACL-protected artifact and limits stay real.
  fs.writeFileSync(source,`using System;using System.Diagnostics;using System.Threading.Tasks;
class LocalPsql { static int Main(string[] args) {
 bool version=args.Length==1&&args[0]=="--version";
 if(!version&&Environment.GetEnvironmentVariable("PGHOST")!="db.fixtureproject.supabase.co")return 81;
 var p=new Process();p.StartInfo.FileName=@"${pgBin}/psql.exe";
 p.StartInfo.Arguments=String.Join(" ",args);p.StartInfo.UseShellExecute=false;p.StartInfo.CreateNoWindow=true;
 p.StartInfo.RedirectStandardInput=true;p.StartInfo.RedirectStandardOutput=true;p.StartInfo.RedirectStandardError=true;
 p.StartInfo.EnvironmentVariables["PGHOSTADDR"]="127.0.0.1";p.StartInfo.EnvironmentVariables["PGPORT"]="${port}";p.StartInfo.EnvironmentVariables["PGDATABASE"]="gate1_source";
 p.Start();var o=p.StandardOutput.BaseStream.CopyToAsync(Console.OpenStandardOutput());var e=p.StandardError.BaseStream.CopyToAsync(Console.OpenStandardError());
 Console.OpenStandardInput().CopyTo(p.StandardInput.BaseStream);p.StandardInput.Close();p.WaitForExit();Task.WaitAll(o,e);return p.ExitCode;
} }`);
  native('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe',['/nologo','/target:exe','/out:'+shim,source]);
 }
 const destination=privateRoot+'/catalog-'+backupPhase;
 const r=native('C:/Program Files/PowerShell/7/pwsh.exe',['-NoProfile','-NonInteractive','-File','scripts/comment-translator-paid-core-v1-gate1-catalog-acquire-readonly.ps1','-Environment','Production','-DestinationRoot',destination,'-ProtectedStdin','-BackupPhase',backupPhase,'-PsqlPath',shim],{input:JSON.stringify(request),timeout:330000,allow:true});
 let receipt;try{receipt=JSON.parse(r.stdout);}catch{throw Error('CATALOG_FIXTURE_OUTPUT_INVALID');}
 fs.writeFileSync(path.join(out,'catalog-'+backupPhase+'-result.json'),JSON.stringify(receipt,null,2)+'\n');
 if(r.status!==0||receipt.status!=='CATALOG_ACQUIRED_SHAPE_ACCEPTED')throw Error('CATALOG_FIXTURE_REJECTED');
 const artifact=JSON.parse(fs.readFileSync(destination+'/production/production-catalog-readback.json','utf8'));
 assert.equal(artifact.targetBindingSha256,request.expectedBindingSha256);
 assert.equal(artifact.initialReleaseSupplement.archiveSchemaCount,backupPhase==='post56'?1:0);
 assert.ok(artifact.managedCatalog.objects.length>0);assert.deepEqual(artifact.history.rows.map(x=>({version:x.version,name:x.name})),BACKUP_HISTORIES[backupPhase]);
 if(backupPhase==='post56'){
  const current=artifact.canonical.tables.filter(x=>x.name==='comment_translator_paid_entitlements');
  const archive=artifact.paidLegacy.tables.filter(x=>x.name==='comment_translator_paid_entitlements');
  assert.equal(current.length,1);assert.equal(archive.length,1);assert.equal(current[0].schema,'public');assert.equal(current[0].rowCount,1);
  assert.equal(archive[0].schema,'comment_translator_paid_legacy_archive');assert.equal(archive[0].rowCount,0);
 }
 return{phase:backupPhase,status:receipt.status,history:receipt.historyCount,sqlReadOnly:true,protectedArtifact:true};
}
function copyDecode(s){if(s==='\\N')return null;return s.replace(/\\([0-7]{1,3}|x[0-9a-fA-F]{1,2}|[\s\S])/g,(_,c)=>{const m={b:'\b',f:'\f',n:'\n',r:'\r',t:'\t',v:'\v','\\':'\\'};if(c in m)return m[c];if(/^[0-7]/.test(c))return String.fromCharCode(parseInt(c,8));if(/^x/.test(c))return String.fromCharCode(parseInt(c.slice(1),16));throw Error('COPY_REJECTED');});}
function arrayDecode(s){assert.equal(s[0],'{');assert.equal(s.at(-1),'}');const a=[];let i=1;while(i<s.length-1){assert.equal(s[i++],'"');let v='',closed=false;while(i<s.length-1){const c=s[i++];if(c==='\\')v+=s[i++];else if(c==='"'){closed=true;break;}else v+=c;}assert.ok(closed);a.push(v);if(i===s.length-1)break;assert.equal(s[i++],',');}return a;}
try{
 assert.ok(['--local-only','--catalog-only'].includes(process.argv[2]));assert.equal(process.platform,'win32');
 fs.mkdirSync(out,{recursive:true});
 // Existing accepted SQL-history fixture; only DDL statements are decoded.
 // Never restore the source ledger's private created_by/idempotency fields.
 phase='history_input';
 const historyBytes=fs.readFileSync(process.env.GATE1_LOCAL_HISTORY_DUMP);
 assert.equal(hash(historyBytes),'8c5a6bbe5b937dee0213ce315db82351766590f96644ea4d630b0c43afdabb0e');
 const lines=historyBytes.toString('utf8').split(/\r?\n/),start=lines.findIndex(x=>x.startsWith('COPY "supabase_migrations"."schema_migrations" ')),end=lines.indexOf('\\.',start);
 assert.ok(start>=0&&end>start);const historical=JSON.parse(fs.readFileSync('scripts/fixtures/comment-translator-paid-core-v1-gate1-production-history.json','utf8'));
 const ddl=lines.slice(start+1,end).map(l=>{const [version,encoded,n]=l.split('\t');phase='history_'+version;const name=copyDecode(n),statements=arrayDecode(copyDecode(encoded)),bytes=Buffer.from(statements.join('\n')),expected=historical.rows.find(x=>x.version===version);if(!expected){assert.ok(version<'20260623000000'&&BACKUP_HISTORIES.pre22.some(x=>x.version===version&&x.name===name));return {version,name,statements};}assert.equal(expected.name,name);assert.equal(bytes.length,expected.sqlBytes);assert.equal(createHash('md5').update(bytes).digest('hex'),expected.statementsMd5);assert.ok(!/(?:sbp_|sb_secret_|sk_live_|postgresql:\/\/)/.test(bytes.toString()));return{version,name,statements};});assert.equal(ddl.length,22);phase='docker_start';
 imageId=JSON.parse(dock(['image','inspect','public.ecr.aws/supabase/postgres:17.6.1.140']).stdout)[0].Id;
 password=randomBytes(32).toString('base64url');
 id=dock(['run','-d','--pull=never','--name',name,'--label',label+'='+token,'--publish','127.0.0.1::5432','--tmpfs','/var/lib/postgresql/data','--env','POSTGRES_PASSWORD',imageId],{env:{...envBase,POSTGRES_PASSWORD:password}}).stdout.toString().trim();owned();
 let ready=false;for(let i=0;i<60;i++){if(dock(['exec',id,'pg_isready','-U','postgres'],{allow:true}).status===0){ready=true;break;}await new Promise(r=>setTimeout(r,500));}assert.ok(ready);
 phase='tls_certificate';
 const openssl='C:/Program Files/Git/usr/bin/openssl.exe';
 const localKey=path.join(out,'synthetic.key'),localCert=path.join(out,'synthetic.crt');
 native(openssl,['req','-x509','-newkey','rsa:2048','-nodes','-keyout',localKey,'-out',localCert,'-days','1','-subj','/CN=db.fixtureproject.supabase.co','-addext','subjectAltName=DNS:db.fixtureproject.supabase.co,IP:127.0.0.1']);
 dock(['cp',localKey,id+':/tmp/local-test.key']);dock(['cp',localCert,id+':/tmp/local-test.crt']);
 dock(['exec','--user','root',id,'sh','-c','chown postgres:postgres /tmp/local-test.key /tmp/local-test.crt && chmod 600 /tmp/local-test.key']);
 phase='tls_reload';
 for(const setting of ["ssl='on'","ssl_cert_file='/tmp/local-test.crt'","ssl_key_file='/tmp/local-test.key'"])sql('postgres','ALTER SYSTEM SET '+setting+';');sql('postgres','SELECT pg_reload_conf();');
 const ca=dock(['exec',id,'cat','/tmp/local-test.crt']).stdout,caPath=path.join(out,'synthetic-ca.crt');fs.writeFileSync(caPath,ca);
 port=owned().NetworkSettings.Ports['5432/tcp'][0].HostPort;
 const catalogBinding={schemaVersion:1,target:'production',connectionMode:'direct',projectRef:'fixtureproject',host:'db.fixtureproject.supabase.co',port:5432,database:'postgres',user:'postgres',sslMode:'verify-full',caSha256:hash(ca)};
 const catalogRequest={target:'production',bindingJson:JSON.stringify(catalogBinding),expectedBindingSha256:computeBindingSha256(catalogBinding),env:{PATH:pgBin+path.delimiter+envBase.PATH,SystemRoot:envBase.SystemRoot,PGHOST:catalogBinding.host,PGPORT:'5432',PGDATABASE:'postgres',PGUSER:'postgres',PGSSLMODE:'verify-full',PGSSLROOTCERT:caPath,PGPASSWORD:password}};
 const catalogEvidence=[];
 phase='empty_managed_baseline';
 const managed=dock(['exec',id,'pg_dump','-U','supabase_admin','--schema-only','--schema=auth','--schema=storage','--schema=supabase_functions','postgres']).stdout.toString('utf8');
 for(const db of ['gate1_source','gate1_restored']){sql('postgres','CREATE DATABASE '+db+' OWNER postgres TEMPLATE template0;');sql(db,'CREATE SCHEMA extensions; CREATE EXTENSION pgcrypto WITH SCHEMA extensions;',true);sql(db,managed,true);sql(db,"CREATE SCHEMA IF NOT EXISTS vault; CREATE TABLE IF NOT EXISTS vault.secrets(id uuid,secret text); CREATE TABLE IF NOT EXISTS storage.objects(id uuid); CREATE TABLE IF NOT EXISTS storage.buckets_vectors(id text); CREATE TABLE IF NOT EXISTS storage.vector_indexes(id text);",true);}

 phase='restore_managed_fixture';
 sql('gate1_restored',"SET ROLE postgres; CREATE SCHEMA cron; CREATE TABLE cron.job(jobid bigint,jobname text,active boolean,command text,schedule text); CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;",true);
 phase='source_ddl';
 sql('gate1_source',"SET ROLE postgres; CREATE SCHEMA cron; CREATE TABLE cron.job(jobid bigint,jobname text,active boolean,command text,schedule text); CREATE SCHEMA supabase_migrations; CREATE TABLE supabase_migrations.schema_migrations(version text PRIMARY KEY,statements text[],name text);",true);
 for(const file of fs.readdirSync('supabase/migrations').sort().filter(n=>n.slice(0,14)<'20260623000000')){phase='base_'+file.slice(0,14);sql('gate1_source','SET ROLE postgres;\n'+fs.readFileSync('supabase/migrations/'+file,'utf8'),true);}
 for(const h of ddl.filter(x=>x.statements.length&&x.version>='20260623000000')){phase='legacy_'+h.version;sql('gate1_source','SET ROLE postgres;\n'+h.statements.map(s=>s.trimEnd().endsWith(';')?s:s+';').join('\n'),true);}
 for(const h of ddl)sql('gate1_source',`INSERT INTO supabase_migrations.schema_migrations VALUES ('${h.version}',ARRAY(SELECT jsonb_array_elements_text('${JSON.stringify(h.statements).replaceAll("'","''")}'::jsonb)),'${h.name}');`,true);
 phase='catalog_supplement';const sup=JSON.parse(sql('gate1_source','BEGIN READ ONLY;\n'+CATALOG_SUPPLEMENT_SQL+'ROLLBACK;'));assert.equal(sup.timezoneInvalidRows,0);assert.equal(sup.archiveSchemaCount,0);assert.ok(sup.objects.length>0);
 if(catalogOnly){phase='catalog_pre22';catalogEvidence.push(catalogEntry(catalogRequest,'pre22'));}
 const pending=JSON.parse(fs.readFileSync('scripts/fixtures/comment-translator-paid-core-v1-gate1-environment-inventories.json','utf8')).production.pending34;
 for(const h of pending){phase='migration_'+h.version;sql('gate1_source','SET ROLE postgres;\n'+fs.readFileSync(`supabase/migrations/${h.version}_${h.name}.sql`,'utf8'),true);sql('gate1_source',`INSERT INTO supabase_migrations.schema_migrations VALUES ('${h.version}',ARRAY['-- synthetic history only'],'${h.name}');`,true);}
 phase='business_rows';
 sql('gate1_source',"INSERT INTO auth.users(id) VALUES ('11111111-1111-4111-8111-111111111111'); INSERT INTO public.comment_translator_paid_customers(owner_user_id,stripe_customer_id) VALUES ('11111111-1111-4111-8111-111111111111','cus_synthetic_local_only');",true);
 sql('gate1_source',"INSERT INTO public.comment_translator_paid_billing_lifecycles(owner_user_id,customer_binding_id,lifecycle_state) SELECT owner_user_id,id,'incomplete' FROM public.comment_translator_paid_customers; INSERT INTO public.comment_translator_paid_entitlements(lifecycle_id,owner_user_id,customer_binding_id,product_id,price_id,entitlement_status) SELECT id,owner_user_id,customer_binding_id,'prod_synthetic','price_synthetic','incomplete' FROM public.comment_translator_paid_billing_lifecycles;",true);
 if(catalogOnly){phase='catalog_post56';catalogEvidence.push(catalogEntry(catalogRequest,'post56'));report={status:'LOCAL_CATALOG_ENTRY_PASS',hostedConnections:0,catalogEvidence};}
 else {
 phase='source_state';const source=row('gate1_source'),structure=sql('gate1_source',`BEGIN READ ONLY; SET LOCAL search_path=pg_catalog,public; SELECT ${BACKUP_STRUCTURE_SQL}; ROLLBACK;`);assert.equal(source.structureSha256,structure);
 const profile={phase:'post56',structureSha256:structure,reviewedCatalogSha256:'0'.repeat(64),reviewedCatalogFile:path.join(out,'synthetic-reviewed-catalog.json')};
 phase='restricted_storage';
 for(const child of ['artifacts','receipt'])fs.mkdirSync(privateRoot+'/'+child,{recursive:true});
 const acl="$ErrorActionPreference='Stop';$root=[Console]::In.ReadToEnd();$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User;$acl=[Security.AccessControl.DirectorySecurity]::new();$acl.SetAccessRuleProtection($true,$false);$acl.SetOwner($sid);foreach($s in @($sid.Value,'S-1-5-18','S-1-5-32-544')){$acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new([Security.Principal.SecurityIdentifier]::new($s),'FullControl','ContainerInherit,ObjectInherit','None','Allow'))};Set-Acl -LiteralPath $root -AclObject $acl";
 for(const child of ['artifacts','receipt'])assert.equal(native('powershell',['-NoProfile','-NonInteractive','-Command',acl],{input:privateRoot+'/'+child}).status,0);
 const binding={schemaVersion:1,target:'production',connectionMode:'direct',projectRef:'fixtureproject',host:'db.fixtureproject.supabase.co',port:5432,database:'postgres',user:'postgres',sslMode:'verify-full',caSha256:hash(ca)};
 const reviewed=Buffer.from(JSON.stringify({target:'production',targetBindingSha256:computeBindingSha256(binding),readOnly:{transactionReadOnly:'on',transactionIsolation:'repeatable read'},history:{rows:BACKUP_HISTORIES.post56},initialReleaseSupplement:{structureSha256:structure}}));fs.writeFileSync(profile.reviewedCatalogFile,reviewed);profile.reviewedCatalogSha256=hash(reviewed);
 const input={target:'production',bindingJson:JSON.stringify(binding),expectedBindingSha256:computeBindingSha256(binding),env:{PATH:pgBin+path.delimiter+envBase.PATH,SystemRoot:envBase.SystemRoot,PGHOST:binding.host,PGPORT:'5432',PGDATABASE:'postgres',PGUSER:'postgres',PGSSLMODE:'verify-full',PGSSLROOTCERT:caPath,PGPASSWORD:password},authStorageSql:'',authStorageSha256:hash(''),preconditions:{vaultTotal:0,vaultReserved:0,storageObjects:0},backupProfile:profile};
 phase='cli_connection';const cliEvidence=[];
 for(const mode of ['list','plan']){
  const config=boundMigrationRunnerConfig(input,{mode,cliFile:'C:/Users/taka/.codex/worktrees/2d79/V_streamer_tools/.tmp/tools/supabase-2.109.0/supabase-go.exe',workDirectory:root});
  // Local-only routing seam after the production target/TLS builder. No live
  // endpoint or credential is available to the native CLI or its wrapper.
  const index=config.args.indexOf('--db-url')+1,url=new URL(config.args[index]);url.hostname='127.0.0.1';url.port=port;url.pathname='/gate1_source';config.args[index]=url.href;
  config.env={...config.env,PGHOST:'127.0.0.1',PGPORT:port,PGDATABASE:'gate1_source',HTTP_PROXY:'http://127.0.0.1:1',HTTPS_PROXY:'http://127.0.0.1:1',NO_PROXY:'127.0.0.1',HOME:out,USERPROFILE:out,APPDATA:out,LOCALAPPDATA:out};
  const output=native(process.execPath,['scripts/lib/comment-translator-paid-core-v1-gate1-cli-runner.cjs'],{input:JSON.stringify(config),timeout:60000});
  const receipt=JSON.parse(output.stdout);assert.equal(receipt.status,0);assert.equal(receipt.terminationConfirmed,true);assert.equal(receipt.timedOut,false);
  cliEvidence.push({mode,exitCode:receipt.status,closed:receipt.terminationConfirmed,tls:'verify-full',readOnly:true});
 }
 assert.deepEqual(row('gate1_source'),source);
 phase='capture_entry';
 const sourceFiles=BACKUP_ACQUISITION_PRODUCERS.map(file=>({path:file,sha256:hash(fs.readFileSync(file))}));
 const acquisition=createBackupAcquisition({verifySource:()=>{for(const f of sourceFiles)assert.equal(hash(fs.readFileSync(f.path)),f.sha256);return sourceFiles;},captureFactory:options=>createBackupCapture({...options,
 spawnImpl:(command,args,config)=>spawn(path.join(pgBin,command+'.exe'),args,localConfig(command,config)),
 spawnSyncImpl:(command,args,config)=>spawnSync(path.join(pgBin,command+'.exe'),args,localConfig(command,config))})});
 const result=await acquisition.run({sourceCommit:'a'.repeat(40),directory:privateRoot+'/artifacts',receiptDirectory:privateRoot+'/receipt',captureInput:input});
 assert.equal(result.status,'SOURCE_BOUND_BACKUP_OBSERVATION_PERSISTED');
 const store=createBackupArtifactStore(),record=store.inspectRecord({directory:privateRoot+'/receipt',expectedSha256:result.recordSha256}).record;
 const files=JSON.parse(fs.readFileSync(privateRoot+'/artifacts/backup-artifacts.json','utf8'));
 const artifacts=['roles.sql','schema.sql','auth_storage_changes.sql','data.sql','history_schema.sql','history_data.sql'].map(name=>{const sql=fs.readFileSync(privateRoot+'/artifacts/'+name,'utf8');return{name,sql,bytes:Buffer.byteLength(sql),sha256:hash(sql)};});
 phase='restore';
 const restored=await createRehearsalRestore({execute:async a=>{phase='restore_'+a.name;let output;try{output=sql('gate1_restored',a.sql,true);}catch(e){report.restoreFailure={file:a.name,sqlState:e.sqlState??null,missingRelation:e.missingRelation??null,missingSchema:e.missingSchema??null};throw e;}return{exitCode:0,signal:null,captureComplete:true,stdoutBytes:Buffer.byteLength(output),stderrBytes:0,onErrorStop:true,transaction:true};},readState:async()=>{phase='independent_readback';const observed=row('gate1_restored');const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;report.differenceKeys=Object.keys(source).filter(k=>JSON.stringify(canonical(source[k]))!==JSON.stringify(canonical(observed[k])));return observed;}}).run({artifacts,sourceState:record.capture.sourceState});
 assert.equal(restored.status,'RESTORE_STATE_MATCH_OBSERVED');
 phase='acl_negative';sql('gate1_restored','GRANT SELECT ON public.comment_translator_paid_entitlements TO service_role;',true);const altered=row('gate1_restored');assert.notEqual(altered.grantsRlsSha256,source.grantsRlsSha256);assert.notEqual(altered.structureSha256,source.structureSha256);
 report={status:'LOCAL_INITIAL_RELEASE_ROUNDTRIP_PASS',phase,history:56,hostedConnections:0,sourceFiles,artifactCount:artifacts.length,calls,cliEvidence,aclDrift:'REJECTED',readback:'EXACT_DATA_STRUCTURE_SECURITY_HISTORY',catalogSupplement:'ACQUIRED',tls:'NATIVE_VERIFY_FULL_SYNTHETIC_CA',sourceGuard:'CANDIDATE_BYTES_LOCAL_TEST_SEAM_NOT_PUBLIC_ACCEPTANCE'};
 }
}catch(e){if(phase==='independent_readback')differenceEvidence();report={...report,phase,reason:/^[A-Z_]+$/.test(e.message)?e.message:'LOCAL_ASSERTION_FAILED',sqlState:e.sqlState??null,missingRelation:e.missingRelation??null,localErrorClass:e.localErrorClass??null,tlsFixtureError:e.tlsFixtureError??null,assertion:e.code??null,numericExpected:typeof e.expected==='number'?e.expected:null,numericActual:typeof e.actual==='number'?e.actual:null};}
finally{if(id){try{owned();dock(['rm','-f',id]);assert.equal(dock(['ps','-aq','--filter','label='+label+'='+token]).stdout.toString().trim(),'');report.cleanup='PASS';}catch{report.cleanup='UNCONFIRMED';}}}
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,phase:report.phase,restoreFailure:report.restoreFailure,differenceKeys:report.differenceKeys,reason:report.reason,sqlState:report.sqlState,missingRelation:report.missingRelation,localErrorClass:report.localErrorClass,tlsFixtureError:report.tlsFixtureError,cleanup:report.cleanup,numericExpected:report.numericExpected,numericActual:report.numericActual,result:path.join(out,'result.json')}));
if(!['LOCAL_INITIAL_RELEASE_ROUNDTRIP_PASS','LOCAL_CATALOG_ENTRY_PASS'].includes(report.status)||report.cleanup!=='PASS')process.exitCode=1;
