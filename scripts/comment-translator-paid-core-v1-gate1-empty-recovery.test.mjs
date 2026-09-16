import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {AUTH_PATCH,AUTH_CLOSE_PATCH,REALTIME_PATCH,INVENTORY_COUNTS,MANAGED_EVENT_TRIGGERS,GUARD_BODY_SHA256,reviewPlan,authReadback,captureAuthReadback,applyEmptySetting,verifyGuardOverlay,verifyEmptyInventory,checkGuardCollision,assessReadback,closingDecision} from './gate1-execution/empty-recovery.mjs';
import {classifyClosingState} from './gate1-execution/closing-contract.mjs';

export function guard(){
 return {schemaOwner:'postgres',schemaCount:1,functionCount:1,relationCount:0,typeCount:0,defaultAclCount:0,
  functionOwner:'postgres',language:'sql',returnsJsonb:true,securityDefiner:false,strict:false,volatility:'i',config:['search_path=pg_catalog'],bodySha256:GUARD_BODY_SHA256,
  acl:[['schema','postgres','CREATE'],['schema','postgres','USAGE'],['schema','supabase_auth_admin','USAGE'],['function','postgres','EXECUTE'],['function','supabase_auth_admin','EXECUTE']].map(([object,grantee,privilege])=>({object,grantee,privilege,grantor:'postgres',grantable:false})),
  roles:['anon','authenticated','service_role','supabase_auth_admin'].map(role=>({role,usage:role==='supabase_auth_admin',create:false,execute:role==='supabase_auth_admin'}))};
}
function fixture(){
 const target={projectRef:'a'.repeat(20),organizationId:'b'.repeat(20),name:'ct-gate1-recovery-v2',region:'ap-northeast-1',createdAt:'1970-01-01T00:00:00.000Z',creationReceiptSha256:'c'.repeat(64),operatorCidrs:['192.0.2.1/32','2001:db8::1/128']};
 const at=1000,targetSha256=reviewPlan(target).targetSha256;
 const capture=value=>({targetSha256,at,complete:true,status:200,origin:'ISOLATED_FIXTURE',value});
 return {target,startedAt:0,finishedAt:2000,captures:{
  project:capture({id:target.projectRef,organization_id:target.organizationId,name:target.name,region:target.region,created_at:target.createdAt,status:'ACTIVE_HEALTHY'}),
  auth:capture(authReadback({...AUTH_PATCH,smtp_pass:'hidden***',smtp_host:'private.invalid'})),realtime:capture({...REALTIME_PATCH}),
  dataApi:capture({kind:'MANUAL_TARGET_TIME_EVIDENCE',enabled:false,aiReviewed:true,evidenceSha256:'d'.repeat(64)}),
  network:capture({entitlement:'allowed',status:'applied',config:{dbAllowedCidrs:target.operatorCidrs.filter(x=>x.endsWith('/32')),dbAllowedCidrsV6:target.operatorCidrs.filter(x=>x.endsWith('/128'))}}),
  capabilities:capture({functions:0,ssoProviders:0,thirdPartyProviders:0,customHostnames:0,vanitySubdomains:0,storageBuckets:0,completeLists:true,noImportedData:true,creationReceiptSha256:target.creationReceiptSha256}),
  catalog:capture({schemaVersion:1,readOnly:true,rowSecurityOff:true,role:'postgres',superuser:false,serverMajor:17,tls:false,guard:guard(),eventTriggers:structuredClone(MANAGED_EVENT_TRIGGERS),
   inventory:['auth.users','auth.sessions','storage.buckets','storage.objects','cron.job','net.http_request_queue','supabase_functions.hooks'].map((name,i)=>({name,present:i<4,rows:i<4?0:null})),
   ...Object.fromEntries(INVENTORY_COUNTS.map(n=>[n,0]))}),
 }};
}

const fixtureApproval=(target,directory)=>({decision:'APPROVED',purpose:'EMPTY_RECOVERY_SETTINGS_ONLY',
 targetSha256:reviewPlan(target).targetSha256,evidenceDirectory:path.resolve(directory),origin:'ISOLATED_FIXTURE'});
test('plan only, explicit setting values, no production clocks or restore authority',()=>{
 const p=reviewPlan();assert.equal(p.targetSha256,null);assert.equal(p.authority,'NOT_AUTHORIZATION');
 assert.equal(p.authBindPatch.hook_send_email_uri,p.authBindPatch.hook_send_sms_uri);assert.equal(p.authClosePatch.disable_signup,true);
 assert.equal(p.authClosePatch.hook_send_email_enabled,false);assert.equal(p.limits.authPatch,2);
 assert.deepEqual(p.realtimePatch,{suspend:true,private_only:true,presence_enabled:false});
 assert.equal(p.limits.restore,0);assert.equal(p.limits.authProbe,0);assert.equal(p.clocks.productionClocksImplemented,false);
});
test('complete isolated readback stays local and cannot authorize isolation, restore or old closure',()=>{
 const r=assessReadback(fixture(),{local:true});assert.equal(r.status,'LOCAL_EMPTY_READBACK_PASS');
 for(const k of ['behaviorVerified','isolationVerified','restoreAuthorized','formalStopAccepted'])assert.equal(r[k],false);
 assert.throws(()=>assessReadback(fixture()));
 assert.throws(()=>classifyClosingState(r,{runId:'a'.repeat(64),predecessor:{runId:'b'.repeat(64)}}));
});
test('missing/masked/changed/new Auth capabilities rejected without revealing data',()=>{
 for(const change of [v=>delete v.hook_send_sms_uri,v=>v.hook_send_email_uri='https://private.invalid/secret',v=>v.external_google_enabled=true,v=>v.hook_unreviewed_enabled=false]){
  const f=fixture(),raw={...AUTH_PATCH};change(raw);f.captures.auth.value=authReadback(raw);assert.throws(()=>assessReadback(f,{local:true}));
 }
 const r=authReadback({smtp_pass:'sbp_private',smtp_host:'private.invalid',hook_send_sms_uri:'masked***'});
 assert.equal(r.fields.hook_send_sms_uri,'MISMATCH');assert.equal(r.fields.hook_send_email_uri,'NOT_RETURNED');
 assert.equal(r.credentialAbsenceProven,false);assert.ok(!JSON.stringify(r).includes('private'));
});
test('target mix, response unknown, stale capture, unreviewed Data API and pending network fail closed',()=>{
 for(const change of [f=>f.captures.auth.targetSha256='e'.repeat(64),f=>f.captures.network.complete=false,
  f=>f.captures.auth.at=-1,f=>f.captures.auth.status=403,f=>f.captures.dataApi.value.aiReviewed=false,
  f=>f.captures.dataApi.value={db_schema:''},f=>f.captures.network.value.status='stored',
  f=>f.captures.network.value.old_config={},f=>f.captures.network.value.config.dbAllowedCidrs.pop(),
  f=>f.captures.realtime.value.suspend=false,f=>f.captures.capabilities.value.completeLists=false,
  f=>f.captures.capabilities.value.functions=1,f=>f.captures.project.value.status='INACTIVE',f=>f.captures.project.value.created_at='2000-01-01T00:00:00Z']){
  const f=fixture();change(f);assert.throws(()=>assessReadback(f,{local:true}));
 }
});
test('no broad networks, invalid addresses, missing address family or initial unbound target',()=>{
 for(const operatorCidrs of [['0.0.0.0/0','::/0'],['192.0.2.1/32'],['192.0.2.1/32','::::/128'],['192.0.2.1/32','::1/128']]){
  const f=fixture();f.target.operatorCidrs=operatorCidrs;assert.throws(()=>reviewPlan(f.target));
 }
 assert.throws(()=>reviewPlan({projectRef:'pending'}));
});
test('native empty inventory distinguishes missing tables from known absent optional queues',()=>{
 for(const change of [v=>v.inventory[0]={name:'auth.users',present:false,rows:null},v=>v.inventory[1].rows=1,
  v=>v.inventory[4]={name:'cron.job',present:true,rows:1},v=>v.inventory.pop(),v=>v.publicTriggers=1,v=>v.eventTriggers=1,
  v=>v.eventTriggers[0].definitionSha256='0'.repeat(64),v=>v.eventTriggers.push({...v.eventTriggers[0]}),
  v=>v.role='supabase_admin',v=>v.superuser=true]){
  const v=fixture().captures.catalog.value;change(v);assert.throws(()=>verifyEmptyInventory(v,{local:true}));
 }
 assert.throws(()=>verifyEmptyInventory(fixture().captures.catalog.value));
});
test('guard check is exact; extra objects, owner, membership grants and changed body are not allowed deltas',()=>{
 for(const change of [v=>v.functionCount++,v=>v.relationCount++,v=>v.typeCount++,v=>v.defaultAclCount++,v=>v.securityDefiner=true,
  v=>v.bodySha256='0'.repeat(64),v=>v.config=['search_path=public'],v=>v.acl[0].grantable=true,
  v=>v.roles[0].execute=true,v=>v.acl.push({object:'function',grantee:'PUBLIC',privilege:'EXECUTE',grantor:'postgres',grantable:false})]){
  const g=guard();change(g);assert.throws(()=>verifyGuardOverlay(g));
 }
 assert.equal(verifyGuardOverlay(guard()).applicationComparisonRequired,true);
});
test('reserved namespace collisions reject without changing SQL or authorizing unknown jobs/dynamic SQL',()=>{
 const clean='CREATE TABLE public.example (id int);';assert.equal(checkGuardCollision(clean).restoreAuthorized,false);
 for(const sql of ['DROP SCHEMA gate1_restore_guard CASCADE;', 'SELECT public.some_function(\'gate1_restore_guard\');',
 'DO $$ BEGIN EXECUTE \'DROP SCHEMA gate1_restore_guard CASCADE\'; END $$;'])assert.throws(()=>checkGuardCollision(sql));
 assert.equal(clean,'CREATE TABLE public.example (id int);');
});
test('interruption, missing readback, and ten-minute boundary always retain control without false closure',()=>{
 const early=closingDecision({startedAt:0,now:599999});assert.equal(early.status,'ISOLATION_UNCONFIRMED');
 for(const input of [{startedAt:0,now:600000},{startedAt:0,now:0,interrupted:true},{startedAt:0,now:900000,readback:{status:'RESTORED'}}]){
  const r=closingDecision(input);assert.equal(r.status,'NEEDS_OPERATOR');assert.equal(r.successfulClosure,false);
  assert.equal(r.keepControlCredentials,true);assert.equal(r.automaticRevoke,false);assert.equal(r.automaticPause,false);
 }
});
test('actual CLI is local-only, rejects execute and fixture-as-Hosted; errors never echo secrets',()=>{
 const entry='scripts/gate1-execution/empty-recovery.mjs';
 const env={SystemRoot:process.env.SystemRoot,PATH:process.env.PATH,TEMP:process.env.TEMP};
 const run=args=>spawnSync(process.execPath,[entry,...args],{encoding:'utf8',env,windowsHide:true,timeout:10000});
 assert.equal(JSON.parse(run(['--plan']).stdout).authority,'NOT_AUTHORIZATION');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gate1-empty-test-')),input=path.join(dir,'fixture.json');
 try{fs.writeFileSync(input,JSON.stringify(fixture()));const r=run(['--assess',input]);assert.equal(r.status,1);assert.ok(!r.stdout.includes('private'));
  assert.equal(JSON.parse(run(['--assess-local',input]).stdout).status,'LOCAL_EMPTY_READBACK_PASS');
  assert.equal(run(['--execute','sbp_private']).status,1);
 }finally{fs.unlinkSync(input);fs.rmdirSync(dir);}
});
test('existing GET transport seam: fixed new target, claim before call, sanitize before storage, no replay',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'gate1-empty-capture-')),target=fixture().target;let calls=0;
 try{
  const request=async p=>{calls++;assert.ok(fs.existsSync(path.join(directory,'empty-auth-after-claimed.json')));assert.equal(p.hostname,'api.supabase.com');assert.equal(p.route,'/v1/projects/'+target.projectRef+'/config/auth');return {complete:true,status:200,value:{...AUTH_PATCH,smtp_pass:'secret-token',smtp_host:'secret-destination'}};};
  const args={target,directory,phase:'after',token:'synthetic-secret',request,local:true};
  const r=await captureAuthReadback(args);assert.equal(r.value.stage,'GUARD_BOUND');assert.equal(r.origin,'ISOLATED_FIXTURE');
  await assert.rejects(captureAuthReadback(args));assert.equal(calls,1);
  await captureAuthReadback({...args,phase:'closed',request:async()=>{throw Error('secret-error');}});
  for(const file of fs.readdirSync(directory))assert.ok(!fs.readFileSync(path.join(directory,file),'utf8').includes('secret'));
 }finally{for(const file of fs.readdirSync(directory))fs.unlinkSync(path.join(directory,file));fs.rmdirSync(directory);}
});
test('fixed setting dispatch connects close/SQL receipt/bind and native shapes without a Hosted call',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'gate1-empty-setting-')),f=fixture(),calls=[];
 try{
  const request=async op=>{calls.push(op);return {status:op.route.endsWith('config/realtime')?204:200,complete:true,value:{smtp_pass:'never-save'}};};
  const args={target:f.target,approval:fixtureApproval(f.target,directory),projectReadback:f.captures.project,directory,token:'synthetic-secret',request,now:()=>1000};
  const close=await applyEmptySetting({...args,stage:'auth-close'});assert.equal(close.applied,false);assert.equal(close.independentReadbackRequired,true);
  assert.deepEqual(JSON.parse(calls[0].body),AUTH_CLOSE_PATCH);await assert.rejects(applyEmptySetting({...args,stage:'auth-close'}));
  await assert.rejects(applyEmptySetting({...args,stage:'auth-bind',guardReadback:f.captures.catalog}));assert.equal(calls.length,1);
  await captureAuthReadback({target:f.target,directory,phase:'closed',token:'synthetic-secret',request:async()=>({status:200,complete:true,value:AUTH_CLOSE_PATCH}),local:true,now:()=>1000});
  f.captures.catalog.value.tls=true; // Management/TLS observations are fixtures.
  await applyEmptySetting({...args,stage:'auth-bind',guardReadback:f.captures.catalog});
  await applyEmptySetting({...args,stage:'realtime-close'});await applyEmptySetting({...args,stage:'network-close'});
  assert.equal(calls.length,4);assert.equal(calls[3].method,'POST');assert.ok(calls[3].route.endsWith('/network-restrictions/apply'));
  for(const file of fs.readdirSync(directory))assert.ok(!/synthetic-secret|never-save/.test(fs.readFileSync(path.join(directory,file),'utf8')));
 }finally{for(const file of fs.readdirSync(directory))fs.unlinkSync(path.join(directory,file));fs.rmdirSync(directory);}
});
test('unknown write result stops subsequent stages and retains control; stale/wrong target never dispatches',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'gate1-empty-setting-')),f=fixture();let calls=0;
 try{
  const args={target:f.target,approval:fixtureApproval(f.target,directory),projectReadback:f.captures.project,directory,token:'synthetic',request:async()=>{calls++;return {status:200,complete:false};},now:()=>1000};
  await assert.rejects(applyEmptySetting({...args,stage:'auth-close',now:()=>601001}));assert.equal(calls,0);
  await assert.rejects(applyEmptySetting({...args,stage:'auth-close',projectReadback:{...f.captures.project,targetSha256:'f'.repeat(64)}}));assert.equal(calls,0);
  // Native sender may never consume fixture-marked target evidence.
  await assert.rejects(applyEmptySetting({...args,stage:'auth-close',request:undefined}));assert.equal(calls,0);
  const r=await applyEmptySetting({...args,stage:'auth-close'});assert.equal(r.outcome,'UNCONFIRMED_STOP');
  await assert.rejects(applyEmptySetting({...args,stage:'realtime-close'}));assert.equal(calls,1);
 }finally{for(const file of fs.readdirSync(directory))fs.unlinkSync(path.join(directory,file));fs.rmdirSync(directory);}
});

test('missing, review-only, wrong-target/directory and fixture-as-live authority never claims or dispatches',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'gate1-empty-approval-')),f=fixture();let calls=0;
 try{
  const valid=fixtureApproval(f.target,directory);
  const args={target:f.target,projectReadback:f.captures.project,directory,token:'synthetic',stage:'auth-close',request:async()=>{calls++;return {status:200,complete:true};},now:()=>1000};
  for(const approval of [undefined,reviewPlan(f.target),{...valid,decision:'PENDING'},
   {...valid,targetSha256:'f'.repeat(64)},{...valid,evidenceDirectory:path.join(directory,'other')},
   {...valid,purpose:'GIT_PUBLICATION_ONLY'}])await assert.rejects(applyEmptySetting({...args,approval}));
  await assert.rejects(applyEmptySetting({...args,approval:valid,projectReadback:{...f.captures.project,origin:'HOSTED_READBACK'},request:undefined}));
  assert.equal(calls,0);assert.deepEqual(fs.readdirSync(directory),[]);
 }finally{fs.rmdirSync(directory);}
});
