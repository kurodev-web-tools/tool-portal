import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const plG4DocPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G4_PRODUCTION_CUSTOM_DEPLOYED_SMOKE.md";
const plG5DocPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION.md";
const remotePostureDocPath = "docs/active/COMMENT_TRANSLATOR_SUPABASE_REMOTE_READONLY_POSTURE_CHECK.md";
const remoteRemediationDocPath =
  "docs/active/COMMENT_TRANSLATOR_SUPABASE_DEFAULT_PRIVILEGES_REMOTE_REMEDIATION_APPROVAL.md";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertIncludes(source, marker, label) {
  assert.ok(source.includes(marker), `${label}: ${marker}`);
}

const plG4Doc = read(plG4DocPath);
const plG5Doc = read(plG5DocPath);
const remotePostureDoc = read(remotePostureDocPath);
const remoteRemediationDoc = read(remoteRemediationDocPath);
const task = read("task.md");

for (const marker of [
  "Status: PL-G4 production/custom deployed smoke evidence rollup. Public-release capable: no.",
  "Current execution result: complete for `preview-custom-url`.",
  "| `pl_g4_preview_custom_smoke_status` | `pass` |",
  "| `preview_target_label` | `preview-custom-url` |",
  "| `allowed_tester_connection_status` | `pass` |",
  "| `comment_retrieval_status` | `pass` |",
  "| `translation_status` | `pass` |",
  "| `cache_behavior_status` | `pass` |",
  "| `diagnostics_status` | `pass` |",
  "| `timezone_display_status` | `pass` |",
  "| `stop_status` | `pass` |",
  "| `main_production_domain_status` | `not-promoted` |",
  "| `deploy_upload_status` | `not-run` |",
  "| `public_gate_flip_status` | `not-run` |",
  "| `raw_comment_capture_status` | `not-recorded` |",
  "| `screenshot_with_raw_comments_status` | `not-recorded` |"
]) {
  assertIncludes(plG4Doc, marker, "PL-G4 rollup");
}

for (const marker of [
  "Status: PL-G5 release-owner public launch decision evidence rollup. Public-release capable: no.",
  "Current execution result: keep blocked / pending release-owner decision.",
  "| `pl_g1_remote_durable_enforcement_status` | `complete` |",
  "| `pl_g2_allowed_tester_route_api_smoke_status` | `complete` |",
  "| `pl_g3_start_to_translation_smoke_status` | `complete` |",
  "| `pl_g4_preview_custom_deployed_smoke_status` | `complete-for-preview-custom-url` |",
  "| `main_production_domain_status` | `not-promoted` |",
  "| `remote_default_privileges_status` | `fail` |",
  "| `remote_default_privileges_remediation_status` | `approval-gated-not-run` |",
  "| `release_owner_decision_status` | `pending` |",
  "| `public_gate_state_label` | `unchanged-blocked` |",
  "| `public_release_capable_label` | `no` |",
  "| `pl_g6_public_access_change_status` | `not-run` |",
  "| `raw_comment_capture_status` | `not-recorded` |",
  "| `screenshot_with_raw_comments_status` | `not-recorded` |",
  "| FB-L4 / PL-G3 Start-to-translation smoke | complete |",
  "| FB-L5 / PL-G4 production/custom deployed smoke | complete for preview custom URL |",
  "| FB-L6 / PL-G5 release-owner decision | pending / keep blocked |"
]) {
  assertIncludes(plG5Doc, marker, "PL-G5 rollup");
}

for (const marker of [
  "| `remote_default_privileges_status` | `fail` |",
  "| `remote_unexpected_default_grant_count` | `48` |"
]) {
  assertIncludes(remotePostureDoc, marker, "remote posture evidence");
}

for (const marker of [
  "| `remote_default_acl_owner_status` | `mixed-or-non-postgres` |",
  "| `remote_remediation_apply_status` | `not-run` |",
  "| `owner_specific_block_required_status` | `yes` |"
]) {
  assertIncludes(remoteRemediationDoc, marker, "remote remediation approval evidence");
}

for (const marker of [
  "codex/step5-evidence-docs",
  "Step 5 evidence docs",
  "pl_g4_preview_custom_smoke_status=pass",
  "pl_g5_public_release_capable_label=no",
  "remote_default_privileges_status=fail",
  "pl_g6_public_access_change_status=not-run",
  "raw_comment_capture_status=not-recorded",
  "screenshot_with_raw_comments_status=not-recorded"
]) {
  assertIncludes(task, marker, "task.md Step 5 rollup");
}

const forbiddenPatterns = [
  /sk_live_[A-Za-z0-9]+/,
  /sk_test_[A-Za-z0-9]+/,
  /whsec_[A-Za-z0-9]+/,
  /access_token\s*[:=]\s*["'][^"']+/i,
  /refresh_token\s*[:=]\s*["'][^"']+/i,
  /authorization_code\s*[:=]\s*["'][^"']+/i,
  /\bAuthorization\s*[:=]\s*["'][^"']+/i,
  /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+/i,
  /SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+/i,
  /BEGIN\s+PRIVATE\s+KEY/,
  /liveChatId\s*[:=]\s*["'](?!live-chat-id-never-returned["'])[^"']+/i,
  /providerTargetMetadata\s*[:=]\s*["'](?!forbidden["'])[^"']+/i,
  /rawComment(?:Text|s|Retention)?\s*[:=]\s*["'](?!not-recorded|never-recorded|disabled-by-default)[^"']+/i
];

const scanned = [plG4Doc, plG5Doc, task].join("\n");
for (const pattern of forbiddenPatterns) {
  assert.doesNotMatch(scanned, pattern, `Step 5 evidence docs contain no sensitive match for ${pattern}`);
}

console.log(
  "comment translator Free beta Step 5 evidence docs contract passed (pl_g4=preview-pass, pl_g5=blocked-no, secret_scan=pass)"
);
