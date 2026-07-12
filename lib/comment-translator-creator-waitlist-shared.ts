export const commentTranslatorCreatorWaitlistCampaign = "creator_closed_beta_2026";
export const commentTranslatorCreatorWaitlistDiscountIntent = "first_month_discount";
export const commentTranslatorCreatorWaitlistLoginHref = "/login?next=/tools/comment-translator";

export type CommentTranslatorCreatorWaitlistStatus =
  | "registered"
  | "invited"
  | "discount_eligible"
  | "discount_used"
  | "cancelled";

export type CommentTranslatorCreatorWaitlistAccount =
  | {
      readonly status: "authenticated";
      readonly ownerUserId: string;
      readonly email?: string | null;
      readonly displayName?: string | null;
    }
  | {
      readonly status: "unauthenticated";
      readonly reason: "auth-unavailable" | "caller-not-authenticated";
    };

export type CommentTranslatorCreatorWaitlistStoreRegistration = {
  readonly ownerUserId: string;
  readonly accountEmail: string | null;
  readonly accountDisplayName: string | null;
  readonly campaign: typeof commentTranslatorCreatorWaitlistCampaign;
  readonly status: CommentTranslatorCreatorWaitlistStatus;
  readonly discountIntent: typeof commentTranslatorCreatorWaitlistDiscountIntent;
  readonly registeredAtIso: string;
  readonly updatedAtIso: string;
  readonly duplicatePrevented?: true;
};

export type CommentTranslatorCreatorWaitlistBrowserRegistration = {
  readonly registeredAtIso: string;
  readonly campaign: typeof commentTranslatorCreatorWaitlistCampaign;
  readonly status: CommentTranslatorCreatorWaitlistStatus;
  readonly discountIntent: typeof commentTranslatorCreatorWaitlistDiscountIntent;
  readonly clientReadableDetail: "sanitized-waitlist-registration-only";
};

export type CommentTranslatorCreatorWaitlistAdminRegistration = Omit<
  CommentTranslatorCreatorWaitlistBrowserRegistration,
  "clientReadableDetail"
> & {
  readonly accountEmail: string | null;
  readonly accountDisplayName: string | null;
  readonly clientReadableDetail: "sanitized-admin-waitlist-registration-only";
};

export type CommentTranslatorCreatorWaitlistStore = {
  readonly readRegistration: (request: {
    readonly ownerUserId: string;
    readonly campaign: typeof commentTranslatorCreatorWaitlistCampaign;
  }) => Promise<CommentTranslatorCreatorWaitlistStoreRegistration | null>;
  readonly insertRegistration: (
    draft: CommentTranslatorCreatorWaitlistStoreRegistration
  ) => Promise<CommentTranslatorCreatorWaitlistStoreRegistration>;
  readonly listRegistrations?: (request: {
    readonly campaign: typeof commentTranslatorCreatorWaitlistCampaign;
    readonly limit: number;
  }) => Promise<readonly CommentTranslatorCreatorWaitlistStoreRegistration[]>;
};

export type CommentTranslatorCreatorWaitlistState =
  | {
      readonly status: "unauthenticated";
      readonly actionState: "login-required";
      readonly loginHref: typeof commentTranslatorCreatorWaitlistLoginHref;
      readonly registration: null;
      readonly unavailableReason: "caller-not-authenticated" | "auth-unavailable";
      readonly clientReadableDetail: "sanitized-login-required-only";
      readonly publicLaunchAllowed: false;
    }
  | {
      readonly status: "unavailable";
      readonly actionState: "disabled";
      readonly loginHref: null;
      readonly registration: null;
      readonly unavailableReason: "durable-waitlist-unavailable" | "durable-waitlist-unreadable";
      readonly clientReadableDetail: "sanitized-unavailable-only";
      readonly publicLaunchAllowed: false;
    }
  | {
      readonly status: "unregistered";
      readonly actionState: "enabled";
      readonly loginHref: null;
      readonly registration: null;
      readonly unavailableReason: null;
      readonly clientReadableDetail: "sanitized-waitlist-state-only";
      readonly publicLaunchAllowed: false;
    }
  | {
      readonly status: "registered";
      readonly actionState: "disabled";
      readonly loginHref: null;
      readonly registration: CommentTranslatorCreatorWaitlistBrowserRegistration;
      readonly unavailableReason: null;
      readonly clientReadableDetail: "sanitized-waitlist-state-only";
      readonly publicLaunchAllowed: false;
    };

export type CommentTranslatorCreatorWaitlistRegistrationResult =
  | {
      readonly status: "registered";
      readonly duplicatePrevented: false;
      readonly registration: CommentTranslatorCreatorWaitlistBrowserRegistration;
      readonly clientReadableDetail: "sanitized-waitlist-registration-only";
      readonly publicLaunchAllowed: false;
    }
  | {
      readonly status: "already-registered";
      readonly duplicatePrevented: true;
      readonly registration: CommentTranslatorCreatorWaitlistBrowserRegistration;
      readonly clientReadableDetail: "sanitized-waitlist-registration-only";
      readonly publicLaunchAllowed: false;
    }
  | Extract<CommentTranslatorCreatorWaitlistState, { readonly status: "unauthenticated" | "unavailable" }>;
