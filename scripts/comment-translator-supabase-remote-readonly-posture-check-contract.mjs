import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const evidenceDocPath = "docs/active/COMMENT_TRANSLATOR_SUPABASE_REMOTE_READONLY_POSTURE_CHECK.md";
const auditDocPath = "docs/active/COMMENT_TRANSLATOR_SUPABASE_DB_AUTH_RLS_SECURITY_AUDIT.md";
const defaultPrivilegesContractPath = "scripts/comment-translator-supabase-default-privileges-guard-contract.mjs";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

assert.ok(exists(evidenceDocPath), `remote read-only posture evidence doc exists: ${evidenceDocPath}`);
assert.ok(exists(auditDocPath), `Supabase audit doc exists: ${auditDocPath}`);
assert.ok(exists(defaultPrivilegesContractPath), "default privileges guard contract remains present");

const evidenceDoc = read(evidenceDocPath);
const auditDoc = read(auditDocPath);
const task = read("task.md");
const taskLower = task.toLowerCase();
const combined = `${evidenceDoc}\n${task}`;

for (const marker of [
  "public_table_count`: `9`",
  "local_rls_status`: `pass`",
  "local_grant_status`: `pass`",
  "default_privileges_guard_status`: `local-proposal-present`",
  "cli_status` | `local-cli-present`",
  "link_status` | `supabase-link-metadata-present`",
  "remote_readonly_check_status` | `fail`",
  "remote_catalog_query_status` | `pass`",
  "remote_table_count` | `9`",
  "remote_expected_table_count` | `9`",
  "remote_expected_missing_count` | `0`",
  "remote_rls_disabled_count` | `0`",
  "remote_rls_status` | `pass`",
  "remote_anon_grant_count` | `0`",
  "remote_server_only_authenticated_grant_count` | `0`",
  "remote_readonly_authenticated_write_grant_count` | `0`",
  "remote_browser_owned_expected_grant_count` | `9`",
  "remote_grant_status` | `pass`",
  "remote_default_acl_query_status` | `pass`",
  "remote_default_acl_entry_count` | `6`",
  "remote_unexpected_default_grant_count` | `48`",
  "remote_public_default_grant_count` | `0`",
  "remote_browser_or_service_default_grant_count` | `48`",
  "remote_default_privileges_status` | `fail`",
  "remote_advisor_status` | `pass`",
  "remote_advisor_issue_count` | `3`",
  "remote_advisor_warn_count` | `3`",
  "remote_advisor_error_count` | `0`",
  "linked_query_probe_status`: `pass`",
  "remote_catalog_read_method`: `linked-db-query-file`",
  "remote_drift_status` | `fail-default-privileges`",
  "Supabase default privileges guard migration or contract behavior: unchanged.",
  "Supabase CLI dev dependency pin: added as a local development dependency only."
]) {
  assert.ok(evidenceDoc.includes(marker), `evidence doc records marker: ${marker}`);
}

for (const marker of [
  "P1 Medium: Remote Read-Only Posture Unchecked",
  "Guard status: local migration proposal added",
  "The local migration set creates 9 `public` tables"
]) {
  assert.ok(auditDoc.includes(marker), `audit doc remains anchored: ${marker}`);
}

for (const tableName of [
  "public.user_profiles",
  "public.user_preferences",
  "public.tool_preferences",
  "public.usage_quotas",
  "public.youtube_oauth_credentials",
  "public.comment_translator_sessions",
  "public.comment_translator_usage_ledger_events",
  "public.comment_translator_real_comments_feed_snapshots",
  "public.comment_translator_creator_waitlist_registrations"
]) {
  assert.ok(evidenceDoc.includes(tableName), `safe public schema table name is recorded: ${tableName}`);
}

const packageJson = JSON.parse(read("package.json"));
assert.equal(packageJson.devDependencies?.supabase, "^2.109.0", "Supabase CLI is pinned as a dev dependency");

for (const requiredTaskMarker of [
  "codex/supabase-remote-readonly-posture-check",
  "remote read-only Supabase posture check",
  "codex/supabase-remote-catalog-posture-read",
  "remote_readonly_check_status=fail",
  "local-cli-present",
  "supabase-link-metadata-present",
  "remote_catalog_query_status=pass",
  "remote_table_count=9",
  "remote_rls_status=pass",
  "remote_grant_status=pass",
  "remote_default_privileges_status=fail",
  "remote_unexpected_default_grant_count=48",
  "remote_advisor_status=pass",
  "remote_advisor_issue_count=3",
  "remote_advisor_warn_count=3",
  "remote_advisor_error_count=0",
  "Supabase default privileges guard migration/contract behavior: unchanged"
]) {
  assert.ok(taskLower.includes(requiredTaskMarker.toLowerCase()), `task.md records ${requiredTaskMarker}`);
}

const sensitivePattern = new RegExp(
  [
    "sk_" + "live_[A-Za-z0-9]+",
    "sk_" + "test_[A-Za-z0-9]+",
    "wh" + "sec_[A-Za-z0-9]+",
    "sb_" + "secret_[A-Za-z0-9]+",
    "service_" + "role\\s*[:=]\\s*[\"'][^\"']+",
    "access_" + "token\\s*[:=]\\s*[\"'][^\"']+",
    "refresh_" + "token\\s*[:=]\\s*[\"'][^\"']+",
    "authorization_" + "code\\s*[:=]\\s*[\"'][^\"']+",
    "\\bAuth" + "orization\\s*[:=]\\s*[\"'][^\"']+",
    "post" + "gres(?:ql)?:\\/\\/",
    "BEGIN\\s+PRIVATE\\s+KEY",
    "live" + "ChatId\\s*[:=]\\s*[\"'][^\"']+",
    "provider" + "ChannelId\\s*[:=]\\s*[\"'][^\"']+"
  ].join("|"),
  "i"
);

assert.doesNotMatch(
  combined,
  sensitivePattern,
  "remote read-only posture evidence contains no high-confidence secret, credential, connection string, or provider-private value"
);

for (const defaultAclMarker of [
  "| `default_acl_tables_anon_count` | `12` |",
  "| `default_acl_tables_authenticated_count` | `12` |",
  "| `default_acl_tables_service_role_count` | `12` |",
  "| `default_acl_sequences_anon_count` | `3` |",
  "| `default_acl_sequences_authenticated_count` | `3` |",
  "| `default_acl_sequences_service_role_count` | `3` |",
  "| `default_acl_functions_anon_count` | `1` |",
  "| `default_acl_functions_authenticated_count` | `1` |",
  "| `default_acl_functions_service_role_count` | `1` |"
]) {
  assert.ok(evidenceDoc.includes(defaultAclMarker), `default ACL evidence is recorded: ${defaultAclMarker}`);
}

console.log(
  "comment translator Supabase remote read-only posture check contract passed (remote_readonly_check_status=fail, catalog_status=read, secret_scan=pass)"
);
