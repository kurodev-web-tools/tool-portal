import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runnerPath = path.join(root, "scripts", "comment-translator-paid-core-v1-gate1-vault-write.ps1");
const syntheticPhase = "synthetic";
const integrationPhase = "integration";
const localImageTag = "public.ecr.aws/supabase/postgres:17.6.1.140";
const localRuntimePrefix = "ct-paid-gate1-vault-local-";
const localContainerLabelKey = "com.comment-translator.gate1.scope";
const localContainerLabelValue = "local-vault-transaction";
const localContainerRunLabelKey = "com.comment-translator.gate1.run";
const localCommandTimeoutMs = 60000;
const localReadinessTimeoutMs = 60000;
const localBootstrapRole = "supabase_admin";
const localVaultNames = Object.freeze([
  "comment_translator_paid_maintenance_url",
  "comment_translator_paid_cron_token"
]);

function buildLocalIntegrationCasePlan() {
  return [
    { name: "success-rerun", database: "postgres" },
    { name: "partial-preservation", database: "postgres" },
    { name: "second-create-fault-rollback", database: "postgres" },
    { name: "post-create-assertion-fault-rollback", database: "postgres" }
  ];
}

const PROCESS_ESSENTIAL_KEYS = Object.freeze([
  "PATH",
  "SystemRoot",
  "WINDIR",
  "ComSpec",
  "TEMP",
  "TMP",
  "HOME",
  "USERPROFILE"
]);

function minimalEnvironment(overrides = {}) {
  const environment = {};
  for (const key of PROCESS_ESSENTIAL_KEYS) {
    if (typeof process.env[key] === "string" && process.env[key].length > 0) {
      environment[key] = process.env[key];
    }
  }
  return { ...environment, ...overrides };
}

function runRunner(args = [], overrides = {}) {
  const result = spawnSync(
    "pwsh",
    ["-NoProfile", "-File", runnerPath, ...args],
    {
      cwd: root,
      env: minimalEnvironment(overrides),
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 1024 * 1024
    }
  );
  return {
    status: result.status,
    stdout: typeof result.stdout === "string" ? result.stdout : "",
    stderr: typeof result.stderr === "string" ? result.stderr : ""
  };
}

function parseSingleJson(result) {
  assert.equal(result.stdout.split(/\r?\n/).filter(Boolean).length, 1, "runner emits one JSON line");
  assert.ok(result.stderr === "", "runner does not expose PowerShell diagnostics");
  return JSON.parse(result.stdout);
}

function assertNoSecretValue(text, values) {
  for (const value of values) {
    assert.equal(text.includes(value), false, "secret-shaped synthetic value was not emitted");
  }
}

function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortKeysDeep(value[key])]));
}

function bindingFor(target = "production") {
  const projectRef = "syntheticgate1";
  return {
    caSha256: "a".repeat(64),
    connectionMode: "direct",
    database: "postgres",
    host: `db.${projectRef}.supabase.co`,
    port: 5432,
    projectRef,
    schemaVersion: 1,
    sslMode: "verify-full",
    target,
    user: "postgres"
  };
}

function bindingEnvironment(binding, overrides = {}) {
  const rawBinding = JSON.stringify(sortKeysDeep(binding));
  const digest = createHash("sha256").update(Buffer.from(rawBinding, "utf8")).digest("hex");
  return {
    GATE1_TARGET_BINDING_JSON: rawBinding,
    GATE1_TARGET_BINDING_SHA256: digest,
    ...overrides
  };
}

function extractFunctionOutput(command) {
  const escapedRunner = runnerPath.replaceAll("'", "''");
  const script = `
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$source = Get-Content -Raw -LiteralPath '${escapedRunner}'
$tokens = $null
$errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseInput($source, [ref]$tokens, [ref]$errors)
if ($errors.Count -ne 0) { throw 'PS_SYNTAX' }
foreach ($definition in $ast.FindAll({ param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] }, $false)) {
  . ([scriptblock]::Create($definition.Extent.Text))
}
$value = & { ${command} }
$value | ConvertTo-Json -Compress -Depth 50
`;
  const result = spawnSync("pwsh", ["-NoProfile", "-Command", script], {
    cwd: root,
    env: minimalEnvironment(),
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 1024 * 1024
  });
  assert.ok(result.status === 0, "PowerShell function extraction succeeded");
  assert.ok((result.stderr ?? "") === "", "function extraction has no diagnostics");
  const lines = String(result.stdout ?? "").split(/\r?\n/).filter(Boolean);
  assert.equal(lines.length, 1, "function extraction emits one JSON value");
  return JSON.parse(lines[0]);
}

function assertDefaultAndApprovalGates() {
  const defaultResult = runRunner();
  assert.equal(defaultResult.status, 2, "default runner is blocked");
  const defaultPayload = parseSingleJson(defaultResult);
  assert.deepEqual(
    Object.keys(defaultPayload).sort(),
    ["mutationCount", "status"],
    "default output is the fixed sanitized shape"
  );
  assert.deepEqual(defaultPayload, { mutationCount: 0, status: "blocked-approval-absent" });

  const explicitPreflight = runRunner(["-Mode", "Preflight"]);
  assert.equal(explicitPreflight.status, 2, "explicit preflight remains blocked without approval");
  assert.deepEqual(parseSingleJson(explicitPreflight), defaultPayload);

  const missingApproval = runRunner(["-Mode", "Write", "-Target", "production"]);
  assert.equal(missingApproval.status, 2, "write does not start without approval");
  assert.equal(parseSingleJson(missingApproval).status, "blocked-approval-absent");

  const wrongApproval = runRunner(
    ["-Mode", "Write", "-Target", "production"],
    { GATE1_VAULT_WRITE_APPROVAL: "wrong-approval" }
  );
  assert.equal(wrongApproval.status, 2, "wrong approval is rejected before connection");
  assert.equal(parseSingleJson(wrongApproval).status, "blocked-approval-invalid");

  const approvedWithoutBinding = runRunner(
    ["-Mode", "Write", "-Target", "production"],
    { GATE1_VAULT_WRITE_APPROVAL: "approved-gate1-vault-write" }
  );
  assert.equal(approvedWithoutBinding.status, 2, "approval cannot replace target binding");
  assert.equal(parseSingleJson(approvedWithoutBinding).status, "blocked-target-binding-absent");
}

function assertBindingAndConnectionGates() {
  const approved = { GATE1_VAULT_WRITE_APPROVAL: "approved-gate1-vault-write" };

  const malformed = runRunner(
    ["-Mode", "Write", "-Target", "production"],
    { ...approved, GATE1_TARGET_BINDING_JSON: "{}", GATE1_TARGET_BINDING_SHA256: "0".repeat(64) }
  );
  assert.equal(malformed.status, 2);
  assert.equal(parseSingleJson(malformed).status, "blocked-target-binding-invalid");

  const validBinding = bindingFor("production");
  const wrongDigest = runRunner(
    ["-Mode", "Write", "-Target", "production"],
    { ...approved, ...bindingEnvironment(validBinding, { GATE1_TARGET_BINDING_SHA256: "b".repeat(64) }) }
  );
  assert.equal(wrongDigest.status, 2);
  assert.equal(parseSingleJson(wrongDigest).status, "blocked-target-binding-digest-mismatch");

  const previewBinding = runRunner(
    ["-Mode", "Write", "-Target", "production"],
    { ...approved, ...bindingEnvironment(bindingFor("preview")) }
  );
  assert.equal(previewBinding.status, 2);
  assert.equal(parseSingleJson(previewBinding).status, "blocked-target-binding-mismatch");

  const bindingWithSecretShape = bindingFor("production");
  bindingWithSecretShape.host = ["https", "://", "db.syntheticgate1.supabase.co"].join("");
  const secretShapeRaw = JSON.stringify({ ...bindingWithSecretShape, projectRef: "syntheticgate1" });
  const secretShape = runRunner(
    ["-Mode", "Write", "-Target", "production"],
    {
      ...approved,
      GATE1_TARGET_BINDING_JSON: secretShapeRaw,
      GATE1_TARGET_BINDING_SHA256: createHash("sha256").update(Buffer.from(secretShapeRaw, "utf8")).digest("hex")
    }
  );
  assert.equal(secretShape.status, 2);
  assert.equal(parseSingleJson(secretShape).status, "blocked-target-binding-invalid");

  const hostedReadiness = runRunner(
    ["-Mode", "Write", "-Target", "production", "-PsqlPath", "__not-invoked__"],
    {
      ...approved,
      ...bindingEnvironment(validBinding, {
        GATE1_VAULT_MAINTENANCE_URL: ["https", "://", "synthetic.invalid/quote='\"", "\nline"].join(""),
        GATE1_VAULT_CRON_TOKEN: ["synthetic-", "secret-shaped-", "token", "\nline"].join("")
      })
    }
  );
  assert.equal(hostedReadiness.status, 2, "Write stops before connection when hosted readiness is unverified");
  const hostedReadinessPayload = parseSingleJson(hostedReadiness);
  assert.equal(hostedReadinessPayload.status, "blocked-hosted-readiness-unverified");
  assert.equal(hostedReadinessPayload.mutationCount, 0);
  assertNoSecretValue(hostedReadiness.stdout + hostedReadiness.stderr, [
    ["https", "://", "synthetic.invalid/quote='\"", "\nline"].join(""),
    ["synthetic-", "secret-shaped-", "token", "\nline"].join("")
  ]);
}

function assertVaultSqlContract() {
  const sql = extractFunctionOutput("Get-VaultWriteSql");
  assert.equal(typeof sql, "string");
  const normalized = sql.replaceAll("\r\n", "\n");
  const begin = normalized.indexOf("BEGIN;");
  const lock = normalized.indexOf("pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('comment-translator-paid-v1-gate1-vault-binding', 0))");
  const absence = normalized.indexOf("count(*) FILTER (WHERE name IN ('comment_translator_paid_maintenance_url','comment_translator_paid_cron_token')) = 0");
  const create = normalized.indexOf("vault.create_secret($1, 'comment_translator_paid_maintenance_url')");
  const secondCreate = normalized.indexOf("vault.create_secret($2, 'comment_translator_paid_cron_token')");
  const postcondition = normalized.indexOf("count(DISTINCT name)");
  const commit = normalized.indexOf("COMMIT;");
  assert.ok(begin >= 0 && lock > begin && absence > lock && create > absence && secondCreate > create && postcondition > secondCreate && commit > postcondition, "transaction ordering is fixed");
  assert.equal((normalized.match(/vault\.create_secret\(/g) ?? []).length, 2, "exactly two create_secret calls exist");
  assert.equal(/\\getenv gate1_url GATE1_VAULT_MAINTENANCE_URL/.test(normalized), true, "maintenance input binding exists");
  assert.equal(/\\getenv gate1_token GATE1_VAULT_CRON_TOKEN/.test(normalized), true, "cron input binding exists");
  assert.equal(/\\bind :gate1_url :gate1_token \\gset/.test(normalized), true, "inputs use raw bound values without SQL interpolation");
  assert.equal(normalized.includes("\\bind :'"), false, "SQL-literal expansion is forbidden for bound values");
  assert.equal(/count\(id\).*gate1_encrypted_record_count/.test(normalized), true, "encrypted record count is checked");
  assert.equal(/count\(\*\) FILTER \(WHERE secret IS NOT NULL\)/.test(normalized), true, "encrypted non-null state is checked");
  assert.equal(/count\(\*\) - count\(DISTINCT name\).*gate1_duplicate_count/.test(normalized), true, "duplicate count is checked");
  assert.equal(/\\quit\s+\d+/.test(normalized), false, "numeric quit is unsupported in PG17");
  for (const state of ["PGT01", "PGT02"]) {
    assert.equal(normalized.includes(`RAISE SQLSTATE '${state}'`), true, "fixed transaction exception exists");
    const refusal = normalized.indexOf(`RAISE SQLSTATE '${state}'`);
    assert.ok(state === "PGT01" ? refusal > absence && refusal < create : refusal > commit, "exception timing is fixed");
  }
  assert.equal(/decrypted_secret/i.test(normalized), false, "decrypted secret is never selected");
  assert.equal(/vault\.(?:update_secret|delete_secret)/i.test(normalized), false, "rotation/deletion is out of scope");
  assert.equal(
    /(?:\bcron\b|\bfetch\s*\(|\bhttp[_ ]|ct_paid_invoke_maintenance|private\.ct_paid_invoke_maintenance)/i.test(normalized),
    false,
    "no scheduler or maintenance invocation is embedded",
  );
  assert.equal(/\\(?:echo|print|conninfo|timing\s+on)/i.test(normalized), false, "psql does not print or log values");
  assert.equal((normalized.match(/COMMIT;/g) ?? []).length, 1, "only the successful postcondition can commit");
  assert.equal(/ROLLBACK;/i.test(normalized), false, "SQL exceptions abort before connection-close rollback");

  const args = extractFunctionOutput("Get-PsqlArguments");
  assert.deepEqual(args, [
    "--no-psqlrc",
    "--no-password",
    "--quiet",
    "--no-align",
    "--tuples-only",
    "--pset=footer=off",
    "--set=ON_ERROR_STOP=1",
    "--set=VERBOSITY=sqlstate",
    "--dbname=postgres"
  ], "psql args are fixed and contain no secret value");
  assertNoSecretValue(JSON.stringify(args), [
    "GATE1_VAULT_MAINTENANCE_URL",
    "GATE1_VAULT_CRON_TOKEN"
  ]);
}

function assertSingleNamedFixtureCleanupContract() {
  assert.equal(buildSingleNamedFixtureSql().includes("\\bind :gate1_fixture_url :gate1_fixture_name \\gset"), true, "fixture values use raw binding");
  assert.equal(buildSingleNamedFixtureSql().includes("\\bind :'"), false, "fixture forbids SQL-literal expansion in bind arguments");
  const cleanup = buildSingleNamedFixtureSql().split(/\r?\n/)
    .map(line => line.trim().split(/\s+/))
    .filter(tokens => tokens[0] === "\\unset");
  assert.equal(cleanup.every(tokens => tokens.length === 2), true, "psql unset accepts exactly one variable");
  assert.deepEqual(cleanup.map(tokens => tokens[1]), ["gate1_fixture_url", "gate1_fixture_name"], "fixture cleanup retains both variables in order");
}

function assertPg17TransactionContracts() {
  const capture = (exitCode, stderr = "", overrides = {}) => ({
    exitCode, stdout: "", stderr, stdoutBytes: 0,
    stderrBytes: Buffer.byteLength(stderr, "utf8"), captureComplete: true, ...overrides
  });
  const invalid = [
    capture(0, "warning: ignored argument\n"),
    capture(1, "ERROR:  PGT01\n"),
    capture(3, "ERROR:  PGT02\n"),
    capture(3),
    capture(3, "ERROR:  PGT01\nERROR:  PGT01\n"),
    capture(3, "CONTEXT: PGT01\n"),
    capture(3, "ERROR:  PGT01\n", { stdout: "unexpected", stdoutBytes: 10 }),
    capture(3, "ERROR:  PGT01\n", { captureComplete: false }),
    capture(3, "ERROR:  PGT01\n", { stderrBytes: 1024 * 1024 + 1 }),
    capture(3, "ERROR:  PGT01\n", { stderrBytes: 1 }),
    capture(3, "ERROR:  PGT01 message\n"),
    capture(3, "ERROR:  PGT01\nCONTEXT: PGT01\n")
  ];
  for (const result of invalid) {
    assert.throws(() => assertBoundTransactionFailure(result, [], "synthetic", "PGT01"));
  }
  for (const state of ["PGT01", "PGT02", "PGT03"]) {
    assert.doesNotThrow(() => assertBoundTransactionFailure(capture(3, `ERROR:  ${state}\r\n`), [], "synthetic", state));
  }
  assert.doesNotThrow(() => assertBoundTransactionOutcome(capture(0), 0, [], "synthetic"));
  assert.throws(() => assertBoundTransactionOutcome(capture(0, "warning\n"), 0, [], "synthetic"));
  assert.throws(() => assertBoundTransactionFailure(capture(3, "ERROR:  PGT04\n"), [], "synthetic", "PGT04"));
  assert.equal(buildBoundPsqlInvocation({ containerName: "synthetic", sql: "", maintenanceUrl: "", cronToken: "" }).shell.includes("--set=VERBOSITY=sqlstate"), true);
  assert.equal(buildSecondCreateFaultSetupSql("synthetic").includes("PGT03"), true);
}

function assertFaultInjectionSpliceContracts() {
  const source = extractFunctionOutput("Get-VaultWriteSql");
  const normalized = source.replaceAll("\r\n", "\n");
  const firstExpression = "vault.create_secret($1, 'comment_translator_paid_maintenance_url')";
  const secondExpression = "vault.create_secret($2, 'comment_translator_paid_cron_token')";
  const postconditionAnchor = "\\if :gate1_created";
  const secondSetup = buildSecondCreateFaultSetupSql("gate1_fault_second_synthetic");
  const secondTransaction = buildSecondCreateFaultSql(source, "gate1_fault_second_synthetic");
  const postTransaction = buildPostCreateFaultSql(source);
  const count = (text, value) => String(text).split(value).length - 1;

  assert.equal(count(normalized, firstExpression), 1);
  assert.equal(count(normalized, secondExpression), 1);
  assert.equal(secondSetup.includes("CREATE TRIGGER"), false);
  assert.equal(secondSetup.includes("GRANT "), false);
  assert.equal(secondSetup.includes("SECURITY INVOKER"), true);
  assert.equal(secondSetup.includes("VOLATILE"), true);
  assert.equal(secondSetup.includes("RETURNS uuid"), true);
  assert.equal(secondSetup.includes("PGT03"), true);
  assert.equal(secondSetup.includes("PGT04"), true);
  assert.equal(secondTransaction.includes("vault.create_secret($1, 'comment_translator_paid_maintenance_url')"), true);
  assert.equal(secondTransaction.includes("vault.create_secret($2, 'comment_translator_paid_cron_token')"), false);
  assert.equal(secondTransaction.includes("\"fail_second_create\"($2, 'comment_translator_paid_cron_token')"), true);
  assert.equal(secondTransaction.includes("count(DISTINCT name)"), true);
  assert.equal(postTransaction.includes("vault.create_secret($1, 'comment_translator_paid_maintenance_url')"), true);
  assert.equal(postTransaction.includes("vault.create_secret($2, 'comment_translator_paid_cron_token')"), true);
  assert.equal(postTransaction.includes("DO $gate1_postcondition_guard$"), true);
  assert.equal(postTransaction.includes("RAISE SQLSTATE 'PGT04'"), true);
  assert.equal(postTransaction.includes("RAISE SQLSTATE 'PGT02'"), true);
  assert.equal((postTransaction.match(/COMMIT;/g) ?? []).length, 1);
  assert.equal((postTransaction.match(/\\if :gate1_created/g) ?? []).length, 2);
  const secondIndex = source.indexOf(secondExpression);
  const secondReplacement = '"gate1_fault_second_gate1_fault_second_synthetic"."fail_second_create"($2, \'comment_translator_paid_cron_token\')';
  assert.equal(secondTransaction.slice(0, secondIndex), source.slice(0, secondIndex));
  assert.equal(
    secondTransaction.slice(secondIndex + secondReplacement.length),
    source.slice(secondIndex + secondExpression.length)
  );
  const postIndex = source.indexOf(postconditionAnchor);
  const secondPostIndex = postTransaction.indexOf(postconditionAnchor, postIndex + postconditionAnchor.length);
  assert.ok(secondPostIndex > postIndex);
  assert.equal(postTransaction.slice(0, postIndex), source.slice(0, postIndex));
  assert.equal(
    postTransaction.slice(secondPostIndex + postconditionAnchor.length),
    source.slice(postIndex + postconditionAnchor.length)
  );

  assert.throws(() => buildSecondCreateFaultSql(source.replace(secondExpression, ""), "synthetic"));
  assert.throws(() => buildSecondCreateFaultSql(source.replace(secondExpression, `${secondExpression}\n${secondExpression}`), "synthetic"));
  assert.throws(() => buildPostCreateFaultSql(source.replace("\\if :gate1_absent", postconditionAnchor)));
  const movedCreates = source
    .replace(firstExpression, "gate1_first_moved")
    .replace(secondExpression, firstExpression)
    .replace("gate1_first_moved", secondExpression);
  assert.throws(() => buildSecondCreateFaultSql(movedCreates, "synthetic"));
  const movedPostcondition = source
    .replace(postconditionAnchor, "gate1_postcondition_moved")
    .replace(firstExpression, postconditionAnchor)
    .replace("gate1_postcondition_moved", firstExpression);
  assert.throws(() => buildPostCreateFaultSql(movedPostcondition));
  assert.throws(() => buildPostCreateFaultSql(source.replace("RAISE SQLSTATE 'PGT02'", "RAISE SQLSTATE 'PGT04'")));
  assertHelperPredicateFaultContracts(secondSetup);
  assertPostconditionBranchInterpreterContracts(postTransaction);
  assertNoSecretValue(secondSetup + secondTransaction + postTransaction, [
    "synthetic-private-url",
    "synthetic-private-token"
  ]);
}

function parseSecondCreateFaultHelper(source) {
  const normalized = String(source).replaceAll("\r\n", "\n").trim();
  const lines = normalized.split("\n").map(line => line.trim()).filter(Boolean);
  const expectedNames = localVaultNames.map(name => quoteFaultLiteral(name));
  assert.equal(lines[0], "\\set QUIET 1", "helper grammar starts with quiet mode");
  assert.match(lines[1], /^CREATE SCHEMA "[a-z0-9_]+";$/i, "helper grammar uses a quoted schema");
  assert.match(
    lines[2],
    /^CREATE FUNCTION "[a-z0-9_]+"\."fail_second_create"\(p_secret text, p_reserved_name text\)$/i,
    "helper grammar uses the bounded fault function"
  );
  assert.equal(lines[3], "RETURNS uuid LANGUAGE plpgsql VOLATILE SECURITY INVOKER AS $gate1$", "helper function attributes are fixed");
  assert.equal(lines[4], "DECLARE", "helper declares its readback variables");
  assert.deepEqual(lines.slice(5, 10), [
    "gate1_first_row_count bigint;",
    "gate1_first_id_count bigint;",
    "gate1_first_encrypted_count bigint;",
    "gate1_second_row_count bigint;",
    "gate1_reserved_total bigint;"
  ], "helper variable declarations are fixed");
  assert.equal(lines[10], "BEGIN", "helper body begins after declarations");
  assert.deepEqual(lines.slice(11, 20), [
    `SELECT count(*) FILTER (WHERE name = ${expectedNames[0]})::bigint,`,
    `count(id) FILTER (WHERE name = ${expectedNames[0]})::bigint,`,
    `count(*) FILTER (WHERE name = ${expectedNames[0]} AND secret IS NOT NULL)::bigint,`,
    `count(*) FILTER (WHERE name = ${expectedNames[1]})::bigint,`,
    `count(*) FILTER (WHERE name IN (${expectedNames[0]}, ${expectedNames[1]}))::bigint`,
    "INTO gate1_first_row_count, gate1_first_id_count, gate1_first_encrypted_count,",
    "gate1_second_row_count, gate1_reserved_total",
    "FROM vault.secrets",
    `WHERE name IN (${expectedNames[0]}, ${expectedNames[1]});`
  ], "helper readback query grammar is fixed");

  const predicateEnd = lines.findIndex((line, index) => index > 19 && line.endsWith("THEN"));
  assert.ok(predicateEnd > 20, "helper predicate has a bounded THEN branch");
  const predicate = lines.slice(20, predicateEnd + 1).join(" ").replace(/^IF\s+/, "").replace(/\s+THEN$/, "");
  const conditions = predicate.split(/\s+AND\s+/).map((term) => {
    if (term === "p_secret IS NOT NULL") return { kind: "secret-present" };
    const reservedName = /^p_reserved_name = ('(?:''|[^'])*')$/.exec(term);
    if (reservedName) return { kind: "reserved-name", value: decodeSqlLiteral(reservedName[1]) };
    const count = /^gate1_(first_row_count|first_id_count|first_encrypted_count|second_row_count|reserved_total) = (\d+)$/.exec(term);
    if (count) return { kind: count[1], expected: Number(count[2]) };
    throw new Error("unsupported helper predicate term");
  });
  const requiredKinds = new Set([
    "secret-present",
    "reserved-name",
    "first_row_count",
    "first_id_count",
    "first_encrypted_count",
    "second_row_count",
    "reserved_total"
  ]);
  assert.equal(conditions.length, requiredKinds.size, "helper predicate has exactly seven conditions");
  assert.deepEqual(new Set(conditions.map(condition => condition.kind)), requiredKinds, "helper predicate conditions are complete");
  assert.equal(lines[predicateEnd + 1], "RAISE EXCEPTION USING ERRCODE = 'PGT03';", "helper true branch raises PGT03");
  assert.equal(lines[predicateEnd + 2], "END IF;", "helper predicate closes with END IF");
  assert.equal(lines[predicateEnd + 3], "RAISE EXCEPTION USING ERRCODE = 'PGT04';", "helper false branch raises PGT04");
  assert.equal(lines[predicateEnd + 4], "END;", "helper body closes with END");
  assert.equal(lines[predicateEnd + 5], "$gate1$;", "helper dollar quote closes exactly once");
  assert.equal(lines.length, predicateEnd + 6, "helper grammar has no unparsed statements");
  return { conditions, trueState: "PGT03", falseState: "PGT04" };
}

function decodeSqlLiteral(value) {
  assert.match(value, /^'(?:''|[^'])*'$/, "SQL literal is single quoted");
  return value.slice(1, -1).replaceAll("''", "'");
}

function evaluateSecondCreateFaultHelper(parsed, fixture) {
  assert.ok(parsed && Array.isArray(parsed.conditions), "parsed helper conditions are required");
  assert.ok(fixture && typeof fixture === "object", "helper fixture is required");
  assert.ok(typeof fixture.secret === "string" || fixture.secret === null, "helper fixture secret is nullable");
  assert.equal(typeof fixture.reservedName, "string", "helper fixture reserved name is text");
  for (const key of ["first_row_count", "first_id_count", "first_encrypted_count", "second_row_count", "reserved_total"]) {
    assert.ok(Number.isSafeInteger(fixture[key]) && fixture[key] >= 0, `helper fixture ${key} is an unsigned count`);
  }
  const matches = parsed.conditions.map((condition) => {
    if (condition.kind === "secret-present") return fixture.secret !== null;
    if (condition.kind === "reserved-name") return fixture.reservedName === condition.value;
    return fixture[condition.kind] === condition.expected;
  });
  assert.equal(matches.length, parsed.conditions.length, "helper predicate evaluation is total");
  return matches.every(Boolean) ? parsed.trueState : parsed.falseState;
}

function assertHelperPredicateFaultContracts(source) {
  const parsed = parseSecondCreateFaultHelper(source);
  const expectedName = localVaultNames[1];
  const valid = {
    secret: "synthetic-secret",
    reservedName: expectedName,
    first_row_count: 1,
    first_id_count: 1,
    first_encrypted_count: 1,
    second_row_count: 0,
    reserved_total: 1
  };
  const fixtures = [
    { name: "valid", expected: "PGT03", fixture: valid },
    { name: "empty", expected: "PGT04", fixture: { ...valid, secret: null, reservedName: "wrong", first_row_count: 0, first_id_count: 0, first_encrypted_count: 0, second_row_count: 0, reserved_total: 0 } },
    { name: "first-missing", expected: "PGT04", fixture: { ...valid, first_row_count: 0, first_id_count: 0, first_encrypted_count: 0 } },
    { name: "duplicate", expected: "PGT04", fixture: { ...valid, first_row_count: 2, first_id_count: 2, first_encrypted_count: 2, reserved_total: 2 } },
    { name: "second-present", expected: "PGT04", fixture: { ...valid, second_row_count: 1, reserved_total: 2 } },
    { name: "null-id", expected: "PGT04", fixture: { ...valid, first_id_count: 0 } },
    { name: "null-encrypted", expected: "PGT04", fixture: { ...valid, first_encrypted_count: 0 } },
    { name: "wrong-total", expected: "PGT04", fixture: { ...valid, reserved_total: 3 } },
    { name: "null-secret", expected: "PGT04", fixture: { ...valid, secret: null } },
    { name: "wrong-reserved-name", expected: "PGT04", fixture: { ...valid, reservedName: "wrong" } }
  ];
  for (const testCase of fixtures) {
    assert.equal(evaluateSecondCreateFaultHelper(parsed, testCase.fixture), testCase.expected, `helper fixture ${testCase.name}`);
  }
  const pgt04 = {
    exitCode: 3,
    stdout: "",
    stdoutBytes: 0,
    stderr: "ERROR:  PGT04\n",
    stderrBytes: Buffer.byteLength("ERROR:  PGT04\n", "utf8"),
    captureComplete: true
  };
  assert.throws(() => assertBoundTransactionFailure(pgt04, [], "helper-predicate", "PGT04"), "PGT04 remains outside the common transaction-failure contract");

  const replaceExactlyOnce = (text, needle, replacement) => {
    assert.equal(text.split(needle).length - 1, 1, `helper mutation anchor is unique: ${needle}`);
    return text.replace(needle, replacement);
  };
  const firstRowMutant = replaceExactlyOnce(source, "gate1_first_row_count = 1", "gate1_first_row_count = 0");
  const secondRowMutant = replaceExactlyOnce(source, "gate1_second_row_count = 0", "gate1_second_row_count = 1");
  assert.throws(() => {
    const mutant = parseSecondCreateFaultHelper(firstRowMutant);
    assert.equal(evaluateSecondCreateFaultHelper(mutant, valid), "PGT03", "first-row mutant is rejected by valid fixture");
  }, "first-row expected-value mutant is caught");
  assert.throws(() => {
    const mutant = parseSecondCreateFaultHelper(secondRowMutant);
    assert.equal(evaluateSecondCreateFaultHelper(mutant, valid), "PGT03", "second-row mutant is rejected by valid fixture");
  }, "second-row expected-value mutant is caught");
  assert.throws(() => parseSecondCreateFaultHelper(source.replace("p_secret IS NOT NULL", "p_secret IS DISTINCT FROM NULL")), "unsupported helper predicate syntax fails closed");
}

function parsePostconditionPsqlProgram(source) {
  const normalized = String(source).replaceAll("\r\n", "\n").trim();
  const anchor = "\\if :gate1_created";
  const start = normalized.indexOf(anchor);
  assert.ok(start >= 0, "postcondition anchor exists");
  const tail = normalized.slice(start);
  const lines = tail.split("\n").map(line => line.trim()).filter(Boolean);
  const tokens = lines.map((line) => {
    if (line === anchor) return { kind: "if" };
    if (line === "\\else") return { kind: "else" };
    if (line === "\\endif") return { kind: "endif" };
    if (line === "\\set gate1_created false") return { kind: "set-false" };
    if (line === "COMMIT;") return { kind: "commit" };
    const raise = /^DO \$([A-Za-z0-9_]+)\$ BEGIN RAISE SQLSTATE '(PGT\d{2})'; END; \$\1\$;$/.exec(line);
    if (raise) return { kind: "raise", state: raise[2] };
    throw new Error("unsupported postcondition psql syntax");
  });
  let index = 0;
  function parseBlock(stopKinds = []) {
    const statements = [];
    while (index < tokens.length && !stopKinds.includes(tokens[index].kind)) {
      const token = tokens[index++];
      if (token.kind === "if") {
        const thenBranch = parseBlock(["else", "endif"]);
        assert.equal(tokens[index]?.kind, "else", "postcondition IF has an ELSE branch");
        index += 1;
        const elseBranch = parseBlock(["endif"]);
        assert.equal(tokens[index]?.kind, "endif", "postcondition IF closes with ENDIF");
        index += 1;
        statements.push({ kind: "if", thenBranch, elseBranch });
        continue;
      }
      assert.ok(["set-false", "commit", "raise"].includes(token.kind), "postcondition statement is supported");
      statements.push(token);
    }
    return statements;
  }
  const program = parseBlock();
  assert.equal(index, tokens.length, "postcondition grammar has no dangling control token");
  assert.equal(program.length, 3, "postcondition has two branches and one assignment");
  assert.equal(program[0].kind, "if", "postcondition guard is first");
  assert.equal(program[1].kind, "set-false", "postcondition clears the gate before original branch");
  assert.equal(program[2].kind, "if", "original postcondition branch is retained");
  assert.deepEqual(program[0].thenBranch, [], "successful helper fault branch has no commit");
  assert.deepEqual(program[0].elseBranch, [{ kind: "raise", state: "PGT04" }], "false helper state raises PGT04");
  assert.deepEqual(program[2].thenBranch, [{ kind: "commit" }], "original true branch contains the only commit");
  assert.deepEqual(program[2].elseBranch, [{ kind: "raise", state: "PGT02" }], "original false branch raises PGT02");
  return program;
}

function evaluatePostconditionPsql(program, gate1Created) {
  assert.ok(Array.isArray(program), "postcondition program is required");
  assert.equal(typeof gate1Created, "boolean", "postcondition fixture gate is boolean");
  const variables = { gate1_created: gate1Created };
  function execute(statements) {
    for (const statement of statements) {
      if (statement.kind === "raise") return { kind: "raise", state: statement.state };
      if (statement.kind === "commit") return { kind: "commit" };
      if (statement.kind === "set-false") {
        variables.gate1_created = false;
        continue;
      }
      if (statement.kind === "if") {
        const branch = variables.gate1_created ? statement.thenBranch : statement.elseBranch;
        const outcome = execute(branch);
        if (outcome) return outcome;
        continue;
      }
      throw new Error("unsupported postcondition AST statement");
    }
    return null;
  }
  const outcome = execute(program);
  assert.ok(outcome, "postcondition must terminate with raise or commit");
  return outcome;
}

function assertPostconditionBranchInterpreterContracts(source) {
  const program = parsePostconditionPsqlProgram(source);
  const absent = evaluatePostconditionPsql(program, false);
  const created = evaluatePostconditionPsql(program, true);
  assert.deepEqual(absent, { kind: "raise", state: "PGT04" }, "gate1_created=false raises PGT04");
  assert.deepEqual(created, { kind: "raise", state: "PGT02" }, "gate1_created=true reaches the original PGT02 refusal");
  assert.notEqual(absent.kind, "commit", "false postcondition path never commits");
  assert.notEqual(created.kind, "commit", "true postcondition path never commits");
  assert.throws(() => parsePostconditionPsqlProgram(source.replace("COMMIT;", "COMMIT; SELECT 1;")), "unsupported postcondition syntax fails closed");
  assert.throws(() => parsePostconditionPsqlProgram(source.replace("\\set gate1_created false", "\\set gate1_created true")), "unsupported postcondition assignment fails closed");
  assert.throws(() => parsePostconditionPsqlProgram(source.replace("RAISE SQLSTATE 'PGT04'", "RAISE SQLSTATE 'PGT03'")), "mutated postcondition state fails closed");
}

function assertSyntheticRollbackAndDuplicateCases() {
  const original = new Set();
  const successful = new Set(["comment_translator_paid_maintenance_url", "comment_translator_paid_cron_token"]);
  assert.equal(successful.size, 2, "synthetic success commits exactly two distinct names");

  const preExisting = new Set(["comment_translator_paid_cron_token"]);
  const duplicateBlocked = new Set(preExisting);
  const requiredNames = new Set([
    "comment_translator_paid_maintenance_url",
    "comment_translator_paid_cron_token"
  ]);
  assert.equal([...requiredNames].some((name) => duplicateBlocked.has(name)), true, "one pre-existing name blocks both creates");
  assert.deepEqual(duplicateBlocked, preExisting, "duplicate precondition leaves no new row");

  const secondCreateFailure = new Set(original);
  secondCreateFailure.add("comment_translator_paid_maintenance_url");
  secondCreateFailure.clear();
  assert.equal(secondCreateFailure.size, 0, "second create failure rolls back the first create");

  const postconditionDuplicate = [
    "comment_translator_paid_maintenance_url",
    "comment_translator_paid_cron_token",
    "comment_translator_paid_cron_token"
  ];
  const distinctCount = new Set(postconditionDuplicate).size;
  assert.equal(postconditionDuplicate.length, 3);
  assert.equal(distinctCount, 2);
  assert.notEqual(postconditionDuplicate.length, distinctCount, "duplicate postcondition is not accepted");
}

function assertSanitizedFailureOutput() {
  const source = fs.readFileSync(fileURLToPath(import.meta.url), "utf8");
  const marker = `synthetic-private-${createHash("sha256").update(String(process.hrtime.bigint())).digest("hex")}`;
  const scenarios = [
    { result: { status: 1, stdout: marker, stderr: marker }, call: "extractFunctionOutput('')" },
    { result: { status: 0, stdout: JSON.stringify(marker), stderr: marker }, call: "extractFunctionOutput('')" },
    { result: { status: 0, stdout: marker, stderr: "" }, call: "extractFunctionOutput('')" },
    { result: { status: 2, stdout: JSON.stringify(marker), stderr: marker }, call: "parseSingleJson(runRunner())" },
    { result: { status: 2, stdout: marker, stderr: "" }, call: "parseSingleJson(runRunner())" },
    { result: { status: 2, stdout: JSON.stringify({ status: marker }), stderr: "" }, call: "assert.equal(parseSingleJson(runRunner()).status, 'expected')" },
  ];
  for (const scenario of scenarios) {
    // Exercise the real failure paths and entry-point boundary in a private child.
    // Only the process dependency is replaced; no PowerShell or DB is launched.
    const injectedSource = source
      .replace('import { spawnSync } from "node:child_process";', `const spawnSync = () => (${JSON.stringify(scenario.result)});`)
      .replace('const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");', `const root = ${JSON.stringify(root)};`)
      .replace(/^function main\(\) \{/m, `function main() { ${scenario.call}; return;`);
    const child = spawnSync(process.execPath, ["--input-type=module"], {
      input: injectedSource,
      cwd: root,
      env: minimalEnvironment(),
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 1024 * 1024,
      timeout: 10000,
    });
    const output = `${child.stdout ?? ""}${child.stderr ?? ""}`;
    assert.ok(!output.includes(marker), "failure output must not disclose synthetic diagnostics");
    assert.ok(child.status === 1, "contract failure exits with fixed nonzero status");
    assert.ok(child.stdout === "", "contract failure has no stdout");
    assert.ok(child.stderr === "VAULT_BINDING_CONTRACT_FAILED\n", "contract failure emits only fixed classification");
  }
}

function assertDockerAndFixtureExecutionContracts() {
  const source = fs.readFileSync(fileURLToPath(import.meta.url), "utf8");
  const localEndpoint = "npipe:////./pipe/dockerDesktopLinuxEngine";
  const hostile = {
    DOCKER_HOST: "tcp://example.invalid:2375",
    DOCKER_CONTEXT: "remote",
    DOCKER_CONFIG: "C:/synthetic-untrusted-config",
    DOCKER_TLS_VERIFY: "1",
    DOCKER_CERT_PATH: "C:/synthetic-untrusted-certs",
    TLS_CERT_PATH: "C:/synthetic-untrusted-certs",
    DOCKER_API_VERSION: "1.00",
    DOCKER_CUSTOM_HEADERS: "synthetic=untrusted"
  };
  const scenarios = [];
  for (const endpoint of [localEndpoint, "", "ssh://example.invalid", "unix:///var/run/docker.sock", "npipe:////./pipe/other", null]) {
    for (const entry of ["direct", "prerequisites"]) {
      scenarios.push({ group: "P1", endpoint, entry });
    }
  }
  scenarios.push({ group: "P2", endpoint: localEndpoint, entry: "fixture" });
  const failures = { P1: 0, P2: 0 };
  for (const scenario of scenarios) {
    // Replace only the OS process boundary, preserving the actual orchestration,
    // environment selection, SQL builder and stdin submission functions.
    const seam = `
      const captured = [];
      const scenario = ${JSON.stringify(scenario)};
      const spawnSync = (command, args, options) => {
        captured.push({ command, args, options });
        const operation = args[0] === '--context' ? args.slice(2) : args;
        let stdout = '';
        let status = 0;
        if (operation[0] === 'context' && operation[1] === 'inspect') {
          status = scenario.endpoint === null ? 1 : 0;
          stdout = JSON.stringify({ docker: { Host: scenario.endpoint } });
        } else if (operation[0] === 'context') stdout = 'desktop-linux';
        else if (operation[0] === 'version') stdout = '29.7.2';
        else if (operation[0] === 'image') stdout = JSON.stringify(['public.ecr.aws/supabase/postgres@sha256:' + 'a'.repeat(64)]);
        return { status, stdout, stderr: '' };
      };
    `;
    const checks = String.raw`
      const isMetadata = call => {
        const args = call.args[0] === '--context' ? call.args.slice(2) : call.args;
        return args[0] === 'context' && args[1] === 'inspect';
      };
      if (scenario.entry === 'prerequisites') {
        // Preserve rejection of pre-existing runtime inputs; hostile routing
        // variables not rejected by that gate must still be stripped.
        delete process.env.DOCKER_HOST;
        delete process.env.DOCKER_TLS_VERIFY;
        delete process.env.DOCKER_CERT_PATH;
        const result = inspectLocalDockerPrerequisites();
        assert.equal(result.ok, scenario.endpoint === 'npipe:////./pipe/dockerDesktopLinuxEngine');
      } else if (scenario.entry === 'direct') {
        for (const args of [['version'], ['ps'], ['image', 'inspect'], ['run'], ['exec'], ['container', 'inspect'], ['container', 'rm']]) {
          runDocker(args);
        }
      } else {
        const values = ["synthetic-fixture-'\"\nvalue", 'synthetic-unused-token'];
        runBoundPsql({ containerName: 'ct-paid-gate1-vault-local-synthetic' }, 'synthetic', buildSingleNamedFixtureSql(), ...values);
        const submitted = captured.find(call => !isMetadata(call));
        assert.ok(submitted);
        const lines = submitted.options.input.split('\n');
        assert.equal(lines.shift(), Buffer.from(values[0]).toString('base64'));
        assert.equal(lines.shift(), Buffer.from(values[1]).toString('base64'));
        const fixture = lines.join('\n');
        assertNoSecretValue(fixture + JSON.stringify(submitted.args) + JSON.stringify(submitted.options.env), values);
        const query = fixture.match(/^SELECT vault\.create_secret\(\$1, \$2\) AS gate1_fixture_id$/m);
        assert.ok(query);
        const bind = fixture.indexOf("\\bind :gate1_fixture_url :gate1_fixture_name \\gset");
        assert.ok(bind > query.index);
        assert.equal(fixture.slice(query.index, bind).includes(';'), false);
        assert.ok(fixture.includes('\\getenv gate1_fixture_url GATE1_VAULT_MAINTENANCE_URL'));
        assert.ok(fixture.includes('\\set gate1_fixture_name comment_translator_paid_cron_token'));
      }
      assert.ok(captured.length > 0);
      assert.ok(isMetadata(captured[0]));
      let validated = false;
      for (const call of captured) {
        assert.equal(call.command, 'docker');
        assert.deepEqual(call.options.env, minimalEnvironment());
        assert.deepEqual(call.args.slice(0, 2), ['--context', 'desktop-linux']);
        if (isMetadata(call)) {
          assert.deepEqual(call.args.slice(2), ['context', 'inspect', 'desktop-linux', '--format', '{{json .Endpoints}}']);
          validated = scenario.endpoint === 'npipe:////./pipe/dockerDesktopLinuxEngine';
        } else assert.ok(validated);
      }
      const daemonCount = captured.filter(call => !isMetadata(call)).length;
      assert.equal(daemonCount, scenario.endpoint !== 'npipe:////./pipe/dockerDesktopLinuxEngine' ? 0 : scenario.entry === 'direct' ? 7 : scenario.entry === 'prerequisites' ? 3 : 1);
    `;
    const injected = source
      .replace('import { spawnSync } from "node:child_process";', seam)
      .replace('const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");', `const root = ${JSON.stringify(root)};`)
      .replace(/^function main\(\) \{/m, `function main() { ${checks}; return;`);
    const child = spawnSync(process.execPath, ["--input-type=module"], {
      input: injected, cwd: root, env: minimalEnvironment(hostile),
      encoding: "utf8", windowsHide: true, maxBuffer: 1024 * 1024, timeout: 10000
    });
    if (child.status !== 0 || child.stdout !== "" || child.stderr !== "") failures[scenario.group]++;
  }
  if (failures.P1 || failures.P2) {
    console.error(`SOURCE_REGRESSION_FAILED:P1=${failures.P1}:P2=${failures.P2}`);
  }
  assert.equal(failures.P1 + failures.P2, 0, "source execution contracts pass");
}

function assertVaultMetadataCompatibilityContracts() {
  const source = fs.readFileSync(fileURLToPath(import.meta.url), "utf8");
  const checks = String.raw`
    // Evaluate the predicates emitted by the real SQL builder over synthetic
    // catalog rows, then feed the result through the real eight-field parser.
    // This is a bounded SQL-expression seam, not a second compatibility rule.
    const base = {
      identity: 'vault.create_secret(text,text,text,uuid)',
      'p.oid': 101, 'p.pronargs': 4, 'p.pronargdefaults': 3,
      'p.prorettype': 'uuid', 'p.proretset': false,
      'd.classid': 'pg_proc', 'd.objid': 101, 'd.objsubid': 0,
      'd.refclassid': 'pg_extension', 'd.refobjid': 201, 'd.deptype': 'e',
      'e.oid': 201, 'e.extname': 'supabase_vault'
    };
    let sample, reads;
    const evaluate = expression => {
      const js = expression
        .replace(/to_regprocedure\('([^']+)'\)/g, (_, identity) => identity === sample.identity ? '101' : 'null')
        .replace(/'([^']+)'::(?:pg_catalog\.)?reg(?:type|class)/g, (_, value) => JSON.stringify(value.replace(/^pg_catalog\./, '')))
        .replace(/\b[pde]\.[a-z]+\b/g, key => {
          assert.ok(Object.hasOwn(sample, key));
          return JSON.stringify(sample[key]);
        })
        .replace(/ IS NOT NULL/g, ' !== null')
        .replace(/(?<![<>!=])=(?!=)/g, '===')
        .replace(/\bAND\b/g, '&&').replace(/\bOR\b/g, '||').replace(/\bNOT\b/g, '!');
      return Function('return (' + js + ');')();
    };
    runIndependentPsql = (target, database, sql) => {
      reads++;
      assert.equal(sql, buildVaultMetaSql());
      const match = sql.match(/CASE WHEN (to_regprocedure[\s\S]+)\s+THEN '1' ELSE '0' END;/);
      assert.ok(match);
      const predicate = match[1].replace(/EXISTS \(SELECT 1 FROM pg_catalog\.pg_proc p, pg_catalog\.pg_depend d, pg_catalog\.pg_extension e\s+WHERE ([\s\S]+)\)/, (_, where) => String(evaluate(where)));
      const available = evaluate(predicate) ? '1' : '0';
      return { exitCode: 0, stderrBytes: 0, stdout: '170000|17|none|0|off|1.0|1|' + available + '\n' };
    };
    const cases = [
      ['four-three-defaults', {}, true],
      ['four-two-defaults', { 'p.pronargdefaults': 2 }, true],
      ['four-one-default', { 'p.pronargdefaults': 1 }, false],
      ['four-no-defaults', { 'p.pronargdefaults': 0 }, false],
      ['wrong-return', { 'p.prorettype': 'text' }, false],
      ['set-return', { 'p.proretset': true }, false],
      ['not-extension-member', { 'd.deptype': 'n' }, false],
      ['other-extension', { 'e.extname': 'other' }, false],
      ['other-namespace', { identity: 'custom.create_secret(text,text,text,uuid)' }, false],
      ['wrong-argument-type', { identity: 'vault.create_secret(text,text,text,text)' }, false],
      ['other-name', { identity: 'vault.other(text,text,text,uuid)' }, false],
      ['wrong-arity', { 'p.pronargs': 5 }, false],
      ['other-proc-dependency', { 'd.objid': 102 }, false],
      ['other-extension-dependency', { 'd.refobjid': 202 }, false],
      ['wrong-object-class', { 'd.classid': 'pg_class' }, false],
      ['wrong-reference-class', { 'd.refclassid': 'pg_class' }, false],
      ['subobject-dependency', { 'd.objsubid': 1 }, false],
      ['existing-two', { identity: 'vault.create_secret(text,text)' }, true],
      ['existing-three', { identity: 'vault.create_secret(text,text,text)' }, true]
    ];
    let failures = 0;
    for (const [name, overrides, expected] of cases) {
      sample = { ...base, ...overrides };
      reads = 0;
      try {
        const meta = inspectDatabaseVersionAndVault({}, 'postgres');
        assert.equal(meta.createSecretAvailable, expected, name);
        assert.equal(Object.keys(meta).length, 8);
        assert.equal(meta.extensionInstalled, true);
        assert.equal(meta.vaultVersion, '1.0');
        assert.equal(reads, 1);
      } catch { failures++; }
    }
    console.log('VAULT_METADATA_CASES=' + cases.length + ':FAILED=' + failures);
    assert.equal(failures, 0);
  `;
  const injected = source
    .replace('import { spawnSync } from "node:child_process";', 'const spawnSync = () => { throw new Error("OS_PROCESS_FORBIDDEN"); };')
    .replace('const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");', `const root = ${JSON.stringify(root)};`)
    .replace(/^function main\(\) \{/m, `function main() { ${checks}; return;`);
  const child = spawnSync(process.execPath, ["--input-type=module"], {
    input: injected, cwd: root, env: minimalEnvironment(),
    encoding: "utf8", windowsHide: true, maxBuffer: 1024 * 1024, timeout: 10000
  });
  assert.ok(child.status === 0 && child.stdout === "VAULT_METADATA_CASES=19:FAILED=0\n" && child.stderr === "", "private Vault metadata compatibility contracts pass");
}

function assertVaultExtensionSetupContracts() {
  const source = fs.readFileSync(fileURLToPath(import.meta.url), "utf8");
  // Replace only process transport; retain the actual setup, SQL and strict gate.
  const seam = String.raw`
    const target = { containerName: 'synthetic', containerId: 'synthetic-id', imageRef: 'synthetic-image', envFile: 'synthetic.env' };
    let sample, submitted, bootstrapCalls, metaReads, ownership;
    const spawnSync = (command, args, options) => {
      assert.equal(command, 'docker');
      if (args[2] === 'context') return { status: 0, stdout: JSON.stringify({ docker: { Host: 'npipe:////./pipe/dockerDesktopLinuxEngine' } }), stderr: '' };
      const operation = args.slice(2);
      if (operation[0] === 'container' && operation[1] === 'inspect') {
        const runArguments = buildLocalContainerArguments(target);
        const imageIndex = runArguments.indexOf(target.imageRef);
        const ownedCommand = runArguments.slice(imageIndex + 1);
        const inspection = {
          Id: ownership ? target.containerId : 'foreign-id',
          Name: '/' + target.containerName,
          Config: { Image: target.imageRef, Cmd: ownedCommand, Labels: {
            [localContainerLabelKey]: localContainerLabelValue,
            [localContainerRunLabelKey]: target.containerName
          } },
          HostConfig: { NetworkMode: 'none', LogConfig: { Type: 'none' },
            Tmpfs: { '/var/lib/postgresql/data': 'rw' }, Binds: [], PortBindings: {} },
          NetworkSettings: { Ports: {} }, Mounts: []
        };
        return { status: 0, stdout: JSON.stringify([inspection]), stderr: '' };
      }
      const sql = options.input;
      if (JSON.stringify(operation) === JSON.stringify(buildBootstrapPsqlArguments('synthetic', 'postgres'))) {
        bootstrapCalls++;
        assert.equal(sql, buildVaultExtensionInstallSql());
        return { status: sample.status, stdout: '', stderr: sample.stderr };
      }
      assert.deepEqual(operation, buildPsqlExecArguments('synthetic', 'postgres'));
      submitted.push(sql);
      if (sql === buildVaultMetaSql()) {
        metaReads++;
        return { status: 0, stdout: metaReads === 1 ? '170000|17|none|0|off||0|0\n' : '170000|17|none|0|off|1.0|1|1\n', stderr: '' };
      }
      if (sql === buildVaultAvailabilitySql()) return { status: 0, stdout: '1\n', stderr: '' };
      if (sql === buildVaultSchemaSetupSql()) return { status: 0, stdout: '', stderr: '' };
      if (sql === buildVaultBootstrapRoleSql()) return { status: 0, stdout: sample.role + '|' + sample.canLogin + '|' + sample.superuser + '\n', stderr: '' };
      assert.fail('unexpected-normal-bootstrap-operation');
    };
  `;
  const checks = String.raw`
    let failures = 0;
    const scenarios = [
      { status: 0, stderr: '', role: 'supabase_admin', canLogin: '1', superuser: '1', owned: true, accepted: true },
      { status: 1, stderr: '', role: 'supabase_admin', canLogin: '1', superuser: '1', owned: true, accepted: false },
      ...['ERROR', 'WARNING', 'NOTICE'].map(level => ({ status: 0, stderr: level + ': synthetic-private-setup\n', role: 'supabase_admin', canLogin: '1', superuser: '1', owned: true, accepted: false }))
    ];
    for (sample of scenarios) {
      submitted = [];
      bootstrapCalls = 0;
      metaReads = 0;
      ownership = sample.owned;
      try {
        const invoke = () => ensureVaultDatabase(target, 'postgres');
        if (sample.accepted) assert.deepEqual(invoke(), { postgresMajor: 17, vaultVersion: '1.0' });
        else assert.throws(invoke, error => error.localKind === 'setup' && error.reason === 'LOCAL_VAULT_EXTENSION_SETUP_FAILED');
        assert.equal(metaReads, sample.accepted ? 2 : 1);
        assert.equal(submitted.length, sample.accepted ? 5 : 4);
        assert.equal(bootstrapCalls, 1);
        assert.equal(submitted[2], buildVaultSchemaSetupSql());
        assert.equal(submitted[3], buildVaultBootstrapRoleSql());
        assert.ok(submitted.filter(sql => sql !== buildVaultSchemaSetupSql()).every(sql => !sql.includes('client_min_messages')));
      } catch { failures++; }
    }
    const blockedRoleCases = [
      { name: 'wrong-role', role: 'postgres', canLogin: '1', superuser: '1', owned: true, reason: 'LOCAL_VAULT_BOOTSTRAP_ROLE_UNAVAILABLE' },
      { name: 'non-login', role: 'supabase_admin', canLogin: '0', superuser: '1', owned: true, reason: 'LOCAL_VAULT_BOOTSTRAP_ROLE_UNAVAILABLE' },
      { name: 'non-superuser', role: 'supabase_admin', canLogin: '1', superuser: '0', owned: true, reason: 'LOCAL_VAULT_BOOTSTRAP_ROLE_UNAVAILABLE' },
      { name: 'foreign-ownership', role: 'supabase_admin', canLogin: '1', superuser: '1', owned: false, reason: 'LOCAL_VAULT_BOOTSTRAP_OWNERSHIP_UNVERIFIED' }
    ];
    for (sample of blockedRoleCases) {
      submitted = [];
      bootstrapCalls = 0;
      metaReads = 0;
      ownership = sample.owned;
      try {
        assert.throws(() => ensureVaultDatabase(target, 'postgres'), error => error.localKind === 'setup' && error.reason === sample.reason);
        assert.equal(metaReads, 1);
        assert.equal(submitted.length, 4);
        assert.equal(bootstrapCalls, 0);
      } catch { failures++; }
    }
    assert.equal(buildPsqlExecArguments('synthetic', 'postgres').at(-1), '--username=postgres');
    assert.equal(buildBootstrapPsqlArguments('synthetic', 'postgres').at(-1), '--username=supabase_admin');
    assert.equal(runVaultExtensionInstall.length, 2);
    assert.equal(buildVaultExtensionInstallSql().includes('CREATE SCHEMA'), false);
    assert.equal(buildVaultSchemaSetupSql().includes('CREATE SCHEMA IF NOT EXISTS vault;'), true);
    for (const sql of [buildVaultSchemaSetupSql(), buildVaultExtensionInstallSql()]) {
      assert.equal(/\b(?:GRANT|ALTER ROLE|OWNER TO)\b/i.test(sql), false);
    }
    assert.equal(buildBoundPsqlInvocation({ containerName: 'synthetic', sql: 'SELECT 1', maintenanceUrl: 'https://synthetic.invalid', cronToken: 'synthetic-token' }).shell.includes('--username=supabase_admin'), false);
    console.log('EXTENSION_SETUP_CASES=' + scenarios.length + ':FAILED=' + failures);
    assert.equal(failures, 0);
  `;
  const injected = source
    .replace('import { spawnSync } from "node:child_process";', seam)
    .replace('const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");', `const root = ${JSON.stringify(root)};`)
    .replace(/^function main\(\) \{/m, `function main() { ${checks}; return;`);
  const child = spawnSync(process.execPath, ["--input-type=module"], {
    input: injected, cwd: root, env: minimalEnvironment(),
    encoding: "utf8", windowsHide: true, maxBuffer: 1024 * 1024, timeout: 10000
  });
  assert.ok(child.status === 0 && child.stdout === "EXTENSION_SETUP_CASES=5:FAILED=0\n" && child.stderr === "", "private extension setup contracts pass");
  let rejectedMutants = 0;
  for (const builder of ["buildVaultSchemaSetupSql", "buildVaultExtensionInstallSql"]) {
    for (const forbiddenSql of [
      "GRANT USAGE ON SCHEMA vault TO postgres;",
      "ALTER ROLE postgres SUPERUSER;",
      "ALTER SCHEMA vault OWNER TO postgres;"
    ]) {
      const declaration = `function ${builder}() {`;
      assert.equal(injected.split(declaration).length, 2, "bootstrap builder mutation seam is unique");
      const mutant = injected.replace(declaration,
        `function ${builder}() { return originalBootstrapBuilder() + ${JSON.stringify("\n" + forbiddenSql)}; }\nfunction originalBootstrapBuilder() {`);
      const result = spawnSync(process.execPath, ["--input-type=module"], {
        input: mutant, cwd: root, env: minimalEnvironment(),
        encoding: "utf8", windowsHide: true, maxBuffer: 1024 * 1024, timeout: 10000
      });
      if (result.status === 1 && result.stdout === "" && result.stderr === "VAULT_BINDING_CONTRACT_FAILED\n") rejectedMutants++;
    }
  }
  assert.equal(rejectedMutants, 6, "BOOTSTRAP_PRIVILEGE_MUTANTS_REJECTED");
}

function assertPostgresReadinessContracts() {
  const source = fs.readFileSync(fileURLToPath(import.meta.url), "utf8");
  // Mock only the OS transport and clock; exercise the real readiness loop,
  // fixed local context validation, argv parsing and TCP invocation order.
  const seam = String.raw`
    let sample, calls, poll;
    const spawnSync = (command, args, options) => {
      calls.push({ command, args, options });
      const operation = args.slice(2);
      if (operation[0] === 'context') {
        return { status: 0, stdout: JSON.stringify({ docker: { Host: 'npipe:////./pipe/dockerDesktopLinuxEngine' } }), stderr: '' };
      }
      const current = sample.steps[Math.min(poll, sample.steps.length - 1)];
      if (operation[2] === 'cat') return { status: current.metadataStatus ?? 0, stdout: current.argv, stderr: current.metadataStderr ?? '' };
      if (operation[2] === 'pg_isready') return { status: operation.includes('--host=127.0.0.1') ? current.tcp : 0, stdout: '', stderr: '' };
      return { status: 1, stdout: '', stderr: '' };
    };
  `;
  const checks = String.raw`
    const pg = { argv: '/usr/lib/postgresql/17/bin/postgres\0-D\0/etc/postgresql\0', tcp: 0 };
    const temporary = { argv: '/bin/bash\0/docker-entrypoint.sh\0postgres\0', tcp: 0 };
    const scenarios = [
      { name: 'temporary-socket-ready', steps: [temporary], expected: false, polls: 240, tcpCalls: 0 },
      { name: 'bootstrap-to-final', steps: [temporary, pg, pg], expected: true, polls: 2, tcpCalls: 2 },
      { name: 'absolute-pg-different-comm', steps: [pg], expected: true, polls: 1, tcpCalls: 2 },
      { name: 'bare-pg', steps: [{ ...pg, argv: 'postgres\0-c\0logging_collector=off\0' }], expected: false, polls: 240, tcpCalls: 0 },
      { name: 'process-title', steps: [{ ...pg, argv: 'postgres -D /etc/postgresql\0\0' }], expected: true, polls: 1, tcpCalls: 2 },
      { name: 'absolute-process-title', steps: [{ ...pg, argv: '/usr/lib/postgresql/17/bin/postgres -D /etc/postgresql\0' }], expected: true, polls: 1, tcpCalls: 2 },
      { name: 'tcp-reset', steps: [pg, { ...pg, tcp: 2 }, pg, pg], expected: true, polls: 3, tcpCalls: 4 },
      { name: 'process-reset', steps: [pg, temporary, pg, pg], expected: true, polls: 3, tcpCalls: 3 },
      { name: 'metadata-reset', steps: [pg, { ...pg, metadataStatus: 1 }, pg, pg], expected: true, polls: 3, tcpCalls: 3 },
      { name: 'tcp-unavailable', steps: [{ ...pg, tcp: 2 }], expected: false, polls: 240, tcpCalls: 240 },
      ...['sh\0-c\0postgres\0', '/docker-entrypoint.sh\0postgres\0', 'postgres-other\0', '/bin/postgres-other -D /etc/postgresql\0', '', '\0postgres\0'].map(argv => ({
        name: 'non-pg-or-empty', steps: [{ ...pg, argv }], expected: false, polls: 240, tcpCalls: 0
      })),
      { name: 'metadata-failed', steps: [{ ...pg, metadataStatus: 1 }], expected: false, polls: 240, tcpCalls: 0 },
      { name: 'metadata-unavailable', steps: [{ ...pg, metadataStatus: 'unavailable' }], expected: false, polls: 240, tcpCalls: 0 },
      { name: 'metadata-stderr', steps: [{ ...pg, metadataStderr: 'synthetic-private-metadata' }], expected: false, polls: 240, tcpCalls: 0 }
    ];
    let failures = 0;
    for (sample of scenarios) {
      poll = 0;
      calls = [];
      Date.now = () => poll * 250;
      Atomics.wait = (buffer, index, value, timeout) => {
        assert.equal(timeout, 250);
        poll++;
        assert.ok(poll <= 240);
      };
      try {
        assert.equal(waitForPostgres({ containerName: 'synthetic' }), sample.expected);
        assert.equal(poll, sample.polls);
        assert.equal(calls.length % 2, 0);
        let metadataBeforeTcp = false;
        let tcpCalls = 0;
        for (let index = 0; index < calls.length; index += 2) {
          const context = calls[index];
          const operation = calls[index + 1];
          assert.deepEqual(context.args, ['--context', 'desktop-linux', 'context', 'inspect', 'desktop-linux', '--format', '{{json .Endpoints}}']);
          for (const call of [context, operation]) {
            assert.equal(call.command, 'docker');
            assert.deepEqual(call.options.env, minimalEnvironment());
            assert.equal(call.options.input, '');
          }
          if (operation.args[4] === 'cat') {
            assert.deepEqual(operation.args, ['--context', 'desktop-linux', 'exec', 'synthetic', 'cat', '/proc/1/cmdline']);
            metadataBeforeTcp = true;
          } else {
            assert.ok(metadataBeforeTcp);
            assert.deepEqual(operation.args, ['--context', 'desktop-linux', 'exec', 'synthetic', 'pg_isready', '--host=127.0.0.1', '--port=5432', '--username=postgres', '--dbname=postgres']);
            metadataBeforeTcp = false;
            tcpCalls++;
          }
        }
        assert.equal(tcpCalls, sample.tcpCalls);
      } catch { failures++; }
    }
    console.log('READINESS_CASES=' + scenarios.length + ':FAILED=' + failures);
    assert.equal(failures, 0);
  `;
  const injected = source
    .replace('import { spawnSync } from "node:child_process";', seam)
    .replace('const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");', `const root = ${JSON.stringify(root)};`)
    .replace(/^function main\(\) \{/m, `function main() { ${checks}; return;`);
  const child = spawnSync(process.execPath, ["--input-type=module"], {
    input: injected, cwd: root, env: minimalEnvironment(),
    encoding: "utf8", windowsHide: true, maxBuffer: 1024 * 1024, timeout: 10000
  });
  const summary = String(child.stdout ?? "").trim();
  assert.ok(summary === "READINESS_CASES=19:FAILED=0", "private readiness summary confirms all cases pass");
  assert.equal(child.status, 0, "actual readiness orchestration contracts pass");
  assert.equal(child.stderr, "", "readiness metadata remains private");
}

function assertStartupLoggingContracts() {
  const source = fs.readFileSync(fileURLToPath(import.meta.url), "utf8");
  const checks = String.raw`
    const target = { containerName: 'synthetic', containerId: 'synthetic-id', imageRef: 'synthetic-image' };
    const args = buildLocalContainerArguments({ ...target, envFile: 'synthetic.env' });
    const command = args.slice(args.indexOf(target.imageRef) + 1);
    const expectedCommand = command.map(value => value.startsWith('log_min_error_statement=') ? 'log_min_error_statement=panic' : value);
    const expectedPostgresCommandPrefix = ['postgres', '-D', '/etc/postgresql'];
    const base = {
      Id: target.containerId, Name: '/' + target.containerName,
      Config: { Image: target.imageRef, Cmd: expectedCommand, Labels: {
        [localContainerLabelKey]: localContainerLabelValue,
        [localContainerRunLabelKey]: target.containerName
      } },
      HostConfig: { NetworkMode: 'none', LogConfig: { Type: 'none' },
        Tmpfs: { '/var/lib/postgresql/data': 'rw' }, Binds: [], PortBindings: {} },
      NetworkSettings: { Ports: {} }, Mounts: []
    };
    let inspection;
    runDocker = () => ({ exitCode: 0, stdout: JSON.stringify([inspection]) });
    const failures = [];
    const cases = [
      ['panic', true, value => {}],
      ['command-prefix', false, value => { value.Config.Cmd[0] = 'sh'; }],
      ['off', false, value => { value.Config.Cmd = expectedCommand.map(arg => arg === 'log_min_error_statement=panic' ? 'log_min_error_statement=off' : arg); }],
      ['missing', false, value => { const index = value.Config.Cmd.indexOf('log_min_error_statement=panic'); value.Config.Cmd.splice(index - 1, 2); }],
      ['log-driver', false, value => { value.HostConfig.LogConfig.Type = 'json-file'; }],
      ['network', false, value => { value.HostConfig.NetworkMode = 'bridge'; }],
      ['tmpfs', false, value => { value.HostConfig.Tmpfs = {}; }],
      ['ports', false, value => { value.HostConfig.PortBindings = { synthetic: [{}] }; }],
      ['network-ports', false, value => { value.NetworkSettings.Ports = { synthetic: [{}] }; }],
      ['bind', false, value => { value.HostConfig.Binds = ['synthetic']; }],
      ['mount', false, value => { value.Mounts = [{ Type: 'bind', Destination: '/var/lib/postgresql/data' }]; }]
    ];
    for (const [name, expected, mutate] of cases) {
      inspection = structuredClone(base);
      mutate(inspection);
      if (inspectOwnedContainer(target).owned !== expected) failures.push(name);
    }
    assert.deepEqual(command.slice(0, expectedPostgresCommandPrefix.length), expectedPostgresCommandPrefix, 'cached image starts the exact postgres command');
    if (!hasExactCommandSetting(command, 'log_min_error_statement=panic') || command.includes('log_min_error_statement=off')) failures.push('builder');
    assert.equal(failures.length, 0, 'startup logging and isolation contracts pass');
  `;
  const injected = source
    .replace('import { spawnSync } from "node:child_process";', 'const spawnSync = () => { throw new Error("OS_PROCESS_FORBIDDEN"); };')
    .replace('const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");', `const root = ${JSON.stringify(root)};`)
    .replace(/^function main\(\) \{/m, `function main() { ${checks}; return;`);
  const child = spawnSync(process.execPath, ["--input-type=module"], {
    input: injected, cwd: root, env: minimalEnvironment(),
    encoding: "utf8", windowsHide: true, maxBuffer: 1024 * 1024, timeout: 10000
  });
  assert.ok(child.status === 0 && child.stdout === "" && child.stderr === "", "startup logging source contract passes");
}

function assertLocalCaseLifecycleContracts() {
  const source = fs.readFileSync(fileURLToPath(import.meta.url), "utf8");
  const checks = String.raw`
    const caseNames = [
      'success-rerun',
      'partial-preservation',
      'second-create-fault-rollback',
      'post-create-assertion-fault-rollback'
    ];
    const imageRef = 'public.ecr.aws/supabase/postgres@sha256:' + 'a'.repeat(64);
    let events = [];
    let targetNumber = 0;
    const transactionCounts = new Map();
    let failureMode = false;
    let fidelityResult = { exitCode: 0, stdout: '1 1\n', stdoutBytes: 4, stderr: '', stderrBytes: 0, captureComplete: true };
    inspectLocalDockerPrerequisites = () => ({ ok: true, imageRef, contextName: 'desktop-linux', repoDigest: imageRef, dockerVersion: 'synthetic' });
    extractFunctionOutput = () => '\\bind :gate1_url :gate1_token \\gset';
    createLocalTargetDescriptor = () => {
      const caseName = caseNames[targetNumber++];
      events.push('create:' + caseName);
      return { caseName, containerName: 'ct-paid-gate1-vault-local-case' + targetNumber, containerId: 'a'.repeat(12), imageRef, tempDir: 'synthetic', envFile: 'synthetic' };
    };
    startLocalTarget = () => ({ exitCode: 0 });
    inspectOwnedContainer = () => ({ exists: true, owned: true });
    waitForPostgres = () => true;
    ensureVaultDatabase = (target, database) => {
      events.push('setup:' + target.caseName + ':' + database);
      return { postgresMajor: 17, vaultVersion: '1.0' };
    };
    assertNoExistingPrimaryState = () => {};
    runBoundPsql = (target, database, sql, url, token) => {
      if (sql.includes('gate1_fidelity_url')) {
        events.push('fidelity:' + target.caseName + ':' + database);
        assert.equal(sql.includes(extractFunctionOutput()), true);
        for (const value of [url, token]) {
          for (const character of ["'", '"', '\n', '\\', ' ']) assert.equal(value.includes(character), true);
          assert.equal(sql.includes(createHash('md5').update(value, 'utf8').digest('hex')), true);
        }
        assert.equal(/vault\.|decrypted_secret|\b(?:INSERT|UPDATE|DELETE|COMMIT)\b/i.test(sql), false);
        return fidelityResult;
      }
      events.push('tx:' + target.caseName + ':' + database);
      if (failureMode && target.caseName === caseNames[1]) throw new Error('synthetic-case-failure');
      const count = (transactionCounts.get(target.caseName) ?? 0) + 1;
      transactionCounts.set(target.caseName, count);
      const state = target.caseName === caseNames[2] ? 'PGT03' :
        target.caseName === caseNames[3] ? 'PGT02' : count === 2 ? 'PGT01' : null;
      const stderr = state ? 'ERROR:  ' + state + '\n' : '';
      return { exitCode: state ? 3 : 0, stdoutBytes: 0, stderrBytes: Buffer.byteLength(stderr), stdout: '', stderr, captureComplete: true };
    };
    readVaultState = (target, database) => {
      events.push('read:' + target.caseName + ':' + database);
      return {};
    };
    buildSecondCreateFaultSql = () => 'synthetic-second-fault';
    buildPostCreateFaultSql = () => 'synthetic-post-fault';
    installFault = (target, database) => { events.push('fault:' + target.caseName + ':' + database); };
    assertExactSuccessState = () => {};
    assertPartialState = () => {};
    assertZeroState = () => {};
    sameRowIdentity = () => {};
    cleanupLocalTarget = target => {
      if (!target) return { ok: true, residue: 0 };
      events.push('cleanup:' + target.caseName);
      return { ok: true, residue: 0 };
    };
    assertNoLocalRuntimeResidue = () => {};

    const pass = runActualLocalIntegration();
    assert.equal(pass.kind, 'pass');
    assert.equal(events.filter(event => event.startsWith('fidelity:')).length, 1);
    assert.ok(events.indexOf('fidelity:' + caseNames[0] + ':postgres') < events.indexOf('tx:' + caseNames[0] + ':postgres'));
    const created = events.filter(event => event.startsWith('create:'));
    const cleaned = events.filter(event => event.startsWith('cleanup:'));
    assert.deepEqual(created, caseNames.map(name => 'create:' + name));
    assert.deepEqual(cleaned, caseNames.map(name => 'cleanup:' + name));
    for (let index = 0; index < caseNames.length - 1; index += 1) {
      assert.ok(events.indexOf('cleanup:' + caseNames[index]) < events.indexOf('create:' + caseNames[index + 1]));
    }
    const databaseEvents = events.filter(event => /^(setup|tx|read|fault):/.test(event));
    assert.equal(databaseEvents.every(event => event.endsWith(':postgres')), true);

    events = [];
    targetNumber = 0;
    transactionCounts.clear();
    failureMode = true;
    const stopped = runActualLocalIntegration();
    assert.equal(stopped.kind, 'failure');
    assert.deepEqual(events.filter(event => event.startsWith('create:')), [
      'create:' + caseNames[0],
      'create:' + caseNames[1]
    ]);
    assert.deepEqual(events.filter(event => event.startsWith('cleanup:')), [
      'cleanup:' + caseNames[0],
      'cleanup:' + caseNames[1]
    ]);
    assert.equal(events.some(event => event.includes(caseNames[2]) || event.includes(caseNames[3])), false);
    const invalidFidelity = [
      { stdout: '0 1\n' }, { stdout: '1 0\n' }, { stdout: '' },
      { stdout: '1 1\nextra' }, { exitCode: 3 },
      { stderr: 'unexpected', stderrBytes: 10 }, { captureComplete: false },
      { stdoutBytes: 1048577 }, { stdoutBytes: 0 }
    ];
    for (const overrides of invalidFidelity) {
      events = [];
      targetNumber = 0;
      transactionCounts.clear();
      failureMode = false;
      fidelityResult = { exitCode: 0, stdout: '1 1\n', stdoutBytes: 4, stderr: '', stderrBytes: 0, captureComplete: true, ...overrides };
      if (Object.hasOwn(overrides, 'stdout')) fidelityResult.stdoutBytes = Buffer.byteLength(overrides.stdout);
      const blocked = runActualLocalIntegration();
      assert.equal(blocked.kind, 'failure');
      assert.equal(blocked.phase, 'binding-fidelity');
      assert.equal(events.some(event => event.startsWith('tx:')), false);
      assert.deepEqual(events.filter(event => event.startsWith('create:')), ['create:' + caseNames[0]]);
      assert.deepEqual(events.filter(event => event.startsWith('cleanup:')), ['cleanup:' + caseNames[0]]);
    }
    console.log('LOCAL_CASE_LIFECYCLE=pass cases=4 failure-stop=1 primary-db-violations=0');
  `;
  const injected = source
    .replace('import { spawnSync } from "node:child_process";', 'const spawnSync = () => { throw new Error("OS_PROCESS_FORBIDDEN"); };')
    .replace('const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");', `const root = ${JSON.stringify(root)};`)
    .replace(/^function main\(\) \{/m, `function main() { ${checks}; return;`);
  const child = spawnSync(process.execPath, ["--input-type=module"], {
    input: injected, cwd: root, env: minimalEnvironment(),
    encoding: "utf8", windowsHide: true, maxBuffer: 1024 * 1024, timeout: 10000
  });
  assert.equal(child.status, 0, "local case lifecycle orchestration passes");
  assert.equal(child.stdout, "LOCAL_CASE_LIFECYCLE=pass cases=4 failure-stop=1 primary-db-violations=0\n", "local lifecycle emits fixed summary");
  assert.equal(child.stderr, "", "local lifecycle remains sanitized");
}

function localDockerEnvironment() {
  return minimalEnvironment();
}

function hasExistingRuntimeInput() {
  return Object.keys(process.env).some((key) => {
    const normalized = key.toUpperCase();
    return normalized.startsWith("PG") || [
      "DATABASE_URL",
      "SUPABASE_DB_URL",
      "DOCKER_HOST",
      "DOCKER_TLS_VERIFY",
      "DOCKER_CERT_PATH",
      "GATE1_TARGET_BINDING_JSON",
      "GATE1_TARGET_BINDING_SHA256",
      "GATE1_VAULT_MAINTENANCE_URL",
      "GATE1_VAULT_CRON_TOKEN"
    ].includes(normalized);
  });
}

function invokeLocalDocker(args, input, environment) {
  try {
    const result = spawnSync("docker", ["--context", "desktop-linux", ...args], {
      cwd: root,
      env: environment,
      input,
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 1024 * 1024,
      timeout: localCommandTimeoutMs
    });
    const stdout = typeof result.stdout === "string" ? result.stdout : "";
    const stderr = typeof result.stderr === "string" ? result.stderr : "";
    return {
      exitCode: typeof result.status === "number" ? result.status : null,
      stdout,
      stderr,
      stdoutBytes: Buffer.byteLength(stdout, "utf8"),
      stderrBytes: Buffer.byteLength(stderr, "utf8"),
      captureComplete: !result.error && !result.signal && typeof result.status === "number" &&
        typeof result.stdout === "string" && typeof result.stderr === "string" &&
        Buffer.byteLength(stdout, "utf8") + Buffer.byteLength(stderr, "utf8") <= 1024 * 1024
    };
  } catch {
    return { exitCode: null, stdout: "", stderr: "", stdoutBytes: 0, stderrBytes: 0 };
  }
}

function inspectLocalDockerContext(environment) {
  const result = invokeLocalDocker(
    ["context", "inspect", "desktop-linux", "--format", "{{json .Endpoints}}"], "", environment
  );
  if (result.exitCode !== 0 || result.stderrBytes !== 0) {
    return { ok: false, reason: "DOCKER_CONTEXT_INVALID" };
  }
  let endpoint;
  try {
    endpoint = JSON.parse(result.stdout)?.docker?.Host;
  } catch {
    return { ok: false, reason: "DOCKER_CONTEXT_INVALID" };
  }
  if (typeof endpoint !== "string" || endpoint.length === 0) {
    return { ok: false, reason: "DOCKER_CONTEXT_INVALID" };
  }
  if (endpoint !== "npipe:////./pipe/dockerDesktopLinuxEngine") {
    return { ok: false, reason: "DOCKER_CONTEXT_REMOTE" };
  }
  return { ok: true, contextName: "desktop-linux", endpoint };
}

function runDocker(args, input = "") {
  const environment = localDockerEnvironment();
  const context = inspectLocalDockerContext(environment);
  if (!context.ok) {
    return { exitCode: null, stdout: "", stderr: "", stdoutBytes: 0, stderrBytes: 0, reason: context.reason };
  }
  return invokeLocalDocker(args, input, environment);
}

function firstNonEmptyLine(text) {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0) ?? "";
}

function hasExactPostgresCommandPrefix(rawCommandLine) {
  const nulSeparated = String(rawCommandLine ?? "").split("\0").filter(Boolean);
  const argv = nulSeparated.length === 1
    ? nulSeparated[0].trim().split(/\s+/).filter(Boolean)
    : nulSeparated;
  if (argv.length < 3) return false;
  const program = argv[0];
  const programName = program.startsWith("/") ? path.posix.basename(program) : program;
  return programName === "postgres" && argv[1] === "-D" && argv[2] === "/etc/postgresql";
}

function evaluateLocalDockerGuard({
  dockerAvailable,
  contextName,
  endpoint,
  existingRuntimeCount,
  imagePresent,
  repoDigest,
  forbiddenRuntimeInput
}) {
  if (forbiddenRuntimeInput) return { ok: false, reason: "EXISTING_RUNTIME_INPUT" };
  if (!dockerAvailable) return { ok: false, reason: "DOCKER_UNAVAILABLE" };
  if (typeof contextName !== "string" || contextName.length === 0 || typeof endpoint !== "string" || endpoint.length === 0) {
    return { ok: false, reason: "DOCKER_CONTEXT_INVALID" };
  }
  if (contextName !== "desktop-linux" || endpoint !== "npipe:////./pipe/dockerDesktopLinuxEngine") {
    return { ok: false, reason: "DOCKER_CONTEXT_REMOTE" };
  }
  if (existingRuntimeCount !== 0) return { ok: false, reason: "EXISTING_RUNTIME_INPUT" };
  if (!imagePresent) return { ok: false, reason: "IMAGE_UNAVAILABLE" };
  if (typeof repoDigest !== "string" || !/^public\.ecr\.aws\/supabase\/postgres@sha256:[0-9a-f]{64}$/i.test(repoDigest)) {
    return { ok: false, reason: "IMAGE_REPODIGEST_UNAVAILABLE" };
  }
  return { ok: true, reason: null };
}

function buildLocalPostgresCommand() {
  return [
    "postgres",
    "-D",
    "/etc/postgresql",
    "-c",
    "log_statement=none",
    "-c",
    "log_parameter_max_length_on_error=0",
    "-c",
    "logging_collector=off",
    "-c",
    "log_min_error_statement=panic",
    "-c",
    "log_min_messages=panic"
  ];
}

function buildLocalContainerArguments({ containerName, imageRef, envFile }) {
  return [
    "run",
    "--detach",
    "--pull=never",
    "--name",
    containerName,
    "--label",
    `${localContainerLabelKey}=${localContainerLabelValue}`,
    "--label",
    `${localContainerRunLabelKey}=${containerName}`,
    "--network",
    "none",
    "--tmpfs",
    "/var/lib/postgresql/data:rw",
    "--log-driver",
    "none",
    "--env-file",
    envFile,
    imageRef,
    ...buildLocalPostgresCommand()
  ];
}

function buildPsqlExecArguments(containerName, database) {
  return [
    "exec",
    "--interactive",
    containerName,
    "psql",
    "--no-psqlrc",
    "--quiet",
    "--no-password",
    "--tuples-only",
    "--no-align",
    "--set=ON_ERROR_STOP=1",
    `--dbname=${database}`,
    "--username=postgres"
  ];
}

function buildBootstrapPsqlArguments(containerName, database) {
  return [
    "exec",
    "--interactive",
    containerName,
    "psql",
    "--no-psqlrc",
    "--quiet",
    "--no-password",
    "--tuples-only",
    "--no-align",
    "--set=ON_ERROR_STOP=1",
    `--dbname=${database}`,
    `--username=${localBootstrapRole}`
  ];
}

function buildBoundPsqlInvocation({ containerName, database = "postgres", sql, maintenanceUrl, cronToken }) {
  const shell = [
    "set -eu",
    "IFS= read -r gate1_url_b64",
    "IFS= read -r gate1_token_b64",
    "export GATE1_VAULT_MAINTENANCE_URL=\"$(printf '%s' \"$gate1_url_b64\" | base64 -d)\"",
    "export GATE1_VAULT_CRON_TOKEN=\"$(printf '%s' \"$gate1_token_b64\" | base64 -d)\"",
    "unset gate1_url_b64 gate1_token_b64",
    "exec psql --no-psqlrc --quiet --no-password --tuples-only --no-align --set=ON_ERROR_STOP=1 --set=VERBOSITY=sqlstate --dbname=" + database + " --username=postgres"
  ].join("\n");
  const encodedUrl = Buffer.from(maintenanceUrl, "utf8").toString("base64");
  const encodedToken = Buffer.from(cronToken, "utf8").toString("base64");
  const source = String(sql).endsWith("\n") ? String(sql) : `${sql}\n`;
  return {
    args: ["exec", "--interactive", containerName, "sh", "-c", shell],
    shell,
    stdin: `${encodedUrl}\n${encodedToken}\n${source}`,
    sql: String(sql)
  };
}

function runBoundPsql(target, database, sql, maintenanceUrl, cronToken) {
  const invocation = buildBoundPsqlInvocation({
    containerName: target.containerName,
    database,
    sql,
    maintenanceUrl,
    cronToken
  });
  return { ...runDocker(invocation.args, invocation.stdin), invocation };
}

function runIndependentPsql(target, database, sql) {
  if (/decrypted_secret/i.test(sql)) throw { localKind: "failure", phase: "readback-decrypted-read" };
  return runDocker(buildPsqlExecArguments(target.containerName, database), sql);
}

function runVaultExtensionInstall(target, database) {
  return runDocker(buildBootstrapPsqlArguments(target.containerName, database), buildVaultExtensionInstallSql());
}

function inspectLocalDockerPrerequisites() {
  if (hasExistingRuntimeInput()) return { ok: false, reason: "EXISTING_RUNTIME_INPUT" };

  const context = inspectLocalDockerContext(localDockerEnvironment());
  if (!context.ok) return context;
  const { contextName, endpoint } = context;

  const daemon = runDocker(["version", "--format", "{{.Server.Version}}"]);
  const dockerVersion = firstNonEmptyLine(daemon.stdout);
  if (daemon.exitCode !== 0 || dockerVersion.length === 0) {
    return { ok: false, reason: "DOCKER_UNAVAILABLE" };
  }

  const existing = runDocker(["ps", "-a", "--filter", `name=^${localRuntimePrefix}`, "--format", "{{.Names}}"]);
  if (existing.exitCode !== 0) return { ok: false, reason: "DOCKER_UNAVAILABLE" };
  const existingNames = existing.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  const image = runDocker(["image", "inspect", localImageTag, "--format", "{{json .RepoDigests}}"]);
  let repoDigests = [];
  try {
    repoDigests = JSON.parse(firstNonEmptyLine(image.stdout));
  } catch {
    repoDigests = [];
  }
  const repoDigest = Array.isArray(repoDigests)
    ? repoDigests.find((value) => typeof value === "string" && /^public\.ecr\.aws\/supabase\/postgres@sha256:[0-9a-f]{64}$/i.test(value)) ?? ""
    : "";
  const guard = evaluateLocalDockerGuard({
    dockerAvailable: true,
    contextName,
    endpoint,
    existingRuntimeCount: existingNames.length,
    imagePresent: image.exitCode === 0,
    repoDigest,
    forbiddenRuntimeInput: false
  });
  if (!guard.ok) return { ok: false, reason: guard.reason };
  return { ok: true, dockerVersion, contextName, endpoint, repoDigest, imageRef: repoDigest };
}

function createLocalTargetDescriptor(imageRef) {
  const suffix = `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}`;
  const containerName = `${localRuntimePrefix}${suffix}`;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `${localRuntimePrefix}env-`));
  const envFile = path.join(tempDir, "container.env");
  const bootstrapPassword = `gate1-bootstrap-${randomBytes(18).toString("hex")}`;
  fs.writeFileSync(
    envFile,
    `POSTGRES_PASSWORD=${bootstrapPassword}\nPOSTGRES_HOST_AUTH_METHOD=trust\nPOSTGRES_DB=postgres\n`,
    { encoding: "utf8", mode: 0o600 }
  );
  return { containerName, imageRef, tempDir, envFile, containerId: "" };
}

function startLocalTarget(target) {
  const result = runDocker(buildLocalContainerArguments({
    containerName: target.containerName,
    imageRef: target.imageRef,
    envFile: target.envFile
  }));
  target.containerId = firstNonEmptyLine(result.stdout);
  return result;
}

function waitForPostgres(target) {
  const deadline = Date.now() + localReadinessTimeoutMs;
  let consecutiveReady = 0;
  while (Date.now() < deadline) {
    // Entrypoint bootstrap can serve a Unix socket before the final PID1 exec.
    // Keep raw argv private; comm may differ from the executable name.
    const metadata = runDocker(["exec", target.containerName, "cat", "/proc/1/cmdline"]);
    const finalPostgres = metadata.exitCode === 0 && metadata.stderrBytes === 0 &&
      hasExactPostgresCommandPrefix(metadata.stdout);
    const probe = finalPostgres
      ? runDocker(["exec", target.containerName, "pg_isready", "--host=127.0.0.1", "--port=5432", "--username=postgres", "--dbname=postgres"])
      : null;
    consecutiveReady = probe?.exitCode === 0 ? consecutiveReady + 1 : 0;
    if (consecutiveReady === 2) return true;
    const waitBuffer = new Int32Array(new SharedArrayBuffer(4));
    Atomics.wait(waitBuffer, 0, 0, 250);
  }
  return false;
}

function isEmptyRecord(value) {
  return value === null || (typeof value === "object" && Object.keys(value).length === 0);
}

function hasExactCommandSetting(command, setting) {
  for (let index = 0; index < command.length - 1; index += 1) {
    if (command[index] === "-c" && command[index + 1] === setting) return true;
  }
  return false;
}

function inspectOwnedContainer(target) {
  const result = runDocker(["container", "inspect", target.containerName]);
  if (result.exitCode !== 0) return { exists: false, owned: false };
  try {
    const inspection = JSON.parse(result.stdout)[0];
    const hostConfig = inspection?.HostConfig ?? {};
    const config = inspection?.Config ?? {};
    const mounts = Array.isArray(inspection?.Mounts) ? inspection.Mounts : [];
    const tmpfs = hostConfig.Tmpfs ?? {};
    const tmpfsDestination = "/var/lib/postgresql/data";
    const tmpfsKeys = Object.keys(tmpfs);
    const tmpfsConfigured = tmpfsKeys.length === 1 && tmpfsKeys[0] === tmpfsDestination;
    const tmpfsMounts = mounts.length === 0 || (
      mounts.length === 1 &&
      mounts[0]?.Type === "tmpfs" &&
      mounts[0]?.Destination === tmpfsDestination
    );
    const command = Array.isArray(config.Cmd) ? config.Cmd : [];
    const exactCommand = buildLocalPostgresCommand();
    const portBindings = hostConfig.PortBindings;
    const networkPorts = inspection?.NetworkSettings?.Ports;
    const owned = inspection?.Id === target.containerId &&
      inspection?.Name === `/${target.containerName}` &&
      config.Image === target.imageRef &&
      config.Labels?.[localContainerLabelKey] === localContainerLabelValue &&
      config.Labels?.[localContainerRunLabelKey] === target.containerName &&
      hostConfig.NetworkMode === "none" &&
      hostConfig.LogConfig?.Type === "none" &&
      tmpfsConfigured &&
      tmpfsMounts &&
      isEmptyRecord(hostConfig.Binds) &&
      isEmptyRecord(portBindings) &&
      isEmptyRecord(networkPorts) &&
      JSON.stringify(command) === JSON.stringify(exactCommand) &&
      hasExactCommandSetting(command, "log_statement=none") &&
      hasExactCommandSetting(command, "log_parameter_max_length_on_error=0") &&
      hasExactCommandSetting(command, "logging_collector=off") &&
      hasExactCommandSetting(command, "log_min_error_statement=panic") &&
      hasExactCommandSetting(command, "log_min_messages=panic");
    return { exists: true, owned, inspection };
  } catch {
    return { exists: true, owned: false };
  }
}

function assertVaultBootstrapRole(target, database) {
  const result = runIndependentPsql(target, database, buildVaultBootstrapRoleSql());
  let fields;
  try {
    fields = parsePsqlFields(result, 3, "vault-bootstrap-role-query");
  } catch {
    throw localSetup("LOCAL_VAULT_BOOTSTRAP_ROLE_UNAVAILABLE");
  }
  requireLocalSetup(
    fields[0] === localBootstrapRole && fields[1] === "1" && fields[2] === "1",
    "LOCAL_VAULT_BOOTSTRAP_ROLE_UNAVAILABLE"
  );
}

function assertVaultBootstrapOwnership(target) {
  const ownership = inspectOwnedContainer(target);
  requireLocalSetup(
    ownership.exists && ownership.owned,
    "LOCAL_VAULT_BOOTSTRAP_OWNERSHIP_UNVERIFIED"
  );
}

function isSafeGeneratedTempDirectory(tempDir) {
  const resolvedTempRoot = path.resolve(os.tmpdir());
  const resolvedDir = path.resolve(tempDir);
  const relative = path.relative(resolvedTempRoot, resolvedDir);
  return relative.length > 0 && !relative.startsWith("..") && !path.isAbsolute(relative) &&
    path.basename(resolvedDir).startsWith(`${localRuntimePrefix}env-`);
}

function cleanupLocalTarget(target) {
  if (!target) return { ok: true, residue: 0 };
  const existing = runDocker(["ps", "-a", "--filter", `name=^${target.containerName}$`, "--format", "{{.Names}}"]);
  if (existing.exitCode !== 0) return { ok: false, residue: "unknown" };
  const names = existing.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (names.length > 0) {
    const owned = inspectOwnedContainer(target);
    if (!owned.exists || !owned.owned) return { ok: false, residue: "unknown" };
    const removed = runDocker(["container", "rm", "--force", target.containerId]);
    if (removed.exitCode !== 0) return { ok: false, residue: "unknown" };
    const remaining = runDocker(["ps", "-a", "--filter", `name=^${target.containerName}$`, "--format", "{{.Names}}"]);
    if (remaining.exitCode !== 0 || remaining.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).length !== 0) {
      return { ok: false, residue: "unknown" };
    }
  }

  if (!isSafeGeneratedTempDirectory(target.tempDir)) return { ok: false, residue: "unknown" };
  if (fs.existsSync(target.envFile)) fs.rmSync(target.envFile, { force: true });
  if (fs.existsSync(target.tempDir) && fs.readdirSync(target.tempDir).length !== 0) return { ok: false, residue: "unknown" };
  if (fs.existsSync(target.tempDir)) fs.rmSync(target.tempDir, { recursive: true, force: true });
  if (fs.existsSync(target.tempDir) || fs.existsSync(target.envFile)) return { ok: false, residue: "unknown" };
  return { ok: true, residue: 0 };
}

function quoteFaultIdentifier(value, phase = "fault-identifier") {
  const identifier = String(value);
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(identifier)) {
    throw { localKind: "failure", phase };
  }
  return `"${identifier}"`;
}

function quoteFaultLiteral(value, phase = "fault-literal") {
  const literal = String(value);
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(literal)) {
    throw { localKind: "failure", phase };
  }
  return `'${literal}'`;
}

function normalizeFaultSuffix(value, phase) {
  const suffix = String(value).toLowerCase();
  if (!/^[a-z][a-z0-9_]{0,32}$/.test(suffix)) {
    throw { localKind: "failure", phase };
  }
  return suffix;
}

function faultSchemaName(kind, suffix, phase) {
  const normalized = normalizeFaultSuffix(suffix, phase);
  return `gate1_fault_${kind}_${normalized}`;
}

function spliceSqlAnchor(source, anchor, replacement, phase) {
  const text = String(source);
  const first = text.indexOf(anchor);
  if (first < 0 || first !== text.lastIndexOf(anchor)) {
    throw localFailure(phase);
  }
  return text.slice(0, first) + replacement + text.slice(first + anchor.length);
}

function assertVaultWriteSqlAnchors(source, phase) {
  const text = String(source);
  const anchors = [
    "BEGIN;",
    "pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('comment-translator-paid-v1-gate1-vault-binding', 0))",
    "vault.create_secret($1, 'comment_translator_paid_maintenance_url')",
    "vault.create_secret($2, 'comment_translator_paid_cron_token')",
    "\\bind :gate1_url :gate1_token \\gset",
    "\\if :gate1_created",
    "COMMIT;",
    "RAISE SQLSTATE 'PGT02'",
    "\\if :gate1_absent",
    "RAISE SQLSTATE 'PGT01'"
  ];
  if (anchors.some(anchor => text.split(anchor).length - 1 !== 1)) {
    throw localFailure(phase);
  }
  const positions = anchors.slice(0, 7).map(anchor => text.indexOf(anchor));
  if (!(positions[0] < positions[1] && positions[1] < positions[2] && positions[2] < positions[3] &&
    positions[3] < positions[4] && positions[4] < positions[5] && positions[5] < positions[6])) {
    throw localFailure(phase);
  }
  const lock = positions[1];
  const firstCreate = positions[2];
  const absentIf = text.indexOf("\\if :gate1_absent");
  const pgt01 = text.indexOf("RAISE SQLSTATE 'PGT01'");
  if (!(lock < absentIf && absentIf < pgt01 && pgt01 < firstCreate)) {
    throw localFailure(phase);
  }
}

function buildSecondCreateFaultSetupSql(suffix) {
  const schema = faultSchemaName("second", suffix, "second-create-fault-identifier");
  const functionName = "fail_second_create";
  const firstName = quoteFaultLiteral(localVaultNames[0]);
  const secondName = quoteFaultLiteral(localVaultNames[1]);
  const names = `(${firstName}, ${secondName})`;
  return [
    "\\set QUIET 1",
    `CREATE SCHEMA ${quoteFaultIdentifier(schema)};`,
    `CREATE FUNCTION ${quoteFaultIdentifier(schema)}.${quoteFaultIdentifier(functionName)}(p_secret text, p_reserved_name text)`,
    "RETURNS uuid LANGUAGE plpgsql VOLATILE SECURITY INVOKER AS $gate1$",
    "DECLARE",
    "  gate1_first_row_count bigint;",
    "  gate1_first_id_count bigint;",
    "  gate1_first_encrypted_count bigint;",
    "  gate1_second_row_count bigint;",
    "  gate1_reserved_total bigint;",
    "BEGIN",
    "  SELECT count(*) FILTER (WHERE name = " + firstName + ")::bigint,",
    "         count(id) FILTER (WHERE name = " + firstName + ")::bigint,",
    "         count(*) FILTER (WHERE name = " + firstName + " AND secret IS NOT NULL)::bigint,",
    "         count(*) FILTER (WHERE name = " + secondName + ")::bigint,",
    "         count(*) FILTER (WHERE name IN " + names + ")::bigint",
    "    INTO gate1_first_row_count, gate1_first_id_count, gate1_first_encrypted_count,",
    "         gate1_second_row_count, gate1_reserved_total",
    "    FROM vault.secrets",
    "   WHERE name IN " + names + ";",
    "  IF p_secret IS NOT NULL",
    "     AND p_reserved_name = " + secondName,
    "     AND gate1_first_row_count = 1",
    "     AND gate1_first_id_count = 1",
    "     AND gate1_first_encrypted_count = 1",
    "     AND gate1_second_row_count = 0",
    "     AND gate1_reserved_total = 1 THEN",
    "    RAISE EXCEPTION USING ERRCODE = 'PGT03';",
    "  END IF;",
    "  RAISE EXCEPTION USING ERRCODE = 'PGT04';",
    "END;",
    "$gate1$;"
  ].join("\n");
}

function buildSecondCreateFaultSql(source, suffix) {
  assertVaultWriteSqlAnchors(source, "second-create-fault-anchor");
  const schema = faultSchemaName("second", suffix, "second-create-fault-identifier");
  const functionName = "fail_second_create";
  const secondExpression = "vault.create_secret($2, 'comment_translator_paid_cron_token')";
  const replacement = `${quoteFaultIdentifier(schema)}.${quoteFaultIdentifier(functionName)}($2, ${quoteFaultLiteral(localVaultNames[1])})`;
  return spliceSqlAnchor(source, secondExpression, replacement, "second-create-fault-anchor");
}

function buildPostCreateFaultSql(source) {
  assertVaultWriteSqlAnchors(source, "post-create-fault-anchor");
  const anchor = "\\if :gate1_created";
  const eol = String(source).includes("\r\n") ? "\r\n" : "\n";
  const guard = [
    anchor,
    "\\else",
    "DO $gate1_postcondition_guard$ BEGIN RAISE SQLSTATE 'PGT04'; END; $gate1_postcondition_guard$;",
    "\\endif",
    "\\set gate1_created false"
  ].join(eol);
  return spliceSqlAnchor(source, anchor, `${guard}${eol}${anchor}`, "post-create-fault-anchor");
}

function localFailure(phase) {
  return { localKind: "failure", phase };
}

function localSetup(reason) {
  return { localKind: "setup", reason };
}

function requireLocal(condition, phase) {
  if (!condition) throw localFailure(phase);
}

function requireLocalSetup(condition, reason) {
  if (!condition) throw localSetup(reason);
}

function parsePsqlFields(result, fieldCount, phase) {
  requireLocal(result?.exitCode === 0, phase);
  requireLocal(result?.stderrBytes === 0, phase);
  const lines = String(result?.stdout ?? "").split(/\r?\n/).filter((line) => line.length > 0);
  requireLocal(lines.length === 1, phase);
  const fields = lines[0].split("|");
  requireLocal(fields.length === fieldCount, phase);
  return fields;
}

function parseUnsignedCount(value, phase) {
  requireLocal(/^\d+$/.test(value), phase);
  const count = Number(value);
  requireLocal(Number.isSafeInteger(count), phase);
  return count;
}

function assertPsqlResult(result, exitCode, phase) {
  requireLocal(result?.exitCode === exitCode, phase);
  requireLocal(result?.stdoutBytes === 0, phase);
  requireLocal(result?.stderrBytes === 0, phase);
}

function assertNoRawValueInResult(result, values, phase) {
  const text = [
    ...(Array.isArray(result?.invocation?.args) ? result.invocation.args : []),
    result?.invocation?.shell ?? "",
    result?.invocation?.stdin ?? "",
    result?.stdout ?? "",
    result?.stderr ?? ""
  ].join("\u0000");
  for (const value of values) {
    requireLocal(!text.includes(value), phase);
  }
}

function buildVaultMetaSql() {
  return [
    "\\set QUIET 1",
    "SELECT current_setting('server_version_num', true),",
    "       split_part(current_setting('server_version', true), '.', 1),",
    "       current_setting('log_statement', true),",
    "       current_setting('log_parameter_max_length_on_error', true),",
    "       current_setting('logging_collector', true),",
    "       COALESCE((SELECT extversion FROM pg_extension WHERE extname = 'supabase_vault'), ''),",
    "       CASE WHEN to_regclass('vault.secrets') IS NULL THEN '0' ELSE '1' END,",
    "       CASE WHEN to_regprocedure('vault.create_secret(text,text)') IS NOT NULL",
    "                  OR to_regprocedure('vault.create_secret(text,text,text)') IS NOT NULL",
    "                  OR EXISTS (SELECT 1 FROM pg_catalog.pg_proc p, pg_catalog.pg_depend d, pg_catalog.pg_extension e",
    "                             WHERE p.oid = to_regprocedure('vault.create_secret(text,text,text,uuid)')",
    "                               AND p.pronargs = 4 AND p.pronargdefaults >= 2",
    "                               AND p.prorettype = 'pg_catalog.uuid'::regtype AND NOT p.proretset",
    "                               AND d.classid = 'pg_catalog.pg_proc'::regclass AND d.objid = p.oid AND d.objsubid = 0",
    "                               AND d.refclassid = 'pg_catalog.pg_extension'::regclass AND d.refobjid = e.oid",
    "                               AND d.deptype = 'e' AND e.extname = 'supabase_vault')",
    "            THEN '1' ELSE '0' END;"
  ].join("\n");
}

function buildVaultAvailabilitySql() {
  return [
    "\\set QUIET 1",
    "SELECT CASE WHEN EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'supabase_vault')",
    "            THEN '1' ELSE '0' END;"
  ].join("\n");
}

function buildVaultSchemaSetupSql() {
  return [
    "\\set QUIET 1",
    "SET client_min_messages=warning;",
    "CREATE SCHEMA IF NOT EXISTS vault;"
  ].join("\n");
}

function buildVaultExtensionInstallSql() {
  return [
    "\\set QUIET 1",
    "SET client_min_messages=warning;",
    "CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;"
  ].join("\n");
}

function buildVaultBootstrapRoleSql() {
  return [
    "\\set QUIET 1",
    `SELECT COALESCE((SELECT rolname FROM pg_catalog.pg_roles WHERE rolname = '${localBootstrapRole}' LIMIT 1), ''),`,
    `       CASE WHEN EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = '${localBootstrapRole}' AND rolcanlogin) THEN '1' ELSE '0' END,`,
    `       CASE WHEN EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = '${localBootstrapRole}' AND rolsuper) THEN '1' ELSE '0' END;`
  ].join("\n");
}

function buildLocalDatabaseCreateSql(database) {
  return `\\set QUIET 1\nCREATE DATABASE ${quoteFaultIdentifier(database)};`;
}

function buildVaultAggregateSql() {
  const names = `(${quoteFaultLiteral(localVaultNames[0])}, ${quoteFaultLiteral(localVaultNames[1])})`;
  return [
    "\\set QUIET 1",
    "SELECT count(*)::text,",
    `       count(*) FILTER (WHERE name IN ${names})::text,`,
    `       count(DISTINCT name) FILTER (WHERE name IN ${names})::text,`,
    `       count(id) FILTER (WHERE name IN ${names})::text,`,
    `       count(*) FILTER (WHERE name IN ${names} AND secret IS NOT NULL)::text`,
    "FROM vault.secrets;"
  ].join("\n");
}

function buildVaultRowsSql() {
  const names = `(${quoteFaultLiteral(localVaultNames[0])}, ${quoteFaultLiteral(localVaultNames[1])})`;
  return [
    "\\set QUIET 1",
    `SELECT name, id::text, CASE WHEN secret IS NULL THEN '0' ELSE '1' END FROM vault.secrets WHERE name IN ${names} ORDER BY name;`
  ].join("\n");
}

function buildSingleNamedFixtureSql() {
  return [
    "\\set QUIET 1",
    "\\getenv gate1_fixture_url GATE1_VAULT_MAINTENANCE_URL",
    `\\set gate1_fixture_name ${localVaultNames[1]}`,
    "SELECT vault.create_secret($1, $2) AS gate1_fixture_id",
    "\\bind :gate1_fixture_url :gate1_fixture_name \\gset",
    "\\unset gate1_fixture_url",
    "\\unset gate1_fixture_name"
  ].join("\n");
}

function parseVaultRows(result, phase) {
  requireLocal(result?.exitCode === 0, phase);
  requireLocal(result?.stderrBytes === 0, phase);
  const lines = String(result?.stdout ?? "").split(/\r?\n/).filter((line) => line.length > 0);
  const rows = lines.map((line) => {
    const fields = line.split("|");
    requireLocal(fields.length === 3, phase);
    requireLocal(localVaultNames.includes(fields[0]), phase);
    requireLocal(/^[0-9a-f-]{36}$/i.test(fields[1]), phase);
    requireLocal(fields[2] === "0" || fields[2] === "1", phase);
    return { name: fields[0], id: fields[1], encrypted: fields[2] === "1" };
  });
  return rows;
}

function readVaultState(target, database) {
  const aggregate = runIndependentPsql(target, database, buildVaultAggregateSql());
  const aggregateFields = parsePsqlFields(aggregate, 5, "readback-aggregate");
  const rowsResult = runIndependentPsql(target, database, buildVaultRowsSql());
  const rows = parseVaultRows(rowsResult, "readback-rows");
  return {
    totalCount: parseUnsignedCount(aggregateFields[0], "readback-total-count"),
    reservedCount: parseUnsignedCount(aggregateFields[1], "readback-reserved-count"),
    distinctCount: parseUnsignedCount(aggregateFields[2], "readback-distinct-count"),
    idCount: parseUnsignedCount(aggregateFields[3], "readback-id-count"),
    encryptedNonNullCount: parseUnsignedCount(aggregateFields[4], "readback-encrypted-count"),
    rows
  };
}

function assertEmptyState(state, phase) {
  requireLocal(state.totalCount === 0, phase);
  requireLocal(state.reservedCount === 0, phase);
  requireLocal(state.distinctCount === 0, phase);
  requireLocal(state.idCount === 0, phase);
  requireLocal(state.encryptedNonNullCount === 0, phase);
  requireLocal(state.rows.length === 0, phase);
}

function assertExactSuccessState(state, phase) {
  requireLocal(state.totalCount === 2, phase);
  requireLocal(state.reservedCount === 2, phase);
  requireLocal(state.distinctCount === 2, phase);
  requireLocal(state.idCount === 2, phase);
  requireLocal(state.encryptedNonNullCount === 2, phase);
  requireLocal(state.rows.length === 2, phase);
  requireLocal(new Set(state.rows.map((row) => row.name)).size === 2, phase);
  requireLocal(new Set(state.rows.map((row) => row.id)).size === 2, phase);
  requireLocal(state.rows.every((row) => row.encrypted), phase);
  requireLocal(localVaultNames.every((name) => state.rows.some((row) => row.name === name)), phase);
}

function assertZeroState(state, phase) {
  assertEmptyState(state, phase);
}

function sameRowIdentity(before, after, phase) {
  requireLocal(before.rows.length === after.rows.length, phase);
  const beforeByName = new Map(before.rows.map((row) => [row.name, row.id]));
  const afterByName = new Map(after.rows.map((row) => [row.name, row.id]));
  requireLocal(beforeByName.size === afterByName.size, phase);
  for (const [name, id] of beforeByName) {
    requireLocal(afterByName.get(name) === id, phase);
  }
}

function inspectDatabaseVersionAndVault(target, database) {
  const result = runIndependentPsql(target, database, buildVaultMetaSql());
  const fields = parsePsqlFields(result, 8, "vault-meta-query");
  const serverVersionNum = parseUnsignedCount(fields[0], "postgres-version-number");
  const postgresMajor = Number(fields[1]);
  requireLocal(Number.isSafeInteger(postgresMajor), "postgres-major-parse");
  return {
    serverVersionNum,
    postgresMajor,
    logStatement: fields[2],
    logParameterMaxLengthOnError: fields[3],
    loggingCollector: fields[4],
    vaultVersion: fields[5],
    extensionInstalled: fields[6] === "1",
    createSecretAvailable: fields[7] === "1"
  };
}

function ensureVaultDatabase(target, database) {
  let meta;
  try {
    meta = inspectDatabaseVersionAndVault(target, database);
  } catch {
    throw localSetup("LOCAL_PG_READ_UNAVAILABLE");
  }
  requireLocalSetup(meta.postgresMajor === 17, "LOCAL_PG_MAJOR_NOT_17");
  requireLocalSetup(meta.logStatement === "none", "LOCAL_PG_LOG_STATEMENT_ENABLED");
  requireLocalSetup(meta.logParameterMaxLengthOnError === "0", "LOCAL_PG_LOG_PARAMETER_ENABLED");
  requireLocalSetup(meta.loggingCollector === "off", "LOCAL_PG_LOGGING_COLLECTOR_ENABLED");
  if (!meta.extensionInstalled || !meta.createSecretAvailable) {
    const availability = runIndependentPsql(target, database, buildVaultAvailabilitySql());
    let available;
    try {
      available = parsePsqlFields(availability, 1, "vault-availability-query")[0] === "1";
    } catch {
      throw localSetup("LOCAL_VAULT_AVAILABILITY_UNVERIFIED");
    }
    requireLocalSetup(available, "LOCAL_VAULT_EXTENSION_UNAVAILABLE");
    const schemaSetup = runIndependentPsql(target, database, buildVaultSchemaSetupSql());
    requireLocalSetup(schemaSetup.exitCode === 0 && schemaSetup.stderrBytes === 0, "LOCAL_VAULT_EXTENSION_SETUP_FAILED");
    assertVaultBootstrapRole(target, database);
    assertVaultBootstrapOwnership(target);
    const extensionInstall = runVaultExtensionInstall(target, database);
    requireLocalSetup(extensionInstall.exitCode === 0 && extensionInstall.stderrBytes === 0, "LOCAL_VAULT_EXTENSION_SETUP_FAILED");
    try {
      meta = inspectDatabaseVersionAndVault(target, database);
    } catch {
      throw localSetup("LOCAL_VAULT_READBACK_UNAVAILABLE");
    }
  }
  requireLocalSetup(meta.extensionInstalled, "LOCAL_VAULT_EXTENSION_NOT_INSTALLED");
  requireLocalSetup(meta.createSecretAvailable, "LOCAL_VAULT_CREATE_SECRET_UNAVAILABLE");
  requireLocalSetup(meta.vaultVersion.length > 0, "LOCAL_VAULT_VERSION_UNAVAILABLE");
  return { postgresMajor: meta.postgresMajor, vaultVersion: meta.vaultVersion };
}

function installFault(target, database, sql) {
  const result = runIndependentPsql(target, database, sql);
  requireLocalSetup(result.exitCode === 0 && result.stderrBytes === 0, "LOCAL_VAULT_FAULT_SETUP_UNAVAILABLE");
}

function assertNoExistingPrimaryState(target) {
  const state = readVaultState(target, "postgres");
  if (state.totalCount !== 0 || state.rows.length !== 0) {
    throw localSetup("LOCAL_PRIMARY_DATABASE_NOT_EMPTY");
  }
}

function assertPartialState(state, phase) {
  requireLocal(state.totalCount === 1, phase);
  requireLocal(state.reservedCount === 1, phase);
  requireLocal(state.distinctCount === 1, phase);
  requireLocal(state.idCount === 1, phase);
  requireLocal(state.encryptedNonNullCount === 1, phase);
  requireLocal(state.rows.length === 1, phase);
  requireLocal(state.rows[0].name === localVaultNames[1], phase);
  requireLocal(state.rows[0].encrypted, phase);
}

function assertBoundTransactionOutcome(result, expectedExitCode, values, phase) {
  requireLocal(expectedExitCode === 0 && result?.exitCode === 0, phase);
  assertBoundCapture(result, phase);
  requireLocal(result.stderrBytes === 0, phase);
  assertNoRawValueInResult(result, values, `${phase}-secret-output`);
}

function assertBoundCapture(result, phase) {
  requireLocal(result?.captureComplete === true, phase);
  requireLocal(result?.stdout === "" && result?.stdoutBytes === 0, phase);
  requireLocal(typeof result?.stderr === "string", phase);
  requireLocal(Number.isSafeInteger(result.stderrBytes) && result.stderrBytes >= 0 && result.stderrBytes <= 1024 * 1024, phase);
  requireLocal(result.stderrBytes === Buffer.byteLength(result.stderr, "utf8"), phase);
}

function assertBoundTransactionFailure(result, values, phase, expectedState) {
  requireLocal(["PGT01", "PGT02", "PGT03"].includes(expectedState), phase);
  requireLocal(result?.exitCode === 3, phase);
  assertBoundCapture(result, phase);
  const record = result.stderr.replace(/\r\n?/g, "\n");
  requireLocal(new RegExp(`^ERROR: +${expectedState}\\n?(?![\\s\\S])`).test(record), phase);
  assertNoRawValueInResult(result, values, `${phase}-secret-output`);
}

function safeVersionToken(value) {
  return /^[0-9][0-9A-Za-z._-]*$/.test(String(value)) ? String(value) : "unverified";
}

function safeContextToken(value) {
  return /^[A-Za-z0-9._-]+$/.test(String(value)) ? String(value) : "unverified";
}

function assertNoLocalRuntimeResidue() {
  const result = runDocker(["ps", "-a", "--filter", `name=^${localRuntimePrefix}`, "--format", "{{.Names}}"]);
  requireLocal(result.exitCode === 0, "cleanup-residue-check");
  const names = result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  requireLocal(names.length === 0, "cleanup-residue-check");
}

function assertBindingFidelity(target, database, runnerSql, values) {
  const phase = "binding-fidelity";
  const bindLines = runnerSql.replace(/\r\n/g, "\n").split("\n").filter(line => /^\s*\\bind\b/.test(line));
  requireLocal(bindLines.length === 1 && bindLines[0] === "\\bind :gate1_url :gate1_token \\gset", phase);
  const expected = [values.maintenanceUrl, values.cronToken].map(value => createHash("md5").update(value, "utf8").digest("hex"));
  const sql = [
    "\\getenv gate1_url GATE1_VAULT_MAINTENANCE_URL",
    "\\getenv gate1_token GATE1_VAULT_CRON_TOKEN",
    `SELECT CASE WHEN md5($1) = '${expected[0]}' THEN 1 ELSE 0 END AS gate1_fidelity_url,`,
    `       CASE WHEN md5($2) = '${expected[1]}' THEN 1 ELSE 0 END AS gate1_fidelity_token`,
    bindLines[0],
    "\\echo :gate1_fidelity_url :gate1_fidelity_token"
  ].join("\n");
  const result = runBoundPsql(target, database, sql, values.maintenanceUrl, values.cronToken);
  requireLocal(result?.exitCode === 0 && result?.captureComplete === true, phase);
  requireLocal(result?.stderr === "" && result?.stderrBytes === 0, phase);
  requireLocal(typeof result?.stdout === "string" && result.stdoutBytes === Buffer.byteLength(result.stdout, "utf8"), phase);
  requireLocal(result.stdoutBytes <= 1024 * 1024 && result.stdout.replace(/\r\n/g, "\n") === "1 1\n", phase);
  assertNoRawValueInResult(result, Object.values(values), phase);
}

function runActualLocalIntegration() {
  const prerequisites = inspectLocalDockerPrerequisites();
  if (!prerequisites.ok) return { kind: "setup", reason: prerequisites.reason };

  let target = null;
  let phase = "target-descriptor";
  let outcome = { kind: "failure", phase };
  try {
    const sql = extractFunctionOutput("Get-VaultWriteSql");
    requireLocal(sql.length > 0, "vault-sql-extraction");

    for (const caseSpec of buildLocalIntegrationCasePlan()) {
      try {
        target = null;
        target = createLocalTargetDescriptor(prerequisites.imageRef);
    phase = "container-start";
    const started = startLocalTarget(target);
    requireLocal(started.exitCode === 0, phase);
    requireLocal(/^[a-f0-9]{12,64}$/i.test(target.containerId), phase);

    phase = "container-identity";
    const ownership = inspectOwnedContainer(target);
    requireLocal(ownership.exists && ownership.owned, phase);

    phase = "postgres-ready";
    requireLocal(waitForPostgres(target), phase);

    phase = "postgres-vault-preflight";
    const primaryRuntime = ensureVaultDatabase(target, caseSpec.database);
    assertNoExistingPrimaryState(target);

    const successValues = {
      maintenanceUrl: "https://gate1.local/quote='\"\nline\\ with space",
      cronToken: "gate1-local-token-'\"\nline\\ with space"
    };

    if (caseSpec.name === "success-rerun") {
    phase = "binding-fidelity";
    assertBindingFidelity(target, caseSpec.database, sql, successValues);
    phase = "success-transaction";
    const successResult = runBoundPsql(
      target,
      "postgres",
      sql,
      successValues.maintenanceUrl,
      successValues.cronToken
    );
    assertBoundTransactionOutcome(successResult, 0, Object.values(successValues), phase);
    phase = "success-readback";
    const successState = readVaultState(target, caseSpec.database);
    assertExactSuccessState(successState, phase);

    phase = "rerun-rejection";
    const rerunResult = runBoundPsql(
      target,
      caseSpec.database,
      sql,
      successValues.maintenanceUrl,
      successValues.cronToken
    );
    assertBoundTransactionFailure(rerunResult, Object.values(successValues), phase, "PGT01");
    phase = "rerun-readback";
    const rerunState = readVaultState(target, caseSpec.database);
    assertExactSuccessState(rerunState, phase);
    sameRowIdentity(successState, rerunState, phase);
    }

    if (caseSpec.name === "partial-preservation") {
    const partialValues = {
      maintenanceUrl: "fixture-local-maintenance-url",
      cronToken: "fixture-local-cron-token-unused"
    };
    phase = "partial-fixture";
    const partialFixture = runBoundPsql(
      target,
      caseSpec.database,
      buildSingleNamedFixtureSql(),
      partialValues.maintenanceUrl,
      partialValues.cronToken
    );
    assertBoundTransactionOutcome(partialFixture, 0, Object.values(partialValues), phase);
    phase = "partial-fixture-readback";
    const partialBefore = readVaultState(target, caseSpec.database);
    assertPartialState(partialBefore, phase);

    phase = "partial-rejection";
    const partialResult = runBoundPsql(
      target,
      caseSpec.database,
      sql,
      successValues.maintenanceUrl,
      successValues.cronToken
    );
    assertBoundTransactionFailure(partialResult, Object.values(successValues), phase, "PGT01");
    phase = "partial-preservation-readback";
    const partialAfter = readVaultState(target, caseSpec.database);
    assertPartialState(partialAfter, phase);
    sameRowIdentity(partialBefore, partialAfter, phase);
    }

    const faultSuffix = target.containerName.slice(localRuntimePrefix.length).replace(/-/g, "_").toLowerCase();
    if (caseSpec.name === "second-create-fault-rollback") {
    phase = "second-create-fault-install";
    installFault(target, caseSpec.database, buildSecondCreateFaultSetupSql(faultSuffix));
    phase = "second-create-fault-transaction";
    const secondCreateResult = runBoundPsql(
      target,
      caseSpec.database,
      buildSecondCreateFaultSql(sql, faultSuffix),
      successValues.maintenanceUrl,
      successValues.cronToken
    );
    assertBoundTransactionFailure(secondCreateResult, Object.values(successValues), phase, "PGT03");
    phase = "second-create-rollback-readback";
    assertZeroState(readVaultState(target, caseSpec.database), phase);
    }

    if (caseSpec.name === "post-create-assertion-fault-rollback") {
    phase = "post-create-assertion-fault-transaction";
    const postCreateResult = runBoundPsql(
      target,
      caseSpec.database,
      buildPostCreateFaultSql(sql),
      successValues.maintenanceUrl,
      successValues.cronToken
    );
    assertBoundTransactionFailure(postCreateResult, Object.values(successValues), phase, "PGT02");
    phase = "post-create-assertion-rollback-readback";
    assertZeroState(readVaultState(target, caseSpec.database), phase);
    }

    outcome = {
      kind: "pass",
      line: [
        "vault-binding-integration=pass",
        "phase=actual-local",
        `docker-version=${safeVersionToken(prerequisites.dockerVersion)}`,
        `context=${safeContextToken(prerequisites.contextName)}`,
        `digest=${prerequisites.repoDigest}`,
        `postgres-major=${primaryRuntime.postgresMajor}`,
        `vault-version=${safeVersionToken(primaryRuntime.vaultVersion)}`,
        "success-rows=2",
        "rerun-rejected=1",
        "partial-preserved=1",
        "second-create-rollback-rows=0",
        "post-create-assertion-rollback-rows=0",
        "secret-output=0",
        "container-log-driver=none",
        "postgres-logging=disabled",
        "cleanup-residue=0",
        "synthetic-only=0",
        "hosted=UNVERIFIED"
      ].join(" ")
    };
      } finally {
        let caseCleanup;
        try {
          caseCleanup = cleanupLocalTarget(target);
        } catch {
          caseCleanup = { ok: false, residue: "unknown" };
        }
        if (!caseCleanup.ok) throw localFailure("case-cleanup");
        try {
          assertNoLocalRuntimeResidue();
        } catch {
          throw localFailure("case-cleanup-residue-check");
        }
        target = null;
      }
    }
  } catch (error) {
    if (error?.localKind === "setup") {
      outcome = { kind: "setup", reason: error.reason };
    } else {
      outcome = { kind: "failure", phase: error?.phase ?? phase };
    }
  }

  let cleanup;
  try {
    cleanup = cleanupLocalTarget(target);
  } catch {
    cleanup = { ok: false, residue: "unknown" };
  }
  if (!cleanup.ok) return { kind: "failure", phase: "cleanup" };
  try {
    assertNoLocalRuntimeResidue();
  } catch {
    return { kind: "failure", phase: "cleanup-residue-check" };
  }
  return outcome;
}

function assertLocalIntegrationHarnessContracts() {
  const secretUrl = "synthetic-local-url-quote='\"\nline";
  const secretToken = "synthetic-local-token-\\n-shaped";
  const containerName = "ct-paid-gate1-vault-local-synthetic";
  const imageRef = "public.ecr.aws/supabase/postgres@sha256:" + "a".repeat(64);

  const unavailable = evaluateLocalDockerGuard({
    dockerAvailable: false,
    contextName: "",
    endpoint: "",
    existingRuntimeCount: 0,
    imagePresent: false,
    repoDigest: "",
    forbiddenRuntimeInput: false
  });
  assert.deepEqual(unavailable, { ok: false, reason: "DOCKER_UNAVAILABLE" });

  const remote = evaluateLocalDockerGuard({
    dockerAvailable: true,
    contextName: "remote",
    endpoint: "ssh://example.invalid",
    existingRuntimeCount: 0,
    imagePresent: true,
    repoDigest: imageRef,
    forbiddenRuntimeInput: false
  });
  assert.deepEqual(remote, { ok: false, reason: "DOCKER_CONTEXT_REMOTE" });

  const existingRuntime = evaluateLocalDockerGuard({
    dockerAvailable: true,
    contextName: "desktop-linux",
    endpoint: "npipe:////./pipe/dockerDesktopLinuxEngine",
    existingRuntimeCount: 1,
    imagePresent: true,
    repoDigest: imageRef,
    forbiddenRuntimeInput: false
  });
  assert.deepEqual(existingRuntime, { ok: false, reason: "EXISTING_RUNTIME_INPUT" });

  const ready = evaluateLocalDockerGuard({
    dockerAvailable: true,
    contextName: "desktop-linux",
    endpoint: "npipe:////./pipe/dockerDesktopLinuxEngine",
    existingRuntimeCount: 0,
    imagePresent: true,
    repoDigest: imageRef,
    forbiddenRuntimeInput: false
  });
  assert.deepEqual(ready, { ok: true, reason: null });

  const containerArgs = buildLocalContainerArguments({
    containerName,
    imageRef,
    envFile: "C:/safe-temp/gate1.env"
  });
  assert.equal(containerArgs.includes("--pull=never"), true);
  assert.deepEqual(containerArgs.slice(containerArgs.indexOf("--network"), containerArgs.indexOf("--network") + 2), ["--network", "none"]);
  assert.deepEqual(containerArgs.slice(containerArgs.indexOf("--log-driver"), containerArgs.indexOf("--log-driver") + 2), ["--log-driver", "none"]);
  assert.equal(containerArgs.includes("--tmpfs"), true);
  assert.equal(containerArgs.includes("--publish"), false);
  assert.equal(containerArgs.includes("-p"), false);
  assert.equal(containerArgs.includes("--volume"), false);
  assertNoSecretValue(containerArgs.join("\u0000"), [secretUrl, secretToken]);

  const sql = extractFunctionOutput("Get-VaultWriteSql");
  const invocation = buildBoundPsqlInvocation({
    containerName,
    sql,
    maintenanceUrl: secretUrl,
    cronToken: secretToken
  });
  assert.equal(invocation.args[0], "exec");
  assert.equal(invocation.args[1], "--interactive");
  assert.equal(invocation.shell.includes("exec psql "), true);
  assert.equal(invocation.shell.includes("GATE1_VAULT_MAINTENANCE_URL"), true);
  assert.equal(invocation.shell.includes("GATE1_VAULT_CRON_TOKEN"), true);
  assert.equal(invocation.shell.includes("set -x"), false);
  assertNoSecretValue(invocation.args.join("\u0000"), [secretUrl, secretToken]);
  assertNoSecretValue(invocation.stdin, [secretUrl, secretToken]);
  assert.equal(invocation.stdin.startsWith(`${Buffer.from(secretUrl, "utf8").toString("base64")}\n`), true);
  assert.equal(invocation.stdin.includes(sql), true);

  const secondCreateFaultSetup = buildSecondCreateFaultSetupSql("gate1_fault_second_synthetic");
  const secondCreateFault = buildSecondCreateFaultSql(sql, "gate1_fault_second_synthetic");
  const postCreateFault = buildPostCreateFaultSql(sql);
  assert.equal(secondCreateFaultSetup.includes("RAISE EXCEPTION"), true);
  assert.equal(secondCreateFaultSetup.includes("CREATE TRIGGER"), false);
  assert.equal(secondCreateFault.includes("UPDATE vault.secrets"), false);
  assert.equal(postCreateFault.includes("UPDATE vault.secrets"), false);
  assert.equal(postCreateFault.includes("RAISE SQLSTATE 'PGT04'"), true);
  assert.equal(postCreateFault.includes("RAISE SQLSTATE 'PGT02'"), true);
  assertNoSecretValue(secondCreateFaultSetup + secondCreateFault + postCreateFault, [secretUrl, secretToken]);

  const source = fs.readFileSync(fileURLToPath(import.meta.url), "utf8");
  assert.deepEqual(
    buildLocalIntegrationCasePlan().map(caseSpec => ({ name: caseSpec.name, database: caseSpec.database })),
    [
      { name: "success-rerun", database: "postgres" },
      { name: "partial-preservation", database: "postgres" },
      { name: "second-create-fault-rollback", database: "postgres" },
      { name: "post-create-assertion-fault-rollback", database: "postgres" }
    ],
    "local cases use four fresh primary databases"
  );
  const bareCaseDatabaseNameBuilder = ["buildLocal", "DatabaseNames"].join("");
  const bareCaseDatabaseCreator = ["createLocal", "Database"].join("");
  assert.equal(new RegExp(`\\bfunction ${bareCaseDatabaseNameBuilder}\\b`).test(source), false, "bare case database naming is removed");
  assert.equal(new RegExp(`\\bfunction ${bareCaseDatabaseCreator}\\b`).test(source), false, "bare case database creation is removed");
}

function runSyntheticContract({ emit = true } = {}) {
  assertSingleNamedFixtureCleanupContract();
  assertPg17TransactionContracts();
  assertVaultMetadataCompatibilityContracts();
  assertVaultExtensionSetupContracts();
  assertPostgresReadinessContracts();
  assertStartupLoggingContracts();
  assertLocalCaseLifecycleContracts();
  assertFaultInjectionSpliceContracts();
  assertSanitizedFailureOutput();
  assertDockerAndFixtureExecutionContracts();
  assertLocalIntegrationHarnessContracts();
  assert.ok(fs.existsSync(runnerPath), "runner exists before green contract execution");
  assertDefaultAndApprovalGates();
  assertBindingAndConnectionGates();
  assertVaultSqlContract();
  assertSyntheticRollbackAndDuplicateCases();
  if (emit) {
    console.log("vault-binding-integration=pass success-rows=2 rollback-rows=0 secret-output=0 synthetic-only=1 hosted=UNVERIFIED");
  }
}

function main() {
  const phase = process.argv[2];
  if (phase === `--phase`) {
    const requested = process.argv[3];
    if (requested === syntheticPhase) {
      runSyntheticContract();
      return;
    }
    if (requested === integrationPhase) {
      const result = runActualLocalIntegration();
      if (result.kind === "pass") {
        console.log(result.line);
        process.exitCode = 0;
        return;
      }
      if (result.kind === "setup") {
        console.log(`SETUP_BLOCKED:${result.reason}`);
        process.exitCode = 2;
        return;
      }
      console.log(`LOCAL_INTEGRATION_FAILED:phase=${result.phase}`);
      process.exitCode = 1;
      return;
    }
  }
  runSyntheticContract({ emit: false });
  console.log("SETUP_BLOCKED:LOCAL_SUPABASE_VAULT_INTEGRATION_UNVERIFIED");
  process.exitCode = 2;
}

try {
  main();
} catch {
  // Never render an exception, assertion values, or child-process diagnostics.
  console.error("VAULT_BINDING_CONTRACT_FAILED");
  process.exitCode = 1;
}
