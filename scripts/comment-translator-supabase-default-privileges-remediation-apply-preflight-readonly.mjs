import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const supabaseEntrypoint = path.join(root, "node_modules", "supabase", "dist", "supabase.js");

const sql = String.raw`
with expected_tables(table_name, access_model) as (
  values
    ('user_profiles','browser_owned'),
    ('user_preferences','browser_owned'),
    ('tool_preferences','browser_owned'),
    ('usage_quotas','browser_readonly'),
    ('youtube_oauth_credentials','server_only'),
    ('comment_translator_sessions','server_only'),
    ('comment_translator_usage_ledger_events','server_only'),
    ('comment_translator_real_comments_feed_snapshots','server_only'),
    ('comment_translator_creator_waitlist_registrations','server_only')
), public_expected as (
  select e.table_name, e.access_model, c.oid, c.relrowsecurity
  from expected_tables e
  left join pg_class c on c.relname = e.table_name
  left join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  where c.relkind in ('r','p') or c.oid is null
), grants as (
  select c.relname as table_name, r.rolname as grantee, x.privilege_type
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  left join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) x on true
  left join pg_roles r on r.oid = x.grantee
  where c.relkind in ('r','p')
), default_acl_rows as (
  select coalesce(owner_role.rolname = 'postgres', false) as is_postgres_owner
  from pg_default_acl d
  join pg_namespace n on n.oid = d.defaclnamespace and n.nspname = 'public'
  left join pg_roles owner_role on owner_role.oid = d.defaclrole
), default_acl as (
  select
    coalesce(owner_role.rolname = 'postgres', false) as is_postgres_owner,
    d.defaclobjtype,
    coalesce(grantee_role.rolname, 'PUBLIC') as grantee,
    x.privilege_type
  from pg_default_acl d
  join pg_namespace n on n.oid = d.defaclnamespace and n.nspname = 'public'
  left join pg_roles owner_role on owner_role.oid = d.defaclrole
  left join lateral aclexplode(d.defaclacl) x on true
  left join pg_roles grantee_role on grantee_role.oid = x.grantee
), metrics as (
  select
    (select count(*) from public_expected where oid is not null) as remote_table_count,
    (select count(*) from expected_tables) as remote_expected_table_count,
    (select count(*) from public_expected where oid is null) as remote_expected_missing_count,
    (select count(*) from public_expected where oid is not null and relrowsecurity is not true) as remote_rls_disabled_count,
    (select count(*) from grants g join expected_tables e using (table_name) where g.grantee = 'anon') as remote_anon_grant_count,
    (select count(*) from grants g join expected_tables e using (table_name) where e.access_model = 'server_only' and g.grantee = 'authenticated') as remote_server_only_authenticated_grant_count,
    (select count(*) from grants g where g.table_name = 'usage_quotas' and g.grantee = 'authenticated' and g.privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE')) as remote_readonly_authenticated_write_grant_count,
    (select count(*) from grants g join expected_tables e using (table_name) where e.access_model = 'browser_owned' and g.grantee = 'authenticated' and g.privilege_type in ('SELECT','INSERT','UPDATE')) as remote_browser_owned_expected_grant_count,
    (select count(*) from grants g where g.table_name = 'usage_quotas' and g.grantee = 'authenticated' and g.privilege_type = 'SELECT') as remote_browser_readonly_expected_grant_count,
    (select count(*) from default_acl_rows) as remote_default_acl_entry_count,
    (select count(*) from default_acl_rows where is_postgres_owner) as remote_default_acl_postgres_owner_entry_count,
    (select count(*) from default_acl_rows where not is_postgres_owner) as remote_default_acl_other_owner_entry_count,
    (select count(*) from default_acl where grantee in ('anon','authenticated','service_role')) as remote_browser_or_service_default_grant_count,
    (select count(*) from default_acl where grantee = 'PUBLIC') as remote_public_default_grant_count,
    (select count(*) from default_acl where grantee in ('anon','authenticated','service_role') or (grantee = 'PUBLIC' and defaclobjtype = 'f' and privilege_type = 'EXECUTE')) as remote_unexpected_default_grant_count
)
select unnest(array[
  'remote_catalog_query_status=pass',
  'remote_table_count=' || remote_table_count::text,
  'remote_expected_table_count=' || remote_expected_table_count::text,
  'remote_expected_missing_count=' || remote_expected_missing_count::text,
  'remote_rls_disabled_count=' || remote_rls_disabled_count::text,
  'remote_rls_status=' || case when remote_expected_missing_count = 0 and remote_rls_disabled_count = 0 then 'pass' else 'fail' end,
  'remote_anon_grant_count=' || remote_anon_grant_count::text,
  'remote_server_only_authenticated_grant_count=' || remote_server_only_authenticated_grant_count::text,
  'remote_readonly_authenticated_write_grant_count=' || remote_readonly_authenticated_write_grant_count::text,
  'remote_browser_owned_expected_grant_count=' || remote_browser_owned_expected_grant_count::text,
  'remote_browser_readonly_expected_grant_count=' || remote_browser_readonly_expected_grant_count::text,
  'remote_grant_status=' || case when remote_expected_missing_count = 0 and remote_anon_grant_count = 0 and remote_server_only_authenticated_grant_count = 0 and remote_readonly_authenticated_write_grant_count = 0 and remote_browser_owned_expected_grant_count = 9 and remote_browser_readonly_expected_grant_count = 1 then 'pass' else 'fail' end,
  'remote_default_acl_query_status=pass',
  'remote_default_acl_entry_count=' || remote_default_acl_entry_count::text,
  'remote_default_acl_postgres_owner_entry_count=' || remote_default_acl_postgres_owner_entry_count::text,
  'remote_default_acl_other_owner_entry_count=' || remote_default_acl_other_owner_entry_count::text,
  'remote_default_acl_owner_status=' || case when remote_default_acl_entry_count = remote_default_acl_postgres_owner_entry_count then 'postgres-only' else 'mixed-or-non-postgres' end,
  'remote_browser_or_service_default_grant_count=' || remote_browser_or_service_default_grant_count::text,
  'remote_public_default_grant_count=' || remote_public_default_grant_count::text,
  'remote_unexpected_default_grant_count=' || remote_unexpected_default_grant_count::text,
  'remote_default_privileges_status=' || case when remote_unexpected_default_grant_count = 0 then 'pass' else 'fail' end,
  'owner_specific_block_required_status=' || case when remote_default_acl_entry_count = remote_default_acl_postgres_owner_entry_count then 'no' else 'yes' end
]) as sanitized_label
from metrics;
`;

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
  console.log("remote_catalog_query_status=fail");
  console.log(`remote_catalog_query_failure_reason=${reason}`);
  console.log("remote_apply_preflight_status=blocked-readonly-query-unavailable");
  console.log("remote_apply_approval_status=absent");
  console.log("remote_remediation_apply_status=not-run");
  console.log("remote_mutation_status=not-run");
}

const result = spawnSync(process.execPath, [supabaseEntrypoint, "db", "query", sql, "--linked"], {
  encoding: "utf8",
  maxBuffer: 1024 * 1024
});

if (result.status !== 0) {
  printBlocked(classifyFailure(`${result.stdout || ""}\n${result.stderr || ""}`));
  process.exit(0);
}

const orderedKeys = [
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

const data = {};
for (const key of orderedKeys) {
  const match = (result.stdout || "").match(new RegExp(`${key}=([A-Za-z0-9_-]+)`));
  if (match) data[key] = /^\d+$/.test(match[1]) ? Number(match[1]) : match[1];
}

if (orderedKeys.some((key) => data[key] === undefined)) {
  printBlocked("unparsed-sanitized-result");
  process.exit(0);
}

for (const key of orderedKeys) {
  console.log(`${key}=${data[key]}`);
}

const basePreflightPass =
  data.remote_catalog_query_status === "pass" &&
  data.remote_expected_missing_count === 0 &&
  data.remote_rls_status === "pass" &&
  data.remote_grant_status === "pass" &&
  data.remote_default_privileges_status === "fail" &&
  data.remote_unexpected_default_grant_count > 0;

const preflightStatus = !basePreflightPass
  ? "blocked-remote-posture-drift"
  : data.owner_specific_block_required_status === "yes"
    ? "blocked-owner-specific-review-required"
    : "pass-awaiting-approval";

console.log(`remote_apply_preflight_status=${preflightStatus}`);
console.log("remote_apply_approval_status=absent");
console.log("remote_remediation_apply_status=not-run");
console.log("remote_mutation_status=not-run");
