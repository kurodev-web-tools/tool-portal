import "server-only";

import {
  advanceYouTubeLiveChatPollingState,
  createInitialYouTubeLiveChatPollingState,
  type YouTubeLiveChatPollingRuntimeState,
  type YouTubeLiveChatPollingStepResult
} from "./comment-translator-youtube-runtime-foundation";
import {
  createCommentTranslatorPerMinuteResyncingProjection,
  createCommentTranslatorPerMinuteRunningProjection,
  resolveCommentTranslatorPerMinuteRatePause
} from "./comment-translator-per-minute-rate-pause";
import { pollingCoordinatorRegistry } from "./comment-translator-bounded-live-chat-polling-registry";
import { assessPollingTerminalStopReason, mapTerminalCodeToStopReason } from "./comment-translator-bounded-live-chat-polling-terminal-policy";
import {
  createBoundedRetryExhaustedPollingResult,
  createMissingStateRatePauseSanitizedMetadata,
  createPollingResultWithServerOnlyComments,
  createQuotaBudgetStopHandoff,
  createSanitizedPollingMetadata,
  createStaleCompletionDiscardedPollingResult,
  createTerminalPollingResult,
  createUnavailablePollingResult,
  resolvePollingSuccessStatus
} from "./comment-translator-bounded-live-chat-polling-result-projection";
import type {
  CommentTranslatorBoundedLiveChatPollingTickInput,
  CommentTranslatorBoundedLiveChatPollingTickResult,
  CommentTranslatorBoundedLiveChatPollingUsage
} from "./comment-translator-bounded-live-chat-polling-types";

export async function readSerializedCommentTranslatorBoundedLiveChatPollingTick({
  activeSession,
  usage,
  adapter,
  nowMs,
  maxRecoverableRetries,
  generation,
  resetEpoch
}: CommentTranslatorBoundedLiveChatPollingTickInput & {
  readonly activeSession: NonNullable<CommentTranslatorBoundedLiveChatPollingTickInput["activeSession"]>;
  readonly maxRecoverableRetries: number;
  readonly generation: number;
  readonly resetEpoch: number;
}): Promise<CommentTranslatorBoundedLiveChatPollingTickResult> {
  const sessionReferenceId = activeSession.sessionReferenceId;
  const quotaStopReason = assessPollingTerminalStopReason({ activeSession, usage, nowMs });
  if (quotaStopReason) {
    pollingCoordinatorRegistry.clear(sessionReferenceId);
    return createQuotaBudgetStopHandoff(quotaStopReason);
  }
  const translatedMessagesPerMinute = usage.planEntitlement?.translatedMessagesPerMinute ?? 30;
  const pollingState = pollingCoordinatorRegistry.readPollingState(sessionReferenceId);
  if (pollingState?.terminal) {
    pollingCoordinatorRegistry.clear(sessionReferenceId);
    return createTerminalPollingResult({ state: pollingState, providerSignal: mapTerminalCodeToStopReason(pollingState.terminal.code), nowMs });
  }
  if (usage.translatedMessagesInCurrentMinute >= translatedMessagesPerMinute) {
    return enterOrReadRatePause({ sessionReferenceId, pollingState, usage, nowMs });
  }
  if (!pollingState) return createUnavailablePollingResult("unavailable-missing-server-only-polling-state");
  const currentPhase = pollingCoordinatorRegistry.readPhase(sessionReferenceId);
  const isRecoveryTick = currentPhase.activePhase === "rate-paused" || currentPhase.activePhase === "resyncing";
  if (isRecoveryTick) pollingCoordinatorRegistry.writePhase(sessionReferenceId, createCommentTranslatorPerMinuteResyncingProjection());
  if (nowMs < pollingState.nextPollAfterMs) {
    return {
      status: "skipped-not-due",
      providerAccess: "not-run",
      providerSignal: null,
      sanitizedPolling: createSanitizedPollingMetadata(pollingState, 0, nowMs, { pollTickStatus: "not-due" }),
      publicLaunchAllowed: false
    };
  }
  if (adapter.status !== "ready") {
    pollingCoordinatorRegistry.clear(sessionReferenceId);
    return createUnavailablePollingResult("unavailable-polling-runtime-not-approved");
  }
  const previousRetryCount = pollingState.retryCount;
  const pollingResult = await pollWithSanitizedRejection({ pollingState, adapter, nowMs });
  if (!pollingCoordinatorRegistry.isCompletionCurrent(sessionReferenceId, generation, resetEpoch)) {
    return createStaleCompletionDiscardedPollingResult();
  }
  pollingCoordinatorRegistry.writePollingState(sessionReferenceId, pollingResult.state);
  if (pollingResult.state.terminal) {
    pollingCoordinatorRegistry.clear(sessionReferenceId);
    return createTerminalPollingResult({ state: pollingResult.state, providerSignal: mapTerminalCodeToStopReason(pollingResult.state.terminal.code), nowMs });
  }
  if (pollingResult.state.retryCount > maxRecoverableRetries) {
    pollingCoordinatorRegistry.clear(sessionReferenceId);
    return createBoundedRetryExhaustedPollingResult({ state: pollingResult.state, returnedCommentCount: pollingResult.comments.length, nowMs });
  }
  if (pollingResult.state.retryCount > previousRetryCount) {
    return createPollingResultWithServerOnlyComments({
      status: "recoverable-backoff-scheduled",
      sanitizedPolling: createSanitizedPollingMetadata(pollingResult.state, pollingResult.comments.length, nowMs, { pollTickStatus: "recoverable" }),
      comments: []
    });
  }
  const cursorSelection = pollingCoordinatorRegistry.selectCommentsAfterCursorPrime(sessionReferenceId, pollingResult.comments);
  if (isRecoveryTick) pollingCoordinatorRegistry.writePhase(sessionReferenceId, createCommentTranslatorPerMinuteRunningProjection());
  const sanitizedPolling = createSanitizedPollingMetadata(pollingResult.state, pollingResult.comments.length, nowMs, {
    acceptedCount: cursorSelection.acceptedComments.length,
    duplicateSkippedCount: cursorSelection.duplicateSkippedCount,
    preStartSkippedCount: cursorSelection.preStartSkippedCount,
    pollTickStatus: pollingResult.comments.length > 0 ? "polled" : "empty"
  });
  return createPollingResultWithServerOnlyComments({
    status: resolvePollingSuccessStatus({ acceptedCount: cursorSelection.acceptedComments.length, preStartSkippedCount: cursorSelection.preStartSkippedCount }),
    sanitizedPolling,
    comments: cursorSelection.acceptedComments
  });
}

async function pollWithSanitizedRejection({
  pollingState,
  adapter,
  nowMs
}: {
  readonly pollingState: YouTubeLiveChatPollingRuntimeState;
  readonly adapter: Extract<CommentTranslatorBoundedLiveChatPollingTickInput["adapter"], { readonly status: "ready" }>;
  readonly nowMs: number;
}): Promise<YouTubeLiveChatPollingStepResult> {
  try {
    return await adapter.runtime.pollLiveChatOnce(pollingState);
  } catch (error: unknown) {
    if (error instanceof Error) void error;
    return advanceYouTubeLiveChatPollingState(pollingState, {
      type: "recoverable-error", code: "temporaryUnavailable", receivedAtMs: nowMs, pollingIntervalMillis: null, retryAfterMs: null
    });
  }
}

function enterOrReadRatePause({
  sessionReferenceId,
  pollingState,
  usage,
  nowMs
}: {
  readonly sessionReferenceId: string;
  readonly pollingState: YouTubeLiveChatPollingRuntimeState | undefined;
  readonly usage: CommentTranslatorBoundedLiveChatPollingUsage;
  readonly nowMs: number;
}): CommentTranslatorBoundedLiveChatPollingTickResult {
  const pauseResolution = resolveCommentTranslatorPerMinuteRatePause({
    translatedMessagesInCurrentMinute: usage.translatedMessagesInCurrentMinute,
    translatedMessagesPerMinute: usage.planEntitlement?.translatedMessagesPerMinute ?? 30,
    translatedMessageCapacityAvailableAtMs: usage.translatedMessageCapacityAvailableAtMs ?? null,
    nowMs
  });
  if (pauseResolution.status === "fail-closed") {
    pollingCoordinatorRegistry.clear(sessionReferenceId);
    return createQuotaBudgetStopHandoff(pauseResolution.stopReason);
  }
  const storedPhase = pollingCoordinatorRegistry.readPhase(sessionReferenceId);
  if (!pollingState) {
    pollingCoordinatorRegistry.writePhase(sessionReferenceId, pauseResolution.projection);
    return {
      status: "rate-limit-paused",
      providerAccess: "not-run",
      providerSignal: null,
      phaseProjection: pauseResolution.projection,
      sanitizedPolling: createMissingStateRatePauseSanitizedMetadata(),
      publicLaunchAllowed: false
    };
  }
  let pausedPollingState = pollingState;
  if (storedPhase.activePhase !== "rate-paused") {
    pausedPollingState = createInitialYouTubeLiveChatPollingState({ liveChatId: pollingState.liveChatId, nowMs });
    pollingCoordinatorRegistry.replacePollingStateAndResetCursor(sessionReferenceId, pausedPollingState);
  }
  pollingCoordinatorRegistry.writePhase(sessionReferenceId, pauseResolution.projection);
  return {
    status: "rate-limit-paused",
    providerAccess: "not-run",
    providerSignal: null,
    phaseProjection: pauseResolution.projection,
    sanitizedPolling: createSanitizedPollingMetadata(pausedPollingState, 0, nowMs, { acceptedCount: 0, pollTickStatus: "not-due" }),
    publicLaunchAllowed: false
  };
}
