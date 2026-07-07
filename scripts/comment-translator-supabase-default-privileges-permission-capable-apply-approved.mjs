import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const privilegedPreflightRunner = path.join(
  root,
  "scripts",
  "comment-translator-supabase-default-privileges-privileged-apply-path-preflight-readonly.mjs"
);
const approvedApplyRunner = path.join(
  root,
  "scripts",
  "comment-translator-supabase-default-privileges-remediation-apply-approved.mjs"
);

const exactApproval =
  "I approve remote Supabase default-privileges remediation against the currently linked project only. Scope is future public object default privileges only, using the reviewed SQL in docs/active/COMMENT_TRANSLATOR_SUPABASE_DEFAULT_PRIVILEGES_REMOTE_REMEDIATION_EXECUTION_PREFLIGHT.md and an operator-local owner-specific block only if the same-process sanitized owner preflight still reports mixed-or-non-postgres. Keep evidence sanitized to pass/fail/count/status labels only. Do not run db push, repair, reset, deploy/upload, public gate flip, live/provider/OAuth/Stripe actions, row mutation, current-table grant/policy rewrite, raw response capture, browser storage capture, credential exposure, or public access change.";

const preflightKeys = [
  "cli_status",
  "link_status",
  "same_thread_exact_approval_status",
  "remote_apply_approval_status",
  "remote_catalog_query_status",
  "remote_table_count",
  "remote_expected_table_count",
  "remote_expected_missing_count",
  "remote_rls_disabled_count",
  "remote_rls_status",
  "remote_anon_grant_count",
  "remote_server_only_authenticated_grant_count",
  "remote_readonly_authenticated_write_grant_count",
  "remote_browser_owned_expected_grant_count",
  "remote_browser_readonly_expected_grant_count",
  "remote_grant_status",
  "remote_default_acl_query_status",
  "remote_default_acl_entry_count",
  "remote_default_acl_postgres_owner_entry_count",
  "remote_default_acl_other_owner_entry_count",
  "remote_default_acl_owner_status",
  "remote_browser_or_service_default_grant_count",
  "remote_public_default_grant_count",
  "remote_unexpected_default_grant_count",
  "remote_default_privileges_status",
  "owner_specific_block_required_status",
  "owner_specific_private_value_exposure_status",
  "owner_specific_block_review_status",
  "owner_specific_block_apply_status",
  "remote_default_privileges_owner_specific_preflight_status",
  "remote_owner_specific_apply_permission_query_status",
  "remote_default_acl_owner_count",
  "remote_default_acl_owner_membership_available_count",
  "remote_default_acl_owner_membership_missing_count",
  "remote_owner_specific_apply_required_owner_count",
  "remote_owner_specific_apply_permission_available_count",
  "remote_owner_specific_apply_permission_missing_count",
  "remote_owner_specific_apply_permission_status",
  "remote_default_privileges_apply_permission_status",
  "remote_default_privileges_privileged_apply_path_status"
];

const applyKeys = [
  "remote_default_privileges_apply_preflight_status",
  "remote_default_privileges_apply_failure_reason",
  "remote_default_privileges_apply_status",
  "remote_default_privileges_postapply_verification_status",
  "remote_default_privileges_remediation_status",
  "remote_mutation_scope_status",
  "remote_remediation_apply_status",
  "remote_mutation_status",
  "public_release_capable_status"
];

function parseLabels(output, keys) {
  const data = {};
  for (const key of keys) {
    const match = output.match(new RegExp(`${key}=([A-Za-z0-9_.-]+)`));
    if (match) data[key] = /^\d+$/.test(match[1]) ? Number(match[1]) : match[1];
  }
  return data;
}

function printLabels(data, keys, prefix = "") {
  for (const key of keys) {
    if (data[key] !== undefined) console.log(`${prefix}${key}=${data[key]}`);
  }
}

function printNotRun(reason) {
  console.log(`remote_default_privileges_permission_capable_apply_preflight_status=${reason}`);
  console.log("permission_capable_apply_runner_status=not-run");
  console.log("remote_default_privileges_apply_status=not-run");
  console.log("remote_default_privileges_remediation_status=not-run");
  console.log("remote_remediation_apply_status=not-run");
  console.log("remote_mutation_status=not-run");
  console.log("public_release_capable_status=no");
}

const approvalPresent =
  (process.env.COMMENT_TRANSLATOR_SUPABASE_DEFAULT_PRIVILEGES_REMEDIATION_APPROVAL || "") ===
  exactApproval;

const preflight = spawnSync(process.execPath, [privilegedPreflightRunner], {
  encoding: "utf8",
  env: process.env,
  maxBuffer: 1024 * 1024
});

if (preflight.status !== 0) {
  console.log("remote_default_privileges_permission_capable_apply_preflight_status=blocked-preflight-runner-unavailable");
  console.log("permission_capable_apply_runner_status=not-run");
  console.log("remote_remediation_apply_status=not-run");
  console.log("remote_mutation_status=not-run");
  console.log("public_release_capable_status=no");
  process.exit(0);
}

const preflightData = parseLabels(preflight.stdout || "", preflightKeys);
printLabels(preflightData, preflightKeys);

if (!approvalPresent || preflightData.same_thread_exact_approval_status !== "present") {
  printNotRun("blocked-exact-approval-absent");
  process.exit(0);
}

const permissionCapable =
  preflightData.remote_catalog_query_status === "pass" &&
  preflightData.remote_expected_missing_count === 0 &&
  preflightData.remote_rls_status === "pass" &&
  preflightData.remote_grant_status === "pass" &&
  preflightData.remote_default_privileges_status === "fail" &&
  preflightData.remote_default_privileges_privileged_apply_path_status === "available" &&
  preflightData.remote_owner_specific_apply_permission_status === "pass" &&
  preflightData.remote_default_privileges_apply_permission_status === "pass";

if (!permissionCapable) {
  const blockedReason =
    preflightData.remote_default_privileges_privileged_apply_path_status === "blocked-permission-unavailable"
      ? "blocked-permission-unavailable"
      : "blocked-unexpected-preapply-posture";
  printNotRun(blockedReason);
  process.exit(0);
}

console.log("remote_default_privileges_permission_capable_apply_preflight_status=pass");
console.log("permission_capable_apply_runner_status=executed");

const apply = spawnSync(process.execPath, [approvedApplyRunner], {
  encoding: "utf8",
  env: process.env,
  maxBuffer: 1024 * 1024
});

const applyData = parseLabels(apply.stdout || "", applyKeys);
printLabels(applyData, applyKeys);

if (applyData.remote_mutation_status === undefined) {
  console.log("remote_default_privileges_apply_status=blocked-apply-result-unparsed");
  console.log("remote_default_privileges_remediation_status=blocked-apply-result-unparsed");
  console.log("remote_remediation_apply_status=blocked-apply-result-unparsed");
  console.log("remote_mutation_status=unverified");
  console.log("public_release_capable_status=no");
}
