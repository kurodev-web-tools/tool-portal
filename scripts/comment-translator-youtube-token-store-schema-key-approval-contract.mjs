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

assert.match(foundationSource, /^import "server-only";/m, "schema/key approval checkpoint stays server-only");

for (const exportedType of ["YouTubeEncryptedTokenStoreSchemaKeyApprovalCheckpoint"]) {
  assert.match(foundationSource, new RegExp(`export type ${exportedType}\\b`), `exports ${exportedType}`);
}

for (const exportedConstOrFunction of ["youtubeEncryptedTokenStoreSchemaKeyApprovalCheckpoint"]) {
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
const checkpoint = foundation.youtubeEncryptedTokenStoreSchemaKeyApprovalCheckpoint;

assert.equal(checkpoint.implementationStage, "schema-key-approval-checkpoint", "checkpoint stage is explicit");
assert.equal(checkpoint.status, "proposal-only-pending-explicit-approval", "checkpoint remains proposal-only");
assert.deepEqual(checkpoint.sourceDecisionIds, ["schema-approval", "key-management"], "checkpoint covers only schema/key blockers");
assert.equal(checkpoint.implementationAllowedInThisPr, false, "checkpoint does not allow implementation in this PR");
assert.equal(checkpoint.separateMigrationPrRequired, true, "schema/key approval requires a separate migration PR");
assert.equal(checkpoint.tokenPersistence, "still-blocked", "token persistence remains blocked");
assert.equal(checkpoint.schemaMutation, "forbidden-in-this-slice", "schema mutation remains forbidden");
assert.equal(checkpoint.rlsMutation, "forbidden-in-this-slice", "RLS mutation remains forbidden");
assert.equal(checkpoint.safeLiveSmoke.status, "not-run-until-safe-live-smoke-conditions", "safe live smoke is gated");

for (const approver of ["product owner", "data owner", "security owner"]) {
  assert.match(
    JSON.stringify(checkpoint.requiredApprovers),
    new RegExp(approver, "i"),
    `checkpoint names required approver: ${approver}`
  );
}

for (const fragment of [
  "server-owned YouTube credential table",
  "RLS posture",
  "migration rollout order",
  "rollback path",
  "managed secret or KMS owner",
  "rotation cadence",
  "emergency disable",
  "no client decrypt"
]) {
  assert.match(
    JSON.stringify(checkpoint.requiredConfirmationItems),
    new RegExp(fragment, "i"),
    `checkpoint records confirmation item: ${fragment}`
  );
}

for (const fragment of [
  "schema/RLS/table shape approval is missing",
  "managed secret or KMS owner and rotation policy are not approved",
  "safe live smoke owner/account/endpoints are not approved",
  "migration rollback or data-owner review is pending"
]) {
  assert.match(
    checkpoint.proposalOnlyConditions.join("\n"),
    new RegExp(fragment, "i"),
    `proposal-only condition is explicit: ${fragment}`
  );
}

for (const fragment of [
  "product and data-owner approve table shape",
  "security approves managed secret/KMS",
  "separate migration PR",
  "no OAuth token values or private credentials",
  "Google API live smoke remains separate"
]) {
  assert.match(
    checkpoint.approvedMigrationPrConditions.join("\n"),
    new RegExp(fragment, "i"),
    `approved migration PR condition is explicit: ${fragment}`
  );
}

for (const fragment of [
  "explicit user approval for a safe test YouTube owner account",
  "server-only token resolver",
  "read-only YouTube OAuth scope",
  "bounded calls to channels.list, liveBroadcasts.list, and one liveChatMessages.list step",
  "no OAuth token value in client components, fixtures, task docs, PR body, localStorage, or IndexedDB"
]) {
  assert.match(
    checkpoint.safeLiveSmoke.requiredConditions.join("\n"),
    new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
    `safe live smoke condition is explicit: ${fragment}`
  );
}

for (const fragment of [
  "No Supabase schema",
  "No migration",
  "No RLS policy",
  "No token persistence",
  "No localStorage",
  "No IndexedDB",
  "not run in this slice"
]) {
  assert.match(blockerMemo, new RegExp(fragment, "i"), `blocker memo keeps boundary: ${fragment}`);
}

for (const docFragment of [
  "Schema/Key Approval Checkpoint",
  "Approvers And Confirmation Items",
  "Proposal-Only Conditions",
  "Approved Migration PR Conditions",
  "Safe Live Smoke Gate",
  "Product owner",
  "Data owner",
  "Security owner"
]) {
  assert.match(blockerMemo, new RegExp(docFragment, "i"), `blocker memo records approval checkpoint: ${docFragment}`);
}

assert.match(taskSource, /PR #272 .*merged|PR #272 .*merge/i, "task.md records the PR #272 merge gate");
assert.match(
  taskSource,
  /YouTube encrypted token store schema\/key approval checkpoint/i,
  "task.md records the schema/key approval checkpoint slice"
);
assert.match(
  taskSource,
  /safe live Google API smoke.*未実施|safe live YouTube login \/ OAuth \/ owner verification \/ Live Chat polling smoke は未実施/i,
  "task.md records live smoke unchecked scope"
);

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
  "docs/archive/TASK_HISTORY_2026-06.md",
  taskPath
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `schema/key approval checkpoint change stays in allowed files: ${file}`);

  if (!file.endsWith(".mjs")) {
    const source = read(file);
    assert.doesNotMatch(
      source,
      /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]/i,
      `${file} does not contain token or privileged server key material`
    );
  }
}

console.log("comment translator YouTube token store schema/key approval checkpoint contract checks passed");
