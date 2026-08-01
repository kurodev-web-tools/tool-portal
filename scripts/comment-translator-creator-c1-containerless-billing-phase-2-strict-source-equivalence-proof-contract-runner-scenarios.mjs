import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  APPROVAL_ENV,
  AUTHORITY_ENV,
  AUTHORITY_PROJECT_REF,
  CANDIDATES,
  CLI_VERSION,
  CONTRACT_PATH,
  CURRENT_AUTHORITY,
  GATE_ABORTS,
  GateFailure,
  INTEGRATION_REF,
  LOCAL_GATE_IDS,
  MAX_BUFFER,
  PROPOSED_APPROVAL_ID,
  REVIEWED_BASE,
  RUNNER_PRINT_KEYS,
  SQL_PATH,
  TARGET,
  TIMEOUT_MS,
  createFutureCommand,
  createLocalContractInvocation,
  createSanitizedContractEnv,
  hasExactApproval,
  runLocalContract,
  runOrderedLocalGates
} from "./comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-approved.mjs";
import {
  createBlockedBeforeRemoteResult
} from "./comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-reducer.mjs";

const RUNNER_PATH =
  "scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-approved.mjs";
const SUPPORT_PATH =
  "scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-approved-support.mjs";
const BOUNDARY_PATH =
  "scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-approved-boundaries.mjs";
const EXPECTED_CANDIDATES = [
  { order: "05", version: "20260623000000", path: "supabase/migrations/20260623000000_comment_translator_real_comments_feed_snapshots.sql", blob: "cead8d52e3361149f8476f3852263aabdc38b369", sha256: "618233207efc605f70d2c806ad2fc705052ec8db7eeed361defc3dfb0cca0522", bytes: 3474 },
  { order: "06", version: "20260624000000", path: "supabase/migrations/20260624000000_account_display_timezone_preference.sql", blob: "01352c948683ddffbc246b7ea26bb220e4465b3c", sha256: "e027e146d5094b5010fe35ba6201c66fb42a537daa7bf63c1f223e407418aae2", bytes: 701 },
  { order: "07", version: "20260705000000", path: "supabase/migrations/20260705000000_comment_translator_creator_waitlist_registrations.sql", blob: "86253c3d8751d01df1359dc6e407553d31419902", sha256: "037e3a72b20502e26e8c45e4d4227e25a1e4405b6bd28c39fcd246e4b7ddcfd0", bytes: 3318 },
  { order: "08", version: "20260706073204", path: "supabase/migrations/20260706073204_supabase_default_privileges_guard.sql", blob: "761e3e740c8e317a76da4c5bb9505060b7746ce5", sha256: "5454fc4ed5381eb29e11d573d0655b4c62172b6f46429d7a3222ebe03184291e", bytes: 1135 }
];
const EXPECTED_TARGET = {
  version: "20260730000000",
  path: "supabase/migrations/20260730000000_comment_translator_c1_containerless_billing_read.sql",
  blob: "331db8095fc2ec09332718e9a5d05f62f26d18e8",
  sha256: "27c116aa8872c9c1a04d0a3d0accd2a214e3c28a961ca92c6cb3ba6d3115cd15",
  bytes: 22041
};
const EXPECTED_GATE_ABORTS = {
  "approval-gate": "triggered-approval-gate",
  "base-ref": "triggered-base-ref-mismatch",
  "candidate-identity": "triggered-candidate-identity-mismatch",
  "target-identity": "triggered-target-identity-mismatch",
  "cli-version": "triggered-cli-version-mismatch",
  "linked-metadata": "triggered-linked-metadata-mismatch",
  "linked-target": "triggered-linked-target-mismatch",
  "local-contract": "triggered-local-contract-failed"
};
const EXPECTED_PRINT_KEYS = [
  "approval_id", "approval_gate_status", "reviewed_base_status",
  "candidate_identity_status", "target_binding_status", "cli_version_status",
  "linked_metadata_status", "linked_target_status", "local_contract_status",
  "strict_source_equivalence_matrix", "canonical_effect_equivalent_count",
  "absent_count", "partial_count", "conflicting_count", "unverifiable_count",
  "unknown_remote_migration_count", "default_privileges_security_goal_status",
  "remote_read_attempt_count", "remote_mutation_attempt_count",
  "migration_repair_attempt_count", "migration_apply_attempt_count",
  "execution_status", "sanitized_output_review_status", "abort_status",
  "unchecked_scope_status"
];

function assertGateFailure(action, gateId) {
  assert.throws(action, (error) =>
    error instanceof GateFailure
    && error.name === "GateFailure"
    && error.message === "local gate failed"
    && error.gateId === gateId);
}

function assertExactIdentitiesAndCommand() {
  // Given: the reviewed repository identities and future SQL payload.
  assert.equal(PROPOSED_APPROVAL_ID, "C1-CONTAINERLESS-BILLING-PHASE2-STRICT-SOURCE-EQUIVALENCE-PROOF-3");
  assert.equal(REVIEWED_BASE, "06a26c74bf0f7c910e3f79df97f260d3ce364090");
  assert.equal(INTEGRATION_REF, "origin/codex/comment-translator-free-public-beta-integration");
  assert.deepEqual(CANDIDATES, EXPECTED_CANDIDATES);
  assert.deepEqual(TARGET, EXPECTED_TARGET);
  assert.equal(CLI_VERSION, "2.109.0");
  assert.equal(AUTHORITY_PROJECT_REF, "D:/V_streamer_tools/supabase/.temp/project-ref");
  const sql = fs.readFileSync(path.join(process.cwd(), SQL_PATH), "utf8")
    .replace(/\r\n/g, "\n");
  assert.equal(Buffer.byteLength(sql), 60_706);
  // When: the future linked-read command is built.
  const command = createFutureCommand("C:/repo/supabase.exe", sql);
  // Then: SQL contents never enter argv and file mode is exact.
  assert.equal(command.args.includes(sql), false, "SQL contents must not be argv");
  assert.deepEqual(command, {
    file: "C:/repo/supabase.exe",
    args: [
      "db", "query", "--linked", "--file", SQL_PATH,
      "--output-format", "json", "--agent", "no", "--log-level", "error"
    ]
  });
}

function assertClosedApprovalAndGateMapping() {
  // Given: no future exact approval has been supplied.
  assert.equal(APPROVAL_ENV, "C1_PHASE2_STRICT_SOURCE_EQUIVALENCE_APPROVAL_ID");
  assert.equal(AUTHORITY_ENV, "C1_PHASE2_MIGRATION_HISTORY_CURRENT_AUTHORITY");
  assert.equal(CURRENT_AUTHORITY, "current-confirmed");
  // When/Then: every absent or mismatched input keeps the gate closed.
  assert.equal(hasExactApproval(["node", RUNNER_PATH], {}), false);
  assert.equal(hasExactApproval(["node", RUNNER_PATH, "--execute-approved"], { [APPROVAL_ENV]: "not-approved", [AUTHORITY_ENV]: CURRENT_AUTHORITY }), false);
  assert.equal(hasExactApproval(["node", RUNNER_PATH, "--execute-approved"], { [APPROVAL_ENV]: "not-approved", [AUTHORITY_ENV]: "stale" }), false);
  assert.deepEqual(GATE_ABORTS, EXPECTED_GATE_ABORTS);
  for (const [gateId, abortStatus] of Object.entries(EXPECTED_GATE_ABORTS)) {
    const failure = new GateFailure(gateId);
    assert.equal(createBlockedBeforeRemoteResult(failure.gateId).abort_status, abortStatus);
  }
  assert.throws(() => new GateFailure("unknown"), TypeError);
}

function assertExactApprovalThreeWayGate() {
  // Given: exact values exist only in local plain objects.
  const exactArgv = ["node", RUNNER_PATH, "--execute-approved"];
  const exactEnv = {
    [APPROVAL_ENV]: PROPOSED_APPROVAL_ID,
    [AUTHORITY_ENV]: CURRENT_AUTHORITY
  };
  // When/Then: either flag failure independently closes the gate.
  assert.equal(hasExactApproval(["node", RUNNER_PATH], exactEnv), false);
  assert.equal(hasExactApproval(["node", RUNNER_PATH, "--alternate"], exactEnv), false);
  // When/Then: either current-authority failure independently closes the gate.
  assert.equal(hasExactApproval(exactArgv, { [APPROVAL_ENV]: PROPOSED_APPROVAL_ID }), false);
  assert.equal(hasExactApproval(exactArgv, { [APPROVAL_ENV]: PROPOSED_APPROVAL_ID, [AUTHORITY_ENV]: "stale" }), false);
  // When/Then: either approval-id failure independently closes the gate.
  assert.equal(hasExactApproval(exactArgv, { [AUTHORITY_ENV]: CURRENT_AUTHORITY }), false);
  assert.equal(hasExactApproval(exactArgv, { [APPROVAL_ENV]: "not-approved", [AUTHORITY_ENV]: CURRENT_AUTHORITY }), false);
  assert.equal(hasExactApproval(exactArgv, {
    [APPROVAL_ENV]: "C1-CONTAINERLESS-BILLING-PHASE2-STRICT-SOURCE-EQUIVALENCE-PROOF-1",
    [AUTHORITY_ENV]: CURRENT_AUTHORITY
  }), false, "consumed PROOF-1 cannot open the rotated runner");
  assert.equal(hasExactApproval(exactArgv, {
    [APPROVAL_ENV]: "C1-CONTAINERLESS-BILLING-PHASE2-STRICT-SOURCE-EQUIVALENCE-PROOF-2",
    [AUTHORITY_ENV]: CURRENT_AUTHORITY
  }), false, "consumed PROOF-2 cannot open the rotated runner");
  // When/Then: all three exact inputs open only the pure gate function.
  assert.equal(hasExactApproval(exactArgv, exactEnv), true);
  // When/Then: alternate positions, values, and extra argv remain closed.
  assert.equal(hasExactApproval(["node", RUNNER_PATH, "--alternate", "--execute-approved"], exactEnv), false);
  assert.equal(hasExactApproval([...exactArgv, "--extra"], exactEnv), false, "extra argv is rejected");
  assert.equal(hasExactApproval(["node", RUNNER_PATH, "--execute", "--execute-approved"], exactEnv), false);
}

function assertFirstLocalBlockerOrder() {
  for (const [failedIndex, failedGate] of LOCAL_GATE_IDS.entries()) {
    // Given: every earlier gate passes and one numbered gate fails.
    const visited = [];
    const checks = Object.fromEntries(LOCAL_GATE_IDS.map((gateId) => [
      gateId,
      () => {
        visited.push(gateId);
        return gateId !== failedGate;
      }
    ]));
    // When/Then: only the first blocker and its predecessors run.
    assertGateFailure(() => runOrderedLocalGates(checks), failedGate);
    assert.deepEqual(visited, LOCAL_GATE_IDS.slice(0, failedIndex + 1));
  }
}

function assertLocalContractChildBoundary() {
  // Given: ambient values exist but are not trusted by the child contract.
  const env = { KEEP: "yes", [APPROVAL_ENV]: "not-approved", [AUTHORITY_ENV]: "stale" };
  // When: the content-bound local contract invocation is built.
  const invocation = createLocalContractInvocation("C:/repo", env);
  // Then: it uses the exact child command and strips both gate variables.
  assert.equal(invocation.file, process.execPath);
  assert.deepEqual(invocation.args, [CONTRACT_PATH]);
  assert.deepEqual(invocation.options, {
    cwd: "C:/repo", encoding: "utf8",
    env: { KEEP: "yes" }, timeout: TIMEOUT_MS, maxBuffer: MAX_BUFFER,
    windowsHide: true, stdio: "ignore"
  });
  assert.deepEqual(createSanitizedContractEnv(env), { KEEP: "yes" });
  let captured;
  runLocalContract("C:/repo", env, (...args) => {
    captured = args;
    return { status: 0, signal: null };
  });
  assert.deepEqual(captured, [invocation.file, invocation.args, invocation.options]);
  for (const result of [
    { status: null, error: { code: "ENOENT" } },
    { status: 1 },
    { status: null, error: { code: "ETIMEDOUT" } }
  ]) {
    assertGateFailure(() => runLocalContract("C:/repo", env, () => result), "local-contract");
  }
  assertGateFailure(() => runLocalContract("C:/repo", env, () => {
    throw new Error("child unavailable");
  }), "local-contract");
}

function assertStaticRunnerBoundary() {
  // Given: the production runner and its local-boundary modules.
  const runnerSource = fs.readFileSync(path.join(process.cwd(), RUNNER_PATH), "utf8");
  const supportSource = fs.readFileSync(path.join(process.cwd(), SUPPORT_PATH), "utf8");
  const boundarySource = fs.readFileSync(path.join(process.cwd(), BOUNDARY_PATH), "utf8");
  const combined = `${runnerSource}\n${supportSource}\n${boundarySource}`;
  // When/Then: secondary guards exclude write/retry/diagnostic surfaces.
  assert.match(combined, /check-ignore/);
  assert.match(combined, /supabase\/\.temp\/project-ref/);
  assert.match(boundarySource, /crypto\.timingSafeEqual/);
  assert.match(runnerSource, /for \(const key of RUNNER_PRINT_KEYS\)/);
  assert.doesNotMatch(combined, /\bdb\s+(?:push|reset)\b|\bmigration\s+(?:repair|up|down)\b/i);
  assert.doesNotMatch(combined, /\bretry\b|\bdiagnostic\b|\bfallback\b/i);
  assert.doesNotMatch(runnerSource, /process\.stderr|console\.(?:log|error)|Object\.entries\(result\)/);
  assert.deepEqual(RUNNER_PRINT_KEYS, EXPECTED_PRINT_KEYS);
  assert.equal(SQL_PATH, "scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof.sql");
}

function assertDefaultRunnerIsBlocked() {
  // Given: the runner receives no flag and neither exact environment value.
  const env = createSanitizedContractEnv(process.env);
  // When: the contract invokes only the default closed path.
  const result = spawnSync(process.execPath, [RUNNER_PATH], {
    cwd: process.cwd(), encoding: "utf8", env,
    timeout: TIMEOUT_MS, maxBuffer: MAX_BUFFER, windowsHide: true
  });
  // Then: it emits only the fixed sanitized approval-gate result and reads nothing.
  assert.equal(result.status, 2);
  assert.equal(result.stderr, "");
  assert.equal(result.stdout, [
    "approval_id=C1-CONTAINERLESS-BILLING-PHASE2-STRICT-SOURCE-EQUIVALENCE-PROOF-3",
    "approval_gate_status=fail",
    "reviewed_base_status=not-evaluated",
    "candidate_identity_status=not-evaluated",
    "target_binding_status=not-evaluated",
    "cli_version_status=not-evaluated",
    "linked_metadata_status=not-evaluated",
    "linked_target_status=not-evaluated",
    "local_contract_status=not-evaluated",
    "default_privileges_security_goal_status=not-evaluated",
    "remote_read_attempt_count=0",
    "remote_mutation_attempt_count=0",
    "migration_repair_attempt_count=0",
    "migration_apply_attempt_count=0",
    "execution_status=blocked-before-remote",
    "sanitized_output_review_status=not-evaluated",
    "abort_status=triggered-approval-gate",
    "unchecked_scope_status=repair-apply-and-later-not-run",
    ""
  ].join("\n"));
  assert.doesNotMatch(result.stdout, /D:\/|[a-f0-9]{40}|[a-f0-9]{64}|project-ref|stdout=|stderr=|error=/i);
}

export function runStrictSourceEquivalenceProofRunnerContract() {
  assertExactIdentitiesAndCommand();
  assertClosedApprovalAndGateMapping();
  assertExactApprovalThreeWayGate();
  assertFirstLocalBlockerOrder();
  assertLocalContractChildBoundary();
  assertStaticRunnerBoundary();
  assertDefaultRunnerIsBlocked();
}
