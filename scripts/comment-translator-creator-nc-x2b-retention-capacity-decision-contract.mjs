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
  "current_goal=comment-translator-creator-nc-x2b-r1-thirty-day-retention-switch",
  "current_base_tip=8e17338ce35c72ec5e18e1683666671e79321504",
  "current_pr=760",
  "current_pr_state=merged",
  "current_pr_implementation_head=c775655d78a890c0a963da90c6803216d9fe82c8",
  "current_pr_final_head=c775655d78a890c0a963da90c6803216d9fe82c8",
  "current_pr_merge_integration_tip=8e17338ce35c72ec5e18e1683666671e79321504",
  "next_implementation_status=owner-approval-required-before-migration-apply-or-any-external-action",
  "selected_lane=NC-X2B-R1-repository-only",
  "selected_lane_scope=repository-only-thirty-day-retention-switch",
  "search_retention=inclusive-thirty-days-server-clock-repository-implemented-not-applied",
  "effective_deployed_retention=inclusive-seven-days-server-clock-unconfirmed",
  "repository_implementation_status=repository-implemented-not-applied",
  "retention_switch=repository-implemented-not-applied",
  "retention_decision=eligible-for-separate-switch-approval",
  "current_staged_rows_satisfied=0/8",
  "current_unresolved_hard_requirements=9",
  "activation_status=closed",
  "free_behavior=permanent",
  "nc_l1_status=not-started",
  "deployment_status=unconfirmed",
  "migration_apply_status=not-run",
  "account_headroom=unconfirmed",
  "provider_stripe_cloudflare_supabase_state=unconfirmed"
];
for (const marker of requiredTaskMarkers) {
  assert.match(task, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `missing task marker: ${marker}`);
}
assert.doesNotMatch(task, /current_goal=comment-translator-creator-nc-x2a|current_pr_state=draft-open|next_implementation_status=nc-x2a/i);
assert.match(task, /PR #753.*NC-X4.*PR #754.*NC-X3.*PR #755.*NC-X5.*PR #756.*NC-X2A/s);
assert.match(task, /NC-X2B-R1 repository switch is implemented but not applied/i);
assert.match(task, /deployment success.*migration apply.*production activation.*account headroom.*unconfirmed/i);

for (const marker of [
  "verified_at=2026-08-11",
  "repository_state_reconciled_at=2026-08-11",
  "current_pr=760",
  "current_pr_head=c775655d78a890c0a963da90c6803216d9fe82c8",
  "current_pr_merge_integration_tip=8e17338ce35c72ec5e18e1683666671e79321504",
  "implementation_status=repository-implemented-not-applied",
  "current_lane=NC-X2B-R1",
  "next_implementation_status=owner-approval-required-before-migration-apply-or-any-external-action",
  "| NC-X4 | PR #753 | merged |",
  "| NC-X3 | PR #754 | merged |",
  "| NC-X5 | PR #755 | merged |",
  "| NC-X2A | PR #756 | merged |",
  "| NC-X2B-P0 | PR #757 | merged |",
  "| NC-X2B-R1 | PR #760 | merged; repository-implemented-not-applied; migration not-run; deploy/activation closed |",
  "| NC-R1 | 0/8 staged rows; 9 unresolved hard requirements | no-go; activation=closed; Free=permanent |",
  "| NC-L1 | N/A | not-started; blocked by NC-R1 no-go |",
  "PR #759 remains a contained predecessor"
]) {
  assert.match(board, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `missing board marker: ${marker}`);
}
assert.match(board, /NC-X2B-P0.*capacity decision preflight.*local.*documentation.*contract/s);
assert.match(board, /NC-X2B-R1.*repository-implemented-not-applied/i);
assert.match(board, /deployment success.*migration apply.*production activation.*account headroom.*unconfirmed/i);

for (const marker of [
  "verified_at=2026-08-11",
  "repository_state_reconciled_at=2026-08-11",
  "implementation_status=repository-implemented-not-applied",
  "current_lane=NC-X2B-R1",
  "PR #753",
  "PR #754",
  "PR #755",
  "PR #756",
  "PR #757",
  "PR #760",
  "c775655d78a890c0a963da90c6803216d9fe82c8",
  "8e17338ce35c72ec5e18e1683666671e79321504",
  "NC-R1 remains 0/8 staged rows, 9 unresolved hard requirements, decision=no-go, activation=closed, Free permanent, NC-L1 not-started",
  "The thirty-day switch is repository-implemented-not-applied; the deployed effective seven-day server-clock baseline remains unconfirmed and unchanged by this task."
]) {
  assert.match(architecture, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `missing architecture marker: ${marker}`);
}
assert.match(architecture, /deployment success.*migration apply.*production activation.*account headroom.*unconfirmed/is);
assert.match(architecture, /NC-X2B-P0.*Capacity Decision Preflight/s);

for (const marker of [
  "current_goal=comment-translator-creator-nc-x2b-r1-thirty-day-retention-switch",
  "current_pr=760",
  "current_pr_state=merged",
  "current_pr_merge_integration_tip=8e17338ce35c72ec5e18e1683666671e79321504",
  "next_implementation_status=owner-approval-required-before-migration-apply-or-any-external-action",
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
  "current_pr=760",
  "current_pr_head=c775655d78a890c0a963da90c6803216d9fe82c8",
  "current_pr_merge_integration_tip=8e17338ce35c72ec5e18e1683666671e79321504",
  "implementation_status=repository-implemented-not-applied",
  "switch_status=repository-implemented-not-applied",
  "retention_cutoff=thirty-day-repository-policy-not-applied",
  "effective_deployed_retention=inclusive-seven-days-server-clock-unconfirmed",
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
  "migration_apply=not-run",
  "deploy_status=not-run",
  "production_activation=closed",
  "account_headroom=unconfirmed",
  "provider_state=unconfirmed",
  "stripe_state=unconfirmed",
  "cloudflare_state=unconfirmed",
  "supabase_state=unconfirmed",
  "retention_switch_authorization=repository-only-implementation-approved-no-apply",
  "migration_apply_authorization=none",
  "remote_read_write_authorization=none",
  "deploy_authorization=none",
  "activation_authorization=none",
  "nc_l1_permission=none",
  "runtime_change=repository-only-metadata-and-local-age-guard",
  "schema_or_migration_apply=repository-migration-present-not-applied",
  "rollback_baseline=keep-seven-days",
  "rollback_window=seven-day",
  "residual_risks=actual-row-size,index-bloat,query-egress-overhead,account-headroom,evidence-freshness,approvals"
]) {
  assert.match(capacityDecision, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `missing safety marker: ${marker}`);
}
assert.match(
  capacityDecision,
  /separate approval remains required for schema or migration apply, remote read\/write, account observation, deploy, browser verification, activation, public gate, or NC-L1/i
);
assert.match(capacityDecision, /seven-day rollback/i);
assert.doesNotMatch(capacityDecision, /apply migration|remote (?:read|write) executed|deploy executed|activation executed/i);

assert.doesNotMatch(contractSource, /\b(?:exec|spawn|fetch)\s*\(/i, "NC-X2B contract must remain local read-only");

process.stdout.write(
  `comment translator Creator NC-X2B retention capacity decision contract passed (decision=${decisionMatch[1]}; switch=repository-implemented-not-applied)\n`
);
