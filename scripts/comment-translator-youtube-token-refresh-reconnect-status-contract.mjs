import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const refreshPath = "lib/comment-translator-youtube-token-refresh-runtime.ts";
const statusBoundaryPath = "lib/comment-translator-youtube-credential-status-boundary.ts";
const statusRoutePath = "app/api/comment-translator/youtube/credential-status/route.ts";
const statusActionPath = "app/tools/comment-translator/actions.ts";
const taskPath = "task.md";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function changedFiles() {
  const committedDiff = execSync("git diff --name-only origin/codex/comment-translator-preview...HEAD", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  })
    .split(/\r?\n/)
    .filter(Boolean);
  const uncommittedDiff = execSync("git diff --name-only", {
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

  return [...new Set([...committedDiff, ...uncommittedDiff, ...untracked])].map((file) => file.replace(/\\/g, "/"));
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

assert.ok(exists(refreshPath), "server-only token refresh/reconnect runtime boundary exists");
assert.ok(exists(statusBoundaryPath), "credential status boundary exists");
assert.ok(exists(statusRoutePath), "credential status route exists");
assert.ok(exists(statusActionPath), "credential status server action exists");

const refreshSource = read(refreshPath);
const statusBoundarySource = read(statusBoundaryPath);
const statusRouteSource = read(statusRoutePath);
const statusActionSource = read(statusActionPath);

assert.match(refreshSource, /^import "server-only";/m, "token refresh boundary is server-only");
assert.match(statusBoundarySource, /comment-translator-youtube-token-refresh-runtime/, "status boundary uses token refresh runtime");
assert.match(statusRouteSource, /readYouTubeOAuthCredentialStatus/, "route remains on the sanitized credential status boundary");
assert.match(statusActionSource, /readYouTubeOAuthCredentialStatus/, "server action remains on the sanitized credential status boundary");

assert.doesNotMatch(
  `${refreshSource}\n${statusBoundarySource}\n${statusRouteSource}\n${statusActionSource}`,
  /providerChannelId:\s*status\.providerChannelId|providerChannelId:\s*input\.providerChannelId|providerErrorBody:\s*error|access_token\s*[:=]|refresh_token\s*[:=]|authorization_code\s*[:=]|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY/i,
  "refresh/status client boundary does not return provider channel values, provider bodies, token values, auth headers, or service-role key values"
);
assert.doesNotMatch(
  `${refreshSource}\n${statusBoundarySource}\n${statusRouteSource}\n${statusActionSource}`,
  /localStorage\.|indexedDB\.|sessionStorage\.|liveChatMessages|stripe|checkout|gtag|GA4/i,
  "Task 5 boundary avoids browser storage, provider polling, quota, billing, and analytics changes"
);

const refresh = loadTsModule(refreshPath);
const statusBoundary = loadTsModule(statusBoundaryPath);

assert.equal(
  refresh.youtubeOAuthCredentialTokenRefreshRuntimeContract.implementationStage,
  "server-only-token-refresh-reconnect-status",
  "refresh runtime contract records Task 5 implementation stage"
);
assert.equal(
  refresh.youtubeOAuthCredentialTokenRefreshRuntimeContract.browserReadableOutput,
  "sanitized-refresh-and-reconnect-status-only",
  "refresh runtime contract exposes sanitized browser status only"
);
assert.equal(
  refresh.youtubeOAuthCredentialTokenRefreshRuntimeContract.providerErrorBodyOutput,
  "never-returned-by-design",
  "refresh runtime contract never returns provider error bodies"
);
assert.deepEqual(
  refresh.youtubeOAuthCredentialTokenRefreshRuntimeContract.safeStates,
  ["available", "reconnect-required", "unavailable", "credential-resolution-disabled"],
  "refresh runtime contract keeps safe client states bounded"
);

const activeStatus = {
  credentialReferenceId: "ytcred_refresh_reference_001",
  provider: "youtube",
  providerChannelId: "server-only-provider-channel-reference",
  scopeLabel: "youtube.readonly",
  scopeSet: ["https://www.googleapis.com/auth/youtube.readonly"],
  expiresAtIso: "2026-06-11T15:00:00.000Z",
  expiryStatus: "active",
  revoked: false,
  revokedAtIso: null,
  tokenValue: "never-returned-by-design",
  refreshTokenValue: "never-returned-by-design",
  ciphertext: "never-returned-by-design",
  decryptCapability: "forbidden"
};
const expiredStatus = {
  ...activeStatus,
  expiresAtIso: "2026-06-11T10:00:00.000Z",
  expiryStatus: "expired"
};

assert.deepEqual(
  refresh.createYouTubeOAuthCredentialRefreshBrowserReadableStatus(activeStatus, {
    refreshAttempted: false,
    refreshStatus: "not-needed"
  }),
  {
    status: "available",
    credentialReferenceId: "ytcred_refresh_reference_001",
    provider: "youtube",
    scopeLabel: "youtube.readonly",
    scopeSet: ["https://www.googleapis.com/auth/youtube.readonly"],
    expiresAtIso: "2026-06-11T15:00:00.000Z",
    expiryStatus: "active",
    revoked: false,
    revokedAtIso: null,
    reconnectRequired: false,
    reconnectGuidance: "none",
    refreshAttempted: false,
    refreshStatus: "not-needed"
  },
  "active credentials return sanitized available status without provider channel id or token markers"
);

assert.deepEqual(
  await refresh.readYouTubeOAuthCredentialRefreshStatus({
    credentialStatus: expiredStatus,
    trustedRefreshRuntime: null
  }),
  {
    status: "reconnect-required",
    credentialReferenceId: "ytcred_refresh_reference_001",
    provider: "youtube",
    reason: "expired",
    scopeLabel: "youtube.readonly",
    scopeSet: ["https://www.googleapis.com/auth/youtube.readonly"],
    expiresAtIso: "2026-06-11T10:00:00.000Z",
    expiryStatus: "expired",
    revoked: false,
    revokedAtIso: null,
    reconnectRequired: true,
    reconnectGuidance: "reconnect-youtube",
    refreshAttempted: false,
    refreshStatus: "refresh-runtime-unavailable",
    providerErrorBody: "never-returned-by-design"
  },
  "expired credentials without refresh runtime return sanitized reconnect guidance"
);

assert.deepEqual(
  await refresh.readYouTubeOAuthCredentialRefreshStatus({
    credentialStatus: expiredStatus,
    trustedRefreshRuntime: {
      async refreshExpiredCredential() {
        return {
          status: "refresh-failed",
          reason: "provider-rejected-refresh",
          providerErrorBody: "never-returned-by-design"
        };
      }
    }
  }),
  {
    status: "reconnect-required",
    credentialReferenceId: "ytcred_refresh_reference_001",
    provider: "youtube",
    reason: "refresh-failed",
    scopeLabel: "youtube.readonly",
    scopeSet: ["https://www.googleapis.com/auth/youtube.readonly"],
    expiresAtIso: "2026-06-11T10:00:00.000Z",
    expiryStatus: "expired",
    revoked: false,
    revokedAtIso: null,
    reconnectRequired: true,
    reconnectGuidance: "reconnect-youtube",
    refreshAttempted: true,
    refreshStatus: "refresh-failed",
    providerErrorBody: "never-returned-by-design"
  },
  "refresh failure returns sanitized reconnect guidance without provider body"
);

assert.deepEqual(
  await refresh.readYouTubeOAuthCredentialRefreshStatus({
    credentialStatus: expiredStatus,
    trustedRefreshRuntime: {
      async refreshExpiredCredential(request) {
        assert.deepEqual(
          Object.keys(request).sort(),
          ["credentialReferenceId", "requiredScope"].sort(),
          "refresh runtime request excludes owner id values, provider ids, token values, ciphertext, and provider target metadata"
        );
        return {
          status: "refreshed",
          credentialStatus: {
            ...activeStatus,
            expiresAtIso: "2026-06-11T16:00:00.000Z"
          }
        };
      }
    }
  }),
  {
    status: "available",
    credentialReferenceId: "ytcred_refresh_reference_001",
    provider: "youtube",
    scopeLabel: "youtube.readonly",
    scopeSet: ["https://www.googleapis.com/auth/youtube.readonly"],
    expiresAtIso: "2026-06-11T16:00:00.000Z",
    expiryStatus: "active",
    revoked: false,
    revokedAtIso: null,
    reconnectRequired: false,
    reconnectGuidance: "none",
    refreshAttempted: true,
    refreshStatus: "refreshed"
  },
  "successful refresh returns sanitized available status only"
);

assert.deepEqual(
  await statusBoundary.readYouTubeOAuthCredentialStatus({
    credentialReferenceId: "ytcred_refresh_reference_001",
    trustedAdapter: {
      async getCredentialStatus() {
        return expiredStatus;
      }
    },
    trustedRefreshRuntime: {
      async refreshExpiredCredential() {
        return {
          status: "refresh-failed",
          reason: "provider-unavailable",
          providerErrorBody: "never-returned-by-design"
        };
      }
    },
    callerAuthorization: {
      status: "authorized",
      ownerUserId: "server-only-owner-reference"
    },
    credentialResolutionDisabled: false
  }),
  {
    status: "reconnect-required",
    credentialReferenceId: "ytcred_refresh_reference_001",
    provider: "youtube",
    reason: "refresh-failed",
    scopeLabel: "youtube.readonly",
    scopeSet: ["https://www.googleapis.com/auth/youtube.readonly"],
    expiresAtIso: "2026-06-11T10:00:00.000Z",
    expiryStatus: "expired",
    revoked: false,
    revokedAtIso: null,
    reconnectRequired: true,
    reconnectGuidance: "reconnect-youtube",
    refreshAttempted: true,
    refreshStatus: "refresh-failed",
    providerErrorBody: "never-returned-by-design"
  },
  "status boundary maps refresh failures to browser-safe reconnect-required status"
);

for (const payload of [
  refresh.createYouTubeOAuthCredentialRefreshBrowserReadableStatus(activeStatus, {
    refreshAttempted: false,
    refreshStatus: "not-needed"
  }),
  await refresh.readYouTubeOAuthCredentialRefreshStatus({
    credentialStatus: expiredStatus,
    trustedRefreshRuntime: null
  })
]) {
  const serialized = JSON.stringify(payload);
  assert.doesNotMatch(
    serialized,
    /providerChannel|ownerUser|liveChatId|access_token|refresh_token|authorization_code|Authorization|service_role|ciphertext|decrypt|server-only-provider-channel-reference|provider raw/i,
    "browser-readable refresh payload excludes sensitive values and server-only references"
  );
}

const allowedChangedFiles = new Set([
  refreshPath,
  statusBoundaryPath,
  "lib/comment-translator-youtube-credential-status-ui-wiring.ts",
  statusRoutePath,
  statusActionPath,
  "scripts/comment-translator-youtube-token-refresh-reconnect-status-contract.mjs",
  "scripts/comment-translator-youtube-credential-status-ui-wiring-contract.mjs",
  "scripts/comment-translator-youtube-token-store-supabase-adapter-status-contract.mjs",
  taskPath
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `Task 5 change stays in allowed files: ${file}`);
  const source = read(file);
  assert.doesNotMatch(
    source,
    /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY/i,
    `${file} does not contain OAuth token values, authorization codes, private keys, or service role key values`
  );
}

console.log("comment translator YouTube token refresh reconnect status contract checks passed");
