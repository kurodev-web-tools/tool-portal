export const APPROVAL_ID =
  "C1-CONTAINERLESS-BILLING-PHASE2-PRIOR-MIGRATION-STATE-PROOF-1";

export const CANDIDATE_VERSIONS = Object.freeze([
  "20260623000000",
  "20260624000000",
  "20260705000000",
  "20260706073204"
]);

const allowedStatuses = new Set([
  "equivalent-present",
  "missing",
  "partial",
  "conflicting",
  "unverifiable"
]);
const remoteKeys = [
  "prior_migration_state_matrix",
  "equivalent_present_count",
  "missing_count",
  "partial_count",
  "conflicting_count",
  "unverifiable_count",
  "unknown_remote_migration_count"
];

function baseResult() {
  return {
    approval_id: APPROVAL_ID,
    reviewed_base_status: "pass",
    candidate_identity_status: "pass",
    target_binding_status: "current-unique-confirmed"
  };
}

function failedResult(executionStatus, abortStatus) {
  return {
    ...baseResult(),
    prior_migration_state_matrix: [],
    equivalent_present_count: "unknown",
    missing_count: "unknown",
    partial_count: "unknown",
    conflicting_count: "unknown",
    unverifiable_count: "unknown",
    unknown_remote_migration_count: "unknown",
    remote_read_attempt_count: 1,
    remote_mutation_attempt_count: 0,
    migration_repair_attempt_count: 0,
    migration_apply_attempt_count: 0,
    execution_status: executionStatus,
    sanitized_output_review_status: "pass",
    abort_status: abortStatus,
    unchecked_scope_status: "repair-apply-and-later-not-run"
  };
}

function parseRow(stdout) {
  const parsed = JSON.parse(stdout);
  if (
    !Array.isArray(parsed)
    || parsed.length !== 1
    || parsed[0] === null
    || typeof parsed[0] !== "object"
    || Array.isArray(parsed[0])
  ) {
    throw new Error("unexpected output shape");
  }
  const row = parsed[0];
  if (
    Object.keys(row).sort().join("\n")
    !== [...remoteKeys].sort().join("\n")
  ) {
    throw new Error("unexpected output keys");
  }
  for (const key of remoteKeys.slice(1)) {
    if (!Number.isInteger(row[key]) || row[key] < 0) {
      throw new Error("unexpected count");
    }
  }
  if (row.unknown_remote_migration_count !== 10) {
    throw new Error("unknown remote count changed");
  }
  const entries = row.prior_migration_state_matrix.split("|");
  if (entries.length !== CANDIDATE_VERSIONS.length) {
    throw new Error("unexpected matrix length");
  }
  const matrix = entries.map((entry, index) => {
    const [version, status, trailing] = entry.split(":");
    if (
      trailing !== undefined
      || version !== CANDIDATE_VERSIONS[index]
      || !allowedStatuses.has(status)
    ) {
      throw new Error("unexpected matrix entry");
    }
    return { version, status };
  });
  const countKeys = {
    "equivalent-present": "equivalent_present_count",
    missing: "missing_count",
    partial: "partial_count",
    conflicting: "conflicting_count",
    unverifiable: "unverifiable_count"
  };
  for (const [status, key] of Object.entries(countKeys)) {
    if (row[key] !== matrix.filter((entry) => entry.status === status).length) {
      throw new Error("matrix count mismatch");
    }
  }
  return { row, matrix };
}

export function reducePriorMigrationStateProofCliResult({ status, stdout }) {
  if (status !== 0) {
    return failedResult(
      "blocked-remote-read-failed",
      "triggered-remote-read-failed"
    );
  }
  let parsed;
  try {
    parsed = parseRow(stdout);
  } catch {
    return failedResult(
      "blocked-sanitized-output-invalid",
      "triggered-sanitized-output-invalid"
    );
  }
  if (parsed.row.unverifiable_count > 0) {
    return failedResult(
      "blocked-unverifiable",
      "triggered-unverifiable"
    );
  }
  return {
    ...baseResult(),
    prior_migration_state_matrix: parsed.matrix,
    equivalent_present_count: parsed.row.equivalent_present_count,
    missing_count: parsed.row.missing_count,
    partial_count: parsed.row.partial_count,
    conflicting_count: parsed.row.conflicting_count,
    unverifiable_count: 0,
    unknown_remote_migration_count: 10,
    remote_read_attempt_count: 1,
    remote_mutation_attempt_count: 0,
    migration_repair_attempt_count: 0,
    migration_apply_attempt_count: 0,
    execution_status: "prior-migration-state-proof-complete",
    sanitized_output_review_status: "pass",
    abort_status: "not-triggered",
    unchecked_scope_status: "repair-apply-and-later-not-run"
  };
}
