import "server-only";

import {
  assessYouTubeOwnerBindingBeforeProviderAccess,
  createYouTubeOwnerVerificationSmokeCommandRuntimeWiring,
  type YouTubeOwnerVerificationSmokeCommandRuntimeWiring,
  type YouTubeOwnerVerificationSmokeCommandRuntimeWiringRequest
} from "./comment-translator-youtube-owner-verification-smoke-foundation";
import {
  type YouTubeLiveTokenResolutionOwnerAuthorization,
  type YouTubeLiveTokenResolutionTrustedStatusReader,
  type YouTubeRuntimeReadOnlyOAuthScope,
  type YouTubeServerOnlyLiveTokenMaterialResolver
} from "./comment-translator-youtube-runtime-foundation";

export type YouTubeLiveChatPollingSmokeCommandFoundationContract = {
  implementationStage: "live-chat-polling-smoke-command-foundation";
  commandPath: "scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs";
  prerequisite: "owner-verification-smoke-success-before-live-chat-polling";
  endpoint: "liveChatMessages.list";
  providerUrl: "https://www.googleapis.com/youtube/v3/liveChat/messages";
  httpMethod: "GET";
  query: {
    part: "id,snippet";
    fields: "nextPageToken,pollingIntervalMillis,pageInfo(totalResults,resultsPerPage),items(id,snippet(publishedAt,type))";
  };
  pageTokenHandling: "optional-server-only-next-page-token-consumed-never-returned";
  outputPolicy: "sanitized-metadata-only";
  ownerBindingCheck: "trusted-status-provider-channel-match-before-live-chat-polling";
  targetLookupPrerequisite: "live-chat-target-lookup-readiness-and-presence-only-evidence-before-live-chat-polling";
  targetMetadataHandling: "target-lookup-presence-only-evidence-consumed-live-chat-id-never-returned";
  authorizationHandling: "server-only-header-consumed-never-returned";
  tokenValue: "never-returned-by-design";
  refreshTokenValue: "never-returned-by-design";
  requiredApproval: "same-thread-explicit-in-thread-approval";
  pollingLoop: "not-implemented-one-step-only";
  quotaWrite: "not-implemented";
  translatorPipelineWiring: "not-implemented";
  browserStorage: "unchanged";
};

export type YouTubeLiveChatPollingSmokeFetchRequest = {
  endpoint: "liveChatMessages.list";
  method: "GET";
  providerUrl: "https://www.googleapis.com/youtube/v3/liveChat/messages";
  url: string;
  liveChatId: string;
  pageToken: string | null;
  query: YouTubeLiveChatPollingSmokeCommandFoundationContract["query"];
  headers: {
    Authorization: string;
  };
};

export type YouTubeLiveChatPollingSmokeFetchResult = {
  ok: boolean;
  status: number;
  body: unknown;
};

export type YouTubeLiveChatPollingSmokeFetch = (
  request: YouTubeLiveChatPollingSmokeFetchRequest
) => Promise<YouTubeLiveChatPollingSmokeFetchResult>;

export type YouTubeLiveChatPollingSmokeFoundationRequest = {
  credentialReferenceId: string;
  expectedProviderChannelReference: string;
  liveChatId: string;
  pageToken?: string | null;
  ownerVerificationSmokeSuccess: boolean;
  liveChatTargetLookupReadinessConfirmed: boolean;
  liveChatTargetPresenceOnlyEvidence: boolean;
  ownerAuthorization: YouTubeLiveTokenResolutionOwnerAuthorization;
  credentialResolutionDisabled: boolean;
  requiredScope: YouTubeRuntimeReadOnlyOAuthScope;
  nowIso: string;
  trustedStatusReader: YouTubeLiveTokenResolutionTrustedStatusReader | null;
  tokenMaterialResolver: YouTubeServerOnlyLiveTokenMaterialResolver;
  fetchGoogleApi: YouTubeLiveChatPollingSmokeFetch;
};

export type YouTubeLiveChatPollingSmokeReadinessGateRequest = Omit<
  YouTubeLiveChatPollingSmokeFoundationRequest,
  "tokenMaterialResolver" | "fetchGoogleApi"
>;

type YouTubeLiveChatPollingSmokeBase = {
  command: "sanitized-youtube-live-chat-polling-smoke";
  outputPolicy: "sanitized-metadata-only";
  credentialReferenceId: string;
  provider: "youtube";
  endpoint: "liveChatMessages.list";
  providerUrl: "https://www.googleapis.com/youtube/v3/liveChat/messages";
  httpMethod: "GET";
  query: YouTubeLiveChatPollingSmokeCommandFoundationContract["query"];
  targetLookupPrerequisite: "live-chat-target-lookup-readiness-and-presence-only-evidence-before-live-chat-polling";
  ownerVerificationSmoke: "completed-prerequisite-reference-only";
  safeLiveYouTubeOAuthSmoke: "not-run";
  tokenValue: "never-returned-by-design";
  refreshTokenValue: "never-returned-by-design";
  pollingLoop: "not-implemented-one-step-only";
  quotaWrite: "not-implemented";
  translatorPipelineWiring: "not-implemented";
  remoteMigrationApply: "not-run";
};

type YouTubeLiveChatPollingSmokeBlockingStatus =
  | "blocked-owner-verification-smoke-success-prerequisite"
  | "blocked-live-chat-target-lookup-readiness-prerequisite"
  | "blocked-live-chat-target-presence-only-evidence-prerequisite"
  | "blocked-missing-live-chat-target"
  | "credential-resolution-disabled"
  | "blocked-owner-authorization"
  | "unavailable"
  | "expired"
  | "scope-missing"
  | "owner-verification-mismatch-aborted";

export type YouTubeLiveChatPollingSmokeReadinessGateResult =
  | (YouTubeLiveChatPollingSmokeBase & {
      status: "owner-binding-verified-before-live-chat-polling";
      ownerBinding: "verified-before-live-chat-polling";
      liveChatTarget: "present";
      liveChatPollingSmoke: "not-run-readiness-only";
      providerAccess: "not-run-readiness-only";
    })
  | (YouTubeLiveChatPollingSmokeBase & {
      status: YouTubeLiveChatPollingSmokeBlockingStatus;
      ownerBinding: "not-checked" | "mismatch";
      liveChatTarget: "present" | "absent";
      liveChatPollingSmoke: "not-run" | "aborted-before-provider-access";
      providerAccess: "not-run";
      reason: string;
    });

export type YouTubeLiveChatPollingSmokeTokenMaterialAvailabilityGateResult =
  | (YouTubeLiveChatPollingSmokeBase & {
      status: "live-chat-polling-token-material-available";
      ownerBinding: "verified-before-live-chat-polling";
      liveChatTarget: "present";
      liveChatPollingSmoke: "not-run-token-material-availability-only";
      providerAccess: "not-run-token-material-availability-only";
      tokenMaterialAvailability: "available";
      authorizationHandling: "server-only-header-consumed-never-returned";
      serverFetchBinding: "resolved-for-server-fetch";
      approvedExecutionReadiness: "ready-for-approved-live-chat-polling-smoke";
    })
  | (YouTubeLiveChatPollingSmokeBase & {
      status: YouTubeLiveChatPollingSmokeBlockingStatus | "unavailable";
      ownerBinding: "not-checked" | "mismatch" | "verified-before-live-chat-polling";
      liveChatTarget: "present" | "absent";
      liveChatPollingSmoke:
        | "not-run"
        | "aborted-before-provider-access"
        | "not-run-token-material-availability-only";
      providerAccess: "not-run" | "not-run-token-material-availability-only";
      reason: string;
      approvedExecutionReadiness: "blocked-until-live-chat-polling-prerequisites-and-token-material-are-available";
    });

type YouTubeLiveChatPollingSmokeItemTypeLabel =
  | "textMessageEvent"
  | "superChatEvent"
  | "superStickerEvent"
  | "newSponsorEvent"
  | "memberMilestoneChatEvent"
  | "messageDeletedEvent"
  | "userBannedEvent"
  | "unknown"
  | "other";

type YouTubeLiveChatPollingSmokeProviderStatusLabel =
  | "provider-ok"
  | "provider-auth-rejected"
  | "provider-permission-rejected"
  | "provider-http-error";

type YouTubeLiveChatPollingSmokeProviderErrorReasonLabel =
  | "provider-error-reason-not-returned"
  | "provider-insufficient-permission"
  | "provider-live-chat-disabled"
  | "provider-live-chat-ended"
  | "provider-quota-or-rate-limited"
  | "provider-forbidden"
  | "provider-error-reason-other";

type YouTubeLiveChatPollingSmokeIntakeDiagnosticLabel =
  | "non-empty-returned-intake"
  | "empty-provider-ok-no-items"
  | "empty-provider-ok-next-page-present"
  | "empty-provider-ok-page-info-nonzero"
  | "unavailable-provider-not-ok";

export type YouTubeLiveChatPollingSmokeResponseMetadata = {
  httpStatus: number;
  ok: boolean;
  providerStatusLabel: YouTubeLiveChatPollingSmokeProviderStatusLabel;
  providerErrorReasonLabel: YouTubeLiveChatPollingSmokeProviderErrorReasonLabel;
  pageRoleLabel: "initial-page" | "next-page";
  liveChatTarget: "present";
  nextPageToken: "present" | "absent";
  pollingIntervalMillis: number | null;
  returnedItemCount: number;
  pageInfoTotalResults: number | null;
  pageInfoResultsPerPage: number | null;
  intakeDiagnosticLabel: YouTubeLiveChatPollingSmokeIntakeDiagnosticLabel;
  itemTypeDistribution: Partial<Record<YouTubeLiveChatPollingSmokeItemTypeLabel, number>>;
  textPayload: "not-returned-by-design";
};

export type YouTubeLiveChatPollingSmokeFoundationResult =
  | (YouTubeLiveChatPollingSmokeBase & {
      status: "live-chat-polling-smoke-sanitized-result";
      ownerBinding: "verified-before-live-chat-polling";
      liveChatTarget: "present";
      liveChatPollingSmoke: "executed-bounded-readonly-one-step";
      providerAccess: "liveChatMessages-list-one-step-only";
      authorizationHandling: "server-only-header-consumed-never-returned";
      serverFetchBinding: "resolved-for-server-fetch";
      responseMetadata: YouTubeLiveChatPollingSmokeResponseMetadata;
    })
  | (YouTubeLiveChatPollingSmokeBase & {
      status: YouTubeLiveChatPollingSmokeBlockingStatus | "live-chat-polling-smoke-failed-sanitized";
      ownerBinding: "not-checked" | "mismatch" | "verified-before-live-chat-polling";
      liveChatTarget: "present" | "absent";
      liveChatPollingSmoke:
        | "not-run"
        | "aborted-before-provider-access"
        | "failed-bounded-readonly-one-step";
      providerAccess: "not-run" | "liveChatMessages-list-one-step-only";
      reason: string;
    });

export type YouTubeLiveChatPollingSmokeCommandRuntimeWiringRequest =
  YouTubeOwnerVerificationSmokeCommandRuntimeWiringRequest;

export type YouTubeLiveChatPollingSmokeCommandRuntimeWiring = Pick<
  YouTubeOwnerVerificationSmokeCommandRuntimeWiring,
  "trustedStatusReader" | "tokenMaterialResolver" | "serverOnlyLiveTokenMaterialResolver"
> & {
  fetchGoogleApi: YouTubeLiveChatPollingSmokeFetch;
};

const providerUrl = "https://www.googleapis.com/youtube/v3/liveChat/messages" as const;
const query = {
  part: "id,snippet",
  fields: "nextPageToken,pollingIntervalMillis,pageInfo(totalResults,resultsPerPage),items(id,snippet(publishedAt,type))"
} as const;

export const youtubeLiveChatPollingSmokeCommandFoundationContract = {
  implementationStage: "live-chat-polling-smoke-command-foundation",
  commandPath: "scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs",
  prerequisite: "owner-verification-smoke-success-before-live-chat-polling",
  endpoint: "liveChatMessages.list",
  providerUrl,
  httpMethod: "GET",
  query,
  pageTokenHandling: "optional-server-only-next-page-token-consumed-never-returned",
  outputPolicy: "sanitized-metadata-only",
  ownerBindingCheck: "trusted-status-provider-channel-match-before-live-chat-polling",
  targetLookupPrerequisite: "live-chat-target-lookup-readiness-and-presence-only-evidence-before-live-chat-polling",
  targetMetadataHandling: "target-lookup-presence-only-evidence-consumed-live-chat-id-never-returned",
  authorizationHandling: "server-only-header-consumed-never-returned",
  tokenValue: "never-returned-by-design",
  refreshTokenValue: "never-returned-by-design",
  requiredApproval: "same-thread-explicit-in-thread-approval",
  pollingLoop: "not-implemented-one-step-only",
  quotaWrite: "not-implemented",
  translatorPipelineWiring: "not-implemented",
  browserStorage: "unchanged"
} as const satisfies YouTubeLiveChatPollingSmokeCommandFoundationContract;

export function createYouTubeLiveChatMessagesListSmokeRequest({
  serverAuthorizationHeader,
  liveChatId,
  pageToken
}: {
  serverAuthorizationHeader: string;
  liveChatId: string;
  pageToken?: string | null;
}): YouTubeLiveChatPollingSmokeFetchRequest {
  const normalizedPageToken = typeof pageToken === "string" && pageToken.trim().length > 0 ? pageToken.trim() : null;
  const params = new URLSearchParams({
    liveChatId,
    ...query,
    ...(normalizedPageToken ? { pageToken: normalizedPageToken } : {})
  });

  return {
    endpoint: "liveChatMessages.list",
    method: "GET",
    providerUrl,
    url: `${providerUrl}?${params.toString()}`,
    liveChatId,
    pageToken: normalizedPageToken,
    query,
    headers: {
      Authorization: serverAuthorizationHeader
    }
  };
}

export function createYouTubeLiveChatPollingSmokeCommandRuntimeWiring(
  request: YouTubeLiveChatPollingSmokeCommandRuntimeWiringRequest
): YouTubeLiveChatPollingSmokeCommandRuntimeWiring {
  const ownerVerificationWiring = createYouTubeOwnerVerificationSmokeCommandRuntimeWiring(request);

  return {
    ...ownerVerificationWiring,
    fetchGoogleApi: fetchYouTubeLiveChatMessagesList,
    serverOnlyLiveTokenMaterialResolver: ownerVerificationWiring.serverOnlyLiveTokenMaterialResolver
  };
}

export async function assessYouTubeLiveChatPollingSmokeReadinessGate(
  request: YouTubeLiveChatPollingSmokeReadinessGateRequest
): Promise<YouTubeLiveChatPollingSmokeReadinessGateResult> {
  const prerequisite = assessPrerequisites(request);
  if (prerequisite) {
    return prerequisite;
  }

  const ownerBinding = await assessYouTubeOwnerBindingBeforeProviderAccess({
    credentialReferenceId: request.credentialReferenceId,
    expectedProviderChannelReference: request.expectedProviderChannelReference,
    ownerAuthorization: request.ownerAuthorization,
    credentialResolutionDisabled: request.credentialResolutionDisabled,
    requiredScope: request.requiredScope,
    nowIso: request.nowIso,
    trustedStatusReader: request.trustedStatusReader
  });

  if (ownerBinding.status !== "owner-binding-verified-before-provider-access") {
    return unresolvedReadiness(
      request,
      ownerBinding.status,
      ownerBinding.ownerBinding,
      ownerBinding.ownerVerificationSmoke === "aborted-before-provider-access"
        ? "aborted-before-provider-access"
        : "not-run",
      ownerBinding.reason
    );
  }

  return {
    ...createBaseResult(request.credentialReferenceId),
    status: "owner-binding-verified-before-live-chat-polling",
    ownerBinding: "verified-before-live-chat-polling",
    liveChatTarget: "present",
    liveChatPollingSmoke: "not-run-readiness-only",
    providerAccess: "not-run-readiness-only"
  };
}

export async function assessYouTubeLiveChatPollingSmokeTokenMaterialAvailabilityGate(
  request: Omit<YouTubeLiveChatPollingSmokeFoundationRequest, "fetchGoogleApi">
): Promise<YouTubeLiveChatPollingSmokeTokenMaterialAvailabilityGateResult> {
  const readiness = await assessYouTubeLiveChatPollingSmokeReadinessGate(request);
  if (readiness.status !== "owner-binding-verified-before-live-chat-polling") {
    return {
      ...readiness,
      liveChatPollingSmoke: readiness.liveChatPollingSmoke,
      providerAccess: readiness.providerAccess,
      approvedExecutionReadiness: "blocked-until-live-chat-polling-prerequisites-and-token-material-are-available"
    };
  }

  if (request.ownerAuthorization.status !== "authorized") {
    return unresolvedTokenAvailability(
      request,
      "blocked-owner-authorization",
      "not-checked",
      "not-run",
      "not-run",
      "owner authorization is not confirmed"
    );
  }

  const tokenMaterial = await request.tokenMaterialResolver.resolveServerOnlyTokenMaterial({
    credentialReferenceId: request.credentialReferenceId,
    ownerUserId: request.ownerAuthorization.ownerUserId,
    requiredScope: request.requiredScope
  });

  if (tokenMaterial.status !== "available") {
    return unresolvedTokenAvailability(
      request,
      tokenMaterial.status,
      "verified-before-live-chat-polling",
      "not-run-token-material-availability-only",
      "not-run-token-material-availability-only",
      tokenMaterial.reason
    );
  }

  return {
    ...createBaseResult(request.credentialReferenceId),
    status: "live-chat-polling-token-material-available",
    ownerBinding: "verified-before-live-chat-polling",
    liveChatTarget: "present",
    liveChatPollingSmoke: "not-run-token-material-availability-only",
    providerAccess: "not-run-token-material-availability-only",
    tokenMaterialAvailability: "available",
    authorizationHandling: "server-only-header-consumed-never-returned",
    serverFetchBinding: "resolved-for-server-fetch",
    approvedExecutionReadiness: "ready-for-approved-live-chat-polling-smoke"
  };
}

export async function runYouTubeLiveChatPollingSmokeFoundation(
  request: YouTubeLiveChatPollingSmokeFoundationRequest
): Promise<YouTubeLiveChatPollingSmokeFoundationResult> {
  const readiness = await assessYouTubeLiveChatPollingSmokeReadinessGate(request);
  if (readiness.status !== "owner-binding-verified-before-live-chat-polling") {
    return readiness;
  }

  if (request.ownerAuthorization.status !== "authorized") {
    return unresolvedPolling(
      request,
      "blocked-owner-authorization",
      "not-checked",
      "not-run",
      "not-run",
      "owner authorization is not confirmed"
    );
  }

  const tokenMaterial = await request.tokenMaterialResolver.resolveServerOnlyTokenMaterial({
    credentialReferenceId: request.credentialReferenceId,
    ownerUserId: request.ownerAuthorization.ownerUserId,
    requiredScope: request.requiredScope
  });

  if (tokenMaterial.status !== "available") {
    return unresolvedPolling(
      request,
      tokenMaterial.status,
      "verified-before-live-chat-polling",
      "not-run",
      "not-run",
      tokenMaterial.reason
    );
  }

  try {
    const providerResponse = await request.fetchGoogleApi(
      createYouTubeLiveChatMessagesListSmokeRequest({
        serverAuthorizationHeader: tokenMaterial.serverAuthorizationHeader,
        liveChatId: request.liveChatId.trim(),
        pageToken: request.pageToken ?? null
      })
    );

    return {
      ...createBaseResult(request.credentialReferenceId),
      status: "live-chat-polling-smoke-sanitized-result",
      ownerBinding: "verified-before-live-chat-polling",
      liveChatTarget: "present",
      liveChatPollingSmoke: "executed-bounded-readonly-one-step",
      providerAccess: "liveChatMessages-list-one-step-only",
      authorizationHandling: "server-only-header-consumed-never-returned",
      serverFetchBinding: "resolved-for-server-fetch",
      responseMetadata: createSanitizedPollingResponseMetadata(providerResponse, request.pageToken ?? null)
    };
  } catch {
    return unresolvedPolling(
      request,
      "live-chat-polling-smoke-failed-sanitized",
      "verified-before-live-chat-polling",
      "failed-bounded-readonly-one-step",
      "liveChatMessages-list-one-step-only",
      "provider-fetch-failed"
    );
  }
}

function assessPrerequisites(
  request: YouTubeLiveChatPollingSmokeReadinessGateRequest
): YouTubeLiveChatPollingSmokeReadinessGateResult | null {
  if (!request.ownerVerificationSmokeSuccess) {
    return unresolvedReadiness(
      request,
      "blocked-owner-verification-smoke-success-prerequisite",
      "not-checked",
      "not-run",
      "owner verification smoke success must be recorded before Live Chat polling smoke"
    );
  }

  if (!request.liveChatTargetLookupReadinessConfirmed) {
    return unresolvedReadiness(
      request,
      "blocked-live-chat-target-lookup-readiness-prerequisite",
      "not-checked",
      "not-run",
      "Live Chat target lookup readiness must be confirmed before Live Chat polling smoke"
    );
  }

  if (!request.liveChatTargetPresenceOnlyEvidence) {
    return unresolvedReadiness(
      request,
      "blocked-live-chat-target-presence-only-evidence-prerequisite",
      "not-checked",
      "not-run",
      "Live Chat target lookup presence-only evidence must be recorded before Live Chat polling smoke"
    );
  }

  if (!request.liveChatId.trim()) {
    return unresolvedReadiness(
      request,
      "blocked-missing-live-chat-target",
      "not-checked",
      "not-run",
      "operator-local Live Chat target metadata is missing"
    );
  }

  return null;
}

function createBaseResult(credentialReferenceId: string): YouTubeLiveChatPollingSmokeBase {
  return {
    command: "sanitized-youtube-live-chat-polling-smoke",
    outputPolicy: "sanitized-metadata-only",
    credentialReferenceId,
    provider: "youtube",
    endpoint: youtubeLiveChatPollingSmokeCommandFoundationContract.endpoint,
    providerUrl,
    httpMethod: "GET",
    query,
    targetLookupPrerequisite: youtubeLiveChatPollingSmokeCommandFoundationContract.targetLookupPrerequisite,
    ownerVerificationSmoke: "completed-prerequisite-reference-only",
    safeLiveYouTubeOAuthSmoke: "not-run",
    tokenValue: "never-returned-by-design",
    refreshTokenValue: "never-returned-by-design",
    pollingLoop: "not-implemented-one-step-only",
    quotaWrite: "not-implemented",
    translatorPipelineWiring: "not-implemented",
    remoteMigrationApply: "not-run"
  };
}

function unresolvedReadiness(
  request: YouTubeLiveChatPollingSmokeReadinessGateRequest,
  status: YouTubeLiveChatPollingSmokeBlockingStatus,
  ownerBinding: "not-checked" | "mismatch",
  liveChatPollingSmoke: "not-run" | "aborted-before-provider-access",
  reason: string
): YouTubeLiveChatPollingSmokeReadinessGateResult {
  return {
    ...createBaseResult(request.credentialReferenceId),
    status,
    ownerBinding,
    liveChatTarget: request.liveChatId.trim() ? "present" : "absent",
    liveChatPollingSmoke,
    providerAccess: "not-run",
    reason
  };
}

function unresolvedTokenAvailability(
  request: Omit<YouTubeLiveChatPollingSmokeFoundationRequest, "fetchGoogleApi">,
  status: YouTubeLiveChatPollingSmokeBlockingStatus | "unavailable",
  ownerBinding: "not-checked" | "mismatch" | "verified-before-live-chat-polling",
  liveChatPollingSmoke:
    | "not-run"
    | "aborted-before-provider-access"
    | "not-run-token-material-availability-only",
  providerAccess: "not-run" | "not-run-token-material-availability-only",
  reason: string
): YouTubeLiveChatPollingSmokeTokenMaterialAvailabilityGateResult {
  return {
    ...createBaseResult(request.credentialReferenceId),
    status,
    ownerBinding,
    liveChatTarget: request.liveChatId.trim() ? "present" : "absent",
    liveChatPollingSmoke,
    providerAccess,
    reason,
    approvedExecutionReadiness: "blocked-until-live-chat-polling-prerequisites-and-token-material-are-available"
  };
}

function unresolvedPolling(
  request: YouTubeLiveChatPollingSmokeFoundationRequest,
  status: YouTubeLiveChatPollingSmokeBlockingStatus | "live-chat-polling-smoke-failed-sanitized",
  ownerBinding: "not-checked" | "mismatch" | "verified-before-live-chat-polling",
  liveChatPollingSmoke: "not-run" | "aborted-before-provider-access" | "failed-bounded-readonly-one-step",
  providerAccess: "not-run" | "liveChatMessages-list-one-step-only",
  reason: string
): YouTubeLiveChatPollingSmokeFoundationResult {
  return {
    ...createBaseResult(request.credentialReferenceId),
    status,
    ownerBinding,
    liveChatTarget: request.liveChatId.trim() ? "present" : "absent",
    liveChatPollingSmoke,
    providerAccess,
    reason
  };
}

function createSanitizedPollingResponseMetadata(
  providerResponse: YouTubeLiveChatPollingSmokeFetchResult,
  pageToken?: string | null
): YouTubeLiveChatPollingSmokeResponseMetadata {
  const body = asRecord(providerResponse.body);
  const pageInfo = asRecord(body.pageInfo);
  const items = Array.isArray(body.items) ? body.items : [];
  const pageInfoTotalResults =
    typeof pageInfo.totalResults === "number" && Number.isFinite(pageInfo.totalResults)
      ? pageInfo.totalResults
      : null;
  const pageInfoResultsPerPage =
    typeof pageInfo.resultsPerPage === "number" && Number.isFinite(pageInfo.resultsPerPage)
      ? pageInfo.resultsPerPage
      : null;
  const pollingIntervalMillis =
    typeof body.pollingIntervalMillis === "number" && Number.isFinite(body.pollingIntervalMillis)
      ? body.pollingIntervalMillis
      : null;
  const nextPageToken = typeof body.nextPageToken === "string" && body.nextPageToken.length > 0 ? "present" : "absent";
  const returnedItemCount = items.length;

  return {
    httpStatus: providerResponse.status,
    ok: providerResponse.ok,
    providerStatusLabel: sanitizeProviderStatusLabel(providerResponse),
    providerErrorReasonLabel: sanitizeProviderErrorReasonLabel(providerResponse),
    pageRoleLabel: typeof pageToken === "string" && pageToken.trim().length > 0 ? "next-page" : "initial-page",
    liveChatTarget: "present",
    nextPageToken,
    pollingIntervalMillis,
    returnedItemCount,
    pageInfoTotalResults,
    pageInfoResultsPerPage,
    intakeDiagnosticLabel: createIntakeDiagnosticLabel({
      ok: providerResponse.ok,
      nextPageToken,
      pageInfoTotalResults,
      returnedItemCount
    }),
    itemTypeDistribution: createSanitizedItemTypeDistribution(items),
    textPayload: "not-returned-by-design"
  };
}

function createIntakeDiagnosticLabel({
  ok,
  nextPageToken,
  pageInfoTotalResults,
  returnedItemCount
}: {
  ok: boolean;
  nextPageToken: "present" | "absent";
  pageInfoTotalResults: number | null;
  returnedItemCount: number;
}): YouTubeLiveChatPollingSmokeIntakeDiagnosticLabel {
  if (!ok) {
    return "unavailable-provider-not-ok";
  }

  if (returnedItemCount > 0) {
    return "non-empty-returned-intake";
  }

  if (nextPageToken === "present") {
    return "empty-provider-ok-next-page-present";
  }

  if (typeof pageInfoTotalResults === "number" && pageInfoTotalResults > 0) {
    return "empty-provider-ok-page-info-nonzero";
  }

  return "empty-provider-ok-no-items";
}

function sanitizeProviderStatusLabel(
  providerResponse: YouTubeLiveChatPollingSmokeFetchResult
): YouTubeLiveChatPollingSmokeProviderStatusLabel {
  if (providerResponse.ok) {
    return "provider-ok";
  }

  if (providerResponse.status === 401) {
    return "provider-auth-rejected";
  }

  if (providerResponse.status === 403) {
    return "provider-permission-rejected";
  }

  return "provider-http-error";
}

function sanitizeProviderErrorReasonLabel(
  providerResponse: YouTubeLiveChatPollingSmokeFetchResult
): YouTubeLiveChatPollingSmokeProviderErrorReasonLabel {
  const reasons = extractProviderErrorReasonCandidates(providerResponse.body);
  if (providerResponse.ok || reasons.length === 0) {
    return "provider-error-reason-not-returned";
  }

  for (const reason of reasons) {
    const label = mapProviderErrorReasonToLabel(reason);
    if (label !== null) {
      return label;
    }
  }

  return "provider-error-reason-other";
}

function extractProviderErrorReasonCandidates(body: unknown): string[] {
  const candidates: string[] = [];
  const error = asRecord(asRecord(body).error);

  appendProviderReasonCandidate(candidates, error.reason);

  for (const entry of Array.isArray(error.errors) ? error.errors : []) {
    appendProviderReasonCandidate(candidates, asRecord(entry).reason);
  }

  for (const entry of Array.isArray(error.details) ? error.details : []) {
    appendProviderReasonCandidate(candidates, asRecord(entry).reason);
  }

  return candidates;
}

function appendProviderReasonCandidate(candidates: string[], value: unknown): void {
  if (typeof value === "string" && value.trim().length > 0) {
    candidates.push(value.trim());
  }
}

function mapProviderErrorReasonToLabel(
  reason: string
): Exclude<
  YouTubeLiveChatPollingSmokeProviderErrorReasonLabel,
  "provider-error-reason-not-returned" | "provider-error-reason-other"
> | null {
  switch (reason) {
    case "insufficientPermissions":
    case "insufficientPermission":
    case "insufficient_scope":
      return "provider-insufficient-permission";
    case "liveChatDisabled":
    case "liveChatDisabledForChannel":
      return "provider-live-chat-disabled";
    case "liveChatEnded":
    case "chatEnded":
      return "provider-live-chat-ended";
    case "quotaExceeded":
    case "rateLimitExceeded":
    case "userRateLimitExceeded":
    case "dailyLimitExceeded":
      return "provider-quota-or-rate-limited";
    case "forbidden":
      return "provider-forbidden";
    default:
      return null;
  }
}

function createSanitizedItemTypeDistribution(
  items: unknown[]
): Partial<Record<YouTubeLiveChatPollingSmokeItemTypeLabel, number>> {
  const distribution: Partial<Record<YouTubeLiveChatPollingSmokeItemTypeLabel, number>> = {};

  for (const item of items) {
    const snippet = asRecord(asRecord(item).snippet);
    const label = sanitizeItemTypeLabel(snippet.type);
    distribution[label] = (distribution[label] ?? 0) + 1;
  }

  return distribution;
}

function sanitizeItemTypeLabel(value: unknown): YouTubeLiveChatPollingSmokeItemTypeLabel {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "unknown";
  }

  const normalized = value.trim();
  switch (normalized) {
    case "textMessageEvent":
    case "superChatEvent":
    case "superStickerEvent":
    case "newSponsorEvent":
    case "memberMilestoneChatEvent":
    case "messageDeletedEvent":
    case "userBannedEvent":
      return normalized;
    default:
      return "other";
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

async function fetchYouTubeLiveChatMessagesList(
  request: YouTubeLiveChatPollingSmokeFetchRequest
): Promise<YouTubeLiveChatPollingSmokeFetchResult> {
  const response = await fetch(request.url, {
    method: request.method,
    headers: request.headers
  });

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    body
  };
}
