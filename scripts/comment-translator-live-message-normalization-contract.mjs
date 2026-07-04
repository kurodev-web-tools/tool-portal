import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const normalizationPath = "lib/comment-translator-live-message-normalization.ts";
const youtubeRuntimePath = "lib/comment-translator-youtube-runtime-foundation.ts";
const inputBoundaryPath = "lib/comment-translator-youtube-input-boundary.ts";
const intakePipelinePath = "lib/comment-translator-youtube-live-comment-intake-pipeline.ts";
const pollingWiringPath = "lib/comment-translator-bounded-live-chat-polling-wiring.ts";
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
    return compileTsModule(path.join(root, relativePath));
  } finally {
    Module._load = originalLoad;
  }
}

for (const requiredPath of [
  normalizationPath,
  youtubeRuntimePath,
  inputBoundaryPath,
  intakePipelinePath,
  pollingWiringPath,
  readinessDocPath,
  gapAuditPath,
  taskPath
]) {
  assert.ok(exists(requiredPath), `F8 required file exists: ${requiredPath}`);
}

const normalizationSource = read(normalizationPath);
const youtubeRuntimeSource = read(youtubeRuntimePath);
const inputBoundarySource = read(inputBoundaryPath);
const intakePipelineSource = read(intakePipelinePath);
const pollingWiringSource = read(pollingWiringPath);
const readinessDoc = read(readinessDocPath);
const gapAudit = read(gapAuditPath);
const taskSource = read(taskPath);

assert.match(normalizationSource, /^import "server-only";/m, "F8 live message normalization is server-only");
assert.match(normalizationSource, /commentTranslatorLiveMessageNormalizationContract/, "F8 exposes a focused contract");
assert.match(normalizationSource, /normalizeCommentTranslatorLiveMessages/, "F8 exports the batch normalizer");
assert.match(normalizationSource, /createInitialCommentTranslatorLiveMessageNormalizationState/, "F8 exports a state initializer");
assert.match(normalizationSource, /projectCommentTranslatorNormalizedLiveMessagesForBrowser/, "F8 exports browser-safe projection");
assert.match(normalizationSource, /dedupe-policy-message-reference-id/, "F8 records message-reference dedupe");
assert.match(normalizationSource, /deleted-message-propagation/, "F8 records deletion handling");
assert.match(normalizationSource, /ban-author-history-p1-deferred-without-session-author-key/, "F8 records BAN history update deferral");
assert.match(normalizationSource, /authorChannelIdPersistence:\s*"forbidden"/, "F8 forbids author channel id persistence");
assert.match(normalizationSource, /authorProfileImageUrlPersistence:\s*"forbidden"/, "F8 forbids profile image URL persistence");
assert.match(normalizationSource, /rawProviderPayload:\s*"not-returned-by-design"/, "F8 forbids raw provider payload output");
assert.match(normalizationSource, /publicLaunchAllowed:\s*false/, "F8 does not open public launch gate");

assert.match(youtubeRuntimeSource, /YouTubeLiveChatPollingStepResult/, "F8 remains compatible with F7 polling step results");
assert.match(inputBoundarySource, /YouTubeProviderSafeCommentPayload/, "F8 keeps the provider-safe text payload boundary available");
assert.match(intakePipelineSource, /createYouTubeLiveCommentTranslatorPipelineRequestsForComments/, "F8 can feed the existing intake pipeline without provider execution");
assert.match(pollingWiringSource, /rawComments:\s*"not-returned-by-design"/, "F7 still keeps raw polling comments out of browser-safe metadata");
assert.match(readinessDoc, /F8 live message normalization/i, "durable readiness doc records F8");
assert.match(gapAudit, /F8[\s\S]*Live message normalization/i, "gap audit records F8 normalization");
assert.match(taskSource, /Preview author display name/i, "task.md records the current author display-name slice");
assert.match(taskSource, /390 \/ 820 \/ 1024 \/ 1280 \/ 1366px/i, "task.md records the required UI width-check widths");

const normalization = loadTsModule(normalizationPath);

assert.equal(
  normalization.commentTranslatorLiveMessageNormalizationContract.implementationStage,
  "free-public-beta-f8-live-message-normalization"
);
assert.equal(normalization.commentTranslatorLiveMessageNormalizationContract.runtime, "server-only");
assert.equal(normalization.commentTranslatorLiveMessageNormalizationContract.publicLaunchAllowed, false);
assert.deepEqual(normalization.commentTranslatorLiveMessageNormalizationContract.normalizedEventKinds, [
  "text",
  "super-chat",
  "super-sticker",
  "member",
  "system",
  "deleted",
  "banned",
  "ended"
]);

const initialState = normalization.createInitialCommentTranslatorLiveMessageNormalizationState();
assert.deepEqual(initialState.seenMessageReferenceIds, []);
assert.deepEqual(initialState.deletedMessageReferenceIds, []);
assert.deepEqual(initialState.bannedSessionAuthorKeys, []);

const normalized = normalization.normalizeCommentTranslatorLiveMessages({
  state: initialState,
  providerPayloads: [
    {
      id: "yt-text-1",
      snippet: {
        type: "textMessageEvent",
        publishedAt: "2026-06-15T00:00:01.000Z",
        displayMessage: "こんにちは",
        textMessageDetails: { messageText: "こんにちは" }
      },
      authorDetails: {
        displayName: "  F8 Viewer  ",
        channelId: "author-channel-id-never-output",
        channelUrl: "https://youtube.example/author-never-output",
        profileImageUrl: "https://images.example/profile-never-output.png",
        isChatOwner: false,
        isChatModerator: false,
        isChatSponsor: false
      }
    },
    {
      id: "yt-super-chat-1",
      snippet: {
        type: "superChatEvent",
        publishedAt: "2026-06-15T00:00:02.000Z",
        displayMessage: "Super Chat message",
        superChatDetails: {
          userComment: "応援しています",
          amountDisplayString: "JPY 500",
          tier: 2
        }
      },
      authorDetails: {
        displayName: "F8 Supporter",
        channelId: "super-chat-author-never-output",
        profileImageUrl: "https://images.example/super-chat-never-output.png",
        isChatSponsor: true
      }
    },
    {
      id: "yt-super-sticker-1",
      snippet: {
        type: "superStickerEvent",
        publishedAt: "2026-06-15T00:00:03.000Z",
        displayMessage: "Super Sticker",
        superStickerDetails: {
          superStickerMetadata: { altText: "Nice sticker" },
          amountDisplayString: "JPY 200",
          tier: 1
        }
      }
    },
    {
      id: "yt-member-1",
      snippet: {
        type: "memberMilestoneChatEvent",
        publishedAt: "2026-06-15T00:00:04.000Z",
        displayMessage: "Member for 3 months",
        memberMilestoneChatDetails: {
          userComment: "これからも見ます",
          memberMonth: 3
        }
      },
      authorDetails: { isChatSponsor: true }
    },
    {
      id: "yt-system-1",
      snippet: {
        type: "newSponsorEvent",
        publishedAt: "2026-06-15T00:00:05.000Z",
        displayMessage: "New member"
      }
    },
    {
      id: "yt-delete-1",
      snippet: {
        type: "messageDeletedEvent",
        publishedAt: "2026-06-15T00:00:06.000Z",
        messageDeletedDetails: { deletedMessageId: "yt-text-1" }
      }
    },
    {
      id: "yt-ban-1",
      snippet: {
        type: "userBannedEvent",
        publishedAt: "2026-06-15T00:00:07.000Z",
        userBannedDetails: {
          banType: "permanent"
        }
      },
      authorDetails: {
        channelId: "banned-author-channel-never-output",
        channelUrl: "https://youtube.example/banned-never-output",
        profileImageUrl: "https://images.example/banned-never-output.png"
      }
    },
    {
      id: "yt-ended-1",
      snippet: {
        type: "liveChatEndedEvent",
        publishedAt: "2026-06-15T00:00:08.000Z"
      }
    },
    {
      id: "yt-text-1",
      snippet: {
        type: "textMessageEvent",
        publishedAt: "2026-06-15T00:00:09.000Z",
        textMessageDetails: { messageText: "duplicate should not reappear" }
      }
    }
  ]
});

assert.equal(normalized.status, "normalized");
assert.equal(normalized.normalizedMessages.length, 8);
assert.equal(normalized.duplicateMessageReferenceIds.length, 1);
assert.equal(normalized.duplicateMessageReferenceIds[0], "yt-text-1");
assert.equal(normalized.sanitizedSummary.receivedProviderItemCount, 9);
assert.equal(normalized.sanitizedSummary.normalizedMessageCount, 8);
assert.equal(normalized.sanitizedSummary.duplicateMessageCount, 1);
assert.equal(normalized.sanitizedSummary.deletedMessageCount, 1);
assert.equal(normalized.sanitizedSummary.bannedEventCount, 1);
assert.equal(normalized.sanitizedSummary.endedEventCount, 1);
assert.equal(normalized.sanitizedSummary.rawProviderPayload, "not-returned-by-design");
assert.equal(normalized.sanitizedSummary.authorChannelMaterial, "not-returned-by-design");
assert.equal(normalized.nextState.seenMessageReferenceIds.includes("yt-text-1"), true);
assert.equal(normalized.nextState.deletedMessageReferenceIds.includes("yt-text-1"), true);

const byKind = new Map(normalized.normalizedMessages.map((message) => [message.kind, message]));
assert.equal(byKind.get("text").text, "こんにちは");
assert.equal(byKind.get("text").authorDisplayName, "F8 Viewer");
assert.equal(byKind.get("super-chat").purchase.kind, "super-chat");
assert.equal(byKind.get("super-chat").authorDisplayName, "F8 Supporter");
assert.equal(byKind.get("super-chat").purchase.amountDisplayString, "JPY 500");
assert.equal(byKind.get("super-sticker").purchase.kind, "super-sticker");
assert.equal(byKind.get("super-sticker").text, "Nice sticker");
assert.equal(byKind.get("member").member.monthCount, 3);
assert.equal(byKind.get("system").system.subtype, "new-sponsor");
assert.equal(byKind.get("deleted").targetMessageReferenceId, "yt-text-1");
assert.equal(byKind.get("banned").moderation.historyUpdateStrategy, "p1-defer-author-key-unavailable");
assert.equal(byKind.get("ended").terminalSignal, "stream-ended");

const browserRows = normalization.projectCommentTranslatorNormalizedLiveMessagesForBrowser(normalized.normalizedMessages);
assert.equal(browserRows.length, 8);
assert.equal(browserRows.every((row) => row.provider === "youtube"), true);
assert.equal(browserRows.find((row) => row.kind === "text").authorDisplayName, "F8 Viewer");
assert.equal(browserRows.find((row) => row.kind === "super-chat").authorDisplayName, "F8 Supporter");
assert.equal(browserRows.every((row) => row.rawProviderPayload === "not-returned-by-design"), true);
assert.equal(browserRows.every((row) => row.authorChannelMaterial === "not-returned-by-design"), true);
assert.equal(browserRows.find((row) => row.kind === "deleted").text, null);
assert.equal(browserRows.find((row) => row.kind === "banned").moderationLabel, "banned");
assert.equal(browserRows.find((row) => row.kind === "ended").moderationLabel, "ended");

for (const payload of [normalized, browserRows]) {
  const serialized = JSON.stringify(payload);
  assert.doesNotMatch(serialized, /author-channel-id-never-output|super-chat-author-never-output|banned-author-channel-never-output/i);
  assert.doesNotMatch(serialized, /youtube\.example\/author-never-output|profile-never-output|super-chat-never-output|banned-never-output/i);
  assert.doesNotMatch(serialized, /access_token|refresh_token|authorization_code|Authorization|service_role/i);
  assert.doesNotMatch(serialized, /liveChatId|providerChannelId|ownerUserId|nextPageToken/i);
}

for (const source of [
  normalizationSource,
  readinessDoc,
  gapAudit,
  taskSource
]) {
  assert.doesNotMatch(
    source,
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+/i,
    "F8 inspected source excludes secret values, token values, authorization values, and private provider identifiers"
  );
}

const allowedChangedFiles = new Set([
  normalizationPath,
  "lib/comment-translator-real-comments-feed-shared.ts",
  "lib/comment-translator-real-comments-ui-wiring.ts",
  "lib/comment-translator-youtube-input-boundary.ts",
  "lib/comment-translator-youtube-runtime-foundation.ts",
  "lib/comment-translator-youtube-live-provider-runtime-adapter.ts",
  "lib/comment-translator-youtube-live-comment-intake-pipeline.ts",
  "components/comment-translator/CommentTranslatorDock.tsx",
  readinessDocPath,
  gapAuditPath,
  "scripts/comment-translator-live-message-normalization-contract.mjs",
  "scripts/comment-translator-preview-author-display-name-contract.mjs",
  "scripts/comment-translator-real-comments-ui-wiring-contract.mjs",
  "scripts/comment-translator-ui-live-provider-runtime-contract.mjs",
  "scripts/comment-translator-youtube-input-boundary-contract.mjs",
  "scripts/comment-translator-youtube-runtime-foundation-contract.mjs",
  "scripts/comment-translator-youtube-live-comment-intake-pipeline-contract.mjs",
  "scripts/comment-translator-youtube-api-adapter-token-reference-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-feed-bridge-session-persistence-contract.mjs",
  "scripts/comment-translator-public-preview-feed-ux-contract.mjs",
  taskPath
]);
for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `F8 change stays in allowed files: ${file}`);
}

console.log("comment translator live message normalization contract checks passed");
