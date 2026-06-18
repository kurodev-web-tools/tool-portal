import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const foundationPath = "lib/comment-translator-youtube-live-chat-polling-smoke-foundation.ts";
const commandPath = "scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs";

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

assert.ok(exists(foundationPath), "server-only Live Chat polling smoke foundation exists");
assert.ok(exists(commandPath), "dedicated Live Chat polling smoke command exists");

const foundationSource = read(foundationPath);
const commandSource = read(commandPath);

assert.match(foundationSource, /^import "server-only";/m, "Live Chat polling smoke foundation is server-only");
assert.match(commandSource, /comment-translator-youtube-live-chat-polling-smoke-foundation/, "command uses focused Live Chat polling foundation");
assert.match(commandSource, /--approved-live-chat-polling-smoke/, "command requires explicit in-thread approval flag");
assert.match(commandSource, /--approved-live-chat-polling-diagnostics/, "command supports explicit diagnostics approval flag");
assert.match(
  commandSource,
  /blocked-conflicting-live-chat-polling-approval-flags/,
  "command rejects mixed smoke and diagnostics approval flags"
);
assert.match(
  commandSource,
  /live-chat-polling-diagnostics-sanitized-result/,
  "command emits dedicated sanitized diagnostics status"
);
assert.match(commandSource, /sanitizeDiagnosticsPayload/, "command sanitizes diagnostics payload before output");
assert.match(
  commandSource,
  /delete sanitizedPayload\.credentialReferenceId/,
  "command omits credential reference values from diagnostics output"
);
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
  "setInterval",
  "setTimeout"
]) {
  assert.doesNotMatch(foundationSource, new RegExp(forbidden, "i"), `foundation does not add ${forbidden} coupling`);
  assert.doesNotMatch(commandSource, new RegExp(forbidden, "i"), `command does not add ${forbidden} coupling`);
}
assert.doesNotMatch(foundationSource, /from\s+["']googleapis["']|require\(["']googleapis["']\)/, "foundation does not import googleapis");
assert.doesNotMatch(commandSource, /from\s+["']googleapis["']|require\(["']googleapis["']\)/, "command does not import googleapis");

const foundation = loadTsModule(foundationPath);

for (const exportedName of [
  "youtubeLiveChatPollingSmokeCommandFoundationContract",
  "createYouTubeLiveChatPollingSmokeCommandRuntimeWiring",
  "assessYouTubeLiveChatPollingSmokeReadinessGate",
  "assessYouTubeLiveChatPollingSmokeTokenMaterialAvailabilityGate",
  "runYouTubeLiveChatPollingSmokeFoundation"
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
  foundation.youtubeLiveChatPollingSmokeCommandFoundationContract,
  {
    implementationStage: "live-chat-polling-smoke-command-foundation",
    commandPath,
    prerequisite: "owner-verification-smoke-success-before-live-chat-polling",
    endpoint: "liveChatMessages.list",
    providerUrl: "https://www.googleapis.com/youtube/v3/liveChat/messages",
    httpMethod: "GET",
    query: {
      part: "id,snippet",
      fields: "nextPageToken,pollingIntervalMillis,pageInfo(totalResults,resultsPerPage),items(id,snippet(publishedAt,type))"
    },
    outputPolicy: "sanitized-metadata-only",
    ownerBindingCheck: "trusted-status-provider-channel-match-before-live-chat-polling",
    targetLookupPrerequisite: "live-chat-target-lookup-readiness-and-presence-only-evidence-before-live-chat-polling",
    targetMetadataHandling: "target-lookup-presence-only-evidence-consumed-live-chat-id-never-returned",
    authorizationHandling: "server-only-header-consumed-never-returned",
    tokenValue: "never-returned-by-design",
    refreshTokenValue: "never-returned-by-design",
    requiredApproval: "same-thread-explicit-in-thread-approval",
    pollingLoop: "not-implemented-one-step-only",
    quotaWrite: "not-implemented",
    translatorPipelineWiring: "not-implemented",
    browserStorage: "unchanged"
  },
  "foundation contract fixes the Live Chat polling smoke boundary"
);

let statusReadCount = 0;
let tokenMaterialResolutionCount = 0;
let providerFetchCount = 0;
const missingOwnerAuthorization = await foundation.runYouTubeLiveChatPollingSmokeFoundation({
  credentialReferenceId: "smoke-livechat-polling-reference",
  expectedProviderChannelReference: "provider-channel-reference-never-returned",
  liveChatId: "live-chat-id-never-returned",
  ownerVerificationSmokeSuccess: true,
  liveChatTargetLookupReadinessConfirmed: true,
  liveChatTargetPresenceOnlyEvidence: true,
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
    throw new Error("must not poll provider without owner authorization");
  }
});
assert.equal(missingOwnerAuthorization.status, "blocked-owner-authorization");
assert.equal(missingOwnerAuthorization.liveChatPollingSmoke, "not-run");
assert.equal(missingOwnerAuthorization.providerAccess, "not-run");
assert.equal(statusReadCount, 0, "missing owner authorization aborts before status read");
assert.equal(tokenMaterialResolutionCount, 0, "missing owner authorization aborts before token material");
assert.equal(providerFetchCount, 0, "missing owner authorization aborts before provider fetch");

const missingOwnerVerificationSuccess = await foundation.runYouTubeLiveChatPollingSmokeFoundation({
  credentialReferenceId: "smoke-livechat-polling-reference",
  expectedProviderChannelReference: "provider-channel-reference-never-returned",
  liveChatId: "live-chat-id-never-returned",
  ownerVerificationSmokeSuccess: false,
  liveChatTargetLookupReadinessConfirmed: true,
  liveChatTargetPresenceOnlyEvidence: true,
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
    throw new Error("must not poll provider before owner verification success prerequisite");
  }
});
assert.equal(missingOwnerVerificationSuccess.status, "blocked-owner-verification-smoke-success-prerequisite");
assert.equal(missingOwnerVerificationSuccess.providerAccess, "not-run");

const missingTargetLookupReadiness = await foundation.runYouTubeLiveChatPollingSmokeFoundation({
  credentialReferenceId: "smoke-livechat-polling-reference",
  expectedProviderChannelReference: "provider-channel-reference-never-returned",
  liveChatId: "live-chat-id-never-returned",
  ownerVerificationSmokeSuccess: true,
  liveChatTargetLookupReadinessConfirmed: false,
  liveChatTargetPresenceOnlyEvidence: true,
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
      throw new Error("must not read status before target lookup readiness is confirmed");
    }
  },
  tokenMaterialResolver: {
    async resolveServerOnlyTokenMaterial() {
      tokenMaterialResolutionCount += 1;
      throw new Error("must not resolve token material before target lookup readiness is confirmed");
    }
  },
  async fetchGoogleApi() {
    providerFetchCount += 1;
    throw new Error("must not poll provider before target lookup readiness is confirmed");
  }
});
assert.equal(missingTargetLookupReadiness.status, "blocked-live-chat-target-lookup-readiness-prerequisite");
assert.equal(missingTargetLookupReadiness.providerAccess, "not-run");

const missingPresenceOnlyEvidence = await foundation.runYouTubeLiveChatPollingSmokeFoundation({
  credentialReferenceId: "smoke-livechat-polling-reference",
  expectedProviderChannelReference: "provider-channel-reference-never-returned",
  liveChatId: "live-chat-id-never-returned",
  ownerVerificationSmokeSuccess: true,
  liveChatTargetLookupReadinessConfirmed: true,
  liveChatTargetPresenceOnlyEvidence: false,
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
      throw new Error("must not read status before target lookup presence-only evidence is confirmed");
    }
  },
  tokenMaterialResolver: {
    async resolveServerOnlyTokenMaterial() {
      tokenMaterialResolutionCount += 1;
      throw new Error("must not resolve token material before target lookup presence-only evidence is confirmed");
    }
  },
  async fetchGoogleApi() {
    providerFetchCount += 1;
    throw new Error("must not poll provider before target lookup presence-only evidence is confirmed");
  }
});
assert.equal(missingPresenceOnlyEvidence.status, "blocked-live-chat-target-presence-only-evidence-prerequisite");
assert.equal(missingPresenceOnlyEvidence.providerAccess, "not-run");

const missingTarget = await foundation.runYouTubeLiveChatPollingSmokeFoundation({
  credentialReferenceId: "smoke-livechat-polling-reference",
  expectedProviderChannelReference: "provider-channel-reference-never-returned",
  liveChatId: "",
  ownerVerificationSmokeSuccess: true,
  liveChatTargetLookupReadinessConfirmed: true,
  liveChatTargetPresenceOnlyEvidence: true,
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
      throw new Error("must not read status before live chat target is present");
    }
  },
  tokenMaterialResolver: {
    async resolveServerOnlyTokenMaterial() {
      tokenMaterialResolutionCount += 1;
      throw new Error("must not resolve token material before live chat target is present");
    }
  },
  async fetchGoogleApi() {
    providerFetchCount += 1;
    throw new Error("must not poll provider before live chat target is present");
  }
});
assert.equal(missingTarget.status, "blocked-missing-live-chat-target");
assert.equal(missingTarget.providerAccess, "not-run");

const ownerMismatch = await foundation.runYouTubeLiveChatPollingSmokeFoundation({
  credentialReferenceId: "smoke-livechat-polling-reference",
  expectedProviderChannelReference: "provider-channel-reference-never-returned",
  liveChatId: "live-chat-id-never-returned",
  ownerVerificationSmokeSuccess: true,
  liveChatTargetLookupReadinessConfirmed: true,
  liveChatTargetPresenceOnlyEvidence: true,
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
        credentialReferenceId: "smoke-livechat-polling-reference",
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
    throw new Error("must not poll provider while owner binding mismatches");
  }
});
assert.equal(ownerMismatch.status, "owner-verification-mismatch-aborted");
assert.equal(ownerMismatch.providerAccess, "not-run");
assert.equal(tokenMaterialResolutionCount, 0, "owner mismatch aborts before token material");
assert.equal(providerFetchCount, 0, "owner mismatch aborts before provider fetch");

const consumedAuthorizationHeaders = [];
const consumedLiveChatIds = [];
const success = await foundation.runYouTubeLiveChatPollingSmokeFoundation({
  credentialReferenceId: "smoke-livechat-polling-reference",
  expectedProviderChannelReference: "provider-channel-reference-never-returned",
  liveChatId: "live-chat-id-never-returned",
  ownerVerificationSmokeSuccess: true,
  liveChatTargetLookupReadinessConfirmed: true,
  liveChatTargetPresenceOnlyEvidence: true,
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
        credentialReferenceId: "smoke-livechat-polling-reference",
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
    consumedLiveChatIds.push(requestToFetch.liveChatId);
    return {
      ok: true,
      status: 200,
      body: {
        nextPageToken: "next-page-token-never-returned",
        pollingIntervalMillis: 5000,
        pageInfo: {
          totalResults: 2,
          resultsPerPage: 2
        },
        items: [
          {
            id: "comment-id-never-returned",
            snippet: {
              publishedAt: "2026-06-09T00:00:00.000Z",
              displayMessage: "must-not-cross",
              type: "textMessageEvent"
            }
          },
          {
            id: "second-comment-id-never-returned",
            snippet: {
              publishedAt: "2026-06-09T00:00:01.000Z",
              displayMessage: "must-not-cross",
              type: "textMessageEvent"
            }
          }
        ]
      }
    };
  }
});
assert.deepEqual(consumedAuthorizationHeaders, ["server-only-test-authorization"], "provider fetch consumes server-only authorization exactly once");
assert.deepEqual(consumedLiveChatIds, ["live-chat-id-never-returned"], "provider fetch consumes live chat id exactly once");
assert.equal(success.status, "live-chat-polling-smoke-sanitized-result");
assert.equal(success.ownerBinding, "verified-before-live-chat-polling");
assert.equal(success.liveChatPollingSmoke, "executed-bounded-readonly-one-step");
assert.equal(success.providerAccess, "liveChatMessages-list-one-step-only");
assert.deepEqual(success.responseMetadata, {
  httpStatus: 200,
  ok: true,
  liveChatTarget: "present",
  nextPageToken: "present",
  pollingIntervalMillis: 5000,
  returnedItemCount: 2,
  pageInfoTotalResults: 2,
  itemTypeDistribution: {
    textMessageEvent: 2
  },
  textPayload: "not-returned-by-design"
});

for (const payload of [
  missingOwnerAuthorization,
  missingOwnerVerificationSuccess,
  missingTargetLookupReadiness,
  missingPresenceOnlyEvidence,
  missingTarget,
  ownerMismatch,
  success
]) {
  const serialized = JSON.stringify(payload);
  for (const forbiddenValue of [
    "server-only-test-authorization",
    "owner-reference-never-returned",
    "provider-channel-reference-never-returned",
    "different-provider-channel-reference-never-returned",
    "live-chat-id-never-returned",
    "next-page-token-never-returned",
    "comment-id-never-returned",
    "must-not-cross",
    "serverAuthorizationHeader",
    "ownerUserId",
    "providerChannelId",
    "liveChatId",
    "displayMessage"
  ]) {
    assert.doesNotMatch(serialized, new RegExp(forbiddenValue), `sanitized result does not include ${forbiddenValue}`);
  }
  assert.doesNotMatch(serialized, /"Authorization"\s*:/, "output does not include raw Authorization header field");
  assert.equal(payload.tokenValue, "never-returned-by-design", "output never prints token values");
  assert.equal(payload.refreshTokenValue, "never-returned-by-design", "output never prints refresh token values");
  assert.equal(payload.pollingLoop, "not-implemented-one-step-only", "output records no polling loop");
}

const readyEnv = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: "present",
  SUPABASE_SERVICE_ROLE_KEY: "present",
  YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED: "false",
  YOUTUBE_OAUTH_SMOKE_CREDENTIAL_REFERENCE_ID: "smoke-livechat-command-20260609",
  YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID: "present",
  YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID: "present",
  YOUTUBE_LIVE_RUNTIME_SMOKE_OWNER_AUTHORIZATION_CONFIRMED: "confirmed",
  YOUTUBE_OWNER_VERIFICATION_SMOKE_SUCCESS_CONFIRMED: "confirmed",
  YOUTUBE_LIVE_CHAT_TARGET_LOOKUP_READY_PREFLIGHT_CONFIRMED: "confirmed",
  YOUTUBE_LIVE_CHAT_TARGET_LOOKUP_PRESENCE_ONLY_EVIDENCE_CONFIRMED: "confirmed",
  YOUTUBE_LIVE_CHAT_POLLING_SMOKE_READY_PREFLIGHT_CONFIRMED: "confirmed",
  YOUTUBE_LIVE_CHAT_POLLING_SMOKE_TARGET_METADATA_PRESENT: "true",
  YOUTUBE_LIVE_CHAT_POLLING_SMOKE_LIVE_CHAT_ID: "present"
};

const checkEnv = spawnSync(process.execPath, [commandPath, "--check-env-only", "--json"], {
  cwd: root,
  env: readyEnv,
  encoding: "utf8"
});
assert.equal(checkEnv.status, 0, "Live Chat polling command preflight passes with reference-only env");
const checkEnvPayload = parseJson(checkEnv.stdout);
assert.equal(checkEnvPayload.status, "ready-for-bounded-live-chat-polling-smoke-command-foundation");
assert.equal(checkEnvPayload.command, "sanitized-youtube-live-chat-polling-smoke");
assert.equal(checkEnvPayload.endpoint, "liveChatMessages.list");
assert.equal(checkEnvPayload.outputPolicy, "sanitized-metadata-only");
assert.equal(
  checkEnvPayload.targetLookupPrerequisite,
  "live-chat-target-lookup-readiness-and-presence-only-evidence-before-live-chat-polling"
);
assert.equal(checkEnvPayload.liveChatPollingSmoke, "not-run-preflight-only");
assert.equal(checkEnvPayload.liveChatTarget, "present-by-reference-only");

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
assert.equal(tokenMaterialAvailabilityPayload.liveChatPollingSmoke, "not-run-token-material-availability-only");
assert.equal(tokenMaterialAvailabilityPayload.providerAccess, "not-run-token-material-availability-only");

const operatorLocalReadyEnv = {
  ...readyEnv,
  YOUTUBE_LIVE_CHAT_POLLING_SMOKE_OPERATOR_LOCAL_SERVER_AUTHORIZATION_HEADER: "server-only-test-authorization",
  YOUTUBE_LIVE_CHAT_POLLING_SMOKE_OPERATOR_LOCAL_TOKEN_EXPIRES_AT_ISO: "2099-06-10T00:05:00.000Z"
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
assert.equal(operatorLocalTokenMaterialAvailabilityPayload.status, "live-chat-polling-token-material-available");
assert.equal(operatorLocalTokenMaterialAvailabilityPayload.providerAccess, "not-run-token-material-availability-only");

const executeWithoutApproval = spawnSync(process.execPath, [commandPath, "--execute", "--json"], {
  cwd: root,
  env: operatorLocalReadyEnv,
  encoding: "utf8"
});
assert.equal(executeWithoutApproval.status, 2, "Live Chat polling command blocks execute without explicit approval flag");
const executeWithoutApprovalPayload = parseJson(executeWithoutApproval.stdout);
assert.equal(executeWithoutApprovalPayload.status, "blocked-pending-explicit-live-chat-polling-approval");
assert.equal(
  executeWithoutApprovalPayload.requiredFlag,
  "--approved-live-chat-polling-smoke or --approved-live-chat-polling-diagnostics"
);
assert.equal(executeWithoutApprovalPayload.providerAccess, "not-run");

const executeWithConflictingApproval = spawnSync(
  process.execPath,
  [commandPath, "--execute", "--approved-live-chat-polling-smoke", "--approved-live-chat-polling-diagnostics", "--json"],
  {
    cwd: root,
    env: operatorLocalReadyEnv,
    encoding: "utf8"
  }
);
assert.equal(executeWithConflictingApproval.status, 2, "Live Chat polling command blocks conflicting approval flags");
const executeWithConflictingApprovalPayload = parseJson(executeWithConflictingApproval.stdout);
assert.equal(executeWithConflictingApprovalPayload.status, "blocked-conflicting-live-chat-polling-approval-flags");
assert.equal(executeWithConflictingApprovalPayload.providerAccess, "not-run");
assert.equal(executeWithConflictingApprovalPayload.liveChatPollingSmoke, "not-run");

for (const payload of [
  checkEnvPayload,
  tokenMaterialAvailabilityPayload,
  operatorLocalTokenMaterialAvailabilityPayload,
  executeWithoutApprovalPayload,
  executeWithConflictingApprovalPayload
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

console.log("comment translator YouTube Live Chat polling smoke command contract checks passed");
