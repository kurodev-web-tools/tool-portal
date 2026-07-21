import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const disconnectPath = "lib/comment-translator-youtube-disconnect-runtime.ts";
const statusBoundaryPath = "lib/comment-translator-youtube-credential-status-boundary.ts";
const adapterPath = "lib/comment-translator-youtube-token-store-supabase-adapter.ts";
const routePath = "app/api/comment-translator/youtube/disconnect/route.ts";
const actionPath = "app/tools/comment-translator/actions.ts";
const accountActionPath = "app/account/actions.ts";
const accountShellPath = "components/account/AccountIntegrationsShell.tsx";
const taskPath = "task.md";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function changedFiles() {
  const committedDiff = execSync("git diff --name-only archive/comment-translator-preview-2026-07-21...HEAD", {
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

assert.ok(exists(disconnectPath), "server-only disconnect/revocation runtime exists");
assert.ok(exists(statusBoundaryPath), "credential status boundary remains available");
assert.ok(exists(adapterPath), "trusted Supabase adapter remains available");
assert.ok(exists(routePath), "disconnect route exists");
assert.ok(exists(actionPath), "comment translator server action surface remains available");
assert.ok(exists(accountActionPath), "account integration action surface remains available");

const disconnectSource = read(disconnectPath);
const statusBoundarySource = read(statusBoundaryPath);
const adapterSource = read(adapterPath);
const routeSource = read(routePath);
const actionSource = read(actionPath);
const accountActionSource = read(accountActionPath);
const accountShellSource = read(accountShellPath);

assert.match(disconnectSource, /^import "server-only";/m, "disconnect runtime is server-only");
assert.match(routeSource, /POST/, "disconnect route uses a POST handler");
assert.match(routeSource, /readYouTubeOAuthCredentialDisconnectResult/, "route uses the sanitized disconnect boundary");
assert.match(actionSource, /disconnectYouTubeOAuthCredentialAction/, "server action exposes credential disconnect");
assert.match(actionSource, /readYouTubeOAuthCredentialDisconnectResult/, "server action uses the sanitized disconnect boundary");
assert.match(accountActionSource, /disconnectYouTubeIntegrationAction/, "account integration keeps a disconnect action boundary");
assert.match(adapterSource, /disconnectCredentialStatus/, "trusted adapter exposes an owner-authorized disconnect method");
assert.match(adapterSource, /\.eq\("owner_user_id"/, "trusted disconnect cleanup filters by owner before credential reference");
assert.doesNotMatch(
  accountShellSource,
  /localStorage\.|indexedDB\.|sessionStorage\.|name=["'](?:ownerUserId|providerChannelId|liveChatId|authorizationHeader|serviceRoleKey)["']/i,
  "account integration shell does not add browser storage or hidden sensitive payload fields"
);

for (const source of [disconnectSource, routeSource, actionSource, accountActionSource, adapterSource, statusBoundarySource]) {
  assert.doesNotMatch(
    source,
    /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY|providerErrorBody:\s*error/i,
    "disconnect boundary source does not contain token values, authorization header values, private keys, service role key values, or provider raw error bodies"
  );
}

assert.doesNotMatch(
  `${disconnectSource}\n${routeSource}\n${actionSource}\n${accountActionSource}`,
  /youtube\.googleapis|OAuth2Client|GoogleAuth|from\s+["']googleapis["']|require\(["']googleapis["']\)|localStorage\.|indexedDB\.|sessionStorage\.|liveChatMessages|stripe|checkout|gtag|GA4/i,
  "Task 6 disconnect boundary avoids live provider execution, browser storage, polling, quota, billing, and analytics changes"
);

const disconnect = loadTsModule(disconnectPath);
const statusBoundary = loadTsModule(statusBoundaryPath);

assert.equal(
  disconnect.youtubeOAuthCredentialDisconnectRuntimeContract.implementationStage,
  "server-only-disconnect-revocation-runtime",
  "disconnect runtime contract records Task 6 implementation stage"
);
assert.equal(disconnect.youtubeOAuthCredentialDisconnectRuntimeContract.runtime, "server-only");
assert.equal(
  disconnect.youtubeOAuthCredentialDisconnectRuntimeContract.browserReadableOutput,
  "sanitized-disconnect-status-only",
  "disconnect runtime exposes sanitized browser status only"
);
assert.deepEqual(
  disconnect.youtubeOAuthCredentialDisconnectRuntimeContract.safeStates,
  ["disconnected", "already-disconnected", "disconnect-unavailable", "disconnect-failed"],
  "disconnect runtime safe states are bounded"
);
assert.equal(
  disconnect.youtubeOAuthCredentialDisconnectRuntimeContract.tokenValueOutput,
  "never-returned-by-design",
  "disconnect runtime never returns token values"
);
assert.equal(
  disconnect.youtubeOAuthCredentialDisconnectRuntimeContract.liveProviderExecution,
  "not-run-by-default-route-or-action",
  "disconnect route/action do not perform live provider execution"
);

const activeStatus = {
  credentialReferenceId: "ytcred_disconnect_reference_001",
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
const revokedStatus = {
  ...activeStatus,
  expiryStatus: "revoked",
  revoked: true,
  revokedAtIso: "2026-06-11T14:05:00.000Z"
};

let readCount = 0;
let revokeCount = 0;
const revoked = await disconnect.readYouTubeOAuthCredentialDisconnectResult({
  credentialReferenceId: "ytcred_disconnect_reference_001",
  callerAuthorization: {
    status: "authorized",
    ownerUserId: "server-only-owner-reference"
  },
  credentialResolutionDisabled: false,
  trustedDisconnectAdapter: {
    async getCredentialStatus(request) {
      readCount += 1;
      assert.deepEqual(Object.keys(request).sort(), ["credentialReferenceId", "ownerUserId"].sort());
      return activeStatus;
    },
    async disconnectCredentialStatus(request) {
      revokeCount += 1;
      assert.deepEqual(Object.keys(request).sort(), ["credentialReferenceId", "ownerUserId", "reason"].sort());
      assert.equal(request.reason, "user-disconnect");
      return revokedStatus;
    }
  }
});

assert.equal(readCount, 1, "disconnect reads owned credential status once");
assert.equal(revokeCount, 1, "disconnect revokes active credential once");
assert.deepEqual(
  revoked,
  {
    status: "disconnected",
    credentialReferenceId: "ytcred_disconnect_reference_001",
    provider: "youtube",
    revocationStatus: "revoked",
    revokedAtIso: "2026-06-11T14:05:00.000Z",
    reconnectRequired: true,
    reconnectGuidance: "reconnect-youtube",
    tokenValue: "never-returned-by-design",
    refreshTokenValue: "never-returned-by-design",
    providerErrorBody: "never-returned-by-design",
    auditEvent: {
      type: "youtube-oauth-credential-disconnect",
      provider: "youtube",
      credentialReferenceId: "ytcred_disconnect_reference_001",
      outcome: "revoked",
      actor: "authenticated-owner",
      ownerUserIdValue: "server-only-not-returned",
      tokenValue: "never-returned-by-design",
      providerTargetMetadata: "forbidden"
    }
  },
  "active credential disconnect returns sanitized revoked state and audit-safe event shape"
);

let repeatedRevokeCount = 0;
assert.deepEqual(
  await disconnect.readYouTubeOAuthCredentialDisconnectResult({
    credentialReferenceId: "ytcred_disconnect_reference_001",
    callerAuthorization: {
      status: "authorized",
      ownerUserId: "server-only-owner-reference"
    },
    credentialResolutionDisabled: false,
    trustedDisconnectAdapter: {
      async getCredentialStatus() {
        return revokedStatus;
      },
      async disconnectCredentialStatus() {
        repeatedRevokeCount += 1;
        throw new Error("repeated disconnect must not update an already revoked credential");
      }
    }
  }),
  {
    status: "already-disconnected",
    credentialReferenceId: "ytcred_disconnect_reference_001",
    provider: "youtube",
    revocationStatus: "already-revoked",
    revokedAtIso: "2026-06-11T14:05:00.000Z",
    reconnectRequired: true,
    reconnectGuidance: "reconnect-youtube",
    tokenValue: "never-returned-by-design",
    refreshTokenValue: "never-returned-by-design",
    providerErrorBody: "never-returned-by-design",
    auditEvent: {
      type: "youtube-oauth-credential-disconnect",
      provider: "youtube",
      credentialReferenceId: "ytcred_disconnect_reference_001",
      outcome: "already-revoked",
      actor: "authenticated-owner",
      ownerUserIdValue: "server-only-not-returned",
      tokenValue: "never-returned-by-design",
      providerTargetMetadata: "forbidden"
    }
  },
  "repeated disconnect is idempotent and browser-safe"
);
assert.equal(repeatedRevokeCount, 0, "already revoked credential is not revoked again");

let unauthorizedAdapterCalls = 0;
assert.deepEqual(
  await disconnect.readYouTubeOAuthCredentialDisconnectResult({
    credentialReferenceId: "ytcred_disconnect_reference_001",
    callerAuthorization: {
      status: "unavailable",
      reason: "caller-not-authenticated",
      reconnectRequired: true
    },
    credentialResolutionDisabled: false,
    trustedDisconnectAdapter: {
      async getCredentialStatus() {
        unauthorizedAdapterCalls += 1;
        throw new Error("must not read without owner authorization");
      },
      async disconnectCredentialStatus() {
        unauthorizedAdapterCalls += 1;
        throw new Error("must not write without owner authorization");
      }
    }
  }),
  disconnect.createYouTubeOAuthCredentialDisconnectUnavailablePayload({
    credentialReferenceId: "ytcred_disconnect_reference_001",
    reason: "caller-not-authenticated"
  }),
  "unauthenticated disconnect returns sanitized unavailable before trusted access"
);
assert.equal(unauthorizedAdapterCalls, 0, "unauthenticated disconnect performs no trusted adapter read/write");

assert.deepEqual(
  await disconnect.readYouTubeOAuthCredentialDisconnectResult({
    credentialReferenceId: "ytcred_disconnect_reference_001",
    callerAuthorization: {
      status: "authorized",
      ownerUserId: "server-only-owner-reference"
    },
    credentialResolutionDisabled: true,
    trustedDisconnectAdapter: {
      async getCredentialStatus() {
        throw new Error("disabled boundary must not read");
      },
      async disconnectCredentialStatus() {
        throw new Error("disabled boundary must not write");
      }
    }
  }),
  disconnect.createYouTubeOAuthCredentialDisconnectUnavailablePayload({
    credentialReferenceId: "ytcred_disconnect_reference_001",
    reason: "credential-resolution-disabled"
  }),
  "credential resolution disabled returns sanitized unavailable without server cleanup"
);

assert.equal(
  (
    await disconnect.readYouTubeOAuthCredentialDisconnectResult({
      credentialReferenceId: "ytcred_disconnect_reference_001",
      callerAuthorization: {
        status: "authorized",
        ownerUserId: "server-only-owner-reference"
      },
      credentialResolutionDisabled: false,
      trustedDisconnectAdapter: {
        async getCredentialStatus() {
          return activeStatus;
        },
        async disconnectCredentialStatus() {
          throw new Error("trusted store write failed");
        }
      }
    })
  ).status,
  "disconnect-failed",
  "trusted cleanup failure returns a sanitized disconnect-failed state"
);

assert.deepEqual(
  disconnect.assessYouTubeOAuthCredentialTranslatorStartReadiness(
    statusBoundary.createYouTubeOAuthCredentialBrowserReadableStatus(revokedStatus)
  ),
  {
    status: "blocked-reconnect-required",
    provider: "youtube",
    credentialReferenceId: "ytcred_disconnect_reference_001",
    reason: "revoked",
    translatorStartAllowed: false,
    reconnectGuidance: "reconnect-youtube"
  },
  "revoked credentials cannot be used by translator start readiness"
);
assert.equal(
  disconnect.assessYouTubeOAuthCredentialTranslatorStartReadiness(
    statusBoundary.createYouTubeOAuthCredentialBrowserReadableStatus(activeStatus)
  ).translatorStartAllowed,
  true,
  "only sanitized available credentials are usable by translator start readiness"
);

for (const payload of [revoked, revoked.auditEvent]) {
  assert.doesNotMatch(
    JSON.stringify(payload),
    /server-only-owner-reference|server-only-provider-channel-reference|providerChannelId|liveChatId|access_token|refresh_token|authorization_code|Authorization|service_role|ciphertext|decrypt|provider raw/i,
    "disconnect browser/audit payload excludes sensitive values and server-only references"
  );
}

const allowedChangedFiles = new Set([
  disconnectPath,
  statusBoundaryPath,
  adapterPath,
  routePath,
  actionPath,
  accountActionPath,
  "components/account/AccountIntegrationsShell.tsx",
  "lib/comment-translator-youtube-account-integration.ts",
  "scripts/comment-translator-youtube-disconnect-revocation-runtime-contract.mjs",
  taskPath
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `Task 6 change stays in allowed files: ${file}`);
  const source = read(file);
  assert.doesNotMatch(
    source,
    /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY/i,
    `${file} does not contain OAuth token values, authorization codes, authorization header values, private keys, or service role key values`
  );
}

console.log("comment translator YouTube disconnect revocation runtime contract checks passed");
