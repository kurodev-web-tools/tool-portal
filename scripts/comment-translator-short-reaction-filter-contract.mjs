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

const policy = loadTsModule(policyPath);
const bridge = loadTsModule(bridgePath);

function assertLowValueShortReactionsAreSkipped() {
  const result = policy.evaluateCommentTranslatorLanguagePolicy({
    sourceLanguages: ["ja", "ko", "zh"],
    targetLanguage: "en",
    comments: [
      { commentId: "ja-reaction", text: "ナイス！", platformLanguageHint: "ja" },
      { commentId: "kr-reaction", text: "ㅋㅋㅋ", platformLanguageHint: "ko" },
      { commentId: "cn-reaction", text: "謝謝。", platformLanguageHint: "zh" }
    ]
  });

  assert.equal(result.status, "ready", "source-to-target policy stays ready");
  assert.equal(result.acceptedComments.length, 0, "low-value short reactions do not become provider candidates");
  assert.deepEqual(
    result.skippedComments.map((comment) => [comment.commentId, comment.reason]),
    [
      ["ja-reaction", "low-value-short-reaction"],
      ["kr-reaction", "low-value-short-reaction"],
      ["cn-reaction", "low-value-short-reaction"]
    ],
    "low-value short reactions are skipped before language-provider handoff"
  );
}

function assertMeaningfulShortCommentsStayEligible() {
  const result = policy.evaluateCommentTranslatorLanguagePolicy({
    sourceLanguages: ["ja", "ko", "zh"],
    targetLanguage: "en",
    comments: [
      { commentId: "ja-question", text: "何してる？", platformLanguageHint: "ja" },
      { commentId: "kr-request", text: "도와줘", platformLanguageHint: "ko" },
      { commentId: "cn-warning", text: "小心！", platformLanguageHint: "zh" }
    ]
  });

  assert.equal(result.status, "ready", "source-to-target policy stays ready for short meaningful comments");
  assert.deepEqual(
    result.acceptedComments.map((comment) => [comment.commentId, comment.detectedLanguage.publicCode, comment.targetLanguage.publicCode]),
    [
      ["ja-question", "JA", "EN"],
      ["kr-request", "KR", "EN"],
      ["cn-warning", "CN", "EN"]
    ],
    "short questions, requests, and warnings remain translation-eligible"
  );
  assert.equal(result.skippedComments.length, 0, "meaningful short comments are not filtered as reactions");
}

function assertPunctuationOnlyVariantsSharePolicyDedupe() {
  const baseKey = policy.createCommentTranslatorLanguagePolicyDedupeKey({
    text: "配信確認",
    sourceLanguage: "ja",
    targetLanguage: "en",
    policyVersion: "short-reaction-filter-contract"
  });
  const punctuationKey = policy.createCommentTranslatorLanguagePolicyDedupeKey({
    text: "配信確認！！。",
    sourceLanguage: "ja",
    targetLanguage: "en",
    policyVersion: "short-reaction-filter-contract"
  });

  assert.equal(baseKey, punctuationKey, "punctuation-only variants share the policy dedupe key");
}

function assertPunctuationOnlyVariantsDoNotCreateExtraProviderRequests() {
  const result = bridge.createYouTubeLiveCommentTranslatorPipelineRequestsForComments({
    targetLanguage: "en",
    sourceLanguages: ["ja"],
    comments: [
      {
        commentId: "base-comment",
        publishedAt: "2026-07-02T00:00:00.000Z",
        text: "配信確認",
        platformLanguageHint: "ja"
      },
      {
        commentId: "punctuation-variant",
        publishedAt: "2026-07-02T00:00:01.000Z",
        text: "配信確認！！。",
        platformLanguageHint: "ja"
      }
    ]
  });

  assert.equal(result.status, "ready-for-translator-pipeline", "intake remains ready after punctuation-only dedupe");
  assert.equal(result.providerRequestCount, 1, "punctuation-only variants create one provider request");
  assert.equal(result.skippedCommentCount, 1, "punctuation-only variant is counted as a skipped duplicate");
}

function assertPunctuationOnlyVariantsShareProviderCacheKey() {
  const baseResult = bridge.createYouTubeLiveCommentTranslatorPipelineRequestsForComments({
    targetLanguage: "en",
    sourceLanguages: ["ja"],
    comments: [
      {
        commentId: "cache-base-comment",
        publishedAt: "2026-07-02T00:00:00.000Z",
        text: "配信確認",
        platformLanguageHint: "ja"
      }
    ]
  });
  const punctuationResult = bridge.createYouTubeLiveCommentTranslatorPipelineRequestsForComments({
    targetLanguage: "en",
    sourceLanguages: ["ja"],
    comments: [
      {
        commentId: "cache-punctuation-variant",
        publishedAt: "2026-07-02T00:00:01.000Z",
        text: "配信確認！！。",
        platformLanguageHint: "ja"
      }
    ]
  });

  assert.equal(baseResult.status, "ready-for-translator-pipeline", "base intake remains provider-ready");
  assert.equal(punctuationResult.status, "ready-for-translator-pipeline", "punctuation variant intake remains provider-ready");
  assert.equal(baseResult.providerRequestCount, 1, "base intake creates one provider request");
  assert.equal(punctuationResult.providerRequestCount, 1, "punctuation variant intake creates one provider request");
  assert.equal(
    baseResult.providerRequests[0].cache.lookupKey,
    punctuationResult.providerRequests[0].cache.lookupKey,
    "punctuation-only variants share provider cache lookup keys across polling batches"
  );
}

assertLowValueShortReactionsAreSkipped();
assertMeaningfulShortCommentsStayEligible();
assertPunctuationOnlyVariantsSharePolicyDedupe();
assertPunctuationOnlyVariantsDoNotCreateExtraProviderRequests();
assertPunctuationOnlyVariantsShareProviderCacheKey();

console.log(
  JSON.stringify({
    contract: "comment-translator-short-reaction-filter",
    pass: true,
    providerExecution: "not-run",
    rawCommentText: "synthetic-fixtures-only"
  })
);
