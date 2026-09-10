import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { createAtomicPostgresAdapter, validateAtomicPostgresTarget, runRetainedAtomicPostgres } from './lib/comment-translator-paid-core-v1-gate1-atomic-postgres-process.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
function fixture() {
  const target={containerId:'a'.repeat(64),owner:'ct-atomic-'+ 'b'.repeat(24),imageId:'sha256:'+'c'.repeat(64),baselineSha256:hash('baseline')};
  const inspection={Id:target.containerId,Image:target.imageId,Name:'/'+target.owner+'-db',State:{Running:true},
    Config:{Labels:{'com.comment_translator.atomic':target.owner}},HostConfig:{Privileged:false,NetworkMode:'none',PortBindings:{},Binds:[],VolumesFrom:null,CapAdd:null},
    Mounts:[{Type:'volume',Name:'owned',Destination:'/var/lib/postgresql/data'}],NetworkSettings:{Networks:{}}};
  const input={artifacts:['roles.sql','schema.sql','auth_storage_changes.sql','data.sql','history_schema.sql','history_data.sql'].map(name=>({name,sql:'SELECT 1;',bytes:9,sha256:hash('SELECT 1;')})),
    sourceState:{historyCount:22,historySha256:hash('h'),rowCounts:[{identitySha256:hash('table'),rows:1}],authUsers:1,authForeignKeysSha256:hash('fk'),grantsRlsSha256:hash('acl'),legacyRows:0,vaultRows:0,storageObjects:0,vectorCounts:{'storage.buckets_vectors':0,'storage.vector_indexes':0}}};
  const responses=[JSON.stringify({role:'postgres',database:'postgres',superuser:false,serverMajor:17,authUsers:0,baselineSha256:target.baselineSha256}),
    JSON.stringify({kind:'atomic-precommit-v1',fingerprint:{tables:{},security:{},definitions:hash('def')}}),JSON.stringify({tables:{},security:{},definitions:hash('def')})];
  let calls=0,stops=0;
  const io={inspect:()=>inspection,claim:()=>true,execute:async()=>responses[calls++],stop:()=>{stops++;return true;},now:()=>0};
  return {target,inspection,input,responses,io,counts:()=>({calls,stops})};
}
test('ordinary postgres adapter checks baseline before one transaction and independent readback',async()=>{
  const f=fixture(), sql=[];const exec=f.io.execute;f.io.execute=async text=>{sql.push(text);return exec(text);};
  const r=await createAtomicPostgresAdapter(f.io).run(f.input,f.target);
  assert.equal(r.status,'ATOMIC_POSTGRES_RESTORE_OBSERVED');assert.equal(r.stageAuthority,false);
  assert.equal(r.failurePolicy,'discard-target-v1');assert.equal(r.targetReusable,false);
  assert.equal(sql.length,3);assert.ok(sql[1].includes('ATOMIC_SOURCE_STATE_MISMATCH'));assert.ok(sql[2].includes('ROLLBACK;'));
});
test('wrong owner, image, exposed network, privileged or host mount rejected',()=>{
  for(const change of [f=>f.inspection.Image='sha256:'+'d'.repeat(64),f=>f.inspection.Config.Labels={},f=>f.inspection.HostConfig.NetworkMode='bridge',
    f=>f.inspection.HostConfig.Privileged=true,f=>f.inspection.HostConfig.Binds=['private:/data'],f=>f.inspection.Mounts[0].Type='bind',
    f=>f.inspection.NetworkSettings.Networks={bridge:{}}]) {
    const f=fixture();change(f);assert.throws(()=>validateAtomicPostgresTarget(f.target,f.inspection),/ATOMIC_POSTGRES_TARGET_REJECTED/);
  }
});
test('claim precedes SQL and a second caller cannot stop or reuse an attempted target',async()=>{
  const f=fixture();let claimed=false;f.io.claim=()=>{if(claimed)throw Error('ATOMIC_TARGET_ALREADY_ATTEMPTED');claimed=true;return true;};
  const execute=f.io.execute;f.io.execute=async(...args)=>{assert.equal(claimed,true);return execute(...args);};
  await createAtomicPostgresAdapter(f.io).run(f.input,f.target);
  await assert.rejects(createAtomicPostgresAdapter(f.io).run(f.input,f.target),e=>e.disposalRequired===false&&e.attemptOwned===false&&e.targetReusable===false);
  assert.deepEqual(f.counts(),{calls:3,stops:0});
});
test('failed attempt explicitly requires disposal rather than claiming complete rollback',async()=>{
  const f=fixture();f.io.execute=async()=>{throw Error('native failed');};
  await assert.rejects(createAtomicPostgresAdapter(f.io).run(f.input,f.target),e=>e.disposalRequired===true&&e.stopConfirmed===true&&e.wholeStateRollbackGuaranteed===false);
});
test('superuser, occupied target and wrong baseline stop before restore',async()=>{
  for(const fields of [{superuser:true},{authUsers:1},{baselineSha256:hash('other')},{role:'supabase_admin'}]) {
    const f=fixture();f.responses[0]=JSON.stringify({...JSON.parse(f.responses[0]),...fields});
    await assert.rejects(createAtomicPostgresAdapter(f.io).run(f.input,f.target),/ATOMIC_POSTGRES_REJECTED/);
    assert.deepEqual(f.counts(),{calls:1,stops:1});
  }
});
test('native failure, readback mismatch, timeout and cancellation never accept',async()=>{
  for(const mutate of [f=>f.io.execute=async()=>{throw Error('secret SQL');},f=>f.responses[2]='{}',
    f=>{let n=0;f.io.now=()=>n++?700000:0;}]) {
    const f=fixture();mutate(f);await assert.rejects(createAtomicPostgresAdapter(f.io).run(f.input,f.target),/^Error: ATOMIC_POSTGRES_REJECTED$/);
  }
  const f=fixture(), controller=new AbortController();controller.abort();
  await assert.rejects(createAtomicPostgresAdapter(f.io).run(f.input,f.target,{signal:controller.signal}));assert.equal(f.counts().calls,0);
});
test('public entry rejects cancellation or invalid total budget before reading backup input',async()=>{
  const controller=new AbortController();controller.abort();
  await assert.rejects(runRetainedAtomicPostgres({backup:null,target:null},{signal:controller.signal}),/ATOMIC_POSTGRES_REJECTED/);
  for(const timeoutMs of [0,600001,NaN])await assert.rejects(runRetainedAtomicPostgres({backup:null,target:null},{timeoutMs}),/ATOMIC_POSTGRES_REJECTED/);
});
