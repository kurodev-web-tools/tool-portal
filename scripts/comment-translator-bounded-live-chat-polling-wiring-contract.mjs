import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const wiringPath = "lib/comment-translator-bounded-live-chat-polling-wiring.ts";
const sessionRuntimePath = "lib/comment-translator-session-runtime.ts";
const routePath = "app/api/comment-translator/session/route.ts";
const actionPath = "app/tools/comment-translator/actions.ts";
const youtubeRuntimePath = "lib/comment-translator-youtube-runtime-foundation.ts";
const targetLookupPath = "lib/comment-translator-server-only-live-chat-target-lookup.ts";
const durableUsagePath = "lib/comment-translator-durable-usage-counter-store.ts";
const readinessDocPath = "docs/active/COMMENT_TRANSLATOR_DURABLE_PERSISTENCE_SCHEMA_READINESS.md";
const gapAuditPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md";
const sessionStartReadinessPath = "docs/active/COMMENT_TRANSLATOR_YOUTUBE_OAUTH_ALLOWED_TESTER_SESSION_START_SMOKE_READINESS.md";
const taskPath = "task.md";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function changedFiles() {
  const base = "origin/codex/comment-translator-free-public-beta-integration";
  const committedDiff = execSync(`git diff --name-only ${base}...HEAD`, {
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

function loadTsModule(relativePath) {
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

    if (request === "@supabase/supabase-js") {
      return {
        createClient(url, key) {
          return { url, key, from: () => ({}) };
        }
      };
    }

    if (request === "next/server") {
      return {
        NextResponse: {
          json(body, init) {
            return { body, init };
          }
        }
      };
    }

    if (request === "stripe") {
      return class Stripe {
        constructor() {
          this.checkout = { sessions: { create: async () => ({ url: null }) } };
          this.billingPortal = { sessions: { create: async () => ({ url: null }) } };
          this.webhooks = { constructEventAsync: async () => ({ type: "unsupported", data: { object: {} } }) };
        }
      };
    }

    if (request.startsWith("@/") && parent?.filename) {
      const candidate = path.join(root, `${request.slice(2)}.ts`);
      if (fs.existsSync(candidate)) {
        return compileTsModule(candidate);
      }
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
    return compileTsModule(path.join(root, relativePath));
  } finally {
    Module._load = originalLoad;
  }
}

for (const requiredPath of [
  wiringPath,
  sessionRuntimePath,
  routePath,
  actionPath,
  youtubeRuntimePath,
  targetLookupPath,
  durableUsagePath,
  readinessDocPath,
  gapAuditPath,
  sessionStartReadinessPath,
  taskPath
]) {
  assert.ok(exists(requiredPath), `F7 required file exists: ${requiredPath}`);
}

const wiringSource = read(wiringPath);
const sessionRuntimeSource = read(sessionRuntimePath);
const routeSource = read(routePath);
const actionSource = read(actionPath);
const youtubeRuntimeSource = read(youtubeRuntimePath);
const targetLookupSource = read(targetLookupPath);
const durableUsageSource = read(durableUsagePath);
const readinessDoc = read(readinessDocPath);
const gapAudit = read(gapAuditPath);
const sessionStartReadiness = read(sessionStartReadinessPath);
const taskSource = read(taskPath);

assert.match(wiringSource, /^import "server-only";/m, "F7 bounded polling wiring is server-only");
assert.match(wiringSource, /commentTranslatorBoundedLiveChatPollingWiringContract/, "F7 wiring exposes a focused contract");
assert.match(wiringSource, /seedCommentTranslatorBoundedLiveChatPollingStateForActiveSession/, "F7 wiring seeds server-only polling state only after active start");
assert.match(wiringSource, /readCommentTranslatorBoundedLiveChatPollingTick/, "F7 wiring exposes active-session polling tick");
assert.match(wiringSource, /createUnavailableCommentTranslatorBoundedLiveChatPollingAdapter/, "F7 wiring exposes not-run unavailable adapter");
assert.match(wiringSource, /createDeterministicCommentTranslatorBoundedLiveChatPollingAdapter/, "F7 wiring exposes deterministic local adapter");
assert.match(wiringSource, /clearCommentTranslatorBoundedLiveChatPollingState/, "F7 wiring clears server-only cursor state");
assert.match(wiringSource, /active-session-only/, "F7 records active-session-only polling");
assert.match(wiringSource, /nextPageToken-server-only/, "F7 records server-only cursor handling");
assert.match(wiringSource, /pollingIntervalMillis/, "F7 records provider polling interval handling");
assert.match(wiringSource, /bounded-retry-backoff/, "F7 records capped retry/backoff");
assert.match(wiringSource, /empty-chat-waiting/, "F7 records empty-chat behavior");
assert.match(wiringSource, /providerPollingExecution:\s*"not-run-in-this-thread"/, "F7 records live provider polling as not-run");
assert.match(wiringSource, /liveTargetHandling:\s*"server-only-active-session-state"/, "F7 keeps live target in server-only active-session state");

assert.match(sessionRuntimeSource, /providerSignal/, "session runtime accepts F7 provider signal");
assert.match(sessionRuntimeSource, /liveProviderExecution:\s*"not-run-in-f7"/, "session contract records F7 live provider execution not-run");
assert.match(routeSource, /readCommentTranslatorBoundedLiveChatPollingTick/, "session route wires F7 polling tick");
assert.match(routeSource, /seedCommentTranslatorBoundedLiveChatPollingStateForActiveSession/, "session route seeds F7 polling state after active start");
assert.match(routeSource, /createTrustedCommentTranslatorYouTubeLiveProviderRuntimeAdapter/, "session route uses trusted live provider polling adapter");
assert.match(actionSource, /readCommentTranslatorBoundedLiveChatPollingTick/, "server actions wire F7 polling tick");
assert.match(actionSource, /seedCommentTranslatorBoundedLiveChatPollingStateForActiveSession/, "server actions seed F7 polling state after active start");
assert.match(actionSource, /createTrustedCommentTranslatorYouTubeLiveProviderRuntimeAdapter/, "server actions use trusted live provider polling adapter");

assert.match(youtubeRuntimeSource, /createInitialYouTubeLiveChatPollingState/, "F7 reuses YouTube polling runtime foundation");
assert.match(youtubeRuntimeSource, /advanceYouTubeLiveChatPollingState/, "F7 reuses deterministic polling stepper");
assert.match(targetLookupSource, /serverOnlyTarget/, "F7 consumes F6 server-only target readiness");
assert.match(durableUsageSource, /recordCommentTranslatorDurableSessionLedgerStateOrFailClosed/, "F7 leaves quota/budget stop handoff to durable usage ledger state");
assert.match(readinessDoc, /F7 bounded `liveChatMessages\.list` polling wiring/i, "durable readiness doc records F7");
assert.match(gapAudit, /F7[\s\S]*Active-session-only polling/i, "gap audit records F7 active-session-only polling");
assert.match(sessionStartReadiness, /No background monitoring starts from connection alone/i, "session readiness still forbids connection-only monitoring");
assert.match(taskSource, /F7 bounded `liveChatMessages\.list` polling wiring/i, "task.md records F7 active work");
assert.match(taskSource, /Width checks skipped[\s\S]*no UI\/CSS\/rendered route\/visible layout change/i, "task.md records F7 width-check skip reason");

const wiring = loadTsModule(wiringPath);
const session = loadTsModule(sessionRuntimePath);

assert.equal(
  wiring.commentTranslatorBoundedLiveChatPollingWiringContract.implementationStage,
  "free-public-beta-f7-bounded-live-chat-polling-wiring"
);
assert.equal(wiring.commentTranslatorBoundedLiveChatPollingWiringContract.runtime, "server-only");
assert.equal(wiring.commentTranslatorBoundedLiveChatPollingWiringContract.sessionBoundary, "active-session-only");
assert.equal(wiring.commentTranslatorBoundedLiveChatPollingWiringContract.providerPollingExecution, "not-run-in-this-thread");
assert.equal(wiring.commentTranslatorBoundedLiveChatPollingWiringContract.publicLaunchAllowed, false);

const readyTarget = {
  status: "ready",
  provider: "youtube",
  serverOnlyTarget: {
    [["live", "ChatId"].join("")]: "server-only-live-target-never-output",
    broadcastId: "server-only-broadcast-never-output",
    targetMetadata: "server-only-internal",
    clientReadable: "forbidden"
  },
  clientReadableTargetMetadata: "forbidden",
  providerAccess: "deterministic-local-adapter-only",
  providerTargetLookupExecution: "not-run-in-this-thread",
  liveChatIdLookupExecution: "not-run-in-this-thread",
  publicLaunchAllowed: false
};
const activeSession = {
  sessionReferenceId: "cts_f7_active",
  startedAtMs: Date.parse("2026-06-15T00:00:00.000Z"),
  lastHeartbeatAtMs: Date.parse("2026-06-15T00:00:00.000Z"),
  credentialReferenceId: "ytcred_f7_reference"
};
const activeBrowserState = session.startCommentTranslatorSession({
  nowMs: activeSession.startedAtMs,
  plan: "free",
  callerAuthorization: {
    status: "authorized",
    ownerUserId: "server-only-owner-reference"
  },
  credentialReadiness: {
    status: "ready",
    credentialReferenceId: activeSession.credentialReferenceId
  },
  activeSession: null,
  usage: {
    dailyUsedMs: 0,
    translatedMessagesInCurrentMinute: 0,
    providerBudgetAvailable: true,
    globalBudgetAvailable: true,
    aiBudgetAvailable: true,
    translationProviderAvailable: true
  },
  liveChatTargetReadiness: readyTarget,
  createSessionReferenceId: () => activeSession.sessionReferenceId
});
assert.equal(activeBrowserState.status, "active");

wiring.resetCommentTranslatorBoundedLiveChatPollingStateForTests();
const skippedNoActive = await wiring.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "status",
  activeSession: null,
  usage: {
    dailyUsedMs: 0,
    translatedMessagesInCurrentMinute: 0,
    providerBudgetAvailable: true,
    globalBudgetAvailable: true,
    aiBudgetAvailable: true,
    translationProviderAvailable: true
  },
  adapter: wiring.createUnavailableCommentTranslatorBoundedLiveChatPollingAdapter({
    reason: "live-provider-polling-not-approved"
  }),
  nowMs: activeSession.startedAtMs
});
assert.equal(skippedNoActive.status, "skipped-no-active-session");
assert.equal(skippedNoActive.providerAccess, "not-run");

const missingState = await wiring.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "heartbeat",
  activeSession,
  usage: {
    dailyUsedMs: 0,
    translatedMessagesInCurrentMinute: 0,
    providerBudgetAvailable: true,
    globalBudgetAvailable: true,
    aiBudgetAvailable: true,
    translationProviderAvailable: true
  },
  adapter: wiring.createDeterministicCommentTranslatorBoundedLiveChatPollingAdapter({
    pollSteps: []
  }),
  nowMs: activeSession.startedAtMs
});
assert.equal(missingState.status, "unavailable-missing-server-only-polling-state");
assert.equal(missingState.providerSignal, "stream-unavailable");
assert.equal(missingState.providerAccess, "not-run");

const seedSkipped = wiring.seedCommentTranslatorBoundedLiveChatPollingStateForActiveSession({
  state: { ...activeBrowserState, status: "stopped", stoppedAtIso: "2026-06-15T00:00:00.000Z", stopReason: "user-stop", nextAction: "session-stopped", providerApiUsage: "stopped", aiTranslationUsage: "stopped", providerErrorBody: "never-returned-by-design" },
  liveChatTargetReadiness: readyTarget,
  nowMs: activeSession.startedAtMs
});
assert.equal(seedSkipped.status, "skipped-non-active-session");

const seedResult = wiring.seedCommentTranslatorBoundedLiveChatPollingStateForActiveSession({
  state: activeBrowserState,
  liveChatTargetReadiness: readyTarget,
  nowMs: activeSession.startedAtMs
});
assert.equal(seedResult.status, "seeded");
assert.equal(seedResult.liveTargetHandling, "server-only-active-session-state");
assert.equal(seedResult.nextPageToken, "absent");
assert.doesNotMatch(JSON.stringify(seedResult), /server-only-live-target-never-output|server-only-broadcast-never-output|liveChatId/i);

const quotaBlocked = await wiring.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "heartbeat",
  activeSession,
  usage: {
    dailyUsedMs: 0,
    translatedMessagesInCurrentMinute: 30,
    providerBudgetAvailable: true,
    globalBudgetAvailable: true,
    aiBudgetAvailable: true,
    translationProviderAvailable: true,
    planEntitlement: session.createCommentTranslatorSessionPlanEntitlement({ plan: "free" })
  },
  adapter: wiring.createDeterministicCommentTranslatorBoundedLiveChatPollingAdapter({
    pollSteps: [
      {
        type: "messages",
        receivedAtMs: activeSession.startedAtMs,
        nextPageToken: "must-not-be-used",
        pollingIntervalMillis: 1000,
        comments: []
      }
    ]
  }),
  nowMs: activeSession.startedAtMs
});
assert.equal(quotaBlocked.status, "skipped-quota-budget-stop-handoff");
assert.equal(quotaBlocked.providerAccess, "not-run");
assert.equal(quotaBlocked.stopReason, "translated-message-cap");

const notDue = await wiring.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "heartbeat",
  activeSession,
  usage: {
    dailyUsedMs: 0,
    translatedMessagesInCurrentMinute: 0,
    providerBudgetAvailable: true,
    globalBudgetAvailable: true,
    aiBudgetAvailable: true,
    translationProviderAvailable: true
  },
  adapter: wiring.createDeterministicCommentTranslatorBoundedLiveChatPollingAdapter({
    pollSteps: []
  }),
  nowMs: activeSession.startedAtMs - 1
});
assert.equal(notDue.status, "skipped-not-due");
assert.equal(notDue.providerAccess, "not-run");

const emptyAdapter = wiring.createDeterministicCommentTranslatorBoundedLiveChatPollingAdapter({
  pollSteps: [
    {
      type: "messages",
      receivedAtMs: activeSession.startedAtMs,
      nextPageToken: "server-only-next-page-token-never-output",
      pollingIntervalMillis: 2500,
      comments: []
    }
  ]
});
const emptyResult = await wiring.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "heartbeat",
  activeSession,
  usage: {
    dailyUsedMs: 0,
    translatedMessagesInCurrentMinute: 0,
    providerBudgetAvailable: true,
    globalBudgetAvailable: true,
    aiBudgetAvailable: true,
    translationProviderAvailable: true
  },
  adapter: emptyAdapter,
  nowMs: activeSession.startedAtMs
});
assert.equal(emptyResult.status, "empty-chat-waiting");
assert.equal(emptyResult.providerSignal, null);
assert.equal(emptyResult.sanitizedPolling.nextPageToken, "present");
assert.equal(emptyResult.sanitizedPolling.pollingIntervalMillis, 2500);
assert.equal(emptyResult.sanitizedPolling.returnedCommentCount, 0);
assert.doesNotMatch(JSON.stringify(emptyResult), /server-only-next-page-token-never-output|server-only-live-target-never-output|liveChatId/i);

wiring.resetCommentTranslatorBoundedLiveChatPollingStateForTests();
wiring.seedCommentTranslatorBoundedLiveChatPollingStateForActiveSession({
  state: activeBrowserState,
  liveChatTargetReadiness: readyTarget,
  nowMs: activeSession.startedAtMs
});
const messagesResult = await wiring.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "heartbeat",
  activeSession,
  usage: {
    dailyUsedMs: 0,
    translatedMessagesInCurrentMinute: 0,
    providerBudgetAvailable: true,
    globalBudgetAvailable: true,
    aiBudgetAvailable: true,
    translationProviderAvailable: true
  },
  adapter: wiring.createDeterministicCommentTranslatorBoundedLiveChatPollingAdapter({
    pollSteps: [
      {
        type: "messages",
        receivedAtMs: activeSession.startedAtMs + 2500,
        nextPageToken: null,
        pollingIntervalMillis: 5000,
        comments: [
          {
            id: "comment-never-output",
            publishedAt: "2026-06-15T00:00:02.000Z",
            text: "raw text never output",
            platformLanguageHint: "ja"
          }
        ]
      }
    ]
  }),
  nowMs: activeSession.startedAtMs + 2500
});
assert.equal(messagesResult.status, "cursor-primed-existing-comments-skipped");
assert.equal(messagesResult.sanitizedPolling.returnedCommentCount, 1);
assert.equal(messagesResult.sanitizedPolling.acceptedCount, 0);
assert.equal(messagesResult.sanitizedPolling.preStartSkippedCount, 1);
assert.equal(messagesResult.sanitizedPolling.skippedCount, 1);
assert.equal(messagesResult.sanitizedPolling.pollTickStatus, "polled");
assert.equal(messagesResult.sanitizedPolling.nextPollDue, "waiting");
assert.equal(messagesResult.sanitizedPolling.rawComments, "not-returned-by-design");
assert.doesNotMatch(JSON.stringify(messagesResult), /comment-never-output|raw text never output|server-only-live-target-never-output|liveChatId/i);

const duplicateOnlyResult = await wiring.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "heartbeat",
  activeSession,
  usage: {
    dailyUsedMs: 0,
    translatedMessagesInCurrentMinute: 0,
    providerBudgetAvailable: true,
    globalBudgetAvailable: true,
    aiBudgetAvailable: true,
    translationProviderAvailable: true
  },
  adapter: wiring.createDeterministicCommentTranslatorBoundedLiveChatPollingAdapter({
    pollSteps: [
      {
        type: "messages",
        receivedAtMs: activeSession.startedAtMs + 7500,
        nextPageToken: "server-only-next-page-token-after-duplicate",
        pollingIntervalMillis: 1000,
        comments: [
          {
            id: "comment-never-output",
            publishedAt: "2026-06-15T00:00:02.000Z",
            text: "raw text never output",
            platformLanguageHint: "ja"
          }
        ]
      }
    ]
  }),
  nowMs: activeSession.startedAtMs + 7500
});
assert.equal(duplicateOnlyResult.status, "empty-chat-waiting");
assert.equal(duplicateOnlyResult.sanitizedPolling.returnedCommentCount, 1);
assert.equal(duplicateOnlyResult.sanitizedPolling.acceptedCount, 0);
assert.equal(duplicateOnlyResult.sanitizedPolling.skippedCount, 1);
assert.deepEqual(duplicateOnlyResult.sanitizedPolling.skipReasonCounts, [{ reason: "duplicate", count: 1 }]);
assert.equal(duplicateOnlyResult.serverOnlyCommentsForTranslation.length, 0);
assert.doesNotMatch(JSON.stringify(duplicateOnlyResult), /comment-never-output|raw text never output|server-only-next-page-token-after-duplicate/i);

const afterDuplicateResult = await wiring.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "heartbeat",
  activeSession,
  usage: {
    dailyUsedMs: 0,
    translatedMessagesInCurrentMinute: 0,
    providerBudgetAvailable: true,
    globalBudgetAvailable: true,
    aiBudgetAvailable: true,
    translationProviderAvailable: true
  },
  adapter: wiring.createDeterministicCommentTranslatorBoundedLiveChatPollingAdapter({
    pollSteps: [
      {
        type: "messages",
        receivedAtMs: activeSession.startedAtMs + 8500,
        nextPageToken: "server-only-next-page-token-after-new-comments",
        pollingIntervalMillis: 1000,
        comments: [
          {
            id: "comment-new-b-never-output",
            publishedAt: "2026-06-15T00:00:08.000Z",
            text: "new B raw text never output",
            platformLanguageHint: "en"
          },
          {
            id: "comment-new-c-never-output",
            publishedAt: "2026-06-15T00:00:09.000Z",
            text: "new C raw text never output",
            platformLanguageHint: "en"
          },
          {
            id: "comment-new-d-never-output",
            publishedAt: "2026-06-15T00:00:10.000Z",
            text: "new D raw text never output",
            platformLanguageHint: "en"
          }
        ]
      }
    ]
  }),
  nowMs: activeSession.startedAtMs + 8500
});
assert.equal(afterDuplicateResult.status, "polled-comments-available");
assert.equal(afterDuplicateResult.sanitizedPolling.returnedCommentCount, 3);
assert.equal(afterDuplicateResult.sanitizedPolling.acceptedCount, 3);
assert.equal(afterDuplicateResult.sanitizedPolling.skippedCount, 0);
assert.equal(afterDuplicateResult.serverOnlyCommentsForTranslation.length, 3);
assert.doesNotMatch(JSON.stringify(afterDuplicateResult), /comment-new-b-never-output|new B raw text never output|server-only-next-page-token-after-new-comments/i);

wiring.resetCommentTranslatorBoundedLiveChatPollingStateForTests();
wiring.seedCommentTranslatorBoundedLiveChatPollingStateForActiveSession({
  state: activeBrowserState,
  liveChatTargetReadiness: readyTarget,
  nowMs: activeSession.startedAtMs
});
const retryAdapter = wiring.createDeterministicCommentTranslatorBoundedLiveChatPollingAdapter({
  pollSteps: [
    {
      type: "recoverable-error",
      code: "temporaryUnavailable",
      receivedAtMs: activeSession.startedAtMs,
      pollingIntervalMillis: 1000,
      retryAfterMs: null
    },
    {
      type: "recoverable-error",
      code: "networkTimeout",
      receivedAtMs: activeSession.startedAtMs + 1000,
      pollingIntervalMillis: 1000,
      retryAfterMs: null
    }
  ]
});
const firstRetry = await wiring.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "heartbeat",
  activeSession,
  usage: {
    dailyUsedMs: 0,
    translatedMessagesInCurrentMinute: 0,
    providerBudgetAvailable: true,
    globalBudgetAvailable: true,
    aiBudgetAvailable: true,
    translationProviderAvailable: true
  },
  adapter: retryAdapter,
  nowMs: activeSession.startedAtMs,
  maxRecoverableRetries: 1
});
assert.equal(firstRetry.status, "recoverable-backoff-scheduled");
assert.equal(firstRetry.providerSignal, null);
assert.equal(firstRetry.sanitizedPolling.retryCount, 1);

const cappedRetry = await wiring.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "heartbeat",
  activeSession,
  usage: {
    dailyUsedMs: 0,
    translatedMessagesInCurrentMinute: 0,
    providerBudgetAvailable: true,
    globalBudgetAvailable: true,
    aiBudgetAvailable: true,
    translationProviderAvailable: true
  },
  adapter: retryAdapter,
  nowMs: activeSession.startedAtMs + 1000,
  maxRecoverableRetries: 1
});
assert.equal(cappedRetry.status, "bounded-retry-exhausted");
assert.equal(cappedRetry.providerSignal, "terminal-provider-error");
assert.equal(cappedRetry.sanitizedPolling.retryCount, 2);

wiring.resetCommentTranslatorBoundedLiveChatPollingStateForTests();
wiring.seedCommentTranslatorBoundedLiveChatPollingStateForActiveSession({
  state: activeBrowserState,
  liveChatTargetReadiness: readyTarget,
  nowMs: activeSession.startedAtMs
});
const terminalEnded = await wiring.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "heartbeat",
  activeSession,
  usage: {
    dailyUsedMs: 0,
    translatedMessagesInCurrentMinute: 0,
    providerBudgetAvailable: true,
    globalBudgetAvailable: true,
    aiBudgetAvailable: true,
    translationProviderAvailable: true
  },
  adapter: wiring.createDeterministicCommentTranslatorBoundedLiveChatPollingAdapter({
    pollSteps: [
      {
        type: "terminal",
        code: "liveChatEnded",
        receivedAtMs: activeSession.startedAtMs
      }
    ]
  }),
  nowMs: activeSession.startedAtMs
});
assert.equal(terminalEnded.status, "terminal-state-handoff");
assert.equal(terminalEnded.providerSignal, "stream-ended");

const stoppedByProviderSignal = await session.readCommentTranslatorSessionCommand({
  intent: "heartbeat",
  nowMs: activeSession.startedAtMs + 10_000,
  plan: "free",
  callerAuthorization: {
    status: "authorized",
    ownerUserId: "server-only-owner-reference"
  },
  credentialReadiness: {
    status: "ready",
    credentialReferenceId: activeSession.credentialReferenceId
  },
  activeSession,
  usage: {
    dailyUsedMs: 0,
    translatedMessagesInCurrentMinute: 0,
    providerBudgetAvailable: true,
    globalBudgetAvailable: true,
    aiBudgetAvailable: true,
    translationProviderAvailable: true
  },
  providerSignal: terminalEnded.providerSignal,
  createSessionReferenceId: () => "unused"
});
assert.equal(stoppedByProviderSignal.status, "stopped");
assert.equal(stoppedByProviderSignal.stopReason, "stream-ended");
assert.doesNotMatch(JSON.stringify(stoppedByProviderSignal), /server-only-live-target-never-output|ownerUserId|providerChannelId|liveChatId/i);

for (const payload of [
  skippedNoActive,
  missingState,
  seedResult,
  quotaBlocked,
  notDue,
  emptyResult,
  messagesResult,
  duplicateOnlyResult,
  afterDuplicateResult,
  firstRetry,
  cappedRetry,
  terminalEnded,
  stoppedByProviderSignal
]) {
  const serialized = JSON.stringify(payload);
  assert.doesNotMatch(serialized, /access_token|refresh_token|authorization_code|Authorization|service_role/i);
  assert.doesNotMatch(serialized, /server-only-live-target-never-output|server-only-broadcast-never-output|server-only-next-page-token-never-output/i);
  assert.doesNotMatch(serialized, /ownerUserId|providerChannelId|raw text never output|comment-never-output/i);
}

for (const source of [
  wiringSource,
  sessionRuntimeSource,
  routeSource,
  actionSource,
  targetLookupSource,
  durableUsageSource,
  readinessDoc,
  gapAudit,
  sessionStartReadiness,
  taskSource
]) {
  assert.doesNotMatch(
    source,
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+/i,
    "F7 inspected source excludes secret values, token values, authorization values, and private provider identifiers"
  );
}

const allowedChangedFiles = new Set([
  wiringPath,
  "lib/comment-translator-azure-normal-translation-execution.ts",
  "lib/comment-translator-provider-execution-runtime.ts",
  "lib/comment-translator-youtube-live-provider-runtime-adapter.ts",
  "lib/comment-translator-live-provider-session-step.ts",
  "lib/comment-translator-live-message-normalization.ts",
  "lib/comment-translator-real-comments-feed-shared.ts",
  "lib/comment-translator-real-comments-ui-wiring.ts",
  "lib/comment-translator-server-only-live-chat-target-lookup.ts",
  sessionRuntimePath,
  routePath,
  actionPath,
  "components/comment-translator/CommentTranslatorDock.tsx",
  readinessDocPath,
  gapAuditPath,
  "scripts/comment-translator-bounded-live-chat-polling-wiring-contract.mjs",
  "scripts/comment-translator-azure-normal-translation-execution-contract.mjs",
  "scripts/comment-translator-durable-usage-counter-schema-adapter-contract.mjs",
  "scripts/comment-translator-free-beta-usage-display-contract.mjs",
  "scripts/comment-translator-provider-execution-runtime-contract.mjs",
  "scripts/comment-translator-public-operator-session-ui-contract.mjs",
  "scripts/comment-translator-real-comments-ui-wiring-contract.mjs",
  "scripts/comment-translator-session-start-stop-contract.mjs",
  "scripts/comment-translator-ui-live-provider-runtime-contract.mjs",
  "scripts/comment-translator-usage-quota-budget-ledger-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-feed-bridge-session-persistence-contract.mjs",
  taskPath
]);
for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `F7 change stays in allowed files: ${file}`);
}

console.log("comment translator bounded live chat polling wiring contract checks passed");
