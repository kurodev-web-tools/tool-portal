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
  type CommentTranslatorActiveSessionRecord,
  type CommentTranslatorSessionCommandIntent,
  type CommentTranslatorSessionStopReason
} from "@/lib/comment-translator-session-runtime";
import {
  createCommentTranslatorDurableSessionFailClosedState,
  createTrustedCommentTranslatorSessionSupabaseStore,
  persistCommentTranslatorDurableSessionStateOrFailClosed,
  readCommentTranslatorDurableActiveSessionOrFailClosed
} from "@/lib/comment-translator-durable-session-store";
import {
  recordInMemoryCommentTranslatorSessionLedgerState
} from "@/lib/comment-translator-usage-ledger-runtime";
import {
  createTrustedCommentTranslatorUsageCounterSupabaseStore,
  readCommentTranslatorDurableUsageSnapshotOrFailClosed,
  recordCommentTranslatorDurableSessionLedgerStateOrFailClosed
} from "@/lib/comment-translator-durable-usage-counter-store";
import { readCommentTranslatorBillingEntitlementSnapshot } from "@/lib/comment-translator-billing-runtime";
import { resolveCommentTranslatorPublicEntitlementBaseline } from "@/lib/comment-translator-public-entitlement-baseline";
import {
  createCommentTranslatorFreeBetaRetentionAttributionState,
  type CommentTranslatorFreeBetaRetentionAttributionState
} from "@/lib/comment-translator-free-beta-retention-attribution";
import {
  readCommentTranslatorCreatorWaitlistStateWithStore,
  registerCommentTranslatorCreatorWaitlistWithStore,
  type CommentTranslatorCreatorWaitlistAccount,
  type CommentTranslatorCreatorWaitlistRegistrationResult,
  type CommentTranslatorCreatorWaitlistState
} from "@/lib/comment-translator-free-beta-creator-locked-waitlist";
import { createTrustedCommentTranslatorCreatorWaitlistSupabaseStore } from "@/lib/comment-translator-creator-waitlist-durable-store";
import {
  resolveCommentTranslatorServerOnlyLiveChatTargetLookupForStart
} from "@/lib/comment-translator-server-only-live-chat-target-lookup";
import {
  clearCommentTranslatorBoundedLiveChatPollingState,
  readCommentTranslatorBoundedLiveChatPollingTick,
  seedCommentTranslatorBoundedLiveChatPollingStateForActiveSession
} from "@/lib/comment-translator-bounded-live-chat-polling-wiring";
import { createTrustedCommentTranslatorYouTubeLiveProviderRuntimeAdapter } from "@/lib/comment-translator-youtube-live-provider-runtime-adapter";
import { runCommentTranslatorLiveProviderSessionStep } from "@/lib/comment-translator-live-provider-session-step";
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
  createTrustedYouTubeOAuthCredentialSupabaseStatusReader,
  createTrustedYouTubeOAuthCredentialSupabaseTokenMaterialRuntime
} from "@/lib/comment-translator-youtube-token-store-supabase-adapter";
import { createTrustedYouTubeOAuthStoredCredentialRefreshRuntime } from "@/lib/comment-translator-youtube-token-material-runtime";
import { createUnavailableCommentTranslatorRealCommentsFeedState } from "@/lib/comment-translator-real-comments-ui-wiring";
import {
  attachCommentTranslatorLiveProviderDiagnosticsToFeed,
  type CommentTranslatorLiveProviderDiagnostics
} from "@/lib/comment-translator-real-comments-feed-shared";
import { readYouTubeOAuthCredentialReferenceForCaller } from "@/lib/comment-translator-youtube-account-integration-status";
import { readCommentTranslatorToolCredentialStatus } from "@/lib/comment-translator-youtube-tool-credential-source";
import { isYouTubeOAuthCredentialResolutionDisabled } from "@/lib/comment-translator-youtube-token-store-runtime";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  clearCommentTranslatorRealCommentsFeedForSession,
  readCommentTranslatorRealCommentsFeedForActiveSession
} from "@/lib/comment-translator-real-comments-feed-session-bridge";
import {
  createTrustedCommentTranslatorRealCommentsFeedDurableStore
} from "@/lib/comment-translator-real-comments-feed-durable-store";
import {
  clearCommentTranslatorAzureNormalTranslationSessionDedupeState
} from "@/lib/comment-translator-azure-normal-translation-execution";
import type { CommentTranslatorSourceLanguageId, CommentTranslatorTargetLanguageId } from "@/lib/comment-translator";

const credentialResolutionDisabledEnv = "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED";

type CommentTranslatorSessionLanguageActionOptions = {
  sourceLanguage?: CommentTranslatorSourceLanguageId;
  targetLanguage?: CommentTranslatorTargetLanguageId;
};

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

export async function getCommentTranslatorSessionStatusAction(options: CommentTranslatorSessionLanguageActionOptions = {}) {
  return readCommentTranslatorSessionActionResult({
    intent: "status",
    sourceLanguage: options.sourceLanguage,
    targetLanguage: options.targetLanguage
  });
}

export async function startCommentTranslatorSessionAction(options: CommentTranslatorSessionLanguageActionOptions = {}) {
  return readCommentTranslatorSessionActionResult({
    intent: "start",
    sourceLanguage: options.sourceLanguage,
    targetLanguage: options.targetLanguage
  });
}

export async function stopCommentTranslatorSessionAction() {
  return readCommentTranslatorSessionActionResult({
    intent: "stop",
    stopReason: "user-stop"
  });
}

export async function clearCommentTranslatorPreviewFeedAction({
  sessionReferenceId
}: {
  sessionReferenceId?: string | null;
} = {}) {
  const callerAuthorization = await readCallerAuthorization();
  await clearCommentTranslatorRealCommentsFeedForSession({
    callerAuthorization,
    sessionReferenceId,
    durableFeedStore: createTrustedCommentTranslatorRealCommentsFeedDurableStore()
  });

  return createUnavailableCommentTranslatorRealCommentsFeedState({
    reason: "session-not-active"
  });
}

export async function heartbeatCommentTranslatorSessionAction(options: CommentTranslatorSessionLanguageActionOptions = {}) {
  return readCommentTranslatorSessionActionResult({
    intent: "heartbeat",
    sourceLanguage: options.sourceLanguage,
    targetLanguage: options.targetLanguage
  });
}

export async function restoreCommentTranslatorPersistedRealCommentsFeedAction(
  options: CommentTranslatorSessionLanguageActionOptions = {}
) {
  void options;
  const callerAuthorization = await readCallerAuthorization();
  const durableFeedStore = createTrustedCommentTranslatorRealCommentsFeedDurableStore();
  const durableSessionStore = createTrustedCommentTranslatorSessionSupabaseStore();
  const durableActiveSessionRead = await readCommentTranslatorDurableActiveSessionOrFailClosed({
    callerAuthorization,
    durableSessionStore
  });

  if (durableActiveSessionRead.status !== "ready") {
    return createUnavailableCommentTranslatorRealCommentsFeedState({
      reason: "polling-runtime-not-wired"
    });
  }

  return readCommentTranslatorRealCommentsFeedForActiveSession({
    callerAuthorization,
    activeSession: durableActiveSessionRead.activeSession,
    durableFeedStore
  });
}

export async function getCommentTranslatorRealCommentsFeedAction(options: CommentTranslatorSessionLanguageActionOptions = {}) {
  const callerAuthorization = await readCallerAuthorization();
  const durableFeedStore = createTrustedCommentTranslatorRealCommentsFeedDurableStore();
  const durableSessionStore = createTrustedCommentTranslatorSessionSupabaseStore();
  const durableActiveSessionRead = await readCommentTranslatorDurableActiveSessionOrFailClosed({
    callerAuthorization,
    durableSessionStore
  });

  if (durableActiveSessionRead.status !== "ready") {
    return createUnavailableCommentTranslatorRealCommentsFeedState({
      reason: "polling-runtime-not-wired"
    });
  }

  const activeSession = durableActiveSessionRead.activeSession;
  let liveProviderUnavailableReason: "polling-runtime-not-wired" | null = null;
  let liveProviderDiagnostics: CommentTranslatorLiveProviderDiagnostics | null = null;
  if (activeSession) {
    const nowMs = Date.now();
    const billingSnapshot = readCommentTranslatorBillingEntitlementSnapshot({ callerAuthorization });
    const durableUsageCounterStore = createTrustedCommentTranslatorUsageCounterSupabaseStore();
    const durableUsageRead = await readCommentTranslatorDurableUsageSnapshotOrFailClosed({
      callerAuthorization,
      durableUsageCounterStore,
      nowMs,
      plan: "free",
      activeSession
    });
    const entitlementBaseline = resolveCommentTranslatorPublicEntitlementBaseline({
      billingSnapshot,
      durableUsageRead
    });
    if (entitlementBaseline.status === "ready") {
      const credentialReadiness = await readCredentialReadiness({ activeSession, callerAuthorization });
      const liveProviderRuntime = createTrustedCommentTranslatorYouTubeLiveProviderRuntimeAdapter({
        credentialReferenceId: activeSession.credentialReferenceId,
        callerAuthorization
      });
      const liveProviderStep = await runCommentTranslatorLiveProviderSessionStep({
        activeSession,
        usage: entitlementBaseline.usage,
        callerAuthorization,
        credentialReadiness,
        targetLookupAdapter: liveProviderRuntime.targetLookupAdapter,
        pollingAdapter: liveProviderRuntime.pollingAdapter,
        durableUsageCounterStore,
        nowMs,
        targetLanguage: options.targetLanguage ?? "ja",
        sourceLanguages: createCommentTranslatorActionSourceLanguages(options.sourceLanguage)
      });
      liveProviderDiagnostics = liveProviderStep.diagnostics;
      if (
        liveProviderStep.pollingTick.status === "unavailable-missing-server-only-polling-state" ||
        liveProviderStep.pollingTick.status === "unavailable-polling-runtime-not-approved"
      ) {
        liveProviderUnavailableReason = "polling-runtime-not-wired";
      }
    }
  }

  const feed = await readCommentTranslatorRealCommentsFeedForActiveSession({
    callerAuthorization,
    activeSession,
    durableFeedStore
  });

  if (feed.status === "unavailable" && feed.unavailableReason === "live-provider-polling-not-approved" && liveProviderUnavailableReason) {
    return createUnavailableCommentTranslatorRealCommentsFeedState({
      reason: liveProviderUnavailableReason,
      liveProviderDiagnostics
    });
  }

  return attachCommentTranslatorLiveProviderDiagnosticsToFeed({
    feed,
    diagnostics: liveProviderDiagnostics
  });
}

export async function requestCommentTranslatorDataDeletionAction(): Promise<CommentTranslatorFreeBetaRetentionAttributionState> {
  const readiness = await readCommentTranslatorFreeBetaDerivedReadiness();

  return createCommentTranslatorFreeBetaRetentionAttributionState({
    ...readiness,
    nowMs: readiness.nowMs
  });
}

export async function getCommentTranslatorCreatorWaitlistAction(): Promise<CommentTranslatorCreatorWaitlistState> {
  const account = await readCreatorWaitlistAccount();
  const storeFactory = createTrustedCommentTranslatorCreatorWaitlistSupabaseStore();

  return readCommentTranslatorCreatorWaitlistStateWithStore({
    account,
    store: storeFactory.status === "ready" ? storeFactory.store : null
  });
}

export async function registerCommentTranslatorCreatorWaitlistAction(): Promise<CommentTranslatorCreatorWaitlistRegistrationResult> {
  const account = await readCreatorWaitlistAccount();
  const storeFactory = createTrustedCommentTranslatorCreatorWaitlistSupabaseStore();

  return registerCommentTranslatorCreatorWaitlistWithStore({
    account,
    store: storeFactory.status === "ready" ? storeFactory.store : null,
    nowMs: Date.now()
  });
}

async function readCommentTranslatorFreeBetaDerivedReadiness(): Promise<{
  durableSessionState: "ready" | "unreadable";
  durableUsageState: "ready" | "unreadable";
  entitlementState: "ready" | "missing";
  providerReadinessState: "ready" | "missing";
  nowMs: number;
}> {
  const callerAuthorization = await readCallerAuthorization();
  const nowMs = Date.now();
  const durableSessionStore = createTrustedCommentTranslatorSessionSupabaseStore();
  const durableUsageCounterStore = createTrustedCommentTranslatorUsageCounterSupabaseStore();
  const durableActiveSessionRead = await readCommentTranslatorDurableActiveSessionOrFailClosed({
    callerAuthorization,
    durableSessionStore
  });
  const durableSessionState = durableActiveSessionRead.status === "ready" ? "ready" : "unreadable";
  const activeSession = durableActiveSessionRead.status === "ready" ? durableActiveSessionRead.activeSession : null;
  const durableUsageRead =
    durableSessionState === "ready"
      ? await readCommentTranslatorDurableUsageSnapshotOrFailClosed({
          callerAuthorization,
          durableUsageCounterStore,
          nowMs,
          plan: "free",
          activeSession
        })
      : null;
  const durableUsageState = durableUsageRead?.status === "ready" ? "ready" : "unreadable";
  const billingSnapshot = readCommentTranslatorBillingEntitlementSnapshot({ callerAuthorization });
  const entitlementBaseline = durableUsageRead
    ? resolveCommentTranslatorPublicEntitlementBaseline({
        billingSnapshot,
        durableUsageRead
      })
    : null;
  const credentialReadiness =
    durableSessionState === "ready" ? await readCredentialReadiness({ activeSession, callerAuthorization }) : null;

  return {
    durableSessionState,
    durableUsageState,
    entitlementState: entitlementBaseline?.status === "ready" ? "ready" : "missing",
    providerReadinessState: credentialReadiness?.status === "ready" ? "ready" : "missing",
    nowMs
  };
}

async function readCommentTranslatorSessionActionResult({
  intent,
  stopReason,
  sourceLanguage,
  targetLanguage = "ja"
}: {
  intent: CommentTranslatorSessionCommandIntent;
  stopReason?: CommentTranslatorSessionStopReason;
  sourceLanguage?: CommentTranslatorSourceLanguageId;
  targetLanguage?: CommentTranslatorTargetLanguageId;
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

  const billingSnapshot = readCommentTranslatorBillingEntitlementSnapshot({ callerAuthorization });
  const durableSessionStore = createTrustedCommentTranslatorSessionSupabaseStore();
  const durableUsageCounterStore = createTrustedCommentTranslatorUsageCounterSupabaseStore();
  const durableActiveSessionRead = await readCommentTranslatorDurableActiveSessionOrFailClosed({
    callerAuthorization,
    durableSessionStore
  });
  if (durableActiveSessionRead.status === "fail-closed") {
    return createCommentTranslatorDurableSessionFailClosedState({
      nowMs,
      plan: "free"
    });
  }

  const activeSession = durableActiveSessionRead.activeSession;
  const durableUsageRead = await readCommentTranslatorDurableUsageSnapshotOrFailClosed({
    callerAuthorization,
    durableUsageCounterStore,
    nowMs,
    plan: "free",
    activeSession
  });
  const entitlementBaseline = resolveCommentTranslatorPublicEntitlementBaseline({
    billingSnapshot,
    durableUsageRead
  });
  if (entitlementBaseline.status === "fail-closed") {
    return createCommentTranslatorDurableSessionFailClosedState({
      nowMs,
      plan: "free"
    });
  }

  const usage = entitlementBaseline.usage;
  const credentialReadiness = await readCredentialReadiness({ activeSession, callerAuthorization });
  const credentialReferenceId =
    credentialReadiness.status === "ready"
      ? credentialReadiness.credentialReferenceId
      : activeSession?.credentialReferenceId;
  const liveProviderRuntime = createTrustedCommentTranslatorYouTubeLiveProviderRuntimeAdapter({
    credentialReferenceId,
    callerAuthorization
  });
  const liveChatTargetReadiness = await resolveCommentTranslatorServerOnlyLiveChatTargetLookupForStart({
    intent,
    credentialReadiness,
    adapter: liveProviderRuntime.targetLookupAdapter
  });
  const pollingStep =
    intent === "heartbeat"
      ? await runCommentTranslatorLiveProviderSessionStep({
          activeSession,
          usage,
          callerAuthorization,
          credentialReadiness,
          targetLookupAdapter: liveProviderRuntime.targetLookupAdapter,
          pollingAdapter: liveProviderRuntime.pollingAdapter,
          durableUsageCounterStore,
          nowMs,
          targetLanguage,
          sourceLanguages: createCommentTranslatorActionSourceLanguages(sourceLanguage)
        })
      : null;
  const pollingTick =
    intent === "status"
      ? createCommentTranslatorStatusRestorePollingTick()
      : (pollingStep?.pollingTick ??
        (await readCommentTranslatorBoundedLiveChatPollingTick({
          intent,
          activeSession,
          usage,
          adapter: liveProviderRuntime.pollingAdapter,
          nowMs
        })));
  const state = await readCommentTranslatorSessionCommand({
    intent,
    nowMs,
    plan: entitlementBaseline.plan,
    callerAuthorization,
    credentialReadiness,
    activeSession,
    usage,
    liveChatTargetReadiness,
    browserConnected: intent !== "stop",
    stopReason,
    providerSignal: pollingTick.providerSignal,
    providerSignalReasonUxCode: "reasonUxCode" in pollingTick ? pollingTick.reasonUxCode : null,
    createSessionReferenceId: () => `cts_${randomUUID()}`
  });

  const durablePersistResult = await persistCommentTranslatorDurableSessionStateOrFailClosed({
    callerAuthorization,
    durableSessionStore,
    state,
    planEntitlementReferenceId: usage.planEntitlement.planEntitlementReferenceId
  });
  if (durablePersistResult.status === "fail-closed") {
    return createCommentTranslatorDurableSessionFailClosedState({
      nowMs,
      plan: entitlementBaseline.plan
    });
  }

  const durableUsagePersistResult = await recordCommentTranslatorDurableSessionLedgerStateOrFailClosed({
    callerAuthorization,
    durableUsageCounterStore,
    intent,
    state,
    occurredAtMs: nowMs,
    planEntitlement: usage.planEntitlement
  });
  if (durableUsagePersistResult.status === "fail-closed") {
    return createCommentTranslatorDurableSessionFailClosedState({
      nowMs,
      plan: entitlementBaseline.plan
    });
  }

  if (state.status === "active" && intent === "start") {
    seedCommentTranslatorBoundedLiveChatPollingStateForActiveSession({
      state,
      liveChatTargetReadiness,
      nowMs
    });
  }

  if (state.status === "stopped") {
    clearCommentTranslatorBoundedLiveChatPollingState(state.sessionReferenceId);
    clearCommentTranslatorAzureNormalTranslationSessionDedupeState(state.sessionReferenceId);
  }

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

function createCommentTranslatorActionSourceLanguages(
  sourceLanguage?: CommentTranslatorSourceLanguageId
): readonly string[] | undefined {
  return sourceLanguage ? [sourceLanguage] : undefined;
}

function createCommentTranslatorStatusRestorePollingTick() {
  return {
    status: "skipped-status-intent-session-restore",
    providerAccess: "not-run",
    providerSignal: null,
    publicLaunchAllowed: false
  } as const;
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
  activeSession: CommentTranslatorActiveSessionRecord | null;
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
  const trustedTokenMaterialRuntime =
    credentialResolutionDisabled || callerAuthorization.status !== "authorized"
      ? null
      : createTrustedYouTubeOAuthCredentialSupabaseTokenMaterialRuntime();
  const status = await readYouTubeOAuthCredentialStatus({
    credentialReferenceId: activeSession.credentialReferenceId,
    trustedAdapter: trustedStatusReader?.trustedAdapter ?? null,
    trustedRefreshRuntime:
      trustedTokenMaterialRuntime?.status === "ready"
        ? createTrustedYouTubeOAuthStoredCredentialRefreshRuntime({
            tokenMaterialAdapter: trustedTokenMaterialRuntime.trustedTokenMaterialAdapter
          })
        : null,
    callerAuthorization,
    credentialResolutionDisabled
  });

  return assessYouTubeOAuthCredentialTranslatorStartReadiness(status);
}

async function readCreatorWaitlistAccount(): Promise<CommentTranslatorCreatorWaitlistAccount> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return {
      status: "unauthenticated",
      reason: "auth-unavailable"
    };
  }

  try {
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        status: "unauthenticated",
        reason: error ? "auth-unavailable" : "caller-not-authenticated"
      };
    }

    return {
      status: "authenticated",
      ownerUserId: user.id,
      email: user.email ?? null,
      displayName: readCreatorWaitlistDisplayName(user.user_metadata)
    };
  } catch {
    return {
      status: "unauthenticated",
      reason: "auth-unavailable"
    };
  }
}

function readCreatorWaitlistDisplayName(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const record = metadata as Record<string, unknown>;
  const value = record.display_name ?? record.full_name ?? record.name;
  return typeof value === "string" && value.trim() ? value.trim() : null;
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
