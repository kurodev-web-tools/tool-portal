import "server-only";

import {
  createDeterministicYouTubeOwnerPollingRuntime,
  type YouTubeLiveChatPollingStepInput
} from "./comment-translator-youtube-runtime-foundation";
import type { CommentTranslatorBoundedLiveChatPollingAdapter } from "./comment-translator-bounded-live-chat-polling-types";

export const commentTranslatorBoundedLiveChatPollingWiringContract = {
  implementationStage: "free-public-beta-f7-bounded-live-chat-polling-wiring",
  runtime: "server-only",
  sessionBoundary: "active-session-only",
  liveTargetHandling: "server-only-active-session-state",
  pollingCursor: "nextPageToken-server-only",
  pollingInterval: "pollingIntervalMillis",
  retry: "bounded-retry-backoff",
  emptyChatBehavior: "empty-chat-waiting",
  terminalStateHandoff: "stream-ended-stream-unavailable-terminal-provider-error",
  reasonUx: "sanitized-reason-code-only",
  quotaBudgetStopHandoff: "durable-session-ledger-stop-state",
  providerPollingExecution: "not-run-in-this-thread",
  defaultAdapter: "unavailable-not-approved",
  browserReadableOutput: "sanitized-session-state-and-counts-only",
  browserStorage: "unchanged",
  handoffPayload: "unchanged",
  routeRenderLookup: "not-run",
  connectionOnlyMonitoring: "not-started",
  remoteSupabaseMutation: "not-run-by-codex-in-this-thread",
  publicLaunchAllowed: false,
  forbiddenReadableOutput: [
    "oauth-token-value", "refresh-token-value", "authorization-code-value", "owner-user-id-value",
    "provider-channel-id-value", "live-target-value", "service-role-key-value", "authorization-header-value",
    "provider-target-metadata", "raw-provider-payload", "raw-comment-text", "server-only-cursor"
  ]
} as const;

export function createUnavailableCommentTranslatorBoundedLiveChatPollingAdapter({
  reason
}: {
  readonly reason: Extract<CommentTranslatorBoundedLiveChatPollingAdapter, { readonly status: "unavailable" }>["reason"];
}): CommentTranslatorBoundedLiveChatPollingAdapter {
  return { status: "unavailable", providerAccess: "not-run", reason };
}

export function createDeterministicCommentTranslatorBoundedLiveChatPollingAdapter({
  pollSteps
}: {
  readonly pollSteps: readonly YouTubeLiveChatPollingStepInput[];
}): CommentTranslatorBoundedLiveChatPollingAdapter {
  return {
    status: "ready",
    providerAccess: "deterministic-local-adapter-only",
    runtime: createDeterministicYouTubeOwnerPollingRuntime({
      ownerVerification: {
        status: "owner-verified",
        ownerChannelReference: "server-only-owner-reference",
        checkedBy: "server-runtime-adapter",
        evidence: {
          ownedBroadcastLookup: "liveBroadcasts.list-mine-true",
          liveChatIdSource: "owned-broadcast-snippet-liveChatId"
        }
      },
      broadcasts: [],
      pollSteps
    })
  };
}
