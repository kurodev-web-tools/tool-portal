import { spawnSync } from "node:child_process";
import { createHash, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildRepositoryRpcInventory,
  CANONICAL_TABLE_NAMES
} from "./lib/comment-translator-paid-core-v1-gate1-catalog.mjs";

import { POSTAPPLY_MAX_OUTPUT_BYTES } from "./lib/comment-translator-paid-core-v1-gate1-evidence.mjs";

export const SCHEMA_VERSION = 2;
export const MAX_OUTPUT_BYTES = 1024 * 1024;
export const MAX_RESULT_ROWS = 10_000;
const VERSION_CAPTURE_TIMEOUT_MS = 10_000;
const QUERY_CAPTURE_TIMEOUT_MS = 60_000;
export const READONLY_PGOPTIONS = "-c default_transaction_read_only=on -c statement_timeout=30000 -c lock_timeout=5000";
export const PSQL_COMMAND = "psql";

export const TARGET_BINDING_KEYS = Object.freeze([
  "caSha256",
  "connectionMode",
  "database",
  "host",
  "port",
  "projectRef",
  "schemaVersion",
  "sslMode",
  "target",
  "user"
]);

export const REASON_CODES = Object.freeze([
  "TARGET_BINDING_MISSING",
  "TARGET_BINDING_INVALID",
  "TARGET_BINDING_DIGEST_MISMATCH",
  "CONNECTION_BINDING_MISMATCH",
  "TLS_CONTEXT_INVALID",
  "CONNECTION_FAILED",
  "REQUIRED_EVIDENCE_UNAVAILABLE"
]);

export const OUTPUT_KEYS = Object.freeze([
  "schemaVersion",
  "target",
  "status",
  "historyCount",
  "historyDigest",
  "pendingDigest",
  "legacyDigest",
  "sourceEraDigest",
  "canonicalRelationsDigest",
  "canonicalRpcAclDigest",
  "archiveDigest",
  "limitsDigest",
  "schedulerEvidenceDigest",
  "maintenanceTransportPrivilegeDigest",
  "extensions",
  "storageObjectCount",
  "grantsRlsDigest",
  "vault",
  "cron",
  "schedulerProcessCount",
  "advisor",
  "mutationCounts",
  "blockedReason"
]);

export const EXTENSION_KEYS = Object.freeze(["pgNet", "pgCron", "vault"]);
export const VAULT_KEYS = Object.freeze(["total", "reservedNames", "recordIdDigest"]);
export const CRON_KEYS = Object.freeze(["matching", "active", "jobIdDigest", "commandDigest", "runDelta"]);
export const ADVISOR_KEYS = Object.freeze(["baselineDigest", "currentDigest", "inScopeNew", "highCriticalNew"]);
export const MUTATION_KEYS = Object.freeze(["ddl", "dml", "rpc", "remote", "total"]);

const DIGEST_PATTERN = /^[0-9a-f]{64}$/;
const SECRET_SHAPED_OUTPUT = /(?:postgres(?:ql)?:\/\/|bearer\s+|sb_(?:secret|publishable)_[a-z0-9_-]{12,}|eyj[a-z0-9_-]{12,}\.|password\s*[:=]|private[_ -]?key|decrypted[_ -]?secrets)/i;
const SECRET_SHAPED_BINDING = /(?:postgres(?:ql)?:\/\/|bearer\s+|sb_(?:secret|publishable)_|eyj[a-z0-9_-]{12,}\.|private[_ -]?key)/i;

const REQUIRED_EVIDENCE_KEYS = Object.freeze([
  "historyCount",
  "historyDigest",
  "pendingDigest",
  "legacyDigest",
  "sourceEraDigest",
  "canonicalRelationsDigest",
  "canonicalRpcAclDigest",
  "archiveDigest",
  "limitsDigest",
  "schedulerEvidenceDigest",
  "maintenanceTransportPrivilegeDigest",
  "extensions",
  "storageObjectCount",
  "grantsRlsDigest",
  "vault",
  "cron",
  "schedulerProcessCount",
  "advisor"
]);

const RAW_EVIDENCE_KEYS = new Set([
  "serverVersion",
  "transactionReadOnly",
  "transactionIsolation",
  ...REQUIRED_EVIDENCE_KEYS
]);

const ALLOWED_LIBPQ_ENV_KEYS = new Set([
  "PGDATABASE",
  "PGGSSENCMODE",
  "PGHOST",
  "PGPASSWORD",
  "PGPASSFILE",
  "PGPORT",
  "PGSSLMODE",
  "PGSSLROOTCERT",
  "PGUSER"
]);

const PROCESS_ESSENTIAL_KEYS = Object.freeze([
  "PATH",
  "SystemRoot",
  "WINDIR",
  "ComSpec",
  "TEMP",
  "TMP",
  "HOME"
]);

const CONNECTION_URL_KEYS = new Set([
  "DATABASE_URL",
  "DATABASE_DIRECT_URL",
  "POSTGRES_URL",
  "POSTGRESQL_URL",
  "SUPABASE_DB_URL",
  "SUPABASE_DATABASE_URL",
  "PGURL",
  "PGURI",
  "PGCONNSTRING"
]);

const FIXED_PSQL_ARGS = Object.freeze([
  "--no-psqlrc",
  "--no-password",
  "--quiet",
  "--tuples-only",
  "--no-align",
  "--set=ON_ERROR_STOP=1",
  "--dbname=postgres"
]);

const LEGACY_RELATION_NAMES = Object.freeze([
  "comment_translator_paid_entitlements",
  "comment_translator_paid_usage_counters",
  "comment_translator_paid_usage_events"
]);

const SOURCE_ERA_RELATION_NAMES = Object.freeze([
  "comment_translator_creator_history",
  "comment_translator_custom_dictionary_entries",
  "comment_translator_moderator_share_browser_sessions",
  "comment_translator_moderator_share_tokens",
  "comment_translator_obs_overlay_browser_sessions",
  "comment_translator_obs_overlay_tokens"
]);

const quoteSqlList = (values) => values.map((value) => `'${value}'`).join(", ");

const REPOSITORY_MIGRATIONS_DIRECTORY = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../supabase/migrations"
);
const CANONICAL_FUNCTION_INVENTORY = Object.freeze(
  buildRepositoryRpcInventory(REPOSITORY_MIGRATIONS_DIRECTORY)
);
const CANONICAL_RELATION_NAMES = Object.freeze([...CANONICAL_TABLE_NAMES]);
const CANONICAL_FUNCTION_NAMES = Object.freeze(
  [...new Set(CANONICAL_FUNCTION_INVENTORY.map(({ name }) => name))].sort()
);
const CANONICAL_RELATION_COUNT = 33;
const CANONICAL_FUNCTION_COUNT = 81;
const LEGACY_RELATION_COUNT = 3;
const LEGACY_FUNCTION_COUNT = 3;
const SOURCE_ERA_RELATION_COUNT = 6;
const SOURCE_ERA_FUNCTION_COUNT = 7;

if (CANONICAL_RELATION_NAMES.length !== CANONICAL_RELATION_COUNT
  || CANONICAL_FUNCTION_NAMES.length !== CANONICAL_FUNCTION_COUNT) {
  throw new Error("canonical catalog scope inventory mismatch");
}

const LEGACY_FUNCTION_INVENTORY = Object.freeze([
  {
    name: "apply_comment_translator_paid_entitlement_evidence",
    identityArguments: "p_billing_user_reference_id text, p_stripe_customer_reference_id text, p_stripe_subscription_reference_id text, p_subscription_status text, p_billing_state text, p_current_period_end timestamp with time zone, p_evidence_event_reference_id text, p_evidence_created_at timestamp with time zone, p_evidence_recorded_at timestamp with time zone"
  },
  {
    name: "apply_comment_translator_paid_usage",
    identityArguments: "p_billing_user_reference_id text, p_expected_period_end timestamp with time zone, p_usage_event_reference_id text, p_occurred_at timestamp with time zone, p_translated_message_count bigint, p_provider_input_character_count bigint, p_estimated_cost_micros bigint"
  },
  { name: "sync_comment_translator_paid_usage_from_entitlement", identityArguments: "" }
]);

const SOURCE_ERA_FUNCTION_INVENTORY = Object.freeze([
  {
    name: "create_comment_translator_custom_dictionary_entry",
    identityArguments: "p_owner_user_id uuid, p_entry_id uuid, p_term text, p_normalized_term text, p_replacement text, p_note text, p_source_language text, p_target_language text, p_created_at timestamp with time zone, p_updated_at timestamp with time zone"
  },
  {
    name: "delete_comment_translator_custom_dictionary_entry",
    identityArguments: "p_owner_user_id uuid, p_entry_id uuid, p_expected_updated_at timestamp with time zone"
  },
  {
    name: "revoke_comment_translator_moderator_share_token",
    identityArguments: "p_owner_user_id uuid, p_scope text, p_revoked_at timestamp with time zone"
  },
  {
    name: "revoke_comment_translator_obs_overlay_token",
    identityArguments: "p_owner_user_id uuid, p_scope text, p_revoked_at timestamp with time zone"
  },
  {
    name: "update_comment_translator_custom_dictionary_entry",
    identityArguments: "p_owner_user_id uuid, p_entry_id uuid, p_expected_updated_at timestamp with time zone, p_term text, p_normalized_term text, p_replacement text, p_note text, p_source_language text, p_target_language text, p_created_at timestamp with time zone, p_updated_at timestamp with time zone"
  },
  {
    name: "write_comment_translator_moderator_share_token",
    identityArguments: "p_owner_user_id uuid, p_session_reference_id text, p_scope text, p_token_digest text, p_issued_at timestamp with time zone, p_expires_at timestamp with time zone"
  },
  {
    name: "write_comment_translator_obs_overlay_token",
    identityArguments: "p_owner_user_id uuid, p_session_reference_id text, p_scope text, p_token_digest text, p_issued_at timestamp with time zone, p_expires_at timestamp with time zone, p_mode text"
  }
]);

function splitIdentityArguments(identityArguments) {
  if (identityArguments.length === 0) return [];
  const result = [];
  let start = 0;
  let depth = 0;
  for (let index = 0; index < identityArguments.length; index += 1) {
    if (identityArguments[index] === "(") depth += 1;
    else if (identityArguments[index] === ")") depth -= 1;
    else if (identityArguments[index] === "," && depth === 0) {
      result.push(identityArguments.slice(start, index).trim());
      start = index + 1;
    }
  }
  result.push(identityArguments.slice(start).trim());
  return result;
}

function sqlArrayText(values) {
  return `{${values.map((value) => /[{},"\\\s]/.test(value)
    ? `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`
    : value).join(",")}}`;
}

function identitySignature(identityArguments) {
  const parameters = splitIdentityArguments(identityArguments).map((parameter) => {
    const match = parameter.match(/^(?:(?:INOUT|OUT|IN|VARIADIC)\s+)?([a-z_][a-z0-9_$]*)\s+(.+)$/i);
    return match ? { name: match[1], type: match[2] } : { name: "", type: parameter };
  });
  const names = parameters.filter(({ name }) => name.length > 0).map(({ name }) => name);
  const types = parameters.map(({ type }) => type);
  return `${sqlArrayText(names)}|${sqlArrayText(types)}`;
}

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlSelectRows(rows, aliases) {
  return rows.map((row, index) => `${index === 0 ? "SELECT" : "UNION ALL\nSELECT"} ${row.map((value, column) => `${sqlLiteral(value)} AS ${aliases[column]}`).join(", ")}`).join("\n");
}

function functionIdentityProjection(alias) {
  return `coalesce(${alias}.proargnames::text, '{}') || '|' || coalesce((
      SELECT array_agg(format_type(argument_oid, null::integer) ORDER BY argument_ordinal)::text
      FROM unnest(${alias}.proargtypes) WITH ORDINALITY AS arguments(argument_oid, argument_ordinal)
    ), '{}')`;
}

const CONDITIONAL_RELATION_NAMES = Object.freeze([
  ...LEGACY_RELATION_NAMES,
  ...SOURCE_ERA_RELATION_NAMES
]);

// IDs come only from the fixed nine-relation allowlist, never operator input.
const RELATION_CONTROL_IDS = new Map(CONDITIONAL_RELATION_NAMES.map((name, index) => [name, `r${String(index).padStart(2, "0")}`]));
const CONTROL_ALIASES = [...RELATION_CONTROL_IDS.values()].flatMap((id) => [
  `relation_present_${id}`, `gate1_row_count_${id}`
]);
if (RELATION_CONTROL_IDS.size !== 9
  || new Set(CONTROL_ALIASES).size !== CONTROL_ALIASES.length
  || CONTROL_ALIASES.some((alias) => Buffer.byteLength(alias, "utf8") > 63)) {
  throw new Error("relation control alias inventory mismatch");
}

function exactCountCase() {
  return [
    "CASE tc.table_name",
    ...CONDITIONAL_RELATION_NAMES.map((name) => `      WHEN ${sqlLiteral(name)} THEN :gate1_row_count_${RELATION_CONTROL_IDS.get(name)}::bigint`),
    "      ELSE NULL::bigint",
    "    END"
  ].join("\n");
}

function relationPresenceControl() {
  const presenceColumns = CONDITIONAL_RELATION_NAMES.map((name) => `  count(*) FILTER (WHERE relation_.relname = ${sqlLiteral(name)}) > 0 AS relation_present_${RELATION_CONTROL_IDS.get(name)}`);
  const allAllowlistedRelationNames = [...CANONICAL_RELATION_NAMES, ...CONDITIONAL_RELATION_NAMES];
  presenceColumns.push(`  count(*) FILTER (WHERE relation_.relname LIKE 'comment_translator_%' AND relation_.relname NOT IN (${quoteSqlList(allAllowlistedRelationNames)})) = 0 AS unknown_relation_absent`);
  return [
    ...CONDITIONAL_RELATION_NAMES.map((name) => `\\set gate1_row_count_${RELATION_CONTROL_IDS.get(name)} NULL`),
    "SELECT",
    presenceColumns.join(",\n"),
    "FROM pg_catalog.pg_class AS relation_",
    "JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = relation_.relnamespace",
    "WHERE namespace.nspname = 'public'",
    "  AND relation_.relkind IN ('r', 'p')",
    "\\gset gate1_",
    "",
    ...CONDITIONAL_RELATION_NAMES.flatMap((name) => [
      `\\if :gate1_relation_present_${RELATION_CONTROL_IDS.get(name)}`,
      `  SELECT count(*)::bigint AS gate1_row_count_${RELATION_CONTROL_IDS.get(name)}`,
      `  FROM public.${name}`,
      "  \\gset",
      "\\endif",
      ""
    ])
  ].join("\n");
}

function buildReadonlySql(_target) {
  const scopedRows = [
    ...CANONICAL_RELATION_NAMES.map((name) => ["canonical", name]),
    ...LEGACY_RELATION_NAMES.map((name) => ["paidLegacy", name]),
    ...SOURCE_ERA_RELATION_NAMES.map((name) => ["sourceEra", name])
  ];
  const functionRowsForScope = (scope, inventory) => inventory.map(({ name, identityArguments }) => [
    scope,
    name,
    identityArguments,
    identitySignature(identityArguments)
  ]);
  const expectedFunctions = functionRowsForScope("canonical", CANONICAL_FUNCTION_INVENTORY);
  const functionScopeRows = [
    ...expectedFunctions,
    ...functionRowsForScope("paidLegacy", LEGACY_FUNCTION_INVENTORY),
    ...functionRowsForScope("sourceEra", SOURCE_ERA_FUNCTION_INVENTORY)
  ];
  const expectedRelationNames = [...new Set(scopedRows.map(([, name]) => name))];
  const expectedFunctionPatterns = [
    ["canonical", "ct_paid_%"],
    ["paidLegacy", "apply_comment_translator_paid_%"],
    ["paidLegacy", "sync_comment_translator_paid_%"],
    ["sourceEra", "create_comment_translator_custom_%"],
    ["sourceEra", "delete_comment_translator_custom_%"],
    ["sourceEra", "revoke_comment_translator_moderator_%"],
    ["sourceEra", "revoke_comment_translator_obs_%"],
    ["sourceEra", "update_comment_translator_custom_%"],
    ["sourceEra", "write_comment_translator_moderator_%"],
    ["sourceEra", "write_comment_translator_obs_%"]
  ];
  const actualFunctionScopeSql = expectedFunctionPatterns.map(([scope, pattern], index) => `${index === 0 ? "SELECT" : "UNION ALL\nSELECT"} ${sqlLiteral(scope)}::text AS scope_name, procedure_.proname AS function_name
  FROM pg_catalog.pg_proc AS procedure_
  JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = procedure_.pronamespace
  WHERE namespace.nspname = 'public'
    AND procedure_.proname LIKE ${sqlLiteral(pattern)}`).join("\n");
  const exactCount = exactCountCase();
  const relationControl = relationPresenceControl();
  const canonicalExpectedNameCount = CANONICAL_FUNCTION_NAMES.length;

  return String.raw`BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '5s';

${relationControl}

WITH transaction_state AS (
  SELECT
    current_setting('transaction_read_only') AS transaction_read_only,
    current_setting('transaction_isolation') AS transaction_isolation,
    transaction_timestamp() AS transaction_timestamp,
    version() AS server_version
),
migration_rows AS (
  SELECT version, name
  FROM supabase_migrations.schema_migrations
  ORDER BY version, name
),
history_state AS (
  SELECT
    count(*)::bigint AS history_count,
    encode(
      digest(
        coalesce(jsonb_agg(to_jsonb(migration_rows) ORDER BY migration_rows.version, migration_rows.name)::text, '[]'),
        'sha256'
      ),
      'hex'
    ) AS history_digest
  FROM migration_rows
),
table_scope AS (
  SELECT scope_name, table_name
  FROM (
    ${sqlSelectRows(scopedRows, ["scope_name", "table_name"])}
  ) AS scoped
),
table_catalog AS (
  SELECT
    ts.scope_name,
    relation_.oid,
    namespace.nspname AS schema_name,
    relation_.relname AS table_name,
    relation_.relowner,
    relation_.relrowsecurity,
    relation_.relacl
  FROM table_scope AS ts
  JOIN pg_catalog.pg_class AS relation_ ON relation_.relname = ts.table_name
  JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = relation_.relnamespace
   AND namespace.nspname = 'public'
  WHERE relation_.relkind IN ('r', 'p')
),
exact_counts AS (
  SELECT
    tc.scope_name,
    tc.table_name,
    ${exactCount} AS row_count
  FROM table_catalog AS tc
),
table_rows AS (
  SELECT
    tc.scope_name,
    tc.schema_name,
    tc.table_name,
    ec.row_count,
    CASE WHEN
      tc.relacl IS NULL
      OR pg_get_userbyid(tc.relowner) IS NULL
      OR (SELECT count(*) FROM pg_catalog.pg_attribute AS attribute_
          WHERE attribute_.attrelid = tc.oid
            AND attribute_.attnum > 0
            AND NOT attribute_.attisdropped
            AND format_type(attribute_.atttypid, attribute_.atttypmod) IS NULL) > 0
      OR (SELECT count(*) FROM pg_catalog.pg_attrdef AS attribute_default
          WHERE attribute_default.adrelid = tc.oid
            AND pg_get_expr(attribute_default.adbin, attribute_default.adrelid) IS NULL) > 0
      OR (SELECT count(*) FROM pg_catalog.pg_constraint AS constraint_
          WHERE constraint_.conrelid = tc.oid
            AND (constraint_.conname IS NULL
              OR constraint_.contype IS NULL
              OR pg_get_constraintdef(constraint_.oid, true) IS NULL)) > 0
      OR (SELECT count(*) FROM pg_catalog.pg_index AS index_
          JOIN pg_catalog.pg_class AS index_class ON index_class.oid = index_.indexrelid
          WHERE index_.indrelid = tc.oid
            AND (index_class.relname IS NULL
              OR pg_get_indexdef(index_.indexrelid, 0, true) IS NULL)) > 0
      OR (SELECT count(*) FROM pg_catalog.pg_policy AS policy_
          WHERE policy_.polrelid = tc.oid
            AND (policy_.polname IS NULL
              OR policy_.polcmd IS NULL
              OR policy_.polcmd NOT IN ('*', 'r', 'a', 'w', 'd')
              OR policy_.polpermissive IS NULL
              OR policy_.polroles IS NULL
              OR (policy_.polqual IS NOT NULL AND pg_get_expr(policy_.polqual, policy_.polrelid) IS NULL)
              OR (policy_.polwithcheck IS NOT NULL AND pg_get_expr(policy_.polwithcheck, policy_.polrelid) IS NULL))) > 0
      OR (SELECT count(*) FROM pg_catalog.pg_policy AS policy_
          CROSS JOIN LATERAL unnest(policy_.polroles) AS policy_role(role_oid)
          WHERE policy_.polrelid = tc.oid
            AND (policy_role.role_oid IS NULL
              OR (policy_role.role_oid <> 0 AND pg_get_userbyid(policy_role.role_oid) IS NULL))) > 0
      OR (SELECT count(*) FROM aclexplode(tc.relacl) AS acl
          WHERE acl.grantee IS NULL
            OR acl.privilege_type IS NULL
            OR acl.is_grantable IS NULL
            OR (acl.grantee <> 0 AND pg_get_userbyid(acl.grantee) IS NULL)) > 0
    THEN 1 ELSE 0 END AS structural_invalid,
    jsonb_build_object(
      'schema', tc.schema_name,
      'name', tc.table_name,
      'owner', pg_get_userbyid(tc.relowner),
      'rlsEnabled', tc.relrowsecurity,
      'columns', coalesce((
        SELECT jsonb_agg(jsonb_build_object(
          'schema', tc.schema_name,
          'table', tc.table_name,
          'ordinal', attribute_.attnum,
          'name', attribute_.attname,
          'type', format_type(attribute_.atttypid, attribute_.atttypmod),
          'notNull', attribute_.attnotnull,
          'defaultDefinition', CASE
            WHEN attribute_default.adbin IS NULL THEN NULL
            ELSE pg_get_expr(attribute_default.adbin, attribute_default.adrelid)
          END
        ) ORDER BY attribute_.attnum)
        FROM pg_catalog.pg_attribute AS attribute_
        LEFT JOIN pg_catalog.pg_attrdef AS attribute_default
          ON attribute_default.adrelid = attribute_.attrelid
         AND attribute_default.adnum = attribute_.attnum
        WHERE attribute_.attrelid = tc.oid
          AND attribute_.attnum > 0
          AND NOT attribute_.attisdropped
      ), '[]'::jsonb),
      'constraints', coalesce((
        SELECT jsonb_agg(jsonb_build_object(
          'schema', tc.schema_name,
          'table', tc.table_name,
          'name', constraint_.conname,
          'type', constraint_.contype,
          'definition', pg_get_constraintdef(constraint_.oid, true)
        ) ORDER BY constraint_.conname, constraint_.contype)
        FROM pg_catalog.pg_constraint AS constraint_
        WHERE constraint_.conrelid = tc.oid
      ), '[]'::jsonb),
      'indexes', coalesce((
        SELECT jsonb_agg(jsonb_build_object(
          'schema', tc.schema_name,
          'table', tc.table_name,
          'name', index_class.relname,
          'definition', pg_get_indexdef(index_.indexrelid, 0, true)
        ) ORDER BY index_class.relname)
        FROM pg_catalog.pg_index AS index_
        JOIN pg_catalog.pg_class AS index_class ON index_class.oid = index_.indexrelid
        WHERE index_.indrelid = tc.oid
      ), '[]'::jsonb),
      'policies', coalesce((
        SELECT jsonb_agg(jsonb_build_object(
          'schema', tc.schema_name,
          'table', tc.table_name,
          'name', policy_.polname,
          'command', CASE policy_.polcmd
            WHEN '*' THEN 'ALL'
            WHEN 'r' THEN 'SELECT'
            WHEN 'a' THEN 'INSERT'
            WHEN 'w' THEN 'UPDATE'
            WHEN 'd' THEN 'DELETE'
            ELSE policy_.polcmd::text
          END,
          'permissive', policy_.polpermissive,
          'roles', coalesce((
            SELECT jsonb_agg(
              CASE WHEN role_oid = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(role_oid) END
              ORDER BY CASE WHEN role_oid = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(role_oid) END
            )
            FROM unnest(policy_.polroles) AS role_oid
          ), '[]'::jsonb),
          'usingDefinition', CASE
            WHEN policy_.polqual IS NULL THEN NULL
            ELSE pg_get_expr(policy_.polqual, policy_.polrelid)
          END,
          'checkDefinition', CASE
            WHEN policy_.polwithcheck IS NULL THEN NULL
            ELSE pg_get_expr(policy_.polwithcheck, policy_.polrelid)
          END
        ) ORDER BY policy_.polname)
        FROM pg_catalog.pg_policy AS policy_
        WHERE policy_.polrelid = tc.oid
      ), '[]'::jsonb),
      'acls', CASE WHEN tc.relacl IS NULL THEN NULL::jsonb ELSE coalesce((
        SELECT jsonb_agg(jsonb_build_object(
          'schema', tc.schema_name,
          'objectKind', 'table',
          'objectIdentity', tc.schema_name || '.' || tc.table_name,
          'grantee', CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(acl.grantee) END,
          'privilege', acl.privilege_type,
          'grantable', acl.is_grantable
        ) ORDER BY
          CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(acl.grantee) END,
          acl.privilege_type,
          acl.is_grantable)
        FROM aclexplode(tc.relacl) AS acl
      ), '[]'::jsonb) END
    ) AS structure_row
  FROM table_catalog AS tc
  JOIN exact_counts AS ec
    ON ec.scope_name = tc.scope_name
   AND ec.table_name = tc.table_name
),
function_scope AS (
  SELECT scope_name, function_name, expected_identity_arguments, expected_identity_signature
  FROM (
    ${sqlSelectRows(functionScopeRows, ["scope_name", "function_name", "expected_identity_arguments", "expected_identity_signature"])}
  ) AS scoped
),
function_catalog AS (
  SELECT
    fs.scope_name,
    fs.expected_identity_arguments,
    fs.expected_identity_signature,
    procedure_.oid,
    namespace.nspname AS schema_name,
    procedure_.proname AS function_name,
    procedure_.proargtypes,
    procedure_.proargnames,
    procedure_.prorettype,
    procedure_.proowner,
    procedure_.prosecdef,
    procedure_.proconfig,
    procedure_.proacl
  FROM function_scope AS fs
  JOIN pg_catalog.pg_proc AS procedure_ ON procedure_.proname = fs.function_name
  JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = procedure_.pronamespace
   AND namespace.nspname = 'public'
),
function_identity AS (
  SELECT
    fc.*,
    ${functionIdentityProjection("fc")} AS actual_identity_signature,
    CASE WHEN ${functionIdentityProjection("fc")} = fc.expected_identity_signature
      THEN fc.expected_identity_arguments
      ELSE ${functionIdentityProjection("fc")}
    END AS identity_arguments
  FROM function_catalog AS fc
),
function_rows AS (
  SELECT
    fi.scope_name,
    fi.schema_name,
    fi.function_name,
    fi.identity_arguments,
    CASE WHEN
      fi.proacl IS NULL
      OR fi.actual_identity_signature IS DISTINCT FROM fi.expected_identity_signature
      OR format_type(fi.prorettype, null::integer) IS NULL
      OR pg_get_userbyid(fi.proowner) IS NULL
      OR (SELECT count(*)
          FROM unnest(coalesce(fi.proconfig, array[]::text[])) AS config_value
          WHERE config_value IS NULL) > 0
      OR (SELECT count(*) FROM aclexplode(fi.proacl) AS acl
          WHERE acl.grantee IS NULL
            OR acl.privilege_type IS NULL
            OR acl.is_grantable IS NULL
            OR (acl.grantee <> 0 AND pg_get_userbyid(acl.grantee) IS NULL)) > 0
      OR pg_get_functiondef(fi.oid) IS NULL
    THEN 1 ELSE 0 END AS structural_invalid,
    jsonb_build_object(
      'schema', fi.schema_name,
      'name', fi.function_name,
      'identityArguments', fi.identity_arguments,
      'resultType', format_type(fi.prorettype, null::integer),
      'owner', pg_get_userbyid(fi.proowner),
      'securityDefiner', fi.prosecdef,
      'config', coalesce((
        SELECT jsonb_agg(config_value ORDER BY config_value)
        FROM unnest(coalesce(fi.proconfig, array[]::text[])) AS config_value
      ), '[]'::jsonb),
      'acls', CASE WHEN fi.proacl IS NULL THEN NULL::jsonb ELSE coalesce((
        SELECT jsonb_agg(jsonb_build_object(
          'schema', fi.schema_name,
          'objectKind', 'function',
          'objectIdentity', fi.schema_name || '.' || fi.function_name || '(' || fi.identity_arguments || ')',
          'grantee', CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(acl.grantee) END,
          'privilege', acl.privilege_type,
          'grantable', acl.is_grantable
        ) ORDER BY
          CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(acl.grantee) END,
          acl.privilege_type,
          acl.is_grantable)
        FROM aclexplode(fi.proacl) AS acl
      ), '[]'::jsonb) END,
      'definitionMd5', md5(pg_get_functiondef(fi.oid))
    ) AS row_json
  FROM function_identity AS fi
),
function_actual_scope AS (
  ${actualFunctionScopeSql}
),
function_scope_summary AS (
  SELECT
    expected.scope_name,
    (SELECT count(*) FROM function_scope AS expected_row WHERE expected_row.scope_name = expected.scope_name) AS expected_count,
    (SELECT count(*) FROM function_rows AS observed WHERE observed.scope_name = expected.scope_name) AS observed_count,
    (SELECT count(DISTINCT observed.function_name) FROM function_rows AS observed WHERE observed.scope_name = expected.scope_name) AS distinct_name_count,
    (SELECT count(DISTINCT observed.function_name || ':' || observed.identity_arguments) FROM function_rows AS observed WHERE observed.scope_name = expected.scope_name) AS distinct_identity_count,
    (SELECT count(DISTINCT expected_row.function_name) FROM function_scope AS expected_row
      LEFT JOIN function_actual_scope AS actual
        ON actual.scope_name = expected_row.scope_name AND actual.function_name = expected_row.function_name
      WHERE expected_row.scope_name = expected.scope_name AND actual.function_name IS NULL) AS missing_name_count,
    (SELECT count(DISTINCT actual.function_name) FROM function_actual_scope AS actual
      LEFT JOIN function_scope AS expected_row
        ON expected_row.scope_name = actual.scope_name AND expected_row.function_name = actual.function_name
      WHERE actual.scope_name = expected.scope_name AND expected_row.function_name IS NULL) AS extra_name_count,
    (SELECT coalesce(max(observed.structural_invalid), 0) FROM function_rows AS observed WHERE observed.scope_name = expected.scope_name) AS invalid_count
  FROM (SELECT DISTINCT scope_name FROM function_scope) AS expected
),
trigger_rows AS (
  SELECT
    tc.scope_name,
    CASE WHEN trigger_.tgname IS NULL
      OR trigger_.tgenabled IS NULL
      OR function_.proname IS NULL
      OR ${functionIdentityProjection("function_")} IS NULL
      OR pg_get_triggerdef(trigger_.oid, true) IS NULL
    THEN 1 ELSE 0 END AS structural_invalid,
    jsonb_build_object(
      'tableSchema', tc.schema_name,
      'tableName', tc.table_name,
      'name', trigger_.tgname,
      'enabled', trigger_.tgenabled <> 'D',
       'functionIdentity', function_.proname || '(' || ${functionIdentityProjection("function_")} || ')',
      'definition', pg_get_triggerdef(trigger_.oid, true)
    ) AS row_json
  FROM table_catalog AS tc
  JOIN pg_catalog.pg_trigger AS trigger_
    ON trigger_.tgrelid = tc.oid
   AND NOT trigger_.tgisinternal
  JOIN pg_catalog.pg_proc AS function_ ON function_.oid = trigger_.tgfoid
),
dependency_counts AS (
  SELECT
    scopes.scope_name,
    (SELECT count(*) FROM pg_catalog.pg_constraint AS foreign_key
      WHERE foreign_key.contype = 'f'
        AND foreign_key.confrelid IN (SELECT oid FROM table_catalog WHERE table_catalog.scope_name = scopes.scope_name)
        AND foreign_key.conrelid NOT IN (SELECT oid FROM table_catalog WHERE table_catalog.scope_name = scopes.scope_name))::bigint AS inbound_foreign_keys,
    (SELECT count(*) FROM pg_catalog.pg_depend AS dependency
      JOIN pg_catalog.pg_rewrite AS rewrite_ ON dependency.classid = 'pg_rewrite'::regclass AND dependency.objid = rewrite_.oid
      JOIN pg_catalog.pg_class AS view_relation ON view_relation.oid = rewrite_.ev_class
      WHERE dependency.refclassid = 'pg_class'::regclass
        AND dependency.refobjid IN (SELECT oid FROM table_catalog WHERE table_catalog.scope_name = scopes.scope_name)
        AND view_relation.relkind = 'v'
        AND view_relation.oid NOT IN (SELECT oid FROM table_catalog WHERE table_catalog.scope_name = scopes.scope_name))::bigint AS views,
    (SELECT count(*) FROM pg_catalog.pg_depend AS dependency
      JOIN pg_catalog.pg_rewrite AS rewrite_ ON dependency.classid = 'pg_rewrite'::regclass AND dependency.objid = rewrite_.oid
      JOIN pg_catalog.pg_class AS materialized_relation ON materialized_relation.oid = rewrite_.ev_class
      WHERE dependency.refclassid = 'pg_class'::regclass
        AND dependency.refobjid IN (SELECT oid FROM table_catalog WHERE table_catalog.scope_name = scopes.scope_name)
        AND materialized_relation.relkind = 'm'
        AND materialized_relation.oid NOT IN (SELECT oid FROM table_catalog WHERE table_catalog.scope_name = scopes.scope_name))::bigint AS materialized_views,
    (SELECT count(*) FROM pg_catalog.pg_rewrite AS rewrite_
      WHERE rewrite_.ev_class IN (SELECT oid FROM table_catalog WHERE table_catalog.scope_name = scopes.scope_name)
        AND rewrite_.rulename <> '_RETURN')::bigint AS rules,
    (SELECT count(*) FROM pg_catalog.pg_policy AS policy
      WHERE policy.polrelid IN (SELECT oid FROM table_catalog WHERE table_catalog.scope_name = scopes.scope_name))::bigint AS policies,
    (SELECT count(*) FROM pg_catalog.pg_trigger AS trigger_
      WHERE trigger_.tgrelid IN (SELECT oid FROM table_catalog WHERE table_catalog.scope_name = scopes.scope_name)
        AND NOT trigger_.tgisinternal)::bigint AS user_triggers,
    (SELECT count(*) FROM pg_catalog.pg_depend AS dependency
      WHERE dependency.refclassid = 'pg_event_trigger'::regclass
        AND dependency.refobjid IN (SELECT oid FROM table_catalog WHERE table_catalog.scope_name = scopes.scope_name))::bigint AS event_triggers,
    (SELECT count(*) FROM pg_catalog.pg_publication_rel AS publication
      WHERE publication.prrelid IN (SELECT oid FROM table_catalog WHERE table_catalog.scope_name = scopes.scope_name))::bigint AS publications,
    (SELECT count(*) FROM pg_catalog.pg_proc AS outside_function
      JOIN pg_catalog.pg_namespace AS outside_namespace ON outside_namespace.oid = outside_function.pronamespace
      WHERE outside_namespace.nspname = 'public'
        AND outside_function.oid NOT IN (SELECT oid FROM function_catalog WHERE function_catalog.scope_name = scopes.scope_name)
        AND (SELECT count(*) FROM table_catalog AS scoped_table
          WHERE scoped_table.scope_name = scopes.scope_name
            AND pg_get_functiondef(outside_function.oid) LIKE '%' || scoped_table.schema_name || '.' || scoped_table.table_name || '%') > 0)::bigint AS outside_function_source_references,
    (SELECT count(*) FROM pg_catalog.pg_depend AS dependency
      WHERE dependency.deptype = 'n'
        AND (
          (dependency.classid = 'pg_class'::regclass AND dependency.objid IN (SELECT oid FROM table_catalog WHERE table_catalog.scope_name = scopes.scope_name))
          OR (dependency.classid = 'pg_proc'::regclass AND dependency.objid IN (SELECT oid FROM function_catalog WHERE function_catalog.scope_name = scopes.scope_name))
          OR (dependency.refclassid = 'pg_class'::regclass AND dependency.refobjid IN (SELECT oid FROM table_catalog WHERE table_catalog.scope_name = scopes.scope_name))
          OR (dependency.refclassid = 'pg_proc'::regclass AND dependency.refobjid IN (SELECT oid FROM function_catalog WHERE function_catalog.scope_name = scopes.scope_name))
        ))::bigint AS unexpected_pg_depend_edges
  FROM (
    SELECT 'canonical'::text AS scope_name
    UNION ALL SELECT 'paidLegacy'::text
    UNION ALL SELECT 'sourceEra'::text
  ) AS scopes
),
scoped_state AS (
  SELECT
    scopes.scope_name,
    jsonb_build_object(
      'tables', coalesce((
        SELECT jsonb_agg(
          CASE WHEN scopes.scope_name = 'canonical' THEN row_.structure_row ELSE row_.structure_row || jsonb_build_object('rowCount', row_.row_count) END
          ORDER BY row_.schema_name, row_.table_name
        )
        FROM table_rows AS row_
        WHERE row_.scope_name = scopes.scope_name
      ), '[]'::jsonb),
      'functions', coalesce((
        SELECT jsonb_agg(row_.row_json ORDER BY row_.schema_name, row_.function_name, row_.identity_arguments)
        FROM function_rows AS row_
        WHERE row_.scope_name = scopes.scope_name
      ), '[]'::jsonb),
      'triggers', coalesce((
        SELECT jsonb_agg(row_.row_json ORDER BY row_.row_json->>'tableSchema', row_.row_json->>'tableName', row_.row_json->>'name')
        FROM trigger_rows AS row_
        WHERE row_.scope_name = scopes.scope_name
      ), '[]'::jsonb),
      'dependencyCounts', (
        SELECT jsonb_build_object(
          'inboundForeignKeys', dependency.inbound_foreign_keys,
          'views', dependency.views,
          'materializedViews', dependency.materialized_views,
          'rules', dependency.rules,
          'policies', dependency.policies,
          'userTriggers', dependency.user_triggers,
          'eventTriggers', dependency.event_triggers,
          'publications', dependency.publications,
          'outsideFunctionSourceReferences', dependency.outside_function_source_references,
          'unexpectedPgDependEdges', dependency.unexpected_pg_depend_edges
        )
        FROM dependency_counts AS dependency
        WHERE dependency.scope_name = scopes.scope_name
      )
    ) AS state,
    (SELECT count(*) FROM table_rows AS row_ WHERE row_.scope_name = scopes.scope_name) AS table_count,
    (SELECT count(DISTINCT row_.schema_name || '.' || row_.table_name) FROM table_rows AS row_ WHERE row_.scope_name = scopes.scope_name) AS table_identity_count,
    (SELECT coalesce(max(row_.structural_invalid), 0) FROM table_rows AS row_ WHERE row_.scope_name = scopes.scope_name) AS table_invalid_count,
    (SELECT count(*) FROM function_rows AS row_ WHERE row_.scope_name = scopes.scope_name) AS function_count,
    (SELECT count(DISTINCT row_.function_name || ':' || row_.identity_arguments) FROM function_rows AS row_ WHERE row_.scope_name = scopes.scope_name) AS function_identity_count,
    (SELECT coalesce(max(row_.structural_invalid), 0) FROM function_rows AS row_ WHERE row_.scope_name = scopes.scope_name) AS function_invalid_count,
    (SELECT coalesce(max(row_.structural_invalid), 0) FROM trigger_rows AS row_ WHERE row_.scope_name = scopes.scope_name) AS trigger_invalid_count
  FROM (
    SELECT 'canonical'::text AS scope_name
    UNION ALL SELECT 'paidLegacy'::text
    UNION ALL SELECT 'sourceEra'::text
  ) AS scopes
),
canonical_extra_relations AS (
  SELECT count(*) AS extra_count
  FROM pg_catalog.pg_class AS relation_
  JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = relation_.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation_.relkind IN ('r', 'p')
    AND relation_.relname LIKE 'comment_translator_%'
     AND relation_.relname NOT IN (${quoteSqlList(expectedRelationNames)})
),
scoped_state_validation AS (
  SELECT
    state.*,
    CASE
      WHEN state.scope_name = 'canonical'
        AND state.table_count = ${CANONICAL_RELATION_COUNT}
        AND state.table_identity_count = ${CANONICAL_RELATION_COUNT}
        AND state.table_invalid_count = 0
        AND :'gate1_unknown_relation_absent'::boolean
        AND (SELECT extra_count FROM canonical_extra_relations) = 0
        AND state.function_count = ${canonicalExpectedNameCount}
        AND state.function_identity_count = ${canonicalExpectedNameCount}
        AND (SELECT expected_count FROM function_scope_summary WHERE scope_name = 'canonical') = ${canonicalExpectedNameCount}
        AND (SELECT observed_count FROM function_scope_summary WHERE scope_name = 'canonical') = ${canonicalExpectedNameCount}
        AND (SELECT missing_name_count FROM function_scope_summary WHERE scope_name = 'canonical') = 0
        AND (SELECT extra_name_count FROM function_scope_summary WHERE scope_name = 'canonical') = 0
        AND (SELECT invalid_count FROM function_scope_summary WHERE scope_name = 'canonical') = 0
        AND state.trigger_invalid_count = 0
      THEN true
      WHEN state.scope_name = 'paidLegacy'
        AND state.table_count = ${LEGACY_RELATION_COUNT}
        AND state.table_identity_count = ${LEGACY_RELATION_COUNT}
        AND state.table_invalid_count = 0
        AND :'gate1_unknown_relation_absent'::boolean
        AND state.function_count = ${LEGACY_FUNCTION_COUNT}
        AND state.function_identity_count = ${LEGACY_FUNCTION_COUNT}
        AND (SELECT expected_count FROM function_scope_summary WHERE scope_name = 'paidLegacy') = ${LEGACY_FUNCTION_COUNT}
        AND (SELECT observed_count FROM function_scope_summary WHERE scope_name = 'paidLegacy') = ${LEGACY_FUNCTION_COUNT}
        AND (SELECT missing_name_count FROM function_scope_summary WHERE scope_name = 'paidLegacy') = 0
        AND (SELECT extra_name_count FROM function_scope_summary WHERE scope_name = 'paidLegacy') = 0
        AND (SELECT invalid_count FROM function_scope_summary WHERE scope_name = 'paidLegacy') = 0
        AND state.function_invalid_count = 0
        AND state.trigger_invalid_count = 0
        AND (SELECT count(*) FROM table_rows AS row_ WHERE row_.scope_name = 'paidLegacy' AND row_.row_count IS NULL) = 0
      THEN true
      WHEN state.scope_name = 'sourceEra'
        AND state.table_count = ${SOURCE_ERA_RELATION_COUNT}
        AND state.table_identity_count = ${SOURCE_ERA_RELATION_COUNT}
        AND state.table_invalid_count = 0
        AND :'gate1_unknown_relation_absent'::boolean
        AND state.function_count = ${SOURCE_ERA_FUNCTION_COUNT}
        AND state.function_identity_count = ${SOURCE_ERA_FUNCTION_COUNT}
        AND (SELECT expected_count FROM function_scope_summary WHERE scope_name = 'sourceEra') = ${SOURCE_ERA_FUNCTION_COUNT}
        AND (SELECT observed_count FROM function_scope_summary WHERE scope_name = 'sourceEra') = ${SOURCE_ERA_FUNCTION_COUNT}
        AND (SELECT missing_name_count FROM function_scope_summary WHERE scope_name = 'sourceEra') = 0
        AND (SELECT extra_name_count FROM function_scope_summary WHERE scope_name = 'sourceEra') = 0
        AND (SELECT invalid_count FROM function_scope_summary WHERE scope_name = 'sourceEra') = 0
        AND state.function_invalid_count = 0
        AND state.trigger_invalid_count = 0
        AND (SELECT count(*) FROM table_rows AS row_ WHERE row_.scope_name = 'sourceEra' AND row_.row_count IS NULL) = 0
      THEN true
      ELSE false
    END AS valid
  FROM scoped_state AS state
),
archive_rows AS (
  SELECT jsonb_build_object(
    'schema', namespace.nspname,
    'name', relation_.relname,
    'kind', relation_.relkind,
    'owner', pg_get_userbyid(relation_.relowner),
    'rlsEnabled', relation_.relrowsecurity,
    'acl', to_jsonb(relation_.relacl)
  ) AS object_row
  FROM pg_catalog.pg_class AS relation_
  JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = relation_.relnamespace
  WHERE namespace.nspname = 'comment_translator_paid_legacy_archive'
),
archive_state AS (
  SELECT encode(
    digest(coalesce(jsonb_agg(object_row ORDER BY object_row::text)::text, '[]'), 'sha256'),
    'hex'
  ) AS archive_digest
  FROM archive_rows
),
canonical_grants_state AS (
  SELECT CASE WHEN validation.valid THEN encode(
    digest(jsonb_build_object(
      'tables', validation.state->'tables',
      'functions', validation.state->'functions'
    )::text, 'sha256'),
    'hex'
  ) ELSE NULL END AS grants_rls_digest
  FROM scoped_state_validation AS validation
  WHERE validation.scope_name = 'canonical'
),
vault_state AS (
  SELECT
    count(*)::bigint AS total,
    count(*) FILTER (WHERE name IN (
      'comment_translator_paid_maintenance_url',
      'comment_translator_paid_cron_token'
    ))::bigint AS reserved_names,
    encode(
      digest(
        coalesce(
          jsonb_agg(jsonb_build_object('id', id, 'name', name) ORDER BY name, id)::text,
          '[]'
        ),
        'sha256'
      ),
      'hex'
    ) AS record_id_digest
  FROM vault.secrets
),
cron_rows AS (
  SELECT jobid, active, command
  FROM cron.job
  WHERE jobname = 'comment-translator-paid-maintenance'
),
cron_state AS (
  SELECT
    count(*)::bigint AS matching,
    count(*) FILTER (WHERE active)::bigint AS active_count,
    encode(
      digest(coalesce(jsonb_agg(jsonb_build_object('jobId', jobid, 'active', active) ORDER BY jobid)::text, '[]'), 'sha256'),
      'hex'
    ) AS job_id_digest,
    encode(
      digest(coalesce(jsonb_agg(command ORDER BY jobid)::text, '[]'), 'sha256'),
      'hex'
    ) AS command_digest
  FROM cron_rows
),
extension_state AS (
  SELECT
    count(*) FILTER (WHERE extname = 'pg_net') > 0 AS pg_net,
    count(*) FILTER (WHERE extname = 'pg_cron') > 0 AS pg_cron,
    count(*) FILTER (WHERE extname = 'supabase_vault') > 0 AS vault
  FROM pg_catalog.pg_extension
),
limit_state AS (
  SELECT encode(
    digest(
      jsonb_build_object(
        'statementTimeout', current_setting('statement_timeout'),
        'lockTimeout', current_setting('lock_timeout')
      )::text,
      'sha256'
    ),
    'hex'
  ) AS limits_digest
),
maintenance_transport_state AS (
  SELECT CASE WHEN to_regprocedure('private.ct_paid_invoke_maintenance_from_vault()') IS NULL
    THEN NULL::text
    ELSE encode(
    digest(
      jsonb_build_object(
        'serviceRoleExecute', has_function_privilege(
          'service_role',
          to_regprocedure('private.ct_paid_invoke_maintenance_from_vault()'),
          'EXECUTE'
        ),
        'authenticatedExecute', has_function_privilege(
          'authenticated',
          to_regprocedure('private.ct_paid_invoke_maintenance_from_vault()'),
          'EXECUTE'
        ),
        'anonExecute', has_function_privilege(
          'anon',
          to_regprocedure('private.ct_paid_invoke_maintenance_from_vault()'),
          'EXECUTE'
        )
      )::text,
      'sha256'
    ),
    'hex'
  ) END AS maintenance_transport_privilege_digest
),
storage_state AS (
  SELECT count(*)::bigint AS storage_object_count
  FROM storage.objects
),
scheduler_state AS (
  SELECT count(*)::bigint AS scheduler_process_count
  FROM pg_catalog.pg_stat_activity
  WHERE application_name = 'pg_cron'
)
SELECT jsonb_build_object(
  'serverVersion', (SELECT server_version FROM transaction_state),
  'transactionReadOnly', (SELECT transaction_read_only FROM transaction_state),
  'transactionIsolation', (SELECT transaction_isolation FROM transaction_state),
  'historyCount', (SELECT history_count FROM history_state),
  'historyDigest', (SELECT history_digest FROM history_state),
  'pendingDigest', NULL::text,
  'legacyDigest', (SELECT encode(digest(state::text, 'sha256'), 'hex') FROM scoped_state_validation WHERE scope_name = 'paidLegacy' AND valid),
  'sourceEraDigest', (SELECT encode(digest(state::text, 'sha256'), 'hex') FROM scoped_state_validation WHERE scope_name = 'sourceEra' AND valid),
  'canonicalRelationsDigest', (SELECT encode(digest(jsonb_build_object(
    'tables', state->'tables',
    'triggers', state->'triggers',
    'dependencyCounts', state->'dependencyCounts'
  )::text, 'sha256'), 'hex') FROM scoped_state_validation WHERE scope_name = 'canonical' AND valid),
  'canonicalRpcAclDigest', (SELECT encode(digest((state->'functions')::text, 'sha256'), 'hex') FROM scoped_state_validation WHERE scope_name = 'canonical' AND valid),
  'archiveDigest', (SELECT archive_digest FROM archive_state),
  'limitsDigest', (SELECT limits_digest FROM limit_state),
  'schedulerEvidenceDigest', encode(
    digest(
      jsonb_build_object(
        'matching', (SELECT matching FROM cron_state),
        'activeCount', (SELECT active_count FROM cron_state),
        'processCount', (SELECT scheduler_process_count FROM scheduler_state)
      )::text,
      'sha256'
    ),
    'hex'
  ),
  'maintenanceTransportPrivilegeDigest', (SELECT maintenance_transport_privilege_digest FROM maintenance_transport_state),
  'extensions', jsonb_build_object(
    'pgNet', (SELECT pg_net FROM extension_state),
    'pgCron', (SELECT pg_cron FROM extension_state),
    'vault', (SELECT vault FROM extension_state)
  ),
  'storageObjectCount', (SELECT storage_object_count FROM storage_state),
  'grantsRlsDigest', (SELECT grants_rls_digest FROM canonical_grants_state),
  'vault', jsonb_build_object(
    'total', (SELECT total FROM vault_state),
    'reservedNames', (SELECT reserved_names FROM vault_state),
    'recordIdDigest', (SELECT record_id_digest FROM vault_state)
  ),
  'cron', jsonb_build_object(
    'matching', (SELECT matching FROM cron_state),
    'active', (SELECT active_count FROM cron_state) > 0,
    'jobIdDigest', (SELECT job_id_digest FROM cron_state),
    'commandDigest', (SELECT command_digest FROM cron_state),
    'runDelta', NULL::bigint
  ),
  'schedulerProcessCount', (SELECT scheduler_process_count FROM scheduler_state),
  'advisor', NULL::jsonb
) AS gate1_evidence;

ROLLBACK;
`;
}

export const READONLY_SQL_BY_TARGET = Object.freeze({
  preview: buildReadonlySql("preview"),
  production: buildReadonlySql("production")
});

export const READONLY_SQL = READONLY_SQL_BY_TARGET.production;

/*
 * This is one fixed, aggregate-only query preceded by fixed psql client-side
 * control statements in the same connection and transaction. The control
 * path discovers allowlisted relation presence from pg_catalog, submits only
 * the matching fixed count statements, and keeps absent relations as NULL.
 * It deliberately returns null for evidence that cannot be established from
 * this connection alone (pending migration projection, run delta, external
 * advisor evidence, or absent/invalid legacy/source state). The JS boundary
 * keeps those nulls as blocked evidence rather than turning them into zeroes
 * or a readiness claim.
 */

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function exactKeys(value, expected) {
  return isPlainObject(value) && Object.keys(value).sort().join("\u0000") === [...expected].sort().join("\u0000");
}

function isStrictAscii(value) {
  return typeof value === "string" && /^[\x21-\x7e]*$/.test(value);
}

function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortKeysDeep(value[key])]));
}

export function canonicalBindingJson(binding) {
  return JSON.stringify(sortKeysDeep(binding));
}

export function computeBindingSha256(binding) {
  const canonical = canonicalBindingJson(binding);
  if (typeof canonical !== "string") throw new TypeError("invalid binding");
  return createHash("sha256").update(Buffer.from(canonical, "utf8")).digest("hex");
}

function invalidBinding() {
  return { ok: false, reason: "TARGET_BINDING_INVALID" };
}

function hasDuplicateBindingKeys(rawJson) {
  return TARGET_BINDING_KEYS.some((key) => {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const occurrences = rawJson.match(new RegExp(`"${escapedKey}"\\s*:`, "g")) ?? [];
    return occurrences.length !== 1;
  });
}

function parseBindingForTargets(rawJson, targets) {
  if (typeof rawJson !== "string" || rawJson.length === 0 || Buffer.byteLength(rawJson, "utf8") > MAX_OUTPUT_BYTES) {
    return invalidBinding();
  }
  if (SECRET_SHAPED_BINDING.test(rawJson)) return invalidBinding();
  if (hasDuplicateBindingKeys(rawJson)) return invalidBinding();

  let binding;
  try {
    binding = JSON.parse(rawJson);
  } catch {
    return invalidBinding();
  }

  if (!exactKeys(binding, TARGET_BINDING_KEYS)) return invalidBinding();
  if (binding.schemaVersion !== 1 || !targets.includes(binding.target)) return invalidBinding();
  if (binding.connectionMode !== "direct" || binding.port !== 5432) return invalidBinding();
  if (binding.database !== "postgres" || binding.user !== "postgres" || binding.sslMode !== "verify-full") return invalidBinding();
  if (![binding.projectRef, binding.host, binding.database, binding.user, binding.sslMode, binding.caSha256].every(isStrictAscii)) {
    return invalidBinding();
  }
  if (!/^[a-z0-9]+$/.test(binding.projectRef)) return invalidBinding();
  if (binding.host !== `db.${binding.projectRef}.supabase.co`) return invalidBinding();
  if (!DIGEST_PATTERN.test(binding.caSha256)) return invalidBinding();

  return { ok: true, binding };
}

export function parseTargetBinding(rawJson) {
  return parseBindingForTargets(rawJson, ["preview", "production"]);
}

// Recovery has a separate entry point; ordinary preflight keeps its two targets.
export function parseRecoveryTargetBinding(rawJson) {
  return parseBindingForTargets(rawJson, ["recovery"]);
}

function digestMatches(binding, expectedDigest) {
  if (typeof expectedDigest !== "string" || !DIGEST_PATTERN.test(expectedDigest)) return false;
  const actual = Buffer.from(computeBindingSha256(binding), "ascii");
  const expected = Buffer.from(expectedDigest, "ascii");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.length > 0 && !value.includes("\u0000");
}

function hasForbiddenConnectionEnvironment(env) {
  for (const key of Object.keys(env)) {
    if (key.startsWith("PG") && !ALLOWED_LIBPQ_ENV_KEYS.has(key)) return true;
    if (key.startsWith("PGSERVICE")) return true;
    if (CONNECTION_URL_KEYS.has(key)) return true;
  }
  return false;
}

function readCaFile(fsApi, caPath, expectedDigest) {
  if (!nonEmptyString(caPath) || /[\u0000\r\n]/.test(caPath)) return false;
  try {
    const stat = fsApi.lstatSync(caPath);
    if (!stat || typeof stat.isFile !== "function" || !stat.isFile()) return false;
    const bytes = fsApi.readFileSync(caPath);
    const actual = createHash("sha256").update(bytes).digest("hex");
    return actual === expectedDigest;
  } catch {
    return false;
  }
}

export function buildChildEnvironment(binding, env) {
  const childEnv = {};
  for (const key of PROCESS_ESSENTIAL_KEYS) {
    if (nonEmptyString(env[key])) childEnv[key] = env[key];
  }
  childEnv.PGHOST = binding.host;
  childEnv.PGPORT = "5432";
  childEnv.PGDATABASE = "postgres";
  childEnv.PGUSER = "postgres";
  childEnv.PGSSLMODE = "verify-full";
  childEnv.PGSSLROOTCERT = env.PGSSLROOTCERT;
  childEnv.PGGSSENCMODE = "disable";
  childEnv.PGOPTIONS = READONLY_PGOPTIONS;
  if (nonEmptyString(env.PGPASSWORD)) childEnv.PGPASSWORD = env.PGPASSWORD;
  if (nonEmptyString(env.PGPASSFILE)) childEnv.PGPASSFILE = env.PGPASSFILE;
  return childEnv;
}

export function validateConnectionContext(binding, env, fsApi = fs) {
  if (!isPlainObject(env) || hasForbiddenConnectionEnvironment(env)) {
    return { ok: false, reason: "CONNECTION_BINDING_MISMATCH" };
  }
  if (!["PGHOST", "PGPORT", "PGDATABASE", "PGUSER", "PGSSLMODE"].every((key) => hasOwn(env, key))) {
    return { ok: false, reason: "CONNECTION_BINDING_MISMATCH" };
  }
  if (env.PGHOST !== binding.host || env.PGPORT !== "5432" || env.PGDATABASE !== "postgres" || env.PGUSER !== "postgres") {
    return { ok: false, reason: "CONNECTION_BINDING_MISMATCH" };
  }
  if (env.PGSSLMODE !== "verify-full") return { ok: false, reason: "TLS_CONTEXT_INVALID" };
  if (!hasOwn(env, "PGSSLROOTCERT")) return { ok: false, reason: "TLS_CONTEXT_INVALID" };
  if (!readCaFile(fsApi, env.PGSSLROOTCERT, binding.caSha256)) {
    return { ok: false, reason: "TLS_CONTEXT_INVALID" };
  }
  const hasPassword = nonEmptyString(env.PGPASSWORD);
  const hasPasswordFile = nonEmptyString(env.PGPASSFILE);
  if (hasPassword === hasPasswordFile) return { ok: false, reason: "CONNECTION_BINDING_MISMATCH" };
  if (!nonEmptyString(env.PATH)) return { ok: false, reason: "CONNECTION_BINDING_MISMATCH" };

  return { ok: true, childEnv: buildChildEnvironment(binding, env) };
}

export function buildPsqlInvocation(binding, env, fsApi = fs) {
  const context = validateConnectionContext(binding, env, fsApi);
  if (!context.ok) return context;
  return {
    ok: true,
    command: PSQL_COMMAND,
    args: [...FIXED_PSQL_ARGS],
    env: context.childEnv,
    input: READONLY_SQL_BY_TARGET[binding.target],
    shell: false
  };
}

function emptyEvidence() {
  return {
    historyCount: null,
    historyDigest: null,
    pendingDigest: null,
    legacyDigest: null,
    sourceEraDigest: null,
    canonicalRelationsDigest: null,
    canonicalRpcAclDigest: null,
    archiveDigest: null,
    limitsDigest: null,
    schedulerEvidenceDigest: null,
    maintenanceTransportPrivilegeDigest: null,
    extensions: { pgNet: null, pgCron: null, vault: null },
    storageObjectCount: null,
    grantsRlsDigest: null,
    vault: { total: null, reservedNames: null, recordIdDigest: null },
    cron: { matching: null, active: null, jobIdDigest: null, commandDigest: null, runDelta: null },
    schedulerProcessCount: null,
    advisor: { baselineDigest: null, currentDigest: null, inScopeNew: null, highCriticalNew: null }
  };
}

function overlayEvidence(raw) {
  const baseline = emptyEvidence();
  if (!isPlainObject(raw)) return baseline;
  for (const key of REQUIRED_EVIDENCE_KEYS) {
    if (hasOwn(raw, key)) {
      if (["extensions", "vault", "cron", "advisor"].includes(key)) {
        baseline[key] = { ...baseline[key], ...(isPlainObject(raw[key]) ? raw[key] : {}) };
      } else {
        baseline[key] = raw[key];
      }
    }
  }
  return baseline;
}

function validNonNegativeInteger(value) {
  return value === null || (Number.isInteger(value) && value >= 0);
}

function validDigestOrNull(value) {
  return value === null || (typeof value === "string" && DIGEST_PATTERN.test(value));
}

function validateNestedEvidence(raw, key, expectedKeys) {
  if (raw === null) return true;
  return exactKeys(raw, expectedKeys);
}

function validateEvidenceShape(raw) {
  if (!isPlainObject(raw)) return false;
  if (![...RAW_EVIDENCE_KEYS].every((key) => !hasOwn(raw, key) || RAW_EVIDENCE_KEYS.has(key))) return false;
  if (Object.keys(raw).some((key) => !RAW_EVIDENCE_KEYS.has(key))) return false;
  if (hasOwn(raw, "serverVersion") && typeof raw.serverVersion !== "string") return false;
  if (hasOwn(raw, "transactionReadOnly") && raw.transactionReadOnly !== "on") return false;
  if (hasOwn(raw, "transactionIsolation") && raw.transactionIsolation !== "repeatable read") return false;

  for (const key of [
    "historyDigest",
    "pendingDigest",
    "legacyDigest",
    "sourceEraDigest",
    "canonicalRelationsDigest",
    "canonicalRpcAclDigest",
    "archiveDigest",
    "limitsDigest",
    "schedulerEvidenceDigest",
    "maintenanceTransportPrivilegeDigest",
    "grantsRlsDigest"
  ]) {
    if (hasOwn(raw, key) && !validDigestOrNull(raw[key])) return false;
  }
  for (const key of ["historyCount", "storageObjectCount", "schedulerProcessCount"]) {
    if (hasOwn(raw, key) && !validNonNegativeInteger(raw[key])) return false;
  }

  if (hasOwn(raw, "extensions")) {
    if (raw.extensions !== null && !exactKeys(raw.extensions, EXTENSION_KEYS)) return false;
    if (raw.extensions && EXTENSION_KEYS.some((key) => raw.extensions[key] !== null && typeof raw.extensions[key] !== "boolean")) return false;
  }
  if (hasOwn(raw, "vault")) {
    if (raw.vault !== null && !exactKeys(raw.vault, VAULT_KEYS)) return false;
    if (raw.vault) {
      if (!["total", "reservedNames"].every((key) => validNonNegativeInteger(raw.vault[key]))) return false;
      if (!validDigestOrNull(raw.vault.recordIdDigest)) return false;
    }
  }
  if (hasOwn(raw, "cron")) {
    if (raw.cron !== null && !exactKeys(raw.cron, CRON_KEYS)) return false;
    if (raw.cron) {
      if (!validNonNegativeInteger(raw.cron.matching) || !validNonNegativeInteger(raw.cron.runDelta)) return false;
      if (raw.cron.active !== null && typeof raw.cron.active !== "boolean") return false;
      if (!validDigestOrNull(raw.cron.jobIdDigest) || !validDigestOrNull(raw.cron.commandDigest)) return false;
    }
  }
  if (hasOwn(raw, "advisor")) {
    if (raw.advisor !== null && !exactKeys(raw.advisor, ADVISOR_KEYS)) return false;
    if (raw.advisor) {
      if (!validDigestOrNull(raw.advisor.baselineDigest) || !validDigestOrNull(raw.advisor.currentDigest)) return false;
      if (!validNonNegativeInteger(raw.advisor.inScopeNew) || !validNonNegativeInteger(raw.advisor.highCriticalNew)) return false;
    }
  }
  return true;
}

function completeEvidence(evidence) {
  if (REQUIRED_EVIDENCE_KEYS.some((key) => evidence[key] === null)) return false;
  if (Object.values(evidence.extensions).some((value) => value === null)) return false;
  if (Object.values(evidence.vault).some((value) => value === null)) return false;
  if (Object.values(evidence.cron).some((value) => value === null)) return false;
  if (Object.values(evidence.advisor).some((value) => value === null)) return false;
  return true;
}

export function parseSanitizedEvidence(stdout, stderr = "", metadata = {}) {
  if (typeof stdout !== "string" || typeof stderr !== "string") return { ok: false, reason: "REQUIRED_EVIDENCE_UNAVAILABLE" };
  const stdoutBytes = Buffer.byteLength(stdout, "utf8");
  const stderrBytes = Buffer.byteLength(stderr, "utf8");
  if (stdoutBytes > MAX_OUTPUT_BYTES || stderrBytes > MAX_OUTPUT_BYTES || stdoutBytes + stderrBytes > MAX_OUTPUT_BYTES) {
    return { ok: false, reason: "REQUIRED_EVIDENCE_UNAVAILABLE" };
  }
  if (SECRET_SHAPED_OUTPUT.test(stdout) || SECRET_SHAPED_OUTPUT.test(stderr)) {
    return { ok: false, reason: "REQUIRED_EVIDENCE_UNAVAILABLE" };
  }
  if (hasOwn(metadata, "captureComplete") && metadata.captureComplete !== true) {
    return { ok: false, reason: "REQUIRED_EVIDENCE_UNAVAILABLE" };
  }
  if (hasOwn(metadata, "error") && metadata.error !== null && metadata.error !== undefined) {
    return { ok: false, reason: "REQUIRED_EVIDENCE_UNAVAILABLE" };
  }
  if (hasOwn(metadata, "signal") && metadata.signal !== null && metadata.signal !== undefined) {
    return { ok: false, reason: "REQUIRED_EVIDENCE_UNAVAILABLE" };
  }
  const rowCounts = [];
  if (hasOwn(metadata, "rowCount")) rowCounts.push(metadata.rowCount);
  if (hasOwn(metadata, "resultSetRows")) {
    if (!Array.isArray(metadata.resultSetRows)) return { ok: false, reason: "REQUIRED_EVIDENCE_UNAVAILABLE" };
    rowCounts.push(...metadata.resultSetRows);
  }
  if (rowCounts.length === 0) return { ok: false, reason: "REQUIRED_EVIDENCE_UNAVAILABLE" };
  if (rowCounts.some((count) => !Number.isInteger(count) || count < 0 || count > MAX_RESULT_ROWS)) {
    return { ok: false, reason: "REQUIRED_EVIDENCE_UNAVAILABLE" };
  }
  if (stderr.length > 0) return { ok: false, reason: "REQUIRED_EVIDENCE_UNAVAILABLE" };

  const lines = stdout.split(/\r?\n/).filter((line) => line.length > 0);
  if (lines.length !== 1) return { ok: false, reason: "REQUIRED_EVIDENCE_UNAVAILABLE" };
  let raw;
  try {
    raw = JSON.parse(lines[0]);
  } catch {
    return { ok: false, reason: "REQUIRED_EVIDENCE_UNAVAILABLE" };
  }
  if (!validateEvidenceShape(raw)) return { ok: false, reason: "REQUIRED_EVIDENCE_UNAVAILABLE" };
  if (raw.serverVersion === undefined || !/\bPostgreSQL\)?\s+17(?:\.|\s|$)/i.test(raw.serverVersion)) {
    return { ok: false, reason: "CONNECTION_FAILED" };
  }
  if (raw.transactionReadOnly !== "on" || raw.transactionIsolation !== "repeatable read") {
    return { ok: false, reason: "REQUIRED_EVIDENCE_UNAVAILABLE" };
  }
  const evidence = overlayEvidence(raw);
  return {
    ok: true,
    complete: completeEvidence(evidence),
    evidence,
    reason: completeEvidence(evidence) ? null : "REQUIRED_EVIDENCE_UNAVAILABLE"
  };
}

function makeOutput(target, status, blockedReason, evidence = emptyEvidence()) {
  return {
    schemaVersion: SCHEMA_VERSION,
    target: target ?? null,
    status,
    historyCount: evidence.historyCount,
    historyDigest: evidence.historyDigest,
    pendingDigest: evidence.pendingDigest,
    legacyDigest: evidence.legacyDigest,
    sourceEraDigest: evidence.sourceEraDigest,
    canonicalRelationsDigest: evidence.canonicalRelationsDigest,
    canonicalRpcAclDigest: evidence.canonicalRpcAclDigest,
    archiveDigest: evidence.archiveDigest,
    limitsDigest: evidence.limitsDigest,
    schedulerEvidenceDigest: evidence.schedulerEvidenceDigest,
    maintenanceTransportPrivilegeDigest: evidence.maintenanceTransportPrivilegeDigest,
    extensions: { ...evidence.extensions },
    storageObjectCount: evidence.storageObjectCount,
    grantsRlsDigest: evidence.grantsRlsDigest,
    vault: { ...evidence.vault },
    cron: { ...evidence.cron },
    schedulerProcessCount: evidence.schedulerProcessCount,
    advisor: { ...evidence.advisor },
    mutationCounts: { ddl: 0, dml: 0, rpc: 0, remote: 0, total: 0 },
    blockedReason: blockedReason ?? null
  };
}

function blocked(target, reason, evidence = emptyEvidence(), status = "blocked-context-absent") {
  return makeOutput(target, status, reason, evidence);
}

export function parseCliArgs(argv) {
  let target = null;
  let invalid = false;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--target") {
      if (target !== null || typeof argv[index + 1] !== "string" || argv[index + 1].startsWith("--")) {
        invalid = true;
      } else {
        target = argv[index + 1];
        index += 1;
      }
    } else if (argument.startsWith("--target=")) {
      if (target !== null || argument.length === "--target=".length) invalid = true;
      else target = argument.slice("--target=".length);
    } else {
      invalid = true;
    }
  }
  if (invalid) return { target: null, reason: "TARGET_BINDING_INVALID" };
  if (target === null) return { target: null, reason: "TARGET_BINDING_MISSING" };
  if (target !== "preview" && target !== "production") return { target: null, reason: "TARGET_BINDING_INVALID" };
  return { target, reason: null };
}

function normalizeNativeCapture(result, maxOutputBytes = MAX_OUTPUT_BYTES) {
  if (!result || result.status !== 0 || (result.error !== null && result.error !== undefined) || (result.signal !== null && result.signal !== undefined)) {
    return null;
  }
  if (typeof result.stdout !== "string" || typeof result.stderr !== "string") return null;
  const stdoutBytes = Buffer.byteLength(result.stdout, "utf8");
  const stderrBytes = Buffer.byteLength(result.stderr, "utf8");
  if (stdoutBytes > maxOutputBytes || stderrBytes > maxOutputBytes || stdoutBytes + stderrBytes > maxOutputBytes) {
    return null;
  }
  if (result.stderr.length > 0) return null;
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    rowCount: result.stdout.split(/\r?\n/).filter((line) => line.length > 0).length
  };
}

function failedNativeCapture() {
  return { exitCode: 1, stdout: "", stderr: "", rowCount: 0 };
}

export function createPsqlTransport({ spawnSyncImpl = spawnSync, maxOutputBytes = MAX_OUTPUT_BYTES } = {}) {
  return {
    execute(invocation) {
      if (!Number.isSafeInteger(maxOutputBytes) || maxOutputBytes < 1 || maxOutputBytes > POSTAPPLY_MAX_OUTPUT_BYTES) return failedNativeCapture();
      let versionResult;
      try {
        versionResult = spawnSyncImpl(invocation.command, ["--version"], {
          encoding: "utf8",
          env: invocation.env,
          shell: false,
          windowsHide: true,
          maxBuffer: MAX_OUTPUT_BYTES,
          timeout: VERSION_CAPTURE_TIMEOUT_MS
        });
      } catch {
        return failedNativeCapture();
      }
      const versionCapture = normalizeNativeCapture(versionResult);
      if (!versionCapture || !/\bPostgreSQL\)?\s+17(?:\.|\s|$)/i.test(versionCapture.stdout)) {
        return failedNativeCapture();
      }

      let result;
      try {
        result = spawnSyncImpl(invocation.command, invocation.args, {
          encoding: "utf8",
          env: invocation.env,
          input: invocation.input,
          shell: false,
          windowsHide: true,
          maxBuffer: maxOutputBytes,
          timeout: QUERY_CAPTURE_TIMEOUT_MS
        });
      } catch {
        return failedNativeCapture();
      }
      const queryCapture = normalizeNativeCapture(result, maxOutputBytes);
      if (!queryCapture) return failedNativeCapture();
      return {
        exitCode: 0,
        ...queryCapture,
        captureComplete: true
      };
    }
  };
}

export function runPreflight({ target, env = process.env, fsApi = fs, transport = createPsqlTransport() } = {}) {
  const targetResult = target === "preview" || target === "production"
    ? { ok: true }
    : { ok: false, reason: target === undefined || target === null ? "TARGET_BINDING_MISSING" : "TARGET_BINDING_INVALID" };
  if (!targetResult.ok) return blocked(null, targetResult.reason);
  if (!isPlainObject(env)) return blocked(target, "TARGET_BINDING_MISSING");

  const rawBinding = env.GATE1_TARGET_BINDING_JSON;
  const expectedDigest = env.GATE1_TARGET_BINDING_SHA256;
  if (!nonEmptyString(rawBinding) || !nonEmptyString(expectedDigest)) return blocked(target, "TARGET_BINDING_MISSING");
  const parsedBinding = parseTargetBinding(rawBinding);
  if (!parsedBinding.ok) return blocked(target, parsedBinding.reason);
  const binding = parsedBinding.binding;
  if (!digestMatches(binding, expectedDigest)) return blocked(target, "TARGET_BINDING_DIGEST_MISMATCH");
  if (binding.target !== target) return blocked(target, "CONNECTION_BINDING_MISMATCH");

  const invocation = buildPsqlInvocation(binding, env, fsApi);
  if (!invocation.ok) return blocked(target, invocation.reason);
  if (!transport || typeof transport.execute !== "function") return blocked(target, "CONNECTION_FAILED");

  let transportResult;
  try {
    transportResult = transport.execute(invocation);
  } catch {
    return blocked(target, "CONNECTION_FAILED", emptyEvidence(), "blocked-connection-failed");
  }
  if (!transportResult || transportResult.exitCode !== 0) {
    return blocked(target, "CONNECTION_FAILED", emptyEvidence(), "blocked-connection-failed");
  }

  const parsedEvidence = parseSanitizedEvidence(
    transportResult.stdout,
    transportResult.stderr,
    transportResult
  );
  if (!parsedEvidence.ok) return blocked(target, parsedEvidence.reason, emptyEvidence(), "blocked-required-evidence");
  if (!parsedEvidence.complete) {
    return blocked(target, "REQUIRED_EVIDENCE_UNAVAILABLE", parsedEvidence.evidence, "blocked-required-evidence");
  }
  return makeOutput(target, "readonly-evidence", null, parsedEvidence.evidence);
}

function isMainModule() {
  if (!process.argv[1]) return false;
  try {
    return path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

export function main(argv = process.argv.slice(2), env = process.env) {
  const cli = parseCliArgs(argv);
  const result = cli.reason
    ? blocked(cli.target, cli.reason)
    : runPreflight({ target: cli.target, env });
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (result.status !== "readonly-evidence") process.exitCode = 2;
  return result;
}

if (isMainModule()) main();
