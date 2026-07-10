import "server-only";

import type { YouTubeLiveChatPollingRuntimeState } from "./comment-translator-youtube-runtime-foundation";
import type { YouTubeProviderSafeCommentPayload } from "./comment-translator-youtube-input-boundary";
import {
  createCommentTranslatorPerMinuteRunningProjection,
  type CommentTranslatorPerMinuteRatePauseProjection,
  type CommentTranslatorPerMinuteRatePauseResolution
} from "./comment-translator-per-minute-rate-pause";
import type { CommentTranslatorBoundedLiveChatPollingTickResult } from "./comment-translator-bounded-live-chat-polling-types";

type CursorSelection = {
  readonly acceptedComments: readonly YouTubeProviderSafeCommentPayload[];
  readonly duplicateSkippedCount: number;
  readonly preStartSkippedCount: number;
};

class CommentTranslatorBoundedLiveChatPollingRegistry {
  private readonly pollingState = new Map<string, YouTubeLiveChatPollingRuntimeState>();
  private readonly cursorPrimed = new Set<string>();
  private readonly seenCommentIds = new Map<string, Set<string>>();
  private readonly inFlight = new Map<string, Promise<CommentTranslatorBoundedLiveChatPollingTickResult>>();
  private readonly generation = new Map<string, number>();
  private readonly phaseResolution = new Map<string, CommentTranslatorPerMinuteRatePauseResolution>();
  private resetEpoch = 0;

  seed(sessionReferenceId: string, state: YouTubeLiveChatPollingRuntimeState): void {
    this.pollingState.set(sessionReferenceId, state);
    this.cursorPrimed.delete(sessionReferenceId);
    this.seenCommentIds.set(sessionReferenceId, new Set());
    this.advanceGeneration(sessionReferenceId);
    this.writePhase(sessionReferenceId, createCommentTranslatorPerMinuteRunningProjection());
  }

  readPollingState(sessionReferenceId: string): YouTubeLiveChatPollingRuntimeState | undefined {
    return this.pollingState.get(sessionReferenceId);
  }

  writePollingState(sessionReferenceId: string, state: YouTubeLiveChatPollingRuntimeState): void {
    this.pollingState.set(sessionReferenceId, state);
  }

  replacePollingStateAndResetCursor(sessionReferenceId: string, state: YouTubeLiveChatPollingRuntimeState): void {
    this.pollingState.set(sessionReferenceId, state);
    this.cursorPrimed.delete(sessionReferenceId);
    this.seenCommentIds.delete(sessionReferenceId);
  }

  readPhase(sessionReferenceId: string): CommentTranslatorPerMinuteRatePauseProjection {
    const resolution = this.phaseResolution.get(sessionReferenceId);
    return resolution?.status === "ready"
      ? resolution.projection
      : createCommentTranslatorPerMinuteRunningProjection();
  }

  readPhaseResolution(sessionReferenceId: string): CommentTranslatorPerMinuteRatePauseResolution {
    return this.phaseResolution.get(sessionReferenceId) ?? {
      status: "fail-closed",
      stopReason: "global-budget-stop"
    };
  }

  readStoredPhaseResolution(sessionReferenceId: string): CommentTranslatorPerMinuteRatePauseResolution | undefined {
    return this.phaseResolution.get(sessionReferenceId);
  }

  writePhase(sessionReferenceId: string, phase: CommentTranslatorPerMinuteRatePauseProjection): void {
    this.phaseResolution.set(sessionReferenceId, { status: "ready", projection: phase });
  }

  readInFlight(sessionReferenceId: string): Promise<CommentTranslatorBoundedLiveChatPollingTickResult> | undefined {
    return this.inFlight.get(sessionReferenceId);
  }

  writeInFlight(sessionReferenceId: string, tick: Promise<CommentTranslatorBoundedLiveChatPollingTickResult>): void {
    this.inFlight.set(sessionReferenceId, tick);
  }

  removeMatchingInFlight(sessionReferenceId: string, tick: Promise<CommentTranslatorBoundedLiveChatPollingTickResult>): void {
    if (this.inFlight.get(sessionReferenceId) !== tick) return;
    this.inFlight.delete(sessionReferenceId);
    this.deleteGenerationWhenLifecycleIsEmpty(sessionReferenceId);
  }

  readGeneration(sessionReferenceId: string): number {
    return this.generation.get(sessionReferenceId) ?? 0;
  }

  readResetEpoch(): number {
    return this.resetEpoch;
  }

  isCompletionCurrent(sessionReferenceId: string, generation: number, resetEpoch: number): boolean {
    return this.resetEpoch === resetEpoch && this.readGeneration(sessionReferenceId) === generation;
  }

  clear(sessionReferenceId: string | null | undefined): void {
    if (!sessionReferenceId) return;
    this.advanceGeneration(sessionReferenceId);
    this.pollingState.delete(sessionReferenceId);
    this.cursorPrimed.delete(sessionReferenceId);
    this.seenCommentIds.delete(sessionReferenceId);
    this.phaseResolution.delete(sessionReferenceId);
    this.deleteGenerationWhenLifecycleIsEmpty(sessionReferenceId);
  }

  resetForTests(): void {
    this.resetEpoch += 1;
    this.inFlight.clear();
    this.generation.clear();
    this.pollingState.clear();
    this.cursorPrimed.clear();
    this.seenCommentIds.clear();
    this.phaseResolution.clear();
  }

  selectCommentsAfterCursorPrime(sessionReferenceId: string, comments: readonly YouTubeProviderSafeCommentPayload[]): CursorSelection {
    const seen = this.readSeenCommentIds(sessionReferenceId);
    if (!this.cursorPrimed.has(sessionReferenceId)) {
      for (const comment of comments) seen.add(comment.commentId);
      this.cursorPrimed.add(sessionReferenceId);
      return { acceptedComments: [], duplicateSkippedCount: 0, preStartSkippedCount: comments.length };
    }
    const acceptedComments: YouTubeProviderSafeCommentPayload[] = [];
    let duplicateSkippedCount = 0;
    for (const comment of comments) {
      if (seen.has(comment.commentId)) {
        duplicateSkippedCount += 1;
      } else {
        seen.add(comment.commentId);
        acceptedComments.push(comment);
      }
    }
    return { acceptedComments, duplicateSkippedCount, preStartSkippedCount: 0 };
  }

  readEntryCountsForTests(): { readonly generation: number; readonly pollingState: number; readonly phase: number; readonly inFlight: number } {
    return { generation: this.generation.size, pollingState: this.pollingState.size, phase: this.phaseResolution.size, inFlight: this.inFlight.size };
  }

  private advanceGeneration(sessionReferenceId: string): void {
    this.generation.set(sessionReferenceId, this.readGeneration(sessionReferenceId) + 1);
  }

  private deleteGenerationWhenLifecycleIsEmpty(sessionReferenceId: string): void {
    if (this.pollingState.has(sessionReferenceId) || this.phaseResolution.has(sessionReferenceId) || this.inFlight.has(sessionReferenceId)) return;
    this.generation.delete(sessionReferenceId);
  }

  private readSeenCommentIds(sessionReferenceId: string): Set<string> {
    const existing = this.seenCommentIds.get(sessionReferenceId);
    if (existing) return existing;
    const seen = new Set<string>();
    this.seenCommentIds.set(sessionReferenceId, seen);
    return seen;
  }
}

export const pollingCoordinatorRegistry = new CommentTranslatorBoundedLiveChatPollingRegistry();
