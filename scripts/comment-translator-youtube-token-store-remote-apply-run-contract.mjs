import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const foundationPath = "lib/comment-translator-youtube-oauth-token-store-foundation.ts";
const blockerMemoPath = "docs/future/COMMENT_TRANSLATOR_YOUTUBE_TOKEN_STORE_BLOCKER_RESOLUTION.md";
const taskPath = "task.md";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
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

const foundationSource = read(foundationPath);
const blockerMemo = read(blockerMemoPath);
const taskSource = read(taskPath);
const foundation = loadTsModule(foundationPath);
const secretOrTokenValuePattern = new RegExp(
  [
    "\\baccessToken(Plaintext|Secret)\\b",
    "\\brefreshToken(Plaintext|Secret)\\b",
    "\\bauthorizationCode(Value|Plaintext|Secret)\\b",
    "oauthAccessToken",
    "oauthRefreshToken",
    "authorization_" + "code\\s*[:=]",
    "refresh_" + "token\\s*[:=]",
    "access_" + "token\\s*[:=]",
    "SUPABASE_SERVICE_ROLE_KEY" + "\\s*[:=]",
    "SERVICE_ROLE_KEY" + "\\s*[:=]",
    "managedSecretValue",
    "BEGIN\\s+PRIVATE\\s+KEY"
  ].join("|"),
  "i"
);

assert.match(foundationSource, /^import "server-only";/m, "remote apply run boundary stays server-only");

for (const exportedType of [
  "YouTubeEncryptedTokenStoreRemoteApplyRunDecision",
  "YouTubeEncryptedTokenStoreRemoteApplyRunContract",
  "YouTubeEncryptedTokenStoreRemoteApplyRunAssessment",
  "YouTubeEncryptedTokenStoreRemoteTargetMetadataConfirmationInput",
  "YouTubeEncryptedTokenStoreRemoteTargetMetadataConfirmationContract",
  "YouTubeEncryptedTokenStoreRemoteTargetMetadataConfirmationAssessment",
  "YouTubeEncryptedTokenStoreRemoteApplyCommandGateInput",
  "YouTubeEncryptedTokenStoreRemoteApplyCommandGateContract",
  "YouTubeEncryptedTokenStoreRemoteApplyCommandGateAssessment",
  "YouTubeEncryptedTokenStoreRemoteApplyDryRunSingleMigrationGateInput",
  "YouTubeEncryptedTokenStoreRemoteApplyDryRunSingleMigrationGateContract",
  "YouTubeEncryptedTokenStoreRemoteApplyDryRunSingleMigrationGateAssessment",
  "YouTubeEncryptedTokenStoreRemoteBaselineMismatchGateInput",
  "YouTubeEncryptedTokenStoreRemoteBaselineMismatchGateContract",
  "YouTubeEncryptedTokenStoreRemoteBaselineMismatchGateAssessment",
  "YouTubeEncryptedTokenStoreAccountPreferencesBaselineResolutionGateInput",
  "YouTubeEncryptedTokenStoreAccountPreferencesBaselineResolutionGateContract",
  "YouTubeEncryptedTokenStoreAccountPreferencesBaselineResolutionGateAssessment"
]) {
  assert.match(foundationSource, new RegExp(`export type ${exportedType}\\b`), `foundation exports ${exportedType}`);
}

for (const exportedConstOrFunction of [
  "youtubeEncryptedTokenStoreRemoteApplyRunContract",
  "assessYouTubeEncryptedTokenStoreRemoteApplyRun",
  "createYouTubeEncryptedTokenStoreRemoteApplyRunSummary",
  "youtubeEncryptedTokenStoreRemoteTargetMetadataConfirmationContract",
  "assessYouTubeEncryptedTokenStoreRemoteTargetMetadataConfirmation",
  "createYouTubeEncryptedTokenStoreRemoteTargetMetadataConfirmationSummary",
  "youtubeEncryptedTokenStoreRemoteApplyCommandGateContract",
  "assessYouTubeEncryptedTokenStoreRemoteApplyCommandGate",
  "createYouTubeEncryptedTokenStoreRemoteApplyCommandGateSummary",
  "youtubeEncryptedTokenStoreRemoteApplyDryRunSingleMigrationGate",
  "assessYouTubeEncryptedTokenStoreRemoteApplyDryRunSingleMigrationGate",
  "createYouTubeEncryptedTokenStoreRemoteApplyDryRunSingleMigrationGateSummary",
  "youtubeEncryptedTokenStoreRemoteBaselineMismatchGate",
  "assessYouTubeEncryptedTokenStoreRemoteBaselineMismatchGate",
  "createYouTubeEncryptedTokenStoreRemoteBaselineMismatchGateSummary",
  "youtubeEncryptedTokenStoreAccountPreferencesBaselineResolutionGate",
  "assessYouTubeEncryptedTokenStoreAccountPreferencesBaselineResolutionGate",
  "createYouTubeEncryptedTokenStoreAccountPreferencesBaselineResolutionGateSummary"
]) {
  assert.match(
    foundationSource,
    new RegExp(`export (?:const|function) ${exportedConstOrFunction}\\b`),
    `foundation exports ${exportedConstOrFunction}`
  );
}

assert.doesNotMatch(
  `${foundationSource}\n${blockerMemo}\n${taskSource}`,
  secretOrTokenValuePattern,
  "remote apply run contract never accepts, returns, documents, or assigns secret/token values"
);

assert.equal(
  foundation.youtubeEncryptedTokenStoreRemoteApplyRunContract.prerequisiteRemoteApplyExecutionHandoff.pullRequest,
  "#331",
  "remote apply run contract records PR #331 handoff as prerequisite"
);
assert.equal(
  foundation.youtubeEncryptedTokenStoreRemoteApplyRunContract.prerequisiteRemoteApplyExecutionHandoff.mergeCommit,
  "42f03817563f047e3703be27d9b9cc6c92654305",
  "remote apply run contract records the PR #331 merge commit"
);
assert.equal(
  foundation.youtubeEncryptedTokenStoreRemoteApplyRunContract.prerequisiteRemoteApplyExecutionHandoff.status,
  "blocked-pending-explicit-human-remote-apply-target-and-run-approval",
  "remote apply run contract records the prior handoff blocker"
);
assert.equal(
  foundation.youtubeEncryptedTokenStoreRemoteApplyRunContract.threadApproval,
  "explicit-human-remote-apply-run-approval-recorded",
  "remote apply run contract records this thread's explicit apply run approval"
);
assert.equal(
  foundation.youtubeEncryptedTokenStoreRemoteApplyRunContract.safeConcreteRemoteTarget,
  "not-confirmed-no-repo-supabase-cli-target-metadata",
  "remote apply run contract blocks when no safe repo/CLI target metadata exists"
);
assert.equal(
  foundation.youtubeEncryptedTokenStoreRemoteApplyRunContract.remoteSupabaseApply,
  "not-run-blocked-pending-safe-concrete-remote-target",
  "remote apply run contract does not run an apply without a safe concrete target"
);
assert.equal(
  foundation.youtubeEncryptedTokenStoreRemoteApplyRunContract.applyCommand,
  "not-run",
  "remote apply run contract records no external mutation command was run"
);
assert.deepEqual(
  foundation.youtubeEncryptedTokenStoreRemoteApplyRunContract.targetDiscoveryEvidence,
  [
    "supabase/config.toml missing",
    ".supabase link metadata missing",
    "no repo-local non-secret project target metadata found"
  ],
  "remote apply run contract records safe target discovery evidence"
);
assert.ok(
  foundation.youtubeEncryptedTokenStoreRemoteApplyRunContract.rollbackAbortConditions.includes(
    "abort-if-safe-concrete-remote-target-is-not-confirmed"
  ),
  "remote apply run contract aborts on missing safe concrete target"
);
assert.deepEqual(
  foundation.assessYouTubeEncryptedTokenStoreRemoteApplyRun({
    explicitHumanRunApproval: true,
    safeConcreteRemoteTargetConfirmed: false,
    migrationDiffMatchesReviewedFile: true,
    credentialResolutionDisabledBeforeApply: true
  }),
  {
    status: "blocked-pending-safe-concrete-remote-target",
    remoteSupabaseApplyAllowed: false,
    remoteSupabaseApplyExecuted: false,
    serviceRoleSmokeAllowedInThisPr: false,
    nextAction: "record-target-blocker-without-running-remote-apply"
  },
  "explicit approval still blocks when the safe concrete target is not confirmed"
);
assert.deepEqual(
  foundation.assessYouTubeEncryptedTokenStoreRemoteApplyRun({
    explicitHumanRunApproval: true,
    safeConcreteRemoteTargetConfirmed: true,
    migrationDiffMatchesReviewedFile: true,
    credentialResolutionDisabledBeforeApply: true
  }),
  {
    status: "ready-for-remote-apply-command-only",
    remoteSupabaseApplyAllowed: true,
    remoteSupabaseApplyExecuted: false,
    serviceRoleSmokeAllowedInThisPr: false,
    nextAction: "run-reviewed-migration-apply-command-only-after-final-operator-confirmation"
  },
  "target and approval would allow only the reviewed migration apply command, not smoke"
);

const targetConfirmationContract = foundation.youtubeEncryptedTokenStoreRemoteTargetMetadataConfirmationContract;

assert.equal(
  targetConfirmationContract.prerequisiteRemoteApplyTargetBlocker.pullRequest,
  "#332",
  "target confirmation records PR #332 prerequisite"
);
assert.equal(
  targetConfirmationContract.prerequisiteRemoteApplyTargetBlocker.mergeCommit,
  "85998d2265eaa6348a265241f13799bfbc46759e",
  "target confirmation records the PR #332 merge commit"
);
assert.equal(
  targetConfirmationContract.prerequisiteRemoteApplyTargetBlocker.headCommit,
  "7ed1c5de42f73a3e403d30605e23f9b6f5a81577",
  "target confirmation records the PR #332 head commit"
);
assert.equal(
  targetConfirmationContract.prerequisiteRemoteApplyTargetBlocker.status,
  "not-run-blocked-pending-safe-concrete-remote-target",
  "target confirmation records the prior target blocker"
);
assert.equal(
  targetConfirmationContract.targetConfirmation,
  "blocked-missing-repo-local-non-secret-target-metadata",
  "target confirmation remains blocked when repo-local target metadata is missing"
);
assert.equal(
  targetConfirmationContract.remoteSupabaseApply,
  "not-run-target-confirmation-only",
  "target confirmation contract does not run the remote apply"
);
assert.equal(
  targetConfirmationContract.actualServiceRoleSmoke,
  "out-of-scope-separate-pr",
  "target confirmation keeps service-role smoke out of scope"
);
assert.deepEqual(
  targetConfirmationContract.targetDiscoveryEvidence,
  [
    "supabase/config.toml missing",
    ".supabase link metadata missing",
    "no repo-local non-secret project target metadata found"
  ],
  "target confirmation records current non-secret discovery evidence"
);
assert.deepEqual(
  targetConfirmationContract.allowedTargetMetadataSources,
  ["supabase/config.toml", "Supabase CLI link metadata in .supabase"],
  "target confirmation only accepts repo-local non-secret target metadata sources"
);
assert.ok(
  targetConfirmationContract.rejectedTargetSources.includes("service_role key value") &&
    targetConfirmationContract.rejectedTargetSources.includes("managed secret value") &&
    targetConfirmationContract.rejectedTargetSources.includes("OAuth token value") &&
    targetConfirmationContract.rejectedTargetSources.includes("human-pasted private credential"),
  "target confirmation rejects secret, token, and private credential sources"
);
assert.ok(
  targetConfirmationContract.rollbackAbortConditions.includes("abort-if-target-is-ambiguous-or-multiple-candidates"),
  "target confirmation aborts on ambiguous or multiple target candidates"
);
assert.ok(
  targetConfirmationContract.forbiddenInThisSlice.includes("remote Supabase DB migration apply") &&
    targetConfirmationContract.forbiddenInThisSlice.includes("service-role smoke execution"),
  "target confirmation excludes remote apply and service-role smoke execution"
);

assert.deepEqual(
  foundation.assessYouTubeEncryptedTokenStoreRemoteTargetMetadataConfirmation({
    supabaseConfigTomlPresent: false,
    supabaseCliLinkMetadataPresent: false,
    nonSecretProjectReferenceUnique: false,
    multipleTargetCandidates: false,
    requiresSecretOrTokenValue: false
  }),
  {
    status: "blocked-missing-repo-local-target-metadata",
    remoteTargetConfirmed: false,
    remoteSupabaseApplyAllowedInThisPr: false,
    serviceRoleSmokeAllowedInThisPr: false,
    nextAction: "record-target-metadata-blocker-without-running-remote-apply"
  },
  "missing repo-local metadata blocks target confirmation without requesting secrets"
);
assert.deepEqual(
  foundation.assessYouTubeEncryptedTokenStoreRemoteTargetMetadataConfirmation({
    supabaseConfigTomlPresent: true,
    supabaseCliLinkMetadataPresent: false,
    nonSecretProjectReferenceUnique: false,
    multipleTargetCandidates: true,
    requiresSecretOrTokenValue: false
  }),
  {
    status: "blocked-ambiguous-remote-target",
    remoteTargetConfirmed: false,
    remoteSupabaseApplyAllowedInThisPr: false,
    serviceRoleSmokeAllowedInThisPr: false,
    nextAction: "record-ambiguous-target-blocker-without-running-remote-apply"
  },
  "ambiguous or multiple non-secret target candidates block actual apply"
);
assert.deepEqual(
  foundation.assessYouTubeEncryptedTokenStoreRemoteTargetMetadataConfirmation({
    supabaseConfigTomlPresent: true,
    supabaseCliLinkMetadataPresent: true,
    nonSecretProjectReferenceUnique: true,
    multipleTargetCandidates: false,
    requiresSecretOrTokenValue: true
  }),
  {
    status: "blocked-secret-required-for-target-confirmation",
    remoteTargetConfirmed: false,
    remoteSupabaseApplyAllowedInThisPr: false,
    serviceRoleSmokeAllowedInThisPr: false,
    nextAction: "record-secret-required-blocker-without-requesting-secret-values"
  },
  "target confirmation blocks if a secret or token value would be required"
);
assert.deepEqual(
  foundation.assessYouTubeEncryptedTokenStoreRemoteTargetMetadataConfirmation({
    supabaseConfigTomlPresent: true,
    supabaseCliLinkMetadataPresent: true,
    nonSecretProjectReferenceUnique: true,
    multipleTargetCandidates: false,
    requiresSecretOrTokenValue: false
  }),
  {
    status: "ready-for-separate-apply-command-pr",
    remoteTargetConfirmed: true,
    remoteSupabaseApplyAllowedInThisPr: false,
    serviceRoleSmokeAllowedInThisPr: false,
    nextAction: "record-target-confirmed-readiness-and-open-separate-apply-command-pr"
  },
  "even a safely confirmed target only allows readiness recording in this PR"
);

const commandGateContract = foundation.youtubeEncryptedTokenStoreRemoteApplyCommandGateContract;

assert.equal(commandGateContract.prerequisiteRemoteTargetMetadataConfirmation.pullRequest, "#333", "command gate records PR #333 prerequisite");
assert.equal(
  commandGateContract.prerequisiteRemoteTargetMetadataConfirmation.mergeCommit,
  "ebe6b1baccaf18459d7e606f5d3d7150641dea71",
  "command gate records the PR #333 merge commit"
);
assert.equal(
  commandGateContract.operatorLocalTargetMetadata,
  "confirmed-from-supabase-cli-local-link-metadata",
  "command gate records operator-local Supabase CLI target metadata"
);
assert.deepEqual(
  commandGateContract.targetDiscoveryEvidence,
  [
    "supabase/.temp/project-ref present",
    "supabase/.temp/linked-project.json present",
    "project reference is a single non-secret 20-character project ref",
    "supabase/.temp/ is ignored and not committed"
  ],
  "command gate records sanitized local link metadata evidence"
);
assert.deepEqual(
  commandGateContract.allowedTargetMetadataSources,
  ["supabase/config.toml", "Supabase CLI local link metadata in supabase/.temp"],
  "command gate accepts current Supabase CLI local link metadata"
);
assert.equal(
  commandGateContract.remoteSupabaseApply,
  "not-run-pending-final-operator-confirmation",
  "command gate does not run the remote apply"
);
assert.equal(
  commandGateContract.applyCommandOnlyGate,
  "ready-after-final-operator-confirmation",
  "command gate only reaches command readiness after final operator confirmation"
);
assert.ok(
  commandGateContract.forbiddenInThisSlice.includes("remote Supabase DB migration apply") &&
    commandGateContract.forbiddenInThisSlice.includes("service-role smoke execution"),
  "command gate excludes remote apply and service-role smoke execution"
);
assert.deepEqual(
  foundation.assessYouTubeEncryptedTokenStoreRemoteApplyCommandGate({
    supabaseCliLocalLinkMetadataPresent: true,
    nonSecretProjectReferenceUnique: true,
    metadataIgnoredAndNotCommitted: true,
    migrationDiffMatchesReviewedFile: true,
    credentialResolutionDisabledBeforeApply: true,
    finalOperatorConfirmation: false
  }),
  {
    status: "ready-for-final-operator-confirmation-before-apply-command",
    remoteTargetConfirmed: true,
    remoteSupabaseApplyAllowedInThisPr: false,
    remoteSupabaseApplyExecuted: false,
    serviceRoleSmokeAllowedInThisPr: false,
    nextAction: "record-apply-command-gate-without-running-remote-apply"
  },
  "local link metadata only reaches final-operator-confirmation gate in this PR"
);
assert.deepEqual(
  foundation.assessYouTubeEncryptedTokenStoreRemoteApplyCommandGate({
    supabaseCliLocalLinkMetadataPresent: true,
    nonSecretProjectReferenceUnique: true,
    metadataIgnoredAndNotCommitted: true,
    migrationDiffMatchesReviewedFile: true,
    credentialResolutionDisabledBeforeApply: true,
    finalOperatorConfirmation: true
  }),
  {
    status: "ready-for-remote-apply-command-only",
    remoteTargetConfirmed: true,
    remoteSupabaseApplyAllowedInThisPr: true,
    remoteSupabaseApplyExecuted: false,
    serviceRoleSmokeAllowedInThisPr: false,
    nextAction: "run-reviewed-migration-apply-command-only"
  },
  "final operator confirmation is still required before an apply command can run"
);

const dryRunSingleMigrationGate = foundation.youtubeEncryptedTokenStoreRemoteApplyDryRunSingleMigrationGate;

assert.equal(
  dryRunSingleMigrationGate.prerequisiteRemoteApplyCommandGate.pullRequest,
  "#334",
  "dry-run single migration gate records PR #334 command gate as prerequisite"
);
assert.equal(
  dryRunSingleMigrationGate.prerequisiteDryRunBlockerRecord.pullRequest,
  "#337",
  "dry-run single migration gate records PR #337 blocker record as prerequisite evidence"
);
assert.equal(
  dryRunSingleMigrationGate.prerequisiteDryRunBlockerRecord.mergeCommit,
  "ffb1337011a15df635b7f830c6a2704a0b927b39",
  "dry-run single migration gate records the PR #337 merge commit"
);
assert.equal(
  dryRunSingleMigrationGate.prerequisiteDryRunBlockerRecord.headCommit,
  "55a79ff684ad7a629d686a05dc111e77ce5e74a5",
  "dry-run single migration gate records the PR #337 head commit"
);
assert.equal(
  dryRunSingleMigrationGate.remoteSupabaseApply,
  "not-run-blocked-pending-single-reviewed-migration-only",
  "dry-run single migration gate records that actual apply remains blocked"
);
assert.equal(
  dryRunSingleMigrationGate.exactBlockingMigration,
  "20260527000000_account_preferences_foundation.sql",
  "dry-run single migration gate records the non-reviewed blocking migration"
);
assert.deepEqual(
  dryRunSingleMigrationGate.pendingMigrationEvidence,
  [
    "20260527000000_account_preferences_foundation.sql pending in linked remote migration history",
    "20260601000000_youtube_oauth_credentials.sql pending in linked remote migration history",
    "linked remote migration history is missing the account/preferences foundation baseline",
    "single reviewed migration only is not satisfied"
  ],
  "dry-run single migration gate records the linked remote baseline-history blocker"
);
assert.deepEqual(
  foundation.assessYouTubeEncryptedTokenStoreRemoteApplyDryRunSingleMigrationGate({
    applyCommandGateReady: true,
    pendingMigrationNames: [
      "20260527000000_account_preferences_foundation.sql",
      "20260601000000_youtube_oauth_credentials.sql"
    ],
    reviewedMigrationName: "20260601000000_youtube_oauth_credentials.sql"
  }),
  {
    status: "blocked-pending-single-reviewed-migration-only",
    blockingPendingMigrationNames: [
      "20260527000000_account_preferences_foundation.sql",
      "20260601000000_youtube_oauth_credentials.sql"
    ],
    remoteSupabaseApplyAllowedInThisPr: false,
    remoteSupabaseApplyExecuted: false,
    serviceRoleSmokeAllowedInThisPr: false,
    nextAction: "record-dry-run-blocker-without-running-remote-apply"
  },
  "dry-run single migration gate blocks when non-reviewed pending migrations remain"
);
assert.deepEqual(
  foundation.assessYouTubeEncryptedTokenStoreRemoteApplyDryRunSingleMigrationGate({
    applyCommandGateReady: true,
    pendingMigrationNames: ["20260601000000_youtube_oauth_credentials.sql"],
    reviewedMigrationName: "20260601000000_youtube_oauth_credentials.sql"
  }),
  {
    status: "ready-for-reviewed-migration-apply-command-only",
    blockingPendingMigrationNames: [],
    remoteSupabaseApplyAllowedInThisPr: true,
    remoteSupabaseApplyExecuted: false,
    serviceRoleSmokeAllowedInThisPr: false,
    nextAction: "run-reviewed-migration-apply-command-only"
  },
  "dry-run single migration gate allows apply only when the reviewed migration is the sole pending migration"
);

const remoteBaselineMismatchGate = foundation.youtubeEncryptedTokenStoreRemoteBaselineMismatchGate;

assert.equal(
  remoteBaselineMismatchGate.prerequisiteDryRunSingleMigrationGate.pullRequest,
  "#338",
  "remote baseline mismatch gate records PR #338 single migration gate as prerequisite"
);
assert.equal(
  remoteBaselineMismatchGate.prerequisiteDryRunSingleMigrationGate.mergeCommit,
  "eddc49f573dcb98320dfa4ee337de2a1ac34b07c",
  "remote baseline mismatch gate records the PR #338 merge commit"
);
assert.equal(
  remoteBaselineMismatchGate.accountPreferencesFoundationMigration,
  "20260527000000_account_preferences_foundation.sql",
  "remote baseline mismatch gate records the separate account/preferences baseline"
);
assert.equal(
  remoteBaselineMismatchGate.reviewedTargetMigration,
  "20260601000000_youtube_oauth_credentials.sql",
  "remote baseline mismatch gate keeps the YouTube migration as the reviewed target"
);
assert.deepEqual(
  remoteBaselineMismatchGate.safeResolutionPaths,
  [
    "separate-reviewed-account-preferences-foundation-baseline-pr-before-youtube-apply",
    "separate-reviewed-migration-history-repair-only-if-account-preferences-schema-already-exists",
    "select-different-linked-target-with-account-preferences-baseline-already-applied"
  ],
  "remote baseline mismatch gate records safe resolution paths without bundling the YouTube apply"
);
assert.ok(
  remoteBaselineMismatchGate.rollbackAbortConditions.includes(
    "abort-if-account-preferences-foundation-would-be-bundled-with-youtube-oauth-apply"
  ),
  "remote baseline mismatch gate aborts if baseline and YouTube apply would be bundled"
);
assert.deepEqual(
  foundation.assessYouTubeEncryptedTokenStoreRemoteBaselineMismatchGate({
    pendingMigrationNames: [
      "20260527000000_account_preferences_foundation.sql",
      "20260601000000_youtube_oauth_credentials.sql"
    ],
    reviewedTargetMigrationName: "20260601000000_youtube_oauth_credentials.sql",
    accountPreferencesBaselineResolved: false,
    safeResolutionPathSelected: false,
    finalOperatorConfirmation: false,
    requiresSecretOrTokenValue: false
  }),
  {
    status: "blocked-pending-linked-remote-baseline-resolution",
    blockingMigrationNames: [
      "20260527000000_account_preferences_foundation.sql",
      "20260601000000_youtube_oauth_credentials.sql"
    ],
    remoteSupabaseApplyAllowedInThisPr: false,
    remoteSupabaseApplyExecuted: false,
    serviceRoleSmokeAllowedInThisPr: false,
    nextAction: "record-baseline-mismatch-blocker-without-remote-db-mutation"
  },
  "remote baseline mismatch gate blocks while the account/preferences baseline remains unresolved"
);
assert.deepEqual(
  foundation.assessYouTubeEncryptedTokenStoreRemoteBaselineMismatchGate({
    pendingMigrationNames: ["20260601000000_youtube_oauth_credentials.sql"],
    reviewedTargetMigrationName: "20260601000000_youtube_oauth_credentials.sql",
    accountPreferencesBaselineResolved: true,
    safeResolutionPathSelected: true,
    finalOperatorConfirmation: false,
    requiresSecretOrTokenValue: false
  }),
  {
    status: "ready-for-fresh-final-operator-confirmation-before-youtube-apply",
    blockingMigrationNames: [],
    remoteSupabaseApplyAllowedInThisPr: false,
    remoteSupabaseApplyExecuted: false,
    serviceRoleSmokeAllowedInThisPr: false,
    nextAction: "recheck-single-reviewed-migration-and-request-fresh-final-operator-confirmation"
  },
  "remote baseline mismatch gate requires fresh final operator confirmation after the baseline is resolved"
);

const accountPreferencesBaselineResolutionGate =
  foundation.youtubeEncryptedTokenStoreAccountPreferencesBaselineResolutionGate;

assert.equal(
  accountPreferencesBaselineResolutionGate.prerequisiteBaselineMismatchGate.pullRequest,
  "#339",
  "account/preferences baseline resolution gate records PR #339 baseline mismatch gate as prerequisite"
);
assert.equal(
  accountPreferencesBaselineResolutionGate.prerequisiteBaselineMismatchGate.mergeCommit,
  "a334f3f4eded06ed4e44f27a1658e1d3f6de0a05",
  "account/preferences baseline resolution gate records the PR #339 merge commit"
);
assert.equal(
  accountPreferencesBaselineResolutionGate.threadApproval,
  "conditional-human-approval-not-sufficient-for-ambiguous-remote-mutation",
  "account/preferences baseline resolution gate does not treat conditional approval as a runnable remote mutation"
);
assert.equal(
  accountPreferencesBaselineResolutionGate.remoteSupabaseApply,
  "not-run-blocked-pending-safe-baseline-resolution-path",
  "account/preferences baseline resolution gate keeps remote apply blocked until one safe path is selected"
);
assert.deepEqual(
  accountPreferencesBaselineResolutionGate.separateRemoteMutationPaths,
  [
    "account-preferences-foundation-baseline-apply",
    "account-preferences-migration-history-repair",
    "different-linked-target-reselection"
  ],
  "account/preferences baseline resolution gate keeps baseline apply, repair, and target reselection as separate paths"
);
assert.ok(
  accountPreferencesBaselineResolutionGate.rollbackAbortConditions.includes(
    "abort-if-remote-mutation-path-is-ambiguous-or-multiple"
  ),
  "account/preferences baseline resolution gate aborts if the remote mutation path is ambiguous"
);
assert.deepEqual(
  foundation.assessYouTubeEncryptedTokenStoreAccountPreferencesBaselineResolutionGate({
    pendingMigrationNames: [
      "20260527000000_account_preferences_foundation.sql",
      "20260601000000_youtube_oauth_credentials.sql"
    ],
    accountPreferencesMigrationName: "20260527000000_account_preferences_foundation.sql",
    reviewedTargetMigrationName: "20260601000000_youtube_oauth_credentials.sql",
    selectedResolutionPath: "none-selected",
    accountPreferencesRemoteSchemaVerified: false,
    dryRunShowsOnlyReviewedTargetAfterResolution: false,
    finalOperatorConfirmationForSelectedRemoteMutation: true,
    requiresSecretOrTokenValue: false
  }),
  {
    status: "blocked-pending-safe-baseline-resolution-path",
    blockingMigrationNames: [
      "20260527000000_account_preferences_foundation.sql",
      "20260601000000_youtube_oauth_credentials.sql"
    ],
    remoteSupabaseApplyAllowedInThisPr: false,
    remoteSupabaseApplyExecuted: false,
    migrationHistoryRepairAllowedInThisPr: false,
    migrationHistoryRepairExecuted: false,
    serviceRoleSmokeAllowedInThisPr: false,
    nextAction: "record-baseline-resolution-path-blocker-without-remote-db-mutation"
  },
  "account/preferences baseline resolution gate blocks even with conditional approval when no single remote mutation path is selected"
);
assert.deepEqual(
  foundation.assessYouTubeEncryptedTokenStoreAccountPreferencesBaselineResolutionGate({
    pendingMigrationNames: [
      "20260527000000_account_preferences_foundation.sql",
      "20260601000000_youtube_oauth_credentials.sql"
    ],
    accountPreferencesMigrationName: "20260527000000_account_preferences_foundation.sql",
    reviewedTargetMigrationName: "20260601000000_youtube_oauth_credentials.sql",
    selectedResolutionPath: "account-preferences-migration-history-repair",
    accountPreferencesRemoteSchemaVerified: false,
    dryRunShowsOnlyReviewedTargetAfterResolution: false,
    finalOperatorConfirmationForSelectedRemoteMutation: true,
    requiresSecretOrTokenValue: false
  }),
  {
    status: "blocked-pending-remote-schema-existence-confirmation-before-repair",
    blockingMigrationNames: ["20260527000000_account_preferences_foundation.sql"],
    remoteSupabaseApplyAllowedInThisPr: false,
    remoteSupabaseApplyExecuted: false,
    migrationHistoryRepairAllowedInThisPr: false,
    migrationHistoryRepairExecuted: false,
    serviceRoleSmokeAllowedInThisPr: false,
    nextAction: "confirm-account-preferences-schema-before-migration-history-repair"
  },
  "account/preferences baseline resolution gate blocks repair until the remote schema existence is confirmed"
);
assert.deepEqual(
  foundation.assessYouTubeEncryptedTokenStoreAccountPreferencesBaselineResolutionGate({
    pendingMigrationNames: ["20260601000000_youtube_oauth_credentials.sql"],
    accountPreferencesMigrationName: "20260527000000_account_preferences_foundation.sql",
    reviewedTargetMigrationName: "20260601000000_youtube_oauth_credentials.sql",
    selectedResolutionPath: "different-linked-target-reselection",
    accountPreferencesRemoteSchemaVerified: true,
    dryRunShowsOnlyReviewedTargetAfterResolution: true,
    finalOperatorConfirmationForSelectedRemoteMutation: false,
    requiresSecretOrTokenValue: false
  }),
  {
    status: "ready-for-youtube-single-reviewed-migration-recheck-after-baseline-resolution",
    blockingMigrationNames: [],
    remoteSupabaseApplyAllowedInThisPr: false,
    remoteSupabaseApplyExecuted: false,
    migrationHistoryRepairAllowedInThisPr: false,
    migrationHistoryRepairExecuted: false,
    serviceRoleSmokeAllowedInThisPr: false,
    nextAction: "recheck-youtube-dry-run-single-reviewed-migration-before-fresh-apply-confirmation"
  },
  "account/preferences baseline resolution gate allows returning to YouTube dry-run only after baseline is resolved"
);

for (const fragment of [
  "PR #331",
  "42f03817563f047e3703be27d9b9cc6c92654305",
  "explicit-human-remote-apply-run-approval-recorded",
  "not-confirmed-no-repo-supabase-cli-target-metadata",
  "not-run-blocked-pending-safe-concrete-remote-target",
  "supabase/config.toml missing",
  ".supabase link metadata missing",
  "No service-role smoke execution"
]) {
  assert.match(blockerMemo, new RegExp(fragment.replace(".", "\\."), "i"), `blocker memo records remote apply run blocker: ${fragment}`);
}

for (const fragment of [
  "PR #332",
  "85998d2265eaa6348a265241f13799bfbc46759e",
  "safe concrete remote Supabase target metadata confirmation",
  "blocked-missing-repo-local-non-secret-target-metadata",
  "not-run-target-confirmation-only",
  "supabase/config.toml missing",
  ".supabase link metadata missing",
  "No remote Supabase migration apply",
  "No service-role smoke execution"
]) {
  assert.match(blockerMemo, new RegExp(fragment.replace(".", "\\."), "i"), `blocker memo records target confirmation: ${fragment}`);
}

for (const fragment of [
  "PR #333",
  "ebe6b1baccaf18459d7e606f5d3d7150641dea71",
  "Supabase CLI local link metadata in supabase/.temp",
  "confirmed-from-supabase-cli-local-link-metadata",
  "not-run-pending-final-operator-confirmation",
  "No remote Supabase migration apply"
]) {
  assert.match(blockerMemo, new RegExp(fragment.replace(".", "\\."), "i"), `blocker memo records command gate: ${fragment}`);
}

for (const fragment of [
  "PR #337",
  "ffb1337011a15df635b7f830c6a2704a0b927b39",
  "55a79ff684ad7a629d686a05dc111e77ce5e74a5",
  "single reviewed migration",
  "20260527000000_account_preferences_foundation.sql",
  "20260601000000_youtube_oauth_credentials.sql",
  "not-run-blocked-pending-single-reviewed-migration-only",
  "No remote Supabase migration apply"
]) {
  assert.match(blockerMemo, new RegExp(fragment.replace(".", "\\."), "i"), `blocker memo records dry-run single migration gate: ${fragment}`);
}

for (const fragment of [
  "PR #338",
  "eddc49f573dcb98320dfa4ee337de2a1ac34b07c",
  "linked remote migration history baseline mismatch",
  "separate-reviewed-account-preferences-foundation-baseline-pr-before-youtube-apply",
  "separate-reviewed-migration-history-repair-only-if-account-preferences-schema-already-exists",
  "select-different-linked-target-with-account-preferences-baseline-already-applied",
  "not-run-blocked-pending-linked-remote-baseline-resolution",
  "No remote Supabase migration apply"
]) {
  assert.match(blockerMemo, new RegExp(fragment.replace(".", "\\."), "i"), `blocker memo records remote baseline mismatch gate: ${fragment}`);
}

for (const fragment of [
  "PR #339",
  "a334f3f4eded06ed4e44f27a1658e1d3f6de0a05",
  "conditional-human-approval-not-sufficient-for-ambiguous-remote-mutation",
  "account-preferences-foundation-baseline-apply",
  "account-preferences-migration-history-repair",
  "different-linked-target-reselection",
  "not-run-blocked-pending-safe-baseline-resolution-path",
  "No remote Supabase migration apply",
  "No remote Supabase migration history repair"
]) {
  assert.match(
    blockerMemo,
    new RegExp(fragment.replace(".", "\\."), "i"),
    `blocker memo records account/preferences baseline resolution gate: ${fragment}`
  );
}

assert.match(taskSource, /PR #331.*42f03817563f047e3703be27d9b9cc6c92654305/i, "task.md records PR #331 merge premise");
assert.match(taskSource, /PR #332.*85998d2265eaa6348a265241f13799bfbc46759e/i, "task.md records PR #332 merge premise");
assert.match(
  taskSource,
  /apply run.*not-run-blocked-pending-safe-concrete-remote-target/i,
  "task.md records that actual apply did not run because the safe target is missing"
);
assert.match(
  taskSource,
  /target confirmation.*blocked-missing-repo-local-non-secret-target-metadata/i,
  "task.md records target confirmation blocker result"
);
assert.match(
  taskSource,
  /actual apply.*not-run-target-confirmation-only/i,
  "task.md records that actual apply did not run in the target confirmation PR"
);
assert.match(taskSource, /PR #333.*ebe6b1baccaf18459d7e606f5d3d7150641dea71/i, "task.md records PR #333 merge premise");
assert.match(
  taskSource,
  /supabase\/\.temp\/project-ref.*present/i,
  "task.md records sanitized local Supabase CLI link metadata presence"
);
assert.match(
  taskSource,
  /actual apply.*未実行/i,
  "task.md records that actual apply remains unexecuted after target metadata confirmation"
);
assert.match(taskSource, /PR #337.*ffb1337011a15df635b7f830c6a2704a0b927b39/i, "task.md records PR #337 merge premise");
assert.match(
  taskSource,
  /20260527000000_account_preferences_foundation\.sql.*20260601000000_youtube_oauth_credentials\.sql/s,
  "task.md records both pending migrations from the linked dry-run"
);
assert.match(
  taskSource,
  /migration list --linked.*remote.*blank/i,
  "task.md records that linked remote migration history is blank for both local migrations"
);
assert.match(
  taskSource,
  /actual apply.*not-run-blocked-pending-single-reviewed-migration-only/i,
  "task.md records the dry-run single reviewed migration blocker result"
);
assert.match(taskSource, /PR #338.*eddc49f573dcb98320dfa4ee337de2a1ac34b07c/i, "task.md records PR #338 merge premise");
assert.match(
  taskSource,
  /linked remote migration history baseline mismatch/i,
  "task.md records the linked remote baseline mismatch"
);
assert.match(
  taskSource,
  /not-run-blocked-pending-linked-remote-baseline-resolution/i,
  "task.md records the baseline mismatch blocker result"
);
assert.match(taskSource, /PR #339.*a334f3f4eded06ed4e44f27a1658e1d3f6de0a05/i, "task.md records PR #339 merge premise");
assert.match(
  taskSource,
  /conditional-human-approval-not-sufficient-for-ambiguous-remote-mutation/i,
  "task.md records that conditional approval is not sufficient while the safe remote mutation path is ambiguous"
);
assert.match(
  taskSource,
  /not-run-blocked-pending-safe-baseline-resolution-path/i,
  "task.md records the account/preferences baseline resolution path blocker"
);
assert.match(
  taskSource,
  /UI \/ rendered text \/ CSS は変更していない.*幅別確認は不要/s,
  "task.md records why width checks are skipped"
);

console.log("comment translator YouTube token store remote apply run contract checks passed");
