import test from 'node:test';
import assert from 'node:assert/strict';
import { createProvider, parseCanonicalJson } from './provider.mjs';
const policy={mode:'live',previewRef:'p'.repeat(20),recoveryRef:'r'.repeat(20),productionRef:'x'.repeat(20),organizationId:'synthetic-org',sourceCommit:'a'.repeat(40),emergencyPreviewResume:true};
const token='sbp_fc'+'z'.repeat(50);
const project=role=>({id:policy[role+'Ref'],organization_id:policy.organizationId,region:'ap-northeast-1',status:'ACTIVE_HEALTHY',database:{host:'db.'+policy[role+'Ref']+'.supabase.co',postgres_engine:'17'}});
test('canonical input rejects duplicate keys, nested duplicates and alternate JSON spellings',()=>{
  assert.deepEqual(parseCanonicalJson('{"a":1}'),{a:1});
  for(const s of ['{"a":1,"a":2}','{"a":{"x":1,"x":2}}','{"a": 1}','{"a":1e0}','[1]'])assert.throws(()=>parseCanonicalJson(s));
});
test('only scoped tokens and live policy can reach the fixed provider origin',()=>{
  for(const t of ['', 'sbp_'+'a'.repeat(40),token+'\n'])assert.throws(()=>createProvider(policy,t));
  assert.throws(()=>createProvider({...policy,mode:'simulation'},token));
});
test('provider verifies the bound project metadata and exposes only safe observations',async()=>{
  const calls=[];const p=createProvider(policy,token,{fetchImpl:async(url,options)=>{calls.push({url,options});return Response.json(project('preview'));},now:()=>1000});
  assert.deepEqual(await p.read('preview'),{status:'ACTIVE_HEALTHY',startedAt:1000,completedAt:1000});
  assert.equal(calls[0].url,'https://api.supabase.com/v1/projects/'+policy.previewRef);assert.equal(calls[0].options.redirect,'manual');
  await assert.rejects(p.read('production'));assert.equal(calls.length,1);
});
test('wrong identity, organization, host, engine, redirects and incomplete bodies are unknown',async()=>{
  for(const body of [{...project('preview'),id:policy.productionRef},{...project('preview'),organization_id:'different-org'},{...project('preview'),database:{host:'unbound.invalid',postgres_engine:'17'}},{...project('preview'),database:{...project('preview').database,postgres_engine:'16'}}]){
    const p=createProvider(policy,token,{fetchImpl:async()=>Response.json(body)});await assert.rejects(p.read('preview'));
  }
  const p=createProvider(policy,token,{fetchImpl:async()=>new Response('x'.repeat(65537))});await assert.rejects(p.read('preview'));
  const redirected=createProvider(policy,token,{fetchImpl:async()=>new Response('{}',{status:302,headers:{location:'https://unbound.invalid/'}})});await assert.rejects(redirected.read('preview'));
});
test('mutation mapping is fixed, never accepts caller URLs/SQL and never retries',async()=>{
  const calls=[];const p=createProvider(policy,token,{fetchImpl:async(url,options)=>{calls.push({url,method:options.method,body:options.body});return Response.json({});}});
  assert.equal(await p.mutate('recoveryPause'),'ACCEPTED');assert.equal(await p.mutate('previewResume'),'ACCEPTED');
  assert.deepEqual(calls.map(x=>[x.url,x.method]),[['https://api.supabase.com/v1/projects/'+policy.recoveryRef+'/pause','POST'],['https://api.supabase.com/v1/projects/'+policy.previewRef+'/restore','POST']]);
  await assert.rejects(p.mutate('productionPause'));await assert.rejects(p.mutate('delete'));assert.equal(calls.length,2);
  let n=0;const unknown=createProvider(policy,token,{fetchImpl:async()=>{n++;throw Error('secret failure body');}});assert.equal(await unknown.mutate('previewPause'),'UNKNOWN');assert.equal(n,1);
});
test('successful headers with an invalid or interrupted body do not establish request acceptance',async()=>{
  for(const response of [()=>new Response('{'),()=>Response.json({unexpected:true}),()=>new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('{'));c.error(Error('broken'));}}))]){
    const p=createProvider(policy,token,{fetchImpl:async()=>response()});assert.equal(await p.mutate('previewPause'),'UNKNOWN');
  }
});

test('a stalled response body reaches the request deadline and is never retried',async()=>{
  let calls=0,cancelled=false;
  const p=createProvider(policy,token,{fetchImpl:async()=>{calls++;return new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('{'));},cancel(){cancelled=true;}}));}});
  assert.equal(await p.mutate('recoveryResume'),'UNKNOWN');assert.equal(calls,1);assert.equal(cancelled,true);
});
