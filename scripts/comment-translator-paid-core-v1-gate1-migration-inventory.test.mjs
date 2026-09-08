import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parseRestoreSql } from "./lib/comment-translator-paid-core-v1-gate1-restore-sql.mjs";

import { computeObjectDigest, parsePublicRpcDeclarations } from "./lib/comment-translator-paid-core-v1-gate1-catalog.mjs";
import { validateEnvironmentInventoryFixture } from "./comment-translator-paid-core-v1-gate1-migration-contract.mjs";

const fixturePath = path.join(
  process.cwd(),
  "scripts",
  "fixtures",
  "comment-translator-paid-core-v1-gate1-environment-inventories.json"
);
const sourceFixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const approvedMigration = Object.freeze({
  version: "20260904000000",
  name: "comment_translator_paid_gate1_a3_canonical_convergence"
});

const rowKey = (row) => `${row.version}_${row.name}`;
const clone = (value) => structuredClone(value);

const beforeValidation = clone(sourceFixture);
const validFixture = validateEnvironmentInventoryFixture(sourceFixture);
assert.strictEqual(validFixture, sourceFixture, "validator returns the raw parsed fixture reference");
assert.deepEqual(sourceFixture, beforeValidation, "pure validator does not mutate the raw parsed fixture");
const baselineKeys = validFixture.final55.map(rowKey);
const finalKeys = validFixture.final56.map(rowKey);
const approvedKey = rowKey(approvedMigration);

assert.equal(validFixture.final55.length, 55, "final55 remains the forward-apply baseline");
assert.equal(validFixture.final56.length, 56, "final56 has the approved migration exactly added");
assert.equal(validFixture.preview.pending26.length, 26, "Preview pending inventory has 26 rows");
assert.equal(validFixture.production.pending34.length, 34, "Production pending inventory has 34 rows");
assert.equal(new Set(baselineKeys).has(approvedKey), false, "approved migration is absent from the final55 baseline");
assert.deepEqual(
  validFixture.final56,
  [...validFixture.final55, approvedMigration],
  "final56 is final55 plus only the approved migration"
);
assert.equal(new Set(finalKeys).size, 56, "final56 rows are unique");
assert.equal(validFixture.preview.pending26.some((row) => rowKey(row) === approvedKey), true);
assert.equal(validFixture.production.pending34.some((row) => rowKey(row) === approvedKey), true);

const rawInvalidCases = [
  ["wrong schema version", (candidate) => { candidate.schemaVersion = 1; }, /environment inventory schemaVersion is 2/],
  ["missing digest", (candidate) => { delete candidate.aggregateSha256; }, /environment inventory fixture/],
  [
    "invalid digest",
    (candidate) => {
      const replacement = candidate.aggregateSha256[0] === "0" ? "1" : "0";
      candidate.aggregateSha256 = replacement + candidate.aggregateSha256.slice(1);
    },
    /environment inventory aggregate SHA-256/
  ]
];

for (const [label, mutator, expectedError] of rawInvalidCases) {
  const candidate = clone(sourceFixture);
  mutator(candidate);
  const beforeRejection = clone(candidate);
  assert.throws(() => validateEnvironmentInventoryFixture(candidate), expectedError, label);
  assert.deepEqual(candidate, beforeRejection, `${label} is rejected without silent repair`);
}

function invalidFixture(mutator) {
  const candidate = clone(validFixture);
  mutator(candidate);
  candidate.aggregateSha256 = computeObjectDigest(candidate);
  return candidate;
}

function expectRejected(label, mutator) {
  assert.throws(
    () => validateEnvironmentInventoryFixture(invalidFixture(mutator)),
    label
  );
}

const invalidCases = [
  ["final56 field missing", (candidate) => delete candidate.final56],
  ["final56 migration missing", (candidate) => candidate.final56.pop()],
  ["final56 duplicate row", (candidate) => candidate.final56.push({ ...candidate.final56[0] })],
  [
    "final56 unknown version",
    (candidate) => {
      candidate.final56[candidate.final56.length - 1] = {
        ...candidate.final56[candidate.final56.length - 1],
        version: "20990101000000"
      };
    }
  ],
  [
    "final56 unknown name",
    (candidate) => {
      candidate.final56[candidate.final56.length - 1] = {
        ...candidate.final56[candidate.final56.length - 1],
        name: "unknown_migration_name"
      };
    }
  ],
  ["Preview pending26 field missing", (candidate) => delete candidate.preview.pending26],
  ["Preview pending26 migration missing", (candidate) => candidate.preview.pending26.pop()],
  ["Preview pending26 duplicate row", (candidate) => candidate.preview.pending26.push({ ...candidate.preview.pending26[0] })],
  [
    "Preview pending26 unknown row",
    (candidate) => {
      candidate.preview.pending26[0] = {
        version: "20990101000000",
        name: "unknown_migration_name"
      };
    }
  ],
  ["Production pending34 field missing", (candidate) => delete candidate.production.pending34],
  ["Production pending34 migration missing", (candidate) => candidate.production.pending34.pop()],
  ["Production pending34 duplicate row", (candidate) => candidate.production.pending34.push({ ...candidate.production.pending34[0] })],
  [
    "Production pending34 unknown row",
    (candidate) => {
      candidate.production.pending34[0] = {
        version: "20990101000000",
        name: "unknown_migration_name"
      };
    }
  ]
];

for (const [label, mutator] of invalidCases) expectRejected(label, mutator);

// A3 may reinstall the two semantic and 76 observed newline-drift definitions and four reviewed
// revokes. A text-wide DML search incorrectly inspects function bodies as if
// applying the migration executed those bodies.
const migrationRoot = path.join(process.cwd(), "supabase", "migrations");
const readSql = name => fs.readFileSync(path.join(migrationRoot, name), "utf8").replace(/\r\n?/g, "\n");
const originalSql = readSql("20260812120000_comment_translator_paid_core_v1.sql");
const forwardSql = readSql("20260904000000_comment_translator_paid_gate1_a3_canonical_convergence.sql");
const functionNames = ["ct_paid_azure_direct_fallback", "ct_paid_record_provider_hourly_detail"];
const sqlSpans = sql => parseRestoreSql(sql).filter(span => span.kind !== "trivia");
const statement = (sql, span) => sql.slice(span.tokens[0].start, span.end).trim();
const originalSpans = sqlSpans(originalSql);
const originalDefinitions = functionNames.map(name => {
  const matches = originalSpans.filter(span => span.tokens[3]?.value === "function" && span.tokens[6]?.value === name);
  assert.equal(matches.length, 1, "exact original function identity");
  return statement(originalSql, matches[0]);
});
const previewEntry = JSON.parse(fs.readFileSync(path.join(process.cwd(), "scripts/fixtures/comment-translator-paid-core-v1-gate1-preview-entry-observation.json"), "utf8"));
const rpcKey = row => `${row.schema}.${row.name}(${row.identityArguments})`;
const latestDefinitions = new Map();
for (const name of fs.readdirSync(migrationRoot).filter(name => name.endsWith(".sql") && !name.startsWith("20260904000000_")).sort()) {
  const sql = readSql(name);
  for (const span of sqlSpans(sql)) {
    const value = statement(sql, span);
    if (!/^create\s+(?:or\s+replace\s+)?function\s+public\.ct_paid_/i.test(value)) continue;
    const declarations = parsePublicRpcDeclarations(value);
    assert.equal(declarations.length, 1);
    latestDefinitions.set(rpcKey(declarations[0]), value.replace(/^create\s+function/i, "create or replace function"));
  }
}
assert.equal(previewEntry.newlineOnlyFunctions.length, 76);
const retryOverride = readSql("20260813131500_comment_translator_paid_task6_openai_rate_retry.sql");
const oldRetryGuard = retryOverride.match(/v_original := '((?:''|[^'])*)';/)?.[1].replaceAll("''", "'");
const newRetryGuard = retryOverride.match(/v_definition := replace\(\s*v_definition,\s*v_original,\s*'((?:''|[^'])*)'\s*\);/)?.[1].replaceAll("''", "'");
assert.ok(oldRetryGuard && newRetryGuard);
const retryIdentity = previewEntry.newlineOnlyFunctions.find(f => f.name === "ct_paid_openai_attempt");
const retrySource = latestDefinitions.get(rpcKey(retryIdentity));
assert.equal(retrySource.split(oldRetryGuard).length - 1, 1);
latestDefinitions.set(rpcKey(retryIdentity), retrySource.replace(oldRetryGuard, () => newRetryGuard));
const newlineDefinitions = previewEntry.newlineOnlyFunctions.map(row => {
  assert.ok(latestDefinitions.has(rpcKey(row)));
  return latestDefinitions.get(rpcKey(row));
});
const revokes = [
  "revoke all privileges on table public.comment_translator_paid_maintenance_work_items from public, anon, authenticated, service_role;",
  "revoke all privileges on table public.comment_translator_paid_message_rate_reservation_tombstones from public, anon, authenticated, service_role;",
  "revoke all privileges on table public.comment_translator_paid_scheduler_runs from public, anon, authenticated, service_role;",
  "revoke all privileges on function public.ct_paid_schedule_durable_reconciliation() from public, anon, authenticated, service_role;"
];
function assertForwardSource(sql) {
  const spans = sqlSpans(sql);
  assert.equal(spans.length, 82, "A3 has exactly 78 definitions and four revokes");
  assert.ok(spans.every(span => span.kind === "sql"));
  const expectedStatements = [...originalDefinitions, ...newlineDefinitions, ...revokes];
  spans.forEach((span, index) => assert.ok(statement(sql, span) === expectedStatements[index], `A3 exact authoritative statement ${index}`));
}
assertForwardSource(forwardSql);
assert.throws(() => assertForwardSource(forwardSql + "\ndrop table public.unexpected;"), "additional top-level DDL rejected");
assert.throws(() => assertForwardSource(forwardSql.replace("v_attempt public.", "v_wrong public.")), "function body drift rejected");
assert.throws(() => assertForwardSource(forwardSql.replace(revokes[0], "")), "missing revoke rejected");

console.log("comment-translator-paid-core-v1-gate1 migration inventory fixture contract: PASS");
