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
const readinessContractPath =
  "scripts/comment-translator-youtube-token-store-separate-migration-readiness-contract.mjs";

assert.ok(exists(foundationPath), "YouTube OAuth token store foundation remains available");
assert.ok(exists(blockerMemoPath), "YouTube encrypted token store blocker resolution memo exists");

const foundationSource = read(foundationPath);
const blockerMemo = read(blockerMemoPath);
const taskSource = read(taskPath);
const componentSource = read("components/comment-translator/CommentTranslatorDock.tsx");
const routeSource = read("app/tools/comment-translator/page.tsx");
const providerBoundarySource = read("lib/comment-translator-provider-boundary.ts");
const deeplProviderSource = read("lib/comment-translator-deepl-provider.ts");

assert.match(foundationSource, /^import "server-only";/m, "separate migration readiness stays server-only");

for (const exportedType of [
  "YouTubeEncryptedTokenStoreSeparateMigrationReadiness",
  "YouTubeEncryptedTokenStoreSeparateMigrationReadinessResult",
  "YouTubeEncryptedTokenStoreMissingApprovalScopeItem"
]) {
  assert.match(foundationSource, new RegExp(`export type ${exportedType}\\b`), `exports ${exportedType}`);
}

for (const exportedConstOrFunction of [
  "youtubeEncryptedTokenStoreSeparateMigrationReadiness",
  "assessYouTubeEncryptedTokenStoreSeparateMigrationReadiness",
  "createYouTubeEncryptedTokenStoreSeparateMigrationReadinessSummary"
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
const readiness = foundation.youtubeEncryptedTokenStoreSeparateMigrationReadiness;

assert.equal(readiness.implementationStage, "separate-approved-migration-readiness", "readiness stage is explicit");
assert.equal(readiness.prerequisitePullRequest, "#275", "readiness records PR #275 prerequisite");
assert.equal(readiness.prerequisiteMergeStatus, "merged-into-codex-comment-translator-preview", "PR #275 is merged");
assert.equal(readiness.approvalEvidenceSource, "task-docs-pr-context", "readiness uses reviewable task/docs/PR evidence");
assert.equal(readiness.approvalScope, "readiness-pr-only", "approval is scoped to readiness, not migration execution");
assert.equal(
  readiness.currentApprovalState,
  "readiness-approved-not-migration-implementation",
  "approval unlocks readiness only"
);
assert.equal(readiness.separateMigrationPrRequired, true, "actual migration remains separate");
assert.equal(readiness.finalMigrationImplementationApprovalRequired, true, "final migration still requires review");
assert.equal(readiness.migrationImplementationAllowedInThisPr, false, "migration implementation is forbidden here");
assert.equal(readiness.tokenPersistence, "still-blocked", "token persistence remains blocked");
assert.equal(readiness.schemaMutation, "forbidden-in-this-slice", "schema mutation remains forbidden");
assert.equal(readiness.rlsMutation, "forbidden-in-this-slice", "RLS mutation remains forbidden");
assert.equal(readiness.storageKeyMutation, "forbidden-in-this-slice", "storage key mutation remains forbidden");
assert.equal(readiness.clientStorage, "forbidden", "browser storage remains forbidden");
assert.equal(readiness.providerCoupling, "forbidden-direct-import-or-call", "provider coupling remains forbidden");
assert.equal(readiness.quotaWrite, "not-implemented", "quota write remains unimplemented");

assert.deepEqual(
  readiness.collectedApprovalEvidence.map((evidence) => evidence.role),
  ["Product owner", "Data owner", "Security owner"],
  "readiness records all three approval roles"
);
assert.ok(
  readiness.collectedApprovalEvidence.every((evidence) => evidence.approved),
  "readiness approval evidence is explicit"
);

for (const fragment of [
  "table shape",
  "RLS posture",
  "migration order",
  "rollback",
  "browser-unreadable token material",
  "managed secret or KMS",
  "rotation",
  "emergency disable",
  "no client decrypt"
]) {
  assert.match(JSON.stringify(readiness.collectedApprovalEvidence), new RegExp(fragment, "i"), `approval evidence covers ${fragment}`);
}

for (const fragment of [
  "approval evidence is sufficient to draft a separate migration readiness PR",
  "actual Supabase migration and RLS implementation stay out of this PR",
  "final table and RLS implementation review is still required"
]) {
  assert.match(readiness.readinessNote.join("\n"), new RegExp(fragment, "i"), `readiness note records: ${fragment}`);
}

for (const fragment of [
  "disable credential resolution before rollback if token resolution is deployed",
  "reviewed database rollback path",
  "no token value logging",
  "revoke or invalidate credential references"
]) {
  assert.match(JSON.stringify(readiness.rollbackReviewGate), new RegExp(fragment, "i"), `rollback gate records: ${fragment}`);
}

assert.equal(
  readiness.rollbackReviewGate.status,
  "review-required-before-migration-implementation",
  "rollback gate does not silently approve implementation"
);
assert.equal(
  readiness.safeLiveSmoke.status,
  "not-run-until-safe-live-smoke-conditions",
  "safe live smoke remains gated"
);

const blockedResult = foundation.assessYouTubeEncryptedTokenStoreSeparateMigrationReadiness([]);
assert.deepEqual(
  blockedResult,
  {
    status: "blocked-missing-readiness-approval-evidence",
    missingApprovalRoles: ["Product owner", "Data owner", "Security owner"],
    missingScopeItems: [],
    migrationReadiness: "blocked",
    migrationImplementationAllowedInThisPr: false,
    nextAction: "collect-readiness-approval-evidence"
  },
  "readiness blocks without explicit owner approval evidence"
);

const missingScopeResult = foundation.assessYouTubeEncryptedTokenStoreSeparateMigrationReadiness([
  { role: "Product owner", approved: true, scope: "table shape" },
  { role: "Data owner", approved: true, scope: "browser-unreadable token material" },
  { role: "Security owner", approved: true, scope: "managed secret or KMS" }
]);
assert.equal(missingScopeResult.status, "blocked-missing-readiness-approval-evidence", "incomplete scope still blocks");
assert.ok(missingScopeResult.missingScopeItems.length > 0, "incomplete approvals report missing scope items");

const readyResult = foundation.assessYouTubeEncryptedTokenStoreSeparateMigrationReadiness(readiness.collectedApprovalEvidence);
assert.deepEqual(
  readyResult,
  {
    status: "readiness-ready-for-separate-approved-migration-pr",
    approvedRoles: ["Product owner", "Data owner", "Security owner"],
    missingScopeItems: [],
    migrationReadiness: "ready-for-separate-approved-migration-pr",
    migrationImplementationAllowedInThisPr: false,
    finalMigrationImplementationApprovalRequired: true,
    nextAction: "draft-separate-approved-migration-pr-readiness-note"
  },
  "complete readiness approvals only allow a separate migration readiness PR"
);

const summary = foundation.createYouTubeEncryptedTokenStoreSeparateMigrationReadinessSummary();
for (const fragment of [
  "readiness-approved-not-migration-implementation",
  "Product owner",
  "Data owner",
  "Security owner",
  "ready-for-separate-approved-migration-pr",
  "safe live smoke",
  "actual migration remains separate"
]) {
  assert.match(summary, new RegExp(fragment, "i"), `summary includes ${fragment}`);
}

for (const docFragment of [
  "Separate Approved Migration Readiness",
  "PR #275",
  "readiness-approved-not-migration-implementation",
  "Product owner",
  "Data owner",
  "Security owner",
  "Rollback Review Gate",
  "Safe Live Smoke Gate",
  "No Supabase schema",
  "No migration",
  "No RLS policy",
  "No token persistence"
]) {
  assert.match(blockerMemo, new RegExp(docFragment, "i"), `blocker memo records separate migration readiness: ${docFragment}`);
}

assert.match(taskSource, /PR #275 .*merged|PR #275 .*merge/i, "task.md records the PR #275 merge gate");
assert.match(
  taskSource,
  /readiness-approved-not-migration-implementation|separate approved migration readiness/i,
  "task.md records the separate migration readiness slice"
);
assert.match(
  taskSource,
  /Product owner .* Data owner .* Security owner .*明示承認.*揃|readiness-approved-not-migration-implementation/i,
  "task.md records explicit readiness approvals"
);
assert.match(
  taskSource,
  /safe live Google API smoke.*未実施|safe live YouTube login \/ OAuth \/ owner verification \/ Live Chat polling smoke は未実施/i,
  "task.md records live smoke unchecked scope"
);
assert.match(taskSource, /UI変更なし|UI change was not made/i, "task.md records no UI width check requirement");

const allowedChangedFiles = new Set([
  foundationPath,
  "lib/comment-translator-youtube-token-store-runtime.ts",
  "supabase/migrations/20260601000000_youtube_oauth_credentials.sql",
  blockerMemoPath,
  "scripts/comment-translator-youtube-token-store-blocker-resolution-contract.mjs",
  "scripts/comment-translator-youtube-token-store-schema-key-approval-contract.mjs",
  "scripts/comment-translator-youtube-token-store-approved-migration-proposal-contract.mjs",
  "scripts/comment-translator-youtube-token-store-explicit-approval-collection-contract.mjs",
  readinessContractPath,
  "scripts/comment-translator-youtube-token-store-separate-approved-migration-pr-contract.mjs",
  "scripts/comment-translator-youtube-oauth-token-store-foundation-contract.mjs",
  "scripts/comment-translator-youtube-api-adapter-token-reference-contract.mjs",
  "scripts/comment-translator-youtube-runtime-foundation-contract.mjs",
  "scripts/comment-translator-youtube-input-boundary-contract.mjs",
  "scripts/comment-translator-server-provider-prototype-contract.mjs",
  "scripts/comment-translator-provider-boundary-contract.mjs",
  taskPath
]);

const separateImplementationFiles = new Set([
  "lib/comment-translator-youtube-token-store-runtime.ts",
  "supabase/migrations/20260601000000_youtube_oauth_credentials.sql"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `separate migration readiness change stays in allowed files: ${file}`);
  if (!separateImplementationFiles.has(file)) {
    assert.ok(!file.startsWith("supabase/"), `separate migration readiness does not touch Supabase schema files: ${file}`);
    assert.ok(!file.endsWith(".sql"), `separate migration readiness does not add migrations: ${file}`);
  }

  if (!file.endsWith(".mjs")) {
    const source = read(file);
    assert.doesNotMatch(
      source,
      /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]/i,
      `${file} does not contain token or privileged server key material`
    );
  }
}

console.log("comment translator YouTube token store separate migration readiness contract checks passed");
