import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const boundedRuntimePath = "lib/comment-translator-youtube-bounded-polling-session-runtime.ts";
const runtimeFoundationPath = "lib/comment-translator-youtube-runtime-foundation.ts";
const apiAdapterPath = "lib/comment-translator-youtube-api-adapter.ts";
const sessionPath = "lib/comment-translator-session-runtime.ts";
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
  const committedDiff = execSync("git diff --name-only origin/codex/comment-translator-preview...HEAD", {
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

assert.ok(exists(boundedRuntimePath), "server-only bounded polling session runtime exists");
assert.ok(exists(runtimeFoundationPath), "YouTube runtime foundation remains available");
assert.ok(exists(apiAdapterPath), "YouTube deterministic API adapter remains available");
assert.ok(exists(sessionPath), "translation session runtime remains available");
assert.ok(exists(requirementsPath), "canonical public requirements remain available");

const boundedSource = read(boundedRuntimePath);
const runtimeSource = read(runtimeFoundationPath);
const routeSource = read(routePath);
const actionSource = read(actionPath);
const requirementsSource = read(requirementsPath);

assert.match(boundedSource, /^import "server-only";/m, "bounded polling runtime is server-only");
assert.match(runtimeSource, /pollLiveChatOnce/, "runtime foundation still models a single bounded Live Chat polling step");
assert.match(runtimeSource, /pollingIntervalMillis/, "runtime foundation still models provider polling interval material");
assert.match(requirementsSource, /respect the returned `pollingIntervalMillis`/i, "requirements retain polling interval compliance");
assert.match(requirementsSource, /keep polling cursor and `liveChatId` server-session-only/i, "requirements retain live chat id server-only boundary");

for (const exportedType of [
  "YouTubeBoundedPollingSessionRuntimeContract",
  "YouTubeBoundedPollingSessionServerState",
  "YouTubeBoundedPollingSessionBrowserSafeState",
  "StartYouTubeBoundedPollingSessionRequest",
  "RunYouTubeBoundedPollingSessionTickRequest",
  "YouTubeBoundedPollingSessionStartResult",
  "YouTubeBoundedPollingSessionTickResult"
]) {
  assert.match(boundedSource, new RegExp(`export type ${exportedType}\\b`), `exports ${exportedType}`);
}

for (const exportedConstOrFunction of [
  "youtubeBoundedPollingSessionRuntimeContract",
  "startYouTubeBoundedPollingSession",
  "runYouTubeBoundedPollingSessionTick"
]) {
  assert.match(
    boundedSource,
    new RegExp(`export (?:const|async function|function) ${exportedConstOrFunction}\\b`),
    `exports ${exportedConstOrFunction}`
  );
}

assert.doesNotMatch(
  `${routeSource}\n${actionSource}`,
  /comment-translator-youtube-bounded-polling-session-runtime|liveChatMessages\.list|pollingIntervalMillis/,
  "route and server actions do not expose the bounded polling runtime in client-readable payloads in this task"
);
assert.doesNotMatch(
  boundedSource,
  /localStorage\.|indexedDB\.|sessionStorage\.|youtube\.googleapis|OAuth2Client|GoogleAuth|from\s+["']googleapis["']|require\(["']googleapis["']\)|setInterval|setTimeout|while\s*\(|for\s*\(\s*;;|stripe|checkout|billingPortal|priceId/i,
  "bounded polling runtime avoids browser storage, live provider SDKs, uncontrolled loops, and billing changes"
);
assert.doesNotMatch(
  boundedSource,
  /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY|ownerUserIdValue\s*[:=]\s*["'][^"']+|providerChannelIdValue\s*[:=]\s*["'][^"']+/i,
  "bounded polling runtime source does not contain token, authorization, service-role, owner, or provider channel values"
);

const bounded = loadTsModule(boundedRuntimePath);

assert.equal(
  bounded.youtubeBoundedPollingSessionRuntimeContract.implementationStage,
  "server-owned-bounded-polling-session-runtime",
  "bounded runtime contract records Task 10 stage"
);
assert.equal(bounded.youtubeBoundedPollingSessionRuntimeContract.runtime, "server-only");
assert.equal(
  bounded.youtubeBoundedPollingSessionRuntimeContract.targetLookup,
  "once-at-session-start",
  "target lookup is modeled once at session start"
);
assert.equal(
  bounded.youtubeBoundedPollingSessionRuntimeContract.pollingEndpoint,
  "liveChatMessages.list-deterministic-adapter",
  "bounded runtime models liveChatMessages.list through deterministic adapter boundary"
);
assert.equal(
  bounded.youtubeBoundedPollingSessionRuntimeContract.liveProviderExecution,
  "not-run-without-same-thread-preflight-sanitized-output-and-explicit-approval",
  "bounded runtime keeps live provider execution approval-gated"
);
assert.equal(bounded.youtubeBoundedPollingSessionRuntimeContract.minPollingIntervalMs, 1_000);
assert.equal(bounded.youtubeBoundedPollingSessionRuntimeContract.maxRecoverableErrors, 3);
assert.equal(
  bounded.youtubeBoundedPollingSessionRuntimeContract.browserStorage,
  "forbidden",
  "bounded runtime does not add browser storage"
);
assert.equal(
  bounded.youtubeBoundedPollingSessionRuntimeContract.handoffPayload,
  "unchanged",
  "bounded runtime does not expand handoff payloads"
);

const activeBroadcast = {
  broadcastId: "broadcast-contract-1",
  liveChatId: "server-only-live-chat-reference",
  title: "Contract stream",
  lifecycleStatus: "live",
  privacyStatus: "public"
};
let verifyOwnerCount = 0;
let lookupCount = 0;
let pollCount = 0;
const adapter = {
  async verifyOwner() {
    verifyOwnerCount += 1;
    return {
      status: "owner-verified",
      ownerChannelReference: "server-only-owner-channel-reference",
      checkedBy: "server-runtime-adapter",
      evidence: {
        ownedBroadcastLookup: "liveBroadcasts.list-mine-true",
        liveChatIdSource: "owned-broadcast-snippet-liveChatId"
      }
    };
  },
  async lookupOwnedBroadcasts() {
    lookupCount += 1;
    return {
      lookup: "liveBroadcasts.list-mine-true",
      broadcasts: [activeBroadcast],
      providerRequest: "forbidden"
    };
  },
  async pollLiveChatOnce(state) {
    pollCount += 1;
    if (pollCount === 1) {
      return {
        state: {
          ...state,
          nextPageToken: "server-only-next-page-token",
          retryCount: 0,
          nextPollAfterMs: 6_000
        },
        comments: []
      };
    }

    return {
      state: {
        ...state,
        retryCount: 0,
        nextPollAfterMs: 11_000
      },
      comments: [
        {
          commentId: "comment-contract-1",
          publishedAt: "2026-06-11T04:00:00.000Z",
          text: "Hello bounded runtime",
          platformLanguageHint: "en"
        }
      ]
    };
  }
};

const started = await bounded.startYouTubeBoundedPollingSession({
  adapter,
  credentialReferenceId: "credential-contract-1",
  sessionReferenceId: "cts_bounded_contract_001",
  nowMs: 1_000
});

assert.equal(started.status, "active", "start creates an active bounded polling session");
assert.equal(verifyOwnerCount, 1, "owner verification runs once during session start");
assert.equal(lookupCount, 1, "target lookup runs once during session start");
assert.equal(started.serverState.pollAttemptCount, 0, "start does not poll before an explicit tick");
assert.equal(started.serverState.nextPollAfterMs, 1_000, "first tick is due at session start after lookup");
assert.equal(started.browserSafeState.status, "polling-active", "browser-safe state is sanitized active metadata");
assert.equal(started.browserSafeState.targetLookup, "completed-server-only", "browser-safe state reports target lookup without target metadata");
assert.equal(started.browserSafeState.liveChatId, "never-returned-by-design", "browser-safe state never returns live chat id");
assert.equal(started.browserSafeState.providerTargetMetadata, "forbidden", "browser-safe state forbids provider target metadata");
assert.equal(started.browserSafeState.browserStorage, "unchanged", "browser-safe state does not add browser storage");
assert.equal(started.browserSafeState.handoffPayload, "unchanged", "browser-safe state does not expand handoff payload");
assert.doesNotMatch(
  JSON.stringify(started.browserSafeState),
  /server-only-live-chat-reference|server-only-owner-channel-reference|server-only-next-page-token|broadcast-contract-1|access_token|refresh_token|service_role/i,
  "browser-safe start output excludes live chat id, provider target metadata, cursors, tokens, and authorization data"
);

const earlyTick = await bounded.runYouTubeBoundedPollingSessionTick({
  adapter,
  serverState: started.serverState,
  nowMs: 999
});
assert.equal(earlyTick.status, "waiting", "tick before nextPollAfterMs does not poll");
assert.equal(pollCount, 0, "early tick performs no liveChatMessages.list call");

const emptyTick = await bounded.runYouTubeBoundedPollingSessionTick({
  adapter,
  serverState: started.serverState,
  nowMs: 1_000
});
assert.equal(emptyTick.status, "active", "empty chat tick remains active");
assert.equal(pollCount, 1, "due tick polls exactly once");
assert.equal(emptyTick.serverState.pollAttemptCount, 1, "poll attempt count increments after one poll");
assert.equal(emptyTick.serverState.emptyPollCount, 1, "empty chat increments bounded empty backoff count");
assert.ok(emptyTick.serverState.nextPollAfterMs >= 6_000, "empty chat does not poll faster than provider interval");
assert.ok(emptyTick.serverState.nextPollAfterMs >= 7_000, "empty chat applies project backoff above the minimum interval");
assert.equal(emptyTick.browserSafeState.pollingCursor, "server-session-only", "cursor remains server-session-only in browser-safe state");
assert.doesNotMatch(
  JSON.stringify(emptyTick.browserSafeState),
  /server-only-live-chat-reference|server-only-next-page-token|Hello bounded runtime/i,
  "browser-safe empty tick excludes live chat id, cursor, and raw comments"
);

const waitingAfterEmpty = await bounded.runYouTubeBoundedPollingSessionTick({
  adapter,
  serverState: emptyTick.serverState,
  nowMs: emptyTick.serverState.nextPollAfterMs - 1
});
assert.equal(waitingAfterEmpty.status, "waiting", "runtime refuses to poll faster than the scheduled provider/backoff time");
assert.equal(pollCount, 1, "waiting after empty chat does not poll again");

const messageTick = await bounded.runYouTubeBoundedPollingSessionTick({
  adapter,
  serverState: emptyTick.serverState,
  nowMs: emptyTick.serverState.nextPollAfterMs
});
assert.equal(messageTick.status, "active", "message tick remains active");
assert.equal(pollCount, 2, "message tick performs one more bounded poll");
assert.equal(messageTick.serverState.emptyPollCount, 0, "message tick resets empty chat backoff");
assert.equal(messageTick.comments.length, 1, "server tick returns sanitized provider-safe comments to the next server pipeline");
assert.doesNotMatch(
  JSON.stringify(messageTick.browserSafeState),
  /Hello bounded runtime|server-only-live-chat-reference|server-only-next-page-token/i,
  "browser-safe message tick excludes raw comments, live chat id, and cursor"
);

const terminalAdapter = {
  async verifyOwner() {
    return adapter.verifyOwner();
  },
  async lookupOwnedBroadcasts() {
    return adapter.lookupOwnedBroadcasts();
  },
  async pollLiveChatOnce(state) {
    return {
      state: {
        ...state,
        terminal: {
          code: "liveChatEnded",
          stoppedAtMs: 2_000
        }
      },
      comments: []
    };
  }
};
const terminalTick = await bounded.runYouTubeBoundedPollingSessionTick({
  adapter: terminalAdapter,
  serverState: started.serverState,
  nowMs: 1_000
});
assert.equal(terminalTick.status, "stopped", "terminal provider state stops the bounded session");
assert.equal(terminalTick.browserSafeState.stopReason, "stream-ended", "live chat ended maps to sanitized stream-ended stop reason");

const retryAdapter = {
  async verifyOwner() {
    return adapter.verifyOwner();
  },
  async lookupOwnedBroadcasts() {
    return adapter.lookupOwnedBroadcasts();
  },
  async pollLiveChatOnce(state) {
    return {
      state: {
        ...state,
        retryCount: state.retryCount + 1,
        nextPollAfterMs: 3_000
      },
      comments: []
    };
  }
};
const retryStarted = await bounded.startYouTubeBoundedPollingSession({
  adapter: retryAdapter,
  credentialReferenceId: "credential-contract-1",
  sessionReferenceId: "cts_bounded_contract_retry",
  nowMs: 1_000
});
let retryState = retryStarted.serverState;
for (let index = 0; index < 3; index += 1) {
  const result = await bounded.runYouTubeBoundedPollingSessionTick({
    adapter: retryAdapter,
    serverState: retryState,
    nowMs: retryState.nextPollAfterMs
  });
  retryState = result.serverState;
}
const retryCap = await bounded.runYouTubeBoundedPollingSessionTick({
  adapter: retryAdapter,
  serverState: retryState,
  nowMs: retryState.nextPollAfterMs
});
assert.equal(retryCap.status, "stopped", "recoverable error cap stops the bounded session");
assert.equal(retryCap.browserSafeState.stopReason, "terminal-provider-error", "retry cap maps to sanitized terminal provider error");
assert.equal(retryCap.browserSafeState.providerErrorBody, "never-returned-by-design", "retry cap never returns raw provider error body");

const blockedStart = await bounded.startYouTubeBoundedPollingSession({
  adapter: {
    ...adapter,
    async verifyOwner() {
      return {
        status: "not-owner",
        checkedBy: "server-runtime-adapter",
        reason: "owner verification failed",
        evidence: null
      };
    }
  },
  credentialReferenceId: "credential-contract-1",
  sessionReferenceId: "cts_bounded_contract_blocked",
  nowMs: 1_000
});
assert.equal(blockedStart.status, "stopped", "owner verification failure stops before polling");
assert.equal(blockedStart.browserSafeState.stopReason, "auth-failed", "owner verification failure returns sanitized auth stop reason");

assert.match(read(taskPath), /Task 10, Bounded polling session runtime/i, "task.md records Task 10 completion status");
assert.match(read(taskPath), /No route-level polling endpoint was added/i, "task.md records why route-level polling was not wired");

for (const file of changedFiles()) {
  const allowedChangedFiles = new Set([
    boundedRuntimePath,
    "scripts/comment-translator-youtube-bounded-polling-session-runtime-contract.mjs",
    taskPath
  ]);
  assert.ok(allowedChangedFiles.has(file), `Task 10 change stays in allowed files: ${file}`);

  if (file.endsWith("comment-translator-youtube-bounded-polling-session-runtime-contract.mjs")) {
    continue;
  }

  const source = read(file);
  assert.doesNotMatch(
    source,
    /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY/i,
    `${file} does not contain OAuth token values, authorization codes, authorization header values, private keys, or service role key values`
  );
}

console.log("comment translator YouTube bounded polling session runtime contract checks passed");
