import type { commentTranslatorUiCopy } from "@/lib/comment-translator";

export type CommentTranslatorUiCopy = (typeof commentTranslatorUiCopy)[keyof typeof commentTranslatorUiCopy];
export type SelectOption = {
  readonly id: string;
  readonly label: string;
  readonly helper?: string;
  readonly shortLabel?: string;
};
export type OperatorSessionStopReason = keyof CommentTranslatorUiCopy["operatorSession"]["stopReasons"];
export type OperatorSessionNextAction = keyof CommentTranslatorUiCopy["operatorSession"]["nextActions"];
type OperatorSessionReasonCode = keyof CommentTranslatorUiCopy["operatorSession"]["reasonMessages"];
type OperatorSessionReasonGroup = keyof CommentTranslatorUiCopy["operatorSession"]["reasonGroups"];
type OperatorSessionRecommendedAction = keyof CommentTranslatorUiCopy["operatorSession"]["recommendedActions"];

export type OperatorSessionUsageDisplay = {
  readonly status: "available" | "over-limit" | "unavailable";
  readonly session: {
    readonly usedSeconds: number;
    readonly limitSeconds: number;
    readonly remainingSeconds: number;
  };
  readonly daily: {
    readonly usedSeconds: number;
    readonly limitSeconds: number;
    readonly remainingSeconds: number;
  };
  readonly perMinute: {
    readonly used: number;
    readonly limit: number;
    readonly remaining: number;
  };
  readonly monthlyInputCharacterCap: {
    readonly used: number;
    readonly limit: number;
    readonly remaining: number;
  };
  readonly unavailableReason: "durable-usage-unreadable" | "missing-entitlement" | "missing-provider-readiness" | null;
  readonly providerCallPolicy: {
    readonly status: "allowed" | "blocked-over-limit" | "blocked-unavailable";
    readonly stopReason: OperatorSessionStopReason | null;
    readonly clientReadableDetail: "sanitized-usage-only";
  };
  readonly noProviderCallWhenOverLimit: true;
  readonly clientReadableDetail: "sanitized-usage-only";
};

export type CommentTranslatorDockInitialSessionState = {
  readonly status: keyof CommentTranslatorUiCopy["operatorSession"]["states"];
  readonly plan: "free" | "paid";
  readonly sessionReferenceId?: string | null;
  readonly elapsedSeconds: number;
  readonly remainingSessionSeconds: number;
  readonly remainingDailySeconds: number;
  readonly stopReason: OperatorSessionStopReason | null;
  readonly reasonUx: {
    readonly code: OperatorSessionReasonCode;
    readonly group: OperatorSessionReasonGroup;
    readonly recommendedAction: OperatorSessionRecommendedAction;
    readonly clientReadableDetail: "sanitized-reason-only";
  } | null;
  readonly usageDisplay: OperatorSessionUsageDisplay;
  readonly nextAction: OperatorSessionNextAction;
  readonly activePhase?: "running" | "rate-paused" | "resyncing";
  readonly ratePauseReason?: "translated-message-cap" | null;
  readonly automaticResumeExpected?: boolean;
  readonly rateLimit?: "exceeded";
  readonly rateLimitReason?: "rate-limit-exceeded";
  readonly retryAfterSeconds?: number | null;
};
export type OperatorSessionState = CommentTranslatorDockInitialSessionState;

export type CreatorWaitlistRegistration = {
  readonly registeredAtIso: string;
  readonly campaign: "creator_closed_beta_2026";
  readonly status: "registered" | "invited" | "discount_eligible" | "discount_used" | "cancelled";
  readonly discountIntent: "first_month_discount";
  readonly clientReadableDetail: "sanitized-waitlist-registration-only";
};
export type CreatorWaitlistState = {
  readonly status: "unauthenticated" | "unavailable" | "unregistered" | "registered";
  readonly actionState: "login-required" | "disabled" | "enabled";
  readonly loginHref: string | null;
  readonly registration: CreatorWaitlistRegistration | null;
  readonly unavailableReason:
    | "caller-not-authenticated"
    | "auth-unavailable"
    | "durable-waitlist-unavailable"
    | "durable-waitlist-unreadable"
    | null;
  readonly clientReadableDetail:
    | "sanitized-login-required-only"
    | "sanitized-unavailable-only"
    | "sanitized-waitlist-state-only";
  readonly publicLaunchAllowed: false;
};

export const freeDailyLimitSeconds = 30 * 60;
export const initialOperatorSessionUsageDisplay: OperatorSessionUsageDisplay = {
  status: "available",
  session: { usedSeconds: 0, limitSeconds: freeDailyLimitSeconds, remainingSeconds: freeDailyLimitSeconds },
  daily: { usedSeconds: 0, limitSeconds: freeDailyLimitSeconds, remainingSeconds: freeDailyLimitSeconds },
  perMinute: { used: 0, limit: 30, remaining: 30 },
  monthlyInputCharacterCap: { used: 0, limit: 20_000, remaining: 20_000 },
  unavailableReason: null,
  providerCallPolicy: { status: "allowed", stopReason: null, clientReadableDetail: "sanitized-usage-only" },
  noProviderCallWhenOverLimit: true,
  clientReadableDetail: "sanitized-usage-only"
};
export const initialOperatorSessionState: OperatorSessionState = {
  status: "not-started",
  plan: "free",
  sessionReferenceId: null,
  elapsedSeconds: 0,
  remainingSessionSeconds: freeDailyLimitSeconds,
  remainingDailySeconds: freeDailyLimitSeconds,
  stopReason: null,
  reasonUx: null,
  usageDisplay: initialOperatorSessionUsageDisplay,
  nextAction: "press-start"
};
export const initialCreatorWaitlistState: CreatorWaitlistState = {
  status: "unavailable",
  actionState: "disabled",
  loginHref: null,
  registration: null,
  unavailableReason: "durable-waitlist-unavailable",
  clientReadableDetail: "sanitized-unavailable-only",
  publicLaunchAllowed: false
};
