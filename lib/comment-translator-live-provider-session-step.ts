import "server-only";

import {
  readCommentTranslatorBoundedLiveChatPollingTick,
  seedCommentTranslatorBoundedLiveChatPollingStateForActiveSession,
  type CommentTranslatorBoundedLiveChatPollingAdapter
} from "./comment-translator-bounded-live-chat-polling-wiring";
import {
  resolveCommentTranslatorServerOnlyLiveChatTargetLookupForStart,
  type CommentTranslatorServerOnlyLiveChatTargetLookupAdapter
} from "./comment-translator-server-only-live-chat-target-lookup";
import {
  createCommentTranslatorRealCommentsFeedStateFromTranslatedRows,
  executeCommentTranslatorAzureNormalTranslationForNormalizedMessages
} from "./comment-translator-azure-normal-translation-execution";
import { createCommentTranslatorRealCommentsFeedStateFromNormalizedMessages } from "./comment-translator-real-comments-ui-wiring";
import type { CommentTranslatorDurableUsageCounterStoreFactoryResult } from "./comment-translator-durable-usage-counter-store";
import { mapYouTubeProviderSafeCommentsToNormalizedLiveMessages } from "./comment-translator-live-message-normalization";
import { createCommentTranslatorFreeBetaUsageDisplay } from "./comment-translator-free-beta-usage-display";
import type { CommentTranslatorActiveSessionRecord, CommentTranslatorSessionBrowserSafeState } from "./comment-translator-session-runtime";
import type { CommentTranslatorUsageLedgerSnapshot } from "./comment-translator-usage-ledger-runtime";
import {
  peekCommentTranslatorRealCommentsFeedForActiveSession,
  persistCommentTranslatorRealCommentsFeedForActiveSession
} from "./comment-translator-real-comments-feed-session-bridge";
import {
  attachCommentTranslatorLiveProviderDiagnosticsToFeed,
  createUnavailableCommentTranslatorRealCommentsFeedState,
  type CommentTranslatorRealCommentsFeedState
} from "./comment-translator-real-comments-feed-shared";
import type { CommentTranslatorRealCommentsFeedDurableStoreFactoryResult } from "./comment-translator-real-comments-feed-durable-store";
import { createTrustedCommentTranslatorRealCommentsFeedDurableStore } from "./comment-translator-real-comments-feed-durable-store";
import { createQuotaBudgetStopHandoff } from "./comment-translator-bounded-live-chat-polling-result-projection";
import {
  resolveCommentTranslatorPaidPollBudgetGate,
  resolveCommentTranslatorPaidStopNextResetAtIso,
  type CommentTranslatorPaidSessionAuthorityRead
} from "./comment-translator-public-entitlement-baseline";
import { executeCommentTranslatorPaidNormalTranslationForProviderSafeComments } from "./comment-translator-azure-normal-translation-execution";
import { settleCommentTranslatorPaidMessageRateExecution } from "./comment-translator-provider-execution-runtime";
import type { YouTubeOAuthCredentialStatusCallerAuthorization } from "./comment-translator-youtube-credential-status-boundary";
import type { YouTubeOAuthCredentialTranslatorStartReadiness } from "./comment-translator-youtube-disconnect-runtime";
import type { CommentTranslatorTargetLanguageId } from "./comment-translator";
import { createCommentTranslatorPerMinuteRunningProjection } from "./comment-translator-per-minute-rate-pause";
import {
  createCommentTranslatorLiveProviderSessionStepResult,
  createCommentTranslatorLiveProviderTranslationDiagnostics,
  type CommentTranslatorLiveProviderSessionStepResult
} from "./comment-translator-live-provider-session-step-result";
import type { CommentTranslatorPollingQuotaStopReason } from "./comment-translator-bounded-live-chat-polling-types";

export type { CommentTranslatorLiveProviderSessionStepResult } from "./comment-translator-live-provider-session-step-result";

export async function runCommentTranslatorLiveProviderSessionStep({
  activeSession,
  usage,
  callerAuthorization,
  credentialReadiness,
  targetLookupAdapter,
  pollingAdapter,
  durableUsageCounterStore,
  paidSessionAuthority,
  durableFeedStore,
  nowMs,
  targetLanguage,
  sourceLanguages
}: {
  readonly activeSession: CommentTranslatorActiveSessionRecord | null;
  readonly usage: CommentTranslatorUsageLedgerSnapshot;
  readonly callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  readonly credentialReadiness: YouTubeOAuthCredentialTranslatorStartReadiness;
  readonly targetLookupAdapter: CommentTranslatorServerOnlyLiveChatTargetLookupAdapter;
  readonly pollingAdapter: CommentTranslatorBoundedLiveChatPollingAdapter;
  readonly durableUsageCounterStore?: CommentTranslatorDurableUsageCounterStoreFactoryResult;
  readonly paidSessionAuthority?: Extract<CommentTranslatorPaidSessionAuthorityRead, { status: "ready" }> | null;
  readonly durableFeedStore?: CommentTranslatorRealCommentsFeedDurableStoreFactoryResult;
  readonly nowMs: number;
  readonly targetLanguage: CommentTranslatorTargetLanguageId;
  readonly sourceLanguages?: readonly string[];
}): Promise<CommentTranslatorLiveProviderSessionStepResult> {
  if (usage.planEntitlement.plan === "paid") {
    if (callerAuthorization.status !== "authorized") {
      return createCommentTranslatorLiveProviderSessionStepResult({
        pollingTick: createQuotaBudgetStopHandoff("global-budget-stop", utcDayEndIso(nowMs)),
        translationStatus: "provider-unavailable",
        translatedCount: 0,
        persistedFeedRowCount: 0
      });
    }
    const paidPollBudget = await ensurePaidPollBudget({
      activeSession,
      callerAuthorization,
      nowMs,
      paidSessionAuthority
    });
    if (paidPollBudget.status === "stop") {
      const pollingTick = createQuotaBudgetStopHandoff("global-budget-stop", paidPollBudget.nextResetAtIso);
      return createCommentTranslatorLiveProviderSessionStepResult({
        pollingTick,
        translationStatus: "not-run",
        translatedCount: 0,
        persistedFeedRowCount: 0
      });
    }
  }
  let pollingTick = await readCommentTranslatorBoundedLiveChatPollingTick({ intent: "heartbeat", activeSession, usage, adapter: pollingAdapter, nowMs });
  const translatedMessagesPerMinute = usage.planEntitlement.translatedMessagesPerMinute;
  const hasPerMinuteCapacity = usage.translatedMessagesInCurrentMinute < translatedMessagesPerMinute;
  if (pollingTick.status === "unavailable-missing-server-only-polling-state" && activeSession && hasPerMinuteCapacity) {
    const target = await resolveCommentTranslatorServerOnlyLiveChatTargetLookupForStart({ intent: "start", credentialReadiness, adapter: targetLookupAdapter });
    seedCommentTranslatorBoundedLiveChatPollingStateForActiveSession({
      state: createActiveSeedState({ activeSession, usage, nowMs }),
      liveChatTargetReadiness: target,
      nowMs
    });
    pollingTick = await readCommentTranslatorBoundedLiveChatPollingTick({ intent: "heartbeat", activeSession, usage, adapter: pollingAdapter, nowMs });
  }
  if (!("serverOnlyCommentsForTranslation" in pollingTick) || pollingTick.serverOnlyCommentsForTranslation.length === 0) {
    const safeFeed = peekCommentTranslatorRealCommentsFeedForActiveSession({ callerAuthorization, activeSession })
      ?? createUnavailableCommentTranslatorRealCommentsFeedState({ reason: "live-provider-polling-not-approved" });
    return createCommentTranslatorLiveProviderSessionStepResult({
      pollingTick,
      translationStatus: "not-run",
      translatedCount: 0,
      persistedFeedRowCount: safeFeed?.status === "ready" ? safeFeed.rows.length : 0,
      feed: safeFeed
    });
  }
  const normalizedMessages = mapYouTubeProviderSafeCommentsToNormalizedLiveMessages(pollingTick.serverOnlyCommentsForTranslation);
  if (!activeSession || normalizedMessages.length === 0) {
    return createCommentTranslatorLiveProviderSessionStepResult({ pollingTick, translationStatus: "not-run", translatedCount: 0, persistedFeedRowCount: 0 });
  }
  if (usage.planEntitlement.plan === "paid") {
    const paidAuthority = paidSessionAuthority;
    if (callerAuthorization.status !== "authorized" || !activeSession || !paidAuthority) {
      return createCommentTranslatorLiveProviderSessionStepResult({
        pollingTick,
        translationStatus: "provider-unavailable",
        translatedCount: 0,
        persistedFeedRowCount: 0
      });
    }
    const entitlement = paidAuthority.entitlement;
    if (!entitlement.currentPeriodStartIso || !entitlement.currentPeriodEndIso) {
      return createCommentTranslatorLiveProviderSessionStepResult({
        pollingTick,
        translationStatus: "provider-unavailable",
        translatedCount: 0,
        persistedFeedRowCount: 0
      });
    }
    let execution;
    try {
      execution = await executeCommentTranslatorPaidNormalTranslationForProviderSafeComments({
        comments: pollingTick.serverOnlyCommentsForTranslation,
        targetLanguage,
        sourceLanguages,
        callerAuthorization,
        ownerUserId: callerAuthorization.ownerUserId,
        sessionReferenceId: activeSession.sessionReferenceId,
        occurredAtMs: nowMs,
        periodStartIso: entitlement.currentPeriodStartIso,
        periodEndIso: entitlement.currentPeriodEndIso,
        utcMonth: monthBucketIso(nowMs),
        usageStore: paidAuthority.providerRuntime.usageStore,
        serverSecret: paidAuthority.providerRuntime.serverSecret,
        attemptKeyVersion: paidAuthority.providerRuntime.attemptKeyVersion,
        openAi: paidAuthority.providerRuntime.openAi,
        azureProvider: paidAuthority.providerRuntime.azureProvider,
        circuitAuthority: paidAuthority.providerRuntime.circuitAuthority,
        killSwitches: paidAuthority.providerRuntime.killSwitches,
        enforceMessageRate: true
      });
    } catch {
      return createCommentTranslatorLiveProviderSessionStepResult({
        pollingTick: createQuotaBudgetStopHandoff("paid-authority-unreadable", utcDayEndIso(nowMs)),
        translationStatus: "provider-unavailable",
        translatedCount: 0,
        persistedFeedRowCount: 0
      });
    }
    const createFeedSettlementFailureResult = () => createCommentTranslatorLiveProviderSessionStepResult({
      pollingTick: createQuotaBudgetStopHandoff("paid-authority-unreadable", utcDayEndIso(nowMs)),
      translationStatus: "provider-unavailable",
      translatedCount: 0,
      persistedFeedRowCount: 0
    });
    if (execution.paidCommittedReplay === true) {
      // A committed retry intentionally has no translated rows. Active polling
      // must neither read the durable snapshot nor rebuild/persist a degraded
      // feed from that empty result. Same-Worker state remains safe to return.
      const replayFeed = peekCommentTranslatorRealCommentsFeedForActiveSession({ callerAuthorization, activeSession })
        ?? createUnavailableCommentTranslatorRealCommentsFeedState({ reason: "live-provider-polling-not-approved" });
      const currentMessageReferenceIds = new Set(normalizedMessages.map((message) => message.messageReferenceId));
      const replayTranslatedCount = replayFeed.status === "ready"
        ? replayFeed.rows.reduce(
            (count, row) => count + Number(
              currentMessageReferenceIds.has(row.messageReferenceId)
              && row.translationStatus === "translated-f10"
              && typeof row.translatedText === "string"
              && row.translatedText.length > 0
            ),
            0
          )
        : 0;
      const settlementSuccessfulCount = Math.min(
        normalizedMessages.length,
        Math.max(
          replayTranslatedCount,
          execution.translatedCount + (execution.paidCommittedReplaySuccessfulCount ?? 0)
        )
      );
      const settlementStatus = await settleCommentTranslatorPaidMessageRateExecution(
        execution,
        settlementSuccessfulCount
      );
      if (settlementStatus === "failed") return createFeedSettlementFailureResult();
      const paidProviderStopReason = mapPaidProviderStopReason(execution.paidProviderStopReason);
      const paidProviderNextResetAtIso = paidProviderStopReason
        ? resolveCommentTranslatorPaidStopNextResetAtIso({
            reason: paidProviderStopReason,
            paidSessionAuthority: paidAuthority,
            nowMs
          })
        : undefined;
      return createCommentTranslatorLiveProviderSessionStepResult({
        pollingTick: paidProviderStopReason
          ? createQuotaBudgetStopHandoff(paidProviderStopReason, paidProviderNextResetAtIso)
          : pollingTick,
        translationStatus: execution.paidProviderStopReason ? "provider-unavailable" : "completed",
        translatedCount: 0,
        persistedFeedRowCount: replayFeed.status === "ready" ? replayFeed.rows.length : 0,
        feed: replayFeed,
        translationDiagnostics: {
          providerCallCount: execution.providerCallCount,
          cacheHitCount: execution.cacheHitCount,
          cacheMissCount: execution.cacheMissCount,
          duplicateTextCacheHitCount: 0,
          duplicateTextSkippedCount: 0,
          languagePolicySkippedCount: execution.skipsByReason.languagePolicy
        }
      });
    }
    try {
      const feedBase = createCommentTranslatorRealCommentsFeedStateFromTranslatedRows({
        feed: createCommentTranslatorRealCommentsFeedStateFromNormalizedMessages({
          messages: normalizedMessages,
          sessionStatus: "active",
          targetLanguage
        }),
        execution,
        eligibleMessages: normalizedMessages
      });
      const existingFeed = peekCommentTranslatorRealCommentsFeedForActiveSession({ callerAuthorization, activeSession })
        ?? createUnavailableCommentTranslatorRealCommentsFeedState({ reason: "live-provider-polling-not-approved" });
      const mergedFeed = mergePaidFeedRows(existingFeed, feedBase);
      const paidProviderStopReason = mapPaidProviderStopReason(execution.paidProviderStopReason);
      const paidProviderNextResetAtIso = paidProviderStopReason
        ? resolveCommentTranslatorPaidStopNextResetAtIso({
            reason: paidProviderStopReason,
            paidSessionAuthority: paidAuthority,
            nowMs
          })
        : undefined;
      const feedWithDiagnostics = attachCommentTranslatorLiveProviderDiagnosticsToFeed({
        feed: mergedFeed,
        diagnostics: createPaidTranslationDiagnostics(execution, paidProviderNextResetAtIso)
      });
      const feedPersistence = await persistCommentTranslatorRealCommentsFeedForActiveSession({
        callerAuthorization,
        sessionReferenceId: activeSession.sessionReferenceId,
        feed: feedWithDiagnostics,
        recordedAtMs: nowMs,
        durableFeedStore: paidAuthorityFeedStore(paidAuthority, durableFeedStore)
      });
      if (feedPersistence.durableFeedPersistResultLabel !== "durable-feed-persisted") {
        await settleCommentTranslatorPaidMessageRateExecution(execution, execution.translatedCount);
        return createFeedSettlementFailureResult();
      }
      const currentMessageReferenceIds = new Set(normalizedMessages.map((message) => message.messageReferenceId));
      const persistedTranslatedCount = feedWithDiagnostics.rows.reduce(
        (count, row) => count + Number(
          currentMessageReferenceIds.has(row.messageReferenceId)
          && row.translationStatus === "translated-f10"
          && typeof row.translatedText === "string"
          && row.translatedText.length > 0
        ),
        0
      );
      const settlementTranslatedCount = Math.min(
        normalizedMessages.length,
        Math.max(execution.translatedCount, persistedTranslatedCount)
      );
      const settlementStatus = await settleCommentTranslatorPaidMessageRateExecution(
        execution,
        settlementTranslatedCount
      );
      if (settlementStatus === "failed") {
        return createFeedSettlementFailureResult();
      }
      const translationStatus = execution.paidProviderStopReason ? "provider-unavailable" : "completed";
      return createCommentTranslatorLiveProviderSessionStepResult({
        pollingTick: paidProviderStopReason
          ? createQuotaBudgetStopHandoff(paidProviderStopReason, paidProviderNextResetAtIso)
          : pollingTick,
        translationStatus,
        translatedCount: execution.translatedCount,
        persistedFeedRowCount: feedPersistence.displayRowCount,
        feed: feedWithDiagnostics,
        translationDiagnostics: {
          providerCallCount: execution.providerCallCount,
          cacheHitCount: execution.cacheHitCount,
          cacheMissCount: execution.cacheMissCount,
          duplicateTextCacheHitCount: 0,
          duplicateTextSkippedCount: 0,
          languagePolicySkippedCount: execution.skipsByReason.languagePolicy
        }
      });
    } catch {
      await settleCommentTranslatorPaidMessageRateExecution(execution, execution.translatedCount);
      return createFeedSettlementFailureResult();
    }
  }
  const translation = await executeCommentTranslatorAzureNormalTranslationForNormalizedMessages({
    messages: normalizedMessages,
    sessionStatus: "active",
    targetLanguage,
    sourceLanguages,
    callerAuthorization,
    sessionReferenceId: activeSession.sessionReferenceId,
    occurredAtMs: nowMs,
    usage,
    durableUsageCounterStore
  });
  return createCommentTranslatorLiveProviderSessionStepResult({
    pollingTick,
    translationStatus: translation.status,
    translatedCount: translation.execution.translatedCount,
    persistedFeedRowCount: translation.feedPersistence.displayRowCount,
    feed: translation.feed,
    translationDiagnostics: createCommentTranslatorLiveProviderTranslationDiagnostics(translation)
  });
}

function mapPaidProviderStopReason(
  reason: Awaited<ReturnType<typeof executeCommentTranslatorPaidNormalTranslationForProviderSafeComments>>["paidProviderStopReason"]
): CommentTranslatorPollingQuotaStopReason | null {
  if (!reason) return null;
  if (reason === "paid-character-quota-stop" || reason === "paid-individual-cost-stop" || reason === "paid-global-cost-stop") {
    return reason;
  }
  if (reason === "authority-unreadable") return "paid-authority-unreadable";
  if (reason === "paid-message-rate-stop") return "translated-message-cap";
  // Task 6 classifies capacity pressure as non-consuming backpressure. Keep
  // the Paid session active so the next 15-second feed cycle can retry and
  // the OpenAI circuit can recover without a client-initiated restart.
  if (reason === "backpressure" || reason === "provider-capacity-paused") return null;
  if (reason === "duplicate-session-batch") return "global-budget-stop";
  return "translation-provider-limit";
}

async function ensurePaidPollBudget({
  activeSession,
  callerAuthorization,
  nowMs,
  paidSessionAuthority
}: {
  readonly activeSession: CommentTranslatorActiveSessionRecord | null;
  readonly callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  readonly nowMs: number;
  readonly paidSessionAuthority?: Extract<CommentTranslatorPaidSessionAuthorityRead, { status: "ready" }> | null;
}): Promise<{ status: "ready" } | { status: "stop"; nextResetAtIso: string }> {
  const fallbackResetAtIso = utcDayEndIso(nowMs);
  if (callerAuthorization.status !== "authorized" || !activeSession || !paidSessionAuthority) {
    return { status: "stop", nextResetAtIso: fallbackResetAtIso };
  }
  try {
    // The existing reservation RPC is idempotent for the current UTC bucket
    // and uses the database clock. Calling it on every heartbeat closes the
    // read->midnight race: a new bucket must be reserved before polling can
    // proceed after the UTC boundary.
    const reservedPolls = await paidSessionAuthority.providerRuntime.usageStore.reservePollBudget({
      sessionReferenceId: activeSession.sessionReferenceId,
      ownerUserId: callerAuthorization.ownerUserId,
      dailyBudget: paidSessionAuthority.providerRuntime.dailyPollBudget,
      nowIso: new Date(nowMs).toISOString()
    });
    if (reservedPolls <= 0) return { status: "stop", nextResetAtIso: fallbackResetAtIso };
    const budget = await paidSessionAuthority.providerRuntime.usageStore.readPollBudget({
      sessionReferenceId: activeSession.sessionReferenceId,
      ownerUserId: callerAuthorization.ownerUserId,
      nowIso: new Date(nowMs).toISOString()
    });
    if (budget.dailyBudget === null || !budget.sessionReservationPresent || budget.sessionReservedPolls <= 0) {
      return { status: "stop", nextResetAtIso: budget.nextResetAtIso || fallbackResetAtIso };
    }
    const gate = resolveCommentTranslatorPaidPollBudgetGate({
      dailyBudget: budget.dailyBudget,
      reservedPolls: budget.reservedPolls,
      isNewSession: false,
      nowMs
    });
    return gate.status === "stop-active-auto-poll"
      ? { status: "stop", nextResetAtIso: budget.nextResetAtIso }
      : { status: "ready" };
  } catch {
    return { status: "stop", nextResetAtIso: fallbackResetAtIso };
  }
}

function paidAuthorityFeedStore(
  _paidAuthority: Extract<CommentTranslatorPaidSessionAuthorityRead, { status: "ready" }>,
  durableFeedStore?: CommentTranslatorRealCommentsFeedDurableStoreFactoryResult
) {
  return durableFeedStore ?? createTrustedCommentTranslatorRealCommentsFeedDurableStore();
}

function mergePaidFeedRows(
  existingFeed: CommentTranslatorRealCommentsFeedState,
  currentFeed: Awaited<ReturnType<typeof createCommentTranslatorRealCommentsFeedStateFromNormalizedMessages>>
) {
  if (existingFeed.status !== "ready") return currentFeed;
  const rows = new Map(existingFeed.rows.map((row) => [row.messageReferenceId, row]));
  for (const row of currentFeed.rows) {
    const existingRow = rows.get(row.messageReferenceId);
    const existingSafeTranslationMustSurviveReplay =
      existingRow?.translationStatus === "translated-f10"
      && typeof existingRow.translatedText === "string"
      && existingRow.translatedText.length > 0
      && row.translationStatus !== "translated-f10";
    if (!existingSafeTranslationMustSurviveReplay) rows.set(row.messageReferenceId, row);
  }
  return { ...currentFeed, rows: Array.from(rows.values()) };
}

function createPaidTranslationDiagnostics(
  execution: Awaited<ReturnType<typeof executeCommentTranslatorPaidNormalTranslationForProviderSafeComments>>,
  nextResetAtIso?: string
) {
  return {
    pollTickStatus: "polled" as const,
    returnedCount: execution.skippedCount + execution.translatedCount,
    acceptedCount: execution.translatedCount,
    skippedCount: execution.skippedCount,
    preStartSkippedCount: 0,
    skipReasonCounts: execution.paidProviderStopReason
      ? [{ reason: "provider-unavailable" as const, count: execution.skippedCount }]
      : [],
    providerCallCount: execution.providerCallCount,
    cacheHitCount: execution.cacheHitCount,
    cacheMissCount: execution.cacheMissCount,
    duplicateTextCacheHitCount: 0,
    duplicateTextSkippedCount: 0,
    languagePolicySkippedCount: execution.skipsByReason.languagePolicy,
    translatedCount: execution.translatedCount,
    persistedFeedRowCount: execution.translatedCount,
    nextPollDue: "waiting" as const,
    stopReason: execution.paidProviderStopReason ?? null,
    nextResetAtIso: nextResetAtIso ?? null,
    rawProviderPayload: "not-returned-by-design" as const,
    rawComments: "not-returned-by-design" as const,
    providerTargetMetadata: "forbidden" as const,
    serverOnlyCursor: "not-returned-by-design" as const
  };
}

function monthBucketIso(nowMs: number): string {
  return `${new Date(nowMs).toISOString().slice(0, 7)}-01`;
}

function dayBucketEndIso(nowMs: number): string {
  const date = new Date(nowMs);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1)).toISOString();
}

const utcDayEndIso = dayBucketEndIso;

function createActiveSeedState({
  activeSession,
  usage,
  nowMs
}: {
  readonly activeSession: CommentTranslatorActiveSessionRecord;
  readonly usage: CommentTranslatorUsageLedgerSnapshot;
  readonly nowMs: number;
}): CommentTranslatorSessionBrowserSafeState {
  const elapsedSeconds = Math.max(0, Math.floor((nowMs - activeSession.startedAtMs) / 1000));
  return {
    status: "active",
    provider: "youtube",
    plan: usage.planEntitlement.plan,
    sessionReferenceId: activeSession.sessionReferenceId,
    credentialReferenceId: activeSession.credentialReferenceId ?? null,
    startedAtIso: new Date(activeSession.startedAtMs).toISOString(),
    stoppedAtIso: null,
    elapsedSeconds,
    remainingSessionSeconds: Math.max(0, Math.floor((usage.planEntitlement.sessionLimitMs - elapsedSeconds * 1000) / 1000)),
    remainingDailySeconds: Math.max(0, Math.floor((usage.planEntitlement.dailyLimitMs - usage.dailyUsedMs) / 1000)),
    heartbeat: { required: true, timeoutSeconds: 45, lastHeartbeatAtIso: new Date(activeSession.lastHeartbeatAtMs).toISOString() },
    stopReason: null,
    reasonUx: null,
    usageDisplay: createCommentTranslatorFreeBetaUsageDisplay({ usage, elapsedMs: elapsedSeconds * 1000 }),
    nextAction: "send-heartbeat-or-stop",
    providerApiUsage: "allowed-after-explicit-start",
    aiTranslationUsage: "allowed-after-explicit-start",
    tokenValue: "never-returned-by-design",
    providerTargetMetadata: "forbidden",
    ...createCommentTranslatorPerMinuteRunningProjection()
  };
}
