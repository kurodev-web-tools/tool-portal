import assert from "node:assert/strict";
import fs from "node:fs";

const prefix =
  "scripts/comment-translator-creator-c1-containerless-billing-phase-2-prior-migration-state-proof";
const sqlPath = `${prefix}.sql`;
const reducerPath = `${prefix}-reducer.mjs`;
const runnerPath = `${prefix}-approved.mjs`;

assert.equal(
  fs.existsSync(sqlPath),
  true,
  "Given the approved proof, When the contract runs, Then fixed read-only SQL exists"
);
assert.equal(fs.existsSync(reducerPath), true);
assert.equal(fs.existsSync(runnerPath), true);
const runnerSource = fs.readFileSync(runnerPath, "utf8");
assert.match(
  runnerSource,
  /timingSafeEqual/,
  "Given opaque target binding, When local gates run, Then linked metadata is compared without disclosure"
);

const {
  APPROVAL_ID,
  CANDIDATE_VERSIONS,
  reducePriorMigrationStateProofCliResult
} = await import(`./${prefix.split("/").at(-1)}-reducer.mjs`);
const {
  createPriorMigrationStateProofCommand,
  createPriorMigrationStateProofSql
} = await import(`./${prefix.split("/").at(-1)}-approved.mjs`);

const versions = [
  "20260623000000",
  "20260624000000",
  "20260705000000",
  "20260706073204"
];
const allKnownVersions = [
  "20260527000000",
  "20260601000000",
  "20260615000000",
  "20260615001000",
  ...versions,
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
const statuses = [
  "equivalent-present",
  "missing",
  "partial",
  "conflicting"
];
assert.equal(
  APPROVAL_ID,
  "C1-CONTAINERLESS-BILLING-PHASE2-PRIOR-MIGRATION-STATE-PROOF-1"
);
assert.deepEqual(CANDIDATE_VERSIONS, versions);

const sql = createPriorMigrationStateProofSql();
assert.match(sql, /^\s*with\b/i);
assert.equal((sql.match(/;/g) ?? []).length, 1);
assert.doesNotMatch(
  sql,
  /^\s*(insert|update|delete|merge|alter|create|drop|grant|revoke|truncate|call|do)\b/gim
);
assert.deepEqual(
  [...new Set(sql.match(/\b20\d{12}\b/g) ?? [])],
  allKnownVersions
);
assert.match(sql, /supabase_migrations\.schema_migrations/);
assert.match(sql, /prior_migration_state_matrix/);
assert.match(sql, /unknown_remote_migration_count/);
assert.deepEqual(
  createPriorMigrationStateProofCommand("supabase.cmd", sql),
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

const row = {
  prior_migration_state_matrix: versions
    .map((version, index) => `${version}:${statuses[index]}`)
    .join("|"),
  equivalent_present_count: 1,
  missing_count: 1,
  partial_count: 1,
  conflicting_count: 1,
  unverifiable_count: 0,
  unknown_remote_migration_count: 10
};
const passing = reducePriorMigrationStateProofCliResult({
  status: 0,
  stdout: JSON.stringify([row]),
  stderr: ""
});
assert.deepEqual(
  passing.prior_migration_state_matrix,
  versions.map((version, index) => ({ version, status: statuses[index] }))
);
assert.equal(passing.execution_status, "prior-migration-state-proof-complete");
assert.equal(passing.remote_read_attempt_count, 1);
assert.equal(passing.remote_mutation_attempt_count, 0);
assert.equal(passing.migration_repair_attempt_count, 0);
assert.equal(passing.migration_apply_attempt_count, 0);
assert.equal(passing.abort_status, "not-triggered");

for (const invalidRow of [
  { ...row, extra: 1 },
  { ...row, missing_count: 2 },
  { ...row, unknown_remote_migration_count: 9 },
  {
    ...row,
    prior_migration_state_matrix:
      `${versions[0]}:unverifiable|${versions.slice(1).map((version, index) =>
        `${version}:${statuses[index + 1]}`).join("|")}`,
    equivalent_present_count: 0,
    unverifiable_count: 1
  }
]) {
  const invalid = reducePriorMigrationStateProofCliResult({
    status: 0,
    stdout: JSON.stringify([invalidRow]),
    stderr: ""
  });
  assert.notEqual(invalid.execution_status, "prior-migration-state-proof-complete");
  assert.equal(invalid.remote_read_attempt_count, 1);
  assert.equal(invalid.remote_mutation_attempt_count, 0);
  assert.deepEqual(invalid.prior_migration_state_matrix, []);
}

const sentinel = "private-raw-sentinel";
const failed = reducePriorMigrationStateProofCliResult({
  status: 1,
  stdout: sentinel,
  stderr: sentinel
});
assert.equal(failed.execution_status, "blocked-remote-read-failed");
assert.equal(JSON.stringify(failed).includes(sentinel), false);

const executionResult = reducePriorMigrationStateProofCliResult({
  status: 0,
  stdout: JSON.stringify([{
    prior_migration_state_matrix: [
      `${versions[0]}:equivalent-present`,
      `${versions[1]}:equivalent-present`,
      `${versions[2]}:partial`,
      `${versions[3]}:equivalent-present`
    ].join("|"),
    equivalent_present_count: 3,
    missing_count: 0,
    partial_count: 1,
    conflicting_count: 0,
    unverifiable_count: 0,
    unknown_remote_migration_count: 10
  }]),
  stderr: ""
});
const preflight = fs.readFileSync(
  "docs/active/COMMENT_TRANSLATOR_CREATOR_C1_CONTAINERLESS_BILLING_PHASE_2_REMOTE_SCHEMA_APPLY_PREFLIGHT.md",
  "utf8"
);
const executionMatch = preflight.match(
  /```prior-migration-state-proof-execution-json\r?\n([\s\S]*?)\r?\n```/
);
assert.ok(executionMatch, "preflight records the consumed proof result");
assert.deepEqual(JSON.parse(executionMatch[1]), executionResult);

process.stdout.write(
  "comment_translator_creator_c1_phase_2_prior_migration_state_proof_contract=pass\n"
);
