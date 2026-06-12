#!/usr/bin/env node
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const root = process.cwd();
const args = new Set(process.argv.slice(2));

const requiredReferenceNames = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED",
  "YOUTUBE_OAUTH_SMOKE_CREDENTIAL_REFERENCE_ID",
  "YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID",
  "YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID",
  "YOUTUBE_LIVE_RUNTIME_SMOKE_OWNER_AUTHORIZATION_CONFIRMED",
  "YOUTUBE_OWNER_VERIFICATION_SMOKE_SUCCESS_CONFIRMED",
  "YOUTUBE_LIVE_CHAT_TARGET_LOOKUP_READY_PREFLIGHT_CONFIRMED",
  "YOUTUBE_LIVE_CHAT_TARGET_LOOKUP_PRESENCE_ONLY_EVIDENCE_CONFIRMED",
  "YOUTUBE_LIVE_CHAT_POLLING_SMOKE_READY_PREFLIGHT_CONFIRMED",
  "YOUTUBE_LIVE_CHAT_POLLING_SMOKE_TARGET_METADATA_PRESENT",
  "YOUTUBE_LIVE_CHAT_POLLING_SMOKE_LIVE_CHAT_ID",
  "COMMENT_TRANSLATOR_TASK27_TRANSLATION_PROVIDER_READY_PREFLIGHT_CONFIRMED",
  "COMMENT_TRANSLATOR_TASK27_SANITIZED_OUTPUT_REVIEW_CONFIRMED"
];

const truthyReferenceNames = [
  "YOUTUBE_LIVE_RUNTIME_SMOKE_OWNER_AUTHORIZATION_CONFIRMED",
  "YOUTUBE_OWNER_VERIFICATION_SMOKE_SUCCESS_CONFIRMED",
  "YOUTUBE_LIVE_CHAT_TARGET_LOOKUP_READY_PREFLIGHT_CONFIRMED",
  "YOUTUBE_LIVE_CHAT_TARGET_LOOKUP_PRESENCE_ONLY_EVIDENCE_CONFIRMED",
  "YOUTUBE_LIVE_CHAT_POLLING_SMOKE_READY_PREFLIGHT_CONFIRMED",
  "YOUTUBE_LIVE_CHAT_POLLING_SMOKE_TARGET_METADATA_PRESENT",
  "COMMENT_TRANSLATOR_TASK27_TRANSLATION_PROVIDER_READY_PREFLIGHT_CONFIRMED",
  "COMMENT_TRANSLATOR_TASK27_SANITIZED_OUTPUT_REVIEW_CONFIRMED"
];

const exactOperatorLocalCommand =
  "node scripts/comment-translator-private-gated-live-provider-smoke-execution-harness.mjs --execute --approved-private-gated-live-provider-smoke --use-operator-local-runtime-adapters --operator-local-ready-preflight-reviewed";

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

function readReference(name) {
  return process.env[name]?.trim() ?? "";
}

function hasReference(name) {
  return readReference(name).length > 0;
}

function isTruthyReference(name) {
  const value = readReference(name).toLowerCase();
  return value === "1" || value === "true" || value === "yes" || value === "confirmed";
}

function isPlaceholderReferenceValue(name) {
  const value = readReference(name);
  return /^<.*>$/.test(value) || /\bdo not paste\b/i.test(value) || /\bset locally\b/i.test(value);
}

function credentialResolutionDisabled() {
  const value = readReference("YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED").toLowerCase();
  return value === "1" || value === "true" || value === "yes" || value === "enabled";
}

function writeJson(payload, exitCode) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exitCode = exitCode;
}

function createBasePayload() {
  const foundation = loadTsModule("lib/comment-translator-private-gated-live-provider-smoke-execution-harness.ts");
  const contract = foundation.commentTranslatorPrivateGatedLiveProviderSmokeExecutionHarnessContract;
  return {
    command: "task-27-private-gated-live-provider-smoke-execution-harness",
    outputPolicy: contract.outputPolicy,
    implementationStage: contract.implementationStage,
    providerTargetLookup: "not-run",
    liveChatPollingSmoke: "not-run",
    translationProviderExecution: "not-run",
    liveProviderExecution: "not-run",
    translatorPipelineWiring: contract.translatorPipelineWiring,
    evidence: contract.evidence,
    tokenValue: "never-returned-by-design",
    refreshTokenValue: "never-returned-by-design",
    authorizationHeaderValue: "never-returned-by-design",
    rawCommentText: "never-returned-by-design",
    browserStorage: "unchanged",
    handoffPayload: "unchanged"
  };
}

function createExactCommandReviewPayload(credentialReferenceId) {
  return {
    ...createBasePayload(),
    status: "ready-for-task-27-exact-command-review",
    credentialReferenceId,
    providerTargetLookup: "not-run-exact-command-review-only",
    liveChatPollingSmoke: "not-run-exact-command-review-only",
    translationProviderExecution: "not-run-exact-command-review-only",
    liveProviderExecution: "not-run-exact-command-review-only",
    exactCommand: exactOperatorLocalCommand,
    requiredHumanApproval: "explicit-in-thread-approval-for-exact-command",
    evidenceDestination: "sanitized-output-review-only-no-private-values",
    operatorLocalAdapterSelection: "pending-explicit-approved-command",
    approvalBoundary: "same-thread-explicit-in-thread-approval-required"
  };
}

function preflight() {
  const missingReferences = requiredReferenceNames.filter((name) => !hasReference(name));
  const placeholderReferences = requiredReferenceNames.filter((name) => isPlaceholderReferenceValue(name));
  const unconfirmedReferences = truthyReferenceNames.filter((name) => hasReference(name) && !isTruthyReference(name));

  if (missingReferences.length > 0) {
    return {
      ok: false,
      exitCode: 2,
      payload: {
        status: "blocked-missing-execution-harness-references",
        ...createBasePayload(),
        missingReferences
      }
    };
  }

  if (placeholderReferences.length > 0) {
    return {
      ok: false,
      exitCode: 2,
      payload: {
        status: "blocked-placeholder-execution-harness-references",
        ...createBasePayload(),
        placeholderReferences
      }
    };
  }

  if (unconfirmedReferences.length > 0) {
    return {
      ok: false,
      exitCode: 2,
      payload: {
        status: "blocked-unconfirmed-execution-harness-references",
        ...createBasePayload(),
        unconfirmedReferences
      }
    };
  }

  if (credentialResolutionDisabled()) {
    return {
      ok: false,
      exitCode: 2,
      payload: {
        status: "blocked-credential-resolution-disabled",
        ...createBasePayload(),
        credentialResolutionDisabledEnv: "present-enabled"
      }
    };
  }

  const credentialReferenceId = readReference("YOUTUBE_OAUTH_SMOKE_CREDENTIAL_REFERENCE_ID");
  if (!/^smoke-[a-z0-9][a-z0-9_-]{7,}$/i.test(credentialReferenceId)) {
    return {
      ok: false,
      exitCode: 2,
      payload: {
        status: "blocked-unsafe-credential-reference-id",
        ...createBasePayload(),
        requiredCredentialReferenceIdPattern: "smoke-<opaque-non-secret-id>"
      }
    };
  }

  return {
    ok: true,
    exitCode: 0,
    payload: {
      status: "ready-for-task-27-approved-live-provider-smoke-execution-harness",
      ...createBasePayload(),
      credentialReferenceId,
      providerTargetLookup: "not-run-preflight-only",
      liveChatPollingSmoke: "not-run-preflight-only",
      translationProviderExecution: "not-run-preflight-only",
      liveProviderExecution: "not-run-preflight-only",
      requiredFlag: "--execute --approved-private-gated-live-provider-smoke"
    }
  };
}

async function main() {
  const result = preflight();
  if (!result.ok) {
    writeJson(result.payload, result.exitCode);
    return;
  }

  if (args.has("--check-env-only")) {
    writeJson(result.payload, 0);
    return;
  }

  if (args.has("--print-exact-command-review")) {
    writeJson(createExactCommandReviewPayload(result.payload.credentialReferenceId), 0);
    return;
  }

  if (!args.has("--execute")) {
    writeJson(
      {
        status: "blocked-pending-explicit-execute-flag",
        ...createBasePayload(),
        credentialReferenceId: result.payload.credentialReferenceId,
        requiredFlag: "--execute",
        approvalBoundary: "same-thread-explicit-in-thread-approval-required"
      },
      2
    );
    return;
  }

  if (!args.has("--approved-private-gated-live-provider-smoke")) {
    writeJson(
      {
        status: "blocked-pending-explicit-private-gated-live-provider-smoke-approval",
        ...createBasePayload(),
        credentialReferenceId: result.payload.credentialReferenceId,
        requiredFlag: "--approved-private-gated-live-provider-smoke",
        approvalBoundary: "same-thread-explicit-in-thread-approval-required"
      },
      2
    );
    return;
  }

  if (args.has("--use-sandboxed-adapters-for-contract")) {
    const executionPayload = await createSandboxedAdapterExecutionPayload(result.payload.credentialReferenceId);
    writeJson(executionPayload, executionPayload.status === "task-27-live-provider-smoke-sanitized-result" ? 0 : 2);
    return;
  }

  if (!args.has("--use-operator-local-runtime-adapters")) {
    writeJson(
      {
        status: "blocked-pending-operator-local-runtime-adapter-selection",
        ...createBasePayload(),
        credentialReferenceId: result.payload.credentialReferenceId,
        requiredFlag: "--use-operator-local-runtime-adapters",
        liveProviderExecution: "not-run",
        providerTargetLookup: "not-run",
        liveChatPollingSmoke: "not-run",
        translationProviderExecution: "not-run",
        reason:
          "approved Task 27 execution requires an exact command that selects operator-local runtime adapters after sanitized output review"
      },
      2
    );
    return;
  }

  if (!args.has("--operator-local-ready-preflight-reviewed")) {
    writeJson(
      {
        status: "blocked-pending-operator-local-ready-preflight-review-flag",
        ...createBasePayload(),
        credentialReferenceId: result.payload.credentialReferenceId,
        requiredFlag: "--operator-local-ready-preflight-reviewed",
        liveProviderExecution: "not-run",
        providerTargetLookup: "not-run",
        liveChatPollingSmoke: "not-run",
        translationProviderExecution: "not-run",
        reason:
          "operator-local ready preflight and sanitized output review must be confirmed in the exact command before provider-affecting adapters can be selected"
      },
      2
    );
    return;
  }

  writeJson(
    {
      status: "blocked-actual-operator-local-runtime-adapters-not-run-in-this-pr",
      ...createBasePayload(),
      credentialReferenceId: result.payload.credentialReferenceId,
      liveProviderExecution: "not-run",
      providerTargetLookup: "not-run",
      liveChatPollingSmoke: "not-run",
      translationProviderExecution: "not-run",
      operatorLocalAdapterWiring: "available-through-server-only-harness-adapter-builder",
      reason:
        "this PR wires the Task 27 harness to operator-local adapter results; actual provider-affecting adapters remain a later exact-command execution step"
    },
    2
  );
}

await main();

async function createSandboxedAdapterExecutionPayload(credentialReferenceId) {
  const foundation = loadTsModule("lib/comment-translator-private-gated-live-provider-smoke-execution-harness.ts");
  const adapters = foundation.createCommentTranslatorPrivateGatedLiveProviderSmokeOperatorLocalAdapters({
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
      skippedCount: 0
    })
  });

  return foundation.runCommentTranslatorPrivateGatedLiveProviderSmokeExecutionHarnessWithOperatorLocalAdapters({
    credentialReferenceId,
    providerTargetLookupReady: true,
    liveChatTargetPresent: true,
    liveChatPollingReady: true,
    translationProviderReady: true,
    sanitizedOutputReviewConfirmed: true,
    explicitApprovalConfirmed: true,
    adapters
  });
}
