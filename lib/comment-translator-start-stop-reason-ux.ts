export type CommentTranslatorStartStopReasonUxCode =
  | "user-stop"
  | "disconnected"
  | "reconnect-required"
  | "auth-unavailable"
  | "no-live-broadcast"
  | "live-chat-disabled"
  | "stream-ended"
  | "live-chat-not-found"
  | "live-target-unavailable"
  | "quota-or-budget-stop"
  | "heartbeat-or-browser-disconnect"
  | "translation-provider-unavailable"
  | "translation-provider-error"
  | "session-limit";

export type CommentTranslatorStartStopReasonUxGroup =
  | "manual"
  | "connection"
  | "live-target"
  | "limit"
  | "browser"
  | "provider"
  | "session";

export type CommentTranslatorStartStopReasonUxRecommendedAction =
  | "none"
  | "connect-youtube"
  | "reconnect-youtube"
  | "check-live-broadcast"
  | "enable-live-chat"
  | "wait-or-pick-another-stream"
  | "wait-for-limit-reset"
  | "keep-browser-open"
  | "retry-later"
  | "start-again";

export type CommentTranslatorStartStopReasonUx = {
  code: CommentTranslatorStartStopReasonUxCode;
  group: CommentTranslatorStartStopReasonUxGroup;
  recommendedAction: CommentTranslatorStartStopReasonUxRecommendedAction;
  clientReadableDetail: "sanitized-reason-only";
  rawProviderPayload: "not-returned-by-design";
  rawComments: "not-returned-by-design";
  providerTargetMetadata: "forbidden";
  providerErrorBody: "never-returned-by-design";
  publicLaunchAllowed: false;
};

export const commentTranslatorStartStopReasonUxContract = {
  implementationStage: "free-public-beta-f11-start-stop-reason-ux",
  outputBoundary: "sanitized-browser-safe-reason-metadata-only",
  sourceBoundary: "server-owned-session-stopReason-readiness-polling-provider-signal",
  browserStorage: "unchanged",
  handoffPayload: "unchanged",
  rawProviderPayload: "not-returned-by-design",
  rawComments: "not-returned-by-design",
  providerTargetMetadata: "forbidden",
  providerErrorBody: "never-returned-by-design",
  publicLaunchAllowed: false,
  reasonCodes: [
    "user-stop",
    "disconnected",
    "reconnect-required",
    "auth-unavailable",
    "no-live-broadcast",
    "live-chat-disabled",
    "stream-ended",
    "live-chat-not-found",
    "live-target-unavailable",
    "quota-or-budget-stop",
    "heartbeat-or-browser-disconnect",
    "translation-provider-unavailable",
    "translation-provider-error",
    "session-limit"
  ],
  forbiddenReadableOutput: [
    "oauth-token-value",
    "refresh-token-value",
    "authorization-code-value",
    "owner-user-id-value",
    "provider-channel-id-value",
    "live-target-value",
    "liveChatId-value",
    "service-role-key-value",
    "authorization-header-value",
    "provider-target-metadata",
    "raw-provider-payload",
    "raw-comment-text",
    "server-only-cursor",
    "author-channel-id",
    "author-channel-url",
    "author-profile-image-url"
  ]
} as const;

export function createCommentTranslatorStartStopReasonUx(
  code: CommentTranslatorStartStopReasonUxCode
): CommentTranslatorStartStopReasonUx {
  return {
    code,
    group: resolveCommentTranslatorStartStopReasonUxGroup(code),
    recommendedAction: resolveCommentTranslatorStartStopReasonUxRecommendedAction(code),
    clientReadableDetail: "sanitized-reason-only",
    rawProviderPayload: "not-returned-by-design",
    rawComments: "not-returned-by-design",
    providerTargetMetadata: "forbidden",
    providerErrorBody: "never-returned-by-design",
    publicLaunchAllowed: false
  };
}

export function resolveCommentTranslatorStopReasonUxCode({
  stopReason,
  reasonUxCode
}: {
  stopReason: string;
  reasonUxCode?: CommentTranslatorStartStopReasonUxCode | null;
}): CommentTranslatorStartStopReasonUxCode {
  if (reasonUxCode) {
    return reasonUxCode;
  }

  if (stopReason === "user-stop") {
    return "user-stop";
  }

  if (stopReason === "auth-failed") {
    return "auth-unavailable";
  }

  if (stopReason === "token-refresh-failed" || stopReason === "reconnect-required") {
    return "reconnect-required";
  }

  if (stopReason === "stream-ended") {
    return "stream-ended";
  }

  if (stopReason === "stream-unavailable") {
    return "live-target-unavailable";
  }

  if (stopReason === "browser-disconnect" || stopReason === "missing-heartbeat") {
    return "heartbeat-or-browser-disconnect";
  }

  if (
    stopReason === "daily-time-limit" ||
    stopReason === "session-time-limit" ||
    stopReason === "translated-message-cap" ||
    stopReason === "provider-quota-stop" ||
    stopReason === "global-budget-stop" ||
    stopReason === "ai-budget-stop"
  ) {
    return "quota-or-budget-stop";
  }

  if (stopReason === "translation-provider-limit") {
    return "translation-provider-unavailable";
  }

  if (stopReason === "terminal-provider-error") {
    return "translation-provider-error";
  }

  if (stopReason === "session-limit") {
    return "session-limit";
  }

  return "live-target-unavailable";
}

export function resolveCommentTranslatorCredentialReadinessReasonUxCode({
  reason
}: {
  reason: string;
}): CommentTranslatorStartStopReasonUxCode {
  if (reason === "credential-not-found" || reason === "revoked") {
    return "disconnected";
  }

  if (reason === "auth-unavailable" || reason === "caller-not-authenticated" || reason === "private-launch-gated") {
    return "auth-unavailable";
  }

  return "reconnect-required";
}

export function resolveCommentTranslatorLiveTargetLookupReasonUxCode({
  reason
}: {
  reason: string;
}): CommentTranslatorStartStopReasonUxCode {
  if (reason === "no-active-owned-broadcast") {
    return "no-live-broadcast";
  }

  if (reason === "missing-live-chat") {
    return "live-chat-disabled";
  }

  if (reason === "owner-verification-failed") {
    return "live-chat-not-found";
  }

  return "live-target-unavailable";
}

export function resolveCommentTranslatorPollingTerminalReasonUxCode({
  code
}: {
  code: string;
}): CommentTranslatorStartStopReasonUxCode {
  if (code === "liveChatEnded") {
    return "stream-ended";
  }

  if (code === "liveChatDisabled") {
    return "live-chat-disabled";
  }

  if (code === "liveChatNotFound") {
    return "live-chat-not-found";
  }

  return "translation-provider-error";
}

function resolveCommentTranslatorStartStopReasonUxGroup(
  code: CommentTranslatorStartStopReasonUxCode
): CommentTranslatorStartStopReasonUxGroup {
  if (code === "user-stop") {
    return "manual";
  }

  if (code === "disconnected" || code === "reconnect-required" || code === "auth-unavailable") {
    return "connection";
  }

  if (
    code === "no-live-broadcast" ||
    code === "live-chat-disabled" ||
    code === "stream-ended" ||
    code === "live-chat-not-found" ||
    code === "live-target-unavailable"
  ) {
    return "live-target";
  }

  if (code === "quota-or-budget-stop") {
    return "limit";
  }

  if (code === "heartbeat-or-browser-disconnect") {
    return "browser";
  }

  if (code === "translation-provider-unavailable" || code === "translation-provider-error") {
    return "provider";
  }

  return "session";
}

function resolveCommentTranslatorStartStopReasonUxRecommendedAction(
  code: CommentTranslatorStartStopReasonUxCode
): CommentTranslatorStartStopReasonUxRecommendedAction {
  if (code === "disconnected") {
    return "connect-youtube";
  }

  if (code === "reconnect-required" || code === "auth-unavailable") {
    return "reconnect-youtube";
  }

  if (code === "no-live-broadcast" || code === "live-target-unavailable") {
    return "check-live-broadcast";
  }

  if (code === "live-chat-disabled") {
    return "enable-live-chat";
  }

  if (code === "stream-ended" || code === "live-chat-not-found") {
    return "wait-or-pick-another-stream";
  }

  if (code === "quota-or-budget-stop") {
    return "wait-for-limit-reset";
  }

  if (code === "heartbeat-or-browser-disconnect") {
    return "keep-browser-open";
  }

  if (code === "translation-provider-unavailable" || code === "translation-provider-error") {
    return "retry-later";
  }

  if (code === "session-limit") {
    return "start-again";
  }

  return "none";
}
