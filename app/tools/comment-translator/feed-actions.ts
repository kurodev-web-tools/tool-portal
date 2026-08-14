"use server";

import { assertCommentTranslatorAbuseRequestAllowed } from "@/lib/comment-translator-abuse-rate-limit-runtime";
import {
  createCommentTranslatorPreAuthorityFailClosedResult,
  createCommentTranslatorPreAuthorityRateLimitResult,
  createTrustedCommentTranslatorSessionSupabaseStore,
  readCommentTranslatorDurableActiveSessionOrFailClosed,
  stopCommentTranslatorActivePaidSessionForUnreadableAuthority
} from "@/lib/comment-translator-durable-session-store";
import { createTrustedCommentTranslatorUsageCounterSupabaseStore, readCommentTranslatorDurableUsageSnapshotOrFailClosed } from "@/lib/comment-translator-durable-usage-counter-store";
import { resolveCommentTranslatorFreeBetaPreviewRateLimitSmokeOverride } from "@/lib/comment-translator-free-beta-preview-rate-limit-smoke-override";
import { executeCommentTranslatorSessionCommand } from "@/lib/comment-translator-session-command-execution";
import { runCommentTranslatorLiveProviderSessionStep } from "@/lib/comment-translator-live-provider-session-step";
import { readCommentTranslatorPrivateLaunchAccess } from "@/lib/comment-translator-private-launch-access-gate";
import {
  createCommentTranslatorPaidSessionPlanEntitlement,
  readCommentTranslatorPaidSessionAuthority,
  resolveCommentTranslatorPublicEntitlementBaseline
} from "@/lib/comment-translator-public-entitlement-baseline";
import { createTrustedCommentTranslatorRealCommentsFeedDurableStore } from "@/lib/comment-translator-real-comments-feed-durable-store";
import {
  clearCommentTranslatorRealCommentsFeedForSession,
  readCommentTranslatorRealCommentsFeedForActiveSession
} from "@/lib/comment-translator-real-comments-feed-session-bridge";
import {
  attachCommentTranslatorLiveProviderDiagnosticsToFeed,
  type CommentTranslatorLiveProviderDiagnostics,
  type CommentTranslatorRealCommentsFeedState
} from "@/lib/comment-translator-real-comments-feed-shared";
import { createUnavailableCommentTranslatorRealCommentsFeedState } from "@/lib/comment-translator-real-comments-ui-wiring";
import { createTrustedCommentTranslatorYouTubeLiveProviderRuntimeAdapter } from "@/lib/comment-translator-youtube-live-provider-runtime-adapter";
import { readCommentTranslatorToolCredentialStatus } from "@/lib/comment-translator-youtube-tool-credential-source";
import type { CommentTranslatorSourceLanguageId, CommentTranslatorTargetLanguageId } from "@/lib/comment-translator";
import { readCommentTranslatorActionCallerAuthorization, readCommentTranslatorActionCredentialReadiness } from "./action-context";

type CommentTranslatorFeedLanguageOptions = {
  readonly sourceLanguage?: CommentTranslatorSourceLanguageId;
  readonly targetLanguage?: CommentTranslatorTargetLanguageId;
};

export async function clearCommentTranslatorPreviewFeedAction({
  sessionReferenceId
}: { readonly sessionReferenceId?: string | null } = {}) {
  const callerAuthorization = await readCommentTranslatorActionCallerAuthorization();
  await clearCommentTranslatorRealCommentsFeedForSession({
    callerAuthorization,
    sessionReferenceId,
    durableFeedStore: createTrustedCommentTranslatorRealCommentsFeedDurableStore()
  });
  return createUnavailableCommentTranslatorRealCommentsFeedState({ reason: "session-not-active" });
}

export async function restoreCommentTranslatorPersistedRealCommentsFeedAction(
  options: CommentTranslatorFeedLanguageOptions = {}
) {
  const targetLanguage = resolvePresentationTargetLanguage(options.targetLanguage);
  const callerAuthorization = await readCommentTranslatorActionCallerAuthorization();
  const durableActiveSessionRead = await readCommentTranslatorDurableActiveSessionOrFailClosed({
    callerAuthorization,
    durableSessionStore: createTrustedCommentTranslatorSessionSupabaseStore()
  });
  if (durableActiveSessionRead.status !== "ready") {
    return createUnavailableCommentTranslatorRealCommentsFeedState({ reason: "polling-runtime-not-wired" });
  }
  return readCommentTranslatorRealCommentsFeedForActiveSession({
    callerAuthorization,
    activeSession: durableActiveSessionRead.activeSession,
    targetLanguage,
    durableFeedStore: createTrustedCommentTranslatorRealCommentsFeedDurableStore()
  });
}

function resolvePresentationTargetLanguage(value: CommentTranslatorTargetLanguageId | undefined): CommentTranslatorTargetLanguageId {
  return value === "en" ? "en" : "ja";
}

export async function getCommentTranslatorRealCommentsFeedAction(options: CommentTranslatorFeedLanguageOptions = {}) {
  const callerAuthorization = await readCommentTranslatorActionCallerAuthorization();
  const nowMs = Date.now();
  const abuseCheck = assertCommentTranslatorAbuseRequestAllowed({
    surface: "comment-translator-server-actions",
    action: "session-heartbeat",
    callerAuthorization,
    nowMs
  });
  if (abuseCheck.status === "blocked") {
    return {
      ...createUnavailableCommentTranslatorRealCommentsFeedState({ reason: "polling-runtime-not-wired" }),
      sessionState: createCommentTranslatorPreAuthorityRateLimitResult({ check: abuseCheck })
    };
  }
  const durableSessionStore = createTrustedCommentTranslatorSessionSupabaseStore();
  const durableFeedStore = createTrustedCommentTranslatorRealCommentsFeedDurableStore();
  const durableActiveSessionRead = await readCommentTranslatorDurableActiveSessionOrFailClosed({
    callerAuthorization,
    durableSessionStore
  });
  if (durableActiveSessionRead.status !== "ready") {
    return {
      ...createUnavailableCommentTranslatorRealCommentsFeedState({ reason: "polling-runtime-not-wired" }),
      sessionState: createCommentTranslatorPreAuthorityFailClosedResult({ durableActiveSessionRead })
    };
  }
  const activeSession = durableActiveSessionRead.activeSession;
  if (activeSession?.plan === "paid") {
    const paidSessionAuthorityRead = await readCommentTranslatorPaidSessionAuthority({
      callerAuthorization,
      nowMs,
      pollBudgetSessionReferenceId: activeSession.sessionReferenceId
    });
    if (paidSessionAuthorityRead.status !== "ready") {
      const sessionState = await stopCommentTranslatorActivePaidSessionForUnreadableAuthority({
        callerAuthorization,
        durableSessionStore,
        activeSession,
        nowMs
      });
      return {
        ...createUnavailableCommentTranslatorRealCommentsFeedState({ reason: "durable-usage-ledger-unavailable" }),
        sessionState
      };
    }
    const paidSessionAuthority = paidSessionAuthorityRead;
    const durableUsageCounterStore = createTrustedCommentTranslatorUsageCounterSupabaseStore();
    const durableUsageRead = await readCommentTranslatorDurableUsageSnapshotOrFailClosed({
      callerAuthorization,
      durableUsageCounterStore,
      nowMs,
      plan: "paid",
      activeSession,
      paidEntitlement: createCommentTranslatorPaidSessionPlanEntitlement({ costAuthority: paidSessionAuthority.costAuthority })
    });
    const entitlementBaseline = resolveCommentTranslatorPublicEntitlementBaseline({
      durableUsageRead,
      paidAuthority: paidSessionAuthority
    });
    if (entitlementBaseline.status !== "ready") {
      const sessionState = await stopCommentTranslatorActivePaidSessionForUnreadableAuthority({
        callerAuthorization,
        durableSessionStore,
        activeSession,
        nowMs
      });
      return {
        ...createUnavailableCommentTranslatorRealCommentsFeedState({ reason: "durable-usage-ledger-unavailable" }),
        sessionState
      };
    }
    const credentialReadiness = await readCommentTranslatorActionCredentialReadiness({
      activeSession,
      callerAuthorization,
      readFallbackCredentialStatus: () => readCommentTranslatorToolCredentialStatus({ callerAuthorization })
    });
    // Paid feed polling is the single 15-second server boundary. The command
    // updates the durable heartbeat, runs the live step, persists the feed,
    // and persists the browser-safe session state in one action.
    let workerFeed: CommentTranslatorRealCommentsFeedState | null = null;
    const sessionState = await executeCommentTranslatorSessionCommand({
      intent: "heartbeat",
      nowMs,
      plan: "paid",
      callerAuthorization,
      credentialReadiness,
      credentialReferenceId: credentialReadiness.status === "ready"
        ? credentialReadiness.credentialReferenceId
        : activeSession.credentialReferenceId,
      activeSession,
      usage: entitlementBaseline.usage,
      durableSessionStore,
      durableUsageCounterStore,
      browserConnected: true,
      targetLanguage: options.targetLanguage ?? "ja",
      sourceLanguages: options.sourceLanguage ? [options.sourceLanguage] : undefined,
      paidSessionAuthority,
      durableFeedStore,
      onSafeFeed: (safeFeed) => {
        workerFeed = safeFeed;
      }
    });
    const feed = workerFeed ?? createUnavailableCommentTranslatorRealCommentsFeedState({
      reason: "live-provider-polling-not-approved"
    });
    // Preserve the existing feed response shape while attaching the
    // browser-safe command result so the client can stop auto-polling on the
    // same response that reports a Paid budget stop.
    return { ...feed, sessionState };
  }
  let liveProviderUnavailableReason: "polling-runtime-not-wired" | null = null;
  let liveProviderDiagnostics: CommentTranslatorLiveProviderDiagnostics | null = null;
  let workerFeed: CommentTranslatorRealCommentsFeedState | null = null;
  if (activeSession) {
    const previewRateLimitSmokeOverride = resolveCommentTranslatorFreeBetaPreviewRateLimitSmokeOverride({
      privateLaunchAccess: readCommentTranslatorPrivateLaunchAccess({ callerAuthorization })
    });
    const durableUsageCounterStore = createTrustedCommentTranslatorUsageCounterSupabaseStore();
    const durableUsageRead = await readCommentTranslatorDurableUsageSnapshotOrFailClosed({
      callerAuthorization,
      durableUsageCounterStore,
      nowMs,
      plan: "free",
      activeSession,
      planEntitlementOverride: previewRateLimitSmokeOverride
    });
    const entitlementBaseline = resolveCommentTranslatorPublicEntitlementBaseline({
      durableUsageRead,
      previewRateLimitSmokeOverride
    });
    if (entitlementBaseline.status === "ready") {
      const credentialReadiness = await readCommentTranslatorActionCredentialReadiness({
        activeSession,
        callerAuthorization,
        readFallbackCredentialStatus: () => readCommentTranslatorToolCredentialStatus({ callerAuthorization })
      });
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
        sourceLanguages: options.sourceLanguage ? [options.sourceLanguage] : undefined,
        durableFeedStore
      });
      workerFeed = liveProviderStep.safeFeed ?? null;
      liveProviderDiagnostics = liveProviderStep.diagnostics;
      if (liveProviderStep.pollingTick.status === "unavailable-missing-server-only-polling-state" ||
          liveProviderStep.pollingTick.status === "unavailable-polling-runtime-not-approved") {
        liveProviderUnavailableReason = "polling-runtime-not-wired";
      }
    }
  }
  const feed = workerFeed ?? createUnavailableCommentTranslatorRealCommentsFeedState({
    reason: activeSession ? "live-provider-polling-not-approved" : "session-not-active"
  });
  if (feed.status === "unavailable" && feed.unavailableReason === "live-provider-polling-not-approved" && liveProviderUnavailableReason) {
    return createUnavailableCommentTranslatorRealCommentsFeedState({
      reason: liveProviderUnavailableReason,
      liveProviderDiagnostics
    });
  }
  return attachCommentTranslatorLiveProviderDiagnosticsToFeed({ feed, diagnostics: liveProviderDiagnostics });
}
