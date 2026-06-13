import "server-only";

import {
  createYouTubeChannelsListMineLiveCallRequest,
  createYouTubeGoogleApiLiveCallCommandRuntimeWiring,
  type YouTubeGoogleApiLiveCallCommandRuntimeWiring,
  type YouTubeGoogleApiLiveCallFetch,
  type YouTubeGoogleApiLiveCallResponseMetadata
} from "./comment-translator-youtube-google-api-live-call-foundation";
import {
  type YouTubeLiveTokenResolutionOwnerAuthorization,
  type YouTubeLiveTokenResolutionTrustedStatus,
  type YouTubeLiveTokenResolutionTrustedStatusReader,
  type YouTubeRuntimeReadOnlyOAuthScope,
  type YouTubeServerOnlyLiveTokenMaterialResolver
} from "./comment-translator-youtube-runtime-foundation";

export type YouTubeOwnerVerificationSmokeCommandFoundationContract = {
  implementationStage: "owner-verification-smoke-command-foundation";
  commandPath: "scripts/comment-translator-youtube-owner-verification-smoke-command.mjs";
  endpoint: "channels.list-mine";
  providerUrl: "https://www.googleapis.com/youtube/v3/channels";
  httpMethod: "GET";
  query: {
    part: "id,status";
    mine: "true";
    fields: "items(id,status),pageInfo(totalResults,resultsPerPage)";
  };
  outputPolicy: "sanitized-metadata-only";
  ownerBindingCheck: "trusted-status-provider-channel-match-before-provider-access";
  authorizationHandling: "server-only-header-consumed-never-returned";
  tokenValue: "never-returned-by-design";
  refreshTokenValue: "never-returned-by-design";
  requiredApproval: "same-thread-explicit-in-thread-approval";
  safeLiveYouTubeOAuthSmoke: "not-run";
  liveChatPollingSmoke: "not-run";
  quotaWrite: "not-implemented";
  browserStorage: "unchanged";
};

export type YouTubeOwnerVerificationSmokeFoundationRequest = {
  credentialReferenceId: string;
  expectedProviderChannelReference: string;
  ownerAuthorization: YouTubeLiveTokenResolutionOwnerAuthorization;
  credentialResolutionDisabled: boolean;
  requiredScope: YouTubeRuntimeReadOnlyOAuthScope;
  nowIso: string;
  trustedStatusReader: YouTubeLiveTokenResolutionTrustedStatusReader | null;
  tokenMaterialResolver: YouTubeServerOnlyLiveTokenMaterialResolver;
  fetchGoogleApi: YouTubeGoogleApiLiveCallFetch;
};

export type YouTubeOwnerBindingBeforeProviderAccessRequest = Omit<
  YouTubeOwnerVerificationSmokeFoundationRequest,
  "tokenMaterialResolver" | "fetchGoogleApi"
>;

type YouTubeOwnerVerificationSmokeBase = {
  command: "sanitized-youtube-owner-verification-smoke";
  outputPolicy: "sanitized-metadata-only";
  credentialReferenceId: string;
  provider: "youtube";
  endpoint: "channels.list-mine";
  providerUrl: "https://www.googleapis.com/youtube/v3/channels";
  httpMethod: "GET";
  query: YouTubeOwnerVerificationSmokeCommandFoundationContract["query"];
  tokenValue: "never-returned-by-design";
  refreshTokenValue: "never-returned-by-design";
  safeLiveYouTubeOAuthSmoke: "not-run";
  liveChatPollingSmoke: "not-run";
  remoteMigrationApply: "not-run";
};

export type YouTubeOwnerBindingBeforeProviderAccessResult =
  | (YouTubeOwnerVerificationSmokeBase & {
      status: "owner-binding-verified-before-provider-access";
      ownerBinding: "verified-before-provider-access";
      ownerVerificationSmoke: "not-run-owner-binding-only";
      providerAccess: "not-run-owner-binding-only";
      expectedProviderChannelReference: "present";
    })
  | (YouTubeOwnerVerificationSmokeBase & {
      status:
        | "credential-resolution-disabled"
        | "blocked-owner-authorization"
        | "unavailable"
        | "expired"
        | "scope-missing"
        | "owner-verification-mismatch-aborted";
      ownerBinding: "not-checked" | "mismatch";
      ownerVerificationSmoke: "not-run" | "aborted-before-provider-access";
      providerAccess: "not-run";
      reason: string;
      expectedProviderChannelReference: "present";
    });

export type YouTubeOwnerVerificationSmokeFoundationResult =
  | (YouTubeOwnerVerificationSmokeBase & {
      status: "owner-verification-smoke-sanitized-result";
      ownerBinding: "verified-before-provider-access";
      ownerVerificationSmoke: "executed-bounded-readonly";
      providerAccess: "channels-list-mine-owner-verification-only";
      authorizationHandling: "server-only-header-consumed-never-returned";
      serverFetchBinding: "resolved-for-server-fetch";
      responseMetadata: YouTubeOwnerVerificationSmokeResponseMetadata;
    })
  | (YouTubeOwnerVerificationSmokeBase & {
      status: "owner-verification-provider-mismatch-sanitized";
      ownerBinding: "provider-return-mismatch";
      ownerVerificationSmoke: "executed-bounded-readonly";
      providerAccess: "channels-list-mine-owner-verification-only";
      authorizationHandling: "server-only-header-consumed-never-returned";
      serverFetchBinding: "resolved-for-server-fetch";
      responseMetadata: YouTubeOwnerVerificationSmokeResponseMetadata;
      reason: "provider-channel-reference-mismatch";
    })
  | (YouTubeOwnerVerificationSmokeBase & {
      status:
        | "credential-resolution-disabled"
        | "blocked-owner-authorization"
        | "unavailable"
        | "expired"
        | "scope-missing"
        | "owner-verification-mismatch-aborted"
        | "owner-verification-smoke-failed-sanitized";
      ownerBinding: "not-checked" | "mismatch" | "verified-before-provider-access";
      ownerVerificationSmoke: "not-run" | "aborted-before-provider-access" | "failed-bounded-readonly";
      providerAccess: "not-run" | "channels-list-mine-owner-verification-only";
      reason: string;
      expectedProviderChannelReference: "present";
    });

export type YouTubeOwnerVerificationTokenMaterialAvailabilityGateResult =
  | (YouTubeOwnerVerificationSmokeBase & {
      status: "owner-verification-token-material-available";
      ownerBinding: "verified-before-provider-access";
      ownerVerificationSmoke: "not-run-token-material-availability-only";
      providerAccess: "not-run-token-material-availability-only";
      tokenMaterialAvailability: "available";
      expectedProviderChannelReference: "present";
    })
  | (YouTubeOwnerVerificationSmokeBase & {
      status:
        | "credential-resolution-disabled"
        | "blocked-owner-authorization"
        | "unavailable"
        | "expired"
        | "scope-missing"
        | "owner-verification-mismatch-aborted";
      ownerBinding: "not-checked" | "mismatch" | "verified-before-provider-access";
      ownerVerificationSmoke: "not-run" | "aborted-before-provider-access" | "not-run-token-material-availability-only";
      providerAccess: "not-run" | "not-run-token-material-availability-only";
      reason: string;
      expectedProviderChannelReference: "present";
    });

export type YouTubeOwnerVerificationSmokeCommandRuntimeWiringRequest = {
  credentialReferenceId: string;
  providerChannelId: string;
  requiredScope: YouTubeRuntimeReadOnlyOAuthScope;
  nowIso: string;
  operatorLocalServerAuthorizationHeader?: string | null;
  operatorLocalTokenExpiresAtIso?: string | null;
  tokenMaterialResolver?: YouTubeServerOnlyLiveTokenMaterialResolver;
  fetchGoogleApi?: YouTubeGoogleApiLiveCallFetch;
};

export type YouTubeOwnerVerificationSmokeCommandRuntimeWiring = Pick<
  YouTubeGoogleApiLiveCallCommandRuntimeWiring,
  "trustedStatusReader" | "tokenMaterialResolver" | "fetchGoogleApi" | "serverOnlyLiveTokenMaterialResolver"
>;

export type YouTubeOwnerVerificationSmokeResponseMetadata = Pick<
  YouTubeGoogleApiLiveCallResponseMetadata,
  "httpStatus" | "ok" | "channelReference" | "returnedItemCount" | "pageInfoTotalResults"
> & {
  expectedProviderChannelReference: "present";
  ownerChannelMatchesExpected: boolean;
};

const providerUrl = "https://www.googleapis.com/youtube/v3/channels" as const;
const query = {
  part: "id,status",
  mine: "true",
  fields: "items(id,status),pageInfo(totalResults,resultsPerPage)"
} as const;

export const youtubeOwnerVerificationSmokeCommandFoundationContract = {
  implementationStage: "owner-verification-smoke-command-foundation",
  commandPath: "scripts/comment-translator-youtube-owner-verification-smoke-command.mjs",
  endpoint: "channels.list-mine",
  providerUrl,
  httpMethod: "GET",
  query,
  outputPolicy: "sanitized-metadata-only",
  ownerBindingCheck: "trusted-status-provider-channel-match-before-provider-access",
  authorizationHandling: "server-only-header-consumed-never-returned",
  tokenValue: "never-returned-by-design",
  refreshTokenValue: "never-returned-by-design",
  requiredApproval: "same-thread-explicit-in-thread-approval",
  safeLiveYouTubeOAuthSmoke: "not-run",
  liveChatPollingSmoke: "not-run",
  quotaWrite: "not-implemented",
  browserStorage: "unchanged"
} as const satisfies YouTubeOwnerVerificationSmokeCommandFoundationContract;

export function createYouTubeOwnerVerificationSmokeCommandRuntimeWiring(
  request: YouTubeOwnerVerificationSmokeCommandRuntimeWiringRequest
): YouTubeOwnerVerificationSmokeCommandRuntimeWiring {
  return createYouTubeGoogleApiLiveCallCommandRuntimeWiring(request);
}

export async function assessYouTubeOwnerBindingBeforeProviderAccess(
  request: YouTubeOwnerBindingBeforeProviderAccessRequest
): Promise<YouTubeOwnerBindingBeforeProviderAccessResult> {
  if (request.credentialResolutionDisabled) {
    return unresolvedOwnerBinding(request, "credential-resolution-disabled", "not-checked", "credential resolution is disabled");
  }

  if (request.ownerAuthorization.status !== "authorized") {
    return unresolvedOwnerBinding(request, "blocked-owner-authorization", "not-checked", request.ownerAuthorization.reason);
  }

  if (!request.trustedStatusReader) {
    return unresolvedOwnerBinding(request, "unavailable", "not-checked", "trusted status reader is not wired");
  }

  let status: YouTubeLiveTokenResolutionTrustedStatus;
  try {
    status = await request.trustedStatusReader.getCredentialStatus({
      credentialReferenceId: request.credentialReferenceId,
      ownerUserId: request.ownerAuthorization.ownerUserId
    });
  } catch {
    return unresolvedOwnerBinding(request, "unavailable", "not-checked", "trusted status read failed");
  }

  if (status.revoked || status.expiryStatus === "revoked") {
    return unresolvedOwnerBinding(request, "unavailable", "not-checked", "credential reference is revoked");
  }

  if (status.expiryStatus === "expired" || Date.parse(status.expiresAtIso) <= Date.parse(request.nowIso)) {
    return unresolvedOwnerBinding(request, "expired", "not-checked", "credential reference is expired");
  }

  if (!status.scopeSet.includes(request.requiredScope)) {
    return unresolvedOwnerBinding(request, "scope-missing", "not-checked", "credential reference lacks required scope");
  }

  if (status.providerChannelId !== request.expectedProviderChannelReference) {
    return unresolvedOwnerBinding(
      request,
      "owner-verification-mismatch-aborted",
      "mismatch",
      "credential owner binding does not match expected provider channel reference"
    );
  }

  return {
    ...createBaseResult(request.credentialReferenceId),
    status: "owner-binding-verified-before-provider-access",
    ownerBinding: "verified-before-provider-access",
    ownerVerificationSmoke: "not-run-owner-binding-only",
    providerAccess: "not-run-owner-binding-only",
    expectedProviderChannelReference: "present"
  };
}

export async function runYouTubeOwnerVerificationSmokeFoundation(
  request: YouTubeOwnerVerificationSmokeFoundationRequest
): Promise<YouTubeOwnerVerificationSmokeFoundationResult> {
  const ownerBinding = await assessYouTubeOwnerBindingBeforeProviderAccess(request);

  if (ownerBinding.status !== "owner-binding-verified-before-provider-access") {
    return ownerBinding;
  }

  if (request.ownerAuthorization.status !== "authorized") {
    return unresolvedOwnerVerification(request, "blocked-owner-authorization", "not-checked", "not-run", "not-run", "owner authorization is not confirmed");
  }

  const tokenMaterial = await request.tokenMaterialResolver.resolveServerOnlyTokenMaterial({
    credentialReferenceId: request.credentialReferenceId,
    ownerUserId: request.ownerAuthorization.ownerUserId,
    requiredScope: request.requiredScope
  });

  if (tokenMaterial.status !== "available") {
    return unresolvedOwnerVerification(
      request,
      tokenMaterial.status,
      "verified-before-provider-access",
      "not-run",
      "not-run",
      tokenMaterial.reason
    );
  }

  try {
    const providerResponse = await request.fetchGoogleApi(
      createYouTubeChannelsListMineLiveCallRequest({
        serverAuthorizationHeader: tokenMaterial.serverAuthorizationHeader
      })
    );
    const responseMetadata = createOwnerVerificationResponseMetadata(
      providerResponse,
      request.expectedProviderChannelReference
    );

    if (!responseMetadata.ownerChannelMatchesExpected) {
      return {
        ...createBaseResult(request.credentialReferenceId),
        status: "owner-verification-provider-mismatch-sanitized",
        ownerBinding: "provider-return-mismatch",
        ownerVerificationSmoke: "executed-bounded-readonly",
        providerAccess: "channels-list-mine-owner-verification-only",
        authorizationHandling: "server-only-header-consumed-never-returned",
        serverFetchBinding: "resolved-for-server-fetch",
        responseMetadata,
        reason: "provider-channel-reference-mismatch"
      };
    }

    return {
      ...createBaseResult(request.credentialReferenceId),
      status: "owner-verification-smoke-sanitized-result",
      ownerBinding: "verified-before-provider-access",
      ownerVerificationSmoke: "executed-bounded-readonly",
      providerAccess: "channels-list-mine-owner-verification-only",
      authorizationHandling: "server-only-header-consumed-never-returned",
      serverFetchBinding: "resolved-for-server-fetch",
      responseMetadata
    };
  } catch {
    return unresolvedOwnerVerification(
      request,
      "owner-verification-smoke-failed-sanitized",
      "verified-before-provider-access",
      "failed-bounded-readonly",
      "channels-list-mine-owner-verification-only",
      "provider-fetch-failed"
    );
  }
}

export async function assessYouTubeOwnerVerificationTokenMaterialAvailabilityGate(
  request: Omit<YouTubeOwnerVerificationSmokeFoundationRequest, "fetchGoogleApi">
): Promise<YouTubeOwnerVerificationTokenMaterialAvailabilityGateResult> {
  const ownerBinding = await assessYouTubeOwnerBindingBeforeProviderAccess(request);

  if (ownerBinding.status !== "owner-binding-verified-before-provider-access") {
    return ownerBinding;
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
      "verified-before-provider-access",
      "not-run-token-material-availability-only",
      "not-run-token-material-availability-only",
      tokenMaterial.reason
    );
  }

  return {
    ...createBaseResult(request.credentialReferenceId),
    status: "owner-verification-token-material-available",
    ownerBinding: "verified-before-provider-access",
    ownerVerificationSmoke: "not-run-token-material-availability-only",
    providerAccess: "not-run-token-material-availability-only",
    tokenMaterialAvailability: "available",
    expectedProviderChannelReference: "present"
  };
}

function createBaseResult(credentialReferenceId: string): YouTubeOwnerVerificationSmokeBase {
  return {
    command: "sanitized-youtube-owner-verification-smoke",
    outputPolicy: "sanitized-metadata-only",
    credentialReferenceId,
    provider: "youtube",
    endpoint: youtubeOwnerVerificationSmokeCommandFoundationContract.endpoint,
    providerUrl,
    httpMethod: "GET",
    query,
    tokenValue: "never-returned-by-design",
    refreshTokenValue: "never-returned-by-design",
    safeLiveYouTubeOAuthSmoke: "not-run",
    liveChatPollingSmoke: "not-run",
    remoteMigrationApply: "not-run"
  };
}

function unresolvedOwnerBinding(
  request: YouTubeOwnerBindingBeforeProviderAccessRequest,
  status: Exclude<YouTubeOwnerBindingBeforeProviderAccessResult["status"], "owner-binding-verified-before-provider-access">,
  ownerBinding: "not-checked" | "mismatch",
  reason: string
): YouTubeOwnerBindingBeforeProviderAccessResult {
  return {
    ...createBaseResult(request.credentialReferenceId),
    status,
    ownerBinding,
    ownerVerificationSmoke:
      status === "owner-verification-mismatch-aborted" ? "aborted-before-provider-access" : "not-run",
    providerAccess: "not-run",
    reason,
    expectedProviderChannelReference: "present"
  };
}

function unresolvedOwnerVerification(
  request: YouTubeOwnerVerificationSmokeFoundationRequest,
  status: Extract<
    YouTubeOwnerVerificationSmokeFoundationResult["status"],
    | "credential-resolution-disabled"
    | "blocked-owner-authorization"
    | "unavailable"
    | "expired"
    | "scope-missing"
    | "owner-verification-mismatch-aborted"
    | "owner-verification-smoke-failed-sanitized"
  >,
  ownerBinding: "not-checked" | "mismatch" | "verified-before-provider-access",
  ownerVerificationSmoke: "not-run" | "aborted-before-provider-access" | "failed-bounded-readonly",
  providerAccess: "not-run" | "channels-list-mine-owner-verification-only",
  reason: string
): YouTubeOwnerVerificationSmokeFoundationResult {
  return {
    ...createBaseResult(request.credentialReferenceId),
    status,
    ownerBinding,
    ownerVerificationSmoke,
    providerAccess,
    reason,
    expectedProviderChannelReference: "present"
  };
}

function unresolvedTokenAvailability(
  request: Omit<YouTubeOwnerVerificationSmokeFoundationRequest, "fetchGoogleApi">,
  status: Extract<
    YouTubeOwnerVerificationTokenMaterialAvailabilityGateResult["status"],
    | "credential-resolution-disabled"
    | "blocked-owner-authorization"
    | "unavailable"
    | "expired"
    | "scope-missing"
    | "owner-verification-mismatch-aborted"
  >,
  ownerBinding: "not-checked" | "mismatch" | "verified-before-provider-access",
  ownerVerificationSmoke: "not-run" | "aborted-before-provider-access" | "not-run-token-material-availability-only",
  providerAccess: "not-run" | "not-run-token-material-availability-only",
  reason: string
): YouTubeOwnerVerificationTokenMaterialAvailabilityGateResult {
  return {
    ...createBaseResult(request.credentialReferenceId),
    status,
    ownerBinding,
    ownerVerificationSmoke,
    providerAccess,
    reason,
    expectedProviderChannelReference: "present"
  };
}

function createOwnerVerificationResponseMetadata(
  providerResponse: Awaited<ReturnType<YouTubeGoogleApiLiveCallFetch>>,
  expectedProviderChannelReference: string
): YouTubeOwnerVerificationSmokeResponseMetadata {
  const body = asRecord(providerResponse.body);
  const items = Array.isArray(body.items) ? body.items : [];
  const firstItem = asRecord(items[0]);
  const pageInfo = asRecord(body.pageInfo);
  const pageInfoTotalResults =
    typeof pageInfo.totalResults === "number" && Number.isFinite(pageInfo.totalResults)
      ? pageInfo.totalResults
      : null;
  const returnedChannelReference = typeof firstItem.id === "string" ? firstItem.id : "";

  return {
    httpStatus: providerResponse.status,
    ok: providerResponse.ok,
    channelReference: returnedChannelReference.length > 0 ? "present" : "absent",
    expectedProviderChannelReference: "present",
    ownerChannelMatchesExpected: returnedChannelReference === expectedProviderChannelReference,
    returnedItemCount: items.length,
    pageInfoTotalResults
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
