import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const bridgePath = "lib/comment-translator-youtube-live-comment-intake-pipeline.ts";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function changedFiles() {
  try {
    const committedDiff = execSync("git diff --name-only origin/codex/comment-translator-preview...HEAD", {
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

    return [...new Set([...committedDiff, ...untracked])].map((file) => file.replace(/\\/g, "/"));
  } catch {
    return [];
  }
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

assert.ok(exists(bridgePath), "server-only live comment intake pipeline bridge exists");

const bridgeSource = read(bridgePath);
const providerBoundarySource = read("lib/comment-translator-provider-boundary.ts");
const pollingFoundationSource = read("lib/comment-translator-youtube-live-chat-polling-smoke-foundation.ts");
const componentSource = read("components/comment-translator/CommentTranslatorDock.tsx");
const routeSource = read("app/tools/comment-translator/page.tsx");
const taskSource = read("task.md");

assert.match(bridgeSource, /^import "server-only";/m, "live comment intake pipeline bridge is server-only");
assert.match(bridgeSource, /CommentTranslationProviderRequest/, "bridge targets the translator provider request contract");
assert.match(bridgeSource, /YouTubeLiveChatPollingStepResult/, "bridge consumes sanitized polling step results");
assert.match(providerBoundarySource, /CommentTranslationInputKind = "manual-preview" \| "live-comment" \| "fixture-replay"/, "provider boundary already owns live-comment input kind");
assert.match(pollingFoundationSource, /translatorPipelineWiring:\s*"not-implemented"/, "polling smoke foundation remains one-step smoke-only");

for (const forbidden of [
  "localStorage",
  "indexedDB",
  "sessionStorage",
  "OAuth2Client",
  "GoogleAuth",
  "refresh_token",
  "access_token",
  "SUPABASE_SERVICE_ROLE_KEY",
  "setInterval",
  "setTimeout"
]) {
  assert.doesNotMatch(bridgeSource, new RegExp(forbidden, "i"), `bridge does not add ${forbidden} coupling`);
}
assert.doesNotMatch(bridgeSource, /from\s+["']googleapis["']|require\(["']googleapis["']\)/, "bridge does not import googleapis");
assert.doesNotMatch(bridgeSource, /fetch\s*\(|XMLHttpRequest|EventSource|WebSocket/, "bridge does not add provider polling transport");
assert.doesNotMatch(bridgeSource, /createClient|\.from\(|insert\s*\(|upsert\s*\(|update\s*\(/, "bridge does not write Supabase or quota state");
assert.doesNotMatch(
  `${componentSource}\n${routeSource}`,
  /comment-translator-youtube-live-comment-intake-pipeline/,
  "UI and route shell are not rewired to the server-only bridge"
);

const bridge = loadTsModule(bridgePath);

for (const exportedName of [
  "youtubeLiveCommentIntakePipelineContract",
  "createYouTubeLiveCommentTranslatorPipelineRequests",
  "runYouTubeLiveCommentTranslatorPipeline"
]) {
  assert.equal(
    typeof bridge[exportedName],
    exportedName.startsWith("create") || exportedName.startsWith("run") ? "function" : "object",
    `bridge exports ${exportedName}`
  );
}

assert.deepEqual(
  bridge.youtubeLiveCommentIntakePipelineContract,
  {
    implementationStage: "live-comment-intake-to-translator-pipeline",
    source: "youtube-live-chat-polling-step-result",
    inputBoundary: "youtube-provider-safe-comment-payload-only",
    translatorInputKind: "live-comment",
    serverOnlyDataFlow: "polling-result-to-injected-translator-provider",
    providerExecution: "injected-server-only-provider-only",
    providerTargetMetadata: "operator-local-server-only-consumed-never-returned",
    browserStorage: "unchanged",
    handoffPayload: "unchanged",
    uiRewiring: "not-implemented",
    pollingLoop: "not-implemented",
    quotaWrite: "not-implemented",
    remoteMutation: "not-implemented",
    abortBehavior: [
      "abort-terminal-polling-state-before-provider-call",
      "skip-empty-polling-result-before-provider-call",
      "skip-blank-comment-text-before-provider-call",
      "apply-filtering-language-policy-before-provider-call"
    ]
  },
  "bridge contract fixes server-only intake-to-translator boundary with Task 9 language policy gate"
);

const baseState = {
  liveChatId: "live-chat-id-must-not-cross",
  nextPageToken: "next-page-token-must-not-cross",
  retryCount: 0,
  nextPollAfterMs: 1_000,
  terminal: null
};

const requestOptions = {
  targetLanguage: "ja",
  glossaryTerms: ["Kuro"],
  glossaryVersion: "glossary-v1",
  providerCapabilityVersion: "provider-capability-v1",
  moderationPolicyVersion: "moderation-v1"
};

const terminalBridge = bridge.createYouTubeLiveCommentTranslatorPipelineRequests({
  ...requestOptions,
  pollingResult: {
    state: {
      ...baseState,
      terminal: {
        code: "liveChatEnded",
        stoppedAtMs: 2_000
      }
    },
    comments: [
      {
        commentId: "comment-terminal",
        publishedAt: "2026-06-10T00:00:00.000Z",
        text: "must-not-translate-terminal",
        platformLanguageHint: "en"
      }
    ]
  }
});
assert.equal(terminalBridge.status, "aborted-terminal-polling-state");
assert.deepEqual(terminalBridge.providerRequests, []);
assert.equal(terminalBridge.providerRequestCount, 0);

const emptyBridge = bridge.createYouTubeLiveCommentTranslatorPipelineRequests({
  ...requestOptions,
  pollingResult: {
    state: baseState,
    comments: []
  }
});
assert.equal(emptyBridge.status, "no-live-comments-to-translate");
assert.equal(emptyBridge.providerRequestCount, 0);

const readyBridge = bridge.createYouTubeLiveCommentTranslatorPipelineRequests({
  ...requestOptions,
  pollingResult: {
    state: baseState,
    comments: [
      {
        commentId: "comment-live-1",
        publishedAt: "2026-06-10T00:00:00.000Z",
        text: "Hello live chat",
        platformLanguageHint: "en",
        authorName: "must-not-cross",
        channelId: "must-not-cross",
        liveChatId: "must-not-cross"
      },
      {
        commentId: "comment-blank",
        publishedAt: "2026-06-10T00:00:01.000Z",
        text: "   ",
        platformLanguageHint: null,
        oauthAccessToken: "must-not-cross"
      },
      {
        commentId: "comment-live-2",
        publishedAt: "2026-06-10T00:00:02.000Z",
        text: "Gracias por el stream",
        platformLanguageHint: null,
        viewerIdentifier: "must-not-cross"
      }
    ]
  }
});
assert.equal(readyBridge.status, "ready-for-translator-pipeline");
assert.equal(readyBridge.providerRequestCount, 2);
assert.equal(readyBridge.skippedCommentCount, 1);
assert.deepEqual(
  readyBridge.sanitizedIntake,
  {
    acceptedCommentCount: 2,
    skippedCommentCount: 1,
    textPayload: "server-only-translator-provider-input",
    allowedCommentFields: ["commentId", "publishedAt", "text", "platformLanguageHint"],
    forbiddenMetadata: "not-returned-by-design"
  },
  "bridge reports sanitized intake counts without target metadata values"
);

for (const providerRequest of readyBridge.providerRequests) {
  assert.equal(providerRequest.input.kind, "live-comment", "provider request uses live-comment input kind");
  assert.equal(providerRequest.input.targetLanguage, "ja", "provider request carries target language");
  assert.equal(providerRequest.privacy.rawTextLogging, "disabled-by-default", "raw text logging stays disabled");
  assert.equal(providerRequest.privacy.piiMinimization, "exclude-author-and-channel-identifiers", "privacy boundary excludes author/channel identifiers");
  assert.equal(providerRequest.usageHandoff.enforcement, "not-implemented", "quota enforcement remains out of scope");
  assert.equal(providerRequest.usageHandoff.databaseWrite, "not-implemented", "quota database write remains out of scope");
  assert.deepEqual(providerRequest.cache.keyMaterial.excludes, [
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
}
assert.equal(readyBridge.providerRequests[0].input.sourceLanguage, "en");
assert.equal(readyBridge.providerRequests[1].input.sourceLanguage, "en");

let providerCallCount = 0;
const provider = {
  id: "contract-provider",
  name: "Contract provider",
  runtimeScope: "server-runtime-only",
  secretBoundary: {
    runtime: "server-env-only",
    clientBundle: "forbidden",
    fixtures: "forbidden",
    docsAndTaskNotes: "no-secret-values"
  },
  async translate(request) {
    providerCallCount += 1;
    return {
      type: "translated",
      translatedText: `[ja] ${request.input.text}`,
      detectedSourceLanguage: request.input.sourceLanguage === "auto" ? null : request.input.sourceLanguage,
      confidence: null,
      cacheOutcome: request.cache.lookupKey ? "miss" : "bypass",
      usageHandoff: request.usageHandoff
    };
  }
};

const translated = await bridge.runYouTubeLiveCommentTranslatorPipeline({
  ...requestOptions,
  provider,
  pollingResult: {
    state: baseState,
    comments: [
      {
        commentId: "comment-live-1",
        publishedAt: "2026-06-10T00:00:00.000Z",
        text: "Hello live chat",
        platformLanguageHint: "en",
        authorName: "must-not-cross"
      },
      {
        commentId: "comment-live-2",
        publishedAt: "2026-06-10T00:00:02.000Z",
        text: "Gracias por el stream",
        platformLanguageHint: null,
        channelId: "must-not-cross"
      }
    ]
  }
});
assert.equal(providerCallCount, 2, "bridge calls injected server-only provider once per accepted live comment");
assert.equal(translated.status, "translated-live-comment-intake");
assert.equal(translated.providerRequestCount, 2);
assert.equal(translated.providerResultCount, 2);
assert.equal(translated.browserStorage, "unchanged");
assert.equal(translated.handoffPayload, "unchanged");
assert.equal(translated.uiRewiring, "not-implemented");

const blockedProvider = await bridge.runYouTubeLiveCommentTranslatorPipeline({
  ...requestOptions,
  provider: {
    ...provider,
    runtimeScope: "client-runtime"
  },
  pollingResult: {
    state: baseState,
    comments: [
      {
        commentId: "comment-live-1",
        publishedAt: "2026-06-10T00:00:00.000Z",
        text: "Hello live chat",
        platformLanguageHint: "en"
      }
    ]
  }
});
assert.equal(blockedProvider.status, "blocked-non-server-translator-provider");
assert.equal(blockedProvider.providerRequestCount, 0);
assert.equal(blockedProvider.providerResultCount, 0);

for (const payload of [terminalBridge, emptyBridge, readyBridge, translated, blockedProvider]) {
  const serialized = JSON.stringify(payload);
  for (const forbiddenValue of [
    "live-chat-id-must-not-cross",
    "next-page-token-must-not-cross",
    "must-not-cross",
    "oauthAccessToken",
    "oauthRefreshToken",
    "ownerUserId",
    "serverAuthorizationHeader"
  ]) {
    assert.doesNotMatch(serialized, new RegExp(forbiddenValue, "i"), `bridge output does not include ${forbiddenValue}`);
  }
}

assert.match(
  taskSource,
  /Public Release Roadmap Task 9/i,
  "task.md records the Task 9 filtering/language policy slice"
);
assert.match(
  taskSource,
  /width verification: UI \/ rendered text \/ CSS は変更していない/i,
  "task.md records the width-check skip reason for this non-UI slice"
);

const allowedChangedFiles = new Set([
  "lib/comment-translator-language-policy-runtime.ts",
  "lib/comment-translator-provider-boundary.ts",
  bridgePath,
  "scripts/comment-translator-filter-language-policy-runtime-contract.mjs",
  "scripts/comment-translator-provider-boundary-contract.mjs",
  "scripts/comment-translator-youtube-live-comment-intake-pipeline-contract.mjs",
  "task.md"
]);
for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `Task 6 bridge changes stay focused: ${file}`);
  const source = read(file);
  assert.doesNotMatch(
    source,
    /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]/i,
    `${file} does not contain token or service role material`
  );
}

console.log("comment translator YouTube live comment intake pipeline contract checks passed");
