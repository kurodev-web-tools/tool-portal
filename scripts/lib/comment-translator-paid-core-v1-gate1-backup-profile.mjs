import fs from 'node:fs';
import { createHash } from 'node:crypto';

const inventory = JSON.parse(fs.readFileSync(new URL('../fixtures/comment-translator-paid-core-v1-gate1-environment-inventories.json', import.meta.url), 'utf8'));
const pending = new Set(inventory.production.pending34.map(x => x.version + ':' + x.name));
export const BACKUP_HISTORIES = Object.freeze({
  pre22: inventory.final56.filter(x => !pending.has(x.version + ':' + x.name)),
  post56: inventory.final56,
});
const sha = x => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
const exact = (v, keys) => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).sort().join() === [...keys].sort().join();
export function validateBackupProfile(profile) {
  if (!exact(profile, ['phase', 'structureSha256', 'reviewedCatalogSha256', 'reviewedCatalogFile']) ||
      !Object.hasOwn(BACKUP_HISTORIES, profile.phase) || !sha(profile.structureSha256) || !sha(profile.reviewedCatalogSha256) ||
      typeof profile.reviewedCatalogFile !== 'string' || !/^[A-Za-z]:[\\/]/.test(profile.reviewedCatalogFile))
    throw Error('BACKUP_PROFILE_REQUIRED');
  return profile;
}

export function verifyReviewedBackupCatalog(profile, targetBindingSha256, fsApi=fs) {
  validateBackupProfile(profile);
  const stat=fsApi.lstatSync(profile.reviewedCatalogFile);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size>1048576) throw Error('BACKUP_CATALOG_REJECTED');
  const bytes=fsApi.readFileSync(profile.reviewedCatalogFile);
  if (bytes.length>1048576 || createHash('sha256').update(bytes).digest('hex')!==profile.reviewedCatalogSha256) throw Error('BACKUP_CATALOG_REJECTED');
  const catalog=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  if(catalog.target!=='production'||catalog.targetBindingSha256!==targetBindingSha256 ||
    catalog.initialReleaseSupplement?.structureSha256!==profile.structureSha256 ||
    catalog.readOnly?.transactionReadOnly!=='on'||catalog.readOnly?.transactionIsolation!=='repeatable read') throw Error('BACKUP_CATALOG_REJECTED');
  const rows=catalog.history?.rows,expected=BACKUP_HISTORIES[profile.phase];
  if(!Array.isArray(rows)||rows.length!==expected.length||rows.some((r,i)=>r.version!==expected[i].version||r.name!==expected[i].name))throw Error('BACKUP_CATALOG_REJECTED');
  return profile;
}
// A reviewed, target-bound catalog fixes this row-free fingerprint before the
// backup. Never derive the expected value from the capture being accepted.
// Include definitions, ownership, ACL, RLS, trigger enabled state and portable
// dependency addresses. Managed Auth/Storage are included, not assumed empty.
// NULL ACL means PostgreSQL acldefault, not an empty grant set. Compare effective
// grants including grantor; pg_dump may omit explicit ACLs equal to that default.
export const BACKUP_STRUCTURE_CTES = `WITH namespaces AS (
 SELECT * FROM pg_namespace WHERE nspname IN ('public','auth','storage','supabase_functions','supabase_migrations','comment_translator_paid_legacy_archive')
), objects AS (
 SELECT 'pg_namespace'::regclass AS classid,n.oid AS objid,0 AS objsubid,
   jsonb_build_array('schema',nspname,pg_get_userbyid(nspowner),(SELECT jsonb_agg(x::text ORDER BY x::text COLLATE "C") FROM unnest(coalesce(n.nspacl,acldefault('n',n.nspowner))) x)) AS value FROM namespaces n
 UNION ALL SELECT 'pg_class'::regclass,c.oid,0,jsonb_build_array('relation',n.nspname,c.relname,c.relkind,
   pg_get_userbyid(c.relowner),(SELECT jsonb_agg(x::text ORDER BY x::text COLLATE "C") FROM unnest(coalesce(c.relacl,acldefault(CASE WHEN c.relkind='S' THEN 'S'::"char" ELSE 'r'::"char" END,c.relowner))) x),c.relrowsecurity,c.relforcerowsecurity,
   CASE WHEN c.relkind IN ('v','m') THEN pg_get_viewdef(c.oid,false) ELSE NULL END)
 FROM pg_class c JOIN namespaces n ON n.oid=c.relnamespace
 UNION ALL SELECT 'pg_class'::regclass,c.oid,a.attnum,jsonb_build_array('column',n.nspname,c.relname,a.attname,a.attnum,
   format_type(a.atttypid,a.atttypmod),a.attnotnull,a.attidentity,a.attgenerated,(SELECT jsonb_agg(x::text ORDER BY x::text COLLATE "C") FROM unnest(a.attacl) x),pg_get_expr(d.adbin,d.adrelid))
 FROM pg_class c JOIN namespaces n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid
 LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum WHERE a.attnum>0 AND NOT a.attisdropped
 UNION ALL SELECT 'pg_proc'::regclass,p.oid,0,jsonb_build_array('function',n.nspname,p.proname,pg_get_function_identity_arguments(p.oid),
   pg_get_userbyid(p.proowner),(SELECT jsonb_agg(x::text ORDER BY x::text COLLATE "C") FROM unnest(coalesce(p.proacl,acldefault('f',p.proowner))) x),p.prosecdef,p.proconfig,pg_get_functiondef(p.oid))
 FROM pg_proc p JOIN namespaces n ON n.oid=p.pronamespace WHERE p.prokind IN ('f','p')
 UNION ALL SELECT 'pg_constraint'::regclass,c.oid,0,jsonb_build_array('constraint',n.nspname,t.relname,c.conname,c.convalidated,pg_get_constraintdef(c.oid,false))
 FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN namespaces n ON n.oid=t.relnamespace
 UNION ALL SELECT 'pg_trigger'::regclass,t.oid,0,jsonb_build_array('trigger',n.nspname,c.relname,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid,false))
 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN namespaces n ON n.oid=c.relnamespace WHERE NOT t.tgisinternal
 UNION ALL SELECT 'pg_policy'::regclass,p.oid,0,jsonb_build_array('policy',n.nspname,c.relname,p.polname,p.polcmd,p.polpermissive,
   (SELECT jsonb_agg(CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r)::text END ORDER BY CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r)::text END COLLATE "C") FROM unnest(p.polroles) r),
   pg_get_expr(p.polqual,p.polrelid),pg_get_expr(p.polwithcheck,p.polrelid))
 FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN namespaces n ON n.oid=c.relnamespace
 UNION ALL SELECT 'pg_class'::regclass,i.indexrelid,0,jsonb_build_array('index',n.nspname,c.relname,pg_get_indexdef(i.indexrelid,0,false))
 FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid JOIN namespaces n ON n.oid=c.relnamespace
 UNION ALL SELECT 'pg_type'::regclass,t.oid,0,jsonb_build_array('type',n.nspname,t.typname,t.typtype,pg_get_userbyid(t.typowner),format_type(t.typbasetype,t.typtypmod),t.typnotnull,t.typdefault,(SELECT jsonb_agg(x::text ORDER BY x::text COLLATE "C") FROM unnest(coalesce(t.typacl,acldefault('T',t.typowner))) x),(SELECT jsonb_agg(e.enumlabel ORDER BY e.enumsortorder) FROM pg_enum e WHERE e.enumtypid=t.oid)) FROM pg_type t JOIN namespaces n ON n.oid=t.typnamespace WHERE t.typtype IN ('e','d')
 UNION ALL SELECT 'pg_class'::regclass,s.seqrelid,0,jsonb_build_array('sequence',n.nspname,c.relname,s.seqstart,s.seqincrement,s.seqmax,s.seqmin,s.seqcache,s.seqcycle) FROM pg_sequence s JOIN pg_class c ON c.oid=s.seqrelid JOIN namespaces n ON n.oid=c.relnamespace
 UNION ALL SELECT 'pg_default_acl'::regclass,d.oid,0,jsonb_build_array('default-acl',pg_get_userbyid(d.defaclrole),coalesce(n.nspname,''),d.defaclobjtype,(SELECT jsonb_agg(x::text ORDER BY x::text COLLATE "C") FROM unnest(d.defaclacl) x)) FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace WHERE d.defaclnamespace=0 OR d.defaclnamespace IN (SELECT oid FROM namespaces)
), scoped_dependencies AS MATERIALIZED (
 SELECT d.* FROM pg_depend d WHERE (d.classid,d.objid) IN (SELECT classid,objid FROM objects)
 OR (d.refclassid,d.refobjid) IN (SELECT classid,objid FROM objects)
), edges AS (
 SELECT jsonb_build_array('edge',d.deptype,CASE WHEN d.classid='pg_trigger'::regclass AND EXISTS(SELECT 1 FROM pg_trigger t WHERE t.oid=d.objid AND t.tgisinternal) THEN (SELECT jsonb_build_array('internal-trigger',n.nspname,c.relname,t.tgfoid::regproc::text,t.tgtype,t.tgenabled,t.tgdeferrable,t.tginitdeferred,co.conname) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_constraint co ON co.oid=t.tgconstraint WHERE t.oid=d.objid) WHEN d.classid='pg_class'::regclass AND EXISTS(SELECT 1 FROM pg_class c WHERE c.reltoastrelid=d.objid OR c.reltoastrelid=(SELECT i.indrelid FROM pg_index i WHERE i.indexrelid=d.objid)) THEN (SELECT jsonb_build_array(CASE WHEN c.reltoastrelid=d.objid THEN 'toast' ELSE 'toast-index' END,n.nspname,c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.reltoastrelid=d.objid OR c.reltoastrelid=(SELECT i.indrelid FROM pg_index i WHERE i.indexrelid=d.objid)) ELSE to_jsonb(a) END,CASE WHEN d.refclassid='pg_trigger'::regclass AND EXISTS(SELECT 1 FROM pg_trigger t WHERE t.oid=d.refobjid AND t.tgisinternal) THEN (SELECT jsonb_build_array('internal-trigger',n.nspname,c.relname,t.tgfoid::regproc::text,t.tgtype,t.tgenabled,t.tgdeferrable,t.tginitdeferred,co.conname) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_constraint co ON co.oid=t.tgconstraint WHERE t.oid=d.refobjid) WHEN d.refclassid='pg_class'::regclass AND EXISTS(SELECT 1 FROM pg_class c WHERE c.reltoastrelid=d.refobjid OR c.reltoastrelid=(SELECT i.indrelid FROM pg_index i WHERE i.indexrelid=d.refobjid)) THEN (SELECT jsonb_build_array(CASE WHEN c.reltoastrelid=d.refobjid THEN 'toast' ELSE 'toast-index' END,n.nspname,c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.reltoastrelid=d.refobjid OR c.reltoastrelid=(SELECT i.indrelid FROM pg_index i WHERE i.indexrelid=d.refobjid)) ELSE to_jsonb(b) END) value FROM scoped_dependencies d
 CROSS JOIN LATERAL pg_identify_object(d.classid,d.objid,d.objsubid) a
 CROSS JOIN LATERAL pg_identify_object(d.refclassid,d.refobjid,d.refobjsubid) b

), values_to_hash AS (SELECT value FROM objects UNION ALL SELECT value FROM edges)
`;
export const BACKUP_STRUCTURE_SQL = `(${BACKUP_STRUCTURE_CTES} SELECT encode(sha256(convert_to(coalesce(jsonb_agg(value ORDER BY value::text COLLATE "C"),'[]'::jsonb)::text,'UTF8')),'hex') FROM values_to_hash)`;

export function validateProfileState(state, profile) {
  validateBackupProfile(profile);
  if (state.phase !== profile.phase || state.structureSha256 !== profile.structureSha256 ||
      JSON.stringify(state.history.map(x=>[x.version,x.name])) !== JSON.stringify(BACKUP_HISTORIES[profile.phase].map(x=>[x.version,x.name]))) throw Error('BACKUP_PROFILE_MISMATCH');
  return state;
}
export function backupProfileReference(profile) {
  validateBackupProfile(profile);
  return {phase:profile.phase,structureSha256:profile.structureSha256,reviewedCatalogSha256:profile.reviewedCatalogSha256};
}
