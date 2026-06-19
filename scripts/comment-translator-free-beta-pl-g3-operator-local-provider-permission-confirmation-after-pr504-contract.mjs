import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const triageDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_PROVIDER_PERMISSION_TRIAGE_PREFLIGHT.md";
const plG4FollowUpPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G4_PRODUCTION_CUSTOM_DEPLOYED_SMOKE_EVIDENCE_FOLLOW_UP.md";
const plG5FollowUpPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION_EVIDENCE_FOLLOW_UP_AFTER_PL_G4.md";
const taskPath = "task.md";

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
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|\bAuthorization\s*[:=]\s*["'](?!server-only-test-authorization["'])[^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'](?!present["'])[^"']+|SERVICE_ROLE_KEY\s*[:=]\s*["'](?!present["'])[^"']+|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'](?!(?:server-only-live-chat-target-reference|server-only-live-target-never-output|live-chat-id-never-returned)["'])[^"']+|providerChannelId\s*[:=]\s*["'](?!(?:server-only-channel-reference|provider-channel-reference-never-returned|different-provider-channel-reference-never-returned)["'])[^"']+|ownerUserId\s*[:=]\s*["'](?!(?:server-only-owner-reference|owner-reference-never-returned)["'])[^"']+|providerTargetMetadata\s*[:=]\s*["'](?!forbidden["'])[^"']+|raw(?:Provider|Error|Response|Message|Reason|Comment)(?:Body|Payload|Message|Reason|Text|s|Value)?\s*[:=]\s*["'](?!not-requested-not-documented|not-returned-by-design|never-recorded-by-design|never-returned-by-design|forbidden)[^"']+/i,
    `${label} does not contain secret values, token values, authorization values, private provider identifiers, live target values, or raw provider/comment values`
  );
}

for (const requiredPath of [triageDocPath, plG4FollowUpPath, plG5FollowUpPath, taskPath]) {
  assert.ok(exists(requiredPath), `PL-G3 operator-local confirmation required path exists: ${requiredPath}`);
}

const triageDoc = read(triageDocPath);
const plG4FollowUp = read(plG4FollowUpPath);
const plG5FollowUp = read(plG5FollowUpPath);
const task = read(taskPath);

for (const requiredSection of [
  "## Operator-local Confirmation Checklist Expectations",
  "## Operator-local Confirmation Evidence Record After PR #504",
  "## Exact Approval Retry Preconditions",
  "## No-live Execution Boundary",
  "## Forbidden Output And Documentation",
  "## Completion Verification"
]) {
  assert.match(triageDoc, new RegExp(`^${escaped(requiredSection)}$`, "m"), `PL-G3 operator-local confirmation doc includes ${requiredSection}`);
}

for (const requiredFragment of [
  "PL-G3 operator-local provider-permission confirmation evidence record after PR #504",
  "PR #504",
  "blocked-missing-operator-local-confirmation-output",
  "operator-local sanitized confirmation output",
  "category / label / pass-fail / unavailableReason",
  "OAuth scope category",
  "target live chat availability",
  "owner/channel binding",
  "provider permission state",
  "quota/rate-limit state",
  "PL-G3 state: blocked-provider-permission-rejected-after-target-present",
  "Azure-UI-not-run",
  "public gate state label: unchanged / blocked",
  "public-release capable label: no",
  "actual provider retry",
  "Start-to-translation smoke completion",
  "same-thread exact approval",
  "Public access change",
  "limited public beta open",
  "public launch gate flip",
  "main promotion",
  "separate reviewed operation"
]) {
  assert.match(triageDoc, new RegExp(escaped(requiredFragment), "i"), `PL-G3 operator-local confirmation doc includes ${requiredFragment}`);
}

assert.match(
  triageDoc,
  /\| OAuth scope category \| blocked-missing-operator-local-confirmation-output \| fail \| operator-local sanitized confirmation output not present in this thread \|/i,
  "PL-G3 operator-local confirmation doc records missing OAuth scope category output"
);
assert.match(
  triageDoc,
  /\| target live chat availability \| blocked-missing-operator-local-confirmation-output \| fail \| operator-local sanitized confirmation output not present in this thread \|/i,
  "PL-G3 operator-local confirmation doc records missing target live chat availability output"
);
assert.match(
  triageDoc,
  /\| owner\/channel binding \| blocked-missing-operator-local-confirmation-output \| fail \| operator-local sanitized confirmation output not present in this thread \|/i,
  "PL-G3 operator-local confirmation doc records missing owner/channel binding output"
);
assert.match(
  triageDoc,
  /\| provider permission state \| blocked-missing-operator-local-confirmation-output \| fail \| operator-local sanitized confirmation output not present in this thread \|/i,
  "PL-G3 operator-local confirmation doc records missing provider permission state output"
);
assert.match(
  triageDoc,
  /\| quota\/rate-limit state \| blocked-missing-operator-local-confirmation-output \| fail \| operator-local sanitized confirmation output not present in this thread \|/i,
  "PL-G3 operator-local confirmation doc records missing quota/rate-limit state output"
);
assert.match(
  triageDoc,
  /Exact approval retry preconditions[\s\S]*all five operator-local confirmations[\s\S]*pass true[\s\S]*reviewed sanitized checklist output[\s\S]*same-thread exact approval label for PL-G3[\s\S]*no raw provider response[\s\S]*no provider target value/i,
  "PL-G3 operator-local confirmation doc keeps exact approval retry preconditions blocked until confirmations pass"
);
assert.match(
  triageDoc,
  /Do not run Start[\s\S]*Do not run Stop[\s\S]*Do not run target lookup[\s\S]*Do not run `liveChatMessages\.list`[\s\S]*Do not run Azure\/OpenAI provider execution[\s\S]*Do not run UI\/feed confirmation/i,
  "PL-G3 operator-local confirmation doc preserves no-live boundary"
);

assert.match(
  plG4FollowUp,
  /PL-G3 remains blocked-provider-permission-rejected-after-target-present \/ Azure-UI-not-run[\s\S]*blocked-missing-operator-local-confirmation-output/i,
  "PL-G4 follow-up doc reflects PL-G3 remains blocked on missing operator-local confirmation output"
);
assert.match(
  plG5FollowUp,
  /PL-G3 provider-permission state: blocked-provider-permission-rejected-after-target-present \/ Azure-UI-not-run[\s\S]*blocked-missing-operator-local-confirmation-output/i,
  "PL-G5 follow-up doc reflects PL-G3 remains blocked on missing operator-local confirmation output"
);

for (const requiredTaskFragment of [
  "Current branch: `codex/comment-translator-free-beta-pl-g3-operator-local-provider-permission-confirmation-output-after-pr505`",
  "Latest PL-G3 Operator-local Provider-permission Confirmation Record After PR #504",
  "blocked-missing-operator-local-confirmation-output",
  "PL-G3 remains blocked-provider-permission-rejected-after-target-present / Azure-UI-not-run",
  "PL-G4 remains production/custom deployed smoke not-run / approval-gated",
  "PL-G5 remains keep blocked / blocked-no-approval",
  "public gate state label: unchanged / blocked",
  "public-release capable label: no",
  "category / label / pass-fail / unavailableReason",
  "OAuth scope category",
  "target live chat availability",
  "owner/channel binding",
  "provider permission state",
  "quota/rate-limit state",
  "no-live docs/contracts/task follow-up",
  "width checks skipped"
]) {
  assert.match(task, new RegExp(escaped(requiredTaskFragment), "i"), `task.md includes ${requiredTaskFragment}`);
}

for (const forbiddenFragment of [
  "Start: completed",
  "Stop: completed",
  "target lookup: completed",
  "liveChatMessages.list: completed",
  "Azure translation: completed",
  "UI/feed confirmation: completed",
  "production/custom deployed smoke execution: completed",
  "limited public beta open: completed",
  "public launch gate flip: completed",
  "main promotion: completed"
]) {
  assert.doesNotMatch(triageDoc, new RegExp(escaped(forbiddenFragment), "i"), `PL-G3 operator-local confirmation doc excludes ${forbiddenFragment}`);
  assert.doesNotMatch(task, new RegExp(escaped(forbiddenFragment), "i"), `task.md excludes ${forbiddenFragment}`);
}

for (const [label, source] of [
  [triageDocPath, triageDoc],
  [plG4FollowUpPath, plG4FollowUp],
  [plG5FollowUpPath, plG5FollowUp],
  [taskPath, task]
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([
  triageDocPath,
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_COMPLETION_AFTER_PL_G2K.md",
  plG4FollowUpPath,
  plG5FollowUpPath,
  taskPath,
  "scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-polling-sanitized-diagnostics-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-operator-local-provider-permission-confirmation-after-pr504-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-operator-local-provider-permission-confirmation-output-after-pr505-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-provider-permission-readiness-follow-up-after-pl-g5-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-provider-permission-triage-preflight-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-retry-after-pr507-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-retry-after-pr509-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-token-material-availability-after-pr508-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-completion-after-pl-g2k-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-evidence-follow-up-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g4-production-custom-deployed-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g4-production-custom-deployed-smoke-evidence-follow-up-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-evidence-follow-up-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `PL-G3 operator-local confirmation change stays in allowed files: ${file}`);
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log("comment translator Free beta PL-G3 operator-local provider-permission confirmation after PR #504 contract checks passed");
