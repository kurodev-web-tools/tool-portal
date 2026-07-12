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
), grants as (
  select c.relname as table_name, r.rolname as grantee, x.privilege_type
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  join expected_tables e on e.table_name = c.relname
  left join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) x on true
  left join pg_roles r on r.oid = x.grantee
  where c.relkind in ('r','p')
), unexpected as (
  select table_name, grantee, privilege_type, count(*) as drift_count
  from grants
  where
    grantee = 'anon'
    or (table_name = 'usage_quotas' and grantee = 'authenticated' and privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE'))
    or (table_name in (
      'youtube_oauth_credentials',
      'comment_translator_sessions',
      'comment_translator_usage_ledger_events',
      'comment_translator_real_comments_feed_snapshots',
      'comment_translator_creator_waitlist_registrations'
    ) and grantee = 'authenticated')
  group by table_name, grantee, privilege_type
), metrics as (
  select
    coalesce((select sum(drift_count) from unexpected), 0) as remote_current_grant_drift_count,
    coalesce((select count(*) from unexpected), 0) as remote_current_grant_drift_breakdown_count,
    coalesce((select count(*) from unexpected where table_name = 'usage_quotas' and grantee = 'authenticated' and privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE')), 0) as remote_usage_quotas_authenticated_write_drift_count,
    coalesce((select count(*) from unexpected where grantee = 'anon'), 0) as remote_anon_grant_drift_breakdown_count,
    coalesce((select count(*) from unexpected where table_name <> 'usage_quotas' and grantee = 'authenticated'), 0) as remote_server_only_authenticated_grant_drift_breakdown_count
), top_drift as (
  select table_name, grantee, privilege_type, drift_count
  from unexpected
  order by table_name, grantee, privilege_type
  limit 1
)
select unnest(array[
  'remote_current_grant_drift_query_status=pass',
  'remote_current_grant_drift_count=' || remote_current_grant_drift_count::text,
  'remote_current_grant_drift_breakdown_count=' || remote_current_grant_drift_breakdown_count::text,
  'remote_usage_quotas_authenticated_write_drift_count=' || remote_usage_quotas_authenticated_write_drift_count::text,
  'remote_anon_grant_drift_breakdown_count=' || remote_anon_grant_drift_breakdown_count::text,
  'remote_server_only_authenticated_grant_drift_breakdown_count=' || remote_server_only_authenticated_grant_drift_breakdown_count::text,
  'grant_drift_table_label=' || coalesce((select 'public.' || table_name from top_drift), 'none'),
  'grant_drift_role_label=' || coalesce((select grantee from top_drift), 'none'),
  'grant_drift_privilege_type_label=' || coalesce((select privilege_type from top_drift), 'none'),
  'grant_drift_count=' || coalesce((select drift_count from top_drift), 0)::text,
  'remote_current_grant_drift_status=' || case when remote_current_grant_drift_count = 0 then 'pass' else 'fail' end,
  'remote_grant_remediation_status=not-run',
  'remote_mutation_status=not-run'
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
  console.log("remote_current_grant_drift_query_status=fail");
  console.log(`remote_current_grant_drift_query_failure_reason=${reason}`);
  console.log("remote_current_grant_drift_status=unchecked");
  console.log("remote_grant_remediation_status=not-run");
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
  "remote_current_grant_drift_status",
  "remote_grant_remediation_status",
  "remote_mutation_status"
];

const data = {};
for (const key of orderedKeys) {
  const match = (result.stdout || "").match(new RegExp(`${key}=([A-Za-z0-9_.-]+)`));
  if (match) data[key] = /^\d+$/.test(match[1]) ? Number(match[1]) : match[1];
}

if (orderedKeys.some((key) => data[key] === undefined)) {
  printBlocked("unparsed-sanitized-result");
  process.exit(0);
}

for (const key of orderedKeys) {
  console.log(`${key}=${data[key]}`);
}
