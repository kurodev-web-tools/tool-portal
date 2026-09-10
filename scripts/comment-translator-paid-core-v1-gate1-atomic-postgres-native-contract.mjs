import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes, createHash } from 'node:crypto';
import { ATOMIC_LOCAL_DOCKER_ARGS } from './lib/comment-translator-paid-core-v1-gate1-atomic-local-process.mjs';
import { createAtomicPostgresAdapter, createAtomicPostgresNativeTransport, inspectAtomicPostgresBaseline } from './lib/comment-translator-paid-core-v1-gate1-atomic-postgres-process.mjs';
import { BACKUP_SOURCE_STATE_SQL } from './lib/comment-translator-paid-core-v1-gate1-backup-state.mjs';
const usedVolumes=new Set();
async function scenario(kind) {
const owner='ct-atomic-'+randomBytes(12).toString('hex'),name=owner+'-db',auth=owner+'-auth',password=randomBytes(24).toString('hex');
const hash=x=>createHash('sha256').update(x).digest('hex'),wait=ms=>new Promise(r=>setTimeout(r,ms));
const docker=(args,input,allow=false)=>{const r=spawnSync('docker',[...ATOMIC_LOCAL_DOCKER_ARGS,...args],{input,encoding:'utf8',windowsHide:true,timeout:30000,maxBuffer:1024*1024});if(!allow&&(r.status!==0||r.error||r.signal))throw Object.assign(Error('NATIVE_FIXTURE_FAILED'),{sqlState:r.stderr?.match(/ERROR:\s+([0-9A-Z]{5}):/)?.[1]??null});return r;};
const sql=(q,role='postgres')=>docker(['exec','-i',name,'psql','-X','-qAt','-U',role,'-d','postgres','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose'],"SET client_min_messages=warning; SET search_path=pg_catalog,public;\n"+q).stdout.trim();
let phase='setup',volumes=[],target,report={scope:'LOCAL_SYNTHETIC_ONLY',scenario:kind,checks:{}};
try {
  docker(['run','-d','--pull=never','--name',name,'--label','com.comment_translator.atomic='+owner,'--network','none','-e','POSTGRES_PASSWORD='+password,'public.ecr.aws/supabase/postgres:17.6.1.140']);
  const v=JSON.parse(docker(['inspect',name]).stdout)[0];volumes=v.Mounts.filter(m=>m.Type==='volume').map(m=>m.Name);
  assert.ok(volumes.every(volume=>!usedVolumes.has(volume)));volumes.forEach(volume=>usedVolumes.add(volume));report.checks.freshVolumes=true;
  target={containerId:v.Id,owner,imageId:v.Image,baselineSha256:'0'.repeat(64)};
  for(let i=0;i<60;i++){if(docker(['exec',name,'pg_isready','-h','127.0.0.1','-U','postgres'],null,true).status===0)break;await wait(500);}
  sql("ALTER ROLE supabase_auth_admin PASSWORD '"+password+"';",'supabase_admin');
  // Auth only initializes the cached managed schema inside the DB's isolated
  // network namespace. No port is published and no external request is sent.
  docker(['run','-d','--pull=never','--name',auth,'--label','com.comment_translator.atomic='+owner,'--network','container:'+name,
    ...Object.entries({GOTRUE_API_HOST:'127.0.0.1',GOTRUE_API_PORT:'9999',API_EXTERNAL_URL:'http://localhost:9999',GOTRUE_SITE_URL:'http://localhost:3000',
      GOTRUE_DB_DRIVER:'postgres',GOTRUE_DB_DATABASE_URL:`postgres://supabase_auth_admin:${password}@127.0.0.1:5432/postgres?sslmode=disable`,GOTRUE_JWT_SECRET:randomBytes(32).toString('hex')}).flatMap(([k,val])=>['-e',k+'='+val]),'public.ecr.aws/supabase/gotrue:v2.192.0']);
  phase='managed_init';let initialized=false;
  for(let i=0;i<60;i++){const r=docker(['exec',name,'psql','-X','-qAt','-U','postgres','-d','postgres','-c','SELECT count(*) FROM auth.schema_migrations;'],null,true);if(r.status===0&&r.stdout.trim()==='77'){initialized=true;break;}await wait(500);}
  assert.ok(initialized);docker(['rm','-f','-v',auth]);
  phase='fixture_schemas';
  sql(`CREATE SCHEMA IF NOT EXISTS storage; CREATE SCHEMA IF NOT EXISTS vault; CREATE SCHEMA IF NOT EXISTS supabase_migrations;
CREATE TABLE IF NOT EXISTS storage.objects(id integer); CREATE TABLE IF NOT EXISTS storage.buckets_vectors(id integer); CREATE TABLE IF NOT EXISTS storage.vector_indexes(id integer);
CREATE TABLE IF NOT EXISTS vault.secrets(id integer); CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations(version text PRIMARY KEY);
INSERT INTO supabase_migrations.schema_migrations SELECT lpad(i::text,14,'0') FROM generate_series(1,22) i;`,'supabase_admin');
  phase='fixture_users';sql(`
INSERT INTO auth.users(id,encrypted_password,confirmation_token,recovery_token,email_change_token_current,email_change_token_new,reauthentication_token,phone_change_token)
VALUES ('00000000-0000-4000-8000-000000000001','synthetic-hash','old','old','old','old','old','old');`);
  phase='fixture_sequence';sql("CREATE SEQUENCE public.atomic_postgres_sequence; SELECT pg_catalog.setval('public.atomic_postgres_sequence',42,true); SELECT pg_catalog.setval('auth.refresh_tokens_id_seq',42,true);");
  const sourceState=JSON.parse(sql(`SELECT ${BACKUP_SOURCE_STATE_SQL};`));
  const data=docker(['exec',name,'pg_dump','-U','postgres','-d','postgres','--data-only','--quote-all-identifiers','--table=auth.users','--table=public.atomic_postgres_sequence','--table=auth.refresh_tokens_id_seq']).stdout;
  const input={sourceState,artifacts:['roles.sql','schema.sql','auth_storage_changes.sql','data.sql','history_schema.sql','history_data.sql'].map((name,i)=>{
    const text=i===3?data:'SELECT 1;';return{name,sql:text,bytes:Buffer.byteLength(text),sha256:hash(text)};})};
  sql("DELETE FROM auth.users; SELECT pg_catalog.setval('public.atomic_postgres_sequence',8,false); SELECT pg_catalog.setval('auth.refresh_tokens_id_seq',8,false);");
  phase='baseline';const baseline=await inspectAtomicPostgresBaseline(target);assert.equal(baseline.superuser,false);target.baselineSha256=baseline.baselineSha256;
  report.checks.normalPostgresBaseline=true;
  report.checks.sequenceOwnerMember=sql("SELECT pg_has_role(current_user,relowner,'USAGE') FROM pg_class WHERE oid='auth.refresh_tokens_id_seq'::regclass;")==='t';
  report.checks.sequenceOwnerSetRole=sql("SELECT pg_has_role(current_user,relowner,'SET') FROM pg_class WHERE oid='auth.refresh_tokens_id_seq'::regclass;")==='t';
  if(kind==='sql-failure'||kind==='connection-loss'){
    input.artifacts[3].sql+='\n'+(kind==='sql-failure'?'SELECT 1/0;':'SELECT pg_terminate_backend(pg_backend_pid());');
    input.artifacts[3].bytes=Buffer.byteLength(input.artifacts[3].sql);input.artifacts[3].sha256=hash(input.artifacts[3].sql);
  }
  const transport=createAtomicPostgresNativeTransport();
  if(kind==='readback-mismatch'){let calls=0;const execute=transport.execute;transport.execute=async(...args)=>{const output=await execute(...args);return ++calls===3?'{}':output;};}
  phase='atomic_restore';
  if(kind==='success'){
    const r=await createAtomicPostgresAdapter(transport).run(input,target);
    assert.equal(r.independentCommittedReadbackMatched,true);assert.equal(r.targetReusable,false);
    assert.equal(sql('SELECT count(*) FROM auth.users;'),'1');
    assert.equal(sql("SELECT count(*) FROM auth.users WHERE encrypted_password='synthetic-hash' AND confirmation_token='' AND recovery_token='' AND phone_change_token='';"),'1');
    assert.equal(sql('SELECT last_value,is_called FROM auth.refresh_tokens_id_seq;'),'42|t');
    assert.equal(sql('SELECT last_value,is_called FROM public.atomic_postgres_sequence;'),'42|t');report.checks.nativeAuthSetvalResetReadback=true;
  }else{
    await assert.rejects(createAtomicPostgresAdapter(transport).run(input,target),e=>e.disposalRequired===true&&e.stopConfirmed===true&&e.wholeStateRollbackGuaranteed===false);
    report.checks.disposalRequired=true;
    // Restart only for isolated read-only diagnosis, never a restore retry.
    docker(['start',target.containerId]);for(let i=0;i<60;i++){if(docker(['exec',name,'pg_isready','-h','127.0.0.1','-U','postgres'],null,true).status===0)break;await wait(500);}
    assert.equal(sql('SELECT count(*) FROM auth.users;'),kind==='readback-mismatch'?'1':'0');
    assert.equal(sql('SELECT last_value,is_called FROM public.atomic_postgres_sequence;'),kind==='readback-mismatch'?'42|t':'8|f');
    assert.equal(sql('SELECT last_value,is_called FROM auth.refresh_tokens_id_seq;'),'42|t');
    report.checks.sequenceResidueObserved=true;
  }
  phase='persistent_retry_rejection';
  await assert.rejects(createAtomicPostgresAdapter(createAtomicPostgresNativeTransport()).run(input,target),e=>e.reason==='TARGET_ALREADY_ATTEMPTED');
  await assert.rejects(inspectAtomicPostgresBaseline(target),/ATOMIC_TARGET_ALREADY_ATTEMPTED/);
  assert.equal(JSON.parse(docker(['inspect',target.containerId]).stdout)[0].State.Running,true);
  report.checks.retryRejectedWithoutStoppingOtherWriter=true;report.status='PASS';
}catch(error){report={...report,status:'FAIL',phase,adapterPhase:error.phase??null,reason:error.reason??null,sqlState:error.sqlState??null};process.exitCode=1;}
finally{docker(['rm','-f','-v',auth],null,true);docker(['rm','-f','-v',name],null,true);
  const remaining=docker(['ps','-aq','--filter','label=com.comment_translator.atomic='+owner],null,true);
  report.ownedContainersRemaining=remaining.status===0?(remaining.stdout.trim()?1:0):'UNKNOWN';
  report.ownedVolumesRemaining=volumes.filter(v=>docker(['volume','inspect',v],null,true).status===0).length;
  if(report.ownedContainersRemaining!==0||report.ownedVolumesRemaining!==0){report.status='FAIL';process.exitCode=1;}}
return {...report,stageAuthority:false,gate:'NO-GO'};
}
for(const kind of ['sql-failure','connection-loss','readback-mismatch','success']){
  const result=await scenario(kind);console.log(JSON.stringify(result));if(result.status!=='PASS')break;
}
