import {spawnSync} from 'node:child_process';
import {randomBytes,createHash,createHmac} from 'node:crypto';
import { BACKUP_SOURCE_STATE_SQL } from './lib/comment-translator-paid-core-v1-gate1-backup-state.mjs';
import { createAtomicLocalProcess, ATOMIC_LOCAL_DOCKER_ARGS } from './lib/comment-translator-paid-core-v1-gate1-atomic-local-process.mjs';
import { ATOMIC_MANAGED_SHAPE_SQL } from './lib/comment-translator-paid-core-v1-gate1-atomic-restore.mjs';
import assert from 'node:assert/strict';
const id='ct-atomic-'+randomBytes(12).toString('hex'), net=id+'-net', db=id+'-db', auth=id+'-auth';
const pass=randomBytes(24).toString('hex'), oldKey=randomBytes(32).toString('hex'), newKey=randomBytes(32).toString('hex');
const report={scope:'LOCAL_SYNTHETIC_ONLY',checks:{},createdAt:new Date().toISOString()};
let phase='start';let ownedVolumes=[];
function docker(args,input,allow=false){const r=spawnSync('docker',[...ATOMIC_LOCAL_DOCKER_ARGS,...args],{input,encoding:'utf8',windowsHide:true,timeout:30000,maxBuffer:4e6});if(r.status!==0&&!allow)throw Error('DOCKER_'+phase);return r.status===0?(r.stdout+(args[0]==='logs'?r.stderr:'')).trim():null;}
const sql=q=>docker(['exec','-i',db,'psql','-X','-qAt','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1'],'SET search_path=pg_catalog,public;\n'+q);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let base;
async function startAuth(key){docker(['run','-d','--pull=never','--name',auth,'--label','com.comment_translator.atomic='+id,'--network',net,'-p','127.0.0.1::9999',...Object.entries({GOTRUE_API_HOST:'0.0.0.0',GOTRUE_API_PORT:'9999',API_EXTERNAL_URL:'http://localhost:9999',GOTRUE_SITE_URL:'http://localhost:3000',GOTRUE_DB_DRIVER:'postgres',GOTRUE_DB_DATABASE_URL:`postgres://supabase_auth_admin:${pass}@${db}:5432/postgres?sslmode=disable`,GOTRUE_JWT_SECRET:key,GOTRUE_JWT_EXP:'3600',GOTRUE_JWT_AUD:'authenticated',GOTRUE_JWT_DEFAULT_GROUP_NAME:'authenticated',GOTRUE_DISABLE_SIGNUP:'false',GOTRUE_EXTERNAL_EMAIL_ENABLED:'true',GOTRUE_MAILER_AUTOCONFIRM:'true',GOTRUE_RATE_LIMIT_EMAIL_SENT:'1000',GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_REAUTHENTICATION:'true'}).flatMap(([k,v])=>['-e',k+'='+v]),'public.ecr.aws/supabase/gotrue:v2.192.0']);
await wait(2000); const port=docker(['port',auth,'9999/tcp'],null,true);if(!port)throw Error(docker(['logs',auth],null,true)?.slice(-500)||'AUTH_EXIT');assert.match(port,/^127\.0\.0\.1:\d+$/);base='http://'+port;
for(let i=0;i<60;i++){try{const r=await fetch(base+'/health',{signal:AbortSignal.timeout(5000)});if(r.ok){assert.equal((await r.json()).version,'v2.192.0');return;}}catch{}await wait(500);}throw Error('AUTH_NOT_READY');}
async function api(path,body,token,method){const r=await fetch(base+path,{signal:AbortSignal.timeout(5000),method:method??(body?'POST':'GET'),headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}


const lit=s=>"'"+String(s).replaceAll("'","''")+"'";
const adminToken=key=>{const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url');const p=enc({alg:'HS256',typ:'JWT'})+'.'+enc({role:'service_role',iss:'supabase',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600});return p+'.'+createHmac('sha256',key).update(p).digest('base64url');};
const tables=['users','identities','mfa_factors','mfa_challenges','sessions','refresh_tokens','one_time_tokens','mfa_amr_claims'];
function totpCode(secret){const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';const bits=[...secret.replace(/=+$/,'').toUpperCase()].map(c=>{const n=alphabet.indexOf(c);assert.ok(n>=0);return n.toString(2).padStart(5,'0');}).join('');const bytes=[];for(let i=0;i+8<=bits.length;i+=8)bytes.push(parseInt(bits.slice(i,i+8),2));const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));const digest=createHmac('sha1',Buffer.from(bytes)).update(counter).digest();const offset=digest[19]&15;return String((digest.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0');}
// Local cached Auth supplies its real managed schema. No emails are sent.
try {
  phase='network'; docker(['network','create','--label','com.comment_translator.atomic='+id,net]);
  phase='database'; docker(['run','-d','--pull=never','--name',db,'--label','com.comment_translator.atomic='+id,'--network',net,'-e','POSTGRES_PASSWORD='+pass,'public.ecr.aws/supabase/postgres:17.6.1.140']);
  ownedVolumes=JSON.parse(docker(['inspect','--format','{{json .Mounts}}',db])).filter(m=>m.Type==='volume').map(m=>m.Name);
  for(let i=0;i<60;i++){if(docker(['exec',db,'pg_isready','-h','127.0.0.1','-U','supabase_admin'],null,true)!==null)break;await wait(500);}
  sql('alter role supabase_auth_admin password '+lit(pass)+';');
  phase='fixture'; await startAuth(oldKey);
  report.checks.managedShapeSha256=sql(`SELECT ${ATOMIC_MANAGED_SHAPE_SQL};`);
  const account={email:'atomic@example.test',password:randomBytes(20).toString('hex')};
  const signup=await api('/signup',account); assert.equal(signup.status,200); const userId=signup.data.user.id;
  const factor=await api('/factors',{factor_type:'totp',friendly_name:'Atomic fixture'},signup.data.access_token);assert.equal(factor.status,200);
  const initialChallenge=await api('/factors/'+factor.data.id+'/challenge',{},signup.data.access_token);assert.equal(initialChallenge.status,200);
  const initialBucket=Math.floor(Date.now()/30000);
  const initialVerify=await api('/factors/'+factor.data.id+'/verify',{challenge_id:initialChallenge.data.id,code:totpCode(factor.data.totp.secret)},signup.data.access_token);assert.equal(initialVerify.status,200);
  assert.equal(JSON.parse(Buffer.from(initialVerify.data.access_token.split('.')[1],'base64url')).aal,'aal2');
  report.checks.realMfaEnrollment=true;
  const link=await api('/admin/generate_link',{type:'magiclink',email:account.email},adminToken(oldKey)); assert.equal(link.status,200);
  docker(['rm','-f',auth]);
  sql(`CREATE SCHEMA IF NOT EXISTS storage; CREATE SCHEMA IF NOT EXISTS vault; CREATE SCHEMA IF NOT EXISTS supabase_migrations;
CREATE TABLE IF NOT EXISTS storage.objects(id integer); CREATE TABLE IF NOT EXISTS storage.buckets_vectors(id integer); CREATE TABLE IF NOT EXISTS storage.vector_indexes(id integer);
CREATE TABLE IF NOT EXISTS vault.secrets(id integer); CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations(version text PRIMARY KEY);
INSERT INTO supabase_migrations.schema_migrations SELECT lpad(i::text,14,'0') FROM generate_series(1,22) i;
CREATE TABLE public.atomic_business(id integer PRIMARY KEY, content text); INSERT INTO public.atomic_business VALUES(1,'preserved');`);
  const restore=docker(['exec',db,'pg_dump','-U','supabase_admin','-d','postgres','--data-only','--quote-all-identifiers',
    ...tables.map(t=>'--table=auth.'+t),'--table=auth.refresh_tokens_id_seq']);
  assert.ok(restore.includes('COPY '));assert.ok(restore.includes('pg_catalog.setval('));
  report.checks.nativeAuthCopyAndSetval=true;
  const sourceState=JSON.parse(sql(`SELECT ${BACKUP_SOURCE_STATE_SQL};`));
  sql('delete from auth.users;'); assert.equal(sql('select count(*) from auth.users;'),'0');
  await startAuth(newKey); phase='atomic-restore';
  const artifactNames=['roles.sql','schema.sql','auth_storage_changes.sql','data.sql','history_schema.sql','history_data.sql'];
  const request={sourceState,artifacts:artifactNames.map((name,i)=>{const text=['SELECT 1;','SELECT 1;','',restore,'SELECT 1;','SELECT pg_sleep(5);'][i];return{name,sql:text,bytes:Buffer.byteLength(text),sha256:createHash('sha256').update(text).digest('hex')};})};
  const running=createAtomicLocalProcess({container:db,owner:id}).run(request);
  // Attach rejection immediately while the independent Auth probe is running.
  const observed=running.then(value=>({value}),error=>({error}));
  const waiting=()=>sql("SELECT count(*) FROM pg_stat_activity WHERE pid<>pg_backend_pid() AND wait_event='PgSleep' AND xact_start IS NOT NULL AND query='SELECT pg_sleep(5);';")==='1';
  for(let i=0;i<30&&!waiting();i++)await wait(100);
  assert.ok(waiting());
  assert.equal(sql('select count(*) from auth.users;'),'0');
  const during=await api('/verify',{type:'magiclink',token_hash:link.data.hashed_token}); assert.equal(during.status,403);
  assert.ok(waiting()); report.checks.restoreTransactionObservedDuringProbe=true;
  report.checks.oldLinkRejectedWhileRestoreUncommitted=true;
  const outcome=await observed; if(outcome.error)throw outcome.error;
  assert.equal(outcome.value.independentCommittedReadbackMatched,true);
  report.checks.formalAtomicProcessAndIndependentReadback=true;
  const after=await api('/verify',{type:'magiclink',token_hash:link.data.hashed_token}); assert.equal(after.status,403);
  report.checks.oldLinkRejectedAfterCommit=true;
  const oldAccess=await api('/user',null,signup.data.access_token);assert.ok(oldAccess.status>=400&&oldAccess.status<500);
  const oldRefresh=await api('/token?grant_type=refresh_token',{refresh_token:signup.data.refresh_token});assert.ok(oldRefresh.status>=400&&oldRefresh.status<500);
  report.checks.oldAccessAndRefreshRejected=true;
  const login=await api('/token?grant_type=password',account);assert.equal(login.status,200);assert.equal(login.data.user.id,userId);
  report.checks.originalPasswordAndIdWorkAfterCommit=true;
  assert.ok(login.data.user.factors.some(f=>f.id===factor.data.id&&f.status==='verified'));
  const challenge=await api('/factors/'+factor.data.id+'/challenge',{},login.data.access_token);assert.equal(challenge.status,200);
  if(Math.floor(Date.now()/30000)===initialBucket)await wait(30000-Date.now()%30000+100);
  const verified=await api('/factors/'+factor.data.id+'/verify',{challenge_id:challenge.data.id,code:totpCode(factor.data.totp.secret)},login.data.access_token);assert.equal(verified.status,200);
  assert.equal(JSON.parse(Buffer.from(verified.data.access_token.split('.')[1],'base64url')).aal,'aal2');
  report.checks.sameMfaFactorFreshChallengeAal2=true;report.status='PASS';
} catch(error) { report.status='FAIL';report.phase=phase;report.reason=error.reason??'LOCAL_FIXTURE_REJECTED';process.exitCode=1; }
finally {
  docker(['rm','-f','-v',auth],null,true);docker(['rm','-f','-v',db],null,true);docker(['network','rm',net],null,true);
  const remaining=docker(['ps','-aq','--filter','label=com.comment_translator.atomic='+id],null,true);
  report.cleanupRemaining=remaining===null?'UNKNOWN':remaining?remaining.split(/\r?\n/).length:0;
  if(report.cleanupRemaining!==0){report.status='FAIL';process.exitCode=1;}
  report.ownedVolumesRemaining=ownedVolumes.filter(v=>docker(['volume','inspect',v],null,true)!==null).length;
  if(report.ownedVolumesRemaining){report.status='FAIL';process.exitCode=1;}
  console.log(JSON.stringify(report));
}
