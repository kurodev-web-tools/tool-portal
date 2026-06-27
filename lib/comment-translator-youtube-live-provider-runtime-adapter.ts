import "server-only";

import {
  advanceYouTubeLiveChatPollingState,
  type YouTubeLiveChatPollingRuntimeState,
  type YouTubeLiveChatPollingStepResult,
  type YouTubeLiveChatRuntimeAdapter,
  type YouTubeOwnedBroadcast,
  type YouTubeOwnerVerificationRuntimeResult,
  type YouTubeRuntimeReadOnlyOAuthScope,
  resolveYouTubeLiveTokenForServerFetch,
  type YouTubeServerOnlyLiveTokenMaterialResolver
} from "./comment-translator-youtube-runtime-foundation";
import type { YouTubeOAuthCredentialStatusCallerAuthorization } from "./comment-translator-youtube-credential-status-boundary";
import {
  createTrustedYouTubeOAuthCredentialSupabaseTokenMaterialRuntime,
  createTrustedYouTubeOAuthCredentialSupabaseStatusReader,
  type YouTubeOAuthCredentialSupabaseStatus
} from "./comment-translator-youtube-token-store-supabase-adapter";
import {
  createTrustedYouTubeOAuthStoredTokenMaterialResolver
} from "./comment-translator-youtube-token-material-runtime";
import {
  createUnavailableCommentTranslatorLiveChatTargetLookupAdapter,
  type CommentTranslatorServerOnlyLiveChatTargetLookupAdapter
} from "./comment-translator-server-only-live-chat-target-lookup";
import {
  createUnavailableCommentTranslatorBoundedLiveChatPollingAdapter,
  type CommentTranslatorBoundedLiveChatPollingAdapter
} from "./comment-translator-bounded-live-chat-polling-wiring";
import { isYouTubeOAuthCredentialResolutionDisabled } from "./comment-translator-youtube-token-store-runtime";

type GoogleApiFetchRequest = {
  endpoint: "liveBroadcasts.list" | "liveChatMessages.list";
  url: string;
  method: "GET";
  serverAuthorizationHeader: string;
};

type GoogleApiFetchResult = {
  ok: boolean;
  status: number;
  body: unknown;
};

type GoogleApiFetch = (request: GoogleApiFetchRequest) => Promise<GoogleApiFetchResult>;

type RuntimeAdapterDependencies = {
  credentialReferenceId: string;
  callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  credentialResolutionDisabled: boolean;
  trustedStatusReader:
    | {
        getCredentialStatus(request: {
          credentialReferenceId: string;
          ownerUserId: string;
        }): Promise<YouTubeOAuthCredentialSupabaseStatus>;
      }
    | null;
  tokenMaterialResolver: YouTubeServerOnlyLiveTokenMaterialResolver;
  fetchGoogleApi: GoogleApiFetch;
  nowMs: () => number;
};

export type CommentTranslatorYouTubeLiveProviderRuntimeAdapter = {
  targetLookupAdapter: CommentTranslatorServerOnlyLiveChatTargetLookupAdapter;
  pollingAdapter: CommentTranslatorBoundedLiveChatPollingAdapter;
};

const readOnlyScope: YouTubeRuntimeReadOnlyOAuthScope = "https://www.googleapis.com/auth/youtube.readonly";
const liveBroadcastsUrl = "https://www.googleapis.com/youtube/v3/liveBroadcasts";
const liveChatMessagesUrl = "https://www.googleapis.com/youtube/v3/liveChat/messages";

export function createTrustedCommentTranslatorYouTubeLiveProviderRuntimeAdapter({
  credentialReferenceId,
  callerAuthorization,
  env = process.env,
  nowMs = () => Date.now()
}: {
  credentialReferenceId: string | null | undefined;
  callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  env?: Record<string, string | undefined>;
  nowMs?: () => number;
}): CommentTranslatorYouTubeLiveProviderRuntimeAdapter {
  const disabled = isYouTubeOAuthCredentialResolutionDisabled({
    YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED: env.YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED
  });
  const statusReader = disabled ? null : createTrustedYouTubeOAuthCredentialSupabaseStatusReader({ env });
  const tokenMaterialRuntime = disabled
    ? null
    : createTrustedYouTubeOAuthCredentialSupabaseTokenMaterialRuntime({ env });

  if (
    !credentialReferenceId ||
    callerAuthorization.status !== "authorized" ||
    statusReader?.status !== "ready" ||
    tokenMaterialRuntime?.status !== "ready"
  ) {
    return unavailableAdapters();
  }

  return createRuntimeAdapters({
    credentialReferenceId,
    callerAuthorization,
    credentialResolutionDisabled: disabled,
    trustedStatusReader: statusReader.trustedAdapter,
    tokenMaterialResolver: createTrustedYouTubeOAuthStoredTokenMaterialResolver({
      tokenMaterialAdapter: tokenMaterialRuntime.trustedTokenMaterialAdapter,
      env
    }),
    fetchGoogleApi: fetchGoogleApiWithServerAuthorization,
    nowMs
  });
}

export function createCommentTranslatorYouTubeLiveProviderRuntimeAdapterForTests({
  fetchGoogleApi,
  tokenMaterialResolver,
  nowMs = () => 0
}: {
  fetchGoogleApi: GoogleApiFetch;
  tokenMaterialResolver?: YouTubeServerOnlyLiveTokenMaterialResolver;
  nowMs?: () => number;
}): CommentTranslatorYouTubeLiveProviderRuntimeAdapter {
  return createRuntimeAdapters({
    credentialReferenceId: "credential-reference-for-tests",
    callerAuthorization: {
      status: "authorized",
      ownerUserId: "owner-user-reference-for-tests"
    },
    credentialResolutionDisabled: false,
    trustedStatusReader: {
      async getCredentialStatus() {
        return {
          credentialReferenceId: "credential-reference-for-tests",
          provider: "youtube",
          providerChannelId: "provider-channel-reference",
          scopeLabel: "youtube.readonly",
          scopeSet: [readOnlyScope],
          expiresAtIso: "2099-01-01T00:00:00.000Z",
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
      tokenMaterialResolver ?? {
        async resolveServerOnlyTokenMaterial() {
          return {
            status: "available",
            serverAuthorizationHeader: "server-only-test-authorization",
            expiresAtIso: "2099-01-01T00:00:00.000Z"
          };
        }
      },
    fetchGoogleApi,
    nowMs
  });
}

function createRuntimeAdapters({
  credentialReferenceId,
  callerAuthorization,
  credentialResolutionDisabled,
  trustedStatusReader,
  tokenMaterialResolver,
  fetchGoogleApi,
  nowMs
}: RuntimeAdapterDependencies): CommentTranslatorYouTubeLiveProviderRuntimeAdapter {
  let verifiedOwnerChannelReference: string | null = null;

  async function readAuthorizedCredentialStatus() {
    if (callerAuthorization.status !== "authorized" || !trustedStatusReader) {
      return null;
    }

    try {
      const status = await trustedStatusReader.getCredentialStatus({
        credentialReferenceId,
        ownerUserId: callerAuthorization.ownerUserId
      });
      if (status.revoked || status.expiryStatus === "revoked" || !status.scopeSet.includes(readOnlyScope)) {
        return null;
      }
      return status;
    } catch {
      return null;
    }
  }

  async function resolveAuthorizationHeader() {
    if (callerAuthorization.status !== "authorized") {
      return { status: "unavailable" as const, reason: "missing" as const };
    }

    let serverAuthorizationHeader: string | null = null;
    const resolution = await resolveYouTubeLiveTokenForServerFetch({
      credentialReferenceId,
      ownerAuthorization: {
        status: "authorized",
        ownerUserId: callerAuthorization.ownerUserId
      },
      credentialResolutionDisabled,
      requiredScope: readOnlyScope,
      nowIso: new Date(nowMs()).toISOString(),
      trustedStatusReader,
      tokenMaterialResolver,
      async consumeServerFetchAuthorization(binding) {
        serverAuthorizationHeader = binding.serverAuthorizationHeader;
        return {
          serverFetchBinding: "resolved-for-server-fetch"
        };
      }
    });

    if (resolution.status !== "resolved-for-server-fetch" || !serverAuthorizationHeader) {
      return {
        status: "unavailable" as const,
        reason: resolution.status === "expired" ? ("expired" as const) : ("missing" as const)
      };
    }

    return {
      status: "available" as const,
      serverAuthorizationHeader
    };
  }

  const runtime: YouTubeLiveChatRuntimeAdapter = {
    async verifyOwner() {
      const status = await readAuthorizedCredentialStatus();
      if (!status) {
        return unavailableOwner("trusted credential status is unavailable");
      }

      verifiedOwnerChannelReference = status.providerChannelId;
      return {
        status: "owner-verified",
        ownerChannelReference: status.providerChannelId,
        checkedBy: "server-runtime-adapter",
        evidence: {
          ownedBroadcastLookup: "liveBroadcasts.list-mine-true",
          liveChatIdSource: "owned-broadcast-snippet-liveChatId"
        }
      };
    },

    async lookupOwnedBroadcasts(request) {
      if (verifiedOwnerChannelReference && request.ownerChannelReference !== verifiedOwnerChannelReference) {
        return {
          lookup: "liveBroadcasts.list-mine-true",
          broadcasts: [],
          providerRequest: "forbidden"
        };
      }

      const auth = await resolveAuthorizationHeader();
      if (auth.status !== "available") {
        return {
          lookup: "liveBroadcasts.list-mine-true",
          broadcasts: [],
          providerRequest: "forbidden"
        };
      }

      const url = new URL(liveBroadcastsUrl);
      url.searchParams.set("part", "id,snippet,status");
      url.searchParams.set("broadcastStatus", request.includeNonLive ? "all" : "active");
      url.searchParams.set("broadcastType", "all");
      url.searchParams.set(
        "fields",
        "items(id,snippet(title,liveChatId),status(lifeCycleStatus,privacyStatus)),pageInfo(totalResults,resultsPerPage)"
      );

      const response = await fetchGoogleApi({
        endpoint: "liveBroadcasts.list",
        url: url.toString(),
        method: "GET",
        serverAuthorizationHeader: auth.serverAuthorizationHeader
      });

      return {
        lookup: "liveBroadcasts.list-mine-true",
        broadcasts: response.ok ? mapBroadcasts(response.body) : [],
        providerRequest: "forbidden"
      };
    },

    async pollLiveChatOnce(state) {
      const auth = await resolveAuthorizationHeader();
      if (auth.status !== "available") {
        return terminalPolling(state, nowMs(), "owner-verification-failed");
      }

      const url = new URL(liveChatMessagesUrl);
      url.searchParams.set("part", "id,snippet");
      url.searchParams.set("liveChatId", state.liveChatId);
      url.searchParams.set("fields", "nextPageToken,pollingIntervalMillis,items(id,snippet(publishedAt,displayMessage,textMessageDetails(messageText)))");
      if (state.nextPageToken) {
        url.searchParams.set("pageToken", state.nextPageToken);
      }

      let response: GoogleApiFetchResult;
      try {
        response = await fetchGoogleApi({
          endpoint: "liveChatMessages.list",
          url: url.toString(),
          method: "GET",
          serverAuthorizationHeader: auth.serverAuthorizationHeader
        });
      } catch {
        return advanceYouTubeLiveChatPollingState(state, {
          type: "recoverable-error",
          code: "networkTimeout",
          receivedAtMs: nowMs(),
          pollingIntervalMillis: null,
          retryAfterMs: null
        });
      }

      if (!response.ok) {
        return mapFailedPollingResponse({ state, response, receivedAtMs: nowMs() });
      }

      const body = asRecord(response.body);
      const items = Array.isArray(body.items) ? body.items : [];
      return advanceYouTubeLiveChatPollingState(state, {
        type: "messages",
        receivedAtMs: nowMs(),
        nextPageToken: typeof body.nextPageToken === "string" && body.nextPageToken.trim() ? body.nextPageToken : null,
        pollingIntervalMillis: normalizePollingInterval(body.pollingIntervalMillis),
        comments: items.map(mapLiveChatMessage).filter((comment): comment is NonNullable<ReturnType<typeof mapLiveChatMessage>> => Boolean(comment))
      });
    }
  };

  return {
    targetLookupAdapter: {
      verifyOwner: runtime.verifyOwner,
      lookupOwnedBroadcasts: runtime.lookupOwnedBroadcasts
    },
    pollingAdapter: {
      status: "ready",
      providerAccess: "deterministic-local-adapter-only",
      runtime: {
        pollLiveChatOnce: runtime.pollLiveChatOnce
      }
    }
  };
}

async function fetchGoogleApiWithServerAuthorization(request: GoogleApiFetchRequest): Promise<GoogleApiFetchResult> {
  const response = await fetch(request.url, {
    method: request.method,
    headers: {
      Authorization: request.serverAuthorizationHeader
    }
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

function unavailableAdapters(): CommentTranslatorYouTubeLiveProviderRuntimeAdapter {
  return {
    targetLookupAdapter: createUnavailableCommentTranslatorLiveChatTargetLookupAdapter({
      reason: "owner-verification-unavailable"
    }),
    pollingAdapter: createUnavailableCommentTranslatorBoundedLiveChatPollingAdapter({
      reason: "polling-runtime-not-wired"
    })
  };
}

function unavailableOwner(reason: string): YouTubeOwnerVerificationRuntimeResult {
  return {
    status: "unavailable",
    checkedBy: "server-runtime-adapter",
    reason,
    evidence: null
  };
}

function mapBroadcasts(body: unknown): YouTubeOwnedBroadcast[] {
  const root = asRecord(body);
  const items = Array.isArray(root.items) ? root.items : [];
  return items.map((item) => {
    const record = asRecord(item);
    const snippet = asRecord(record.snippet);
    const status = asRecord(record.status);
    return {
      broadcastId: readString(record.id) ?? "server-only-broadcast-reference",
      liveChatId: readString(snippet.liveChatId),
      title: readString(snippet.title) ?? "YouTube Live",
      lifecycleStatus: normalizeLifecycleStatus(status.lifeCycleStatus),
      privacyStatus: normalizePrivacyStatus(status.privacyStatus)
    };
  });
}

function mapLiveChatMessage(item: unknown) {
  const record = asRecord(item);
  const snippet = asRecord(record.snippet);
  const details = asRecord(snippet.textMessageDetails);
  const id = readString(record.id);
  const publishedAt = readString(snippet.publishedAt);
  const text = readString(details.messageText) ?? readString(snippet.displayMessage);

  if (!id || !publishedAt || !text) {
    return null;
  }

  return {
    id,
    publishedAt,
    text,
    platformLanguageHint: null
  };
}

function mapFailedPollingResponse({
  state,
  response,
  receivedAtMs
}: {
  state: YouTubeLiveChatPollingRuntimeState;
  response: GoogleApiFetchResult;
  receivedAtMs: number;
}): YouTubeLiveChatPollingStepResult {
  if (response.status === 403 || response.status === 404) {
    return terminalPolling(state, receivedAtMs, "liveChatNotFound");
  }

  return advanceYouTubeLiveChatPollingState(state, {
    type: "recoverable-error",
    code: response.status === 429 ? "rateLimitExceeded" : "temporaryUnavailable",
    receivedAtMs,
    pollingIntervalMillis: null,
    retryAfterMs: null
  });
}

function terminalPolling(
  state: YouTubeLiveChatPollingRuntimeState,
  receivedAtMs: number,
  code: "liveChatEnded" | "liveChatDisabled" | "liveChatNotFound" | "owner-verification-failed"
): YouTubeLiveChatPollingStepResult {
  return advanceYouTubeLiveChatPollingState(state, {
    type: "terminal",
    code,
    receivedAtMs
  });
}

function normalizePollingInterval(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(1000, value) : 5000;
}

function normalizeLifecycleStatus(value: unknown): YouTubeOwnedBroadcast["lifecycleStatus"] {
  return value === "created" ||
    value === "ready" ||
    value === "testing" ||
    value === "live" ||
    value === "complete" ||
    value === "revoked"
    ? value
    : "ready";
}

function normalizePrivacyStatus(value: unknown): YouTubeOwnedBroadcast["privacyStatus"] {
  return value === "public" || value === "unlisted" || value === "private" ? value : "private";
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
