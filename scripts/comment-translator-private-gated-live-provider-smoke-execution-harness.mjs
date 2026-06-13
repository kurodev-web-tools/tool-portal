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
const youtubeReadonlyOAuthScope = "https://www.googleapis.com/auth/youtube.readonly";
const targetLookupOperatorLocalServerAuthorizationHeaderReference =
  "YOUTUBE_LIVE_CHAT_TARGET_LOOKUP_OPERATOR_LOCAL_SERVER_AUTHORIZATION_HEADER";
const targetLookupOperatorLocalTokenExpiresAtIsoReference = "YOUTUBE_LIVE_CHAT_TARGET_LOOKUP_OPERATOR_LOCAL_TOKEN_EXPIRES_AT_ISO";
const pollingOperatorLocalServerAuthorizationHeaderReference =
  "YOUTUBE_LIVE_CHAT_POLLING_SMOKE_OPERATOR_LOCAL_SERVER_AUTHORIZATION_HEADER";
const pollingOperatorLocalTokenExpiresAtIsoReference = "YOUTUBE_LIVE_CHAT_POLLING_SMOKE_OPERATOR_LOCAL_TOKEN_EXPIRES_AT_ISO";

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

  await createOperatorLocalRuntimeAdapterExecutionPayload(result.payload.credentialReferenceId);
  return;
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

async function createOperatorLocalRuntimeAdapterExecutionPayload(credentialReferenceId) {
  const foundation = loadTsModule("lib/comment-translator-private-gated-live-provider-smoke-execution-harness.ts");
  let serverOnlyLiveComments = [];
  let serverOnlyLiveChatId = "";
  const adapters = foundation.createCommentTranslatorPrivateGatedLiveProviderSmokeOperatorLocalAdapters({
    targetLookup: async () => {
      const targetLookup = await runTask27OperatorLocalTargetLookupForPolling(credentialReferenceId);
      serverOnlyLiveChatId = targetLookup.serverOnlyLiveChatId;
      return targetLookup.sanitizedResult;
    },
    pollLiveChatOnce: async () => {
      const polling = await runTask27OperatorLocalLiveChatPollingForTranslation(credentialReferenceId, serverOnlyLiveChatId);
      serverOnlyLiveComments = polling.serverOnlyLiveComments;
      return polling.sanitizedResult;
    },
    translateEligibleComments: async () => runTask27OperatorLocalTranslationProviderExecution(serverOnlyLiveComments)
  });

  const executionPayload = await foundation.runCommentTranslatorPrivateGatedLiveProviderSmokeExecutionHarnessWithOperatorLocalAdapters({
    credentialReferenceId,
    providerTargetLookupReady: true,
    liveChatTargetPresent: true,
    liveChatPollingReady: true,
    translationProviderReady: true,
    sanitizedOutputReviewConfirmed: true,
    explicitApprovalConfirmed: true,
    adapters
  });

  writeJson(
    {
      ...executionPayload,
      operatorLocalAdapterWiring: "executed-through-server-only-harness-adapter-builder"
    },
    executionPayload.status === "task-27-live-provider-smoke-sanitized-result" ? 0 : 2
  );
  return undefined;
}

async function runTask27OperatorLocalTargetLookupForPolling(credentialReferenceId) {
  const targetLookupFoundation = loadTsModule("lib/comment-translator-youtube-live-chat-target-lookup-foundation.ts");
  const request = createTargetLookupFoundationBaseRequest(credentialReferenceId);
  const tokenMaterial = await request.tokenMaterialResolver.resolveServerOnlyTokenMaterial({
    credentialReferenceId: request.credentialReferenceId,
    ownerUserId: request.ownerAuthorization.ownerUserId,
    requiredScope: request.requiredScope
  });

  if (tokenMaterial.status !== "available") {
    return {
      sanitizedResult: await targetLookupFoundation.runYouTubeLiveChatTargetLookupFoundation(request),
      serverOnlyLiveChatId: ""
    };
  }

  let providerResponse;
  try {
    providerResponse = await request.fetchGoogleApi(
      targetLookupFoundation.createYouTubeLiveBroadcastsListTargetLookupRequest({
        serverAuthorizationHeader: tokenMaterial.serverAuthorizationHeader
      })
    );
  } catch {
    return {
      sanitizedResult: await targetLookupFoundation.runYouTubeLiveChatTargetLookupFoundation({
        ...request,
        fetchGoogleApi: async () => {
          throw new Error("provider-fetch-failed");
        }
      }),
      serverOnlyLiveChatId: ""
    };
  }

  const sanitizedResult = await targetLookupFoundation.runYouTubeLiveChatTargetLookupFoundation({
    ...request,
    fetchGoogleApi: async () => providerResponse
  });

  return {
    sanitizedResult,
    serverOnlyLiveChatId: readServerOnlyLiveChatIdFromTargetLookupBody(providerResponse.body)
  };
}

async function runTask27OperatorLocalLiveChatPollingForTranslation(credentialReferenceId, serverOnlyLiveChatId) {
  const pollingFoundation = loadTsModule("lib/comment-translator-youtube-live-chat-polling-smoke-foundation.ts");
  const request = createPollingFoundationBaseRequest(credentialReferenceId, serverOnlyLiveChatId);
  const readiness = await pollingFoundation.assessYouTubeLiveChatPollingSmokeReadinessGate(request);
  if (readiness.status !== "owner-binding-verified-before-live-chat-polling") {
    return {
      sanitizedResult: readiness,
      serverOnlyLiveComments: []
    };
  }

  const tokenMaterial = await request.tokenMaterialResolver.resolveServerOnlyTokenMaterial({
    credentialReferenceId: request.credentialReferenceId,
    ownerUserId: request.ownerAuthorization.ownerUserId,
    requiredScope: request.requiredScope
  });
  if (tokenMaterial.status !== "available") {
    return {
      sanitizedResult: createTask27PollingFailureResult({
        credentialReferenceId,
        reason: tokenMaterial.reason,
        stopReason: tokenMaterial.status === "expired" || tokenMaterial.status === "scope-missing" ? "auth-failed" : "terminal-provider-error"
      }),
      serverOnlyLiveComments: []
    };
  }

  try {
    const providerResponse = await fetchTask27LiveChatMessagesForTranslation({
      serverAuthorizationHeader: tokenMaterial.serverAuthorizationHeader,
      liveChatId: request.liveChatId
    });
    const serverOnlyLiveComments = createTask27ProviderSafeComments(providerResponse.body);
    const returnedItemCount = readCount(asRecord(providerResponse.body).items?.length);
    const eligibleCommentCount = serverOnlyLiveComments.length;

    if (!providerResponse.ok) {
      return {
        sanitizedResult: createTask27PollingFailureResult({
          credentialReferenceId,
          reason: "provider-fetch-failed",
          httpStatus: providerResponse.status,
          stopReason: "terminal-provider-error"
        }),
        serverOnlyLiveComments: []
      };
    }

    return {
      sanitizedResult: {
        status: "live-chat-polling-smoke-sanitized-result",
        liveChatPollingSmoke: "executed-bounded-readonly-one-step",
        responseMetadata: {
          httpStatus: providerResponse.status,
          ok: providerResponse.ok,
          liveChatTarget: "present",
          nextPageToken: asRecord(providerResponse.body).nextPageToken ? "present" : "absent",
          pollingIntervalMillis: readNullableCount(asRecord(providerResponse.body).pollingIntervalMillis),
          returnedItemCount,
          eligibleCommentCount,
          skippedCommentCount: Math.max(0, returnedItemCount - eligibleCommentCount),
          pageInfoTotalResults: readNullableCount(asRecord(asRecord(providerResponse.body).pageInfo).totalResults),
          textPayload: "server-only-translator-provider-input-never-returned"
        },
        eligibleCommentCount,
        skippedCommentCount: Math.max(0, returnedItemCount - eligibleCommentCount),
        stopReason: null
      },
      serverOnlyLiveComments
    };
  } catch {
    return {
      sanitizedResult: createTask27PollingFailureResult({
        credentialReferenceId,
        reason: "provider-fetch-failed",
        stopReason: "terminal-provider-error"
      }),
      serverOnlyLiveComments: []
    };
  }
}

async function runTask27OperatorLocalTranslationProviderExecution(serverOnlyLiveComments) {
  const providerExecution = loadTsModule("lib/comment-translator-provider-execution-runtime.ts");
  const providerPolicy = loadTsModule("lib/comment-translator-provider-policy-runtime.ts");
  const providers = providerPolicy.createCommentTranslatorDefaultTranslationProviderSet(process.env);

  return providerExecution.executeCommentTranslatorProviderPolicyBatch({
    providers,
    callerAuthorization: {
      status: "authorized",
      ownerUserId: readReference("YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID")
    },
    sessionReferenceId: "task-27-private-gated-live-provider-smoke",
    occurredAtMs: Date.now(),
    usage: createTask27UsageSnapshot(),
    targetLanguage: readReference("COMMENT_TRANSLATOR_TASK27_TARGET_LANGUAGE") || "ja",
    sourceLanguages: readTask27SourceLanguages(),
    comments: serverOnlyLiveComments
  });
}

function createTargetLookupFoundationBaseRequest(credentialReferenceId) {
  const targetLookupFoundation = loadTsModule("lib/comment-translator-youtube-live-chat-target-lookup-foundation.ts");
  const runtimeWiring = targetLookupFoundation.createYouTubeLiveChatTargetLookupCommandRuntimeWiring({
    credentialReferenceId,
    providerChannelId: readReference("YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID"),
    requiredScope: youtubeReadonlyOAuthScope,
    nowIso: new Date().toISOString(),
    operatorLocalServerAuthorizationHeader: readReference(targetLookupOperatorLocalServerAuthorizationHeaderReference),
    operatorLocalTokenExpiresAtIso: readReference(targetLookupOperatorLocalTokenExpiresAtIsoReference)
  });

  return {
    credentialReferenceId,
    expectedProviderChannelReference: readReference("YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID"),
    ownerVerificationSmokeSuccess: true,
    ownerAuthorization: {
      status: "authorized",
      ownerUserId: readReference("YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID")
    },
    credentialResolutionDisabled: false,
    requiredScope: youtubeReadonlyOAuthScope,
    nowIso: new Date().toISOString(),
    trustedStatusReader: runtimeWiring.trustedStatusReader,
    tokenMaterialResolver: runtimeWiring.tokenMaterialResolver,
    fetchGoogleApi: runtimeWiring.fetchGoogleApi
  };
}

function createPollingFoundationBaseRequest(credentialReferenceId, serverOnlyLiveChatId = "") {
  const pollingFoundation = loadTsModule("lib/comment-translator-youtube-live-chat-polling-smoke-foundation.ts");
  const liveChatId = serverOnlyLiveChatId || readReference("YOUTUBE_LIVE_CHAT_POLLING_SMOKE_LIVE_CHAT_ID");
  const runtimeWiring = pollingFoundation.createYouTubeLiveChatPollingSmokeCommandRuntimeWiring({
    credentialReferenceId,
    providerChannelId: readReference("YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID"),
    requiredScope: youtubeReadonlyOAuthScope,
    nowIso: new Date().toISOString(),
    operatorLocalServerAuthorizationHeader: readReference(pollingOperatorLocalServerAuthorizationHeaderReference),
    operatorLocalTokenExpiresAtIso: readReference(pollingOperatorLocalTokenExpiresAtIsoReference)
  });

  return {
    credentialReferenceId,
    expectedProviderChannelReference: readReference("YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID"),
    liveChatId,
    ownerVerificationSmokeSuccess: true,
    liveChatTargetLookupReadinessConfirmed: true,
    liveChatTargetPresenceOnlyEvidence: true,
    ownerAuthorization: {
      status: "authorized",
      ownerUserId: readReference("YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID")
    },
    credentialResolutionDisabled: false,
    requiredScope: youtubeReadonlyOAuthScope,
    nowIso: new Date().toISOString(),
    trustedStatusReader: runtimeWiring.trustedStatusReader,
    tokenMaterialResolver: runtimeWiring.tokenMaterialResolver,
    fetchGoogleApi: runtimeWiring.fetchGoogleApi
  };
}

async function fetchTask27LiveChatMessagesForTranslation({ serverAuthorizationHeader, liveChatId }) {
  const providerUrl = "https://www.googleapis.com/youtube/v3/liveChat/messages";
  const params = new URLSearchParams({
    liveChatId,
    part: "id,snippet",
    fields: "nextPageToken,pollingIntervalMillis,pageInfo(totalResults,resultsPerPage),items(id,snippet(publishedAt,type,displayMessage))"
  });
  const response = await fetch(`${providerUrl}?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: serverAuthorizationHeader
    }
  });

  return {
    ok: response.ok,
    status: response.status,
    body: await response.json()
  };
}

function createTask27ProviderSafeComments(body) {
  const items = Array.isArray(asRecord(body).items) ? asRecord(body).items : [];
  return items
    .map((item) => {
      const record = asRecord(item);
      const snippet = asRecord(record.snippet);
      return {
        commentId: typeof record.id === "string" ? record.id : "unknown-comment-reference",
        publishedAt: typeof snippet.publishedAt === "string" ? snippet.publishedAt : new Date().toISOString(),
        text: typeof snippet.displayMessage === "string" ? snippet.displayMessage : "",
        platformLanguageHint: null
      };
    })
    .filter((comment) => comment.text.trim().length > 0);
}

function readServerOnlyLiveChatIdFromTargetLookupBody(body) {
  const items = Array.isArray(asRecord(body).items) ? asRecord(body).items : [];
  const activeItem = items.find((item) => {
    const status = asRecord(asRecord(item).status);
    return status.lifeCycleStatus === "live";
  });
  const snippet = asRecord(asRecord(activeItem).snippet);
  return typeof snippet.liveChatId === "string" ? snippet.liveChatId.trim() : "";
}

function createTask27PollingFailureResult({ credentialReferenceId, reason, httpStatus = null, stopReason }) {
  return {
    status: "live-chat-polling-smoke-failed-sanitized",
    credentialReferenceId,
    liveChatPollingSmoke: "failed-bounded-readonly-one-step",
    providerAccess: "liveChatMessages-list-one-step-only",
    responseMetadata: {
      httpStatus,
      ok: false,
      liveChatTarget: "present",
      returnedItemCount: 0,
      eligibleCommentCount: 0,
      skippedCommentCount: 0,
      textPayload: "not-returned-by-design"
    },
    stopReason,
    reason
  };
}

function createTask27UsageSnapshot() {
  const usageLedger = loadTsModule("lib/comment-translator-usage-ledger-runtime.ts");
  return {
    dailyUsedMs: 0,
    currentSessionElapsedMs: 0,
    translatedMessagesInCurrentMinute: 0,
    providerBudgetAvailable: true,
    globalBudgetAvailable: true,
    aiBudgetAvailable: true,
    translationProviderAvailable: true,
    planEntitlement: usageLedger.resolveCommentTranslatorUsagePlanEntitlement({
      plan: readTask27Plan()
    }),
    providerRequestEstimate: {
      requestEstimateCount: 0,
      quotaUnitEstimate: 0,
      providerTargetMetadata: "forbidden"
    },
    aiUsageEstimate: {
      translatedMessageEstimate: 0,
      translatedCharacterEstimate: 0,
      estimatedCostMicros: 0,
      rawCommentText: "never-recorded-by-design"
    }
  };
}

function readTask27Plan() {
  return readReference("COMMENT_TRANSLATOR_TASK27_PLAN").toLowerCase() === "paid" ? "paid" : "free";
}

function readTask27SourceLanguages() {
  const value = readReference("COMMENT_TRANSLATOR_TASK27_SOURCE_LANGUAGES") || "EN,KR,CN";
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function readCount(value) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : 0;
}

function readNullableCount(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}
