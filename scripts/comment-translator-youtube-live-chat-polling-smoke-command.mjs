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
const ownerAuthorizationPreflightReference = "YOUTUBE_LIVE_RUNTIME_SMOKE_OWNER_AUTHORIZATION_CONFIRMED";
const ownerVerificationSuccessReference = "YOUTUBE_OWNER_VERIFICATION_SMOKE_SUCCESS_CONFIRMED";
const liveChatTargetLookupReadyPreflightReference = "YOUTUBE_LIVE_CHAT_TARGET_LOOKUP_READY_PREFLIGHT_CONFIRMED";
const liveChatTargetLookupPresenceOnlyEvidenceReference =
  "YOUTUBE_LIVE_CHAT_TARGET_LOOKUP_PRESENCE_ONLY_EVIDENCE_CONFIRMED";
const liveChatPollingReadyPreflightReference = "YOUTUBE_LIVE_CHAT_POLLING_SMOKE_READY_PREFLIGHT_CONFIRMED";
const liveChatTargetMetadataPresentReference = "YOUTUBE_LIVE_CHAT_POLLING_SMOKE_TARGET_METADATA_PRESENT";
const liveChatTargetReference = "YOUTUBE_LIVE_CHAT_POLLING_SMOKE_LIVE_CHAT_ID";
const operatorLocalServerAuthorizationHeaderReference =
  "YOUTUBE_LIVE_CHAT_POLLING_SMOKE_OPERATOR_LOCAL_SERVER_AUTHORIZATION_HEADER";
const operatorLocalTokenExpiresAtIsoReference = "YOUTUBE_LIVE_CHAT_POLLING_SMOKE_OPERATOR_LOCAL_TOKEN_EXPIRES_AT_ISO";
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
  const missingLiveChatReadinessReferences = [liveChatPollingReadyPreflightReference].filter(
    (name) => !hasReference(name)
  );
  const missingLiveChatTargetReferences = [liveChatTargetMetadataPresentReference, liveChatTargetReference].filter(
    (name) => !hasReference(name)
  );
  const missingOwnerVerificationSuccessReferences = [ownerVerificationSuccessReference].filter(
    (name) => !hasReference(name)
  );
  const missingTargetLookupPrerequisiteReferences = [
    liveChatTargetLookupReadyPreflightReference,
    liveChatTargetLookupPresenceOnlyEvidenceReference
  ].filter((name) => !hasReference(name));
  const placeholderReferences = [
    ...requiredEnvReferences,
    ...requiredFixtureReferences,
    ownerAuthorizationPreflightReference,
    ownerVerificationSuccessReference,
    liveChatTargetLookupReadyPreflightReference,
    liveChatTargetLookupPresenceOnlyEvidenceReference,
    liveChatPollingReadyPreflightReference,
    liveChatTargetMetadataPresentReference,
    liveChatTargetReference,
    operatorLocalServerAuthorizationHeaderReference,
    operatorLocalTokenExpiresAtIsoReference
  ].filter((name) => isPlaceholderReferenceValue(name));

  return {
    missingEnvReferences,
    missingFixtureReferences,
    missingOwnerVerificationSuccessReferences,
    missingTargetLookupPrerequisiteReferences,
    missingLiveChatReadinessReferences,
    missingLiveChatTargetReferences,
    placeholderReferences
  };
}

function createBasePayload() {
  const foundation = loadTsModule("lib/comment-translator-youtube-live-chat-polling-smoke-foundation.ts");
  const contract = foundation.youtubeLiveChatPollingSmokeCommandFoundationContract;

  return {
    command: "sanitized-youtube-live-chat-polling-smoke",
    outputPolicy: contract.outputPolicy,
    endpoint: contract.endpoint,
    providerUrl: contract.providerUrl,
    httpMethod: contract.httpMethod,
    query: contract.query,
    prerequisite: contract.prerequisite,
    ownerBindingCheck: contract.ownerBindingCheck,
    targetLookupPrerequisite: contract.targetLookupPrerequisite,
    targetMetadataHandling: contract.targetMetadataHandling,
    authorizationHandling: contract.authorizationHandling,
    requiredApproval: contract.requiredApproval,
    tokenValue: contract.tokenValue,
    refreshTokenValue: contract.refreshTokenValue,
    pollingLoop: contract.pollingLoop,
    quotaWrite: contract.quotaWrite,
    translatorPipelineWiring: contract.translatorPipelineWiring,
    safeLiveYouTubeOAuthSmoke: "not-run",
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
      liveChatPollingSmoke: "not-run",
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
    report.missingOwnerVerificationSuccessReferences.length > 0 ||
    report.missingTargetLookupPrerequisiteReferences.length > 0 ||
    report.missingLiveChatReadinessReferences.length > 0 ||
    report.missingLiveChatTargetReferences.length > 0
  ) {
    return {
      ok: false,
      exitCode: 2,
      payload: {
        status: "blocked-missing-env-fixture-owner-verification-live-chat-readiness-or-target-references",
        ...createBasePayload(),
        missingEnvReferences: report.missingEnvReferences,
        missingFixtureReferences: report.missingFixtureReferences,
        missingOwnerVerificationSuccessReferences: report.missingOwnerVerificationSuccessReferences,
        missingTargetLookupPrerequisiteReferences: report.missingTargetLookupPrerequisiteReferences,
        missingLiveChatReadinessReferences: report.missingLiveChatReadinessReferences,
        missingLiveChatTargetReferences: report.missingLiveChatTargetReferences,
        ownerAuthorizationPreflightReference,
        liveChatPollingSmoke: "not-run",
        providerAccess: "not-run"
      }
    };
  }

  if (report.placeholderReferences.length > 0) {
    return {
      ok: false,
      exitCode: 2,
      payload: {
        status: "blocked-placeholder-env-fixture-owner-verification-live-chat-readiness-or-target-references",
        ...createBasePayload(),
        placeholderReferences: report.placeholderReferences,
        liveChatPollingSmoke: "not-run",
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
        liveChatPollingSmoke: "not-run",
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
        ownerAuthorizationPreflight: "required-before-live-chat-polling-smoke",
        liveChatPollingSmoke: "not-run",
        providerAccess: "not-run"
      }
    };
  }

  if (!isTruthyReference(ownerVerificationSuccessReference)) {
    return {
      ok: false,
      exitCode: 2,
      payload: {
        status: "blocked-owner-verification-smoke-success-not-confirmed",
        ...createBasePayload(),
        ownerVerificationSuccessReference,
        liveChatPollingSmoke: "not-run",
        providerAccess: "not-run"
      }
    };
  }

  if (!isTruthyReference(liveChatTargetLookupReadyPreflightReference)) {
    return {
      ok: false,
      exitCode: 2,
      payload: {
        status: "blocked-live-chat-target-lookup-ready-preflight-not-confirmed",
        ...createBasePayload(),
        liveChatTargetLookupReadyPreflightReference,
        liveChatPollingSmoke: "not-run",
        providerAccess: "not-run"
      }
    };
  }

  if (!isTruthyReference(liveChatTargetLookupPresenceOnlyEvidenceReference)) {
    return {
      ok: false,
      exitCode: 2,
      payload: {
        status: "blocked-live-chat-target-lookup-presence-only-evidence-not-confirmed",
        ...createBasePayload(),
        liveChatTargetLookupPresenceOnlyEvidenceReference,
        liveChatTarget: "absent",
        liveChatPollingSmoke: "not-run",
        providerAccess: "not-run"
      }
    };
  }

  if (!isTruthyReference(liveChatPollingReadyPreflightReference)) {
    return {
      ok: false,
      exitCode: 2,
      payload: {
        status: "blocked-live-chat-polling-ready-preflight-not-confirmed",
        ...createBasePayload(),
        liveChatPollingReadyPreflightReference,
        liveChatPollingSmoke: "not-run",
        providerAccess: "not-run"
      }
    };
  }

  if (!isTruthyReference(liveChatTargetMetadataPresentReference)) {
    return {
      ok: false,
      exitCode: 2,
      payload: {
        status: "blocked-live-chat-target-metadata-not-confirmed",
        ...createBasePayload(),
        liveChatTargetMetadataPresentReference,
        liveChatTarget: "absent",
        liveChatPollingSmoke: "not-run",
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
      status: "ready-for-bounded-live-chat-polling-smoke-command-foundation",
      ...createBasePayload(),
      credentialReferenceId,
      ownerAuthorizationPreflight: "confirmed-by-reference-only",
      ownerVerificationSmoke: "completed-prerequisite-reference-only",
      liveChatTargetLookupReadiness: "confirmed-by-reference-only",
      liveChatTargetLookupPresenceOnlyEvidence: "confirmed-presence-only",
      liveChatTarget: "present-by-reference-only",
      ownerBinding: "requires-check-owner-binding-only-before-approved-execution",
      approvedExecutionReadiness: "requires-owner-binding-token-material-and-explicit-approval-before-approved-execution",
      liveChatPollingSmoke: "not-run-preflight-only",
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
    writeJson(ownerBindingPayload, ownerBindingPayload.status === "owner-binding-verified-before-live-chat-polling" ? 0 : 2);
    return;
  }

  if (args.has("--check-token-material-availability")) {
    const availabilityPayload = await createTokenMaterialAvailabilityPayload(result.payload.credentialReferenceId);
    writeJson(availabilityPayload, availabilityPayload.status === "live-chat-polling-token-material-available" ? 0 : 2);
    return;
  }

  if (!args.has("--execute")) {
    writeJson(
      {
        status: "blocked-pending-explicit-execute-flag",
        ...createBasePayload(),
        credentialReferenceId: result.payload.credentialReferenceId,
        requiredFlag: "--execute",
        liveChatPollingSmoke: "not-run",
        providerAccess: "not-run"
      },
      2
    );
    return;
  }

  const hasSmokeApproval = args.has("--approved-live-chat-polling-smoke");
  const hasDiagnosticsApproval = args.has("--approved-live-chat-polling-diagnostics");

  if (hasSmokeApproval && hasDiagnosticsApproval) {
    writeJson(
      {
        status: "blocked-conflicting-live-chat-polling-approval-flags",
        ...createBasePayload(),
        credentialReferenceId: result.payload.credentialReferenceId,
        requiredFlag: "--approved-live-chat-polling-smoke or --approved-live-chat-polling-diagnostics",
        approvalBoundary: "choose-one-explicit-in-thread-approval-boundary",
        liveChatPollingSmoke: "not-run",
        providerAccess: "not-run"
      },
      2
    );
    return;
  }

  if (!hasSmokeApproval && !hasDiagnosticsApproval) {
    writeJson(
      {
        status: "blocked-pending-explicit-live-chat-polling-approval",
        ...createBasePayload(),
        credentialReferenceId: result.payload.credentialReferenceId,
        requiredFlag: "--approved-live-chat-polling-smoke or --approved-live-chat-polling-diagnostics",
        approvalBoundary: "same-thread-explicit-in-thread-approval-required",
        liveChatPollingSmoke: "not-run",
        providerAccess: "not-run"
      },
      2
    );
    return;
  }

  if (hasDiagnosticsApproval) {
    const diagnosticsPayload = await createApprovedDiagnosticsPayload(result.payload.credentialReferenceId);
    writeJson(diagnosticsPayload, diagnosticsPayload.status === "live-chat-polling-diagnostics-sanitized-result" ? 0 : 2);
    return;
  }

  const executionPayload = await createApprovedExecutionPayload(result.payload.credentialReferenceId);
  writeJson(executionPayload, executionPayload.status === "live-chat-polling-smoke-sanitized-result" ? 0 : 2);
}

await main();

function createRuntimeWiring(credentialReferenceId) {
  const foundation = loadTsModule("lib/comment-translator-youtube-live-chat-polling-smoke-foundation.ts");
  return foundation.createYouTubeLiveChatPollingSmokeCommandRuntimeWiring({
    credentialReferenceId,
    providerChannelId: readReference("YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID"),
    requiredScope: youtubeReadonlyOAuthScope,
    nowIso: new Date().toISOString(),
    operatorLocalServerAuthorizationHeader: readReference(operatorLocalServerAuthorizationHeaderReference),
    operatorLocalTokenExpiresAtIso: readReference(operatorLocalTokenExpiresAtIsoReference)
  });
}

function createFoundationBaseRequest(credentialReferenceId) {
  const ownerUserId = readReference("YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID");
  const providerChannelId = readReference("YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID");
  const nowIso = new Date().toISOString();
  const runtimeWiring = createRuntimeWiring(credentialReferenceId);

  return {
    credentialReferenceId,
    expectedProviderChannelReference: providerChannelId,
    liveChatId: readReference(liveChatTargetReference),
    ownerVerificationSmokeSuccess: true,
    liveChatTargetLookupReadinessConfirmed: true,
    liveChatTargetPresenceOnlyEvidence: true,
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
  };
}

async function createOwnerBindingOnlyPayload(credentialReferenceId) {
  const foundation = loadTsModule("lib/comment-translator-youtube-live-chat-polling-smoke-foundation.ts");
  const { tokenMaterialResolver, fetchGoogleApi, ...baseRequest } = createFoundationBaseRequest(credentialReferenceId);
  void tokenMaterialResolver;
  void fetchGoogleApi;

  return foundation.assessYouTubeLiveChatPollingSmokeReadinessGate(baseRequest);
}

async function createTokenMaterialAvailabilityPayload(credentialReferenceId) {
  const foundation = loadTsModule("lib/comment-translator-youtube-live-chat-polling-smoke-foundation.ts");
  const { fetchGoogleApi, ...baseRequest } = createFoundationBaseRequest(credentialReferenceId);
  void fetchGoogleApi;

  return foundation.assessYouTubeLiveChatPollingSmokeTokenMaterialAvailabilityGate(baseRequest);
}

async function createApprovedExecutionPayload(credentialReferenceId) {
  const foundation = loadTsModule("lib/comment-translator-youtube-live-chat-polling-smoke-foundation.ts");

  return foundation.runYouTubeLiveChatPollingSmokeFoundation(createFoundationBaseRequest(credentialReferenceId));
}

async function createApprovedDiagnosticsPayload(credentialReferenceId) {
  const foundation = loadTsModule("lib/comment-translator-youtube-live-chat-polling-smoke-foundation.ts");
  const result = await foundation.runYouTubeLiveChatPollingSmokeFoundation(createFoundationBaseRequest(credentialReferenceId));

  if (result.status !== "live-chat-polling-smoke-sanitized-result") {
    return {
      ...result,
      diagnosticMode: "sanitized-metadata-only",
      translationExecution: "not-run-diagnostics-only"
    };
  }

  return {
    ...result,
    status: "live-chat-polling-diagnostics-sanitized-result",
    liveChatPollingDiagnostics: "executed-bounded-readonly-one-step",
    diagnosticMode: "sanitized-metadata-only",
    translationExecution: "not-run-diagnostics-only"
  };
}
