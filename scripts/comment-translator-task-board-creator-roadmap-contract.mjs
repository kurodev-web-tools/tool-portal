import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredPaths = {
  task: "task.md",
  creator: "docs/active/COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_TASK_BOARD.md",
  creatorFinalQa: "docs/active/COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_FINAL_QA_READINESS.md",
  creatorPaidLaunchReadiness:
    "docs/active/COMMENT_TRANSLATOR_CREATOR_PAID_LAUNCH_READINESS_PREFLIGHT.md",
  promptBoard: "docs/active/VIEWER_ENGAGEMENT_PROMPT_BOARD_MVP.md",
  archive: "docs/archive/TASK_LEGACY_CONTRACT_LEDGER_2026-07-22.md",
};

const creatorRows = [
  "| C1 | Durable paid entitlement store | merged / integration verified at `c4b7bc4cd03ad400c737ae662e1e94c4462e9995` |",
  "| C2 | Stripe live Checkout / Portal / webhook closed-beta gate | merged / integration verified at `4486c180f68369d6620b9f8f3df33518b7cadc38` |",
  "| C3 | Paid usage and monthly reset | merged / integration verified; migration applied and structural readiness pass |",
  "| C4 | AI natural translation provider route | merged / integration verified at `fa0d5582a296c2164bd3945c37cbec746315f357` |",
  "| C5 | OBS overlay token runtime | merged / integration verified; migration applied and structural readiness pass |",
  "| C6 | OBS overlay UI route | merged / integration verified; migration applied and structural readiness pass; authenticated feed QA pending / gated |",
  "| C7 | Moderator share token runtime | merged / integration verified at `0307b5542c8ac9957370533228ec02893bd48c27` |",
  "| C8 | Moderator share UI route | merged / integration verified at `1ec79ca222149626670ec6692c19356bc56bb2c6`; authenticated feed QA pending / gated |",
  "| C9 | Custom dictionary minimum | merged / integration verified at `6f9c2de4c1a14b91ae094987af46e0c46c99cfeb` |",
  "| C10 | Priority display polish | merged / integration verified at `c0ac7152687dc0c91470037ec164fda57d7f4259` |",
  "| C11 | Simple 7-day history | merged / integration verified at `d1ce9b0d063f65bac968c85f3242398be4b8317f` |",
  "| C12 | Creator closed beta final QA | local readiness complete; operational readiness blocked / approval-gated |",
];

const creatorPublicRows = [
  "| CP1 | Creator paid launch readiness | local readiness complete; external evidence blocked / approval-gated |",
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
  "- Current priority: P0 Creator public paid launch readiness.",
  "- C1-C12 are merged / integration verified through C12 PR #679 at `097f369a47564b7a44d211c212580f993eddc71b`; CP1 local readiness is complete while external/deployed/browser/release-owner evidence remains blocked / approval-gated.",
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
  "- C3 merge / integration verification is complete through PR #669 at `5fc3cca2730a58f35279098ec0b2f5c804ce0076`; `CP1-A-MIG-C3` apply and post-apply structural readiness are complete, while store write/read behavior remains approval-gated.",
  "- C2 merge / integration verification is complete through PR #670 at `4486c180f68369d6620b9f8f3df33518b7cadc38`; Stripe live action and activation remain separate approval-gated steps.",
  "- C4 merge / integration verification is complete through PR #671 at `fa0d5582a296c2164bd3945c37cbec746315f357`; provider live execution remains separately approval-gated.",
  "- C5 merge / integration verification is complete through PR #672 at `f3bdf0d7400b479f6934f37af402d7ec5187c7c8`; `CP1-A-MIG-C5` apply and post-apply structural readiness are complete, while store/token behavior remains separately approval-gated.",
  "- C6 merge / integration verification is complete through PR #673 at `05104fc2d4c6730be6aae772708a10cb2b39d2d6`; `CP1-A-MIG-C6` apply and post-apply structural readiness are complete, while store/redemption/authenticated-browser behavior remains separately approval-gated.",
  "- C9 merge / integration verification is complete through PR #676 at `6f9c2de4c1a14b91ae094987af46e0c46c99cfeb`; remote migration apply and production persistence remain separately approval-gated.",
  "- C11 merge / integration verification is complete through PR #678 at `d1ce9b0d063f65bac968c85f3242398be4b8317f`; remote migration apply, production persistence, and authenticated browser history verification remain separately approval-gated.",
  "- C12 merge / integration verification is complete through PR #679 at `097f369a47564b7a44d211c212580f993eddc71b`; C12 head `e93bfb77dc2017fd4a15e99e075f7e419c14a94d` is contained in integration.",
  "- CP1 local readiness is complete. Remote/deployed/billing/provider/token/cleanup/authenticated-browser operations each retain a separate approval unit; deploy, activation, CP2, promotion to `main`, and public paid launch remain out of scope / separately approval-gated.",
];

const creatorC1BoundaryLines = [
  "- C1 is merged / integration verified at `c4b7bc4cd03ad400c737ae662e1e94c4462e9995`; remote migration apply remains approval-gated.",
  "- C3 is merged / integration verified through PR #669 at `5fc3cca2730a58f35279098ec0b2f5c804ce0076`; `CP1-A-MIG-C3` apply and structural readiness are complete, while store write/read behavior remains approval-gated.",
  "- C2 merge / integration verification is complete through PR #670 at `4486c180f68369d6620b9f8f3df33518b7cadc38`; live Stripe action and activation remain approval-gated.",
  "- C4 is merged / integration verified through PR #671 at `fa0d5582a296c2164bd3945c37cbec746315f357`; provider live execution remains approval-gated.",
  "- C5 merge / integration verification is complete through PR #672 at `f3bdf0d7400b479f6934f37af402d7ec5187c7c8`; `CP1-A-MIG-C5` apply and structural readiness are complete, while store/token behavior remains approval-gated.",
  "- C6 merge / integration verification is complete through PR #673 at `05104fc2d4c6730be6aae772708a10cb2b39d2d6`; `CP1-A-MIG-C6` apply and structural readiness are complete, while store/redemption/authenticated-browser behavior remains approval-gated.",
  "- C9 merge / integration verification is complete through PR #676 at `6f9c2de4c1a14b91ae094987af46e0c46c99cfeb`; remote migration apply and production persistence remain approval-gated.",
  "- C11 merge / integration verification is complete through PR #678 at `d1ce9b0d063f65bac968c85f3242398be4b8317f`; remote migration apply, production persistence, and authenticated browser history verification remain approval-gated.",
  "- C12 is merged / integration verified through PR #679 at `097f369a47564b7a44d211c212580f993eddc71b`; C12 head `e93bfb77dc2017fd4a15e99e075f7e419c14a94d` is contained in integration.",
  "- CP1 local readiness is complete. Its 72 independent approval units remain consumed, ready-not-approved, or not-run as recorded by the active authority; deploy, activation, CP2, promotion to `main`, and public paid launch remain out of CP1.",
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
  const creatorFinalQa = readRequired(requiredPaths.creatorFinalQa);
  const creatorPaidLaunchReadiness = readRequired(requiredPaths.creatorPaidLaunchReadiness);
  const promptBoard = readRequired(requiredPaths.promptBoard);
  const archive = readRequired(requiredPaths.archive);

  assertRoadmapRows(task);
  assertRoadmapRows(creator);
  assertLinesExactOnce(task, taskPriorityLines);
  assertLinesExactOnce(task, sharedBoundaryLines);
  assertLinesExactOnce(creator, sharedBoundaryLines);
  assertLinesExactOnce(task, taskC1BoundaryLines);
  assertLinesExactOnce(creator, creatorC1BoundaryLines);
  assert.match(creator, /^## C10 Acceptance Boundary$/m);
  assert.match(creator, /comment translator creator C10 priority display contract passed/);
  assert.match(creator, /Super Chat -> Super Sticker -> owner -> moderator -> member -> standard/);
  assert.match(creator, /^## C11 Acceptance Boundary$/m);
  assert.match(creator, /comment translator creator C11 history contract passed/);
  assert.match(creator, /exact rolling seven-day boundary/i);
  assert.match(creator, /^## C12 Acceptance Boundary$/m);
  assert.match(creator, /comment translator creator C12 final QA readiness contract passed/);
  assert.match(creator, /^## CP1 Acceptance Boundary$/m);
  assert.match(creator, /comment translator creator CP1 paid launch readiness contract passed/);
  assert.match(creatorFinalQa, /^c12_local_readiness_status=complete$/m);
  assert.match(
    creatorFinalQa,
    /^creator_closed_beta_operational_readiness_status=blocked-approval-gated$/m
  );
  assert.match(creatorPaidLaunchReadiness, /^cp1_local_readiness_status=complete$/m);
  assert.match(
    creatorPaidLaunchReadiness,
    /^creator_public_paid_launch_readiness_status=blocked-approval-gated$/m
  );
  assert.match(creatorPaidLaunchReadiness, /72 independent approval units/);
  assert.match(
    creatorPaidLaunchReadiness,
    /^cp1_c1_local_driver_pipeline_preflight_execution_status=pass$/m
  );
  assert.match(
    creatorPaidLaunchReadiness,
    /^cp1_c1_runner_fixture_identity_design_retry_3_approval_status=consumed$/m
  );
  assert.match(
    creatorPaidLaunchReadiness,
    /^cp1_c1_local_driver_artifact_read_command_diagnosis_approval_status=consumed$/m
  );
  assert.match(
    creatorPaidLaunchReadiness,
    /^cp1_c1_local_driver_command_construction_synthetic_design_approval_status=consumed$/m
  );
  assert.match(
    creatorPaidLaunchReadiness,
    /^cp1_c1_local_driver_command_construction_synthetic_execution_preflight_approval_status=consumed$/m
  );
  assert.match(
    creatorPaidLaunchReadiness,
    /^cp1_c1_runner_fixture_identity_design_retry_4_approval_status=consumed$/m
  );
  assert.match(
    creatorPaidLaunchReadiness,
    /^cp1_c1_explicit_artifact_path_binding_design_approval_status=consumed$/m
  );
  assert.match(
    creatorPaidLaunchReadiness,
    /^cp1_c1_runner_fixture_identity_design_retry_5_approval_status=consumed$/m
  );
  assert.match(
    creatorPaidLaunchReadiness,
    /^cp1_c1_repository_local_artifact_path_resolution_approval_status=consumed$/m
  );
  assert.match(
    creatorPaidLaunchReadiness,
    /^cp1_c1_artifact_path_filename_predicate_diagnosis_approval_status=consumed$/m
  );
  assert.match(
    creatorPaidLaunchReadiness,
    /^cp1_c1_goal_bound_hash_first_fixture_identity_approval_status=consumed$/m
  );
  assert.match(
    creatorPaidLaunchReadiness,
    /^cp1_c1_goal_bound_hash_first_fixture_identity_retry_1_approval_status=consumed$/m
  );
  assert.match(
    creatorPaidLaunchReadiness,
    /^cp1_c1_goal_bound_hash_first_fixture_identity_retry_2_approval_status=consumed$/m
  );
  assert.match(
    creatorPaidLaunchReadiness,
    /^cp1_c1_goal_bound_hash_first_fixture_identity_retry_3_approval_status=consumed$/m
  );
  assert.match(
    creatorPaidLaunchReadiness,
    /^cp1_c1_goal_bound_hash_first_fixture_identity_retry_4_approval_status=consumed$/m
  );
  assert.match(
    creatorPaidLaunchReadiness,
    /^cp1_c1_goal_bound_hash_first_fixture_identity_retry_4_execution_status=aborted-canonical-byte-source-no-match$/m
  );
  assert.match(
    creatorPaidLaunchReadiness,
    /^cp1_c1_goal_bound_historical_blob_fixture_identity_retry_5_approval_status=consumed$/m
  );
  assert.match(
    creatorPaidLaunchReadiness,
    /^cp1_c1_goal_bound_historical_blob_fixture_identity_retry_5_execution_status=aborted-historical-byte-source-no-match$/m
  );
  assert.match(
    creatorPaidLaunchReadiness,
    /^cp1_c1_goal_bound_original_untracked_fixture_identity_retry_6_approval_status=consumed$/m
  );
  assert.match(
    creatorPaidLaunchReadiness,
    /^cp1_c1_goal_bound_original_untracked_fixture_identity_retry_6_execution_status=aborted-fixture-expectation-identity-ambiguity$/m
  );
  assert.match(
    creatorPaidLaunchReadiness,
    /^cp1_c1_goal_bound_structure_reducer_fixture_identity_retry_7_approval_status=consumed$/m
  );
  assert.match(
    creatorPaidLaunchReadiness,
    /^cp1_c1_goal_bound_structure_reducer_fixture_identity_retry_7_execution_status=aborted-fixture-expectation-identity-ambiguity$/m
  );
  assert.match(
    creatorPaidLaunchReadiness,
    /^cp1_c1_goal_bound_assert_match_argument_reducer_fixture_identity_retry_8_approval_status=consumed$/m
  );
  assert.match(
    creatorPaidLaunchReadiness,
    /^cp1_c1_goal_bound_assert_match_argument_reducer_fixture_identity_retry_8_execution_status=aborted-assert-match-binding-ambiguity$/m
  );
  assert.match(
    creatorPaidLaunchReadiness,
    /^cp1_c1_goal_bound_ordered_regex_window_fixture_identity_retry_9_approval_status=consumed$/m
  );
  assert.match(
    creatorPaidLaunchReadiness,
    /^cp1_c1_goal_bound_ordered_regex_window_fixture_identity_retry_9_execution_status=aborted-synthetic-reducer-failure$/m
  );
  assert.match(
    creatorPaidLaunchReadiness,
    /^cp1_c1_goal_bound_ordered_regex_window_fixture_identity_retry_10_approval_status=consumed$/m
  );
  assert.match(
    creatorPaidLaunchReadiness,
    /^cp1_c1_goal_bound_ordered_regex_window_fixture_identity_retry_10_execution_status=aborted-ordered-regex-window-ambiguity$/m
  );
  assert.match(
    creatorPaidLaunchReadiness,
    /^cp1_c1_goal_bound_hash_min_static_invariant_fixture_identity_approval_status=consumed$/m
  );
  assert.match(
    creatorPaidLaunchReadiness,
    /^cp1_c1_goal_bound_hash_min_static_invariant_fixture_identity_execution_status=pass$/m
  );
  assert.match(
    creatorPaidLaunchReadiness,
    /^cp1_c1_merged_artifact_local_verification_approval_status=consumed$/m
  );
  assert.match(
    creatorPaidLaunchReadiness,
    /^cp1_c1_merged_artifact_local_verification_execution_status=pass$/m
  );
  assert.match(
    creatorPaidLaunchReadiness,
    /^cp1_c1_post_merge_authority_base=b4409937b4ef637f3218c6d24e45a32ef20920ce$/m
  );
  assert.match(creatorPaidLaunchReadiness, /runner_full_contract_status=pass/);
  assert.match(
    creatorPaidLaunchReadiness,
    /adapter_read_execution_consumer_status=implemented-local-synthetic-only/
  );
  assert.match(creatorPaidLaunchReadiness, /green_fixture_pass_count=4/);
  assert.match(
    creatorPaidLaunchReadiness,
    /^cp1_c1_ephemeral_entitlement_bridge_local_verification_status=pass$/m
  );
  assert.match(creatorPaidLaunchReadiness, /green_fixture_pass_count=10/);
  assert.match(
    creatorPaidLaunchReadiness,
    /production_wiring_status=blocked-nonzeroizable-immutable-string-copy/
  );
  assert.match(creatorPaidLaunchReadiness, /external_evidence_status=unchanged-blocked-approval-gated/);
  for (const source of [creator, task, creatorPaidLaunchReadiness]) {
    assert.match(
      source,
      /PR #689 is merged at `2888bb1a60fdd6851688e3e7b323a40b3c21869c`/,
    );
    assert.match(
      source,
      /^(?:- )?production_constructor_compatibility_status=blocked-immutable-lifetime-unprovable$/m,
    );
    assert.match(
      source,
      /^(?:- )?production_wiring_status=disconnected-fail-closed$/m,
    );
    assert.match(
      source,
      /^(?:- )?sdk_internal_lifetime_status=dependency-blocked-unverified$/m,
    );
    assert.match(
      source,
      /^(?:- )?required_design_decision=approve-process-isolation-ownership-model-or-zeroizable-client-boundary$/m,
    );
  }
  assert.match(creator, /72 independent approval units/);
  assert.match(task, /72 independent approval units/);

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
