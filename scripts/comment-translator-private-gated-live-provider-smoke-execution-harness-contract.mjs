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

const foundationSource = read(foundationPath);
const commandSource = read(commandPath);
const taskSource = read(taskPath);
const readinessDoc = read(readinessDocPath);

assert.match(foundationSource, /^import "server-only";/m, "harness foundation is server-only");
assert.match(commandSource, /--approved-private-gated-live-provider-smoke/, "command requires explicit Task 27 approval flag");
assert.match(taskSource, /execution harness/i, "task.md records execution harness PR scope");
assert.match(readinessDoc, /execution harness/i, "readiness doc records execution harness availability");

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
    providerTranslationExecution: "approval-gated-injected-server-only-provider",
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

const blockedExecute = runCommand(["--execute"], readyEnv);
assert.equal(blockedExecute.status, 2, "execute without approval is blocked");
const blockedExecutePayload = parseJson(blockedExecute.stdout);
assert.equal(blockedExecutePayload.status, "blocked-pending-explicit-private-gated-live-provider-smoke-approval");
assert.equal(blockedExecutePayload.liveProviderExecution, "not-run");

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
