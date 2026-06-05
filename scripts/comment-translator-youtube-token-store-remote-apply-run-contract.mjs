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
  "YouTubeEncryptedTokenStoreRemoteApplyRunAssessment"
]) {
  assert.match(foundationSource, new RegExp(`export type ${exportedType}\\b`), `foundation exports ${exportedType}`);
}

for (const exportedConstOrFunction of [
  "youtubeEncryptedTokenStoreRemoteApplyRunContract",
  "assessYouTubeEncryptedTokenStoreRemoteApplyRun",
  "createYouTubeEncryptedTokenStoreRemoteApplyRunSummary"
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

assert.match(taskSource, /PR #331.*42f03817563f047e3703be27d9b9cc6c92654305/i, "task.md records PR #331 merge premise");
assert.match(
  taskSource,
  /apply run.*not-run-blocked-pending-safe-concrete-remote-target/i,
  "task.md records that actual apply did not run because the safe target is missing"
);
assert.match(
  taskSource,
  /UI \/ rendered text \/ CSS は変更していない.*幅別確認は不要/s,
  "task.md records why width checks are skipped"
);

console.log("comment translator YouTube token store remote apply run contract checks passed");
