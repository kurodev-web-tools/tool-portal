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
    const committedDiff = execSync("git diff --name-only origin/codex/comment-translator-free-public-beta-integration...HEAD", {
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

const runtimePath = "lib/comment-translator-youtube-runtime-foundation.ts";
const inputBoundaryPath = "lib/comment-translator-youtube-input-boundary.ts";
const designDocPath = "docs/future/COMMENT_TRANSLATOR_YOUTUBE_INPUT_BOUNDARY_DESIGN.md";
const pr356MergeCommit = "83f1d5c4d90183b6f7bf97df8150650bc011cded";
const pr357MergeCommit = "98a702ff9741d586d75671cb0fd4536c934b8f82";
const pr586MergeCommit = "8023d28eaf644f1352da13062bd5e301a2d29f42";

assert.ok(exists(runtimePath), "server-only YouTube owner polling runtime foundation module exists");
assert.ok(exists(inputBoundaryPath), "YouTube input boundary remains available");
assert.ok(exists(designDocPath), "YouTube input boundary design memo remains available");

const runtimeSource = read(runtimePath);
const inputBoundarySource = read(inputBoundaryPath);
const providerBoundarySource = read("lib/comment-translator-provider-boundary.ts");
const deeplProviderSource = read("lib/comment-translator-deepl-provider.ts");
const componentSource = read("components/comment-translator/CommentTranslatorDock.tsx");
const routeSource = read("app/tools/comment-translator/page.tsx");
const mockLibSource = read("lib/comment-translator.ts");
const taskSource = read("task.md");

assert.match(runtimeSource, /^import "server-only";/m, "runtime foundation is server-only");

for (const exportedType of [
  "YouTubeOwnerPollingRuntimeContract",
  "YouTubeOwnerVerificationRuntimeRequest",
  "YouTubeOwnerVerificationRuntimeResult",
  "YouTubeOwnedBroadcastLookupRequest",
  "YouTubeOwnedBroadcastLookupResult",
  "YouTubeReadOnlyDockAuthorization",
  "YouTubeLiveChatPollingRuntimeState",
  "YouTubeLiveChatPollingStepRequest",
  "YouTubeLiveChatPollingStepResult",
  "YouTubeLiveChatRuntimeAdapter",
  "YouTubeSanitizedCommentBridgeResult",
  "YouTubeRuntimeSafeLiveSmokeReadinessPostPr356Check",
  "YouTubeRuntimeSafeLiveSmokeReadinessPostPr356",
  "YouTubeRuntimeSafeLiveSmokeReadinessPostPr356Assessment",
  "YouTubeRuntimeSafeLiveSmokeReadinessPostPr357Check",
  "YouTubeRuntimeSafeLiveSmokeReadinessPostPr357",
  "YouTubeRuntimeSafeLiveSmokeReadinessPostPr357Assessment"
]) {
  assert.match(runtimeSource, new RegExp(`export type ${exportedType}\\b`), `exports ${exportedType}`);
}

for (const exportedConstOrFunction of [
  "youtubeOwnerPollingRuntimeContract",
  "createInitialYouTubeLiveChatPollingState",
  "authorizeYouTubeReadOnlyDock",
  "sanitizeYouTubeLiveChatMessage",
  "advanceYouTubeLiveChatPollingState",
  "createDeterministicYouTubeOwnerPollingRuntime",
  "youtubeRuntimeSafeLiveSmokeReadinessPostPr356",
  "assessYouTubeRuntimeSafeLiveSmokeReadinessPostPr356",
  "createYouTubeRuntimeSafeLiveSmokeReadinessPostPr356Summary",
  "youtubeRuntimeSafeLiveSmokeReadinessPostPr357",
  "assessYouTubeRuntimeSafeLiveSmokeReadinessPostPr357",
  "createYouTubeRuntimeSafeLiveSmokeReadinessPostPr357Summary"
]) {
  assert.match(
    runtimeSource,
    new RegExp(`export (?:const|function) ${exportedConstOrFunction}\\b`),
    `exports ${exportedConstOrFunction}`
  );
}

assert.doesNotMatch(
  runtimeSource,
  /comment-translator-provider-boundary|comment-translator-deepl-provider/,
  "runtime foundation does not import provider modules"
);
assert.doesNotMatch(
  `${providerBoundarySource}\n${deeplProviderSource}`,
  /comment-translator-youtube-runtime-foundation|comment-translator-youtube-input-boundary/,
  "provider modules do not import YouTube runtime or input modules"
);
assert.doesNotMatch(
  `${componentSource}\n${routeSource}\n${mockLibSource}`,
  /comment-translator-youtube-runtime-foundation|comment-translator-youtube-input-boundary|liveChatMessages|youtube\.googleapis|GoogleAuth|OAuth2Client|refresh_token|access_token|localStorage|indexedDB/,
  "client UI, route shell, and fixture mock are not coupled to YouTube runtime or token storage"
);

for (const pattern of [
  /fetch\s*\(/,
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
  assert.doesNotMatch(runtimeSource, pattern, `runtime foundation avoids out-of-scope integration: ${pattern}`);
}

const runtime = loadTsModule(runtimePath);

assert.equal(
  execSync(`git merge-base --is-ancestor ${pr586MergeCommit} HEAD; if ($LASTEXITCODE -eq 0) { "yes" } else { "no" }`, {
    cwd: root,
    encoding: "utf8",
    shell: "powershell.exe"
  }).trim(),
  "yes",
  "PR #586 merge commit is included in the current free-public-beta branch"
);

assert.equal(
  runtime.youtubeOwnerPollingRuntimeContract.implementationStage,
  "server-only-runtime-foundation",
  "runtime foundation stage is explicit"
);
assert.equal(
  runtime.youtubeOwnerPollingRuntimeContract.tokenPersistence,
  "not-implemented",
  "token persistence remains out of scope"
);
assert.equal(
  runtime.youtubeOwnerPollingRuntimeContract.providerCoupling,
  "forbidden-direct-import-or-call",
  "runtime foundation is not coupled to the provider module"
);
assert.deepEqual(
  runtime.youtubeOwnerPollingRuntimeContract.sanitizedCommentBridgeAllowedFields,
  ["commentId", "publishedAt", "text", "platformLanguageHint", "authorDisplayName"],
  "sanitized bridge only exposes the provider-safe comment fields"
);
assert.deepEqual(
  runtime.youtubeOwnerPollingRuntimeContract.forbiddenRuntimeStorage,
  ["localStorage", "IndexedDB", "Supabase schema", "migration", "RLS policy", "handoff payload"],
  "runtime foundation does not open client or database storage"
);

const ownerVerified = {
  status: "owner-verified",
  ownerChannelReference: "server-channel-ref-1",
  checkedBy: "server-runtime-adapter",
  evidence: {
    ownedBroadcastLookup: "liveBroadcasts.list-mine-true",
    liveChatIdSource: "owned-broadcast-snippet-liveChatId"
  }
};
const activeBroadcast = {
  broadcastId: "broadcast-contract-1",
  liveChatId: "live-chat-contract-1",
  title: "Contract stream",
  lifecycleStatus: "live",
  privacyStatus: "public"
};
assert.deepEqual(
  runtime.authorizeYouTubeReadOnlyDock(ownerVerified, activeBroadcast),
  {
    status: "authorized",
    mode: "broadcaster-read-only",
    broadcastId: "broadcast-contract-1",
    liveChatId: "live-chat-contract-1",
    providerRequest: "forbidden",
    clientTrust: "display-only"
  },
  "owner-verified active broadcast authorizes the read-only dock without provider coupling"
);

assert.equal(
  runtime.authorizeYouTubeReadOnlyDock(
    {
      ...ownerVerified,
      status: "not-owner"
    },
    activeBroadcast
  ).status,
  "blocked",
  "non-owner decision blocks read-only dock authorization"
);
assert.equal(
  runtime.authorizeYouTubeReadOnlyDock(ownerVerified, {
    ...activeBroadcast,
    liveChatId: null
  }).status,
  "unavailable",
  "owned broadcast without live chat is unavailable"
);

const initialState = runtime.createInitialYouTubeLiveChatPollingState({
  liveChatId: "live-chat-contract-1",
  nowMs: 1_000
});
assert.deepEqual(
  initialState,
  {
    liveChatId: "live-chat-contract-1",
    nextPageToken: null,
    retryCount: 0,
    nextPollAfterMs: 1_000,
    terminal: null
  },
  "initial polling state keeps cursor server-side and starts without a token"
);

const sanitized = runtime.sanitizeYouTubeLiveChatMessage({
  id: "comment-contract-1",
  publishedAt: "2026-05-31T02:00:00.000Z",
  text: "Hello live chat",
  platformLanguageHint: "en",
  authorDisplayName: "  Contract  Viewer  ",
  authorName: "must-not-cross",
  channelId: "must-not-cross",
  oauthAccessToken: "must-not-cross",
  oauthRefreshToken: "must-not-cross",
  nextPageToken: "must-not-cross"
});
assert.deepEqual(
  Object.keys(sanitized),
  ["commentId", "publishedAt", "text", "platformLanguageHint", "authorDisplayName"],
  "sanitized comment bridge strips non-provider-safe material"
);
assert.deepEqual(
  sanitized,
  {
    commentId: "comment-contract-1",
    publishedAt: "2026-05-31T02:00:00.000Z",
    text: "Hello live chat",
    platformLanguageHint: "en",
    authorDisplayName: "Contract Viewer"
  },
  "sanitized comment bridge maps only comment id, time, text, language hint, and safe author display name"
);

const messageStep = runtime.advanceYouTubeLiveChatPollingState(initialState, {
  type: "messages",
  receivedAtMs: 1_250,
  nextPageToken: "page-token-2",
  pollingIntervalMillis: 5_000,
  comments: [sanitized]
});
assert.equal(messageStep.state.nextPageToken, "page-token-2", "polling step carries nextPageToken as server state");
assert.equal(messageStep.state.nextPollAfterMs, 6_250, "polling step honors pollingIntervalMillis");
assert.equal(messageStep.state.retryCount, 0, "successful message step resets retry count");
assert.deepEqual(messageStep.comments, [sanitized], "polling step forwards sanitized comments only");

const rateLimitedStep = runtime.advanceYouTubeLiveChatPollingState(messageStep.state, {
  type: "recoverable-error",
  code: "rateLimitExceeded",
  receivedAtMs: 6_500,
  pollingIntervalMillis: 5_000,
  retryAfterMs: null
});
assert.equal(rateLimitedStep.state.nextPageToken, "page-token-2", "recoverable errors keep the current server cursor");
assert.equal(rateLimitedStep.state.retryCount, 1, "recoverable errors increment retry count");
assert.equal(rateLimitedStep.state.nextPollAfterMs, 11_500, "rateLimitExceeded honors polling interval backoff");
assert.deepEqual(rateLimitedStep.comments, [], "recoverable errors do not emit comments");

const terminalStep = runtime.advanceYouTubeLiveChatPollingState(rateLimitedStep.state, {
  type: "terminal",
  code: "liveChatEnded",
  receivedAtMs: 12_000
});
assert.deepEqual(
  terminalStep.state.terminal,
  {
    code: "liveChatEnded",
    stoppedAtMs: 12_000
  },
  "terminal state stops polling with an explicit reason"
);

const fakeRuntime = runtime.createDeterministicYouTubeOwnerPollingRuntime({
  ownerVerification: ownerVerified,
  broadcasts: [activeBroadcast],
  pollSteps: [
    {
      type: "messages",
      receivedAtMs: 20_000,
      nextPageToken: "page-token-fake-1",
      pollingIntervalMillis: 4_000,
      comments: [
        {
          id: "fake-comment-1",
          publishedAt: "2026-05-31T02:01:00.000Z",
          text: "Fake runtime comment",
          platformLanguageHint: null
        }
      ]
    }
  ]
});
assert.deepEqual(await fakeRuntime.verifyOwner({ credentialReferenceId: "server-ref" }), ownerVerified, "fake runtime verifies owner deterministically");
assert.equal(
  (await fakeRuntime.lookupOwnedBroadcasts({ ownerChannelReference: "server-channel-ref-1" })).broadcasts[0].liveChatId,
  "live-chat-contract-1",
  "fake runtime returns owned broadcasts deterministically"
);
const fakePoll = await fakeRuntime.pollLiveChatOnce(initialState);
assert.deepEqual(
  fakePoll.comments,
  [
    {
      commentId: "fake-comment-1",
      publishedAt: "2026-05-31T02:01:00.000Z",
      text: "Fake runtime comment",
      platformLanguageHint: null,
      authorDisplayName: null
    }
  ],
  "fake runtime emits sanitized comments"
);

const runtimeSmokeReadiness = runtime.youtubeRuntimeSafeLiveSmokeReadinessPostPr356;
assert.deepEqual(
  runtimeSmokeReadiness.prerequisiteCredentialStatusWidthReview,
  {
    pullRequest: "#356",
    mergeCommit: pr356MergeCommit,
    status: "credential-status-display-width-review-merged-no-ui-followup"
  },
  "post-PR356 runtime smoke readiness records the credential status width review merge premise"
);
assert.equal(
  runtimeSmokeReadiness.implementationStage,
  "post-pr356-youtube-runtime-safe-live-smoke-readiness",
  "post-PR356 runtime smoke readiness stage is explicit"
);
assert.equal(
  runtimeSmokeReadiness.mergeGate,
  "fresh-pr356-merge-state-confirmed",
  "post-PR356 runtime smoke readiness records fresh merge-state confirmation"
);
assert.equal(
  runtimeSmokeReadiness.actualSafeLiveRuntimeSmoke,
  "not-run-blocked-pending-fresh-operator-confirmation-target-metadata-env-and-no-secret-boundary",
  "safe live runtime smoke is not run when this thread lacks final operator confirmation, target metadata, env references, or no-secret execution boundary"
);
assert.deepEqual(
  runtimeSmokeReadiness.requiredEnvReferences,
  [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED"
  ],
  "runtime smoke readiness records env reference names only"
);
assert.deepEqual(
  runtimeSmokeReadiness.requiredFixtureReferences,
  [
    "YOUTUBE_OAUTH_SMOKE_CREDENTIAL_REFERENCE_ID",
    "YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID",
    "YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID"
  ],
  "runtime smoke readiness records fixture reference names only"
);
assert.deepEqual(
  runtimeSmokeReadiness.clientReadableOutput,
  ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"],
  "runtime smoke readiness preserves client-readable output boundary"
);
assert.equal(
  runtimeSmokeReadiness.credentialResolutionDisabledBoundary,
  "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-preserved",
  "runtime smoke readiness preserves the credential resolution disabled boundary"
);
assert.equal(
  runtimeSmokeReadiness.ownerAuthorization,
  "required-before-owner-verification-status-read-or-live-chat-polling",
  "owner authorization is required before owner verification or Live Chat polling smoke"
);
assert.deepEqual(
  runtime.assessYouTubeRuntimeSafeLiveSmokeReadinessPostPr356([]),
  {
    status: "blocked-missing-youtube-runtime-safe-live-smoke-readiness-checks",
    missingCheckIds: runtimeSmokeReadiness.requiredReadinessChecks.map((check) => check.id),
    safeLiveYouTubeOAuthSmokeAllowedInThisPr: false,
    ownerVerificationSmokeAllowedInThisPr: false,
    liveChatPollingSmokeAllowedInThisPr: false,
    googleApiLiveCallAllowedInThisPr: false,
    nextAction: "record-post-pr356-youtube-runtime-safe-live-smoke-blockers-without-live-provider-call"
  },
  "runtime smoke readiness blocks when checklist evidence is absent"
);
assert.deepEqual(
  runtime.assessYouTubeRuntimeSafeLiveSmokeReadinessPostPr356(
    runtimeSmokeReadiness.requiredReadinessChecks.filter((check) => check.status === "recorded")
  ),
  {
    status: "blocked-pending-final-operator-confirmation-target-metadata-env-and-no-secret-boundary",
    completedCheckIds: runtimeSmokeReadiness.requiredReadinessChecks
      .filter((check) => check.status === "recorded")
      .map((check) => check.id),
    blockingCheckIds: runtimeSmokeReadiness.requiredReadinessChecks
      .filter((check) => check.status === "blocking-external-action")
      .map((check) => check.id),
    safeLiveYouTubeOAuthSmokeAllowedInThisPr: false,
    ownerVerificationSmokeAllowedInThisPr: false,
    liveChatPollingSmokeAllowedInThisPr: false,
    googleApiLiveCallAllowedInThisPr: false,
    nextAction: "collect-final-operator-confirmation-target-metadata-env-references-and-no-secret-boundary-in-separate-runtime-smoke-thread"
  },
  "runtime smoke readiness remains blocked until final external preconditions are present"
);
assert.match(
  runtime.createYouTubeRuntimeSafeLiveSmokeReadinessPostPr356Summary(),
  /post-pr356-youtube-runtime-safe-live-smoke-readiness.*blocked-pending-final-operator-confirmation-target-metadata-env-and-no-secret-boundary/i,
  "runtime smoke readiness summary records the blocked post-PR356 result"
);

const runtimeSmokeReadinessPostPr357 = runtime.youtubeRuntimeSafeLiveSmokeReadinessPostPr357;
assert.deepEqual(
  runtimeSmokeReadinessPostPr357.prerequisiteRuntimeSmokeReadiness,
  {
    pullRequest: "#357",
    mergeCommit: pr357MergeCommit,
    status: "post-pr356-youtube-runtime-safe-live-smoke-readiness-merged"
  },
  "post-PR357 runtime smoke readiness records the PR #357 merge premise"
);
assert.equal(
  runtimeSmokeReadinessPostPr357.implementationStage,
  "post-pr357-youtube-runtime-safe-live-smoke-execution-gate",
  "post-PR357 runtime smoke execution gate stage is explicit"
);
assert.equal(
  runtimeSmokeReadinessPostPr357.finalOperatorApproval,
  "recorded-from-source-thread-for-safe-live-youtube-oauth-owner-verification-live-chat-polling-smoke",
  "post-PR357 runtime smoke gate records the source-thread operator approval without private target values"
);
assert.equal(
  runtimeSmokeReadinessPostPr357.actualSafeLiveRuntimeSmoke,
  "not-run-blocked-pending-target-metadata-env-fixture-and-live-runtime-command-boundary",
  "post-PR357 runtime smoke is blocked when target metadata, env, fixtures, or live command boundary are missing"
);
assert.deepEqual(
  runtimeSmokeReadinessPostPr357.codexProcessReferencePresence,
  {
    requiredEnvReferences: [
      "NEXT_PUBLIC_SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED"
    ],
    requiredFixtureReferences: [
      "YOUTUBE_OAUTH_SMOKE_CREDENTIAL_REFERENCE_ID",
      "YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID",
      "YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID"
    ],
    presenceResult: "missing-by-presence-only-check",
    valuesReadOrPrinted: false
  },
  "post-PR357 runtime smoke gate records reference names and presence state only"
);
assert.deepEqual(
  runtimeSmokeReadinessPostPr357.assessedMissingPreconditions,
  [
    "concrete-non-secret-youtube-runtime-target-metadata",
    "codex-process-env-reference-presence",
    "codex-process-fixture-reference-presence",
    "dedicated-sanitized-live-runtime-smoke-command",
    "owner-authorization-execution-before-owner-verification-or-live-chat-polling"
  ],
  "post-PR357 runtime smoke gate records missing preconditions without private values"
);
assert.deepEqual(
  runtime.assessYouTubeRuntimeSafeLiveSmokeReadinessPostPr357(
    runtimeSmokeReadinessPostPr357.requiredReadinessChecks.filter((check) => check.status === "recorded")
  ),
  {
    status: "blocked-pending-target-metadata-env-fixture-and-live-runtime-command-boundary",
    completedCheckIds: runtimeSmokeReadinessPostPr357.requiredReadinessChecks
      .filter((check) => check.status === "recorded")
      .map((check) => check.id),
    blockingCheckIds: runtimeSmokeReadinessPostPr357.requiredReadinessChecks
      .filter((check) => check.status === "blocking-external-action")
      .map((check) => check.id),
    safeLiveYouTubeOAuthSmokeExecuted: false,
    ownerVerificationSmokeExecuted: false,
    liveChatPollingSmokeExecuted: false,
    googleApiLiveCallExecuted: false,
    nextAction: "collect-safe-target-metadata-env-fixture-and-dedicated-sanitized-live-runtime-command-before-actual-smoke"
  },
  "post-PR357 runtime smoke gate stays blocked until all live-smoke preconditions are present"
);
assert.match(
  runtime.createYouTubeRuntimeSafeLiveSmokeReadinessPostPr357Summary(),
  /post-pr357-youtube-runtime-safe-live-smoke-execution-gate.*blocked-pending-target-metadata-env-fixture-and-live-runtime-command-boundary/i,
  "runtime smoke readiness summary records the blocked post-PR357 result"
);

assert.match(inputBoundarySource, /YouTubeProviderSafeCommentPayload/, "input boundary still owns the provider-safe payload");
assert.match(
  taskSource,
  /Preview author display name/i,
  "task.md records the current preview author display-name slice"
);
assert.match(
  taskSource,
  /390 \/ 820 \/ 1024 \/ 1280 \/ 1366px/i,
  "task.md records the required UI width-check widths"
);

const separateImplementationFiles = new Set([
  "lib/comment-translator-youtube-token-store-runtime.ts",
  "components/comment-translator/CommentTranslatorDock.tsx",
  "app/api/comment-translator/youtube/credential-status/route.ts",
  "app/tools/comment-translator/actions.ts",
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
      assert.doesNotMatch(file, pattern, `runtime foundation does not change forbidden path: ${file}`);
    }
  }

  if (!file.endsWith("comment-translator-youtube-runtime-foundation-contract.mjs")) {
    const source = read(file);
    assert.doesNotMatch(
      source,
      /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]/i,
      `${file} does not contain token or service role material`
    );
  }
}

console.log("comment translator YouTube owner polling runtime foundation contract checks passed");
