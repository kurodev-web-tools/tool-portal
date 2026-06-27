import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { createRequire } from "node:module";

const root = process.cwd();
const require = createRequire(import.meta.url);
const moduleCache = new Map();

const routePath = "app/api/comment-translator/session/route.ts";
const actionsPath = "app/tools/comment-translator/actions.ts";
const adapterPath = "lib/comment-translator-youtube-live-provider-runtime-adapter.ts";
const pollingPath = "lib/comment-translator-bounded-live-chat-polling-wiring.ts";
const normalizerPath = "lib/comment-translator-live-message-normalization.ts";
const orchestrationPath = "lib/comment-translator-live-provider-session-step.ts";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function loadTsModule(relativePath) {
  const originalLoad = Module._load;
  const ts = require("typescript");

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

    if (request === "@supabase/supabase-js") {
      return {
        createClient() {
          return { from: () => ({}) };
        }
      };
    }

    if (request.startsWith("@/") && parent?.filename) {
      const candidate = path.join(root, `${request.slice(2)}.ts`);
      if (fs.existsSync(candidate)) {
        return compileTsModule(candidate);
      }
      const tsxCandidate = path.join(root, `${request.slice(2)}.tsx`);
      if (fs.existsSync(tsxCandidate)) {
        return compileTsModule(tsxCandidate);
      }
    }

    if (request.startsWith(".") && parent?.filename) {
      const candidate = path.resolve(path.dirname(parent.filename), `${request}.ts`);
      if (fs.existsSync(candidate)) {
        return compileTsModule(candidate);
      }
      const tsxCandidate = path.resolve(path.dirname(parent.filename), `${request}.tsx`);
      if (fs.existsSync(tsxCandidate)) {
        return compileTsModule(tsxCandidate);
      }
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return compileTsModule(path.join(root, relativePath));
  } finally {
    Module._load = originalLoad;
  }
}

for (const requiredPath of [routePath, actionsPath, adapterPath, pollingPath, normalizerPath, orchestrationPath]) {
  assert.ok(exists(requiredPath), `required UI live provider file exists: ${requiredPath}`);
}

const routeSource = read(routePath);
const actionsSource = read(actionsPath);
const adapterSource = read(adapterPath);
const pollingSource = read(pollingPath);
const orchestrationSource = read(orchestrationPath);

assert.match(routeSource, /createTrustedCommentTranslatorYouTubeLiveProviderRuntimeAdapter/, "session route uses trusted live provider adapter");
assert.match(actionsSource, /createTrustedCommentTranslatorYouTubeLiveProviderRuntimeAdapter/, "server actions use trusted live provider adapter");
assert.doesNotMatch(routeSource, /reason:\s*"provider-target-lookup-not-approved"/, "session route no longer fixes target lookup to not-approved");
assert.doesNotMatch(actionsSource, /reason:\s*"provider-target-lookup-not-approved"/, "server actions no longer fix target lookup to not-approved");
assert.doesNotMatch(routeSource, /reason:\s*"live-provider-polling-not-approved"/, "session route no longer fixes polling to not-approved");
assert.doesNotMatch(actionsSource, /reason:\s*"live-provider-polling-not-approved"/, "server actions no longer fix polling to not-approved");
assert.match(adapterSource, /^import "server-only";/m, "live provider adapter is server-only");
assert.match(adapterSource, /liveBroadcasts\.list/, "adapter performs server-side liveBroadcasts lookup");
assert.match(adapterSource, /liveChatMessages\.list/, "adapter performs bounded liveChatMessages polling");
assert.match(adapterSource, /serverAuthorizationHeader/, "adapter consumes server-only authorization internally");
assert.match(adapterSource, /resolveYouTubeLiveTokenForServerFetch/, "adapter resolves server fetch authorization through the stored-token foundation");
assert.match(adapterSource, /createTrustedYouTubeOAuthStoredTokenMaterialResolver/, "adapter uses the stored credential token material resolver");
assert.match(adapterSource, /createTrustedYouTubeOAuthCredentialSupabaseTokenMaterialRuntime/, "adapter reads token material through trusted Supabase runtime");
assert.doesNotMatch(
  adapterSource,
  /COMMENT_TRANSLATOR_YOUTUBE_SERVER_AUTHORIZATION_HEADER|YOUTUBE_LIVE_CHAT_POLLING_SMOKE_OPERATOR_LOCAL_SERVER_AUTHORIZATION_HEADER|YOUTUBE_LIVE_CHAT_TARGET_LOOKUP_OPERATOR_LOCAL_SERVER_AUTHORIZATION_HEADER/,
  "adapter no longer depends on operator-local Authorization header envs"
);
assert.doesNotMatch(adapterSource, /console\.(log|info|warn|error)/, "adapter does not log provider/token/comment material");
assert.match(pollingSource, /serverOnlyCommentsForTranslation/, "polling tick carries comments only for server-side translation");
assert.match(orchestrationSource, /executeCommentTranslatorAzureNormalTranslationForNormalizedMessages/, "polling orchestration runs Azure/provider translation execution");
assert.match(orchestrationSource, /diagnostics:\s*CommentTranslatorLiveProviderDiagnostics/, "polling orchestration exposes sanitized live provider diagnostics");
assert.match(orchestrationSource, /preStartSkippedCount/, "polling orchestration carries cursor-prime skipped counts");
assert.match(orchestrationSource, /persistedFeedRowCount/, "polling orchestration carries feed persistence counts");
assert.match(actionsSource, /liveProviderUnavailableReason/, "feed action preserves sanitized live provider unavailable reason");
assert.match(actionsSource, /attachCommentTranslatorLiveProviderDiagnosticsToFeed/, "feed action returns sanitized live provider diagnostics in feed state");
assert.match(actionsSource, /polling-runtime-not-wired/, "feed action returns sanitized polling runtime unavailable reason");

const polling = loadTsModule(pollingPath);
const normalizer = loadTsModule(normalizerPath);
const adapter = loadTsModule(adapterPath);

polling.resetCommentTranslatorBoundedLiveChatPollingStateForTests();
const activeState = {
  status: "active",
  sessionReferenceId: "cts_ui_live_provider_contract",
  startedAtMs: Date.parse("2026-06-26T00:00:00.000Z"),
  lastHeartbeatAtMs: Date.parse("2026-06-26T00:00:00.000Z"),
  plan: "free",
  remainingSessionSeconds: 1800,
  remainingDailySeconds: 1800,
  reasonUx: null,
  usageDisplay: {
    status: "ready",
    plan: "free",
    dailyLimitSeconds: 1800,
    dailyUsedSeconds: 0,
    dailyRemainingSeconds: 1800,
    sessionLimitSeconds: 1800,
    currentSessionElapsedSeconds: 0,
    translatedMessagesPerMinute: 30,
    translatedMessagesInCurrentMinute: 0,
    activeSessionsPerUser: 1,
    monthlyTranslatedCharacterLimit: 20000,
    monthlyTranslatedCharacterEstimate: 0,
    providerBudgetAvailable: true,
    globalBudgetAvailable: true,
    aiBudgetAvailable: true,
    translationProviderAvailable: true,
    browserReadableOutput: "sanitized-usage-only",
    rawUsageEvents: "not-returned-by-design"
  },
  credentialReferenceId: "credential-reference-for-contract"
};
const usage = {
  dailyUsedMs: 0,
  currentSessionElapsedMs: 0,
  translatedMessagesInCurrentMinute: 0,
  monthlyTranslatedCharacterEstimate: 0,
  providerBudgetAvailable: true,
  globalBudgetAvailable: true,
  aiBudgetAvailable: true,
  translationProviderAvailable: true,
  planEntitlement: {
    plan: "free",
    planEntitlementReferenceId: "comment-translator-free-public-v1",
    entitlementSource: "server-owned",
    dailyLimitMs: 1800000,
    sessionLimitMs: 1800000,
    translatedMessagesPerMinute: 30,
    activeSessionsPerUser: 1,
    monthlyTranslatedCharacterLimit: 20000,
    paidPrioritization: "not-implemented",
    providerUsageCharging: "not-implemented"
  }
};

polling.seedCommentTranslatorBoundedLiveChatPollingStateForActiveSession({
  state: activeState,
  liveChatTargetReadiness: {
    status: "ready",
    provider: "youtube",
    serverOnlyTarget: {
      liveChatId: "server-only-live-target",
      broadcastId: "server-only-broadcast",
      targetMetadata: "server-only-internal",
      clientReadable: "forbidden"
    },
    clientReadableTargetMetadata: "forbidden",
    providerAccess: "server-only-google-api",
    providerTargetLookupExecution: "executed-bounded-readonly-one-step",
    liveChatIdLookupExecution: "executed-bounded-readonly-one-step",
    publicLaunchAllowed: false
  },
  nowMs: activeState.startedAtMs
});
const tick = await polling.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "heartbeat",
  activeSession: activeState,
  usage,
  adapter: polling.createDeterministicCommentTranslatorBoundedLiveChatPollingAdapter({
    pollSteps: [
      {
        type: "messages",
        receivedAtMs: activeState.startedAtMs,
        nextPageToken: "server-only-next-page-token",
        pollingIntervalMillis: 1000,
        comments: [
          {
            id: "yt-comment-1",
            publishedAt: "2026-06-26T00:00:00.000Z",
            text: "hello",
            platformLanguageHint: "en"
          }
        ]
      }
    ]
  }),
  nowMs: activeState.startedAtMs
});
assert.equal(tick.status, "cursor-primed-existing-comments-skipped");
assert.equal(tick.sanitizedPolling.returnedCommentCount, 1);
assert.equal(tick.sanitizedPolling.acceptedCount, 0);
assert.equal(tick.sanitizedPolling.preStartSkippedCount, 1);
assert.equal(tick.sanitizedPolling.rawComments, "not-returned-by-design");
assert.equal(tick.serverOnlyCommentsForTranslation.length, 0);

const postPrimeTick = await polling.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "heartbeat",
  activeSession: activeState,
  usage,
  adapter: polling.createDeterministicCommentTranslatorBoundedLiveChatPollingAdapter({
    pollSteps: [
      {
        type: "messages",
        receivedAtMs: activeState.startedAtMs + 1000,
        nextPageToken: "server-only-next-page-token-2",
        pollingIntervalMillis: 1000,
        comments: [
          {
            id: "yt-comment-2",
            publishedAt: "2026-06-26T00:00:01.000Z",
            text: "hello after start",
            platformLanguageHint: "en"
          }
        ]
      }
    ]
  }),
  nowMs: activeState.startedAtMs + 1000
});
assert.equal(postPrimeTick.status, "polled-comments-available");
assert.equal(postPrimeTick.sanitizedPolling.returnedCommentCount, 1);
assert.equal(postPrimeTick.sanitizedPolling.acceptedCount, 1);
assert.equal(postPrimeTick.sanitizedPolling.preStartSkippedCount, 0);
assert.equal(postPrimeTick.serverOnlyCommentsForTranslation.length, 1);

const normalized = normalizer.mapYouTubeProviderSafeCommentsToNormalizedLiveMessages(postPrimeTick.serverOnlyCommentsForTranslation);
assert.equal(normalized[0].messageReferenceId, "yt-comment-2");
assert.equal(normalized[0].text, "hello after start");
assert.equal(normalized[0].rawProviderPayload, "not-returned-by-design");
assert.equal(normalized[0].authorChannelMaterial, "not-returned-by-design");

const runtime = adapter.createCommentTranslatorYouTubeLiveProviderRuntimeAdapterForTests({
  fetchGoogleApi: async (request) => {
    if (request.endpoint === "liveBroadcasts.list") {
      return {
        ok: true,
        status: 200,
        body: {
          items: [
            {
              id: "broadcast-1",
              snippet: { title: "Live", liveChatId: "server-only-live-chat-id" },
              status: { lifeCycleStatus: "live", privacyStatus: "public" }
            }
          ]
        }
      };
    }

    return {
      ok: true,
      status: 200,
      body: {
        nextPageToken: "server-only-next-page-token-2",
        pollingIntervalMillis: 1000,
        items: [
          {
            id: "yt-comment-2",
            snippet: {
              publishedAt: "2026-06-26T00:00:01.000Z",
              displayMessage: "bonjour",
              textMessageDetails: { messageText: "bonjour" }
            }
          }
        ]
      }
    };
  }
});
const owner = await runtime.targetLookupAdapter.verifyOwner({
  credentialReferenceId: "credential-reference-for-contract"
});
assert.equal(owner.status, "owner-verified");
const broadcasts = await runtime.targetLookupAdapter.lookupOwnedBroadcasts({
  ownerChannelReference: "provider-channel-reference"
});
assert.equal(broadcasts.broadcasts[0].lifecycleStatus, "live");
const pollResult = await runtime.pollingAdapter.runtime.pollLiveChatOnce({
  liveChatId: "server-only-live-chat-id",
  nextPageToken: null,
  retryCount: 0,
  nextPollAfterMs: 0,
  terminal: null
});
assert.equal(pollResult.comments[0].commentId, "yt-comment-2");
assert.equal(pollResult.comments[0].text, "bonjour");
assert.doesNotMatch(JSON.stringify(pollResult), /Authorization|Bearer|refresh_token|access_token/i);

console.log("comment translator UI live provider runtime contract checks passed");
