import {generateSyntheticInputs} from './gate1-execution/synthetic-inputs.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {randomBytes,createHash,createHmac} from 'node:crypto';
import {ATOMIC_LOCAL_DOCKER_ARGS} from './lib/comment-translator-paid-core-v1-gate1-atomic-local-process.mjs';
import {createAtomicPostgresAdapter,createAtomicPostgresNativeTransport,inspectAtomicPostgresBaseline} from './lib/comment-translator-paid-core-v1-gate1-atomic-postgres-process.mjs';
import {buildAtomicRestore} from './lib/comment-translator-paid-core-v1-gate1-atomic-restore.mjs';
import {BACKUP_SOURCE_STATE_SQL} from './lib/comment-translator-paid-core-v1-gate1-backup-state.mjs';
import {validateRehearsalPreparation,buildRehearsalAuthChange} from './lib/comment-translator-paid-core-v1-gate1-rehearsal-preparation.mjs';
assert.equal(process.argv.length,2); // No remote target or command-line credentials.
const owner='ct-atomic-'+randomBytes(12).toString('hex'),name=owner+'-db',password=randomBytes(24).toString('hex');
const nodeImage='sha256:d189b8072865b5d8289af9435dee18eb6eef82f465e1d7d092fa9665bbd4ce54';
const owned=[],volumes=[],hash=x=>createHash('sha256').update(x).digest('hex'),lit=s=>"'"+String(s).replaceAll("'","''")+"'",wait=ms=>new Promise(r=>setTimeout(r,ms));
let phase='images',db,client,auth,target,report={scope:'LOCAL_SYNTHETIC_ONLY',status:'FAIL',externalDelivery:false};
const docker=(args,input,allow=false)=>{const r=spawnSync('docker',[...ATOMIC_LOCAL_DOCKER_ARGS,...args],{input,encoding:'utf8',windowsHide:true,timeout:30000,maxBuffer:4194304});if(!allow&&(r.status!==0||r.error||r.signal))throw Object.assign(Error('NATIVE_FAILED'),{sqlState:r.stderr?.match(/ERROR:\s+([0-9A-Z]{5}):/)?.[1]??null,guardFailure:/ERROR:\s+(?:P0001:\s+)?ATOMIC_FLOW_UNSUPPORTED/.test(r.stderr??'')?'ATOMIC_FLOW_UNSUPPORTED':null});return r;};
const inspect=id=>JSON.parse(docker(['inspect',id]).stdout)[0];
function run(suffix,image,env={},before=[],after=[]){const id=docker(['run','-d','--pull=never','--name',owner+'-'+suffix,'--label','com.comment_translator.atomic='+owner,'--network',suffix==='db'?'none':'container:'+db,...Object.entries(env).flatMap(([k,v])=>['-e',k+'='+v]),...before,image,...after]).stdout.trim();assert.match(id,/^[a-f0-9]{64}$/);const v=inspect(id);owned.push({id,image:v.Image});volumes.push(...v.Mounts.filter(m=>m.Type==='volume').map(m=>m.Name));return id;}
const sql=(q,role='postgres')=>docker(['exec','-i',db,'psql','-X','-qAt','-U',role,'-d','postgres','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose'],'SET client_min_messages=warning; SET search_path=pg_catalog,public;\n'+q).stdout.trim();
const api=(path,body,token,method)=>{
 const code="let s='';process.stdin.on('data',b=>s+=b);process.stdin.on('end',async()=>{try{const q=JSON.parse(s);const r=await fetch('http://127.0.0.1:9999'+q.path,{method:q.method??(q.body?'POST':'GET'),redirect:'manual',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json',...(q.token?{Authorization:'Bearer '+q.token}:{})},...(q.body?{body:JSON.stringify(q.body)}:{})});let data;try{data=await r.json();}catch{data=null;}process.stdout.write(JSON.stringify({status:r.status,data,location:r.headers.get('location')}));}catch{process.exitCode=2;}});";
 return JSON.parse(docker(['exec','-i',client,'node','-e',code],JSON.stringify({path,body,token,method})).stdout);
};
// The business API shares only this owned, network-none container namespace.
// A refusal is required until both Auth login and direct Free-state checks pass.
const businessApi=(path,token)=>{
 const code="let s='';process.stdin.on('data',b=>s+=b);process.stdin.on('end',async()=>{const q=JSON.parse(s);try{const r=await fetch('http://127.0.0.1:3001'+q.path,{signal:AbortSignal.timeout(5000),headers:q.token?{Authorization:'Bearer '+q.token}:{}});process.stdout.write(JSON.stringify({status:r.status,data:await r.json()}));}catch(e){process.stdout.write(JSON.stringify({status:null,networkError:e.cause?.code==='ECONNREFUSED'?'ECONNREFUSED':'UNKNOWN'}));}});";
 return JSON.parse(docker(['exec','-i',client,'node','-e',code],JSON.stringify({path,token})).stdout);
};
const requireBusinessClosed=()=>assert.deepEqual(businessApi('/user_profiles?select=user_id'),{status:null,networkError:'ECONNREFUSED'});
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
const adminToken=key=>{const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url'),payload=enc({alg:'HS256',typ:'JWT'})+'.'+enc({role:'service_role',iss:'supabase',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600});return payload+'.'+createHmac('sha256',key).update(payload).digest('base64url');};
async function startAuth(suffix,key,closure={}){const id=run(suffix,'public.ecr.aws/supabase/gotrue:v2.192.0',{
 GOTRUE_API_HOST:'127.0.0.1',GOTRUE_API_PORT:'9999',API_EXTERNAL_URL:'http://localhost:9999',GOTRUE_SITE_URL:'http://localhost:3000',GOTRUE_DB_DRIVER:'postgres',GOTRUE_DB_DATABASE_URL:`postgres://supabase_auth_admin:${password}@127.0.0.1:5432/postgres?sslmode=disable`,GOTRUE_JWT_SECRET:key,GOTRUE_JWT_EXP:'3600',GOTRUE_MAILER_OTP_EXP:'3600',GOTRUE_DISABLE_SIGNUP:'false',GOTRUE_EXTERNAL_PHONE_ENABLED:'false',GOTRUE_EXTERNAL_ANONYMOUS_USERS_ENABLED:'false',GOTRUE_SECURITY_MANUAL_LINKING_ENABLED:'false',GOTRUE_JWT_AUD:'authenticated',GOTRUE_JWT_DEFAULT_GROUP_NAME:'authenticated',GOTRUE_EXTERNAL_EMAIL_ENABLED:'true',GOTRUE_MAILER_AUTOCONFIRM:'false',GOTRUE_SMTP_HOST:'127.0.0.1',GOTRUE_SMTP_PORT:'1025',GOTRUE_SMTP_ADMIN_EMAIL:'noreply@example.test',GOTRUE_SMTP_SENDER_NAME:'Local fixture',GOTRUE_SMTP_MAX_FREQUENCY:'1ns',GOTRUE_RATE_LIMIT_EMAIL_SENT:'1000',...closure});
 for(let i=0;i<60;i++){try{if(api('/health').status===200)return id;}catch{}await wait(500);}throw Error('AUTH_TIMEOUT');}
const requireSession=(r,user)=>{assert.equal(r.status,200);assert.equal(r.data.user.id,user.id);assert.ok(r.data.access_token);assert.equal(api('/user',null,r.data.access_token).status,200);return r.data;};
const aliases=['magiclink','recovery','email_change'];

try{
 for(const image of ['public.ecr.aws/supabase/postgres:17.6.1.140','public.ecr.aws/supabase/gotrue:v2.192.0','public.ecr.aws/supabase/mailpit:v1.30.2','public.ecr.aws/supabase/postgrest:v14.14',nodeImage])docker(['image','inspect',image]);
 phase='database';db=run('db','public.ecr.aws/supabase/postgres:17.6.1.140',{POSTGRES_PASSWORD:password});
 let ready=false;for(let i=0;i<60;i++){if(docker(['exec',db,'pg_isready','-h','127.0.0.1','-U','postgres'],null,true).status===0){ready=true;break;}await wait(500);}assert.ok(ready);
 target={containerId:db,owner,imageId:inspect(db).Image,baselineSha256:'0'.repeat(64)};
 sql('ALTER ROLE supabase_auth_admin PASSWORD '+lit(password)+';','supabase_admin');
 sql('ALTER ROLE authenticator PASSWORD '+lit(password)+';','supabase_admin');
 client=run('client',nodeImage,{},['--entrypoint','node'],['-e','setInterval(()=>{},100000);']);
 run('smtp','public.ecr.aws/supabase/mailpit:v1.30.2');
 const oldKey=randomBytes(32).toString('hex'),newKey=randomBytes(32).toString('hex');auth=await startAuth('auth',oldKey);
 phase='api_emitted_flows';
 const {fixture,users,oldFlows,oldLinks,business,businessBefore,businessRows,businessRowsBefore,mailCount}=await generateSyntheticInputs({api,sql,docker,inspect,db,client,oldKey,targetSigningSha256:hash(newKey),adminToken,foundationSql:fs.readFileSync('supabase/migrations/20260527000000_account_preferences_foundation.sql','utf8')});
 report.preparation=validateRehearsalPreparation(fixture);report.preparedBeforeClosure=true;
 requireBusinessClosed();
 const selectedConfig=readAuthConfiguration(auth,{disable_signup:false,external_email_enabled:true,external_phone_enabled:false,external_anonymous_users_enabled:false,security_manual_linking_enabled:false},oldKey);
 const configChange=buildRehearsalAuthChange(selectedConfig,'close');report.authConfigChange=configChange;
 report.apiProviderAliases=aliases;
 phase='synthetic_backup';docker(['stop','--time','1',auth]);
 sql("CREATE TABLE public.synthetic_email_business(id integer PRIMARY KEY, value text); INSERT INTO public.synthetic_email_business VALUES(1,'retained');");
 sql(`CREATE SCHEMA IF NOT EXISTS storage; CREATE SCHEMA IF NOT EXISTS vault; CREATE SCHEMA IF NOT EXISTS supabase_migrations;
 CREATE TABLE IF NOT EXISTS storage.objects(id integer); CREATE TABLE IF NOT EXISTS storage.buckets_vectors(id integer); CREATE TABLE IF NOT EXISTS storage.vector_indexes(id integer);
 CREATE TABLE IF NOT EXISTS vault.secrets(id integer); CREATE TABLE supabase_migrations.schema_migrations(version text PRIMARY KEY);
 INSERT INTO supabase_migrations.schema_migrations SELECT lpad(i::text,14,'0') FROM generate_series(1,22) i;`,'supabase_admin');
 sql("INSERT INTO auth.flow_state(id,provider_type,provider_access_token,provider_refresh_token,authentication_method,created_at,updated_at) VALUES(gen_random_uuid(),'synthetic-unrelated','','','oauth',now(),now());");
 const sourceState=JSON.parse(sql(`SELECT ${BACKUP_SOURCE_STATE_SQL};`));
 const data=docker(['exec',db,'pg_dump','-U','postgres','-d','postgres','--data-only','--quote-all-identifiers','--table=auth.users','--table=auth.identities','--table=auth.flow_state','--table=auth.one_time_tokens','--table=auth.sessions','--table=auth.refresh_tokens','--table=auth.refresh_tokens_id_seq','--table=auth.mfa_amr_claims','--table=public.user_profiles','--table=public.usage_quotas']).stdout;
 const input={sourceState,artifacts:['roles.sql','schema.sql','auth_storage_changes.sql','data.sql','history_schema.sql','history_data.sql'].map((name,i)=>{const text=i===3?data:'SELECT 1;';return{name,sql:text,bytes:Buffer.byteLength(text),sha256:hash(text)};})};
 // Exercise the actual generated validation block against unsupported pairs
 // in rolled-back synthetic transactions, before the one restore attempt.
 phase='unsupported_pairs';const guard=buildAtomicRestore(input).sql.match(/DO \$ct\$ BEGIN\n  IF current_setting[\s\S]*?END \$ct\$;/)?.[0];assert.ok(guard);sql(guard);
 const rejectedPairs=[['magiclink','recovery'],['recovery','magiclink'],['email_change','recovery'],['email','oauth'],['google','oauth'],['','recovery'],['synthetic-unrelated','recovery'],['magiclink','oauth']];
 for(const [provider,method]of rejectedPairs){assert.throws(()=>sql("BEGIN; INSERT INTO auth.flow_state(id,provider_type,provider_access_token,provider_refresh_token,authentication_method,created_at,updated_at) VALUES(gen_random_uuid(),"+lit(provider)+",'','',"+lit(method)+",now(),now()); "+guard+' ROLLBACK;'),e=>e.guardFailure==='ATOMIC_FLOW_UNSUPPORTED');}
 report.unsupportedPairsRejected=rejectedPairs.length;
 sql('DELETE FROM auth.flow_state; DELETE FROM auth.identities; DELETE FROM auth.users;');
 const closedConfig={...selectedConfig,...configChange.patch},closed=authEnvironment(closedConfig);
 auth=await startAuth('auth-closed',newKey,closed);
 readAuthConfiguration(auth,closedConfig,newKey);
 report.sourceAndTargetConfiguredSigningDiffer=hash(oldKey)!==hash(newKey);assert.equal(report.sourceAndTargetConfiguredSigningDiffer,true);
 report.authRunningDuringAtomic=inspect(auth).State.Running===true;assert.equal(report.authRunningDuringAtomic,true);
 const baseline=await inspectAtomicPostgresBaseline(target);target.baselineSha256=baseline.baselineSha256;
 phase='atomic_restore';validateRehearsalPreparation(fixture);
 const result=await createAtomicPostgresAdapter(createAtomicPostgresNativeTransport()).run(input,target);assert.equal(result.independentCommittedReadbackMatched,true);
 assert.equal(sql('SELECT count(*) FROM auth.flow_state;'),'1');assert.equal(sql("SELECT count(*) FROM auth.flow_state WHERE provider_type='synthetic-unrelated';"),'1');
 report.exactResetAndReadback=true;

 phase='closed_restore';
 const tables=JSON.parse(sql("SELECT json_agg(tablename ORDER BY tablename) FROM pg_tables WHERE schemaname='auth';"));
 const ident=v=>'"'+v.replaceAll('"','""')+'"';
 const fullState=()=>JSON.parse(sql('SELECT json_object_agg(name,digest ORDER BY name) FROM ('+tables.map(t=>"SELECT "+lit(t)+" AS name, encode(sha256(convert_to(coalesce(jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)::text COLLATE \"C\"),'[]'::jsonb)::text,'UTF8')),'hex') AS digest FROM auth."+ident(t)+" r").join(' UNION ALL ')+') s;'.replaceAll('\\','')));
 const closedMailCount=()=>{const code="fetch('http://127.0.0.1:8025/api/v1/messages',{signal:AbortSignal.timeout(10000)}).then(async r=>{if(!r.ok)throw Error();const j=await r.json();if(!Number.isSafeInteger(j.total))throw Error();process.stdout.write(String(j.total));}).catch(()=>process.exit(2));";const n=Number(docker(['exec',client,'node','-e',code]).stdout);assert.ok(Number.isSafeInteger(n));return n;};
 const before=fullState(),mailBefore=closedMailCount();assert.ok(mailBefore>0);
 report.closedRequests=[];
 const check=(kind,path,body,token,expectedStatus,expectedCode)=>{const r=api(path,body,token);assert.equal(r.status,expectedStatus);assert.equal(r.data?.error_code,expectedCode);assert.ok(!r.data?.access_token);report.closedRequests.push({kind,status:r.status,errorCode:r.data.error_code});};
 const u=users[0];
 check('password','/token?grant_type=password',{email:u.email,password:u.password},null,422,'email_provider_disabled');
 check('recovery','/recover',{email:u.email},null,400,'email_provider_disabled');
 check('magiclink','/magiclink',{email:u.email},null,422,'email_provider_disabled');
 check('otp','/otp',{email:u.email,create_user:false},null,422,'email_provider_disabled');
 check('resend','/resend',{email:u.email,type:'signup'},null,400,'email_provider_disabled');
 check('signup','/signup',{email:'new@example.test',password:u.password},null,422,'signup_disabled');
 for(const user of users){check('old-access','/user',null,user.accessToken,403,'bad_jwt');check('old-refresh','/token?grant_type=refresh_token',{refresh_token:user.refreshToken},null,400,'refresh_token_not_found');}
 for(const {body,expiresAt}of oldFlows){assert.ok(Date.now()<expiresAt);check('old-pkce','/token?grant_type=pkce',body,null,404,'flow_state_not_found');}
 const checkOldLinks=(suffix='')=>{for(const link of oldLinks){
  assert.ok(Date.now()<link.expiresAt);check('old-verify-post'+suffix,'/verify',{type:link.type,token_hash:link.hash},null,403,'otp_expired');
  const get=api(link.getPath,null,null,'GET');assert.equal(get.status,303);
  const location=new URL(get.location),fragment=new URLSearchParams(location.hash.slice(1));
  for(const field of ['access_token','refresh_token','code','auth_code']){assert.equal(fragment.has(field),false);assert.equal(location.searchParams.has(field),false);}
  assert.equal(fragment.get('error_code')??location.searchParams.get('error_code'),'otp_expired');
  report.closedRequests.push({kind:'old-verify-get'+suffix,status:get.status,errorCode:'otp_expired',tokenIssued:false});
 }};
 checkOldLinks();
 const after=fullState();report.authTableCount=tables.length;report.changedAuthTables=tables.filter(t=>before[t]!==after[t]);report.mailDelta=closedMailCount()-mailBefore;
 assert.deepEqual(report.changedAuthTables,[]);assert.equal(report.mailDelta,0);report.allAuthRowsUnchanged=true;
 assert.equal(sql('SELECT count(*) FROM auth.sessions;'),'0');assert.equal(sql('SELECT count(*) FROM auth.refresh_tokens;'),'0');
 report.closedRestorePassed=true;
 requireBusinessClosed();
 phase='approved_auth_reopen';
 assert.deepEqual(business(),businessBefore);
 const authReopen=buildRehearsalAuthChange({...selectedConfig,...configChange.patch},'auth-reopen');assert.deepEqual(authReopen.patch,{external_email_enabled:true});report.authReopenChange=authReopen;
 const reopenConfig={...closedConfig,...authReopen.patch};
 docker(['stop','--time','1',auth]);auth=await startAuth('auth-reopen',newKey,authEnvironment(reopenConfig));
 readAuthConfiguration(auth,reopenConfig,newKey);report.authConfigurationReadbacksPassed=3;
 const reopened=users.map(user=>requireSession(api('/token?grant_type=password',{email:user.email,password:user.password}),user));
 report.originalPasswordsAndIdsAccepted=reopened.length;
 const stillClosed=api('/signup',{email:'stillclosed@example.test',password:users[0].password});assert.equal(stillClosed.status,422);assert.equal(stillClosed.data.error_code,'signup_disabled');report.signupRemainsClosed=true;
 phase='direct_business_smoke';
 requireBusinessClosed();
 assert.deepEqual(business(),businessBefore);assert.equal(businessRows(),businessRowsBefore);report.directFreeStateMatched=true;report.businessRowCount=businessBefore.length;
 report.publicAuthReopenedBeforeBusiness=true;
 phase='old_credentials_after_reopen';
 const reopenedBeforeDenials=fullState(),reopenedMailBeforeDenials=closedMailCount();
 for(const user of users){check('old-access-after-reopen','/user',null,user.accessToken,403,'bad_jwt');check('old-refresh-after-reopen','/token?grant_type=refresh_token',{refresh_token:user.refreshToken},null,400,'refresh_token_not_found');}
 for(const flow of oldFlows){assert.ok(Date.now()<flow.expiresAt);check('old-pkce-after-reopen','/token?grant_type=pkce',flow.body,null,404,'flow_state_not_found');}
 checkOldLinks('-after-reopen');
 assert.deepEqual(fullState(),reopenedBeforeDenials);assert.equal(closedMailCount(),reopenedMailBeforeDenials);
 report.oldCredentialsAfterReopenNoAuthDelta=true;
 report.p2P6AuthAndDirectBusinessLocalPass=true;
 phase='business_api_reopen';
 // Starting this separate process is the only local business reopening action.
 // Do not grant new table privileges or weaken the repository RLS policies.
 const rest=run('rest','public.ecr.aws/supabase/postgrest:v14.14',{
  PGRST_DB_URI:`postgres://authenticator:${password}@127.0.0.1:5432/postgres?sslmode=disable`,
  PGRST_DB_SCHEMAS:'public',PGRST_DB_ANON_ROLE:'anon',PGRST_DB_CONFIG:'false',
  PGRST_JWT_SECRET:newKey,PGRST_SERVER_HOST:'127.0.0.1',PGRST_SERVER_PORT:'3001',
 });
 assert.equal(inspect(rest).State.Running,true);
 let restReady=false;
 for(let i=0;i<30;i++){
  const response=businessApi('/user_profiles?select=user_id',reopened[0].access_token);
  if(response.status===200){restReady=true;break;}
  await wait(500);
 }
 assert.ok(restReady);
 for(const [i,user]of users.entries()){
  const token=reopened[i].access_token,other=users[(i+1)%users.length];
  const profiles=businessApi('/user_profiles?select=user_id',token);
  assert.equal(profiles.status,200);assert.deepEqual(profiles.data,[{user_id:user.id}]);
  const quotas=businessApi('/usage_quotas?select=user_id,plan_id,used_count,limit_count',token);
  assert.equal(quotas.status,200);assert.deepEqual(quotas.data,[{user_id:user.id,plan_id:'free',used_count:3,limit_count:100}]);
  for(const table of ['user_profiles','usage_quotas']){
   const cross=businessApi('/'+table+'?select=user_id&user_id=eq.'+other.id,token);
   assert.equal(cross.status,200);assert.deepEqual(cross.data,[]);
  }
  const old=businessApi('/user_profiles?select=user_id',user.accessToken);
  assert.equal(old.status,401);assert.equal(old.data?.code,'PGRST301');
 }
 const anonymous=businessApi('/user_profiles?select=user_id');
 assert.equal(anonymous.status,401);assert.equal(anonymous.data?.code,'42501');
 assert.deepEqual(business(),businessBefore);assert.equal(businessRows(),businessRowsBefore);report.allBusinessColumnsPreserved=true;
 report.businessApiReopened=true;report.ownerReadsPassed=6;report.crossOwnerReadsDenied=6;
 report.oldAccessDeniedByBusinessApi=3;report.anonymousBusinessReadDenied=true;
 report.businessClosedUntilDirectSmoke=true;
 report.hostedReady=false;report.remainingHostedControls=['full-provider-capability-and-writable-schema','source-target-signing-readback','complete-alternate-service-matrix','Hosted-import-and-business-reopen-transport'];
 report.scope='LOCAL_SYNTHETIC_PREPARED_P2_P6';report.status='PASS';
}catch(e){report.phase=phase;report.sqlState=e.sqlState??null;report.adapterPhase=e.phase??null;report.reason=e.reason??null;report.failureClass=e.code??'SANITIZED_FAILURE';process.exitCode=1;}
finally{
 for(const item of owned.reverse()){try{const v=inspect(item.id);assert.equal(v.Config.Labels['com.comment_translator.atomic'],owner);assert.equal(v.Image,item.image);docker(['rm','-f','-v',item.id]);}catch{report.cleanupFailed=true;process.exitCode=1;}}
 report.ownedContainersRemaining=docker(['ps','-aq','--filter','label=com.comment_translator.atomic='+owner]).stdout.trim()?1:0;
 const remainingVolumes=new Set(docker(['volume','ls','--format','{{.Name}}']).stdout.trim().split(/\r?\n/));
 report.ownedVolumesRemaining=volumes.filter(v=>remainingVolumes.has(v)).length;
 if(report.cleanupFailed||report.ownedContainersRemaining||report.ownedVolumesRemaining){report.status='FAIL';process.exitCode=1;}
 fs.mkdirSync('.tmp/gate1-evidence-20260910',{recursive:true});
 fs.writeFileSync('.tmp/gate1-evidence-20260910/rehearsal-preparation-local-'+owner+'.json',JSON.stringify({...report,stageAuthority:false,gate:'NO-GO'}),{flag:'wx'});
 console.log(JSON.stringify({...report,stageAuthority:false,gate:'NO-GO'}));}
