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
  "current_goal=comment-translator-creator-nc-x2b-r1-thirty-day-retention-switch",
  "current_base_tip=8e17338ce35c72ec5e18e1683666671e79321504",
  "current_pr=760",
  "current_pr_state=merged",
  "current_pr_implementation_head=c775655d78a890c0a963da90c6803216d9fe82c8",
  "current_pr_base=codex/comment-translator-free-public-beta-integration",
  "current_pr_final_head=c775655d78a890c0a963da90c6803216d9fe82c8",
  "current_pr_merge_integration_tip=8e17338ce35c72ec5e18e1683666671e79321504",
  "previous_pr=759",
  "previous_pr_state=merged",
  "previous_pr_final_head=a53db3ff1d9af6df8ea60c0162ccc265989bc807",
  "previous_pr_merge_integration_tip=contained-in-current-integration-tip",
  "implementation_baseline=merged-through-nc-x2b-p0",
  "repository_implementation_status=repository-implemented-not-applied",
  "readiness_control_plane=merged-through-pr751",
  "paid_launch_readiness=paused-no-go",
  "next_implementation_status=owner-approval-required-before-migration-apply-or-any-external-action",
  "selected_lane=NC-X2B-R1-repository-only",
  "selected_lane_scope=repository-only-thirty-day-retention-switch",
  "search_query_fields=author_display_name,original_text,translated_text",
  "search_normalization=rpc-owned-utf8-trim-collapse-whitespace-lower-c-collation",
  "search_bound=50-rows-fetch-51-next-cursor-no-total-count",
  "search_retention=inclusive-thirty-days-server-clock-repository-implemented-not-applied",
  "effective_deployed_retention=inclusive-seven-days-server-clock-unconfirmed",
  "search_cursor=opaque-random-pagination-key-owner-query-bound-stale-fail-closed",
  "search_storage=additive-local-migration-not-applied",
  "cleanup_wiring=oauth-disconnect-owner-derived-cleanup-wired-account-deletion-seam-missing",
  "browser_search_authority=props-only-fixed-closed-optional-server-callback",
  "retention_switch=repository-implemented-not-applied",
  "retention_decision=eligible-for-separate-switch-approval",
  "retention_decision_authority=owner-approved-repository-only-not-production-or-account-evidence",
  "current_staged_rows_satisfied=0/8",
  "current_unresolved_hard_requirements=9",
  "activation_status=closed",
  "free_behavior=permanent",
  "nc_l1_status=not-started",
  "deployment_status=unconfirmed",
  "deploy_status=not-run",
  "migration_apply_status=not-run",
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
  "current_pr=760",
  "current_pr_head=c775655d78a890c0a963da90c6803216d9fe82c8",
  "current_pr_merge_integration_tip=8e17338ce35c72ec5e18e1683666671e79321504",
  "implementation_status=repository-implemented-not-applied",
  "paid_launch_readiness_status=paused-no-go",
  "current_lane=NC-X2B-R1",
  "repository_retention_policy=inclusive-thirty-days-server-clock",
  "effective_deployed_retention=inclusive-seven-days-server-clock-unconfirmed",
  "next_implementation_status=owner-approval-required-before-migration-apply-or-any-external-action",
  "candidate_lanes=NC-X1,NC-X6,NC-X7,NC-X2B-R1-migration-apply",
  "| NC-F1 | PR #726 | merged |",
  "| NC-Q1 | PR #747 | merged |",
  "| NC-X4 | PR #753 | merged |",
  "| NC-X3 | PR #754 | merged |",
  "| NC-X5 | PR #755 | merged |",
  "| NC-X2A | PR #756 | merged |",
  "| NC-X2B-P0 | PR #757 | merged |",
  "| NC-X2B-R1 | PR #760 | merged; repository-implemented-not-applied; migration not-run; deploy/activation closed |",
  "| NC-R1 | 0/8 staged rows; 9 unresolved hard requirements | no-go; activation=closed; Free=permanent |",
  "| NC-L1 | N/A | not-started; blocked by NC-R1 no-go |",
  "nc-x2b_p0_scope=capacity decision preflight; local documentation contract only",
  "NC-X2B-R1 | PR #760 | merged; repository-implemented-not-applied",
  "PR #759 remains a contained predecessor"
]) {
  assert.match(board, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `missing current board marker: ${marker}`);
}
assert.doesNotMatch(board, /implementation_status=not-started|next_implementation_status=owner-selection-required|NC-X2B.*unapproved-unimplemented/i);
assert.doesNotMatch(board, /Dependency-eligible candidates are NC-X2、NC-X3、NC-X4、NC-X5、NC-X6、and NC-X7[\s\S]*?Each remains `owner-selection-required`/i);

for (const marker of [
  "verified_at=2026-08-11",
  "repository_state_reconciled_at=2026-08-11",
  "implementation_status=repository-implemented-not-applied",
  "current_lane=NC-X2B-R1",
  "repository_retention_policy=inclusive-thirty-days-server-clock",
  "effective_deployed_retention=inclusive-seven-days-server-clock-unconfirmed",
  "deployment_success=unconfirmed",
  "migration_apply_status=not-run",
  "account_headroom=unconfirmed",
  "PR #751",
  "PR #753",
  "PR #754",
  "PR #755",
  "PR #756",
  "PR #757",
  "PR #758",
  "PR #759",
  "PR #760",
  "c775655d78a890c0a963da90c6803216d9fe82c8",
  "8e17338ce35c72ec5e18e1683666671e79321504",
  "NC-R1 remains 0/8 staged rows, 9 unresolved hard requirements, decision=no-go, activation=closed, Free permanent, NC-L1 not-started",
  "NC-X2B-R1 is approved only for repository implementation",
  "NC-X2B-P0 Capacity Decision Preflight"
]) {
  assert.match(architecture, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `missing architecture reconciliation marker: ${marker}`);
}
assert.doesNotMatch(architecture, /\| integration \|[^\r\n]*8c86200d915a792488b61a535fb895da88d61f57/);
assert.doesNotMatch(architecture, /Repository implementation is merged through NC-Q1 and the NC-R1 control plane is merged through PR #751\./i);
assert.doesNotMatch(architecture, /^deployment success, migration apply, production activation, and account headroom remain unconfirmed; provider\/Stripe\/Cloudflare\/Supabase state remains unconfirmed\.$/m);

for (const marker of [
  "authority_scope=repository-only-switch-implementation",
  "current_pr=760",
  "current_pr_head=c775655d78a890c0a963da90c6803216d9fe82c8",
  "current_pr_merge_integration_tip=8e17338ce35c72ec5e18e1683666671e79321504",
  "decision=eligible-for-separate-switch-approval",
  "implementation_status=repository-implemented-not-applied",
  "switch_status=repository-implemented-not-applied",
  "retention_cutoff=thirty-day-repository-policy-not-applied",
  "effective_deployed_retention=inclusive-seven-days-server-clock-unconfirmed",
  "evidence_classes=repository-local|synthetic-design|external-account|deployed-live",
  "S1_STORAGE_FORMULA=30,000 retained rows * average 1 KiB * (1 + 1.5 index-additional-overhead) ≈ 73.2 MiB",
  "S1_STORAGE_ROUNDED=about 75 MiB",
  "S1_EGRESS_FORMULA=2,000 pages/month * 50 rows/page * 1 KiB/row ≈ 97.7 MiB",
  "S1_EGRESS_ROUNDED=about 98 MiB",
  "index_additional_overhead_explanation=the 1.5 multiplier estimates index bytes in addition to base row bytes",
  "rollback_baseline=keep-seven-days",
  "rollback_window=seven-day",
  "residual_risks=actual-row-size,index-bloat,query-egress-overhead,account-headroom,evidence-freshness,approvals",
  "retention_switch_authorization=repository-only-implementation-approved-no-apply",
  "migration_apply_authorization=none",
  "remote_read_write_authorization=none",
  "deploy_authorization=none",
  "activation_authorization=none",
  "nc_l1_permission=none"
]) {
  assert.match(capacityDecision, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `missing NC-X2B capacity marker: ${marker}`);
}

process.stdout.write("comment translator current task roadmap reconciliation contract passed\n");
