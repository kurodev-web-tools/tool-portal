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

const taskPriorityLines = [
  "- Current priority: P0 Creator closed beta.",
  "- First implementation sequence: C1 -> C3.",
  "- P1 Prompt Board is MVP-complete and remains post-MVP work: `docs/active/VIEWER_ENGAGEMENT_PROMPT_BOARD_MVP.md`.",
];

const sharedBoundaryLines = [
  "- Paid entitlement fallback: missing / unreadable / incomplete / inactive -> Free / paid-inactive.",
  "- Out of scope: C1/C3 implementation.",
  "- Out of scope: Stripe mutation.",
  "- Out of scope: Supabase mutation.",
  "- Out of scope: provider mutation.",
  "- Out of scope: manual deploy.",
];

const cleanupOnlyC1C3Qualification =
  "- Cleanup-only clarification: this exclusion applies only to this task-board cleanup PR. After merge, start C1 in a separate task; start C3 only after C1 is merged and verified.";

const historicalPromptBoardCheckpointMarker =
  "> Historical pre-promotion checkpoint; superseded by PR #660/#663; no next_approval/publication_boundary below is current instruction.";

const archiveStatusLine = "> Status: Historical archive; non-authoritative.";

function readRequired(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizedLines(source) {
  return source.split(/\r?\n/).map((line) => line.trim());
}

function assertLinesExactOnce(source, requiredLines) {
  const lines = normalizedLines(source);
  for (const requiredLine of requiredLines) {
    assert.equal(lines.filter((line) => line === requiredLine).length, 1);
  }
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

function run() {
  const task = readRequired(requiredPaths.task);
  const creator = readRequired(requiredPaths.creator);
  const promptBoard = readRequired(requiredPaths.promptBoard);
  const archive = readRequired(requiredPaths.archive);

  assertRoadmapRows(task);
  assertRoadmapRows(creator);
  assertLinesExactOnce(task, taskPriorityLines);
  assertLinesExactOnce(task, sharedBoundaryLines);
  assertLinesExactOnce(creator, sharedBoundaryLines);

  const taskLines = normalizedLines(task);
  assert.equal(taskLines.filter((line) => line === cleanupOnlyC1C3Qualification).length, 1);
  assert.ok(
    taskLines.indexOf(cleanupOnlyC1C3Qualification) < taskLines.indexOf("- Out of scope: C1/C3 implementation.")
  );

  assert.match(promptBoard, /MVP対象外/);
  assert.match(promptBoard, /Implementation Task Order/);
  assert.match(promptBoard, /Schedule Calendar/);
  assert.match(promptBoard, /browser-only/i);
  assert.match(promptBoard, /(?:ログイン不要|no-login)/i);
  assert.match(promptBoard, /`main_promotion_status` \| `pr-660-merged-main`/);
  assert.match(promptBoard, /`delete_dialog_follow_up_status` \| `pr-663-merged-main`/);
  assert.equal(
    normalizedLines(promptBoard).filter((line) => line === historicalPromptBoardCheckpointMarker).length,
    2
  );
  for (const heading of ["Promotion Readiness Checkpoint", "MVP Public Entry Checkpoint"]) {
    assert.match(
      promptBoard,
      new RegExp(`^### ${escapeRegExp(heading)}\\r?\\n\\r?\\n${escapeRegExp(historicalPromptBoardCheckpointMarker)}$`, "m")
    );
  }

  assert.equal(normalizedLines(archive).slice(0, 10).filter((line) => line === archiveStatusLine).length, 1);
  for (const heading of [
    "Current Free Public Beta State",
    "Public Launch Next Flow",
    "Pre-Step 5 Hardening Board",
    "Latest Sanitized Evidence Summary",
  ]) {
    assert.match(archive, new RegExp(`^#+\\s+${escapeRegExp(heading)}\\s*$`, "m"));
  }
}

try {
  run();
  console.log("comment_translator_task_board_creator_roadmap_contract=pass");
} catch {
  console.error("comment_translator_task_board_creator_roadmap_contract=fail");
  process.exitCode = 1;
}
