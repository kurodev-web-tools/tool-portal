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
const requirementsSource = read(requirementsPath);

assert.match(sessionSource, /^import "server-only";/m, "session runtime is server-only");
assert.match(routeSource, /POST/, "session route exposes a POST handler for start stop heartbeat intents");
assert.match(routeSource, /readCommentTranslatorSessionCommand/, "route uses the sanitized session boundary");
assert.match(actionSource, /startCommentTranslatorSessionAction/, "server action exposes session start");
assert.match(actionSource, /stopCommentTranslatorSessionAction/, "server action exposes session stop");
assert.match(actionSource, /heartbeatCommentTranslatorSessionAction/, "server action exposes session heartbeat");
assert.match(requirementsSource, /30 min\/day\/user/, "canonical requirements retain free daily limit");
assert.match(requirementsSource, /30 min\/session/, "canonical requirements retain free per-session limit");
assert.match(requirementsSource, /1 active session\/user/, "canonical requirements retain one-active-session limit");

for (const source of [sessionSource, routeSource, actionSource]) {
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
    monthlyTranslatedCharacters: 20_000
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
      monthlyCharacterCap: {
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
  session.evaluateCommentTranslatorSessionStopCondition({
    activeSession: {
      sessionReferenceId: "cts_session_reference_001",
      startedAtMs: 1_000,
      lastHeartbeatAtMs: 46_000
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
  createSessionReferenceId: () => "cts_session_reference_002"
});

assert.equal(commandResult.status, "active", "heartbeat command keeps an active session alive");
assert.equal(commandResult.heartbeat.lastHeartbeatAtIso, "1970-01-01T00:00:02.000Z", "heartbeat timestamp is sanitized ISO metadata");

for (const file of changedFiles()) {
  const allowedChangedFiles = new Set([
    "lib/comment-translator-admin-operational-visibility.ts",
    "components/comment-translator/CommentTranslatorDock.tsx",
    sessionPath,
    ledgerPath,
    "lib/comment-translator.ts",
    "lib/comment-translator-durable-usage-counter-store.ts",
    "lib/comment-translator-provider-execution-runtime.ts",
    routePath,
    actionPath,
    "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_COMPLETION_AFTER_PL_G2K.md",
    "scripts/comment-translator-admin-operational-visibility-contract.mjs",
    "scripts/comment-translator-durable-usage-counter-schema-adapter-contract.mjs",
    "scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs",
    "scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-completion-after-pl-g2k-contract.mjs",
    "scripts/comment-translator-free-beta-pl-g3-post-bridge-continuation-ready-preflight-contract.mjs",
    "scripts/comment-translator-free-beta-usage-display-contract.mjs",
    "scripts/comment-translator-provider-execution-runtime-contract.mjs",
    "scripts/comment-translator-public-operator-session-ui-contract.mjs",
    "scripts/comment-translator-session-start-stop-contract.mjs",
    "scripts/comment-translator-start-stop-reason-ux-contract.mjs",
    "scripts/comment-translator-usage-quota-budget-ledger-contract.mjs",
    taskPath
  ]);
  assert.ok(allowedChangedFiles.has(file), `Task 7 change stays in allowed files: ${file}`);
  const source = read(file);
  assert.doesNotMatch(
    source,
    /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY/i,
    `${file} does not contain OAuth token values, authorization codes, authorization header values, private keys, or service role key values`
  );
}

console.log("comment translator session start/stop contract checks passed");
