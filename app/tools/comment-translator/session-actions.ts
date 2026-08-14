"use server";

import { assertCommentTranslatorAbuseRequestAllowed, createCommentTranslatorAbuseRateLimitedSessionState } from "@/lib/comment-translator-abuse-rate-limit-runtime";
import {
  createCommentTranslatorDurableSessionFailClosedState,
  createCommentTranslatorPreAuthorityFailClosedResult,
  createCommentTranslatorPreAuthorityRateLimitResult,
  createTrustedCommentTranslatorSessionSupabaseStore,
  readCommentTranslatorDurableActiveSessionOrFailClosed,
  resolveCommentTranslatorPreAuthorityBlockedResult,
  stopCommentTranslatorActivePaidSessionForUnreadableAuthority
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
import {
  createCommentTranslatorPaidPreSessionPollBudgetReference,
  createCommentTranslatorPaidSessionPlanEntitlement,
  createCommentTranslatorPaidSessionStopPlanEntitlement,
  readCommentTranslatorPaidSessionAuthority,
  resolveCommentTranslatorPaidSessionStopBaseline,
  resolveCommentTranslatorPublicEntitlementBaseline
} from "@/lib/comment-translator-public-entitlement-baseline";
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
    return createCommentTranslatorPreAuthorityRateLimitResult({ check: abuseCheck });
  }
  const durableSessionStore = createTrustedCommentTranslatorSessionSupabaseStore();
  const durableActiveSessionRead = await readCommentTranslatorDurableActiveSessionOrFailClosed({
    callerAuthorization,
    durableSessionStore
  });
  if (durableActiveSessionRead.status === "fail-closed") {
    return createCommentTranslatorPreAuthorityFailClosedResult({ durableActiveSessionRead });
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
      return resolveCommentTranslatorPreAuthorityBlockedResult({
        durableActiveSessionRead,
        blockedResult: createCommentTranslatorAbuseRateLimitedSessionState({ nowMs, plan: "free", check: privateLaunchAbuseCheck })
      });
    }
    return resolveCommentTranslatorPreAuthorityBlockedResult({
      durableActiveSessionRead,
      blockedResult: createCommentTranslatorPrivateLaunchBlockedSessionState({ nowMs, plan: "free", access: launchAccess })
    });
  }
  const previewRateLimitSmokeOverride = resolveCommentTranslatorFreeBetaPreviewRateLimitSmokeOverride({
    privateLaunchAccess: readCommentTranslatorPrivateLaunchAccess({ callerAuthorization })
  });
  const durableUsageCounterStore = createTrustedCommentTranslatorUsageCounterSupabaseStore();
  const activeSession = durableActiveSessionRead.activeSession;
  const activePaidSession = activeSession?.plan === "paid";
  const paidSessionAuthorityRead = intent === "stop" || (activeSession !== null && !activePaidSession)
    ? { status: "not-entitled" as const, entitlement: null }
    : await readCommentTranslatorPaidSessionAuthority({
        callerAuthorization,
        nowMs,
        pollBudgetSessionReferenceId: activeSession?.sessionReferenceId
          ?? createCommentTranslatorPaidPreSessionPollBudgetReference(callerAuthorization),
        allowEmptyPollBudgetInitialization: activeSession === null
      });
  if (intent !== "stop" && activePaidSession && activeSession && paidSessionAuthorityRead.status !== "ready") {
    return stopCommentTranslatorActivePaidSessionForUnreadableAuthority({
      callerAuthorization,
      durableSessionStore,
      activeSession,
      nowMs
    });
  }
  if (intent !== "stop" && paidSessionAuthorityRead.status === "fail-closed") {
    if (paidSessionAuthorityRead.entitlement) {
      return createCommentTranslatorDurableSessionFailClosedState({ nowMs, plan: "paid", reason: "paid-authority-unreadable" });
    }
    return createCommentTranslatorPreAuthorityFailClosedResult({ durableActiveSessionRead });
  }
  const paidSessionAuthority = !activeSession || activePaidSession
    ? paidSessionAuthorityRead.status === "ready" ? paidSessionAuthorityRead : null
    : null;
  const paidPlanEntitlement = paidSessionAuthority
    ? createCommentTranslatorPaidSessionPlanEntitlement({ costAuthority: paidSessionAuthority.costAuthority })
    : activePaidSession && intent === "stop"
      ? createCommentTranslatorPaidSessionStopPlanEntitlement()
    : undefined;
  const plan = activePaidSession || (!activeSession && paidSessionAuthority) ? "paid" : "free";
  const durableUsageRead = await readCommentTranslatorDurableUsageSnapshotOrFailClosed({
    callerAuthorization,
    durableUsageCounterStore,
    nowMs,
    plan,
    activeSession,
    paidEntitlement: paidPlanEntitlement,
    planEntitlementOverride: plan === "paid" ? undefined : previewRateLimitSmokeOverride
  });
  const entitlementBaseline = activePaidSession && intent === "stop"
    ? resolveCommentTranslatorPaidSessionStopBaseline({ durableUsageRead })
    : resolveCommentTranslatorPublicEntitlementBaseline({
        durableUsageRead,
        paidAuthority: paidSessionAuthority ?? undefined,
        previewRateLimitSmokeOverride
      });
  if (entitlementBaseline.status === "fail-closed") {
    if (activePaidSession && activeSession) {
      return stopCommentTranslatorActivePaidSessionForUnreadableAuthority({
        callerAuthorization,
        durableSessionStore,
        activeSession,
        nowMs
      });
    }
    return createCommentTranslatorDurableSessionFailClosedState({
      nowMs,
      plan,
      reason: plan === "paid" ? "global-budget-stop" : "session-limit"
    });
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
      sourceLanguages: sourceLanguage ? [sourceLanguage] : undefined,
      paidSessionAuthority
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
    sourceLanguages: sourceLanguage ? [sourceLanguage] : undefined,
    paidSessionAuthority
  });
}

function mapSessionIntentToAbuseAction(intent: CommentTranslatorSessionCommandIntent) {
  if (intent === "start") return "session-start";
  if (intent === "stop") return "session-stop";
  if (intent === "heartbeat") return "session-heartbeat";
  return "session-status";
}
