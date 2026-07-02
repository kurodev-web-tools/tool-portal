import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { createRequire } from "node:module";

const root = process.cwd();
const require = createRequire(import.meta.url);
const moduleCache = new Map();

const policyPath = "lib/comment-translator-language-policy-runtime.ts";
const bridgePath = "lib/comment-translator-youtube-live-comment-intake-pipeline.ts";
const dockPath = "components/comment-translator/CommentTranslatorDock.tsx";
const actionsPath = "app/tools/comment-translator/actions.ts";
const routePath = "app/api/comment-translator/session/route.ts";
const orchestrationPath = "lib/comment-translator-live-provider-session-step.ts";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
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

function assertSourceMatches(source, pattern, message) {
  if (!pattern.test(source)) {
    assert.fail(message);
  }
}

const policy = loadTsModule(policyPath);
const bridge = loadTsModule(bridgePath);
const dockSource = read(dockPath);
const actionsSource = read(actionsPath);
const routeSource = read(routePath);
const orchestrationSource = read(orchestrationPath);

const selection = policy.validateCommentTranslatorLanguagePolicySelection({
  sourceLanguages: ["ja"],
  targetLanguage: "en"
});
assert.equal(selection.status, "ready", "JA source to EN target is a supported public beta pair");
assert.deepEqual(
  selection.sourceLanguages.map((entry) => [entry.publicCode, entry.providerLanguageCode]),
  [["JA", "ja"]],
  "JA source selection reaches provider-language normalization"
);
assert.deepEqual(
  [selection.targetLanguage.publicCode, selection.targetLanguage.providerLanguageCode],
  ["EN", "en"],
  "EN target selection reaches provider-language normalization"
);

const eligibility = policy.evaluateCommentTranslatorLanguagePolicy({
  sourceLanguages: ["ja"],
  targetLanguage: "en",
  comments: [
    { commentId: "accepted-ja", text: "あいうえおカキクケコ", platformLanguageHint: "ja" },
    { commentId: "skipped-en", text: "alpha beta gamma delta", platformLanguageHint: "en" }
  ]
});
assert.equal(eligibility.status, "ready", "JA to EN policy evaluation stays ready");
assert.deepEqual(
  eligibility.acceptedComments.map((comment) => [
    comment.commentId,
    comment.detectedLanguage.publicCode,
    comment.targetLanguage.publicCode
  ]),
  [["accepted-ja", "JA", "EN"]],
  "JA comments are eligible and EN comments are not translated when target is EN"
);
assert.deepEqual(
  eligibility.skippedComments.map((comment) => [comment.commentId, comment.reason]),
  [["skipped-en", "target-language"]],
  "target-language comments are skipped without rejecting the entire JA to EN selection"
);

const bridgeResult = bridge.createYouTubeLiveCommentTranslatorPipelineRequests({
  targetLanguage: "en",
  sourceLanguages: ["ja"],
  pollingResult: {
    state: {
      liveChatId: "redacted",
      nextPageToken: "redacted",
      retryCount: 0,
      nextPollAfterMs: 1_000,
      terminal: null
    },
    comments: [
      {
        commentId: "bridge-ja",
        publishedAt: "2026-07-02T00:00:00.000Z",
        text: "あいうえおカキクケコ",
        platformLanguageHint: "ja"
      },
      {
        commentId: "bridge-en",
        publishedAt: "2026-07-02T00:00:01.000Z",
        text: "alpha beta gamma delta",
        platformLanguageHint: "en"
      }
    ]
  }
});
assert.equal(bridgeResult.status, "ready-for-translator-pipeline", "JA to EN intake does not reject the batch");
assert.equal(bridgeResult.providerRequestCount, 1, "only the JA source comment becomes a provider request");
assert.equal(bridgeResult.providerRequests[0].input.sourceLanguage, "ja");
assert.equal(bridgeResult.providerRequests[0].input.targetLanguage, "en");

const koreanChineseToEnglishSelection = policy.validateCommentTranslatorLanguagePolicySelection({
  sourceLanguages: ["ko", "zh"],
  targetLanguage: "en"
});
assert.equal(
  koreanChineseToEnglishSelection.status,
  "ready",
  "KR/CN source to EN target remains a supported public beta pair"
);
assert.deepEqual(
  koreanChineseToEnglishSelection.sourceLanguages.map((entry) => [entry.publicCode, entry.providerLanguageCode]),
  [
    ["KR", "ko"],
    ["CN", "zh"]
  ],
  "KR/CN source selections reach provider-language normalization"
);

const koreanChineseToEnglishBridgeResult = bridge.createYouTubeLiveCommentTranslatorPipelineRequests({
  targetLanguage: "en",
  sourceLanguages: ["ko", "zh"],
  pollingResult: {
    state: {
      liveChatId: "redacted",
      nextPageToken: "redacted",
      retryCount: 0,
      nextPollAfterMs: 1_000,
      terminal: null
    },
    comments: [
      {
        commentId: "bridge-kr",
        publishedAt: "2026-07-02T00:00:00.000Z",
        text: "가나다라마 바사아자",
        platformLanguageHint: "ko"
      },
      {
        commentId: "bridge-cn",
        publishedAt: "2026-07-02T00:00:01.000Z",
        text: "直播画面字幕確認",
        platformLanguageHint: "zh"
      },
      {
        commentId: "bridge-target-en",
        publishedAt: "2026-07-02T00:00:02.000Z",
        text: "alpha beta gamma delta",
        platformLanguageHint: "en"
      }
    ]
  }
});
assert.equal(
  koreanChineseToEnglishBridgeResult.status,
  "ready-for-translator-pipeline",
  "KR/CN to EN intake does not reject the batch"
);
assert.equal(
  koreanChineseToEnglishBridgeResult.providerRequestCount,
  2,
  "KR and CN source comments become EN provider requests"
);
assert.deepEqual(
  koreanChineseToEnglishBridgeResult.providerRequests.map((request) => [
    request.input.sourceLanguage,
    request.input.targetLanguage
  ]),
  [
    ["ko", "en"],
    ["zh", "en"]
  ],
  "KR/CN provider requests keep the EN target"
);

for (const actionName of [
  "startCommentTranslatorSessionAction",
  "heartbeatCommentTranslatorSessionAction",
  "getCommentTranslatorSessionStatusAction",
  "restoreCommentTranslatorPersistedRealCommentsFeedAction",
  "getCommentTranslatorRealCommentsFeedAction"
]) {
  assert.ok(
    dockSource.includes(`${actionName}({ sourceLanguage, targetLanguage })`),
    `${actionName} receives the selected source and target language from the dock`
  );
}
assertSourceMatches(
  dockSource,
  /\[copy\.operatorSession\.actionFailed, sourceLanguage, startSessionTransition, targetLanguage\]/,
  "active-session restore reruns when the selected source language changes"
);
assertSourceMatches(
  dockSource,
  /\[locale, sessionState\.status, sourceLanguage, targetLanguage\]/,
  "manual and auto feed refresh reruns with the selected source language"
);

assertSourceMatches(
  actionsSource,
  /import type \{ CommentTranslatorSourceLanguageId, CommentTranslatorTargetLanguageId \} from "@\/lib\/comment-translator"/,
  "server actions type the source language option at the boundary"
);
assertSourceMatches(
  actionsSource,
  /type CommentTranslatorSessionLanguageActionOptions = \{[\s\S]*sourceLanguage\?: CommentTranslatorSourceLanguageId;[\s\S]*targetLanguage\?: CommentTranslatorTargetLanguageId;[\s\S]*\};/,
  "server actions accept source and target language options together"
);
assertSourceMatches(
  actionsSource,
  /sourceLanguages: createCommentTranslatorActionSourceLanguages\(sourceLanguage\)/,
  "session heartbeat passes source languages to the live provider session step"
);
assertSourceMatches(
  actionsSource,
  /sourceLanguages: createCommentTranslatorActionSourceLanguages\(options\.sourceLanguage\)/,
  "feed refresh passes source languages to the live provider session step"
);

assertSourceMatches(routeSource, /sourceLanguage\?: unknown;/, "route command parses a source language field");
assertSourceMatches(routeSource, /sourceLanguage: formData\.get\("sourceLanguage"\)/, "route accepts source language from form posts");
assertSourceMatches(
  routeSource,
  /const sourceLanguage = normalizeSessionCommandSourceLanguage\(body\.sourceLanguage\)/,
  "route normalizes source language before command execution"
);
assertSourceMatches(
  routeSource,
  /sourceLanguages: command\.sourceLanguage \? \[command\.sourceLanguage\] : undefined/,
  "route heartbeat passes selected source language into live provider execution"
);

assertSourceMatches(
  orchestrationSource,
  /sourceLanguages\?: readonly string\[\];/,
  "live provider session step accepts selected source languages"
);
assertSourceMatches(
  orchestrationSource,
  /executeCommentTranslatorAzureNormalTranslationForNormalizedMessages\(\{[\s\S]*targetLanguage,[\s\S]*sourceLanguages,/,
  "live provider session step forwards selected source languages into translation execution"
);

console.log("comment translator JA to EN source wiring contract checks passed");
