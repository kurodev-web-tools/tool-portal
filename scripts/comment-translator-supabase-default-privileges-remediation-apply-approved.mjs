import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const supabaseEntrypoint = path.join(root, "node_modules", "supabase", "dist", "supabase.js");
const linkMetadataPaths = [
  path.join(root, "supabase", ".temp", "project-ref"),
  path.join(root, "supabase", ".temp", "linked-project.json")
];
const ownerPreflightRunner = path.join(
  root,
  "scripts",
  "comment-translator-supabase-default-privileges-owner-specific-preflight-readonly.mjs"
);

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

const optionalPreflightKeys = [
  "owner_specific_private_value_exposure_status",
  "owner_specific_block_review_status",
  "owner_specific_block_apply_status",
  "remote_default_privileges_owner_specific_preflight_status"
];

const remediationSql = String.raw`
begin;

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke execute on functions from public;

do $$
declare
  owner_role_name name;
begin
  for owner_role_name in
    select distinct owner_role.rolname
    from pg_default_acl d
    join pg_namespace n on n.oid = d.defaclnamespace and n.nspname = 'public'
    join pg_roles owner_role on owner_role.oid = d.defaclrole
    where owner_role.rolname <> 'postgres'
  loop
    execute format(
      'alter default privileges for role %I in schema public revoke select, insert, update, delete on tables from anon, authenticated, service_role',
      owner_role_name
    );
    execute format(
      'alter default privileges for role %I in schema public revoke usage, select on sequences from anon, authenticated, service_role',
      owner_role_name
    );
    execute format(
      'alter default privileges for role %I in schema public revoke execute on functions from anon, authenticated, service_role',
      owner_role_name
    );
    execute format(
      'alter default privileges for role %I in schema public revoke execute on functions from public',
      owner_role_name
    );
  end loop;
end $$;

commit;
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
  if (/syntax error|unterminated|parse/i.test(output)) return "sql-shape-unavailable";
  if (/must be (?:owner|member)|permission denied|permission|denied|forbidden|401|403/i.test(output)) {
    return "permission-unavailable";
  }
  if (/network|timeout|dns|connect|ECONN|fetch/i.test(output)) return "network-unavailable";
  if (/unknown flag|invalid|usage|accepts|argument/i.test(output)) return "cli-invocation-unavailable";
  if (/docker|container|daemon/i.test(output)) return "docker-unavailable";
  if (/failed|error/i.test(output)) return "remote-query-error";
  return "unknown";
}

function printBlocked(reason, stage = "preflight") {
  console.log(`remote_default_privileges_apply_failure_reason=${reason}`);
  if (stage === "preflight") {
    console.log("remote_default_privileges_apply_preflight_status=blocked");
    console.log("remote_default_privileges_apply_status=not-run");
    console.log("remote_default_privileges_remediation_status=not-run");
    console.log("remote_remediation_apply_status=not-run");
    console.log("remote_mutation_status=not-run");
  } else {
    console.log(`remote_default_privileges_apply_status=blocked-${reason}`);
    console.log(`remote_default_privileges_remediation_status=blocked-${reason}`);
    console.log(`remote_remediation_apply_status=blocked-${reason}`);
    console.log("remote_mutation_status=not-applied");
  }
  console.log("public_release_capable_status=no");
}

function printPhase(prefix, data, keys) {
  for (const key of keys) {
    if (data[key] !== undefined) console.log(`${prefix}${key}=${data[key]}`);
  }
}

function runOwnerPreflight() {
  const result = spawnSync(process.execPath, [ownerPreflightRunner], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024
  });

  if (result.status !== 0) {
    return { ok: false, reason: "preflight-runner-unavailable", data: {} };
  }

  const keys = [...postureKeys, ...optionalPreflightKeys];
  const data = parseLabels(result.stdout || "", keys);
  if (postureKeys.some((key) => data[key] === undefined)) {
    return { ok: false, reason: "unparsed-sanitized-preflight", data };
  }

  return { ok: true, reason: "ok", data };
}

function hasExpectedPreApplyPosture(data) {
  return (
    data.remote_catalog_query_status === "pass" &&
    data.remote_table_count === 9 &&
    data.remote_expected_missing_count === 0 &&
    data.remote_rls_status === "pass" &&
    data.remote_grant_status === "pass" &&
    data.remote_default_privileges_status === "fail" &&
    data.remote_unexpected_default_grant_count > 0 &&
    data.remote_public_default_grant_count === 0 &&
    (data.remote_default_acl_owner_status === "postgres-only" ||
      data.remote_default_acl_owner_status === "mixed-or-non-postgres")
  );
}

function hasExpectedPostApplyPosture(data) {
  return (
    data.remote_catalog_query_status === "pass" &&
    data.remote_table_count === 9 &&
    data.remote_expected_missing_count === 0 &&
    data.remote_rls_status === "pass" &&
    data.remote_grant_status === "pass" &&
    data.remote_readonly_authenticated_write_grant_count === 0 &&
    data.remote_default_privileges_status === "pass" &&
    data.remote_unexpected_default_grant_count === 0 &&
    data.remote_public_default_grant_count === 0 &&
    data.owner_specific_block_required_status === "no"
  );
}

function runReviewedMutation() {
  const result = spawnSync(process.execPath, [supabaseEntrypoint, "db", "query", remediationSql, "--linked"], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024
  });

  if (result.status !== 0) {
    return { ok: false, reason: classifyFailure(`${result.stdout || ""}\n${result.stderr || ""}`) };
  }

  return { ok: true, reason: "ok" };
}

const cliPresent = fs.existsSync(supabaseEntrypoint);
const linkPresent = linkMetadataPaths.some((metadataPath) => fs.existsSync(metadataPath));
console.log(`cli_status=${cliPresent ? "local-cli-present" : "local-cli-missing"}`);
console.log(`link_status=${linkPresent ? "supabase-link-metadata-present" : "supabase-link-metadata-missing"}`);

if (!cliPresent || !linkPresent) {
  printBlocked("cli-or-link-unavailable");
  process.exit(0);
}

const approval = process.env.COMMENT_TRANSLATOR_SUPABASE_DEFAULT_PRIVILEGES_REMEDIATION_APPROVAL || "";
const approvalPresent = approval === exactApproval;
console.log(`same_thread_exact_approval_status=${approvalPresent ? "present" : "absent"}`);
console.log(`remote_apply_approval_status=${approvalPresent ? "present" : "absent"}`);

if (!approvalPresent) {
  printBlocked("exact-approval-absent");
  process.exit(0);
}

const preflight = runOwnerPreflight();
if (!preflight.ok) {
  printBlocked(preflight.reason);
  process.exit(0);
}

printPhase("pre_", preflight.data, postureKeys);
printPhase("pre_", preflight.data, optionalPreflightKeys);

const ownerSpecificIncluded =
  preflight.data.remote_default_acl_owner_status === "mixed-or-non-postgres" &&
  preflight.data.owner_specific_block_required_status === "yes";
console.log(`owner_specific_block_apply_status=${ownerSpecificIncluded ? "included" : "not-required"}`);

const preApplyPass = hasExpectedPreApplyPosture(preflight.data);
console.log(`remote_default_privileges_apply_preflight_status=${preApplyPass ? "pass" : "blocked"}`);

if (!preApplyPass) {
  printBlocked("unexpected-preapply-posture");
  process.exit(0);
}

const apply = runReviewedMutation();
if (!apply.ok) {
  printBlocked(apply.reason, "apply");
  process.exit(0);
}

const postflight = runOwnerPreflight();
if (!postflight.ok) {
  printBlocked(postflight.reason);
  process.exit(0);
}

printPhase("", postflight.data, postureKeys);

const postApplyPass = hasExpectedPostApplyPosture(postflight.data);
console.log(`remote_default_privileges_postapply_verification_status=${postApplyPass ? "pass" : "fail"}`);
console.log(`remote_default_privileges_remediation_status=${postApplyPass ? "pass" : "verification-failed"}`);
console.log(`remote_mutation_scope_status=${postApplyPass ? "default-privileges-only" : "unverified"}`);
console.log(`remote_remediation_apply_status=${postApplyPass ? "applied" : "verification-failed"}`);
console.log(`remote_mutation_status=${postApplyPass ? "applied" : "verification-failed"}`);
console.log("public_release_capable_status=no");

process.exit(postApplyPass ? 0 : 1);
