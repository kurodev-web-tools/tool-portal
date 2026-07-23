import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const readinessPath = "docs/active/COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_FINAL_QA_READINESS.md";
const boardPath = "docs/active/COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_TASK_BOARD.md";
const gapAuditPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md";
const taskPath = "task.md";

const requiredEvidencePaths = [
  "scripts/comment-translator-creator-c1-paid-entitlement-store-contract.mjs",
  "scripts/comment-translator-creator-c2-stripe-closed-beta-gate-contract.mjs",
  "scripts/comment-translator-creator-c3-paid-usage-counter-contract.mjs",
  "scripts/comment-translator-creator-c4-paid-provider-authority-contract.mjs",
  "scripts/comment-translator-creator-c4-paid-provider-route-contract.mjs",
  "scripts/comment-translator-creator-c5-obs-overlay-token-runtime-contract.mjs",
  "scripts/comment-translator-creator-c5-obs-overlay-token-store-contract.mjs",
  "scripts/comment-translator-creator-c6-obs-overlay-route-contract.mjs",
  "scripts/comment-translator-creator-c7-moderator-share-token-runtime-contract.mjs",
  "scripts/comment-translator-creator-c7-moderator-share-token-store-contract.mjs",
  "scripts/comment-translator-creator-c8-moderator-share-route-contract.mjs",
  "scripts/comment-translator-creator-c8-moderator-share-http-transport-contract.mjs",
  "scripts/comment-translator-creator-c9-custom-dictionary-runtime-contract.mjs",
  "scripts/comment-translator-creator-c9-custom-dictionary-store-contract.mjs",
  "scripts/comment-translator-creator-c9-provider-integration-contract.mjs",
  "scripts/comment-translator-creator-c10-priority-display-contract.mjs",
  "scripts/comment-translator-creator-c11-history-contract.mjs",
  "scripts/comment-translator-creator-c11-history-ui-contract.mjs",
  "app/api/comment-translator/billing/webhook/route.ts",
  "app/api/comment-translator/obs-overlay/session/route.ts",
  "app/api/comment-translator/moderator-share/session/route.ts",
  "app/tools/comment-translator/history-actions.ts",
  "lib/comment-translator-creator-paid-provider-route.ts",
  "lib/comment-translator-custom-dictionary-runtime.ts",
  "lib/comment-translator-creator-history.ts",
];

const expectedGateClassifications = new Map([
  ["BILLING-LOCAL", "locally verified"],
  ["BILLING-LIVE", "approval-gated"],
  ["ENTITLEMENT-ACTIVE", "locally verified"],
  ["ENTITLEMENT-INACTIVE", "locally verified"],
  ["ENTITLEMENT-FAIL-CLOSED", "locally verified"],
  ["USAGE-RESET-LOCAL", "locally verified"],
  ["USAGE-LIVE", "approval-gated"],
  ["PROVIDER-ROUTE-LOCAL", "locally verified"],
  ["PROVIDER-LIVE", "approval-gated"],
  ["OBS-TOKEN-LOCAL", "locally verified"],
  ["OBS-DISPLAY-LOCAL", "locally verified"],
  ["OBS-AUTHENTICATED", "approval-gated"],
  ["MODERATOR-TOKEN-LOCAL", "locally verified"],
  ["MODERATOR-DISPLAY-LOCAL", "locally verified"],
  ["MODERATOR-AUTHENTICATED", "approval-gated"],
  ["DICTIONARY-LOCAL", "locally verified"],
  ["DICTIONARY-LIVE", "approval-gated"],
  ["PRIORITY-PROJECTION", "locally verified"],
  ["HISTORY-LOCAL", "locally verified"],
  ["HISTORY-REMOTE", "approval-gated"],
  ["BROWSER-SAFE", "locally verified"],
  ["TOOLCHAIN", "dependency-blocked"],
  ["WIDTH-QA", "dependency-blocked"],
  ["HISTORICAL-ASSERTIONS", "known historical limitation"],
]);

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function changedFiles() {
  const tracked = execSync("git diff --name-only", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  const untracked = execSync("git ls-files --others --exclude-standard", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return [...new Set(`${tracked}\n${untracked}`.split(/\r?\n/).filter(Boolean))]
    .map((file) => file.replace(/\\/g, "/"));
}

function parseGateClassifications(source) {
  const rows = new Map();
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\|\s*([A-Z][A-Z0-9-]+)\s*\|[^|]+\|\s*(locally verified|approval-gated|dependency-blocked|known historical limitation|missing)\s*\|/);
    if (match) {
      assert.ok(!rows.has(match[1]), `gate id is unique: ${match[1]}`);
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

for (const requiredPath of [readinessPath, boardPath, gapAuditPath, taskPath, ...requiredEvidencePaths]) {
  assert.ok(exists(requiredPath), `required C12 evidence exists: ${requiredPath}`);
}

const readiness = read(readinessPath);
const board = read(boardPath);
const gapAudit = read(gapAuditPath);
const task = read(taskPath);
const actualGateClassifications = parseGateClassifications(readiness);

assert.deepEqual(actualGateClassifications, expectedGateClassifications);

for (const statusLabel of [
  "c12_local_readiness_status=complete",
  "creator_closed_beta_operational_readiness_status=blocked-approval-gated",
  "c12_new_public_api_status=not-added",
  "c12_cloudflare_change_status=not-run",
  "c12_remote_mutation_status=not-run-approval-gated",
  "c12_live_smoke_status=not-run-approval-gated",
  "c12_width_qa_status=dependency-blocked",
  "c12_dependency_install_status=not-run-not-approved",
  "c12_known_historical_count=3",
  "c12_unexpected_failure_count=0",
  "c12_missing_gate_count=0",
  "c12_next_handoff=cp1-readiness-preflight",
]) {
  assert.match(readiness, new RegExp(`^${statusLabel}$`, "m"), `readiness records ${statusLabel}`);
}

assert.match(readiness, /390 \/ 820 \/ 1024 \/ 1280 \/ 1366px/);
assert.match(readiness, /18 pass \/ 9 dependency-blocked \/ 3 known historical \/ 0 unexpected/);
assert.match(readiness, /d1ce9b0d063f65bac968c85f3242398be4b8317f/);
assert.match(readiness, /4bf598f7fca3f21175de7b3aeda0d001121b376b/);

for (const source of [board, gapAudit, task]) {
  assert.match(source, /C11[\s\S]*d1ce9b0d063f65bac968c85f3242398be4b8317f/i);
  assert.match(source, /C12[\s\S]*local readiness complete/i);
}

assert.match(board, /^## C12 Acceptance Boundary$/m);
assert.match(gapAudit, /\| C12 \|[\s\S]*local readiness complete/i);
assert.match(task, /\| C12 \| Creator closed beta final QA \| local readiness complete/i);

for (const [label, source] of [
  [readinessPath, readiness],
  [boardPath, board],
  [gapAuditPath, gapAudit],
  [taskPath, task],
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([
  readinessPath,
  boardPath,
  gapAuditPath,
  taskPath,
  "scripts/comment-translator-creator-c12-final-qa-readiness-contract.mjs",
  "docs/active/COMMENT_TRANSLATOR_CREATOR_PAID_LAUNCH_READINESS_PREFLIGHT.md",
  "scripts/comment-translator-creator-cp1-paid-launch-readiness-contract.mjs",
  "scripts/comment-translator-task-board-creator-roadmap-contract.mjs",
]);
for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `C12 change stays in docs/contract scope: ${file}`);
}

console.log("comment translator creator C12 final QA readiness contract passed");
