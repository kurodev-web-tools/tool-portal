import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const supabaseEntrypoint = path.join(root, "node_modules", "supabase", "dist", "supabase.js");
const ownerPreflightRunner = path.join(
  root,
  "scripts",
  "comment-translator-supabase-default-privileges-owner-specific-preflight-readonly.mjs"
);
const linkMetadataPaths = [
  path.join(root, "supabase", ".temp", "project-ref"),
  path.join(root, "supabase", ".temp", "linked-project.json")
];

const exactApproval =
  "I approve remote Supabase default-privileges remediation against the currently linked project only. Scope is future public object default privileges only, using the reviewed SQL in docs/active/COMMENT_TRANSLATOR_SUPABASE_DEFAULT_PRIVILEGES_REMOTE_REMEDIATION_EXECUTION_PREFLIGHT.md and an operator-local owner-specific block only if the same-process sanitized owner preflight still reports mixed-or-non-postgres. Keep evidence sanitized to pass/fail/count/status labels only. Do not run db push, repair, reset, deploy/upload, public gate flip, live/provider/OAuth/Stripe actions, row mutation, current-table grant/policy rewrite, raw response capture, browser storage capture, credential exposure, or public access change.";

const postureKeys = [
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
  "owner_specific_block_required_status"
];

const ownerPreflightKeys = [
  ...postureKeys,
  "owner_specific_private_value_exposure_status",
  "owner_specific_block_review_status",
  "owner_specific_block_apply_status",
  "remote_default_privileges_owner_specific_preflight_status"
];

const permissionKeys = [
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

const permissionSql = String.raw`
with default_acl_owners as (
  select distinct owner_role.oid, owner_role.rolname
  from pg_default_acl d
  join pg_namespace n on n.oid = d.defaclnamespace and n.nspname = 'public'
  join pg_roles owner_role on owner_role.oid = d.defaclrole
), metrics as (
  select
    count(*) as remote_default_acl_owner_count,
    count(*) filter (where pg_has_role(oid, 'MEMBER')) as remote_default_acl_owner_membership_available_count,
    count(*) filter (where not pg_has_role(oid, 'MEMBER')) as remote_default_acl_owner_membership_missing_count,
    count(*) filter (where rolname <> 'postgres') as remote_owner_specific_apply_required_owner_count,
    count(*) filter (where rolname <> 'postgres' and pg_has_role(oid, 'MEMBER')) as remote_owner_specific_apply_permission_available_count,
    count(*) filter (where rolname <> 'postgres' and not pg_has_role(oid, 'MEMBER')) as remote_owner_specific_apply_permission_missing_count
  from default_acl_owners
)
select unnest(array[
  'remote_owner_specific_apply_permission_query_status=pass',
  'remote_default_acl_owner_count=' || remote_default_acl_owner_count::text,
  'remote_default_acl_owner_membership_available_count=' || remote_default_acl_owner_membership_available_count::text,
  'remote_default_acl_owner_membership_missing_count=' || remote_default_acl_owner_membership_missing_count::text,
  'remote_owner_specific_apply_required_owner_count=' || remote_owner_specific_apply_required_owner_count::text,
  'remote_owner_specific_apply_permission_available_count=' || remote_owner_specific_apply_permission_available_count::text,
  'remote_owner_specific_apply_permission_missing_count=' || remote_owner_specific_apply_permission_missing_count::text,
  'remote_owner_specific_apply_permission_status=' || case when remote_owner_specific_apply_permission_missing_count = 0 then 'pass' else 'blocked-permission-unavailable' end,
  'remote_default_privileges_apply_permission_status=' || case when remote_default_acl_owner_membership_missing_count = 0 then 'pass' else 'blocked-permission-unavailable' end,
  'remote_default_privileges_privileged_apply_path_status=' || case when remote_default_acl_owner_membership_missing_count = 0 then 'available' else 'blocked-permission-unavailable' end
]) as sanitized_label
from metrics;
`;

function parseLabels(output, keys) {
  const data = {};
  for (const key of keys) {
    const match = output.match(new RegExp(`${key}=([A-Za-z0-9_.-]+)`));
    if (match) data[key] = /^\d+$/.test(match[1]) ? Number(match[1]) : match[1];
  }
  return data;
}

function classifyFailure(output) {
  if (/not logged in|login required|access token|authentication|token/i.test(output)) {
    return "auth-unavailable";
  }
  if (/project ref|linked|link/i.test(output)) return "link-unavailable";
  if (/syntax error|unterminated|parse|function .* does not exist/i.test(output)) {
    return "sql-shape-unavailable";
  }
  if (/must be (?:owner|member)|permission denied|permission|denied|forbidden|401|403/i.test(output)) {
    return "permission-unavailable";
  }
  if (/network|timeout|dns|connect|ECONN|fetch/i.test(output)) return "network-unavailable";
  if (/unknown flag|invalid|usage|accepts|argument/i.test(output)) return "cli-invocation-unavailable";
  if (/docker|container|daemon/i.test(output)) return "docker-unavailable";
  if (/failed|error/i.test(output)) return "remote-query-error";
  return "unknown";
}

function printBlocked(reason) {
  console.log(`remote_default_privileges_privileged_apply_path_failure_reason=${reason}`);
  console.log("remote_owner_specific_apply_permission_query_status=fail");
  console.log("remote_owner_specific_apply_permission_status=blocked-readonly-preflight-unavailable");
  console.log("remote_default_privileges_apply_permission_status=blocked-readonly-preflight-unavailable");
  console.log("remote_default_privileges_privileged_apply_path_status=blocked-readonly-preflight-unavailable");
  console.log("remote_remediation_apply_status=not-run");
  console.log("remote_mutation_status=not-run");
  console.log("public_release_capable_status=no");
}

function runOwnerPreflight() {
  const result = spawnSync(process.execPath, [ownerPreflightRunner], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024
  });

  if (result.status !== 0) {
    return { ok: false, reason: "owner-preflight-runner-unavailable", data: {} };
  }

  const data = parseLabels(result.stdout || "", ownerPreflightKeys);
  if (ownerPreflightKeys.some((key) => data[key] === undefined)) {
    return { ok: false, reason: "owner-preflight-unparsed", data };
  }

  return { ok: true, reason: "ok", data };
}

function runPermissionPreflight() {
  const result = spawnSync(process.execPath, [supabaseEntrypoint, "db", "query", permissionSql, "--linked"], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024
  });

  if (result.status !== 0) {
    return {
      ok: false,
      reason: classifyFailure(`${result.stdout || ""}\n${result.stderr || ""}`),
      data: {}
    };
  }

  const data = parseLabels(result.stdout || "", permissionKeys);
  if (permissionKeys.some((key) => data[key] === undefined)) {
    return { ok: false, reason: "permission-preflight-unparsed", data };
  }

  return { ok: true, reason: "ok", data };
}

function printLabels(data, keys) {
  for (const key of keys) {
    if (data[key] !== undefined) console.log(`${key}=${data[key]}`);
  }
}

const cliPresent = fs.existsSync(supabaseEntrypoint);
const linkPresent = linkMetadataPaths.some((metadataPath) => fs.existsSync(metadataPath));
console.log(`cli_status=${cliPresent ? "local-cli-present" : "local-cli-missing"}`);
console.log(`link_status=${linkPresent ? "supabase-link-metadata-present" : "supabase-link-metadata-missing"}`);

const approval = process.env.COMMENT_TRANSLATOR_SUPABASE_DEFAULT_PRIVILEGES_REMEDIATION_APPROVAL || "";
const approvalPresent = approval === exactApproval;
console.log(`same_thread_exact_approval_status=${approvalPresent ? "present" : "absent"}`);
console.log(`remote_apply_approval_status=${approvalPresent ? "present" : "absent"}`);

if (!cliPresent || !linkPresent) {
  printBlocked("cli-or-link-unavailable");
  process.exit(0);
}

const ownerPreflight = runOwnerPreflight();
if (!ownerPreflight.ok) {
  printBlocked(ownerPreflight.reason);
  process.exit(0);
}

printLabels(ownerPreflight.data, ownerPreflightKeys);

const permissionPreflight = runPermissionPreflight();
if (!permissionPreflight.ok) {
  printBlocked(permissionPreflight.reason);
  process.exit(0);
}

printLabels(permissionPreflight.data, permissionKeys);
console.log("owner_specific_private_value_exposure_status=not-exposed");
console.log("owner_specific_block_apply_status=not-run");
console.log("remote_remediation_apply_status=not-run");
console.log("remote_mutation_status=not-run");
console.log("public_release_capable_status=no");
