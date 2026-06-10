import "server-only";

import {
  assessYouTubeOwnerBindingBeforeProviderAccess,
  createYouTubeOwnerVerificationSmokeCommandRuntimeWiring,
  type YouTubeOwnerVerificationSmokeCommandRuntimeWiringRequest
} from "./comment-translator-youtube-owner-verification-smoke-foundation";
import {
  type YouTubeLiveTokenResolutionOwnerAuthorization,
  type YouTubeLiveTokenResolutionTrustedStatusReader,
  type YouTubeRuntimeReadOnlyOAuthScope,
  type YouTubeServerOnlyLiveTokenMaterialResolver
} from "./comment-translator-youtube-runtime-foundation";

export type YouTubeLiveChatTargetLookupCommandFoundationContract = {
  implementationStage: "live-chat-target-lookup-command-foundation";
  commandPath: "scripts/comment-translator-youtube-live-chat-target-lookup-command.mjs";
  prerequisite: "owner-verification-smoke-success-before-live-chat-target-lookup";
  endpoint: "liveBroadcasts.list-mine-active";
  providerUrl: "https://www.googleapis.com/youtube/v3/liveBroadcasts";
  httpMethod: "GET";
  query: {
    part: "id,snippet,status";
    mine: "true";
    broadcastStatus: "active";
    fields: "items(id,snippet(liveChatId),status(lifeCycleStatus,privacyStatus)),pageInfo(totalResults,resultsPerPage)";
  };
  outputPolicy: "sanitized-metadata-only";
  ownerBindingCheck: "trusted-status-provider-channel-match-before-live-chat-target-lookup";
  targetMetadataHandling: "live-chat-id-presence-only-never-returned";
  targetIdSource: "owned-broadcast-snippet-liveChatId";
  authorizationHandling: "server-only-header-consumed-never-returned";
  tokenValue: "never-returned-by-design";
  refreshTokenValue: "never-returned-by-design";
  requiredApproval: "same-thread-explicit-in-thread-approval";
  pollingExecution: "not-run";
  quotaWrite: "not-implemented";
  translatorPipelineWiring: "not-implemented";
  browserStorage: "unchanged";
};

export type YouTubeLiveChatTargetLookupFetchRequest = {
  endpoint: "liveBroadcasts.list-mine-active";
  method: "GET";
  providerUrl: "https://www.googleapis.com/youtube/v3/liveBroadcasts";
  url: string;
  query: YouTubeLiveChatTargetLookupCommandFoundationContract["query"];
  headers: {
    Authorization: string;
  };
};

export type YouTubeLiveChatTargetLookupFetchResult = {
  ok: boolean;
  status: number;
  body: unknown;
};

export type YouTubeLiveChatTargetLookupFetch = (
  request: YouTubeLiveChatTargetLookupFetchRequest
) => Promise<YouTubeLiveChatTargetLookupFetchResult>;

export type YouTubeLiveChatTargetLookupFoundationRequest = {
  credentialReferenceId: string;
  expectedProviderChannelReference: string;
  ownerVerificationSmokeSuccess: boolean;
  ownerAuthorization: YouTubeLiveTokenResolutionOwnerAuthorization;
  credentialResolutionDisabled: boolean;
  requiredScope: YouTubeRuntimeReadOnlyOAuthScope;
  nowIso: string;
  trustedStatusReader: YouTubeLiveTokenResolutionTrustedStatusReader | null;
  tokenMaterialResolver: YouTubeServerOnlyLiveTokenMaterialResolver;
  fetchGoogleApi: YouTubeLiveChatTargetLookupFetch;
};

export type YouTubeLiveChatTargetLookupReadinessGateRequest = Omit<
  YouTubeLiveChatTargetLookupFoundationRequest,
  "tokenMaterialResolver" | "fetchGoogleApi"
>;

type YouTubeLiveChatTargetLookupBase = {
  command: "sanitized-youtube-live-chat-target-lookup";
  outputPolicy: "sanitized-metadata-only";
  credentialReferenceId: string;
  provider: "youtube";
  endpoint: "liveBroadcasts.list-mine-active";
  providerUrl: "https://www.googleapis.com/youtube/v3/liveBroadcasts";
  httpMethod: "GET";
  ownerVerificationSmoke: "completed-prerequisite-reference-only";
  tokenValue: "never-returned-by-design";
  refreshTokenValue: "never-returned-by-design";
  safeLiveYouTubeOAuthSmoke: "not-run";
  pollingExecution: "not-run";
  liveChatPollingSmoke: "not-run";
  quotaWrite: "not-implemented";
  translatorPipelineWiring: "not-implemented";
  remoteMigrationApply: "not-run";
};

type YouTubeLiveChatTargetLookupBlockingStatus =
  | "blocked-owner-verification-smoke-success-prerequisite"
  | "credential-resolution-disabled"
  | "blocked-owner-authorization"
  | "unavailable"
  | "expired"
  | "scope-missing"
  | "owner-verification-mismatch-aborted";

export type YouTubeLiveChatTargetLookupReadinessGateResult =
  | (YouTubeLiveChatTargetLookupBase & {
      status: "owner-binding-verified-before-live-chat-target-lookup";
      ownerBinding: "verified-before-live-chat-target-lookup";
      liveChatTarget: "unknown-until-approved-lookup";
      liveChatTargetLookup: "not-run-readiness-only";
      providerAccess: "not-run-readiness-only";
    })
  | (YouTubeLiveChatTargetLookupBase & {
      status: YouTubeLiveChatTargetLookupBlockingStatus;
      ownerBinding: "not-checked" | "mismatch";
      liveChatTarget: "unknown-until-approved-lookup";
      liveChatTargetLookup: "not-run" | "aborted-before-provider-access";
      providerAccess: "not-run";
      reason: string;
    });

export type YouTubeLiveChatTargetLookupTokenMaterialAvailabilityGateResult =
  | (YouTubeLiveChatTargetLookupBase & {
      status: "live-chat-target-lookup-token-material-available";
      ownerBinding: "verified-before-live-chat-target-lookup";
      liveChatTarget: "unknown-until-approved-lookup";
      liveChatTargetLookup: "not-run-token-material-availability-only";
      providerAccess: "not-run-token-material-availability-only";
      tokenMaterialAvailability: "available";
      authorizationHandling: "server-only-header-consumed-never-returned";
      serverFetchBinding: "resolved-for-server-fetch";
      approvedExecutionReadiness: "ready-for-approved-live-chat-target-lookup";
    })
  | (YouTubeLiveChatTargetLookupBase & {
      status: YouTubeLiveChatTargetLookupBlockingStatus | "unavailable";
      ownerBinding: "not-checked" | "mismatch" | "verified-before-live-chat-target-lookup";
      liveChatTarget: "unknown-until-approved-lookup";
      liveChatTargetLookup:
        | "not-run"
        | "aborted-before-provider-access"
        | "not-run-token-material-availability-only";
      providerAccess: "not-run" | "not-run-token-material-availability-only";
      reason: string;
      approvedExecutionReadiness: "blocked-until-live-chat-target-lookup-prerequisites-and-token-material-are-available";
    });

export type YouTubeLiveChatTargetLookupResponseMetadata = {
  httpStatus: number;
  ok: boolean;
  activeOwnedBroadcast: "present";
  liveChatTarget: "present";
  returnedItemCount: number;
  pageInfoTotalResults: number | null;
  broadcastLifecycleStatus: "present" | "absent";
  privacyStatus: "present" | "absent";
  targetIdValue: "not-returned-by-design";
};

export type YouTubeLiveChatTargetLookupFailureMetadata = {
  providerFailureClass: "http-error" | "fetch-exception";
  httpStatus: number | null;
  ok: false;
};

export type YouTubeLiveChatTargetLookupFoundationResult =
  | (YouTubeLiveChatTargetLookupBase & {
      status: "live-chat-target-lookup-sanitized-result";
      ownerBinding: "verified-before-live-chat-target-lookup";
      liveChatTarget: "present";
      liveChatTargetLookup: "executed-bounded-readonly-one-step";
      providerAccess: "liveBroadcasts-list-target-lookup-only";
      authorizationHandling: "server-only-header-consumed-never-returned";
      serverFetchBinding: "resolved-for-server-fetch";
      responseMetadata: YouTubeLiveChatTargetLookupResponseMetadata;
    })
  | (YouTubeLiveChatTargetLookupBase & {
      status:
        | YouTubeLiveChatTargetLookupBlockingStatus
        | "blocked-no-active-owned-broadcast"
        | "blocked-missing-or-disabled-live-chat-target"
        | "blocked-live-streaming-not-enabled"
        | "live-chat-target-lookup-failed-sanitized";
      ownerBinding: "not-checked" | "mismatch" | "verified-before-live-chat-target-lookup";
      liveChatTarget: "unknown-until-approved-lookup" | "absent";
      liveChatTargetLookup:
        | "not-run"
        | "aborted-before-provider-access"
        | "lookup-completed-no-usable-target"
        | "failed-bounded-readonly-one-step";
      providerAccess: "not-run" | "liveBroadcasts-list-target-lookup-only";
      reason: string;
      providerErrorReason?: "liveStreamingNotEnabled" | "not-returned-by-design";
      failureMetadata?: YouTubeLiveChatTargetLookupFailureMetadata;
    });

export type YouTubeLiveChatTargetLookupCommandRuntimeWiringRequest =
  YouTubeOwnerVerificationSmokeCommandRuntimeWiringRequest;

export type YouTubeLiveChatTargetLookupCommandRuntimeWiring = {
  trustedStatusReader: YouTubeLiveTokenResolutionTrustedStatusReader;
  tokenMaterialResolver: YouTubeServerOnlyLiveTokenMaterialResolver;
  fetchGoogleApi: YouTubeLiveChatTargetLookupFetch;
  serverOnlyLiveTokenMaterialResolver:
    | "connected-sanitized-unavailable-runtime-adapter"
    | "connected-operator-local-runtime-adapter"
    | "connected-injected-runtime-adapter";
};

const providerUrl = "https://www.googleapis.com/youtube/v3/liveBroadcasts" as const;
const query = {
  part: "id,snippet,status",
  mine: "true",
  broadcastStatus: "active",
  fields: "items(id,snippet(liveChatId),status(lifeCycleStatus,privacyStatus)),pageInfo(totalResults,resultsPerPage)"
} as const;

export const youtubeLiveChatTargetLookupCommandFoundationContract = {
  implementationStage: "live-chat-target-lookup-command-foundation",
  commandPath: "scripts/comment-translator-youtube-live-chat-target-lookup-command.mjs",
  prerequisite: "owner-verification-smoke-success-before-live-chat-target-lookup",
  endpoint: "liveBroadcasts.list-mine-active",
  providerUrl,
  httpMethod: "GET",
  query,
  outputPolicy: "sanitized-metadata-only",
  ownerBindingCheck: "trusted-status-provider-channel-match-before-live-chat-target-lookup",
  targetMetadataHandling: "live-chat-id-presence-only-never-returned",
  targetIdSource: "owned-broadcast-snippet-liveChatId",
  authorizationHandling: "server-only-header-consumed-never-returned",
  tokenValue: "never-returned-by-design",
  refreshTokenValue: "never-returned-by-design",
  requiredApproval: "same-thread-explicit-in-thread-approval",
  pollingExecution: "not-run",
  quotaWrite: "not-implemented",
  translatorPipelineWiring: "not-implemented",
  browserStorage: "unchanged"
} as const satisfies YouTubeLiveChatTargetLookupCommandFoundationContract;

export function createYouTubeLiveBroadcastsListTargetLookupRequest({
  serverAuthorizationHeader
}: {
  serverAuthorizationHeader: string;
}): YouTubeLiveChatTargetLookupFetchRequest {
  const params = new URLSearchParams(query);

  return {
    endpoint: "liveBroadcasts.list-mine-active",
    method: "GET",
    providerUrl,
    url: `${providerUrl}?${params.toString()}`,
    query,
    headers: {
      Authorization: serverAuthorizationHeader
    }
  };
}

export function createYouTubeLiveChatTargetLookupCommandRuntimeWiring(
  request: YouTubeLiveChatTargetLookupCommandRuntimeWiringRequest
): YouTubeLiveChatTargetLookupCommandRuntimeWiring {
  const ownerVerificationWiring = createYouTubeOwnerVerificationSmokeCommandRuntimeWiring(request);

  return {
    trustedStatusReader: ownerVerificationWiring.trustedStatusReader,
    tokenMaterialResolver: ownerVerificationWiring.tokenMaterialResolver,
    fetchGoogleApi: fetchYouTubeLiveBroadcastsListTargetLookup,
    serverOnlyLiveTokenMaterialResolver: ownerVerificationWiring.serverOnlyLiveTokenMaterialResolver
  };
}

export async function assessYouTubeLiveChatTargetLookupReadinessGate(
  request: YouTubeLiveChatTargetLookupReadinessGateRequest
): Promise<YouTubeLiveChatTargetLookupReadinessGateResult> {
  if (!request.ownerVerificationSmokeSuccess) {
    return unresolvedReadiness(
      request,
      "blocked-owner-verification-smoke-success-prerequisite",
      "not-checked",
      "not-run",
      "owner verification smoke success must be recorded before Live Chat target lookup"
    );
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
    status: "owner-binding-verified-before-live-chat-target-lookup",
    ownerBinding: "verified-before-live-chat-target-lookup",
    liveChatTarget: "unknown-until-approved-lookup",
    liveChatTargetLookup: "not-run-readiness-only",
    providerAccess: "not-run-readiness-only"
  };
}

export async function assessYouTubeLiveChatTargetLookupTokenMaterialAvailabilityGate(
  request: Omit<YouTubeLiveChatTargetLookupFoundationRequest, "fetchGoogleApi">
): Promise<YouTubeLiveChatTargetLookupTokenMaterialAvailabilityGateResult> {
  const readiness = await assessYouTubeLiveChatTargetLookupReadinessGate(request);
  if (readiness.status !== "owner-binding-verified-before-live-chat-target-lookup") {
    return {
      ...readiness,
      approvedExecutionReadiness:
        "blocked-until-live-chat-target-lookup-prerequisites-and-token-material-are-available"
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
      "verified-before-live-chat-target-lookup",
      "not-run-token-material-availability-only",
      "not-run-token-material-availability-only",
      tokenMaterial.reason
    );
  }

  return {
    ...createBaseResult(request.credentialReferenceId),
    status: "live-chat-target-lookup-token-material-available",
    ownerBinding: "verified-before-live-chat-target-lookup",
    liveChatTarget: "unknown-until-approved-lookup",
    liveChatTargetLookup: "not-run-token-material-availability-only",
    providerAccess: "not-run-token-material-availability-only",
    tokenMaterialAvailability: "available",
    authorizationHandling: "server-only-header-consumed-never-returned",
    serverFetchBinding: "resolved-for-server-fetch",
    approvedExecutionReadiness: "ready-for-approved-live-chat-target-lookup"
  };
}

export async function runYouTubeLiveChatTargetLookupFoundation(
  request: YouTubeLiveChatTargetLookupFoundationRequest
): Promise<YouTubeLiveChatTargetLookupFoundationResult> {
  const readiness = await assessYouTubeLiveChatTargetLookupReadinessGate(request);
  if (readiness.status !== "owner-binding-verified-before-live-chat-target-lookup") {
    return readiness;
  }

  if (request.ownerAuthorization.status !== "authorized") {
    return unresolvedLookup(
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
    return unresolvedLookup(
      request,
      tokenMaterial.status,
      "verified-before-live-chat-target-lookup",
      "not-run",
      "not-run",
      tokenMaterial.reason
    );
  }

  let providerResponse: YouTubeLiveChatTargetLookupFetchResult;
  try {
    providerResponse = await request.fetchGoogleApi(
      createYouTubeLiveBroadcastsListTargetLookupRequest({
        serverAuthorizationHeader: tokenMaterial.serverAuthorizationHeader
      })
    );
  } catch {
    return unresolvedLookup(
      request,
      "live-chat-target-lookup-failed-sanitized",
      "verified-before-live-chat-target-lookup",
      "failed-bounded-readonly-one-step",
      "liveBroadcasts-list-target-lookup-only",
      "provider-fetch-failed",
      "absent",
      createSanitizedFailureMetadata("fetch-exception", null),
      "not-returned-by-design"
    );
  }

  if (!providerResponse.ok) {
    return unresolvedProviderResponse(request, providerResponse);
  }

  const body = asRecord(providerResponse.body);
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length < 1) {
    return unresolvedLookup(
      request,
      "blocked-no-active-owned-broadcast",
      "verified-before-live-chat-target-lookup",
      "lookup-completed-no-usable-target",
      "liveBroadcasts-list-target-lookup-only",
      "no active owned broadcast was returned by target lookup",
      "absent"
    );
  }

  const firstItem = asRecord(items[0]);
  const snippet = asRecord(firstItem.snippet);
  const target = typeof snippet.liveChatId === "string" ? snippet.liveChatId.trim() : "";

  if (!target) {
    return unresolvedLookup(
      request,
      "blocked-missing-or-disabled-live-chat-target",
      "verified-before-live-chat-target-lookup",
      "lookup-completed-no-usable-target",
      "liveBroadcasts-list-target-lookup-only",
      "active owned broadcast did not include an enabled live chat target",
      "absent"
    );
  }

  return {
    ...createBaseResult(request.credentialReferenceId),
    status: "live-chat-target-lookup-sanitized-result",
    ownerBinding: "verified-before-live-chat-target-lookup",
    liveChatTarget: "present",
    liveChatTargetLookup: "executed-bounded-readonly-one-step",
    providerAccess: "liveBroadcasts-list-target-lookup-only",
    authorizationHandling: "server-only-header-consumed-never-returned",
    serverFetchBinding: "resolved-for-server-fetch",
    responseMetadata: createSanitizedTargetLookupResponseMetadata(providerResponse)
  };
}

function createBaseResult(credentialReferenceId: string): YouTubeLiveChatTargetLookupBase {
  return {
    command: "sanitized-youtube-live-chat-target-lookup",
    outputPolicy: "sanitized-metadata-only",
    credentialReferenceId,
    provider: "youtube",
    endpoint: youtubeLiveChatTargetLookupCommandFoundationContract.endpoint,
    providerUrl,
    httpMethod: "GET",
    ownerVerificationSmoke: "completed-prerequisite-reference-only",
    tokenValue: "never-returned-by-design",
    refreshTokenValue: "never-returned-by-design",
    safeLiveYouTubeOAuthSmoke: "not-run",
    pollingExecution: "not-run",
    liveChatPollingSmoke: "not-run",
    quotaWrite: "not-implemented",
    translatorPipelineWiring: "not-implemented",
    remoteMigrationApply: "not-run"
  };
}

function unresolvedReadiness(
  request: YouTubeLiveChatTargetLookupReadinessGateRequest,
  status: YouTubeLiveChatTargetLookupBlockingStatus,
  ownerBinding: "not-checked" | "mismatch",
  liveChatTargetLookup: "not-run" | "aborted-before-provider-access",
  reason: string
): YouTubeLiveChatTargetLookupReadinessGateResult {
  return {
    ...createBaseResult(request.credentialReferenceId),
    status,
    ownerBinding,
    liveChatTarget: "unknown-until-approved-lookup",
    liveChatTargetLookup,
    providerAccess: "not-run",
    reason
  };
}

function unresolvedTokenAvailability(
  request: Omit<YouTubeLiveChatTargetLookupFoundationRequest, "fetchGoogleApi">,
  status: YouTubeLiveChatTargetLookupBlockingStatus | "unavailable",
  ownerBinding: "not-checked" | "mismatch" | "verified-before-live-chat-target-lookup",
  liveChatTargetLookup:
    | "not-run"
    | "aborted-before-provider-access"
    | "not-run-token-material-availability-only",
  providerAccess: "not-run" | "not-run-token-material-availability-only",
  reason: string
): YouTubeLiveChatTargetLookupTokenMaterialAvailabilityGateResult {
  return {
    ...createBaseResult(request.credentialReferenceId),
    status,
    ownerBinding,
    liveChatTarget: "unknown-until-approved-lookup",
    liveChatTargetLookup,
    providerAccess,
    reason,
    approvedExecutionReadiness:
      "blocked-until-live-chat-target-lookup-prerequisites-and-token-material-are-available"
  };
}

function unresolvedLookup(
  request: YouTubeLiveChatTargetLookupFoundationRequest,
  status: Extract<
    YouTubeLiveChatTargetLookupFoundationResult["status"],
    | YouTubeLiveChatTargetLookupBlockingStatus
    | "blocked-no-active-owned-broadcast"
    | "blocked-missing-or-disabled-live-chat-target"
    | "live-chat-target-lookup-failed-sanitized"
  >,
  ownerBinding: "not-checked" | "mismatch" | "verified-before-live-chat-target-lookup",
  liveChatTargetLookup:
    | "not-run"
    | "aborted-before-provider-access"
    | "lookup-completed-no-usable-target"
    | "failed-bounded-readonly-one-step",
  providerAccess: "not-run" | "liveBroadcasts-list-target-lookup-only",
  reason: string,
  liveChatTarget: "unknown-until-approved-lookup" | "absent" = "unknown-until-approved-lookup",
  failureMetadata?: YouTubeLiveChatTargetLookupFailureMetadata,
  providerErrorReason?: "not-returned-by-design"
): YouTubeLiveChatTargetLookupFoundationResult {
  return {
    ...createBaseResult(request.credentialReferenceId),
    status,
    ownerBinding,
    liveChatTarget,
    liveChatTargetLookup,
    providerAccess,
    reason,
    ...(failureMetadata ? { failureMetadata } : {}),
    ...(providerErrorReason ? { providerErrorReason } : {})
  };
}

function unresolvedProviderResponse(
  request: YouTubeLiveChatTargetLookupFoundationRequest,
  providerResponse: YouTubeLiveChatTargetLookupFetchResult
): YouTubeLiveChatTargetLookupFoundationResult {
  const providerReason = extractProviderReason(providerResponse.body);
  if (providerReason === "liveStreamingNotEnabled") {
    return {
      ...createBaseResult(request.credentialReferenceId),
      status: "blocked-live-streaming-not-enabled",
      ownerBinding: "verified-before-live-chat-target-lookup",
      liveChatTarget: "absent",
      liveChatTargetLookup: "lookup-completed-no-usable-target",
      providerAccess: "liveBroadcasts-list-target-lookup-only",
      reason: "provider reported live streaming is not enabled",
      providerErrorReason: "liveStreamingNotEnabled"
    };
  }

  return {
    ...createBaseResult(request.credentialReferenceId),
    status: "live-chat-target-lookup-failed-sanitized",
    ownerBinding: "verified-before-live-chat-target-lookup",
    liveChatTarget: "absent",
    liveChatTargetLookup: "failed-bounded-readonly-one-step",
    providerAccess: "liveBroadcasts-list-target-lookup-only",
    reason: "provider-fetch-failed",
    providerErrorReason: "not-returned-by-design",
    failureMetadata: createSanitizedFailureMetadata("http-error", providerResponse.status)
  };
}

function createSanitizedFailureMetadata(
  providerFailureClass: YouTubeLiveChatTargetLookupFailureMetadata["providerFailureClass"],
  httpStatus: number | null
): YouTubeLiveChatTargetLookupFailureMetadata {
  return {
    providerFailureClass,
    httpStatus,
    ok: false
  };
}

function createSanitizedTargetLookupResponseMetadata(
  providerResponse: YouTubeLiveChatTargetLookupFetchResult
): YouTubeLiveChatTargetLookupResponseMetadata {
  const body = asRecord(providerResponse.body);
  const items = Array.isArray(body.items) ? body.items : [];
  const firstItem = asRecord(items[0]);
  const firstSnippet = asRecord(firstItem.snippet);
  const firstStatus = asRecord(firstItem.status);
  const pageInfo = asRecord(body.pageInfo);
  const pageInfoTotalResults =
    typeof pageInfo.totalResults === "number" && Number.isFinite(pageInfo.totalResults)
      ? pageInfo.totalResults
      : null;

  return {
    httpStatus: providerResponse.status,
    ok: providerResponse.ok,
    activeOwnedBroadcast: "present",
    liveChatTarget: "present",
    returnedItemCount: items.length,
    pageInfoTotalResults,
    broadcastLifecycleStatus: typeof firstStatus.lifeCycleStatus === "string" ? "present" : "absent",
    privacyStatus: typeof firstStatus.privacyStatus === "string" ? "present" : "absent",
    targetIdValue: "not-returned-by-design"
  };
}

function extractProviderReason(body: unknown): string {
  const root = asRecord(body);
  const error = asRecord(root.error);
  const errors = Array.isArray(error.errors) ? error.errors : [];
  const firstError = asRecord(errors[0]);
  return typeof firstError.reason === "string" ? firstError.reason : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

async function fetchYouTubeLiveBroadcastsListTargetLookup(
  request: YouTubeLiveChatTargetLookupFetchRequest
): Promise<YouTubeLiveChatTargetLookupFetchResult> {
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
