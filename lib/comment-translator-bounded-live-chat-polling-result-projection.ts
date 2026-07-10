import "server-only";

import type { YouTubeLiveChatPollingRuntimeState } from "./comment-translator-youtube-runtime-foundation";
import type { YouTubeProviderSafeCommentPayload } from "./comment-translator-youtube-input-boundary";
import type { CommentTranslatorSessionStopReason } from "./comment-translator-session-runtime";
import { resolveCommentTranslatorPollingTerminalReasonUxCode } from "./comment-translator-start-stop-reason-ux";
import { resolvePollingQuotaStopReasonUxCode } from "./comment-translator-bounded-live-chat-polling-terminal-policy";
import type {
  CommentTranslatorBoundedLiveChatPollingSanitizedMetadata,
  CommentTranslatorBoundedLiveChatPollingTickResult,
  CommentTranslatorBoundedLiveChatPollingTickWithServerOnlyComments,
  CommentTranslatorPollingCommentResultStatus,
  CommentTranslatorPollingQuotaStopReason,
  CommentTranslatorPollingTerminalStopReason
} from "./comment-translator-bounded-live-chat-polling-types";

export function createStaleCompletionDiscardedPollingResult(): Extract<CommentTranslatorBoundedLiveChatPollingTickResult, { readonly status: "stale-completion-discarded" }> {
  return { status: "stale-completion-discarded", providerAccess: "deterministic-local-adapter-only", providerSignal: null, publicLaunchAllowed: false };
}

export function createSkippedPollingResult(
  status: "skipped-no-active-session" | "skipped-start-intent-awaiting-active-seed" | "skipped-stop-intent"
): Extract<CommentTranslatorBoundedLiveChatPollingTickResult, { readonly status: "skipped-no-active-session" | "skipped-start-intent-awaiting-active-seed" | "skipped-stop-intent" }> {
  return { status, providerAccess: "not-run", providerSignal: null, publicLaunchAllowed: false };
}

export function createUnavailablePollingResult(
  status: "unavailable-missing-server-only-polling-state" | "unavailable-polling-runtime-not-approved"
): Extract<CommentTranslatorBoundedLiveChatPollingTickResult, { readonly status: "unavailable-missing-server-only-polling-state" | "unavailable-polling-runtime-not-approved" }> {
  return {
    status,
    providerAccess: "not-run",
    providerSignal: "stream-unavailable",
    reasonUxCode: status === "unavailable-polling-runtime-not-approved" ? "translation-provider-unavailable" : "live-target-unavailable",
    clientReadableDetail: "sanitized-stop-reason-only",
    publicLaunchAllowed: false
  };
}

export function createTerminalPollingResult({
  state,
  providerSignal,
  nowMs
}: {
  readonly state: YouTubeLiveChatPollingRuntimeState;
  readonly providerSignal: CommentTranslatorPollingTerminalStopReason;
  readonly nowMs: number;
}): CommentTranslatorBoundedLiveChatPollingTickResult {
  return {
    status: "terminal-state-handoff",
    providerAccess: "deterministic-local-adapter-only",
    providerSignal,
    reasonUxCode: resolveCommentTranslatorPollingTerminalReasonUxCode({ code: state.terminal?.code ?? "unknown-terminal-provider-error" }),
    sanitizedPolling: createSanitizedPollingMetadata(state, 0, nowMs, { pollTickStatus: "terminal", stopReason: providerSignal }),
    clientReadableDetail: "sanitized-stop-reason-only",
    publicLaunchAllowed: false
  };
}

export function createBoundedRetryExhaustedPollingResult({
  state,
  returnedCommentCount,
  nowMs
}: {
  readonly state: YouTubeLiveChatPollingRuntimeState;
  readonly returnedCommentCount: number;
  readonly nowMs: number;
}): CommentTranslatorBoundedLiveChatPollingTickResult {
  return {
    status: "bounded-retry-exhausted",
    providerAccess: "deterministic-local-adapter-only",
    providerSignal: "terminal-provider-error",
    reasonUxCode: "translation-provider-error",
    sanitizedPolling: createSanitizedPollingMetadata(state, returnedCommentCount, nowMs, { pollTickStatus: "terminal", stopReason: "terminal-provider-error" }),
    clientReadableDetail: "sanitized-stop-reason-only",
    publicLaunchAllowed: false
  };
}

export function createSanitizedPollingMetadata(
  state: YouTubeLiveChatPollingRuntimeState,
  returnedCommentCount: number,
  nowMs: number,
  overrides: {
    readonly acceptedCount?: number;
    readonly duplicateSkippedCount?: number;
    readonly preStartSkippedCount?: number;
    readonly pollTickStatus?: CommentTranslatorBoundedLiveChatPollingSanitizedMetadata["pollTickStatus"];
    readonly stopReason?: CommentTranslatorSessionStopReason | null;
  } = {}
): CommentTranslatorBoundedLiveChatPollingSanitizedMetadata {
  const acceptedCount = overrides.acceptedCount ?? returnedCommentCount;
  const duplicateSkippedCount = overrides.duplicateSkippedCount ?? 0;
  const preStartSkippedCount = overrides.preStartSkippedCount ?? 0;
  const skipReasonCounts = duplicateSkippedCount > 0 ? [{ reason: "duplicate" as const, count: duplicateSkippedCount }] : [];
  const pollingIntervalMillis = state.terminal ? null : Math.max(0, state.nextPollAfterMs - nowMs);
  return {
    pollTickStatus: overrides.pollTickStatus ?? (returnedCommentCount > 0 ? "polled" : "empty"),
    nextPageToken: state.nextPageToken ? "present" : "absent",
    pollingIntervalMillis,
    returnedCommentCount,
    returnedCount: returnedCommentCount,
    acceptedCount,
    skippedCount: Math.max(0, returnedCommentCount - acceptedCount),
    preStartSkippedCount,
    skipReasonCounts,
    nextPollDue: pollingIntervalMillis === 0 ? "due" : "waiting",
    stopReason: overrides.stopReason ?? null,
    retryCount: state.retryCount,
    rawComments: "not-returned-by-design",
    serverOnlyCursor: "not-returned-by-design",
    liveTarget: "not-returned-by-design",
    providerTargetMetadata: "forbidden"
  };
}

export function createMissingStateRatePauseSanitizedMetadata(): CommentTranslatorBoundedLiveChatPollingSanitizedMetadata {
  return {
    pollTickStatus: "not-due",
    nextPageToken: "absent",
    pollingIntervalMillis: null,
    returnedCommentCount: 0,
    returnedCount: 0,
    acceptedCount: 0,
    skippedCount: 0,
    preStartSkippedCount: 0,
    skipReasonCounts: [],
    nextPollDue: "waiting",
    stopReason: null,
    retryCount: 0,
    rawComments: "not-returned-by-design",
    serverOnlyCursor: "not-returned-by-design",
    liveTarget: "not-returned-by-design",
    providerTargetMetadata: "forbidden"
  };
}

const serverOnlyCommentsByResult = new WeakMap<object, readonly YouTubeProviderSafeCommentPayload[]>();

class ServerOnlyCommentsPollingResult implements CommentTranslatorBoundedLiveChatPollingTickWithServerOnlyComments {
  readonly status: CommentTranslatorPollingCommentResultStatus;
  readonly providerAccess = "deterministic-local-adapter-only" as const;
  readonly providerSignal = null;
  readonly sanitizedPolling: CommentTranslatorBoundedLiveChatPollingSanitizedMetadata;
  readonly publicLaunchAllowed = false as const;
  constructor(input: { readonly status: CommentTranslatorPollingCommentResultStatus; readonly sanitizedPolling: CommentTranslatorBoundedLiveChatPollingSanitizedMetadata; readonly comments: readonly YouTubeProviderSafeCommentPayload[] }) {
    this.status = input.status;
    this.sanitizedPolling = input.sanitizedPolling;
    serverOnlyCommentsByResult.set(this, input.comments);
    Object.defineProperty(this, "serverOnlyCommentsForTranslation", { value: input.comments, enumerable: false, configurable: false, writable: false });
  }

  get serverOnlyCommentsForTranslation(): readonly YouTubeProviderSafeCommentPayload[] {
    return serverOnlyCommentsByResult.get(this) ?? [];
  }
}

export function createPollingResultWithServerOnlyComments(input: {
  readonly status: CommentTranslatorPollingCommentResultStatus;
  readonly sanitizedPolling: CommentTranslatorBoundedLiveChatPollingSanitizedMetadata;
  readonly comments: readonly YouTubeProviderSafeCommentPayload[];
}): CommentTranslatorBoundedLiveChatPollingTickWithServerOnlyComments {
  return new ServerOnlyCommentsPollingResult(input);
}

export function resolvePollingSuccessStatus(input: { readonly acceptedCount: number; readonly preStartSkippedCount: number }): CommentTranslatorPollingCommentResultStatus {
  if (input.preStartSkippedCount > 0) return "cursor-primed-existing-comments-skipped";
  if (input.acceptedCount > 0) return "polled-comments-available";
  return "empty-chat-waiting";
}

export function createQuotaBudgetStopHandoff(
  stopReason: CommentTranslatorPollingQuotaStopReason
): Extract<CommentTranslatorBoundedLiveChatPollingTickResult, { readonly status: "skipped-quota-budget-stop-handoff" }> {
  return {
    status: "skipped-quota-budget-stop-handoff",
    providerAccess: "not-run",
    providerSignal: stopReason,
    stopReason,
    reasonUxCode: resolvePollingQuotaStopReasonUxCode(stopReason),
    publicLaunchAllowed: false
  };
}
