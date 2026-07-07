import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const supabaseEntrypoint = path.join(root, "node_modules", "supabase", "dist", "supabase.js");
const applyPreflightRunner = path.join(
  root,
  "scripts",
  "comment-translator-supabase-default-privileges-remediation-apply-preflight-readonly.mjs"
);
const linkMetadataPath = path.join(root, "supabase", ".temp", "project-ref");

const passthroughKeys = [
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
  "remote_apply_preflight_status",
  "remote_apply_approval_status",
  "remote_remediation_apply_status",
  "remote_mutation_status"
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

function printAvailability() {
  const cliPresent = fs.existsSync(supabaseEntrypoint);
  const linkPresent = fs.existsSync(linkMetadataPath);
  let cliVersionStatus = "unavailable";

  if (cliPresent) {
    const versionResult = spawnSync(process.execPath, [supabaseEntrypoint, "--version"], {
      encoding: "utf8",
      maxBuffer: 1024 * 64
    });
    cliVersionStatus = versionResult.status === 0 ? "present" : "unavailable";
  }

  console.log(`cli_status=${cliPresent ? "local-cli-present" : "local-cli-unavailable"}`);
  console.log(`cli_version_status=${cliVersionStatus}`);
  console.log(
    `link_status=${linkPresent ? "supabase-link-metadata-present" : "supabase-link-metadata-absent"}`
  );
  console.log("mcp_status=not-used");

  return cliPresent && linkPresent;
}

function printBlocked(reason) {
  console.log("remote_catalog_query_status=fail");
  console.log(`remote_owner_specific_preflight_failure_reason=${reason}`);
  console.log("remote_apply_preflight_status=blocked-readonly-preflight-unavailable");
  console.log("remote_apply_approval_status=absent");
  console.log("remote_remediation_apply_status=not-run");
  console.log("remote_mutation_status=not-run");
  console.log("owner_specific_private_value_exposure_status=not-exposed");
  console.log("owner_specific_block_review_status=blocked-readonly-preflight-unavailable");
  console.log("owner_specific_block_apply_status=not-run");
  console.log("same_thread_exact_approval_status=absent");
  console.log("same_thread_risk_acceptance_status=absent");
  console.log(
    "remote_default_privileges_owner_specific_preflight_status=blocked-readonly-preflight-unavailable"
  );
  console.log("public_release_capable_status=no");
}

const availabilityPass = printAvailability();
if (!availabilityPass) {
  printBlocked("cli-or-link-unavailable");
  process.exit(0);
}

const result = spawnSync(process.execPath, [applyPreflightRunner], {
  encoding: "utf8",
  maxBuffer: 1024 * 1024
});

if (result.status !== 0) {
  printBlocked("readonly-runner-unavailable");
  process.exit(0);
}

const data = parseLabels(result.stdout || "");
if (passthroughKeys.some((key) => data[key] === undefined)) {
  printBlocked("readonly-result-unparsed");
  process.exit(0);
}

for (const key of passthroughKeys) {
  console.log(`${key}=${data[key]}`);
}

const basePostureIntact =
  data.remote_catalog_query_status === "pass" &&
  data.remote_expected_missing_count === 0 &&
  data.remote_rls_status === "pass" &&
  data.remote_grant_status === "pass" &&
  data.remote_default_privileges_status === "fail" &&
  data.remote_unexpected_default_grant_count > 0;

const privateOwnerReviewBlocked =
  data.remote_default_acl_owner_status === "mixed-or-non-postgres" &&
  data.owner_specific_block_required_status === "yes";

const ownerSpecificStatus = !basePostureIntact
  ? "blocked-remote-posture-drift"
  : privateOwnerReviewBlocked
    ? "blocked-private-owner-value-not-reviewed"
    : "pass-awaiting-approval";

console.log("owner_specific_private_value_exposure_status=not-exposed");
console.log(
  `owner_specific_block_review_status=${
    privateOwnerReviewBlocked ? "blocked-private-owner-value-not-reviewed" : "not-required"
  }`
);
console.log("owner_specific_block_apply_status=not-run");
console.log("same_thread_exact_approval_status=absent");
console.log("same_thread_risk_acceptance_status=absent");
console.log(`remote_default_privileges_owner_specific_preflight_status=${ownerSpecificStatus}`);
console.log("public_release_capable_status=no");
