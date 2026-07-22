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
    const committedDiff = execSync("git diff --name-only archive/comment-translator-preview-2026-07-21...HEAD", {
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

assert.match(foundationSource, /^import "server-only";/m, "approved migration proposal gate stays server-only");

for (const exportedType of [
  "YouTubeEncryptedTokenStoreApprovalRole",
  "YouTubeEncryptedTokenStoreApprovalEvidence",
  "YouTubeEncryptedTokenStoreApprovedMigrationProposalGate",
  "YouTubeEncryptedTokenStoreApprovedMigrationProposalGateResult"
]) {
  assert.match(foundationSource, new RegExp(`export type ${exportedType}\\b`), `exports ${exportedType}`);
}

for (const exportedConstOrFunction of [
  "youtubeEncryptedTokenStoreApprovedMigrationProposalGate",
  "assessYouTubeEncryptedTokenStoreApprovedMigrationProposalGate",
  "createYouTubeEncryptedTokenStoreApprovalCollectionNote"
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
const gate = foundation.youtubeEncryptedTokenStoreApprovedMigrationProposalGate;

assert.equal(gate.implementationStage, "approved-migration-proposal-gate", "gate stage is explicit");
assert.equal(gate.prerequisitePullRequest, "#273", "gate records the prerequisite PR");
assert.equal(gate.prerequisiteMergeStatus, "merged-into-codex-comment-translator-preview", "PR #273 is merged");
assert.equal(gate.currentApprovalState, "blocked-missing-explicit-owner-approvals", "gate blocks on missing approvals");
assert.deepEqual(gate.requiredApprovalRoles, ["Product owner", "Data owner", "Security owner"], "gate requires owner approvals");
assert.deepEqual(gate.missingApprovalRoles, ["Product owner", "Data owner", "Security owner"], "current context has no explicit owner approvals");
assert.equal(gate.migrationImplementationAllowedInThisPr, false, "migration implementation is not allowed in this PR");
assert.equal(gate.separateMigrationPrRequired, true, "migration still needs a separate PR");
assert.equal(gate.proposalOnlyWhenApprovalMissing, true, "missing approval keeps work proposal-only");
assert.equal(gate.tokenPersistence, "still-blocked", "token persistence remains blocked");
assert.equal(gate.schemaMutation, "forbidden-in-this-slice", "schema mutation remains forbidden");
assert.equal(gate.rlsMutation, "forbidden-in-this-slice", "RLS mutation remains forbidden");
assert.equal(gate.safeLiveSmoke.status, "not-run-until-safe-live-smoke-conditions", "safe live smoke remains gated");

for (const fragment of [
  "Product owner approval for table shape, RLS posture, migration order, and rollback",
  "Data owner approval for browser-unreadable token material and rollback",
  "Security owner approval for managed secret or KMS selection, rotation, emergency disable, and no client decrypt"
]) {
  assert.match(gate.approvalCollectionNote.join("\n"), new RegExp(fragment, "i"), `approval collection note records: ${fragment}`);
}

for (const fragment of [
  "server-owned YouTube credential table",
  "RLS posture",
  "migration rollout order",
  "rollback path",
  "managed secret or KMS",
  "rotation",
  "emergency disable",
  "no client decrypt"
]) {
  assert.match(JSON.stringify(gate.requiredConfirmationItems), new RegExp(fragment, "i"), `gate records confirmation item: ${fragment}`);
}

for (const fragment of [
  "separate migration PR",
  "codex/comment-translator-preview",
  "independent review",
  "no OAuth token values or private credentials",
  "rollback plan",
  "Google API live smoke remains separate"
]) {
  assert.match(gate.migrationProposalConditions.join("\n"), new RegExp(fragment, "i"), `migration proposal condition is explicit: ${fragment}`);
}

for (const fragment of [
  "disable credential resolution",
  "revert migration",
  "no token value logging",
  "revoke or invalidate credential references"
]) {
  assert.match(gate.rollbackPlan.join("\n"), new RegExp(fragment, "i"), `rollback plan records: ${fragment}`);
}

const blockedResult = foundation.assessYouTubeEncryptedTokenStoreApprovedMigrationProposalGate([]);
assert.deepEqual(
  blockedResult,
  {
    status: "blocked-missing-explicit-owner-approvals",
    missingApprovalRoles: ["Product owner", "Data owner", "Security owner"],
    proposalOnly: true,
    migrationImplementationAllowedInThisPr: false,
    nextAction: "collect-explicit-owner-approvals"
  },
  "gate blocks when explicit owner approvals are missing"
);

const readyResult = foundation.assessYouTubeEncryptedTokenStoreApprovedMigrationProposalGate([
  { role: "Product owner", approved: true, scope: "table-shape-rls-migration-rollback" },
  { role: "Data owner", approved: true, scope: "browser-unreadable-token-material-and-data-rollback" },
  { role: "Security owner", approved: true, scope: "managed-secret-or-kms-rotation-emergency-disable-no-client-decrypt" }
]);
assert.deepEqual(
  readyResult,
  {
    status: "proposal-ready-for-separate-migration-pr",
    approvedRoles: ["Product owner", "Data owner", "Security owner"],
    proposalOnly: true,
    migrationImplementationAllowedInThisPr: false,
    nextAction: "draft-separate-approved-migration-pr"
  },
  "explicit approvals only allow a separate migration proposal PR"
);

const note = foundation.createYouTubeEncryptedTokenStoreApprovalCollectionNote();
for (const fragment of [
  "Product owner",
  "Data owner",
  "Security owner",
  "table shape",
  "RLS posture",
  "rollback",
  "managed secret or KMS",
  "no client decrypt",
  "proposal-only"
]) {
  assert.match(note, new RegExp(fragment, "i"), `approval collection note includes ${fragment}`);
}

for (const docFragment of [
  "Approved Migration Proposal Gate",
  "PR #273",
  "blocked-missing-explicit-owner-approvals",
  "Product owner",
  "Data owner",
  "Security owner",
  "Approval Collection Note",
  "Rollback Plan",
  "No Supabase schema",
  "No migration",
  "No RLS policy",
  "No token persistence",
  "not run in this slice"
]) {
  assert.match(blockerMemo, new RegExp(docFragment, "i"), `blocker memo records approved migration proposal gate: ${docFragment}`);
}

assert.match(taskSource, /PR #273 .*merged|PR #273 .*merge/i, "task.md records the PR #273 merge gate");
assert.match(
  taskSource,
  /Product owner .* Data owner .* Security owner .*明示承認.*ない|blocked-missing-explicit-owner-approvals/i,
  "task.md records missing explicit owner approvals"
);
assert.match(
  taskSource,
  /YouTube encrypted token store approved migration proposal/i,
  "task.md records the approved migration proposal slice"
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
  "scripts/comment-translator-youtube-new-client-payload-credential-reference-source-contract.mjs",
  "scripts/comment-translator-youtube-credential-status-display-readiness-after-payload-source-contract.mjs",
  "scripts/comment-translator-youtube-credential-source-decision-contract.mjs",
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
  "scripts/comment-translator-youtube-token-store-service-role-smoke-readiness-contract.mjs",
  "scripts/comment-translator-youtube-token-store-service-role-smoke-command.mjs",
  "scripts/comment-translator-youtube-token-store-remote-apply-run-contract.mjs",
  "scripts/comment-translator-youtube-oauth-token-store-foundation-contract.mjs",
  "scripts/comment-translator-youtube-api-adapter-token-reference-contract.mjs",
  "scripts/comment-translator-youtube-runtime-foundation-contract.mjs",
  "scripts/comment-translator-youtube-live-runtime-smoke-command-contract.mjs",
  "scripts/comment-translator-youtube-live-runtime-smoke-command.mjs",
  "scripts/comment-translator-youtube-input-boundary-contract.mjs",
  "scripts/comment-translator-server-provider-prototype-contract.mjs",
  "scripts/comment-translator-provider-boundary-contract.mjs",
  "docs/archive/TASK_HISTORY_2026-06.md",
  "lib/comment-translator-youtube-runtime-foundation.ts",

  taskPath
]);

const separateImplementationFiles = new Set([
  "lib/comment-translator-youtube-token-store-runtime.ts",
  "supabase/migrations/20260601000000_youtube_oauth_credentials.sql"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `approved migration proposal change stays in allowed files: ${file}`);
  if (!separateImplementationFiles.has(file)) {
    assert.ok(!file.startsWith("supabase/"), `approved migration proposal does not touch Supabase schema files: ${file}`);
    assert.ok(!file.endsWith(".sql"), `approved migration proposal does not add migrations: ${file}`);
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

console.log("comment translator YouTube token store approved migration proposal contract checks passed");
