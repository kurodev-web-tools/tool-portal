"use server";

import { readCommentTranslatorBillingEntitlementSnapshot } from "@/lib/comment-translator-billing-runtime";
import { createTrustedCommentTranslatorCreatorWaitlistSupabaseStore } from "@/lib/comment-translator-creator-waitlist-durable-store";
import { createTrustedCommentTranslatorSessionSupabaseStore, readCommentTranslatorDurableActiveSessionOrFailClosed } from "@/lib/comment-translator-durable-session-store";
import { createTrustedCommentTranslatorUsageCounterSupabaseStore, readCommentTranslatorDurableUsageSnapshotOrFailClosed } from "@/lib/comment-translator-durable-usage-counter-store";
import {
  readCommentTranslatorCreatorWaitlistStateWithStore,
  registerCommentTranslatorCreatorWaitlistWithStore,
  type CommentTranslatorCreatorWaitlistRegistrationResult,
  type CommentTranslatorCreatorWaitlistState
} from "@/lib/comment-translator-free-beta-creator-locked-waitlist";
import { resolveCommentTranslatorFreeBetaPreviewRateLimitSmokeOverride } from "@/lib/comment-translator-free-beta-preview-rate-limit-smoke-override";
import {
  createCommentTranslatorFreeBetaRetentionAttributionState,
  type CommentTranslatorFreeBetaRetentionAttributionState
} from "@/lib/comment-translator-free-beta-retention-attribution";
import { readCommentTranslatorPrivateLaunchAccess } from "@/lib/comment-translator-private-launch-access-gate";
import { resolveCommentTranslatorPublicEntitlementBaseline } from "@/lib/comment-translator-public-entitlement-baseline";
import { readCommentTranslatorToolCredentialStatus } from "@/lib/comment-translator-youtube-tool-credential-source";
import {
  readCommentTranslatorActionCallerAuthorization,
  readCommentTranslatorActionCredentialReadiness,
  readCommentTranslatorCreatorWaitlistAccount
} from "./action-context";

export async function requestCommentTranslatorDataDeletionAction(): Promise<CommentTranslatorFreeBetaRetentionAttributionState> {
  const readiness = await readCommentTranslatorFreeBetaDerivedReadiness();
  return createCommentTranslatorFreeBetaRetentionAttributionState({ ...readiness, nowMs: readiness.nowMs });
}

export async function getCommentTranslatorCreatorWaitlistAction(): Promise<CommentTranslatorCreatorWaitlistState> {
  const account = await readCommentTranslatorCreatorWaitlistAccount();
  const storeFactory = createTrustedCommentTranslatorCreatorWaitlistSupabaseStore();
  return readCommentTranslatorCreatorWaitlistStateWithStore({
    account,
    store: storeFactory.status === "ready" ? storeFactory.store : null
  });
}

export async function registerCommentTranslatorCreatorWaitlistAction(): Promise<CommentTranslatorCreatorWaitlistRegistrationResult> {
  const account = await readCommentTranslatorCreatorWaitlistAccount();
  const storeFactory = createTrustedCommentTranslatorCreatorWaitlistSupabaseStore();
  return registerCommentTranslatorCreatorWaitlistWithStore({
    account,
    store: storeFactory.status === "ready" ? storeFactory.store : null,
    nowMs: Date.now()
  });
}

async function readCommentTranslatorFreeBetaDerivedReadiness(): Promise<{
  readonly durableSessionState: "ready" | "unreadable";
  readonly durableUsageState: "ready" | "unreadable";
  readonly entitlementState: "ready" | "missing";
  readonly providerReadinessState: "ready" | "missing";
  readonly nowMs: number;
}> {
  const callerAuthorization = await readCommentTranslatorActionCallerAuthorization();
  const nowMs = Date.now();
  const durableSessionStore = createTrustedCommentTranslatorSessionSupabaseStore();
  const durableUsageCounterStore = createTrustedCommentTranslatorUsageCounterSupabaseStore();
  const durableActiveSessionRead = await readCommentTranslatorDurableActiveSessionOrFailClosed({
    callerAuthorization,
    durableSessionStore
  });
  const durableSessionState = durableActiveSessionRead.status === "ready" ? "ready" : "unreadable";
  const activeSession = durableActiveSessionRead.status === "ready" ? durableActiveSessionRead.activeSession : null;
  const previewRateLimitSmokeOverride = resolveCommentTranslatorFreeBetaPreviewRateLimitSmokeOverride({
    privateLaunchAccess: readCommentTranslatorPrivateLaunchAccess({ callerAuthorization })
  });
  const durableUsageRead = durableSessionState === "ready"
    ? await readCommentTranslatorDurableUsageSnapshotOrFailClosed({
        callerAuthorization,
        durableUsageCounterStore,
        nowMs,
        plan: "free",
        activeSession,
        planEntitlementOverride: previewRateLimitSmokeOverride
      })
    : null;
  const durableUsageState = durableUsageRead?.status === "ready" ? "ready" : "unreadable";
  const billingSnapshot = durableUsageRead
    ? await readCommentTranslatorBillingEntitlementSnapshot({ callerAuthorization })
    : null;
  const entitlementBaseline = durableUsageRead && billingSnapshot
    ? resolveCommentTranslatorPublicEntitlementBaseline({
        billingSnapshot,
        durableUsageRead,
        previewRateLimitSmokeOverride
      })
    : null;
  const credentialReadiness = durableSessionState === "ready"
    ? await readCommentTranslatorActionCredentialReadiness({
        activeSession,
        callerAuthorization,
        readFallbackCredentialStatus: () => readCommentTranslatorToolCredentialStatus({ callerAuthorization })
      })
    : null;
  return {
    durableSessionState,
    durableUsageState,
    entitlementState: entitlementBaseline?.status === "ready" ? "ready" : "missing",
    providerReadinessState: credentialReadiness?.status === "ready" ? "ready" : "missing",
    nowMs
  };
}
