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
  "YouTubeEncryptedTokenStoreImplementationReadiness",
  "YouTubeEncryptedTokenStorePostCredentialStatusDisplayFinalApprovalRecheck",
  "YouTubeEncryptedTokenStorePostFinalApprovalRecheckEvidenceCollection",
  "YouTubeEncryptedTokenStoreFinalImplementationApprovalEvidenceGate",
  "YouTubeEncryptedTokenStorePostFinalImplementationApprovalEvidenceGateRecheck"
]) {
  assert.match(foundationSource, new RegExp(`export type ${exportedType}\\b`), `exports ${exportedType}`);
}

for (const exportedConstOrFunction of [
  "youtubeEncryptedTokenStoreBlockerResolutionDecisions",
  "youtubeEncryptedTokenStoreBlockerResolutionPlan",
  "youtubeEncryptedTokenStorePostCredentialStatusDisplayFinalApprovalRecheck",
  "youtubeEncryptedTokenStorePostFinalApprovalRecheckEvidenceCollection",
  "youtubeEncryptedTokenStoreFinalImplementationApprovalEvidenceGate",
  "youtubeEncryptedTokenStorePostFinalImplementationApprovalEvidenceGateRecheck",
  "createYouTubeEncryptedTokenStoreBlockerResolutionMemo",
  "createYouTubeEncryptedTokenStorePostFinalApprovalRecheckEvidenceSummary",
  "createYouTubeEncryptedTokenStoreFinalImplementationApprovalEvidenceSummary",
  "createYouTubeEncryptedTokenStorePostFinalImplementationApprovalEvidenceGateRecheckSummary",
  "assessYouTubeEncryptedTokenStoreImplementationReadiness",
  "assessYouTubeEncryptedTokenStorePostCredentialStatusDisplayFinalApprovalRecheck",
  "assessYouTubeEncryptedTokenStorePostFinalApprovalRecheckEvidenceCollection",
  "assessYouTubeEncryptedTokenStoreFinalImplementationApprovalEvidenceGate",
  "assessYouTubeEncryptedTokenStorePostFinalImplementationApprovalEvidenceGateRecheck"
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

assert.equal(
  foundation.youtubeEncryptedTokenStorePostCredentialStatusDisplayFinalApprovalRecheck.implementationStage,
  "post-credential-status-display-token-store-final-approval-recheck",
  "post-PR #322 recheck stage is explicit"
);
assert.equal(
  foundation.youtubeEncryptedTokenStorePostCredentialStatusDisplayFinalApprovalRecheck.prerequisitePullRequest,
  "#322",
  "post-PR #322 recheck records the credential status display wiring prerequisite"
);
assert.equal(
  foundation.youtubeEncryptedTokenStorePostCredentialStatusDisplayFinalApprovalRecheck.credentialStatusDisplayBoundary,
  "client-safe-sanitized-metadata-only",
  "post-PR #322 recheck preserves the credential status display boundary"
);
assert.equal(
  foundation.youtubeEncryptedTokenStorePostCredentialStatusDisplayFinalApprovalRecheck.remoteSupabaseApply,
  "forbidden-in-this-slice",
  "post-PR #322 recheck does not allow remote Supabase apply"
);
assert.equal(
  foundation.youtubeEncryptedTokenStorePostCredentialStatusDisplayFinalApprovalRecheck.serverOnlyTokenPersistenceRuntime,
  "blocked-beyond-existing-skeleton",
  "post-PR #322 recheck does not expand token persistence runtime"
);
assert.equal(
  foundation.youtubeEncryptedTokenStorePostCredentialStatusDisplayFinalApprovalRecheck.googleApiLiveSmoke,
  "forbidden-in-this-slice",
  "post-PR #322 recheck does not allow Google API live smoke"
);
assert.deepEqual(
  foundation.assessYouTubeEncryptedTokenStorePostCredentialStatusDisplayFinalApprovalRecheck([]),
  {
    status: "blocked-pending-final-review",
    missingReviewAreas: ["table-shape", "rls-posture", "key-management", "rollback"],
    explicitImplementationApproval: "not-evaluated-until-final-review-complete",
    remoteSupabaseApplyAllowedInThisPr: false,
    tokenPersistenceRuntimeAllowedInThisPr: false,
    googleApiLiveSmokeAllowedInThisPr: false,
    nextAction: "record-blocker-summary-and-collect-final-review-evidence"
  },
  "post-PR #322 recheck remains blocked when final review evidence is absent"
);
assert.deepEqual(
  foundation.assessYouTubeEncryptedTokenStorePostCredentialStatusDisplayFinalApprovalRecheck([
    { area: "table-shape", approved: true, scope: "final table shape" },
    { area: "rls-posture", approved: true, scope: "final RLS posture" },
    { area: "key-management", approved: true, scope: "key-management" },
    { area: "rollback", approved: true, scope: "rollback" }
  ]),
  {
    status: "blocked-pending-explicit-implementation-approval",
    approvedReviewAreas: ["table-shape", "rls-posture", "key-management", "rollback"],
    missingImplementationApproval: true,
    remoteSupabaseApplyAllowedInThisPr: false,
    tokenPersistenceRuntimeAllowedInThisPr: false,
    googleApiLiveSmokeAllowedInThisPr: false,
    nextAction: "collect-explicit-implementation-approval-before-separate-runtime-or-apply-pr"
  },
  "post-PR #322 recheck still blocks when explicit implementation approval is absent"
);

assert.equal(
  foundation.youtubeEncryptedTokenStorePostFinalApprovalRecheckEvidenceCollection.implementationStage,
  "post-final-approval-recheck-evidence-collection",
  "post-PR #323 evidence collection stage is explicit"
);
assert.equal(
  foundation.youtubeEncryptedTokenStorePostFinalApprovalRecheckEvidenceCollection.prerequisitePullRequest,
  "#323",
  "post-PR #323 evidence collection records the token-store final approval recheck prerequisite"
);
assert.equal(
  foundation.youtubeEncryptedTokenStorePostFinalApprovalRecheckEvidenceCollection.prerequisiteMergeCommit,
  "07b221999f302477645160278ae50f8ad3eb043c",
  "post-PR #323 evidence collection records the merge commit"
);
assert.equal(
  foundation.youtubeEncryptedTokenStorePostFinalApprovalRecheckEvidenceCollection.currentEvidenceStatus,
  "missing-final-review-and-explicit-implementation-approval",
  "post-PR #323 evidence collection records missing evidence"
);
assert.deepEqual(
  foundation.youtubeEncryptedTokenStorePostFinalApprovalRecheckEvidenceCollection.prContextChecks,
  {
    workersBuilds: "success",
    cloudflarePages: "failure-known-pages-disconnect-noise"
  },
  "post-PR #323 evidence collection records PR check disposition"
);
assert.deepEqual(
  foundation.assessYouTubeEncryptedTokenStorePostFinalApprovalRecheckEvidenceCollection([]),
  {
    status: "blocked-pending-final-review",
    missingReviewAreas: ["table-shape", "rls-posture", "key-management", "rollback"],
    explicitImplementationApproval: "not-evaluated-until-final-review-complete",
    remoteSupabaseApplyAllowedInThisPr: false,
    tokenPersistenceRuntimeAllowedInThisPr: false,
    googleApiLiveSmokeAllowedInThisPr: false,
    nextAction: "record-evidence-requirements-and-collect-final-review-evidence"
  },
  "post-PR #323 evidence collection remains blocked when evidence is absent"
);
assert.deepEqual(
  foundation.assessYouTubeEncryptedTokenStorePostFinalApprovalRecheckEvidenceCollection(
    [
      { area: "table-shape", approved: true, scope: "final table shape" },
      { area: "rls-posture", approved: true, scope: "final RLS posture" },
      { area: "key-management", approved: true, scope: "key-management" },
      { area: "rollback", approved: true, scope: "rollback" }
    ],
    { approved: true, scope: "separate implementation PR for runtime or apply after final review" }
  ),
  {
    status: "ready-for-separate-runtime-or-apply-pr",
    approvedReviewAreas: ["table-shape", "rls-posture", "key-management", "rollback"],
    implementationApprovalScope: "separate implementation PR for runtime or apply after final review",
    remoteSupabaseApplyAllowedInThisPr: false,
    tokenPersistenceRuntimeAllowedInThisPr: false,
    googleApiLiveSmokeAllowedInThisPr: false,
    nextAction: "open-small-separate-server-only-runtime-or-apply-pr"
  },
  "post-PR #323 evidence collection only records readiness for a separate PR when all evidence is approved"
);
assert.match(
  foundation.createYouTubeEncryptedTokenStorePostFinalApprovalRecheckEvidenceSummary(),
  /PR #323|blocked-pending-final-review|final table\/RLS\/key-management\/rollback|explicit implementation approval/i,
  "post-PR #323 evidence summary records blocker and required evidence"
);
assert.equal(
  foundation.youtubeEncryptedTokenStoreFinalImplementationApprovalEvidenceGate.implementationStage,
  "post-pr-324-final-implementation-approval-evidence-gate",
  "post-PR #324 final implementation approval evidence gate stage is explicit"
);
assert.equal(
  foundation.youtubeEncryptedTokenStoreFinalImplementationApprovalEvidenceGate.prerequisitePullRequest,
  "#324",
  "post-PR #324 final implementation approval evidence gate records the evidence collection prerequisite"
);
assert.equal(
  foundation.youtubeEncryptedTokenStoreFinalImplementationApprovalEvidenceGate.prerequisiteMergeCommit,
  "7fd49532509cf634e220145eb143469f9bd4e49b",
  "post-PR #324 final implementation approval evidence gate records the merge commit"
);
assert.equal(
  foundation.youtubeEncryptedTokenStoreFinalImplementationApprovalEvidenceGate.prerequisiteMergedAtUtc,
  "2026-06-04T10:57:23Z",
  "post-PR #324 final implementation approval evidence gate records the merge time"
);
assert.equal(
  foundation.youtubeEncryptedTokenStoreFinalImplementationApprovalEvidenceGate.currentEvidenceStatus,
  "missing-final-review-and-explicit-implementation-approval",
  "post-PR #324 final implementation approval evidence gate records missing evidence"
);
assert.deepEqual(
  foundation.youtubeEncryptedTokenStoreFinalImplementationApprovalEvidenceGate.prContextChecks,
  {
    workersBuilds: "success",
    cloudflarePages: "failure-known-pages-disconnect-noise"
  },
  "post-PR #324 final implementation approval evidence gate records PR check disposition"
);
assert.deepEqual(
  foundation.assessYouTubeEncryptedTokenStoreFinalImplementationApprovalEvidenceGate([]),
  {
    status: "blocked-pending-final-review",
    missingReviewAreas: ["table-shape", "rls-posture", "key-management", "rollback"],
    explicitImplementationApproval: "not-evaluated-until-final-review-complete",
    remoteSupabaseApplyAllowedInThisPr: false,
    tokenPersistenceRuntimeAllowedInThisPr: false,
    googleApiLiveSmokeAllowedInThisPr: false,
    nextAction: "record-blocker-summary-and-evidence-requirements"
  },
  "post-PR #324 final implementation approval evidence gate remains blocked when evidence is absent"
);
assert.deepEqual(
  foundation.assessYouTubeEncryptedTokenStoreFinalImplementationApprovalEvidenceGate(
    [
      { area: "table-shape", approved: true, scope: "final table shape" },
      { area: "rls-posture", approved: true, scope: "final RLS posture" },
      { area: "key-management", approved: true, scope: "key-management" },
      { area: "rollback", approved: true, scope: "rollback" }
    ],
    { approved: true, scope: "separate implementation PR for runtime or apply after final review" }
  ),
  {
    status: "ready-for-separate-runtime-or-apply-pr",
    approvedReviewAreas: ["table-shape", "rls-posture", "key-management", "rollback"],
    implementationApprovalScope: "separate implementation PR for runtime or apply after final review",
    remoteSupabaseApplyAllowedInThisPr: false,
    tokenPersistenceRuntimeAllowedInThisPr: false,
    googleApiLiveSmokeAllowedInThisPr: false,
    nextAction: "open-small-separate-server-only-runtime-or-apply-pr"
  },
  "post-PR #324 final implementation approval evidence gate only records readiness for a separate PR when all evidence is approved"
);
assert.match(
  foundation.createYouTubeEncryptedTokenStoreFinalImplementationApprovalEvidenceSummary(),
  /PR #324|blocked-pending-final-review|final table\/RLS\/key-management\/rollback|explicit implementation approval/i,
  "post-PR #324 evidence summary records blocker and required evidence"
);
assert.equal(
  foundation.youtubeEncryptedTokenStorePostFinalImplementationApprovalEvidenceGateRecheck.implementationStage,
  "post-pr-325-final-approval-evidence-recheck",
  "post-PR #325 final approval evidence recheck stage is explicit"
);
assert.equal(
  foundation.youtubeEncryptedTokenStorePostFinalImplementationApprovalEvidenceGateRecheck.prerequisitePullRequest,
  "#325",
  "post-PR #325 final approval evidence recheck records the final implementation approval evidence gate prerequisite"
);
assert.equal(
  foundation.youtubeEncryptedTokenStorePostFinalImplementationApprovalEvidenceGateRecheck.prerequisiteMergeCommit,
  "b97a39f3a32ecfef2024d2ceb3290aea35283ad5",
  "post-PR #325 final approval evidence recheck records the merge commit"
);
assert.equal(
  foundation.youtubeEncryptedTokenStorePostFinalImplementationApprovalEvidenceGateRecheck.prerequisiteMergedAtUtc,
  "2026-06-04T14:14:31Z",
  "post-PR #325 final approval evidence recheck records the merge time"
);
assert.equal(
  foundation.youtubeEncryptedTokenStorePostFinalImplementationApprovalEvidenceGateRecheck.currentEvidenceStatus,
  "missing-final-review-and-explicit-implementation-approval",
  "post-PR #325 final approval evidence recheck records missing evidence"
);
assert.deepEqual(
  foundation.youtubeEncryptedTokenStorePostFinalImplementationApprovalEvidenceGateRecheck.prContextChecks,
  {
    workersBuilds: "success",
    cloudflarePages: "failure-known-pages-disconnect-noise"
  },
  "post-PR #325 final approval evidence recheck records PR check disposition"
);
assert.deepEqual(
  foundation.assessYouTubeEncryptedTokenStorePostFinalImplementationApprovalEvidenceGateRecheck([]),
  {
    status: "blocked-pending-final-review",
    missingReviewAreas: ["table-shape", "rls-posture", "key-management", "rollback"],
    explicitImplementationApproval: "not-evaluated-until-final-review-complete",
    remoteSupabaseApplyAllowedInThisPr: false,
    tokenPersistenceRuntimeAllowedInThisPr: false,
    googleApiLiveSmokeAllowedInThisPr: false,
    nextAction: "record-blocker-summary-and-collect-final-review-evidence"
  },
  "post-PR #325 final approval evidence recheck remains blocked when evidence is absent"
);
assert.deepEqual(
  foundation.assessYouTubeEncryptedTokenStorePostFinalImplementationApprovalEvidenceGateRecheck(
    [
      { area: "table-shape", approved: true, scope: "final table shape" },
      { area: "rls-posture", approved: true, scope: "final RLS posture" },
      { area: "key-management", approved: true, scope: "key-management" },
      { area: "rollback", approved: true, scope: "rollback" }
    ],
    { approved: true, scope: "separate implementation PR for runtime or apply after final review" }
  ),
  {
    status: "ready-for-separate-runtime-or-apply-pr",
    approvedReviewAreas: ["table-shape", "rls-posture", "key-management", "rollback"],
    implementationApprovalScope: "separate implementation PR for runtime or apply after final review",
    remoteSupabaseApplyAllowedInThisPr: false,
    tokenPersistenceRuntimeAllowedInThisPr: false,
    googleApiLiveSmokeAllowedInThisPr: false,
    nextAction: "open-small-separate-server-only-runtime-or-apply-pr"
  },
  "post-PR #325 final approval evidence recheck only records readiness for a separate PR when all evidence is approved"
);
assert.match(
  foundation.createYouTubeEncryptedTokenStorePostFinalImplementationApprovalEvidenceGateRecheckSummary(),
  /PR #325|blocked-pending-final-review|final table\/RLS\/key-management\/rollback|explicit implementation approval/i,
  "post-PR #325 evidence recheck summary records blocker and required evidence"
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
  "PR #271",
  "PR #322",
  "post credential status display final approval recheck",
  "blocked-pending-final-review",
  "PR #323",
  "Post-PR #323 Approval Evidence Collection",
  "PR #324",
  "Post-PR #324 Final Implementation Approval Evidence Gate",
  "PR #325",
  "Post-PR #325 Final Approval Evidence Recheck",
  "failure-known-pages-disconnect-noise",
  "No remote Supabase migration apply",
  "No Google API live smoke"
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
assert.match(taskSource, /PR #322 .*merge commit `fe6ae5062c91157c50c762fea3a63cc87e8575c3`/i, "task.md records PR #322 merge prerequisite");
assert.match(
  taskSource,
  /PR #323 .*merge commit `07b221999f302477645160278ae50f8ad3eb043c`/i,
  "task.md records PR #323 merge prerequisite"
);
assert.match(
  taskSource,
  /PR #324 .*merge commit `7fd49532509cf634e220145eb143469f9bd4e49b`/i,
  "task.md records PR #324 merge prerequisite"
);
assert.match(
  taskSource,
  /PR #325 .*merge commit `b97a39f3a32ecfef2024d2ceb3290aea35283ad5`/i,
  "task.md records PR #325 merge prerequisite"
);
assert.match(
  taskSource,
  /blocked-pending-final-review|final table\/RLS\/key-management\/rollback review/i,
  "task.md records the post-PR #322 token-store approval blocker"
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
