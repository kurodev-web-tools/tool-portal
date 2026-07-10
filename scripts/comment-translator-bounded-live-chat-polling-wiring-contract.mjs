import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const wiringPath = "lib/comment-translator-bounded-live-chat-polling-wiring.ts";
const outcomeProjectionPath = "lib/comment-translator-bounded-live-chat-polling-outcome-projection.ts";
const pollingTypesPath = "lib/comment-translator-bounded-live-chat-polling-types.ts";
const resultProjectionPath = "lib/comment-translator-bounded-live-chat-polling-result-projection.ts";
const terminalPolicyPath = "lib/comment-translator-bounded-live-chat-polling-terminal-policy.ts";
const staticWiringPath = "lib/comment-translator-bounded-live-chat-polling-static-wiring.ts";
const pollingRegistryPath = "lib/comment-translator-bounded-live-chat-polling-registry.ts";
const pollingTransitionPath = "lib/comment-translator-bounded-live-chat-polling-transition.ts";
const liveProviderResultPath = "lib/comment-translator-live-provider-session-step-result.ts";
const liveProviderStepPath = "lib/comment-translator-live-provider-session-step.ts";
const ratePausePath = "lib/comment-translator-per-minute-rate-pause.ts";
const sessionRuntimePath = "lib/comment-translator-session-runtime.ts";
const commandExecutionPath = "lib/comment-translator-session-command-execution.ts";
const routePath = "app/api/comment-translator/session/route.ts";
const actionPath = "app/tools/comment-translator/actions.ts";
const sessionActionsPath = "app/tools/comment-translator/session-actions.ts";
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

function countPureLoc(source) {
  return source.split(/\r?\n/).filter((line) => line.trim() && !line.trim().startsWith("//")).length;
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
    const sourceForCompilation =
      normalizedModulePath === path.normalize(path.join(root, wiringPath))
        ? `${source}\nexport function readCoordinatorEntryCountsForContract() { return pollingCoordinatorRegistry.readEntryCountsForTests(); }`
        : source;
    const compiled = ts.transpileModule(sourceForCompilation, {
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
  outcomeProjectionPath,
  pollingTypesPath,
  resultProjectionPath,
  terminalPolicyPath,
  staticWiringPath,
  pollingRegistryPath,
  pollingTransitionPath,
  liveProviderResultPath,
  liveProviderStepPath,
  ratePausePath,
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
const outcomeProjectionSource = read(outcomeProjectionPath);
const pollingTypesSource = read(pollingTypesPath);
const resultProjectionSource = read(resultProjectionPath);
const terminalPolicySource = read(terminalPolicyPath);
const staticWiringSource = read(staticWiringPath);
const pollingRegistrySource = read(pollingRegistryPath);
const pollingTransitionSource = read(pollingTransitionPath);
const liveProviderResultSource = read(liveProviderResultPath);
const liveProviderStepSource = read(liveProviderStepPath);
const ratePauseSource = read(ratePausePath);
const sessionRuntimeSource = read(sessionRuntimePath);
const commandExecutionSource = read(commandExecutionPath);
const routeSource = read(routePath);
const actionSource = read(actionPath);
const sessionActionsSource = read(sessionActionsPath);
const youtubeRuntimeSource = read(youtubeRuntimePath);
const targetLookupSource = read(targetLookupPath);
const durableUsageSource = read(durableUsagePath);
const readinessDoc = read(readinessDocPath);
const gapAudit = read(gapAuditPath);
const sessionStartReadiness = read(sessionStartReadinessPath);
const taskSource = read(taskPath);

assert.match(wiringSource, /^import "server-only";/m, "F7 bounded polling wiring is server-only");
assert.match(outcomeProjectionSource, /^import "server-only";/m, "F7 outcome projection is server-only");
assert.match(wiringSource, /comment-translator-bounded-live-chat-polling-types/, "F7 facade re-exports public polling types");
assert.match(wiringSource, /comment-translator-bounded-live-chat-polling-transition/, "F7 facade delegates serialized transitions");
for (const projectionSymbol of [
  "createSanitizedPollingMetadata",
  "resolvePollingSuccessStatus",
  "createQuotaBudgetStopHandoff"
]) {
  assert.match(resultProjectionSource, new RegExp(`export function ${projectionSymbol}`), `F7 result projection owns ${projectionSymbol}`);
}
for (const policySymbol of ["assessPollingTerminalStopReason", "mapTerminalCodeToStopReason"]) {
  assert.match(terminalPolicySource, new RegExp(`export function ${policySymbol}`), `F7 terminal policy owns ${policySymbol}`);
}
for (const source of [wiringSource, pollingTypesSource, resultProjectionSource, terminalPolicySource, staticWiringSource, pollingRegistrySource, pollingTransitionSource]) {
  assert.doesNotMatch(source, /allow:\s*SIZE_OK/, "F7 Task 3 TypeScript units carry no oversized-file exception");
}
assert.match(wiringSource, /commentTranslatorBoundedLiveChatPollingWiringContract/, "F7 wiring exposes a focused contract");
assert.match(wiringSource, /seedCommentTranslatorBoundedLiveChatPollingStateForActiveSession/, "F7 wiring seeds server-only polling state only after active start");
assert.match(wiringSource, /readCommentTranslatorBoundedLiveChatPollingTick/, "F7 wiring exposes active-session polling tick");
assert.match(wiringSource, /createUnavailableCommentTranslatorBoundedLiveChatPollingAdapter/, "F7 wiring exposes not-run unavailable adapter");
assert.match(wiringSource, /createDeterministicCommentTranslatorBoundedLiveChatPollingAdapter/, "F7 wiring exposes deterministic local adapter");
assert.match(wiringSource, /clearCommentTranslatorBoundedLiveChatPollingState/, "F7 wiring clears server-only cursor state");
assert.match(staticWiringSource, /active-session-only/, "F7 records active-session-only polling");
assert.match(staticWiringSource, /nextPageToken-server-only/, "F7 records server-only cursor handling");
assert.match(staticWiringSource, /pollingIntervalMillis/, "F7 records provider polling interval handling");
assert.match(staticWiringSource, /bounded-retry-backoff/, "F7 records capped retry/backoff");
assert.match(staticWiringSource, /empty-chat-waiting/, "F7 records empty-chat behavior");
assert.match(staticWiringSource, /providerPollingExecution:\s*"not-run-in-this-thread"/, "F7 records live provider polling as not-run");
assert.match(wiringSource, /liveTargetHandling:\s*"server-only-active-session-state"/, "F7 keeps live target in server-only active-session state");
assert.match(pollingRegistrySource, /class CommentTranslatorBoundedLiveChatPollingRegistry/, "F7 registry is the single mutable state owner");
assert.match(pollingTransitionSource, /readSerializedCommentTranslatorBoundedLiveChatPollingTick/, "F7 transition module is the serialized state-machine owner");
assert.match(liveProviderResultSource, /createCommentTranslatorLiveProviderSessionStepResult/, "Task 3 live-provider result projection is isolated from orchestration");
for (const [file, source] of [
  [wiringPath, wiringSource],
  [outcomeProjectionPath, outcomeProjectionSource],
  [pollingTypesPath, pollingTypesSource],
  [resultProjectionPath, resultProjectionSource],
  [terminalPolicyPath, terminalPolicySource],
  [staticWiringPath, staticWiringSource],
  [pollingRegistryPath, pollingRegistrySource],
  [pollingTransitionPath, pollingTransitionSource],
  [liveProviderStepPath, liveProviderStepSource],
  [liveProviderResultPath, liveProviderResultSource],
  [ratePausePath, ratePauseSource]
]) {
  assert.doesNotMatch(source, /(?:readonly\s+)?#[A-Za-z_$]/, `Task 7 TypeScript unit remains compatible with the repository ES5 target: ${file}`);
  assert.ok(countPureLoc(source) <= 250, `Task 3 TypeScript unit stays at or below 250 pure LOC: ${file}`);
}

assert.match(sessionRuntimeSource, /providerSignal/, "session runtime accepts F7 provider signal");
assert.match(sessionRuntimeSource, /liveProviderExecution:\s*"not-run-in-f7"/, "session contract records F7 live provider execution not-run");
assert.match(routeSource, /executeCommentTranslatorSessionCommand/, "session route delegates F7 polling to shared command execution");
assert.match(actionSource, /session-actions/, "server action facade delegates session commands to the focused action owner");
assert.match(sessionActionsSource, /executeCommentTranslatorSessionCommand/, "server actions delegate F7 polling to shared command execution");
assert.match(commandExecutionSource, /readCommentTranslatorBoundedLiveChatPollingTick/, "shared command execution wires F7 polling tick");
assert.match(commandExecutionSource, /seedCommentTranslatorBoundedLiveChatPollingStateForActiveSession/, "shared command execution seeds F7 polling state after active start");
assert.match(commandExecutionSource, /createTrustedCommentTranslatorYouTubeLiveProviderRuntimeAdapter/, "shared command execution uses trusted live provider polling adapter");

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
const youtubeRuntime = loadTsModule(youtubeRuntimePath);

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

let pausedAdapterCallCount = 0;
const quotaBlocked = await wiring.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "heartbeat",
  activeSession,
  usage: {
    dailyUsedMs: 0,
    translatedMessagesInCurrentMinute: 30,
    translatedMessageCapacityAvailableAtMs: activeSession.startedAtMs + 30_000,
    providerBudgetAvailable: true,
    globalBudgetAvailable: true,
    aiBudgetAvailable: true,
    translationProviderAvailable: true,
    planEntitlement: session.createCommentTranslatorSessionPlanEntitlement({ plan: "free" })
  },
  adapter: {
    status: "ready",
    providerAccess: "deterministic-local-adapter-only",
    runtime: {
      async pollLiveChatOnce(state) {
        pausedAdapterCallCount += 1;
        return {
          state,
          comments: []
        };
      }
    }
  },
  nowMs: activeSession.startedAtMs
});
assert.equal(quotaBlocked.status, "rate-limit-paused");
assert.equal(quotaBlocked.providerAccess, "not-run");
assert.equal(quotaBlocked.providerSignal, null);
assert.equal(pausedAdapterCallCount, 0);
assert.equal("serverOnlyCommentsForTranslation" in quotaBlocked, false);
assert.equal(quotaBlocked.sanitizedPolling.nextPageToken, "absent");

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

function createCoordinatorSession(sessionReferenceId, nowMs) {
  return {
    sessionReferenceId,
    startedAtMs: nowMs - 10_000,
    lastHeartbeatAtMs: nowMs,
    credentialReferenceId: `credential-${sessionReferenceId}`
  };
}

function createCoordinatorUsage({
  translatedMessagesInCurrentMinute,
  translatedMessageCapacityAvailableAtMs = null,
  planEntitlement = session.createCommentTranslatorSessionPlanEntitlement({ plan: "free" }),
  overrides = {}
}) {
  return {
    dailyUsedMs: 0,
    currentSessionElapsedMs: 10_000,
    translatedMessagesInCurrentMinute,
    translatedMessageCapacityAvailableAtMs,
    monthlyProviderInputCharacterEstimate: 0,
    providerBudgetAvailable: true,
    globalBudgetAvailable: true,
    aiBudgetAvailable: true,
    translationProviderAvailable: true,
    planEntitlement,
    ...overrides
  };
}

function seedCoordinatorSession(activeCoordinatorSession, nowMs) {
  return wiring.seedCommentTranslatorBoundedLiveChatPollingStateForActiveSession({
    state: {
      status: "active",
      sessionReferenceId: activeCoordinatorSession.sessionReferenceId
    },
    liveChatTargetReadiness: readyTarget,
    nowMs
  });
}

function createDeferred() {
  let resolvePromise;
  const promise = new Promise((resolve) => {
    resolvePromise = resolve;
  });
  return {
    promise,
    resolve(value) {
      resolvePromise(value);
    }
  };
}

const coordinatorNowMs = Date.parse("2026-06-15T01:00:00.000Z");
const coordinatorSession = createCoordinatorSession("cts_rate_pause_coordinator", coordinatorNowMs);
wiring.resetCommentTranslatorBoundedLiveChatPollingStateForTests();
seedCoordinatorSession(coordinatorSession, coordinatorNowMs);

const oldCursorPrime = await wiring.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "heartbeat",
  activeSession: coordinatorSession,
  usage: createCoordinatorUsage({ translatedMessagesInCurrentMinute: 0 }),
  adapter: wiring.createDeterministicCommentTranslatorBoundedLiveChatPollingAdapter({
    pollSteps: [
      {
        type: "messages",
        receivedAtMs: coordinatorNowMs,
        nextPageToken: "server-only-old-cursor",
        pollingIntervalMillis: 1_000,
        comments: [
          {
            id: "pre-pause-comment",
            publishedAt: "2026-06-15T01:00:00.000Z",
            text: "pre pause comment",
            platformLanguageHint: "en"
          }
        ]
      }
    ]
  }),
  nowMs: coordinatorNowMs
});
assert.equal(oldCursorPrime.status, "cursor-primed-existing-comments-skipped");

let ratePauseAdapterCallCount = 0;
const capacityAvailableAtMs = coordinatorNowMs + 20_000;
const ratePauseAdapter = {
  status: "ready",
  providerAccess: "deterministic-local-adapter-only",
  runtime: {
    async pollLiveChatOnce(state) {
      ratePauseAdapterCallCount += 1;
      return { state, comments: [] };
    }
  }
};
const firstRatePause = await wiring.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "heartbeat",
  activeSession: coordinatorSession,
  usage: createCoordinatorUsage({
    translatedMessagesInCurrentMinute: 30,
    translatedMessageCapacityAvailableAtMs: capacityAvailableAtMs
  }),
  adapter: ratePauseAdapter,
  nowMs: coordinatorNowMs + 1_000
});
assert.equal(firstRatePause.status, "rate-limit-paused");
assert.equal(firstRatePause.providerSignal, null);
assert.equal(ratePauseAdapterCallCount, 0);
assert.equal("serverOnlyCommentsForTranslation" in firstRatePause, false);
assert.equal(firstRatePause.sanitizedPolling.nextPageToken, "absent");
assert.deepEqual(firstRatePause.phaseProjection, {
  activePhase: "rate-paused",
  ratePauseReason: "translated-message-cap",
  retryAfterSeconds: 19,
  automaticResumeExpected: true
});

const repeatedRatePause = await wiring.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "heartbeat",
  activeSession: coordinatorSession,
  usage: createCoordinatorUsage({
    translatedMessagesInCurrentMinute: 30,
    translatedMessageCapacityAvailableAtMs: capacityAvailableAtMs
  }),
  adapter: ratePauseAdapter,
  nowMs: coordinatorNowMs + 5_000
});
assert.equal(repeatedRatePause.status, "rate-limit-paused");
assert.equal(repeatedRatePause.phaseProjection.activePhase, "rate-paused");
assert.equal(repeatedRatePause.phaseProjection.retryAfterSeconds, 15);
assert.equal(ratePauseAdapterCallCount, 0);
assert.deepEqual(
  wiring.readCommentTranslatorBoundedLiveChatPollingPhaseProjection(coordinatorSession.sessionReferenceId),
  repeatedRatePause.phaseProjection,
  "Given a paused session, when reading the projection, then the read-only sanitized phase is returned without provider work"
);

let recoveryPrimeCallCount = 0;
const recoveryPrimeInputs = [];
const recoveryPrimeAdapter = {
  status: "ready",
  providerAccess: "deterministic-local-adapter-only",
  runtime: {
    async pollLiveChatOnce(state) {
      recoveryPrimeCallCount += 1;
      recoveryPrimeInputs.push({
        nextPageToken: state.nextPageToken,
        nextPollAfterMs: state.nextPollAfterMs
      });
      return youtubeRuntime.advanceYouTubeLiveChatPollingState(state, {
        type: "messages",
        receivedAtMs: capacityAvailableAtMs,
        nextPageToken: "server-only-recovery-cursor",
        pollingIntervalMillis: 1_000,
        comments: [
          {
            id: "pause-window-comment",
            publishedAt: "2026-06-15T01:00:10.000Z",
            text: "pause window comment",
            platformLanguageHint: "en"
          }
        ]
      });
    }
  }
};
const recoveryUsage = createCoordinatorUsage({ translatedMessagesInCurrentMinute: 29 });
const [firstRecoveryPrime, joinedRecoveryPrime] = await Promise.all([
  wiring.readCommentTranslatorBoundedLiveChatPollingTick({
    intent: "heartbeat",
    activeSession: coordinatorSession,
    usage: recoveryUsage,
    adapter: recoveryPrimeAdapter,
    nowMs: capacityAvailableAtMs
  }),
  wiring.readCommentTranslatorBoundedLiveChatPollingTick({
    intent: "heartbeat",
    activeSession: coordinatorSession,
    usage: recoveryUsage,
    adapter: recoveryPrimeAdapter,
    nowMs: capacityAvailableAtMs
  })
]);
assert.equal(recoveryPrimeCallCount, 1, "Concurrent recovery calls share one in-flight prime");
assert.deepEqual(recoveryPrimeInputs, [{ nextPageToken: null, nextPollAfterMs: coordinatorNowMs + 1_000 }]);
assert.equal(firstRecoveryPrime.status, "cursor-primed-existing-comments-skipped");
assert.equal(joinedRecoveryPrime.status, "cursor-primed-existing-comments-skipped");
assert.equal(firstRecoveryPrime.serverOnlyCommentsForTranslation.length, 0);
assert.equal(firstRecoveryPrime.sanitizedPolling.preStartSkippedCount, 1);
assert.equal(
  wiring.readCommentTranslatorBoundedLiveChatPollingPhaseProjection(coordinatorSession.sessionReferenceId).activePhase,
  "running"
);

const postPrimePoll = await wiring.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "heartbeat",
  activeSession: coordinatorSession,
  usage: recoveryUsage,
  adapter: wiring.createDeterministicCommentTranslatorBoundedLiveChatPollingAdapter({
    pollSteps: [
      {
        type: "messages",
        receivedAtMs: capacityAvailableAtMs + 1_000,
        nextPageToken: "server-only-post-prime-cursor",
        pollingIntervalMillis: 1_000,
        comments: [
          {
            id: "post-prime-comment",
            publishedAt: "2026-06-15T01:00:21.000Z",
            text: "post prime comment",
            platformLanguageHint: "en"
          }
        ]
      }
    ]
  }),
  nowMs: capacityAvailableAtMs + 1_000
});
assert.equal(postPrimePoll.status, "polled-comments-available");
assert.equal(postPrimePoll.serverOnlyCommentsForTranslation.length, 1);

const serializedSession = createCoordinatorSession("cts_serialized_pause", coordinatorNowMs);
wiring.resetCommentTranslatorBoundedLiveChatPollingStateForTests();
seedCoordinatorSession(serializedSession, coordinatorNowMs);
await wiring.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "heartbeat",
  activeSession: serializedSession,
  usage: createCoordinatorUsage({ translatedMessagesInCurrentMinute: 0 }),
  adapter: wiring.createDeterministicCommentTranslatorBoundedLiveChatPollingAdapter({
    pollSteps: [
      {
        type: "messages",
        receivedAtMs: coordinatorNowMs,
        nextPageToken: "server-only-held-old-cursor",
        pollingIntervalMillis: 1_000,
        comments: []
      }
    ]
  }),
  nowMs: coordinatorNowMs
});
const heldOldCursorPoll = createDeferred();
const oldCursorAdapterInputs = [];
const oldCursorInFlight = wiring.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "heartbeat",
  activeSession: serializedSession,
  usage: createCoordinatorUsage({ translatedMessagesInCurrentMinute: 0 }),
  adapter: {
    status: "ready",
    providerAccess: "deterministic-local-adapter-only",
    runtime: {
      async pollLiveChatOnce(state) {
        oldCursorAdapterInputs.push(state.nextPageToken);
        return heldOldCursorPoll.promise;
      }
    }
  },
  nowMs: coordinatorNowMs + 1_000
});
let joinedCapAdapterCallCount = 0;
const cappedJoin = wiring.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "heartbeat",
  activeSession: serializedSession,
  usage: createCoordinatorUsage({
    translatedMessagesInCurrentMinute: 30,
    translatedMessageCapacityAvailableAtMs: coordinatorNowMs + 10_000
  }),
  adapter: {
    status: "ready",
    providerAccess: "deterministic-local-adapter-only",
    runtime: {
      async pollLiveChatOnce(state) {
        joinedCapAdapterCallCount += 1;
        return { state, comments: [] };
      }
    }
  },
  nowMs: coordinatorNowMs + 1_000
});
assert.deepEqual(oldCursorAdapterInputs, ["server-only-held-old-cursor"]);
assert.equal(joinedCapAdapterCallCount, 0);
heldOldCursorPoll.resolve(
  youtubeRuntime.advanceYouTubeLiveChatPollingState(
    {
      liveChatId: "server-only-live-target-never-output",
      nextPageToken: "server-only-held-old-cursor",
      retryCount: 0,
      nextPollAfterMs: coordinatorNowMs + 1_000,
      terminal: null
    },
    {
      type: "messages",
      receivedAtMs: coordinatorNowMs + 1_000,
      nextPageToken: "server-only-completed-old-cursor",
      pollingIntervalMillis: 1_000,
      comments: []
    }
  )
);
const [completedOldCursorTick, joinedOldCursorTick] = await Promise.all([oldCursorInFlight, cappedJoin]);
assert.equal(completedOldCursorTick.status, "empty-chat-waiting");
assert.equal(joinedOldCursorTick.status, "empty-chat-waiting");

const serializedPause = await wiring.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "heartbeat",
  activeSession: serializedSession,
  usage: createCoordinatorUsage({
    translatedMessagesInCurrentMinute: 30,
    translatedMessageCapacityAvailableAtMs: coordinatorNowMs + 10_000
  }),
  adapter: ratePauseAdapter,
  nowMs: coordinatorNowMs + 2_000
});
assert.equal(serializedPause.status, "rate-limit-paused");
const serializedRecoveryInputs = [];
await wiring.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "heartbeat",
  activeSession: serializedSession,
  usage: createCoordinatorUsage({ translatedMessagesInCurrentMinute: 29 }),
  adapter: {
    status: "ready",
    providerAccess: "deterministic-local-adapter-only",
    runtime: {
      async pollLiveChatOnce(state) {
        serializedRecoveryInputs.push(state.nextPageToken);
        return youtubeRuntime.advanceYouTubeLiveChatPollingState(state, {
          type: "messages",
          receivedAtMs: coordinatorNowMs + 10_000,
          nextPageToken: "server-only-fresh-cursor",
          pollingIntervalMillis: 1_000,
          comments: []
        });
      }
    }
  },
  nowMs: coordinatorNowMs + 10_000
});
assert.deepEqual(serializedRecoveryInputs, [null], "Every adapter input after pause entry uses a fresh null cursor");

const staleSession = createCoordinatorSession("cts_stale_generation", coordinatorNowMs);
wiring.resetCommentTranslatorBoundedLiveChatPollingStateForTests();
seedCoordinatorSession(staleSession, coordinatorNowMs);
const staleCompletion = createDeferred();
const staleTick = wiring.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "heartbeat",
  activeSession: staleSession,
  usage: createCoordinatorUsage({ translatedMessagesInCurrentMinute: 0 }),
  adapter: {
    status: "ready",
    providerAccess: "deterministic-local-adapter-only",
    runtime: {
      async pollLiveChatOnce() {
        return staleCompletion.promise;
      }
    }
  },
  nowMs: coordinatorNowMs
});
wiring.clearCommentTranslatorBoundedLiveChatPollingState(staleSession.sessionReferenceId);
staleCompletion.resolve({
  state: {
    liveChatId: "server-only-stale-target",
    nextPageToken: "server-only-stale-cursor",
    retryCount: 0,
    nextPollAfterMs: coordinatorNowMs + 1_000,
    terminal: null
  },
  comments: [
    {
      commentId: "stale-comment",
      publishedAt: "2026-06-15T01:00:00.000Z",
      text: "stale comment",
      platformLanguageHint: "en",
      authorDisplayName: null
    }
  ]
});
const staleResult = await staleTick;
assert.equal(staleResult.status, "stale-completion-discarded");
assert.equal(staleResult.providerSignal, null);
assert.equal("serverOnlyCommentsForTranslation" in staleResult, false);
const afterStaleRead = await wiring.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "heartbeat",
  activeSession: staleSession,
  usage: createCoordinatorUsage({ translatedMessagesInCurrentMinute: 0 }),
  adapter: ratePauseAdapter,
  nowMs: coordinatorNowMs + 1_000
});
assert.equal(afterStaleRead.status, "unavailable-missing-server-only-polling-state");

const resetStaleSession = createCoordinatorSession("cts_reset_stale_generation", coordinatorNowMs);
wiring.resetCommentTranslatorBoundedLiveChatPollingStateForTests();
seedCoordinatorSession(resetStaleSession, coordinatorNowMs);
const resetStaleCompletion = createDeferred();
const resetStaleTick = wiring.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "heartbeat",
  activeSession: resetStaleSession,
  usage: createCoordinatorUsage({ translatedMessagesInCurrentMinute: 0 }),
  adapter: {
    status: "ready",
    providerAccess: "deterministic-local-adapter-only",
    runtime: {
      async pollLiveChatOnce() {
        return resetStaleCompletion.promise;
      }
    }
  },
  nowMs: coordinatorNowMs
});
wiring.resetCommentTranslatorBoundedLiveChatPollingStateForTests();
resetStaleCompletion.resolve({
  state: {
    liveChatId: "server-only-reset-stale-target",
    nextPageToken: "server-only-reset-stale-cursor",
    retryCount: 0,
    nextPollAfterMs: coordinatorNowMs + 1_000,
    terminal: null
  },
  comments: []
});
assert.equal((await resetStaleTick).status, "stale-completion-discarded");
assert.equal(
  wiring.readCommentTranslatorBoundedLiveChatPollingPhaseProjection(resetStaleSession.sessionReferenceId).activePhase,
  "running"
);

const clearedGenerationSession = createCoordinatorSession("cts_cleared_generation", coordinatorNowMs);
wiring.resetCommentTranslatorBoundedLiveChatPollingStateForTests();
seedCoordinatorSession(clearedGenerationSession, coordinatorNowMs);
assert.equal(wiring.readCoordinatorEntryCountsForContract().generation, 1);
wiring.clearCommentTranslatorBoundedLiveChatPollingState(clearedGenerationSession.sessionReferenceId);
assert.deepEqual(wiring.readCoordinatorEntryCountsForContract(), {
  generation: 0,
  pollingState: 0,
  phase: 0,
  inFlight: 0
});

const endedGenerationSession = createCoordinatorSession("cts_ended_generation", coordinatorNowMs);
wiring.resetCommentTranslatorBoundedLiveChatPollingStateForTests();
seedCoordinatorSession(endedGenerationSession, coordinatorNowMs);
const endedGenerationResult = await wiring.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "heartbeat",
  activeSession: endedGenerationSession,
  usage: createCoordinatorUsage({ translatedMessagesInCurrentMinute: 0 }),
  adapter: wiring.createDeterministicCommentTranslatorBoundedLiveChatPollingAdapter({
    pollSteps: [
      {
        type: "terminal",
        code: "liveChatEnded",
        receivedAtMs: coordinatorNowMs
      }
    ]
  }),
  nowMs: coordinatorNowMs
});
assert.equal(endedGenerationResult.status, "terminal-state-handoff");
assert.deepEqual(wiring.readCoordinatorEntryCountsForContract(), {
  generation: 0,
  pollingState: 0,
  phase: 0,
  inFlight: 0
});

const stopRaceSession = createCoordinatorSession("cts_stop_generation_race", coordinatorNowMs);
wiring.resetCommentTranslatorBoundedLiveChatPollingStateForTests();
seedCoordinatorSession(stopRaceSession, coordinatorNowMs);
const stoppedCompletion = createDeferred();
const stoppedInFlightTick = wiring.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "heartbeat",
  activeSession: stopRaceSession,
  usage: createCoordinatorUsage({ translatedMessagesInCurrentMinute: 0 }),
  adapter: {
    status: "ready",
    providerAccess: "deterministic-local-adapter-only",
    runtime: {
      async pollLiveChatOnce() {
        return stoppedCompletion.promise;
      }
    }
  },
  nowMs: coordinatorNowMs
});
const stoppedWhileInFlight = await wiring.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "stop",
  activeSession: stopRaceSession,
  usage: createCoordinatorUsage({ translatedMessagesInCurrentMinute: 0 }),
  adapter: ratePauseAdapter,
  nowMs: coordinatorNowMs
});
assert.equal(stoppedWhileInFlight.status, "skipped-stop-intent");
assert.deepEqual(wiring.readCoordinatorEntryCountsForContract(), {
  generation: 1,
  pollingState: 0,
  phase: 0,
  inFlight: 1
});
seedCoordinatorSession(stopRaceSession, coordinatorNowMs + 1);
stoppedCompletion.resolve({
  state: {
    liveChatId: "server-only-stopped-old-target",
    nextPageToken: "server-only-stopped-old-cursor",
    retryCount: 0,
    nextPollAfterMs: coordinatorNowMs + 1_000,
    terminal: null
  },
  comments: []
});
assert.equal((await stoppedInFlightTick).status, "stale-completion-discarded");
assert.deepEqual(wiring.readCoordinatorEntryCountsForContract(), {
  generation: 1,
  pollingState: 1,
  phase: 1,
  inFlight: 0
});
wiring.clearCommentTranslatorBoundedLiveChatPollingState(stopRaceSession.sessionReferenceId);
assert.deepEqual(wiring.readCoordinatorEntryCountsForContract(), {
  generation: 0,
  pollingState: 0,
  phase: 0,
  inFlight: 0
});

const independentSessionA = createCoordinatorSession("cts_independent_a", coordinatorNowMs);
const independentSessionB = createCoordinatorSession("cts_independent_b", coordinatorNowMs);
wiring.resetCommentTranslatorBoundedLiveChatPollingStateForTests();
seedCoordinatorSession(independentSessionA, coordinatorNowMs);
seedCoordinatorSession(independentSessionB, coordinatorNowMs);
const independentDeferredA = createDeferred();
const independentDeferredB = createDeferred();
let independentCallCountA = 0;
let independentCallCountB = 0;
const independentTickA = wiring.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "heartbeat",
  activeSession: independentSessionA,
  usage: createCoordinatorUsage({ translatedMessagesInCurrentMinute: 0 }),
  adapter: {
    status: "ready",
    providerAccess: "deterministic-local-adapter-only",
    runtime: {
      async pollLiveChatOnce(state) {
        independentCallCountA += 1;
        await independentDeferredA.promise;
        return { state, comments: [] };
      }
    }
  },
  nowMs: coordinatorNowMs
});
const independentTickB = wiring.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "heartbeat",
  activeSession: independentSessionB,
  usage: createCoordinatorUsage({ translatedMessagesInCurrentMinute: 0 }),
  adapter: {
    status: "ready",
    providerAccess: "deterministic-local-adapter-only",
    runtime: {
      async pollLiveChatOnce(state) {
        independentCallCountB += 1;
        await independentDeferredB.promise;
        return { state, comments: [] };
      }
    }
  },
  nowMs: coordinatorNowMs
});
assert.equal(independentCallCountA, 1);
assert.equal(independentCallCountB, 1, "Different sessions do not block each other's polling tick");
independentDeferredA.resolve();
independentDeferredB.resolve();
await Promise.all([independentTickA, independentTickB]);

const failClosedPauseSession = createCoordinatorSession("cts_pause_fail_closed", coordinatorNowMs);
wiring.resetCommentTranslatorBoundedLiveChatPollingStateForTests();
seedCoordinatorSession(failClosedPauseSession, coordinatorNowMs);
const missingRecoveryAuthority = await wiring.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "heartbeat",
  activeSession: failClosedPauseSession,
  usage: createCoordinatorUsage({ translatedMessagesInCurrentMinute: 30 }),
  adapter: ratePauseAdapter,
  nowMs: coordinatorNowMs
});
assert.equal(missingRecoveryAuthority.status, "skipped-quota-budget-stop-handoff");
assert.equal(missingRecoveryAuthority.providerSignal, "global-budget-stop");

const terminalBoundarySession = createCoordinatorSession("cts_terminal_before_pause", coordinatorNowMs);
wiring.resetCommentTranslatorBoundedLiveChatPollingStateForTests();
seedCoordinatorSession(terminalBoundarySession, coordinatorNowMs);
const monthlyBoundaryBeforePause = await wiring.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "heartbeat",
  activeSession: terminalBoundarySession,
  usage: createCoordinatorUsage({
    translatedMessagesInCurrentMinute: 30,
    translatedMessageCapacityAvailableAtMs: coordinatorNowMs + 1_000,
    overrides: {
      monthlyProviderInputCharacterEstimate: 20_000
    }
  }),
  adapter: ratePauseAdapter,
  nowMs: coordinatorNowMs
});
assert.equal(monthlyBoundaryBeforePause.status, "skipped-quota-budget-stop-handoff");
assert.equal(monthlyBoundaryBeforePause.providerSignal, "ai-budget-stop");

const resyncRetrySession = createCoordinatorSession("cts_resync_retry", coordinatorNowMs);
wiring.resetCommentTranslatorBoundedLiveChatPollingStateForTests();
seedCoordinatorSession(resyncRetrySession, coordinatorNowMs);
await wiring.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "heartbeat",
  activeSession: resyncRetrySession,
  usage: createCoordinatorUsage({
    translatedMessagesInCurrentMinute: 30,
    translatedMessageCapacityAvailableAtMs: coordinatorNowMs + 1_000
  }),
  adapter: ratePauseAdapter,
  nowMs: coordinatorNowMs
});
const resyncRetryAdapter = wiring.createDeterministicCommentTranslatorBoundedLiveChatPollingAdapter({
  pollSteps: [
    {
      type: "recoverable-error",
      code: "temporaryUnavailable",
      receivedAtMs: coordinatorNowMs + 1_000,
      pollingIntervalMillis: 1_000,
      retryAfterMs: null
    },
    {
      type: "recoverable-error",
      code: "networkTimeout",
      receivedAtMs: coordinatorNowMs + 2_000,
      pollingIntervalMillis: 1_000,
      retryAfterMs: null
    }
  ]
});
const resyncRetry = await wiring.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "heartbeat",
  activeSession: resyncRetrySession,
  usage: createCoordinatorUsage({ translatedMessagesInCurrentMinute: 29 }),
  adapter: resyncRetryAdapter,
  nowMs: coordinatorNowMs + 1_000,
  maxRecoverableRetries: 1
});
assert.equal(resyncRetry.status, "recoverable-backoff-scheduled");
assert.equal(
  wiring.readCommentTranslatorBoundedLiveChatPollingPhaseProjection(resyncRetrySession.sessionReferenceId).activePhase,
  "resyncing"
);
const resyncExhausted = await wiring.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "heartbeat",
  activeSession: resyncRetrySession,
  usage: createCoordinatorUsage({ translatedMessagesInCurrentMinute: 29 }),
  adapter: resyncRetryAdapter,
  nowMs: coordinatorNowMs + 2_000,
  maxRecoverableRetries: 1
});
assert.equal(resyncExhausted.status, "bounded-retry-exhausted");
assert.equal(resyncExhausted.providerSignal, "terminal-provider-error");

const rejectingRecoverySession = createCoordinatorSession("cts_rejecting_recovery", coordinatorNowMs);
wiring.resetCommentTranslatorBoundedLiveChatPollingStateForTests();
seedCoordinatorSession(rejectingRecoverySession, coordinatorNowMs);
await wiring.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "heartbeat",
  activeSession: rejectingRecoverySession,
  usage: createCoordinatorUsage({
    translatedMessagesInCurrentMinute: 30,
    translatedMessageCapacityAvailableAtMs: coordinatorNowMs + 1_000
  }),
  adapter: ratePauseAdapter,
  nowMs: coordinatorNowMs
});
let rejectingRecoveryAdapterCallCount = 0;
const rejectingRecoveryAdapter = {
  status: "ready",
  providerAccess: "deterministic-local-adapter-only",
  runtime: {
    async pollLiveChatOnce() {
      rejectingRecoveryAdapterCallCount += 1;
      throw new Error("private adapter rejection detail");
    }
  }
};
const rejectingRecoveryFirstRetry = await wiring.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "heartbeat",
  activeSession: rejectingRecoverySession,
  usage: createCoordinatorUsage({ translatedMessagesInCurrentMinute: 29 }),
  adapter: rejectingRecoveryAdapter,
  nowMs: coordinatorNowMs + 1_000,
  maxRecoverableRetries: 1
});
assert.equal(rejectingRecoveryFirstRetry.status, "recoverable-backoff-scheduled");
assert.equal(rejectingRecoveryFirstRetry.sanitizedPolling.retryCount, 1);
assert.equal(
  wiring.readCommentTranslatorBoundedLiveChatPollingPhaseProjection(rejectingRecoverySession.sessionReferenceId).activePhase,
  "resyncing"
);
const rejectingRecoveryBackoff = await wiring.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "heartbeat",
  activeSession: rejectingRecoverySession,
  usage: createCoordinatorUsage({ translatedMessagesInCurrentMinute: 29 }),
  adapter: rejectingRecoveryAdapter,
  nowMs: coordinatorNowMs + 1_000,
  maxRecoverableRetries: 1
});
assert.equal(rejectingRecoveryBackoff.status, "skipped-not-due");
assert.equal(rejectingRecoveryAdapterCallCount, 1, "Rejected recovery polls honor bounded backoff");
const rejectingRecoveryExhausted = await wiring.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "heartbeat",
  activeSession: rejectingRecoverySession,
  usage: createCoordinatorUsage({ translatedMessagesInCurrentMinute: 29 }),
  adapter: rejectingRecoveryAdapter,
  nowMs: coordinatorNowMs + 2_000,
  maxRecoverableRetries: 1
});
assert.equal(rejectingRecoveryExhausted.status, "bounded-retry-exhausted");
assert.equal(rejectingRecoveryExhausted.providerSignal, "terminal-provider-error");
assert.equal(rejectingRecoveryAdapterCallCount, 2);
assert.doesNotMatch(
  JSON.stringify([rejectingRecoveryFirstRetry, rejectingRecoveryBackoff, rejectingRecoveryExhausted]),
  /private adapter rejection detail/i
);

const terminalRecoverySession = createCoordinatorSession("cts_terminal_recovery", coordinatorNowMs);
wiring.resetCommentTranslatorBoundedLiveChatPollingStateForTests();
seedCoordinatorSession(terminalRecoverySession, coordinatorNowMs);
await wiring.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "heartbeat",
  activeSession: terminalRecoverySession,
  usage: createCoordinatorUsage({
    translatedMessagesInCurrentMinute: 30,
    translatedMessageCapacityAvailableAtMs: coordinatorNowMs + 1_000
  }),
  adapter: ratePauseAdapter,
  nowMs: coordinatorNowMs
});
const terminalRecovery = await wiring.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "heartbeat",
  activeSession: terminalRecoverySession,
  usage: createCoordinatorUsage({ translatedMessagesInCurrentMinute: 29 }),
  adapter: wiring.createDeterministicCommentTranslatorBoundedLiveChatPollingAdapter({
    pollSteps: [
      {
        type: "terminal",
        code: "liveChatEnded",
        receivedAtMs: coordinatorNowMs + 1_000
      }
    ]
  }),
  nowMs: coordinatorNowMs + 1_000
});
assert.equal(terminalRecovery.status, "terminal-state-handoff");
assert.equal(terminalRecovery.providerSignal, "stream-ended");

for (const phasePayload of [firstRatePause, repeatedRatePause, firstRecoveryPrime, joinedRecoveryPrime, staleResult]) {
  const serialized = JSON.stringify(phasePayload);
  assert.doesNotMatch(serialized, /server-only-old-cursor|server-only-recovery-cursor|server-only-stale-cursor/);
  assert.doesNotMatch(serialized, /pre pause comment|pause window comment|stale comment/);
  assert.doesNotMatch(serialized, /liveChatId|ownerUserId|providerChannelId/i);
}

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
  outcomeProjectionSource,
  pollingTypesSource,
  resultProjectionSource,
  terminalPolicySource,
  staticWiringSource,
  pollingRegistrySource,
  pollingTransitionSource,
  liveProviderResultSource,
  liveProviderStepSource,
  ratePauseSource,
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
  "docs/active/COMMENT_TRANSLATOR_PER_MINUTE_AUTO_RESUME_DESIGN.md",
  "docs/active/COMMENT_TRANSLATOR_PER_MINUTE_AUTO_RESUME_IMPLEMENTATION_PLAN.md",
  wiringPath,
  outcomeProjectionPath,
  pollingTypesPath,
  resultProjectionPath,
  terminalPolicyPath,
  staticWiringPath,
  pollingRegistryPath,
  pollingTransitionPath,
  liveProviderResultPath,
  "lib/comment-translator-azure-normal-translation-execution.ts",
  "lib/comment-translator-provider-execution-runtime.ts",
  "lib/comment-translator-youtube-live-provider-runtime-adapter.ts",
  "lib/comment-translator-live-provider-session-step.ts",
  "lib/comment-translator-per-minute-rate-pause.ts",
  "lib/comment-translator-usage-ledger-runtime.ts",
  durableUsagePath,
  "lib/comment-translator-live-message-normalization.ts",
  "lib/comment-translator-real-comments-feed-shared.ts",
  "lib/comment-translator-real-comments-ui-wiring.ts",
  "lib/comment-translator-server-only-live-chat-target-lookup.ts",
  sessionRuntimePath,
  commandExecutionPath,
  "lib/comment-translator-session-command.ts",
  "lib/comment-translator-session-memory-store.ts",
  "lib/comment-translator-session-policy.ts",
  "lib/comment-translator-session-start.ts",
  "lib/comment-translator-session-state.ts",
  "lib/comment-translator-session-types.ts",
  routePath,
  "app/api/comment-translator/session/route-context.ts",
  actionPath,
  "app/tools/comment-translator/account-actions.ts",
  "app/tools/comment-translator/action-context.ts",
  "app/tools/comment-translator/feed-actions.ts",
  "app/tools/comment-translator/retention-waitlist-actions.ts",
  sessionActionsPath,
  "app/tools/comment-translator/dev/per-minute-auto-resume/page.tsx",
  "components/comment-translator/CommentTranslatorDock.tsx",
  "components/comment-translator/comment-translator-dock-format.ts",
  "components/comment-translator/comment-translator-dock-model.ts",
  "components/comment-translator/CommentTranslatorActivePhaseNotice.tsx",
  "components/comment-translator/CommentTranslatorCommentCard.tsx",
  "components/comment-translator/CommentTranslatorCreatorWaitlistPanel.tsx",
  "components/comment-translator/CommentTranslatorDockAtoms.tsx",
  "components/comment-translator/CommentTranslatorDockHeader.tsx",
  "components/comment-translator/CommentTranslatorFeedPanel.tsx",
  "components/comment-translator/CommentTranslatorSessionPanel.tsx",
  "components/comment-translator/CommentTranslatorSettingsPanel.tsx",
  "components/comment-translator/CommentTranslatorUsageSidebar.tsx",
  "components/comment-translator/useCommentTranslatorBrowserTimeZone.ts",
  "components/comment-translator/useCommentTranslatorCreatorWaitlist.ts",
  "components/comment-translator/useCommentTranslatorDockControls.ts",
  "components/comment-translator/useCommentTranslatorSessionFeedController.ts",
  "components/portal/PortalShell.tsx",
  "lib/comment-translator-copy-en.json",
  "lib/comment-translator-copy-ja.json",
  "lib/comment-translator-fixture-comments.ts",
  "lib/comment-translator-runtime.ts",
  "lib/comment-translator-snapshot-data.ts",
  "lib/comment-translator-types.ts",
  "lib/comment-translator.ts",
  readinessDocPath,
  gapAuditPath,
  "scripts/comment-translator-bounded-live-chat-polling-wiring-contract.mjs",
  "scripts/comment-translator-per-minute-auto-resume-contract.mjs",
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
  "scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-post-bridge-continuation-ready-preflight-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-completion-after-pl-g2k-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-live-message-normalization-contract.mjs",
  "scripts/comment-translator-start-stop-reason-ux-contract.mjs",
  "scripts/account-remote-display-settings-contract.mjs",
  taskPath
]);
const plG6dChangedFiles = new Set([
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G6D_PREVIEW_RATE_LIMIT_SMOKE_OVERRIDE.md",
  "lib/comment-translator-free-beta-preview-rate-limit-smoke-override.ts",
  "lib/comment-translator-public-entitlement-baseline.ts",
  "scripts/comment-translator-public-entitlement-baseline-contract.mjs",
  "scripts/comment-translator-free-beta-usage-display-contract.mjs",
  "scripts/comment-translator-pl-g6d-preview-rate-limit-smoke-override-contract.mjs",
  "scripts/comment-translator-provider-execution-runtime-contract.mjs",
  "scripts/comment-translator-session-start-stop-contract.mjs"
]);
for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file) || plG6dChangedFiles.has(file), `F7 change stays in allowed files: ${file}`);
}

console.log("comment translator bounded live chat polling wiring contract checks passed");
