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
import { isYouTubeOAuthCredentialResolutionDisabled } from "@/lib/comment-translator-youtube-token-store-runtime";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const credentialResolutionDisabledEnv = "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED";

function readCredentialReferenceId(formData: FormData) {
  const value = formData.get("credentialReferenceId");
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function getYouTubeOAuthCredentialStatusAction(formData: FormData) {
  const credentialReferenceId = readCredentialReferenceId(formData);

  if (!credentialReferenceId) {
    return createYouTubeOAuthCredentialStatusUnavailablePayload({
      credentialReferenceId: "missing-credential-reference",
      reason: "trusted-adapter-not-wired"
    });
  }

  const callerAuthorization = await readCallerAuthorization();
  const actionAbuseCheck = assertCommentTranslatorAbuseRequestAllowed({
    surface: "comment-translator-server-actions",
    action: "credential-status",
    callerAuthorization
  });
  if (actionAbuseCheck.status === "blocked") {
    return createYouTubeOAuthCredentialStatusUnavailablePayload({
      credentialReferenceId,
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
        credentialReferenceId,
        reason: "private-launch-gated"
      });
    }

    return createYouTubeOAuthCredentialStatusUnavailablePayload({
      credentialReferenceId,
      reason: "private-launch-gated"
    });
  }

  const credentialResolutionDisabled = isYouTubeOAuthCredentialResolutionDisabled({
    [credentialResolutionDisabledEnv]: process.env[credentialResolutionDisabledEnv]
  });
  const trustedStatusReader =
    credentialResolutionDisabled || callerAuthorization.status !== "authorized"
      ? null
      : createTrustedYouTubeOAuthCredentialSupabaseStatusReader();

  return readYouTubeOAuthCredentialStatus({
    credentialReferenceId,
    trustedAdapter: trustedStatusReader?.trustedAdapter ?? null,
    callerAuthorization,
    credentialResolutionDisabled
  });
}

export async function disconnectYouTubeOAuthCredentialAction(formData: FormData) {
  const credentialReferenceId = readCredentialReferenceId(formData);

  if (!credentialReferenceId) {
    return createYouTubeOAuthCredentialDisconnectUnavailablePayload({
      credentialReferenceId: "missing-credential-reference",
      reason: "trusted-disconnect-adapter-not-wired"
    });
  }

  const callerAuthorization = await readCallerAuthorization();
  const actionAbuseCheck = assertCommentTranslatorAbuseRequestAllowed({
    surface: "comment-translator-server-actions",
    action: "credential-disconnect",
    callerAuthorization
  });
  if (actionAbuseCheck.status === "blocked") {
    return createYouTubeOAuthCredentialDisconnectUnavailablePayload({
      credentialReferenceId,
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
        credentialReferenceId,
        reason: "private-launch-gated"
      });
    }

    return createYouTubeOAuthCredentialDisconnectUnavailablePayload({
      credentialReferenceId,
      reason: "private-launch-gated"
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
    credentialReferenceId,
    trustedDisconnectAdapter: trustedDisconnectRuntime?.trustedDisconnectAdapter ?? null,
    callerAuthorization,
    credentialResolutionDisabled
  });
}

export async function getCommentTranslatorSessionStatusAction(formData: FormData) {
  return readCommentTranslatorSessionActionResult({
    intent: "status",
    formData
  });
}

export async function startCommentTranslatorSessionAction(formData: FormData) {
  return readCommentTranslatorSessionActionResult({
    intent: "start",
    formData
  });
}

export async function stopCommentTranslatorSessionAction(formData: FormData) {
  return readCommentTranslatorSessionActionResult({
    intent: "stop",
    formData,
    stopReason: "user-stop"
  });
}

export async function heartbeatCommentTranslatorSessionAction(formData: FormData) {
  return readCommentTranslatorSessionActionResult({
    intent: "heartbeat",
    formData
  });
}

async function readCommentTranslatorSessionActionResult({
  intent,
  formData,
  stopReason
}: {
  intent: CommentTranslatorSessionCommandIntent;
  formData: FormData;
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
  const credentialReferenceId = readCredentialReferenceId(formData) ?? activeSession?.credentialReferenceId ?? null;
  const credentialReadiness = credentialReferenceId
    ? await readCredentialReadiness({ credentialReferenceId, callerAuthorization })
    : assessYouTubeOAuthCredentialTranslatorStartReadiness(
        createYouTubeOAuthCredentialStatusUnavailablePayload({
          credentialReferenceId: "missing-credential-reference",
          reason: "trusted-adapter-not-wired"
        })
      );
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
  credentialReferenceId,
  callerAuthorization
}: {
  credentialReferenceId: string;
  callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
}) {
  const credentialResolutionDisabled = isYouTubeOAuthCredentialResolutionDisabled({
    [credentialResolutionDisabledEnv]: process.env[credentialResolutionDisabledEnv]
  });
  const trustedStatusReader =
    credentialResolutionDisabled || callerAuthorization.status !== "authorized"
      ? null
      : createTrustedYouTubeOAuthCredentialSupabaseStatusReader();
  const status = await readYouTubeOAuthCredentialStatus({
    credentialReferenceId,
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
