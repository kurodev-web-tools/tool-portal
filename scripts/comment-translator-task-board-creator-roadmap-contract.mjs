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

function assertExactOnce(source, value) {
  assert.equal(source.split(value).length - 1, 1);
}

function assertRoadmapRows(source) {
  for (const row of [...creatorRows, ...creatorPublicRows, ...publicAfterP1Rows]) {
    assertExactOnce(source, row);
    const id = row.split("|")[1].trim();
    const idRowPattern = new RegExp(`^\\|\\s*${escapeRegExp(id)}\\s*\\|`, "gm");
    assert.equal(source.match(idRowPattern)?.length ?? 0, 1);
  }
}

function assertPaidFallback(source) {
  const boundary = source
    .split(/\r?\n\s*\r?\n/)
    .find((section) => /Paid entitlement/i.test(section) && /(?:Free|paid-inactive)/i.test(section));
  assert.ok(boundary);
  for (const state of ["incomplete", "missing", "unreadable", "inactive"]) {
    assert.match(boundary, new RegExp(state, "i"));
  }
}

function assertCleanupExclusions(source) {
  const sections = source.split(/\r?\n\s*\r?\n/);
  assert.ok(sections.some((section) =>
    /C1/.test(section)
    && /C3/.test(section)
    && /(?:implementation|実装)/i.test(section)
    && /(?:out of scope|対象外)/i.test(section)));
  assert.ok(sections.some((section) =>
    /Stripe/i.test(section)
    && /Supabase/i.test(section)
    && /(?:provider|プロバイダ)/i.test(section)
    && /(?:mutation|変更|実行)/i.test(section)
    && /(?:out of scope|対象外)/i.test(section)));
  assert.ok(sections.some((section) =>
    /manual deploy/i.test(section)
    && /(?:out of scope|対象外)/i.test(section)));
}

function run() {
  const task = readRequired(requiredPaths.task);
  const creator = readRequired(requiredPaths.creator);
  const promptBoard = readRequired(requiredPaths.promptBoard);
  const archive = readRequired(requiredPaths.archive);

  assertRoadmapRows(task);
  assertRoadmapRows(creator);

  assert.match(task, /P0[^\n]{0,160}Creator closed beta/i);
  assert.match(task, /(?:first implementation sequence|first sequence|最初の実装順|初回実装順)[^\n]{0,160}C1[^\n]{0,160}C3/i);
  assert.match(task, /P1[^\n]{0,160}(?:Prompt Board|配信カンペボード)[^\n]{0,240}docs\/active\/VIEWER_ENGAGEMENT_PROMPT_BOARD_MVP\.md/i);

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
