import assert from "node:assert/strict";
import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// allow: SIZE_OK - this executable is the single comprehensive CP1 authority ledger.
const root = process.cwd();
const readinessPath = "docs/active/COMMENT_TRANSLATOR_CREATOR_PAID_LAUNCH_READINESS_PREFLIGHT.md";
const externalEvidenceReconciliationPath =
  "docs/active/COMMENT_TRANSLATOR_CREATOR_PAID_CP1_EXTERNAL_EVIDENCE_RECONCILIATION_PREFLIGHT.md";
const boardPath = "docs/active/COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_TASK_BOARD.md";
const taskPath = "task.md";
const integrationBase = "097f369a47564b7a44d211c212580f993eddc71b";
const c1FailClosedReadFollowupBase =
  "09ada36691185be9775940ce653952901bfc64d8";
const c1RuntimeRoleClassificationFollowupBase =
  "dd698bf093615c1741e25b73b37761a68804c45b";
const c1AdapterReadConsumerBase =
  "945efbcb5bf8053288bf4a8326ff3e21e00d116f";
const c1EphemeralEntitlementBridgeBase =
  "b4409937b4ef637f3218c6d24e45a32ef20920ce";
const c1ProductionConstructorCompatibilityBase =
  "2888bb1a60fdd6851688e3e7b323a40b3c21869c";
const c1ProcessIsolationDecisionBase =
  "340d6b0ec719e1e871205a03d48cda295f07068b";
const c1ProcessIsolationDecisionHead =
  "60b0ec43f8fa4722b2830e8f99535348146e46f4";
const c1ZeroizableClientApiHead =
  "e1f48e0cd6d0eeb94e4546b5c2d5c20487354e61";
const c1ZeroizableClientApiMerge =
  "3ec35af019576bf199d8893c5fd856c87575d103";
const c1EphemeralRunnerWrapperSha256 =
  "f79a7f1777e9d412bbaaffefd0c0535101a6652bd6b13cb90174cdc1a23e2a2d";
const c1EphemeralRunnerSha256 =
  "e31c058284296853b1a5b71d3b113cadca35a82741825deac3aa48d254a9ab61";
const c1EphemeralRunnerContractSha256 =
  "c1d083365f2b23189449f203e12ab19ce7874d90c719305d6f66b5060e4fae23";
const c1MigrationIdentitySha256 =
  "c124851854a4f914e9c1ddb92016684a8fb77ebdc2d55ac8bc6684a389ce2877";
const referencePresenceEndpointBase =
  "19eaa0fe0d52c4563ae1957d994c679d0b4bd0dc";
const c12Head = "e93bfb77dc2017fd4a15e99e075f7e419c14a94d";
const c1ProductionConstructorCompatibilityContractPath = path.join(
  root,
  "scripts/comment-translator-creator-c1-production-constructor-compatibility-contract.mjs",
);
const c1ProcessIsolationPreflightContractPath = path.join(
  root,
  "scripts/comment-translator-creator-c1-process-isolation-preflight-contract.mjs",
);
const c1ZeroizableClientBoundaryPreflightContractPath = path.join(
  root,
  "scripts/comment-translator-creator-c1-zeroizable-client-boundary-preflight-contract.mjs",
);
const c1ZeroizableClientApiPreflightContractPath = path.join(
  root,
  "scripts/comment-translator-creator-c1-zeroizable-client-api-preflight-contract.mjs",
);
const c1ZeroizableClientCandidateSourcePreflightContractPath = path.join(
  root,
  "scripts/comment-translator-creator-c1-zeroizable-client-candidate-source-preflight-contract.mjs",
);
const c1ZeroizableClientCandidateSourcePreflightPath = path.join(
  root,
  "scripts/comment-translator-creator-c1-zeroizable-client-candidate-source-preflight.mjs",
);
const c1GuaranteeGovernanceDecisionContractPath = path.join(
  root,
  "scripts/comment-translator-creator-c1-guarantee-governance-decision-preflight-contract.mjs",
);
const c1ProductionSourceProcurementContractPath = path.join(
  root,
  "scripts/comment-translator-creator-c1-production-source-procurement-preflight-contract.mjs",
);

const expectedLanes = new Map([
  ["LOCAL-DETERMINISTIC", "locally-verified"],
  ["REFERENCE-PRESENCE", "approval-gated"],
  ["REMOTE-DEPLOYED", "approval-gated"],
  ["AUTHENTICATED-BROWSER", "approval-gated"],
  ["RELEASE-OWNER", "approval-gated"],
]);

execFileSync(process.execPath, [c1ProductionConstructorCompatibilityContractPath], {
  cwd: root,
  stdio: "pipe",
});
execFileSync(process.execPath, [c1ProcessIsolationPreflightContractPath], {
  cwd: root,
  stdio: "pipe",
});
execFileSync(process.execPath, [c1ZeroizableClientBoundaryPreflightContractPath], {
  cwd: root,
  stdio: "pipe",
});
execFileSync(process.execPath, [c1ZeroizableClientApiPreflightContractPath], {
  cwd: root,
  stdio: "pipe",
});
execFileSync(
  process.execPath,
  [c1ZeroizableClientCandidateSourcePreflightContractPath],
  {
    cwd: root,
    stdio: "pipe",
  },
);
execFileSync(process.execPath, [c1GuaranteeGovernanceDecisionContractPath], {
  cwd: root,
  stdio: "pipe",
});
execFileSync(process.execPath, [c1ProductionSourceProcurementContractPath], {
  cwd: root,
  stdio: "pipe",
});
const c1ZeroizableClientCandidateSourceOutput = execFileSync(
  process.execPath,
  [c1ZeroizableClientCandidateSourcePreflightPath],
  {
    cwd: root,
    encoding: "utf8",
  },
).trim();

const expectedStages = new Map([
  ["CP1-S0", "locally-verified"],
  ["CP1-S1", "approval-gated"],
  ["CP1-S2", "approval-gated"],
  ["CP1-S3", "approval-gated"],
  ["CP1-S4", "approval-gated"],
  ["CP1-S5", "approval-gated"],
  ["CP1-S6", "approval-gated"],
  ["CP1-S7", "approval-gated"],
  ["CP1-S8", "approval-gated"],
  ["CP1-S9", "approval-gated"],
  ["CP1-S10", "approval-gated"],
]);

const requiredApprovalUnits = [
  "CP1-A-TARGET-DISCOVERY-C1-PREVIEW",
  "CP1-A-TARGET-MAP-C1-SOLE-ACTIVE",
  "CP1-A-MIG-C1",
  "CP1-A-MIG-C3",
  "CP1-A-MIG-C5",
  "CP1-A-MIG-C6",
  "CP1-A-MIG-C7",
  "CP1-A-MIG-C8",
  "CP1-A-MIG-C9",
  "CP1-A-MIG-C11",
  "CP1-A-STORE-READINESS",
  "CP1-A-STORE-READINESS-C1-FAIL-CLOSED-READ",
  "CP1-A-C1-ADAPTER-RUNTIME-DISCOVERY",
  "CP1-A-C1-ADAPTER-RUNTIME-ROLE-CLASSIFICATION-HARNESS",
  "CP1-A-C1-ADAPTER-RUNTIME-ROLE-CLASSIFICATION-HARNESS-FACTORY-HANDOFF",
  "CP1-A-C1-ADAPTER-RUNTIME-ROLE-AWARE-SOURCE-DISCOVERY",
  "CP1-A-C1-ADAPTER-RUNTIME-ROLE-SAME-PROCESS-EPHEMERAL-PROVISIONING",
  "CP1-A-C1-ADAPTER-RUNTIME-ROLE-OPAQUE-EPHEMERAL-RUNNER-PROVISIONING",
  "CP1-A-C1-ADAPTER-RUNTIME-ROLE-OPAQUE-EPHEMERAL-RUNNER-PROVISIONING-RETRY-1",
  "CP1-A-C1-OPAQUE-EPHEMERAL-RUNNER-STOP-NO-EXECUTION-SEAM",
  "CP1-A-C1-OPAQUE-RUNNER-STOP-RESULT-STATIC-DIAGNOSIS",
  "CP1-A-C1-OPAQUE-RUNNER-CONTRACT-EXPECTATION-REMEDIATION-DESIGN",
  "CP1-A-C1-OPAQUE-RUNNER-CONTRACT-EXPECTATION-REMEDIATION-IMPLEMENTATION",
  "CP1-A-C1-OPAQUE-RUNNER-CONTRACT-REMEDIATION-FIXTURE-RESULT-DIAGNOSIS",
  "CP1-A-C1-OPAQUE-RUNNER-CONTRACT-REMEDIATION-FIXTURE-IDENTITY-DESIGN",
  "CP1-A-C1-OPAQUE-RUNNER-CONTRACT-REMEDIATION-FIXTURE-IDENTITY-DESIGN-RETRY-1",
  "CP1-A-C1-OPAQUE-RUNNER-GOAL-BOUND-HASH-FIRST-ARTIFACT-BINDING-AND-FIXTURE-IDENTITY-DESIGN",
  "CP1-A-C1-OPAQUE-RUNNER-GOAL-BOUND-HASH-FIRST-ARTIFACT-BINDING-AND-FIXTURE-IDENTITY-DESIGN-RETRY-1",
  "CP1-A-C1-OPAQUE-RUNNER-GOAL-BOUND-HASH-FIRST-ARTIFACT-BINDING-AND-FIXTURE-IDENTITY-DESIGN-RETRY-2",
  "CP1-A-C1-OPAQUE-RUNNER-GOAL-BOUND-HASH-FIRST-ARTIFACT-BINDING-AND-FIXTURE-IDENTITY-DESIGN-RETRY-3",
  "CP1-A-C1-OPAQUE-RUNNER-GOAL-BOUND-HASH-FIRST-ARTIFACT-BINDING-AND-FIXTURE-IDENTITY-DESIGN-RETRY-4",
  "CP1-A-C1-OPAQUE-RUNNER-GOAL-BOUND-HISTORICAL-BLOB-BINDING-AND-FIXTURE-IDENTITY-DESIGN-RETRY-5",
  "CP1-A-C1-OPAQUE-RUNNER-GOAL-BOUND-ORIGINAL-UNTRACKED-ARTIFACT-RECOVERY-AND-FIXTURE-IDENTITY-DESIGN-RETRY-6",
  "CP1-A-C1-OPAQUE-RUNNER-GOAL-BOUND-STRUCTURE-REDUCER-AND-FIXTURE-IDENTITY-DESIGN-RETRY-7",
  "CP1-A-C1-OPAQUE-RUNNER-GOAL-BOUND-ASSERT-MATCH-ARGUMENT-REDUCER-AND-FIXTURE-IDENTITY-DESIGN-RETRY-8",
  "CP1-A-C1-OPAQUE-RUNNER-GOAL-BOUND-ORDERED-REGEX-WINDOW-AND-FIXTURE-IDENTITY-DESIGN-RETRY-9",
  "CP1-A-C1-OPAQUE-RUNNER-GOAL-BOUND-ORDERED-REGEX-WINDOW-AND-FIXTURE-IDENTITY-DESIGN-RETRY-10",
  "CP1-A-C1-OPAQUE-RUNNER-GOAL-BOUND-RUNTIME-ORDINAL-AND-HASH-MIN-STATIC-INVARIANT-FIXTURE-IDENTITY-DESIGN",
  "CP1-A-C1-OPAQUE-RUNNER-MERGED-ARTIFACT-LOCAL-VERIFICATION-CLOSEOUT",
  "CP1-A-STORE-WRITE-READ",
  "CP1-A-STRIPE-PRODUCT-PRICE",
  "CP1-A-STRIPE-CHECKOUT",
  "CP1-A-STRIPE-PORTAL",
  "CP1-A-STRIPE-WEBHOOK",
  "CP1-A-ENTITLEMENT-STATES",
  "CP1-A-USAGE-RESET-LIMIT",
  "CP1-A-PROVIDER-OPENAI",
  "CP1-A-PROVIDER-AZURE",
  "CP1-A-DICTIONARY-PROVIDER",
  "CP1-A-OBS-CAPABILITY",
  "CP1-A-MODERATOR-CAPABILITY",
  "CP1-A-HISTORY-RETENTION",
  "CP1-A-OAUTH-CLEANUP",
  "CP1-A-ACCOUNT-CLEANUP",
  "CP1-A-BROWSER-QA",
  "CP1-A-DEPLOY",
  "CP1-A-CP2",
  "CP1-A-PROMOTE-MAIN",
  "CP1-A-PUBLIC-PAID-LAUNCH",
];

const requiredBrowserSurfaces = [
  "CREATOR-SURFACE",
  "OBS-OVERLAY",
  "MODERATOR-VIEW",
  "DICTIONARY",
  "HISTORY",
  "PRIORITY-DELETED-SOURCE",
];

const expectedRuntimeRoleOutputKeys = [
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

const expectedSameProcessProvisioningOutputKeys = [
  "provisioning_attempt_count",
  "required_input_count",
  "endpoint_role_injected_count",
  "server_secret_role_injected_count",
  "eligible_same_process_source_count",
  "process_retention_status",
  "persistence_status",
  "client_construction_status",
  "adapter_invocation_status",
  "execution_status",
  "sanitized_output_review_status",
  "abort_status",
  "rollback_status",
  "unchecked_scope_status",
];

const expectedOpaqueRunnerProvisioningOutputKeys = [
  "runner_control_action_count",
  "required_input_count",
  "endpoint_role_injected_count",
  "server_secret_role_injected_count",
  "eligible_same_process_source_count",
  "process_retention_status",
  "persistence_status",
  "client_construction_status",
  "adapter_invocation_status",
  "execution_status",
  "sanitized_output_review_status",
  "abort_status",
  "rollback_status",
  "unchecked_scope_status",
];

const expectedHeldRunnerStopOutputKeys = [
  "runner_stop_action_count",
  "required_input_count",
  "input_presence_status",
  "process_retention_status",
  "persistence_status",
  "client_construction_status",
  "adapter_invocation_status",
  "remote_read_status",
  "termination_status",
  "execution_status",
  "sanitized_output_review_status",
  "abort_status",
  "rollback_status",
  "unchecked_scope_status",
];

const expectedRunnerStopStaticDiagnosisOutputKeys = [
  "static_diagnosis_attempt_count",
  "artifact_hash_match_count",
  "runner_control_action_count",
  "wrapper_stop_output_field_count",
  "termination_field_count",
  "allowed_termination_value_count",
  "exit_status_binding_count",
  "contract_expectation_count",
  "prior_sanitizer_assumption_status",
  "diagnosis_classification",
  "execution_status",
  "sanitized_output_review_status",
  "abort_status",
  "unchecked_scope_status",
];

const expectedRunnerContractRemediationDesignOutputKeys = [
  "design_attempt_count",
  "artifact_hash_match_count",
  "runner_control_action_count",
  "fixed_wrapper_expectation_count",
  "mismatched_expectation_count",
  "proposed_contract_edit_count",
  "synthetic_fixture_count",
  "live_control_reachability_status",
  "artifact_change_status",
  "contract_execution_status",
  "execution_status",
  "sanitized_output_review_status",
  "abort_status",
  "unchecked_scope_status",
];

const expectedRunnerContractRemediationImplementationOutputKeys = [
  "implementation_attempt_count",
  "pre_artifact_hash_match_count",
  "changed_artifact_count",
  "contract_expectation_edit_count",
  "synthetic_fixture_count",
  "synthetic_fixture_pass_count",
  "node_syntax_check_status",
  "contract_entrypoint_execution_status",
  "live_control_reachability_status",
  "execution_status",
  "sanitized_output_review_status",
  "abort_status",
  "rollback_status",
  "unchecked_scope_status",
];

const expectedRunnerContractRemediationFixtureDiagnosisOutputKeys = [
  "diagnosis_attempt_count",
  "artifact_hash_match_count",
  "runner_control_action_count",
  "positive_fixture_execution_count",
  "positive_fixture_pass_count",
  "negative_fixture_execution_count",
  "negative_fixture_rejection_count",
  "fixture_mismatch_classification",
  "artifact_change_status",
  "contract_entrypoint_execution_status",
  "execution_status",
  "sanitized_output_review_status",
  "abort_status",
  "unchecked_scope_status",
];

const expectedRunnerContractRemediationFixtureIdentityDesignOutputKeys = [
  "design_attempt_count",
  "artifact_hash_match_count",
  "runner_control_action_count",
  "remediated_expectation_ordinal",
  "negative_fixture_transform_count",
  "negative_fixture_sha256",
  "fixture_pair_identity_sha256",
  "fixture_pair_uniqueness_status",
  "verifier_execution_status",
  "artifact_change_status",
  "execution_status",
  "sanitized_output_review_status",
  "abort_status",
  "unchecked_scope_status",
];

const expectedExplicitArtifactPathBindingDesignOutputKeys = [
  "design_attempt_count",
  "artifact_access_count",
  "nested_command_execution_count",
  "runner_control_action_count",
  "artifact_role_count",
  "binding_contract_status",
  "path_source_policy",
  "sanitized_exit_contract_status",
  "proposed_driver_design_count",
  "persistent_change_status",
  "execution_status",
  "sanitized_output_review_status",
  "abort_status",
  "unchecked_scope_status",
];

const expectedRepositoryLocalArtifactPathResolutionOutputKeys = [
  "path_resolution_attempt_count",
  "tracked_scripts_path_enumeration_count",
  "nested_command_execution_count",
  "artifact_content_read_count",
  "artifact_hash_match_count",
  "runner_control_action_count",
  "artifact_role_candidate_count",
  "artifact_role_binding_status",
  "path_output_status",
  "persistent_change_status",
  "execution_status",
  "sanitized_output_review_status",
  "abort_status",
  "unchecked_scope_status",
];

const expectedArtifactPathFilenamePredicateDiagnosisOutputKeys = [
  "diagnosis_attempt_count",
  "tracked_scripts_path_enumeration_count",
  "nested_command_execution_count",
  "artifact_content_hash_access_count",
  "runner_control_action_count",
  "wrapper_predicate_candidate_count",
  "runner_predicate_candidate_count",
  "contract_predicate_candidate_count",
  "failure_classification",
  "persistent_change_status",
  "execution_status",
  "sanitized_output_review_status",
  "abort_status",
  "unchecked_scope_status",
];

const expectedLocalDriverPipelineSyntheticPreflightOutputKeys = [
  "pipeline_preflight_attempt_count",
  "artifact_access_count",
  "nested_tool_execution_count",
  "runner_control_action_count",
  "synthetic_fixture_count",
  "synthetic_fixture_pass_count",
  "encoding_validation_status",
  "decoding_validation_status",
  "single_envelope_reduction_status",
  "fixed14_validation_status",
  "execution_status",
  "sanitized_output_review_status",
  "abort_status",
  "unchecked_scope_status",
];

const expectedLocalDriverArtifactReadCommandDiagnosisOutputKeys = [
  "diagnosis_attempt_count",
  "artifact_access_count",
  "nested_command_execution_count",
  "runner_control_action_count",
  "command_construction_locus_count",
  "path_resolution_locus_count",
  "sanitized_exit_handling_locus_count",
  "failure_classification",
  "proposed_remediation_count",
  "persistent_change_status",
  "execution_status",
  "sanitized_output_review_status",
  "abort_status",
  "unchecked_scope_status",
];

const expectedLocalDriverCommandConstructionSyntheticDesignOutputKeys = [
  "design_attempt_count",
  "artifact_access_count",
  "nested_command_execution_count",
  "runner_control_action_count",
  "synthetic_placeholder_count",
  "static_tokenization_validation_status",
  "path_binding_strategy",
  "sanitized_exit_contract_status",
  "proposed_driver_design_count",
  "persistent_change_status",
  "execution_status",
  "sanitized_output_review_status",
  "abort_status",
  "unchecked_scope_status",
];

const expectedLocalDriverCommandConstructionSyntheticExecutionPreflightOutputKeys = [
  "preflight_attempt_count",
  "artifact_access_count",
  "nested_command_execution_count",
  "runner_control_action_count",
  "synthetic_argument_count",
  "synthetic_argument_binding_status",
  "shell_execution_status",
  "single_envelope_reduction_status",
  "sanitized_payload_validation_status",
  "persistent_change_status",
  "execution_status",
  "sanitized_output_review_status",
  "abort_status",
  "unchecked_scope_status",
];

const requiredStatusLabels = [
  "cp1_local_readiness_status=complete",
  "creator_public_paid_launch_readiness_status=blocked-approval-gated",
  `cp1_integration_base=${integrationBase}`,
  `cp1_c1_fail_closed_read_followup_base=${c1FailClosedReadFollowupBase}`,
  `cp1_c1_runtime_role_classification_followup_base=${c1RuntimeRoleClassificationFollowupBase}`,
  `cp1_c1_migration_identity_sha256=${c1MigrationIdentitySha256}`,
  "cp1_c1_target_discovery_approval_status=consumed",
  "cp1_c1_target_discovery_execution_status=blocked-zero-candidate",
  "cp1_c1_target_mapping_status=resolved-operator-confirmed-sole-active",
  "cp1_c1_sole_active_mapping_approval_status=consumed",
  "cp1_c1_sole_active_mapping_execution_status=pass",
  "cp1_c1_migration_approval_status=consumed",
  "cp1_c1_migration_execution_status=pass",
  "cp1_c1_fail_closed_read_approval_status=consumed",
  "cp1_c1_fail_closed_read_execution_status=blocked-adapter-execution-unavailable",
  "cp1_c1_runtime_role_classification_approval_status=consumed",
  "cp1_c1_runtime_role_classification_execution_status=aborted-required-count-mismatch",
  "cp1_c1_runtime_role_factory_handoff_classification_approval_status=consumed",
  "cp1_c1_runtime_role_factory_handoff_classification_execution_status=pass",
  "cp1_c1_runtime_role_aware_source_discovery_approval_status=consumed",
  "cp1_c1_runtime_role_aware_source_discovery_execution_status=aborted-role-incomplete",
  "cp1_c1_same_process_ephemeral_provisioning_approval_status=consumed",
  "cp1_c1_same_process_ephemeral_provisioning_execution_status=blocked-private-runner-action-handle-unavailable",
  "cp1_c1_opaque_runner_handle_preflight_status=verified-local-read-only",
  "cp1_c1_opaque_runner_provisioning_approval_status=consumed",
  "cp1_c1_opaque_runner_provisioning_execution_status=aborted-operator-input-separation-mismatch",
  "cp1_c1_opaque_runner_retry_1_approval_status=consumed",
  "cp1_c1_opaque_runner_retry_1_execution_status=pass",
  "cp1_c1_held_runner_execution_seam_status=blocked-control-action-unavailable",
  "cp1_c1_held_runner_stop_approval_status=consumed",
  "cp1_c1_held_runner_stop_execution_status=aborted-sanitized-termination-unconfirmed",
  "cp1_c1_stop_result_static_diagnosis_approval_status=consumed",
  "cp1_c1_stop_result_static_diagnosis_execution_status=pass",
  "cp1_c1_runner_contract_remediation_design_approval_status=consumed",
  "cp1_c1_runner_contract_remediation_design_execution_status=pass",
  "cp1_c1_runner_contract_remediation_implementation_approval_status=consumed",
  "cp1_c1_runner_contract_remediation_implementation_execution_status=aborted-synthetic-fixture-result-mismatch",
  "cp1_c1_runner_fixture_result_diagnosis_approval_status=consumed",
  "cp1_c1_runner_fixture_result_diagnosis_execution_status=aborted-fixture-identity-ambiguous",
  "cp1_c1_runner_fixture_identity_design_approval_status=consumed",
  "cp1_c1_runner_fixture_identity_design_execution_status=aborted-local-design-script-parse-failure",
  "cp1_c1_runner_fixture_identity_design_retry_1_approval_status=consumed",
  "cp1_c1_runner_fixture_identity_design_retry_1_execution_status=aborted-result-envelope-not-reduced",
  "cp1_c1_local_driver_result_envelope_diagnosis_approval_status=consumed",
  "cp1_c1_local_driver_result_envelope_diagnosis_execution_status=pass",
  "cp1_c1_local_driver_reducer_remediation_approval_status=consumed",
  "cp1_c1_local_driver_reducer_remediation_execution_status=pass",
  "cp1_c1_runner_fixture_identity_design_retry_2_approval_status=consumed",
  "cp1_c1_runner_fixture_identity_design_retry_2_execution_status=aborted-local-encoding-failure",
  "cp1_c1_local_driver_pipeline_preflight_approval_status=consumed",
  "cp1_c1_local_driver_pipeline_preflight_execution_status=pass",
  "cp1_c1_runner_fixture_identity_design_retry_3_approval_status=consumed",
  "cp1_c1_runner_fixture_identity_design_retry_3_execution_status=aborted-artifact-read-command-failure",
  "cp1_c1_local_driver_artifact_read_command_diagnosis_approval_status=consumed",
  "cp1_c1_local_driver_artifact_read_command_diagnosis_execution_status=aborted-static-locus-ambiguous",
  "cp1_c1_local_driver_command_construction_synthetic_design_approval_status=consumed",
  "cp1_c1_local_driver_command_construction_synthetic_design_execution_status=pass",
  "cp1_c1_local_driver_command_construction_synthetic_execution_preflight_approval_status=consumed",
  "cp1_c1_local_driver_command_construction_synthetic_execution_preflight_execution_status=pass",
  "cp1_c1_runner_fixture_identity_design_retry_4_approval_status=consumed",
  "cp1_c1_runner_fixture_identity_design_retry_4_execution_status=aborted-explicit-artifact-path-binding-unavailable",
  "cp1_c1_explicit_artifact_path_binding_design_approval_status=consumed",
  "cp1_c1_explicit_artifact_path_binding_design_execution_status=pass",
  "cp1_c1_runner_fixture_identity_design_retry_5_approval_status=consumed",
  "cp1_c1_runner_fixture_identity_design_retry_5_execution_status=aborted-private-path-input-absent",
  "cp1_c1_repository_local_artifact_path_resolution_approval_status=consumed",
  "cp1_c1_repository_local_artifact_path_resolution_execution_status=aborted-artifact-role-candidate-ambiguity",
  "cp1_c1_artifact_path_filename_predicate_diagnosis_approval_status=consumed",
  "cp1_c1_artifact_path_filename_predicate_diagnosis_execution_status=pass",
  "cp1_c1_goal_bound_hash_first_fixture_identity_approval_status=consumed",
  "cp1_c1_goal_bound_hash_first_fixture_identity_execution_status=aborted-local-driver-script-parse-failure",
  "cp1_c1_goal_bound_hash_first_fixture_identity_retry_1_approval_status=consumed",
  "cp1_c1_goal_bound_hash_first_fixture_identity_retry_1_execution_status=aborted-driver-syntax-preflight-failure",
  "cp1_c1_goal_bound_hash_first_fixture_identity_retry_2_approval_status=consumed",
  "cp1_c1_goal_bound_hash_first_fixture_identity_retry_2_execution_status=aborted-nested-command-failure",
  "cp1_c1_goal_bound_hash_first_fixture_identity_retry_3_approval_status=consumed",
  "cp1_c1_goal_bound_hash_first_fixture_identity_retry_3_execution_status=aborted-artifact-hash-binding-failure",
  "cp1_c12_containment_status=verified",
  "cp1_new_public_api_status=preview-readiness-route-source-approved",
  `cp1_reference_presence_endpoint_base=${referencePresenceEndpointBase}`,
  "cp1_reference_presence_endpoint_status=source-only-not-deployed",
  "cp1_c3_entitlement_sync_execution_mode=trigger-internal-no-direct-service-role-grant",
  "cp1_c3_usage_apply_execution_mode=direct-service-role-execute",
  "cp1_c3_remote_trigger_binding_status=confirmed",
  "cp1_c3_remote_client_execute_revoke_status=confirmed",
  "cp1_cloudflare_change_status=not-run",
  "cp1_remote_mutation_status=not-run-approval-gated",
  "cp1_stripe_action_status=not-run-approval-gated",
  "cp1_provider_live_status=not-run-approval-gated",
  "cp1_authenticated_browser_qa_status=not-run-approval-gated",
  "cp1_width_qa_status=planned-not-run-approval-gated",
  "cp1_dependency_install_status=not-run-not-approved",
  "cp1_runtime_ui_change_status=not-required",
  "cp1_cp2_status=not-run-approval-gated",
  "cp1_public_paid_launch_status=not-run-approval-gated",
];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function parseStatusTable(source, idPattern) {
  const rows = new Map();
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(
      new RegExp(
        `^\\|\\s*(${idPattern})\\s*\\|[^|]+\\|\\s*(locally-verified|approval-gated)\\s*\\|`,
      ),
    );
    if (match) {
      assert.ok(!rows.has(match[1]), `row id is unique: ${match[1]}`);
      rows.set(match[1], match[2]);
    }
  }
  return rows;
}

function assertNoSensitiveValues(source, label) {
  assert.doesNotMatch(
    source,
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|\bAuthorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+|ownerUserId\s*[:=]\s*["'][^"']+|providerTargetMetadata\s*[:=]\s*["'][^"']+/i,
    `${label} contains no sensitive value`,
  );
}

function changedFiles() {
  const tracked = execSync("git diff --name-only", {
    cwd: root,
    encoding: "utf8",
  });
  const untracked = execSync("git ls-files --others --exclude-standard", {
    cwd: root,
    encoding: "utf8",
  });
  return [...new Set(`${tracked}\n${untracked}`.split(/\r?\n/).filter(Boolean))]
    .map((file) => file.replace(/\\/g, "/"));
}

assert.ok(fs.existsSync(path.join(root, readinessPath)));
const readiness = read(readinessPath);
const externalEvidenceReconciliation = read(externalEvidenceReconciliationPath);
const board = read(boardPath);
const task = read(taskPath);

assert.match(
  externalEvidenceReconciliation,
  /^reconciliation_base=e7015f0f97ad128477566e27551d6cd2f5ba6890$/m,
);
assert.match(
  externalEvidenceReconciliation,
  /^recommended_next_approval_unit=CP1-A-MIG-C3$/m,
);
assert.match(
  externalEvidenceReconciliation,
  /^production_wiring_status=disconnected-fail-closed$/m,
);
for (let stage = 1; stage <= 8; stage += 1) {
  assert.match(
    externalEvidenceReconciliation,
    new RegExp(`^\\| CP1-S${stage} `, "m"),
  );
}
assert.match(
  externalEvidenceReconciliation,
  /canonical Git-blob byte SHA-256 `665f184b1bff8dfbcc3e69e7d9c7170113191dfcbd32aa8e2c6b312242efbfe5`/,
);
assert.match(
  externalEvidenceReconciliation,
  /The only recommended next approval unit is `CP1-A-MIG-C3`/,
);
for (const marker of [
  /^reviewed_base=d47db7b79b06a569fcb1a5393d6c3094b9867e90$/m,
  /^migration_attempt_count=1$/m,
  /^migration_apply_count=1$/m,
  /^migration_status=applied$/m,
  /^transaction_status=committed$/m,
  /^structural_query_attempt_count=2$/m,
  /^structural_readiness_status=pass$/m,
  /^row_data_read_count=0$/m,
  /^post_apply_mutation_count=0$/m,
  /^next_ordered_approval_unit=CP1-A-MIG-C5$/m,
  /^production_wiring_status=disconnected-fail-closed$/m,
  /^table_present_count=2$/m,
  /^expected_column_present_count=16$/m,
  /^rls_enabled_count=2$/m,
  /^service_role_policy_count=2$/m,
  /^function_present_count=2$/m,
  /^trigger_binding_count=1$/m,
  /^usage_apply_service_execute_count=1$/m,
  /^usage_apply_client_revoke_count=1$/m,
  /^trigger_internal_direct_revoke_count=1$/m,
]) {
  assert.match(externalEvidenceReconciliation, marker);
}
assert.match(
  readiness,
  /^cp1_c3_structural_readiness_status=pass$/m,
);
assert.match(
  readiness,
  /^cp1_next_ordered_migration_approval_unit=CP1-A-MIG-C6$/m,
);
assert.match(
  task,
  /CP1-A-MIG-C3` and `CP1-A-MIG-C5` are consumed\/pass[\s\S]*next ordered unit is `CP1-A-MIG-C6`/,
);
assert.match(
  board,
  /CP1-A-MIG-C3` is consumed\/pass[\s\S]*zero row-data reads and zero post-apply mutations/,
);
for (const marker of [
  /^execution_recorded_at=2026-07-28T23:33:02\+09:00$/m,
  /^reviewed_base=f81dd09a07a20576231ae192c2df7e31f3c46568$/m,
  /^approval_id=CP1-A-MIG-C5$/m,
  /^structural_readiness_retry_approval_id=CP1-A-MIG-C5-STRUCTURAL-READINESS-RETRY-1$/m,
  /^canonical_git_blob=bb165c31568e6e4a4f6ec238471294fb61365e60$/m,
  /^canonical_git_blob_sha256=acda5042f1e5cea3fe2103a7816aa395f94422a141359bcda5c04f2fe5a87478$/m,
  /^migration_attempt_count=1$/m,
  /^migration_apply_count=1$/m,
  /^migration_status=applied$/m,
  /^transaction_status=committed$/m,
  /^initial_structural_query_attempt_count=2$/m,
  /^synthetic_fixture_pass_count=6$/m,
  /^structural_readiness_retry_query_attempt_count=1$/m,
  /^structural_query_attempt_count=3$/m,
  /^structural_readiness_status=pass$/m,
  /^row_data_read_count=0$/m,
  /^post_apply_mutation_count=0$/m,
  /^next_ordered_approval_unit=CP1-A-MIG-C6$/m,
  /^table_present_count=1$/m,
  /^expected_column_present_count=10$/m,
  /^target_table_total_column_count=10$/m,
  /^rls_enabled_count=1$/m,
  /^service_role_policy_count=1$/m,
  /^required_constraint_count=8$/m,
  /^required_index_count=3$/m,
  /^function_present_count=2$/m,
  /^security_definer_text_function_count=2$/m,
  /^fixed_search_path_count=2$/m,
  /^service_role_function_execute_count=2$/m,
  /^client_function_revoke_count=2$/m,
]) {
  assert.match(externalEvidenceReconciliation, marker);
}
for (const marker of [
  /^cp1_c5_migration_approval_status=consumed$/m,
  /^cp1_c5_migration_execution_status=pass$/m,
  /^cp1_c5_structural_readiness_status=pass$/m,
]) {
  assert.match(readiness, marker);
}
assert.match(
  task,
  /CP1-A-MIG-C5` are consumed\/pass[\s\S]*next ordered unit is `CP1-A-MIG-C6`/,
);
assert.match(
  board,
  /CP1-A-MIG-C5` is consumed\/pass[\s\S]*zero row-data reads and zero post-apply mutations/,
);

execFileSync("git", ["merge-base", "--is-ancestor", integrationBase, "HEAD"], {
  cwd: root,
  stdio: "ignore",
});
execFileSync("git", ["merge-base", "--is-ancestor", c1FailClosedReadFollowupBase, "HEAD"], {
  cwd: root,
  stdio: "ignore",
});
execFileSync(
  "git",
  ["merge-base", "--is-ancestor", c1RuntimeRoleClassificationFollowupBase, "HEAD"],
  {
    cwd: root,
    stdio: "ignore",
  },
);
execFileSync("git", ["merge-base", "--is-ancestor", c12Head, "HEAD"], {
  cwd: root,
  stdio: "ignore",
});

for (const statusLabel of requiredStatusLabels) {
  assert.match(
    readiness,
    new RegExp(`^${statusLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"),
  );
}

assert.deepEqual(
  parseStatusTable(readiness, "LOCAL-DETERMINISTIC|REFERENCE-PRESENCE|REMOTE-DEPLOYED|AUTHENTICATED-BROWSER|RELEASE-OWNER"),
  expectedLanes,
);
assert.deepEqual(parseStatusTable(readiness, "CP1-S(?:10|[0-9])"), expectedStages);

for (const approvalUnit of requiredApprovalUnits) {
  assert.match(readiness, new RegExp(`^\\|\\s*${approvalUnit}\\s*\\|`, "m"));
}
for (const surface of requiredBrowserSurfaces) {
  assert.match(readiness, new RegExp(`^\\|\\s*${surface}\\s*\\|`, "m"));
}

assert.match(readiness, /390 \/ 820 \/ 1024 \/ 1280 \/ 1366px/);
assert.match(readiness, /18 pass \/ 9 dependency-blocked \/ 3 known historical \/ 0 unexpected/);
assert.match(readiness, /abort_status/);
assert.match(readiness, /rollback_status/);
assert.match(readiness, /unchecked_scope_status/);
assert.match(readiness, /CP2/);
assert.match(readiness, /^## CP1-S1A C1 Preview Target Discovery Ready Preflight$/m);
assert.match(readiness, /action_label=list-and-resolve-c1-preview-target-once/);
assert.match(readiness, /list_attempt_count=0 \| 1/);
assert.match(readiness, /preview_candidate_count=<count>/);
assert.match(readiness, /^## CP1-S1B C1 Sole Active Target Mapping Execution Record$/m);
assert.match(readiness, /action_label=relist-and-map-sole-active-c1-preview-once/);
assert.match(readiness, /^## CP1-S1 C1 Migration Apply Execution Record$/m);
assert.match(readiness, /action_label=apply-reviewed-c1-migration-once-after-source-handoff/);
assert.match(readiness, /target_label=approved-creator-paid-preview-c1-store/);
assert.match(
  readiness,
  new RegExp(`^migration_identity_sha256=${c1MigrationIdentitySha256}$`, "m"),
);
assert.match(readiness, /migration_attempt_count=0 \| 1/);
assert.match(readiness, /migration_apply_count=0 \| 1/);
assert.match(readiness, /^## CP1-S2 C1 Fail-Closed Read Blocked Execution Record$/m);
assert.match(readiness, /action_label=c1-missing-record-fail-closed-read-after-c1-apply/);
assert.match(readiness, /^## CP1-S2A C1 Adapter Runtime Source Discovery Blocked Execution Record[\s\S]*?action_label=discover-existing-c1-adapter-runtime-source-once-after-transport-decoder-fix[\s\S]*?approval_status=consumed[\s\S]*?discovery_attempt_count=1[\s\S]*?required_input_count=2[\s\S]*?available_input_count=0[\s\S]*?eligible_runtime_source_count=0[\s\S]*?execution_status=aborted[\s\S]*?abort_status=triggered-public-client-side-source[\s\S]*?unchecked_scope_status=recorded/m);
assert.match(readiness, /target_label=approved-creator-paid-preview-c1-store/);
assert.match(
  readiness,
  /approval_id=CP1-A-C1-ADAPTER-RUNTIME-ROLE-CLASSIFICATION-HARNESS/,
);
assert.match(
  readiness,
  new RegExp(
    `^reviewed_revision=${c1RuntimeRoleClassificationFollowupBase}$`,
    "m",
  ),
);
assert.match(
  readiness,
  /target_label=reviewed-server-owned-c1-adapter-constructor/,
);
assert.match(
  readiness,
  /action_label=classify-reviewed-c1-adapter-runtime-roles-once/,
);
assert.match(
  readiness,
  /^## CP1-S2C C1 Actual-Authority Runtime-Role Classification Consumed Execution Record[\s\S]*?approval_status=consumed[\s\S]*?execution_status=aborted[\s\S]*?abort_status=required_count_mismatch/m,
);
assert.match(
  readiness,
  /^## CP1-S2D C1 Trusted-Factory Handoff Runtime-Role Classification Consumed Execution Record[\s\S]*?approval_status=consumed[\s\S]*?execution_status=pass[\s\S]*?abort_status=not_aborted/m,
);
assert.match(
  readiness,
  /approval_id=CP1-A-C1-ADAPTER-RUNTIME-ROLE-CLASSIFICATION-HARNESS-FACTORY-HANDOFF/,
);
assert.match(
  readiness,
  /action_label=classify-reviewed-c1-adapter-runtime-roles-from-trusted-factory-handoff-once/,
);
assert.match(
  readiness,
  /^## CP1-S2E C1 Role-Aware Runtime-Source Presence Discovery Consumed Execution Record[\s\S]*?approval_status=consumed[\s\S]*?execution_status=aborted[\s\S]*?abort_status=triggered-role-incomplete/m,
);
assert.match(
  readiness,
  /approval_id=CP1-A-C1-ADAPTER-RUNTIME-ROLE-AWARE-SOURCE-DISCOVERY/,
);
assert.match(
  readiness,
  /action_label=discover-reviewed-c1-role-aware-runtime-source-presence-once/,
);
assert.match(readiness, /The only dynamic execution evidence is the following 14 fields/);
assert.match(readiness, /runtime input presence discovery/);
const runtimeRoleSection = readiness.match(
  /^## CP1-S2D C1 Trusted-Factory Handoff Runtime-Role Classification Consumed Execution Record$([\s\S]*?)^## CP1-S2E C1 Role-Aware Runtime-Source Presence Discovery Consumed Execution Record$/m,
)?.[1];
assert.ok(runtimeRoleSection);
const runtimeRoleOutput = runtimeRoleSection.match(
  /The only dynamic execution evidence is the following 14 fields in this exact order:\r?\n\r?\n```text\r?\n([\s\S]*?)\r?\n```/,
)?.[1];
assert.ok(runtimeRoleOutput);
assert.deepEqual(
  runtimeRoleOutput.split(/\r?\n/).map((line) => line.slice(0, line.indexOf("="))),
  expectedRuntimeRoleOutputKeys,
);
assert.equal(runtimeRoleOutput.split(/\r?\n/).length, 14);
assert.match(
  readiness,
  /endpoint_role_presence_count=0 \| 1[\s\S]*server_secret_role_presence_count=0 \| 1/,
);
assert.match(readiness, /^## CP1-S2F C1 Runtime-Source Provisioning Decision Blocker$/m);
assert.match(readiness, /same-process-ephemeral/);
assert.match(readiness, /project-local-secret-persistence/);
assert.match(readiness, /remote-deployed-configuration/);
assert.match(readiness, /provisioning_decision_status=selected-same-process-ephemeral/);
assert.match(readiness, /operator_runner_status=confirmed-available/);
assert.match(readiness, /provisioning_action_status=blocked/);
assert.match(readiness, /next_approval_status=not-prepared/);
assert.match(
  readiness,
  /^## CP1-S2G C1 Same-Process Ephemeral Runtime-Role Provisioning Consumed Execution Record$/m,
);
assert.match(
  readiness,
  /approval_id=CP1-A-C1-ADAPTER-RUNTIME-ROLE-SAME-PROCESS-EPHEMERAL-PROVISIONING/,
);
assert.match(
  readiness,
  /target_label=reviewed-server-owned-c1-same-process-ephemeral-source/,
);
assert.match(
  readiness,
  /action_label=provision-reviewed-c1-runtime-roles-into-exact-process-once/,
);
const sameProcessProvisioningSection = readiness.match(
  /^## CP1-S2G C1 Same-Process Ephemeral Runtime-Role Provisioning Consumed Execution Record$([\s\S]*?)^## Entitlement, Usage, Provider, And Capability Proof Rules$/m,
)?.[1];
assert.ok(sameProcessProvisioningSection);
const sameProcessProvisioningOutput = sameProcessProvisioningSection.match(
  /The only dynamic execution evidence is the following 14 fields in this exact order:\r?\n\r?\n```text\r?\n([\s\S]*?)\r?\n```/,
)?.[1];
assert.ok(sameProcessProvisioningOutput);
assert.deepEqual(
  sameProcessProvisioningOutput
    .split(/\r?\n/)
    .map((line) => line.slice(0, line.indexOf("="))),
  expectedSameProcessProvisioningOutputKeys,
);
assert.equal(sameProcessProvisioningOutput.split(/\r?\n/).length, 14);
assert.match(
  sameProcessProvisioningSection,
  /provisioning_attempt_count=0[\s\S]*endpoint_role_injected_count=0[\s\S]*server_secret_role_injected_count=0[\s\S]*eligible_same_process_source_count=0[\s\S]*process_retention_status=not-held[\s\S]*execution_status=blocked[\s\S]*abort_status=triggered-private-runner-action-handle-unavailable/,
);
assert.match(
  readiness,
  /^## CP1-S2H C1 Hash-Bound Opaque Ephemeral Runner Provisioning Consumed Execution Record$/m,
);
assert.match(
  readiness,
  /approval_id=CP1-A-C1-ADAPTER-RUNTIME-ROLE-OPAQUE-EPHEMERAL-RUNNER-PROVISIONING/,
);
assert.match(
  readiness,
  /target_label=hash-bound-local-c1-ephemeral-runner-process/,
);
assert.match(
  readiness,
  /action_label=start-and-provision-hash-bound-c1-ephemeral-runner-once/,
);
assert.match(
  readiness,
  new RegExp(`^runner_wrapper_sha256=${c1EphemeralRunnerWrapperSha256}$`, "m"),
);
assert.match(
  readiness,
  new RegExp(`^runner_source_sha256=${c1EphemeralRunnerSha256}$`, "m"),
);
assert.match(
  readiness,
  new RegExp(`^runner_contract_sha256=${c1EphemeralRunnerContractSha256}$`, "m"),
);
assert.match(readiness, /runner_preflight_status=verified-not-running/);
assert.match(readiness, /runner_artifact_tracking_status=merged-hash-bound/);
const opaqueRunnerProvisioningSection = readiness.match(
  /^## CP1-S2H C1 Hash-Bound Opaque Ephemeral Runner Provisioning Consumed Execution Record$([\s\S]*?)^## Entitlement, Usage, Provider, And Capability Proof Rules$/m,
)?.[1];
assert.ok(opaqueRunnerProvisioningSection);
const opaqueRunnerProvisioningOutput = opaqueRunnerProvisioningSection.match(
  /The only dynamic execution evidence is the following 14 fields in this exact order:\r?\n\r?\n```text\r?\n([\s\S]*?)\r?\n```/,
)?.[1];
assert.ok(opaqueRunnerProvisioningOutput);
assert.deepEqual(
  opaqueRunnerProvisioningOutput
    .split(/\r?\n/)
    .map((line) => line.slice(0, line.indexOf("="))),
  expectedOpaqueRunnerProvisioningOutputKeys,
);
assert.equal(opaqueRunnerProvisioningOutput.split(/\r?\n/).length, 14);
assert.match(
  opaqueRunnerProvisioningSection,
  /runner_control_action_count=2[\s\S]*endpoint_role_injected_count=0[\s\S]*server_secret_role_injected_count=0[\s\S]*eligible_same_process_source_count=0[\s\S]*process_retention_status=not-held[\s\S]*execution_status=aborted[\s\S]*abort_status=triggered-operator-reported-input-separation-mismatch[\s\S]*rollback_status=not-required/,
);
assert.match(
  readiness,
  /^## CP1-S2I C1 Hash-Bound Opaque Ephemeral Runner Provisioning Retry-1 Consumed Execution Record$/m,
);
assert.match(
  readiness,
  /approval_id=CP1-A-C1-ADAPTER-RUNTIME-ROLE-OPAQUE-EPHEMERAL-RUNNER-PROVISIONING-RETRY-1/,
);
assert.match(
  readiness,
  /action_label=restart-and-provision-hash-bound-c1-ephemeral-runner-once-after-input-separation-confirmation/,
);
const opaqueRunnerRetrySection = readiness.match(
  /^## CP1-S2I C1 Hash-Bound Opaque Ephemeral Runner Provisioning Retry-1 Consumed Execution Record$([\s\S]*?)^## Entitlement, Usage, Provider, And Capability Proof Rules$/m,
)?.[1];
assert.ok(opaqueRunnerRetrySection);
const opaqueRunnerRetryOutput = opaqueRunnerRetrySection.match(
  /The only dynamic execution evidence is the following 14 fields in this exact order:\r?\n\r?\n```text\r?\n([\s\S]*?)\r?\n```/,
)?.[1];
assert.ok(opaqueRunnerRetryOutput);
assert.deepEqual(
  opaqueRunnerRetryOutput
    .split(/\r?\n/)
    .map((line) => line.slice(0, line.indexOf("="))),
  expectedOpaqueRunnerProvisioningOutputKeys,
);
assert.equal(opaqueRunnerRetryOutput.split(/\r?\n/).length, 14);
assert.match(
  opaqueRunnerRetrySection,
  /runner_control_action_count=2[\s\S]*required_input_count=2[\s\S]*endpoint_role_injected_count=1[\s\S]*server_secret_role_injected_count=1[\s\S]*eligible_same_process_source_count=1[\s\S]*process_retention_status=held-idle[\s\S]*execution_status=pass[\s\S]*abort_status=not-triggered[\s\S]*rollback_status=not-required/,
);
assert.match(
  readiness,
  /^## CP1-S2J C1 Held Runner Missing Execution-Seam Blocker And Stop Consumed Abort Record$/m,
);
assert.match(
  readiness,
  /approval_id=CP1-A-C1-OPAQUE-EPHEMERAL-RUNNER-STOP-NO-EXECUTION-SEAM/,
);
assert.match(
  readiness,
  /target_label=held-idle-hash-bound-local-c1-ephemeral-runner-process/,
);
assert.match(
  readiness,
  /action_label=stop-held-c1-ephemeral-runner-once-after-no-execution-seam/,
);
assert.match(readiness, /runner_control_capability_status=presence-status-stop-only/);
assert.match(readiness, /adapter_execution_seam_status=absent/);
const heldRunnerStopSection = readiness.match(
  /^## CP1-S2J C1 Held Runner Missing Execution-Seam Blocker And Stop Consumed Abort Record$([\s\S]*?)^## Entitlement, Usage, Provider, And Capability Proof Rules$/m,
)?.[1];
assert.ok(heldRunnerStopSection);
const heldRunnerStopOutput = heldRunnerStopSection.match(
  /The only dynamic execution evidence is these 14 fields in this exact order:\r?\n\r?\n```text\r?\n([\s\S]*?)\r?\n```/,
)?.[1];
assert.ok(heldRunnerStopOutput);
assert.deepEqual(
  heldRunnerStopOutput
    .split(/\r?\n/)
    .map((line) => line.slice(0, line.indexOf("="))),
  expectedHeldRunnerStopOutputKeys,
);
assert.equal(heldRunnerStopOutput.split(/\r?\n/).length, 14);
assert.match(
  heldRunnerStopSection,
  /runner_stop_action_count=1[\s\S]*process_retention_status=unchecked[\s\S]*termination_status=unconfirmed[\s\S]*execution_status=aborted[\s\S]*sanitized_output_review_status=pass[\s\S]*abort_status=triggered-termination-status-unconfirmed[\s\S]*rollback_status=not-required/,
);
assert.match(
  readiness,
  /^## CP1-S2K C1 Runner Stop-Result Static Diagnosis Consumed Execution Record$/m,
);
const runnerStopStaticDiagnosisSection = readiness.match(
  /^## CP1-S2K C1 Runner Stop-Result Static Diagnosis Consumed Execution Record$([\s\S]*?)^## Entitlement, Usage, Provider, And Capability Proof Rules$/m,
)?.[1];
assert.ok(runnerStopStaticDiagnosisSection);
assert.match(
  runnerStopStaticDiagnosisSection,
  /approval_id=CP1-A-C1-OPAQUE-RUNNER-STOP-RESULT-STATIC-DIAGNOSIS/,
);
assert.match(
  runnerStopStaticDiagnosisSection,
  /target_label=hash-bound-c1-runner-stop-output-contract/,
);
assert.match(
  runnerStopStaticDiagnosisSection,
  /action_label=diagnose-c1-runner-stop-output-shape-without-runner-control-once/,
);
const runnerStopStaticDiagnosisOutput = runnerStopStaticDiagnosisSection.match(
  /The only dynamic execution evidence is these 14 fields in this exact order:\r?\n\r?\n```text\r?\n([\s\S]*?)\r?\n```/,
)?.[1];
assert.ok(runnerStopStaticDiagnosisOutput);
assert.deepEqual(
  runnerStopStaticDiagnosisOutput
    .split(/\r?\n/)
    .map((line) => line.slice(0, line.indexOf("="))),
  expectedRunnerStopStaticDiagnosisOutputKeys,
);
assert.equal(runnerStopStaticDiagnosisOutput.split(/\r?\n/).length, 14);
assert.match(
  runnerStopStaticDiagnosisSection,
  /static_diagnosis_attempt_count=1[\s\S]*artifact_hash_match_count=3[\s\S]*runner_control_action_count=0[\s\S]*wrapper_stop_output_field_count=1[\s\S]*termination_field_count=1[\s\S]*allowed_termination_value_count=1[\s\S]*exit_status_binding_count=0[\s\S]*contract_expectation_count=6[\s\S]*prior_sanitizer_assumption_status=match[\s\S]*diagnosis_classification=contract-wrapper-drift[\s\S]*execution_status=pass[\s\S]*sanitized_output_review_status=pass[\s\S]*abort_status=not-triggered[\s\S]*unchecked_scope_status=recorded/,
);
assert.match(
  readiness,
  /^## CP1-S2L C1 Runner Contract-Expectation Remediation Design Consumed Execution Record$/m,
);
const runnerContractRemediationDesignSection = readiness.match(
  /^## CP1-S2L C1 Runner Contract-Expectation Remediation Design Consumed Execution Record$([\s\S]*?)^## Entitlement, Usage, Provider, And Capability Proof Rules$/m,
)?.[1];
assert.ok(runnerContractRemediationDesignSection);
assert.match(
  runnerContractRemediationDesignSection,
  /approval_id=CP1-A-C1-OPAQUE-RUNNER-CONTRACT-EXPECTATION-REMEDIATION-DESIGN/,
);
assert.match(
  runnerContractRemediationDesignSection,
  /target_label=hash-bound-c1-runner-fixed-wrapper-expectation/,
);
assert.match(
  runnerContractRemediationDesignSection,
  /action_label=design-c1-runner-contract-expectation-remediation-without-execution-once/,
);
const runnerContractRemediationDesignOutput =
  runnerContractRemediationDesignSection.match(
    /The only dynamic execution evidence is these 14 fields in this exact order:\r?\n\r?\n```text\r?\n([\s\S]*?)\r?\n```/,
  )?.[1];
assert.ok(runnerContractRemediationDesignOutput);
assert.deepEqual(
  runnerContractRemediationDesignOutput
    .split(/\r?\n/)
    .map((line) => line.slice(0, line.indexOf("="))),
  expectedRunnerContractRemediationDesignOutputKeys,
);
assert.equal(runnerContractRemediationDesignOutput.split(/\r?\n/).length, 14);
assert.match(
  runnerContractRemediationDesignSection,
  /design_attempt_count=1[\s\S]*artifact_hash_match_count=3[\s\S]*runner_control_action_count=0[\s\S]*fixed_wrapper_expectation_count=6[\s\S]*mismatched_expectation_count=1[\s\S]*proposed_contract_edit_count=1[\s\S]*synthetic_fixture_count=2[\s\S]*live_control_reachability_status=not-reached[\s\S]*artifact_change_status=not-run[\s\S]*contract_execution_status=not-run[\s\S]*execution_status=pass[\s\S]*sanitized_output_review_status=pass[\s\S]*abort_status=not-triggered[\s\S]*unchecked_scope_status=recorded/,
);
assert.match(
  readiness,
  /^## CP1-S2M C1 Runner Contract-Expectation Remediation Implementation Consumed Abort Record$/m,
);
const runnerContractRemediationImplementationSection = readiness.match(
  /^## CP1-S2M C1 Runner Contract-Expectation Remediation Implementation Consumed Abort Record$([\s\S]*?)^## CP1-S2N C1 Runner Contract-Remediation Fixture-Result Diagnosis Consumed Abort Record$/m,
)?.[1];
assert.ok(runnerContractRemediationImplementationSection);
assert.match(
  runnerContractRemediationImplementationSection,
  /approval_id=CP1-A-C1-OPAQUE-RUNNER-CONTRACT-EXPECTATION-REMEDIATION-IMPLEMENTATION/,
);
assert.match(
  runnerContractRemediationImplementationSection,
  /target_label=hash-bound-c1-runner-static-contract-remediation/,
);
assert.match(
  runnerContractRemediationImplementationSection,
  /action_label=apply-one-c1-runner-contract-expectation-edit-and-run-two-pure-static-fixtures-once/,
);
const runnerContractRemediationImplementationOutput =
  runnerContractRemediationImplementationSection.match(
    /The only dynamic execution evidence is these 14 fields in this exact order:\r?\n\r?\n```text\r?\n([\s\S]*?)\r?\n```/,
  )?.[1];
assert.ok(runnerContractRemediationImplementationOutput);
assert.deepEqual(
  runnerContractRemediationImplementationOutput
    .split(/\r?\n/)
    .map((line) => line.slice(0, line.indexOf("="))),
  expectedRunnerContractRemediationImplementationOutputKeys,
);
assert.equal(
  runnerContractRemediationImplementationOutput.split(/\r?\n/).length,
  14,
);
assert.match(
  runnerContractRemediationImplementationSection,
  /implementation_attempt_count=1[\s\S]*pre_artifact_hash_match_count=3[\s\S]*changed_artifact_count=0[\s\S]*contract_expectation_edit_count=1[\s\S]*synthetic_fixture_count=2[\s\S]*synthetic_fixture_pass_count=1[\s\S]*node_syntax_check_status=pass[\s\S]*contract_entrypoint_execution_status=not-run[\s\S]*live_control_reachability_status=not-reached[\s\S]*execution_status=aborted[\s\S]*sanitized_output_review_status=pass[\s\S]*abort_status=triggered-synthetic-fixture-result-mismatch[\s\S]*rollback_status=restored-pre-hash[\s\S]*unchecked_scope_status=recorded/,
);
const runnerContractRemediationFixtureDiagnosisSection = readiness.match(
  /^## CP1-S2N C1 Runner Contract-Remediation Fixture-Result Diagnosis Consumed Abort Record$([\s\S]*?)^## CP1-S2O C1 Runner Contract-Remediation Fixture-Identity Design Consumed Abort Record$/m,
)?.[1];
assert.ok(runnerContractRemediationFixtureDiagnosisSection);
assert.match(
  runnerContractRemediationFixtureDiagnosisSection,
  /approval_id=CP1-A-C1-OPAQUE-RUNNER-CONTRACT-REMEDIATION-FIXTURE-RESULT-DIAGNOSIS/,
);
assert.match(
  runnerContractRemediationFixtureDiagnosisSection,
  /target_label=hash-bound-c1-runner-pure-static-fixture-outcome/,
);
assert.match(
  runnerContractRemediationFixtureDiagnosisSection,
  /action_label=diagnose-c1-runner-remediation-fixture-result-mismatch-without-artifact-change-once/,
);
const runnerContractRemediationFixtureDiagnosisOutput =
  runnerContractRemediationFixtureDiagnosisSection.match(
    /The only dynamic execution evidence is these 14 fields in this exact order:\r?\n\r?\n```text\r?\n([\s\S]*?)\r?\n```/,
  )?.[1];
assert.ok(runnerContractRemediationFixtureDiagnosisOutput);
assert.deepEqual(
  runnerContractRemediationFixtureDiagnosisOutput
    .split(/\r?\n/)
    .map((line) => line.slice(0, line.indexOf("="))),
  expectedRunnerContractRemediationFixtureDiagnosisOutputKeys,
);
assert.equal(
  runnerContractRemediationFixtureDiagnosisOutput.split(/\r?\n/).length,
  14,
);
assert.match(
  runnerContractRemediationFixtureDiagnosisSection,
  /diagnosis_attempt_count=1[\s\S]*artifact_hash_match_count=3[\s\S]*runner_control_action_count=0[\s\S]*positive_fixture_execution_count=0[\s\S]*positive_fixture_pass_count=0[\s\S]*negative_fixture_execution_count=0[\s\S]*negative_fixture_rejection_count=0[\s\S]*fixture_mismatch_classification=unconfirmed[\s\S]*artifact_change_status=not-run[\s\S]*contract_entrypoint_execution_status=not-run[\s\S]*execution_status=aborted[\s\S]*sanitized_output_review_status=pass[\s\S]*abort_status=triggered-fixture-identity-ambiguous[\s\S]*unchecked_scope_status=recorded/,
);
const runnerContractRemediationFixtureIdentityDesignSection = readiness.match(
  /^## CP1-S2O C1 Runner Contract-Remediation Fixture-Identity Design Consumed Abort Record$([\s\S]*?)^## CP1-S2P C1 Runner Contract-Remediation Fixture-Identity Design Retry-1 Consumed Abort Record$/m,
)?.[1];
assert.ok(runnerContractRemediationFixtureIdentityDesignSection);
assert.match(
  runnerContractRemediationFixtureIdentityDesignSection,
  /approval_id=CP1-A-C1-OPAQUE-RUNNER-CONTRACT-REMEDIATION-FIXTURE-IDENTITY-DESIGN/,
);
assert.match(
  runnerContractRemediationFixtureIdentityDesignSection,
  /target_label=hash-bound-c1-runner-deterministic-fixture-pair/,
);
assert.match(
  runnerContractRemediationFixtureIdentityDesignSection,
  /action_label=design-and-bind-c1-runner-negative-fixture-identity-without-verifier-execution-once/,
);
const runnerContractRemediationFixtureIdentityDesignOutput =
  runnerContractRemediationFixtureIdentityDesignSection.match(
    /The only dynamic execution evidence is these 14 fields in this exact order:\r?\n\r?\n```text\r?\n([\s\S]*?)\r?\n```/,
  )?.[1];
assert.ok(runnerContractRemediationFixtureIdentityDesignOutput);
assert.deepEqual(
  runnerContractRemediationFixtureIdentityDesignOutput
    .split(/\r?\n/)
    .map((line) => line.slice(0, line.indexOf("="))),
  expectedRunnerContractRemediationFixtureIdentityDesignOutputKeys,
);
assert.equal(
  runnerContractRemediationFixtureIdentityDesignOutput.split(/\r?\n/).length,
  14,
);
assert.match(
  runnerContractRemediationFixtureIdentityDesignSection,
  /design_attempt_count=0[\s\S]*artifact_hash_match_count=0[\s\S]*runner_control_action_count=0[\s\S]*remediated_expectation_ordinal=unconfirmed[\s\S]*negative_fixture_transform_count=0[\s\S]*negative_fixture_sha256=not-run[\s\S]*fixture_pair_identity_sha256=not-run[\s\S]*fixture_pair_uniqueness_status=not-run[\s\S]*verifier_execution_status=not-run[\s\S]*artifact_change_status=not-run[\s\S]*execution_status=aborted[\s\S]*sanitized_output_review_status=pass[\s\S]*abort_status=triggered-local-design-script-parse-failure[\s\S]*unchecked_scope_status=recorded/,
);
const runnerContractRemediationFixtureIdentityDesignRetrySection = readiness.match(
  /^## CP1-S2P C1 Runner Contract-Remediation Fixture-Identity Design Retry-1 Consumed Abort Record$([\s\S]*?)^## CP1-S2Q C1 Local Driver Result-Envelope Static Diagnosis Consumed Execution Record$/m,
)?.[1];
assert.ok(runnerContractRemediationFixtureIdentityDesignRetrySection);
assert.match(
  runnerContractRemediationFixtureIdentityDesignRetrySection,
  /approval_id=CP1-A-C1-OPAQUE-RUNNER-CONTRACT-REMEDIATION-FIXTURE-IDENTITY-DESIGN-RETRY-1/,
);
assert.match(
  runnerContractRemediationFixtureIdentityDesignRetrySection,
  /target_label=hash-bound-c1-runner-deterministic-fixture-pair-retry-1/,
);
assert.match(
  runnerContractRemediationFixtureIdentityDesignRetrySection,
  /action_label=validate-and-design-c1-runner-negative-fixture-identity-once-after-local-parser-fix/,
);
const runnerContractRemediationFixtureIdentityDesignRetryOutput =
  runnerContractRemediationFixtureIdentityDesignRetrySection.match(
    /Only these 14 fields may be recorded in this exact order:\r?\n\r?\n```text\r?\n([\s\S]*?)\r?\n```/,
  )?.[1];
assert.ok(runnerContractRemediationFixtureIdentityDesignRetryOutput);
assert.deepEqual(
  runnerContractRemediationFixtureIdentityDesignRetryOutput
    .split(/\r?\n/)
    .map((line) => line.slice(0, line.indexOf("="))),
  expectedRunnerContractRemediationFixtureIdentityDesignOutputKeys,
);
assert.equal(
  runnerContractRemediationFixtureIdentityDesignRetryOutput.split(/\r?\n/).length,
  14,
);
assert.match(
  runnerContractRemediationFixtureIdentityDesignRetrySection,
  /runner_control_action_count=0[\s\S]*verifier_execution_status=not-run[\s\S]*artifact_change_status=not-run/,
);
const localDriverResultEnvelopeDiagnosisSection = readiness.match(
  /^## CP1-S2Q C1 Local Driver Result-Envelope Static Diagnosis Consumed Execution Record$([\s\S]*?)^## CP1-S2R C1 Local Driver Result-Envelope Reducer Remediation Consumed Execution Record$/m,
)?.[1];
assert.ok(localDriverResultEnvelopeDiagnosisSection);
assert.match(
  localDriverResultEnvelopeDiagnosisSection,
  /failure_classification=nested-tool-result-envelope-not-reduced/,
);
assert.match(
  localDriverResultEnvelopeDiagnosisSection,
  /artifact_access_count=0[\s\S]*nested_tool_execution_count=0[\s\S]*runner_control_action_count=0[\s\S]*execution_status=pass[\s\S]*sanitized_output_review_status=pass/,
);
const localDriverResultEnvelopeReducerRemediationSection = readiness.match(
  /^## CP1-S2R C1 Local Driver Result-Envelope Reducer Remediation Consumed Execution Record$([\s\S]*?)^## CP1-S2S C1 Runner Contract-Remediation Fixture-Identity Design Retry-2 Consumed Abort Record$/m,
)?.[1];
assert.ok(localDriverResultEnvelopeReducerRemediationSection);
assert.match(
  localDriverResultEnvelopeReducerRemediationSection,
  /reducer_edit_count=1[\s\S]*synthetic_fixture_count=2[\s\S]*synthetic_fixture_pass_count=2[\s\S]*persistent_change_status=none[\s\S]*execution_status=pass/,
);
const runnerContractRemediationFixtureIdentityDesignRetry2Section = readiness.match(
  /^## CP1-S2S C1 Runner Contract-Remediation Fixture-Identity Design Retry-2 Consumed Abort Record$([\s\S]*?)^## CP1-S2T C1 Local Driver Pipeline Synthetic Preflight Consumed Execution Record$/m,
)?.[1];
assert.ok(runnerContractRemediationFixtureIdentityDesignRetry2Section);
const runnerContractRemediationFixtureIdentityDesignRetry2Output =
  runnerContractRemediationFixtureIdentityDesignRetry2Section.match(
    /Only these 14 fields were recorded in this exact order:\r?\n\r?\n```text\r?\n([\s\S]*?)\r?\n```/,
  )?.[1];
assert.ok(runnerContractRemediationFixtureIdentityDesignRetry2Output);
assert.deepEqual(
  runnerContractRemediationFixtureIdentityDesignRetry2Output
    .split(/\r?\n/)
    .map((line) => line.slice(0, line.indexOf("="))),
  expectedRunnerContractRemediationFixtureIdentityDesignOutputKeys,
);
assert.match(
  runnerContractRemediationFixtureIdentityDesignRetry2Section,
  /design_attempt_count=0[\s\S]*artifact_hash_match_count=0[\s\S]*runner_control_action_count=0[\s\S]*remediated_expectation_ordinal=unconfirmed[\s\S]*negative_fixture_transform_count=0[\s\S]*negative_fixture_sha256=not-run[\s\S]*fixture_pair_identity_sha256=not-run[\s\S]*fixture_pair_uniqueness_status=not-run[\s\S]*verifier_execution_status=not-run[\s\S]*artifact_change_status=not-run[\s\S]*execution_status=aborted[\s\S]*sanitized_output_review_status=pass[\s\S]*abort_status=triggered-local-design-script-encoding-failure[\s\S]*unchecked_scope_status=recorded/,
);
const localDriverPipelineSyntheticPreflightSection = readiness.match(
  /^## CP1-S2T C1 Local Driver Pipeline Synthetic Preflight Consumed Execution Record$([\s\S]*?)^## CP1-S2U C1 Runner Contract-Remediation Fixture-Identity Design Retry-3 Consumed Abort Record$/m,
)?.[1];
assert.ok(localDriverPipelineSyntheticPreflightSection);
assert.match(
  localDriverPipelineSyntheticPreflightSection,
  /approval_id=CP1-A-C1-OPAQUE-RUNNER-LOCAL-DRIVER-PIPELINE-SYNTHETIC-PREFLIGHT/,
);
const localDriverPipelineSyntheticPreflightOutput =
  localDriverPipelineSyntheticPreflightSection.match(
    /Only these 14 fields were recorded in this exact order:\r?\n\r?\n```text\r?\n([\s\S]*?)\r?\n```/,
  )?.[1];
assert.ok(localDriverPipelineSyntheticPreflightOutput);
assert.deepEqual(
  localDriverPipelineSyntheticPreflightOutput
    .split(/\r?\n/)
    .map((line) => line.slice(0, line.indexOf("="))),
  expectedLocalDriverPipelineSyntheticPreflightOutputKeys,
);
assert.match(
  localDriverPipelineSyntheticPreflightSection,
  /pipeline_preflight_attempt_count=1[\s\S]*artifact_access_count=0[\s\S]*nested_tool_execution_count=0[\s\S]*runner_control_action_count=0[\s\S]*synthetic_fixture_count=2[\s\S]*synthetic_fixture_pass_count=2[\s\S]*encoding_validation_status=pass[\s\S]*decoding_validation_status=pass[\s\S]*single_envelope_reduction_status=pass[\s\S]*fixed14_validation_status=pass[\s\S]*execution_status=pass[\s\S]*sanitized_output_review_status=pass[\s\S]*abort_status=not-triggered[\s\S]*unchecked_scope_status=recorded/,
);
const runnerContractRemediationFixtureIdentityDesignRetry3Section = readiness.match(
  /^## CP1-S2U C1 Runner Contract-Remediation Fixture-Identity Design Retry-3 Consumed Abort Record$([\s\S]*?)^## CP1-S2V C1 Local Driver Artifact-Read Command Static Diagnosis Consumed Abort Record$/m,
)?.[1];
assert.ok(runnerContractRemediationFixtureIdentityDesignRetry3Section);
assert.match(
  runnerContractRemediationFixtureIdentityDesignRetry3Section,
  /approval_id=CP1-A-C1-OPAQUE-RUNNER-CONTRACT-REMEDIATION-FIXTURE-IDENTITY-DESIGN-RETRY-3/,
);
assert.match(
  runnerContractRemediationFixtureIdentityDesignRetry3Section,
  /target_label=hash-bound-c1-runner-deterministic-fixture-pair-retry-3/,
);
assert.match(
  runnerContractRemediationFixtureIdentityDesignRetry3Section,
  /design_attempt_count=0[\s\S]*artifact_hash_match_count=0[\s\S]*runner_control_action_count=0[\s\S]*remediated_expectation_ordinal=unconfirmed[\s\S]*negative_fixture_transform_count=0[\s\S]*negative_fixture_sha256=not-run[\s\S]*fixture_pair_identity_sha256=not-run[\s\S]*fixture_pair_uniqueness_status=not-run[\s\S]*verifier_execution_status=not-run[\s\S]*artifact_change_status=not-run[\s\S]*execution_status=aborted[\s\S]*sanitized_output_review_status=pass[\s\S]*abort_status=triggered-artifact-read-command-failure[\s\S]*unchecked_scope_status=recorded/,
);
const localDriverArtifactReadCommandDiagnosisSection = readiness.match(
  /^## CP1-S2V C1 Local Driver Artifact-Read Command Static Diagnosis Consumed Abort Record$([\s\S]*?)^## CP1-S2W C1 Local Driver Command-Construction Synthetic Design Consumed Execution Record$/m,
)?.[1];
assert.ok(localDriverArtifactReadCommandDiagnosisSection);
assert.match(
  localDriverArtifactReadCommandDiagnosisSection,
  /approval_id=CP1-A-C1-OPAQUE-RUNNER-LOCAL-DRIVER-ARTIFACT-READ-COMMAND-STATIC-DIAGNOSIS/,
);
assert.match(
  localDriverArtifactReadCommandDiagnosisSection,
  /target_label=local-c1-fixture-identity-artifact-read-command/,
);
assert.match(
  localDriverArtifactReadCommandDiagnosisSection,
  /action_label=diagnose-c1-local-driver-pre-artifact-command-failure-once/,
);
const localDriverArtifactReadCommandDiagnosisOutput =
  localDriverArtifactReadCommandDiagnosisSection.match(
    /Only these 14 fields were recorded in this exact order:\r?\n\r?\n```text\r?\n([\s\S]*?)\r?\n```/,
  )?.[1];
assert.ok(localDriverArtifactReadCommandDiagnosisOutput);
assert.deepEqual(
  localDriverArtifactReadCommandDiagnosisOutput
    .split(/\r?\n/)
    .map((line) => line.slice(0, line.indexOf("="))),
  expectedLocalDriverArtifactReadCommandDiagnosisOutputKeys,
);
assert.match(
  localDriverArtifactReadCommandDiagnosisSection,
  /diagnosis_attempt_count=1[\s\S]*artifact_access_count=0[\s\S]*nested_command_execution_count=0[\s\S]*runner_control_action_count=0[\s\S]*command_construction_locus_count=0[\s\S]*path_resolution_locus_count=0[\s\S]*sanitized_exit_handling_locus_count=0[\s\S]*failure_classification=ambiguous[\s\S]*proposed_remediation_count=0[\s\S]*persistent_change_status=none[\s\S]*execution_status=aborted[\s\S]*sanitized_output_review_status=pass[\s\S]*abort_status=triggered-static-locus-ambiguous[\s\S]*unchecked_scope_status=recorded/,
);
const localDriverCommandConstructionSyntheticDesignSection = readiness.match(
  /^## CP1-S2W C1 Local Driver Command-Construction Synthetic Design Consumed Execution Record$([\s\S]*?)^## CP1-S2X C1 Local Driver Command-Construction Synthetic Execution Consumed Execution Record$/m,
)?.[1];
assert.ok(localDriverCommandConstructionSyntheticDesignSection);
assert.match(
  localDriverCommandConstructionSyntheticDesignSection,
  /approval_id=CP1-A-C1-OPAQUE-RUNNER-LOCAL-DRIVER-COMMAND-CONSTRUCTION-SYNTHETIC-DESIGN/,
);
assert.match(
  localDriverCommandConstructionSyntheticDesignSection,
  /target_label=local-c1-fixture-identity-command-construction-synthetic-design/,
);
assert.match(
  localDriverCommandConstructionSyntheticDesignSection,
  /action_label=design-c1-artifact-read-command-with-fixed-placeholders-once/,
);
const localDriverCommandConstructionSyntheticDesignOutput =
  localDriverCommandConstructionSyntheticDesignSection.match(
    /Only these 14 fields were recorded in this exact order:\r?\n\r?\n```text\r?\n([\s\S]*?)\r?\n```/,
  )?.[1];
assert.ok(localDriverCommandConstructionSyntheticDesignOutput);
assert.deepEqual(
  localDriverCommandConstructionSyntheticDesignOutput
    .split(/\r?\n/)
    .map((line) => line.slice(0, line.indexOf("="))),
  expectedLocalDriverCommandConstructionSyntheticDesignOutputKeys,
);
assert.match(
  localDriverCommandConstructionSyntheticDesignSection,
  /design_attempt_count=1[\s\S]*artifact_access_count=0[\s\S]*nested_command_execution_count=0[\s\S]*runner_control_action_count=0[\s\S]*synthetic_placeholder_count=3[\s\S]*static_tokenization_validation_status=pass[\s\S]*path_binding_strategy=explicit-positional-arguments-no-document-extraction[\s\S]*sanitized_exit_contract_status=single-sanitized-result-envelope[\s\S]*proposed_driver_design_count=1[\s\S]*persistent_change_status=none[\s\S]*execution_status=pass[\s\S]*sanitized_output_review_status=pass[\s\S]*abort_status=not-triggered[\s\S]*unchecked_scope_status=recorded/,
);
const localDriverCommandConstructionSyntheticExecutionPreflightSection =
  readiness.match(
    /^## CP1-S2X C1 Local Driver Command-Construction Synthetic Execution Consumed Execution Record$([\s\S]*?)^## CP1-S2Y C1 Runner Contract-Remediation Fixture-Identity Design Retry-4 Consumed Abort Record$/m,
  )?.[1];
assert.ok(localDriverCommandConstructionSyntheticExecutionPreflightSection);
assert.match(
  localDriverCommandConstructionSyntheticExecutionPreflightSection,
  /approval_id=CP1-A-C1-OPAQUE-RUNNER-LOCAL-DRIVER-COMMAND-CONSTRUCTION-SYNTHETIC-EXECUTION-PREFLIGHT/,
);
assert.match(
  localDriverCommandConstructionSyntheticExecutionPreflightSection,
  /target_label=local-c1-fixture-identity-command-construction-synthetic-execution/,
);
assert.match(
  localDriverCommandConstructionSyntheticExecutionPreflightSection,
  /action_label=execute-c1-command-construction-with-fixed-inert-placeholders-once/,
);
const localDriverCommandConstructionSyntheticExecutionPreflightOutput =
  localDriverCommandConstructionSyntheticExecutionPreflightSection.match(
    /Only these 14 fields were recorded in this exact order:\r?\n\r?\n```text\r?\n([\s\S]*?)\r?\n```/,
  )?.[1];
assert.ok(localDriverCommandConstructionSyntheticExecutionPreflightOutput);
assert.deepEqual(
  localDriverCommandConstructionSyntheticExecutionPreflightOutput
    .split(/\r?\n/)
    .map((line) => line.slice(0, line.indexOf("="))),
  expectedLocalDriverCommandConstructionSyntheticExecutionPreflightOutputKeys,
);
assert.match(
  localDriverCommandConstructionSyntheticExecutionPreflightSection,
  /preflight_attempt_count=1[\s\S]*artifact_access_count=0[\s\S]*nested_command_execution_count=1[\s\S]*runner_control_action_count=0[\s\S]*synthetic_argument_count=3[\s\S]*synthetic_argument_binding_status=pass[\s\S]*shell_execution_status=pass[\s\S]*single_envelope_reduction_status=pass[\s\S]*sanitized_payload_validation_status=pass[\s\S]*persistent_change_status=none[\s\S]*execution_status=pass[\s\S]*sanitized_output_review_status=pass[\s\S]*abort_status=not-triggered[\s\S]*unchecked_scope_status=recorded/,
);
const runnerContractRemediationFixtureIdentityDesignRetry4Section =
  readiness.match(
    /^## CP1-S2Y C1 Runner Contract-Remediation Fixture-Identity Design Retry-4 Consumed Abort Record$([\s\S]*?)^## CP1-S2Z C1 Explicit Artifact-Path Positional Binding Static Design Consumed Execution Record$/m,
  )?.[1];
assert.ok(runnerContractRemediationFixtureIdentityDesignRetry4Section);
assert.match(
  runnerContractRemediationFixtureIdentityDesignRetry4Section,
  /approval_id=CP1-A-C1-OPAQUE-RUNNER-CONTRACT-REMEDIATION-FIXTURE-IDENTITY-DESIGN-RETRY-4/,
);
assert.match(
  runnerContractRemediationFixtureIdentityDesignRetry4Section,
  /target_label=hash-bound-c1-runner-deterministic-fixture-pair-retry-4/,
);
assert.match(
  runnerContractRemediationFixtureIdentityDesignRetry4Section,
  /action_label=design-and-bind-c1-runner-negative-fixture-identity-once-after-command-construction-synthetic-execution-preflight/,
);
assert.match(
  runnerContractRemediationFixtureIdentityDesignRetry4Section,
  new RegExp(`runner_wrapper_sha256=${c1EphemeralRunnerWrapperSha256}`),
);
assert.match(
  runnerContractRemediationFixtureIdentityDesignRetry4Section,
  new RegExp(`runner_source_sha256=${c1EphemeralRunnerSha256}`),
);
assert.match(
  runnerContractRemediationFixtureIdentityDesignRetry4Section,
  new RegExp(`runner_contract_sha256=${c1EphemeralRunnerContractSha256}`),
);
const runnerContractRemediationFixtureIdentityDesignRetry4Output =
  runnerContractRemediationFixtureIdentityDesignRetry4Section.match(
    /Only these 14 fields were recorded in this exact order:\r?\n\r?\n```text\r?\n([\s\S]*?)\r?\n```/,
  )?.[1];
assert.ok(runnerContractRemediationFixtureIdentityDesignRetry4Output);
assert.deepEqual(
  runnerContractRemediationFixtureIdentityDesignRetry4Output
    .split(/\r?\n/)
    .map((line) => line.slice(0, line.indexOf("="))),
  expectedRunnerContractRemediationFixtureIdentityDesignOutputKeys,
);
assert.match(
  runnerContractRemediationFixtureIdentityDesignRetry4Section,
  /design_attempt_count=0[\s\S]*artifact_hash_match_count=0[\s\S]*runner_control_action_count=0[\s\S]*remediated_expectation_ordinal=unconfirmed[\s\S]*negative_fixture_transform_count=0[\s\S]*negative_fixture_sha256=not-run[\s\S]*fixture_pair_identity_sha256=not-run[\s\S]*fixture_pair_uniqueness_status=not-run[\s\S]*verifier_execution_status=not-run[\s\S]*artifact_change_status=not-run[\s\S]*execution_status=aborted[\s\S]*sanitized_output_review_status=pass[\s\S]*abort_status=triggered-explicit-artifact-path-binding-unavailable[\s\S]*unchecked_scope_status=recorded/,
);
const explicitArtifactPathBindingDesignSection = readiness.match(
  /^## CP1-S2Z C1 Explicit Artifact-Path Positional Binding Static Design Consumed Execution Record$([\s\S]*?)^## CP1-S2AA C1 Runner Contract-Remediation Fixture-Identity Design Retry-5 Consumed Abort Record$/m,
)?.[1];
assert.ok(explicitArtifactPathBindingDesignSection);
assert.match(
  explicitArtifactPathBindingDesignSection,
  /approval_id=CP1-A-C1-OPAQUE-RUNNER-LOCAL-DRIVER-EXPLICIT-ARTIFACT-PATH-BINDING-STATIC-DESIGN/,
);
assert.match(
  explicitArtifactPathBindingDesignSection,
  /target_label=local-c1-fixture-identity-explicit-artifact-path-binding/,
);
assert.match(
  explicitArtifactPathBindingDesignSection,
  /action_label=design-c1-three-role-operator-supplied-path-binding-once/,
);
const explicitArtifactPathBindingDesignOutput =
  explicitArtifactPathBindingDesignSection.match(
    /Only these 14 fields were recorded in this exact order:\r?\n\r?\n```text\r?\n([\s\S]*?)\r?\n```/,
  )?.[1];
assert.ok(explicitArtifactPathBindingDesignOutput);
assert.deepEqual(
  explicitArtifactPathBindingDesignOutput
    .split(/\r?\n/)
    .map((line) => line.slice(0, line.indexOf("="))),
  expectedExplicitArtifactPathBindingDesignOutputKeys,
);
assert.match(
  explicitArtifactPathBindingDesignSection,
  /design_attempt_count=1[\s\S]*artifact_access_count=0[\s\S]*nested_command_execution_count=0[\s\S]*runner_control_action_count=0[\s\S]*artifact_role_count=3[\s\S]*binding_contract_status=explicit-three-operator-supplied-positional-paths[\s\S]*path_source_policy=operator-supplied-no-document-shell-env-metadata-extraction[\s\S]*sanitized_exit_contract_status=single-sanitized-result-envelope[\s\S]*proposed_driver_design_count=1[\s\S]*persistent_change_status=none[\s\S]*execution_status=pass[\s\S]*sanitized_output_review_status=pass[\s\S]*abort_status=not-triggered[\s\S]*unchecked_scope_status=recorded/,
);
const runnerContractRemediationFixtureIdentityDesignRetry5Section =
  readiness.match(
    /^## CP1-S2AA C1 Runner Contract-Remediation Fixture-Identity Design Retry-5 Consumed Abort Record$([\s\S]*?)^## CP1-S2AB C1 Repository-Local Artifact-Path Resolution Consumed Abort Record$/m,
  )?.[1];
assert.ok(runnerContractRemediationFixtureIdentityDesignRetry5Section);
assert.match(
  runnerContractRemediationFixtureIdentityDesignRetry5Section,
  /approval_id=CP1-A-C1-OPAQUE-RUNNER-CONTRACT-REMEDIATION-FIXTURE-IDENTITY-DESIGN-RETRY-5/,
);
assert.match(
  runnerContractRemediationFixtureIdentityDesignRetry5Section,
  /target_label=hash-bound-c1-runner-deterministic-fixture-pair-retry-5/,
);
assert.match(
  runnerContractRemediationFixtureIdentityDesignRetry5Section,
  /action_label=design-and-bind-c1-runner-negative-fixture-identity-once-with-operator-supplied-explicit-artifact-paths/,
);
assert.match(
  runnerContractRemediationFixtureIdentityDesignRetry5Section,
  new RegExp(`runner_wrapper_sha256=${c1EphemeralRunnerWrapperSha256}`),
);
assert.match(
  runnerContractRemediationFixtureIdentityDesignRetry5Section,
  new RegExp(`runner_source_sha256=${c1EphemeralRunnerSha256}`),
);
assert.match(
  runnerContractRemediationFixtureIdentityDesignRetry5Section,
  new RegExp(`runner_contract_sha256=${c1EphemeralRunnerContractSha256}`),
);
const runnerContractRemediationFixtureIdentityDesignRetry5Output =
  runnerContractRemediationFixtureIdentityDesignRetry5Section.match(
    /Only these 14 fields were recorded in this exact order:\r?\n\r?\n```text\r?\n([\s\S]*?)\r?\n```/,
  )?.[1];
assert.ok(runnerContractRemediationFixtureIdentityDesignRetry5Output);
assert.deepEqual(
  runnerContractRemediationFixtureIdentityDesignRetry5Output
    .split(/\r?\n/)
    .map((line) => line.slice(0, line.indexOf("="))),
  expectedRunnerContractRemediationFixtureIdentityDesignOutputKeys,
);
assert.match(
  runnerContractRemediationFixtureIdentityDesignRetry5Section,
  /design_attempt_count=0[\s\S]*artifact_hash_match_count=0[\s\S]*runner_control_action_count=0[\s\S]*remediated_expectation_ordinal=unconfirmed[\s\S]*negative_fixture_transform_count=0[\s\S]*negative_fixture_sha256=not-run[\s\S]*fixture_pair_identity_sha256=not-run[\s\S]*fixture_pair_uniqueness_status=not-run[\s\S]*verifier_execution_status=not-run[\s\S]*artifact_change_status=not-run[\s\S]*execution_status=aborted[\s\S]*sanitized_output_review_status=pass[\s\S]*abort_status=triggered-private-path-input-absent[\s\S]*unchecked_scope_status=recorded/,
);
const repositoryLocalArtifactPathResolutionSection = readiness.match(
  /^## CP1-S2AB C1 Repository-Local Artifact-Path Resolution Consumed Abort Record$([\s\S]*?)^## CP1-S2AC C1 Artifact-Path Filename-Predicate Cardinality Diagnosis Consumed Pass Record$/m,
)?.[1];
assert.ok(repositoryLocalArtifactPathResolutionSection);
assert.match(
  repositoryLocalArtifactPathResolutionSection,
  /approval_id=CP1-A-C1-OPAQUE-RUNNER-LOCAL-DRIVER-REPOSITORY-LOCAL-ARTIFACT-PATH-RESOLUTION-PREFLIGHT/,
);
assert.match(
  repositoryLocalArtifactPathResolutionSection,
  /target_label=local-c1-fixture-identity-hash-bound-artifact-path-resolution/,
);
assert.match(
  repositoryLocalArtifactPathResolutionSection,
  /action_label=resolve-three-c1-runner-artifact-paths-by-role-filename-and-hash-once/,
);
assert.match(
  repositoryLocalArtifactPathResolutionSection,
  new RegExp(`runner_wrapper_sha256=${c1EphemeralRunnerWrapperSha256}`),
);
assert.match(
  repositoryLocalArtifactPathResolutionSection,
  new RegExp(`runner_source_sha256=${c1EphemeralRunnerSha256}`),
);
assert.match(
  repositoryLocalArtifactPathResolutionSection,
  new RegExp(`runner_contract_sha256=${c1EphemeralRunnerContractSha256}`),
);
const repositoryLocalArtifactPathResolutionOutput =
  repositoryLocalArtifactPathResolutionSection.match(
    /Only these 14 fields were recorded in this exact order:\r?\n\r?\n```text\r?\n([\s\S]*?)\r?\n```/,
  )?.[1];
assert.ok(repositoryLocalArtifactPathResolutionOutput);
assert.deepEqual(
  repositoryLocalArtifactPathResolutionOutput
    .split(/\r?\n/)
    .map((line) => line.slice(0, line.indexOf("="))),
  expectedRepositoryLocalArtifactPathResolutionOutputKeys,
);
assert.match(
  repositoryLocalArtifactPathResolutionSection,
  /path_resolution_attempt_count=1[\s\S]*tracked_scripts_path_enumeration_count=1[\s\S]*nested_command_execution_count=1[\s\S]*artifact_content_read_count=0[\s\S]*artifact_hash_match_count=0[\s\S]*runner_control_action_count=0[\s\S]*artifact_role_candidate_count=0[\s\S]*artifact_role_binding_status=ambiguous[\s\S]*path_output_status=suppressed[\s\S]*persistent_change_status=none[\s\S]*execution_status=aborted[\s\S]*sanitized_output_review_status=pass[\s\S]*abort_status=triggered-artifact-role-candidate-ambiguity[\s\S]*unchecked_scope_status=recorded/,
);
const artifactPathFilenamePredicateDiagnosisSection = readiness.match(
  /^## CP1-S2AC C1 Artifact-Path Filename-Predicate Cardinality Diagnosis Consumed Pass Record$([\s\S]*?)^## CP1-S2AD C1 Goal-Bound Hash-First Artifact Binding And Fixture-Identity Design Consumed Abort Record$/m,
)?.[1];
assert.ok(artifactPathFilenamePredicateDiagnosisSection);
assert.match(
  artifactPathFilenamePredicateDiagnosisSection,
  /approval_id=CP1-A-C1-OPAQUE-RUNNER-LOCAL-DRIVER-ARTIFACT-PATH-FILENAME-PREDICATE-STATIC-DIAGNOSIS/,
);
assert.match(
  artifactPathFilenamePredicateDiagnosisSection,
  /target_label=local-c1-artifact-path-filename-predicate-diagnosis/,
);
assert.match(
  artifactPathFilenamePredicateDiagnosisSection,
  /action_label=diagnose-c1-three-role-filename-predicate-cardinality-once/,
);
const artifactPathFilenamePredicateDiagnosisOutput =
  artifactPathFilenamePredicateDiagnosisSection.match(
    /Only these 14 fields may be recorded in this exact order:\r?\n\r?\n```text\r?\n([\s\S]*?)\r?\n```/,
  )?.[1];
assert.ok(artifactPathFilenamePredicateDiagnosisOutput);
assert.deepEqual(
  artifactPathFilenamePredicateDiagnosisOutput
    .split(/\r?\n/)
    .map((line) => line.slice(0, line.indexOf("="))),
  expectedArtifactPathFilenamePredicateDiagnosisOutputKeys,
);
assert.match(
  artifactPathFilenamePredicateDiagnosisSection,
  /diagnosis_attempt_count=0 \| 1[\s\S]*tracked_scripts_path_enumeration_count=0 \| 1[\s\S]*nested_command_execution_count=0 \| 1[\s\S]*artifact_content_hash_access_count=0[\s\S]*runner_control_action_count=0[\s\S]*wrapper_predicate_candidate_count=0 \| 1 \| 2 \| 3 \| more-than-3[\s\S]*execution_status=not-run \| pass \| aborted/,
);
assert.match(
  artifactPathFilenamePredicateDiagnosisSection,
  /diagnosis_attempt_count=1[\s\S]*tracked_scripts_path_enumeration_count=1[\s\S]*nested_command_execution_count=1[\s\S]*artifact_content_hash_access_count=0[\s\S]*runner_control_action_count=0[\s\S]*wrapper_predicate_candidate_count=0[\s\S]*runner_predicate_candidate_count=0[\s\S]*contract_predicate_candidate_count=0[\s\S]*failure_classification=all-role-zero-match[\s\S]*persistent_change_status=none[\s\S]*execution_status=pass[\s\S]*sanitized_output_review_status=pass[\s\S]*abort_status=not-triggered[\s\S]*unchecked_scope_status=recorded/,
);
const goalBoundHashFirstFixtureIdentitySection = readiness.match(
  /^## CP1-S2AD C1 Goal-Bound Hash-First Artifact Binding And Fixture-Identity Design Consumed Abort Record$([\s\S]*?)^## CP1-S2AE C1 Goal-Bound Hash-First Artifact Binding And Fixture-Identity Design Retry-1 Consumed Abort Record$/m,
)?.[1];
assert.ok(goalBoundHashFirstFixtureIdentitySection);
assert.match(
  goalBoundHashFirstFixtureIdentitySection,
  /approval_id=CP1-A-C1-OPAQUE-RUNNER-GOAL-BOUND-HASH-FIRST-ARTIFACT-BINDING-AND-FIXTURE-IDENTITY-DESIGN/,
);
assert.match(
  goalBoundHashFirstFixtureIdentitySection,
  /target_label=local-c1-goal-bound-hash-first-artifact-binding-and-fixture-identity/,
);
assert.match(
  goalBoundHashFirstFixtureIdentitySection,
  /action_label=resolve-hash-bind-and-design-c1-deterministic-fixture-pair-once/,
);
assert.match(goalBoundHashFirstFixtureIdentitySection, /approval_status=consumed/);
assert.match(
  goalBoundHashFirstFixtureIdentitySection,
  /execution_status=aborted-local-driver-script-parse-failure/,
);
const goalBoundHashFirstFixtureIdentityOutput =
  goalBoundHashFirstFixtureIdentitySection.match(
    /Only these 14 fields may be recorded in this exact order:\r?\n\r?\n```text\r?\n([\s\S]*?)\r?\n```/,
  )?.[1];
assert.ok(goalBoundHashFirstFixtureIdentityOutput);
assert.deepEqual(
  goalBoundHashFirstFixtureIdentityOutput
    .split(/\r?\n/)
    .map((line) => line.slice(0, line.indexOf("="))),
  expectedRunnerContractRemediationFixtureIdentityDesignOutputKeys,
);
assert.match(
  goalBoundHashFirstFixtureIdentitySection,
  /design_attempt_count=0[\s\S]*artifact_hash_match_count=0[\s\S]*runner_control_action_count=0[\s\S]*remediated_expectation_ordinal=unconfirmed[\s\S]*negative_fixture_transform_count=0[\s\S]*negative_fixture_sha256=not-run[\s\S]*fixture_pair_identity_sha256=not-run[\s\S]*fixture_pair_uniqueness_status=not-run[\s\S]*verifier_execution_status=not-run[\s\S]*artifact_change_status=not-run[\s\S]*execution_status=aborted[\s\S]*sanitized_output_review_status=pass[\s\S]*abort_status=triggered-local-driver-script-parse-failure[\s\S]*unchecked_scope_status=recorded/,
);
const goalBoundHashFirstFixtureIdentityRetry1Section = readiness.match(
  /^## CP1-S2AE C1 Goal-Bound Hash-First Artifact Binding And Fixture-Identity Design Retry-1 Consumed Abort Record$([\s\S]*?)^## CP1-S2AF C1 Goal-Bound Hash-First Artifact Binding And Fixture-Identity Design Retry-2 Consumed Abort Record$/m,
)?.[1];
assert.ok(goalBoundHashFirstFixtureIdentityRetry1Section);
assert.match(
  goalBoundHashFirstFixtureIdentityRetry1Section,
  /approval_id=CP1-A-C1-OPAQUE-RUNNER-GOAL-BOUND-HASH-FIRST-ARTIFACT-BINDING-AND-FIXTURE-IDENTITY-DESIGN-RETRY-1/,
);
assert.match(
  goalBoundHashFirstFixtureIdentityRetry1Section,
  /action_label=syntax-preflight-then-resolve-hash-bind-and-design-c1-fixture-pair-once/,
);
assert.match(goalBoundHashFirstFixtureIdentityRetry1Section, /approval_status=consumed/);
assert.match(
  goalBoundHashFirstFixtureIdentityRetry1Section,
  /execution_status=aborted-driver-syntax-preflight-failure/,
);
const goalBoundHashFirstFixtureIdentityRetry1Output =
  goalBoundHashFirstFixtureIdentityRetry1Section.match(
    /Only these 14 fields may be recorded in this exact order:\r?\n\r?\n```text\r?\n([\s\S]*?)\r?\n```/,
  )?.[1];
assert.ok(goalBoundHashFirstFixtureIdentityRetry1Output);
assert.deepEqual(
  goalBoundHashFirstFixtureIdentityRetry1Output
    .split(/\r?\n/)
    .map((line) => line.slice(0, line.indexOf("="))),
  expectedRunnerContractRemediationFixtureIdentityDesignOutputKeys,
);
assert.match(
  goalBoundHashFirstFixtureIdentityRetry1Section,
  /design_attempt_count=0[\s\S]*artifact_hash_match_count=0[\s\S]*runner_control_action_count=0[\s\S]*remediated_expectation_ordinal=unconfirmed[\s\S]*negative_fixture_transform_count=0[\s\S]*negative_fixture_sha256=not-run[\s\S]*fixture_pair_identity_sha256=not-run[\s\S]*fixture_pair_uniqueness_status=not-run[\s\S]*verifier_execution_status=not-run[\s\S]*artifact_change_status=not-run[\s\S]*execution_status=aborted[\s\S]*sanitized_output_review_status=pass[\s\S]*abort_status=triggered-driver-syntax-preflight-failure[\s\S]*unchecked_scope_status=recorded/,
);
const goalBoundHashFirstFixtureIdentityRetry2Section = readiness.match(
  /^## CP1-S2AF C1 Goal-Bound Hash-First Artifact Binding And Fixture-Identity Design Retry-2 Consumed Abort Record$([\s\S]*?)^## CP1-S2AG C1 Goal-Bound Hash-First Artifact Binding And Fixture-Identity Design Retry-3 Consumed Abort Record$/m,
)?.[1];
assert.ok(goalBoundHashFirstFixtureIdentityRetry2Section);
assert.match(
  goalBoundHashFirstFixtureIdentityRetry2Section,
  /approval_id=CP1-A-C1-OPAQUE-RUNNER-GOAL-BOUND-HASH-FIRST-ARTIFACT-BINDING-AND-FIXTURE-IDENTITY-DESIGN-RETRY-2/,
);
assert.match(
  goalBoundHashFirstFixtureIdentityRetry2Section,
  /action_label=in-memory-compile-then-resolve-hash-bind-and-design-c1-fixture-pair-once/,
);
assert.match(goalBoundHashFirstFixtureIdentityRetry2Section, /approval_status=consumed/);
assert.match(
  goalBoundHashFirstFixtureIdentityRetry2Section,
  /execution_status=aborted-nested-command-failure/,
);
const goalBoundHashFirstFixtureIdentityRetry2Output =
  goalBoundHashFirstFixtureIdentityRetry2Section.match(
    /Only these 14 fields were recorded in this exact order:\r?\n\r?\n```text\r?\n([\s\S]*?)\r?\n```/,
  )?.[1];
assert.ok(goalBoundHashFirstFixtureIdentityRetry2Output);
assert.deepEqual(
  goalBoundHashFirstFixtureIdentityRetry2Output
    .split(/\r?\n/)
    .map((line) => line.slice(0, line.indexOf("="))),
  expectedRunnerContractRemediationFixtureIdentityDesignOutputKeys,
);
assert.match(
  goalBoundHashFirstFixtureIdentityRetry2Section,
  /design_attempt_count=0[\s\S]*artifact_hash_match_count=0[\s\S]*runner_control_action_count=0[\s\S]*remediated_expectation_ordinal=unconfirmed[\s\S]*negative_fixture_transform_count=0[\s\S]*negative_fixture_sha256=not-run[\s\S]*fixture_pair_identity_sha256=not-run[\s\S]*fixture_pair_uniqueness_status=not-run[\s\S]*verifier_execution_status=not-run[\s\S]*artifact_change_status=not-run[\s\S]*execution_status=aborted[\s\S]*sanitized_output_review_status=pass[\s\S]*abort_status=triggered-nested-command-failure[\s\S]*unchecked_scope_status=recorded/,
);
const goalBoundHashFirstFixtureIdentityRetry3Section = readiness.match(
  /^## CP1-S2AG C1 Goal-Bound Hash-First Artifact Binding And Fixture-Identity Design Retry-3 Consumed Abort Record$([\s\S]*?)^## CP1-S2AH C1 Goal-Bound Canonical Byte-Source Artifact Binding And Fixture-Identity Design Retry-4 Consumed Abort Record$/m,
)?.[1];
assert.ok(goalBoundHashFirstFixtureIdentityRetry3Section);
assert.match(
  goalBoundHashFirstFixtureIdentityRetry3Section,
  /approval_id=CP1-A-C1-OPAQUE-RUNNER-GOAL-BOUND-HASH-FIRST-ARTIFACT-BINDING-AND-FIXTURE-IDENTITY-DESIGN-RETRY-3/,
);
assert.match(
  goalBoundHashFirstFixtureIdentityRetry3Section,
  /action_label=write-check-execute-and-delete-transient-c1-driver-once/,
);
assert.match(goalBoundHashFirstFixtureIdentityRetry3Section, /approval_status=consumed/);
assert.match(
  goalBoundHashFirstFixtureIdentityRetry3Section,
  /execution_status=aborted-artifact-hash-binding-failure/,
);
const goalBoundHashFirstFixtureIdentityRetry3Output =
  goalBoundHashFirstFixtureIdentityRetry3Section.match(
    /Only these 14 fields were recorded in this exact order:\r?\n\r?\n```text\r?\n([\s\S]*?)\r?\n```/,
  )?.[1];
assert.ok(goalBoundHashFirstFixtureIdentityRetry3Output);
assert.deepEqual(
  goalBoundHashFirstFixtureIdentityRetry3Output
    .split(/\r?\n/)
    .map((line) => line.slice(0, line.indexOf("="))),
  expectedRunnerContractRemediationFixtureIdentityDesignOutputKeys,
);
assert.match(
  goalBoundHashFirstFixtureIdentityRetry3Section,
  /design_attempt_count=0[\s\S]*artifact_hash_match_count=0[\s\S]*runner_control_action_count=0[\s\S]*remediated_expectation_ordinal=unconfirmed[\s\S]*negative_fixture_transform_count=0[\s\S]*negative_fixture_sha256=not-run[\s\S]*fixture_pair_identity_sha256=not-run[\s\S]*fixture_pair_uniqueness_status=not-run[\s\S]*verifier_execution_status=not-run[\s\S]*artifact_change_status=not-run[\s\S]*execution_status=aborted[\s\S]*sanitized_output_review_status=pass[\s\S]*abort_status=triggered-artifact-hash-binding-failure[\s\S]*unchecked_scope_status=recorded/,
);
const goalBoundHashFirstFixtureIdentityRetry4Section = readiness.match(
  /^## CP1-S2AH C1 Goal-Bound Canonical Byte-Source Artifact Binding And Fixture-Identity Design Retry-4 Consumed Abort Record$([\s\S]*?)^## CP1-S2AI C1 Goal-Bound Historical Blob Artifact Binding And Fixture-Identity Design Retry-5 Consumed Abort Record$/m,
)?.[1];
assert.ok(goalBoundHashFirstFixtureIdentityRetry4Section);
assert.match(
  goalBoundHashFirstFixtureIdentityRetry4Section,
  /approval_id=CP1-A-C1-OPAQUE-RUNNER-GOAL-BOUND-HASH-FIRST-ARTIFACT-BINDING-AND-FIXTURE-IDENTITY-DESIGN-RETRY-4/,
);
assert.match(
  goalBoundHashFirstFixtureIdentityRetry4Section,
  /action_label=resolve-unique-tracked-byte-source-bind-and-design-c1-fixture-pair-once/,
);
assert.match(goalBoundHashFirstFixtureIdentityRetry4Section, /approval_status=consumed/);
assert.match(
  goalBoundHashFirstFixtureIdentityRetry4Section,
  /execution_status=aborted-canonical-byte-source-no-match/,
);
const goalBoundHashFirstFixtureIdentityRetry4Output =
  goalBoundHashFirstFixtureIdentityRetry4Section.match(
    /Only these 14 fields were recorded in this exact order:\r?\n\r?\n```text\r?\n([\s\S]*?)\r?\n```/,
  )?.[1];
assert.ok(goalBoundHashFirstFixtureIdentityRetry4Output);
assert.deepEqual(
  goalBoundHashFirstFixtureIdentityRetry4Output
    .split(/\r?\n/)
    .map((line) => line.slice(0, line.indexOf("="))),
  expectedRunnerContractRemediationFixtureIdentityDesignOutputKeys,
);
assert.match(
  goalBoundHashFirstFixtureIdentityRetry4Section,
  /design_attempt_count=0[\s\S]*artifact_hash_match_count=0[\s\S]*runner_control_action_count=0[\s\S]*remediated_expectation_ordinal=unconfirmed[\s\S]*negative_fixture_transform_count=0[\s\S]*negative_fixture_sha256=not-run[\s\S]*fixture_pair_identity_sha256=not-run[\s\S]*fixture_pair_uniqueness_status=not-run[\s\S]*verifier_execution_status=not-run[\s\S]*artifact_change_status=not-run[\s\S]*execution_status=aborted[\s\S]*sanitized_output_review_status=pass[\s\S]*abort_status=triggered-canonical-byte-source-no-match[\s\S]*unchecked_scope_status=recorded/,
);
const goalBoundHistoricalBlobFixtureIdentityRetry5Section = readiness.match(
  /^## CP1-S2AI C1 Goal-Bound Historical Blob Artifact Binding And Fixture-Identity Design Retry-5 Consumed Abort Record$([\s\S]*?)^## CP1-S2AJ C1 Original Untracked Artifact Recovery And Fixture-Identity Design Retry-6 Consumed Abort Record$/m,
)?.[1];
assert.ok(goalBoundHistoricalBlobFixtureIdentityRetry5Section);
assert.match(
  goalBoundHistoricalBlobFixtureIdentityRetry5Section,
  /approval_id=CP1-A-C1-OPAQUE-RUNNER-GOAL-BOUND-HISTORICAL-BLOB-BINDING-AND-FIXTURE-IDENTITY-DESIGN-RETRY-5/,
);
assert.match(
  goalBoundHistoricalBlobFixtureIdentityRetry5Section,
  /action_label=resolve-unique-ancestor-tracked-blob-binding-and-design-c1-fixture-pair-once/,
);
assert.match(goalBoundHistoricalBlobFixtureIdentityRetry5Section, /approval_status=consumed/);
assert.match(
  goalBoundHistoricalBlobFixtureIdentityRetry5Section,
  /execution_status=aborted-historical-byte-source-no-match/,
);
const goalBoundHistoricalBlobFixtureIdentityRetry5Output =
  goalBoundHistoricalBlobFixtureIdentityRetry5Section.match(
    /Only these 14 fields were recorded in this exact order:\r?\n\r?\n```text\r?\n([\s\S]*?)\r?\n```/,
  )?.[1];
assert.ok(goalBoundHistoricalBlobFixtureIdentityRetry5Output);
assert.deepEqual(
  goalBoundHistoricalBlobFixtureIdentityRetry5Output
    .split(/\r?\n/)
    .map((line) => line.slice(0, line.indexOf("="))),
  expectedRunnerContractRemediationFixtureIdentityDesignOutputKeys,
);
assert.match(
  goalBoundHistoricalBlobFixtureIdentityRetry5Section,
  /design_attempt_count=0[\s\S]*artifact_hash_match_count=0[\s\S]*runner_control_action_count=0[\s\S]*remediated_expectation_ordinal=unconfirmed[\s\S]*negative_fixture_transform_count=0[\s\S]*negative_fixture_sha256=not-run[\s\S]*fixture_pair_identity_sha256=not-run[\s\S]*fixture_pair_uniqueness_status=not-run[\s\S]*verifier_execution_status=not-run[\s\S]*artifact_change_status=not-run[\s\S]*execution_status=aborted[\s\S]*sanitized_output_review_status=pass[\s\S]*abort_status=triggered-historical-byte-source-no-match[\s\S]*unchecked_scope_status=recorded/,
);
const originalUntrackedFixtureIdentityRetry6Section = readiness.match(
  /^## CP1-S2AJ C1 Original Untracked Artifact Recovery And Fixture-Identity Design Retry-6 Consumed Abort Record$([\s\S]*?)^## CP1-S2AK C1 Structure Reducer And Fixture-Identity Design Retry-7 Consumed Abort Record$/m,
)?.[1];
assert.ok(originalUntrackedFixtureIdentityRetry6Section);
assert.match(
  originalUntrackedFixtureIdentityRetry6Section,
  /approval_id=CP1-A-C1-OPAQUE-RUNNER-GOAL-BOUND-ORIGINAL-UNTRACKED-ARTIFACT-RECOVERY-AND-FIXTURE-IDENTITY-DESIGN-RETRY-6/,
);
assert.match(
  originalUntrackedFixtureIdentityRetry6Section,
  /action_label=recover-bind-and-design-original-s2h-fixture-pair-once/,
);
assert.match(originalUntrackedFixtureIdentityRetry6Section, /approval_status=consumed/);
assert.match(
  originalUntrackedFixtureIdentityRetry6Section,
  /execution_status=aborted-fixture-expectation-identity-ambiguity/,
);
const originalUntrackedFixtureIdentityRetry6Output =
  originalUntrackedFixtureIdentityRetry6Section.match(
    /Only these 14 fields were recorded in this exact order:\r?\n\r?\n```text\r?\n([\s\S]*?)\r?\n```/,
  )?.[1];
assert.ok(originalUntrackedFixtureIdentityRetry6Output);
assert.deepEqual(
  originalUntrackedFixtureIdentityRetry6Output
    .split(/\r?\n/)
    .map((line) => line.slice(0, line.indexOf("="))),
  expectedRunnerContractRemediationFixtureIdentityDesignOutputKeys,
);
assert.match(
  originalUntrackedFixtureIdentityRetry6Section,
  /design_attempt_count=1[\s\S]*artifact_hash_match_count=3[\s\S]*runner_control_action_count=0[\s\S]*remediated_expectation_ordinal=unconfirmed[\s\S]*negative_fixture_transform_count=0[\s\S]*negative_fixture_sha256=not-run[\s\S]*fixture_pair_identity_sha256=not-run[\s\S]*fixture_pair_uniqueness_status=not-run[\s\S]*verifier_execution_status=not-run[\s\S]*artifact_change_status=not-run[\s\S]*execution_status=aborted[\s\S]*sanitized_output_review_status=pass[\s\S]*abort_status=triggered-fixture-expectation-identity-ambiguity[\s\S]*unchecked_scope_status=recorded/,
);
const structureReducerFixtureIdentityRetry7Section = readiness.match(
  /^## CP1-S2AK C1 Structure Reducer And Fixture-Identity Design Retry-7 Consumed Abort Record$([\s\S]*?)^## CP1-S2AL C1 Assert-Match Argument Reducer And Fixture-Identity Design Retry-8 Consumed Abort Record$/m,
)?.[1];
assert.ok(structureReducerFixtureIdentityRetry7Section);
assert.match(
  structureReducerFixtureIdentityRetry7Section,
  /approval_id=CP1-A-C1-OPAQUE-RUNNER-GOAL-BOUND-STRUCTURE-REDUCER-AND-FIXTURE-IDENTITY-DESIGN-RETRY-7/,
);
assert.match(
  structureReducerFixtureIdentityRetry7Section,
  /action_label=synthetic-preflight-then-reduce-and-design-original-s2h-fixture-pair-once/,
);
assert.match(structureReducerFixtureIdentityRetry7Section, /approval_status=consumed/);
assert.match(
  structureReducerFixtureIdentityRetry7Section,
  /execution_status=aborted-fixture-expectation-identity-ambiguity/,
);
const structureReducerFixtureIdentityRetry7Output =
  structureReducerFixtureIdentityRetry7Section.match(
    /Only these 14 fields were recorded in this exact order:\r?\n\r?\n```text\r?\n([\s\S]*?)\r?\n```/,
  )?.[1];
assert.ok(structureReducerFixtureIdentityRetry7Output);
assert.deepEqual(
  structureReducerFixtureIdentityRetry7Output
    .split(/\r?\n/)
    .map((line) => line.slice(0, line.indexOf("="))),
  expectedRunnerContractRemediationFixtureIdentityDesignOutputKeys,
);
assert.match(
  structureReducerFixtureIdentityRetry7Section,
  /design_attempt_count=1[\s\S]*artifact_hash_match_count=3[\s\S]*runner_control_action_count=0[\s\S]*remediated_expectation_ordinal=unconfirmed[\s\S]*negative_fixture_transform_count=0[\s\S]*negative_fixture_sha256=not-run[\s\S]*fixture_pair_identity_sha256=not-run[\s\S]*fixture_pair_uniqueness_status=not-run[\s\S]*verifier_execution_status=not-run[\s\S]*artifact_change_status=not-run[\s\S]*execution_status=aborted[\s\S]*sanitized_output_review_status=pass[\s\S]*abort_status=triggered-fixture-expectation-identity-ambiguity[\s\S]*unchecked_scope_status=recorded/,
);
const assertMatchArgumentReducerFixtureIdentityRetry8Section = readiness.match(
  /^## CP1-S2AL C1 Assert-Match Argument Reducer And Fixture-Identity Design Retry-8 Consumed Abort Record$([\s\S]*?)^## CP1-S2AM C1 Ordered Regex Window And Fixture-Identity Design Retry-9 Consumed Abort Record$/m,
)?.[1];
assert.ok(assertMatchArgumentReducerFixtureIdentityRetry8Section);
assert.match(
  assertMatchArgumentReducerFixtureIdentityRetry8Section,
  /approval_id=CP1-A-C1-OPAQUE-RUNNER-GOAL-BOUND-ASSERT-MATCH-ARGUMENT-REDUCER-AND-FIXTURE-IDENTITY-DESIGN-RETRY-8/,
);
assert.match(
  assertMatchArgumentReducerFixtureIdentityRetry8Section,
  /action_label=synthetic-preflight-then-reduce-assert-match-bindings-and-design-original-s2h-fixture-pair-once/,
);
assert.match(assertMatchArgumentReducerFixtureIdentityRetry8Section, /approval_status=consumed/);
assert.match(
  assertMatchArgumentReducerFixtureIdentityRetry8Section,
  /execution_status=aborted-assert-match-binding-ambiguity/,
);
const assertMatchArgumentReducerFixtureIdentityRetry8Output =
  assertMatchArgumentReducerFixtureIdentityRetry8Section.match(
    /Only these 14 fields were recorded in this exact order:\r?\n\r?\n```text\r?\n([\s\S]*?)\r?\n```/,
  )?.[1];
assert.ok(assertMatchArgumentReducerFixtureIdentityRetry8Output);
assert.deepEqual(
  assertMatchArgumentReducerFixtureIdentityRetry8Output
    .split(/\r?\n/)
    .map((line) => line.slice(0, line.indexOf("="))),
  expectedRunnerContractRemediationFixtureIdentityDesignOutputKeys,
);
assert.match(
  assertMatchArgumentReducerFixtureIdentityRetry8Section,
  /design_attempt_count=1[\s\S]*artifact_hash_match_count=3[\s\S]*runner_control_action_count=0[\s\S]*remediated_expectation_ordinal=unconfirmed[\s\S]*negative_fixture_transform_count=0[\s\S]*negative_fixture_sha256=not-run[\s\S]*fixture_pair_identity_sha256=not-run[\s\S]*fixture_pair_uniqueness_status=not-run[\s\S]*verifier_execution_status=not-run[\s\S]*artifact_change_status=not-run[\s\S]*execution_status=aborted[\s\S]*sanitized_output_review_status=pass[\s\S]*abort_status=triggered-assert-match-binding-ambiguity[\s\S]*unchecked_scope_status=recorded/,
);
const orderedRegexWindowFixtureIdentityRetry9Section = readiness.match(
  /^## CP1-S2AM C1 Ordered Regex Window And Fixture-Identity Design Retry-9 Consumed Abort Record$([\s\S]*?)^## CP1-S2AN C1 Ordered Regex Window And Fixture-Identity Design Retry-10 Consumed Abort Record$/m,
)?.[1];
assert.ok(orderedRegexWindowFixtureIdentityRetry9Section);
assert.match(
  orderedRegexWindowFixtureIdentityRetry9Section,
  /approval_id=CP1-A-C1-OPAQUE-RUNNER-GOAL-BOUND-ORDERED-REGEX-WINDOW-AND-FIXTURE-IDENTITY-DESIGN-RETRY-9/,
);
assert.match(
  orderedRegexWindowFixtureIdentityRetry9Section,
  /action_label=synthetic-preflight-then-reduce-ordered-regex-window-and-design-original-s2h-fixture-pair-once/,
);
assert.match(orderedRegexWindowFixtureIdentityRetry9Section, /approval_status=consumed/);
assert.match(
  orderedRegexWindowFixtureIdentityRetry9Section,
  /execution_status=aborted-synthetic-reducer-failure/,
);
const orderedRegexWindowFixtureIdentityRetry9Output =
  orderedRegexWindowFixtureIdentityRetry9Section.match(
    /Only these 14 fields were recorded in this exact order:\r?\n\r?\n```text\r?\n([\s\S]*?)\r?\n```/,
  )?.[1];
assert.ok(orderedRegexWindowFixtureIdentityRetry9Output);
assert.deepEqual(
  orderedRegexWindowFixtureIdentityRetry9Output
    .split(/\r?\n/)
    .map((line) => line.slice(0, line.indexOf("="))),
  expectedRunnerContractRemediationFixtureIdentityDesignOutputKeys,
);
assert.match(
  orderedRegexWindowFixtureIdentityRetry9Section,
  /design_attempt_count=0[\s\S]*artifact_hash_match_count=0[\s\S]*runner_control_action_count=0[\s\S]*remediated_expectation_ordinal=unconfirmed[\s\S]*negative_fixture_transform_count=0[\s\S]*negative_fixture_sha256=not-run[\s\S]*fixture_pair_identity_sha256=not-run[\s\S]*fixture_pair_uniqueness_status=not-run[\s\S]*verifier_execution_status=not-run[\s\S]*artifact_change_status=not-run[\s\S]*execution_status=aborted[\s\S]*sanitized_output_review_status=pass[\s\S]*abort_status=triggered-synthetic-reducer-failure[\s\S]*unchecked_scope_status=recorded/,
);
const orderedRegexWindowFixtureIdentityRetry10Section = readiness.match(
  /^## CP1-S2AN C1 Ordered Regex Window And Fixture-Identity Design Retry-10 Consumed Abort Record$([\s\S]*?)^## CP1-S2AO C1 Runtime Ordinal And Hash-Min Static-Invariant Fixture-Identity Design Consumed Pass Record$/m,
)?.[1];
assert.ok(orderedRegexWindowFixtureIdentityRetry10Section);
assert.match(
  orderedRegexWindowFixtureIdentityRetry10Section,
  /approval_id=CP1-A-C1-OPAQUE-RUNNER-GOAL-BOUND-ORDERED-REGEX-WINDOW-AND-FIXTURE-IDENTITY-DESIGN-RETRY-10/,
);
assert.match(orderedRegexWindowFixtureIdentityRetry10Section, /approval_status=consumed/);
assert.match(
  orderedRegexWindowFixtureIdentityRetry10Section,
  /execution_status=aborted-ordered-regex-window-ambiguity/,
);
const orderedRegexWindowFixtureIdentityRetry10Output =
  orderedRegexWindowFixtureIdentityRetry10Section.match(
    /Only these 14 fields were recorded in this exact order:\r?\n\r?\n```text\r?\n([\s\S]*?)\r?\n```/,
  )?.[1];
assert.ok(orderedRegexWindowFixtureIdentityRetry10Output);
assert.deepEqual(
  orderedRegexWindowFixtureIdentityRetry10Output
    .split(/\r?\n/)
    .map((line) => line.slice(0, line.indexOf("="))),
  expectedRunnerContractRemediationFixtureIdentityDesignOutputKeys,
);
assert.match(
  orderedRegexWindowFixtureIdentityRetry10Section,
  /design_attempt_count=1[\s\S]*artifact_hash_match_count=3[\s\S]*runner_control_action_count=0[\s\S]*remediated_expectation_ordinal=unconfirmed[\s\S]*negative_fixture_transform_count=0[\s\S]*negative_fixture_sha256=not-run[\s\S]*fixture_pair_identity_sha256=not-run[\s\S]*fixture_pair_uniqueness_status=not-run[\s\S]*verifier_execution_status=not-run[\s\S]*artifact_change_status=not-run[\s\S]*execution_status=aborted[\s\S]*sanitized_output_review_status=pass[\s\S]*abort_status=triggered-ordered-regex-window-ambiguity[\s\S]*unchecked_scope_status=recorded/,
);
const hashMinStaticInvariantFixtureIdentitySection = readiness.match(
  /^## CP1-S2AO C1 Runtime Ordinal And Hash-Min Static-Invariant Fixture-Identity Design Consumed Pass Record$([\s\S]*?)^## CP1-S2AP C1 Merged-Artifact Local Verification Closeout Consumed Pass Record$/m,
)?.[1];
assert.ok(hashMinStaticInvariantFixtureIdentitySection);
assert.match(
  hashMinStaticInvariantFixtureIdentitySection,
  /approval_id=CP1-A-C1-OPAQUE-RUNNER-GOAL-BOUND-RUNTIME-ORDINAL-AND-HASH-MIN-STATIC-INVARIANT-FIXTURE-IDENTITY-DESIGN/,
);
assert.match(hashMinStaticInvariantFixtureIdentitySection, /approval_status=consumed/);
assert.match(hashMinStaticInvariantFixtureIdentitySection, /execution_status=pass/);
assert.match(
  hashMinStaticInvariantFixtureIdentitySection,
  /canonical_operation_label=replace-hash-min-static-invariant-span-with-fixed-bang-sentinel/,
);
const hashMinStaticInvariantFixtureIdentityOutput =
  hashMinStaticInvariantFixtureIdentitySection.match(
    /Only these 14 fields were recorded in this exact order:\r?\n\r?\n```text\r?\n([\s\S]*?)\r?\n```/,
  )?.[1];
assert.ok(hashMinStaticInvariantFixtureIdentityOutput);
assert.deepEqual(
  hashMinStaticInvariantFixtureIdentityOutput
    .split(/\r?\n/)
    .map((line) => line.slice(0, line.indexOf("="))),
  expectedRunnerContractRemediationFixtureIdentityDesignOutputKeys,
);
assert.match(
  hashMinStaticInvariantFixtureIdentitySection,
  /design_attempt_count=1[\s\S]*artifact_hash_match_count=3[\s\S]*runner_control_action_count=0[\s\S]*remediated_expectation_ordinal=4[\s\S]*negative_fixture_transform_count=1[\s\S]*negative_fixture_sha256=27c258f6f081164f6ad8b4978b8007a89d7cea6df79054586498572db1975297[\s\S]*fixture_pair_identity_sha256=b015d75b881b169e2fb3aad6cca8da77792d54ee47c839e3a5e9a6e15f7457e5[\s\S]*fixture_pair_uniqueness_status=unique[\s\S]*verifier_execution_status=not-run[\s\S]*artifact_change_status=not-run[\s\S]*execution_status=pass[\s\S]*sanitized_output_review_status=pass[\s\S]*abort_status=not-triggered[\s\S]*unchecked_scope_status=recorded/,
);
assert.match(
  readiness,
  /^cp1_c1_goal_bound_hash_min_static_invariant_fixture_identity_approval_status=consumed$/m,
);
assert.match(
  readiness,
  /^cp1_c1_goal_bound_hash_min_static_invariant_fixture_identity_execution_status=pass$/m,
);
assert.match(
  readiness,
  new RegExp(
    `^cp1_c1_post_merge_authority_base=${c1EphemeralEntitlementBridgeBase}$`,
    "m",
  ),
);
assert.match(
  readiness,
  /^cp1_c1_merged_artifact_local_verification_approval_status=consumed$/m,
);
assert.match(
  readiness,
  /^cp1_c1_merged_artifact_local_verification_execution_status=pass$/m,
);
const mergedArtifactLocalVerificationSection = readiness.match(
  /^## CP1-S2AP C1 Merged-Artifact Local Verification Closeout Consumed Pass Record$([\s\S]*?)^## CP1-S2AQ C1 Adapter\/Read Consumer Local Verification Record$/m,
)?.[1];
assert.ok(mergedArtifactLocalVerificationSection);
assert.match(
  mergedArtifactLocalVerificationSection,
  /approval_id=CP1-A-C1-OPAQUE-RUNNER-MERGED-ARTIFACT-LOCAL-VERIFICATION-CLOSEOUT/,
);
assert.match(
  mergedArtifactLocalVerificationSection,
  /reviewed_revision=1570003959d6de8154a492d231dcfafa5a30c688/,
);
assert.match(
  mergedArtifactLocalVerificationSection,
  /runner_head_revision=f711d81cb582d76231db683434d43807c0281240/,
);
assert.match(
  mergedArtifactLocalVerificationSection,
  /artifact_byte_source=merged-git-blob-canonical-lf/,
);
assert.match(mergedArtifactLocalVerificationSection, /runner_full_contract_status=pass/);
assert.match(
  mergedArtifactLocalVerificationSection,
  /adapter_read_execution_consumer_status=not-implemented/,
);
const mergedArtifactLocalVerificationOutput =
  mergedArtifactLocalVerificationSection.match(
    /Only these 14 fields were recorded in this exact order:\r?\n\r?\n```text\r?\n([\s\S]*?)\r?\n```/,
  )?.[1];
assert.ok(mergedArtifactLocalVerificationOutput);
assert.deepEqual(
  mergedArtifactLocalVerificationOutput
    .split(/\r?\n/)
    .map((line) => line.slice(0, line.indexOf("="))),
  expectedRunnerContractRemediationFixtureIdentityDesignOutputKeys,
);
assert.match(
  mergedArtifactLocalVerificationSection,
  /design_attempt_count=1[\s\S]*artifact_hash_match_count=3[\s\S]*runner_control_action_count=0[\s\S]*remediated_expectation_ordinal=4[\s\S]*negative_fixture_transform_count=1[\s\S]*negative_fixture_sha256=27c258f6f081164f6ad8b4978b8007a89d7cea6df79054586498572db1975297[\s\S]*fixture_pair_identity_sha256=b015d75b881b169e2fb3aad6cca8da77792d54ee47c839e3a5e9a6e15f7457e5[\s\S]*fixture_pair_uniqueness_status=unique[\s\S]*verifier_execution_status=pass[\s\S]*artifact_change_status=not-run[\s\S]*execution_status=pass[\s\S]*sanitized_output_review_status=pass[\s\S]*abort_status=not-triggered[\s\S]*unchecked_scope_status=recorded/,
);
assert.match(
  readiness,
  /^cp1_c1_adapter_read_consumer_local_verification_status=pass$/m,
);
const adapterReadConsumerSection = readiness.match(
  /^## CP1-S2AQ C1 Adapter\/Read Consumer Local Verification Record$([\s\S]*?)^## CP1-S2AR C1 Ephemeral Input To Paid Entitlement Boundary Bridge Local Verification Record$/m,
)?.[1];
assert.ok(adapterReadConsumerSection);
assert.match(
  adapterReadConsumerSection,
  new RegExp(`reviewed_revision=${c1AdapterReadConsumerBase}`),
);
assert.match(
  adapterReadConsumerSection,
  /adapter_read_execution_consumer_status=implemented-local-synthetic-only/,
);
assert.match(
  adapterReadConsumerSection,
  /red_contract_status=pass-expected-missing-consumer[\s\S]*green_fixture_count=4[\s\S]*green_fixture_pass_count=4[\s\S]*green_fixture_fail_count=0[\s\S]*successful_read_attempt_count=1[\s\S]*fail_closed_read_attempt_count=1[\s\S]*zero_attempt_fixture_count=2[\s\S]*repeat_read_suppression_count=1[\s\S]*sanitized_result_field_count=4/,
);
assert.match(
  adapterReadConsumerSection,
  /No real adapter\/client initialization, remote read\/query\/RPC/,
);
assert.match(
  readiness,
  /^cp1_c1_post_merge_authority_base=b4409937b4ef637f3218c6d24e45a32ef20920ce$/m,
);
assert.match(
  readiness,
  /^cp1_c1_ephemeral_entitlement_bridge_local_verification_status=pass$/m,
);
const ephemeralEntitlementBridgeSection = readiness.match(
  /^## CP1-S2AR C1 Ephemeral Input To Paid Entitlement Boundary Bridge Local Verification Record$([\s\S]*?)^## Entitlement, Usage, Provider, And Capability Proof Rules$/m,
)?.[1];
assert.ok(ephemeralEntitlementBridgeSection);
assert.match(
  ephemeralEntitlementBridgeSection,
  new RegExp(`reviewed_revision=${c1EphemeralEntitlementBridgeBase}`),
);
assert.match(
  ephemeralEntitlementBridgeSection,
  /bridge_status=implemented-local-synthetic-only/,
);
assert.match(
  ephemeralEntitlementBridgeSection,
  /production_wiring_status=blocked-nonzeroizable-immutable-string-copy/,
);
assert.match(
  ephemeralEntitlementBridgeSection,
  /red_contract_status=pass-expected-missing-bridge[\s\S]*green_fixture_count=10[\s\S]*green_fixture_pass_count=10[\s\S]*green_fixture_fail_count=0[\s\S]*complete_available_factory_count=1[\s\S]*complete_available_client_count=1[\s\S]*complete_available_read_count=1[\s\S]*complete_missing_factory_count=1[\s\S]*complete_missing_client_count=1[\s\S]*complete_missing_read_count=1[\s\S]*incomplete_source_attempt_count=0[\s\S]*missing_source_attempt_count=0[\s\S]*factory_unavailable_read_count=0[\s\S]*factory_error_read_count=0[\s\S]*read_error_read_count=1[\s\S]*repeat_additional_attempt_count=0[\s\S]*stop_during_factory_additional_read_count=0[\s\S]*stop_during_read_success_count=0[\s\S]*stop_during_factory_prompt_settlement_count=1[\s\S]*stop_during_read_prompt_settlement_count=1[\s\S]*sanitized_result_field_count=4/,
);
assert.match(
  ephemeralEntitlementBridgeSection,
  /passes the original Buffer references without decoding or copying them/,
);
assert.match(
  ephemeralEntitlementBridgeSection,
  /No real constructor\/client initialization, adapter\/service invocation/,
);
assert.match(
  readiness,
  new RegExp(
    `PR #689 is merged at \`${c1ProductionConstructorCompatibilityBase}\``,
  ),
);
for (const source of [readiness, board, task]) {
  assert.match(
    source,
    /^(?:- )?production_constructor_compatibility_status=blocked-immutable-lifetime-unprovable$/m,
  );
  assert.match(
    source,
    /^(?:- )?production_wiring_status=disconnected-fail-closed$/m,
  );
  assert.match(
    source,
    /^(?:- )?sdk_internal_lifetime_status=dependency-blocked-unverified$/m,
  );
  assert.match(
    source,
    /^(?:- )?required_design_decision=approve-process-isolation-ownership-model-or-zeroizable-client-boundary$/m,
  );
  assert.match(source, new RegExp(c1ProcessIsolationDecisionBase));
  assert.match(source, new RegExp(c1ProcessIsolationDecisionHead));
  assert.match(
    source,
    /process_isolation_preflight_status=local-synthetic-pass-not-adopted/,
  );
  assert.match(
    source,
    /process_isolation_guarantee_decision=retain-buffer-zero-fill-do-not-replace-with-exit-containment/,
  );
  assert.match(
    source,
    /process_isolation_unverified_lifetime_status=ipc-runtime-os-sdk-unverified/,
  );
  assert.match(
    source,
    /process_isolation_recommendation=retain-disconnected-until-zeroizable-client-boundary-proven/,
  );
  assert.match(
    source,
    /process_isolation_explicit_approval_status=absent-required-for-guarantee-change/,
  );
  assert.match(
    source,
    /zeroizable_client_boundary_preflight_status=local-synthetic-pass-not-adopted/,
  );
  assert.match(
    source,
    /zeroizable_client_boundary_repository_contract_status=pass/,
  );
  assert.match(
    source,
    /zeroizable_client_boundary_production_api_status=absent-unverified/,
  );
  assert.match(
    source,
    /zeroizable_client_boundary_decision=retain-disconnected-fail-closed/,
  );
  assert.match(
    source,
    /zeroizable_client_boundary_required_api=exclusive-zeroizable-byte-ownership-copy-free-construction-read-explicit-dispose-ack/,
  );
  assert.match(
    source,
    /zeroizable_client_boundary_unverified_scope=node-v8-transport-os-sdk-internals/,
  );
  assert.match(
    source,
    /zeroizable_client_boundary_explicit_approval_status=absent-required-for-production-api-change/,
  );
  assert.match(
    source,
    /zeroizable_client_api_preflight_status=local-synthetic-pass-not-adopted/,
  );
  assert.match(
    source,
    /zeroizable_client_api_repository_contract_status=pass/,
  );
  assert.match(
    source,
    /zeroizable_client_api_production_candidate_status=absent-unverified/,
  );
  assert.match(
    source,
    /zeroizable_client_api_decision=retain-disconnected-fail-closed/,
  );
  assert.match(
    source,
    /zeroizable_client_api_required_shape=opaque-disjoint-ownership-synchronous-mutable-registry-single-read-synchronous-dispose-ack/,
  );
  assert.match(
    source,
    /zeroizable_client_api_unverified_scope=node-v8-unregistered-allocation-transport-os-sdk-internals/,
  );
  assert.match(
    source,
    /zeroizable_client_api_preflight_approval_status=consumed-design-synthetic-only/,
  );
  assert.match(
    source,
    /zeroizable_client_api_production_adoption_approval_status=absent-required-after-full-stack-proof/,
  );
  assert.match(source, new RegExp(c1ZeroizableClientApiHead));
  assert.match(source, new RegExp(c1ZeroizableClientApiMerge));
  assert.match(
    source,
    /zeroizable_client_candidate_source_preflight_status=local-source-audit-pass-not-adopted/,
  );
  assert.match(
    source,
    /zeroizable_client_candidate_source_inventory_status=4-classified-0-eligible-4-rejected/,
  );
  assert.match(
    source,
    /zeroizable_client_candidate_source_decision=retain-disconnected-fail-closed/,
  );
  assert.match(
    source,
    /zeroizable_client_candidate_source_unverified_scope=node-v8-native-transport-os-sdk-internals/,
  );
  assert.match(
    source,
    /zeroizable_client_candidate_source_approval_status=consumed-feasibility-synthetic-only/,
  );
  assert.match(
    source,
    /c1_guarantee_governance_preflight_status=local-decision-pass-review-ready/,
  );
  assert.match(
    source,
    /c1_guarantee_governance_route_count=3/,
  );
  assert.match(
    source,
    /c1_guarantee_governance_recommendation=operator-provided-exact-source-revision-wait/,
  );
  assert.match(
    source,
    /c1_guarantee_governance_process_isolation_risk_acceptance_status=absent-not-in-this-approval/,
  );
  assert.match(
    source,
    /c1_source_procurement_preflight_status=blocked-no-feasible-full-stack-candidate/,
  );
  assert.match(
    source,
    /c1_source_procurement_candidate_envelope_count=1/,
  );
  assert.match(
    source,
    /c1_source_procurement_candidate_id=node-libcurl-v5\.1\.2-libcurl-8\.17\.0-win32-x64-node-v127/,
  );
  assert.match(source, /c1_source_procurement_eligible_candidate_count=0/);
  assert.match(source, /c1_source_procurement_proven_proof_count=0/);
  assert.match(
    source,
    /c1_source_procurement_residual_risk_acceptance_status=absent-not-in-this-approval/,
  );
}
assert.match(
  readiness,
  /^cp1_c1_zeroizable_client_boundary_preflight_status=local-synthetic-pass-not-adopted$/m,
);
const zeroizableClientBoundarySection = readiness.match(
  /^## CP1-S2AU C1 Zeroizable-Client Boundary Decision Preflight$([\s\S]*?)^## Entitlement, Usage, Provider, And Capability Proof Rules$/m,
)?.[1];
assert.ok(zeroizableClientBoundarySection);
assert.match(
  zeroizableClientBoundarySection,
  new RegExp(`reviewed_revision=${c1ProcessIsolationDecisionBase}`),
);
assert.match(
  zeroizableClientBoundarySection,
  /red_contract_status=pass-expected-missing-implementation[\s\S]*green_fixture_count=13[\s\S]*green_fixture_pass_count=13[\s\S]*green_fixture_fail_count=0[\s\S]*successful_available_factory_read_dispose_count=1\/1\/1[\s\S]*successful_missing_factory_read_dispose_count=1\/1\/1[\s\S]*factory_error_factory_read_dispose_count=1\/0\/0[\s\S]*factory_unavailable_factory_read_dispose_count=1\/0\/0[\s\S]*read_error_factory_read_dispose_count=1\/1\/1[\s\S]*dispose_error_acknowledgement_count=0[\s\S]*dispose_unverified_fixture_count=2[\s\S]*dispose_unverified_acknowledgement_count=0[\s\S]*stop_during_factory_factory_read_dispose_count=1\/0\/1[\s\S]*stop_during_read_factory_read_dispose_count=1\/1\/1[\s\S]*stop_during_dispose_factory_read_dispose_count=1\/1\/1[\s\S]*stop_request_count=3[\s\S]*late_success_suppression_count=2[\s\S]*post_settlement_repeat_suppression_count=1[\s\S]*repository_buffer_zero_fill_count_per_settled_fixture=2[\s\S]*zero_fill_completion_count_per_settled_fixture=2[\s\S]*sanitized_result_field_count=12/,
);
assert.match(
  zeroizableClientBoundarySection,
  /A synthetic injected client proves only the repository contract above/,
);
assert.match(
  zeroizableClientBoundarySection,
  /They do not prove an elapsed-time bound when a client ignores abort/,
);
const zeroizableClientApiSection = readiness.match(
  /^## CP1-S2AV C1 Zeroizable-Client Adapter\/Client API Design And Synthetic Implementation Preflight$([\s\S]*?)^## CP1-S2AW C1 Zeroizable-Client Production Candidate Source Feasibility Preflight$/m,
)?.[1];
assert.ok(zeroizableClientApiSection);
assert.match(
  zeroizableClientApiSection,
  /base_revision=622a4804bfd42293ea6305d960b01e0cf7e35ba0[\s\S]*candidate_revision=working-tree-uncommitted-review-ready-local-diff/,
);
assert.match(
  zeroizableClientApiSection,
  /green_fixture_count=20[\s\S]*green_fixture_pass_count=20[\s\S]*green_fixture_fail_count=0[\s\S]*getter_boundary_error_fixture_count=2[\s\S]*dispose_reentrant_stop_suppression_count=1[\s\S]*registered_internal_zero_fill_fixture_count=12[\s\S]*registered_internal_zero_fill_pass_count=12[\s\S]*post_stop_late_mutation_rezero_fill_count=1[\s\S]*maximum_factory_read_dispose_attempt_count=1\/1\/1[\s\S]*sanitized_result_field_count=15/,
);
assert.match(
  zeroizableClientApiSection,
  /The registry proves all buffers registered by the synthetic client, not that an arbitrary client registers every allocation/,
);
assert.match(
  zeroizableClientApiSection,
  /No production adoption approval exists/,
);
const zeroizableClientCandidateSourceSection = readiness.match(
  /^## CP1-S2AW C1 Zeroizable-Client Production Candidate Source Feasibility Preflight$([\s\S]*?)^## CP1-S2AX C1 Guarantee-Governance Decision Preflight$/m,
)?.[1];
assert.ok(zeroizableClientCandidateSourceSection);
assert.match(
  zeroizableClientCandidateSourceSection,
  new RegExp(
    `PR #693 is merged at \\\`${c1ZeroizableClientApiMerge}\\\`[\\s\\S]*reviewed head \\\`${c1ZeroizableClientApiHead}\\\``,
  ),
);
assert.match(
  zeroizableClientCandidateSourceSection,
  /candidate_class_count=4[\s\S]*eligible_candidate_count=0[\s\S]*rejected_candidate_count=4[\s\S]*sanitized_result_field_count=27/,
);
assert.match(
  zeroizableClientCandidateSourceSection,
  /Current production SDK\/client[\s\S]*Lockfile-only alternatives[\s\S]*Node built-in HTTP\/fetch\/net\/TLS[\s\S]*Custom byte-only boundary/,
);
assert.match(
  zeroizableClientCandidateSourceSection,
  /Repository -> Node\/V8 -> native transport -> OS -> SDK\/client/,
);
assert.match(
  zeroizableClientCandidateSourceSection,
  /No candidate has source-backed proof of synchronous abort read quiescence, synchronous full-stack dispose acknowledgement, or complete downstream zeroization/,
);
assert.ok(
  zeroizableClientCandidateSourceSection
    .replace(/\r\n/g, "\n")
    .includes(c1ZeroizableClientCandidateSourceOutput.replace(/\r\n/g, "\n")),
);
assert.match(
  readiness,
  /repository_normalization_count=2[\s\S]*repository_constructor_argument_count=2[\s\S]*synthetic_buffer_zero_fill_count=1[\s\S]*synthetic_immutable_copy_survival_count=2[\s\S]*real_constructor_attempt_count=0[\s\S]*real_client_call_count=0[\s\S]*remote_read_attempt_count=0/,
);
assert.match(readiness, /effective_plan=Free/);
assert.match(readiness, /paid_access=inactive/);
assert.match(
  readiness,
  /Remote\/deployed unreadable-state behavior: not-run \/ approval-gated/,
);

assert.match(board, new RegExp(`C12[\\s\\S]*${integrationBase}`));
assert.match(board, /^## CP1 Acceptance Boundary$/m);
assert.match(board, /72 independent approval units/);
assert.match(task, /72 independent approval units/);
assert.match(
  board,
  /\| CP1 \| Creator paid launch readiness \| local readiness complete; external evidence blocked \/ approval-gated \|/,
);
assert.match(task, new RegExp(`C12[\\s\\S]*${integrationBase}`));
assert.match(
  task,
  /\| CP1 \| Creator paid launch readiness \| local readiness complete; external evidence blocked \/ approval-gated \|/,
);

for (const [label, source] of [
  [readinessPath, readiness],
  [externalEvidenceReconciliationPath, externalEvidenceReconciliation],
  [boardPath, board],
  [taskPath, task],
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([
  readinessPath,
  externalEvidenceReconciliationPath,
  boardPath,
  taskPath,
  "app/api/comment-translator/creator-paid/readiness/route.ts",
  "lib/comment-translator-creator-paid-readiness.ts",
  "scripts/comment-translator-creator-cp1-paid-launch-readiness-contract.mjs",
  "scripts/comment-translator-creator-cp1-reference-presence-route-contract.mjs",
  "scripts/comment-translator-creator-c1-runtime-role-classifier.mjs",
  "scripts/comment-translator-creator-c1-runtime-role-classifier-contract.mjs",
  "scripts/comment-translator-creator-c1-production-constructor-compatibility-contract.mjs",
  "scripts/comment-translator-creator-c1-process-isolation-preflight.mjs",
  "scripts/comment-translator-creator-c1-process-isolation-preflight-contract.mjs",
  "scripts/comment-translator-creator-c1-zeroizable-client-boundary-preflight.mjs",
  "scripts/comment-translator-creator-c1-zeroizable-client-boundary-preflight-contract.mjs",
  "scripts/comment-translator-creator-c1-zeroizable-client-api-preflight.mjs",
  "scripts/comment-translator-creator-c1-zeroizable-client-api-preflight-ownership.mjs",
  "scripts/comment-translator-creator-c1-zeroizable-client-api-preflight-contract.mjs",
  "scripts/comment-translator-creator-c1-zeroizable-client-candidate-source-preflight.mjs",
  "scripts/comment-translator-creator-c1-zeroizable-client-candidate-source-preflight-contract.mjs",
  "scripts/comment-translator-creator-c1-guarantee-governance-decision-preflight-contract.mjs",
  "scripts/comment-translator-creator-c1-production-source-procurement-preflight-contract.mjs",
  "scripts/comment-translator-creator-c12-final-qa-readiness-contract.mjs",
  "scripts/comment-translator-task-board-creator-roadmap-contract.mjs",
]);
const sourceProcurementResearchPrefix =
  "docs/archive/2026-07-28-c1-production-source-procurement-ulw-research/";
const approvedRunnerFiles = new Set([
  "scripts/comment-translator-creator-c1-ephemeral-entitlement-bridge.mjs",
  "scripts/comment-translator-creator-c1-ephemeral-entitlement-bridge-contract.mjs",
  "scripts/comment-translator-creator-c1-ephemeral-runner.mjs",
  "scripts/comment-translator-creator-c1-ephemeral-runner.ps1",
  "scripts/comment-translator-creator-c1-ephemeral-runner-contract.mjs",
]);
for (const file of changedFiles()) {
  assert.ok(
    allowedChangedFiles.has(file) ||
      approvedRunnerFiles.has(file) ||
      file.startsWith(sourceProcurementResearchPrefix),
    `CP1 change stays in its explicitly approved scope: ${file}`,
  );
}

console.log("comment translator creator CP1 paid launch readiness contract passed");
