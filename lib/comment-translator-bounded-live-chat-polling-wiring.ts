import "server-only";

import { createInitialYouTubeLiveChatPollingState } from "./comment-translator-youtube-runtime-foundation";
import type { CommentTranslatorSessionBrowserSafeState } from "./comment-translator-session-runtime";
import type { CommentTranslatorServerOnlyLiveChatTargetLookupResult } from "./comment-translator-server-only-live-chat-target-lookup";
import {
  createCommentTranslatorPerMinuteResyncingProjection,
  createCommentTranslatorPerMinuteRunningProjection,
  resolveCommentTranslatorPerMinuteRatePause,
  type CommentTranslatorPerMinuteRatePauseProjection,
  type CommentTranslatorPerMinuteRatePauseResolution
} from "./comment-translator-per-minute-rate-pause";
import { pollingCoordinatorRegistry } from "./comment-translator-bounded-live-chat-polling-registry";
import { createSkippedPollingResult } from "./comment-translator-bounded-live-chat-polling-result-projection";
import { readSerializedCommentTranslatorBoundedLiveChatPollingTick } from "./comment-translator-bounded-live-chat-polling-transition";
import type {
  CommentTranslatorBoundedLiveChatPollingSeedResult,
  CommentTranslatorBoundedLiveChatPollingTickInput,
  CommentTranslatorBoundedLiveChatPollingTickResult,
  CommentTranslatorBoundedLiveChatPollingUsage
} from "./comment-translator-bounded-live-chat-polling-types";

export {
  commentTranslatorBoundedLiveChatPollingWiringContract,
  createDeterministicCommentTranslatorBoundedLiveChatPollingAdapter,
  createUnavailableCommentTranslatorBoundedLiveChatPollingAdapter
} from "./comment-translator-bounded-live-chat-polling-static-wiring";
export type {
  CommentTranslatorBoundedLiveChatPollingAdapter,
  CommentTranslatorBoundedLiveChatPollingSanitizedMetadata,
  CommentTranslatorBoundedLiveChatPollingSeedResult,
  CommentTranslatorBoundedLiveChatPollingTickResult
} from "./comment-translator-bounded-live-chat-polling-types";

export function seedCommentTranslatorBoundedLiveChatPollingStateForActiveSession({
  state,
  liveChatTargetReadiness,
  nowMs
}: {
  readonly state: CommentTranslatorSessionBrowserSafeState;
  readonly liveChatTargetReadiness: CommentTranslatorServerOnlyLiveChatTargetLookupResult;
  readonly nowMs: number;
}): CommentTranslatorBoundedLiveChatPollingSeedResult {
  if (state.status !== "active") {
    return { status: "skipped-non-active-session", liveTargetHandling: "not-stored", providerPollingExecution: "not-run-in-this-thread", publicLaunchAllowed: false };
  }
  if (liveChatTargetReadiness.status !== "ready") {
    return { status: "skipped-target-not-ready", liveTargetHandling: "not-stored", providerPollingExecution: "not-run-in-this-thread", publicLaunchAllowed: false };
  }
  pollingCoordinatorRegistry.seed(
    state.sessionReferenceId,
    createInitialYouTubeLiveChatPollingState({ liveChatId: liveChatTargetReadiness.serverOnlyTarget.liveChatId, nowMs })
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

export function readCommentTranslatorBoundedLiveChatPollingTick({
  intent,
  activeSession,
  usage,
  adapter,
  nowMs,
  maxRecoverableRetries = 3
}: CommentTranslatorBoundedLiveChatPollingTickInput): Promise<CommentTranslatorBoundedLiveChatPollingTickResult> {
  if (!activeSession) return Promise.resolve(createSkippedPollingResult("skipped-no-active-session"));
  if (intent === "start") return Promise.resolve(createSkippedPollingResult("skipped-start-intent-awaiting-active-seed"));
  if (intent === "stop") {
    pollingCoordinatorRegistry.clear(activeSession.sessionReferenceId);
    return Promise.resolve(createSkippedPollingResult("skipped-stop-intent"));
  }
  const sessionReferenceId = activeSession.sessionReferenceId;
  const existingTick = pollingCoordinatorRegistry.readInFlight(sessionReferenceId);
  if (existingTick) return existingTick;
  const pollingTick = readSerializedCommentTranslatorBoundedLiveChatPollingTick({
    intent,
    activeSession,
    usage,
    adapter,
    nowMs,
    maxRecoverableRetries,
    generation: pollingCoordinatorRegistry.readGeneration(sessionReferenceId),
    resetEpoch: pollingCoordinatorRegistry.readResetEpoch()
  });
  pollingCoordinatorRegistry.writeInFlight(sessionReferenceId, pollingTick);
  const removeMatchingTick = () => pollingCoordinatorRegistry.removeMatchingInFlight(sessionReferenceId, pollingTick);
  void pollingTick.then(removeMatchingTick, removeMatchingTick);
  return pollingTick;
}

export function clearCommentTranslatorBoundedLiveChatPollingState(sessionReferenceId: string | null | undefined): void {
  pollingCoordinatorRegistry.clear(sessionReferenceId);
}

export function readCommentTranslatorBoundedLiveChatPollingPhaseProjection(
  sessionReferenceId: string | null | undefined
): CommentTranslatorPerMinuteRatePauseProjection {
  if (!sessionReferenceId) return createCommentTranslatorPerMinuteRunningProjection();
  const projection = pollingCoordinatorRegistry.readPhase(sessionReferenceId);
  return {
    activePhase: projection.activePhase,
    ratePauseReason: projection.ratePauseReason,
    retryAfterSeconds: projection.retryAfterSeconds,
    automaticResumeExpected: projection.automaticResumeExpected
  };
}

export function readCommentTranslatorBoundedLiveChatPollingPhaseResolution(
  sessionReferenceId: string | null | undefined
): CommentTranslatorPerMinuteRatePauseResolution {
  if (!sessionReferenceId) {
    return {
      status: "ready",
      projection: createCommentTranslatorPerMinuteRunningProjection()
    };
  }
  return pollingCoordinatorRegistry.readPhaseResolution(sessionReferenceId);
}

export function readCommentTranslatorBoundedLiveChatPollingPhaseResolutionForUsage({
  sessionReferenceId,
  usage,
  nowMs
}: {
  readonly sessionReferenceId: string | null | undefined;
  readonly usage: CommentTranslatorBoundedLiveChatPollingUsage;
  readonly nowMs: number;
}): CommentTranslatorPerMinuteRatePauseResolution {
  if (!sessionReferenceId) {
    return { status: "ready", projection: createCommentTranslatorPerMinuteRunningProjection() };
  }
  const storedResolution = pollingCoordinatorRegistry.readStoredPhaseResolution(sessionReferenceId);
  if (storedResolution) return storedResolution;
  const translatedMessagesPerMinute = usage.planEntitlement?.translatedMessagesPerMinute ?? 30;
  if (usage.translatedMessagesInCurrentMinute < translatedMessagesPerMinute) {
    return { status: "ready", projection: createCommentTranslatorPerMinuteResyncingProjection() };
  }
  return resolveCommentTranslatorPerMinuteRatePause({
    translatedMessagesInCurrentMinute: usage.translatedMessagesInCurrentMinute,
    translatedMessagesPerMinute,
    translatedMessageCapacityAvailableAtMs: usage.translatedMessageCapacityAvailableAtMs ?? null,
    nowMs
  });
}

export function resetCommentTranslatorBoundedLiveChatPollingStateForTests(): void {
  pollingCoordinatorRegistry.resetForTests();
}
