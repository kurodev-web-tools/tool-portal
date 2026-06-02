import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const adapterPath = "lib/comment-translator-youtube-token-store-supabase-adapter.ts";
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
  const untracked = execSync("git ls-files --others --exclude-standard", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  })
    .split(/\r?\n/)
    .filter(Boolean);

  return [...new Set([...committedDiff, ...untracked])].map((file) => file.replace(/\\/g, "/"));
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
assert.ok(exists(runtimePath), "server-only token store runtime remains available");
assert.ok(exists(migrationPath), "youtube_oauth_credentials migration remains available");

const adapterSource = read(adapterPath);
const runtimeSource = read(runtimePath);
const migrationSource = read(migrationPath);
const componentSource = read("components/comment-translator/CommentTranslatorDock.tsx");
const routeSource = read("app/tools/comment-translator/page.tsx");
const taskSource = read(taskPath);

assert.match(adapterSource, /^import "server-only";/m, "trusted Supabase adapter boundary is server-only");
assert.doesNotMatch(
  `${componentSource}\n${routeSource}`,
  /comment-translator-youtube-token-store-supabase-adapter|youtube_oauth_credentials|access_token_ciphertext_ref|refresh_token_ciphertext_ref|encryption_key_ref|decrypt|localStorage|indexedDB/i,
  "client component and route shell are not coupled to encrypted row access or decrypt capability"
);
assert.doesNotMatch(
  adapterSource,
  /\baccessToken(Plaintext|Secret)\b|\brefreshToken(Plaintext|Secret)\b|\bauthorizationCode(Value|Plaintext|Secret)\b|oauthAccessToken|oauthRefreshToken|authorization_code|refresh_token\s*[:=]|access_token\s*[:=]|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY/i,
  "adapter source never accepts, returns, or documents OAuth token values, auth codes, private keys, or service role key values"
);
assert.doesNotMatch(
  adapterSource,
  /localStorage\.|indexedDB\.|youtube\.googleapis|OAuth2Client|GoogleAuth|from\s+["']googleapis["']|require\(["']googleapis["']\)|stripe|checkout|gtag|GA4|cookie consent/i,
  "adapter avoids client storage, live Google API calls, provider coupling, quota, billing, and analytics integration"
);

for (const exportedType of [
  "YouTubeOAuthCredentialSupabaseRow",
  "YouTubeOAuthCredentialSupabaseInsert",
  "YouTubeOAuthCredentialSupabaseStatus",
  "TrustedYouTubeOAuthCredentialSupabaseClient",
  "TrustedYouTubeOAuthCredentialSupabaseAdapter"
]) {
  assert.match(adapterSource, new RegExp(`export type ${exportedType}\\b`), `adapter exports ${exportedType}`);
}

for (const exportedConstOrFunction of [
  "youtubeOAuthCredentialSupabaseAdapterContract",
  "createYouTubeOAuthCredentialSupabaseInsert",
  "createYouTubeOAuthCredentialSupabaseStatus",
  "createTrustedYouTubeOAuthCredentialSupabaseAdapter"
]) {
  assert.match(
    adapterSource,
    new RegExp(`export (?:const|function) ${exportedConstOrFunction}\\b`),
    `adapter exports ${exportedConstOrFunction}`
  );
}

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

for (const event of events) {
  const serialized = JSON.stringify(event);
  assert.doesNotMatch(serialized, /oauthAccessToken|oauthRefreshToken|authorizationCode|secretValue|SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY/i);
}

assert.match(taskSource, /trusted Supabase adapter \/ credential sanitized status boundary/i, "task.md records this follow-up");
assert.match(taskSource, /PR #289.*merge/i, "task.md records the PR #289 merge premise");
assert.match(taskSource, /幅別確認は不要/i, "task.md records why width checks are unnecessary");

const allowedChangedFiles = new Set([
  adapterPath,
  runtimePath,
  "docs/future/COMMENT_TRANSLATOR_YOUTUBE_TOKEN_STORE_BLOCKER_RESOLUTION.md",
  "scripts/comment-translator-youtube-token-store-approved-migration-proposal-contract.mjs",
  "scripts/comment-translator-youtube-token-store-blocker-resolution-contract.mjs",
  "scripts/comment-translator-youtube-token-store-explicit-approval-collection-contract.mjs",
  "scripts/comment-translator-youtube-token-store-schema-key-approval-contract.mjs",
  "scripts/comment-translator-youtube-token-store-separate-migration-readiness-contract.mjs",
  "scripts/comment-translator-youtube-token-store-supabase-adapter-status-contract.mjs",
  "scripts/comment-translator-youtube-token-store-separate-approved-migration-pr-contract.mjs",
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
