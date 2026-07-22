"use server";

import { assertCommentTranslatorAbuseRequestAllowed, createCommentTranslatorAbuseRateLimitedSessionState } from "@/lib/comment-translator-abuse-rate-limit-runtime";
import { readCommentTranslatorBillingEntitlementSnapshot } from "@/lib/comment-translator-billing-runtime";
import {
  createCommentTranslatorDurableSessionFailClosedState,
  createTrustedCommentTranslatorSessionSupabaseStore,
  readCommentTranslatorDurableActiveSessionOrFailClosed
} from "@/lib/comment-translator-durable-session-store";
import {
  createTrustedCommentTranslatorUsageCounterSupabaseStore,
  readCommentTranslatorDurableUsageSnapshotOrFailClosed
} from "@/lib/comment-translator-durable-usage-counter-store";
import { resolveCommentTranslatorFreeBetaPreviewRateLimitSmokeOverride } from "@/lib/comment-translator-free-beta-preview-rate-limit-smoke-override";
import {
  createCommentTranslatorPrivateLaunchBlockedSessionState,
  readCommentTranslatorFreeBetaRuntimeAccess,
  readCommentTranslatorPrivateLaunchAccess
} from "@/lib/comment-translator-private-launch-access-gate";
import { resolveCommentTranslatorPublicEntitlementBaseline } from "@/lib/comment-translator-public-entitlement-baseline";
import { executeCommentTranslatorSessionCommand } from "@/lib/comment-translator-session-command-execution";
import type { CommentTranslatorSessionCommandIntent, CommentTranslatorSessionStopReason } from "@/lib/comment-translator-session-runtime";
import { readCommentTranslatorToolCredentialStatus } from "@/lib/comment-translator-youtube-tool-credential-source";
import type { CommentTranslatorSourceLanguageId, CommentTranslatorTargetLanguageId } from "@/lib/comment-translator";
import { readCommentTranslatorActionCallerAuthorization, readCommentTranslatorActionCredentialReadiness } from "./action-context";

type CommentTranslatorSessionLanguageActionOptions = {
  readonly sourceLanguage?: CommentTranslatorSourceLanguageId;
  readonly targetLanguage?: CommentTranslatorTargetLanguageId;
};

export async function getCommentTranslatorSessionStatusAction(options: CommentTranslatorSessionLanguageActionOptions = {}) {
  return readCommentTranslatorSessionActionResult({ intent: "status", ...options });
}

export async function startCommentTranslatorSessionAction(options: CommentTranslatorSessionLanguageActionOptions = {}) {
  return readCommentTranslatorSessionActionResult({ intent: "start", ...options });
}

export async function stopCommentTranslatorSessionAction() {
  return readCommentTranslatorSessionActionResult({ intent: "stop", stopReason: "user-stop" });
}

export async function heartbeatCommentTranslatorSessionAction(options: CommentTranslatorSessionLanguageActionOptions = {}) {
  return readCommentTranslatorSessionActionResult({ intent: "heartbeat", ...options });
}

async function readCommentTranslatorSessionActionResult({
  intent,
  stopReason,
  sourceLanguage,
  targetLanguage = "ja"
}: {
  readonly intent: CommentTranslatorSessionCommandIntent;
  readonly stopReason?: CommentTranslatorSessionStopReason;
  readonly sourceLanguage?: CommentTranslatorSourceLanguageId;
  readonly targetLanguage?: CommentTranslatorTargetLanguageId;
}) {
  const callerAuthorization = await readCommentTranslatorActionCallerAuthorization();
  const nowMs = Date.now();
  const abuseCheck = assertCommentTranslatorAbuseRequestAllowed({
    surface: "comment-translator-server-actions",
    action: mapSessionIntentToAbuseAction(intent),
    callerAuthorization,
    nowMs
  });
  if (abuseCheck.status === "blocked") {
    return createCommentTranslatorAbuseRateLimitedSessionState({ nowMs, plan: "free", check: abuseCheck });
  }
  const launchAccess = readCommentTranslatorFreeBetaRuntimeAccess({ callerAuthorization });
  if (launchAccess.status === "blocked") {
    const privateLaunchAbuseCheck = assertCommentTranslatorAbuseRequestAllowed({
      surface: "private-launch-gate-direct-call-denials",
      action: "private-launch-denied",
      callerAuthorization,
      nowMs
    });
    if (privateLaunchAbuseCheck.status === "blocked") {
      return createCommentTranslatorAbuseRateLimitedSessionState({ nowMs, plan: "free", check: privateLaunchAbuseCheck });
    }
    return createCommentTranslatorPrivateLaunchBlockedSessionState({ nowMs, plan: "free", access: launchAccess });
  }
  const billingSnapshot = await readCommentTranslatorBillingEntitlementSnapshot({ callerAuthorization });
  const previewRateLimitSmokeOverride = resolveCommentTranslatorFreeBetaPreviewRateLimitSmokeOverride({
    privateLaunchAccess: readCommentTranslatorPrivateLaunchAccess({ callerAuthorization })
  });
  const durableSessionStore = createTrustedCommentTranslatorSessionSupabaseStore();
  const durableUsageCounterStore = createTrustedCommentTranslatorUsageCounterSupabaseStore();
  const durableActiveSessionRead = await readCommentTranslatorDurableActiveSessionOrFailClosed({
    callerAuthorization,
    durableSessionStore
  });
  if (durableActiveSessionRead.status === "fail-closed") {
    return createCommentTranslatorDurableSessionFailClosedState({ nowMs, plan: "free" });
  }
  const activeSession = durableActiveSessionRead.activeSession;
  const durableUsageRead = await readCommentTranslatorDurableUsageSnapshotOrFailClosed({
    callerAuthorization,
    durableUsageCounterStore,
    nowMs,
    plan: "free",
    activeSession,
    planEntitlementOverride: previewRateLimitSmokeOverride
  });
  const entitlementBaseline = resolveCommentTranslatorPublicEntitlementBaseline({
    billingSnapshot,
    durableUsageRead,
    previewRateLimitSmokeOverride
  });
  if (entitlementBaseline.status === "fail-closed") {
    return createCommentTranslatorDurableSessionFailClosedState({ nowMs, plan: "free" });
  }
  if (intent === "status") {
    return executeCommentTranslatorSessionCommand({
      intent: "status",
      nowMs,
      plan: entitlementBaseline.plan,
      callerAuthorization,
      credentialReadiness: null,
      credentialReferenceId: activeSession?.credentialReferenceId,
      activeSession,
      usage: entitlementBaseline.usage,
      durableSessionStore,
      durableUsageCounterStore,
      browserConnected: true,
      stopReason,
      targetLanguage,
      sourceLanguages: sourceLanguage ? [sourceLanguage] : undefined
    });
  }
  const credentialReadiness = await readCommentTranslatorActionCredentialReadiness({
    activeSession,
    callerAuthorization,
    readFallbackCredentialStatus: () => readCommentTranslatorToolCredentialStatus({ callerAuthorization })
  });
  const credentialReferenceId = credentialReadiness.status === "ready"
    ? credentialReadiness.credentialReferenceId
    : activeSession?.credentialReferenceId;
  return executeCommentTranslatorSessionCommand({
    intent,
    nowMs,
    plan: entitlementBaseline.plan,
    callerAuthorization,
    credentialReadiness,
    credentialReferenceId,
    activeSession,
    usage: entitlementBaseline.usage,
    durableSessionStore,
    durableUsageCounterStore,
    browserConnected: intent !== "stop",
    stopReason,
    targetLanguage,
    sourceLanguages: sourceLanguage ? [sourceLanguage] : undefined
  });
}

function mapSessionIntentToAbuseAction(intent: CommentTranslatorSessionCommandIntent) {
  if (intent === "start") return "session-start";
  if (intent === "stop") return "session-stop";
  if (intent === "heartbeat") return "session-heartbeat";
  return "session-status";
}
