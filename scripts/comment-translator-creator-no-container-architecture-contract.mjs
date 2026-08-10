import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const architecturePath = "docs/active/COMMENT_TRANSLATOR_CREATOR_NO_CONTAINER_ARCHITECTURE.md";
const taskBoardPath = "docs/active/COMMENT_TRANSLATOR_CREATOR_NO_CONTAINER_IMPLEMENTATION_TASK_BOARD.md";
const crosswalkPath = "docs/active/COMMENT_TRANSLATOR_CREATOR_NO_CONTAINER_LEGACY_CROSSWALK.md";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const architecture = read(architecturePath);
const taskBoard = read(taskBoardPath);
const crosswalk = read(crosswalkPath);
const task = read("task.md");

for (const marker of [
  "verified_at=2026-08-06",
  "repository_state_reconciled_at=2026-08-10",
  "feasibility_decision=conditional-go",
  "launch_readiness_decision=no-go",
  "conditional-go=forbidden-while-release-hard-requirement-unresolved",
  "selected_runtime=cloudflare-workers-open-next",
  "selected_persistence=supabase-postgres-existing-server-only-boundary",
  "container_disposition=rejected-not-a-candidate",
  "implementation_status=implemented-through-nc-r1-local-readiness",
  "deploy_status=not-approved",
  "worker_bundle_internal_acceptance_ceiling_bytes=3000000",
  "worker_bundle_internal_ceiling_scope=local-acceptance-only",
  "## Current Free Architecture Inventory",
  "## Cost Boundary",
  "## No-Container Options",
  "## Recommended Architecture",
  "## Request And Data Flow",
  "## Trust Boundary",
  "## Failure And Rollback",
  "## Security And Privacy Invariants",
  "## Official Sources"
]) {
  assert.match(architecture, new RegExp(escapeRegExp(marker)), `missing architecture marker: ${marker}`);
}
assert.match(architecture, /official wording `3 MB after compression`/, "architecture must retain the official Worker size wording");
assert.match(architecture, /internal acceptance ceiling.*3,000,000 gzip-compressed bytes/, "architecture must retain the conservative exact internal Worker byte ceiling");
assert.match(architecture, /provider の binary\/decimal semantics.*主張しない/, "architecture must not infer provider binary or decimal size semantics");
assert.doesNotMatch(architecture, /\b3MiB\b/, "architecture must not retain the ambiguous 3MiB Worker size assertion");

for (const url of [
  "https://developers.cloudflare.com/workers/platform/pricing/",
  "https://developers.cloudflare.com/workers/platform/limits/",
  "https://developers.cloudflare.com/durable-objects/platform/pricing/",
  "https://developers.cloudflare.com/queues/platform/pricing/",
  "https://developers.cloudflare.com/kv/platform/pricing/",
  "https://developers.cloudflare.com/d1/platform/pricing/",
  "https://developers.cloudflare.com/r2/pricing/",
  "https://developers.cloudflare.com/workflows/reference/pricing/",
  "https://supabase.com/docs/guides/platform/billing-on-supabase",
  "https://supabase.com/docs/guides/platform/free-project-pausing",
  "https://azure.microsoft.com/en-us/pricing/details/translator/",
  "https://developers.openai.com/api/docs/models",
  "https://developers.deepl.com/docs/resources/usage-limits",
  "https://stripe.com/jp/pricing"
]) {
  assert.match(architecture, new RegExp(escapeRegExp(url)), `missing official source: ${url}`);
}

for (const costClass of [
  "Cloudflare platform/runtime cost",
  "Supabase/database cost",
  "translation/AI provider cost",
  "Stripe/payment processing cost",
  "other external service cost"
]) {
  assert.match(architecture, new RegExp(escapeRegExp(costClass)), `missing cost class: ${costClass}`);
}

const legacyIds = [
  ...Array.from({ length: 12 }, (_, index) => `C${index + 1}`),
  "CP1",
  "CP2",
  ...Array.from({ length: 9 }, (_, index) => `P1-${index + 1}`)
];

for (const id of legacyIds) {
  const rowPattern = new RegExp(`^\\| ${escapeRegExp(id)} \\|`, "gm");
  assert.equal(crosswalk.match(rowPattern)?.length ?? 0, 1, `${id} must have exactly one crosswalk row`);
}

for (const marker of [
  "## Inventory Field Contract",
  "legacy ID",
  "legacy name",
  "user value",
  "functional requirements",
  "security/privacy requirements",
  "persistence requirements",
  "external dependencies",
  "legacy dependencies",
  "legacy verification",
  "Container dependency",
  "new disposition",
  "new task ID",
  "redesign reason",
  "free-tier feasibility",
  "remaining cost trigger",
  "approval requirement",
  "## Rejected Implementation Boundary"
]) {
  assert.match(crosswalk, new RegExp(escapeRegExp(marker)), `missing crosswalk marker: ${marker}`);
}

const newTaskIds = [
  "NC-A0",
  "NC-F1",
  "NC-D1",
  "NC-E1",
  "NC-U1",
  "NC-P1",
  "NC-C1",
  "NC-O1",
  "NC-O2",
  "NC-M1",
  "NC-M2",
  "NC-H1",
  "NC-V1",
  "NC-B1",
  "NC-Q1",
  "NC-R1",
  "NC-L1",
  "NC-X1",
  "NC-X2",
  "NC-X3",
  "NC-X4",
  "NC-X5",
  "NC-X6",
  "NC-X7",
  "NC-X8",
  "NC-X9"
];
for (const id of newTaskIds) {
  assert.match(taskBoard, new RegExp(`^## ${id}:`, "m"), `missing new task: ${id}`);
}

for (const field of [
  "Goal",
  "Scope",
  "Out of scope",
  "Expected files/interfaces",
  "Dependencies",
  "RED/GREEN or characterization",
  "Targeted verification",
  "Broad verification",
  "Manual QA",
  "Rollback",
  "Approval implications",
  "External operations",
  "Completion criteria"
]) {
  const expected = newTaskIds.length;
  const count = taskBoard.match(new RegExp(`^- \\*\\*${escapeRegExp(field)}:\\*\\*`, "gm"))?.length ?? 0;
  assert.equal(count, expected, `${field} must exist for every new task`);
}

for (const marker of [
  "first_implementation_pr=NC-F1-completed-pr726",
  "implementation_status=implemented-through-nc-r1-local-readiness",
  "paid_launch_readiness_status=paused-no-go",
  "next_implementation_status=owner-selection-required",
  "candidate_lanes=NC-X2,NC-X3,NC-X4,NC-X5,NC-X6,NC-X7",
  "deploy_status=no-new-creator-deploy-proof",
  architecturePath,
  taskBoardPath,
  crosswalkPath
]) {
  assert.match(`${taskBoard}\n${task}`, new RegExp(escapeRegExp(marker)), `missing task authority marker: ${marker}`);
}
assert.doesNotMatch(taskBoard, /implementation_status=not-started|Only NC-A0 is in progress|NC-F1 is the next approved/i, "task board must not retain the superseded pre-implementation boundary");
assert.match(task, /current_goal=comment-translator-current-task-roadmap-reconciliation/, "task.md must select current-state reconciliation instead of a completed implementation lane");
assert.match(task, /next_implementation_status=owner-selection-required/, "task.md must require an explicit next implementation selection");

for (const currentVerification of [
  "NC-B1 billing、public entitlement、security/privacy、NC-R1、NC-Q1 are pass",
  "strict TypeScript、Next build、OpenNext build are pass",
  "Total Upload: 9477.87 KiB / gzip: 2032.88 KiB",
  "approved lockfile install: 691 packages",
  "package.json` / `package-lock.json` are unchanged"
]) {
  assert.match(architecture, new RegExp(escapeRegExp(currentVerification)), `missing current verification evidence: ${currentVerification}`);
}
assert.doesNotMatch(architecture, /2 pass \/ 6 dependency-blocked|fresh worktreeに`typescript` packageがなく|install非承認/);

process.stdout.write("comment translator Creator no-container architecture contract passed\n");

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
