import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const taskPath = "task.md";
const architecturePath = "docs/active/COMMENT_TRANSLATOR_CREATOR_NO_CONTAINER_ARCHITECTURE.md";
const boardPath = "docs/active/COMMENT_TRANSLATOR_CREATOR_NO_CONTAINER_IMPLEMENTATION_TASK_BOARD.md";
const capacityDecisionPath = "docs/active/COMMENT_TRANSLATOR_CREATOR_NC_X2B_RETENTION_CAPACITY_DECISION.md";
const historicalTaskPath = "docs/archive/task-board-pre-2026-08-10-current-state-reconciliation.md";
const archivedTemporaryDocs = [
  "docs/archive/PUBLIC_PRELAUNCH_VISUAL_REVIEW_NOTES.md",
  "docs/archive/THUMBNAIL_EDITOR_PHASE5_CLIP_PLAN.md"
];
const retiredActiveTemporaryDocs = [
  "docs/active/PUBLIC_PRELAUNCH_VISUAL_REVIEW_NOTES.md",
  "docs/active/THUMBNAIL_EDITOR_PHASE5_CLIP_PLAN.md"
];

for (const path of [historicalTaskPath, ...archivedTemporaryDocs]) {
  assert.ok(existsSync(new URL(`../${path}`, import.meta.url)), `missing archive: ${path}`);
}
for (const path of retiredActiveTemporaryDocs) {
  assert.equal(existsSync(new URL(`../${path}`, import.meta.url)), false, `temporary document must leave docs/active: ${path}`);
}

const task = read(taskPath);
const architecture = read(architecturePath);
const board = read(boardPath);
const capacityDecision = read(capacityDecisionPath);
const historicalTask = read(historicalTaskPath);

for (const marker of [
  "current_goal=comment-translator-creator-nc-x2b-capacity-decision-preflight",
  "current_base_tip=3bb4b4c4ba6f7ce76fda082f12cdefbcd41d5d1c",
  "current_pr=756",
  "current_pr_state=merged",
  "current_pr_implementation_head=9f5e456ae05e47e7043cd63d3d93d41bd51cc0e4",
  "current_pr_base=codex/comment-translator-free-public-beta-integration",
  "current_pr_final_head=9f5e456ae05e47e7043cd63d3d93d41bd51cc0e4",
  "current_pr_merge_integration_tip=3bb4b4c4ba6f7ce76fda082f12cdefbcd41d5d1c",
  "previous_pr=755",
  "previous_pr_state=merged",
  "previous_pr_final_head=c0f7108867080af65bd0f407e98ea9b253207d77",
  "previous_pr_merge_integration_tip=e79944142cf0fcb817895ba7ead2fbe5db8e277b",
  "implementation_baseline=merged-through-nc-x2a",
  "readiness_control_plane=merged-through-pr751",
  "paid_launch_readiness=paused-no-go",
  "next_implementation_status=nc-x2b-capacity-decision-preflight-local-docs-only",
  "selected_lane=NC-X2B-P0",
  "selected_lane_scope=capacity-preflight-only-no-retention-switch",
  "search_query_fields=author_display_name,original_text,translated_text",
  "search_normalization=rpc-owned-utf8-trim-collapse-whitespace-lower-c-collation",
  "search_bound=50-rows-fetch-51-next-cursor-no-total-count",
  "search_retention=inclusive-seven-days-server-clock-unchanged",
  "search_cursor=opaque-random-pagination-key-owner-query-bound-stale-fail-closed",
  "search_storage=additive-local-migration-not-applied",
  "cleanup_wiring=oauth-disconnect-owner-derived-cleanup-wired-account-deletion-seam-missing",
  "browser_search_authority=props-only-fixed-closed-optional-server-callback",
  "retention_switch=unapproved-unimplemented",
  "retention_decision=eligible-for-separate-switch-approval",
  "retention_decision_authority=local-design-preflight-not-production-or-account-evidence",
  "current_staged_rows_satisfied=0/8",
  "current_unresolved_hard_requirements=9",
  "activation_status=closed",
  "free_behavior=permanent",
  "nc_l1_status=not-started",
  "deployment_status=unconfirmed",
  "migration_apply_status=unconfirmed",
  "production_activation=closed",
  "account_headroom=unconfirmed",
  "provider_stripe_cloudflare_supabase_state=unconfirmed"
]) {
  assert.match(task, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `missing current task marker: ${marker}`);
}

assert.doesNotMatch(task, /current_pr=pending-create|current_pr_state=draft-open|implementation_status=not-started|current_goal=comment-translator-creator-nc-x2a|next_implementation_status=nc-x2a/i);
assert.doesNotMatch(task, /Paid launch readiness.*NC-X2A(?:は| is).*Paid launch.*activation.*NC-L1/i);
assert.doesNotMatch(task, /\| NC-X3 \| safe CSV export \| existing NC-H1|\| NC-X4 \| overlay templates \| static variants|\| NC-X5 \| dictionary import and suggestions \| bounded CSV/i);
assert.ok(task.split(/\r?\n/).length <= 140, "task.md must remain a compact current-state source");
assert.match(historicalTask, /current_pr_state=draft-open/);
assert.match(historicalTask, /current_goal=comment-translator-creator-nc-r1-paid-launch-readiness/);

for (const marker of [
  "verified_at=2026-08-11",
  "repository_state_reconciled_at=2026-08-11",
  "implementation_status=implemented-through-nc-x2a",
  "paid_launch_readiness_status=paused-no-go",
  "next_implementation_status=nc-x2b-capacity-decision-preflight-local-docs-only",
  "candidate_lanes=NC-X2B-P0,NC-X1,NC-X6,NC-X7",
  "| NC-F1 | PR #726 | merged |",
  "| NC-Q1 | PR #747 | merged |",
  "| NC-X4 | PR #753 | merged |",
  "| NC-X3 | PR #754 | merged |",
  "| NC-X5 | PR #755 | merged |",
  "| NC-X2A | PR #756 | merged |",
  "| NC-R1 | 0/8 staged rows; 9 unresolved hard requirements | no-go; activation=closed; Free=permanent |",
  "| NC-L1 | N/A | not-started; blocked by NC-R1 no-go |",
  "nc-x2b_p0_scope=capacity decision preflight; local documentation contract only"
]) {
  assert.match(board, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `missing current board marker: ${marker}`);
}
assert.doesNotMatch(board, /implementation_status=not-started|next_implementation_status=owner-selection-required|NC-X2B.*(?:runtime|schema|migration).*implemented/i);
assert.doesNotMatch(board, /Dependency-eligible candidates are NC-X2、NC-X3、NC-X4、NC-X5、NC-X6、and NC-X7[\s\S]*?Each remains `owner-selection-required`/i);

for (const marker of [
  "verified_at=2026-08-11",
  "repository_state_reconciled_at=2026-08-11",
  "implementation_status=implemented-through-nc-x2a",
  "deployment_success=unconfirmed",
  "migration_apply_status=unconfirmed",
  "account_headroom=unconfirmed",
  "PR #751",
  "PR #753",
  "PR #754",
  "PR #755",
  "PR #756",
  "3bb4b4c4ba6f7ce76fda082f12cdefbcd41d5d1c",
  "NC-R1 remains 0/8 staged rows, 9 unresolved hard requirements, decision=no-go, activation=closed, Free permanent, NC-L1 not-started",
  "NC-X2B thirty-day cutoff/switch remains unapproved and unimplemented",
  "NC-X2B-P0 Capacity Decision Preflight"
]) {
  assert.match(architecture, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `missing architecture reconciliation marker: ${marker}`);
}
assert.doesNotMatch(architecture, /\| integration \|[^\r\n]*8c86200d915a792488b61a535fb895da88d61f57/);
assert.doesNotMatch(architecture, /Repository implementation is merged through NC-Q1 and the NC-R1 control plane is merged through PR #751\./i);
assert.doesNotMatch(architecture, /^deployment success, migration apply, production activation, and account headroom remain unconfirmed; provider\/Stripe\/Cloudflare\/Supabase state remains unconfirmed\.$/m);

for (const marker of [
  "authority_scope=local-documentation-only",
  "decision=eligible-for-separate-switch-approval",
  "switch_status=unapproved-unimplemented",
  "evidence_classes=repository-local|synthetic-design|external-account|deployed-live",
  "S1_STORAGE_FORMULA=30,000 retained rows * average 1 KiB * (1 + 1.5 index-additional-overhead) ≈ 73.2 MiB",
  "S1_STORAGE_ROUNDED=about 75 MiB",
  "S1_EGRESS_FORMULA=2,000 pages/month * 50 rows/page * 1 KiB/row ≈ 97.7 MiB",
  "S1_EGRESS_ROUNDED=about 98 MiB",
  "index_additional_overhead_explanation=the 1.5 multiplier estimates index bytes in addition to base row bytes",
  "rollback_baseline=keep-seven-days",
  "rollback_window=seven-day",
  "residual_risks=actual-row-size,index-bloat,query-egress-overhead,account-headroom,evidence-freshness,approvals",
  "retention_switch_authorization=none",
  "migration_apply_authorization=none",
  "remote_read_write_authorization=none",
  "deploy_authorization=none",
  "activation_authorization=none",
  "nc_l1_permission=none"
]) {
  assert.match(capacityDecision, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `missing NC-X2B capacity marker: ${marker}`);
}

process.stdout.write("comment translator current task roadmap reconciliation contract passed\n");
