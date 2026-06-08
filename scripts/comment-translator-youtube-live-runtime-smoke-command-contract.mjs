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
  "YouTubeLiveTokenResolutionRuntimeResult",
  "YouTubeRuntimeActualSafeLiveSmokePostPr361Check",
  "YouTubeRuntimeActualSafeLiveSmokePostPr361",
  "YouTubeRuntimeActualSafeLiveSmokePostPr361Assessment",
  "YouTubeRuntimeActualSafeLiveSmokeReadinessPostPr362Check",
  "YouTubeRuntimeActualSafeLiveSmokeReadinessPostPr362",
  "YouTubeRuntimeActualSafeLiveSmokeReadinessPostPr362Assessment",
  "YouTubeRuntimeSafeLiveSmokeTargetMetadataPreflightPostPr364Check",
  "YouTubeRuntimeSafeLiveSmokeTargetMetadataPreflightPostPr364",
  "YouTubeRuntimeSafeLiveSmokeTargetMetadataPreflightPostPr364Assessment",
  "YouTubeRuntimeSafeLiveSmokePostPr365PreflightCheck",
  "YouTubeRuntimeSafeLiveSmokePostPr365Preflight",
  "YouTubeRuntimeSafeLiveSmokePostPr365PreflightAssessment",
  "YouTubeRuntimeSafeLiveSmokePostPr366ExecutionGateCheck",
  "YouTubeRuntimeSafeLiveSmokePostPr366ExecutionGate",
  "YouTubeRuntimeSafeLiveSmokePostPr366ExecutionGateAssessment",
  "YouTubeRuntimeSafeLiveSmokePostPr367ReadinessRecheckCheck",
  "YouTubeRuntimeSafeLiveSmokePostPr367ReadinessRecheck",
  "YouTubeRuntimeSafeLiveSmokePostPr367ReadinessRecheckAssessment",
  "YouTubeRuntimeSafeLiveSmokePostPr368ReadinessRecheckCheck",
  "YouTubeRuntimeSafeLiveSmokePostPr368ReadinessRecheck",
  "YouTubeRuntimeSafeLiveSmokePostPr368ReadinessRecheckAssessment",
  "YouTubeRuntimeSafeLiveSmokePostPr369ReadinessRecheckCheck",
  "YouTubeRuntimeSafeLiveSmokePostPr369ReadinessRecheck",
  "YouTubeRuntimeSafeLiveSmokePostPr369ReadinessRecheckAssessment"
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
  "resolveYouTubeLiveTokenForServerFetch",
  "youtubeRuntimeActualSafeLiveSmokePostPr361",
  "assessYouTubeRuntimeActualSafeLiveSmokePostPr361",
  "createYouTubeRuntimeActualSafeLiveSmokePostPr361Summary",
  "youtubeRuntimeActualSafeLiveSmokeReadinessPostPr362",
  "assessYouTubeRuntimeActualSafeLiveSmokeReadinessPostPr362",
  "createYouTubeRuntimeActualSafeLiveSmokeReadinessPostPr362Summary",
  "youtubeRuntimeSafeLiveSmokeTargetMetadataPreflightPostPr364",
  "assessYouTubeRuntimeSafeLiveSmokeTargetMetadataPreflightPostPr364",
  "createYouTubeRuntimeSafeLiveSmokeTargetMetadataPreflightPostPr364Summary",
  "youtubeRuntimeSafeLiveSmokePostPr365Preflight",
  "assessYouTubeRuntimeSafeLiveSmokePostPr365Preflight",
  "createYouTubeRuntimeSafeLiveSmokePostPr365PreflightSummary",
  "youtubeRuntimeSafeLiveSmokePostPr366ExecutionGate",
  "assessYouTubeRuntimeSafeLiveSmokePostPr366ExecutionGate",
  "createYouTubeRuntimeSafeLiveSmokePostPr366ExecutionGateSummary",
  "youtubeRuntimeSafeLiveSmokePostPr367ReadinessRecheck",
  "assessYouTubeRuntimeSafeLiveSmokePostPr367ReadinessRecheck",
  "createYouTubeRuntimeSafeLiveSmokePostPr367ReadinessRecheckSummary",
  "youtubeRuntimeSafeLiveSmokePostPr368ReadinessRecheck",
  "assessYouTubeRuntimeSafeLiveSmokePostPr368ReadinessRecheck",
  "createYouTubeRuntimeSafeLiveSmokePostPr368ReadinessRecheckSummary",
  "youtubeRuntimeSafeLiveSmokePostPr369ReadinessRecheck",
  "assessYouTubeRuntimeSafeLiveSmokePostPr369ReadinessRecheck",
  "createYouTubeRuntimeSafeLiveSmokePostPr369ReadinessRecheckSummary"
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

const actualSafeLiveGatePostPr361 = runtime.youtubeRuntimeActualSafeLiveSmokePostPr361;
assert.deepEqual(
  actualSafeLiveGatePostPr361.prerequisiteServerOnlyLiveTokenResolutionRuntime,
  {
    pullRequest: "#361",
    mergeCommit: "e3ad69d0499422dc7ea064e55ca7ee319782bb5b",
    status: "post-pr360-server-only-live-token-resolution-runtime-merged"
  },
  "post-PR361 actual safe live smoke gate records the PR #361 merge premise"
);
assert.equal(
  actualSafeLiveGatePostPr361.implementationStage,
  "post-pr361-actual-safe-live-youtube-smoke-preflight-execution-gate",
  "post-PR361 actual safe live smoke gate stage is explicit"
);
assert.equal(
  actualSafeLiveGatePostPr361.dedicatedCommandPath,
  commandPath,
  "post-PR361 actual safe live smoke gate keeps the dedicated sanitized command boundary"
);
assert.equal(
  actualSafeLiveGatePostPr361.commandExecutionMode,
  "check-env-only-first-execute-only-after-sanitized-ready-preflight",
  "post-PR361 actual safe live smoke gate requires preflight before execute"
);
assert.equal(
  actualSafeLiveGatePostPr361.serverOnlyLiveTokenResolutionRuntime,
  "implemented-server-only-sanitized-runtime",
  "post-PR361 actual safe live smoke gate treats the PR #361 runtime as implemented"
);
assert.equal(
  actualSafeLiveGatePostPr361.actualSafeLiveRuntimeSmoke,
  "not-run-blocked-missing-env-fixture-or-target-references",
  "post-PR361 actual safe live smoke stays blocked when current sanitized preflight is missing references"
);
assert.equal(
  actualSafeLiveGatePostPr361.commandExecuteResult,
  "not-run-preflight-blocked",
  "post-PR361 gate does not run --execute while preflight is blocked"
);
assert.deepEqual(
  actualSafeLiveGatePostPr361.currentCodexProcessPreflight,
  {
    command: "node scripts/comment-translator-youtube-live-runtime-smoke-command.mjs --check-env-only --json",
    status: "blocked-missing-env-fixture-or-target-references",
    missingEnvReferences: [
      "NEXT_PUBLIC_SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED"
    ],
    missingFixtureReferences: [
      "YOUTUBE_OAUTH_SMOKE_CREDENTIAL_REFERENCE_ID",
      "YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID",
      "YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID"
    ],
    missingTargetMetadataReferences: ["YOUTUBE_LIVE_RUNTIME_SMOKE_TARGET_METADATA_PRESENT"],
    ownerAuthorizationPreflightReference: "YOUTUBE_LIVE_RUNTIME_SMOKE_OWNER_AUTHORIZATION_CONFIRMED",
    valuesReadOrPrinted: false
  },
  "post-PR361 actual safe live smoke gate records current sanitized blocker by reference names only"
);
assert.deepEqual(
  runtime.assessYouTubeRuntimeActualSafeLiveSmokePostPr361(
    actualSafeLiveGatePostPr361.requiredReadinessChecks.filter((check) => check.status === "recorded")
  ),
  {
    status: "blocked-missing-env-fixture-or-target-references",
    completedCheckIds: actualSafeLiveGatePostPr361.requiredReadinessChecks
      .filter((check) => check.status === "recorded")
      .map((check) => check.id),
    blockingCheckIds: actualSafeLiveGatePostPr361.requiredReadinessChecks
      .filter((check) => check.status === "blocking-external-action")
      .map((check) => check.id),
    safeLiveYouTubeOAuthSmokeExecuted: false,
    ownerVerificationSmokeExecuted: false,
    liveChatPollingSmokeExecuted: false,
    googleApiLiveCallExecuted: false,
    commandExecuteAllowed: false,
    nextAction: "provide-sanitized-env-fixture-target-and-owner-authorization-references-before-actual-live-smoke"
  },
  "post-PR361 actual safe live smoke assessment blocks actual execution without all sanitized preconditions"
);
assert.match(
  runtime.createYouTubeRuntimeActualSafeLiveSmokePostPr361Summary(),
  /post-pr361-actual-safe-live-youtube-smoke-preflight-execution-gate.*blocked-missing-env-fixture-or-target-references/i,
  "post-PR361 actual safe live smoke summary records the blocker"
);

const actualSafeLiveReadinessPostPr362 = runtime.youtubeRuntimeActualSafeLiveSmokeReadinessPostPr362;
assert.deepEqual(
  actualSafeLiveReadinessPostPr362.prerequisiteActualSafeLiveSmokeGate,
  {
    pullRequest: "#362",
    mergeCommit: "5a7d564d3360e5ba7b06ee74856980a68232adce",
    status: "post-pr361-actual-safe-live-youtube-smoke-preflight-execution-gate-merged"
  },
  "post-PR362 readiness records the PR #362 merge premise"
);
assert.equal(
  actualSafeLiveReadinessPostPr362.implementationStage,
  "post-pr362-actual-safe-live-youtube-smoke-readiness-blocker-repoint",
  "post-PR362 readiness stage is explicit"
);
assert.equal(
  actualSafeLiveReadinessPostPr362.dedicatedCommandPath,
  commandPath,
  "post-PR362 readiness keeps the dedicated sanitized command boundary"
);
assert.equal(
  actualSafeLiveReadinessPostPr362.commandExecutionMode,
  "check-env-only-first-execute-not-run-in-this-readiness-repoint",
  "post-PR362 readiness records that execute is not part of this repoint"
);
assert.equal(
  actualSafeLiveReadinessPostPr362.actualSafeLiveRuntimeSmoke,
  "not-run-blocked-missing-env-fixture-or-target-references",
  "post-PR362 readiness keeps actual live smoke blocked on missing sanitized references"
);
assert.equal(
  actualSafeLiveReadinessPostPr362.commandExecuteResult,
  "not-run-readiness-repoint-only",
  "post-PR362 readiness does not run --execute even when documenting blockers"
);
assert.deepEqual(
  actualSafeLiveReadinessPostPr362.currentCodexProcessPreflight,
  {
    command: "node scripts/comment-translator-youtube-live-runtime-smoke-command.mjs --check-env-only --json",
    status: "blocked-missing-env-fixture-or-target-references",
    missingEnvReferences: [
      "NEXT_PUBLIC_SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED"
    ],
    missingFixtureReferences: [
      "YOUTUBE_OAUTH_SMOKE_CREDENTIAL_REFERENCE_ID",
      "YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID",
      "YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID"
    ],
    missingTargetMetadataReferences: ["YOUTUBE_LIVE_RUNTIME_SMOKE_TARGET_METADATA_PRESENT"],
    ownerAuthorizationPreflightReference: "YOUTUBE_LIVE_RUNTIME_SMOKE_OWNER_AUTHORIZATION_CONFIRMED",
    valuesReadOrPrinted: false
  },
  "post-PR362 readiness records current sanitized blocker by reference names only"
);
assert.deepEqual(
  runtime.assessYouTubeRuntimeActualSafeLiveSmokeReadinessPostPr362(
    actualSafeLiveReadinessPostPr362.requiredReadinessChecks.filter((check) => check.status === "recorded")
  ),
  {
    status: "blocked-missing-env-fixture-or-target-references",
    completedCheckIds: actualSafeLiveReadinessPostPr362.requiredReadinessChecks
      .filter((check) => check.status === "recorded")
      .map((check) => check.id),
    blockingCheckIds: actualSafeLiveReadinessPostPr362.requiredReadinessChecks
      .filter((check) => check.status === "blocking-external-action")
      .map((check) => check.id),
    safeLiveYouTubeOAuthSmokeExecuted: false,
    ownerVerificationSmokeExecuted: false,
    liveChatPollingSmokeExecuted: false,
    googleApiLiveCallExecuted: false,
    commandExecuteAllowed: false,
    nextAction: "open-separate-live-smoke-execution-pr-only-after-sanitized-references-and-owner-authorization-are-present"
  },
  "post-PR362 readiness blocks actual execution without all sanitized preconditions"
);
assert.match(
  runtime.createYouTubeRuntimeActualSafeLiveSmokeReadinessPostPr362Summary(),
  /post-pr362-actual-safe-live-youtube-smoke-readiness-blocker-repoint.*blocked-missing-env-fixture-or-target-references/i,
  "post-PR362 readiness summary records the blocker"
);

const targetMetadataPreflightPostPr364 = runtime.youtubeRuntimeSafeLiveSmokeTargetMetadataPreflightPostPr364;
assert.deepEqual(
  targetMetadataPreflightPostPr364.prerequisiteSafeLiveSmokeBlocker,
  {
    pullRequest: "#364",
    mergeCommit: "3b722a6c6d2f21ab32565e48a2d2727ca7da75a4",
    status: "post-pr363-safe-live-smoke-blocker-merged"
  },
  "post-PR364 target metadata preflight records the PR #364 merge premise"
);
assert.equal(
  targetMetadataPreflightPostPr364.implementationStage,
  "post-pr364-safe-live-youtube-smoke-target-metadata-preflight",
  "post-PR364 target metadata preflight stage is explicit"
);
assert.equal(
  targetMetadataPreflightPostPr364.commandExecutionMode,
  "check-env-only-first-execute-forbidden-while-sanitized-preflight-blocked",
  "post-PR364 target metadata preflight forbids execute while preflight is blocked"
);
assert.deepEqual(
  targetMetadataPreflightPostPr364.currentCodexProcessPreflight,
  actualSafeLiveReadinessPostPr362.currentCodexProcessPreflight,
  "post-PR364 target metadata preflight records the current sanitized blocker by reference names only"
);
assert.equal(
  targetMetadataPreflightPostPr364.targetMetadataPreflight,
  "blocked-missing-repo-local-concrete-non-secret-target-metadata-reference",
  "post-PR364 target metadata preflight stays blocked without repo-local target metadata"
);
assert.equal(
  targetMetadataPreflightPostPr364.commandExecuteResult,
  "not-run-preflight-blocked",
  "post-PR364 target metadata preflight does not run --execute"
);
assert.deepEqual(
  runtime.assessYouTubeRuntimeSafeLiveSmokeTargetMetadataPreflightPostPr364(
    targetMetadataPreflightPostPr364.requiredReadinessChecks.filter((check) => check.status === "recorded")
  ),
  {
    status: "blocked-missing-env-fixture-or-target-references",
    completedCheckIds: targetMetadataPreflightPostPr364.requiredReadinessChecks
      .filter((check) => check.status === "recorded")
      .map((check) => check.id),
    blockingCheckIds: targetMetadataPreflightPostPr364.requiredReadinessChecks
      .filter((check) => check.status === "blocking-external-action")
      .map((check) => check.id),
    safeLiveYouTubeOAuthSmokeExecuted: false,
    ownerVerificationSmokeExecuted: false,
    liveChatPollingSmokeExecuted: false,
    googleApiLiveCallExecuted: false,
    commandExecuteAllowed: false,
    nextAction: "collect-repo-local-non-secret-target-metadata-env-fixture-and-owner-authorization-before-actual-live-smoke"
  },
  "post-PR364 target metadata preflight remains blocker-only without all sanitized preconditions"
);
assert.match(
  runtime.createYouTubeRuntimeSafeLiveSmokeTargetMetadataPreflightPostPr364Summary(),
  /post-pr364-safe-live-youtube-smoke-target-metadata-preflight.*blocked-missing-env-fixture-or-target-references/i,
  "post-PR364 target metadata preflight summary records the blocker"
);

const postPr365Preflight = runtime.youtubeRuntimeSafeLiveSmokePostPr365Preflight;
assert.deepEqual(
  postPr365Preflight.prerequisiteSafeLiveTargetMetadataPreflight,
  {
    pullRequest: "#365",
    mergeCommit: "84f476b27c100eb7b1b5640bcd8a7905143c1e5f",
    status: "post-pr364-safe-live-target-metadata-preflight-merged"
  },
  "post-PR365 preflight records the PR #365 merge premise"
);
assert.equal(
  postPr365Preflight.implementationStage,
  "post-pr365-safe-live-youtube-smoke-preflight",
  "post-PR365 preflight stage is explicit"
);
assert.equal(
  postPr365Preflight.commandExecutionMode,
  "check-env-only-first-execute-forbidden-while-sanitized-preflight-blocked",
  "post-PR365 preflight forbids execute while preflight is blocked"
);
assert.deepEqual(
  postPr365Preflight.currentCodexProcessPreflight,
  targetMetadataPreflightPostPr364.currentCodexProcessPreflight,
  "post-PR365 preflight keeps the current sanitized blocker by reference names only"
);
assert.equal(
  postPr365Preflight.actualSafeLiveRuntimeSmoke,
  "not-run-blocked-missing-env-fixture-or-target-references",
  "post-PR365 preflight does not overclaim actual live smoke"
);
assert.equal(postPr365Preflight.commandExecuteResult, "not-run-preflight-blocked", "post-PR365 does not run --execute");
assert.deepEqual(
  runtime.assessYouTubeRuntimeSafeLiveSmokePostPr365Preflight(
    postPr365Preflight.requiredReadinessChecks.filter((check) => check.status === "recorded")
  ),
  {
    status: "blocked-missing-env-fixture-or-target-references",
    completedCheckIds: postPr365Preflight.requiredReadinessChecks
      .filter((check) => check.status === "recorded")
      .map((check) => check.id),
    blockingCheckIds: postPr365Preflight.requiredReadinessChecks
      .filter((check) => check.status === "blocking-external-action")
      .map((check) => check.id),
    safeLiveYouTubeOAuthSmokeExecuted: false,
    ownerVerificationSmokeExecuted: false,
    liveChatPollingSmokeExecuted: false,
    googleApiLiveCallExecuted: false,
    commandExecuteAllowed: false,
    nextAction: "collect-concrete-target-metadata-env-fixture-owner-authorization-and-server-only-runtime-in-separate-live-smoke-pr"
  },
  "post-PR365 preflight remains blocker-only without all sanitized preconditions"
);
assert.match(
  runtime.createYouTubeRuntimeSafeLiveSmokePostPr365PreflightSummary(),
  /post-pr365-safe-live-youtube-smoke-preflight.*blocked-missing-env-fixture-or-target-references/i,
  "post-PR365 preflight summary records the blocker"
);

const postPr366ExecutionGate = runtime.youtubeRuntimeSafeLiveSmokePostPr366ExecutionGate;
assert.deepEqual(
  postPr366ExecutionGate.prerequisitePostPr365Preflight,
  {
    pullRequest: "#366",
    mergeCommit: "405c0c7f830f5dd8e574bcc5d7204ca3bf487c1f",
    status: "post-pr365-live-smoke-preflight-blocker-merged"
  },
  "post-PR366 execution gate records the PR #366 merge premise"
);
assert.equal(
  postPr366ExecutionGate.implementationStage,
  "post-pr366-safe-live-youtube-smoke-execution-gate",
  "post-PR366 execution gate stage is explicit"
);
assert.equal(
  postPr366ExecutionGate.commandExecutionMode,
  "check-env-only-first-execute-forbidden-while-sanitized-preflight-blocked",
  "post-PR366 execution gate forbids execute while preflight is blocked"
);
assert.deepEqual(
  postPr366ExecutionGate.currentCodexProcessPreflight,
  postPr365Preflight.currentCodexProcessPreflight,
  "post-PR366 execution gate keeps the current sanitized blocker by reference names only"
);
assert.equal(
  postPr366ExecutionGate.actualSafeLiveRuntimeSmoke,
  "not-run-blocked-missing-env-fixture-or-target-references",
  "post-PR366 execution gate does not overclaim actual live smoke"
);
assert.equal(
  postPr366ExecutionGate.commandExecuteResult,
  "not-run-preflight-blocked",
  "post-PR366 does not run --execute"
);
assert.deepEqual(
  runtime.assessYouTubeRuntimeSafeLiveSmokePostPr366ExecutionGate(
    postPr366ExecutionGate.requiredReadinessChecks.filter((check) => check.status === "recorded")
  ),
  {
    status: "blocked-missing-env-fixture-or-target-references",
    completedCheckIds: postPr366ExecutionGate.requiredReadinessChecks
      .filter((check) => check.status === "recorded")
      .map((check) => check.id),
    blockingCheckIds: postPr366ExecutionGate.requiredReadinessChecks
      .filter((check) => check.status === "blocking-external-action")
      .map((check) => check.id),
    safeLiveYouTubeOAuthSmokeExecuted: false,
    ownerVerificationSmokeExecuted: false,
    liveChatPollingSmokeExecuted: false,
    googleApiLiveCallExecuted: false,
    commandExecuteAllowed: false,
    nextAction: "collect-concrete-target-metadata-env-fixture-owner-authorization-and-server-only-runtime-before-execute-in-separate-live-smoke-pr"
  },
  "post-PR366 execution gate remains blocker-only without all sanitized preconditions"
);
assert.match(
  runtime.createYouTubeRuntimeSafeLiveSmokePostPr366ExecutionGateSummary(),
  /post-pr366-safe-live-youtube-smoke-execution-gate.*blocked-missing-env-fixture-or-target-references/i,
  "post-PR366 execution gate summary records the blocker"
);

const postPr367ReadinessRecheck = runtime.youtubeRuntimeSafeLiveSmokePostPr367ReadinessRecheck;
assert.deepEqual(
  postPr367ReadinessRecheck.prerequisitePostPr366ExecutionGate,
  {
    pullRequest: "#367",
    mergeCommit: "717825db9a36ea67ae4b16c6e487f5d6e1962c1b",
    status: "post-pr366-live-smoke-execution-gate-merged"
  },
  "post-PR367 readiness recheck records the PR #367 merge premise"
);
assert.equal(
  postPr367ReadinessRecheck.implementationStage,
  "post-pr367-safe-live-youtube-smoke-readiness-recheck",
  "post-PR367 readiness recheck stage is explicit"
);
assert.equal(
  postPr367ReadinessRecheck.commandExecutionMode,
  "check-env-only-first-execute-forbidden-while-sanitized-preflight-blocked",
  "post-PR367 readiness recheck forbids execute while preflight is blocked"
);
assert.deepEqual(
  postPr367ReadinessRecheck.currentCodexProcessPreflight,
  postPr366ExecutionGate.currentCodexProcessPreflight,
  "post-PR367 readiness recheck keeps the current sanitized blocker by reference names only"
);
assert.equal(
  postPr367ReadinessRecheck.actualSafeLiveRuntimeSmoke,
  "not-run-blocked-missing-env-fixture-or-target-references",
  "post-PR367 readiness recheck does not overclaim actual live smoke"
);
assert.equal(
  postPr367ReadinessRecheck.commandExecuteResult,
  "not-run-preflight-blocked",
  "post-PR367 does not run --execute"
);
assert.deepEqual(
  runtime.assessYouTubeRuntimeSafeLiveSmokePostPr367ReadinessRecheck(
    postPr367ReadinessRecheck.requiredReadinessChecks.filter((check) => check.status === "recorded")
  ),
  {
    status: "blocked-missing-env-fixture-or-target-references",
    completedCheckIds: postPr367ReadinessRecheck.requiredReadinessChecks
      .filter((check) => check.status === "recorded")
      .map((check) => check.id),
    blockingCheckIds: postPr367ReadinessRecheck.requiredReadinessChecks
      .filter((check) => check.status === "blocking-external-action")
      .map((check) => check.id),
    safeLiveYouTubeOAuthSmokeExecuted: false,
    ownerVerificationSmokeExecuted: false,
    liveChatPollingSmokeExecuted: false,
    googleApiLiveCallExecuted: false,
    commandExecuteAllowed: false,
    nextAction: "collect-concrete-target-metadata-env-fixture-owner-authorization-and-server-only-runtime-before-execute-in-separate-live-smoke-pr"
  },
  "post-PR367 readiness recheck remains blocker-only without all sanitized preconditions"
);
assert.match(
  runtime.createYouTubeRuntimeSafeLiveSmokePostPr367ReadinessRecheckSummary(),
  /post-pr367-safe-live-youtube-smoke-readiness-recheck.*blocked-missing-env-fixture-or-target-references/i,
  "post-PR367 readiness recheck summary records the blocker"
);

const postPr368ReadinessRecheck = runtime.youtubeRuntimeSafeLiveSmokePostPr368ReadinessRecheck;
assert.deepEqual(
  postPr368ReadinessRecheck.prerequisitePostPr367ReadinessRecheck,
  {
    pullRequest: "#368",
    mergeCommit: "6b7a61f44dacf1a8b0407c549a643dc3e1b6874b",
    status: "post-pr367-live-smoke-readiness-blocker-merged"
  },
  "post-PR368 readiness recheck records the PR #368 merge premise"
);
assert.equal(
  postPr368ReadinessRecheck.implementationStage,
  "post-pr368-safe-live-youtube-smoke-readiness-recheck",
  "post-PR368 readiness recheck stage is explicit"
);
assert.equal(
  postPr368ReadinessRecheck.commandExecutionMode,
  "check-env-only-first-execute-forbidden-while-sanitized-preflight-blocked",
  "post-PR368 readiness recheck forbids execute while preflight is blocked"
);
assert.deepEqual(
  postPr368ReadinessRecheck.currentCodexProcessPreflight,
  postPr367ReadinessRecheck.currentCodexProcessPreflight,
  "post-PR368 readiness recheck keeps the current sanitized blocker by reference names only"
);
assert.equal(
  postPr368ReadinessRecheck.actualSafeLiveRuntimeSmoke,
  "not-run-blocked-missing-env-fixture-or-target-references",
  "post-PR368 readiness recheck does not overclaim actual live smoke"
);
assert.equal(
  postPr368ReadinessRecheck.commandExecuteResult,
  "not-run-preflight-blocked",
  "post-PR368 does not run --execute"
);
assert.deepEqual(
  runtime.assessYouTubeRuntimeSafeLiveSmokePostPr368ReadinessRecheck(
    postPr368ReadinessRecheck.requiredReadinessChecks.filter((check) => check.status === "recorded")
  ),
  {
    status: "blocked-missing-env-fixture-or-target-references",
    completedCheckIds: postPr368ReadinessRecheck.requiredReadinessChecks
      .filter((check) => check.status === "recorded")
      .map((check) => check.id),
    blockingCheckIds: postPr368ReadinessRecheck.requiredReadinessChecks
      .filter((check) => check.status === "blocking-external-action")
      .map((check) => check.id),
    safeLiveYouTubeOAuthSmokeExecuted: false,
    ownerVerificationSmokeExecuted: false,
    liveChatPollingSmokeExecuted: false,
    googleApiLiveCallExecuted: false,
    commandExecuteAllowed: false,
    nextAction: "collect-concrete-target-metadata-env-fixture-owner-authorization-and-server-only-runtime-before-execute-in-separate-live-smoke-pr"
  },
  "post-PR368 readiness recheck remains blocker-only without all sanitized preconditions"
);
assert.match(
  runtime.createYouTubeRuntimeSafeLiveSmokePostPr368ReadinessRecheckSummary(),
  /post-pr368-safe-live-youtube-smoke-readiness-recheck.*blocked-missing-env-fixture-or-target-references/i,
  "post-PR368 readiness recheck summary records the blocker"
);

const postPr369ReadinessRecheck = runtime.youtubeRuntimeSafeLiveSmokePostPr369ReadinessRecheck;
assert.deepEqual(
  postPr369ReadinessRecheck.prerequisitePostPr368ReadinessRecheck,
  {
    pullRequest: "#369",
    mergeCommit: "651bdc38a46a6a76d6745a06111e5a88534001aa",
    status: "post-pr368-live-smoke-readiness-blocker-merged"
  },
  "post-PR369 readiness recheck records the PR #369 merge premise"
);
assert.equal(
  postPr369ReadinessRecheck.implementationStage,
  "post-pr369-safe-live-youtube-smoke-readiness-recheck",
  "post-PR369 readiness recheck stage is explicit"
);
assert.equal(
  postPr369ReadinessRecheck.commandExecutionMode,
  "check-env-only-first-execute-forbidden-while-sanitized-preflight-blocked",
  "post-PR369 readiness recheck forbids execute while preflight is blocked"
);
assert.deepEqual(
  postPr369ReadinessRecheck.currentCodexProcessPreflight,
  postPr368ReadinessRecheck.currentCodexProcessPreflight,
  "post-PR369 readiness recheck keeps the current sanitized blocker by reference names only"
);
assert.equal(
  postPr369ReadinessRecheck.actualSafeLiveRuntimeSmoke,
  "not-run-blocked-missing-env-fixture-or-target-references",
  "post-PR369 readiness recheck does not overclaim actual live smoke"
);
assert.equal(
  postPr369ReadinessRecheck.commandExecuteResult,
  "not-run-preflight-blocked",
  "post-PR369 does not run --execute"
);
assert.deepEqual(
  runtime.assessYouTubeRuntimeSafeLiveSmokePostPr369ReadinessRecheck(
    postPr369ReadinessRecheck.requiredReadinessChecks.filter((check) => check.status === "recorded")
  ),
  {
    status: "blocked-missing-env-fixture-or-target-references",
    completedCheckIds: postPr369ReadinessRecheck.requiredReadinessChecks
      .filter((check) => check.status === "recorded")
      .map((check) => check.id),
    blockingCheckIds: postPr369ReadinessRecheck.requiredReadinessChecks
      .filter((check) => check.status === "blocking-external-action")
      .map((check) => check.id),
    safeLiveYouTubeOAuthSmokeExecuted: false,
    ownerVerificationSmokeExecuted: false,
    liveChatPollingSmokeExecuted: false,
    googleApiLiveCallExecuted: false,
    commandExecuteAllowed: false,
    nextAction: "collect-concrete-target-metadata-env-fixture-owner-authorization-and-server-only-runtime-before-execute-in-separate-live-smoke-pr"
  },
  "post-PR369 readiness recheck remains blocker-only without all sanitized preconditions"
);
assert.match(
  runtime.createYouTubeRuntimeSafeLiveSmokePostPr369ReadinessRecheckSummary(),
  /post-pr369-safe-live-youtube-smoke-readiness-recheck.*blocked-missing-env-fixture-or-target-references/i,
  "post-PR369 readiness recheck summary records the blocker"
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
  /PR #366 `MERGED`[\s\S]*2026-06-08T01:51:22Z[\s\S]*Cloudflare Pages FAILURE[\s\S]*Workers Builds SUCCESS/i,
  "task.md records fresh PR #366 metadata and check disposition"
);
assert.match(
  taskSource,
  /post-PR #366 actual safe live YouTube OAuth \/ owner verification \/ Live Chat polling smoke execution gate/i,
  "task.md records the post-PR366 execution gate"
);
assert.match(
  taskSource,
  /post-PR #366[\s\S]*preflight が blocked のため `--execute` は実行していない/i,
  "task.md records that --execute was not run for post-PR366"
);
assert.match(
  taskSource,
  /PR #367 `MERGED`[\s\S]*2026-06-08T02:17:46Z[\s\S]*Cloudflare Pages FAILURE[\s\S]*Workers Builds SUCCESS/i,
  "task.md records fresh PR #367 metadata and check disposition"
);
assert.match(
  taskSource,
  /post-PR #367 actual safe live YouTube OAuth \/ owner verification \/ Live Chat polling smoke readiness recheck/i,
  "task.md records the post-PR367 readiness recheck"
);
assert.match(
  taskSource,
  /post-PR #367[\s\S]*preflight が blocked のため `--execute` は実行していない/i,
  "task.md records that --execute was not run for post-PR367"
);
assert.match(
  taskSource,
  /PR #368 `MERGED`[\s\S]*2026-06-08T02:43:31Z[\s\S]*Cloudflare Pages FAILURE[\s\S]*Workers Builds SUCCESS/i,
  "task.md records fresh PR #368 metadata and check disposition"
);
assert.match(
  taskSource,
  /post-PR #368 actual safe live YouTube OAuth \/ owner verification \/ Live Chat polling smoke readiness recheck/i,
  "task.md records the post-PR368 readiness recheck"
);
assert.match(
  taskSource,
  /post-PR #368[\s\S]*preflight が blocked のため `--execute` は実行していない/i,
  "task.md records that --execute was not run for post-PR368"
);
assert.match(
  taskSource,
  /PR #369 `MERGED`[\s\S]*2026-06-08T03:06:38Z[\s\S]*Cloudflare Pages FAILURE[\s\S]*Workers Builds SUCCESS/i,
  "task.md records fresh PR #369 metadata and check disposition"
);
assert.match(
  taskSource,
  /post-PR #369 actual safe live YouTube OAuth \/ owner verification \/ Live Chat polling smoke readiness recheck/i,
  "task.md records the post-PR369 readiness recheck"
);
assert.match(
  taskSource,
  /post-PR #369[\s\S]*preflight が blocked のため `--execute` は実行していない/i,
  "task.md records that --execute was not run for post-PR369"
);
assert.match(
  taskSource,
  /PR #365 `MERGED`[\s\S]*2026-06-07T16:09:29Z[\s\S]*Cloudflare Pages FAILURE[\s\S]*Workers Builds SUCCESS/i,
  "task.md records fresh PR #365 metadata and check disposition"
);
assert.match(
  taskSource,
  /post-PR #365 actual safe live YouTube OAuth \/ owner verification \/ Live Chat polling smoke preflight/i,
  "task.md records the post-PR365 preflight"
);
assert.match(
  taskSource,
  /preflight が blocked のため `--execute` は実行していない/i,
  "task.md records that --execute was not run for post-PR365"
);
assert.match(
  taskSource,
  /PR #364 `MERGED`[\s\S]*2026-06-07T11:26:31Z[\s\S]*Cloudflare Pages FAILURE[\s\S]*Workers Builds SUCCESS/i,
  "task.md records fresh PR #364 metadata and check disposition"
);
assert.match(
  taskSource,
  /post-PR #364 actual safe live YouTube OAuth \/ owner verification \/ Live Chat polling smoke target metadata preflight/i,
  "task.md records the post-PR364 target metadata preflight"
);
assert.match(
  taskSource,
  /actual safe live runtime smoke は `not-run-blocked-missing-env-fixture-or-target-references`/i,
  "task.md records the post-PR364 actual live smoke blocker"
);
assert.match(
  taskSource,
  /PR #361 `MERGED`[\s\S]*2026-06-07T06:50:57Z[\s\S]*Cloudflare Pages FAILURE[\s\S]*Workers Builds SUCCESS/i,
  "task.md records fresh PR #361 metadata and check disposition"
);
assert.match(
  taskSource,
  /PR #362 `MERGED`[\s\S]*2026-06-07T10:40:02Z[\s\S]*Cloudflare Pages FAILURE[\s\S]*Workers Builds SUCCESS/i,
  "task.md records fresh PR #362 metadata and check disposition"
);
assert.match(
  taskSource,
  /post-PR #362 actual safe live YouTube OAuth \/ owner verification \/ Live Chat polling smoke readiness\/blocker repoint/i,
  "task.md records the post-PR362 readiness/blocker repoint"
);
assert.match(
  taskSource,
  /actual safe live runtime smoke は `not-run-blocked-missing-env-fixture-or-target-references`/i,
  "task.md records the post-PR362 actual live smoke blocker"
);
assert.match(
  taskSource,
  /post-PR #361 actual safe live YouTube OAuth \/ owner verification \/ Live Chat polling smoke preflight/i,
  "task.md records the post-PR361 actual safe live smoke preflight gate"
);
assert.match(
  taskSource,
  /actual safe live runtime smoke は `not-run-blocked-missing-env-fixture-or-target-references`/i,
  "task.md records the post-PR361 actual live smoke blocker"
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
