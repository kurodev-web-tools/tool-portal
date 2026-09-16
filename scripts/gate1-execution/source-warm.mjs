import {ROOT,json,requireLiveAuthorization,pinned,record} from './execution-inputs.mjs';
const authorized=requireLiveAuthorization();
assert.equal(fs.existsSync(ROOT+'/source-warm.json'),false);
import {protect} from './control/credential-intake.mjs';
import {preparationClock} from './prearm-sequence.mjs';
preparationClock(authorized.approval,json(ROOT+'/control/preparation-claimed.json').startedAt,Date.now());
fs.writeFileSync(ROOT+'/control/source-warm-claimed.json',JSON.stringify({at:Date.now(),allowance:1,manifestSha256:authorized.manifestSha256})+'\n',{flag:'wx'});
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {randomBytes,createHash,createHmac} from 'node:crypto';
import {ATOMIC_LOCAL_DOCKER_ARGS} from '../lib/comment-translator-paid-core-v1-gate1-atomic-local-process.mjs';
import {REHEARSAL_TRANSFER_TABLES,rehearsalColumnsSql,rehearsalRowsSql,REHEARSAL_READBACK_SQL} from '../lib/comment-translator-paid-core-v1-gate1-rehearsal-transfer.mjs';
import {ATOMIC_MANAGED_SHAPE_SQL} from '../lib/comment-translator-paid-core-v1-gate1-atomic-restore.mjs';
import {createRehearsalExecutor,nativeRehearsalAttemptLedger} from '../lib/comment-translator-paid-core-v1-gate1-rehearsal-executor.mjs';
import {buildRehearsalServiceChange,compareConfigurationReadback} from '../lib/comment-translator-paid-core-v1-gate1-rehearsal-configuration.mjs';
import {startRehearsalLocalServices} from '../lib/comment-translator-paid-core-v1-gate1-rehearsal-local-services.mjs';

import {validateRehearsalPreparation,buildRehearsalAuthChange} from '../lib/comment-translator-paid-core-v1-gate1-rehearsal-preparation.mjs';
assert.equal(process.argv.length,2); // No remote target or command-line credentials.
const owner='ct-atomic-'+randomBytes(12).toString('hex'),name=owner+'-db',password=randomBytes(24).toString('hex');
const nodeImage='sha256:d189b8072865b5d8289af9435dee18eb6eef82f465e1d7d092fa9665bbd4ce54';
const owned=[],volumes=[],hash=x=>createHash('sha256').update(x).digest('hex'),lit=s=>"'"+String(s).replaceAll("'","''")+"'",wait=ms=>new Promise(r=>setTimeout(r,ms));
let terminating=false;
record(ROOT,'control/source-owner.json',{owner,manifestSha256:authorized.manifestSha256,processId:process.pid,at:Date.now()});
let phase='images',db,client,auth,restState,report={scope:'LOCAL_SYNTHETIC_ONLY',status:'FAIL',externalDelivery:false};
const docker=(args,input,allow=false)=>{if(!terminating)preparationClock(authorized.approval,json(ROOT+'/control/preparation-claimed.json').startedAt,Date.now());const r=spawnSync('docker',[...ATOMIC_LOCAL_DOCKER_ARGS,...args],{input,encoding:'utf8',windowsHide:true,timeout:30000,maxBuffer:4194304});if(!allow&&(r.status!==0||r.error||r.signal))throw Object.assign(Error('NATIVE_FAILED'),{sqlState:r.stderr?.match(/ERROR:\s+([0-9A-Z]{5}):/)?.[1]??null,reason:r.stderr?.match(/ERROR:\s+(?:P0001:\s+)?(REHEARSAL_[A-Z_]+)/)?.[1]??null});return r;};
const inspect=id=>JSON.parse(docker(['inspect',id]).stdout)[0];
function run(suffix,image,env={},before=[],after=[]){const id=docker(['run','-d','--pull=never','--name',owner+'-'+suffix,'--label','com.comment_translator.atomic='+owner,'--network',suffix.endsWith('db')?'none':'container:'+db,...Object.entries(env).flatMap(([k,v])=>['-e',k+'='+v]),...before,image,...after]).stdout.trim();assert.match(id,/^[a-f0-9]{64}$/);const v=inspect(id);owned.push({id,image:v.Image});const attached=v.Mounts.filter(m=>m.Type==='volume').map(m=>m.Name);volumes.push(...attached);record(ROOT,'control/source-resource-'+owned.length+'.json',{owner,manifestSha256:authorized.manifestSha256,id,image:v.Image,volumes:attached});return id;}
const sql=(q,role='postgres',database='postgres')=>{assert.ok(['postgres','ct_rehearsal_realtime'].includes(database));return docker(['exec','-i',db,'psql','-X','-qAt','-U',role,'-d',database,'-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose'],'SET client_min_messages=warning; SET search_path=pg_catalog,public;\n'+q).stdout.trim();};
const api=(path,body,token,method)=>{
 const code="let s='';process.stdin.on('data',b=>s+=b);process.stdin.on('end',async()=>{try{const q=JSON.parse(s);const r=await fetch('http://127.0.0.1:9999'+q.path,{method:q.method??(q.body?'POST':'GET'),redirect:'manual',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json',...(q.token?{Authorization:'Bearer '+q.token}:{})},...(q.body?{body:JSON.stringify(q.body)}:{})});let data;try{data=await r.json();}catch{data=null;}process.stdout.write(JSON.stringify({status:r.status,data,location:r.headers.get('location')}));}catch{process.exitCode=2;}});";
 return JSON.parse(docker(['exec','-i',client,'node','-e',code],JSON.stringify({path,body,token,method})).stdout);
};
// The business API shares only this owned, network-none container namespace.
// A refusal is required until both Auth login and direct Free-state checks pass.
const businessApi=(path,token,body,headers={},method)=>{
 const code="let s='';process.stdin.on('data',b=>s+=b);process.stdin.on('end',async()=>{const q=JSON.parse(s);try{const r=await fetch('http://127.0.0.1:3001'+q.path,{method:q.method??(q.body?'POST':'GET'),redirect:'manual',signal:AbortSignal.timeout(5000),headers:{'Content-Type':'application/json',...q.headers,...(q.token?{Authorization:'Bearer '+q.token}:{})},...(q.body?{body:JSON.stringify(q.body)}:{})});process.stdout.write(JSON.stringify({status:r.status,data:await r.json()}));}catch(e){process.stdout.write(JSON.stringify({status:null,networkError:e.cause?.code==='ECONNREFUSED'?'ECONNREFUSED':'UNKNOWN'}));}});";
 return JSON.parse(docker(['exec','-i',client,'node','-e',code],JSON.stringify({path,token,body,headers,method})).stdout);
};
const requireBusinessClosed=()=>{
 const response=businessApi('/user_profiles?select=user_id');
 if(db!==restState?.db){assert.deepEqual(response,{status:null,networkError:'ECONNREFUSED'});return;}
 report.closedRestObservation={status:response.status,code:response.data?.code??null};
 assert.equal(response.status,503);assert.equal(response.data?.code,'PGRST002');
 assert.equal(inspect(restState.container).State.Running,true);
 assert.equal(sql("SELECT split_part(v,'=',2) FROM pg_roles r,unnest(r.rolconfig) v WHERE r.rolname='authenticator' AND v LIKE 'pgrst.db_schemas=%';"),'ct_rehearsal_closed');
 assert.equal(sql("SELECT count(*) FROM pg_namespace WHERE nspname='ct_rehearsal_closed';"),'0');
};
const authEnvironmentFields={disable_signup:'GOTRUE_DISABLE_SIGNUP',external_email_enabled:'GOTRUE_EXTERNAL_EMAIL_ENABLED',external_phone_enabled:'GOTRUE_EXTERNAL_PHONE_ENABLED',external_anonymous_users_enabled:'GOTRUE_EXTERNAL_ANONYMOUS_USERS_ENABLED',security_manual_linking_enabled:'GOTRUE_SECURITY_MANUAL_LINKING_ENABLED'};
const authEnvironment=config=>Object.fromEntries(Object.entries(config).map(([field,value])=>[authEnvironmentFields[field],String(value)]));
function readAuthConfiguration(id,expected,key){
 const environment=Object.fromEntries(inspect(id).Config.Env.map(entry=>{const split=entry.indexOf('=');return [entry.slice(0,split),entry.slice(split+1)];}));
 for(const [field,value]of Object.entries(expected))assert.equal(environment[authEnvironmentFields[field]],String(value));
 assert.equal(hash(environment.GOTRUE_JWT_SECRET),hash(key));
 const response=api('/settings');assert.equal(response.status,200);
 const settings=response.data;
 assert.equal(settings.disable_signup,expected.disable_signup);
 assert.equal(settings.external.email,expected.external_email_enabled);
 assert.equal(settings.external.phone,expected.external_phone_enabled);
 assert.equal(settings.external.anonymous_users,expected.external_anonymous_users_enabled);
 assert.deepEqual(Object.entries(settings.external).filter(([,enabled])=>enabled).map(([provider])=>provider),expected.external_email_enabled?['email']:[]);
 assert.equal(settings.saml_enabled,false);assert.equal(settings.passkeys_enabled,false);
 return {...expected};
}
const adminToken=(key,role='service_role')=>{const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url'),payload=enc({alg:'HS256',typ:'JWT'})+'.'+enc({role,iss:'supabase',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600});return payload+'.'+createHmac('sha256',key).update(payload).digest('base64url');};
async function startAuth(suffix,key,closure={}){const id=run(suffix,'public.ecr.aws/supabase/gotrue:v2.192.0',{
 GOTRUE_API_HOST:'127.0.0.1',GOTRUE_API_PORT:'9999',API_EXTERNAL_URL:'http://localhost:9999',GOTRUE_SITE_URL:'http://localhost:3000',GOTRUE_DB_DRIVER:'postgres',GOTRUE_DB_DATABASE_URL:`postgres://supabase_auth_admin:${password}@127.0.0.1:5432/postgres?sslmode=disable`,GOTRUE_JWT_SECRET:key,GOTRUE_JWT_EXP:'3600',GOTRUE_MAILER_OTP_EXP:'3600',GOTRUE_DISABLE_SIGNUP:'false',GOTRUE_EXTERNAL_PHONE_ENABLED:'false',GOTRUE_EXTERNAL_ANONYMOUS_USERS_ENABLED:'false',GOTRUE_SECURITY_MANUAL_LINKING_ENABLED:'false',GOTRUE_JWT_AUD:'authenticated',GOTRUE_JWT_DEFAULT_GROUP_NAME:'authenticated',GOTRUE_EXTERNAL_EMAIL_ENABLED:'true',GOTRUE_MAILER_AUTOCONFIRM:'false',GOTRUE_SMTP_HOST:'127.0.0.1',GOTRUE_SMTP_PORT:'1025',GOTRUE_SMTP_ADMIN_EMAIL:'noreply@example.test',GOTRUE_SMTP_SENDER_NAME:'Local fixture',GOTRUE_SMTP_MAX_FREQUENCY:'1ns',GOTRUE_RATE_LIMIT_EMAIL_SENT:'1000',...closure});
 for(let i=0;i<60;i++){try{if(api('/health').status===200)return id;}catch{}await wait(500);}throw Error('AUTH_TIMEOUT');}
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
try{
 for(const image of json(pinned(ROOT,authorized.manifest.localRuntime)).images)assert.equal(docker(['image','inspect',image.tag,'--format','{{.Id}}']).stdout.trim(),image.id);
 phase='database';db=run('db','public.ecr.aws/supabase/postgres:17.6.1.140',{POSTGRES_PASSWORD:password});
 let ready=false;for(let i=0;i<60;i++){if(docker(['exec',db,'pg_isready','-h','127.0.0.1','-U','postgres'],null,true).status===0){ready=true;break;}await wait(500);}assert.ok(ready);
 sql('ALTER ROLE supabase_auth_admin PASSWORD '+lit(password)+';','supabase_admin');
 sql('ALTER ROLE authenticator PASSWORD '+lit(password)+';','supabase_admin');
 client=run('client',nodeImage,{},['--entrypoint','node'],['-e','setInterval(()=>{},100000);']);
 run('smtp','public.ecr.aws/supabase/mailpit:v1.30.2');
 const oldKey=randomBytes(32).toString('hex'),newKey=randomBytes(32).toString('hex');auth=await startAuth('auth',oldKey);

 assert.equal(sql('SELECT count(*) FROM auth.users;'),'0');
 const context={manifestSha256:authorized.manifestSha256,owner,password,oldKey,db,client,auth,owned,volumes,preparedAt:new Date().toISOString(),sourceUsers:0};
 protect(authorized,context,'control/warm-context.dpapi');
 Object.assign(report,{status:'SOURCE_PREWARMED',sourceUsers:0,ownedContainers:owned.length,hostPorts:0,network:'none',credentialsIssued:false,sourceSigningSha256:hash(oldKey)});
}catch(e){terminating=true;Object.assign(report,{phase,failureClass:e.code??'SANITIZED_FAILURE'});process.exitCode=1;
 for(const row of [...owned].reverse()){const state=inspect(row.id);assert.equal(state.Config.Labels['com.comment_translator.atomic'],owner);assert.equal(state.Image,row.image);docker(['rm','-f',row.id]);}
 for(const volume of [...new Set(volumes)]){assert.match(volume,/^[a-f0-9]{64}$/);assert.equal(docker(['ps','-aq','--filter','volume='+volume]).stdout.trim(),'');docker(['volume','rm',volume]);}
}
fs.writeFileSync((ROOT+'/source-warm.json'),JSON.stringify(report,null,2),{flag:'wx'});
console.log(JSON.stringify(report));
