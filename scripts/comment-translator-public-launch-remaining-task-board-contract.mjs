import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const docPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_REMAINING_TASK_BOARD.md";
const operatorChecklistPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_OPERATOR_QA_CHECKLIST.md";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const doc = read(docPath);
const task = read("task.md");
const operatorChecklist = read(operatorChecklistPath);
const combined = [doc, task, operatorChecklist].join("\n");

for (const marker of [
  "`support_contact_status` | `submitted`",
  "`support_response_status` | `pending`",
  "`current_table_rls_grant_status` | `pass`",
  "`remote_default_privileges_status` | `fail-accepted-risk`",
  "`remote_default_privileges_posture_status` | `fail`",
  "`risk_acceptance_status` | `accepted`",
  "`risk_acceptance_scope` | `future-public-object-default-privileges-only`",
  "`public_release_capable_status` | `no`",
  "`public_gate_flip_status` | `not-run`",
  "`main_promotion_status` | `not-run`",
  "`obs_dock_display_name_policy_status` | `complete`",
  "`public_beta_access_gate_decision_status` | `complete`",
  "`public_beta_access_gate_selected` | `login-only`",
  "`public_beta_waitlist_boundary` | `creator-paid-beta-only`",
  "`public_traffic_rate_limit_backing_status` | `complete`",
  "`public_traffic_rate_limit_backing_selected` | `cloudflare-edge`",
  "`edge_activation_status` | `not-run-approval-gated`",
  "`public_launch_operator_qa_checklist_status` | `complete`",
  "`operator_external_verification_status` | `partial-pass-preview-browser`",
  "`operator_remaining_external_verification_status` | `action-required`",
  "`operator_cloudflare_preview_custom_rule_status` | `configured-preview-only-managed-challenge`",
  "`operator_cloudflare_env_reference_status` | `present-enabled-label`",
  "`operator_free_beta_login_browser_smoke_status` | `pass-preview-browser`",
  "`operator_waitlist_boundary_browser_smoke_status` | `pass-preview-browser`",
  "`operator_youtube_connect_no_autostart_smoke_status` | `pass-preview-browser`",
  "`operator_production_api_managed_challenge_status` | `not-selected`",
  "`operator_production_harness_block_status` | `action-required-before-production`",
  "`codex_local_verification_status` | `pass`",
  "`Monthly input character accounting`",
  "`Free limits public copy`",
  "`OBS Dock display-name policy`",
  "`Public beta access gate decision`",
  "`Public traffic rate-limit backing`",
  "`Supabase default privileges support response or risk acceptance`",
  "`Public launch operator QA checklist`",
  "`PL-G5 release-owner decision`",
  "`PL-G6 public access change / promotion`",
  "The Step 8 update is a policy/UI/contract slice only.",
  "The Step 9 update is a policy/contract/documentation slice only.",
  "The Step 10 update is a policy/contract/documentation slice only.",
  "The Step 11 update is a policy/contract/documentation slice only.",
  "The operator QA checklist update is a documentation/contract slice only.",
  "Public copy changes: complete for Free limits public copy; no quota enforcement logic changed.",
  "OBS Dock behavior: display-name policy only.",
  "Public beta access gate behavior: decision only.",
  "Public traffic rate-limit backing behavior: decision only.",
  "Supabase default privileges risk acceptance: decision only.",
  "Public launch operator QA checklist: complete for docs/contract separation and 2026-07-09 sanitized operator update.",
  "Supabase default privileges remediation/apply: not run."
]) {
  assert.ok(doc.includes(marker), `launch remaining task board doc records ${marker}`);
}

for (const marker of [
  "codex/comment-translator-free-limits-public-copy",
  "Public launch remaining task board",
  "monthly_input_character_accounting_status=complete",
  "free_limits_public_copy_status=complete",
  "obs_dock_display_name_policy_status=complete",
  "public_beta_access_gate_decision_status=complete",
  "public_beta_access_gate_selected=login-only",
  "public_traffic_rate_limit_backing_status=complete",
  "public_traffic_rate_limit_backing_selected=cloudflare-edge",
  "public_launch_operator_qa_checklist_status=complete",
  "operator_external_verification_status=partial-pass-preview-browser",
  "operator_remaining_external_verification_status=action-required",
  "operator_cloudflare_preview_custom_rule_status=configured-preview-only-managed-challenge",
  "operator_cloudflare_env_reference_status=present-enabled-label",
  "operator_free_beta_login_browser_smoke_status=pass-preview-browser",
  "operator_waitlist_boundary_browser_smoke_status=pass-preview-browser",
  "operator_youtube_connect_no_autostart_smoke_status=pass-preview-browser",
  "operator_production_api_managed_challenge_status=not-selected",
  "operator_production_harness_block_status=action-required-before-production",
  "codex_local_verification_status=pass",
  "support_response_status=pending",
  "remote_default_privileges_status=fail-accepted-risk",
  "risk_acceptance_status=accepted",
  "risk_acceptance_scope=future-public-object-default-privileges-only",
  "public_release_capable=no",
  "COMMENT_TRANSLATOR_PUBLIC_LAUNCH_REMAINING_TASK_BOARD.md"
]) {
  assert.ok(task.includes(marker), `task.md records ${marker}`);
}

const taskOrder = [
  "Monthly input character accounting",
  "Free limits public copy",
  "OBS Dock display-name policy",
  "Public beta access gate decision",
  "Public traffic rate-limit backing",
  "Supabase default privileges support response or risk acceptance",
  "Public launch operator QA checklist",
  "PL-G5 release-owner decision",
  "PL-G6 public access change / promotion"
];

const taskOrderSection = doc.slice(doc.indexOf("## Remaining Public Launch Task Order"));
let previousIndex = -1;
for (const taskLabel of taskOrder) {
  const index = taskOrderSection.indexOf(taskLabel);
  assert.ok(index > previousIndex, `${taskLabel} appears in launch order`);
  previousIndex = index;
}

const sensitivePatterns = [
  /sb_(?:secret|publishable)_[A-Za-z0-9_-]{20,}/,
  /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/,
  /postgres(?:ql)?:\/\/[^\s'")]+/i,
  /Authorization\s*:\s*[^\s'")]+/i,
  /Bearer\s+[A-Za-z0-9_.-]{20,}/i,
  /service_role\s*[:=]\s*["'][^"']+["']/i,
  /owner(?:_id| id)\s*[:=]\s*["'][^"']+["']/i,
  /project(?:_id| id)\s*[:=]\s*["'][^"']+["']/i,
  /support(?:_ticket| ticket| id)\s*[:=]\s*["'][^"']+["']/i
];

for (const pattern of sensitivePatterns) {
  assert.doesNotMatch(combined, pattern, `no sensitive value matching ${pattern}`);
}

console.log(
  "comment translator public launch remaining task board contract passed (public_release_capable=no, support=pending, risk_acceptance=accepted, secret_scan=pass)"
);
