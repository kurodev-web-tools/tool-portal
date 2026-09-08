import { spawnSync } from "node:child_process";

import { parseStrictJson } from "./comment-translator-paid-core-v1-gate1-evidence.mjs";
import { inspectPostApplyCatalogArtifact } from "./comment-translator-paid-core-v1-gate1-postapply-catalog.mjs";

const REQUEST_KEYS = Object.freeze([
  "target",
  "sourceCommit",
  "migrationCorpusSha256",
  "targetBindingSha256"
]);
const ROW_KEYS = Object.freeze([
  "readOnly",
  "history",
  "canonical",
  "archive",
  "sourceEra",
  "edgeScopeVersion",
  "pgDependEdges"
]);
const COMMIT_PATTERN = /^[a-f0-9]{40}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const MAX_OUTPUT_BYTES = 1024 * 1024;
const POSTAPPLY_STATUS = "POSTAPPLY_CATALOG_OBSERVED";
const UNAVAILABLE_STATUS = "POSTAPPLY_CATALOG_UNAVAILABLE";
const REASONS = Object.freeze({
  REQUEST_INVALID: "POSTAPPLY_CATALOG_REQUEST_INVALID",
  TARGET_BINDING_MISSING: "POSTAPPLY_CATALOG_TARGET_BINDING_MISSING",
  TARGET_BINDING_INVALID: "POSTAPPLY_CATALOG_TARGET_BINDING_INVALID",
  TARGET_BINDING_DIGEST_MISMATCH: "POSTAPPLY_CATALOG_TARGET_BINDING_DIGEST_MISMATCH",
  CONNECTION_BINDING_MISMATCH: "POSTAPPLY_CATALOG_CONNECTION_BINDING_MISMATCH",
  TLS_CONTEXT_INVALID: "POSTAPPLY_CATALOG_TLS_CONTEXT_INVALID",
  CONNECTION_FAILED: "POSTAPPLY_CATALOG_CONNECTION_FAILED",
  CAPTURE_INVALID: "POSTAPPLY_CATALOG_CAPTURE_INVALID",
  JSON_INVALID: "POSTAPPLY_CATALOG_JSON_INVALID",
  SHAPE_INVALID: "POSTAPPLY_CATALOG_SHAPE_INVALID"
});

/*
 * This is intentionally one fixed transaction. It observes every public
 * comment_translator_paid_ relation and ct_paid_ function, all archive
 * relations/functions, and the six/seven source-era names retained by Gate 1.
 * The query does not accept SQL, relation names, or connection values from a
 * caller. Its final SELECT is the only emitted row; ROLLBACK closes the read
 * only transaction without changing the database.
 */
export const POSTAPPLY_CATALOG_SQL = String.raw`BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '5s';
WITH RECURSIVE
source_table_names(name) AS (VALUES
  ('comment_translator_creator_history'),
  ('comment_translator_custom_dictionary_entries'),
  ('comment_translator_moderator_share_browser_sessions'),
  ('comment_translator_moderator_share_tokens'),
  ('comment_translator_obs_overlay_browser_sessions'),
  ('comment_translator_obs_overlay_tokens')
),
source_function_names(name) AS (VALUES
  ('create_comment_translator_custom_dictionary_entry'),
  ('delete_comment_translator_custom_dictionary_entry'),
  ('revoke_comment_translator_moderator_share_token'),
  ('revoke_comment_translator_obs_overlay_token'),
  ('update_comment_translator_custom_dictionary_entry'),
  ('write_comment_translator_moderator_share_token'),
  ('write_comment_translator_obs_overlay_token')
),
scope_tables AS (
  SELECT 'canonical'::text AS scope, c.oid, n.nspname AS schema_name, c.relname AS table_name,
    c.relowner, c.relrowsecurity, c.relacl
  FROM pg_catalog.pg_class AS c
  JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
    AND left(c.relname, length('comment_translator_paid_')) = 'comment_translator_paid_'
  UNION ALL
  SELECT 'archive'::text, c.oid, n.nspname, c.relname, c.relowner, c.relrowsecurity, c.relacl
  FROM pg_catalog.pg_class AS c
  JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'comment_translator_paid_legacy_archive' AND c.relkind IN ('r', 'p')
  UNION ALL
  SELECT 'sourceEra'::text, c.oid, n.nspname, c.relname, c.relowner, c.relrowsecurity, c.relacl
  FROM pg_catalog.pg_class AS c
  JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
  JOIN source_table_names AS s ON s.name = c.relname
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
),
scope_functions AS (
  SELECT 'canonical'::text AS scope, p.oid, n.nspname AS schema_name, p.proname AS function_name,
    p.prorettype, p.proowner, p.prosecdef, p.proconfig, p.proacl
  FROM pg_catalog.pg_proc AS p
  JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND left(p.proname, length('ct_paid_')) = 'ct_paid_'
  UNION ALL
  SELECT 'archive'::text, p.oid, n.nspname, p.proname, p.prorettype, p.proowner, p.prosecdef, p.proconfig, p.proacl
  FROM pg_catalog.pg_proc AS p
  JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
  WHERE n.nspname = 'comment_translator_paid_legacy_archive'
  UNION ALL
  SELECT 'sourceEra'::text, p.oid, n.nspname, p.proname, p.prorettype, p.proowner, p.prosecdef, p.proconfig, p.proacl
  FROM pg_catalog.pg_proc AS p
  JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
  JOIN source_function_names AS s ON s.name = p.proname
  WHERE n.nspname = 'public'
),
table_rows AS (
  SELECT st.scope, st.oid, st.schema_name, st.table_name,
    jsonb_build_object(
      'schema', st.schema_name,
      'name', st.table_name,
      'owner', pg_get_userbyid(st.relowner),
      'rlsEnabled', st.relrowsecurity,
      'rowCount', (SELECT (xpath('/table/row/count/text()', query_to_xml(format('SELECT count(*) AS count FROM %I.%I', st.schema_name, st.table_name), true, false, '')))[1]::text::bigint),
      'columns', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'schema', st.schema_name, 'table', st.table_name, 'ordinal', a.attnum,
        'name', a.attname, 'type', format_type(a.atttypid, a.atttypmod), 'notNull', a.attnotnull,
        'defaultDefinition', CASE WHEN d.adbin IS NULL THEN NULL ELSE btrim(replace(pg_get_expr(d.adbin, d.adrelid), E'\r\n', E'\n')) END
      ) ORDER BY a.attnum) FROM pg_catalog.pg_attribute AS a
        LEFT JOIN pg_catalog.pg_attrdef AS d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
        WHERE a.attrelid = st.oid AND a.attnum > 0 AND NOT a.attisdropped), '[]'::jsonb),
      'constraints', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'schema', st.schema_name, 'table', st.table_name, 'name', con.conname,
        'type', con.contype, 'definition', btrim(replace(pg_get_constraintdef(con.oid, true), E'\r\n', E'\n'))
      ) ORDER BY con.conname COLLATE "C", con.contype::text COLLATE "C") FROM pg_catalog.pg_constraint AS con WHERE con.conrelid = st.oid), '[]'::jsonb),
      'indexes', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'schema', st.schema_name, 'table', st.table_name, 'name', ic.relname,
        'definition', btrim(replace(pg_get_indexdef(i.indexrelid, 0, true), E'\r\n', E'\n'))
      ) ORDER BY ic.relname COLLATE "C") FROM pg_catalog.pg_index AS i
        JOIN pg_catalog.pg_class AS ic ON ic.oid = i.indexrelid WHERE i.indrelid = st.oid), '[]'::jsonb),
      'policies', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'schema', st.schema_name, 'table', st.table_name, 'name', pol.polname,
        'command', CASE pol.polcmd WHEN '*' THEN 'ALL' WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT' WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE' ELSE pol.polcmd::text END,
        'permissive', pol.polpermissive,
        'roles', coalesce((SELECT jsonb_agg(CASE WHEN role_oid = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(role_oid) END ORDER BY (CASE WHEN role_oid = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(role_oid) END) COLLATE "C") FROM unnest(pol.polroles) AS role_oid), '[]'::jsonb),
        'usingDefinition', CASE WHEN pol.polqual IS NULL THEN NULL ELSE btrim(replace(pg_get_expr(pol.polqual, pol.polrelid), E'\r\n', E'\n')) END,
        'checkDefinition', CASE WHEN pol.polwithcheck IS NULL THEN NULL ELSE btrim(replace(pg_get_expr(pol.polwithcheck, pol.polrelid), E'\r\n', E'\n')) END
      ) ORDER BY pol.polname COLLATE "C") FROM pg_catalog.pg_policy AS pol WHERE pol.polrelid = st.oid), '[]'::jsonb),
      'acls', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'schema', st.schema_name, 'objectKind', 'table', 'objectIdentity', format('%I.%I', st.schema_name, st.table_name),
        'grantee', CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(acl.grantee) END,
        'privilege', acl.privilege_type, 'grantable', acl.is_grantable
      ) ORDER BY (CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(acl.grantee) END) COLLATE "C", acl.privilege_type COLLATE "C", acl.is_grantable)
        FROM aclexplode(coalesce(st.relacl, acldefault('r', st.relowner))) AS acl), '[]'::jsonb)
    ) AS row_json
  FROM scope_tables AS st
),
function_rows AS (
  SELECT sf.scope, sf.oid, sf.schema_name, sf.function_name,
    jsonb_build_object(
      'schema', sf.schema_name,
      'name', sf.function_name,
      'identityArguments', pg_get_function_identity_arguments(sf.oid),
      'resultType', format_type(sf.prorettype, NULL::integer),
      'owner', pg_get_userbyid(sf.proowner),
      'securityDefiner', sf.prosecdef,
      'config', coalesce((SELECT jsonb_agg(config_value ORDER BY config_value COLLATE "C") FROM unnest(coalesce(sf.proconfig, ARRAY[]::text[])) AS config_value), '[]'::jsonb),
      'acls', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'schema', sf.schema_name, 'objectKind', 'function',
        'objectIdentity', format('%I.%I(%s)', sf.schema_name, sf.function_name, pg_get_function_identity_arguments(sf.oid)),
        'grantee', CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(acl.grantee) END,
        'privilege', acl.privilege_type, 'grantable', acl.is_grantable
      ) ORDER BY (CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(acl.grantee) END) COLLATE "C", acl.privilege_type COLLATE "C", acl.is_grantable)
        FROM aclexplode(coalesce(sf.proacl, acldefault('f', sf.proowner))) AS acl), '[]'::jsonb),
      'definitionMd5', md5(pg_get_functiondef(sf.oid))
    ) AS row_json
  FROM scope_functions AS sf
),
trigger_rows AS (
  SELECT st.scope,
    jsonb_build_object(
      'tableSchema', st.schema_name, 'tableName', st.table_name, 'name', t.tgname,
      'enabled', t.tgenabled <> 'D',
      'functionIdentity', format('%I.%I(%s)', fn_ns.nspname, fn.proname, pg_get_function_identity_arguments(fn.oid)),
      'definition', btrim(replace(pg_get_triggerdef(t.oid, true), E'\r\n', E'\n'))
    ) AS row_json,
    t.oid AS oid, st.oid AS table_oid
  FROM scope_tables AS st
  JOIN pg_catalog.pg_trigger AS t ON t.tgrelid = st.oid AND NOT t.tgisinternal
  JOIN pg_catalog.pg_proc AS fn ON fn.oid = t.tgfoid
  JOIN pg_catalog.pg_namespace AS fn_ns ON fn_ns.oid = fn.pronamespace
),
dependency_counts AS (
  SELECT scopes.scope,
    (SELECT count(*)::bigint FROM pg_catalog.pg_constraint AS f WHERE f.contype = 'f'
      AND f.confrelid IN (SELECT oid FROM scope_tables WHERE scope = scopes.scope)
      AND f.conrelid NOT IN (SELECT oid FROM scope_tables WHERE scope = scopes.scope)) AS inbound_foreign_keys,
    (SELECT count(*)::bigint FROM pg_catalog.pg_depend AS d JOIN pg_catalog.pg_rewrite AS r ON d.classid = 'pg_catalog.pg_rewrite'::regclass AND d.objid = r.oid
      JOIN pg_catalog.pg_class AS v ON v.oid = r.ev_class WHERE d.refclassid = 'pg_catalog.pg_class'::regclass
      AND d.refobjid IN (SELECT oid FROM scope_tables WHERE scope = scopes.scope) AND v.relkind = 'v'
      AND v.oid NOT IN (SELECT oid FROM scope_tables WHERE scope = scopes.scope)) AS views,
    (SELECT count(*)::bigint FROM pg_catalog.pg_depend AS d JOIN pg_catalog.pg_rewrite AS r ON d.classid = 'pg_catalog.pg_rewrite'::regclass AND d.objid = r.oid
      JOIN pg_catalog.pg_class AS v ON v.oid = r.ev_class WHERE d.refclassid = 'pg_catalog.pg_class'::regclass
      AND d.refobjid IN (SELECT oid FROM scope_tables WHERE scope = scopes.scope) AND v.relkind = 'm'
      AND v.oid NOT IN (SELECT oid FROM scope_tables WHERE scope = scopes.scope)) AS materialized_views,
    (SELECT count(*)::bigint FROM pg_catalog.pg_rewrite AS r WHERE r.ev_class IN (SELECT oid FROM scope_tables WHERE scope = scopes.scope) AND r.rulename <> '_RETURN') AS rules,
    (SELECT count(*)::bigint FROM pg_catalog.pg_policy AS p WHERE p.polrelid IN (SELECT oid FROM scope_tables WHERE scope = scopes.scope)) AS policies,
    (SELECT count(*)::bigint FROM pg_catalog.pg_trigger AS t WHERE t.tgrelid IN (SELECT oid FROM scope_tables WHERE scope = scopes.scope) AND NOT t.tgisinternal) AS user_triggers,
    (SELECT count(*)::bigint FROM pg_catalog.pg_depend AS d WHERE d.refclassid = 'pg_catalog.pg_event_trigger'::regclass
      AND d.refobjid IN (SELECT oid FROM scope_tables WHERE scope = scopes.scope)) AS event_triggers,
    (SELECT count(*)::bigint FROM pg_catalog.pg_publication_rel AS p WHERE p.prrelid IN (SELECT oid FROM scope_tables WHERE scope = scopes.scope)) AS publications,
    (SELECT count(*)::bigint FROM pg_catalog.pg_proc AS p JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.oid NOT IN (SELECT oid FROM scope_functions WHERE scope = scopes.scope)
      AND EXISTS (SELECT 1 FROM scope_tables AS st WHERE st.scope = scopes.scope
        AND position(format('%I.%I', st.schema_name, st.table_name) in pg_get_functiondef(p.oid)) > 0)) AS outside_function_source_references,
    (SELECT count(*)::bigint FROM pg_catalog.pg_depend AS d WHERE d.deptype = 'n' AND (
      (d.classid = 'pg_catalog.pg_class'::regclass AND d.objid IN (SELECT oid FROM scope_tables WHERE scope = scopes.scope))
      OR (d.classid = 'pg_catalog.pg_proc'::regclass AND d.objid IN (SELECT oid FROM scope_functions WHERE scope = scopes.scope))
      OR (d.refclassid = 'pg_catalog.pg_class'::regclass AND d.refobjid IN (SELECT oid FROM scope_tables WHERE scope = scopes.scope))
      OR (d.refclassid = 'pg_catalog.pg_proc'::regclass AND d.refobjid IN (SELECT oid FROM scope_functions WHERE scope = scopes.scope)))) AS unexpected_pg_depend_edges
  FROM (VALUES ('canonical'::text), ('archive'::text), ('sourceEra'::text)) AS scopes(scope)
),
scope_states AS (
  SELECT scopes.scope,
    jsonb_build_object(
      'tables', coalesce((SELECT jsonb_agg(row_json ORDER BY (row_json->>'schema') COLLATE "C", (row_json->>'name') COLLATE "C") FROM table_rows WHERE scope = scopes.scope), '[]'::jsonb),
      'functions', coalesce((SELECT jsonb_agg(row_json ORDER BY (row_json->>'schema') COLLATE "C", (row_json->>'name') COLLATE "C", (row_json->>'identityArguments') COLLATE "C") FROM function_rows WHERE scope = scopes.scope), '[]'::jsonb),
      'triggers', coalesce((SELECT jsonb_agg(row_json ORDER BY (row_json->>'tableSchema') COLLATE "C", (row_json->>'tableName') COLLATE "C", (row_json->>'name') COLLATE "C") FROM trigger_rows WHERE scope = scopes.scope), '[]'::jsonb),
      'dependencyCounts', (SELECT jsonb_build_object(
        'inboundForeignKeys', inbound_foreign_keys, 'views', views, 'materializedViews', materialized_views,
        'rules', rules, 'policies', policies, 'userTriggers', user_triggers, 'eventTriggers', event_triggers,
        'publications', publications, 'outsideFunctionSourceReferences', outside_function_source_references,
        'unexpectedPgDependEdges', unexpected_pg_depend_edges) FROM dependency_counts WHERE scope = scopes.scope)
    ) AS state
  FROM (VALUES ('canonical'::text), ('archive'::text), ('sourceEra'::text)) AS scopes(scope)
),
seed_addresses AS (
  SELECT scope, 'pg_catalog.pg_class'::regclass::oid AS classid, oid AS objid, 0 AS objsubid FROM scope_tables
  UNION ALL SELECT scope, 'pg_catalog.pg_proc'::regclass::oid, oid, 0 FROM scope_functions
  UNION ALL SELECT scope, 'pg_catalog.pg_trigger'::regclass::oid, oid, 0 FROM trigger_rows
  UNION ALL SELECT st.scope, 'pg_catalog.pg_class'::regclass::oid, st.oid, a.attnum
    FROM scope_tables AS st JOIN pg_catalog.pg_attribute AS a ON a.attrelid = st.oid AND a.attnum > 0 AND NOT a.attisdropped
),
address_closure AS (
  SELECT scope, classid, objid, objsubid FROM seed_addresses
  UNION
  SELECT closure.scope, d.classid, d.objid, d.objsubid
  FROM address_closure AS closure
  JOIN pg_catalog.pg_depend AS d ON d.refclassid = closure.classid AND d.refobjid = closure.objid AND d.refobjsubid = closure.objsubid
  WHERE d.deptype IN ('a', 'i')
),
catalog_classes AS (
  SELECT c.oid, n.nspname, c.relname
  FROM pg_catalog.pg_class AS c
  JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
),
edge_rows AS (
  SELECT scopes.scope,
    dependent_class.nspname || '.' || dependent_class.relname AS classid,
    referenced_class.nspname || '.' || referenced_class.relname AS refclassid,
    d.deptype::text AS deptype,
    jsonb_build_object('type', dep_obj.type, 'schema', dep_obj.schema, 'name', dep_obj.name, 'identity', dep_obj.identity) AS dependent,
    jsonb_build_object('type', ref_obj.type, 'schema', ref_obj.schema, 'name', ref_obj.name, 'identity', ref_obj.identity) AS referenced
  FROM (SELECT DISTINCT scope FROM address_closure) AS scopes
  JOIN pg_catalog.pg_depend AS d ON EXISTS (
    SELECT 1 FROM address_closure AS closure
    WHERE closure.scope = scopes.scope
      AND ((d.classid = closure.classid AND d.objid = closure.objid AND d.objsubid = closure.objsubid)
        OR (d.refclassid = closure.classid AND d.refobjid = closure.objid AND d.refobjsubid = closure.objsubid)))
  LEFT JOIN catalog_classes AS dependent_class ON dependent_class.oid = d.classid
  LEFT JOIN catalog_classes AS referenced_class ON referenced_class.oid = d.refclassid
  CROSS JOIN LATERAL pg_identify_object(d.classid, d.objid, d.objsubid) AS dep_obj(type, schema, name, identity)
  CROSS JOIN LATERAL pg_identify_object(d.refclassid, d.refobjid, d.refobjsubid) AS ref_obj(type, schema, name, identity)
),
edge_state AS (
  SELECT scope, coalesce(jsonb_agg(jsonb_build_object(
    'classid', classid, 'refclassid', refclassid, 'deptype', deptype,
    'dependent', dependent, 'referenced', referenced
  ) ORDER BY classid COLLATE "C", refclassid COLLATE "C", deptype COLLATE "C", (dependent->>'identity') COLLATE "C", (referenced->>'identity') COLLATE "C"), '[]'::jsonb) AS edges
  FROM edge_rows GROUP BY scope
),
history_rows AS (
  SELECT version::text AS version, name::text AS name FROM supabase_migrations.schema_migrations ORDER BY version::text COLLATE "C", name::text COLLATE "C"
)
SELECT regexp_replace(jsonb_build_object(
  'readOnly', jsonb_build_object(
    'serverVersionMajor', (current_setting('server_version_num')::integer / 10000)::text,
    'transactionReadOnly', current_setting('transaction_read_only'),
    'defaultTransactionReadOnly', current_setting('default_transaction_read_only'),
    'transactionIsolation', current_setting('transaction_isolation')
  ),
  'history', jsonb_build_object('rows', coalesce((SELECT jsonb_agg(jsonb_build_object('version', version, 'name', name) ORDER BY version COLLATE "C", name COLLATE "C") FROM history_rows), '[]'::jsonb)),
  'canonical', (SELECT state FROM scope_states WHERE scope = 'canonical'),
  'archive', (SELECT state FROM scope_states WHERE scope = 'archive'),
  'sourceEra', (SELECT state FROM scope_states WHERE scope = 'sourceEra'),
  'edgeScopeVersion', 1,
  'pgDependEdges', jsonb_build_object(
    'canonical', coalesce((SELECT edges FROM edge_state WHERE scope = 'canonical'), '[]'::jsonb),
    'archive', coalesce((SELECT edges FROM edge_state WHERE scope = 'archive'), '[]'::jsonb),
    'sourceEra', coalesce((SELECT edges FROM edge_state WHERE scope = 'sourceEra'), '[]'::jsonb)
  )
)::text, E'("(?:[^"\\\\]|\\\\.)*")|[[:space:]]+', E'\\1', 'g');
ROLLBACK;`;

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, keys) {
  return isRecord(value) && Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function requestIsValid(request) {
  return exactKeys(request, REQUEST_KEYS)
    && (request.target === "preview" || request.target === "production")
    && typeof request.sourceCommit === "string"
    && typeof request.migrationCorpusSha256 === "string"
    && typeof request.targetBindingSha256 === "string"
    && COMMIT_PATTERN.test(request.sourceCommit)
    && SHA256_PATTERN.test(request.migrationCorpusSha256)
    && SHA256_PATTERN.test(request.targetBindingSha256);
}

function summaryOf(value) {
  const result = inspectPostApplyCatalogArtifact(value);
  return {
    target: result.target,
    canonicalTableCount: result.canonicalTableCount,
    canonicalFunctionCount: result.canonicalFunctionCount,
    archiveTableCount: result.archiveTableCount,
    archiveFunctionCount: result.archiveFunctionCount,
    sourceEraTableCount: result.sourceEraTableCount,
    sourceEraFunctionCount: result.sourceEraFunctionCount
  };
}

function result(status, reason, artifact, remoteCalls) {
  const summary = summaryOf(artifact);
  const output = { status, reason, ...summary, remoteCalls, mutations: 0 };
  Object.defineProperty(output, "artifact", {
    configurable: false,
    enumerable: false,
    writable: false,
    value: artifact ?? null
  });
  return output;
}

function unavailable(reason, artifact = null, remoteCalls = 0) {
  return result(UNAVAILABLE_STATUS, reason, artifact, remoteCalls);
}

function parseSingleJsonRow(stdout, rowCount) {
  if (typeof stdout !== "string" || rowCount !== 1 || Buffer.byteLength(stdout, "utf8") > MAX_OUTPUT_BYTES) throw new Error("capture");
  const lines = stdout.split(/\r?\n/).filter((line) => line.length > 0);
  if (lines.length !== 1) throw new Error("row-count");
  const parsed = parseStrictJson(lines[0]);
  if (!exactKeys(parsed, ROW_KEYS)) throw new Error("row-shape");
  return parsed;
}

function sortArtifactRows(artifact) {
  const copy = structuredClone(artifact);
  const compare = (left, right) => left < right ? -1 : left > right ? 1 : 0;
  for (const scope of ["canonical", "archive", "sourceEra"]) {
    copy[scope].tables.sort((left, right) => compare(`${left.schema}.${left.name}`, `${right.schema}.${right.name}`));
    copy[scope].functions.sort((left, right) => compare(`${left.schema}.${left.name}(${left.identityArguments})`, `${right.schema}.${right.name}(${right.identityArguments})`));
    copy[scope].triggers.sort((left, right) => compare(`${left.tableSchema}.${left.tableName}.${left.name}`, `${right.tableSchema}.${right.tableName}.${right.name}`));
  }
  for (const scope of ["canonical", "archive", "sourceEra"]) {
    const edgeKey = (edge) => JSON.stringify({
      classid: edge.classid,
      refclassid: edge.refclassid,
      deptype: edge.deptype,
      dependent: {
        type: edge.dependent?.type,
        schema: edge.dependent?.schema,
        name: edge.dependent?.name,
        identity: edge.dependent?.identity
      },
      referenced: {
        type: edge.referenced?.type,
        schema: edge.referenced?.schema,
        name: edge.referenced?.name,
        identity: edge.referenced?.identity
      }
    });
    copy.pgDependEdges[scope].sort((left, right) => compare(edgeKey(left), edgeKey(right)));
  }
  return copy;
}

export async function collectPostApplyCatalogObservation(request) {
  if (!requestIsValid(request)) return unavailable(REASONS.REQUEST_INVALID);

  let preflight;
  try {
    preflight = await import("../comment-translator-paid-core-v1-gate1-preflight-readonly.mjs");
  } catch {
    return unavailable(REASONS.CONNECTION_FAILED);
  }

  const rawBinding = process.env.GATE1_TARGET_BINDING_JSON;
  const expectedDigest = process.env.GATE1_TARGET_BINDING_SHA256;
  if (typeof rawBinding !== "string" || rawBinding.length === 0 || typeof expectedDigest !== "string" || expectedDigest.length === 0) {
    return unavailable(REASONS.TARGET_BINDING_MISSING);
  }
  const parsedBinding = preflight.parseTargetBinding(rawBinding);
  if (!parsedBinding.ok) return unavailable(REASONS.TARGET_BINDING_INVALID);
  const binding = parsedBinding.binding;
  if (preflight.computeBindingSha256(binding) !== expectedDigest
    || request.targetBindingSha256 !== expectedDigest) {
    return unavailable(REASONS.TARGET_BINDING_DIGEST_MISMATCH);
  }
  if (binding.target !== request.target) return unavailable(REASONS.CONNECTION_BINDING_MISMATCH);

  const invocation = preflight.buildPsqlInvocation(binding, process.env);
  if (!invocation.ok) {
    const reason = invocation.reason === "TLS_CONTEXT_INVALID" ? REASONS.TLS_CONTEXT_INVALID : REASONS.CONNECTION_BINDING_MISMATCH;
    return unavailable(reason);
  }
  const fixedInvocation = { ...invocation, input: POSTAPPLY_CATALOG_SQL };
  let queryAttempts = 0;
  const transport = preflight.createPsqlTransport({
    spawnSyncImpl(command, args, options) {
      if (!(args.length === 1 && args[0] === "--version")) queryAttempts += 1;
      return spawnSync(command, args, options);
    }
  });
  let capture;
  try {
    capture = transport.execute(fixedInvocation);
  } catch {
    return unavailable(REASONS.CONNECTION_FAILED, null, queryAttempts);
  }
  if (!capture || capture.exitCode !== 0 || capture.captureComplete !== true || capture.stderr !== "") {
    return unavailable(REASONS.CONNECTION_FAILED, null, queryAttempts);
  }

  let row;
  try {
    row = parseSingleJsonRow(capture.stdout, capture.rowCount);
  } catch (error) {
    return unavailable(error?.message === "capture" ? REASONS.CAPTURE_INVALID : REASONS.JSON_INVALID, null, queryAttempts);
  }
  const rawArtifact = {
    schemaVersion: 2,
    target: request.target,
    sourceCommit: request.sourceCommit,
    migrationCorpusSha256: request.migrationCorpusSha256,
    targetBindingSha256: request.targetBindingSha256,
    ...row
  };
  let artifact;
  try {
    artifact = sortArtifactRows(rawArtifact);
  } catch {
    return unavailable(REASONS.SHAPE_INVALID, rawArtifact, queryAttempts);
  }
  const shape = inspectPostApplyCatalogArtifact(artifact);
  if (shape.status !== "POSTAPPLY_CATALOG_SHAPE_VALID") {
    return unavailable(REASONS.SHAPE_INVALID, artifact, queryAttempts);
  }
  return result(POSTAPPLY_STATUS, null, artifact, queryAttempts);
}
