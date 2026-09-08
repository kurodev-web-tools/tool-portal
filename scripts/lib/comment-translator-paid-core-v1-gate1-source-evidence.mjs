import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  parseStrictJson,
  verifyAuthorityBundle
} from "./comment-translator-paid-core-v1-gate1-evidence.mjs";

const SOURCE_INTEGRATION_REF = "refs/remotes/origin/codex/comment-translator-paid-v1-preview";

const SOURCE_POLICY_KEYS = Object.freeze([
  "schemaVersion",
  "expectedSourceCommit",
  "expectedIntegrationCommit",
  "expectedMigrationCorpusSha256",
  "expectedMigrationPaths",
  "expectedRepositoryBindingSha256"
]);
const OBSERVATION_KEYS = Object.freeze([
  "schemaVersion",
  "sourceCommit",
  "integrationCommit",
  "integrationRef",
  "migrationCorpusSha256",
  "repositoryBindingSha256",
  "migrations"
]);
const ROW_KEYS = Object.freeze(["path", "bytes", "sha256"]);
const MIGRATION_ROOT = "supabase/migrations";
const EXPECTED_MIGRATION_COUNT = 56;
const MAX_BLOB_BYTES = 1 * 1024 * 1024;
const MAX_TREE_BYTES = 32 * 1024 * 1024;
const MAX_GIT_CAPTURE_BYTES = 8 * 1024 * 1024;
const GIT_COMMAND_TIMEOUT_MS = 10 * 1000;
const COLLECTOR_DEADLINE_MS = 60 * 1000;
const COMMIT_PATTERN = /^[a-f0-9]{40}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const MIGRATION_PATH_PATTERN = /^supabase\/migrations\/\d{14}_[a-z0-9_]+\.sql$/;

const REASONS = Object.freeze({
  POLICY_UNAVAILABLE: "SOURCE_POLICY_UNAVAILABLE",
  POLICY_INVALID: "SOURCE_POLICY_INVALID",
  ROOT_INVALID: "SOURCE_ROOT_INVALID",
  NATIVE_INVALID: "SOURCE_NATIVE_INVALID",
  REF_INVALID: "SOURCE_INTEGRATION_REF_INVALID",
  COMMIT_INVALID: "SOURCE_COMMIT_INVALID",
  ANCESTRY_INVALID: "SOURCE_ANCESTRY_INVALID",
  TREE_INVALID: "SOURCE_MIGRATION_TREE_INVALID",
  ARTIFACT_INVALID: "SOURCE_MIGRATION_ARTIFACT_INVALID",
  OBSERVATION_INVALID: "SOURCE_OBSERVATION_INVALID",
  AUTHORITY_INVALID: "SOURCE_AUTHORITY_UNAVAILABLE",
  STAGE_INVALID: "SOURCE_STAGE_INVALID"
});

class SourceFailure extends Error {
  constructor(reason) {
    super(reason);
    this.reason = reason;
  }
}

function fail(reason) {
  throw new SourceFailure(reason);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, expected) {
  if (!isObject(value)) return false;
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length && actual.every((key, index) => key === sortedExpected[index]);
}

function isCommit(value) {
  return typeof value === "string" && COMMIT_PATTERN.test(value);
}

function isSha256(value) {
  return typeof value === "string" && SHA256_PATTERN.test(value);
}

function isMigrationPath(value) {
  return typeof value === "string" && MIGRATION_PATH_PATTERN.test(value);
}

function validateSourcePolicyShape(sourcePolicy) {
  if (!exactKeys(sourcePolicy, SOURCE_POLICY_KEYS)
    || sourcePolicy.schemaVersion !== 1
    || !isCommit(sourcePolicy.expectedSourceCommit)
    || !isCommit(sourcePolicy.expectedIntegrationCommit)
    || !isSha256(sourcePolicy.expectedMigrationCorpusSha256)
    || !isSha256(sourcePolicy.expectedRepositoryBindingSha256)
    || !Array.isArray(sourcePolicy.expectedMigrationPaths)
    || sourcePolicy.expectedMigrationPaths.length !== EXPECTED_MIGRATION_COUNT
    || sourcePolicy.expectedMigrationPaths.some((value) => !isMigrationPath(value))) {
    return false;
  }
  for (let index = 1; index < sourcePolicy.expectedMigrationPaths.length; index += 1) {
    if (sourcePolicy.expectedMigrationPaths[index - 1] >= sourcePolicy.expectedMigrationPaths[index]) return false;
  }
  return true;
}

function validateSourcePolicy(sourcePolicy) {
  if (sourcePolicy === undefined || sourcePolicy === null) {
    return { status: "SOURCE_UNAVAILABLE", reason: REASONS.POLICY_UNAVAILABLE };
  }
  if (!validateSourcePolicyShape(sourcePolicy)) {
    return { status: "SOURCE_UNAVAILABLE", reason: REASONS.POLICY_INVALID };
  }
  return { status: "SOURCE_VALID", reason: null };
}

function unavailable(reason) {
  return {
    status: "SOURCE_UNAVAILABLE",
    reason,
    remoteCalls: 0,
    mutations: 0,
    migrationCount: 0
  };
}

function sha256Bytes(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function decodeUtf8(bytes, reason = REASONS.NATIVE_INVALID) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail(reason);
  }
}

function minimalGitEnvironment() {
  return {
    PATH: process.env.PATH ?? "",
    PATHEXT: process.env.PATHEXT ?? "",
    SystemRoot: process.env.SystemRoot ?? "",
    WINDIR: process.env.WINDIR ?? "",
    ComSpec: process.env.ComSpec ?? "",
    TEMP: process.env.TEMP ?? "",
    TMP: process.env.TMP ?? "",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_TERMINAL_PROMPT: "0"
  };
}

function runNativeGit(repositoryRoot, args, deadlineAt) {
  const remainingMs = deadlineAt - Date.now();
  if (remainingMs <= 0) {
    return {
      status: null,
      signal: null,
      error: new Error("SOURCE_DEADLINE"),
      stdout: Buffer.alloc(0),
      stderr: Buffer.alloc(0),
      captureComplete: false,
      timeoutMs: 0
    };
  }
  const timeoutMs = Math.min(GIT_COMMAND_TIMEOUT_MS, remainingMs);
  const result = spawnSync("git", ["--no-replace-objects", ...args], {
    cwd: repositoryRoot,
    env: minimalGitEnvironment(),
    shell: false,
    windowsHide: true,
    timeout: timeoutMs,
    maxBuffer: MAX_GIT_CAPTURE_BYTES,
    encoding: null
  });
  const stdout = Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.from(result.stdout ?? "");
  const stderr = Buffer.isBuffer(result.stderr) ? result.stderr : Buffer.from(result.stderr ?? "");
  const deadlineReached = Date.now() >= deadlineAt;
  return {
    status: typeof result.status === "number" ? result.status : null,
    signal: result.signal ?? null,
    error: result.error ?? null,
    stdout,
    stderr,
    captureComplete: !deadlineReached && stdout.length + stderr.length <= MAX_GIT_CAPTURE_BYTES,
    timeoutMs
  };
}

function runCheckedGit(repositoryRoot, args, deadlineAt, reason) {
  const result = runNativeGit(repositoryRoot, args, deadlineAt);
  if (result.status !== 0
    || result.signal !== null
    || result.error
    || result.stderr.length !== 0
    || !result.captureComplete) {
    fail(reason);
  }
  return result.stdout;
}

function verifyRepositoryRoot(repositoryRoot) {
  if (typeof repositoryRoot !== "string" || !path.isAbsolute(repositoryRoot)) fail(REASONS.ROOT_INVALID);
  try {
    const stat = fs.lstatSync(repositoryRoot);
    if (!stat.isDirectory() || stat.isSymbolicLink()) fail(REASONS.ROOT_INVALID);
    const resolved = path.resolve(repositoryRoot);
    const real = path.resolve(fs.realpathSync.native(resolved));
    const same = process.platform === "win32"
      ? real.toLowerCase() === resolved.toLowerCase()
      : real === resolved;
    if (!same) fail(REASONS.ROOT_INVALID);
    return resolved;
  } catch (error) {
    if (error instanceof SourceFailure) throw error;
    fail(REASONS.ROOT_INVALID);
  }
}

function parseCommitOutput(bytes, expected, reason) {
  const text = decodeUtf8(bytes, reason);
  if (!new RegExp("^" + expected + "\\r?\\n$").test(text)) fail(reason);
  return expected;
}

function parseGitSize(bytes) {
  const text = decodeUtf8(bytes, REASONS.ARTIFACT_INVALID);
  const match = text.match(/^(0|[1-9]\d*)\r?\n$/);
  if (!match) fail(REASONS.ARTIFACT_INVALID);
  const size = Number(match[1]);
  if (!Number.isSafeInteger(size) || size < 1 || size > MAX_BLOB_BYTES) fail(REASONS.ARTIFACT_INVALID);
  return size;
}

function parseTreeRecords(bytes) {
  const text = decodeUtf8(bytes, REASONS.TREE_INVALID);
  if (!text.endsWith("\0")) fail(REASONS.TREE_INVALID);
  const records = text.slice(0, -1).split("\0");
  if (records.length !== EXPECTED_MIGRATION_COUNT) fail(REASONS.TREE_INVALID);
  return records.map((record) => {
    const match = record.match(/^(\d{6}) ([a-z]+) ([a-f0-9]{40})\t(.+)$/);
    if (!match) fail(REASONS.TREE_INVALID);
    return { mode: match[1], type: match[2], object: match[3], path: match[4] };
  });
}

function readMigrationTree(repositoryRoot, commit, expectedPaths, deadlineAt) {
  const treeBytes = runCheckedGit(
    repositoryRoot,
    ["ls-tree", "--full-tree", "-r", "-z", commit, "--", MIGRATION_ROOT],
    deadlineAt,
    REASONS.TREE_INVALID
  );
  const records = parseTreeRecords(treeBytes);
  const byPath = new Map();
  for (const record of records) {
    if (record.mode !== "100644" || record.type !== "blob" || !isMigrationPath(record.path) || byPath.has(record.path)) {
      fail(REASONS.TREE_INVALID);
    }
    byPath.set(record.path, record);
  }
  if (byPath.size !== expectedPaths.length || expectedPaths.some((entry) => !byPath.has(entry))) fail(REASONS.TREE_INVALID);

  let totalBytes = 0;
  const rows = [];
  for (const migrationPath of expectedPaths) {
    const record = byPath.get(migrationPath);
    const size = parseGitSize(runCheckedGit(
      repositoryRoot,
      ["cat-file", "-s", record.object],
      deadlineAt,
      REASONS.ARTIFACT_INVALID
    ));
    totalBytes += size;
    if (totalBytes > MAX_TREE_BYTES) fail(REASONS.ARTIFACT_INVALID);
    const blob = runCheckedGit(
      repositoryRoot,
      ["show", commit + ":" + migrationPath],
      deadlineAt,
      REASONS.ARTIFACT_INVALID
    );
    if (blob.length !== size) fail(REASONS.ARTIFACT_INVALID);
    rows.push({
      path: migrationPath,
      bytes: size,
      sha256: sha256Bytes(blob)
    });
  }
  return rows;
}

function corpusDigest(rows) {
  return sha256Bytes(Buffer.from(JSON.stringify(rows), "utf8"));
}

function sameRows(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function collectSourceObservationNative(repositoryRoot, sourcePolicy) {
  const deadlineAt = Date.now() + COLLECTOR_DEADLINE_MS;
  const refBytes = runCheckedGit(
    repositoryRoot,
    ["rev-parse", "--verify", SOURCE_INTEGRATION_REF + "^{commit}"],
    deadlineAt,
    REASONS.REF_INVALID
  );
  parseCommitOutput(refBytes, sourcePolicy.expectedIntegrationCommit, REASONS.REF_INVALID);

  for (const commit of [sourcePolicy.expectedSourceCommit, sourcePolicy.expectedIntegrationCommit]) {
    runCheckedGit(repositoryRoot, ["cat-file", "-e", commit + "^{commit}"], deadlineAt, REASONS.COMMIT_INVALID);
  }
  const ancestry = runNativeGit(
    repositoryRoot,
    ["merge-base", "--is-ancestor", sourcePolicy.expectedSourceCommit, sourcePolicy.expectedIntegrationCommit],
    deadlineAt
  );
  if (ancestry.status !== 0
    || ancestry.signal !== null
    || ancestry.error
    || ancestry.stderr.length !== 0
    || !ancestry.captureComplete) fail(REASONS.ANCESTRY_INVALID);

  const sourceRows = readMigrationTree(repositoryRoot, sourcePolicy.expectedSourceCommit, sourcePolicy.expectedMigrationPaths, deadlineAt);
  const integrationRows = readMigrationTree(repositoryRoot, sourcePolicy.expectedIntegrationCommit, sourcePolicy.expectedMigrationPaths, deadlineAt);
  const sourceCorpus = corpusDigest(sourceRows);
  const integrationCorpus = corpusDigest(integrationRows);
  if (!sameRows(sourceRows, integrationRows)
    || sourceCorpus !== integrationCorpus
    || sourceCorpus !== sourcePolicy.expectedMigrationCorpusSha256) {
    fail(REASONS.OBSERVATION_INVALID);
  }
  if (Date.now() >= deadlineAt) fail(REASONS.NATIVE_INVALID);

  return {
    schemaVersion: 1,
    sourceCommit: sourcePolicy.expectedSourceCommit,
    integrationCommit: sourcePolicy.expectedIntegrationCommit,
    integrationRef: SOURCE_INTEGRATION_REF,
    migrationCorpusSha256: sourceCorpus,
    repositoryBindingSha256: sourcePolicy.expectedRepositoryBindingSha256,
    migrations: sourceRows
  };
}

export function collectSourceCommitObservation({ repositoryRoot, sourcePolicy } = {}) {
  const policyCheck = validateSourcePolicy(sourcePolicy);
  if (policyCheck.status !== "SOURCE_VALID") return unavailable(policyCheck.reason);
  try {
    const root = verifyRepositoryRoot(repositoryRoot);
    const observation = collectSourceObservationNative(root, sourcePolicy);
    const result = {
      status: "SOURCE_OBSERVATION_VALID",
      reason: null,
      remoteCalls: 0,
      mutations: 0,
      migrationCount: EXPECTED_MIGRATION_COUNT
    };
    Object.defineProperty(result, "observation", {
      value: observation,
      enumerable: false,
      writable: false
    });
    return result;
  } catch (error) {
    if (error instanceof SourceFailure) return unavailable(error.reason);
    return unavailable(REASONS.NATIVE_INVALID);
  }
}

function compareObservationShape(observation, expected) {
  if (!isObject(observation)
    || !exactKeys(observation, OBSERVATION_KEYS)
    || observation.schemaVersion !== 1
    || !Array.isArray(observation.migrations)
    || observation.migrations.length !== EXPECTED_MIGRATION_COUNT
    || observation.sourceCommit !== expected.sourceCommit
    || observation.integrationCommit !== expected.integrationCommit
    || observation.integrationRef !== SOURCE_INTEGRATION_REF
    || observation.migrationCorpusSha256 !== expected.migrationCorpusSha256
    || observation.repositoryBindingSha256 !== expected.repositoryBindingSha256
    || !observation.migrations.every((row, index) => isObject(row)
      && exactKeys(row, ROW_KEYS)
      && row.path === expected.migrations[index].path
      && row.bytes === expected.migrations[index].bytes
      && row.sha256 === expected.migrations[index].sha256)) {
    return false;
  }
  return JSON.stringify(observation) === JSON.stringify(expected);
}

export function verifySourceCommitStage({ repositoryRoot, evidenceRoot, policy, sourcePolicy } = {}) {
  const sourcePolicyCheck = validateSourcePolicy(sourcePolicy);
  if (sourcePolicyCheck.status !== "SOURCE_VALID") return unavailable(sourcePolicyCheck.reason);
  if (typeof repositoryRoot !== "string" || !path.isAbsolute(repositoryRoot)
    || typeof evidenceRoot !== "string" || !path.isAbsolute(evidenceRoot)) {
    return unavailable(REASONS.ROOT_INVALID);
  }
  const authority = verifyAuthorityBundle({ repositoryRoot, evidenceRoot, policy });
  if (authority.status !== "AUTHORITY_VALID") return unavailable(REASONS.AUTHORITY_INVALID);
  if (authority.bundle === undefined
    || authority.bundle.index?.sourceCommit !== sourcePolicy.expectedSourceCommit
    || authority.bundle.index?.migrationCorpusSha256 !== sourcePolicy.expectedMigrationCorpusSha256) {
    return unavailable(REASONS.STAGE_INVALID);
  }
  const descriptor = authority.bundle.index.stages?.sourceCommit;
  if (!descriptor
    || !exactKeys(descriptor.targetBindings, ["repository"])
    || descriptor.targetBindings.repository !== sourcePolicy.expectedRepositoryBindingSha256
    || !Array.isArray(descriptor.artifacts)
    || descriptor.artifacts.length !== 1
    || descriptor.artifacts[0].role !== "source-observation") {
    return unavailable(REASONS.STAGE_INVALID);
  }
  const artifact = descriptor.artifacts[0];
  const artifactBytes = authority.bundle.artifacts?.[artifact.path];
  if (!Buffer.isBuffer(artifactBytes)) return unavailable(REASONS.ARTIFACT_INVALID);
  let committedObservation;
  try {
    committedObservation = parseStrictJson(decodeUtf8(artifactBytes, REASONS.ARTIFACT_INVALID));
  } catch {
    return unavailable(REASONS.ARTIFACT_INVALID);
  }
  const fresh = collectSourceCommitObservation({ repositoryRoot, sourcePolicy });
  if (fresh.status !== "SOURCE_OBSERVATION_VALID" || !compareObservationShape(committedObservation, fresh.observation)) {
    return unavailable(REASONS.OBSERVATION_INVALID);
  }
  const result = {
    status: "SOURCE_STAGE_VALID",
    reason: null,
    stage: "sourceCommit",
    remoteCalls: 0,
    mutations: 0,
    migrationCount: EXPECTED_MIGRATION_COUNT
  };
  Object.defineProperty(result, "observation", {
    value: fresh.observation,
    enumerable: false,
    writable: false
  });
  return result;
}
