import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes, createHash } from 'node:crypto';
import { BACKUP_SOURCE_STATE_SQL } from './lib/comment-translator-paid-core-v1-gate1-backup-state.mjs';
import { createAtomicLocalProcess, ATOMIC_LOCAL_DOCKER_ARGS } from './lib/comment-translator-paid-core-v1-gate1-atomic-local-process.mjs';
import { ATOMIC_MANAGED_SHAPE_SQL, buildAtomicRestore } from './lib/comment-translator-paid-core-v1-gate1-atomic-restore.mjs';

// Cached local image, fake values, no source backup or hosted configuration.
const owner = `ct-atomic-${randomBytes(12).toString('hex')}`, container = `${owner}-db`;
const docker = (args, input, allow = false) => {
  const r = spawnSync('docker', [...ATOMIC_LOCAL_DOCKER_ARGS,...args], { input, encoding: 'utf8', windowsHide: true, timeout: 30000, maxBuffer: 1024*1024 });
  if (!allow && (r.status !== 0 || r.error || r.signal)) throw Error('ATOMIC_NATIVE_DOCKER_FAILED');
  return r;
};
const sql = text => docker(['exec','-i',container,'psql','-X','-qAt','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1'],text).stdout.trim();
const tokenColumns = ['confirmation_token','recovery_token','email_change_token_current','email_change_token_new','reauthentication_token','phone_change_token'];
const fixture = `
CREATE SCHEMA auth; CREATE SCHEMA storage; CREATE SCHEMA vault; CREATE SCHEMA supabase_migrations;
CREATE TYPE auth.one_time_token_type AS ENUM (${tokenColumns.map(c=>`'${c}'`).join(',')});
CREATE TABLE auth.users(id integer PRIMARY KEY, encrypted_password text, ${tokenColumns.map(c=>`${c} text`).join(',')});
CREATE TABLE auth.identities(id integer PRIMARY KEY, user_id integer REFERENCES auth.users, provider text);
CREATE TABLE auth.mfa_factors(id integer PRIMARY KEY, user_id integer REFERENCES auth.users, secret text, status text);
CREATE TABLE auth.sessions(id integer PRIMARY KEY, user_id integer REFERENCES auth.users);
CREATE TABLE auth.refresh_tokens(id integer PRIMARY KEY, session_id integer REFERENCES auth.sessions ON DELETE CASCADE, token text);
CREATE TABLE auth.mfa_amr_claims(id integer PRIMARY KEY, session_id integer REFERENCES auth.sessions ON DELETE CASCADE);
CREATE TABLE auth.one_time_tokens(id integer PRIMARY KEY, user_id integer REFERENCES auth.users, token_type auth.one_time_token_type, token_hash text);
CREATE TABLE auth.flow_state(id integer PRIMARY KEY, provider_type text, authentication_method text, auth_code text);
CREATE TABLE auth.saml_relay_states(id integer PRIMARY KEY, flow_state_id integer REFERENCES auth.flow_state ON DELETE CASCADE);
CREATE TABLE auth.saml_providers(id integer PRIMARY KEY);
CREATE TABLE storage.objects(id integer); CREATE TABLE storage.buckets_vectors(id integer); CREATE TABLE storage.vector_indexes(id integer);
CREATE TABLE vault.secrets(id integer); CREATE TABLE supabase_migrations.schema_migrations(version text PRIMARY KEY);
CREATE SEQUENCE public.atomic_sequence START WITH 5 INCREMENT BY 3 CACHE 7;
CREATE TABLE public.atomic_business(id integer PRIMARY KEY, content text);
`;
const data = `INSERT INTO auth.users VALUES (1,'synthetic-password-hash',${tokenColumns.map(()=>"'synthetic-token'").join(',')});
INSERT INTO auth.users VALUES (2,'unchanged-password-hash',NULL,'',NULL,'',NULL,'');
INSERT INTO auth.identities VALUES (1,1,'email'); INSERT INTO auth.mfa_factors VALUES (1,1,'fake-secret','verified');
INSERT INTO auth.sessions VALUES (1,1); INSERT INTO auth.refresh_tokens VALUES (1,1,'old-refresh'); INSERT INTO auth.mfa_amr_claims VALUES(1,1);
${tokenColumns.map((c,i)=>`INSERT INTO auth.one_time_tokens VALUES(${i+1},1,'${c}','fake-hash');`).join('\n')}
INSERT INTO auth.flow_state VALUES (1,'email','magiclink','old-code'),(2,'unrelated','oauth','preserved-code');
INSERT INTO public.atomic_business VALUES(1,'preserved-business');
INSERT INTO public.atomic_business VALUES(2,convert_from(decode('${Buffer.from('日本語😀\r\n\\.\tCOMMIT;\n\\! literal').toString('hex')}','hex'),'UTF8'));`;
const history = "INSERT INTO supabase_migrations.schema_migrations SELECT lpad(i::text,14,'0') FROM generate_series(1,22) i;";
let nativeData=data, nativeHistory=history;
const hash = x => createHash('sha256').update(x).digest('hex');
const request = sourceState => ({ sourceState, artifacts: ['roles.sql','schema.sql','auth_storage_changes.sql','data.sql','history_schema.sql','history_data.sql'].map((name,i)=>{
  const body = ['SELECT 1;', 'SELECT 1;', '', nativeData, 'SELECT 1;', nativeHistory][i];
  return {name,sql:body,bytes:Buffer.byteLength(body),sha256:hash(body)};
}) });
let phase = 'setup'; const results = {}; let ownedVolumes=[];
try {
  // Plain PG image with a named local superuser avoids unrelated managed data.
  docker(['run','-d','--pull=never','--name',container,'--label',`com.comment_translator.atomic=${owner}`,'--network','none',
    '-e','POSTGRES_USER=supabase_admin','-e',`POSTGRES_PASSWORD=${randomBytes(24).toString('hex')}`,'postgres:17']);
  ownedVolumes=JSON.parse(docker(['inspect','--format','{{json .Mounts}}',container]).stdout).filter(m=>m.Type==='volume').map(m=>m.Name);
  for (let i=0;i<60;i++) {
    if(docker(['exec',container,'pg_isready','-h','127.0.0.1','-U','supabase_admin','-d','postgres'],undefined,true).status===0)break;
    await new Promise(r=>setTimeout(r,250));
  }
  sql(fixture + data + history + "SELECT setval('public.atomic_sequence',42,true);");
  const dump = schemas => docker(['exec',container,'pg_dump','-U','supabase_admin','-d','postgres','--data-only','--quote-all-identifiers',...schemas.map(s=>'--schema='+s)]).stdout;
  nativeData=dump(['auth','public','storage','vault']); nativeHistory=dump(['supabase_migrations']);
  assert.ok(nativeData.includes('COPY '));assert.ok(nativeData.includes('pg_catalog.setval('));
  results.nativePgDumpCopyAndSetval=true;
  results.managedShapeSha256 = sql(`SELECT ${ATOMIC_MANAGED_SHAPE_SQL};`);
  const sourceState = JSON.parse(sql(`SELECT ${BACKUP_SOURCE_STATE_SQL};`));
  const businessDigest=sql("SELECT md5(string_agg(content,'' ORDER BY id)) FROM public.atomic_business;");
  const empty = () => sql(`TRUNCATE auth.users,auth.identities,auth.mfa_factors,auth.sessions,auth.refresh_tokens,auth.mfa_amr_claims,auth.one_time_tokens,auth.flow_state,auth.saml_relay_states,public.atomic_business,supabase_migrations.schema_migrations; SELECT setval('public.atomic_sequence',8,false);`);
  const sequenceState = () => sql('SELECT last_value,is_called FROM public.atomic_sequence;');
  const restart = async () => {
    docker(['start',container]);
    for(let i=0;i<60;i++){if(docker(['exec',container,'pg_isready','-h','127.0.0.1','-U','supabase_admin'],undefined,true).status===0)return;await new Promise(r=>setTimeout(r,250));}
    throw Error('ATOMIC_NATIVE_RESTART_FAILED');
  };
  const append = (r, index, extra) => {
    const a=r.artifacts[index]; a.sql+='\n'+extra; a.bytes=Buffer.byteLength(a.sql); a.sha256=hash(a.sql); return r;
  };
  empty();
  phase = 'success';
  const result = await createAtomicLocalProcess({container,owner}).run(request(sourceState));
  assert.equal(result.status,'ATOMIC_LOCAL_RESTORE_RESET_OBSERVED');
  assert.equal(sql('SELECT count(*) FROM auth.sessions;'),'0');
  assert.equal(sql('SELECT count(*) FROM auth.one_time_tokens;'),'0');
  assert.equal(sql("SELECT encrypted_password FROM auth.users WHERE id=1;"),'synthetic-password-hash');
  assert.equal(sql('SELECT count(*) FROM auth.mfa_factors;'),'1');
  assert.equal(sql('SELECT count(*) FROM auth.flow_state;'),'1');
  assert.equal(sequenceState(),'42|t');results.nativeSetvalCommitted=true;
  assert.equal(sql("SELECT md5(string_agg(content,'' ORDER BY id)) FROM public.atomic_business;"),businessDigest);
  results.copyUnicodeAndEscapesPreserved=true;
  results.success = true;
  empty(); phase = 'source-mismatch';
  const bad = request({...sourceState,authUsers:3});
  await assert.rejects(createAtomicLocalProcess({container,owner}).run(bad),/ATOMIC_LOCAL_PROCESS_REJECTED/);
  // stderr deliberately stops the owned DB; restart before independent rollback read.
  await restart();
  assert.equal(sql('SELECT count(*) FROM auth.users;'),'0'); results.sourceMismatchRollback = true;
  assert.equal(sequenceState(),'8|f');
  for(const [name, statement] of [['midRestoreFailure','SELECT 1/0;'],['connectionLoss','SELECT pg_terminate_backend(pg_backend_pid());']]) {
    phase=name;
    await assert.rejects(createAtomicLocalProcess({container,owner}).run(append(request(sourceState),3,statement)),/ATOMIC_LOCAL_PROCESS_REJECTED/);
    await restart(); assert.equal(sql('SELECT count(*) FROM auth.users;'),'0'); results[name]=true;
    assert.equal(sequenceState(),'8|f');
  }
  phase='unknownRule';
  sql("CREATE RULE atomic_bad_reset AS ON UPDATE TO auth.users DO ALSO UPDATE public.atomic_business SET content='tampered';");
  await assert.rejects(createAtomicLocalProcess({container,owner}).run(request(sourceState)),error=>error.reason==='ATOMIC_RULE_UNSUPPORTED');
  await restart(); assert.equal(sql('SELECT count(*) FROM auth.users;'),'0');
  sql('DROP RULE atomic_bad_reset ON auth.users;'); results.unknownRuleRollback=true;
  phase='resetDeltaFailure';
  // Mutation test of the detector. The public process API never accepts a
  // modified reset script; execute this corrupt synthetic SQL directly here.
  const corrupt=buildAtomicRestore(request(sourceState)).sql.replace('DO $ct$ BEGIN IF pg_temp.ct_atomic_fingerprint(false)',"UPDATE public.atomic_business SET content='tampered';\nDO $ct$ BEGIN IF pg_temp.ct_atomic_fingerprint(false)");
  const rejected=docker(['exec','-i',container,'psql','-X','-qAt','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1'],corrupt,true);
  assert.notEqual(rejected.status,0);assert.match(rejected.stderr,/ATOMIC_DELTA_MISMATCH/);
  assert.equal(sql('SELECT count(*) FROM auth.users;'),'0');results.resetDeltaFailure=true;
  phase='timeout';
  await assert.rejects(createAtomicLocalProcess({container,owner,timeoutMs:1000}).run(append(request(sourceState),3,'SELECT pg_sleep(30);')),/ATOMIC_LOCAL_PROCESS_REJECTED/);
  await restart(); assert.equal(sql('SELECT count(*) FROM auth.users;'),'0'); results.timeoutRollback=true;
  phase='cancel';
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),1000);
  try { await assert.rejects(createAtomicLocalProcess({container,owner}).run(append(request(sourceState),3,'SELECT pg_sleep(30);'),{signal:controller.signal}),/ATOMIC_LOCAL_PROCESS_REJECTED/); }
  finally {clearTimeout(timer);}
  await restart(); assert.equal(sql('SELECT count(*) FROM auth.users;'),'0'); results.cancelRollback=true;
  phase='unknownFlow';
  await assert.rejects(createAtomicLocalProcess({container,owner}).run(append(request(sourceState),3,"UPDATE auth.flow_state SET authentication_method='future' WHERE id=1;")),error=>error.reason==='ATOMIC_FLOW_UNSUPPORTED');
  await restart(); assert.equal(sql('SELECT count(*) FROM auth.users;'),'0'); results.unknownFlowRollback=true;
  phase='unknownManagedSchema';
  sql(data+history+'ALTER TABLE auth.users ADD COLUMN future_token text;');
  const unknownState=JSON.parse(sql(`SELECT ${BACKUP_SOURCE_STATE_SQL};`)); empty();
  await assert.rejects(createAtomicLocalProcess({container,owner}).run(request(unknownState)),error=>error.reason==='ATOMIC_MANAGED_SHAPE_UNSUPPORTED');
  await restart(); assert.equal(sql('SELECT count(*) FROM auth.users;'),'0'); results.unknownManagedSchemaRollback=true;
  phase='sequenceOwnership';
  sql('CREATE ROLE atomic_limited; GRANT SELECT,UPDATE ON SEQUENCE public.atomic_sequence TO atomic_limited;');
  const denied=docker(['exec','-i',container,'psql','-X','-qAt','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1'],
    'SET ROLE atomic_limited;\n'+buildAtomicRestore(request(unknownState)).sql,true);
  assert.notEqual(denied.status,0);assert.match(denied.stderr,/must be owner/);
  assert.equal(sql('SELECT count(*) FROM auth.users;'),'0');assert.equal(sequenceState(),'8|f');results.sequenceOwnershipFailsClosed=true;
} catch (error) { process.stderr.write(JSON.stringify({status:'FAIL',phase,reason:error.reason??'FIXTURE_REJECTED'})+'\n'); process.exitCode=1; }
finally {
  docker(['rm','-f','-v',container],undefined,true);
  const remaining=docker(['ps','-aq','--filter',`label=com.comment_translator.atomic=${owner}`],undefined,true);
  if(remaining.status!==0||remaining.stdout.trim()){process.stderr.write('ATOMIC_NATIVE_CLEANUP_UNCONFIRMED\n');process.exitCode=1;}
  if(ownedVolumes.some(v=>docker(['volume','inspect',v],undefined,true).status===0)){process.stderr.write('ATOMIC_NATIVE_VOLUME_CLEANUP_UNCONFIRMED\n');process.exitCode=1;}
}
if(!process.exitCode)process.stdout.write(JSON.stringify({status:'PASS',scope:'LOCAL_SYNTHETIC_ONLY',checks:results,cleanupRemaining:0,stageAuthority:false,gate:'NO-GO'})+'\n');
