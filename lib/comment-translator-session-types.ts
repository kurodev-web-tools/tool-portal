import "server-only";

import type { CommentTranslatorFreeBetaUsageDisplay } from "./comment-translator-free-beta-usage-display";
import type { CommentTranslatorPerMinuteRatePauseProjection, CommentTranslatorPerMinuteRatePauseResolution } from "./comment-translator-per-minute-rate-pause";
import type { CommentTranslatorServerOnlyLiveChatTargetLookupResult } from "./comment-translator-server-only-live-chat-target-lookup";
import type { CommentTranslatorStartStopReasonUx, CommentTranslatorStartStopReasonUxCode } from "./comment-translator-start-stop-reason-ux";
import type { YouTubeOAuthCredentialStatusCallerAuthorization } from "./comment-translator-youtube-credential-status-boundary";
import type { YouTubeOAuthCredentialTranslatorStartReadiness } from "./comment-translator-youtube-disconnect-runtime";

export type CommentTranslatorSessionPlan = "free" | "paid";

export type CommentTranslatorSessionPlanEntitlement = {
  readonly plan: CommentTranslatorSessionPlan;
  readonly planEntitlementReferenceId: string;
  readonly entitlementSource: "server-owned";
  readonly dailyLimitMs: number;
  readonly sessionLimitMs: number;
  readonly translatedMessagesPerMinute: number;
  readonly activeSessionsPerUser: number;
  readonly monthlyProviderInputCharacterLimit?: number;
  readonly paidPrioritization: "not-implemented";
  readonly providerUsageCharging: "not-implemented";
};

export type CommentTranslatorSessionStopReason =
  | "user-stop" | "stream-ended" | "stream-unavailable" | "browser-disconnect"
  | "missing-heartbeat" | "auth-failed" | "token-refresh-failed" | "reconnect-required"
  | "daily-time-limit" | "session-time-limit" | "translated-message-cap" | "provider-quota-stop"
  | "global-budget-stop" | "ai-budget-stop" | "translation-provider-limit" | "session-limit"
  | "terminal-provider-error";

export type CommentTranslatorSessionUsageSnapshot = {
  readonly dailyUsedMs: number;
  readonly currentSessionElapsedMs?: number;
  readonly translatedMessagesInCurrentMinute: number;
  readonly monthlyProviderInputCharacterEstimate?: number;
  readonly providerBudgetAvailable: boolean;
  readonly globalBudgetAvailable: boolean;
  readonly aiBudgetAvailable: boolean;
  readonly translationProviderAvailable?: boolean;
  readonly planEntitlement?: CommentTranslatorSessionPlanEntitlement;
};

export type CommentTranslatorActiveSessionRecord = {
  readonly sessionReferenceId: string;
  readonly startedAtMs: number;
  readonly lastHeartbeatAtMs: number;
  readonly credentialReferenceId?: string;
};

export type CommentTranslatorSessionCommandIntent = "status" | "start" | "stop" | "heartbeat";

export type CommentTranslatorSessionHeartbeatState = {
  readonly required: true;
  readonly timeoutSeconds: 45;
  readonly lastHeartbeatAtIso: string | null;
};

type CommentTranslatorSessionStateBase = {
  readonly provider: "youtube";
  readonly plan: CommentTranslatorSessionPlan;
  readonly elapsedSeconds: number;
  readonly remainingSessionSeconds: number;
  readonly remainingDailySeconds: number;
  readonly heartbeat: CommentTranslatorSessionHeartbeatState;
  readonly usageDisplay: CommentTranslatorFreeBetaUsageDisplay;
  readonly tokenValue: "never-returned-by-design";
  readonly providerTargetMetadata: "forbidden";
};

export type CommentTranslatorSessionBrowserSafeState =
  | (CommentTranslatorSessionStateBase & {
      readonly status: "not-started";
      readonly startedAtIso: null;
      readonly stoppedAtIso: null;
      readonly elapsedSeconds: 0;
      readonly stopReason: null;
      readonly reasonUx: null;
      readonly nextAction: "press-start";
      readonly providerApiUsage: "not-started-before-explicit-start";
      readonly aiTranslationUsage: "not-started-before-explicit-start";
    })
  | (CommentTranslatorSessionStateBase & CommentTranslatorPerMinuteRatePauseProjection & {
      readonly status: "active";
      readonly sessionReferenceId: string;
      readonly credentialReferenceId: string | null;
      readonly startedAtIso: string;
      readonly stoppedAtIso: null;
      readonly stopReason: null;
      readonly reasonUx: null;
      readonly nextAction: "send-heartbeat-or-stop";
      readonly providerApiUsage: "allowed-after-explicit-start-not-run-in-task-7";
      readonly aiTranslationUsage: "allowed-after-explicit-start-not-run-in-task-7";
    })
  | (CommentTranslatorSessionStateBase & {
      readonly status: "stopped";
      readonly sessionReferenceId: string | null;
      readonly credentialReferenceId: string | null;
      readonly startedAtIso: string | null;
      readonly stoppedAtIso: string;
      readonly stopReason: CommentTranslatorSessionStopReason;
      readonly reasonUx: CommentTranslatorStartStopReasonUx;
      readonly nextAction: "session-stopped" | "reconnect-or-sign-in" | "wait-for-limit-reset";
      readonly providerApiUsage: "stopped";
      readonly aiTranslationUsage: "stopped";
      readonly providerErrorBody: "never-returned-by-design";
    });

export type StartCommentTranslatorSessionRequest = {
  readonly nowMs: number;
  readonly plan: CommentTranslatorSessionPlan;
  readonly callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  readonly credentialReadiness: YouTubeOAuthCredentialTranslatorStartReadiness;
  readonly activeSession: CommentTranslatorActiveSessionRecord | null;
  readonly usage: CommentTranslatorSessionUsageSnapshot;
  readonly liveChatTargetReadiness?: CommentTranslatorServerOnlyLiveChatTargetLookupResult;
  readonly createSessionReferenceId: () => string;
};

export type EvaluateCommentTranslatorSessionStopRequest = {
  readonly activeSession: CommentTranslatorActiveSessionRecord | CommentTranslatorSessionBrowserSafeState | null;
  readonly nowMs: number;
  readonly plan: CommentTranslatorSessionPlan;
  readonly browserConnected: boolean;
  readonly callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  readonly credentialReadiness: YouTubeOAuthCredentialTranslatorStartReadiness | null;
  readonly usage: CommentTranslatorSessionUsageSnapshot;
  readonly ratePauseResolution: CommentTranslatorPerMinuteRatePauseResolution;
  readonly providerSignal?: CommentTranslatorSessionStopReason | null;
  readonly providerSignalReasonUxCode?: CommentTranslatorStartStopReasonUxCode | null;
};

export type ReadOnlyCommentTranslatorSessionStatusRequest = Omit<
  EvaluateCommentTranslatorSessionStopRequest,
  "credentialReadiness" | "ratePauseResolution"
> & {
  readonly ratePauseResolution: CommentTranslatorPerMinuteRatePauseResolution;
};

export type StopCommentTranslatorSessionRequest = {
  readonly activeSession: CommentTranslatorActiveSessionRecord | CommentTranslatorSessionBrowserSafeState | null;
  readonly nowMs: number;
  readonly plan: CommentTranslatorSessionPlan;
  readonly usage?: CommentTranslatorSessionUsageSnapshot;
  readonly reason: CommentTranslatorSessionStopReason;
  readonly reasonUxCode?: CommentTranslatorStartStopReasonUxCode | null;
};

export type ReadCommentTranslatorSessionCommandRequest = StartCommentTranslatorSessionRequest & {
  readonly intent: CommentTranslatorSessionCommandIntent;
  readonly ratePauseResolution: CommentTranslatorPerMinuteRatePauseResolution;
  readonly browserConnected?: boolean;
  readonly stopReason?: CommentTranslatorSessionStopReason;
  readonly providerSignal?: EvaluateCommentTranslatorSessionStopRequest["providerSignal"];
  readonly providerSignalReasonUxCode?: CommentTranslatorStartStopReasonUxCode | null;
};
