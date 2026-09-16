import assert from 'node:assert/strict';
import {createHash,createHmac,createPublicKey,timingSafeEqual} from 'node:crypto';
import {parseStrictJson} from './comment-translator-paid-core-v1-gate1-evidence.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
function publicMaterial(jwk,alg){
 assert.ok(jwk&&typeof jwk==='object');
 for(const name of ['d','p','q','dp','dq','qi','oth','k'])assert.equal(Object.hasOwn(jwk,name),false,'PRIVATE_OR_SYMMETRIC_MATERIAL');
 const key=createPublicKey({key:jwk,format:'jwk'});
 assert.ok(alg==='EdDSA'&&key.asymmetricKeyType==='ed25519'||alg==='ES256'&&key.asymmetricKeyType==='ec'&&key.asymmetricKeyDetails.namedCurve==='prime256v1'||alg==='RS256'&&key.asymmetricKeyType==='rsa'&&key.asymmetricKeyDetails.modulusLength>=2048,'UNSUPPORTED_SIGNING_ALGORITHM');
 return sha(key.export({type:'spki',format:'der'}));
}
// This pure public-material assessment is deliberately NOT an Auth probe or
// a Hosted admission capability. Legacy fallback and runtime routes are unknown.
export function assessHostedSigning({sourceKey,token,projectRef,observedAt,now=Date.now(),keys,jwks}){
 assert.match(projectRef,/^[a-z]{20}$/);assert.ok(Number.isSafeInteger(observedAt)&&observedAt<=now&&now-observedAt<=300000);
 assert.ok(typeof sourceKey==='string'&&typeof token==='string'&&token.length<16384);
 const parts=token.split('.');assert.equal(parts.length,3);
 const head=JSON.parse(Buffer.from(parts[0],'base64url')),claims=JSON.parse(Buffer.from(parts[1],'base64url'));
 assert.equal(head.alg,'HS256');assert.equal(claims.aud,'authenticated');assert.match(claims.sub,/^[a-f0-9-]{36}$/);
 assert.ok(Number.isSafeInteger(claims.exp)&&claims.exp*1000-now>=60000&&Number.isSafeInteger(claims.iat)&&claims.iat*1000<=now);
 const expected=createHmac('sha256',sourceKey).update(parts[0]+'.'+parts[1]).digest(),actual=Buffer.from(parts[2],'base64url');
 assert.equal(actual.length,expected.length);assert.ok(timingSafeEqual(actual,expected));
 assert.ok(Array.isArray(keys?.keys)&&keys.keys.length>0&&keys.keys.length<=16&&Array.isArray(jwks?.keys));
 assert.equal(new Set(keys.keys.map(k=>k.id)).size,keys.keys.length);assert.equal(new Set(jwks.keys.map(k=>k.kid)).size,jwks.keys.length);
 assert.equal(keys.keys.filter(k=>k.status==='in_use').length,1);
 assert.equal(keys.keys.length,jwks.keys.length);
 const material=keys.keys.map(k=>{
  assert.ok(['in_use','previously_used','standby'].includes(k.status),'UNKNOWN_KEY_STATE');
  const matched=jwks.keys.find(j=>j.kid===k.id);assert.ok(matched);assert.equal(matched.alg,k.algorithm);assert.equal(matched.use,'sig');
  const fingerprint=publicMaterial(k.public_jwk,k.algorithm);assert.equal(publicMaterial(matched,k.algorithm),fingerprint);
  return {id:k.id,algorithm:k.algorithm,publicSpkiSha256:fingerprint};
 });
 return Object.freeze({kind:'HOSTED_PUBLIC_KEY_MATERIAL_V1',projectRef,observedAt,sourceAlgorithm:'HS256',sourceJwtSha256:sha(token),sourceExpiresAt:claims.exp*1000,publicKeys:material,materialSeparationObserved:true,runtimeSignatureRejection:false,allKeysNonidentical:false,hostedAdmission:false});
}
export function observeAuthenticationRejection({status,errorCode}){
 return {kind:'AUTHENTICATION_OBSERVATION_ONLY',status,errorCode,signatureEvidenceAccepted:false};
}

export const ADMIN_PROBE_ROUTE='/auth/v1/admin/users?page=1&per_page=1';
export const localSigningDigest=sha;
const signatureMessage='invalid JWT: unable to parse or verify signature, token signature is invalid: signature is invalid';
function sessionless(token,now){
 assert.ok(typeof token==='string'&&token.length<8192);
 const p=token.split('.');assert.equal(p.length,3);for(const s of p){assert.match(s,/^[A-Za-z0-9_-]+$/);assert.equal(Buffer.from(s,'base64url').toString('base64url'),s);}
 const header=parseStrictJson(Buffer.from(p[0],'base64url').toString()),claims=parseStrictJson(Buffer.from(p[1],'base64url').toString());
 assert.deepEqual({...header},{alg:'HS256',typ:'JWT'});assert.equal(claims.iss,'supabase');assert.equal(claims.role,'anon');
 // Do not strip fields. Reject tokens that would select user/session lookup.
 for(const name of ['session_id','sub'])assert.equal(Object.hasOwn(claims,name),false,'SESSION_BOUND_PROBE_NOT_SUPPORTED');
 assert.ok(Number.isSafeInteger(claims.iat)&&claims.iat*1000<=now&&Number.isSafeInteger(claims.exp)&&claims.exp*1000-now>=60000,'PROBE_TOKEN_EXPIRED');
 if(Object.hasOwn(claims,'nbf'))assert.ok(Number.isSafeInteger(claims.nbf)&&claims.nbf*1000<=now);
 return {parts:p,claims};
}
export function syntheticSigningToken(sourceKey,runId,now=Date.now()){
 assert.match(runId,/^[a-f0-9]{64}$/);assert.ok(typeof sourceKey==='string'&&sourceKey.length>=32);
 const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
 const p=enc({alg:'HS256',typ:'JWT'})+'.'+enc({iss:'supabase',role:'anon',gate1_run:runId,iat:Math.floor(now/1000),exp:Math.floor(now/1000)+3600});
 return p+'.'+createHmac('sha256',sourceKey).update(p).digest('base64url');
}
export function validateAdminSigningTokens({sourceKey,sourceToken,normalToken,runId,projectRef},now=Date.now()){
 assert.match(runId,/^[a-f0-9]{64}$/);assert.match(projectRef,/^[a-z]{20}$/);
 const source=sessionless(sourceToken,now),normal=sessionless(normalToken,now);
 assert.equal(source.claims.gate1_run,runId);assert.equal(Object.hasOwn(source.claims,'ref'),false);assert.equal(normal.claims.ref,projectRef);
 const signature=createHmac('sha256',sourceKey).update(source.parts[0]+'.'+source.parts[1]).digest(),actual=Buffer.from(source.parts[2],'base64url');
 assert.equal(signature.length,actual.length);assert.ok(timingSafeEqual(signature,actual));
 assert.notEqual(sourceToken,normalToken);
 return {sourceExpiresAt:source.claims.exp*1000,normalExpiresAt:normal.claims.exp*1000};
}
export function classifyAdminSigningResponse(r){
 if(r?.complete!==true)return 'INCOMPLETE_OR_NETWORK';
 if(r.status===403&&r.value?.code===403&&r.value.error_code==='not_admin'&&r.value.msg==='User not allowed')return 'NOT_ADMIN_AFTER_JWT';
 if(r.status===403&&r.value?.code===403&&r.value.error_code==='bad_jwt'&&r.value.msg===signatureMessage)return 'SIGNATURE_MISMATCH_ONLY';
 return 'OTHER_RESPONSE_NOT_SIGNATURE_EVIDENCE';
}
function parserAccepted(r){return classifyAdminSigningResponse(r)==='NOT_ADMIN_AFTER_JWT';}
export async function probeAdminSigning(input){
 const {sourceRequest,targetRequest,now=Date.now,signal,deadlineAt}=input;
 const guard=()=>{assert.ok(Number.isSafeInteger(deadlineAt)&&now()<deadlineAt&&!signal?.aborted,'SIGNING_DEADLINE');return validateAdminSigningTokens(input,now());};
 const expires=guard(),startedAt=now();assert.match(input.manifestSha256,/^[a-f0-9]{64}$/);
 const request=async(fn,route,token)=>{guard();const r=await fn(route,token,{signal,timeoutMs:Math.min(3000,deadlineAt-now())});guard();return r;};
 assert.ok(parserAccepted(await request(sourceRequest,ADMIN_PROBE_ROUTE,input.sourceToken)),'SOURCE_PARSER_CONTROL_UNCONFIRMED');
 const health=await request(targetRequest,'/auth/v1/health');assert.ok(health.complete&&health.status===200&&health.value?.name==='GoTrue'&&['v2.192.0','2.192.0'].includes(health.value.version),'AUTH_VERSION_UNCONFIRMED');
 assert.ok(parserAccepted(await request(targetRequest,ADMIN_PROBE_ROUTE,input.normalToken)),'TARGET_PARSER_CONTROL_UNCONFIRMED');
 const old=await request(targetRequest,ADMIN_PROBE_ROUTE,input.sourceToken);
 assert.ok(old.complete===true&&old.status===403&&old.value?.code===403&&old.value.error_code==='bad_jwt'&&old.value.msg===signatureMessage,'SIGNATURE_REJECTION_UNCONFIRMED');
 assert.ok(parserAccepted(await request(targetRequest,ADMIN_PROBE_ROUTE,input.normalToken)),'TARGET_FINAL_CONTROL_UNCONFIRMED');
 const result={kind:'ADMIN_ROUTE_SIGNATURE_REJECTION_V1',runId:input.runId,manifestSha256:input.manifestSha256,projectRef:input.projectRef,method:'GET',route:ADMIN_PROBE_ROUTE,algorithm:'HS256',sourceSigningSha256:sha(input.sourceKey),sourceJwtSha256:sha(input.sourceToken),normalJwtSha256:sha(input.normalToken),...expires,startedAt,observedAt:now(),sourceControl:'NOT_ADMIN_AFTER_JWT',targetControls:2,oldResult:'SIGNATURE_MISMATCH_ONLY',authVersion:health.value.version,sourceCalls:1,targetCalls:4,allKeysNonidentical:false,normalUserRouteVerified:false,hostedAcceptance:false};
 validateAdminSigningEvidence(result,result,now());return Object.freeze(result);
}
export function validateAdminSigningEvidence(e,expected,now=Date.now()){
 assert.equal(e?.kind,'ADMIN_ROUTE_SIGNATURE_REJECTION_V1');
 for(const field of ['runId','manifestSha256','projectRef','sourceSigningSha256'])assert.equal(e[field],expected[field],'SIGNING_BINDING_MISMATCH');
 for(const field of ['runId','manifestSha256','sourceSigningSha256','sourceJwtSha256','normalJwtSha256'])assert.match(e[field],/^[a-f0-9]{64}$/);
 assert.match(e.projectRef,/^[a-z]{20}$/);assert.equal(e.method,'GET');assert.equal(e.route,ADMIN_PROBE_ROUTE);assert.equal(e.algorithm,'HS256');
 assert.equal(e.sourceControl,'NOT_ADMIN_AFTER_JWT');assert.equal(e.targetControls,2);assert.equal(e.oldResult,'SIGNATURE_MISMATCH_ONLY');assert.equal(e.sourceCalls,1);assert.equal(e.targetCalls,4);
 assert.ok(['v2.192.0','2.192.0'].includes(e.authVersion));for(const k of ['allKeysNonidentical','normalUserRouteVerified','hostedAcceptance'])assert.equal(e[k],false);
 assert.ok([e.startedAt,e.observedAt,e.sourceExpiresAt,e.normalExpiresAt,now].every(Number.isSafeInteger));
 assert.ok(e.startedAt<=e.observedAt&&e.observedAt<=now&&now-e.startedAt<=300000&&e.observedAt-e.startedAt<=60000&&Math.min(e.sourceExpiresAt,e.normalExpiresAt)-now>=60000,'SIGNING_EVIDENCE_EXPIRED');
 return true;
}
