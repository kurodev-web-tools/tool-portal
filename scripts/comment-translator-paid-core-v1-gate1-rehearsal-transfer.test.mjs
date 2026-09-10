import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildSyntheticRehearsalTransfer,REHEARSAL_TRANSFER_TABLES,REHEARSAL_READBACK_SQL} from './lib/comment-translator-paid-core-v1-gate1-rehearsal-transfer.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const ids=[1,2,3].map(i=>'00000000-0000-4000-8000-'+String(i).padStart(12,'0'));
const packet=()=>({scope:'LOCAL_SYNTHETIC_ONLY',managedShapeSha256:'2c7ef5df6baeae47ac2dd21b566e77177578cc2aa7c36d5921866434f4bc2d4c',
 targetBaselineSha256:hash('empty target'),userIds:[...ids],
 tables:REHEARSAL_TRANSFER_TABLES.map(name=>({name,columns:[{name:name==='auth.users'?'id':'user_id',type:'uuid',generated:''}],
 rows:name==='auth.users'?ids.map((id,i)=>({id,email:['magiclink','recovery','email_change'][i]+'@example.test'})):
 ['public.user_profiles','public.usage_quotas'].includes(name)?ids.map(user_id=>({user_id})):[]}))});
test('fixture replay shares credential reset but never changes migration history or executes arbitrary SQL',()=>{
 const r=buildSyntheticRehearsalTransfer(packet());
 assert.equal(r.stageAuthority,false);assert.equal(r.hostedReady,false);
 assert.ok(r.sql.includes('DELETE FROM auth.refresh_tokens;'));
 assert.ok(r.sql.includes('REHEARSAL_BASELINE_MISMATCH'));
 assert.ok(r.sql.includes('REHEARSAL_IMPORT_MISMATCH'));
 assert.equal(/(?:INSERT INTO|DELETE FROM|UPDATE) supabase_migrations/.test(r.sql),false);
 assert.equal(/setval|session_replication_role\s*=\s*replica/i.test(r.sql),false);
 assert.equal(r.sql.match(/^COMMIT;/gm)?.length,1);
});
for(const [name,change]of [
 ['real domain',p=>p.tables[0].rows[0].email='user@example.com'],
 ['fourth account',p=>p.userIds.push('00000000-0000-4000-8000-000000000004')],
 ['unknown table',p=>p.tables[0].name='public.other'],
 ['duplicate table',p=>p.tables[1]=p.tables[0]],
 ['SQL column injection',p=>p.tables[0].columns[0].name='id); COMMIT; --'],
 ['foreign owner',p=>p.tables.at(-1).rows[0].user_id='00000000-0000-4000-8000-000000000004'],
 ['unknown managed schema',p=>p.managedShapeSha256=hash('unknown')],
 ['unbounded rows',p=>p.tables[1].rows=Array(257).fill({user_id:ids[0]})],
 ['extra caller SQL',p=>p.sql='DROP TABLE auth.users;'],
])test('rejects '+name,()=>{const p=packet();assert.equal(buildSyntheticRehearsalTransfer(p).stageAuthority,false);change(p);assert.throws(()=>buildSyntheticRehearsalTransfer(p),e=>e.message==='REHEARSAL_TRANSFER_REJECTED');});
test('apostrophes and SQL-looking fixture values remain quoted JSON data',()=>{
 const p=packet();p.tables.at(-2).rows[0].display_name="'); COMMIT; --";
 const r=buildSyntheticRehearsalTransfer(p);
 assert.equal(r.sql.match(/^COMMIT;/gm)?.length,1);
 assert.ok(r.sql.includes("''); COMMIT; --"));
});
test('observation and synthetic transfer create no objects that advance GraphQL schema sequences',()=>{
 assert.ok(REHEARSAL_READBACK_SQL.startsWith('BEGIN READ ONLY;'));
 for(const sql of [REHEARSAL_READBACK_SQL,buildSyntheticRehearsalTransfer(packet()).sql]){
  assert.equal(/CREATE (?:TEMP TABLE|FUNCTION)|DROP |ALTER |nextval|setval/.test(sql),false);
  assert.ok(sql.includes("set_config('ct_rehearsal.fingerprint'"));
 }
});
