import "server-only";

import {
  resolveYouTubeLiveTokenForServerFetch,
  type YouTubeLiveTokenResolutionOwnerAuthorization,
  type YouTubeLiveTokenResolutionTrustedStatusReader,
  type YouTubeRuntimeReadOnlyOAuthScope,
  type YouTubeServerOnlyLiveTokenMaterialResolver
} from "./comment-translator-youtube-runtime-foundation";

export type YouTubeGoogleApiLiveCallCommandFoundationContract = {
  implementationStage: "actual-google-api-live-call-command-foundation";
  commandPath: "scripts/comment-translator-youtube-google-api-live-call-command.mjs";
  currentTokenResolutionOnlyCommandPath: "scripts/comment-translator-youtube-live-runtime-smoke-command.mjs";
  endpoint: "channels.list-mine";
  providerUrl: "https://www.googleapis.com/youtube/v3/channels";
  httpMethod: "GET";
  query: {
    part: "id,status";
    mine: "true";
    fields: "items(id,status),pageInfo(totalResults,resultsPerPage)";
  };
  outputPolicy: "sanitized-metadata-only";
  authorizationHandling: "server-only-header-consumed-never-returned";
  tokenValue: "never-returned-by-design";
  refreshTokenValue: "never-returned-by-design";
  requiredApproval: "same-thread-explicit-in-thread-approval";
  liveChatPollingSmoke: "not-run";
  ownerVerificationSmoke: "not-run";
  quotaWrite: "not-implemented";
  browserStorage: "unchanged";
};

export type YouTubeChannelsListMineLiveCallRequest = {
  endpoint: "channels.list-mine";
  method: "GET";
  providerUrl: "https://www.googleapis.com/youtube/v3/channels";
  url: string;
  query: YouTubeGoogleApiLiveCallCommandFoundationContract["query"];
  headers: {
    Authorization: string;
  };
};

export type YouTubeGoogleApiLiveCallFetchResult = {
  ok: boolean;
  status: number;
  body: unknown;
};

export type YouTubeGoogleApiLiveCallFetch = (
  request: YouTubeChannelsListMineLiveCallRequest
) => Promise<YouTubeGoogleApiLiveCallFetchResult>;

export type YouTubeGoogleApiLiveCallResponseMetadata = {
  httpStatus: number;
  ok: boolean;
  channelReference: "present" | "absent";
  returnedItemCount: number;
  pageInfoTotalResults: number | null;
  longUploadsStatus: "present" | "absent";
  madeForKids: "present" | "absent";
};

export type YouTubeGoogleApiLiveCallFoundationRequest = {
  credentialReferenceId: string;
  ownerAuthorization: YouTubeLiveTokenResolutionOwnerAuthorization;
  credentialResolutionDisabled: boolean;
  requiredScope: YouTubeRuntimeReadOnlyOAuthScope;
  nowIso: string;
  trustedStatusReader: YouTubeLiveTokenResolutionTrustedStatusReader | null;
  tokenMaterialResolver: YouTubeServerOnlyLiveTokenMaterialResolver;
  fetchGoogleApi: YouTubeGoogleApiLiveCallFetch;
};

export type YouTubeGoogleApiLiveCallCommandRuntimeWiringRequest = {
  credentialReferenceId: string;
  providerChannelId: string;
  requiredScope: YouTubeRuntimeReadOnlyOAuthScope;
  nowIso: string;
  tokenMaterialResolver?: YouTubeServerOnlyLiveTokenMaterialResolver;
  fetchGoogleApi?: YouTubeGoogleApiLiveCallFetch;
};

export type YouTubeGoogleApiLiveCallCommandRuntimeWiring = {
  trustedStatusReader: YouTubeLiveTokenResolutionTrustedStatusReader;
  tokenMaterialResolver: YouTubeServerOnlyLiveTokenMaterialResolver;
  fetchGoogleApi: YouTubeGoogleApiLiveCallFetch;
  expiresAtIso: string;
  serverOnlyLiveTokenMaterialResolver: "connected-sanitized-unavailable-runtime-adapter";
};

export type YouTubeGoogleApiLiveTokenMaterialAvailabilityGateRequest = Omit<
  YouTubeGoogleApiLiveCallFoundationRequest,
  "fetchGoogleApi"
>;

export type YouTubeGoogleApiLiveTokenMaterialAvailabilityGateResult =
  | {
      status: "token-material-available";
      command: "sanitized-youtube-google-api-live-call";
      outputPolicy: "sanitized-metadata-only";
      credentialReferenceId: string;
      provider: "youtube";
      endpoint: "channels.list-mine";
      providerUrl: "https://www.googleapis.com/youtube/v3/channels";
      httpMethod: "GET";
      query: YouTubeGoogleApiLiveCallCommandFoundationContract["query"];
      googleApiLiveCall: "not-run-token-material-availability-only";
      authorizationHandling: "server-only-header-consumed-never-returned";
      serverFetchBinding: "resolved-for-server-fetch";
      approvedExecutionReadiness: "ready-for-approved-google-api-live-call";
      tokenValue: "never-returned-by-design";
      refreshTokenValue: "never-returned-by-design";
      safeLiveYouTubeOAuthSmoke: "not-run";
      ownerVerificationSmoke: "not-run";
      liveChatPollingSmoke: "not-run";
      remoteMigrationApply: "not-run";
    }
  | {
      status:
        | "unavailable"
        | "scope-missing"
        | "expired"
        | "credential-resolution-disabled"
        | "blocked-owner-authorization";
      command: "sanitized-youtube-google-api-live-call";
      outputPolicy: "sanitized-metadata-only";
      credentialReferenceId: string;
      provider: "youtube";
      endpoint: "channels.list-mine";
      providerUrl: "https://www.googleapis.com/youtube/v3/channels";
      httpMethod: "GET";
      query: YouTubeGoogleApiLiveCallCommandFoundationContract["query"];
      googleApiLiveCall: "not-run-token-material-availability-only";
      reason: string;
      approvedExecutionReadiness: "blocked-until-token-material-resolver-returns-available";
      tokenValue: "never-returned-by-design";
      refreshTokenValue: "never-returned-by-design";
      safeLiveYouTubeOAuthSmoke: "not-run";
      ownerVerificationSmoke: "not-run";
      liveChatPollingSmoke: "not-run";
      remoteMigrationApply: "not-run";
    };

export type YouTubeGoogleApiLiveCallFoundationResult =
  | {
      status: "google-api-live-call-sanitized-result";
      command: "sanitized-youtube-google-api-live-call";
      outputPolicy: "sanitized-metadata-only";
      credentialReferenceId: string;
      provider: "youtube";
      endpoint: "channels.list-mine";
      providerUrl: "https://www.googleapis.com/youtube/v3/channels";
      httpMethod: "GET";
      query: YouTubeGoogleApiLiveCallCommandFoundationContract["query"];
      googleApiLiveCall: "executed-bounded-readonly";
      authorizationHandling: "server-only-header-consumed-never-returned";
      serverFetchBinding: "resolved-for-server-fetch";
      responseMetadata: YouTubeGoogleApiLiveCallResponseMetadata;
      tokenValue: "never-returned-by-design";
      refreshTokenValue: "never-returned-by-design";
      safeLiveYouTubeOAuthSmoke: "not-run";
      ownerVerificationSmoke: "not-run";
      liveChatPollingSmoke: "not-run";
      remoteMigrationApply: "not-run";
    }
  | {
      status:
        | "unavailable"
        | "scope-missing"
        | "expired"
        | "credential-resolution-disabled"
        | "blocked-owner-authorization";
      command: "sanitized-youtube-google-api-live-call";
      outputPolicy: "sanitized-metadata-only";
      credentialReferenceId: string;
      provider: "youtube";
      endpoint: "channels.list-mine";
      providerUrl: "https://www.googleapis.com/youtube/v3/channels";
      httpMethod: "GET";
      query: YouTubeGoogleApiLiveCallCommandFoundationContract["query"];
      googleApiLiveCall: "not-run";
      reason: string;
      tokenValue: "never-returned-by-design";
      refreshTokenValue: "never-returned-by-design";
      safeLiveYouTubeOAuthSmoke: "not-run";
      ownerVerificationSmoke: "not-run";
      liveChatPollingSmoke: "not-run";
      remoteMigrationApply: "not-run";
    }
  | {
      status: "google-api-live-call-failed-sanitized";
      command: "sanitized-youtube-google-api-live-call";
      outputPolicy: "sanitized-metadata-only";
      credentialReferenceId: string;
      provider: "youtube";
      endpoint: "channels.list-mine";
      providerUrl: "https://www.googleapis.com/youtube/v3/channels";
      httpMethod: "GET";
      query: YouTubeGoogleApiLiveCallCommandFoundationContract["query"];
      googleApiLiveCall: "failed-bounded-readonly";
      authorizationHandling: "server-only-header-consumed-never-returned";
      reason: "provider-fetch-failed";
      tokenValue: "never-returned-by-design";
      refreshTokenValue: "never-returned-by-design";
      safeLiveYouTubeOAuthSmoke: "not-run";
      ownerVerificationSmoke: "not-run";
      liveChatPollingSmoke: "not-run";
      remoteMigrationApply: "not-run";
    };

const providerUrl = "https://www.googleapis.com/youtube/v3/channels" as const;
const query = {
  part: "id,status",
  mine: "true",
  fields: "items(id,status),pageInfo(totalResults,resultsPerPage)"
} as const;

export const youtubeGoogleApiLiveCallCommandFoundationContract = {
  implementationStage: "actual-google-api-live-call-command-foundation",
  commandPath: "scripts/comment-translator-youtube-google-api-live-call-command.mjs",
  currentTokenResolutionOnlyCommandPath: "scripts/comment-translator-youtube-live-runtime-smoke-command.mjs",
  endpoint: "channels.list-mine",
  providerUrl,
  httpMethod: "GET",
  query,
  outputPolicy: "sanitized-metadata-only",
  authorizationHandling: "server-only-header-consumed-never-returned",
  tokenValue: "never-returned-by-design",
  refreshTokenValue: "never-returned-by-design",
  requiredApproval: "same-thread-explicit-in-thread-approval",
  liveChatPollingSmoke: "not-run",
  ownerVerificationSmoke: "not-run",
  quotaWrite: "not-implemented",
  browserStorage: "unchanged"
} as const satisfies YouTubeGoogleApiLiveCallCommandFoundationContract;

export function createYouTubeChannelsListMineLiveCallRequest({
  serverAuthorizationHeader
}: {
  serverAuthorizationHeader: string;
}): YouTubeChannelsListMineLiveCallRequest {
  const params = new URLSearchParams(query);

  return {
    endpoint: "channels.list-mine",
    method: "GET",
    providerUrl,
    url: `${providerUrl}?${params.toString()}`,
    query,
    headers: {
      Authorization: serverAuthorizationHeader
    }
  };
}

export function createYouTubeGoogleApiLiveCallCommandRuntimeWiring(
  request: YouTubeGoogleApiLiveCallCommandRuntimeWiringRequest
): YouTubeGoogleApiLiveCallCommandRuntimeWiring {
  const expiresAtIso = new Date(Date.parse(request.nowIso) + 5 * 60 * 1000).toISOString();

  return {
    trustedStatusReader: {
      async getCredentialStatus() {
        return {
          credentialReferenceId: request.credentialReferenceId,
          provider: "youtube",
          providerChannelId: request.providerChannelId,
          scopeLabel: "youtube.readonly",
          scopeSet: [request.requiredScope],
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
    tokenMaterialResolver:
      request.tokenMaterialResolver ?? createSanitizedUnavailableYouTubeGoogleApiLiveTokenMaterialResolver(),
    fetchGoogleApi: request.fetchGoogleApi ?? fetchYouTubeGoogleApi,
    expiresAtIso,
    serverOnlyLiveTokenMaterialResolver: "connected-sanitized-unavailable-runtime-adapter"
  };
}

export async function runYouTubeGoogleApiLiveCallFoundation(
  request: YouTubeGoogleApiLiveCallFoundationRequest
): Promise<YouTubeGoogleApiLiveCallFoundationResult> {
  let providerResponse: YouTubeGoogleApiLiveCallFetchResult | null = null;

  try {
    const tokenResolution = await resolveYouTubeLiveTokenForServerFetch({
      credentialReferenceId: request.credentialReferenceId,
      ownerAuthorization: request.ownerAuthorization,
      credentialResolutionDisabled: request.credentialResolutionDisabled,
      requiredScope: request.requiredScope,
      nowIso: request.nowIso,
      trustedStatusReader: request.trustedStatusReader,
      tokenMaterialResolver: request.tokenMaterialResolver,
      async consumeServerFetchAuthorization(binding) {
        providerResponse = await request.fetchGoogleApi(
          createYouTubeChannelsListMineLiveCallRequest({
            serverAuthorizationHeader: binding.serverAuthorizationHeader
          })
        );

        return {
          serverFetchBinding: "resolved-for-server-fetch"
        };
      }
    });

    if (tokenResolution.status !== "resolved-for-server-fetch") {
      return {
        ...createBaseResult(request.credentialReferenceId),
        status: tokenResolution.status,
        googleApiLiveCall: "not-run",
        reason: tokenResolution.reason
      };
    }

    if (!providerResponse) {
      return {
        ...createBaseResult(request.credentialReferenceId),
        status: "google-api-live-call-failed-sanitized",
        googleApiLiveCall: "failed-bounded-readonly",
        authorizationHandling: "server-only-header-consumed-never-returned",
        reason: "provider-fetch-failed"
      };
    }

    return {
      ...createBaseResult(request.credentialReferenceId),
      status: "google-api-live-call-sanitized-result",
      googleApiLiveCall: "executed-bounded-readonly",
      authorizationHandling: "server-only-header-consumed-never-returned",
      serverFetchBinding: tokenResolution.serverFetchBinding,
      responseMetadata: createSanitizedResponseMetadata(providerResponse)
    };
  } catch {
    return {
      ...createBaseResult(request.credentialReferenceId),
      status: "google-api-live-call-failed-sanitized",
      googleApiLiveCall: "failed-bounded-readonly",
      authorizationHandling: "server-only-header-consumed-never-returned",
      reason: "provider-fetch-failed"
    };
  }
}

export async function assessYouTubeGoogleApiLiveTokenMaterialAvailabilityGate(
  request: YouTubeGoogleApiLiveTokenMaterialAvailabilityGateRequest
): Promise<YouTubeGoogleApiLiveTokenMaterialAvailabilityGateResult> {
  const tokenResolution = await resolveYouTubeLiveTokenForServerFetch({
    credentialReferenceId: request.credentialReferenceId,
    ownerAuthorization: request.ownerAuthorization,
    credentialResolutionDisabled: request.credentialResolutionDisabled,
    requiredScope: request.requiredScope,
    nowIso: request.nowIso,
    trustedStatusReader: request.trustedStatusReader,
    tokenMaterialResolver: request.tokenMaterialResolver,
    async consumeServerFetchAuthorization() {
      return {
        serverFetchBinding: "resolved-for-server-fetch"
      };
    }
  });

  if (tokenResolution.status !== "resolved-for-server-fetch") {
    return {
      ...createBaseResult(request.credentialReferenceId),
      status: tokenResolution.status,
      googleApiLiveCall: "not-run-token-material-availability-only",
      reason: tokenResolution.reason,
      approvedExecutionReadiness: "blocked-until-token-material-resolver-returns-available"
    };
  }

  return {
    ...createBaseResult(request.credentialReferenceId),
    status: "token-material-available",
    googleApiLiveCall: "not-run-token-material-availability-only",
    authorizationHandling: "server-only-header-consumed-never-returned",
    serverFetchBinding: tokenResolution.serverFetchBinding,
    approvedExecutionReadiness: "ready-for-approved-google-api-live-call"
  };
}

function createBaseResult(credentialReferenceId: string) {
  return {
    command: "sanitized-youtube-google-api-live-call",
    outputPolicy: "sanitized-metadata-only",
    credentialReferenceId,
    provider: "youtube",
    endpoint: youtubeGoogleApiLiveCallCommandFoundationContract.endpoint,
    providerUrl,
    httpMethod: "GET",
    query,
    tokenValue: "never-returned-by-design",
    refreshTokenValue: "never-returned-by-design",
    safeLiveYouTubeOAuthSmoke: "not-run",
    ownerVerificationSmoke: "not-run",
    liveChatPollingSmoke: "not-run",
    remoteMigrationApply: "not-run"
  } as const;
}

function createSanitizedResponseMetadata(
  providerResponse: YouTubeGoogleApiLiveCallFetchResult
): YouTubeGoogleApiLiveCallResponseMetadata {
  const body = asRecord(providerResponse.body);
  const items = Array.isArray(body.items) ? body.items : [];
  const firstItem = asRecord(items[0]);
  const firstStatus = asRecord(firstItem.status);
  const pageInfo = asRecord(body.pageInfo);
  const pageInfoTotalResults =
    typeof pageInfo.totalResults === "number" && Number.isFinite(pageInfo.totalResults)
      ? pageInfo.totalResults
      : null;

  return {
    httpStatus: providerResponse.status,
    ok: providerResponse.ok,
    channelReference: typeof firstItem.id === "string" && firstItem.id.length > 0 ? "present" : "absent",
    returnedItemCount: items.length,
    pageInfoTotalResults,
    longUploadsStatus: typeof firstStatus.longUploadsStatus === "string" ? "present" : "absent",
    madeForKids: typeof firstStatus.madeForKids === "boolean" ? "present" : "absent"
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function createSanitizedUnavailableYouTubeGoogleApiLiveTokenMaterialResolver(): YouTubeServerOnlyLiveTokenMaterialResolver {
  return {
    async resolveServerOnlyTokenMaterial() {
      return {
        status: "unavailable",
        reason: "server-only live token material resolver is wired but token material retrieval is not implemented in this command runtime"
      };
    }
  };
}

async function fetchYouTubeGoogleApi(
  request: YouTubeChannelsListMineLiveCallRequest
): Promise<YouTubeGoogleApiLiveCallFetchResult> {
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
