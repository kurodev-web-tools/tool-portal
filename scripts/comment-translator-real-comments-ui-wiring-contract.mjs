import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const sharedPath = "lib/comment-translator-real-comments-feed-shared.ts";
const wiringPath = "lib/comment-translator-real-comments-ui-wiring.ts";
const commentTranslatorPath = "lib/comment-translator.ts";
const normalizationPath = "lib/comment-translator-live-message-normalization.ts";
const actionsPath = "app/tools/comment-translator/actions.ts";
const pagePath = "app/tools/comment-translator/page.tsx";
const dockPath = "components/comment-translator/CommentTranslatorDock.tsx";
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
  sharedPath,
  wiringPath,
  normalizationPath,
  actionsPath,
  pagePath,
  dockPath,
  readinessDocPath,
  gapAuditPath,
  taskPath
]) {
  assert.ok(exists(requiredPath), `F9 required file exists: ${requiredPath}`);
}

const sharedSource = read(sharedPath);
const wiringSource = read(wiringPath);
const normalizationSource = read(normalizationPath);
const actionsSource = read(actionsPath);
const pageSource = read(pagePath);
const dockSource = read(dockPath);
const readinessDoc = read(readinessDocPath);
const gapAudit = read(gapAuditPath);
const taskSource = read(taskPath);

assert.match(wiringSource, /^import "server-only";/m, "F9 server-owned feed wiring is server-only");
assert.match(wiringSource, /commentTranslatorRealCommentsUiWiringContract/, "F9 exposes a focused contract");
assert.match(wiringSource, /createCommentTranslatorRealCommentsFeedStateFromBrowserSafeRows/, "F9 consumes F8 browser-safe rows");
assert.match(wiringSource, /createUnavailableCommentTranslatorRealCommentsFeedState/, "F9 fails closed to sanitized unavailable feed state");
assert.match(wiringSource, /projectCommentTranslatorNormalizedLiveMessagesForBrowser/, "F9 explicitly depends on the F8 browser-safe projection boundary");
assert.match(sharedSource, /CommentTranslatorRealCommentsDisplayRow/, "F9 shared safe display row shape exists");
assert.match(sharedSource, /mapCommentTranslatorRealCommentsFeedRowsToUiComments/, "F9 maps safe rows to existing UI comment cards");
assert.match(actionsSource, /getCommentTranslatorRealCommentsFeedAction/, "F9 server action exposes only safe feed state");
assert.match(pageSource, /initialRealCommentsFeed/, "F9 page seeds the dock with server-owned feed state");
assert.match(dockSource, /data-comment-translator-real-comments-feed="server-owned-safe-rows"/, "F9 UI marks server-owned safe feed surface");
assert.match(dockSource, /realCommentsFeedUnavailableMessage/, "F9 UI surfaces sanitized feed unavailable reason");
assert.match(dockSource, /unavailableReason:/, "F9 UI labels unavailable reason without raw provider detail");
assert.doesNotMatch(dockSource, /const allComments = \[\.\.\.manualComments,\s*\.\.\.comments\]/, "F9 UI no longer combines manual and fixture feed authority");
assert.doesNotMatch(dockSource, /comments\s*\}\s*=\s*mockTranslationProvider\.getSnapshot\(\)/, "F9 UI does not destructure fixture comments as feed authority");
assert.match(readinessDoc, /F9 real comments UI wiring/i, "durable readiness doc records F9");
assert.match(gapAudit, /F9[\s\S]*Real comments UI/i, "gap audit records F9");
assert.match(taskSource, /F9 Real comments UI wiring|server-owned live comments/i, "task.md records F9 active work");
assert.match(taskSource, /390 \/ 820 \/ 1024 \/ 1280 \/ 1366px/i, "task.md records F9 width-check widths");

const normalization = loadTsModule(normalizationPath);
const wiring = loadTsModule(wiringPath);
const shared = loadTsModule(sharedPath);

assert.equal(wiring.commentTranslatorRealCommentsUiWiringContract.implementationStage, "free-public-beta-f9-real-comments-ui-wiring");
assert.equal(wiring.commentTranslatorRealCommentsUiWiringContract.runtime, "server-only");
assert.equal(wiring.commentTranslatorRealCommentsUiWiringContract.safeRowSource, "f8-browser-safe-projection");
assert.equal(wiring.commentTranslatorRealCommentsUiWiringContract.publicLaunchAllowed, false);
assert.equal(wiring.commentTranslatorRealCommentsUiWiringContract.providerPollingExecution, "not-run-in-this-thread");
assert.equal(wiring.commentTranslatorRealCommentsUiWiringContract.translationProviderExecution, "not-run-in-this-thread");

const normalized = normalization.normalizeCommentTranslatorLiveMessages({
  providerPayloads: [
    {
      id: "yt-f9-text-1",
      snippet: {
        type: "textMessageEvent",
        publishedAt: "2026-06-15T01:00:00.000Z",
        textMessageDetails: { messageText: "Safe hello" }
      },
      authorDetails: {
        channelId: "f9-author-channel-never-output",
        channelUrl: "https://youtube.example/f9-author-never-output",
        profileImageUrl: "https://images.example/f9-profile-never-output.png",
        isChatModerator: true
      }
    },
    {
      id: "yt-f9-super-1",
      snippet: {
        type: "superChatEvent",
        publishedAt: "2026-06-15T01:00:01.000Z",
        superChatDetails: {
          userComment: "Safe support",
          amountDisplayString: "JPY 500",
          tier: 2
        }
      },
      authorDetails: {
        channelId: "f9-super-channel-never-output",
        profileImageUrl: "https://images.example/f9-super-never-output.png",
        isChatSponsor: true
      }
    },
    {
      id: "yt-f9-deleted-1",
      snippet: {
        type: "messageDeletedEvent",
        publishedAt: "2026-06-15T01:00:02.000Z",
        messageDeletedDetails: { deletedMessageId: "yt-f9-text-1" }
      }
    },
    {
      id: "yt-f9-ended-1",
      snippet: {
        type: "liveChatEndedEvent",
        publishedAt: "2026-06-15T01:00:03.000Z"
      }
    }
  ]
});
const browserRows = normalization.projectCommentTranslatorNormalizedLiveMessagesForBrowser(normalized.normalizedMessages);
const feed = wiring.createCommentTranslatorRealCommentsFeedStateFromBrowserSafeRows({
  rows: browserRows,
  sessionStatus: "active",
  targetLanguage: "ja"
});

assert.equal(feed.status, "ready");
assert.equal(feed.source, "server-owned-live-session-state");
assert.equal(feed.rows.length, 4);
assert.equal(feed.sanitizedSummary.displayRowCount, 4);
assert.equal(feed.rawProviderPayload, "not-returned-by-design");
assert.equal(feed.rawComments, "not-returned-by-design");
assert.equal(feed.providerTargetMetadata, "forbidden");
assert.equal(feed.serverOnlyCursor, "not-returned-by-design");
assert.equal(feed.browserStorage, "unchanged");
assert.equal(feed.handoffPayload, "unchanged");
assert.equal(feed.publicLaunchAllowed, false);
assert.equal(feed.rows.every((row) => row.authorLabel === "YouTube viewer"), true);
assert.equal(feed.rows.find((row) => row.kind === "super-chat").badgeLabel, "super-chat");
assert.equal(feed.rows.find((row) => row.kind === "deleted").originalText, null);
assert.equal(feed.rows.find((row) => row.kind === "ended").moderationLabel, "ended");

const uiComments = shared.mapCommentTranslatorRealCommentsFeedRowsToUiComments({
  feed,
  targetLanguageLabel: "日本語"
});
assert.equal(uiComments.length, 4);
assert.equal(uiComments.every((comment) => comment.source === "server"), true);
assert.equal(uiComments.every((comment) => comment.authorName === "YouTube viewer"), true);
assert.equal(uiComments.find((comment) => comment.id === "yt-f9-text-1").originalText, "Safe hello");
assert.equal(uiComments.find((comment) => comment.id === "yt-f9-text-1").status, "skipped");
assert.equal(uiComments.find((comment) => comment.id === "yt-f9-text-1").skipReason, "Translation not run");

const unavailable = wiring.createUnavailableCommentTranslatorRealCommentsFeedState({
  reason: "live-provider-polling-not-approved"
});
assert.equal(unavailable.status, "unavailable");
assert.equal(unavailable.rows.length, 0);
assert.equal(unavailable.sanitizedSummary.displayRowCount, 0);
assert.equal(unavailable.publicLaunchAllowed, false);

for (const payload of [feed, uiComments, unavailable]) {
  const serialized = JSON.stringify(payload);
  assert.doesNotMatch(serialized, /f9-author-channel-never-output|f9-super-channel-never-output/i);
  assert.doesNotMatch(serialized, /youtube\.example\/f9-author-never-output|f9-profile-never-output|f9-super-never-output/i);
  assert.doesNotMatch(serialized, /access_token|refresh_token|authorization_code|Authorization|service_role/i);
  assert.doesNotMatch(serialized, /liveChatId|providerChannelId|ownerUserId|nextPageToken/i);
}

for (const source of [sharedSource, wiringSource, actionsSource, pageSource, dockSource, readinessDoc, gapAudit, taskSource]) {
  assert.doesNotMatch(
    source,
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+/i,
    "F9 inspected source excludes secret values, token values, authorization values, and private provider identifiers"
  );
}

const allowedChangedFiles = new Set([
  sharedPath,
  wiringPath,
  commentTranslatorPath,
  actionsPath,
  "app/api/comment-translator/session/route.ts",
  pagePath,
  dockPath,
  "lib/comment-translator-youtube-live-provider-runtime-adapter.ts",
  "lib/comment-translator-azure-normal-translation-execution.ts",
  readinessDocPath,
  gapAuditPath,
  "scripts/comment-translator-azure-normal-translation-execution-contract.mjs",
  "scripts/comment-translator-bounded-live-chat-polling-wiring-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-feed-bridge-session-persistence-contract.mjs",
  "scripts/comment-translator-durable-session-schema-adapter-contract.mjs",
  "scripts/comment-translator-durable-usage-counter-schema-adapter-contract.mjs",
  "scripts/comment-translator-free-beta-usage-display-contract.mjs",
  "scripts/comment-translator-public-operator-session-ui-contract.mjs",
  "scripts/comment-translator-ui-live-provider-runtime-contract.mjs",
  "scripts/comment-translator-real-comments-ui-wiring-contract.mjs",
  "scripts/comment-translator-session-start-stop-contract.mjs",
  "scripts/comment-translator-usage-quota-budget-ledger-contract.mjs",
  "scripts/comment-translator-public-preview-feed-ux-contract.mjs",
  taskPath
]);
for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `F9 change stays in allowed files: ${file}`);
}

console.log("comment translator real comments UI wiring contract checks passed");
