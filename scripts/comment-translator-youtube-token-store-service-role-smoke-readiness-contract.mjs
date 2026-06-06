import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const foundationPath = "lib/comment-translator-youtube-oauth-token-store-foundation.ts";
const adapterPath = "lib/comment-translator-youtube-token-store-supabase-adapter.ts";
const statusBoundaryPath = "lib/comment-translator-youtube-credential-status-boundary.ts";
const blockerMemoPath = "docs/future/COMMENT_TRANSLATOR_YOUTUBE_TOKEN_STORE_BLOCKER_RESOLUTION.md";
const commandSmokePath = "scripts/comment-translator-youtube-token-store-service-role-smoke-command.mjs";
const taskPath = "task.md";

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

const foundationSource = read(foundationPath);
const adapterSource = read(adapterPath);
const statusBoundarySource = read(statusBoundaryPath);
const blockerMemo = read(blockerMemoPath);
const taskSource = read(taskPath);
const commandSmokeSource = read(commandSmokePath);

assert.match(foundationSource, /^import "server-only";/m, "service-role smoke readiness boundary stays server-only");

for (const exportedType of [
  "YouTubeEncryptedTokenStoreServiceRoleSmokeReadiness",
  "YouTubeEncryptedTokenStoreServiceRoleSmokeReadinessCheck",
  "YouTubeEncryptedTokenStoreServiceRoleSmokeReadinessResult",
  "YouTubeEncryptedTokenStoreRemoteApplyExecutionHandoff",
  "YouTubeEncryptedTokenStoreRemoteApplyExecutionHandoffCheck",
  "YouTubeEncryptedTokenStoreRemoteApplyExecutionHandoffResult",
  "YouTubeEncryptedTokenStorePostRemoteApplyServiceRoleSmokeGateInput",
  "YouTubeEncryptedTokenStorePostRemoteApplyServiceRoleSmokeGateContract",
  "YouTubeEncryptedTokenStorePostRemoteApplyServiceRoleSmokeGateAssessment",
  "YouTubeEncryptedTokenStoreBoundedServiceRoleSmokeExecutionGateInput",
  "YouTubeEncryptedTokenStoreBoundedServiceRoleSmokeExecutionGateContract",
  "YouTubeEncryptedTokenStoreBoundedServiceRoleSmokeExecutionGateAssessment",
  "YouTubeEncryptedTokenStoreBoundedServiceRoleSmokeExecutionRetryGateContract",
  "YouTubeEncryptedTokenStorePostPr346LiveServiceRoleSmokeExecutionGateContract",
  "YouTubeEncryptedTokenStorePostPr347OperatorLocalServiceRoleSmokeCommandGateContract",
  "YouTubeEncryptedTokenStorePostPr348OperatorLocalServiceRoleSmokeRerunGateContract",
  "YouTubeEncryptedTokenStorePostPr349OperatorLocalServiceRoleSmokeRerunGateContract"
]) {
  assert.match(foundationSource, new RegExp(`export type ${exportedType}\\b`), `foundation exports ${exportedType}`);
}

for (const exportedConstOrFunction of [
  "youtubeEncryptedTokenStoreServiceRoleSmokeReadiness",
  "assessYouTubeEncryptedTokenStoreServiceRoleSmokeReadiness",
  "createYouTubeEncryptedTokenStoreServiceRoleSmokeReadinessSummary",
  "youtubeEncryptedTokenStoreRemoteApplyExecutionHandoff",
  "assessYouTubeEncryptedTokenStoreRemoteApplyExecutionHandoff",
  "createYouTubeEncryptedTokenStoreRemoteApplyExecutionHandoffSummary",
  "youtubeEncryptedTokenStorePostRemoteApplyServiceRoleSmokeGate",
  "assessYouTubeEncryptedTokenStorePostRemoteApplyServiceRoleSmokeGate",
  "createYouTubeEncryptedTokenStorePostRemoteApplyServiceRoleSmokeGateSummary",
  "youtubeEncryptedTokenStoreBoundedServiceRoleSmokeExecutionGate",
  "youtubeEncryptedTokenStoreBoundedServiceRoleSmokeExecutionRetryGate",
  "youtubeEncryptedTokenStorePostPr346LiveServiceRoleSmokeExecutionGate",
  "youtubeEncryptedTokenStorePostPr347OperatorLocalServiceRoleSmokeCommandGate",
  "youtubeEncryptedTokenStorePostPr348OperatorLocalServiceRoleSmokeRerunGate",
  "youtubeEncryptedTokenStorePostPr349OperatorLocalServiceRoleSmokeRerunGate",
  "assessYouTubeEncryptedTokenStoreBoundedServiceRoleSmokeExecutionGate",
  "createYouTubeEncryptedTokenStoreBoundedServiceRoleSmokeExecutionGateSummary",
  "createYouTubeEncryptedTokenStoreBoundedServiceRoleSmokeExecutionRetryGateSummary",
  "createYouTubeEncryptedTokenStorePostPr346LiveServiceRoleSmokeExecutionGateSummary",
  "createYouTubeEncryptedTokenStorePostPr347OperatorLocalServiceRoleSmokeCommandGateSummary",
  "createYouTubeEncryptedTokenStorePostPr348OperatorLocalServiceRoleSmokeRerunGateSummary",
  "createYouTubeEncryptedTokenStorePostPr349OperatorLocalServiceRoleSmokeRerunGateSummary"
]) {
  assert.match(
    foundationSource,
    new RegExp(`export (?:const|function) ${exportedConstOrFunction}\\b`),
    `foundation exports ${exportedConstOrFunction}`
  );
}

assert.doesNotMatch(
  `${foundationSource}\n${adapterSource}\n${statusBoundarySource}`,
  /\baccessToken(Plaintext|Secret)\b|\brefreshToken(Plaintext|Secret)\b|\bauthorizationCode(Value|Plaintext|Secret)\b|oauthAccessToken|oauthRefreshToken|authorization_code|refresh_token\s*[:=]|access_token\s*[:=]|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY/i,
  "service-role smoke readiness never accepts, returns, documents, or assigns secret/token values"
);
assert.doesNotMatch(
  `${foundationSource}\n${adapterSource}\n${statusBoundarySource}`,
  /localStorage\.|indexedDB\.|sessionStorage\.|youtube\.googleapis|OAuth2Client|GoogleAuth|from\s+["']googleapis["']|require\(["']googleapis["']\)|stripe|checkout|gtag|GA4|cookie consent/i,
  "service-role smoke readiness avoids browser storage, Google API calls, quota, billing, and analytics"
);
assert.match(
  commandSmokeSource,
  /createTrustedYouTubeOAuthCredentialSupabasePersistenceRuntime/,
  "command-only smoke helper uses the existing trusted Supabase persistence runtime"
);
assert.match(
  commandSmokeSource,
  /readYouTubeOAuthCredentialStatus/,
  "command-only smoke helper uses the existing sanitized credential status boundary"
);
assert.match(
  commandSmokeSource,
  /YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED/,
  "command-only smoke helper keeps the credential resolution disabled boundary explicit"
);
assert.doesNotMatch(
  commandSmokeSource,
  /console\.(?:log|error)\([^)]*(?:process\.env|ownerUserId|providerChannelId|serviceRoleKey|NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY|accessToken|refreshToken|authorizationCode)/is,
  "command-only smoke helper does not print env values, owner ids, provider channel ids, secrets, or token material"
);
assert.doesNotMatch(
  commandSmokeSource,
  /localStorage\.|indexedDB\.|sessionStorage\.|youtube\.googleapis|OAuth2Client|GoogleAuth|from\s+["']googleapis["']|require\(["']googleapis["']\)|refresh_token\s*[:=]|access_token\s*[:=]|authorization_code\s*[:=]|BEGIN\s+PRIVATE\s+KEY/i,
  "command-only smoke helper avoids browser storage, Google API calls, and raw token material"
);

const commandCheck = spawnSync(process.execPath, [commandSmokePath, "--check-env-only", "--json"], {
  cwd: root,
  encoding: "utf8",
  env: {
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot,
    ComSpec: process.env.ComSpec
  }
});
assert.equal(commandCheck.status, 2, "command-only smoke helper exits with a blocker code when required env is absent");
const commandCheckOutput = JSON.parse(commandCheck.stdout);
assert.equal(
  commandCheckOutput.status,
  "blocked-missing-env-or-fixture-references",
  "command-only smoke helper reports a sanitized blocker when env or fixture references are missing"
);
assert.deepEqual(
  commandCheckOutput.missingEnvReferences,
  ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED"],
  "command-only smoke helper reports missing env reference names only"
);
assert.ok(
  !("ownerUserId" in commandCheckOutput) && !("providerChannelId" in commandCheckOutput),
  "command-only smoke helper omits owner and provider channel identifiers from sanitized output"
);

const placeholderCheck = spawnSync(process.execPath, [commandSmokePath, "--check-env-only", "--json"], {
  cwd: root,
  encoding: "utf8",
  env: {
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot,
    ComSpec: process.env.ComSpec,
    NEXT_PUBLIC_SUPABASE_URL: "<set locally; do not paste value>",
    ["SUPABASE_SERVICE_ROLE_KEY"]: "<set locally; do not paste value>",
    YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED: "0",
    YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID: "<safe owner user id; do not paste back>",
    YOUTUBE_OAUTH_SMOKE_CREDENTIAL_REFERENCE_ID: "smoke-post-pr347-placeholder",
    YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID: "<safe test provider channel id; do not paste back>"
  }
});
assert.equal(placeholderCheck.status, 2, "command-only smoke helper blocks literal placeholder values");
const placeholderCheckOutput = JSON.parse(placeholderCheck.stdout);
assert.equal(
  placeholderCheckOutput.status,
  "blocked-placeholder-env-or-fixture-references",
  "command-only smoke helper reports placeholder values as a sanitized blocker"
);
assert.deepEqual(
  placeholderCheckOutput.placeholderReferences,
  [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID",
    "YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID"
  ],
  "command-only smoke helper reports placeholder reference names only"
);

const foundation = loadTsModule(foundationPath);

assert.deepEqual(
  foundation.youtubeEncryptedTokenStoreServiceRoleSmokeReadiness.prerequisiteRemoteApplyReadiness,
  {
    pullRequest: "#329",
    mergeCommit: "c773a52155fafc2f1148c947745688eb89dd8d76",
    status: "not-applied-readiness-only"
  },
  "service-role smoke readiness records PR #329 as remote apply readiness only"
);
assert.equal(
  foundation.youtubeEncryptedTokenStoreServiceRoleSmokeReadiness.implementationStage,
  "safe-live-service-role-status-persistence-smoke-readiness",
  "service-role smoke readiness stage is explicit"
);
assert.equal(
  foundation.youtubeEncryptedTokenStoreServiceRoleSmokeReadiness.remoteSupabaseApply,
  "forbidden-in-this-pr",
  "service-role smoke readiness does not apply remote migrations"
);
assert.equal(
  foundation.youtubeEncryptedTokenStoreServiceRoleSmokeReadiness.actualServiceRoleSmoke,
  "not-run-readiness-only",
  "service-role smoke readiness does not run live service-role smoke"
);
assert.equal(
  foundation.youtubeEncryptedTokenStoreServiceRoleSmokeReadiness.postApplyPrerequisite,
  "blocked-pending-remote-apply",
  "service-role smoke is blocked until remote apply is confirmed"
);
assert.deepEqual(
  foundation.youtubeEncryptedTokenStoreServiceRoleSmokeReadiness.requiredEnvReferences,
  ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  "service-role smoke readiness records env reference names only"
);
assert.deepEqual(
  foundation.youtubeEncryptedTokenStoreServiceRoleSmokeReadiness.clientReadableOutput,
  ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"],
  "service-role smoke readiness preserves client-readable output boundary"
);
assert.equal(
  foundation.youtubeEncryptedTokenStoreServiceRoleSmokeReadiness.missingEnvState,
  "sanitized-unavailable-reconnect-required",
  "missing env maps to sanitized unavailable/reconnect-required state"
);
assert.equal(
  foundation.youtubeEncryptedTokenStoreServiceRoleSmokeReadiness.credentialResolutionDisabledState,
  "credential-resolution-disabled",
  "credential resolution disabled remains a sanitized state"
);
assert.equal(
  foundation.youtubeEncryptedTokenStoreServiceRoleSmokeReadiness.ownerAuthorization,
  "required-before-status-read-or-persistence-write",
  "owner authorization is required before read or write smoke"
);
assert.ok(
  foundation.youtubeEncryptedTokenStoreServiceRoleSmokeReadiness.requiredReadinessChecks.some(
    (check) => check.id === "remote-apply-confirmed-before-smoke" && check.status === "blocking-external-action"
  ),
  "service-role smoke readiness records remote apply confirmation as the external blocker"
);
assert.deepEqual(
  foundation.assessYouTubeEncryptedTokenStoreServiceRoleSmokeReadiness([]),
  {
    status: "blocked-missing-service-role-smoke-readiness-checks",
    missingCheckIds: foundation.youtubeEncryptedTokenStoreServiceRoleSmokeReadiness.requiredReadinessChecks.map(
      (check) => check.id
    ),
    remoteSupabaseApplyAllowedInThisPr: false,
    serviceRoleSmokeAllowedInThisPr: false,
    googleApiLiveSmokeAllowedInThisPr: false,
    nextAction: "record-service-role-smoke-readiness-blockers-without-remote-db-connection"
  },
  "service-role smoke readiness blocks when checklist evidence is absent"
);
assert.deepEqual(
  foundation.assessYouTubeEncryptedTokenStoreServiceRoleSmokeReadiness(
    foundation.youtubeEncryptedTokenStoreServiceRoleSmokeReadiness.requiredReadinessChecks.filter(
      (check) => check.status === "recorded"
    )
  ),
  {
    status: "blocked-pending-remote-apply",
    completedCheckIds: foundation.youtubeEncryptedTokenStoreServiceRoleSmokeReadiness.requiredReadinessChecks
      .filter((check) => check.status === "recorded")
      .map((check) => check.id),
    remoteSupabaseApplyAllowedInThisPr: false,
    serviceRoleSmokeAllowedInThisPr: false,
    googleApiLiveSmokeAllowedInThisPr: false,
    nextAction: "wait-for-remote-apply-confirmation-before-safe-live-service-role-smoke"
  },
  "complete local readiness still blocks until remote apply confirmation"
);

assert.deepEqual(
  foundation.youtubeEncryptedTokenStoreRemoteApplyExecutionHandoff.prerequisiteServiceRoleSmokeReadiness,
  {
    pullRequest: "#330",
    mergeCommit: "70ff213bd203ee979336d059253999ea2ce33565",
    status: "blocked-pending-remote-apply"
  },
  "remote apply execution handoff records PR #330 service-role smoke readiness prerequisite"
);
assert.equal(
  foundation.youtubeEncryptedTokenStoreRemoteApplyExecutionHandoff.implementationStage,
  "human-approved-remote-supabase-migration-apply-execution-handoff",
  "remote apply execution handoff stage is explicit"
);
assert.equal(
  foundation.youtubeEncryptedTokenStoreRemoteApplyExecutionHandoff.remoteSupabaseApply,
  "not-run-pending-explicit-human-target-and-run-approval",
  "remote apply execution handoff does not run remote DB migrations"
);
assert.equal(
  foundation.youtubeEncryptedTokenStoreRemoteApplyExecutionHandoff.actualServiceRoleSmoke,
  "out-of-scope-this-pr",
  "remote apply execution handoff does not mix in service-role smoke execution"
);
assert.equal(
  foundation.youtubeEncryptedTokenStoreRemoteApplyExecutionHandoff.remoteTarget,
  "required-opaque-project-target-reference",
  "remote apply execution handoff requires an operator-selected opaque target reference"
);
assert.equal(
  foundation.youtubeEncryptedTokenStoreRemoteApplyExecutionHandoff.explicitHumanRunApproval,
  "required-before-any-remote-db-mutation",
  "remote apply execution handoff requires explicit human run approval before mutation"
);
assert.deepEqual(
  foundation.youtubeEncryptedTokenStoreRemoteApplyExecutionHandoff.requiredEnvReferences,
  ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  "remote apply execution handoff records env reference names only for post-apply readiness"
);
assert.equal(
  foundation.youtubeEncryptedTokenStoreRemoteApplyExecutionHandoff.missingEnvState,
  "sanitized-unavailable-reconnect-required",
  "remote apply execution handoff maps missing env to sanitized unavailable/reconnect-required state"
);
assert.equal(
  foundation.youtubeEncryptedTokenStoreRemoteApplyExecutionHandoff.credentialResolutionDisabledState,
  "credential-resolution-disabled",
  "remote apply execution handoff preserves credential resolution disable"
);
assert.equal(
  foundation.youtubeEncryptedTokenStoreRemoteApplyExecutionHandoff.ownerAuthorization,
  "required-before-post-apply-status-read-or-persistence-write",
  "remote apply execution handoff preserves owner authorization before post-apply smoke"
);
assert.deepEqual(
  foundation.youtubeEncryptedTokenStoreRemoteApplyExecutionHandoff.clientReadableOutput,
  ["opaque-credentialReferenceId", "sanitized-credential-status-metadata"],
  "remote apply execution handoff preserves client-readable output boundary"
);
assert.ok(
  foundation.youtubeEncryptedTokenStoreRemoteApplyExecutionHandoff.requiredReadinessChecks.some(
    (check) => check.id === "explicit-human-run-approval-required" && check.status === "blocking-external-action"
  ),
  "remote apply execution handoff records explicit human run approval as the external blocker"
);
assert.ok(
  foundation.youtubeEncryptedTokenStoreRemoteApplyExecutionHandoff.rollbackAbortConditions.includes(
    "abort-if-remote-target-or-approval-is-ambiguous"
  ),
  "remote apply execution handoff records ambiguous target/approval abort condition"
);
assert.ok(
  foundation.youtubeEncryptedTokenStoreRemoteApplyExecutionHandoff.dashboardLogUnverifiedScope.includes(
    "Cloudflare Pages dashboard log"
  ),
  "remote apply execution handoff keeps dashboard logs in unchecked scope"
);
assert.deepEqual(
  foundation.assessYouTubeEncryptedTokenStoreRemoteApplyExecutionHandoff([]),
  {
    status: "blocked-missing-remote-apply-execution-handoff-checks",
    missingCheckIds: foundation.youtubeEncryptedTokenStoreRemoteApplyExecutionHandoff.requiredReadinessChecks.map(
      (check) => check.id
    ),
    remoteSupabaseApplyAllowedInThisPr: false,
    serviceRoleSmokeAllowedInThisPr: false,
    googleApiLiveSmokeAllowedInThisPr: false,
    nextAction: "record-apply-execution-handoff-blockers-without-remote-db-connection"
  },
  "remote apply execution handoff blocks when checklist evidence is absent"
);
assert.deepEqual(
  foundation.assessYouTubeEncryptedTokenStoreRemoteApplyExecutionHandoff(
    foundation.youtubeEncryptedTokenStoreRemoteApplyExecutionHandoff.requiredReadinessChecks.filter(
      (check) => check.status === "recorded"
    )
  ),
  {
    status: "blocked-pending-explicit-human-remote-apply-target-and-run-approval",
    completedCheckIds: foundation.youtubeEncryptedTokenStoreRemoteApplyExecutionHandoff.requiredReadinessChecks
      .filter((check) => check.status === "recorded")
      .map((check) => check.id),
    remoteSupabaseApplyAllowedInThisPr: false,
    serviceRoleSmokeAllowedInThisPr: false,
    googleApiLiveSmokeAllowedInThisPr: false,
    nextAction: "handoff-apply-run-checklist-without-connecting-to-remote-db"
  },
  "complete local handoff readiness still blocks until explicit human target and run approval"
);

const postRemoteApplyServiceRoleSmokeGate = foundation.youtubeEncryptedTokenStorePostRemoteApplyServiceRoleSmokeGate;

assert.deepEqual(
  postRemoteApplyServiceRoleSmokeGate.prerequisiteYouTubeOAuthCredentialsRemoteApplyRun,
  {
    pullRequest: "#342",
    mergeCommit: "9102011f3b11ffb03f7ee92314d99a5af219d20a",
    previousPreviewHead: "dff517199f099488a43d67f7e31cc775b1b913f6",
    status: "remote-applied-youtube-oauth-credentials-migration-confirmed"
  },
  "post-remote-apply service-role smoke gate records PR #342 prerequisite"
);
assert.equal(
  postRemoteApplyServiceRoleSmokeGate.implementationStage,
  "post-remote-apply-service-role-smoke-gate",
  "post-remote-apply service-role smoke gate stage is explicit"
);
assert.equal(
  postRemoteApplyServiceRoleSmokeGate.threadApproval,
  "not-recorded-for-service-role-smoke-execution",
  "post-remote-apply service-role smoke gate records missing fresh smoke approval"
);
assert.equal(
  postRemoteApplyServiceRoleSmokeGate.envReferencePresence,
  "missing-in-codex-process",
  "post-remote-apply service-role smoke gate records missing env references without values"
);
assert.equal(
  postRemoteApplyServiceRoleSmokeGate.actualServiceRoleSmoke,
  "not-run-blocked-pending-env-and-final-operator-confirmation",
  "post-remote-apply service-role smoke gate does not run live service-role smoke"
);
assert.deepEqual(
  postRemoteApplyServiceRoleSmokeGate.requiredEnvReferences,
  ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  "post-remote-apply service-role smoke gate records env reference names only"
);
assert.deepEqual(
  foundation.assessYouTubeEncryptedTokenStorePostRemoteApplyServiceRoleSmokeGate({
    remoteApplyConfirmed: true,
    supabaseUrlEnvReferencePresent: false,
    serviceRoleKeyEnvReferencePresent: false,
    finalOperatorConfirmationForServiceRoleSmoke: false,
    ownerAuthorizationConfirmed: false,
    credentialResolutionBoundaryReviewed: true,
    serviceRoleSmokeExecuted: false,
    googleApiLiveSmokeRequested: false,
    requiresSecretOrTokenValue: false
  }),
  {
    status: "blocked-pending-service-role-smoke-env-and-final-operator-confirmation",
    remoteSupabaseApplyAllowedInThisPr: false,
    serviceRoleSmokeAllowedInThisPr: false,
    serviceRoleSmokeExecuted: false,
    googleApiLiveSmokeAllowedInThisPr: false,
    nextAction: "request-env-reference-presence-and-fresh-final-operator-confirmation-before-service-role-smoke"
  },
  "post-remote-apply service-role smoke gate blocks when env references and final confirmation are missing"
);
assert.deepEqual(
  foundation.assessYouTubeEncryptedTokenStorePostRemoteApplyServiceRoleSmokeGate({
    remoteApplyConfirmed: true,
    supabaseUrlEnvReferencePresent: true,
    serviceRoleKeyEnvReferencePresent: true,
    finalOperatorConfirmationForServiceRoleSmoke: true,
    ownerAuthorizationConfirmed: true,
    credentialResolutionBoundaryReviewed: true,
    serviceRoleSmokeExecuted: false,
    googleApiLiveSmokeRequested: false,
    requiresSecretOrTokenValue: false
  }),
  {
    status: "ready-for-service-role-smoke-execution-command-only",
    remoteSupabaseApplyAllowedInThisPr: false,
    serviceRoleSmokeAllowedInThisPr: true,
    serviceRoleSmokeExecuted: false,
    googleApiLiveSmokeAllowedInThisPr: false,
    nextAction: "run-bounded-service-role-status-persistence-smoke-only-after-final-confirmation"
  },
  "post-remote-apply service-role smoke gate only allows bounded service-role smoke when every gate is present"
);

const boundedServiceRoleSmokeExecutionGate = foundation.youtubeEncryptedTokenStoreBoundedServiceRoleSmokeExecutionGate;

assert.deepEqual(
  boundedServiceRoleSmokeExecutionGate.prerequisitePostRemoteApplyServiceRoleSmokeGate,
  {
    pullRequest: "#343",
    mergeCommit: "6c81a7764194dc4997f7d40862d616fd02aed43d",
    previousPreviewHead: "9102011f3b11ffb03f7ee92314d99a5af219d20a",
    status: "post-remote-apply-service-role-smoke-gate-merged"
  },
  "bounded service-role smoke execution gate records PR #343 prerequisite"
);
assert.equal(
  boundedServiceRoleSmokeExecutionGate.threadApproval,
  "recorded-for-env-reference-presence-and-bounded-service-role-smoke-execution",
  "bounded service-role smoke execution gate records current-thread approval without secret values"
);
assert.equal(
  boundedServiceRoleSmokeExecutionGate.operatorLocalSupabaseLinkMetadata,
  "missing-in-worktree",
  "bounded service-role smoke execution gate records missing operator-local Supabase link metadata"
);
assert.equal(
  boundedServiceRoleSmokeExecutionGate.processEnvReferencePresence,
  "missing-in-codex-process",
  "bounded service-role smoke execution gate records missing process env references without values"
);
assert.equal(
  boundedServiceRoleSmokeExecutionGate.actualServiceRoleSmoke,
  "not-run-blocked-pending-linked-metadata-and-env-reference-presence",
  "bounded service-role smoke execution gate blocks actual smoke when linked metadata and env references are missing"
);
assert.deepEqual(
  foundation.assessYouTubeEncryptedTokenStoreBoundedServiceRoleSmokeExecutionGate({
    prerequisitePostRemoteApplyGateMerged: true,
    operatorLocalSupabaseLinkMetadataPresent: false,
    supabaseUrlEnvReferencePresent: false,
    serviceRoleKeyEnvReferencePresent: false,
    finalOperatorApprovalForBoundedSmoke: true,
    ownerAuthorizationConfirmed: false,
    credentialResolutionBoundaryReviewed: true,
    googleApiLiveSmokeRequested: false,
    requiresSecretOrTokenValue: false,
    serviceRoleSmokeExecuted: false
  }),
  {
    status: "blocked-pending-linked-metadata-and-env-reference-presence",
    remoteSupabaseApplyAllowedInThisPr: false,
    serviceRoleSmokeAllowedInThisPr: false,
    serviceRoleSmokeExecuted: false,
    googleApiLiveSmokeAllowedInThisPr: false,
    nextAction: "restore-operator-local-link-metadata-and-env-references-before-bounded-service-role-smoke"
  },
  "bounded service-role smoke execution gate blocks on missing link metadata and env presence"
);

for (const fragment of [
  "PR #329",
  "PR #330",
  "safe-live-service-role-status-persistence-smoke-readiness",
  "human-approved-remote-supabase-migration-apply-execution-handoff",
  "not-run-pending-explicit-human-target-and-run-approval",
  "blocked-pending-explicit-human-remote-apply-target-and-run-approval",
  "not-run-readiness-only",
  "blocked-pending-remote-apply",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED",
  "No remote Supabase migration apply",
  "No service-role smoke execution",
  "No Google API live smoke",
  "No safe live YouTube OAuth smoke"
]) {
  assert.match(blockerMemo, new RegExp(fragment, "i"), `blocker memo records readiness/handoff: ${fragment}`);
}

for (const fragment of [
  "PR #342",
  "9102011f3b11ffb03f7ee92314d99a5af219d20a",
  "post-remote-apply-service-role-smoke-gate",
  "remote-applied-youtube-oauth-credentials-migration-confirmed",
  "not-recorded-for-service-role-smoke-execution",
  "missing-in-codex-process",
  "not-run-blocked-pending-env-and-final-operator-confirmation",
  "No service-role smoke execution",
  "No Google API live smoke",
  "No safe live YouTube OAuth smoke"
]) {
  assert.match(blockerMemo, new RegExp(fragment, "i"), `blocker memo records post-remote-apply smoke gate: ${fragment}`);
}

for (const fragment of [
  "PR #343",
  "6c81a7764194dc4997f7d40862d616fd02aed43d",
  "bounded-service-role-smoke-execution-gate",
  "recorded-for-env-reference-presence-and-bounded-service-role-smoke-execution",
  "missing-in-worktree",
  "not-run-blocked-pending-linked-metadata-and-env-reference-presence",
  "Cannot find project ref",
  "No service-role smoke execution",
  "No Google API live smoke",
  "No safe live YouTube OAuth smoke"
]) {
  assert.match(blockerMemo, new RegExp(fragment, "i"), `blocker memo records bounded service-role smoke execution gate: ${fragment}`);
}

const boundedServiceRoleSmokeExecutionRetryGate =
  foundation.youtubeEncryptedTokenStoreBoundedServiceRoleSmokeExecutionRetryGate;

assert.deepEqual(
  boundedServiceRoleSmokeExecutionRetryGate.prerequisiteBoundedServiceRoleSmokeExecutionGate,
  {
    pullRequest: "#344",
    mergeCommit: "b9a708f76952174659b278ddfe0baea2c2598630",
    previousPreviewHead: "6c81a7764194dc4997f7d40862d616fd02aed43d",
    status: "bounded-service-role-smoke-execution-blocker-recorded"
  },
  "bounded service-role smoke execution retry gate records PR #344 prerequisite"
);
assert.equal(
  boundedServiceRoleSmokeExecutionRetryGate.actualServiceRoleSmoke,
  "not-run-blocked-pending-linked-metadata-and-env-reference-presence",
  "bounded service-role smoke execution retry blocks actual smoke when linked metadata and env references are missing"
);
assert.equal(
  boundedServiceRoleSmokeExecutionRetryGate.dryRunState,
  "not-run-blocked-missing-linked-project-ref",
  "bounded service-role smoke execution retry records linked dry-run blocker without remote DB mutation"
);

for (const fragment of [
  "PR #344",
  "b9a708f76952174659b278ddfe0baea2c2598630",
  "bounded-service-role-smoke-execution-retry-gate",
  "recorded-for-env-reference-presence-and-bounded-service-role-smoke-execution",
  "missing-in-worktree",
  "missing-in-codex-process",
  "not-run-blocked-pending-linked-metadata-and-env-reference-presence",
  "Cannot find project ref",
  "No service-role smoke execution",
  "No Google API live smoke",
  "No safe live YouTube OAuth smoke"
]) {
  assert.match(blockerMemo, new RegExp(fragment, "i"), `blocker memo records bounded service-role smoke execution retry gate: ${fragment}`);
}

const postPr346LiveServiceRoleSmokeExecutionGate =
  foundation.youtubeEncryptedTokenStorePostPr346LiveServiceRoleSmokeExecutionGate;

assert.deepEqual(
  postPr346LiveServiceRoleSmokeExecutionGate.prerequisitePostPr345ServiceRoleSmokeRecheck,
  {
    pullRequest: "#346",
    mergeCommit: "2e68c0c58f6766d02248b585975833a80aab1ac3",
    previousPreviewHead: "6992d3437e6dee3b27f8dc284ebfad2096332ed5",
    status: "post-pr345-service-role-smoke-recheck-merged"
  },
  "post-PR346 live service-role smoke execution gate records PR #346 prerequisite"
);
assert.equal(
  postPr346LiveServiceRoleSmokeExecutionGate.operatorLocalSupabaseLinkMetadata,
  "present-in-worktree",
  "post-PR346 live service-role smoke execution gate records present link metadata without reading values"
);
assert.equal(
  postPr346LiveServiceRoleSmokeExecutionGate.processEnvReferencePresence,
  "missing-in-codex-process",
  "post-PR346 live service-role smoke execution gate records missing Codex process env references"
);
assert.equal(
  postPr346LiveServiceRoleSmokeExecutionGate.migrationListState,
  "account-preferences-and-youtube-migrations-local-remote-present",
  "post-PR346 live service-role smoke execution gate records linked migration history"
);
assert.equal(
  postPr346LiveServiceRoleSmokeExecutionGate.dryRunState,
  "remote-database-up-to-date-no-pending-migrations",
  "post-PR346 live service-role smoke execution gate records dry-run no-pending state"
);
assert.equal(
  postPr346LiveServiceRoleSmokeExecutionGate.actualServiceRoleSmoke,
  "not-run-blocked-pending-codex-process-env-reference-presence",
  "post-PR346 live service-role smoke execution gate blocks actual smoke when Codex process env is missing"
);

for (const fragment of [
  "PR #346",
  "2e68c0c58f6766d02248b585975833a80aab1ac3",
  "post-pr346-live-service-role-smoke-execution-gate",
  "present-in-worktree",
  "missing-in-codex-process",
  "account-preferences-and-youtube-migrations-local-remote-present",
  "remote-database-up-to-date-no-pending-migrations",
  "not-run-blocked-pending-codex-process-env-reference-presence",
  "No service-role smoke execution",
  "No Google API live smoke",
  "No safe live YouTube OAuth smoke"
]) {
  assert.match(blockerMemo, new RegExp(fragment, "i"), `blocker memo records post-PR346 live service-role smoke gate: ${fragment}`);
}

const postPr347OperatorLocalServiceRoleSmokeCommandGate =
  foundation.youtubeEncryptedTokenStorePostPr347OperatorLocalServiceRoleSmokeCommandGate;

assert.deepEqual(
  postPr347OperatorLocalServiceRoleSmokeCommandGate.prerequisitePostPr346LiveServiceRoleSmokeGate,
  {
    pullRequest: "#347",
    mergeCommit: "1f5aa57527ea22b6ef6e6a67ea0e0668070e6dd1",
    previousPreviewHead: "2e68c0c58f6766d02248b585975833a80aab1ac3",
    status: "post-pr346-service-role-smoke-gate-merged"
  },
  "post-PR347 operator-local command gate records PR #347 prerequisite"
);
assert.equal(
  postPr347OperatorLocalServiceRoleSmokeCommandGate.placeholderGuard,
  "blocks-literal-placeholder-values",
  "post-PR347 command gate records placeholder guard"
);
assert.deepEqual(
  postPr347OperatorLocalServiceRoleSmokeCommandGate.commandMissingEnvReferences,
  ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  "post-PR347 command gate records missing env reference names only"
);
assert.equal(
  postPr347OperatorLocalServiceRoleSmokeCommandGate.commandCheckState,
  "blocked-missing-env-or-fixture-references",
  "post-PR347 command check records sanitized env blocker"
);
assert.equal(
  postPr347OperatorLocalServiceRoleSmokeCommandGate.commandExecuteState,
  "blocked-missing-env-or-fixture-references",
  "post-PR347 command execute records sanitized env blocker"
);
assert.equal(
  postPr347OperatorLocalServiceRoleSmokeCommandGate.actualServiceRoleSmoke,
  "not-run-blocked-pending-operator-env-reference-presence",
  "post-PR347 command gate blocks actual smoke when operator env references are missing"
);

for (const fragment of [
  "PR #347",
  "1f5aa57527ea22b6ef6e6a67ea0e0668070e6dd1",
  "post-pr347-operator-local-service-role-smoke-command-gate",
  "present-in-operator-session",
  "blocks-literal-placeholder-values",
  "blocked-missing-env-or-fixture-references",
  "not-run-blocked-pending-operator-env-reference-presence",
  "No service-role smoke execution",
  "No Google API live smoke",
  "No safe live YouTube OAuth smoke"
]) {
  assert.match(blockerMemo, new RegExp(fragment, "i"), `blocker memo records post-PR347 operator-local command gate: ${fragment}`);
}

const postPr348OperatorLocalServiceRoleSmokeRerunGate =
  foundation.youtubeEncryptedTokenStorePostPr348OperatorLocalServiceRoleSmokeRerunGate;

assert.deepEqual(
  postPr348OperatorLocalServiceRoleSmokeRerunGate.prerequisitePostPr347OperatorLocalServiceRoleSmokeCommandGate,
  {
    pullRequest: "#348",
    mergeCommit: "03bdc0c4383960cc31bc28e8d623ef3ebcd49627",
    previousPreviewHead: "1f5aa57527ea22b6ef6e6a67ea0e0668070e6dd1",
    status: "post-pr347-operator-local-service-role-smoke-command-gate-merged"
  },
  "post-PR348 rerun gate records PR #348 prerequisite"
);
assert.equal(
  postPr348OperatorLocalServiceRoleSmokeRerunGate.codexWorktreeSupabaseLinkMetadata,
  "missing-in-codex-worktree",
  "post-PR348 rerun gate records missing worktree-local Supabase link metadata"
);
assert.deepEqual(
  postPr348OperatorLocalServiceRoleSmokeRerunGate.commandMissingEnvReferences,
  ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED"],
  "post-PR348 rerun gate records missing env reference names only"
);
assert.deepEqual(
  postPr348OperatorLocalServiceRoleSmokeRerunGate.commandMissingFixtureReferences,
  [
    "YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID",
    "YOUTUBE_OAUTH_SMOKE_CREDENTIAL_REFERENCE_ID",
    "YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID"
  ],
  "post-PR348 rerun gate records missing fixture reference names only"
);
assert.equal(
  postPr348OperatorLocalServiceRoleSmokeRerunGate.migrationListState,
  "not-run-blocked-missing-linked-project-ref",
  "post-PR348 rerun gate records linked migration list blocker"
);
assert.equal(
  postPr348OperatorLocalServiceRoleSmokeRerunGate.dryRunState,
  "not-run-blocked-missing-linked-project-ref",
  "post-PR348 rerun gate records linked dry-run blocker"
);
assert.equal(
  postPr348OperatorLocalServiceRoleSmokeRerunGate.commandCheckState,
  "blocked-missing-env-or-fixture-references",
  "post-PR348 rerun command check records sanitized blocker"
);
assert.equal(
  postPr348OperatorLocalServiceRoleSmokeRerunGate.commandExecuteState,
  "blocked-missing-env-or-fixture-references",
  "post-PR348 rerun command execute records sanitized blocker"
);
assert.equal(
  postPr348OperatorLocalServiceRoleSmokeRerunGate.actualServiceRoleSmoke,
  "not-run-blocked-pending-operator-env-and-fixture-reference-presence",
  "post-PR348 rerun gate blocks actual smoke when env and fixture references are missing"
);

for (const fragment of [
  "PR #348",
  "03bdc0c4383960cc31bc28e8d623ef3ebcd49627",
  "post-pr348-operator-local-service-role-smoke-rerun-gate",
  "missing-in-codex-worktree",
  "not-run-blocked-missing-linked-project-ref",
  "blocked-missing-env-or-fixture-references",
  "not-run-blocked-pending-operator-env-and-fixture-reference-presence",
  "No service-role smoke execution",
  "No Google API live smoke",
  "No safe live YouTube OAuth smoke"
]) {
  assert.match(blockerMemo, new RegExp(fragment, "i"), `blocker memo records post-PR348 rerun gate: ${fragment}`);
}

const postPr349OperatorLocalServiceRoleSmokeRerunGate =
  foundation.youtubeEncryptedTokenStorePostPr349OperatorLocalServiceRoleSmokeRerunGate;

assert.deepEqual(
  postPr349OperatorLocalServiceRoleSmokeRerunGate.prerequisitePostPr348OperatorLocalServiceRoleSmokeRerunGate,
  {
    pullRequest: "#349",
    mergeCommit: "5f1e58c8fb4fc126b2fc8cb2457f7a5d3fcfd140",
    previousPreviewHead: "03bdc0c4383960cc31bc28e8d623ef3ebcd49627",
    status: "post-pr348-operator-local-service-role-smoke-rerun-gate-merged"
  },
  "post-PR349 rerun gate records PR #349 prerequisite"
);
assert.equal(
  postPr349OperatorLocalServiceRoleSmokeRerunGate.codexWorktreeSupabaseLinkMetadata,
  "missing-in-codex-worktree",
  "post-PR349 rerun gate records missing worktree-local Supabase link metadata"
);
assert.deepEqual(
  postPr349OperatorLocalServiceRoleSmokeRerunGate.commandMissingEnvReferences,
  ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED"],
  "post-PR349 rerun gate records missing env reference names only"
);
assert.deepEqual(
  postPr349OperatorLocalServiceRoleSmokeRerunGate.commandMissingFixtureReferences,
  [
    "YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID",
    "YOUTUBE_OAUTH_SMOKE_CREDENTIAL_REFERENCE_ID",
    "YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID"
  ],
  "post-PR349 rerun gate records missing fixture reference names only"
);
assert.equal(
  postPr349OperatorLocalServiceRoleSmokeRerunGate.migrationListState,
  "not-run-blocked-missing-linked-project-ref",
  "post-PR349 rerun gate records linked migration list blocker"
);
assert.equal(
  postPr349OperatorLocalServiceRoleSmokeRerunGate.dryRunState,
  "not-run-blocked-missing-linked-project-ref",
  "post-PR349 rerun gate records linked dry-run blocker"
);
assert.equal(
  postPr349OperatorLocalServiceRoleSmokeRerunGate.commandCheckState,
  "blocked-missing-env-or-fixture-references",
  "post-PR349 rerun command check records sanitized blocker"
);
assert.equal(
  postPr349OperatorLocalServiceRoleSmokeRerunGate.commandExecuteState,
  "blocked-missing-env-or-fixture-references",
  "post-PR349 rerun command execute records sanitized blocker"
);
assert.equal(
  postPr349OperatorLocalServiceRoleSmokeRerunGate.actualServiceRoleSmoke,
  "not-run-blocked-pending-operator-env-and-fixture-reference-presence",
  "post-PR349 rerun gate blocks actual smoke when env and fixture references are missing"
);

for (const fragment of [
  "PR #349",
  "5f1e58c8fb4fc126b2fc8cb2457f7a5d3fcfd140",
  "post-pr349-operator-local-service-role-smoke-rerun-gate",
  "missing-in-codex-worktree",
  "not-run-blocked-missing-linked-project-ref",
  "blocked-missing-env-or-fixture-references",
  "not-run-blocked-pending-operator-env-and-fixture-reference-presence",
  "No service-role smoke execution",
  "No Google API live smoke",
  "No safe live YouTube OAuth smoke"
]) {
  assert.match(blockerMemo, new RegExp(fragment, "i"), `blocker memo records post-PR349 rerun gate: ${fragment}`);
}

assert.match(taskSource, /PR #330.*70ff213/i, "task.md records PR #330 merge premise");
assert.match(
  taskSource,
  /remote apply execution handoff.*blocked-pending-explicit-human-remote-apply-target-and-run-approval/i,
  "task.md records remote apply execution handoff blocker"
);
assert.match(taskSource, /PR #329.*c773a52/i, "task.md records PR #329 merge premise");
assert.match(
  taskSource,
  /service-role status\/persistence smoke readiness.*blocked-pending-remote-apply/i,
  "task.md records service-role smoke readiness blocker"
);
assert.match(taskSource, /PR #342.*9102011f3b11ffb03f7ee92314d99a5af219d20a/i, "task.md records PR #342 merge premise");
assert.match(
  taskSource,
  /post-remote-apply-service-role-smoke-gate.*not-run-blocked-pending-env-and-final-operator-confirmation/i,
  "task.md records post-remote-apply service-role smoke gate blocker"
);
assert.match(taskSource, /PR #343.*6c81a7764194dc4997f7d40862d616fd02aed43d/i, "task.md records PR #343 merge premise");
assert.match(
  taskSource,
  /bounded-service-role-smoke-execution-gate.*not-run-blocked-pending-linked-metadata-and-env-reference-presence/i,
  "task.md records bounded service-role smoke execution blocker"
);
assert.match(taskSource, /PR #344.*b9a708f76952174659b278ddfe0baea2c2598630/i, "task.md records PR #344 merge premise");
assert.match(
  taskSource,
  /bounded-service-role-smoke-execution-retry-gate.*not-run-blocked-pending-linked-metadata-and-env-reference-presence/i,
  "task.md records bounded service-role smoke execution retry blocker"
);
assert.match(taskSource, /PR #348.*03bdc0c/i, "task.md records PR #348 merge premise");
assert.match(
  taskSource,
  /post-pr348-operator-local-service-role-smoke-rerun-gate.*not-run-blocked-pending-operator-env-and-fixture-reference-presence/i,
  "task.md records post-PR348 service-role smoke rerun blocker"
);
assert.match(taskSource, /PR #349.*5f1e58c/i, "task.md records PR #349 merge premise");
assert.match(
  taskSource,
  /post-pr349-operator-local-service-role-smoke-rerun-gate.*not-run-blocked-pending-operator-env-and-fixture-reference-presence/i,
  "task.md records post-PR349 service-role smoke rerun blocker"
);
assert.match(
  taskSource,
  /UI \/ rendered text \/ CSS は変更していない.*幅別確認は不要/s,
  "task.md records why width checks are skipped"
);

console.log("comment translator YouTube token store service-role smoke readiness contract checks passed");
