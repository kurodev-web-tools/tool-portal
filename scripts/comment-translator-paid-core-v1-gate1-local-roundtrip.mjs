import { BACKUP_TABLE_DEFAULTS_SQL as defaultsSql, prepareBackupSchemaWithDefaults as prepareLocalRoundTripSchema } from './lib/comment-translator-paid-core-v1-gate1-backup-default-acl.mjs';
export { prepareBackupSchemaWithDefaults as prepareLocalRoundTripSchema } from './lib/comment-translator-paid-core-v1-gate1-backup-default-acl.mjs';
// Internal child of the owned local replay. No remote URL, credential or SQL input.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { BACKUP_SOURCE_STATE_SQL, BACKUP_DATA_EXCLUDED_SCHEMAS, BACKUP_DATA_EXCLUDED_TABLES, validateLocalReplaySourceState } from './lib/comment-translator-paid-core-v1-gate1-backup-state.mjs';
import { transformRestoreRoles, transformRestoreSchema } from './lib/comment-translator-paid-core-v1-gate1-restore-sql.mjs';
import { createRehearsalRestore } from './lib/comment-translator-paid-core-v1-gate1-rehearsal-restore.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const docker = 'C:/Program Files/Docker/Docker/resources/bin/docker.exe';
const hostArgs = ['--host', 'npipe:////./pipe/dockerDesktopLinuxEngine'];
const environment = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, WINDIR: process.env.SystemRoot };
const imageReference = 'public.ecr.aws/supabase/postgres:17.6.1.140';
const names = ['roles.sql','schema.sql','auth_storage_changes.sql','data.sql','history_schema.sql','history_data.sql'];
const schemaExcluded = 'information_schema pg_* _analytics _realtime _supavisor auth etl extensions pgbouncer realtime storage supabase_functions supabase_migrations cron dbdev graphql graphql_public net pgmq pgsodium pgsodium_masks pgtle repack tiger tiger_data timescaledb_* _timescaledb_* topology vault'.split(' ');
const psql = ['psql','-X','-qAt','--no-password','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-U','postgres','-d','postgres'];
const securitySql = BACKUP_SOURCE_STATE_SQL.slice(0,BACKUP_SOURCE_STATE_SQL.indexOf('\nSELECT jsonb_build_object(')) + `
SELECT coalesce(jsonb_agg(jsonb_build_object(
 'kind',row->>0,
 'scope',CASE WHEN (CASE WHEN row->>0='default' THEN row->>2 ELSE row->>1 END) IN ('public','auth','storage','supabase_migrations','supabase_functions','cron') THEN CASE WHEN row->>0='default' THEN row->>2 ELSE row->>1 END ELSE 'other' END,
 'key',encode(sha256(convert_to((SELECT jsonb_agg(v ORDER BY ord) FROM jsonb_array_elements(row) WITH ORDINALITY e(v,ord) WHERE ord<=CASE row->>0 WHEN 'relation' THEN 3 WHEN 'schema' THEN 2 ELSE 4 END)::text,'UTF8')),'hex'),
 'digest',encode(sha256(convert_to(row::text,'UTF8')),'hex'),
 'aclCount',CASE WHEN jsonb_typeof(row->-1)='array' THEN jsonb_array_length(row->-1) ELSE NULL END
) ORDER BY row::text COLLATE "C"),'[]'::jsonb) FROM security_rows)`;
const stateSql = `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SET LOCAL search_path=pg_catalog,public; SET LOCAL row_security=off; SELECT json_build_object('state',${BACKUP_SOURCE_STATE_SQL},'security',${securitySql}); COMMIT;`;
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value==='object' ? Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])) : value;

const reject = code => { throw Error(code); };
// The internal child accepts only the parent-owned local scratch and project.
export function validateLocalRoundTripRequest(request, root = process.cwd()) {
  if (!request || Object.keys(request).sort().join(',') !== 'containerId,mode,projectId,workDirectory' ||
      !['capture','restore'].includes(request.mode) || !/^[a-f0-9]{64}$/.test(request.containerId) ||
      !/^gate1-ct-paid-v1-a3-[a-z0-9]+$/.test(request.projectId) || typeof request.workDirectory !== 'string') reject('LOCAL_ROUNDTRIP_INPUT');
  const work = path.resolve(request.workDirectory);
  if (path.dirname(work).toLowerCase() !== path.resolve(root,'.tmp','gate1-local-replay').toLowerCase() ||
      !/^gate1-cli-atomicity-[a-zA-Z0-9]+$/.test(path.basename(work))) reject('LOCAL_ROUNDTRIP_SCOPE');
  return work;
}
export async function runLocalRoundTrip(request) {
  if (process.platform !== 'win32') reject('LOCAL_ROUNDTRIP_PLATFORM');
  const work = validateLocalRoundTripRequest(request);
  if (fs.realpathSync.native(work).toLowerCase() !== work.toLowerCase() || fs.lstatSync(work).isSymbolicLink()) reject('LOCAL_ROUNDTRIP_REPARSE');
  const config = fs.readFileSync(path.join(work,'supabase','config.toml'),'utf8');
  if (config.match(/^project_id\s*=\s*"([^"]+)"/m)?.[1] !== request.projectId) reject('LOCAL_ROUNDTRIP_PROJECT');
  const invoke = (args, input, limit = 32*1024*1024) => {
    const r=spawnSync(docker,[...hostArgs,...args],{input,env:environment,shell:false,windowsHide:true,timeout:45000,maxBuffer:limit});
    if(r.error || r.signal || r.status!==0 || !Buffer.isBuffer(r.stdout) || !Buffer.isBuffer(r.stderr) || r.stderr.length) {
      const error=Error('LOCAL_ROUNDTRIP_NATIVE');error.native={exitCode:Number.isInteger(r.status)?r.status:null,stderrBytes:r.stderr?.length??0,sqlState:r.stderr?.toString().match(/ERROR:\s+([0-9A-Z]{5}):/)?.[1]??null};throw error;
    }
    return r.stdout;
  };
  const expectedImage=invoke(['image','inspect','--format','{{.Id}}',imageReference],undefined,4096).toString().trim();
  if(!/^sha256:[a-f0-9]{64}$/.test(expectedImage))reject('LOCAL_ROUNDTRIP_IMAGE');
  const own = () => {
    const meta=JSON.parse(invoke(['inspect','--format','{{json .}}',request.containerId],undefined,65536));
    if(meta.Id!==request.containerId || meta.Image!==expectedImage || meta.State?.Running!==true ||
       meta.Config?.Labels?.['com.supabase.cli.project']!==request.projectId ||
       meta.Config?.Labels?.['com.docker.compose.project']!==request.projectId || meta.HostConfig?.Privileged)reject('LOCAL_ROUNDTRIP_OWNERSHIP');
  };
  const sql = (text,atomic=false) => {own();return invoke(['exec','-i',request.containerId,...psql,...(atomic?['--single-transaction','--file=-']:[])],Buffer.from(text));};
  const directory=path.join(work,'six-file-roundtrip');
  if(request.mode==='capture'){
    own();
    const roles=transformRestoreRoles(invoke(['exec',request.containerId,'pg_dumpall','--roles-only','--role=postgres','--quote-all-identifiers','--no-role-passwords','--no-comments','--no-password','-U','postgres']).toString()).sql;
    const child=spawn(docker,[...hostArgs,'exec','-i',request.containerId,...psql],{env:environment,windowsHide:true,stdio:['pipe','pipe','pipe']});
    let output='',stderr=0,resolveReady,rejectReady,timer;
    const ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});
    const closed=new Promise(resolve=>child.on('close',code=>{rejectReady(Error('LOCAL_ROUNDTRIP_EXPORTER_CLOSED'));resolve(code);}));
    child.on('error',()=>rejectReady(Error('LOCAL_ROUNDTRIP_EXPORTER_FAILED')));
    for(const stream of [child.stdin,child.stdout,child.stderr])stream.on('error',()=>rejectReady(Error('LOCAL_ROUNDTRIP_STREAM')));
    child.stdout.on('data',bytes=>{output+=bytes.toString('utf8');if(Buffer.byteLength(output)>1048576)rejectReady(Error('LOCAL_ROUNDTRIP_LIMIT'));else if(output.endsWith('\n')){try{resolveReady(JSON.parse(output));}catch{rejectReady(Error('LOCAL_ROUNDTRIP_JSON'));}}});
    child.stderr.on('data',bytes=>{stderr+=bytes.length;rejectReady(Error('LOCAL_ROUNDTRIP_STDERR'));});
    const timeout=new Promise((resolve,reject)=>{timer=setTimeout(()=>{child.kill();reject(Error('LOCAL_ROUNDTRIP_TIMEOUT'));},120000);});
    let state,dumps,security,defaults;
    try{
      child.stdin.write(`BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SET LOCAL search_path=pg_catalog,public; SET LOCAL row_security=off; SELECT json_build_object('snapshot',pg_export_snapshot(),'state',${BACKUP_SOURCE_STATE_SQL},'security',${securitySql},'defaults',${defaultsSql});\n`);
      const observed=await Promise.race([ready,timeout]);state=validateLocalReplaySourceState(observed.state);security=observed.security;defaults=observed.defaults;
      if(!/^[A-Fa-f0-9]{8}-[A-Fa-f0-9]{8}-[1-9][0-9]*$/.test(observed.snapshot))reject('LOCAL_ROUNDTRIP_SNAPSHOT');
      const filters=[...BACKUP_DATA_EXCLUDED_SCHEMAS.flatMap(s=>['--exclude-schema',s]),...BACKUP_DATA_EXCLUDED_TABLES.flatMap(s=>['--exclude-table',s]),'--schema','*'];
      const recipes=[['--schema-only',...schemaExcluded.flatMap(s=>['--exclude-schema',s])],['--data-only',...filters],['--schema-only','--schema=supabase_migrations'],['--data-only','--schema=supabase_migrations']];
      dumps=recipes.map(recipe=>{own();return invoke(['exec',request.containerId,'pg_dump','-U','postgres','--role=postgres','--quote-all-identifiers','--no-password','--snapshot',observed.snapshot,...recipe]);});
      child.stdin.end('COMMIT;\n');if(await Promise.race([closed,timeout])!==0||stderr)reject('LOCAL_ROUNDTRIP_EXPORTER_CLOSE');
    }finally{clearTimeout(timer);if(child.exitCode===null){child.kill();child.stdin.destroy();child.stdout.destroy();child.stderr.destroy();child.unref();}}
    const envelope=s=>'SET session_replication_role = replica;\n'+s+'\nRESET ALL;\n';
    const contents=[roles,prepareLocalRoundTripSchema(transformRestoreSchema(dumps[0].toString()).sql,defaults),'',envelope(dumps[1].toString()),dumps[2].toString(),envelope(dumps[3].toString())];
    fs.mkdirSync(directory);
    const artifacts=contents.map((text,i)=>{const file=path.join(directory,names[i]);fs.writeFileSync(file,text,{flag:'wx'});if(hash(fs.readFileSync(file))!==hash(text))reject('LOCAL_ROUNDTRIP_WRITE');return{name:names[i],bytes:Buffer.byteLength(text),sha256:hash(text)};});
    fs.writeFileSync(path.join(directory,'capture.json'),JSON.stringify({projectId:request.projectId,image:expectedImage,state,security,artifacts}),{flag:'wx'});
    return{status:'LOCAL_SIX_FILE_CAPTURED',historyCount:state.historyCount,snapshotDumpCount:4,artifacts,stageAuthority:false};
  }
  if(fs.realpathSync.native(directory).toLowerCase()!==directory.toLowerCase())reject('LOCAL_ROUNDTRIP_ARTIFACT_SCOPE');
  const captured=JSON.parse(fs.readFileSync(path.join(directory,'capture.json'),'utf8'));
  if(captured.projectId!==request.projectId||captured.image!==expectedImage||captured.artifacts.length!==6)reject('LOCAL_ROUNDTRIP_BINDING');
  const artifacts=captured.artifacts.map((a,i)=>{if(a.name!==names[i])reject('LOCAL_ROUNDTRIP_ORDER');const file=path.join(directory,a.name);if(fs.lstatSync(file).isSymbolicLink())reject('LOCAL_ROUNDTRIP_ARTIFACT_LINK');return{...a,sql:fs.readFileSync(file,'utf8')};});
  // The reset target must have no application tables or migration rows before
  // removing only its empty CLI-created history schema for history_schema.sql.
  const clean=JSON.parse(sql("SELECT json_build_object('historyExists',to_regclass('supabase_migrations.schema_migrations') IS NOT NULL, 'historySchemaExists',EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='supabase_migrations'), 'publicTables',(SELECT count(*) FROM pg_tables WHERE schemaname='public'));"));
  if(clean.publicTables!==0)reject('LOCAL_ROUNDTRIP_TARGET_NOT_EMPTY');
  if(clean.historyExists){
    const historyCount=Number(sql('SELECT count(*) FROM supabase_migrations.schema_migrations;').toString().trim());
    if(historyCount!==0)reject('LOCAL_ROUNDTRIP_TARGET_HISTORY_NOT_EMPTY');
    sql('SET LOCAL client_min_messages=warning; DROP SCHEMA supabase_migrations CASCADE;',true);
  }else if(clean.historySchemaExists)reject('LOCAL_ROUNDTRIP_UNKNOWN_HISTORY_SCHEMA');
  let comparison=null,result;
  try { result=await createRehearsalRestore({localReplay:true,execute:async a=>{const bytes=sql(a.sql,true);return{exitCode:0,signal:null,captureComplete:true,stdoutBytes:bytes.length,stderrBytes:0,onErrorStop:true,transaction:true};},readState:async()=>{
    const observed=JSON.parse(sql(stateSql));
    const fields=Object.keys(captured.state).filter(key=>JSON.stringify(canonical(captured.state[key]))!==JSON.stringify(canonical(observed.state[key])));
    const before=new Map(captured.security.map(row=>[row.key,row]));const after=new Map(observed.security.map(row=>[row.key,row]));
    const changed=[...new Set([...before.keys(),...after.keys()])].filter(key=>before.get(key)?.digest!==after.get(key)?.digest);
    comparison={fields,securityDifferences:changed.length,securityExamples:changed.slice(0,20).map(key=>({key,kind:before.get(key)?.kind??after.get(key)?.kind,scope:before.get(key)?.scope??after.get(key)?.scope,beforeAclCount:before.get(key)?.aclCount,afterAclCount:after.get(key)?.aclCount,beforePresent:before.has(key),afterPresent:after.has(key)}))};
    return observed.state;
  }}).run({artifacts,sourceState:captured.state}); }
  catch(error){error.comparison=comparison;throw error;}

  return{status:result.status,transactions:result.transactions,sourceStateSha256:hash(JSON.stringify(captured.state)),restoredStateSha256:hash(JSON.stringify(result.restoredState)),historyCount:26,stageAuthority:false,gate:'NO-GO'};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  try{let input='';for await(const bytes of process.stdin){input+=bytes.toString();if(Buffer.byteLength(input)>16384)reject('LOCAL_ROUNDTRIP_INPUT_LIMIT');}console.log(JSON.stringify(await runLocalRoundTrip(JSON.parse(input))));}
  catch(error){console.log(JSON.stringify({status:'LOCAL_ROUNDTRIP_FAILED',reason:/^[A-Z_]+$/.test(error.message)?error.message:'LOCAL_ROUNDTRIP_REJECTED',phase:error.phase??null,native:error.native??null,comparison:error.comparison??null}));process.exitCode=1;}
}
