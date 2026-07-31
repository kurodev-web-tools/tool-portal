import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const prefix =
  "scripts/comment-translator-creator-c1-containerless-billing-phase-2-migration-history-reconciliation";
const sqlPath = `${prefix}.sql`;
const reducerPath = `${prefix}-reducer.mjs`;
const runnerPath = `${prefix}-approved.mjs`;

assert.equal(
  fs.existsSync(sqlPath),
  true,
  "Given the approved reconciliation design, When the focused contract runs, Then the read-only SQL artifact exists"
);
assert.equal(
  fs.existsSync(reducerPath),
  true,
  "Given the sanitized evidence boundary, When the focused contract runs, Then the reducer artifact exists"
);
assert.equal(
  fs.existsSync(runnerPath),
  true,
  "Given the one-attempt approval gate, When the focused contract runs, Then the approved runner artifact exists"
);

const {
  APPROVAL_ID,
  KNOWN_MIGRATION_VERSIONS,
  reduceMigrationHistoryReconciliationCliResult
} = await import(`./${prefix.split("/").at(-1)}-reducer.mjs`);
const {
  createMigrationHistoryReconciliationCommand,
  createMigrationHistoryReconciliationSql,
  opaqueTargetBindingsMatch
} = await import(`./${prefix.split("/").at(-1)}-approved.mjs`);

const expectedVersions = [
  "20260527000000",
  "20260601000000",
  "20260615000000",
  "20260615001000",
  "20260623000000",
  "20260624000000",
  "20260705000000",
  "20260706073204",
  "20260722000000",
  "20260722001000",
  "20260722002000",
  "20260722003000",
  "20260723000000",
  "20260723001000",
  "20260723002000",
  "20260723003000",
  "20260730000000"
];
const targetVersion = expectedVersions.at(-1);
const expectedKeys = [
  "approval_id",
  "reviewed_base_status",
  "migration_identity_status",
  "target_binding_status",
  "known_migration_matrix",
  "known_present_count",
  "known_absent_count",
  "unknown_remote_migration_count",
  "target_migration_version",
  "target_pending_status",
  "remote_read_attempt_count",
  "remote_mutation_attempt_count",
  "migration_repair_attempt_count",
  "migration_apply_attempt_count",
  "backfill_attempt_count",
  "execution_status",
  "sanitized_output_review_status",
  "abort_status",
  "unchecked_scope_status"
];

assert.equal(
  APPROVAL_ID,
  "C1-CONTAINERLESS-BILLING-PHASE2-MIGRATION-HISTORY-RECONCILIATION-2"
);
assert.deepEqual(KNOWN_MIGRATION_VERSIONS, expectedVersions);
assert.equal(
  opaqueTargetBindingsMatch(Buffer.from("opaque-a"), Buffer.from("opaque-a")),
  true
);
assert.equal(
  opaqueTargetBindingsMatch(Buffer.from("opaque-a"), Buffer.from("opaque-b")),
  false
);
assert.equal(
  opaqueTargetBindingsMatch(Buffer.alloc(0), Buffer.alloc(0)),
  false
);

const sql = createMigrationHistoryReconciliationSql();
assert.match(sql, /^\s*with\b/i);
assert.equal((sql.match(/;/g) ?? []).length, 1);
assert.doesNotMatch(
  sql,
  /^\s*(insert|update|delete|merge|alter|create|drop|grant|revoke|truncate|call|do)\b/gim
);
assert.deepEqual(
  [...new Set(sql.match(/\b20\d{12}\b/g) ?? [])],
  expectedVersions
);
assert.match(sql, /supabase_migrations\.schema_migrations/);
assert.match(sql, /known_migration_matrix/);
assert.match(sql, /unknown_remote_migration_count/);
assert.match(sql, /target_pending_status/);

assert.deepEqual(
  createMigrationHistoryReconciliationCommand("supabase.cmd", sql),
  {
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
  }
);

const matrix = expectedVersions.map((version, index) => ({
  version,
  status: index < 12 ? "present" : "absent"
}));
const serializedMatrix = matrix
  .map(({ version, status }) => `${version}:${status}`)
  .join("|");
const passingRow = {
  known_migration_matrix: serializedMatrix,
  known_present_count: 12,
  known_absent_count: 5,
  unknown_remote_migration_count: 2,
  target_pending_status: "pending"
};
const passing = reduceMigrationHistoryReconciliationCliResult({
  status: 0,
  stdout: JSON.stringify([passingRow]),
  stderr: ""
});
assert.deepEqual(Object.keys(passing), expectedKeys);
assert.equal(
  passing.target_binding_status,
  "owner-confirmed-current-match-runner-linked-target-verified"
);
assert.deepEqual(passing.known_migration_matrix, matrix);
assert.equal(passing.target_migration_version, targetVersion);
assert.equal(passing.execution_status, "reconciliation-complete");
assert.equal(passing.abort_status, "not-triggered");
assert.equal(passing.remote_read_attempt_count, 1);
assert.equal(passing.remote_mutation_attempt_count, 0);
assert.equal(passing.migration_repair_attempt_count, 0);
assert.equal(passing.migration_apply_attempt_count, 0);
assert.equal(passing.backfill_attempt_count, 0);

const allPresentMatrix = expectedVersions.map((version) => ({
  version,
  status: "present"
}));
const targetAlreadyPresent = reduceMigrationHistoryReconciliationCliResult({
  status: 0,
  stdout: JSON.stringify([{
    known_migration_matrix: allPresentMatrix
      .map(({ version, status }) => `${version}:${status}`)
      .join("|"),
    known_present_count: 17,
    known_absent_count: 0,
    unknown_remote_migration_count: 0,
    target_pending_status: "not-pending"
  }]),
  stderr: ""
});
assert.equal(targetAlreadyPresent.execution_status, "reconciliation-complete");
assert.equal(targetAlreadyPresent.target_pending_status, "not-pending");
assert.deepEqual(targetAlreadyPresent.known_migration_matrix, allPresentMatrix);

for (const invalidRow of [
  { ...passingRow, unexpected: 1 },
  { ...passingRow, known_present_count: 13 },
  { ...passingRow, target_pending_status: "not-pending" },
  {
    ...passingRow,
    known_migration_matrix: serializedMatrix.replace(
      `${expectedVersions[0]}:present`,
      `${expectedVersions[0]}:unknown`
    )
  },
  {
    ...passingRow,
    known_migration_matrix: [...matrix]
      .reverse()
      .map(({ version, status }) => `${version}:${status}`)
      .join("|")
  }
]) {
  const invalid = reduceMigrationHistoryReconciliationCliResult({
    status: 0,
    stdout: JSON.stringify([invalidRow]),
    stderr: ""
  });
  assert.equal(invalid.execution_status, "blocked-sanitized-output-invalid");
  assert.equal(invalid.abort_status, "triggered-sanitized-output-invalid");
  assert.deepEqual(invalid.known_migration_matrix, []);
}

const rawSentinel = "private-raw-sentinel";
const failed = reduceMigrationHistoryReconciliationCliResult({
  status: 1,
  stdout: rawSentinel,
  stderr: rawSentinel
});
assert.equal(failed.execution_status, "blocked-remote-read-failed");
assert.equal(failed.abort_status, "triggered-remote-read-failed");
assert.equal(JSON.stringify(failed).includes(rawSentinel), false);

const blockedGate = spawnSync(process.execPath, [runnerPath], {
  cwd: process.cwd(),
  encoding: "utf8",
  env: { ...process.env }
});
assert.equal(blockedGate.status, 2);
assert.match(blockedGate.stdout, /^execution_status=blocked-approval-gate$/m);
assert.match(blockedGate.stdout, /^remote_read_attempt_count=0$/m);
assert.match(blockedGate.stdout, /^remote_mutation_attempt_count=0$/m);
assert.doesNotMatch(blockedGate.stdout, /known_migration_matrix=/);

const absentVersions = new Set([
  "20260623000000",
  "20260624000000",
  "20260705000000",
  "20260706073204",
  "20260730000000"
]);
const executedMatrix = expectedVersions.map((version) => ({
  version,
  status: absentVersions.has(version) ? "absent" : "present"
}));
const expectedExecution = reduceMigrationHistoryReconciliationCliResult({
  status: 0,
  stdout: JSON.stringify([{
    known_migration_matrix: executedMatrix
      .map(({ version, status }) => `${version}:${status}`)
      .join("|"),
    known_present_count: 12,
    known_absent_count: 5,
    unknown_remote_migration_count: 10,
    target_pending_status: "pending"
  }]),
  stderr: ""
});
const preflight = fs.readFileSync(
  "docs/active/COMMENT_TRANSLATOR_CREATOR_C1_CONTAINERLESS_BILLING_PHASE_2_REMOTE_SCHEMA_APPLY_PREFLIGHT.md",
  "utf8"
);
const executionMatch = preflight.match(
  /```migration-history-reconciliation-execution-2-json\r?\n([\s\S]*?)\r?\n```/
);
assert.ok(executionMatch, "preflight records reconciliation execution 2");
assert.deepEqual(JSON.parse(executionMatch[1]), expectedExecution);

process.stdout.write(
  "comment_translator_creator_c1_phase_2_migration_history_reconciliation_contract=pass\n"
);
