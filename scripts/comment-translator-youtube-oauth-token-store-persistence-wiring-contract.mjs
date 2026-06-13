import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const runtimePath = "lib/comment-translator-youtube-oauth-token-store-persistence.ts";
const callbackRuntimePath = "lib/comment-translator-youtube-oauth-connect-callback.ts";
const callbackRoutePath = "app/api/comment-translator/youtube/oauth/callback/route.ts";
const taskPath = "task.md";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function changedFiles() {
  const committedDiff = execSync(
    "git diff --name-only origin/codex/comment-translator-youtube-oauth-integration...HEAD",
    {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }
  )
    .split(/\r?\n/)
    .filter(Boolean);
  const workingTreeDiff = execSync("git diff --name-only", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  })
    .split(/\r?\n/)
    .filter(Boolean);
  const stagedDiff = execSync("git diff --cached --name-only", {
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

  return [...new Set([...committedDiff, ...workingTreeDiff, ...stagedDiff, ...untracked])].map((file) =>
    file.replace(/\\/g, "/")
  );
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

    if (request.startsWith("@/")) {
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
    return compileTsModule(sourcePath);
  } finally {
    Module._load = originalLoad;
  }
}

assert.ok(exists(runtimePath), "Task 4 callback token-store persistence runtime exists");
assert.ok(exists(callbackRuntimePath), "Task 3 callback validation runtime remains available");
assert.ok(exists(callbackRoutePath), "OAuth callback route exists");
assert.ok(exists(taskPath), "task.md exists");

const runtimeSource = read(runtimePath);
const callbackRuntimeSource = read(callbackRuntimePath);
const callbackRouteSource = read(callbackRoutePath);
const taskSource = read(taskPath);

assert.match(runtimeSource, /^import "server-only";/m, "Task 4 persistence runtime is server-only");
assert.match(callbackRuntimeSource, /youtube-oauth-token-store-blocked/, "Task 3 fail-closed callback status remains as compatibility marker");
assert.match(callbackRouteSource, /persistYouTubeOAuthCallbackCredential/, "callback route delegates valid callbacks to Task 4 persistence runtime");
assert.match(callbackRouteSource, /createTrustedYouTubeOAuthCredentialSupabasePersistenceRuntime/, "callback route wires trusted Supabase token store runtime");
assert.doesNotMatch(callbackRouteSource, /console\.(log|error|warn)|request\.url\.toString\(\)/i, "callback route does not log or reflect raw callback input");

for (const exportName of [
  "persistYouTubeOAuthCallbackCredential",
  "createYouTubeOAuthCredentialReferenceId",
  "createYouTubeOAuthTokenMaterialCiphertextReferences",
  "youtubeOAuthTokenStorePersistenceWiringContract"
]) {
  assert.match(runtimeSource, new RegExp(`export (?:const|function|async function) ${exportName}\\b`), `runtime exports ${exportName}`);
}

for (const envName of [
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "GOOGLE_OAUTH_REDIRECT_URI",
  "YOUTUBE_OAUTH_CREDENTIAL_REFERENCE_SECRET",
  "YOUTUBE_OAUTH_TOKEN_STORE_KEY_REF",
  "YOUTUBE_OAUTH_TOKEN_STORE_KEY_VERSION",
  "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED"
]) {
  assert.match(runtimeSource, new RegExp(`\\b${envName}\\b`), `runtime references ${envName} by name only`);
}

assert.doesNotMatch(
  runtimeSource,
  /console\.(log|error|warn)|localStorage\.|indexedDB\.|sessionStorage\.|liveChatMessages|stripe|checkout|providerTargetMetadata/i,
  "runtime avoids logs, browser storage, live chat, billing, and provider target metadata"
);

const runtime = loadTsModule(runtimePath);

assert.equal(runtime.youtubeOAuthTokenStorePersistenceWiringContract.runtime, "server-only");
assert.equal(runtime.youtubeOAuthTokenStorePersistenceWiringContract.remoteSupabaseApply, "not-run-by-this-task");
assert.equal(runtime.youtubeOAuthTokenStorePersistenceWiringContract.liveGoogleOAuthConnectExecution, "not-run-by-this-task");
assert.equal(runtime.youtubeOAuthTokenStorePersistenceWiringContract.googleOAuthTokenEndpointExecution, "adapter-only-not-run-by-contract");
assert.equal(runtime.youtubeOAuthTokenStorePersistenceWiringContract.browserReadableOutput, "sanitized-status-and-credential-reference-only");

const baseEnv = {
  GOOGLE_OAUTH_CLIENT_ID: "client-reference-only",
  GOOGLE_OAUTH_CLIENT_SECRET: "secret-reference-present",
  GOOGLE_OAUTH_REDIRECT_URI: "https://example.test/api/comment-translator/youtube/oauth/callback",
  YOUTUBE_OAUTH_CREDENTIAL_REFERENCE_SECRET: "credential-reference-secret-present",
  YOUTUBE_OAUTH_TOKEN_STORE_KEY_REF: "kms://youtube-token-store/key-reference-only",
  YOUTUBE_OAUTH_TOKEN_STORE_KEY_VERSION: "v4",
  YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED: "false"
};
const ownerUserId = "owner-reference-only";

const referenceA = runtime.createYouTubeOAuthCredentialReferenceId({
  ownerUserId,
  credentialReferenceSecret: baseEnv.YOUTUBE_OAUTH_CREDENTIAL_REFERENCE_SECRET
});
const referenceB = runtime.createYouTubeOAuthCredentialReferenceId({
  ownerUserId,
  credentialReferenceSecret: baseEnv.YOUTUBE_OAUTH_CREDENTIAL_REFERENCE_SECRET
});
assert.equal(referenceA, referenceB, "credential reference creation is idempotent for reconnect");
assert.match(referenceA, /^ytcred_[a-z0-9_-]{24,}$/i, "credential reference is opaque and browser-safe");
assert.doesNotMatch(referenceA, /00000000|owner|user|channel|UC_/i, "credential reference does not embed owner or provider identifiers");

const sealed = runtime.createYouTubeOAuthTokenMaterialCiphertextReferences({
  credentialReferenceId: referenceA,
  accessTokenMaterial: "synthetic-access-token-material",
  refreshTokenMaterial: "synthetic-refresh-token-material",
  encryptionKeyReference: baseEnv.YOUTUBE_OAUTH_TOKEN_STORE_KEY_REF,
  encryptionKeyVersion: baseEnv.YOUTUBE_OAUTH_TOKEN_STORE_KEY_VERSION,
  credentialReferenceSecret: baseEnv.YOUTUBE_OAUTH_CREDENTIAL_REFERENCE_SECRET
});
assert.deepEqual(Object.keys(sealed).sort(), ["accessTokenCiphertextReference", "encryptionKeyReference", "encryptionKeyVersion", "refreshTokenCiphertextReference"].sort());
assert.equal(sealed.encryptionKeyReference, baseEnv.YOUTUBE_OAUTH_TOKEN_STORE_KEY_REF, "key reference is stored as a reference label");
assert.equal(sealed.encryptionKeyVersion, "v4", "key version is stored as metadata");
assert.doesNotMatch(JSON.stringify(sealed), /synthetic-access-token-material|synthetic-refresh-token-material/i, "sealed references do not include token material");

async function runWithSpies(overrides = {}) {
  const calls = [];
  const exchangeAdapter = {
    exchangeAuthorizationCode: async (request) => {
      calls.push({ type: "exchange", keys: Object.keys(request).sort(), authorizationCodeShape: request.authorizationCode ? "present" : "missing" });
      return {
        status: "exchanged",
        accessTokenMaterial: "synthetic-access-token-material",
        refreshTokenMaterial: "synthetic-refresh-token-material",
        expiresAtIso: "2026-06-13T15:00:00.000Z",
        scopeSet: ["https://www.googleapis.com/auth/youtube.readonly"]
      };
    }
  };
  const trustedStore = {
    upsertEncryptedCredential: async (draft) => {
      calls.push({
        type: "upsert",
        credentialReferenceId: draft.credentialReferenceId,
        ownerUserIdShape: draft.ownerUserId ? "present" : "missing",
        providerChannelId: draft.providerChannelId,
        accessTokenCiphertextReference: draft.accessTokenCiphertextReference,
        refreshTokenCiphertextReference: draft.refreshTokenCiphertextReference
      });
      return draft;
    },
    markCredentialRevoked: async () => {
      throw new Error("not used");
    }
  };

  const result = await runtime.persistYouTubeOAuthCallbackCredential({
    authorizationCode: "synthetic-authorization-code",
    ownerAuthorization: { status: "authorized", ownerUserId },
    intent: "reconnect",
    nowIso: "2026-06-13T14:00:00.000Z",
    env: baseEnv,
    exchangeAdapter,
    trustedStore,
    ...overrides
  });

  return { result, calls };
}

const disabled = await runWithSpies({
  env: { ...baseEnv, YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED: "true" }
});
assert.deepEqual(
  disabled.result,
  {
    status: "youtube-oauth-disabled",
    credentialReferenceId: null,
    tokenValue: "never-returned-by-design",
    refreshTokenValue: "never-returned-by-design",
    authorizationCodeValue: "never-returned-by-design"
  },
  "emergency disable fails closed before exchange or store access"
);
assert.deepEqual(disabled.calls, [], "disabled path does not call exchange or store");

const unauthorized = await runWithSpies({
  ownerAuthorization: { status: "unavailable", reason: "caller-not-authenticated", reconnectRequired: true }
});
assert.equal(unauthorized.result.status, "youtube-oauth-sign-in-required", "unauthorized owner fails closed with sanitized status");
assert.deepEqual(unauthorized.calls, [], "unauthorized path does not call exchange or store");

const missingEnv = await runWithSpies({
  env: { GOOGLE_OAUTH_CLIENT_ID: "client-reference-only" }
});
assert.equal(missingEnv.result.status, "youtube-oauth-persistence-unavailable", "missing env references fail closed");
assert.deepEqual(missingEnv.result.missingEnvReferences.sort(), [
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "GOOGLE_OAUTH_REDIRECT_URI",
  "YOUTUBE_OAUTH_CREDENTIAL_REFERENCE_SECRET",
  "YOUTUBE_OAUTH_TOKEN_STORE_KEY_REF",
  "YOUTUBE_OAUTH_TOKEN_STORE_KEY_VERSION"
].sort());
assert.deepEqual(missingEnv.calls, [], "missing env path does not call exchange or store");

const success = await runWithSpies();
assert.equal(success.result.status, "youtube-oauth-connected", "valid callback persists through trusted token store");
assert.equal(success.result.credentialReferenceId, referenceA, "success returns the idempotent credential reference");
assert.equal(success.result.tokenValue, "never-returned-by-design");
assert.equal(success.result.refreshTokenValue, "never-returned-by-design");
assert.equal(success.result.authorizationCodeValue, "never-returned-by-design");
assert.deepEqual(success.calls.map((call) => call.type), ["exchange", "upsert"], "success exchanges before trusted store upsert");
assert.deepEqual(success.calls[0], {
  type: "exchange",
  keys: ["authorizationCode", "clientId", "clientSecret", "redirectUri"].sort(),
  authorizationCodeShape: "present"
});
assert.equal(success.calls[1].credentialReferenceId, referenceA, "trusted store receives opaque credential reference");
assert.equal(success.calls[1].ownerUserIdShape, "present", "trusted store receives owner only inside server boundary");
assert.equal(success.calls[1].providerChannelId, "provider-channel-pending-owner-verification", "Task 4 does not run provider target lookup");
assert.doesNotMatch(JSON.stringify(success.result), /synthetic-authorization-code|synthetic-access-token-material|synthetic-refresh-token-material|UC_/i);
assert.doesNotMatch(JSON.stringify(success.calls[1]), /synthetic-access-token-material|synthetic-refresh-token-material/i);

const exchangeFailed = await runWithSpies({
  exchangeAdapter: {
    exchangeAuthorizationCode: async () => ({ status: "exchange-failed", reason: "provider-unavailable" })
  }
});
assert.equal(exchangeFailed.result.status, "youtube-oauth-token-exchange-failed", "exchange failure returns sanitized persistence status");

const storeFailed = await runWithSpies({
  trustedStore: {
    upsertEncryptedCredential: async () => {
      throw new Error("synthetic store failure");
    },
    markCredentialRevoked: async () => {
      throw new Error("not used");
    }
  }
});
assert.equal(storeFailed.result.status, "youtube-oauth-persistence-failed", "trusted store failure returns sanitized status");

assert.match(taskSource, /Server-only credential persistence wiring to Supabase token store[\s\S]*Status: complete/i, "task.md records Task 4 completion");
assert.match(taskSource, /width checks skipped for Task 4/i, "task.md records Task 4 width-check skip reason");
assert.match(taskSource, /Google OAuth live connect execution, YouTube OAuth live connect execution[\s\S]*were not run/i, "task.md records gated OAuth execution was not run");

const allowedChangedFiles = new Set([
  callbackRoutePath,
  callbackRuntimePath,
  runtimePath,
  taskPath,
  "scripts/comment-translator-youtube-oauth-connect-callback-implementation-contract.mjs",
  "scripts/comment-translator-youtube-oauth-connect-callback-readiness-contract.mjs",
  "scripts/comment-translator-youtube-oauth-token-store-persistence-wiring-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `Task 4 persistence PR does not change unexpected file: ${file}`);
}

const changedSource = changedFiles()
  .map((file) => `${file}\n${read(file)}`)
  .join("\n");

for (const forbiddenSecretPattern of [
  /access_token\s*[:=]\s*["'][^"']+["']/i,
  /refresh_token\s*[:=]\s*["'][^"']+["']/i,
  /authorization_code\s*[:=]\s*["'][^"']+["']/i,
  /Authorization:\s*Bearer\s+\S+/i,
  /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+["']/i,
  /STRIPE_SECRET_KEY\s*[:=]\s*["'][^"']+["']/i,
  /STRIPE_WEBHOOK_SECRET\s*[:=]\s*["'][^"']+["']/i,
  /liveChatId\s*[:=]\s*["'][^"']+["']/i,
  /providerChannelId\s*[:=]\s*["'][UC][^"']+["']/i,
  /ownerUserId\s*[:=]\s*["'][0-9a-f-]{20,}["']/i,
  /providerTargetMetadata\s*[:=]\s*\{/i
]) {
  assert.doesNotMatch(changedSource, forbiddenSecretPattern, `changed files avoid forbidden value pattern: ${forbiddenSecretPattern}`);
}

console.log("comment translator YouTube OAuth token-store persistence wiring contract checks passed");
