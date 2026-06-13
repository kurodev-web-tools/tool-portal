import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const accountIntegrationPath = "lib/comment-translator-youtube-account-integration.ts";
const accountStatusPath = "lib/comment-translator-youtube-account-integration-status.ts";
const statusBoundaryPath = "lib/comment-translator-youtube-credential-status-boundary.ts";
const tokenStoreAdapterPath = "lib/comment-translator-youtube-token-store-supabase-adapter.ts";
const persistencePath = "lib/comment-translator-youtube-oauth-token-store-persistence.ts";
const disconnectRuntimePath = "lib/comment-translator-youtube-disconnect-runtime.ts";
const routePath = "app/account/integrations/page.tsx";
const shellPath = "components/account/AccountIntegrationsShell.tsx";
const accountActionsPath = "app/account/actions.ts";
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

assert.ok(exists(accountIntegrationPath), "account integration view model boundary exists");
assert.ok(exists(accountStatusPath), "server-only account integration status wiring exists");
assert.ok(exists(statusBoundaryPath), "trusted credential status boundary exists");
assert.ok(exists(tokenStoreAdapterPath), "trusted Supabase credential adapter exists");
assert.ok(exists(disconnectRuntimePath), "safe disconnect runtime exists");
assert.ok(exists(routePath), "/account/integrations route exists");
assert.ok(exists(shellPath), "account integrations shell exists");
assert.ok(exists(accountActionsPath), "account action surface exists");

const accountIntegrationSource = read(accountIntegrationPath);
const accountStatusSource = read(accountStatusPath);
const statusBoundarySource = read(statusBoundaryPath);
const adapterSource = read(tokenStoreAdapterPath);
const routeSource = read(routePath);
const shellSource = read(shellPath);
const accountActionsSource = read(accountActionsPath);
const taskSource = read(taskPath);

assert.match(accountStatusSource, /^import "server-only";/m, "account status wiring is server-only");
assert.match(accountStatusSource, /readYouTubeOAuthCredentialStatus/, "account status read uses trusted credential status boundary");
assert.match(accountStatusSource, /createTrustedYouTubeOAuthCredentialSupabaseStatusReader/, "account status read wires trusted Supabase status reader");
assert.match(accountStatusSource, /createYouTubeOAuthCredentialReferenceId/, "account status derives the opaque owner-bound credential reference server-side");
assert.match(accountStatusSource, /YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED/, "account status keeps emergency disable fail-closed");
assert.match(routeSource, /readYouTubeAccountIntegrationStatusViewModel/, "route reads real sanitized YouTube account status");
assert.doesNotMatch(routeSource, /createYouTubeAccountIntegrationViewModel\(\)/, "route no longer renders the fixed fallback status");
assert.match(accountActionsSource, /readYouTubeAccountIntegrationCredentialReference/, "disconnect action derives credential reference server-side");
assert.match(accountActionsSource, /readYouTubeOAuthCredentialDisconnectResult/, "disconnect action uses the safe trusted disconnect runtime");
assert.doesNotMatch(shellSource, /name=["']credentialReferenceId["']|value=\{youtubeIntegration\.credentialReferenceId\}/, "shell does not place credential references in browser form payloads");
assert.match(shellSource, /Connected/, "shell copy includes connected state");
assert.match(shellSource, /Disconnected/, "shell copy includes disconnected state");
assert.match(shellSource, /Reconnect required/, "shell copy includes reconnect-required state");
assert.match(shellSource, /Connection status unavailable|Unavailable/, "shell copy includes unavailable state");
assert.match(shellSource, /Connection status check failed|Status check failed|Error/, "shell copy includes error state");
assert.match(shellSource, /does not start background monitoring/, "shell copy preserves no-background-monitoring boundary");

assert.match(statusBoundarySource, /status:\s*"disconnected"/, "trusted status boundary can return sanitized disconnected state");
assert.match(adapterSource, /YouTubeOAuthCredentialNotFoundError/, "trusted adapter distinguishes no credential from query failure");

const accountIntegration = loadTsModule(accountIntegrationPath);
const statusBoundary = loadTsModule(statusBoundaryPath);

assert.deepEqual(
  accountIntegration.youtubeAccountIntegrationTrustedStatusWiringContract.safeStates,
  ["connected", "reconnect-required", "disconnected", "unavailable", "error"],
  "account integration contract bounds browser-safe states"
);
assert.equal(
  accountIntegration.youtubeAccountIntegrationTrustedStatusWiringContract.backgroundMonitoring,
  "not-started-by-connection",
  "connection alone does not start background monitoring"
);
assert.equal(
  accountIntegration.youtubeAccountIntegrationTrustedStatusWiringContract.browserStorage,
  "no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
  "account status wiring does not add browser storage"
);

const activeStatus = statusBoundary.createYouTubeOAuthCredentialBrowserReadableStatus({
  credentialReferenceId: "ytcred_account_status_reference_001",
  provider: "youtube",
  providerChannelId: "server-only-provider-channel-reference",
  scopeLabel: "youtube.readonly",
  scopeSet: ["https://www.googleapis.com/auth/youtube.readonly"],
  expiresAtIso: "2026-06-13T15:00:00.000Z",
  expiryStatus: "active",
  revoked: false,
  revokedAtIso: null,
  tokenValue: "never-returned-by-design",
  refreshTokenValue: "never-returned-by-design",
  ciphertext: "never-returned-by-design",
  decryptCapability: "forbidden"
});

const disconnectedStatus = statusBoundary.createYouTubeOAuthCredentialDisconnectedPayload({
  credentialReferenceId: "ytcred_account_status_reference_001"
});
const disabledStatus = await statusBoundary.readYouTubeOAuthCredentialStatus({
  credentialReferenceId: "ytcred_account_status_reference_001",
  trustedAdapter: {
    async getCredentialStatus() {
      throw new Error("disabled status must not touch trusted adapter");
    }
  },
  callerAuthorization: {
    status: "authorized",
    ownerUserId: "server-only-owner-reference"
  },
  credentialResolutionDisabled: true
});

assert.equal(
  accountIntegration.createYouTubeAccountIntegrationViewModelFromCredentialStatus(activeStatus).status,
  "connected",
  "available credential status maps to connected"
);
assert.equal(
  accountIntegration.createYouTubeAccountIntegrationViewModelFromCredentialStatus({
    ...activeStatus,
    status: "reconnect-required",
    reason: "expired",
    expiryStatus: "expired",
    reconnectRequired: true,
    reconnectGuidance: "reconnect-youtube",
    refreshAttempted: false,
    refreshStatus: "refresh-runtime-unavailable",
    providerErrorBody: "never-returned-by-design"
  }).status,
  "reconnect-required",
  "expired credential status maps to reconnect-required"
);
assert.equal(
  accountIntegration.createYouTubeAccountIntegrationViewModelFromCredentialStatus(disconnectedStatus).status,
  "disconnected",
  "missing credential maps to disconnected"
);
assert.equal(
  accountIntegration.createYouTubeAccountIntegrationViewModelFromCredentialStatus(disabledStatus).status,
  "unavailable",
  "credential resolution disabled maps to fail-closed unavailable"
);
assert.equal(
  accountIntegration.createYouTubeAccountIntegrationViewModelFromCredentialStatus(
    statusBoundary.createYouTubeOAuthCredentialStatusErrorPayload({
      credentialReferenceId: "ytcred_account_status_reference_001",
      reason: "trusted-adapter-query-failed"
    })
  ).status,
  "error",
  "trusted query failure maps to browser-safe error"
);

for (const viewModel of [
  accountIntegration.createYouTubeAccountIntegrationViewModelFromCredentialStatus(activeStatus),
  accountIntegration.createYouTubeAccountIntegrationViewModelFromCredentialStatus(disconnectedStatus),
  accountIntegration.createYouTubeAccountIntegrationViewModelFromCredentialStatus(disabledStatus)
]) {
  assert.doesNotMatch(
    JSON.stringify(viewModel),
    /server-only-owner-reference|server-only-provider-channel-reference|providerChannelId|credentialReferenceId|liveChatId|access_token|refresh_token|authorization_code|Authorization|service_role|ciphertext|decrypt|providerTarget/i,
    "account integration view model excludes credentials, private ids, provider targets, and browser payloads"
  );
}

assert.match(taskSource, /5\. Account integrations status wiring from trusted credential status[\s\S]*Status: complete/i, "task.md records Task 5 completion");
assert.match(taskSource, /width checks for Task 5/i, "task.md records Task 5 width-check evidence");
assert.match(taskSource, /Google OAuth live connect execution, YouTube OAuth live connect execution[\s\S]*were not run/i, "task.md records gated OAuth execution was not run");

const allowedChangedFiles = new Set([
  accountIntegrationPath,
  accountStatusPath,
  statusBoundaryPath,
  tokenStoreAdapterPath,
  disconnectRuntimePath,
  persistencePath,
  "lib/comment-translator-youtube-credential-status-ui-wiring.ts",
  "lib/comment-translator.ts",
  routePath,
  shellPath,
  accountActionsPath,
  taskPath,
  "scripts/comment-translator-youtube-oauth-account-status-wiring-contract.mjs",
  "scripts/comment-translator-youtube-oauth-token-store-persistence-wiring-contract.mjs",
  "scripts/comment-translator-youtube-oauth-connect-callback-implementation-contract.mjs",
  "scripts/comment-translator-youtube-oauth-connect-callback-readiness-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `Task 5 account status wiring does not change unexpected file: ${file}`);
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

console.log("comment translator YouTube OAuth account status wiring contract checks passed");
