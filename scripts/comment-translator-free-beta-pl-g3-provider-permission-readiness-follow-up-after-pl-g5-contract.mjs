import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const triageDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_PROVIDER_PERMISSION_TRIAGE_PREFLIGHT.md";
const completionDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_COMPLETION_AFTER_PL_G2K.md";
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

for (const requiredPath of [triageDocPath, completionDocPath, plG4FollowUpPath, plG5FollowUpPath, taskPath]) {
  assert.ok(exists(requiredPath), `PL-G3 provider-permission readiness follow-up required path exists: ${requiredPath}`);
}

const triageDoc = read(triageDocPath);
const completionDoc = read(completionDocPath);
const plG4FollowUp = read(plG4FollowUpPath);
const plG5FollowUp = read(plG5FollowUpPath);
const task = read(taskPath);

for (const requiredSection of [
  "## Purpose",
  "## Current Sanitized Blocker",
  "## No-live Execution Boundary",
  "## Operator-local Value-free Checklist",
  "## Provider Error Reason Label Mapping",
  "## Pass Semantics",
  "## Forbidden Output And Documentation",
  "## Next Safe Action",
  "## Completion Verification"
]) {
  assert.match(triageDoc, new RegExp(`^${escaped(requiredSection)}$`, "m"), `readiness follow-up doc includes ${requiredSection}`);
}

for (const requiredFragment of [
  "PL-G3 provider-permission readiness follow-up after PL-G5",
  "PR #502",
  "no-live-execution docs/contracts/task only follow-up",
  "value-free operator-local readiness confirmations",
  "OAuth scope category",
  "target live chat availability",
  "owner/channel binding",
  "provider permission state",
  "quota/rate-limit state",
  "category / label / pass-fail / unavailableReason",
  "PL-G3 state: blocked-provider-permission-rejected-after-target-present",
  "Azure-UI-not-run",
  "public gate state label: unchanged / blocked",
  "public-release capable label: no",
  "actual provider retry",
  "Start-to-translation smoke completion",
  "exact approval PL-G3 retry",
  "Public access change",
  "limited public beta open",
  "public launch gate flip",
  "main promotion",
  "separate reviewed operation"
]) {
  assert.match(triageDoc, new RegExp(escaped(requiredFragment), "i"), `readiness follow-up doc includes ${requiredFragment}`);
}

assert.match(
  triageDoc,
  /OAuth scope category[\s\S]*target live chat availability[\s\S]*owner\/channel binding[\s\S]*provider permission state[\s\S]*quota\/rate-limit state/i,
  "readiness follow-up doc orders the required operator-local confirmations"
);
assert.match(
  triageDoc,
  /The checklist output is limited to category \/ label \/ pass-fail \/ unavailableReason/i,
  "readiness follow-up doc keeps output shape value-free"
);
assert.match(
  triageDoc,
  /Do not run Start[\s\S]*Do not run Stop[\s\S]*Do not run target lookup[\s\S]*Do not run `liveChatMessages\.list`[\s\S]*Do not run Azure\/OpenAI provider execution[\s\S]*Do not run UI\/feed confirmation/i,
  "readiness follow-up doc preserves no-live execution boundary"
);
assert.match(
  triageDoc,
  /Do not request, print, store, or document[\s\S]*raw provider body[\s\S]*raw provider message[\s\S]*raw provider reason[\s\S]*IDs[\s\S]*tokens[\s\S]*cookies[\s\S]*provider target metadata[\s\S]*`liveChatId`/i,
  "readiness follow-up doc forbids raw provider and private values"
);

for (const requiredTaskFragment of [
  "Current branch: `codex/comment-translator-free-beta-pl-g3-provider-permission-readiness-follow-up-after-pl-g5`",
  "Latest PL-G3 Provider-permission Readiness Follow-up After PL-G5",
  "PR #502",
  "PL-G3 remains blocked-provider-permission-rejected-after-target-present / Azure-UI-not-run",
  "PL-G4 remains production/custom deployed smoke not-run / approval-gated",
  "PL-G5 remains keep blocked / blocked-no-approval",
  "public gate state label: unchanged / blocked",
  "public-release capable label: no",
  "OAuth scope category",
  "target live chat availability",
  "owner/channel binding",
  "provider permission state",
  "quota/rate-limit state",
  "category / label / pass-fail / unavailableReason",
  "no-live docs/contracts/task follow-up",
  "width checks skipped"
]) {
  assert.match(task, new RegExp(escaped(requiredTaskFragment), "i"), `task.md includes ${requiredTaskFragment}`);
}

assert.match(
  completionDoc,
  /provider-permission readiness follow-up after PL-G5/i,
  "PL-G3 completion doc points to after-PL-G5 provider-permission readiness follow-up"
);
assert.match(
  plG4FollowUp,
  /blocked-provider-permission-rejected-after-target-present \/ Azure-UI-not-run[\s\S]*cannot prove production\/custom deployed smoke readiness without exact same-thread approval and sanitized output review/i,
  "PL-G4 follow-up doc keeps the provider-permission blocker and deployed-smoke approval gate"
);
assert.match(
  plG5FollowUp,
  /PL-G3 provider-permission state: blocked-provider-permission-rejected-after-target-present \/ Azure-UI-not-run[\s\S]*Production\/custom deployed smoke execution remains not-run \/ approval-gated/i,
  "PL-G5 follow-up doc keeps the PL-G3/PL-G4 blocked public launch state"
);

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
  assert.doesNotMatch(triageDoc, new RegExp(escaped(forbiddenFragment), "i"), `readiness follow-up doc excludes ${forbiddenFragment}`);
  assert.doesNotMatch(task, new RegExp(escaped(forbiddenFragment), "i"), `task.md excludes ${forbiddenFragment}`);
}

for (const [label, source] of [
  [triageDocPath, triageDoc],
  [completionDocPath, completionDoc],
  [plG4FollowUpPath, plG4FollowUp],
  [plG5FollowUpPath, plG5FollowUp],
  [taskPath, task]
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([
  triageDocPath,
  completionDocPath,
  plG4FollowUpPath,
  plG5FollowUpPath,
  taskPath,
  "scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-polling-sanitized-diagnostics-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-provider-permission-readiness-follow-up-after-pl-g5-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-provider-permission-triage-preflight-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-completion-after-pl-g2k-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-evidence-follow-up-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g4-production-custom-deployed-smoke-evidence-follow-up-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-evidence-follow-up-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `PL-G3 provider-permission readiness follow-up change stays in allowed files: ${file}`);
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log("comment translator Free beta PL-G3 provider-permission readiness follow-up after PL-G5 contract checks passed");
