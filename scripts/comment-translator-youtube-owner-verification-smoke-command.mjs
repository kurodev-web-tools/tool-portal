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
const ownerVerificationReadyPreflightReference = "YOUTUBE_OWNER_VERIFICATION_SMOKE_READY_PREFLIGHT_CONFIRMED";
const operatorLocalServerAuthorizationHeaderReference =
  "YOUTUBE_OWNER_VERIFICATION_SMOKE_OPERATOR_LOCAL_SERVER_AUTHORIZATION_HEADER";
const operatorLocalTokenExpiresAtIsoReference = "YOUTUBE_OWNER_VERIFICATION_SMOKE_OPERATOR_LOCAL_TOKEN_EXPIRES_AT_ISO";
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

function credentialResolutionDisabled() {
  const value = readReference("YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED").toLowerCase();
  return value === "1" || value === "true" || value === "yes" || value === "enabled";
}

function writeJson(payload, exitCode) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exitCode = exitCode;
}

function createReferenceReport() {
  const missingEnvReferences = requiredEnvReferences.filter((name) => !hasReference(name));
  const missingFixtureReferences = requiredFixtureReferences.filter((name) => !hasReference(name));
  const missingTargetMetadataReferences = requiredTargetMetadataReferences.filter((name) => !hasReference(name));
  const missingOwnerVerificationReadinessReferences = [ownerVerificationReadyPreflightReference].filter(
    (name) => !hasReference(name)
  );
  const placeholderReferences = [
    ...requiredEnvReferences,
    ...requiredFixtureReferences,
    ...requiredTargetMetadataReferences,
    ownerAuthorizationPreflightReference,
    ownerVerificationReadyPreflightReference,
    operatorLocalServerAuthorizationHeaderReference,
    operatorLocalTokenExpiresAtIsoReference
  ].filter((name) => isPlaceholderReferenceValue(name));

  return {
    missingEnvReferences,
    missingFixtureReferences,
    missingTargetMetadataReferences,
    missingOwnerVerificationReadinessReferences,
    placeholderReferences
  };
}

function createBasePayload() {
  const foundation = loadTsModule("lib/comment-translator-youtube-owner-verification-smoke-foundation.ts");
  const contract = foundation.youtubeOwnerVerificationSmokeCommandFoundationContract;

  return {
    command: "sanitized-youtube-owner-verification-smoke",
    outputPolicy: contract.outputPolicy,
    endpoint: contract.endpoint,
    providerUrl: contract.providerUrl,
    httpMethod: contract.httpMethod,
    query: contract.query,
    ownerBindingCheck: contract.ownerBindingCheck,
    authorizationHandling: contract.authorizationHandling,
    requiredApproval: contract.requiredApproval,
    tokenValue: contract.tokenValue,
    refreshTokenValue: contract.refreshTokenValue,
    safeLiveYouTubeOAuthSmoke: "not-run",
    liveChatPollingSmoke: "not-run",
    remoteMigrationApply: "not-run"
  };
}

function assertSmokeCredentialReference(credentialReferenceId) {
  if (/^smoke-[a-z0-9][a-z0-9_-]{7,}$/i.test(credentialReferenceId)) {
    return true;
  }

  writeJson(
    {
      status: "blocked-unsafe-credential-reference-id",
      ...createBasePayload(),
      requiredCredentialReferenceIdPattern: "smoke-<opaque-non-secret-id>",
      ownerVerificationSmoke: "not-run",
      providerAccess: "not-run"
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
    report.missingTargetMetadataReferences.length > 0 ||
    report.missingOwnerVerificationReadinessReferences.length > 0
  ) {
    return {
      ok: false,
      exitCode: 2,
      payload: {
        status: "blocked-missing-env-fixture-target-or-owner-verification-readiness-references",
        ...createBasePayload(),
        missingEnvReferences: report.missingEnvReferences,
        missingFixtureReferences: report.missingFixtureReferences,
        missingTargetMetadataReferences: report.missingTargetMetadataReferences,
        missingOwnerVerificationReadinessReferences: report.missingOwnerVerificationReadinessReferences,
        ownerAuthorizationPreflightReference,
        ownerVerificationSmoke: "not-run",
        providerAccess: "not-run"
      }
    };
  }

  if (report.placeholderReferences.length > 0) {
    return {
      ok: false,
      exitCode: 2,
      payload: {
        status: "blocked-placeholder-env-fixture-target-or-owner-verification-readiness-references",
        ...createBasePayload(),
        placeholderReferences: report.placeholderReferences,
        ownerVerificationSmoke: "not-run",
        providerAccess: "not-run"
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
        credentialResolutionDisabledEnv: "present-enabled",
        ownerVerificationSmoke: "not-run",
        providerAccess: "not-run"
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
        ownerAuthorizationPreflight: "required-before-owner-verification-smoke",
        ownerVerificationSmoke: "not-run",
        providerAccess: "not-run"
      }
    };
  }

  if (!isTruthyReference(ownerVerificationReadyPreflightReference)) {
    return {
      ok: false,
      exitCode: 2,
      payload: {
        status: "blocked-owner-verification-ready-preflight-not-confirmed",
        ...createBasePayload(),
        ownerVerificationReadyPreflightReference,
        ownerVerificationSmoke: "not-run",
        providerAccess: "not-run"
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
      status: "ready-for-bounded-owner-verification-smoke-command-foundation",
      ...createBasePayload(),
      credentialReferenceId,
      ownerAuthorizationPreflight: "confirmed-by-reference-only",
      targetMetadata: "present-by-reference-only",
      expectedProviderChannelReference: "present-by-reference-only",
      ownerBinding: "requires-check-owner-binding-only-before-approved-execution",
      approvedExecutionReadiness: "requires-owner-binding-and-token-material-before-approved-execution",
      ownerVerificationSmoke: "not-run-preflight-only",
      providerAccess: "not-run"
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

  if (args.has("--check-owner-binding-only")) {
    const ownerBindingPayload = await createOwnerBindingOnlyPayload(result.payload.credentialReferenceId);
    writeJson(ownerBindingPayload, ownerBindingPayload.status === "owner-binding-verified-before-provider-access" ? 0 : 2);
    return;
  }

  if (args.has("--check-token-material-availability")) {
    const availabilityPayload = await createTokenMaterialAvailabilityPayload(result.payload.credentialReferenceId);
    writeJson(availabilityPayload, availabilityPayload.status === "owner-verification-token-material-available" ? 0 : 2);
    return;
  }

  if (!args.has("--execute")) {
    writeJson(
      {
        status: "blocked-pending-explicit-execute-flag",
        ...createBasePayload(),
        credentialReferenceId: result.payload.credentialReferenceId,
        requiredFlag: "--execute",
        ownerVerificationSmoke: "not-run",
        providerAccess: "not-run"
      },
      2
    );
    return;
  }

  if (!args.has("--approved-owner-verification-smoke")) {
    writeJson(
      {
        status: "blocked-pending-explicit-owner-verification-approval",
        ...createBasePayload(),
        credentialReferenceId: result.payload.credentialReferenceId,
        requiredFlag: "--approved-owner-verification-smoke",
        approvalBoundary: "same-thread-explicit-in-thread-approval-required",
        ownerVerificationSmoke: "not-run",
        providerAccess: "not-run"
      },
      2
    );
    return;
  }

  const executionPayload = await createApprovedExecutionPayload(result.payload.credentialReferenceId);
  writeJson(executionPayload, executionPayload.status === "owner-verification-smoke-sanitized-result" ? 0 : 2);
}

await main();

function createRuntimeWiring(credentialReferenceId) {
  const foundation = loadTsModule("lib/comment-translator-youtube-owner-verification-smoke-foundation.ts");
  return foundation.createYouTubeOwnerVerificationSmokeCommandRuntimeWiring({
    credentialReferenceId,
    providerChannelId: readReference("YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID"),
    requiredScope: youtubeReadonlyOAuthScope,
    nowIso: new Date().toISOString(),
    operatorLocalServerAuthorizationHeader: readReference(operatorLocalServerAuthorizationHeaderReference),
    operatorLocalTokenExpiresAtIso: readReference(operatorLocalTokenExpiresAtIsoReference)
  });
}

async function createOwnerBindingOnlyPayload(credentialReferenceId) {
  const foundation = loadTsModule("lib/comment-translator-youtube-owner-verification-smoke-foundation.ts");
  const ownerUserId = readReference("YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID");
  const providerChannelId = readReference("YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID");
  const nowIso = new Date().toISOString();
  const runtimeWiring = createRuntimeWiring(credentialReferenceId);

  return foundation.assessYouTubeOwnerBindingBeforeProviderAccess({
    credentialReferenceId,
    expectedProviderChannelReference: providerChannelId,
    ownerAuthorization: {
      status: "authorized",
      ownerUserId
    },
    credentialResolutionDisabled: false,
    requiredScope: youtubeReadonlyOAuthScope,
    nowIso,
    trustedStatusReader: runtimeWiring.trustedStatusReader
  });
}

async function createTokenMaterialAvailabilityPayload(credentialReferenceId) {
  const foundation = loadTsModule("lib/comment-translator-youtube-owner-verification-smoke-foundation.ts");
  const ownerUserId = readReference("YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID");
  const providerChannelId = readReference("YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID");
  const nowIso = new Date().toISOString();
  const runtimeWiring = createRuntimeWiring(credentialReferenceId);

  return foundation.assessYouTubeOwnerVerificationTokenMaterialAvailabilityGate({
    credentialReferenceId,
    expectedProviderChannelReference: providerChannelId,
    ownerAuthorization: {
      status: "authorized",
      ownerUserId
    },
    credentialResolutionDisabled: false,
    requiredScope: youtubeReadonlyOAuthScope,
    nowIso,
    trustedStatusReader: runtimeWiring.trustedStatusReader,
    tokenMaterialResolver: runtimeWiring.tokenMaterialResolver
  });
}

async function createApprovedExecutionPayload(credentialReferenceId) {
  const foundation = loadTsModule("lib/comment-translator-youtube-owner-verification-smoke-foundation.ts");
  const ownerUserId = readReference("YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID");
  const providerChannelId = readReference("YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID");
  const nowIso = new Date().toISOString();
  const runtimeWiring = createRuntimeWiring(credentialReferenceId);

  return foundation.runYouTubeOwnerVerificationSmokeFoundation({
    credentialReferenceId,
    expectedProviderChannelReference: providerChannelId,
    ownerAuthorization: {
      status: "authorized",
      ownerUserId
    },
    credentialResolutionDisabled: false,
    requiredScope: youtubeReadonlyOAuthScope,
    nowIso,
    trustedStatusReader: runtimeWiring.trustedStatusReader,
    tokenMaterialResolver: runtimeWiring.tokenMaterialResolver,
    fetchGoogleApi: runtimeWiring.fetchGoogleApi
  });
}
