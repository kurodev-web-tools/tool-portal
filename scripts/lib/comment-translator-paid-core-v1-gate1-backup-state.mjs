import { BACKUP_STRUCTURE_SQL, BACKUP_HISTORIES } from './comment-translator-paid-core-v1-gate1-backup-profile.mjs';
// Shared with the pinned data-dump recipe. History is captured separately.
export const BACKUP_DATA_EXCLUDED_SCHEMAS = Object.freeze('information_schema pg_* graphql graphql_public pgsodium pgsodium_masks pgtle repack tiger tiger_data timescaledb_* _timescaledb_* topology vault etl extensions pgbouncer realtime supabase_migrations _analytics _realtime _supavisor'.split(' '));
export const BACKUP_DATA_EXCLUDED_TABLES = Object.freeze(['auth.schema_migrations', 'storage.migrations', 'supabase_functions.migrations', 'storage.buckets_vectors', 'storage.vector_indexes']);
const excludedPattern = '^(' + BACKUP_DATA_EXCLUDED_SCHEMAS.map(s => s.replaceAll('*', '.*')).join('|') + ')$';
// Fixed aggregate-only readback. Execute inside the held RR/read-only exporter;
// never accept a caller's SQL, table names, counts or digest as native evidence.
const digest = sql => `encode(sha256(convert_to((${sql})::text, 'UTF8')), 'hex')`;
function sourceStateSql(effectiveAcl = false) { return `(
WITH schemas AS MATERIALIZED (
  SELECT * FROM pg_namespace WHERE nspname = 'supabase_migrations' OR nspname !~ '${excludedPattern}'
), relations AS MATERIALIZED (
  SELECT c.oid, n.nspname, c.relname, c.relkind, c.relrowsecurity, c.relforcerowsecurity,
    pg_get_userbyid(c.relowner) AS owner, ${effectiveAcl ? "coalesce(c.relacl,acldefault(CASE WHEN c.relkind='S' THEN 'S'::\"char\" ELSE 'r'::\"char\" END,c.relowner)) AS relacl" : 'c.relacl'}
  FROM pg_class c JOIN schemas n ON n.oid = c.relnamespace
  WHERE c.relkind IN ('r', 'p', 'S', 'v', 'm', 'f')
), counts AS MATERIALIZED (
  SELECT *, ((xpath('/table/row/n/text()', query_to_xml(
    format('SELECT count(*) AS n FROM ONLY %I.%I', nspname, relname), false, false, '')))[1]::text)::bigint AS rows
  FROM relations WHERE relkind IN ('r', 'p')
    AND (nspname || '.' || relname) NOT IN (${BACKUP_DATA_EXCLUDED_TABLES.map(s => `'${s}'`).join(', ')})
), history AS (
  SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY version COLLATE "C"), '[]'::jsonb) AS rows,
    count(*) AS total FROM supabase_migrations.schema_migrations m
), foreign_keys AS (
  SELECT coalesce(jsonb_agg(jsonb_build_array(sn.nspname, sc.relname, c.conname,
    tn.nspname, tc.relname, pg_get_constraintdef(c.oid, false), c.convalidated)
    ORDER BY sn.nspname COLLATE "C", sc.relname COLLATE "C", c.conname COLLATE "C"), '[]'::jsonb) AS rows
  FROM pg_constraint c JOIN pg_class sc ON sc.oid = c.conrelid JOIN pg_namespace sn ON sn.oid = sc.relnamespace
    JOIN pg_class tc ON tc.oid = c.confrelid JOIN pg_namespace tn ON tn.oid = tc.relnamespace
  WHERE c.contype = 'f' AND (sn.nspname = 'auth' OR tn.nspname = 'auth')
), security_rows AS (
  SELECT jsonb_build_array('relation', nspname, relname, relkind, owner, relrowsecurity, relforcerowsecurity,
    (SELECT coalesce(jsonb_agg(a::text ORDER BY a::text COLLATE "C"), '[]'::jsonb) FROM unnest(relacl) a)) AS row FROM relations
  UNION ALL
  SELECT jsonb_build_array('column', r.nspname, r.relname, a.attname,
    (SELECT coalesce(jsonb_agg(x::text ORDER BY x::text COLLATE "C"), '[]'::jsonb) FROM unnest(a.attacl) x))
  FROM relations r JOIN pg_attribute a ON a.attrelid = r.oid WHERE a.attnum > 0 AND NOT a.attisdropped
  UNION ALL
  SELECT jsonb_build_array('policy', r.nspname, r.relname, p.polname, p.polcmd, p.polpermissive,
    (SELECT jsonb_agg(CASE WHEN roleid = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(roleid)::text END ORDER BY
      CASE WHEN roleid = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(roleid)::text END COLLATE "C") FROM unnest(p.polroles) roleid),
    pg_get_expr(p.polqual, p.polrelid), pg_get_expr(p.polwithcheck, p.polrelid))
  FROM relations r JOIN pg_policy p ON p.polrelid = r.oid
  UNION ALL
  SELECT jsonb_build_array('schema', n.nspname, pg_get_userbyid(n.nspowner),
    (SELECT coalesce(jsonb_agg(a::text ORDER BY a::text COLLATE "C"), '[]'::jsonb) FROM unnest(${effectiveAcl ? "coalesce(n.nspacl,acldefault('n',n.nspowner))" : 'n.nspacl'}) a))
  FROM schemas n
  UNION ALL
  SELECT jsonb_build_array('function', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid), pg_get_userbyid(p.proowner),
    (SELECT coalesce(jsonb_agg(a::text ORDER BY a::text COLLATE "C"), '[]'::jsonb) FROM unnest(${effectiveAcl ? "coalesce(p.proacl,acldefault('f',p.proowner))" : 'p.proacl'}) a))
  FROM pg_proc p JOIN schemas n ON n.oid = p.pronamespace
  UNION ALL
  SELECT jsonb_build_array('default', pg_get_userbyid(d.defaclrole), coalesce(n.nspname::text, ''), d.defaclobjtype,
    (SELECT coalesce(jsonb_agg(a::text ORDER BY a::text COLLATE "C"), '[]'::jsonb) FROM unnest(d.defaclacl) a))
  FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
  WHERE d.defaclnamespace = 0 OR d.defaclnamespace IN (SELECT oid FROM schemas)
)
SELECT jsonb_build_object(
  'historyCount', (SELECT total FROM history), 'historySha256', ${digest('SELECT rows FROM history')},
  'rowCounts', (SELECT jsonb_agg(jsonb_build_object('identitySha256', identity, 'rows', rows) ORDER BY identity COLLATE "C")
    FROM (SELECT ${digest('jsonb_build_array(nspname, relname)')} AS identity, rows FROM counts) c),
  'authUsers', (SELECT count(*) FROM auth.users), 'authForeignKeysSha256', ${digest('SELECT rows FROM foreign_keys')},
  'grantsRlsSha256', ${digest("SELECT coalesce(jsonb_agg(row ORDER BY row::text COLLATE \"C\"), '[]'::jsonb) FROM security_rows")},
  'legacyRows', (SELECT coalesce(sum(rows), 0) FROM counts WHERE nspname = 'public' AND relname IN
    ('comment_translator_paid_entitlements', 'comment_translator_paid_usage_counters', 'comment_translator_paid_usage_events')),
  'vaultRows', (SELECT count(*) FROM vault.secrets), 'storageObjects', (SELECT count(*) FROM storage.objects),
  'vectorCounts', jsonb_build_object('storage.buckets_vectors', (SELECT count(*) FROM storage.buckets_vectors),
    'storage.vector_indexes', (SELECT count(*) FROM storage.vector_indexes)))
)`; }
export const BACKUP_SOURCE_STATE_SQL = sourceStateSql(); // Preserve historical v1 bytes/semantics.

function validateSourceState(state, expectedHistoryCount) {
  const exact = (v, keys) => v && typeof v === 'object' && !Array.isArray(v) &&
    Object.keys(v).sort().join(',') === [...keys].sort().join(',');
  const sha = v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
  const count = v => Number.isSafeInteger(v) && v >= 0;
  if (!exact(state, ['historyCount', 'historySha256', 'rowCounts', 'authUsers', 'authForeignKeysSha256',
    'grantsRlsSha256', 'legacyRows', 'vaultRows', 'storageObjects', 'vectorCounts']) ||
    state.historyCount !== expectedHistoryCount || !['historySha256', 'authForeignKeysSha256', 'grantsRlsSha256'].every(k => sha(state[k])) ||
    !count(state.authUsers) || state.legacyRows !== 0 || state.vaultRows !== 0 || state.storageObjects !== 0 ||
    !exact(state.vectorCounts, ['storage.buckets_vectors', 'storage.vector_indexes']) ||
    Object.values(state.vectorCounts).some(v => v !== 0) || !Array.isArray(state.rowCounts) ||
    state.rowCounts.length === 0 || state.rowCounts.length > 256) throw Error('BACKUP_SOURCE_STATE_INVALID');
  let previous = '';
  for (const row of state.rowCounts) {
    if (!exact(row, ['identitySha256', 'rows']) || !sha(row.identitySha256) || row.identitySha256 <= previous || !count(row.rows))
      throw Error('BACKUP_SOURCE_STATE_INVALID');
    previous = row.identitySha256;
  }
  return state;
}

export function validateBackupSourceState(state) {
  if (state?.schemaVersion === 2) return validateCurrentBackupState(state);
  return validateSourceState(state, 22); // Historical receipts only.
}
// Internal local replay only; never used by Production capture or stage validation.
export function validateLocalReplaySourceState(state) { return validateSourceState(state, 26); }

// Same held snapshot, aggregate-only output. No business values leave in this
// record; the actual rows remain in the existing restricted data.sql artifact.
export const CURRENT_BACKUP_STATE_SQL = `(WITH base AS (SELECT ${sourceStateSql(true)} value),
 retained AS (
 SELECT c.oid,n.nspname,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE c.relkind IN ('r','p') AND (n.nspname='supabase_migrations' OR n.nspname !~ '${excludedPattern}')
 AND (n.nspname||'.'||c.relname) NOT IN (${BACKUP_DATA_EXCLUDED_TABLES.map(s=>"'"+s+"'").join(',')})
 ), contents AS (
 SELECT encode(sha256(convert_to(jsonb_build_array(nspname,relname)::text,'UTF8')),'hex') identity,
 ((xpath('/table/row/d/text()',query_to_xml(format(
 'SELECT encode(sha256(convert_to(coalesce(string_agg(h, '''' ORDER BY h COLLATE "C"), ''''), ''UTF8'')), ''hex'') AS d FROM (SELECT encode(sha256(convert_to(to_jsonb(t)::text,''UTF8'')),''hex'') h FROM ONLY %I.%I t) r',
 nspname,relname),false,false,'')))[1]::text) digest FROM retained
 ), history AS (SELECT coalesce(jsonb_agg(jsonb_build_object('version',version,'name',name) ORDER BY version COLLATE "C"),'[]') rows FROM supabase_migrations.schema_migrations)
 SELECT value || jsonb_build_object('schemaVersion',2,'history',(SELECT rows FROM history),
 'structureSha256',${BACKUP_STRUCTURE_SQL},
 'sequencesSha256',(SELECT encode(sha256(convert_to(coalesce(jsonb_agg(jsonb_build_array(n.nspname,c.relname,query_to_xml(format('SELECT last_value,is_called FROM %I.%I',n.nspname,c.relname),false,false,'')::text) ORDER BY n.nspname COLLATE "C",c.relname COLLATE "C"),'[]')::text,'UTF8')),'hex') FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='S' AND n.nspname !~ '${excludedPattern}'),
 'archiveSchemaCount',(SELECT count(*) FROM pg_namespace WHERE nspname='comment_translator_paid_legacy_archive'),
 'archiveUnsafeCount',(SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='comment_translator_paid_legacy_archive' AND c.relkind IN ('r','p') AND
 (NOT c.relrowsecurity OR pg_get_userbyid(c.relowner)<>'postgres' OR EXISTS(SELECT 1 FROM aclexplode(c.relacl) a WHERE a.grantee=0 OR pg_get_userbyid(a.grantee) IN ('anon','authenticated','service_role')))),
 'archiveActiveTriggers',(SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='comment_translator_paid_legacy_archive' AND NOT t.tgisinternal AND t.tgenabled<>'D'),
 'archiveRows',coalesce((SELECT sum(((xpath('/table/row/n/text()',query_to_xml(format('SELECT count(*) n FROM ONLY %I.%I',n.nspname,c.relname),false,false,'')))[1]::text)::bigint) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='comment_translator_paid_legacy_archive' AND c.relkind IN ('r','p')),0),
 'rowDigests',(SELECT jsonb_agg(jsonb_build_object('identitySha256',identity,'sha256',digest) ORDER BY identity COLLATE "C") FROM contents)) FROM base)`;

function validateCurrentBackupState(state) {
  const keys=['schemaVersion','phase','history','structureSha256','sequencesSha256','archiveSchemaCount','archiveUnsafeCount','archiveActiveTriggers','archiveRows','rowDigests'];
  if (!keys.every(k=>Object.hasOwn(state,k)) || !Object.hasOwn(BACKUP_HISTORIES,state.phase)) throw Error('BACKUP_SOURCE_STATE_INVALID');
  const legacy=Object.fromEntries(Object.entries(state).filter(([k])=>!keys.includes(k)));
  const expected=BACKUP_HISTORIES[state.phase];
  // Canonical business rows may grow. Historic retired archive rows stay zero.
  validateSourceState({...legacy,legacyRows:0,historyCount:22},22);
  const identities=v=>v.map(x=>[x.version,x.name]);
  if (state.historyCount!==expected.length || !Array.isArray(state.history) ||
    state.history.some(x=>Object.keys(x).sort().join()!=='name,version') ||
    JSON.stringify(identities(state.history))!==JSON.stringify(identities(expected)) ||
    !['structureSha256','sequencesSha256'].every(k=>/^[a-f0-9]{64}$/.test(state[k])) ||
    state.archiveSchemaCount!==(state.phase==='pre22'?0:1) || state.archiveUnsafeCount!==0 ||
    state.archiveActiveTriggers!==0 || state.archiveRows!==0 ||
    (state.phase==='pre22'&&state.legacyRows!==0) || !Number.isSafeInteger(state.legacyRows) || state.legacyRows<0 ||
    !Array.isArray(state.rowDigests) || state.rowDigests.length!==state.rowCounts.length) throw Error('BACKUP_SOURCE_STATE_INVALID');
  state.rowDigests.forEach((r,i)=>{if(Object.keys(r).sort().join()!=='identitySha256,sha256'||r.identitySha256!==state.rowCounts[i].identitySha256||!/^[a-f0-9]{64}$/.test(r.sha256))throw Error('BACKUP_SOURCE_STATE_INVALID');});
  return state;
}
