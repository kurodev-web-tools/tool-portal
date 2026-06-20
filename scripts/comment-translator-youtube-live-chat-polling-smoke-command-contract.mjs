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
  /--approved-live-chat-polling-next-page-diagnostics/,
  "command supports explicit next-page diagnostics approval flag"
);
assert.match(
  commandSource,
  /--approved-live-chat-polling-first-page-to-next-page-diagnostics/,
  "command supports explicit same-process first-page-to-next-page diagnostics approval flag"
);
assert.match(
  commandSource,
  /--approved-live-chat-polling-between-pages-fresh-comment-diagnostics/,
  "command supports explicit same-process between-pages fresh-comment diagnostics approval flag"
);
assert.match(
  commandSource,
  /--approved-live-chat-polling-fresh-comment-bounded-short-polling-diagnostics/,
  "command supports explicit fresh-comment-after-send bounded short polling diagnostics approval flag"
);
assert.match(
  commandSource,
  /--approved-live-chat-polling-same-process-target-refresh-bounded-short-polling-diagnostics/,
  "command supports explicit same-process target-refresh bounded short polling diagnostics approval flag"
);
assert.match(
  commandSource,
  /PL_G3_BETWEEN_PAGES_FRESH_COMMENT_DIAGNOSTICS_APPROVAL_LABEL/,
  "command requires value-free after-PR522 approval label for between-pages diagnostics"
);
assert.match(
  commandSource,
  /PL_G3_FRESH_COMMENT_BOUNDED_SHORT_POLLING_DIAGNOSTICS_APPROVAL_LABEL/,
  "command requires value-free after-PR526 approval label for bounded short polling diagnostics"
);
assert.match(
  commandSource,
  /PL_G3_SAME_PROCESS_TARGET_REFRESH_BOUNDED_POLLING_DIAGNOSTICS_APPROVAL_LABEL/,
  "command requires value-free after-PR529 approval label for same-process target-refresh diagnostics"
);
assert.match(
  commandSource,
  /waitForOperatorFreshCommentWindow/,
  "command has a reviewed operator fresh-comment window before next-page read"
);
assert.match(
  commandSource,
  /process\.stderr\.write/,
  "operator fresh-comment window prompt uses stderr so stdout remains JSON-only"
);
assert.match(
  commandSource,
  /YOUTUBE_LIVE_CHAT_POLLING_SMOKE_NEXT_PAGE_TOKEN/,
  "command consumes the server-only next-page cursor from an operator-local reference"
);
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
assert.match(
  commandSource,
  /isProviderOkDiagnosticsPayload/,
  "command treats HTTP 2xx provider status as required for diagnostics pass"
);
for (const intakeDiagnosticLabel of [
  "non-empty-returned-intake",
  "empty-provider-ok-no-items",
  "empty-provider-ok-next-page-present",
  "empty-provider-ok-page-info-nonzero",
  "unavailable-provider-not-ok"
]) {
  assert.match(foundationSource, new RegExp(intakeDiagnosticLabel), `foundation supports ${intakeDiagnosticLabel}`);
}
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
  "runYouTubeLiveChatPollingSmokeFoundation",
  "runYouTubeLiveChatPollingFirstPageToNextPageDiagnosticsFoundation",
  "runYouTubeLiveChatPollingFreshCommentBoundedShortPollingDiagnosticsFoundation"
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
    pageTokenHandling: "optional-server-only-next-page-token-consumed-never-returned",
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

const boundedShortPollingProviderRequests = [];
const boundedShortPolling = await foundation.runYouTubeLiveChatPollingFreshCommentBoundedShortPollingDiagnosticsFoundation({
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
  async waitForProviderPollingInterval(metadata) {
    boundedShortPollingProviderRequests.push({
      waitAfterAttempt: boundedShortPollingProviderRequests.length,
      pollingIntervalPresenceLabel: metadata.pollingIntervalMillis === null ? "absent" : "present"
    });
  },
  async fetchGoogleApi(request) {
    boundedShortPollingProviderRequests.push({
      pageToken: request.pageToken,
      liveChatId: request.liveChatId,
      authorization: request.headers.Authorization,
      url: request.url
    });

    if (boundedShortPollingProviderRequests.filter((entry) => "pageToken" in entry).length === 1) {
      return {
        ok: true,
        status: 200,
        body: {
          nextPageToken: "first-bounded-next-page-token-never-returned",
          pollingIntervalMillis: 5000,
          pageInfo: { totalResults: 0, resultsPerPage: 0 },
          items: []
        }
      };
    }

    return {
      ok: true,
      status: 200,
      body: {
        nextPageToken: "second-bounded-next-page-token-never-returned",
        pollingIntervalMillis: 5000,
        pageInfo: { totalResults: 1, resultsPerPage: 1 },
        items: [
          {
            id: "bounded-comment-id-never-returned",
            snippet: {
              type: "textMessageEvent",
              displayMessage: "must-not-cross"
            }
          }
        ]
      }
    };
  }
});
assert.equal(
  boundedShortPolling.status,
  "live-chat-polling-fresh-comment-bounded-short-polling-diagnostics-sanitized-result"
);
assert.equal(boundedShortPolling.liveChatPollingDiagnostics, "executed-bounded-readonly-fresh-comment-short-polling");
assert.equal(boundedShortPolling.providerAccess, "liveChatMessages-list-bounded-short-polling-only");
assert.equal(boundedShortPolling.boundedAttemptCount, 2);
assert.equal(boundedShortPolling.boundedMaxAttempts, 3);
assert.equal(boundedShortPolling.stopReason, "non-empty-intake-found");
assert.equal(boundedShortPolling.unavailableReason, "none");
assert.equal(boundedShortPolling.attemptResponseMetadata.length, 2);
assert.equal(boundedShortPolling.attemptResponseMetadata[0].attemptRoleLabel, "attempt-1");
assert.equal(boundedShortPolling.attemptResponseMetadata[0].nextPageToken, "present");
assert.equal(boundedShortPolling.attemptResponseMetadata[0].pollingIntervalPresenceLabel, "present");
assert.equal(boundedShortPolling.attemptResponseMetadata[0].returnedItemCount, 0);
assert.equal(boundedShortPolling.attemptResponseMetadata[1].attemptRoleLabel, "attempt-2");
assert.equal(boundedShortPolling.attemptResponseMetadata[1].returnedItemCount, 1);
assert.equal(boundedShortPolling.attemptResponseMetadata[1].itemTypeDistribution.textMessageEvent, 1);
assert.equal(
  boundedShortPollingProviderRequests.filter((entry) => "pageToken" in entry).length,
  2,
  "fresh-comment bounded short polling stops on first non-empty sanitized intake"
);
assert.equal(
  boundedShortPollingProviderRequests.filter((entry) => "waitAfterAttempt" in entry).length,
  1,
  "fresh-comment bounded short polling respects provider polling interval between empty attempts"
);
assert.deepEqual(
  boundedShortPollingProviderRequests
    .filter((entry) => "pageToken" in entry)
    .map((entry) => entry.pageToken === null ? "initial" : "present-withheld"),
  ["initial", "present-withheld"],
  "fresh-comment bounded short polling consumes cursors in memory only"
);
assert.doesNotMatch(
  JSON.stringify(boundedShortPolling),
  /first-bounded-next-page-token-never-returned|second-bounded-next-page-token-never-returned|bounded-comment-id-never-returned|must-not-cross|server-only-test-authorization|live-chat-id-never-returned/,
  "fresh-comment bounded short polling output omits cursor, raw comment, auth, and live target values"
);

const consumedAuthorizationHeaders = [];
const consumedLiveChatIds = [];
const consumedProviderUrls = [];
const success = await foundation.runYouTubeLiveChatPollingSmokeFoundation({
  credentialReferenceId: "smoke-livechat-polling-reference",
  expectedProviderChannelReference: "provider-channel-reference-never-returned",
  liveChatId: "live-chat-id-never-returned",
  pageToken: "next-page-token-never-returned",
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
    consumedProviderUrls.push(requestToFetch.url);
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
assert.equal(consumedProviderUrls.length, 1, "provider fetch runs exactly once for next-page diagnostics");
assert.match(consumedProviderUrls[0], /[?&]pageToken=next-page-token-never-returned(?:&|$)/, "provider fetch consumes the server-only next-page cursor");
assert.equal(success.status, "live-chat-polling-smoke-sanitized-result");
assert.equal(success.ownerBinding, "verified-before-live-chat-polling");
assert.equal(success.liveChatPollingSmoke, "executed-bounded-readonly-one-step");
assert.equal(success.providerAccess, "liveChatMessages-list-one-step-only");
assert.deepEqual(success.responseMetadata, {
  pageRoleLabel: "next-page",
  httpStatus: 200,
  ok: true,
  providerStatusLabel: "provider-ok",
  providerErrorReasonLabel: "provider-error-reason-not-returned",
  liveChatTarget: "present",
  nextPageToken: "present",
  pollingIntervalMillis: 5000,
  returnedItemCount: 2,
  pageInfoTotalResults: 2,
  pageInfoResultsPerPage: 2,
  intakeDiagnosticLabel: "non-empty-returned-intake",
  itemTypeDistribution: {
    textMessageEvent: 2
  },
  textPayload: "not-returned-by-design"
});

const firstPageToNextPageProviderUrls = [];
const firstPageToNextPageDiagnostic =
  await foundation.runYouTubeLiveChatPollingFirstPageToNextPageDiagnosticsFoundation({
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
      firstPageToNextPageProviderUrls.push(requestToFetch.url);

      if (requestToFetch.pageToken === null) {
        return {
          ok: true,
          status: 200,
          body: {
            nextPageToken: "next-page-token-never-returned",
            pollingIntervalMillis: 5000,
            pageInfo: {
              totalResults: 0,
              resultsPerPage: 0
            },
            items: []
          }
        };
      }

      return {
        ok: true,
        status: 200,
        body: {
          nextPageToken: "second-next-page-token-never-returned",
          pollingIntervalMillis: 5000,
          pageInfo: {
            totalResults: 1,
            resultsPerPage: 1
          },
          items: [
            {
              id: "comment-id-never-returned",
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
assert.equal(firstPageToNextPageProviderUrls.length, 2, "first-page-to-next-page diagnostics runs exactly two provider reads");
assert.doesNotMatch(firstPageToNextPageProviderUrls[0], /[?&]pageToken=/, "first-page diagnostic read omits pageToken");
assert.match(
  firstPageToNextPageProviderUrls[1],
  /[?&]pageToken=next-page-token-never-returned(?:&|$)/,
  "next-page diagnostic read consumes the first-page cursor in memory only"
);
assert.equal(
  firstPageToNextPageDiagnostic.status,
  "live-chat-polling-first-page-to-next-page-diagnostics-sanitized-result"
);
assert.equal(firstPageToNextPageDiagnostic.providerAccess, "liveChatMessages-list-first-page-to-next-page-only");
assert.equal(firstPageToNextPageDiagnostic.firstPageResponseMetadata.pageRoleLabel, "initial-page");
assert.equal(firstPageToNextPageDiagnostic.firstPageResponseMetadata.nextPageToken, "present");
assert.equal(
  firstPageToNextPageDiagnostic.firstPageResponseMetadata.intakeDiagnosticLabel,
  "empty-provider-ok-next-page-present"
);
assert.equal(firstPageToNextPageDiagnostic.nextPageResponseMetadata.pageRoleLabel, "next-page");
assert.equal(firstPageToNextPageDiagnostic.nextPageResponseMetadata.returnedItemCount, 1);
assert.equal(
  firstPageToNextPageDiagnostic.nextPageResponseMetadata.intakeDiagnosticLabel,
  "non-empty-returned-intake"
);
assert.doesNotMatch(
  JSON.stringify(firstPageToNextPageDiagnostic),
  /next-page-token-never-returned|second-next-page-token-never-returned|must-not-cross|comment-id-never-returned/,
  "first-page-to-next-page diagnostics output never includes cursor, raw comment, or provider values"
);

const betweenPagesEvents = [];
const betweenPagesProviderUrls = [];
const betweenPagesFreshCommentDiagnostic =
  await foundation.runYouTubeLiveChatPollingFirstPageToNextPageDiagnosticsFoundation({
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
      betweenPagesProviderUrls.push(requestToFetch.url);

      if (requestToFetch.pageToken === null) {
        betweenPagesEvents.push("first-page-read");
        return {
          ok: true,
          status: 200,
          body: {
            nextPageToken: "next-page-token-never-returned",
            pollingIntervalMillis: 5000,
            pageInfo: {
              totalResults: 0,
              resultsPerPage: 0
            },
            items: []
          }
        };
      }

      betweenPagesEvents.push("next-page-read");
      return {
        ok: true,
        status: 200,
        body: {
          nextPageToken: "second-next-page-token-never-returned",
          pollingIntervalMillis: 5000,
          pageInfo: {
            totalResults: 1,
            resultsPerPage: 1
          },
          items: [
            {
              id: "comment-id-never-returned",
              snippet: {
                publishedAt: "2026-06-09T00:00:02.000Z",
                displayMessage: "must-not-cross",
                type: "textMessageEvent"
              }
            }
          ]
        }
      };
    },
    async beforeNextPageRead(firstPageMetadata) {
      betweenPagesEvents.push(`operator-window-${firstPageMetadata.nextPageToken}`);
    }
  });
assert.deepEqual(
  betweenPagesEvents,
  ["first-page-read", "operator-window-present", "next-page-read"],
  "between-pages fresh-comment callback runs after first page and before next-page read without cursor values"
);
assert.equal(betweenPagesFreshCommentDiagnostic.nextPageResponseMetadata.returnedItemCount, 1);
assert.match(
  betweenPagesProviderUrls[1],
  /[?&]pageToken=next-page-token-never-returned(?:&|$)/,
  "between-pages next-page read consumes the first-page cursor in memory only"
);
assert.doesNotMatch(
  JSON.stringify(betweenPagesFreshCommentDiagnostic),
  /next-page-token-never-returned|second-next-page-token-never-returned|must-not-cross|comment-id-never-returned/,
  "between-pages diagnostics output never includes cursor, raw comment, or provider values"
);

const providerOkEmptyNoItems = await foundation.runYouTubeLiveChatPollingSmokeFoundation({
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
  async fetchGoogleApi() {
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
assert.equal(providerOkEmptyNoItems.status, "live-chat-polling-smoke-sanitized-result");
assert.equal(providerOkEmptyNoItems.responseMetadata.providerStatusLabel, "provider-ok");
assert.equal(providerOkEmptyNoItems.responseMetadata.returnedItemCount, 0);
assert.equal(providerOkEmptyNoItems.responseMetadata.pageInfoTotalResults, 0);
assert.equal(providerOkEmptyNoItems.responseMetadata.pageInfoResultsPerPage, 0);
assert.equal(providerOkEmptyNoItems.responseMetadata.intakeDiagnosticLabel, "empty-provider-ok-no-items");

const providerOkEmptyWithNextPage = await foundation.runYouTubeLiveChatPollingSmokeFoundation({
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
  async fetchGoogleApi() {
    return {
      ok: true,
      status: 200,
      body: {
        nextPageToken: "next-page-token-never-returned",
        pageInfo: {
          totalResults: 0,
          resultsPerPage: 0
        },
        items: []
      }
    };
  }
});
assert.equal(providerOkEmptyWithNextPage.responseMetadata.nextPageToken, "present");
assert.equal(providerOkEmptyWithNextPage.responseMetadata.intakeDiagnosticLabel, "empty-provider-ok-next-page-present");

const providerPermissionRejected = await foundation.runYouTubeLiveChatPollingSmokeFoundation({
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
  async fetchGoogleApi() {
    return {
      ok: false,
      status: 403,
      body: {
        error: {
          message: "must-not-cross",
          errors: [
            {
              reason: "insufficientPermissions",
              message: "must-not-cross"
            }
          ]
        }
      }
    };
  }
});
assert.equal(providerPermissionRejected.status, "live-chat-polling-smoke-sanitized-result");
assert.equal(providerPermissionRejected.responseMetadata.httpStatus, 403);
assert.equal(providerPermissionRejected.responseMetadata.ok, false);
assert.equal(providerPermissionRejected.responseMetadata.providerStatusLabel, "provider-permission-rejected");
assert.equal(providerPermissionRejected.responseMetadata.providerErrorReasonLabel, "provider-insufficient-permission");
assert.equal(providerPermissionRejected.responseMetadata.returnedItemCount, 0);
assert.equal(providerPermissionRejected.responseMetadata.pageInfoResultsPerPage, null);
assert.equal(providerPermissionRejected.responseMetadata.intakeDiagnosticLabel, "unavailable-provider-not-ok");
assert.doesNotMatch(
  JSON.stringify(providerPermissionRejected),
  /insufficientPermissions|"message"\s*:|must-not-cross/,
  "provider 403 diagnostics emit only allowlisted reason labels and no raw reason/message values"
);

const providerPermissionRejectedWithoutReason = await foundation.runYouTubeLiveChatPollingSmokeFoundation({
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
  async fetchGoogleApi() {
    return {
      ok: false,
      status: 403,
      body: {
        error: {
          message: "must-not-cross"
        }
      }
    };
  }
});
assert.equal(
  providerPermissionRejectedWithoutReason.responseMetadata.providerErrorReasonLabel,
  "provider-error-reason-not-returned"
);

const providerLiveChatDisabled = await runProviderErrorReasonFixture("liveChatDisabled", 403);
assert.equal(providerLiveChatDisabled.responseMetadata.providerErrorReasonLabel, "provider-live-chat-disabled");

const providerLiveChatEnded = await runProviderErrorReasonFixture("liveChatEnded", 403);
assert.equal(providerLiveChatEnded.responseMetadata.providerErrorReasonLabel, "provider-live-chat-ended");

const providerQuotaLimited = await runProviderErrorReasonFixture("rateLimitExceeded", 403);
assert.equal(providerQuotaLimited.responseMetadata.providerErrorReasonLabel, "provider-quota-or-rate-limited");

const providerForbidden = await runProviderErrorReasonFixture("forbidden", 403);
assert.equal(providerForbidden.responseMetadata.providerErrorReasonLabel, "provider-forbidden");

const providerReasonOther = await runProviderErrorReasonFixture("backendError", 403);
assert.equal(providerReasonOther.responseMetadata.providerErrorReasonLabel, "provider-error-reason-other");

for (const payload of [
  missingOwnerAuthorization,
  missingOwnerVerificationSuccess,
  missingTargetLookupReadiness,
  missingPresenceOnlyEvidence,
  missingTarget,
  ownerMismatch,
  success,
  providerPermissionRejected,
  providerPermissionRejectedWithoutReason,
  providerLiveChatDisabled,
  providerLiveChatEnded,
  providerQuotaLimited,
  providerForbidden,
  providerReasonOther
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
    "insufficientPermissions",
    "liveChatDisabled",
    "liveChatEnded",
    "rateLimitExceeded",
    "backendError",
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
assert.equal(checkEnvPayload.nextPageCursor, "not-required-for-this-boundary");

const checkEnvWithUnusedCursorPlaceholder = spawnSync(process.execPath, [commandPath, "--check-env-only", "--json"], {
  cwd: root,
  env: {
    ...readyEnv,
    YOUTUBE_LIVE_CHAT_POLLING_SMOKE_NEXT_PAGE_TOKEN: "<set locally>"
  },
  encoding: "utf8"
});
assert.equal(
  checkEnvWithUnusedCursorPlaceholder.status,
  0,
  "unused next-page cursor placeholder does not block non-next-page preflight"
);

const nextPageReadyEnv = {
  ...readyEnv,
  YOUTUBE_LIVE_CHAT_POLLING_SMOKE_NEXT_PAGE_TOKEN: "next-page-token-never-returned"
};
const checkNextPageEnv = spawnSync(
  process.execPath,
  [commandPath, "--check-env-only", "--approved-live-chat-polling-next-page-diagnostics", "--json"],
  {
    cwd: root,
    env: nextPageReadyEnv,
    encoding: "utf8"
  }
);
assert.equal(checkNextPageEnv.status, 0, "next-page diagnostics preflight passes with server-only cursor reference");
const checkNextPageEnvPayload = parseJson(checkNextPageEnv.stdout);
assert.equal(checkNextPageEnvPayload.nextPageCursor, "present-by-reference-only");
assert.doesNotMatch(
  JSON.stringify(checkNextPageEnvPayload),
  /next-page-token-never-returned/,
  "next-page diagnostics preflight does not output the cursor value"
);

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
  "--approved-live-chat-polling-smoke or --approved-live-chat-polling-diagnostics or --approved-live-chat-polling-next-page-diagnostics or --approved-live-chat-polling-first-page-to-next-page-diagnostics or --approved-live-chat-polling-between-pages-fresh-comment-diagnostics or --approved-live-chat-polling-fresh-comment-bounded-short-polling-diagnostics or --approved-live-chat-polling-same-process-target-refresh-bounded-short-polling-diagnostics"
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

const executeNextPageWithoutCursor = spawnSync(
  process.execPath,
  [commandPath, "--execute", "--approved-live-chat-polling-next-page-diagnostics", "--json"],
  {
    cwd: root,
    env: operatorLocalReadyEnv,
    encoding: "utf8"
  }
);
assert.equal(
  executeNextPageWithoutCursor.status,
  2,
  "next-page diagnostics blocks before provider access without server-only cursor reference"
);
const executeNextPageWithoutCursorPayload = parseJson(executeNextPageWithoutCursor.stdout);
assert.equal(executeNextPageWithoutCursorPayload.status, "blocked-missing-live-chat-next-page-cursor-reference");
assert.equal(executeNextPageWithoutCursorPayload.providerAccess, "not-run");

const executeFirstPageToNextPageWithoutSameThreadApproval = spawnSync(
  process.execPath,
  [commandPath, "--execute", "--approved-live-chat-polling-first-page-to-next-page-diagnostics", "--json"],
  {
    cwd: root,
    env: operatorLocalReadyEnv,
    encoding: "utf8"
  }
);
assert.equal(
  executeFirstPageToNextPageWithoutSameThreadApproval.status,
  2,
  "first-page-to-next-page diagnostics blocks without the after-PR519 exact approval label"
);
const executeFirstPageToNextPageWithoutSameThreadApprovalPayload = parseJson(
  executeFirstPageToNextPageWithoutSameThreadApproval.stdout
);
assert.equal(
  executeFirstPageToNextPageWithoutSameThreadApprovalPayload.status,
  "blocked-missing-first-page-to-next-page-diagnostics-approval-label"
);
assert.equal(executeFirstPageToNextPageWithoutSameThreadApprovalPayload.providerAccess, "not-run");

const executeBetweenPagesWithoutSameThreadApproval = spawnSync(
  process.execPath,
  [commandPath, "--execute", "--approved-live-chat-polling-between-pages-fresh-comment-diagnostics", "--json"],
  {
    cwd: root,
    env: operatorLocalReadyEnv,
    encoding: "utf8"
  }
);
assert.equal(
  executeBetweenPagesWithoutSameThreadApproval.status,
  2,
  "between-pages fresh-comment diagnostics blocks without the after-PR521 exact approval label"
);
const executeBetweenPagesWithoutSameThreadApprovalPayload = parseJson(
  executeBetweenPagesWithoutSameThreadApproval.stdout
);
assert.equal(
  executeBetweenPagesWithoutSameThreadApprovalPayload.status,
  "blocked-missing-between-pages-fresh-comment-diagnostics-approval-label"
);
assert.equal(executeBetweenPagesWithoutSameThreadApprovalPayload.providerAccess, "not-run");

const executeBoundedShortPollingWithoutSameThreadApproval = spawnSync(
  process.execPath,
  [
    commandPath,
    "--execute",
    "--approved-live-chat-polling-fresh-comment-bounded-short-polling-diagnostics",
    "--json"
  ],
  {
    cwd: root,
    env: operatorLocalReadyEnv,
    encoding: "utf8"
  }
);
assert.equal(
  executeBoundedShortPollingWithoutSameThreadApproval.status,
  2,
  "fresh-comment bounded short polling diagnostics blocks without the after-PR525 exact approval label"
);
const executeBoundedShortPollingWithoutSameThreadApprovalPayload = parseJson(
  executeBoundedShortPollingWithoutSameThreadApproval.stdout
);
assert.equal(
  executeBoundedShortPollingWithoutSameThreadApprovalPayload.status,
  "blocked-missing-fresh-comment-bounded-short-polling-diagnostics-approval-label"
);
assert.equal(executeBoundedShortPollingWithoutSameThreadApprovalPayload.operatorFreshCommentWindow, "not-run");
assert.equal(executeBoundedShortPollingWithoutSameThreadApprovalPayload.providerAccess, "not-run");

const sameProcessReadyEnv = {
  ...operatorLocalReadyEnv,
  YOUTUBE_LIVE_CHAT_TARGET_LOOKUP_OPERATOR_LOCAL_SERVER_AUTHORIZATION_HEADER: "server-only-test-authorization",
  YOUTUBE_LIVE_CHAT_TARGET_LOOKUP_OPERATOR_LOCAL_TOKEN_EXPIRES_AT_ISO: "2099-06-10T00:05:00.000Z"
};
delete sameProcessReadyEnv.YOUTUBE_LIVE_CHAT_POLLING_SMOKE_LIVE_CHAT_ID;
delete sameProcessReadyEnv.YOUTUBE_LIVE_CHAT_POLLING_SMOKE_TARGET_METADATA_PRESENT;
delete sameProcessReadyEnv.YOUTUBE_LIVE_CHAT_TARGET_LOOKUP_PRESENCE_ONLY_EVIDENCE_CONFIRMED;

const sameProcessCheckEnv = spawnSync(
  process.execPath,
  [
    commandPath,
    "--check-env-only",
    "--approved-live-chat-polling-same-process-target-refresh-bounded-short-polling-diagnostics",
    "--json"
  ],
  {
    cwd: root,
    env: sameProcessReadyEnv,
    encoding: "utf8"
  }
);
assert.equal(
  sameProcessCheckEnv.status,
  0,
  "same-process target-refresh diagnostics preflight does not require an operator-provided live target reference"
);
const sameProcessCheckEnvPayload = parseJson(sameProcessCheckEnv.stdout);
assert.equal(sameProcessCheckEnvPayload.liveChatTarget, "refreshed-in-same-process-before-polling");
assert.equal(sameProcessCheckEnvPayload.providerAccess, "not-run");

const executeSameProcessWithoutSameThreadApproval = spawnSync(
  process.execPath,
  [
    commandPath,
    "--execute",
    "--approved-live-chat-polling-same-process-target-refresh-bounded-short-polling-diagnostics",
    "--json"
  ],
  {
    cwd: root,
    env: sameProcessReadyEnv,
    encoding: "utf8"
  }
);
assert.equal(
  executeSameProcessWithoutSameThreadApproval.status,
  2,
  "same-process target-refresh diagnostics blocks without the after-PR529 exact approval label"
);
const executeSameProcessWithoutSameThreadApprovalPayload = parseJson(
  executeSameProcessWithoutSameThreadApproval.stdout
);
assert.equal(
  executeSameProcessWithoutSameThreadApprovalPayload.status,
  "blocked-missing-same-process-target-refresh-bounded-polling-diagnostics-approval-label"
);
assert.equal(executeSameProcessWithoutSameThreadApprovalPayload.liveChatTargetLookup, "not-run");
assert.equal(executeSameProcessWithoutSameThreadApprovalPayload.liveChatPollingDiagnostics, "not-run");
assert.equal(executeSameProcessWithoutSameThreadApprovalPayload.operatorFreshCommentWindow, "not-run");
assert.equal(executeSameProcessWithoutSameThreadApprovalPayload.providerAccess, "not-run");

const operatorLocalFirstPageToNextPageApprovedEnv = {
  ...operatorLocalReadyEnv,
  PL_G3_FIRST_PAGE_TO_NEXT_PAGE_CURSOR_DIAGNOSTICS_APPROVAL_LABEL:
    "approved-pl-g3-first-page-to-next-page-cursor-diagnostics-after-pr519"
};

for (const payload of [
  checkEnvPayload,
  tokenMaterialAvailabilityPayload,
  operatorLocalTokenMaterialAvailabilityPayload,
  executeWithoutApprovalPayload,
  executeWithConflictingApprovalPayload,
  checkNextPageEnvPayload,
  executeNextPageWithoutCursorPayload,
  executeFirstPageToNextPageWithoutSameThreadApprovalPayload,
  executeBetweenPagesWithoutSameThreadApprovalPayload,
  executeBoundedShortPollingWithoutSameThreadApprovalPayload,
  sameProcessCheckEnvPayload,
  executeSameProcessWithoutSameThreadApprovalPayload
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

assert.match(
  commandSource,
  /publicGateStateLabel: "unchanged \/ blocked"[\s\S]*publicReleaseCapableLabel: "no"/,
  "first-page-to-next-page diagnostics output includes public gate and release capability labels"
);
assert.doesNotMatch(
  JSON.stringify(operatorLocalFirstPageToNextPageApprovedEnv),
  /next-page-token-never-returned/,
  "first-page-to-next-page approved env does not require an operator-provided cursor value"
);
const operatorLocalBetweenPagesApprovedEnv = {
  ...operatorLocalReadyEnv,
  PL_G3_BETWEEN_PAGES_FRESH_COMMENT_DIAGNOSTICS_APPROVAL_LABEL:
    "approved-pl-g3-between-pages-fresh-comment-diagnostics-after-pr521"
};
assert.doesNotMatch(
  JSON.stringify(operatorLocalBetweenPagesApprovedEnv),
  /next-page-token-never-returned/,
  "between-pages fresh-comment approved env does not require an operator-provided cursor value"
);
const operatorLocalBoundedShortPollingApprovedEnv = {
  ...operatorLocalReadyEnv,
  PL_G3_FRESH_COMMENT_BOUNDED_SHORT_POLLING_DIAGNOSTICS_APPROVAL_LABEL:
    "approved-pl-g3-fresh-comment-bounded-short-polling-diagnostics-after-pr525"
};
assert.doesNotMatch(
  JSON.stringify(operatorLocalBoundedShortPollingApprovedEnv),
  /next-page-token-never-returned/,
  "fresh-comment bounded short polling approved env does not require an operator-provided cursor value"
);
const operatorLocalSameProcessApprovedEnv = {
  ...sameProcessReadyEnv,
  PL_G3_SAME_PROCESS_TARGET_REFRESH_BOUNDED_POLLING_DIAGNOSTICS_APPROVAL_LABEL:
    "approved-pl-g3-same-process-target-refresh-to-bounded-polling-diagnostics-after-pr529"
};
assert.doesNotMatch(
  JSON.stringify(operatorLocalSameProcessApprovedEnv),
  /next-page-token-never-returned/,
  "same-process target-refresh bounded polling approved env does not require an operator-provided cursor value"
);
assert.doesNotMatch(
  JSON.stringify(operatorLocalSameProcessApprovedEnv),
  /YOUTUBE_LIVE_CHAT_POLLING_SMOKE_LIVE_CHAT_ID/,
  "same-process target-refresh bounded polling approved env does not require an operator-provided live target value"
);

console.log("comment translator YouTube Live Chat polling smoke command contract checks passed");

async function runProviderErrorReasonFixture(reason, status) {
  return foundation.runYouTubeLiveChatPollingSmokeFoundation({
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
    async fetchGoogleApi() {
      return {
        ok: false,
        status,
        body: {
          error: {
            message: "must-not-cross",
            errors: [
              {
                reason,
                message: "must-not-cross"
              }
            ]
          }
        }
      };
    }
  });
}
