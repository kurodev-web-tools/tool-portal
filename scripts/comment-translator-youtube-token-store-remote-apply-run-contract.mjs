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
  "YouTubeEncryptedTokenStoreRemoteApplyCommandGateAssessment"
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
  "createYouTubeEncryptedTokenStoreRemoteApplyCommandGateSummary"
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
assert.match(
  taskSource,
  /UI \/ rendered text \/ CSS は変更していない.*幅別確認は不要/s,
  "task.md records why width checks are skipped"
);

console.log("comment translator YouTube token store remote apply run contract checks passed");
