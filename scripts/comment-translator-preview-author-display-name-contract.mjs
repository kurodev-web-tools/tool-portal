import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const normalizationPath = "lib/comment-translator-live-message-normalization.ts";
const sharedPath = "lib/comment-translator-real-comments-feed-shared.ts";
const wiringPath = "lib/comment-translator-real-comments-ui-wiring.ts";
const inputBoundaryPath = "lib/comment-translator-youtube-input-boundary.ts";
const runtimeFoundationPath = "lib/comment-translator-youtube-runtime-foundation.ts";
const adapterPath = "lib/comment-translator-youtube-live-provider-runtime-adapter.ts";
const intakePipelinePath = "lib/comment-translator-youtube-live-comment-intake-pipeline.ts";
const dockPath = "components/comment-translator/CommentTranslatorDock.tsx";
const actionsPath = "app/tools/comment-translator/actions.ts";
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

for (const requiredPath of [
  normalizationPath,
  sharedPath,
  wiringPath,
  inputBoundaryPath,
  runtimeFoundationPath,
  adapterPath,
  intakePipelinePath,
  dockPath,
  actionsPath,
  taskPath
]) {
  assert.ok(fs.existsSync(path.join(root, requiredPath)), `preview author display-name required file exists: ${requiredPath}`);
}

const normalizationSource = read(normalizationPath);
const sharedSource = read(sharedPath);
const wiringSource = read(wiringPath);
const inputBoundarySource = read(inputBoundaryPath);
const runtimeFoundationSource = read(runtimeFoundationPath);
const adapterSource = read(adapterPath);
const intakePipelineSource = read(intakePipelinePath);
const dockSource = read(dockPath);
const actionsSource = read(actionsPath);
const taskSource = read(taskPath);

assert.match(normalizationSource, /authorDisplayName/, "normalization carries a dedicated safe author display-name field");
assert.match(sharedSource, /authorDisplayName/, "shared feed row carries a safe author display-name field");
assert.match(wiringSource, /authorDisplayName/, "server-owned safe feed wiring maps author display names");
assert.match(inputBoundarySource, /authorDisplayName\??:\s*string \| null/, "provider-safe comment payload permits only a nullable display-name string");
assert.match(runtimeFoundationSource, /authorDisplayName:\s*normalizeYouTubeAuthorDisplayName/, "runtime foundation sanitizes author display names before the bridge");
assert.match(adapterSource, /authorDisplayName:\s*normalizeAuthorDisplayName/, "YouTube API adapter maps only the safe author display-name");
assert.match(intakePipelineSource, /"authorDisplayName"/, "live comment intake recognizes display names as provider-safe metadata");
assert.match(
  dockSource,
  /data-comment-translator-preview-author-display-name="safe-display-name"/,
  "operator preview marks the safe author display-name surface"
);
assert.match(
  dockSource,
  /break-words/,
  "operator preview display-name text can wrap instead of overflowing narrow widths"
);
assert.doesNotMatch(
  dockSource,
  /author(Channel|Url|Profile)|profileImageUrl|channelId|channelUrl|authorProfileImage/i,
  "operator preview does not add author profile links, images, identifiers, or moderation controls"
);
assert.doesNotMatch(
  dockSource,
  /data-comment-translator-preview-author-display-name="safe-display-name"[\s\S]{0,480}(ban|timeout|delete|profile|channel)/i,
  "author display-name markup stays separate from moderation actions and provider identifiers"
);

const actionForbiddenAdditions = /authorDisplayName[\s\S]{0,240}(runCommentTranslatorLiveProviderSessionStep|readCommentTranslatorBoundedLiveChatPollingTick|resolveCommentTranslatorServerOnlyLiveChatTargetLookupForStart|recordCommentTranslatorDurableSessionLedgerStateOrFailClosed)/;
assert.doesNotMatch(
  actionsSource,
  actionForbiddenAdditions,
  "author display-name wiring does not add action-level provider polling, target lookup, or usage accounting"
);

const normalization = loadTsModule(normalizationPath);
const wiring = loadTsModule(wiringPath);
const shared = loadTsModule(sharedPath);

const normalized = normalization.normalizeCommentTranslatorLiveMessages({
  providerPayloads: [
    {
      id: "preview-author-message-1",
      snippet: {
        type: "textMessageEvent",
        publishedAt: "2026-07-04T01:00:00.000Z",
        textMessageDetails: { messageText: "safe synthetic text" }
      },
      authorDetails: {
        displayName: "  Safe Viewer  Alpha  ",
        channelId: "author-channel-never-output",
        channelUrl: "https://youtube.example/author-never-output",
        profileImageUrl: "https://images.example/profile-never-output.png",
        isChatModerator: true
      }
    },
    {
      id: "preview-author-message-2",
      snippet: {
        type: "superChatEvent",
        publishedAt: "2026-07-04T01:00:01.000Z",
        superChatDetails: {
          userComment: "safe support text",
          amountDisplayString: "JPY 500",
          tier: 2
        }
      },
      authorDetails: {
        displayName: "Supporter Beta",
        channelId: "super-author-channel-never-output",
        channelUrl: "https://youtube.example/super-author-never-output",
        profileImageUrl: "https://images.example/super-profile-never-output.png",
        isChatSponsor: true
      }
    },
    {
      id: "preview-author-message-3",
      snippet: {
        type: "textMessageEvent",
        publishedAt: "2026-07-04T01:00:02.000Z",
        textMessageDetails: { messageText: "safe fallback text" }
      },
      authorDetails: {
        displayName: "   ",
        channelId: "blank-author-channel-never-output",
        profileImageUrl: "https://images.example/blank-profile-never-output.png"
      }
    }
  ]
});

assert.equal(normalized.normalizedMessages[0].authorDisplayName, "Safe Viewer Alpha");
assert.equal(normalized.normalizedMessages[1].authorDisplayName, "Supporter Beta");
assert.equal(normalized.normalizedMessages[2].authorDisplayName, null);

const browserRows = normalization.projectCommentTranslatorNormalizedLiveMessagesForBrowser(normalized.normalizedMessages);
assert.equal(browserRows[0].authorDisplayName, "Safe Viewer Alpha");
assert.equal(browserRows[1].authorDisplayName, "Supporter Beta");
assert.equal(browserRows[2].authorDisplayName, null);

const feed = wiring.createCommentTranslatorRealCommentsFeedStateFromBrowserSafeRows({
  rows: browserRows,
  sessionStatus: "active",
  targetLanguage: "ja"
});

assert.equal(feed.status, "ready");
assert.equal(feed.rows[0].authorDisplayName, "Safe Viewer Alpha");
assert.equal(feed.rows[0].authorLabel, "YouTube viewer");
assert.equal(feed.rows[1].authorDisplayName, "Supporter Beta");
assert.equal(feed.rows[2].authorDisplayName, null);
assert.equal(feed.rawProviderPayload, "not-returned-by-design");
assert.equal(feed.rawComments, "not-returned-by-design");
assert.equal(feed.providerTargetMetadata, "forbidden");
assert.equal(feed.serverOnlyCursor, "not-returned-by-design");
assert.equal(feed.browserStorage, "unchanged");
assert.equal(feed.handoffPayload, "unchanged");
assert.equal(feed.publicLaunchAllowed, false);

const uiComments = shared.mapCommentTranslatorRealCommentsFeedRowsToUiComments({
  feed,
  targetLanguageLabel: "Japanese",
  locale: "en",
  timeZone: "Asia/Tokyo"
});

assert.deepEqual(
  uiComments.map((comment) => comment.authorName),
  ["YouTube viewer", "Supporter Beta", "Safe Viewer Alpha"],
  "operator preview maps newest-first safe display names and falls back to generic viewer label"
);

for (const payload of [normalized, browserRows, feed, uiComments]) {
  const serialized = JSON.stringify(payload);
  for (const forbiddenValue of [
    "author-channel-never-output",
    "author-never-output",
    "profile-never-output",
    "super-author-channel-never-output",
    "super-author-never-output",
    "super-profile-never-output",
    "blank-author-channel-never-output",
    "blank-profile-never-output",
    "liveChatId",
    "providerChannelId",
    "ownerUserId",
    "nextPageToken",
    "access_token",
    "refresh_token",
    "authorization_code",
    "Authorization",
    "service_role"
  ]) {
    assert.doesNotMatch(serialized, new RegExp(forbiddenValue, "i"), `display-name payload excludes ${forbiddenValue}`);
  }
}

assert.match(taskSource, /Preview author display name/i, "task.md records this author display-name slice");

const allowedChangedFiles = new Set([
  normalizationPath,
  sharedPath,
  wiringPath,
  inputBoundaryPath,
  runtimeFoundationPath,
  adapterPath,
  intakePipelinePath,
  dockPath,
  "lib/comment-translator.ts",
  "docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_REMAINING_TASK_BOARD.md",
  "scripts/comment-translator-free-beta-creator-locked-waitlist-contract.mjs",
  "scripts/comment-translator-free-beta-usage-display-contract.mjs",
  "scripts/comment-translator-public-operator-session-ui-contract.mjs",
  "scripts/comment-translator-public-launch-remaining-task-board-contract.mjs",
  "scripts/comment-translator-preview-author-display-name-contract.mjs",
  "scripts/comment-translator-obs-dock-display-name-policy-contract.mjs",
  "scripts/comment-translator-live-message-normalization-contract.mjs",
  "scripts/comment-translator-real-comments-ui-wiring-contract.mjs",
  "scripts/comment-translator-ui-live-provider-runtime-contract.mjs",
  "scripts/comment-translator-youtube-input-boundary-contract.mjs",
  "scripts/comment-translator-youtube-runtime-foundation-contract.mjs",
  "scripts/comment-translator-youtube-live-comment-intake-pipeline-contract.mjs",
  "scripts/comment-translator-youtube-api-adapter-token-reference-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-feed-bridge-session-persistence-contract.mjs",
  "scripts/comment-translator-real-comments-ui-wiring-contract.mjs",
  "scripts/comment-translator-public-preview-feed-ux-contract.mjs",
  "scripts/comment-translator-public-ui-cleanup-contract.mjs",
  taskPath
]);
for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `preview author display-name change stays focused: ${file}`);
}

console.log("comment translator preview author display-name contract checks passed");
