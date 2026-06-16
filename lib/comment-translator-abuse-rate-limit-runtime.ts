import "server-only";

import { createHash } from "node:crypto";
import { type CommentTranslatorSessionPlan } from "./comment-translator-session-runtime";
import {
  createCommentTranslatorStartStopReasonUx,
  type CommentTranslatorStartStopReasonUx
} from "./comment-translator-start-stop-reason-ux";
import { type YouTubeOAuthCredentialStatusCallerAuthorization } from "./comment-translator-youtube-credential-status-boundary";

export type CommentTranslatorAbuseProtectedSurface =
  | "/api/comment-translator/session"
  | "/api/comment-translator/youtube/credential-status"
  | "/api/comment-translator/youtube/disconnect"
  | "/api/comment-translator/billing/webhook"
  | "comment-translator-server-actions"
  | "comment-translator-billing-actions"
  | "comment-translator-provider-execution"
  | "private-launch-gate-direct-call-denials";

export type CommentTranslatorAbuseProtectedAction =
  | "session-status"
  | "session-start"
  | "session-stop"
  | "session-heartbeat"
  | "credential-status"
  | "credential-disconnect"
  | "billing-checkout"
  | "billing-portal"
  | "billing-webhook"
  | "provider-translation-batch"
  | "private-launch-denied";

export type CommentTranslatorAbuseRateLimitBucket = {
  count: number;
  resetAtMs: number;
};

export type CommentTranslatorAbuseRateLimitStore = {
  read(key: string): CommentTranslatorAbuseRateLimitBucket | null;
  write(key: string, bucket: CommentTranslatorAbuseRateLimitBucket): void;
  clear?(): void;
};

export type CommentTranslatorAbuseRateLimitAllowedResult = {
  status: "allowed";
  surface: CommentTranslatorAbuseProtectedSurface;
  action: CommentTranslatorAbuseProtectedAction;
  rateLimit: "within-limit";
  remaining: number;
  retryAfterSeconds: null;
  requestIdentity: "sanitized-request-identity";
  browserReadableOutput: "sanitized-rate-limit-metadata-only";
};

export type CommentTranslatorAbuseRateLimitBlockedResult = {
  status: "blocked";
  reason: "rate-limit-exceeded";
  surface: CommentTranslatorAbuseProtectedSurface;
  action: CommentTranslatorAbuseProtectedAction;
  rateLimit: "exceeded";
  retryAfterSeconds: number;
  requestIdentity: "sanitized-request-identity";
  browserReadableOutput: "sanitized-rate-limit-metadata-only";
  tokenValue: "never-returned-by-design";
  authorizationHeaderValue: "never-returned-by-design";
  providerTargetMetadata: "forbidden";
};

export type CommentTranslatorAbuseRateLimitResult =
  | CommentTranslatorAbuseRateLimitAllowedResult
  | CommentTranslatorAbuseRateLimitBlockedResult;

export type CommentTranslatorAbuseRateLimitRequest = {
  surface: CommentTranslatorAbuseProtectedSurface;
  action: CommentTranslatorAbuseProtectedAction;
  callerAuthorization?: YouTubeOAuthCredentialStatusCallerAuthorization | { status: "unauthenticated" } | null;
  requestIp?: string | null;
  nowMs?: number;
  rateLimitStore?: CommentTranslatorAbuseRateLimitStore;
};

export type CommentTranslatorBillingRateLimitUnavailableResult = {
  status: "unavailable";
  reason: "rate-limit-exceeded";
  missingEnvReferences: [];
  retryAfterSeconds: number;
};

export type CommentTranslatorAbuseRateLimitedSessionState = {
  status: "stopped";
  provider: "youtube";
  plan: CommentTranslatorSessionPlan;
  sessionReferenceId: null;
  credentialReferenceId: null;
  startedAtIso: null;
  stoppedAtIso: string;
  elapsedSeconds: 0;
  remainingSessionSeconds: 0;
  remainingDailySeconds: 0;
  heartbeat: {
    required: true;
    timeoutSeconds: 45;
    lastHeartbeatAtIso: null;
  };
  stopReason: "auth-failed";
  reasonUx: CommentTranslatorStartStopReasonUx;
  nextAction: "wait-for-limit-reset";
  providerApiUsage: "stopped";
  aiTranslationUsage: "stopped";
  tokenValue: "never-returned-by-design";
  providerTargetMetadata: "forbidden";
  providerErrorBody: "never-returned-by-design";
  rateLimit: "exceeded";
  rateLimitReason: "rate-limit-exceeded";
  retryAfterSeconds: number;
};

export const commentTranslatorAbuseRateLimitContract = {
  implementationStage: "pre-main-task-22-abuse-rate-limit-hardening",
  runtime: "server-only",
  defaultPosture: "fail-closed-before-cost-affecting-work",
  edgeControlReference: "COMMENT_TRANSLATOR_EDGE_RATE_LIMITING",
  browserReadableOutput: "sanitized-rate-limit-metadata-only",
  protectedSurfaces: [
    "/api/comment-translator/session",
    "/api/comment-translator/youtube/credential-status",
    "/api/comment-translator/youtube/disconnect",
    "/api/comment-translator/billing/webhook",
    "comment-translator-server-actions",
    "comment-translator-billing-actions",
    "comment-translator-provider-execution",
    "private-launch-gate-direct-call-denials"
  ],
  policy: {
    sessionStart: {
      maxAttempts: 6,
      windowSeconds: 60
    },
    privateLaunchDirectCallDenials: {
      maxAttempts: 10,
      windowSeconds: 60
    },
    billingActions: {
      maxAttempts: 3,
      windowSeconds: 300
    },
    providerExecution: {
      maxAttempts: 20,
      windowSeconds: 60
    }
  },
  forbiddenReadableOutput: [
    "oauth-token-value",
    "refresh-token-value",
    "authorization-code-value",
    "owner-user-id-value",
    "provider-channel-id-value",
    "liveChatId-value",
    "service-role-key-value",
    "authorization-header-value",
    "stripe-secret-key-value",
    "stripe-webhook-secret-value",
    "provider-target-metadata",
    "raw-request-ip"
  ]
} as const;

const defaultStore = createInMemoryCommentTranslatorAbuseRateLimitStoreForTests();

export function createInMemoryCommentTranslatorAbuseRateLimitStoreForTests(): CommentTranslatorAbuseRateLimitStore {
  const buckets = new Map<string, CommentTranslatorAbuseRateLimitBucket>();

  return {
    read(key) {
      return buckets.get(key) ?? null;
    },
    write(key, bucket) {
      buckets.set(key, bucket);
    },
    clear() {
      buckets.clear();
    }
  };
}

export function resetInMemoryCommentTranslatorAbuseRateLimitForTests() {
  defaultStore.clear?.();
}

export function assertCommentTranslatorAbuseRequestAllowed(
  request: CommentTranslatorAbuseRateLimitRequest
): CommentTranslatorAbuseRateLimitResult {
  const nowMs = normalizeNowMs(request.nowMs);
  const policy = resolveRateLimitPolicy(request.action);
  const store = request.rateLimitStore ?? defaultStore;
  const key = createRateLimitBucketKey(request);
  const current = store.read(key);
  const bucket =
    current && current.resetAtMs > nowMs
      ? current
      : {
          count: 0,
          resetAtMs: nowMs + policy.windowMs
        };

  if (bucket.count >= policy.maxAttempts) {
    return createCommentTranslatorAbuseRateLimitExceededResult({
      surface: request.surface,
      action: request.action,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAtMs - nowMs) / 1_000))
    });
  }

  const nextBucket = {
    ...bucket,
    count: bucket.count + 1
  };
  store.write(key, nextBucket);

  return {
    status: "allowed",
    surface: request.surface,
    action: request.action,
    rateLimit: "within-limit",
    remaining: Math.max(0, policy.maxAttempts - nextBucket.count),
    retryAfterSeconds: null,
    requestIdentity: "sanitized-request-identity",
    browserReadableOutput: "sanitized-rate-limit-metadata-only"
  };
}

export function createCommentTranslatorAbuseRateLimitExceededResult({
  surface,
  action,
  retryAfterSeconds
}: {
  surface: CommentTranslatorAbuseProtectedSurface;
  action: CommentTranslatorAbuseProtectedAction;
  retryAfterSeconds: number;
}): CommentTranslatorAbuseRateLimitBlockedResult {
  return {
    status: "blocked",
    reason: "rate-limit-exceeded",
    surface,
    action,
    rateLimit: "exceeded",
    retryAfterSeconds,
    requestIdentity: "sanitized-request-identity",
    browserReadableOutput: "sanitized-rate-limit-metadata-only",
    tokenValue: "never-returned-by-design",
    authorizationHeaderValue: "never-returned-by-design",
    providerTargetMetadata: "forbidden"
  };
}

export function createCommentTranslatorBillingRateLimitUnavailableResult({
  check
}: {
  check: CommentTranslatorAbuseRateLimitBlockedResult;
}): CommentTranslatorBillingRateLimitUnavailableResult {
  return {
    status: "unavailable",
    reason: check.reason,
    missingEnvReferences: [],
    retryAfterSeconds: check.retryAfterSeconds
  };
}

export function createCommentTranslatorAbuseRateLimitedSessionState({
  nowMs,
  plan,
  check
}: {
  nowMs: number;
  plan: CommentTranslatorSessionPlan;
  check: CommentTranslatorAbuseRateLimitBlockedResult;
}): CommentTranslatorAbuseRateLimitedSessionState {
  return {
    status: "stopped",
    provider: "youtube",
    plan,
    sessionReferenceId: null,
    credentialReferenceId: null,
    startedAtIso: null,
    stoppedAtIso: new Date(nowMs).toISOString(),
    elapsedSeconds: 0,
    remainingSessionSeconds: 0,
    remainingDailySeconds: 0,
    heartbeat: {
      required: true,
      timeoutSeconds: 45,
      lastHeartbeatAtIso: null
    },
    stopReason: "auth-failed",
    reasonUx: createCommentTranslatorStartStopReasonUx("quota-or-budget-stop"),
    nextAction: "wait-for-limit-reset",
    providerApiUsage: "stopped",
    aiTranslationUsage: "stopped",
    tokenValue: "never-returned-by-design",
    providerTargetMetadata: "forbidden",
    providerErrorBody: "never-returned-by-design",
    rateLimit: "exceeded",
    rateLimitReason: check.reason,
    retryAfterSeconds: check.retryAfterSeconds
  };
}

export function readCommentTranslatorRequestIp(headers: Headers | null | undefined) {
  if (!headers) {
    return null;
  }

  const forwardedFor = headers.get("cf-connecting-ip") ?? headers.get("x-forwarded-for") ?? headers.get("x-real-ip");
  return forwardedFor?.split(",")[0]?.trim() || null;
}

function resolveRateLimitPolicy(action: CommentTranslatorAbuseProtectedAction) {
  if (action === "session-start") {
    return {
      maxAttempts: commentTranslatorAbuseRateLimitContract.policy.sessionStart.maxAttempts,
      windowMs: commentTranslatorAbuseRateLimitContract.policy.sessionStart.windowSeconds * 1_000
    };
  }

  if (action === "private-launch-denied") {
    return {
      maxAttempts: commentTranslatorAbuseRateLimitContract.policy.privateLaunchDirectCallDenials.maxAttempts,
      windowMs: commentTranslatorAbuseRateLimitContract.policy.privateLaunchDirectCallDenials.windowSeconds * 1_000
    };
  }

  if (action === "billing-checkout" || action === "billing-portal") {
    return {
      maxAttempts: commentTranslatorAbuseRateLimitContract.policy.billingActions.maxAttempts,
      windowMs: commentTranslatorAbuseRateLimitContract.policy.billingActions.windowSeconds * 1_000
    };
  }

  if (action === "provider-translation-batch") {
    return {
      maxAttempts: commentTranslatorAbuseRateLimitContract.policy.providerExecution.maxAttempts,
      windowMs: commentTranslatorAbuseRateLimitContract.policy.providerExecution.windowSeconds * 1_000
    };
  }

  return {
    maxAttempts: 20,
    windowMs: 60_000
  };
}

function createRateLimitBucketKey(request: CommentTranslatorAbuseRateLimitRequest) {
  const caller = request.callerAuthorization;
  const identity =
    caller && caller.status === "authorized"
      ? `user:${caller.ownerUserId}`
      : `ip:${request.requestIp?.trim() || "anonymous-request"}`;

  return createHash("sha256")
    .update([request.surface, request.action, identity].join(":"))
    .digest("hex");
}

function normalizeNowMs(nowMs: number | null | undefined) {
  return typeof nowMs === "number" && Number.isFinite(nowMs) ? nowMs : Date.now();
}
