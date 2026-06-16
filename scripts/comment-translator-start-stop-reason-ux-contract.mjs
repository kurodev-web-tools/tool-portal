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
const actionsPath = "app/tools/comment-translator/actions.ts";
const sessionRoutePath = "app/api/comment-translator/session/route.ts";
const abuseRateLimitPath = "lib/comment-translator-abuse-rate-limit-runtime.ts";
const privateLaunchPath = "lib/comment-translator-private-launch-access-gate.ts";
const dockPath = "components/comment-translator/CommentTranslatorDock.tsx";
const copyPath = "lib/comment-translator.ts";
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
  actionsPath,
  sessionRoutePath,
  abuseRateLimitPath,
  privateLaunchPath,
  dockPath,
  copyPath,
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
const actionsSource = read(actionsPath);
const sessionRouteSource = read(sessionRoutePath);
const abuseRateLimitSource = read(abuseRateLimitPath);
const privateLaunchSource = read(privateLaunchPath);
const dockSource = read(dockPath);
const copySource = read(copyPath);
const readinessDoc = read(readinessDocPath);
const gapAudit = read(gapAuditPath);
const taskSource = read(taskPath);

assert.match(uxSource, /commentTranslatorStartStopReasonUxContract/, "F11 exposes a focused UX reason contract");
assert.match(uxSource, /publicLaunchAllowed: false/, "F11 does not open the public launch gate");
assert.match(sessionSource, /reasonUx/, "session state carries sanitized reason UX metadata");
assert.match(targetLookupSource, /resolveCommentTranslatorLiveTargetLookupReasonUxCode/, "live target readiness keeps sanitized reason code");
assert.match(pollingSource, /reasonUxCode/, "polling/provider signal keeps sanitized reason code");
assert.match(actionsSource, /providerSignalReasonUxCode/, "server action forwards sanitized provider reason code");
assert.match(sessionRouteSource, /providerSignalReasonUxCode/, "session route forwards sanitized provider reason code");
assert.match(abuseRateLimitSource, /reasonUx/, "rate-limited stopped sessions include sanitized reason UX");
assert.match(privateLaunchSource, /reasonUx/, "private-launch stopped sessions include sanitized reason UX");
assert.match(dockSource, /sessionReasonUx/, "UI consumes deterministic reason UX metadata");
assert.match(copySource, /reasonGroups/, "localized copy includes reason groups");
assert.match(readinessDoc, /F11 Start\/Stop reason UX/i, "durable readiness doc records F11");
assert.match(gapAudit, /F11[\s\S]*Start\/Stop reason UX/i, "gap audit records F11");
assert.match(taskSource, /F11 Start\/Stop reason UX/i, "task.md records F11 status");

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
    providerApiUsage: "allowed-after-explicit-start-not-run-in-task-7",
    aiTranslationUsage: "allowed-after-explicit-start-not-run-in-task-7",
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

const allowedChangedFiles = new Set([
  uxPath,
  sessionPath,
  targetLookupPath,
  pollingPath,
  actionsPath,
  sessionRoutePath,
  abuseRateLimitPath,
  privateLaunchPath,
  dockPath,
  copyPath,
  readinessDocPath,
  gapAuditPath,
  "scripts/comment-translator-start-stop-reason-ux-contract.mjs",
  taskPath
]);
for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `F11 change stays in allowed files: ${file}`);

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
