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
const pr314MergeCommit = "324e51ad718c5d31b7d0768ebcfed6258c43dd4f";
const pr315MergeCommit = "8fb6df6e20149dd83e8204c1a17a937c2d7497ee";
const pr316MergeCommit = "1adf68b47d418c2127c45aeb5d13269b2a82ece6";
const pr317MergeCommit = "8c5c4c3ed5b38a1cb667e520125bf1469dce6b5b";
const pr318MergeCommit = "1412791c5f3e5af3bf56f399ac692cfd1715962c";

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
  execSync(`git merge-base --is-ancestor ${pr314MergeCommit} HEAD; if ($LASTEXITCODE -eq 0) { "yes" } else { "no" }`, {
    cwd: root,
    encoding: "utf8",
    shell: "powershell.exe"
  }).trim(),
  "yes",
  "PR #314 merge commit is included in the current preview-derived branch"
);
assert.equal(
  execSync(`git merge-base --is-ancestor ${pr315MergeCommit} HEAD; if ($LASTEXITCODE -eq 0) { "yes" } else { "no" }`, {
    cwd: root,
    encoding: "utf8",
    shell: "powershell.exe"
  }).trim(),
  "yes",
  "PR #315 merge commit is included in the current preview-derived branch"
);
assert.equal(
  execSync(`git merge-base --is-ancestor ${pr316MergeCommit} HEAD; if ($LASTEXITCODE -eq 0) { "yes" } else { "no" }`, {
    cwd: root,
    encoding: "utf8",
    shell: "powershell.exe"
  }).trim(),
  "yes",
  "PR #316 merge commit is included in the current preview-derived branch"
);
assert.equal(
  execSync(`git merge-base --is-ancestor ${pr317MergeCommit} HEAD; if ($LASTEXITCODE -eq 0) { "yes" } else { "no" }`, {
    cwd: root,
    encoding: "utf8",
    shell: "powershell.exe"
  }).trim(),
  "yes",
  "PR #317 merge commit is included in the current preview-derived branch"
);
assert.equal(
  execSync(`git merge-base --is-ancestor ${pr318MergeCommit} HEAD; if ($LASTEXITCODE -eq 0) { "yes" } else { "no" }`, {
    cwd: root,
    encoding: "utf8",
    shell: "powershell.exe"
  }).trim(),
  "yes",
  "PR #318 merge commit is included in the current preview-derived branch"
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
  /export type YouTubeOAuthCredentialSourceDecisionPostPr314Gate\b/,
  "reference source module exports the PR #314 source decision gate type"
);
assert.match(
  referenceSource,
  /export function assessYouTubeOAuthCredentialSourceDecisionPostPr314Gate\b/,
  "reference source module exports the PR #314 source decision gate helper"
);
assert.match(
  referenceSource,
  /export type YouTubeOAuthNewClientPayloadSourceSurfacingApprovalEvidenceRequirement\b/,
  "reference source module exports the new client payload source approval evidence requirement type"
);
assert.match(
  referenceSource,
  /export function assessYouTubeOAuthNewClientPayloadSourceSurfacingApprovalEvidenceRequirement\b/,
  "reference source module exports the new client payload source approval evidence requirement helper"
);
assert.match(
  referenceSource,
  /export type YouTubeOAuthSourceSurfacingApprovalEvidenceCollectionReadiness\b/,
  "reference source module exports the PR #316 source-surfacing approval evidence collection readiness type"
);
assert.match(
  referenceSource,
  /export function assessYouTubeOAuthSourceSurfacingApprovalEvidenceCollectionReadiness\b/,
  "reference source module exports the PR #316 source-surfacing approval evidence collection readiness helper"
);
assert.match(
  referenceSource,
  /export type YouTubeOAuthSourceSurfacingApprovalEvidenceReadinessPostPr317Gate\b/,
  "reference source module exports the PR #317 source-surfacing approval evidence readiness type"
);
assert.match(
  referenceSource,
  /export function assessYouTubeOAuthSourceSurfacingApprovalEvidenceReadinessPostPr317Gate\b/,
  "reference source module exports the PR #317 source-surfacing approval evidence readiness helper"
);
assert.match(
  referenceSource,
  /export type YouTubeOAuthSourceSurfacingExplicitApprovalEvidenceReadinessPostPr318Gate\b/,
  "reference source module exports the PR #318 explicit source-surfacing approval evidence readiness type"
);
assert.match(
  referenceSource,
  /export function assessYouTubeOAuthSourceSurfacingExplicitApprovalEvidenceReadinessPostPr318Gate\b/,
  "reference source module exports the PR #318 explicit source-surfacing approval evidence readiness helper"
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
  "source decision does not add storage, handoff, live Google API, quota, billing, or analytics wiring"
);
assert.doesNotMatch(
  `${referenceSource}\n${uiWiringSource}\n${componentSource}\n${pageSource}\n${statusActionSource}\n${statusRouteSource}`,
  /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|oauthAccessToken|oauthRefreshToken|authorizationCodeValue|managedSecretValue|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY/i,
  "source decision does not expose token values, authorization code values, managed secrets, private keys, or service role key values"
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
  referenceModule.assessYouTubeOAuthCredentialSourceDecisionPostPr314Gate({
    approvedSource,
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 314,
    prerequisiteMergeCommit: pr314MergeCommit,
    pageOrDockHasSurfacedCredentialReferenceId: false,
    sourceSurfacingApprovalEvidence: "missing",
    requestedClientPayloadChange: "none"
  }),
  {
    status: "blocked-pr314-source-decision-missing-surfaced-source-or-approval-evidence",
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 314,
    prerequisiteMergeCommit: pr314MergeCommit,
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
      "if-new-client-payload-source-is-required-get-explicit-source-surfacing-approval-before-implementation",
      "do-not-call-status-action-until-source-and-approval-evidence-are-present",
      "do-not-add-new-client-payload-in-this-source-decision-pr",
      "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
      "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
      "preserve-no-token-secret-ciphertext-or-decrypt-capability-output",
      "preserve-owner-authorization-before-status-read",
      "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary",
      "defer-status-display-ui-wiring-to-separate-pr-even-if-source-and-approval-evidence-are-present"
    ]
  },
  "PR #314 source decision blocks display wiring when surfaced source or explicit approval evidence is still missing"
);

assert.equal(
  referenceModule.assessYouTubeOAuthCredentialSourceDecisionPostPr314Gate({
    approvedSource,
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 314,
    prerequisiteMergeCommit: pr314MergeCommit,
    pageOrDockHasSurfacedCredentialReferenceId: true,
    sourceSurfacingApprovalEvidence: "approved",
    requestedClientPayloadChange: "new-client-payload"
  }).status,
  "blocked-pr314-source-decision-missing-surfaced-source-or-approval-evidence",
  "PR #314 source decision still blocks when the decision would require a new client payload source"
);

assert.equal(
  referenceModule.assessYouTubeOAuthCredentialSourceDecisionPostPr314Gate({
    approvedSource,
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 314,
    prerequisiteMergeCommit: pr314MergeCommit,
    pageOrDockHasSurfacedCredentialReferenceId: true,
    sourceSurfacingApprovalEvidence: "approved",
    requestedClientPayloadChange: "none"
  }).status,
  "ready-for-status-display-readiness-after-pr314-source-decision",
  "PR #314 source decision only records readiness when source and approval evidence are both present without a new payload source"
);

assert.deepEqual(
  referenceModule.assessYouTubeOAuthNewClientPayloadSourceSurfacingApprovalEvidenceRequirement({
    approvedSource,
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 315,
    prerequisiteMergeCommit: pr315MergeCommit,
    requestedClientPayloadSource: "new-client-payload-required",
    newClientPayloadSourceApprovalEvidence: { status: "missing" }
  }),
  {
    status: "blocked-pr315-new-client-payload-source-missing-explicit-approval-evidence",
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 315,
    prerequisiteMergeCommit: pr315MergeCommit,
    approvedSource,
    requestedClientPayloadSource: "new-client-payload-required",
    newClientPayloadSourceApprovalEvidence: "missing",
    currentClientPayloadSource: "not-wired",
    currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled",
    blocker: "explicit-source-surfacing-approval-evidence-required-before-new-client-payload-source-implementation",
    requiredEvidenceShape: [
      "approver-identity-and-role",
      "explicit-approval-statement-for-new-client-payload-source",
      "target-source-new-client-payload-credentialReferenceId-source",
      "target-surface-tools-comment-translator",
      "client-readable-boundary-credentialReferenceId-and-sanitized-status-only",
      "storage-boundary-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
      "server-boundary-owner-authorization-and-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED",
      "readiness-only-before-separate-display-ui-wiring-pr"
    ],
    nextPrConditions: [
      "record-approver-identity-and-role",
      "record-explicit-approval-statement-for-new-client-payload-source-before-implementation",
      "record-target-source-surface-and-boundaries",
      "do-not-implement-new-client-payload-source-in-this-approval-evidence-pr",
      "do-not-call-status-action-until-source-and-approval-evidence-are-present",
      "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
      "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
      "preserve-no-token-secret-ciphertext-or-decrypt-capability-output",
      "preserve-owner-authorization-before-status-read",
      "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary",
      "defer-status-display-ui-wiring-to-separate-pr-even-if-source-and-approval-evidence-are-present"
    ]
  },
  "PR #315 approval evidence requirement blocks new client payload source implementation when explicit evidence is missing"
);

assert.deepEqual(
  referenceModule.assessYouTubeOAuthNewClientPayloadSourceSurfacingApprovalEvidenceRequirement({
    approvedSource,
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 315,
    prerequisiteMergeCommit: pr315MergeCommit,
    requestedClientPayloadSource: "new-client-payload-required",
    newClientPayloadSourceApprovalEvidence: {
      status: "approved",
      approverRole: "authorized-product-or-security-owner",
      approvalStatement: "explicitly-approves-new-client-payload-source-before-implementation",
      targetSource: "new-client-payload-credentialReferenceId-source",
      targetSurface: "/tools/comment-translator",
      targetBoundary: "credentialReferenceId-and-sanitized-status-metadata-only-no-storage-or-handoff-change",
      approvedFor: "readiness-only-not-display-ui-wiring"
    }
  }),
  {
    status: "ready-for-new-client-payload-source-readiness-only-after-pr315-approval-evidence",
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 315,
    prerequisiteMergeCommit: pr315MergeCommit,
    approvedSource,
    requestedClientPayloadSource: "new-client-payload-required",
    newClientPayloadSourceApprovalEvidence: {
      status: "approved",
      approverRole: "authorized-product-or-security-owner",
      approvalStatement: "explicitly-approves-new-client-payload-source-before-implementation",
      targetSource: "new-client-payload-credentialReferenceId-source",
      targetSurface: "/tools/comment-translator",
      targetBoundary: "credentialReferenceId-and-sanitized-status-metadata-only-no-storage-or-handoff-change",
      approvedFor: "readiness-only-not-display-ui-wiring"
    },
    currentClientPayloadSource: "not-wired",
    clientPayloadBoundary: "sanitized-credential-status-metadata-only",
    safeStates: ["available", "reconnect-required", "unavailable", "credential-resolution-disabled"],
    nextStep: "record-readiness-only-and-defer-new-client-payload-source-implementation-to-separate-pr"
  },
  "PR #315 approval evidence requirement can only record readiness, not implement display wiring or a new client payload source"
);

assert.deepEqual(
  referenceModule.assessYouTubeOAuthSourceSurfacingApprovalEvidenceCollectionReadiness({
    approvedSource,
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 316,
    prerequisiteMergeCommit: pr316MergeCommit,
    requestedClientPayloadSource: "new-client-payload-required",
    sourceSurfacingApprovalEvidence: { status: "missing" }
  }),
  {
    status: "blocked-pr316-source-surfacing-approval-evidence-not-collected",
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 316,
    prerequisiteMergeCommit: pr316MergeCommit,
    approvedSource,
    requestedClientPayloadSource: "new-client-payload-required",
    sourceSurfacingApprovalEvidence: "missing",
    currentClientPayloadSource: "not-wired",
    currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled",
    blocker: "explicit-source-surfacing-approval-evidence-collection-required-before-readiness",
    requiredEvidenceShape: [
      "approver-identity-and-role",
      "explicit-approval-statement-for-new-client-payload-source",
      "target-source-new-client-payload-credentialReferenceId-source",
      "target-surface-tools-comment-translator",
      "target-boundary-credentialReferenceId-and-sanitized-status-metadata-only-no-storage-or-handoff-change"
    ],
    nextPrConditions: [
      "collect-explicit-approval-evidence-with-approver-role-statement-source-surface-boundary",
      "do-not-implement-new-client-payload-source-until-evidence-is-collected",
      "do-not-call-status-action-until-source-and-approval-evidence-are-present",
      "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
      "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
      "preserve-no-token-secret-ciphertext-or-decrypt-capability-output",
      "preserve-owner-authorization-before-status-read",
      "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary",
      "defer-status-display-ui-wiring-to-separate-pr-even-if-source-and-approval-evidence-are-present"
    ]
  },
  "PR #316 evidence collection readiness blocks when explicit source-surfacing approval evidence is missing"
);

assert.deepEqual(
  referenceModule.assessYouTubeOAuthSourceSurfacingApprovalEvidenceCollectionReadiness({
    approvedSource,
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 316,
    prerequisiteMergeCommit: pr316MergeCommit,
    requestedClientPayloadSource: "new-client-payload-required",
    sourceSurfacingApprovalEvidence: {
      status: "approved",
      approverRole: "authorized-product-or-security-owner",
      approvalStatement: "explicitly-approves-new-client-payload-source-before-implementation",
      targetSource: "new-client-payload-credentialReferenceId-source",
      targetSurface: "/tools/comment-translator",
      targetBoundary: "credentialReferenceId-and-sanitized-status-metadata-only-no-storage-or-handoff-change",
      approvedFor: "readiness-only-not-display-ui-wiring"
    }
  }),
  {
    status: "ready-for-new-client-payload-source-readiness-only-after-pr316-evidence-collection",
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 316,
    prerequisiteMergeCommit: pr316MergeCommit,
    approvedSource,
    requestedClientPayloadSource: "new-client-payload-required",
    sourceSurfacingApprovalEvidence: {
      status: "approved",
      approverRole: "authorized-product-or-security-owner",
      approvalStatement: "explicitly-approves-new-client-payload-source-before-implementation",
      targetSource: "new-client-payload-credentialReferenceId-source",
      targetSurface: "/tools/comment-translator",
      targetBoundary: "credentialReferenceId-and-sanitized-status-metadata-only-no-storage-or-handoff-change",
      approvedFor: "readiness-only-not-display-ui-wiring"
    },
    currentClientPayloadSource: "not-wired",
    clientPayloadBoundary: "sanitized-credential-status-metadata-only",
    safeStates: ["available", "reconnect-required", "unavailable", "credential-resolution-disabled"],
    nextStep: "record-readiness-only-and-defer-new-client-payload-source-implementation-and-display-ui-wiring-to-separate-prs"
  },
  "PR #316 evidence collection can only record readiness, not implement payload or display UI wiring"
);

assert.deepEqual(
  referenceModule.assessYouTubeOAuthSourceSurfacingApprovalEvidenceReadinessPostPr317Gate({
    approvedSource,
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 317,
    prerequisiteMergeCommit: pr317MergeCommit,
    requestedClientPayloadSource: "new-client-payload-required",
    sourceSurfacingApprovalEvidence: { status: "missing" }
  }),
  {
    status: "blocked-pr317-source-surfacing-approval-evidence-readiness-missing-explicit-evidence",
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 317,
    prerequisiteMergeCommit: pr317MergeCommit,
    approvedSource,
    requestedClientPayloadSource: "new-client-payload-required",
    sourceSurfacingApprovalEvidence: "missing",
    currentClientPayloadSource: "not-wired",
    currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled",
    blocker: "explicit-source-surfacing-approval-evidence-required-before-readiness-or-payload-implementation",
    requiredEvidenceShape: [
      "approver-role",
      "approval-statement",
      "target-source-new-client-payload-credentialReferenceId-source",
      "target-surface-tools-comment-translator",
      "target-boundary-credentialReferenceId-and-sanitized-status-metadata-only-no-storage-or-handoff-change"
    ],
    nextPrConditions: [
      "collect-explicit-approval-evidence-with-approver-role-approval-statement-target-source-target-surface-target-boundary",
      "do-not-implement-new-client-payload-source-in-this-readiness-pr",
      "do-not-wire-credential-status-display-ui-in-this-readiness-pr",
      "do-not-call-status-action-until-source-and-approval-evidence-are-present",
      "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
      "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
      "preserve-no-token-secret-ciphertext-or-decrypt-capability-output",
      "preserve-owner-authorization-before-status-read",
      "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary"
    ]
  },
  "PR #317 readiness gate stays blocked when explicit source-surfacing approval evidence is missing"
);

assert.deepEqual(
  referenceModule.assessYouTubeOAuthSourceSurfacingApprovalEvidenceReadinessPostPr317Gate({
    approvedSource,
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 317,
    prerequisiteMergeCommit: pr317MergeCommit,
    requestedClientPayloadSource: "new-client-payload-required",
    sourceSurfacingApprovalEvidence: {
      status: "approved",
      approverRole: "authorized-product-or-security-owner",
      approvalStatement: "explicitly-approves-new-client-payload-source-before-implementation",
      targetSource: "new-client-payload-credentialReferenceId-source",
      targetSurface: "/tools/comment-translator",
      targetBoundary: "credentialReferenceId-and-sanitized-status-metadata-only-no-storage-or-handoff-change",
      approvedFor: "readiness-only-not-display-ui-wiring"
    }
  }),
  {
    status: "ready-for-new-client-payload-source-readiness-only-after-pr317-source-surfacing-approval-evidence",
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 317,
    prerequisiteMergeCommit: pr317MergeCommit,
    approvedSource,
    requestedClientPayloadSource: "new-client-payload-required",
    sourceSurfacingApprovalEvidence: {
      status: "approved",
      approverRole: "authorized-product-or-security-owner",
      approvalStatement: "explicitly-approves-new-client-payload-source-before-implementation",
      targetSource: "new-client-payload-credentialReferenceId-source",
      targetSurface: "/tools/comment-translator",
      targetBoundary: "credentialReferenceId-and-sanitized-status-metadata-only-no-storage-or-handoff-change",
      approvedFor: "readiness-only-not-display-ui-wiring"
    },
    currentClientPayloadSource: "not-wired",
    clientPayloadBoundary: "sanitized-credential-status-metadata-only",
    safeStates: ["available", "reconnect-required", "unavailable", "credential-resolution-disabled"],
    nextStep: "record-readiness-only-and-defer-new-client-payload-source-implementation-and-display-ui-wiring-to-separate-prs"
  },
  "PR #317 readiness gate can only record readiness, not implement payload or display UI wiring"
);

assert.deepEqual(
  referenceModule.assessYouTubeOAuthSourceSurfacingExplicitApprovalEvidenceReadinessPostPr318Gate({
    approvedSource,
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 318,
    prerequisiteMergeCommit: pr318MergeCommit,
    requestedClientPayloadSource: "new-client-payload-required",
    sourceSurfacingApprovalEvidence: {
      status: "approved",
      approverRole: "authorized-product-or-security-owner",
      approvalStatement:
        "approves-new-client-payload-credentialReferenceId-source-for-comment-translator-source-surfacing-before-implementation",
      targetSource: "new-client-payload-credentialReferenceId-source",
      targetSurface: "/tools/comment-translator",
      targetBoundary: "credentialReferenceId-and-sanitized-status-metadata-only-no-storage-or-handoff-change",
      approvedFor: "readiness-only-not-display-ui-wiring",
      approvalEvidenceSource: "user-thread-explicit-approval"
    }
  }),
  {
    status: "ready-for-new-client-payload-source-readiness-only-after-pr318-explicit-source-surfacing-approval-evidence",
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 318,
    prerequisiteMergeCommit: pr318MergeCommit,
    approvedSource,
    requestedClientPayloadSource: "new-client-payload-required",
    sourceSurfacingApprovalEvidence: {
      status: "approved",
      approverRole: "authorized-product-or-security-owner",
      approvalStatement:
        "approves-new-client-payload-credentialReferenceId-source-for-comment-translator-source-surfacing-before-implementation",
      targetSource: "new-client-payload-credentialReferenceId-source",
      targetSurface: "/tools/comment-translator",
      targetBoundary: "credentialReferenceId-and-sanitized-status-metadata-only-no-storage-or-handoff-change",
      approvedFor: "readiness-only-not-display-ui-wiring",
      approvalEvidenceSource: "user-thread-explicit-approval"
    },
    currentClientPayloadSource: "not-wired",
    clientPayloadBoundary: "sanitized-credential-status-metadata-only",
    storageBoundary: "no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
    serverBoundary: "owner-authorization-and-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-preserved",
    safeStates: ["available", "reconnect-required", "unavailable", "credential-resolution-disabled"],
    approvalScope: "readiness-only-not-payload-implementation-or-display-ui-wiring",
    nextStep: "implement-new-client-payload-source-in-separate-pr-before-display-ui-wiring"
  },
  "PR #318 explicit source-surfacing approval evidence records readiness only without payload implementation or display UI wiring"
);

assert.deepEqual(
  referenceModule.assessYouTubeOAuthSourceSurfacingExplicitApprovalEvidenceReadinessPostPr318Gate({
    approvedSource,
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 318,
    prerequisiteMergeCommit: pr318MergeCommit,
    requestedClientPayloadSource: "new-client-payload-required",
    sourceSurfacingApprovalEvidence: { status: "missing" }
  }),
  {
    status: "blocked-pr318-explicit-source-surfacing-approval-evidence-missing",
    surface: "/tools/comment-translator",
    prerequisitePullRequest: 318,
    prerequisiteMergeCommit: pr318MergeCommit,
    approvedSource,
    requestedClientPayloadSource: "new-client-payload-required",
    sourceSurfacingApprovalEvidence: "missing",
    currentClientPayloadSource: "not-wired",
    currentSafeFallback: "sanitized-unavailable-or-credential-resolution-disabled",
    blocker: "explicit-source-surfacing-approval-evidence-required-before-readiness-or-payload-implementation",
    requiredEvidenceShape: [
      "approver-role-authorized-product-or-security-owner",
      "approval-statement-for-new-client-payload-credentialReferenceId-source",
      "target-source-new-client-payload-credentialReferenceId-source",
      "target-surface-tools-comment-translator",
      "target-boundary-credentialReferenceId-and-sanitized-status-metadata-only",
      "storage-boundary-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
      "server-boundary-owner-authorization-and-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED",
      "approval-scope-readiness-only-not-payload-implementation-or-display-ui-wiring"
    ],
    nextPrConditions: [
      "record-explicit-source-surfacing-approval-evidence-before-payload-implementation",
      "do-not-implement-new-client-payload-source-in-this-readiness-pr",
      "do-not-wire-credential-status-display-ui-in-this-readiness-pr",
      "keep-client-readable-values-to-credentialReferenceId-and-sanitized-status-metadata",
      "preserve-no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
      "preserve-owner-authorization-before-status-read",
      "preserve-YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED-rollback-boundary"
    ]
  },
  "PR #318 explicit source-surfacing approval evidence readiness blocks if evidence is missing"
);

assert.match(taskSource, /PR #314.*merge/i, "task.md records the PR #314 merge premise");
assert.match(taskSource, /324e51ad718c5d31b7d0768ebcfed6258c43dd4f/, "task.md records the PR #314 merge commit");
assert.match(taskSource, /PR #315.*merge/i, "task.md records the PR #315 merge premise");
assert.match(taskSource, /8fb6df6e20149dd83e8204c1a17a937c2d7497ee/, "task.md records the PR #315 merge commit");
assert.match(taskSource, /PR #316.*merge/i, "task.md records the PR #316 merge premise");
assert.match(taskSource, /1adf68b47d418c2127c45aeb5d13269b2a82ece6/, "task.md records the PR #316 merge commit");
assert.match(taskSource, /PR #317.*merge/i, "task.md records the PR #317 merge premise");
assert.match(taskSource, /8c5c4c3ed5b38a1cb667e520125bf1469dce6b5b/, "task.md records the PR #317 merge commit");
assert.match(taskSource, /PR #318.*merge/i, "task.md records the PR #318 merge premise");
assert.match(taskSource, /1412791c5f3e5af3bf56f399ac692cfd1715962c/, "task.md records the PR #318 merge commit");
assert.match(taskSource, /approver.*role|approval.*statement|target source|target surface|target boundary/i, "task.md records the explicit approval evidence shape required before any new client payload source");
assert.match(taskSource, /authorized-product-or-security-owner/i, "task.md records the approver role for the explicit source-surfacing approval evidence");
assert.match(taskSource, /new-client-payload-credentialReferenceId-source/i, "task.md records the approved target source");
assert.match(taskSource, /readiness-only/i, "task.md records the explicit approval evidence as readiness-only");
assert.match(taskSource, /source-surfacing approval evidence collection/i, "task.md records the PR #316 source-surfacing approval evidence collection result");
assert.match(taskSource, /source-surfacing approval evidence readiness/i, "task.md records the PR #317 source-surfacing approval evidence readiness result");
assert.match(taskSource, /source decision/i, "task.md records the current source decision result");
assert.match(taskSource, /blocker summary/i, "task.md records the blocker summary result");
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
  "lib/comment-translator-youtube-credential-status-ui-wiring.ts",
  "lib/comment-translator-youtube-oauth-token-store-foundation.ts",
  "lib/comment-translator-youtube-token-store-supabase-adapter.ts",
  "scripts/comment-translator-youtube-credential-source-decision-contract.mjs",
  "scripts/comment-translator-youtube-credential-reference-surface-source-recheck-contract.mjs",
  "scripts/comment-translator-youtube-credential-reference-surface-approval-evidence-contract.mjs",
  "scripts/comment-translator-youtube-surfaced-credential-reference-source-gate-contract.mjs",
  "scripts/comment-translator-youtube-client-safe-credential-reference-source-contract.mjs",
  "scripts/comment-translator-youtube-new-client-payload-credential-reference-source-contract.mjs",
  "scripts/comment-translator-youtube-credential-status-display-readiness-after-payload-source-contract.mjs",
  "scripts/comment-translator-youtube-credential-status-ui-wiring-contract.mjs",
  "scripts/comment-translator-youtube-token-store-supabase-adapter-status-contract.mjs",
  "scripts/comment-translator-youtube-token-store-service-role-smoke-readiness-contract.mjs",
  "scripts/comment-translator-youtube-token-store-remote-apply-run-contract.mjs",
  "scripts/comment-translator-youtube-token-store-approved-migration-proposal-contract.mjs",
  "scripts/comment-translator-youtube-token-store-blocker-resolution-contract.mjs",
  "scripts/comment-translator-youtube-token-store-explicit-approval-collection-contract.mjs",
  "scripts/comment-translator-youtube-token-store-schema-key-approval-contract.mjs",
  "scripts/comment-translator-youtube-token-store-separate-approved-migration-pr-contract.mjs",
  "scripts/comment-translator-youtube-token-store-separate-migration-readiness-contract.mjs",
  "scripts/comment-translator-provider-boundary-contract.mjs",
  "scripts/comment-translator-manual-input-mvp-contract.mjs",
  "scripts/comment-translator-interactive-shell-contract.mjs",
  "scripts/comment-translator-mock-foundation-contract.mjs",
  "docs/archive/TASK_HISTORY_2026-06.md",
  "docs/future/COMMENT_TRANSLATOR_YOUTUBE_TOKEN_STORE_BLOCKER_RESOLUTION.md",
  taskPath
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `source decision change stays in allowed files: ${file}`);

  const source = read(file);
  assert.doesNotMatch(
    source,
    /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY/i,
    `${file} does not contain OAuth token values, authorization codes, private keys, or service role key values`
  );
}

console.log("comment translator YouTube credential source decision contract checks passed");
