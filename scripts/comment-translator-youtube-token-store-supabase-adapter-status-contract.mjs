import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const adapterPath = "lib/comment-translator-youtube-token-store-supabase-adapter.ts";
const statusBoundaryPath = "lib/comment-translator-youtube-credential-status-boundary.ts";
const statusRoutePath = "app/api/comment-translator/youtube/credential-status/route.ts";
const statusActionPath = "app/tools/comment-translator/actions.ts";
const runtimePath = "lib/comment-translator-youtube-token-store-runtime.ts";
const migrationPath = "supabase/migrations/20260601000000_youtube_oauth_credentials.sql";
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

assert.ok(exists(adapterPath), "trusted Supabase adapter skeleton exists");
assert.ok(exists(statusBoundaryPath), "credential sanitized status boundary exists");
assert.ok(exists(statusRoutePath), "credential status endpoint skeleton exists");
assert.ok(exists(statusActionPath), "credential status server action skeleton exists");
assert.ok(exists(runtimePath), "server-only token store runtime remains available");
assert.ok(exists(migrationPath), "youtube_oauth_credentials migration remains available");

const adapterSource = read(adapterPath);
const statusBoundarySource = read(statusBoundaryPath);
const statusRouteSource = read(statusRoutePath);
const statusActionSource = read(statusActionPath);
const runtimeSource = read(runtimePath);
const migrationSource = read(migrationPath);
const componentSource = read("components/comment-translator/CommentTranslatorDock.tsx");
const routeSource = read("app/tools/comment-translator/page.tsx");
const taskSource = read(taskPath);

assert.match(adapterSource, /^import "server-only";/m, "trusted Supabase adapter boundary is server-only");
assert.match(statusBoundarySource, /^import "server-only";/m, "credential sanitized status boundary is server-only");
assert.match(statusActionSource, /^"use server";/m, "credential status server action is a server action");
assert.match(statusRouteSource, /NextResponse\.json/, "credential status endpoint returns JSON");
assert.doesNotMatch(
  `${componentSource}\n${routeSource}`,
  /comment-translator-youtube-token-store-supabase-adapter|comment-translator-youtube-credential-status-boundary|youtube_oauth_credentials|access_token_ciphertext_ref|refresh_token_ciphertext_ref|encryption_key_ref|decrypt|localStorage|indexedDB/i,
  "client component and route shell are not coupled to encrypted row access or decrypt capability"
);
assert.doesNotMatch(
  `${adapterSource}\n${statusBoundarySource}\n${statusRouteSource}\n${statusActionSource}`,
  /\baccessToken(Plaintext|Secret)\b|\brefreshToken(Plaintext|Secret)\b|\bauthorizationCode(Value|Plaintext|Secret)\b|oauthAccessToken|oauthRefreshToken|authorization_code|refresh_token\s*[:=]|access_token\s*[:=]|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY/i,
  "credential status boundary never accepts, returns, or documents OAuth token values, auth codes, private keys, or service role key values"
);
assert.doesNotMatch(
  `${adapterSource}\n${statusBoundarySource}\n${statusRouteSource}\n${statusActionSource}`,
  /localStorage\.|indexedDB\.|youtube\.googleapis|OAuth2Client|GoogleAuth|from\s+["']googleapis["']|require\(["']googleapis["']\)|stripe|checkout|gtag|GA4|cookie consent/i,
  "credential status boundary avoids client storage, live Google API calls, provider coupling, quota, billing, and analytics integration"
);

for (const exportedType of [
  "YouTubeOAuthCredentialSupabaseRow",
  "YouTubeOAuthCredentialSupabaseInsert",
  "YouTubeOAuthCredentialSupabaseStatus",
  "YouTubeOAuthCredentialStatusOwnerAuthorizedReadRequest",
  "TrustedYouTubeOAuthCredentialSupabaseClient",
  "TrustedYouTubeOAuthCredentialSupabaseAdapter",
  "TrustedYouTubeOAuthCredentialStatusReaderFactoryEnvName",
  "TrustedYouTubeOAuthCredentialStatusReaderFactoryResult"
]) {
  assert.match(adapterSource, new RegExp(`export type ${exportedType}\\b`), `adapter exports ${exportedType}`);
}

for (const exportedConstOrFunction of [
  "youtubeOAuthCredentialSupabaseAdapterContract",
  "youtubeOAuthCredentialTrustedServiceRoleStatusReaderContract",
  "createYouTubeOAuthCredentialSupabaseInsert",
  "createYouTubeOAuthCredentialSupabaseStatus",
  "createTrustedYouTubeOAuthCredentialSupabaseAdapter",
  "createTrustedYouTubeOAuthCredentialSupabaseStatusReader"
]) {
  assert.match(
    adapterSource,
    new RegExp(`export (?:const|function) ${exportedConstOrFunction}\\b`),
    `adapter exports ${exportedConstOrFunction}`
  );
}

for (const exportedType of [
  "YouTubeOAuthCredentialBrowserReadableStatus",
  "YouTubeOAuthCredentialStatusCallerAuthorization",
  "ReadYouTubeOAuthCredentialStatusRequest"
]) {
  assert.match(statusBoundarySource, new RegExp(`export type ${exportedType}\\b`), `status boundary exports ${exportedType}`);
}

for (const exportedConstOrFunction of [
  "youtubeOAuthCredentialStatusBoundaryContract",
  "authorizeYouTubeOAuthCredentialStatusCaller",
  "createYouTubeOAuthCredentialBrowserReadableStatus",
  "createYouTubeOAuthCredentialStatusUnavailablePayload",
  "readYouTubeOAuthCredentialStatus"
]) {
  assert.match(
    statusBoundarySource,
    new RegExp(`export (?:const|function|async function) ${exportedConstOrFunction}\\b`),
    `status boundary exports ${exportedConstOrFunction}`
  );
}

assert.match(adapterSource, /getCredentialStatus/, "trusted Supabase adapter exposes a server-only status read method");
assert.match(adapterSource, /@supabase\/supabase-js/, "trusted status reader uses Supabase server SDK");
assert.match(adapterSource, /createClient/, "trusted status reader creates a server-only Supabase client");
assert.match(adapterSource, /persistSession:\s*false/, "trusted service-role client does not persist sessions");
assert.match(adapterSource, /autoRefreshToken:\s*false/, "trusted service-role client does not refresh user sessions");
assert.match(statusRouteSource, /YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED/, "endpoint preserves emergency disable boundary");
assert.match(statusRouteSource, /credentialReferenceId/, "endpoint accepts credential reference id only");
assert.match(statusRouteSource, /createServerSupabaseClient/, "endpoint uses the server Supabase client to authenticate the caller");
assert.match(statusRouteSource, /auth\.getUser\(\)/, "endpoint reads the authenticated caller before trusted credential status access");
assert.match(statusRouteSource, /authorizeYouTubeOAuthCredentialStatusCaller/, "endpoint applies owner authorization before credential status access");
assert.match(
  statusRouteSource,
  /createTrustedYouTubeOAuthCredentialSupabaseStatusReader/,
  "endpoint wires the trusted service-role status reader factory"
);
assert.doesNotMatch(statusRouteSource, /trustedAdapter:\s*null/, "endpoint no longer hard-codes an unwired adapter");
assert.match(statusActionSource, /getYouTubeOAuthCredentialStatusAction/, "server action exports credential status skeleton");
assert.match(statusActionSource, /createServerSupabaseClient/, "server action uses the server Supabase client to authenticate the caller");
assert.match(statusActionSource, /auth\.getUser\(\)/, "server action reads the authenticated caller before trusted credential status access");
assert.match(statusActionSource, /authorizeYouTubeOAuthCredentialStatusCaller/, "server action applies owner authorization before credential status access");
assert.match(
  statusActionSource,
  /createTrustedYouTubeOAuthCredentialSupabaseStatusReader/,
  "server action wires the trusted service-role status reader factory"
);
assert.doesNotMatch(statusActionSource, /trustedAdapter:\s*null/, "server action no longer hard-codes an unwired adapter");
assert.doesNotMatch(
  `${statusBoundarySource}\n${statusRouteSource}\n${statusActionSource}`,
  /tokenValue|refreshTokenValue|decryptCapability|access_token_ciphertext_ref|refresh_token_ciphertext_ref|encryption_key_ref/i,
  "browser-readable credential status boundary strips token markers, ciphertext references, and decrypt capability"
);

for (const fragment of [
  "access_token_ciphertext_ref text not null",
  "refresh_token_ciphertext_ref text not null",
  "encryption_key_ref text not null",
  "encryption_key_version text not null",
  "revoke all on table public.youtube_oauth_credentials from anon",
  "revoke all on table public.youtube_oauth_credentials from authenticated",
  "grant all on table public.youtube_oauth_credentials to service_role"
]) {
  assert.match(migrationSource, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `migration preserves ${fragment}`);
}

const runtime = loadTsModule(runtimePath);
const adapter = loadTsModule(adapterPath);
const statusBoundary = loadTsModule(statusBoundaryPath);

assert.equal(
  adapter.youtubeOAuthCredentialSupabaseAdapterContract.tableName,
  "youtube_oauth_credentials",
  "adapter targets the approved table"
);
assert.equal(
  adapter.youtubeOAuthCredentialSupabaseAdapterContract.rowAccess,
  "trusted-server-service-role-only",
  "adapter row access is trusted server only"
);
assert.equal(
  adapter.youtubeOAuthCredentialSupabaseAdapterContract.browserReadableOutput,
  "sanitized-status-only",
  "adapter exposes sanitized status only"
);
assert.equal(
  adapter.youtubeOAuthCredentialSupabaseAdapterContract.decryptCapability,
  "forbidden-to-client-and-not-implemented",
  "adapter does not expose decrypt capability"
);
assert.equal(
  adapter.youtubeOAuthCredentialSupabaseAdapterContract.emergencyDisableEnv,
  "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED",
  "adapter preserves emergency disable reference"
);
assert.deepEqual(
  adapter.youtubeOAuthCredentialTrustedServiceRoleStatusReaderContract.requiredEnvReferences,
  ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  "trusted status reader records env references without values"
);
assert.equal(
  adapter.youtubeOAuthCredentialTrustedServiceRoleStatusReaderContract.unavailableState,
  "sanitized-unavailable-reconnect-required",
  "trusted status reader falls back to sanitized unavailable state"
);
assert.equal(
  adapter.youtubeOAuthCredentialTrustedServiceRoleStatusReaderContract.outputTokenValues,
  "never-returned-by-design",
  "trusted status reader never returns token values"
);
assert.equal(
  statusBoundary.youtubeOAuthCredentialStatusBoundaryContract.browserReadableOutput,
  "credential-status-metadata-only",
  "status boundary exposes only credential metadata"
);
assert.equal(
  statusBoundary.youtubeOAuthCredentialStatusBoundaryContract.authorizationBoundary,
  "caller-must-own-credential-before-status-read",
  "status boundary requires owner authorization before credential status read"
);
assert.deepEqual(
  statusBoundary.youtubeOAuthCredentialStatusBoundaryContract.authorizationFailureState,
  ["auth-unavailable", "caller-not-authenticated"],
  "status boundary documents sanitized authorization failure states"
);
assert.deepEqual(
  statusBoundary.youtubeOAuthCredentialStatusBoundaryContract.forbiddenBrowserOutput,
  [
    "encrypted-row",
    "ciphertext-reference",
    "decrypt-capability",
    "service-role-key",
    "managed-secret-value",
    "oauth-token-value",
    "authorization-code-value"
  ],
  "status boundary documents forbidden browser output"
);

const draft = runtime.createYouTubeOAuthCredentialPersistenceDraft({
  ownerUserId: "00000000-0000-4000-8000-000000000001",
  credentialReferenceId: "ytcred_status_reference_001",
  providerChannelId: "UC_status_reference_only",
  scopeSet: ["https://www.googleapis.com/auth/youtube.readonly"],
  expiresAtIso: "2026-06-02T15:00:00.000Z",
  accessTokenCiphertextReference: "kms://youtube-token-store/access/status-reference-only",
  refreshTokenCiphertextReference: "kms://youtube-token-store/refresh/status-reference-only",
  encryptionKeyReference: "kms://youtube-token-store/key-reference-only",
  encryptionKeyVersion: "v2",
  nowIso: "2026-06-02T14:00:00.000Z"
});

const insert = adapter.createYouTubeOAuthCredentialSupabaseInsert(draft);
assert.deepEqual(insert, {
  owner_user_id: "00000000-0000-4000-8000-000000000001",
  credential_reference_id: "ytcred_status_reference_001",
  provider: "youtube",
  provider_channel_id: "UC_status_reference_only",
  scope_set: ["https://www.googleapis.com/auth/youtube.readonly"],
  scope_metadata: {
    access: "read-only",
    provider: "youtube"
  },
  expires_at: "2026-06-02T15:00:00.000Z",
  revoked_at: null,
  revocation_reason: null,
  access_token_ciphertext_ref: "kms://youtube-token-store/access/status-reference-only",
  refresh_token_ciphertext_ref: "kms://youtube-token-store/refresh/status-reference-only",
  encryption_key_ref: "kms://youtube-token-store/key-reference-only",
  encryption_key_version: "v2",
  created_at: "2026-06-02T14:00:00.000Z",
  updated_at: "2026-06-02T14:00:00.000Z"
});

const status = adapter.createYouTubeOAuthCredentialSupabaseStatus({
  ...insert,
  id: "00000000-0000-4000-8000-000000000099"
});
assert.deepEqual(status, {
  credentialReferenceId: "ytcred_status_reference_001",
  provider: "youtube",
  providerChannelId: "UC_status_reference_only",
  scopeLabel: "youtube.readonly",
  scopeSet: ["https://www.googleapis.com/auth/youtube.readonly"],
  expiresAtIso: "2026-06-02T15:00:00.000Z",
  expiryStatus: "active",
  revoked: false,
  revokedAtIso: null,
  tokenValue: "never-returned-by-design",
  refreshTokenValue: "never-returned-by-design",
  ciphertext: "never-returned-by-design",
  decryptCapability: "forbidden"
});

const browserStatus = statusBoundary.createYouTubeOAuthCredentialBrowserReadableStatus(status);
assert.deepEqual(browserStatus, {
  status: "available",
  credentialReferenceId: "ytcred_status_reference_001",
  provider: "youtube",
  providerChannelId: "UC_status_reference_only",
  scopeLabel: "youtube.readonly",
  scopeSet: ["https://www.googleapis.com/auth/youtube.readonly"],
  expiresAtIso: "2026-06-02T15:00:00.000Z",
  expiryStatus: "active",
  revoked: false,
  revokedAtIso: null,
  reconnectRequired: false
});
assert.deepEqual(
  Object.keys(browserStatus).sort(),
  [
    "credentialReferenceId",
    "expiresAtIso",
    "expiryStatus",
    "provider",
    "providerChannelId",
    "reconnectRequired",
    "revoked",
    "revokedAtIso",
    "scopeLabel",
    "scopeSet",
    "status"
  ].sort(),
  "browser-readable status has no token, ciphertext, decrypt, secret, quota, or billing fields"
);
assert.equal(
  statusBoundary.createYouTubeOAuthCredentialBrowserReadableStatus({
    ...status,
    expiryStatus: "expired"
  }).reconnectRequired,
  true,
  "expired credentials require reconnect"
);
assert.equal(
  statusBoundary.createYouTubeOAuthCredentialBrowserReadableStatus({
    ...status,
    expiryStatus: "revoked",
    revoked: true,
    revokedAtIso: "2026-06-02T14:05:00.000Z"
  }).reconnectRequired,
  true,
  "revoked credentials require reconnect"
);
assert.deepEqual(
  statusBoundary.createYouTubeOAuthCredentialStatusUnavailablePayload({
    credentialReferenceId: "ytcred_status_reference_001",
    reason: "trusted-adapter-not-wired"
  }),
  {
    status: "unavailable",
    credentialReferenceId: "ytcred_status_reference_001",
    provider: "youtube",
    reason: "trusted-adapter-not-wired",
    reconnectRequired: true
  },
  "unwired skeleton returns sanitized unavailable state"
);
assert.deepEqual(
  statusBoundary.authorizeYouTubeOAuthCredentialStatusCaller({
    callerUserId: "00000000-0000-4000-8000-000000000001"
  }),
  {
    status: "authorized",
    ownerUserId: "00000000-0000-4000-8000-000000000001"
  },
  "caller authorization returns owner id only when an authenticated caller exists"
);
assert.deepEqual(
  statusBoundary.authorizeYouTubeOAuthCredentialStatusCaller({
    callerUserId: null
  }),
  {
    status: "unavailable",
    reason: "caller-not-authenticated",
    reconnectRequired: true
  },
  "missing caller degrades to sanitized reconnect-required state"
);
assert.deepEqual(
  statusBoundary.authorizeYouTubeOAuthCredentialStatusCaller({
    callerUserId: null,
    authUnavailable: true
  }),
  {
    status: "unavailable",
    reason: "auth-unavailable",
    reconnectRequired: true
  },
  "missing auth configuration degrades to sanitized reconnect-required state"
);

assert.equal(
  adapter.createYouTubeOAuthCredentialSupabaseStatus({
    ...insert,
    id: "00000000-0000-4000-8000-000000000099",
    expires_at: "2026-06-02T13:00:00.000Z"
  }).expiryStatus,
  "expired",
  "sanitized status labels expired credentials"
);
assert.equal(
  adapter.createYouTubeOAuthCredentialSupabaseStatus({
    ...insert,
    id: "00000000-0000-4000-8000-000000000099",
    revoked_at: "2026-06-02T14:05:00.000Z",
    revocation_reason: "rollback-unusable-reference"
  }).expiryStatus,
  "revoked",
  "sanitized status labels revoked credentials before expiry"
);

const events = [];
const supabase = {
  from(tableName) {
    events.push({ type: "from", tableName });
    return {
      select(columns) {
        events.push({ type: "select", columns });
        const filteredSelect = {
          eq(column, value) {
            events.push({ type: "eq", column, value });
            return filteredSelect;
          },
          single: async () => ({
            data: {
              ...insert,
              id: "00000000-0000-4000-8000-000000000099",
              revoked_at: "2026-06-02T14:05:00.000Z",
              revocation_reason: "rollback-unusable-reference",
              updated_at: "2026-06-02T14:05:00.000Z"
            },
            error: null
          })
        };
        return filteredSelect;
      },
      upsert(row, options) {
        events.push({ type: "upsert", row, options });
        return {
          select(columns) {
            events.push({ type: "select", columns });
            return {
              single: async () => ({
                data: {
                  ...row,
                  id: "00000000-0000-4000-8000-000000000099"
                },
                error: null
              })
            };
          }
        };
      },
      update(row) {
        events.push({ type: "update", row });
        return {
          eq(column, value) {
            events.push({ type: "eq", column, value });
            return {
              select(columns) {
                events.push({ type: "select", columns });
                return {
                  single: async () => ({
                    data: {
                      ...insert,
                      ...row,
                      id: "00000000-0000-4000-8000-000000000099"
                    },
                    error: null
                  })
                };
              }
            };
          }
        };
      }
    };
  }
};

const trustedAdapter = adapter.createTrustedYouTubeOAuthCredentialSupabaseAdapter({
  supabase,
  nowIso: () => "2026-06-02T14:05:00.000Z"
});

const missingTrustedReader = adapter.createTrustedYouTubeOAuthCredentialSupabaseStatusReader({
  env: {},
  createSupabaseClient: () => {
    throw new Error("trusted client must not be created when env references are missing");
  },
  nowIso: () => "2026-06-02T14:05:00.000Z"
});
assert.deepEqual(
  missingTrustedReader,
  {
    status: "unavailable",
    trustedAdapter: null,
    missingEnvReferences: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    reconnectRequired: true,
    reason: "trusted-service-role-env-missing"
  },
  "trusted status reader reports only missing env references when service-role wiring is unavailable"
);
assert.deepEqual(
  await statusBoundary.readYouTubeOAuthCredentialStatus({
    credentialReferenceId: "ytcred_status_reference_001",
    trustedAdapter: missingTrustedReader.trustedAdapter,
    callerAuthorization: {
      status: "authorized",
      ownerUserId: "00000000-0000-4000-8000-000000000001"
    },
    credentialResolutionDisabled: false
  }),
  {
    status: "unavailable",
    credentialReferenceId: "ytcred_status_reference_001",
    provider: "youtube",
    reason: "trusted-adapter-not-wired",
    reconnectRequired: true
  },
  "missing trusted service-role reader degrades to browser-safe unavailable state"
);

let unauthorizedReadAttempts = 0;
assert.deepEqual(
  await statusBoundary.readYouTubeOAuthCredentialStatus({
    credentialReferenceId: "ytcred_status_reference_001",
    trustedAdapter: {
      getCredentialStatus: async () => {
        unauthorizedReadAttempts += 1;
        throw new Error("trusted adapter must not read before owner authorization");
      }
    },
    callerAuthorization: {
      status: "unavailable",
      reason: "caller-not-authenticated",
      reconnectRequired: true
    },
    credentialResolutionDisabled: false
  }),
  {
    status: "unavailable",
    credentialReferenceId: "ytcred_status_reference_001",
    provider: "youtube",
    reason: "caller-not-authenticated",
    reconnectRequired: true
  },
  "unauthenticated caller gets browser-safe unavailable state before trusted adapter access"
);
assert.equal(unauthorizedReadAttempts, 0, "status boundary never reads credential reference before caller owner authorization");

const readerEvents = [];
const readyTrustedReader = adapter.createTrustedYouTubeOAuthCredentialSupabaseStatusReader({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    [adapter.youtubeOAuthCredentialTrustedServiceRoleStatusReaderContract.requiredEnvReferences[1]]:
      "trusted-env-reference-present"
  },
  createSupabaseClient: (url, serviceRoleKey) => {
    readerEvents.push({ type: "trusted-client-created", url, serviceRoleKeyShape: serviceRoleKey ? "provided" : "missing" });
    return supabase;
  },
  nowIso: () => "2026-06-02T14:05:00.000Z"
});
assert.deepEqual(
  readerEvents,
  [{ type: "trusted-client-created", url: "https://example.supabase.co", serviceRoleKeyShape: "provided" }],
  "trusted status reader creates a service-role client without exposing the service role key value"
);
assert.equal(readyTrustedReader.status, "ready", "trusted status reader is ready when required env references are present");
assert.deepEqual(readyTrustedReader.missingEnvReferences, [], "ready trusted status reader has no missing env references");
assert.equal(typeof readyTrustedReader.trustedAdapter?.getCredentialStatus, "function", "ready trusted status reader exposes status read only");
assert.deepEqual(
  Object.keys(readyTrustedReader.trustedAdapter).sort(),
  ["getCredentialStatus"],
  "trusted status reader exposes only the credential status read method to endpoint and server action"
);

assert.deepEqual(await trustedAdapter.upsertCredentialStatus(draft), status, "trusted adapter upsert returns sanitized status");
assert.deepEqual(events[0], { type: "from", tableName: "youtube_oauth_credentials" }, "trusted adapter uses approved table");
assert.equal(events[1].type, "upsert", "trusted adapter upserts one credential row");
assert.equal(events[1].options.onConflict, "credential_reference_id", "trusted adapter upserts by credential reference only");
assert.equal(events[2].columns, adapter.youtubeOAuthCredentialSupabaseAdapterContract.trustedSelectColumns, "trusted select includes row metadata for server mapping");

const revoked = await trustedAdapter.markCredentialRevokedStatus({
  credentialReferenceId: "ytcred_status_reference_001",
  reason: "rollback-unusable-reference"
});
assert.equal(revoked.revoked, true, "trusted adapter returns revoked sanitized state");
assert.equal(revoked.revokedAtIso, "2026-06-02T14:05:00.000Z", "trusted adapter records revocation timestamp metadata");
assert.equal(revoked.tokenValue, "never-returned-by-design", "revoked status never returns token value");
assert.equal(revoked.ciphertext, "never-returned-by-design", "revoked status never returns ciphertext");

assert.deepEqual(
  await trustedAdapter.getCredentialStatus({
    credentialReferenceId: "ytcred_status_reference_001",
    ownerUserId: "00000000-0000-4000-8000-000000000001"
  }),
  revoked,
  "trusted adapter status read returns sanitized status for the authorized owner"
);
assert.deepEqual(
  await statusBoundary.readYouTubeOAuthCredentialStatus({
    credentialReferenceId: "ytcred_status_reference_001",
    trustedAdapter,
    callerAuthorization: {
      status: "authorized",
      ownerUserId: "00000000-0000-4000-8000-000000000001"
    },
    credentialResolutionDisabled: false
  }),
  {
    status: "available",
    credentialReferenceId: "ytcred_status_reference_001",
    provider: "youtube",
    providerChannelId: "UC_status_reference_only",
    scopeLabel: "youtube.readonly",
    scopeSet: ["https://www.googleapis.com/auth/youtube.readonly"],
    expiresAtIso: "2026-06-02T15:00:00.000Z",
    expiryStatus: "revoked",
    revoked: true,
    revokedAtIso: "2026-06-02T14:05:00.000Z",
    reconnectRequired: true
  },
  "status boundary reads through trusted adapter and returns browser-safe metadata only"
);
assert.deepEqual(
  await statusBoundary.readYouTubeOAuthCredentialStatus({
    credentialReferenceId: "ytcred_status_reference_001",
    trustedAdapter,
    callerAuthorization: {
      status: "authorized",
      ownerUserId: "00000000-0000-4000-8000-000000000001"
    },
    credentialResolutionDisabled: true
  }),
  {
    status: "credential-resolution-disabled",
    credentialReferenceId: "ytcred_status_reference_001",
    provider: "youtube",
    reconnectRequired: true
  },
  "emergency disable returns sanitized reconnect-required state without adapter access"
);

for (const event of events) {
  const serialized = JSON.stringify(event);
  assert.doesNotMatch(serialized, /oauthAccessToken|oauthRefreshToken|authorizationCode|secretValue|SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY/i);
}

assert.match(taskSource, /credential status owner authorization/i, "task.md records this follow-up");
assert.match(taskSource, /PR #292.*merge/i, "task.md records the PR #292 merge premise");
assert.match(taskSource, /幅別確認は不要/i, "task.md records why width checks are unnecessary");

const allowedChangedFiles = new Set([
  "lib/comment-translator-youtube-client-safe-credential-reference-source.ts",
  adapterPath,
  statusBoundaryPath,
  "lib/comment-translator-youtube-credential-status-ui-wiring.ts",
  statusRoutePath,
  statusActionPath,
  runtimePath,
  "docs/future/COMMENT_TRANSLATOR_YOUTUBE_TOKEN_STORE_BLOCKER_RESOLUTION.md",
  "scripts/comment-translator-youtube-client-safe-credential-reference-source-contract.mjs",
  "scripts/comment-translator-youtube-new-client-payload-credential-reference-source-contract.mjs",
  "scripts/comment-translator-youtube-credential-source-decision-contract.mjs",
  "scripts/comment-translator-youtube-credential-reference-surface-source-recheck-contract.mjs",
  "scripts/comment-translator-youtube-credential-reference-surface-approval-evidence-contract.mjs",
  "scripts/comment-translator-youtube-surfaced-credential-reference-source-gate-contract.mjs",
  "scripts/comment-translator-youtube-credential-status-ui-wiring-contract.mjs",
  "scripts/comment-translator-youtube-token-store-approved-migration-proposal-contract.mjs",
  "scripts/comment-translator-youtube-token-store-blocker-resolution-contract.mjs",
  "scripts/comment-translator-youtube-token-store-explicit-approval-collection-contract.mjs",
  "scripts/comment-translator-youtube-token-store-schema-key-approval-contract.mjs",
  "scripts/comment-translator-youtube-token-store-separate-migration-readiness-contract.mjs",
  "scripts/comment-translator-youtube-token-store-supabase-adapter-status-contract.mjs",
  "scripts/comment-translator-youtube-token-store-separate-approved-migration-pr-contract.mjs",
  "docs/archive/TASK_HISTORY_2026-06.md",
  taskPath
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `Supabase adapter status skeleton change stays in allowed files: ${file}`);

  const source = read(file);
  assert.doesNotMatch(
    source,
    /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY/i,
    `${file} does not contain OAuth token values, authorization codes, private keys, or service role key values`
  );
}

console.log("comment translator YouTube token store trusted Supabase adapter + sanitized status contract checks passed");
