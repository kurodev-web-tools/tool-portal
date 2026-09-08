import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { POSTAPPLY_CATALOG_SQL } from "./lib/comment-translator-paid-core-v1-gate1-postapply-acquire.mjs";
import { parseStrictJson } from "./lib/comment-translator-paid-core-v1-gate1-evidence.mjs";
import { inspectPostApplyCatalogArtifact } from "./lib/comment-translator-paid-core-v1-gate1-postapply-catalog.mjs";
import { CANONICAL_TABLE_NAMES, projectCanonicalStructuralState, assertCanonicalStructuralState, canonicalStructuralEqual } from "./lib/comment-translator-paid-core-v1-gate1-catalog.mjs";

const source = fs.readFileSync(new URL("./comment-translator-paid-core-v1-gate1-database-integration-contract.mjs", import.meta.url), "utf8");
const acquireSource = fs.readFileSync(new URL("./lib/comment-translator-paid-core-v1-gate1-postapply-acquire.mjs", import.meta.url), "utf8");
const factorySource = fs.readFileSync(new URL("./comment-translator-paid-core-v1-gate1-postapply-catalog-contract.mjs", import.meta.url), "utf8");
function extract(text, name) {
  const start = text.indexOf("function " + name + "(");
  assert.ok(start >= 0, name);
  // Harness helpers have explicit top-level function boundaries. Factory functions
  // use ordinary signatures, so use brace parsing to exclude following test code.
  let body = text.indexOf(") {", start) + 2;
  assert.ok(body > start);
  let depth = 0, quote = null, escaped = false;
  for (let i = body; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") { quote = c; continue; }
    if (c === "{") depth++;
    if (c === "}") { depth--; if (depth === 0) return text.slice(start, i + 1); }
  }
  throw Error("unterminated " + name);
}
function load(name, bindings = {}, text = source) {
  return new Function(...Object.keys(bindings), extract(text, name) + "\nreturn " + name + ";")(...Object.values(bindings));
}
const clone = structuredClone;
const factoryNames = ["zeroDependencyCounts", "cleanState", "makeCanonicalTable", "stripCanonicalRowCounts", "archiveTable", "archiveFunction", "archiveTrigger", "makeArchiveState", "makeEdge", "makeHistory", "makeFixture"];
const makeFixture = new Function("readJson", "clone", "CANONICAL_TABLE_NAMES", "ARCHIVE_SCHEMA",
  factoryNames.map((name) => extract(factorySource, name)).join("\n") + "\nreturn makeFixture;")(
    (file) => JSON.parse(fs.readFileSync(file, "utf8")), clone, CANONICAL_TABLE_NAMES, "comment_translator_paid_legacy_archive");
const fixture = makeFixture("production");
const row = Object.fromEntries(["readOnly", "history", "canonical", "archive", "sourceEra", "edgeScopeVersion", "pgDependEdges"].map((key) => [key, clone(fixture.artifact[key])]));
row.sourceEra = { tables: [], functions: [], triggers: [], dependencyCounts: Object.fromEntries(Object.keys(row.sourceEra.dependencyCounts).map((key) => [key, 0])) };
row.pgDependEdges.sourceEra = [];
const normalize = load("normalizeLocalPostapplyArtifact");
const collectorNormalize = load("sortArtifactRows", {}, acquireSource);
const shuffled = clone(fixture.artifact);
for (const scope of ["canonical", "archive", "sourceEra"]) {
  for (const key of ["tables", "functions", "triggers"]) shuffled[scope][key].reverse();
  shuffled.pgDependEdges[scope].reverse();
  for (const edge of shuffled.pgDependEdges[scope]) {
    edge.dependent = Object.fromEntries(Object.entries(edge.dependent).reverse());
    edge.referenced = Object.fromEntries(Object.entries(edge.referenced).reverse());
  }
}
const shuffleBefore = clone(shuffled);
assert.deepEqual(normalize(shuffled), collectorNormalize(shuffled), "actual normalization agrees with collector");
assert.deepEqual(shuffled, shuffleBefore, "normalization preserves input");
const migrations = fixture.artifact.history.rows.map(({ version, name }) => version + "_" + name + ".sql");
const inspectBindings = {
  assert, normalizeLocalPostapplyArtifact: normalize, repositoryMigrationNames: () => migrations,
  assertCanonicalStructuralState, projectCanonicalStructuralState, canonicalStructuralEqual,
  readJson: () => ({ canonical: clone(fixture.expectations.canonical) }), bridgeStatesPath: "fixture",
  inspectPostApplyCatalogArtifact, crypto, POSTAPPLY_CATALOG_SQL
};
const observe = load("assertLocalPostapplyObservation", inspectBindings);
const observation = observe(row);
assert.equal(observation.productionShape, "NOT_ESTABLISHED");
assert.equal(observation.hostedEvidence, false);
assert.equal(observation.shapeRefusal, "source-era-mismatch");
assert.equal(observation.migrationHistoryCount, 56);
for (const mutate of [
  (x) => { x.history.rows[0].name += "_drift"; },
  (x) => { x.canonical.tables[0].owner = "other"; },
  (x) => { x.readOnly.defaultTransactionReadOnly = "off"; },
  (x) => { x.archive.tables.pop(); },
  (x) => { x.archive.tables[0].rowCount = 1; },
  (x) => { x.sourceEra.tables = clone(fixture.artifact.sourceEra.tables); }
]) {
  const changed = clone(row); mutate(changed);
  assert.throws(() => observe(changed), "independent mismatch or unexpected inspector rejection cannot pass");
}
for (const inspection of [
  { status: "POSTAPPLY_CATALOG_SHAPE_VALID", reason: null },
  { status: "POSTAPPLY_CATALOG_SHAPE_INVALID", reason: "canonical-mismatch" }
]) assert.throws(() => load("assertLocalPostapplyObservation", { ...inspectBindings, inspectPostApplyCatalogArtifact: () => inspection })(row));

const successfulCapture = { exitCode: 0, signal: "NONE", errorCode: "NONE", terminationUnknown: false, captureFailure: false, stdout: JSON.stringify(row) + "\n", stderr: "" };
function reader(capture = successfulCapture) {
  const calls = [];
  const read = load("readLocalPostapplyRow", {
    verifiedPostapplyContainer: (id) => { calls.push(["verify", id]); return "a".repeat(64); },
    runDocker: (...args) => { calls.push(args); return capture; }, POSTAPPLY_CATALOG_SQL, parseStrictJson, Buffer
  });
  return { read, calls };
}
const good = reader(); assert.deepEqual(clone(good.read("owned")), row);
assert.deepEqual(good.calls[0], ["verify", "owned"]);
assert.deepEqual(good.calls[1][0], ["exec", "--interactive", "--env", "PGOPTIONS=-c default_transaction_read_only=on", "a".repeat(64), "psql", "--no-psqlrc", "--no-password", "--quiet", "--tuples-only", "--no-align", "--set=ON_ERROR_STOP=1", "--username=postgres", "--dbname=postgres"]);
assert.equal(good.calls[1][1], POSTAPPLY_CATALOG_SQL);
assert.deepEqual(good.calls[1][2], { captureByteLimit: 1024 * 1024 });
for (const patch of [
  { exitCode: 1 }, { signal: "SIGTERM" }, { errorCode: "ETIMEDOUT" },
  { terminationUnknown: true }, { captureFailure: true }, { captureFailure: undefined },
  { stdout: null }, { stderr: "private warning" }, { stdout: "é".repeat(524289) }
]) assert.throws(() => reader({ ...successfulCapture, ...patch }).read("owned"), /POSTAPPLY_QUERY_CAPTURE_INVALID/);
for (const stdout of ["", "{}\n{}", "{", '{"readOnly":null,"readOnly":null}', "{}"]) {
  assert.throws(() => reader({ ...successfulCapture, stdout }).read("owned"), /POSTAPPLY_QUERY_(ROW_COUNT|JSON_INVALID|ROW_SHAPE)/);
}

const postgresImage = "fixture-postgres";
const cache = { [postgresImage]: { id: "sha256:db", reference: postgresImage, repoDigest: "fixture@digest" } };
const container = { Id: "a".repeat(64), Name: "/db-owned", Created: "fixed", Image: "sha256:db", Config: { Image: postgresImage, Labels: { "com.supabase.cli.project": "owned", "com.docker.compose.project": "owned" } }, State: { Running: true } };
function resolver({ resource = container, current = container, resources = [{ kind: "container", value: resource }], inventoryStatus = "PASS", images = true } = {}) {
  return load("verifiedPostapplyContainer", {
    assertRequiredLocalImages: () => ({ available: images }), cliProjectInventory: () => ({ status: inventoryStatus, resources }),
    cliCachedImageInventory: cache, disposableDatabaseImage: postgresImage,
    inspectDockerResource: (kind, id) => { assert.equal(kind, "container"); assert.equal(id, resource.Id); return { status: "PRESENT", value: current }; },
    resourceLabels: (value) => value.Config?.Labels ?? {}
  });
}
assert.equal(resolver()("owned"), container.Id);
for (const mutate of [
  (x) => { x.Id = "b".repeat(64); }, (x) => { x.Image = "sha256:other"; },
  (x) => { x.Config.Image = "other"; }, (x) => { x.Created = "new"; },
  (x) => { x.Name = "/other"; }, (x) => { x.State.Running = false; },
  (x) => { x.Config.Labels["com.supabase.cli.project"] = "foreign"; },
  (x) => { x.Config.Labels["com.docker.compose.project"] = "foreign"; }
]) { const current = clone(container); mutate(current); assert.throws(() => resolver({ current })("owned")); }
assert.throws(() => resolver({ resources: [] })("owned"));
assert.throws(() => resolver({ resources: [{ kind: "container", value: container }, { kind: "container", value: container }] })("owned"));
assert.throws(() => resolver({ inventoryStatus: "UNKNOWN" })("owned"));
assert.throws(() => resolver({ images: false })("owned"));

let nativeCalls = [], latched = false;
const nativeBindings = {
  dockerMaxBufferBytes: 64 * 1024 * 1024, dockerControlTimeoutMs: 60000,
  terminationUnknown: false, verifiedDockerTransportOrNull: () => ({ environment: { FIXTURE: "minimal" } }),
  dockerCli: "docker-fixture", root: "fixture", latchTerminationUnknown: () => { latched = true; },
  completeNativeCapture: load("completeNativeCapture", { Buffer, dockerMaxBufferBytes: 64 * 1024 * 1024 }),
  spawnSync: (...args) => { nativeCalls.push(args); return { status: 0, stdout: "", stderr: "" }; }
};
const native = load("runNativeDocker", nativeBindings);
native(["info"]);
assert.equal(nativeCalls[0][2].maxBuffer, 64 * 1024 * 1024);
native(["exec"], "sql", { captureByteLimit: 1024 * 1024 });
assert.equal(nativeCalls[1][2].maxBuffer, 1024 * 1024);
assert.equal(nativeCalls[1][2].timeout, 60000);
assert.equal(nativeCalls[1][2].shell, false);
assert.equal(nativeCalls[1][2].windowsHide, true);
for (const limit of [0, -1, 1.5, "1", NaN, Infinity, 64 * 1024 * 1024 + 1]) {
  const count = nativeCalls.length;
  assert.throws(() => native([], "", { captureByteLimit: limit }), /DOCKER_CAPTURE_LIMIT_INVALID/);
  assert.equal(nativeCalls.length, count, "invalid limit fails before spawn");
}
for (const result of [
  { status: null, stdout: "", stderr: "", error: { code: "ETIMEDOUT" } },
  { status: 0, stdout: "", stderr: "", signal: "SIGTERM" },
  { status: 0, stdout: Buffer.from("x"), stderr: "" }
]) {
  latched = false;
  const failed = load("runNativeDocker", { ...nativeBindings, spawnSync: () => result })([], "", { captureByteLimit: 1024 * 1024 });
  assert.equal(failed.captureFailure, true);
  assert.equal(latched, true);
}

function lifecycle(failAt = "", badObservation = false, cleanupFails = false) {
  const events = [], writes = [];
  const cli = (_directory, args) => {
    const stage = args[0] === "db" ? "reset" : args[0] === "migration" ? "up" : args[0];
    events.push(stage);
    return { status: stage === failAt ? 1 : 0, signal: "NONE", errorCode: "NONE" };
  };
  const runCase = load("runCliPostapplyQueryCase", {
    fs: { existsSync: () => true, mkdtempSync: (prefix) => {
      assert.match(path.basename(prefix), /^gate1-cli-(?:atomicity|bridge-replay)-/);
      return "fixture-owned";
    }, mkdirSync() {}, lstatSync: () => ({ isSymbolicLink: () => false }), writeFileSync: (file, data) => { writes.push([file, String(data)]); } },
    path, os: { tmpdir: () => "fixture-temp" }, assert, supabaseCliPath: "fixture-cli", cliCachedImageInventory: null,
    cliVersionResult: () => ({ status: "PASS" }), assertRequiredLocalImages: () => ({ available: true }),
    runLocalSupabaseCli: cli, configureDisposableCliRuntime: () => ({ projectId: "owned", ports: { db: 1 } }),
    cliExcludedServices: "fixture-exclusions", cliRuntimeIdentity: () => ({ postgresMajor: 17 }),
    repositoryMigrationNamesBeforeBridge: () => ["20260101000000_before.sql"],
    repositoryMigrationNames: () => ["20260101000000_before.sql", "20260811000000_bridge.sql", "20260904000000_after.sql"],
    canonicalMigrationBytes: (name) => Buffer.from("original-" + name),
    canonicalSourceBytes: () => Buffer.from("legacy;"), splitRecoveredSql: () => ["legacy;"], legacyDir: "fixture-legacy",
    verifiedPostapplyContainer: () => "a".repeat(64), bridgePath: "20260811000000_bridge.sql",
    runDockerDiscardingOutput: () => { events.push("bootstrap"); return { exitCode: failAt === "bootstrap" ? 1 : 0 }; },
    readLocalPostapplyRow: () => { events.push("query"); if (failAt === "query") throw Error("private sentinel"); return clone(row); },
    assertLocalPostapplyObservation: (value) => { events.push("validate"); if (badObservation) value.history.rows.pop(); return observe(value); },
    classifyLocalCliResult: () => "FIXED_FAILURE", localCliFailureDiagnostics: () => ({ failureClass: "FIXED_FAILURE" }),
    safeCaseReason: () => "SANITIZED", cliStartAttemptedProjects: new Set(["owned"]),
    stopGeneratedCliProject: () => ({ status: 0 }), removeGeneratedCliWorkDirectory() {},
    cleanupGeneratedRuntimeResources: (args) => { events.push("cleanup"); assert.equal(args.workDirectory, "fixture-owned"); args.stopCli("owned"); return { status: cleanupFails ? "FAIL" : "PASS" }; }
  });
  return { result: runCase([{ fileName: "legacy.sql" }]), events, writes };
}
const happy = lifecycle();
assert.equal(happy.result.status, "PASS");
assert.deepEqual(happy.events, ["init", "start", "status", "reset", "bootstrap", "up", "query", "validate", "cleanup"]);
assert.ok(happy.writes.some(([name, sql]) => name.endsWith("20260811000000_bridge.sql") && sql === "original-20260811000000_bridge.sql"));
assert.ok(happy.writes.every(([, sql]) => !sql.includes("gate1-atomicity-test")));
for (const stage of ["init", "start", "status", "reset", "bootstrap", "up", "query"]) {
  const failure = lifecycle(stage);
  assert.notEqual(failure.result.status, "PASS", stage);
  assert.equal(failure.events.at(-1), "cleanup", stage);
  assert.equal(failure.events.filter((event) => event === "cleanup").length, 1);
  assert.equal(JSON.stringify(failure.result).includes("private sentinel"), false);
}
assert.equal(lifecycle("", true).result.status, "FAIL");
assert.equal(lifecycle("", false, true).result.reason, "GENERATED_RESOURCE_CLEANUP_FAILED");
let directoryExists = true, removeCount = 0;
const temporaryRoot = path.resolve("fixture-temp");
const ownedDirectory = path.join(temporaryRoot, "gate1-cli-atomicity-fixture");
const realpathFixture = { native: (value) => value };
const removeDirectory = load("removeGeneratedCliWorkDirectory", {
  terminationUnknown: false, path, process: { platform: process.platform }, os: { tmpdir: () => temporaryRoot },
  fs: {
    lstatSync: () => {
      if (!directoryExists) throw Object.assign(new Error("absent"), { code: "ENOENT" });
      return { isSymbolicLink: () => false };
    },
    realpathSync: realpathFixture,
    rmSync: (value) => { assert.equal(value, ownedDirectory); directoryExists = false; removeCount++; }
  }
});
removeDirectory(ownedDirectory);
assert.equal(removeCount, 1, "actual cleanup accepts the new phase's existing prefix");
assert.throws(() => removeDirectory(path.resolve("outside", "gate1-cli-atomicity-fixture")), /CLI_WORK_DIRECTORY_SCOPE_INVALID/);
assert.match(source, /process\.argv\.includes\("--phase=postapply-query"\)/);
console.log("postapply-query tests passed (native boundary, ownership, independent comparisons, expected refusal, cleanup; actual IO=0)");
