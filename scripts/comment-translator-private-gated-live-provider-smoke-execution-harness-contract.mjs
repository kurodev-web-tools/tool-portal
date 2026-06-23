import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const foundationPath = "lib/comment-translator-private-gated-live-provider-smoke-execution-harness.ts";
const commandPath = "scripts/comment-translator-private-gated-live-provider-smoke-execution-harness.mjs";
const taskPath = "task.md";
const readinessDocPath = "docs/active/COMMENT_TRANSLATOR_PRIVATE_GATED_LIVE_PROVIDER_SMOKE_READINESS.md";
const boundedPollingSessionPath = "lib/comment-translator-youtube-bounded-polling-session-runtime.ts";
const usageLedgerPath = "lib/comment-translator-usage-ledger-runtime.ts";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function loadTsModule(relativePath) {
  const sourcePath = path.join(root, relativePath);
  const moduleCache = new Map();
  const originalLoad = Module._load;

  function compileTsModule(modulePath) {
    const normalizedModulePath = path.normalize(modulePath);
    if (moduleCache.has(normalizedModulePath)) {
      return moduleCache.get(normalizedModulePath).exports;
    }

    const source = fs.readFileSync(normalizedModulePath, "utf8");
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022
      }
    }).outputText;
    const testModule = new Module(normalizedModulePath);
    moduleCache.set(normalizedModulePath, testModule);
    testModule.filename = normalizedModulePath;
    testModule.paths = Module._nodeModulePaths(path.dirname(normalizedModulePath));
    testModule._compile(compiled, normalizedModulePath);
    return testModule.exports;
  }

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "server-only") {
      return {};
    }

    if (request.startsWith(".") && parent?.filename) {
      const candidate = path.resolve(path.dirname(parent.filename), `${request}.ts`);
      if (fs.existsSync(candidate)) {
        return compileTsModule(candidate);
      }
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return compileTsModule(sourcePath);
  } finally {
    Module._load = originalLoad;
  }
}

function commandEnv(overrides = {}) {
  return {
    Path: process.env.Path ?? process.env.PATH ?? "",
    PATH: process.env.PATH ?? process.env.Path ?? "",
    SystemRoot: process.env.SystemRoot ?? "",
    WINDIR: process.env.WINDIR ?? "",
    TEMP: process.env.TEMP ?? "",
    TMP: process.env.TMP ?? "",
    ...overrides
  };
}

function runCommand(args, env = commandEnv()) {
  return spawnSync(process.execPath, [commandPath, ...args], {
    cwd: root,
    encoding: "utf8",
    env
  });
}

function parseJson(stdout) {
  assert.ok(stdout.trim().length > 0, "command writes JSON");
  return JSON.parse(stdout);
}

assert.ok(exists(foundationPath), "Task 27 live/provider smoke execution harness foundation exists");
assert.ok(exists(commandPath), "Task 27 live/provider smoke execution harness command exists");
assert.ok(exists(boundedPollingSessionPath), "bounded polling session runtime exists for stop behavior evidence");
assert.ok(exists(usageLedgerPath), "usage quota budget ledger runtime exists for quota/budget stop evidence");

const foundationSource = read(foundationPath);
const commandSource = read(commandPath);
const taskSource = read(taskPath);
const readinessDoc = read(readinessDocPath);
const boundedPollingSessionSource = read(boundedPollingSessionPath);
const usageLedgerSource = read(usageLedgerPath);

assert.match(foundationSource, /^import "server-only";/m, "harness foundation is server-only");
assert.match(commandSource, /--approved-private-gated-live-provider-smoke/, "command requires explicit Task 27 approval flag");
assert.match(commandSource, /--print-exact-command-review/, "command can print sanitized exact-command review output");
assert.match(
  commandSource,
  /--operator-local-ready-preflight-reviewed/,
  "command requires ready preflight review before operator-local adapter execution"
);
assert.match(
  foundationSource,
  /createCommentTranslatorPrivateGatedLiveProviderSmokeOperatorLocalAdapters/,
  "harness exposes operator-local adapter wiring"
);
assert.match(
  commandSource,
  /createCommentTranslatorPrivateGatedLiveProviderSmokeOperatorLocalAdapters/,
  "command wires the approved path through operator-local adapters"
);
assert.match(
  commandSource,
  /createOperatorLocalRuntimeAdapterExecutionPayload/,
  "command can execute approved operator-local runtime adapters"
);
assert.match(
  commandSource,
  /runTask27OperatorLocalLiveChatPollingForTranslation/,
  "command keeps live comment text server-only for translation execution"
);
assert.match(
  commandSource,
  /serverOnlyLiveChatId/,
  "command carries the target lookup liveChatId server-only into polling"
);
assert.match(
  commandSource,
  /readServerOnlyLiveChatIdFromTargetLookupBody/,
  "command extracts liveChatId only inside the server-only operator-local harness"
);
assert.match(
  commandSource,
  /executeCommentTranslatorProviderPolicyBatch/,
  "command connects approved live comments to the provider execution runtime"
);
assert.doesNotMatch(
  commandSource,
  /blocked-actual-operator-local-runtime-adapters-not-run-in-this-pr/,
  "approved operator-local runtime adapter path is no longer a placeholder blocker"
);
assert.match(taskSource, /execution harness/i, "task.md records execution harness PR scope");
assert.match(readinessDoc, /execution harness/i, "readiness doc records execution harness availability");
assert.match(
  boundedPollingSessionSource,
  /terminalStopStates:\s*\["liveChatEnded",\s*"liveChatDisabled",\s*"liveChatNotFound",\s*"owner-verification-failed"\]/,
  "bounded polling runtime records terminal stop behavior"
);
assert.match(
  boundedPollingSessionSource,
  /stopReason:\s*"terminal-provider-error"/,
  "bounded polling runtime maps retry cap to sanitized terminal-provider-error stop reason"
);
assert.match(usageLedgerSource, /"quota-budget-stop-event"/, "usage ledger records quota/budget stop events");
for (const stopReason of [
  "provider-quota-stop",
  "global-budget-stop",
  "ai-budget-stop",
  "translated-message-cap"
]) {
  assert.match(usageLedgerSource, new RegExp(stopReason), `usage ledger supports ${stopReason}`);
}

const foundation = loadTsModule(foundationPath);
assert.deepEqual(
  foundation.commentTranslatorPrivateGatedLiveProviderSmokeExecutionHarnessContract,
  {
    implementationStage: "task-27-private-gated-live-provider-smoke-execution-harness",
    runtime: "server-only",
    commandPath,
    outputPolicy: "sanitized-metadata-only",
    providerTargetLookup: "approval-gated-same-command-process",
    liveChatPolling: "approval-gated-bounded-one-step",
    translatorPipelineWiring: "implemented-sanitized-summary-only",
    providerTranslationExecution: "approval-gated-operator-local-server-only-provider",
    evidence: "counts-status-stop-reasons-only",
    browserStorage: "unchanged",
    handoffPayload: "unchanged"
  },
  "harness contract fixes Task 27 execution boundary"
);

const missingEnv = runCommand(["--check-env-only"]);
assert.equal(missingEnv.status, 2, "command blocks without operator-local references");
const missingEnvPayload = parseJson(missingEnv.stdout);
assert.equal(missingEnvPayload.status, "blocked-missing-execution-harness-references");
assert.equal(missingEnvPayload.liveProviderExecution, "not-run");
assert.equal(missingEnvPayload.providerTargetLookup, "not-run");
assert.equal(missingEnvPayload.liveChatPollingSmoke, "not-run");
assert.equal(missingEnvPayload.translationProviderExecution, "not-run");
assert.equal(missingEnvPayload.outputPolicy, "sanitized-metadata-only");

const readyEnv = commandEnv({
  NEXT_PUBLIC_SUPABASE_URL: "present",
  SUPABASE_SERVICE_ROLE_KEY: "present",
  YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED: "false",
  YOUTUBE_OAUTH_SMOKE_CREDENTIAL_REFERENCE_ID: "smoke-task27-execution-harness",
  YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID: "present",
  YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID: "present",
  YOUTUBE_LIVE_RUNTIME_SMOKE_OWNER_AUTHORIZATION_CONFIRMED: "confirmed",
  YOUTUBE_OWNER_VERIFICATION_SMOKE_SUCCESS_CONFIRMED: "confirmed",
  YOUTUBE_LIVE_CHAT_TARGET_LOOKUP_READY_PREFLIGHT_CONFIRMED: "confirmed",
  YOUTUBE_LIVE_CHAT_TARGET_LOOKUP_PRESENCE_ONLY_EVIDENCE_CONFIRMED: "confirmed",
  YOUTUBE_LIVE_CHAT_POLLING_SMOKE_READY_PREFLIGHT_CONFIRMED: "confirmed",
  YOUTUBE_LIVE_CHAT_POLLING_SMOKE_TARGET_METADATA_PRESENT: "confirmed",
  YOUTUBE_LIVE_CHAT_POLLING_SMOKE_LIVE_CHAT_ID: "present",
  COMMENT_TRANSLATOR_TASK27_TRANSLATION_PROVIDER_READY_PREFLIGHT_CONFIRMED: "confirmed",
  COMMENT_TRANSLATOR_TASK27_SANITIZED_OUTPUT_REVIEW_CONFIRMED: "confirmed"
});

const readyPreflight = runCommand(["--check-env-only"], readyEnv);
assert.equal(readyPreflight.status, 0, "ready preflight succeeds without provider execution");
const readyPayload = parseJson(readyPreflight.stdout);
assert.equal(readyPayload.status, "ready-for-task-27-approved-live-provider-smoke-execution-harness");
assert.equal(readyPayload.liveProviderExecution, "not-run-preflight-only");
assert.equal(readyPayload.translatorPipelineWiring, "implemented-sanitized-summary-only");
assert.equal(readyPayload.requiredFlag, "--execute --approved-private-gated-live-provider-smoke");

const exactCommandReview = runCommand(["--print-exact-command-review"], readyEnv);
assert.equal(exactCommandReview.status, 0, "exact command review output is available without provider execution");
const exactCommandReviewPayload = parseJson(exactCommandReview.stdout);
assert.equal(exactCommandReviewPayload.status, "ready-for-task-27-exact-command-review");
assert.equal(exactCommandReviewPayload.liveProviderExecution, "not-run-exact-command-review-only");
assert.equal(
  exactCommandReviewPayload.exactCommand,
  "node scripts/comment-translator-private-gated-live-provider-smoke-execution-harness.mjs --execute --approved-private-gated-live-provider-smoke --use-operator-local-runtime-adapters --operator-local-ready-preflight-reviewed"
);
assert.equal(exactCommandReviewPayload.requiredHumanApproval, "explicit-in-thread-approval-for-exact-command");
assert.equal(exactCommandReviewPayload.evidenceDestination, "sanitized-output-review-only-no-private-values");

const blockedExecute = runCommand(["--execute"], readyEnv);
assert.equal(blockedExecute.status, 2, "execute without approval is blocked");
const blockedExecutePayload = parseJson(blockedExecute.stdout);
assert.equal(blockedExecutePayload.status, "blocked-pending-explicit-private-gated-live-provider-smoke-approval");
assert.equal(blockedExecutePayload.liveProviderExecution, "not-run");

const blockedMissingReviewFlag = runCommand(
  ["--execute", "--approved-private-gated-live-provider-smoke", "--use-operator-local-runtime-adapters"],
  readyEnv
);
assert.equal(blockedMissingReviewFlag.status, 2, "operator-local adapter execution requires ready preflight review flag");
const blockedMissingReviewFlagPayload = parseJson(blockedMissingReviewFlag.stdout);
assert.equal(blockedMissingReviewFlagPayload.status, "blocked-pending-operator-local-ready-preflight-review-flag");
assert.equal(blockedMissingReviewFlagPayload.requiredFlag, "--operator-local-ready-preflight-reviewed");
assert.equal(blockedMissingReviewFlagPayload.liveProviderExecution, "not-run");

const approvedOperatorLocalWithoutRuntimeMaterial = runCommand(
  [
    "--execute",
    "--approved-private-gated-live-provider-smoke",
    "--use-operator-local-runtime-adapters",
    "--operator-local-ready-preflight-reviewed"
  ],
  readyEnv
);
assert.equal(
  approvedOperatorLocalWithoutRuntimeMaterial.status,
  2,
  "approved operator-local runtime path blocks safely without runtime token material"
);
const approvedOperatorLocalWithoutRuntimeMaterialPayload = parseJson(approvedOperatorLocalWithoutRuntimeMaterial.stdout);
assert.equal(
  approvedOperatorLocalWithoutRuntimeMaterialPayload.status,
  "blocked-target-lookup-sanitized",
  "approved operator-local runtime path reaches sanitized target lookup boundary"
);
assert.equal(approvedOperatorLocalWithoutRuntimeMaterialPayload.liveProviderExecution, "not-run");
assert.equal(approvedOperatorLocalWithoutRuntimeMaterialPayload.rawCommentText, "never-returned-by-design");

const approvedWithSandboxedAdapters = runCommand(
  ["--execute", "--approved-private-gated-live-provider-smoke", "--use-sandboxed-adapters-for-contract"],
  readyEnv
);
assert.equal(approvedWithSandboxedAdapters.status, 0, "approved sandboxed adapter path produces sanitized evidence");
const approvedSandboxedPayload = parseJson(approvedWithSandboxedAdapters.stdout);
assert.equal(approvedSandboxedPayload.status, "task-27-live-provider-smoke-sanitized-result");
assert.equal(approvedSandboxedPayload.liveProviderExecution, "approved-bounded-execution");
assert.equal(approvedSandboxedPayload.evidence.providerTargetLookup, "executed-presence-only");
assert.equal(approvedSandboxedPayload.evidence.liveChatPollingSmoke, "executed-bounded-readonly-one-step");
assert.equal(approvedSandboxedPayload.evidence.translationProviderExecution, "executed-server-only-provider");
assert.equal(approvedSandboxedPayload.rawCommentText, "never-returned-by-design");

const adapterHarnessResult =
  await foundation.runCommentTranslatorPrivateGatedLiveProviderSmokeExecutionHarnessWithOperatorLocalAdapters({
    credentialReferenceId: "smoke-task27-execution-harness",
    providerTargetLookupReady: true,
    liveChatTargetPresent: true,
    liveChatPollingReady: true,
    translationProviderReady: true,
    sanitizedOutputReviewConfirmed: true,
    explicitApprovalConfirmed: true,
    adapters: foundation.createCommentTranslatorPrivateGatedLiveProviderSmokeOperatorLocalAdapters({
      targetLookup: async () => ({
        status: "live-chat-target-lookup-sanitized-result",
        liveChatTarget: "present",
        liveChatTargetLookup: "executed-bounded-readonly-one-step",
        responseMetadata: {
          returnedItemCount: 1
        }
      }),
      pollLiveChatOnce: async () => ({
        status: "live-chat-polling-smoke-sanitized-result",
        liveChatPollingSmoke: "executed-bounded-readonly-one-step",
        responseMetadata: {
          returnedItemCount: 2
        }
      }),
      translateEligibleComments: async () => ({
        status: "completed",
        providerRequestCount: 1,
        providerCallCount: 1,
        translatedCount: 1,
        skippedCount: 0,
        skipsByReason: {
          languagePolicy: 0,
          perMinuteCap: 0,
          providerUnavailable: 0
        },
        errorCounts: {
          recoverable: 0,
          terminal: 0
        },
        terminalErrorCodeCounts: {
          invalidRequest: 0,
          unsupportedLanguage: 0,
          providerNotConfigured: 0,
          credentialMissing: 0,
          policyBlocked: 0
        }
      })
    })
  });

assert.equal(adapterHarnessResult.status, "task-27-live-provider-smoke-sanitized-result");
assert.equal(adapterHarnessResult.evidence.returnedItemCount, 2);
assert.equal(adapterHarnessResult.evidence.eligibleCommentCount, 2);
assert.equal(adapterHarnessResult.evidence.providerRequestCount, 1);
assert.equal(adapterHarnessResult.evidence.providerCallCount, 1);
assert.equal(adapterHarnessResult.evidence.languagePolicySkippedCount, 0);
assert.equal(adapterHarnessResult.evidence.perMinuteSkippedCount, 0);
assert.equal(adapterHarnessResult.evidence.providerUnavailableSkippedCount, 0);
assert.equal(adapterHarnessResult.evidence.recoverableErrorCount, 0);
assert.equal(adapterHarnessResult.evidence.terminalErrorCount, 0);

const labelProjectedTargetLookupHarnessResult =
  await foundation.runCommentTranslatorPrivateGatedLiveProviderSmokeExecutionHarnessWithOperatorLocalAdapters({
    credentialReferenceId: "smoke-task27-execution-harness",
    providerTargetLookupReady: true,
    liveChatTargetPresent: true,
    liveChatPollingReady: true,
    translationProviderReady: true,
    sanitizedOutputReviewConfirmed: true,
    explicitApprovalConfirmed: true,
    adapters: foundation.createCommentTranslatorPrivateGatedLiveProviderSmokeOperatorLocalAdapters({
      targetLookup: async () => ({
        statusLabel: "live-chat-target-lookup-sanitized-result",
        liveChatTargetLabel: "present",
        liveChatTargetLookupLabel: "executed-bounded-readonly-one-step",
        targetLookupProviderAccessLabel: "liveBroadcasts-list-target-lookup-only"
      }),
      pollLiveChatOnce: async () => ({
        status: "live-chat-polling-smoke-sanitized-result",
        liveChatPollingSmoke: "executed-bounded-readonly-one-step",
        responseMetadata: {
          returnedItemCount: 1,
          eligibleCommentCount: 1
        }
      }),
      translateEligibleComments: async () => ({
        status: "completed",
        providerRequestCount: 1,
        providerCallCount: 1,
        translatedCount: 1,
        skippedCount: 0,
        skipsByReason: {
          languagePolicy: 0,
          perMinuteCap: 0,
          providerUnavailable: 0
        },
        errorCounts: {
          recoverable: 0,
          terminal: 0
        },
        terminalErrorCodeCounts: {
          invalidRequest: 0,
          unsupportedLanguage: 0,
          providerNotConfigured: 0,
          credentialMissing: 0,
          policyBlocked: 0
        }
      })
    })
  });

assert.equal(
  labelProjectedTargetLookupHarnessResult.status,
  "task-27-live-provider-smoke-sanitized-result",
  "operator-local target lookup adapter accepts reviewed label-projected target presence evidence"
);
assert.equal(labelProjectedTargetLookupHarnessResult.evidence.providerTargetLookup, "executed-presence-only");

const emptyPollingHarnessResult =
  await foundation.runCommentTranslatorPrivateGatedLiveProviderSmokeExecutionHarnessWithOperatorLocalAdapters({
    credentialReferenceId: "smoke-task27-execution-harness",
    providerTargetLookupReady: true,
    liveChatTargetPresent: true,
    liveChatPollingReady: true,
    translationProviderReady: true,
    sanitizedOutputReviewConfirmed: true,
    explicitApprovalConfirmed: true,
    adapters: foundation.createCommentTranslatorPrivateGatedLiveProviderSmokeOperatorLocalAdapters({
      targetLookup: async () => ({
        status: "live-chat-target-lookup-sanitized-result",
        liveChatTarget: "present",
        liveChatTargetLookup: "executed-bounded-readonly-one-step",
        responseMetadata: {
          returnedItemCount: 1
        }
      }),
      pollLiveChatOnce: async () => ({
        status: "live-chat-polling-smoke-sanitized-result",
        liveChatPollingSmoke: "executed-bounded-readonly-one-step",
        responseMetadata: {
          returnedItemCount: 0,
          eligibleCommentCount: 0
        }
      }),
      translateEligibleComments: async () => {
        throw new Error("translation provider must not run for empty polling evidence");
      }
    })
  });
assert.equal(emptyPollingHarnessResult.status, "blocked-polling-sanitized");
assert.equal(emptyPollingHarnessResult.providerTargetLookup, "executed-presence-only");
assert.equal(emptyPollingHarnessResult.liveChatPollingSmoke, "executed-bounded-readonly-one-step");
assert.equal(emptyPollingHarnessResult.translationProviderExecution, "not-run");
assert.equal(emptyPollingHarnessResult.reason, "bounded Live Chat polling did not include eligible comments");

const harnessResult = await foundation.runCommentTranslatorPrivateGatedLiveProviderSmokeExecutionHarness({
  credentialReferenceId: "smoke-task27-execution-harness",
  providerTargetLookupReady: true,
  liveChatTargetPresent: true,
  liveChatPollingReady: true,
  translationProviderReady: true,
  sanitizedOutputReviewConfirmed: true,
  explicitApprovalConfirmed: true,
  targetLookup: async () => ({
    status: "target-present",
    providerTargetLookup: "executed-presence-only",
    liveChatTarget: "present"
  }),
  pollLiveChatOnce: async () => ({
    status: "polling-completed",
    liveChatPollingSmoke: "executed-bounded-readonly-one-step",
    returnedItemCount: 2,
    eligibleCommentCount: 1,
    skippedCommentCount: 1,
    stopReason: null
  }),
  translateEligibleComments: async () => ({
    status: "translation-completed",
    providerRequestCount: 1,
    providerCallCount: 1,
    translatedCount: 1,
    skippedCount: 0,
    languagePolicySkippedCount: 0,
    perMinuteSkippedCount: 0,
    providerUnavailableSkippedCount: 0,
    recoverableErrorCount: 0,
      terminalErrorCount: 0,
      terminalErrorCodeCounts: {
        invalidRequest: 0,
        unsupportedLanguage: 0,
        providerNotConfigured: 0,
        credentialMissing: 0,
        policyBlocked: 0
      },
      stopReason: null
    })
});

assert.equal(harnessResult.status, "task-27-live-provider-smoke-sanitized-result");
assert.deepEqual(harnessResult.evidence, {
  providerTargetLookup: "executed-presence-only",
  liveChatPollingSmoke: "executed-bounded-readonly-one-step",
  translationProviderExecution: "executed-server-only-provider",
  returnedItemCount: 2,
  eligibleCommentCount: 1,
  providerRequestCount: 1,
  providerCallCount: 1,
  translatedCount: 1,
  skippedCount: 1,
  languagePolicySkippedCount: 0,
  perMinuteSkippedCount: 0,
  providerUnavailableSkippedCount: 0,
  recoverableErrorCount: 0,
  terminalErrorCount: 0,
  terminalErrorCodeCounts: {
    invalidRequest: 0,
    unsupportedLanguage: 0,
    providerNotConfigured: 0,
    credentialMissing: 0,
    policyBlocked: 0
  },
  stopReason: null
});

const serialized = JSON.stringify(harnessResult);
for (const forbidden of [
  "liveChatId",
  "providerChannelId",
  "ownerUserId",
  "Authorization",
  "displayMessage",
  "raw-comment-value",
  "serverAuthorizationHeader",
  "providerTargetMetadata"
]) {
  assert.doesNotMatch(serialized, new RegExp(forbidden), `harness output does not expose ${forbidden}`);
}
assert.equal(harnessResult.rawCommentText, "never-returned-by-design", "harness output keeps raw comment text as a sentinel");

console.log("comment translator Task 27 live/provider smoke execution harness contract checks passed");
