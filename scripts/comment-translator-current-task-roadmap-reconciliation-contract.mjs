import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const taskPath = "task.md";
const architecturePath = "docs/active/COMMENT_TRANSLATOR_CREATOR_NO_CONTAINER_ARCHITECTURE.md";
const boardPath = "docs/active/COMMENT_TRANSLATOR_CREATOR_NO_CONTAINER_IMPLEMENTATION_TASK_BOARD.md";
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
const historicalTask = read(historicalTaskPath);

for (const marker of [
  "current_goal=comment-translator-creator-nc-x3-safe-csv-export",
  "current_base_tip=2e584819618d83fb50ae7f9f9a69e8306009386b",
  "current_pr=not-created",
  "current_pr_state=local-implementation-in-progress",
  "previous_pr=753",
  "previous_pr_state=merged",
  "previous_pr_final_head=5cc5c893c592d47c0680f99347730f6aa239ca2d",
  "previous_pr_merge_integration_tip=2e584819618d83fb50ae7f9f9a69e8306009386b",
  "implementation_baseline=merged-through-nc-q1",
  "readiness_control_plane=merged-through-pr751",
  "paid_launch_readiness=paused-no-go",
  "next_implementation_status=nc-x3-selected-and-in-progress",
  "selected_lane=NC-X3",
  "selected_lane_scope=bounded-server-owned-nc-h1-safe-history-csv-download",
  "safe_csv_columns=author,badge,purchase,translated_text,original_text,moderation,source",
  "safe_csv_row_bound=500-fail-closed-on-over-bound",
  "safe_csv_encoding=utf8-bom-crlf-rfc4180-quoting-formula-guard",
  "safe_csv_filename=comment-translator-safe-history.csv",
  "implementation_parent_profile=gpt-5.6-luna/max",
  "implementation_child=luna-implementer",
  "current_staged_rows_satisfied=0/8",
  "current_unresolved_hard_requirements=9",
  "activation_status=closed",
  "free_behavior=permanent",
  "nc_l1_status=not-started"
]) {
  assert.match(task, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `missing current task marker: ${marker}`);
}

assert.doesNotMatch(task, /current_pr=pending-create|current_pr_state=local-docs-only|implementation_status=not-started|Only NC-A0 is in progress|NC-F1 is the next approved/i);
assert.ok(task.split(/\r?\n/).length <= 140, "task.md must remain a compact current-state source");
assert.match(historicalTask, /current_pr_state=draft-open/);
assert.match(historicalTask, /current_goal=comment-translator-creator-nc-r1-paid-launch-readiness/);

for (const marker of [
  "verified_at=2026-08-10",
  "implementation_status=implemented-through-nc-r1-local-readiness",
  "paid_launch_readiness_status=paused-no-go",
  "next_implementation_status=owner-selection-required",
  "candidate_lanes=NC-X2,NC-X3,NC-X4,NC-X5,NC-X6,NC-X7",
  "| NC-F1 | PR #726 | merged |",
  "| NC-Q1 | PR #747 | merged |",
  "| NC-R1 | PR #748-#751 | merged-control-plane-paused-no-go |",
  "| NC-L1 | N/A | not-started-blocked-by-nc-r1-no-go |"
]) {
  assert.match(board, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `missing current board marker: ${marker}`);
}
assert.doesNotMatch(board, /implementation_status=not-started|Only NC-A0 is in progress|NC-F1 is the next approved/i);

for (const marker of [
  "verified_at=2026-08-06",
  "repository_state_reconciled_at=2026-08-10",
  "implementation_status=implemented-through-nc-r1-local-readiness",
  "PR #751",
  "8c86200d915a792488b61a535fb895da88d61f57",
  "Paid launch readiness remains paused at NO-GO"
]) {
  assert.match(architecture, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `missing architecture reconciliation marker: ${marker}`);
}

process.stdout.write("comment translator current task roadmap reconciliation contract passed\n");
