import test from 'node:test';
import assert from 'node:assert/strict';
import {createProvider} from './provider.mjs';
import {mutationDiagnosticsHeader,parseMutationDiagnosticsHeader} from './mutation-diagnostics.mjs';
const policy={mode:'live',previewRef:'p'.repeat(20),recoveryRef:'r'.repeat(20),productionRef:'x'.repeat(20),organizationId:'synthetic-org',sourceCommit:'a'.repeat(40),emergencyPreviewResume:true};
const token='sbp_fc'+'z'.repeat(50);
test('mutation rejection preserves its stage without disclosing response data or changing UNKNOWN',async()=>{
 let calls=0;const p=createProvider(policy,token,{fetchImpl:async()=>{calls++;return new Response('PRIVATE_RESPONSE_SENTINEL',{status:403});}});
 const r=await p.mutateObserved('previewPause');assert.equal(r.outcome,'UNKNOWN');assert.equal(r.observation.code,'HTTP_STATUS');assert.equal(r.observation.httpStatus,403);assert.equal(calls,1);assert.equal(JSON.stringify(r).includes('PRIVATE'),false);assert.equal(JSON.stringify(r).includes(token),false);
});
test('complete empty HTTP200 remains accepted and gets a distinct observation',async()=>{
 const p=createProvider(policy,token,{fetchImpl:async()=>new Response(null,{status:200})});const r=await p.mutateObserved('previewResume');assert.equal(r.outcome,'ACCEPTED');assert.equal(r.observation.code,'ACCEPTED_EMPTY');assert.equal(r.observation.bodyComplete,true);assert.equal(r.observation.bodyBytes,0);
});
test('failed fetch, body framing, byte limit, decoding and JSON retain separate safe causes',async()=>{
 const cases=[
  [async()=>{throw Error('PRIVATE_FETCH_SENTINEL');},'FETCH_FAILED',false],
  [async()=>new Response(new ReadableStream({start(c){c.error(Error('PRIVATE_BODY_SENTINEL'));}})),'BODY_FAILED',false],
  [async()=>new Response('x'.repeat(65537)),'BODY_LIMIT',false],
  [async()=>new Response(new Uint8Array([0xff])),'UTF8_INVALID',true],
  [async()=>new Response('{'),'JSON_INVALID',true],
  [async()=>new Response('{"x":1,"x":2}'),'JSON_INVALID',true],
  [async()=>new Response('null'),'BODY_SHAPE',true],
  [async()=>new Response('{}'),'ACCEPTED_OBJECT',true],
 ];
 for(const [fetchImpl,code,complete] of cases){let calls=0;const p=createProvider(policy,token,{fetchImpl:async(...args)=>{calls++;return fetchImpl(...args);}});const r=await p.mutateObserved('previewPause');assert.equal(r.observation.code,code);assert.equal(r.observation.bodyComplete,complete);assert.equal(r.outcome,code==='ACCEPTED_OBJECT'?'ACCEPTED':'UNKNOWN');assert.equal(calls,1);assert.equal(JSON.stringify(r).includes('PRIVATE'),false);}
});
test('deadline cancels a stalled body once and never grants acceptance',async()=>{
 let cancelled=0,calls=0;const p=createProvider(policy,token,{fetchImpl:async()=>{calls++;return new Response(new ReadableStream({cancel(){cancelled++;}}));}});const r=await p.mutateObserved('previewPause');assert.equal(r.outcome,'UNKNOWN');assert.equal(r.observation.code,'DEADLINE');assert.equal(r.observation.bodyComplete,false);assert.equal(r.observation.httpStatus,200);assert.equal(calls,1);assert.equal(cancelled,1);
});
test('clock-window violation stays UNKNOWN and all original mutation targets stay fixed',async()=>{
 let clock=1000,calls=0;const p=createProvider(policy,token,{now:()=>clock,fetchImpl:async()=>{calls++;clock+=3001;return new Response(null);}});const r=await p.mutateObserved('previewPause');assert.equal(r.outcome,'UNKNOWN');assert.equal(r.observation.code,'CLOCK_WINDOW');await assert.rejects(p.mutateObserved('productionPause'));assert.equal(calls,1);
});
test('bounded header discards arbitrary values, duplicate keys and sensitive extensions',()=>{
 const observation={stage:'HEADERS',code:'HTTP_STATUS',httpStatus:403,bodyBytes:0,bodyComplete:false,elapsedMs:2},state={runId:'b'.repeat(64),operations:{previewPause:{outcome:'UNKNOWN',observation}}},header=mutationDiagnosticsHeader(state);assert.ok(parseMutationDiagnosticsHeader(header));
 for(const value of [header+' ',header.replace('"schemaVersion":1','"schemaVersion":1,"schemaVersion":1'),header.replace('"HTTP_STATUS"','"PRIVATE_SENTINEL"'),JSON.stringify({...JSON.parse(header),privateToken:token}),header.replace('"bodyBytes":0','"bodyBytes":65538'),'x'.repeat(4097),null])assert.equal(parseMutationDiagnosticsHeader(value),null);
 assert.equal(mutationDiagnosticsHeader({...state,operations:{previewPause:{outcome:'UNKNOWN',observation:{...observation,private:token}}}}),null);
});
