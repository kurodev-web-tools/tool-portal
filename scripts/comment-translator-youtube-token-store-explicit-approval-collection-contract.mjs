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

assert.ok(exists(foundationPath), "YouTube OAuth token store foundation remains available");
assert.ok(exists(blockerMemoPath), "YouTube encrypted token store blocker resolution memo exists");

const foundationSource = read(foundationPath);
const blockerMemo = read(blockerMemoPath);
const taskSource = read(taskPath);
const componentSource = read("components/comment-translator/CommentTranslatorDock.tsx");
const routeSource = read("app/tools/comment-translator/page.tsx");
const providerBoundarySource = read("lib/comment-translator-provider-boundary.ts");
const deeplProviderSource = read("lib/comment-translator-deepl-provider.ts");

assert.match(foundationSource, /^import "server-only";/m, "explicit approval collection stays server-only");

for (const exportedType of [
  "YouTubeEncryptedTokenStoreExplicitApprovalCollection",
  "YouTubeEncryptedTokenStoreExplicitApprovalCollectionResult"
]) {
  assert.match(foundationSource, new RegExp(`export type ${exportedType}\\b`), `exports ${exportedType}`);
}

for (const exportedConstOrFunction of [
  "youtubeEncryptedTokenStoreExplicitApprovalCollection",
  "assessYouTubeEncryptedTokenStoreExplicitApprovalCollection",
  "createYouTubeEncryptedTokenStoreExplicitApprovalCollectionSummary"
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
const collection = foundation.youtubeEncryptedTokenStoreExplicitApprovalCollection;

assert.equal(collection.implementationStage, "explicit-approval-collection", "collection stage is explicit");
assert.equal(collection.prerequisitePullRequest, "#274", "collection records the prerequisite PR");
assert.equal(collection.prerequisiteMergeStatus, "merged-into-codex-comment-translator-preview", "PR #274 is merged");
assert.equal(
  collection.sourceApprovedMigrationProposalGateStatus,
  "blocked-missing-explicit-owner-approvals",
  "collection starts from the approved migration proposal gate blocker"
);
assert.equal(collection.approvalEvidenceSource, "task-docs-pr-context", "collection scopes evidence to reviewable text context");
assert.equal(collection.currentApprovalState, "blocked-missing-explicit-owner-approvals", "collection remains blocked");
assert.deepEqual(collection.requiredApprovalRoles, ["Product owner", "Data owner", "Security owner"]);
assert.deepEqual(collection.collectedApprovalEvidence, [], "current context does not manufacture approvals");
assert.deepEqual(collection.missingApprovalRoles, ["Product owner", "Data owner", "Security owner"]);
assert.equal(collection.approvalEvidenceOnlyInThisPr, true, "this PR only records approval evidence/readiness");
assert.equal(collection.separateMigrationPrRequired, true, "migration still needs a separate PR");
assert.equal(collection.migrationImplementationAllowedInThisPr, false, "migration implementation is not allowed here");
assert.equal(collection.migrationReadiness, "blocked-until-explicit-owner-approvals", "migration readiness stays blocked");
assert.equal(collection.tokenPersistence, "still-blocked", "token persistence remains blocked");
assert.equal(collection.schemaMutation, "forbidden-in-this-slice", "schema mutation remains forbidden");
assert.equal(collection.rlsMutation, "forbidden-in-this-slice", "RLS mutation remains forbidden");
assert.equal(collection.safeLiveSmoke.status, "not-run-until-safe-live-smoke-conditions", "safe live smoke remains gated");

for (const fragment of [
  "Product owner explicit approval is missing",
  "Data owner explicit approval is missing",
  "Security owner explicit approval is missing",
  "migration readiness remains blocked"
]) {
  assert.match(collection.blockerSummary.join("\n"), new RegExp(fragment, "i"), `blocker summary records: ${fragment}`);
}

for (const fragment of [
  "table shape",
  "RLS posture",
  "migration order",
  "rollback",
  "browser-unreadable token material",
  "retention",
  "audit",
  "managed secret or KMS",
  "rotation",
  "emergency disable",
  "no client decrypt"
]) {
  assert.match(
    JSON.stringify({
      requiredConfirmationItems: collection.requiredConfirmationItems,
      ownerConfirmationQuestions: collection.ownerConfirmationQuestions
    }),
    new RegExp(fragment, "i"),
    `collection records confirmation item: ${fragment}`
  );
}

for (const fragment of [
  "no OAuth token persistence",
  "no Supabase schema, migration, or RLS policy change",
  "no client component Google API, provider, or polling runtime call",
  "no storage key, payload, IndexedDB, localStorage, handoff payload, or quota write change"
]) {
  assert.match(collection.boundaries.join("\n"), new RegExp(fragment, "i"), `collection boundary is explicit: ${fragment}`);
}

const blockedResult = foundation.assessYouTubeEncryptedTokenStoreExplicitApprovalCollection([]);
assert.deepEqual(
  blockedResult,
  {
    status: "blocked-missing-explicit-owner-approvals",
    missingApprovalRoles: ["Product owner", "Data owner", "Security owner"],
    approvalEvidenceOnlyInThisPr: true,
    migrationImplementationAllowedInThisPr: false,
    migrationReadiness: "blocked",
    nextAction: "collect-explicit-owner-approvals"
  },
  "collection blocks when explicit owner approvals are missing"
);

const partialResult = foundation.assessYouTubeEncryptedTokenStoreExplicitApprovalCollection([
  { role: "Product owner", approved: true, scope: "table-shape-rls-migration-rollback" }
]);
assert.deepEqual(partialResult.missingApprovalRoles, ["Data owner", "Security owner"], "partial approval still blocks");
assert.equal(partialResult.migrationReadiness, "blocked", "partial approval does not unlock migration readiness");

const readyResult = foundation.assessYouTubeEncryptedTokenStoreExplicitApprovalCollection([
  { role: "Product owner", approved: true, scope: "table-shape-rls-migration-rollback" },
  { role: "Data owner", approved: true, scope: "browser-unreadable-token-material-retention-audit-rollback" },
  { role: "Security owner", approved: true, scope: "managed-secret-or-kms-rotation-emergency-disable-no-client-decrypt" }
]);
assert.deepEqual(
  readyResult,
  {
    status: "approval-evidence-ready-for-separate-migration-pr",
    approvedRoles: ["Product owner", "Data owner", "Security owner"],
    approvalEvidenceOnlyInThisPr: true,
    migrationImplementationAllowedInThisPr: false,
    migrationReadiness: "ready-for-separate-approved-migration-pr",
    nextAction: "draft-separate-approved-migration-pr"
  },
  "complete explicit approvals only allow a separate migration PR"
);

const summary = foundation.createYouTubeEncryptedTokenStoreExplicitApprovalCollectionSummary();
for (const fragment of [
  "blocked-missing-explicit-owner-approvals",
  "Product owner",
  "Data owner",
  "Security owner",
  "migration readiness remains blocked",
  "safe live smoke"
]) {
  assert.match(summary, new RegExp(fragment, "i"), `summary includes ${fragment}`);
}

for (const docFragment of [
  "Explicit Approval Collection",
  "PR #274",
  "blocked-missing-explicit-owner-approvals",
  "Product owner",
  "Data owner",
  "Security owner",
  "Evidence Inventory",
  "Required Confirmation Items",
  "Migration Readiness",
  "No Supabase schema",
  "No migration",
  "No RLS policy",
  "No token persistence",
  "Safe Live Smoke"
]) {
  assert.match(blockerMemo, new RegExp(docFragment, "i"), `blocker memo records explicit approval collection: ${docFragment}`);
}

assert.match(taskSource, /PR #274 .*merged|PR #274 .*merge/i, "task.md records the PR #274 merge gate");
assert.match(
  taskSource,
  /YouTube encrypted token store explicit approval collection/i,
  "task.md records the explicit approval collection slice"
);
assert.match(
  taskSource,
  /Product owner .* Data owner .* Security owner .*明示承認.*不足|blocked-missing-explicit-owner-approvals/i,
  "task.md records missing explicit owner approvals"
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
  "lib/comment-translator-youtube-token-store-supabase-adapter.ts",
  "lib/comment-translator-youtube-credential-status-boundary.ts",
  "lib/comment-translator-youtube-credential-status-ui-wiring.ts",
  "lib/comment-translator-youtube-client-safe-credential-reference-source.ts",
  "app/api/comment-translator/youtube/credential-status/route.ts",
  "app/tools/comment-translator/actions.ts",
  "supabase/migrations/20260601000000_youtube_oauth_credentials.sql",
  blockerMemoPath,
  "scripts/comment-translator-youtube-client-safe-credential-reference-source-contract.mjs",
  "scripts/comment-translator-youtube-credential-reference-surface-source-recheck-contract.mjs",
  "scripts/comment-translator-youtube-credential-reference-surface-approval-evidence-contract.mjs",
  "scripts/comment-translator-youtube-surfaced-credential-reference-source-gate-contract.mjs",
  "scripts/comment-translator-youtube-credential-status-ui-wiring-contract.mjs",
  "scripts/comment-translator-youtube-token-store-blocker-resolution-contract.mjs",
  "scripts/comment-translator-youtube-token-store-schema-key-approval-contract.mjs",
  "scripts/comment-translator-youtube-token-store-approved-migration-proposal-contract.mjs",
  "scripts/comment-translator-youtube-token-store-explicit-approval-collection-contract.mjs",
  "scripts/comment-translator-youtube-token-store-separate-migration-readiness-contract.mjs",
  "scripts/comment-translator-youtube-token-store-separate-approved-migration-pr-contract.mjs",
  "scripts/comment-translator-youtube-token-store-supabase-adapter-status-contract.mjs",
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
  assert.ok(allowedChangedFiles.has(file), `explicit approval collection change stays in allowed files: ${file}`);
  if (!separateImplementationFiles.has(file)) {
    assert.ok(!file.startsWith("supabase/"), `explicit approval collection does not touch Supabase schema files: ${file}`);
    assert.ok(!file.endsWith(".sql"), `explicit approval collection does not add migrations: ${file}`);
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

console.log("comment translator YouTube token store explicit approval collection contract checks passed");
