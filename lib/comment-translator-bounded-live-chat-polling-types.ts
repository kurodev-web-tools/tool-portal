import "server-only";

import type { YouTubeLiveChatRuntimeAdapter } from "./comment-translator-youtube-runtime-foundation";
import type { YouTubeProviderSafeCommentPayload } from "./comment-translator-youtube-input-boundary";
import type {
  CommentTranslatorActiveSessionRecord,
  CommentTranslatorSessionCommandIntent,
  CommentTranslatorSessionStopReason,
  CommentTranslatorSessionUsageSnapshot
} from "./comment-translator-session-runtime";
import type { CommentTranslatorStartStopReasonUxCode } from "./comment-translator-start-stop-reason-ux";
import type { CommentTranslatorPerMinuteRatePauseProjection } from "./comment-translator-per-minute-rate-pause";

export type CommentTranslatorBoundedLiveChatPollingAdapter =
  | {
      readonly status: "ready";
      readonly providerAccess: "deterministic-local-adapter-only";
      readonly runtime: Pick<YouTubeLiveChatRuntimeAdapter, "pollLiveChatOnce">;
    }
  | {
      readonly status: "unavailable";
      readonly providerAccess: "not-run";
      readonly reason: "live-provider-polling-not-approved" | "polling-runtime-not-wired";
    };

export type CommentTranslatorBoundedLiveChatPollingSanitizedMetadata = {
  readonly pollTickStatus: "polled" | "empty" | "not-due" | "recoverable" | "terminal" | "missing-state";
  readonly nextPageToken: "present" | "absent";
  readonly pollingIntervalMillis: number | null;
  readonly returnedCommentCount: number;
  readonly returnedCount: number;
  readonly acceptedCount: number;
  readonly skippedCount: number;
  readonly preStartSkippedCount: number;
  readonly skipReasonCounts: readonly { readonly reason: "duplicate"; readonly count: number }[];
  readonly nextPollDue: "due" | "waiting";
  readonly stopReason: CommentTranslatorSessionStopReason | null;
  readonly retryCount: number;
  readonly rawComments: "not-returned-by-design";
  readonly serverOnlyCursor: "not-returned-by-design";
  readonly liveTarget: "not-returned-by-design";
  readonly providerTargetMetadata: "forbidden";
};

export type CommentTranslatorPollingCommentResultStatus =
  | "empty-chat-waiting"
  | "polled-comments-available"
  | "cursor-primed-existing-comments-skipped"
  | "recoverable-backoff-scheduled";

export type CommentTranslatorPollingQuotaStopReason = Extract<
  CommentTranslatorSessionStopReason,
  | "missing-heartbeat"
  | "daily-time-limit"
  | "session-time-limit"
  | "translated-message-cap"
  | "provider-quota-stop"
  | "global-budget-stop"
  | "ai-budget-stop"
  | "translation-provider-limit"
  | "paid-authority-unreadable"
  | "paid-character-quota-stop"
  | "paid-individual-cost-stop"
  | "paid-global-cost-stop"
>;

export type CommentTranslatorPollingTerminalStopReason = Extract<
  CommentTranslatorSessionStopReason,
  "stream-ended" | "stream-unavailable" | "terminal-provider-error"
>;

export type CommentTranslatorBoundedLiveChatPollingTickResult =
  | {
      readonly status: "skipped-no-active-session" | "skipped-start-intent-awaiting-active-seed" | "skipped-stop-intent";
      readonly providerAccess: "not-run";
      readonly providerSignal: null;
      readonly publicLaunchAllowed: false;
    }
  | {
      readonly status: "skipped-not-due";
      readonly providerAccess: "not-run";
      readonly providerSignal: null;
      readonly sanitizedPolling: CommentTranslatorBoundedLiveChatPollingSanitizedMetadata;
      readonly publicLaunchAllowed: false;
    }
  | {
      readonly status: "rate-limit-paused";
      readonly providerAccess: "not-run";
      readonly providerSignal: null;
      readonly phaseProjection: CommentTranslatorPerMinuteRatePauseProjection;
      readonly sanitizedPolling: CommentTranslatorBoundedLiveChatPollingSanitizedMetadata;
      readonly publicLaunchAllowed: false;
    }
  | {
      readonly status: "stale-completion-discarded";
      readonly providerAccess: "deterministic-local-adapter-only";
      readonly providerSignal: null;
      readonly publicLaunchAllowed: false;
    }
  | {
      readonly status: "skipped-quota-budget-stop-handoff";
      readonly providerAccess: "not-run";
      readonly providerSignal: CommentTranslatorPollingQuotaStopReason;
      readonly stopReason: CommentTranslatorPollingQuotaStopReason;
      readonly reasonUxCode: CommentTranslatorStartStopReasonUxCode;
      readonly nextResetAtIso?: string;
      readonly publicLaunchAllowed: false;
    }
  | {
      readonly status: "unavailable-missing-server-only-polling-state" | "unavailable-polling-runtime-not-approved";
      readonly providerAccess: "not-run";
      readonly providerSignal: "stream-unavailable";
      readonly reasonUxCode: CommentTranslatorStartStopReasonUxCode;
      readonly clientReadableDetail: "sanitized-stop-reason-only";
      readonly publicLaunchAllowed: false;
    }
  | {
      readonly status: CommentTranslatorPollingCommentResultStatus;
      readonly providerAccess: "deterministic-local-adapter-only";
      readonly providerSignal: null;
      readonly sanitizedPolling: CommentTranslatorBoundedLiveChatPollingSanitizedMetadata;
      readonly serverOnlyCommentsForTranslation: readonly YouTubeProviderSafeCommentPayload[];
      readonly publicLaunchAllowed: false;
    }
  | {
      readonly status: "terminal-state-handoff" | "bounded-retry-exhausted";
      readonly providerAccess: "deterministic-local-adapter-only";
      readonly providerSignal: CommentTranslatorPollingTerminalStopReason;
      readonly reasonUxCode: CommentTranslatorStartStopReasonUxCode;
      readonly sanitizedPolling: CommentTranslatorBoundedLiveChatPollingSanitizedMetadata;
      readonly clientReadableDetail: "sanitized-stop-reason-only";
      readonly publicLaunchAllowed: false;
    };

export type CommentTranslatorBoundedLiveChatPollingTickWithServerOnlyComments = Extract<
  CommentTranslatorBoundedLiveChatPollingTickResult,
  { readonly status: CommentTranslatorPollingCommentResultStatus }
>;

export type CommentTranslatorBoundedLiveChatPollingSeedResult =
  | {
      readonly status: "seeded";
      readonly liveTargetHandling: "server-only-active-session-state";
      readonly nextPageToken: "absent";
      readonly providerPollingExecution: "not-run-in-this-thread";
      readonly clientReadableTargetMetadata: "forbidden";
      readonly publicLaunchAllowed: false;
    }
  | {
      readonly status: "skipped-non-active-session" | "skipped-target-not-ready";
      readonly liveTargetHandling: "not-stored";
      readonly providerPollingExecution: "not-run-in-this-thread";
      readonly publicLaunchAllowed: false;
    };

export type CommentTranslatorBoundedLiveChatPollingUsage = CommentTranslatorSessionUsageSnapshot & {
  readonly translatedMessageCapacityAvailableAtMs?: number | null;
};

export type CommentTranslatorBoundedLiveChatPollingTickInput = {
  readonly intent: CommentTranslatorSessionCommandIntent;
  readonly activeSession: CommentTranslatorActiveSessionRecord | null;
  readonly usage: CommentTranslatorBoundedLiveChatPollingUsage;
  readonly adapter: CommentTranslatorBoundedLiveChatPollingAdapter;
  readonly nowMs: number;
  readonly maxRecoverableRetries?: number;
};
