import "server-only";

export const commentTranslatorPublicTrafficRateLimitBackingContract = {
  step: "public-launch-next-flow-step-10",
  selectedBacking: "cloudflare-edge",
  rejectedBacking: "supabase-durable-rate-limit-table",
  riskAcceptance: "not-selected",
  decisionReason:
    "Public Free beta traffic should be throttled before application and provider boundaries; the existing in-app guard remains defense-in-depth.",
  currentInAppGuardRole: "defense-in-depth",
  edgeControlReference: "COMMENT_TRANSLATOR_EDGE_RATE_LIMITING",
  edgeActivationStatus: "not-run-approval-gated",
  activationRequires: "separate-reviewed-cloudflare-edge-change-before-pl-g6",
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
    "credential-disconnect",
    "translation-provider-boundary",
    "private-launch-denial-retry",
    "billing-action-boundary"
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
