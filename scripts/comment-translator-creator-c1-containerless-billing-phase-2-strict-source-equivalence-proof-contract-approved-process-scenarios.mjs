import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import * as approvedRunner from
  "./comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-approved.mjs";
import {
  APPROVAL_ENV,
  AUTHORITY_ENV,
  AUTHORITY_PROJECT_REF,
  CANDIDATES,
  CLI_VERSION,
  CONTRACT_PATH,
  CURRENT_AUTHORITY,
  MAX_BUFFER,
  PROPOSED_APPROVAL_ID,
  REVIEWED_BASE,
  SQL_PATH,
  TARGET,
  TIMEOUT_MS
} from "./comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-approved-support.mjs";

const ROOT = "C:/repo";
const CLI_PATH = path.join(
  ROOT, "node_modules", "@supabase", "cli-windows-x64", "bin", "supabase.exe"
);
const LINKED_PATH = path.join(ROOT, "supabase", ".temp", "project-ref");
const SQL_FILE = path.join(ROOT, SQL_PATH);
const IDENTITIES = [...CANDIDATES, TARGET];
const CANONICAL_SQL = fs.readFileSync(path.join(process.cwd(), SQL_PATH), "utf8");
const RAW_SENTINEL = "RAW_REMOTE_FAILURE_SENTINEL";
const RAW_LOCAL_SENTINEL = "RAW_LOCAL_FAILURE_SENTINEL";
const TREE = [
  "01_prior.sql", "02_prior.sql", "03_prior.sql", "04_prior.sql",
  ...CANDIDATES.map(({ path: migrationPath }) => path.basename(migrationPath))
].join("\n");

function createFileSystem(sql = CANONICAL_SQL) {
  const existing = new Set([CLI_PATH, LINKED_PATH, AUTHORITY_PROJECT_REF, SQL_FILE]);
  return {
    existsSync: (file) => existing.has(file),
    readFileSync: (file, encoding) => {
      if (file === SQL_FILE) {
        return encoding === "utf8" ? sql : Buffer.from(sql);
      }
      if (file === LINKED_PATH || file === AUTHORITY_PROJECT_REF) {
        return Buffer.from("same-linked-project");
      }
      throw new Error("unexpected file boundary");
    }
  };
}

function createPassingProcessFake(failure) {
  const calls = [];
  const runProcess = (file, args, options) => {
    calls.push({ file, args, options });
    if (failure?.matches(file, args)) return failure.result;
    if (file === "git" && args[0] === "rev-parse") {
      const requested = args[1];
      const identity = IDENTITIES.find(({ path: migrationPath }) =>
        requested === `HEAD:${migrationPath}`);
      return {
        status: 0, signal: null,
        stdout: `${identity?.blob ?? REVIEWED_BASE}\n`
      };
    }
    if (file === "git" && args[0] === "ls-tree") {
      return { status: 0, signal: null, stdout: `${TREE}\n` };
    }
    if (file === "git" && args[0] === "cat-file") {
      const identity = IDENTITIES.find(({ blob }) => blob === args[2]);
      assert.ok(identity, "known canonical blob");
      return {
        status: 0, signal: null,
        stdout: Buffer.from(
          fs.readFileSync(
            path.join(process.cwd(), identity.path),
            "utf8"
          ).replace(/\r\n/g, "\n")
        )
      };
    }
    if (file === "git" && args[0] === "check-ignore") {
      return {
        status: 0, signal: null,
        stdout: "supabase/.temp/project-ref\n"
      };
    }
    if (file === CLI_PATH && args[0] === "--version") {
      return { status: 0, signal: null, stdout: `${CLI_VERSION}\n` };
    }
    if (file === process.execPath && args[0] === CONTRACT_PATH) {
      return { status: 0, signal: null, stdout: "", stderr: "" };
    }
    if (file === CLI_PATH && args[0] === "db") {
      return {
        status: 1, signal: null, stdout: RAW_SENTINEL,
        stderr: RAW_SENTINEL, error: { message: RAW_SENTINEL }
      };
    }
    throw new Error(`unexpected process boundary: ${file} ${args[0]}`);
  };
  return { calls, runProcess };
}

function exactInputs(processFake, fileSystem = createFileSystem()) {
  return {
    argv: ["node", "approved-runner.mjs", "--execute-approved"],
    env: {
      KEEP: "yes",
      [APPROVAL_ENV]: PROPOSED_APPROVAL_ID,
      [AUTHORITY_ENV]: CURRENT_AUTHORITY
    },
    root: ROOT,
    arch: "x64",
    runProcess: processFake.runProcess,
    fileSystem
  };
}

function assertInjectedApprovedProofOrchestration() {
  // Given: all local boundaries return their complete successful result shapes.
  assert.equal(
    typeof approvedRunner.runApprovedProof,
    "function",
    "production orchestration seam is exported"
  );
  const processFake = createPassingProcessFake();
  const approvalBefore = process.env[APPROVAL_ENV];
  const authorityBefore = process.env[AUTHORITY_ENV];
  // When: pure argv/env values enter production orchestration with fake processes.
  const result = approvedRunner.runApprovedProof(exactInputs(processFake));
  // Then: one exact file-mode remote call is reduced without retaining raw detail.
  const remoteCalls = processFake.calls.filter(({ args }) => args[0] === "db");
  assert.equal(result.abort_status, "triggered-remote-read-failed");
  assert.equal(result.execution_status, "blocked-remote-read-failed");
  assert.equal(remoteCalls.length, 1);
  assert.deepEqual(remoteCalls[0], {
    file: CLI_PATH,
    args: [
      "db", "query", "--linked", "--file", SQL_PATH,
      "--output-format", "json", "--log-level", "error"
    ],
    options: {
      cwd: ROOT, encoding: "utf8", env: { KEEP: "yes", NO_COLOR: "1" },
      maxBuffer: MAX_BUFFER, timeout: TIMEOUT_MS, windowsHide: true
    }
  });
  assert.equal(result.remote_read_attempt_count, 1);
  assert.equal(result.remote_mutation_attempt_count, 0);
  for (const field of [
    "approval_gate_status", "reviewed_base_status",
    "candidate_identity_status", "target_binding_status",
    "cli_version_status", "linked_metadata_status",
    "linked_target_status", "local_contract_status"
  ]) {
    assert.equal(result[field], "pass");
  }
  assert.equal(JSON.stringify(result).includes(RAW_SENTINEL), false);
  const localCalls = processFake.calls.filter(({ file, args }) =>
    file === "git" || (file === CLI_PATH && args[0] === "--version"));
  assert.ok(localCalls.length > 0);
  for (const { options } of localCalls) {
    assert.equal(options.timeout, 10_000);
    assert.equal(options.maxBuffer, MAX_BUFFER);
    assert.equal(options.windowsHide, true);
  }
  assert.equal(process.env[APPROVAL_ENV], approvalBefore);
  assert.equal(process.env[AUTHORITY_ENV], authorityBefore);
}

function assertSqlFingerprintBlocksBeforeRemote() {
  // Given: the local contract child passes but the SQL fingerprint is altered.
  const processFake = createPassingProcessFake();
  const changedSql = `X${CANONICAL_SQL.slice(1)}`;
  // When: production orchestration evaluates the local gates.
  const result = approvedRunner.runApprovedProof(
    exactInputs(processFake, createFileSystem(changedSql))
  );
  // Then: gate 7 blocks before any future query.
  assert.equal(result.abort_status, "triggered-local-contract-failed");
  assert.equal(processFake.calls.filter(({ args }) => args[0] === "db").length, 0);
}

function assertLocalProcessFailuresAreTypedAndSanitized() {
  const boundaries = [
    {
      name: "rev-parse",
      matches: (file, args) => file === "git" && args[0] === "rev-parse",
      abortStatus: "triggered-base-ref-mismatch"
    },
    {
      name: "cat-file",
      matches: (file, args) => file === "git" && args[0] === "cat-file",
      abortStatus: "triggered-candidate-identity-mismatch"
    },
    {
      name: "check-ignore",
      matches: (file, args) => file === "git" && args[0] === "check-ignore",
      abortStatus: "triggered-linked-metadata-mismatch"
    },
    {
      name: "cli-version",
      matches: (file, args) => file === CLI_PATH && args[0] === "--version",
      abortStatus: "triggered-cli-version-mismatch"
    }
  ];
  const failures = [
    { name: "nonzero", result: { status: 1, signal: null, stdout: RAW_LOCAL_SENTINEL } },
    { name: "null", result: { status: null, signal: null, stdout: RAW_LOCAL_SENTINEL } },
    { name: "error", result: { status: null, signal: null, error: { code: "ENOENT", message: RAW_LOCAL_SENTINEL } } },
    { name: "timeout", result: { status: null, signal: "SIGTERM", error: { code: "ETIMEDOUT", message: RAW_LOCAL_SENTINEL } } }
  ];
  for (const boundary of boundaries) {
    for (const failure of failures) {
      // Given: one local subprocess boundary returns one opaque failure shape.
      const processFake = createPassingProcessFake({
        matches: boundary.matches,
        result: failure.result
      });
      // When: production orchestration evaluates its ordered local gates.
      const result = approvedRunner.runApprovedProof(exactInputs(processFake));
      // Then: the typed gate is stable, bounded, and retains no raw detail.
      assert.equal(result.abort_status, boundary.abortStatus, `${boundary.name}:${failure.name}`);
      assert.equal(JSON.stringify(result).includes(RAW_LOCAL_SENTINEL), false);
      const failedCalls = processFake.calls.filter(({ file, args }) =>
        boundary.matches(file, args));
      assert.equal(failedCalls.length, 1);
      assert.equal(failedCalls[0].options.timeout, 10_000);
      assert.equal(failedCalls[0].options.maxBuffer, MAX_BUFFER);
      assert.equal(failedCalls[0].options.windowsHide, true);
      assert.equal(processFake.calls.filter(({ args }) => args[0] === "db").length, 0);
    }
  }
}

export function runStrictSourceEquivalenceProofApprovedProcessContract() {
  assertInjectedApprovedProofOrchestration();
  assertSqlFingerprintBlocksBeforeRemote();
  assertLocalProcessFailuresAreTypedAndSanitized();
}
