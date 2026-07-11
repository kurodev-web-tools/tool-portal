import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const usageLedgerPath = "lib/comment-translator-usage-ledger-runtime.ts";
const durableUsagePath = "lib/comment-translator-durable-usage-counter-store.ts";
const ratePausePath = "lib/comment-translator-per-minute-rate-pause.ts";
const pollingWiringPath = "lib/comment-translator-bounded-live-chat-polling-wiring.ts";
const pollingTransitionPath = "lib/comment-translator-bounded-live-chat-polling-transition.ts";
const liveProviderSessionStepPath = "lib/comment-translator-live-provider-session-step.ts";
const sessionCommandExecutionPath = "lib/comment-translator-session-command-execution.ts";
const sessionRuntimePath = "lib/comment-translator-session-runtime.ts";
const routePath = "app/api/comment-translator/session/route.ts";
const actionsPath = "app/tools/comment-translator/actions.ts";
const youtubeRuntimePath = "lib/comment-translator-youtube-runtime-foundation.ts";
const uiCopyPath = "lib/comment-translator.ts";
const uiCopyDataPaths = ["lib/comment-translator-copy-ja.json", "lib/comment-translator-copy-en.json"];
const dockPath = "components/comment-translator/CommentTranslatorDock.tsx";
const sessionPanelPath = "components/comment-translator/CommentTranslatorSessionPanel.tsx";
const activePhaseNoticePath = "components/comment-translator/CommentTranslatorActivePhaseNotice.tsx";
const feedPanelPath = "components/comment-translator/CommentTranslatorFeedPanel.tsx";
const devFixturePath = "app/tools/comment-translator/dev/per-minute-auto-resume/page.tsx";
const portalShellPath = "components/portal/PortalShell.tsx";
const serverOnlyLiveTargetIdKey = "liveChat" + "Id";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const uiCopySource = [uiCopyPath, ...uiCopyDataPaths].map(read).join("\n");
const dockSource = [dockPath, sessionPanelPath].map(read).join("\n");
const sessionPanelSource = read(sessionPanelPath);
const activePhaseNoticeSource = read(activePhaseNoticePath);
const feedPanelSource = read(feedPanelPath);
const portalShellSource = read(portalShellPath);
const actionsSource = read(actionsPath);
const sessionCommandExecutionSource = read(sessionCommandExecutionPath);
const pollingTransitionSource = read(pollingTransitionPath);

assert.match(
  actionsSource,
  /^"use server";/m,
  "Task 7 action facade remains an explicit server-action module"
);
assert.match(
  sessionCommandExecutionSource,
  /readPhaseResolution:\s*readCommentTranslatorBoundedLiveChatPollingPhaseResolutionForUsage/,
  "Task 7 read-only status reconstructs missing process-local phase from durable usage"
);
const terminalStatePrecedenceIndex = pollingTransitionSource.indexOf("if (pollingState?.terminal)");
const perMinutePauseIndex = pollingTransitionSource.indexOf(
  "if (usage.translatedMessagesInCurrentMinute >= translatedMessagesPerMinute)"
);
assert.ok(
  terminalStatePrecedenceIndex >= 0 && terminalStatePrecedenceIndex < perMinutePauseIndex,
  "Terminal provider state remains terminal even when the durable per-minute count is capped"
);
assert.match(
  sessionCommandExecutionSource,
  /ratePauseResolution:\s*runtime\.readPhaseResolution\(\{[\s\S]*sessionReferenceId:[\s\S]*usage:[\s\S]*nowMs:/,
  "Task 7 status phase resolution receives durable usage and current time"
);
assert.doesNotMatch(
  actionsSource,
  /^export\s*\{/m,
  "Task 7 action facade does not use server-action re-exports"
);
assert.match(
  actionsSource,
  /export async function getCommentTranslatorSessionStatusAction/,
  "Task 7 action facade exports local async server actions"
);

assert.match(uiCopySource, /"ratePausedTitle":\s*"分速上限のため一時休止中"/, "Task 5 adds exact Japanese pause copy");
assert.match(uiCopySource, /"ratePausedTitle":\s*"Paused at the per-minute limit"/, "Task 5 adds exact English pause copy");
assert.match(dockSource, /data-comment-translator-active-phase=\{sessionState\.activePhase\}/, "Task 5 renders active phase marker");
assert.match(dockSource, /data-comment-translator-rate-pause="auto-resume-current-cursor"/, "Task 5 renders current-cursor recovery marker");
assert.match(
  feedPanelSource,
  /<span className="inline-block">YouTubeチャット<\/span><span className="inline-block">公開版プレビュー<\/span>/,
  "Given the Japanese feed heading, when it wraps, then each semantic chunk stays intact without changing the copy"
);
assert.match(
  feedPanelSource,
  /<span className="inline-block">一致するコメントは<\/span><span className="inline-block">ありません<\/span>/,
  "Given the Japanese empty-state heading, when it wraps, then the final semantic chunk stays intact without changing the copy"
);
const sessionActionRowIndex = sessionPanelSource.indexOf('data-comment-translator-session-actions="start-stop-refresh"');
const activePhaseNoticeIndex = sessionPanelSource.indexOf('data-comment-translator-rate-pause="auto-resume-current-cursor"');
assert.ok(
  sessionActionRowIndex >= 0 && sessionActionRowIndex < activePhaseNoticeIndex,
  "Given a narrow active session panel, when the rate-pause notice is shown, then the Stop action remains before the notice"
);
assert.match(
  activePhaseNoticeSource,
  /data-comment-translator-per-minute-badge="theme-contrast"[^>]*className="[^"]*dark:bg-amber-950\/60[^"]*dark:text-amber-100/,
  "Given dark theme, when the per-minute badge renders, then it uses an explicit accessible dark background and text pair"
);

assert.ok(fs.existsSync(path.join(root, devFixturePath)), "Task 5 dev fixture route exists");
const devFixtureSource = read(devFixturePath);
assert.match(
  devFixtureSource,
  /process\.env\.NODE_ENV === "production"[\s\S]*notFound\(\)/,
  "Task 5 fixture returns 404 in production"
);
assert.match(
  devFixtureSource,
  /\["running",\s*"rate-paused",\s*"resyncing"\]\s+as const/,
  "Task 5 fixture query is allowlisted to fixed phases"
);
assert.match(
  devFixtureSource,
  /initialSessionState=\{fixtureSessionStates\[phase\]\}/,
  "Task 5 fixture passes only a fixed sanitized initial session state into the Dock"
);
assert.match(
  devFixtureSource,
  /const fixtureAccountStatus:\s*NonNullable<Parameters<typeof PortalShell>\[0\]\["accountStatus"\]>\s*=\s*\{[\s\S]*authStatus:\s*"signed-out"[\s\S]*user:\s*null[\s\S]*remotePreferences:\s*null[\s\S]*remotePreferenceStatus:\s*"not-signed-in"[\s\S]*\};/,
  "Task 5 fixture defines a fixed sanitized signed-out account status without an account identifier"
);
assert.match(
  devFixtureSource,
  /<PortalShell mode="workspace" accountStatus=\{fixtureAccountStatus\}>/,
  "Task 5 fixture prevents the transitive PortalShell account-session lookup"
);
assert.doesNotMatch(
  devFixtureSource,
  /SessionAction|ProviderRuntime|TargetLookup|supabase|localStorage\.|sessionStorage\.|indexedDB\./i,
  "Task 5 fixture does not call actions, provider runtime, target lookup, Supabase, or browser storage"
);
assert.doesNotMatch(
  activePhaseNoticeSource,
  /setTimeout|setInterval|requestAnimationFrame|localStorage\.|sessionStorage\.|indexedDB\.|SessionAction|ProviderRuntime|TargetLookup|supabase/i,
  "Task 5 actual phase notice has no timers, browser storage, actions, provider runtime, target lookup, or Supabase dependency"
);
assert.match(
  portalShellSource,
  /const accountStatus = providedAccountStatus \?\? await getAccountSessionState\(\);/,
  "PortalShell uses the explicit fixture status instead of invoking account-session lookup"
);
assert.match(
  portalShellSource,
  /browserSafeAccountStatus\.authStatus === "signed-in"[\s\S]*<AccountRemoteDisplaySettingsApplier accountStatus=\{browserSafeAccountStatus\} \/>[\s\S]*: null/,
  "PortalShell mounts the browser display-settings applier only for signed-in accounts"
);

function loadPortalShellWithAccountLookupCounter() {
  const sourcePath = path.join(root, portalShellPath);
  const compiled = ts.transpileModule(read(portalShellPath), {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText;
  const originalLoad = Module._load;
  let accountLookupCount = 0;
  function AccountRemoteDisplaySettingsApplierFixture() {
    return null;
  }
  const jsxRuntime = {
    Fragment: Symbol("Fragment"),
    jsx(type, props) {
      return { type, props };
    },
    jsxs(type, props) {
      return { type, props };
    }
  };
  const componentFixture = () => null;

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "react/jsx-runtime") return jsxRuntime;
    if (request === "@/components/account/AccountRemoteDisplaySettingsApplier") {
      return { AccountRemoteDisplaySettingsApplier: AccountRemoteDisplaySettingsApplierFixture };
    }
    if (
      request === "@/components/portal/PortalHeader" ||
      request === "@/components/portal/PortalLegalFooter" ||
      request === "@/components/portal/PortalSidebar"
    ) {
      const exportName = request.slice(request.lastIndexOf("/") + 1);
      return { [exportName]: componentFixture };
    }
    if (request === "@/lib/comment-translator-admin-access-gate") {
      return { readCommentTranslatorAdminShortcutStateForAccountSession: () => ({ status: "hidden" }) };
    }
    if (request === "@/lib/supabase/session") {
      return {
        createBrowserSafeAccountSessionViewModel: (accountStatus) => accountStatus,
        getAccountSessionState: async () => {
          accountLookupCount += 1;
          throw new Error("fixture must not trigger account-session lookup");
        }
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    const testModule = new Module(sourcePath);
    testModule.filename = sourcePath;
    testModule.paths = Module._nodeModulePaths(path.dirname(sourcePath));
    testModule._compile(compiled, sourcePath);
    return {
      AccountRemoteDisplaySettingsApplierFixture,
      PortalShell: testModule.exports.PortalShell,
      readAccountLookupCount: () => accountLookupCount
    };
  } finally {
    Module._load = originalLoad;
  }
}

function treeContainsType(node, expectedType) {
  if (Array.isArray(node)) return node.some((child) => treeContainsType(child, expectedType));
  if (!node || typeof node !== "object") return false;
  if (node.type === expectedType) return true;
  return treeContainsType(node.props?.children, expectedType);
}

const portalShellFixture = loadPortalShellWithAccountLookupCounter();
const signedOutPortalTree = await portalShellFixture.PortalShell({
  children: null,
  mode: "workspace",
  accountStatus: {
    configStatus: "ready",
    missingEnv: [],
    authStatus: "signed-out",
    user: null,
    remotePreferences: null,
    remotePreferenceStatus: "not-signed-in"
  }
});
assert.equal(
  portalShellFixture.readAccountLookupCount(),
  0,
  "Task 5 explicit signed-out fixture status performs zero PortalShell account-session/Supabase lookups"
);
assert.equal(
  treeContainsType(signedOutPortalTree, portalShellFixture.AccountRemoteDisplaySettingsApplierFixture),
  false,
  "Task 5 signed-out fixture does not mount the signed-in browser display-settings applier"
);

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

    if (request === "@supabase/supabase-js") {
      return {
        createClient(url, key) {
          return { url, key, from: () => ({}) };
        }
      };
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

function loadBoundaryModuleWithMocks(relativePath, mocks) {
  const sourcePath = path.join(root, relativePath);
  const moduleCache = new Map();
  const originalLoad = Module._load;

  function compileBoundaryModule(modulePath) {
    const normalizedModulePath = path.normalize(modulePath);
    if (moduleCache.has(normalizedModulePath)) return moduleCache.get(normalizedModulePath).exports;
    const source = fs.readFileSync(normalizedModulePath, "utf8");
    const compiled = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
    }).outputText;
    const testModule = new Module(normalizedModulePath);
    moduleCache.set(normalizedModulePath, testModule);
    testModule.filename = normalizedModulePath;
    testModule.paths = Module._nodeModulePaths(path.dirname(normalizedModulePath));
    testModule._compile(compiled, normalizedModulePath);
    return testModule.exports;
  }

  Module._load = function patchedBoundaryLoad(request, parent, isMain) {
    if (Object.hasOwn(mocks, request)) {
      return mocks[request];
    }
    if (request.startsWith(".") && parent?.filename) {
      const candidate = path.resolve(path.dirname(parent.filename), `${request}.ts`);
      if (fs.existsSync(candidate)) return compileBoundaryModule(candidate);
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    return compileBoundaryModule(sourcePath);
  } finally {
    Module._load = originalLoad;
  }
}

function createStatusBoundaryFixture({
  phaseResolution = {
    status: "ready",
    projection: {
      activePhase: "rate-paused",
      ratePauseReason: "translated-message-cap",
      retryAfterSeconds: 20,
      automaticResumeExpected: true
    }
  },
  credentialReadinessMustStayUnread = true,
  restoreMissingPhaseFromUsage = false,
  translatedMessagesInCurrentMinute = 30,
  translatedMessageCapacityAvailableAtMs
} = {}) {
  const fixtureNowMs = Date.now();
  const calls = {
    providerRuntime: 0,
    providerStep: 0,
    coordinatorTick: 0,
    targetLookup: 0,
    credentialReadiness: 0,
    credentialRefresh: 0,
    sessionPersistence: 0,
    usagePersistence: 0,
    phaseRead: 0,
    commandPhaseResolutions: [],
    order: []
  };
  const callerAuthorization = { status: "authorized", ownerUserId: "server-only-status-fixture-owner" };
  const activeSession = {
    sessionReferenceId: "cts_status_fixture",
    startedAtMs: fixtureNowMs - 120_000,
    lastHeartbeatAtMs: fixtureNowMs - 1_000,
    credentialReferenceId: "ytcred_status_fixture"
  };
  const planEntitlement = {
    plan: "free",
    planEntitlementReferenceId: "comment-translator-free-public-v1",
    entitlementSource: "server-owned",
    dailyLimitMs: 1_800_000,
    sessionLimitMs: 1_800_000,
    translatedMessagesPerMinute: 30,
    activeSessionsPerUser: 1,
    monthlyProviderInputCharacterLimit: 20_000,
    paidPrioritization: "not-implemented",
    providerUsageCharging: "not-implemented"
  };
  const usage = {
    dailyUsedMs: 0,
    currentSessionElapsedMs: 120_000,
    translatedMessagesInCurrentMinute,
    translatedMessageCapacityAvailableAtMs: translatedMessageCapacityAvailableAtMs === undefined
      ? fixtureNowMs + 20_000
      : translatedMessageCapacityAvailableAtMs,
    monthlyProviderInputCharacterEstimate: 0,
    providerBudgetAvailable: true,
    globalBudgetAvailable: true,
    aiBudgetAvailable: true,
    translationProviderAvailable: true,
    planEntitlement,
    providerRequestEstimate: { requestEstimateCount: 0, quotaUnitEstimate: 0, providerTargetMetadata: "forbidden" },
    aiUsageEstimate: {
      translatedMessageEstimate: 0,
      providerInputCharacterEstimate: 0,
      translatedCharacterEstimate: 0,
      estimatedCostMicros: 0,
      rawCommentText: "never-recorded-by-design"
    }
  };
  const readyCredential = {
    status: "ready",
    provider: "youtube",
    credentialReferenceId: activeSession.credentialReferenceId,
    translatorStartAllowed: true,
    reconnectGuidance: "none"
  };
  const state = {
    status: "active",
    provider: "youtube",
    plan: "free",
    sessionReferenceId: activeSession.sessionReferenceId,
    credentialReferenceId: activeSession.credentialReferenceId,
    startedAtIso: new Date(activeSession.startedAtMs).toISOString(),
    stoppedAtIso: null,
    elapsedSeconds: 120,
    remainingSessionSeconds: 1_680,
    remainingDailySeconds: 1_680,
    heartbeat: { required: true, timeoutSeconds: 45, lastHeartbeatAtIso: new Date(activeSession.lastHeartbeatAtMs).toISOString() },
    stopReason: null,
    reasonUx: null,
    usageDisplay: {},
    nextAction: "send-heartbeat-or-stop",
    providerApiUsage: "allowed-after-explicit-start-not-run-in-task-7",
    aiTranslationUsage: "allowed-after-explicit-start-not-run-in-task-7",
    tokenValue: "never-returned-by-design",
    providerTargetMetadata: "forbidden",
    ...(phaseResolution.status === "ready" ? phaseResolution.projection : {})
  };
  const noOp = () => {};
  const asyncNoOp = async () => {};
  const failIfCredentialRefreshRuns = () => {
    calls.credentialRefresh += 1;
    throw new Error("status must not refresh or persist OAuth credential state");
  };
  const failIfCredentialReadinessRuns = async () => {
    calls.credentialReadiness += 1;
    if (!credentialReadinessMustStayUnread) return readyCredential;
    return failIfCredentialRefreshRuns();
  };
  const mocks = {
    "next/server": { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } },
    "./route-context": {
      mapCommentTranslatorSessionIntentToAbuseAction: () => "session-status",
      readCommentTranslatorSessionRouteCommand: async () => ({
        intent: "status",
        credentialReferenceId: activeSession.credentialReferenceId,
        browserConnected: true,
        stopReason: undefined,
        sourceLanguage: undefined,
        targetLanguage: "ja"
      }),
      readCommentTranslatorRouteCallerAuthorization: async () => callerAuthorization,
      readCommentTranslatorRouteCredentialReadiness: failIfCredentialReadinessRuns
    },
    "./action-context": {
      readCommentTranslatorActionCallerAuthorization: async () => callerAuthorization,
      readCommentTranslatorActionCredentialReadiness: failIfCredentialReadinessRuns,
      readCommentTranslatorCreatorWaitlistAccount: async () => ({ status: "unauthenticated", reason: "auth-unavailable" })
    },
    "@/lib/comment-translator-youtube-credential-status-boundary": {
      authorizeYouTubeOAuthCredentialStatusCaller: () => callerAuthorization,
      createYouTubeOAuthCredentialStatusUnavailablePayload: () => ({ status: "unavailable", reason: "trusted-adapter-not-wired" }),
      readYouTubeOAuthCredentialStatus: async () => ({ status: "ready", credentialReferenceId: activeSession.credentialReferenceId })
    },
    "@/lib/comment-translator-youtube-disconnect-runtime": {
      assessYouTubeOAuthCredentialTranslatorStartReadiness: () => readyCredential
    },
    "@/lib/comment-translator-youtube-token-store-supabase-adapter": {
      createTrustedYouTubeOAuthCredentialSupabaseStatusReader: () => ({ trustedAdapter: {} }),
      createTrustedYouTubeOAuthCredentialSupabaseTokenMaterialRuntime: () => ({ status: "unavailable" })
    },
    "@/lib/comment-translator-youtube-token-material-runtime": {
      createTrustedYouTubeOAuthStoredCredentialRefreshRuntime: () => ({})
    },
    "@/lib/comment-translator-youtube-token-store-runtime": {
      isYouTubeOAuthCredentialResolutionDisabled: () => false
    },
    "@/lib/comment-translator-session-runtime": {
      persistInMemoryCommentTranslatorActiveSession: noOp,
      readCommentTranslatorSessionCommand: async (request) => {
        calls.commandPhaseResolutions.push(request.ratePauseResolution);
        return state;
      }
    },
    "@/lib/comment-translator-session-command-execution": {
      executeCommentTranslatorSessionCommand: (input) =>
        sessionCommandExecution.executeCommentTranslatorSessionCommand(input, {
          createLiveProviderRuntime() {
            calls.providerRuntime += 1;
            throw new Error("status must not create a live provider runtime");
          },
          async resolveLiveChatTarget() {
            calls.targetLookup += 1;
            throw new Error("status must not resolve a live target");
          },
          readPhaseResolution() {
            calls.phaseRead += 1;
            calls.order.push("phase");
            const restoredResolution = restoreMissingPhaseFromUsage
              ? pollingWiring.readCommentTranslatorBoundedLiveChatPollingPhaseResolutionForUsage({
                  sessionReferenceId: activeSession.sessionReferenceId,
                  usage,
                  nowMs: fixtureNowMs
                })
              : phaseResolution;
            calls.commandPhaseResolutions.push(restoredResolution);
            return restoredResolution;
          }
        })
    },
    "@/lib/comment-translator-durable-session-store": {
      createCommentTranslatorDurableSessionFailClosedState: () => ({ status: "stopped" }),
      createTrustedCommentTranslatorSessionSupabaseStore: () => ({ status: "ready" }),
      persistCommentTranslatorDurableSessionStateOrFailClosed: async () => {
        calls.sessionPersistence += 1;
        return { status: "persisted" };
      },
      readCommentTranslatorDurableActiveSessionOrFailClosed: async () => ({ status: "ready", activeSession })
    },
    "@/lib/comment-translator-usage-ledger-runtime": {
      recordInMemoryCommentTranslatorSessionLedgerState: noOp
    },
    "@/lib/comment-translator-durable-usage-counter-store": {
      createTrustedCommentTranslatorUsageCounterSupabaseStore: () => ({ status: "ready" }),
      readCommentTranslatorDurableUsageSnapshotOrFailClosed: async () => {
        calls.order.push("usage");
        return { status: "ready", snapshot: usage };
      },
      recordCommentTranslatorDurableSessionLedgerStateOrFailClosed: async () => {
        calls.usagePersistence += 1;
        return { status: "persisted" };
      }
    },
    "@/lib/comment-translator-billing-runtime": {
      readCommentTranslatorBillingEntitlementSnapshot: () => ({ plan: "free", billingState: "free", planEntitlement })
    },
    "@/lib/comment-translator-public-entitlement-baseline": {
      resolveCommentTranslatorPublicEntitlementBaseline: () => ({ status: "ready", plan: "free", usage })
    },
    "@/lib/comment-translator-free-beta-preview-rate-limit-smoke-override": {
      resolveCommentTranslatorFreeBetaPreviewRateLimitSmokeOverride: () => {
        calls.order.push("preview-entitlement");
        return { status: "active", translatedMessagesPerMinute: 5 };
      }
    },
    "@/lib/comment-translator-server-only-live-chat-target-lookup": {
      resolveCommentTranslatorServerOnlyLiveChatTargetLookupForStart: async () => {
        calls.targetLookup += 1;
        return { status: "unavailable", stopReason: "stream-unavailable", reasonUxCode: "live-target-unavailable" };
      }
    },
    "@/lib/comment-translator-bounded-live-chat-polling-wiring": {
      clearCommentTranslatorBoundedLiveChatPollingState: noOp,
      createUnavailableCommentTranslatorBoundedLiveChatPollingAdapter: ({ reason }) => ({
        status: "unavailable",
        providerAccess: "not-run",
        reason
      }),
      readCommentTranslatorBoundedLiveChatPollingTick: async () => {
        throw new Error("status must not poll");
      },
      readCommentTranslatorBoundedLiveChatPollingPhaseProjection: () => {
        calls.phaseRead += 1;
        calls.order.push("phase");
        return phaseResolution.projection;
      },
      readCommentTranslatorBoundedLiveChatPollingPhaseResolution: () => {
        calls.phaseRead += 1;
        calls.order.push("phase");
        return phaseResolution;
      },
      readCommentTranslatorBoundedLiveChatPollingPhaseResolutionForUsage: ({ sessionReferenceId, usage: phaseUsage, nowMs }) => {
        calls.phaseRead += 1;
        calls.order.push("phase");
        return pollingWiring.readCommentTranslatorBoundedLiveChatPollingPhaseResolutionForUsage({
          sessionReferenceId,
          usage: phaseUsage,
          nowMs
        });
      },
      seedCommentTranslatorBoundedLiveChatPollingStateForActiveSession: noOp
    },
    "@/lib/comment-translator-youtube-live-provider-runtime-adapter": {
      createTrustedCommentTranslatorYouTubeLiveProviderRuntimeAdapter: () => {
        calls.providerRuntime += 1;
        return {
          targetLookupAdapter: {
            verifyOwner: async () => {
              throw new Error("status must not verify provider owner");
            },
            lookupOwnedBroadcasts: async () => {
              throw new Error("status must not lookup provider target");
            }
          },
          pollingAdapter: {
            status: "ready",
            providerAccess: "deterministic-local-adapter-only",
            runtime: {
              pollLiveChatOnce: async () => {
                throw new Error("status must not invoke provider polling");
              }
            }
          }
        };
      }
    },
    "@/lib/comment-translator-live-provider-session-step": {
      runCommentTranslatorLiveProviderSessionStep: async () => {
        calls.providerStep += 1;
        throw new Error("status must not run live provider session step");
      }
    },
    "@/lib/comment-translator-azure-normal-translation-execution": {
      clearCommentTranslatorAzureNormalTranslationSessionDedupeState: noOp
    },
    "@/lib/comment-translator-private-launch-access-gate": {
      createCommentTranslatorPrivateLaunchBlockedSessionState: () => ({ status: "stopped" }),
      readCommentTranslatorPrivateLaunchAccess: () => ({ status: "allowed", access: "allowed-tester" })
    },
    "@/lib/comment-translator-abuse-rate-limit-runtime": {
      assertCommentTranslatorAbuseRequestAllowed: () => ({ status: "allowed" }),
      createCommentTranslatorAbuseRateLimitedSessionState: () => ({ status: "stopped" }),
      readCommentTranslatorRequestIp: () => null
    },
    "@/lib/supabase/server": {
      createServerSupabaseClient: async () => ({
        auth: {
          getUser: async () => ({ data: { user: { id: callerAuthorization.ownerUserId } }, error: null })
        }
      })
    },
    "@/lib/comment-translator-free-beta-retention-attribution": {},
    "@/lib/comment-translator-free-beta-creator-locked-waitlist": {},
    "@/lib/comment-translator-creator-waitlist-durable-store": {},
    "@/lib/comment-translator-real-comments-ui-wiring": {},
    "@/lib/comment-translator-real-comments-feed-shared": {},
    "@/lib/comment-translator-youtube-account-integration-status": {},
    "@/lib/comment-translator-youtube-tool-credential-source": {},
    "@/lib/comment-translator-real-comments-feed-session-bridge": {},
    "@/lib/comment-translator-real-comments-feed-durable-store": {},
    "@/lib/comment-translator": {}
  };
  return { calls, mocks, asyncNoOp };
}

const usageLedger = loadTsModule(usageLedgerPath);
const durableUsage = loadTsModule(durableUsagePath);
const ratePause = loadTsModule(ratePausePath);
const pollingWiring = loadTsModule(pollingWiringPath);
const liveProviderSessionStep = loadTsModule(liveProviderSessionStepPath);
const sessionCommandExecution = loadTsModule(sessionCommandExecutionPath);
const sessionRuntime = loadTsModule(sessionRuntimePath);
const youtubeRuntime = loadTsModule(youtubeRuntimePath);
const nowMs = Date.parse("2026-07-10T00:01:00.000Z");
const activeSession = {
  sessionReferenceId: "cts_auto_resume_active",
  startedAtMs: Date.parse("2026-07-09T23:59:00.000Z"),
  lastHeartbeatAtMs: Date.parse("2026-07-10T00:00:30.000Z"),
  credentialReferenceId: "ytcred_auto_resume_reference"
};
const callerAuthorization = {
  status: "authorized",
  ownerUserId: "server-only-auto-resume-owner"
};
const userLedgerReferenceId = usageLedger.createCommentTranslatorUsageLedgerUserReference(callerAuthorization);

const runningProjection = ratePause.createCommentTranslatorPerMinuteRunningProjection();
assert.deepEqual(
  runningProjection,
  {
    activePhase: "running",
    ratePauseReason: null,
    retryAfterSeconds: null,
    automaticResumeExpected: false
  },
  "Given available rolling capacity, when constructing the active projection, then the exact running invariants are returned"
);

const roundedPausedProjection = ratePause.createCommentTranslatorPerMinuteRatePausedProjection({
  capacityAvailableAtMs: nowMs + 1_001,
  nowMs
});
assert.deepEqual(
  roundedPausedProjection,
  {
    activePhase: "rate-paused",
    ratePauseReason: "translated-message-cap",
    retryAfterSeconds: 2,
    automaticResumeExpected: true
  },
  "Given future rolling recovery authority, when constructing the pause projection, then the countdown rounds up"
);

const clampedPausedProjection = ratePause.createCommentTranslatorPerMinuteRatePausedProjection({
  capacityAvailableAtMs: nowMs - 1,
  nowMs
});
assert.equal(
  clampedPausedProjection.retryAfterSeconds,
  0,
  "Given elapsed rolling recovery authority, when constructing the pause projection, then the countdown is non-negative"
);

assert.throws(
  () =>
    ratePause.createCommentTranslatorPerMinuteRatePausedProjection({
      capacityAvailableAtMs: nowMs + 1_001,
      nowMs: Number.NaN
    }),
  RangeError,
  "Given a non-finite current time, when constructing the pause projection, then invalid countdown authority cannot create a paused projection"
);

assert.throws(
  () =>
    ratePause.createCommentTranslatorPerMinuteRatePausedProjection({
      capacityAvailableAtMs: Number.MAX_VALUE,
      nowMs: -Number.MAX_VALUE
    }),
  RangeError,
  "Given finite timestamps whose subtraction overflows, when constructing the pause projection, then a non-finite countdown cannot create a paused projection"
);

const resyncingProjection = ratePause.createCommentTranslatorPerMinuteResyncingProjection();
assert.deepEqual(
  resyncingProjection,
  {
    activePhase: "resyncing",
    ratePauseReason: "translated-message-cap",
    retryAfterSeconds: null,
    automaticResumeExpected: true
  },
  "Given recovered capacity awaiting a fresh cursor prime, when constructing the active projection, then the exact resyncing invariants are returned"
);

const runningResolution = ratePause.resolveCommentTranslatorPerMinuteRatePause({
  translatedMessagesInCurrentMinute: 29,
  translatedMessagesPerMinute: 30,
  translatedMessageCapacityAvailableAtMs: null,
  nowMs
});
assert.deepEqual(
  runningResolution,
  { status: "ready", projection: runningProjection },
  "Given a count below the limit, when resolving the active phase, then the session remains ready and running"
);

const pausedResolution = ratePause.resolveCommentTranslatorPerMinuteRatePause({
  translatedMessagesInCurrentMinute: 30,
  translatedMessagesPerMinute: 30,
  translatedMessageCapacityAvailableAtMs: nowMs + 1_001,
  nowMs
});
assert.deepEqual(
  pausedResolution,
  { status: "ready", projection: roundedPausedProjection },
  "Given a capped count with recovery authority, when resolving the active phase, then the session remains ready and rate-paused"
);

const missingAuthorityResolution = ratePause.resolveCommentTranslatorPerMinuteRatePause({
  translatedMessagesInCurrentMinute: 30,
  translatedMessagesPerMinute: 30,
  translatedMessageCapacityAvailableAtMs: null,
  nowMs
});
assert.deepEqual(
  missingAuthorityResolution,
  { status: "fail-closed", stopReason: "global-budget-stop" },
  "Given a capped count without recovery authority, when resolving the active phase, then the result fails closed"
);

const activeRatePausedState = await sessionRuntime.readCommentTranslatorSessionCommand({
  intent: "status",
  nowMs,
  plan: "free",
  callerAuthorization,
  credentialReadiness: {
    status: "ready",
    provider: "youtube",
    credentialReferenceId: activeSession.credentialReferenceId,
    translatorStartAllowed: true,
    reconnectGuidance: "none"
  },
  activeSession: {
    ...activeSession,
    lastHeartbeatAtMs: nowMs
  },
  usage: {
    dailyUsedMs: 0,
    currentSessionElapsedMs: 120_000,
    translatedMessagesInCurrentMinute: 30,
    providerBudgetAvailable: true,
    globalBudgetAvailable: true,
    aiBudgetAvailable: true,
    translationProviderAvailable: true,
    planEntitlement: sessionRuntime.createCommentTranslatorSessionPlanEntitlement({ plan: "free" })
  },
  ratePauseResolution: pausedResolution,
  providerSignal: null,
  createSessionReferenceId: () => "cts_unused_rate_pause_reference"
});
assert.equal(
  activeRatePausedState.status,
  "active",
  "Given the coordinator rate-pause resolution, when reading an active session, then the translated-message cap does not stop it"
);
assert.equal(activeRatePausedState.activePhase, "rate-paused");
assert.equal(activeRatePausedState.ratePauseReason, "translated-message-cap");
assert.equal(activeRatePausedState.retryAfterSeconds, 2);
assert.equal(activeRatePausedState.automaticResumeExpected, true);
assert.equal(
  activeRatePausedState.elapsedSeconds,
  120,
  "Given an active rate pause, when reading status, then elapsed session time continues"
);

const failClosedPhaseState = await sessionRuntime.readCommentTranslatorSessionCommand({
  intent: "status",
  nowMs,
  plan: "free",
  callerAuthorization,
  credentialReadiness: {
    status: "ready",
    provider: "youtube",
    credentialReferenceId: activeSession.credentialReferenceId,
    translatorStartAllowed: true,
    reconnectGuidance: "none"
  },
  activeSession: {
    ...activeSession,
    lastHeartbeatAtMs: nowMs
  },
  usage: {
    dailyUsedMs: 0,
    currentSessionElapsedMs: 120_000,
    translatedMessagesInCurrentMinute: 30,
    providerBudgetAvailable: true,
    globalBudgetAvailable: true,
    aiBudgetAvailable: true,
    translationProviderAvailable: true,
    planEntitlement: sessionRuntime.createCommentTranslatorSessionPlanEntitlement({ plan: "free" })
  },
  ratePauseResolution: missingAuthorityResolution,
  providerSignal: null,
  createSessionReferenceId: () => "cts_unused_fail_closed_reference"
});
assert.equal(failClosedPhaseState.status, "stopped");
assert.equal(failClosedPhaseState.stopReason, "global-budget-stop");

const nonFiniteNowResolution = ratePause.resolveCommentTranslatorPerMinuteRatePause({
  translatedMessagesInCurrentMinute: 30,
  translatedMessagesPerMinute: 30,
  translatedMessageCapacityAvailableAtMs: nowMs + 1_001,
  nowMs: Number.POSITIVE_INFINITY
});
assert.deepEqual(
  nonFiniteNowResolution,
  { status: "fail-closed", stopReason: "global-budget-stop" },
  "Given a capped count with non-finite current time, when resolving the active phase, then invalid countdown authority fails closed"
);

const overflowCountdownResolution = ratePause.resolveCommentTranslatorPerMinuteRatePause({
  translatedMessagesInCurrentMinute: 30,
  translatedMessagesPerMinute: 30,
  translatedMessageCapacityAvailableAtMs: Number.MAX_VALUE,
  nowMs: -Number.MAX_VALUE
});
assert.deepEqual(
  overflowCountdownResolution,
  { status: "fail-closed", stopReason: "global-budget-stop" },
  "Given finite timestamps whose subtraction overflows, when resolving the active phase, then non-finite derived countdown authority fails closed"
);

for (const projection of [runningProjection, roundedPausedProjection, clampedPausedProjection, resyncingProjection]) {
  assert.deepEqual(
    Object.keys(projection).sort(),
    ["activePhase", "automaticResumeExpected", "ratePauseReason", "retryAfterSeconds"],
    "Given any active phase, when serializing its projection, then only the exact four browser-safe fields are present"
  );
  assert.doesNotMatch(
    JSON.stringify(projection),
    /availableAt|timestamp|cursor|pageToken|target|liveChat|provider|owner|sessionReference|credential|rawComment/i,
    "Given any active phase, when serializing its projection, then raw time, cursor, target, provider, account, session, credential, and comment metadata stay absent"
  );
}

function createDurableRow({
  id,
  sessionReferenceId = activeSession.sessionReferenceId,
  eventType = "ai-usage-estimated",
  occurredAt,
  translatedMessageEstimate,
  usageDay = "2026-07-10"
}) {
  return {
    id,
    owner_user_id: callerAuthorization.ownerUserId,
    user_ledger_reference_id: userLedgerReferenceId,
    session_reference_id: sessionReferenceId,
    provider: "youtube",
    plan_entitlement_reference_id: "comment-translator-free-public-v1",
    event_type: eventType,
    occurred_at: occurredAt,
    usage_day: usageDay,
    usage_month: "2026-07-01",
    session_elapsed_ms: 0,
    provider_request_estimate_count: eventType === "provider-request-estimated" ? 1 : 0,
    provider_quota_unit_estimate: eventType === "provider-request-estimated" ? 1 : 0,
    translated_message_estimate: translatedMessageEstimate,
    translated_character_estimate: translatedMessageEstimate * 10,
    estimated_cost_micros: translatedMessageEstimate * 10,
    provider_error_class: null,
    provider_error_count: 0,
    stop_reason: null,
    quota_stop_category: null,
    client_readable_detail: null,
    created_at: "2026-07-10T00:01:00.000Z"
  };
}

function createReadyDurableStore(rows) {
  return {
    status: "ready",
    store: {
      async readUsageEvents() {
        return rows;
      },
      async persistUsageEvent() {}
    },
    missingEnvReferences: [],
    failClosed: false
  };
}

async function readDurableSnapshot(rows, snapshotNowMs = nowMs, planEntitlementOverride) {
  return durableUsage.readCommentTranslatorDurableUsageSnapshotOrFailClosed({
    callerAuthorization,
    durableUsageCounterStore: createReadyDurableStore(rows),
    nowMs: snapshotNowMs,
    plan: "free",
    activeSession,
    planEntitlementOverride
  });
}

const belowCapRead = await readDurableSnapshot([
  createDurableRow({
    id: "below-cap",
    occurredAt: "2026-07-10T00:00:20.000Z",
    translatedMessageEstimate: 29
  })
]);
assert.equal(belowCapRead.status, "ready", "Given trusted below-cap rows, when reading durable usage, then authority remains ready");
assert.equal(belowCapRead.snapshot.translatedMessagesInCurrentMinute, 29);
assert.equal(
  belowCapRead.snapshot.translatedMessageCapacityAvailableAtMs,
  null,
  "Given usage below the cap, when reading durable usage, then no recovery time is authorized"
);

const previewOverrideCappedRead = await readDurableSnapshot(
  [
    createDurableRow({
      id: "preview-override-cap",
      occurredAt: "2026-07-10T00:00:20.000Z",
      translatedMessageEstimate: 5
    })
  ],
  nowMs,
  { translatedMessagesPerMinute: 5 }
);
assert.equal(previewOverrideCappedRead.status, "ready");
assert.equal(previewOverrideCappedRead.snapshot.planEntitlement.translatedMessagesPerMinute, 5);
assert.equal(previewOverrideCappedRead.snapshot.translatedMessagesInCurrentMinute, 5);
assert.equal(
  previewOverrideCappedRead.snapshot.translatedMessageCapacityAvailableAtMs,
  Date.parse("2026-07-10T00:01:20.000Z"),
  "Given the reviewed preview limit, when five translated messages fill its rolling window, then durable recovery authority uses the same five-message entitlement"
);

const nonProviderOnlyDurableRead = await readDurableSnapshot([
  createDurableRow({
    id: "cache-hit-only-zero-provider-usage",
    occurredAt: "2026-07-10T00:00:20.000Z",
    translatedMessageEstimate: 0
  }),
  createDurableRow({
    id: "filtered-only-zero-provider-usage",
    occurredAt: "2026-07-10T00:00:30.000Z",
    translatedMessageEstimate: 0
  })
]);
assert.equal(
  nonProviderOnlyDurableRead.snapshot.translatedMessagesInCurrentMinute,
  0,
  "Given cache-hit and filtered durable rows, when reading usage, then non-provider work contributes zero rolling count"
);
assert.equal(nonProviderOnlyDurableRead.snapshot.translatedMessageCapacityAvailableAtMs, null);

const exactExpiryDurableRead = await readDurableSnapshot([
  createDurableRow({
    id: "provider-execution-expiring-exactly-now",
    occurredAt: "2026-07-10T00:00:00.000Z",
    translatedMessageEstimate: 30
  })
]);
assert.equal(
  exactExpiryDurableRead.snapshot.translatedMessagesInCurrentMinute,
  0,
  "Given an event expiring exactly now, when reading durable usage, then its capacity is already released"
);
assert.equal(exactExpiryDurableRead.snapshot.translatedMessageCapacityAvailableAtMs, null);

const crossDayNowMs = Date.parse("2026-07-10T00:00:30.000Z");
const crossDayDurableRead = await readDurableSnapshot(
  [
    createDurableRow({
      id: "previous-day-current-window-provider-execution",
      occurredAt: "2026-07-09T23:59:45.000Z",
      translatedMessageEstimate: 30,
      usageDay: "2026-07-09"
    })
  ],
  crossDayNowMs
);
assert.equal(
  crossDayDurableRead.snapshot.translatedMessagesInCurrentMinute,
  30,
  "Given a previous-day event inside the rolling window, when reading durable usage, then it remains counted"
);
assert.equal(crossDayDurableRead.snapshot.translatedMessageCapacityAvailableAtMs, Date.parse("2026-07-10T00:00:45.000Z"));

const cappedRows = [
  createDurableRow({
    id: "expired-provider-execution",
    occurredAt: "2026-07-09T23:59:59.999Z",
    translatedMessageEstimate: 30
  }),
  createDurableRow({
    id: "other-session-provider-execution",
    sessionReferenceId: "cts_auto_resume_other",
    occurredAt: "2026-07-10T00:00:01.000Z",
    translatedMessageEstimate: 30
  }),
  createDurableRow({
    id: "non-ai-event",
    eventType: "provider-request-estimated",
    occurredAt: "2026-07-10T00:00:02.000Z",
    translatedMessageEstimate: 30
  }),
  createDurableRow({
    id: "cache-hit-no-provider-usage",
    occurredAt: "2026-07-10T00:00:03.000Z",
    translatedMessageEstimate: 0
  }),
  createDurableRow({
    id: "filtered-no-provider-usage",
    occurredAt: "2026-07-10T00:00:04.000Z",
    translatedMessageEstimate: 0
  }),
  createDurableRow({
    id: "multi-message-provider-execution",
    occurredAt: "2026-07-10T00:00:10.000Z",
    translatedMessageEstimate: 2
  }),
  createDurableRow({
    id: "later-provider-execution",
    occurredAt: "2026-07-10T00:00:20.000Z",
    translatedMessageEstimate: 28
  })
];
const cappedRead = await readDurableSnapshot(cappedRows);
assert.equal(cappedRead.status, "ready", "Given trusted capped rows, when reading durable usage, then authority remains ready");
assert.equal(cappedRead.snapshot.translatedMessagesInCurrentMinute, 30);
assert.equal(
  cappedRead.snapshot.translatedMessageCapacityAvailableAtMs,
  Date.parse("2026-07-10T00:01:10.000Z"),
  "Given exact-cap provider executions, when reading durable usage, then the earliest positive event expiry frees capacity"
);

const malformedCappedRead = await readDurableSnapshot([
  createDurableRow({
    id: "untrustworthy-capped-provider-execution",
    occurredAt: "untrustworthy-event-time",
    translatedMessageEstimate: 30
  })
]);
assert.equal(
  malformedCappedRead.status,
  "fail-closed",
  "Given capped usage without a trustworthy event time, when reading durable usage, then recovery is not authorized"
);
assert.equal(malformedCappedRead.stopReason, "global-budget-stop");

function recordInMemoryAiUsage({ sessionReferenceId, occurredAtMs, translatedMessageEstimate }) {
  usageLedger.recordInMemoryCommentTranslatorUsageLedgerEvent({
    callerAuthorization,
    event: {
      type: "ai-usage-estimated",
      provider: "youtube",
      sessionReferenceId,
      occurredAtMs,
      translatedMessageEstimate,
      providerInputCharacterEstimate: translatedMessageEstimate * 10,
      translatedCharacterEstimate: translatedMessageEstimate * 10,
      estimatedCostMicros: translatedMessageEstimate * 10,
      rawCommentText: "never-recorded-by-design"
    }
  });
}

function readInMemorySnapshot() {
  return usageLedger.readInMemoryCommentTranslatorUsageSnapshot({
    callerAuthorization,
    nowMs,
    plan: "free",
    activeSession
  });
}

usageLedger.resetInMemoryCommentTranslatorUsageLedgerForTests();
recordInMemoryAiUsage({
  sessionReferenceId: activeSession.sessionReferenceId,
  occurredAtMs: Date.parse("2026-07-10T00:00:20.000Z"),
  translatedMessageEstimate: 29
});
const belowCapInMemorySnapshot = readInMemorySnapshot();
assert.equal(belowCapInMemorySnapshot.translatedMessagesInCurrentMinute, 29);
assert.equal(
  belowCapInMemorySnapshot.translatedMessageCapacityAvailableAtMs,
  null,
  "Given in-memory usage below the cap, when reading usage, then no recovery time is authorized"
);

usageLedger.resetInMemoryCommentTranslatorUsageLedgerForTests();
recordInMemoryAiUsage({
  sessionReferenceId: activeSession.sessionReferenceId,
  occurredAtMs: Date.parse("2026-07-10T00:00:20.000Z"),
  translatedMessageEstimate: 0
});
recordInMemoryAiUsage({
  sessionReferenceId: activeSession.sessionReferenceId,
  occurredAtMs: Date.parse("2026-07-10T00:00:30.000Z"),
  translatedMessageEstimate: 0
});
const nonProviderOnlyInMemorySnapshot = readInMemorySnapshot();
assert.equal(
  nonProviderOnlyInMemorySnapshot.translatedMessagesInCurrentMinute,
  0,
  "Given cache-hit and filtered in-memory rows, when reading usage, then non-provider work contributes zero rolling count"
);
assert.equal(nonProviderOnlyInMemorySnapshot.translatedMessageCapacityAvailableAtMs, null);

usageLedger.resetInMemoryCommentTranslatorUsageLedgerForTests();
recordInMemoryAiUsage({
  sessionReferenceId: activeSession.sessionReferenceId,
  occurredAtMs: Date.parse("2026-07-09T23:59:45.000Z"),
  translatedMessageEstimate: 30
});
const crossDayInMemorySnapshot = usageLedger.readInMemoryCommentTranslatorUsageSnapshot({
  callerAuthorization,
  nowMs: crossDayNowMs,
  plan: "free",
  activeSession
});
assert.equal(
  crossDayInMemorySnapshot.translatedMessagesInCurrentMinute,
  30,
  "Given a previous-day event inside the rolling window, when reading in-memory usage, then it remains counted"
);
assert.equal(crossDayInMemorySnapshot.translatedMessageCapacityAvailableAtMs, Date.parse("2026-07-10T00:00:45.000Z"));

usageLedger.resetInMemoryCommentTranslatorUsageLedgerForTests();
recordInMemoryAiUsage({
  sessionReferenceId: activeSession.sessionReferenceId,
  occurredAtMs: Date.parse("2026-07-10T00:00:00.000Z"),
  translatedMessageEstimate: 30
});
const exactExpiryInMemorySnapshot = readInMemorySnapshot();
assert.equal(
  exactExpiryInMemorySnapshot.translatedMessagesInCurrentMinute,
  0,
  "Given an event expiring exactly now, when reading in-memory usage, then its capacity is already released"
);
assert.equal(exactExpiryInMemorySnapshot.translatedMessageCapacityAvailableAtMs, null);

usageLedger.resetInMemoryCommentTranslatorUsageLedgerForTests();
recordInMemoryAiUsage({
  sessionReferenceId: "cts_auto_resume_other",
  occurredAtMs: Date.parse("2026-07-10T00:00:01.000Z"),
  translatedMessageEstimate: 30
});
recordInMemoryAiUsage({
  sessionReferenceId: activeSession.sessionReferenceId,
  occurredAtMs: Date.parse("2026-07-09T23:59:59.999Z"),
  translatedMessageEstimate: 30
});
recordInMemoryAiUsage({
  sessionReferenceId: activeSession.sessionReferenceId,
  occurredAtMs: Date.parse("2026-07-10T00:00:03.000Z"),
  translatedMessageEstimate: 0
});
recordInMemoryAiUsage({
  sessionReferenceId: activeSession.sessionReferenceId,
  occurredAtMs: Date.parse("2026-07-10T00:00:04.000Z"),
  translatedMessageEstimate: 0
});
usageLedger.recordInMemoryCommentTranslatorUsageLedgerEvent({
  callerAuthorization,
  event: {
    type: "provider-request-estimated",
    provider: "youtube",
    sessionReferenceId: activeSession.sessionReferenceId,
    occurredAtMs: Date.parse("2026-07-10T00:00:02.000Z"),
    requestEstimateCount: 1,
    quotaUnitEstimate: 1,
    providerTargetMetadata: "forbidden"
  }
});
recordInMemoryAiUsage({
  sessionReferenceId: activeSession.sessionReferenceId,
  occurredAtMs: Date.parse("2026-07-10T00:00:10.000Z"),
  translatedMessageEstimate: 2
});
recordInMemoryAiUsage({
  sessionReferenceId: activeSession.sessionReferenceId,
  occurredAtMs: Date.parse("2026-07-10T00:00:20.000Z"),
  translatedMessageEstimate: 28
});
const cappedInMemorySnapshot = readInMemorySnapshot();
assert.equal(cappedInMemorySnapshot.translatedMessagesInCurrentMinute, 30);
assert.equal(
  cappedInMemorySnapshot.translatedMessageCapacityAvailableAtMs,
  Date.parse("2026-07-10T00:01:10.000Z"),
  "Given exact-cap in-memory provider executions, when reading usage, then the earliest positive event expiry frees capacity"
);

usageLedger.resetInMemoryCommentTranslatorUsageLedgerForTests();
recordInMemoryAiUsage({
  sessionReferenceId: activeSession.sessionReferenceId,
  occurredAtMs: Number.NaN,
  translatedMessageEstimate: 30
});
assert.throws(
  () => readInMemorySnapshot(),
  /recovery authority/i,
  "Given capped in-memory usage without a finite event time, when reading usage, then authority fails closed"
);

pollingWiring.resetCommentTranslatorBoundedLiveChatPollingStateForTests();
assert.deepEqual(
  pollingWiring.readCommentTranslatorBoundedLiveChatPollingPhaseResolution(activeSession.sessionReferenceId),
  { status: "fail-closed", stopReason: "global-budget-stop" },
  "Given an active reference without coordinator state, when reading phase authority, then the read-only result fails closed"
);
assert.deepEqual(
  pollingWiring.readCommentTranslatorBoundedLiveChatPollingPhaseResolutionForUsage({
    sessionReferenceId: activeSession.sessionReferenceId,
    usage: belowCapRead.snapshot,
    nowMs
  }),
  { status: "ready", projection: resyncingProjection },
  "Given durable below-cap usage after a coordinator reset, when restoring status, then the active session resynchronizes"
);
assert.deepEqual(
  pollingWiring.readCommentTranslatorBoundedLiveChatPollingPhaseResolutionForUsage({
    sessionReferenceId: activeSession.sessionReferenceId,
    usage: {
      ...belowCapRead.snapshot,
      translatedMessagesInCurrentMinute: 30,
      translatedMessageCapacityAvailableAtMs: nowMs + 20_000
    },
    nowMs
  }),
  {
    status: "ready",
    projection: {
      activePhase: "rate-paused",
      ratePauseReason: "translated-message-cap",
      retryAfterSeconds: 20,
      automaticResumeExpected: true
    }
  },
  "Given durable capped usage with recovery authority after a coordinator reset, when restoring status, then the active session remains paused"
);
assert.deepEqual(
  pollingWiring.readCommentTranslatorBoundedLiveChatPollingPhaseResolutionForUsage({
    sessionReferenceId: activeSession.sessionReferenceId,
    usage: {
      ...belowCapRead.snapshot,
      translatedMessagesInCurrentMinute: 30,
      translatedMessageCapacityAvailableAtMs: null
    },
    nowMs
  }),
  { status: "fail-closed", stopReason: "global-budget-stop" },
  "Given durable capped usage without recovery authority after a coordinator reset, when restoring status, then the boundary fails closed"
);
pollingWiring.seedCommentTranslatorBoundedLiveChatPollingStateForActiveSession({
  state: {
    status: "active",
    sessionReferenceId: activeSession.sessionReferenceId
  },
  liveChatTargetReadiness: {
    status: "ready",
    serverOnlyTarget: {
      [serverOnlyLiveTargetIdKey]: "server-only-auto-resume-target"
    }
  },
  nowMs
});
assert.deepEqual(
  pollingWiring.readCommentTranslatorBoundedLiveChatPollingPhaseResolutionForUsage({
    sessionReferenceId: activeSession.sessionReferenceId,
    usage: {
      ...belowCapRead.snapshot,
      translatedMessagesInCurrentMinute: 30,
      translatedMessageCapacityAvailableAtMs: nowMs + 20_000
    },
    nowMs
  }),
  { status: "ready", projection: runningProjection },
  "Given stored coordinator phase authority, when status usage differs, then the stored phase is preserved"
);
let pausedPollingAdapterCallCount = 0;
const pausedPollingResult = await pollingWiring.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "heartbeat",
  activeSession: {
    ...activeSession,
    lastHeartbeatAtMs: nowMs
  },
  usage: {
    dailyUsedMs: 0,
    translatedMessagesInCurrentMinute: 30,
    translatedMessageCapacityAvailableAtMs: nowMs + 20_000,
    providerBudgetAvailable: true,
    globalBudgetAvailable: true,
    aiBudgetAvailable: true,
    translationProviderAvailable: true,
    planEntitlement: usageLedger.createCommentTranslatorSessionPlanEntitlement?.({ plan: "free" }) ?? {
      plan: "free",
      translatedMessagesPerMinute: 30,
      sessionLimitMs: 1_800_000,
      dailyLimitMs: 1_800_000
    }
  },
  adapter: {
    status: "ready",
    providerAccess: "deterministic-local-adapter-only",
    runtime: {
      async pollLiveChatOnce(state) {
        pausedPollingAdapterCallCount += 1;
        return { state, comments: [] };
      }
    }
  },
  nowMs
});
assert.equal(
  pausedPollingResult.status,
  "rate-limit-paused",
  "Given the translated-message cap, when polling, then the active session enters a recoverable rate pause"
);
assert.equal(pausedPollingResult.providerSignal, null);
assert.equal(pausedPollingAdapterCallCount, 0, "Given a rate pause, then the polling adapter is not invoked");
assert.deepEqual(
  pollingWiring.readCommentTranslatorBoundedLiveChatPollingPhaseResolution(activeSession.sessionReferenceId),
  { status: "ready", projection: pausedPollingResult.phaseProjection },
  "Given a rate pause, when reading shared phase authority, then the exact ready resolution is exposed"
);
assert.deepEqual(
  pollingWiring.readCommentTranslatorBoundedLiveChatPollingPhaseResolutionForUsage({
    sessionReferenceId: activeSession.sessionReferenceId,
    usage: belowCapRead.snapshot,
    nowMs
  }),
  { status: "ready", projection: pausedPollingResult.phaseProjection },
  "Given a stored rate pause, when durable usage is below cap, then status preserves the stored coordinator phase"
);
assert.equal(
  "serverOnlyCommentsForTranslation" in pausedPollingResult,
  false,
  "Given a rate pause, then no server-only comments can reach translation"
);

let sessionStepTargetLookupCallCount = 0;
let sessionStepPollingCallCount = 0;
const sessionStepTargetLookupAdapter = {
  async verifyOwner() {
    sessionStepTargetLookupCallCount += 1;
    return {
      status: "owner-verified",
      ownerChannelReference: "server-only-session-step-owner",
      checkedBy: "server-runtime-adapter",
      evidence: {
        ownedBroadcastLookup: "liveBroadcasts.list-mine-true",
        liveChatIdSource: "owned-broadcast-snippet-liveChatId"
      }
    };
  },
  async lookupOwnedBroadcasts() {
    sessionStepTargetLookupCallCount += 1;
    return {
      lookup: "liveBroadcasts.list-mine-true",
      broadcasts: [
        {
          broadcastId: "server-only-session-step-broadcast",
          lifecycleStatus: "live",
          [serverOnlyLiveTargetIdKey]: "server-only-session-step-target"
        }
      ],
      providerRequest: "forbidden"
    };
  }
};
const sessionStepPollingAdapter = {
  status: "ready",
  providerAccess: "deterministic-local-adapter-only",
  runtime: {
    async pollLiveChatOnce(state) {
      sessionStepPollingCallCount += 1;
      const isRecoveryPrime = sessionStepPollingCallCount === 2;
      return youtubeRuntime.advanceYouTubeLiveChatPollingState(state, {
        type: "messages",
        receivedAtMs: isRecoveryPrime ? nowMs + 20_000 : nowMs,
        nextPageToken: isRecoveryPrime
          ? "server-only-session-step-recovery-cursor"
          : "server-only-session-step-initial-cursor",
        pollingIntervalMillis: 1_000,
        comments: [
          {
            id: isRecoveryPrime ? "session-step-pause-window-comment" : "session-step-initial-comment",
            publishedAt: "2026-07-10T00:01:00.000Z",
            text: "server only session step comment",
            platformLanguageHint: "ja"
          }
        ]
      });
    }
  }
};
const sessionStepActiveSession = {
  ...activeSession,
  lastHeartbeatAtMs: nowMs
};
const sessionStepUsage = {
  ...belowCapRead.snapshot,
  currentSessionElapsedMs: 120_000,
  translatedMessagesInCurrentMinute: 29,
  translatedMessageCapacityAvailableAtMs: null
};
const sessionStepBaseInput = {
  activeSession: sessionStepActiveSession,
  callerAuthorization,
  credentialReadiness: {
    status: "ready",
    credentialReferenceId: activeSession.credentialReferenceId
  },
  targetLookupAdapter: sessionStepTargetLookupAdapter,
  pollingAdapter: sessionStepPollingAdapter,
  nowMs,
  targetLanguage: "en"
};
const missingStateAtCapUsage = {
  ...sessionStepUsage,
  translatedMessagesInCurrentMinute: 30,
  translatedMessageCapacityAvailableAtMs: nowMs + 20_000
};
const missingStateAtCap = await liveProviderSessionStep.runCommentTranslatorLiveProviderSessionStep({
  ...sessionStepBaseInput,
  usage: missingStateAtCapUsage
});
assert.equal(missingStateAtCap.pollingTick.status, "rate-limit-paused");
assert.equal(sessionStepTargetLookupCallCount, 0, "A capped missing-state step does not run target lookup merely to pause");
assert.equal(sessionStepPollingCallCount, 0);
assert.equal(missingStateAtCap.diagnostics.providerCallCount, 0);

pollingWiring.resetCommentTranslatorBoundedLiveChatPollingStateForTests();
const cappedHeartbeatFixture = createStatusBoundaryFixture();
const cappedHeartbeatPhase = {
  activePhase: "rate-paused",
  ratePauseReason: "translated-message-cap",
  retryAfterSeconds: 20,
  automaticResumeExpected: true
};
const cappedHeartbeatPollingWiringMock = {
  ...cappedHeartbeatFixture.mocks["@/lib/comment-translator-bounded-live-chat-polling-wiring"],
  readCommentTranslatorBoundedLiveChatPollingTick: async () => {
    cappedHeartbeatFixture.calls.coordinatorTick += 1;
    return {
      status: "rate-limit-paused",
      providerAccess: "not-run",
      providerSignal: null,
      phaseProjection: cappedHeartbeatPhase,
      sanitizedPolling: {},
      publicLaunchAllowed: false
    };
  }
};
const cappedHeartbeatLiveProviderStepMock = {
  runCommentTranslatorLiveProviderSessionStep: async () => {
    cappedHeartbeatFixture.calls.providerStep += 1;
    return {
      pollingTick: {
        status: "rate-limit-paused",
        providerAccess: "not-run",
        providerSignal: null,
        phaseProjection: cappedHeartbeatPhase,
        sanitizedPolling: {},
        publicLaunchAllowed: false
      }
    };
  }
};
const cappedHeartbeatMocks = {
  ...cappedHeartbeatFixture.mocks,
  "server-only": {},
  "@/lib/comment-translator-bounded-live-chat-polling-wiring": cappedHeartbeatPollingWiringMock,
  "@/lib/comment-translator-live-provider-session-step": cappedHeartbeatLiveProviderStepMock,
  "./comment-translator-durable-session-store": cappedHeartbeatFixture.mocks["@/lib/comment-translator-durable-session-store"],
  "./comment-translator-durable-usage-counter-store": cappedHeartbeatFixture.mocks["@/lib/comment-translator-durable-usage-counter-store"],
  "./comment-translator-session-runtime": cappedHeartbeatFixture.mocks["@/lib/comment-translator-session-runtime"],
  "./comment-translator-bounded-live-chat-polling-wiring": cappedHeartbeatPollingWiringMock,
  "./comment-translator-live-provider-session-step": cappedHeartbeatLiveProviderStepMock,
  "./comment-translator-server-only-live-chat-target-lookup": cappedHeartbeatFixture.mocks["@/lib/comment-translator-server-only-live-chat-target-lookup"],
  "./comment-translator-youtube-live-provider-runtime-adapter": cappedHeartbeatFixture.mocks["@/lib/comment-translator-youtube-live-provider-runtime-adapter"],
  "./comment-translator-azure-normal-translation-execution": cappedHeartbeatFixture.mocks["@/lib/comment-translator-azure-normal-translation-execution"],
  "./comment-translator-usage-ledger-runtime": cappedHeartbeatFixture.mocks["@/lib/comment-translator-usage-ledger-runtime"]
};
const cappedHeartbeatModule = loadBoundaryModuleWithMocks(sessionCommandExecutionPath, cappedHeartbeatMocks);
const cappedHeartbeatState = await cappedHeartbeatModule.executeCommentTranslatorSessionCommand({
  intent: "heartbeat",
  nowMs,
  plan: "free",
  callerAuthorization,
  credentialReadiness: {
    status: "ready",
    provider: "youtube",
    credentialReferenceId: activeSession.credentialReferenceId,
    translatorStartAllowed: true,
    reconnectGuidance: "none"
  },
  credentialReferenceId: activeSession.credentialReferenceId,
  activeSession,
  usage: missingStateAtCapUsage,
  durableSessionStore: { status: "ready" },
  durableUsageCounterStore: { status: "ready" },
  browserConnected: true,
  targetLanguage: "ja"
});
assert.equal(cappedHeartbeatState.status, "active");
assert.equal(cappedHeartbeatState.activePhase, "rate-paused");
assert.equal(cappedHeartbeatFixture.calls.providerRuntime, 0);
assert.equal(cappedHeartbeatFixture.calls.targetLookup, 0);
assert.equal(cappedHeartbeatFixture.calls.providerStep, 0);
assert.equal(cappedHeartbeatFixture.calls.coordinatorTick, 1);

const missingStateAtCapFinalState = await sessionRuntime.readCommentTranslatorSessionCommand({
  intent: "heartbeat",
  nowMs,
  plan: "free",
  callerAuthorization,
  credentialReadiness: {
    status: "ready",
    provider: "youtube",
    credentialReferenceId: activeSession.credentialReferenceId,
    translatorStartAllowed: true,
    reconnectGuidance: "none"
  },
  activeSession: sessionStepActiveSession,
  usage: missingStateAtCapUsage,
  ratePauseResolution: {
    status: "ready",
    projection: missingStateAtCap.pollingTick.phaseProjection
  },
  providerSignal: missingStateAtCap.pollingTick.providerSignal,
  providerSignalReasonUxCode: missingStateAtCap.pollingTick.reasonUxCode,
  createSessionReferenceId: () => "cts_unused_missing_state_at_cap"
});
assert.equal(missingStateAtCapFinalState.status, "active");
assert.equal(missingStateAtCapFinalState.activePhase, "rate-paused");
assert.equal(missingStateAtCapFinalState.stopReason, null);
assert.equal(sessionStepTargetLookupCallCount, 0);
assert.equal(sessionStepPollingCallCount, 0);
assert.equal(missingStateAtCap.diagnostics.providerCallCount, 0);

const initialSessionStepPrime = await liveProviderSessionStep.runCommentTranslatorLiveProviderSessionStep({
  ...sessionStepBaseInput,
  usage: sessionStepUsage
});
assert.equal(initialSessionStepPrime.pollingTick.status, "cursor-primed-existing-comments-skipped");
assert.equal(initialSessionStepPrime.translationStatus, "not-run");
assert.equal(initialSessionStepPrime.diagnostics.providerCallCount, 0);
assert.equal(sessionStepTargetLookupCallCount, 2);
assert.equal(sessionStepPollingCallCount, 1);

const pausedSessionStep = await liveProviderSessionStep.runCommentTranslatorLiveProviderSessionStep({
  ...sessionStepBaseInput,
  usage: {
    ...sessionStepUsage,
    translatedMessagesInCurrentMinute: 30,
    translatedMessageCapacityAvailableAtMs: nowMs + 20_000
  },
  nowMs: nowMs + 1_000
});
assert.equal(pausedSessionStep.pollingTick.status, "rate-limit-paused");
assert.equal(pausedSessionStep.translationStatus, "not-run");
assert.equal(pausedSessionStep.diagnostics.pollTickStatus, "not-due");
assert.equal(pausedSessionStep.diagnostics.providerCallCount, 0);
assert.equal(sessionStepTargetLookupCallCount, 2);
assert.equal(sessionStepPollingCallCount, 1);

const recoverySessionStepPrime = await liveProviderSessionStep.runCommentTranslatorLiveProviderSessionStep({
  ...sessionStepBaseInput,
  usage: sessionStepUsage,
  nowMs: nowMs + 20_000
});
assert.equal(recoverySessionStepPrime.pollingTick.status, "cursor-primed-existing-comments-skipped");
assert.equal(recoverySessionStepPrime.translationStatus, "not-run");
assert.equal(recoverySessionStepPrime.diagnostics.providerCallCount, 0);
assert.equal(sessionStepPollingCallCount, 2);
assert.doesNotMatch(
  JSON.stringify([missingStateAtCap, initialSessionStepPrime, pausedSessionStep, recoverySessionStepPrime]),
  /server-only-session-step-(target|broadcast|initial-cursor|recovery-cursor)|server only session step comment/i
);

const routeFailClosedFixture = createStatusBoundaryFixture({
  phaseResolution: { status: "fail-closed", stopReason: "global-budget-stop" },
  credentialReadinessMustStayUnread: false
});
const routeFailClosedModule = loadBoundaryModuleWithMocks(routePath, routeFailClosedFixture.mocks);
const routeFailClosedResponse = await routeFailClosedModule.POST({
  headers: { get: () => "application/json" },
  async json() { return { intent: "status" }; }
});
assert.equal(routeFailClosedResponse.body.status, "stopped");
assert.equal(routeFailClosedResponse.body.stopReason, "global-budget-stop");
assert.equal(routeFailClosedFixture.calls.providerRuntime, 0);
assert.equal(routeFailClosedFixture.calls.targetLookup, 0);
assert.equal(routeFailClosedFixture.calls.credentialReadiness, 0);
assert.equal(routeFailClosedFixture.calls.credentialRefresh, 0);

const routeStatusFixture = createStatusBoundaryFixture();
const routeModule = loadBoundaryModuleWithMocks(routePath, routeStatusFixture.mocks);
const routeResponse = await routeModule.POST({
  headers: {
    get(name) {
      return name === "content-type" ? "application/json" : null;
    }
  },
  async json() {
    return { intent: "status" };
  }
});
assert.equal(routeResponse.body.status, "active");
assert.equal(
  routeStatusFixture.calls.providerRuntime,
  0,
  "Given route status restore, when orchestrating the read, then no live provider runtime is created"
);
assert.equal(
  routeStatusFixture.calls.targetLookup,
  0,
  "Given route status restore, when orchestrating the read, then no live target lookup runs"
);
assert.equal(routeStatusFixture.calls.credentialReadiness, 0, "Route status does not read OAuth credential readiness");
assert.equal(routeStatusFixture.calls.credentialRefresh, 0, "Route status does not refresh or persist OAuth credential state");
assert.equal(routeStatusFixture.calls.phaseRead, 1, "Route status reads the polling coordinator phase exactly once");
assert.deepEqual(routeStatusFixture.calls.commandPhaseResolutions, [
  {
    status: "ready",
    projection: {
      activePhase: "rate-paused",
      ratePauseReason: "translated-message-cap",
      retryAfterSeconds: 20,
      automaticResumeExpected: true
    }
  }
]);
assert.ok(
  routeStatusFixture.calls.order.indexOf("preview-entitlement") < routeStatusFixture.calls.order.indexOf("usage"),
  "Route resolves exact-marker preview allowed-tester entitlement before durable usage"
);
assert.ok(
  routeStatusFixture.calls.order.indexOf("usage") < routeStatusFixture.calls.order.indexOf("phase"),
  "Route resolves durable usage before coordinator phase"
);

pollingWiring.resetCommentTranslatorBoundedLiveChatPollingStateForTests();
const routeColdStartFixture = createStatusBoundaryFixture({
  restoreMissingPhaseFromUsage: true,
  translatedMessagesInCurrentMinute: 29,
  translatedMessageCapacityAvailableAtMs: null
});
const routeColdStartModule = loadBoundaryModuleWithMocks(routePath, routeColdStartFixture.mocks);
const routeColdStartResponse = await routeColdStartModule.POST({
  headers: { get: () => "application/json" },
  async json() { return { intent: "status" }; }
});
assert.equal(routeColdStartResponse.body.status, "active");
assert.equal(routeColdStartResponse.body.activePhase, "resyncing");
assert.equal(routeColdStartFixture.calls.credentialReadiness, 0);
assert.equal(routeColdStartFixture.calls.credentialRefresh, 0);
assert.equal(routeColdStartFixture.calls.providerRuntime, 0);
assert.equal(routeColdStartFixture.calls.targetLookup, 0);
assert.equal(routeColdStartFixture.calls.sessionPersistence, 0);
assert.equal(routeColdStartFixture.calls.usagePersistence, 0);

const actionStatusFixture = createStatusBoundaryFixture();
const actionsModule = loadBoundaryModuleWithMocks(actionsPath, actionStatusFixture.mocks);
const actionState = await actionsModule.getCommentTranslatorSessionStatusAction();
assert.equal(actionState.status, "active");
assert.equal(
  actionStatusFixture.calls.providerRuntime,
  0,
  "Given server-action status restore, when orchestrating the read, then no live provider runtime is created"
);
assert.equal(
  actionStatusFixture.calls.targetLookup,
  0,
  "Given server-action status restore, when orchestrating the read, then no live target lookup runs"
);
assert.equal(actionStatusFixture.calls.credentialReadiness, 0, "Server-action status does not read OAuth credential readiness");
assert.equal(actionStatusFixture.calls.credentialRefresh, 0, "Server-action status does not refresh or persist OAuth credential state");
assert.equal(actionStatusFixture.calls.phaseRead, 1, "Server-action status reads the polling coordinator phase exactly once");
assert.deepEqual(actionStatusFixture.calls.commandPhaseResolutions, [
  {
    status: "ready",
    projection: {
      activePhase: "rate-paused",
      ratePauseReason: "translated-message-cap",
      retryAfterSeconds: 20,
      automaticResumeExpected: true
    }
  }
]);
assert.ok(
  actionStatusFixture.calls.order.indexOf("preview-entitlement") < actionStatusFixture.calls.order.indexOf("usage"),
  "Server action resolves exact-marker preview allowed-tester entitlement before durable usage"
);
assert.ok(
  actionStatusFixture.calls.order.indexOf("usage") < actionStatusFixture.calls.order.indexOf("phase"),
  "Server action resolves durable usage before coordinator phase"
);

pollingWiring.resetCommentTranslatorBoundedLiveChatPollingStateForTests();
const actionColdStartFixture = createStatusBoundaryFixture({ restoreMissingPhaseFromUsage: true });
const actionColdStartModule = loadBoundaryModuleWithMocks(actionsPath, actionColdStartFixture.mocks);
const actionColdStartState = await actionColdStartModule.getCommentTranslatorSessionStatusAction();
assert.equal(actionColdStartState.status, "active");
assert.equal(actionColdStartState.activePhase, "rate-paused");
assert.equal(actionColdStartState.retryAfterSeconds, 20);
assert.equal(actionColdStartFixture.calls.credentialReadiness, 0);
assert.equal(actionColdStartFixture.calls.credentialRefresh, 0);
assert.equal(actionColdStartFixture.calls.providerRuntime, 0);
assert.equal(actionColdStartFixture.calls.targetLookup, 0);
assert.equal(actionColdStartFixture.calls.sessionPersistence, 0);
assert.equal(actionColdStartFixture.calls.usagePersistence, 0);

const actionFailClosedFixture = createStatusBoundaryFixture({
  phaseResolution: { status: "fail-closed", stopReason: "global-budget-stop" }
});
const actionFailClosedModule = loadBoundaryModuleWithMocks(actionsPath, actionFailClosedFixture.mocks);
const actionFailClosedState = await actionFailClosedModule.getCommentTranslatorSessionStatusAction();
assert.equal(actionFailClosedState.status, "stopped");
assert.equal(actionFailClosedState.stopReason, "global-budget-stop");
assert.equal(actionFailClosedFixture.calls.providerRuntime, 0);
assert.equal(actionFailClosedFixture.calls.targetLookup, 0);
assert.equal(actionFailClosedFixture.calls.credentialReadiness, 0);
assert.equal(actionFailClosedFixture.calls.credentialRefresh, 0);

console.log("comment translator per-minute auto-resume contract checks passed");
