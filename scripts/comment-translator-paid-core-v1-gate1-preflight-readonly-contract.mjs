import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";

import {
  assertCanonicalObservation,
  assertCanonicalStructuralState,
  canonicalStructuralEqual,
  createCanonicalObservation,
  inspectCatalogReadbackArtifact,
  projectCanonicalStructuralState
} from "./lib/comment-translator-paid-core-v1-gate1-catalog.mjs";

import {
  ADVISOR_KEYS,
  CRON_KEYS,
  EXTENSION_KEYS,
  MAX_OUTPUT_BYTES,
  MAX_RESULT_ROWS,
  MUTATION_KEYS,
  OUTPUT_KEYS,
  READONLY_PGOPTIONS,
  READONLY_SQL,
  READONLY_SQL_BY_TARGET,
  REASON_CODES,
  TARGET_BINDING_KEYS,
  VAULT_KEYS,
  canonicalBindingJson,
  computeBindingSha256,
  createPsqlTransport,
  parseSanitizedEvidence,
  parseTargetBinding,
  runPreflight
} from "./comment-translator-paid-core-v1-gate1-preflight-readonly.mjs";

const syntheticCaPath = "fixture-ca.pem";
const syntheticCaBytes = Buffer.from("fixture-ca-bytes", "utf8");
const syntheticCaSha256 = createHash("sha256").update(syntheticCaBytes).digest("hex");
const binding = {
  schemaVersion: 1,
  target: "production",
  connectionMode: "direct",
  projectRef: "fixtureproject123",
  host: "db.fixtureproject123.supabase.co",
  port: 5432,
  database: "postgres",
  user: "postgres",
  sslMode: "verify-full",
  caSha256: syntheticCaSha256
};

const fixtureFs = {
  lstatSync(filePath) {
    if (filePath !== syntheticCaPath) throw new Error("missing fixture");
    return { isFile: () => true };
  },
  readFileSync(filePath) {
    if (filePath !== syntheticCaPath) throw new Error("missing fixture");
    return syntheticCaBytes;
  }
};

const digest = (letter) => letter.repeat(64);
const LEGACY_RELATIONS = [
  "comment_translator_paid_entitlements",
  "comment_translator_paid_usage_counters",
  "comment_translator_paid_usage_events"
];
const SOURCE_ERA_RELATIONS = [
  "comment_translator_creator_history",
  "comment_translator_custom_dictionary_entries",
  "comment_translator_moderator_share_browser_sessions",
  "comment_translator_moderator_share_tokens",
  "comment_translator_obs_overlay_browser_sessions",
  "comment_translator_obs_overlay_tokens"
];
const CONDITIONAL_RELATIONS = [...LEGACY_RELATIONS, ...SOURCE_ERA_RELATIONS];
const completeEvidence = {
  serverVersion: "PostgreSQL 17.6 on synthetic fixture",
  transactionReadOnly: "on",
  transactionIsolation: "repeatable read",
  historyCount: 56,
  historyDigest: digest("a"),
  pendingDigest: digest("b"),
  legacyDigest: digest("c"),
  sourceEraDigest: digest("d"),
  canonicalRelationsDigest: digest("e"),
  canonicalRpcAclDigest: digest("f"),
  archiveDigest: digest("1"),
  limitsDigest: digest("2"),
  schedulerEvidenceDigest: digest("3"),
  maintenanceTransportPrivilegeDigest: digest("4"),
  extensions: { pgNet: true, pgCron: true, vault: true },
  storageObjectCount: 0,
  grantsRlsDigest: digest("5"),
  vault: { total: 2, reservedNames: 2, recordIdDigest: digest("6") },
  cron: { matching: 1, active: false, jobIdDigest: digest("7"), commandDigest: digest("8"), runDelta: 0 },
  schedulerProcessCount: 1,
  advisor: { baselineDigest: digest("9"), currentDigest: digest("0"), inScopeNew: 0, highCriticalNew: 0 }
};

// Missing pre-apply transport must remain missing evidence, not a digest of null privileges.
const absentTransportEvidence = parseSanitizedEvidence(JSON.stringify({
  ...completeEvidence,
  maintenanceTransportPrivilegeDigest: null
}), "", { rowCount: 1 });
assert.equal(absentTransportEvidence.ok, true);
assert.equal(absentTransportEvidence.complete, false);
assert.equal(absentTransportEvidence.reason, "REQUIRED_EVIDENCE_UNAVAILABLE");
assert.equal(absentTransportEvidence.evidence.maintenanceTransportPrivilegeDigest, null);
for (const sql of Object.values(READONLY_SQL_BY_TARGET)) {
  const transportSql = sql.slice(sql.indexOf("maintenance_transport_state AS ("), sql.indexOf("storage_state AS ("));
  assert.match(transportSql, /CASE WHEN to_regprocedure\('private\.ct_paid_invoke_maintenance_from_vault\(\)'\) IS NULL\s+THEN NULL::text\s+ELSE encode\(/);
  assert.equal([...transportSql.matchAll(/has_function_privilege\(\s*'(?:service_role|authenticated|anon)',\s*to_regprocedure\(/g)].length, 3);
  assert.doesNotMatch(transportSql, /has_function_privilege\(\s*'[^']+',\s*'private\./);
}

const baseEnv = {
  PATH: "fixture-path",
  GATE1_TARGET_BINDING_JSON: JSON.stringify(binding),
  GATE1_TARGET_BINDING_SHA256: computeBindingSha256(binding),
  PGHOST: binding.host,
  PGPORT: "5432",
  PGDATABASE: "postgres",
  PGUSER: "postgres",
  PGSSLMODE: "verify-full",
  PGSSLROOTCERT: syntheticCaPath,
  PGPASSWORD: "synthetic-credential",
  PGGSSENCMODE: "require"
};

function envWith(overrides = {}, removals = []) {
  const result = { ...baseEnv, ...overrides };
  for (const key of removals) delete result[key];
  return result;
}

function fakeTransport(response = { exitCode: 0, stdout: JSON.stringify(completeEvidence), stderr: "", rowCount: 1 }) {
  const transport = {
    calls: [],
    execute(invocation) {
      this.calls.push(invocation);
      return typeof response === "function" ? response(invocation) : response;
    }
  };
  return transport;
}

// PostgreSQL clips identifiers at a UTF-8 character boundary before gset adds its prefix.
function postgresIdentifier(name) {
  let result = "";
  for (const character of name) {
    if (Buffer.byteLength(result + character, "utf8") > 63) break;
    result += character;
  }
  return result;
}

function discoveryColumns(sql) {
  return [...sql.matchAll(/relation_\.relname = '([^']+)'\) > 0 AS ([a-z_][a-z0-9_]*)/gi)];
}

function countVariable(sql, relation) {
  const match = [...sql.matchAll(/count\(\*\)::bigint AS ([a-z_][a-z0-9_]*)\s+FROM public\.([a-z_][a-z0-9_]*)/gi)]
    .find((row) => row[2] === relation);
  assert.ok(match, `generated count alias for ${relation}`);
  return postgresIdentifier(match[1]);
}

function expandSyntheticPsqlVariables(sql, variables) {
  return sql.replace(/'(?:''|[^'])*'|(?<!:):(?:'([a-z_][a-z0-9_]*)'|([a-z_][a-z0-9_]*))/gi, (match, quotedName, rawName) => {
    if (!quotedName && !rawName) return match;
    const name = quotedName ?? rawName;
    if (!variables.has(name)) throw new Error(`unset psql variable ${name}`);
    const value = String(variables.get(name));
    if (quotedName) {
      const escaped = value.replace(/'/g, "''");
      return value.includes("\\") ? `E'${escaped.replace(/\\/g, "\\\\")}'` : `'${escaped}'`;
    }
    return value;
  });
}

function runSyntheticPsqlSession(input, fixture) {
  const variables = new Map();
  const statements = [];
  const stack = [];
  const transaction = { state: "not-started", rolledBackOnClose: false };
  let active = true;
  let queryBuffer = [];
  let finalEvidence = null;
  let failure = null;

  const recomputeActive = () => {
    active = stack.every((frame) => frame.active);
  };
  const flushSql = (sqlText) => {
    const sql = sqlText.trim();
    if (sql.length === 0) return "";
    const expanded = expandSyntheticPsqlVariables(sql, variables);
    statements.push(expanded);
    for (const match of expanded.matchAll(/\bFROM\s+public\.([a-z_][a-z0-9_]*)/gi)) {
      const relation = match[1];
      if (CONDITIONAL_RELATIONS.includes(relation) && !fixture.present.has(relation)) {
        throw new Error(`parser resolved absent relation ${relation}`);
      }
    }
    if (/^BEGIN\b/i.test(expanded)) transaction.state = "open";
    if (/\bROLLBACK\s*;?\s*$/i.test(expanded)) {
      transaction.state = "rolled-back";
      transaction.rolledBackOnClose = true;
    }
    if (/\bAS\s+gate1_evidence\s*;/i.test(expanded)) {
      // Only this fixed boolean control path is modeled; this is not a SQL interpreter.
      if (/\bAND\s+[tf]\b/i.test(expanded)) throw new Error("bare DB boolean is a SQL column identifier");
      const booleanGuards = [...expanded.matchAll(/\bAND\s+'((?:''|[^'])*)'::boolean/gi)];
      if (booleanGuards.length !== 3 || booleanGuards.some(([, value]) => !["t", "f"].includes(value))) {
        throw new Error("invalid SQL boolean control cast");
      }
      finalEvidence = fixture.makeEvidence({ variables, statements, finalSql: expanded });
    }
    return expanded;
  };
  const flushQueryBuffer = () => {
    const sql = flushSql(queryBuffer.join("\n"));
    queryBuffer = [];
    return sql;
  };
  const setDiscoveryVariables = (sql, prefix) => {
    if (fixture.discovery === "duplicate") throw new Error("discovery returned duplicate rows");
    for (const [, relation, alias] of discoveryColumns(sql)) {
      const value = fixture.discovery === "malformed" ? "maybe" : fixture.present.has(relation) ? "t" : "f";
      if (fixture.discovery !== "null") variables.set(prefix + postgresIdentifier(alias), value);
    }
    const alias = sql.match(/= 0 AS ([a-z_][a-z0-9_]*)\s+FROM pg_catalog\.pg_class/i)[1];
    if (fixture.unknownObserved !== null) variables.set(prefix + postgresIdentifier(alias), fixture.unknownObserved === true ? "f" : "t");
  };
  const setCountVariable = (sql, prefix) => {
    const relationMatch = sql.match(/\bFROM\s+public\.([a-z_][a-z0-9_]*)/i);
    if (!relationMatch) throw new Error("count gset without fixed relation");
    const relation = relationMatch[1];
    if (!CONDITIONAL_RELATIONS.includes(relation) || !fixture.present.has(relation)) {
      throw new Error(`count submitted for absent or unknown relation ${relation}`);
    }
    if (fixture.counts?.[relation] === "duplicate") throw new Error("count returned duplicate rows");
    const value = fixture.counts?.[relation] ?? 0;
    if (!Number.isSafeInteger(value) || value < 0) throw new Error("malformed count result");
    variables.set(prefix + countVariable(sql, relation), String(value));
  };
  const processMeta = (line) => {
    const command = line.trim();
    if (/^\\if\s+/i.test(command)) {
      const parentActive = active;
      let condition = false;
      if (parentActive) {
        const expression = command.replace(/^\\if\s+/i, "");
        const expanded = expandSyntheticPsqlVariables(expression, variables).trim().toLowerCase();
        if (expanded === "true" || expanded === "t" || expanded === "on" || expanded === "1") condition = true;
        else if (expanded === "false" || expanded === "f" || expanded === "off" || expanded === "0") condition = false;
        else throw new Error(`malformed psql conditional ${expanded}`);
      }
      stack.push({ parentActive, active: parentActive && condition, branchTaken: parentActive && condition });
      recomputeActive();
      return;
    }
    if (/^\\else\s*$/i.test(command)) {
      const frame = stack.at(-1);
      if (!frame) throw new Error("unmatched else");
      frame.active = frame.parentActive && !frame.branchTaken;
      frame.branchTaken = frame.branchTaken || frame.active;
      recomputeActive();
      return;
    }
    if (/^\\endif\s*$/i.test(command)) {
      if (stack.length === 0) throw new Error("unmatched endif");
      stack.pop();
      recomputeActive();
      return;
    }
    if (!active) return;
    if (/^\\set\s+/i.test(command)) {
      const [, name, rawValue = ""] = command.match(/^\\set\s+(\S+)(?:\s+(.*))?$/i);
      variables.set(name, rawValue);
      return;
    }
    if (/^\\gset(?:\s+\S+)?\s*$/i.test(command)) {
      const sql = flushQueryBuffer();
      const prefix = command.match(/^\\gset(?:\s+(\S+))?\s*$/i)[1] ?? "";
      if (discoveryColumns(sql).length > 0) setDiscoveryVariables(sql, prefix);
      else setCountVariable(sql, prefix);
      return;
    }
    if (/^\\quit\b/i.test(command)) throw new Error("synthetic psql quit");
    throw new Error(`unsupported psql meta command ${command}`);
  };

  try {
    for (const line of input.split(/\r?\n/)) {
      if (line.trim().startsWith("\\")) {
        processMeta(line);
        continue;
      }
      if (!active) continue;
      queryBuffer.push(line);
      if (line.includes(";")) flushQueryBuffer();
      if (fixture.failAfterStatements !== undefined && statements.length >= fixture.failAfterStatements) {
        throw new Error("synthetic query failure");
      }
    }
    flushQueryBuffer();
    if (transaction.state === "open") transaction.rolledBackOnClose = true;
    if (!finalEvidence) throw new Error("final evidence query was not submitted");
    return {
      status: 0,
      stdout: `${JSON.stringify(finalEvidence)}\n`,
      stderr: "",
      session: { statements, transaction, variables }
    };
  } catch (error) {
    if (transaction.state === "open") transaction.rolledBackOnClose = true;
    failure = error;
    return {
      status: 1,
      stdout: "",
      stderr: "",
      session: { statements, transaction, variables, failure: failure.message }
    };
  }
}

function syntheticEvidenceFixture({ present = [], counts = {}, discovery = "valid", unknownObserved = false, failAfterStatements, makeEvidence } = {}) {
  const presentSet = new Set(present);
  return {
    present: presentSet,
    counts,
    discovery,
    unknownObserved,
    failAfterStatements,
    makeEvidence: makeEvidence ?? (() => completeEvidence)
  };
}

function makeSyntheticScopedEvidence({ finalSql }) {
  const scopeComplete = (relations) => relations.every((relation) => (
    new RegExp(`WHEN '${relation}' THEN [0-9]+::bigint`).test(finalSql)
  ));
  const allowlisted = /\bAND\s+'t'::boolean/i.test(finalSql);
  const evidence = { ...completeEvidence };
  evidence.legacyDigest = allowlisted && scopeComplete(LEGACY_RELATIONS) ? digest("c") : null;
  evidence.sourceEraDigest = allowlisted && scopeComplete(SOURCE_ERA_RELATIONS) ? digest("d") : null;
  if (/SELECT\s+count\(\*\)::bigint\s+FROM\s+public\./i.test(finalSql)) {
    throw new Error("final SQL must not contain an unconditional count statement");
  }
  return evidence;
}

function createSyntheticPsqlTransport(fixture) {
  const spawned = [];
  const sessions = [];
  const transport = createPsqlTransport({
    spawnSyncImpl(command, args, options) {
      spawned.push({ command, args, options });
      if (args[0] === "--version") return { status: 0, stdout: "psql (PostgreSQL) 17.6", stderr: "" };
      const session = runSyntheticPsqlSession(options.input, fixture);
      sessions.push(session);
      return session;
    }
  });
  return { transport, spawned, sessions };
}

function envForTarget(target) {
  const targetBinding = { ...binding, target };
  return {
    ...baseEnv,
    GATE1_TARGET_BINDING_JSON: JSON.stringify(targetBinding),
    GATE1_TARGET_BINDING_SHA256: computeBindingSha256(targetBinding),
    PGHOST: targetBinding.host
  };
}

const previewAbsentFixture = syntheticEvidenceFixture({
  present: [],
  makeEvidence: () => ({ ...completeEvidence, legacyDigest: null, sourceEraDigest: null })
});

const generatedAliases = [
  ...discoveryColumns(READONLY_SQL).map((row) => row[2]),
  ...CONDITIONAL_RELATIONS.map((relation) => countVariable(READONLY_SQL, relation))
];
assert.equal(generatedAliases.length, 18);
assert.equal(new Set(generatedAliases).size, 18, "all control aliases are unique");
for (const alias of generatedAliases) {
  assert.ok(Buffer.byteLength(alias, "utf8") <= 63, "control alias fits PostgreSQL NAMEDATALEN");
  assert.match(alias, /^(?:relation_present_|gate1_row_count_)r0[0-8]$/, "only fixed relation IDs become control aliases");
}
assert.deepEqual(discoveryColumns(READONLY_SQL).map((row) => row[1]), CONDITIONAL_RELATIONS);
assert.equal(postgresIdentifier("a".repeat(62) + "界"), "a".repeat(62), "clipping preserves UTF-8 character boundaries");
assert.equal(expandSyntheticPsqlVariables(":'v'::boolean", new Map([["v", "t"]])), "'t'::boolean");
assert.equal(expandSyntheticPsqlVariables(":'v'", new Map([["v", "it's\\safe"]])), "E'it''s\\\\safe'");
assert.equal(expandSyntheticPsqlVariables("':v'", new Map([["v", "t"]])), "':v'", "variables inside SQL literals are not expanded");

// Mutate generated SQL in memory only: prove each original defect fails this control path.
for (const kind of ["presence", "count", "boolean"]) {
  let oldSql = READONLY_SQL;
  if (kind === "boolean") {
    oldSql = oldSql.replaceAll(":'gate1_unknown_relation_absent'::boolean", ":gate1_unknown_relation_absent");
  } else {
    for (const [, relation, presenceAlias] of discoveryColumns(READONLY_SQL)) {
      const alias = kind === "presence" ? presenceAlias : countVariable(READONLY_SQL, relation);
      const oldAlias = `${kind === "presence" ? "relation_present_" : "gate1_row_count_"}${relation}`;
      oldSql = oldSql.replaceAll(alias, oldAlias);
    }
  }
  const regression = runSyntheticPsqlSession(oldSql, syntheticEvidenceFixture({ present: CONDITIONAL_RELATIONS, makeEvidence: makeSyntheticScopedEvidence }));
  if (kind === "count") {
    assert.equal(regression.status, 0, "truncated count alias leaves the initialized NULL consumer");
    assert.equal(JSON.parse(regression.stdout).sourceEraDigest, null, "old count SQL fails complete-evidence requirement");
    const result = runPreflight({ target: "production", env: baseEnv, fsApi: fixtureFs,
      transport: fakeTransport({ exitCode: 0, stdout: regression.stdout, stderr: "", rowCount: 1 }) });
    assert.equal(result.status, "blocked-required-evidence", "old count aliases cannot yield accepted evidence");
  } else {
    assert.equal(regression.status, 1, `old ${kind} SQL must fail`);
    assert.match(regression.session.failure, kind === "boolean" ? /SQL column identifier/ : /unset psql variable/);
  }
  assert.equal(regression.session.transaction.rolledBackOnClose, true, `old ${kind} failure rolls back on close`);
}
const previewAbsentExecution = createSyntheticPsqlTransport(previewAbsentFixture);
const previewAbsentResult = runPreflight({
  target: "preview",
  env: envForTarget("preview"),
  fsApi: fixtureFs,
  transport: previewAbsentExecution.transport
});
assert.equal(
  previewAbsentResult.status,
  "blocked-required-evidence",
  "Preview with absent legacy/source relations blocks required evidence after canonical collection"
);
assert.equal(previewAbsentResult.blockedReason, "REQUIRED_EVIDENCE_UNAVAILABLE");
assert.equal(previewAbsentExecution.spawned.length, 2, "generated path uses one PostgreSQL process after version check");
assert.equal(previewAbsentExecution.sessions[0].status, 0, "absent relations do not cause parser or connection failure");
assert.equal(previewAbsentExecution.sessions[0].session.transaction.rolledBackOnClose, true, "generated path rolls back the read-only transaction");
assert.equal(
  previewAbsentExecution.sessions[0].session.statements.some((statement) => /FROM\s+public\.(?:comment_translator_paid_|comment_translator_(?:creator|custom|moderator|obs)_)/i.test(statement)),
  false,
  "absent legacy/source count statements are never submitted to the parser"
);

function assertOutputSchema(result) {
  assert.deepEqual(Object.keys(result), OUTPUT_KEYS, "output has the exact top-level key order");
  assert.deepEqual(Object.keys(result.extensions), EXTENSION_KEYS, "extensions has the exact keys");
  assert.deepEqual(Object.keys(result.vault), VAULT_KEYS, "vault has the exact keys");
  assert.deepEqual(Object.keys(result.cron), CRON_KEYS, "cron has the exact keys");
  assert.deepEqual(Object.keys(result.advisor), ADVISOR_KEYS, "advisor has the exact keys");
  assert.deepEqual(Object.keys(result.mutationCounts), MUTATION_KEYS, "mutationCounts has the exact keys");
  assert.deepEqual(result.mutationCounts, { ddl: 0, dml: 0, rpc: 0, remote: 0, total: 0 });
}

function assertSyntheticFailure(label, execution, result) {
  assert.notEqual(result.status, "readonly-evidence", `${label}: failure cannot be accepted as complete evidence`);
  assert.equal(result.mutationCounts.total, 0, `${label}: mutation count remains zero`);
  assertOutputSchema(result);
  assert.equal(execution.spawned.length, 2, `${label}: discovery/count use one PostgreSQL process`);
  assert.equal(execution.sessions.length, 1, `${label}: one same-session execution was attempted`);
  assert.doesNotMatch(JSON.stringify(result), /mystery_relation|synthetic-credential|postgresql:\/\//i, `${label}: no raw output leakage`);
}

assert.equal(
  READONLY_SQL_BY_TARGET.preview,
  READONLY_SQL_BY_TARGET.production,
  "target labels do not select a different SQL path"
);
assert.match(READONLY_SQL, /\\gset gate1_/);
for (const [target, sql] of Object.entries(READONLY_SQL_BY_TARGET)) {
  assert.equal(
    /CROSS JOIN LATERAL unnest\(policy_\.polroles\) AS policy_role\(role_oid\)/.test(sql),
    true,
    `${target}: policy role unnest declares its output column explicitly`
  );
  assert.deepEqual(
    [...sql.matchAll(/\bpolicy_role\.([a-z_][a-z0-9_]*)/gi)].map((match) => match[1]),
    ["role_oid", "role_oid", "role_oid"],
    `${target}: all three policy role references use the declared column`
  );
}
assert.match(READONLY_SQL, /\\if :gate1_relation_present_/);
assert.doesNotMatch(
  READONLY_SQL,
  /WHEN\s+'comment_translator_[^']+'\s+THEN\s+\(SELECT\s+count\(\*\)/i,
  "the exact-count CASE contains values, not unconditional relation SELECTs"
);

const allPresentCounts = Object.fromEntries(CONDITIONAL_RELATIONS.map((relation, index) => [relation, index === 0 ? 3 : 0]));
const allPresentExecution = createSyntheticPsqlTransport(syntheticEvidenceFixture({
  present: CONDITIONAL_RELATIONS,
  counts: allPresentCounts,
  makeEvidence: makeSyntheticScopedEvidence
}));
const allPresentResult = runPreflight({
  target: "production",
  env: envForTarget("production"),
  fsApi: fixtureFs,
  transport: allPresentExecution.transport
});
assert.equal(allPresentResult.status, "readonly-evidence", "all present production evidence remains complete");
assert.equal(allPresentResult.legacyDigest, digest("c"));
assert.equal(allPresentResult.sourceEraDigest, digest("d"));
assertOutputSchema(allPresentResult);
const allPresentSession = allPresentExecution.sessions[0].session;
const submittedCountStatements = allPresentSession.statements.filter((statement) => /SELECT\s+count\(\*\)::bigint\s+AS\s+gate1_row_count_/i.test(statement));
assert.equal(submittedCountStatements.length, CONDITIONAL_RELATIONS.length, "all present relations submit exactly their predeclared count statements");
assert.equal(allPresentSession.variables.get(countVariable(READONLY_SQL, CONDITIONAL_RELATIONS[0])), "3", "nonzero exact count is retained in the same session");
const allPresentFinalSql = allPresentSession.statements.find((statement) => /\bAS\s+gate1_evidence\s*;/i.test(statement));
assert.match(allPresentFinalSql, /WHEN 'comment_translator_paid_entitlements' THEN 3::bigint/);
assert.equal(allPresentSession.transaction.state, "rolled-back", "complete evidence path ends with rollback");
assert.equal(allPresentSession.statements[0].startsWith("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY"), true);
assert.equal(allPresentSession.statements.at(-1), "ROLLBACK;");
assert.equal(allPresentSession.statements.filter((statement) => /relation_present_/i.test(statement)).length, 1, "catalog discovery is one fixed statement");
assert.equal(allPresentExecution.sessions[0].stdout.split(/\r?\n/).filter(Boolean).length, 1, "control variables do not mix into final one-line JSON");

const emptyPresentExecution = createSyntheticPsqlTransport(syntheticEvidenceFixture({
  present: CONDITIONAL_RELATIONS,
  counts: Object.fromEntries(CONDITIONAL_RELATIONS.map((relation) => [relation, 0])),
  makeEvidence: makeSyntheticScopedEvidence
}));
const emptyPresentResult = runPreflight({
  target: "preview",
  env: envForTarget("preview"),
  fsApi: fixtureFs,
  transport: emptyPresentExecution.transport
});
assert.equal(emptyPresentResult.status, "readonly-evidence", "present empty relations are valid exact-count evidence");
assert.notEqual(emptyPresentResult.legacyDigest, null, "present empty legacy scope is not relabeled absent");
assert.notEqual(emptyPresentResult.sourceEraDigest, null, "present empty source scope is not relabeled absent");
assert.equal(emptyPresentExecution.sessions[0].session.variables.get(countVariable(READONLY_SQL, CONDITIONAL_RELATIONS[0])), "0");
assert.notEqual(previewAbsentResult.legacyDigest, emptyPresentResult.legacyDigest, "absent and present-empty evidence remain distinct");
assert.equal(previewAbsentResult.canonicalRelationsDigest, digest("e"), "canonical evidence remains obtainable with absent legacy/source relations");
assert.equal(previewAbsentResult.canonicalRpcAclDigest, digest("f"));

const partialPresent = CONDITIONAL_RELATIONS.filter((relation) => ![
  "comment_translator_paid_usage_events",
  "comment_translator_obs_overlay_tokens"
].includes(relation));
const partialExecution = createSyntheticPsqlTransport(syntheticEvidenceFixture({
  present: partialPresent,
  counts: Object.fromEntries(partialPresent.map((relation) => [relation, 0])),
  makeEvidence: makeSyntheticScopedEvidence
}));
const partialResult = runPreflight({
  target: "production",
  env: envForTarget("production"),
  fsApi: fixtureFs,
  transport: partialExecution.transport
});
assert.equal(partialResult.status, "blocked-required-evidence", "partial legacy/source presence fails closed");
assert.equal(partialResult.legacyDigest, null);
assert.equal(partialResult.sourceEraDigest, null);
assert.equal(partialExecution.sessions[0].session.statements.filter((statement) => /FROM\s+public\./i.test(statement)).length, partialPresent.length);

const unknownExecution = createSyntheticPsqlTransport(syntheticEvidenceFixture({
  present: CONDITIONAL_RELATIONS,
  counts: allPresentCounts,
  unknownObserved: true,
  makeEvidence: makeSyntheticScopedEvidence
}));
const unknownResult = runPreflight({
  target: "production",
  env: envForTarget("production"),
  fsApi: fixtureFs,
  transport: unknownExecution.transport
});
assert.equal(unknownResult.status, "blocked-required-evidence", "unknown observed identities fail closed");
assert.equal(unknownResult.legacyDigest, null);
assert.equal(unknownExecution.sessions[0].session.variables.get("gate1_unknown_relation_absent"), "f");

for (const [label, fixture] of [
  ["null presence", syntheticEvidenceFixture({ present: CONDITIONAL_RELATIONS, discovery: "null", makeEvidence: makeSyntheticScopedEvidence })],
  ["null unknown boolean", syntheticEvidenceFixture({ present: CONDITIONAL_RELATIONS, unknownObserved: null, makeEvidence: makeSyntheticScopedEvidence })],
  ["duplicate presence", syntheticEvidenceFixture({ present: CONDITIONAL_RELATIONS, discovery: "duplicate", makeEvidence: makeSyntheticScopedEvidence })],
  ["malformed presence", syntheticEvidenceFixture({ present: CONDITIONAL_RELATIONS, discovery: "malformed", makeEvidence: makeSyntheticScopedEvidence })],
  ["malformed count", syntheticEvidenceFixture({ present: CONDITIONAL_RELATIONS, counts: { [CONDITIONAL_RELATIONS[0]]: "malformed" }, makeEvidence: makeSyntheticScopedEvidence })],
  ["duplicate count", syntheticEvidenceFixture({ present: CONDITIONAL_RELATIONS, counts: { [CONDITIONAL_RELATIONS[0]]: "duplicate" }, makeEvidence: makeSyntheticScopedEvidence })]
]) {
  const execution = createSyntheticPsqlTransport(fixture);
  const result = runPreflight({
    target: "production",
    env: envForTarget("production"),
    fsApi: fixtureFs,
    transport: execution.transport
  });
  assertSyntheticFailure(label, execution, result);
}

const rollbackFailureExecution = createSyntheticPsqlTransport(syntheticEvidenceFixture({
  present: CONDITIONAL_RELATIONS,
  counts: allPresentCounts,
  failAfterStatements: 5,
  makeEvidence: makeSyntheticScopedEvidence
}));
const rollbackFailureResult = runPreflight({
  target: "production",
  env: envForTarget("production"),
  fsApi: fixtureFs,
  transport: rollbackFailureExecution.transport
});
assert.equal(rollbackFailureResult.status, "blocked-connection-failed", "transport errors fail closed");
assert.equal(rollbackFailureExecution.sessions[0].session.transaction.rolledBackOnClose, true, "an error closes the same open transaction with rollback semantics");
assert.equal(rollbackFailureExecution.sessions[0].session.statements.filter((statement) => /\bBEGIN\b/i.test(statement)).length, 1);

function assertPreconnectionBlocked(label, { target = "production", env = baseEnv, reason }) {
  const transport = fakeTransport();
  const result = runPreflight({ target, env, fsApi: fixtureFs, transport });
  assert.equal(result.status, "blocked-context-absent", `${label}: status`);
  assert.equal(result.blockedReason, reason, `${label}: fixed reason`);
  assert.equal(transport.calls.length, 0, `${label}: no transport call before validation`);
  assertOutputSchema(result);
}

assert.equal(canonicalBindingJson({ z: 1, a: { y: 2, b: 3 } }), '{"a":{"b":3,"y":2},"z":1}', "binding canonicalization sorts keys compactly");
const reorderedBinding = JSON.parse(`{"user":"postgres","target":"production","caSha256":"${binding.caSha256}","schemaVersion":1,"host":"${binding.host}","port":5432,"database":"postgres","connectionMode":"direct","projectRef":"${binding.projectRef}","sslMode":"verify-full"}`);
assert.equal(computeBindingSha256(reorderedBinding), computeBindingSha256(binding), "binding digest is independent of input key order");
assert.deepEqual(Object.keys(parseTargetBinding(JSON.stringify(binding)).binding).sort(), [...TARGET_BINDING_KEYS].sort(), "valid binding uses only amendment keys");

const validTransport = fakeTransport();
const validResult = runPreflight({ target: "production", env: baseEnv, fsApi: fixtureFs, transport: validTransport });
assert.equal(validResult.status, "readonly-evidence", "valid synthetic binding reaches read-only evidence");
assert.equal(validResult.blockedReason, null);
assert.equal(validResult.target, "production");
assert.equal(validTransport.calls.length, 1, "fake transport is called once after all preconditions");
assert.deepEqual(validResult.extensions, completeEvidence.extensions);
assert.deepEqual(validResult.vault, completeEvidence.vault);
assert.deepEqual(validResult.cron, completeEvidence.cron);
assert.deepEqual(validResult.advisor, completeEvidence.advisor);
assertOutputSchema(validResult);

const activeCronTransport = fakeTransport({
  exitCode: 0,
  stdout: JSON.stringify({ ...completeEvidence, cron: { ...completeEvidence.cron, matching: 1, active: true } }),
  stderr: "",
  rowCount: 1
});
const activeCronResult = runPreflight({ target: "production", env: baseEnv, fsApi: fixtureFs, transport: activeCronTransport });
assert.equal(activeCronResult.status, "readonly-evidence", "an active job with the approved name remains visible");
assert.equal(activeCronResult.cron.matching, 1, "the approved Cron name is counted");
assert.equal(activeCronResult.cron.active, true, "the approved Cron name is not misrepresented as absent");

const invocation = validTransport.calls[0];
assert.equal(invocation.command, "psql");
assert.equal(invocation.shell, false, "transport invocation forbids a shell");
assert.ok(invocation.args.includes("--no-psqlrc"));
assert.ok(invocation.args.includes("--no-password"));
assert.ok(invocation.args.includes("--tuples-only"));
assert.ok(invocation.args.includes("--no-align"));
assert.ok(invocation.args.includes("--set=ON_ERROR_STOP=1"));
assert.equal(invocation.env.PGSSLMODE, "verify-full");
assert.equal(invocation.env.PGGSSENCMODE, "disable", "inherited GSS encryption cannot override TLS");
assert.equal(invocation.env.PGOPTIONS, READONLY_PGOPTIONS, "child PGOPTIONS is the fixed read-only setting");
assert.equal(invocation.env.GATE1_TARGET_BINDING_JSON, undefined, "private binding JSON is not inherited by psql");
assert.equal(invocation.env.GATE1_TARGET_BINDING_SHA256, undefined, "private approval digest is not inherited by psql");
assert.equal(invocation.env.PGHOSTADDR, undefined, "hostaddr override is absent from child environment");
assert.equal(invocation.env.PGSERVICE, undefined, "service override is absent from child environment");
assert.equal(invocation.env.PGPASSWORD, baseEnv.PGPASSWORD, "password context is passed only to the child");
assert.match(invocation.input, /BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;/);
assert.match(invocation.input, /SET LOCAL statement_timeout = '30s';/);
assert.match(invocation.input, /SET LOCAL lock_timeout = '5s';/);
assert.match(invocation.input, /ROLLBACK;/);
assert.doesNotMatch(invocation.args.join(" "), /postgres(?:ql)?:\/\//i, "connection string is not passed in argv");
assert.match(invocation.input, /jobname\s*=\s*'comment-translator-paid-maintenance'/i, "Cron predicate uses the approved hyphenated name");
assert.doesNotMatch(invocation.input, /jobname\s*=\s*'comment_translator_paid_maintenance'/i, "Cron predicate does not use the retired underscore name");
assert.doesNotMatch(READONLY_SQL, /\breltuples\b|rowEstimate|estimatedRows/i, "catalog evidence never hashes estimates as exact state");
for (const relationName of [
  "comment_translator_paid_entitlements",
  "comment_translator_paid_usage_counters",
  "comment_translator_paid_usage_events",
  "comment_translator_creator_history",
  "comment_translator_custom_dictionary_entries",
  "comment_translator_moderator_share_browser_sessions",
  "comment_translator_moderator_share_tokens",
  "comment_translator_obs_overlay_browser_sessions",
  "comment_translator_obs_overlay_tokens"
]) {
  assert.match(
    READONLY_SQL,
    new RegExp(`count\\(\\*\\)::bigint\\s+AS\\s+${countVariable(READONLY_SQL, relationName)}\\s+FROM\\s+public\\.${relationName}`),
    `exact row count is collected for ${relationName}`
  );
}
assert.match(READONLY_SQL, /function_scope_summary/);
assert.match(READONLY_SQL, /missing_name_count/);
assert.match(READONLY_SQL, /extra_name_count/);
for (const field of [
  "columns",
  "constraints",
  "indexes",
  "policies",
  "triggers",
  "grantable",
  "privilege",
  "identityArguments",
  "resultType",
  "config",
  "securityDefiner",
  "definitionMd5",
  "dependencyCounts"
]) {
  assert.match(READONLY_SQL, new RegExp(field), `catalog projection includes complete ${field} evidence`);
}

const bridgeStates = JSON.parse(fs.readFileSync(
  new URL("./fixtures/comment-translator-paid-core-v1-gate1-bridge-states.json", import.meta.url),
  "utf8"
));
const paidLegacyCatalog = JSON.parse(fs.readFileSync(
  new URL("./fixtures/comment-translator-paid-core-v1-gate1-paid-legacy-catalog.json", import.meta.url),
  "utf8"
));
const sourceEraCatalog = JSON.parse(fs.readFileSync(
  new URL("./fixtures/comment-translator-paid-core-v1-gate1-source-era-catalog.json", import.meta.url),
  "utf8"
));
const canonicalCountsByIdentity = new Map(
  bridgeStates.canonicalObservation.rows.map((row) => [`${row.schema}.${row.name}`, row.rowCount])
);
const productionCanonical = {
  ...bridgeStates.canonical,
  tables: bridgeStates.canonical.tables.map((table) => ({
    ...table,
    rowCount: canonicalCountsByIdentity.get(`${table.schema}.${table.name}`)
  }))
};

assertCanonicalStructuralState(bridgeStates.canonical);
const projectedCanonical = projectCanonicalStructuralState(productionCanonical);
assert.equal(
  canonicalStructuralEqual(projectedCanonical, bridgeStates.canonical),
  true,
  "the production projection retains complete canonical structure while excluding only rowCount"
);
const canonicalObservation = createCanonicalObservation(
  productionCanonical,
  bridgeStates.canonicalObservation.sourceArtifactSha256
);
assert.deepEqual(canonicalObservation, bridgeStates.canonicalObservation, "exact canonical counts remain a bound observation");
assertCanonicalObservation(
  canonicalObservation,
  productionCanonical,
  bridgeStates.canonicalObservation.sourceArtifactSha256
);

const countOnlyVariant = structuredClone(productionCanonical);
countOnlyVariant.tables[0].rowCount += 1;
assert.equal(
  canonicalStructuralEqual(projectCanonicalStructuralState(countOnlyVariant), bridgeStates.canonical),
  true,
  "a count-only change does not alter canonical structure"
);
assert.notDeepEqual(
  createCanonicalObservation(countOnlyVariant, bridgeStates.canonicalObservation.sourceArtifactSha256),
  canonicalObservation,
  "a count-only change remains distinct operational evidence"
);

function assertStructuralDrift(label, mutate) {
  const variant = structuredClone(productionCanonical);
  mutate(variant);
  assert.equal(
    canonicalStructuralEqual(projectCanonicalStructuralState(variant), bridgeStates.canonical),
    false,
    `${label} drift is visible to the production projection`
  );
}

assertStructuralDrift("owner", (state) => { state.tables[0].owner = `${state.tables[0].owner}_drift`; });
assertStructuralDrift("column", (state) => { state.tables[0].columns[0].type = "text_drift"; });
assertStructuralDrift("constraint", (state) => { state.tables[0].constraints[0].definition += " DRIFT"; });
assertStructuralDrift("index", (state) => { state.tables[0].indexes[0].definition += " DRIFT"; });
assertStructuralDrift("policy", (state) => {
  state.tables[0].policies = [structuredClone(paidLegacyCatalog.tables[0].policies[0])];
});
assertStructuralDrift("write ACL", (state) => {
  const acl = state.tables.flatMap((table) => table.acls).find((row) => row.privilege === "UPDATE");
  assert.ok(acl, "fixture includes a write ACL");
  acl.grantable = !acl.grantable;
});
assertStructuralDrift("function identity", (state) => { state.functions[0].identityArguments += ", drift text"; });
assertStructuralDrift("function result", (state) => { state.functions[0].resultType = "text"; });
assertStructuralDrift("function config", (state) => { state.functions[0].config = [...state.functions[0].config, "jit=off"]; });
assertStructuralDrift("function security", (state) => { state.functions[0].securityDefiner = !state.functions[0].securityDefiner; });
assertStructuralDrift("function definition", (state) => { state.functions[0].definitionMd5 = "b".repeat(32); });
assertStructuralDrift("trigger", (state) => { state.triggers[0].enabled = !state.triggers[0].enabled; });
assertStructuralDrift("dependency", (state) => { state.dependencyCounts.unexpectedPgDependEdges += 1; });

const readbackFixture = {
  schemaVersion: 1,
  target: "preview",
  targetFingerprint: "a".repeat(32),
  readOnly: {
    serverVersionMajor: "17",
    transactionReadOnly: "on",
    defaultTransactionReadOnly: "on",
    transactionIsolation: "repeatable read"
  },
  history: { count: 0, totalStatements: 0, targetRows: 0, targetMatches: 0, rows: [] },
  canonicalRpc: { functions: structuredClone(productionCanonical.functions) },
  canonical: productionCanonical,
  paidLegacy: {
    tables: paidLegacyCatalog.tables,
    functions: paidLegacyCatalog.functions,
    triggers: paidLegacyCatalog.triggers,
    dependencyCounts: paidLegacyCatalog.dependencyCounts
  },
  sourceEra: {
    tables: sourceEraCatalog.tables,
    functions: sourceEraCatalog.functions,
    triggers: sourceEraCatalog.triggers,
    dependencyCounts: sourceEraCatalog.dependencyCounts
  },
  absence: { legacyRelationCount: 0, sourceEraRelationCount: 0, archiveSchemaCount: 0, sharedPaidEntitlementRelationCount: 0 }
};
assert.equal(
  inspectCatalogReadbackArtifact(readbackFixture, "preview").valid,
  true,
  "the production-shaped complete fixture reaches the existing strict readback validator"
);

const missingCatalogTable = structuredClone(readbackFixture);
missingCatalogTable.canonical.tables.pop();
const missingCatalogResult = inspectCatalogReadbackArtifact(missingCatalogTable, "preview");
assert.equal(missingCatalogResult.valid, false, "missing catalog identity fails closed");
assert.ok(missingCatalogResult.missing.includes("canonical.tables.count"));

const duplicateCatalogTable = structuredClone(readbackFixture);
duplicateCatalogTable.canonical.tables.push(structuredClone(duplicateCatalogTable.canonical.tables[0]));
const duplicateCatalogResult = inspectCatalogReadbackArtifact(duplicateCatalogTable, "preview");
assert.equal(duplicateCatalogResult.valid, false, "duplicate catalog identity fails closed");
assert.ok(duplicateCatalogResult.missing.includes("canonical.tables.duplicate"));

const extraCatalogFunction = structuredClone(readbackFixture);
extraCatalogFunction.canonicalRpc.functions.push({
  ...structuredClone(extraCatalogFunction.canonicalRpc.functions[0]),
  name: "ct_paid_unexpected_extra"
});
const extraCatalogResult = inspectCatalogReadbackArtifact(extraCatalogFunction, "preview");
assert.equal(extraCatalogResult.valid, false, "extra catalog function identity fails closed");
assert.ok(extraCatalogResult.missing.includes("canonicalRpc.functions.count"));

const incompleteFunction = structuredClone(readbackFixture);
delete incompleteFunction.canonical.functions[0].definitionMd5;
const incompleteFunctionResult = inspectCatalogReadbackArtifact(incompleteFunction, "preview");
assert.equal(incompleteFunctionResult.valid, false, "missing complete FunctionRow fields fail closed");
assert.ok(incompleteFunctionResult.missing.includes("canonical.strict"));

assertPreconnectionBlocked("missing target", { target: null, reason: "TARGET_BINDING_MISSING" });
assertPreconnectionBlocked("missing binding", {
  env: envWith({}, ["GATE1_TARGET_BINDING_JSON", "GATE1_TARGET_BINDING_SHA256"]),
  reason: "TARGET_BINDING_MISSING"
});
assertPreconnectionBlocked("invalid CLI target", { target: "staging", reason: "TARGET_BINDING_INVALID" });
assertPreconnectionBlocked("invalid JSON", {
  env: envWith({ GATE1_TARGET_BINDING_JSON: "{" }),
  reason: "TARGET_BINDING_INVALID"
});
assertPreconnectionBlocked("duplicate binding key", {
  env: envWith({
    GATE1_TARGET_BINDING_JSON: `{"schemaVersion":1,"target":"production","connectionMode":"direct","projectRef":"${binding.projectRef}","host":"${binding.host}","port":5432,"database":"postgres","user":"postgres","sslMode":"verify-full","caSha256":"${binding.caSha256}","port":5432}`
  }),
  reason: "TARGET_BINDING_INVALID"
});
assertPreconnectionBlocked("extra secret-shaped key", {
  env: envWith({ GATE1_TARGET_BINDING_JSON: JSON.stringify({ ...binding, password: "synthetic-credential" }) }),
  reason: "TARGET_BINDING_INVALID"
});
const missingBindingKey = { ...binding };
delete missingBindingKey.host;
assertPreconnectionBlocked("missing binding key", {
  env: envWith({ GATE1_TARGET_BINDING_JSON: JSON.stringify(missingBindingKey) }),
  reason: "TARGET_BINDING_INVALID"
});
assertPreconnectionBlocked("wrong binding type", {
  env: envWith({ GATE1_TARGET_BINDING_JSON: JSON.stringify({ ...binding, port: "5432" }) }),
  reason: "TARGET_BINDING_INVALID"
});
assertPreconnectionBlocked("wrong binding host", {
  env: envWith({ GATE1_TARGET_BINDING_JSON: JSON.stringify({ ...binding, host: "db.other.supabase.co" }) }),
  reason: "TARGET_BINDING_INVALID"
});
assertPreconnectionBlocked("wrong approval digest", {
  env: envWith({ GATE1_TARGET_BINDING_SHA256: digest("f") }),
  reason: "TARGET_BINDING_DIGEST_MISMATCH"
});
assertPreconnectionBlocked("malformed approval digest", {
  env: envWith({ GATE1_TARGET_BINDING_SHA256: "not-a-digest" }),
  reason: "TARGET_BINDING_DIGEST_MISMATCH"
});
const swappedBinding = { ...binding, target: "preview" };
assertPreconnectionBlocked("swapped target", {
  target: "production",
  env: envWith({
    GATE1_TARGET_BINDING_JSON: JSON.stringify(swappedBinding),
    GATE1_TARGET_BINDING_SHA256: computeBindingSha256(swappedBinding)
  }),
  reason: "CONNECTION_BINDING_MISMATCH"
});

for (const [field, value] of [
  ["PGHOST", "db.other.supabase.co"],
  ["PGPORT", "6543"],
  ["PGDATABASE", "other"],
  ["PGUSER", "other"]
]) {
  assertPreconnectionBlocked(`wrong connection ${field}`, {
    env: envWith({ [field]: value }),
    reason: "CONNECTION_BINDING_MISMATCH"
  });
}
assertPreconnectionBlocked("missing CA path", {
  env: envWith({}, ["PGSSLROOTCERT"]),
  reason: "TLS_CONTEXT_INVALID"
});
assertPreconnectionBlocked("missing CA file", {
  env: envWith({ PGSSLROOTCERT: "missing-ca.pem" }),
  reason: "TLS_CONTEXT_INVALID"
});
assertPreconnectionBlocked("wrong CA bytes", {
  env: envWith({ PGSSLROOTCERT: "wrong-ca.pem" }),
  reason: "TLS_CONTEXT_INVALID"
});
const wrongCaBinding = { ...binding, caSha256: digest("f") };
assertPreconnectionBlocked("wrong CA digest", {
  env: envWith({
    GATE1_TARGET_BINDING_JSON: JSON.stringify(wrongCaBinding),
    GATE1_TARGET_BINDING_SHA256: computeBindingSha256(wrongCaBinding)
  }),
  reason: "TLS_CONTEXT_INVALID"
});
assertPreconnectionBlocked("require TLS mode", {
  env: envWith({ PGSSLMODE: "require" }),
  reason: "TLS_CONTEXT_INVALID"
});
for (const override of [
  { PGHOSTADDR: "127.0.0.1" },
  { PGSERVICE: "fixture-service" },
  { PGSERVICEFILE: "fixture-service-file" },
  { PGOPTIONS: "-c statement_timeout=0" },
  { DATABASE_URL: "fixture-connection-url" }
]) {
  assertPreconnectionBlocked(`inherited override ${Object.keys(override)[0]}`, {
    env: envWith(override),
    reason: "CONNECTION_BINDING_MISMATCH"
  });
}
assertPreconnectionBlocked("missing password context", {
  env: envWith({}, ["PGPASSWORD"]),
  reason: "CONNECTION_BINDING_MISMATCH"
});
assertPreconnectionBlocked("ambiguous password context", {
  env: envWith({ PGPASSFILE: "fixture-passfile" }),
  reason: "CONNECTION_BINDING_MISMATCH"
});
assertPreconnectionBlocked("missing process path", {
  env: envWith({}, ["PATH"]),
  reason: "CONNECTION_BINDING_MISMATCH"
});

const invalidBindingModes = { ...binding, sslMode: "require" };
assertPreconnectionBlocked("binding require mode", {
  env: envWith({
    GATE1_TARGET_BINDING_JSON: JSON.stringify(invalidBindingModes),
    GATE1_TARGET_BINDING_SHA256: computeBindingSha256(invalidBindingModes)
  }),
  reason: "TARGET_BINDING_INVALID"
});

function assertTransportBlocked(label, response, expectedReason = "REQUIRED_EVIDENCE_UNAVAILABLE") {
  const transport = fakeTransport(response);
  const result = runPreflight({ target: "production", env: baseEnv, fsApi: fixtureFs, transport });
  assert.equal(transport.calls.length, 1, `${label}: transport call occurs after preconditions`);
  assert.equal(result.blockedReason, expectedReason, `${label}: fixed reason`);
  assert.match(result.status, /^blocked-/i, `${label}: blocked status`);
  assertOutputSchema(result);
  assert.doesNotMatch(JSON.stringify(result), /synthetic-credential|TLS negotiation failed|postgresql:\/\//i, `${label}: no raw sensitive output`);
}

assertTransportBlocked("connection failure", { exitCode: 1, stdout: "", stderr: "TLS negotiation failed", rowCount: 0 }, "CONNECTION_FAILED");
assertTransportBlocked("TLS failure", { exitCode: 1, stdout: "", stderr: "certificate verify failed", rowCount: 0 }, "CONNECTION_FAILED");
assertTransportBlocked("raw error output", { exitCode: 0, stdout: "database error: private details", stderr: "", rowCount: 1 });
assertTransportBlocked("unexpected stderr", {
  exitCode: 0,
  stdout: JSON.stringify(completeEvidence),
  stderr: "unexpected warning",
  rowCount: 1
});
assertTransportBlocked("duplicate output", {
  exitCode: 0,
  stdout: `${JSON.stringify(completeEvidence)}\n${JSON.stringify(completeEvidence)}`,
  stderr: "",
  rowCount: 2
});
assertTransportBlocked("oversized output", { exitCode: 0, stdout: "x".repeat(MAX_OUTPUT_BYTES + 1), stderr: "", rowCount: 1 });
assertTransportBlocked("over-row-limit output", {
  exitCode: 0,
  stdout: JSON.stringify(completeEvidence),
  stderr: "",
  rowCount: MAX_RESULT_ROWS + 1
});
assertTransportBlocked("secret-shaped output", {
  exitCode: 0,
  stdout: JSON.stringify({ password: "synthetic-credential" }),
  stderr: "",
  rowCount: 1
});
assertTransportBlocked("wrong legacy fingerprint field", {
  exitCode: 0,
  stdout: JSON.stringify({ ...completeEvidence, targetFingerprint: "a".repeat(32) }),
  stderr: "",
  rowCount: 1
});
assertTransportBlocked("drifted digest", {
  exitCode: 0,
  stdout: JSON.stringify({ ...completeEvidence, historyDigest: "drifted" }),
  stderr: "",
  rowCount: 1
});

const nativeCaptureCalls = [];
const nativeCaptureTransport = createPsqlTransport({
  spawnSyncImpl(command, args, options) {
    nativeCaptureCalls.push({ command, args, options });
    if (args[0] === "--version") return { status: 0, stdout: "psql (PostgreSQL) 17.6", stderr: "" };
    return { status: 0, stdout: JSON.stringify(completeEvidence), stderr: "" };
  }
});
assert.equal(
  runPreflight({ target: "production", env: baseEnv, fsApi: fixtureFs, transport: nativeCaptureTransport }).status,
  "readonly-evidence",
  "valid native capture remains evidence"
);
assert.equal(nativeCaptureCalls[0].options.timeout, 10000, "version capture has the bounded timeout");
assert.equal(nativeCaptureCalls[1].options.timeout, 60000, "query capture has the bounded timeout");

const versionStderrOnlyCalls = [];
const versionStderrOnlyTransport = createPsqlTransport({
  spawnSyncImpl(command, args, options) {
    versionStderrOnlyCalls.push({ command, args, options });
    if (args[0] === "--version") return { status: 0, stdout: "", stderr: "psql (PostgreSQL) 17.6" };
    return { status: 0, stdout: JSON.stringify(completeEvidence), stderr: "" };
  }
});
assert.notEqual(
  runPreflight({ target: "production", env: baseEnv, fsApi: fixtureFs, transport: versionStderrOnlyTransport }).status,
  "readonly-evidence",
  "version identity is taken from stdout only"
);
assert.equal(versionStderrOnlyCalls.length, 1, "version failure never spawns the query");

function nativeTransportResult(versionResult, queryResult = { status: 0, stdout: JSON.stringify(completeEvidence), stderr: "" }) {
  let queryCalls = 0;
  const transport = createPsqlTransport({
    spawnSyncImpl(command, args, options) {
      if (args[0] === "--version") return versionResult;
      queryCalls += 1;
      return queryResult;
    }
  });
  const result = transport.execute({ command: "psql", args: ["--query"], env: {}, input: "" });
  return { result, queryCalls };
}

for (const [label, queryResult] of [
  ["query error", { status: 0, error: new Error("synthetic error"), stdout: JSON.stringify(completeEvidence), stderr: "" }],
  ["query signal", { status: 0, signal: "SIGTERM", stdout: JSON.stringify(completeEvidence), stderr: "" }],
  ["query missing stdout", { status: 0, stdout: undefined, stderr: "" }],
  ["query missing stderr", { status: 0, stdout: JSON.stringify(completeEvidence), stderr: undefined }],
  ["query stderr", { status: 0, stdout: JSON.stringify(completeEvidence), stderr: "unexpected warning" }],
  ["query aggregate UTF-8 overflow", { status: 0, stdout: "界".repeat(Math.ceil(MAX_OUTPUT_BYTES / 2)), stderr: "x".repeat(Math.ceil(MAX_OUTPUT_BYTES / 2)) }]
]) {
  const native = nativeTransportResult({ status: 0, stdout: "psql (PostgreSQL) 17.6", stderr: "" }, queryResult);
  assert.deepEqual(native.result, { exitCode: 1, stdout: "", stderr: "", rowCount: 0 }, `${label}: failed native capture is sanitized`);
  assert.equal(native.queryCalls, 1, `${label}: query capture was attempted after valid version`);
}

for (const [label, versionResult] of [
  ["version nonzero status", { status: 1, stdout: "psql (PostgreSQL) 17.6", stderr: "" }],
  ["version null status", { status: null, stdout: "psql (PostgreSQL) 17.6", stderr: "" }]
]) {
  const native = nativeTransportResult(versionResult);
  assert.deepEqual(native.result, { exitCode: 1, stdout: "", stderr: "", rowCount: 0 }, `${label}: failed native capture is sanitized`);
  assert.equal(native.queryCalls, 0, `${label}: version failure cannot advance to query capture`);
}

for (const [label, queryResult] of [
  ["query nonzero status", { status: 1, stdout: JSON.stringify(completeEvidence), stderr: "" }],
  ["query null status", { status: null, stdout: JSON.stringify(completeEvidence), stderr: "" }]
]) {
  const native = nativeTransportResult({ status: 0, stdout: "psql (PostgreSQL) 17.6", stderr: "" }, queryResult);
  assert.deepEqual(native.result, { exitCode: 1, stdout: "", stderr: "", rowCount: 0 }, `${label}: failed native capture is sanitized`);
  assert.equal(native.queryCalls, 1, `${label}: query capture is attempted once after valid version`);
}

const rowCountNative = nativeTransportResult(
  { status: 0, stdout: "psql (PostgreSQL) 17.6", stderr: "" },
  { status: 0, stdout: "first\n\nsecond\n", stderr: "" }
);
assert.equal(rowCountNative.result.rowCount, 2, "native transport counts nonempty query output lines");

for (const metadata of [
  { captureComplete: false },
  { error: "synthetic native error" },
  { signal: "SIGTERM" }
]) {
  const parserResult = parseSanitizedEvidence(JSON.stringify(completeEvidence), "", { rowCount: 1, ...metadata });
  assert.equal(parserResult.ok, false, "parser rejects explicitly signaled incomplete native capture metadata");
}

const incompleteEvidence = {
  ...completeEvidence,
  pendingDigest: null,
  cron: { ...completeEvidence.cron, runDelta: null },
  advisor: null
};
const incompleteTransport = fakeTransport({ exitCode: 0, stdout: JSON.stringify(incompleteEvidence), stderr: "", rowCount: 1 });
const incompleteResult = runPreflight({ target: "production", env: baseEnv, fsApi: fixtureFs, transport: incompleteTransport });
assert.equal(incompleteResult.status, "blocked-required-evidence");
assert.equal(incompleteResult.blockedReason, "REQUIRED_EVIDENCE_UNAVAILABLE");
assert.equal(incompleteResult.pendingDigest, null, "missing evidence remains null");
assert.equal(incompleteResult.cron.runDelta, null, "missing run delta is not zero-filled");
assert.deepEqual(incompleteResult.advisor, { baselineDigest: null, currentDigest: null, inScopeNew: null, highCriticalNew: null });
assert.equal(incompleteResult.mutationCounts.total, 0);

const parserUnknownField = parseSanitizedEvidence(
  JSON.stringify({ ...completeEvidence, targetFingerprint: "a".repeat(32) }),
  "",
  { rowCount: 1 }
);
assert.equal(parserUnknownField.ok, false, "parser rejects old target fingerprint evidence");
const parserDuplicate = parseSanitizedEvidence(`${JSON.stringify(completeEvidence)}\n${JSON.stringify(completeEvidence)}`, "", { rowCount: 2 });
assert.equal(parserDuplicate.ok, false, "parser rejects duplicate result objects");

const spawned = [];
const realShapeTransport = createPsqlTransport({
  spawnSyncImpl(command, args, options) {
    spawned.push({ command, args, options });
    if (args[0] === "--version") return { status: 0, stdout: "psql (PostgreSQL) 17.6", stderr: "" };
    return { status: 0, stdout: JSON.stringify(completeEvidence), stderr: "" };
  }
});
const realShapeResult = runPreflight({ target: "production", env: baseEnv, fsApi: fixtureFs, transport: realShapeTransport });
assert.equal(realShapeResult.status, "readonly-evidence", "PostgreSQL-17 transport shape succeeds with a fake process");
assert.equal(spawned.length, 2, "client version and one query process are the only process calls");
assert.equal(spawned[0].args[0], "--version");
assert.equal(spawned[1].args.includes("--no-psqlrc"), true);
assert.equal(spawned[1].args.includes("--no-password"), true);
assert.equal(spawned.every(({ command, options }) => command === "psql" && options.shell === false), true);

const runnerSource = fs.readFileSync(new URL("./comment-translator-paid-core-v1-gate1-preflight-readonly.mjs", import.meta.url), "utf8");
const normalizeStart = runnerSource.indexOf("function normalizeNativeCapture(");
const normalizeEnd = runnerSource.indexOf("function failedNativeCapture(", normalizeStart);
assert.ok(normalizeStart >= 0 && normalizeEnd > normalizeStart, "native capture normalizer source is present");
const normalizeSource = runnerSource.slice(normalizeStart, normalizeEnd);
const compileNormalizer = (source) => new Function("Buffer", "MAX_OUTPUT_BYTES", `${source}; return normalizeNativeCapture;`)(Buffer, MAX_OUTPUT_BYTES);
const realNormalizer = compileNormalizer(normalizeSource);
const statusGuardNeedle = "result.status !== 0 ||";
assert.ok(normalizeSource.includes(statusGuardNeedle), "native capture normalizer has an explicit status guard");
const statusGuardRemovedSource = normalizeSource.replace(statusGuardNeedle, "");
assert.notEqual(statusGuardRemovedSource, normalizeSource, "status guard mutant changes the normalizer source");
const statusGuardRemovedNormalizer = compileNormalizer(statusGuardRemovedSource);
const statusOneCapture = { status: 1, stdout: "psql (PostgreSQL) 17.6", stderr: "" };
assert.equal(realNormalizer(statusOneCapture), null, "nonzero native status is rejected by the real normalizer");
assert.throws(
  () => assert.equal(statusGuardRemovedNormalizer(statusOneCapture), null),
  "status guard removal mutant is caught by the nonzero-status regression"
);
assert.match(runnerSource, /GATE1_TARGET_BINDING_JSON/);
assert.match(runnerSource, /GATE1_TARGET_BINDING_SHA256/);
assert.match(runnerSource, /PGGSSENCMODE/);
assert.match(runnerSource, /PGSSLMODE/);
assert.match(runnerSource, /verify-full/);
assert.match(runnerSource, /--no-psqlrc/);
assert.match(runnerSource, /--no-password/);
assert.match(runnerSource, /ON_ERROR_STOP/);
assert.doesNotMatch(runnerSource, /targetFingerprint|environment-inventories/i, "runner does not use the legacy inventory fingerprint as binding identity");
const sqlWithoutLiterals = READONLY_SQL.replace(/'(?:''|[^'])*'/g, "''");
for (const forbidden of [
  /\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE|GRANT|REVOKE|COPY)\b/i,
  /\bEXECUTE\b/i,
  /decrypted[_ -]?secrets/i,
  /cron\.(?:schedule|alter_job)/i,
  /\b(?:db\s+push|apply_migration|project\s+pause|project\s+create|deploy)\b/i
]) {
  assert.doesNotMatch(sqlWithoutLiterals, forbidden, `fixed SQL avoids ${forbidden}`);
}
// The explicit policy-role column alias is SQL syntax, not a callable.
const sqlWithoutPolicyRoleAlias = sqlWithoutLiterals.replace(/\bAS policy_role\(role_oid\)/g, "AS policy_role");
const callableNames = [...sqlWithoutPolicyRoleAlias.matchAll(/\b([a-z_][a-z0-9_]*)\s*\(/gi)].map((match) => match[1].toLowerCase());
const sqlSyntaxCallNames = new Set(["as", "in", "filter", "from", "then", "or", "and", "arguments", "select", "join"]);
const allowedCallableNames = new Set([
  "format_type",
  "pg_get_expr",
  "pg_get_constraintdef",
  "pg_get_indexdef",
  "pg_get_triggerdef",
  "pg_get_functiondef",
  "pg_get_userbyid",
  "aclexplode",
  "has_schema_privilege",
  "has_table_privilege",
  "has_function_privilege",
  "to_regprocedure",
  "md5",
  "digest",
  "encode",
  "coalesce",
  "lower",
  "count",
  "max",
  "cardinality",
  "octet_length",
  "array_agg",
  "jsonb_agg",
  "jsonb_build_object",
  "to_jsonb",
  "unnest",
  "current_setting",
  "transaction_timestamp",
  "version"
]);
for (const callableName of callableNames) {
  assert.equal(
    allowedCallableNames.has(callableName) || sqlSyntaxCallNames.has(callableName),
    true,
    `SQL callable ${callableName} is allowlisted or a SQL syntax false positive`
  );
}

const inventoryPath = "scripts/fixtures/comment-translator-paid-core-v1-gate1-environment-inventories.json";
const inventoryBefore = fs.readFileSync(inventoryPath);
assert.match(inventoryBefore.toString("utf8"), /"schemaVersion": 2/);
assert.match(inventoryBefore.toString("utf8"), /"targetFingerprint": "[0-9a-f]{32}"/);
assert.equal(fs.readFileSync(inventoryPath).equals(inventoryBefore), true, "inventory remains byte-identical");

assert.deepEqual(REASON_CODES, [
  "TARGET_BINDING_MISSING",
  "TARGET_BINDING_INVALID",
  "TARGET_BINDING_DIGEST_MISMATCH",
  "CONNECTION_BINDING_MISMATCH",
  "TLS_CONTEXT_INVALID",
  "CONNECTION_FAILED",
  "REQUIRED_EVIDENCE_UNAVAILABLE"
]);

const argvModule = await import("./comment-translator-paid-core-v1-gate1-preflight-readonly.mjs");
assert.deepEqual(argvModule.parseCliArgs(["--target", "production"]), { target: "production", reason: null });
assert.equal(argvModule.parseCliArgs([]).reason, "TARGET_BINDING_MISSING");
assert.equal(argvModule.parseCliArgs(["--target", "production", "--target", "preview"]).reason, "TARGET_BINDING_INVALID");

console.log("preflight-contract=pass binding=strict digest=independent-md5-state=untouched transport-calls=bounded mutations=0");
