import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();

const migrationPath = "supabase/migrations/20260601000000_youtube_oauth_credentials.sql";
const runtimePath = "lib/comment-translator-youtube-token-store-runtime.ts";
const foundationPath = "lib/comment-translator-youtube-oauth-token-store-foundation.ts";
const blockerMemoPath = "docs/future/COMMENT_TRANSLATOR_YOUTUBE_TOKEN_STORE_BLOCKER_RESOLUTION.md";
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

assert.ok(exists(migrationPath), "YouTube OAuth credential SQL migration exists");
assert.ok(exists(runtimePath), "server-only YouTube token store runtime skeleton exists");
assert.ok(exists(foundationPath), "YouTube OAuth token store foundation remains available");
assert.ok(exists(blockerMemoPath), "YouTube encrypted token store blocker resolution memo exists");

const migration = read(migrationPath);
const runtimeSource = read(runtimePath);
const foundationSource = read(foundationPath);
const blockerMemo = read(blockerMemoPath);
const taskSource = read(taskPath);
const componentSource = read("components/comment-translator/CommentTranslatorDock.tsx");
const routeSource = read("app/tools/comment-translator/page.tsx");
const providerBoundarySource = read("lib/comment-translator-provider-boundary.ts");
const deeplProviderSource = read("lib/comment-translator-deepl-provider.ts");

assert.match(runtimeSource, /^import "server-only";/m, "token persistence runtime is server-only");
assert.match(foundationSource, /youtubeEncryptedTokenStoreSeparateApprovedMigrationPrReviewGate/, "final review gate boundary remains in place");

for (const exportedType of [
  "YouTubeOAuthCredentialPersistenceDraft",
  "YouTubeOAuthCredentialPersistenceResult",
  "YouTubeOAuthCredentialStore",
  "YouTubeOAuthCredentialSanitizedStatus"
]) {
  assert.match(runtimeSource, new RegExp(`export type ${exportedType}\\b`), `runtime exports ${exportedType}`);
}

for (const exportedConstOrFunction of [
  "youtubeOAuthCredentialTokenStoreRuntimeContract",
  "youtubeOAuthTokenStoreKeyManagementReferences",
  "createYouTubeOAuthCredentialPersistenceDraft",
  "persistYouTubeOAuthCredentialReference",
  "invalidateYouTubeOAuthCredentialReference",
  "isYouTubeOAuthCredentialResolutionDisabled"
]) {
  assert.match(
    runtimeSource,
    new RegExp(`export (?:const|function|async function) ${exportedConstOrFunction}\\b`),
    `runtime exports ${exportedConstOrFunction}`
  );
}

assert.doesNotMatch(
  `${componentSource}\n${routeSource}`,
  /comment-translator-youtube-token-store-runtime|comment-translator-youtube-oauth-token-store-foundation|comment-translator-youtube-api-adapter|comment-translator-youtube-runtime-foundation|youtube\.googleapis|OAuth2Client|GoogleAuth|refresh_token|access_token|localStorage|indexedDB/,
  "client component and route shell are not coupled to token store, Google API, or polling runtime"
);
assert.doesNotMatch(
  `${providerBoundarySource}\n${deeplProviderSource}`,
  /comment-translator-youtube-token-store-runtime|comment-translator-youtube-oauth-token-store-foundation|comment-translator-youtube-api-adapter|comment-translator-youtube-runtime-foundation/,
  "translation provider modules do not import YouTube token store or runtime modules"
);

for (const fragment of [
  "create table if not exists public.youtube_oauth_credentials",
  "owner_user_id uuid not null references auth.users",
  "credential_reference_id text not null",
  "provider text not null",
  "provider_channel_id text not null",
  "scope_set text[] not null",
  "expires_at timestamptz not null",
  "revoked_at timestamptz",
  "access_token_ciphertext_ref text not null",
  "refresh_token_ciphertext_ref text not null",
  "encryption_key_version text not null",
  "encryption_key_ref text not null"
]) {
  assert.match(migration, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `migration includes ${fragment}`);
}

assert.ok(
  migration.indexOf("alter table public.youtube_oauth_credentials enable row level security") <
    migration.indexOf("create policy \"youtube_oauth_credentials_service_role_all\""),
  "RLS is enabled before trusted-server policy"
);
assert.match(migration, /revoke all on table public\.youtube_oauth_credentials from anon/i, "anon receives no direct table access");
assert.match(migration, /revoke all on table public\.youtube_oauth_credentials from authenticated/i, "authenticated browser clients receive no direct table access");
assert.doesNotMatch(
  migration,
  /grant\s+select[^;]+public\.youtube_oauth_credentials\s+to\s+authenticated/i,
  "browser clients are not granted direct select on encrypted credential rows"
);
assert.match(
  migration,
  /create policy "youtube_oauth_credentials_service_role_all"[\s\S]+for all[\s\S]+to service_role[\s\S]+using \(true\)[\s\S]+with check \(true\)/i,
  "trusted server service role is the only explicit credential row policy"
);
assert.match(migration, /create unique index if not exists youtube_oauth_credentials_reference_key/i, "credential reference lookup index exists");
assert.match(migration, /credential resolution disable/i, "migration comments preserve emergency disable rollback language");
assert.match(migration, /no token value logging/i, "migration comments preserve no token value logging rollback language");

const runtime = loadTsModule(runtimePath);
assert.equal(
  runtime.youtubeOAuthCredentialTokenStoreRuntimeContract.implementationStage,
  "server-only-token-persistence-runtime-skeleton",
  "runtime stage is implementation skeleton"
);
assert.equal(runtime.youtubeOAuthCredentialTokenStoreRuntimeContract.tableName, "youtube_oauth_credentials", "runtime targets the approved table");
assert.equal(runtime.youtubeOAuthCredentialTokenStoreRuntimeContract.tokenValueOutput, "never-returned-by-design", "runtime never returns token values");
assert.equal(runtime.youtubeOAuthCredentialTokenStoreRuntimeContract.clientDecrypt, "forbidden", "client decrypt is forbidden");
assert.equal(runtime.youtubeOAuthCredentialTokenStoreRuntimeContract.googleApiLiveCall, "not-implemented", "runtime does not call Google APIs");
assert.equal(runtime.youtubeOAuthCredentialTokenStoreRuntimeContract.quotaWrite, "not-implemented", "runtime does not write quota");

assert.deepEqual(
  runtime.youtubeOAuthTokenStoreKeyManagementReferences,
  {
    keyReferenceEnv: "YOUTUBE_OAUTH_TOKEN_STORE_KEY_REF",
    keyVersionEnv: "YOUTUBE_OAUTH_TOKEN_STORE_KEY_VERSION",
    credentialResolutionDisabledEnv: "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED",
    managedSecretReference: "managed-secret-or-kms-reference-only",
    secretValueHandling: "never-read-or-printed-by-this-contract",
    clientDecrypt: "forbidden"
  },
  "key management is fixed to env/reference names without secret values"
);

const draft = runtime.createYouTubeOAuthCredentialPersistenceDraft({
  ownerUserId: "00000000-0000-4000-8000-000000000001",
  credentialReferenceId: "ytcred_test_reference_001",
  providerChannelId: "UC_reference_only",
  scopeSet: ["https://www.googleapis.com/auth/youtube.readonly"],
  expiresAtIso: "2026-06-01T15:00:00.000Z",
  accessTokenCiphertextReference: "kms://youtube-token-store/access/credential-reference-only",
  refreshTokenCiphertextReference: "kms://youtube-token-store/refresh/credential-reference-only",
  encryptionKeyReference: "kms://youtube-token-store/key-reference-only",
  encryptionKeyVersion: "v1",
  nowIso: "2026-06-01T14:00:00.000Z"
});

assert.equal(draft.provider, "youtube", "draft provider is YouTube");
assert.equal(draft.credentialReferenceId, "ytcred_test_reference_001", "draft keeps browser-safe reference");
assert.equal(draft.status, "active", "draft starts active");
assert.equal(draft.tokenValue, "never-accepted-by-design", "draft rejects token values");
assert.equal(draft.refreshTokenValue, "never-accepted-by-design", "draft rejects refresh token values");

const capturedRows = [];
const store = {
  async upsertEncryptedCredential(row) {
    capturedRows.push(row);
    return row;
  },
  async markCredentialRevoked(referenceId, reason) {
    return { credentialReferenceId: referenceId, revokedAtIso: "2026-06-01T14:05:00.000Z", reason };
  }
};

const persisted = await runtime.persistYouTubeOAuthCredentialReference({
  draft,
  store,
  credentialResolutionDisabled: false
});

assert.equal(capturedRows.length, 1, "runtime writes one encrypted credential reference row through trusted store");
assert.deepEqual(persisted, {
  status: "persisted",
  credentialReferenceId: "ytcred_test_reference_001",
  provider: "youtube",
  providerChannelId: "UC_reference_only",
  scopeSet: ["https://www.googleapis.com/auth/youtube.readonly"],
  expiresAtIso: "2026-06-01T15:00:00.000Z",
  revoked: false,
  tokenValue: "never-returned-by-design",
  refreshTokenValue: "never-returned-by-design"
});

const disabled = await runtime.persistYouTubeOAuthCredentialReference({
  draft,
  store,
  credentialResolutionDisabled: true
});
assert.equal(disabled.status, "credential-resolution-disabled", "emergency disable prevents token persistence");
assert.equal(capturedRows.length, 1, "emergency disable does not write another row");

const revoked = await runtime.invalidateYouTubeOAuthCredentialReference({
  credentialReferenceId: "ytcred_test_reference_001",
  reason: "rollback-unusable-reference",
  store
});
assert.deepEqual(revoked, {
  status: "revoked",
  credentialReferenceId: "ytcred_test_reference_001",
  revokedAtIso: "2026-06-01T14:05:00.000Z",
  tokenValue: "never-returned-by-design",
  refreshTokenValue: "never-returned-by-design"
});

assert.equal(runtime.isYouTubeOAuthCredentialResolutionDisabled({ YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED: "1" }), true);
assert.equal(runtime.isYouTubeOAuthCredentialResolutionDisabled({ YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED: "false" }), false);

for (const docFragment of [
  "Separate Implementation PR",
  "PR #288",
  "youtube_oauth_credentials",
  "RLS enabled before runtime token write",
  "trusted server runtime",
  "credential resolution disable",
  "reviewed database rollback path",
  "no token value logging",
  "No Google API live call",
  "No client component change"
]) {
  assert.match(blockerMemo, new RegExp(docFragment, "i"), `blocker memo records implementation boundary: ${docFragment}`);
}

for (const taskFragment of [
  "PR #288",
  "YouTube encrypted token store separate implementation",
  "Product owner / Data owner / Security owner",
  "SQL migration",
  "RLS policy",
  "server-only token persistence runtime skeleton",
  "safe live YouTube login / OAuth",
  "Supabase migration / RLS smoke は未実施",
  "幅別確認は不要"
]) {
  assert.match(taskSource, new RegExp(taskFragment, "i"), `task.md records implementation closeout: ${taskFragment}`);
}

const allowedChangedFiles = new Set([
  migrationPath,
  runtimePath,
  "lib/comment-translator-youtube-token-store-supabase-adapter.ts",
  "lib/comment-translator-youtube-credential-status-boundary.ts",
  "lib/comment-translator-youtube-credential-status-ui-wiring.ts",
  "lib/comment-translator-youtube-client-safe-credential-reference-source.ts",
  "app/api/comment-translator/youtube/credential-status/route.ts",
  "app/tools/comment-translator/actions.ts",
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
  "scripts/comment-translator-youtube-oauth-token-store-foundation-contract.mjs",
  "scripts/comment-translator-youtube-api-adapter-token-reference-contract.mjs",
  "scripts/comment-translator-youtube-runtime-foundation-contract.mjs",
  "scripts/comment-translator-youtube-live-runtime-smoke-command-contract.mjs",
  "scripts/comment-translator-youtube-live-runtime-smoke-command.mjs",
  "scripts/comment-translator-youtube-input-boundary-contract.mjs",
  "scripts/comment-translator-server-provider-prototype-contract.mjs",
  "scripts/comment-translator-provider-boundary-contract.mjs",
  "scripts/comment-translator-youtube-token-store-separate-approved-migration-pr-contract.mjs",
  "scripts/comment-translator-youtube-token-store-supabase-adapter-status-contract.mjs",
  "scripts/comment-translator-youtube-token-store-service-role-smoke-readiness-contract.mjs",
  "scripts/comment-translator-youtube-token-store-service-role-smoke-command.mjs",
  "scripts/comment-translator-youtube-token-store-remote-apply-run-contract.mjs",
  "docs/archive/TASK_HISTORY_2026-06.md",
  "lib/comment-translator-youtube-runtime-foundation.ts",

  taskPath
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `implementation PR change stays in allowed files: ${file}`);

  const source = read(file);
  assert.doesNotMatch(
    source,
    /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY/i,
    `${file} does not contain OAuth token values, authorization codes, private keys, or service role key values`
  );
}

console.log("comment translator YouTube token store separate implementation contract checks passed");
