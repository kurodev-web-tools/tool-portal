import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const uxPath = "lib/comment-translator-start-stop-reason-ux.ts";
const sessionPath = "lib/comment-translator-session-runtime.ts";
const targetLookupPath = "lib/comment-translator-server-only-live-chat-target-lookup.ts";
const pollingPath = "lib/comment-translator-bounded-live-chat-polling-wiring.ts";
const pollingOutcomeProjectionPath = "lib/comment-translator-bounded-live-chat-polling-result-projection.ts";
const actionsPath = "app/tools/comment-translator/actions.ts";
const sessionActionsPath = "app/tools/comment-translator/session-actions.ts";
const sessionRoutePath = "app/api/comment-translator/session/route.ts";
const sessionCommandExecutionPath = "lib/comment-translator-session-command-execution.ts";
const abuseRateLimitPath = "lib/comment-translator-abuse-rate-limit-runtime.ts";
const privateLaunchPath = "lib/comment-translator-private-launch-access-gate.ts";
const dockPath = "components/comment-translator/CommentTranslatorDock.tsx";
const copyPath = "lib/comment-translator.ts";
const copyDataPaths = ["lib/comment-translator-copy-ja.json", "lib/comment-translator-copy-en.json"];
const readinessDocPath = "docs/active/COMMENT_TRANSLATOR_DURABLE_PERSISTENCE_SCHEMA_READINESS.md";
const gapAuditPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md";
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

for (const requiredPath of [
  uxPath,
  sessionPath,
  targetLookupPath,
  pollingPath,
  pollingOutcomeProjectionPath,
  "lib/comment-translator-bounded-live-chat-polling-outcome-projection.ts",
  "lib/comment-translator-bounded-live-chat-polling-types.ts",
  "lib/comment-translator-bounded-live-chat-polling-terminal-policy.ts",
  "lib/comment-translator-bounded-live-chat-polling-static-wiring.ts",
  "lib/comment-translator-bounded-live-chat-polling-registry.ts",
  "lib/comment-translator-bounded-live-chat-polling-transition.ts",
  actionsPath,
  sessionActionsPath,
  sessionRoutePath,
  sessionCommandExecutionPath,
  abuseRateLimitPath,
  privateLaunchPath,
  dockPath,
  copyPath,
  ...copyDataPaths,
  readinessDocPath,
  gapAuditPath,
  taskPath
]) {
  assert.ok(exists(requiredPath), `F11 required file exists: ${requiredPath}`);
}

const uxSource = read(uxPath);
const sessionSource = read(sessionPath);
const targetLookupSource = read(targetLookupPath);
const pollingSource = read(pollingPath);
const pollingOutcomeProjectionSource = read(pollingOutcomeProjectionPath);
const actionsSource = read(actionsPath);
const sessionActionsSource = read(sessionActionsPath);
const sessionRouteSource = read(sessionRoutePath);
const sessionCommandExecutionSource = read(sessionCommandExecutionPath);
const abuseRateLimitSource = read(abuseRateLimitPath);
const privateLaunchSource = read(privateLaunchPath);
const dockSource = read(dockPath);
const copySource = [copyPath, ...copyDataPaths].map(read).join("\n");
const readinessDoc = read(readinessDocPath);
const gapAudit = read(gapAuditPath);
const taskSource = read(taskPath);

assert.match(uxSource, /commentTranslatorStartStopReasonUxContract/, "F11 exposes a focused UX reason contract");
assert.match(uxSource, /publicLaunchAllowed: false/, "F11 does not open the public launch gate");
assert.match(sessionSource, /reasonUx/, "session state carries sanitized reason UX metadata");
assert.match(targetLookupSource, /resolveCommentTranslatorLiveTargetLookupReasonUxCode/, "live target readiness keeps sanitized reason code");
assert.match(pollingOutcomeProjectionSource, /reasonUxCode/, "polling/provider signal keeps sanitized reason code");
assert.match(actionsSource, /getCommentTranslatorSessionStatusAction/, "server action facade retains the session action surface");
assert.match(sessionActionsSource, /executeCommentTranslatorSessionCommand/, "split server actions delegate to shared session command execution");
assert.match(sessionRouteSource, /executeCommentTranslatorSessionCommand/, "session route delegates to shared session command execution");
assert.match(sessionCommandExecutionSource, /providerSignalReasonUxCode/, "shared route/action execution forwards sanitized provider reason code");
assert.match(abuseRateLimitSource, /reasonUx/, "rate-limited stopped sessions include sanitized reason UX");
assert.match(privateLaunchSource, /reasonUx/, "private-launch stopped sessions include sanitized reason UX");
assert.match(dockSource, /sessionReasonUx/, "UI consumes deterministic reason UX metadata");
assert.match(copySource, /reasonGroups/, "localized copy includes reason groups");
assert.match(readinessDoc, /F11 Start\/Stop reason UX/i, "durable readiness doc records F11");
assert.match(gapAudit, /F11[\s\S]*Start\/Stop reason UX/i, "gap audit records F11");
assert.match(taskSource, /Per-minute auto-resume Task 6 regression status/i, "task.md records the current regression-contract slice");

const ux = loadTsModule(uxPath);
const session = loadTsModule(sessionPath);
const targetLookup = loadTsModule(targetLookupPath);
const polling = loadTsModule(pollingPath);

assert.equal(ux.commentTranslatorStartStopReasonUxContract.implementationStage, "free-public-beta-f11-start-stop-reason-ux");
assert.equal(ux.commentTranslatorStartStopReasonUxContract.outputBoundary, "sanitized-browser-safe-reason-metadata-only");
assert.equal(ux.commentTranslatorStartStopReasonUxContract.publicLaunchAllowed, false);

const requiredCodes = [
  "disconnected",
  "reconnect-required",
  "no-live-broadcast",
  "live-chat-disabled",
  "stream-ended",
  "live-chat-not-found",
  "quota-or-budget-stop",
  "heartbeat-or-browser-disconnect",
  "translation-provider-error",
  "translation-provider-unavailable",
  "auth-unavailable",
  "session-limit",
  "user-stop"
];
for (const code of requiredCodes) {
  assert.ok(ux.commentTranslatorStartStopReasonUxContract.reasonCodes.includes(code), `F11 contract covers ${code}`);
}

const baseUsage = {
  dailyUsedMs: 0,
  currentSessionElapsedMs: 0,
  translatedMessagesInCurrentMinute: 0,
  providerBudgetAvailable: true,
  globalBudgetAvailable: true,
  aiBudgetAvailable: true,
  translationProviderAvailable: true
};
const ownerUserIdKey = "owner" + "UserId";
const authorizedCaller = {
  status: "authorized",
  [ownerUserIdKey]: "f11-owner-reference-never-output"
};
const activeSession = {
  sessionReferenceId: "cts_f11_contract",
  startedAtMs: Date.parse("2026-06-16T01:00:00.000Z"),
  lastHeartbeatAtMs: Date.parse("2026-06-16T01:00:20.000Z"),
  credentialReferenceId: "f11-credential-reference"
};

const disconnectedStart = session.startCommentTranslatorSession({
  nowMs: Date.parse("2026-06-16T01:00:30.000Z"),
  plan: "free",
  callerAuthorization: authorizedCaller,
  credentialReadiness: {
    status: "blocked-reconnect-required",
    provider: "youtube",
    credentialReferenceId: "f11-credential-reference",
    reason: "credential-not-found",
    translatorStartAllowed: false,
    reconnectGuidance: "reconnect-youtube"
  },
  activeSession: null,
  usage: baseUsage,
  createSessionReferenceId: () => "cts_should_not_start"
});
assert.equal(disconnectedStart.status, "stopped");
assert.equal(disconnectedStart.stopReason, "reconnect-required");
assert.equal(disconnectedStart.reasonUx.code, "disconnected");
assert.equal(disconnectedStart.reasonUx.group, "connection");
assert.equal(disconnectedStart.reasonUx.clientReadableDetail, "sanitized-reason-only");

const reconnectStart = session.startCommentTranslatorSession({
  nowMs: Date.parse("2026-06-16T01:00:30.000Z"),
  plan: "free",
  callerAuthorization: authorizedCaller,
  credentialReadiness: {
    status: "blocked-reconnect-required",
    provider: "youtube",
    credentialReferenceId: "f11-credential-reference",
    reason: "expired",
    translatorStartAllowed: false,
    reconnectGuidance: "reconnect-youtube"
  },
  activeSession: null,
  usage: baseUsage,
  createSessionReferenceId: () => "cts_should_not_start"
});
assert.equal(reconnectStart.reasonUx.code, "reconnect-required");

const noBroadcastLookup = await targetLookup.resolveCommentTranslatorServerOnlyLiveChatTargetLookupForStart({
  intent: "start",
  credentialReadiness: {
    status: "ready",
    provider: "youtube",
    credentialReferenceId: "f11-credential-reference",
    translatorStartAllowed: true,
    reconnectGuidance: "none"
  },
  adapter: targetLookup.createDeterministicCommentTranslatorLiveChatTargetLookupAdapter({
    ownerVerification: {
      status: "owner-verified",
      ownerChannelReference: "f11-server-only-owner-reference",
      checkedBy: "server-runtime-adapter",
      evidence: {
        ownedBroadcastLookup: "liveBroadcasts.list-mine-true",
        liveChatIdSource: "owned-broadcast-snippet-liveChatId"
      }
    },
    broadcasts: []
  })
});
assert.equal(noBroadcastLookup.status, "unavailable");
assert.equal(noBroadcastLookup.reasonUxCode, "no-live-broadcast");

const missingChatLookup = await targetLookup.resolveCommentTranslatorServerOnlyLiveChatTargetLookupForStart({
  intent: "start",
  credentialReadiness: {
    status: "ready",
    provider: "youtube",
    credentialReferenceId: "f11-credential-reference",
    translatorStartAllowed: true,
    reconnectGuidance: "none"
  },
  adapter: targetLookup.createDeterministicCommentTranslatorLiveChatTargetLookupAdapter({
    ownerVerification: {
      status: "owner-verified",
      ownerChannelReference: "f11-server-only-owner-reference",
      checkedBy: "server-runtime-adapter",
      evidence: {
        ownedBroadcastLookup: "liveBroadcasts.list-mine-true",
        liveChatIdSource: "owned-broadcast-snippet-liveChatId"
      }
    },
    broadcasts: [
      {
        broadcastId: "f11-broadcast-reference",
        lifecycleStatus: "live",
        liveChatId: null
      }
    ]
  })
});
assert.equal(missingChatLookup.status, "unavailable");
assert.equal(missingChatLookup.reasonUxCode, "live-chat-disabled");

const liveUnavailableStart = session.startCommentTranslatorSession({
  nowMs: Date.parse("2026-06-16T01:00:30.000Z"),
  plan: "free",
  callerAuthorization: authorizedCaller,
  credentialReadiness: {
    status: "ready",
    provider: "youtube",
    credentialReferenceId: "f11-credential-reference",
    translatorStartAllowed: true,
    reconnectGuidance: "none"
  },
  activeSession: null,
  usage: baseUsage,
  liveChatTargetReadiness: noBroadcastLookup,
  createSessionReferenceId: () => "cts_should_not_start"
});
assert.equal(liveUnavailableStart.stopReason, "stream-unavailable");
assert.equal(liveUnavailableStart.reasonUx.code, "no-live-broadcast");
assert.equal(liveUnavailableStart.reasonUx.group, "live-target");

polling.resetCommentTranslatorBoundedLiveChatPollingStateForTests();
const targetReady = {
  status: "ready",
  provider: "youtube",
  serverOnlyTarget: {
    liveChatId: "f11-live-chat-id-never-output",
    broadcastId: "f11-broadcast-never-output",
    targetMetadata: "server-only-internal",
    clientReadable: "forbidden"
  },
  clientReadableTargetMetadata: "forbidden",
  providerAccess: "deterministic-local-adapter-only",
  providerTargetLookupExecution: "not-run-in-this-thread",
  liveChatIdLookupExecution: "not-run-in-this-thread",
  publicLaunchAllowed: false
};
polling.seedCommentTranslatorBoundedLiveChatPollingStateForActiveSession({
  state: {
    status: "active",
    provider: "youtube",
    plan: "free",
    sessionReferenceId: activeSession.sessionReferenceId,
    credentialReferenceId: activeSession.credentialReferenceId,
    startedAtIso: new Date(activeSession.startedAtMs).toISOString(),
    stoppedAtIso: null,
    elapsedSeconds: 20,
    remainingSessionSeconds: 1780,
    remainingDailySeconds: 1780,
    heartbeat: {
      required: true,
      timeoutSeconds: 45,
      lastHeartbeatAtIso: new Date(activeSession.lastHeartbeatAtMs).toISOString()
    },
    stopReason: null,
    reasonUx: null,
    nextAction: "send-heartbeat-or-stop",
    providerApiUsage: "allowed-after-explicit-start",
    aiTranslationUsage: "allowed-after-explicit-start",
    tokenValue: "never-returned-by-design",
    providerTargetMetadata: "forbidden"
  },
  liveChatTargetReadiness: targetReady,
  nowMs: Date.parse("2026-06-16T01:00:20.000Z")
});
const endedTick = await polling.readCommentTranslatorBoundedLiveChatPollingTick({
  intent: "status",
  activeSession,
  usage: baseUsage,
  adapter: polling.createDeterministicCommentTranslatorBoundedLiveChatPollingAdapter({
    pollSteps: [
      {
        type: "terminal",
        code: "liveChatEnded",
        nextPollAfterMs: Date.parse("2026-06-16T01:00:30.000Z")
      }
    ]
  }),
  nowMs: Date.parse("2026-06-16T01:00:30.000Z")
});
assert.equal(endedTick.providerSignal, "stream-ended");
assert.equal(endedTick.reasonUxCode, "stream-ended");

const endedStop = session.evaluateCommentTranslatorSessionStopCondition({
  activeSession,
  nowMs: Date.parse("2026-06-16T01:00:30.000Z"),
  plan: "free",
  browserConnected: true,
  callerAuthorization: authorizedCaller,
  credentialReadiness: {
    status: "ready",
    provider: "youtube",
    credentialReferenceId: "f11-credential-reference",
    translatorStartAllowed: true,
    reconnectGuidance: "none"
  },
  usage: baseUsage,
  providerSignal: endedTick.providerSignal,
  providerSignalReasonUxCode: endedTick.reasonUxCode
});
assert.equal(endedStop.reasonUx.code, "stream-ended");
assert.equal(endedStop.reasonUx.group, "live-target");

const quotaStop = session.evaluateCommentTranslatorSessionStopCondition({
  activeSession,
  nowMs: Date.parse("2026-06-16T01:00:30.000Z"),
  plan: "free",
  browserConnected: true,
  callerAuthorization: authorizedCaller,
  credentialReadiness: {
    status: "ready",
    provider: "youtube",
    credentialReferenceId: "f11-credential-reference",
    translatorStartAllowed: true,
    reconnectGuidance: "none"
  },
  usage: {
    ...baseUsage,
    providerBudgetAvailable: false
  }
});
assert.equal(quotaStop.stopReason, "provider-quota-stop");
assert.equal(quotaStop.reasonUx.code, "quota-or-budget-stop");

const activeTranslatedMessageCap = session.evaluateCommentTranslatorSessionStopCondition({
  activeSession,
  nowMs: Date.parse("2026-06-16T01:00:30.000Z"),
  plan: "free",
  browserConnected: true,
  callerAuthorization: authorizedCaller,
  credentialReadiness: {
    status: "ready",
    provider: "youtube",
    credentialReferenceId: "f11-credential-reference",
    translatorStartAllowed: true,
    reconnectGuidance: "none"
  },
  usage: {
    ...baseUsage,
    translatedMessagesInCurrentMinute: 30
  },
  ratePauseResolution: {
    status: "ready",
    projection: {
      activePhase: "rate-paused",
      ratePauseReason: "translated-message-cap",
      retryAfterSeconds: 10,
      automaticResumeExpected: true
    }
  }
});
assert.equal(activeTranslatedMessageCap.status, "active", "an active translated-message cap is a pause, not a terminal stop");
assert.equal(activeTranslatedMessageCap.stopReason, null);
assert.equal(activeTranslatedMessageCap.activePhase, "rate-paused");
assert.equal(activeTranslatedMessageCap.ratePauseReason, "translated-message-cap");
assert.equal(activeTranslatedMessageCap.nextAction, "send-heartbeat-or-stop");

const legacyTranslatedMessageCapStop = session.stopCommentTranslatorSession({
  activeSession,
  nowMs: Date.parse("2026-06-16T01:00:30.000Z"),
  plan: "free",
  usage: {
    ...baseUsage,
    translatedMessagesInCurrentMinute: 30
  },
  reason: "translated-message-cap"
});
assert.equal(legacyTranslatedMessageCapStop.status, "stopped", "legacy translated-message-cap stopped records remain renderable");
assert.equal(legacyTranslatedMessageCapStop.stopReason, "translated-message-cap");
assert.equal(legacyTranslatedMessageCapStop.reasonUx.code, "quota-or-budget-stop");
assert.equal(legacyTranslatedMessageCapStop.reasonUx.clientReadableDetail, "sanitized-reason-only");
assert.equal(legacyTranslatedMessageCapStop.providerApiUsage, "stopped");
assert.equal(legacyTranslatedMessageCapStop.aiTranslationUsage, "stopped");

const heartbeatStop = session.evaluateCommentTranslatorSessionStopCondition({
  activeSession,
  nowMs: Date.parse("2026-06-16T01:02:00.000Z"),
  plan: "free",
  browserConnected: true,
  callerAuthorization: authorizedCaller,
  credentialReadiness: {
    status: "ready",
    provider: "youtube",
    credentialReferenceId: "f11-credential-reference",
    translatorStartAllowed: true,
    reconnectGuidance: "none"
  },
  usage: baseUsage
});
assert.equal(heartbeatStop.stopReason, "missing-heartbeat");
assert.equal(heartbeatStop.reasonUx.code, "heartbeat-or-browser-disconnect");

const providerStop = session.evaluateCommentTranslatorSessionStopCondition({
  activeSession,
  nowMs: Date.parse("2026-06-16T01:00:30.000Z"),
  plan: "free",
  browserConnected: true,
  callerAuthorization: authorizedCaller,
  credentialReadiness: {
    status: "ready",
    provider: "youtube",
    credentialReferenceId: "f11-credential-reference",
    translatorStartAllowed: true,
    reconnectGuidance: "none"
  },
  usage: baseUsage,
  providerSignal: "terminal-provider-error",
  providerSignalReasonUxCode: "translation-provider-error"
});
assert.equal(providerStop.stopReason, "terminal-provider-error");
assert.equal(providerStop.reasonUx.code, "translation-provider-error");

for (const payload of [
  disconnectedStart,
  reconnectStart,
  noBroadcastLookup,
  missingChatLookup,
  liveUnavailableStart,
  endedTick,
  endedStop,
  quotaStop,
  activeTranslatedMessageCap,
  legacyTranslatedMessageCapStop,
  heartbeatStop,
  providerStop
]) {
  const serialized = JSON.stringify(payload);
  for (const forbiddenValue of [
    "f11-owner-reference-never-output",
    "f11-server-only-owner-reference",
    "f11-live-chat-id-never-output",
    "f11-broadcast-never-output",
    "access_token",
    "refresh_token",
    "authorization_code",
    "service_role",
    "Authorization",
    "providerChannelId"
  ]) {
    assert.doesNotMatch(serialized, new RegExp(forbiddenValue, "i"), `F11 sanitized output excludes ${forbiddenValue}`);
  }
}

const perMinuteAutoResumeTaskChangedFiles = new Set([
  "app/api/comment-translator/session/route-context.ts",
  "app/tools/comment-translator/account-actions.ts",
  "app/tools/comment-translator/action-context.ts",
  "app/tools/comment-translator/dev/per-minute-auto-resume/page.tsx",
  "app/tools/comment-translator/feed-actions.ts",
  "app/tools/comment-translator/retention-waitlist-actions.ts",
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
  "docs/active/COMMENT_TRANSLATOR_PER_MINUTE_AUTO_RESUME_DESIGN.md",
  "docs/active/COMMENT_TRANSLATOR_PER_MINUTE_AUTO_RESUME_IMPLEMENTATION_PLAN.md",
  "lib/comment-translator-fixture-comments.ts",
  "lib/comment-translator-live-provider-session-step-result.ts",
  "lib/comment-translator-live-provider-session-step.ts",
  "lib/comment-translator-per-minute-rate-pause.ts",
  "lib/comment-translator-runtime.ts",
  "lib/comment-translator-session-command.ts",
  "lib/comment-translator-session-memory-store.ts",
  "lib/comment-translator-session-policy.ts",
  "lib/comment-translator-session-start.ts",
  "lib/comment-translator-session-state.ts",
  "lib/comment-translator-session-types.ts",
  "lib/comment-translator-snapshot-data.ts",
  "lib/comment-translator-types.ts",
  "lib/comment-translator-usage-ledger-runtime.ts",
  "scripts/account-remote-display-settings-contract.mjs",
  "scripts/comment-translator-azure-normal-translation-execution-contract.mjs",
  "scripts/comment-translator-bounded-live-chat-polling-wiring-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-feed-bridge-session-persistence-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-live-message-normalization-contract.mjs",
  "scripts/comment-translator-per-minute-auto-resume-contract.mjs",
  "scripts/comment-translator-pl-g6d-preview-rate-limit-smoke-override-contract.mjs",
  "scripts/comment-translator-provider-execution-runtime-contract.mjs",
  "scripts/comment-translator-real-comments-ui-wiring-contract.mjs",
  "scripts/comment-translator-ui-live-provider-runtime-contract.mjs",
  "scripts/comment-translator-usage-quota-budget-ledger-contract.mjs"
]);

const allowedChangedFiles = new Set([
  "components/comment-translator/CommentTranslatorDock.tsx",
  uxPath,
  sessionPath,
  targetLookupPath,
  pollingPath,
  pollingOutcomeProjectionPath,
  "lib/comment-translator-bounded-live-chat-polling-outcome-projection.ts",
  "lib/comment-translator-bounded-live-chat-polling-types.ts",
  "lib/comment-translator-bounded-live-chat-polling-terminal-policy.ts",
  "lib/comment-translator-bounded-live-chat-polling-static-wiring.ts",
  "lib/comment-translator-bounded-live-chat-polling-registry.ts",
  "lib/comment-translator-bounded-live-chat-polling-transition.ts",
  actionsPath,
  sessionActionsPath,
  sessionRoutePath,
  sessionCommandExecutionPath,
  abuseRateLimitPath,
  privateLaunchPath,
  dockPath,
  copyPath,
  ...copyDataPaths,
  "lib/comment-translator-durable-usage-counter-store.ts",
  readinessDocPath,
  gapAuditPath,
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_COMPLETION_AFTER_PL_G2K.md",
  "scripts/comment-translator-durable-usage-counter-schema-adapter-contract.mjs",
  "scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-completion-after-pl-g2k-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-post-bridge-continuation-ready-preflight-contract.mjs",
  "scripts/comment-translator-free-beta-usage-display-contract.mjs",
  "scripts/comment-translator-public-operator-session-ui-contract.mjs",
  "scripts/comment-translator-session-start-stop-contract.mjs",
  "scripts/comment-translator-start-stop-reason-ux-contract.mjs",
  taskPath
]);
const activeSessionStartReadinessChangedFiles = new Set([
  "docs/active/COMMENT_TRANSLATOR_PER_MINUTE_AUTO_RESUME_DESIGN.md",
  "docs/active/COMMENT_TRANSLATOR_ACTIVE_SESSION_START_READINESS_VISIBILITY_IMPLEMENTATION_PLAN.md",
  "components/comment-translator/comment-translator-session-panel-visibility.ts",
  "components/comment-translator/CommentTranslatorSessionPanel.tsx",
  "scripts/comment-translator-public-operator-session-ui-contract.mjs",
  "scripts/comment-translator-free-beta-usage-display-contract.mjs",
  "scripts/comment-translator-start-stop-reason-ux-contract.mjs",
  "scripts/comment-translator-session-start-stop-contract.mjs"
]);
for (const file of changedFiles()) {
  assert.ok(
    allowedChangedFiles.has(file) || perMinuteAutoResumeTaskChangedFiles.has(file) || activeSessionStartReadinessChangedFiles.has(file),
    `F11 change stays in allowed files: ${file}`
  );

  if (file.endsWith(".mjs")) {
    continue;
  }

  const source = read(file);
  assert.doesNotMatch(
    source,
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+/i,
    `${file} does not contain secret values, token values, authorization values, or private provider identifiers`
  );
}

console.log("comment translator Start/Stop reason UX contract checks passed");
