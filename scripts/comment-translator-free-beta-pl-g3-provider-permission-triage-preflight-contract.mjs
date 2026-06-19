import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const triageDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_PROVIDER_PERMISSION_TRIAGE_PREFLIGHT.md";
const completionDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_COMPLETION_AFTER_PL_G2K.md";
const readyPreflightPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_READY_PREFLIGHT.md";
const pollingDiagnosticsContractPath =
  "scripts/comment-translator-free-beta-pl-g3-polling-sanitized-diagnostics-contract.mjs";
const taskPath = "task.md";

const allowedProviderReasonLabels = [
  "provider-error-reason-not-returned",
  "provider-insufficient-permission",
  "provider-live-chat-disabled",
  "provider-live-chat-ended",
  "provider-quota-or-rate-limited",
  "provider-forbidden",
  "provider-error-reason-other"
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
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|\bAuthorization\s*[:=]\s*["'](?!server-only-test-authorization["'])[^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'](?!present["'])[^"']+|SERVICE_ROLE_KEY\s*[:=]\s*["'](?!present["'])[^"']+|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'](?!(?:server-only-live-chat-target-reference|server-only-live-target-never-output|live-chat-id-never-returned)["'])[^"']+|providerChannelId\s*[:=]\s*["'](?!(?:server-only-channel-reference|provider-channel-reference-never-returned|different-provider-channel-reference-never-returned)["'])[^"']+|ownerUserId\s*[:=]\s*["'](?!(?:server-only-owner-reference|owner-reference-never-returned)["'])[^"']+|providerTargetMetadata\s*[:=]\s*["'](?!forbidden["'])[^"']+|raw(?:Provider|Error|Response|Message|Reason|Comment)(?:Body|Payload|Message|Reason|Text|s|Value)?\s*[:=]\s*["'](?!not-requested-not-documented|not-returned-by-design|never-recorded-by-design|never-returned-by-design|forbidden)[^"']+/i,
    `${label} does not contain secret values, token values, authorization values, private provider identifiers, live target values, or raw provider/comment values`
  );
}

for (const requiredPath of [
  triageDocPath,
  completionDocPath,
  readyPreflightPath,
  pollingDiagnosticsContractPath,
  taskPath
]) {
  assert.ok(exists(requiredPath), `PL-G3 provider-permission triage required path exists: ${requiredPath}`);
}

const triageDoc = read(triageDocPath);
const completionDoc = read(completionDocPath);
const readyPreflight = read(readyPreflightPath);
const pollingDiagnosticsContract = read(pollingDiagnosticsContractPath);
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
  assert.match(triageDoc, new RegExp(`^${escaped(requiredSection)}$`, "m"), `triage doc includes ${requiredSection}`);
}

for (const requiredFragment of [
  "Status: PL-G3 provider-permission triage preflight",
  "Public-release capable: no",
  "Execution result: blocked-provider-permission-rejected-after-target-present",
  "HTTP 403",
  "provider status label `provider-permission-rejected`",
  "target presence label present",
  "provider route label `liveChatMessages-list-one-step-only`",
  "returned count 0",
  "pass false",
  "not an empty-intake proof",
  "not token expiry",
  "not target absence",
  "no-live-execution docs/contracts/task only",
  "Do not run Start",
  "Do not run Stop",
  "Do not run target lookup",
  "Do not run `liveChatMessages.list`",
  "Do not run Azure/OpenAI provider execution",
  "Do not run UI/feed confirmation",
  "granted OAuth scope category",
  "target live chat availability",
  "owner/channel binding",
  "provider permission state",
  "quota/rate-limit state",
  "generic forbidden",
  "reason-not-returned",
  "operator-local context only",
  "public gate state label: unchanged / blocked",
  "public-release capable label: no"
]) {
  assert.match(triageDoc, new RegExp(escaped(requiredFragment), "i"), `triage doc includes ${requiredFragment}`);
}

for (const allowedProviderReasonLabel of allowedProviderReasonLabels) {
  assert.match(triageDoc, new RegExp(allowedProviderReasonLabel), `triage doc includes ${allowedProviderReasonLabel}`);
  assert.match(
    pollingDiagnosticsContract,
    new RegExp(allowedProviderReasonLabel),
    `polling diagnostics contract still covers ${allowedProviderReasonLabel}`
  );
}

assert.match(
  triageDoc,
  /PL-G3 remains blocked unless a later same-thread approved live\/provider run returns HTTP 2xx \/ `provider-ok`, non-empty intake, Free Azure translation, and UI\/feed evidence/i,
  "triage doc keeps pass semantics unchanged"
);
assert.match(
  triageDoc,
  /raw provider body[\s\S]*raw provider message[\s\S]*raw provider reason[\s\S]*IDs[\s\S]*tokens[\s\S]*cookies[\s\S]*liveChatId/i,
  "triage doc forbids raw provider/body/message/reason and private values"
);
assert.match(
  triageDoc,
  /The checklist requests categories, labels, and pass\/fail states only; it must not request or document actual values/i,
  "triage doc keeps checklist value-free"
);

assert.match(
  completionDoc,
  /provider-permission triage preflight/i,
  "PL-G3 completion doc points to provider-permission triage preflight"
);
assert.match(
  readyPreflight,
  /provider-permission triage preflight/i,
  "FB-L4 ready preflight points to provider-permission triage preflight"
);
assert.match(
  task,
  /Current branch: `codex\/comment-translator-free-beta-(?:pl-g3-provider-permission-(?:triage-preflight|readiness-follow-up-after-pl-g5|readiness-confirmation-after-pr503)|pl-g3-operator-local-provider-permission-confirmation-after-pr504)`/i,
  "task.md records provider-permission triage branch"
);
assert.match(task, /Latest PL-G3 Provider-permission Triage Preflight/i, "task.md records latest triage section");
assert.match(task, /blocked-provider-permission-rejected-after-target-present/i, "task.md records current 403 blocker");
assert.match(
  task,
  /granted OAuth scope category[\s\S]*target live chat availability[\s\S]*owner\/channel binding[\s\S]*provider permission state[\s\S]*quota\/rate-limit state/i,
  "task.md records value-free triage checklist"
);
assert.match(
  task,
  /provider-error-reason-not-returned[\s\S]*provider-insufficient-permission[\s\S]*provider-live-chat-disabled[\s\S]*provider-live-chat-ended[\s\S]*provider-quota-or-rate-limited[\s\S]*provider-forbidden[\s\S]*provider-error-reason-other/i,
  "task.md records provider error reason allowlist"
);
assert.match(task, /raw provider body[\s\S]*raw provider message[\s\S]*raw provider reason/i, "task.md forbids raw provider error data");
assert.match(task, /width checks skipped[\s\S]*no visible UI\/CSS\/layout\/copy change/i, "task.md records width-check skip reason");
assert.match(task, /public gate state label: unchanged \/ blocked/i, "task.md keeps public gate blocked");
assert.match(task, /public-release capable label: no/i, "task.md keeps public-release capable no");

for (const forbiddenFragment of [
  "Start: completed",
  "Stop: completed",
  "target lookup: completed",
  "liveChatMessages.list: completed",
  "Azure translation: completed",
  "UI/feed confirmation: completed",
  "public launch gate flip: completed",
  "public access change: completed"
]) {
  assert.doesNotMatch(triageDoc, new RegExp(escaped(forbiddenFragment), "i"), `triage doc excludes ${forbiddenFragment}`);
  assert.doesNotMatch(task, new RegExp(escaped(forbiddenFragment), "i"), `task.md excludes ${forbiddenFragment}`);
}

for (const [label, source] of [
  [triageDocPath, triageDoc],
  [completionDocPath, completionDoc],
  [readyPreflightPath, readyPreflight],
  [pollingDiagnosticsContractPath, pollingDiagnosticsContract],
  [taskPath, task]
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([
  triageDocPath,
  completionDocPath,
  readyPreflightPath,
  taskPath,
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G4_PRODUCTION_CUSTOM_DEPLOYED_SMOKE_EVIDENCE_FOLLOW_UP.md",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION_EVIDENCE_FOLLOW_UP_AFTER_PL_G4.md",
  "scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g2k-approved-route-api-harness-smoke-execution-after-pl-g2j-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-polling-sanitized-diagnostics-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-operator-local-provider-permission-confirmation-after-pr504-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-operator-local-provider-permission-confirmation-output-after-pr505-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-provider-permission-readiness-follow-up-after-pl-g5-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-provider-permission-triage-preflight-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-completion-after-pl-g2k-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-evidence-follow-up-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g4-production-custom-deployed-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g4-production-custom-deployed-smoke-evidence-follow-up-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-evidence-follow-up-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `PL-G3 provider-permission triage change stays in allowed files: ${file}`);
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log("comment translator Free beta PL-G3 provider-permission triage preflight contract checks passed");
