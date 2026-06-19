import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const foundationPath = "lib/comment-translator-youtube-live-chat-polling-smoke-foundation.ts";
const commandPath = "scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs";
const commandContractPath = "scripts/comment-translator-youtube-live-chat-polling-smoke-command-contract.mjs";
const completionDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_COMPLETION_AFTER_PL_G2K.md";
const readyPreflightPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_READY_PREFLIGHT.md";
const taskPath = "task.md";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
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

for (const requiredPath of [foundationPath, commandPath, commandContractPath, completionDocPath, readyPreflightPath, taskPath]) {
  assert.ok(exists(requiredPath), `PL-G3 polling diagnostics required path exists: ${requiredPath}`);
}

const foundation = read(foundationPath);
const command = read(commandPath);
const commandContract = read(commandContractPath);
const completionDoc = read(completionDocPath);
const readyPreflight = read(readyPreflightPath);
const task = read(taskPath);

assert.match(command, /--approved-live-chat-polling-diagnostics/, "polling command adds explicit diagnostics approval flag");
assert.match(
  command,
  /blocked-conflicting-live-chat-polling-approval-flags/,
  "polling command rejects mixed smoke and diagnostics approval flags"
);
assert.match(
  command,
  /live-chat-polling-diagnostics-sanitized-result/,
  "polling command emits a dedicated sanitized diagnostics status"
);
assert.match(
  command,
  /diagnosticMode:\s*"sanitized-metadata-only"/,
  "polling command records diagnostics as sanitized metadata only"
);
assert.match(
  command,
  /translationExecution:\s*"not-run-diagnostics-only"/,
  "polling diagnostics command does not proceed to translation execution"
);
assert.match(
  command,
  /sanitizeDiagnosticsPayload/,
  "polling diagnostics command sanitizes diagnostics output before writing JSON"
);
assert.match(
  command,
  /delete sanitizedPayload\.credentialReferenceId/,
  "polling diagnostics command omits credential reference values from diagnostics output"
);

assert.match(foundation, /itemTypeDistribution/, "polling foundation returns item type distribution metadata");
assert.match(foundation, /pageInfoTotalResults/, "polling foundation returns pageInfo total result metadata");
assert.match(foundation, /pageInfoResultsPerPage/, "polling foundation returns pageInfo resultsPerPage metadata");
assert.match(foundation, /intakeDiagnosticLabel/, "polling foundation returns empty-intake diagnostic label metadata");
assert.match(foundation, /providerStatusLabel/, "polling foundation returns sanitized provider status label metadata");
assert.match(foundation, /provider-permission-rejected/, "polling foundation maps HTTP 403 to provider-permission-rejected");
assert.match(foundation, /providerErrorReasonLabel/, "polling foundation returns sanitized provider error reason label metadata");
for (const allowedProviderReasonLabel of [
  "provider-error-reason-not-returned",
  "provider-insufficient-permission",
  "provider-live-chat-disabled",
  "provider-live-chat-ended",
  "provider-quota-or-rate-limited",
  "provider-forbidden",
  "provider-error-reason-other"
]) {
  assert.match(foundation, new RegExp(allowedProviderReasonLabel), `polling foundation allowlists ${allowedProviderReasonLabel}`);
  assert.match(commandContract, new RegExp(allowedProviderReasonLabel), `polling command contract covers ${allowedProviderReasonLabel}`);
}
assert.match(foundation, /nextPageToken:\s*"present"\s*\|\s*"absent"/, "polling foundation returns token presence only");
assert.match(foundation, /textPayload:\s*"not-returned-by-design"/, "polling foundation keeps text payload suppressed");
assert.doesNotMatch(
  foundation,
  /displayMessage[\s\S]{0,120}responseMetadata|textMessageDetails[\s\S]{0,120}responseMetadata/,
  "polling metadata does not expose raw message text fields"
);

assert.match(
  commandContract,
  /--approved-live-chat-polling-diagnostics/,
  "polling command contract covers diagnostics approval flag"
);
assert.match(
  commandContract,
  /live-chat-polling-diagnostics-sanitized-result/,
  "polling command contract covers diagnostics sanitized result"
);
assert.match(commandContract, /provider-permission-rejected/, "polling command contract covers HTTP 403 permission rejection label");
assert.match(command, /isProviderOkDiagnosticsPayload/, "polling diagnostics command exits nonzero unless provider status is ok");
assert.match(commandContract, /itemTypeDistribution/, "polling command contract covers item type distribution");
assert.match(commandContract, /pageInfoResultsPerPage/, "polling command contract covers pageInfo resultsPerPage");
assert.match(commandContract, /intakeDiagnosticLabel/, "polling command contract covers intake diagnostic label");

const targetLookupFoundationPath = "lib/comment-translator-youtube-live-chat-target-lookup-foundation.ts";
const targetLookupCommandContractPath = "scripts/comment-translator-youtube-live-chat-target-lookup-command-contract.mjs";
assert.ok(exists(targetLookupFoundationPath), "target lookup foundation exists for selection metadata checks");
assert.ok(exists(targetLookupCommandContractPath), "target lookup command contract exists for selection metadata checks");
const targetLookupFoundation = read(targetLookupFoundationPath);
const targetLookupCommandContract = read(targetLookupCommandContractPath);
assert.match(targetLookupFoundation, /usableTargetCount/, "target lookup foundation returns usable target count");
assert.match(targetLookupFoundation, /selectedTargetSourceLabel/, "target lookup foundation returns sanitized selected target source label");
assert.match(targetLookupFoundation, /selectedTargetRankLabel/, "target lookup foundation returns sanitized selected target rank label");
assert.match(targetLookupFoundation, /lifecycleStatusDistribution/, "target lookup foundation returns lifecycle distribution metadata");
assert.match(targetLookupFoundation, /privacyStatusDistribution/, "target lookup foundation returns privacy distribution metadata");
assert.match(targetLookupCommandContract, /rank-2/, "target lookup contract covers selected target rank without raw target ids");

assert.match(
  readyPreflight,
  /Optional sanitized empty-intake diagnostic follow-up/i,
  "ready preflight documents optional sanitized empty-intake diagnostics"
);
assert.match(
  readyPreflight,
  /--execute --approved-live-chat-polling-diagnostics --json/,
  "ready preflight documents diagnostics command shape"
);
assert.match(
  readyPreflight,
  /not part of the normal FB-L4 Start-to-translation smoke/i,
  "ready preflight keeps diagnostics outside normal FB-L4 smoke"
);
assert.match(
  completionDoc,
  /sanitized polling diagnostic helper/i,
  "PL-G3 completion doc records diagnostics helper follow-up"
);
assert.match(
  completionDoc,
  /live-chat-polling-diagnostics-sanitized-result/i,
  "PL-G3 completion doc records diagnostics sanitized status"
);
assert.match(
  completionDoc,
  /HTTP 403[\s\S]*provider permission rejected[\s\S]*provider error reason\/class label[\s\S]*owner binding verified[\s\S]*token material available[\s\S]*target lookup present[\s\S]*Azure-UI-not-run[\s\S]*public-release capable no/i,
  "PL-G3 completion doc records current 403 provider permission blocker"
);
assert.match(
  completionDoc,
  /confirm granted OAuth scope category[\s\S]*target live chat availability[\s\S]*owner\/channel binding[\s\S]*provider permission state/i,
  "PL-G3 completion doc records value-free operator checks for the 403 blocker"
);
assert.match(
  completionDoc,
  /selected target rank label[\s\S]*usable target count[\s\S]*lifecycle\/privacy distribution/i,
  "PL-G3 completion doc records sanitized target selection metadata follow-up"
);
assert.match(
  task,
  /codex\/comment-translator-free-beta-pl-g3-(?:polling-(?:sanitized-diagnostics|diagnostics-output-sanitization|403-target-selection-diagnostics|403-reason-labels|empty-intake-diagnostics-after-pr511)|empty-intake-polling-diagnostics-read-after-pr512|next-page-target-selection-follow-up-after-pr513|target-selection-diagnostics-after-pr514)/i,
  "task.md records diagnostics branch"
);
assert.match(
  task,
  /sanitized polling diagnostic helper|sanitized provider error reason\/class labels/i,
  "task.md records sanitized diagnostics helper"
);
assert.match(
  task,
  /HTTP 403[\s\S]*owner binding verified[\s\S]*token material available[\s\S]*target lookup present[\s\S]*`?liveChatMessages\.list`? provider permission rejected[\s\S]*provider error reason\/class label[\s\S]*Azure-UI-not-run[\s\S]*public-release capable no/i,
  "task.md records current PL-G3 403 provider permission blocker"
);
assert.match(
  task,
  /confirm granted OAuth scope category[\s\S]*target live chat availability[\s\S]*owner\/channel binding[\s\S]*provider permission state/i,
  "task.md records value-free operator checks for the 403 blocker"
);

for (const [label, source] of [
  [foundationPath, foundation],
  [commandPath, command],
  [commandContractPath, commandContract],
  [completionDocPath, completionDoc],
  [readyPreflightPath, readyPreflight],
  [targetLookupFoundationPath, targetLookupFoundation],
  [targetLookupCommandContractPath, targetLookupCommandContract],
  [taskPath, task]
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([
  foundationPath,
  commandPath,
  commandContractPath,
  targetLookupFoundationPath,
  targetLookupCommandContractPath,
  completionDocPath,
  readyPreflightPath,
  taskPath,
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G4_PRODUCTION_CUSTOM_DEPLOYED_SMOKE_EVIDENCE_FOLLOW_UP.md",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION_EVIDENCE_FOLLOW_UP_AFTER_PL_G4.md",
  "scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g2k-approved-route-api-harness-smoke-execution-after-pl-g2j-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-polling-sanitized-diagnostics-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-polling-empty-intake-diagnostics-after-pr511-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-empty-intake-polling-diagnostics-read-after-pr512-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-next-page-target-selection-follow-up-after-pr513-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-target-selection-diagnostics-after-pr514-contract.mjs",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_PROVIDER_PERMISSION_TRIAGE_PREFLIGHT.md",
  "scripts/comment-translator-free-beta-pl-g3-operator-local-provider-permission-confirmation-after-pr504-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-operator-local-provider-permission-confirmation-output-after-pr505-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-provider-permission-readiness-follow-up-after-pl-g5-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-provider-permission-triage-preflight-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-retry-after-pr507-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-retry-after-pr509-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-rerun-fresh-chat-after-pr510-contract.mjs",
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
  assert.ok(allowedChangedFiles.has(file), `PL-G3 polling diagnostics change stays in allowed files: ${file}`);
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log("comment translator Free beta PL-G3 polling sanitized diagnostics contract checks passed");
