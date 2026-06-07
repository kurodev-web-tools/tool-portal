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
  "YOUTUBE_OAUTH_SMOKE_CREDENTIAL_REFERENCE_ID",
  "YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID",
  "YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID"
];
const requiredTargetMetadataReferences = ["YOUTUBE_LIVE_RUNTIME_SMOKE_TARGET_METADATA_PRESENT"];
const ownerAuthorizationPreflightReference = "YOUTUBE_LIVE_RUNTIME_SMOKE_OWNER_AUTHORIZATION_CONFIRMED";
const youtubeReadonlyOAuthScope = "https://www.googleapis.com/auth/youtube.readonly";

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

function hasReference(name) {
  return typeof process.env[name] === "string" && process.env[name].trim().length > 0;
}

function readReference(name) {
  return process.env[name]?.trim() ?? "";
}

function isPlaceholderReferenceValue(name) {
  const value = readReference(name);
  return /^<.*>$/.test(value) || /\bdo not paste\b/i.test(value) || /\bset locally\b/i.test(value);
}

function isTruthyReference(name) {
  const value = readReference(name).toLowerCase();
  return value === "1" || value === "true" || value === "yes" || value === "confirmed";
}

function writeJson(payload, exitCode) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exitCode = exitCode;
}

function createReferenceReport() {
  const missingEnvReferences = requiredEnvReferences.filter((name) => !hasReference(name));
  const missingFixtureReferences = requiredFixtureReferences.filter((name) => !hasReference(name));
  const missingTargetMetadataReferences = requiredTargetMetadataReferences.filter((name) => !hasReference(name));
  const placeholderReferences = [
    ...requiredEnvReferences,
    ...requiredFixtureReferences,
    ...requiredTargetMetadataReferences,
    ownerAuthorizationPreflightReference
  ].filter((name) => isPlaceholderReferenceValue(name));

  return {
    missingEnvReferences,
    missingFixtureReferences,
    missingTargetMetadataReferences,
    placeholderReferences
  };
}

function createBasePayload() {
  return {
    command: "sanitized-youtube-live-runtime-smoke",
    outputPolicy: "sanitized-metadata-only",
    tokenValue: "never-returned-by-design",
    refreshTokenValue: "never-returned-by-design"
  };
}

function credentialResolutionDisabled() {
  const value = readReference("YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED").toLowerCase();
  return value === "1" || value === "true" || value === "yes" || value === "enabled";
}

function assertSmokeCredentialReference(credentialReferenceId) {
  if (/^smoke-[a-z0-9][a-z0-9_-]{7,}$/i.test(credentialReferenceId)) {
    return true;
  }

  writeJson(
    {
      status: "blocked-unsafe-credential-reference-id",
      ...createBasePayload(),
      requiredCredentialReferenceIdPattern: "smoke-<opaque-non-secret-id>"
    },
    2
  );
  return false;
}

function preflight() {
  const report = createReferenceReport();

  if (
    report.missingEnvReferences.length > 0 ||
    report.missingFixtureReferences.length > 0 ||
    report.missingTargetMetadataReferences.length > 0
  ) {
    return {
      ok: false,
      exitCode: 2,
      payload: {
        status: "blocked-missing-env-fixture-or-target-references",
        ...createBasePayload(),
        missingEnvReferences: report.missingEnvReferences,
        missingFixtureReferences: report.missingFixtureReferences,
        missingTargetMetadataReferences: report.missingTargetMetadataReferences,
        ownerAuthorizationPreflightReference
      }
    };
  }

  if (report.placeholderReferences.length > 0) {
    return {
      ok: false,
      exitCode: 2,
      payload: {
        status: "blocked-placeholder-env-fixture-or-target-references",
        ...createBasePayload(),
        placeholderReferences: report.placeholderReferences
      }
    };
  }

  if (credentialResolutionDisabled()) {
    return {
      ok: false,
      exitCode: 2,
      payload: {
        status: "blocked-credential-resolution-disabled",
        ...createBasePayload(),
        credentialResolutionDisabledEnv: "present-enabled"
      }
    };
  }

  if (!isTruthyReference(ownerAuthorizationPreflightReference)) {
    return {
      ok: false,
      exitCode: 2,
      payload: {
        status: "blocked-owner-authorization-preflight-not-confirmed",
        ...createBasePayload(),
        ownerAuthorizationPreflightReference,
        ownerAuthorizationPreflight: "required-before-owner-verification-or-live-chat-polling"
      }
    };
  }

  const credentialReferenceId = readReference("YOUTUBE_OAUTH_SMOKE_CREDENTIAL_REFERENCE_ID");
  if (!assertSmokeCredentialReference(credentialReferenceId)) {
    return {
      ok: false,
      exitCode: null,
      payload: null
    };
  }

  return {
    ok: true,
    exitCode: 0,
    payload: {
      status: "ready-for-sanitized-youtube-live-runtime-smoke-command",
      ...createBasePayload(),
      credentialReferenceId,
      ownerAuthorizationPreflight: "confirmed-by-reference-only",
      targetMetadata: "present-by-reference-only"
    }
  };
}

async function main() {
  const result = preflight();

  if (!result.ok) {
    if (result.payload) {
      writeJson(result.payload, result.exitCode);
    }
    return;
  }

  if (args.has("--check-env-only")) {
    writeJson(result.payload, 0);
    return;
  }

  if (!args.has("--execute")) {
    writeJson(
      {
        status: "blocked-pending-explicit-execute-flag",
        ...createBasePayload(),
        requiredFlag: "--execute"
      },
      2
    );
    return;
  }

  writeJson(
    {
      ...(await createServerOnlyLiveTokenResolutionPayload(result.payload.credentialReferenceId)),
      ...createBasePayload(),
      ownerAuthorizationPreflight: "confirmed-by-reference-only",
      targetMetadata: "present-by-reference-only",
      safeLiveYouTubeOAuthSmoke: "not-run",
      ownerVerificationSmoke: "not-run",
      liveChatPollingSmoke: "not-run",
      googleApiLiveCall: "not-run",
      remoteMigrationApply: "not-run"
    },
    0
  );
}

await main();

async function createServerOnlyLiveTokenResolutionPayload(credentialReferenceId) {
  const runtime = loadTsModule("lib/comment-translator-youtube-runtime-foundation.ts");
  const ownerUserId = readReference("YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID");
  const providerChannelId = readReference("YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID");
  const expiresAtIso = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const resolution = await runtime.resolveYouTubeLiveTokenForServerFetch({
    credentialReferenceId,
    ownerAuthorization: {
      status: "authorized",
      ownerUserId
    },
    credentialResolutionDisabled: false,
    requiredScope: youtubeReadonlyOAuthScope,
    nowIso: new Date().toISOString(),
    trustedStatusReader: {
      async getCredentialStatus() {
        return {
          credentialReferenceId,
          provider: "youtube",
          providerChannelId,
          scopeLabel: "youtube.readonly",
          scopeSet: [youtubeReadonlyOAuthScope],
          expiresAtIso,
          expiryStatus: "active",
          revoked: false,
          revokedAtIso: null,
          tokenValue: "never-returned-by-design",
          refreshTokenValue: "never-returned-by-design",
          ciphertext: "never-returned-by-design",
          decryptCapability: "forbidden"
        };
      }
    },
    tokenMaterialResolver: {
      async resolveServerOnlyTokenMaterial() {
        return {
          status: "available",
          serverAuthorizationHeader: "command-local-server-only-authorization",
          expiresAtIso
        };
      }
    },
    async consumeServerFetchAuthorization() {
      return {
        serverFetchBinding: "resolved-for-server-fetch"
      };
    }
  });

  return {
    ...resolution,
    serverOnlyLiveTokenResolutionRuntime: "implemented-server-only-sanitized-runtime",
    actualSafeLiveRuntimeSmoke: "not-run-token-resolution-only",
    remoteMigrationApply: "not-run"
  };
}
