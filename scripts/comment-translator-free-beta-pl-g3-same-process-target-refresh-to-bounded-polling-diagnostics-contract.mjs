import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const pollingCommandPath = "scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs";
const targetLookupFoundationPath = "lib/comment-translator-youtube-live-chat-target-lookup-foundation.ts";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
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

const pollingCommandSource = read(pollingCommandPath);
const targetLookupFoundationSource = read(targetLookupFoundationPath);

const sameProcessFlag = "--approved-live-chat-polling-same-process-target-refresh-bounded-short-polling-diagnostics";
const sameProcessApprovalLabelReference = "PL_G3_SAME_PROCESS_TARGET_REFRESH_BOUNDED_POLLING_DIAGNOSTICS_APPROVAL_LABEL";
const sameProcessApprovalLabel =
  "approved-pl-g3-same-process-target-refresh-to-bounded-polling-diagnostics-after-pr529";

assert.match(pollingCommandSource, new RegExp(sameProcessFlag), "polling command exposes the same-process target refresh flag");
assert.match(
  pollingCommandSource,
  new RegExp(sameProcessApprovalLabelReference),
  "polling command requires the value-free same-process approval label reference"
);
assert.match(
  pollingCommandSource,
  /runYouTubeLiveChatTargetLookupSameProcessPollingDiagnosticFoundation/,
  "polling command refreshes the live target with the target lookup foundation in the same command process"
);
assert.match(
  pollingCommandSource,
  /serverOnlyLiveTargetForPolling/,
  "polling command keeps the selected target value in memory only before bounded polling"
);
assert.match(
  targetLookupFoundationSource,
  /runYouTubeLiveChatTargetLookupSameProcessPollingDiagnosticFoundation/,
  "target lookup foundation exposes a same-process diagnostic helper"
);

const readyEnv = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: "present",
  SUPABASE_SERVICE_ROLE_KEY: "present",
  YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED: "false",
  YOUTUBE_OAUTH_SMOKE_CREDENTIAL_REFERENCE_ID: "smoke-livechat-sameprocess-command-20260620",
  YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID: "present",
  YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID: "present",
  YOUTUBE_LIVE_RUNTIME_SMOKE_OWNER_AUTHORIZATION_CONFIRMED: "confirmed",
  YOUTUBE_OWNER_VERIFICATION_SMOKE_SUCCESS_CONFIRMED: "confirmed",
  YOUTUBE_LIVE_CHAT_TARGET_LOOKUP_READY_PREFLIGHT_CONFIRMED: "confirmed",
  YOUTUBE_LIVE_CHAT_POLLING_SMOKE_READY_PREFLIGHT_CONFIRMED: "confirmed",
  YOUTUBE_LIVE_CHAT_TARGET_LOOKUP_OPERATOR_LOCAL_SERVER_AUTHORIZATION_HEADER: "server-only-test-authorization",
  YOUTUBE_LIVE_CHAT_TARGET_LOOKUP_OPERATOR_LOCAL_TOKEN_EXPIRES_AT_ISO: "2099-06-20T00:00:00.000Z",
  YOUTUBE_LIVE_CHAT_POLLING_SMOKE_OPERATOR_LOCAL_SERVER_AUTHORIZATION_HEADER: "server-only-test-authorization",
  YOUTUBE_LIVE_CHAT_POLLING_SMOKE_OPERATOR_LOCAL_TOKEN_EXPIRES_AT_ISO: "2099-06-20T00:00:00.000Z"
};

const checkEnv = spawnSync(process.execPath, [pollingCommandPath, "--check-env-only", sameProcessFlag, "--json"], {
  cwd: root,
  env: readyEnv,
  encoding: "utf8"
});
assert.equal(
  checkEnv.status,
  0,
  "same-process target refresh preflight does not require an operator-provided live target value"
);
const checkEnvPayload = parseJson(checkEnv.stdout);
assert.equal(checkEnvPayload.liveChatTarget, "refreshed-in-same-process-before-polling");
assert.equal(checkEnvPayload.providerAccess, "not-run");
assert.doesNotMatch(JSON.stringify(checkEnvPayload), /server-only-test-authorization/);

const executeWithoutApprovalLabel = spawnSync(
  process.execPath,
  [pollingCommandPath, "--execute", sameProcessFlag, "--json"],
  {
    cwd: root,
    env: readyEnv,
    encoding: "utf8"
  }
);
assert.equal(executeWithoutApprovalLabel.status, 2, "same-process diagnostic blocks without exact approval label");
const executeWithoutApprovalLabelPayload = parseJson(executeWithoutApprovalLabel.stdout);
assert.equal(
  executeWithoutApprovalLabelPayload.status,
  "blocked-missing-same-process-target-refresh-bounded-polling-diagnostics-approval-label"
);
assert.equal(executeWithoutApprovalLabelPayload.requiredApprovalLabel, sameProcessApprovalLabel);
assert.equal(executeWithoutApprovalLabelPayload.approvalLabelReference, sameProcessApprovalLabelReference);
assert.equal(executeWithoutApprovalLabelPayload.providerAccess, "not-run");
assert.equal(executeWithoutApprovalLabelPayload.liveChatTargetLookup, "not-run");
assert.equal(executeWithoutApprovalLabelPayload.liveChatPollingDiagnostics, "not-run");
assert.equal(executeWithoutApprovalLabelPayload.operatorFreshCommentWindow, "not-run");

const targetLookupFoundation = loadTsModule(targetLookupFoundationPath);
assert.equal(
  typeof targetLookupFoundation.runYouTubeLiveChatTargetLookupSameProcessPollingDiagnosticFoundation,
  "function",
  "same-process target lookup helper is exported"
);

const sameProcessTargetLookup =
  await targetLookupFoundation.runYouTubeLiveChatTargetLookupSameProcessPollingDiagnosticFoundation({
    credentialReferenceId: "smoke-livechat-sameprocess-target-reference",
    expectedProviderChannelReference: "provider-channel-reference-never-returned",
    ownerVerificationSmokeSuccess: true,
    ownerAuthorization: {
      status: "authorized",
      ownerUserId: "owner-reference-never-returned"
    },
    credentialResolutionDisabled: false,
    requiredScope: "https://www.googleapis.com/auth/youtube.readonly",
    nowIso: "2026-06-20T00:00:00.000Z",
    trustedStatusReader: {
      async getCredentialStatus() {
        return {
          credentialReferenceId: "smoke-livechat-sameprocess-target-reference",
          provider: "youtube",
          providerChannelId: "provider-channel-reference-never-returned",
          scopeLabel: "youtube.readonly",
          scopeSet: ["https://www.googleapis.com/auth/youtube.readonly"],
          expiresAtIso: "2026-06-20T00:05:00.000Z",
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
          expiresAtIso: "2026-06-20T00:05:00.000Z"
        };
      }
    },
    async fetchGoogleApi() {
      return {
        ok: true,
        status: 200,
        body: {
          pageInfo: {
            totalResults: 2,
            resultsPerPage: 2
          },
          items: [
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
                privacyStatus: "public"
              }
            }
          ]
        }
      };
    }
  });

assert.equal(sameProcessTargetLookup.sanitizedTargetLookupResult.status, "live-chat-target-lookup-sanitized-result");
assert.equal(sameProcessTargetLookup.serverOnlyLiveTargetForPolling, "live-chat-id-never-returned");
assert.doesNotMatch(
  JSON.stringify(sameProcessTargetLookup.sanitizedTargetLookupResult),
  /live-chat-id-never-returned|broadcast-id-never-returned|server-only-test-authorization/,
  "sanitized target lookup result does not expose target, broadcast, or authorization values"
);

for (const payload of [checkEnvPayload, executeWithoutApprovalLabelPayload, sameProcessTargetLookup.sanitizedTargetLookupResult]) {
  const serialized = JSON.stringify(payload);
  for (const forbiddenField of [
    "ownerUserId",
    "providerChannelId",
    "serverAuthorizationHeader",
    "accessToken",
    "liveChatId",
    "providerTargetMetadata"
  ]) {
    assert.doesNotMatch(serialized, new RegExp(forbiddenField, "i"), `output does not include ${forbiddenField}`);
  }
  assert.doesNotMatch(serialized, /server-only-test-authorization|"Authorization"\s*:/);
}

console.log("comment translator Free beta PL-G3 same-process target-refresh-to-bounded-polling diagnostics contract checks passed");
