export const APPROVAL_ID =
  "C1-CONTAINERLESS-BILLING-PHASE2-MIGRATION-HISTORY-RECONCILIATION-2";

export const KNOWN_MIGRATION_VERSIONS = Object.freeze([
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
]);

const targetMigrationVersion = KNOWN_MIGRATION_VERSIONS.at(-1);
const remoteKeys = [
  "known_migration_matrix",
  "known_present_count",
  "known_absent_count",
  "unknown_remote_migration_count",
  "target_pending_status"
];

function baseResult() {
  return {
    approval_id: APPROVAL_ID,
    reviewed_base_status: "pass",
    migration_identity_status: "pass",
    target_binding_status:
      "owner-confirmed-current-match-runner-linked-target-verified"
  };
}

function failedResult(executionStatus, abortStatus) {
  return {
    ...baseResult(),
    known_migration_matrix: [],
    known_present_count: "unknown",
    known_absent_count: "unknown",
    unknown_remote_migration_count: "unknown",
    target_migration_version: targetMigrationVersion,
    target_pending_status: "unknown",
    remote_read_attempt_count: 1,
    remote_mutation_attempt_count: 0,
    migration_repair_attempt_count: 0,
    migration_apply_attempt_count: 0,
    backfill_attempt_count: 0,
    execution_status: executionStatus,
    sanitized_output_review_status: "pass",
    abort_status: abortStatus,
    unchecked_scope_status: "repair-apply-phase3-and-later-not-run"
  };
}

function parseMatrix(serializedMatrix) {
  if (typeof serializedMatrix !== "string") {
    throw new Error("unexpected matrix type");
  }
  const entries = serializedMatrix.split("|");
  if (entries.length !== KNOWN_MIGRATION_VERSIONS.length) {
    throw new Error("unexpected matrix length");
  }
  return entries.map((entry, index) => {
    const [version, status, trailing] = entry.split(":");
    if (
      trailing !== undefined
      || version !== KNOWN_MIGRATION_VERSIONS[index]
      || (status !== "present" && status !== "absent")
    ) {
      throw new Error("unexpected matrix entry");
    }
    return { version, status };
  });
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
    "known_present_count",
    "known_absent_count",
    "unknown_remote_migration_count"
  ]) {
    if (!Number.isInteger(row[key]) || row[key] < 0) {
      throw new Error("unexpected count");
    }
  }
  const matrix = parseMatrix(row.known_migration_matrix);
  const presentCount = matrix.filter(({ status }) => status === "present").length;
  const absentCount = matrix.length - presentCount;
  if (
    row.known_present_count !== presentCount
    || row.known_absent_count !== absentCount
    || presentCount + absentCount !== KNOWN_MIGRATION_VERSIONS.length
  ) {
    throw new Error("matrix count mismatch");
  }
  const expectedTargetPendingStatus =
    matrix.at(-1).status === "absent" ? "pending" : "not-pending";
  if (row.target_pending_status !== expectedTargetPendingStatus) {
    throw new Error("target pending mismatch");
  }
  return {
    matrix,
    knownPresentCount: presentCount,
    knownAbsentCount: absentCount,
    unknownRemoteMigrationCount: row.unknown_remote_migration_count,
    targetPendingStatus: row.target_pending_status
  };
}

export function reduceMigrationHistoryReconciliationCliResult({
  status,
  stdout
}) {
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
  return {
    ...baseResult(),
    known_migration_matrix: row.matrix,
    known_present_count: row.knownPresentCount,
    known_absent_count: row.knownAbsentCount,
    unknown_remote_migration_count: row.unknownRemoteMigrationCount,
    target_migration_version: targetMigrationVersion,
    target_pending_status: row.targetPendingStatus,
    remote_read_attempt_count: 1,
    remote_mutation_attempt_count: 0,
    migration_repair_attempt_count: 0,
    migration_apply_attempt_count: 0,
    backfill_attempt_count: 0,
    execution_status: "reconciliation-complete",
    sanitized_output_review_status: "pass",
    abort_status: "not-triggered",
    unchecked_scope_status: "repair-apply-phase3-and-later-not-run"
  };
}
