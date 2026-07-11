import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const sessionPath = "lib/comment-translator-session-runtime.ts";
const ledgerPath = "lib/comment-translator-usage-ledger-runtime.ts";
const statusBoundaryPath = "lib/comment-translator-youtube-credential-status-boundary.ts";
const disconnectPath = "lib/comment-translator-youtube-disconnect-runtime.ts";
const routePath = "app/api/comment-translator/session/route.ts";
const actionPath = "app/tools/comment-translator/actions.ts";
const commandExecutionPath = "lib/comment-translator-session-command-execution.ts";
const sessionActionsPath = "app/tools/comment-translator/session-actions.ts";
const requirementsPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_RELEASE_REQUIREMENTS.md";
const taskPath = "task.md";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function changedFiles() {
  const committedDiff = execSync("git diff --name-only origin/codex/comment-translator-free-public-beta-integration...HEAD", {
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

assert.ok(exists(sessionPath), "server-only translation session runtime exists");
assert.ok(exists(statusBoundaryPath), "credential status boundary remains available");
assert.ok(exists(disconnectPath), "translator start readiness boundary remains available");
assert.ok(exists(routePath), "comment translator session route exists");
assert.ok(exists(actionPath), "comment translator server action surface remains available");
assert.ok(exists(requirementsPath), "canonical public release requirements remain available");

const sessionSource = read(sessionPath);
const routeSource = read(routePath);
const actionSource = read(actionPath);
const commandExecutionSource = read(commandExecutionPath);
const sessionActionsSource = read(sessionActionsPath);
const requirementsSource = read(requirementsPath);

assert.match(sessionSource, /^import "server-only";/m, "session runtime is server-only");
assert.match(routeSource, /POST/, "session route exposes a POST handler for start stop heartbeat intents");
assert.match(routeSource, /executeCommentTranslatorSessionCommand/, "route uses the sanitized session boundary");
assert.match(routeSource, /executeCommentTranslatorSessionCommand/, "route uses shared session command execution");
assert.match(actionSource, /startCommentTranslatorSessionAction/, "server action exposes session start");
assert.match(actionSource, /stopCommentTranslatorSessionAction/, "server action exposes session stop");
assert.match(actionSource, /heartbeatCommentTranslatorSessionAction/, "server action exposes session heartbeat");
assert.match(sessionActionsSource, /executeCommentTranslatorSessionCommand/, "server actions use shared session command execution");
assert.match(
  commandExecutionSource,
  /readCommentTranslatorBoundedLiveChatPollingPhaseResolution/,
  "shared route/action execution reads the polling-coordinator phase resolution"
);
assert.match(commandExecutionSource, /ratePauseResolution/, "shared route/action execution passes coordinator phase to session command");
assert.match(sessionSource, /activePhase/, "active session state exposes the sanitized coordinator phase");
assert.match(requirementsSource, /30 min\/day\/user/, "canonical requirements retain free daily limit");
assert.match(requirementsSource, /30 min\/session/, "canonical requirements retain free per-session limit");
assert.match(requirementsSource, /1 active session\/user/, "canonical requirements retain one-active-session limit");

for (const source of [sessionSource, routeSource, actionSource, sessionActionsSource, commandExecutionSource]) {
  assert.doesNotMatch(
    source,
    /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY|providerErrorBody:\s*error/i,
    "session boundary source does not contain token values, authorization header values, private keys, service role key values, or provider raw error bodies"
  );
  assert.doesNotMatch(
    source,
    /localStorage\.|indexedDB\.|sessionStorage\.|youtube\.googleapis|OAuth2Client|GoogleAuth|from\s+["']googleapis["']|require\(["']googleapis["']\)|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+|stripe|checkout|gtag|GA4/i,
    "Task 7 session boundary avoids browser storage, provider target exposure, live provider execution, quota writes, billing, and analytics changes"
  );
}

const session = loadTsModule(sessionPath);

assert.equal(
  session.commentTranslatorSessionRuntimeContract.implementationStage,
  "server-owned-session-start-stop-contract",
  "session runtime contract records Task 7 implementation stage"
);
assert.equal(session.commentTranslatorSessionRuntimeContract.runtime, "server-only");
assert.equal(
  session.commentTranslatorSessionRuntimeContract.providerApiUsageBeforeExplicitStart,
  "not-started-before-explicit-start",
  "provider API usage is blocked before explicit Start"
);
assert.equal(
  session.commentTranslatorSessionRuntimeContract.aiUsageBeforeExplicitStart,
  "not-started-before-explicit-start",
  "AI usage is blocked before explicit Start"
);
assert.deepEqual(
  session.commentTranslatorSessionRuntimeContract.freePlanLimits,
  {
    dailyMinutes: 30,
    sessionMinutes: 30,
    translatedMessagesPerMinute: 30,
    activeSessionsPerUser: 1,
    monthlyProviderInputCharacters: 20_000
  },
  "free plan public release limits are encoded"
);
assert.deepEqual(
  session.commentTranslatorSessionRuntimeContract.stopReasons,
  [
    "user-stop",
    "stream-ended",
    "stream-unavailable",
    "browser-disconnect",
    "missing-heartbeat",
    "auth-failed",
    "token-refresh-failed",
    "reconnect-required",
    "daily-time-limit",
    "session-time-limit",
    "translated-message-cap",
    "provider-quota-stop",
    "global-budget-stop",
    "ai-budget-stop",
    "translation-provider-limit",
    "session-limit",
    "terminal-provider-error"
  ],
  "all public release stop reasons are modeled as sanitized enum values"
);

const notStarted = session.createCommentTranslatorNotStartedSessionState({
  nowMs: 1_000,
  plan: "free"
});

assert.deepEqual(
  notStarted,
  {
    status: "not-started",
    provider: "youtube",
    plan: "free",
    startedAtIso: null,
    stoppedAtIso: null,
    elapsedSeconds: 0,
    remainingSessionSeconds: 1_800,
    remainingDailySeconds: 1_800,
    heartbeat: {
      required: true,
      timeoutSeconds: 45,
      lastHeartbeatAtIso: null
    },
    stopReason: null,
    reasonUx: null,
    usageDisplay: {
      status: "available",
      session: {
        usedSeconds: 0,
        limitSeconds: 1_800,
        remainingSeconds: 1_800
      },
      daily: {
        usedSeconds: 0,
        limitSeconds: 1_800,
        remainingSeconds: 1_800
      },
      perMinute: {
        used: 0,
        limit: 30,
        remaining: 30
      },
      monthlyInputCharacterCap: {
        used: 0,
        limit: 20_000,
        remaining: 20_000
      },
      unavailableReason: null,
      providerCallPolicy: {
        status: "allowed",
        stopReason: null,
        clientReadableDetail: "sanitized-usage-only"
      },
      noProviderCallWhenOverLimit: true,
      clientReadableDetail: "sanitized-usage-only",
      rawProviderPayload: "not-returned-by-design",
      rawComments: "not-returned-by-design",
      providerTargetMetadata: "forbidden",
      serverOnlyCursor: "not-returned-by-design",
      browserStorage: "unchanged",
      handoffPayload: "unchanged",
      publicLaunchAllowed: false
    },
    nextAction: "press-start",
    providerApiUsage: "not-started-before-explicit-start",
    aiTranslationUsage: "not-started-before-explicit-start",
    tokenValue: "never-returned-by-design",
    providerTargetMetadata: "forbidden"
  },
  "not-started state is sanitized and proves no provider or AI usage before Start"
);

const readyCredential = {
  status: "ready",
  provider: "youtube",
  credentialReferenceId: "ytcred_session_reference_001",
  translatorStartAllowed: true,
  reconnectGuidance: "none"
};

const active = session.startCommentTranslatorSession({
  nowMs: 1_000,
  plan: "free",
  callerAuthorization: {
    status: "authorized",
    ownerUserId: "server-only-owner-reference"
  },
  credentialReadiness: readyCredential,
  activeSession: null,
  usage: {
    dailyUsedMs: 0,
    translatedMessagesInCurrentMinute: 0,
    providerBudgetAvailable: true,
    globalBudgetAvailable: true,
    aiBudgetAvailable: true
  },
  createSessionReferenceId: () => "cts_session_reference_001"
});

assert.equal(active.status, "active", "explicit Start creates an active server-owned session");
assert.equal(active.sessionReferenceId, "cts_session_reference_001", "active session returns only an opaque session reference");
assert.equal(active.remainingSessionSeconds, 1_800, "active session starts with the free per-session cap");
assert.equal(active.remainingDailySeconds, 1_800, "active session starts with the free daily cap");
assert.equal(active.providerApiUsage, "allowed-after-explicit-start-not-run-in-task-7");
assert.equal(active.aiTranslationUsage, "allowed-after-explicit-start-not-run-in-task-7");
assert.doesNotMatch(
  JSON.stringify(active),
  /server-only-owner-reference|providerChannelId|liveChatId|access_token|refresh_token|authorization_code|Authorization|service_role|ciphertext|decrypt|provider target/i,
  "active browser state excludes owner ids, provider targets, credentials, and decrypt capability"
);

assert.equal(
  session.startCommentTranslatorSession({
    nowMs: 1_500,
    plan: "free",
    callerAuthorization: {
      status: "authorized",
      ownerUserId: "server-only-owner-reference"
    },
    credentialReadiness: readyCredential,
    activeSession: {
      sessionReferenceId: "cts_session_reference_001",
      startedAtMs: 1_000,
      lastHeartbeatAtMs: 1_000
    },
    usage: {
      dailyUsedMs: 0,
      translatedMessagesInCurrentMinute: 0,
      providerBudgetAvailable: true,
      globalBudgetAvailable: true,
      aiBudgetAvailable: true
    },
    createSessionReferenceId: () => "cts_session_reference_002"
  }).stopReason,
  "session-limit",
  "one active session per user is enforced before creating a second session"
);

assert.equal(
  session.startCommentTranslatorSession({
    nowMs: 2_000,
    plan: "free",
    callerAuthorization: {
      status: "authorized",
      ownerUserId: "server-only-owner-reference"
    },
    credentialReadiness: {
      status: "blocked-reconnect-required",
      provider: "youtube",
      credentialReferenceId: "ytcred_session_reference_001",
      reason: "revoked",
      translatorStartAllowed: false,
      reconnectGuidance: "reconnect-youtube"
    },
    activeSession: null,
    usage: {
      dailyUsedMs: 0,
      translatedMessagesInCurrentMinute: 0,
      providerBudgetAvailable: true,
      globalBudgetAvailable: true,
      aiBudgetAvailable: true
    },
    createSessionReferenceId: () => "cts_session_reference_002"
  }).stopReason,
  "reconnect-required",
  "auth/token/reconnect-required readiness blocks session start with a sanitized reason"
);

const missingHeartbeat = session.evaluateCommentTranslatorSessionStopCondition({
  activeSession: {
    sessionReferenceId: "cts_session_reference_001",
    startedAtMs: 1_000,
    lastHeartbeatAtMs: 1_000
  },
  nowMs: 47_000,
  plan: "free",
  browserConnected: true,
  callerAuthorization: {
    status: "authorized",
    ownerUserId: "server-only-owner-reference"
  },
  credentialReadiness: readyCredential,
  usage: {
    dailyUsedMs: 0,
    translatedMessagesInCurrentMinute: 0,
    providerBudgetAvailable: true,
    globalBudgetAvailable: true,
    aiBudgetAvailable: true
  }
});

assert.equal(missingHeartbeat.status, "stopped", "missing heartbeat stops active session");
assert.equal(missingHeartbeat.stopReason, "missing-heartbeat", "missing heartbeat has a sanitized stop reason");
assert.equal(
  missingHeartbeat.elapsedSeconds,
  45,
  "stale missing-heartbeat stops charge only through the heartbeat timeout window"
);

const staleLongRunningSession = session.evaluateCommentTranslatorSessionStopCondition({
  activeSession: {
    sessionReferenceId: "cts_session_reference_stale",
    startedAtMs: Date.parse("2026-06-15T23:55:00.000Z"),
    lastHeartbeatAtMs: Date.parse("2026-06-15T23:55:30.000Z")
  },
  nowMs: Date.parse("2026-06-16T12:00:00.000Z"),
  plan: "free",
  browserConnected: true,
  callerAuthorization: {
    status: "authorized",
    ownerUserId: "server-only-owner-reference"
  },
  credentialReadiness: readyCredential,
  usage: {
    dailyUsedMs: 0,
    translatedMessagesInCurrentMinute: 0,
    providerBudgetAvailable: true,
    globalBudgetAvailable: true,
    aiBudgetAvailable: true
  }
});

assert.equal(staleLongRunningSession.status, "stopped", "stale long-running session is stopped deterministically");
assert.equal(
  staleLongRunningSession.stopReason,
  "missing-heartbeat",
  "stale long-running session stops as missing heartbeat before quota exhaustion"
);
assert.equal(
  staleLongRunningSession.elapsedSeconds,
  75,
  "stale long-running session charge is bounded to startedAt through lastHeartbeat plus timeout"
);

const staleActiveSessionStartAttempt = session.startCommentTranslatorSession({
  activeSession: {
    sessionReferenceId: "cts_stale_start_reference",
    startedAtMs: Date.parse("2026-06-16T11:58:00.000Z"),
    lastHeartbeatAtMs: Date.parse("2026-06-16T11:58:30.000Z")
  },
  nowMs: Date.parse("2026-06-16T12:05:00.000Z"),
  plan: "free",
  callerAuthorization: {
    status: "authorized",
    ownerUserId: "server-only-owner-reference"
  },
  credentialReadiness: readyCredential,
  usage: {
    dailyUsedMs: 0,
    translatedMessagesInCurrentMinute: 0,
    providerBudgetAvailable: true,
    globalBudgetAvailable: true,
    aiBudgetAvailable: true
  },
  createSessionReferenceId: () => "cts_new_start_reference"
});

assert.equal(
  staleActiveSessionStartAttempt.stopReason,
  "missing-heartbeat",
  "Start against a stale durable active session stops the stale session before applying active-session limits"
);
assert.equal(
  staleActiveSessionStartAttempt.nextAction,
  "session-stopped",
  "stale active session cleanup stops the stale session instead of showing an over-limit state"
);

assert.equal(
  session.evaluateCommentTranslatorSessionStopCondition({
    activeSession: {
      sessionReferenceId: "cts_session_reference_001",
      startedAtMs: 1_000,
      lastHeartbeatAtMs: 1_801_000
    },
    nowMs: 1_801_000,
    plan: "free",
    browserConnected: true,
    callerAuthorization: {
      status: "authorized",
      ownerUserId: "server-only-owner-reference"
    },
    credentialReadiness: readyCredential,
    usage: {
      dailyUsedMs: 0,
      translatedMessagesInCurrentMinute: 0,
      providerBudgetAvailable: true,
      globalBudgetAvailable: true,
      aiBudgetAvailable: true
    }
  }).stopReason,
  "session-time-limit",
  "free per-session time cap stops the session"
);

assert.equal(
  session.evaluateCommentTranslatorSessionStopCondition({
    activeSession: {
      sessionReferenceId: "cts_session_reference_001",
      startedAtMs: 1_000,
      lastHeartbeatAtMs: 1_801_000
    },
    nowMs: 1_901_000,
    plan: "free",
    browserConnected: true,
    callerAuthorization: {
      status: "authorized",
      ownerUserId: "server-only-owner-reference"
    },
    credentialReadiness: readyCredential,
    usage: {
      dailyUsedMs: 0,
      translatedMessagesInCurrentMinute: 0,
      providerBudgetAvailable: true,
      globalBudgetAvailable: true,
      aiBudgetAvailable: true
    }
  }).elapsedSeconds,
  1800,
  "session-time-limit stop charge is capped at the Free session window"
);

assert.equal(
  session.evaluateCommentTranslatorSessionStopCondition({
    activeSession: {
      sessionReferenceId: "cts_session_reference_001",
      startedAtMs: 1_000,
      lastHeartbeatAtMs: 46_000
    },
    nowMs: 50_000,
    plan: "free",
    browserConnected: false,
    callerAuthorization: {
      status: "authorized",
      ownerUserId: "server-only-owner-reference"
    },
    credentialReadiness: readyCredential,
    usage: {
      dailyUsedMs: 0,
      translatedMessagesInCurrentMinute: 0,
      providerBudgetAvailable: true,
      globalBudgetAvailable: true,
      aiBudgetAvailable: true
    }
  }).stopReason,
  "browser-disconnect",
  "browser close or disconnect stops the session"
);

assert.equal(
  session.stopCommentTranslatorSession({
    activeSession: {
      sessionReferenceId: "cts_session_reference_001",
      startedAtMs: 1_000,
      lastHeartbeatAtMs: 46_000
    },
    nowMs: 50_000,
    plan: "free",
    reason: "user-stop"
  }).nextAction,
  "session-stopped",
  "explicit user stop returns a stopped browser-safe state"
);

const commandResult = await session.readCommentTranslatorSessionCommand({
  intent: "heartbeat",
  nowMs: 2_000,
  plan: "free",
  callerAuthorization: {
    status: "authorized",
    ownerUserId: "server-only-owner-reference"
  },
  credentialReadiness: readyCredential,
  activeSession: active,
  usage: {
    dailyUsedMs: 0,
    translatedMessagesInCurrentMinute: 0,
    providerBudgetAvailable: true,
    globalBudgetAvailable: true,
    aiBudgetAvailable: true
  },
  ratePauseResolution: {
    status: "ready",
    projection: {
      activePhase: "running",
      ratePauseReason: null,
      retryAfterSeconds: null,
      automaticResumeExpected: false
    }
  },
  createSessionReferenceId: () => "cts_session_reference_002"
});

assert.equal(commandResult.status, "active", "heartbeat command keeps an active session alive");
assert.equal(commandResult.heartbeat.lastHeartbeatAtIso, "1970-01-01T00:00:02.000Z", "heartbeat timestamp is sanitized ISO metadata");

const monthlyInputAccountingChangedFiles = new Set([
  "components/comment-translator/CommentTranslatorDock.tsx",
  "docs/active/COMMENT_TRANSLATOR_DURABLE_PERSISTENCE_SCHEMA_READINESS.md",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_ALLOWED_TESTER_ROUTE_API_SMOKE_EVIDENCE.md",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_EVIDENCE.md",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G1_REMOTE_DURABLE_ENFORCEMENT_EXECUTION_EVIDENCE.md",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_COMPLETION_AFTER_PL_G2K.md",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION.md",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PRODUCTION_CUSTOM_DEPLOYED_SMOKE_EVIDENCE.md",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PUBLIC_LAUNCH_GATE_DECISION_EVIDENCE.md",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PUBLIC_USABILITY_PREFLIGHT.md",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_REMOTE_DURABLE_ENFORCEMENT_EVIDENCE.md",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_REMOTE_DURABLE_ENFORCEMENT_READY_PREFLIGHT.md",
  "docs/active/COMMENT_TRANSLATOR_FREE_PUBLIC_BETA_FINAL_QA_READINESS.md",
  "docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md",
  "docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_REMAINING_TASK_BOARD.md",
  "lib/comment-translator.ts",
  "lib/comment-translator-admin-operational-visibility.ts",
  "lib/comment-translator-azure-normal-translation-execution.ts",
  "lib/comment-translator-durable-usage-counter-store.ts",
  "lib/comment-translator-free-beta-usage-display.ts",
  "lib/comment-translator-provider-execution-runtime.ts",
  "lib/comment-translator-public-entitlement-baseline.ts",
  "lib/comment-translator-session-runtime.ts",
  "lib/comment-translator-usage-ledger-runtime.ts",
  "scripts/comment-translator-abuse-rate-limit-hardening-contract.mjs",
  "scripts/comment-translator-admin-operational-visibility-contract.mjs",
  "scripts/comment-translator-azure-normal-translation-execution-contract.mjs",
  "scripts/comment-translator-durable-usage-counter-schema-adapter-contract.mjs",
  "scripts/comment-translator-free-beta-allowed-tester-route-api-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g1-remote-durable-enforcement-execution-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-feed-bridge-session-persistence-contract.mjs",
  "scripts/comment-translator-free-beta-production-custom-deployed-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-public-launch-gate-decision-contract.mjs",
  "scripts/comment-translator-free-beta-remote-durable-enforcement-evidence-contract.mjs",
  "scripts/comment-translator-free-beta-usage-display-contract.mjs",
  "scripts/comment-translator-monitoring-incident-readiness-contract.mjs",
  "scripts/comment-translator-monthly-input-character-accounting-contract.mjs",
  "scripts/comment-translator-private-gated-live-provider-smoke-execution-harness.mjs",
  "scripts/comment-translator-provider-execution-runtime-contract.mjs",
  "scripts/comment-translator-provider-implementation-alignment-contract.mjs",
  "scripts/comment-translator-public-entitlement-baseline-contract.mjs",
  "scripts/comment-translator-session-start-stop-contract.mjs",
  "scripts/comment-translator-ui-live-provider-runtime-contract.mjs",
  "scripts/comment-translator-usage-quota-budget-ledger-contract.mjs",
  "task.md"
]);
for (const file of changedFiles()) {
  const allowedChangedFiles = new Set([
    "docs/active/COMMENT_TRANSLATOR_PER_MINUTE_AUTO_RESUME_DESIGN.md",
    "docs/active/COMMENT_TRANSLATOR_PER_MINUTE_AUTO_RESUME_IMPLEMENTATION_PLAN.md",
    "app/api/comment-translator/session/route-context.ts",
    "app/tools/comment-translator/account-actions.ts",
    "app/tools/comment-translator/action-context.ts",
    "app/tools/comment-translator/dev/per-minute-auto-resume/page.tsx",
    "app/tools/comment-translator/feed-actions.ts",
    "app/tools/comment-translator/retention-waitlist-actions.ts",
    "app/tools/comment-translator/session-actions.ts",
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
    "lib/comment-translator-per-minute-rate-pause.ts",
    "lib/comment-translator-runtime.ts",
    "lib/comment-translator-session-command-execution.ts",
    "lib/comment-translator-session-command.ts",
    "lib/comment-translator-session-memory-store.ts",
    "lib/comment-translator-session-policy.ts",
    "lib/comment-translator-session-start.ts",
    "lib/comment-translator-session-state.ts",
    "lib/comment-translator-session-types.ts",
    "lib/comment-translator-snapshot-data.ts",
    "lib/comment-translator-types.ts",
    "scripts/account-remote-display-settings-contract.mjs",
    "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-contract.mjs",
    "scripts/comment-translator-live-message-normalization-contract.mjs",
    "scripts/comment-translator-per-minute-auto-resume-contract.mjs",
    "lib/comment-translator-admin-operational-visibility.ts",
  "lib/comment-translator-durable-usage-counter-store.ts",
    "components/comment-translator/CommentTranslatorDock.tsx",
    sessionPath,
    ledgerPath,
    "lib/comment-translator.ts",
    "lib/comment-translator-bounded-live-chat-polling-wiring.ts",
    "lib/comment-translator-bounded-live-chat-polling-outcome-projection.ts",
    "lib/comment-translator-bounded-live-chat-polling-types.ts",
    "lib/comment-translator-bounded-live-chat-polling-result-projection.ts",
    "lib/comment-translator-bounded-live-chat-polling-terminal-policy.ts",
    "lib/comment-translator-bounded-live-chat-polling-static-wiring.ts",
    "lib/comment-translator-bounded-live-chat-polling-registry.ts",
    "lib/comment-translator-bounded-live-chat-polling-transition.ts",
    "lib/comment-translator-durable-usage-counter-store.ts",
    "lib/comment-translator-azure-normal-translation-execution.ts",
    "lib/comment-translator-private-gated-live-provider-smoke-execution-harness.ts",
    "lib/comment-translator-real-comments-feed-durable-store.ts",
    "lib/comment-translator-real-comments-feed-session-bridge.ts",
    "lib/comment-translator-provider-execution-runtime.ts",
    routePath,
    actionPath,
    "supabase/migrations/20260623000000_comment_translator_real_comments_feed_snapshots.sql",
    "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_COMPLETION_AFTER_PL_G2K.md",
    "docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_READY_PREFLIGHT.md",
    "lib/comment-translator-youtube-live-provider-runtime-adapter.ts",
    "lib/comment-translator-real-comments-feed-shared.ts",
    "lib/comment-translator-live-provider-session-step.ts",
    "lib/comment-translator-live-provider-session-step-result.ts",
    "scripts/comment-translator-admin-operational-visibility-contract.mjs",
    "scripts/comment-translator-azure-normal-translation-execution-contract.mjs",
    "scripts/comment-translator-bounded-live-chat-polling-wiring-contract.mjs",
    "scripts/comment-translator-durable-session-schema-adapter-contract.mjs",
    "scripts/comment-translator-durable-usage-counter-schema-adapter-contract.mjs",
    "scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs",
    "scripts/comment-translator-free-beta-pl-g2k-approved-route-api-harness-smoke-execution-after-pl-g2j-contract.mjs",
    "scripts/comment-translator-free-beta-pl-g3-feed-bridge-session-persistence-contract.mjs",
    "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-completion-after-pl-g2k-contract.mjs",
    "scripts/comment-translator-free-beta-pl-g3-post-bridge-continuation-ready-preflight-contract.mjs",
    "scripts/comment-translator-free-beta-pl-g3-sanitized-wrapper-after-pr533.mjs",
    "scripts/comment-translator-free-beta-pl-g3-sanitized-wrapper-after-pr533-contract.mjs",
    "scripts/comment-translator-free-beta-usage-display-contract.mjs",
    "scripts/comment-translator-private-gated-live-provider-smoke-execution-harness.mjs",
    "scripts/comment-translator-private-gated-live-provider-smoke-execution-harness-contract.mjs",
    "scripts/comment-translator-provider-execution-runtime-contract.mjs",
    "scripts/comment-translator-public-operator-session-ui-contract.mjs",
    "scripts/comment-translator-real-comments-ui-wiring-contract.mjs",
    "scripts/comment-translator-session-start-stop-contract.mjs",
    "scripts/comment-translator-stop-preview-retention-contract.mjs",
    "scripts/comment-translator-start-stop-reason-ux-contract.mjs",
    "scripts/comment-translator-ui-live-provider-runtime-contract.mjs",
    "scripts/comment-translator-usage-quota-budget-ledger-contract.mjs",
    "scripts/comment-translator-youtube-live-chat-polling-smoke-command-contract.mjs",
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
  const plG6dChangedFiles = new Set([
    "app/api/comment-translator/session/route.ts",
    "app/tools/comment-translator/actions.ts",
    "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G6D_PREVIEW_RATE_LIMIT_SMOKE_OVERRIDE.md",
    "lib/comment-translator-free-beta-preview-rate-limit-smoke-override.ts",
    "lib/comment-translator-public-entitlement-baseline.ts",
    "scripts/comment-translator-pl-g6d-preview-rate-limit-smoke-override-contract.mjs"
  ]);
  assert.ok(
    allowedChangedFiles.has(file) || monthlyInputAccountingChangedFiles.has(file) || plG6dChangedFiles.has(file) || activeSessionStartReadinessChangedFiles.has(file),
    `Task 7 change stays in allowed files: ${file}`
  );
  if (file === "scripts/comment-translator-youtube-live-chat-polling-smoke-command-contract.mjs") {
    continue;
  }
  const source = read(file);
  assert.doesNotMatch(
    source,
    /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY/i,
    `${file} does not contain OAuth token values, authorization codes, authorization header values, private keys, or service role key values`
  );
}

console.log("comment translator session start/stop contract checks passed");
