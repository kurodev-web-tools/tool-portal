"use server";

import {
  authorizeCommentTranslatorCreatorCaller,
  authorizeCommentTranslatorCreatorPaidProvider,
  commentTranslatorCreatorPaidActivationPolicy
} from "@/lib/comment-translator-creator-entitlement-runtime";
import { createTrustedCommentTranslatorCreatorEntitlementStore } from "@/lib/comment-translator-creator-entitlement-store";
import { projectCommentTranslatorCreatorSafeHistoryRow } from "@/lib/comment-translator-creator-history-projection";
import { createCommentTranslatorCreatorSafeHistoryRuntime } from "@/lib/comment-translator-creator-history-runtime";
import { createTrustedCommentTranslatorCreatorSafeHistoryStore } from "@/lib/comment-translator-creator-history-store";
import type { CommentTranslatorCreatorSafeHistorySnapshot } from "@/lib/comment-translator-creator-history-types";
import { createTrustedCommentTranslatorSessionSupabaseStore } from "@/lib/comment-translator-durable-session-store";
import { readCommentTranslatorRealCommentsFeedForActiveSession } from "@/lib/comment-translator-real-comments-feed-session-bridge";
import { createTrustedCommentTranslatorRealCommentsFeedDurableStore } from "@/lib/comment-translator-real-comments-feed-durable-store";
import { isCommentTranslatorHeartbeatMissing } from "@/lib/comment-translator-session-policy";
import { readCommentTranslatorActionCallerAuthorization } from "./action-context";

export const commentTranslatorCreatorSafeHistoryActionsContract = {
  productionActivation: "fixed-closed-through-nc-e1-policy",
  paidAuthority: "nc-d1-store-and-nc-e1-authorizer-after-approved-policy-change",
  cleanupWiring: "server-orchestration-seam-not-wired-to-existing-oauth-or-deletion-request"
} as const;

export async function readCommentTranslatorCreatorSafeHistoryAction() {
  const context = await createCommentTranslatorCreatorSafeHistoryActionContext();
  return context.runtime.read({ callerAuthority: context.callerAuthority, nowMs: Date.now() });
}

export async function captureCommentTranslatorCreatorSafeHistoryAction() {
  const context = await createCommentTranslatorCreatorSafeHistoryActionContext();
  return context.runtime.capture({ callerAuthority: context.callerAuthority, nowMs: Date.now() });
}

export async function cleanupCommentTranslatorCreatorSafeHistoryForDisconnectAction() {
  const context = await createCommentTranslatorCreatorSafeHistoryActionContext();
  return context.runtime.cleanupForDisconnect({ callerAuthority: context.callerAuthority });
}

export async function cleanupCommentTranslatorCreatorSafeHistoryForAccountDeletionAction() {
  const context = await createCommentTranslatorCreatorSafeHistoryActionContext();
  return context.runtime.cleanupForAccountDeletion({ callerAuthority: context.callerAuthority });
}

async function createCommentTranslatorCreatorSafeHistoryActionContext() {
  const actionAuthorization = await readCommentTranslatorActionCallerAuthorization();
  const callerAuthority = authorizeCommentTranslatorCreatorCaller({
    callerUserId: actionAuthorization.status === "authorized" ? actionAuthorization.ownerUserId : null,
    authUnavailable: actionAuthorization.status === "unavailable"
  });
  const durableSessionStore = createTrustedCommentTranslatorSessionSupabaseStore();
  const durableFeedStore = createTrustedCommentTranslatorRealCommentsFeedDurableStore();
  const historyStore = createTrustedCommentTranslatorCreatorSafeHistoryStore();
  const createEntitlementStore = createTrustedCommentTranslatorCreatorEntitlementStore;

  const runtime = createCommentTranslatorCreatorSafeHistoryRuntime({
    historyStore: historyStore.status === "ready" ? historyStore.store : null,
    paidAuthority: async ({ callerAuthority: paidCallerAuthority, nowMs }) => {
      if (commentTranslatorCreatorPaidActivationPolicy.status === "closed") return { status: "fail-closed" as const, reason: "activation-closed" };
      const entitlementStore = createEntitlementStore();
      if (entitlementStore.status !== "ready") return { status: "fail-closed" as const, reason: "entitlement-unavailable" };
      const authorization = await authorizeCommentTranslatorCreatorPaidProvider({
        callerAuthority: paidCallerAuthority,
        entitlementStore: entitlementStore.store,
        activationPolicy: commentTranslatorCreatorPaidActivationPolicy,
        nowMs: () => nowMs
      });
      return authorization.status === "ready"
        ? { status: "ready" as const }
        : { status: "fail-closed" as const, reason: authorization.reason };
    },
    sessionAuthority: {
      async readCurrentForOwner(ownerUserId, nowMs) {
        if (durableSessionStore.status !== "ready" || !Number.isFinite(nowMs)) {
          return { status: "unavailable" as const, reason: "session-unavailable" };
        }
        try {
          const activeSession = await durableSessionStore.store.readActiveSession({ ownerUserId });
          if (!activeSession || isCommentTranslatorHeartbeatMissing(activeSession, nowMs)) {
            return { status: "unavailable" as const, reason: "session-unavailable" };
          }
          return { status: "ready" as const, sessionReferenceId: activeSession.sessionReferenceId };
        } catch {
          return { status: "unavailable" as const, reason: "session-unavailable" };
        }
      }
    },
    readSafeFeed: async ({ ownerUserId, sessionReferenceId, nowMs }) => {
        if (actionAuthorization.status !== "authorized" || actionAuthorization.ownerUserId !== ownerUserId ||
          durableSessionStore.status !== "ready" || durableFeedStore.status !== "ready") {
          return { status: "unavailable" as const, reason: "safe-feed-unavailable" };
        }
        try {
          const activeSession = await durableSessionStore.store.readActiveSession({ ownerUserId });
          if (!activeSession || activeSession.sessionReferenceId !== sessionReferenceId || isCommentTranslatorHeartbeatMissing(activeSession, nowMs)) {
            return { status: "unavailable" as const, reason: "safe-feed-unavailable" };
          }
          const feed = await readCommentTranslatorRealCommentsFeedForActiveSession({
            callerAuthorization: actionAuthorization,
            activeSession,
            durableFeedStore
          });
          if (feed.status !== "ready") return { status: "unavailable" as const, reason: "safe-feed-unavailable" };
          const rows: CommentTranslatorCreatorSafeHistorySnapshot[] = [];
          for (const row of feed.rows) {
            const projected = projectCommentTranslatorCreatorSafeHistoryRow({
              row,
              ownerUserId,
              sessionReferenceId,
              nowMs
            });
            if (!projected) return { status: "unavailable" as const, reason: "safe-feed-unavailable" };
            rows.push(projected);
          }
          return { status: "ready" as const, rows };
        } catch {
          return { status: "unavailable" as const, reason: "safe-feed-unavailable" };
        }
    }
  });

  return { callerAuthority, runtime };
}

