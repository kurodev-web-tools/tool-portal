import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const foundationPath = "lib/comment-translator-youtube-live-chat-target-lookup-foundation.ts";
const commandPath = "scripts/comment-translator-youtube-live-chat-target-lookup-command.mjs";

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

function parseJson(stdout) {
  assert.ok(stdout.trim().length > 0, "command writes JSON");
  return JSON.parse(stdout);
}

assert.ok(exists(foundationPath), "server-only Live Chat target lookup foundation exists");
assert.ok(exists(commandPath), "dedicated Live Chat target lookup command exists");

const foundationSource = read(foundationPath);
const commandSource = read(commandPath);

assert.match(foundationSource, /^import "server-only";/m, "Live Chat target lookup foundation is server-only");
assert.match(commandSource, /comment-translator-youtube-live-chat-target-lookup-foundation/, "command uses focused target lookup foundation");
assert.match(commandSource, /--approved-live-chat-target-lookup/, "command requires explicit in-thread approval flag");
assert.match(commandSource, /--check-env-only/, "command supports preflight-only mode");
assert.match(commandSource, /--check-owner-binding-only/, "command supports provider-fetch-free owner binding check");
assert.match(commandSource, /--check-token-material-availability/, "command supports provider-fetch-free token material check");

for (const forbidden of [
  "localStorage",
  "indexedDB",
  "sessionStorage",
  "OAuth2Client",
  "GoogleAuth",
  "refresh_token",
  "access_token",
  "liveChatMessages.list"
]) {
  assert.doesNotMatch(foundationSource, new RegExp(forbidden, "i"), `foundation does not add ${forbidden} coupling`);
  assert.doesNotMatch(commandSource, new RegExp(forbidden, "i"), `command does not add ${forbidden} coupling`);
}
assert.doesNotMatch(foundationSource, /from\s+["']googleapis["']|require\(["']googleapis["']\)/, "foundation does not import googleapis");
assert.doesNotMatch(commandSource, /from\s+["']googleapis["']|require\(["']googleapis["']\)/, "command does not import googleapis");

const foundation = loadTsModule(foundationPath);

for (const exportedName of [
  "youtubeLiveChatTargetLookupCommandFoundationContract",
  "createYouTubeLiveChatTargetLookupCommandRuntimeWiring",
  "assessYouTubeLiveChatTargetLookupReadinessGate",
  "assessYouTubeLiveChatTargetLookupTokenMaterialAvailabilityGate",
  "runYouTubeLiveChatTargetLookupFoundation"
]) {
  assert.equal(
    typeof foundation[exportedName],
    exportedName.startsWith("create") || exportedName.startsWith("run") || exportedName.startsWith("assess")
      ? "function"
      : "object",
    `foundation exports ${exportedName}`
  );
}

assert.deepEqual(
  foundation.youtubeLiveChatTargetLookupCommandFoundationContract,
  {
    implementationStage: "live-chat-target-lookup-command-foundation",
    commandPath,
    prerequisite: "owner-verification-smoke-success-before-live-chat-target-lookup",
    endpoint: "liveBroadcasts.list-mine-active",
    providerUrl: "https://www.googleapis.com/youtube/v3/liveBroadcasts",
    httpMethod: "GET",
    query: {
      part: "id,snippet,status",
      mine: "true",
      fields: "items(id,snippet(liveChatId),status(lifeCycleStatus,privacyStatus)),pageInfo(totalResults,resultsPerPage)"
    },
    outputPolicy: "sanitized-metadata-only",
    ownerBindingCheck: "trusted-status-provider-channel-match-before-live-chat-target-lookup",
    targetMetadataHandling: "live-chat-id-presence-only-never-returned",
    targetIdSource: "owned-broadcast-snippet-liveChatId",
    authorizationHandling: "server-only-header-consumed-never-returned",
    tokenValue: "never-returned-by-design",
    refreshTokenValue: "never-returned-by-design",
    requiredApproval: "same-thread-explicit-in-thread-approval",
    pollingExecution: "not-run",
    quotaWrite: "not-implemented",
    translatorPipelineWiring: "not-implemented",
    browserStorage: "unchanged"
  },
  "foundation contract fixes the Live Chat target lookup boundary"
);
assert.equal(
  "broadcastStatus" in foundation.youtubeLiveChatTargetLookupCommandFoundationContract.query,
  false,
  "liveBroadcasts.list request uses exactly one filter parameter"
);

let statusReadCount = 0;
let tokenMaterialResolutionCount = 0;
let providerFetchCount = 0;
const missingOwnerAuthorization = await foundation.runYouTubeLiveChatTargetLookupFoundation({
  credentialReferenceId: "smoke-livechat-target-reference",
  expectedProviderChannelReference: "provider-channel-reference-never-returned",
  ownerVerificationSmokeSuccess: true,
  ownerAuthorization: {
    status: "blocked",
    reason: "owner-authorization-preflight-not-confirmed"
  },
  credentialResolutionDisabled: false,
  requiredScope: "https://www.googleapis.com/auth/youtube.readonly",
  nowIso: "2026-06-09T00:00:00.000Z",
  trustedStatusReader: {
    async getCredentialStatus() {
      statusReadCount += 1;
      throw new Error("must not read status without owner authorization");
    }
  },
  tokenMaterialResolver: {
    async resolveServerOnlyTokenMaterial() {
      tokenMaterialResolutionCount += 1;
      throw new Error("must not resolve token material without owner authorization");
    }
  },
  async fetchGoogleApi() {
    providerFetchCount += 1;
    throw new Error("must not lookup target without owner authorization");
  }
});
assert.equal(missingOwnerAuthorization.status, "blocked-owner-authorization");
assert.equal(missingOwnerAuthorization.liveChatTargetLookup, "not-run");
assert.equal(missingOwnerAuthorization.providerAccess, "not-run");
assert.equal(statusReadCount, 0, "missing owner authorization aborts before status read");
assert.equal(tokenMaterialResolutionCount, 0, "missing owner authorization aborts before token material");
assert.equal(providerFetchCount, 0, "missing owner authorization aborts before provider fetch");

const missingOwnerVerificationSuccess = await foundation.runYouTubeLiveChatTargetLookupFoundation({
  credentialReferenceId: "smoke-livechat-target-reference",
  expectedProviderChannelReference: "provider-channel-reference-never-returned",
  ownerVerificationSmokeSuccess: false,
  ownerAuthorization: {
    status: "authorized",
    ownerUserId: "owner-reference-never-returned"
  },
  credentialResolutionDisabled: false,
  requiredScope: "https://www.googleapis.com/auth/youtube.readonly",
  nowIso: "2026-06-09T00:00:00.000Z",
  trustedStatusReader: {
    async getCredentialStatus() {
      statusReadCount += 1;
      throw new Error("must not read status before owner verification success prerequisite");
    }
  },
  tokenMaterialResolver: {
    async resolveServerOnlyTokenMaterial() {
      tokenMaterialResolutionCount += 1;
      throw new Error("must not resolve token material before owner verification success prerequisite");
    }
  },
  async fetchGoogleApi() {
    providerFetchCount += 1;
    throw new Error("must not lookup target before owner verification success prerequisite");
  }
});
assert.equal(missingOwnerVerificationSuccess.status, "blocked-owner-verification-smoke-success-prerequisite");
assert.equal(missingOwnerVerificationSuccess.providerAccess, "not-run");

const ownerMismatch = await foundation.runYouTubeLiveChatTargetLookupFoundation({
  credentialReferenceId: "smoke-livechat-target-reference",
  expectedProviderChannelReference: "provider-channel-reference-never-returned",
  ownerVerificationSmokeSuccess: true,
  ownerAuthorization: {
    status: "authorized",
    ownerUserId: "owner-reference-never-returned"
  },
  credentialResolutionDisabled: false,
  requiredScope: "https://www.googleapis.com/auth/youtube.readonly",
  nowIso: "2026-06-09T00:00:00.000Z",
  trustedStatusReader: {
    async getCredentialStatus() {
      return {
        credentialReferenceId: "smoke-livechat-target-reference",
        provider: "youtube",
        providerChannelId: "different-provider-channel-reference-never-returned",
        scopeLabel: "youtube.readonly",
        scopeSet: ["https://www.googleapis.com/auth/youtube.readonly"],
        expiresAtIso: "2026-06-09T00:05:00.000Z",
        expiryStatus: "active",
        revoked: false,
        revokedAtIso: null,
        tokenValue: "never-returned-by-design",
        refreshTokenValue: "never-returned-by-design",
        ciphertext: "never-returned-by-design",
        decryptCapability: "forbidden"
      };
    }
  },
  tokenMaterialResolver: {
    async resolveServerOnlyTokenMaterial() {
      tokenMaterialResolutionCount += 1;
      throw new Error("must not resolve token material while owner binding mismatches");
    }
  },
  async fetchGoogleApi() {
    providerFetchCount += 1;
    throw new Error("must not lookup target while owner binding mismatches");
  }
});
assert.equal(ownerMismatch.status, "owner-verification-mismatch-aborted");
assert.equal(ownerMismatch.providerAccess, "not-run");

const tokenUnavailable = await foundation.runYouTubeLiveChatTargetLookupFoundation({
  credentialReferenceId: "smoke-livechat-target-reference",
  expectedProviderChannelReference: "provider-channel-reference-never-returned",
  ownerVerificationSmokeSuccess: true,
  ownerAuthorization: {
    status: "authorized",
    ownerUserId: "owner-reference-never-returned"
  },
  credentialResolutionDisabled: false,
  requiredScope: "https://www.googleapis.com/auth/youtube.readonly",
  nowIso: "2026-06-09T00:00:00.000Z",
  trustedStatusReader: {
    async getCredentialStatus() {
      return {
        credentialReferenceId: "smoke-livechat-target-reference",
        provider: "youtube",
        providerChannelId: "provider-channel-reference-never-returned",
        scopeLabel: "youtube.readonly",
        scopeSet: ["https://www.googleapis.com/auth/youtube.readonly"],
        expiresAtIso: "2026-06-09T00:05:00.000Z",
        expiryStatus: "active",
        revoked: false,
        revokedAtIso: null,
        tokenValue: "never-returned-by-design",
        refreshTokenValue: "never-returned-by-design",
        ciphertext: "never-returned-by-design",
        decryptCapability: "forbidden"
      };
    }
  },
  tokenMaterialResolver: {
    async resolveServerOnlyTokenMaterial() {
      return {
        status: "unavailable",
        reason: "operator-local token material not available"
      };
    }
  },
  async fetchGoogleApi() {
    providerFetchCount += 1;
    throw new Error("must not lookup target without token material");
  }
});
assert.equal(tokenUnavailable.status, "unavailable");
assert.equal(tokenUnavailable.liveChatTargetLookup, "not-run");
assert.equal(tokenUnavailable.providerAccess, "not-run");

const consumedAuthorizationHeaders = [];
const noActiveBroadcast = await foundation.runYouTubeLiveChatTargetLookupFoundation({
  credentialReferenceId: "smoke-livechat-target-reference",
  expectedProviderChannelReference: "provider-channel-reference-never-returned",
  ownerVerificationSmokeSuccess: true,
  ownerAuthorization: {
    status: "authorized",
    ownerUserId: "owner-reference-never-returned"
  },
  credentialResolutionDisabled: false,
  requiredScope: "https://www.googleapis.com/auth/youtube.readonly",
  nowIso: "2026-06-09T00:00:00.000Z",
  trustedStatusReader: {
    async getCredentialStatus() {
      return {
        credentialReferenceId: "smoke-livechat-target-reference",
        provider: "youtube",
        providerChannelId: "provider-channel-reference-never-returned",
        scopeLabel: "youtube.readonly",
        scopeSet: ["https://www.googleapis.com/auth/youtube.readonly"],
        expiresAtIso: "2026-06-09T00:05:00.000Z",
        expiryStatus: "active",
        revoked: false,
        revokedAtIso: null,
        tokenValue: "never-returned-by-design",
        refreshTokenValue: "never-returned-by-design",
        ciphertext: "never-returned-by-design",
        decryptCapability: "forbidden"
      };
    }
  },
  tokenMaterialResolver: {
    async resolveServerOnlyTokenMaterial() {
      return {
        status: "available",
        serverAuthorizationHeader: "server-only-test-authorization",
        expiresAtIso: "2026-06-09T00:05:00.000Z"
      };
    }
  },
  async fetchGoogleApi(requestToFetch) {
    consumedAuthorizationHeaders.push(requestToFetch.headers.Authorization);
    return {
      ok: true,
      status: 200,
      body: {
        pageInfo: {
          totalResults: 0,
          resultsPerPage: 0
        },
        items: []
      }
    };
  }
});
assert.equal(noActiveBroadcast.status, "blocked-no-active-owned-broadcast");
assert.equal(noActiveBroadcast.liveChatTargetLookup, "lookup-completed-no-usable-target");
assert.equal(noActiveBroadcast.liveChatTarget, "absent");
assert.equal(noActiveBroadcast.providerAccess, "liveBroadcasts-list-target-lookup-only");

const missingLiveChatTarget = await foundation.runYouTubeLiveChatTargetLookupFoundation({
  credentialReferenceId: "smoke-livechat-target-reference",
  expectedProviderChannelReference: "provider-channel-reference-never-returned",
  ownerVerificationSmokeSuccess: true,
  ownerAuthorization: {
    status: "authorized",
    ownerUserId: "owner-reference-never-returned"
  },
  credentialResolutionDisabled: false,
  requiredScope: "https://www.googleapis.com/auth/youtube.readonly",
  nowIso: "2026-06-09T00:00:00.000Z",
  trustedStatusReader: {
    async getCredentialStatus() {
      return {
        credentialReferenceId: "smoke-livechat-target-reference",
        provider: "youtube",
        providerChannelId: "provider-channel-reference-never-returned",
        scopeLabel: "youtube.readonly",
        scopeSet: ["https://www.googleapis.com/auth/youtube.readonly"],
        expiresAtIso: "2026-06-09T00:05:00.000Z",
        expiryStatus: "active",
        revoked: false,
        revokedAtIso: null,
        tokenValue: "never-returned-by-design",
        refreshTokenValue: "never-returned-by-design",
        ciphertext: "never-returned-by-design",
        decryptCapability: "forbidden"
      };
    }
  },
  tokenMaterialResolver: {
    async resolveServerOnlyTokenMaterial() {
      return {
        status: "available",
        serverAuthorizationHeader: "server-only-test-authorization",
        expiresAtIso: "2026-06-09T00:05:00.000Z"
      };
    }
  },
  async fetchGoogleApi(requestToFetch) {
    consumedAuthorizationHeaders.push(requestToFetch.headers.Authorization);
    return {
      ok: true,
      status: 200,
      body: {
        pageInfo: {
          totalResults: 1,
          resultsPerPage: 1
        },
        items: [
          {
            id: "broadcast-id-never-returned",
            snippet: {},
            status: {
              lifeCycleStatus: "live",
              privacyStatus: "public"
            }
          }
        ]
      }
    };
  }
});
assert.equal(missingLiveChatTarget.status, "blocked-missing-or-disabled-live-chat-target");
assert.equal(missingLiveChatTarget.liveChatTarget, "absent");
assert.equal(missingLiveChatTarget.pollingExecution, "not-run");

const noActiveOwnedBroadcast = await foundation.runYouTubeLiveChatTargetLookupFoundation({
  credentialReferenceId: "smoke-livechat-target-reference",
  expectedProviderChannelReference: "provider-channel-reference-never-returned",
  ownerVerificationSmokeSuccess: true,
  ownerAuthorization: {
    status: "authorized",
    ownerUserId: "owner-reference-never-returned"
  },
  credentialResolutionDisabled: false,
  requiredScope: "https://www.googleapis.com/auth/youtube.readonly",
  nowIso: "2026-06-09T00:00:00.000Z",
  trustedStatusReader: {
    async getCredentialStatus() {
      return {
        credentialReferenceId: "smoke-livechat-target-reference",
        provider: "youtube",
        providerChannelId: "provider-channel-reference-never-returned",
        scopeLabel: "youtube.readonly",
        scopeSet: ["https://www.googleapis.com/auth/youtube.readonly"],
        expiresAtIso: "2026-06-09T00:05:00.000Z",
        expiryStatus: "active",
        revoked: false,
        revokedAtIso: null,
        tokenValue: "never-returned-by-design",
        refreshTokenValue: "never-returned-by-design",
        ciphertext: "never-returned-by-design",
        decryptCapability: "forbidden"
      };
    }
  },
  tokenMaterialResolver: {
    async resolveServerOnlyTokenMaterial() {
      return {
        status: "available",
        serverAuthorizationHeader: "server-only-test-authorization",
        expiresAtIso: "2026-06-09T00:05:00.000Z"
      };
    }
  },
  async fetchGoogleApi(requestToFetch) {
    consumedAuthorizationHeaders.push(requestToFetch.headers.Authorization);
    return {
      ok: true,
      status: 200,
      body: {
        pageInfo: {
          totalResults: 1,
          resultsPerPage: 1
        },
        items: [
          {
            id: "broadcast-id-never-returned",
            snippet: {
              liveChatId: "live-chat-id-never-returned"
            },
            status: {
              lifeCycleStatus: "ready",
              privacyStatus: "public"
            }
          }
        ]
      }
    };
  }
});
assert.equal(noActiveOwnedBroadcast.status, "blocked-no-active-owned-broadcast");
assert.equal(noActiveOwnedBroadcast.liveChatTarget, "absent");
assert.equal(noActiveOwnedBroadcast.liveChatTargetLookup, "lookup-completed-no-usable-target");

const liveStreamingNotEnabled = await foundation.runYouTubeLiveChatTargetLookupFoundation({
  credentialReferenceId: "smoke-livechat-target-reference",
  expectedProviderChannelReference: "provider-channel-reference-never-returned",
  ownerVerificationSmokeSuccess: true,
  ownerAuthorization: {
    status: "authorized",
    ownerUserId: "owner-reference-never-returned"
  },
  credentialResolutionDisabled: false,
  requiredScope: "https://www.googleapis.com/auth/youtube.readonly",
  nowIso: "2026-06-09T00:00:00.000Z",
  trustedStatusReader: {
    async getCredentialStatus() {
      return {
        credentialReferenceId: "smoke-livechat-target-reference",
        provider: "youtube",
        providerChannelId: "provider-channel-reference-never-returned",
        scopeLabel: "youtube.readonly",
        scopeSet: ["https://www.googleapis.com/auth/youtube.readonly"],
        expiresAtIso: "2026-06-09T00:05:00.000Z",
        expiryStatus: "active",
        revoked: false,
        revokedAtIso: null,
        tokenValue: "never-returned-by-design",
        refreshTokenValue: "never-returned-by-design",
        ciphertext: "never-returned-by-design",
        decryptCapability: "forbidden"
      };
    }
  },
  tokenMaterialResolver: {
    async resolveServerOnlyTokenMaterial() {
      return {
        status: "available",
        serverAuthorizationHeader: "server-only-test-authorization",
        expiresAtIso: "2026-06-09T00:05:00.000Z"
      };
    }
  },
  async fetchGoogleApi(requestToFetch) {
    consumedAuthorizationHeaders.push(requestToFetch.headers.Authorization);
    return {
      ok: false,
      status: 403,
      body: {
        error: {
          errors: [
            {
              reason: "liveStreamingNotEnabled",
              message: "must-not-cross"
            }
          ],
          message: "must-not-cross"
        }
      }
    };
  }
});
assert.equal(liveStreamingNotEnabled.status, "blocked-live-streaming-not-enabled");
assert.equal(liveStreamingNotEnabled.providerErrorReason, "liveStreamingNotEnabled");
assert.equal(liveStreamingNotEnabled.liveChatTarget, "absent");
assert.equal(liveStreamingNotEnabled.pollingExecution, "not-run");

const genericProviderHttpFailure = await foundation.runYouTubeLiveChatTargetLookupFoundation({
  credentialReferenceId: "smoke-livechat-target-reference",
  expectedProviderChannelReference: "provider-channel-reference-never-returned",
  ownerVerificationSmokeSuccess: true,
  ownerAuthorization: {
    status: "authorized",
    ownerUserId: "owner-reference-never-returned"
  },
  credentialResolutionDisabled: false,
  requiredScope: "https://www.googleapis.com/auth/youtube.readonly",
  nowIso: "2026-06-09T00:00:00.000Z",
  trustedStatusReader: {
    async getCredentialStatus() {
      return {
        credentialReferenceId: "smoke-livechat-target-reference",
        provider: "youtube",
        providerChannelId: "provider-channel-reference-never-returned",
        scopeLabel: "youtube.readonly",
        scopeSet: ["https://www.googleapis.com/auth/youtube.readonly"],
        expiresAtIso: "2026-06-09T00:05:00.000Z",
        expiryStatus: "active",
        revoked: false,
        revokedAtIso: null,
        tokenValue: "never-returned-by-design",
        refreshTokenValue: "never-returned-by-design",
        ciphertext: "never-returned-by-design",
        decryptCapability: "forbidden"
      };
    }
  },
  tokenMaterialResolver: {
    async resolveServerOnlyTokenMaterial() {
      return {
        status: "available",
        serverAuthorizationHeader: "server-only-test-authorization",
        expiresAtIso: "2026-06-09T00:05:00.000Z"
      };
    }
  },
  async fetchGoogleApi(requestToFetch) {
    consumedAuthorizationHeaders.push(requestToFetch.headers.Authorization);
    return {
      ok: false,
      status: 401,
      body: {
        error: {
          errors: [
            {
              reason: "authErrorShouldNotCross",
              message: "must-not-cross"
            }
          ],
          message: "must-not-cross"
        }
      }
    };
  }
});
assert.equal(genericProviderHttpFailure.status, "live-chat-target-lookup-failed-sanitized");
assert.equal(genericProviderHttpFailure.providerErrorReason, "not-returned-by-design");
assert.deepEqual(genericProviderHttpFailure.failureMetadata, {
  providerFailureClass: "http-error",
  httpStatus: 401,
  ok: false
});

const providerFetchException = await foundation.runYouTubeLiveChatTargetLookupFoundation({
  credentialReferenceId: "smoke-livechat-target-reference",
  expectedProviderChannelReference: "provider-channel-reference-never-returned",
  ownerVerificationSmokeSuccess: true,
  ownerAuthorization: {
    status: "authorized",
    ownerUserId: "owner-reference-never-returned"
  },
  credentialResolutionDisabled: false,
  requiredScope: "https://www.googleapis.com/auth/youtube.readonly",
  nowIso: "2026-06-09T00:00:00.000Z",
  trustedStatusReader: {
    async getCredentialStatus() {
      return {
        credentialReferenceId: "smoke-livechat-target-reference",
        provider: "youtube",
        providerChannelId: "provider-channel-reference-never-returned",
        scopeLabel: "youtube.readonly",
        scopeSet: ["https://www.googleapis.com/auth/youtube.readonly"],
        expiresAtIso: "2026-06-09T00:05:00.000Z",
        expiryStatus: "active",
        revoked: false,
        revokedAtIso: null,
        tokenValue: "never-returned-by-design",
        refreshTokenValue: "never-returned-by-design",
        ciphertext: "never-returned-by-design",
        decryptCapability: "forbidden"
      };
    }
  },
  tokenMaterialResolver: {
    async resolveServerOnlyTokenMaterial() {
      return {
        status: "available",
        serverAuthorizationHeader: "server-only-test-authorization",
        expiresAtIso: "2026-06-09T00:05:00.000Z"
      };
    }
  },
  async fetchGoogleApi(requestToFetch) {
    consumedAuthorizationHeaders.push(requestToFetch.headers.Authorization);
    throw new Error("must-not-cross");
  }
});
assert.equal(providerFetchException.status, "live-chat-target-lookup-failed-sanitized");
assert.equal(providerFetchException.providerErrorReason, "not-returned-by-design");
assert.deepEqual(providerFetchException.failureMetadata, {
  providerFailureClass: "fetch-exception",
  httpStatus: null,
  ok: false
});

const success = await foundation.runYouTubeLiveChatTargetLookupFoundation({
  credentialReferenceId: "smoke-livechat-target-reference",
  expectedProviderChannelReference: "provider-channel-reference-never-returned",
  ownerVerificationSmokeSuccess: true,
  ownerAuthorization: {
    status: "authorized",
    ownerUserId: "owner-reference-never-returned"
  },
  credentialResolutionDisabled: false,
  requiredScope: "https://www.googleapis.com/auth/youtube.readonly",
  nowIso: "2026-06-09T00:00:00.000Z",
  trustedStatusReader: {
    async getCredentialStatus() {
      return {
        credentialReferenceId: "smoke-livechat-target-reference",
        provider: "youtube",
        providerChannelId: "provider-channel-reference-never-returned",
        scopeLabel: "youtube.readonly",
        scopeSet: ["https://www.googleapis.com/auth/youtube.readonly"],
        expiresAtIso: "2026-06-09T00:05:00.000Z",
        expiryStatus: "active",
        revoked: false,
        revokedAtIso: null,
        tokenValue: "never-returned-by-design",
        refreshTokenValue: "never-returned-by-design",
        ciphertext: "never-returned-by-design",
        decryptCapability: "forbidden"
      };
    }
  },
  tokenMaterialResolver: {
    async resolveServerOnlyTokenMaterial() {
      return {
        status: "available",
        serverAuthorizationHeader: "server-only-test-authorization",
        expiresAtIso: "2026-06-09T00:05:00.000Z"
      };
    }
  },
  async fetchGoogleApi(requestToFetch) {
    consumedAuthorizationHeaders.push(requestToFetch.headers.Authorization);
    return {
      ok: true,
      status: 200,
      body: {
        pageInfo: {
          totalResults: 3,
          resultsPerPage: 3
        },
        items: [
          {
            id: "broadcast-id-without-target-never-returned",
            snippet: {},
            status: {
              lifeCycleStatus: "live",
              privacyStatus: "public"
            }
          },
          {
            id: "broadcast-id-never-returned",
            snippet: {
              liveChatId: "live-chat-id-never-returned"
            },
            status: {
              lifeCycleStatus: "live",
              privacyStatus: "unlisted"
            }
          },
          {
            id: "ready-broadcast-id-never-returned",
            snippet: {
              liveChatId: "live-chat-id-never-returned"
            },
            status: {
              lifeCycleStatus: "ready",
              privacyStatus: "private"
            }
          }
        ]
      }
    };
  }
});
assert.equal(consumedAuthorizationHeaders.length, 7, "provider fetch only occurs in approved target lookup paths");
assert.equal(success.status, "live-chat-target-lookup-sanitized-result");
assert.equal(success.ownerBinding, "verified-before-live-chat-target-lookup");
assert.equal(success.liveChatTargetLookup, "executed-bounded-readonly-one-step");
assert.equal(success.providerAccess, "liveBroadcasts-list-target-lookup-only");
assert.deepEqual(success.responseMetadata, {
  httpStatus: 200,
  ok: true,
  activeOwnedBroadcast: "present",
  liveChatTarget: "present",
  returnedItemCount: 3,
  usableTargetCount: 1,
  pageInfoTotalResults: 3,
  selectedTargetSourceLabel: "first-live-owned-broadcast-with-live-chat-target",
  selectedTargetRankLabel: "rank-2",
  selectedTargetPresenceLabel: "present",
  lifecycleStatusDistribution: {
    live: 2,
    ready: 1
  },
  privacyStatusDistribution: {
    public: 1,
    unlisted: 1,
    private: 1
  },
  broadcastLifecycleStatus: "present",
  privacyStatus: "present",
  targetIdValue: "not-returned-by-design"
});

for (const payload of [
  missingOwnerAuthorization,
  missingOwnerVerificationSuccess,
  ownerMismatch,
  tokenUnavailable,
  noActiveBroadcast,
  missingLiveChatTarget,
  noActiveOwnedBroadcast,
  liveStreamingNotEnabled,
  genericProviderHttpFailure,
  providerFetchException,
  success
]) {
  const serialized = JSON.stringify(payload);
  for (const forbiddenValue of [
    "server-only-test-authorization",
    "owner-reference-never-returned",
    "provider-channel-reference-never-returned",
    "different-provider-channel-reference-never-returned",
    "broadcast-id-never-returned",
    "live-chat-id-never-returned",
    "must-not-cross",
    "serverAuthorizationHeader",
    "ownerUserId",
    "providerChannelId",
    "liveChatId"
  ]) {
    assert.doesNotMatch(serialized, new RegExp(forbiddenValue), `sanitized result does not include ${forbiddenValue}`);
  }
  assert.doesNotMatch(serialized, /"Authorization"\s*:/, "output does not include raw Authorization header field");
  assert.equal(payload.tokenValue, "never-returned-by-design", "output never prints token values");
  assert.equal(payload.refreshTokenValue, "never-returned-by-design", "output never prints refresh token values");
  assert.equal(payload.pollingExecution, "not-run", "target lookup never runs polling");
}

const readyEnv = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: "present",
  SUPABASE_SERVICE_ROLE_KEY: "present",
  YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED: "false",
  YOUTUBE_OAUTH_SMOKE_CREDENTIAL_REFERENCE_ID: "smoke-targetlookup-command-20260609",
  YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID: "present",
  YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID: "present",
  YOUTUBE_LIVE_RUNTIME_SMOKE_OWNER_AUTHORIZATION_CONFIRMED: "confirmed",
  YOUTUBE_OWNER_VERIFICATION_SMOKE_SUCCESS_CONFIRMED: "confirmed",
  YOUTUBE_LIVE_CHAT_TARGET_LOOKUP_READY_PREFLIGHT_CONFIRMED: "confirmed"
};

const checkEnv = spawnSync(process.execPath, [commandPath, "--check-env-only", "--json"], {
  cwd: root,
  env: readyEnv,
  encoding: "utf8"
});
assert.equal(checkEnv.status, 0, "Live Chat target lookup command preflight passes with reference-only env");
const checkEnvPayload = parseJson(checkEnv.stdout);
assert.equal(checkEnvPayload.status, "ready-for-bounded-live-chat-target-lookup-command-foundation");
assert.equal(checkEnvPayload.command, "sanitized-youtube-live-chat-target-lookup");
assert.equal(checkEnvPayload.endpoint, "liveBroadcasts.list-mine-active");
assert.equal(checkEnvPayload.outputPolicy, "sanitized-metadata-only");
assert.equal(checkEnvPayload.liveChatTargetLookup, "not-run-preflight-only");
assert.equal(checkEnvPayload.liveChatTarget, "unknown-until-approved-lookup");

const tokenMaterialAvailability = spawnSync(
  process.execPath,
  [commandPath, "--check-token-material-availability", "--json"],
  {
    cwd: root,
    env: readyEnv,
    encoding: "utf8"
  }
);
assert.equal(tokenMaterialAvailability.status, 2, "token material availability remains blocked while token material is unavailable");
const tokenMaterialAvailabilityPayload = parseJson(tokenMaterialAvailability.stdout);
assert.equal(tokenMaterialAvailabilityPayload.status, "unavailable");
assert.equal(tokenMaterialAvailabilityPayload.liveChatTargetLookup, "not-run-token-material-availability-only");
assert.equal(tokenMaterialAvailabilityPayload.providerAccess, "not-run-token-material-availability-only");

const operatorLocalReadyEnv = {
  ...readyEnv,
  YOUTUBE_LIVE_CHAT_TARGET_LOOKUP_OPERATOR_LOCAL_SERVER_AUTHORIZATION_HEADER: "server-only-test-authorization",
  YOUTUBE_LIVE_CHAT_TARGET_LOOKUP_OPERATOR_LOCAL_TOKEN_EXPIRES_AT_ISO: "2099-06-10T00:05:00.000Z"
};
const operatorLocalTokenMaterialAvailability = spawnSync(
  process.execPath,
  [commandPath, "--check-token-material-availability", "--json"],
  {
    cwd: root,
    env: operatorLocalReadyEnv,
    encoding: "utf8"
  }
);
assert.equal(operatorLocalTokenMaterialAvailability.status, 0, "operator-local token material availability passes without provider access");
const operatorLocalTokenMaterialAvailabilityPayload = parseJson(operatorLocalTokenMaterialAvailability.stdout);
assert.equal(operatorLocalTokenMaterialAvailabilityPayload.status, "live-chat-target-lookup-token-material-available");
assert.equal(operatorLocalTokenMaterialAvailabilityPayload.providerAccess, "not-run-token-material-availability-only");

const executeWithoutApproval = spawnSync(process.execPath, [commandPath, "--execute", "--json"], {
  cwd: root,
  env: operatorLocalReadyEnv,
  encoding: "utf8"
});
assert.equal(executeWithoutApproval.status, 2, "Live Chat target lookup command blocks execute without explicit approval flag");
const executeWithoutApprovalPayload = parseJson(executeWithoutApproval.stdout);
assert.equal(executeWithoutApprovalPayload.status, "blocked-pending-explicit-live-chat-target-lookup-approval");
assert.equal(executeWithoutApprovalPayload.requiredFlag, "--approved-live-chat-target-lookup");
assert.equal(executeWithoutApprovalPayload.providerAccess, "not-run");

for (const payload of [
  checkEnvPayload,
  tokenMaterialAvailabilityPayload,
  operatorLocalTokenMaterialAvailabilityPayload,
  executeWithoutApprovalPayload
]) {
  const serialized = JSON.stringify(payload);
  for (const forbiddenField of [
    "ownerUserId",
    "providerChannelId",
    "serviceRoleKey",
    "serverAuthorizationHeader",
    "accessToken",
    "liveChatId"
  ]) {
    assert.doesNotMatch(serialized, new RegExp(forbiddenField, "i"), `command output does not include ${forbiddenField}`);
  }
  assert.doesNotMatch(serialized, /server-only-test-authorization|"Authorization"\s*:/, "command output does not include raw Authorization header field or value");
  assert.equal(payload.tokenValue, "never-returned-by-design", "command output never prints token values");
  assert.equal(payload.refreshTokenValue, "never-returned-by-design", "command output never prints refresh token values");
}

console.log("comment translator YouTube Live Chat target lookup command contract checks passed");
