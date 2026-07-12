import "server-only";

import {
  commentTranslatorCreatorWaitlistCampaign,
  commentTranslatorCreatorWaitlistDiscountIntent,
  commentTranslatorCreatorWaitlistLoginHref,
  type CommentTranslatorCreatorWaitlistAccount,
  type CommentTranslatorCreatorWaitlistAdminRegistration,
  type CommentTranslatorCreatorWaitlistBrowserRegistration,
  type CommentTranslatorCreatorWaitlistRegistrationResult,
  type CommentTranslatorCreatorWaitlistState,
  type CommentTranslatorCreatorWaitlistStore,
  type CommentTranslatorCreatorWaitlistStoreRegistration
} from "./comment-translator-creator-waitlist-shared";

export {
  commentTranslatorCreatorWaitlistCampaign,
  commentTranslatorCreatorWaitlistDiscountIntent,
  commentTranslatorCreatorWaitlistLoginHref
} from "./comment-translator-creator-waitlist-shared";
export type {
  CommentTranslatorCreatorWaitlistAccount,
  CommentTranslatorCreatorWaitlistAdminRegistration,
  CommentTranslatorCreatorWaitlistBrowserRegistration,
  CommentTranslatorCreatorWaitlistRegistrationResult,
  CommentTranslatorCreatorWaitlistState,
  CommentTranslatorCreatorWaitlistStatus,
  CommentTranslatorCreatorWaitlistStore,
  CommentTranslatorCreatorWaitlistStoreRegistration
} from "./comment-translator-creator-waitlist-shared";

export const commentTranslatorCreatorWaitlistContract = {
  implementationStage: "creator-closed-beta-waitlist-registration",
  runtime: "server-only",
  campaign: commentTranslatorCreatorWaitlistCampaign,
  discountIntent: commentTranslatorCreatorWaitlistDiscountIntent,
  durableAuthority: "comment_translator_creator_waitlist_registrations",
  duplicatePolicy: "one-registration-per-owner-user-and-campaign",
  publicUiReadableOutput: "sanitized-registration-state-only",
  adminReadableOutput: "email-display-name-campaign-status-registered-at-only",
  stripeLiveAction: "not-run-in-this-slice",
  checkoutAvailable: false,
  publicLaunchAllowed: false,
  forbiddenPublicOutput: [
    "owner-user-id-value",
    "provider-channel-id-value",
    "liveChatId-value",
    "provider-target-metadata",
    "raw-provider-payload",
    "raw-comment-text",
    "token-value",
    "authorization-header-value",
    "browser-storage-payload"
  ]
} as const;

export async function readCommentTranslatorCreatorWaitlistStateWithStore({
  account,
  store
}: {
  readonly account: CommentTranslatorCreatorWaitlistAccount;
  readonly store: Pick<CommentTranslatorCreatorWaitlistStore, "readRegistration"> | null;
}): Promise<CommentTranslatorCreatorWaitlistState> {
  if (account.status !== "authenticated") {
    return createUnauthenticatedState(account.reason);
  }

  if (!store) {
    return createUnavailableState("durable-waitlist-unavailable");
  }

  try {
    const registration = await store.readRegistration({
      ownerUserId: account.ownerUserId,
      campaign: commentTranslatorCreatorWaitlistCampaign
    });
    if (!registration) {
      return {
        status: "unregistered",
        actionState: "enabled",
        loginHref: null,
        registration: null,
        unavailableReason: null,
        clientReadableDetail: "sanitized-waitlist-state-only",
        publicLaunchAllowed: false
      };
    }

    return {
      status: "registered",
      actionState: "disabled",
      loginHref: null,
      registration: createBrowserRegistration(registration),
      unavailableReason: null,
      clientReadableDetail: "sanitized-waitlist-state-only",
      publicLaunchAllowed: false
    };
  } catch {
    return createUnavailableState("durable-waitlist-unreadable");
  }
}

export async function registerCommentTranslatorCreatorWaitlistWithStore({
  account,
  store,
  nowMs
}: {
  readonly account: CommentTranslatorCreatorWaitlistAccount;
  readonly store: Pick<CommentTranslatorCreatorWaitlistStore, "readRegistration" | "insertRegistration"> | null;
  readonly nowMs: number;
}): Promise<CommentTranslatorCreatorWaitlistRegistrationResult> {
  if (account.status !== "authenticated") {
    return createUnauthenticatedState(account.reason);
  }

  if (!store) {
    return createUnavailableState("durable-waitlist-unavailable");
  }

  try {
    const existing = await store.readRegistration({
      ownerUserId: account.ownerUserId,
      campaign: commentTranslatorCreatorWaitlistCampaign
    });
    if (existing) {
      return {
        status: "already-registered",
        duplicatePrevented: true,
        registration: createBrowserRegistration(existing),
        clientReadableDetail: "sanitized-waitlist-registration-only",
        publicLaunchAllowed: false
      };
    }

    const draft = createRegistrationDraft({ account, nowMs });
    const inserted = await store.insertRegistration(draft);
    if (inserted.duplicatePrevented) {
      return {
        status: "already-registered",
        duplicatePrevented: true,
        registration: createBrowserRegistration(inserted),
        clientReadableDetail: "sanitized-waitlist-registration-only",
        publicLaunchAllowed: false
      };
    }

    return {
      status: "registered",
      duplicatePrevented: false,
      registration: createBrowserRegistration(inserted),
      clientReadableDetail: "sanitized-waitlist-registration-only",
      publicLaunchAllowed: false
    };
  } catch {
    return createUnavailableState("durable-waitlist-unreadable");
  }
}

export function createCommentTranslatorCreatorWaitlistAdminRegistration(
  registration: CommentTranslatorCreatorWaitlistStoreRegistration
): CommentTranslatorCreatorWaitlistAdminRegistration {
  return {
    ...createBrowserRegistration(registration),
    accountEmail: registration.accountEmail,
    accountDisplayName: registration.accountDisplayName,
    clientReadableDetail: "sanitized-admin-waitlist-registration-only"
  };
}

function createRegistrationDraft({
  account,
  nowMs
}: {
  readonly account: Extract<CommentTranslatorCreatorWaitlistAccount, { readonly status: "authenticated" }>;
  readonly nowMs: number;
}): CommentTranslatorCreatorWaitlistStoreRegistration {
  const nowIso = new Date(nowMs).toISOString();

  return {
    ownerUserId: account.ownerUserId,
    accountEmail: normalizeNullableEmail(account.email ?? null),
    accountDisplayName: normalizeNullableText(account.displayName ?? null),
    campaign: commentTranslatorCreatorWaitlistCampaign,
    status: "registered",
    discountIntent: commentTranslatorCreatorWaitlistDiscountIntent,
    registeredAtIso: nowIso,
    updatedAtIso: nowIso
  };
}

function createBrowserRegistration(
  registration: CommentTranslatorCreatorWaitlistStoreRegistration
): CommentTranslatorCreatorWaitlistBrowserRegistration {
  return {
    registeredAtIso: registration.registeredAtIso,
    campaign: registration.campaign,
    status: registration.status,
    discountIntent: registration.discountIntent,
    clientReadableDetail: "sanitized-waitlist-registration-only"
  };
}

function createUnauthenticatedState(
  reason: Extract<CommentTranslatorCreatorWaitlistAccount, { readonly status: "unauthenticated" }>["reason"]
): Extract<CommentTranslatorCreatorWaitlistState, { readonly status: "unauthenticated" }> {
  return {
    status: "unauthenticated",
    actionState: "login-required",
    loginHref: commentTranslatorCreatorWaitlistLoginHref,
    registration: null,
    unavailableReason: reason,
    clientReadableDetail: "sanitized-login-required-only",
    publicLaunchAllowed: false
  };
}

function createUnavailableState(
  reason: Extract<CommentTranslatorCreatorWaitlistState, { readonly status: "unavailable" }>["unavailableReason"]
): Extract<CommentTranslatorCreatorWaitlistState, { readonly status: "unavailable" }> {
  return {
    status: "unavailable",
    actionState: "disabled",
    loginHref: null,
    registration: null,
    unavailableReason: reason,
    clientReadableDetail: "sanitized-unavailable-only",
    publicLaunchAllowed: false
  };
}

function normalizeNullableText(value: string | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, 160) : null;
}

function normalizeNullableEmail(value: string | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, 320) : null;
}
