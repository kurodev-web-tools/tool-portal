#!/usr/bin/env node
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import process from "node:process";
import { scheduler } from "node:timers/promises";
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
const liveChatNextPageCursorReference = "YOUTUBE_LIVE_CHAT_POLLING_SMOKE_NEXT_PAGE_TOKEN";
const firstPageToNextPageDiagnosticsApprovalLabelReference =
  "PL_G3_FIRST_PAGE_TO_NEXT_PAGE_CURSOR_DIAGNOSTICS_APPROVAL_LABEL";
const firstPageToNextPageDiagnosticsApprovalLabel =
  "approved-pl-g3-first-page-to-next-page-cursor-diagnostics-after-pr519";
const betweenPagesFreshCommentDiagnosticsApprovalLabelReference =
  "PL_G3_BETWEEN_PAGES_FRESH_COMMENT_DIAGNOSTICS_APPROVAL_LABEL";
const betweenPagesFreshCommentDiagnosticsApprovalLabel =
  "approved-pl-g3-between-pages-fresh-comment-diagnostics-after-pr521";
const freshCommentBoundedShortPollingDiagnosticsApprovalLabelReference =
  "PL_G3_FRESH_COMMENT_BOUNDED_SHORT_POLLING_DIAGNOSTICS_APPROVAL_LABEL";
const freshCommentBoundedShortPollingDiagnosticsApprovalLabel =
  "approved-pl-g3-fresh-comment-bounded-short-polling-diagnostics-after-pr525";
const sameProcessTargetRefreshBoundedPollingDiagnosticsApprovalLabelReference =
  "PL_G3_SAME_PROCESS_TARGET_REFRESH_BOUNDED_POLLING_DIAGNOSTICS_APPROVAL_LABEL";
const sameProcessTargetRefreshBoundedPollingDiagnosticsApprovalLabel =
  "approved-pl-g3-same-process-target-refresh-to-bounded-polling-diagnostics-after-pr529";
const targetLookupOperatorLocalServerAuthorizationHeaderReference =
  "YOUTUBE_LIVE_CHAT_TARGET_LOOKUP_OPERATOR_LOCAL_SERVER_AUTHORIZATION_HEADER";
const targetLookupOperatorLocalTokenExpiresAtIsoReference =
  "YOUTUBE_LIVE_CHAT_TARGET_LOOKUP_OPERATOR_LOCAL_TOKEN_EXPIRES_AT_ISO";
const liveChatPollingApprovalFlags =
  "--approved-live-chat-polling-smoke or --approved-live-chat-polling-diagnostics or --approved-live-chat-polling-next-page-diagnostics or --approved-live-chat-polling-first-page-to-next-page-diagnostics or --approved-live-chat-polling-between-pages-fresh-comment-diagnostics or --approved-live-chat-polling-fresh-comment-bounded-short-polling-diagnostics or --approved-live-chat-polling-same-process-target-refresh-bounded-short-polling-diagnostics";
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

function createReferenceReport({ requireLiveChatTargetReference = true } = {}) {
  const missingEnvReferences = requiredEnvReferences.filter((name) => !hasReference(name));
  const missingFixtureReferences = requiredFixtureReferences.filter((name) => !hasReference(name));
  const missingLiveChatReadinessReferences = [liveChatPollingReadyPreflightReference].filter(
    (name) => !hasReference(name)
  );
  const requiredLiveChatTargetReferences = requireLiveChatTargetReference
    ? [liveChatTargetMetadataPresentReference, liveChatTargetReference]
    : [];
  const missingLiveChatTargetReferences = requiredLiveChatTargetReferences.filter((name) => !hasReference(name));
  const missingOwnerVerificationSuccessReferences = [ownerVerificationSuccessReference].filter(
    (name) => !hasReference(name)
  );
  const requiredTargetLookupPrerequisiteReferences = requireLiveChatTargetReference
    ? [liveChatTargetLookupReadyPreflightReference, liveChatTargetLookupPresenceOnlyEvidenceReference]
    : [liveChatTargetLookupReadyPreflightReference];
  const missingTargetLookupPrerequisiteReferences = requiredTargetLookupPrerequisiteReferences.filter(
    (name) => !hasReference(name)
  );
  const placeholderReferences = [
    ...requiredEnvReferences,
    ...requiredFixtureReferences,
    ownerAuthorizationPreflightReference,
    ownerVerificationSuccessReference,
    ...requiredTargetLookupPrerequisiteReferences,
    liveChatPollingReadyPreflightReference,
    ...requiredLiveChatTargetReferences,
    operatorLocalServerAuthorizationHeaderReference,
    operatorLocalTokenExpiresAtIsoReference,
    targetLookupOperatorLocalServerAuthorizationHeaderReference,
    targetLookupOperatorLocalTokenExpiresAtIsoReference
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
    pageTokenHandling: contract.pageTokenHandling,
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

function preflight({ requireNextPageCursor = false, requireLiveChatTargetReference = true } = {}) {
  const report = createReferenceReport({ requireLiveChatTargetReference });

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

  if (requireNextPageCursor && !hasReference(liveChatNextPageCursorReference)) {
    return {
      ok: false,
      exitCode: 2,
      payload: {
        status: "blocked-missing-live-chat-next-page-cursor-reference",
        ...createBasePayload(),
        liveChatNextPageCursorReference,
        nextPageCursor: "absent",
        liveChatPollingSmoke: "not-run",
        providerAccess: "not-run"
      }
    };
  }

  if (requireNextPageCursor && isPlaceholderReferenceValue(liveChatNextPageCursorReference)) {
    return {
      ok: false,
      exitCode: 2,
      payload: {
        status: "blocked-placeholder-live-chat-next-page-cursor-reference",
        ...createBasePayload(),
        liveChatNextPageCursorReference,
        nextPageCursor: "placeholder",
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

  if (requireLiveChatTargetReference && !isTruthyReference(liveChatTargetLookupPresenceOnlyEvidenceReference)) {
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

  if (requireLiveChatTargetReference && !isTruthyReference(liveChatTargetMetadataPresentReference)) {
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
      liveChatTarget: requireLiveChatTargetReference
        ? "present-by-reference-only"
        : "refreshed-in-same-process-before-polling",
      nextPageCursor: requireNextPageCursor ? "present-by-reference-only" : "not-required-for-this-boundary",
      ownerBinding: "requires-check-owner-binding-only-before-approved-execution",
      approvedExecutionReadiness: "requires-owner-binding-token-material-and-explicit-approval-before-approved-execution",
      liveChatPollingSmoke: "not-run-preflight-only",
      providerAccess: "not-run"
    }
  };
}

async function main() {
  const hasNextPageDiagnosticsApproval = args.has("--approved-live-chat-polling-next-page-diagnostics");
  const hasFirstPageToNextPageDiagnosticsApproval = args.has(
    "--approved-live-chat-polling-first-page-to-next-page-diagnostics"
  );
  const hasBetweenPagesFreshCommentDiagnosticsApproval = args.has(
    "--approved-live-chat-polling-between-pages-fresh-comment-diagnostics"
  );
  const hasFreshCommentBoundedShortPollingDiagnosticsApproval = args.has(
    "--approved-live-chat-polling-fresh-comment-bounded-short-polling-diagnostics"
  );
  const hasSameProcessTargetRefreshBoundedPollingDiagnosticsApproval = args.has(
    "--approved-live-chat-polling-same-process-target-refresh-bounded-short-polling-diagnostics"
  );
  const result = preflight({
    requireNextPageCursor: hasNextPageDiagnosticsApproval,
    requireLiveChatTargetReference: !hasSameProcessTargetRefreshBoundedPollingDiagnosticsApproval
  });

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
  const approvalFlagCount = [
    hasSmokeApproval,
    hasDiagnosticsApproval,
    hasNextPageDiagnosticsApproval,
    hasFirstPageToNextPageDiagnosticsApproval,
    hasBetweenPagesFreshCommentDiagnosticsApproval,
    hasFreshCommentBoundedShortPollingDiagnosticsApproval,
    hasSameProcessTargetRefreshBoundedPollingDiagnosticsApproval
  ].filter(Boolean).length;

  if (approvalFlagCount > 1) {
    writeJson(
      {
        status: "blocked-conflicting-live-chat-polling-approval-flags",
        ...createBasePayload(),
        credentialReferenceId: result.payload.credentialReferenceId,
        requiredFlag: liveChatPollingApprovalFlags,
        approvalBoundary: "choose-one-explicit-in-thread-approval-boundary",
        liveChatPollingSmoke: "not-run",
        providerAccess: "not-run"
      },
      2
    );
    return;
  }

  if (approvalFlagCount === 0) {
    writeJson(
      {
        status: "blocked-pending-explicit-live-chat-polling-approval",
        ...createBasePayload(),
        credentialReferenceId: result.payload.credentialReferenceId,
        requiredFlag: liveChatPollingApprovalFlags,
        approvalBoundary: "same-thread-explicit-in-thread-approval-required",
        liveChatPollingSmoke: "not-run",
        providerAccess: "not-run"
      },
      2
    );
    return;
  }

  if (hasFirstPageToNextPageDiagnosticsApproval) {
    if (readReference(firstPageToNextPageDiagnosticsApprovalLabelReference) !== firstPageToNextPageDiagnosticsApprovalLabel) {
      writeJson(
        {
          status: "blocked-missing-first-page-to-next-page-diagnostics-approval-label",
          ...createBasePayload(),
          requiredApprovalLabel: firstPageToNextPageDiagnosticsApprovalLabel,
          approvalLabelReference: firstPageToNextPageDiagnosticsApprovalLabelReference,
          approvalBoundary: "same-thread-explicit-in-thread-approval-required-before-provider-access",
          liveChatPollingDiagnostics: "not-run",
          providerAccess: "not-run"
        },
        2
      );
      return;
    }

    const diagnosticsPayload = await createApprovedFirstPageToNextPageDiagnosticsPayload(
      result.payload.credentialReferenceId
    );
    writeJson(
      diagnosticsPayload,
      isFirstPageToNextPageProviderOkDiagnosticsPayload(diagnosticsPayload) ? 0 : 2
    );
    return;
  }

  if (hasBetweenPagesFreshCommentDiagnosticsApproval) {
    if (
      readReference(betweenPagesFreshCommentDiagnosticsApprovalLabelReference) !==
      betweenPagesFreshCommentDiagnosticsApprovalLabel
    ) {
      writeJson(
        {
          status: "blocked-missing-between-pages-fresh-comment-diagnostics-approval-label",
          ...createBasePayload(),
          requiredApprovalLabel: betweenPagesFreshCommentDiagnosticsApprovalLabel,
          approvalLabelReference: betweenPagesFreshCommentDiagnosticsApprovalLabelReference,
          approvalBoundary: "same-thread-explicit-in-thread-approval-required-before-provider-access",
          operatorFreshCommentWindow: "not-run",
          liveChatPollingDiagnostics: "not-run",
          providerAccess: "not-run"
        },
        2
      );
      return;
    }

    const diagnosticsPayload = await createApprovedBetweenPagesFreshCommentDiagnosticsPayload(
      result.payload.credentialReferenceId
    );
    writeJson(
      diagnosticsPayload,
      isFirstPageToNextPageProviderOkDiagnosticsPayload(diagnosticsPayload) ? 0 : 2
    );
    return;
  }

  if (hasFreshCommentBoundedShortPollingDiagnosticsApproval) {
    if (
      readReference(freshCommentBoundedShortPollingDiagnosticsApprovalLabelReference) !==
      freshCommentBoundedShortPollingDiagnosticsApprovalLabel
    ) {
      writeJson(
        {
          status: "blocked-missing-fresh-comment-bounded-short-polling-diagnostics-approval-label",
          ...createBasePayload(),
          requiredApprovalLabel: freshCommentBoundedShortPollingDiagnosticsApprovalLabel,
          approvalLabelReference: freshCommentBoundedShortPollingDiagnosticsApprovalLabelReference,
          approvalBoundary: "same-thread-explicit-in-thread-approval-required-before-provider-access",
          operatorFreshCommentWindow: "not-run",
          liveChatPollingDiagnostics: "not-run",
          providerAccess: "not-run"
        },
        2
      );
      return;
    }

    const diagnosticsPayload = await createApprovedFreshCommentBoundedShortPollingDiagnosticsPayload(
      result.payload.credentialReferenceId
    );
    writeJson(
      diagnosticsPayload,
      isFreshCommentBoundedShortPollingDiagnosticsPayload(diagnosticsPayload) ? 0 : 2
    );
    return;
  }

  if (hasSameProcessTargetRefreshBoundedPollingDiagnosticsApproval) {
    if (
      readReference(sameProcessTargetRefreshBoundedPollingDiagnosticsApprovalLabelReference) !==
      sameProcessTargetRefreshBoundedPollingDiagnosticsApprovalLabel
    ) {
      writeJson(
        {
          status: "blocked-missing-same-process-target-refresh-bounded-polling-diagnostics-approval-label",
          ...createBasePayload(),
          requiredApprovalLabel: sameProcessTargetRefreshBoundedPollingDiagnosticsApprovalLabel,
          approvalLabelReference: sameProcessTargetRefreshBoundedPollingDiagnosticsApprovalLabelReference,
          approvalBoundary: "same-thread-explicit-in-thread-approval-required-before-provider-access",
          liveChatTargetLookup: "not-run",
          operatorFreshCommentWindow: "not-run",
          liveChatPollingDiagnostics: "not-run",
          providerAccess: "not-run"
        },
        2
      );
      return;
    }

    const diagnosticsPayload = await createApprovedSameProcessTargetRefreshBoundedPollingDiagnosticsPayload(
      result.payload.credentialReferenceId
    );
    writeJson(
      diagnosticsPayload,
      diagnosticsPayload.stopReason === "non-empty-intake-found" ? 0 : 2
    );
    return;
  }

  if (hasDiagnosticsApproval || hasNextPageDiagnosticsApproval) {
    const diagnosticsPayload = await createApprovedDiagnosticsPayload(
      result.payload.credentialReferenceId,
      hasNextPageDiagnosticsApproval
    );
    writeJson(diagnosticsPayload, isProviderOkDiagnosticsPayload(diagnosticsPayload) ? 0 : 2);
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

function createTargetLookupRuntimeWiring(credentialReferenceId) {
  const foundation = loadTsModule("lib/comment-translator-youtube-live-chat-target-lookup-foundation.ts");
  return foundation.createYouTubeLiveChatTargetLookupCommandRuntimeWiring({
    credentialReferenceId,
    providerChannelId: readReference("YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID"),
    requiredScope: youtubeReadonlyOAuthScope,
    nowIso: new Date().toISOString(),
    operatorLocalServerAuthorizationHeader: readReference(targetLookupOperatorLocalServerAuthorizationHeaderReference),
    operatorLocalTokenExpiresAtIso: readReference(targetLookupOperatorLocalTokenExpiresAtIsoReference)
  });
}

function createFoundationBaseRequest(
  credentialReferenceId,
  { useNextPageCursor = false, serverOnlyLiveTargetForPolling = null } = {}
) {
  const ownerUserId = readReference("YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID");
  const providerChannelId = readReference("YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID");
  const nowIso = new Date().toISOString();
  const runtimeWiring = createRuntimeWiring(credentialReferenceId);

  return {
    credentialReferenceId,
    expectedProviderChannelReference: providerChannelId,
    liveChatId: serverOnlyLiveTargetForPolling ?? readReference(liveChatTargetReference),
    pageToken: useNextPageCursor ? readReference(liveChatNextPageCursorReference) : null,
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

function createTargetLookupFoundationBaseRequest(credentialReferenceId) {
  const ownerUserId = readReference("YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID");
  const providerChannelId = readReference("YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID");
  const nowIso = new Date().toISOString();
  const runtimeWiring = createTargetLookupRuntimeWiring(credentialReferenceId);

  return {
    credentialReferenceId,
    expectedProviderChannelReference: providerChannelId,
    ownerVerificationSmokeSuccess: true,
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

async function createApprovedDiagnosticsPayload(credentialReferenceId, useNextPageCursor = false) {
  const foundation = loadTsModule("lib/comment-translator-youtube-live-chat-polling-smoke-foundation.ts");
  const result = await foundation.runYouTubeLiveChatPollingSmokeFoundation(
    createFoundationBaseRequest(credentialReferenceId, { useNextPageCursor })
  );

  if (result.status !== "live-chat-polling-smoke-sanitized-result") {
    return sanitizeDiagnosticsPayload({
      ...result,
      diagnosticMode: "sanitized-metadata-only",
      translationExecution: "not-run-diagnostics-only"
    });
  }

  return sanitizeDiagnosticsPayload({
    ...result,
    status: "live-chat-polling-diagnostics-sanitized-result",
    liveChatPollingDiagnostics: "executed-bounded-readonly-one-step",
    diagnosticMode: "sanitized-metadata-only",
    translationExecution: "not-run-diagnostics-only"
  });
}

async function createApprovedFirstPageToNextPageDiagnosticsPayload(credentialReferenceId) {
  const foundation = loadTsModule("lib/comment-translator-youtube-live-chat-polling-smoke-foundation.ts");
  const result = await foundation.runYouTubeLiveChatPollingFirstPageToNextPageDiagnosticsFoundation(
    createFoundationBaseRequest(credentialReferenceId)
  );

  return sanitizeDiagnosticsPayload({
    ...result,
    diagnosticMode: "sanitized-metadata-only",
    publicGateStateLabel: "unchanged / blocked",
    publicReleaseCapableLabel: "no",
    translationExecution: "not-run-diagnostics-only"
  });
}

async function createApprovedBetweenPagesFreshCommentDiagnosticsPayload(credentialReferenceId) {
  const foundation = loadTsModule("lib/comment-translator-youtube-live-chat-polling-smoke-foundation.ts");
  const result = await foundation.runYouTubeLiveChatPollingFirstPageToNextPageDiagnosticsFoundation({
    ...createFoundationBaseRequest(credentialReferenceId),
    beforeNextPageRead: waitForOperatorFreshCommentWindow
  });

  return sanitizeDiagnosticsPayload({
    ...result,
    diagnosticMode: "sanitized-metadata-only",
    operatorFreshCommentWindow: "completed-before-next-page-read",
    publicGateStateLabel: "unchanged / blocked",
    publicReleaseCapableLabel: "no",
    translationExecution: "not-run-diagnostics-only"
  });
}

async function createApprovedFreshCommentBoundedShortPollingDiagnosticsPayload(credentialReferenceId) {
  const foundation = loadTsModule("lib/comment-translator-youtube-live-chat-polling-smoke-foundation.ts");
  await waitForOperatorFreshCommentBeforeBoundedShortPolling();
  const result = await foundation.runYouTubeLiveChatPollingFreshCommentBoundedShortPollingDiagnosticsFoundation({
    ...createFoundationBaseRequest(credentialReferenceId),
    waitForProviderPollingInterval
  });

  return sanitizeDiagnosticsPayload({
    ...result,
    diagnosticMode: "sanitized-metadata-only",
    operatorFreshCommentWindow: "completed-before-bounded-short-polling",
    publicGateStateLabel: "unchanged / blocked",
    publicReleaseCapableLabel: "no",
    translationExecution: "not-run-diagnostics-only"
  });
}

async function createApprovedSameProcessTargetRefreshBoundedPollingDiagnosticsPayload(credentialReferenceId) {
  const targetLookupFoundation = loadTsModule("lib/comment-translator-youtube-live-chat-target-lookup-foundation.ts");
  const pollingFoundation = loadTsModule("lib/comment-translator-youtube-live-chat-polling-smoke-foundation.ts");
  const targetLookupResult =
    await targetLookupFoundation.runYouTubeLiveChatTargetLookupSameProcessPollingDiagnosticFoundation(
      createTargetLookupFoundationBaseRequest(credentialReferenceId)
    );
  const sanitizedTargetLookupResult = sanitizeDiagnosticsPayload(targetLookupResult.sanitizedTargetLookupResult);
  const targetLookupResponseMetadata = sanitizedTargetLookupResult.responseMetadata ?? null;

  if (
    sanitizedTargetLookupResult.status !== "live-chat-target-lookup-sanitized-result" ||
    !targetLookupResult.serverOnlyLiveTargetForPolling
  ) {
    return sanitizeDiagnosticsPayload({
      status: "live-chat-polling-same-process-target-refresh-bounded-short-polling-diagnostics-sanitized-result",
      diagnosticMode: "sanitized-metadata-only",
      targetRefresh: "blocked-before-bounded-polling",
      targetLookupStatus: sanitizedTargetLookupResult.status,
      targetLookupProviderAccess: sanitizedTargetLookupResult.providerAccess,
      targetLookupResponseMetadata,
      liveChatTarget: "absent",
      operatorFreshCommentWindow: "not-run",
      liveChatPollingDiagnostics: "not-run",
      providerAccess: sanitizedTargetLookupResult.providerAccess,
      boundedAttemptCount: 0,
      boundedMaxAttempts: 3,
      stopReason: "target-refresh-not-usable",
      unavailableReason: "target-refresh-not-usable",
      publicGateStateLabel: "unchanged / blocked",
      publicReleaseCapableLabel: "no",
      translationExecution: "not-run-diagnostics-only"
    });
  }

  await waitForOperatorFreshCommentBeforeSameProcessBoundedPolling();
  const pollingResult = await pollingFoundation.runYouTubeLiveChatPollingFreshCommentBoundedShortPollingDiagnosticsFoundation({
    ...createFoundationBaseRequest(credentialReferenceId, {
      serverOnlyLiveTargetForPolling: targetLookupResult.serverOnlyLiveTargetForPolling
    }),
    waitForProviderPollingInterval
  });

  return sanitizeDiagnosticsPayload({
    ...pollingResult,
    status: "live-chat-polling-same-process-target-refresh-bounded-short-polling-diagnostics-sanitized-result",
    diagnosticMode: "sanitized-metadata-only",
    targetRefresh: "executed-in-same-process-before-bounded-polling",
    targetLookupStatus: sanitizedTargetLookupResult.status,
    targetLookupProviderAccess: sanitizedTargetLookupResult.providerAccess,
    targetLookupResponseMetadata,
    operatorFreshCommentWindow: "completed-after-target-refresh-before-bounded-polling",
    publicGateStateLabel: "unchanged / blocked",
    publicReleaseCapableLabel: "no",
    translationExecution: "not-run-diagnostics-only"
  });
}

async function waitForOperatorFreshCommentWindow() {
  process.stderr.write(
    "PL-G3 between-pages diagnostic: first-page read completed. Send one fresh visible chat comment, then press Enter to run the bounded next-page read.\n"
  );

  await new Promise((resolve) => {
    process.stdin.resume();
    process.stdin.once("data", () => {
      process.stdin.pause();
      resolve();
    });
  });
}

async function waitForOperatorFreshCommentBeforeBoundedShortPolling() {
  process.stderr.write(
    "PL-G3 bounded short polling diagnostic: send one fresh visible chat comment now, then press Enter to run the bounded short polling diagnostic.\n"
  );

  await new Promise((resolve) => {
    process.stdin.resume();
    process.stdin.once("data", () => {
      process.stdin.pause();
      resolve();
    });
  });
}

async function waitForOperatorFreshCommentBeforeSameProcessBoundedPolling() {
  process.stderr.write(
    "PL-G3 same-process target-refresh diagnostic: target lookup refresh completed. Send one fresh visible chat comment now, then press Enter to run bounded short polling with the refreshed target in memory.\n"
  );

  await new Promise((resolve) => {
    process.stdin.resume();
    process.stdin.once("data", () => {
      process.stdin.pause();
      resolve();
    });
  });
}

async function waitForProviderPollingInterval(responseMetadata) {
  if (
    typeof responseMetadata.pollingIntervalMillis !== "number" ||
    !Number.isFinite(responseMetadata.pollingIntervalMillis) ||
    responseMetadata.pollingIntervalMillis <= 0
  ) {
    return;
  }

  await scheduler.wait(responseMetadata.pollingIntervalMillis);
}

function sanitizeDiagnosticsPayload(payload) {
  const sanitizedPayload = { ...payload };
  delete sanitizedPayload.credentialReferenceId;
  return sanitizedPayload;
}

function isProviderOkDiagnosticsPayload(payload) {
  return (
    payload.status === "live-chat-polling-diagnostics-sanitized-result" &&
    payload.responseMetadata?.providerStatusLabel === "provider-ok"
  );
}

function isFirstPageToNextPageProviderOkDiagnosticsPayload(payload) {
  return (
    payload.status === "live-chat-polling-first-page-to-next-page-diagnostics-sanitized-result" &&
    payload.firstPageResponseMetadata?.providerStatusLabel === "provider-ok" &&
    payload.firstPageResponseMetadata?.nextPageToken === "present" &&
    payload.nextPageResponseMetadata?.providerStatusLabel === "provider-ok"
  );
}

function isFreshCommentBoundedShortPollingDiagnosticsPayload(payload) {
  return (
    payload.status === "live-chat-polling-fresh-comment-bounded-short-polling-diagnostics-sanitized-result" &&
    payload.stopReason === "non-empty-intake-found"
  );
}
