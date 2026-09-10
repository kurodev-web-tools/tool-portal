import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {ATOMIC_LOCAL_DOCKER_ARGS} from './lib/comment-translator-paid-core-v1-gate1-atomic-local-process.mjs';
import {ATOMIC_POSTGRES_BASELINE_SQL} from './lib/comment-translator-paid-core-v1-gate1-atomic-postgres-process.mjs';
const owner='ct-atomic-'+randomBytes(12).toString('hex'),name=owner+'-db';let id,volumes=[],phase='setup',report={scope:'LOCAL_SYNTHETIC_ONLY',status:'FAIL'};
const docker=(args,input,allow=false)=>{const r=spawnSync('docker',[...ATOMIC_LOCAL_DOCKER_ARGS,...args],{input,encoding:'utf8',windowsHide:true,timeout:30000,maxBuffer:4194304});if(!allow&&(r.status!==0||r.error||r.signal))throw Object.assign(Error('NATIVE_FAILED'),{sqlState:r.stderr?.match(/ERROR:\s+([0-9A-Z]{5}):/)?.[1]??null});return r;};
const sql=(q,role='postgres')=>docker(['exec','-i',id,'psql','-X','-qAt','-U',role,'-d','postgres','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose'],q).stdout.trim();
try{
id=docker(['run','-d','--pull=never','--name',name,'--label','com.comment_translator.atomic='+owner,'--network','none','-e','POSTGRES_PASSWORD='+randomBytes(24).toString('hex'),'public.ecr.aws/supabase/postgres:17.6.1.140']).stdout.trim();assert.match(id,/^[a-f0-9]{64}$/);
volumes=JSON.parse(docker(['inspect',id]).stdout)[0].Mounts.filter(m=>m.Type==='volume').map(m=>m.Name);
let ready=false;for(let i=0;i<60;i++){if(docker(['exec',id,'pg_isready','-h','127.0.0.1','-U','postgres'],null,true).status===0){ready=true;break;}await new Promise(r=>setTimeout(r,500));}assert.ok(ready);
// Use the image's empty Auth schema; do not fabricate history or Storage objects.
phase='empty_image_check';assert.equal(sql('SELECT count(*) FROM auth.users;'),'0');
assert.equal(sql("SELECT to_regclass('supabase_migrations.schema_migrations') IS NULL;"),'t');
phase='empty_history_baseline';const baseline=()=>JSON.parse(sql(ATOMIC_POSTGRES_BASELINE_SQL));
const original=baseline();assert.equal(original.role,'postgres');assert.equal(original.superuser,false);assert.equal(original.authUsers,0);assert.match(original.baselineSha256,/^[a-f0-9]{64}$/);assert.deepEqual(baseline(),original);
phase='catalog_and_row_drift';
for(const change of [
 'CREATE TABLE public.baseline_probe(id integer); REVOKE ALL ON public.baseline_probe FROM anon;',
 'INSERT INTO public.baseline_probe VALUES (1);',
 'GRANT SELECT ON public.baseline_probe TO anon;',
 'ALTER TABLE public.baseline_probe ENABLE ROW LEVEL SECURITY;',
 'CREATE POLICY read_probe ON public.baseline_probe FOR SELECT TO anon USING (true);',
 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE SELECT ON TABLES FROM authenticated;',
 'CREATE SCHEMA IF NOT EXISTS supabase_migrations; CREATE TABLE supabase_migrations.schema_migrations(version text);',
 "INSERT INTO supabase_migrations.schema_migrations VALUES ('20260910000000');"
]){phase='drift_'+String(change.split(' ')[0])+'_'+String(change.includes('DEFAULT'));const before=baseline().baselineSha256;sql(change);assert.notEqual(baseline().baselineSha256,before);}
phase='missing_auth_rejected';sql('ALTER TABLE auth.users RENAME TO baseline_hidden_users;','supabase_admin');
assert.throws(()=>baseline(),e=>e.sqlState==='42P01');
report={...report,status:'PASS',emptyHistoryAccepted:true,stableReadback:true,driftCases:8,missingAuthRejected:true};
}catch(e){report={...report,phase,sqlState:e.sqlState??null};process.exitCode=1;}
finally{if(id){const v=JSON.parse(docker(['inspect',id]).stdout)[0];assert.equal(v.Config.Labels['com.comment_translator.atomic'],owner);docker(['rm','-f','-v',id]);}
report.ownedContainersRemaining=docker(['ps','-aq','--filter','label=com.comment_translator.atomic='+owner]).stdout.trim()?1:0;report.ownedVolumesRemaining=volumes.filter(v=>docker(['volume','inspect',v],null,true).status===0).length;
if(report.ownedContainersRemaining||report.ownedVolumesRemaining){report.status='FAIL';process.exitCode=1;}console.log(JSON.stringify({...report,stageAuthority:false,gate:'NO-GO'}));}