import "server-only";

import {
  authorizeYouTubeReadOnlyDock,
  createDeterministicYouTubeOwnerPollingRuntime,
  type YouTubeLiveChatRuntimeAdapter,
  type YouTubeOwnedBroadcast,
  type YouTubeOwnerVerificationRuntimeResult
} from "./comment-translator-youtube-runtime-foundation";
import { type CommentTranslatorSessionCommandIntent, type CommentTranslatorSessionStopReason } from "./comment-translator-session-runtime";
import { type YouTubeOAuthCredentialTranslatorStartReadiness } from "./comment-translator-youtube-disconnect-runtime";
import {
  resolveCommentTranslatorLiveTargetLookupReasonUxCode,
  type CommentTranslatorStartStopReasonUxCode
} from "./comment-translator-start-stop-reason-ux";

export type CommentTranslatorServerOnlyLiveChatTargetLookupAdapter = Pick<
  YouTubeLiveChatRuntimeAdapter,
  "verifyOwner" | "lookupOwnedBroadcasts"
>;

export type CommentTranslatorServerOnlyLiveChatTargetLookupResult =
  | {
      status: "ready";
      provider: "youtube";
      serverOnlyTarget: {
        liveChatId: string;
        broadcastId: string;
        targetMetadata: "server-only-internal";
        clientReadable: "forbidden";
      };
      clientReadableTargetMetadata: "forbidden";
      providerAccess: "deterministic-local-adapter-only" | "server-only-google-api";
      providerTargetLookupExecution: "not-run-in-this-thread" | "executed-bounded-readonly-one-step";
      liveChatIdLookupExecution: "not-run-in-this-thread" | "executed-bounded-readonly-one-step";
      publicLaunchAllowed: false;
    }
  | {
      status: "unavailable";
      provider: "youtube";
      stopReason: Extract<CommentTranslatorSessionStopReason, "stream-unavailable">;
      reason:
        | "provider-target-lookup-not-approved"
        | "owner-verification-unavailable"
        | "owner-verification-failed"
        | "no-active-owned-broadcast"
        | "missing-live-chat";
      reasonUxCode: CommentTranslatorStartStopReasonUxCode;
      clientReadableDetail: "sanitized-stop-reason-only";
      providerAccess: "not-run" | "deterministic-local-adapter-only" | "server-only-google-api";
      providerTargetLookupExecution: "not-run-in-this-thread";
      liveChatIdLookupExecution: "not-run-in-this-thread";
      publicLaunchAllowed: false;
    }
  | {
      status: "skipped";
      provider: "youtube";
      reason: "non-start-intent" | "credential-not-ready" | "provider-target-lookup-not-approved";
      providerAccess: "not-run";
      providerTargetLookupExecution: "not-run-in-this-thread";
      liveChatIdLookupExecution: "not-run-in-this-thread";
      publicLaunchAllowed: false;
    };

export const commentTranslatorServerOnlyLiveChatTargetLookupContract = {
  implementationStage: "free-public-beta-f6-server-only-live-chat-target-lookup",
  runtime: "server-only",
  sessionBoundary: "start-intent-only",
  ownedBroadcastLookup: "deterministic-local-adapter-only-in-this-pr",
  providerTargetLookupExecution: "not-run-in-this-thread",
  liveChatIdLookupExecution: "not-run-in-this-thread",
  targetMetadataHandling: "server-only-internal-never-client-readable",
  browserReadableOutput: "sanitized-session-state-only",
  reasonUx: "sanitized-reason-code-only",
  failClosedFallback: "stream-unavailable-sanitized-stop-reason",
  backgroundMonitoring: "not-started",
  connectionOnlyLookup: "not-run",
  routeRenderLookup: "not-run",
  manualProviderTargetEntry: "not-added",
  browserStorage: "unchanged",
  handoffPayload: "unchanged",
  remoteSupabaseMutation: "not-run-by-codex-in-this-thread",
  publicLaunchAllowed: false,
  forbiddenReadableOutput: [
    "oauth-token-value",
    "refresh-token-value",
    "authorization-code-value",
    "owner-user-id-value",
    "provider-channel-id-value",
    "liveChatId-value",
    "service-role-key-value",
    "authorization-header-value",
    "provider-target-metadata",
    "raw-provider-payload",
    "raw-comment-text"
  ]
} as const;

export async function resolveCommentTranslatorServerOnlyLiveChatTargetLookupForStart({
  intent,
  credentialReadiness,
  adapter
}: {
  intent: CommentTranslatorSessionCommandIntent;
  credentialReadiness: YouTubeOAuthCredentialTranslatorStartReadiness;
  adapter: CommentTranslatorServerOnlyLiveChatTargetLookupAdapter;
}): Promise<CommentTranslatorServerOnlyLiveChatTargetLookupResult> {
  if (intent !== "start") {
    return createSkippedLiveChatTargetLookup("non-start-intent");
  }

  if (credentialReadiness.status !== "ready") {
    return createSkippedLiveChatTargetLookup("credential-not-ready");
  }

  const ownerVerification = await adapter.verifyOwner({
    credentialReferenceId: credentialReadiness.credentialReferenceId
  });

  if (ownerVerification.status !== "owner-verified") {
    const unavailableReason =
      ownerVerification.status === "unavailable" && isUnavailableLiveChatTargetLookupReason(ownerVerification.reason)
        ? ownerVerification.reason
        : ownerVerification.status === "unavailable"
          ? "owner-verification-unavailable"
          : "owner-verification-failed";

    return createUnavailableLiveChatTargetLookup({
      reason: unavailableReason,
      providerAccess: "not-run"
    });
  }

  const lookup = await adapter.lookupOwnedBroadcasts({
    ownerChannelReference: ownerVerification.ownerChannelReference
  });
  const activeBroadcast = lookup.broadcasts.find((broadcast) => broadcast.lifecycleStatus === "live") ?? null;
  const dockAuthorization = authorizeYouTubeReadOnlyDock(ownerVerification, activeBroadcast);

  if (dockAuthorization.status !== "authorized") {
    return createUnavailableLiveChatTargetLookup({
      reason:
        dockAuthorization.status === "unavailable" && dockAuthorization.reason === "missing-live-chat"
          ? "missing-live-chat"
          : "no-active-owned-broadcast",
      providerAccess: "deterministic-local-adapter-only"
    });
  }

  return {
    status: "ready",
    provider: "youtube",
    serverOnlyTarget: {
      liveChatId: dockAuthorization.liveChatId,
      broadcastId: dockAuthorization.broadcastId,
      targetMetadata: "server-only-internal",
      clientReadable: "forbidden"
    },
    clientReadableTargetMetadata: "forbidden",
    providerAccess: "deterministic-local-adapter-only",
    providerTargetLookupExecution: "not-run-in-this-thread",
    liveChatIdLookupExecution: "not-run-in-this-thread",
    publicLaunchAllowed: false
  };
}

export function createUnavailableCommentTranslatorLiveChatTargetLookupAdapter({
  reason
}: {
  reason: Extract<CommentTranslatorServerOnlyLiveChatTargetLookupResult, { status: "unavailable" }>["reason"];
}): CommentTranslatorServerOnlyLiveChatTargetLookupAdapter {
  return {
    async verifyOwner() {
      return {
        status: "unavailable",
        checkedBy: "server-runtime-adapter",
        reason,
        evidence: null
      };
    },
    async lookupOwnedBroadcasts() {
      return {
        lookup: "liveBroadcasts.list-mine-true",
        broadcasts: [],
        providerRequest: "forbidden"
      };
    }
  };
}

export function createSkippedCommentTranslatorLiveChatTargetLookupNotApproved(): Extract<
  CommentTranslatorServerOnlyLiveChatTargetLookupResult,
  { status: "skipped" }
> {
  return createSkippedLiveChatTargetLookup("provider-target-lookup-not-approved");
}

export function createDeterministicCommentTranslatorLiveChatTargetLookupAdapter({
  ownerVerification,
  broadcasts
}: {
  ownerVerification: YouTubeOwnerVerificationRuntimeResult;
  broadcasts: readonly YouTubeOwnedBroadcast[];
}): CommentTranslatorServerOnlyLiveChatTargetLookupAdapter {
  return createDeterministicYouTubeOwnerPollingRuntime({
    ownerVerification,
    broadcasts,
    pollSteps: []
  });
}

function createSkippedLiveChatTargetLookup(
  reason: Extract<CommentTranslatorServerOnlyLiveChatTargetLookupResult, { status: "skipped" }>["reason"]
): Extract<CommentTranslatorServerOnlyLiveChatTargetLookupResult, { status: "skipped" }> {
  return {
    status: "skipped",
    provider: "youtube",
    reason,
    providerAccess: "not-run",
    providerTargetLookupExecution: "not-run-in-this-thread",
    liveChatIdLookupExecution: "not-run-in-this-thread",
    publicLaunchAllowed: false
  };
}

function createUnavailableLiveChatTargetLookup({
  reason,
  providerAccess
}: {
  reason: Extract<CommentTranslatorServerOnlyLiveChatTargetLookupResult, { status: "unavailable" }>["reason"];
  providerAccess: Extract<CommentTranslatorServerOnlyLiveChatTargetLookupResult, { status: "unavailable" }>["providerAccess"];
}): Extract<CommentTranslatorServerOnlyLiveChatTargetLookupResult, { status: "unavailable" }> {
  return {
    status: "unavailable",
    provider: "youtube",
    stopReason: "stream-unavailable",
    reason,
    reasonUxCode: resolveCommentTranslatorLiveTargetLookupReasonUxCode({ reason }),
    clientReadableDetail: "sanitized-stop-reason-only",
    providerAccess,
    providerTargetLookupExecution: "not-run-in-this-thread",
    liveChatIdLookupExecution: "not-run-in-this-thread",
    publicLaunchAllowed: false
  };
}

function isUnavailableLiveChatTargetLookupReason(
  reason: string
): reason is Extract<CommentTranslatorServerOnlyLiveChatTargetLookupResult, { status: "unavailable" }>["reason"] {
  return (
    reason === "provider-target-lookup-not-approved" ||
    reason === "owner-verification-unavailable" ||
    reason === "owner-verification-failed" ||
    reason === "no-active-owned-broadcast" ||
    reason === "missing-live-chat"
  );
}
