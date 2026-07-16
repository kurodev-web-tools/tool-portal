import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const docPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_REMAINING_TASK_BOARD.md";
const operatorChecklistPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_OPERATOR_QA_CHECKLIST.md";
const operationsDocPath = "docs/active/COMMENT_TRANSLATOR_CLOUDFLARE_CUSTOM_RULE_OPERATIONS.md";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const doc = read(docPath);
const task = read("task.md");
const operatorChecklist = read(operatorChecklistPath);
const operationsDoc = read(operationsDocPath);
const combined = [doc, task, operatorChecklist, operationsDoc].join("\n");

for (const marker of [
  "`support_contact_status` | `submitted`",
  "`support_response_status` | `pending`",
  "`current_table_rls_grant_status` | `pass`",
  "`remote_default_privileges_status` | `fail-accepted-risk`",
  "`remote_default_privileges_posture_status` | `fail`",
  "`risk_acceptance_status` | `accepted`",
  "`risk_acceptance_scope` | `future-public-object-default-privileges-only`",
  "`public_release_capable_status` | `yes`",
  "`public_gate_flip_status` | `complete-release-declaration-no-mutation`",
  "`main_promotion_status` | `complete-pr-640-merged-main-contained`",
  "`obs_dock_display_name_policy_status` | `complete`",
  "`public_beta_access_gate_decision_status` | `complete`",
  "`public_beta_access_gate_selected` | `login-only`",
  "`public_beta_waitlist_boundary` | `creator-paid-beta-only`",
  "`public_traffic_rate_limit_backing_status` | `complete`",
  "`public_traffic_rate_limit_backing_selected` | `cloudflare-edge`",
  "`edge_activation_status` | `deferred-not-required-for-free-public-beta`",
  "`edge_protection_readiness_status` | `pass-with-optional-edge-control-deferred`",
  "`edge_rate_limiting_disposition` | `deferred-existing-free-slot-reserved-for-leaked-credential-protection`",
  "`cloudflare_free_rate_limiting_slot_status` | `occupied-leaked-credential-protection`",
  "`app_enforcement_authority` | `durable-quotas-session-caps-rate-guards`",
  "`public_launch_operator_qa_checklist_status` | `complete`",
  "`operator_external_verification_status` | `pass-post-activation-browser-11-of-11`",
  "`operator_remaining_external_verification_status` | `complete`",
  "`final_public_release_declaration_status` | `complete`",
  "`final_public_release_declaration_preflight_status` | `pass`",
  "`final_production_smoke_status` | `pass`",
  "`final_production_smoke_comment_observed_count` | `3`",
  "`final_production_smoke_cache_hit_count` | `1`",
  "`final_production_smoke_provider_translation_count` | `2`",
  "`final_production_smoke_usage_delta_status` | `expected`",
  "`final_production_smoke_stop_status` | `pass`",
  "`google_auth_verification_status` | `approved`",
  "`unverified_app_warning_status` | `not-observed-after-fresh-reconnect`",
  "`oauth_reconnect_verification_status` | `pass`",
  "`operator_cloudflare_preview_custom_rule_status` | `configured-preview-only-managed-challenge`",
  "`operator_cloudflare_env_reference_status` | `present-enabled-label`",
  "`operator_free_beta_login_browser_smoke_status` | `pass-post-activation-production-browser`",
  "`operator_waitlist_boundary_browser_smoke_status` | `pass-post-activation-production-browser`",
  "`operator_youtube_connect_no_autostart_smoke_status` | `pass-preview-and-production-browser`",
  "`operator_production_api_managed_challenge_status` | `not-selected`",
  "`operator_production_harness_block_status` | `pass-production-404`",
  "`production_env_apply_status` | `applied-login-only-runtime`",
  "`production_main_domain_smoke_status` | `pass-post-activation-browser-11-of-11`",
  "`operator_start_to_translation_smoke_status` | `pass-production-main-domain-private-launch`",
  "`live_provider_execution_status` | `pass-operator-provided-private-launch-smoke`",
  "`cloudflare_custom_rule_operations_doc_status` | `complete`",
  "`cloudflare_custom_rule_operations_doc` | `docs/active/COMMENT_TRANSLATOR_CLOUDFLARE_CUSTOM_RULE_OPERATIONS.md`",
  "`free_public_launch_default` | `login-turnstile-app-quotas-no-constant-ordinary-route-challenge`",
  "`api_protection_preference_order` | `app-quotas-session-caps-rate-guards-then-cloudflare-rate-limiting-then-managed-challenge-emergency-or-html-only`",
  "`traffic_growth_response_ladder_status` | `documented`",
  "`pl_g5_release_owner_decision_preflight_doc_status` | `complete`",
  "`pl_g5_release_owner_decision_record_status` | `complete`",
  "`pl_g5_release_owner_decision_doc` | `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION.md`",
  "`release_owner_decision_status` | `accepted-promotion-readiness-only`",
  "`release_owner_missing_approval_scope` | `promotion-operation-and-post-deploy-verification`",
  "`release_owner_exact_approval_status` | `present-promotion-readiness-only`",
  "`codex_local_verification_status` | `pass`",
  "`Monthly input character accounting`",
  "`Free limits public copy`",
  "`OBS Dock display-name policy`",
  "`Public beta access gate decision`",
  "`Public traffic rate-limit backing`",
  "`Supabase default privileges support response or risk acceptance`",
  "`Public launch operator QA checklist`",
  "`PL-G5 release-owner decision`",
  "`PL-G6 final release declaration`",
  "The Step 8 update is a policy/UI/contract slice only.",
  "The Step 9 policy selected `login-only` for Free public beta access",
  "The Step 10 update selected `cloudflare-edge` as the preferred outer load-shedding backing",
  "The Step 11 update is a policy/contract/documentation slice only.",
  "The operator QA checklist update is a documentation/contract slice only.",
  "The Cloudflare custom-rule operations update is a documentation/contract slice only.",
  "The PL-G5 release-owner decision record is a documentation/contract slice only.",
  "Public copy changes: complete for Free limits public copy; no quota enforcement logic changed.",
  "OBS Dock behavior: display-name policy only.",
  "Public beta access gate behavior: decision only.",
  "Public traffic rate-limit backing behavior: `cloudflare-edge` remains the preferred optional outer load-shedding layer",
  "Supabase default privileges risk acceptance: decision only.",
  "Public launch operator QA checklist: complete for docs/contract separation and sanitized operator updates.",
  "Cloudflare custom-rule operations: complete for docs/contract guidance only.",
  "PL-G5 release-owner decision record: complete as a decision-time audit record.",
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
  "operator_external_verification_status=partial-pass-preview-and-production-private-launch-browser",
  "operator_remaining_external_verification_status=action-required",
  "operator_cloudflare_preview_custom_rule_status=configured-preview-only-managed-challenge",
  "operator_cloudflare_env_reference_status=present-enabled-label",
  "operator_free_beta_login_browser_smoke_status=pass-preview-browser",
  "operator_waitlist_boundary_browser_smoke_status=pass-preview-browser",
  "operator_youtube_connect_no_autostart_smoke_status=pass-preview-and-production-browser",
  "operator_production_api_managed_challenge_status=not-selected",
  "operator_production_harness_block_status=pass-production-404",
  "production_env_apply_status=confirmed-ready-operator-provided",
  "production_main_domain_smoke_status=pass-operator-provided-private-launch-browser",
  "operator_start_to_translation_smoke_status=pass-production-main-domain-private-launch",
  "live_provider_execution_status=pass-operator-provided-private-launch-smoke",
  "target_language_selection_status=pass-operator-provided-private-launch-browser",
  "short_reaction_filter_status=pass-operator-provided-private-launch-browser",
  "unauthorized_admin_visibility_status=pass-hidden-for-non-admin-account",
  "unauthorized_translator_access_status=pass-blocked-for-non-allowed-account",
  "cloudflare_custom_rule_operations_doc_status=complete",
  "cloudflare_custom_rule_operations_doc=docs/active/COMMENT_TRANSLATOR_CLOUDFLARE_CUSTOM_RULE_OPERATIONS.md",
  "free_public_launch_default=login-turnstile-app-quotas-no-constant-ordinary-route-challenge",
  "api_protection_preference_order=app-quotas-session-caps-rate-guards-then-cloudflare-rate-limiting-then-managed-challenge-emergency-or-html-only",
  "turnstile_pre_clearance_status=later-improvement-not-free-launch-requirement",
  "traffic_growth_response_ladder_status=documented",
  "pl_g5_release_owner_decision_preflight_doc_status=complete",
  "pl_g5_release_owner_decision_record_status=complete",
  "pl_g5_release_owner_decision_doc=docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION.md",
  "release_owner_decision_status=accepted-promotion-readiness-only",
  "release_owner_missing_approval_scope=promotion-operation-and-post-deploy-verification",
  "release_owner_exact_approval_status=present-promotion-readiness-only",
  "codex_local_verification_status=pass",
  "support_response_status=pending",
  "remote_default_privileges_status=fail-accepted-risk",
  "risk_acceptance_status=accepted",
  "risk_acceptance_scope=future-public-object-default-privileges-only",
  "public_release_capable=yes",
  "COMMENT_TRANSLATOR_PUBLIC_LAUNCH_REMAINING_TASK_BOARD.md",
  "COMMENT_TRANSLATOR_CLOUDFLARE_CUSTOM_RULE_OPERATIONS.md"
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
  "Cloudflare custom-rule operations doc",
  "PL-G5 release-owner decision",
  "PL-G6 final release declaration"
];

function sectionBetween(source, startMarker, endMarker, label) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker);
  assert.notEqual(start, -1, `${label} start marker exists`);
  assert.notEqual(end, -1, `${label} end marker exists`);
  assert.ok(end > start, `${label} markers are in order`);
  return source.slice(start, end);
}

function sectionFrom(source, startMarker, label) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `${label} start marker exists`);
  return source.slice(start);
}

const taskOrderSection = sectionFrom(
  doc,
  "## Remaining Public Launch Task Order",
  "launch task order"
);
const currentTaskOrderSection = sectionBetween(
  doc,
  "## Remaining Public Launch Task Order",
  "## Public-Before-Paid Boundary",
  "current launch task order"
);
assert.doesNotMatch(
  currentTaskOrderSection,
  /Public release capable remains no|Final production\/main-domain smoke remains later/i,
  "current launch task order has no stale pre-smoke release state"
);

const currentResidualRiskSection = sectionFrom(
  task,
  "## Current Blockers / Residual Risks",
  "current task residual risks"
);
assert.doesNotMatch(
  currentResidualRiskSection,
  /Public-release capable remains `no`|Final production\/main-domain smoke remains separately approval-gated|next public-capability decision point is the final release declaration/i,
  "current task residual risks have no stale pre-smoke release state"
);

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
  "comment translator public launch remaining task board contract passed (public_release_capable=yes, support=pending, risk_acceptance=accepted, secret_scan=pass)"
);
