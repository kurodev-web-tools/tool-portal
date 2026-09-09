import { createHash } from 'node:crypto';
import { parseRestoreSql } from './comment-translator-paid-core-v1-gate1-restore-sql.mjs';
import { parseAtomicSequenceSetter, atomicSequenceGuard } from './comment-translator-paid-core-v1-gate1-atomic-sequence.mjs';
import { BACKUP_SOURCE_STATE_SQL, validateBackupSourceState, validateLocalReplaySourceState } from './comment-translator-paid-core-v1-gate1-backup-state.mjs';

const names = ['roles.sql', 'schema.sql', 'auth_storage_changes.sql', 'data.sql', 'history_schema.sql', 'history_data.sql'];
const tokens = ['confirmation_token', 'recovery_token', 'email_change_token_current', 'email_change_token_new', 'reauthentication_token', 'phone_change_token'];
const methods = ['magiclink', 'recovery', 'email/signup', 'email_change'];
const list = values => values.map(x => `'${x}'`).join(',');
const hash = value => createHash('sha256').update(value).digest('hex');
const exact = (v, keys) => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).sort().join(',') === [...keys].sort().join(',');

// Shape pin includes every Auth column/type/default, constraint, enum and
// function definition. New managed credential surfaces require a new review.
export const ATOMIC_MANAGED_SHAPE_SQL = `(SELECT encode(sha256(convert_to(coalesce(jsonb_agg(v ORDER BY v::text COLLATE "C"),'[]'::jsonb)::text,'UTF8')),'hex') FROM (
  SELECT jsonb_build_array('column',c.relname,a.attname,format_type(a.atttypid,a.atttypmod),a.attnotnull,a.attidentity,a.attgenerated,pg_get_expr(d.adbin,d.adrelid)) v
    FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
    WHERE n.nspname='auth' AND a.attnum>0 AND NOT a.attisdropped AND c.relkind IN ('r','p')
  UNION ALL SELECT jsonb_build_array('constraint',c.relname,x.conname,pg_get_constraintdef(x.oid),x.convalidated)
    FROM pg_constraint x JOIN pg_class c ON c.oid=x.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='auth'
  UNION ALL SELECT jsonb_build_array('enum',t.typname,e.enumlabel,e.enumsortorder) FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='auth'
  UNION ALL SELECT jsonb_build_array('function',p.proname,pg_get_function_identity_arguments(p.oid),pg_get_functiondef(p.oid)) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='auth' AND p.prokind IN ('f','p')
) shape)`;

// Fingerprints contain no row values. Every ordinary user table (including
// migration history and enrolled factors) is included, with duplicate rows kept.
// The expected projection changes only the fixed credential allowlist.
export const ATOMIC_FINGERPRINT_SETUP_SQL = `
CREATE FUNCTION pg_temp.ct_atomic_fingerprint(project_reset boolean) RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog,public AS $ct$
DECLARE atomic_relation record; atomic_projection text; atomic_predicate text; atomic_value text; atomic_result jsonb := '{}'::jsonb; atomic_total integer := 0;
BEGIN
  FOR atomic_relation IN SELECT n.nspname, c.relname, c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema' AND c.relkind IN ('r','p','S')
    ORDER BY n.nspname COLLATE "C", c.relname COLLATE "C"
  LOOP
    atomic_total := atomic_total + 1;
    IF atomic_total > 256 THEN RAISE EXCEPTION 'ATOMIC_TABLE_LIMIT'; END IF;
    atomic_projection := 'to_jsonb(t)'; atomic_predicate := 'true';
    IF atomic_relation.relkind='S' THEN atomic_projection := 'jsonb_build_object(''last_value'',t.last_value,''log_cnt'',t.log_cnt,''is_called'',t.is_called)'; END IF;
    IF project_reset AND atomic_relation.nspname='auth' THEN
      IF atomic_relation.relname IN ('sessions','refresh_tokens','mfa_amr_claims','one_time_tokens') THEN atomic_predicate := 'false'; END IF;
      IF atomic_relation.relname='flow_state' THEN atomic_predicate := 'NOT (provider_type=''email'' AND authentication_method IN (${list(methods).replaceAll("'", "''")})) OR provider_type IS NULL OR authentication_method IS NULL'; END IF;
      IF atomic_relation.relname='users' THEN
        atomic_projection := 'to_jsonb(t) ${tokens.map(c => `|| jsonb_build_object(''${c}'', CASE WHEN t.${c} <> '''' THEN '''' ELSE t.${c} END)`).join(' ')}';
      END IF;
    END IF;
    EXECUTE format('SELECT encode(sha256(convert_to(coalesce(jsonb_agg(v ORDER BY v::text COLLATE "C"), ''[]''::jsonb)::text, ''UTF8'')), ''hex'') FROM (SELECT %s AS v FROM %s %I.%I t WHERE %s) s', atomic_projection, CASE WHEN atomic_relation.relkind='S' THEN '' ELSE 'ONLY' END, atomic_relation.nspname, atomic_relation.relname, atomic_predicate) INTO atomic_value;
    atomic_result := atomic_result || jsonb_build_object(encode(sha256(convert_to(jsonb_build_array(atomic_relation.nspname,atomic_relation.relname)::text,'UTF8')),'hex'),atomic_value);
  END LOOP;
  RETURN jsonb_build_object('tables',atomic_result,'security', (${BACKUP_SOURCE_STATE_SQL}) - 'rowCounts',
    'definitions', (SELECT encode(sha256(convert_to(coalesce(jsonb_agg(v ORDER BY v::text COLLATE "C"),'[]'::jsonb)::text,'UTF8')),'hex') FROM (
      SELECT jsonb_build_array('function',n.nspname,p.proname,pg_get_function_identity_arguments(p.oid),pg_get_functiondef(p.oid)) v
        FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema' AND p.prokind IN ('f','p')
      UNION ALL SELECT jsonb_build_array('constraint',n.nspname,c.relname,x.conname,pg_get_constraintdef(x.oid),x.convalidated)
        FROM pg_constraint x JOIN pg_class c ON c.oid=x.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname !~ '^pg_'
      UNION ALL SELECT jsonb_build_array('trigger',n.nspname,c.relname,t.tgname,pg_get_triggerdef(t.oid),t.tgenabled)
        FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname !~ '^pg_'
      UNION ALL SELECT jsonb_build_array('index',schemaname,tablename,indexname,indexdef) FROM pg_indexes WHERE schemaname !~ '^pg_'
      UNION ALL SELECT jsonb_build_array('column',n.nspname,c.relname,to_jsonb(a),pg_get_expr(d.adbin,d.adrelid))
        FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
        WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema' AND a.attnum>0
      UNION ALL SELECT jsonb_build_array('view',schemaname,viewname,viewowner,definition) FROM pg_views WHERE schemaname !~ '^pg_' AND schemaname <> 'information_schema'
      UNION ALL SELECT jsonb_build_array('rule',schemaname,tablename,rulename,definition) FROM pg_rules WHERE schemaname !~ '^pg_'
      UNION ALL SELECT jsonb_build_array('role',to_jsonb(r)) FROM pg_authid r
      UNION ALL SELECT jsonb_build_array('membership',to_jsonb(m)) FROM pg_auth_members m
    ) definitions));
END $ct$;
`;

const guardSql = `
DO $ct$ BEGIN
  IF current_setting('server_version_num')::integer / 10000 <> 17 THEN RAISE EXCEPTION 'ATOMIC_VERSION_UNSUPPORTED'; END IF;
  IF ${ATOMIC_MANAGED_SHAPE_SQL} NOT IN ('2c7ef5df6baeae47ac2dd21b566e77177578cc2aa7c36d5921866434f4bc2d4c','8358275c2842cfe35ab42bc5280bcfa95f253435da9363f998dcfcfde7b68b4a') THEN RAISE EXCEPTION 'ATOMIC_MANAGED_SHAPE_UNSUPPORTED'; END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema' AND c.relkind IN ('f','m')) THEN RAISE EXCEPTION 'ATOMIC_RELATION_UNSUPPORTED'; END IF;
  IF EXISTS (SELECT 1 FROM auth.saml_relay_states) OR EXISTS (SELECT 1 FROM auth.saml_providers) THEN RAISE EXCEPTION 'ATOMIC_SAML_UNSUPPORTED'; END IF;
  IF (SELECT array_agg(e.enumlabel::text ORDER BY e.enumlabel::text) FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='auth' AND t.typname='one_time_token_type') IS DISTINCT FROM ARRAY[${list([...tokens].sort())}]::text[] THEN RAISE EXCEPTION 'ATOMIC_TOKEN_TYPE_UNSUPPORTED'; END IF;
  IF EXISTS (SELECT 1 FROM auth.flow_state WHERE provider_type='email' AND (authentication_method IS NULL OR authentication_method NOT IN (${list(methods)}))) THEN RAISE EXCEPTION 'ATOMIC_FLOW_UNSUPPORTED'; END IF;
  IF EXISTS (SELECT 1 FROM auth.flow_state WHERE provider_type IS NULL OR provider_type NOT IN ('email','synthetic-unrelated','unrelated') OR (provider_type <> 'email' AND authentication_method IS DISTINCT FROM 'oauth')) THEN RAISE EXCEPTION 'ATOMIC_FLOW_UNSUPPORTED'; END IF;
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN ('auth.users'::regclass,'auth.sessions'::regclass,'auth.refresh_tokens'::regclass,'auth.one_time_tokens'::regclass,'auth.flow_state'::regclass,'auth.mfa_amr_claims'::regclass,'auth.saml_relay_states'::regclass)) THEN RAISE EXCEPTION 'ATOMIC_TRIGGER_UNSUPPORTED'; END IF;
  IF EXISTS (SELECT 1 FROM pg_rewrite WHERE ev_class IN ('auth.users'::regclass,'auth.sessions'::regclass,'auth.refresh_tokens'::regclass,'auth.one_time_tokens'::regclass,'auth.flow_state'::regclass,'auth.mfa_amr_claims'::regclass,'auth.saml_relay_states'::regclass)) THEN RAISE EXCEPTION 'ATOMIC_RULE_UNSUPPORTED'; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype='f' AND confrelid IN ('auth.sessions'::regclass,'auth.refresh_tokens'::regclass,'auth.one_time_tokens'::regclass,'auth.flow_state'::regclass,'auth.mfa_amr_claims'::regclass,'auth.saml_relay_states'::regclass) AND NOT (
    confdeltype='c' AND ((confrelid='auth.sessions'::regclass AND conrelid IN ('auth.refresh_tokens'::regclass,'auth.mfa_amr_claims'::regclass)) OR (confrelid='auth.flow_state'::regclass AND conrelid='auth.saml_relay_states'::regclass)))) THEN RAISE EXCEPTION 'ATOMIC_DEPENDENCY_UNSUPPORTED'; END IF;
END $ct$;
`;

// Internal SQL construction seam, not source provenance or hosted authority.
// Native callers must bind published producers, managed-baseline identity and
// destination before execution, own ON_ERROR_STOP and the external watchdog,
// then require successful process closure plus independent committed readback.
export function buildAtomicRestore(request, { localReplay = false } = {}) {
  try {
    if (!exact(request, ['artifacts', 'sourceState'])) throw Error();
    const sourceState = structuredClone((localReplay ? validateLocalReplaySourceState : validateBackupSourceState)(request.sourceState));
    if (!Array.isArray(request.artifacts) || request.artifacts.length !== 6) throw Error();
    const artifacts = request.artifacts.map((a, i) => {
      if (!exact(a, ['name','sql','bytes','sha256']) || a.name !== names[i] || typeof a.sql !== 'string' ||
          !a.sql.isWellFormed() || a.sql.includes('\0') || !Number.isSafeInteger(a.bytes) || a.bytes < (i===2 ? 0 : 1) ||
          a.bytes > 32*1024*1024 || Buffer.byteLength(a.sql) !== a.bytes || hash(a.sql) !== a.sha256) throw Error();
      const sequences = [];
      if (a.sql.trim()) for (const span of parseRestoreSql(a.sql, { allowCopyText: true, allowTriviaOnly: i === 2 })) {
        if (span.kind !== 'sql') continue;
        const words = span.tokens.filter(t => t.kind === 'word' || t.kind === 'identifier').map(t => t.value.toUpperCase());
        if (['BEGIN','END','COMMIT','ROLLBACK','ABORT','START','SAVEPOINT','RELEASE','PREPARE','VACUUM','DISCARD','CALL'].includes(words[0]) ||
            words.includes('CONCURRENTLY') || words[0] === 'SELECT' && words.includes('NEXTVAL') ||
            ['CREATE','ALTER','DROP'].includes(words[0]) && ['DATABASE','TABLESPACE','SUBSCRIPTION'].includes(words[1])) throw Error();
        if (words.includes('SETVAL')) {
          if (![3,5].includes(i)) throw Error();
          const setter = parseAtomicSequenceSetter(a.sql, span);
          if (sequences.some(s => s.schema === setter.schema && s.sequence === setter.sequence)) throw Error();
          sequences.push(setter);
          if (sequences.length > 256) throw Error();
        }
      }
      return { ...a, sequences };
    });
    const sourceLiteral = JSON.stringify(sourceState).replaceAll("'", "''");
    const sql = `BEGIN;
SET LOCAL statement_timeout='600000';
SET LOCAL lock_timeout='10000';
SET LOCAL row_security=off;
${artifacts.map(a => [...a.sequences.map(atomicSequenceGuard), a.sql].join('\n')).join('\n')}
SET LOCAL row_security=off;
SET LOCAL session_replication_role=origin;
SET LOCAL search_path=pg_catalog,public;
DO $ct$ BEGIN IF (${BACKUP_SOURCE_STATE_SQL}) IS DISTINCT FROM '${sourceLiteral}'::jsonb THEN RAISE EXCEPTION 'ATOMIC_SOURCE_STATE_MISMATCH'; END IF; END $ct$;
${guardSql}
${ATOMIC_FINGERPRINT_SETUP_SQL}
CREATE TEMP TABLE ct_atomic_expected ON COMMIT DROP AS SELECT pg_temp.ct_atomic_fingerprint(true) AS value;
DELETE FROM auth.refresh_tokens;
DELETE FROM auth.sessions;
DELETE FROM auth.one_time_tokens WHERE token_type IN (${list(tokens)});
${tokens.map(c => `UPDATE auth.users SET ${c}='' WHERE ${c} <> '';`).join('\n')}
DELETE FROM auth.flow_state WHERE provider_type='email' AND authentication_method IN (${list(methods)});
DO $ct$ BEGIN IF pg_temp.ct_atomic_fingerprint(false) IS DISTINCT FROM (SELECT value FROM ct_atomic_expected) THEN RAISE EXCEPTION 'ATOMIC_DELTA_MISMATCH'; END IF; END $ct$;
SELECT jsonb_build_object('kind','atomic-precommit-v1','fingerprint',(SELECT value FROM ct_atomic_expected));
COMMIT;
`;
    return { schemaVersion: 1, sql, artifacts: artifacts.map(({ name, bytes, sha256 }) => ({ name, bytes, sha256 })), stageAuthority: false, gate: 'NO-GO' };
  } catch { throw Error('ATOMIC_RESTORE_INPUT_REJECTED'); }
}
