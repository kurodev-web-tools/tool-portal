import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const sharedPath = "lib/comment-translator-real-comments-feed-shared.ts";
const componentPath = "components/comment-translator/CommentTranslatorDock.tsx";
const libPath = "lib/comment-translator.ts";
const taskBoardPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_REMAINING_TASK_BOARD.md";
const taskPath = "task.md";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
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

for (const requiredPath of [sharedPath, componentPath, libPath, taskBoardPath, taskPath]) {
  assert.ok(fs.existsSync(path.join(root, requiredPath)), `OBS Dock display-name policy required file exists: ${requiredPath}`);
}

const sharedSource = read(sharedPath);
const componentSource = read(componentPath);
const libSource = read(libPath);
const taskBoardSource = read(taskBoardPath);
const taskSource = read(taskPath);

assert.match(sharedSource, /resolveCommentTranslatorAuthorDisplayNamePolicy/, "shared feed view-model exposes an author display-name policy resolver");
assert.match(sharedSource, /resolveCommentTranslatorAuthorDisplayName/, "shared feed view-model resolves display labels from the policy");
assert.match(sharedSource, /stream-safe-generic-default/, "stream-safe compact default marker is explicit");
assert.match(sharedSource, /stream-safe-safe-display-name-enabled/, "stream-safe explicit show-name marker is explicit");
assert.match(sharedSource, /operator-safe-display-name/, "normal operator preview marker is explicit");
assert.match(componentSource, /data-comment-translator-obs-dock-display-name-policy/, "dock exposes a stable OBS display-name policy marker");
assert.match(componentSource, /data-comment-translator-obs-dock-display-name-setting="explicit-toggle"/, "stream-safe display names require an explicit toggle");
assert.match(componentSource, /showStreamSafeAuthorDisplayNames/, "dock stores the explicit stream-safe show-name state");
assert.match(componentSource, /max-w-\[11rem\]|truncate/, "stream-safe display names use compact truncation-safe styling");
assert.match(libSource, /displayNamePolicy/, "localized UI copy includes display-name policy labels");
assert.match(taskBoardSource, /OBS Dock display-name policy[^\n]*complete/i, "public launch task board marks Step 8 complete after implementation");
assert.match(taskSource, /obs_dock_display_name_policy_status=complete/, "task.md records Step 8 completion status");

const shared = loadTsModule(sharedPath);

const feed = {
  status: "ready",
  source: "server-owned-live-session-state",
  rows: [
    {
      id: "obs-display-name-row-1",
      provider: "youtube",
      messageReferenceId: "obs-display-name-row-1",
      kind: "text",
      timestamp: "10:00:00",
      publishedAtIso: "2026-07-08T10:00:00.000Z",
      source: "youtube-live-chat",
      sourceAttributionLabel: "Source: YouTube Live Chat",
      role: "viewer",
      authorLabel: "YouTube viewer",
      authorDisplayName: "Very Long Stream Safe Viewer Name That Should Be Compacted",
      originalText: "safe synthetic text",
      translatedText: "safe synthetic translation",
      targetLanguage: "ja",
      translationStatus: "translated-f10",
      translationCacheStatus: "miss",
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
    },
    {
      id: "obs-display-name-row-2",
      provider: "youtube",
      messageReferenceId: "obs-display-name-row-2",
      kind: "text",
      timestamp: "10:00:01",
      publishedAtIso: "2026-07-08T10:00:01.000Z",
      source: "youtube-live-chat",
      sourceAttributionLabel: "Source: YouTube Live Chat",
      role: "viewer",
      authorLabel: "YouTube viewer",
      authorDisplayName: "Safe Viewer",
      originalText: "safe synthetic text 2",
      translatedText: "safe synthetic translation 2",
      targetLanguage: "ja",
      translationStatus: "translated-f10",
      translationCacheStatus: "hit",
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
    }
  ],
  unavailableReason: null,
  sanitizedSummary: {
    displayRowCount: 2,
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

const normalPolicy = shared.resolveCommentTranslatorAuthorDisplayNamePolicy({
  surfaceMode: "obs-browser-dock",
  viewMode: "normal",
  showSafeAuthorDisplayNamesInStreamSafeMode: false
});
assert.equal(normalPolicy.marker, "operator-safe-display-name");

const normalUiComments = shared.mapCommentTranslatorRealCommentsFeedRowsToUiComments({
  feed,
  targetLanguageLabel: "Japanese",
  locale: "en",
  timeZone: "Asia/Tokyo",
  authorDisplayNamePolicy: normalPolicy
});
assert.deepEqual(
  normalUiComments.map((comment) => comment.authorName),
  ["Safe Viewer", "Very Long Stream Safe Viewer Name That Should Be Compacted"],
  "normal operator preview keeps safe author display names for context"
);

const streamSafeDefaultPolicy = shared.resolveCommentTranslatorAuthorDisplayNamePolicy({
  surfaceMode: "obs-browser-dock",
  viewMode: "comments",
  showSafeAuthorDisplayNamesInStreamSafeMode: false
});
assert.equal(streamSafeDefaultPolicy.marker, "stream-safe-generic-default");
assert.equal(streamSafeDefaultPolicy.streamSafe, true);

const streamSafeDefaultComments = shared.mapCommentTranslatorRealCommentsFeedRowsToUiComments({
  feed,
  targetLanguageLabel: "Japanese",
  locale: "en",
  timeZone: "Asia/Tokyo",
  authorDisplayNamePolicy: streamSafeDefaultPolicy
});
assert.deepEqual(
  streamSafeDefaultComments.map((comment) => comment.authorName),
  ["YouTube viewer", "YouTube viewer"],
  "stream-safe compact default hides viewer display names behind the generic label"
);

const streamSafeExplicitPolicy = shared.resolveCommentTranslatorAuthorDisplayNamePolicy({
  surfaceMode: "obs-browser-dock",
  viewMode: "comments",
  showSafeAuthorDisplayNamesInStreamSafeMode: true
});
assert.equal(streamSafeExplicitPolicy.marker, "stream-safe-safe-display-name-enabled");
assert.equal(streamSafeExplicitPolicy.maxDisplayNameCharacters, 32);

const streamSafeExplicitComments = shared.mapCommentTranslatorRealCommentsFeedRowsToUiComments({
  feed,
  targetLanguageLabel: "Japanese",
  locale: "en",
  timeZone: "Asia/Tokyo",
  authorDisplayNamePolicy: streamSafeExplicitPolicy
});
assert.deepEqual(
  streamSafeExplicitComments.map((comment) => comment.authorName),
  ["Safe Viewer", "Very Long Stream Safe Viewer ..."],
  "stream-safe explicit show-name mode uses only compacted safe display-name strings"
);

for (const payload of [normalUiComments, streamSafeDefaultComments, streamSafeExplicitComments]) {
  const serialized = JSON.stringify(payload);
  assert.doesNotMatch(serialized, /channelId|channelUrl|profileImageUrl|liveChatId|providerTargetMetadata|ownerUserId/i);
  assert.doesNotMatch(serialized, /access_token|refresh_token|authorization_code|Authorization|service_role/i);
}

const allowedChangedFiles = new Set([
  sharedPath,
  componentPath,
  libPath,
  taskBoardPath,
  taskPath,
  "scripts/comment-translator-obs-dock-display-name-policy-contract.mjs",
  "scripts/comment-translator-preview-author-display-name-contract.mjs",
  "scripts/comment-translator-real-comments-ui-wiring-contract.mjs",
  "scripts/comment-translator-public-launch-remaining-task-board-contract.mjs"
]);
for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `OBS Dock display-name policy change stays focused: ${file}`);
}

console.log("comment translator OBS Dock display-name policy contract checks passed");
