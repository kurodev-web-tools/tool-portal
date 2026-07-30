import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const migrationPath =
  "supabase/migrations/20260730000000_comment_translator_c1_containerless_billing_read.sql";
const preflightPath =
  "docs/active/COMMENT_TRANSLATOR_CREATOR_C1_CONTAINERLESS_BILLING_PHASE_2_REMOTE_SCHEMA_APPLY_PREFLIGHT.md";

const expectedContract = {
  schemaVersion: 1,
  approvalUnit: "C1-CONTAINERLESS-BILLING-PHASE2-APPLY-1",
  nextApprovalUnit: "C1-CONTAINERLESS-BILLING-PHASE2-MIGRATION-HISTORY-RECONCILIATION-1",
  reviewedBase: "ea6928f5f0160ab3db453f845e4fb16245bb4e9e",
  reviewedPrHead: "feb33c7986b0410c94045b06bf37d534d637fb4c",
  migration: {
    path: migrationPath,
    version: "20260730000000",
    gitBlob: "331db8095fc2ec09332718e9a5d05f62f26d18e8",
    gitBlobSha256: "27c116aa8872c9c1a04d0a3d0accd2a214e3c28a961ca92c6cb3ba6d3115cd15",
    canonicalByteSize: 22041,
    position: 17,
    total: 17,
    laterCount: 0,
    explicitBeginCount: 0,
    explicitCommitCount: 0,
    explicitRollbackCount: 0
  },
  cli: {
    version: "2.109.0",
    localBinaryStatus: "present-repository-pinned",
    loginStatus: "user-confirmed",
    linkMetadataStatus: "present-git-ignored",
    pendingSelection: "all-pending-from-remote-history",
    transactionUnit: "one-implicit-transaction-per-migration-file",
    historyInsert: "same-implicit-transaction",
    exactOneStatus: "blocked-remote-history-not-sole-pending"
  },
  authority: {
    targetBinding: "current-unique-confirmed",
    targetOwner: "current-confirmed-by-project-owner",
    applyOwner: "current-confirmed-by-project-owner",
    rollbackOwner: "current-confirmed-by-project-owner",
    outputReviewer: "current-confirmed-by-project-owner",
    approval: "consumed-C1-CONTAINERLESS-BILLING-PHASE2-REMOTE-READINESS-2",
    projectHealth: "pass",
    remoteCapability: "pass",
    apiExposure: "unexposed",
    billingMutationGate: "closed-through-phase-3"
  },
  execution: {
    remoteReadAttemptCount: 1,
    remoteMutationAttemptCount: 0,
    migrationAttemptCount: 0,
    migrationApplyCount: 0,
    backfillAttemptCount: 0,
    schemaCacheActionCount: 0,
    cutoverAttemptCount: 0,
    status: "blocked-migration-history-not-sole-pending"
  }
};

const expectedAuthorityConfirmation = {
  schema_version: 1,
  confirmation_scope: "same-thread-current-authority",
  target_binding_status: "current-unique-confirmed",
  target_owner_status: "current-confirmed-by-project-owner",
  apply_owner_status: "current-confirmed-by-project-owner",
  rollback_owner_status: "current-confirmed-by-project-owner",
  output_reviewer_status: "current-confirmed-by-project-owner",
  billing_mutation_gate_status: "closed-through-phase-3",
  private_identifier_disclosure_count: 0,
  remote_read_attempt_count: 1,
  remote_mutation_attempt_count: 0,
  next_approval_unit: "C1-CONTAINERLESS-BILLING-PHASE2-MIGRATION-HISTORY-RECONCILIATION-1",
  approval_status: "consumed-readiness-failed-no-retry"
};

const expectedReadinessExecution = {
  approval_id: "C1-CONTAINERLESS-BILLING-PHASE2-REMOTE-READINESS-1",
  reviewed_base_status: "pass",
  migration_identity_status: "pass",
  target_binding_status: "blocked-absent-current-authority",
  target_owner_status: "blocked-absent-current-authority",
  apply_owner_status: "blocked-absent-current-authority",
  rollback_owner_status: "blocked-absent-current-authority",
  output_reviewer_status: "blocked-absent-current-authority",
  project_health_status: "not-run-first-blocker",
  postgres_capability_status: "not-run-first-blocker",
  migration_history_status: "not-run-first-blocker",
  expected_prior_migration_count: "not-run",
  sole_pending_migration_count: "not-run",
  unexpected_pending_migration_count: "not-run",
  dependency_status: "not-run-first-blocker",
  role_capability_status: "not-run-first-blocker",
  role_collision_count: "not-run",
  schema_collision_count: "not-run",
  api_exposure_status: "not-run-first-blocker",
  billing_mutation_gate_status: "blocked-unconfirmed",
  remote_read_attempt_count: 0,
  remote_mutation_attempt_count: 0,
  execution_status: "blocked-before-remote-read",
  sanitized_output_review_status: "pass",
  abort_status: "triggered-authority-preconditions-unconfirmed",
  unchecked_scope_status: "recorded"
};

const preflight = fs.readFileSync(preflightPath, "utf8");
const contractMatch = preflight.match(
  /```preflight-contract-json\r?\n([\s\S]*?)\r?\n```/
);
assert.ok(contractMatch, "preflight exposes one machine-readable contract");
assert.deepEqual(JSON.parse(contractMatch[1]), expectedContract);
const authorityConfirmationMatch = preflight.match(
  /```remote-readiness-authority-json\r?\n([\s\S]*?)\r?\n```/
);
assert.ok(
  authorityConfirmationMatch,
  "preflight exposes one sanitized current-authority record"
);
assert.deepEqual(
  JSON.parse(authorityConfirmationMatch[1]),
  expectedAuthorityConfirmation
);
const readinessExecutionMatch = preflight.match(
  /```remote-readiness-execution-json\r?\n([\s\S]*?)\r?\n```/
);
assert.ok(
  readinessExecutionMatch,
  "preflight exposes one sanitized remote-readiness execution record"
);
assert.deepEqual(
  JSON.parse(readinessExecutionMatch[1]),
  expectedReadinessExecution
);

const git = (...args) =>
  execFileSync("git", args, { encoding: "utf8" }).trim();
assert.equal(git("rev-parse", "HEAD"), expectedContract.reviewedBase);
assert.equal(
  git("rev-parse", `HEAD:${migrationPath}`),
  expectedContract.migration.gitBlob
);

const canonicalMigration = execFileSync("git", [
  "cat-file",
  "blob",
  expectedContract.migration.gitBlob
]);
assert.equal(canonicalMigration.byteLength, expectedContract.migration.canonicalByteSize);
assert.equal(
  crypto.createHash("sha256").update(canonicalMigration).digest("hex"),
  expectedContract.migration.gitBlobSha256
);

const migration = fs.readFileSync(migrationPath, "utf8");
assert.equal((migration.match(/^\s*begin\s*;/gim) ?? []).length, 0);
assert.equal((migration.match(/^\s*commit\s*;/gim) ?? []).length, 0);
assert.equal((migration.match(/^\s*rollback\s*;/gim) ?? []).length, 0);

const packageLock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
assert.equal(packageLock.packages["node_modules/supabase"].version, "2.109.0");
assert.equal(fs.existsSync("node_modules/.bin/supabase.cmd"), true);
assert.equal(fs.existsSync("supabase/.temp/project-ref"), true);
assert.equal(
  git("check-ignore", "supabase/.temp/project-ref"),
  "supabase/.temp/project-ref"
);

const task = fs.readFileSync("task.md", "utf8");
assert.match(
  task,
  /^- c1_containerless_phase_2_preflight_status=blocked-migration-history-not-sole-pending$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_next_approval_unit=C1-CONTAINERLESS-BILLING-PHASE2-MIGRATION-HISTORY-RECONCILIATION-1$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_remote_readiness_approval_status=consumed-no-retry$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_remote_readiness_execution_status=blocked-readiness-failed$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_previous_remote_readiness_execution_status=blocked-authority-preconditions-unconfirmed$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_remote_read_attempt_count=1$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_remote_mutation_attempt_count=0$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_next_approval_status=awaiting-exact-migration-history-reconciliation-approval$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_authority_status=current-confirmed$/m
);

process.stdout.write(
  "comment_translator_creator_c1_containerless_billing_phase_2_preflight_contract=pass\n"
);
