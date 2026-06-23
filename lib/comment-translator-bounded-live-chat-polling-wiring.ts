import "server-only";

import {
  createDeterministicYouTubeOwnerPollingRuntime,
  createInitialYouTubeLiveChatPollingState,
  type YouTubeLiveChatPollingRuntimeState,
  type YouTubeLiveChatPollingStepInput,
  type YouTubeLiveChatRuntimeAdapter,
  type YouTubeLiveChatTerminalStateCode
} from "./comment-translator-youtube-runtime-foundation";
import {
  type CommentTranslatorActiveSessionRecord,
  type CommentTranslatorSessionBrowserSafeState,
  type CommentTranslatorSessionCommandIntent,
  type CommentTranslatorSessionStopReason,
  type CommentTranslatorSessionUsageSnapshot
} from "./comment-translator-session-runtime";
import { type CommentTranslatorServerOnlyLiveChatTargetLookupResult } from "./comment-translator-server-only-live-chat-target-lookup";
import {
  resolveCommentTranslatorPollingTerminalReasonUxCode,
  type CommentTranslatorStartStopReasonUxCode
} from "./comment-translator-start-stop-reason-ux";

export type CommentTranslatorBoundedLiveChatPollingAdapter =
  | {
      status: "ready";
      providerAccess: "deterministic-local-adapter-only";
      runtime: Pick<YouTubeLiveChatRuntimeAdapter, "pollLiveChatOnce">;
    }
  | {
      status: "unavailable";
      providerAccess: "not-run";
      reason: "live-provider-polling-not-approved" | "polling-runtime-not-wired";
    };

export type CommentTranslatorBoundedLiveChatPollingSanitizedMetadata = {
  nextPageToken: "present" | "absent";
  pollingIntervalMillis: number | null;
  returnedCommentCount: number;
  retryCount: number;
  rawComments: "not-returned-by-design";
  serverOnlyCursor: "not-returned-by-design";
  liveTarget: "not-returned-by-design";
  providerTargetMetadata: "forbidden";
};

export type CommentTranslatorBoundedLiveChatPollingSeedResult =
  | {
      status: "seeded";
      liveTargetHandling: "server-only-active-session-state";
      nextPageToken: "absent";
      providerPollingExecution: "not-run-in-this-thread";
      clientReadableTargetMetadata: "forbidden";
      publicLaunchAllowed: false;
    }
  | {
      status: "skipped-non-active-session" | "skipped-target-not-ready";
      liveTargetHandling: "not-stored";
      providerPollingExecution: "not-run-in-this-thread";
      publicLaunchAllowed: false;
    };

export type CommentTranslatorBoundedLiveChatPollingTickResult =
  | {
      status: "skipped-no-active-session" | "skipped-start-intent-awaiting-active-seed" | "skipped-stop-intent";
      providerAccess: "not-run";
      providerSignal: null;
      publicLaunchAllowed: false;
    }
  | {
      status: "skipped-not-due";
      providerAccess: "not-run";
      providerSignal: null;
      sanitizedPolling: CommentTranslatorBoundedLiveChatPollingSanitizedMetadata;
      publicLaunchAllowed: false;
    }
  | {
      status: "skipped-quota-budget-stop-handoff";
      providerAccess: "not-run";
      providerSignal: Extract<
        CommentTranslatorSessionStopReason,
        | "missing-heartbeat"
        | "daily-time-limit"
        | "session-time-limit"
        | "translated-message-cap"
        | "provider-quota-stop"
        | "global-budget-stop"
        | "ai-budget-stop"
        | "translation-provider-limit"
      >;
      stopReason: Extract<
        CommentTranslatorSessionStopReason,
        | "missing-heartbeat"
        | "daily-time-limit"
        | "session-time-limit"
        | "translated-message-cap"
        | "provider-quota-stop"
        | "global-budget-stop"
        | "ai-budget-stop"
        | "translation-provider-limit"
      >;
      reasonUxCode: CommentTranslatorStartStopReasonUxCode;
      publicLaunchAllowed: false;
    }
  | {
      status: "unavailable-missing-server-only-polling-state" | "unavailable-polling-runtime-not-approved";
      providerAccess: "not-run";
      providerSignal: Extract<CommentTranslatorSessionStopReason, "stream-unavailable">;
      reasonUxCode: CommentTranslatorStartStopReasonUxCode;
      clientReadableDetail: "sanitized-stop-reason-only";
      publicLaunchAllowed: false;
    }
  | {
      status: "empty-chat-waiting" | "polled-comments-available" | "recoverable-backoff-scheduled";
      providerAccess: "deterministic-local-adapter-only";
      providerSignal: null;
      sanitizedPolling: CommentTranslatorBoundedLiveChatPollingSanitizedMetadata;
      publicLaunchAllowed: false;
    }
  | {
      status: "terminal-state-handoff" | "bounded-retry-exhausted";
      providerAccess: "deterministic-local-adapter-only";
      providerSignal: Extract<CommentTranslatorSessionStopReason, "stream-ended" | "stream-unavailable" | "terminal-provider-error">;
      reasonUxCode: CommentTranslatorStartStopReasonUxCode;
      sanitizedPolling: CommentTranslatorBoundedLiveChatPollingSanitizedMetadata;
      clientReadableDetail: "sanitized-stop-reason-only";
      publicLaunchAllowed: false;
    };

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
    "oauth-token-value",
    "refresh-token-value",
    "authorization-code-value",
    "owner-user-id-value",
    "provider-channel-id-value",
    "live-target-value",
    "service-role-key-value",
    "authorization-header-value",
    "provider-target-metadata",
    "raw-provider-payload",
    "raw-comment-text",
    "server-only-cursor"
  ]
} as const;

const pollingStateBySessionReference = new Map<string, YouTubeLiveChatPollingRuntimeState>();

export function seedCommentTranslatorBoundedLiveChatPollingStateForActiveSession({
  state,
  liveChatTargetReadiness,
  nowMs
}: {
  state: CommentTranslatorSessionBrowserSafeState;
  liveChatTargetReadiness: CommentTranslatorServerOnlyLiveChatTargetLookupResult;
  nowMs: number;
}): CommentTranslatorBoundedLiveChatPollingSeedResult {
  if (state.status !== "active") {
    return {
      status: "skipped-non-active-session",
      liveTargetHandling: "not-stored",
      providerPollingExecution: "not-run-in-this-thread",
      publicLaunchAllowed: false
    };
  }

  if (liveChatTargetReadiness.status !== "ready") {
    return {
      status: "skipped-target-not-ready",
      liveTargetHandling: "not-stored",
      providerPollingExecution: "not-run-in-this-thread",
      publicLaunchAllowed: false
    };
  }

  pollingStateBySessionReference.set(
    state.sessionReferenceId,
    createInitialYouTubeLiveChatPollingState({
      liveChatId: liveChatTargetReadiness.serverOnlyTarget.liveChatId,
      nowMs
    })
  );

  return {
    status: "seeded",
    liveTargetHandling: "server-only-active-session-state",
    nextPageToken: "absent",
    providerPollingExecution: "not-run-in-this-thread",
    clientReadableTargetMetadata: "forbidden",
    publicLaunchAllowed: false
  };
}

export async function readCommentTranslatorBoundedLiveChatPollingTick({
  intent,
  activeSession,
  usage,
  adapter,
  nowMs,
  maxRecoverableRetries = 3
}: {
  intent: CommentTranslatorSessionCommandIntent;
  activeSession: CommentTranslatorActiveSessionRecord | null;
  usage: CommentTranslatorSessionUsageSnapshot;
  adapter: CommentTranslatorBoundedLiveChatPollingAdapter;
  nowMs: number;
  maxRecoverableRetries?: number;
}): Promise<CommentTranslatorBoundedLiveChatPollingTickResult> {
  if (!activeSession) {
    return skippedPolling("skipped-no-active-session");
  }

  if (intent === "start") {
    return skippedPolling("skipped-start-intent-awaiting-active-seed");
  }

  if (intent === "stop") {
    return skippedPolling("skipped-stop-intent");
  }

  const quotaStopReason = assessPollingQuotaBudgetStopReason({ activeSession, usage, nowMs });
  if (quotaStopReason) {
    return {
      status: "skipped-quota-budget-stop-handoff",
      providerAccess: "not-run",
      providerSignal: quotaStopReason,
      stopReason: quotaStopReason,
      reasonUxCode: resolvePollingQuotaStopReasonUxCode(quotaStopReason),
      publicLaunchAllowed: false
    };
  }

  const pollingState = pollingStateBySessionReference.get(activeSession.sessionReferenceId);
  if (!pollingState) {
    return unavailablePolling("unavailable-missing-server-only-polling-state");
  }

  if (pollingState.terminal) {
    clearCommentTranslatorBoundedLiveChatPollingState(activeSession.sessionReferenceId);
    return terminalPollingResult({
      status: "terminal-state-handoff",
      state: pollingState,
      providerSignal: mapTerminalCodeToStopReason(pollingState.terminal.code),
      nowMs
    });
  }

  if (nowMs < pollingState.nextPollAfterMs) {
    return {
      status: "skipped-not-due",
      providerAccess: "not-run",
      providerSignal: null,
      sanitizedPolling: createSanitizedPollingMetadata(pollingState, 0, nowMs),
      publicLaunchAllowed: false
    };
  }

  if (adapter.status !== "ready") {
    return unavailablePolling("unavailable-polling-runtime-not-approved");
  }

  const previousRetryCount = pollingState.retryCount;
  const pollingResult = await adapter.runtime.pollLiveChatOnce(pollingState);
  pollingStateBySessionReference.set(activeSession.sessionReferenceId, pollingResult.state);

  if (pollingResult.state.terminal) {
    clearCommentTranslatorBoundedLiveChatPollingState(activeSession.sessionReferenceId);
    return terminalPollingResult({
      status: "terminal-state-handoff",
      state: pollingResult.state,
      providerSignal: mapTerminalCodeToStopReason(pollingResult.state.terminal.code),
      nowMs
    });
  }

  const sanitizedPolling = createSanitizedPollingMetadata(pollingResult.state, pollingResult.comments.length, nowMs);

  if (pollingResult.state.retryCount > maxRecoverableRetries) {
    clearCommentTranslatorBoundedLiveChatPollingState(activeSession.sessionReferenceId);
    return {
      status: "bounded-retry-exhausted",
      providerAccess: "deterministic-local-adapter-only",
      providerSignal: "terminal-provider-error",
      reasonUxCode: "translation-provider-error",
      sanitizedPolling,
      clientReadableDetail: "sanitized-stop-reason-only",
      publicLaunchAllowed: false
    };
  }

  if (pollingResult.state.retryCount > previousRetryCount) {
    return {
      status: "recoverable-backoff-scheduled",
      providerAccess: "deterministic-local-adapter-only",
      providerSignal: null,
      sanitizedPolling,
      publicLaunchAllowed: false
    };
  }

  return {
    status: pollingResult.comments.length > 0 ? "polled-comments-available" : "empty-chat-waiting",
    providerAccess: "deterministic-local-adapter-only",
    providerSignal: null,
    sanitizedPolling,
    publicLaunchAllowed: false
  };
}

export function clearCommentTranslatorBoundedLiveChatPollingState(sessionReferenceId: string | null | undefined) {
  if (!sessionReferenceId) {
    return;
  }

  pollingStateBySessionReference.delete(sessionReferenceId);
}

export function createUnavailableCommentTranslatorBoundedLiveChatPollingAdapter({
  reason
}: {
  reason: Extract<CommentTranslatorBoundedLiveChatPollingAdapter, { status: "unavailable" }>["reason"];
}): CommentTranslatorBoundedLiveChatPollingAdapter {
  return {
    status: "unavailable",
    providerAccess: "not-run",
    reason
  };
}

export function createDeterministicCommentTranslatorBoundedLiveChatPollingAdapter({
  pollSteps
}: {
  pollSteps: readonly YouTubeLiveChatPollingStepInput[];
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

export function resetCommentTranslatorBoundedLiveChatPollingStateForTests() {
  pollingStateBySessionReference.clear();
}

function skippedPolling(
  status: Extract<
    CommentTranslatorBoundedLiveChatPollingTickResult,
    { status: "skipped-no-active-session" | "skipped-start-intent-awaiting-active-seed" | "skipped-stop-intent" }
  >["status"]
): Extract<
  CommentTranslatorBoundedLiveChatPollingTickResult,
  { status: "skipped-no-active-session" | "skipped-start-intent-awaiting-active-seed" | "skipped-stop-intent" }
> {
  return {
    status,
    providerAccess: "not-run",
    providerSignal: null,
    publicLaunchAllowed: false
  };
}

function unavailablePolling(
  status: Extract<
    CommentTranslatorBoundedLiveChatPollingTickResult,
    { status: "unavailable-missing-server-only-polling-state" | "unavailable-polling-runtime-not-approved" }
  >["status"]
): Extract<
  CommentTranslatorBoundedLiveChatPollingTickResult,
  { status: "unavailable-missing-server-only-polling-state" | "unavailable-polling-runtime-not-approved" }
> {
  return {
    status,
    providerAccess: "not-run",
    providerSignal: "stream-unavailable",
    reasonUxCode: status === "unavailable-polling-runtime-not-approved" ? "translation-provider-unavailable" : "live-target-unavailable",
    clientReadableDetail: "sanitized-stop-reason-only",
    publicLaunchAllowed: false
  };
}

function terminalPollingResult({
  status,
  state,
  providerSignal,
  nowMs
}: {
  status: "terminal-state-handoff";
  state: YouTubeLiveChatPollingRuntimeState;
  providerSignal: Extract<CommentTranslatorSessionStopReason, "stream-ended" | "stream-unavailable" | "terminal-provider-error">;
  nowMs: number;
}): CommentTranslatorBoundedLiveChatPollingTickResult {
  return {
    status,
    providerAccess: "deterministic-local-adapter-only",
    providerSignal,
    reasonUxCode: resolveCommentTranslatorPollingTerminalReasonUxCode({
      code: state.terminal?.code ?? "unknown-terminal-provider-error"
    }),
    sanitizedPolling: createSanitizedPollingMetadata(state, 0, nowMs),
    clientReadableDetail: "sanitized-stop-reason-only",
    publicLaunchAllowed: false
  };
}

function createSanitizedPollingMetadata(
  state: YouTubeLiveChatPollingRuntimeState,
  returnedCommentCount: number,
  nowMs: number
): CommentTranslatorBoundedLiveChatPollingSanitizedMetadata {
  return {
    nextPageToken: state.nextPageToken ? "present" : "absent",
    pollingIntervalMillis: state.terminal ? null : Math.max(0, state.nextPollAfterMs - nowMs),
    returnedCommentCount,
    retryCount: state.retryCount,
    rawComments: "not-returned-by-design",
    serverOnlyCursor: "not-returned-by-design",
    liveTarget: "not-returned-by-design",
    providerTargetMetadata: "forbidden"
  };
}

function assessPollingQuotaBudgetStopReason({
  activeSession,
  usage,
  nowMs
}: {
  activeSession: CommentTranslatorActiveSessionRecord;
  usage: CommentTranslatorSessionUsageSnapshot;
  nowMs: number;
}): Extract<
  CommentTranslatorSessionStopReason,
  | "missing-heartbeat"
  | "daily-time-limit"
  | "session-time-limit"
  | "translated-message-cap"
  | "provider-quota-stop"
  | "global-budget-stop"
  | "ai-budget-stop"
  | "translation-provider-limit"
> | null {
  const translatedMessagesPerMinute = usage.planEntitlement?.translatedMessagesPerMinute ?? 30;
  const sessionLimitMs = usage.planEntitlement?.sessionLimitMs ?? 30 * 60 * 1_000;
  const dailyLimitMs = usage.planEntitlement?.dailyLimitMs ?? 30 * 60 * 1_000;
  const activeElapsedMs = usage.currentSessionElapsedMs ?? Math.max(0, nowMs - activeSession.startedAtMs);

  if (nowMs - activeSession.lastHeartbeatAtMs > 45_000) {
    return "missing-heartbeat";
  }

  if (activeElapsedMs >= sessionLimitMs) {
    return "session-time-limit";
  }

  if (usage.dailyUsedMs > 0 && usage.dailyUsedMs + Math.max(0, activeElapsedMs) >= dailyLimitMs) {
    return "daily-time-limit";
  }

  if (usage.translatedMessagesInCurrentMinute >= translatedMessagesPerMinute) {
    return "translated-message-cap";
  }

  if (!usage.providerBudgetAvailable) {
    return "provider-quota-stop";
  }

  if (!usage.globalBudgetAvailable) {
    return "global-budget-stop";
  }

  if (!usage.aiBudgetAvailable) {
    return "ai-budget-stop";
  }

  if (usage.translationProviderAvailable === false) {
    return "translation-provider-limit";
  }

  return null;
}

function resolvePollingQuotaStopReasonUxCode(
  stopReason: Extract<
    CommentTranslatorSessionStopReason,
    | "missing-heartbeat"
    | "daily-time-limit"
    | "session-time-limit"
    | "translated-message-cap"
    | "provider-quota-stop"
    | "global-budget-stop"
    | "ai-budget-stop"
    | "translation-provider-limit"
  >
): CommentTranslatorStartStopReasonUxCode {
  if (stopReason === "translation-provider-limit") {
    return "translation-provider-unavailable";
  }
  if (stopReason === "missing-heartbeat") {
    return "heartbeat-or-browser-disconnect";
  }
  return "quota-or-budget-stop";
}

function mapTerminalCodeToStopReason(
  code: YouTubeLiveChatTerminalStateCode
): Extract<CommentTranslatorSessionStopReason, "stream-ended" | "stream-unavailable" | "terminal-provider-error"> {
  if (code === "liveChatEnded") {
    return "stream-ended";
  }

  if (code === "liveChatDisabled" || code === "liveChatNotFound") {
    return "stream-unavailable";
  }

  return "terminal-provider-error";
}
