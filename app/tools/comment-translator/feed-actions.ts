"use server";

import { readCommentTranslatorBillingEntitlementSnapshot } from "@/lib/comment-translator-billing-runtime";
import { createTrustedCommentTranslatorSessionSupabaseStore, readCommentTranslatorDurableActiveSessionOrFailClosed } from "@/lib/comment-translator-durable-session-store";
import { createTrustedCommentTranslatorUsageCounterSupabaseStore, readCommentTranslatorDurableUsageSnapshotOrFailClosed } from "@/lib/comment-translator-durable-usage-counter-store";
import { resolveCommentTranslatorFreeBetaPreviewRateLimitSmokeOverride } from "@/lib/comment-translator-free-beta-preview-rate-limit-smoke-override";
import { runCommentTranslatorLiveProviderSessionStep } from "@/lib/comment-translator-live-provider-session-step";
import { readCommentTranslatorPrivateLaunchAccess } from "@/lib/comment-translator-private-launch-access-gate";
import { resolveCommentTranslatorPublicEntitlementBaseline } from "@/lib/comment-translator-public-entitlement-baseline";
import { createTrustedCommentTranslatorRealCommentsFeedDurableStore } from "@/lib/comment-translator-real-comments-feed-durable-store";
import {
  clearCommentTranslatorRealCommentsFeedForSession,
  readCommentTranslatorRealCommentsFeedForActiveSession
} from "@/lib/comment-translator-real-comments-feed-session-bridge";
import { attachCommentTranslatorLiveProviderDiagnosticsToFeed, type CommentTranslatorLiveProviderDiagnostics } from "@/lib/comment-translator-real-comments-feed-shared";
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
  void options;
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
    durableFeedStore: createTrustedCommentTranslatorRealCommentsFeedDurableStore()
  });
}

export async function getCommentTranslatorRealCommentsFeedAction(options: CommentTranslatorFeedLanguageOptions = {}) {
  const callerAuthorization = await readCommentTranslatorActionCallerAuthorization();
  const durableFeedStore = createTrustedCommentTranslatorRealCommentsFeedDurableStore();
  const durableActiveSessionRead = await readCommentTranslatorDurableActiveSessionOrFailClosed({
    callerAuthorization,
    durableSessionStore: createTrustedCommentTranslatorSessionSupabaseStore()
  });
  if (durableActiveSessionRead.status !== "ready") {
    return createUnavailableCommentTranslatorRealCommentsFeedState({ reason: "polling-runtime-not-wired" });
  }
  const activeSession = durableActiveSessionRead.activeSession;
  let liveProviderUnavailableReason: "polling-runtime-not-wired" | null = null;
  let liveProviderDiagnostics: CommentTranslatorLiveProviderDiagnostics | null = null;
  if (activeSession) {
    const nowMs = Date.now();
    const billingSnapshot = readCommentTranslatorBillingEntitlementSnapshot({ callerAuthorization });
    const durableUsageCounterStore = createTrustedCommentTranslatorUsageCounterSupabaseStore();
    const durableUsageRead = await readCommentTranslatorDurableUsageSnapshotOrFailClosed({
      callerAuthorization, durableUsageCounterStore, nowMs, plan: "free", activeSession
    });
    const entitlementBaseline = resolveCommentTranslatorPublicEntitlementBaseline({
      billingSnapshot,
      durableUsageRead,
      previewRateLimitSmokeOverride: resolveCommentTranslatorFreeBetaPreviewRateLimitSmokeOverride({
        privateLaunchAccess: readCommentTranslatorPrivateLaunchAccess({ callerAuthorization })
      })
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
        sourceLanguages: options.sourceLanguage ? [options.sourceLanguage] : undefined
      });
      liveProviderDiagnostics = liveProviderStep.diagnostics;
      if (liveProviderStep.pollingTick.status === "unavailable-missing-server-only-polling-state" ||
          liveProviderStep.pollingTick.status === "unavailable-polling-runtime-not-approved") {
        liveProviderUnavailableReason = "polling-runtime-not-wired";
      }
    }
  }
  const feed = await readCommentTranslatorRealCommentsFeedForActiveSession({
    callerAuthorization, activeSession, durableFeedStore
  });
  if (feed.status === "unavailable" && feed.unavailableReason === "live-provider-polling-not-approved" && liveProviderUnavailableReason) {
    return createUnavailableCommentTranslatorRealCommentsFeedState({
      reason: liveProviderUnavailableReason,
      liveProviderDiagnostics
    });
  }
  return attachCommentTranslatorLiveProviderDiagnosticsToFeed({ feed, diagnostics: liveProviderDiagnostics });
}
