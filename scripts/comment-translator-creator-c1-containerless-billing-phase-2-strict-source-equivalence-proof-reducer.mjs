export const APPROVAL_ID = "C1-CONTAINERLESS-BILLING-PHASE2-STRICT-SOURCE-EQUIVALENCE-PROOF-1";

export const CANDIDATE_VERSIONS = Object.freeze(["20260623000000", "20260624000000", "20260705000000", "20260706073204"]);

const freezeManifest = (manifest) => Object.freeze({
  ...manifest, categories: Object.freeze(manifest.categories.map((category) => Object.freeze(category)))
});

export const PREDICATE_MANIFEST = Object.freeze([
  { version: "20260623000000", relationState: "canonical", length: 27,
    categories: [
      ["relation", 0, 1], ["columns", 1, 9], ["keys", 9, 11],
      ["constraints", 11, 15], ["rls", 15, 16], ["grants", 16, 19],
      ["policy", 19, 20], ["indexes", 20, 22], ["comments", 22, 27]
    ]
  },
  { version: "20260624000000", relationState: "canonical", length: 4,
    categories: [
      ["relation", 0, 1], ["columns", 1, 2],
      ["constraints", 2, 3], ["comments", 3, 4]
    ]
  },
  { version: "20260705000000", relationState: "canonical", length: 31,
    categories: [
      ["relation", 0, 1], ["columns", 1, 11], ["keys", 11, 13],
      ["constraints", 13, 18], ["rls", 18, 19], ["grants", 19, 22],
      ["policy", 22, 23], ["indexes", 23, 25], ["comments", 25, 31]
    ]
  },
  { version: "20260706073204", relationState: "not-applicable", length: 22,
    categories: [["canonical_default_privileges", 0, 22]]
  }
].map(freezeManifest));

const CATEGORY = Object.freeze({ PASS: "pass", FAIL: "fail", UNVERIFIABLE: "unverifiable" });
const OVERALL = Object.freeze({
  EQUIVALENT: "canonical-effect-equivalent", ABSENT: "absent", PARTIAL: "partial",
  CONFLICTING: "conflicting", UNVERIFIABLE: "unverifiable"
});
const GATE = Object.freeze({ PASS: "pass", FAIL: "fail", NOT_EVALUATED: "not-evaluated" });
const EXECUTION = Object.freeze({
  COMPLETE: "strict-source-equivalence-complete", BEFORE_REMOTE: "blocked-before-remote",
  REMOTE_FAILED: "blocked-remote-read-failed", OUTPUT_INVALID: "blocked-sanitized-output-invalid",
  UNKNOWN_CHANGED: "blocked-unknown-remote-count-changed", UNVERIFIABLE: "blocked-unverifiable"
});
const ABORT = Object.freeze({
  NONE: "not-triggered", APPROVAL: "triggered-approval-gate", BASE: "triggered-base-ref-mismatch",
  CANDIDATE: "triggered-candidate-identity-mismatch", TARGET: "triggered-target-identity-mismatch",
  CLI: "triggered-cli-version-mismatch", LINKED_METADATA: "triggered-linked-metadata-mismatch",
  LINKED_TARGET: "triggered-linked-target-mismatch",
  LOCAL_CONTRACT: "triggered-local-contract-failed", REMOTE_FAILED: "triggered-remote-read-failed",
  OUTPUT_INVALID: "triggered-sanitized-output-invalid", UNKNOWN_CHANGED: "triggered-unknown-remote-count-changed",
  UNVERIFIABLE: "triggered-unverifiable"
});
const GATES = Object.freeze([
  ["approval-gate", "approval_gate_status", ABORT.APPROVAL], ["base-ref", "reviewed_base_status", ABORT.BASE],
  ["candidate-identity", "candidate_identity_status", ABORT.CANDIDATE], ["target-identity", "target_binding_status", ABORT.TARGET],
  ["cli-version", "cli_version_status", ABORT.CLI], ["linked-metadata", "linked_metadata_status", ABORT.LINKED_METADATA],
  ["linked-target", "linked_target_status", ABORT.LINKED_TARGET],
  ["local-contract", "local_contract_status", ABORT.LOCAL_CONTRACT]
].map((gate) => Object.freeze(gate)));
const RELATION_STATES = new Set(
  ["canonical", "absent", "incompatible", "not-applicable", "unverifiable"]);
const CONFLICT_STATES = new Set(["clear", "conflict", "unverifiable"]);
const SQL_KEYS = Object.freeze([
  "strict_source_equivalence_matrix", "canonical_effect_equivalent_count",
  "absent_count", "partial_count",
  "conflicting_count", "unverifiable_count", "unknown_remote_migration_count"
]);
const COUNT_FIELDS = Object.freeze([
  [OVERALL.EQUIVALENT, "canonical_effect_equivalent_count"], [OVERALL.ABSENT, "absent_count"],
  [OVERALL.PARTIAL, "partial_count"], [OVERALL.CONFLICTING, "conflicting_count"],
  [OVERALL.UNVERIFIABLE, "unverifiable_count"]
].map((entry) => Object.freeze(entry)));
const UNCHECKED_SCOPE = "repair-apply-and-later-not-run";
const REMOTE_BLOCKS = Object.freeze({
  remoteFailed: [EXECUTION.REMOTE_FAILED, GATE.NOT_EVALUATED, ABORT.REMOTE_FAILED],
  outputInvalid: [EXECUTION.OUTPUT_INVALID, GATE.FAIL, ABORT.OUTPUT_INVALID],
  unknownChanged: [EXECUTION.UNKNOWN_CHANGED, GATE.FAIL, ABORT.UNKNOWN_CHANGED],
  unverifiable: [EXECUTION.UNVERIFIABLE, GATE.PASS, ABORT.UNVERIFIABLE]
});

function gateResult(statusAt) {
  return {
    approval_id: APPROVAL_ID,
    ...Object.fromEntries(GATES.map(([, field], index) => [field, statusAt(index)]))
  };
}

function passedGateResult() { return gateResult(() => GATE.PASS); }

export function createBlockedBeforeRemoteResult(gateId) {
  const failedIndex = GATES.findIndex(([id]) => id === gateId);
  if (failedIndex < 0) throw new TypeError("unknown local gate");
  return {
    ...gateResult((index) => index < failedIndex
      ? GATE.PASS
      : index === failedIndex ? GATE.FAIL : GATE.NOT_EVALUATED),
    default_privileges_security_goal_status: GATE.NOT_EVALUATED,
    remote_read_attempt_count: 0,
    remote_mutation_attempt_count: 0,
    migration_repair_attempt_count: 0,
    migration_apply_attempt_count: 0,
    execution_status: EXECUTION.BEFORE_REMOTE,
    sanitized_output_review_status: GATE.NOT_EVALUATED,
    abort_status: GATES[failedIndex][2],
    unchecked_scope_status: UNCHECKED_SCOPE
  };
}

function blockedAfterRemote(kind) {
  const [executionStatus, reviewStatus, abortStatus] = REMOTE_BLOCKS[kind];
  return {
    ...passedGateResult(),
    default_privileges_security_goal_status: "separately-blocked",
    remote_read_attempt_count: 1,
    remote_mutation_attempt_count: 0,
    migration_repair_attempt_count: 0,
    migration_apply_attempt_count: 0,
    execution_status: executionStatus,
    sanitized_output_review_status: reviewStatus,
    abort_status: abortStatus,
    unchecked_scope_status: UNCHECKED_SCOPE
  };
}

function rejectOutput() { throw new Error("invalid sanitized output"); }

function parseMatrixEntry(entry, manifest) {
  if (typeof entry !== "string") rejectOutput();
  const parts = entry.split(":");
  if (parts.length !== 4) rejectOutput();
  const [version, relationState, conflictState, vector] = parts;
  const notApplicable = relationState === "not-applicable";
  if (
    version !== manifest.version
    || !RELATION_STATES.has(relationState)
    || !CONFLICT_STATES.has(conflictState)
    || notApplicable !== (manifest.relationState === "not-applicable")
    || vector.length !== manifest.length
    || !/^[pfu]+$/.test(vector)
  ) rejectOutput();
  return { version, relationState, conflictState, vector, manifest };
}

function hasCanonicalSqlKeys(stdout) {
  const rawKeys = stdout.match(/"(?:\\.|[^"\\])*"(?=\s*:)/g);
  return rawKeys?.length === SQL_KEYS.length
    && rawKeys.every((key, index) => key === JSON.stringify(SQL_KEYS[index]));
}

function parseRemoteRow(stdout) {
  if (typeof stdout !== "string" || !hasCanonicalSqlKeys(stdout)) rejectOutput();
  const parsed = JSON.parse(stdout);
  if (
    !Array.isArray(parsed) || parsed.length !== 1 || parsed[0] === null
    || typeof parsed[0] !== "object" || Array.isArray(parsed[0])
  ) rejectOutput();
  const row = parsed[0];
  // JSON insertion order is a deliberate transient-interface contract, not incidental layout.
  if (Object.keys(row).join("\n") !== SQL_KEYS.join("\n")) rejectOutput();
  if (typeof row.strict_source_equivalence_matrix !== "string") rejectOutput();
  for (const key of SQL_KEYS.slice(1)) {
    if (!Number.isInteger(row[key]) || row[key] < 0) rejectOutput();
  }
  const serializedEntries = row.strict_source_equivalence_matrix.split("|");
  if (serializedEntries.length !== PREDICATE_MANIFEST.length) rejectOutput();
  return {
    row,
    entries: serializedEntries.map((entry, index) =>
      parseMatrixEntry(entry, PREDICATE_MANIFEST[index]))
  };
}

function classifyEntry(entry) {
  const categories = entry.manifest.categories.map(([label, start, end]) => {
    const slice = [...entry.vector.slice(start, end)];
    const status = slice.includes("u")
      ? CATEGORY.UNVERIFIABLE
      : slice.every((value) => value === "p") ? CATEGORY.PASS : CATEGORY.FAIL;
    return { label, status };
  });
  const statuses = categories.map(({ status }) => status);
  const precedenceStatus =
    entry.conflictState === "unverifiable"
      || statuses.includes(CATEGORY.UNVERIFIABLE)
      ? OVERALL.UNVERIFIABLE
      : entry.conflictState === "conflict" ? OVERALL.CONFLICTING : null;
  let overallStatus;
  switch (entry.relationState) {
    case "unverifiable":
      overallStatus = OVERALL.UNVERIFIABLE;
      break;
    case "incompatible":
      overallStatus = precedenceStatus ?? OVERALL.CONFLICTING;
      break;
    case "absent":
      overallStatus = precedenceStatus ?? (
        entry.vector.slice(1).includes("p") ? OVERALL.CONFLICTING : OVERALL.ABSENT
      );
      break;
    case "not-applicable":
      overallStatus = precedenceStatus ?? (
        [...entry.vector].every((value) => value === "f")
          ? OVERALL.ABSENT
          : [...entry.vector].every((value) => value === "p")
            ? OVERALL.EQUIVALENT : OVERALL.PARTIAL
      );
      break;
    case "canonical":
      overallStatus = precedenceStatus ?? (
        statuses.every((status) => status === CATEGORY.PASS)
          ? OVERALL.EQUIVALENT : OVERALL.PARTIAL
      );
      break;
    default:
      rejectOutput();
  }
  return {
    overallStatus,
    sanitized: { version: entry.version, overall_status: overallStatus, categories }
  };
}

function countStatuses(classified) {
  const counts = Object.fromEntries(COUNT_FIELDS.map(([status]) => [status, 0]));
  for (const { overallStatus } of classified) counts[overallStatus] += 1;
  return counts;
}

export function reduceStrictSourceEquivalenceCliResult({ status, timedOut, stdout }) {
  if (status !== 0 || timedOut !== false) return blockedAfterRemote("remoteFailed");
  let parsed;
  try {
    parsed = parseRemoteRow(stdout);
  } catch {
    return blockedAfterRemote("outputInvalid");
  }
  if (parsed.row.unknown_remote_migration_count !== 10) {
    return blockedAfterRemote("unknownChanged");
  }
  const classified = parsed.entries.map(classifyEntry);
  const counts = countStatuses(classified);
  if (COUNT_FIELDS.some(([overallStatus, field]) =>
    parsed.row[field] !== counts[overallStatus])) {
    return blockedAfterRemote("outputInvalid");
  }
  if (counts[OVERALL.UNVERIFIABLE] > 0) {
    return blockedAfterRemote("unverifiable");
  }
  return {
    ...passedGateResult(),
    strict_source_equivalence_matrix: classified.map(({ sanitized }) => sanitized),
    ...Object.fromEntries(COUNT_FIELDS.map(([status, field]) => [field, counts[status]])),
    unknown_remote_migration_count: 10,
    default_privileges_security_goal_status: "separately-blocked",
    remote_read_attempt_count: 1,
    remote_mutation_attempt_count: 0,
    migration_repair_attempt_count: 0,
    migration_apply_attempt_count: 0,
    execution_status: EXECUTION.COMPLETE,
    sanitized_output_review_status: GATE.PASS,
    abort_status: ABORT.NONE,
    unchecked_scope_status: UNCHECKED_SCOPE
  };
}
