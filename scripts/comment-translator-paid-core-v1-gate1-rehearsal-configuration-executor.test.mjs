import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import childProcess from 'node:child_process';
import {EventEmitter} from 'node:events';
import {syncBuiltinESMExports} from 'node:module';
import {buildRehearsalServiceChange} from './lib/comment-translator-paid-core-v1-gate1-rehearsal-configuration.mjs';
import {createRehearsalConfigurationController,createManagedRehearsalConfiguration,rehearsalConfigurationClaimSha256,controllerConfigurationClaimSha256,compareFullConfigurationReadback} from './lib/comment-translator-paid-core-v1-gate1-rehearsal-configuration-executor.mjs';
import {createRehearsalAttemptLedger} from './lib/comment-translator-paid-core-v1-gate1-rehearsal-executor.mjs';
const target={projectRef:'abcdefghijklmnopqrst',origin:'https://api.supabase.com',style:'management'};
const change=()=>buildRehearsalServiceChange('realtime',{suspend:false},{suspend:true});
function fixture(){const calls=[];let value=false;const transport={read:async()=>{calls.push('read');return {suspend:value};},claim:()=>{calls.push('claim');return true;},patch:async request=>{calls.push('patch');assert.equal(request.postData,'{"suspend":true}');value=true;return {status:204};},stop:async()=>{calls.push('stop');return true;}};return {calls,transport,run:()=>createRehearsalConfigurationController(transport,target).apply(change())};}
test('checks fresh before values, sends only the patch, and reads back independently',async()=>{const f=fixture();assert.equal((await f.run()).status,'CONFIGURATION_READBACK_MATCHED');assert.deepEqual(f.calls,['read','claim','patch','read']);});
test('a stale before snapshot sends no patch',async()=>{const f=fixture();f.transport.read=async()=>({suspend:true});await assert.rejects(f.run(),e=>e.attemptOwned===false);assert.deepEqual(f.calls,[]);});
test('redirects, uncertain responses and readback mismatches stop the owned attempt without a second write',async()=>{for(const mode of ['redirect','timeout','readback','unexpected200']){const f=fixture();f.transport.patch=async()=>{f.calls.push('patch');if(mode==='timeout')throw Error('private credentials');return {status:mode==='redirect'?302:mode==='unexpected200'?200:204};};await assert.rejects(f.run(),e=>e.message==='REHEARSAL_CONFIGURATION_EXECUTION_REJECTED'&&e.stopConfirmed);assert.equal(f.calls.filter(x=>x==='patch').length,1);assert.equal(f.calls.at(-1),'stop');}});
test('a duplicate claim cannot write or stop the other attempt',async()=>{const f=fixture();f.transport.claim=()=>{throw Error();};await assert.rejects(f.run(),e=>e.attemptOwned===false);assert.deepEqual(f.calls,['read']);});
test('reordering JSON keys cannot create a fresh configuration attempt',()=>{
 const before={db_schema:'public',max_rows:1000,db_extra_search_path:'public, extensions',db_pool:null,db_pool_acquisition_timeout:10};
 const a=buildRehearsalServiceChange('postgrest',before,{db_schema:''}),b=buildRehearsalServiceChange('postgrest',Object.fromEntries(Object.entries(before).reverse()),{db_schema:''});
 assert.equal(rehearsalConfigurationClaimSha256(target.projectRef,a),rehearsalConfigurationClaimSha256(target.projectRef,b));
});
test('full Management readback preserves every unmodified field, including fields never sent',()=>{
 const before={suspend:false,secret:'synthetic-private',nested:{enabled:false}};
 assert.equal(compareFullConfigurationReadback(before,{...before,suspend:true},{suspend:true}),true);
 for(const after of [{suspend:true},{...before,suspend:true,secret:'changed'},{...before,suspend:true,nested:{enabled:true}},{...before,suspend:true,extra:true}])assert.throws(()=>compareFullConfigurationReadback(before,after,{suspend:true}));
});

test('native Realtime PATCH accepts empty 204 only after independent complete readback',async t=>{
 fs.mkdirSync('.tmp',{recursive:true});const ledgerRoot=fs.mkdtempSync(path.resolve('.tmp/rehearsal-config-native-'));
 t.mock.method(childProcess,'spawnSync',()=>({status:0,stdout:ledgerRoot,stderr:''}));syncBuiltinESMExports();
 t.after(()=>{t.mock.restoreAll();syncBuiltinESMExports();});
 const calls=[];let suspended=false,stops=0;
 t.mock.method(https,'request',(url,options,callback)=>{
  assert.equal(url,'https://api.supabase.com/v1/projects/'+target.projectRef+'/config/realtime');
  assert.equal(options.headers.Authorization,'Bearer '+'s'.repeat(64));
  const request=new EventEmitter();request.destroy=()=>{};
  request.end=body=>queueMicrotask(()=>{
   calls.push(options.method);const response=new EventEmitter();let destroyed=false;
   response.complete=true;response.destroy=()=>{destroyed=true;};
   if(options.method==='PATCH'){assert.equal(body,'{"suspend":true}');suspended=true;response.statusCode=204;}
   else{assert.equal(options.method,'GET');response.statusCode=200;}
   callback(response);if(destroyed)return;
   if(options.method==='GET')response.emit('data',Buffer.from(JSON.stringify({suspend:suspended,unmodified:{enabled:true}})));
   response.emit('end');
  });return request;
 });
 const managed=createManagedRehearsalConfiguration({approvedRecoveryRef:target.projectRef,protectedProjectRefs:['b'.repeat(20),'c'.repeat(20)],managementToken:'s'.repeat(64),stop:async()=>{stops++;return false;}});
 assert.equal((await managed.apply(change())).status,'CONFIGURATION_READBACK_MATCHED');
 assert.deepEqual(calls,['GET','PATCH','GET']);assert.equal(stops,0);
});

test('the Management Realtime status rule does not change Dashboard response handling',async()=>{
 for(const status of [200,204]){
  const f=fixture();f.transport.patch=async()=>({status});f.transport.read=async()=>({suspend:f.calls.length>0});
  const apply=()=>createRehearsalConfigurationController(f.transport,{...target,style:'dashboard'}).apply(change());
  if(status===200)assert.equal((await apply()).status,'CONFIGURATION_READBACK_MATCHED');
  else await assert.rejects(apply(),e=>e.phase==='patch'&&e.stopConfirmed);
 }
});

test('native empty-204 handling rejects partial bodies, unexpected content and changed readback without another PATCH',async t=>{
 for(const mode of ['partial','content','readback'])await t.test(mode,async t=>{
  fs.mkdirSync('.tmp',{recursive:true});const ledgerRoot=fs.mkdtempSync(path.resolve('.tmp/rehearsal-config-native-'));
  t.mock.method(childProcess,'spawnSync',()=>({status:0,stdout:ledgerRoot,stderr:''}));syncBuiltinESMExports();
  t.after(()=>{t.mock.restoreAll();syncBuiltinESMExports();});
  const calls=[];let suspended=false,stops=0;
  t.mock.method(https,'request',(_url,options,callback)=>{
   const request=new EventEmitter();request.destroy=()=>{};request.end=()=>queueMicrotask(()=>{
    calls.push(options.method);const response=new EventEmitter();response.destroy=()=>{};
    response.statusCode=options.method==='PATCH'?204:200;response.complete=!(options.method==='PATCH'&&mode==='partial');
    if(options.method==='PATCH')suspended=true;callback(response);
    if(options.method==='GET')response.emit('data',Buffer.from(JSON.stringify({suspend:suspended,untouched:suspended&&mode==='readback'?'changed':'original'})));
    else if(mode==='content')response.emit('data',Buffer.from('{}'));
    response.emit('end');
   });return request;
  });
  const managed=createManagedRehearsalConfiguration({approvedRecoveryRef:target.projectRef,protectedProjectRefs:['b'.repeat(20),'c'.repeat(20)],managementToken:'s'.repeat(64),stop:async()=>{stops++;return false;}});
  await assert.rejects(managed.apply(change()),e=>e.attemptOwned&&!e.stopConfirmed&&e.phase===(mode==='readback'?'readback':'patch'));
  assert.equal(calls.filter(x=>x==='PATCH').length,1);assert.equal(stops,1);
 });
});

test('native configuration cancellation before ownership makes no request or stop',async t=>{
 let requests=0,stops=0;const c=new AbortController();c.abort();t.mock.method(https,'request',()=>{requests++;throw Error();});
 const managed=createManagedRehearsalConfiguration({approvedRecoveryRef:target.projectRef,protectedProjectRefs:['b'.repeat(20),'c'.repeat(20)],managementToken:'s'.repeat(64),signal:c.signal,stop:async()=>{stops++;return false;}});
 await assert.rejects(managed.apply(change()),e=>!e.attemptOwned&&!e.stopConfirmed);assert.equal(requests,0);assert.equal(stops,0);
});

test('native configuration cancellation during owned PATCH stops once and performs no later readback',async t=>{
 fs.mkdirSync('.tmp',{recursive:true});const ledgerRoot=fs.mkdtempSync(path.resolve('.tmp/rehearsal-config-native-'));const c=new AbortController(),calls=[];let stops=0,destroyed=0;
 t.mock.method(childProcess,'spawnSync',()=>({status:0,stdout:ledgerRoot,stderr:''}));syncBuiltinESMExports();t.after(()=>{t.mock.restoreAll();syncBuiltinESMExports();});
 t.mock.method(https,'request',(_url,options,callback)=>{const request=new EventEmitter();request.destroy=()=>{destroyed++;};request.end=()=>queueMicrotask(()=>{
  calls.push(options.method);if(options.method==='PATCH'){c.abort();return;}
  const response=new EventEmitter();response.statusCode=200;response.complete=true;response.destroy=()=>{};callback(response);response.emit('data',Buffer.from('{"suspend":false}'));response.emit('end');
 });return request;});
 const managed=createManagedRehearsalConfiguration({approvedRecoveryRef:target.projectRef,protectedProjectRefs:['b'.repeat(20),'c'.repeat(20)],managementToken:'s'.repeat(64),signal:c.signal,stop:async()=>{stops++;return false;}});
 await assert.rejects(managed.apply(change()),e=>e.attemptOwned&&!e.stopConfirmed&&e.phase==='patch');assert.deepEqual(calls,['GET','PATCH']);assert.equal(stops,1);assert.equal(destroyed,1);
});

test('controller setup and reopen are separate durable stages; changed payload cannot repeat a consumed stage',()=>{
 fs.mkdirSync('.tmp',{recursive:true});const root=fs.mkdtempSync(path.resolve('.tmp/rehearsal-config-stage-')),runId='a'.repeat(64),ledger=createRehearsalAttemptLedger(root);
 const setup=controllerConfigurationClaimSha256(target.projectRef,{runId,stage:'setup-auth'},'auth'),reopen=controllerConfigurationClaimSha256(target.projectRef,{runId,stage:'reopen-auth'},'auth');
 assert.notEqual(setup,reopen);assert.equal(ledger.claim(setup),true);assert.equal(ledger.claim(reopen),true);
 assert.throws(()=>createRehearsalAttemptLedger(root).claim(controllerConfigurationClaimSha256(target.projectRef,{stage:'setup-auth',runId},'auth')));
 for(const attempt of [{runId,stage:'retry-auth'},{runId,stage:'setup-auth',payload:'changed'},{runId:'invalid',stage:'setup-auth'},{runId,stage:'setup-realtime'}])assert.throws(()=>controllerConfigurationClaimSha256(target.projectRef,attempt,'auth'));
});

test('Auth and PostgREST still require 200 independently of the Realtime contract',async()=>{
 const examples=[['auth',{disable_signup:true,external_email_enabled:false,external_phone_enabled:false,external_anonymous_users_enabled:false,security_manual_linking_enabled:false},{external_email_enabled:true}],['postgrest',{db_schema:'public',max_rows:1000,db_extra_search_path:'public, extensions',db_pool:null,db_pool_acquisition_timeout:10},{db_schema:''}]];
 for(const [service,before,patch] of examples)for(const status of [200,204]){
  const change=buildRehearsalServiceChange(service,before,patch);let value={...before},stops=0;
  const controller=createRehearsalConfigurationController({read:async()=>value,claim:()=>true,patch:async()=>{value={...before,...patch};return {status};},stop:async()=>{stops++;return false;}},target);
  if(status===200){assert.equal((await controller.apply(change)).status,'CONFIGURATION_READBACK_MATCHED');assert.equal(stops,0);}
  else{await assert.rejects(controller.apply(change),e=>e.attemptOwned&&!e.stopConfirmed&&e.phase==='patch');assert.equal(stops,1);}
 }
});
