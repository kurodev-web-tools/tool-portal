import type { OperatorSessionState } from "./comment-translator-dock-model";

type CommentTranslatorClientSafePreAuthorityFailClosed = {
  readonly status: "fail-closed";
  readonly rateLimit?: "exceeded";
  readonly rateLimitReason?: "rate-limit-exceeded";
  readonly retryAfterSeconds?: number;
};

export function projectActivePaidFailClosedSessionState(
  current: OperatorSessionState
): OperatorSessionState {
  if (current.status !== "active" || current.plan !== "paid") return current;
  return {
    ...current,
    status: "stopped",
    stopReason: "paid-authority-unreadable",
    nextAction: "session-stopped",
    reasonUx: {
      code: "quota-or-budget-stop",
      group: "limit",
      recommendedAction: "wait-for-limit-reset",
      clientReadableDetail: "sanitized-reason-only"
    }
  };
}

export function projectCommentTranslatorPreAuthorityFailClosedSessionState({
  current,
  failClosed
}: {
  readonly current: OperatorSessionState;
  readonly failClosed: CommentTranslatorClientSafePreAuthorityFailClosed;
}): OperatorSessionState {
  if (current.status === "active" && current.plan === "paid") {
    return projectActivePaidFailClosedSessionState(current);
  }
  if (failClosed.rateLimit !== "exceeded") return current;
  return {
    ...current,
    status: "stopped",
    stopReason: "auth-failed",
    nextAction: "wait-for-limit-reset",
    reasonUx: {
      code: "quota-or-budget-stop",
      group: "limit",
      recommendedAction: "wait-for-limit-reset",
      clientReadableDetail: "sanitized-reason-only"
    },
    rateLimit: "exceeded",
    rateLimitReason: failClosed.rateLimitReason ?? "rate-limit-exceeded",
    retryAfterSeconds: failClosed.retryAfterSeconds ?? null
  };
}
