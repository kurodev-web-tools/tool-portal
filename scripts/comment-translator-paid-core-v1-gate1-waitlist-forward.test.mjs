import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { computeBindingSha256 } from './comment-translator-paid-core-v1-gate1-preflight-readonly.mjs';
import { createHash } from 'node:crypto';
import { WAITLIST_CHECKS, WAITLIST_FORWARD, WAITLIST_READONLY_SQL, assertWaitlistConstraints } from './lib/comment-translator-paid-core-v1-gate1-waitlist-checks.mjs';
import { BACKUP_HISTORIES, verifyReviewedBackupCatalog } from './lib/comment-translator-paid-core-v1-gate1-backup-profile.mjs';
import { validateBackupSourceState } from './lib/comment-translator-paid-core-v1-gate1-backup-state.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const baseline=JSON.parse(fs.readFileSync('scripts/fixtures/comment-translator-paid-core-v1-gate1-environment-inventories.json'));
const oldSql=fs.readFileSync('supabase/migrations/20260705000000_comment_translator_creator_waitlist_registrations.sql','utf8');
const forward=fs.readFileSync(`supabase/migrations/${WAITLIST_FORWARD.version}_${WAITLIST_FORWARD.name}.sql`,'utf8');
function checkExpression(name) {
  const start=oldSql.indexOf('(',oldSql.indexOf('constraint '+name));let depth=1,quote=false;
  for(let i=start+1;i<oldSql.length;i++){const c=oldSql[i];if(c==="'"){if(quote&&oldSql[i+1]==="'"){i++;continue;}quote=!quote;}if(!quote){if(c==='(')depth++;if(c===')'&&--depth===0)return oldSql.slice(start+1,i).trim().replace(/\s+/g,' ');}}
  throw Error('SOURCE_CHECK_NOT_FOUND');
}
test('four predicates come from immutable historical SQL; only FALSE violates CHECK',()=>{
  assert.equal(WAITLIST_CHECKS.length,4);
  for(const c of WAITLIST_CHECKS){assert.equal(c.expression,checkExpression(c.name));assert.ok(WAITLIST_READONLY_SQL.includes('('+c.expression+') IS FALSE'));assert.ok(forward.includes(c.expression.replaceAll("'","''")));}
  assert.match(WAITLIST_READONLY_SQL,/BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY/);
  assert.ok(WAITLIST_READONLY_SQL.trim().endsWith('ROLLBACK;'));
  assert.doesNotMatch(WAITLIST_READONLY_SQL,/SELECT \*|string_agg|jsonb_agg|INSERT|UPDATE|DELETE|pg_sleep/i);
});
test('history identities remain separate: pre22, historical post56, candidate post57',()=>{
  assert.deepEqual(BACKUP_HISTORIES.post56,baseline.final56);assert.equal(BACKUP_HISTORIES.pre22.length,22);
  assert.deepEqual(BACKUP_HISTORIES.post57,[...baseline.final56,WAITLIST_FORWARD]);
  const pending=BACKUP_HISTORIES.post57.filter(r=>!BACKUP_HISTORIES.pre22.some(p=>p.version===r.version&&p.name===r.name));assert.equal(pending.length,35);
  assert.deepEqual(pending.slice(0,-1),baseline.production.pending34);
});
const supplement=()=>({structureSha256:'1'.repeat(64),objects:WAITLIST_CHECKS.map(c=>['constraint','public','comment_translator_creator_waitlist_registrations',c.name,true,'CHECK ('+c.canonical+')'])});
test('57 catalog requires each exact validated CHECK; same-name substitution is rejected',()=>{
  assert.equal(assertWaitlistConstraints(supplement()),true);
  for(const change of [s=>s.objects.pop(),s=>s.objects.push(s.objects[0]),s=>s.objects[0][4]=false,s=>s.objects[0][5]='CHECK (true)',s=>s.objects[0][1]='other']){const s=supplement();change(s);assert.throws(()=>assertWaitlistConstraints(s));}
});
test('reviewed 57 backup binding requires exact history, artifact hash and CHECKs',()=>{
  const binding='2'.repeat(64);const catalog={target:'production',targetBindingSha256:binding,readOnly:{transactionReadOnly:'on',transactionIsolation:'repeatable read'},history:{rows:BACKUP_HISTORIES.post57},initialReleaseSupplement:supplement()};
  function verify(c,expectedHash){const bytes=Buffer.from(JSON.stringify(c));const profile={phase:'post57',structureSha256:'1'.repeat(64),reviewedCatalogSha256:expectedHash??sha(bytes),reviewedCatalogFile:'C:/synthetic/review.json'};return verifyReviewedBackupCatalog(profile,binding,{lstatSync:()=>({isFile:()=>true,isSymbolicLink:()=>false,size:bytes.length}),readFileSync:()=>bytes});}
  assert.equal(verify(catalog).phase,'post57');
  for(const change of [c=>c.history.rows=c.history.rows.slice(0,56),c=>c.history.rows[56]={...c.history.rows[56],name:'other'},c=>c.initialReleaseSupplement.objects.pop(),c=>c.target='preview',c=>c.targetBindingSha256='3'.repeat(64)]){const c=structuredClone(catalog);change(c);assert.throws(()=>verify(c));}
  assert.throws(()=>verify(catalog,'0'.repeat(64)));
});
test('57 source state allows business growth but still rejects unsupported secret/blob/vector and mixed histories',()=>{
  const state={schemaVersion:2,phase:'post57',history:structuredClone(BACKUP_HISTORIES.post57),historyCount:57,historySha256:'1'.repeat(64),rowCounts:[{identitySha256:'2'.repeat(64),rows:42}],rowDigests:[{identitySha256:'2'.repeat(64),sha256:'3'.repeat(64)}],authUsers:9,authForeignKeysSha256:'4'.repeat(64),grantsRlsSha256:'5'.repeat(64),structureSha256:'6'.repeat(64),sequencesSha256:'7'.repeat(64),legacyRows:12,vaultRows:0,storageObjects:0,vectorCounts:{'storage.buckets_vectors':0,'storage.vector_indexes':0},archiveSchemaCount:1,archiveUnsafeCount:0,archiveActiveTriggers:0,archiveRows:0};
  assert.equal(validateBackupSourceState(state),state);
  for(const change of [s=>s.phase='post56',s=>s.history[56].name='unknown',s=>s.vaultRows=1,s=>s.storageObjects=1,s=>s.vectorCounts['storage.vector_indexes']=1,s=>s.archiveRows=1]){const s=structuredClone(state);change(s);assert.throws(()=>validateBackupSourceState(s));}
});

test('actual Windows waitlist entry fails closed on invalid aggregates and binding, without retry or artifact', {skip:process.platform!=='win32'},()=>{
  const root=fs.mkdtempSync('D:/Gate1Backups/local-waitlist-entry-');
  const ca=Buffer.from('synthetic-ca');const caFile=path.join(root,'ca.crt');fs.writeFileSync(caFile,ca);
  const binding={schemaVersion:1,target:'production',connectionMode:'direct',projectRef:'fixtureproject',host:'db.fixtureproject.supabase.co',port:5432,database:'postgres',user:'postgres',sslMode:'verify-full',caSha256:sha(ca)};
  const request={target:'production',bindingJson:JSON.stringify(binding),expectedBindingSha256:computeBindingSha256(binding),env:{PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,PGHOST:binding.host,PGPORT:'5432',PGDATABASE:'postgres',PGUSER:'postgres',PGSSLMODE:'verify-full',PGSSLROOTCERT:caFile,PGPASSWORD:'synthetic-only'}};
  const source=path.join(root,'fixture.cs'),exe=path.join(root,'fixture.exe'),input=path.join(root,'reply.json'),calls=path.join(root,'calls.txt');
  // Substitute only the psql executable. No sockets/database credentials are used.
  fs.writeFileSync(source,`using System;using System.IO;class Fixture {static int Main(string[] args){if(args.Length==1&&args[0]=="--version"){Console.WriteLine("psql (PostgreSQL) 17.11");return 0;}var sql=Console.In.ReadToEnd();if(!sql.Contains("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY")||!sql.TrimEnd().EndsWith("ROLLBACK;"))return 80;File.AppendAllText(@"${calls}","query\\n");Console.Write(File.ReadAllText(@"${input}"));return 0;}}`);
  const env={PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,USERPROFILE:process.env.USERPROFILE};
  const compiled=spawnSync('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe',['/nologo','/target:exe','/out:'+exe,source],{env,timeout:10000,windowsHide:true,encoding:'utf8'});assert.equal(compiled.status,0);
  const base={kind:'waitlistChecks',readOnly:{serverVersionMajor:17,transactionReadOnly:'on',defaultTransactionReadOnly:'on',transactionIsolation:'repeatable read'},counts:{total:2,campaign:0,discountIntent:0,email:0,displayName:0,anyViolation:0}};
  const changes=[x=>x.counts.email=null,x=>x.counts.campaign=-1,x=>x.counts.email=3,x=>x.counts.anyViolation=1,x=>x.counts.email=0.5,x=>x.counts.extra=0,x=>x.readOnly.transactionReadOnly='off'];
  let attempts=0;
  for(const [i,change] of changes.entries()) {
    const value=structuredClone(base);change(value);fs.writeFileSync(input,JSON.stringify(value));
    const destination=path.join(root,'case-'+i);
    const r=spawnSync('pwsh',['-NoProfile','-NonInteractive','-File','scripts/comment-translator-paid-core-v1-gate1-catalog-acquire-readonly.ps1','-Environment','Production','-DestinationRoot',destination,'-ProtectedStdin','-ReadbackKind','WaitlistChecks','-PsqlPath',exe],{env,input:JSON.stringify(request),encoding:'utf8',timeout:20000,maxBuffer:65536,windowsHide:true});
    const result=JSON.parse(r.stdout);assert.equal(r.status,1);assert.equal(result.status,'FAIL');assert.match(result.reason,/^WAITLIST_(COUNTS|READONLY)_/);assert.equal(fs.existsSync(path.join(destination,'production','production-waitlist-checks.json')),false);
    assert.equal(r.stdout.includes('synthetic-only'),false);assert.equal(fs.readFileSync(calls,'utf8').trim().split('\n').length,++attempts);
  }
  const wrong=structuredClone(request);wrong.expectedBindingSha256='0'.repeat(64);
  const r=spawnSync('pwsh',['-NoProfile','-NonInteractive','-File','scripts/comment-translator-paid-core-v1-gate1-catalog-acquire-readonly.ps1','-Environment','Production','-DestinationRoot',path.join(root,'bad-binding'),'-ProtectedStdin','-ReadbackKind','WaitlistChecks','-PsqlPath',exe],{env,input:JSON.stringify(wrong),encoding:'utf8',timeout:20000,maxBuffer:65536,windowsHide:true});
  assert.equal(JSON.parse(r.stdout).reason,'TARGET_TLS_CONTEXT_REJECTED');assert.equal(fs.readFileSync(calls,'utf8').trim().split('\n').length,attempts);
});
