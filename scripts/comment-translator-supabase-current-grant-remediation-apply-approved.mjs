import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const supabaseEntrypoint = path.join(root, "node_modules", "supabase", "dist", "supabase.js");
const linkMetadataPath = path.join(root, "supabase", ".temp", "linked-project.json");
const triageRunner = path.join(
  root,
  "scripts",
  "comment-translator-supabase-current-grant-drift-readonly-triage.mjs"
);
const defaultPrivilegesRunner = path.join(
  root,
  "scripts",
  "comment-translator-supabase-default-privileges-remediation-apply-preflight-readonly.mjs"
);

const exactApproval =
  "I approve remote Supabase current-grant remediation against the currently linked project only. Scope is revoking TRUNCATE on public.usage_quotas from authenticated only, using the reviewed SQL in docs/active/COMMENT_TRANSLATOR_SUPABASE_CURRENT_GRANT_REMEDIATION_APPROVAL_PREFLIGHT.md. Keep evidence sanitized to pass/fail/count/status/table/role/privilege labels only. Do not run db push, repair, reset, deploy/upload, public gate flip, live/provider/OAuth/Stripe actions, row mutation, policy rewrite, default-privileges remediation/apply, owner-specific default-privileges block, raw response capture, browser storage capture, credential exposure, or public access change.";

const currentGrantKeys = [
  "remote_current_grant_drift_query_status",
  "remote_current_grant_drift_count",
  "remote_current_grant_drift_breakdown_count",
  "remote_usage_quotas_authenticated_write_drift_count",
  "remote_anon_grant_drift_breakdown_count",
  "remote_server_only_authenticated_grant_drift_breakdown_count",
  "grant_drift_table_label",
  "grant_drift_role_label",
  "grant_drift_privilege_type_label",
  "grant_drift_count",
  "remote_current_grant_drift_status"
];

const defaultPrivilegeKeys = [
  "remote_catalog_query_status",
  "remote_grant_status",
  "remote_default_acl_owner_status",
  "remote_unexpected_default_grant_count",
  "remote_default_privileges_status",
  "owner_specific_block_required_status"
];

function parseLabels(output, keys) {
  const data = {};
  for (const key of keys) {
    const match = output.match(new RegExp(`${key}=([A-Za-z0-9_.-]+)`));
    if (match) data[key] = /^\d+$/.test(match[1]) ? Number(match[1]) : match[1];
  }
  return data;
}

function classifyFailure(output) {
  if (/not logged in|login|access token|auth|token/i.test(output)) return "auth-unavailable";
  if (/project ref|linked|link/i.test(output)) return "link-unavailable";
  if (/network|timeout|dns|connect|ECONN|fetch/i.test(output)) return "network-unavailable";
  if (/unknown flag|invalid|usage|accepts|argument/i.test(output)) return "cli-invocation-unavailable";
  if (/permission|denied|forbidden|401|403/i.test(output)) return "permission-unavailable";
  if (/docker|container|daemon/i.test(output)) return "docker-unavailable";
  if (/failed|error/i.test(output)) return "remote-query-error";
  return "unknown";
}

function printBlocked(reason) {
  console.log(`remote_current_grant_apply_failure_reason=${reason}`);
  console.log("remote_current_grant_apply_preflight_status=blocked");
  console.log("remote_current_grant_remediation_status=not-run");
  console.log("remote_mutation_status=not-run");
  console.log("public_release_capable_status=no");
}

function runNodeRunner(scriptPath, keys) {
  const result = spawnSync(process.execPath, [scriptPath], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024
  });

  if (result.status !== 0) {
    return { ok: false, reason: "runner-unavailable", data: {} };
  }

  const data = parseLabels(result.stdout || "", keys);
  if (keys.some((key) => data[key] === undefined)) {
    return { ok: false, reason: "unparsed-sanitized-result", data };
  }

  return { ok: true, reason: "ok", data };
}

function printPhase(prefix, data, keys) {
  for (const key of keys) {
    console.log(`${prefix}${key}=${data[key]}`);
  }
}

function isExpectedPreApplyCurrentGrantDrift(data) {
  return (
    data.remote_current_grant_drift_query_status === "pass" &&
    data.remote_current_grant_drift_count === 1 &&
    data.remote_current_grant_drift_breakdown_count === 1 &&
    data.remote_usage_quotas_authenticated_write_drift_count === 1 &&
    data.remote_anon_grant_drift_breakdown_count === 0 &&
    data.remote_server_only_authenticated_grant_drift_breakdown_count === 0 &&
    data.grant_drift_table_label === "public.usage_quotas" &&
    data.grant_drift_role_label === "authenticated" &&
    data.grant_drift_privilege_type_label === "TRUNCATE" &&
    data.grant_drift_count === 1 &&
    data.remote_current_grant_drift_status === "fail"
  );
}

function isExpectedPostApplyCurrentGrantPosture(data) {
  return (
    data.remote_current_grant_drift_query_status === "pass" &&
    data.remote_current_grant_drift_count === 0 &&
    data.remote_current_grant_drift_breakdown_count === 0 &&
    data.remote_usage_quotas_authenticated_write_drift_count === 0 &&
    data.remote_anon_grant_drift_breakdown_count === 0 &&
    data.remote_server_only_authenticated_grant_drift_breakdown_count === 0 &&
    data.grant_drift_table_label === "none" &&
    data.grant_drift_role_label === "none" &&
    data.grant_drift_privilege_type_label === "none" &&
    data.grant_drift_count === 0 &&
    data.remote_current_grant_drift_status === "pass"
  );
}

function hasExpectedDefaultPrivilegeBlocker(data) {
  return (
    data.remote_catalog_query_status === "pass" &&
    data.remote_default_privileges_status === "fail" &&
    data.remote_unexpected_default_grant_count === 48 &&
    data.remote_default_acl_owner_status === "mixed-or-non-postgres" &&
    data.owner_specific_block_required_status === "yes"
  );
}

function runReviewedMutation() {
  const sql = "revoke truncate on table public.usage_quotas from authenticated;";
  const result = spawnSync(process.execPath, [supabaseEntrypoint, "db", "query", sql, "--linked"], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024
  });

  if (result.status !== 0) {
    return { ok: false, reason: classifyFailure(`${result.stdout || ""}\n${result.stderr || ""}`) };
  }

  return { ok: true, reason: "ok" };
}

console.log(`cli_status=${fs.existsSync(supabaseEntrypoint) ? "local-cli-present" : "local-cli-missing"}`);
console.log(
  `link_status=${fs.existsSync(linkMetadataPath) ? "supabase-link-metadata-present" : "supabase-link-metadata-missing"}`
);

if (!fs.existsSync(supabaseEntrypoint) || !fs.existsSync(linkMetadataPath)) {
  printBlocked("cli-or-link-unavailable");
  process.exit(0);
}

const approval = process.env.COMMENT_TRANSLATOR_SUPABASE_CURRENT_GRANT_REMEDIATION_APPROVAL || "";
const approvalPresent = approval === exactApproval;
console.log(`same_thread_exact_approval_status=${approvalPresent ? "present" : "absent"}`);
console.log(
  `remote_current_grant_remediation_approval_status=${approvalPresent ? "present" : "absent"}`
);

if (!approvalPresent) {
  printBlocked("exact-approval-absent");
  process.exit(0);
}

const preCurrent = runNodeRunner(triageRunner, currentGrantKeys);
if (!preCurrent.ok) {
  printBlocked(preCurrent.reason);
  process.exit(0);
}
printPhase("pre_", preCurrent.data, currentGrantKeys);

const preDefault = runNodeRunner(defaultPrivilegesRunner, defaultPrivilegeKeys);
if (!preDefault.ok) {
  printBlocked(preDefault.reason);
  process.exit(0);
}
printPhase("pre_", preDefault.data, defaultPrivilegeKeys);

const preApplyPass =
  isExpectedPreApplyCurrentGrantDrift(preCurrent.data) &&
  hasExpectedDefaultPrivilegeBlocker(preDefault.data);

console.log(`remote_current_grant_preapply_expected_drift_status=${preApplyPass ? "pass" : "fail"}`);

if (!preApplyPass) {
  printBlocked("unexpected-preapply-posture");
  process.exit(0);
}

console.log("remote_current_grant_apply_preflight_status=pass");

const apply = runReviewedMutation();
if (!apply.ok) {
  printBlocked(apply.reason);
  process.exit(0);
}

const postCurrent = runNodeRunner(triageRunner, currentGrantKeys);
if (!postCurrent.ok) {
  printBlocked(postCurrent.reason);
  process.exit(0);
}
printPhase("", postCurrent.data, currentGrantKeys);

const postDefault = runNodeRunner(defaultPrivilegesRunner, defaultPrivilegeKeys);
if (!postDefault.ok) {
  printBlocked(postDefault.reason);
  process.exit(0);
}
printPhase("", postDefault.data, defaultPrivilegeKeys);

const postApplyPass =
  isExpectedPostApplyCurrentGrantPosture(postCurrent.data) &&
  postDefault.data.remote_grant_status === "pass" &&
  hasExpectedDefaultPrivilegeBlocker(postDefault.data);

console.log(`remote_current_grant_postapply_verification_status=${postApplyPass ? "pass" : "fail"}`);
console.log(
  `remote_current_grant_remediation_status=${postApplyPass ? "pass" : "verification-failed"}`
);
console.log(
  `remote_mutation_scope_status=${postApplyPass ? "current-grant-truncate-only" : "unverified"}`
);
console.log(`remote_mutation_status=${postApplyPass ? "applied" : "verification-failed"}`);
console.log("public_release_capable_status=no");

process.exit(postApplyPass ? 0 : 1);
