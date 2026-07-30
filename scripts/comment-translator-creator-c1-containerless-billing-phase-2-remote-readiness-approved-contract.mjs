import assert from "node:assert/strict";
import fs from "node:fs";

import {
  createRemoteReadinessCommand,
  createRemoteReadinessSql
} from "./comment-translator-creator-c1-containerless-billing-phase-2-remote-readiness-approved.mjs";
import {
  APPROVAL_ID,
  reduceRemoteReadinessCliResult
} from "./comment-translator-creator-c1-containerless-billing-phase-2-remote-readiness-reducer.mjs";

const expectedKeys = [
  "approval_id",
  "reviewed_base_status",
  "migration_identity_status",
  "target_binding_status",
  "target_owner_status",
  "apply_owner_status",
  "rollback_owner_status",
  "output_reviewer_status",
  "project_health_status",
  "postgres_capability_status",
  "migration_history_status",
  "expected_prior_migration_count",
  "sole_pending_migration_count",
  "unexpected_pending_migration_count",
  "dependency_status",
  "role_capability_status",
  "role_collision_count",
  "schema_collision_count",
  "api_exposure_status",
  "billing_mutation_gate_status",
  "remote_read_attempt_count",
  "remote_mutation_attempt_count",
  "execution_status",
  "sanitized_output_review_status",
  "abort_status",
  "unchecked_scope_status"
];

const passingRow = {
  project_health_status: "pass",
  postgres_capability_status: "pass",
  migration_history_status: "pass",
  expected_prior_migration_count: 16,
  sole_pending_migration_count: 1,
  unexpected_pending_migration_count: 0,
  dependency_status: "pass",
  role_capability_status: "pass",
  role_collision_count: 0,
  schema_collision_count: 0,
  api_exposure_status: "unexposed"
};

const sql = createRemoteReadinessSql();
assert.match(sql, /^\s*with\b/i);
assert.equal((sql.match(/;/g) ?? []).length, 1);
assert.doesNotMatch(
  sql,
  /^\s*(insert|update|delete|merge|alter|create|drop|grant|revoke|truncate|call|do)\b/gim
);
assert.equal(
  new Set(sql.match(/\b20\d{12}\b/g) ?? []).size,
  17
);
assert.match(
  sql,
  /has_database_privilege\('postgres', current_database\(\), 'CREATE'\)/
);
assert.doesNotMatch(sql, /\bcurrent_user\b/);

assert.deepEqual(createRemoteReadinessCommand("supabase.cmd", sql), {
  file: "supabase.cmd",
  args: [
    "db",
    "query",
    "--linked",
    sql,
    "--output",
    "json",
    "--log-level",
    "error"
  ]
});

const passing = reduceRemoteReadinessCliResult({
  status: 0,
  stdout: JSON.stringify([passingRow]),
  stderr: ""
});
assert.equal(APPROVAL_ID, "C1-CONTAINERLESS-BILLING-PHASE2-REMOTE-READINESS-2");
assert.deepEqual(Object.keys(passing), expectedKeys);
assert.equal(passing.execution_status, "readiness-pass");
assert.equal(passing.abort_status, "not-triggered");
assert.equal(passing.remote_read_attempt_count, 1);
assert.equal(passing.remote_mutation_attempt_count, 0);

const blocked = reduceRemoteReadinessCliResult({
  status: 0,
  stdout: JSON.stringify([{ ...passingRow, role_collision_count: 1 }]),
  stderr: ""
});
assert.equal(blocked.execution_status, "blocked-readiness-failed");
assert.equal(blocked.abort_status, "triggered-sanitized-readiness-failure");

const rawSentinel = "private-raw-sentinel";
const invalid = reduceRemoteReadinessCliResult({
  status: 0,
  stdout: rawSentinel,
  stderr: ""
});
assert.equal(invalid.execution_status, "blocked-sanitized-output-invalid");
assert.equal(invalid.abort_status, "triggered-sanitized-output-invalid");
assert.equal(JSON.stringify(invalid).includes(rawSentinel), false);

const failed = reduceRemoteReadinessCliResult({
  status: 1,
  stdout: "",
  stderr: rawSentinel
});
assert.equal(failed.execution_status, "blocked-remote-read-failed");
assert.equal(failed.abort_status, "triggered-remote-read-failed");
assert.equal(JSON.stringify(failed).includes(rawSentinel), false);

const executedRow = {
  ...passingRow,
  migration_history_status: "fail",
  expected_prior_migration_count: 12,
  sole_pending_migration_count: 5,
  unexpected_pending_migration_count: 4
};
const expectedExecution = reduceRemoteReadinessCliResult({
  status: 0,
  stdout: JSON.stringify([executedRow]),
  stderr: ""
});
const preflight = fs.readFileSync(
  "docs/active/COMMENT_TRANSLATOR_CREATOR_C1_CONTAINERLESS_BILLING_PHASE_2_REMOTE_SCHEMA_APPLY_PREFLIGHT.md",
  "utf8"
);
const executionMatch = preflight.match(
  /```remote-readiness-execution-2-json\r?\n([\s\S]*?)\r?\n```/
);
assert.ok(executionMatch, "preflight records the consumed sanitized attempt");
assert.deepEqual(JSON.parse(executionMatch[1]), expectedExecution);

process.stdout.write(
  "comment_translator_creator_c1_phase_2_remote_readiness_approved_contract=pass\n"
);
