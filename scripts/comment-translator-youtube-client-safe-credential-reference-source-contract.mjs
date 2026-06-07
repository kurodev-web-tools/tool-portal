import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const referenceSourcePath = "lib/comment-translator-youtube-client-safe-credential-reference-source.ts";
const uiWiringPath = "lib/comment-translator-youtube-credential-status-ui-wiring.ts";
const componentPath = "components/comment-translator/CommentTranslatorDock.tsx";
const pagePath = "app/tools/comment-translator/page.tsx";
const statusActionPath = "app/tools/comment-translator/actions.ts";
const statusRoutePath = "app/api/comment-translator/youtube/credential-status/route.ts";
const toolHandoffPath = "lib/tool-handoff.ts";
const taskPath = "task.md";

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

assert.ok(exists(referenceSourcePath), "client-safe credential reference source readiness module exists");
assert.ok(exists(uiWiringPath), "credential status UI wiring readiness module remains available");
assert.ok(exists(statusActionPath), "credential status server action remains available");
assert.ok(exists(statusRoutePath), "credential status endpoint remains available");
assert.ok(exists(componentPath), "comment translator dock remains available");
assert.ok(exists(pagePath), "comment translator page remains available");
assert.ok(exists(toolHandoffPath), "tool handoff contract remains available");

const referenceSource = read(referenceSourcePath);
const uiWiringSource = read(uiWiringPath);
const statusActionSource = read(statusActionPath);
const statusRouteSource = read(statusRoutePath);
const componentSource = read(componentPath);
const pageSource = read(pagePath);
const toolHandoffSource = read(toolHandoffPath);
const taskSource = read(taskPath);

assert.doesNotMatch(referenceSource, /^import "server-only";/m, "reference source definition is client-readable contract code");
assert.doesNotMatch(
  referenceSource,
  /@supabase\/supabase-js|createClient|youtube_oauth_credentials|access_token_ciphertext_ref|refresh_token_ciphertext_ref|encryption_key_ref|decryptCapability|decryptToken|SUPABASE_SERVICE_ROLE_KEY|service_role/i,
  "reference source definition is not coupled to Supabase rows, service-role readers, ciphertext, or decrypt capability"
);
assert.doesNotMatch(
  `${referenceSource}\n${uiWiringSource}\n${statusActionSource}\n${statusRouteSource}`,
  /localStorage\.|indexedDB\.|sessionStorage\.|readToolHandoff|writeToolHandoff|youtube\.googleapis|OAuth2Client|GoogleAuth|from\s+["']googleapis["']|require\(["']googleapis["']\)|stripe|checkout|quota|billing|gtag|GA4/i,
  "reference source definition does not add client storage, handoff payload, live Google API, quota, billing, or analytics wiring"
);
assert.doesNotMatch(
  `${referenceSource}\n${uiWiringSource}\n${componentSource}\n${pageSource}\n${statusActionSource}\n${statusRouteSource}`,
  /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|oauthAccessToken|oauthRefreshToken|authorizationCodeValue|managedSecretValue|BEGIN\s+PRIVATE\s+KEY/i,
  "reference source boundary does not contain OAuth token values, authorization code values, managed secret values, or private keys"
);
assert.match(
  taskSource,
  /PR #321.*merge/i,
  "post-PR #321 display wiring may intentionally wire the approved reference payload and sanitized status action"
);
assert.equal(
  toolHandoffSource.includes("credentialReferenceId"),
  false,
  "existing handoff payload remains free of YouTube credential reference fields"
);

for (const exportedType of [
  "YouTubeOAuthClientSafeCredentialReferenceSourceId",
  "YouTubeOAuthClientSafeCredentialReferenceIdentifier",
  "YouTubeOAuthClientSafeCredentialReferenceSourceDefinition",
  "YouTubeOAuthClientSafeCredentialReferenceSourceReadiness",
  "YouTubeOAuthClientSafeCredentialReferenceSurfaceSource",
  "YouTubeOAuthApprovedClientSafeCredentialDisplayWiringReadiness",
  "YouTubeOAuthCredentialReferenceSurfaceSourceFinalGate"
]) {
  assert.match(referenceSource, new RegExp(`export type ${exportedType}\\b`), `reference source module exports ${exportedType}`);
}

for (const exportedConstOrFunction of [
  "youtubeOAuthClientSafeCredentialReferenceSourceContract",
  "defineYouTubeOAuthClientSafeCredentialReferenceSource",
  "assessYouTubeOAuthClientSafeCredentialReferenceSourceReadiness",
  "assessYouTubeOAuthApprovedClientSafeCredentialDisplayWiringReadiness",
  "assessYouTubeOAuthCredentialReferenceSurfaceSourceFinalGate"
]) {
  assert.match(
    referenceSource,
    new RegExp(`export (?:const|function) ${exportedConstOrFunction}\\b`),
    `reference source module exports ${exportedConstOrFunction}`
  );
}

const referenceModule = loadTsModule(referenceSourcePath);
const uiWiring = loadTsModule(uiWiringPath);

assert.equal(
  referenceModule.youtubeOAuthClientSafeCredentialReferenceSourceContract.implementationStage,
  "approved-client-safe-credential-reference-source-readiness-definition",
  "reference source contract records the readiness-definition stage"
);
assert.equal(
  referenceModule.youtubeOAuthClientSafeCredentialReferenceSourceContract.currentClientPayloadSource,
  "not-wired",
  "reference source contract does not create a new client payload source"
);
assert.equal(
  referenceModule.youtubeOAuthClientSafeCredentialReferenceSourceContract.clientIdentifierShape,
  "opaque-non-secret-credential-reference-id",
  "reference source contract limits identifiers to opaque non-secret references"
);
assert.equal(
  referenceModule.youtubeOAuthClientSafeCredentialReferenceSourceContract.allowedStatusMetadata,
  "sanitized-credential-status-metadata-only",
  "reference source contract allows sanitized status metadata only"
);
assert.deepEqual(
  referenceModule.youtubeOAuthClientSafeCredentialReferenceSourceContract.safeStates,
  ["available", "reconnect-required", "unavailable", "credential-resolution-disabled"],
  "reference source contract exposes only non-secret status states"
);
assert.deepEqual(
  referenceModule.youtubeOAuthClientSafeCredentialReferenceSourceContract.forbiddenClientValues,
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
  "reference source contract documents forbidden client-readable values"
);

assert.deepEqual(
  referenceModule.defineYouTubeOAuthClientSafeCredentialReferenceSource({
    sourceId: "existing-owned-session-credential-reference",
    approvalStatus: "approved",
    identifierShape: "opaque-non-secret-credential-reference-id",
    sourceBoundary: "existing-client-safe-source-only",
    payloadBoundary: "sanitized-credential-status-metadata-only",
    storageBoundary: "no-localStorage-indexedDB-or-handoff-payload-change",
    ownerAuthorizationBoundary: "caller-must-own-credential-before-status-read",
    emergencyDisableEnv: "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED"
  }),
  {
    sourceId: "existing-owned-session-credential-reference",
    approvalStatus: "approved",
    identifierShape: "opaque-non-secret-credential-reference-id",
    sourceBoundary: "existing-client-safe-source-only",
    payloadBoundary: "sanitized-credential-status-metadata-only",
    storageBoundary: "no-localStorage-indexedDB-or-handoff-payload-change",
    ownerAuthorizationBoundary: "caller-must-own-credential-before-status-read",
    emergencyDisableEnv: "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED",
    clientReadableValues: ["credentialReferenceId", "sanitizedCredentialStatusMetadata"],
    forbiddenClientValues: referenceModule.youtubeOAuthClientSafeCredentialReferenceSourceContract.forbiddenClientValues
  },
  "approved source definition returns only client-safe reference and sanitized metadata contract"
);

assert.deepEqual(
  referenceModule.assessYouTubeOAuthClientSafeCredentialReferenceSourceReadiness({
    approvedSource: null,
    requestedClientPayloadChange: "none"
  }),
  {
    status: "blocked-pending-approved-client-safe-reference-source",
    approvedSource: null,
    currentClientPayloadSource: "not-wired",
    currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled",
    blocker: "approved-client-safe-credential-reference-source-required-before-display-wiring",
    nextPrConditions: [
      "identify-existing-client-safe-reference-source-or-get-explicit-approval-for-new-source",
      "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
      "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
      "preserve-no-token-secret-ciphertext-or-decrypt-capability-output",
      "preserve-owner-authorization-before-status-read",
      "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary"
    ]
  },
  "missing approved source returns blocker summary instead of new client payload wiring"
);

const approvedSource = referenceModule.defineYouTubeOAuthClientSafeCredentialReferenceSource({
  sourceId: "existing-owned-session-credential-reference",
  approvalStatus: "approved",
  identifierShape: "opaque-non-secret-credential-reference-id",
  sourceBoundary: "existing-client-safe-source-only",
  payloadBoundary: "sanitized-credential-status-metadata-only",
  storageBoundary: "no-localStorage-indexedDB-or-handoff-payload-change",
  ownerAuthorizationBoundary: "caller-must-own-credential-before-status-read",
  emergencyDisableEnv: "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED"
});

assert.deepEqual(
  referenceModule.assessYouTubeOAuthClientSafeCredentialReferenceSourceReadiness({
    approvedSource,
    requestedClientPayloadChange: "none"
  }),
  {
    status: "ready-for-display-wiring-contract-only",
    approvedSource,
    currentClientPayloadSource: "existing-approved-client-safe-source",
    clientPayloadBoundary: "sanitized-credential-status-metadata-only",
    nextStep: "wire-status-display-in-separate-pr-without-storage-or-handoff-changes"
  },
  "approved existing source can become ready without adding storage or handoff payload changes"
);

assert.equal(
  referenceModule.assessYouTubeOAuthClientSafeCredentialReferenceSourceReadiness({
    approvedSource,
    requestedClientPayloadChange: "new-client-payload"
  }).status,
  "blocked-pending-approved-client-safe-reference-source",
  "new client payload requests remain blocked even when a source shape is documented"
);
assert.deepEqual(
  referenceModule.assessYouTubeOAuthApprovedClientSafeCredentialDisplayWiringReadiness({
    approvedSource,
    surfaceClientReferenceSource: "definition-only-not-surfaced",
    requestedClientPayloadChange: "none"
  }),
  {
    status: "blocked-approved-source-not-available-to-surface",
    approvedSource,
    surfaceClientReferenceSource: "definition-only-not-surfaced",
    currentClientPayloadSource: "not-wired",
    currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled",
    blocker: "approved-source-definition-is-not-surfaced-to-comment-translator",
    nextPrConditions: [
      "surface-existing-approved-client-safe-credential-reference-to-comment-translator",
      "do-not-add-new-client-payload-without-explicit-source-approval",
      "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
      "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
      "preserve-no-token-secret-ciphertext-or-decrypt-capability-output",
      "preserve-owner-authorization-before-status-read",
      "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary"
    ]
  },
  "approved source definition alone does not permit display wiring when it is not surfaced to the page or dock"
);
assert.equal(
  referenceModule.assessYouTubeOAuthApprovedClientSafeCredentialDisplayWiringReadiness({
    approvedSource,
    surfaceClientReferenceSource: "new-client-payload-required",
    requestedClientPayloadChange: "new-client-payload"
  }).status,
  "blocked-approved-source-not-available-to-surface",
  "display wiring stays blocked when it would require a new client payload source"
);
assert.deepEqual(
  referenceModule.assessYouTubeOAuthApprovedClientSafeCredentialDisplayWiringReadiness({
    approvedSource,
    surfaceClientReferenceSource: "existing-page-or-dock-client-safe-credential-reference",
    requestedClientPayloadChange: "none"
  }),
  {
    status: "ready-for-display-wiring-to-approved-source",
    approvedSource,
    surfaceClientReferenceSource: "existing-page-or-dock-client-safe-credential-reference",
    currentClientPayloadSource: "existing-approved-client-safe-source",
    clientPayloadBoundary: "sanitized-credential-status-metadata-only",
    nextStep: "wire-status-display-to-approved-source-without-storage-or-handoff-changes"
  },
  "display wiring becomes ready only when an approved client-safe source is already surfaced to the page or dock"
);
assert.equal(
  uiWiring.assessYouTubeOAuthCredentialStatusDisplayWiringReadiness({
    serverAction: "getYouTubeOAuthCredentialStatusAction",
    approvedClientCredentialReferenceSource: "missing-client-safe-credential-reference",
    surface: "/tools/comment-translator"
  }).status,
  "blocked-pending-client-reference-source",
  "display wiring readiness remains blocked while the actual approved source is absent"
);

assert.match(taskSource, /PR #295.*merge/i, "task.md records the PR #295 merge premise");
assert.match(taskSource, /approved client-safe credential reference source/i, "task.md records this source definition follow-up");
assert.match(
  taskSource,
  /幅別確認は不要|390 \/ 820 \/ 1024 \/ 1280 \/ 1366px/i,
  "task.md records width-check status for the current UI scope"
);

const allowedChangedFiles = new Set([
  ".gitignore",
  componentPath,
  pagePath,
  "lib/comment-translator.ts",
  referenceSourcePath,
  uiWiringPath,
  "lib/comment-translator-youtube-oauth-token-store-foundation.ts",
  "lib/comment-translator-youtube-token-store-supabase-adapter.ts",
  "scripts/comment-translator-youtube-client-safe-credential-reference-source-contract.mjs",
  "scripts/comment-translator-youtube-new-client-payload-credential-reference-source-contract.mjs",
  "scripts/comment-translator-youtube-credential-status-display-readiness-after-payload-source-contract.mjs",
  "scripts/comment-translator-youtube-credential-source-decision-contract.mjs",
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
  "scripts/comment-translator-youtube-token-store-service-role-smoke-readiness-contract.mjs",
  "scripts/comment-translator-youtube-token-store-service-role-smoke-command.mjs",
  "scripts/comment-translator-youtube-token-store-remote-apply-run-contract.mjs",
  "scripts/comment-translator-provider-boundary-contract.mjs",
  "scripts/comment-translator-manual-input-mvp-contract.mjs",
  "scripts/comment-translator-interactive-shell-contract.mjs",
  "scripts/comment-translator-mock-foundation-contract.mjs",
  "docs/archive/TASK_HISTORY_2026-06.md",
  "docs/future/COMMENT_TRANSLATOR_YOUTUBE_TOKEN_STORE_BLOCKER_RESOLUTION.md",
  "lib/comment-translator-youtube-runtime-foundation.ts",
  "scripts/comment-translator-youtube-runtime-foundation-contract.mjs",
  "scripts/comment-translator-youtube-live-runtime-smoke-command-contract.mjs",
  "scripts/comment-translator-youtube-live-runtime-smoke-command.mjs",

  taskPath
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `client-safe credential reference source change stays in allowed files: ${file}`);

  const source = read(file);
  assert.doesNotMatch(
    source,
    /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY/i,
    `${file} does not contain OAuth token values, authorization codes, private keys, or service role key values`
  );
}

console.log("comment translator YouTube client-safe credential reference source readiness contract checks passed");
