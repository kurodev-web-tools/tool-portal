import assert from "node:assert/strict";

import {
  reduceStrictSourceEquivalenceCliResult
} from "./comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-reducer.mjs";
import {
  allPassParts,
  blockedResultKeys,
  completeResultKeys,
  expectedApprovalId,
  gateFields,
  manifests,
  rawSentinel,
  versions
} from "./comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-fixtures.mjs";

export function serializeParts(parts) {
  return parts
    .map(
      ({ version, relationState, conflictState, vector }) =>
        `${version}:${relationState}:${conflictState}:${vector}`
    )
    .join("|");
}

export function createSqlRow({
  matrix,
  statuses,
  unknownRemoteMigrationCount = 10
}) {
  // Insertion order is the approved transient SQL JSON interface contract.
  return {
    strict_source_equivalence_matrix: matrix,
    canonical_effect_equivalent_count: statuses.filter(
      (status) => status === "canonical-effect-equivalent"
    ).length,
    absent_count: statuses.filter((status) => status === "absent").length,
    partial_count: statuses.filter((status) => status === "partial").length,
    conflicting_count: statuses.filter(
      (status) => status === "conflicting"
    ).length,
    unverifiable_count: statuses.filter(
      (status) => status === "unverifiable"
    ).length,
    unknown_remote_migration_count: unknownRemoteMigrationCount
  };
}

export function reduceRow(row) {
  return reduceStrictSourceEquivalenceCliResult({
    status: 0,
    timedOut: false,
    stdout: JSON.stringify([row]),
    stderr: rawSentinel
  });
}

function assertExactKeySet(value, expectedKeys) {
  // Reducer output key order is intentionally not part of this contract.
  assert.deepEqual(Object.keys(value).sort(), [...expectedKeys].sort());
}

function assertNoTransientData(result, transientMatrix) {
  const serialized = JSON.stringify(result);
  assert.equal(
    serialized.includes(rawSentinel),
    false,
    "Given transient CLI sentinels, When a result is retained, Then raw process data is discarded"
  );
  assert.equal(serialized.includes(transientMatrix), false);
  assert.equal(serialized.includes(":canonical:"), false);
  assert.equal(serialized.includes(":not-applicable:"), false);
  assert.equal(serialized.includes(":clear:"), false);
  assert.equal(serialized.includes(":conflict:"), false);
  assert.equal(serialized.includes(":unverifiable:"), false);
  assert.equal(serialized.includes("relation_state"), false);
  assert.equal(serialized.includes("conflict_state"), false);
  assert.doesNotMatch(serialized, /m0[5-8]_[a-z_]+_\d{2}/);
}

function assertGateStatuses(result, expectedStatuses) {
  for (const [, field] of gateFields) {
    assert.equal(result[field], expectedStatuses[field], field);
  }
}

export function assertCompleteResult(result, expectedStatuses, transientMatrix) {
  assertExactKeySet(result, completeResultKeys);
  assert.equal(result.approval_id, expectedApprovalId);
  assertGateStatuses(
    result,
    Object.fromEntries(gateFields.map(([, field]) => [field, "pass"]))
  );
  assert.deepEqual(
    result.strict_source_equivalence_matrix.map(({ version }) => version),
    versions
  );
  assert.deepEqual(
    result.strict_source_equivalence_matrix.map(
      ({ overall_status: status }) => status
    ),
    expectedStatuses
  );
  for (const [entry, manifest] of result.strict_source_equivalence_matrix.map(
    (entry, index) => [entry, manifests[index]]
  )) {
    assertExactKeySet(entry, [
      "version",
      "overall_status",
      "categories"
    ]);
    assert.deepEqual(
      entry.categories.map(({ label }) => label),
      manifest.categories.map(([label]) => label)
    );
    for (const category of entry.categories) {
      assertExactKeySet(category, ["label", "status"]);
      assert.ok(
        ["pass", "fail", "unverifiable"].includes(category.status),
        `unexpected category status for ${entry.version}/${category.label}`
      );
    }
  }
  assert.equal(
    result.canonical_effect_equivalent_count,
    expectedStatuses.filter(
      (status) => status === "canonical-effect-equivalent"
    ).length
  );
  assert.equal(
    result.absent_count,
    expectedStatuses.filter((status) => status === "absent").length
  );
  assert.equal(
    result.partial_count,
    expectedStatuses.filter((status) => status === "partial").length
  );
  assert.equal(
    result.conflicting_count,
    expectedStatuses.filter((status) => status === "conflicting").length
  );
  assert.equal(
    result.unverifiable_count,
    expectedStatuses.filter((status) => status === "unverifiable").length
  );
  assert.equal(result.unknown_remote_migration_count, 10);
  assert.equal(
    result.default_privileges_security_goal_status,
    "separately-blocked"
  );
  assert.equal(result.remote_read_attempt_count, 1);
  assert.equal(result.remote_mutation_attempt_count, 0);
  assert.equal(result.migration_repair_attempt_count, 0);
  assert.equal(result.migration_apply_attempt_count, 0);
  assert.equal(
    result.execution_status,
    "strict-source-equivalence-complete"
  );
  assert.equal(result.sanitized_output_review_status, "pass");
  assert.equal(result.abort_status, "not-triggered");
  assert.equal(
    result.unchecked_scope_status,
    "repair-apply-and-later-not-run"
  );
  assertNoTransientData(result, transientMatrix);
}

export function assertBlockedResult(result, expected) {
  assertExactKeySet(result, blockedResultKeys);
  assert.equal(result.approval_id, expectedApprovalId);
  assertGateStatuses(result, expected.gateStatuses);
  assert.equal(
    result.default_privileges_security_goal_status,
    expected.defaultPrivilegesStatus
  );
  assert.equal(result.remote_read_attempt_count, expected.remoteReadAttemptCount);
  assert.equal(result.remote_mutation_attempt_count, 0);
  assert.equal(result.migration_repair_attempt_count, 0);
  assert.equal(result.migration_apply_attempt_count, 0);
  assert.equal(result.execution_status, expected.executionStatus);
  assert.equal(
    result.sanitized_output_review_status,
    expected.sanitizedOutputReviewStatus
  );
  assert.equal(result.abort_status, expected.abortStatus);
  assert.equal(
    result.unchecked_scope_status,
    "repair-apply-and-later-not-run"
  );
  assert.equal(JSON.stringify(result).includes(rawSentinel), false);
}

export function assertPostRemoteBlockedResult(result, expected) {
  assertBlockedResult(result, {
    ...expected,
    remoteReadAttemptCount: 1,
    defaultPrivilegesStatus: "separately-blocked",
    gateStatuses: Object.fromEntries(
      gateFields.map(([, field]) => [field, "pass"])
    )
  });
}

export function replaceMatrixPart(index, replacement) {
  return serializeParts(
    allPassParts.map((part, partIndex) =>
      partIndex === index ? { ...part, ...replacement } : part
    )
  );
}

export function runNamedFixture(fixture, assertions) {
  try {
    assertions();
  } catch (error) {
    if (error instanceof Error) {
      error.message = `${fixture.name}: ${error.message}`;
    }
    throw error;
  }
}
