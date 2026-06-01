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

const adapterPath = "lib/comment-translator-youtube-api-adapter.ts";
const inputBoundaryPath = "lib/comment-translator-youtube-input-boundary.ts";
const runtimePath = "lib/comment-translator-youtube-runtime-foundation.ts";

assert.ok(exists(adapterPath), "server-only YouTube Google API adapter + token reference module exists");
assert.ok(exists(inputBoundaryPath), "YouTube input boundary remains available");
assert.ok(exists(runtimePath), "YouTube runtime foundation remains available");

const adapterSource = read(adapterPath);
const inputBoundarySource = read(inputBoundaryPath);
const runtimeSource = read(runtimePath);
const providerBoundarySource = read("lib/comment-translator-provider-boundary.ts");
const deeplProviderSource = read("lib/comment-translator-deepl-provider.ts");
const componentSource = read("components/comment-translator/CommentTranslatorDock.tsx");
const routeSource = read("app/tools/comment-translator/page.tsx");
const mockLibSource = read("lib/comment-translator.ts");
const taskSource = read("task.md");

assert.match(adapterSource, /^import "server-only";/m, "Google API adapter boundary is server-only");

for (const exportedType of [
  "YouTubeEncryptedTokenStoreDesignPolicy",
  "YouTubeTokenReferenceResolverContract",
  "YouTubeOAuthCredentialReference",
  "YouTubeTokenReferenceResolutionRequest",
  "YouTubeTokenReferenceResolutionResult",
  "YouTubeTokenReferenceResolver",
  "YouTubeGoogleApiAdapterContract",
  "YouTubeGoogleApiFakeFetchRequest",
  "YouTubeGoogleApiFakeFetchResponse",
  "YouTubeGoogleApiAdapter",
  "YouTubeGoogleApiSafeLiveSmokePolicy"
]) {
  assert.match(adapterSource, new RegExp(`export type ${exportedType}\\b`), `exports ${exportedType}`);
}

for (const exportedConstOrFunction of [
  "youtubeEncryptedTokenStoreDesignPolicy",
  "youtubeTokenReferenceResolverContract",
  "youtubeGoogleApiAdapterContract",
  "youtubeGoogleApiSafeLiveSmokePolicy",
  "createStaticYouTubeTokenReferenceResolver",
  "createDeterministicYouTubeGoogleApiAdapter"
]) {
  assert.match(
    adapterSource,
    new RegExp(`export (?:const|function) ${exportedConstOrFunction}\\b`),
    `exports ${exportedConstOrFunction}`
  );
}

assert.match(adapterSource, /comment-translator-youtube-runtime-foundation/, "adapter composes the runtime foundation");
assert.match(inputBoundarySource, /future-server-encrypted-token-store/, "input boundary still points to a future encrypted token store");
assert.match(runtimeSource, /credentialReferenceId/, "runtime foundation still accepts credential references");
assert.doesNotMatch(
  adapterSource,
  /comment-translator-provider-boundary|comment-translator-deepl-provider/,
  "adapter does not import translation provider modules"
);
assert.doesNotMatch(
  `${providerBoundarySource}\n${deeplProviderSource}`,
  /comment-translator-youtube-api-adapter/,
  "provider modules do not import the YouTube Google API adapter"
);
assert.doesNotMatch(
  `${componentSource}\n${routeSource}\n${mockLibSource}`,
  /comment-translator-youtube-api-adapter|comment-translator-youtube-runtime-foundation|comment-translator-youtube-input-boundary|youtube\.googleapis|GoogleAuth|OAuth2Client|refresh_token|access_token|localStorage|indexedDB/,
  "client UI, route shell, and fixture mock are not coupled to YouTube API adapter or token storage"
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
  assert.doesNotMatch(adapterSource, pattern, `adapter design avoids out-of-scope integration: ${pattern}`);
}

const adapter = loadTsModule(adapterPath);

assert.equal(
  adapter.youtubeEncryptedTokenStoreDesignPolicy.implementationStage,
  "design-policy-only",
  "encrypted token store is only a design policy"
);
assert.equal(
  adapter.youtubeEncryptedTokenStoreDesignPolicy.clientComponent,
  "forbidden",
  "encrypted token store policy forbids client component token exposure"
);
assert.equal(
  adapter.youtubeEncryptedTokenStoreDesignPolicy.localStorage,
  "forbidden",
  "encrypted token store policy forbids localStorage"
);
assert.equal(
  adapter.youtubeEncryptedTokenStoreDesignPolicy.indexedDB,
  "forbidden",
  "encrypted token store policy forbids IndexedDB"
);
assert.equal(
  adapter.youtubeEncryptedTokenStoreDesignPolicy.schemaMutation,
  "forbidden-in-this-slice",
  "encrypted token store policy does not open schema changes"
);
assert.equal(
  adapter.youtubeEncryptedTokenStoreDesignPolicy.refreshImplementation,
  "not-implemented",
  "token refresh stays out of scope"
);
assert.equal(
  adapter.youtubeEncryptedTokenStoreDesignPolicy.revocationImplementation,
  "not-implemented",
  "token revocation stays out of scope"
);

assert.equal(
  adapter.youtubeTokenReferenceResolverContract.tokenValue,
  "never-returned-by-design",
  "resolver contract does not return OAuth token values"
);
assert.equal(
  adapter.youtubeTokenReferenceResolverContract.authorizationBinding,
  "server-fetch-only",
  "resolver contract returns only a server fetch authorization binding"
);
assert.equal(
  adapter.youtubeGoogleApiAdapterContract.liveApiCall,
  "not-implemented",
  "adapter contract does not permit live Google API calls"
);
assert.equal(
  adapter.youtubeGoogleApiAdapterContract.fakeFetch,
  "deterministic-contract-only",
  "adapter contract uses deterministic fake fetch only"
);
assert.equal(
  adapter.youtubeGoogleApiAdapterContract.providerCoupling,
  "forbidden-direct-import-or-call",
  "adapter contract forbids provider coupling"
);

const tokenResolver = adapter.createStaticYouTubeTokenReferenceResolver([
  {
    credentialReferenceId: "credential-ref-contract-1",
    ownerChannelReference: "owner-channel-contract-1",
    scopes: ["https://www.googleapis.com/auth/youtube.readonly"],
    status: "available",
    expiresAtMs: 4_000
  },
  {
    credentialReferenceId: "credential-ref-expired",
    ownerChannelReference: "owner-channel-expired",
    scopes: ["https://www.googleapis.com/auth/youtube.readonly"],
    status: "expired",
    expiresAtMs: 1
  }
]);

assert.deepEqual(
  await tokenResolver.resolveTokenReference({
    credentialReferenceId: "credential-ref-contract-1",
    requiredScope: "https://www.googleapis.com/auth/youtube.readonly",
    nowMs: 1_000
  }),
  {
    status: "resolved",
    credentialReferenceId: "credential-ref-contract-1",
    requiredScope: "https://www.googleapis.com/auth/youtube.readonly",
    ownerChannelReference: "owner-channel-contract-1",
    authorizationBinding: "server-fetch-only",
    tokenValue: "never-returned-by-design",
    refreshTokenValue: "never-returned-by-design",
    expiresAtMs: 4_000,
    encryptedStore: adapter.youtubeEncryptedTokenStoreDesignPolicy
  },
  "static resolver resolves a token reference without exposing token values"
);
assert.equal(
  (
    await tokenResolver.resolveTokenReference({
      credentialReferenceId: "missing-ref",
      requiredScope: "https://www.googleapis.com/auth/youtube.readonly",
      nowMs: 1_000
    })
  ).status,
  "missing",
  "static resolver reports missing references without falling back to token values"
);
assert.equal(
  (
    await tokenResolver.resolveTokenReference({
      credentialReferenceId: "credential-ref-expired",
      requiredScope: "https://www.googleapis.com/auth/youtube.readonly",
      nowMs: 1_000
    })
  ).status,
  "expired",
  "static resolver reports expired references without refresh"
);

const capturedRequests = [];
const googleApiAdapter = adapter.createDeterministicYouTubeGoogleApiAdapter({
  credentialReferenceId: "credential-ref-contract-1",
  tokenResolver,
  nowMs: () => 1_000,
  googleApiFakeFetch: async (request) => {
    capturedRequests.push(request);

    if (request.endpoint === "channels.list-mine") {
      return {
        endpoint: "channels.list-mine",
        ownerChannelReference: "owner-channel-contract-1",
        liveStreamingEnabled: true
      };
    }

    if (request.endpoint === "liveBroadcasts.list-mine") {
      return {
        endpoint: "liveBroadcasts.list-mine",
        broadcasts: [
          {
            broadcastId: "broadcast-contract-1",
            liveChatId: "live-chat-contract-1",
            title: "Contract stream",
            lifecycleStatus: "live",
            privacyStatus: "public"
          }
        ]
      };
    }

    return {
      endpoint: "liveChatMessages.list",
      step: {
        type: "messages",
        receivedAtMs: 1_250,
        nextPageToken: "page-token-contract-2",
        pollingIntervalMillis: 5_000,
        comments: [
          {
            id: "comment-contract-1",
            publishedAt: "2026-05-31T05:00:00.000Z",
            text: "Adapter contract comment",
            platformLanguageHint: "en",
            authorChannelId: "must-not-cross",
            oauthAccessToken: "must-not-cross",
            nextPageToken: "must-not-cross"
          }
        ]
      }
    };
  }
});

const ownerResult = await googleApiAdapter.verifyOwner({
  credentialReferenceId: "credential-ref-contract-1",
  expectedChannelReference: "owner-channel-contract-1"
});
assert.deepEqual(
  ownerResult,
  {
    status: "owner-verified",
    ownerChannelReference: "owner-channel-contract-1",
    checkedBy: "server-runtime-adapter",
    evidence: {
      ownedBroadcastLookup: "liveBroadcasts.list-mine-true",
      liveChatIdSource: "owned-broadcast-snippet-liveChatId"
    }
  },
  "adapter maps fake Google channel ownership into runtime owner verification"
);

const broadcasts = await googleApiAdapter.lookupOwnedBroadcasts({
  ownerChannelReference: "owner-channel-contract-1"
});
assert.equal(broadcasts.lookup, "liveBroadcasts.list-mine-true", "adapter keeps owned broadcast lookup boundary");
assert.equal(broadcasts.providerRequest, "forbidden", "adapter does not create provider requests");
assert.equal(broadcasts.broadcasts[0].liveChatId, "live-chat-contract-1", "adapter maps owned broadcasts");

const pollState = adapter.createInitialYouTubeLiveChatPollingState({
  liveChatId: "live-chat-contract-1",
  nowMs: 1_000
});
const pollResult = await googleApiAdapter.pollLiveChatOnce(pollState);
assert.equal(pollResult.state.nextPageToken, "page-token-contract-2", "adapter keeps nextPageToken in server state");
assert.deepEqual(
  pollResult.comments,
  [
    {
      commentId: "comment-contract-1",
      publishedAt: "2026-05-31T05:00:00.000Z",
      text: "Adapter contract comment",
      platformLanguageHint: "en"
    }
  ],
  "adapter emits sanitized provider-safe comment payload only"
);

assert.deepEqual(
  capturedRequests.map((request) => ({
    endpoint: request.endpoint,
    authorizationBinding: request.token.authorizationBinding,
    tokenValue: request.token.tokenValue,
    refreshTokenValue: request.token.refreshTokenValue,
    providerRequest: request.providerRequest
  })),
  [
    {
      endpoint: "channels.list-mine",
      authorizationBinding: "server-fetch-only",
      tokenValue: "never-returned-by-design",
      refreshTokenValue: "never-returned-by-design",
      providerRequest: "forbidden"
    },
    {
      endpoint: "liveBroadcasts.list-mine",
      authorizationBinding: "server-fetch-only",
      tokenValue: "never-returned-by-design",
      refreshTokenValue: "never-returned-by-design",
      providerRequest: "forbidden"
    },
    {
      endpoint: "liveChatMessages.list",
      authorizationBinding: "server-fetch-only",
      tokenValue: "never-returned-by-design",
      refreshTokenValue: "never-returned-by-design",
      providerRequest: "forbidden"
    }
  ],
  "fake Google API requests carry only server authorization bindings and no token values"
);

assert.equal(
  adapter.youtubeGoogleApiSafeLiveSmokePolicy.status,
  "not-run-in-this-slice",
  "live Google API smoke is explicitly not run in this design slice"
);
assert.ok(
  adapter.youtubeGoogleApiSafeLiveSmokePolicy.requiredConditions.includes(
    "server-only token resolver implementation that can obtain token material without returning it to callers"
  ),
  "live smoke policy requires a real server-only token resolver before live calls"
);
assert.ok(
  adapter.youtubeGoogleApiSafeLiveSmokePolicy.requiredConditions.includes(
    "encrypted server token store implemented and reviewed without schema changes hidden in this PR"
  ),
  "live smoke policy requires an encrypted token store implementation before live calls"
);
assert.match(
  taskSource,
  /YouTube Google API adapter \+ token reference resolver design/i,
  "task.md records the adapter and token reference resolver slice"
);
assert.match(
  taskSource,
  /safe live Google API smoke.*not run|safe live YouTube login \/ OAuth \/ owner verification \/ Live Chat polling smoke は未実施/i,
  "task.md records the live smoke unchecked scope"
);

const separateImplementationFiles = new Set([
  "lib/comment-translator-youtube-token-store-runtime.ts",
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
      assert.doesNotMatch(file, pattern, `API adapter design does not change forbidden path: ${file}`);
    }
  }

  if (!file.endsWith("comment-translator-youtube-api-adapter-token-reference-contract.mjs")) {
    const source = read(file);
    assert.doesNotMatch(
      source,
      /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]/i,
      `${file} does not contain token or service role material`
    );
  }
}

console.log("comment translator YouTube Google API adapter + token reference resolver contract checks passed");
