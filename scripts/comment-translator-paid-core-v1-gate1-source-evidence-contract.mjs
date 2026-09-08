import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  collectSourceCommitObservation,
  verifySourceCommitStage
} from "./lib/comment-translator-paid-core-v1-gate1-source-evidence.mjs";
import { parseStrictJson } from "./lib/comment-translator-paid-core-v1-gate1-evidence.mjs";

const source = fs.readFileSync(
  path.join(process.cwd(), "scripts", "lib", "comment-translator-paid-core-v1-gate1-source-evidence.mjs"),
  "utf8"
);

const SOURCE_INTEGRATION_REF = "refs/remotes/origin/codex/comment-translator-paid-v1-preview";
const MIGRATION_ROOT = "supabase/migrations";
const EXPECTED_MIGRATION_COUNT = 56;
const MAX_BLOB_BYTES = 1 * 1024 * 1024;
const MAX_TREE_BYTES = 32 * 1024 * 1024;
const MAX_GIT_CAPTURE_BYTES = 8 * 1024 * 1024;
const GIT_COMMAND_TIMEOUT_MS = 10 * 1000;
const COLLECTOR_DEADLINE_MS = 60 * 1000;
const MIGRATION_PATH_PATTERN = /^supabase\/migrations\/\d{14}_[a-z0-9_]+\.sql$/;
const SOURCE_COMMIT = "a".repeat(40);
const INTEGRATION_COMMIT = "b".repeat(40);
const REPOSITORY_BINDING = "d".repeat(64);

const REASONS = Object.freeze({
  REF_INVALID: "SOURCE_INTEGRATION_REF_INVALID",
  COMMIT_INVALID: "SOURCE_COMMIT_INVALID",
  ANCESTRY_INVALID: "SOURCE_ANCESTRY_INVALID",
  TREE_INVALID: "SOURCE_MIGRATION_TREE_INVALID",
  ARTIFACT_INVALID: "SOURCE_MIGRATION_ARTIFACT_INVALID",
  OBSERVATION_INVALID: "SOURCE_OBSERVATION_INVALID"
});

function clone(value) {
  return structuredClone(value);
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function fail(reason) {
  throw new Error(reason);
}

function decodeUtf8(bytes) {
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, expected) {
  if (!isObject(value)) return false;
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length
    && actual.every((key, index) => key === sortedExpected[index]);
}

function extractFunction(name) {
  const start = source.indexOf("function " + name + "(");
  assert.ok(start >= 0, name + " exists");
  let bodyStart = -1;
  let parameterDepth = 0;
  let parameterQuote = null;
  let parameterEscaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (parameterQuote !== null) {
      if (parameterEscaped) parameterEscaped = false;
      else if (character === "\\") parameterEscaped = true;
      else if (character === parameterQuote) parameterQuote = null;
      continue;
    }
    if (character === "'" || character === "\"" || character === String.fromCharCode(96)) {
      parameterQuote = character;
      continue;
    }
    if (character === "(") parameterDepth += 1;
    else if (character === ")") parameterDepth -= 1;
    else if (character === "{" && parameterDepth === 0) {
      bodyStart = index;
      break;
    }
  }
  assert.ok(bodyStart >= 0, name + " body exists");
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
    if (character === "'" || character === "\"" || character === String.fromCharCode(96)) {
      quote = character;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(name + " function is unterminated");
}

function migrationPaths() {
  return Array.from({ length: EXPECTED_MIGRATION_COUNT }, (_, index) => {
    const timestamp = "20260907" + String(index).padStart(6, "0");
    return MIGRATION_ROOT + "/" + timestamp + "_migration_" + String(index).padStart(2, "0") + ".sql";
  });
}

function createFixture() {
  const paths = migrationPaths();
  const entries = {};
  const blobs = {};
  const sizes = {};
  for (const commit of [SOURCE_COMMIT, INTEGRATION_COMMIT]) {
    entries[commit] = [];
    blobs[commit] = {};
    for (const [index, migrationPath] of paths.entries()) {
      const object = (commit === SOURCE_COMMIT ? "1" : "2") + String(index).padStart(39, "0");
      const bytes = Buffer.from("migration-" + String(index), "utf8");
      entries[commit].push({ mode: "100644", type: "blob", object, path: migrationPath });
      blobs[commit][migrationPath] = bytes;
      sizes[object] = bytes.length;
    }
  }
  return {
    paths,
    entries,
    blobs,
    sizes,
    ref: INTEGRATION_COMMIT,
    calls: [],
    showCalls: 0,
    ancestry: { status: 0, signal: null, error: null, stderr: Buffer.alloc(0), captureComplete: true }
  };
}

function rowsFor(fixture, commit) {
  return fixture.paths.map((migrationPath) => {
    const bytes = fixture.blobs[commit][migrationPath];
    return {
      path: migrationPath,
      bytes: bytes.length,
      sha256: sha256(bytes)
    };
  });
}

function corpusDigest(rows) {
  return sha256(Buffer.from(JSON.stringify(rows), "utf8"));
}

function createPolicy(fixture) {
  const rows = rowsFor(fixture, SOURCE_COMMIT);
  return {
    schemaVersion: 1,
    expectedSourceCommit: SOURCE_COMMIT,
    expectedIntegrationCommit: INTEGRATION_COMMIT,
    expectedMigrationCorpusSha256: corpusDigest(rows),
    expectedMigrationPaths: [...fixture.paths],
    expectedRepositoryBindingSha256: REPOSITORY_BINDING
  };
}

function treeBytes(entries) {
  return Buffer.from(entries.map((entry) => (
    entry.mode + " " + entry.type + " " + entry.object + "\t" + entry.path
  )).join("\0") + "\0", "utf8");
}

function makeRunCheckedGit(fixture) {
  return (_repositoryRoot, args, _deadlineAt, reason) => {
    fixture.calls.push([...args]);
    if (args[0] === "rev-parse") {
      return Buffer.from(String(fixture.ref) + "\n", "utf8");
    }
    if (args[0] === "cat-file" && args[1] === "-e") {
      if (fixture.commitError) throw new Error(reason);
      return Buffer.alloc(0);
    }
    if (args[0] === "ls-tree") {
      const commit = args[4];
      if (!fixture.entries[commit]) throw new Error(reason);
      return treeBytes(fixture.entries[commit]);
    }
    if (args[0] === "cat-file" && args[1] === "-s") {
      const object = args[2];
      if (fixture.sizeError) throw new Error(reason);
      if (Object.hasOwn(fixture.sizeOverrides ?? {}, object)) {
        return Buffer.from(String(fixture.sizeOverrides[object]) + "\n", "utf8");
      }
      return Buffer.from(String(fixture.sizes[object]) + "\n", "utf8");
    }
    if (args[0] === "show") {
      fixture.showCalls += 1;
      const separator = String(args[1]).indexOf(":");
      const commit = String(args[1]).slice(0, separator);
      const migrationPath = String(args[1]).slice(separator + 1);
      if (fixture.showError) throw new Error(reason);
      if (fixture.syntheticBlobSize !== undefined) return Buffer.alloc(fixture.syntheticBlobSize);
      if (Object.hasOwn(fixture.blobOverrides ?? {}, commit + ":" + migrationPath)) {
        return fixture.blobOverrides[commit + ":" + migrationPath];
      }
      return fixture.blobs[commit][migrationPath];
    }
    throw new Error("UNEXPECTED_GIT_CALL");
  };
}

function makeAncestry(fixture) {
  return (_repositoryRoot, args) => {
    assert.deepEqual(args, [
      "merge-base",
      "--is-ancestor",
      SOURCE_COMMIT,
      INTEGRATION_COMMIT
    ]);
    return fixture.ancestry;
  };
}

const parseCommitOutput = new Function(
  "decodeUtf8",
  "fail",
  extractFunction("parseCommitOutput") + "\nreturn parseCommitOutput;"
)(decodeUtf8, fail);

const parseGitSize = new Function(
  "decodeUtf8",
  "fail",
  "REASONS",
  "MAX_BLOB_BYTES",
  extractFunction("parseGitSize") + "\nreturn parseGitSize;"
)(decodeUtf8, fail, REASONS, MAX_BLOB_BYTES);

const parseTreeRecords = new Function(
  "decodeUtf8",
  "fail",
  "REASONS",
  "EXPECTED_MIGRATION_COUNT",
  extractFunction("parseTreeRecords") + "\nreturn parseTreeRecords;"
)(decodeUtf8, fail, REASONS, EXPECTED_MIGRATION_COUNT);

const isMigrationPath = new Function(
  "MIGRATION_PATH_PATTERN",
  extractFunction("isMigrationPath") + "\nreturn isMigrationPath;"
)(MIGRATION_PATH_PATTERN);

const readMigrationTree = (runCheckedGit) => new Function(
  "runCheckedGit",
  "fail",
  "parseTreeRecords",
  "REASONS",
  "MIGRATION_ROOT",
  "EXPECTED_MIGRATION_COUNT",
  "isMigrationPath",
  "parseGitSize",
  "MAX_TREE_BYTES",
  "sha256Bytes",
  extractFunction("readMigrationTree") + "\nreturn readMigrationTree;"
)(
  runCheckedGit,
  fail,
  parseTreeRecords,
  REASONS,
  MIGRATION_ROOT,
  EXPECTED_MIGRATION_COUNT,
  isMigrationPath,
  parseGitSize,
  MAX_TREE_BYTES,
  sha256
);

const makeCollector = (fixture, clock = Date, digest = corpusDigest) => {
  const runCheckedGit = makeRunCheckedGit(fixture);
  const readTree = readMigrationTree(runCheckedGit);
  const parseCommit = parseCommitOutput;
  const nativeAncestry = makeAncestry(fixture);
  return new Function(
    "Date",
    "fail",
    "runCheckedGit",
    "SOURCE_INTEGRATION_REF",
    "REASONS",
    "parseCommitOutput",
    "readMigrationTree",
    "runNativeGit",
    "corpusDigest",
    "sameRows",
    "COLLECTOR_DEADLINE_MS",
    extractFunction("collectSourceObservationNative") + "\nreturn collectSourceObservationNative;"
  )(
    clock,
    fail,
    runCheckedGit,
    SOURCE_INTEGRATION_REF,
    REASONS,
    parseCommit,
    readTree,
    nativeAncestry,
    digest,
    (left, right) => JSON.stringify(left) === JSON.stringify(right),
    COLLECTOR_DEADLINE_MS
  );
};

const validateSourcePolicyShape = new Function(
  "exactKeys",
  "isObject",
  "isCommit",
  "isSha256",
  "isMigrationPath",
  "SOURCE_POLICY_KEYS",
  "EXPECTED_MIGRATION_COUNT",
  extractFunction("validateSourcePolicyShape") + "\nreturn validateSourcePolicyShape;"
)(
  exactKeys,
  isObject,
  (value) => typeof value === "string" && /^[a-f0-9]{40}$/.test(value),
  (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value),
  isMigrationPath,
  [
    "schemaVersion",
    "expectedSourceCommit",
    "expectedIntegrationCommit",
    "expectedMigrationCorpusSha256",
    "expectedMigrationPaths",
    "expectedRepositoryBindingSha256"
  ],
  EXPECTED_MIGRATION_COUNT
);

const validateSourcePolicy = new Function(
  "validateSourcePolicyShape",
  "REASONS",
  extractFunction("validateSourcePolicy") + "\nreturn validateSourcePolicy;"
)(validateSourcePolicyShape, {
  POLICY_UNAVAILABLE: "SOURCE_POLICY_UNAVAILABLE",
  POLICY_INVALID: "SOURCE_POLICY_INVALID"
});

const compareObservationShapeImplementation = new Function(
  "isObject",
  "exactKeys",
  "OBSERVATION_KEYS",
  "ROW_KEYS",
  "EXPECTED_MIGRATION_COUNT",
  "SOURCE_INTEGRATION_REF",
  extractFunction("compareObservationShape") + "\nreturn compareObservationShape;"
)(
  isObject,
  exactKeys,
  ["schemaVersion", "sourceCommit", "integrationCommit", "integrationRef", "migrationCorpusSha256", "repositoryBindingSha256", "migrations"],
  ["path", "bytes", "sha256"],
  EXPECTED_MIGRATION_COUNT,
  SOURCE_INTEGRATION_REF
);
const compareObservationShape = () => compareObservationShapeImplementation;

const STAGE_ARTIFACT_PATH = "artifacts/source-observation.json";
const STAGE_REPOSITORY_ROOT = path.resolve("stage-source-repository");
const STAGE_EVIDENCE_ROOT = path.resolve("stage-source-evidence");
const STAGE_AUTHORITY_POLICY = Object.freeze({ name: "controlled-r3a-authority-policy" });

function createAuthorityBundle(observation, policy) {
  const artifactBytes = Buffer.from(JSON.stringify(observation), "utf8");
  return {
    index: {
      schemaVersion: 1,
      sourceCommit: policy.expectedSourceCommit,
      migrationCorpusSha256: policy.expectedMigrationCorpusSha256,
      stages: {
        sourceCommit: {
          targetBindings: { repository: policy.expectedRepositoryBindingSha256 },
          artifacts: [{
            role: "source-observation",
            path: STAGE_ARTIFACT_PATH,
            sha256: sha256(artifactBytes),
            bytes: artifactBytes.length
          }]
        }
      }
    },
    artifacts: {
      [STAGE_ARTIFACT_PATH]: artifactBytes
    }
  };
}

function makeStageVerifier(authorityLoader, collector) {
  return new Function(
    "validateSourcePolicy",
    "path",
    "verifyAuthorityBundle",
    "unavailable",
    "REASONS",
    "exactKeys",
    "parseStrictJson",
    "decodeUtf8",
    "compareObservationShape",
    "EXPECTED_MIGRATION_COUNT",
    "collectSourceCommitObservation",
    extractFunction("verifySourceCommitStage") + "\nreturn verifySourceCommitStage;"
  )(
    validateSourcePolicy,
    path,
    authorityLoader,
    (reason) => ({
      status: "SOURCE_UNAVAILABLE",
      reason,
      remoteCalls: 0,
      mutations: 0,
      migrationCount: 0
    }),
    {
      AUTHORITY_INVALID: "SOURCE_AUTHORITY_UNAVAILABLE",
      ROOT_INVALID: "SOURCE_ROOT_INVALID",
      STAGE_INVALID: "SOURCE_STAGE_INVALID",
      ARTIFACT_INVALID: "SOURCE_MIGRATION_ARTIFACT_INVALID",
      OBSERVATION_INVALID: "SOURCE_OBSERVATION_INVALID"
    },
    exactKeys,
    parseStrictJson,
    (bytes) => new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    compareObservationShapeImplementation,
    EXPECTED_MIGRATION_COUNT,
    collector
  );
}

function runStageFixture(policy, observation, overrides = {}) {
  const events = [];
  const forwarded = {};
  const authorityResult = overrides.authorityResult ?? {
    status: "AUTHORITY_VALID",
    reason: null,
    bundle: overrides.bundle ?? createAuthorityBundle(observation, policy)
  };
  const collectorResult = overrides.collectorResult ?? {
    status: "SOURCE_OBSERVATION_VALID",
    reason: null,
    remoteCalls: 0,
    mutations: 0,
    migrationCount: EXPECTED_MIGRATION_COUNT,
    observation
  };
  const authorityLoader = (args) => {
    events.push("authority");
    forwarded.authority = args;
    return authorityResult;
  };
  const collector = (args) => {
    events.push("collector");
    forwarded.collector = args;
    return collectorResult;
  };
  const verifyStage = makeStageVerifier(authorityLoader, collector);
  const result = verifyStage({
    repositoryRoot: STAGE_REPOSITORY_ROOT,
    evidenceRoot: STAGE_EVIDENCE_ROOT,
    policy: STAGE_AUTHORITY_POLICY,
    sourcePolicy: policy
  });
  return { result, events, forwarded };
}

function assertStageInvalid(label, policy, observation, mutate, reason = "SOURCE_STAGE_INVALID") {
  const bundle = createAuthorityBundle(observation, policy);
  mutate(bundle);
  const run = runStageFixture(policy, observation, { bundle });
  assert.equal(run.result.status, "SOURCE_UNAVAILABLE", label + " status");
  assert.equal(run.result.reason, reason, label + " reason");
  assert.deepEqual(run.events, ["authority"], label + " does not collect after stage rejection");
  assert.equal(run.forwarded.collector, undefined, label + " collector is not called");
}

function assertLoaderRejects(label, policy, observation, mutate) {
  const bundle = createAuthorityBundle(observation, policy);
  mutate(bundle);
  const run = runStageFixture(policy, observation, {
    bundle,
    authorityResult: {
      status: "AUTHORITY_UNAVAILABLE",
      reason: "AUTHORITY_INDEX_INVALID",
      remoteCalls: 0,
      mutations: 0,
      stageCount: 0
    }
  });
  assert.equal(run.result.status, "SOURCE_UNAVAILABLE", label + " status");
  assert.equal(run.result.reason, "SOURCE_AUTHORITY_UNAVAILABLE", label + " reason");
  assert.deepEqual(run.events, ["authority"], label + " loader rejects before collection");
  assert.equal(run.forwarded.collector, undefined, label + " collector is not called");
}

const runNativeGitWithStub = (spawnSync, clock = Date) => new Function(
  "spawnSync",
  "Date",
  "process",
  "GIT_COMMAND_TIMEOUT_MS",
  "MAX_GIT_CAPTURE_BYTES",
  extractFunction("minimalGitEnvironment") + "\n"
    + extractFunction("runNativeGit") + "\nreturn runNativeGit;"
)(
  spawnSync,
  clock,
  process,
  GIT_COMMAND_TIMEOUT_MS,
  MAX_GIT_CAPTURE_BYTES
);

const runCheckedGitWithStub = (nativeResult) => new Function(
  "runNativeGit",
  "fail",
  extractFunction("runCheckedGit") + "\nreturn runCheckedGit;"
)(() => nativeResult, fail);

function expectReason(action, reason, label) {
  assert.throws(action, new RegExp(reason), label);
}

function assertStrictPolicyCases(validPolicy) {
  assert.equal(validateSourcePolicy(undefined).reason, "SOURCE_POLICY_UNAVAILABLE");
  assert.equal(validateSourcePolicy(null).reason, "SOURCE_POLICY_UNAVAILABLE");
  assert.equal(validateSourcePolicy({}).reason, "SOURCE_POLICY_INVALID");
  assert.equal(validateSourcePolicy(validPolicy).status, "SOURCE_VALID");

  const cases = [
    ["extra key", (candidate) => { candidate.extra = true; }],
    ["wrong schema", (candidate) => { candidate.schemaVersion = 2; }],
    ["bad source commit", (candidate) => { candidate.expectedSourceCommit = "A".repeat(40); }],
    ["bad integration commit", (candidate) => { candidate.expectedIntegrationCommit = "short"; }],
    ["bad corpus digest", (candidate) => { candidate.expectedMigrationCorpusSha256 = "z".repeat(64); }],
    ["bad repository binding", (candidate) => { candidate.expectedRepositoryBindingSha256 = "z".repeat(64); }],
    ["wrong path count", (candidate) => { candidate.expectedMigrationPaths = candidate.expectedMigrationPaths.slice(0, -1); }],
    ["unsorted paths", (candidate) => {
      const first = candidate.expectedMigrationPaths[0];
      candidate.expectedMigrationPaths[0] = candidate.expectedMigrationPaths[1];
      candidate.expectedMigrationPaths[1] = first;
    }],
    ["duplicate path", (candidate) => {
      candidate.expectedMigrationPaths[1] = candidate.expectedMigrationPaths[0];
    }],
    ["nested path", (candidate) => {
      candidate.expectedMigrationPaths[0] = "supabase/migrations/nested/20260907000000_bad.sql";
    }],
    ["non-SQL path", (candidate) => {
      candidate.expectedMigrationPaths[0] = "supabase/migrations/20260907000000_bad.txt";
    }],
    ["uppercase path", (candidate) => {
      candidate.expectedMigrationPaths[0] = "supabase/migrations/20260907000000_Bad.sql";
    }]
  ];
  for (const [label, mutate] of cases) {
    const candidate = clone(validPolicy);
    mutate(candidate);
    assert.equal(validateSourcePolicy(candidate).reason, "SOURCE_POLICY_INVALID", label + " rejects");
  }
}

function assertTreeCase(label, mutate) {
  const fixture = createFixture();
  mutate(fixture);
  const runCheckedGit = makeRunCheckedGit(fixture);
  const readTree = readMigrationTree(runCheckedGit);
  expectReason(
    () => readTree("C:/repo", SOURCE_COMMIT, fixture.paths, Date.now() + 1000),
    REASONS.TREE_INVALID,
    label
  );
}

function runContract() {
  const fixture = createFixture();
  const policy = createPolicy(fixture);

  assertStrictPolicyCases(policy);
  assert.equal(policy.expectedMigrationPaths.length, EXPECTED_MIGRATION_COUNT);
  assert.equal(policy.expectedMigrationPaths[0], "supabase/migrations/20260907000000_migration_00.sql");
  assert.equal(
    policy.expectedMigrationPaths.at(-1),
    "supabase/migrations/20260907000055_migration_55.sql"
  );

  const missingPolicy = collectSourceCommitObservation();
  assert.deepEqual(missingPolicy, {
    status: "SOURCE_UNAVAILABLE",
    reason: "SOURCE_POLICY_UNAVAILABLE",
    remoteCalls: 0,
    mutations: 0,
    migrationCount: 0
  });
  assert.equal(Object.keys(missingPolicy).includes("observation"), false);
  assert.doesNotMatch(JSON.stringify(missingPolicy), /migration-|supabase|[a-f0-9]{40}/);

  const invalidPolicy = collectSourceCommitObservation({
    repositoryRoot: path.resolve("missing-source-repository"),
    sourcePolicy: { schemaVersion: 1 }
  });
  assert.deepEqual(invalidPolicy, {
    status: "SOURCE_UNAVAILABLE",
    reason: "SOURCE_POLICY_INVALID",
    remoteCalls: 0,
    mutations: 0,
    migrationCount: 0
  });

  const validRootInvalid = collectSourceCommitObservation({
    repositoryRoot: path.join(process.cwd(), "missing-source-repository"),
    sourcePolicy: policy
  });
  assert.equal(validRootInvalid.status, "SOURCE_UNAVAILABLE");
  assert.equal(validRootInvalid.reason, "SOURCE_ROOT_INVALID");
  assert.equal(validRootInvalid.remoteCalls, 0);
  assert.equal(validRootInvalid.mutations, 0);

  const stageMissingPolicy = verifySourceCommitStage({
    repositoryRoot: path.resolve("missing-source-repository"),
    evidenceRoot: path.resolve("missing-source-evidence")
  });
  assert.equal(stageMissingPolicy.status, "SOURCE_UNAVAILABLE");
  assert.equal(stageMissingPolicy.reason, "SOURCE_POLICY_UNAVAILABLE");
  assert.equal(stageMissingPolicy.remoteCalls, 0);
  assert.equal(stageMissingPolicy.mutations, 0);

  const forgedBundle = verifySourceCommitStage({
    repositoryRoot: path.resolve("missing-source-repository"),
    evidenceRoot: path.resolve("missing-source-evidence"),
    policy: { forged: true },
    sourcePolicy: policy,
    authorityBundle: {
      status: "AUTHORITY_VALID",
      bundle: { forged: true }
    }
  });
  assert.equal(forgedBundle.status, "SOURCE_UNAVAILABLE");
  assert.equal(forgedBundle.reason, "SOURCE_AUTHORITY_UNAVAILABLE");
  assert.equal(Object.hasOwn(forgedBundle, "observation"), false);
  assert.doesNotMatch(source, /authorityBundle/);
  const authorityCall = source.indexOf("const authority = verifyAuthorityBundle({");
  const collectorCall = source.indexOf("const fresh = collectSourceCommitObservation({");
  assert.ok(authorityCall >= 0 && collectorCall > authorityCall, "stage loads R3a authority before native source collection");
  assert.match(source, /descriptor\.artifacts\.length !== 1/);
  assert.match(source, /descriptor\.artifacts\[0\]\.role !== "source-observation"/);
  assert.match(source, /descriptor\.targetBindings, \["repository"\]/);

  const collector = makeCollector(fixture);
  const observation = collector("C:/repo", policy);
  assert.deepEqual(Object.keys(observation), [
    "schemaVersion",
    "sourceCommit",
    "integrationCommit",
    "integrationRef",
    "migrationCorpusSha256",
    "repositoryBindingSha256",
    "migrations"
  ]);
  assert.equal(observation.schemaVersion, 1);
  assert.equal(observation.sourceCommit, SOURCE_COMMIT);
  assert.equal(observation.integrationCommit, INTEGRATION_COMMIT);
  assert.equal(observation.integrationRef, SOURCE_INTEGRATION_REF);
  assert.equal(observation.migrations.length, EXPECTED_MIGRATION_COUNT);
  assert.deepEqual(observation.migrations, rowsFor(fixture, SOURCE_COMMIT));
  assert.equal(observation.migrationCorpusSha256, corpusDigest(observation.migrations));
  assert.equal(observation.repositoryBindingSha256, REPOSITORY_BINDING);

  const validStage = runStageFixture(policy, observation);
  assert.equal(validStage.result.status, "SOURCE_STAGE_VALID");
  assert.equal(validStage.result.stage, "sourceCommit");
  assert.equal(validStage.result.remoteCalls, 0);
  assert.equal(validStage.result.mutations, 0);
  assert.equal(validStage.result.migrationCount, EXPECTED_MIGRATION_COUNT);
  assert.deepEqual(validStage.events, ["authority", "collector"]);
  assert.deepEqual(Object.keys(validStage.forwarded.authority), [
    "repositoryRoot",
    "evidenceRoot",
    "policy"
  ]);
  assert.equal(validStage.forwarded.authority.repositoryRoot, STAGE_REPOSITORY_ROOT);
  assert.equal(validStage.forwarded.authority.evidenceRoot, STAGE_EVIDENCE_ROOT);
  assert.equal(validStage.forwarded.authority.policy, STAGE_AUTHORITY_POLICY);
  assert.deepEqual(Object.keys(validStage.forwarded.collector), [
    "repositoryRoot",
    "sourcePolicy"
  ]);
  assert.equal(validStage.forwarded.collector.repositoryRoot, STAGE_REPOSITORY_ROOT);
  assert.equal(validStage.forwarded.collector.sourcePolicy, policy);
  assert.equal(Object.keys(validStage.result).includes("observation"), false);
  assert.deepEqual(validStage.result.observation, observation);

  const authorityRejected = runStageFixture(policy, observation, {
    authorityResult: {
      status: "AUTHORITY_UNAVAILABLE",
      reason: "AUTHORITY_GIT_UNAVAILABLE",
      remoteCalls: 0,
      mutations: 0,
      stageCount: 0
    }
  });
  assert.equal(authorityRejected.result.status, "SOURCE_UNAVAILABLE");
  assert.equal(authorityRejected.result.reason, "SOURCE_AUTHORITY_UNAVAILABLE");
  assert.deepEqual(authorityRejected.events, ["authority"]);
  assert.equal(authorityRejected.forwarded.collector, undefined);

  assertStageInvalid("source commit binding mismatch", policy, observation, (bundle) => {
    bundle.index.sourceCommit = "e".repeat(40);
  });
  assertStageInvalid("migration corpus binding mismatch", policy, observation, (bundle) => {
    bundle.index.migrationCorpusSha256 = "e".repeat(64);
  });
  assertStageInvalid("repository target mismatch", policy, observation, (bundle) => {
    bundle.index.stages.sourceCommit.targetBindings.repository = "e".repeat(64);
  });
  assertStageInvalid("repository target extra field", policy, observation, (bundle) => {
    bundle.index.stages.sourceCommit.targetBindings.extra = "unexpected";
  });
  assertStageInvalid("target bindings malformed", policy, observation, (bundle) => {
    bundle.index.stages.sourceCommit.targetBindings = null;
  });
  assertStageInvalid("artifact role mismatch", policy, observation, (bundle) => {
    bundle.index.stages.sourceCommit.artifacts[0].role = "result";
  });
  assertStageInvalid("artifact count zero", policy, observation, (bundle) => {
    bundle.index.stages.sourceCommit.artifacts = [];
  });
  assertStageInvalid("artifact count two", policy, observation, (bundle) => {
    bundle.index.stages.sourceCommit.artifacts.push({
      role: "source-observation",
      path: "artifacts/second.json",
      sha256: "e".repeat(64),
      bytes: 1
    });
  });
  assertStageInvalid(
    "artifact path missing",
    policy,
    observation,
    (bundle) => { delete bundle.index.stages.sourceCommit.artifacts[0].path; },
    "SOURCE_MIGRATION_ARTIFACT_INVALID"
  );
  assertStageInvalid(
    "artifact path malformed",
    policy,
    observation,
    (bundle) => { bundle.index.stages.sourceCommit.artifacts[0].path = {}; },
    "SOURCE_MIGRATION_ARTIFACT_INVALID"
  );

  assertLoaderRejects("artifact hash missing", policy, observation, (bundle) => {
    delete bundle.index.stages.sourceCommit.artifacts[0].sha256;
  });
  assertLoaderRejects("artifact byte count malformed", policy, observation, (bundle) => {
    bundle.index.stages.sourceCommit.artifacts[0].bytes = "not-a-number";
  });
  assertLoaderRejects("artifact unknown field", policy, observation, (bundle) => {
    bundle.index.stages.sourceCommit.artifacts[0].unknown = true;
  });
  assertLoaderRejects("authority index unknown field", policy, observation, (bundle) => {
    bundle.index.unknown = true;
  });

  const mismatchBundle = createAuthorityBundle(observation, policy);
  const mismatchObservation = { ...observation, sourceCommit: "e".repeat(40) };
  mismatchBundle.artifacts[STAGE_ARTIFACT_PATH] = Buffer.from(JSON.stringify(mismatchObservation), "utf8");
  const artifactMismatch = runStageFixture(policy, observation, { bundle: mismatchBundle });
  assert.equal(artifactMismatch.result.status, "SOURCE_UNAVAILABLE");
  assert.equal(artifactMismatch.result.reason, "SOURCE_OBSERVATION_INVALID");
  assert.deepEqual(artifactMismatch.events, ["authority", "collector"]);
  assert.equal(artifactMismatch.forwarded.collector.sourcePolicy, policy);

  const collectorRejected = runStageFixture(policy, observation, {
    collectorResult: {
      status: "SOURCE_UNAVAILABLE",
      reason: "SOURCE_NATIVE_INVALID",
      remoteCalls: 0,
      mutations: 0,
      migrationCount: 0
    }
  });
  assert.equal(collectorRejected.result.status, "SOURCE_UNAVAILABLE");
  assert.equal(collectorRejected.result.reason, "SOURCE_OBSERVATION_INVALID");
  assert.deepEqual(collectorRejected.events, ["authority", "collector"]);

  const failedRefFixture = createFixture();
  failedRefFixture.ref = SOURCE_COMMIT;
  expectReason(
    () => makeCollector(failedRefFixture)("C:/repo", createPolicy(failedRefFixture)),
    REASONS.REF_INVALID,
    "wrong integration ref fails before commit/tree reads"
  );

  const failedAncestryFixture = createFixture();
  failedAncestryFixture.ancestry = {
    status: 1,
    signal: null,
    error: null,
    stdout: Buffer.alloc(0),
    stderr: Buffer.alloc(0),
    captureComplete: true
  };
  expectReason(
    () => makeCollector(failedAncestryFixture)("C:/repo", createPolicy(failedAncestryFixture)),
    REASONS.ANCESTRY_INVALID,
    "ancestry exit one fails closed"
  );

  const driftFixture = createFixture();
  const driftPath = driftFixture.paths[7];
  driftFixture.blobs[INTEGRATION_COMMIT][driftPath] = Buffer.from("integration-drift", "utf8");
  driftFixture.sizes[driftFixture.entries[INTEGRATION_COMMIT][7].object] = "integration-drift".length;
  expectReason(
    () => makeCollector(driftFixture)("C:/repo", createPolicy(driftFixture)),
    REASONS.OBSERVATION_INVALID,
    "source and integration blob drift fails"
  );

  const finalDeadlineFixture = createFixture();
  const finalDeadlinePolicy = createPolicy(finalDeadlineFixture);
  let finalDeadlineNow = 1000;
  let finalDigestCalls = 0;
  const finalDeadlineClock = { now: () => finalDeadlineNow };
  const finalDeadlineDigest = (rows) => {
    const digest = corpusDigest(rows);
    finalDigestCalls += 1;
    if (finalDigestCalls === 2) finalDeadlineNow = 61000;
    return digest;
  };
  expectReason(
    () => makeCollector(finalDeadlineFixture, finalDeadlineClock, finalDeadlineDigest)(
      "C:/repo",
      finalDeadlinePolicy
    ),
    REASONS.NATIVE_INVALID,
    "collector rechecks deadline after final hash and comparison"
  );
  assert.equal(finalDigestCalls, 2);

  assertTreeCase("missing migration tree entry rejects", (candidate) => {
    candidate.entries[SOURCE_COMMIT].pop();
  });
  assertTreeCase("unknown direct migration path rejects", (candidate) => {
    candidate.entries[SOURCE_COMMIT][0].path = MIGRATION_ROOT + "/20260907000000_unknown.sql";
  });
  assertTreeCase("nested migration path rejects", (candidate) => {
    candidate.entries[SOURCE_COMMIT][0].path = MIGRATION_ROOT + "/nested/20260907000000_bad.sql";
  });
  assertTreeCase("non-SQL migration path rejects", (candidate) => {
    candidate.entries[SOURCE_COMMIT][0].path = MIGRATION_ROOT + "/20260907000000_bad.txt";
  });
  assertTreeCase("duplicate migration path rejects", (candidate) => {
    candidate.entries[SOURCE_COMMIT][1].path = candidate.entries[SOURCE_COMMIT][0].path;
  });
  assertTreeCase("non-regular mode rejects", (candidate) => {
    candidate.entries[SOURCE_COMMIT][0].mode = "100755";
  });
  assertTreeCase("non-blob type rejects", (candidate) => {
    candidate.entries[SOURCE_COMMIT][0].type = "tree";
  });

  const invalidSizes = ["0\n", "01\n", String(MAX_BLOB_BYTES + 1) + "\n", "not-a-size\n"];
  for (const invalidSize of invalidSizes) {
    assert.throws(
      () => parseGitSize(Buffer.from(invalidSize, "utf8")),
      /SOURCE_MIGRATION_ARTIFACT_INVALID/,
      "invalid Git blob size rejects before a blob read"
    );
  }
  assert.equal(parseGitSize(Buffer.from("1\n", "utf8")), 1);
  assert.equal(parseGitSize(Buffer.from(String(MAX_BLOB_BYTES) + "\n", "utf8")), MAX_BLOB_BYTES);

  const oversizedFixture = createFixture();
  const oversizedObject = oversizedFixture.entries[SOURCE_COMMIT][0].object;
  oversizedFixture.sizeOverrides = { [oversizedObject]: MAX_BLOB_BYTES + 1 };
  const oversizedReadTree = readMigrationTree(makeRunCheckedGit(oversizedFixture));
  expectReason(
    () => oversizedReadTree("C:/repo", SOURCE_COMMIT, oversizedFixture.paths, Date.now() + 1000),
    REASONS.ARTIFACT_INVALID,
    "pre-read blob cap rejects before show"
  );
  assert.equal(oversizedFixture.showCalls, 0);

  const aggregateFixture = createFixture();
  aggregateFixture.syntheticBlobSize = 700000;
  for (const entry of aggregateFixture.entries[SOURCE_COMMIT]) {
    aggregateFixture.sizeOverrides ??= {};
    aggregateFixture.sizeOverrides[entry.object] = aggregateFixture.syntheticBlobSize;
  }
  const aggregateReadTree = readMigrationTree(makeRunCheckedGit(aggregateFixture));
  expectReason(
    () => aggregateReadTree("C:/repo", SOURCE_COMMIT, aggregateFixture.paths, Date.now() + 1000),
    REASONS.ARTIFACT_INVALID,
    "aggregate tree cap rejects before the next blob read"
  );
  assert.ok(aggregateFixture.showCalls < EXPECTED_MIGRATION_COUNT);

  const rawBytesFixture = createFixture();
  const rawPath = rawBytesFixture.paths[0];
  const rawBytes = Buffer.from([0xff, 0x00, 0x80, 0x0a]);
  rawBytesFixture.blobOverrides = {
    [SOURCE_COMMIT + ":" + rawPath]: rawBytes
  };
  rawBytesFixture.sizes[rawBytesFixture.entries[SOURCE_COMMIT][0].object] = rawBytes.length;
  const rawRows = readMigrationTree(
    makeRunCheckedGit(rawBytesFixture)
  )("C:/repo", SOURCE_COMMIT, rawBytesFixture.paths, Date.now() + 1000);
  assert.equal(rawRows[0].bytes, rawBytes.length);
  assert.equal(rawRows[0].sha256, sha256(rawBytes));

  let nativeInvocation = null;
  const nativeGit = runNativeGitWithStub((command, args, options) => {
    nativeInvocation = { command, args, options };
    return {
      status: 0,
      signal: null,
      error: null,
      stdout: Buffer.from("ok", "utf8"),
      stderr: Buffer.alloc(0)
    };
  });
  const nativeResult = nativeGit(
    "C:/repo",
    ["cat-file", "-e", SOURCE_COMMIT + "^{commit}"],
    Date.now() + GIT_COMMAND_TIMEOUT_MS
  );
  assert.equal(nativeResult.status, 0);
  assert.equal(nativeResult.captureComplete, true);
  assert.equal(nativeInvocation.command, "git");
  assert.equal(nativeInvocation.options.shell, false);
  assert.equal(nativeInvocation.options.encoding, null);
  assert.equal(nativeInvocation.options.maxBuffer, MAX_GIT_CAPTURE_BYTES);
  assert.ok(nativeInvocation.options.timeout <= GIT_COMMAND_TIMEOUT_MS);
  assert.ok(nativeInvocation.options.timeout > 0);
  assert.equal(nativeInvocation.args[0], "--no-replace-objects");
  assert.equal(nativeInvocation.options.env.GIT_NO_REPLACE_OBJECTS, "1");
  assert.equal(nativeInvocation.options.env.GIT_CONFIG_NOSYSTEM, "1");
  assert.equal(nativeInvocation.options.env.GIT_DIR, undefined);
  assert.equal(nativeInvocation.options.env.GIT_WORK_TREE, undefined);

  let afterSpawnNow = 1000;
  let afterSpawnCallCount = 0;
  const afterSpawnClock = {
    now: () => {
      afterSpawnCallCount += 1;
      return afterSpawnNow;
    }
  };
  const afterSpawnGit = runNativeGitWithStub((command, args, options) => {
    assert.equal(command, "git");
    assert.equal(args[0], "--no-replace-objects");
    assert.equal(options.timeout, 1000);
    afterSpawnNow = 2000;
    return {
      status: 0,
      signal: null,
      error: null,
      stdout: Buffer.from("complete", "utf8"),
      stderr: Buffer.alloc(0)
    };
  }, afterSpawnClock);
  const afterSpawnResult = afterSpawnGit(
    "C:/repo",
    ["show", "bounded"],
    2000
  );
  assert.ok(afterSpawnCallCount >= 2, "native boundary checks the clock after spawn");
  assert.equal(afterSpawnResult.status, 0);
  assert.equal(afterSpawnResult.captureComplete, false, "status zero after deadline is incomplete");
  assert.throws(
    () => runCheckedGitWithStub(afterSpawnResult)(
      "C:/repo",
      ["show", "bounded"],
      2000,
      "SOURCE_TEST_DEADLINE"
    ),
    /SOURCE_TEST_DEADLINE/,
    "post-spawn deadline cannot advance a complete capture"
  );

  for (const [label, nativeFailure] of [
    ["incomplete capture", {
      status: 0,
      signal: null,
      error: null,
      stdout: Buffer.alloc(0),
      stderr: Buffer.alloc(0),
      captureComplete: false
    }],
    ["error", {
      status: null,
      signal: null,
      error: new Error("synthetic"),
      stdout: Buffer.alloc(0),
      stderr: Buffer.alloc(0),
      captureComplete: false
    }],
    ["signal", {
      status: null,
      signal: "SIGTERM",
      error: null,
      stdout: Buffer.alloc(0),
      stderr: Buffer.alloc(0),
      captureComplete: false
    }],
    ["stderr", {
      status: 0,
      signal: null,
      error: null,
      stdout: Buffer.from("ok", "utf8"),
      stderr: Buffer.from("diagnostic", "utf8"),
      captureComplete: true
    }]
  ]) {
    assert.throws(
      () => runCheckedGitWithStub(nativeFailure)("C:/repo", ["show", "x"], Date.now() + 1000, "SOURCE_TEST_CAPTURE"),
      /SOURCE_TEST_CAPTURE/,
      label + " capture fails closed"
    );
  }

  const validObservation = observation;
  const compare = compareObservationShape(validObservation);
  assert.equal(compare(validObservation, validObservation), true);
  for (const [label, mutate] of [
    ["extra observation key", (candidate) => { candidate.extra = true; }],
    ["wrong source commit", (candidate) => { candidate.sourceCommit = "e".repeat(40); }],
    ["wrong integration commit", (candidate) => { candidate.integrationCommit = "f".repeat(40); }],
    ["wrong integration ref", (candidate) => { candidate.integrationRef = "refs/heads/main"; }],
    ["wrong corpus digest", (candidate) => { candidate.migrationCorpusSha256 = "e".repeat(64); }],
    ["wrong repository binding", (candidate) => { candidate.repositoryBindingSha256 = "f".repeat(64); }],
    ["wrong row path", (candidate) => { candidate.migrations[0].path = "supabase/migrations/20260907000000_other.sql"; }],
    ["wrong row bytes", (candidate) => { candidate.migrations[0].bytes += 1; }],
    ["wrong row hash", (candidate) => { candidate.migrations[0].sha256 = "e".repeat(64); }],
    ["reordered rows", (candidate) => {
      const row = candidate.migrations[0];
      candidate.migrations[0] = candidate.migrations[1];
      candidate.migrations[1] = row;
    }]
  ]) {
    const candidate = clone(validObservation);
    mutate(candidate);
    assert.equal(compare(candidate, validObservation), false, label + " rejects");
  }
  const reorderedKeys = {
    migrations: clone(validObservation.migrations),
    repositoryBindingSha256: validObservation.repositoryBindingSha256,
    migrationCorpusSha256: validObservation.migrationCorpusSha256,
    integrationRef: validObservation.integrationRef,
    integrationCommit: validObservation.integrationCommit,
    sourceCommit: validObservation.sourceCommit,
    schemaVersion: validObservation.schemaVersion
  };
  assert.equal(compare(reorderedKeys, validObservation), false, "strict artifact key insertion order is preserved");

  const strictJsonArtifact = JSON.stringify(validObservation);
  assert.equal(compare(parseStrictJson(strictJsonArtifact), validObservation), true);
  assert.throws(
    () => parseStrictJson('{"schemaVersion":1,"schemaVersion":2}'),
    /AUTHORITY_INDEX_INVALID/,
    "duplicate artifact keys are rejected before comparison"
  );
  assert.equal(
    Object.keys(collectSourceCommitObservation({
      repositoryRoot: path.resolve("missing-source-repository"),
      sourcePolicy: { ...policy, extra: true }
    })).includes("observation"),
    false,
    "invalid public source policy never exposes an observation"
  );
  console.log("source-evidence-contract=pass migration-count=56 remote-calls=0 mutations=0");
}

if (
  process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  runContract();
}
