import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const lit=v=>"'"+String(v).replaceAll("'","''")+"'";

// Synthetic native fixtures only. The caller supplies an already inspected,
// exclusively owned network-none namespace; there is no Hosted URL parameter.
export async function startRehearsalLocalServices({run,docker,inspect,sql,client,nodeImage,password,signingKey,serviceToken,anonToken,onPhase,onObservation}){
 const request=(port,path,token,body,method)=>{
  const code="let s='';process.stdin.on('data',b=>s+=b);process.stdin.on('end',async()=>{try{const q=JSON.parse(s),r=await fetch('http://127.0.0.1:'+q.port+q.path,{method:q.method??(q.body?'POST':'GET'),redirect:'manual',headers:{'Content-Type':'application/json',Authorization:'Bearer '+q.token},...(q.body?{body:JSON.stringify(q.body)}:{}),signal:AbortSignal.timeout(q.port===4000?10000:4000)});let data;try{data=await r.json();}catch{data=null;}process.stdout.write(JSON.stringify({status:r.status,data}));}catch{process.exitCode=2;}});";
  return JSON.parse(docker(['exec','-i',client,'node','-e',code],JSON.stringify({port,path,token,body,method})).stdout);
 };
 const storageApi=(path,token,body,method)=>request(5000,path,token,body,method);
 const rtApi=(path,body,method)=>request(4000,path,serviceToken,body,method);
 const ready=async(id,probe)=>{for(let i=0;i<60;i++){assert.equal(inspect(id).State.Running,true);try{if(probe())return;}catch{}await wait(500);}throw Error('LOCAL_SERVICE_TIMEOUT');};
 const result={storagePositiveControl:false,realtimePositiveControl:false};

 onPhase('storage_initialize');sql('ALTER ROLE supabase_storage_admin PASSWORD '+lit(password)+';','supabase_admin');
 const databaseURL='postgres://supabase_storage_admin:'+password+'@127.0.0.1:5432/postgres?sslmode=disable';
 const storageEnv={DATABASE_URL:databaseURL,DB_INSTALL_ROLES:'false',DB_ALLOW_MIGRATION_REFRESH:'false',VECTOR_STORE_MIGRATIONS_ENABLED:'false',PG_QUEUE_ENABLED:'false',STORAGE_BACKEND:'file',FILE_STORAGE_BACKEND_PATH:'/var/lib/storage'};
 const initializer=run('storage-init',nodeImage,{...storageEnv,MULTI_TENANT:'true'},['--tmpfs','/var/lib/storage','--entrypoint','node'],['-e',"const m=require('./dist/internal/database/migrations/migrate.js');m.runMigrationsOnTenant({databaseUrl:process.env.DATABASE_URL,waitForLock:true}).then(()=>process.exit(0)).catch(()=>process.exit(2));"]);
 let initialized=false;for(let i=0;i<60;i++){const state=inspect(initializer).State;if(!state.Running){assert.equal(state.ExitCode,0);initialized=true;break;}await wait(500);}assert.equal(initialized,true);
 onPhase('storage_start');const storage=run('storage',nodeImage,{...storageEnv,MULTI_TENANT:'false',AUTH_JWT_SECRET:signingKey,ANON_KEY:anonToken,SERVICE_KEY:serviceToken,SERVER_HOST:'127.0.0.1',SERVER_PORT:'5000',TENANT_ID:'local-fixture',REGION:'local',GLOBAL_S3_BUCKET:'local-fixture',ICEBERG_ENABLED:'false',S3_PROTOCOL_ENABLED:'false'},['--tmpfs','/var/lib/storage']);
 await ready(storage,()=>storageApi('/status',serviceToken).status===200);
 assert.equal(sql("SELECT count(*) FROM pg_policies WHERE schemaname='storage';"),'0');
 onPhase('storage_positive');assert.equal(storageApi('/bucket',serviceToken,{id:'fixture-private',name:'fixture-private',public:false}).status,200);
 assert.equal(storageApi('/object/fixture-private/control.json',serviceToken,{fixture:true}).status,200);
 const signed=storageApi('/object/sign/fixture-private/control.json',serviceToken,{expiresIn:3600});assert.equal(signed.status,200);assert.ok(signed.data?.signedURL?.startsWith('/object/sign/'));
 const signedPositive=storageApi(signed.data.signedURL,anonToken);assert.equal(signedPositive.status,200);assert.deepEqual(signedPositive.data,{fixture:true});
 onPhase('storage_upload_sign');const uploadSign=storageApi('/object/upload/sign/fixture-private/upload.json',serviceToken,{});assert.equal(uploadSign.status,200);assert.ok(uploadSign.data?.url?.startsWith('/object/upload/sign/'));
 assert.equal(storageApi('/object/fixture-private',serviceToken,{prefixes:['control.json']},'DELETE').status,200);
 assert.equal(storageApi('/bucket/fixture-private',serviceToken,null,'DELETE').status,200);
 result.storagePositiveControl=true;

 onPhase('realtime_initialize');sql('ALTER ROLE supabase_admin PASSWORD '+lit(password)+';','supabase_admin');
 sql('CREATE DATABASE ct_rehearsal_realtime OWNER supabase_admin;','supabase_admin');
 sql('CREATE SCHEMA _realtime AUTHORIZATION supabase_admin;','supabase_admin','ct_rehearsal_realtime');
 const realtime=run('realtime','public.ecr.aws/supabase/realtime:v2.112.1',{
  DB_HOST:'127.0.0.1',DB_PORT:'5432',DB_NAME:'ct_rehearsal_realtime',DB_USER:'supabase_admin',DB_PASSWORD:password,DB_USER_REALTIME:'supabase_admin',DB_PASS_REALTIME:password,DB_SSL:'false',DB_IP_VERSION:'ipv4',DB_AFTER_CONNECT_QUERY:'SET search_path TO _realtime',DB_ENC_KEY:randomBytes(8).toString('hex'),API_JWT_SECRET:signingKey,METRICS_JWT_SECRET:signingKey,SECRET_KEY_BASE:randomBytes(64).toString('hex'),APP_NAME:'realtime',PORT:'4000',REGION:'us-east-1',SEED_SELF_HOST:'false',SELF_HOST_TENANT_NAME:'127',RUN_JANITOR:'false',METRICS_PUSHER_ENABLED:'false',ENABLE_ERL_CRASH_DUMP:'false',ERL_AFLAGS:'+S 2:2',LOG_LEVEL:'error',
 });
 // The image briefly serves HTTP during initialization, then execs its final
 // server. A bootstrap health response is not readiness for the socket control.
 onPhase('realtime_start');await ready(realtime,()=>{const boot=docker(['logs','--tail','12',realtime],null,true);return (boot.stdout+boot.stderr).includes('+ exec /app/bin/server')&&rtApi('/healthcheck').status===200;});
 onPhase('realtime_tenant_create');
 assert.equal(rtApi('/api/tenants/127',{tenant:{name:'127',external_id:'127',jwt_secret:signingKey,extensions:[{type:'postgres_cdc_rls',settings:{db_name:'postgres',db_host:'127.0.0.1',db_port:'5432',db_user:'supabase_admin',db_password:password,db_user_realtime:'supabase_admin',db_pass_realtime:password,region:'us-east-1',poll_interval_ms:100,poll_max_record_bytes:1048576,ssl_enforced:false}}]}},'PUT').status,201);
 assert.equal(rtApi('/api/tenants/127').status,200);
 const rtProbeSource=fs.readFileSync(new URL('./comment-translator-paid-core-v1-gate1-rehearsal-realtime-probe.cjs',import.meta.url),'utf8');
 const realtimeProbe=closedOnly=>{const outcome=docker(['exec','-i',client,'node','-e',rtProbeSource],JSON.stringify({token:serviceToken,closedOnly}),true);const r=JSON.parse(outcome.stdout);if(outcome.status!==0||r.status!=='PASS'){
  const logs=docker(['logs','--tail','80',realtime],null,true),raw=logs.stdout+logs.stderr;
  onObservation({service:'realtime',probe:r,errorClasses:['TenantNotFound','RealtimeDisabledForTenant','InvalidJWTToken','MalformedJWT','ErrorConnectingToWebsocket','UnableToConnectToTenantDatabase','InvalidAuthorizationToken'].filter(value=>raw.includes(value))});
  onPhase('realtime_probe_'+(['positive_socket','positive_join','positive_broadcast','http_positive','existing_socket','reconnect','suspended_http'].includes(r.phase)?r.phase:'failed'));throw Error('REALTIME_PROBE_REJECTED');}return r;};
 onPhase('realtime_probe');
 result.realtime=realtimeProbe(false);result.realtimePositiveControl=true;
 const inventory=()=>{
  assert.equal(inspect(storage).State.Running,true);assert.equal(inspect(realtime).State.Running,true);
  const i=JSON.parse(sql("SELECT json_build_object('buckets',(SELECT count(*) FROM storage.buckets),'objects',(SELECT count(*) FROM storage.objects),'storagePolicies',(SELECT count(*) FROM pg_policies WHERE schemaname='storage'),'publicationTables',(SELECT count(*) FROM pg_publication_tables),'realtimePolicies',(SELECT count(*) FROM pg_policies WHERE schemaname='realtime'));"));
  // Keep and fingerprint the native managed message publication. Suspension is
  // required and probed for all websocket and HTTP paths below.
  const publications=JSON.parse(sql("SELECT jsonb_agg(jsonb_build_array(schemaname,tablename) ORDER BY schemaname,tablename) FROM pg_publication_tables;"));
  onObservation({service:'inventory',...i,publicationRelations:publications});
  assert.equal(publications.length,5);assert.ok(publications.every(([schema,table])=>schema==='realtime'&&/^messages(?:_\d{4}_\d{2}_\d{2})?$/.test(table)));
  assert.deepEqual(i,{buckets:0,objects:0,storagePolicies:0,publicationTables:5,realtimePolicies:0});
  assert.equal(sql("SELECT suspend FROM _realtime.tenants WHERE external_id='127';",'supabase_admin','ct_rehearsal_realtime'),'t');return i;
 };
 inventory();
 const probeStorage=tokens=>{
  const outcomes=[];inventory();
  for(const {kind,token}of tokens){
   const routes=[
    ['bucket-create','/bucket',{id:'blocked',name:'blocked',public:false},'POST'],
    ['object-upload','/object/fixture-private/blocked.json',{fixture:true},'POST'],
    ['object-update','/object/fixture-private/control.json',{fixture:true},'PUT'],
    ['object-delete','/object/fixture-private',{prefixes:['control.json']},'DELETE'],
    ['object-list','/object/list/fixture-private',{prefix:''},'POST'],
    ['object-move','/object/move',{bucketId:'fixture-private',sourceKey:'control.json',destinationKey:'moved.json'},'POST'],
    ['object-copy','/object/copy',{bucketId:'fixture-private',sourceKey:'control.json',destinationKey:'copied.json'},'POST'],
    ['object-download','/object/authenticated/fixture-private/control.json',null,'GET'],
    ['public-download','/object/public/fixture-private/control.json',null,'GET'],
    ['sign-download','/object/sign/fixture-private/control.json',{expiresIn:60},'POST'],
    ['sign-upload','/object/upload/sign/fixture-private/blocked.json',{},'POST'],
    ['signed-download',signed.data.signedURL,null,'GET'],
    ['signed-upload',uploadSign.data.url,{fixture:true},'PUT'],
   ];
   const list=storageApi('/bucket',token);onObservation({service:'storage',kind,route:'bucket-list',status:list.status,code:list.data?.code??'EMPTY'});if(kind==='old-access'){assert.equal(list.status,400);assert.equal(list.data?.code,'AccessDenied');}else{assert.equal(list.status,200);assert.deepEqual(list.data,[]);}outcomes.push({kind,route:'bucket-list',status:list.status,code:list.data?.code??'EMPTY'});
   for(const [route,path,body,method]of routes){
    const r=storageApi(path,token,body,method),observation={kind,route,status:r.status,code:r.data?.code??null};outcomes.push(observation);onObservation({service:'storage',...observation});
    // Empty listing/removal can return 200 with no affected rows. This is
    // recorded as a no-op, never as a denied request or a successful write.
    // Both the empty inventory and the caller's full-state comparison are
    // mandatory; a nonempty result or any state delta still rejects the run.
    if(['object-delete','object-list'].includes(route)&&r.status===200){assert.deepEqual(r.data,[]);observation.code='EMPTY_NO_ROWS';continue;}
    assert.equal(r.status,400);assert.ok(['AccessDenied','NoSuchKey','NoSuchBucket','InvalidJWT'].includes(r.data?.code));
   }
  }
  inventory();return outcomes;
 };
 return {result,inventory,probeStorage,probeRealtime:()=>{inventory();return realtimeProbe(true);}};
}
