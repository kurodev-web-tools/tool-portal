import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  assertCanonicalObservationAgainstStructure,
  assertCanonicalPaidRpcSecurityBoundary,
  assertCanonicalStructuralState
} from "./lib/comment-translator-paid-core-v1-gate1-catalog.mjs";

const root = process.cwd();
const migrationsRoot = path.join(root, "supabase", "migrations");
const fixturesRoot = path.join(root, "scripts", "fixtures");
const historyFixturePath = path.join(fixturesRoot, "comment-translator-paid-core-v1-gate1-production-history.json");
const identityRpcFixturePath = path.join(fixturesRoot, "comment-translator-paid-core-v1-gate1-canonical-rpc.json");
const canonicalFunctionManifestPath = path.join(fixturesRoot, "comment-translator-paid-core-v1-gate1-canonical-function-manifest.json");
const paidLegacyCatalogPath = path.join(fixturesRoot, "comment-translator-paid-core-v1-gate1-paid-legacy-catalog.json");
const sourceEraCatalogPath = path.join(fixturesRoot, "comment-translator-paid-core-v1-gate1-source-era-catalog.json");
const bridgeStatesPath = path.join(fixturesRoot, "comment-translator-paid-core-v1-gate1-bridge-states.json");
const environmentInventoriesPath = path.join(fixturesRoot, "comment-translator-paid-core-v1-gate1-environment-inventories.json");
const canonicalAuthorityPath = path.join(fixturesRoot, "comment-translator-paid-core-v1-gate1-canonical-authority.json");
const bridgePath = path.join(migrationsRoot, "20260811000000_comment_translator_paid_v1_legacy_schema_bridge.sql");
const pgNetPath = path.join(migrationsRoot, "20260814105000_comment_translator_paid_pg_net_extension.sql");
const forwardConvergenceMigration = "20260904000000_comment_translator_paid_gate1_a3_canonical_convergence";

const baselineMigrations = [
  "20260527000000_account_preferences_foundation",
  "20260601000000_youtube_oauth_credentials",
  "20260615000000_comment_translator_sessions",
  "20260615001000_comment_translator_usage_ledger_events",
  "20260623000000_comment_translator_real_comments_feed_snapshots",
  "20260624000000_account_display_timezone_preference",
  "20260705000000_comment_translator_creator_waitlist_registrations",
  "20260706073204_supabase_default_privileges_guard",
  "20260812120000_comment_translator_paid_core_v1",
  "20260813130000_comment_translator_paid_task6_circuit_probe_claim",
  "20260813131500_comment_translator_paid_task6_openai_rate_retry",
  "20260813133000_comment_translator_paid_task6_owned_circuit_failure",
  "20260813134500_comment_translator_paid_task6_azure_billing_split",
  "20260813135500_comment_translator_paid_task6_azure_uncertain_retry_compatibility",
  "20260813140000_comment_translator_paid_task6_azure_uncertain_retry",
  "20260813141500_comment_translator_paid_task6_circuit_success_window",
  "20260813143000_comment_translator_paid_task6_openai_resume_status",
  "20260813144500_comment_translator_paid_task6_terminal_openai_partial",
  "20260813150000_comment_translator_paid_task6_openai_partial_receipt",
  "20260813151500_comment_translator_paid_task6_terminal_openai_partial_authority",
  "20260813153000_comment_translator_paid_task6_replay_circuit_authority",
  "20260813154500_comment_translator_paid_task6_dispatch_and_azure_partial_settlement",
  "20260814100000_comment_translator_paid_task7_runtime_authority",
  "20260814110000_comment_translator_paid_task9_retention_observability",
  "20260815090000_comment_translator_paid_cron_vault_transport",
  "20260818100000_comment_translator_paid_gate0a_poll_budget_rpc_repair",
  "20260819100000_comment_translator_paid_gate0a_lifecycle_read_repair",
  "20260819110000_comment_translator_paid_gate0a_capacity_read_repair",
  "20260823120000_comment_translator_paid_gate0a_unbound_hold_recovery",
  "20260823130000_comment_translator_paid_gate0a_schedule_function_privilege_repair",
  "20260826100000_comment_translator_paid_gate0a_checkout_recovery_window_floor",
  "20260826110000_comment_translator_paid_gate0a_recovery_floor_second_canonicalization",
  "20260827020609_comment_translator_paid_checkout_expiry_finalize_lease",
  "20260829100000_comment_translator_paid_task6_azure_uncertain_retry_guard_repair",
  "20260831100000_comment_translator_paid_task11_message_rate_runtime_repair"
];

const markerSpecs = [
  ["20260624040504", "comment_translator_real_comments_feed_snapshots", 1, 3473, "32ce077c0d033e0aa166132d37c64973", "normalized-local-replacement", "20260623000000"],
  ["20260624141142", "account_display_timezone_preference", 1, 700, "bb06bafd3ffb897284b0e4cf27bc076f", "normalized-local-replacement", "20260624000000"],
  ["20260722000000", "comment_translator_paid_entitlements", 17, 6038, "9bd1986a3eb71496e96319ff87c5a6e3", "paid-legacy-archive-and-canonical-replacement", "20260812120000"],
  ["20260722001000", "comment_translator_paid_usage_counters", 25, 10424, "59114cdc1e208791aa5e4fd661b11c30", "paid-legacy-archive-and-canonical-replacement", "20260812120000"],
  ["20260722002000", "comment_translator_obs_overlay_tokens", 16, 5209, "0810fac8f39094e25567101dddcc4e42", "retained-production-only-outside-a2", null],
  ["20260722003000", "comment_translator_obs_overlay_browser_sessions", 9, 1771, "adfad87c8014ec22eedd0cfe34d20fc6", "retained-production-only-outside-a2", null],
  ["20260723000000", "comment_translator_moderator_share_tokens", 16, 5082, "a82bf8f600249ff1a4308d525354d89a", "retained-production-only-outside-a2", null],
  ["20260723001000", "comment_translator_moderator_share_browser_sessions", 10, 2117, "db73510f8dc44e4fb1c293965396327e", "retained-production-only-outside-a2", null],
  ["20260723002000", "comment_translator_custom_dictionary", 18, 8172, "bae5d675449b7aebf10d99a64c1e0459", "retained-production-only-outside-a2", null],
  ["20260723003000", "comment_translator_creator_history", 12, 2056, "f0caa787a451a42a08bbb81bf4303c1f", "retained-production-only-outside-a2", null],
  ["20260726111154", "comment_translator_paid_entitlements", 1, 6065, "293df19b9f922936c60038daf42cfebc", "paid-legacy-archive-and-canonical-replacement", "20260812120000"],
  ["20260728135736", "comment_translator_paid_usage_counters", 1, 10461, "dc486ca138f0d2e258581ab960a1aa98", "paid-legacy-archive-and-canonical-replacement", "20260812120000"],
  ["20260728142220", "comment_translator_obs_overlay_tokens", 1, 5234, "8f1ef08f04521176699abc35c2fd8c09", "retained-production-only-outside-a2", null],
  ["20260728145324", "comment_translator_obs_overlay_browser_sessions", 1, 1785, "00590230209f530666c50460e5439fe8", "retained-production-only-outside-a2", null],
  ["20260728160206", "comment_translator_moderator_share_tokens", 1, 5107, "9be8e7b679209f9c63da5688753bc49d", "retained-production-only-outside-a2", null],
  ["20260728164122", "comment_translator_moderator_share_browser_sessions", 1, 2133, "6a4290f68e19c41f204305b63b7993fb", "retained-production-only-outside-a2", null],
  ["20260728172220", "comment_translator_custom_dictionary", 1, 8200, "0e30272eb31457551f1d9eba7d7f37f8", "retained-production-only-outside-a2", null],
  ["20260729035621", "comment_translator_creator_history", 1, 2074, "6590c4e2a350ba00b9e8dd21645fa4d8", "retained-production-only-outside-a2", null]
].map(([version, name, statementCount, sqlBytes, statementsMd5, classification, replacementVersion]) => ({
  version,
  name,
  statementCount,
  sqlBytes,
  statementsMd5,
  classification,
  replacementVersion
}));

const forbiddenMarkerTokens = /\b(?:create|alter|drop|grant|revoke|insert|update|delete|truncate|select|execute|perform|migration\s+repair)\b/i;
const sourceEraNames = [
  "comment_translator_obs_overlay_tokens",
  "comment_translator_obs_overlay_browser_sessions",
  "comment_translator_moderator_share_tokens",
  "comment_translator_moderator_share_browser_sessions",
  "comment_translator_custom_dictionary",
  "comment_translator_creator_history"
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortKeysDeep(value[key])]));
}

function objectSha256(value) {
  const { aggregateSha256: _ignored, ...projection } = value;
  return crypto.createHash("sha256").update(JSON.stringify(sortKeysDeep(projection)), "utf8").digest("hex");
}

function assertExactKeys(value, keys, label) {
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), `${label} keys are exact`);
}

function normalizedSql(value) {
  return value.replace(/\r\n?/g, "\n");
}

function stripDollarQuotedBodies(value) {
  let output = "";
  let dollarTag = "";
  for (let index = 0; index < value.length; index += 1) {
    if (dollarTag) {
      if (value.startsWith(dollarTag, index)) {
        output += " ";
        index += dollarTag.length - 1;
        dollarTag = "";
      }
      continue;
    }
    if (value[index] === "$") {
      const match = value.slice(index).match(/^\$[A-Za-z_0-9]*\$/);
      if (match) {
        dollarTag = match[0];
        output += " ";
        index += dollarTag.length - 1;
        continue;
      }
    }
    output += value[index];
  }
  return output;
}

function markerText(spec) {
  return [
    "-- Comment Translator Paid Core v1 Gate 1 migration-history marker.",
    `-- Original production version: ${spec.version}`,
    `-- Original production name: ${spec.name}`,
    `-- Original statement count: ${spec.statementCount}`,
    `-- Original SQL bytes: ${spec.sqlBytes}`,
    `-- Original statements MD5: ${spec.statementsMd5}`,
    `-- Schema effect: ${spec.classification}`,
    "-- The original SQL is deliberately not replayed by this marker.",
    "",
    "do $comment_translator_paid_gate1_history_marker$",
    "begin",
    "  null;",
    "end",
    "$comment_translator_paid_gate1_history_marker$;",
    ""
  ].join("\n");
}

function validateHistoryFixture() {
  assert.equal(fs.existsSync(historyFixturePath), true, "production history fixture exists");
  const fixture = readJson(historyFixturePath);
  assertExactKeys(fixture, ["aggregateSha256", "highConfidenceSecretMatches", "rollbackStatementCount", "rows", "schemaVersion"], "production history fixture");
  assert.equal(fixture.schemaVersion, 1);
  assert.deepEqual(fixture.rows, markerSpecs, "history metadata equals independent approved metadata");
  assert.equal(fixture.highConfidenceSecretMatches, 0);
  assert.equal(fixture.rollbackStatementCount, 0);
  assert.equal(fixture.rows.length, 18);
  assert.equal(new Set(fixture.rows.map(({ version }) => version)).size, 18);
  assert.equal(objectSha256(fixture), fixture.aggregateSha256);
  return fixture;
}

function validateIdentityFixture() {
  assert.equal(fs.existsSync(identityRpcFixturePath), true, "saved identity RPC fixture exists");
  const fixture = readJson(identityRpcFixturePath);
  assertExactKeys(fixture, ["aggregateSha256", "expectedCount", "functions", "schemaVersion"], "saved identity RPC fixture");
  assert.equal(fixture.schemaVersion, 1);
  assert.equal(fixture.expectedCount, 81);
  assert.equal(fixture.functions.length, 81);
  assert.equal(fixture.aggregateSha256, "7f833ff897e57d1d418bcf954c3367cd3b07612b09f4e182d94bbc5fee1680d9");
  assert.equal(objectSha256(fixture), fixture.aggregateSha256);
  for (const row of fixture.functions) {
    assertExactKeys(row, ["identityArguments", "name", "schema"], "identity RPC row");
    assert.equal(row.schema, "public");
    assert.match(row.name, /^ct_paid_[a-z0-9_]+$/);
    assert.equal(typeof row.identityArguments, "string");
  }
  assert.equal(Object.prototype.hasOwnProperty.call(fixture, "aggregateMd5"), false, "identity fixture has no FunctionRow MD5 field");
  return fixture;
}

const dependencyCountKeys = [
  "inboundForeignKeys",
  "views",
  "materializedViews",
  "rules",
  "policies",
  "userTriggers",
  "eventTriggers",
  "publications",
  "outsideFunctionSourceReferences",
  "unexpectedPgDependEdges"
];
const tableRowKeys = ["schema", "name", "owner", "rlsEnabled", "rowCount", "columns", "constraints", "indexes", "policies", "acls"];
const columnRowKeys = ["schema", "table", "ordinal", "name", "type", "notNull", "defaultDefinition"];
const constraintRowKeys = ["schema", "table", "name", "type", "definition"];
const indexRowKeys = ["schema", "table", "name", "definition"];
const policyRowKeys = ["schema", "table", "name", "command", "permissive", "roles", "usingDefinition", "checkDefinition"];
const aclRowKeys = ["schema", "objectKind", "objectIdentity", "grantee", "privilege", "grantable"];
const functionRowKeys = ["schema", "name", "identityArguments", "resultType", "owner", "securityDefiner", "config", "acls", "definitionMd5"];
const triggerRowKeys = ["tableSchema", "tableName", "name", "enabled", "functionIdentity", "definition"];
const catalogStateKeys = ["tables", "functions", "triggers", "dependencyCounts"];
const sourceEraTableNames = [
  "comment_translator_creator_history",
  "comment_translator_custom_dictionary_entries",
  "comment_translator_moderator_share_browser_sessions",
  "comment_translator_moderator_share_tokens",
  "comment_translator_obs_overlay_browser_sessions",
  "comment_translator_obs_overlay_tokens"
];
const paidLegacyTableNames = [
  "comment_translator_paid_entitlements",
  "comment_translator_paid_usage_counters",
  "comment_translator_paid_usage_events"
];

function assertString(value, label) {
  assert.equal(typeof value, "string", `${label} is a string`);
}

function assertBoolean(value, label) {
  assert.equal(typeof value, "boolean", `${label} is a boolean`);
}

function assertNonNegativeInteger(value, label) {
  assert.equal(Number.isInteger(value) && value >= 0, true, `${label} is a non-negative integer`);
}

function validateAclRow(row, label) {
  assertExactKeys(row, aclRowKeys, label);
  for (const key of aclRowKeys) {
    if (key === "grantable") assertBoolean(row[key], `${label}.${key}`);
    else assertString(row[key], `${label}.${key}`);
  }
}

function validateFunctionRow(row, label) {
  assertExactKeys(row, functionRowKeys, label);
  for (const key of ["schema", "name", "identityArguments", "resultType", "owner", "definitionMd5"]) {
    assertString(row[key], `${label}.${key}`);
  }
  assertBoolean(row.securityDefiner, `${label}.securityDefiner`);
  assert.equal(Array.isArray(row.config), true, `${label}.config is an array`);
  row.config.forEach((value, index) => assertString(value, `${label}.config[${index}]`));
  assert.equal([...row.config].sort().join("\n"), row.config.join("\n"), `${label}.config is sorted`);
  assert.match(row.definitionMd5, /^[0-9a-f]{32}$/, `${label}.definitionMd5 is an MD5`);
  assert.equal(Array.isArray(row.acls), true, `${label}.acls is an array`);
  row.acls.forEach((acl, index) => validateAclRow(acl, `${label}.acls[${index}]`));
}

function validateCatalogState(state, label) {
  assertExactKeys(state, catalogStateKeys, label);
  for (const [index, row] of state.tables.entries()) {
    const rowLabel = `${label}.tables[${index}]`;
    assertExactKeys(row, tableRowKeys, rowLabel);
    for (const key of ["schema", "name", "owner"]) assertString(row[key], `${rowLabel}.${key}`);
    assertBoolean(row.rlsEnabled, `${rowLabel}.rlsEnabled`);
    assertNonNegativeInteger(row.rowCount, `${rowLabel}.rowCount`);
    for (const [field, keys] of [["columns", columnRowKeys], ["constraints", constraintRowKeys], ["indexes", indexRowKeys], ["policies", policyRowKeys]]) {
      assert.equal(Array.isArray(row[field]), true, `${rowLabel}.${field} is an array`);
      row[field].forEach((nested, nestedIndex) => {
        const nestedLabel = `${rowLabel}.${field}[${nestedIndex}]`;
        assertExactKeys(nested, keys, nestedLabel);
        for (const key of ["schema", "table", "name"]) assertString(nested[key], `${nestedLabel}.${key}`);
        if (field === "columns") {
          assertNonNegativeInteger(nested.ordinal, `${nestedLabel}.ordinal`);
          assert.ok(nested.ordinal > 0, `${nestedLabel}.ordinal is positive`);
          assertString(nested.type, `${nestedLabel}.type`);
          assertBoolean(nested.notNull, `${nestedLabel}.notNull`);
          if (nested.defaultDefinition !== null) assertString(nested.defaultDefinition, `${nestedLabel}.defaultDefinition`);
        } else if (field === "constraints" || field === "indexes") {
          assertString(nested.definition, `${nestedLabel}.definition`);
          if (field === "constraints") assertString(nested.type, `${nestedLabel}.type`);
        } else {
          assertString(nested.command, `${nestedLabel}.command`);
          assertBoolean(nested.permissive, `${nestedLabel}.permissive`);
          assert.equal(Array.isArray(nested.roles), true, `${nestedLabel}.roles is an array`);
          nested.roles.forEach((role, roleIndex) => assertString(role, `${nestedLabel}.roles[${roleIndex}]`));
          assert.equal([...nested.roles].sort().join("\n"), nested.roles.join("\n"), `${nestedLabel}.roles is sorted`);
          for (const key of ["usingDefinition", "checkDefinition"]) {
            if (nested[key] !== null) assertString(nested[key], `${nestedLabel}.${key}`);
          }
        }
      });
    }
    assert.equal(Array.isArray(row.acls), true, `${rowLabel}.acls is an array`);
    row.acls.forEach((acl, aclIndex) => validateAclRow(acl, `${rowLabel}.acls[${aclIndex}]`));
  }
  state.functions.forEach((row, index) => validateFunctionRow(row, `${label}.functions[${index}]`));
  state.triggers.forEach((row, index) => {
    const rowLabel = `${label}.triggers[${index}]`;
    assertExactKeys(row, triggerRowKeys, rowLabel);
    for (const key of ["tableSchema", "tableName", "name", "functionIdentity", "definition"]) assertString(row[key], `${rowLabel}.${key}`);
    assertBoolean(row.enabled, `${rowLabel}.enabled`);
  });
  assertExactKeys(state.dependencyCounts, dependencyCountKeys, `${label}.dependencyCounts`);
  dependencyCountKeys.forEach((key) => assertNonNegativeInteger(state.dependencyCounts[key], `${label}.dependencyCounts.${key}`));
}

function validateCatalogFixture(filePath, label, expectedCounts) {
  const fixture = readJson(filePath);
  assertExactKeys(fixture, ["aggregateSha256", "dependencyCounts", "functions", "schemaVersion", "tables", "triggers"], `${label} fixture`);
  assert.equal(fixture.schemaVersion, 1, `${label} schema version`);
  validateCatalogState({
    tables: fixture.tables,
    functions: fixture.functions,
    triggers: fixture.triggers,
    dependencyCounts: fixture.dependencyCounts
  }, label);
  assert.equal(fixture.tables.length, expectedCounts.tables, `${label} table count`);
  assert.equal(fixture.functions.length, expectedCounts.functions, `${label} function count`);
  assert.equal(fixture.triggers.length, expectedCounts.triggers, `${label} trigger count`);
  assert.equal(objectSha256(fixture), fixture.aggregateSha256, `${label} aggregate SHA-256`);
  return fixture;
}

function validateCanonicalFunctionManifest() {
  const fixture = readJson(canonicalFunctionManifestPath);
  assertExactKeys(fixture, ["aggregateMd5", "aggregateSha256", "functions", "schemaVersion"], "canonical FunctionRow manifest");
  assert.equal(fixture.schemaVersion, 1);
  assert.equal(fixture.functions.length, 81);
  fixture.functions.forEach((row, index) => validateFunctionRow(row, `canonical FunctionRow ${index}`));
  const aggregateMd5 = crypto.createHash("md5")
    .update(fixture.functions.map((row) => JSON.stringify(sortKeysDeep(row))).join("\n"), "utf8")
    .digest("hex");
  assert.equal(fixture.aggregateMd5, aggregateMd5, "canonical FunctionRow MD5 is independently recomputed");
  assert.notEqual(fixture.aggregateMd5, "d975b161bf115fe6ecd80ad68c55134e", "superseded RPC MD5 is retired");
  assert.notEqual(fixture.aggregateMd5, "7f833ff897e57d1d418bcf954c3367cd3b07612b09f4e182d94bbc5fee1680d9", "identity SHA-256 is not a FunctionRow MD5");
  assert.equal(objectSha256(fixture), fixture.aggregateSha256, "canonical FunctionRow SHA-256");
  return fixture;
}

function validateCanonicalAuthority() {
  const fixture = readJson(canonicalAuthorityPath);
  assertExactKeys(fixture, [
    "browserExecuteRoles",
    "canonicalSource",
    "definitionDriftExpectedTrueCount",
    "definitionDriftObservation",
    "definitionDriftResolution",
    "lfReplaySource",
    "previewReadbackRole",
    "rawDefinitionMd5Policy",
    "rowCountPolicy",
    "schemaVersion",
    "serviceRolePolicy"
  ], "canonical authority fixture");
  assert.equal(fixture.schemaVersion, 1);
  assert.deepEqual(fixture.browserExecuteRoles, ["PUBLIC", "anon", "authenticated"]);
  assert.equal(fixture.canonicalSource, "repository-migrations+safe-security-contract");
  assert.equal(fixture.definitionDriftResolution, "forward-only-migration");
  assert.equal(fixture.definitionDriftExpectedTrueCount, 2);
  assert.equal(fixture.definitionDriftObservation, "UNVERIFIED_UNTIL_LOCAL_REPLAY");
  assert.equal(fixture.lfReplaySource, "git-or-deployment-equivalent-source-bytes");
  assert.equal(fixture.previewReadbackRole, "observed-drift-only");
  assert.equal(fixture.rawDefinitionMd5Policy, "exact-pg-get-functiondef-md5");
  assert.equal(fixture.rowCountPolicy, "observation-only");
  assert.equal(fixture.serviceRolePolicy, "explicit-minimum-only");
  return fixture;
}

function validateBridgeStateFixture(legacy, sourceEra, canonicalFunctionManifest) {
  const fixture = readJson(bridgeStatesPath);
  assertExactKeys(fixture, ["aggregateSha256", "canonical", "canonicalObservation", "clean", "legacy", "schemaVersion", "sourceEraExcludedObservation"], "bridge-state fixture");
  const assertDerivedSchemaVersion = (value) => {
    if (value.schemaVersion !== 2) throw new Error("BRIDGE_STATE_REGENERATION_REQUIRED");
  };
  assertDerivedSchemaVersion(fixture);
  validateCatalogState(fixture.legacy, "bridgeStates.legacy");
  assertCanonicalStructuralState(fixture.canonical);
  assertCanonicalPaidRpcSecurityBoundary(fixture.canonical);
  validateCatalogState(fixture.clean, "bridgeStates.clean");
  assert.equal(fixture.legacy.tables.length, 3);
  assert.equal(fixture.legacy.functions.length, 3);
  assert.equal(fixture.legacy.triggers.length, 1);
  assert.equal(fixture.canonical.tables.length, 33);
  assert.equal(fixture.canonical.functions.length, 81);
  assert.equal(fixture.canonical.triggers.length, 16);
  assert.equal(fixture.canonical.tables.some((row) => Object.prototype.hasOwnProperty.call(row, "rowCount")), false, "canonical structural fixture has no rowCount field");
  assert.deepEqual(fixture.legacy, {
    tables: legacy.tables,
    functions: legacy.functions,
    triggers: legacy.triggers,
    dependencyCounts: legacy.dependencyCounts
  });
  assert.deepEqual(fixture.canonical.functions, canonicalFunctionManifest.functions, "canonical state equals complete FunctionRow manifest row-by-row");
  assertCanonicalObservationAgainstStructure(
    fixture.canonicalObservation,
    fixture.canonical,
    "489b36c13953b9fa1f508ea7e8bdb9a6ca5cb0aa0998de07cbbbe4189d174a16"
  );
  assert.equal(fixture.canonicalObservation.rows.length, 33, "canonical observation retains every table identity and count");
  assert.deepEqual(fixture.sourceEraExcludedObservation.tables, sourceEra.tables.map(({ schema, name }) => ({ schema, name })));
  assert.deepEqual(fixture.sourceEraExcludedObservation.functions, sourceEra.functions.map(({ schema, name, identityArguments }) => ({ schema, name, identityArguments })));
  assert.deepEqual(fixture.clean, { tables: [], functions: [], triggers: [], dependencyCounts: Object.fromEntries(dependencyCountKeys.map((key) => [key, 0])) });
  assert.equal(objectSha256(fixture), fixture.aggregateSha256, "bridge-state aggregate SHA-256");
  const excludedNames = new Set(sourceEraTableNames);
  for (const state of [fixture.legacy, fixture.canonical, fixture.clean]) {
    for (const table of state.tables) assert.equal(excludedNames.has(table.name), false, "source-era table is outside bridge states");
    for (const fn of state.functions) assert.equal(excludedNames.has(fn.name), false, "source-era function is outside bridge states");
  }
  const oldDerived = { ...fixture, schemaVersion: 1 };
  assert.throws(() => assertDerivedSchemaVersion(oldDerived), /BRIDGE_STATE_REGENERATION_REQUIRED/, "old derived state requires regeneration");
  return fixture;
}

function migrationRow(migrationName) {
  return {
    version: migrationName.slice(0, 14),
    name: migrationName.slice(15)
  };
}

function inventoryRowKey(row) {
  return `${row.version}_${row.name}`;
}

function validateEnvironmentInventoryRows(rows, label, expectedCount) {
  assert.ok(Array.isArray(rows), `${label} is an array`);
  assert.equal(rows.length, expectedCount, `${label} has the exact row count`);
  const keys = new Set();
  rows.forEach((row, index) => {
    assertExactKeys(row, ["name", "version"], `${label}[${index}]`);
    assert.match(row.version, /^\d{14}$/, `${label}[${index}] version is 14 digits`);
    assert.match(row.name, /^[a-z0-9_]+$/, `${label}[${index}] name is sanitized`);
    const key = inventoryRowKey(row);
    assert.equal(keys.has(key), false, `${label} has no duplicate rows`);
    keys.add(key);
  });
  return keys;
}

function expectedFinal55Rows() {
  return [
    ...baselineMigrations,
    ...markerSpecs.map(({ version, name }) => `${version}_${name}`),
    "20260811000000_comment_translator_paid_v1_legacy_schema_bridge",
    "20260814105000_comment_translator_paid_pg_net_extension"
  ].map(migrationRow).sort((left, right) => inventoryRowKey(left).localeCompare(inventoryRowKey(right)));
}

const previewPending25MigrationNames = [
  "20260527000000_account_preferences_foundation",
  "20260601000000_youtube_oauth_credentials",
  "20260624000000_account_display_timezone_preference",
  "20260624040504_comment_translator_real_comments_feed_snapshots",
  "20260624141142_account_display_timezone_preference",
  "20260705000000_comment_translator_creator_waitlist_registrations",
  "20260706073204_supabase_default_privileges_guard",
  "20260722000000_comment_translator_paid_entitlements",
  "20260722001000_comment_translator_paid_usage_counters",
  "20260722002000_comment_translator_obs_overlay_tokens",
  "20260722003000_comment_translator_obs_overlay_browser_sessions",
  "20260723000000_comment_translator_moderator_share_tokens",
  "20260723001000_comment_translator_moderator_share_browser_sessions",
  "20260723002000_comment_translator_custom_dictionary",
  "20260723003000_comment_translator_creator_history",
  "20260726111154_comment_translator_paid_entitlements",
  "20260728135736_comment_translator_paid_usage_counters",
  "20260728142220_comment_translator_obs_overlay_tokens",
  "20260728145324_comment_translator_obs_overlay_browser_sessions",
  "20260728160206_comment_translator_moderator_share_tokens",
  "20260728164122_comment_translator_moderator_share_browser_sessions",
  "20260728172220_comment_translator_custom_dictionary",
  "20260729035621_comment_translator_creator_history",
  "20260811000000_comment_translator_paid_v1_legacy_schema_bridge",
  "20260814105000_comment_translator_paid_pg_net_extension"
];

const productionPending33MigrationNames = [
  "20260623000000_comment_translator_real_comments_feed_snapshots",
  "20260624000000_account_display_timezone_preference",
  "20260705000000_comment_translator_creator_waitlist_registrations",
  "20260706073204_supabase_default_privileges_guard",
  "20260811000000_comment_translator_paid_v1_legacy_schema_bridge",
  "20260812120000_comment_translator_paid_core_v1",
  "20260813130000_comment_translator_paid_task6_circuit_probe_claim",
  "20260813131500_comment_translator_paid_task6_openai_rate_retry",
  "20260813133000_comment_translator_paid_task6_owned_circuit_failure",
  "20260813134500_comment_translator_paid_task6_azure_billing_split",
  "20260813135500_comment_translator_paid_task6_azure_uncertain_retry_compatibility",
  "20260813140000_comment_translator_paid_task6_azure_uncertain_retry",
  "20260813141500_comment_translator_paid_task6_circuit_success_window",
  "20260813143000_comment_translator_paid_task6_openai_resume_status",
  "20260813144500_comment_translator_paid_task6_terminal_openai_partial",
  "20260813150000_comment_translator_paid_task6_openai_partial_receipt",
  "20260813151500_comment_translator_paid_task6_terminal_openai_partial_authority",
  "20260813153000_comment_translator_paid_task6_replay_circuit_authority",
  "20260813154500_comment_translator_paid_task6_dispatch_and_azure_partial_settlement",
  "20260814100000_comment_translator_paid_task7_runtime_authority",
  "20260814105000_comment_translator_paid_pg_net_extension",
  "20260814110000_comment_translator_paid_task9_retention_observability",
  "20260815090000_comment_translator_paid_cron_vault_transport",
  "20260818100000_comment_translator_paid_gate0a_poll_budget_rpc_repair",
  "20260819100000_comment_translator_paid_gate0a_lifecycle_read_repair",
  "20260819110000_comment_translator_paid_gate0a_capacity_read_repair",
  "20260823120000_comment_translator_paid_gate0a_unbound_hold_recovery",
  "20260823130000_comment_translator_paid_gate0a_schedule_function_privilege_repair",
  "20260826100000_comment_translator_paid_gate0a_checkout_recovery_window_floor",
  "20260826110000_comment_translator_paid_gate0a_recovery_floor_second_canonicalization",
  "20260827020609_comment_translator_paid_checkout_expiry_finalize_lease",
  "20260829100000_comment_translator_paid_task6_azure_uncertain_retry_guard_repair",
  "20260831100000_comment_translator_paid_task11_message_rate_runtime_repair"
];

export function validateEnvironmentInventoryFixture(fixture) {
  assertExactKeys(
    fixture,
    ["aggregateSha256", "final55", "final56", "preview", "production", "schemaVersion"],
    "environment inventory fixture"
  );
  assert.equal(fixture.schemaVersion, 2, "environment inventory schemaVersion is 2");
  assertExactKeys(fixture.preview, ["pending26", "targetFingerprint"], "Preview environment inventory");
  assertExactKeys(fixture.production, ["pending34", "targetFingerprint"], "Production environment inventory");
  assert.equal(fixture.preview.targetFingerprint, "ac49667d24515bcc7a44da7097e5143c");
  assert.equal(fixture.production.targetFingerprint, "a1a748301ebad4c574043c136de7b300");

  const final55Keys = validateEnvironmentInventoryRows(fixture.final55, "final55", 55);
  const final56Keys = validateEnvironmentInventoryRows(fixture.final56, "final56", 56);
  const previewPendingKeys = validateEnvironmentInventoryRows(fixture.preview.pending26, "preview.pending26", 26);
  const productionPendingKeys = validateEnvironmentInventoryRows(fixture.production.pending34, "production.pending34", 34);
  const approvedKey = inventoryRowKey({
    version: "20260904000000",
    name: "comment_translator_paid_gate1_a3_canonical_convergence"
  });

  assert.deepEqual(fixture.final55, expectedFinal55Rows(), "final55 is the exact forward-apply baseline");
  assert.deepEqual(
    fixture.final56,
    [...expectedFinal55Rows(), migrationRow(forwardConvergenceMigration)],
    "final56 is final55 plus only the approved migration"
  );
  assert.equal(final56Keys.has(approvedKey), true, "final56 contains the approved migration");
  assert.equal(final55Keys.has(approvedKey), false, "final55 excludes the approved migration");
  assert.deepEqual(
    [...final56Keys].filter((key) => !final55Keys.has(key)),
    [approvedKey],
    "final56 adds exactly the approved migration"
  );
  assert.deepEqual(
    fixture.preview.pending26,
    [...previewPending25MigrationNames, forwardConvergenceMigration].map(migrationRow),
    "Preview pending26 is the exact pending25 baseline plus the approved migration"
  );
  assert.deepEqual(
    fixture.production.pending34,
    [...productionPending33MigrationNames, forwardConvergenceMigration].map(migrationRow),
    "Production pending34 is the exact pending33 baseline plus the approved migration"
  );
  for (const [label, pendingKeys] of [["Preview", previewPendingKeys], ["Production", productionPendingKeys]]) {
    for (const key of pendingKeys) assert.equal(final56Keys.has(key), true, `${label} pending row is a final56 migration subset`);
    assert.equal(pendingKeys.has(approvedKey), true, `${label} pending inventory includes the approved migration`);
  }
  assert.equal(objectSha256(fixture), fixture.aggregateSha256, "environment inventory aggregate SHA-256");
  return fixture;
}

function validateEnvironmentInventory() {
  return validateEnvironmentInventoryFixture(readJson(environmentInventoriesPath));
}

function migrationNames() {
  return fs.readdirSync(migrationsRoot)
    .filter((name) => name.endsWith(".sql"))
    .map((name) => name.slice(0, -4))
    .sort();
}

function assertForwardConvergenceMigrationPresent() {
  if (!fs.existsSync(path.join(migrationsRoot, `${forwardConvergenceMigration}.sql`))) {
    throw new Error("A3_FORWARD_CONVERGENCE_MIGRATION_UNVERIFIED");
  }
}

function validateInventory() {
  const expected = [...baselineMigrations, ...markerSpecs.map(({ version, name }) => `${version}_${name}`), "20260811000000_comment_translator_paid_v1_legacy_schema_bridge", "20260814105000_comment_translator_paid_pg_net_extension", forwardConvergenceMigration];
  assert.equal(new Set(expected).size, 56, "expected final migration inventory has 56 unique entries");
  assertForwardConvergenceMigrationPresent();
  assert.deepEqual(migrationNames(), [...expected].sort(), "repository migration inventory equals final 56");
  return expected;
}

function validateMarkers() {
  for (const spec of markerSpecs) {
    const filePath = path.join(migrationsRoot, `${spec.version}_${spec.name}.sql`);
    assert.equal(fs.existsSync(filePath), true, `marker exists: ${spec.version}`);
    const source = normalizedSql(fs.readFileSync(filePath, "utf8"));
    assert.equal(source, markerText(spec), `marker body is exact and inert: ${spec.version}`);
    assert.equal((source.match(/\bdo\s+\$comment_translator_paid_gate1_history_marker\$/gi) ?? []).length, 1, `marker DO count: ${spec.version}`);
    assert.equal(forbiddenMarkerTokens.test(source.replace(/--[^\n]*/g, "")), false, `marker contains no executable mutation: ${spec.version}`);
    assert.equal(source.includes("comment_translator_paid_legacy_archive"), false, `marker has no archive reference: ${spec.version}`);
  }
  return markerSpecs.length;
}

function validatePgNet() {
  assert.equal(fs.existsSync(pgNetPath), true, "pg_net migration exists");
  const source = normalizedSql(fs.readFileSync(pgNetPath, "utf8"));
  assert.equal(source, "create extension if not exists pg_net with schema extensions;\n", "pg_net migration is exactly one statement");
  return true;
}

function validateBridge() {
  assert.equal(fs.existsSync(bridgePath), true, "legacy bridge migration exists");
  const source = normalizedSql(fs.readFileSync(bridgePath, "utf8"));
  assert.equal((source.match(/\bdo\s+\$bridge\$/gi) ?? []).length, 1, "bridge has one transactional DO block");
  assert.match(source, /set\s+local\s+lock_timeout\s*=\s*'5s'/i, "bridge lock timeout is fixed");
  assert.match(source, /set\s+local\s+statement_timeout\s*=\s*'60s'/i, "bridge statement timeout is fixed");
  assert.match(source, /pg_catalog\.pg_advisory_xact_lock\s*\(\s*pg_catalog\.hashtextextended\s*\(\s*'comment-translator-paid-v1-gate1-legacy-bridge'\s*,\s*0\s*\)\s*\)/i, "bridge advisory lock is fixed");
  for (const state of ["exact-legacy", "exact-canonical", "exact-clean", "exact-preview-entry"]) assert.match(source, new RegExp(state, "i"), `bridge state is present: ${state}`);
  assert.match(source, /is\s+not\s+distinct\s+from/i, "bridge compares catalog JSON structurally");
  assert.match(source, /jsonb/i, "bridge uses jsonb catalog state");
  assert.match(source, /scope_name\s*=\s*'canonical'\s+then\s+row_json\s*-\s*'rowCount'/i, "bridge excludes canonical operational rowCount from structural equality");
  const canonicalLiteral = source.match(/\$gate1_expected_canonical_v2\$([\s\S]*?)\$gate1_expected_canonical_v2\$/i)?.[1];
  assert.equal(typeof canonicalLiteral, "string", "bridge embeds one v2 canonical structural literal");
  const embeddedCanonical = JSON.parse(canonicalLiteral);
  const fixtureCanonical = readJson(bridgeStatesPath).canonical;
  assert.deepEqual(embeddedCanonical, fixtureCanonical, "bridge embedded canonical structure equals the reviewed v2 fixture");
  assert.equal(embeddedCanonical.tables.some((row) => Object.prototype.hasOwnProperty.call(row, "rowCount")), false, "bridge embedded canonical structure excludes rowCount");
  assert.doesNotMatch(source, /jsonb\s*::\s*text/i, "bridge does not compare jsonb text");
  assert.doesNotMatch(source, /JSON\.stringify|aggregateMd5|createHash|digest\s*\(/i, "bridge does not embed cross-runtime digest logic");
  assert.doesNotMatch(source, /\b(?:drop\s+(?:table|schema|function)|truncate\s+(?:table|[a-z_]+)|delete\s+from|insert\s+into|update\s+cron\.job)\b/i, "bridge has no destructive DML");
  assert.match(source, /scope_hints\s+as[\s\S]+has_canonical_functions[\s\S]+has_legacy_functions/i, "bridge classifies the overlapping entitlement relation from direct function presence");
  assert.match(source, /classified_known_tables\s+as[\s\S]+['\"]unclassified['\"]/i, "bridge fails closed when the overlapping entitlement relation cannot be classified");
  const previewAbsenceGuard = source.match(/if v_state = 'exact-preview-entry' then([\s\S]*?)raise exception 'Gate 1 observed Preview source-era objects exist';\s*end if;/)?.[0];
  assert.equal(typeof previewAbsenceGuard, "string", "Preview source-era check is an explicit read-only absence guard");
  assert.doesNotMatch(previewAbsenceGuard, /\b(?:create|alter|drop|execute|perform|insert|update|delete|grant|revoke)\s/i);
  const sourceWithoutAbsenceGuard = source.replace(previewAbsenceGuard, "");
  for (const name of sourceEraNames) assert.doesNotMatch(sourceWithoutAbsenceGuard, new RegExp(name, "i"), `source-era object occurs only in the read-only Preview guard: ${name}`);
  assert.match(source, /alter\s+table\s+public\./i, "bridge has table move path");
  assert.match(source, /alter\s+function\s+public\./i, "bridge has function move path");
  assert.match(source, /comment_translator_paid_legacy_archive/i, "bridge archive schema is explicit");
  return true;
}

function validateSecurityScope() {
  assertForwardConvergenceMigrationPresent();
  const changedMigrationNames = [
    ...markerSpecs.map(({ version, name }) => `${version}_${name}.sql`),
    "20260811000000_comment_translator_paid_v1_legacy_schema_bridge.sql",
    "20260814105000_comment_translator_paid_pg_net_extension.sql",
    `${forwardConvergenceMigration}.sql`
  ];
  const sources = changedMigrationNames.map((name) => fs.readFileSync(path.join(migrationsRoot, name), "utf8")).join("\n");
  assert.doesNotMatch(sources, /postgres(?:ql)?:\/\//i, "migration sources contain no database URL");
  assert.doesNotMatch(sources, /\b(?:password|service_role)\s*[:=]/i, "migration sources contain no credential assignment");
  assert.doesNotMatch(stripDollarQuotedBodies(sources), /\b(?:insert\s+into|update\s+cron\.job|delete\s+from\s+cron\.job)\b/i, "migration sources contain no direct data/scheduler writes");
  return { destructive: 0, directCronWrites: 0, sourceEraMutations: 0 };
}

function missingFullCatalogFixtures() {
  return [
    "comment-translator-paid-core-v1-gate1-paid-legacy-catalog.json",
    "comment-translator-paid-core-v1-gate1-source-era-catalog.json",
    "comment-translator-paid-core-v1-gate1-bridge-states.json",
    "comment-translator-paid-core-v1-gate1-environment-inventories.json"
  ].filter((name) => !fs.existsSync(path.join(fixturesRoot, name)));
}

function run() {
  const phase = process.argv[process.argv.indexOf("--phase") + 1] ?? "full";
  const history = validateHistoryFixture();
  const identity = validateIdentityFixture();

  if (phase === "baseline") {
    const actual = migrationNames();
    assert.deepEqual(actual, baselineMigrations.slice().sort(), "baseline migration inventory is exact");
    console.log(`baseline-migrations=${actual.length} unique=${new Set(actual).size} ordered=pass additions=0`);
    return;
  }

  const markers = validateMarkers();
  if (phase === "markers") {
    assert.equal(fs.existsSync(bridgePath), false, "marker phase stops before bridge implementation");
    assert.equal(fs.existsSync(pgNetPath), false, "marker phase stops before pg_net implementation");
    console.log(`markers=${markers} bridge=expected-next-phase pg_net=expected-next-phase`);
    return;
  }

  const legacy = validateCatalogFixture(paidLegacyCatalogPath, "paidLegacy", { tables: 3, functions: 3, triggers: 1 });
  const sourceEra = validateCatalogFixture(sourceEraCatalogPath, "sourceEra", { tables: 6, functions: 7, triggers: 0 });
  const canonicalFunctionManifest = validateCanonicalFunctionManifest();
  validateCanonicalAuthority();
  validateBridgeStateFixture(legacy, sourceEra, canonicalFunctionManifest);
  validateEnvironmentInventory();

  if (phase === "security-scope") {
    validatePgNet();
    validateBridge();
    const scope = validateSecurityScope();
    console.log(`security-scope=pass destructive=${scope.destructive} direct-cron-writes=${scope.directCronWrites} source-era-mutations=${scope.sourceEraMutations} bridge-allowlist=pass rpc-identities=${identity.functions.length} history=${history.rows.length}`);
    return;
  }

  validatePgNet();
  validateBridge();
  validateInventory();
  const missing = missingFullCatalogFixtures();
  if (missing.length > 0) {
    throw new Error(`MISSING_SANITIZED_CATALOG_FIXTURES:${missing.length}`);
  }
  console.log(`markers=${markers} migrations=56 bridge-states=4 legacy-mutation-tables=3 legacy-mutation-functions=3 source-era-mutations=0`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  try {
    run();
  } catch (error) {
    const reason = error instanceof Error ? error.message.split(":")[0] : "CONTRACT_FAILURE";
    console.error(`GATE1_MIGRATION_CONTRACT_FAIL:${reason}`);
    process.exitCode = 1;
  }
}
