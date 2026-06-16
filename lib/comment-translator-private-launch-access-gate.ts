import "server-only";

import { createHash } from "node:crypto";
import { type AccountSessionState } from "./supabase/session";
import { type CommentTranslatorSessionBrowserSafeState, type CommentTranslatorSessionPlan } from "./comment-translator-session-runtime";
import { createCommentTranslatorStartStopReasonUx } from "./comment-translator-start-stop-reason-ux";
import { createUnavailableCommentTranslatorFreeBetaUsageDisplay } from "./comment-translator-free-beta-usage-display";
import { type YouTubeOAuthCredentialStatusCallerAuthorization } from "./comment-translator-youtube-credential-status-boundary";

export type CommentTranslatorPrivateLaunchAccessEnv = Record<string, string | undefined>;

export type CommentTranslatorPrivateLaunchBlockedReason =
  | "auth-unavailable"
  | "caller-not-authenticated"
  | "private-launch-gate";

export type CommentTranslatorPrivateLaunchAccess =
  | {
      status: "allowed";
      access: "allowed-tester";
      browserReadableOutput: "sanitized-private-launch-access-metadata-only";
    }
  | {
      status: "blocked";
      reason: CommentTranslatorPrivateLaunchBlockedReason;
      access: "blocked";
      launchAccess: "private-launch-gated";
      browserReadableOutput: "sanitized-private-launch-access-metadata-only";
      tokenValue: "never-returned-by-design";
      providerTargetMetadata: "forbidden";
    };

export const commentTranslatorPrivateLaunchAccessGateContract = {
  implementationStage: "pre-main-task-17-private-launch-access-gate",
  runtime: "server-only",
  defaultAccess: "closed-to-general-users",
  allowedTesterPolicy: "sha256-owner-user-id-allowlist",
  abuseRateLimitBoundary: "assertCommentTranslatorAbuseRequestAllowed-before-private-launch-denial-retry",
  allowlistEnv: "COMMENT_TRANSLATOR_PRIVATE_LAUNCH_ALLOWED_USER_HASHES",
  gatedSurfaces: [
    "/tools/comment-translator",
    "/account/integrations",
    "/account/billing",
    "/api/comment-translator/session",
    "/api/comment-translator/youtube/credential-status",
    "/api/comment-translator/youtube/disconnect",
    "comment-translator-server-actions",
    "comment-translator-billing-actions"
  ],
  browserReadableOutput: "sanitized-private-launch-access-metadata-only",
  browserStorage: "forbidden",
  handoffPayload: "unchanged",
  liveProviderExecution: "not-run-by-private-launch-gate",
  billingMutation: "blocked-for-non-allowed-users",
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
    "provider-target-metadata"
  ]
} as const;

const allowedTesterHashesEnv = "COMMENT_TRANSLATOR_PRIVATE_LAUNCH_ALLOWED_USER_HASHES";
const sha256HexPattern = /^[a-f0-9]{64}$/;

export function createCommentTranslatorPrivateLaunchTesterHash(ownerUserId: string) {
  return createHash("sha256").update(ownerUserId).digest("hex");
}

export function readCommentTranslatorPrivateLaunchAccess({
  callerAuthorization,
  env = process.env
}: {
  callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  env?: CommentTranslatorPrivateLaunchAccessEnv;
}): CommentTranslatorPrivateLaunchAccess {
  if (callerAuthorization.status !== "authorized") {
    return createBlockedPrivateLaunchAccess(callerAuthorization.reason);
  }

  const allowedTesterHashes = readAllowedTesterHashes(env);
  const callerHash = createCommentTranslatorPrivateLaunchTesterHash(callerAuthorization.ownerUserId);

  if (allowedTesterHashes.has(callerHash)) {
    return {
      status: "allowed",
      access: "allowed-tester",
      browserReadableOutput: "sanitized-private-launch-access-metadata-only"
    };
  }

  return createBlockedPrivateLaunchAccess("private-launch-gate");
}

export function readCommentTranslatorPrivateLaunchAccessForAccountSession({
  accountSession,
  env = process.env
}: {
  accountSession: Pick<AccountSessionState, "authStatus" | "user">;
  env?: CommentTranslatorPrivateLaunchAccessEnv;
}) {
  return readCommentTranslatorPrivateLaunchAccess({
    callerAuthorization:
      accountSession.authStatus === "signed-in"
        ? {
            status: "authorized",
            ownerUserId: accountSession.user?.id ?? ""
          }
        : {
            status: "unavailable",
            reason: accountSession.authStatus === "unavailable" ? "auth-unavailable" : "caller-not-authenticated",
            reconnectRequired: true
          },
    env
  });
}

export function createCommentTranslatorPrivateLaunchBlockedSessionState({
  nowMs,
  plan,
  access
}: {
  nowMs: number;
  plan: CommentTranslatorSessionPlan;
  access: Extract<CommentTranslatorPrivateLaunchAccess, { status: "blocked" }>;
}): CommentTranslatorSessionBrowserSafeState & {
  launchAccess: "private-launch-gated";
  privateLaunchReason: CommentTranslatorPrivateLaunchBlockedReason;
} {
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
    reasonUx: createCommentTranslatorStartStopReasonUx("auth-unavailable"),
    usageDisplay: createUnavailableCommentTranslatorFreeBetaUsageDisplay({
      reason: "missing-provider-readiness"
    }),
    nextAction: "reconnect-or-sign-in",
    providerApiUsage: "stopped",
    aiTranslationUsage: "stopped",
    tokenValue: "never-returned-by-design",
    providerTargetMetadata: "forbidden",
    providerErrorBody: "never-returned-by-design",
    launchAccess: "private-launch-gated",
    privateLaunchReason: access.reason
  };
}

function createBlockedPrivateLaunchAccess(reason: CommentTranslatorPrivateLaunchBlockedReason): CommentTranslatorPrivateLaunchAccess {
  return {
    status: "blocked",
    reason,
    access: "blocked",
    launchAccess: "private-launch-gated",
    browserReadableOutput: "sanitized-private-launch-access-metadata-only",
    tokenValue: "never-returned-by-design",
    providerTargetMetadata: "forbidden"
  };
}

function readAllowedTesterHashes(env: CommentTranslatorPrivateLaunchAccessEnv) {
  return new Set(
    (env[allowedTesterHashesEnv] ?? "")
      .split(/[\s,]+/)
      .map((value) => value.trim().toLowerCase())
      .filter((value) => sha256HexPattern.test(value))
  );
}
