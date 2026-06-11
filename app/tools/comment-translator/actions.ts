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

  const credentialResolutionDisabled = isYouTubeOAuthCredentialResolutionDisabled({
    [credentialResolutionDisabledEnv]: process.env[credentialResolutionDisabledEnv]
  });
  const callerAuthorization = credentialResolutionDisabled
    ? authorizeYouTubeOAuthCredentialStatusCaller({ callerUserId: null })
    : await readCallerAuthorization();
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

  const credentialResolutionDisabled = isYouTubeOAuthCredentialResolutionDisabled({
    [credentialResolutionDisabledEnv]: process.env[credentialResolutionDisabledEnv]
  });
  const callerAuthorization = credentialResolutionDisabled
    ? authorizeYouTubeOAuthCredentialStatusCaller({ callerUserId: null })
    : await readCallerAuthorization();
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
  const activeSession = readInMemoryCommentTranslatorActiveSession(callerAuthorization);
  const nowMs = Date.now();
  const usage = readInMemoryCommentTranslatorUsageSnapshot({
    callerAuthorization,
    nowMs,
    plan: "free",
    activeSession
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
    plan: "free",
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
