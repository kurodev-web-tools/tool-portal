import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validateRehearsalPreparation,buildRehearsalAuthChange} from './lib/comment-translator-paid-core-v1-gate1-rehearsal-preparation.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex'),now=1800000000000;
const fixture=()=>({
 schemaVersion:1,scope:'LOCAL_SYNTHETIC_ONLY',preparedAt:now,expiresAt:now+3600000,
 sourceSigningSha256:hash('synthetic-source'),targetSigningSha256:hash('synthetic-target'),
 users:[0,1,2].map(i=>({id:'00000000-0000-4000-8000-'+String(i+1).padStart(12,'0'),passwordVerified:true,accessVerified:true,refreshVerified:true,accessExpiresAt:now+3600000})),
 pkce:['magiclink','recovery','email_change'].map(type=>({type,positiveControl:true,pendingUnconsumed:true,challengeMatched:true,expiresAt:now+3600000})),
 links:['magiclink','recovery'].map(type=>({type,getPositive:true,postPositive:true,pendingUnconsumed:true,expiresAt:now+3600000})),
 business:[0,1,2].map(i=>({userId:'00000000-0000-4000-8000-'+String(i+1).padStart(12,'0'),planId:'free',usedCount:3,limitCount:100})),
 delivery:{network:'none',hostPorts:0,externalRecipients:0,localSinkObserved:true},
});
test('a complete native synthetic fixture summary is local preparation, never Hosted readiness',()=>{
 const result=validateRehearsalPreparation(fixture(),now);
 assert.equal(result.status,'LOCAL_FIXTURES_READY');assert.equal(result.hostedReady,false);
 assert.equal(result.userCount,3);assert.ok(!JSON.stringify(result).includes('00000000-'));
});
for(const [label,mutate]of [
 ['R5 empty fixture',f=>{f.users=[];f.business=[];}],
 ['nonexistent-password test',f=>{f.users[0].passwordVerified=false;}],
 ['expired access token',f=>{f.users[0].accessExpiresAt=now;}],
 ['refresh not actually exercised',f=>{f.users[0].refreshVerified=false;}],
 ['missing PKCE alias',f=>{f.pkce.pop();}],
 ['consumed old PKCE',f=>{f.pkce[0].pendingUnconsumed=false;}],
 ['verify GET missing',f=>{f.links[0].getPositive=false;}],
 ['wrong business owner',f=>{f.business[0].userId=f.business[1].userId;}],
 ['Paid instead of Free',f=>{f.business[0].planId='paid';}],
 ['source signing trust reused',f=>{f.targetSigningSha256=f.sourceSigningSha256;}],
 ['public network',f=>{f.delivery.network='bridge';}],
 ['external recipient',f=>{f.delivery.externalRecipients=1;}],
 ['stale preparation',f=>{f.preparedAt=now-300001;}],
 ['clock rollback',f=>{f.preparedAt=now+1;}],
 ['extra private field',f=>{f.password='must-not-appear';}],
]){
 test('rejects '+label,()=>{const f=fixture();mutate(f);assert.throws(()=>validateRehearsalPreparation(f,now),e=>e.message==='REHEARSAL_PREPARATION_REJECTED');});
}
const config=()=>({disable_signup:false,external_email_enabled:true,external_phone_enabled:false,external_anonymous_users_enabled:false,security_manual_linking_enabled:false});
test('real five-minute PKCE is evaluated against the immediate probe budget, separately from the stop observer',()=>{
 const f=fixture();f.expiresAt=now+240000;for(const p of f.pkce)p.expiresAt=now+240000;
 assert.equal(validateRehearsalPreparation(f,now).status,'LOCAL_FIXTURES_READY');
 assert.throws(()=>validateRehearsalPreparation(f,now+190000));
});
test('auth patch and inverse contain only changed allowlisted booleans',()=>{
 const r=buildRehearsalAuthChange(config(),'close');
 assert.deepEqual(r.patch,{disable_signup:true,external_email_enabled:false});
 assert.deepEqual(r.inverse,{disable_signup:false,external_email_enabled:true});
 assert.deepEqual(buildRehearsalAuthChange({...config(),...r.patch},'auth-reopen').patch,{external_email_enabled:true});
});
test('auth reopening cannot reopen signup, phone or anonymous access',()=>{
 assert.throws(()=>buildRehearsalAuthChange(config(),'auth-reopen'));
 assert.throws(()=>buildRehearsalAuthChange({...config(),disable_signup:true,external_phone_enabled:true},'auth-reopen'));
});
test('raw full configuration and unknown or non-boolean fields are rejected without echoing values',()=>{
 for(const input of [{...config(),smtp_pass:'must-not-appear'},{...config(),new_provider_enabled:true},{...config(),disable_signup:'false'}])
 assert.throws(()=>buildRehearsalAuthChange(input,'close'),e=>e.message==='REHEARSAL_CONFIGURATION_REJECTED');
});
