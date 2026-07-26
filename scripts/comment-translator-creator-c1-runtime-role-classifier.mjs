const INPUT_FACT_TYPES = {
  required_input_count: "number",
  server_runtime_consumed_role_count: "number",
  publicly_exposable_noncredential_role_count: "number",
  server_secret_role_count: "number",
  client_consumed_role_count: "number",
  ambiguous_role_count: "number",
  constructor_count: "number",
  client_construction_detected: "boolean",
  adapter_boundary_ambiguous: "boolean",
  server_owned: "boolean",
};

const OUTPUT_KEYS = [
  "classification_attempt_count",
  "required_input_count",
  "server_runtime_consumed_role_count",
  "publicly_exposable_noncredential_role_count",
  "server_secret_role_count",
  "client_consumed_role_count",
  "ambiguous_role_count",
  "client_construction_status",
  "adapter_boundary_status",
  "execution_status",
  "sanitized_output_status",
  "abort_status",
  "rollback_status",
  "unchecked_scope_status",
];

function isNonnegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function factsAreValid(facts) {
  if (facts === null || typeof facts !== "object" || Array.isArray(facts)) {
    return false;
  }

  const inputKeys = Object.keys(INPUT_FACT_TYPES);
  const factKeys = Object.keys(facts);
  if (
    factKeys.length !== inputKeys.length ||
    factKeys.some((key) => !(key in INPUT_FACT_TYPES))
  ) {
    return false;
  }

  return inputKeys.every((key) => {
    const expectedType = INPUT_FACT_TYPES[key];
    const value = facts[key];
    return expectedType === "boolean"
      ? typeof value === "boolean"
      : typeof value === "number" && isNonnegativeInteger(value);
  });
}

function sanitizedCount(facts, key) {
  const value = facts?.[key];
  return isNonnegativeInteger(value) ? value : 0;
}

function determineAbortStatus(facts, valid) {
  if (!valid) {
    return "invalid_facts";
  }
  if (facts.required_input_count !== 2) {
    return "required_count_mismatch";
  }
  if (facts.constructor_count !== 1) {
    return "constructor_shape_mismatch";
  }
  if (
    facts.client_consumed_role_count !== 0 ||
    facts.client_construction_detected
  ) {
    return "client_consumption";
  }
  if (facts.ambiguous_role_count !== 0 || facts.adapter_boundary_ambiguous) {
    return "ambiguous_role";
  }
  if (
    !facts.server_owned ||
    facts.server_runtime_consumed_role_count !== 2 ||
    facts.publicly_exposable_noncredential_role_count !== 1 ||
    facts.server_secret_role_count !== 1 ||
    facts.publicly_exposable_noncredential_role_count +
      facts.server_secret_role_count !==
      facts.server_runtime_consumed_role_count
  ) {
    return "role_count_ownership_mismatch";
  }
  return "not_aborted";
}

export function classifyRuntimeRoleFacts(facts) {
  const valid = factsAreValid(facts);
  const abortStatus = determineAbortStatus(facts, valid);
  const aborted = abortStatus !== "not_aborted";
  const ambiguous =
    valid &&
    (facts.ambiguous_role_count !== 0 || facts.adapter_boundary_ambiguous);
  let clientConstructionStatus = "single_constructor_not_initialized";

  if (abortStatus === "client_consumption") {
    clientConstructionStatus = "client_exposure_detected";
  } else if (abortStatus === "constructor_shape_mismatch") {
    clientConstructionStatus = "constructor_shape_mismatch";
  } else if (abortStatus === "not_aborted") {
    clientConstructionStatus = "single_server_owned_constructor";
  }

  return {
    classification_attempt_count: 1,
    required_input_count: sanitizedCount(facts, "required_input_count"),
    server_runtime_consumed_role_count: sanitizedCount(
      facts,
      "server_runtime_consumed_role_count",
    ),
    publicly_exposable_noncredential_role_count: sanitizedCount(
      facts,
      "publicly_exposable_noncredential_role_count",
    ),
    server_secret_role_count: sanitizedCount(facts, "server_secret_role_count"),
    client_consumed_role_count: sanitizedCount(
      facts,
      "client_consumed_role_count",
    ),
    ambiguous_role_count: sanitizedCount(facts, "ambiguous_role_count"),
    client_construction_status: clientConstructionStatus,
    adapter_boundary_status: ambiguous
      ? "ambiguous"
      : aborted
        ? "unconfirmed"
        : "server_owned_roles_only",
    execution_status: aborted ? "aborted" : "pass",
    sanitized_output_status: "fixed_fields_only",
    abort_status: abortStatus,
    rollback_status: aborted ? "no_changes_applied" : "not_required",
    unchecked_scope_status: "real_authority_runtime_external_unchecked",
  };
}

export function formatRuntimeRoleClassification(classification) {
  return OUTPUT_KEYS.map((key) => `${key}=${classification[key]}`).join("\n");
}
