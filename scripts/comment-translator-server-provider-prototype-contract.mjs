import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();

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
  const compiled = ts.transpileModule(read(relativePath), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText;

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "server-only") {
      return {};
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    const testModule = new Module(sourcePath);
    testModule.filename = sourcePath;
    testModule.paths = Module._nodeModulePaths(path.dirname(sourcePath));
    testModule._compile(compiled, sourcePath);
    return testModule.exports;
  } finally {
    Module._load = originalLoad;
  }
}

assert.ok(
  exists("lib/comment-translator-deepl-provider.ts"),
  "server-side DeepL provider prototype module exists"
);

const providerSource = read("lib/comment-translator-deepl-provider.ts");
const boundarySource = read("lib/comment-translator-provider-boundary.ts");
const componentSource = read("components/comment-translator/CommentTranslatorDock.tsx");
const routeSource = read("app/tools/comment-translator/page.tsx");
const mockLibSource = read("lib/comment-translator.ts");

assert.match(providerSource, /^import "server-only";/m, "prototype provider is server-only");
assert.match(providerSource, /CommentTranslationProviderRequest/, "provider accepts the boundary request type");
assert.match(providerSource, /CommentTranslationProviderResult/, "provider returns the boundary result type");
assert.match(providerSource, /CommentTranslationUsageHandoff/, "provider uses the usage handoff type");
assert.match(providerSource, /DEEPL_AUTH_KEY/, "server env auth key name is fixed");
assert.match(providerSource, /DEEPL_API_BASE_URL/, "optional server env API base URL name is fixed");
assert.match(providerSource, /DEEPL_TIMEOUT_MS/, "optional server env timeout name is fixed");
assert.doesNotMatch(providerSource, /NEXT_PUBLIC_/, "prototype provider does not add a public secret env var");
assert.doesNotMatch(
  `${componentSource}\n${routeSource}\n${mockLibSource}`,
  /comment-translator-deepl-provider|DEEPL_AUTH_KEY|DeepL-Auth-Key|process\.env/,
  "client UI, route shell, and fixture mock do not import the server provider or credential boundary"
);

for (const pattern of [
  /localStorage/,
  /indexedDB/,
  /createClient/,
  /from\(["']usage_quotas["']\)/,
  /insert\s*\(/,
  /upsert\s*\(/,
  /update\s*\(/,
  /stripe|checkout|gtag|GA4|cookie consent/i,
  /liveChatMessages|youtube\.googleapis|oauth|owner verification|polling/i,
  /SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE/i,
  /NEXT_PUBLIC_DEEPL/i
]) {
  assert.doesNotMatch(providerSource, pattern, `provider prototype keeps out-of-scope boundary: ${pattern}`);
}

assert.match(
  boundarySource,
  /credential-missing/,
  "boundary keeps missing server credential as a terminal error code"
);

const prototype = loadTsModule("lib/comment-translator-deepl-provider.ts");

assert.equal(prototype.deeplCommentTranslationProviderId, "deepl-text-v2", "provider id is fixed");
assert.deepEqual(
  prototype.deeplCommentTranslationProviderEnv,
  {
    authKey: "DEEPL_AUTH_KEY",
    apiBaseUrl: "DEEPL_API_BASE_URL",
    timeoutMs: "DEEPL_TIMEOUT_MS"
  },
  "runtime env shape is explicit and server-only"
);
assert.equal(
  typeof prototype.readDeepLCommentTranslationProviderConfig,
  "function",
  "runtime env resolver is exported"
);
assert.equal(typeof prototype.createDeepLCommentTranslationProvider, "function", "provider factory is exported");

const resolvedConfig = prototype.readDeepLCommentTranslationProviderConfig({
  DEEPL_AUTH_KEY: "test-runtime-placeholder",
  DEEPL_API_BASE_URL: "https://api-free.deepl.com",
  DEEPL_TIMEOUT_MS: "2500"
});
assert.equal(resolvedConfig.authKey, "test-runtime-placeholder", "resolver reads the auth key from server env input");
assert.equal(resolvedConfig.apiBaseUrl, "https://api-free.deepl.com", "resolver reads the API base URL from server env input");
assert.equal(resolvedConfig.timeoutMs, 2500, "resolver reads the timeout from server env input");

function request(overrides = {}) {
  return {
    requestId: "contract-request-1",
    input: {
      kind: "manual-preview",
      text: "Hello from the contract",
      sourceLanguage: "auto",
      targetLanguage: "ja",
      ...(overrides.input ?? {})
    },
    glossary: {
      terms: [],
      version: null
    },
    cache: {
      lookupKey: null,
      keyMaterial: {
        normalizedTextHash: "hash-contract",
        sourceLanguage: "auto",
        targetLanguage: "ja",
        providerCapabilityVersion: "deepl-text-v2-prototype",
        glossaryVersion: null,
        moderationPolicyVersion: "comment-translator-preview-v1",
        excludes: ["authorName", "channelId", "viewerId", "streamId", "rawSecret"]
      }
    },
    privacy: {
      logRetention: "short-lived-only",
      rawTextLogging: "disabled-by-default",
      piiMinimization: "exclude-author-and-channel-identifiers",
      moderationSkipReason: null
    },
    usageHandoff: {
      meteringEventId: "usage-contract-1",
      providerId: "boundary-placeholder",
      billingCategory: "translation",
      estimatedUnits: 0,
      cacheOutcome: "miss",
      enforcement: "not-implemented",
      databaseWrite: "not-implemented",
      logPolicy: "short-lived-provider-diagnostic-only"
    }
  };
}

const missingCredentialProvider = prototype.createDeepLCommentTranslationProvider({
  authKey: "",
  fetchImpl: async () => {
    throw new Error("fetch must not run without credentials");
  }
});
assert.deepEqual(
  await missingCredentialProvider.translate(request()),
  {
    type: "terminal-error",
    code: "credential-missing",
    message: "DeepL provider is not configured in server runtime env.",
    retry: {
      retryable: false
    }
  },
  "missing credential is terminal and does not call the provider"
);

let capturedFetch = null;
const successProvider = prototype.createDeepLCommentTranslationProvider({
  authKey: "test-runtime-placeholder",
  fetchImpl: async (url, init) => {
    capturedFetch = { url, init };

    return {
      ok: true,
      status: 200,
      json: async () => ({
        translations: [
          {
            detected_source_language: "EN",
            text: "契約からこんにちは"
          }
        ],
        billed_characters: 23
      })
    };
  }
});

const success = await successProvider.translate(request());
assert.equal(success.type, "translated", "successful provider call returns a translated response");
assert.equal(success.translatedText, "契約からこんにちは", "provider maps translated text");
assert.equal(success.detectedSourceLanguage, "EN", "provider maps detected source language");
assert.equal(success.usageHandoff.providerId, "deepl-text-v2", "usage handoff uses the prototype provider id");
assert.equal(success.usageHandoff.estimatedUnits, 23, "usage handoff uses billed characters when available");
assert.equal(success.usageHandoff.databaseWrite, "not-implemented", "provider prototype does not write usage");
assert.equal(capturedFetch.url, "https://api-free.deepl.com/v2/translate", "provider calls the DeepL translate endpoint");
assert.equal(capturedFetch.init.method, "POST", "provider uses POST");
assert.equal(
  capturedFetch.init.headers.Authorization,
  "DeepL-Auth-Key test-runtime-placeholder",
  "provider passes credentials only through the server-side Authorization header"
);
assert.deepEqual(
  JSON.parse(capturedFetch.init.body),
  {
    text: ["Hello from the contract"],
    target_lang: "JA",
    show_billed_characters: true
  },
  "provider sends minimal text translation payload"
);

const rateLimitedProvider = prototype.createDeepLCommentTranslationProvider({
  authKey: "test-runtime-placeholder",
  fetchImpl: async () => ({
    ok: false,
    status: 429,
    headers: {
      get: (name) => (name.toLowerCase() === "retry-after" ? "2" : null)
    },
    text: async () => "rate limit"
  })
});
const rateLimited = await rateLimitedProvider.translate(request());
assert.equal(rateLimited.type, "recoverable-error", "rate limit is recoverable");
assert.equal(rateLimited.code, "rate-limited", "rate limit maps to the boundary code");
assert.equal(rateLimited.retry.retryAfterMs, 2000, "retry-after seconds are mapped to milliseconds");
assert.equal(rateLimited.usageHandoff.providerId, "deepl-text-v2", "recoverable error includes usage handoff");

const timeoutProvider = prototype.createDeepLCommentTranslationProvider({
  authKey: "test-runtime-placeholder",
  fetchImpl: async () => {
    const error = new Error("aborted");
    error.name = "AbortError";
    throw error;
  }
});
const timeout = await timeoutProvider.translate(request());
assert.equal(timeout.type, "recoverable-error", "timeout is recoverable");
assert.equal(timeout.code, "timeout", "timeout maps to the boundary code");
assert.equal(timeout.retry.retryable, true, "timeout remains retryable");

const terminalProvider = prototype.createDeepLCommentTranslationProvider({
  authKey: "test-runtime-placeholder",
  fetchImpl: async () => ({
    ok: false,
    status: 456,
    text: async () => "quota exceeded"
  })
});
const terminal = await terminalProvider.translate(request());
assert.equal(terminal.type, "terminal-error", "quota-style provider rejection is terminal for this prototype");
assert.equal(terminal.code, "policy-blocked", "quota-style provider rejection is not retried by this boundary");
assert.equal(terminal.retry.retryable, false, "terminal errors are not retryable");

const forbiddenChangedPathPatterns = [
  /^components\/comment-translator\//,
  /^app\/tools\/comment-translator\//,
  /^app\/api\//,
  /^supabase\//,
  /^migrations?\//,
  /^lib\/supabase\//,
  /^lib\/tool-handoff/,
  /^lib\/.*storage/i
];

for (const file of changedFiles()) {
  for (const pattern of forbiddenChangedPathPatterns) {
    assert.doesNotMatch(file, pattern, `server provider prototype does not change forbidden path: ${file}`);
  }

  if (!file.endsWith("comment-translator-server-provider-prototype-contract.mjs")) {
    const source = read(file);
    assert.doesNotMatch(source, /NEXT_PUBLIC_DEEPL|DEEPL_AUTH_KEY\s*=|DeepL-Auth-Key\s+[A-Za-z0-9_-]{20,}/, `${file} does not contain provider secret values`);
  }
}

console.log("comment translator server provider prototype contract checks passed");
