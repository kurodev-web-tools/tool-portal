import "server-only";

import {
  advanceYouTubeLiveChatPollingState,
  createInitialYouTubeLiveChatPollingState,
  type YouTubeLiveChatPollingRuntimeState,
  type YouTubeLiveChatPollingStepInput,
  type YouTubeLiveChatPollingStepResult,
  type YouTubeLiveChatRuntimeAdapter,
  type YouTubeOwnedBroadcast,
  type YouTubeOwnedBroadcastLookupResult,
  type YouTubeOwnerVerificationRuntimeResult
} from "./comment-translator-youtube-runtime-foundation";

export { createInitialYouTubeLiveChatPollingState };

export type YouTubeReadOnlyOAuthScope = "https://www.googleapis.com/auth/youtube.readonly";

export type YouTubeEncryptedTokenStoreDesignPolicy = {
  implementationStage: "design-policy-only";
  storageOwner: "future-server-encrypted-token-store";
  accessTokenPersistence: "encrypted-server-only";
  refreshTokenPersistence: "encrypted-server-only";
  keyManagement: "future-managed-secret-or-kms";
  clientComponent: "forbidden";
  fixtures: "forbidden";
  taskDocsAndPullRequests: "no-token-values";
  localStorage: "forbidden";
  indexedDB: "forbidden";
  schemaMutation: "forbidden-in-this-slice";
  refreshImplementation: "not-implemented";
  revocationImplementation: "not-implemented";
};

export type YouTubeTokenReferenceResolverContract = {
  implementationStage: "server-only-reference-design";
  input: "credentialReferenceId";
  requiredScope: YouTubeReadOnlyOAuthScope;
  tokenValue: "never-returned-by-design";
  refreshTokenValue: "never-returned-by-design";
  authorizationBinding: "server-fetch-only";
  encryptedStore: YouTubeEncryptedTokenStoreDesignPolicy;
  clientStorage: "forbidden";
  providerCoupling: "forbidden-direct-import-or-call";
};

export type YouTubeOAuthCredentialReference = {
  credentialReferenceId: string;
  ownerChannelReference: string | null;
  scopes: readonly YouTubeReadOnlyOAuthScope[];
  status: "available" | "missing" | "scope-missing" | "expired" | "unavailable";
  expiresAtMs: number | null;
};

export type YouTubeTokenReferenceResolutionRequest = {
  credentialReferenceId: string;
  requiredScope: YouTubeReadOnlyOAuthScope;
  nowMs: number;
};

export type YouTubeResolvedTokenReference = {
  status: "resolved";
  credentialReferenceId: string;
  requiredScope: YouTubeReadOnlyOAuthScope;
  ownerChannelReference: string | null;
  authorizationBinding: "server-fetch-only";
  tokenValue: "never-returned-by-design";
  refreshTokenValue: "never-returned-by-design";
  expiresAtMs: number | null;
  encryptedStore: YouTubeEncryptedTokenStoreDesignPolicy;
};

export type YouTubeUnresolvedTokenReference = {
  status: "missing" | "scope-missing" | "expired" | "unavailable";
  credentialReferenceId: string;
  requiredScope: YouTubeReadOnlyOAuthScope;
  reason: string;
  tokenValue: "never-returned-by-design";
  refreshTokenValue: "never-returned-by-design";
  encryptedStore: YouTubeEncryptedTokenStoreDesignPolicy;
};

export type YouTubeTokenReferenceResolutionResult =
  | YouTubeResolvedTokenReference
  | YouTubeUnresolvedTokenReference;

export type YouTubeTokenReferenceResolver = {
  resolveTokenReference(
    request: YouTubeTokenReferenceResolutionRequest
  ): Promise<YouTubeTokenReferenceResolutionResult>;
};

export type YouTubeGoogleApiAdapterContract = {
  implementationStage: "server-only-adapter-design";
  platform: "youtube";
  liveApiCall: "not-implemented";
  fakeFetch: "deterministic-contract-only";
  tokenResolution: "token-reference-only";
  ownerVerification: "channels.list-mine";
  ownedBroadcastLookup: "liveBroadcasts.list-mine-true";
  liveChatPollingStep: "liveChatMessages.list-fake-fetch";
  sanitizedCommentBridge: "runtime-foundation";
  providerCoupling: "forbidden-direct-import-or-call";
  clientComponent: "forbidden";
  quotaWrite: "not-implemented";
};

export type YouTubeGoogleApiEndpoint =
  | "channels.list-mine"
  | "liveBroadcasts.list-mine"
  | "liveChatMessages.list";

export type YouTubeGoogleApiFakeFetchRequest = {
  endpoint: YouTubeGoogleApiEndpoint;
  method: "GET";
  credentialReferenceId: string;
  token: YouTubeResolvedTokenReference;
  query: Readonly<Record<string, string>>;
  providerRequest: "forbidden";
  liveApiCall: "not-implemented";
};

export type YouTubeGoogleApiFakeFetchResponse =
  | {
      endpoint: "channels.list-mine";
      ownerChannelReference: string | null;
      liveStreamingEnabled: boolean;
      reason?: string;
    }
  | {
      endpoint: "liveBroadcasts.list-mine";
      broadcasts: readonly YouTubeOwnedBroadcast[];
    }
  | {
      endpoint: "liveChatMessages.list";
      step: YouTubeLiveChatPollingStepInput;
    };

export type YouTubeGoogleApiFakeFetch = (
  request: YouTubeGoogleApiFakeFetchRequest
) => Promise<YouTubeGoogleApiFakeFetchResponse>;

export type YouTubeGoogleApiAdapter = YouTubeLiveChatRuntimeAdapter & {
  readonly contract: typeof youtubeGoogleApiAdapterContract;
};

export type YouTubeGoogleApiSafeLiveSmokePolicy = {
  status: "not-run-in-this-slice";
  reason: string;
  requiredConditions: readonly string[];
  allowedInitialEndpoints: readonly ["channels.list", "liveBroadcasts.list", "liveChatMessages.list"];
  credentialHandling: "server-only-token-values-never-printed";
  documentation: "record-unchecked-scope-in-task-and-pr-body";
};

const youtubeReadonlyOAuthScope = "https://www.googleapis.com/auth/youtube.readonly" as const;

const ownerVerificationEvidence = {
  ownedBroadcastLookup: "liveBroadcasts.list-mine-true",
  liveChatIdSource: "owned-broadcast-snippet-liveChatId"
} as const;

export const youtubeEncryptedTokenStoreDesignPolicy = {
  implementationStage: "design-policy-only",
  storageOwner: "future-server-encrypted-token-store",
  accessTokenPersistence: "encrypted-server-only",
  refreshTokenPersistence: "encrypted-server-only",
  keyManagement: "future-managed-secret-or-kms",
  clientComponent: "forbidden",
  fixtures: "forbidden",
  taskDocsAndPullRequests: "no-token-values",
  localStorage: "forbidden",
  indexedDB: "forbidden",
  schemaMutation: "forbidden-in-this-slice",
  refreshImplementation: "not-implemented",
  revocationImplementation: "not-implemented"
} as const satisfies YouTubeEncryptedTokenStoreDesignPolicy;

export const youtubeTokenReferenceResolverContract = {
  implementationStage: "server-only-reference-design",
  input: "credentialReferenceId",
  requiredScope: youtubeReadonlyOAuthScope,
  tokenValue: "never-returned-by-design",
  refreshTokenValue: "never-returned-by-design",
  authorizationBinding: "server-fetch-only",
  encryptedStore: youtubeEncryptedTokenStoreDesignPolicy,
  clientStorage: "forbidden",
  providerCoupling: "forbidden-direct-import-or-call"
} as const satisfies YouTubeTokenReferenceResolverContract;

export const youtubeGoogleApiAdapterContract = {
  implementationStage: "server-only-adapter-design",
  platform: "youtube",
  liveApiCall: "not-implemented",
  fakeFetch: "deterministic-contract-only",
  tokenResolution: "token-reference-only",
  ownerVerification: "channels.list-mine",
  ownedBroadcastLookup: "liveBroadcasts.list-mine-true",
  liveChatPollingStep: "liveChatMessages.list-fake-fetch",
  sanitizedCommentBridge: "runtime-foundation",
  providerCoupling: "forbidden-direct-import-or-call",
  clientComponent: "forbidden",
  quotaWrite: "not-implemented"
} as const satisfies YouTubeGoogleApiAdapterContract;

export const youtubeGoogleApiSafeLiveSmokePolicy = {
  status: "not-run-in-this-slice",
  reason:
    "This design slice intentionally has no OAuth consent, token persistence, encrypted token store, or live Google API runtime.",
  requiredConditions: [
    "explicit user approval for a safe test YouTube owner account",
    "server-only token resolver implementation that can obtain token material without returning it to callers",
    "encrypted server token store implemented and reviewed without schema changes hidden in this PR",
    "read-only YouTube OAuth scope only",
    "bounded live smoke plan for channels.list, liveBroadcasts.list, and one liveChatMessages.list step",
    "no OAuth token value in client components, fixtures, task docs, PR body, localStorage, or IndexedDB"
  ],
  allowedInitialEndpoints: ["channels.list", "liveBroadcasts.list", "liveChatMessages.list"],
  credentialHandling: "server-only-token-values-never-printed",
  documentation: "record-unchecked-scope-in-task-and-pr-body"
} as const satisfies YouTubeGoogleApiSafeLiveSmokePolicy;

export function createStaticYouTubeTokenReferenceResolver(
  references: readonly YouTubeOAuthCredentialReference[]
): YouTubeTokenReferenceResolver {
  const referenceById = new Map(references.map((reference) => [reference.credentialReferenceId, reference]));

  return {
    async resolveTokenReference(request) {
      const reference = referenceById.get(request.credentialReferenceId);

      if (!reference || reference.status === "missing") {
        return unresolvedTokenReference(request, "missing", "Credential reference is not available.");
      }

      if (reference.status === "unavailable") {
        return unresolvedTokenReference(request, "unavailable", "Credential reference cannot be resolved.");
      }

      if (reference.status === "expired" || isExpired(reference, request.nowMs)) {
        return unresolvedTokenReference(request, "expired", "Credential reference is expired; refresh is not implemented.");
      }

      if (reference.status === "scope-missing" || !reference.scopes.includes(request.requiredScope)) {
        return unresolvedTokenReference(request, "scope-missing", "Credential reference lacks the required scope.");
      }

      return {
        status: "resolved",
        credentialReferenceId: request.credentialReferenceId,
        requiredScope: request.requiredScope,
        ownerChannelReference: reference.ownerChannelReference,
        authorizationBinding: "server-fetch-only",
        tokenValue: "never-returned-by-design",
        refreshTokenValue: "never-returned-by-design",
        expiresAtMs: reference.expiresAtMs,
        encryptedStore: youtubeEncryptedTokenStoreDesignPolicy
      };
    }
  };
}

export function createDeterministicYouTubeGoogleApiAdapter({
  credentialReferenceId,
  tokenResolver,
  googleApiFakeFetch,
  nowMs
}: {
  credentialReferenceId: string;
  tokenResolver: YouTubeTokenReferenceResolver;
  googleApiFakeFetch: YouTubeGoogleApiFakeFetch;
  nowMs: () => number;
}): YouTubeGoogleApiAdapter {
  async function resolveBoundToken() {
    return tokenResolver.resolveTokenReference({
      credentialReferenceId,
      requiredScope: youtubeReadonlyOAuthScope,
      nowMs: nowMs()
    });
  }

  async function resolveRequestToken(requestCredentialReferenceId: string) {
    return tokenResolver.resolveTokenReference({
      credentialReferenceId: requestCredentialReferenceId,
      requiredScope: youtubeReadonlyOAuthScope,
      nowMs: nowMs()
    });
  }

  return {
    contract: youtubeGoogleApiAdapterContract,
    async verifyOwner(request) {
      const token = await resolveRequestToken(request.credentialReferenceId);
      if (token.status !== "resolved") {
        return unavailableOwnerResult(`token-reference-${token.status}`);
      }

      const response = await googleApiFakeFetch({
        endpoint: "channels.list-mine",
        method: "GET",
        credentialReferenceId: request.credentialReferenceId,
        token,
        query: {
          mine: "true",
          part: "id,status"
        },
        providerRequest: "forbidden",
        liveApiCall: "not-implemented"
      });

      if (response.endpoint !== "channels.list-mine" || !response.ownerChannelReference) {
        return unavailableOwnerResult("owned channel lookup did not return an owner channel reference.");
      }

      if (!response.liveStreamingEnabled) {
        return {
          status: "not-live-enabled",
          checkedBy: "server-runtime-adapter",
          reason: response.reason ?? "Live streaming is not enabled for this owner reference.",
          evidence: ownerVerificationEvidence
        };
      }

      if (
        request.expectedChannelReference &&
        request.expectedChannelReference !== response.ownerChannelReference
      ) {
        return {
          status: "not-owner",
          checkedBy: "server-runtime-adapter",
          reason: "Credential reference resolves to a different owner channel reference.",
          evidence: ownerVerificationEvidence
        };
      }

      return {
        status: "owner-verified",
        ownerChannelReference: response.ownerChannelReference,
        checkedBy: "server-runtime-adapter",
        evidence: ownerVerificationEvidence
      };
    },
    async lookupOwnedBroadcasts(request) {
      const token = await resolveBoundToken();
      if (token.status !== "resolved") {
        return noBroadcasts();
      }

      if (
        token.ownerChannelReference &&
        request.ownerChannelReference &&
        token.ownerChannelReference !== request.ownerChannelReference
      ) {
        return noBroadcasts();
      }

      const response = await googleApiFakeFetch({
        endpoint: "liveBroadcasts.list-mine",
        method: "GET",
        credentialReferenceId,
        token,
        query: {
          mine: "true",
          part: "id,snippet,status",
          broadcastStatus: request.includeNonLive ? "all" : "active"
        },
        providerRequest: "forbidden",
        liveApiCall: "not-implemented"
      });

      if (response.endpoint !== "liveBroadcasts.list-mine") {
        return noBroadcasts();
      }

      return {
        lookup: "liveBroadcasts.list-mine-true",
        broadcasts: response.broadcasts,
        providerRequest: "forbidden"
      };
    },
    async pollLiveChatOnce(state) {
      const token = await resolveBoundToken();
      if (token.status !== "resolved") {
        return terminalPollingResult(state, nowMs());
      }

      const response = await googleApiFakeFetch({
        endpoint: "liveChatMessages.list",
        method: "GET",
        credentialReferenceId,
        token,
        query: {
          liveChatId: state.liveChatId,
          part: "id,snippet",
          ...(state.nextPageToken ? { pageToken: state.nextPageToken } : {})
        },
        providerRequest: "forbidden",
        liveApiCall: "not-implemented"
      });

      if (response.endpoint !== "liveChatMessages.list") {
        return terminalPollingResult(state, nowMs());
      }

      return advanceYouTubeLiveChatPollingState(state, response.step);
    }
  };
}

function unresolvedTokenReference(
  request: YouTubeTokenReferenceResolutionRequest,
  status: YouTubeUnresolvedTokenReference["status"],
  reason: string
): YouTubeUnresolvedTokenReference {
  return {
    status,
    credentialReferenceId: request.credentialReferenceId,
    requiredScope: request.requiredScope,
    reason,
    tokenValue: "never-returned-by-design",
    refreshTokenValue: "never-returned-by-design",
    encryptedStore: youtubeEncryptedTokenStoreDesignPolicy
  };
}

function isExpired(reference: YouTubeOAuthCredentialReference, nowMs: number) {
  return reference.expiresAtMs !== null && reference.expiresAtMs <= nowMs;
}

function unavailableOwnerResult(reason: string): YouTubeOwnerVerificationRuntimeResult {
  return {
    status: "unavailable",
    checkedBy: "server-runtime-adapter",
    reason,
    evidence: null
  };
}

function noBroadcasts(): YouTubeOwnedBroadcastLookupResult {
  return {
    lookup: "liveBroadcasts.list-mine-true",
    broadcasts: [],
    providerRequest: "forbidden"
  };
}

function terminalPollingResult(
  state: YouTubeLiveChatPollingRuntimeState,
  receivedAtMs: number
): YouTubeLiveChatPollingStepResult {
  return advanceYouTubeLiveChatPollingState(state, {
    type: "terminal",
    code: "owner-verification-failed",
    receivedAtMs
  });
}
