import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const retentionPath = "lib/comment-translator-free-beta-retention-attribution.ts";
const liveNormalizationPath = "lib/comment-translator-live-message-normalization.ts";
const feedSharedPath = "lib/comment-translator-real-comments-feed-shared.ts";
const feedWiringPath = "lib/comment-translator-real-comments-ui-wiring.ts";
const actionsPath = "app/tools/comment-translator/actions.ts";
const componentPath = "components/comment-translator/CommentTranslatorDock.tsx";
const copyPath = "lib/comment-translator.ts";
const disconnectPath = "lib/comment-translator-youtube-disconnect-runtime.ts";
const readinessDocPath = "docs/active/COMMENT_TRANSLATOR_DURABLE_PERSISTENCE_SCHEMA_READINESS.md";
const gapAuditPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md";
const taskPath = "task.md";
const sharedTsModuleCache = new Map();

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
  const sourcePath = path.join(root, relativePath);
  const originalLoad = Module._load;

  function compileTsModule(modulePath) {
    const normalizedModulePath = path.normalize(modulePath);
    if (sharedTsModuleCache.has(normalizedModulePath)) {
      return sharedTsModuleCache.get(normalizedModulePath).exports;
    }

    const source = fs.readFileSync(normalizedModulePath, "utf8");
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022
      }
    }).outputText;
    const testModule = new Module(normalizedModulePath);
    sharedTsModuleCache.set(normalizedModulePath, testModule);
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
    return compileTsModule(sourcePath);
  } finally {
    Module._load = originalLoad;
  }
}

for (const requiredPath of [
  retentionPath,
  liveNormalizationPath,
  feedSharedPath,
  feedWiringPath,
  actionsPath,
  componentPath,
  copyPath,
  disconnectPath,
  readinessDocPath,
  gapAuditPath,
  taskPath
]) {
  assert.ok(exists(requiredPath), `F13 required file exists: ${requiredPath}`);
}

const retentionSource = read(retentionPath);
const liveNormalizationSource = read(liveNormalizationPath);
const feedSharedSource = read(feedSharedPath);
const actionsSource = read(actionsPath);
const componentSource = read(componentPath);
const copySource = read(copyPath);
const disconnectSource = read(disconnectPath);
const readinessDoc = read(readinessDocPath);
const gapAudit = read(gapAuditPath);
const taskSource = read(taskPath);

assert.match(retentionSource, /^import "server-only";/m, "F13 resolver is server-only");
assert.match(retentionSource, /commentTranslatorFreeBetaRetentionAttributionContract/, "F13 exposes a focused retention attribution contract");
assert.match(retentionSource, /dataDeletionRequestPath:\s*"server-action:requestCommentTranslatorDataDeletionAction"/, "F13 fixes a data deletion request path");
assert.match(retentionSource, /oauthDisconnectCleanup/, "F13 covers OAuth disconnect cleanup readiness");
assert.match(retentionSource, /retentionJob/, "F13 covers retention job readiness");
assert.match(retentionSource, /deletedMessagePropagation/, "F13 covers deleted-message propagation");
assert.match(retentionSource, /Source: YouTube Live Chat/, "F13 fixes source attribution label");
assert.match(retentionSource, /publicLaunchAllowed:\s*false/, "F13 does not open public launch gate");
assert.match(liveNormalizationSource, /deletedMessageReferenceIds/, "F8 keeps deleted message references in server-owned normalization state");
assert.match(feedSharedSource, /deletionPropagation/, "browser-safe feed rows expose deletion propagation without raw payloads");
assert.match(actionsSource, /requestCommentTranslatorDataDeletionAction/, "server action exposes the data deletion button path");
assert.match(componentSource, /data-comment-translator-retention-attribution="sanitized-retention-attribution-only"/, "UI renders F13 sanitized panel");
assert.match(componentSource, /Source: YouTube Live Chat/, "UI renders Source: YouTube Live Chat on relevant live comment surfaces");
assert.match(copySource, /retentionAttribution/, "localized copy includes F13 retention attribution copy");
assert.match(disconnectSource, /oauthDisconnectCleanup/, "disconnect runtime carries sanitized cleanup readiness");
assert.match(readinessDoc, /F13 Data deletion, retention, and source attribution/i, "durable readiness doc records F13");
assert.match(gapAudit, /F13[\s\S]*Data deletion, retention, and source attribution/i, "gap audit keeps F13 visible");
assert.match(taskSource, /F13 Data deletion, retention, and source attribution/i, "task.md records F13 work");

const retention = loadTsModule(retentionPath);
assert.equal(retention.commentTranslatorFreeBetaRetentionAttributionContract.implementationStage, "free-public-beta-f13-retention-attribution");
assert.equal(retention.commentTranslatorFreeBetaRetentionAttributionContract.runtime, "server-only");
assert.equal(retention.commentTranslatorFreeBetaRetentionAttributionContract.publicLaunchAllowed, false);
assert.equal(retention.commentTranslatorFreeBetaRetentionAttributionContract.sourceAttribution.label, "Source: YouTube Live Chat");

const available = retention.createCommentTranslatorFreeBetaRetentionAttributionState({
  durableSessionState: "ready",
  durableUsageState: "ready",
  entitlementState: "ready",
  providerReadinessState: "ready",
  nowMs: Date.parse("2026-06-16T00:00:00.000Z")
});
assert.equal(available.status, "available");
assert.equal(available.dataDeletion.buttonState, "enabled");
assert.equal(available.dataDeletion.requestPath, "server-action:requestCommentTranslatorDataDeletionAction");
assert.equal(available.retentionJob.status, "ready");
assert.equal(available.sourceAttribution.label, "Source: YouTube Live Chat");
assert.equal(available.deletedMessagePropagation.browserReadableText, "tombstone-only");
assert.equal(available.rawComments, "not-returned-by-design");
assert.equal(available.providerTargetMetadata, "forbidden");

const unavailable = retention.createCommentTranslatorFreeBetaRetentionAttributionState({
  durableSessionState: "unreadable",
  durableUsageState: "ready",
  entitlementState: "ready",
  providerReadinessState: "ready",
  nowMs: Date.parse("2026-06-16T00:00:00.000Z")
});
assert.equal(unavailable.status, "unavailable");
assert.equal(unavailable.unavailableReason, "durable-session-unreadable");
assert.equal(unavailable.dataDeletion.buttonState, "disabled");
assert.equal(unavailable.dataDeletion.clientReadableDetail, "sanitized-unavailable-only");
assert.equal(unavailable.publicLaunchAllowed, false);

const cleanupReady = retention.resolveCommentTranslatorOAuthDisconnectCleanupReadiness({
  disconnectStatus: "disconnected",
  durableSessionState: "ready",
  durableUsageState: "ready"
});
assert.equal(cleanupReady.status, "ready");
assert.equal(cleanupReady.execution, "server-owned-cleanup-required-not-run-by-contract");

const cleanupUnavailable = retention.resolveCommentTranslatorOAuthDisconnectCleanupReadiness({
  disconnectStatus: "disconnect-unavailable",
  durableSessionState: "ready",
  durableUsageState: "ready"
});
assert.equal(cleanupUnavailable.status, "unavailable");
assert.equal(cleanupUnavailable.unavailableReason, "disconnect-unavailable");

const liveNormalization = loadTsModule(liveNormalizationPath);
const feedShared = loadTsModule(feedSharedPath);
const normalized = liveNormalization.normalizeCommentTranslatorLiveMessages({
  providerPayloads: [
    {
      id: "yt-visible-1",
      snippet: {
        type: "textMessageEvent",
        publishedAt: "2026-06-16T00:00:01.000Z",
        displayMessage: "visible comment"
      }
    },
    {
      id: "yt-delete-event-1",
      snippet: {
        type: "messageDeletedEvent",
        publishedAt: "2026-06-16T00:00:02.000Z",
        messageDeletedDetails: {
          deletedMessageId: "yt-visible-1"
        }
      }
    }
  ]
});
assert.deepEqual(normalized.nextState.deletedMessageReferenceIds, ["yt-visible-1"]);
const browserRows = liveNormalization.projectCommentTranslatorNormalizedLiveMessagesForBrowser(normalized.normalizedMessages);
assert.equal(browserRows[1].moderationLabel, "deleted");
assert.equal(browserRows[1].text, null);
assert.equal(browserRows[1].deletionPropagation, "message-reference-tombstone-only");
assert.equal(browserRows[1].sourceAttributionLabel, "Source: YouTube Live Chat");

const feed = feedShared.mapCommentTranslatorRealCommentsFeedRowsToUiComments({
  feed: {
    status: "ready",
    source: "server-owned-live-session-state",
    rows: [
      {
        id: "yt-delete-event-1",
        provider: "youtube",
        messageReferenceId: "yt-delete-event-1",
        kind: "deleted",
        timestamp: "00:00:02",
        publishedAtIso: "2026-06-16T00:00:02.000Z",
        source: "youtube-live-chat",
        sourceAttributionLabel: "Source: YouTube Live Chat",
        role: "unknown",
        authorLabel: "YouTube viewer",
        originalText: null,
        translatedText: null,
        targetLanguage: "ja",
        translationStatus: "skipped-f10-non-translatable",
        moderationLabel: "deleted",
        deletionPropagation: "message-reference-tombstone-only",
        badgeLabel: null,
        purchaseLabel: null,
        memberMonthCount: null,
        rawProviderPayload: "not-returned-by-design",
        rawComments: "not-returned-by-design",
        authorChannelMaterial: "not-returned-by-design",
        providerTargetMetadata: "forbidden",
        serverOnlyCursor: "not-returned-by-design"
      }
    ],
    unavailableReason: null,
    sanitizedSummary: {
      displayRowCount: 1,
      safeRowSource: "f8-browser-safe-projection",
      fixtureFeedAuthority: "disabled",
      manualFeedAuthority: "disabled",
      rawProviderPayload: "not-returned-by-design",
      rawComments: "not-returned-by-design",
      authorChannelMaterial: "not-returned-by-design",
      providerTargetMetadata: "forbidden",
      serverOnlyCursor: "not-returned-by-design"
    },
    rawProviderPayload: "not-returned-by-design",
    rawComments: "not-returned-by-design",
    providerTargetMetadata: "forbidden",
    serverOnlyCursor: "not-returned-by-design",
    browserStorage: "unchanged",
    handoffPayload: "unchanged",
    publicLaunchAllowed: false
  },
  targetLanguageLabel: "Japanese"
});
assert.equal(feed[0].sourceLabel, "Source: YouTube Live Chat");
assert.equal(feed[0].originalText, "Message deleted");
assert.equal(feed[0].skipReason, "Deleted message");

for (const payload of [available, unavailable, cleanupReady, cleanupUnavailable, normalized, browserRows, feed]) {
  const serialized = JSON.stringify(payload);
  for (const forbiddenValue of [
    "access_token",
    "refresh_token",
    "authorization_code",
    "service_role",
    "Authorization",
    "liveChatId",
    "providerChannelId",
    "provider-target-metadata",
    "nextPageToken",
    "authorChannelId",
    "profileImageUrl"
  ]) {
    assert.doesNotMatch(serialized, new RegExp(forbiddenValue, "i"), `F13 sanitized output excludes ${forbiddenValue}`);
  }
}

const allowedChangedFiles = new Set([
  retentionPath,
  liveNormalizationPath,
  feedSharedPath,
  feedWiringPath,
  actionsPath,
  componentPath,
  copyPath,
  disconnectPath,
  readinessDocPath,
  gapAuditPath,
  "scripts/comment-translator-free-beta-retention-attribution-contract.mjs",
  taskPath
]);
for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `F13 change stays in allowed files: ${file}`);

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

console.log("comment translator Free beta retention attribution contract checks passed");
