import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {randomBytes,createHash,createHmac} from 'node:crypto';
import {ATOMIC_LOCAL_DOCKER_ARGS} from './lib/comment-translator-paid-core-v1-gate1-atomic-local-process.mjs';
import {createAtomicPostgresAdapter,createAtomicPostgresNativeTransport,inspectAtomicPostgresBaseline} from './lib/comment-translator-paid-core-v1-gate1-atomic-postgres-process.mjs';
import {buildAtomicRestore} from './lib/comment-translator-paid-core-v1-gate1-atomic-restore.mjs';
import {BACKUP_SOURCE_STATE_SQL} from './lib/comment-translator-paid-core-v1-gate1-backup-state.mjs';
const owner='ct-atomic-'+randomBytes(12).toString('hex'),name=owner+'-db',password=randomBytes(24).toString('hex');
const nodeImage='sha256:d189b8072865b5d8289af9435dee18eb6eef82f465e1d7d092fa9665bbd4ce54';
const owned=[],volumes=[],hash=x=>createHash('sha256').update(x).digest('hex'),lit=s=>"'"+String(s).replaceAll("'","''")+"'",wait=ms=>new Promise(r=>setTimeout(r,ms));
let phase='images',db,client,auth,target,report={scope:'LOCAL_SYNTHETIC_ONLY',status:'FAIL',externalDelivery:false};
const docker=(args,input,allow=false)=>{const r=spawnSync('docker',[...ATOMIC_LOCAL_DOCKER_ARGS,...args],{input,encoding:'utf8',windowsHide:true,timeout:30000,maxBuffer:4194304});if(!allow&&(r.status!==0||r.error||r.signal))throw Object.assign(Error('NATIVE_FAILED'),{sqlState:r.stderr?.match(/ERROR:\s+([0-9A-Z]{5}):/)?.[1]??null,guardFailure:/ERROR:\s+(?:P0001:\s+)?ATOMIC_FLOW_UNSUPPORTED/.test(r.stderr??'')?'ATOMIC_FLOW_UNSUPPORTED':null});return r;};
const inspect=id=>JSON.parse(docker(['inspect',id]).stdout)[0];
function run(suffix,image,env={},before=[],after=[]){const id=docker(['run','-d','--pull=never','--name',owner+'-'+suffix,'--label','com.comment_translator.atomic='+owner,'--network',suffix==='db'?'none':'container:'+db,...Object.entries(env).flatMap(([k,v])=>['-e',k+'='+v]),...before,image,...after]).stdout.trim();assert.match(id,/^[a-f0-9]{64}$/);const v=inspect(id);owned.push({id,image:v.Image});volumes.push(...v.Mounts.filter(m=>m.Type==='volume').map(m=>m.Name));return id;}
const sql=(q,role='postgres')=>docker(['exec','-i',db,'psql','-X','-qAt','-U',role,'-d','postgres','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose'],'SET client_min_messages=warning; SET search_path=pg_catalog,public;\n'+q).stdout.trim();
const api=(path,body,token,method)=>{
 const code="let s='';process.stdin.on('data',b=>s+=b);process.stdin.on('end',async()=>{try{const q=JSON.parse(s);const r=await fetch('http://127.0.0.1:9999'+q.path,{method:q.method??(q.body?'POST':'GET'),redirect:'manual',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json',...(q.token?{Authorization:'Bearer '+q.token}:{})},...(q.body?{body:JSON.stringify(q.body)}:{})});let data;try{data=await r.json();}catch{data=null;}process.stdout.write(JSON.stringify({status:r.status,data}));}catch{process.exitCode=2;}});";
 return JSON.parse(docker(['exec','-i',client,'node','-e',code],JSON.stringify({path,body,token,method})).stdout);
};
const adminToken=key=>{const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url'),payload=enc({alg:'HS256',typ:'JWT'})+'.'+enc({role:'service_role',iss:'supabase',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600});return payload+'.'+createHmac('sha256',key).update(payload).digest('base64url');};
async function startAuth(suffix,key){const id=run(suffix,'public.ecr.aws/supabase/gotrue:v2.192.0',{
 GOTRUE_API_HOST:'127.0.0.1',GOTRUE_API_PORT:'9999',API_EXTERNAL_URL:'http://localhost:9999',GOTRUE_SITE_URL:'http://localhost:3000',GOTRUE_DB_DRIVER:'postgres',GOTRUE_DB_DATABASE_URL:`postgres://supabase_auth_admin:${password}@127.0.0.1:5432/postgres?sslmode=disable`,GOTRUE_JWT_SECRET:key,GOTRUE_JWT_AUD:'authenticated',GOTRUE_JWT_DEFAULT_GROUP_NAME:'authenticated',GOTRUE_EXTERNAL_EMAIL_ENABLED:'true',GOTRUE_MAILER_AUTOCONFIRM:'false',GOTRUE_SMTP_HOST:'127.0.0.1',GOTRUE_SMTP_PORT:'1025',GOTRUE_SMTP_ADMIN_EMAIL:'noreply@example.test',GOTRUE_SMTP_SENDER_NAME:'Local fixture',GOTRUE_SMTP_MAX_FREQUENCY:'1ns',GOTRUE_RATE_LIMIT_EMAIL_SENT:'1000'});
 for(let i=0;i<60;i++){try{if(api('/health').status===200)return id;}catch{}await wait(500);}throw Error('AUTH_TIMEOUT');}
const requireSession=(r,user)=>{assert.equal(r.status,200);assert.equal(r.data.user.id,user.id);assert.ok(r.data.access_token);assert.equal(api('/user',null,r.data.access_token).status,200);return r.data;};
const aliases=['magiclink','recovery','email_change'];
async function issue(type,user){const verifier=randomBytes(32).toString('base64url'),challenge=createHash('sha256').update(verifier).digest('base64url');
 const body={code_challenge:challenge,code_challenge_method:'s256',email:type==='email_change'?randomBytes(8).toString('hex')+'@example.test':user.email};
 const r=type==='email_change'?api('/user',body,user.accessToken,'PUT'):api(type==='recovery'?'/recover':'/magiclink',body);
 assert.equal(r.status,200);
 const row=JSON.parse(sql('SELECT to_jsonb(f) FROM auth.flow_state f WHERE user_id='+lit(user.id)+' AND authentication_method='+lit(type)+' ORDER BY created_at DESC LIMIT 1;'));
 assert.equal(row.provider_type,type);assert.equal(row.code_challenge,challenge);assert.ok(row.auth_code);
 return {auth_code:row.auth_code,code_verifier:verifier};
}
try{
 for(const image of ['public.ecr.aws/supabase/postgres:17.6.1.140','public.ecr.aws/supabase/gotrue:v2.192.0','public.ecr.aws/supabase/mailpit:v1.30.2',nodeImage])docker(['image','inspect',image]);
 phase='database';db=run('db','public.ecr.aws/supabase/postgres:17.6.1.140',{POSTGRES_PASSWORD:password});
 let ready=false;for(let i=0;i<60;i++){if(docker(['exec',db,'pg_isready','-h','127.0.0.1','-U','postgres'],null,true).status===0){ready=true;break;}await wait(500);}assert.ok(ready);
 target={containerId:db,owner,imageId:inspect(db).Image,baselineSha256:'0'.repeat(64)};
 sql('ALTER ROLE supabase_auth_admin PASSWORD '+lit(password)+';','supabase_admin');
 client=run('client',nodeImage,{},['--entrypoint','node'],['-e','setInterval(()=>{},100000);']);
 run('smtp','public.ecr.aws/supabase/mailpit:v1.30.2');
 const oldKey=randomBytes(32).toString('hex'),newKey=randomBytes(32).toString('hex');auth=await startAuth('auth',oldKey);
 phase='api_emitted_flows';const users=[],oldFlows=[];
 for(const type of aliases){const user={email:type+'@example.test',password:randomBytes(20).toString('hex')};const created=api('/admin/users',{...user,email_confirm:true},adminToken(oldKey));assert.equal(created.status,200);user.id=created.data.id;
 user.accessToken=requireSession(api('/token?grant_type=password',user),user).access_token;
 requireSession(api('/token?grant_type=pkce',await issue(type,user)),user);
 oldFlows.push({type,body:await issue(type,user)});users.push(user);}
 report.apiProviderAliases=aliases;
 phase='synthetic_backup';docker(['stop','--time','1',auth]);
 sql("DELETE FROM auth.refresh_tokens; DELETE FROM auth.sessions; CREATE TABLE public.synthetic_email_business(id integer PRIMARY KEY, value text); INSERT INTO public.synthetic_email_business VALUES(1,'retained');");
 sql(`CREATE SCHEMA IF NOT EXISTS storage; CREATE SCHEMA IF NOT EXISTS vault; CREATE SCHEMA IF NOT EXISTS supabase_migrations;
 CREATE TABLE IF NOT EXISTS storage.objects(id integer); CREATE TABLE IF NOT EXISTS storage.buckets_vectors(id integer); CREATE TABLE IF NOT EXISTS storage.vector_indexes(id integer);
 CREATE TABLE IF NOT EXISTS vault.secrets(id integer); CREATE TABLE supabase_migrations.schema_migrations(version text PRIMARY KEY);
 INSERT INTO supabase_migrations.schema_migrations SELECT lpad(i::text,14,'0') FROM generate_series(1,22) i;`,'supabase_admin');
 sql("INSERT INTO auth.flow_state(id,provider_type,provider_access_token,provider_refresh_token,authentication_method,created_at,updated_at) VALUES(gen_random_uuid(),'synthetic-unrelated','','','oauth',now(),now());");
 const sourceState=JSON.parse(sql(`SELECT ${BACKUP_SOURCE_STATE_SQL};`));
 const data=docker(['exec',db,'pg_dump','-U','postgres','-d','postgres','--data-only','--quote-all-identifiers','--table=auth.users','--table=auth.identities','--table=auth.flow_state','--table=auth.one_time_tokens']).stdout;
 const input={sourceState,artifacts:['roles.sql','schema.sql','auth_storage_changes.sql','data.sql','history_schema.sql','history_data.sql'].map((name,i)=>{const text=i===3?data:'SELECT 1;';return{name,sql:text,bytes:Buffer.byteLength(text),sha256:hash(text)};})};
 // Exercise the actual generated validation block against unsupported pairs
 // in rolled-back synthetic transactions, before the one restore attempt.
 phase='unsupported_pairs';const guard=buildAtomicRestore(input).sql.match(/DO \$ct\$ BEGIN\n  IF current_setting[\s\S]*?END \$ct\$;/)?.[0];assert.ok(guard);sql(guard);
 const rejectedPairs=[['magiclink','recovery'],['recovery','magiclink'],['email_change','recovery'],['email','oauth'],['google','oauth'],['','recovery'],['synthetic-unrelated','recovery'],['magiclink','oauth']];
 for(const [provider,method]of rejectedPairs){assert.throws(()=>sql("BEGIN; INSERT INTO auth.flow_state(id,provider_type,provider_access_token,provider_refresh_token,authentication_method,created_at,updated_at) VALUES(gen_random_uuid(),"+lit(provider)+",'','',"+lit(method)+",now(),now()); "+guard+' ROLLBACK;'),e=>e.guardFailure==='ATOMIC_FLOW_UNSUPPORTED');}
 report.unsupportedPairsRejected=rejectedPairs.length;
 sql('DELETE FROM auth.flow_state; DELETE FROM auth.identities; DELETE FROM auth.users;');
 const baseline=await inspectAtomicPostgresBaseline(target);target.baselineSha256=baseline.baselineSha256;
 phase='atomic_restore';const result=await createAtomicPostgresAdapter(createAtomicPostgresNativeTransport()).run(input,target);assert.equal(result.independentCommittedReadbackMatched,true);
 assert.equal(sql('SELECT count(*) FROM auth.flow_state;'),'1');assert.equal(sql("SELECT count(*) FROM auth.flow_state WHERE provider_type='synthetic-unrelated';"),'1');
 report.exactResetAndReadback=true;
 phase='old_codes';auth=await startAuth('auth-new',newKey);
 for(const {body}of oldFlows){const r=api('/token?grant_type=pkce',body);assert.equal(r.status,404);assert.equal(r.data.error_code,'flow_state_not_found');}
 assert.equal(sql('SELECT count(*) FROM auth.sessions;'),'0');report.oldApiCodesRejected=oldFlows.length;
 phase='fresh_codes';for(let i=0;i<users.length;i++){const user=users[i];user.accessToken=requireSession(api('/token?grant_type=password',{email:user.email,password:user.password}),user).access_token;requireSession(api('/token?grant_type=pkce',await issue(aliases[i],user)),user);}
 report.freshApiCodesAccepted=aliases.length;report.originalPasswordsAndIdsAccepted=users.length;report.status='PASS';
}catch(e){report.phase=phase;report.sqlState=e.sqlState??null;report.adapterPhase=e.phase??null;report.reason=e.reason??null;report.failureClass=e.code??'SANITIZED_FAILURE';process.exitCode=1;}
finally{
 for(const item of owned.reverse()){try{const v=inspect(item.id);assert.equal(v.Config.Labels['com.comment_translator.atomic'],owner);assert.equal(v.Image,item.image);docker(['rm','-f','-v',item.id]);}catch{report.cleanupFailed=true;process.exitCode=1;}}
 report.ownedContainersRemaining=docker(['ps','-aq','--filter','label=com.comment_translator.atomic='+owner]).stdout.trim()?1:0;report.ownedVolumesRemaining=volumes.filter(v=>docker(['volume','inspect',v],null,true).status===0).length;
 if(report.ownedContainersRemaining||report.ownedVolumesRemaining){report.status='FAIL';process.exitCode=1;}console.log(JSON.stringify({...report,stageAuthority:false,gate:'NO-GO'}));}