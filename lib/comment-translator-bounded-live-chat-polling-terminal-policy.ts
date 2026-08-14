import "server-only";

import type { YouTubeLiveChatTerminalStateCode } from "./comment-translator-youtube-runtime-foundation";
import type { CommentTranslatorActiveSessionRecord, CommentTranslatorSessionUsageSnapshot } from "./comment-translator-session-runtime";
import type { CommentTranslatorStartStopReasonUxCode } from "./comment-translator-start-stop-reason-ux";
import type { CommentTranslatorPollingQuotaStopReason, CommentTranslatorPollingTerminalStopReason } from "./comment-translator-bounded-live-chat-polling-types";

export function assessPollingTerminalStopReason({
  activeSession,
  usage,
  nowMs
}: {
  readonly activeSession: CommentTranslatorActiveSessionRecord;
  readonly usage: CommentTranslatorSessionUsageSnapshot;
  readonly nowMs: number;
}): Exclude<CommentTranslatorPollingQuotaStopReason, "translated-message-cap"> | null {
  const sessionLimitMs = usage.planEntitlement?.sessionLimitMs ?? 30 * 60 * 1_000;
  const dailyLimitMs = usage.planEntitlement?.dailyLimitMs ?? 30 * 60 * 1_000;
  const activeElapsedMs = usage.currentSessionElapsedMs ?? Math.max(0, nowMs - activeSession.startedAtMs);
  if (nowMs - activeSession.lastHeartbeatAtMs > 45_000) return "missing-heartbeat";
  if (activeElapsedMs >= sessionLimitMs) return "session-time-limit";
  if (usage.planEntitlement?.plan !== "paid" && usage.dailyUsedMs > 0 && usage.dailyUsedMs + Math.max(0, activeElapsedMs) >= dailyLimitMs) {
    return "daily-time-limit";
  }
  const monthlyLimit = usage.planEntitlement?.monthlyProviderInputCharacterLimit ?? 20_000;
  if ((usage.monthlyProviderInputCharacterEstimate ?? 0) >= monthlyLimit) return "ai-budget-stop";
  if (!usage.providerBudgetAvailable) return "provider-quota-stop";
  if (!usage.globalBudgetAvailable) return "global-budget-stop";
  if (!usage.aiBudgetAvailable) return "ai-budget-stop";
  if (usage.translationProviderAvailable === false) return "translation-provider-limit";
  return null;
}

export function resolvePollingQuotaStopReasonUxCode(
  stopReason: CommentTranslatorPollingQuotaStopReason
): CommentTranslatorStartStopReasonUxCode {
  if (stopReason === "translation-provider-limit") return "translation-provider-unavailable";
  if (stopReason === "missing-heartbeat") return "heartbeat-or-browser-disconnect";
  return "quota-or-budget-stop";
}

export function mapTerminalCodeToStopReason(
  code: YouTubeLiveChatTerminalStateCode
): CommentTranslatorPollingTerminalStopReason {
  if (code === "liveChatEnded") return "stream-ended";
  if (code === "liveChatDisabled" || code === "liveChatNotFound") return "stream-unavailable";
  return "terminal-provider-error";
}
