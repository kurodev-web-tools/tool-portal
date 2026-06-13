import "server-only";

export type CommentTranslatorSecurityPrivacySurfaceId =
  | "route-api-authorization"
  | "token-credential-boundaries"
  | "browser-storage"
  | "logs-output-docs-pr-body"
  | "provider-target-live-chat-boundary"
  | "quota-budget-stop-paths"
  | "rollback-readiness";

export type CommentTranslatorSecurityPrivacyAcceptedRiskId =
  | "durable-public-operation-state"
  | "approval-gated-live-provider-stripe-deploy"
  | "provider-dashboard-terms-recheck";

export type CommentTranslatorSecurityPrivacyInspectedSurface = {
  id: CommentTranslatorSecurityPrivacySurfaceId;
  status: "passed" | "accepted-risk";
  evidence: string;
  highCriticalBlocker: false;
  clientReadableOutput: "sanitized-metadata-only" | "unchanged" | "forbidden";
};

export type CommentTranslatorSecurityPrivacyAcceptedRisk = {
  id: CommentTranslatorSecurityPrivacyAcceptedRiskId;
  status: "accepted-for-task-26-public-launch-still-gated";
  nextSafeAction: string;
  highCriticalSecurityPrivacyBlocker: false;
};

export type CommentTranslatorSecurityPrivacyFinalReviewReport = {
  stage: typeof commentTranslatorSecurityPrivacyFinalReviewContract.implementationStage;
  generatedAtIso: string;
  outputPolicy: "sanitized-metadata-and-reference-only";
  publicLaunchAllowed: false;
  publicReleaseCapable: false;
  completionDecision:
    | "task-26-complete-public-launch-still-gated"
    | "blocked-pending-route-negative-checks"
    | "blocked-pending-no-secret-scan";
  noKnownHighCriticalSecurityPrivacyBlocker: boolean;
  routeNegativeChecksPassed: boolean;
  noSecretScanPassed: boolean;
  changedFilesNoSecretScanPassed: boolean;
  inspectedSurfaces: readonly CommentTranslatorSecurityPrivacyInspectedSurface[];
  acceptedRisks: readonly CommentTranslatorSecurityPrivacyAcceptedRisk[];
  forbiddenReadableOutput: readonly string[];
  liveProviderExecution: "not-run-by-contract";
  stripeLiveModeAction: "not-run-by-contract";
  deployUpload: "not-run-by-contract";
  remoteMutation: "not-run-by-contract";
  remoteSchemaMigration: "not-run-by-contract";
  browserStorage: "unchanged";
  handoffPayload: "unchanged";
};

export const commentTranslatorSecurityPrivacyFinalReviewContract = {
  implementationStage: "pre-main-task-26-security-privacy-final-review",
  runtime: "server-only",
  outputPolicy: "sanitized-metadata-and-reference-only",
  publicLaunchAllowed: false,
  publicReleaseCapable: false,
  noKnownHighCriticalSecurityPrivacyBlocker: true,
  inspectedSurfaceIds: [
    "route-api-authorization",
    "token-credential-boundaries",
    "browser-storage",
    "logs-output-docs-pr-body",
    "provider-target-live-chat-boundary",
    "quota-budget-stop-paths",
    "rollback-readiness"
  ],
  routeApiAuthorization: "private-launch-gate-auth-derived-server-side-abuse-guarded",
  tokenCredentialBoundaries: "trusted-server-only-adapters-sanitized-status-only",
  browserStorage: "unchanged",
  handoffPayload: "unchanged",
  liveProviderExecution: "not-run-by-contract",
  stripeLiveModeAction: "not-run-by-contract",
  deployUpload: "not-run-by-contract",
  remoteMutation: "not-run-by-contract",
  remoteSchemaMigration: "not-run-by-contract",
  forbiddenReadableOutput: [
    "oauth-token-value",
    "refresh-token-value",
    "authorization-code-value",
    "owner-user-id-value",
    "provider-channel-id-value",
    "liveChatId-value",
    "service-role-key-value",
    "authorization-header-value",
    "stripe-secret-key-value",
    "stripe-webhook-secret-value",
    "provider-target-metadata",
    "provider-error-body",
    "raw-comment-text",
    "raw-request-ip",
    "customer-value",
    "subscription-value",
    "payment-method-detail"
  ],
  acceptedRiskIds: [
    "durable-public-operation-state",
    "approval-gated-live-provider-stripe-deploy",
    "provider-dashboard-terms-recheck"
  ]
} as const;

export const commentTranslatorSecurityPrivacyAcceptedRisks: readonly CommentTranslatorSecurityPrivacyAcceptedRisk[] = [
  {
    id: "durable-public-operation-state",
    status: "accepted-for-task-26-public-launch-still-gated",
    nextSafeAction:
      "complete an approved durable-store or edge-backed enforcement PR before any public launch gate flip",
    highCriticalSecurityPrivacyBlocker: false
  },
  {
    id: "approval-gated-live-provider-stripe-deploy",
    status: "accepted-for-task-26-public-launch-still-gated",
    nextSafeAction:
      "run live/provider smoke, Stripe live-mode actions, deploy/upload, and remote mutation only after same-thread preflight, sanitized output review, and explicit approval",
    highCriticalSecurityPrivacyBlocker: false
  },
  {
    id: "provider-dashboard-terms-recheck",
    status: "accepted-for-task-26-public-launch-still-gated",
    nextSafeAction:
      "recheck provider pricing, data-use, retention, training, and dashboard posture before live/provider execution or paid launch",
    highCriticalSecurityPrivacyBlocker: false
  }
] as const;

export const commentTranslatorSecurityPrivacyInspectedSurfaces: readonly CommentTranslatorSecurityPrivacyInspectedSurface[] = [
  {
    id: "route-api-authorization",
    status: "passed",
    evidence:
      "Comment Translator API routes and server actions derive caller authorization server-side, enforce private launch access, and apply abuse/rate-limit guards before cost-affecting work.",
    highCriticalBlocker: false,
    clientReadableOutput: "sanitized-metadata-only"
  },
  {
    id: "token-credential-boundaries",
    status: "passed",
    evidence:
      "YouTube credential status, token store, refresh, disconnect, and trusted Supabase adapters remain server-only and return sanitized credential metadata only.",
    highCriticalBlocker: false,
    clientReadableOutput: "sanitized-metadata-only"
  },
  {
    id: "browser-storage",
    status: "passed",
    evidence:
      "Task 26 does not add localStorage, sessionStorage, IndexedDB, cookie, handoff payload, or browser storage reads/writes for Comment Translator surfaces.",
    highCriticalBlocker: false,
    clientReadableOutput: "unchanged"
  },
  {
    id: "logs-output-docs-pr-body",
    status: "passed",
    evidence:
      "Changed files and inspected active docs use reference names, status labels, and sanitized metadata only; no secret, token, provider target, raw comment, or billing private values are recorded.",
    highCriticalBlocker: false,
    clientReadableOutput: "sanitized-metadata-only"
  },
  {
    id: "provider-target-live-chat-boundary",
    status: "passed",
    evidence:
      "Provider target metadata and liveChatId remain operator-local/server-session-only; browser-safe polling/session outputs return forbidden or never-returned sentinels.",
    highCriticalBlocker: false,
    clientReadableOutput: "forbidden"
  },
  {
    id: "quota-budget-stop-paths",
    status: "passed",
    evidence:
      "Session and usage ledger runtimes retain provider-quota-stop, global-budget-stop, ai-budget-stop, translated-message-cap, daily/session limit, and provider limit stop paths.",
    highCriticalBlocker: false,
    clientReadableOutput: "sanitized-metadata-only"
  },
  {
    id: "rollback-readiness",
    status: "accepted-risk",
    evidence:
      "Rollback triggers and support escalation paths are documented; actual deploy, provider, Stripe, dashboard, and remote schema rollback actions remain approval-gated.",
    highCriticalBlocker: false,
    clientReadableOutput: "sanitized-metadata-only"
  }
] as const;

export function createCommentTranslatorSecurityPrivacyFinalReviewReport({
  nowMs,
  routeNegativeChecksPassed,
  noSecretScanPassed,
  changedFilesNoSecretScanPassed
}: {
  nowMs: number;
  routeNegativeChecksPassed: boolean;
  noSecretScanPassed: boolean;
  changedFilesNoSecretScanPassed: boolean;
}): CommentTranslatorSecurityPrivacyFinalReviewReport {
  const completionDecision = readCompletionDecision({
    routeNegativeChecksPassed,
    noSecretScanPassed,
    changedFilesNoSecretScanPassed
  });

  return {
    stage: commentTranslatorSecurityPrivacyFinalReviewContract.implementationStage,
    generatedAtIso: new Date(nowMs).toISOString(),
    outputPolicy: "sanitized-metadata-and-reference-only",
    publicLaunchAllowed: false,
    publicReleaseCapable: false,
    completionDecision,
    noKnownHighCriticalSecurityPrivacyBlocker: completionDecision === "task-26-complete-public-launch-still-gated",
    routeNegativeChecksPassed,
    noSecretScanPassed,
    changedFilesNoSecretScanPassed,
    inspectedSurfaces: commentTranslatorSecurityPrivacyInspectedSurfaces,
    acceptedRisks: commentTranslatorSecurityPrivacyAcceptedRisks,
    forbiddenReadableOutput: commentTranslatorSecurityPrivacyFinalReviewContract.forbiddenReadableOutput,
    liveProviderExecution: "not-run-by-contract",
    stripeLiveModeAction: "not-run-by-contract",
    deployUpload: "not-run-by-contract",
    remoteMutation: "not-run-by-contract",
    remoteSchemaMigration: "not-run-by-contract",
    browserStorage: "unchanged",
    handoffPayload: "unchanged"
  };
}

function readCompletionDecision({
  routeNegativeChecksPassed,
  noSecretScanPassed,
  changedFilesNoSecretScanPassed
}: {
  routeNegativeChecksPassed: boolean;
  noSecretScanPassed: boolean;
  changedFilesNoSecretScanPassed: boolean;
}): CommentTranslatorSecurityPrivacyFinalReviewReport["completionDecision"] {
  if (!routeNegativeChecksPassed) {
    return "blocked-pending-route-negative-checks";
  }

  if (!noSecretScanPassed || !changedFilesNoSecretScanPassed) {
    return "blocked-pending-no-secret-scan";
  }

  return "task-26-complete-public-launch-still-gated";
}
