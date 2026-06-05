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

assert.ok(exists(referenceSourcePath), "client-safe credential reference source module exists");
assert.ok(exists(uiWiringPath), "credential status UI wiring module exists");
assert.ok(exists(componentPath), "comment translator dock exists");
assert.ok(exists(pagePath), "comment translator page exists");
assert.ok(exists(statusActionPath), "credential status server action exists");
assert.ok(exists(statusRoutePath), "credential status route exists");
assert.ok(exists(toolHandoffPath), "tool handoff boundary exists");

const referenceSource = read(referenceSourcePath);
const uiWiringSource = read(uiWiringPath);
const componentSource = read(componentPath);
const pageSource = read(pagePath);
const statusActionSource = read(statusActionPath);
const statusRouteSource = read(statusRoutePath);
const toolHandoffSource = read(toolHandoffPath);
const taskSource = read(taskPath);

assert.match(
  referenceSource,
  /export type YouTubeOAuthSurfacedApprovedClientSafeCredentialReferenceSourceGate\b/,
  "reference source module exports the surfaced approved source gate type"
);
assert.match(
  referenceSource,
  /export function assessYouTubeOAuthSurfacedApprovedClientSafeCredentialReferenceSourceGate\b/,
  "reference source module exports the surfaced approved source gate helper"
);
assert.match(
  referenceSource,
  /export type YouTubeOAuthCredentialReferenceSourceSurfacingApprovalGate\b/,
  "reference source module exports the source-surfacing approval gate type"
);
assert.match(
  referenceSource,
  /export function assessYouTubeOAuthCredentialReferenceSourceSurfacingApprovalGate\b/,
  "reference source module exports the source-surfacing approval gate helper"
);

assert.match(
  taskSource,
  /PR #321.*merge/i,
  "post-PR #321 display wiring may intentionally wire credentialReferenceId and sanitized status action calls"
);
assert.equal(
  toolHandoffSource.includes("credentialReferenceId"),
  false,
  "existing handoff payload remains free of YouTube credential reference fields"
);
assert.doesNotMatch(
  `${referenceSource}\n${uiWiringSource}\n${statusActionSource}\n${statusRouteSource}`,
  /localStorage\.|indexedDB\.|sessionStorage\.|readToolHandoff|writeToolHandoff|youtube\.googleapis|OAuth2Client|GoogleAuth|from\s+["']googleapis["']|require\(["']googleapis["']\)|stripe|checkout|quota|billing|gtag|GA4/i,
  "surfaced source gate does not add storage, handoff, live Google API, quota, billing, or analytics wiring"
);
assert.doesNotMatch(
  `${referenceSource}\n${uiWiringSource}\n${componentSource}\n${pageSource}\n${statusActionSource}\n${statusRouteSource}`,
  /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|oauthAccessToken|oauthRefreshToken|authorizationCodeValue|managedSecretValue|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY/i,
  "surfaced source gate does not expose token values, authorization code values, managed secrets, private keys, or service role key values"
);

const referenceModule = loadTsModule(referenceSourcePath);

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
  referenceModule.assessYouTubeOAuthCredentialReferenceSourceSurfacingApprovalGate({
    approvedSource,
    surface: "/tools/comment-translator",
    sourceSurfacingApproval: "missing",
    pageOrDockHasSurfacedCredentialReferenceId: false,
    requestedClientPayloadChange: "none"
  }),
  {
    status: "blocked-pending-source-surfacing-approval",
    surface: "/tools/comment-translator",
    approvedSource,
    sourceSurfacingApproval: "missing",
    surfacedCredentialReferenceSource: null,
    currentClientPayloadSource: "not-wired",
    currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled",
    blocker: "source-surfacing-approval-required-before-status-display-wiring",
    nextPrConditions: [
      "obtain-explicit-approval-for-surfacing-existing-approved-client-safe-credentialReferenceId-source",
      "do-not-call-status-action-until-source-surfacing-is-approved-and-present",
      "do-not-add-new-client-payload-without-explicit-source-approval",
      "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
      "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
      "preserve-no-token-secret-ciphertext-or-decrypt-capability-output",
      "preserve-owner-authorization-before-status-read",
      "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary"
    ]
  },
  "source-surfacing approval gate blocks display wiring until an approved source is explicitly approved to surface"
);

assert.equal(
  referenceModule.assessYouTubeOAuthCredentialReferenceSourceSurfacingApprovalGate({
    approvedSource,
    surface: "/tools/comment-translator",
    sourceSurfacingApproval: "approved",
    pageOrDockHasSurfacedCredentialReferenceId: true,
    requestedClientPayloadChange: "new-client-payload"
  }).status,
  "blocked-pending-source-surfacing-approval",
  "source-surfacing approval gate blocks display wiring when surfacing would require a new client payload source"
);

assert.deepEqual(
  referenceModule.assessYouTubeOAuthCredentialReferenceSourceSurfacingApprovalGate({
    approvedSource,
    surface: "/tools/comment-translator",
    sourceSurfacingApproval: "approved",
    pageOrDockHasSurfacedCredentialReferenceId: true,
    requestedClientPayloadChange: "none"
  }),
  {
    status: "ready-for-surfaced-source-display-wiring-contract",
    surface: "/tools/comment-translator",
    approvedSource,
    sourceSurfacingApproval: "approved",
    surfacedCredentialReferenceSource: "existing-page-or-dock-client-safe-credential-reference",
    currentClientPayloadSource: "existing-approved-client-safe-source",
    clientPayloadBoundary: "sanitized-credential-status-metadata-only",
    safeStates: ["available", "reconnect-required", "unavailable", "credential-resolution-disabled"],
    nextStep: "wire-status-display-to-approved-surfaced-source-in-separate-pr"
  },
  "source-surfacing approval gate allows display wiring only after explicit surfacing approval and an existing surfaced source"
);

assert.deepEqual(
  referenceModule.assessYouTubeOAuthSurfacedApprovedClientSafeCredentialReferenceSourceGate({
    approvedSource,
    surface: "/tools/comment-translator",
    pageOrDockHasSurfacedCredentialReferenceId: false,
    requestedClientPayloadChange: "none"
  }),
  {
    status: "blocked-no-surfaced-approved-client-safe-credential-reference-source",
    surface: "/tools/comment-translator",
    approvedSource,
    surfacedCredentialReferenceSource: null,
    currentClientPayloadSource: "not-wired",
    currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled",
    blocker: "surface-approved-client-safe-credential-reference-before-status-display-wiring",
    nextPrConditions: [
      "identify-an-existing-page-or-dock-surfaced-approved-client-safe-credentialReferenceId-source",
      "do-not-call-status-action-until-that-source-exists",
      "do-not-add-new-client-payload-without-explicit-source-approval",
      "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
      "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
      "preserve-no-token-secret-ciphertext-or-decrypt-capability-output",
      "preserve-owner-authorization-before-status-read",
      "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary"
    ]
  },
  "gate blocks display wiring when the approved source definition is not surfaced to the page or dock"
);

assert.equal(
  referenceModule.assessYouTubeOAuthSurfacedApprovedClientSafeCredentialReferenceSourceGate({
    approvedSource,
    surface: "/tools/comment-translator",
    pageOrDockHasSurfacedCredentialReferenceId: true,
    requestedClientPayloadChange: "new-client-payload"
  }).status,
  "blocked-no-surfaced-approved-client-safe-credential-reference-source",
  "gate blocks display wiring when readiness would require a new client payload source"
);

assert.deepEqual(
  referenceModule.assessYouTubeOAuthSurfacedApprovedClientSafeCredentialReferenceSourceGate({
    approvedSource,
    surface: "/tools/comment-translator",
    pageOrDockHasSurfacedCredentialReferenceId: true,
    requestedClientPayloadChange: "none"
  }),
  {
    status: "ready-for-status-display-wiring-contract",
    surface: "/tools/comment-translator",
    approvedSource,
    surfacedCredentialReferenceSource: "existing-page-or-dock-client-safe-credential-reference",
    currentClientPayloadSource: "existing-approved-client-safe-source",
    clientPayloadBoundary: "sanitized-credential-status-metadata-only",
    safeStates: ["available", "reconnect-required", "unavailable", "credential-resolution-disabled"],
    nextStep: "wire-status-display-to-surfaced-approved-source-without-storage-or-handoff-changes"
  },
  "gate allows display wiring only after an approved client-safe credentialReferenceId source is already surfaced"
);

assert.match(taskSource, /PR #297.*merge/i, "task.md records the PR #297 merge premise");
assert.match(taskSource, /surfaced approved client-safe credential reference source gate/i, "task.md records this surfaced source gate follow-up");
assert.match(
  taskSource,
  /幅別確認は不要|390 \/ 820 \/ 1024 \/ 1280 \/ 1366px/i,
  "task.md records width-check status for the current UI scope"
);

const allowedChangedFiles = new Set([
  componentPath,
  pagePath,
  "lib/comment-translator.ts",
  referenceSourcePath,
  "lib/comment-translator-youtube-credential-status-ui-wiring.ts",
  "lib/comment-translator-youtube-oauth-token-store-foundation.ts",
  "lib/comment-translator-youtube-token-store-supabase-adapter.ts",
  "scripts/comment-translator-youtube-credential-source-decision-contract.mjs",
  "scripts/comment-translator-youtube-surfaced-credential-reference-source-gate-contract.mjs",
  "scripts/comment-translator-youtube-client-safe-credential-reference-source-contract.mjs",
  "scripts/comment-translator-youtube-new-client-payload-credential-reference-source-contract.mjs",
  "scripts/comment-translator-youtube-credential-status-display-readiness-after-payload-source-contract.mjs",
  "scripts/comment-translator-youtube-credential-reference-surface-source-recheck-contract.mjs",
  "scripts/comment-translator-youtube-credential-reference-surface-approval-evidence-contract.mjs",
  "scripts/comment-translator-youtube-credential-status-ui-wiring-contract.mjs",
  "scripts/comment-translator-youtube-token-store-approved-migration-proposal-contract.mjs",
  "scripts/comment-translator-youtube-token-store-blocker-resolution-contract.mjs",
  "scripts/comment-translator-youtube-token-store-explicit-approval-collection-contract.mjs",
  "scripts/comment-translator-youtube-token-store-schema-key-approval-contract.mjs",
  "scripts/comment-translator-youtube-token-store-separate-approved-migration-pr-contract.mjs",
  "scripts/comment-translator-youtube-token-store-separate-migration-readiness-contract.mjs",
  "scripts/comment-translator-youtube-token-store-supabase-adapter-status-contract.mjs",
  "scripts/comment-translator-youtube-token-store-service-role-smoke-readiness-contract.mjs",
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
  assert.ok(allowedChangedFiles.has(file), `surfaced source gate change stays in allowed files: ${file}`);

  const source = read(file);
  assert.doesNotMatch(
    source,
    /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY/i,
    `${file} does not contain OAuth token values, authorization codes, private keys, or service role key values`
  );
}

console.log("comment translator YouTube surfaced credential reference source gate contract checks passed");
