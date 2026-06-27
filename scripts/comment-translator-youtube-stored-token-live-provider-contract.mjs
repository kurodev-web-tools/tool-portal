import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const materialPath = "lib/comment-translator-youtube-token-material-runtime.ts";
const persistencePath = "lib/comment-translator-youtube-oauth-token-store-persistence.ts";
const supabaseAdapterPath = "lib/comment-translator-youtube-token-store-supabase-adapter.ts";
const liveProviderPath = "lib/comment-translator-youtube-live-provider-runtime-adapter.ts";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
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

    if (request === "@supabase/supabase-js") {
      return {
        createClient() {
          return { from: () => ({}) };
        }
      };
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

for (const requiredPath of [materialPath, persistencePath, supabaseAdapterPath, liveProviderPath]) {
  assert.ok(exists(requiredPath), `stored-token live provider file exists: ${requiredPath}`);
}

const materialSource = read(materialPath);
const persistenceSource = read(persistencePath);
const supabaseAdapterSource = read(supabaseAdapterPath);
const liveProviderSource = read(liveProviderPath);

assert.match(materialSource, /^import "server-only";/m, "stored token material runtime is server-only");
assert.match(materialSource, /createTrustedYouTubeOAuthStoredTokenMaterialResolver/, "material runtime exports stored token resolver");
assert.match(materialSource, /createTrustedYouTubeOAuthStoredCredentialRefreshRuntime/, "material runtime exports refresh runtime");
assert.match(materialSource, /createGoogleOAuthRefreshTokenExchangeAdapter/, "material runtime has a Google refresh adapter");
assert.match(persistenceSource, /createSealedYouTubeOAuthTokenMaterialCiphertextReferences/, "OAuth callback persistence stores decryptable sealed token material");
assert.match(supabaseAdapterSource, /getCredentialTokenMaterial/, "trusted Supabase adapter can read server-only token material references");
assert.match(supabaseAdapterSource, /updateCredentialTokenMaterial/, "trusted Supabase adapter can persist refreshed token material references");
assert.match(liveProviderSource, /resolveYouTubeLiveTokenForServerFetch/, "live provider adapter reuses the server-fetch token resolution foundation");
assert.doesNotMatch(
  liveProviderSource,
  /COMMENT_TRANSLATOR_YOUTUBE_SERVER_AUTHORIZATION_HEADER|YOUTUBE_LIVE_CHAT_POLLING_SMOKE_OPERATOR_LOCAL_SERVER_AUTHORIZATION_HEADER|YOUTUBE_LIVE_CHAT_TARGET_LOOKUP_OPERATOR_LOCAL_SERVER_AUTHORIZATION_HEADER/,
  "normal UI live provider no longer depends on operator-local env Authorization header names"
);
assert.doesNotMatch(
  `${materialSource}\n${persistenceSource}\n${supabaseAdapterSource}\n${liveProviderSource}`,
  /console\.(?:log|info|warn|error)|localStorage\.|indexedDB\.|sessionStorage\./i,
  "stored-token path avoids logs and browser storage"
);

const material = loadTsModule(materialPath);
const persistence = loadTsModule(persistencePath);
const liveProvider = loadTsModule(liveProviderPath);

const credentialReferenceId = "ytcred_contract_reference_001";
const ownerUserId = "00000000-0000-4000-8000-000000000001";
const env = {
  GOOGLE_OAUTH_CLIENT_ID: "client-reference-only",
  GOOGLE_OAUTH_CLIENT_SECRET: "client-secret-reference-present",
  YOUTUBE_OAUTH_CREDENTIAL_REFERENCE_SECRET: "credential-reference-secret-present"
};
const sealed = persistence.createYouTubeOAuthTokenMaterialCiphertextReferences({
  credentialReferenceId,
  accessTokenMaterial: "synthetic-old-access-material",
  refreshTokenMaterial: "synthetic-refresh-material",
  encryptionKeyReference: "kms://youtube-token-store/key-reference-only",
  encryptionKeyVersion: "v9",
  credentialReferenceSecret: env.YOUTUBE_OAUTH_CREDENTIAL_REFERENCE_SECRET
});
assert.match(sealed.accessTokenCiphertextReference, /^ytseal_v1:/, "access material is stored as a sealed ciphertext payload");
assert.match(sealed.refreshTokenCiphertextReference, /^ytseal_v1:/, "refresh material is stored as a sealed ciphertext payload");
assert.doesNotMatch(JSON.stringify(sealed), /synthetic-old-access-material|synthetic-refresh-material/i, "sealed references do not expose token material");

const nowIso = "2026-06-27T00:00:00.000Z";
const refreshedExpiresAtIso = "2026-06-27T01:00:00.000Z";
const adapterEvents = [];
const tokenMaterialAdapter = {
  async getCredentialTokenMaterial(request) {
    adapterEvents.push({ type: "read", keys: Object.keys(request).sort() });
    return {
      credentialReferenceId,
      ownerUserId,
      provider: "youtube",
      scopeLabel: "youtube.readonly",
      scopeSet: ["https://www.googleapis.com/auth/youtube.readonly"],
      expiresAtIso: "2026-06-26T23:00:00.000Z",
      expiryStatus: "expired",
      revoked: false,
      revokedAtIso: null,
      accessTokenCiphertextReference: sealed.accessTokenCiphertextReference,
      refreshTokenCiphertextReference: sealed.refreshTokenCiphertextReference,
      encryptionKeyReference: sealed.encryptionKeyReference,
      encryptionKeyVersion: sealed.encryptionKeyVersion
    };
  },
  async updateCredentialTokenMaterial(request) {
    adapterEvents.push({
      type: "update",
      keys: Object.keys(request).sort(),
      accessShape: request.accessTokenCiphertextReference.startsWith("ytseal_v1:") ? "sealed" : "other",
      refreshShape: request.refreshTokenCiphertextReference.startsWith("ytseal_v1:") ? "sealed" : "other",
      expiresAtIso: request.expiresAtIso
    });
    return {
      credentialReferenceId,
      provider: "youtube",
      providerChannelId: "provider-channel-reference",
      scopeLabel: "youtube.readonly",
      scopeSet: ["https://www.googleapis.com/auth/youtube.readonly"],
      expiresAtIso: request.expiresAtIso,
      expiryStatus: "active",
      revoked: false,
      revokedAtIso: null,
      tokenValue: "never-returned-by-design",
      refreshTokenValue: "never-returned-by-design",
      ciphertext: "never-returned-by-design",
      decryptCapability: "forbidden"
    };
  }
};

const resolver = material.createTrustedYouTubeOAuthStoredTokenMaterialResolver({
  tokenMaterialAdapter,
  refreshAdapter: {
    async refreshAccessToken(request) {
      assert.deepEqual(Object.keys(request).sort(), ["clientId", "clientSecret", "refreshTokenMaterial"].sort());
      return {
        status: "refreshed",
        accessTokenMaterial: "synthetic-new-access-material",
        refreshTokenMaterial: null,
        expiresAtIso: refreshedExpiresAtIso,
        scopeSet: ["https://www.googleapis.com/auth/youtube.readonly"]
      };
    }
  },
  env,
  nowIso: () => nowIso
});
const resolvedMaterial = await resolver.resolveServerOnlyTokenMaterial({
  credentialReferenceId,
  ownerUserId,
  requiredScope: "https://www.googleapis.com/auth/youtube.readonly"
});
assert.equal(resolvedMaterial.status, "available", "expired stored credential refreshes to available material");
assert.equal(resolvedMaterial.expiresAtIso, refreshedExpiresAtIso, "refreshed expiry is reused for server fetch");
assert.match(resolvedMaterial.serverAuthorizationHeader, /^Bearer /, "server fetch receives a bearer header inside the server boundary");
assert.deepEqual(
  adapterEvents.map((event) => event.type),
  ["read", "update"],
  "resolver reads owner-bound material and persists refreshed material"
);
assert.equal(adapterEvents[1].accessShape, "sealed", "refreshed access material is persisted sealed");
assert.equal(adapterEvents[1].refreshShape, "sealed", "refresh material remains persisted sealed");
assert.doesNotMatch(JSON.stringify(adapterEvents), /synthetic-new-access-material|synthetic-refresh-material|Bearer /i);

const legacyResolver = material.createTrustedYouTubeOAuthStoredTokenMaterialResolver({
  tokenMaterialAdapter: {
    async getCredentialTokenMaterial() {
      return {
        credentialReferenceId,
        ownerUserId,
        provider: "youtube",
        scopeLabel: "youtube.readonly",
        scopeSet: ["https://www.googleapis.com/auth/youtube.readonly"],
        expiresAtIso: refreshedExpiresAtIso,
        expiryStatus: "active",
        revoked: false,
        revokedAtIso: null,
        accessTokenCiphertextReference: "kms://youtube-token-store/access/legacy-reference-only",
        refreshTokenCiphertextReference: "kms://youtube-token-store/refresh/legacy-reference-only",
        encryptionKeyReference: "kms://youtube-token-store/key-reference-only",
        encryptionKeyVersion: "v1"
      };
    },
    async updateCredentialTokenMaterial() {
      throw new Error("legacy material must not update");
    }
  },
  refreshAdapter: {
    async refreshAccessToken() {
      throw new Error("legacy material must not refresh without decryptable material");
    }
  },
  env,
  nowIso: () => nowIso
});
assert.deepEqual(
  await legacyResolver.resolveServerOnlyTokenMaterial({
    credentialReferenceId,
    ownerUserId,
    requiredScope: "https://www.googleapis.com/auth/youtube.readonly"
  }),
  {
    status: "unavailable",
    reason: "stored-token-material-unavailable"
  },
  "irreversible legacy token references fail closed with sanitized reason"
);

const liveRuntime = liveProvider.createCommentTranslatorYouTubeLiveProviderRuntimeAdapterForTests({
  tokenMaterialResolver: {
    async resolveServerOnlyTokenMaterial(request) {
      assert.deepEqual(request, {
        credentialReferenceId: "credential-reference-for-tests",
        ownerUserId: "owner-user-reference-for-tests",
        requiredScope: "https://www.googleapis.com/auth/youtube.readonly"
      });
      return {
        status: "available",
        serverAuthorizationHeader: "server-only-test-authorization",
        expiresAtIso: refreshedExpiresAtIso
      };
    }
  },
  fetchGoogleApi: async (request) => {
    assert.equal(request.serverAuthorizationHeader, "server-only-test-authorization");
    if (request.endpoint === "liveBroadcasts.list") {
      return {
        ok: true,
        status: 200,
        body: {
          items: [
            {
              id: "broadcast-1",
              snippet: { title: "Live", liveChatId: "server-only-live-chat-id" },
              status: { lifeCycleStatus: "live", privacyStatus: "public" }
            }
          ]
        }
      };
    }
    return {
      ok: true,
      status: 200,
      body: {
        nextPageToken: "server-only-next-page-token",
        pollingIntervalMillis: 1000,
        items: [
          {
            id: "yt-comment-1",
            snippet: {
              publishedAt: "2026-06-27T00:00:01.000Z",
              displayMessage: "hello",
              textMessageDetails: { messageText: "hello" }
            }
          }
        ]
      }
    };
  },
  nowMs: () => Date.parse(nowIso)
});
const owner = await liveRuntime.targetLookupAdapter.verifyOwner({
  credentialReferenceId: "credential-reference-for-tests"
});
assert.equal(owner.status, "owner-verified");
const broadcasts = await liveRuntime.targetLookupAdapter.lookupOwnedBroadcasts({
  ownerChannelReference: "provider-channel-reference"
});
assert.equal(broadcasts.broadcasts.length, 1);
const poll = await liveRuntime.pollingAdapter.runtime.pollLiveChatOnce({
  liveChatId: "server-only-live-chat-id",
  nextPageToken: null,
  retryCount: 0,
  nextPollAfterMs: 0,
  terminal: null
});
assert.equal(poll.comments.length, 1);
assert.doesNotMatch(JSON.stringify({ owner, poll }), /Authorization|Bearer|access_token|refresh_token/i);

console.log("comment translator YouTube stored token live provider contract checks passed");
