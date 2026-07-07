import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const triageRunner = path.join(
  root,
  "scripts",
  "comment-translator-supabase-current-grant-drift-readonly-triage.mjs"
);

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
  "remote_current_grant_drift_status"
];

function parseLabels(output) {
  const data = {};
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^([a-z0-9_]+)=([A-Za-z0-9_.-]+)$/);
    if (!match) continue;
    data[match[1]] = /^\d+$/.test(match[2]) ? Number(match[2]) : match[2];
  }
  return data;
}

function printBlocked(reason) {
  console.log("remote_current_grant_drift_query_status=fail");
  console.log(`remote_current_grant_apply_preflight_failure_reason=${reason}`);
  console.log("remote_current_grant_preapply_expected_drift_status=unchecked");
  console.log("remote_current_grant_remediation_approval_status=absent");
  console.log("remote_current_grant_apply_preflight_status=blocked");
  console.log("remote_current_grant_remediation_status=not-run");
  console.log("remote_mutation_status=not-run");
}

const result = spawnSync(process.execPath, [triageRunner], {
  encoding: "utf8",
  maxBuffer: 1024 * 1024
});

if (result.status !== 0) {
  printBlocked("triage-runner-unavailable");
  process.exit(0);
}

const data = parseLabels(result.stdout || "");
if (orderedKeys.some((key) => data[key] === undefined)) {
  printBlocked("triage-result-unparsed");
  process.exit(0);
}

const expectedDrift =
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
  data.remote_current_grant_drift_status === "fail";

for (const key of orderedKeys) {
  console.log(`${key}=${data[key]}`);
}

console.log(
  `remote_current_grant_preapply_expected_drift_status=${expectedDrift ? "pass" : "fail"}`
);
console.log("remote_current_grant_remediation_approval_status=absent");
console.log(
  `remote_current_grant_apply_preflight_status=${
    expectedDrift ? "blocked-approval-absent" : "blocked-remote-posture-drift"
  }`
);
console.log("remote_current_grant_remediation_status=not-run");
console.log("remote_mutation_status=not-run");
