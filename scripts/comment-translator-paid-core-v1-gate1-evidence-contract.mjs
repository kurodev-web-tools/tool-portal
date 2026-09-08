import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createApprovalSnapshot, evaluateGate1Decision } from "./comment-translator-paid-core-v1-gate1-operator-contract.mjs";

import {
  AUTHORITY_STAGES,
  AUTHORITY_DOCUMENT_PATH,
  parseStrictJson,
  validateAuthorityPolicy,
  validateEvidenceIndex,
  verifyAuthorityBundle
} from "./lib/comment-translator-paid-core-v1-gate1-evidence.mjs";

const source = fs.readFileSync(
  path.join(process.cwd(), "scripts", "lib", "comment-translator-paid-core-v1-gate1-evidence.mjs"),
  "utf8"
);

function clone(value) {
  return structuredClone(value);
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function writeJson(filePath, value) {
  const bytes = Buffer.from(JSON.stringify(value), "utf8");
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, bytes);
  return bytes;
}

const sourceCommit = "a".repeat(40);
const authorityCommit = "b".repeat(40);
const migrationCorpusSha256 = "c".repeat(64);
const targetDigest = "d".repeat(64);
const producerDigest = "e".repeat(64);
const nowIso = "2026-09-07T00:00:00.000Z";
const nowMs = Date.parse(nowIso);
const observationWindow = {
  notBefore: "2026-09-06T00:00:00.000Z",
  notAfter: nowIso
};

function createPolicy() {
  return {
    schemaVersion: 1,
    expectedAuthorityCommit: authorityCommit,
    expectedSourceCommit: sourceCommit,
    expectedMigrationCorpusSha256: migrationCorpusSha256,
    stages: Object.fromEntries(AUTHORITY_STAGES.map((stage) => [stage, {
      producer: { entry: `scripts/producers/${stage}.mjs`, sha256: producerDigest },
      targetBindings: { repository: targetDigest },
      observationWindow: { ...observationWindow }
    }]))
  };
}

function createFixture(root) {
  const policy = createPolicy();
  const index = {
    schemaVersion: 1,
    sourceCommit,
    migrationCorpusSha256,
    stages: {}
  };
  for (const stage of AUTHORITY_STAGES) {
    const artifactRelativePath = `artifacts/${stage}.json`;
    const artifactBytes = Buffer.from(JSON.stringify({ stage, observed: true }), "utf8");
    const artifact = {
      role: "result",
      path: artifactRelativePath,
      sha256: sha256(artifactBytes),
      bytes: artifactBytes.length
    };
    fs.mkdirSync(path.join(root, path.dirname(artifactRelativePath)), { recursive: true });
    fs.writeFileSync(path.join(root, artifactRelativePath), artifactBytes);
    const descriptor = {
      producer: { ...policy.stages[stage].producer },
      targetBindings: { ...policy.stages[stage].targetBindings },
      startedAt: "2026-09-06T12:00:00.000Z",
      completedAt: "2026-09-06T12:05:00.000Z",
      receipt: null,
      artifacts: [artifact]
    };
    const receipt = {
      schemaVersion: 1,
      stage,
      sourceCommit,
      migrationCorpusSha256,
      producer: { ...descriptor.producer },
      targetBindings: { ...descriptor.targetBindings },
      startedAt: descriptor.startedAt,
      completedAt: descriptor.completedAt,
      native: {
        kind: "process",
        exitCode: 0,
        signal: null,
        error: null,
        captureComplete: true,
        stdoutBytes: 1,
        stderrBytes: 0
      },
      artifacts: [artifact]
    };
    const receiptRelativePath = `receipts/${stage}.json`;
    const receiptBytes = writeJson(path.join(root, receiptRelativePath), receipt);
    descriptor.receipt = {
      path: receiptRelativePath,
      sha256: sha256(receiptBytes),
      bytes: receiptBytes.length
    };
    index.stages[stage] = descriptor;
  }
  return { policy, index };
}

function withIsolatedFixture(callback) {
  const root = fs.mkdtempSync(path.join(process.cwd(), "scripts", ".gate1-evidence-case-"));
  try {
    return callback({ root, ...createFixture(root) });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function syncReceiptArtifacts(root, candidate, stage) {
  const receiptReference = candidate.stages[stage].receipt;
  const receiptPath = path.join(root, receiptReference.path);
  const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
  receipt.artifacts = clone(candidate.stages[stage].artifacts);
  const receiptBytes = writeJson(receiptPath, receipt);
  receiptReference.sha256 = sha256(receiptBytes);
  receiptReference.bytes = receiptBytes.length;
  return receipt;
}

function mutateReceipt(root, candidate, stage, mutate) {
  const receiptReference = candidate.stages[stage].receipt;
  const receiptPath = path.join(root, receiptReference.path);
  const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
  mutate(receipt);
  const receiptBytes = writeJson(receiptPath, receipt);
  receiptReference.sha256 = sha256(receiptBytes);
  receiptReference.bytes = receiptBytes.length;
  return receipt;
}

const fixtureRoot = fs.mkdtempSync(path.join(process.cwd(), "scripts", ".gate1-evidence-contract-"));
try {
  const { policy, index } = createFixture(fixtureRoot);

  assert.deepEqual(validateAuthorityPolicy(policy, nowMs), { status: "AUTHORITY_VALID", reason: null }, "valid policy has the strict schema");
  const valid = validateEvidenceIndex(index, policy, fixtureRoot, nowMs);
  assert.equal(valid.status, "AUTHORITY_VALID", "valid pure authority bundle is accepted");
  assert.equal(valid.stageCount, 9, "exactly nine fixed stages are required");
  assert.equal(valid.remoteCalls, 0);
  assert.equal(valid.mutations, 0);
  assert.doesNotMatch(JSON.stringify(valid), /artifacts|receipts|private|secret/i, "public summary does not expose private artifact paths");
  assert.ok(valid.bundle, "validated bytes remain available only through the internal bundle");

  const missingPolicy = verifyAuthorityBundle({
    repositoryRoot: path.join(fixtureRoot, "missing-repository"),
    evidenceRoot: path.join(fixtureRoot, "missing-evidence")
  });
  assert.equal(missingPolicy.reason, "AUTHORITY_POLICY_UNAVAILABLE", "missing policy fails before Git or artifact access");
  assert.equal(missingPolicy.stageCount, 0);
  const invalidPolicy = verifyAuthorityBundle({
    repositoryRoot: path.join(fixtureRoot, "missing-repository"),
    evidenceRoot: path.join(fixtureRoot, "missing-evidence"),
    policy: { schemaVersion: 1 }
  });
  assert.equal(invalidPolicy.reason, "AUTHORITY_POLICY_INVALID", "incomplete policy fails closed before Git");

  for (const invalidJson of [
    '{"a":1,"a":2}',
    '{"a":1.0}',
    String.raw`{"a":"\u0061"}`,
    '{"a":-0}',
    '{"a":1} trailing'
  ]) {
    assert.throws(() => parseStrictJson(invalidJson), /AUTHORITY_INDEX_INVALID/, `strict JSON rejects ${invalidJson}`);
  }

  const missingStage = clone(index);
  delete missingStage.stages.sourceCommit;
  assert.equal(validateEvidenceIndex(missingStage, policy, fixtureRoot, nowMs).reason, "AUTHORITY_INDEX_INVALID", "missing stages fail closed");
  const unknownStage = clone(index);
  unknownStage.stages.unknownStage = clone(unknownStage.stages.sourceCommit);
  assert.equal(validateEvidenceIndex(unknownStage, policy, fixtureRoot, nowMs).reason, "AUTHORITY_INDEX_INVALID", "unknown stages fail closed");
  assert.throws(() => parseStrictJson('{"stages":{"sourceCommit":{},"sourceCommit":{}}}'), /AUTHORITY_INDEX_INVALID/, "duplicate stage keys fail strict parsing");

  const wrongSource = clone(index);
  wrongSource.sourceCommit = "f".repeat(40);
  assert.equal(validateEvidenceIndex(wrongSource, policy, fixtureRoot, nowMs).reason, "AUTHORITY_INDEX_INVALID", "wrong source revision fails closed");
  const wrongCorpus = clone(index);
  wrongCorpus.migrationCorpusSha256 = "f".repeat(64);
  assert.equal(validateEvidenceIndex(wrongCorpus, policy, fixtureRoot, nowMs).reason, "AUTHORITY_INDEX_INVALID", "wrong migration corpus fails closed");
  const wrongProducer = clone(index);
  wrongProducer.stages.sourceCommit.producer.sha256 = "f".repeat(64);
  assert.equal(validateEvidenceIndex(wrongProducer, policy, fixtureRoot, nowMs).reason, "AUTHORITY_INDEX_INVALID", "wrong producer provenance fails closed");
  const wrongTarget = clone(index);
  wrongTarget.stages.sourceCommit.targetBindings.repository = "f".repeat(64);
  assert.equal(validateEvidenceIndex(wrongTarget, policy, fixtureRoot, nowMs).reason, "AUTHORITY_INDEX_INVALID", "wrong target binding fails closed");

  withIsolatedFixture(({ root, policy: isolatedPolicy, index: isolatedIndex }) => {
    const duplicatePath = clone(isolatedIndex);
    const firstArtifact = duplicatePath.stages.sourceCommit.artifacts[0];
    duplicatePath.stages.sourceCommit.artifacts.push({ ...firstArtifact, role: "alternate-result" });
    const matchingReceipt = syncReceiptArtifacts(root, duplicatePath, "sourceCommit");
    assert.deepEqual(matchingReceipt.artifacts, duplicatePath.stages.sourceCommit.artifacts, "duplicate-path case has an internally matching receipt");
    const result = validateEvidenceIndex(duplicatePath, isolatedPolicy, root, nowMs);
    assert.equal(result.reason, "AUTHORITY_INDEX_INVALID", "same-stage artifact paths fail even under distinct roles");
  });

  withIsolatedFixture(({ root, policy: isolatedPolicy, index: isolatedIndex }) => {
    const reusedPath = clone(isolatedIndex);
    const sourceArtifact = reusedPath.stages.sourceCommit.artifacts[0];
    reusedPath.stages.previewReadback.artifacts[0] = { ...sourceArtifact, role: "preview-result" };
    const sourceReceipt = syncReceiptArtifacts(root, reusedPath, "sourceCommit");
    const previewReceipt = syncReceiptArtifacts(root, reusedPath, "previewReadback");
    assert.deepEqual(sourceReceipt.artifacts, reusedPath.stages.sourceCommit.artifacts, "cross-stage reuse has a matching source receipt");
    assert.deepEqual(previewReceipt.artifacts, reusedPath.stages.previewReadback.artifacts, "cross-stage reuse has a matching preview receipt");
    const result = validateEvidenceIndex(reusedPath, isolatedPolicy, root, nowMs);
    assert.equal(result.status, "AUTHORITY_VALID", "identical artifact paths remain reusable across stages");
  });

  withIsolatedFixture(({ root, policy: isolatedPolicy, index: isolatedIndex }) => {
    const overlap = clone(isolatedIndex);
    const previewReceiptReference = overlap.stages.previewReadback.receipt;
    overlap.stages.sourceCommit.artifacts[0] = {
      role: "receipt-overlap",
      path: previewReceiptReference.path,
      sha256: previewReceiptReference.sha256,
      bytes: previewReceiptReference.bytes
    };
    const matchingReceipt = syncReceiptArtifacts(root, overlap, "sourceCommit");
    assert.deepEqual(matchingReceipt.artifacts, overlap.stages.sourceCommit.artifacts, "receipt-overlap case has an internally matching source receipt");
    const result = validateEvidenceIndex(overlap, isolatedPolicy, root, nowMs);
    assert.equal(result.reason, "AUTHORITY_INDEX_INVALID", "receipt and artifact paths cannot overlap");
  });

  const orderFailure = clone(index);
  orderFailure.stages.sourceCommit.startedAt = "2026-09-06T12:06:00.000Z";
  orderFailure.stages.sourceCommit.completedAt = "2026-09-06T12:05:00.000Z";
  assert.equal(validateEvidenceIndex(orderFailure, policy, fixtureRoot, nowMs).reason, "AUTHORITY_TIME_INVALID", "reversed observation interval fails closed");
  const futurePolicy = clone(policy);
  futurePolicy.stages.sourceCommit.observationWindow.notAfter = "2026-09-08T00:00:00.000Z";
  assert.equal(validateEvidenceIndex(index, futurePolicy, fixtureRoot, nowMs).reason, "AUTHORITY_TIME_INVALID", "future observation windows fail closed");

  for (const [label, mutate] of [
    ["path traversal", (candidate) => { candidate.stages.sourceCommit.artifacts[0].path = "../outside.json"; }],
    ["changed artifact hash", (candidate) => { candidate.stages.sourceCommit.artifacts[0].sha256 = "f".repeat(64); }],
    ["changed artifact size", (candidate) => { candidate.stages.sourceCommit.artifacts[0].bytes += 1; }]
  ]) {
    withIsolatedFixture(({ root, policy: isolatedPolicy, index: isolatedIndex }) => {
      const candidate = clone(isolatedIndex);
      mutate(candidate);
      const matchingReceipt = syncReceiptArtifacts(root, candidate, "sourceCommit");
      assert.deepEqual(matchingReceipt.artifacts, candidate.stages.sourceCommit.artifacts, label + " case has an internally matching receipt");
      const result = validateEvidenceIndex(candidate, isolatedPolicy, root, nowMs);
      assert.equal(result.reason, "AUTHORITY_ARTIFACT_INVALID", label + " fails at the artifact boundary");
    });
  }

  withIsolatedFixture(({ root, policy: isolatedPolicy, index: isolatedIndex }) => {
    const oversized = clone(isolatedIndex);
    oversized.stages.sourceCommit.artifacts[0].bytes = 1 * 1024 * 1024 + 1;
    assert.equal(validateEvidenceIndex(oversized, isolatedPolicy, root, nowMs).reason, "AUTHORITY_INDEX_INVALID", "oversized references fail before reads");
  });

  withIsolatedFixture(({ root, policy: isolatedPolicy, index: isolatedIndex }) => {
    const totalOversized = clone(isolatedIndex);
    for (const stage of AUTHORITY_STAGES.slice(0, 3)) {
      totalOversized.stages[stage].artifacts = Array.from({ length: 16 }, (_, artifactIndex) => ({
        role: "artifact-" + artifactIndex,
        path: "artifacts/" + stage + "-" + artifactIndex + ".json",
        sha256: "a".repeat(64),
        bytes: 1 * 1024 * 1024
      }));
    }
    assert.equal(validateEvidenceIndex(totalOversized, isolatedPolicy, root, nowMs).reason, "AUTHORITY_ARTIFACT_INVALID", "32 MiB total JSON cap fails closed");
  });

  withIsolatedFixture(({ root, policy: isolatedPolicy, index: isolatedIndex }) => {
    const nonregular = clone(isolatedIndex);
    const nonregularPath = path.join(root, "artifacts", "nonregular.json");
    fs.mkdirSync(nonregularPath);
    nonregular.stages.sourceCommit.artifacts[0].path = "artifacts/nonregular.json";
    const matchingReceipt = syncReceiptArtifacts(root, nonregular, "sourceCommit");
    assert.deepEqual(matchingReceipt.artifacts, nonregular.stages.sourceCommit.artifacts, "nonregular case has an internally matching receipt");
    const result = validateEvidenceIndex(nonregular, isolatedPolicy, root, nowMs);
    assert.equal(result.reason, "AUTHORITY_ARTIFACT_INVALID", "nonregular artifacts fail at the artifact boundary");
  });

  let symlinkSupported = true;
  withIsolatedFixture(({ root, policy: isolatedPolicy, index: isolatedIndex }) => {
    const symlinkPath = path.join(root, "artifacts", "symlink.json");
    try {
      fs.symlinkSync(path.join(root, "artifacts", "sourceCommit.json"), symlinkPath, "file");
    } catch {
      symlinkSupported = false;
      return;
    }
    const symlinked = clone(isolatedIndex);
    symlinked.stages.sourceCommit.artifacts[0].path = "artifacts/symlink.json";
    const matchingReceipt = syncReceiptArtifacts(root, symlinked, "sourceCommit");
    assert.deepEqual(matchingReceipt.artifacts, symlinked.stages.sourceCommit.artifacts, "symlink case has an internally matching receipt");
    const result = validateEvidenceIndex(symlinked, isolatedPolicy, root, nowMs);
    assert.equal(result.reason, "AUTHORITY_ARTIFACT_INVALID", "symlink artifacts fail at the artifact boundary");
  });

  for (const [label, mutate] of [
    ["incomplete capture", (receipt) => { receipt.native.captureComplete = false; }],
    ["error", (receipt) => { receipt.native.error = "synthetic"; }],
    ["signal", (receipt) => { receipt.native.signal = "SIGTERM"; }],
    ["stderr", (receipt) => { receipt.native.stderrBytes = 1; }],
    ["unknown receipt field", (receipt) => { receipt.extra = true; }]
  ]) {
    withIsolatedFixture(({ root, policy: isolatedPolicy, index: isolatedIndex }) => {
      const candidate = clone(isolatedIndex);
      const mutatedReceipt = mutateReceipt(root, candidate, "sourceCommit", mutate);
      assert.ok(mutatedReceipt, label + " case rewrites only its fresh receipt");
      const result = validateEvidenceIndex(candidate, isolatedPolicy, root, nowMs);
      assert.equal(result.reason, "AUTHORITY_RECEIPT_INVALID", label + " receipt fails at the receipt boundary");
    });
  }

  function extractFunction(name) {
    const start = source.indexOf(`function ${name}(`);
    assert.ok(start >= 0, `${name} exists`);
    const bodyStart = source.indexOf("{", start);
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

  let nativeInvocation = null;
  const extractedNativeGit = new Function(
    "spawnSync",
    "process",
    "GIT_TIMEOUT_MS",
    "MAX_GIT_CAPTURE_BYTES",
    `${extractFunction("minimalGitEnvironment")}
     return ${extractFunction("runNativeGit")};`
  )(
    (command, args, options) => {
      nativeInvocation = { command, args, options };
      return { status: 0, signal: null, error: null, stdout: Buffer.from("ok"), stderr: Buffer.alloc(0) };
    },
    process,
    10 * 1000,
    8 * 1024 * 1024
  );
  const nativeResult = extractedNativeGit("C:/repo", ["cat-file", "-e", `${sourceCommit}^{commit}`]);
  assert.equal(nativeResult.status, 0, "extracted native Git boundary accepts a complete result");
  assert.equal(nativeInvocation.command, "git");
  assert.equal(nativeInvocation.options.shell, false, "native Git disables shell execution");
  assert.equal(nativeInvocation.options.timeout, 10 * 1000, "native Git has a bounded timeout");
  assert.equal(nativeInvocation.options.maxBuffer, 8 * 1024 * 1024, "native Git has a bounded combined capture limit");
  assert.equal(nativeInvocation.options.encoding, null, "native Git retains raw bounded bytes");
  assert.equal(nativeInvocation.args[0], "--no-replace-objects", "native Git disables replace refs");
  assert.equal(nativeInvocation.options.env.GIT_NO_REPLACE_OBJECTS, "1");
  assert.equal(nativeInvocation.options.env.GIT_DIR, undefined, "native Git does not inherit repository redirection");
  assert.equal(nativeInvocation.options.env.GIT_WORK_TREE, undefined, "native Git does not inherit work-tree redirection");

  const extractedOriginalArtifactPaths = new Function(
    "path",
    `${extractFunction("originalArtifactPaths")}\nreturn originalArtifactPaths;`
  )(path);
  const ancestorRoot = path.resolve("gate1-ancestor-root", "nested");
  const ancestorPaths = extractedOriginalArtifactPaths(ancestorRoot, "artifacts/result.json");
  const expectedAncestors = [];
  let ancestor = ancestorRoot;
  while (true) {
    expectedAncestors.unshift(ancestor);
    const parent = path.dirname(ancestor);
    if (parent === ancestor) break;
    ancestor = parent;
  }
  assert.deepEqual(ancestorPaths.slice(0, expectedAncestors.length), expectedAncestors, "artifact probe includes every original root ancestor");
  assert.equal(ancestorPaths[expectedAncestors.length], path.join(ancestorRoot, "artifacts"), "artifact probe resumes from the evidence root");
  assert.equal(ancestorPaths.at(-1), path.join(ancestorRoot, "artifacts", "result.json"), "artifact probe includes the original target path");
  assert.doesNotMatch(source, /realRoot/, "root verification does not replace original paths with a canonical root");

  let reparseInvocation = null;
  let reparseNativeResult = null;
  const windowsSystemRoot = path.parse(process.cwd()).root;
  const windowsProbeProcess = {
    platform: "win32",
    env: { SystemRoot: windowsSystemRoot }
  };
  const extractedReparseProbe = new Function(
    "spawnSync",
    "process",
    "path",
    "WINDOWS_REPARSE_SCRIPT",
    "WINDOWS_REPARSE_TIMEOUT_MS",
    "WINDOWS_REPARSE_CAPTURE_BYTES",
    "decodeUtf8",
    "exactKeys",
    `${extractFunction("runWindowsReparseProbe")}`
      + "\nreturn runWindowsReparseProbe;"
  )(
    (command, args, options) => {
      reparseInvocation = { command, args, options };
      return reparseNativeResult;
    },
    windowsProbeProcess,
    path,
    "controlled-reparse-script",
    10 * 1000,
    64 * 1024,
    (bytes) => new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    (value, expected) => isObjectForContract(value)
      && Object.keys(value).sort().join("\0") === [...expected].sort().join("\0")
  );
  const reparsePaths = [
    path.resolve("gate1-reparse-root"),
    path.resolve("gate1-reparse-root", "artifacts", "result.json")
  ];
  const probe = (nativeResult) => {
    reparseNativeResult = nativeResult;
    reparseInvocation = null;
    return extractedReparseProbe(reparsePaths);
  };
  function isObjectForContract(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  const successfulReparseProbe = probe({
    status: 0,
    signal: null,
    error: null,
    stdout: Buffer.from(JSON.stringify({ checkedCount: reparsePaths.length, reparseCount: 0 }), "utf8"),
    stderr: Buffer.alloc(0)
  });
  assert.deepEqual(successfulReparseProbe, { status: "PASS", checkedCount: reparsePaths.length, reparseCount: 0 }, "Windows reparse probe accepts clean attributes");
  assert.equal(reparseInvocation.command, path.join(windowsSystemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe"), "Windows reparse probe uses the fixed inbox PowerShell path");
  assert.deepEqual(reparseInvocation.args, ["-NoProfile", "-NonInteractive", "-Command", "controlled-reparse-script"], "Windows reparse probe uses fixed process arguments");
  assert.equal(reparseInvocation.options.shell, false, "Windows reparse probe disables shell execution");
  assert.equal(reparseInvocation.options.timeout, 10 * 1000, "Windows reparse probe has a bounded timeout");
  assert.equal(reparseInvocation.options.maxBuffer, 64 * 1024, "Windows reparse probe has a bounded capture limit");
  assert.equal(reparseInvocation.options.encoding, null, "Windows reparse probe retains raw bounded bytes");
  assert.deepEqual(JSON.parse(reparseInvocation.options.input.toString("utf8")), reparsePaths, "Windows reparse probe receives the original absolute paths");

  assert.deepEqual(probe({
    status: 1,
    signal: null,
    error: null,
    stdout: Buffer.alloc(0),
    stderr: Buffer.alloc(0)
  }), { status: "FAIL", checkedCount: 0, reparseCount: 0 }, "attribute probe errors fail closed");
  assert.deepEqual(probe({
    status: 0,
    signal: null,
    error: null,
    stdout: Buffer.from(JSON.stringify({ checkedCount: reparsePaths.length - 1, reparseCount: 0 }), "utf8"),
    stderr: Buffer.alloc(0)
  }), { status: "FAIL", checkedCount: 0, reparseCount: 0 }, "attribute count mismatches fail closed");
  assert.deepEqual(probe({
    status: 0,
    signal: null,
    error: null,
    stdout: Buffer.from(JSON.stringify({ checkedCount: reparsePaths.length, reparseCount: 1 }), "utf8"),
    stderr: Buffer.alloc(0)
  }), { status: "FAIL", checkedCount: 0, reparseCount: 0 }, "reparse attributes fail closed");
  assert.deepEqual(probe({
    status: null,
    signal: "SIGTERM",
    error: null,
    stdout: Buffer.from(JSON.stringify({ checkedCount: reparsePaths.length, reparseCount: 0 }), "utf8"),
    stderr: Buffer.alloc(0)
  }), { status: "FAIL", checkedCount: 0, reparseCount: 0 }, "incomplete attribute capture fails closed");

  const decodeUtf8ForGitContract = (bytes) => new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const failForGitContract = (reason) => { throw new Error(reason); };
  const isCommitForGitContract = (value) => typeof value === "string" && /^[a-f0-9]{40}$/.test(value);
  const parseGitTreeForContract = new Function(
    "decodeUtf8",
    "fail",
    "REASONS",
    `${extractFunction("parseGitTreeRecord")}\nreturn parseGitTreeRecord;`
  )(decodeUtf8ForGitContract, failForGitContract, {
    GIT_BLOB_INVALID: "AUTHORITY_GIT_BLOB_INVALID",
    PRODUCER_INVALID: "AUTHORITY_PRODUCER_INVALID"
  });
  const parseGitBlobSizeForContract = new Function(
    "decodeUtf8",
    "fail",
    "REASONS",
    "MAX_AUTHORITY_DOCUMENT_BYTES",
    `${extractFunction("parseGitBlobSize")}\nreturn parseGitBlobSize;`
  )(decodeUtf8ForGitContract, failForGitContract, { DOCUMENT_INVALID: "AUTHORITY_DOCUMENT_INVALID" }, 1 * 1024 * 1024);
  const verifyAuthorityForContract = (runGit, runNativeGit) => new Function(
    "runGit",
    "decodeUtf8",
    "isCommit",
    "fail",
    "parseGitTreeRecord",
    "runNativeGit",
    "sha256Bytes",
    "AUTHORITY_DOCUMENT_PATH",
   "AUTHORITY_STAGES",
    "parseGitBlobSize",
    "MAX_AUTHORITY_DOCUMENT_BYTES",
    "REASONS",
    `${extractFunction("verifyAuthorityCommit")}\nreturn verifyAuthorityCommit;`
  )(
    runGit,
    decodeUtf8ForGitContract,
    isCommitForGitContract,
    failForGitContract,
    parseGitTreeForContract,
    runNativeGit,
    (bytes) => crypto.createHash("sha256").update(bytes).digest("hex"),
    AUTHORITY_DOCUMENT_PATH,
   AUTHORITY_STAGES,
    parseGitBlobSizeForContract,
    1 * 1024 * 1024,
    {
      GIT_COMMIT_INVALID: "AUTHORITY_GIT_COMMIT_INVALID",
      GIT_PARENT_INVALID: "AUTHORITY_GIT_PARENT_INVALID",
      GIT_DIFF_INVALID: "AUTHORITY_GIT_DIFF_INVALID",
      GIT_ANCESTRY_INVALID: "AUTHORITY_GIT_ANCESTRY_INVALID",
      GIT_BLOB_INVALID: "AUTHORITY_GIT_BLOB_INVALID",
      DOCUMENT_INVALID: "AUTHORITY_DOCUMENT_INVALID",
      PRODUCER_INVALID: "AUTHORITY_PRODUCER_INVALID"
    }
  );
  const parentCommit = "1".repeat(40);
  const authorityObject = "2".repeat(40);
  const sourceObject = "3".repeat(40);
  const oldDocumentObject = "4".repeat(40);
  const authorityDocumentBytes = Buffer.from("authority-document", "utf8");
  const sourceProducerBytes = Buffer.from("source-producer", "utf8");
  const producerPolicy = clone(policy);
  producerPolicy.stages.sourceCommit.producer.entry = AUTHORITY_DOCUMENT_PATH;
  for (const stage of AUTHORITY_STAGES) producerPolicy.stages[stage].producer.sha256 = sha256(sourceProducerBytes);
  const authorityGitCalls = [];
  let authorityTreeLookupCount = 0;
  const authorityRunGit = (_root, args) => {
    authorityGitCalls.push(args);
    if (args[0] === "cat-file" && args[1] === "-e") return Buffer.alloc(0);
    if (args[0] === "show" && args[1] === "-s") return Buffer.from(`${parentCommit}\n`, "utf8");
    if (args[0] === "diff-tree") return Buffer.from(`:100644 100644 ${oldDocumentObject} ${authorityObject} M\t${AUTHORITY_DOCUMENT_PATH}\n`, "utf8");
    if (args[0] === "ls-tree") {
      const commit = args[2];
      const entry = args.at(-1);
      if (commit === authorityCommit && entry === AUTHORITY_DOCUMENT_PATH) {
        authorityTreeLookupCount += 1;
        if (authorityTreeLookupCount > 1) throw new Error("AUTHORITY_PRODUCER_USED_AUTHORITY_COMMIT");
        return Buffer.from(`100644 blob ${authorityObject}\t${AUTHORITY_DOCUMENT_PATH}\0`, "utf8");
      }
      return Buffer.from(`100644 blob ${sourceObject}\t${entry}\0`, "utf8");
    }
    if (args[0] === "cat-file" && args[1] === "-s") return Buffer.from(`${authorityDocumentBytes.length}\n`, "utf8");
    if (args[0] === "show" && typeof args[1] === "string" && args[1].includes(":")) {
      return args[1].startsWith(`${authorityCommit}:`) ? authorityDocumentBytes : sourceProducerBytes;
    }
    throw new Error(`UNEXPECTED_GIT_CALL:${args.join(" ")}`);
  };
  const authorityRunNativeGit = (_root, args) => {
    assert.deepEqual(args, ["merge-base", "--is-ancestor", sourceCommit, authorityCommit], "authority ancestry uses the fixed commits");
    return { status: 0, signal: null, error: null, stdout: Buffer.alloc(0), stderr: Buffer.alloc(0), captureComplete: true };
  };
  const authorityBytesResult = verifyAuthorityForContract(authorityRunGit, authorityRunNativeGit)("C:/repo", producerPolicy);
  assert.deepEqual(authorityBytesResult, authorityDocumentBytes, "authority document is read from the approved authority commit");
  assert.ok(authorityGitCalls.some((args) => args[0] === "ls-tree" && args[2] === sourceCommit && args.at(-1) === AUTHORITY_DOCUMENT_PATH), "every producer blob is resolved from the approved source commit");
  assert.equal(authorityTreeLookupCount, 1, "authority document is not reused as a producer blob source");

  let oversizedAuthorityRead = false;
  const oversizedRunGit = (_root, args) => {
    if (args[0] === "cat-file" && args[1] === "-e") return Buffer.alloc(0);
    if (args[0] === "show" && args[1] === "-s") return Buffer.from(`${parentCommit}\n`, "utf8");
    if (args[0] === "diff-tree") return Buffer.from(`:100644 100644 ${oldDocumentObject} ${authorityObject} M\t${AUTHORITY_DOCUMENT_PATH}\n`, "utf8");
    if (args[0] === "ls-tree") return Buffer.from(`100644 blob ${authorityObject}\t${AUTHORITY_DOCUMENT_PATH}\0`, "utf8");
    if (args[0] === "cat-file" && args[1] === "-s") return Buffer.from(`${1 * 1024 * 1024 + 1}\n`, "utf8");
    if (args[0] === "show" && typeof args[1] === "string" && args[1].includes(":")) {
      oversizedAuthorityRead = true;
      throw new Error("AUTHORITY_BLOB_READ_BEFORE_SIZE_CHECK");
    }
    throw new Error(`UNEXPECTED_GIT_CALL:${args.join(" ")}`);
  };
  assert.throws(
    () => verifyAuthorityForContract(oversizedRunGit, authorityRunNativeGit)("C:/repo", policy),
    /AUTHORITY_DOCUMENT_INVALID/,
    "oversized authority blobs fail before blob content is read"
  );
  assert.equal(oversizedAuthorityRead, false, "oversized authority blob is rejected before git show");

  const approvals = createApprovalSnapshot();
  Object.keys(approvals).slice(0, 12).forEach(state => { approvals[state] = "approved"; });
  const labels = Object.fromEntries(AUTHORITY_STAGES.map(stage => [stage, { status: "PASS", synthetic: false }]));
  assert.equal(evaluateGate1Decision({ approvals, evidence: labels }).decision, "NO-GO", "labels never replace native evidence");
  assert.equal(evaluateGate1Decision({ approvals, evidenceRequest: { status: "GATE1_EVIDENCE_VALID", validStages: AUTHORITY_STAGES } }).decision,
    "NO-GO", "caller-created verifier results never replace native authority");
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}

console.log("comment-translator-paid-core-v1-gate1 evidence contract: PASS");
