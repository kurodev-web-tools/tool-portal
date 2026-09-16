// Actual PostgreSQL execution in one exclusively owned, network-none container.
// Auth/Storage table SHAPES are minimal synthetic fixtures, NOT hosted services.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {ATOMIC_LOCAL_DOCKER_ARGS} from './lib/comment-translator-paid-core-v1-gate1-atomic-local-process.mjs';
import {PROTECTION_SQL,READBACK_SQL,INVENTORY_COUNTS,verifyGuardOverlay,verifyEmptyInventory,checkGuardCollision} from './gate1-execution/empty-recovery.mjs';

test('actual ordinary-postgres protection, role denial, isolated app restore, tamper detection and cleanup',async t=>{
 const image='sha256:6501843661b1f8ff97e85c02de33edc0ee2e2693888ad596ee86222f02dc8ecc';
 const owner='ct-atomic-'+randomBytes(12).toString('hex'),name=owner+'-db';
 const env={SystemRoot:process.env.SystemRoot,PATH:process.env.PATH,TEMP:process.env.TEMP};
 const call=(args,input,allow=false)=>{const r=spawnSync('docker',[...ATOMIC_LOCAL_DOCKER_ARGS,...args],{env,input,encoding:'utf8',windowsHide:true,shell:false,timeout:30000,maxBuffer:1048576});
  if(!allow&&(r.status!==0||r.error||r.signal))throw Error('OWNED_LOCAL_POSTGRES_FAILED:'+ (r.stderr.match(/ERROR:\s+([0-9A-Z]{5}|[A-Z_]{8,})/)?.[1]??'REDACTED'));return r;};
 let id;const volumes=[];
 try{
  assert.equal(JSON.parse(call(['image','inspect',image]).stdout)[0].Id,image);
  id=call(['run','-d','--pull=never','--name',name,'--label','com.comment_translator.atomic='+owner,'--network','none','-e','POSTGRES_PASSWORD=synthetic-empty-only',image]).stdout.trim();
  assert.match(id,/^[a-f0-9]{64}$/);
  const inspected=JSON.parse(call(['inspect',id]).stdout)[0];assert.equal(inspected.HostConfig.NetworkMode,'none');assert.equal(inspected.HostConfig.Privileged,false);
  assert.ok(!inspected.HostConfig.PortBindings||Object.keys(inspected.HostConfig.PortBindings).length===0);
  for(const m of inspected.Mounts){assert.equal(m.Type,'volume');volumes.push(m.Name);}
  let ready=false;
  // The image uses a temporary UNIX-only bootstrap server. Wait for TCP so
  // fixture DDL cannot race its managed initialization.
  for(let n=0;n<60;n++){if(call(['exec',id,'pg_isready','-h','127.0.0.1','-U','postgres'],undefined,true).status===0){ready=true;break;}await new Promise(r=>setTimeout(r,250));}assert.ok(ready);
  const sql=(text,role='postgres',allow=false)=>call(['exec','-i',id,'psql','-X','-qAt','-U',role,'-d','postgres','-v','ON_ERROR_STOP=1','-v','VERBOSITY=sqlstate','--file=-'],text,allow);
  // Managed services are NOT booted: create only the count-query table shapes.
  sql("CREATE SCHEMA IF NOT EXISTS auth; CREATE SCHEMA IF NOT EXISTS storage; CREATE TABLE IF NOT EXISTS auth.users(id int); CREATE TABLE IF NOT EXISTS auth.sessions(id int); CREATE TABLE IF NOT EXISTS storage.buckets(id int); CREATE TABLE IF NOT EXISTS storage.objects(id int); GRANT USAGE ON SCHEMA auth,storage TO postgres; GRANT SELECT ON auth.users,auth.sessions,storage.buckets,storage.objects TO postgres;",'supabase_admin');
  assert.equal(sql("SELECT rolsuper FROM pg_roles WHERE rolname=current_user;").stdout.trim(),'f');
  sql(PROTECTION_SQL);
  const read=()=>JSON.parse(sql(READBACK_SQL).stdout);
  const before=read();t.diagnostic(JSON.stringify({localInventory:Object.fromEntries(INVENTORY_COUNTS.map(k=>[k,before[k]]))}));
  verifyGuardOverlay(before.guard);verifyEmptyInventory(before,{local:true});
  // Fixture administrator only establishes the effective test role; installing
  // the guard and all production-intended readbacks still use ordinary postgres.
  assert.equal(JSON.parse(sql("SET ROLE supabase_auth_admin; SELECT gate1_restore_guard.deny_delivery('{\"arbitrary\":\"never-returned\"}'::jsonb);",'supabase_admin').stdout).error.message,'RECOVERY_DELIVERY_DISABLED');
  for(const role of ['anon','authenticated','service_role']){const denied=sql("SET ROLE "+role+"; SELECT gate1_restore_guard.deny_delivery('{}'::jsonb);",'supabase_admin',true);assert.notEqual(denied.status,0);assert.match(denied.stderr,/42501/);}
  // No actual backup: represent app-schema work and its own independent check.
  const appSql='CREATE TABLE public.local_restore_example(id int PRIMARY KEY); INSERT INTO public.local_restore_example VALUES (7);';
  checkGuardCollision(appSql);sql(appSql);
  const after=read();assert.deepEqual(after.guard,before.guard);verifyGuardOverlay(after.guard);
  assert.equal(sql('SELECT id FROM public.local_restore_example;').stdout.trim(),'7');assert.throws(()=>verifyEmptyInventory(after,{local:true}));
  sql('BEGIN; GRANT EXECUTE ON FUNCTION gate1_restore_guard.deny_delivery(jsonb) TO anon; ROLLBACK;');verifyGuardOverlay(read().guard);
  sql('GRANT EXECUTE ON FUNCTION gate1_restore_guard.deny_delivery(jsonb) TO anon;');assert.throws(()=>verifyGuardOverlay(read().guard));
  sql('REVOKE EXECUTE ON FUNCTION gate1_restore_guard.deny_delivery(jsonb) FROM anon;');verifyGuardOverlay(read().guard);
  sql("CREATE OR REPLACE FUNCTION gate1_restore_guard.deny_delivery(event jsonb) RETURNS jsonb LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT '{}'::jsonb; $$;");
  assert.throws(()=>verifyGuardOverlay(read().guard));
  assert.notEqual(sql(PROTECTION_SQL,'postgres',true).status,0); // never repair/replay over an existing guard
 }finally{
  if(id){const v=JSON.parse(call(['inspect',id]).stdout)[0];assert.equal(v.Config.Labels['com.comment_translator.atomic'],owner);assert.equal(v.Image,image);call(['rm','-f','-v',id]);}
  assert.equal(call(['ps','-aq','--filter','label=com.comment_translator.atomic='+owner]).stdout.trim(),'');
  for(const volume of volumes)assert.notEqual(call(['volume','inspect',volume],undefined,true).status,0);
 }
});
