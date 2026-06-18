import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const evidenceDocPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_EVIDENCE.md";
const readyPreflightDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_READY_PREFLIGHT.md";
const plG3AfterPlG2kDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_COMPLETION_AFTER_PL_G2K.md";
const publicUsabilityPreflightDocPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PUBLIC_USABILITY_PREFLIGHT.md";
const remoteDurableEvidenceDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_REMOTE_DURABLE_ENFORCEMENT_EVIDENCE.md";
const remoteDurablePreflightDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_REMOTE_DURABLE_ENFORCEMENT_READY_PREFLIGHT.md";
const allowedTesterEvidenceDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_ALLOWED_TESTER_ROUTE_API_SMOKE_EVIDENCE.md";
const allowedTesterPreflightDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_ALLOWED_TESTER_ROUTE_API_SMOKE_READY_PREFLIGHT.md";
const finalQaDocPath = "docs/active/COMMENT_TRANSLATOR_FREE_PUBLIC_BETA_FINAL_QA_READINESS.md";
const gapAuditPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md";
const taskPath = "task.md";

const runtimePaths = [
  "app/api/comment-translator/session/route.ts",
  "app/tools/comment-translator/actions.ts",
  "lib/comment-translator-session-runtime.ts",
  "lib/comment-translator-usage-ledger-runtime.ts",
  "lib/comment-translator-public-entitlement-baseline.ts",
  "lib/comment-translator-server-only-live-chat-target-lookup.ts",
  "lib/comment-translator-bounded-live-chat-polling-wiring.ts",
  "lib/comment-translator-live-message-normalization.ts",
  "lib/comment-translator-azure-normal-translation-execution.ts"
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
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|\bAuthorization\s*[:=]\s*["'](?!server-only-test-authorization["'])[^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'](?!present["'])[^"']+|SERVICE_ROLE_KEY\s*[:=]\s*["'](?!present["'])[^"']+|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'](?!(?:server-only-live-chat-target-reference|server-only-live-target-never-output|live-chat-id-never-returned)["'])[^"']+|providerChannelId\s*[:=]\s*["'](?!(?:server-only-channel-reference|provider-channel-reference-never-returned|different-provider-channel-reference-never-returned)["'])[^"']+|ownerUserId\s*[:=]\s*["'](?!(?:server-only-owner-reference|owner-reference-never-returned)["'])[^"']+|providerTargetMetadata\s*[:=]\s*["'](?!forbidden["'])[^"']+|rawComment(?:Text|s|Retention)?\s*[:=]\s*["'](?!(?:never-recorded-by-design|never-returned-by-design|not-recorded-by-design|not-returned-by-design|disabled-by-default)["'])[^"']+/i,
    `${label} does not contain secret values, token values, authorization values, private provider identifiers, live target values, or raw comments`
  );
}

for (const requiredPath of [
  evidenceDocPath,
  readyPreflightDocPath,
  plG3AfterPlG2kDocPath,
  publicUsabilityPreflightDocPath,
  remoteDurableEvidenceDocPath,
  remoteDurablePreflightDocPath,
  allowedTesterEvidenceDocPath,
  allowedTesterPreflightDocPath,
  finalQaDocPath,
  gapAuditPath,
  taskPath,
  ...runtimePaths
]) {
  assert.ok(exists(requiredPath), `FB-L4 required reference exists: ${requiredPath}`);
}

const evidenceDoc = read(evidenceDocPath);
const readyPreflightDoc = read(readyPreflightDocPath);
const plG3AfterPlG2kDoc = read(plG3AfterPlG2kDocPath);
const publicUsabilityPreflightDoc = read(publicUsabilityPreflightDocPath);
const remoteDurableEvidenceDoc = read(remoteDurableEvidenceDocPath);
const remoteDurablePreflightDoc = read(remoteDurablePreflightDocPath);
const allowedTesterEvidenceDoc = read(allowedTesterEvidenceDocPath);
const allowedTesterPreflightDoc = read(allowedTesterPreflightDocPath);
const finalQaDoc = read(finalQaDocPath);
const gapAudit = read(gapAuditPath);
const task = read(taskPath);
const runtimeSources = runtimePaths.map((runtimePath) => [runtimePath, read(runtimePath)]);

for (const requiredSection of [
  "## Purpose",
  "## Execution Decision",
  "## Inspected Inputs",
  "## Smoke Boundary",
  "## Local Contract Boundary",
  "## What This Evidence Proves",
  "## What This Evidence Does Not Prove",
  "## Sanitized Evidence Record",
  "## Next Safe Action",
  "## Unchecked Scope And Residual Risk",
  "## Completion Verification"
]) {
  assert.match(evidenceDoc, new RegExp(`^${escaped(requiredSection)}$`, "m"), `FB-L4 evidence doc includes ${requiredSection}`);
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
    `FB-L4 ready preflight doc includes ${requiredSection}`
  );
}

for (const requiredFragment of [
  "Status: FB-L4 Approved Start-to-translation smoke",
  "Public-release capable: no",
  "blocked-no-approval",
  "Start-to-translation smoke execution",
  "same-thread ready preflight",
  "sanitized output review",
  "exact explicit approval",
  "server-only live target lookup",
  "bounded `liveChatMessages.list`",
  "non-empty live comment intake",
  "Free Azure translation",
  "UI feed",
  "usage",
  "stop reason",
  "source attribution",
  "not-run / approval-gated",
  "30 minutes per user per day",
  "30 minutes per session",
  "1 active session per user",
  "30 translated messages per minute",
  "20,000 translated characters per month",
  "missing or unreadable durable state",
  "fail closed",
  "Paid entitlement C1/C3",
  "Stripe billing",
  "Creator paid limits",
  "counts/status/stop reasons only",
  "no browser storage expansion",
  "no handoff payload expansion"
]) {
  assert.match(evidenceDoc, new RegExp(escaped(requiredFragment), "i"), `FB-L4 evidence doc includes ${requiredFragment}`);
}

for (const requiredFragment of [
  "Status: FB-L4 approved Start-to-translation smoke ready preflight",
  "Public-release capable: no",
  "preflight-ready",
  "not-run in this thread",
  "node scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs",
  "COMMENT_TRANSLATOR_DEPLOYED_ORIGIN",
  "COMMENT_TRANSLATOR_ALLOWED_TESTER_COOKIE",
  "COMMENT_TRANSLATOR_CREDENTIAL_REFERENCE",
  "POST /api/comment-translator/session",
  "\"intent\":\"start\"",
  "\"intent\":\"stop\"",
  "approved-fb-l4-start-to-translation-smoke",
  "server-only live target lookup",
  "liveChatMessages.list",
  "non-empty intake",
  "Azure",
  "source attribution",
  "counts/status/stop reasons only",
  "no remote Supabase migration apply",
  "no deploy/upload",
  "no Stripe",
  "no public launch gate flip"
]) {
  assert.match(
    readyPreflightDoc,
    new RegExp(escaped(requiredFragment), "i"),
    `FB-L4 ready preflight doc includes ${requiredFragment}`
  );
}

for (const forbiddenFragment of [
  "npx supabase db push --linked",
  "wrangler deploy",
  "wrangler versions upload",
  "approved-fb-l2-remote-durable-enforcement-apply-and-smoke",
  "approved-fb-l3-allowed-tester-route-api-smoke"
]) {
  assert.doesNotMatch(
    readyPreflightDoc,
    new RegExp(escaped(forbiddenFragment), "i"),
    `FB-L4 ready preflight excludes out-of-scope command or approval label: ${forbiddenFragment}`
  );
}

assert.match(publicUsabilityPreflightDoc, /Start smoke[\s\S]*live target lookup[\s\S]*bounded polling[\s\S]*Azure execution/i, "FB-L1 preflight keeps FB-L4 sequence");
assert.match(plG3AfterPlG2kDoc, /blocked-empty-polling-intake-after-one-step/i, "PL-G3 after PL-G2K records approved empty polling blocker");
assert.match(plG3AfterPlG2kDoc, /Status route precheck:\s*executed \/ HTTP 200[\s\S]*Explicit Start:\s*executed \/ HTTP 200[\s\S]*active[\s\S]*Server-only live target lookup:\s*executed[\s\S]*returned count 5[\s\S]*One bounded `liveChatMessages\.list` polling step:\s*executed[\s\S]*returned count 0[\s\S]*Explicit Stop:\s*executed \/ HTTP 200[\s\S]*user-stop/i, "PL-G3 after PL-G2K records sanitized status/start/target-lookup/polling/stop evidence");
assert.match(remoteDurableEvidenceDoc, /session start smoke[\s\S]*not-run \/ approval-gated/i, "FB-L2 evidence leaves Start unchecked");
assert.match(remoteDurablePreflightDoc, /What Approval Would Not Prove[\s\S]*provider target lookup[\s\S]*live target lookup[\s\S]*liveChatMessages\.list/i, "FB-L2 ready preflight excludes provider/live proof");
assert.match(allowedTesterEvidenceDoc, /session Start[\s\S]*provider target lookup[\s\S]*live target lookup[\s\S]*`liveChatMessages.list`/i, "FB-L3 evidence leaves FB-L4 live path unchecked");
assert.match(allowedTesterPreflightDoc, /What Approval Would Not Prove[\s\S]*session Start[\s\S]*provider target lookup[\s\S]*live target lookup/i, "FB-L3 ready preflight excludes Start/live proof");
assert.match(finalQaDoc, /FB-L4|Start-to-translation smoke/i, "F15 readiness doc points to FB-L4 Start-to-translation smoke");
assert.match(gapAudit, /FB-L4|Start-to-translation smoke/i, "gap audit records FB-L4 follow-up");

assert.match(
  task,
  /Current branch: `codex\/comment-translator-free-beta-(fb-l4-approved-start-to-translation-smoke|pl-g3-(?:start-to-translation-smoke(?:-evidence-follow-up|-completion-after-pl-g2k)?|bounded-polling-empty-intake-evidence-after-start-lookup|polling-sanitized-diagnostics))`/i,
  "task.md records FB-L4 or PL-G3 Start-to-translation branch"
);
assert.match(task, /FB-L4[\s\S]*Approved Start-to-translation smoke[\s\S]*(preflight-ready|blocked-no-approval)/i, "task.md records FB-L4 state");
assert.match(task, /Latest FB-L4 Evidence/i, "task.md records Latest FB-L4 Evidence");
assert.match(task, /approved-fb-l4-start-to-translation-smoke/i, "task.md records exact FB-L4 approval label");
assert.match(task, /Start-to-translation smoke execution[\s\S]*not-run\/approval-gated/i, "task.md records FB-L4 smoke not-run/gated");
assert.match(task, /unchecked scope[\s\S]*Start-to-translation smoke execution/i, "task.md records unchecked Start-to-translation execution scope");
assert.match(task, /width checks skipped[\s\S]*no visible UI\/CSS\/layout\/copy change/i, "task.md records width-check skip reason");
assert.match(task, /public-release capable: no/i, "task.md keeps public release blocked");

const routeSource = read("app/api/comment-translator/session/route.ts");
assert.match(routeSource, /readCommentTranslatorDurableActiveSessionOrFailClosed[\s\S]*readCommentTranslatorDurableUsageSnapshotOrFailClosed/, "route reads durable session and usage before Start response");
assert.match(routeSource, /resolveCommentTranslatorServerOnlyLiveChatTargetLookupForStart/, "route uses server-only target lookup boundary");
assert.match(routeSource, /createSkippedCommentTranslatorLiveChatTargetLookupNotApproved/, "route skips unapproved Start target lookup");
assert.match(routeSource, /readCommentTranslatorBoundedLiveChatPollingTick[\s\S]*live-provider-polling-not-approved/, "route keeps bounded provider polling unavailable by default");
assert.match(routeSource, /recordCommentTranslatorDurableSessionLedgerStateOrFailClosed/, "route persists session ledger state through durable usage boundary");
assert.match(routeSource, /seedCommentTranslatorBoundedLiveChatPollingStateForActiveSession/, "route seeds polling state only after active Start");

const actionsSource = read("app/tools/comment-translator/actions.ts");
assert.match(actionsSource, /startCommentTranslatorSessionAction[\s\S]*intent:\s*"start"/, "server action exposes explicit Start only");
assert.match(actionsSource, /resolveCommentTranslatorServerOnlyLiveChatTargetLookupForStart/, "actions use server-only target lookup boundary");
assert.match(actionsSource, /createSkippedCommentTranslatorLiveChatTargetLookupNotApproved/, "actions skip unapproved Start target lookup");
assert.match(actionsSource, /readCommentTranslatorBoundedLiveChatPollingTick[\s\S]*live-provider-polling-not-approved/, "actions keep bounded provider polling unavailable by default");
assert.match(actionsSource, /recordCommentTranslatorDurableSessionLedgerStateOrFailClosed/, "actions persist durable usage/session ledger state");
assert.match(actionsSource, /seedCommentTranslatorBoundedLiveChatPollingStateForActiveSession/, "actions seed polling state only for active Start");

const targetLookupSource = read("lib/comment-translator-server-only-live-chat-target-lookup.ts");
assert.match(targetLookupSource, /import "server-only"/, "target lookup is server-only");
assert.match(targetLookupSource, /sessionBoundary:\s*"start-intent-only"/, "target lookup is Start-only");
assert.match(targetLookupSource, /targetMetadataHandling:\s*"server-only-internal-never-client-readable"/, "target metadata stays server-only");
assert.match(targetLookupSource, /providerTargetLookupExecution:\s*"not-run-in-this-thread"/, "target lookup execution remains not-run by default");
assert.match(targetLookupSource, /liveChatIdLookupExecution:\s*"not-run-in-this-thread"/, "live target lookup execution remains not-run by default");

const pollingSource = read("lib/comment-translator-bounded-live-chat-polling-wiring.ts");
assert.match(pollingSource, /import "server-only"/, "bounded polling is server-only");
assert.match(pollingSource, /liveTargetHandling:\s*"server-only-active-session-state"/, "polling target handling is server-only active-session state");
assert.match(pollingSource, /pollingCursor:\s*"nextPageToken-server-only"/, "polling cursor stays server-only");
assert.match(pollingSource, /quotaBudgetStopHandoff:\s*"durable-session-ledger-stop-state"/, "polling hands quota stops to durable ledger state");
assert.match(pollingSource, /translatedMessagesPerMinute[^=]*=\s*usage\.planEntitlement\?\.translatedMessagesPerMinute \?\? 30/, "polling enforces Free per-minute default");

const azureSource = read("lib/comment-translator-azure-normal-translation-execution.ts");
assert.match(azureSource, /import "server-only"/, "Azure translation bridge is server-only");
assert.match(azureSource, /freePlanPrimary:\s*"azure-translator"/, "Free plan primary provider remains Azure Translator");
assert.match(azureSource, /providerApiExecution:\s*"approval-gated-not-run-by-default"/, "Azure provider execution remains approval-gated by default");
assert.match(azureSource, /outputBoundary:\s*"f9-browser-safe-feed-row-only"/, "Azure bridge returns browser-safe feed rows only");
assert.match(azureSource, /durableUsageWrite:\s*"not-run-local-deterministic-handoff-only"/, "Azure local bridge does not overclaim durable usage writes");

for (const [label, source] of [
  [evidenceDocPath, evidenceDoc],
  [readyPreflightDocPath, readyPreflightDoc],
  [plG3AfterPlG2kDocPath, plG3AfterPlG2kDoc],
  [publicUsabilityPreflightDocPath, publicUsabilityPreflightDoc],
  [remoteDurableEvidenceDocPath, remoteDurableEvidenceDoc],
  [remoteDurablePreflightDocPath, remoteDurablePreflightDoc],
  [allowedTesterEvidenceDocPath, allowedTesterEvidenceDoc],
  [allowedTesterPreflightDocPath, allowedTesterPreflightDoc],
  [finalQaDocPath, finalQaDoc],
  [gapAuditPath, gapAudit],
  [taskPath, task],
  ...runtimeSources
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([
  "app/api/comment-translator/session/route.ts",
  "app/tools/comment-translator/actions.ts",
  "lib/comment-translator-server-only-live-chat-target-lookup.ts",
  evidenceDocPath,
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE.md",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_EVIDENCE_FOLLOW_UP.md",
  plG3AfterPlG2kDocPath,
  readyPreflightDocPath,
  publicUsabilityPreflightDocPath,
  finalQaDocPath,
  gapAuditPath,
  taskPath,
  "lib/comment-translator-youtube-live-chat-polling-smoke-foundation.ts",
  "scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs",
  "scripts/comment-translator-youtube-live-chat-polling-smoke-command-contract.mjs",
  "scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g2k-approved-route-api-harness-smoke-execution-after-pl-g2j-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-polling-sanitized-diagnostics-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-completion-after-pl-g2k-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-evidence-follow-up-contract.mjs",
  "scripts/comment-translator-server-only-live-chat-target-lookup-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `FB-L4 change stays in allowed files: ${file}`);
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log("comment translator Free beta approved Start-to-translation smoke contract checks passed");
