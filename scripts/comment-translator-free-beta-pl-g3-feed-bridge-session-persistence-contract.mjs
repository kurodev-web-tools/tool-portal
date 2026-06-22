import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";

const root = process.cwd();
const bridgePath = "lib/comment-translator-real-comments-feed-session-bridge.ts";
const f10Path = "lib/comment-translator-azure-normal-translation-execution.ts";
const actionsPath = "app/tools/comment-translator/actions.ts";
const sharedPath = "lib/comment-translator-real-comments-feed-shared.ts";
const normalizationPath = "lib/comment-translator-live-message-normalization.ts";
const usageLedgerPath = "lib/comment-translator-usage-ledger-runtime.ts";
const completionDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_COMPLETION_AFTER_PL_G2K.md";
const taskPath = "task.md";
const moduleCache = new Map();
const require = createRequire(import.meta.url);

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

for (const requiredPath of [bridgePath, f10Path, actionsPath, sharedPath, normalizationPath, usageLedgerPath, completionDocPath, taskPath]) {
  assert.ok(exists(requiredPath), `PL-G3 feed bridge required file exists: ${requiredPath}`);
}

const bridgeSource = read(bridgePath);
const f10Source = read(f10Path);
const actionsSource = read(actionsPath);
const sharedSource = read(sharedPath);
const completionDoc = read(completionDocPath);
const taskSource = read(taskPath);

assert.match(bridgeSource, /^import "server-only";/m, "feed bridge is server-only");
assert.match(bridgeSource, /commentTranslatorRealCommentsFeedSessionBridgeContract/, "bridge exposes a focused contract");
assert.match(bridgeSource, /persistCommentTranslatorRealCommentsFeedForActiveSession/, "bridge can persist safe feed rows for an active session");
assert.match(bridgeSource, /readCommentTranslatorRealCommentsFeedForActiveSession/, "bridge can read safe feed rows for an active session");
assert.match(bridgeSource, /clearCommentTranslatorRealCommentsFeedForSession/, "bridge can clear rows when a session stops");
assert.doesNotMatch(bridgeSource, /localStorage|sessionStorage|indexedDB/i, "bridge does not add browser storage");
assert.doesNotMatch(bridgeSource, /liveChatId|nextPageToken|providerChannelId|ownerUserId\s*[:=]\s*["']/i, "bridge source does not hard-code private provider identifiers");

assert.match(f10Source, /persistCommentTranslatorRealCommentsFeedForActiveSession/, "F10 persists translated browser-safe feed rows through the bridge");
assert.match(actionsSource, /readCommentTranslatorRealCommentsFeedForActiveSession/, "feed server action reads the bridge instead of fixed unavailable");
assert.doesNotMatch(
  actionsSource,
  /getCommentTranslatorRealCommentsFeedAction\(\)[\s\S]{0,160}return createUnavailableCommentTranslatorRealCommentsFeedState\(\{\s*reason:\s*"live-provider-polling-not-approved"/,
  "feed action is no longer a fixed unavailable response"
);
assert.match(sharedSource, /translated-f10/, "shared feed rows still expose translated safe-row status only");
assert.match(completionDoc, /feed bridge\/session persistence boundary/i, "PL-G3 active doc records the local feed bridge boundary");
assert.match(taskSource, /PL-G3 feed bridge\/session persistence/i, "task.md records the PL-G3 feed bridge slice");

const bridge = loadTsModule(bridgePath);
const f10 = loadTsModule(f10Path);
const normalization = loadTsModule(normalizationPath);
const ledger = loadTsModule(usageLedgerPath);

assert.equal(bridge.commentTranslatorRealCommentsFeedSessionBridgeContract.runtime, "server-only");
assert.equal(bridge.commentTranslatorRealCommentsFeedSessionBridgeContract.feedAuthority, "server-owned-session-scoped-safe-feed");
assert.equal(bridge.commentTranslatorRealCommentsFeedSessionBridgeContract.rawProviderPayload, "not-returned-by-design");
assert.equal(bridge.commentTranslatorRealCommentsFeedSessionBridgeContract.providerTargetMetadata, "forbidden");
assert.equal(bridge.commentTranslatorRealCommentsFeedSessionBridgeContract.publicLaunchAllowed, false);

bridge.resetCommentTranslatorRealCommentsFeedSessionBridgeForTests();
ledger.resetInMemoryCommentTranslatorUsageLedgerForTests();

const ownerKey = "owner" + "UserId";
const callerAuthorization = {
  status: "authorized",
  [ownerKey]: "plg3-feed-bridge-owner-reference-never-output"
};
const activeSession = {
  sessionReferenceId: "cts_plg3_feed_bridge_001",
  startedAtMs: Date.parse("2026-06-22T01:00:00.000Z"),
  lastHeartbeatAtMs: Date.parse("2026-06-22T01:00:05.000Z"),
  credentialReferenceId: "credential-reference-never-output"
};
const usage = {
  dailyUsedMs: 0,
  currentSessionElapsedMs: 30_000,
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
    dailyLimitMs: 1_800_000,
    sessionLimitMs: 1_800_000,
    translatedMessagesPerMinute: 30,
    activeSessionsPerUser: 1,
    monthlyTranslatedCharacterLimit: 20_000,
    paidPrioritization: "not-implemented",
    providerUsageCharging: "not-implemented"
  }
};

const normalized = normalization.normalizeCommentTranslatorLiveMessages({
  providerPayloads: [
    {
      id: "yt-plg3-feed-1",
      snippet: {
        type: "textMessageEvent",
        publishedAt: "2026-06-22T01:00:07.000Z",
        textMessageDetails: { messageText: "safe bridge text" }
      },
      authorDetails: {
        channelId: "plg3-author-channel-never-output",
        channelUrl: "https://youtube.example/plg3-author-never-output",
        profileImageUrl: "https://images.example/plg3-profile-never-output.png"
      }
    }
  ]
});

const azure = {
  id: "azure-translator",
  name: "Azure Translator bridge contract double",
  runtimeScope: "server-runtime-only",
  secretBoundary: {
    runtime: "server-env-only",
    clientBundle: "forbidden",
    fixtures: "forbidden",
    docsAndTaskNotes: "no-secret-values"
  },
  async translate(request) {
    return {
      type: "translated",
      translatedText: `ja:${request.requestId.split(":").at(-1)}`,
      detectedSourceLanguage: null,
      confidence: 0.9,
      cacheOutcome: "miss",
      usageHandoff: {
        ...request.usageHandoff,
        providerId: "azure-translator",
        estimatedUnits: 1,
        estimatedCostMicros: 1,
        cacheOutcome: "miss"
      }
    };
  }
};

const result = await f10.executeCommentTranslatorAzureNormalTranslationForNormalizedMessages({
  messages: normalized.normalizedMessages,
  sessionStatus: "active",
  targetLanguage: "ja",
  sourceLanguages: ["EN"],
  callerAuthorization,
  sessionReferenceId: activeSession.sessionReferenceId,
  occurredAtMs: Date.parse("2026-06-22T01:00:08.000Z"),
  usage,
  providers: { azure },
  maxBatchSize: 2,
  maxProviderAttemptsPerComment: 1
});

assert.equal(result.status, "completed");
assert.equal(result.feed.status, "ready");
assert.equal(result.feed.rows.length, 1);
assert.equal(result.feed.rows[0].translationStatus, "translated-f10");

const bridgeRead = bridge.readCommentTranslatorRealCommentsFeedForActiveSession({
  callerAuthorization,
  activeSession
});

assert.equal(bridgeRead.status, "ready");
assert.equal(bridgeRead.rows.length, 1);
assert.equal(bridgeRead.rows[0].messageReferenceId, "yt-plg3-feed-1");
assert.equal(bridgeRead.rows[0].translatedText, "ja:yt-plg3-feed-1");
assert.equal(bridgeRead.rows[0].sourceAttributionLabel, "Source: YouTube Live Chat");
assert.equal(bridgeRead.rawProviderPayload, "not-returned-by-design");
assert.equal(bridgeRead.rawComments, "not-returned-by-design");
assert.equal(bridgeRead.providerTargetMetadata, "forbidden");
assert.equal(bridgeRead.serverOnlyCursor, "not-returned-by-design");
assert.equal(bridgeRead.browserStorage, "unchanged");
assert.equal(bridgeRead.handoffPayload, "unchanged");
assert.equal(bridgeRead.publicLaunchAllowed, false);

bridge.clearCommentTranslatorRealCommentsFeedForSession({
  callerAuthorization,
  sessionReferenceId: activeSession.sessionReferenceId
});
const clearedRead = bridge.readCommentTranslatorRealCommentsFeedForActiveSession({
  callerAuthorization,
  activeSession
});
assert.equal(clearedRead.status, "unavailable");
assert.equal(clearedRead.rows.length, 0);
assert.equal(clearedRead.unavailableReason, "live-provider-polling-not-approved");

for (const payload of [result, bridgeRead, clearedRead]) {
  const serialized = JSON.stringify(payload);
  for (const forbiddenValue of [
    "plg3-feed-bridge-owner-reference-never-output",
    "credential-reference-never-output",
    "plg3-author-channel-never-output",
    "youtube.example/plg3-author-never-output",
    "plg3-profile-never-output",
    "access_token",
    "refresh_token",
    "authorization_code",
    "Authorization",
    "service_role",
    "liveChatId",
    "providerChannelId",
    "nextPageToken"
  ]) {
    assert.doesNotMatch(serialized, new RegExp(forbiddenValue, "i"), `bridge output excludes ${forbiddenValue}`);
  }
}

const allowedChangedFiles = new Set([
  bridgePath,
  f10Path,
  actionsPath,
  completionDocPath,
  "scripts/comment-translator-free-beta-pl-g3-feed-bridge-session-persistence-contract.mjs",
  taskPath
]);
for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `PL-G3 feed bridge change stays in allowed files: ${file}`);
}

console.log("comment translator PL-G3 feed bridge/session persistence contract checks passed");
