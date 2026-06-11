import "server-only";

export type CommentTranslationProviderRuntimeScope = "server-runtime-only";
export type CommentTranslationInputKind = "manual-preview" | "live-comment" | "fixture-replay";
export type CommentTranslationCacheOutcome = "hit" | "miss" | "bypass";
export type CommentTranslationModerationSkipReason =
  | "same-language"
  | "too-short"
  | "blocked-term"
  | "spam-suspected"
  | "unsupported-language"
  | "policy-review";

export type CommentTranslationProviderSecretBoundary = {
  runtime: "server-env-only";
  clientBundle: "forbidden";
  fixtures: "forbidden";
  docsAndTaskNotes: "no-secret-values";
};

export type CommentTranslationPrivacyBoundary = {
  logRetention: "short-lived-only";
  rawTextLogging: "disabled-by-default";
  piiMinimization: "exclude-author-and-channel-identifiers";
  moderationSkipReason: CommentTranslationModerationSkipReason | null;
};

export type CommentTranslationCacheKeyMaterial = {
  normalizedTextHash: string;
  sourceLanguage: string;
  targetLanguage: string;
  providerCapabilityVersion: string;
  glossaryVersion: string | null;
  moderationPolicyVersion: string;
  excludes: readonly [
    "authorName",
    "channelId",
    "viewerId",
    "streamId",
    "rawSecret",
    "oauthToken",
    "refreshToken",
    "authorizationCode",
    "providerTargetIdentifier",
    "pollingCursor",
    "ownerIdentifier",
    "authorizationHeader",
    "serviceRoleKey",
    "browserLocalHandoffMaterial",
    "liveChatId",
    "providerChannelId",
    "rawProviderTargetMetadata"
  ];
};

export type CommentTranslationUsageHandoff = {
  meteringEventId: string;
  providerId: string;
  billingCategory: "translation";
  estimatedUnits: number;
  cacheOutcome: CommentTranslationCacheOutcome;
  enforcement: "not-implemented";
  databaseWrite: "not-implemented";
  logPolicy: "short-lived-provider-diagnostic-only";
};

export type CommentTranslationProviderRequest = {
  requestId: string;
  input: {
    kind: CommentTranslationInputKind;
    text: string;
    sourceLanguage: "auto" | string;
    targetLanguage: string;
  };
  glossary: {
    terms: readonly string[];
    version: string | null;
  };
  cache: {
    lookupKey: string | null;
    keyMaterial: CommentTranslationCacheKeyMaterial;
  };
  privacy: CommentTranslationPrivacyBoundary;
  usageHandoff: CommentTranslationUsageHandoff;
};

export type CommentTranslationProviderResponse = {
  type: "translated";
  translatedText: string;
  detectedSourceLanguage: string | null;
  confidence: number | null;
  cacheOutcome: CommentTranslationCacheOutcome;
  usageHandoff: CommentTranslationUsageHandoff;
};

export type CommentTranslationProviderRecoverableError = {
  type: "recoverable-error";
  code: "temporary-unavailable" | "rate-limited" | "timeout" | "content-filtered";
  message: string;
  retry: {
    retryable: true;
    retryAfterMs: number | null;
    fallbackToOriginal: boolean;
  };
  usageHandoff: CommentTranslationUsageHandoff;
};

export type CommentTranslationProviderTerminalError = {
  type: "terminal-error";
  code: "invalid-request" | "unsupported-language" | "provider-not-configured" | "credential-missing" | "policy-blocked";
  message: string;
  retry: {
    retryable: false;
  };
};

export type CommentTranslationProviderResult =
  | CommentTranslationProviderResponse
  | CommentTranslationProviderRecoverableError
  | CommentTranslationProviderTerminalError;

export interface CommentTranslationProvider {
  readonly id: string;
  readonly name: string;
  readonly runtimeScope: CommentTranslationProviderRuntimeScope;
  readonly secretBoundary: CommentTranslationProviderSecretBoundary;
  translate(request: CommentTranslationProviderRequest): Promise<CommentTranslationProviderResult>;
}

export type CommentTranslationProviderComparisonAxis = {
  id:
    | "latency"
    | "cost"
    | "language-coverage"
    | "streaming-suitability"
    | "glossary-support"
    | "rate-limit"
    | "data-retention"
    | "failure-semantics";
  question: string;
  decisionImpact: string;
};

export const commentTranslationProviderSecretBoundary = {
  runtime: "server-env-only",
  clientBundle: "forbidden",
  fixtures: "forbidden",
  docsAndTaskNotes: "no-secret-values"
} as const satisfies CommentTranslationProviderSecretBoundary;

export const commentTranslationProviderBoundaryNotes = {
  implementationStage: "design-contract-only",
  runtimeScope: "server-runtime-only",
  inputBoundary:
    "Translation requests accept text and language context only; YouTube OAuth, owner checks, and polling stay outside this boundary.",
  quotaBillingUsageHandoff:
    "Usage metering is shaped for a future trusted server writer; enforcement and databaseWrite are not-implemented.",
  privacy:
    "Provider diagnostics are short-lived, exclude author/channel identifiers, keep raw text logging disabled by default, and carry moderation skip reason separately.",
  cacheKey:
    "Cache key material is based on normalized text hash, language pair, provider capability version, glossary version, and moderation policy version."
} as const;

export const commentTranslationProviderComparisonAxes = [
  {
    id: "latency",
    question: "How quickly can the provider return a short chat translation under live stream load?",
    decisionImpact: "Determines whether the provider can support broadcaster dock usage without stale rows."
  },
  {
    id: "cost",
    question: "How predictable is per-comment or per-character cost at live chat volume?",
    decisionImpact: "Feeds the future quota and paid plan threshold without writing quota data in this slice."
  },
  {
    id: "language-coverage",
    question: "Which source and target languages are reliable enough for the first YouTube-first experience?",
    decisionImpact: "Defines language menu scope and fallback copy for unsupported languages."
  },
  {
    id: "streaming-suitability",
    question: "Can the provider handle many small requests with stable latency and graceful backoff?",
    decisionImpact: "Separates live chat suitability from batch document translation strengths."
  },
  {
    id: "glossary-support",
    question: "Can the provider honor streamer names, community terms, and preferred translations?",
    decisionImpact: "Determines whether glossary setup is native, prompt-shaped, or postponed."
  },
  {
    id: "rate-limit",
    question: "What request and token limits apply, and how clear are retry windows?",
    decisionImpact: "Maps provider failures into recoverable errors instead of terminal UI states."
  },
  {
    id: "data-retention",
    question: "How does the provider handle submitted text and diagnostic retention?",
    decisionImpact: "Controls privacy copy, short-lived logging, and provider eligibility."
  },
  {
    id: "failure-semantics",
    question: "Are temporary failures, policy blocks, invalid input, and unsupported languages distinguishable?",
    decisionImpact: "Keeps recoverable errors separate from terminal errors and moderation skips."
  }
] as const satisfies readonly CommentTranslationProviderComparisonAxis[];
