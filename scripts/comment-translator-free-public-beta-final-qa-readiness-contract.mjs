import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const finalQaDocPath = "docs/active/COMMENT_TRANSLATOR_FREE_PUBLIC_BETA_FINAL_QA_READINESS.md";
const gapAuditPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md";
const durableReadinessPath = "docs/active/COMMENT_TRANSLATOR_DURABLE_PERSISTENCE_SCHEMA_READINESS.md";
const taskPath = "task.md";

const requiredReferencePaths = [
  "lib/comment-translator-durable-session-store.ts",
  "lib/comment-translator-durable-usage-counter-store.ts",
  "lib/comment-translator-public-entitlement-baseline.ts",
  "lib/comment-translator-session-runtime.ts",
  "lib/comment-translator-usage-ledger-runtime.ts",
  "lib/comment-translator-server-only-live-chat-target-lookup.ts",
  "lib/comment-translator-bounded-live-chat-polling-wiring.ts",
  "lib/comment-translator-live-message-normalization.ts",
  "lib/comment-translator-real-comments-ui-wiring.ts",
  "lib/comment-translator-real-comments-feed-shared.ts",
  "lib/comment-translator-azure-normal-translation-execution.ts",
  "lib/comment-translator-start-stop-reason-ux.ts",
  "lib/comment-translator-free-beta-usage-display.ts",
  "lib/comment-translator-free-beta-retention-attribution.ts",
  "lib/comment-translator-free-beta-creator-locked-waitlist.ts",
  "app/api/comment-translator/session/route.ts",
  "app/tools/comment-translator/actions.ts",
  "components/comment-translator/CommentTranslatorDock.tsx",
  "lib/comment-translator.ts"
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
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|\bAuthorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+|SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+|ownerUserId\s*[:=]\s*["'][^"']+|providerTargetMetadata\s*[:=]\s*["'][^"']+/i,
    `${label} does not contain committed secret values, token values, authorization values, or private provider identifiers`
  );
}

for (const requiredPath of [finalQaDocPath, gapAuditPath, durableReadinessPath, taskPath, ...requiredReferencePaths]) {
  assert.ok(exists(requiredPath), `required F15 reference exists: ${requiredPath}`);
}

const finalQaDoc = read(finalQaDocPath);
const gapAudit = read(gapAuditPath);
const durableReadiness = read(durableReadinessPath);
const task = read(taskPath);

for (const requiredSection of [
  "## Purpose",
  "## Inspected Inputs",
  "## F1-F14 Evidence Review",
  "## Route And API Smoke Plan",
  "## No-Secret Scan Plan",
  "## Width Checks",
  "## Legal And Copy Review",
  "## Rollback Notes",
  "## Public Launch Readiness Decision",
  "## Blockers",
  "## Accepted Risks",
  "## Unchecked Scope",
  "## Completion Verification"
]) {
  assert.match(finalQaDoc, new RegExp(`^${requiredSection}$`, "m"), `F15 final QA doc includes ${requiredSection}`);
}

for (const requiredFragment of [
  "Status: F15 Free public beta final QA / launch readiness",
  "Public-release capable: no",
  "local deterministic",
  "sanitized server-owned state",
  "approval-gated exact-command preflight",
  "route/API smoke plan",
  "/api/comment-translator/session",
  "getCommentTranslatorSessionAction",
  "refreshCommentTranslatorRealCommentsFeedAction",
  "getCommentTranslatorFreeBetaUsageDisplayAction",
  "getCommentTranslatorFreeBetaRetentionAttributionAction",
  "getCommentTranslatorCreatorLockedWaitlistAction",
  "changed-files no-secret scan",
  "legal/copy review",
  "rollback notes",
  "public launch gate flip: not-run",
  "remote Supabase mutation/schema apply: not-run",
  "Stripe live action: not-run",
  "provider target lookup: not-run",
  "live target lookup: not-run",
  "liveChatMessages.list: not-run",
  "Azure/OpenAI provider API execution: not-run",
  "width checks skipped",
  "no visible UI/CSS/layout/copy change",
  "F1",
  "F2",
  "F3",
  "F4",
  "F5",
  "F6",
  "F7",
  "F8",
  "F9",
  "F10",
  "F11",
  "F12",
  "F13",
  "F14"
]) {
  assert.match(finalQaDoc, new RegExp(escaped(requiredFragment), "i"), `F15 final QA doc includes ${requiredFragment}`);
}

for (const gatedAction of [
  "real OAuth connect",
  "live authorization code exchange",
  "live token persistence smoke",
  "provider target lookup",
  "live target lookup",
  "liveChatMessages.list",
  "session start smoke",
  "translation provider API execution",
  "live/provider execution",
  "Azure/OpenAI provider API execution",
  "remote mutation",
  "schema migration",
  "Stripe live action",
  "deploy/upload",
  "main promotion",
  "public launch gate flip"
]) {
  assert.match(finalQaDoc, new RegExp(`${escaped(gatedAction)}[\\s\\S]{0,120}(not-run|approval-gated)`, "i"), `F15 records gated action as not-run/approval-gated: ${gatedAction}`);
}

assert.match(gapAudit, /F15[\s\S]*Free public beta final QA\/readiness[\s\S]*(implemented|complete)/i, "gap audit records F15 completion state");
assert.match(durableReadiness, /F15 Free public beta final QA \/ launch readiness/i, "durable readiness doc records F15");
assert.match(durableReadiness, /Public-release capable: no/i, "durable readiness keeps public release blocked");
assert.match(task, /Current branch: `codex\/comment-translator-free-beta-final-qa-readiness`/i, "task.md records current F15 branch");
assert.match(task, /F15[\s\S]*Free public beta final QA \/ launch readiness[\s\S]*complete in this PR/i, "task.md marks F15 complete in this PR");
assert.match(task, /width checks skipped[\s\S]*no visible UI\/CSS\/layout\/copy change/i, "task.md records F15 width-check skip reason");
assert.match(task, /public-release capable: no/i, "task.md keeps public-release capable blocked");

for (const [label, source] of [
  [finalQaDocPath, finalQaDoc],
  [gapAuditPath, gapAudit],
  [durableReadinessPath, durableReadiness],
  [taskPath, task]
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([finalQaDocPath, gapAuditPath, durableReadinessPath, taskPath, "scripts/comment-translator-free-public-beta-final-qa-readiness-contract.mjs"]);
for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `F15 change stays in allowed files: ${file}`);
  if (!file.endsWith(".mjs")) {
    assertNoSensitiveValues(read(file), `changed file ${file}`);
  }
}

console.log("comment translator Free public beta final QA readiness contract checks passed");
