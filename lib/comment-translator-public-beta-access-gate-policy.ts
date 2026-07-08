import "server-only";

export const commentTranslatorPublicBetaAccessGateDecisionContract = {
  step: "public-launch-next-flow-step-9",
  selectedGate: "login-only",
  rejectedGate: "waitlist-approved-for-free-public-beta",
  decisionReason:
    "Free public beta should be reachable by signed-in users so registration friction still exists while creators can evaluate Free usage before paid or Creator plans.",
  waitlistBoundary: "creator-paid-beta-only",
  currentRuntimeGate: "private-launch-sha256-owner-allowlist",
  runtimeGateChange: "not-run-in-this-slice",
  activationRequires: "separate-reviewed-public-access-change-after-pl-g5",
  publicGateFlip: "not-run",
  deployUpload: "not-run",
  remoteMutation: "not-run",
  liveProviderExecution: "not-run",
  browserStorage: "forbidden",
  browserReadableOutput: "sanitized-policy-labels-only",
  publicReleaseCapable: "no",
  forbiddenReadableOutput: [
    "owner-user-id-value",
    "provider-channel-id-value",
    "liveChatId-value",
    "provider-target-metadata",
    "raw-provider-payload",
    "raw-comment-text",
    "token-value",
    "cookie-value",
    "authorization-header-value",
    "browser-storage-payload",
    "support-ticket-id-value",
    "private-owner-role-value"
  ]
} as const;
