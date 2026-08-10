import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const paths = {
  task: "task.md",
  board: "docs/active/COMMENT_TRANSLATOR_CREATOR_NO_CONTAINER_IMPLEMENTATION_TASK_BOARD.md",
  architecture: "docs/active/COMMENT_TRANSLATOR_CREATOR_NO_CONTAINER_ARCHITECTURE.md",
  reconciliation: "scripts/comment-translator-current-task-roadmap-reconciliation-contract.mjs",
  capacityDecision: "docs/active/COMMENT_TRANSLATOR_CREATOR_NC_X2B_RETENTION_CAPACITY_DECISION.md"
};

const urlFor = (relativePath) => new URL(`../${relativePath}`, import.meta.url);
const read = (relativePath) => readFileSync(urlFor(relativePath), "utf8");

assert.ok(
  existsSync(urlFor(paths.capacityDecision)),
  "NC-X2B RED: the local retention-capacity decision authority is missing"
);

for (const [name, relativePath] of Object.entries(paths)) {
  assert.ok(existsSync(urlFor(relativePath)), `NC-X2B required ${name} path exists: ${relativePath}`);
}

const task = read(paths.task);
const board = read(paths.board);
const architecture = read(paths.architecture);
const reconciliation = read(paths.reconciliation);
const capacityDecision = read(paths.capacityDecision);
const contractSource = read("scripts/comment-translator-creator-nc-x2b-retention-capacity-decision-contract.mjs");

const requiredTaskMarkers = [
  "current_goal=comment-translator-creator-post-pr757-authority-contract-reconciliation",
  "current_base_tip=fd363cac334ad397f9d5ee7eb23bc25a0d860c4b",
  "current_pr=757",
  "current_pr_state=merged",
  "current_pr_implementation_head=cf5dfaf058a184c304de3ed972c08273367b50c2",
  "current_pr_final_head=cf5dfaf058a184c304de3ed972c08273367b50c2",
  "current_pr_merge_integration_tip=fd363cac334ad397f9d5ee7eb23bc25a0d860c4b",
  "next_implementation_status=owner-approval-required-before-any-next-lane",
  "selected_lane=none-pending-explicit-owner-approval",
  "selected_lane_scope=post-merge-authority-contract-reconciliation-only",
  "search_retention=inclusive-seven-days-server-clock-unchanged",
  "retention_switch=unapproved-unimplemented",
  "retention_decision=eligible-for-separate-switch-approval",
  "current_staged_rows_satisfied=0/8",
  "current_unresolved_hard_requirements=9",
  "activation_status=closed",
  "free_behavior=permanent",
  "nc_l1_status=not-started",
  "deployment_status=unconfirmed",
  "migration_apply_status=unconfirmed",
  "account_headroom=unconfirmed",
  "provider_stripe_cloudflare_supabase_state=unconfirmed"
];
for (const marker of requiredTaskMarkers) {
  assert.match(task, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `missing task marker: ${marker}`);
}
assert.doesNotMatch(task, /current_goal=comment-translator-creator-nc-x2a|current_pr_state=draft-open|next_implementation_status=nc-x2a/i);
assert.match(task, /PR #753.*NC-X4.*PR #754.*NC-X3.*PR #755.*NC-X5.*PR #756.*NC-X2A/s);
assert.match(task, /NC-X2B thirty-day retention switch remains unapproved and unimplemented/i);
assert.match(task, /deployment success.*migration apply.*production activation.*account headroom.*unconfirmed/i);

for (const marker of [
  "verified_at=2026-08-11",
  "repository_state_reconciled_at=2026-08-11",
  "implementation_status=implemented-through-nc-x2b-p0",
  "next_implementation_status=owner-approval-required-before-any-next-lane",
  "| NC-X4 | PR #753 | merged |",
  "| NC-X3 | PR #754 | merged |",
  "| NC-X5 | PR #755 | merged |",
  "| NC-X2A | PR #756 | merged |",
  "| NC-X2B-P0 | PR #757 | merged |",
  "| NC-R1 | 0/8 staged rows; 9 unresolved hard requirements | no-go; activation=closed; Free=permanent |",
  "| NC-L1 | N/A | not-started; blocked by NC-R1 no-go |"
]) {
  assert.match(board, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `missing board marker: ${marker}`);
}
assert.match(board, /NC-X2B-P0.*capacity decision preflight.*local.*documentation.*contract/s);
assert.match(board, /thirty-day.*switch.*unapproved.*unimplemented/i);
assert.match(board, /deployment success.*migration apply.*production activation.*account headroom.*unconfirmed/i);

for (const marker of [
  "verified_at=2026-08-11",
  "repository_state_reconciled_at=2026-08-11",
  "implementation_status=implemented-through-nc-x2b-p0",
  "PR #753",
  "PR #754",
  "PR #755",
  "PR #756",
  "PR #757",
  "fd363cac334ad397f9d5ee7eb23bc25a0d860c4b",
  "NC-R1 remains 0/8 staged rows, 9 unresolved hard requirements, decision=no-go, activation=closed, Free permanent, NC-L1 not-started",
  "NC-X2B thirty-day cutoff/switch remains unapproved and unimplemented"
]) {
  assert.match(architecture, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `missing architecture marker: ${marker}`);
}
assert.match(architecture, /deployment success.*migration apply.*production activation.*account headroom.*unconfirmed/is);
assert.match(architecture, /NC-X2B-P0.*Capacity Decision Preflight/s);

for (const marker of [
  "current_goal=comment-translator-creator-post-pr757-authority-contract-reconciliation",
  "current_pr_state=merged",
  "current_pr_merge_integration_tip=fd363cac334ad397f9d5ee7eb23bc25a0d860c4b",
  "next_implementation_status=owner-approval-required-before-any-next-lane",
  "NC-X2B-P0",
  "COMMENT_TRANSLATOR_CREATOR_NC_X2B_RETENTION_CAPACITY_DECISION.md"
]) {
  assert.match(reconciliation, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `missing reconciliation marker: ${marker}`);
}

const allowedDecisions = new Set([
  "keep-seven-days",
  "eligible-for-separate-switch-approval",
  "no-go"
]);
const decisionMatch = capacityDecision.match(/^decision=([^\r\n]+)$/m);
assert.ok(decisionMatch, "NC-X2B must record exactly one decision field");
assert.ok(allowedDecisions.has(decisionMatch[1]), `NC-X2B decision must be fail-closed: ${decisionMatch[1]}`);
assert.equal(
  capacityDecision.match(/^decision=/gm)?.length,
  1,
  "NC-X2B must expose exactly one final decision, not multiple decision states"
);
assert.equal(decisionMatch[1], "eligible-for-separate-switch-approval");

for (const marker of [
  "evidence_classes=repository-local|synthetic-design|external-account|deployed-live",
  "S1_STORAGE_RETAINED_ROWS=30000; class=synthetic-design; status=design-assumption; production_evidence=no",
  "S1_STORAGE_AVERAGE_ROW_SIZE=1 KiB; class=synthetic-design; status=design-assumption; production_evidence=no",
  "S1_STORAGE_INDEX_ADDITIONAL_OVERHEAD=1.5; class=synthetic-design; status=design-assumption; production_evidence=no",
  "S1_EGRESS_PAGES_PER_MONTH=2000; class=synthetic-design; status=design-assumption; production_evidence=no",
  "S1_EGRESS_ROWS_PER_PAGE=50; class=synthetic-design; status=design-assumption; production_evidence=no",
  "S1_EGRESS_AVERAGE_ROW_SIZE=1 KiB; class=synthetic-design; status=design-assumption; production_evidence=no",
  "S1_STORAGE_FORMULA=30,000 retained rows * average 1 KiB * (1 + 1.5 index-additional-overhead) ≈ 73.2 MiB",
  "S1_STORAGE_ROUNDED=about 75 MiB",
  "S1_EGRESS_FORMULA=2,000 pages/month * 50 rows/page * 1 KiB/row ≈ 97.7 MiB",
  "S1_EGRESS_ROUNDED=about 98 MiB",
  "index_additional_overhead_explanation=the 1.5 multiplier estimates index bytes in addition to base row bytes",
  "repository-local=merged-PR-and-local-contract-evidence-only",
  "synthetic-design=S1-assumptions-and-arithmetic-only",
  "external-account=unconfirmed-account-headroom-and-provider-state",
  "deployed-live=unconfirmed-deployment-and-activation"
]) {
  assert.match(capacityDecision, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `missing capacity marker: ${marker}`);
}

const s1Lines = capacityDecision.split(/\r?\n/).filter((line) => line.startsWith("S1_"));
assert.ok(s1Lines.length >= 7, "all S1 design inputs must be explicit rows");
for (const line of s1Lines) {
  assert.match(line, /class=synthetic-design; status=design-assumption; production_evidence=no/);
}

for (const marker of [
  "deployment_success=unconfirmed",
  "migration_apply=unconfirmed",
  "production_activation=closed",
  "account_headroom=unconfirmed",
  "provider_state=unconfirmed",
  "stripe_state=unconfirmed",
  "cloudflare_state=unconfirmed",
  "supabase_state=unconfirmed",
  "retention_switch_authorization=none",
  "migration_apply_authorization=none",
  "remote_read_write_authorization=none",
  "deploy_authorization=none",
  "activation_authorization=none",
  "nc_l1_permission=none",
  "runtime_change=none",
  "schema_or_migration_apply=none",
  "rollback_baseline=keep-seven-days",
  "rollback_window=seven-day",
  "residual_risks=actual-row-size,index-bloat,query-egress-overhead,account-headroom,evidence-freshness,approvals"
]) {
  assert.match(capacityDecision, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `missing safety marker: ${marker}`);
}
assert.match(capacityDecision, /separate approval.*retention switch.*required/i);
assert.match(capacityDecision, /migration apply.*remote read\/write.*deploy.*activation.*NC-L1.*not authorized/i);
assert.match(capacityDecision, /seven-day rollback/i);
assert.doesNotMatch(capacityDecision, /apply migration|remote (?:read|write) executed|deploy executed|activation executed/i);

assert.doesNotMatch(contractSource, /\b(?:exec|spawn|fetch)\s*\(/i, "NC-X2B contract must remain local read-only");

process.stdout.write(
  `comment translator Creator NC-X2B retention capacity decision contract passed (decision=${decisionMatch[1]}; switch=unapproved-unimplemented)\n`
);
