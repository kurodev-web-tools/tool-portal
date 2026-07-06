import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const evidenceDocPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_REMOTE_DURABLE_ENFORCEMENT_EVIDENCE.md";
const remoteDurablePreflightDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_REMOTE_DURABLE_ENFORCEMENT_READY_PREFLIGHT.md";
const preflightDocPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PUBLIC_USABILITY_PREFLIGHT.md";
const finalQaDocPath = "docs/active/COMMENT_TRANSLATOR_FREE_PUBLIC_BETA_FINAL_QA_READINESS.md";
const durableReadinessPath = "docs/active/COMMENT_TRANSLATOR_DURABLE_PERSISTENCE_SCHEMA_READINESS.md";
const gapAuditPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md";
const taskPath = "task.md";

const runtimePaths = [
  "lib/comment-translator-durable-session-store.ts",
  "lib/comment-translator-durable-usage-counter-store.ts",
  "lib/comment-translator-public-entitlement-baseline.ts",
  "lib/comment-translator-session-runtime.ts",
  "lib/comment-translator-usage-ledger-runtime.ts",
  "app/api/comment-translator/session/route.ts",
  "app/tools/comment-translator/actions.ts"
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

function assertNoSensitiveValues(source, label) {
  assert.doesNotMatch(
    source,
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|\bAuthorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+|SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+/i,
    `${label} does not contain secret values, token values, authorization values, private provider identifiers, live target values, or raw comments`
  );
}

for (const requiredPath of [
  evidenceDocPath,
  remoteDurablePreflightDocPath,
  preflightDocPath,
  finalQaDocPath,
  durableReadinessPath,
  gapAuditPath,
  taskPath,
  ...runtimePaths
]) {
  assert.ok(exists(requiredPath), `FB-L2 required reference exists: ${requiredPath}`);
}

const evidenceDoc = read(evidenceDocPath);
const remoteDurablePreflightDoc = read(remoteDurablePreflightDocPath);
const preflightDoc = read(preflightDocPath);
const finalQaDoc = read(finalQaDocPath);
const durableReadiness = read(durableReadinessPath);
const gapAudit = read(gapAuditPath);
const task = read(taskPath);
const runtimeSources = runtimePaths.map((runtimePath) => [runtimePath, read(runtimePath)]);

for (const requiredSection of [
  "## Purpose",
  "## Execution Decision",
  "## Inspected Inputs",
  "## Remote Durable Authority Boundary",
  "## What This Evidence Proves",
  "## What This Evidence Does Not Prove",
  "## Free Cap Enforcement Matrix",
  "## Approval-Gated Remote Apply Requirements",
  "## Sanitized Evidence Record",
  "## Next Safe Action",
  "## Unchecked Scope And Residual Risk",
  "## Completion Verification"
]) {
  assert.match(evidenceDoc, new RegExp(`^${escaped(requiredSection)}$`, "m"), `FB-L2 evidence doc includes ${requiredSection}`);
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
    remoteDurablePreflightDoc,
    new RegExp(`^${escaped(requiredSection)}$`, "m"),
    `FB-L2 ready preflight doc includes ${requiredSection}`
  );
}

for (const requiredFragment of [
  "Status: FB-L2 Remote durable enforcement evidence",
  "Public-release capable: no",
  "blocked-no-approval",
  "remote Supabase migration apply: not-run / approval-gated",
  "remote Supabase mutation: not-run / approval-gated",
  "same-thread ready preflight",
  "sanitized output review",
  "exact explicit approval",
  "comment_translator_sessions",
  "comment_translator_usage_ledger_events",
  "durable-store-unavailable",
  "fail closed",
  "30 minutes per user per day",
  "30 minutes per session",
  "1 active session per user",
  "30 translated messages per minute",
  "20,000 translated characters per month",
  "Paid entitlement C1/C3",
  "Stripe billing",
  "Creator paid limits",
  "counts/status/stop reasons only",
  "no browser storage expansion",
  "no handoff payload expansion"
]) {
  assert.match(evidenceDoc, new RegExp(escaped(requiredFragment), "i"), `FB-L2 evidence doc includes ${requiredFragment}`);
}

for (const requiredFragment of [
  "Status: FB-L2 remote/deployed durable enforcement ready preflight",
  "Public-release capable: no",
  "preflight-ready",
  "not-run in this thread",
  "node scripts/comment-translator-free-beta-remote-durable-enforcement-evidence-contract.mjs",
  "npx supabase migration list --linked",
  "npx supabase db push --linked --dry-run",
  "npx supabase db push --linked",
  "COMMENT_TRANSLATOR_DEPLOYED_ORIGIN",
  "COMMENT_TRANSLATOR_ALLOWED_TESTER_COOKIE",
  "POST /api/comment-translator/session",
  "\"intent\":\"status\"",
  "\"intent\":\"start\"",
  "\"intent\":\"stop\"",
  "comment_translator_sessions",
  "comment_translator_usage_ledger_events",
  "20260615000000_comment_translator_sessions.sql",
  "20260615001000_comment_translator_usage_ledger_events.sql",
  "approved-fb-l2-remote-durable-enforcement-apply-and-smoke",
  "counts/status/stop reasons only",
  "no remote mutation/apply/deploy/provider/Stripe was executed"
]) {
  assert.match(
    remoteDurablePreflightDoc,
    new RegExp(escaped(requiredFragment), "i"),
    `FB-L2 ready preflight doc includes ${requiredFragment}`
  );
}

for (const requiredFragment of [
  "current-proof local baseline",
  "durable session store source",
  "durable usage store source",
  "public entitlement baseline source",
  "route/action durable fail-closed wiring",
  "historical F3/F4/F5/F12 contract drift",
  "residual risk",
  "not a blocker for Phase A dry-run",
  "supabase link metadata copied locally",
  "phase-a-dry-run-reviewed-two-migrations-only",
  "20260615000000_comment_translator_sessions.sql",
  "20260615001000_comment_translator_usage_ledger_events.sql"
]) {
  assert.match(
    remoteDurablePreflightDoc,
    new RegExp(escaped(requiredFragment), "i"),
    `FB-L2 ready preflight doc records current-proof baseline and drift residual risk: ${requiredFragment}`
  );
}

for (const outOfScopeBaselineCommand of [
  "node scripts/comment-translator-durable-session-schema-adapter-contract.mjs",
  "node scripts/comment-translator-durable-usage-counter-schema-adapter-contract.mjs",
  "node scripts/comment-translator-public-entitlement-baseline-contract.mjs",
  "node scripts/comment-translator-session-start-stop-contract.mjs",
  "node scripts/comment-translator-free-beta-usage-display-contract.mjs"
]) {
  assert.doesNotMatch(
    remoteDurablePreflightDoc,
    new RegExp(escaped(outOfScopeBaselineCommand), "i"),
    `FB-L2 ready preflight excludes drift-prone historical baseline command: ${outOfScopeBaselineCommand}`
  );
}

for (const proofBoundary of [
  "can prove",
  "does not prove",
  "provider target lookup",
  "live target lookup",
  "liveChatMessages.list",
  "Azure execution",
  "session start smoke",
  "public launch gate flip"
]) {
  assert.match(evidenceDoc, new RegExp(escaped(proofBoundary), "i"), `FB-L2 evidence doc records proof boundary: ${proofBoundary}`);
}

assert.match(preflightDoc, /FB-L2|Remote durable enforcement evidence/i, "FB-L1 preflight doc points to FB-L2 durable evidence");
assert.match(evidenceDoc, /READY_PREFLIGHT|ready preflight/i, "FB-L2 evidence doc points to the ready preflight");
assert.match(finalQaDoc, /FB-L2|Remote durable enforcement evidence/i, "F15 readiness doc points to FB-L2 durable evidence");
assert.match(durableReadiness, /FB-L2|Remote durable enforcement evidence/i, "durable readiness doc records FB-L2 durable evidence follow-up");
assert.match(gapAudit, /FB-L2|Remote durable enforcement evidence/i, "gap audit records FB-L2 durable evidence follow-up");

assert.match(task, /PL-G1 Remote durable enforcement[\s\S]*complete/i, "task.md records durable enforcement complete");
assert.match(task, /PL-G2 Allowed-tester route\/API smoke[\s\S]*complete/i, "task.md records route/API smoke complete");
assert.match(task, /PL-G5 Release-owner public launch decision[\s\S]*pending/i, "task.md keeps release-owner decision pending");
assert.match(task, /Current public-launch decision: `public-release capable: no`/i, "task.md keeps public release blocked");
assert.match(task, /remote schema migration \/ Supabase migration apply/i, "task.md keeps remote migration apply approval-gated");
assert.match(task, /remote read-only Supabase posture check remains unchecked/i, "task.md records remote posture check as residual risk");

const runtimeExpectations = [
  ["lib/comment-translator-durable-session-store.ts", /tableName:\s*"comment_translator_sessions"/],
  ["lib/comment-translator-durable-session-store.ts", /failClosedFallback:\s*"stop-session-when-durable-store-unavailable"/],
  ["lib/comment-translator-durable-usage-counter-store.ts", /tableName:\s*"comment_translator_usage_ledger_events"/],
  ["lib/comment-translator-durable-usage-counter-store.ts", /failClosedFallback:\s*"stop-session-when-durable-usage-store-unavailable"/],
  ["lib/comment-translator-public-entitlement-baseline.ts", /monthlyTranslatedCharacters:\s*20_000/],
  ["lib/comment-translator-session-runtime.ts", /dailyMinutes:\s*30[\s\S]*sessionMinutes:\s*30[\s\S]*translatedMessagesPerMinute:\s*30[\s\S]*activeSessionsPerUser:\s*1/],
  ["app/api/comment-translator/session/route.ts", /readCommentTranslatorDurableActiveSessionOrFailClosed[\s\S]*readCommentTranslatorDurableUsageSnapshotOrFailClosed/],
  ["app/tools/comment-translator/actions.ts", /readCommentTranslatorDurableActiveSessionOrFailClosed[\s\S]*readCommentTranslatorDurableUsageSnapshotOrFailClosed/]
];

for (const [runtimePath, pattern] of runtimeExpectations) {
  assert.match(read(runtimePath), pattern, `FB-L2 runtime source supports durable fail-closed authority: ${runtimePath}`);
}

for (const [label, source] of [
  [evidenceDocPath, evidenceDoc],
  [remoteDurablePreflightDocPath, remoteDurablePreflightDoc],
  [preflightDocPath, preflightDoc],
  [finalQaDocPath, finalQaDoc],
  [durableReadinessPath, durableReadiness],
  [gapAuditPath, gapAudit],
  [taskPath, task],
  ...runtimeSources
]) {
  assertNoSensitiveValues(source, label);
}

console.log("comment translator Free beta remote durable enforcement evidence contract checks passed");
