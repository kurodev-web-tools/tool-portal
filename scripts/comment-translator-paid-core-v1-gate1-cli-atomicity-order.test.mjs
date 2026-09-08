import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { assertCanonicalStructuralState } from "./lib/comment-translator-paid-core-v1-gate1-catalog.mjs";

const source = fs.readFileSync(
  path.join(process.cwd(), "scripts", "comment-translator-paid-core-v1-gate1-database-integration-contract.mjs"),
  "utf8"
);
const start = source.indexOf("function runCliRollbackHistoryAtomicCase");
const end = source.indexOf("function executeLegacyBodies", start);
assert.ok(start >= 0 && end > start, "CLI atomicity function is present");
const body = source.slice(start, end);

const bridgeStates = JSON.parse(fs.readFileSync(
  path.join(process.cwd(), "scripts", "fixtures", "comment-translator-paid-core-v1-gate1-bridge-states.json"),
  "utf8"
));
const canonical = assertCanonicalStructuralState(bridgeStates.canonical);
const legacyNames = bridgeStates.legacy.tables.map(({ name }) => name);
const canonicalLegacyOverlap = canonical.tables
  .filter(({ schema, name }) => schema === "public" && legacyNames.includes(name))
  .map(({ name }) => name);
assert.equal(canonicalLegacyOverlap.length, 1, "fixture exposes the single canonical/legacy name overlap");
assert.ok(canonicalLegacyOverlap.includes("comment_translator_paid_entitlements"));

const phaseIndex = (phase) => body.indexOf(`phase = "${phase}"`);
const initialReset = phaseIndex("CLI_INITIAL_RESET");
const dependencyBootstrap = phaseIndex("BOOTSTRAP_CLI_EXTERNAL_DEPENDENCY");
const injectedWrite = phaseIndex("WRITE_INJECTED_BRIDGE_AND_POST_MIGRATIONS");
const failedUp = phaseIndex("CLI_FAILED_MIGRATION_UP");
const rollbackRead = phaseIndex("READ_ROLLBACK_STATE");
const restoreBridge = phaseIndex("RESTORE_BRIDGE");
const succeededUp = phaseIndex("CLI_SUCCESS_MIGRATION_UP");

assert.ok(
  initialReset >= 0
    && dependencyBootstrap > initialReset
    && injectedWrite > dependencyBootstrap
    && failedUp > injectedWrite
    && rollbackRead > failedUp
    && restoreBridge > rollbackRead
    && succeededUp > restoreBridge,
  "CLI atomicity phases use reset, dependency bootstrap, injected migration up, rollback read, restore, and migration up order"
);
assert.match(body, /\["migration",\s*"up",\s*"--local"\]/, "CLI atomicity uses local migration up");
assert.match(body, /historyCount:\s*preBridgeMigrationCount/, "rollback state checks pre-bridge history count");
assert.match(body, /const preBridgeMigrationCount\s*=\s*preBridgeMigrations\.length/, "pre-bridge history count derives from the migration array");
assert.equal(
  (body.match(/const preBridgeMigrationCount\s*=/g) ?? []).length,
  1,
  "pre-bridge history count is defined exactly once in the atomicity scope"
);
assert.ok(source.includes("function legacyPublicTableStructureCountSql"), "legacy count helper is structure-aware");
const succeededStart = source.indexOf("succeeded: `");
const succeededEnd = source.indexOf("\n  );`", succeededStart);
assert.ok(succeededStart >= 0 && succeededEnd > succeededStart, "success assertion query is present");
assert.ok(source.slice(succeededStart, succeededEnd).includes("legacyPublicTableStructureCountSql"), "success state does not use name-only legacy count");
assert.ok(body.includes("canonicalStructuralEqual("), "final success checks canonical structure separately");

// Execute the real query and final catch/finally with process and cleanup stubs.
// Loading the integration entry point itself would run forbidden runtime actions.
function functionSource(name) {
  const offset = source.indexOf(`function ${name}(`);
  assert.ok(offset >= 0, `${name} is present`);
  return source.slice(offset, source.indexOf("\n}", offset) + 2);
}
const needsStructured = new Function(`${functionSource("cliNeedsStructuredStdout")} return cliNeedsStructuredStdout;`)();
assert.equal(needsStructured(["migration", "list", "--local"]), false, "migration list uses the normal stdout limit");
assert.equal(needsStructured(["db", "query", "--output-format", "json"]), true);
assert.equal(needsStructured(["status", "-o", "json"]), true);
const runCliQueryBody = functionSource("runCliQuery");
const extractedParseCliQueryJson = new Function(`${functionSource("parseCliQueryJson")} return parseCliQueryJson;`)();
let observedQueryWorkDirectory = null;
let observedQueryArgs = null;
const runInjectedCliQuery = new Function(
  "runLocalSupabaseCli",
  "parseCliQueryJson",
  "classifyLocalCliResult",
  "localCliFailureDiagnostics",
  `return ${runCliQueryBody};`
)(
  (workDirectory, args) => {
    observedQueryWorkDirectory = workDirectory;
    observedQueryArgs = args;
    return {
      status: 0,
      stdout: '[{"value":{"database":"postgres","serverPort":5432,"serverVersionNum":"170006"}}]',
      stderr: "",
      terminationUnknown: false,
      timedOut: false,
      captureFailure: false,
      cliDiagnostics: { stdoutTruncated: false }
    };
  },
  extractedParseCliQueryJson,
  () => "CLI_QUERY_FAILURE",
  () => ({ failureClass: "synthetic" })
);
const injectedQueryValue = runInjectedCliQuery("C:/tmp/gate1-cli-query", "C:/tmp/query.sql");
assert.equal(observedQueryWorkDirectory, "C:/tmp/gate1-cli-query", "CLI query preserves the caller work directory");
assert.deepEqual(observedQueryArgs, ["db", "query", "--local", "-o", "json", "--file", "C:/tmp/query.sql"], "CLI query uses the native query output selector and exact argv order");
assert.equal(needsStructured(observedQueryArgs), true, "native query output selector retains structured stdout capture");
assert.deepEqual(injectedQueryValue, { database: "postgres", serverPort: 5432, serverVersionNum: "170006" }, "CLI query returns the strictly parsed runtime identity");

const runnerSource = functionSource("runLocalSupabaseCli");
const makeCaptureConfig = (payload) => new Function("spawnSync", "path", "process", `
  const root = '.', dockerCli = 'unused', cliRunnerPath = 'unused', localCliRunnerMaxBufferBytes = 4194304;
  let terminationUnknown = false;
  const latchTerminationUnknown = () => { terminationUnknown = true; };
  const terminationUnknownResult = () => ({ status: null, signal: 'NONE', stdout: '', stderr: '', errorCode: 'CLI_TERMINATION_UNKNOWN', error: { code: 'CLI_TERMINATION_UNKNOWN' }, terminationConfirmed: false, terminationUnknown: true, timedOut: false, captureFailure: false, cliDiagnostics: { outputClass: 'RUNNER', stdoutTruncated: false, stderrTruncated: false } });
  ${functionSource("cliNeedsStructuredStdout")}
  ${runnerSource}
  return runLocalSupabaseCli('.', ['migration', 'list', '--local']);
`)((_command, _args, options) => {
  const config = JSON.parse(options.input);
  assert.equal(config.preserveStdout, true, "migration list remains available to history checks");
  assert.equal(config.structuredStdout, false);
  assert.equal(config.timeoutMs, 300000, "runner owns the bounded timeout");
  assert.equal(config.shell, false, "runner child shell remains disabled");
  return { status: 0, stdout: JSON.stringify(payload), stderr: "" };
}, path, process);
const completeCliPayload = {
  status: 0,
  signal: "NONE",
  errorCode: "NONE",
  stdout: "synthetic-history",
  terminationConfirmed: true,
  timedOut: false,
  preSpawnFailure: false,
  diagnostics: {
    stdoutTruncated: false,
    stderrTruncated: false,
    outputClass: "UNCLASSIFIED",
    lastErrorClass: "NONE"
  }
};
const completeCliResult = makeCaptureConfig(completeCliPayload);
assert.equal(completeCliResult.status, 0, "complete CLI receipt succeeds");
assert.equal(completeCliResult.terminationConfirmed, true);
assert.equal(completeCliResult.timedOut, false);
const diagnosticTruncationResult = makeCaptureConfig({
  ...completeCliPayload,
  diagnostics: { ...completeCliPayload.diagnostics, stderrTruncated: true }
});
assert.equal(diagnosticTruncationResult.status, 0, "ordinary diagnostic ring truncation remains eligible for success");
const requiredStdoutTruncationResult = makeCaptureConfig({
  ...completeCliPayload,
  diagnostics: { ...completeCliPayload.diagnostics, stdoutTruncated: true }
});
assert.notEqual(requiredStdoutTruncationResult.status, 0, "required stdout truncation fails closed");
assert.equal(requiredStdoutTruncationResult.captureFailure, true, "required stdout truncation is classified as capture failure");
assert.match(source, /terminationUnknown/, "harness has a termination-unknown latch");
assert.match(source, /CLI_TERMINATION_UNKNOWN/, "unknown termination blocks later operations");
assert.match(source, /timedOut[\s\S]*INJECTED_ATOMICITY_FAILURE|INJECTED_ATOMICITY_FAILURE[\s\S]*timedOut/, "timeout is checked before expected atomicity marker classification");

const markerGuardStart = body.indexOf("if (failedUp.terminationUnknown === true");
const markerGuardEnd = body.indexOf("      if (failedUp.status === 0)", markerGuardStart);
assert.ok(markerGuardStart >= 0 && markerGuardEnd > markerGuardStart, "atomicity negative-marker guard is executable");
const markerGuard = new Function("classifyLocalCliResult", "localCliFailureDiagnostics", `
  return function check(failedUp) {
    ${body.slice(markerGuardStart, markerGuardEnd)}
  };
`)(() => "INJECTED_ATOMICITY_FAILURE", () => ({ failureClass: "synthetic" }));
for (const [label, failedUp] of [
  ["timeout", { status: null, signal: "NONE", errorCode: "CLI_TIMEOUT", timedOut: true, terminationUnknown: false, captureFailure: false, cliDiagnostics: { injectedAtomicityFailure: true } }],
  ["runner-unknown", { status: null, signal: "NONE", errorCode: "CLI_TERMINATION_UNKNOWN", timedOut: false, terminationUnknown: true, captureFailure: false, cliDiagnostics: { injectedAtomicityFailure: true } }],
  ["input-error", { status: null, signal: "NONE", errorCode: "CLI_INPUT_FILE_ERROR", timedOut: false, terminationUnknown: false, captureFailure: false, cliDiagnostics: { injectedAtomicityFailure: true } }],
  ["signal-with-valid-marker", {
    status: 1,
    signal: "SIGTERM",
    errorCode: "NONE",
    timedOut: false,
    terminationUnknown: false,
    captureFailure: false,
    cliDiagnostics: {
      injectedAtomicityFailure: true,
      bridgeAssertionCode: "BRIDGE_CLEAN_STATE_MISMATCH",
      bridgeAssertionAllowlistMatch: true
    }
  }]
]) {
  const guarded = markerGuard(failedUp);
  assert.equal(guarded.status, "FAIL", `${label} cannot pass through the expected SQL marker`);
}

const catchStart = body.lastIndexOf("  } catch (error) {");
assert.ok(catchStart >= 0);
const finalReport = new Function("queryResult", "cleanupStatus", `
  ${["parseCliQueryJson", "classifyLocalCliResult", "classifyMissingRelationIdentity", "localCliFailureDiagnostics", "safeCaseReason", "runCliQuery"].map(functionSource).join("\n")}
  const runLocalSupabaseCli = () => queryResult;
  const cleanupGeneratedRuntimeResources = () => ({status: cleanupStatus});
  const removeGeneratedCliWorkDirectory = () => {};
  const workDirectory = '.', runtime = null, phase = 'READ_SUCCESS_CATALOG';
  let result;
  try {
    result = { status: 'PASS', value: runCliQuery('.', 'unused.sql') };
  ${body.slice(catchStart)}
`.replace(/\n}\s*$/, ""));
for (const [stdout, status, bytes, truncated, reason] of [
  ['', 0, 524289, true, 'CLI_QUERY_STDOUT_TRUNCATED'],
  ['private-invalid-json', 0, 20, false, 'CLI_QUERY_SHAPE'],
  ['private-cli-output', 1, 18, false, 'CLI_QUERY_CLI_FAILURE']
]) {
  for (const cleanupStatus of ['PASS', 'FAIL']) {
    const report = finalReport({
      status, stdout, stderr: 'private-stderr',
      cliDiagnostics: { stdoutBytes: bytes, stdoutLimitBytes: 524288, stdoutTruncated: truncated }
    }, cleanupStatus);
    assert.equal(report.status, 'FAIL');
    assert.equal(report.reason, cleanupStatus === 'PASS' ? `READ_SUCCESS_CATALOG_${reason}` : 'GENERATED_RESOURCE_CLEANUP_FAILED');
    assert.equal(report.diagnostics.stdoutBytes, bytes);
    assert.equal(report.diagnostics.stdoutLimitBytes, 524288);
    assert.equal(report.diagnostics.stdoutTruncated, truncated);
    assert.doesNotMatch(JSON.stringify(report), /private-|\"stdout\":|\"stderr\":/);
  }
}
const success = finalReport({ status: 0, stdout: JSON.stringify({rows: [{value: {ok: true}}]}) }, 'PASS');
assert.equal(success.status, 'PASS');
assert.deepEqual(success.value, {ok: true});

// R4B/C review repairs: execute the real inventory, cache, and preflight seams with injected Docker/CLI outcomes.
function balancedFunctionBody(name) {
  const offset = source.indexOf(`function ${name}(`);
  assert.ok(offset >= 0, `${name} is present`);
  const bodyStart = source.indexOf("{", offset);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"' || character === "`") {
      quote = character;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(bodyStart, index + 1);
    }
  }
  throw new Error(`${name} body is unterminated`);
}

const projectInventoryBody = balancedFunctionBody("cliProjectInventory");
const parseCliQueryBody = balancedFunctionBody("parseCliQueryJson");
const parseCliQuery = new Function(`return function parseCliQueryJson(output) ${parseCliQueryBody};`)();
assert.deepEqual(parseCliQuery('[{"value":{"ok":true}}]'), { ok: true }, "CLI query parser accepts ordinary one-row array output");
assert.deepEqual(parseCliQuery('{"rows":[{"value":{"ok":true}}]}'), { ok: true }, "CLI query parser preserves the existing rows envelope");
for (const invalidQuery of [
  "",
  "not-json",
  "[]",
  "[{}]",
  "[{\"value\":{\"ok\":true}},{\"value\":{\"ok\":false}}]",
  "{\"rows\":[]}",
  "{\"rows\":[{\"value\":{\"ok\":true}},{\"value\":{\"ok\":false}}]}",
  "{\"rows\":[{\"value\":null}]}",
  "[{\"value\":42}]",
  "42"
]) {
  assert.throws(() => parseCliQuery(invalidQuery), /CLI_QUERY_SHAPE/, `CLI query parser rejects invalid shape ${JSON.stringify(invalidQuery)}`);
}
let projectInventoryDockerCalls = 0;
const resourceListIdentity = (kind, value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  if (kind === "container") return typeof value.ID === "string" && typeof value.Names === "string" && value.ID && value.Names ? value.ID : "";
  if (kind === "network") return typeof value.ID === "string" && typeof value.Name === "string" && value.ID && value.Name ? value.ID : "";
  return kind === "volume" && typeof value.Name === "string" && value.Name ? value.Name : "";
};
const strictParserBody = balancedFunctionBody("parseDockerJsonLines");
const strictParser = new Function(
  "resourceListIdentity",
  `return function parseDockerJsonLines(stdout, kind) ${strictParserBody};`
)(resourceListIdentity);
const projectInventory = new Function(
  "terminationUnknown",
  "cliProjectResourceKinds",
  "cliProjectLabelKeys",
  "cliProjectListArgs",
  "runDocker",
  "parseDockerJsonLines",
  "resourceListIdentity",
  "resourceListName",
  "inspectDockerResource",
  "resourceLabels",
  `return function cliProjectInventory(projectId) ${projectInventoryBody};`
)(
  false,
  ["container", "network", "volume"],
  ["com.supabase.cli.project", "com.docker.compose.project"],
  (kind, labelKey, projectId) => [kind, labelKey, projectId],
  (args) => {
    projectInventoryDockerCalls += 1;
    const kind = args[0];
    const labelKey = args[1];
    const projectId = args[2];
    const rows = kind === "container"
      ? [{ ID: "container-helper-id", Names: `${projectId}-random-helper` }]
      : kind === "network"
        ? [{ ID: "network-id", Name: `${projectId}_net` }]
        : [{ Name: `${projectId}_volume` }];
    return { exitCode: 0, stdout: rows.map((row) => JSON.stringify(row)).join("\n"), stderr: "", signal: "NONE", errorCode: "NONE" };
  },
  strictParser,
  (kind, value) => kind === "container" ? value.ID : kind === "network" ? value.ID : value.Name,
  (kind, value) => kind === "container" ? value.Names.replace(/^\/+/, "") : value.Name,
  (kind, name) => ({
    status: "PRESENT",
    value: kind === "container"
      ? { Name: `/${name}`, Config: { Labels: { "com.supabase.cli.project": "gate1-ct-paid-v1-a3-999-z9", "com.docker.compose.project": "gate1-ct-paid-v1-a3-999-z9" } } }
      : { Name: name, Id: `${kind}-id`, Labels: { "com.supabase.cli.project": "gate1-ct-paid-v1-a3-999-z9", "com.docker.compose.project": "gate1-ct-paid-v1-a3-999-z9" } }
  }),
  (value) => value?.Config?.Labels ?? value?.Labels ?? {}
);
const inventory = projectInventory("gate1-ct-paid-v1-a3-999-z9");
assert.equal(inventory.status, "PASS", "CLI inventory accepts both labels and randomly named helper resources");
assert.equal(inventory.resources.length, 3, "CLI inventory covers container, network, and volume");
const inventoryCallsBeforeOverlength = projectInventoryDockerCalls;
const overlengthInventory = projectInventory(`gate1-ct-paid-v1-a3-${"a".repeat(21)}`);
assert.equal(overlengthInventory.status, "MISMATCH", "CLI inventory rejects an overlength project id");
assert.equal(overlengthInventory.code, "CLI_PROJECT_ID_INVALID", "CLI inventory reports overlength ids without normalization");
assert.equal(projectInventoryDockerCalls, inventoryCallsBeforeOverlength, "CLI inventory rejects overlength ids before querying Docker");

const imageIdentityBody = balancedFunctionBody("validateCliInventoryImageIdentities");
const validateImageIdentity = new Function(
  "cliCachedImageInventory",
  "inspectDockerResource",
  `return function validateCliInventoryImageIdentities(inventory) ${imageIdentityBody};`
)(
  {
    first: { id: "sha256:id-a", reference: "repo:first", repoDigest: "repo@sha256:digest-a" },
    second: { id: "sha256:id-b", reference: "repo:second", repoDigest: "repo@sha256:digest-b" }
  },
  () => ({ status: "PRESENT", value: { Image: "sha256:id-a", Config: { Image: "repo:second" } } })
);
assert.equal(validateImageIdentity({ resources: [{ kind: "container", value: { Names: "/helper" } }] }).status, "MISMATCH", "mixed image ID and reference entries are rejected");

const imageCacheBody = balancedFunctionBody("assertRequiredLocalImages");
const requiredImageRefs = [
  "public.ecr.aws/supabase/postgres:17.6.1.140", "public.ecr.aws/supabase/gotrue:v2.192.0", "public.ecr.aws/supabase/realtime:v2.112.1", "public.ecr.aws/supabase/storage-api:v1.61.7",
  "public.ecr.aws/supabase/mailpit:v1.30.2", "public.ecr.aws/supabase/postgrest:v14.14", "public.ecr.aws/supabase/postgres-meta:v0.96.6", "public.ecr.aws/supabase/logflare:1.45.6"
];
const imageCacheProbe = new Function(
  "cliRequiredImages",
  "imageInspection",
  `let cliCachedImageInventory = null;
   function assertRequiredLocalImages() ${imageCacheBody}
   return { assertRequiredLocalImages };`
)(
  requiredImageRefs,
  (reference) => ({ status: "PASS", id: `sha256:${reference.replace(/[^a-z0-9]/gi, "").slice(0, 12)}${"a".repeat(52)}`, digest: "sha256:" + "b".repeat(64), repoDigest: `${reference.replace(/:[^:]+$/, "")}@sha256:${"b".repeat(64)}` })
);
const firstImageCache = imageCacheProbe.assertRequiredLocalImages();
assert.equal(firstImageCache.available, true, "all eight required image identities are cached");
assert.equal(firstImageCache.imageCount, 8, "cache preflight covers exactly eight images");
const changedImageCache = new Function(
  "cliRequiredImages",
  "imageInspection",
  `let cliCachedImageInventory = ${JSON.stringify(firstImageCache.inventory)};
   function assertRequiredLocalImages() ${imageCacheBody}
   return assertRequiredLocalImages();`
)(requiredImageRefs, (reference) => ({ status: "PASS", id: reference === requiredImageRefs[0] ? "sha256:" + "c".repeat(64) : firstImageCache.inventory[reference].id, digest: firstImageCache.inventory[reference].digest, repoDigest: firstImageCache.inventory[reference].repoDigest }));
assert.equal(changedImageCache.available, false, "cached image identity changes block a later start or reset");
assert.equal(changedImageCache.reason, "REQUIRED_LOCAL_IMAGE_ID_DIGEST_CHANGED");

const versionBody = balancedFunctionBody("cliVersionResult");
const checkCliVersion = (stdout, status = 0, signal = "NONE", errorCode = "NONE") => new Function(
  "fs",
  "supabaseCliPath",
  "runLocalSupabaseCli",
  "root",
  `return function cliVersionResult() ${versionBody};`
)( { existsSync: () => true }, "supabase.js", () => ({ status, signal, errorCode, stdout }), ".")();
assert.equal(checkCliVersion("supabase version 2.109.0\n").status, "PASS", "CLI version stdout must identify 2.109.0");
assert.equal(checkCliVersion("supabase version 2.108.0\n").code, "SUPABASE_CLI_VERSION_MISMATCH", "CLI version drift blocks setup");

const startResetPreflightBody = balancedFunctionBody("cliStartResetPreflight");
let absentProbeCalls = 0;
let configOptionProbe = null;
const blockedByCachePreflight = new Function(
  "cliVersionResult",
  "assertGeneratedCliConfig",
  "assertRequiredLocalImages",
  "readCliProjectId",
  "assertCliProjectAbsent",
  `return function cliStartResetPreflight(workDirectory, args) ${startResetPreflightBody};`
)(
  () => ({ status: "PASS" }),
  (_directory, options) => { configOptionProbe = options; return { status: "PASS" }; },
  () => ({ available: false, reason: "REQUIRED_LOCAL_IMAGE_CACHE_INCOMPLETE" }),
  () => "gate1-ct-paid-v1-a3-999-z9",
  () => { absentProbeCalls += 1; return { status: "PASS" }; }
)(".", ["start"]);
assert.equal(blockedByCachePreflight.status, "SETUP_BLOCKED", "missing cache blocks start preflight");
assert.deepEqual(configOptionProbe, { requirePgdeltaDisabled: true }, "strict pgdelta validation is applied only at start/reset");
assert.equal(absentProbeCalls, 0, "cache preflight failure prevents namespace stop/absence follow-up");

const runLocalBody = balancedFunctionBody("runLocalSupabaseCli");
let blockedSpawnCalls = 0;
const blockedStart = new Function(
  "spawnSync",
  "cliStartResetPreflight",
  "cliNeedsStructuredStdout",
  "terminationUnknown",
  "terminationUnknownResult",
  "verifiedDockerTransportOrNull",
  "localCliTimeoutMs",
  "latchTerminationUnknown",
  "cliRunnerPath",
  "supabaseCliPath",
  "root",
  "emptyCliRunnerDiagnostics",
  "process",
  "path",
  `return function runLocalSupabaseCli(workDirectory, args) ${runLocalBody};`
)(
  () => { blockedSpawnCalls += 1; return { status: 0, stdout: "", stderr: "" }; },
  () => ({ status: "SETUP_BLOCKED", code: "CLI_PROJECT_RESOURCE_COLLISION" }),
  () => false,
  false,
  () => ({ status: null, signal: "NONE", stdout: "", stderr: "", terminationUnknown: true }),
  () => ({ environment: {} }),
  300000,
  () => {},
  "runner",
  "cli",
  ".",
  () => ({}),
  process,
  path
);
const blockedStartResult = blockedStart(".", ["start"]);
assert.equal(blockedStartResult.preflightBlocked, true, "start preflight collision blocks before CLI start");
assert.equal(blockedSpawnCalls, 0, "precheck failure emits no CLI start/stop process");

const negativeMatrixBody = balancedFunctionBody("runNegativeMatrix");
const negativeExpected = {
  functions: [
    { name: "ct_paid_assert_current_utc_month" },
    { name: "ct_paid_begin_checkout" }
  ]
};
const negativeIds = (() => {
  const calls = [];
  const runNegativeMatrix = new Function(
    "runNegativeCase",
    "firstForeignKey",
    `return function runNegativeMatrix(expected, inputRows) ${negativeMatrixBody};`
  )(
    (spec) => { calls.push(spec.id); return { id: spec.id, status: "PASS" }; },
    () => ({ table: { name: "comment_translator_paid_usage_events" }, constraint: { name: "usage_event_fk" } })
  );
  const result = runNegativeMatrix(negativeExpected, []);
  assert.equal(result.status, "PASS", "real emitted negative matrix passes when all cases pass");
  assert.equal(result.caseCount, calls.length, "negative matrix reports the complete case count");
  assert.equal(result.executedCaseCount, calls.length, "all passing negative cases execute");
  assert.deepEqual(result.unexecutedCaseIds, [], "all passing negative cases have no unexecuted IDs");
  assert.deepEqual(result.results.map((row) => row.id), calls, "negative results preserve execution order");
  return calls;
})();
assert.ok(negativeIds.length >= 4, "negative matrix has enough cases for stop-on-first-failure coverage");
for (const failureIndex of [0, 2, negativeIds.length - 1]) {
  const calls = [];
  const runNegativeMatrix = new Function(
    "runNegativeCase",
    "firstForeignKey",
    `return function runNegativeMatrix(expected, inputRows) ${negativeMatrixBody};`
  )(
    (spec) => {
      calls.push(spec.id);
      return { id: spec.id, status: spec.id === negativeIds[failureIndex] ? "FAIL" : "PASS", reason: spec.id === negativeIds[failureIndex] ? "SYNTHETIC_FAILURE" : undefined };
    },
    () => ({ table: { name: "comment_translator_paid_usage_events" }, constraint: { name: "usage_event_fk" } })
  );
  const result = runNegativeMatrix(negativeExpected, []);
  assert.equal(result.status, "FAIL", `negative matrix fails at index ${failureIndex}`);
  assert.equal(result.caseCount, negativeIds.length, "failed matrix retains the complete case count");
  assert.equal(result.executedCaseCount, failureIndex + 1, "negative matrix stops immediately after the first failure");
  assert.deepEqual(calls, negativeIds.slice(0, failureIndex + 1), "negative matrix executes only the prefix through failure");
  assert.deepEqual(result.results.map((row) => row.id), calls, "failed matrix preserves executed result rows");
  assert.deepEqual(result.unexecutedCaseIds, negativeIds.slice(failureIndex + 1), "failed matrix explicitly lists unexecuted case IDs");
}

const negativeAtomicityGateBody = balancedFunctionBody("runNegativeThenAtomicity");
function makeNegativeAtomicityGate(negativeResult, atomicityResult) {
  let atomicityCalls = 0;
  const gate = new Function(
    "runNegativeMatrix",
    "runCliRollbackHistoryAtomicCase",
    `return function runNegativeThenAtomicity(expected, inputRows, options) ${negativeAtomicityGateBody};`
  )(
    () => negativeResult,
    () => { atomicityCalls += 1; return atomicityResult; }
  );
  return {
    result: gate({}, [], {
      negativeRunner: () => negativeResult,
      atomicityRunner: () => { atomicityCalls += 1; return atomicityResult; }
    }),
    get atomicityCalls() { return atomicityCalls; }
  };
}
const negativeFailureGate = makeNegativeAtomicityGate(
  { status: "FAIL", results: [{ id: "partial-objects", status: "FAIL" }], unexecutedCaseIds: ["mixed-objects"] },
  { status: "PASS" }
);
assert.equal(negativeFailureGate.result.status, "FAIL", "outer negative gate fails on a negative matrix failure");
assert.equal(negativeFailureGate.result.reason, "NEGATIVE_MATRIX_FAILED", "negative gate reports its failure phase");
assert.equal(negativeFailureGate.result.atomicity, null, "negative failure leaves CLI atomicity unexecuted");
assert.equal(negativeFailureGate.atomicityCalls, 0, "negative failure never invokes CLI atomicity");
const passingGate = makeNegativeAtomicityGate(
  { status: "PASS", results: [], unexecutedCaseIds: [] },
  { status: "PASS", marker: "atomicity-pass" }
);
assert.equal(passingGate.result.status, "PASS", "outer negative gate reaches CLI atomicity after a passing matrix");
assert.equal(passingGate.result.atomicity.marker, "atomicity-pass");
assert.equal(passingGate.atomicityCalls, 1, "passing negative gate invokes CLI atomicity once");
const atomicityFailureGate = makeNegativeAtomicityGate(
  { status: "PASS", results: [], unexecutedCaseIds: [] },
  { status: "FAIL", reason: "SYNTHETIC_ATOMICITY_FAILURE" }
);
assert.equal(atomicityFailureGate.result.status, "FAIL", "outer negative gate propagates CLI atomicity failure");
assert.equal(atomicityFailureGate.result.reason, "CLI_ROLLBACK_HISTORY_ATOMICITY_FAILED");
assert.equal(atomicityFailureGate.result.atomicity.reason, "SYNTHETIC_ATOMICITY_FAILURE");

const stopGeneratedBody = balancedFunctionBody("stopGeneratedCliProject");
function makeStopProbe({ cache, inventories, identities = { status: "PASS" }, stopped }) {
  let inventoryIndex = 0;
  let inventoryCalls = 0;
  let stopCalls = 0;
  let observedStopArgs = null;
  const stopGeneratedCliProject = new Function(
    "terminationUnknown",
    "assertRequiredLocalImages",
    "cliProjectInventory",
    "validateCliInventoryImageIdentities",
    "runLocalSupabaseCli",
    `return function stopGeneratedCliProject(workDirectory, projectId, stopArgs = ["stop", "--project-id", projectId, "--no-backup", "--yes"]) ${stopGeneratedBody};`
  )(
    false,
    () => cache,
    () => { inventoryCalls += 1; return inventories[Math.min(inventoryIndex++, inventories.length - 1)]; },
    () => identities,
    (_workDirectory, args) => { stopCalls += 1; observedStopArgs = args; return stopped; }
  );
  const result = stopGeneratedCliProject("C:/tmp/gate1-cli-atomicity-probe", "gate1-ct-paid-v1-a3-999-z9", undefined);
  return { result, inventoryCalls, stopCalls, observedStopArgs };
}
const cacheRejected = makeStopProbe({
  cache: { available: false, reason: "REQUIRED_LOCAL_IMAGE_CACHE_INCOMPLETE" },
  inventories: [{ status: "PASS", resources: [] }],
  stopped: { status: 0, terminationConfirmed: true, signal: "NONE", errorCode: "NONE" }
});
assert.equal(cacheRejected.result.preflightBlocked, true, "stop rejects incomplete image cache before inventory");
assert.equal(cacheRejected.inventoryCalls, 0, "cache rejection performs no inventory");
assert.equal(cacheRejected.stopCalls, 0, "cache rejection performs no stop");
const inventoryRejected = makeStopProbe({
  cache: { available: true },
  inventories: [{ status: "UNKNOWN", code: "CLI_PROJECT_INVENTORY_INCOMPLETE" }],
  stopped: { status: 0, terminationConfirmed: true, signal: "NONE", errorCode: "NONE" }
});
assert.equal(inventoryRejected.result.preflightBlocked, true, "stop rejects unknown inventory before CLI stop");
assert.equal(inventoryRejected.stopCalls, 0, "inventory rejection performs no stop");
const imageRejected = makeStopProbe({
  cache: { available: true },
  inventories: [{ status: "PASS", resources: [{ kind: "container" }] }],
  identities: { status: "MISMATCH", code: "CLI_STOP_IMAGE_ID_DIGEST_MISMATCH" },
  stopped: { status: 0, terminationConfirmed: true, signal: "NONE", errorCode: "NONE" }
});
assert.equal(imageRejected.result.preflightBlocked, true, "stop rejects image identity mismatch before CLI stop");
assert.equal(imageRejected.stopCalls, 0, "image rejection performs no stop");
const residueRejected = makeStopProbe({
  cache: { available: true },
  inventories: [
    { status: "PASS", resources: [{ kind: "container", identity: "container-id" }] },
    { status: "PASS", resources: [{ kind: "container", identity: "container-id" }] }
  ],
  stopped: { status: 0, terminationConfirmed: true, signal: "NONE", errorCode: "NONE" }
});
assert.equal(residueRejected.result.errorCode, "CLI_STOP_RESOURCE_RESIDUE", "confirmed stop with residue fails closed");
assert.equal(residueRejected.stopCalls, 1, "residue check follows exactly one stop");
const unknownAfterStop = makeStopProbe({
  cache: { available: true },
  inventories: [
    { status: "PASS", resources: [] },
    { status: "UNKNOWN", code: "CLI_PROJECT_INVENTORY_UNKNOWN" }
  ],
  stopped: { status: 0, terminationConfirmed: true, signal: "NONE", errorCode: "NONE" }
});
assert.equal(unknownAfterStop.result.errorCode, "CLI_STOP_RESIDUE_UNKNOWN", "unknown post-stop inventory fails closed");
assert.equal(unknownAfterStop.stopCalls, 1, "unknown post-stop inventory follows exactly one stop");
const cleanStop = makeStopProbe({
  cache: { available: true },
  inventories: [
    { status: "PASS", resources: [] },
    { status: "PASS", resources: [] }
  ],
  stopped: { status: 0, terminationConfirmed: true, signal: "NONE", errorCode: "NONE" }
});
assert.equal(cleanStop.result.status, 0, "confirmed stop with empty post-stop inventory passes");
assert.deepEqual(cleanStop.observedStopArgs, ["stop", "--project-id", "gate1-ct-paid-v1-a3-999-z9", "--no-backup", "--yes"], "stop uses the exact generated project stop arguments");

function executeInjectedOuterRun(injectedNegativeStatus, overrides = {}) {
  let negativeCaseCalls = 0;
  let atomicityCalls = 0;
  let cleanupCalls = 0;
  let dockerCalls = 0;
  const consoleLines = [];
  const processProbe = { argv: ["node", "database-integration-contract.mjs"], exitCode: 0, env: {} };
  const negativeMatrix = new Function(
    "runNegativeCase",
    "firstForeignKey",
    "return function runNegativeMatrix(expected, inputRows) " + negativeMatrixBody + ";"
  )(
    (spec) => {
      negativeCaseCalls += 1;
      return { id: spec.id, status: injectedNegativeStatus, reason: "INJECTED_" + injectedNegativeStatus };
    },
    () => ({ table: { name: "comment_translator_paid_usage_events" }, constraint: { name: "usage_event_fk" } })
  );
  const gate = new Function(
    "runNegativeMatrix",
    "runCliRollbackHistoryAtomicCase",
    "return function runNegativeThenAtomicity(expected, inputRows, options) " + negativeAtomicityGateBody + ";"
  )(
    negativeMatrix,
    () => {
      atomicityCalls += 1;
      return { status: "PASS" };
    }
  );
  const outerBody = balancedFunctionBody("run");
  const run = new Function(
    "scope",
    "with (scope) { return function run() " + outerBody + "; }"
  )({
    assert,
    fs: { existsSync: () => true },
    bridgePath: "bridge.sql",
    validateR13Artifact: () => ({ status: "PASS" }),
    validateProductionArtifactBoundary: () => ({ status: "PASS" }),
    validateLegacyInputs: () => [{ fileName: "legacy.sql" }],
    process: processProbe,
    console: { log: (...args) => consoleLines.push(args), error: () => {} },
    runDocker: (args) => {
      dockerCalls += 1;
      if (args[0] === "version") return { exitCode: 0, stdout: "27.0.1\\n", stderr: "" };
      return { exitCode: 0, stdout: "psql (PostgreSQL) 17.6\\n", stderr: "" };
    },
    createDisposableDatabaseRuntime: () => ({ status: "PASS" }),
    container: "injected-container",
    ensureFreshDatabase: overrides.ensureFreshDatabase ?? (() => "postgres"),
    runCleanCase: () => ({ status: "PASS" }),
    runLegacyCase: () => ({ status: "PASS" }),
    runCanonicalCase: () => ({ status: "PASS" }),
    bridgeStatesPath: "bridge-states.json",
    readJson: () => ({ canonical: { functions: [{ name: "ct_paid_assert_current_utc_month" }, { name: "ct_paid_begin_checkout" }] } }),
    runSyntheticCanonicalPreservationCase: () => ({ status: "PASS" }),
    runNegativeThenAtomicity: gate,
    disposableRuntimeResources: {},
    cleanupGeneratedRuntimeResources: () => {
      cleanupCalls += 1;
      return { status: "PASS", removed: 0 };
    },
    inspectOwnedDirectResource: () => { throw new Error("unexpected direct inspection"); },
    removeOwnedDirectResource: () => { throw new Error("unexpected direct removal"); }
  });
  run();
  assert.equal(consoleLines.length, 1, "outer run emits one final report for " + injectedNegativeStatus);
  const report = JSON.parse(consoleLines[0][0]);
  return { report, processProbe, negativeCaseCalls, atomicityCalls, cleanupCalls, dockerCalls };
}
for (const injectedNegativeStatus of ["FAIL", "SETUP_BLOCKED"]) {
  const outer = executeInjectedOuterRun(injectedNegativeStatus);
  assert.equal(outer.report.status, "FAIL", "outer run report fails for injected " + injectedNegativeStatus);
  assert.equal(outer.report.reason, "NEGATIVE_MATRIX_FAILED", "outer report identifies the negative matrix phase");
  assert.equal(outer.processProbe.exitCode, 1, "outer run sets failure exit code");
  assert.equal(outer.negativeCaseCalls, 1, "outer run executes only the first negative case");
  assert.equal(outer.atomicityCalls, 0, "negative failure never invokes CLI atomicity through outer run");
  assert.equal(outer.cleanupCalls, 1, "outer finally always performs cleanup exactly once");
  assert.equal(outer.dockerCalls, 2, "outer run uses only injected Docker probes");
  assert.equal(outer.report.remoteMutations, 0, "negative failure report preserves remote mutation count");
  assert.equal(outer.report.existingRemoteConnections, 0, "negative failure report preserves connection count");
  assert.equal(Object.hasOwn(outer.report, "mutationCounts"), false, "negative failure report omits inaccurate generic mutationCounts");
  assert.ok(outer.report.unverifiedCases.includes("cli-rollback-history-atomicity"), "negative failure report marks CLI atomicity unverified");
  assert.equal(outer.report.generatedResourceCleanup.status, "PASS", "outer report includes finally cleanup result");
  assert.equal(outer.report.negatives.status, "FAIL", "outer report preserves matrix failure status");
  assert.equal(outer.report.negatives.executedCaseCount, 1, "outer report preserves executed negative count");
  assert.equal(outer.report.negatives.results[0].status, injectedNegativeStatus, "outer report preserves injected negative result status");
  assert.deepEqual(outer.report.negatives.unexecutedCaseIds, negativeIds.slice(1), "outer report preserves unexecuted negative IDs");
}

const connectionExceptionSecret = "private-secret-token-connection";
const connectionExceptionOuter = executeInjectedOuterRun("FAIL", {
  ensureFreshDatabase: () => { throw new Error("CLEAN_BOOTSTRAP:CONNECTION_ERROR"); }
});
assert.equal(connectionExceptionOuter.report.status, "FAIL", "outer report fails on clean database setup exception");
assert.equal(connectionExceptionOuter.report.reason, "LOCAL_VERIFICATION_EXCEPTION", "exception report preserves the compatible reason");
assert.equal(connectionExceptionOuter.report.phase, "CLEAN_DATABASE_SETUP", "exception report identifies the clean database setup phase");
assert.equal(connectionExceptionOuter.report.failureClass, "CONNECTION_ERROR", "allowlisted colon failure class is retained");
assert.equal(connectionExceptionOuter.report.remoteMutations, 0, "exception report preserves remote mutation count");
assert.equal(Object.hasOwn(connectionExceptionOuter.report, "mutationCounts"), false, "exception report omits generic mutationCounts");
assert.equal(connectionExceptionOuter.cleanupCalls, 1, "exception path still runs finally cleanup once");
assert.equal(connectionExceptionOuter.atomicityCalls, 0, "exception before matrix never invokes CLI atomicity");
const unknownExceptionOuter = executeInjectedOuterRun("FAIL", {
  ensureFreshDatabase: () => { throw new Error("unexpected internal failure " + connectionExceptionSecret); }
});
assert.equal(unknownExceptionOuter.report.status, "FAIL", "outer report fails on an unknown exception");
assert.equal(unknownExceptionOuter.report.phase, "CLEAN_DATABASE_SETUP", "unknown exception retains the active phase");
assert.equal(unknownExceptionOuter.report.failureClass, "UNKNOWN_ERROR", "unknown exception is fail-closed classified");
assert.doesNotMatch(JSON.stringify(unknownExceptionOuter.report), new RegExp(connectionExceptionSecret), "unknown exception details never enter JSON report");
assert.equal(unknownExceptionOuter.report.remoteMutations, 0, "unknown exception report preserves remote mutation count");
assert.equal(Object.hasOwn(unknownExceptionOuter.report, "mutationCounts"), false, "unknown exception report omits generic mutationCounts");
assert.equal(unknownExceptionOuter.cleanupCalls, 1, "unknown exception path still runs finally cleanup once");

console.log("comment-translator-paid-core-v1-gate1 CLI atomicity order contract: PASS");
