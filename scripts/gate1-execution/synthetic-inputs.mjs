import fs from 'node:fs';
import {protect} from './control/credential-intake.mjs';
import {readDpapi,pinned,record,json} from './execution-inputs.mjs';
import {REHEARSAL_TRANSFER_TABLES,rehearsalColumnsSql,rehearsalRowsSql,buildSyntheticRehearsalTransfer} from '../lib/comment-translator-paid-core-v1-gate1-rehearsal-transfer.mjs';
import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {validateRehearsalPreparation,validateSyntheticPreparation} from '../lib/comment-translator-paid-core-v1-gate1-rehearsal-preparation.mjs';
import {validateAdminSigningEvidence} from '../lib/comment-translator-paid-core-v1-gate1-signing-evidence.mjs';

// Existing API-issued synthetic preparation, shared with the local contract.
// The caller owns the isolated services and must independently establish target signing.
export async function generateSyntheticInputs({api,sql,docker,inspect,db,client,oldKey,targetSigningSha256,signingEvidence,identity,adminToken,foundationSql}){
 const hash=x=>createHash('sha256').update(x).digest('hex'),lit=s=>"'"+String(s).replaceAll("'","''")+"'";
 if(signingEvidence){assert.equal(targetSigningSha256,undefined);validateAdminSigningEvidence(signingEvidence,{...identity,sourceSigningSha256:hash(oldKey)});}
 else {assert.match(targetSigningSha256,/^[a-f0-9]{64}$/);assert.notEqual(hash(oldKey),targetSigningSha256);}
 const requireSession=(r,user)=>{assert.equal(r.status,200);assert.equal(r.data.user.id,user.id);assert.ok(r.data.access_token);assert.equal(api('/user',null,r.data.access_token).status,200);return r.data;};
const aliases=['magiclink','recovery','email_change'];
async function issue(type,user){const verifier=randomBytes(32).toString('base64url'),challenge=createHash('sha256').update(verifier).digest('base64url');
 const body={code_challenge:challenge,code_challenge_method:'s256',email:type==='email_change'?randomBytes(8).toString('hex')+'@example.test':user.email};
 const r=type==='email_change'?api('/user',body,user.accessToken,'PUT'):api(type==='recovery'?'/recover':'/magiclink',body);
 assert.equal(r.status,200);
 const row=JSON.parse(sql('SELECT to_jsonb(f) FROM auth.flow_state f WHERE user_id='+lit(user.id)+' AND authentication_method='+lit(type)+' ORDER BY created_at DESC LIMIT 1;'));
 assert.equal(row.provider_type,type);assert.equal(row.code_challenge,challenge);assert.ok(row.auth_code);
 return {body:{auth_code:row.auth_code,code_verifier:verifier},expiresAt:Date.parse(row.created_at)+300000};
}
  const users=[],oldFlows=[],oldLinks=[],preparedUsers=[];
 const preparedAt=Date.now();
 for(const type of aliases){
  const user={email:type+'@example.test',password:randomBytes(20).toString('hex')};
  const created=api('/admin/users',{...user,email_confirm:true},adminToken(oldKey));assert.equal(created.status,200);user.id=created.data.id;
  const session=requireSession(api('/token?grant_type=password',user),user);
  const refreshed=requireSession(api('/token?grant_type=refresh_token',{refresh_token:session.refresh_token}),user);
  user.accessToken=refreshed.access_token;user.refreshToken=refreshed.refresh_token;
  const claims=JSON.parse(Buffer.from(user.accessToken.split('.')[1],'base64url'));assert.equal(claims.sub,user.id);
  preparedUsers.push({id:user.id,passwordVerified:true,accessVerified:true,refreshVerified:true,accessExpiresAt:claims.exp*1000});
  requireSession(api('/token?grant_type=pkce',(await issue(type,user)).body),user);
  const pending=await issue(type,user);oldFlows.push({type,...pending});users.push(user);
 }

 for(const [index,type]of ['magiclink','recovery'].entries()){
  const user=users[index];
  const generate=()=>{const r=api('/admin/generate_link',{type,email:user.email},adminToken(oldKey));assert.equal(r.status,200);assert.ok(r.data.hashed_token&&r.data.action_link);return r.data;};
  const get=generate(),url=new URL(get.action_link);assert.equal(url.pathname,'/verify');assert.equal(url.hostname,'localhost');
  const verifiedGet=api(url.pathname+url.search,null,null,'GET');assert.equal(verifiedGet.status,303);
  const token=new URLSearchParams(new URL(verifiedGet.location).hash.slice(1)).get('access_token');assert.ok(token);assert.equal(api('/user',null,token).data.id,user.id);
  const post=generate();requireSession(api('/verify',{type,token_hash:post.hashed_token}),user);
  const generationStarted=Date.now(),pending=generate();assert.equal(sql("SELECT count(*) FROM auth.users WHERE id="+lit(user.id)+" AND (confirmation_token="+lit(pending.hashed_token)+" OR recovery_token="+lit(pending.hashed_token)+");"),'1');
  oldLinks.push({type,hash:pending.hashed_token,getPath:new URL(pending.action_link).pathname+new URL(pending.action_link).search,getPositive:true,postPositive:true,expiresAt:generationStarted+3600000});
 }

 sql(foundationSql);
 for(const [i,u]of users.entries())sql("INSERT INTO public.user_profiles(user_id,display_name) VALUES("+lit(u.id)+","+lit('Synthetic '+i)+"); INSERT INTO public.usage_quotas(user_id,quota_key,plan_id,period_start,period_end,used_count,limit_count) VALUES("+lit(u.id)+",'synthetic-comment-translator','free','2026-09-01','2026-10-01',3,100);");
 const business=()=>JSON.parse(sql("SELECT json_agg(json_build_object('userId',p.user_id,'planId',q.plan_id,'usedCount',q.used_count,'limitCount',q.limit_count) ORDER BY p.user_id) FROM public.user_profiles p JOIN public.usage_quotas q ON p.user_id=q.user_id;"));
 const businessBefore=business();assert.equal(businessBefore.length,3);
 const businessRows=()=>sql("SELECT jsonb_build_object('profiles',(SELECT jsonb_agg(to_jsonb(p) ORDER BY p.user_id) FROM public.user_profiles p),'quotas',(SELECT jsonb_agg(to_jsonb(q) ORDER BY q.user_id,q.quota_key,q.period_start) FROM public.usage_quotas q));");
 const businessRowsBefore=businessRows();
 const mailCount=()=>{const code="fetch('http://127.0.0.1:8025/api/v1/messages',{signal:AbortSignal.timeout(5000)}).then(async r=>{if(!r.ok)throw Error();const j=await r.json();if(!Number.isSafeInteger(j.total))throw Error();process.stdout.write(String(j.total));}).catch(()=>process.exit(2));";return Number(docker(['exec',client,'node','-e',code]).stdout);};
 assert.ok(mailCount()>0);
 const inspected=inspect(db);assert.equal(inspected.HostConfig.NetworkMode,'none');assert.equal(Object.keys(inspected.HostConfig.PortBindings??{}).length,0);
 const fixture={schemaVersion:1,scope:'LOCAL_SYNTHETIC_ONLY',preparedAt,expiresAt:Math.min(...oldFlows.map(f=>f.expiresAt),...preparedUsers.map(u=>u.accessExpiresAt)),sourceSigningSha256:hash(oldKey),targetSigningSha256:targetSigningSha256,users:preparedUsers,
  pkce:oldFlows.map(f=>({type:f.type,positiveControl:true,pendingUnconsumed:true,challengeMatched:true,expiresAt:f.expiresAt})),
  links:oldLinks.map(l=>({type:l.type,getPositive:l.getPositive,postPositive:l.postPositive,pendingUnconsumed:true,expiresAt:l.expiresAt})),business:businessBefore,delivery:{network:'none',hostPorts:0,externalRecipients:0,localSinkObserved:true}};
 for(const flow of oldFlows)assert.equal(sql("SELECT count(*) FROM auth.flow_state WHERE auth_code="+lit(flow.body.auth_code)+" AND code_challenge="+lit(createHash('sha256').update(flow.body.code_verifier).digest('base64url'))+";"),'1');
 if(signingEvidence){delete fixture.targetSigningSha256;fixture.schemaVersion=2;fixture.signingEvidence=signingEvidence;}
 validateSyntheticPreparation(fixture,identity);

 return {fixture,users,oldFlows,oldLinks,business,businessBefore,businessRows,businessRowsBefore,mailCount};
}

// Local-only until the native signing evidence boundary is resolved. This is
// deliberately not a route around publication or live admission checks.
export function protectSyntheticInputs(context,identity,fixture,sql,target){
 if(!context.local)assert.equal(fixture.schemaVersion,2,'NATIVE_SIGNING_EVIDENCE_REQUIRED');
 for(const name of ['fixtures.dpapi','transfer.dpapi','synthetic-inputs.json'])assert.equal(fs.existsSync(context.root+'/runtime/'+name),false,'SYNTHETIC_INPUT_ALREADY_WRITTEN');
 validateSyntheticPreparation(fixture,identity);
 assert.match(identity.runId,/^[a-f0-9]{64}$/);assert.match(identity.sourceCommit,/^[a-f0-9]{40}$/);assert.equal(identity.target,'recovery');
 const packet={scope:'LOCAL_SYNTHETIC_ONLY',managedShapeSha256:target.managedShapeSha256,targetBaselineSha256:target.baselineSha256,userIds:fixture.users.map(u=>u.id),tables:REHEARSAL_TRANSFER_TABLES.map(name=>({name,columns:JSON.parse(sql(rehearsalColumnsSql(name)+';')),rows:JSON.parse(sql(rehearsalRowsSql(name)+';'))}))};
 buildSyntheticRehearsalTransfer(packet);
 const fixtures=protect(context,fixture,'runtime/fixtures.dpapi');
 const transfer=protect(context,packet,'runtime/transfer.dpapi');
 record(context.root,'runtime/synthetic-inputs.json',{schemaVersion:1,localOnly:context.local,...identity,fixtures,transfer});
 return readSyntheticInputs(context,identity);
}
export function readSyntheticInputs(context,identity){
 const receipt=json(context.root+'/runtime/synthetic-inputs.json');
 assert.equal(receipt.schemaVersion,1);assert.equal(receipt.localOnly,context.local);
 for(const [key,value] of Object.entries(identity))assert.equal(receipt[key],value,'SYNTHETIC_INPUT_BINDING_MISMATCH');
 const fixture=readDpapi(pinned(context.root,receipt.fixtures));
 const packet=readDpapi(pinned(context.root,receipt.transfer));
 if(!context.local)assert.equal(fixture.schemaVersion,2,'NATIVE_SIGNING_EVIDENCE_REQUIRED');
 validateSyntheticPreparation(fixture,identity);buildSyntheticRehearsalTransfer(packet);
 assert.deepEqual(packet.userIds,fixture.users.map(u=>u.id));
 return {fixture,packet};
}

// Shared bounded connection to the existing client/executor. A local acceptance
// context never grants permission to use native provider credentials or targets.
export async function prepareSyntheticStage(client,context,identity,{source,collectTarget,freezeSource}){
 assert.equal(context.local,true,'HOSTED_SIGNING_GUARANTEE_UNRESOLVED');
 return client.runStage('fixtures-ready',async({signal,timeoutMs})=>{
  const started=performance.now();
  const guard=()=>assert.ok(!signal.aborted&&performance.now()-started<timeoutMs,'SYNTHETIC_STAGE_EXPIRED');
  const guarded=fn=>(...args)=>{guard();const r=fn(...args);guard();return r;};
  guard();const target=await collectTarget();guard();
  const generated=await generateSyntheticInputs({...source,api:guarded(source.api),sql:guarded(source.sql),docker:guarded(source.docker),inspect:guarded(source.inspect)});
  guard();await freezeSource();guard();
  const value=protectSyntheticInputs(context,identity,generated.fixture,guarded(source.sql),target);guard();
  return validateRehearsalPreparation(value.fixture);
 });
}
export function transferSyntheticStage(client,context,identity,executor){
 return client.runStage('synthetic-transfer',({signal,timeoutMs,stop})=>{
  const {packet}=readSyntheticInputs(context,identity);
  return executor(stop).run(packet,{signal,timeoutMs,assertFreshFixtures:()=>{readSyntheticInputs(context,identity);return true;}});
 });
}
