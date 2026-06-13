import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const foundationPath = "lib/comment-translator-youtube-google-api-live-call-foundation.ts";
const commandPath = "scripts/comment-translator-youtube-google-api-live-call-command.mjs";
const tokenResolutionOnlyCommandPath = "scripts/comment-translator-youtube-live-runtime-smoke-command.mjs";

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

assert.ok(exists(foundationPath), "server-only actual Google API live call foundation exists");
assert.ok(exists(commandPath), "dedicated actual Google API live call command exists");
assert.ok(exists(tokenResolutionOnlyCommandPath), "existing token-resolution-only command remains available");

const foundationSource = read(foundationPath);
const commandSource = read(commandPath);
const tokenResolutionOnlyCommandSource = read(tokenResolutionOnlyCommandPath);

assert.match(foundationSource, /^import "server-only";/m, "live call foundation is server-only");
assert.match(commandSource, /comment-translator-youtube-google-api-live-call-foundation/, "command uses the focused live call foundation");
assert.match(commandSource, /--approved-live-google-api-call/, "command requires explicit in-thread approval flag");
assert.match(commandSource, /--check-env-only/, "command supports preflight-only mode");
assert.match(
  tokenResolutionOnlyCommandSource,
  /actualSafeLiveRuntimeSmoke:\s*"not-run-token-resolution-only"/,
  "existing smoke command remains token-resolution-only"
);
assert.match(
  tokenResolutionOnlyCommandSource,
  /googleApiLiveCall:\s*"not-run"/,
  "existing smoke command does not overclaim Google API execution"
);

for (const forbidden of [
  "localStorage",
  "indexedDB",
  "sessionStorage",
  "OAuth2Client",
  "GoogleAuth",
  "refresh_token",
  "access_token"
]) {
  assert.doesNotMatch(foundationSource, new RegExp(forbidden, "i"), `foundation does not add ${forbidden} coupling`);
  assert.doesNotMatch(commandSource, new RegExp(forbidden, "i"), `command does not add ${forbidden} coupling`);
}
assert.doesNotMatch(foundationSource, /from\s+["']googleapis["']|require\(["']googleapis["']\)/, "foundation does not import the googleapis package");
assert.doesNotMatch(commandSource, /from\s+["']googleapis["']|require\(["']googleapis["']\)/, "command does not import the googleapis package");

const foundation = loadTsModule(foundationPath);

for (const exportedName of [
  "youtubeGoogleApiLiveCallCommandFoundationContract",
  "createYouTubeChannelsListMineLiveCallRequest",
  "createYouTubeGoogleApiLiveCallCommandRuntimeWiring",
  "assessYouTubeGoogleApiLiveTokenMaterialAvailabilityGate",
  "runYouTubeGoogleApiLiveCallFoundation"
]) {
  assert.equal(
    typeof foundation[exportedName],
    exportedName.startsWith("create") || exportedName.startsWith("run") || exportedName.startsWith("assess")
      ? "function"
      : "object",
    `foundation exports ${exportedName}`
  );
}

assert.doesNotMatch(
  commandSource,
  /server-only live token material resolver is not connected in this command foundation/,
  "command no longer uses an inline not-connected resolver stub"
);
assert.match(
  commandSource,
  /createYouTubeGoogleApiLiveCallCommandRuntimeWiring/,
  "command builds approved execution dependencies through the server-only runtime wiring helper"
);
assert.match(
  commandSource,
  /--check-token-material-availability/,
  "command supports a provider-fetch-free token material availability gate"
);
assert.match(
  foundationSource,
  /createOperatorLocalYouTubeGoogleApiLiveTokenMaterialResolver/,
  "foundation exposes an explicit operator-local token material resolver boundary"
);
assert.match(
  commandSource,
  /YOUTUBE_GOOGLE_API_LIVE_CALL_OPERATOR_LOCAL_SERVER_AUTHORIZATION_HEADER/,
  "command can read operator-local token material from a server-only env reference"
);

assert.deepEqual(
  foundation.youtubeGoogleApiLiveCallCommandFoundationContract,
  {
    implementationStage: "actual-google-api-live-call-command-foundation",
    commandPath,
    currentTokenResolutionOnlyCommandPath: tokenResolutionOnlyCommandPath,
    endpoint: "channels.list-mine",
    providerUrl: "https://www.googleapis.com/youtube/v3/channels",
    httpMethod: "GET",
    query: {
      part: "id,status",
      mine: "true",
      fields: "items(id,status),pageInfo(totalResults,resultsPerPage)"
    },
    outputPolicy: "sanitized-metadata-only",
    authorizationHandling: "server-only-header-consumed-never-returned",
    tokenValue: "never-returned-by-design",
    refreshTokenValue: "never-returned-by-design",
    requiredApproval: "same-thread-explicit-in-thread-approval",
    liveChatPollingSmoke: "not-run",
    ownerVerificationSmoke: "not-run",
    quotaWrite: "not-implemented",
    browserStorage: "unchanged"
  },
  "foundation contract fixes one bounded readonly channels.list mine endpoint"
);

const request = foundation.createYouTubeChannelsListMineLiveCallRequest({
  serverAuthorizationHeader: "server-only-test-authorization"
});
assert.equal(request.endpoint, "channels.list-mine", "request endpoint is bounded");
assert.equal(request.method, "GET", "request uses GET");
assert.equal(request.url, "https://www.googleapis.com/youtube/v3/channels?part=id%2Cstatus&mine=true&fields=items%28id%2Cstatus%29%2CpageInfo%28totalResults%2CresultsPerPage%29", "request URL is deterministic");
assert.deepEqual(request.query, foundation.youtubeGoogleApiLiveCallCommandFoundationContract.query, "request query matches contract");
assert.equal(request.headers.Authorization, "server-only-test-authorization", "server-only header is available only to provider fetch");

const consumedAuthorizationHeaders = [];
const liveCallResult = await foundation.runYouTubeGoogleApiLiveCallFoundation({
  credentialReferenceId: "smoke-command-livecall-reference",
  ownerAuthorization: {
    status: "authorized",
    ownerUserId: "owner-reference-never-returned"
  },
  credentialResolutionDisabled: false,
  requiredScope: "https://www.googleapis.com/auth/youtube.readonly",
  nowIso: "2026-06-08T00:00:00.000Z",
  trustedStatusReader: {
    async getCredentialStatus() {
      return {
        credentialReferenceId: "smoke-command-livecall-reference",
        provider: "youtube",
        providerChannelId: "provider-channel-reference-never-returned",
        scopeLabel: "youtube.readonly",
        scopeSet: ["https://www.googleapis.com/auth/youtube.readonly"],
        expiresAtIso: "2026-06-08T00:05:00.000Z",
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
        expiresAtIso: "2026-06-08T00:05:00.000Z"
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
            id: "provider-channel-reference-never-returned",
            status: {
              longUploadsStatus: "allowed",
              madeForKids: false
            }
          }
        ]
      }
    };
  }
});

assert.deepEqual(consumedAuthorizationHeaders, ["server-only-test-authorization"], "provider fetch consumes server-only authorization exactly once");
assert.equal(liveCallResult.status, "google-api-live-call-sanitized-result", "foundation can run a bounded readonly live call through injected server fetch");
assert.equal(liveCallResult.googleApiLiveCall, "executed-bounded-readonly");
assert.equal(liveCallResult.endpoint, "channels.list-mine");
assert.equal(liveCallResult.providerUrl, "https://www.googleapis.com/youtube/v3/channels");
assert.equal(liveCallResult.httpMethod, "GET");
assert.equal(liveCallResult.serverFetchBinding, "resolved-for-server-fetch");
assert.equal(liveCallResult.outputPolicy, "sanitized-metadata-only");
assert.deepEqual(liveCallResult.responseMetadata, {
  httpStatus: 200,
  ok: true,
  channelReference: "present",
  returnedItemCount: 1,
  pageInfoTotalResults: 1,
  longUploadsStatus: "present",
  madeForKids: "present"
});

const serializedLiveCall = JSON.stringify(liveCallResult);
for (const forbiddenValue of [
  "server-only-test-authorization",
  "owner-reference-never-returned",
  "provider-channel-reference-never-returned",
  "Authorization",
  "serverAuthorizationHeader"
]) {
  assert.doesNotMatch(serializedLiveCall, new RegExp(forbiddenValue), `sanitized result does not include ${forbiddenValue}`);
}
assert.equal(liveCallResult.tokenValue, "never-returned-by-design", "token marker remains non-secret");
assert.equal(liveCallResult.refreshTokenValue, "never-returned-by-design", "refresh token marker remains non-secret");
assert.equal(liveCallResult.safeLiveYouTubeOAuthSmoke, "not-run", "safe live smoke remains separate");
assert.equal(liveCallResult.ownerVerificationSmoke, "not-run", "owner verification smoke remains separate");
assert.equal(liveCallResult.liveChatPollingSmoke, "not-run", "live chat polling remains separate");
assert.equal(liveCallResult.remoteMigrationApply, "not-run", "remote mutations remain out of scope");

const availabilityGate = await foundation.assessYouTubeGoogleApiLiveTokenMaterialAvailabilityGate({
  credentialReferenceId: "smoke-command-livecall-reference",
  ownerAuthorization: {
    status: "authorized",
    ownerUserId: "owner-reference-never-returned"
  },
  credentialResolutionDisabled: false,
  requiredScope: "https://www.googleapis.com/auth/youtube.readonly",
  nowIso: "2026-06-08T00:00:00.000Z",
  trustedStatusReader: {
    async getCredentialStatus() {
      return {
        credentialReferenceId: "smoke-command-livecall-reference",
        provider: "youtube",
        providerChannelId: "provider-channel-reference-never-returned",
        scopeLabel: "youtube.readonly",
        scopeSet: ["https://www.googleapis.com/auth/youtube.readonly"],
        expiresAtIso: "2026-06-08T00:05:00.000Z",
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
        expiresAtIso: "2026-06-08T00:05:00.000Z"
      };
    }
  }
});
assert.equal(availabilityGate.status, "token-material-available");
assert.equal(availabilityGate.serverFetchBinding, "resolved-for-server-fetch");
assert.equal(availabilityGate.googleApiLiveCall, "not-run-token-material-availability-only");
assert.equal(availabilityGate.tokenValue, "never-returned-by-design");
assert.equal(availabilityGate.refreshTokenValue, "never-returned-by-design");
const serializedAvailabilityGate = JSON.stringify(availabilityGate);
for (const forbiddenValue of [
  "server-only-test-authorization",
  "owner-reference-never-returned",
  "provider-channel-reference-never-returned",
  "Authorization",
  "serverAuthorizationHeader"
]) {
  assert.doesNotMatch(serializedAvailabilityGate, new RegExp(forbiddenValue), `availability gate does not include ${forbiddenValue}`);
}

const blockedResult = await foundation.runYouTubeGoogleApiLiveCallFoundation({
  credentialReferenceId: "smoke-command-livecall-reference",
  ownerAuthorization: {
    status: "blocked",
    reason: "not confirmed"
  },
  credentialResolutionDisabled: false,
  requiredScope: "https://www.googleapis.com/auth/youtube.readonly",
  nowIso: "2026-06-08T00:00:00.000Z",
  trustedStatusReader: null,
  tokenMaterialResolver: {
    async resolveServerOnlyTokenMaterial() {
      throw new Error("must not resolve token material while owner authorization is blocked");
    }
  },
  async fetchGoogleApi() {
    throw new Error("must not call Google API while owner authorization is blocked");
  }
});
assert.equal(blockedResult.status, "blocked-owner-authorization", "foundation aborts before token or provider fetch without owner authorization");
assert.equal(blockedResult.googleApiLiveCall, "not-run", "blocked foundation does not run provider call");

const readyEnv = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: "present",
  SUPABASE_SERVICE_ROLE_KEY: "present",
  YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED: "false",
  YOUTUBE_OAUTH_SMOKE_CREDENTIAL_REFERENCE_ID: "smoke-livecall-command-20260608",
  YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID: "present",
  YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID: "present",
  YOUTUBE_LIVE_RUNTIME_SMOKE_TARGET_METADATA_PRESENT: "true",
  YOUTUBE_LIVE_RUNTIME_SMOKE_OWNER_AUTHORIZATION_CONFIRMED: "confirmed",
  YOUTUBE_GOOGLE_API_LIVE_CALL_READY_PREFLIGHT_CONFIRMED: "confirmed"
};

const checkEnv = spawnSync(process.execPath, [commandPath, "--check-env-only", "--json"], {
  cwd: root,
  env: readyEnv,
  encoding: "utf8"
});
assert.equal(checkEnv.status, 0, "new command preflight passes with reference-only env");
const checkEnvPayload = parseJson(checkEnv.stdout);
assert.equal(checkEnvPayload.status, "ready-for-bounded-google-api-live-call-command-foundation");
assert.equal(checkEnvPayload.command, "sanitized-youtube-google-api-live-call");
assert.equal(checkEnvPayload.endpoint, "channels.list-mine");
assert.equal(checkEnvPayload.outputPolicy, "sanitized-metadata-only");
assert.equal(checkEnvPayload.requiredApproval, "same-thread-explicit-in-thread-approval");
assert.equal(checkEnvPayload.serverOnlyLiveTokenMaterialResolver, "connected-sanitized-unavailable-runtime-adapter");
assert.equal(
  checkEnvPayload.approvedExecutionReadiness,
  "requires-token-material-availability-gate-before-approved-execution"
);
assert.equal(checkEnvPayload.googleApiLiveCall, "not-run-preflight-only");

const tokenMaterialAvailability = spawnSync(
  process.execPath,
  [commandPath, "--check-token-material-availability", "--json"],
  {
    cwd: root,
    env: readyEnv,
    encoding: "utf8"
  }
);
assert.equal(tokenMaterialAvailability.status, 2, "availability gate remains blocked while token retrieval is unavailable");
const tokenMaterialAvailabilityPayload = parseJson(tokenMaterialAvailability.stdout);
assert.equal(tokenMaterialAvailabilityPayload.status, "unavailable");
assert.equal(tokenMaterialAvailabilityPayload.googleApiLiveCall, "not-run-token-material-availability-only");
assert.equal(
  tokenMaterialAvailabilityPayload.reason,
  "server-only live token material resolver is wired but token material retrieval is not implemented in this command runtime"
);
assert.equal(tokenMaterialAvailabilityPayload.tokenValue, "never-returned-by-design");
assert.equal(tokenMaterialAvailabilityPayload.refreshTokenValue, "never-returned-by-design");

const operatorLocalReadyEnv = {
  ...readyEnv,
  YOUTUBE_GOOGLE_API_LIVE_CALL_OPERATOR_LOCAL_SERVER_AUTHORIZATION_HEADER: "server-only-test-authorization",
  YOUTUBE_GOOGLE_API_LIVE_CALL_OPERATOR_LOCAL_TOKEN_EXPIRES_AT_ISO: "2099-06-10T00:05:00.000Z"
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
assert.equal(
  operatorLocalTokenMaterialAvailability.status,
  0,
  "availability gate passes when operator-local token material is wired by server-only env reference"
);
const operatorLocalTokenMaterialAvailabilityPayload = parseJson(operatorLocalTokenMaterialAvailability.stdout);
assert.equal(operatorLocalTokenMaterialAvailabilityPayload.status, "token-material-available");
assert.equal(
  operatorLocalTokenMaterialAvailabilityPayload.googleApiLiveCall,
  "not-run-token-material-availability-only"
);
assert.equal(
  operatorLocalTokenMaterialAvailabilityPayload.serverFetchBinding,
  "resolved-for-server-fetch"
);
assert.equal(
  operatorLocalTokenMaterialAvailabilityPayload.approvedExecutionReadiness,
  "ready-for-approved-google-api-live-call"
);
assert.equal(operatorLocalTokenMaterialAvailabilityPayload.tokenValue, "never-returned-by-design");
assert.equal(operatorLocalTokenMaterialAvailabilityPayload.refreshTokenValue, "never-returned-by-design");
assert.doesNotMatch(
  JSON.stringify(operatorLocalTokenMaterialAvailabilityPayload),
  /server-only-test-authorization|ownerUserId|providerChannelId|serverAuthorizationHeader|"Authorization"\s*:/i,
  "operator-local availability output remains sanitized metadata only"
);

const executeWithoutApproval = spawnSync(process.execPath, [commandPath, "--execute", "--json"], {
  cwd: root,
  env: readyEnv,
  encoding: "utf8"
});
assert.equal(executeWithoutApproval.status, 2, "new command blocks execute without explicit approval flag");
const executeWithoutApprovalPayload = parseJson(executeWithoutApproval.stdout);
assert.equal(executeWithoutApprovalPayload.status, "blocked-pending-explicit-live-google-api-approval");
assert.equal(executeWithoutApprovalPayload.googleApiLiveCall, "not-run");
assert.equal(executeWithoutApprovalPayload.requiredFlag, "--approved-live-google-api-call");

const executeWithApproval = spawnSync(
  process.execPath,
  [commandPath, "--execute", "--approved-live-google-api-call", "--json"],
  {
    cwd: root,
    env: readyEnv,
    encoding: "utf8"
  }
);
assert.equal(executeWithApproval.status, 2, "approved execution remains blocked while token material resolver is sanitized unavailable");
const executeWithApprovalPayload = parseJson(executeWithApproval.stdout);
assert.equal(executeWithApprovalPayload.status, "unavailable");
assert.equal(executeWithApprovalPayload.googleApiLiveCall, "not-run");
assert.equal(
  executeWithApprovalPayload.reason,
  "server-only live token material resolver is wired but token material retrieval is not implemented in this command runtime"
);

for (const payload of [checkEnvPayload, tokenMaterialAvailabilityPayload, executeWithoutApprovalPayload, executeWithApprovalPayload]) {
  const serialized = JSON.stringify(payload);
  for (const forbiddenField of [
    "ownerUserId",
    "providerChannelId",
    "serviceRoleKey",
    "serverAuthorizationHeader",
    "accessToken"
  ]) {
    assert.doesNotMatch(serialized, new RegExp(forbiddenField, "i"), `command output does not include ${forbiddenField}`);
  }
  assert.doesNotMatch(serialized, /"Authorization"\s*:/, "command output does not include raw Authorization header field");
  assert.doesNotMatch(serialized, /"refreshToken"\s*:/, "command output does not include raw refresh token field");
  assert.equal(payload.tokenValue, "never-returned-by-design", "command output never prints token values");
  assert.equal(payload.refreshTokenValue, "never-returned-by-design", "command output never prints refresh token values");
}

console.log("comment translator YouTube actual Google API live call command foundation contract checks passed");
