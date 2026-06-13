#!/usr/bin/env node
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const root = process.cwd();
const args = new Set(process.argv.slice(2));

const requiredEnvReferences = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED"
];
const requiredFixtureReferences = [
  "YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID",
  "YOUTUBE_OAUTH_SMOKE_CREDENTIAL_REFERENCE_ID",
  "YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID"
];

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

const tokenStoreRuntime = loadTsModule("lib/comment-translator-youtube-token-store-runtime.ts");
const supabaseAdapter = loadTsModule("lib/comment-translator-youtube-token-store-supabase-adapter.ts");
const statusBoundary = loadTsModule("lib/comment-translator-youtube-credential-status-boundary.ts");

function hasEnvReference(name) {
  return typeof process.env[name] === "string" && process.env[name].trim().length > 0;
}

function isPlaceholderReferenceValue(name) {
  const value = process.env[name]?.trim() ?? "";
  return /^<.*>$/.test(value) || /\bdo not paste\b/i.test(value) || /\bset locally\b/i.test(value);
}

function readRequiredReference(name) {
  return process.env[name]?.trim() ?? "";
}

function writeJson(payload, exitCode) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exitCode = exitCode;
}

function createReferenceReport() {
  const missingEnvReferences = requiredEnvReferences.filter((name) => !hasEnvReference(name));
  const missingFixtureReferences = requiredFixtureReferences.filter((name) => !hasEnvReference(name));
  const placeholderReferences = [...requiredEnvReferences, ...requiredFixtureReferences].filter((name) =>
    isPlaceholderReferenceValue(name)
  );

  return {
    missingEnvReferences,
    missingFixtureReferences,
    placeholderReferences
  };
}

function createBlockedPayload(report, extra = {}) {
  return {
    status: "blocked-missing-env-or-fixture-references",
    command: "bounded-service-role-status-persistence-smoke",
    missingEnvReferences: report.missingEnvReferences,
    missingFixtureReferences: report.missingFixtureReferences,
    outputPolicy: "sanitized-metadata-only",
    tokenValue: "never-returned-by-design",
    refreshTokenValue: "never-returned-by-design",
    ...extra
  };
}

function assertSmokeCredentialReference(credentialReferenceId) {
  if (!/^smoke-[a-z0-9][a-z0-9_-]{7,}$/i.test(credentialReferenceId)) {
    writeJson(
      {
        status: "blocked-unsafe-credential-reference-id",
        command: "bounded-service-role-status-persistence-smoke",
        requiredCredentialReferenceIdPattern: "smoke-<opaque-non-secret-id>",
        outputPolicy: "sanitized-metadata-only",
        tokenValue: "never-returned-by-design",
        refreshTokenValue: "never-returned-by-design"
      },
      2
    );
    return false;
  }

  return true;
}

function createSanitizedSuccessPayload({ persistenceStatus, browserStatus }) {
  return {
    status: "passed",
    command: "bounded-service-role-status-persistence-smoke",
    persistenceStatus,
    readStatus: browserStatus.status,
    credentialReferenceId: browserStatus.credentialReferenceId,
    provider: browserStatus.provider,
    scopeLabel: browserStatus.status === "available" ? browserStatus.scopeLabel : null,
    expiryStatus: browserStatus.status === "available" ? browserStatus.expiryStatus : null,
    revoked: browserStatus.status === "available" ? browserStatus.revoked : null,
    reconnectRequired: browserStatus.reconnectRequired,
    outputPolicy: "sanitized-metadata-only",
    tokenValue: "never-returned-by-design",
    refreshTokenValue: "never-returned-by-design",
    googleApiLiveCall: "not-run",
    youtubeOAuthLiveSmoke: "not-run",
    remoteMigrationApply: "not-run"
  };
}

async function main() {
  const referenceReport = createReferenceReport();
  if (referenceReport.missingEnvReferences.length > 0 || referenceReport.missingFixtureReferences.length > 0) {
    writeJson(createBlockedPayload(referenceReport), 2);
    return;
  }
  if (referenceReport.placeholderReferences.length > 0) {
    writeJson(
      {
        status: "blocked-placeholder-env-or-fixture-references",
        command: "bounded-service-role-status-persistence-smoke",
        placeholderReferences: referenceReport.placeholderReferences,
        outputPolicy: "sanitized-metadata-only",
        tokenValue: "never-returned-by-design",
        refreshTokenValue: "never-returned-by-design"
      },
      2
    );
    return;
  }

  const credentialResolutionDisabled = tokenStoreRuntime.isYouTubeOAuthCredentialResolutionDisabled(process.env);
  if (credentialResolutionDisabled) {
    writeJson(
      {
        status: "blocked-credential-resolution-disabled",
        command: "bounded-service-role-status-persistence-smoke",
        credentialResolutionDisabledEnv: "present-enabled",
        outputPolicy: "sanitized-metadata-only",
        tokenValue: "never-returned-by-design",
        refreshTokenValue: "never-returned-by-design"
      },
      2
    );
    return;
  }

  const credentialReferenceId = readRequiredReference("YOUTUBE_OAUTH_SMOKE_CREDENTIAL_REFERENCE_ID");
  if (!assertSmokeCredentialReference(credentialReferenceId)) {
    return;
  }

  if (args.has("--check-env-only")) {
    writeJson(
      {
        status: "ready-for-bounded-service-role-smoke-command",
        command: "bounded-service-role-status-persistence-smoke",
        credentialReferenceId,
        outputPolicy: "sanitized-metadata-only",
        tokenValue: "never-returned-by-design",
        refreshTokenValue: "never-returned-by-design"
      },
      0
    );
    return;
  }

  if (!args.has("--execute")) {
    writeJson(
      {
        status: "blocked-pending-explicit-execute-flag",
        command: "bounded-service-role-status-persistence-smoke",
        requiredFlag: "--execute",
        outputPolicy: "sanitized-metadata-only",
        tokenValue: "never-returned-by-design",
        refreshTokenValue: "never-returned-by-design"
      },
      2
    );
    return;
  }

  const ownerUserId = readRequiredReference("YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID");
  const providerChannelId = readRequiredReference("YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID");
  const nowIso = new Date().toISOString();
  const expiresAtIso = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const draft = tokenStoreRuntime.createYouTubeOAuthCredentialPersistenceDraft({
    ownerUserId,
    credentialReferenceId,
    providerChannelId,
    scopeSet: tokenStoreRuntime.youtubeOAuthCredentialDefaultScopeSet,
    expiresAtIso,
    accessTokenCiphertextReference: `smoke-ciphertext-reference:${credentialReferenceId}:access`,
    refreshTokenCiphertextReference: `smoke-ciphertext-reference:${credentialReferenceId}:refresh`,
    encryptionKeyReference: "smoke-managed-key-reference",
    encryptionKeyVersion: "smoke-v1",
    nowIso
  });

  try {
    const persistenceRuntime = supabaseAdapter.createTrustedYouTubeOAuthCredentialSupabasePersistenceRuntime();
    const statusReader = supabaseAdapter.createTrustedYouTubeOAuthCredentialSupabaseStatusReader();

    if (persistenceRuntime.status !== "ready" || statusReader.status !== "ready") {
      writeJson(
        createBlockedPayload({
          missingEnvReferences: [
            ...(persistenceRuntime.missingEnvReferences ?? []),
            ...(statusReader.missingEnvReferences ?? [])
          ],
          missingFixtureReferences: []
        }),
        2
      );
      return;
    }

    const persisted = await tokenStoreRuntime.persistYouTubeOAuthCredentialReference({
      draft,
      store: persistenceRuntime.trustedStore,
      credentialResolutionDisabled: false
    });
    const browserStatus = await statusBoundary.readYouTubeOAuthCredentialStatus({
      credentialReferenceId,
      trustedAdapter: statusReader.trustedAdapter,
      callerAuthorization: statusBoundary.authorizeYouTubeOAuthCredentialStatusCaller({
        callerUserId: ownerUserId
      }),
      credentialResolutionDisabled: false
    });

    writeJson(
      createSanitizedSuccessPayload({
        persistenceStatus: persisted.status,
        browserStatus
      }),
      browserStatus.status === "available" ? 0 : 1
    );
  } catch {
    writeJson(
      {
        status: "failed-sanitized",
        command: "bounded-service-role-status-persistence-smoke",
        reason: "trusted-service-role-smoke-query-or-write-failed",
        outputPolicy: "sanitized-metadata-only",
        tokenValue: "never-returned-by-design",
        refreshTokenValue: "never-returned-by-design",
        googleApiLiveCall: "not-run",
        youtubeOAuthLiveSmoke: "not-run",
        remoteMigrationApply: "not-run"
      },
      1
    );
  }
}

await main();
