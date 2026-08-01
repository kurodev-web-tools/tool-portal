import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const migrationPath =
  "supabase/migrations/20260730000000_comment_translator_c1_containerless_billing_read.sql";
const preflightPath =
  "docs/active/COMMENT_TRANSLATOR_CREATOR_C1_CONTAINERLESS_BILLING_PHASE_2_REMOTE_SCHEMA_APPLY_PREFLIGHT.md";
const strictDesignPath =
  "docs/active/COMMENT_TRANSLATOR_CREATOR_C1_CONTAINERLESS_BILLING_PHASE_2_STRICT_SOURCE_EQUIVALENCE_DESIGN.md";
const priorConsumedStrictApprovalUnit =
  "C1-CONTAINERLESS-BILLING-PHASE2-STRICT-SOURCE-EQUIVALENCE-PROOF-1";
const consumedStrictApprovalUnit =
  "C1-CONTAINERLESS-BILLING-PHASE2-STRICT-SOURCE-EQUIVALENCE-PROOF-2";
const closedStrictRunnerUnit =
  "C1-CONTAINERLESS-BILLING-PHASE2-STRICT-SOURCE-EQUIVALENCE-PROOF-3";

const strictPublicArtifacts = [
  "scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof.sql",
  "scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-reducer.mjs",
  "scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-approved.mjs",
  "scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract.mjs"
];

const strictSupportModules = [
  "scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-approved-boundaries.mjs",
  "scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-approved-support.mjs",
  "scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-approved-process-scenarios.mjs",
  "scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-fixtures.mjs",
  "scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-interface-fixtures.mjs",
  "scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-runner-scenarios.mjs",
  "scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-scenarios.mjs",
  "scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-sql-binding-fixtures.mjs",
  "scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-sql-binding-scenarios.mjs",
  "scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-sql-scenarios.mjs",
  "scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-sql-validator-fixtures.mjs",
  "scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-sql-validator-scenarios.mjs",
  "scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-support.mjs",
  "scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-sql-validator.mjs"
];

const expectedContract = {
  schemaVersion: 1,
  approvalUnit: "C1-CONTAINERLESS-BILLING-PHASE2-APPLY-1",
  nextApprovalUnit: "none",
  reviewedBase: "06a26c74bf0f7c910e3f79df97f260d3ce364090",
  reviewedPrHead: "b5e1418065c9a9d3f6570a49c81301c41e0bc55b",
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
    loginStatus: "linked-read-executed",
    linkMetadataStatus: "present-target-match-pass-git-ignored",
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
  reconciliation: {
    approvalUnit: "C1-CONTAINERLESS-BILLING-PHASE2-MIGRATION-HISTORY-RECONCILIATION-2",
    priorApprovalUnit: "C1-CONTAINERLESS-BILLING-PHASE2-MIGRATION-HISTORY-RECONCILIATION-1",
    priorApprovalStatus: "consumed-no-retry",
    knownMigrationCount: 17,
    targetVersion: "20260730000000",
    localContractStatus: "pass",
    approvalStatus: "consumed-pass-no-retry",
    remoteAttemptCount: 1,
    remoteMutationCount: 0,
    repairAttemptCount: 0,
    applyAttemptCount: 0,
    status: "reconciliation-complete-repair-apply-blocked"
  },
  remediationDesign: {
    approvalUnit: "C1-CONTAINERLESS-BILLING-PHASE2-MIGRATION-HISTORY-REMEDIATION-DESIGN-1",
    status: "review-ready-local-only",
    strategy: "proof-first-oldest-first-no-inferred-repair",
    priorAbsentCount: 4,
    targetAbsentCount: 1,
    unknownRemoteVersionCount: 10,
    nextApprovalUnit: "C1-CONTAINERLESS-BILLING-PHASE2-PRIOR-MIGRATION-STATE-PROOF-1",
    nextOperation: "one-sanitized-read-only-prior-migration-state-proof",
    proofAttemptLimit: 1,
    proofScope: "four-known-prior-absent-versions-only",
    proofOutcomeAllowlist: [
      "equivalent-present",
      "missing",
      "partial",
      "conflicting",
      "unverifiable"
    ],
    repairAuthorization: "not-authorized",
    applyAuthorization: "not-authorized",
    firstBlockerBehavior: "abort-before-remote-or-first-sanitized-failure-no-retry",
    priorCandidates: [
      {
        version: "20260623000000",
        path: "supabase/migrations/20260623000000_comment_translator_real_comments_feed_snapshots.sql",
        gitBlob: "cead8d52e3361149f8476f3852263aabdc38b369",
        gitBlobSha256: "618233207efc605f70d2c806ad2fc705052ec8db7eeed361defc3dfb0cca0522",
        canonicalByteSize: 3474,
        localEvidence: "prior-exact-apply-and-postcheck-recorded"
      },
      {
        version: "20260624000000",
        path: "supabase/migrations/20260624000000_account_display_timezone_preference.sql",
        gitBlob: "01352c948683ddffbc246b7ea26bb220e4465b3c",
        gitBlobSha256: "e027e146d5094b5010fe35ba6201c66fb42a537daa7bf63c1f223e407418aae2",
        canonicalByteSize: 701,
        localEvidence: "prior-exact-apply-and-history-present-recorded"
      },
      {
        version: "20260705000000",
        path: "supabase/migrations/20260705000000_comment_translator_creator_waitlist_registrations.sql",
        gitBlob: "86253c3d8751d01df1359dc6e407553d31419902",
        gitBlobSha256: "037e3a72b20502e26e8c45e4d4227e25a1e4405b6bd28c39fcd246e4b7ddcfd0",
        canonicalByteSize: 3318,
        localEvidence: "no-remote-apply-evidence-found"
      },
      {
        version: "20260706073204",
        path: "supabase/migrations/20260706073204_supabase_default_privileges_guard.sql",
        gitBlob: "761e3e740c8e317a76da4c5bb9505060b7746ce5",
        gitBlobSha256: "5454fc4ed5381eb29e11d573d0655b4c62172b6f46429d7a3222ebe03184291e",
        canonicalByteSize: 1135,
        localEvidence: "prior-remediation-blocked-not-applied"
      }
    ],
    orderedSeparateGates: [
      "prior-migration-state-proof",
      "per-version-repair-or-apply-decision",
      "per-version-exact-repair-or-apply",
      "seventeen-version-reconciliation-refresh",
      "target-sole-pending-proof",
      "phase2-target-apply"
    ]
  },
  priorMigrationStateProof: {
    approvalUnit: "C1-CONTAINERLESS-BILLING-PHASE2-PRIOR-MIGRATION-STATE-PROOF-1",
    approvalStatus: "consumed-pass-no-retry",
    remoteAttemptCount: 1,
    remoteMutationCount: 0,
    repairAttemptCount: 0,
    applyAttemptCount: 0,
    equivalentPresentCount: 3,
    missingCount: 0,
    partialCount: 1,
    conflictingCount: 0,
    unverifiableCount: 0,
    unknownRemoteVersionCount: 10,
    status: "complete-partial-remediation-design-required"
  },
  strictSourceEquivalenceProof: {
    approvalUnit: consumedStrictApprovalUnit,
    priorApprovalUnit: priorConsumedStrictApprovalUnit,
    approvalStatus: "consumed-no-retry",
    staleApprovalStatus: "blocked-before-remote-not-consumed",
    staleApprovalAbortStatus: "triggered-base-ref-mismatch",
    staleApprovalRemoteAttemptCount: 0,
    localImplementationStatus: "review-ready",
    localContractStatus: "pass",
    artifactCount: strictPublicArtifacts.length + strictSupportModules.length,
    publicArtifactCount: strictPublicArtifacts.length,
    supportModuleCount: strictSupportModules.length,
    candidateCount: 4,
    predicateCounts: [27, 4, 31, 22],
    unknownRemoteVersionCountExpected: 10,
    commandMode: "linked-read-only-file",
    cliOutputContractDesignUnit:
      "C1-CONTAINERLESS-BILLING-PHASE2-STRICT-SOURCE-EQUIVALENCE-CLI-OUTPUT-CONTRACT-1",
    cliOutputContractStatus: "executed-proof-2-consumed-no-retry",
    cliAgentMode: "no",
    closedRunnerUnit: closedStrictRunnerUnit,
    proposedApprovalUnit: "none",
    proposedApprovalStatus: "not-proposed",
    proposedCommandMode: "linked-read-only-file-json-agent-no",
    remoteAttemptCount: 2,
    remoteMutationCount: 0,
    repairAttemptCount: 0,
    applyAttemptCount: 0,
    repairAuthorization: "not-authorized",
    applyAuthorization: "not-authorized",
    executionStatus: "blocked-sanitized-output-invalid",
    sanitizedOutputReviewStatus: "fail",
    abortStatus: "triggered-sanitized-output-invalid",
    status: "blocked-proof-2-consumed-no-retry"
  },
  execution: {
    remoteReadAttemptCount: 5,
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

const expectedStrictExecution = {
  approval_id: consumedStrictApprovalUnit,
  approval_gate_status: "pass",
  reviewed_base_status: "pass",
  candidate_identity_status: "pass",
  target_binding_status: "pass",
  cli_version_status: "pass",
  linked_metadata_status: "pass",
  linked_target_status: "pass",
  local_contract_status: "pass",
  default_privileges_security_goal_status: "separately-blocked",
  remote_read_attempt_count: 1,
  remote_mutation_attempt_count: 0,
  migration_repair_attempt_count: 0,
  migration_apply_attempt_count: 0,
  execution_status: "blocked-sanitized-output-invalid",
  sanitized_output_review_status: "fail",
  abort_status: "triggered-sanitized-output-invalid",
  unchecked_scope_status: "repair-apply-and-later-not-run"
};

const preflight = fs.readFileSync(preflightPath, "utf8");
const normalizedPreflight = preflight.replace(/\r\n/g, "\n");
const strictDesign = fs.readFileSync(strictDesignPath, "utf8");
assert.ok(
  normalizedPreflight.startsWith(
    "# Creator C1 Containerless Billing Phase 2 Remote Schema Apply Preflight\n\n" +
      "Status: strict source-equivalence proofs consumed / two remote reads /\n" +
      "blocked-sanitized-output-invalid / no retry / repair and Phase 2 apply remain\n" +
      "blocked and unapproved.\n"
  ),
  "preflight top status identifies the consumed strict-proof blocker"
);
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
const consumedStrictApprovalHeading =
  `### Consumed Exact Approval (Do Not Reuse): ${priorConsumedStrictApprovalUnit}`;
const consumedStrictApprovalHeadingMatches = [
  ...normalizedPreflight.matchAll(
    new RegExp(
      `^${consumedStrictApprovalHeading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      "gm"
    )
  )
];
assert.equal(
  consumedStrictApprovalHeadingMatches.length,
  1,
  "preflight exposes exactly one consumed strict-proof approval heading"
);
const consumedStrictApprovalSection = normalizedPreflight.slice(
  consumedStrictApprovalHeadingMatches[0].index
    + consumedStrictApprovalHeading.length
);
const consumedStrictApprovalMatch = consumedStrictApprovalSection.match(
  /```text\n([\s\S]*?)\n```/
);
assert.ok(
  consumedStrictApprovalMatch,
  "consumed strict-proof approval has one text fence"
);
const consumedStrictApprovalFields = Object.fromEntries(
  consumedStrictApprovalMatch[1]
    .split("\n")
    .filter((line) => /^[a-z0-9_]+=/.test(line))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1)];
    })
);
assert.deepEqual(
  consumedStrictApprovalFields,
  {
    approval_id: priorConsumedStrictApprovalUnit,
    reviewed_base: expectedContract.reviewedBase,
    prior_approval_id:
      "C1-CONTAINERLESS-BILLING-PHASE2-PRIOR-MIGRATION-STATE-PROOF-1",
    prior_result:
      "coarse-present-3-partial-1-unknown-remote-10-no-repair-eligibility",
    candidate_versions:
      "20260623000000,20260624000000,20260705000000,20260706073204",
    target_migration_version: expectedContract.migration.version,
    target_canonical_git_blob: expectedContract.migration.gitBlob,
    target_canonical_git_blob_byte_sha256:
      expectedContract.migration.gitBlobSha256,
    action_label: "one-sanitized-read-only-strict-source-equivalence-proof"
  },
  "consumed strict-proof approval exposes only the reviewed machine fields"
);
const strictExecutionMatch = normalizedPreflight.match(
  /```strict-source-equivalence-execution-json\n([\s\S]*?)\n```/
);
assert.ok(
  strictExecutionMatch,
  "preflight exposes one sanitized strict-proof execution record"
);
assert.deepEqual(JSON.parse(strictExecutionMatch[1]), expectedStrictExecution);
assert.equal(
  normalizedPreflight.includes(
    "The next allowed unit is one sanitized read-only proof for the four known prior"
  ),
  false,
  "preflight does not retain the consumed prior proof as the next allowed unit"
);
const proposedStrictApprovalHeading =
  `### Consumed Exact Approval (Do Not Reuse): ${consumedStrictApprovalUnit}`;
const proposedStrictApprovalHeadingMatches = [
  ...normalizedPreflight.matchAll(
    new RegExp(
      `^${proposedStrictApprovalHeading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      "gm"
    )
  )
];
assert.equal(
  proposedStrictApprovalHeadingMatches.length,
  1,
  "preflight exposes exactly one consumed PROOF-2 approval heading"
);
const proposedStrictApprovalSection = normalizedPreflight.slice(
  proposedStrictApprovalHeadingMatches[0].index
    + proposedStrictApprovalHeading.length
);
const proposedStrictApprovalMatch = proposedStrictApprovalSection.match(
  /```text\n([\s\S]*?)\n```/
);
assert.ok(
  proposedStrictApprovalMatch,
  "proposal-only strict-proof approval has one text fence"
);
const proposedStrictApprovalFields = Object.fromEntries(
  proposedStrictApprovalMatch[1]
    .split("\n")
    .filter((line) => /^[a-z0-9_]+=/.test(line))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1)];
    })
);
assert.deepEqual(
  proposedStrictApprovalFields,
  {
    approval_id: consumedStrictApprovalUnit,
    reviewed_base: expectedContract.reviewedBase,
    prior_approval_id: priorConsumedStrictApprovalUnit,
    prior_result: "blocked-sanitized-output-invalid-no-retry",
    candidate_versions:
      "20260623000000,20260624000000,20260705000000,20260706073204",
    candidate_05_identity:
      "05|20260623000000|supabase/migrations/20260623000000_comment_translator_real_comments_feed_snapshots.sql|cead8d52e3361149f8476f3852263aabdc38b369|618233207efc605f70d2c806ad2fc705052ec8db7eeed361defc3dfb0cca0522|3474",
    candidate_06_identity:
      "06|20260624000000|supabase/migrations/20260624000000_account_display_timezone_preference.sql|01352c948683ddffbc246b7ea26bb220e4465b3c|e027e146d5094b5010fe35ba6201c66fb42a537daa7bf63c1f223e407418aae2|701",
    candidate_07_identity:
      "07|20260705000000|supabase/migrations/20260705000000_comment_translator_creator_waitlist_registrations.sql|86253c3d8751d01df1359dc6e407553d31419902|037e3a72b20502e26e8c45e4d4227e25a1e4405b6bd28c39fcd246e4b7ddcfd0|3318",
    candidate_08_identity:
      "08|20260706073204|supabase/migrations/20260706073204_supabase_default_privileges_guard.sql|761e3e740c8e317a76da4c5bb9505060b7746ce5|5454fc4ed5381eb29e11d573d0655b4c62172b6f46429d7a3222ebe03184291e|1135",
    target_migration_version: expectedContract.migration.version,
    target_canonical_git_blob: expectedContract.migration.gitBlob,
    target_canonical_git_blob_byte_sha256:
      expectedContract.migration.gitBlobSha256,
    repository_pinned_supabase_cli: expectedContract.cli.version,
    cli_agent_mode: "no",
    integration_ref:
      "origin/codex/comment-translator-free-public-beta-integration",
    migration_history_current_authority: "current-confirmed",
    opaque_linked_target_binding:
      "git-ignored-authority-target-exact-match-required",
    sql_path:
      "scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof.sql",
    sql_canonical_byte_sha256:
      "f3448f70416bb87cce2e4a94bd75b76bf5e217e231a52edf1cd868c948e7e3f0",
    sql_canonical_bytes: "60706",
    cli_command_contract:
      "db-query-linked-fixed-file-output-format-json-agent-no-log-level-error",
    action_label: "one-sanitized-read-only-strict-source-equivalence-proof-2"
  },
  "consumed PROOF-2 approval exposes only the reviewed machine fields"
);
for (const artifact of [...strictPublicArtifacts, ...strictSupportModules]) {
  assert.match(
    preflight,
    new RegExp(artifact.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `preflight records strict artifact: ${artifact}`
  );
  assert.equal(fs.existsSync(artifact), true, `strict artifact exists: ${artifact}`);
}
for (const field of [
  "strict_source_equivalence_matrix",
  "canonical_effect_equivalent_count",
  "absent_count",
  "partial_count",
  "conflicting_count",
  "unverifiable_count",
  "unknown_remote_migration_count"
]) {
  assert.match(preflight, new RegExp(`\\b${field}\\b`), `preflight records ${field}`);
}
for (const status of [
  "Status: two approved remote reads consumed / blocked-sanitized-output-invalid /",
  "local contract: pass",
  "remote strict proof: blocked-sanitized-output-invalid",
  "strict-proof remote read attempts: 2",
  "remote mutation / repair / apply attempts: 0 / 0 / 0",
  "approval status: consumed-no-retry",
  "sanitized output review status: fail",
  "abort status: triggered-sanitized-output-invalid",
  "cli_output_contract_status=executed-proof-2-consumed-no-retry",
  "cli_agent_mode=no",
  `closed_runner_unit=${closedStrictRunnerUnit}`,
  "next_approval_unit=none",
  "next_approval_status=not-proposed"
]) {
  assert.match(strictDesign, new RegExp(status.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}

const git = (...args) =>
  execFileSync("git", args, { encoding: "utf8" }).trim();
assert.equal(
  git("merge-base", "HEAD", expectedContract.reviewedBase),
  expectedContract.reviewedBase
);
assert.equal(
  git(
    "rev-parse",
    "origin/codex/comment-translator-free-public-beta-integration"
  ),
  expectedContract.reviewedBase
);
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
for (const candidate of expectedContract.remediationDesign.priorCandidates) {
  assert.equal(git("rev-parse", `HEAD:${candidate.path}`), candidate.gitBlob);
  const canonicalCandidate = execFileSync("git", [
    "cat-file",
    "blob",
    candidate.gitBlob
  ]);
  assert.equal(canonicalCandidate.byteLength, candidate.canonicalByteSize);
  assert.equal(
    crypto.createHash("sha256").update(canonicalCandidate).digest("hex"),
    candidate.gitBlobSha256
  );
}

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
  /^- c1_containerless_phase_2_next_approval_unit=none$/m
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
  /^- c1_containerless_phase_2_remote_read_attempt_count=5$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_remote_mutation_attempt_count=0$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_next_approval_status=not-proposed$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_authority_status=current-confirmed$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_migration_history_reconciliation_local_status=review-ready$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_migration_history_reconciliation_approval_status=consumed-pass-no-retry$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_migration_history_reconciliation_remote_read_attempt_count=1$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_migration_history_reconciliation_remote_mutation_attempt_count=0$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_migration_history_reconciliation_execution_status=reconciliation-complete$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_migration_history_reconciliation_abort_status=not-triggered$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_current_worktree_cli_status=present-repository-pinned-2\.109\.0$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_current_worktree_link_metadata_status=present-target-match-pass-git-ignored$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_migration_history_reconciliation_local_prerequisite_status=pass-after-user-setup$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_migration_history_remediation_design_status=review-ready-local-only$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_migration_history_remediation_strategy=proof-first-oldest-first-no-inferred-repair$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_prior_migration_state_proof_status=complete-partial-remediation-design-required$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_strict_source_equivalence_reviewed_base=06a26c74bf0f7c910e3f79df97f260d3ce364090$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_strict_source_equivalence_stale_approval_status=blocked-before-remote-not-consumed$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_strict_source_equivalence_execution_status=blocked-sanitized-output-invalid$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_migration_repair_attempt_count=0$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_migration_apply_attempt_count=0$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_prior_migration_state_proof_approval_status=consumed-pass-no-retry$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_prior_migration_state_proof_remote_read_attempt_count=1$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_prior_migration_state_proof_result=equivalent-present-3-partial-1-missing-0-conflicting-0-unverifiable-0$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_strict_source_equivalence_design_status=approved$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_strict_source_equivalence_local_implementation_status=review-ready$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_strict_source_equivalence_local_contract_status=pass$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_strict_source_equivalence_approval_status=consumed-no-retry$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_strict_source_equivalence_remote_read_attempt_count=2$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_strict_source_equivalence_sanitized_output_review_status=fail$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_strict_source_equivalence_abort_status=triggered-sanitized-output-invalid$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_strict_source_equivalence_cli_output_contract_design_unit=C1-CONTAINERLESS-BILLING-PHASE2-STRICT-SOURCE-EQUIVALENCE-CLI-OUTPUT-CONTRACT-1$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_strict_source_equivalence_cli_output_contract_status=executed-proof-2-consumed-no-retry$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_strict_source_equivalence_cli_agent_mode=no$/m
);
assert.match(
  task,
  new RegExp(`^- c1_containerless_phase_2_strict_source_equivalence_closed_runner_unit=${closedStrictRunnerUnit}$`, "m")
);
assert.match(
  task,
  /^- c1_containerless_phase_2_strict_source_equivalence_proposed_approval_unit=none$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_strict_source_equivalence_proposed_approval_status=not-proposed$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_strict_source_equivalence_repair_authorization=not-authorized-regardless-of-result$/m
);
assert.match(
  task,
  /^- c1_containerless_phase_2_strict_source_equivalence_apply_authorization=not-authorized-regardless-of-result$/m
);
process.stdout.write(
  "comment_translator_creator_c1_containerless_billing_phase_2_preflight_contract=pass\n"
);
