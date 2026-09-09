import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";

import {
  POSTAPPLY_CATALOG_SQL,
  collectPostApplyCatalogObservation
} from "./lib/comment-translator-paid-core-v1-gate1-postapply-acquire.mjs";
import { parseStrictJson, POSTAPPLY_MAX_OUTPUT_BYTES } from "./lib/comment-translator-paid-core-v1-gate1-evidence.mjs";
import * as preflightModule from "./comment-translator-paid-core-v1-gate1-preflight-readonly.mjs";
import { CANONICAL_TABLE_NAMES } from "./lib/comment-translator-paid-core-v1-gate1-catalog.mjs";
import { inspectPostApplyCatalogArtifact } from "./lib/comment-translator-paid-core-v1-gate1-postapply-catalog.mjs";

const SOURCE = fs.readFileSync(new URL("./lib/comment-translator-paid-core-v1-gate1-postapply-acquire.mjs", import.meta.url), "utf8");
assert.match(SOURCE, /const MAX_OUTPUT_BYTES = POSTAPPLY_MAX_OUTPUT_BYTES;/, "extracted parser and collector use the shared production bound");
const VALID_REQUEST = {
  target: "preview",
  sourceCommit: "0123456789abcdef0123456789abcdef01234567",
  migrationCorpusSha256: "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
  targetBindingSha256: "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
};

function clone(value) {
  return structuredClone(value);
}

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} exists`);
  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    if (quote !== null) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (["'", '"', "`"].includes(character)) {
      quote = character;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`${name} function is unterminated`);
}

function assertUnavailable(result, reason, label) {
  assert.equal(result.status, "POSTAPPLY_CATALOG_UNAVAILABLE", `${label}: status`);
  assert.equal(result.reason, reason, `${label}: reason`);
  assert.equal(result.remoteCalls, 0, `${label}: no query process attempt`);
  assert.equal(result.mutations, 0, `${label}: no mutation`);
  assert.equal(Object.keys(result).includes("artifact"), false, `${label}: full artifact is internal`);
}

for (const [label, request] of [
  ["missing request", undefined],
  ["null request", null],
  ["unknown request key", { ...VALID_REQUEST, extra: true }],
  ["wrong target", { ...VALID_REQUEST, target: "staging" }],
  ["uppercase commit", { ...VALID_REQUEST, sourceCommit: VALID_REQUEST.sourceCommit.toUpperCase() }],
  ["wrong commit type", { ...VALID_REQUEST, sourceCommit: 123 }],
  ["uppercase corpus digest", { ...VALID_REQUEST, migrationCorpusSha256: VALID_REQUEST.migrationCorpusSha256.toUpperCase() }],
  ["short binding digest", { ...VALID_REQUEST, targetBindingSha256: "0".repeat(63) }]
]) {
  assertUnavailable(await collectPostApplyCatalogObservation(request), "POSTAPPLY_CATALOG_REQUEST_INVALID", label);
}

const savedBindingJson = process.env.GATE1_TARGET_BINDING_JSON;
const savedBindingDigest = process.env.GATE1_TARGET_BINDING_SHA256;
delete process.env.GATE1_TARGET_BINDING_JSON;
delete process.env.GATE1_TARGET_BINDING_SHA256;
const missingBinding = await collectPostApplyCatalogObservation(VALID_REQUEST);
if (savedBindingJson === undefined) delete process.env.GATE1_TARGET_BINDING_JSON;
else process.env.GATE1_TARGET_BINDING_JSON = savedBindingJson;
if (savedBindingDigest === undefined) delete process.env.GATE1_TARGET_BINDING_SHA256;
else process.env.GATE1_TARGET_BINDING_SHA256 = savedBindingDigest;
assertUnavailable(missingBinding, "POSTAPPLY_CATALOG_TARGET_BINDING_MISSING", "valid request without binding");

const rowShape = {
  schemaVersion: 2,
  target: "preview",
  sourceCommit: VALID_REQUEST.sourceCommit,
  migrationCorpusSha256: VALID_REQUEST.migrationCorpusSha256,
  targetBindingSha256: VALID_REQUEST.targetBindingSha256,
  readOnly: {
    serverVersionMajor: "17",
    transactionReadOnly: "on",
    defaultTransactionReadOnly: "on",
    transactionIsolation: "repeatable read"
  },
  canonical: { tables: [{ schema: "public", name: "observed", rowCount: 7 }] }
};
const shapeResult = inspectPostApplyCatalogArtifact(rowShape);
assert.equal(shapeResult.status, "POSTAPPLY_CATALOG_SHAPE_INVALID", "incomplete artifact is refused");
assert.equal(shapeResult.reason, "invalid-input", "incomplete artifact uses sanitized reason");
assert.equal(Object.prototype.propertyIsEnumerable.call(shapeResult, "canonicalRowCounts"), false, "row observations are internal");
assert.deepEqual(shapeResult.canonicalRowCounts, [{ schema: "public", name: "observed", rowCount: 7 }]);
assert.equal(JSON.stringify(shapeResult).includes("observed"), false, "row observations are absent from public JSON");
const shapeBefore = clone(rowShape);
const originalReadFileSync = fs.readFileSync;
try {
  fs.readFileSync = () => { throw new Error("unexpected inspector I/O"); };
  inspectPostApplyCatalogArtifact(rowShape);
} finally {
  fs.readFileSync = originalReadFileSync;
}
assert.deepEqual(rowShape, shapeBefore, "shape inspection does not mutate its input");

const parseStart = SOURCE.indexOf("function parseSingleJsonRow(");
const parseEnd = SOURCE.indexOf("function sortArtifactRows(", parseStart);
assert.ok(parseStart >= 0 && parseEnd > parseStart, "private row parser is bounded in source");
const parseSingleJsonRow = new Function("Buffer", "MAX_OUTPUT_BYTES", "parseStrictJson", "exactKeys", "ROW_KEYS", `${SOURCE.slice(parseStart, parseEnd)}; return parseSingleJsonRow;`)(
  Buffer,
  POSTAPPLY_MAX_OUTPUT_BYTES,
  parseStrictJson,
  (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).length === keys.length
    && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key)),
  ["readOnly", "history", "canonical", "archive", "sourceEra", "edgeScopeVersion", "pgDependEdges"]
);
const minimalRow = JSON.stringify({
  readOnly: null,
  history: null,
  canonical: null,
  archive: null,
  sourceEra: null,
  edgeScopeVersion: 1,
  pgDependEdges: null
});
assert.deepEqual(Object.keys(parseSingleJsonRow(minimalRow, 1)), [
  "readOnly", "history", "canonical", "archive", "sourceEra", "edgeScopeVersion", "pgDependEdges"
], "sole row parser accepts the exact row key set");
assert.throws(() => parseSingleJsonRow('{"readOnly":null,"readOnly":null,"history":null,"canonical":null,"archive":null,"sourceEra":null,"edgeScopeVersion":1,"pgDependEdges":null}', 1), "duplicate JSON keys are refused");
assert.throws(() => parseSingleJsonRow(`${minimalRow}\n${minimalRow}`, 2), "multiple JSON rows are refused");
assert.throws(() => parseSingleJsonRow(minimalRow.slice(0, -1), 1), "truncated JSON is refused");

const extractedRequestIsValid = new Function(
  "exactKeys", "REQUEST_KEYS", "COMMIT_PATTERN", "SHA256_PATTERN",
  extractFunction(SOURCE, "requestIsValid") + "; return requestIsValid;"
)(
  (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key)),
  ["target", "sourceCommit", "migrationCorpusSha256", "targetBindingSha256"],
  /^[a-f0-9]{40}$/,
  /^[a-f0-9]{64}$/
);

const extractedSummaryOf = new Function(
  "inspectPostApplyCatalogArtifact",
  extractFunction(SOURCE, "summaryOf") + "\nreturn summaryOf;"
)(inspectPostApplyCatalogArtifact);
const extractedResult = new Function(
  "summaryOf",
  extractFunction(SOURCE, "result") + "\nreturn result;"
)(extractedSummaryOf);
const extractedUnavailable = new Function(
  "result", "UNAVAILABLE_STATUS",
  extractFunction(SOURCE, "unavailable") + "\nreturn unavailable;"
)(extractedResult, "POSTAPPLY_CATALOG_UNAVAILABLE");
const extractedSortArtifactRows = new Function(
  extractFunction(SOURCE, "sortArtifactRows") + "\nreturn sortArtifactRows;"
)();

const fixtureContractSource = fs.readFileSync(new URL("./comment-translator-paid-core-v1-gate1-postapply-catalog-contract.mjs", import.meta.url), "utf8");
const readFixtureJson = (relativePath) => JSON.parse(fs.readFileSync(new URL("../" + relativePath, import.meta.url), "utf8"));
const fixtureFunctionSource = [
  "zeroDependencyCounts", "cleanState", "makeCanonicalTable", "stripCanonicalRowCounts",
  "archiveTable", "archiveFunction", "archiveTrigger", "makeArchiveState", "makeEdge",
  "makeHistory", "makeFixture"
].map((name) => extractFunction(fixtureContractSource, name)).join("\n");
const fixtureFactory = new Function(
  "readJson", "clone", "CANONICAL_TABLE_NAMES", "ARCHIVE_SCHEMA",
  fixtureFunctionSource + "\nreturn makeFixture;"
)(
  readFixtureJson,
  clone,
  CANONICAL_TABLE_NAMES,
  "comment_translator_paid_legacy_archive"
);

const caBytes = Buffer.from("controlled postapply CA", "utf8");
const caPath = "C:/fixture/ca.pem";
function makeFixtureFs(state) {
  return {
    lstatSync(pathValue) {
      state.caReads += 1;
      return { isFile: () => pathValue === caPath };
    },
    readFileSync(pathValue) {
      state.caReads += 1;
      if (pathValue !== caPath) throw new Error("unexpected CA path");
      return caBytes;
    }
  };
}
const caSha256 = createHash("sha256").update(caBytes).digest("hex");
const isolatedBindingBase = {
  schemaVersion: 1,
  connectionMode: "direct",
  projectRef: "fixtureproject",
  host: "db.fixtureproject.supabase.co",
  database: "postgres",
  user: "postgres",
  port: 5432,
  sslMode: "verify-full",
  caSha256
};
function makeIsolated(target) {
  const binding = { ...isolatedBindingBase, target };
  const bindingDigest = preflightModule.computeBindingSha256(binding);
  const environment = {
    PATH: "C:/Windows/System32",
    PGHOST: binding.host,
    PGPORT: "5432",
    PGDATABASE: "postgres",
    PGUSER: "postgres",
    PGSSLMODE: "verify-full",
    PGSSLROOTCERT: caPath,
    PGPASSWORD: "fixture-password",
    GATE1_TARGET_BINDING_JSON: JSON.stringify(binding),
    GATE1_TARGET_BINDING_SHA256: bindingDigest
  };
  return {
    binding,
    bindingDigest,
    environment,
    request: { ...VALID_REQUEST, target, targetBindingSha256: bindingDigest }
  };
}
function rowFor(target) {
  const fixture = fixtureFactory(target);
  const inspection = inspectPostApplyCatalogArtifact(fixture.artifact);
  assert.equal(inspection.status, "POSTAPPLY_CATALOG_SHAPE_VALID", target + " control artifact is accepted by the actual inspector");
  return {
    readOnly: fixture.artifact.readOnly,
    history: fixture.artifact.history,
    canonical: fixture.artifact.canonical,
    archive: fixture.artifact.archive,
    sourceEra: fixture.artifact.sourceEra,
    edgeScopeVersion: fixture.artifact.edgeScopeVersion,
    pgDependEdges: fixture.artifact.pgDependEdges
  };
}

function makeExtractedCollector({ target = "preview", versionResult = { status: 0, stdout: "psql (PostgreSQL) 17.6", stderr: "" }, queryResult = null, bindingRawOverride = null, digestOverride = null } = {}) {
  const isolated = makeIsolated(target);
  const state = { nativeCalls: [], caReads: 0 };
  const fixtureFs = makeFixtureFs(state);
  const processFixture = { env: { ...isolated.environment } };
  if (bindingRawOverride !== null) processFixture.env.GATE1_TARGET_BINDING_JSON = bindingRawOverride;
  if (digestOverride !== null) processFixture.env.GATE1_TARGET_BINDING_SHA256 = digestOverride;
  const collectorSource = ("async " + extractFunction(SOURCE, "collectPostApplyCatalogObservation"))
    .replace('preflight = await import("../comment-translator-paid-core-v1-gate1-preflight-readonly.mjs");', "preflight = await loadPreflight();")
    .replace("preflight.buildPsqlInvocation(binding, process.env)", "preflight.buildPsqlInvocation(binding, process.env, fsApi)");
  const collector = new Function(
    "requestIsValid", "unavailable", "result", "POSTAPPLY_STATUS", "REASONS",
    "process", "loadPreflight", "POSTAPPLY_CATALOG_SQL", "spawnSync", "fsApi",
    "sortArtifactRows", "inspectPostApplyCatalogArtifact", "parseSingleJsonRow", "MAX_OUTPUT_BYTES",
    collectorSource + "; return collectPostApplyCatalogObservation;"
  )(
    extractedRequestIsValid,
    extractedUnavailable,
    extractedResult,
    "POSTAPPLY_CATALOG_OBSERVED",
    {
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
    },
    processFixture,
    async () => preflightModule,
    POSTAPPLY_CATALOG_SQL,
    (command, args, options) => {
      state.nativeCalls.push({ command, args, options });
      if (args[0] === "--version") return versionResult;
      return queryResult ?? { status: 0, stdout: JSON.stringify(rowFor(target)), stderr: "" };
    },
    fixtureFs,
    extractedSortArtifactRows,
    inspectPostApplyCatalogArtifact,
    parseSingleJsonRow,
    POSTAPPLY_MAX_OUTPUT_BYTES
  );
  return { collector, state, processFixture, isolated };
}

for (const target of ["preview", "production"]) {
  const fixture = makeExtractedCollector({ target });
  const observed = await fixture.collector(fixture.isolated.request);
  assert.equal(observed.status, "POSTAPPLY_CATALOG_OBSERVED", target + ": controlled collector succeeds");
  assert.equal(observed.remoteCalls, 1, target + ": one query process attempt");
  assert.equal(observed.mutations, 0, target + ": no mutation");
  assert.equal(observed.target, target);
  assert.equal(Object.prototype.propertyIsEnumerable.call(observed, "artifact"), false, target + ": artifact is internal");
  assert.equal(fixture.state.nativeCalls.length, 2, target + ": version probe precedes one query");
  assert.deepEqual(fixture.state.nativeCalls[0].args, ["--version"], target + ": version argv is fixed");
  assert.deepEqual(fixture.state.nativeCalls[1].args, ["--no-psqlrc", "--no-password", "--quiet", "--tuples-only", "--no-align", "--set=ON_ERROR_STOP=1", "--dbname=postgres"], target + ": query argv is fixed");
  assert.equal(fixture.state.nativeCalls[1].options.input, POSTAPPLY_CATALOG_SQL, target + ": fixed SQL reaches native query");
  assert.equal(fixture.state.nativeCalls[0].options.timeout, 10 * 1000);
  assert.equal(fixture.state.nativeCalls[1].options.timeout, 60 * 1000);
  assert.equal(fixture.state.nativeCalls[0].options.shell, false);
  assert.equal(fixture.state.nativeCalls[0].options.windowsHide, true);
  assert.equal(fixture.state.nativeCalls[1].options.env.PGHOST, fixture.isolated.binding.host);
  assert.equal(fixture.state.nativeCalls[1].options.env.PGPASSWORD, "fixture-password");
  assert.equal(fixture.state.nativeCalls[1].options.env.DATABASE_URL, undefined);
  assert.ok(fixture.state.caReads > 0, target + ": CA is read only after binding validation");
}

for (const [label, options, reason] of [
  ["malformed binding", { bindingRawOverride: "{malformed" }, "POSTAPPLY_CATALOG_TARGET_BINDING_INVALID"],
  ["binding digest mismatch", { digestOverride: "c".repeat(64) }, "POSTAPPLY_CATALOG_TARGET_BINDING_DIGEST_MISMATCH"]
]) {
  const fixture = makeExtractedCollector(options);
  const result = await fixture.collector(fixture.isolated.request);
  assert.equal(result.status, "POSTAPPLY_CATALOG_UNAVAILABLE", label + ": blocked");
  assert.equal(result.reason, reason, label + ": reason");
  assert.equal(result.remoteCalls, 0, label + ": no native attempt");
  assert.equal(fixture.state.caReads, 0, label + ": CA is not read before binding acceptance");
  assert.equal(fixture.state.nativeCalls.length, 0, label + ": native process not reached");
}
const wrongTarget = makeExtractedCollector({ target: "production" });
const wrongTargetResult = await wrongTarget.collector({ ...wrongTarget.isolated.request, target: "preview" });
assert.equal(wrongTargetResult.reason, "POSTAPPLY_CATALOG_CONNECTION_BINDING_MISMATCH", "wrong target binding is blocked before CA/native access");
assert.equal(wrongTargetResult.remoteCalls, 0);
assert.equal(wrongTarget.state.caReads, 0);
assert.equal(wrongTarget.state.nativeCalls.length, 0);

const versionFailure = makeExtractedCollector({ versionResult: { status: 1, stdout: "psql (PostgreSQL) 17.6", stderr: "" } });
const versionBlocked = await versionFailure.collector(versionFailure.isolated.request);
assert.equal(versionBlocked.reason, "POSTAPPLY_CATALOG_CONNECTION_FAILED", "version failure is sanitized");
assert.equal(versionBlocked.remoteCalls, 0, "version failure counts zero query attempts");
assert.equal(versionFailure.state.nativeCalls.length, 1, "version failure never starts query");

for (const [label, queryResult] of [
  ["query nonzero", { status: 1, stdout: JSON.stringify(rowFor("preview")), stderr: "" }],
  ["query error", { status: 0, error: new Error("native"), stdout: JSON.stringify(rowFor("preview")), stderr: "" }],
  ["query signal", { status: 0, signal: "SIGTERM", stdout: JSON.stringify(rowFor("preview")), stderr: "" }],
  ["query stderr", { status: 0, stdout: JSON.stringify(rowFor("preview")), stderr: "warning" }],
  ["query timeout", { status: null, signal: "SIGTERM", stdout: "", stderr: "" }],
  ["query aggregate overflow", { status: 0, stdout: "x".repeat(1024 * 1024), stderr: "x", error: new Error("overflow") }]
]) {
  const fixture = makeExtractedCollector({ queryResult });
  const failed = await fixture.collector(fixture.isolated.request);
  assert.equal(failed.status, "POSTAPPLY_CATALOG_UNAVAILABLE", label + ": sanitized status");
  assert.equal(failed.reason, "POSTAPPLY_CATALOG_CONNECTION_FAILED", label + ": sanitized reason");
  assert.equal(failed.remoteCalls, 1, label + ": one attempted query");
  assert.equal(fixture.state.nativeCalls.length, 2, label + ": version plus one query");
}

for (const bytes of [1133757, 4 * 1024 * 1024]) {
  const json = JSON.stringify(rowFor('production'));
  const stdout = json + ' '.repeat(bytes - Buffer.byteLength(json));
  const f = makeExtractedCollector({ target: 'production', queryResult: { status: 0, stdout, stderr: '' } });
  assert.equal((await f.collector(f.isolated.request)).status, 'POSTAPPLY_CATALOG_OBSERVED', 'large complete catalog accepted');
  assert.equal(f.state.nativeCalls[0].options.maxBuffer, 1024 * 1024, 'version limit unchanged');
  assert.equal(f.state.nativeCalls[1].options.maxBuffer, 4 * 1024 * 1024, 'catalog native limit');
}
for (const queryResult of [
  { status: 0, stdout: 'x'.repeat(4 * 1024 * 1024 + 1), stderr: '' },
  { status: 0, stdout: '界'.repeat(Math.floor(4 * 1024 * 1024 / 3) + 1), stderr: '' },
  { status: 0, stdout: JSON.stringify(rowFor('production')), stderr: '', error: { code: 'ENOBUFS' } },
  { status: 0, stdout: JSON.stringify(rowFor('production')), stderr: '', signal: 'SIGTERM' }
]) {
  const f = makeExtractedCollector({ target: 'production', queryResult });
  const r = await f.collector(f.isolated.request);
  assert.equal(r.status, 'POSTAPPLY_CATALOG_UNAVAILABLE');
  assert.equal(r.artifact, null);
  assert.equal(f.state.nativeCalls.length, 2, 'no retry on capture failure');
}
const malformedRowFixture = makeExtractedCollector({
  queryResult: { status: 0, stdout: JSON.stringify({ readOnly: null }), stderr: "" }
});
const malformedRowResult = await malformedRowFixture.collector(malformedRowFixture.isolated.request);
assert.equal(malformedRowResult.status, "POSTAPPLY_CATALOG_UNAVAILABLE", "malformed row is sanitized");
assert.equal(malformedRowResult.reason, "POSTAPPLY_CATALOG_JSON_INVALID", "malformed row reason is fixed");
assert.equal(malformedRowResult.remoteCalls, 1);

const sortFailureFixture = makeExtractedCollector({
  queryResult: { status: 0, stdout: JSON.stringify({
    readOnly: null, history: null, canonical: null, archive: null, sourceEra: null,
    edgeScopeVersion: 1, pgDependEdges: null
  }), stderr: "" }
});
const sortFailure = await sortFailureFixture.collector(sortFailureFixture.isolated.request);
assert.equal(sortFailure.status, "POSTAPPLY_CATALOG_UNAVAILABLE", "malformed scopes are sanitized");
assert.equal(sortFailure.reason, "POSTAPPLY_CATALOG_SHAPE_INVALID", "malformed scopes use shape reason");
assert.equal(sortFailure.remoteCalls, 1);assert.deepEqual(Object.keys(await import("./lib/comment-translator-paid-core-v1-gate1-postapply-acquire.mjs")), [
  "POSTAPPLY_CATALOG_SQL",
  "collectPostApplyCatalogObservation"
], "collector exposes only the fixed SQL and collection operation");
assert.match(POSTAPPLY_CATALOG_SQL, /BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;/);
assert.match(POSTAPPLY_CATALOG_SQL, /statement_timeout = '30s'/);
assert.match(POSTAPPLY_CATALOG_SQL, /lock_timeout = '5s'/);
assert.match(POSTAPPLY_CATALOG_SQL, /ROLLBACK;/);
// Preserve complete JSON string tokens, including escaped quotes/backslashes,
// and remove whitespace only outside strings. Actual PG17 equality is checked
// separately by the local probe; this guards the exact SQL serialization rule.
assert.ok(POSTAPPLY_CATALOG_SQL.includes(String.raw`E'("(?:[^"\\\\]|\\\\.)*")|[[:space:]]+', E'\\1', 'g')`));
for (const value of [
  { plain: "spaces stay inside strings", escaped: 'quote " slash \\ tab\t newline\n', unicode: "日本語 😀" },
  { rows: [{ text: "\\\" \\\\ \\n", value: null }, true, false, 123] }
]) {
  const expanded = JSON.stringify(value, null, 2);
  const compact = expanded.replace(/("(?:[^"\\]|\\.)*")|\s+/g, (_match, token) => token ?? "");
  assert.deepEqual(JSON.parse(compact), value);
  assert.equal(compact, JSON.stringify(value));
}
assert.match(POSTAPPLY_CATALOG_SQL, /query_to_xml/);
assert.match(POSTAPPLY_CATALOG_SQL, /pg_catalog\.pg_depend/);
assert.match(POSTAPPLY_CATALOG_SQL, /pg_identify_object/);
for (const scope of ["canonical", "archive", "sourceEra"]) assert.match(POSTAPPLY_CATALOG_SQL, new RegExp(`'${scope}'`));
for (const field of ["readOnly", "history", "canonical", "archive", "sourceEra", "edgeScopeVersion", "pgDependEdges"]) {
  assert.match(POSTAPPLY_CATALOG_SQL, new RegExp(`'${field}'`), `fixed output includes ${field}`);
}
assert.match(POSTAPPLY_CATALOG_SQL, /left\(c\.relname, length\('comment_translator_paid_'\)\)/);
assert.match(POSTAPPLY_CATALOG_SQL, /left\(p\.proname, length\('ct_paid_'\)\)/);
assert.match(POSTAPPLY_CATALOG_SQL, /comment_translator_paid_legacy_archive/);
assert.match(POSTAPPLY_CATALOG_SQL, /pg_catalog\.pg_event_trigger.*event_triggers/s);
assert.match(POSTAPPLY_CATALOG_SQL, /position\(format\('%I\.%I', st\.schema_name, st\.table_name\) in pg_get_functiondef\(p\.oid\)\) > 0/);
assert.match(POSTAPPLY_CATALOG_SQL, /'pg_catalog\.pg_class'::regclass::oid, st\.oid, a\.attnum/);
assert.match(POSTAPPLY_CATALOG_SQL, /catalog_classes/);
assert.match(POSTAPPLY_CATALOG_SQL, /dependent_class\.nspname \|\| '\.' \|\| dependent_class\.relname/);
assert.match(POSTAPPLY_CATALOG_SQL, /d\.deptype::text AS deptype/);
assert.doesNotMatch(POSTAPPLY_CATALOG_SQL, /d\.classid::regclass::text/);
assert.doesNotMatch(POSTAPPLY_CATALOG_SQL, /SELECT DISTINCT closure/);
assert.match(POSTAPPLY_CATALOG_SQL, /COLLATE "C"/);
assert.match(POSTAPPLY_CATALOG_SQL, /btrim\(replace\(pg_get_expr/);
assert.match(POSTAPPLY_CATALOG_SQL, /btrim\(replace\(pg_get_constraintdef/);
assert.match(POSTAPPLY_CATALOG_SQL, /btrim\(replace\(pg_get_indexdef/);
assert.match(POSTAPPLY_CATALOG_SQL, /btrim\(replace\(pg_get_triggerdef/);
assert.match(POSTAPPLY_CATALOG_SQL, /format\('%I\.%I', st\.schema_name, st\.table_name\)/);
assert.match(POSTAPPLY_CATALOG_SQL, /format\('%I\.%I\(%s\)', sf\.schema_name, sf\.function_name/);
assert.match(POSTAPPLY_CATALOG_SQL, /format\('%I\.%I\(%s\)', fn_ns\.nspname, fn\.proname/);
assert.match(SOURCE, /await import\("\.\.\/comment-translator-paid-core-v1-gate1-preflight-readonly\.mjs"\)/);
assert.match(SOURCE, /createPsqlTransport\(\{\s*maxOutputBytes: MAX_OUTPUT_BYTES,\s*spawnSyncImpl/);
assert.match(SOURCE, /args\.length === 1 && args\[0\] === "--version"/);
assert.match(SOURCE, /input: POSTAPPLY_CATALOG_SQL/);
assert.match(SOURCE, /capture\.stderr !== ""/);
assert.match(SOURCE, /parseStrictJson/);
assert.match(SOURCE, /POSTAPPLY_CATALOG_SHAPE_INVALID/);
assert.doesNotMatch(SOURCE, /writeFile|appendFile|mkdir|network|fetch\(/i);

console.log("postapply acquire contract passed (request-boundary=fail-closed, binding-before-native=covered, fixed-readonly-sql=covered, duplicate-key-parser=present, shape-inspector=covered, public-adapters=0)");
