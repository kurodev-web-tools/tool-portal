import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const migrationPath = "supabase/migrations/20260811010000_comment_translator_creator_thirty_day_history_retention.sql";
const historicalH1Path = "supabase/migrations/20260802040000_comment_translator_creator_safe_history.sql";
const historicalX2APath = "supabase/migrations/20260810010000_comment_translator_creator_history_search.sql";
const runtimePath = "lib/comment-translator-creator-history-runtime.ts";
const storePath = "lib/comment-translator-creator-history-store.ts";
const panelPath = "components/comment-translator/CommentTranslatorCreatorHistoryPanel.tsx";
const taskPath = "task.md";
const boardPath = "docs/active/COMMENT_TRANSLATOR_CREATOR_NO_CONTAINER_IMPLEMENTATION_TASK_BOARD.md";
const architecturePath = "docs/active/COMMENT_TRANSLATOR_CREATOR_NO_CONTAINER_ARCHITECTURE.md";
const capacityDecisionPath = "docs/active/COMMENT_TRANSLATOR_CREATOR_NC_X2B_RETENTION_CAPACITY_DECISION.md";
const roadmapContractPath = "scripts/comment-translator-current-task-roadmap-reconciliation-contract.mjs";
const x2bDecisionContractPath = "scripts/comment-translator-creator-nc-x2b-retention-capacity-decision-contract.mjs";
const r1ContractPath = "scripts/comment-translator-creator-nc-r1-paid-launch-readiness-contract.mjs";

const read = (relativePath) => readFileSync(path.join(root, relativePath), "utf8");
assert.ok(existsSync(path.join(root, migrationPath)), "NC-X2B-R1 RED: the unapplied thirty-day retention migration is missing");
const migration = read(migrationPath);
const h1Migration = read(historicalH1Path);
const x2aMigration = read(historicalX2APath);
const runtime = read(runtimePath);
const store = read(storePath);
const panel = read(panelPath);
const task = read(taskPath);
const board = read(boardPath);
const architecture = read(architecturePath);
const capacityDecision = read(capacityDecisionPath);
const roadmapContract = read(roadmapContractPath);
const x2bDecisionContract = read(x2bDecisionContractPath);
const r1Contract = read(r1ContractPath);

assert.match(migration, /reviewable local NC-X2B-R1 migration only/i, "migration is explicitly repository-local");
assert.match(migration, /unapplied|not applied/i, "migration records that it remains unapplied");
assert.doesNotMatch(migration, /supabase\s+(?:db\s+push|migration\s+up)|wrangler\s+(?:deploy|versions)|npm\s+run\s+(?:deploy|activate)|fetch\s*\(/i, "migration source has no apply, deploy, activation, or remote operation");

const functionNames = [...migration.matchAll(/create\s+or\s+replace\s+function\s+public\.([a-z0-9_]+)/gi)].map((match) => match[1]);
assert.deepEqual(
  functionNames,
  [
    "append_comment_translator_creator_safe_history",
    "read_comment_translator_creator_safe_history",
    "search_comment_translator_creator_safe_history"
  ],
  "the switch replaces exactly the three existing safe-history RPCs"
);
assert.doesNotMatch(migration, /create\s+table|alter\s+table|create\s+index|create\s+extension|add\s+column|drop\s+index|create\s+trigger/i, "the switch adds no schema object, extension, index, or trigger");

const expectedFunctionSources = {
  append_comment_translator_creator_safe_history: h1Migration,
  read_comment_translator_creator_safe_history: h1Migration,
  search_comment_translator_creator_safe_history: x2aMigration
};
const appendExpectedSource = extractFunctionSource(x2aMigration, "append_comment_translator_creator_safe_history");
const readExpectedSource = extractFunctionSource(h1Migration, "read_comment_translator_creator_safe_history");
const searchExpectedSource = extractFunctionSource(x2aMigration, "search_comment_translator_creator_safe_history");
Object.assign(expectedFunctionSources, {
  append_comment_translator_creator_safe_history: appendExpectedSource,
  read_comment_translator_creator_safe_history: readExpectedSource,
  search_comment_translator_creator_safe_history: searchExpectedSource
});

for (const name of functionNames) {
  const body = extractFunctionSource(migration, name);
  assert.equal(
    normalizeCutoff(body),
    normalizeCutoff(expectedFunctionSources[name]),
    `${name} preserves the existing signature, authorization, fields, cursor, cleanup, and RPC body apart from retention`
  );
  assert.match(body, /security\s+definer/i, `${name} remains security-definer`);
  assert.match(body, /set\s+search_path\s*=\s*''/i, `${name} keeps a fixed empty search_path`);
  assert.match(body, /clock_timestamp\s*\(\s*\)/i, `${name} uses the DB server clock`);
  assert.match(body, /v_cutoff\s+timestamptz\s*:=\s*v_now\s*-\s*interval\s+'30 days'/i, `${name} uses the inclusive thirty-day cutoff`);
  assert.match(
    body,
    name === "append_comment_translator_creator_safe_history"
      ? /source_published_at\s*<\s*v_cutoff/i
      : /source_published_at\s*>=\s*v_cutoff/i,
    `${name} keeps the inclusive lower cutoff`
  );
  assert.doesNotMatch(body, /interval\s+'7 days'/i, `${name} no longer uses the seven-day effective cutoff`);
}
assert.equal([...migration.matchAll(/interval\s+'30 days'/gi)].length, 3, "all three RPCs use exactly one thirty-day cutoff");
assert.doesNotMatch(migration, /interval\s+'7 days'|7[- ]day|seven[- ]day/i, "new migration contains no effective seven-day policy");

assert.match(migration, /auth\.role\(\)\s+is\s+distinct\s+from\s+'service_role'/i, "service-role-only authorization remains in the RPCs");
for (const field of [
  "source_attribution_label", "author_label", "author_display_name", "original_text", "translated_text",
  "translation_status", "moderation_label", "badge_label", "purchase_label"
]) assert.match(migration, new RegExp(`\\b${field}\\b`), `safe field remains present: ${field}`);
assert.match(migration, /limit\s+51/i, "search retains the 50+1 bound");
assert.doesNotMatch(migration, /total_count|['"]total['"]|count\s*\(\s*\*\s*\)\s+as\s+total/i, "search exposes no total count");
assert.match(migration, /owner_digest/i, "cursor remains owner-bound");
assert.match(migration, /query_digest/i, "cursor remains query-bound");
assert.match(migration, /not\s+exists\s*\([\s\S]{0,700}pagination_key[\s\S]{0,700}source_published_at/i, "stale cursor anchors still fail closed");
assert.match(migration, /delete\s+from\s+public\.comment_translator_creator_safe_history/i, "RPC cleanup behavior remains present");
assert.doesNotMatch(migration, /grant\s+execute\s+on\s+function[^;]+to\s+(?:public|anon|authenticated)/i, "the switch does not broaden RPC grants");

assert.match(runtime, /const\s+thirtyDaysMs\s*=\s*30\s*\*\s*24\s*\*\s*60\s*\*\s*60\s*\*\s*1000/i, "runtime local age guard is thirty days");
assert.match(runtime, /inclusive-thirty-days-server-clock-rpc/);
assert.match(runtime, /server-owned-safe-fields-only-thirty-day-bounded-50-plus-one/);
assert.doesNotMatch(runtime, /sevenDaysMs|inclusive-seven-days|seven-day-safe-history/i, "runtime has no stale seven-day effective metadata");
assert.match(store, /retention:\s*["']thirty-days-inclusive-server-clock-only["']/i, "store metadata is thirty days");
assert.doesNotMatch(store, /seven-day|seven-days/i, "store has no stale seven-day metadata");
for (const source of [runtime, store, panel]) {
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|console\.|ownerUserId\s*[:=].*input|sessionReferenceId\s*[:=].*input|liveChatId|rawProvider|providerPayload/i, "browser/runtime boundary does not gain authority or private-data paths");
}
for (const copy of [
  "Thirty-day safe history",
  "Search thirty-day safe history",
  "Only the existing thirty-day safe-history window is exported",
  "Thirty-day safe history unavailable",
  "Thirty-day safe history deleted"
]) assert.match(panel, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `UI copy states the thirty-day policy: ${copy}`);
assert.doesNotMatch(panel, /Seven-day|seven-day|7-day|7 days/i, "UI has no stale seven-day copy");

for (const [relativePath, expected] of [[historicalH1Path, h1Migration], [historicalX2APath, x2aMigration]]) {
  const committed = execFileSync("git", ["show", `HEAD:${relativePath}`], { cwd: root, encoding: "utf8", windowsHide: true });
  assert.equal(normalizeLineEndings(expected), normalizeLineEndings(committed), `historical migration bytes remain unchanged: ${relativePath}`);
}

for (const marker of [
  "current_goal=comment-translator-creator-nc-x2b-r1-thirty-day-retention-switch",
  "current_lane=NC-X2B-R1",
  "implementation_status=repository-implemented-not-applied",
  "search_retention=inclusive-thirty-days-server-clock-repository-implemented-not-applied",
  "effective_deployed_retention=inclusive-seven-days-server-clock-unconfirmed",
  "retention_switch=repository-implemented-not-applied",
  "migration_apply_status=not-run",
  "deploy_status=not-run",
  "production_activation=closed",
  "current_staged_rows_satisfied=0/8",
  "current_unresolved_hard_requirements=9",
  "activation_status=closed",
  "free_behavior=permanent",
  "nc_l1_status=not-started"
]) assert.match(task, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `task retains the reconciled authority marker: ${marker}`);
for (const source of [board, architecture, capacityDecision, roadmapContract, x2bDecisionContract, r1Contract]) {
  assert.match(source, /repository-implemented-not-applied/i, "focused authority sources classify the switch as repository-implemented-not-applied");
}
assert.match(capacityDecision, /decision=eligible-for-separate-switch-approval/);
assert.match(capacityDecision, /switch_status=repository-implemented-not-applied/);
assert.match(capacityDecision, /implementation_status=repository-implemented-not-applied/);
assert.match(capacityDecision, /migration_apply_authorization=none/);
assert.match(capacityDecision, /rollback_baseline=keep-seven-days/);
assert.match(capacityDecision, /evidence_classes=repository-local\|synthetic-design\|external-account\|deployed-live/);
assert.match(board, /NC-X2B-R1.*repository-implemented-not-applied/i);
assert.match(architecture, /NC-X2B-R1.*repository-implemented-not-applied/is);
assert.match(roadmapContract, /inclusive-thirty-days-server-clock-repository-implemented-not-applied/);
assert.match(x2bDecisionContract, /repository-implemented-not-applied/);
assert.match(r1Contract, /current_lane=NC-X2B-R1/);

process.stdout.write("comment translator Creator NC-X2B-R1 thirty-day retention switch contract passed (repository-implemented-not-applied; migration-not-run)\n");

function extractFunctionSource(source, name) {
  const start = source.indexOf(`create or replace function public.${name}`);
  assert.ok(start >= 0, `function source exists: ${name}`);
  const next = source.indexOf("\ncreate or replace function public.", start + 1);
  const revoke = source.search(/\r?\nrevoke all on function/i);
  const end = next >= 0 ? next : revoke >= 0 ? revoke : source.length;
  assert.ok(end > start, `function source is bounded: ${name}`);
  return source.slice(start, end).trim();
}

function normalizeCutoff(source) {
  return normalizeLineEndings(source).replace(/interval\s+'7 days'/gi, "interval '30 days'");
}

function normalizeLineEndings(source) {
  return source.replace(/\r\n/g, "\n");
}
