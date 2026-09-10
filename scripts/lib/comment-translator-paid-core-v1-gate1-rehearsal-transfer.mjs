import {createHash} from 'node:crypto';
import {ATOMIC_MANAGED_SHAPE_SQL,ATOMIC_CREDENTIAL_GUARD_SQL,ATOMIC_CREDENTIAL_RESET_SQL,atomicBaselineFingerprintBlock} from './comment-translator-paid-core-v1-gate1-atomic-restore.mjs';

// Only these in-process, API-generated synthetic rows may enter the rehearsal.
// Managed migration history, sequences, grants and settings are not imported.
export const REHEARSAL_TRANSFER_TABLES=Object.freeze(['auth.users','auth.identities','auth.sessions','auth.refresh_tokens','auth.mfa_amr_claims','auth.flow_state','auth.one_time_tokens','public.user_profiles','public.usage_quotas']);
const shapes=new Set(['2c7ef5df6baeae47ac2dd21b566e77177578cc2aa7c36d5921866434f4bc2d4c','8358275c2842cfe35ab42bc5280bcfa95f253435da9363f998dcfcfde7b68b4a']);
const hash=v=>createHash('sha256').update(v).digest('hex');
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===[...keys].sort().join(',');
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
const literal=v=>"'"+String(v).replaceAll("'","''")+"'";
const relation=name=>name.split('.').map(n=>'"'+n+'"').join('.');
const json=v=>literal(JSON.stringify(v))+'::jsonb';
const reject=()=>{throw Error('REHEARSAL_TRANSFER_REJECTED');};

export const rehearsalColumnsSql=name=>{
 if(!REHEARSAL_TRANSFER_TABLES.includes(name))reject();
 return `SELECT coalesce(jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'generated',a.attgenerated) ORDER BY a.attnum),'[]'::jsonb) FROM pg_attribute a WHERE a.attrelid=${literal(name)}::regclass AND a.attnum>0 AND NOT a.attisdropped`;
};
export const rehearsalRowsSql=name=>{
 if(!REHEARSAL_TRANSFER_TABLES.includes(name))reject();
 return `SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text COLLATE "C"),'[]'::jsonb) FROM ${relation(name)} t`;
};
// Read-only transaction, no temporary objects and no DDL event-trigger effects.
export const REHEARSAL_READBACK_SQL=`BEGIN READ ONLY; SET LOCAL row_security=off; SET LOCAL search_path=pg_catalog,public; SET LOCAL timezone='UTC';
${atomicBaselineFingerprintBlock(false)}
SELECT current_setting('ct_rehearsal.fingerprint'); ROLLBACK;`;

export function buildSyntheticRehearsalTransfer(packet){
 try{
  if(!exact(packet,['scope','managedShapeSha256','targetBaselineSha256','userIds','tables'])||packet.scope!=='LOCAL_SYNTHETIC_ONLY'||!shapes.has(packet.managedShapeSha256)||!/^[a-f0-9]{64}$/.test(packet.targetBaselineSha256))reject();
  const ids=packet.userIds;
  if(!Array.isArray(ids)||ids.length!==3||ids.some(id=>!uuid(id))||new Set(ids).size!==3||!Array.isArray(packet.tables)||packet.tables.length!==REHEARSAL_TRANSFER_TABLES.length)reject();
  let total=0;
  for(const [i,t]of packet.tables.entries()){
   if(!exact(t,['name','columns','rows'])||t.name!==REHEARSAL_TRANSFER_TABLES[i]||!Array.isArray(t.columns)||t.columns.length<1||t.columns.length>100||new Set(t.columns.map(c=>c?.name)).size!==t.columns.length||!Array.isArray(t.rows)||t.rows.length>256)reject();
   if(t.columns.some(c=>!exact(c,['name','type','generated'])||!/^[a-z][a-z0-9_]{0,62}$/.test(c.name)||typeof c.type!=='string'||c.type.length>200||!['','s'].includes(c.generated)))reject();
   for(const r of t.rows){
    if(!r||typeof r!=='object'||Array.isArray(r))reject();
    if(t.name==='auth.users'&&(!ids.includes(r.id)||!/^(magiclink|recovery|email_change)@example\.test$/.test(r.email)))reject();
    if('user_id' in r&&r.user_id!==null&&!ids.includes(r.user_id))reject();
    if(t.name==='auth.identities'&&r.provider!=='email')reject();
    if(t.name==='auth.flow_state'&&r.user_id===null&&!(r.provider_type==='synthetic-unrelated'&&r.authentication_method==='oauth'))reject();
   }
   total+=t.rows.length;
  }
  if(total>512||packet.tables[0].rows.length!==3||new Set(packet.tables[0].rows.map(r=>r.id)).size!==3||packet.tables.at(-2).rows.length!==3||packet.tables.at(-1).rows.length!==3)reject();
  const encoded=JSON.stringify(packet);if(!encoded.isWellFormed()||encoded.includes('\\u0000')||Buffer.byteLength(encoded)>2*1024*1024)reject();
  const checks=packet.tables.map(t=>`IF (${rehearsalColumnsSql(t.name)}) IS DISTINCT FROM ${json(t.columns)} THEN RAISE EXCEPTION 'REHEARSAL_COLUMNS_MISMATCH'; END IF;
IF EXISTS(SELECT 1 FROM ${relation(t.name)}) THEN RAISE EXCEPTION 'REHEARSAL_TARGET_NOT_EMPTY'; END IF;`).join('\n');
  const inserts=packet.tables.map(t=>{
   const columns=t.columns.filter(c=>!c.generated).map(c=>'"'+c.name+'"').join(',');
   if(!columns)reject();
   return `INSERT INTO ${relation(t.name)} (${columns}) SELECT ${columns} FROM jsonb_populate_recordset(NULL::${relation(t.name)},${json(t.rows)});
DO $fixture$ BEGIN IF (${rehearsalRowsSql(t.name)}) IS DISTINCT FROM (SELECT coalesce(jsonb_agg(v ORDER BY v::text COLLATE "C"),'[]'::jsonb) FROM jsonb_array_elements(${json(t.rows)}) v) THEN RAISE EXCEPTION 'REHEARSAL_IMPORT_MISMATCH'; END IF; END $fixture$;`;
  }).join('\n');
  const identities=REHEARSAL_TRANSFER_TABLES.map(n=>`encode(sha256(convert_to(jsonb_build_array(${n.split('.').map(literal).join(',')})::text,'UTF8')),'hex')`).join(',');
  const sql=`BEGIN;
SET LOCAL statement_timeout='60000'; SET LOCAL lock_timeout='3000'; SET LOCAL row_security=off; SET LOCAL search_path=pg_catalog,public; SET LOCAL timezone='UTC';
LOCK TABLE ${REHEARSAL_TRANSFER_TABLES.map(relation).join(',')} IN ACCESS EXCLUSIVE MODE;
${ATOMIC_CREDENTIAL_GUARD_SQL}
${atomicBaselineFingerprintBlock(false)}
DO $fixture$ BEGIN PERFORM set_config('ct_rehearsal.before',current_setting('ct_rehearsal.fingerprint'),true); END $fixture$;
DO $fixture$ BEGIN
IF ${ATOMIC_MANAGED_SHAPE_SQL}<>${literal(packet.managedShapeSha256)} THEN RAISE EXCEPTION 'REHEARSAL_MANAGED_SHAPE_MISMATCH'; END IF;
IF encode(sha256(convert_to(current_setting('ct_rehearsal.before'),'UTF8')),'hex')<>${literal(packet.targetBaselineSha256)} THEN RAISE EXCEPTION 'REHEARSAL_BASELINE_MISMATCH'; END IF;
${checks}
END $fixture$;
${inserts}
${atomicBaselineFingerprintBlock(false)}
DO $fixture$ DECLARE old jsonb; fresh jsonb; BEGIN
old:=current_setting('ct_rehearsal.before')::jsonb; fresh:=current_setting('ct_rehearsal.fingerprint')::jsonb;
IF old-'tables' IS DISTINCT FROM fresh-'tables' OR (old->'tables')-ARRAY[${identities}] IS DISTINCT FROM (fresh->'tables')-ARRAY[${identities}] THEN RAISE EXCEPTION 'REHEARSAL_UNRELATED_STATE_CHANGED'; END IF;
END $fixture$;
${ATOMIC_CREDENTIAL_GUARD_SQL}
${atomicBaselineFingerprintBlock(true)}
DO $fixture$ BEGIN PERFORM set_config('ct_rehearsal.expected',current_setting('ct_rehearsal.fingerprint'),true); END $fixture$;
${ATOMIC_CREDENTIAL_RESET_SQL}
${atomicBaselineFingerprintBlock(false)}
DO $fixture$ BEGIN IF current_setting('ct_rehearsal.fingerprint')::jsonb IS DISTINCT FROM current_setting('ct_rehearsal.expected')::jsonb THEN RAISE EXCEPTION 'REHEARSAL_RESET_MISMATCH'; END IF; END $fixture$;
SELECT jsonb_build_object('kind','synthetic-rehearsal-precommit-v1','fingerprint',current_setting('ct_rehearsal.expected')::jsonb);
COMMIT;
`;
  return Object.freeze({scope:'SYNTHETIC_REHEARSAL_ONLY',sql,sha256:hash(sql),stageAuthority:false,hostedReady:false,gate:'NO-GO'});
 }catch{reject();}
}
