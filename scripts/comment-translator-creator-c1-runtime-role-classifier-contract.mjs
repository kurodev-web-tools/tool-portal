import assert from "node:assert/strict";

import {
  classifyRuntimeRoleFacts,
  formatRuntimeRoleClassification,
} from "./comment-translator-creator-c1-runtime-role-classifier.mjs";

const validFacts = {
  required_input_count: 2,
  server_runtime_consumed_role_count: 2,
  publicly_exposable_noncredential_role_count: 1,
  server_secret_role_count: 1,
  client_consumed_role_count: 0,
  ambiguous_role_count: 0,
  constructor_count: 1,
  client_construction_detected: false,
  adapter_boundary_ambiguous: false,
  server_owned: true,
};

const expectedKeys = [
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

function classify(overrides = {}) {
  return classifyRuntimeRoleFacts({ ...validFacts, ...overrides });
}

function assertOnlyAllowedKeys(result) {
  assert.deepEqual(Object.keys(result), expectedKeys);
}

{
  const result = classify({ server_owned: false });
  assert.equal(result.abort_status, "role_count_ownership_mismatch");
  assert.equal(
    result.client_construction_status,
    "single_constructor_not_initialized",
  );
  assert.equal(result.adapter_boundary_status, "unconfirmed");
  assert.equal(
    result.unchecked_scope_status,
    "real_authority_runtime_external_unchecked",
  );
}

{
  const result = classify();

  assertOnlyAllowedKeys(result);
  assert.deepEqual(result, {
    classification_attempt_count: 1,
    required_input_count: 2,
    server_runtime_consumed_role_count: 2,
    publicly_exposable_noncredential_role_count: 1,
    server_secret_role_count: 1,
    client_consumed_role_count: 0,
    ambiguous_role_count: 0,
    client_construction_status: "single_server_owned_constructor",
    adapter_boundary_status: "server_owned_roles_only",
    execution_status: "pass",
    sanitized_output_status: "fixed_fields_only",
    abort_status: "not_aborted",
    rollback_status: "not_required",
    unchecked_scope_status: "real_authority_runtime_external_unchecked",
  });
}

{
  const result = classify({ client_consumed_role_count: 1 });

  assertOnlyAllowedKeys(result);
  assert.equal(result.execution_status, "aborted");
  assert.equal(result.abort_status, "client_consumption");
  assert.equal(result.client_construction_status, "client_exposure_detected");
}

{
  const result = classify({ client_construction_detected: true });

  assert.equal(result.abort_status, "client_consumption");
  assert.equal(result.client_construction_status, "client_exposure_detected");
}

{
  const result = classify({ ambiguous_role_count: 1 });

  assertOnlyAllowedKeys(result);
  assert.equal(result.execution_status, "aborted");
  assert.equal(result.abort_status, "ambiguous_role");
  assert.equal(result.adapter_boundary_status, "ambiguous");
}

{
  const result = classify({ adapter_boundary_ambiguous: true });

  assert.equal(result.abort_status, "ambiguous_role");
  assert.equal(result.adapter_boundary_status, "ambiguous");
}

{
  const result = classify({ required_input_count: 3 });

  assertOnlyAllowedKeys(result);
  assert.equal(result.execution_status, "aborted");
  assert.equal(result.abort_status, "required_count_mismatch");
}

{
  const result = classify({
    required_input_count: "2",
    constructor_count: 0,
    client_consumed_role_count: 1,
  });
  assert.equal(result.abort_status, "invalid_facts");
  assert.equal(result.required_input_count, 0);
}

{
  const result = classify({ server_secret_role_count: "1" });

  assert.equal(result.abort_status, "invalid_facts");
  assert.equal(
    result.client_construction_status,
    "single_constructor_not_initialized",
  );
  assert.equal(result.adapter_boundary_status, "unconfirmed");
}

{
  const result = classify({
    required_input_count: 3,
    constructor_count: 0,
    client_consumed_role_count: 1,
  });
  assert.equal(result.abort_status, "required_count_mismatch");
}

{
  const result = classify({
    constructor_count: 0,
    client_consumed_role_count: 1,
  });
  assert.equal(result.abort_status, "constructor_shape_mismatch");
}

{
  const result = classify({
    client_consumed_role_count: 1,
    ambiguous_role_count: 1,
  });
  assert.equal(result.abort_status, "client_consumption");
}

{
  const result = classify({
    ambiguous_role_count: 1,
    server_secret_role_count: 0,
  });
  assert.equal(result.abort_status, "ambiguous_role");
}

{
  const result = classify({ server_secret_role_count: 0 });
  assert.equal(result.abort_status, "role_count_ownership_mismatch");
}

{
  const result = classify();
  const formatted = formatRuntimeRoleClassification(result);
  const expected = expectedKeys
    .map((key) => `${key}=${result[key]}`)
    .join("\n");

  assert.equal(formatted, expected);
  assert.equal(formatted.includes("{"), false);
  assert.equal(formatted.includes('"'), false);
  assert.deepEqual(
    formatted.split("\n").map((line) => line.slice(0, line.indexOf("="))),
    expectedKeys,
  );
}

console.log("comment_translator_creator_c1_runtime_role_classifier_contract=pass");
