import "server-only";

export type CommentTranslatorFreeBetaCreatorLockedWaitlistUnavailableReason =
  | "durable-session-unreadable"
  | "durable-usage-unreadable"
  | "missing-entitlement"
  | "missing-provider-readiness";

export type CommentTranslatorFreeBetaCreatorLockedWaitlistInput = {
  durableSessionState: "ready" | "unreadable";
  durableUsageState: "ready" | "unreadable";
  entitlementState: "ready" | "missing";
  providerReadinessState: "ready" | "missing";
  nowMs: number;
};

export type CommentTranslatorFreeBetaCreatorFeatureId =
  | "creator-ai-natural-translation"
  | "creator-obs-overlay"
  | "creator-moderator-share"
  | "creator-custom-dictionary";

export type CommentTranslatorFreeBetaCreatorClickIntent = "waitlist-click" | "feature-card-click";

export type CommentTranslatorFreeBetaCreatorLockedWaitlistState = {
  status: "locked" | "unavailable";
  unavailableReason: CommentTranslatorFreeBetaCreatorLockedWaitlistUnavailableReason | null;
  creatorPriceIntent: {
    currency: "JPY";
    monthlyAmount: 980;
    availability: "planned-closed-beta-not-live";
    paidAccessLive: false;
    checkoutAvailable: false;
    clientReadableDetail: "sanitized-price-intent-only";
  };
  lockedFeatureCards: readonly {
    id: CommentTranslatorFreeBetaCreatorFeatureId;
    state: "locked";
    availability: "closed-beta-waitlist";
    clientReadableDetail: "sanitized-feature-label-only";
  }[];
  waitlist: {
    status: "available" | "unavailable";
    actionState: "enabled" | "disabled";
    destination: "server-action:recordCommentTranslatorCreatorLockedClickAction";
    copyState: "closed-beta-waitlist-only";
    clientReadableDetail: "sanitized-waitlist-intent-only" | "sanitized-unavailable-only";
  };
  clickTracking: {
    status: "local-draft-ready" | "unavailable";
    recording: "local-deterministic-draft-only" | "not-run";
    persistence: "not-run-remote-mutation-requires-explicit-approval" | "not-run";
    rawProviderPayload: "not-recorded-by-design";
    rawComments: "not-recorded-by-design";
    privateIdentifiers: "not-recorded-by-design";
    browserStorage: "unchanged";
    handoffPayload: "unchanged";
    clientReadableDetail: "sanitized-local-draft-only" | "sanitized-unavailable-only";
  };
  generatedAtIso: string;
  clientReadableDetail: "sanitized-creator-locked-waitlist-only";
  providerTargetMetadata: "forbidden";
  serverOnlyCursor: "not-returned-by-design";
  browserStorage: "unchanged";
  handoffPayload: "unchanged";
  publicLaunchAllowed: false;
};

export type CommentTranslatorFreeBetaCreatorClickDraft =
  | {
      status: "recorded-local-draft";
      intent: CommentTranslatorFreeBetaCreatorClickIntent;
      featureId: CommentTranslatorFreeBetaCreatorFeatureId;
      occurredAtIso: string;
      persistence: "not-run-remote-mutation-requires-explicit-approval";
      clientReadableDetail: "sanitized-local-draft-only";
      rawProviderPayload: "not-recorded-by-design";
      rawComments: "not-recorded-by-design";
      privateIdentifiers: "not-recorded-by-design";
      browserStorage: "unchanged";
      handoffPayload: "unchanged";
      publicLaunchAllowed: false;
    }
  | {
      status: "unavailable";
      unavailableReason: CommentTranslatorFreeBetaCreatorLockedWaitlistUnavailableReason;
      intent: CommentTranslatorFreeBetaCreatorClickIntent;
      featureId: CommentTranslatorFreeBetaCreatorFeatureId;
      occurredAtIso: string;
      persistence: "not-run";
      clientReadableDetail: "sanitized-unavailable-only";
      rawProviderPayload: "not-recorded-by-design";
      rawComments: "not-recorded-by-design";
      privateIdentifiers: "not-recorded-by-design";
      browserStorage: "unchanged";
      handoffPayload: "unchanged";
      publicLaunchAllowed: false;
    };

export const commentTranslatorFreeBetaCreatorLockedWaitlistContract = {
  implementationStage: "free-public-beta-f14-creator-locked-waitlist",
  runtime: "server-only",
  sourceAuthority: "server-owned-durable-session-usage-entitlement-and-provider-readiness",
  paidAccessState: "not-live-closed-beta-waitlist-only",
  creatorPriceIntent: {
    currency: "JPY",
    monthlyAmount: 980,
    availability: "planned-closed-beta-not-live"
  },
  lockedFeatureCards: "closed-beta-waitlist-only",
  waitlist: "server-action-sanitized-intent-only",
  clickTracking: "local-deterministic-draft-only",
  browserStorage: "unchanged",
  handoffPayload: "unchanged",
  remoteSupabaseMutation: "not-run-by-codex-in-this-thread",
  stripeLiveAction: "not-run-in-this-thread",
  publicLaunchAllowed: false,
  forbiddenReadableOutput: [
    "oauth-token-value",
    "refresh-token-value",
    "authorization-code-value",
    "owner-user-id-value",
    "provider-channel-id-value",
    "live-target-value",
    "liveChatId-value",
    "service-role-key-value",
    "authorization-header-value",
    "provider-target-metadata",
    "raw-provider-payload",
    "raw-comment-text",
    "server-only-cursor",
    "author-channel-id",
    "author-channel-url",
    "author-profile-image-url",
    "stripe-secret",
    "billing-identifier"
  ]
} as const;

const lockedFeatureCards: CommentTranslatorFreeBetaCreatorLockedWaitlistState["lockedFeatureCards"] = [
  {
    id: "creator-ai-natural-translation",
    state: "locked",
    availability: "closed-beta-waitlist",
    clientReadableDetail: "sanitized-feature-label-only"
  },
  {
    id: "creator-obs-overlay",
    state: "locked",
    availability: "closed-beta-waitlist",
    clientReadableDetail: "sanitized-feature-label-only"
  },
  {
    id: "creator-moderator-share",
    state: "locked",
    availability: "closed-beta-waitlist",
    clientReadableDetail: "sanitized-feature-label-only"
  },
  {
    id: "creator-custom-dictionary",
    state: "locked",
    availability: "closed-beta-waitlist",
    clientReadableDetail: "sanitized-feature-label-only"
  }
];

export function createCommentTranslatorFreeBetaCreatorLockedWaitlistState(
  input: CommentTranslatorFreeBetaCreatorLockedWaitlistInput
): CommentTranslatorFreeBetaCreatorLockedWaitlistState {
  const unavailableReason = resolveUnavailableReason(input);
  const available = unavailableReason === null;

  return {
    status: available ? "locked" : "unavailable",
    unavailableReason,
    creatorPriceIntent: {
      currency: "JPY",
      monthlyAmount: 980,
      availability: "planned-closed-beta-not-live",
      paidAccessLive: false,
      checkoutAvailable: false,
      clientReadableDetail: "sanitized-price-intent-only"
    },
    lockedFeatureCards,
    waitlist: {
      status: available ? "available" : "unavailable",
      actionState: available ? "enabled" : "disabled",
      destination: "server-action:recordCommentTranslatorCreatorLockedClickAction",
      copyState: "closed-beta-waitlist-only",
      clientReadableDetail: available ? "sanitized-waitlist-intent-only" : "sanitized-unavailable-only"
    },
    clickTracking: {
      status: available ? "local-draft-ready" : "unavailable",
      recording: available ? "local-deterministic-draft-only" : "not-run",
      persistence: available ? "not-run-remote-mutation-requires-explicit-approval" : "not-run",
      rawProviderPayload: "not-recorded-by-design",
      rawComments: "not-recorded-by-design",
      privateIdentifiers: "not-recorded-by-design",
      browserStorage: "unchanged",
      handoffPayload: "unchanged",
      clientReadableDetail: available ? "sanitized-local-draft-only" : "sanitized-unavailable-only"
    },
    generatedAtIso: new Date(input.nowMs).toISOString(),
    clientReadableDetail: "sanitized-creator-locked-waitlist-only",
    providerTargetMetadata: "forbidden",
    serverOnlyCursor: "not-returned-by-design",
    browserStorage: "unchanged",
    handoffPayload: "unchanged",
    publicLaunchAllowed: false
  };
}

export function createCommentTranslatorFreeBetaCreatorClickDraft({
  state,
  intent,
  featureId,
  nowMs
}: {
  state: CommentTranslatorFreeBetaCreatorLockedWaitlistState;
  intent: CommentTranslatorFreeBetaCreatorClickIntent;
  featureId: CommentTranslatorFreeBetaCreatorFeatureId;
  nowMs: number;
}): CommentTranslatorFreeBetaCreatorClickDraft {
  if (state.status !== "locked" || state.clickTracking.status !== "local-draft-ready") {
    return {
      status: "unavailable",
      unavailableReason: state.unavailableReason ?? "missing-provider-readiness",
      intent,
      featureId,
      occurredAtIso: new Date(nowMs).toISOString(),
      persistence: "not-run",
      clientReadableDetail: "sanitized-unavailable-only",
      rawProviderPayload: "not-recorded-by-design",
      rawComments: "not-recorded-by-design",
      privateIdentifiers: "not-recorded-by-design",
      browserStorage: "unchanged",
      handoffPayload: "unchanged",
      publicLaunchAllowed: false
    };
  }

  return {
    status: "recorded-local-draft",
    intent,
    featureId,
    occurredAtIso: new Date(nowMs).toISOString(),
    persistence: "not-run-remote-mutation-requires-explicit-approval",
    clientReadableDetail: "sanitized-local-draft-only",
    rawProviderPayload: "not-recorded-by-design",
    rawComments: "not-recorded-by-design",
    privateIdentifiers: "not-recorded-by-design",
    browserStorage: "unchanged",
    handoffPayload: "unchanged",
    publicLaunchAllowed: false
  };
}

function resolveUnavailableReason(
  input: CommentTranslatorFreeBetaCreatorLockedWaitlistInput
): CommentTranslatorFreeBetaCreatorLockedWaitlistUnavailableReason | null {
  if (input.durableSessionState !== "ready") {
    return "durable-session-unreadable";
  }

  if (input.durableUsageState !== "ready") {
    return "durable-usage-unreadable";
  }

  if (input.entitlementState !== "ready") {
    return "missing-entitlement";
  }

  if (input.providerReadinessState !== "ready") {
    return "missing-provider-readiness";
  }

  return null;
}
