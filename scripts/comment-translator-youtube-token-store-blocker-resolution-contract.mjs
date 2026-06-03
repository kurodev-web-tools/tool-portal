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

assert.ok(exists(foundationPath), "YouTube OAuth token store foundation remains available");
assert.ok(exists(blockerMemoPath), "YouTube encrypted token store blocker resolution memo exists");

const foundationSource = read(foundationPath);
const blockerMemo = read(blockerMemoPath);
const taskSource = read("task.md");
const componentSource = read("components/comment-translator/CommentTranslatorDock.tsx");
const routeSource = read("app/tools/comment-translator/page.tsx");
const providerBoundarySource = read("lib/comment-translator-provider-boundary.ts");
const deeplProviderSource = read("lib/comment-translator-deepl-provider.ts");

assert.match(foundationSource, /^import "server-only";/m, "token store blocker resolution stays server-only");

for (const exportedType of [
  "YouTubeEncryptedTokenStoreBlockerResolutionDecision",
  "YouTubeEncryptedTokenStoreBlockerResolutionPlan",
  "YouTubeEncryptedTokenStoreImplementationReadiness"
]) {
  assert.match(foundationSource, new RegExp(`export type ${exportedType}\\b`), `exports ${exportedType}`);
}

for (const exportedConstOrFunction of [
  "youtubeEncryptedTokenStoreBlockerResolutionDecisions",
  "youtubeEncryptedTokenStoreBlockerResolutionPlan",
  "createYouTubeEncryptedTokenStoreBlockerResolutionMemo",
  "assessYouTubeEncryptedTokenStoreImplementationReadiness"
]) {
  assert.match(
    foundationSource,
    new RegExp(`export (?:const|function) ${exportedConstOrFunction}\\b`),
    `exports ${exportedConstOrFunction}`
  );
}

for (const pattern of [
  /\bfetch\s*\(/,
  /XMLHttpRequest/,
  /EventSource/,
  /WebSocket/,
  /youtube\.googleapis|OAuth2Client|GoogleAuth|from\s+["']googleapis["']|require\(["']googleapis["']\)/,
  /process\.env/,
  /localStorage\./,
  /indexedDB\./,
  /createClient/,
  /from\(["']usage_quotas["']\)/,
  /insert\s*\(/,
  /upsert\s*\(/,
  /update\s*\(/,
  /stripe|checkout|gtag|GA4|cookie consent/i
]) {
  assert.doesNotMatch(foundationSource, pattern, `blocker resolution avoids out-of-scope integration: ${pattern}`);
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

const blockerIds = foundation.youtubeEncryptedTokenStoreImplementationBlockers.map((blocker) => blocker.id);
assert.deepEqual(
  foundation.youtubeEncryptedTokenStoreBlockerResolutionDecisions.map((decision) => decision.id),
  blockerIds,
  "blocker resolution decisions cover the foundation blocker list exactly"
);

assert.equal(
  foundation.youtubeEncryptedTokenStoreBlockerResolutionPlan.implementationStage,
  "blocker-resolution-plan-only",
  "blocker resolution is a plan-only stage"
);
assert.equal(
  foundation.youtubeEncryptedTokenStoreBlockerResolutionPlan.tokenPersistence,
  "blocked-until-approvals-and-separate-implementation",
  "token persistence remains blocked after this plan"
);
assert.equal(
  foundation.youtubeEncryptedTokenStoreBlockerResolutionPlan.schemaMutation,
  "forbidden-in-this-slice",
  "blocker resolution does not open schema mutation"
);
assert.equal(
  foundation.youtubeEncryptedTokenStoreBlockerResolutionPlan.rlsMutation,
  "forbidden-in-this-slice",
  "blocker resolution does not open RLS mutation"
);
assert.equal(
  foundation.youtubeEncryptedTokenStoreBlockerResolutionPlan.safeLiveSmoke.status,
  "not-run-in-this-slice",
  "safe live smoke remains not run"
);
assert.deepEqual(
  foundation.youtubeEncryptedTokenStoreBlockerResolutionPlan.sourceBlockerIds,
  blockerIds,
  "plan records blocker ids as source of truth"
);

for (const decision of foundation.youtubeEncryptedTokenStoreBlockerResolutionDecisions) {
  assert.equal(decision.implementationStage, "approval-required-before-implementation", `${decision.id} requires approval`);
  assert.equal(decision.implementationGate, "blocked-until-approved", `${decision.id} stays blocked until approved`);
  assert.equal(decision.separatePrRequired, true, `${decision.id} requires a separate implementation PR`);
  assert.ok(decision.decisionUnit.length > 20, `${decision.id} records a concrete decision unit`);
  assert.ok(decision.proposedResolution.length > 20, `${decision.id} records a proposed resolution`);
  assert.ok(decision.requiredApproval.length > 20, `${decision.id} records required approval`);
  assert.ok(
    decision.forbiddenInThisSlice.includes("token persistence implementation"),
    `${decision.id} keeps token persistence out of scope`
  );
  assert.ok(
    decision.forbiddenInThisSlice.includes("Supabase schema, migration, or RLS policy change"),
    `${decision.id} keeps schema and RLS changes out of scope`
  );
}

assert.match(
  foundation.youtubeEncryptedTokenStoreBlockerResolutionDecisions.find((decision) => decision.id === "schema-approval")
    .proposedResolution,
  /proposal-only|separate approved migration/i,
  "schema approval is proposal-only and separate from this PR"
);
assert.match(
  foundation.youtubeEncryptedTokenStoreBlockerResolutionDecisions.find((decision) => decision.id === "key-management")
    .proposedResolution,
  /managed secret|KMS|rotation/i,
  "key management records managed secret or KMS rotation decision"
);
assert.match(
  foundation.youtubeEncryptedTokenStoreBlockerResolutionDecisions.find((decision) => decision.id === "token-refresh")
    .proposedResolution,
  /expiry|retry|backoff|expired/i,
  "token refresh records expiry and retry decisions"
);
assert.match(
  foundation.youtubeEncryptedTokenStoreBlockerResolutionDecisions.find((decision) => decision.id === "revocation")
    .proposedResolution,
  /disconnect|revoke|cleanup/i,
  "revocation records disconnect and cleanup decisions"
);
assert.match(
  foundation.youtubeEncryptedTokenStoreBlockerResolutionDecisions.find((decision) => decision.id === "audit-log")
    .proposedResolution,
  /event|token material|no token/i,
  "audit log records event-only logging without token material"
);
assert.match(
  foundation.youtubeEncryptedTokenStoreBlockerResolutionDecisions.find((decision) => decision.id === "retention-policy")
    .proposedResolution,
  /stale|account deletion|cleanup/i,
  "retention records stale cleanup and account deletion decisions"
);
assert.match(
  foundation.youtubeEncryptedTokenStoreBlockerResolutionDecisions.find((decision) => decision.id === "live-smoke-approval")
    .proposedResolution,
  /safe test YouTube owner account|channels\.list|liveBroadcasts\.list|liveChatMessages\.list/i,
  "safe live smoke approval records account and endpoint boundaries"
);

assert.deepEqual(
  foundation.assessYouTubeEncryptedTokenStoreImplementationReadiness([]),
  {
    status: "blocked",
    missingDecisionIds: blockerIds,
    requiredApprovals: foundation.youtubeEncryptedTokenStoreBlockerResolutionDecisions.map(
      (decision) => decision.requiredApproval
    ),
    tokenPersistence: "forbidden",
    schemaMutation: "forbidden-in-this-slice",
    liveSmoke: "not-run-in-this-slice"
  },
  "readiness is blocked when approvals are missing"
);
assert.deepEqual(
  foundation.assessYouTubeEncryptedTokenStoreImplementationReadiness(blockerIds),
  {
    status: "ready-for-separate-implementation-pr",
    approvedDecisionIds: blockerIds,
    tokenPersistence: "still-not-implemented-in-this-slice",
    schemaMutation: "still-forbidden-in-this-slice",
    liveSmoke: "still-not-run-in-this-slice"
  },
  "all approvals only allow a separate implementation PR"
);

const memo = foundation.createYouTubeEncryptedTokenStoreBlockerResolutionMemo();
for (const fragment of [
  "schema-approval",
  "key-management",
  "token-refresh",
  "revocation",
  "audit-log",
  "retention-policy",
  "live-smoke-approval",
  "blocked-until-approvals-and-separate-implementation"
]) {
  assert.match(memo, new RegExp(fragment, "i"), `memo records ${fragment}`);
}

for (const docFragment of [
  "blocker resolution",
  "schema approval",
  "key management",
  "token refresh",
  "revocation",
  "audit log",
  "retention policy",
  "safe live smoke approval",
  "proposal only",
  "No Supabase schema",
  "No migration",
  "No RLS policy",
  "No token persistence",
  "No localStorage",
  "No IndexedDB",
  "not run in this slice",
  "PR #271"
]) {
  assert.match(blockerMemo, new RegExp(docFragment, "i"), `blocker memo records: ${docFragment}`);
}

assert.match(taskSource, /PR #271 .*merged|PR #271 .*merge/i, "task.md records the PR #271 merge gate");
assert.match(
  taskSource,
  /YouTube encrypted token store implementation plan \/ blocker resolution/i,
  "task.md records the blocker resolution slice"
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
  "task.md"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `blocker resolution change stays in allowed files: ${file}`);

  if (!file.endsWith("comment-translator-youtube-token-store-blocker-resolution-contract.mjs")) {
    const source = read(file);
    assert.doesNotMatch(
      source,
      /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]/i,
      `${file} does not contain token or service role material`
    );
  }
}

console.log("comment translator YouTube token store blocker resolution contract checks passed");
