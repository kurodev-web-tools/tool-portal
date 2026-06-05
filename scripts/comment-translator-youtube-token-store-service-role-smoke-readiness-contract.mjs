import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const foundationPath = "lib/comment-translator-youtube-oauth-token-store-foundation.ts";
const adapterPath = "lib/comment-translator-youtube-token-store-supabase-adapter.ts";
const statusBoundaryPath = "lib/comment-translator-youtube-credential-status-boundary.ts";
const blockerMemoPath = "docs/future/COMMENT_TRANSLATOR_YOUTUBE_TOKEN_STORE_BLOCKER_RESOLUTION.md";
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

assert.match(foundationSource, /^import "server-only";/m, "service-role smoke readiness boundary stays server-only");

for (const exportedType of [
  "YouTubeEncryptedTokenStoreServiceRoleSmokeReadiness",
  "YouTubeEncryptedTokenStoreServiceRoleSmokeReadinessCheck",
  "YouTubeEncryptedTokenStoreServiceRoleSmokeReadinessResult"
]) {
  assert.match(foundationSource, new RegExp(`export type ${exportedType}\\b`), `foundation exports ${exportedType}`);
}

for (const exportedConstOrFunction of [
  "youtubeEncryptedTokenStoreServiceRoleSmokeReadiness",
  "assessYouTubeEncryptedTokenStoreServiceRoleSmokeReadiness",
  "createYouTubeEncryptedTokenStoreServiceRoleSmokeReadinessSummary"
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

for (const fragment of [
  "PR #329",
  "safe-live-service-role-status-persistence-smoke-readiness",
  "not-run-readiness-only",
  "blocked-pending-remote-apply",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED",
  "No remote Supabase migration apply",
  "No Google API live smoke",
  "No safe live YouTube OAuth smoke"
]) {
  assert.match(blockerMemo, new RegExp(fragment, "i"), `blocker memo records service-role smoke readiness: ${fragment}`);
}

assert.match(taskSource, /PR #329.*c773a52/i, "task.md records PR #329 merge premise");
assert.match(
  taskSource,
  /service-role status\/persistence smoke readiness.*blocked-pending-remote-apply/i,
  "task.md records service-role smoke readiness blocker"
);
assert.match(
  taskSource,
  /UI \/ rendered text \/ CSS は変更していない.*幅別確認は不要/s,
  "task.md records why width checks are skipped"
);

console.log("comment translator YouTube token store service-role smoke readiness contract checks passed");
