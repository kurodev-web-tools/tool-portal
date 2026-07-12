import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const pagePath = "app/tools/comment-translator/page.tsx";
const actionsPath = "app/tools/comment-translator/actions.ts";
const dockPath = "components/comment-translator/CommentTranslatorDock.tsx";
const copyPath = "lib/comment-translator.ts";
const toolCredentialSourcePath = "lib/comment-translator-youtube-tool-credential-source.ts";
const accountStatusPath = "lib/comment-translator-youtube-account-integration-status.ts";
const statusBoundaryPath = "lib/comment-translator-youtube-credential-status-boundary.ts";
const disconnectRuntimePath = "lib/comment-translator-youtube-disconnect-runtime.ts";
const taskPath = "task.md";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function changedFiles() {
  const committedDiff = execSync(
    "git diff --name-only origin/codex/comment-translator-youtube-oauth-integration...HEAD",
    {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }
  )
    .split(/\r?\n/)
    .filter(Boolean);
  const workingTreeDiff = execSync("git diff --name-only", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  })
    .split(/\r?\n/)
    .filter(Boolean);
  const stagedDiff = execSync("git diff --cached --name-only", {
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

  return [...new Set([...committedDiff, ...workingTreeDiff, ...stagedDiff, ...untracked])].map((file) =>
    file.replace(/\\/g, "/")
  );
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

    if (request.startsWith("@/")) {
      const candidate = path.join(root, `${request.slice(2)}.ts`);
      if (fs.existsSync(candidate)) {
        return compileTsModule(candidate);
      }
      const candidateTsx = path.join(root, `${request.slice(2)}.tsx`);
      if (fs.existsSync(candidateTsx)) {
        return compileTsModule(candidateTsx);
      }
    }

    if (request.startsWith(".") && parent?.filename) {
      const candidate = path.resolve(path.dirname(parent.filename), `${request}.ts`);
      if (fs.existsSync(candidate)) {
        return compileTsModule(candidate);
      }
      const candidateTsx = path.resolve(path.dirname(parent.filename), `${request}.tsx`);
      if (fs.existsSync(candidateTsx)) {
        return compileTsModule(candidateTsx);
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

assert.ok(exists(pagePath), "/tools/comment-translator page exists");
assert.ok(exists(actionsPath), "comment translator server actions exist");
assert.ok(exists(dockPath), "comment translator dock exists");
assert.ok(exists(copyPath), "comment translator UI copy exists");
assert.ok(exists(toolCredentialSourcePath), "tool credential source server-only helper exists");
assert.ok(exists(accountStatusPath), "trusted account credential reference helper exists");
assert.ok(exists(statusBoundaryPath), "trusted credential status boundary exists");
assert.ok(exists(disconnectRuntimePath), "credential readiness runtime exists");

const pageSource = read(pagePath);
const actionsSource = read(actionsPath);
const dockSource = read(dockPath);
const copySource = read(copyPath);
const toolCredentialSource = read(toolCredentialSourcePath);
const accountStatusSource = read(accountStatusPath);
const statusBoundarySource = read(statusBoundaryPath);
const disconnectRuntimeSource = read(disconnectRuntimePath);
const taskSource = read(taskPath);

assert.match(toolCredentialSource, /^import "server-only";/m, "tool credential source helper is server-only");
assert.match(
  toolCredentialSource,
  /readYouTubeOAuthCredentialReferenceForCaller/,
  "tool helper reuses the trusted owner-bound credential reference resolution"
);
assert.match(
  toolCredentialSource,
  /createTrustedYouTubeOAuthCredentialSupabaseStatusReader/,
  "tool helper preserves the trusted Supabase credential status adapter boundary"
);
assert.match(
  toolCredentialSource,
  /YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED/,
  "tool helper preserves emergency disable fail-closed behavior"
);
assert.match(
  toolCredentialSource,
  /server-owned-trusted-connected-credential-status/,
  "tool helper marks the source as server-owned trusted credential status"
);

assert.match(
  accountStatusSource,
  /readYouTubeOAuthCredentialReferenceForCaller/,
  "credential reference derivation is available outside the account page without client payloads"
);
assert.match(
  statusBoundarySource,
  /credential-reference-env-missing/,
  "missing credential reference env maps to a browser-safe unavailable reason"
);
assert.match(
  disconnectRuntimeSource,
  /credential-reference-env-missing/,
  "start readiness can block safely on missing server-only credential reference env"
);

assert.match(pageSource, /readCommentTranslatorToolCredentialStatusSource/, "tool page reads server-owned credential status source");
assert.doesNotMatch(pageSource, /ytcred_comment_translator_preview_001/, "tool page no longer embeds the fixed preview credential reference");
assert.doesNotMatch(pageSource, /createYouTubeOAuthNewClientPayloadCredentialReferenceSource/, "tool page no longer creates a client payload credential reference");
assert.doesNotMatch(pageSource, /trusted-adapter-not-wired/, "tool page no longer embeds trusted-adapter-not-wired readiness metadata");

assert.doesNotMatch(
  dockSource,
  /credentialReferenceId\s*=|credentialReference\.credentialReferenceId|formData\.append\("credentialReferenceId"|copy\.fields\.credentialReference/,
  "dock no longer displays or posts a credential reference id for active tool readiness"
);
assert.match(dockSource, /getYouTubeOAuthCredentialStatusAction\(\)/, "credential status refresh resolves credential reference server-side");
assert.match(dockSource, /startCommentTranslatorSessionAction\(\)/, "session start resolves credential reference server-side");
assert.match(dockSource, /getCommentTranslatorSessionStatusAction\(\)/, "session status resolves credential reference server-side");
assert.match(dockSource, /heartbeatCommentTranslatorSessionAction\(\)/, "heartbeat readiness resolves credential reference server-side");
assert.match(dockSource, /stopCommentTranslatorSessionAction\(\)/, "stop action does not require a browser credential reference payload");
assert.match(copySource, /server-owned credential status|server-owned credential metadata/i, "visible safe-boundary copy reflects server-owned credential resolution");
assert.doesNotMatch(copySource, /opaque credentialReferenceId and sanitized metadata|opaqueなcredentialReferenceIdとsanitized metadata/, "tool copy no longer says the client displays credentialReferenceId");

assert.doesNotMatch(
  actionsSource,
  /readCredentialReferenceId\(formData\)|missing-credential-reference|trusted-adapter-not-wired/,
  "server actions do not use browser form credential references or trusted-adapter-not-wired readiness fallback"
);
assert.match(
  actionsSource,
  /readYouTubeOAuthCredentialReferenceForCaller|readCommentTranslatorToolCredentialStatus/,
  "server actions resolve the credential reference through the trusted server-only boundary"
);
assert.match(actionsSource, /credential-reference-env-missing/, "server actions fail closed when credential reference env is absent");
assert.match(actionsSource, /credential-resolution-disabled/, "server actions fail closed when credential resolution is disabled");

const toolCredentialModule = loadTsModule(toolCredentialSourcePath);
const accountStatusModule = loadTsModule(accountStatusPath);
const statusBoundaryModule = loadTsModule(statusBoundaryPath);
const disconnectRuntimeModule = loadTsModule(disconnectRuntimePath);

assert.deepEqual(
  toolCredentialModule.commentTranslatorToolCredentialSourceContract.safeStates,
  ["available", "reconnect-required", "disconnected", "credential-resolution-disabled", "unavailable", "error"],
  "tool credential source contract preserves browser-safe status states"
);
assert.equal(
  toolCredentialModule.commentTranslatorToolCredentialSourceContract.clientReadableValues,
  "sanitized-credential-status-metadata-only",
  "tool credential source contract keeps credential reference server-only"
);
assert.equal(
  toolCredentialModule.commentTranslatorToolCredentialSourceContract.providerTargetLookup,
  "not-run",
  "tool credential source contract does not run provider target lookup"
);
assert.equal(
  toolCredentialModule.commentTranslatorToolCredentialSourceContract.liveChatIdLookup,
  "not-run",
  "tool credential source contract does not run liveChatId lookup"
);
assert.equal(
  toolCredentialModule.commentTranslatorToolCredentialSourceContract.backgroundMonitoring,
  "not-started-by-connection",
  "connection alone does not start background monitoring"
);

const authorizedCaller = {
  status: "authorized",
  ownerUserId: "server-only-owner-reference"
};

assert.equal(
  accountStatusModule.readYouTubeOAuthCredentialReferenceForCaller({
    callerAuthorization: authorizedCaller,
    env: {
      YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED: "1",
      YOUTUBE_OAUTH_CREDENTIAL_REFERENCE_SECRET: "server-only-reference-secret"
    }
  }).reason,
  "credential-resolution-disabled",
  "credential resolution disabled fails closed before deriving a credential reference"
);
assert.equal(
  accountStatusModule.readYouTubeOAuthCredentialReferenceForCaller({
    callerAuthorization: authorizedCaller,
    env: {
      YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED: "0"
    }
  }).reason,
  "credential-reference-env-missing",
  "missing credential reference env fails closed with a browser-safe reason"
);

const disabledStatus = await toolCredentialModule.readCommentTranslatorToolCredentialStatus({
  callerAuthorization: authorizedCaller,
  env: {
    YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED: "true",
    YOUTUBE_OAUTH_CREDENTIAL_REFERENCE_SECRET: "server-only-reference-secret"
  },
  trustedAdapter: {
    async getCredentialStatus() {
      throw new Error("disabled path must not touch trusted adapter");
    }
  }
});
assert.equal(disabledStatus.status, "credential-resolution-disabled", "disabled credential resolution returns fail-closed status");

const missingEnvStatus = await toolCredentialModule.readCommentTranslatorToolCredentialStatus({
  callerAuthorization: authorizedCaller,
  env: {},
  trustedAdapter: {
    async getCredentialStatus() {
      throw new Error("missing env path must not touch trusted adapter");
    }
  }
});
assert.equal(missingEnvStatus.status, "unavailable", "missing env returns browser-safe unavailable status");
assert.equal(missingEnvStatus.reason, "credential-reference-env-missing", "missing env reason is sanitized");

const connectedStatus = await toolCredentialModule.readCommentTranslatorToolCredentialStatus({
  callerAuthorization: authorizedCaller,
  env: {
    YOUTUBE_OAUTH_CREDENTIAL_REFERENCE_SECRET: "server-only-reference-secret"
  },
  trustedAdapter: {
    async getCredentialStatus({ credentialReferenceId, ownerUserId }) {
      assert.match(credentialReferenceId, /^ytcred_/, "trusted adapter receives derived opaque credential reference");
      assert.equal(ownerUserId, "server-only-owner-reference", "trusted adapter receives server-only owner authorization");
      return {
        credentialReferenceId,
        provider: "youtube",
        ownerUserId,
        providerChannelId: "server-only-provider-channel-reference",
        scopeSet: ["https://www.googleapis.com/auth/youtube.readonly"],
        scopeLabel: "youtube.readonly",
        expiresAtIso: "2026-06-13T15:00:00.000Z",
        expiryStatus: "active",
        revoked: false,
        revokedAtIso: null,
        tokenValue: "never-returned-by-design",
        refreshTokenValue: "never-returned-by-design",
        ciphertext: "never-returned-by-design",
        decryptCapability: "forbidden"
      };
    }
  }
});
assert.equal(connectedStatus.status, "available", "connected trusted credential status remains ready");
assert.equal(
  disconnectRuntimeModule.assessYouTubeOAuthCredentialTranslatorStartReadiness(connectedStatus).status,
  "ready",
  "connected trusted credential status allows session readiness"
);

const connectedSource = toolCredentialModule.createCommentTranslatorToolCredentialStatusSource(connectedStatus);
assert.doesNotMatch(
  JSON.stringify(connectedSource),
  /credentialReferenceId|server-only-owner-reference|server-only-provider-channel-reference|providerChannelId|liveChatId|access_token|refresh_token|authorization_code|Authorization|service_role|ciphertext|decrypt|providerTarget/i,
  "tool credential source sent to the client excludes credential reference, private ids, provider target metadata, and token values"
);

assert.match(taskSource, /6\. Tool credential source wiring away from fixed preview credential reference[\s\S]*Status: complete/i, "task.md records Task 6 completion");
assert.match(taskSource, /width checks for Task 6|width checks skipped for Task 6/i, "task.md records Task 6 width-check result or skip reason");
assert.match(
  taskSource,
  /Google OAuth live connect execution, YouTube OAuth live connect execution[\s\S]*were not run/i,
  "task.md records gated OAuth/live/provider actions were not run"
);

const allowedChangedFiles = new Set([
  pagePath,
  actionsPath,
  dockPath,
  copyPath,
  toolCredentialSourcePath,
  accountStatusPath,
  statusBoundaryPath,
  "lib/comment-translator-youtube-credential-status-ui-wiring.ts",
  disconnectRuntimePath,
  taskPath,
  "scripts/comment-translator-youtube-oauth-tool-credential-source-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `Task 6 tool credential source wiring does not change unexpected file: ${file}`);
}

const changedSource = changedFiles()
  .map((file) => `${file}\n${read(file)}`)
  .join("\n");

for (const forbiddenSecretPattern of [
  /access_token\s*[:=]\s*["'][^"']+["']/i,
  /refresh_token\s*[:=]\s*["'][^"']+["']/i,
  /authorization_code\s*[:=]\s*["'][^"']+["']/i,
  /Authorization:\s*Bearer\s+\S+/i,
  /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+["']/i,
  /STRIPE_SECRET_KEY\s*[:=]\s*["'][^"']+["']/i,
  /STRIPE_WEBHOOK_SECRET\s*[:=]\s*["'][^"']+["']/i,
  /liveChatId\s*[:=]\s*["'][^"']+["']/i,
  /providerChannelId\s*[:=]\s*["'][UC][^"']+["']/i,
  /ownerUserId\s*[:=]\s*["'][0-9a-f-]{20,}["']/i,
  /providerTargetMetadata\s*[:=]\s*\{/i,
  /localStorage\.|indexedDB\.|sessionStorage\./i
]) {
  assert.doesNotMatch(changedSource, forbiddenSecretPattern, `changed files avoid forbidden pattern: ${forbiddenSecretPattern}`);
}

console.log("comment translator YouTube OAuth tool credential source contract checks passed");
