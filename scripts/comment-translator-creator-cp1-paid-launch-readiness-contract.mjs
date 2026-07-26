import assert from "node:assert/strict";
import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const readinessPath =
  "docs/active/COMMENT_TRANSLATOR_CREATOR_PAID_LAUNCH_READINESS_PREFLIGHT.md";
const boardPath =
  "docs/active/COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_TASK_BOARD.md";
const taskPath = "task.md";
const integrationBase = "097f369a47564b7a44d211c212580f993eddc71b";
const referencePresenceEndpointBase =
  "19eaa0fe0d52c4563ae1957d994c679d0b4bd0dc";
const c12Head = "e93bfb77dc2017fd4a15e99e075f7e419c14a94d";

const expectedLanes = new Map([
  ["LOCAL-DETERMINISTIC", "locally-verified"],
  ["REFERENCE-PRESENCE", "approval-gated"],
  ["REMOTE-DEPLOYED", "approval-gated"],
  ["AUTHENTICATED-BROWSER", "approval-gated"],
  ["RELEASE-OWNER", "approval-gated"],
]);

const expectedStages = new Map([
  ["CP1-S0", "locally-verified"],
  ["CP1-S1", "approval-gated"],
  ["CP1-S2", "approval-gated"],
  ["CP1-S3", "approval-gated"],
  ["CP1-S4", "approval-gated"],
  ["CP1-S5", "approval-gated"],
  ["CP1-S6", "approval-gated"],
  ["CP1-S7", "approval-gated"],
  ["CP1-S8", "approval-gated"],
  ["CP1-S9", "approval-gated"],
  ["CP1-S10", "approval-gated"],
]);

const requiredApprovalUnits = [
  "CP1-A-MIG-C1",
  "CP1-A-MIG-C3",
  "CP1-A-MIG-C5",
  "CP1-A-MIG-C6",
  "CP1-A-MIG-C7",
  "CP1-A-MIG-C8",
  "CP1-A-MIG-C9",
  "CP1-A-MIG-C11",
  "CP1-A-STORE-READINESS",
  "CP1-A-STORE-WRITE-READ",
  "CP1-A-STRIPE-PRODUCT-PRICE",
  "CP1-A-STRIPE-CHECKOUT",
  "CP1-A-STRIPE-PORTAL",
  "CP1-A-STRIPE-WEBHOOK",
  "CP1-A-ENTITLEMENT-STATES",
  "CP1-A-USAGE-RESET-LIMIT",
  "CP1-A-PROVIDER-OPENAI",
  "CP1-A-PROVIDER-AZURE",
  "CP1-A-DICTIONARY-PROVIDER",
  "CP1-A-OBS-CAPABILITY",
  "CP1-A-MODERATOR-CAPABILITY",
  "CP1-A-HISTORY-RETENTION",
  "CP1-A-OAUTH-CLEANUP",
  "CP1-A-ACCOUNT-CLEANUP",
  "CP1-A-BROWSER-QA",
  "CP1-A-DEPLOY",
  "CP1-A-CP2",
  "CP1-A-PROMOTE-MAIN",
  "CP1-A-PUBLIC-PAID-LAUNCH",
];

const requiredBrowserSurfaces = [
  "CREATOR-SURFACE",
  "OBS-OVERLAY",
  "MODERATOR-VIEW",
  "DICTIONARY",
  "HISTORY",
  "PRIORITY-DELETED-SOURCE",
];

const requiredStatusLabels = [
  "cp1_local_readiness_status=complete",
  "creator_public_paid_launch_readiness_status=blocked-approval-gated",
  `cp1_integration_base=${integrationBase}`,
  "cp1_c12_containment_status=verified",
  "cp1_new_public_api_status=preview-readiness-route-source-approved",
  `cp1_reference_presence_endpoint_base=${referencePresenceEndpointBase}`,
  "cp1_reference_presence_endpoint_status=source-only-not-deployed",
  "cp1_cloudflare_change_status=not-run",
  "cp1_remote_mutation_status=not-run-approval-gated",
  "cp1_stripe_action_status=not-run-approval-gated",
  "cp1_provider_live_status=not-run-approval-gated",
  "cp1_authenticated_browser_qa_status=not-run-approval-gated",
  "cp1_width_qa_status=planned-not-run-approval-gated",
  "cp1_dependency_install_status=not-run-not-approved",
  "cp1_runtime_ui_change_status=not-required",
  "cp1_cp2_status=not-run-approval-gated",
  "cp1_public_paid_launch_status=not-run-approval-gated",
];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function parseStatusTable(source, idPattern) {
  const rows = new Map();
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(
      new RegExp(
        `^\\|\\s*(${idPattern})\\s*\\|[^|]+\\|\\s*(locally-verified|approval-gated)\\s*\\|`,
      ),
    );
    if (match) {
      assert.ok(!rows.has(match[1]), `row id is unique: ${match[1]}`);
      rows.set(match[1], match[2]);
    }
  }
  return rows;
}

function assertNoSensitiveValues(source, label) {
  assert.doesNotMatch(
    source,
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|\bAuthorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+|ownerUserId\s*[:=]\s*["'][^"']+|providerTargetMetadata\s*[:=]\s*["'][^"']+/i,
    `${label} contains no sensitive value`,
  );
}

function changedFiles() {
  const tracked = execSync("git diff --name-only", {
    cwd: root,
    encoding: "utf8",
  });
  const untracked = execSync("git ls-files --others --exclude-standard", {
    cwd: root,
    encoding: "utf8",
  });
  return [...new Set(`${tracked}\n${untracked}`.split(/\r?\n/).filter(Boolean))]
    .map((file) => file.replace(/\\/g, "/"));
}

assert.ok(fs.existsSync(path.join(root, readinessPath)));
const readiness = read(readinessPath);
const board = read(boardPath);
const task = read(taskPath);

execFileSync("git", ["merge-base", "--is-ancestor", integrationBase, "HEAD"], {
  cwd: root,
  stdio: "ignore",
});
execFileSync("git", ["merge-base", "--is-ancestor", c12Head, "HEAD"], {
  cwd: root,
  stdio: "ignore",
});

for (const statusLabel of requiredStatusLabels) {
  assert.match(
    readiness,
    new RegExp(`^${statusLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"),
  );
}

assert.deepEqual(
  parseStatusTable(readiness, "LOCAL-DETERMINISTIC|REFERENCE-PRESENCE|REMOTE-DEPLOYED|AUTHENTICATED-BROWSER|RELEASE-OWNER"),
  expectedLanes,
);
assert.deepEqual(parseStatusTable(readiness, "CP1-S(?:10|[0-9])"), expectedStages);

for (const approvalUnit of requiredApprovalUnits) {
  assert.match(readiness, new RegExp(`^\\|\\s*${approvalUnit}\\s*\\|`, "m"));
}
for (const surface of requiredBrowserSurfaces) {
  assert.match(readiness, new RegExp(`^\\|\\s*${surface}\\s*\\|`, "m"));
}

assert.match(readiness, /390 \/ 820 \/ 1024 \/ 1280 \/ 1366px/);
assert.match(readiness, /18 pass \/ 9 dependency-blocked \/ 3 known historical \/ 0 unexpected/);
assert.match(readiness, /abort_status/);
assert.match(readiness, /rollback_status/);
assert.match(readiness, /unchecked_scope_status/);
assert.match(readiness, /CP2/);

assert.match(board, new RegExp(`C12[\\s\\S]*${integrationBase}`));
assert.match(board, /^## CP1 Acceptance Boundary$/m);
assert.match(
  board,
  /\| CP1 \| Creator paid launch readiness \| local readiness complete; external evidence blocked \/ approval-gated \|/,
);
assert.match(task, new RegExp(`C12[\\s\\S]*${integrationBase}`));
assert.match(
  task,
  /\| CP1 \| Creator paid launch readiness \| local readiness complete; external evidence blocked \/ approval-gated \|/,
);

for (const [label, source] of [
  [readinessPath, readiness],
  [boardPath, board],
  [taskPath, task],
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([
  readinessPath,
  boardPath,
  taskPath,
  "app/api/comment-translator/creator-paid/readiness/route.ts",
  "lib/comment-translator-creator-paid-readiness.ts",
  "scripts/comment-translator-creator-cp1-paid-launch-readiness-contract.mjs",
  "scripts/comment-translator-creator-cp1-reference-presence-route-contract.mjs",
  "scripts/comment-translator-creator-c12-final-qa-readiness-contract.mjs",
  "scripts/comment-translator-task-board-creator-roadmap-contract.mjs",
]);
for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `CP1 change stays in docs/contract scope: ${file}`);
}

console.log("comment translator creator CP1 paid launch readiness contract passed");
