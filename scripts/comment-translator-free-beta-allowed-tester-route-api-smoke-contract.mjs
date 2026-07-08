import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const evidenceDocPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_ALLOWED_TESTER_ROUTE_API_SMOKE_EVIDENCE.md";
const readyPreflightDocPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_ALLOWED_TESTER_ROUTE_API_SMOKE_READY_PREFLIGHT.md";
const publicUsabilityPreflightDocPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PUBLIC_USABILITY_PREFLIGHT.md";
const remoteDurableEvidenceDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_REMOTE_DURABLE_ENFORCEMENT_EVIDENCE.md";
const remoteDurablePreflightDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_REMOTE_DURABLE_ENFORCEMENT_READY_PREFLIGHT.md";
const finalQaDocPath = "docs/active/COMMENT_TRANSLATOR_FREE_PUBLIC_BETA_FINAL_QA_READINESS.md";
const gapAuditPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md";
const taskPath = "task.md";

const runtimePaths = [
  "app/api/comment-translator/session/route.ts",
  "app/tools/comment-translator/actions.ts",
  "lib/comment-translator-session-runtime.ts",
  "lib/comment-translator-usage-ledger-runtime.ts",
  "lib/comment-translator-public-entitlement-baseline.ts",
  "lib/comment-translator-durable-session-store.ts",
  "lib/comment-translator-durable-usage-counter-store.ts",
  "lib/comment-translator-real-comments-ui-wiring.ts",
  "lib/comment-translator-free-beta-retention-attribution.ts",
  "lib/comment-translator-free-beta-creator-locked-waitlist.ts"
];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function escaped(fragment) {
  return fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function changedFiles() {
  const committedDiff = execSync("git diff --name-only origin/codex/comment-translator-free-public-beta-integration...HEAD", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  })
    .split(/\r?\n/)
    .filter(Boolean);
  const uncommittedDiff = execSync("git diff --name-only", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  })
    .split(/\r?\n/)
    .filter(Boolean);
  const untracked = execSync("git ls-files --others --exclude-standard", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  })
    .split(/\r?\n/)
    .filter(Boolean);

  return [...new Set([...committedDiff, ...uncommittedDiff, ...untracked])].map((file) => file.replace(/\\/g, "/"));
}

function assertNoSensitiveValues(source, label) {
  assert.doesNotMatch(
    source,
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|\bAuthorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+|SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+|ownerUserId\s*[:=]\s*["'](?!(?:user-\d+|owner-\d+)["'])[^"']+|providerTargetMetadata\s*[:=]\s*["'](?!forbidden["'])[^"']+|rawComment(?:Text|s|Retention)?\s*[:=]\s*["'](?!(?:never-recorded-by-design|never-returned-by-design|not-recorded-by-design|not-returned-by-design|disabled-by-default)["'])[^"']+/i,
    `${label} does not contain secret values, token values, authorization values, private provider identifiers, live target values, or raw comments`
  );
}

for (const requiredPath of [
  evidenceDocPath,
  readyPreflightDocPath,
  publicUsabilityPreflightDocPath,
  remoteDurableEvidenceDocPath,
  remoteDurablePreflightDocPath,
  finalQaDocPath,
  gapAuditPath,
  taskPath,
  ...runtimePaths
]) {
  assert.ok(exists(requiredPath), `FB-L3 required reference exists: ${requiredPath}`);
}

const evidenceDoc = read(evidenceDocPath);
const readyPreflightDoc = read(readyPreflightDocPath);
const publicUsabilityPreflightDoc = read(publicUsabilityPreflightDocPath);
const remoteDurableEvidenceDoc = read(remoteDurableEvidenceDocPath);
const remoteDurablePreflightDoc = read(remoteDurablePreflightDocPath);
const finalQaDoc = read(finalQaDocPath);
const gapAudit = read(gapAuditPath);
const task = read(taskPath);
const runtimeSources = runtimePaths.map((runtimePath) => [runtimePath, read(runtimePath)]);

for (const requiredSection of [
  "## Purpose",
  "## Execution Decision",
  "## Inspected Inputs",
  "## Route And Action Boundary",
  "## Local Contract Boundary",
  "## What This Evidence Proves",
  "## What This Evidence Does Not Prove",
  "## Sanitized Evidence Record",
  "## Next Safe Action",
  "## Unchecked Scope And Residual Risk",
  "## Completion Verification"
]) {
  assert.match(evidenceDoc, new RegExp(`^${escaped(requiredSection)}$`, "m"), `FB-L3 evidence doc includes ${requiredSection}`);
}

for (const requiredSection of [
  "## Purpose",
  "## Execution Decision",
  "## Preconditions",
  "## Exact Command Sequence",
  "## Sanitized Output Review",
  "## Abort Rules",
  "## Approval Text",
  "## Rollback Boundary",
  "## What Approval Would Prove",
  "## What Approval Would Not Prove",
  "## Completion Verification"
]) {
  assert.match(
    readyPreflightDoc,
    new RegExp(`^${escaped(requiredSection)}$`, "m"),
    `FB-L3 ready preflight doc includes ${requiredSection}`
  );
}

for (const requiredFragment of [
  "Status: FB-L3 Allowed-tester route/API smoke",
  "Public-release capable: no",
  "blocked-no-approval",
  "authenticated allowed-tester route/API smoke",
  "server-owned session/feed/usage/deletion/Creator locked states",
  "same-thread ready preflight",
  "sanitized output review",
  "exact explicit approval",
  "/api/comment-translator/session",
  "getCommentTranslatorSessionStatusAction",
  "getCommentTranslatorRealCommentsFeedAction",
  "requestCommentTranslatorDataDeletionAction",
  "getCommentTranslatorCreatorLockedWaitlistAction",
  "recordCommentTranslatorCreatorLockedClickAction",
  "durable-store-unavailable",
  "private-launch-gated",
  "live-provider-polling-not-approved",
  "not-run / approval-gated",
  "30 minutes per user per day",
  "30 minutes per session",
  "1 active session per user",
  "30 translated messages per minute",
  "20,000 provider-input characters per month",
  "Paid entitlement C1/C3",
  "Stripe billing",
  "Creator paid limits",
  "counts/status/stop reasons only",
  "no browser storage expansion",
  "no handoff payload expansion"
]) {
  assert.match(evidenceDoc, new RegExp(escaped(requiredFragment), "i"), `FB-L3 evidence doc includes ${requiredFragment}`);
}

for (const requiredFragment of [
  "Status: FB-L3 allowed-tester route/API smoke ready preflight",
  "Public-release capable: no",
  "preflight-ready",
  "not-run in this thread",
  "node scripts/comment-translator-free-beta-allowed-tester-route-api-smoke-contract.mjs",
  "COMMENT_TRANSLATOR_DEPLOYED_ORIGIN",
  "COMMENT_TRANSLATOR_ALLOWED_TESTER_COOKIE",
  "POST /api/comment-translator/session",
  "\"intent\":\"status\"",
  "server action route/API harness",
  "getCommentTranslatorSessionStatusAction",
  "getCommentTranslatorRealCommentsFeedAction",
  "requestCommentTranslatorDataDeletionAction",
  "getCommentTranslatorCreatorLockedWaitlistAction",
  "recordCommentTranslatorCreatorLockedClickAction",
  "approved-fb-l3-allowed-tester-route-api-smoke",
  "counts/status/stop reasons only",
  "no remote Supabase migration apply",
  "no provider target lookup",
  "no liveChatMessages.list",
  "no Azure/OpenAI provider execution",
  "no deploy/upload",
  "no Stripe"
]) {
  assert.match(
    readyPreflightDoc,
    new RegExp(escaped(requiredFragment), "i"),
    `FB-L3 ready preflight doc includes ${requiredFragment}`
  );
}

for (const forbiddenFragment of [
  "npx supabase db push --linked",
  "wrangler deploy",
  "wrangler versions upload",
  "--execute --approved-live-chat-target-lookup",
  "--execute --approved-live-chat-polling-smoke",
  "approved-fb-l2-remote-durable-enforcement-apply-and-smoke"
]) {
  assert.doesNotMatch(
    readyPreflightDoc,
    new RegExp(escaped(forbiddenFragment), "i"),
    `FB-L3 ready preflight excludes out-of-scope command: ${forbiddenFragment}`
  );
}

assert.match(publicUsabilityPreflightDoc, /authenticated allowed-tester route\/API smoke/i, "FB-L1 preflight keeps FB-L3 route/API lane");
assert.match(remoteDurableEvidenceDoc, /authenticated allowed-tester route\/API smoke[\s\S]*not-run \/ approval-gated/i, "FB-L2 evidence leaves FB-L3 unchecked");
assert.match(remoteDurablePreflightDoc, /authenticated route\/API smoke/i, "FB-L2 ready preflight records route/API smoke as outside its proof");
assert.match(finalQaDoc, /FB-L3|Allowed-tester route\/API smoke/i, "F15 readiness doc points to FB-L3 route/API smoke");
assert.match(gapAudit, /FB-L3|Allowed-tester route\/API smoke/i, "gap audit records FB-L3 follow-up");

assert.match(
  task,
  /Current branch: `codex\/(?:comment-translator-free-beta-fb-l3-allowed-tester-route-api-smoke|comment-translator-creator-waitlist-admin-ui|comment-translator-admin-dashboard-shortcut|portal-sidebar-navigation-resilience)`/i,
  "task.md records a route/API-smoke-compatible branch"
);
assert.match(
  task,
  /PL-G2 Allowed-tester route\/API smoke \| complete|approved sanitized route\/API harness smoke/i,
  "task.md records completed route/API smoke history"
);
assert.match(
  task,
  /approved-fb-l3-allowed-tester-route-api-smoke|PL-G2K approved sanitized route\/API harness smoke/i,
  "task.md records approved route/API smoke boundary"
);
assert.match(
  task,
  /authenticated allowed-tester state was unavailable locally|authenticated allowed-tester[\s\S]*deterministic-contract covered|route\/API harness smoke complete/i,
  "task.md records authenticated route/API browser scope"
);
assert.match(
  task,
  /Browser\/width verification[\s\S]*390 \/ 820 \/ 1024 \/ 1280 \/ 1366px/i,
  "task.md records current width verification"
);
assert.match(task, /public-release capable: no/i, "task.md keeps public release blocked");

const routeSource = read("app/api/comment-translator/session/route.ts");
assert.match(routeSource, /readCommentTranslatorPrivateLaunchAccess[\s\S]*blocked[\s\S]*status:\s*403/, "route gates non-allowed testers before smoke evidence");
assert.match(routeSource, /readCommentTranslatorDurableActiveSessionOrFailClosed[\s\S]*readCommentTranslatorDurableUsageSnapshotOrFailClosed/, "route reads durable session and usage before browser state");
assert.match(routeSource, /createTrustedCommentTranslatorYouTubeLiveProviderRuntimeAdapter/, "route uses trusted live provider runtime");
assert.doesNotMatch(routeSource, /reason:\s*"provider-target-lookup-not-approved"/, "route no longer fixes target lookup to not-approved");
assert.doesNotMatch(routeSource, /reason:\s*"live-provider-polling-not-approved"/, "route no longer fixes polling to not-approved");

const actionsSource = read("app/tools/comment-translator/actions.ts");
for (const actionFragment of [
  "getCommentTranslatorSessionStatusAction",
  "getCommentTranslatorRealCommentsFeedAction",
  "requestCommentTranslatorDataDeletionAction",
  "getCommentTranslatorCreatorWaitlistAction",
  "registerCommentTranslatorCreatorWaitlistAction"
]) {
  assert.match(actionsSource, new RegExp(escaped(actionFragment)), `actions expose FB-L3 server-owned state surface: ${actionFragment}`);
}
assert.match(actionsSource, /readCommentTranslatorPrivateLaunchAccess[\s\S]*private-launch-gated/, "actions keep private launch gate in route/API smoke");
assert.match(actionsSource, /readCommentTranslatorDurableActiveSessionOrFailClosed[\s\S]*readCommentTranslatorDurableUsageSnapshotOrFailClosed/, "actions use durable session and usage readiness");
assert.match(actionsSource, /createTrustedCommentTranslatorYouTubeLiveProviderRuntimeAdapter/, "actions use trusted live provider runtime");
assert.match(actionsSource, /polling-runtime-not-wired/, "feed action keeps sanitized polling fallback");

for (const [label, source] of [
  [evidenceDocPath, evidenceDoc],
  [readyPreflightDocPath, readyPreflightDoc],
  [publicUsabilityPreflightDocPath, publicUsabilityPreflightDoc],
  [remoteDurableEvidenceDocPath, remoteDurableEvidenceDoc],
  [remoteDurablePreflightDocPath, remoteDurablePreflightDoc],
  [finalQaDocPath, finalQaDoc],
  [gapAuditPath, gapAudit],
  [taskPath, task],
  ...runtimeSources
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([
  "app/admin/page.tsx",
  "app/admin/comment-translator/page.tsx",
  "app/admin/comment-translator/creator-waitlist/page.tsx",
  "app/api/comment-translator/free-beta/route-api-harness/route.ts",
  "app/tools/comment-translator/actions.ts",
  "components/comment-translator/CommentTranslatorDock.tsx",
  "components/comment-translator/CommentTranslatorPrivateLaunchUnavailable.tsx",
  "components/portal/PortalHeader.tsx",
  "components/portal/PortalShell.tsx",
  "components/portal/PortalSidebar.tsx",
  evidenceDocPath,
  "lib/comment-translator-admin-access-gate.ts",
  "lib/comment-translator-admin-shortcut-shared.ts",
  "lib/comment-translator-creator-waitlist-admin.ts",
  "lib/comment-translator-creator-waitlist-durable-store.ts",
  "lib/comment-translator-creator-waitlist-shared.ts",
  "lib/comment-translator-free-beta-creator-locked-waitlist.ts",
  "lib/comment-translator.ts",
  "lib/portal-copy.ts",
  readyPreflightDocPath,
  publicUsabilityPreflightDocPath,
  remoteDurableEvidenceDocPath,
  remoteDurablePreflightDocPath,
  finalQaDocPath,
  gapAuditPath,
  "scripts/comment-translator-creator-waitlist-admin-contract.mjs",
  "scripts/comment-translator-portal-admin-navigation-contract.mjs",
  taskPath,
  "scripts/comment-translator-free-beta-allowed-tester-route-api-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-creator-locked-waitlist-contract.mjs",
  "scripts/comment-translator-public-operator-session-ui-contract.mjs",
  "scripts/comment-translator-public-ui-cleanup-contract.mjs",
  "scripts/comment-translator-real-comments-ui-wiring-contract.mjs",
  "supabase/migrations/20260705000000_comment_translator_creator_waitlist_registrations.sql"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `FB-L3 change stays in allowed files: ${file}`);
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log("comment translator Free beta allowed-tester route/API smoke contract checks passed");
