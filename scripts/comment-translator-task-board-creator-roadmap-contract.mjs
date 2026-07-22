import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredPaths = {
  task: "task.md",
  creator: "docs/active/COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_TASK_BOARD.md",
  promptBoard: "docs/active/VIEWER_ENGAGEMENT_PROMPT_BOARD_MVP.md",
  archive: "docs/archive/TASK_LEGACY_CONTRACT_LEDGER_2026-07-22.md",
};

const creatorRows = [
  "| C1 | Durable paid entitlement store | pending |",
  "| C2 | Stripe live Checkout / Portal / webhook closed-beta gate | pending / gated |",
  "| C3 | Paid usage and monthly reset | pending |",
  "| C4 | AI natural translation provider route | pending / gated |",
  "| C5 | OBS overlay token runtime | pending |",
  "| C6 | OBS overlay UI route | pending |",
  "| C7 | Moderator share token runtime | pending |",
  "| C8 | Moderator share UI route | pending |",
  "| C9 | Custom dictionary minimum | pending |",
  "| C10 | Priority display polish | pending |",
  "| C11 | Simple 7-day history | pending |",
  "| C12 | Creator closed beta final QA | pending |",
];

const creatorPublicRows = [
  "| CP1 | Creator paid launch readiness | pending |",
  "| CP2 | Creator public paid gate flip | pending / gated |",
];

const publicAfterP1Rows = [
  "| P1-1 | `streamList` primary migration | later |",
  "| P1-2 | 30-day history and search | later |",
  "| P1-3 | CSV export | later |",
  "| P1-4 | Overlay templates | later |",
  "| P1-5 | Dictionary import and suggestions | later |",
  "| P1-6 | AI operations helpers | later |",
  "| P1-7 | Provider comparisons | later |",
  "| P1-8 | Platform expansion | later |",
  "| P1-9 | Voice translation / subtitle work | later |",
];

function readRequired(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizedLines(source) {
  return source.split(/\r?\n/).map((line) => line.trim());
}

function assertRoadmapRows(source) {
  const lines = normalizedLines(source);
  for (const row of [...creatorRows, ...creatorPublicRows, ...publicAfterP1Rows]) {
    assert.equal(lines.filter((line) => line === row).length, 1);
    const id = row.split("|")[1].trim();
    const idRowPattern = new RegExp(`^\\|\\s*${escapeRegExp(id)}\\s*\\|`);
    assert.equal(lines.filter((line) => idRowPattern.test(line)).length, 1);
  }
}

function assertPaidFallback(source) {
  const boundaryPattern = /Paid entitlement[^.\n]*incomplete[^.\n]*missing[^.\n]*unreadable[^.\n]*inactive[^.\n]*(?:degrades?(?: safely)? to|falls? back to|->|→)[^.\n]*(?:Free[^.\n]*paid-inactive|paid-inactive[^.\n]*Free)/i;
  const boundaryLine = normalizedLines(source).find((line) => boundaryPattern.test(line));
  assert.ok(boundaryLine);
  assert.doesNotMatch(boundaryLine, /\b(?:does not|must not|never)\b/i);
}

function assertCleanupExclusions(source) {
  const lines = normalizedLines(source);
  const excluded = /(?:out of scope|対象外)/i;
  const explicitlyExcluded = (targetPattern) => lines.some((line) =>
    targetPattern.test(line)
    && excluded.test(line)
    && !/(?:\bin scope\b|対象内)/i.test(line));

  assert.ok(explicitlyExcluded(/(?:C1\s*\/\s*C3|C1\s+(?:and|then|と)\s+C3)\s*(?:implementation|実装)/i));
  assert.ok(explicitlyExcluded(/Stripe\s+mutation/i));
  assert.ok(explicitlyExcluded(/Supabase\s+mutation/i));
  assert.ok(explicitlyExcluded(/(?:provider\s+mutation|プロバイダ\s*(?:mutation|変更))/i));
  assert.ok(explicitlyExcluded(/manual deploy/i));
}

function assertCurrentPriorities(source) {
  const lines = normalizedLines(source);
  const p0Line = lines.find((line) => /(?:^[-*]\s*)?(?:\|\s*)?P0\s*(?:\||:|-)\s*(?:Comment Translator\s+)?Creator closed beta\b/i.test(line));
  assert.ok(p0Line);
  assert.doesNotMatch(p0Line, /\b(?:not|later|deferred|historical|former)\b|対象外|未選択/i);

  assert.ok(lines.some((line) =>
    /(?:first implementation sequence|first sequence|最初の実装順|初回実装順)/i.test(line)
    && /C1[^\n]*(?:then|->|→|次に)[^\n]*C3/i.test(line)
    && !/\b(?:not|never)\b/i.test(line)));

  const p1Line = lines.find((line) =>
    /\bP1\b/.test(line)
    && /post-MVP/i.test(line)
    && /(?:Prompt Board|配信カンペボード)/i.test(line)
    && /docs\/active\/VIEWER_ENGAGEMENT_PROMPT_BOARD_MVP\.md/i.test(line));
  assert.ok(p1Line);
  assert.doesNotMatch(p1Line, /\b(?:not|removed|historical)\b|対象外|削除/i);
}

function run() {
  const task = readRequired(requiredPaths.task);
  const creator = readRequired(requiredPaths.creator);
  const promptBoard = readRequired(requiredPaths.promptBoard);
  const archive = readRequired(requiredPaths.archive);

  assertRoadmapRows(task);
  assertRoadmapRows(creator);

  assertCurrentPriorities(task);

  assert.match(promptBoard, /MVP対象外/);
  assert.match(promptBoard, /Implementation Task Order/);
  assert.match(promptBoard, /Schedule Calendar/);
  assert.match(promptBoard, /browser-only/i);
  assert.match(promptBoard, /(?:ログイン不要|no-login)/i);

  assert.match(archive, /(?:historical|履歴)/i);
  assert.match(archive, /(?:non-authoritative|非authoritative|非 authority)/i);
  for (const heading of [
    "Current Free Public Beta State",
    "Public Launch Next Flow",
    "Pre-Step 5 Hardening Board",
    "Latest Sanitized Evidence Summary",
  ]) {
    assert.match(archive, new RegExp(`^#+\\s+${escapeRegExp(heading)}\\s*$`, "m"));
  }

  for (const source of [task, creator]) {
    assertPaidFallback(source);
    assertCleanupExclusions(source);
  }
}

try {
  run();
  console.log("comment_translator_task_board_creator_roadmap_contract=pass");
} catch {
  console.error("comment_translator_task_board_creator_roadmap_contract=fail");
  process.exitCode = 1;
}
