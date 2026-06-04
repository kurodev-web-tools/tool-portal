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
const pr319MergeCommit = "9b0e1977c1efde0ef9e04b5889fd1fb992c052c4";

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
  execSync(`git merge-base --is-ancestor ${pr319MergeCommit} HEAD; if ($LASTEXITCODE -eq 0) { "yes" } else { "no" }`, {
    cwd: root,
    encoding: "utf8",
    shell: "powershell.exe"
  }).trim(),
  "yes",
  "PR #319 merge commit is included in the current preview-derived branch"
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
  /export type YouTubeOAuthNewClientPayloadCredentialReferenceSourceImplementationPostPr319\b/,
  "reference source module exports the PR #319 new client payload source implementation type"
);
assert.match(
  referenceSource,
  /export function createYouTubeOAuthNewClientPayloadCredentialReferenceSource\b/,
  "reference source module exports the new client payload credential reference source helper"
);
assert.match(
  referenceSource,
  /export function assessYouTubeOAuthNewClientPayloadCredentialReferenceSourceImplementationPostPr319\b/,
  "reference source module exports the PR #319 new client payload source implementation gate"
);

assert.doesNotMatch(
  `${componentSource}\n${pageSource}`,
  /getYouTubeOAuthCredentialStatusAction|comment-translator-youtube-credential-status/i,
  "this source implementation PR does not wire credential status display UI or status action calls"
);
assert.equal(toolHandoffSource.includes("credentialReferenceId"), false, "existing handoff payload remains unchanged");
assert.doesNotMatch(
  `${referenceSource}\n${uiWiringSource}\n${statusActionSource}\n${statusRouteSource}`,
  /localStorage\.|indexedDB\.|sessionStorage\.|readToolHandoff|writeToolHandoff|youtube\.googleapis|OAuth2Client|GoogleAuth|from\s+["']googleapis["']|require\(["']googleapis["']\)|stripe|checkout|quota|billing|gtag|GA4/i,
  "new payload source does not add storage, handoff, live Google API, quota, billing, or analytics wiring"
);
assert.doesNotMatch(
  `${referenceSource}\n${uiWiringSource}\n${componentSource}\n${pageSource}\n${statusActionSource}\n${statusRouteSource}`,
  /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|oauthAccessToken|oauthRefreshToken|authorizationCodeValue|managedSecretValue|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY/i,
  "new payload source does not expose token values, authorization code values, managed secrets, private keys, or service role key values"
);

const referenceModule = loadTsModule(referenceSourcePath);
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
  credentialReferenceId: "ytcred_contract_opaque_001",
  statusMetadata: {
    status: "reconnect-required",
    provider: "youtube",
    reconnectRequired: true,
    providerChannelId: "UC_contract_channel",
    scopeLabel: "youtube.readonly",
    expiresAtIso: "2026-06-04T12:00:00.000Z",
    reason: null
  },
  sourceSurfacingApprovalEvidence: approvalEvidence
});

assert.deepEqual(
  payloadSource,
  {
    sourceId: "new-client-payload-credentialReferenceId-source",
    implementationStage: "new-client-payload-credential-reference-source-implemented-not-display-ui-wiring",
    credentialReference: {
      credentialReferenceId: "ytcred_contract_opaque_001",
      identifierShape: "opaque-non-secret-credential-reference-id"
    },
    statusMetadata: {
      status: "reconnect-required",
      provider: "youtube",
      reconnectRequired: true,
      providerChannelId: "UC_contract_channel",
      scopeLabel: "youtube.readonly",
      expiresAtIso: "2026-06-04T12:00:00.000Z",
      reason: null,
      payloadBoundary: "sanitized-credential-status-metadata-only"
    },
    sourceSurfacingApprovalEvidence: approvalEvidence,
    clientReadableValues: ["credentialReferenceId", "sanitizedCredentialStatusMetadata"],
    storageBoundary: "no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
    serverBoundary: "owner-authorization-and-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-preserved",
    displayUiWiring: "deferred-to-separate-pr-after-payload-source-merge"
  },
  "new client payload source returns only an opaque credentialReferenceId and sanitized status metadata"
);

assert.deepEqual(
  referenceModule.assessYouTubeOAuthNewClientPayloadCredentialReferenceSourceImplementationPostPr319({
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 319,
    prerequisiteMergeCommit: pr319MergeCommit,
    sourceSurfacingApprovalEvidence: approvalEvidence,
    payloadSource
  }),
  {
    status: "ready-for-display-ui-wiring-readiness-after-pr319-payload-source-implementation",
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 319,
    prerequisiteMergeCommit: pr319MergeCommit,
    sourceSurfacingApprovalEvidence: approvalEvidence,
    payloadSource,
    currentClientPayloadSource: "new-client-payload-credentialReferenceId-source",
    clientPayloadBoundary: "credentialReferenceId-and-sanitized-status-metadata-only",
    safeStates: ["available", "reconnect-required", "unavailable", "credential-resolution-disabled"],
    storageBoundary: "no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
    serverBoundary: "owner-authorization-and-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-preserved",
    nextStep: "record-display-ui-wiring-readiness-in-separate-pr-before-actual-display-wiring"
  },
  "PR #319 payload source implementation enables only the next readiness PR, not display UI wiring in this PR"
);

assert.equal(
  referenceModule.assessYouTubeOAuthNewClientPayloadCredentialReferenceSourceImplementationPostPr319({
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 319,
    prerequisiteMergeCommit: pr319MergeCommit,
    sourceSurfacingApprovalEvidence: { status: "missing" },
    payloadSource: null
  }).status,
  "blocked-pr319-new-client-payload-source-missing-approved-source-or-payload",
  "PR #319 payload source implementation blocks when approval evidence or payload source is missing"
);

assert.match(taskSource, /PR #319.*merge/i, "task.md records the PR #319 merge premise");
assert.match(taskSource, /9b0e1977c1efde0ef9e04b5889fd1fb992c052c4/, "task.md records the PR #319 merge commit");
assert.match(taskSource, /new client payload `credentialReferenceId` source implementation/i, "task.md records this implementation slice");
assert.match(taskSource, /display UI wiring.*別 PR|別 PR.*display UI wiring/i, "task.md keeps display UI wiring as a separate PR condition");
assert.match(taskSource, /幅別確認は不要/i, "task.md records why width checks are unnecessary when UI is untouched");

const allowedChangedFiles = new Set([
  referenceSourcePath,
  "scripts/comment-translator-youtube-new-client-payload-credential-reference-source-contract.mjs",
  "scripts/comment-translator-youtube-credential-source-decision-contract.mjs",
  "scripts/comment-translator-youtube-client-safe-credential-reference-source-contract.mjs",
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
  "docs/archive/TASK_HISTORY_2026-06.md",
  taskPath
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `new client payload credential reference source change stays in allowed files: ${file}`);

  const source = read(file);
  assert.doesNotMatch(
    source,
    /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY/i,
    `${file} does not contain OAuth token values, authorization codes, private keys, or service role key values`
  );
}

console.log("comment translator YouTube new client payload credential reference source contract checks passed");
