import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const uiWiringPath = "lib/comment-translator-youtube-credential-status-ui-wiring.ts";
const statusBoundaryPath = "lib/comment-translator-youtube-credential-status-boundary.ts";
const statusActionPath = "app/tools/comment-translator/actions.ts";
const componentPath = "components/comment-translator/CommentTranslatorDock.tsx";
const pagePath = "app/tools/comment-translator/page.tsx";
const commentTranslatorPath = "lib/comment-translator.ts";
const taskPath = "task.md";
const pr321MergeCommit = "8dcbb969b25e027201a0c35770845d03a5aae813";
const pr352MergeCommit = "6bf1951082e1ba90360e00be1b573a2bee33e5b1";
const pr353MergeCommit = "4608faba38a220df8a9248d6885fe47c02bf0647";
const pr354MergeCommit = "2a1436f13ccbaf641be4dbb9dbef12356bcd309f";
const pr355MergeCommit = "33dfa8b0142a675fea261963e0c4a80129d36341";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function changedFiles() {
  const committedDiff = execSync("git diff --name-only origin/codex/comment-translator-preview...HEAD", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  })
    .split(/\r?\n/)
    .filter(Boolean);
  const uncommittedDiff = execSync("git diff --name-only", {
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

  return [...new Set([...committedDiff, ...uncommittedDiff, ...untracked])].map((file) => file.replace(/\\/g, "/"));
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

assert.ok(exists(uiWiringPath), "credential status UI wiring readiness module exists");
assert.ok(exists(statusBoundaryPath), "server-only status boundary remains available");
assert.ok(exists(statusActionPath), "credential status server action remains available");
assert.ok(exists(componentPath), "comment translator dock remains available");
assert.ok(exists(pagePath), "comment translator page remains available");

const uiWiringSource = read(uiWiringPath);
const statusBoundarySource = read(statusBoundaryPath);
const statusActionSource = read(statusActionPath);
const componentSource = read(componentPath);
const pageSource = read(pagePath);
const commentTranslatorSource = read(commentTranslatorPath);
const taskSource = read(taskPath);

assert.equal(
  execSync(`git merge-base --is-ancestor ${pr321MergeCommit} HEAD; if ($LASTEXITCODE -eq 0) { "yes" } else { "no" }`, {
    cwd: root,
    encoding: "utf8",
    shell: "powershell.exe"
  }).trim(),
  "yes",
  "PR #321 merge commit is included in the current preview-derived branch"
);
assert.equal(
  execSync(`git merge-base --is-ancestor ${pr352MergeCommit} HEAD; if ($LASTEXITCODE -eq 0) { "yes" } else { "no" }`, {
    cwd: root,
    encoding: "utf8",
    shell: "powershell.exe"
  }).trim(),
  "yes",
  "PR #352 merge commit is included in the current preview-derived branch"
);
assert.equal(
  execSync(`git merge-base --is-ancestor ${pr353MergeCommit} HEAD; if ($LASTEXITCODE -eq 0) { "yes" } else { "no" }`, {
    cwd: root,
    encoding: "utf8",
    shell: "powershell.exe"
  }).trim(),
  "yes",
  "PR #353 merge commit is included in the current preview-derived branch"
);
assert.equal(
  execSync(`git merge-base --is-ancestor ${pr354MergeCommit} HEAD; if ($LASTEXITCODE -eq 0) { "yes" } else { "no" }`, {
    cwd: root,
    encoding: "utf8",
    shell: "powershell.exe"
  }).trim(),
  "yes",
  "PR #354 merge commit is included in the current preview-derived branch"
);
assert.equal(
  execSync(`git merge-base --is-ancestor ${pr355MergeCommit} HEAD; if ($LASTEXITCODE -eq 0) { "yes" } else { "no" }`, {
    cwd: root,
    encoding: "utf8",
    shell: "powershell.exe"
  }).trim(),
  "yes",
  "PR #355 merge commit is included in the current preview-derived branch"
);

assert.doesNotMatch(uiWiringSource, /^import "server-only";/m, "UI wiring module is client-readable and does not import server-only");
assert.doesNotMatch(
  uiWiringSource,
  /comment-translator-youtube-token-store-supabase-adapter|youtube_oauth_credentials|@supabase\/supabase-js|createClient|service_role|SUPABASE_SERVICE_ROLE_KEY|access_token_ciphertext_ref|refresh_token_ciphertext_ref|encryption_key_ref|decryptCapability|decryptToken/i,
  "UI wiring module is not coupled to Supabase rows, service-role readers, ciphertext, or decrypt capability"
);
assert.doesNotMatch(
  uiWiringSource,
  /localStorage\.|indexedDB\.|youtube\.googleapis|OAuth2Client|GoogleAuth|from\s+["']googleapis["']|require\(["']googleapis["']\)|stripe|checkout|quota|billing|gtag|GA4/i,
  "UI wiring avoids client storage, live Google API calls, provider coupling, quota, billing, and analytics integration"
);
assert.doesNotMatch(
  `${uiWiringSource}\n${componentSource}\n${pageSource}\n${statusActionSource}`,
  /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|oauthAccessToken|oauthRefreshToken|authorizationCodeValue|managedSecretValue|BEGIN\s+PRIVATE\s+KEY/i,
  "UI wiring and server action do not include OAuth token values, authorization code values, managed secret values, or private keys"
);
assert.doesNotMatch(
  `${componentSource}\n${pageSource}`,
  /comment-translator-youtube-credential-status-boundary|comment-translator-youtube-token-store-supabase-adapter/i,
  "client component and page do not import server-only credential status boundaries"
);

assert.match(
  pageSource,
  /createYouTubeOAuthNewClientPayloadCredentialReferenceSource/,
  "page creates the approved new-client-payload credentialReferenceId source"
);
assert.match(
  pageSource,
  /<CommentTranslatorDock\s+youtubeCredentialReferenceSource=/,
  "page passes the client-safe credential reference source into the dock"
);
assert.match(
  componentSource,
  /import\s+\{\s*getYouTubeOAuthCredentialStatusAction\s*\}/,
  "dock imports the existing server action for sanitized credential status reads"
);
assert.match(
  componentSource,
  /createYouTubeOAuthCredentialStatusUiWiring/,
  "dock converts server action output through the sanitized UI wiring view model helper"
);
assert.match(
  componentSource,
  /youtubeCredentialReferenceSource:\s*YouTubeOAuthNewClientPayloadCredentialReferenceSource/,
  "dock accepts only the approved client-safe credential reference payload source"
);
assert.match(
  componentSource,
  /formData\.append\("credentialReferenceId",\s*credentialReferenceId\)/,
  "dock submits only the opaque credentialReferenceId to the server action"
);
assert.match(
  componentSource,
  /credentialStatusView\s*\?\./,
  "dock renders sanitized credential status metadata when the action returns"
);
assert.match(
  commentTranslatorSource,
  /credentialStatus:\s*\{/,
  "localized copy includes credential status display labels"
);

for (const exportedType of [
  "YouTubeOAuthCredentialStatusUiStateId",
  "YouTubeOAuthCredentialStatusUiWiringInput",
  "YouTubeOAuthCredentialStatusUiWiringViewModel",
  "YouTubeOAuthCredentialStatusUiWiringReadiness",
  "YouTubeOAuthCredentialStatusDisplayFollowupPostPr352Readiness",
  "YouTubeOAuthCredentialStatusDisplayHumanReviewPostPr353Readiness",
  "YouTubeOAuthCredentialStatusDisplayHumanReviewResultPostPr354Evidence",
  "YouTubeOAuthCredentialStatusDisplayWidthReviewPostPr355Evidence"
]) {
  assert.match(uiWiringSource, new RegExp(`export type ${exportedType}\\b`), `UI wiring exports ${exportedType}`);
}

for (const exportedConstOrFunction of [
  "youtubeOAuthCredentialStatusUiWiringContract",
  "createYouTubeOAuthCredentialStatusUiWiring",
  "createYouTubeOAuthCredentialStatusUiWiringReadiness",
  "assessYouTubeOAuthCredentialStatusDisplayWiringReadiness",
  "assessYouTubeOAuthCredentialStatusDisplayFollowupPostPr352Readiness",
  "assessYouTubeOAuthCredentialStatusDisplayHumanReviewPostPr353Readiness",
  "assessYouTubeOAuthCredentialStatusDisplayHumanReviewResultPostPr354Evidence",
  "assessYouTubeOAuthCredentialStatusDisplayWidthReviewPostPr355Evidence"
]) {
  assert.match(
    uiWiringSource,
    new RegExp(`export (?:const|function) ${exportedConstOrFunction}\\b`),
    `UI wiring exports ${exportedConstOrFunction}`
  );
}

const uiWiring = loadTsModule(uiWiringPath);

assert.equal(
  uiWiring.youtubeOAuthCredentialStatusUiWiringContract.clientReadableInput,
  "sanitized-credential-status-metadata-only",
  "UI wiring contract accepts sanitized metadata only"
);
assert.deepEqual(
  uiWiring.youtubeOAuthCredentialStatusUiWiringContract.uiStates,
  ["available", "reconnect-required", "unavailable", "credential-resolution-disabled"],
  "UI wiring contract exposes only non-secret status states"
);
assert.equal(
  uiWiring.youtubeOAuthCredentialStatusUiWiringContract.serverAction,
  "getYouTubeOAuthCredentialStatusAction",
  "UI wiring contract records the existing server action"
);
assert.equal(
  uiWiring.youtubeOAuthCredentialStatusUiWiringContract.credentialReferenceClientPayload,
  "new-client-payload-credentialReferenceId-source",
  "UI wiring contract records the approved credential reference client payload"
);
assert.equal(
  uiWiring.youtubeOAuthCredentialStatusUiWiringContract.displayWiringStage,
  "display-ui-wiring-implemented-after-pr321-readiness",
  "display wiring stage records this actual UI wiring PR"
);
assert.match(
  uiWiringSource,
  /approved-source-definition-only-not-surfaced/,
  "display wiring readiness distinguishes an approved source definition from a source surfaced to the page or dock"
);
assert.equal(
  uiWiring.youtubeOAuthCredentialStatusUiWiringContract.emergencyDisableEnv,
  "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED",
  "UI wiring contract preserves the emergency disable reference"
);
assert.equal(
  uiWiring.youtubeOAuthCredentialStatusUiWiringContract.postServiceRoleSmokeDisplayFollowup,
  "readiness-only-after-pr352-bounded-service-role-status-persistence-smoke-success",
  "UI wiring contract records the post-PR352 display follow-up as readiness-only"
);
assert.equal(
  uiWiring.youtubeOAuthCredentialStatusUiWiringContract.postPr353HumanReviewReadiness,
  "human-review-only-after-pr353-display-followup-readiness",
  "UI wiring contract records the post-PR353 display follow-up as human-review-only"
);
assert.equal(
  uiWiring.youtubeOAuthCredentialStatusUiWiringContract.postPr354HumanReviewResult,
  "actual-human-review-result-after-pr354-readiness-non-secret-repo-local-evidence",
  "UI wiring contract records the post-PR354 human review result as non-secret repo-local evidence"
);
assert.equal(
  uiWiring.youtubeOAuthCredentialStatusUiWiringContract.postPr355WidthLayoutReview,
  "width-layout-review-after-pr355-human-review-result-no-ui-followup-needed",
  "UI wiring contract records the post-PR355 width/layout review as no-UI-follow-up-needed evidence"
);
assert.deepEqual(
  uiWiring.youtubeOAuthCredentialStatusUiWiringContract.forbiddenClientValues,
  [
    "encrypted-row",
    "ciphertext-reference",
    "decrypt-capability",
    "service-role-key",
    "managed-secret-value",
    "oauth-access-token-value",
    "oauth-refresh-token-value",
    "authorization-code-value"
  ],
  "UI wiring contract documents forbidden client-readable values"
);

assert.deepEqual(
  uiWiring.createYouTubeOAuthCredentialStatusUiWiring({
    status: "available",
    credentialReferenceId: "ytcred_ui_contract_001",
    provider: "youtube",
    providerChannelId: "UC_ui_contract",
    scopeLabel: "youtube.readonly",
    scopeSet: ["https://www.googleapis.com/auth/youtube.readonly"],
    expiresAtIso: "2026-06-02T16:00:00.000Z",
    expiryStatus: "active",
    revoked: false,
    revokedAtIso: null,
    reconnectRequired: false
  }),
  {
    state: "available",
    provider: "youtube",
    reconnectRequired: false,
    credentialReferenceId: "ytcred_ui_contract_001",
    providerChannelId: "UC_ui_contract",
    scopeLabel: "youtube.readonly",
    expiresAtIso: "2026-06-02T16:00:00.000Z",
    reason: null,
    clientPayloadBoundary: "sanitized-credential-status-metadata-only"
  },
  "active sanitized status maps to available UI metadata"
);

assert.equal(
  uiWiring.createYouTubeOAuthCredentialStatusUiWiring({
    status: "available",
    credentialReferenceId: "ytcred_ui_contract_expired",
    provider: "youtube",
    providerChannelId: "UC_ui_contract",
    scopeLabel: "youtube.readonly",
    scopeSet: ["https://www.googleapis.com/auth/youtube.readonly"],
    expiresAtIso: "2026-06-02T12:00:00.000Z",
    expiryStatus: "expired",
    revoked: false,
    revokedAtIso: null,
    reconnectRequired: true
  }).state,
  "reconnect-required",
  "expired sanitized status maps to reconnect-required UI state"
);

assert.equal(
  uiWiring.createYouTubeOAuthCredentialStatusUiWiring({
    status: "available",
    credentialReferenceId: "ytcred_ui_contract_revoked",
    provider: "youtube",
    providerChannelId: "UC_ui_contract",
    scopeLabel: "youtube.readonly",
    scopeSet: ["https://www.googleapis.com/auth/youtube.readonly"],
    expiresAtIso: "2026-06-02T16:00:00.000Z",
    expiryStatus: "revoked",
    revoked: true,
    revokedAtIso: "2026-06-02T13:00:00.000Z",
    reconnectRequired: true
  }).state,
  "reconnect-required",
  "revoked sanitized status maps to reconnect-required UI state"
);

assert.deepEqual(
  uiWiring.createYouTubeOAuthCredentialStatusUiWiring({
    status: "unavailable",
    credentialReferenceId: "ytcred_ui_contract_001",
    provider: "youtube",
    reason: "auth-unavailable",
    reconnectRequired: true
  }),
  {
    state: "unavailable",
    provider: "youtube",
    reconnectRequired: true,
    credentialReferenceId: "ytcred_ui_contract_001",
    providerChannelId: null,
    scopeLabel: null,
    expiresAtIso: null,
    reason: "auth-unavailable",
    clientPayloadBoundary: "sanitized-credential-status-metadata-only"
  },
  "auth/env unavailable status maps to sanitized unavailable UI state"
);

assert.equal(
  uiWiring.createYouTubeOAuthCredentialStatusUiWiring({
    status: "credential-resolution-disabled",
    credentialReferenceId: "ytcred_ui_contract_001",
    provider: "youtube",
    reconnectRequired: true
  }).state,
  "credential-resolution-disabled",
  "emergency disable maps to credential-resolution-disabled UI state"
);

assert.deepEqual(
  uiWiring.createYouTubeOAuthCredentialStatusUiWiringReadiness({
    serverAction: "getYouTubeOAuthCredentialStatusAction",
    clientCredentialReferencePayload: "not-wired"
  }),
  {
    status: "blocked-pending-approved-client-reference-payload",
    serverAction: "getYouTubeOAuthCredentialStatusAction",
    clientCredentialReferencePayload: "not-wired",
    blocker: "new-client-credential-reference-payload-requires-separate-approval",
    safeFallbackStates: ["unavailable", "credential-resolution-disabled"]
  },
  "readiness stops at blocker summary when new credential reference client payload wiring is not approved"
);

assert.deepEqual(
  uiWiring.createYouTubeOAuthCredentialStatusUiWiringReadiness({
    serverAction: "getYouTubeOAuthCredentialStatusAction",
    clientCredentialReferencePayload: "existing-approved-sanitized-reference"
  }),
  {
    status: "ready-for-sanitized-status-ui",
    serverAction: "getYouTubeOAuthCredentialStatusAction",
    clientCredentialReferencePayload: "existing-approved-sanitized-reference",
    safeStates: ["available", "reconnect-required", "unavailable", "credential-resolution-disabled"]
  },
  "readiness can become ready only when an approved sanitized credential reference payload already exists"
);

assert.deepEqual(
  uiWiring.assessYouTubeOAuthCredentialStatusDisplayWiringReadiness({
    serverAction: "getYouTubeOAuthCredentialStatusAction",
    approvedClientCredentialReferenceSource: "missing-client-safe-credential-reference",
    surface: "/tools/comment-translator"
  }),
  {
    status: "blocked-pending-client-reference-source",
    surface: "/tools/comment-translator",
    serverAction: "getYouTubeOAuthCredentialStatusAction",
    approvedClientCredentialReferenceSource: "missing-client-safe-credential-reference",
    currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled",
    blocker: "approved-client-safe-credential-reference-source-required",
    nextPrConditions: [
      "define-approved-client-safe-credential-reference-source",
      "keep-client-payload-to-sanitized-credential-status-metadata-only",
      "preserve-no-localStorage-indexedDB-or-handoff-payload-change",
      "preserve-no-token-secret-ciphertext-or-decrypt-capability-output",
      "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary"
    ]
  },
  "display wiring readiness returns blocker summary when no approved client-safe credential reference source exists"
);
assert.deepEqual(
  uiWiring.assessYouTubeOAuthCredentialStatusDisplayWiringReadiness({
    serverAction: "getYouTubeOAuthCredentialStatusAction",
    approvedClientCredentialReferenceSource: "approved-source-definition-only-not-surfaced",
    surface: "/tools/comment-translator"
  }),
  {
    status: "blocked-pending-client-reference-source",
    surface: "/tools/comment-translator",
    serverAction: "getYouTubeOAuthCredentialStatusAction",
    approvedClientCredentialReferenceSource: "approved-source-definition-only-not-surfaced",
    currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled",
    blocker: "approved-client-safe-credential-reference-source-required",
    nextPrConditions: [
      "surface-existing-approved-client-safe-credential-reference-to-comment-translator",
      "keep-client-payload-to-sanitized-credential-status-metadata-only",
      "preserve-no-localStorage-indexedDB-or-handoff-payload-change",
      "preserve-no-token-secret-ciphertext-or-decrypt-capability-output",
      "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary"
    ]
  },
  "approved source definition without a surfaced reference returns blocker summary instead of wiring the dock"
);

assert.deepEqual(
  uiWiring.assessYouTubeOAuthCredentialStatusDisplayWiringReadiness({
    serverAction: "getYouTubeOAuthCredentialStatusAction",
    approvedClientCredentialReferenceSource: "existing-approved-client-safe-credential-reference",
    surface: "/tools/comment-translator"
  }),
  {
    status: "ready-for-display-wiring-pr",
    surface: "/tools/comment-translator",
    serverAction: "getYouTubeOAuthCredentialStatusAction",
    approvedClientCredentialReferenceSource: "existing-approved-client-safe-credential-reference",
    clientPayloadBoundary: "sanitized-credential-status-metadata-only",
    safeStates: ["available", "reconnect-required", "unavailable", "credential-resolution-disabled"],
    nextStep: "wire-status-display-to-existing-approved-client-safe-reference"
  },
  "display wiring can become ready only with an existing approved client-safe credential reference source"
);

assert.deepEqual(
  uiWiring.assessYouTubeOAuthCredentialStatusDisplayFollowupPostPr352Readiness({
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 352,
    prerequisiteMergeCommit: pr352MergeCommit,
    serviceRoleSmokeResult: "passed-bounded-service-role-status-persistence-smoke",
    displayWiringStage: "display-ui-wiring-implemented-after-pr321-readiness",
    clientPayloadSource: "new-client-payload-credentialReferenceId-source",
    serverAction: "getYouTubeOAuthCredentialStatusAction"
  }),
  {
    status: "ready-for-credential-status-display-human-review-after-pr352-service-role-smoke-success",
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 352,
    prerequisiteMergeCommit: pr352MergeCommit,
    serviceRoleSmokeResult: "passed-bounded-service-role-status-persistence-smoke",
    displayWiringStage: "display-ui-wiring-implemented-after-pr321-readiness",
    clientPayloadSource: "new-client-payload-credentialReferenceId-source",
    serverAction: "getYouTubeOAuthCredentialStatusAction",
    clientPayloadBoundary: "credentialReferenceId-and-sanitized-status-metadata-only",
    safeStates: ["available", "reconnect-required", "unavailable", "credential-resolution-disabled"],
    storageBoundary: "no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
    serverBoundary: "owner-authorization-and-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-preserved",
    liveProviderBoundary:
      "no-google-api-live-call-safe-live-youtube-oauth-smoke-refresh-runtime-or-full-revocation-runtime",
    nextStep: "human-review-existing-display-wiring-or-plan-separate-ux-follow-up-with-width-checks"
  },
  "PR #352 service-role smoke success unlocks readiness-only display follow-up, not new UI or live provider work"
);

assert.deepEqual(
  uiWiring.assessYouTubeOAuthCredentialStatusDisplayFollowupPostPr352Readiness({
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 352,
    prerequisiteMergeCommit: pr352MergeCommit,
    serviceRoleSmokeResult: "not-run-or-blocked",
    displayWiringStage: "display-ui-wiring-implemented-after-pr321-readiness",
    clientPayloadSource: "new-client-payload-credentialReferenceId-source",
    serverAction: "getYouTubeOAuthCredentialStatusAction"
  }),
  {
    status: "blocked-pr352-display-followup-missing-bounded-service-role-smoke-success",
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 352,
    prerequisiteMergeCommit: pr352MergeCommit,
    serviceRoleSmokeResult: "not-run-or-blocked",
    currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled",
    blocker: "bounded-service-role-status-persistence-smoke-success-required-before-display-followup-readiness",
    nextPrConditions: [
      "record-sanitized-bounded-service-role-status-persistence-smoke-success",
      "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
      "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
      "preserve-owner-authorization-before-status-read",
      "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary",
      "do-not-run-google-api-live-call-safe-live-youtube-oauth-smoke-refresh-runtime-or-full-revocation-runtime"
    ]
  },
  "display follow-up readiness stays blocked without sanitized bounded service-role smoke success"
);

assert.deepEqual(
  uiWiring.assessYouTubeOAuthCredentialStatusDisplayHumanReviewPostPr353Readiness({
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 353,
    prerequisiteMergeCommit: pr353MergeCommit,
    previousReadiness: "ready-for-credential-status-display-human-review-after-pr352-service-role-smoke-success",
    displayWiringStage: "display-ui-wiring-implemented-after-pr321-readiness",
    clientPayloadSource: "new-client-payload-credentialReferenceId-source",
    serverAction: "getYouTubeOAuthCredentialStatusAction"
  }),
  {
    status: "ready-for-human-review-only-after-pr353-display-followup-readiness",
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 353,
    prerequisiteMergeCommit: pr353MergeCommit,
    previousReadiness: "ready-for-credential-status-display-human-review-after-pr352-service-role-smoke-success",
    displayWiringStage: "display-ui-wiring-implemented-after-pr321-readiness",
    clientPayloadSource: "new-client-payload-credentialReferenceId-source",
    serverAction: "getYouTubeOAuthCredentialStatusAction",
    clientReadableValues: ["credentialReferenceId", "sanitizedCredentialStatusMetadata"],
    safeStates: ["available", "reconnect-required", "unavailable", "credential-resolution-disabled"],
    reviewScope:
      "human-review-existing-pr321-display-wiring-with-pr353-post-service-role-smoke-readiness-no-new-ui",
    storageBoundary: "no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
    serverBoundary: "owner-authorization-and-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-preserved",
    forbiddenFollowups: [
      "storage-change",
      "handoff-payload-change",
      "google-api-live-call",
      "safe-live-youtube-oauth-smoke",
      "token-refresh-runtime",
      "full-revocation-runtime",
      "remote-supabase-mutation"
    ],
    nextPrConditions: [
      "complete-human-review-of-existing-pr321-display-wiring-against-pr353-readiness",
      "record-reviewed-ui-text-layout-or-accessibility-observation-without-secrets",
      "run-width-checks-for-any-future-ui-text-layout-or-css-follow-up"
    ]
  },
  "PR #353 follow-up records human-review-only readiness without adding UI, storage, live provider work, or remote mutation"
);

assert.deepEqual(
  uiWiring.assessYouTubeOAuthCredentialStatusDisplayHumanReviewPostPr353Readiness({
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 353,
    prerequisiteMergeCommit: pr353MergeCommit,
    previousReadiness: "blocked-or-not-reviewed",
    displayWiringStage: "display-ui-wiring-implemented-after-pr321-readiness",
    clientPayloadSource: "new-client-payload-credentialReferenceId-source",
    serverAction: "getYouTubeOAuthCredentialStatusAction"
  }),
  {
    status: "blocked-pr353-human-review-missing-post-service-role-readiness",
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 353,
    prerequisiteMergeCommit: pr353MergeCommit,
    previousReadiness: "blocked-or-not-reviewed",
    currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled",
    blocker: "post-pr353-display-followup-readiness-required-before-human-review-only-slice",
    nextPrConditions: [
      "record-post-service-role-smoke-display-followup-readiness",
      "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
      "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
      "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary",
      "do-not-run-google-api-live-call-safe-live-youtube-oauth-smoke-refresh-runtime-full-revocation-runtime-or-remote-supabase-mutation"
    ]
  },
  "PR #353 human-review-only readiness remains blocked if the post-service-role display readiness is not recorded"
);

assert.deepEqual(
  uiWiring.assessYouTubeOAuthCredentialStatusDisplayHumanReviewResultPostPr354Evidence({
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 354,
    prerequisiteMergeCommit: pr354MergeCommit,
    previousReadiness: "ready-for-human-review-only-after-pr353-display-followup-readiness",
    browserReview: "completed-non-secret-repo-local-evidence",
    displayWiringStage: "display-ui-wiring-implemented-after-pr321-readiness",
    clientPayloadSource: "new-client-payload-credentialReferenceId-source",
    serverAction: "getYouTubeOAuthCredentialStatusAction",
    observedFallbackReason: "auth-unavailable"
  }),
  {
    status: "human-review-completed-after-pr354-readiness",
    surface: "/tools/comment-translator",
    browserUrl: "http://localhost:3000/tools/comment-translator/",
    pageTitle: "Kuro Live Comment Translator | Kuro Stream Kit",
    prerequisitePullRequest: 354,
    prerequisiteMergeCommit: pr354MergeCommit,
    previousReadiness: "ready-for-human-review-only-after-pr353-display-followup-readiness",
    browserReview: "completed-non-secret-repo-local-evidence",
    displayWiringStage: "display-ui-wiring-implemented-after-pr321-readiness",
    clientPayloadSource: "new-client-payload-credentialReferenceId-source",
    serverAction: "getYouTubeOAuthCredentialStatusAction",
    renderedResult: "meaningful-app-content-no-nextjs-framework-overlay",
    consoleResult: "no-warn-or-error-observed",
    interactionResult: "credential-status-refresh-clicked-once-no-runtime-error",
    observedFallbackReason: "auth-unavailable",
    fallbackBoundary: "sanitized-fallback-not-secret-bearing-failure",
    clientReadableValues: ["opaqueCredentialReferenceId", "sanitizedCredentialStatusMetadata"],
    safeStates: ["available", "reconnect-required", "unavailable", "credential-resolution-disabled"],
    forbiddenExposureScan: [
      "no-service-role-marker",
      "no-service-role-env-reference",
      "no-oauth-access-token-marker",
      "no-oauth-refresh-token-marker",
      "no-oauth-authorization-code-marker",
      "no-private-key-marker",
      "no-owner-user-id-value",
      "no-provider-channel-id-value"
    ],
    visualObservation: "credential-reference-wraps-inside-left-panel-without-obvious-overlap-or-broken-layout",
    visualFollowupBoundary: "non-blocking-unless-future-ui-text-layout-or-accessibility-pr",
    storageBoundary: "no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
    liveProviderBoundary:
      "no-google-api-live-call-safe-live-youtube-oauth-smoke-refresh-runtime-or-full-revocation-runtime",
    remoteMutationBoundary: "no-remote-supabase-mutation",
    nextPrConditions: [
      "separate-ui-text-layout-or-accessibility-follow-up-only-if-human-review-finds-a-specific-issue",
      "run-width-checks-for-any-future-ui-text-layout-or-css-follow-up",
      "keep-client-readable-values-to-opaque-credentialReferenceId-and-sanitized-status-metadata"
    ]
  },
  "PR #354 actual human review result records non-secret repo-local evidence without new UI, storage, live provider work, or remote mutation"
);

assert.deepEqual(
  uiWiring.assessYouTubeOAuthCredentialStatusDisplayHumanReviewResultPostPr354Evidence({
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 354,
    prerequisiteMergeCommit: pr354MergeCommit,
    previousReadiness: "blocked-or-not-reviewed",
    browserReview: "not-completed-or-secret-bearing",
    displayWiringStage: "display-ui-wiring-implemented-after-pr321-readiness",
    clientPayloadSource: "new-client-payload-credentialReferenceId-source",
    serverAction: "getYouTubeOAuthCredentialStatusAction",
    observedFallbackReason: "auth-unavailable"
  }),
  {
    status: "blocked-pr354-human-review-result-missing-readiness-or-safe-evidence",
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 354,
    prerequisiteMergeCommit: pr354MergeCommit,
    previousReadiness: "blocked-or-not-reviewed",
    browserReview: "not-completed-or-secret-bearing",
    currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled",
    blocker: "post-pr354-human-review-result-requires-pr353-readiness-and-non-secret-browser-evidence",
    nextPrConditions: [
      "complete-human-review-against-existing-pr321-display-wiring",
      "record-only-non-secret-repo-local-evidence",
      "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
      "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
      "do-not-run-google-api-live-call-safe-live-youtube-oauth-smoke-refresh-runtime-full-revocation-runtime-or-remote-supabase-mutation"
    ]
  },
  "PR #354 result evidence stays blocked when readiness or safe evidence is missing"
);

assert.deepEqual(
  uiWiring.assessYouTubeOAuthCredentialStatusDisplayWidthReviewPostPr355Evidence({
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 355,
    prerequisiteMergeCommit: pr355MergeCommit,
    previewMergeInclusion: "confirmed-in-codex-comment-translator-preview",
    previousHumanReview: "human-review-completed-after-pr354-readiness",
    widthReview: "completed-non-secret-repo-local-text-evidence",
    layoutResult: "credential-reference-wraps-inside-container-no-overflow-overlap-or-broken-layout",
    observedFallbackReason: "auth-unavailable"
  }),
  {
    status: "width-layout-review-completed-after-pr355-human-review-result",
    surface: "/tools/comment-translator",
    browserUrl: "http://127.0.0.1:3210/tools/comment-translator/",
    pageTitle: "Kuro Live Comment Translator | Kuro Stream Kit",
    prerequisitePullRequest: 355,
    prerequisiteMergeCommit: pr355MergeCommit,
    previewMergeInclusion: "confirmed-in-codex-comment-translator-preview",
    previousHumanReview: "human-review-completed-after-pr354-readiness",
    widthReview: "completed-non-secret-repo-local-text-evidence",
    reviewedWidthsPx: [390, 820, 1024, 1280, 1366],
    interactionResult: "credential-status-refresh-clicked-at-each-width-and-returned-enabled",
    observedFallbackReason: "auth-unavailable",
    fallbackBoundary: "sanitized-fallback-not-secret-bearing-failure",
    layoutResult: "credential-reference-wraps-inside-container-no-overflow-overlap-or-broken-layout",
    wrappingBoundary: "acceptable-only-while-contained-with-no-overlap-or-broken-layout",
    consoleResult: "no-warn-or-error-observed",
    clientReadableValues: ["opaqueCredentialReferenceId", "sanitizedCredentialStatusMetadata"],
    safeStates: ["available", "reconnect-required", "unavailable", "credential-resolution-disabled"],
    storageBoundary: "no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
    liveProviderBoundary:
      "no-google-api-live-call-safe-live-youtube-oauth-smoke-refresh-runtime-or-full-revocation-runtime",
    remoteMutationBoundary: "no-remote-supabase-mutation",
    nextPrConditions: [
      "no-ui-follow-up-needed-unless-a-specific-width-layout-or-accessibility-issue-is-found",
      "keep-client-readable-values-to-opaque-credentialReferenceId-and-sanitized-status-metadata",
      "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary"
    ]
  },
  "PR #355 width/layout review records text evidence that wrapping stays contained and no UI follow-up is needed"
);

assert.deepEqual(
  uiWiring.assessYouTubeOAuthCredentialStatusDisplayWidthReviewPostPr355Evidence({
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 355,
    prerequisiteMergeCommit: pr355MergeCommit,
    previewMergeInclusion: "not-confirmed",
    previousHumanReview: "blocked-or-not-reviewed",
    widthReview: "not-completed-or-secret-bearing",
    layoutResult: "issue-found-needs-separate-ui-follow-up",
    observedFallbackReason: "auth-unavailable"
  }),
  {
    status: "blocked-pr355-width-layout-review-missing-merge-or-safe-evidence",
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 355,
    prerequisiteMergeCommit: pr355MergeCommit,
    previewMergeInclusion: "not-confirmed",
    previousHumanReview: "blocked-or-not-reviewed",
    widthReview: "not-completed-or-secret-bearing",
    currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled",
    blocker: "post-pr355-width-layout-review-requires-merge-inclusion-pr354-human-review-result-and-non-secret-width-evidence",
    nextPrConditions: [
      "confirm-pr355-merge-commit-in-preview",
      "complete-width-checks-at-390-820-1024-1280-1366px",
      "record-only-non-secret-repo-local-text-evidence",
      "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
      "do-not-run-google-api-live-call-safe-live-youtube-oauth-smoke-refresh-runtime-full-revocation-runtime-or-remote-supabase-mutation"
    ]
  },
  "PR #355 width/layout review stays blocked without merge inclusion, prior human-review evidence, and safe text evidence"
);

assert.match(statusBoundarySource, /credential-status-metadata-only/, "server-only status boundary remains metadata-only");
assert.match(statusActionSource, /getYouTubeOAuthCredentialStatusAction/, "existing server action remains the readiness target");
assert.match(statusActionSource, /YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED/, "server action preserves emergency disable boundary");
assert.match(taskSource, /PR #321.*merge/i, "task.md records the PR #321 merge premise");
assert.match(taskSource, /8dcbb969b25e027201a0c35770845d03a5aae813/, "task.md records the PR #321 merge commit");
assert.match(taskSource, /PR #352.*6bf1951/i, "task.md records the PR #352 merge premise");
assert.match(taskSource, /PR #353.*4608faba/i, "task.md records the PR #353 merge premise");
assert.match(taskSource, /PR #354.*2a1436f/i, "task.md records the PR #354 merge premise");
assert.match(taskSource, /PR #355.*33dfa8b/i, "task.md records the PR #355 merge premise");
assert.match(
  taskSource,
  /credential status display follow-up.*readiness|display follow-up.*credential status.*readiness/i,
  "task.md records the post-PR352 credential status display follow-up readiness"
);
assert.match(
  taskSource,
  /credential status display human-review-only|human-review-only.*credential status display/i,
  "task.md records the post-PR353 credential status display human-review-only result"
);
assert.match(
  taskSource,
  /credential status display actual human-review evidence|actual human-review evidence.*credential status display/i,
  "task.md records the post-PR354 credential status display actual human-review evidence"
);
assert.match(taskSource, /auth-unavailable/i, "task.md records auth-unavailable as the sanitized fallback observed in human review");
assert.match(
  taskSource,
  /Credential reference.*wraps|credentialReference.*wrap/i,
  "task.md records the non-blocking credential reference wrapping visual observation"
);
assert.match(
  taskSource,
  /390 \/ 820 \/ 1024 \/ 1280 \/ 1366px[\s\S]*no actual UI follow-up|no actual UI follow-up[\s\S]*390 \/ 820 \/ 1024 \/ 1280 \/ 1366px/i,
  "task.md records the post-PR355 width/layout review result and no actual UI follow-up decision"
);
assert.match(taskSource, /credential status display UI wiring/i, "task.md records this display wiring implementation");
assert.match(taskSource, /390 \/ 820 \/ 1024 \/ 1280 \/ 1366px/i, "task.md records required width verification for UI changes");

const allowedChangedFiles = new Set([
  ".gitignore",
  commentTranslatorPath,
  componentPath,
  pagePath,
  "lib/comment-translator-youtube-client-safe-credential-reference-source.ts",
  uiWiringPath,
  statusBoundaryPath,
  "lib/comment-translator-youtube-runtime-foundation.ts",
  "lib/comment-translator-youtube-oauth-token-store-foundation.ts",
  "lib/comment-translator-youtube-token-store-supabase-adapter.ts",
  "scripts/comment-translator-youtube-credential-source-decision-contract.mjs",
  "scripts/comment-translator-youtube-client-safe-credential-reference-source-contract.mjs",
  "scripts/comment-translator-youtube-new-client-payload-credential-reference-source-contract.mjs",
  "scripts/comment-translator-youtube-credential-status-display-readiness-after-payload-source-contract.mjs",
  "scripts/comment-translator-youtube-credential-reference-surface-source-recheck-contract.mjs",
  "scripts/comment-translator-youtube-credential-reference-surface-approval-evidence-contract.mjs",
  "scripts/comment-translator-youtube-surfaced-credential-reference-source-gate-contract.mjs",
  "scripts/comment-translator-youtube-credential-status-ui-wiring-contract.mjs",
  "scripts/comment-translator-youtube-runtime-foundation-contract.mjs",
  "scripts/comment-translator-youtube-live-runtime-smoke-command-contract.mjs",
  "scripts/comment-translator-youtube-live-runtime-smoke-command.mjs",
  "scripts/comment-translator-youtube-token-store-approved-migration-proposal-contract.mjs",
  "scripts/comment-translator-youtube-token-store-blocker-resolution-contract.mjs",
  "scripts/comment-translator-youtube-token-store-explicit-approval-collection-contract.mjs",
  "scripts/comment-translator-youtube-token-store-schema-key-approval-contract.mjs",
  "scripts/comment-translator-youtube-token-store-separate-approved-migration-pr-contract.mjs",
  "scripts/comment-translator-youtube-token-store-separate-migration-readiness-contract.mjs",
  "scripts/comment-translator-youtube-token-store-supabase-adapter-status-contract.mjs",
  "scripts/comment-translator-youtube-token-store-service-role-smoke-readiness-contract.mjs",
  "scripts/comment-translator-youtube-token-store-service-role-smoke-command.mjs",
  "scripts/comment-translator-youtube-token-store-remote-apply-run-contract.mjs",
  "scripts/comment-translator-provider-boundary-contract.mjs",
  "scripts/comment-translator-manual-input-mvp-contract.mjs",
  "scripts/comment-translator-interactive-shell-contract.mjs",
  "scripts/comment-translator-mock-foundation-contract.mjs",
  "docs/archive/TASK_HISTORY_2026-06.md",
  "docs/future/COMMENT_TRANSLATOR_YOUTUBE_TOKEN_STORE_BLOCKER_RESOLUTION.md",
  taskPath
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `credential status UI wiring change stays in allowed files: ${file}`);

  const source = read(file);
  assert.doesNotMatch(
    source,
    /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY/i,
    `${file} does not contain OAuth token values, authorization codes, private keys, or service role key values`
  );
}

console.log("comment translator YouTube credential status UI wiring readiness contract checks passed");
