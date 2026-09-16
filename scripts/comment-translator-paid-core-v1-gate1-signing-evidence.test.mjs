import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,createHmac} from 'node:crypto';
import {assessHostedSigning,observeAuthenticationRejection} from './lib/comment-translator-paid-core-v1-gate1-signing-evidence.mjs';
import * as signing from './lib/comment-translator-paid-core-v1-gate1-signing-evidence.mjs';
import {EventEmitter} from 'node:events';
import {getJson} from './gate1-execution/fresh-common.mjs';
import {requiredSources,authorizePacket} from './gate1-execution/execution-inputs.mjs';
import {executionFixture} from './fixtures/gate1-execution.mjs';
const at=Date.now(),key='local-synthetic-key'.repeat(3),ref='r'.repeat(20);
function input(){const jwk=generateKeyPairSync('ed25519').publicKey.export({format:'jwk'}),kid='11111111-1111-4111-8111-111111111111';const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');const signed=enc({alg:'HS256',typ:'JWT'})+'.'+enc({sub:'22222222-2222-4222-8222-222222222222',iss:'http://localhost:9999/auth/v1',aud:'authenticated',iat:Math.floor(at/1000),exp:Math.floor(at/1000)+3600});return {sourceKey:key,token:signed+'.'+createHmac('sha256',key).update(signed).digest('base64url'),projectRef:ref,observedAt:at,now:at,keys:{keys:[{id:kid,algorithm:'EdDSA',status:'in_use',public_jwk:jwk}]},jwks:{keys:[{...jwk,kid,alg:'EdDSA',use:'sig'}]}};}
test('public material separation is scoped, never runtime authentication proof',()=>{const p=assessHostedSigning(input());assert.equal(p.kind,'HOSTED_PUBLIC_KEY_MATERIAL_V1');assert.equal(p.runtimeSignatureRejection,false);assert.equal(p.allKeysNonidentical,false);assert.equal(p.projectRef,ref);assert.equal('targetSigningSha256' in p,false);});
test('secret, absent key, symmetric trust, mismatched JWKS and expired token fail closed',()=>{for(const change of [x=>x.keys.keys[0].algorithm='HS256',x=>x.keys.keys[0].public_jwk=null,x=>x.keys.keys[0].public_jwk.d='secret',x=>x.jwks.keys=[],x=>x.now+=3600001,x=>x.observedAt-=300001,x=>x.sourceKey='wrong']){const x=input();change(x);assert.throws(()=>assessHostedSigning(x));}});
test('HTTP or bad_jwt alone is only a rejection observation',()=>{for(const status of [401,403,500,null]){const p=observeAuthenticationRejection({status,errorCode:'bad_jwt'});assert.equal(p.signatureEvidenceAccepted,false);}});

const mismatch='invalid JWT: unable to parse or verify signature, token signature is invalid: signature is invalid';
const denied={status:403,complete:true,value:{code:403,error_code:'not_admin',msg:'User not allowed'}};
function jwt(claims,secret=key){const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url'),s=enc({alg:'HS256',typ:'JWT'})+'.'+enc(claims);return s+'.'+createHmac('sha256',secret).update(s).digest('base64url');}
function probeInput(){const runId='b'.repeat(64),calls=[];return {calls,runId,manifestSha256:'c'.repeat(64),projectRef:ref,sourceKey:key,sourceToken:jwt({iss:'supabase',role:'anon',gate1_run:runId,iat:Math.floor(at/1000),exp:Math.floor(at/1000)+3600}),normalToken:jwt({iss:'supabase',ref,role:'anon',iat:Math.floor(at/1000),exp:Math.floor(at/1000)+3600},'different-local-key'),now:()=>at,deadlineAt:at+60000,sourceRequest:async()=>denied,targetRequest:async(route,token)=>{calls.push({route,token});if(route.endsWith('/health'))return {status:200,complete:true,value:{name:'GoTrue',version:'v2.192.0'}};return token===calls[1]?.token?denied:{status:403,complete:true,value:{code:403,error_code:'bad_jwt',msg:mismatch}};}};}
test('sessionless admin probe accepts only source and target parser controls around exact mismatch',async()=>{const x=probeInput(),r=await signing.probeAdminSigning(x);assert.equal(r.kind,'ADMIN_ROUTE_SIGNATURE_REJECTION_V1');assert.equal(r.allKeysNonidentical,false);assert.equal(r.normalUserRouteVerified,false);assert.equal(r.sourceSigningSha256,signing.localSigningDigest(key));assert.equal(x.calls.length,4);assert.equal('targetSigningSha256' in r,false);assert.equal(JSON.stringify(r).includes(x.sourceToken),false);signing.validateAdminSigningEvidence(r,{runId:x.runId,manifestSha256:x.manifestSha256,projectRef:ref,sourceSigningSha256:r.sourceSigningSha256},at);});
test('old not_admin, generic JWT errors, incomplete/edge failures never pass',async()=>{for(const response of [denied,{status:200,complete:true,value:{}},{status:403,complete:true,value:{error_code:'bad_jwt'}},...['token is expired','token is not valid yet','token is malformed','session not found'].map(msg=>({status:403,complete:true,value:{code:403,error_code:'bad_jwt',msg}})),{status:401,complete:true,value:{message:'Invalid API key'}},{status:403,complete:false,value:{code:403,error_code:'bad_jwt',msg:mismatch}}]){const x=probeInput(),request=x.targetRequest;x.targetRequest=async(route,token)=>token===x.sourceToken?response:request(route,token);await assert.rejects(()=>signing.probeAdminSigning(x));}});
test('session-bound, wrong target, stale and cancelled input reject before calls',async()=>{for(const change of [x=>x.normalToken=jwt({iss:'supabase',ref,role:'anon',session_id:'11111111-1111-4111-8111-111111111111',iat:Math.floor(at/1000),exp:Math.floor(at/1000)+3600}),x=>x.projectRef='s'.repeat(20),x=>x.deadlineAt=at,x=>x.signal=AbortSignal.abort(),x=>x.now=()=>at+3600000]){const x=probeInput();change(x);await assert.rejects(()=>signing.probeAdminSigning(x));assert.equal(x.calls.length,0);}});

test('receipt cannot cross run/project or survive expiry; HTTP cancellation destroys request',async()=>{
 const x=probeInput(),r=await signing.probeAdminSigning(x);
 assert.throws(()=>signing.validateAdminSigningEvidence(r,{...r,runId:'f'.repeat(64)},at));assert.throws(()=>signing.validateAdminSigningEvidence(r,r,at+300001));
 let calls=0,destroyed=0;const ac=new AbortController(),request=()=>{calls++;const req=new EventEmitter();req.end=()=>{};req.destroy=()=>destroyed++;return req;};
 const result=getJson({hostname:'fixture.invalid',route:'/',signal:ac.signal,request});ac.abort();assert.equal((await result).complete,false);assert.equal(calls,1);assert.equal(destroyed,1);
 const before=await getJson({hostname:'fixture.invalid',route:'/',signal:AbortSignal.abort(),request});assert.equal(before.complete,false);assert.equal(calls,1);
});

test('native generator foundation SQL belongs to approved source coverage',t=>{
 assert.ok(requiredSources().includes('supabase/migrations/20260527000000_account_preferences_foundation.sql'));
 const f=executionFixture(t);assert.equal(authorizePacket(f.root).local,true);
 f.manifest.source=f.manifest.source.filter(x=>!x.file.endsWith('_account_preferences_foundation.sql'));f.approval.manifestSha256=f.write('manifest.json',f.manifest).sha256;f.write('approval.json',f.approval);
 assert.throws(()=>authorizePacket(f.root),/RUNNER_SOURCE_NOT_PINNED/);
});

test('native HTTP reader retains complete EOF and strict GET transport with a signal',async()=>{
 const signal=new AbortController().signal;let options;
 const r=await getJson({hostname:'fixture.invalid',route:signing.ADMIN_PROBE_ROUTE,signal,request:(opts,cb)=>{options=opts;const req=new EventEmitter();req.destroy=()=>{};req.end=()=>queueMicrotask(()=>{const res=new EventEmitter();res.statusCode=403;res.complete=true;res.destroy=()=>{};cb(res);res.emit('data',Buffer.from(JSON.stringify(denied.value)));res.emit('end');});return req;}});
 assert.equal(options.method,'GET');assert.equal(options.rejectUnauthorized,true);assert.equal(signing.classifyAdminSigningResponse(r),'NOT_ADMIN_AFTER_JWT');
});
