"use server";

import { randomUUID } from "node:crypto";
import {
  authorizeYouTubeOAuthCredentialStatusCaller,
  createYouTubeOAuthCredentialStatusUnavailablePayload,
  type YouTubeOAuthCredentialStatusCallerAuthorization,
  readYouTubeOAuthCredentialStatus
} from "@/lib/comment-translator-youtube-credential-status-boundary";
import {
  assessYouTubeOAuthCredentialTranslatorStartReadiness,
  createYouTubeOAuthCredentialDisconnectUnavailablePayload,
  readYouTubeOAuthCredentialDisconnectResult
} from "@/lib/comment-translator-youtube-disconnect-runtime";
import {
  persistInMemoryCommentTranslatorActiveSession,
  readCommentTranslatorSessionCommand,
  readInMemoryCommentTranslatorActiveSession,
  type CommentTranslatorSessionCommandIntent,
  type CommentTranslatorSessionStopReason
} from "@/lib/comment-translator-session-runtime";
import {
  readInMemoryCommentTranslatorUsageSnapshot,
  recordInMemoryCommentTranslatorSessionLedgerState
} from "@/lib/comment-translator-usage-ledger-runtime";
import { readCommentTranslatorBillingEntitlementSnapshot } from "@/lib/comment-translator-billing-runtime";
import {
  createCommentTranslatorPrivateLaunchBlockedSessionState,
  readCommentTranslatorPrivateLaunchAccess
} from "@/lib/comment-translator-private-launch-access-gate";
import {
  assertCommentTranslatorAbuseRequestAllowed,
  createCommentTranslatorAbuseRateLimitedSessionState
} from "@/lib/comment-translator-abuse-rate-limit-runtime";
import {
  createTrustedYouTubeOAuthCredentialSupabaseDisconnectRuntime,
  createTrustedYouTubeOAuthCredentialSupabaseStatusReader
} from "@/lib/comment-translator-youtube-token-store-supabase-adapter";
import { readYouTubeOAuthCredentialReferenceForCaller } from "@/lib/comment-translator-youtube-account-integration-status";
import { readCommentTranslatorToolCredentialStatus } from "@/lib/comment-translator-youtube-tool-credential-source";
import { isYouTubeOAuthCredentialResolutionDisabled } from "@/lib/comment-translator-youtube-token-store-runtime";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const credentialResolutionDisabledEnv = "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED";

export async function getYouTubeOAuthCredentialStatusAction() {
  const callerAuthorization = await readCallerAuthorization();
  const actionAbuseCheck = assertCommentTranslatorAbuseRequestAllowed({
    surface: "comment-translator-server-actions",
    action: "credential-status",
    callerAuthorization
  });
  if (actionAbuseCheck.status === "blocked") {
    return createYouTubeOAuthCredentialStatusUnavailablePayload({
      credentialReferenceId: "server-owned-credential-reference-unavailable",
      reason: "private-launch-gated"
    });
  }

  const launchAccess = readCommentTranslatorPrivateLaunchAccess({ callerAuthorization });
  if (launchAccess.status === "blocked") {
    const abuseCheck = assertCommentTranslatorAbuseRequestAllowed({
      surface: "private-launch-gate-direct-call-denials",
      action: "private-launch-denied",
      callerAuthorization
    });
    if (abuseCheck.status === "blocked") {
      return createYouTubeOAuthCredentialStatusUnavailablePayload({
        credentialReferenceId: "server-owned-credential-reference-unavailable",
        reason: "private-launch-gated"
      });
    }

    return createYouTubeOAuthCredentialStatusUnavailablePayload({
      credentialReferenceId: "server-owned-credential-reference-unavailable",
      reason: "private-launch-gated"
    });
  }

  return readCommentTranslatorToolCredentialStatus({ callerAuthorization });
}

export async function disconnectYouTubeOAuthCredentialAction() {
  const callerAuthorization = await readCallerAuthorization();
  const actionAbuseCheck = assertCommentTranslatorAbuseRequestAllowed({
    surface: "comment-translator-server-actions",
    action: "credential-disconnect",
    callerAuthorization
  });
  if (actionAbuseCheck.status === "blocked") {
    return createYouTubeOAuthCredentialDisconnectUnavailablePayload({
      credentialReferenceId: "server-owned-credential-reference-unavailable",
      reason: "private-launch-gated"
    });
  }

  const launchAccess = readCommentTranslatorPrivateLaunchAccess({ callerAuthorization });
  if (launchAccess.status === "blocked") {
    const abuseCheck = assertCommentTranslatorAbuseRequestAllowed({
      surface: "private-launch-gate-direct-call-denials",
      action: "private-launch-denied",
      callerAuthorization
    });
    if (abuseCheck.status === "blocked") {
      return createYouTubeOAuthCredentialDisconnectUnavailablePayload({
        credentialReferenceId: "server-owned-credential-reference-unavailable",
        reason: "private-launch-gated"
      });
    }

    return createYouTubeOAuthCredentialDisconnectUnavailablePayload({
      credentialReferenceId: "server-owned-credential-reference-unavailable",
      reason: "private-launch-gated"
    });
  }

  const credentialReference = readYouTubeOAuthCredentialReferenceForCaller({ callerAuthorization });
  if (credentialReference.status === "unavailable") {
    const reason =
      credentialReference.reason === "credential-reference-env-missing"
        ? "credential-reference-env-missing"
        : credentialReference.reason === "credential-resolution-disabled"
          ? "credential-resolution-disabled"
          : credentialReference.reason;

    return createYouTubeOAuthCredentialDisconnectUnavailablePayload({
      credentialReferenceId: "server-owned-credential-reference-unavailable",
      reason
    });
  }

  const credentialResolutionDisabled = isYouTubeOAuthCredentialResolutionDisabled({
    [credentialResolutionDisabledEnv]: process.env[credentialResolutionDisabledEnv]
  });
  const trustedDisconnectRuntime =
    credentialResolutionDisabled || callerAuthorization.status !== "authorized"
      ? null
      : createTrustedYouTubeOAuthCredentialSupabaseDisconnectRuntime();

  return readYouTubeOAuthCredentialDisconnectResult({
    credentialReferenceId: credentialReference.credentialReferenceId,
    trustedDisconnectAdapter: trustedDisconnectRuntime?.trustedDisconnectAdapter ?? null,
    callerAuthorization,
    credentialResolutionDisabled
  });
}

export async function getCommentTranslatorSessionStatusAction() {
  return readCommentTranslatorSessionActionResult({
    intent: "status"
  });
}

export async function startCommentTranslatorSessionAction() {
  return readCommentTranslatorSessionActionResult({
    intent: "start"
  });
}

export async function stopCommentTranslatorSessionAction() {
  return readCommentTranslatorSessionActionResult({
    intent: "stop",
    stopReason: "user-stop"
  });
}

export async function heartbeatCommentTranslatorSessionAction() {
  return readCommentTranslatorSessionActionResult({
    intent: "heartbeat"
  });
}

async function readCommentTranslatorSessionActionResult({
  intent,
  stopReason
}: {
  intent: CommentTranslatorSessionCommandIntent;
  stopReason?: CommentTranslatorSessionStopReason;
}) {
  const callerAuthorization = await readCallerAuthorization();
  const nowMs = Date.now();
  const action = mapSessionIntentToAbuseAction(intent);
  const abuseCheck = assertCommentTranslatorAbuseRequestAllowed({
    surface: "comment-translator-server-actions",
    action,
    callerAuthorization,
    nowMs
  });
  if (abuseCheck.status === "blocked") {
    return createCommentTranslatorAbuseRateLimitedSessionState({
      nowMs,
      plan: "free",
      check: abuseCheck
    });
  }

  const launchAccess = readCommentTranslatorPrivateLaunchAccess({ callerAuthorization });
  if (launchAccess.status === "blocked") {
    const privateLaunchAbuseCheck = assertCommentTranslatorAbuseRequestAllowed({
      surface: "private-launch-gate-direct-call-denials",
      action: "private-launch-denied",
      callerAuthorization,
      nowMs
    });
    if (privateLaunchAbuseCheck.status === "blocked") {
      return createCommentTranslatorAbuseRateLimitedSessionState({
        nowMs,
        plan: "free",
        check: privateLaunchAbuseCheck
      });
    }

    return createCommentTranslatorPrivateLaunchBlockedSessionState({
      nowMs,
      plan: "free",
      access: launchAccess
    });
  }

  const activeSession = readInMemoryCommentTranslatorActiveSession(callerAuthorization);
  const billingSnapshot = readCommentTranslatorBillingEntitlementSnapshot({ callerAuthorization });
  const usage = readInMemoryCommentTranslatorUsageSnapshot({
    callerAuthorization,
    nowMs,
    plan: billingSnapshot.plan,
    activeSession,
    paidEntitlement: billingSnapshot.plan === "paid" ? billingSnapshot.planEntitlement : undefined
  });
  const credentialReadiness = await readCredentialReadiness({ activeSession, callerAuthorization });
  const state = await readCommentTranslatorSessionCommand({
    intent,
    nowMs,
    plan: billingSnapshot.plan,
    callerAuthorization,
    credentialReadiness,
    activeSession,
    usage,
    browserConnected: intent !== "stop",
    stopReason,
    createSessionReferenceId: () => `cts_${randomUUID()}`
  });

  persistInMemoryCommentTranslatorActiveSession({ callerAuthorization, state });
  recordInMemoryCommentTranslatorSessionLedgerState({
    callerAuthorization,
    intent,
    state,
    occurredAtMs: nowMs,
    planEntitlement: usage.planEntitlement
  });

  return state;
}

function mapSessionIntentToAbuseAction(intent: CommentTranslatorSessionCommandIntent) {
  if (intent === "start") {
    return "session-start";
  }

  if (intent === "stop") {
    return "session-stop";
  }

  if (intent === "heartbeat") {
    return "session-heartbeat";
  }

  return "session-status";
}

async function readCredentialReadiness({
  activeSession,
  callerAuthorization
}: {
  activeSession: ReturnType<typeof readInMemoryCommentTranslatorActiveSession>;
  callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
}) {
  if (!activeSession?.credentialReferenceId) {
    return assessYouTubeOAuthCredentialTranslatorStartReadiness(
      await readCommentTranslatorToolCredentialStatus({ callerAuthorization })
    );
  }

  const credentialResolutionDisabled = isYouTubeOAuthCredentialResolutionDisabled({
    [credentialResolutionDisabledEnv]: process.env[credentialResolutionDisabledEnv]
  });
  const trustedStatusReader =
    credentialResolutionDisabled || callerAuthorization.status !== "authorized"
      ? null
      : createTrustedYouTubeOAuthCredentialSupabaseStatusReader();
  const status = await readYouTubeOAuthCredentialStatus({
    credentialReferenceId: activeSession.credentialReferenceId,
    trustedAdapter: trustedStatusReader?.trustedAdapter ?? null,
    callerAuthorization,
    credentialResolutionDisabled
  });

  return assessYouTubeOAuthCredentialTranslatorStartReadiness(status);
}

async function readCallerAuthorization(): Promise<YouTubeOAuthCredentialStatusCallerAuthorization> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return authorizeYouTubeOAuthCredentialStatusCaller({
      callerUserId: null,
      authUnavailable: true
    });
  }

  try {
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    return authorizeYouTubeOAuthCredentialStatusCaller({
      callerUserId: error ? null : user?.id ?? null,
      authUnavailable: Boolean(error)
    });
  } catch {
    return authorizeYouTubeOAuthCredentialStatusCaller({
      callerUserId: null,
      authUnavailable: true
    });
  }
}
