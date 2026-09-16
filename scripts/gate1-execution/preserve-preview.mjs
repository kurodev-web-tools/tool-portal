import {nativeBinding} from './execution-inputs.mjs';
import fs from 'node:fs';
import {ROOT,requireLiveAuthorization} from './execution-inputs.mjs';
requireLiveAuthorization();
assert.equal(fs.existsSync(ROOT+'/preservation.json'),false);fs.writeFileSync(ROOT+'/control/preservation-claimed.json',JSON.stringify({at:Date.now(),allowance:1})+'\n',{flag:'wx'});
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash,X509Certificate} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {buildPsqlInvocation} from '../comment-translator-paid-core-v1-gate1-preflight-readonly.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const receiptPath=(ROOT+'/preservation.json');
const report={status:'FAIL',scope:'PREVIEW_PRE_PAUSE_SUPPLEMENTAL_BACKUP',productionTouched:false,dbWrites:0};
let phase='binding';
try{
 const input=nativeBinding('preview');
 for(const f of [input.caFile,input.credentialFile])assert.equal(fs.lstatSync(f).isSymbolicLink(),false);
 const ca=fs.readFileSync(input.caFile),cert=new X509Certificate(ca);assert.equal(sha(ca),input.binding.caSha256);assert.ok(cert.ca&&Date.parse(cert.validTo)>Date.now());
 const password=fs.readFileSync(input.credentialFile,'utf8').replace(/^\uFEFF/,'').replace(/\r?\n$/,'');assert.ok(password&&!/[\r\n\0]/.test(password));
 const bin=input.postgresBin;const env={PATH:bin+path.delimiter+process.env.PATH,SystemRoot:process.env.SystemRoot,PGHOST:input.binding.host,PGPORT:'5432',PGDATABASE:'postgres',PGUSER:'postgres',PGSSLMODE:'verify-full',PGSSLROOTCERT:input.caFile,PGGSSENCMODE:'disable',PGPASSWORD:password};
 const invocation=buildPsqlInvocation(input.binding,env);assert.equal(invocation.ok,true);report.bindingSha256=input.bindingSha256;
 const sql=String.raw`BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SET LOCAL statement_timeout='45000ms';
 WITH relations AS (SELECT n.nspname,c.relname,c.relkind,c.relrowsecurity,c.relforcerowsecurity,pg_get_userbyid(c.relowner) AS owner,c.relacl FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','auth','storage','private','vault','supabase_migrations','cron') AND c.relkind IN ('r','p')),
 rows AS (SELECT *,((xpath('/table/row/h/text()',query_to_xml(format('SELECT encode(sha256(convert_to(coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text COLLATE "C"),''[]''::jsonb)::text,''UTF8'')),''hex'') AS h FROM ONLY %I.%I t',nspname,relname),false,false,'')))[1]::text) AS contents FROM relations)
 SELECT json_build_object('serverMajor',current_setting('server_version_num')::int/10000,'readOnly',current_setting('transaction_read_only'),'tls',(SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()),'historyCount',(SELECT count(*) FROM supabase_migrations.schema_migrations),'vaultCount',(SELECT count(*) FROM vault.secrets),'storageCount',(SELECT count(*) FROM storage.objects),'cronActive',(SELECT count(*) FROM cron.job WHERE active),'otherActiveClients',(SELECT count(*) FROM pg_stat_activity WHERE backend_type='client backend' AND pid<>pg_backend_pid() AND state='active'),'relations',(SELECT jsonb_agg(to_jsonb(r) ORDER BY nspname,relname) FROM rows r));ROLLBACK;`;
 const native=(name,args,options={})=>{const r=spawnSync(path.join(name==='pg_restore'?input.restoreBin:bin,name+'.exe'),args,{env:invocation.env,input:options.input,encoding:'utf8',shell:false,windowsHide:true,timeout:180000,maxBuffer:4194304,...(options.discard?{stdio:['ignore','ignore','pipe']}:{})});if(r.error||r.signal||r.status!==0||r.stderr?.length)throw Object.assign(Error('NATIVE_REJECTED'),{diagnostic:r.stderr?.match(/permission denied|server version mismatch|connection.*failed|timeout|could not.*|ERROR:\s+[^\n]{0,50}/i)?.[0]?.startsWith('permission denied')?'PERMISSION_DENIED':'NATIVE_FAILURE'});return r.stdout;};
 const read=()=>JSON.parse(native('psql',invocation.args,{input:sql}));
 phase='pre_state';const before=read();assert.equal(before.serverMajor,17);assert.equal(before.readOnly,'on');assert.equal(before.tls,true);assert.equal(before.historyCount,56);assert.equal(before.cronActive,0);assert.equal(before.otherActiveClients,0);
 phase='private_directory';const root='D:/Gate1Backups';assert.equal(fs.realpathSync.native(root).replaceAll('\\','/').toLowerCase(),'d:/gate1backups');const directory=root+'/preview-prepause-'+new Date().toISOString().replace(/[^0-9]/g,'');assert.equal(fs.existsSync(directory),false);
 const ps=String.raw`$ErrorActionPreference='Stop';$p=[Console]::In.ReadToEnd();if([IO.Path]::GetDirectoryName($p) -ne 'D:\Gate1Backups'){throw 'scope'};$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User;$item=New-Item -ItemType Directory -Path $p;$acl=Get-Acl -LiteralPath $item.FullName;$acl.SetAccessRuleProtection($true,$false);foreach($id in @($sid.Value,'S-1-5-18','S-1-5-32-544')){$rule=[Security.AccessControl.FileSystemAccessRule]::new([Security.Principal.SecurityIdentifier]::new($id),'FullControl','ContainerInherit,ObjectInherit','None','Allow');$acl.AddAccessRule($rule)};Set-Acl -LiteralPath $item.FullName -AclObject $acl`;
 const psHome=path.join(process.env.SystemRoot,'System32/WindowsPowerShell/v1.0');const prep=spawnSync(path.join(psHome,'powershell.exe'),['-NoProfile','-NonInteractive','-Command',ps],{input:directory.replaceAll('/','\\'),encoding:'utf8',windowsHide:true,timeout:20000,env:{SystemRoot:process.env.SystemRoot,WINDIR:process.env.SystemRoot,PATH:psHome,PSModulePath:path.join(psHome,'Modules')}});if(prep.stderr||prep.status!==0){fs.writeFileSync((ROOT+'/preservation-directory-diagnostic.txt'),prep.stderr??'');report.privateDirectoryExit=prep.status;}assert.equal(prep.status,0);assert.equal(prep.stderr,'');
 const archive=directory+'/preview.dump';phase='native_dump';native('pg_dump',['--format=custom','--serializable-deferrable','--no-password','--file='+archive]);
 phase='archive_read';const toc=native('pg_restore',['--list',archive]);for(const item of ['TABLE DATA auth users','TABLE DATA storage objects','TABLE DATA supabase_migrations schema_migrations'])assert.ok(toc.includes(item));native('pg_restore',['--file=-',archive],{discard:true});
 phase='post_state';const after=read();assert.deepEqual(after.relations,before.relations);assert.equal(after.cronActive,0);assert.equal(after.otherActiveClients,0);
 fs.writeFileSync(directory+'/before-state.json',JSON.stringify(before));fs.writeFileSync(directory+'/preservation-query.sql',sql);
 Object.assign(report,{status:'PASS',directory,beforeStateSha256:sha(JSON.stringify(before)),querySha256:sha(sql),archiveBytes:fs.statSync(archive).size,archiveSha256:sha(fs.readFileSync(archive)),stateSha256:sha(JSON.stringify(before.relations)),tableCount:before.relations.length,historyCount:before.historyCount,vaultCount:before.vaultCount,storageCount:before.storageCount,cronActive:0,archiveParsedCompletely:true,preservationBeforeAfter:true,portableRestoreProven:false,completedAt:new Date().toISOString()});
}catch(e){Object.assign(report,{phase,failureClass:e.code??e.diagnostic??'SANITIZED_FAILURE'});process.exitCode=1;}
fs.writeFileSync(receiptPath,JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({...report,directory:undefined}));
