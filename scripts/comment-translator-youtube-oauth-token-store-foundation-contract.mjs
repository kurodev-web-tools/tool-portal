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
    const committedDiff = execSync("git diff --name-only archive/comment-translator-preview-2026-07-21...HEAD", {
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

const foundationPath = "lib/comment-translator-youtube-oauth-token-store-foundation.ts";
const adapterPath = "lib/comment-translator-youtube-api-adapter.ts";
const runtimePath = "lib/comment-translator-youtube-runtime-foundation.ts";
const designDocPath = "docs/future/COMMENT_TRANSLATOR_YOUTUBE_OAUTH_TOKEN_STORE_FOUNDATION.md";

assert.ok(exists(foundationPath), "server-only YouTube OAuth token store foundation module exists");
assert.ok(exists(adapterPath), "YouTube Google API adapter remains available");
assert.ok(exists(runtimePath), "YouTube runtime foundation remains available");
assert.ok(exists(designDocPath), "YouTube OAuth token store foundation design memo exists");

const foundationSource = read(foundationPath);
const adapterSource = read(adapterPath);
const runtimeSource = read(runtimePath);
const providerBoundarySource = read("lib/comment-translator-provider-boundary.ts");
const deeplProviderSource = read("lib/comment-translator-deepl-provider.ts");
const componentSource = read("components/comment-translator/CommentTranslatorDock.tsx");
const routeSource = read("app/tools/comment-translator/page.tsx");
const mockLibSource = read("lib/comment-translator.ts");
const designDoc = read(designDocPath);
const taskSource = read("task.md");

assert.match(foundationSource, /^import "server-only";/m, "OAuth token store foundation is server-only");

for (const exportedType of [
  "YouTubeOAuthConsentRuntimeContract",
  "YouTubeOAuthConsentDraftRequest",
  "YouTubeOAuthConsentRuntimeDraft",
  "YouTubeOAuthCallbackValidationRequest",
  "YouTubeOAuthCallbackValidationResult",
  "YouTubeEncryptedTokenStoreImplementationBlocker",
  "YouTubeEncryptedTokenStoreRuntimeDesign",
  "YouTubeOAuthTokenResolverRuntimeContract",
  "YouTubeOAuthTokenStoreFoundationContract"
]) {
  assert.match(foundationSource, new RegExp(`export type ${exportedType}\\b`), `exports ${exportedType}`);
}

for (const exportedConstOrFunction of [
  "youtubeOAuthConsentRuntimeContract",
  "youtubeEncryptedTokenStoreImplementationBlockers",
  "youtubeEncryptedTokenStoreRuntimeDesign",
  "youtubeOAuthTokenResolverRuntimeContract",
  "youtubeOAuthTokenStoreFoundationContract",
  "createYouTubeOAuthConsentDraft",
  "validateYouTubeOAuthCallbackDraft",
  "createYouTubeOAuthTokenStoreBlockerSummary"
]) {
  assert.match(
    foundationSource,
    new RegExp(`export (?:const|function) ${exportedConstOrFunction}\\b`),
    `exports ${exportedConstOrFunction}`
  );
}

assert.match(foundationSource, /youtubeGoogleApiSafeLiveSmokePolicy/, "foundation references the safe live smoke policy");
assert.match(foundationSource, /youtubeTokenReferenceResolverContract/, "foundation follows the token reference resolver contract");
assert.match(foundationSource, /youtubeEncryptedTokenStoreDesignPolicy/, "foundation follows the encrypted token store design policy");
assert.match(adapterSource, /youtubeGoogleApiSafeLiveSmokePolicy/, "adapter safe live smoke policy remains available");
assert.match(runtimeSource, /credentialReferenceId/, "runtime foundation still uses credential references");

assert.doesNotMatch(
  foundationSource,
  /comment-translator-provider-boundary|comment-translator-deepl-provider/,
  "OAuth token store foundation does not import translation provider modules"
);
assert.doesNotMatch(
  `${providerBoundarySource}\n${deeplProviderSource}`,
  /comment-translator-youtube-oauth-token-store-foundation/,
  "provider modules do not import the OAuth token store foundation"
);
assert.doesNotMatch(
  `${componentSource}\n${routeSource}\n${mockLibSource}`,
  /comment-translator-youtube-oauth-token-store-foundation|comment-translator-youtube-api-adapter|comment-translator-youtube-runtime-foundation|youtube\.googleapis|GoogleAuth|OAuth2Client|refresh_token|access_token|localStorage|indexedDB/,
  "client UI, route shell, and fixture mock are not coupled to OAuth token store or Google API runtime"
);

for (const pattern of [
  /\bfetch\s*\(/,
  /XMLHttpRequest/,
  /EventSource/,
  /WebSocket/,
  /youtube\.googleapis|OAuth2Client|GoogleAuth|from\s+["']googleapis["']|require\(["']googleapis["']\)/,
  /process\.env/,
  /localStorage\./,
  /indexedDB\./,
  /createClient/,
  /from\(["']usage_quotas["']\)/,
  /insert\s*\(/,
  /upsert\s*\(/,
  /update\s*\(/,
  /stripe|checkout|gtag|GA4|cookie consent/i
]) {
  assert.doesNotMatch(foundationSource, pattern, `foundation avoids out-of-scope integration: ${pattern}`);
}

const foundation = loadTsModule(foundationPath);

assert.equal(
  foundation.youtubeOAuthConsentRuntimeContract.implementationStage,
  "server-only-consent-runtime-foundation",
  "consent runtime stage is explicit"
);
assert.equal(
  foundation.youtubeOAuthConsentRuntimeContract.requiredScope,
  "https://www.googleapis.com/auth/youtube.readonly",
  "consent runtime uses the YouTube read-only scope"
);
assert.equal(
  foundation.youtubeOAuthConsentRuntimeContract.authorizationCodeHandling,
  "server-callback-exchange-only",
  "authorization code handling is server callback only"
);
assert.equal(
  foundation.youtubeOAuthConsentRuntimeContract.clientTokenExposure,
  "forbidden",
  "consent runtime forbids client token exposure"
);
assert.equal(
  foundation.youtubeOAuthConsentRuntimeContract.liveGoogleApiCall,
  "not-implemented",
  "consent runtime does not run live Google API calls"
);

assert.deepEqual(
  foundation.youtubeEncryptedTokenStoreImplementationBlockers.map((blocker) => blocker.id),
  [
    "schema-approval",
    "key-management",
    "token-refresh",
    "revocation",
    "audit-log",
    "retention-policy",
    "live-smoke-approval"
  ],
  "encrypted token store blocker list is explicit and ordered"
);
assert.equal(
  foundation.youtubeEncryptedTokenStoreRuntimeDesign.schemaMutation,
  "blocked-until-approved",
  "encrypted token store design blocks hidden schema mutation"
);
assert.equal(
  foundation.youtubeEncryptedTokenStoreRuntimeDesign.accessTokenStorage,
  "encrypted-server-only",
  "access token storage is encrypted server-only"
);
assert.equal(
  foundation.youtubeEncryptedTokenStoreRuntimeDesign.refreshTokenStorage,
  "encrypted-server-only",
  "refresh token storage is encrypted server-only"
);
assert.equal(
  foundation.youtubeEncryptedTokenStoreRuntimeDesign.localStorage,
  "forbidden",
  "token store design forbids localStorage"
);
assert.equal(
  foundation.youtubeEncryptedTokenStoreRuntimeDesign.indexedDB,
  "forbidden",
  "token store design forbids IndexedDB"
);

assert.equal(
  foundation.youtubeOAuthTokenResolverRuntimeContract.outputTokenValue,
  "never-returned-by-design",
  "runtime resolver never returns token values"
);
assert.equal(
  foundation.youtubeOAuthTokenResolverRuntimeContract.authorizationBinding,
  "server-fetch-only",
  "runtime resolver returns only server fetch authorization binding"
);
assert.equal(
  foundation.youtubeOAuthTokenResolverRuntimeContract.quotaWrite,
  "not-implemented",
  "token resolver runtime does not write quota"
);
assert.equal(
  foundation.youtubeOAuthTokenStoreFoundationContract.providerCoupling,
  "forbidden-direct-import-or-call",
  "foundation forbids provider coupling"
);
assert.equal(
  foundation.youtubeOAuthTokenStoreFoundationContract.storageMutation,
  "forbidden-in-this-slice",
  "foundation does not mutate storage in this slice"
);

const consentDraft = foundation.createYouTubeOAuthConsentDraft({
  stateReferenceId: "oauth-state-ref-contract",
  redirectUriReference: "server-callback-ref",
  ownerHintReference: "owner-hint-ref",
  nowMs: 1_000
});
assert.deepEqual(
  consentDraft,
  {
    status: "draft-only",
    stateReferenceId: "oauth-state-ref-contract",
    redirectUriReference: "server-callback-ref",
    ownerHintReference: "owner-hint-ref",
    requiredScope: "https://www.googleapis.com/auth/youtube.readonly",
    accessType: "offline-required-for-refresh-token",
    prompt: "consent-required-for-refresh-token",
    tokenValue: "never-produced-by-design",
    refreshTokenValue: "never-produced-by-design",
    liveGoogleApiCall: "not-implemented",
    createdAtMs: 1_000
  },
  "consent draft represents references only and produces no token values"
);

assert.deepEqual(
  foundation.validateYouTubeOAuthCallbackDraft({
    stateReferenceId: "oauth-state-ref-contract",
    expectedStateReferenceId: "oauth-state-ref-contract",
    authorizationCodeReceived: true,
    error: null,
    nowMs: 2_000
  }),
  {
    status: "ready-for-server-exchange",
    stateReferenceId: "oauth-state-ref-contract",
    authorizationCodeHandling: "server-callback-exchange-only",
    tokenPersistence: "blocked-on-encrypted-store",
    tokenValue: "never-returned-by-design",
    refreshTokenValue: "never-returned-by-design",
    validatedAtMs: 2_000
  },
  "callback validation accepts matching state without exposing code or token material"
);
assert.equal(
  foundation.validateYouTubeOAuthCallbackDraft({
    stateReferenceId: "wrong-state-ref",
    expectedStateReferenceId: "oauth-state-ref-contract",
    authorizationCodeReceived: true,
    error: null,
    nowMs: 2_000
  }).status,
  "state-mismatch",
  "callback validation blocks state mismatch"
);
assert.equal(
  foundation.validateYouTubeOAuthCallbackDraft({
    stateReferenceId: "oauth-state-ref-contract",
    expectedStateReferenceId: "oauth-state-ref-contract",
    authorizationCodeReceived: false,
    error: "access_denied",
    nowMs: 2_000
  }).status,
  "oauth-error",
  "callback validation records OAuth error without token material"
);

const blockerSummary = foundation.createYouTubeOAuthTokenStoreBlockerSummary();
for (const requiredFragment of [
  "schema approval",
  "key management",
  "refresh",
  "revocation",
  "audit",
  "retention",
  "safe live smoke"
]) {
  assert.match(blockerSummary, new RegExp(requiredFragment, "i"), `blocker summary records: ${requiredFragment}`);
}

assert.equal(
  foundation.youtubeOAuthTokenStoreFoundationContract.safeLiveSmoke.status,
  "not-run-in-this-slice",
  "safe live smoke stays not run in this slice"
);
assert.ok(
  foundation.youtubeOAuthTokenStoreFoundationContract.safeLiveSmoke.requiredConditions.includes(
    "explicit user approval for a safe test YouTube owner account"
  ),
  "safe live smoke still requires user-approved test account"
);
assert.ok(
  foundation.youtubeOAuthTokenStoreFoundationContract.safeLiveSmoke.requiredConditions.includes(
    "no OAuth token value in client components, fixtures, task docs, PR body, localStorage, or IndexedDB"
  ),
  "safe live smoke policy keeps token values out of client/docs/storage"
);

for (const docFragment of [
  "OAuth consent",
  "callback",
  "encrypted token store",
  "token resolver runtime",
  "server-only",
  "youtube.readonly",
  "schema approval",
  "key management",
  "refresh",
  "revocation",
  "audit",
  "retention",
  "safe live smoke",
  "No Supabase schema",
  "No migration",
  "No RLS policy",
  "No localStorage",
  "No IndexedDB",
  "No direct provider import",
  "not run in this slice"
]) {
  assert.match(designDoc, new RegExp(docFragment, "i"), `design doc records: ${docFragment}`);
}

assert.match(
  taskSource,
  /YouTube OAuth token store \+ consent runtime foundation/i,
  "task.md records the OAuth token store foundation slice"
);
assert.match(
  taskSource,
  /safe live Google API smoke.*未実施|safe live YouTube login \/ OAuth \/ owner verification \/ Live Chat polling smoke は未実施/i,
  "task.md records the live smoke unchecked scope"
);

const separateImplementationFiles = new Set([
  "lib/comment-translator-youtube-token-store-runtime.ts",
  "app/api/comment-translator/youtube/credential-status/route.ts",
  "app/tools/comment-translator/actions.ts",
  "supabase/migrations/20260601000000_youtube_oauth_credentials.sql",
  "scripts/comment-translator-youtube-token-store-separate-approved-migration-pr-contract.mjs"
]);

for (const file of changedFiles()) {
  for (const pattern of [
    /^components\/comment-translator\//,
    /^app\/tools\/comment-translator\//,
    /^app\/api\//,
    /^supabase\//,
    /^migrations?\//,
    /^lib\/supabase\//,
    /^lib\/tool-handoff/,
    /^lib\/.*storage/i
  ]) {
    if (!separateImplementationFiles.has(file)) {
      assert.doesNotMatch(file, pattern, `OAuth token store foundation does not change forbidden path: ${file}`);
    }
  }

  if (!file.endsWith("comment-translator-youtube-oauth-token-store-foundation-contract.mjs")) {
    const source = read(file);
    assert.doesNotMatch(
      source,
      /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]/i,
      `${file} does not contain token or service role material`
    );
  }
}

console.log("comment translator YouTube OAuth token store foundation contract checks passed");
