import "server-only";

import {
  type CommentTranslatorAdminAccount,
  readCommentTranslatorAdminAccess
} from "./comment-translator-admin-access-gate";
import {
  commentTranslatorCreatorWaitlistCampaign,
  createCommentTranslatorCreatorWaitlistAdminRegistration,
  type CommentTranslatorCreatorWaitlistAdminRegistration
} from "./comment-translator-free-beta-creator-locked-waitlist";
import {
  createTrustedCommentTranslatorCreatorWaitlistSupabaseStore,
  type CommentTranslatorCreatorWaitlistStoreFactoryResult
} from "./comment-translator-creator-waitlist-durable-store";

export type CommentTranslatorCreatorWaitlistAdminPageState =
  | {
      readonly status: "blocked";
      readonly count: 0;
      readonly registrations: readonly [];
      readonly reason: "auth-unavailable" | "caller-not-authenticated" | "admin-allowlist";
      readonly clientReadableDetail: "sanitized-admin-access-metadata-only";
      readonly publicLaunchAllowed: false;
    }
  | {
      readonly status: "unavailable";
      readonly count: 0;
      readonly registrations: readonly [];
      readonly reason: "durable-waitlist-unavailable" | "durable-waitlist-unreadable";
      readonly clientReadableDetail: "sanitized-admin-waitlist-unavailable-only";
      readonly publicLaunchAllowed: false;
    }
  | {
      readonly status: "available";
      readonly count: number;
      readonly registrations: readonly CommentTranslatorCreatorWaitlistAdminRegistration[];
      readonly reason: null;
      readonly clientReadableDetail: "sanitized-admin-waitlist-list-only";
      readonly publicLaunchAllowed: false;
    };

export const commentTranslatorCreatorWaitlistAdminContract = {
  implementationStage: "creator-closed-beta-waitlist-admin-page",
  runtime: "server-only",
  route: "/admin/comment-translator/creator-waitlist",
  accessGate: "COMMENT_TRANSLATOR_ADMIN_ALLOWED_USER_HASHES",
  listOutput: "count-registered-date-campaign-status-email-display-name-only",
  publicLaunchAllowed: false,
  forbiddenReadableOutput: [
    "owner-user-id-value",
    "provider-channel-id-value",
    "liveChatId-value",
    "provider-target-metadata",
    "raw-provider-payload",
    "raw-comment-text",
    "service-role-key-value",
    "authorization-header-value"
  ]
} as const;

export async function readCommentTranslatorCreatorWaitlistAdminPageState({
  account,
  storeFactory
}: {
  readonly account: CommentTranslatorAdminAccount;
  readonly storeFactory?: CommentTranslatorCreatorWaitlistStoreFactoryResult;
}): Promise<CommentTranslatorCreatorWaitlistAdminPageState> {
  const access = readCommentTranslatorAdminAccess({ account });
  if (access.status === "blocked") {
    return {
      status: "blocked",
      count: 0,
      registrations: [],
      reason: access.reason,
      clientReadableDetail: "sanitized-admin-access-metadata-only",
      publicLaunchAllowed: false
    };
  }

  const resolvedStoreFactory = storeFactory ?? createTrustedCommentTranslatorCreatorWaitlistSupabaseStore();

  if (resolvedStoreFactory.status !== "ready" || !resolvedStoreFactory.store.listRegistrations) {
    return createUnavailableAdminState("durable-waitlist-unavailable");
  }

  try {
    const registrations = await resolvedStoreFactory.store.listRegistrations({
      campaign: commentTranslatorCreatorWaitlistCampaign,
      limit: 200
    });
    const browserSafeRows = registrations.map(createCommentTranslatorCreatorWaitlistAdminRegistration);

    return {
      status: "available",
      count: browserSafeRows.length,
      registrations: browserSafeRows,
      reason: null,
      clientReadableDetail: "sanitized-admin-waitlist-list-only",
      publicLaunchAllowed: false
    };
  } catch {
    return createUnavailableAdminState("durable-waitlist-unreadable");
  }
}

function createUnavailableAdminState(
  reason: Extract<CommentTranslatorCreatorWaitlistAdminPageState, { readonly status: "unavailable" }>["reason"]
): Extract<CommentTranslatorCreatorWaitlistAdminPageState, { readonly status: "unavailable" }> {
  return {
    status: "unavailable",
    count: 0,
    registrations: [],
    reason,
    clientReadableDetail: "sanitized-admin-waitlist-unavailable-only",
    publicLaunchAllowed: false
  };
}
