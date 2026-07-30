export const APPROVAL_ID =
  "C1-CONTAINERLESS-BILLING-PHASE2-REMOTE-READINESS-2";

const remoteKeys = [
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
  "api_exposure_status"
];

function baseResult() {
  return {
    approval_id: APPROVAL_ID,
    reviewed_base_status: "pass",
    migration_identity_status: "pass",
    target_binding_status: "current-unique-confirmed",
    target_owner_status: "current-confirmed-by-project-owner",
    apply_owner_status: "current-confirmed-by-project-owner",
    rollback_owner_status: "current-confirmed-by-project-owner",
    output_reviewer_status: "current-confirmed-by-project-owner"
  };
}

function failedResult(executionStatus, abortStatus) {
  return {
    ...baseResult(),
    project_health_status: "unknown",
    postgres_capability_status: "unknown",
    migration_history_status: "unknown",
    expected_prior_migration_count: "unknown",
    sole_pending_migration_count: "unknown",
    unexpected_pending_migration_count: "unknown",
    dependency_status: "unknown",
    role_capability_status: "unknown",
    role_collision_count: "unknown",
    schema_collision_count: "unknown",
    api_exposure_status: "unknown",
    billing_mutation_gate_status: "closed-through-phase-3",
    remote_read_attempt_count: 1,
    remote_mutation_attempt_count: 0,
    execution_status: executionStatus,
    sanitized_output_review_status: "pass",
    abort_status: abortStatus,
    unchecked_scope_status: "phase3-and-later-not-run"
  };
}

function parseRemoteRow(stdout) {
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
  for (const key of [
    "expected_prior_migration_count",
    "sole_pending_migration_count",
    "unexpected_pending_migration_count",
    "role_collision_count",
    "schema_collision_count"
  ]) {
    if (!Number.isInteger(row[key]) || row[key] < 0) {
      throw new Error("unexpected count");
    }
  }
  for (const key of [
    "project_health_status",
    "postgres_capability_status",
    "migration_history_status",
    "dependency_status",
    "role_capability_status"
  ]) {
    if (row[key] !== "pass" && row[key] !== "fail") {
      throw new Error("unexpected status");
    }
  }
  if (
    row.api_exposure_status !== "unexposed"
    && row.api_exposure_status !== "exposed"
  ) {
    throw new Error("unexpected exposure status");
  }
  return row;
}

export function reduceRemoteReadinessCliResult({ status, stdout }) {
  if (status !== 0) {
    return failedResult(
      "blocked-remote-read-failed",
      "triggered-remote-read-failed"
    );
  }
  let row;
  try {
    row = parseRemoteRow(stdout);
  } catch {
    return failedResult(
      "blocked-sanitized-output-invalid",
      "triggered-sanitized-output-invalid"
    );
  }
  const readinessPassed =
    row.project_health_status === "pass"
    && row.postgres_capability_status === "pass"
    && row.migration_history_status === "pass"
    && row.expected_prior_migration_count === 16
    && row.sole_pending_migration_count === 1
    && row.unexpected_pending_migration_count === 0
    && row.dependency_status === "pass"
    && row.role_capability_status === "pass"
    && row.role_collision_count === 0
    && row.schema_collision_count === 0
    && row.api_exposure_status === "unexposed";
  return {
    ...baseResult(),
    ...row,
    billing_mutation_gate_status: "closed-through-phase-3",
    remote_read_attempt_count: 1,
    remote_mutation_attempt_count: 0,
    execution_status: readinessPassed
      ? "readiness-pass"
      : "blocked-readiness-failed",
    sanitized_output_review_status: "pass",
    abort_status: readinessPassed
      ? "not-triggered"
      : "triggered-sanitized-readiness-failure",
    unchecked_scope_status: "phase3-and-later-not-run"
  };
}
