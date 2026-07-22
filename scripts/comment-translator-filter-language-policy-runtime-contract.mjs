import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const policyPath = "lib/comment-translator-language-policy-runtime.ts";
const bridgePath = "lib/comment-translator-youtube-live-comment-intake-pipeline.ts";
const requirementsPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_RELEASE_REQUIREMENTS.md";
const taskPath = "task.md";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function changedFiles() {
  const committedDiff = execSync("git diff --name-only archive/comment-translator-preview-2026-07-21...HEAD", {
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

assert.ok(exists(policyPath), "server-only filtering and language policy runtime exists");
assert.ok(exists(bridgePath), "live comment intake pipeline remains available");
assert.ok(exists(requirementsPath), "canonical public release requirements remain available");

const policySource = read(policyPath);
const bridgeSource = read(bridgePath);
const requirementsSource = read(requirementsPath);
const taskSource = read(taskPath);

assert.match(policySource, /^import "server-only";/m, "language policy runtime is server-only");
assert.match(bridgeSource, /comment-translator-language-policy-runtime/, "intake pipeline uses the language policy runtime before provider requests");
assert.match(requirementsSource, /Initial candidates are JA \/ EN \/ KR \/ CN/, "requirements retain initial source language candidates");
assert.match(requirementsSource, /Initial candidates are JA \/ EN/, "requirements retain initial target language candidates");
assert.match(requirementsSource, /Spanish and all-language auto mode out of the initial release/, "requirements retain initial release exclusions");

for (const source of [policySource, bridgeSource]) {
  assert.doesNotMatch(
    source,
    /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY|ownerUserIdValue:\s*["'][^"']+|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+/i,
    "Task 9 sources do not contain token values, auth code values, authorization header values, private keys, owner id values, or provider target values"
  );
  assert.doesNotMatch(
    source,
    /localStorage\.|indexedDB\.|sessionStorage\.|youtube\.googleapis|OAuth2Client|GoogleAuth|from\s+["']googleapis["']|require\(["']googleapis["']\)|stripe|checkout|billingPortal|priceId/i,
    "Task 9 policy avoids browser storage, live provider execution, and billing enforcement"
  );
}

const policy = loadTsModule(policyPath);
const bridge = loadTsModule(bridgePath);

assert.deepEqual(policy.commentTranslatorLanguagePolicyRuntimeContract.initialSourceCandidates, ["JA", "EN", "KR", "CN"]);
assert.deepEqual(policy.commentTranslatorLanguagePolicyRuntimeContract.initialTargetCandidates, ["JA", "EN"]);
assert.equal(policy.commentTranslatorLanguagePolicyRuntimeContract.spanishInitialRelease, "excluded-unless-explicitly-approved");
assert.equal(policy.commentTranslatorLanguagePolicyRuntimeContract.allLanguageAutoMode, "excluded-unless-explicitly-approved");
assert.equal(policy.commentTranslatorLanguagePolicyRuntimeContract.sameLanguageSelection, "server-policy-rejected");
assert.deepEqual(policy.commentTranslatorLanguagePolicyRuntimeContract.skipReasons, [
  "emoji-only",
  "url-only",
  "symbol-only",
  "duplicate",
  "too-short",
  "target-language",
  "unselected-source-language",
  "low-confidence"
]);
assert.deepEqual(policy.commentTranslatorLanguagePolicyRuntimeContract.cacheDedupeExcludedMaterial, [
  "oauth-token-value",
  "refresh-token-value",
  "authorization-code-value",
  "provider-target-identifier",
  "polling-cursor",
  "owner-identifier",
  "authorization-header-value",
  "service-role-key-value",
  "browser-local-handoff-material",
  "liveChatId-value",
  "provider-channel-id-value",
  "raw-provider-target-metadata"
]);

const validSelection = policy.validateCommentTranslatorLanguagePolicySelection({
  sourceLanguages: ["EN", "KR", "CN"],
  targetLanguage: "JA"
});
assert.equal(validSelection.status, "ready");
assert.deepEqual(validSelection.sourceLanguages.map((entry) => entry.publicCode), ["EN", "KR", "CN"]);
assert.deepEqual(validSelection.sourceLanguages.map((entry) => entry.providerLanguageCode), ["en", "ko", "zh"]);
assert.equal(validSelection.targetLanguage.publicCode, "JA");
assert.equal(validSelection.targetLanguage.providerLanguageCode, "ja");

assert.deepEqual(
  policy.validateCommentTranslatorLanguagePolicySelection({
    sourceLanguages: ["JA"],
    targetLanguage: "JA"
  }),
  {
    status: "rejected",
    reason: "same-language-selection",
    clientReadableDetail: "source-target-language-pair-not-allowed"
  },
  "server policy rejects same source/target language"
);

assert.deepEqual(
  policy.validateCommentTranslatorLanguagePolicySelection({
    sourceLanguages: ["AUTO"],
    targetLanguage: "JA"
  }),
  {
    status: "rejected",
    reason: "all-language-auto-mode-excluded",
    clientReadableDetail: "all-language-auto-mode-not-initial-release"
  },
  "server policy rejects all-language auto mode"
);

assert.deepEqual(
  policy.validateCommentTranslatorLanguagePolicySelection({
    sourceLanguages: ["ES"],
    targetLanguage: "JA"
  }),
  {
    status: "rejected",
    reason: "unsupported-source-language",
    clientReadableDetail: "source-language-not-initial-release"
  },
  "server policy keeps Spanish out of the initial release"
);

const eligibility = policy.evaluateCommentTranslatorLanguagePolicy({
  sourceLanguages: ["EN", "KR", "CN"],
  targetLanguage: "JA",
  comments: [
    { commentId: "accept-en", text: "Hello live chat, this is useful context", platformLanguageHint: "en" },
    { commentId: "skip-emoji", text: "😊✨😊", platformLanguageHint: null },
    { commentId: "skip-url", text: "https://example.test/path?x=1", platformLanguageHint: "en" },
    { commentId: "skip-symbol", text: "!!! ??? ---", platformLanguageHint: null },
    { commentId: "skip-duplicate", text: "Hello live chat, this is useful context", platformLanguageHint: "en" },
    { commentId: "skip-short", text: "hi", platformLanguageHint: "en" },
    { commentId: "skip-target", text: "今日は配信を見ています", platformLanguageHint: "ja" },
    { commentId: "skip-unselected", text: "Gracias por el stream y por la musica", platformLanguageHint: "es" },
    { commentId: "skip-low-confidence", text: "Hello 今日は live 配信 thanks ありがとう", platformLanguageHint: null },
    { commentId: "accept-mixed-dominant", text: "Hello stream this boss fight is intense 今日は", platformLanguageHint: null },
    { commentId: "accept-kr", text: "오늘 방송도 정말 재미있어요 stream", platformLanguageHint: null }
  ]
});

assert.equal(eligibility.status, "ready");
assert.equal(eligibility.acceptedComments.length, 3);
assert.deepEqual(
  eligibility.acceptedComments.map((comment) => [comment.commentId, comment.detectedLanguage.publicCode, comment.detectedLanguage.classification]),
  [
    ["accept-en", "EN", "single"],
    ["accept-mixed-dominant", "EN", "mixed-dominant"],
    ["accept-kr", "KR", "mixed-dominant"]
  ],
  "accepted comments carry dominant source language classification"
);
assert.deepEqual(
  eligibility.skippedComments.map((comment) => [comment.commentId, comment.reason]),
  [
    ["skip-emoji", "emoji-only"],
    ["skip-url", "url-only"],
    ["skip-symbol", "symbol-only"],
    ["skip-duplicate", "duplicate"],
    ["skip-short", "too-short"],
    ["skip-target", "target-language"],
    ["skip-unselected", "unselected-source-language"],
    ["skip-low-confidence", "low-confidence"]
  ],
  "policy skips all Task 9 pre-translation cost-control cases"
);
assert.equal(eligibility.sanitizedSummary.acceptedCommentCount, 3);
assert.equal(eligibility.sanitizedSummary.skippedCommentCount, 8);
assert.equal(eligibility.sanitizedSummary.rawCommentText, "never-returned-by-design");
assert.equal(eligibility.sanitizedSummary.providerTargetMetadata, "forbidden");
assert.doesNotMatch(
  JSON.stringify(eligibility),
  /Hello live chat|今日は配信|Gracias|oauth|refresh|ownerUserId|providerChannelId|liveChatId|Authorization|service_role/i,
  "policy result is metadata-only and excludes raw comments plus sensitive identifiers"
);

const firstKey = policy.createCommentTranslatorLanguagePolicyDedupeKey({
  text: "Hello live chat, this is useful context",
  sourceLanguage: "EN",
  targetLanguage: "JA",
  policyVersion: "language-policy-v1"
});
const secondKey = policy.createCommentTranslatorLanguagePolicyDedupeKey({
  text: " hello LIVE chat, this is useful context ",
  sourceLanguage: "en",
  targetLanguage: "ja",
  policyVersion: "language-policy-v1"
});
assert.equal(firstKey, secondKey, "dedupe key is stable across case and whitespace normalization");
assert.doesNotMatch(
  firstKey,
  /oauth|refresh|cursor|owner|channel|liveChatId|Authorization|service_role|provider-target|Hello/i,
  "dedupe key excludes credentials, provider identifiers, cursors, owner identifiers, and raw text"
);

const bridgeResult = bridge.createYouTubeLiveCommentTranslatorPipelineRequests({
  targetLanguage: "ja",
  sourceLanguages: ["EN", "KR", "CN"],
  pollingResult: {
    state: {
      liveChatId: "live-chat-id-must-not-cross",
      nextPageToken: "next-page-token-must-not-cross",
      retryCount: 0,
      nextPollAfterMs: 1_000,
      terminal: null
    },
    comments: [
      {
        commentId: "comment-accepted",
        publishedAt: "2026-06-10T00:00:00.000Z",
        text: "Hello live chat, this is useful context",
        platformLanguageHint: "en"
      },
      {
        commentId: "comment-target",
        publishedAt: "2026-06-10T00:00:01.000Z",
        text: "今日は配信を見ています",
        platformLanguageHint: "ja"
      },
      {
        commentId: "comment-duplicate",
        publishedAt: "2026-06-10T00:00:02.000Z",
        text: "Hello live chat, this is useful context",
        platformLanguageHint: "en"
      }
    ]
  }
});
assert.equal(bridgeResult.status, "ready-for-translator-pipeline");
assert.equal(bridgeResult.providerRequestCount, 1, "intake pipeline calls provider only for eligible comments");
assert.equal(bridgeResult.skippedCommentCount, 2, "intake pipeline reports policy skips");
assert.equal(bridgeResult.providerRequests[0].input.sourceLanguage, "en");
assert.equal(bridgeResult.providerRequests[0].input.targetLanguage, "ja");
assert.deepEqual(bridgeResult.providerRequests[0].cache.keyMaterial.excludes, [
  "authorName",
  "channelId",
  "viewerId",
  "streamId",
  "rawSecret",
  "oauthToken",
  "refreshToken",
  "authorizationCode",
  "providerTargetIdentifier",
  "pollingCursor",
  "ownerIdentifier",
  "authorizationHeader",
  "serviceRoleKey",
  "browserLocalHandoffMaterial",
  "liveChatId",
  "providerChannelId",
  "rawProviderTargetMetadata"
]);
assert.doesNotMatch(
  bridgeResult.providerRequests[0].cache.lookupKey,
  /live-chat-id-must-not-cross|next-page-token-must-not-cross|owner|channel|Authorization|service_role|Hello live chat/i,
  "provider cache lookup key excludes provider targets, cursors, owner/channel identifiers, auth material, and raw text"
);

const rejectedBridgeResult = bridge.createYouTubeLiveCommentTranslatorPipelineRequests({
  targetLanguage: "ja",
  sourceLanguages: ["JA"],
  pollingResult: {
    state: {
      liveChatId: "live-chat-id-must-not-cross",
      nextPageToken: null,
      retryCount: 0,
      nextPollAfterMs: 1_000,
      terminal: null
    },
    comments: [
      {
        commentId: "comment-rejected-selection",
        publishedAt: "2026-06-10T00:00:00.000Z",
        text: "今日は配信を見ています",
        platformLanguageHint: "ja"
      }
    ]
  }
});
assert.equal(rejectedBridgeResult.status, "language-policy-rejected");
assert.equal(rejectedBridgeResult.providerRequestCount, 0);
assert.equal(rejectedBridgeResult.skippedCommentCount, 1);

assert.match(taskSource, /Public Release Roadmap Task 9/i, "task.md records Task 9 completion work");
assert.match(taskSource, /width verification: UI \/ rendered text \/ CSS は変更していない/i, "task.md records width-check skip reason for this non-UI slice");

const allowedChangedFiles = new Set([
  "lib/comment-translator-provider-boundary.ts",
  policyPath,
  bridgePath,
  "scripts/comment-translator-filter-language-policy-runtime-contract.mjs",
  "scripts/comment-translator-provider-boundary-contract.mjs",
  "scripts/comment-translator-youtube-live-comment-intake-pipeline-contract.mjs",
  taskPath
]);
for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `Task 9 changes stay focused: ${file}`);
  const source = read(file);
  assert.doesNotMatch(
    source,
    /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY/i,
    `${file} does not contain OAuth token values, authorization codes, authorization header values, private keys, or service role key values`
  );
}

console.log("comment translator filtering/language policy runtime contract checks passed");
