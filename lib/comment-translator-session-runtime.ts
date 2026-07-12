import "server-only";

export type * from "./comment-translator-session-types";
export { createCommentTranslatorSessionPlanEntitlement } from "./comment-translator-session-policy";
export {
  createCommentTranslatorActiveSessionState,
  createCommentTranslatorNotStartedSessionState
} from "./comment-translator-session-state";
export { startCommentTranslatorSession } from "./comment-translator-session-start";
export {
  evaluateCommentTranslatorSessionStopCondition,
  readCommentTranslatorReadOnlySessionStatus,
  readCommentTranslatorSessionCommand,
  stopCommentTranslatorSession
} from "./comment-translator-session-command";
export {
  persistInMemoryCommentTranslatorActiveSession,
  readInMemoryCommentTranslatorActiveSession
} from "./comment-translator-session-memory-store";

export const commentTranslatorSessionRuntimeContract = {
  implementationStage: "server-owned-session-start-stop-contract",
  runtime: "server-only",
  route: "/api/comment-translator/session",
  serverActions: [
    "startCommentTranslatorSessionAction",
    "stopCommentTranslatorSessionAction",
    "heartbeatCommentTranslatorSessionAction"
  ],
  providerApiUsageBeforeExplicitStart: "not-started-before-explicit-start",
  aiUsageBeforeExplicitStart: "not-started-before-explicit-start",
  liveProviderExecution: "not-run-in-f7",
  providerTargetLookup: "start-only-server-boundary-f6",
  liveChatTargetReadiness: "server-only-start-input",
  providerSignal: "sanitized-terminal-signal-only",
  activePhaseAuthority: "bounded-polling-coordinator-projection",
  usageDisplay: "browser-safe-sanitized-usage-only",
  quotaWrite: "not-run-in-task-7",
  usageQuotaBudgetLedger: "server-owned-usage-quota-budget-ledger-foundation-in-task-8",
  durableSessionAuthority: "required-before-public-session-start",
  entitlementState: "server-owned-plan-entitlement-reference",
  billingEnforcement: "not-run-in-task-7",
  browserStorage: "forbidden",
  handoffPayload: "unchanged",
  freePlanLimits: {
    dailyMinutes: 30,
    sessionMinutes: 30,
    translatedMessagesPerMinute: 30,
    activeSessionsPerUser: 1,
    monthlyProviderInputCharacters: 20_000
  },
  heartbeatTimeoutSeconds: 45,
  stopReasons: [
    "user-stop",
    "stream-ended",
    "stream-unavailable",
    "browser-disconnect",
    "missing-heartbeat",
    "auth-failed",
    "token-refresh-failed",
    "reconnect-required",
    "daily-time-limit",
    "session-time-limit",
    "translated-message-cap",
    "provider-quota-stop",
    "global-budget-stop",
    "ai-budget-stop",
    "translation-provider-limit",
    "session-limit",
    "terminal-provider-error"
  ],
  reasonUx: "sanitized-browser-safe-reason-metadata-only",
  forbiddenBrowserOutput: [
    "oauth-token-value",
    "refresh-token-value",
    "authorization-code-value",
    "owner-user-id-value",
    "provider-channel-id-value",
    "liveChatId-value",
    "service-role-key-value",
    "authorization-header-value",
    "provider-target-metadata",
    "provider-error-body",
    "ciphertext-reference",
    "decrypt-capability"
  ]
} as const;
