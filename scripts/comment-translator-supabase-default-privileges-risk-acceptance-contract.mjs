import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const HISTORICAL_PARENT = "4c06e4ecffd769c74632bcf00b74d2535b7ce5cc";
const HISTORICAL_COMMIT = "ad94b34ac4c5c3149b880fdbd8e0bdc5d99b055e";
const GIT_TIMEOUT_MS = 5000;
const MAX_GIT_CAPTURE_BYTES = 2 * 1024 * 1024;

const riskAcceptanceDocPath =
  "docs/active/COMMENT_TRANSLATOR_SUPABASE_DEFAULT_PRIVILEGES_RISK_ACCEPTANCE.md";
const supportPendingDocPath =
  "docs/active/COMMENT_TRANSLATOR_SUPABASE_DEFAULT_PRIVILEGES_SUPPORT_PENDING.md";
const taskBoardPath =
  "docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_REMAINING_TASK_BOARD.md";
const taskPath = "task.md";
const publicBoardContractPath =
  "scripts/comment-translator-public-launch-remaining-task-board-contract.mjs";
const riskAcceptanceContractPath =
  "scripts/comment-translator-supabase-default-privileges-risk-acceptance-contract.mjs";

const historicalChangedPaths = [
  taskBoardPath,
  riskAcceptanceDocPath,
  publicBoardContractPath,
  riskAcceptanceContractPath,
  taskPath
];

const historicalDiff = [
  `M\t${taskBoardPath}`,
  `A\t${riskAcceptanceDocPath}`,
  `M\t${publicBoardContractPath}`,
  `A\t${riskAcceptanceContractPath}`,
  `M\t${taskPath}`
].sort();

const expectedHistoricalBlobIds = new Map([
  [taskBoardPath, "50d64da80030b47b61a4dc105265e812ddca74ad"],
  [riskAcceptanceDocPath, "11f0e3220109532e9714764dde4a03729caff556"],
  [publicBoardContractPath, "b9cd841f382fcd80217572cb80936706eee70190"],
  [riskAcceptanceContractPath, "d5fcd5effc0b49744e66f61222f601190452ed9f"],
  [taskPath, "412f18c30b559fdeeed9426d3ea3d904f5ce7a24"],
  [supportPendingDocPath, "b848314c19f87a215068c582d9d5678e460712b8"]
]);

const sensitivePatterns = [
  /sb_(?:secret|publishable)_[A-Za-z0-9_-]{20,}/,
  /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/,
  /postgres(?:ql)?:\/\/[^\s'")]+/i,
  /Authorization\s*:\s*[^\s'")]+/i,
  /Bearer\s+[A-Za-z0-9_.-]{20,}/i,
  /service_role\s*[:=]\s*["'][^"']+["']/i,
  /owner(?:_id| id)\s*[:=]\s*["'][^"']+["']/i,
  /project(?:_id| id)\s*[:=]\s*["'][^"']+["']/i,
  /support(?:_ticket| ticket| id)\s*[:=]\s*["'][^"']+["']/i,
  /liveChatId\s*[:=]\s*["'][^"']+["']/i,
  /providerTargetMetadata\s*[:=]\s*["'][^"']+["']/i,
  /rawComment(?:Text|s)?\s*[:=]\s*["'][^"']+["']/i
];

const historicalRiskMarkers = [
  "`supabase_default_privileges_step` | `public-launch-next-flow-step-11`",
  "`support_contact_status` | `submitted`",
  "`support_response_status` | `pending`",
  "`release_owner_risk_acceptance_decision_status` | `present`",
  "`risk_acceptance_status` | `accepted`",
  "`risk_acceptance_scope` | `future-public-object-default-privileges-only`",
  "`current_table_rls_grant_status` | `pass`",
  "`remote_current_grant_drift_status` | `pass`",
  "`remote_default_privileges_posture_status` | `fail`",
  "`remote_default_privileges_status` | `fail-accepted-risk`",
  "`remote_unexpected_default_grant_count` | `48`",
  "`remote_default_privileges_apply_status` | `not-run`",
  "`remote_default_privileges_remediation_status` | `not-run`",
  "`remote_remediation_apply_status` | `not-run`",
  "`remote_mutation_status` | `not-run`",
  "`public_release_capable_status` | `no`",
  "`public_gate_flip_status` | `not-run`",
  "`main_promotion_status` | `not-run`",
  "New `public` database object work still requires explicit object-level grant, RLS, and default-privileges review",
  "If Supabase Support later replies with a supported remediation path, consume that response in a separate follow-up"
];

const historicalBoardMarkers = [
  "`remote_default_privileges_status` | `fail-accepted-risk`",
  "`remote_default_privileges_posture_status` | `fail`",
  "`risk_acceptance_status` | `accepted`",
  "`risk_acceptance_scope` | `future-public-object-default-privileges-only`",
  "`public_release_capable_status` | `no`",
  "Supabase default privileges risk acceptance: decision only.",
  "Supabase default privileges remediation/apply: not run."
];

const historicalTaskMarkers = [
  "codex/comment-translator-supabase-default-privileges-risk-acceptance",
  "support_response_status=pending",
  "remote_default_privileges_status=fail-accepted-risk",
  "remote_default_privileges_posture_status=fail",
  "risk_acceptance_status=accepted",
  "risk_acceptance_scope=future-public-object-default-privileges-only",
  "public_release_capable=no",
  "public_gate_flip_status=not-run",
  "main_promotion_status=not-run",
  "COMMENT_TRANSLATOR_SUPABASE_DEFAULT_PRIVILEGES_RISK_ACCEPTANCE.md"
];

const currentStatusRows = new Map([
  ["support_contact_status", "submitted"],
  ["support_response_status", "pending"],
  ["current_table_rls_grant_status", "pass"],
  ["remote_default_privileges_status", "fail-accepted-risk"],
  ["remote_default_privileges_posture_status", "fail"],
  ["risk_acceptance_status", "accepted"],
  ["risk_acceptance_scope", "future-public-object-default-privileges-only"],
  ["public_release_capable_status", "yes"],
  ["public_gate_flip_status", "complete-release-declaration-no-mutation"],
  ["main_promotion_status", "complete-pr-640-merged-main-contained"]
]);

function fail(message) {
  throw new Error(message);
}

function boundedGit(args, runner = spawnSync) {
  if (!Array.isArray(args) || args.some((arg) => typeof arg !== "string")) {
    fail("fixed git invocation rejected");
  }

  let result;
  try {
    result = runner("git", args, {
      cwd: root,
      encoding: "utf8",
      shell: false,
      timeout: GIT_TIMEOUT_MS,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch {
    fail("fixed git evidence unavailable");
  }

  if (
    !result ||
    result.error ||
    result.signal ||
    result.status === null ||
    typeof result.stdout !== "string" ||
    typeof result.stderr !== "string" ||
    Buffer.byteLength(result.stdout, "utf8") > MAX_GIT_CAPTURE_BYTES ||
    Buffer.byteLength(result.stderr, "utf8") > MAX_GIT_CAPTURE_BYTES
  ) {
    fail("fixed git evidence unavailable");
  }

  return result;
}

function successfulGitText(args, label, runner = boundedGit) {
  const result = runner(args);
  assert.equal(result.status, 0, `${label} completed`);
  assert.equal(result.stderr, "", `${label} has no diagnostics`);
  return result.stdout;
}

function readHistoricalBlob(commit, relativePath, runner = boundedGit) {
  const result = runner(["show", `${commit}:${relativePath}`]);
  assert.equal(result.status, 0, `historical artifact exists: ${relativePath}`);
  assert.equal(result.stderr, "", `historical artifact read is sanitized: ${relativePath}`);
  assert.ok(result.stdout.length > 0, `historical artifact is nonempty: ${relativePath}`);
  return result.stdout;
}

function assertFixedIdentity({ resolvedCommit, resolvedParents, ancestorStatus }) {
  assert.equal(resolvedCommit.trim(), HISTORICAL_COMMIT, "fixed introduction commit identity");
  assert.equal(resolvedParents.trim(), HISTORICAL_PARENT, "fixed introduction parent identity");
  assert.equal(ancestorStatus, 0, "fixed introduction commit is an ancestor of current HEAD");
}

function assertExactHistoricalDiff(lines) {
  const actual = [...lines].sort();
  assert.deepEqual(actual, historicalDiff, "introduction commit has exact five-file diff");
}

function readFixedHistory(runner = boundedGit) {
  const resolvedCommit = successfulGitText(
    ["rev-parse", "--verify", `${HISTORICAL_COMMIT}^{commit}`],
    "fixed introduction commit lookup",
    runner
  );
  const resolvedParents = successfulGitText(
    ["show", "-s", "--format=%P", HISTORICAL_COMMIT],
    "fixed introduction parent lookup",
    runner
  );
  const head = successfulGitText(
    ["rev-parse", "--verify", "HEAD"],
    "current HEAD lookup",
    runner
  ).trim();
  assert.match(head, /^[0-9a-f]{40}$/, "current HEAD is a commit identity");

  const ancestry = runner(["merge-base", "--is-ancestor", HISTORICAL_COMMIT, head]);
  if (ancestry.stderr !== "" || ancestry.status !== 0) {
    fail("fixed introduction ancestry unavailable");
  }
  assertFixedIdentity({
    resolvedCommit,
    resolvedParents,
    ancestorStatus: ancestry.status
  });

  const diffText = successfulGitText(
    ["diff", "--name-status", "--no-renames", HISTORICAL_PARENT, HISTORICAL_COMMIT, "--"],
    "fixed introduction diff lookup",
    runner
  );
  assertExactHistoricalDiff(
    diffText
      .split(/\r?\n/)
      .map((line) => line.replace(/\r$/, ""))
      .filter(Boolean)
  );

  const blobs = {};
  for (const relativePath of [...historicalChangedPaths, supportPendingDocPath]) {
    const blobId = successfulGitText(
      ["rev-parse", `${HISTORICAL_COMMIT}:${relativePath}`],
      `fixed blob identity lookup: ${relativePath}`,
      runner
    ).trim();
    assert.equal(
      blobId,
      expectedHistoricalBlobIds.get(relativePath),
      `fixed blob identity: ${relativePath}`
    );
    blobs[relativePath] = readHistoricalBlob(HISTORICAL_COMMIT, relativePath, runner);
  }

  return blobs;
}

function assertIncludesAll(source, markers, label) {
  for (const marker of markers) {
    assert.ok(source.includes(marker), `${label} records ${marker}`);
  }
}

function assertNoSensitiveValues(source, label) {
  for (const pattern of sensitivePatterns) {
    assert.doesNotMatch(source, pattern, `${label} has no sensitive match`);
  }
}

function assertHistoricalDocs(blobs) {
  const riskAcceptanceDoc = blobs[riskAcceptanceDocPath];
  const supportPendingDoc = blobs[supportPendingDocPath];
  const taskBoard = blobs[taskBoardPath];
  const task = blobs[taskPath];

  assertIncludesAll(riskAcceptanceDoc, historicalRiskMarkers, "historical risk acceptance");
  assertIncludesAll(taskBoard, historicalBoardMarkers, "historical task board");
  assertIncludesAll(task, historicalTaskMarkers, "historical task");
  assert.ok(
    supportPendingDoc.includes("`support_response_status` | `pending`"),
    "historical support-pending evidence remains pending"
  );
  assert.ok(
    supportPendingDoc.includes("`remote_mutation_status` | `not-run`"),
    "historical support-pending evidence remains remote-mutation-free"
  );

  const historicalDecisionSurface = [riskAcceptanceDoc, taskBoard].join("\n");
  assert.doesNotMatch(
    historicalDecisionSurface,
    /public_release_capable(?:_status)?[=|]\s*`?yes`?/i,
    "historical decision surface keeps release capability false"
  );
  assert.doesNotMatch(
    historicalDecisionSurface,
    /remote_mutation_status[=|]\s*`?(?:applied|completed)`?/i,
    "historical decision surface keeps remote mutation unrun"
  );
  assert.doesNotMatch(
    historicalDecisionSurface,
    /public_gate_flip_status[=|]\s*`?(?:applied|completed|done)`?/i,
    "historical decision surface keeps public gate unrun"
  );
  assert.doesNotMatch(
    historicalDecisionSurface,
    /deploy_upload_status[=|]\s*`?(?:applied|completed|done)`?/i,
    "historical decision surface keeps deploy unrun"
  );

  for (const [label, source] of [
    [riskAcceptanceDocPath, riskAcceptanceDoc],
    [supportPendingDocPath, supportPendingDoc],
    [taskBoardPath, taskBoard],
    [taskPath, task]
  ]) {
    assertNoSensitiveValues(source, label);
  }
}

function assertHistoricalChangedBlobs(blobs) {
  for (const relativePath of historicalChangedPaths) {
    assertNoSensitiveValues(blobs[relativePath], `historical changed blob ${relativePath}`);
  }

  const historicalRiskContract = blobs[riskAcceptanceContractPath];
  assertIncludesAll(
    historicalRiskContract,
    [
      ...historicalRiskMarkers,
      "public_release_capable(?:_status)?",
      "remote_mutation_status",
      "public_gate_flip_status",
      "deploy_upload_status",
      "sb_(?:secret|publishable)",
      "rawComment(?:Text|s)?"
    ],
    "historical risk contract source"
  );

  const historicalBoardContract = blobs[publicBoardContractPath];
  assertIncludesAll(
    historicalBoardContract,
    [
      "`public_release_capable_status` | `no`",
      "Supabase default privileges remediation/apply: not run.",
      "public_release_capable=no",
      "support_response_status=pending"
    ],
    "historical task-board contract source"
  );
}

function readCurrentDocs() {
  const docs = {};
  for (const relativePath of [
    riskAcceptanceDocPath,
    supportPendingDocPath,
    taskBoardPath,
    taskPath
  ]) {
    try {
      docs[relativePath] = fs.readFileSync(path.join(root, relativePath), "utf8");
    } catch {
      fail(`current document unavailable: ${relativePath}`);
    }
  }
  return docs;
}

function currentLaunchStateSection(taskBoard) {
  const headings = [...taskBoard.matchAll(/^## Current Launch State\s*$/gm)];
  assert.equal(headings.length, 1, "current launch state section is unique");
  const start = headings[0].index + headings[0][0].length;
  const remainder = taskBoard.slice(start);
  const nextHeading = remainder.search(/\r?\n##\s/);
  return remainder.slice(0, nextHeading < 0 ? remainder.length : nextHeading);
}

function statusRows(section) {
  const rows = new Map();
  for (const line of section.split(/\r?\n/)) {
    const match = line.match(/^\|\s*`?([^|`]+?)`?\s*\|\s*([^|]+?)\s*\|\s*$/);
    if (!match) continue;
    const key = match[1].trim();
    const value = match[2].trim().replaceAll("`", "");
    if (!currentStatusRows.has(key)) continue;
    const values = rows.get(key) ?? [];
    values.push(value);
    rows.set(key, values);
  }
  return rows;
}

function assertUniqueCurrentStatusRows(taskBoard) {
  const rows = statusRows(currentLaunchStateSection(taskBoard));
  for (const [key, expected] of currentStatusRows) {
    const values = rows.get(key) ?? [];
    assert.equal(values.length, 1, `current launch state row is unique: ${key}`);
    assert.equal(values[0], expected, `current launch state value: ${key}`);
  }
}

function assertCurrentDocs(docs) {
  const riskAcceptanceDoc = docs[riskAcceptanceDocPath];
  const supportPendingDoc = docs[supportPendingDocPath];
  const taskBoard = docs[taskBoardPath];
  const task = docs[taskPath];

  for (const marker of [
    "`supabase_default_privileges_step` | `public-launch-next-flow-step-11`",
    "`support_contact_status` | `submitted`",
    "`support_response_status` | `pending`",
    "`release_owner_risk_acceptance_decision_status` | `present`",
    "`risk_acceptance_status` | `accepted`",
    "`risk_acceptance_scope` | `future-public-object-default-privileges-only`",
    "`current_table_rls_grant_status` | `pass`",
    "`remote_current_grant_drift_status` | `pass`",
    "`remote_default_privileges_posture_status` | `fail`",
    "`remote_default_privileges_status` | `fail-accepted-risk`",
    "`remote_unexpected_default_grant_count` | `48`",
    "`remote_default_privileges_apply_status` | `not-run`",
    "`remote_default_privileges_remediation_status` | `not-run`",
    "`remote_remediation_apply_status` | `not-run`",
    "`remote_mutation_status` | `not-run`",
    "New `public` database object work still requires explicit object-level grant, RLS, and default-privileges review",
    "If Supabase Support later replies with a supported remediation path, consume that response in a separate follow-up"
  ]) {
    assert.ok(riskAcceptanceDoc.includes(marker), `current risk acceptance records ${marker}`);
  }

  for (const marker of [
    "`support_response_status` | `pending`",
    "`risk_acceptance_status` | `not-recorded`",
    "`public_release_capable_status` | `no`",
    "`remote_default_privileges_apply_status` | `not-run`",
    "`remote_default_privileges_remediation_status` | `not-run`",
    "`remote_remediation_apply_status` | `not-run`",
    "`remote_mutation_status` | `not-run`",
    "Do not create new `public` database objects while this blocker is unresolved unless the slice includes explicit object-level grant/RLS/default-privileges review."
  ]) {
    assert.ok(supportPendingDoc.includes(marker), `current support-pending records ${marker}`);
  }

  for (const marker of [
    "Supabase default privileges risk acceptance: decision only.",
    "Supabase default privileges remediation/apply: not run.",
    "new `public` database object work still requires explicit object-level grant/RLS/default-privileges review."
  ]) {
    assert.ok(taskBoard.includes(marker), `current task board records ${marker}`);
  }

  assertUniqueCurrentStatusRows(taskBoard);
  const defaultPrivilegeDocs = [riskAcceptanceDoc, supportPendingDoc, taskBoard];
  for (const source of defaultPrivilegeDocs) {
    assert.doesNotMatch(
      source,
      /`?remote_default_privileges_(?:apply|remediation)_status`?\s*(?:\|\s*|=\s*)`?(?:applied|completed|done|pass)`?/i,
      "default-privilege remediation remains unrun"
    );
    assert.doesNotMatch(
      source,
      /`?remote_remediation_apply_status`?\s*(?:\|\s*|=\s*)`?(?:applied|completed|done|pass)`?/i,
      "default-privilege remediation apply remains unrun"
    );
  }

  for (const [label, source] of [
    [riskAcceptanceDocPath, riskAcceptanceDoc],
    [supportPendingDocPath, supportPendingDoc],
    [taskBoardPath, taskBoard],
    [taskPath, task]
  ]) {
    assertNoSensitiveValues(source, label);
  }
}

function assertRejected(fn, label) {
  let rejected = false;
  try {
    fn();
  } catch {
    rejected = true;
  }
  assert.equal(rejected, true, `${label} is rejected`);
}

function mutate(source, search, replacement, label) {
  assert.ok(source.includes(search), `synthetic mutation anchor exists: ${label}`);
  return source.replace(search, replacement);
}

function runSyntheticRegressions(history, current) {
  assertRejected(
    () =>
      readFixedHistory(() => {
        fail("synthetic git failure");
      }),
    "git capture failure"
  );
  assertRejected(
    () =>
      readHistoricalBlob(HISTORICAL_COMMIT, riskAcceptanceDocPath, () => ({
        status: 1,
        stdout: "",
        stderr: ""
      })),
    "historical artifact read failure"
  );
  assertRejected(
    () =>
      assertFixedIdentity({
        resolvedCommit: "0000000000000000000000000000000000000000",
        resolvedParents: HISTORICAL_PARENT,
        ancestorStatus: 0
      }),
    "wrong historical commit identity"
  );
  assertRejected(
    () =>
      assertFixedIdentity({
        resolvedCommit: HISTORICAL_COMMIT,
        resolvedParents: "0000000000000000000000000000000000000000",
        ancestorStatus: 0
      }),
    "wrong historical parent identity"
  );
  assertRejected(
    () =>
      assertFixedIdentity({
        resolvedCommit: HISTORICAL_COMMIT,
        resolvedParents: HISTORICAL_PARENT,
        ancestorStatus: 1
      }),
    "non-ancestor historical commit"
  );
  assertRejected(
    () => assertExactHistoricalDiff(historicalDiff.slice(1)),
    "missing historical diff identity"
  );
  assertRejected(
    () => assertExactHistoricalDiff([...historicalDiff, "M\tunknown.txt"]),
    "unknown historical diff identity"
  );

  assertRejected(
    () =>
      assertHistoricalDocs({
        ...history,
        [riskAcceptanceDocPath]: mutate(
          history[riskAcceptanceDocPath],
          "`public_release_capable_status` | `no`",
          "`public_release_capable_status` | `yes`",
          "historical release state"
        )
      }),
    "historical release-state mutation"
  );
  assertRejected(
    () =>
      assertHistoricalDocs({
        ...history,
        [riskAcceptanceDocPath]: mutate(
          history[riskAcceptanceDocPath],
          "`remote_default_privileges_posture_status` | `fail`",
          "`remote_default_privileges_posture_status` | `pass`",
          "historical posture state"
        )
      }),
    "historical posture-state mutation"
  );
  assertRejected(
    () =>
      assertHistoricalDocs({
        ...history,
        [riskAcceptanceDocPath]: mutate(
          history[riskAcceptanceDocPath],
          "`risk_acceptance_scope` | `future-public-object-default-privileges-only`",
          "`risk_acceptance_scope` | `all-public-objects-and-current-grants`",
          "historical scope"
        )
      }),
    "historical acceptance-scope mutation"
  );
  assertRejected(
    () =>
      assertHistoricalChangedBlobs({
        ...history,
        [riskAcceptanceContractPath]: mutate(
          history[riskAcceptanceContractPath],
          "public_release_capable(?:_status)?",
          "historical_release_marker_removed",
          "historical contract marker"
        )
      }),
    "historical contract source mutation"
  );

  const currentRiskExpanded = mutate(
    current[riskAcceptanceDocPath],
    "`risk_acceptance_scope` | `future-public-object-default-privileges-only`",
    "`risk_acceptance_scope` | `all-public-objects-and-current-grants`",
    "current acceptance scope"
  );
  assertRejected(
    () => assertCurrentDocs({ ...current, [riskAcceptanceDocPath]: currentRiskExpanded }),
    "current acceptance expansion"
  );

  const currentBoardSection = currentLaunchStateSection(current[taskBoardPath]);
  const boardWithDuplicate = current[taskBoardPath].replace(
    currentBoardSection,
    `${currentBoardSection}\n| \`risk_acceptance_scope\` | \`all-public-objects-and-current-grants\` |`
  );
  assertRejected(
    () => assertCurrentDocs({ ...current, [taskBoardPath]: boardWithDuplicate }),
    "duplicate or contradictory current status row"
  );

  const completionKeys = [
    "remote_default_privileges_apply_status",
    "remote_default_privileges_remediation_status",
    "remote_remediation_apply_status"
  ];
  const completionValues = ["applied", "completed", "done", "pass"];
  for (const key of completionKeys) {
    for (const value of completionValues) {
      const markdownContradiction = `${current[riskAcceptanceDocPath]}\n| \`${key}\` | \`${value}\` |`;
      assertRejected(
        () => assertCurrentDocs({ ...current, [riskAcceptanceDocPath]: markdownContradiction }),
        `Markdown remediation-complete claim ${key}=${value}`
      );
      const plainContradiction = `${current[riskAcceptanceDocPath]}\n${key}=${value}`;
      assertRejected(
        () => assertCurrentDocs({ ...current, [riskAcceptanceDocPath]: plainContradiction }),
        `plain remediation-complete claim ${key}=${value}`
      );
    }
  }

  const secretMutation = `${current[taskPath]}\n${["Authorization", "Bearer"].join(": ")} abcdefghijklmnopqrstuvwxyz1234567890`;
  assertRejected(
    () => assertCurrentDocs({ ...current, [taskPath]: secretMutation }),
    "current secret mutation"
  );

  assertCurrentDocs(current);
}

const historicalBlobs = readFixedHistory();
assertHistoricalDocs(historicalBlobs);
assertHistoricalChangedBlobs(historicalBlobs);

const currentDocs = readCurrentDocs();
runSyntheticRegressions(historicalBlobs, currentDocs);

console.log(
  "comment translator Supabase default privileges risk acceptance contract passed (evidence=historical-source-only, historical=introduction-commit, current_release_capable=yes, default_privilege_remediation=not_run, hosted=UNVERIFIED, secret_scan=pass)"
);
