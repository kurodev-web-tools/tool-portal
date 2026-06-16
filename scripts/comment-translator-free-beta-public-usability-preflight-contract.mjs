import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const preflightDocPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PUBLIC_USABILITY_PREFLIGHT.md";
const finalQaDocPath = "docs/active/COMMENT_TRANSLATOR_FREE_PUBLIC_BETA_FINAL_QA_READINESS.md";
const durableReadinessPath = "docs/active/COMMENT_TRANSLATOR_DURABLE_PERSISTENCE_SCHEMA_READINESS.md";
const gapAuditPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md";
const productionEnvPath = "docs/active/COMMENT_TRANSLATOR_PRODUCTION_ENV_READINESS.md";
const productionSmokePath = "docs/active/COMMENT_TRANSLATOR_PRIVATE_GATED_PRODUCTION_SMOKE_EVIDENCE.md";
const taskPath = "task.md";

const referencedRuntimePaths = [
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
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|\bAuthorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+|SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+|ownerUserId\s*[:=]\s*["'][^"']+|providerTargetMetadata\s*[:=]\s*["'][^"']+|rawComment(?:Text|s)?\s*[:=]\s*["'][^"']+/i,
    `${label} does not contain secret values, token values, authorization values, private provider identifiers, live target values, or raw comments`
  );
}

for (const requiredPath of [
  preflightDocPath,
  finalQaDocPath,
  durableReadinessPath,
  gapAuditPath,
  productionEnvPath,
  productionSmokePath,
  taskPath,
  ...referencedRuntimePaths
]) {
  assert.ok(exists(requiredPath), `required FB-L1 reference exists: ${requiredPath}`);
}

const preflightDoc = read(preflightDocPath);
const finalQaDoc = read(finalQaDocPath);
const durableReadiness = read(durableReadinessPath);
const gapAudit = read(gapAuditPath);
const productionEnv = read(productionEnvPath);
const productionSmoke = read(productionSmokePath);
const task = read(taskPath);

for (const requiredSection of [
  "## Purpose",
  "## Inspected Inputs",
  "## Execution Order",
  "## Lane Separation",
  "## Smoke Proof Boundaries",
  "## Exact Approval-Gated Preflight",
  "## Sanitized Evidence Shapes",
  "## Rollback And Abort Rules",
  "## Account Limits And Entitlement Boundary",
  "## No-Secret Output Contract",
  "## Unchecked Scope And Residual Risk",
  "## Completion Verification"
]) {
  assert.match(preflightDoc, new RegExp(`^${escaped(requiredSection)}$`, "m"), `FB-L1 preflight doc includes ${requiredSection}`);
}

for (const requiredFragment of [
  "Status: FB-L1 Free beta public usability preflight",
  "Public-release capable: no",
  "remote/deployed durable enforcement",
  "authenticated allowed-tester route/API smoke",
  "Start smoke",
  "live target lookup",
  "bounded polling",
  "Azure execution",
  "UI confirmation",
  "rollback",
  "no-secret output",
  "local deterministic",
  "sanitized server-owned state",
  "approval-gated exact-command preflight",
  "unchecked live-provider scope",
  "does not prove",
  "blocked-missing-env",
  "blocked-no-approval",
  "blocked-output-review-incomplete",
  "preflight-ready",
  "sanitized-metadata-only",
  "counts/status/stop reasons only",
  "reference-name-only",
  "node scripts/comment-translator-private-gated-live-provider-smoke-execution-harness.mjs --print-exact-command-review",
  "node scripts/comment-translator-private-gated-live-provider-smoke-execution-harness.mjs --execute --approved-private-gated-live-provider-smoke --use-operator-local-runtime-adapters --operator-local-ready-preflight-reviewed",
  "node scripts/comment-translator-youtube-live-chat-target-lookup-command.mjs --check-env-only --json",
  "node scripts/comment-translator-youtube-live-chat-target-lookup-command.mjs --check-token-material-availability --json",
  "node scripts/comment-translator-youtube-live-chat-target-lookup-command.mjs --execute --approved-live-chat-target-lookup --json",
  "node scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs --check-env-only --json",
  "node scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs --check-token-material-availability --json",
  "node scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs --execute --approved-live-chat-polling-smoke --json",
  "no browser storage expansion",
  "no handoff payload expansion",
  "manual liveChatId/channel entry remains excluded",
  "background monitoring from connection alone remains excluded"
]) {
  assert.match(preflightDoc, new RegExp(escaped(requiredFragment), "i"), `FB-L1 preflight doc includes ${requiredFragment}`);
}

for (const orderedFragment of [
  "0. public launch gate remains blocked",
  "1. local deterministic contract baseline",
  "2. remote/deployed durable enforcement preflight",
  "3. authenticated allowed-tester route/API smoke",
  "4. Start smoke",
  "5. live target lookup",
  "6. bounded polling",
  "7. Azure execution",
  "8. UI confirmation",
  "9. rollback readiness",
  "10. no-secret output closeout"
]) {
  assert.match(preflightDoc, new RegExp(escaped(orderedFragment), "i"), `FB-L1 execution order includes ${orderedFragment}`);
}

for (const smoke of [
  "remote/deployed durable enforcement",
  "authenticated allowed-tester route/API smoke",
  "Start smoke",
  "live target lookup",
  "bounded polling",
  "Azure execution",
  "UI confirmation",
  "rollback",
  "no-secret output"
]) {
  assert.match(
    preflightDoc,
    new RegExp(`${escaped(smoke)}[\\s\\S]{0,800}proves[\\s\\S]{0,800}does not prove`, "i"),
    `FB-L1 records what ${smoke} proves and does not prove`
  );
}

for (const gatedAction of [
  "remote Supabase mutation",
  "remote Supabase migration apply",
  "provider target lookup execution",
  "live target lookup execution",
  "liveChatMessages.list execution",
  "session start smoke",
  "translation provider API execution",
  "Azure/OpenAI provider call",
  "deploy/upload",
  "Stripe live Product/Price creation",
  "Checkout",
  "Customer Portal redirect",
  "webhook registration",
  "public launch gate flip",
  "main promotion"
]) {
  assert.match(
    preflightDoc,
    new RegExp(`${escaped(gatedAction)}[\\s\\S]{0,160}(not-run|approval-gated|excluded|do not run)`, "i"),
    `FB-L1 keeps gated action closed: ${gatedAction}`
  );
}

assert.match(finalQaDoc, /FB-L1|Free beta public usability preflight/i, "F15 readiness doc points to FB-L1 follow-up");
assert.match(durableReadiness, /remote\/deployed durable enforcement/i, "durable readiness records FB-L1 remote/deployed durable enforcement follow-up");
assert.match(gapAudit, /FB-L1|Free beta public usability preflight/i, "gap audit records FB-L1 preflight follow-up");
assert.match(productionEnv, /COMMENT_TRANSLATOR_PRIVATE_LAUNCH_ALLOWED_USER_HASHES/i, "production env readiness keeps allowed-tester reference inventory");
assert.match(productionSmoke, /allowed-tester session start smoke[\s\S]*not/i, "production smoke evidence still records session start as not complete");

assert.match(task, /Current branch: `codex\/comment-translator-free-beta-fb-l1-public-usability-preflight`/i, "task.md records FB-L1 current branch");
assert.match(task, /FB-L1[\s\S]*Free beta public usability preflight[\s\S]*complete in this PR/i, "task.md marks FB-L1 complete in this PR");
assert.match(task, /FB-L2[\s\S]*Remote durable enforcement evidence[\s\S]*next \/ gated/i, "task.md advances FB-L2 as next gated task");
assert.match(task, /width checks skipped[\s\S]*no visible UI\/CSS\/layout\/copy change/i, "task.md records width-check skip reason");
assert.match(task, /unchecked scope[\s\S]*provider target lookup[\s\S]*liveChatMessages\.list[\s\S]*Azure\/OpenAI provider API execution/i, "task.md records unchecked live/provider scope");
assert.match(task, /remote Supabase migration apply[\s\S]*not-run\/approval-gated/i, "task.md records remote apply remains not-run/gated");
assert.match(task, /public-release capable: no/i, "task.md keeps public release blocked");

for (const [label, source] of [
  [preflightDocPath, preflightDoc],
  [finalQaDocPath, finalQaDoc],
  [durableReadinessPath, durableReadiness],
  [gapAuditPath, gapAudit],
  [taskPath, task]
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([
  preflightDocPath,
  finalQaDocPath,
  durableReadinessPath,
  gapAuditPath,
  taskPath,
  "scripts/comment-translator-free-beta-public-usability-preflight-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `FB-L1 change stays in allowed files: ${file}`);
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log("comment translator Free beta public usability preflight contract checks passed");
