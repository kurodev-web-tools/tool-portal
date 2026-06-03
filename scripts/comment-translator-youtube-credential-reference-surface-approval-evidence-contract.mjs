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
assert.ok(exists(uiWiringPath), "credential status UI wiring readiness module exists");
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
  /export type YouTubeOAuthCredentialReferenceSurfaceApprovalEvidenceGate\b/,
  "reference source module exports the source approval evidence gate type"
);
assert.match(
  referenceSource,
  /export function assessYouTubeOAuthCredentialReferenceSurfaceApprovalEvidenceGate\b/,
  "reference source module exports the source approval evidence gate helper"
);

assert.doesNotMatch(
  `${componentSource}\n${pageSource}`,
  /getYouTubeOAuthCredentialStatusAction|credentialReferenceId|comment-translator-youtube-credential-status/i,
  "current page and dock still do not wire credential status action or credentialReferenceId"
);
assert.equal(
  toolHandoffSource.includes("credentialReferenceId"),
  false,
  "existing handoff payload remains free of YouTube credential reference fields"
);
assert.doesNotMatch(
  `${referenceSource}\n${uiWiringSource}\n${statusActionSource}\n${statusRouteSource}`,
  /localStorage\.|indexedDB\.|sessionStorage\.|readToolHandoff|writeToolHandoff|youtube\.googleapis|OAuth2Client|GoogleAuth|from\s+["']googleapis["']|require\(["']googleapis["']\)|stripe|checkout|quota|billing|gtag|GA4/i,
  "approval evidence gate does not add storage, handoff, live Google API, quota, billing, or analytics wiring"
);
assert.doesNotMatch(
  `${referenceSource}\n${uiWiringSource}\n${componentSource}\n${pageSource}\n${statusActionSource}\n${statusRouteSource}`,
  /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|oauthAccessToken|oauthRefreshToken|authorizationCodeValue|managedSecretValue|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY/i,
  "approval evidence gate does not expose token values, authorization code values, managed secrets, private keys, or service role key values"
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
  referenceModule.assessYouTubeOAuthCredentialReferenceSurfaceApprovalEvidenceGate({
    approvedSource,
    surface: "/tools/comment-translator",
    pageOrDockHasSurfacedCredentialReferenceId: false,
    sourceSurfacingApprovalEvidence: "missing",
    requestedClientPayloadChange: "none"
  }),
  {
    status: "blocked-missing-surfaced-source-or-approval-evidence",
    surface: "/tools/comment-translator",
    approvedSource,
    surfacedCredentialReferenceSource: null,
    sourceSurfacingApprovalEvidence: "missing",
    currentClientPayloadSource: "not-wired",
    currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled",
    blocker: "existing-surfaced-source-and-source-surfacing-approval-evidence-required-before-status-display-wiring",
    nextPrConditions: [
      "identify-existing-approved-client-safe-credentialReferenceId-source-surfaced-to-comment-translator",
      "record-explicit-source-surfacing-approval-evidence-before-status-display-wiring",
      "do-not-call-status-action-until-source-and-approval-evidence-are-present",
      "do-not-add-new-client-payload-without-explicit-source-approval",
      "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
      "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
      "preserve-no-token-secret-ciphertext-or-decrypt-capability-output",
      "preserve-owner-authorization-before-status-read",
      "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary"
    ]
  },
  "approval evidence gate blocks display wiring when the approved source is not surfaced and evidence is missing"
);

assert.equal(
  referenceModule.assessYouTubeOAuthCredentialReferenceSurfaceApprovalEvidenceGate({
    approvedSource,
    surface: "/tools/comment-translator",
    pageOrDockHasSurfacedCredentialReferenceId: true,
    sourceSurfacingApprovalEvidence: "approved",
    requestedClientPayloadChange: "new-client-payload"
  }).status,
  "blocked-missing-surfaced-source-or-approval-evidence",
  "approval evidence gate blocks display wiring when readiness would require a new client payload source"
);

assert.deepEqual(
  referenceModule.assessYouTubeOAuthCredentialReferenceSurfaceApprovalEvidenceGate({
    approvedSource,
    surface: "/tools/comment-translator",
    pageOrDockHasSurfacedCredentialReferenceId: true,
    sourceSurfacingApprovalEvidence: "approved",
    requestedClientPayloadChange: "none"
  }),
  {
    status: "ready-for-status-display-wiring-after-source-approval-evidence",
    surface: "/tools/comment-translator",
    approvedSource,
    surfacedCredentialReferenceSource: "existing-page-or-dock-client-safe-credential-reference",
    sourceSurfacingApprovalEvidence: "approved",
    currentClientPayloadSource: "existing-approved-client-safe-source",
    clientPayloadBoundary: "sanitized-credential-status-metadata-only",
    safeStates: ["available", "reconnect-required", "unavailable", "credential-resolution-disabled"],
    nextStep: "wire-status-display-to-approved-surfaced-source-in-separate-pr-without-storage-or-handoff-changes"
  },
  "approval evidence gate allows display wiring only after the source is surfaced and explicit approval evidence exists"
);

assert.match(taskSource, /PR #299.*merge/i, "task.md records the PR #299 merge premise");
assert.match(taskSource, /source-surfacing explicit approval evidence/i, "task.md records the source-surfacing approval evidence follow-up");
assert.match(taskSource, /幅別確認は不要/i, "task.md records why width checks are unnecessary when UI is untouched");

const allowedChangedFiles = new Set([
  referenceSourcePath,
  "scripts/comment-translator-youtube-credential-reference-surface-approval-evidence-contract.mjs",
  "scripts/comment-translator-youtube-surfaced-credential-reference-source-gate-contract.mjs",
  "scripts/comment-translator-youtube-client-safe-credential-reference-source-contract.mjs",
  "scripts/comment-translator-youtube-credential-status-ui-wiring-contract.mjs",
  "scripts/comment-translator-youtube-token-store-approved-migration-proposal-contract.mjs",
  "scripts/comment-translator-youtube-token-store-blocker-resolution-contract.mjs",
  "scripts/comment-translator-youtube-token-store-explicit-approval-collection-contract.mjs",
  "scripts/comment-translator-youtube-token-store-schema-key-approval-contract.mjs",
  "scripts/comment-translator-youtube-token-store-separate-approved-migration-pr-contract.mjs",
  "scripts/comment-translator-youtube-token-store-separate-migration-readiness-contract.mjs",
  "scripts/comment-translator-youtube-token-store-supabase-adapter-status-contract.mjs",
  taskPath
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `approval evidence gate change stays in allowed files: ${file}`);

  const source = read(file);
  assert.doesNotMatch(
    source,
    /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY/i,
    `${file} does not contain OAuth token values, authorization codes, private keys, or service role key values`
  );
}

console.log("comment translator YouTube credential reference surface approval evidence contract checks passed");
