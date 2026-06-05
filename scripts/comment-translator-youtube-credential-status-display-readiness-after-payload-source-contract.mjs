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
const pr320MergeCommit = "0aecd9448e53eeb9f5b5d123d238d0a5fd2c3481";

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

assert.equal(
  execSync(`git merge-base --is-ancestor ${pr320MergeCommit} HEAD; if ($LASTEXITCODE -eq 0) { "yes" } else { "no" }`, {
    cwd: root,
    encoding: "utf8",
    shell: "powershell.exe"
  }).trim(),
  "yes",
  "PR #320 merge commit is included in the current preview-derived branch"
);

for (const requiredPath of [
  referenceSourcePath,
  uiWiringPath,
  componentPath,
  pagePath,
  statusActionPath,
  statusRoutePath,
  toolHandoffPath,
  taskPath
]) {
  assert.ok(exists(requiredPath), `${requiredPath} exists`);
}

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
  /export function createYouTubeOAuthNewClientPayloadCredentialReferenceSource\b/,
  "PR #320 payload source helper remains available"
);
assert.match(
  uiWiringSource,
  /export type YouTubeOAuthCredentialStatusDisplayReadinessAfterPayloadSource\b/,
  "UI wiring module exports the PR #320 display readiness type"
);
assert.match(
  uiWiringSource,
  /export function assessYouTubeOAuthCredentialStatusDisplayReadinessAfterPayloadSource\b/,
  "UI wiring module exports the PR #320 display readiness helper"
);

assert.match(
  taskSource,
  /PR #321.*merge/i,
  "post-PR #321 display wiring may intentionally call the sanitized credential status action"
);
assert.equal(toolHandoffSource.includes("credentialReferenceId"), false, "existing handoff payload remains unchanged");
assert.doesNotMatch(
  `${referenceSource}\n${uiWiringSource}\n${statusActionSource}\n${statusRouteSource}`,
  /localStorage\.|indexedDB\.|sessionStorage\.|readToolHandoff|writeToolHandoff|youtube\.googleapis|OAuth2Client|GoogleAuth|from\s+["']googleapis["']|require\(["']googleapis["']\)|stripe|checkout|quota|billing|gtag|GA4/i,
  "readiness PR does not add storage, handoff, live Google API, quota, billing, or analytics wiring"
);
assert.doesNotMatch(
  `${referenceSource}\n${uiWiringSource}\n${componentSource}\n${pageSource}\n${statusActionSource}\n${statusRouteSource}`,
  /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|oauthAccessToken|oauthRefreshToken|authorizationCodeValue|managedSecretValue|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY/i,
  "readiness PR does not expose token values, authorization code values, managed secrets, private keys, or service role key values"
);

const referenceModule = loadTsModule(referenceSourcePath);
const uiWiringModule = loadTsModule(uiWiringPath);
const approvalEvidence = {
  status: "approved",
  approverRole: "authorized-product-or-security-owner",
  approvalStatement:
    "approves-new-client-payload-credentialReferenceId-source-for-comment-translator-source-surfacing-before-implementation",
  targetSource: "new-client-payload-credentialReferenceId-source",
  targetSurface: "/tools/comment-translator",
  targetBoundary: "credentialReferenceId-and-sanitized-status-metadata-only-no-storage-or-handoff-change",
  approvedFor: "readiness-only-not-display-ui-wiring",
  approvalEvidenceSource: "user-thread-explicit-approval"
};

const payloadSource = referenceModule.createYouTubeOAuthNewClientPayloadCredentialReferenceSource({
  credentialReferenceId: "ytcred_contract_opaque_320",
  statusMetadata: {
    status: "available",
    provider: "youtube",
    reconnectRequired: false,
    providerChannelId: "UC_contract_channel",
    scopeLabel: "youtube.readonly",
    expiresAtIso: "2026-06-04T12:00:00.000Z",
    reason: null
  },
  sourceSurfacingApprovalEvidence: approvalEvidence
});

assert.deepEqual(
  uiWiringModule.assessYouTubeOAuthCredentialStatusDisplayReadinessAfterPayloadSource({
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 320,
    prerequisiteMergeCommit: pr320MergeCommit,
    serverAction: "getYouTubeOAuthCredentialStatusAction",
    payloadSource
  }),
  {
    status: "ready-for-display-ui-wiring-pr-after-pr320-payload-source-readiness",
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 320,
    prerequisiteMergeCommit: pr320MergeCommit,
    serverAction: "getYouTubeOAuthCredentialStatusAction",
    payloadSource,
    currentClientPayloadSource: "new-client-payload-credentialReferenceId-source",
    clientPayloadBoundary: "credentialReferenceId-and-sanitized-status-metadata-only",
    clientReadableValues: ["credentialReferenceId", "sanitizedCredentialStatusMetadata"],
    safeStates: ["available", "reconnect-required", "unavailable", "credential-resolution-disabled"],
    storageBoundary: "no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
    serverBoundary: "owner-authorization-and-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-preserved",
    displayUiWiring: "deferred-to-separate-pr-after-readiness-pr-merge",
    nextStep: "wire-status-display-in-separate-pr-after-readiness-merge"
  },
  "PR #320 payload source enables only display UI wiring readiness, not display UI wiring in this PR"
);

assert.deepEqual(
  uiWiringModule.assessYouTubeOAuthCredentialStatusDisplayReadinessAfterPayloadSource({
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 320,
    prerequisiteMergeCommit: pr320MergeCommit,
    serverAction: "getYouTubeOAuthCredentialStatusAction",
    payloadSource: null
  }),
  {
    status: "blocked-pr320-payload-source-readiness-missing-payload-source",
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 320,
    prerequisiteMergeCommit: pr320MergeCommit,
    serverAction: "getYouTubeOAuthCredentialStatusAction",
    payloadSource: null,
    currentClientPayloadSource: "not-wired",
    currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled",
    blocker: "new-client-payload-credentialReferenceId-source-required-before-display-ui-wiring-readiness",
    nextPrConditions: [
      "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
      "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
      "preserve-owner-authorization-before-status-read",
      "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary",
      "defer-display-ui-wiring-to-separate-pr-after-readiness-pr-merge"
    ]
  },
  "PR #320 readiness remains blocked if the payload source is absent"
);

assert.match(taskSource, /PR #320.*merge/i, "task.md records the PR #320 merge premise");
assert.match(taskSource, /0aecd9448e53eeb9f5b5d123d238d0a5fd2c3481/, "task.md records the PR #320 merge commit");
assert.match(taskSource, /credential status display UI wiring readiness/i, "task.md records this readiness slice");
assert.match(taskSource, /display UI wiring.*別 PR|別 PR.*display UI wiring/i, "task.md keeps display UI wiring as a separate PR condition");
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
  uiWiringPath,
  "lib/comment-translator-youtube-oauth-token-store-foundation.ts",
  "lib/comment-translator-youtube-token-store-supabase-adapter.ts",
  "scripts/comment-translator-youtube-credential-status-display-readiness-after-payload-source-contract.mjs",
  "scripts/comment-translator-youtube-credential-status-ui-wiring-contract.mjs",
  "scripts/comment-translator-youtube-new-client-payload-credential-reference-source-contract.mjs",
  "scripts/comment-translator-youtube-credential-source-decision-contract.mjs",
  "scripts/comment-translator-youtube-client-safe-credential-reference-source-contract.mjs",
  "scripts/comment-translator-youtube-credential-reference-surface-source-recheck-contract.mjs",
  "scripts/comment-translator-youtube-credential-reference-surface-approval-evidence-contract.mjs",
  "scripts/comment-translator-youtube-surfaced-credential-reference-source-gate-contract.mjs",
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
  "docs/future/COMMENT_TRANSLATOR_YOUTUBE_TOKEN_STORE_BLOCKER_RESOLUTION.md",
  taskPath
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `display readiness after payload source change stays in allowed files: ${file}`);

  const source = read(file);
  assert.doesNotMatch(
    source,
    /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY/i,
    `${file} does not contain OAuth token values, authorization codes, private keys, or service role key values`
  );
}

console.log("comment translator YouTube credential status display readiness after payload source contract checks passed");
