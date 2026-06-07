import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const runtimePath = "lib/comment-translator-youtube-runtime-foundation.ts";
const commandPath = "scripts/comment-translator-youtube-live-runtime-smoke-command.mjs";
const taskPath = "task.md";
const pr358MergeCommit = "b4d441096a6cde3abf6a301f36020e2c1569bd12";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function loadTsModule(relativePath) {
  const sourcePath = path.join(root, relativePath);
  const compiled = ts.transpileModule(read(relativePath), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText;

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "server-only") {
      return {};
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    const testModule = new Module(sourcePath);
    testModule.filename = sourcePath;
    testModule.paths = Module._nodeModulePaths(path.dirname(sourcePath));
    testModule._compile(compiled, sourcePath);
    return testModule.exports;
  } finally {
    Module._load = originalLoad;
  }
}

assert.ok(exists(commandPath), "dedicated sanitized YouTube live runtime smoke command exists");

const runtimeSource = read(runtimePath);
const commandSource = read(commandPath);
const taskSource = read(taskPath);

for (const exportedType of [
  "YouTubeRuntimeSafeLiveSmokeCommandPostPr358Check",
  "YouTubeRuntimeSafeLiveSmokeCommandPostPr358",
  "YouTubeRuntimeSafeLiveSmokeCommandPostPr358Assessment",
  "YouTubeRuntimeLiveTokenResolutionReadinessPostPr359Check",
  "YouTubeRuntimeLiveTokenResolutionReadinessPostPr359",
  "YouTubeRuntimeLiveTokenResolutionReadinessPostPr359Assessment",
  "YouTubeServerOnlyLiveTokenMaterialResolver",
  "YouTubeServerFetchAuthorizationConsumer",
  "YouTubeLiveTokenResolutionRuntimeRequest",
  "YouTubeLiveTokenResolutionRuntimeResult"
]) {
  assert.match(runtimeSource, new RegExp(`export type ${exportedType}\\b`), `runtime exports ${exportedType}`);
}

for (const exportedConstOrFunction of [
  "youtubeRuntimeSafeLiveSmokeCommandPostPr358",
  "assessYouTubeRuntimeSafeLiveSmokeCommandPostPr358",
  "createYouTubeRuntimeSafeLiveSmokeCommandPostPr358Summary",
  "youtubeRuntimeLiveTokenResolutionReadinessPostPr359",
  "assessYouTubeRuntimeLiveTokenResolutionReadinessPostPr359",
  "createYouTubeRuntimeLiveTokenResolutionReadinessPostPr359Summary",
  "youtubeLiveTokenResolutionRuntimeContract",
  "resolveYouTubeLiveTokenForServerFetch"
]) {
  assert.match(
    runtimeSource,
    new RegExp(`export (?:const|(?:async\\s+)?function) ${exportedConstOrFunction}\\b`),
    `runtime exports ${exportedConstOrFunction}`
  );
}

for (const fragment of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED",
  "YOUTUBE_OAUTH_SMOKE_CREDENTIAL_REFERENCE_ID",
  "YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID",
  "YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID",
  "YOUTUBE_LIVE_RUNTIME_SMOKE_TARGET_METADATA_PRESENT",
  "YOUTUBE_LIVE_RUNTIME_SMOKE_OWNER_AUTHORIZATION_CONFIRMED"
]) {
  assert.match(commandSource, new RegExp(fragment), `command checks reference name only: ${fragment}`);
}

assert.doesNotMatch(
  commandSource,
  /console\.(?:log|error)\([^)]*(?:process\.env|ownerUserId|providerChannelId|serviceRoleKey|SUPABASE_SERVICE_ROLE_KEY|accessToken|refreshToken|authorizationCode)/is,
  "command does not print env values, owner ids, provider channel ids, service role keys, or OAuth material"
);
assert.doesNotMatch(
  commandSource,
  /localStorage\.|indexedDB\.|sessionStorage\.|refresh_token\s*[:=]|access_token\s*[:=]|authorization_code\s*[:=]|BEGIN\s+PRIVATE\s+KEY/i,
  "command avoids browser storage and raw token material"
);

const missingCheck = spawnSync(process.execPath, [commandPath, "--check-env-only", "--json"], {
  cwd: root,
  encoding: "utf8",
  env: {
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot,
    ComSpec: process.env.ComSpec
  }
});
assert.equal(missingCheck.status, 2, "command exits with blocker code when required references are absent");
const missingPayload = JSON.parse(missingCheck.stdout);
assert.equal(
  missingPayload.status,
  "blocked-missing-env-fixture-or-target-references",
  "command reports missing preconditions as sanitized reference names only"
);
assert.deepEqual(
  missingPayload.missingEnvReferences,
  ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED"],
  "command reports missing env reference names only"
);
assert.deepEqual(
  missingPayload.missingFixtureReferences,
  [
    "YOUTUBE_OAUTH_SMOKE_CREDENTIAL_REFERENCE_ID",
    "YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID",
    "YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID"
  ],
  "command reports missing fixture reference names only"
);
assert.deepEqual(
  missingPayload.missingTargetMetadataReferences,
  ["YOUTUBE_LIVE_RUNTIME_SMOKE_TARGET_METADATA_PRESENT"],
  "command reports missing target metadata reference names only"
);
assert.ok(
  !("ownerUserId" in missingPayload) && !("providerChannelId" in missingPayload),
  "missing preflight output omits owner and provider channel values"
);

const placeholderCheck = spawnSync(process.execPath, [commandPath, "--check-env-only", "--json"], {
  cwd: root,
  encoding: "utf8",
  env: {
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot,
    ComSpec: process.env.ComSpec,
    NEXT_PUBLIC_SUPABASE_URL: "<set locally; do not paste value>",
    ["SUPABASE_SERVICE_ROLE_KEY"]: "<set locally; do not paste value>",
    YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED: "0",
    YOUTUBE_OAUTH_SMOKE_CREDENTIAL_REFERENCE_ID: "smoke-post-pr358-placeholder",
    YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID: "<safe owner user id; do not paste back>",
    YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID: "<safe provider channel id; do not paste back>",
    YOUTUBE_LIVE_RUNTIME_SMOKE_TARGET_METADATA_PRESENT: "1",
    YOUTUBE_LIVE_RUNTIME_SMOKE_OWNER_AUTHORIZATION_CONFIRMED: "1"
  }
});
assert.equal(placeholderCheck.status, 2, "command blocks literal placeholder values");
const placeholderPayload = JSON.parse(placeholderCheck.stdout);
assert.equal(
  placeholderPayload.status,
  "blocked-placeholder-env-fixture-or-target-references",
  "command reports placeholder blockers as reference names only"
);
assert.deepEqual(
  placeholderPayload.placeholderReferences,
  [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID",
    "YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID"
  ],
  "placeholder output contains reference names only"
);

const ownerAuthorizationCheck = spawnSync(process.execPath, [commandPath, "--check-env-only", "--json"], {
  cwd: root,
  encoding: "utf8",
  env: {
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot,
    ComSpec: process.env.ComSpec,
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    ["SUPABASE_SERVICE_ROLE_KEY"]: "non-placeholder-presence-only",
    YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED: "0",
    YOUTUBE_OAUTH_SMOKE_CREDENTIAL_REFERENCE_ID: "smoke-post-pr358-command-001",
    YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID: "owner-reference-presence-only",
    YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID: "provider-channel-reference-presence-only",
    YOUTUBE_LIVE_RUNTIME_SMOKE_TARGET_METADATA_PRESENT: "1"
  }
});
assert.equal(ownerAuthorizationCheck.status, 2, "command blocks until owner authorization preflight shape is confirmed");
const ownerAuthorizationPayload = JSON.parse(ownerAuthorizationCheck.stdout);
assert.equal(
  ownerAuthorizationPayload.status,
  "blocked-owner-authorization-preflight-not-confirmed",
  "command requires owner authorization before owner verification or Live Chat polling"
);

const readyCheck = spawnSync(process.execPath, [commandPath, "--check-env-only", "--json"], {
  cwd: root,
  encoding: "utf8",
  env: {
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot,
    ComSpec: process.env.ComSpec,
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    ["SUPABASE_SERVICE_ROLE_KEY"]: "non-placeholder-presence-only",
    YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED: "0",
    YOUTUBE_OAUTH_SMOKE_CREDENTIAL_REFERENCE_ID: "smoke-post-pr358-command-001",
    YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID: "owner-reference-presence-only",
    YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID: "provider-channel-reference-presence-only",
    YOUTUBE_LIVE_RUNTIME_SMOKE_TARGET_METADATA_PRESENT: "1",
    YOUTUBE_LIVE_RUNTIME_SMOKE_OWNER_AUTHORIZATION_CONFIRMED: "1"
  }
});
assert.equal(readyCheck.status, 0, "command preflight can become ready when all sanitized references are present");
const readyPayload = JSON.parse(readyCheck.stdout);
assert.deepEqual(
  readyPayload,
  {
    status: "ready-for-sanitized-youtube-live-runtime-smoke-command",
    command: "sanitized-youtube-live-runtime-smoke",
    credentialReferenceId: "smoke-post-pr358-command-001",
    outputPolicy: "sanitized-metadata-only",
    ownerAuthorizationPreflight: "confirmed-by-reference-only",
    targetMetadata: "present-by-reference-only",
    tokenValue: "never-returned-by-design",
    refreshTokenValue: "never-returned-by-design"
  },
  "ready preflight output is sanitized and does not include owner or provider channel values"
);

const executeCheck = spawnSync(process.execPath, [commandPath, "--execute", "--json"], {
  cwd: root,
  encoding: "utf8",
  env: {
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot,
    ComSpec: process.env.ComSpec,
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    ["SUPABASE_SERVICE_ROLE_KEY"]: "non-placeholder-presence-only",
    YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED: "0",
    YOUTUBE_OAUTH_SMOKE_CREDENTIAL_REFERENCE_ID: "smoke-post-pr358-command-001",
    YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID: "owner-reference-presence-only",
    YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID: "provider-channel-reference-presence-only",
    YOUTUBE_LIVE_RUNTIME_SMOKE_TARGET_METADATA_PRESENT: "1",
    YOUTUBE_LIVE_RUNTIME_SMOKE_OWNER_AUTHORIZATION_CONFIRMED: "1"
  }
});
assert.equal(executeCheck.status, 0, "execute mode can resolve server-only token material without live provider calls");
const executePayload = JSON.parse(executeCheck.stdout);
assert.equal(
  executePayload.status,
  "resolved-for-server-fetch",
  "execute mode records sanitized server-only token resolution instead of printing OAuth token material"
);
assert.equal(
  executePayload.serverOnlyLiveTokenResolutionRuntime,
  "implemented-server-only-sanitized-runtime",
  "execute mode reports the server-only live token resolution runtime as implemented sanitized metadata"
);
assert.equal(executePayload.serverFetchBinding, "resolved-for-server-fetch", "execute output includes sanitized binding status");
assert.equal(executePayload.safeLiveYouTubeOAuthSmoke, "not-run", "execute mode does not run OAuth live smoke");
assert.equal(executePayload.ownerVerificationSmoke, "not-run", "execute mode does not run owner verification smoke");
assert.equal(executePayload.liveChatPollingSmoke, "not-run", "execute mode does not run Live Chat polling smoke");
assert.equal(executePayload.googleApiLiveCall, "not-run", "execute mode does not run Google API live calls");
assert.ok(
  !("ownerUserId" in executePayload) &&
    !("providerChannelId" in executePayload) &&
    !("authorizationHeader" in executePayload) &&
    !("serverAuthorizationHeader" in executePayload),
  "execute output omits owner, provider channel, and token material values"
);

const runtime = loadTsModule(runtimePath);
const commandBoundary = runtime.youtubeRuntimeSafeLiveSmokeCommandPostPr358;

assert.deepEqual(
  commandBoundary.prerequisiteRuntimeSmokeExecutionGate,
  {
    pullRequest: "#358",
    mergeCommit: pr358MergeCommit,
    status: "post-pr357-youtube-runtime-safe-live-smoke-execution-gate-merged"
  },
  "post-PR358 command boundary records the PR #358 merge premise"
);
assert.equal(
  commandBoundary.commandPath,
  commandPath,
  "post-PR358 command boundary records the dedicated command path"
);
assert.equal(
  commandBoundary.actualSafeLiveRuntimeSmoke,
  "not-run-blocked-pending-env-fixture-target-owner-authorization-or-live-token-resolution",
  "post-PR358 command boundary blocks actual live smoke until all sanitized preconditions and live token resolution exist"
);
assert.deepEqual(
  runtime.assessYouTubeRuntimeSafeLiveSmokeCommandPostPr358(
    commandBoundary.requiredReadinessChecks.filter((check) => check.status === "recorded")
  ),
  {
    status: "blocked-pending-env-fixture-target-owner-authorization-or-live-token-resolution",
    completedCheckIds: commandBoundary.requiredReadinessChecks
      .filter((check) => check.status === "recorded")
      .map((check) => check.id),
    blockingCheckIds: commandBoundary.requiredReadinessChecks
      .filter((check) => check.status === "blocking-external-action")
      .map((check) => check.id),
    safeLiveYouTubeOAuthSmokeExecuted: false,
    ownerVerificationSmokeExecuted: false,
    liveChatPollingSmokeExecuted: false,
    googleApiLiveCallExecuted: false,
    nextAction: "run-dedicated-command-only-when-sanitized-preflight-and-server-only-live-token-resolution-exist"
  },
  "post-PR358 command boundary assessment records blocker state without live provider calls"
);
assert.match(
  runtime.createYouTubeRuntimeSafeLiveSmokeCommandPostPr358Summary(),
  /post-pr358-dedicated-sanitized-youtube-live-runtime-smoke-command.*blocked-pending-env-fixture-target-owner-authorization-or-live-token-resolution/i,
  "post-PR358 command boundary summary records blocked command result"
);

const tokenResolutionReadiness = runtime.youtubeRuntimeLiveTokenResolutionReadinessPostPr359;

assert.deepEqual(
  tokenResolutionReadiness.prerequisiteLiveRuntimeSmokeCommand,
  {
    pullRequest: "#359",
    mergeCommit: "6972c0c600acbbb8bd596d2635416921f4fa6751",
    status: "post-pr358-dedicated-sanitized-live-runtime-smoke-command-merged"
  },
  "post-PR359 token resolution readiness records the PR #359 merge premise"
);
assert.equal(
  tokenResolutionReadiness.implementationStage,
  "post-pr359-server-only-live-token-resolution-readiness",
  "post-PR359 token resolution readiness stage is explicit"
);
assert.equal(
  tokenResolutionReadiness.serverOnlyLiveTokenResolutionRuntime,
  "not-implemented-readiness-only",
  "post-PR359 readiness records missing server-only live token resolution runtime"
);
assert.equal(
  tokenResolutionReadiness.actualSafeLiveRuntimeSmoke,
  "not-run-blocked-pending-server-only-live-token-resolution-runtime",
  "post-PR359 readiness blocks actual live smoke on live token resolution runtime"
);
assert.deepEqual(
  runtime.assessYouTubeRuntimeLiveTokenResolutionReadinessPostPr359(
    tokenResolutionReadiness.requiredReadinessChecks.filter((check) => check.status === "recorded")
  ),
  {
    status: "blocked-pending-server-only-live-token-resolution-runtime",
    completedCheckIds: tokenResolutionReadiness.requiredReadinessChecks
      .filter((check) => check.status === "recorded")
      .map((check) => check.id),
    blockingCheckIds: tokenResolutionReadiness.requiredReadinessChecks
      .filter((check) => check.status === "blocking-external-action")
      .map((check) => check.id),
    safeLiveYouTubeOAuthSmokeExecuted: false,
    ownerVerificationSmokeExecuted: false,
    liveChatPollingSmokeExecuted: false,
    googleApiLiveCallExecuted: false,
    nextAction: "implement-server-only-live-token-resolution-runtime-in-separate-approved-pr-before-actual-live-smoke"
  },
  "post-PR359 token resolution readiness stays blocked without live provider calls"
);
assert.match(
  runtime.createYouTubeRuntimeLiveTokenResolutionReadinessPostPr359Summary(),
  /post-pr359-server-only-live-token-resolution-readiness.*blocked-pending-server-only-live-token-resolution-runtime/i,
  "post-PR359 token resolution readiness summary records the blocker"
);

const runtimeContract = runtime.youtubeLiveTokenResolutionRuntimeContract;
assert.deepEqual(
  runtimeContract,
  {
    implementationStage: "post-pr360-server-only-live-token-resolution-runtime",
    prerequisiteReadiness: {
      pullRequest: "#360",
      mergeCommit: "5aba3649083352f7daad83791e7ee4fa811c22c9",
      status: "post-pr359-server-only-live-token-resolution-readiness-merged"
    },
    input: "credentialReferenceId-and-owner-authorization-context",
    requiredScope: "https://www.googleapis.com/auth/youtube.readonly",
    tokenMaterialHandling: "internal-server-fetch-consumer-only",
    outputPolicy: "sanitized-metadata-only",
    tokenValue: "never-returned-by-design",
    refreshTokenValue: "never-returned-by-design",
    liveGoogleApiCall: "not-run",
    refreshRuntime: "not-implemented",
    revocationRuntime: "not-implemented",
    browserStorage: "unchanged"
  },
  "post-PR360 runtime contract records server-only token resolution boundaries"
);

let materialConsumed = false;
const resolvedForFetch = await runtime.resolveYouTubeLiveTokenForServerFetch({
  credentialReferenceId: "smoke-post-pr360-runtime-001",
  ownerAuthorization: {
    status: "authorized",
    ownerUserId: "owner-reference-presence-only"
  },
  credentialResolutionDisabled: false,
  requiredScope: "https://www.googleapis.com/auth/youtube.readonly",
  nowIso: "2026-06-07T07:00:00.000Z",
  trustedStatusReader: {
    async getCredentialStatus(request) {
      assert.deepEqual(
        request,
        {
          credentialReferenceId: "smoke-post-pr360-runtime-001",
          ownerUserId: "owner-reference-presence-only"
        },
        "runtime performs owner-authorized status read before token material resolution"
      );

      return {
        credentialReferenceId: "smoke-post-pr360-runtime-001",
        provider: "youtube",
        providerChannelId: "provider-channel-reference-presence-only",
        scopeLabel: "youtube.readonly",
        scopeSet: ["https://www.googleapis.com/auth/youtube.readonly"],
        expiresAtIso: "2026-06-07T08:00:00.000Z",
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
    async resolveServerOnlyTokenMaterial(request) {
      assert.deepEqual(
        request,
        {
          credentialReferenceId: "smoke-post-pr360-runtime-001",
          ownerUserId: "owner-reference-presence-only",
          requiredScope: "https://www.googleapis.com/auth/youtube.readonly"
        },
        "runtime passes only server-side authorization references to the token material resolver"
      );

      return {
        status: "available",
        serverAuthorizationHeader: "server-only-test-authorization",
        expiresAtIso: "2026-06-07T08:00:00.000Z"
      };
    }
  },
  async consumeServerFetchAuthorization(binding) {
    materialConsumed = true;
    assert.equal(binding.serverAuthorizationHeader, "server-only-test-authorization", "token material is available only inside the server fetch consumer");
    return {
      serverFetchBinding: "resolved-for-server-fetch"
    };
  }
});

assert.equal(materialConsumed, true, "runtime consumes token material internally");
assert.deepEqual(
  resolvedForFetch,
  {
    status: "resolved-for-server-fetch",
    credentialReferenceId: "smoke-post-pr360-runtime-001",
    provider: "youtube",
    scopeLabel: "youtube.readonly",
    expiryStatus: "active",
    serverFetchBinding: "resolved-for-server-fetch",
    tokenValue: "never-returned-by-design",
    refreshTokenValue: "never-returned-by-design"
  },
  "runtime returns only sanitized token resolution metadata"
);

for (const blockedCase of [
  {
    name: "credential resolution disabled",
    request: {
      credentialResolutionDisabled: true
    },
    expectedStatus: "credential-resolution-disabled"
  },
  {
    name: "owner authorization blocked",
    request: {
      ownerAuthorization: {
        status: "blocked",
        reason: "owner-authorization-preflight-not-confirmed"
      }
    },
    expectedStatus: "blocked-owner-authorization"
  }
]) {
  const result = await runtime.resolveYouTubeLiveTokenForServerFetch({
    credentialReferenceId: "smoke-post-pr360-runtime-001",
    ownerAuthorization: {
      status: "authorized",
      ownerUserId: "owner-reference-presence-only"
    },
    credentialResolutionDisabled: false,
    requiredScope: "https://www.googleapis.com/auth/youtube.readonly",
    nowIso: "2026-06-07T07:00:00.000Z",
    trustedStatusReader: null,
    tokenMaterialResolver: {
      async resolveServerOnlyTokenMaterial() {
        throw new Error(`must not resolve material for ${blockedCase.name}`);
      }
    },
    async consumeServerFetchAuthorization() {
      throw new Error(`must not consume material for ${blockedCase.name}`);
    },
    ...blockedCase.request
  });

  assert.equal(result.status, blockedCase.expectedStatus, `runtime blocks ${blockedCase.name}`);
  assert.equal(result.tokenValue, "never-returned-by-design", "blocked result omits token values");
  assert.equal(result.refreshTokenValue, "never-returned-by-design", "blocked result omits refresh token values");
}

assert.equal(
  (
    await runtime.resolveYouTubeLiveTokenForServerFetch({
      credentialReferenceId: "smoke-post-pr360-runtime-001",
      ownerAuthorization: {
        status: "authorized",
        ownerUserId: "owner-reference-presence-only"
      },
      credentialResolutionDisabled: false,
      requiredScope: "https://www.googleapis.com/auth/youtube.readonly",
      nowIso: "2026-06-07T07:00:00.000Z",
      trustedStatusReader: null,
      tokenMaterialResolver: {
        async resolveServerOnlyTokenMaterial() {
          throw new Error("must not resolve material without a trusted status reader");
        }
      },
      async consumeServerFetchAuthorization() {
        throw new Error("must not consume material without a trusted status reader");
      }
    })
  ).status,
  "unavailable",
  "runtime reports unavailable when trusted status reader is not wired"
);

assert.match(
  taskSource,
  /PR #360 `MERGED`[\s\S]*2026-06-07T06:12:11Z[\s\S]*Cloudflare Pages FAILURE[\s\S]*Workers Builds SUCCESS/i,
  "task.md records fresh PR #360 metadata and check disposition"
);
assert.match(
  taskSource,
  /post-PR #360 server-only live token resolution runtime/i,
  "task.md records the post-PR360 server-only live token resolution runtime slice"
);
assert.match(
  taskSource,
  /serverOnlyLiveTokenResolutionRuntime: implemented-server-only-sanitized-runtime/i,
  "task.md records the implemented sanitized runtime result"
);
assert.match(
  taskSource,
  /actual safe live runtime smoke は `not-run-blocked-missing-env-fixture-or-target-references`/i,
  "task.md records the actual live smoke blocker after post-PR360 runtime"
);
assert.match(
  taskSource,
  /PR #358 `MERGED`[\s\S]*2026-06-07T04:35:20Z[\s\S]*Cloudflare Pages FAILURE[\s\S]*Workers Builds SUCCESS/i,
  "task.md records fresh PR #358 metadata and check disposition"
);
assert.match(
  taskSource,
  /PR #359 `MERGED`[\s\S]*2026-06-07T05:46:13Z[\s\S]*Cloudflare Pages FAILURE[\s\S]*Workers Builds SUCCESS/i,
  "task.md records fresh PR #359 metadata and check disposition"
);
assert.match(
  taskSource,
  /post-PR #359 server-only live token resolution readiness/i,
  "task.md records the post-PR359 server-only live token resolution readiness slice"
);
assert.match(
  taskSource,
  /post-PR #358 dedicated sanitized YouTube live runtime smoke command/i,
  "task.md records the post-PR358 command slice"
);
assert.match(
  taskSource,
  /width verification: UI \/ rendered text \/ CSS は変更していない/i,
  "task.md records the width-check skip reason for this non-UI command slice"
);

for (const file of [
  runtimePath,
  commandPath,
  "scripts/comment-translator-youtube-live-runtime-smoke-command-contract.mjs",
  taskPath
]) {
  const source = read(file);
  assert.doesNotMatch(
    source,
    /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY/i,
    `${file} does not contain OAuth token values, authorization codes, private keys, or service role key values`
  );
}

console.log("comment translator YouTube live runtime smoke command contract checks passed");
