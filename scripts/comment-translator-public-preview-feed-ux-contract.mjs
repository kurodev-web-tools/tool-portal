import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const sharedPath = "lib/comment-translator-real-comments-feed-shared.ts";
const dockPath = "components/comment-translator/CommentTranslatorDock.tsx";
const localPreferencesPath = "lib/local-preferences.ts";
const taskPath = "task.md";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
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

for (const requiredPath of [sharedPath, dockPath, localPreferencesPath, taskPath]) {
  assert.ok(fs.existsSync(path.join(root, requiredPath)), `required file exists: ${requiredPath}`);
}

const sharedSource = read(sharedPath);
const dockSource = read(dockPath);
const localPreferencesSource = read(localPreferencesPath);
const taskSource = read(taskPath);

assert.match(dockSource, /commentTranslatorPreviewFeedAutoRefreshIntervalMs\s*=\s*15000/, "PPF-1 uses a safe 15s preview feed cadence");
assert.match(dockSource, /data-comment-translator-preview-feed-auto-refresh="active-session-safe-periodic"/, "PPF-1 marks the sanitized active-session auto-refresh surface");
assert.match(dockSource, /sessionState\.status !== "active"/, "PPF-1 stops auto-refresh when the session is not active");
assert.match(dockSource, /setInterval\(\(\) => \{\s*refreshRealCommentsFeed\(\);\s*\}, commentTranslatorPreviewFeedAutoRefreshIntervalMs\)/s, "PPF-1 schedules periodic safe feed refresh");
assert.match(dockSource, /clearInterval\(intervalId\)/, "PPF-1 clears the refresh interval");
assert.match(dockSource, /onClick=\{refreshRealCommentsFeed\}/, "PPF-1 keeps manual comment refresh as fallback");
assert.match(dockSource, /resolveCommentTranslatorBrowserTimeZone/, "PPF-3 resolves browser-local display timezone in the client");

assert.match(sharedSource, /formatCommentTranslatorBrowserLocalTimestamp/, "PPF-3 exposes browser-local timestamp formatter");
assert.match(sharedSource, /timeZoneName:\s*"short"/, "PPF-3 timestamp formatter includes an explicit timezone label");
assert.match(sharedSource, /sortCommentTranslatorRealCommentsFeedRowsNewestFirst/, "PPF-2 exposes newest-first feed row ordering");

assert.match(
  localPreferencesSource,
  /timeZonePreferenceStorageKey = "v-streamer-tools-time-zone"/,
  "PPF-3 may use the shared display timezone preference when persistence is enabled"
);

assert.match(taskSource, /public-release capable: no/i, "public gate remains blocked");

const shared = loadTsModule(sharedPath);
assert.equal(typeof shared.formatCommentTranslatorBrowserLocalTimestamp, "function");
assert.equal(typeof shared.sortCommentTranslatorRealCommentsFeedRowsNewestFirst, "function");
assert.equal(typeof shared.attachCommentTranslatorLiveProviderDiagnosticsToFeed, "function");
assert.equal(typeof shared.hasNonZeroCommentTranslatorLiveProviderDiagnosticsCount, "function");

const baseRow = {
  provider: "youtube",
  messageReferenceId: "message-reference",
  kind: "text",
  timestamp: "legacy-timestamp",
  source: "youtube-live-chat",
  sourceAttributionLabel: "Source: YouTube Live Chat",
  role: "viewer",
  authorLabel: "YouTube viewer",
  originalText: "safe comment",
  translatedText: "safe translation",
  targetLanguage: "ja",
  translationStatus: "translated-f10",
  moderationLabel: "visible",
  deletionPropagation: "not-deleted",
  badgeLabel: null,
  purchaseLabel: null,
  memberMonthCount: null,
  rawProviderPayload: "not-returned-by-design",
  rawComments: "not-returned-by-design",
  authorChannelMaterial: "not-returned-by-design",
  providerTargetMetadata: "forbidden",
  serverOnlyCursor: "not-returned-by-design"
};

const feed = {
  status: "ready",
  source: "server-owned-live-session-state",
  rows: [
    { ...baseRow, id: "oldest", messageReferenceId: "oldest", publishedAtIso: "2026-06-15T00:00:01.000Z" },
    { ...baseRow, id: "newest", messageReferenceId: "newest", publishedAtIso: "2026-06-15T00:00:03.000Z" },
    { ...baseRow, id: "middle", messageReferenceId: "middle", publishedAtIso: "2026-06-15T00:00:02.000Z" }
  ],
  unavailableReason: null,
  sanitizedSummary: {
    displayRowCount: 3,
    safeRowSource: "f8-browser-safe-projection",
    fixtureFeedAuthority: "disabled",
    manualFeedAuthority: "disabled",
    rawProviderPayload: "not-returned-by-design",
    rawComments: "not-returned-by-design",
    authorChannelMaterial: "not-returned-by-design",
    providerTargetMetadata: "forbidden",
    serverOnlyCursor: "not-returned-by-design",
    liveProviderDiagnostics: null
  },
  rawProviderPayload: "not-returned-by-design",
  rawComments: "not-returned-by-design",
  providerTargetMetadata: "forbidden",
  serverOnlyCursor: "not-returned-by-design",
  browserStorage: "unchanged",
  handoffPayload: "unchanged",
  publicLaunchAllowed: false
};

const uiComments = shared.mapCommentTranslatorRealCommentsFeedRowsToUiComments({
  feed,
  targetLanguageLabel: "Japanese",
  locale: "en",
  timeZone: "Asia/Tokyo"
});

assert.deepEqual(uiComments.map((comment) => comment.id), ["newest", "middle", "oldest"], "PPF-2 displays newest comments first");
assert.match(uiComments[0].timestamp, /09:00:03\s+(GMT\+9|JST)/, "PPF-3 displays browser-local time with timezone label");
assert.doesNotMatch(JSON.stringify(uiComments), /liveChatId|providerChannelId|ownerUserId|nextPageToken|access_token|refresh_token|authorization_code/i);

const nonEmptyDiagnostics = {
  pollTickStatus: "polled",
  returnedCount: 3,
  acceptedCount: 3,
  skippedCount: 1,
  preStartSkippedCount: 0,
  skipReasonCounts: [{ reason: "language-policy", count: 1 }],
  providerCallCount: 1,
  cacheHitCount: 1,
  cacheMissCount: 1,
  duplicateTextCacheHitCount: 1,
  duplicateTextSkippedCount: 1,
  languagePolicySkippedCount: 1,
  translatedCount: 2,
  persistedFeedRowCount: 2,
  nextPollDue: "waiting",
  stopReason: null,
  rawProviderPayload: "not-returned-by-design",
  rawComments: "not-returned-by-design",
  providerTargetMetadata: "forbidden",
  serverOnlyCursor: "not-returned-by-design"
};
const emptyDiagnostics = {
  ...nonEmptyDiagnostics,
  returnedCount: 0,
  acceptedCount: 0,
  skippedCount: 0,
  skipReasonCounts: [],
  providerCallCount: 0,
  cacheHitCount: 0,
  cacheMissCount: 0,
  duplicateTextCacheHitCount: 0,
  duplicateTextSkippedCount: 0,
  languagePolicySkippedCount: 0,
  translatedCount: 0,
  persistedFeedRowCount: 0
};
const feedWithTranslationDiagnostics = shared.attachCommentTranslatorLiveProviderDiagnosticsToFeed({
  feed,
  diagnostics: nonEmptyDiagnostics
});
const feedAfterEmptyRead = shared.attachCommentTranslatorLiveProviderDiagnosticsToFeed({
  feed: feedWithTranslationDiagnostics,
  diagnostics: emptyDiagnostics
});
assert.equal(shared.hasNonZeroCommentTranslatorLiveProviderDiagnosticsCount(nonEmptyDiagnostics), true);
assert.equal(shared.hasNonZeroCommentTranslatorLiveProviderDiagnosticsCount(emptyDiagnostics), false);
assert.equal(
  feedAfterEmptyRead.sanitizedSummary.liveProviderDiagnostics.providerCallCount,
  1,
  "active-session diagnostics keeps the last non-empty provider count after an empty feed read"
);
assert.equal(
  feedAfterEmptyRead.sanitizedSummary.liveProviderDiagnostics.languagePolicySkippedCount,
  1,
  "active-session diagnostics keeps the last non-empty language-policy count after an empty feed read"
);

console.log("comment translator public preview feed UX contract checks passed");
