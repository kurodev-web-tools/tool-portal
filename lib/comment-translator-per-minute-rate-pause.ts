import "server-only";

export type CommentTranslatorPerMinuteRatePauseProjection = {
  readonly activePhase: "running" | "rate-paused" | "resyncing";
  readonly ratePauseReason: "translated-message-cap" | null;
  readonly retryAfterSeconds: number | null;
  readonly automaticResumeExpected: boolean;
};

export type CommentTranslatorPerMinuteRatePauseResolution =
  | {
      readonly status: "ready";
      readonly projection: CommentTranslatorPerMinuteRatePauseProjection;
    }
  | {
      readonly status: "fail-closed";
      readonly stopReason: "global-budget-stop";
    };

type CommentTranslatorPerMinuteRatePauseInput = {
  readonly translatedMessagesInCurrentMinute: number;
  readonly translatedMessagesPerMinute: number;
  readonly translatedMessageCapacityAvailableAtMs: number | null;
  readonly nowMs: number;
};

type CommentTranslatorPerMinuteRatePausedProjectionInput = {
  readonly capacityAvailableAtMs: number;
  readonly nowMs: number;
};

function resolveRetryAfterSeconds({
  capacityAvailableAtMs,
  nowMs
}: CommentTranslatorPerMinuteRatePausedProjectionInput): number | null {
  if (!Number.isFinite(capacityAvailableAtMs) || !Number.isFinite(nowMs)) {
    return null;
  }

  const retryAfterSeconds = Math.max(0, Math.ceil((capacityAvailableAtMs - nowMs) / 1_000));
  return Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : null;
}

function createRatePausedProjection(
  retryAfterSeconds: number
): CommentTranslatorPerMinuteRatePauseProjection {
  return {
    activePhase: "rate-paused",
    ratePauseReason: "translated-message-cap",
    retryAfterSeconds,
    automaticResumeExpected: true
  };
}

export function createCommentTranslatorPerMinuteRunningProjection(): CommentTranslatorPerMinuteRatePauseProjection {
  return {
    activePhase: "running",
    ratePauseReason: null,
    retryAfterSeconds: null,
    automaticResumeExpected: false
  };
}

export function createCommentTranslatorPerMinuteRatePausedProjection({
  capacityAvailableAtMs,
  nowMs
}: CommentTranslatorPerMinuteRatePausedProjectionInput): CommentTranslatorPerMinuteRatePauseProjection {
  const retryAfterSeconds = resolveRetryAfterSeconds({ capacityAvailableAtMs, nowMs });
  if (retryAfterSeconds === null) {
    throw new RangeError("Per-minute rate-pause countdown authority must resolve to finite seconds");
  }

  return createRatePausedProjection(retryAfterSeconds);
}

export function createCommentTranslatorPerMinuteResyncingProjection(): CommentTranslatorPerMinuteRatePauseProjection {
  return {
    activePhase: "resyncing",
    ratePauseReason: "translated-message-cap",
    retryAfterSeconds: null,
    automaticResumeExpected: true
  };
}

export function resolveCommentTranslatorPerMinuteRatePause({
  translatedMessagesInCurrentMinute,
  translatedMessagesPerMinute,
  translatedMessageCapacityAvailableAtMs,
  nowMs
}: CommentTranslatorPerMinuteRatePauseInput): CommentTranslatorPerMinuteRatePauseResolution {
  if (translatedMessagesInCurrentMinute < translatedMessagesPerMinute) {
    return {
      status: "ready",
      projection: createCommentTranslatorPerMinuteRunningProjection()
    };
  }

  if (translatedMessageCapacityAvailableAtMs === null) {
    return {
      status: "fail-closed",
      stopReason: "global-budget-stop"
    };
  }

  const retryAfterSeconds = resolveRetryAfterSeconds({
    capacityAvailableAtMs: translatedMessageCapacityAvailableAtMs,
    nowMs
  });
  if (retryAfterSeconds === null) {
    return {
      status: "fail-closed",
      stopReason: "global-budget-stop"
    };
  }

  return {
    status: "ready",
    projection: createRatePausedProjection(retryAfterSeconds)
  };
}
