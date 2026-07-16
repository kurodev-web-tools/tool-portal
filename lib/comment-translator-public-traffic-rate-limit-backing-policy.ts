import "server-only";

export const commentTranslatorPublicTrafficRateLimitBackingContract = {
  step: "public-launch-next-flow-step-10",
  selectedBacking: "cloudflare-edge",
  rejectedBacking: "supabase-durable-rate-limit-table",
  riskAcceptance: "not-selected",
  decisionReason:
    "Cloudflare edge remains the preferred optional outer load-shedding backing, but the available Free rule slot stays reserved for leaked-credential protection and Translator-specific activation is deferred until traffic or revenue justifies it.",
  currentInAppGuardRole: "enforcement-authority",
  appEnforcementAuthority: "durable-quotas-session-caps-rate-guards",
  edgeControlReference: "COMMENT_TRANSLATOR_EDGE_RATE_LIMITING",
  edgeControlReferenceRuntimeRole: "control-reference-label-not-parsed-behavior-flag",
  edgeActivationStatus: "deferred-not-required-for-free-public-beta",
  edgeProtectionReadinessStatus: "pass-with-optional-edge-control-deferred",
  edgeRateLimitingDisposition: "deferred-existing-free-slot-reserved-for-leaked-credential-protection",
  cloudflareFreeRateLimitingSlotStatus: "occupied-leaked-credential-protection",
  activationRequires: "later-separate-approval-after-traffic-or-revenue-review",
  supabaseRateLimitTableStatus: "not-created",
  durableStoreMutation: "not-run",
  deployUpload: "not-run",
  remoteMutation: "not-run",
  publicGateFlip: "not-run",
  liveProviderExecution: "not-run",
  browserStorage: "forbidden",
  browserReadableOutput: "sanitized-rate-limit-backing-labels-only",
  publicReleaseCapable: "no",
  protectedTrafficClasses: [
    "session-start",
    "session-status",
    "session-heartbeat",
    "credential-status",
    "translation-action"
  ],
  forbiddenReadableOutput: [
    "oauth-token-value",
    "refresh-token-value",
    "authorization-code-value",
    "owner-user-id-value",
    "provider-channel-id-value",
    "liveChatId-value",
    "provider-target-metadata",
    "raw-provider-payload",
    "raw-comment-text",
    "raw-request-ip",
    "cookie-value",
    "authorization-header-value",
    "browser-storage-payload",
    "cloudflare-api-token-value",
    "cloudflare-zone-id-value",
    "support-ticket-id-value",
    "private-owner-role-value"
  ]
} as const;
