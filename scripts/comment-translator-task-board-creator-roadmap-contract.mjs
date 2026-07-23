import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
  "| C1 | Durable paid entitlement store | merged / integration verified at `c4b7bc4cd03ad400c737ae662e1e94c4462e9995` |",
  "| C2 | Stripe live Checkout / Portal / webhook closed-beta gate | merged / integration verified at `4486c180f68369d6620b9f8f3df33518b7cadc38` |",
  "| C3 | Paid usage and monthly reset | merged / integration verified at `5fc3cca2730a58f35279098ec0b2f5c804ce0076` |",
  "| C4 | AI natural translation provider route | merged / integration verified at `fa0d5582a296c2164bd3945c37cbec746315f357` |",
  "| C5 | OBS overlay token runtime | merged / integration verified at `f3bdf0d7400b479f6934f37af402d7ec5187c7c8` |",
  "| C6 | OBS overlay UI route | merged / integration verified at `05104fc2d4c6730be6aae772708a10cb2b39d2d6`; authenticated feed QA pending / gated |",
  "| C7 | Moderator share token runtime | merged / integration verified at `0307b5542c8ac9957370533228ec02893bd48c27` |",
  "| C8 | Moderator share UI route | merged / integration verified at `1ec79ca222149626670ec6692c19356bc56bb2c6`; authenticated feed QA pending / gated |",
  "| C9 | Custom dictionary minimum | local implementation / focused verification complete; draft PR review / merge approval pending |",
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
  "- C1-C8 are merged / integration verified; C9 custom dictionary minimum is locally implemented and focused verification is complete, while draft PR review / merge remain approval-gated.",
  "- P1 Prompt Board is MVP-complete and remains post-MVP work: `docs/active/VIEWER_ENGAGEMENT_PROMPT_BOARD_MVP.md`.",
];

const sharedBoundaryLines = [
  "- Paid entitlement fallback: missing / unreadable / incomplete / inactive -> Free / paid-inactive.",
  "- Out of scope: Stripe mutation.",
  "- Out of scope: Supabase mutation.",
  "- Out of scope: provider mutation.",
  "- Out of scope: manual deploy.",
];

const taskC1BoundaryLines = [
  "- C1 merge / integration verification is complete at `c4b7bc4cd03ad400c737ae662e1e94c4462e9995`; remote migration apply and production data access remain approval-gated and were not run.",
  "- C3 merge / integration verification is complete through PR #669 at `5fc3cca2730a58f35279098ec0b2f5c804ce0076`; remote migration apply remains approval-gated.",
  "- C2 merge / integration verification is complete through PR #670 at `4486c180f68369d6620b9f8f3df33518b7cadc38`; Stripe live action and activation remain separate approval-gated steps.",
  "- C4 merge / integration verification is complete through PR #671 at `fa0d5582a296c2164bd3945c37cbec746315f357`; provider live execution remains separately approval-gated.",
  "- C5 merge / integration verification is complete through PR #672 at `f3bdf0d7400b479f6934f37af402d7ec5187c7c8`; remote migration apply remains separately approval-gated.",
];

const creatorC1BoundaryLines = [
  "- C1 is merged / integration verified at `c4b7bc4cd03ad400c737ae662e1e94c4462e9995`; remote migration apply remains approval-gated.",
  "- C3 is merged / integration verified through PR #669 at `5fc3cca2730a58f35279098ec0b2f5c804ce0076`; remote migration apply remains approval-gated.",
  "- C2 merge / integration verification is complete through PR #670 at `4486c180f68369d6620b9f8f3df33518b7cadc38`; live Stripe action and activation remain approval-gated.",
  "- C4 is merged / integration verified through PR #671 at `fa0d5582a296c2164bd3945c37cbec746315f357`; provider live execution remains approval-gated.",
  "- C5 merge / integration verification is complete through PR #672 at `f3bdf0d7400b479f6934f37af402d7ec5187c7c8`; remote migration apply remains approval-gated.",
];

const historicalPromptBoardCheckpointMarker =
  "> Historical pre-promotion checkpoint; superseded by PR #660/#663; no next_approval/publication_boundary below is current instruction.";

const archiveStatusLine = "> Status: Historical archive; non-authoritative.";
const expectedPromptBoardFutureSectionSha256 = "29a80be1b52c90ece46ef6e0cc8091f1cdd9aa3eb2d930fc8eab73a221d35c18";

function readRequired(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizedLines(source) {
  return source.split(/\r?\n/).map((line) => line.trim());
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizedPromptBoardFutureSection(source) {
  const normalized = source.replace(/\r\n/g, "\n");
  const heading = "## MVP対象外";
  assert.equal(normalized.split(heading).length - 1, 1);
  const headingIndex = normalized.indexOf(heading);
  return normalized.slice(headingIndex).replace(/\n*$/, "\n");
}

function assertPromptBoardFutureSectionPreserved(source) {
  const section = normalizedPromptBoardFutureSection(source);
  assert.equal(sha256(section), expectedPromptBoardFutureSectionSha256);
  const redSimulation = section.replace("Schedule Calendar", "Schedule Calendar altered");
  assert.notEqual(sha256(redSimulation), expectedPromptBoardFutureSectionSha256);
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
  assertLinesExactOnce(task, taskC1BoundaryLines);
  assertLinesExactOnce(creator, creatorC1BoundaryLines);

  assert.match(promptBoard, /MVP対象外/);
  assert.match(promptBoard, /Implementation Task Order/);
  assert.match(promptBoard, /Schedule Calendar/);
  assert.match(promptBoard, /browser-only/i);
  assert.match(promptBoard, /(?:ログイン不要|no-login)/i);
  assertPromptBoardFutureSectionPreserved(promptBoard);
  assert.match(promptBoard, /`main_promotion_status` \| `pr-660-merged-main`/);
  assert.match(promptBoard, /`delete_dialog_follow_up_status` \| `pr-663-merged-main`/);
  assert.equal(
    normalizedLines(promptBoard).filter((line) => line === historicalPromptBoardCheckpointMarker).length,
    3
  );
  for (const heading of [
    "MVP QA Implementation Checkpoint",
    "Promotion Readiness Checkpoint",
    "MVP Public Entry Checkpoint",
  ]) {
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
