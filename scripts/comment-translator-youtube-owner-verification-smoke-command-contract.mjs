import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const foundationPath = "lib/comment-translator-youtube-owner-verification-smoke-foundation.ts";
const commandPath = "scripts/comment-translator-youtube-owner-verification-smoke-command.mjs";

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

assert.ok(exists(foundationPath), "server-only owner verification smoke foundation exists");
assert.ok(exists(commandPath), "dedicated owner verification smoke command exists");

const foundationSource = read(foundationPath);
const commandSource = read(commandPath);

assert.match(foundationSource, /^import "server-only";/m, "owner verification smoke foundation is server-only");
assert.match(commandSource, /comment-translator-youtube-owner-verification-smoke-foundation/, "command uses the focused owner verification foundation");
assert.match(commandSource, /--approved-owner-verification-smoke/, "command requires explicit in-thread approval flag");
assert.match(commandSource, /--check-env-only/, "command supports preflight-only mode");
assert.match(commandSource, /--check-owner-binding-only/, "command supports provider-fetch-free owner binding check");
assert.match(commandSource, /--check-token-material-availability/, "command supports provider-fetch-free token material availability check");

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
assert.doesNotMatch(foundationSource, /from\s+["']googleapis["']|require\(["']googleapis["']\)/, "foundation does not import googleapis");
assert.doesNotMatch(commandSource, /from\s+["']googleapis["']|require\(["']googleapis["']\)/, "command does not import googleapis");

const foundation = loadTsModule(foundationPath);

for (const exportedName of [
  "youtubeOwnerVerificationSmokeCommandFoundationContract",
  "createYouTubeOwnerVerificationSmokeCommandRuntimeWiring",
  "assessYouTubeOwnerBindingBeforeProviderAccess",
  "assessYouTubeOwnerVerificationTokenMaterialAvailabilityGate",
  "runYouTubeOwnerVerificationSmokeFoundation"
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
  foundation.youtubeOwnerVerificationSmokeCommandFoundationContract,
  {
    implementationStage: "owner-verification-smoke-command-foundation",
    commandPath,
    endpoint: "channels.list-mine",
    providerUrl: "https://www.googleapis.com/youtube/v3/channels",
    httpMethod: "GET",
    query: {
      part: "id,status",
      mine: "true",
      fields: "items(id,status),pageInfo(totalResults,resultsPerPage)"
    },
    outputPolicy: "sanitized-metadata-only",
    ownerBindingCheck: "trusted-status-provider-channel-match-before-provider-access",
    authorizationHandling: "server-only-header-consumed-never-returned",
    tokenValue: "never-returned-by-design",
    refreshTokenValue: "never-returned-by-design",
    requiredApproval: "same-thread-explicit-in-thread-approval",
    safeLiveYouTubeOAuthSmoke: "not-run",
    liveChatPollingSmoke: "not-run",
    quotaWrite: "not-implemented",
    browserStorage: "unchanged"
  },
  "foundation contract fixes the owner verification smoke boundary"
);

let tokenMaterialResolutionCount = 0;
let providerFetchCount = 0;
let statusReadCount = 0;
const missingOwnerAuthorizationResult = await foundation.runYouTubeOwnerVerificationSmokeFoundation({
  credentialReferenceId: "smoke-owner-verification-reference",
  expectedProviderChannelReference: "provider-channel-reference-never-returned",
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
    throw new Error("must not fetch provider without owner authorization");
  }
});
assert.equal(missingOwnerAuthorizationResult.status, "blocked-owner-authorization");
assert.equal(missingOwnerAuthorizationResult.ownerVerificationSmoke, "not-run");
assert.equal(missingOwnerAuthorizationResult.providerAccess, "not-run");
assert.equal(statusReadCount, 0, "missing owner authorization aborts before status read");
assert.equal(tokenMaterialResolutionCount, 0, "missing owner authorization aborts before token material");
assert.equal(providerFetchCount, 0, "missing owner authorization aborts before provider fetch");

const mismatchBindingResult = await foundation.runYouTubeOwnerVerificationSmokeFoundation({
  credentialReferenceId: "smoke-owner-verification-reference",
  expectedProviderChannelReference: "provider-channel-reference-never-returned",
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
        credentialReferenceId: "smoke-owner-verification-reference",
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
    throw new Error("must not fetch provider while owner binding mismatches");
  }
});
assert.equal(mismatchBindingResult.status, "owner-verification-mismatch-aborted");
assert.equal(mismatchBindingResult.ownerBinding, "mismatch");
assert.equal(mismatchBindingResult.ownerVerificationSmoke, "aborted-before-provider-access");
assert.equal(mismatchBindingResult.providerAccess, "not-run");
assert.equal(tokenMaterialResolutionCount, 0, "owner binding mismatch aborts before token material");
assert.equal(providerFetchCount, 0, "owner binding mismatch aborts before provider fetch");

const ownerBinding = await foundation.assessYouTubeOwnerBindingBeforeProviderAccess({
  credentialReferenceId: "smoke-owner-verification-reference",
  expectedProviderChannelReference: "provider-channel-reference-never-returned",
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
        credentialReferenceId: "smoke-owner-verification-reference",
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
  }
});
assert.equal(ownerBinding.status, "owner-binding-verified-before-provider-access");
assert.equal(ownerBinding.providerAccess, "not-run-owner-binding-only");

const consumedAuthorizationHeaders = [];
const liveOwnerVerificationResult = await foundation.runYouTubeOwnerVerificationSmokeFoundation({
  credentialReferenceId: "smoke-owner-verification-reference",
  expectedProviderChannelReference: "provider-channel-reference-never-returned",
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
        credentialReferenceId: "smoke-owner-verification-reference",
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
assert.deepEqual(consumedAuthorizationHeaders, ["server-only-test-authorization"], "provider fetch consumes server-only authorization exactly once after owner binding");
assert.equal(liveOwnerVerificationResult.status, "owner-verification-smoke-sanitized-result");
assert.equal(liveOwnerVerificationResult.ownerBinding, "verified-before-provider-access");
assert.equal(liveOwnerVerificationResult.ownerVerificationSmoke, "executed-bounded-readonly");
assert.equal(liveOwnerVerificationResult.providerAccess, "channels-list-mine-owner-verification-only");
assert.equal(liveOwnerVerificationResult.serverFetchBinding, "resolved-for-server-fetch");
assert.deepEqual(liveOwnerVerificationResult.responseMetadata, {
  httpStatus: 200,
  ok: true,
  channelReference: "present",
  expectedProviderChannelReference: "present",
  ownerChannelMatchesExpected: true,
  returnedItemCount: 1,
  pageInfoTotalResults: 1
});

for (const payload of [
  missingOwnerAuthorizationResult,
  mismatchBindingResult,
  ownerBinding,
  liveOwnerVerificationResult
]) {
  const serialized = JSON.stringify(payload);
  for (const forbiddenValue of [
    "server-only-test-authorization",
    "owner-reference-never-returned",
    "provider-channel-reference-never-returned",
    "different-provider-channel-reference-never-returned",
    "serverAuthorizationHeader",
    "ownerUserId",
    "providerChannelId"
  ]) {
    assert.doesNotMatch(serialized, new RegExp(forbiddenValue), `sanitized result does not include ${forbiddenValue}`);
  }
  assert.doesNotMatch(serialized, /"Authorization"\s*:/, "output does not include raw Authorization header field");
  assert.equal(payload.tokenValue, "never-returned-by-design", "output never prints token values");
  assert.equal(payload.refreshTokenValue, "never-returned-by-design", "output never prints refresh token values");
  assert.equal(payload.liveChatPollingSmoke, "not-run", "Live Chat polling stays out of scope");
}

const readyEnv = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: "present",
  SUPABASE_SERVICE_ROLE_KEY: "present",
  YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED: "false",
  YOUTUBE_OAUTH_SMOKE_CREDENTIAL_REFERENCE_ID: "smoke-ownerverify-command-20260609",
  YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID: "present",
  YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID: "present",
  YOUTUBE_LIVE_RUNTIME_SMOKE_TARGET_METADATA_PRESENT: "true",
  YOUTUBE_LIVE_RUNTIME_SMOKE_OWNER_AUTHORIZATION_CONFIRMED: "confirmed",
  YOUTUBE_OWNER_VERIFICATION_SMOKE_READY_PREFLIGHT_CONFIRMED: "confirmed"
};

const checkEnv = spawnSync(process.execPath, [commandPath, "--check-env-only", "--json"], {
  cwd: root,
  env: readyEnv,
  encoding: "utf8"
});
assert.equal(checkEnv.status, 0, "owner verification command preflight passes with reference-only env");
const checkEnvPayload = parseJson(checkEnv.stdout);
assert.equal(checkEnvPayload.status, "ready-for-bounded-owner-verification-smoke-command-foundation");
assert.equal(checkEnvPayload.command, "sanitized-youtube-owner-verification-smoke");
assert.equal(checkEnvPayload.endpoint, "channels.list-mine");
assert.equal(checkEnvPayload.outputPolicy, "sanitized-metadata-only");
assert.equal(checkEnvPayload.ownerBinding, "requires-check-owner-binding-only-before-approved-execution");
assert.equal(checkEnvPayload.ownerVerificationSmoke, "not-run-preflight-only");

const ownerBindingOnly = spawnSync(process.execPath, [commandPath, "--check-owner-binding-only", "--json"], {
  cwd: root,
  env: readyEnv,
  encoding: "utf8"
});
assert.equal(ownerBindingOnly.status, 0, "owner binding check passes without provider fetch");
const ownerBindingOnlyPayload = parseJson(ownerBindingOnly.stdout);
assert.equal(ownerBindingOnlyPayload.status, "owner-binding-verified-before-provider-access");
assert.equal(ownerBindingOnlyPayload.providerAccess, "not-run-owner-binding-only");
assert.equal(ownerBindingOnlyPayload.ownerVerificationSmoke, "not-run-owner-binding-only");

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
assert.equal(tokenMaterialAvailabilityPayload.ownerBinding, "verified-before-provider-access");
assert.equal(tokenMaterialAvailabilityPayload.ownerVerificationSmoke, "not-run-token-material-availability-only");
assert.equal(tokenMaterialAvailabilityPayload.providerAccess, "not-run-token-material-availability-only");

const operatorLocalReadyEnv = {
  ...readyEnv,
  YOUTUBE_OWNER_VERIFICATION_SMOKE_OPERATOR_LOCAL_SERVER_AUTHORIZATION_HEADER: "server-only-test-authorization",
  YOUTUBE_OWNER_VERIFICATION_SMOKE_OPERATOR_LOCAL_TOKEN_EXPIRES_AT_ISO: "2099-06-10T00:05:00.000Z"
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
  "token material availability passes when operator-local token material is wired by server-only env reference"
);
const operatorLocalTokenMaterialAvailabilityPayload = parseJson(operatorLocalTokenMaterialAvailability.stdout);
assert.equal(operatorLocalTokenMaterialAvailabilityPayload.status, "owner-verification-token-material-available");
assert.equal(operatorLocalTokenMaterialAvailabilityPayload.ownerBinding, "verified-before-provider-access");
assert.equal(
  operatorLocalTokenMaterialAvailabilityPayload.ownerVerificationSmoke,
  "not-run-token-material-availability-only"
);
assert.equal(
  operatorLocalTokenMaterialAvailabilityPayload.providerAccess,
  "not-run-token-material-availability-only"
);
assert.doesNotMatch(
  JSON.stringify(operatorLocalTokenMaterialAvailabilityPayload),
  /server-only-test-authorization|ownerUserId|providerChannelId|serverAuthorizationHeader|"Authorization"\s*:/i,
  "operator-local owner verification token availability output remains sanitized metadata only"
);

const executeWithoutApproval = spawnSync(process.execPath, [commandPath, "--execute", "--json"], {
  cwd: root,
  env: readyEnv,
  encoding: "utf8"
});
assert.equal(executeWithoutApproval.status, 2, "owner verification command blocks execute without explicit approval flag");
const executeWithoutApprovalPayload = parseJson(executeWithoutApproval.stdout);
assert.equal(executeWithoutApprovalPayload.status, "blocked-pending-explicit-owner-verification-approval");
assert.equal(executeWithoutApprovalPayload.requiredFlag, "--approved-owner-verification-smoke");
assert.equal(executeWithoutApprovalPayload.providerAccess, "not-run");

const executeWithApproval = spawnSync(
  process.execPath,
  [commandPath, "--execute", "--approved-owner-verification-smoke", "--json"],
  {
    cwd: root,
    env: readyEnv,
    encoding: "utf8"
  }
);
assert.equal(executeWithApproval.status, 2, "approved execution remains blocked while token material resolver is unavailable");
const executeWithApprovalPayload = parseJson(executeWithApproval.stdout);
assert.equal(executeWithApprovalPayload.status, "unavailable");
assert.equal(executeWithApprovalPayload.ownerVerificationSmoke, "not-run");
assert.equal(executeWithApprovalPayload.providerAccess, "not-run");

for (const payload of [
  checkEnvPayload,
  ownerBindingOnlyPayload,
  tokenMaterialAvailabilityPayload,
  operatorLocalTokenMaterialAvailabilityPayload,
  executeWithoutApprovalPayload,
  executeWithApprovalPayload
]) {
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

console.log("comment translator YouTube owner verification smoke command contract checks passed");
