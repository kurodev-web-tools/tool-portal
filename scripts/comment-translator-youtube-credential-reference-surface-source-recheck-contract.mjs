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
const pr300MergeCommit = "a4c272817bab3234eb7a360331c7b54ea419e1b9";
const pr301MergeCommit = "9b0a3e518262dee4058dca4154a888fe079f48cc";
const pr302MergeCommit = "7b08186833350e21814385fa7294e90c36b919de";
const pr303MergeCommit = "1c82713dbeea54ffe0990415618adbb5d8ee55b2";

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
  execSync(`git merge-base --is-ancestor ${pr300MergeCommit} HEAD; if ($LASTEXITCODE -eq 0) { "yes" } else { "no" }`, {
    cwd: root,
    encoding: "utf8",
    shell: "powershell.exe"
  }).trim(),
  "yes",
  "PR #300 merge commit is included in the current preview-derived branch"
);
assert.equal(
  execSync(`git merge-base --is-ancestor ${pr301MergeCommit} HEAD; if ($LASTEXITCODE -eq 0) { "yes" } else { "no" }`, {
    cwd: root,
    encoding: "utf8",
    shell: "powershell.exe"
  }).trim(),
  "yes",
  "PR #301 merge commit is included in the current preview-derived branch"
);
assert.equal(
  execSync(`git merge-base --is-ancestor ${pr302MergeCommit} HEAD; if ($LASTEXITCODE -eq 0) { "yes" } else { "no" }`, {
    cwd: root,
    encoding: "utf8",
    shell: "powershell.exe"
  }).trim(),
  "yes",
  "PR #302 merge commit is included in the current preview-derived branch"
);
assert.equal(
  execSync(`git merge-base --is-ancestor ${pr303MergeCommit} HEAD; if ($LASTEXITCODE -eq 0) { "yes" } else { "no" }`, {
    cwd: root,
    encoding: "utf8",
    shell: "powershell.exe"
  }).trim(),
  "yes",
  "PR #303 merge commit is included in the current preview-derived branch"
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
  /export type YouTubeOAuthCredentialReferenceSurfaceSourceRecheck\b/,
  "reference source module exports the PR #300 surface source recheck type"
);
assert.match(
  referenceSource,
  /export function recheckYouTubeOAuthCredentialReferenceSurfaceSourceReadiness\b/,
  "reference source module exports the PR #300 surface source recheck helper"
);
assert.match(
  referenceSource,
  /export type YouTubeOAuthCredentialReferenceSurfaceSourceApprovalRecheck\b/,
  "reference source module exports the PR #301 surface source and approval evidence recheck type"
);
assert.match(
  referenceSource,
  /export function recheckYouTubeOAuthCredentialReferenceSurfaceSourceApprovalReadiness\b/,
  "reference source module exports the PR #301 surface source and approval evidence recheck helper"
);
assert.match(
  referenceSource,
  /export type YouTubeOAuthCredentialReferenceSurfaceSourceFinalGate\b/,
  "reference source module exports the PR #302 final gate type"
);
assert.match(
  referenceSource,
  /export function assessYouTubeOAuthCredentialReferenceSurfaceSourceFinalGate\b/,
  "reference source module exports the PR #302 final gate helper"
);
assert.match(
  referenceSource,
  /export type YouTubeOAuthCredentialStatusDisplaySourceIntakeGate\b/,
  "reference source module exports the PR #303 credential status display source intake gate type"
);
assert.match(
  referenceSource,
  /export function assessYouTubeOAuthCredentialStatusDisplaySourceIntakeGate\b/,
  "reference source module exports the PR #303 credential status display source intake gate helper"
);

assert.doesNotMatch(
  `${componentSource}\n${pageSource}`,
  /getYouTubeOAuthCredentialStatusAction|credentialReferenceId|comment-translator-youtube-credential-status/i,
  "PR #300 follow-up still has no page or dock credential status/reference wiring"
);
assert.equal(
  toolHandoffSource.includes("credentialReferenceId"),
  false,
  "existing handoff payload remains free of YouTube credential reference fields"
);
assert.doesNotMatch(
  `${referenceSource}\n${uiWiringSource}\n${statusActionSource}\n${statusRouteSource}`,
  /localStorage\.|indexedDB\.|sessionStorage\.|readToolHandoff|writeToolHandoff|youtube\.googleapis|OAuth2Client|GoogleAuth|from\s+["']googleapis["']|require\(["']googleapis["']\)|stripe|checkout|quota|billing|gtag|GA4/i,
  "recheck does not add storage, handoff, live Google API, quota, billing, or analytics wiring"
);
assert.doesNotMatch(
  `${referenceSource}\n${uiWiringSource}\n${componentSource}\n${pageSource}\n${statusActionSource}\n${statusRouteSource}`,
  /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|oauthAccessToken|oauthRefreshToken|authorizationCodeValue|managedSecretValue|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY/i,
  "recheck does not expose token values, authorization code values, managed secrets, private keys, or service role key values"
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
  referenceModule.recheckYouTubeOAuthCredentialReferenceSurfaceSourceReadiness({
    approvedSource,
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 300,
    prerequisiteMergeCommit: pr300MergeCommit,
    pageOrDockHasSurfacedCredentialReferenceId: false,
    sourceSurfacingApprovalEvidence: "missing",
    requestedClientPayloadChange: "none"
  }),
  {
    status: "blocked-pr300-follow-up-missing-surfaced-source-or-approval-evidence",
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 300,
    prerequisiteMergeCommit: pr300MergeCommit,
    approvedSource,
    surfacedCredentialReferenceSource: null,
    sourceSurfacingApprovalEvidence: "missing",
    currentClientPayloadSource: "not-wired",
    currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled",
    blocker: "existing-approved-client-safe-credentialReferenceId-source-and-explicit-source-surfacing-approval-evidence-required-before-status-display-wiring",
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
  "PR #300 recheck blocks display wiring when the source is not surfaced and approval evidence is missing"
);

assert.equal(
  referenceModule.recheckYouTubeOAuthCredentialReferenceSurfaceSourceReadiness({
    approvedSource,
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 300,
    prerequisiteMergeCommit: pr300MergeCommit,
    pageOrDockHasSurfacedCredentialReferenceId: true,
    sourceSurfacingApprovalEvidence: "approved",
    requestedClientPayloadChange: "new-client-payload"
  }).status,
  "blocked-pr300-follow-up-missing-surfaced-source-or-approval-evidence",
  "PR #300 recheck still blocks if readiness would require a new client payload source"
);

assert.equal(
  referenceModule.recheckYouTubeOAuthCredentialReferenceSurfaceSourceReadiness({
    approvedSource,
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 300,
    prerequisiteMergeCommit: pr300MergeCommit,
    pageOrDockHasSurfacedCredentialReferenceId: true,
    sourceSurfacingApprovalEvidence: "approved",
    requestedClientPayloadChange: "none"
  }).status,
  "ready-for-status-display-wiring-after-pr300-source-recheck",
  "PR #300 recheck can only become ready when source and approval evidence are both present without a new payload source"
);

assert.deepEqual(
  referenceModule.recheckYouTubeOAuthCredentialReferenceSurfaceSourceApprovalReadiness({
    approvedSource,
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 301,
    prerequisiteMergeCommit: pr301MergeCommit,
    pageOrDockHasSurfacedCredentialReferenceId: false,
    sourceSurfacingApprovalEvidence: "missing",
    requestedClientPayloadChange: "none"
  }),
  {
    status: "blocked-pr301-follow-up-missing-surfaced-source-or-approval-evidence",
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 301,
    prerequisiteMergeCommit: pr301MergeCommit,
    approvedSource,
    surfacedCredentialReferenceSource: null,
    sourceSurfacingApprovalEvidence: "missing",
    currentClientPayloadSource: "not-wired",
    currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled",
    blocker:
      "existing-approved-client-safe-credentialReferenceId-source-and-explicit-source-surfacing-approval-evidence-required-before-status-display-wiring",
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
  "PR #301 follow-up blocks display wiring when surfaced source or approval evidence is still missing"
);

assert.equal(
  referenceModule.recheckYouTubeOAuthCredentialReferenceSurfaceSourceApprovalReadiness({
    approvedSource,
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 301,
    prerequisiteMergeCommit: pr301MergeCommit,
    pageOrDockHasSurfacedCredentialReferenceId: true,
    sourceSurfacingApprovalEvidence: "approved",
    requestedClientPayloadChange: "new-client-payload"
  }).status,
  "blocked-pr301-follow-up-missing-surfaced-source-or-approval-evidence",
  "PR #301 follow-up still blocks if readiness would require a new client payload source"
);

assert.equal(
  referenceModule.recheckYouTubeOAuthCredentialReferenceSurfaceSourceApprovalReadiness({
    approvedSource,
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 301,
    prerequisiteMergeCommit: pr301MergeCommit,
    pageOrDockHasSurfacedCredentialReferenceId: true,
    sourceSurfacingApprovalEvidence: "approved",
    requestedClientPayloadChange: "none"
  }).status,
  "ready-for-status-display-wiring-after-pr301-source-and-approval-recheck",
  "PR #301 follow-up can only become ready when source and approval evidence are both present without a new payload source"
);

assert.deepEqual(
  referenceModule.assessYouTubeOAuthCredentialReferenceSurfaceSourceFinalGate({
    approvedSource,
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 302,
    prerequisiteMergeCommit: pr302MergeCommit,
    pageOrDockHasSurfacedCredentialReferenceId: false,
    sourceSurfacingApprovalEvidence: "missing",
    requestedClientPayloadChange: "none"
  }),
  {
    status: "blocked-pr302-final-gate-missing-surfaced-source-or-approval-evidence",
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 302,
    prerequisiteMergeCommit: pr302MergeCommit,
    approvedSource,
    surfacedCredentialReferenceSource: null,
    sourceSurfacingApprovalEvidence: "missing",
    currentClientPayloadSource: "not-wired",
    currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled",
    blocker:
      "existing-approved-client-safe-credentialReferenceId-source-and-explicit-source-surfacing-approval-evidence-required-before-status-display-wiring",
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
  "PR #302 final gate blocks display wiring when surfaced source or explicit approval evidence is still missing"
);

assert.equal(
  referenceModule.assessYouTubeOAuthCredentialReferenceSurfaceSourceFinalGate({
    approvedSource,
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 302,
    prerequisiteMergeCommit: pr302MergeCommit,
    pageOrDockHasSurfacedCredentialReferenceId: true,
    sourceSurfacingApprovalEvidence: "approved",
    requestedClientPayloadChange: "new-client-payload"
  }).status,
  "blocked-pr302-final-gate-missing-surfaced-source-or-approval-evidence",
  "PR #302 final gate still blocks if readiness would require a new client payload source"
);

assert.equal(
  referenceModule.assessYouTubeOAuthCredentialReferenceSurfaceSourceFinalGate({
    approvedSource,
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 302,
    prerequisiteMergeCommit: pr302MergeCommit,
    pageOrDockHasSurfacedCredentialReferenceId: true,
    sourceSurfacingApprovalEvidence: "approved",
    requestedClientPayloadChange: "none"
  }).status,
  "ready-for-status-display-wiring-after-pr302-final-gate",
  "PR #302 final gate can only become ready when source and approval evidence are both present without a new payload source"
);

assert.deepEqual(
  referenceModule.assessYouTubeOAuthCredentialStatusDisplaySourceIntakeGate({
    approvedSource,
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 303,
    prerequisiteMergeCommit: pr303MergeCommit,
    pageOrDockHasSurfacedCredentialReferenceId: false,
    sourceSurfacingApprovalEvidence: "missing",
    requestedClientPayloadChange: "none"
  }),
  {
    status: "blocked-pr303-intake-gate-missing-surfaced-source-or-approval-evidence",
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 303,
    prerequisiteMergeCommit: pr303MergeCommit,
    approvedSource,
    surfacedCredentialReferenceSource: null,
    sourceSurfacingApprovalEvidence: "missing",
    currentClientPayloadSource: "not-wired",
    currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled",
    blocker:
      "existing-approved-client-safe-credentialReferenceId-source-and-explicit-source-surfacing-approval-evidence-required-before-status-display-wiring",
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
  "PR #303 source intake gate blocks display wiring when surfaced source or explicit approval evidence is still missing"
);

assert.equal(
  referenceModule.assessYouTubeOAuthCredentialStatusDisplaySourceIntakeGate({
    approvedSource,
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 303,
    prerequisiteMergeCommit: pr303MergeCommit,
    pageOrDockHasSurfacedCredentialReferenceId: true,
    sourceSurfacingApprovalEvidence: "approved",
    requestedClientPayloadChange: "new-client-payload"
  }).status,
  "blocked-pr303-intake-gate-missing-surfaced-source-or-approval-evidence",
  "PR #303 source intake gate still blocks if readiness would require a new client payload source"
);

assert.equal(
  referenceModule.assessYouTubeOAuthCredentialStatusDisplaySourceIntakeGate({
    approvedSource,
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 303,
    prerequisiteMergeCommit: pr303MergeCommit,
    pageOrDockHasSurfacedCredentialReferenceId: true,
    sourceSurfacingApprovalEvidence: "approved",
    requestedClientPayloadChange: "none"
  }).status,
  "ready-for-status-display-wiring-after-pr303-source-intake-gate",
  "PR #303 source intake gate can only become ready when source and approval evidence are both present without a new payload source"
);

assert.match(taskSource, /PR #300.*merge/i, "task.md records the PR #300 merge premise");
assert.match(taskSource, /a4c272817bab3234eb7a360331c7b54ea419e1b9/, "task.md records the PR #300 merge commit");
assert.match(taskSource, /PR #301.*merge/i, "task.md records the PR #301 merge premise");
assert.match(taskSource, /9b0a3e518262dee4058dca4154a888fe079f48cc/, "task.md records the PR #301 merge commit");
assert.match(taskSource, /PR #302.*merge/i, "task.md records the PR #302 merge premise");
assert.match(taskSource, /7b08186833350e21814385fa7294e90c36b919de/, "task.md records the PR #302 merge commit");
assert.match(taskSource, /PR #303.*merge/i, "task.md records the PR #303 merge premise");
assert.match(taskSource, /1c82713dbeea54ffe0990415618adbb5d8ee55b2/, "task.md records the PR #303 merge commit");
assert.match(taskSource, /source\/evidence intake gate/i, "task.md records the current source/evidence intake gate target");
assert.match(taskSource, /幅別確認は不要/i, "task.md records why width checks are unnecessary when UI is untouched");

const allowedChangedFiles = new Set([
  referenceSourcePath,
  "scripts/comment-translator-youtube-credential-reference-surface-source-recheck-contract.mjs",
  "scripts/comment-translator-youtube-credential-reference-surface-approval-evidence-contract.mjs",
  "scripts/comment-translator-youtube-surfaced-credential-reference-source-gate-contract.mjs",
  "scripts/comment-translator-youtube-client-safe-credential-reference-source-contract.mjs",
  "scripts/comment-translator-youtube-credential-status-ui-wiring-contract.mjs",
  "scripts/comment-translator-youtube-token-store-supabase-adapter-status-contract.mjs",
  "scripts/comment-translator-youtube-token-store-approved-migration-proposal-contract.mjs",
  "scripts/comment-translator-youtube-token-store-blocker-resolution-contract.mjs",
  "scripts/comment-translator-youtube-token-store-explicit-approval-collection-contract.mjs",
  "scripts/comment-translator-youtube-token-store-schema-key-approval-contract.mjs",
  "scripts/comment-translator-youtube-token-store-separate-approved-migration-pr-contract.mjs",
  "scripts/comment-translator-youtube-token-store-separate-migration-readiness-contract.mjs",
  taskPath
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `PR #300 recheck change stays in allowed files: ${file}`);

  const source = read(file);
  assert.doesNotMatch(
    source,
    /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY/i,
    `${file} does not contain OAuth token values, authorization codes, private keys, or service role key values`
  );
}

console.log("comment translator YouTube credential reference surface source recheck contract checks passed");
