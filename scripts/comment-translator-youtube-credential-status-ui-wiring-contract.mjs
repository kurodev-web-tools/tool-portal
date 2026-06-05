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
  "YouTubeOAuthCredentialStatusUiWiringReadiness"
]) {
  assert.match(uiWiringSource, new RegExp(`export type ${exportedType}\\b`), `UI wiring exports ${exportedType}`);
}

for (const exportedConstOrFunction of [
  "youtubeOAuthCredentialStatusUiWiringContract",
  "createYouTubeOAuthCredentialStatusUiWiring",
  "createYouTubeOAuthCredentialStatusUiWiringReadiness",
  "assessYouTubeOAuthCredentialStatusDisplayWiringReadiness"
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

assert.match(statusBoundarySource, /credential-status-metadata-only/, "server-only status boundary remains metadata-only");
assert.match(statusActionSource, /getYouTubeOAuthCredentialStatusAction/, "existing server action remains the readiness target");
assert.match(statusActionSource, /YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED/, "server action preserves emergency disable boundary");
assert.match(taskSource, /PR #321.*merge/i, "task.md records the PR #321 merge premise");
assert.match(taskSource, /8dcbb969b25e027201a0c35770845d03a5aae813/, "task.md records the PR #321 merge commit");
assert.match(taskSource, /credential status display UI wiring/i, "task.md records this display wiring implementation");
assert.match(taskSource, /390 \/ 820 \/ 1024 \/ 1280 \/ 1366px/i, "task.md records required width verification for UI changes");

const allowedChangedFiles = new Set([
  commentTranslatorPath,
  componentPath,
  pagePath,
  "lib/comment-translator-youtube-client-safe-credential-reference-source.ts",
  uiWiringPath,
  statusBoundaryPath,
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
  "scripts/comment-translator-youtube-token-store-approved-migration-proposal-contract.mjs",
  "scripts/comment-translator-youtube-token-store-blocker-resolution-contract.mjs",
  "scripts/comment-translator-youtube-token-store-explicit-approval-collection-contract.mjs",
  "scripts/comment-translator-youtube-token-store-schema-key-approval-contract.mjs",
  "scripts/comment-translator-youtube-token-store-separate-approved-migration-pr-contract.mjs",
  "scripts/comment-translator-youtube-token-store-separate-migration-readiness-contract.mjs",
  "scripts/comment-translator-youtube-token-store-supabase-adapter-status-contract.mjs",
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
