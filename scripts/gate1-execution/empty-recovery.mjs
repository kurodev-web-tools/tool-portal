// CLI: review/verification only. Fixed HTTPS library exports require separate
// external approval; no SQL execution, credential intake, run/grant creation,
// or previous Gate1 closure admission is exposed here.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {isIP} from 'node:net';
import https from 'node:https';
import {readJsonReceipt} from './native-io.mjs';
import {parseRestoreSql} from '../lib/comment-translator-paid-core-v1-gate1-restore-sql.mjs';

const directory=path.dirname(fileURLToPath(import.meta.url));
const STEP_READBACK_MAX_AGE_MS=600000; // empty provisioning only, not the production fresh clock
export const PROTECTION_SQL=fs.readFileSync(path.join(directory,'empty-recovery-protection.sql'),'utf8');
export const READBACK_SQL=fs.readFileSync(path.join(directory,'empty-recovery-readback.sql'),'utf8');
const hash=v=>createHash('sha256').update(v).digest('hex');
const body=PROTECTION_SQL.match(/AS \$deny\$([\s\S]*?)\$deny\$;/)?.[1];
assert.ok(body,'GUARD_SOURCE_MISSING');
export const GUARD_BODY_SHA256=hash(body);
export const GUARD_URI='pg-functions://postgres/gate1_restore_guard/deny_delivery';
const fail=()=>{throw Error('EMPTY_RECOVERY_EVIDENCE_REJECTED');};
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const providers=['anonymous_users','email','phone','apple','azure','bitbucket','discord','facebook','figma','github','gitlab','google','kakao','keycloak','linkedin_oidc','slack_oidc','notion','slack','spotify','twitch','twitter','x','workos','web3_solana','web3_ethereum','zoom'];
const notifications=['password_changed','email_changed','phone_changed','mfa_factor_enrolled','mfa_factor_unenrolled','identity_linked','identity_unlinked'];
const otherHooks=['mfa_verification_attempt','password_verification_attempt','custom_access_token','before_user_created','after_user_created'];
export const AUTH_PATCH=Object.freeze({
 disable_signup:true, saml_enabled:false, security_manual_linking_enabled:false, oauth_server_enabled:false,
 ...Object.fromEntries(providers.map(p=>['external_'+p+'_enabled',false])),
 ...Object.fromEntries(notifications.map(n=>['mailer_notifications_'+n+'_enabled',false])),
 ...Object.fromEntries(otherHooks.map(h=>['hook_'+h+'_enabled',false])),
 hook_send_email_enabled:true, hook_send_email_uri:GUARD_URI,
 hook_send_sms_enabled:true, hook_send_sms_uri:GUARD_URI,
});
export const AUTH_CLOSE_PATCH=Object.freeze({...Object.fromEntries(Object.entries(AUTH_PATCH).filter(([k])=>!k.endsWith('_uri'))),hook_send_email_enabled:false,hook_send_sms_enabled:false});
export const AUTH_BIND_PATCH=Object.freeze({hook_send_email_enabled:true,hook_send_email_uri:GUARD_URI,hook_send_sms_enabled:true,hook_send_sms_uri:GUARD_URI});
export const REALTIME_PATCH=Object.freeze({suspend:true,private_only:true,presence_enabled:false});
export const INVENTORY_COUNTS=Object.freeze(['publicRelations','publicFunctions','publicTriggers','foreignServers','subscriptions','publications','realtimePolicies']);
// Candidate baseline from the already pinned official postgres:17.6.1.140 image.
// Not harvested/replaced from the current Hosted destination. A different
// Hosted definition is unknown, not permission to refresh these expectations.
export const MANAGED_EVENT_TRIGGERS=Object.freeze([
 ['issue_graphql_placeholder','sql_drop',['DROP EXTENSION'],'set_graphql_placeholder()','3c713c1d08553bcb96545a278c0ed60310621433dba2bc63f410674f0ef1c691'],
 ['issue_pg_cron_access','ddl_command_end',['CREATE EXTENSION'],'grant_pg_cron_access()','73048bec5c5e9583913ab325cadcbd002e578da11f60eb9fe5a466e48db0a217'],
 ['issue_pg_graphql_access','ddl_command_end',['CREATE EXTENSION'],'grant_pg_graphql_access()','aa7cc9ab9608e32140017467cc7ab76c9aa6a328941682fb4aa1639d6dbeae10'],
 ['issue_pg_net_access','ddl_command_end',['CREATE EXTENSION'],'grant_pg_net_access()','78486c0d12b4289fadf52613d9ca9574375bf2810d1a2fa26244d512ff28da7f'],
 ['pgrst_ddl_watch','ddl_command_end',null,'pgrst_ddl_watch()','4b067ac14534d320d90157d2ddf2337a88135681a336e0b7816d838a08a1a1bf'],
 ['pgrst_drop_watch','sql_drop',null,'pgrst_drop_watch()','653743446efac2e20a9ae8f57772895578e4b47bb9c6e0f7bf252cf5a6517d52'],
].map(([name,event,tags,fn,definitionSha256])=>({name,event,tags,function:fn,definitionSha256,owner:'supabase_admin',enabled:'O'})));
const requiredTables=['auth.users','auth.sessions','storage.buckets','storage.objects'];
const optionalTables=['cron.job','net.http_request_queue','supabase_functions.hooks'];
export const MANAGEMENT_PATHS=Object.freeze(['config/auth','config/auth/sso/providers','config/auth/third-party-auth','postgrest','config/storage','config/realtime','functions','custom-hostname','vanity-subdomain']);
export const FIRST_OPERATION_LIMITS=Object.freeze({projectCreate:1,authPatch:2,realtimePatch:1,networkApply:1,dataApiManualOff:1,guardTransaction:1,inventoryGet:18,authClosedGet:1,projectGet:6,networkGet:2,catalogReadTransaction:3,revocationGetReserved:1,authProbe:0,restore:0,retry:0});

// Only comparison/classification leaves the process, never a response value,
// credential, arbitrary URL, field value or provider error string.
export function authReadback(value,{closed=false}={}){
 const fields={};
 for(const [key,expected] of Object.entries(closed?AUTH_CLOSE_PATCH:AUTH_PATCH))fields[key]=!Object.hasOwn(value??{},key)?'NOT_RETURNED':value[key]===expected?'MATCH':'MISMATCH';
 const unreviewed=Object.keys(value??{}).filter(k=>(/^external_.*_enabled$|^hook_.*_enabled$|^mailer_notifications_.*_enabled$/).test(k)&&!Object.hasOwn(AUTH_PATCH,k));
 return {fields,stage:closed?'CLOSED_BEFORE_SQL':'GUARD_BOUND',unreviewedCapabilityCount:unreviewed.length,credentialAbsenceProven:false,credentialPurpose:'UNCONFIRMED',providerInternalQueues:'NOT_PROVEN'};
}

export function verifyGuardOverlay(g){
 if(!plain(g)||g.schemaOwner!=='postgres'||g.schemaCount!==1||g.functionCount!==1||g.relationCount!==0||g.typeCount!==0||g.defaultAclCount!==0||
 g.functionOwner!=='postgres'||g.language!=='sql'||g.returnsJsonb!==true||g.securityDefiner!==false||g.strict!==false||g.volatility!=='i'||
 JSON.stringify(g.config)!==JSON.stringify(['search_path=pg_catalog'])||g.bodySha256!==GUARD_BODY_SHA256)fail();
 const expected=[['schema','postgres','CREATE'],['schema','postgres','USAGE'],['schema','supabase_auth_admin','USAGE'],['function','postgres','EXECUTE'],['function','supabase_auth_admin','EXECUTE']];
 if(!Array.isArray(g.acl)||g.acl.length!==expected.length)fail();
 const keys=g.acl.map(a=>{if(!plain(a)||a.grantor!=='postgres'||a.grantable!==false)fail();return [a.object,a.grantee,a.privilege].join(':');}).sort();
 if(JSON.stringify(keys)!==JSON.stringify(expected.map(a=>a.join(':')).sort()))fail();
 if(!Array.isArray(g.roles)||g.roles.length!==4)fail();
 for(const role of ['anon','authenticated','service_role','supabase_auth_admin']){
  const rows=g.roles.filter(r=>r.role===role);if(rows.length!==1)fail();const r=rows[0],auth=role==='supabase_auth_admin';
  if(r.usage!==auth||r.create!==false||r.execute!==auth)fail();
 }
 return {guardVerified:true,scope:'gate1_restore_guard-only',applicationComparisonRequired:true};
}

export function verifyEmptyInventory(v,{local=false}={}){
 if(!plain(v)||v.schemaVersion!==1||v.readOnly!==true||v.rowSecurityOff!==true||v.role!=='postgres'||v.superuser!==false||v.serverMajor!==17||(!local&&v.tls!==true))fail();
 if(!Array.isArray(v.inventory)||v.inventory.length!==7)fail();
 for(const name of [...requiredTables,...optionalTables]){
  const rows=v.inventory.filter(x=>x.name===name);if(rows.length!==1)fail();const row=rows[0];
  if(row.present!==true&&row.present!==false)fail();
  if(requiredTables.includes(name)&&row.present!==true)fail();
  if(row.present?row.rows!==0:row.rows!==null)fail();
 }
 for(const key of INVENTORY_COUNTS)if(v[key]!==0)fail();
 if(!Array.isArray(v.eventTriggers)||v.eventTriggers.length!==MANAGED_EVENT_TRIGGERS.length)fail();
 for(const expected of MANAGED_EVENT_TRIGGERS){
  const rows=v.eventTriggers.filter(r=>r.name===expected.name);if(rows.length!==1)fail();
  for(const [k,val] of Object.entries(expected))if(JSON.stringify(rows[0][k])!==JSON.stringify(val))fail();
 }
 return {emptyVerified:true,scope:'enumerated-user-and-outbound-catalog-only',providerInternalQueues:'NOT_PROVEN'};
}

// A collision screen, NOT an SQL sandbox or permission to restore. Original
// artifacts are neither modified nor rehashed as accepted source. Dynamic SQL
// and roles/job/publication changes still need the existing full restore review.
export function checkGuardCollision(sql){
 for(const span of parseRestoreSql(sql,{allowCopyText:true,allowTriviaOnly:true})){
  if(span.tokens.some(t=>typeof t.value==='string'&&t.value.toLowerCase().includes('gate1_restore_guard')))fail();
 }
 // The lexical parser intentionally leaves COPY payloads opaque. Reject the
 // reserved name there too; this is conservative, never silently rewrite it.
 if(sql.toLowerCase().includes('gate1_restore_guard'))fail();
 return {collisionDetected:false,restoreAuthorized:false,jobRestoreAuthorized:false};
}

function validCidr(s){
 // Initial operation permits only exact operator host addresses. No /0,
 // broad networks, DNS resolution, automatic public-IP lookup or IPv6 omission.
 if(typeof s!=='string')return false;
 const [address,prefix,...extra]=s.split('/');if(extra.length)return false;
 if(prefix==='32')return isIP(address)===4&&!/^0\.|127\.|169\.254\./.test(address);
 return prefix==='128'&&isIP(address)===6&&address!=='::'&&address!=='::1';
}
function targetBound(target){
 if(!plain(target)||!/^([a-z]{20})$/.test(target.projectRef??'')||!/^([a-z]{20})$/.test(target.organizationId??'')||
 target.name!=='ct-gate1-recovery-v2'||target.region!=='ap-northeast-1'||!/^([a-f0-9]{64})$/.test(target.creationReceiptSha256??'')||
 typeof target.createdAt!=='string'||!Number.isFinite(Date.parse(target.createdAt)))fail();
 if(!Array.isArray(target.operatorCidrs)||target.operatorCidrs.length<1||target.operatorCidrs.length>2||!target.operatorCidrs.every(validCidr)||
 new Set(target.operatorCidrs).size!==target.operatorCidrs.length)fail();
 if(!target.operatorCidrs.some(x=>x.endsWith('/32'))||!target.operatorCidrs.some(x=>x.endsWith('/128')))fail();
 return hash(JSON.stringify([target.projectRef,target.organizationId,target.name,target.region,target.createdAt,target.creationReceiptSha256,[...target.operatorCidrs].sort()]));
}

// The existing bounded getJson transport is supplied by the approved operator.
// No default network transport or live CLI mode. Token is in-process only;
// claim precedes dispatch and no raw body/error is persisted, even on failure.
export async function captureAuthReadback({target,directory,phase,token,request,local=false,now=Date.now}){
 const targetSha256=targetBound(target);
 if(!['before','closed','after'].includes(phase)||typeof request!=='function'||typeof token!=='string'||!token||
 !path.isAbsolute(directory)||fs.lstatSync(directory).isSymbolicLink())fail();
 const claim=path.join(directory,'empty-auth-'+phase+'-claimed.json');
 fs.writeFileSync(claim,JSON.stringify({at:now(),targetSha256,method:'GET',phase})+'\n',{flag:'wx',mode:0o600});
 let r;try{r=await request({hostname:'api.supabase.com',route:'/v1/projects/'+target.projectRef+'/config/auth',
  headers:{Authorization:'Bearer '+token},limit:262144,timeoutMs:5000});}catch{r={complete:false,status:null};}
 const capture={targetSha256,at:now(),complete:r.complete===true&&r.status===200&&plain(r.value),
  status:Number.isInteger(r.status)&&r.status>=100&&r.status<=599?r.status:null,
  origin:local?'ISOLATED_FIXTURE':'HOSTED_READBACK',
  value:r.complete===true&&r.status===200&&plain(r.value)?authReadback(r.value,{closed:phase==='closed'}):null};
 fs.writeFileSync(path.join(directory,'empty-auth-'+phase+'-readback.json'),JSON.stringify(capture)+'\n',{flag:'wx',mode:0o600});
 return capture;
}

// Mutation bodies can contain a complete Auth config in the response. Drain
// within a deadline/cap and retain only HTTP metadata; never log/store the body.
function settingHttps({hostname,route,method,headers,body,timeoutMs,limit}){
 return new Promise(resolve=>{
  let req,res,timer,done=false,bytes=0;
  const finish=complete=>{if(done)return;done=true;clearTimeout(timer);resolve({status:res?.statusCode??null,complete});res?.destroy();req?.destroy();};
  try{
   req=https.request({hostname,path:route,method,agent:false,rejectUnauthorized:true,headers:{...headers,'Content-Length':Buffer.byteLength(body)}},response=>{
    res=response;res.on('data',chunk=>{bytes+=chunk.length;if(bytes>limit)finish(false);});
    res.on('error',()=>finish(false));res.on('aborted',()=>finish(false));
    res.on('end',()=>finish(res.complete===true));res.on('close',()=>{if(!done)finish(false);});
   });req.on('error',()=>finish(false));timer=setTimeout(()=>finish(false),timeoutMs);req.end(body);
  }catch{finish(false);}
 });
}
// Four fixed setting operations only; no project creation, Data API UI control,
// restore, pause, general workflow or live CLI. Used only after separate approval.
export async function applyEmptySetting({target,approval,projectReadback,stage,guardReadback,directory,token,request=settingHttps,now=Date.now}){
 const plan=reviewPlan(target),targetSha256=plan.targetSha256,at=now();
 // This explicit caller-supplied record represents separately obtained user
 // authority, not authority manufactured from --plan or a readback. It is not
 // a cryptographic approval service. Fixture authority never enables HTTPS.
 if(!plain(approval)||approval.decision!=='APPROVED'||approval.purpose!=='EMPTY_RECOVERY_SETTINGS_ONLY'||
 approval.targetSha256!==targetSha256||typeof directory!=='string'||approval.evidenceDirectory!==path.resolve(directory)||
 !['USER_APPROVED_EXTERNAL_OPERATION','ISOLATED_FIXTURE'].includes(approval.origin)||
 (request===settingHttps&&approval.origin!=='USER_APPROVED_EXTERNAL_OPERATION'))fail();
 const p=projectReadback?.value;
 if(projectReadback?.targetSha256!==targetSha256||projectReadback.complete!==true||projectReadback.status!==200||
 !Number.isSafeInteger(projectReadback.at)||at<projectReadback.at||at-projectReadback.at>STEP_READBACK_MAX_AGE_MS||
 p?.id!==target.projectRef||p.organization_id!==target.organizationId||p.name!==target.name||p.region!==target.region||p.created_at!==target.createdAt||p.status!=='ACTIVE_HEALTHY'||
 !path.isAbsolute(directory)||fs.lstatSync(directory).isSymbolicLink()||typeof token!=='string'||!token||typeof request!=='function'||
 process.env.NODE_TLS_REJECT_UNAUTHORIZED==='0'||fs.existsSync(path.join(directory,'empty-unconfirmed.json')))fail();
 if(request===settingHttps&&projectReadback.origin!=='HOSTED_READBACK')fail();
 const operations={
  'auth-close':{method:'PATCH',suffix:'config/auth',body:AUTH_CLOSE_PATCH},
  'auth-bind':{method:'PATCH',suffix:'config/auth',body:AUTH_BIND_PATCH},
  'realtime-close':{method:'PATCH',suffix:'config/realtime',body:REALTIME_PATCH},
  'network-close':{method:'POST',suffix:'network-restrictions/apply',body:plan.databaseNetwork.payload},
 };
 if(!Object.hasOwn(operations,stage))fail();
 if(stage==='auth-bind'){
  if(guardReadback?.targetSha256!==targetSha256||guardReadback.complete!==true||guardReadback.status!==200||
   !Number.isSafeInteger(guardReadback.at)||at<guardReadback.at||at-guardReadback.at>STEP_READBACK_MAX_AGE_MS)fail();
  if(request===settingHttps&&guardReadback.origin!=='HOSTED_READBACK')fail();
  verifyEmptyInventory(guardReadback.value);verifyGuardOverlay(guardReadback.value?.guard);
  const closed=readJsonReceipt(path.join(directory,'empty-auth-closed-readback.json'));
  if(closed.targetSha256!==targetSha256||closed.complete!==true||closed.status!==200||closed.value?.stage!=='CLOSED_BEFORE_SQL'||
   !Number.isSafeInteger(closed.at)||at<closed.at||at-closed.at>STEP_READBACK_MAX_AGE_MS||(request===settingHttps&&closed.origin!=='HOSTED_READBACK')||
   Object.keys(closed.value.fields??{}).sort().join(',')!==Object.keys(AUTH_CLOSE_PATCH).sort().join(',')||
   Object.values(closed.value.fields).some(v=>v!=='MATCH')||closed.value.unreviewedCapabilityCount!==0)fail();
 }
 const op=operations[stage],claimFile=path.join(directory,'empty-setting-'+stage+'-claimed.json');
 fs.writeFileSync(claimFile,JSON.stringify({at,stage,targetSha256,method:op.method,payloadSha256:hash(JSON.stringify(op.body))})+'\n',{flag:'wx',mode:0o600});
 let r;try{r=await request({hostname:'api.supabase.com',route:'/v1/projects/'+target.projectRef+'/'+op.suffix,method:op.method,
  headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(op.body),timeoutMs:10000,limit:262144});}catch{r={status:null,complete:false};}
 const expectedStatuses=stage==='realtime-close'?[204]:stage==='network-close'?[200,201,204]:[200];
 const unknown=r?.complete!==true||!expectedStatuses.includes(r.status);
 const result={at:now(),stage,targetSha256,status:Number.isInteger(r?.status)&&r.status>=100&&r.status<=599?r.status:null,
  outcome:unknown?'UNCONFIRMED_STOP':'RESPONSE_OBSERVED_NOT_READBACK',
  complete:r?.complete===true,independentReadbackRequired:true,applied:false,automaticRetry:false,requiresControlRetention:true};
 fs.writeFileSync(path.join(directory,'empty-setting-'+stage+'-response.json'),JSON.stringify(result)+'\n',{flag:'wx',mode:0o600});
 if(unknown)fs.writeFileSync(path.join(directory,'empty-unconfirmed.json'),JSON.stringify({at:now(),stage,targetSha256,requiresControlRetention:true})+'\n',{flag:'wx',mode:0o600});
 return result;
}

export function reviewPlan(target=null){
 const targetSha256=target===null?null:targetBound(target);
 return {schemaVersion:1,purpose:'EMPTY_RECOVERY_LOCAL_REVIEW',authority:'NOT_AUTHORIZATION',targetSha256,
  publishedSourceRequired:true,sourceCandidate:{protectionSqlSha256:hash(PROTECTION_SQL),readbackSqlSha256:hash(READBACK_SQL),guardBodySha256:GUARD_BODY_SHA256},
  authClosePatch:AUTH_CLOSE_PATCH,authBindPatch:AUTH_BIND_PATCH,authExpectedReadback:AUTH_PATCH,realtimePatch:REALTIME_PATCH,dataApi:{operatorAction:'Enable Data API = OFF',apiSchemaEmptyIsEquivalent:false},
  databaseNetwork:{operatorCidrsRequired:['IPv4 /32','IPv6 /128'],request:'POST /v1/projects/{ref}/network-restrictions/apply',payload:target===null?null:{dbAllowedCidrs:target.operatorCidrs.filter(x=>x.endsWith('/32')),dbAllowedCidrsV6:target.operatorCidrs.filter(x=>x.endsWith('/128'))},readback:'entitlement=allowed,status=applied,exact approved CIDRs; old_config cleared'},
  managementPaths:MANAGEMENT_PATHS,limits:FIRST_OPERATION_LIMITS,
  clocks:{productionClocksImplemented:false,closingEscalationMs:600000},
  behaviorVerified:false,restoreAuthorized:false,gate:'NO-GO'};
}

// These are independently acquired evidence envelopes, not user-entered true
// flags. Native/API collectors must bind target hash and acquisition times;
// a local fixture always produces LOCAL_ONLY, never Hosted acceptance.
export function assessReadback({target,startedAt,finishedAt,captures},{local=false}={}){
 const targetSha256=targetBound(target);
 if(!Number.isSafeInteger(startedAt)||!Number.isSafeInteger(finishedAt)||finishedAt<startedAt||finishedAt-startedAt>3600000||!plain(captures))fail();
 const names=['project','auth','realtime','dataApi','network','catalog','capabilities'];
 for(const name of names){const r=captures[name];if(!plain(r)||r.targetSha256!==targetSha256||r.complete!==true||r.status!==200||
 !Number.isSafeInteger(r.at)||r.at<startedAt||r.at>finishedAt||r.origin!==(local?'ISOLATED_FIXTURE':'HOSTED_READBACK'))fail();}
 const p=captures.project.value;
 if(p?.id!==target.projectRef||p.organization_id!==target.organizationId||p.name!==target.name||p.region!==target.region||p.created_at!==target.createdAt||p.status!=='ACTIVE_HEALTHY')fail();
 const auth=captures.auth.value;
 if(!plain(auth)||auth.stage!=='GUARD_BOUND'||!plain(auth.fields)||Object.keys(auth.fields).sort().join(',')!==Object.keys(AUTH_PATCH).sort().join(',')||
 Object.values(auth.fields).some(v=>v!=='MATCH')||auth.unreviewedCapabilityCount!==0||auth.credentialAbsenceProven!==false||
 auth.credentialPurpose!=='UNCONFIRMED'||auth.providerInternalQueues!=='NOT_PROVEN'||
 Object.keys(auth).sort().join(',')!==['fields','stage','unreviewedCapabilityCount','credentialAbsenceProven','credentialPurpose','providerInternalQueues'].sort().join(','))fail();
 for(const [k,v] of Object.entries(REALTIME_PATCH))if(captures.realtime.value?.[k]!==v)fail();
 const d=captures.dataApi.value;
 if(d?.enabled!==false||d.kind!=='MANUAL_TARGET_TIME_EVIDENCE'||d.aiReviewed!==true||!/^([a-f0-9]{64})$/.test(d.evidenceSha256??''))fail();
 const net=captures.network.value;
 if(net?.entitlement!=='allowed'||net.status!=='applied'||net.old_config!=null||!Array.isArray(net.config?.dbAllowedCidrs)||!Array.isArray(net.config?.dbAllowedCidrsV6))fail();
 if(net.config.dbAllowedCidrs.some(c=>!validCidr(c)||!c.endsWith('/32'))||net.config.dbAllowedCidrsV6.some(c=>!validCidr(c)||!c.endsWith('/128')))fail();
 const cidrs=[...net.config.dbAllowedCidrs,...net.config.dbAllowedCidrsV6].sort();
 if(JSON.stringify(cidrs)!==JSON.stringify([...target.operatorCidrs].sort()))fail();
 const c=captures.capabilities.value;
 for(const k of ['functions','ssoProviders','thirdPartyProviders','customHostnames','vanitySubdomains','storageBuckets'])if(c?.[k]!==0)fail();
 if(c?.completeLists!==true||c?.noImportedData!==true||c?.creationReceiptSha256!==target.creationReceiptSha256)fail();
 verifyEmptyInventory(captures.catalog.value,{local});verifyGuardOverlay(captures.catalog.value.guard);
 return {schemaVersion:1,status:local?'LOCAL_EMPTY_READBACK_PASS':'EMPTY_CONFIGURATION_READBACK_CONFIRMED',
  targetSha256,at:finishedAt,evidenceScope:local?'LOCAL_ONLY':'CONFIGURATION_ONLY',
  behaviorVerified:false,isolationVerified:false,restoreAuthorized:false,formalStopAccepted:false,
  gate:'NO-GO',requiresControlRetention:true,auth};
}

// Ten minutes is an escalation point, never an authority to drop control.
// A configuration receipt cannot establish behavioral isolation. No automatic
// credential revocation or old INACTIVE/RESTORED receipt is emitted.
export function closingDecision({startedAt,now,interrupted=false,readback=null}){
 if(!Number.isSafeInteger(startedAt)||!Number.isSafeInteger(now)||now<startedAt)fail();
 const recognized=readback?.status==='EMPTY_CONFIGURATION_READBACK_CONFIRMED'&&readback.evidenceScope==='CONFIGURATION_ONLY'&&readback.isolationVerified===false;
 return {status:interrupted||now-startedAt>=600000?'NEEDS_OPERATOR':'ISOLATION_UNCONFIRMED',
  configurationRecorded:recognized,successfulClosure:false,isolationVerified:false,
  keepControlCredentials:true,automaticRevoke:false,automaticDelete:false,automaticPause:false,
  automaticRetry:false,gate:'NO-GO'};
}

function main(){
 const [mode,...args]=process.argv.slice(2);
 if(mode==='--plan'&&args.length<=1){console.log(JSON.stringify(reviewPlan(args.length?readJsonReceipt(args[0]):null),null,2));return;}
 if(mode==='--assess'&&args.length===1){console.log(JSON.stringify(assessReadback(readJsonReceipt(args[0])),null,2));return;}
 if(mode==='--assess-local'&&args.length===1){console.log(JSON.stringify(assessReadback(readJsonReceipt(args[0]),{local:true}),null,2));return;}
 if(mode==='--closing'&&args.length===1){console.log(JSON.stringify(closingDecision(readJsonReceipt(args[0])),null,2));return;}
 fail();
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{main();}catch{console.log(JSON.stringify({status:'EMPTY_RECOVERY_EVIDENCE_REJECTED',details:'REDACTED',requiresControlRetention:true,gate:'NO-GO'}));process.exitCode=1;}
}
