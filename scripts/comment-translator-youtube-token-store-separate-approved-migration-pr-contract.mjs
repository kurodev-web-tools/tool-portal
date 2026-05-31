import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function changedFiles() {
  try {
    const committedDiff = execSync("git diff --name-only origin/codex/comment-translator-preview...HEAD", {
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

    return [...new Set([...committedDiff, ...untracked])].map((file) => file.replace(/\\/g, "/"));
  } catch {
    return [];
  }
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

const foundationPath = "lib/comment-translator-youtube-oauth-token-store-foundation.ts";
const blockerMemoPath = "docs/future/COMMENT_TRANSLATOR_YOUTUBE_TOKEN_STORE_BLOCKER_RESOLUTION.md";
const taskPath = "task.md";
const approvedMigrationPrContractPath =
  "scripts/comment-translator-youtube-token-store-separate-approved-migration-pr-contract.mjs";

assert.ok(exists(foundationPath), "YouTube OAuth token store foundation remains available");
assert.ok(exists(blockerMemoPath), "YouTube encrypted token store blocker resolution memo exists");

const foundationSource = read(foundationPath);
const blockerMemo = read(blockerMemoPath);
const taskSource = read(taskPath);
const componentSource = read("components/comment-translator/CommentTranslatorDock.tsx");
const routeSource = read("app/tools/comment-translator/page.tsx");
const providerBoundarySource = read("lib/comment-translator-provider-boundary.ts");
const deeplProviderSource = read("lib/comment-translator-deepl-provider.ts");

assert.match(foundationSource, /^import "server-only";/m, "approved migration PR review gate stays server-only");

for (const exportedType of [
  "YouTubeEncryptedTokenStoreSeparateApprovedMigrationPrReviewGate",
  "YouTubeEncryptedTokenStoreSeparateApprovedMigrationFinalReviewEvidence",
  "YouTubeEncryptedTokenStoreSeparateApprovedMigrationPrReviewResult"
]) {
  assert.match(foundationSource, new RegExp(`export type ${exportedType}\\b`), `exports ${exportedType}`);
}

for (const exportedConstOrFunction of [
  "youtubeEncryptedTokenStoreSeparateApprovedMigrationPrReviewGate",
  "assessYouTubeEncryptedTokenStoreSeparateApprovedMigrationPrReview",
  "createYouTubeEncryptedTokenStoreSeparateApprovedMigrationPrReviewSummary"
]) {
  assert.match(
    foundationSource,
    new RegExp(`export (?:const|function) ${exportedConstOrFunction}\\b`),
    `exports ${exportedConstOrFunction}`
  );
}

assert.doesNotMatch(
  `${componentSource}\n${routeSource}`,
  /comment-translator-youtube-oauth-token-store-foundation|comment-translator-youtube-api-adapter|comment-translator-youtube-runtime-foundation|youtube\.googleapis|OAuth2Client|GoogleAuth|refresh_token|access_token|localStorage|indexedDB/,
  "client component and route shell are not coupled to token store, Google API, or polling runtime"
);
assert.doesNotMatch(
  `${providerBoundarySource}\n${deeplProviderSource}`,
  /comment-translator-youtube-oauth-token-store-foundation|comment-translator-youtube-api-adapter|comment-translator-youtube-runtime-foundation/,
  "translation provider modules do not import YouTube token store or runtime modules"
);

const foundation = loadTsModule(foundationPath);
const gate = foundation.youtubeEncryptedTokenStoreSeparateApprovedMigrationPrReviewGate;

assert.equal(gate.implementationStage, "separate-approved-migration-pr-final-review-blocker", "gate stage is explicit");
assert.equal(gate.prerequisitePullRequest, "#276", "gate records PR #276 prerequisite");
assert.equal(gate.prerequisiteMergeStatus, "merged-into-codex-comment-translator-preview", "PR #276 is merged");
assert.equal(
  gate.sourceReadinessApprovalState,
  "readiness-approved-not-migration-implementation",
  "gate is sourced from readiness-only approval"
);
assert.equal(
  gate.finalReviewStatus,
  "blocked-pending-final-table-rls-key-management-review",
  "final implementation review remains blocked"
);
assert.equal(gate.contractOnlyInThisPr, true, "this PR remains contract/docs only");
assert.equal(gate.finalMigrationImplementationApprovalRequired, true, "final implementation approval is required");
assert.equal(gate.migrationImplementationAllowedInThisPr, false, "this PR cannot add migration implementation");
assert.equal(gate.schemaMutation, "forbidden-until-final-review", "schema mutation remains forbidden");
assert.equal(gate.rlsMutation, "forbidden-until-final-review", "RLS mutation remains forbidden");
assert.equal(gate.tokenPersistence, "still-blocked", "token persistence remains blocked");
assert.equal(gate.clientStorage, "forbidden", "browser storage remains forbidden");
assert.equal(gate.providerCoupling, "forbidden-direct-import-or-call", "provider coupling remains forbidden");
assert.equal(gate.quotaWrite, "not-implemented", "quota write remains out of scope");

for (const fragment of [
  "youtube_oauth_credentials",
  "owner_user_id",
  "credential_reference_id",
  "provider_channel_id",
  "read-only YouTube OAuth scope",
  "encrypted access token ciphertext reference",
  "encrypted refresh token ciphertext reference",
  "key version",
  "revoked at",
  "no token values"
]) {
  assert.match(JSON.stringify(gate.tableShape), new RegExp(fragment, "i"), `table shape records ${fragment}`);
}

for (const fragment of [
  "RLS enabled before runtime use",
  "no browser client policy can read or write token material",
  "trusted server runtime only",
  "redacted browser state",
  "no client decrypt"
]) {
  assert.match(JSON.stringify(gate.rlsPosture), new RegExp(fragment, "i"), `RLS posture records ${fragment}`);
}

for (const fragment of [
  "create table after final review",
  "enable RLS before any token write",
  "add indexes for owner and credential reference lookup",
  "do not backfill live credentials",
  "no runtime token resolver write before key-management review"
]) {
  assert.match(JSON.stringify(gate.migrationOrder), new RegExp(fragment, "i"), `migration order records ${fragment}`);
}

for (const fragment of [
  "managed secret or KMS",
  "server-only envelope",
  "key version metadata",
  "rotation",
  "emergency disable",
  "no client decrypt"
]) {
  assert.match(JSON.stringify(gate.keyManagementReview), new RegExp(fragment, "i"), `key review records ${fragment}`);
}

for (const fragment of [
  "disable credential resolution",
  "reviewed database rollback path",
  "no token value logging",
  "revoke or invalidate credential references"
]) {
  assert.match(JSON.stringify(gate.rollbackReview), new RegExp(fragment, "i"), `rollback review records ${fragment}`);
}

assert.equal(gate.safeLiveSmoke.status, "not-run-until-safe-live-smoke-conditions", "safe live smoke remains gated");
assert.ok(gate.safeLiveSmoke.uncheckedScopeWhenNotRun.length > 0, "safe live smoke unchecked scope is explicit");

const blockedResult = foundation.assessYouTubeEncryptedTokenStoreSeparateApprovedMigrationPrReview([]);
assert.deepEqual(
  blockedResult,
  {
    status: "blocked-pending-final-review",
    missingReviewAreas: ["table-shape", "rls-posture", "key-management", "rollback"],
    contractOnly: true,
    migrationImplementationAllowedInThisPr: false,
    nextAction: "collect-final-table-rls-key-management-review"
  },
  "approved migration PR stays blocked without final review evidence"
);

const readyResult = foundation.assessYouTubeEncryptedTokenStoreSeparateApprovedMigrationPrReview([
  { area: "table-shape", approved: true, scope: "final table shape review" },
  { area: "rls-posture", approved: true, scope: "final RLS posture review" },
  { area: "key-management", approved: true, scope: "final managed secret or KMS key-management review" },
  { area: "rollback", approved: true, scope: "final rollback review" }
]);
assert.deepEqual(
  readyResult,
  {
    status: "final-review-ready-for-separate-implementation",
    approvedReviewAreas: ["table-shape", "rls-posture", "key-management", "rollback"],
    contractOnly: true,
    migrationImplementationAllowedInThisPr: false,
    nextAction: "request-explicit-implementation-approval-before-sql"
  },
  "final review evidence still does not allow SQL in this PR"
);

const summary = foundation.createYouTubeEncryptedTokenStoreSeparateApprovedMigrationPrReviewSummary();
for (const fragment of [
  "blocked-pending-final-table-rls-key-management-review",
  "youtube_oauth_credentials",
  "RLS",
  "managed secret or KMS",
  "rollback",
  "contract-only",
  "migration implementation remains blocked"
]) {
  assert.match(summary, new RegExp(fragment, "i"), `summary includes ${fragment}`);
}

for (const docFragment of [
  "Separate Approved Migration PR Final Review Blocker",
  "PR #276",
  "final-table-rls-key-management-review-required",
  "youtube_oauth_credentials",
  "RLS enabled before runtime use",
  "managed secret or KMS",
  "Rotation",
  "Emergency disable",
  "No client decrypt",
  "Rollback review",
  "No Supabase migration",
  "No RLS policy",
  "No token persistence"
]) {
  assert.match(blockerMemo, new RegExp(docFragment, "i"), `blocker memo records approved migration PR final blocker: ${docFragment}`);
}

assert.match(taskSource, /PR #276 .*merged|PR #276 .*merge/i, "task.md records the PR #276 merge gate");
assert.match(
  taskSource,
  /Cloudflare Pages.*PR #275.*Workers|PR #275.*Cloudflare Pages.*Workers/i,
  "task.md records the PR #276 Pages failure compared with PR #275 Workers pass history"
);
assert.match(
  taskSource,
  /final table\/RLS\/key-management review.*未承認|blocked-pending-final-table-rls-key-management-review/i,
  "task.md records missing final table/RLS/key-management implementation approval"
);
assert.match(
  taskSource,
  /UI変更なし|UI change was not made/i,
  "task.md records no UI width check requirement"
);

const allowedChangedFiles = new Set([
  foundationPath,
  blockerMemoPath,
  "scripts/comment-translator-youtube-token-store-blocker-resolution-contract.mjs",
  "scripts/comment-translator-youtube-token-store-schema-key-approval-contract.mjs",
  "scripts/comment-translator-youtube-token-store-approved-migration-proposal-contract.mjs",
  "scripts/comment-translator-youtube-token-store-explicit-approval-collection-contract.mjs",
  "scripts/comment-translator-youtube-token-store-separate-migration-readiness-contract.mjs",
  approvedMigrationPrContractPath,
  taskPath
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `approved migration PR review change stays in allowed files: ${file}`);
  assert.ok(!file.startsWith("supabase/"), `approved migration PR review does not touch Supabase schema files: ${file}`);
  assert.ok(!file.endsWith(".sql"), `approved migration PR review does not add migrations: ${file}`);

  if (!file.endsWith(".mjs")) {
    const source = read(file);
    assert.doesNotMatch(
      source,
      /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]/i,
      `${file} does not contain token or privileged server key material`
    );
  }
}

console.log("comment translator YouTube token store separate approved migration PR contract checks passed");
