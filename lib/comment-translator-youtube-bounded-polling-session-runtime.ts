import "server-only";

import type { CommentTranslatorSessionStopReason } from "./comment-translator-session-runtime";
import {
  authorizeYouTubeReadOnlyDock,
  createInitialYouTubeLiveChatPollingState,
  type YouTubeLiveChatPollingRuntimeState,
  type YouTubeLiveChatRuntimeAdapter
} from "./comment-translator-youtube-runtime-foundation";
import type { YouTubeProviderSafeCommentPayload } from "./comment-translator-youtube-input-boundary";

export type YouTubeBoundedPollingSessionRuntimeContract = {
  implementationStage: "server-owned-bounded-polling-session-runtime";
  runtime: "server-only";
  targetLookup: "once-at-session-start";
  pollingEndpoint: "liveChatMessages.list-deterministic-adapter";
  liveProviderExecution: "not-run-without-same-thread-preflight-sanitized-output-and-explicit-approval";
  liveChatIdBoundary: "server-session-only-never-client-readable";
  pollingCursorBoundary: "server-session-only-never-client-readable";
  minPollingIntervalMs: 1_000;
  emptyChatBackoff: "bounded-empty-chat-backoff";
  maxRecoverableErrors: 3;
  terminalStopStates: readonly ["liveChatEnded", "liveChatDisabled", "liveChatNotFound", "owner-verification-failed"];
  browserStorage: "forbidden";
  handoffPayload: "unchanged";
  routeWiring: "not-wired-in-task-10";
  rawCommentLogging: "disabled-by-default";
};

export type YouTubeBoundedPollingSessionServerState = {
  sessionReferenceId: string;
  credentialReferenceId: string;
  startedAtMs: number;
  nextPollAfterMs: number;
  pollAttemptCount: number;
  emptyPollCount: number;
  recoverableErrorCount: number;
  targetLookupCount: 1;
  minPollingIntervalMs: number;
  maxRecoverableErrors: number;
  emptyChatBackoffIncrementMs: number;
  maxEmptyChatBackoffMs: number;
  pollingState: YouTubeLiveChatPollingRuntimeState;
};

export type YouTubeBoundedPollingSessionBrowserSafeState = {
  status: "polling-active" | "polling-waiting" | "polling-stopped";
  provider: "youtube";
  sessionReferenceId: string;
  credentialReferenceId: string;
  pollAttemptCount: number;
  nextPollAfterIso: string | null;
  targetLookup: "completed-server-only" | "blocked-server-only";
  pollingEndpoint: "liveChatMessages.list";
  pollingCursor: "server-session-only";
  liveChatId: "never-returned-by-design";
  providerTargetMetadata: "forbidden";
  browserStorage: "unchanged";
  handoffPayload: "unchanged";
  tokenValue: "never-returned-by-design";
  authorizationHeaderValue: "never-returned-by-design";
  providerErrorBody: "never-returned-by-design";
  rawCommentText: "never-returned-by-design";
  stopReason: CommentTranslatorSessionStopReason | null;
};

export type StartYouTubeBoundedPollingSessionRequest = {
  adapter: YouTubeLiveChatRuntimeAdapter;
  credentialReferenceId: string;
  sessionReferenceId: string;
  nowMs: number;
};

export type RunYouTubeBoundedPollingSessionTickRequest = {
  adapter: YouTubeLiveChatRuntimeAdapter;
  serverState: YouTubeBoundedPollingSessionServerState;
  nowMs: number;
};

export type YouTubeBoundedPollingSessionStartResult =
  | {
      status: "active";
      serverState: YouTubeBoundedPollingSessionServerState;
      browserSafeState: YouTubeBoundedPollingSessionBrowserSafeState;
    }
  | {
      status: "stopped";
      browserSafeState: YouTubeBoundedPollingSessionBrowserSafeState;
    };

export type YouTubeBoundedPollingSessionTickResult =
  | {
      status: "active" | "waiting";
      serverState: YouTubeBoundedPollingSessionServerState;
      comments: readonly YouTubeProviderSafeCommentPayload[];
      browserSafeState: YouTubeBoundedPollingSessionBrowserSafeState;
    }
  | {
      status: "stopped";
      serverState: YouTubeBoundedPollingSessionServerState;
      comments: readonly [];
      browserSafeState: YouTubeBoundedPollingSessionBrowserSafeState;
    };

const minPollingIntervalMs = 1_000;
const maxRecoverableErrors = 3;
const emptyChatBackoffIncrementMs = 1_000;
const maxEmptyChatBackoffMs = 10_000;

export const youtubeBoundedPollingSessionRuntimeContract = {
  implementationStage: "server-owned-bounded-polling-session-runtime",
  runtime: "server-only",
  targetLookup: "once-at-session-start",
  pollingEndpoint: "liveChatMessages.list-deterministic-adapter",
  liveProviderExecution: "not-run-without-same-thread-preflight-sanitized-output-and-explicit-approval",
  liveChatIdBoundary: "server-session-only-never-client-readable",
  pollingCursorBoundary: "server-session-only-never-client-readable",
  minPollingIntervalMs,
  emptyChatBackoff: "bounded-empty-chat-backoff",
  maxRecoverableErrors,
  terminalStopStates: ["liveChatEnded", "liveChatDisabled", "liveChatNotFound", "owner-verification-failed"],
  browserStorage: "forbidden",
  handoffPayload: "unchanged",
  routeWiring: "not-wired-in-task-10",
  rawCommentLogging: "disabled-by-default"
} as const satisfies YouTubeBoundedPollingSessionRuntimeContract;

export async function startYouTubeBoundedPollingSession(
  request: StartYouTubeBoundedPollingSessionRequest
): Promise<YouTubeBoundedPollingSessionStartResult> {
  const ownerVerification = await request.adapter.verifyOwner({
    credentialReferenceId: request.credentialReferenceId
  });
  const ownerChannelReference =
    ownerVerification.status === "owner-verified" ? ownerVerification.ownerChannelReference : "";
  const broadcasts = await request.adapter.lookupOwnedBroadcasts({
    ownerChannelReference
  });
  const dockAuthorization = authorizeYouTubeReadOnlyDock(
    ownerVerification,
    broadcasts.broadcasts.find((broadcast) => broadcast.lifecycleStatus === "live") ?? null
  );

  if (dockAuthorization.status !== "authorized") {
    return {
      status: "stopped",
      browserSafeState: createBrowserSafeState({
        status: "polling-stopped",
        sessionReferenceId: request.sessionReferenceId,
        credentialReferenceId: request.credentialReferenceId,
        pollAttemptCount: 0,
        nextPollAfterMs: null,
        targetLookup: "blocked-server-only",
        stopReason: mapStartBlockToStopReason(dockAuthorization.reason)
      })
    };
  }

  const pollingState = createInitialYouTubeLiveChatPollingState({
    liveChatId: dockAuthorization.liveChatId,
    nowMs: request.nowMs
  });
  const serverState: YouTubeBoundedPollingSessionServerState = {
    sessionReferenceId: request.sessionReferenceId,
    credentialReferenceId: request.credentialReferenceId,
    startedAtMs: request.nowMs,
    nextPollAfterMs: request.nowMs,
    pollAttemptCount: 0,
    emptyPollCount: 0,
    recoverableErrorCount: 0,
    targetLookupCount: 1,
    minPollingIntervalMs,
    maxRecoverableErrors,
    emptyChatBackoffIncrementMs,
    maxEmptyChatBackoffMs,
    pollingState
  };

  return {
    status: "active",
    serverState,
    browserSafeState: createBrowserSafeState({
      status: "polling-active",
      sessionReferenceId: request.sessionReferenceId,
      credentialReferenceId: request.credentialReferenceId,
      pollAttemptCount: 0,
      nextPollAfterMs: request.nowMs,
      targetLookup: "completed-server-only",
      stopReason: null
    })
  };
}

export async function runYouTubeBoundedPollingSessionTick(
  request: RunYouTubeBoundedPollingSessionTickRequest
): Promise<YouTubeBoundedPollingSessionTickResult> {
  if (request.serverState.pollingState.terminal) {
    return createStoppedTickResult({
      serverState: request.serverState,
      stopReason: mapTerminalCodeToStopReason(request.serverState.pollingState.terminal.code)
    });
  }

  if (request.serverState.recoverableErrorCount >= request.serverState.maxRecoverableErrors) {
    return createStoppedTickResult({
      serverState: request.serverState,
      stopReason: "terminal-provider-error"
    });
  }

  if (request.nowMs < request.serverState.nextPollAfterMs) {
    return {
      status: "waiting",
      serverState: request.serverState,
      comments: [],
      browserSafeState: createBrowserSafeStateFromServerState({
        status: "polling-waiting",
        serverState: request.serverState,
        stopReason: null
      })
    };
  }

  const pollingResult = await request.adapter.pollLiveChatOnce(request.serverState.pollingState);
  const recoveredFromError = pollingResult.state.retryCount > request.serverState.pollingState.retryCount;
  const recoverableErrorCount = recoveredFromError ? request.serverState.recoverableErrorCount + 1 : 0;
  const emptyPollCount =
    !recoveredFromError && pollingResult.comments.length === 0 && !pollingResult.state.terminal
      ? request.serverState.emptyPollCount + 1
      : 0;
  const nextPollAfterMs = Math.max(
    emptyPollCount > 0
      ? pollingResult.state.nextPollAfterMs + emptyBackoffMs(request.serverState, emptyPollCount)
      : pollingResult.state.nextPollAfterMs,
    request.nowMs + request.serverState.minPollingIntervalMs,
    0
  );
  const serverState: YouTubeBoundedPollingSessionServerState = {
    ...request.serverState,
    pollAttemptCount: request.serverState.pollAttemptCount + 1,
    emptyPollCount,
    recoverableErrorCount,
    nextPollAfterMs,
    pollingState: {
      ...pollingResult.state,
      nextPollAfterMs
    }
  };

  if (serverState.pollingState.terminal) {
    return createStoppedTickResult({
      serverState,
      stopReason: mapTerminalCodeToStopReason(serverState.pollingState.terminal.code)
    });
  }

  if (serverState.recoverableErrorCount >= serverState.maxRecoverableErrors) {
    return createStoppedTickResult({
      serverState,
      stopReason: "terminal-provider-error"
    });
  }

  return {
    status: "active",
    serverState,
    comments: pollingResult.comments,
    browserSafeState: createBrowserSafeStateFromServerState({
      status: "polling-active",
      serverState,
      stopReason: null
    })
  };
}

function createStoppedTickResult({
  serverState,
  stopReason
}: {
  serverState: YouTubeBoundedPollingSessionServerState;
  stopReason: CommentTranslatorSessionStopReason;
}): Extract<YouTubeBoundedPollingSessionTickResult, { status: "stopped" }> {
  return {
    status: "stopped",
    serverState,
    comments: [],
    browserSafeState: createBrowserSafeStateFromServerState({
      status: "polling-stopped",
      serverState,
      stopReason
    })
  };
}

function createBrowserSafeStateFromServerState({
  status,
  serverState,
  stopReason
}: {
  status: YouTubeBoundedPollingSessionBrowserSafeState["status"];
  serverState: YouTubeBoundedPollingSessionServerState;
  stopReason: CommentTranslatorSessionStopReason | null;
}): YouTubeBoundedPollingSessionBrowserSafeState {
  return createBrowserSafeState({
    status,
    sessionReferenceId: serverState.sessionReferenceId,
    credentialReferenceId: serverState.credentialReferenceId,
    pollAttemptCount: serverState.pollAttemptCount,
    nextPollAfterMs: stopReason ? null : serverState.nextPollAfterMs,
    targetLookup: "completed-server-only",
    stopReason
  });
}

function createBrowserSafeState({
  status,
  sessionReferenceId,
  credentialReferenceId,
  pollAttemptCount,
  nextPollAfterMs,
  targetLookup,
  stopReason
}: {
  status: YouTubeBoundedPollingSessionBrowserSafeState["status"];
  sessionReferenceId: string;
  credentialReferenceId: string;
  pollAttemptCount: number;
  nextPollAfterMs: number | null;
  targetLookup: YouTubeBoundedPollingSessionBrowserSafeState["targetLookup"];
  stopReason: CommentTranslatorSessionStopReason | null;
}): YouTubeBoundedPollingSessionBrowserSafeState {
  return {
    status,
    provider: "youtube",
    sessionReferenceId,
    credentialReferenceId,
    pollAttemptCount,
    nextPollAfterIso: nextPollAfterMs === null ? null : new Date(nextPollAfterMs).toISOString(),
    targetLookup,
    pollingEndpoint: "liveChatMessages.list",
    pollingCursor: "server-session-only",
    liveChatId: "never-returned-by-design",
    providerTargetMetadata: "forbidden",
    browserStorage: "unchanged",
    handoffPayload: "unchanged",
    tokenValue: "never-returned-by-design",
    authorizationHeaderValue: "never-returned-by-design",
    providerErrorBody: "never-returned-by-design",
    rawCommentText: "never-returned-by-design",
    stopReason
  };
}

function emptyBackoffMs(serverState: YouTubeBoundedPollingSessionServerState, emptyPollCount: number) {
  return Math.min(serverState.maxEmptyChatBackoffMs, emptyPollCount * serverState.emptyChatBackoffIncrementMs);
}

function mapStartBlockToStopReason(reason: "owner-verification-failed" | "broadcast-not-found" | "broadcast-not-live" | "missing-live-chat") {
  if (reason === "owner-verification-failed") {
    return "auth-failed";
  }

  return "stream-unavailable";
}

function mapTerminalCodeToStopReason(
  code: NonNullable<YouTubeLiveChatPollingRuntimeState["terminal"]>["code"]
): CommentTranslatorSessionStopReason {
  if (code === "liveChatEnded") {
    return "stream-ended";
  }

  if (code === "owner-verification-failed") {
    return "auth-failed";
  }

  return "stream-unavailable";
}
