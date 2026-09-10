import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRehearsalServiceChange} from './lib/comment-translator-paid-core-v1-gate1-rehearsal-configuration.mjs';
import {createRehearsalConfigurationController,rehearsalConfigurationClaimSha256,compareFullConfigurationReadback} from './lib/comment-translator-paid-core-v1-gate1-rehearsal-configuration-executor.mjs';
const target={projectRef:'abcdefghijklmnopqrst',origin:'https://api.supabase.com',style:'management'};
const change=()=>buildRehearsalServiceChange('realtime',{suspend:false},{suspend:true});
function fixture(){const calls=[];let value=false;const transport={read:async()=>{calls.push('read');return {suspend:value};},claim:()=>{calls.push('claim');return true;},patch:async request=>{calls.push('patch');assert.equal(request.postData,'{"suspend":true}');value=true;return {status:200};},stop:async()=>{calls.push('stop');return true;}};return {calls,transport,run:()=>createRehearsalConfigurationController(transport,target).apply(change())};}
test('checks fresh before values, sends only the patch, and reads back independently',async()=>{const f=fixture();assert.equal((await f.run()).status,'CONFIGURATION_READBACK_MATCHED');assert.deepEqual(f.calls,['read','claim','patch','read']);});
test('a stale before snapshot sends no patch',async()=>{const f=fixture();f.transport.read=async()=>({suspend:true});await assert.rejects(f.run(),e=>e.attemptOwned===false);assert.deepEqual(f.calls,[]);});
test('redirects, uncertain responses and readback mismatches stop the owned attempt without a second write',async()=>{for(const mode of ['redirect','timeout','readback']){const f=fixture();f.transport.patch=async()=>{f.calls.push('patch');if(mode==='timeout')throw Error('private credentials');return {status:mode==='redirect'?302:200};};await assert.rejects(f.run(),e=>e.message==='REHEARSAL_CONFIGURATION_EXECUTION_REJECTED'&&e.stopConfirmed);assert.equal(f.calls.filter(x=>x==='patch').length,1);assert.equal(f.calls.at(-1),'stop');}});
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
