import "server-only";

import { createClient } from "@supabase/supabase-js";
import { isCommentTranslatorPaidAttemptId } from "@/lib/comment-translator-paid-cost-ledger";

export type CommentTranslatorPaidProviderKind = "openai_attempt" | "azure_direct_fallback";
export type CommentTranslatorPaidHourlyProvider = "openai" | "azure_fallback";
export type CommentTranslatorPaidAttemptOutcome = "completed" | "uncertain_inflight" | "provider_not_reached";
export type CommentTranslatorPaidOpenAiAttemptOutcome = CommentTranslatorPaidAttemptOutcome | "provider_reached_failed";
export type CommentTranslatorPaidProviderFailureClass =
  | "network"
  | "timeout"
  | "rate-limit"
  | "server-error"
  | "invalid-response"
  | "quota"
  | "configuration"
  | "policy";

export type CommentTranslatorPaidProviderReservation = {
  reservationStatus: string;
  sessionLeaseToken: string | null;
  openAiSlotToken: string | null;
};

export type CommentTranslatorPaidProviderDispatchClaimStatus = "claimed" | "already-dispatched";

export type CommentTranslatorPaidOpenAiAttemptReceipt = {
  attemptState: "reserved" | "uncertain" | "committed" | "released" | "expired";
  providerFailureClass: CommentTranslatorPaidProviderFailureClass | null;
  successfulItemAttemptIds: readonly string[];
  successfulInputCharacters: number;
  fallbackEligible: boolean;
  circuitFailureState: CommentTranslatorPaidCircuitFailureState;
  circuitSuccessState: CommentTranslatorPaidCircuitSuccessState;
  providerKind: CommentTranslatorPaidProviderKind;
};

export type CommentTranslatorPaidCircuitFailureState = "not-required" | "deferred" | "pending" | "recorded";
export type CommentTranslatorPaidCircuitSuccessState = "not-required" | "pending" | "recorded";

export type CommentTranslatorPaidReservationRefusal =
  | "capacity"
  | "quota"
  | "cost"
  | "individual-cost"
  | "global-cost";

export type CommentTranslatorPaidRuntimeAuthority = {
  billingPeriodAvailable: boolean;
  billingPeriodInputCharacters: number;
  billingPeriodCharacterLimit: number;
  individualCostAvailable: boolean;
  globalCostAvailable: boolean;
  translatedMessagesInCurrentMinute: number;
  translatedMessageCapacityAvailableAtIso: string | null;
};

export type CommentTranslatorPaidPollBudgetAuthority = {
  utcDay: string;
  dailyBudget: number | null;
  reservedPolls: number;
  sessionReservedPolls: number;
  sessionReservationPresent: boolean;
  nextResetAtIso: string;
};

export type CommentTranslatorPaidMessageRateReservation = {
  reservationStatus: "reserved" | "rate-limited" | "committed";
  minuteStartIso: string;
  reservedMessages: number;
  committedMessages: number;
  successfulMessageCount: number;
  capacityRemaining: number;
};

export type CommentTranslatorPaidMessageRateFinalize = {
  reservationStatus: "committed" | "released";
  minuteStartIso: string;
  reservedMessages: number;
  committedMessages: number;
  releasedMessages: number;
};

export class CommentTranslatorPaidReservationRefusedError extends Error {
  readonly refusal: CommentTranslatorPaidReservationRefusal;

  constructor(refusal: CommentTranslatorPaidReservationRefusal) {
    super("Paid provider reservation was refused by a bounded authority.");
    this.name = "CommentTranslatorPaidReservationRefusedError";
    this.refusal = refusal;
  }
}

export type CommentTranslatorPaidAzureFinalizeRequest = {
  attemptId: string;
  providerAttempt: string;
  sessionLeaseToken: string;
  actualInputCharacters?: number;
  // When OpenAI translated a subset before Azure handled the remainder,
  // Azure's monthly fallback bucket must commit only Azure characters while
  // the logical Paid billing period commits the combined successful total.
  actualBillingInputCharacters?: number;
  nowIso: string;
  circuitFailureState: Exclude<CommentTranslatorPaidCircuitFailureState, "deferred">;
  circuitSuccessState: CommentTranslatorPaidCircuitSuccessState;
} & (
  | {
      outcome: "completed";
      providerFailureClass: null;
    }
  | {
      outcome: "uncertain_inflight";
      providerFailureClass: CommentTranslatorPaidProviderFailureClass;
    }
  | {
      outcome: "provider_not_reached";
      providerFailureClass: CommentTranslatorPaidProviderFailureClass | null;
    }
);

export type CommentTranslatorPaidUsageStore = {
  readRuntimeAuthority: (request: {
    ownerUserId: string;
    periodStartIso: string;
    periodEndIso: string;
    utcMonth: string;
    nowIso: string;
  }) => Promise<CommentTranslatorPaidRuntimeAuthority>;
  readPollBudget: (request: {
    sessionReferenceId: string;
    ownerUserId: string;
    nowIso: string;
  }) => Promise<CommentTranslatorPaidPollBudgetAuthority>;
  reserveMessageRate: (request: {
    sessionReferenceId: string;
    ownerUserId: string;
    reservationKey: string;
    messageCount: number;
    nowIso: string;
  }) => Promise<CommentTranslatorPaidMessageRateReservation>;
  recordMessageRateSuccess?: (request: {
    sessionReferenceId: string;
    ownerUserId: string;
    reservationKey: string;
    successfulMessageCount: number;
    nowIso: string;
  }) => Promise<number>;
  finalizeMessageRate: (request: {
    sessionReferenceId: string;
    ownerUserId: string;
    reservationKey: string;
    translatedMessageCount: number;
    nowIso: string;
  }) => Promise<CommentTranslatorPaidMessageRateFinalize>;
  recordProviderHourlyDetail: (request: {
    attemptId: string;
    providerAttempt: string;
    sourceExpiresAtIso: string;
    ownerUserId: string;
    provider: CommentTranslatorPaidHourlyProvider;
    utcHourIso: string;
    requestCount: number;
    sessionCount: number;
    commentCount: number;
    inputCharacters: number;
    outputCharacters: number;
    inputTokens: number;
    outputTokens: number;
    estimatedCostMicros: number;
    successCount: number;
    failureCount: number;
    latencyUpTo100MsCount: number;
    latency101To250MsCount: number;
    latency251To500MsCount: number;
    latency501To1000MsCount: number;
    latency1001To2500MsCount: number;
    latency2501To5000MsCount: number;
    latency5001To10000MsCount: number;
    latencyOver10000MsCount: number;
    nowIso: string;
  }) => Promise<boolean>;
  upsertSessionSummary: (request: {
    ownerUserId: string;
    sessionReferenceId: string;
    startedAtIso: string;
    endedAtIso?: string;
    stopReason?: string;
    providerRequestCount: number;
    translatedMessageCount: number;
    inputCharacters: number;
    outputCharacters: number;
    nowIso: string;
  }) => Promise<string>;
  reserveBillingPeriodCharacters: (request: {
    attemptId: string;
    providerAttempt: string;
    ownerUserId: string;
    periodStartIso: string;
    periodEndIso: string;
    characters: number;
    nowIso: string;
  }) => Promise<number>;
  commitBillingPeriodCharacters: (request: {
    attemptId: string;
    providerAttempt: string;
    actualCharacters?: number;
    nowIso: string;
  }) => Promise<number>;
  releaseBillingPeriodCharacters: (request: {
    attemptId: string;
    providerAttempt: string;
    nowIso: string;
  }) => Promise<number>;
  abandonLogicalAttempt: (request: {
    attemptId: string;
    releasedProviderAttempt: string;
    nowIso: string;
  }) => Promise<number>;
  cleanupAttemptLedgers: (request: {
    nowIso: string;
    limit?: number;
  }) => Promise<number>;
  closeBillingPeriod: (request: {
    lifecycleId: string;
    reconcileLeaseToken: string;
    ownerUserId: string;
    periodStartIso: string;
    periodEndIso: string;
    nowIso: string;
  }) => Promise<boolean>;
  closeUtcMonth: (request: {
    workItemId: string;
    reconcileLeaseToken: string;
    utcMonth: string;
    nowIso: string;
  }) => Promise<boolean>;
  openaiAttempt: (request: {
    attemptId: string;
    providerAttempt: string;
    ownerUserId: string;
    sessionReferenceId: string;
    periodStartIso: string;
    periodEndIso: string;
    utcMonth: string;
    inputCharacters: number;
    estimatedCostMicros: number;
    requestCount: number;
    tokenCount: number;
    nowIso: string;
  }) => Promise<CommentTranslatorPaidProviderReservation>;
  claimProviderDispatch: (request: {
    attemptId: string;
    providerAttempt: string;
    providerKind: CommentTranslatorPaidProviderKind;
    dispatchSequence: number;
    sessionLeaseToken: string;
    openAiSlotToken?: string;
    nowIso: string;
  }) => Promise<CommentTranslatorPaidProviderDispatchClaimStatus>;
  readOpenAiAttempt: (request: {
    attemptId: string;
    providerAttempt: string;
  }) => Promise<CommentTranslatorPaidOpenAiAttemptReceipt>;
  readProviderAttemptReplayMetadata: (request: {
    attemptId: string;
    providerAttempt: string;
  }) => Promise<CommentTranslatorPaidOpenAiAttemptReceipt>;
  extendOpenAiAttempt: (request: {
    attemptId: string;
    providerAttempt: string;
    sessionLeaseToken: string;
    openAiSlotToken: string;
    nowIso: string;
  }) => Promise<boolean>;
  finalizeOpenAiAttempt: (request: {
    attemptId: string;
    providerAttempt: string;
    sessionLeaseToken: string;
    openAiSlotToken: string;
    outcome: CommentTranslatorPaidOpenAiAttemptOutcome;
    actualInputCharacters?: number;
    actualCostMicros?: number;
    providerFailureClass: CommentTranslatorPaidProviderFailureClass | null;
    successfulItemAttemptIds: readonly string[];
    successfulInputCharacters: number;
    fallbackEligible: boolean;
    circuitFailureState: CommentTranslatorPaidCircuitFailureState;
    circuitSuccessState: CommentTranslatorPaidCircuitSuccessState;
    nowIso: string;
  }) => Promise<boolean>;
  commitTerminalOpenAiPartial: (request: {
    attemptId: string;
    providerAttempt: string;
    actualCharacters: number;
    nowIso: string;
  }) => Promise<number>;
  reclaimOpenAiAttempt: (request: { attemptId: string; providerAttempt: string; nowIso: string }) => Promise<boolean>;
  azureDirectFallback: (request: {
    attemptId: string;
    providerAttempt: string;
    ownerUserId: string;
    sessionReferenceId: string;
    periodStartIso: string;
    periodEndIso: string;
    utcMonth: string;
    inputCharacters: number;
    nowIso: string;
  }) => Promise<CommentTranslatorPaidProviderReservation>;
  finalizeAzureDirectFallback: (request: CommentTranslatorPaidAzureFinalizeRequest) => Promise<boolean>;
  settleAzurePartialFailure: (request: {
    attemptId: string;
    providerAttempt: string;
    sessionLeaseToken: string;
    actualInputCharacters: number;
    actualBillingInputCharacters: number;
    providerFailureClass: CommentTranslatorPaidProviderFailureClass;
    nowIso: string;
  }) => Promise<boolean>;
  reclaimAzureDirectFallback: (request: { attemptId: string; providerAttempt: string; nowIso: string }) => Promise<boolean>;
  reservePollBudget: (request: {
    sessionReferenceId: string;
    ownerUserId: string;
    dailyBudget: number;
    nowIso: string;
  }) => Promise<number>;
};

export type CommentTranslatorPaidUsageStoreFactoryResult =
  | {
      status: "ready";
      store: CommentTranslatorPaidUsageStore;
      missingEnvReferences: readonly [];
      failClosed: false;
    }
  | {
      status: "unavailable";
      store: null;
      missingEnvReferences: readonly ("NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY")[];
      failClosed: true;
      reason: "trusted-service-role-env-missing";
    };

type SupabaseError = { code?: string; message?: string } | null;
type SupabaseRpcResult = { data: unknown; error: SupabaseError };
type SupabaseClient = {
  rpc: (functionName: string, params: Record<string, unknown>) => Promise<SupabaseRpcResult>;
};

export type CommentTranslatorPaidForbiddenAttemptFields = {
  providerMessageId?: never;
  commentHash?: never;
  rawCommentText?: never;
};

export const commentTranslatorPaidUsageStoreContract = {
  implementationStage: "comment-translator-paid-v1-task5-durable-usage-and-cost-reservation-adapter",
  runtime: "server-only",
  tableName: "comment_translator_paid_attempt_receipts",
  logicalAttemptTableName: "comment_translator_paid_logical_attempts",
  logicalAttemptTtlHours: 24,
  cleanupMaxBatchSize: 500,
  providerHourlyDetailTableName: "comment_translator_paid_provider_hourly_details",
  providerHourlyDetailSourceReceiptTableName: "comment_translator_paid_provider_detail_source_receipts",
  sessionSummaryTableName: "comment_translator_paid_session_summaries",
  providerAttemptLedger: "attempt_id + provider_attempt + expiry only; provider content is never-recorded-by-design",
  providerMessageId: "forbidden",
  commentHash: "forbidden",
  rawCommentText: "forbidden",
  billingPeriodAuthority: "ct_paid_reserve_billing_period_characters / ct_paid_commit_billing_period_characters / ct_paid_release_billing_period_characters / ct_paid_abandon_logical_attempt",
  billingPeriodCharacterLimit: 500_000,
  individualCostLimitMicros: 3_000_000,
  globalCostLimitMicros: 25_000_000,
  azureFallbackCharacterLimit: 200_000,
  azurePhysicalCapacityAuthority: "Free actual usage snapshot + separate Paid fallback reservation bucket + strict '<' reservation RPC",
  reservationBoundary: "atomic pre-provider quota/cost/physical-capacity reservation",
  logicalAttemptSettlement: "one logical attempt; retry/fallback provider attempts settle characters at most once",
  openAiSlotLimit: 8,
  reconcilerLeaseSeconds: 120,
  remoteSupabaseMigrationApply: "not-run-in-this-thread",
  remoteSupabaseMutation: "not-run-by-codex-in-this-thread",
  browserReadableOutput: "never-returned-by-this-server-only-adapter",
  failClosedFallback: "paid-usage-unavailable-until-trusted-rpc-readable",
  trustedRpcNames: [
    "ct_paid_read_runtime_authority",
    "ct_paid_read_poll_budget",
    "ct_paid_reserve_message_rate",
    "ct_paid_finalize_message_rate",
    "ct_paid_record_provider_hourly_detail",
    "ct_paid_upsert_session_summary",
    "ct_paid_reserve_billing_period_characters",
    "ct_paid_commit_billing_period_characters",
    "ct_paid_release_billing_period_characters",
    "ct_paid_abandon_logical_attempt",
    "ct_paid_cleanup_attempt_ledgers",
    "ct_paid_close_billing_period_reconciled",
    "ct_paid_close_utc_month_reconciled",
    "ct_paid_openai_attempt",
    "ct_paid_claim_provider_dispatch",
    "ct_paid_read_openai_attempt",
    "ct_paid_read_openai_attempt_with_successes",
    "ct_paid_read_provider_attempt_replay_metadata",
    "ct_paid_extend_openai_attempt",
    "ct_paid_finalize_openai_attempt",
    "ct_paid_finalize_openai_attempt_with_successes",
    "ct_paid_finalize_openai_attempt_with_metadata",
    "ct_paid_commit_terminal_openai_partial",
    "ct_paid_reclaim_openai_attempt",
    "ct_paid_azure_direct_fallback",
    "ct_paid_finalize_azure_fallback",
    "ct_paid_finalize_azure_fallback_with_billing_characters",
    "ct_paid_finalize_azure_fallback_with_metadata",
    "ct_paid_settle_azure_partial_failure",
    "ct_paid_reclaim_azure_fallback",
    "ct_paid_reserve_poll_budget"
  ] as const
} as const;

export function createTrustedCommentTranslatorPaidUsageStore({
  env,
  createSupabaseClient = createTrustedSupabaseServiceRoleClient
}: {
  env?: Partial<Record<"NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY", string | undefined>>;
  createSupabaseClient?: (url: string, serviceRoleKey: string) => SupabaseClient;
} = {}): CommentTranslatorPaidUsageStoreFactoryResult {
  const trustedEnv = env ?? process.env;
  const url = trustedEnv.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = trustedEnv.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const missingEnvReferences: ("NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY")[] = [];
  if (!url) missingEnvReferences.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRoleKey) missingEnvReferences.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missingEnvReferences.length > 0 || !url || !serviceRoleKey) {
    return {
      status: "unavailable",
      store: null,
      missingEnvReferences,
      failClosed: true,
      reason: "trusted-service-role-env-missing"
    };
  }
  return {
    status: "ready",
    store: createCommentTranslatorPaidUsageStore({ supabase: createSupabaseClient(url, serviceRoleKey) }),
    missingEnvReferences: [],
    failClosed: false
  };
}

export function createCommentTranslatorPaidUsageStore({
  supabase
}: {
  supabase: SupabaseClient;
}): CommentTranslatorPaidUsageStore {
  return {
    async readRuntimeAuthority(request) {
      const result = await supabase.rpc("ct_paid_read_runtime_authority", {
        p_owner_user_id: request.ownerUserId,
        p_period_start: request.periodStartIso,
        p_period_end: request.periodEndIso,
        p_utc_month: request.utcMonth,
        p_now: request.nowIso
      });
      return readRuntimeAuthority(result);
    },
    async readPollBudget(request) {
      const result = await supabase.rpc("ct_paid_read_poll_budget", {
        p_session_reference_id: request.sessionReferenceId,
        p_owner_user_id: request.ownerUserId,
        p_now: request.nowIso
      });
      return readPollBudgetAuthority(result);
    },
    async reserveMessageRate(request) {
      assertBoundedOpaqueReference(request.sessionReferenceId, "Paid message-rate session reference");
      assertBoundedOpaqueReference(request.reservationKey, "Paid message-rate reservation key");
      assertPositiveBoundedInteger(request.messageCount, 60, "Paid message-rate reservation count");
      const result = await supabase.rpc("ct_paid_reserve_message_rate", {
        p_session_reference_id: request.sessionReferenceId,
        p_owner_user_id: request.ownerUserId,
        p_reservation_key: request.reservationKey,
        p_message_count: request.messageCount,
        p_now: request.nowIso
      });
      return readMessageRateReservation(result);
    },
    async recordMessageRateSuccess(request) {
      assertBoundedOpaqueReference(request.sessionReferenceId, "Paid message-rate session reference");
      assertBoundedOpaqueReference(request.reservationKey, "Paid message-rate reservation key");
      assertBoundedNonNegativeInteger(request.successfulMessageCount, 60, "Paid successful message count");
      const result = await supabase.rpc("ct_paid_record_message_rate_success", {
        p_session_reference_id: request.sessionReferenceId,
        p_owner_user_id: request.ownerUserId,
        p_reservation_key: request.reservationKey,
        p_successful_message_count: request.successfulMessageCount,
        p_now: request.nowIso
      });
      return readInteger(result, "Paid message-rate success recording failed.");
    },
    async finalizeMessageRate(request) {
      assertBoundedOpaqueReference(request.sessionReferenceId, "Paid message-rate session reference");
      assertBoundedOpaqueReference(request.reservationKey, "Paid message-rate reservation key");
      assertBoundedNonNegativeInteger(request.translatedMessageCount, 60, "Paid translated message count");
      const result = await supabase.rpc("ct_paid_finalize_message_rate", {
        p_session_reference_id: request.sessionReferenceId,
        p_owner_user_id: request.ownerUserId,
        p_reservation_key: request.reservationKey,
        p_translated_message_count: request.translatedMessageCount,
        p_now: request.nowIso
      });
      return readMessageRateFinalize(result);
    },
    async recordProviderHourlyDetail(request) {
      assertCommentTranslatorPaidAttemptId(request.attemptId);
      assertBoundedOpaqueReference(request.providerAttempt, "Paid provider attempt");
      const result = await supabase.rpc("ct_paid_record_provider_hourly_detail", {
        p_attempt_id: request.attemptId,
        p_provider_attempt: request.providerAttempt,
        p_source_expires_at: request.sourceExpiresAtIso,
        p_owner_user_id: request.ownerUserId,
        p_provider: request.provider,
        p_utc_hour: request.utcHourIso,
        p_request_count: request.requestCount,
        p_session_count: request.sessionCount,
        p_comment_count: request.commentCount,
        p_input_characters: request.inputCharacters,
        p_output_characters: request.outputCharacters,
        p_input_tokens: request.inputTokens,
        p_output_tokens: request.outputTokens,
        p_estimated_cost_micros: request.estimatedCostMicros,
        p_success_count: request.successCount,
        p_failure_count: request.failureCount,
        p_latency_up_to_100_ms_count: request.latencyUpTo100MsCount,
        p_latency_101_to_250_ms_count: request.latency101To250MsCount,
        p_latency_251_to_500_ms_count: request.latency251To500MsCount,
        p_latency_501_to_1000_ms_count: request.latency501To1000MsCount,
        p_latency_1001_to_2500_ms_count: request.latency1001To2500MsCount,
        p_latency_2501_to_5000_ms_count: request.latency2501To5000MsCount,
        p_latency_5001_to_10000_ms_count: request.latency5001To10000MsCount,
        p_latency_over_10000_ms_count: request.latencyOver10000MsCount,
        p_now: request.nowIso
      });
      return readBoolean(result, "Paid provider hourly detail write failed.");
    },
    async upsertSessionSummary(request) {
      const result = await supabase.rpc("ct_paid_upsert_session_summary", {
        p_owner_user_id: request.ownerUserId,
        p_session_reference_id: request.sessionReferenceId,
        p_started_at: request.startedAtIso,
        p_ended_at: request.endedAtIso ?? null,
        p_stop_reason: request.stopReason ?? null,
        p_provider_request_count: request.providerRequestCount,
        p_translated_message_count: request.translatedMessageCount,
        p_input_characters: request.inputCharacters,
        p_output_characters: request.outputCharacters,
        p_now: request.nowIso
      });
      return readUuid(result, "Paid session summary write failed.");
    },
    async reserveBillingPeriodCharacters(request) {
      assertCommentTranslatorPaidAttemptId(request.attemptId);
      assertBoundedOpaqueReference(request.providerAttempt, "Paid provider attempt");
      assertPositiveBoundedInteger(request.characters, 500_000, "Paid billing-period characters");
      const result = await supabase.rpc("ct_paid_reserve_billing_period_characters", {
        p_attempt_id: request.attemptId,
        p_provider_attempt: request.providerAttempt,
        p_owner_user_id: request.ownerUserId,
        p_period_start: request.periodStartIso,
        p_period_end: request.periodEndIso,
        p_characters: request.characters,
        p_now: request.nowIso
      });
      return readInteger(result, "Paid billing-period character reservation failed.");
    },
    async commitBillingPeriodCharacters(request) {
      assertCommentTranslatorPaidAttemptId(request.attemptId);
      assertBoundedOpaqueReference(request.providerAttempt, "Paid provider attempt");
      if (request.actualCharacters !== undefined) {
        assertPositiveBoundedInteger(request.actualCharacters, 500_000, "Paid committed characters");
      }
      const result = await supabase.rpc("ct_paid_commit_billing_period_characters", {
        p_attempt_id: request.attemptId,
        p_provider_attempt: request.providerAttempt,
        p_actual_characters: request.actualCharacters ?? null,
        p_now: request.nowIso
      });
      return readInteger(result, "Paid billing-period character commit failed.");
    },
    async releaseBillingPeriodCharacters(request) {
      assertCommentTranslatorPaidAttemptId(request.attemptId);
      assertBoundedOpaqueReference(request.providerAttempt, "Paid provider attempt");
      const result = await supabase.rpc("ct_paid_release_billing_period_characters", {
        p_attempt_id: request.attemptId,
        p_provider_attempt: request.providerAttempt,
        p_now: request.nowIso
      });
      return readInteger(result, "Paid billing-period character release failed.");
    },
    async abandonLogicalAttempt(request) {
      assertCommentTranslatorPaidAttemptId(request.attemptId);
      assertBoundedOpaqueReference(request.releasedProviderAttempt, "Paid provider attempt");
      const result = await supabase.rpc("ct_paid_abandon_logical_attempt", {
        p_attempt_id: request.attemptId,
        p_provider_attempt: request.releasedProviderAttempt,
        p_now: request.nowIso
      });
      return readInteger(result, "Paid logical-attempt abandonment failed.");
    },
    async cleanupAttemptLedgers(request) {
      const limit = request.limit ?? 500;
      if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
        throw new Error("Paid attempt-ledger cleanup limit is invalid.");
      }
      const result = await supabase.rpc("ct_paid_cleanup_attempt_ledgers", {
        p_now: request.nowIso,
        p_limit: request.limit ?? 500
      });
      return readInteger(result, "Paid attempt-ledger cleanup failed.");
    },
    async closeBillingPeriod(request) {
      const result = await supabase.rpc("ct_paid_close_billing_period_reconciled", {
        p_lifecycle_id: request.lifecycleId,
        p_reconcile_lease_token: request.reconcileLeaseToken,
        p_owner_user_id: request.ownerUserId,
        p_period_start: request.periodStartIso,
        p_period_end: request.periodEndIso,
        p_now: request.nowIso
      });
      return readBoolean(result, "Paid billing-period close failed.");
    },
    async closeUtcMonth(request) {
      const result = await supabase.rpc("ct_paid_close_utc_month_reconciled", {
        p_work_item_id: request.workItemId,
        p_reconcile_lease_token: request.reconcileLeaseToken,
        p_utc_month: request.utcMonth,
        p_now: request.nowIso
      });
      return readBooleanOutcome(result, "Paid UTC-month close failed.");
    },
    async openaiAttempt(request) {
      assertCommentTranslatorPaidAttemptId(request.attemptId);
      assertBoundedOpaqueReference(request.providerAttempt, "Paid provider attempt");
      assertPositiveBoundedInteger(request.inputCharacters, 7_500, "Paid OpenAI input characters");
      assertPositiveBoundedInteger(request.requestCount, 15, "Paid OpenAI request count");
      assertPositiveBoundedInteger(request.tokenCount, Number.MAX_SAFE_INTEGER, "Paid OpenAI token reservation");
      assertPositiveBoundedInteger(request.estimatedCostMicros, Number.MAX_SAFE_INTEGER, "Paid OpenAI cost reservation");
      const result = await supabase.rpc("ct_paid_openai_attempt", {
        p_attempt_id: request.attemptId,
        p_provider_attempt: request.providerAttempt,
        p_owner_user_id: request.ownerUserId,
        p_session_reference_id: request.sessionReferenceId,
        p_period_start: request.periodStartIso,
        p_period_end: request.periodEndIso,
        p_utc_month: request.utcMonth,
        p_input_characters: request.inputCharacters,
        p_estimated_cost_micros: request.estimatedCostMicros,
        p_request_count: request.requestCount,
        p_token_count: request.tokenCount,
        p_now: request.nowIso
      });
      return readProviderReservation(result, "OpenAI attempt reservation failed.");
    },
    async claimProviderDispatch(request) {
      assertCommentTranslatorPaidAttemptId(request.attemptId);
      assertBoundedOpaqueReference(request.providerAttempt, "Paid provider attempt");
      assertBoundedNonNegativeInteger(request.dispatchSequence, 14, "Paid provider dispatch sequence");
      if (request.providerKind === "openai_attempt" && !request.openAiSlotToken) {
        throw new Error("Paid OpenAI dispatch claim requires its slot token.");
      }
      if (request.providerKind === "azure_direct_fallback" && request.openAiSlotToken) {
        throw new Error("Paid Azure dispatch claim cannot bind an OpenAI slot token.");
      }
      const result = await supabase.rpc("ct_paid_claim_provider_dispatch", {
        p_attempt_id: request.attemptId,
        p_provider_attempt: request.providerAttempt,
        p_provider_kind: request.providerKind,
        p_dispatch_sequence: request.dispatchSequence,
        p_session_lease_token: request.sessionLeaseToken,
        p_openai_slot_lease_token: request.openAiSlotToken ?? null,
        p_now: request.nowIso
      });
      return readProviderDispatchClaimStatus(result);
    },
    async readOpenAiAttempt(request) {
      assertCommentTranslatorPaidAttemptId(request.attemptId);
      assertBoundedOpaqueReference(request.providerAttempt, "Paid provider attempt");
      const result = await supabase.rpc("ct_paid_read_provider_attempt_replay_metadata", {
        p_attempt_id: request.attemptId,
        p_provider_attempt: request.providerAttempt
      });
      const receipt = readProviderAttemptReplayMetadata(result);
      if (receipt.providerKind !== "openai_attempt") throw new Error("OpenAI attempt receipt provider is unreadable.");
      return receipt;
    },
    async readProviderAttemptReplayMetadata(request) {
      assertCommentTranslatorPaidAttemptId(request.attemptId);
      assertBoundedOpaqueReference(request.providerAttempt, "Paid provider attempt");
      const result = await supabase.rpc("ct_paid_read_provider_attempt_replay_metadata", {
        p_attempt_id: request.attemptId,
        p_provider_attempt: request.providerAttempt
      });
      return readProviderAttemptReplayMetadata(result);
    },
    async extendOpenAiAttempt(request) {
      assertCommentTranslatorPaidAttemptId(request.attemptId);
      assertBoundedOpaqueReference(request.providerAttempt, "Paid provider attempt");
      const result = await supabase.rpc("ct_paid_extend_openai_attempt", {
        p_attempt_id: request.attemptId,
        p_provider_attempt: request.providerAttempt,
        p_session_lease_token: request.sessionLeaseToken,
        p_openai_slot_lease_token: request.openAiSlotToken,
        p_now: request.nowIso
      });
      return readBoolean(result, "OpenAI attempt extension failed.");
    },
    async finalizeOpenAiAttempt(request) {
      assertCommentTranslatorPaidAttemptId(request.attemptId);
      assertBoundedOpaqueReference(request.providerAttempt, "Paid provider attempt");
      assertBoundedSuccessfulItemAttemptIds(request.successfulItemAttemptIds);
      assertBoundedNonNegativeInteger(request.successfulInputCharacters, 7_500, "Paid successful OpenAI input characters");
      if ((request.successfulItemAttemptIds.length === 0) !== (request.successfulInputCharacters === 0)) {
        throw new Error("Paid OpenAI success metadata is inconsistent.");
      }
      const result = await supabase.rpc("ct_paid_finalize_openai_attempt_with_metadata", {
        p_attempt_id: request.attemptId,
        p_provider_attempt: request.providerAttempt,
        p_session_lease_token: request.sessionLeaseToken,
        p_openai_slot_lease_token: request.openAiSlotToken,
        p_outcome: request.outcome,
        p_actual_input_characters: request.actualInputCharacters ?? null,
        p_actual_cost_micros: request.actualCostMicros ?? null,
        p_provider_failure_class: request.providerFailureClass,
        p_successful_item_attempt_ids: request.successfulItemAttemptIds,
        p_successful_input_characters: request.successfulInputCharacters,
        p_fallback_eligible: request.fallbackEligible,
        p_circuit_failure_state: request.circuitFailureState,
        p_circuit_success_state: request.circuitSuccessState,
        p_now: request.nowIso
      });
      return readBoolean(result, "OpenAI attempt finalization failed.");
    },
    async commitTerminalOpenAiPartial(request) {
      assertCommentTranslatorPaidAttemptId(request.attemptId);
      assertBoundedOpaqueReference(request.providerAttempt, "Paid provider attempt");
      assertPositiveBoundedInteger(request.actualCharacters, 7_500, "Paid terminal OpenAI partial characters");
      const result = await supabase.rpc("ct_paid_commit_terminal_openai_partial", {
        p_attempt_id: request.attemptId,
        p_provider_attempt: request.providerAttempt,
        p_actual_characters: request.actualCharacters,
        p_now: request.nowIso
      });
      return readInteger(result, "Paid terminal OpenAI partial commit failed.");
    },
    async reclaimOpenAiAttempt(request) {
      assertCommentTranslatorPaidAttemptId(request.attemptId);
      assertBoundedOpaqueReference(request.providerAttempt, "Paid provider attempt");
      const result = await supabase.rpc("ct_paid_reclaim_openai_attempt", {
        p_attempt_id: request.attemptId,
        p_provider_attempt: request.providerAttempt,
        p_now: request.nowIso
      });
      return readBoolean(result, "OpenAI attempt reclaim failed.");
    },
    async azureDirectFallback(request) {
      assertCommentTranslatorPaidAttemptId(request.attemptId);
      assertBoundedOpaqueReference(request.providerAttempt, "Paid provider attempt");
      assertPositiveBoundedInteger(request.inputCharacters, 7_500, "Paid Azure fallback input characters");
      const result = await supabase.rpc("ct_paid_azure_direct_fallback", {
        p_attempt_id: request.attemptId,
        p_provider_attempt: request.providerAttempt,
        p_owner_user_id: request.ownerUserId,
        p_session_reference_id: request.sessionReferenceId,
        p_period_start: request.periodStartIso,
        p_period_end: request.periodEndIso,
        p_utc_month: request.utcMonth,
        p_input_characters: request.inputCharacters,
        p_now: request.nowIso
      });
      return readProviderReservation(result, "Azure fallback reservation failed.");
    },
    async finalizeAzureDirectFallback(request) {
      assertCommentTranslatorPaidAttemptId(request.attemptId);
      assertBoundedOpaqueReference(request.providerAttempt, "Paid provider attempt");
      if (request.outcome === "uncertain_inflight" && request.providerFailureClass === null) {
        throw new Error("Azure uncertain finalization requires a sanitized provider failure class.");
      }
      if (request.actualBillingInputCharacters !== undefined && request.outcome !== "completed") {
        throw new Error("Combined Paid billing characters require completed Azure finalization.");
      }
      if (request.actualBillingInputCharacters !== undefined) {
        assertPositiveBoundedInteger(
          request.actualBillingInputCharacters,
          7_500,
          "Paid combined billing characters"
        );
      }
      const result = await supabase.rpc("ct_paid_finalize_azure_fallback_with_metadata", {
        p_attempt_id: request.attemptId,
        p_provider_attempt: request.providerAttempt,
        p_session_lease_token: request.sessionLeaseToken,
        p_outcome: request.outcome,
        p_actual_input_characters: request.actualInputCharacters ?? null,
        p_actual_billing_input_characters: request.actualBillingInputCharacters ?? null,
        p_provider_failure_class: request.providerFailureClass,
        p_circuit_failure_state: request.circuitFailureState,
        p_circuit_success_state: request.circuitSuccessState,
        p_now: request.nowIso
      });
      return readBoolean(result, "Azure fallback finalization failed.");
    },
    async settleAzurePartialFailure(request) {
      assertCommentTranslatorPaidAttemptId(request.attemptId);
      assertBoundedOpaqueReference(request.providerAttempt, "Paid provider attempt");
      assertBoundedNonNegativeInteger(request.actualInputCharacters, 7_500, "Paid successful Azure input characters");
      assertBoundedNonNegativeInteger(request.actualBillingInputCharacters, 7_500, "Paid combined successful input characters");
      if (request.actualBillingInputCharacters < request.actualInputCharacters) {
        throw new Error("Paid combined successful input characters are inconsistent.");
      }
      const result = await supabase.rpc("ct_paid_settle_azure_partial_failure", {
        p_attempt_id: request.attemptId,
        p_provider_attempt: request.providerAttempt,
        p_session_lease_token: request.sessionLeaseToken,
        p_actual_input_characters: request.actualInputCharacters,
        p_actual_billing_input_characters: request.actualBillingInputCharacters,
        p_provider_failure_class: request.providerFailureClass,
        p_now: request.nowIso
      });
      return readBoolean(result, "Azure partial failure settlement failed.");
    },
    async reclaimAzureDirectFallback(request) {
      assertCommentTranslatorPaidAttemptId(request.attemptId);
      assertBoundedOpaqueReference(request.providerAttempt, "Paid provider attempt");
      const result = await supabase.rpc("ct_paid_reclaim_azure_fallback", {
        p_attempt_id: request.attemptId,
        p_provider_attempt: request.providerAttempt,
        p_now: request.nowIso
      });
      return readBoolean(result, "Azure fallback reclaim failed.");
    },
    async reservePollBudget(request) {
      const result = await supabase.rpc("ct_paid_reserve_poll_budget", {
        p_session_reference_id: request.sessionReferenceId,
        p_owner_user_id: request.ownerUserId,
        p_daily_budget: request.dailyBudget,
        p_now: request.nowIso
      });
      return readInteger(result, "Paid poll budget reservation failed.");
    }
  };
}

function readProviderReservation(
  result: SupabaseRpcResult,
  message: string
): CommentTranslatorPaidProviderReservation {
  if (result.error) {
    const refusal = classifyReservationRefusal(result.error.message);
    if (refusal) throw new CommentTranslatorPaidReservationRefusedError(refusal);
    throw new Error(message);
  }
  const row = firstRpcRow(result.data);
  const reservationStatus = readString(row, "reservation_status");
  if (!["reserved", "uncertain", "committed", "released", "expired"].includes(reservationStatus)) {
    throw new Error("Trusted Paid provider reservation status is unreadable.");
  }
  const sessionLeaseToken = readNullableString(row, "session_lease_token");
  const openAiSlotToken = readNullableString(row, "openai_slot_token");
  if (["reserved", "uncertain"].includes(reservationStatus) && sessionLeaseToken === null) {
    throw new Error("Trusted Paid active provider reservation is missing its session lease token.");
  }
  if (reservationStatus === "reserved" && "openai_slot_token" in row && openAiSlotToken === null) {
    throw new Error("Trusted Paid active OpenAI reservation is missing its slot token.");
  }
  return { reservationStatus, sessionLeaseToken, openAiSlotToken };
}

function readProviderDispatchClaimStatus(
  result: SupabaseRpcResult
): CommentTranslatorPaidProviderDispatchClaimStatus {
  if (result.error) throw new Error("Paid provider dispatch claim failed.");
  const value = Array.isArray(result.data) ? result.data[0] : result.data;
  if (value === "claimed" || value === "already-dispatched") return value;
  throw new Error("Paid provider dispatch claim status is unreadable.");
}

function readProviderAttemptReplayMetadata(
  result: SupabaseRpcResult
): CommentTranslatorPaidOpenAiAttemptReceipt {
  if (result.error) throw new Error("OpenAI attempt receipt read failed.");
  const row = firstRpcRow(result.data);
  const attemptState = readString(row, "attempt_state");
  if (!["reserved", "uncertain", "committed", "released", "expired"].includes(attemptState)) {
    throw new Error("Trusted Paid OpenAI attempt state is unreadable.");
  }
  const providerFailureClass = readNullableString(row, "provider_failure_class");
  if (
    providerFailureClass !== null
    && !["network", "timeout", "rate-limit", "server-error", "invalid-response", "quota", "configuration", "policy"].includes(providerFailureClass)
  ) {
    throw new Error("Trusted Paid OpenAI failure class is unreadable.");
  }
  const successfulItemAttemptIds = row.successful_item_attempt_ids;
  const successfulInputCharacters = row.successful_input_characters;
  const fallbackEligible = row.fallback_eligible;
  const circuitFailureState = readString(row, "circuit_failure_state");
  const circuitSuccessState = readString(row, "circuit_success_state");
  const providerKind = readString(row, "provider_kind");
  if (typeof fallbackEligible !== "boolean") throw new Error("Trusted Paid fallback authority is unreadable.");
  if (!["not-required", "deferred", "pending", "recorded"].includes(circuitFailureState)) {
    throw new Error("Trusted Paid circuit failure state is unreadable.");
  }
  if (!["not-required", "pending", "recorded"].includes(circuitSuccessState)) {
    throw new Error("Trusted Paid circuit success state is unreadable.");
  }
  if (!["openai_attempt", "azure_direct_fallback"].includes(providerKind)) {
    throw new Error("Trusted Paid provider kind is unreadable.");
  }
  if (!Array.isArray(successfulItemAttemptIds)) {
    throw new Error("Trusted Paid OpenAI successful item ids are unreadable.");
  }
  assertBoundedSuccessfulItemAttemptIds(successfulItemAttemptIds);
  const normalizedSuccessfulInputCharacters = typeof successfulInputCharacters === "string" && /^\d+$/.test(successfulInputCharacters)
    ? Number(successfulInputCharacters)
    : successfulInputCharacters;
  assertBoundedNonNegativeInteger(normalizedSuccessfulInputCharacters, 7_500, "Trusted Paid OpenAI successful input characters");
  if (
    providerKind === "openai_attempt"
    && (successfulItemAttemptIds.length === 0) !== (normalizedSuccessfulInputCharacters === 0)
  ) {
    throw new Error("Trusted Paid OpenAI success metadata is inconsistent.");
  }
  if (providerKind === "azure_direct_fallback" && successfulItemAttemptIds.length !== 0) {
    throw new Error("Trusted Paid Azure replay metadata cannot expose item identities.");
  }
  return {
    attemptState: attemptState as CommentTranslatorPaidOpenAiAttemptReceipt["attemptState"],
    providerFailureClass: providerFailureClass as CommentTranslatorPaidProviderFailureClass | null,
    successfulItemAttemptIds,
    successfulInputCharacters: normalizedSuccessfulInputCharacters,
    fallbackEligible,
    circuitFailureState: circuitFailureState as CommentTranslatorPaidCircuitFailureState,
    circuitSuccessState: circuitSuccessState as CommentTranslatorPaidCircuitSuccessState,
    providerKind: providerKind as CommentTranslatorPaidProviderKind
  };
}

function classifyReservationRefusal(message: string | undefined): CommentTranslatorPaidReservationRefusal | null {
  const normalized = typeof message === "string" ? message.toLocaleLowerCase() : "";
  if (
    normalized.includes("slot capacity is exhausted")
    || normalized.includes("rpm reservation is exhausted")
    || normalized.includes("tpm reservation is exhausted")
    || normalized.includes("capacity is full")
    || normalized.includes("shared capacity is exhausted")
    || normalized.includes("circuit is unavailable")
    || normalized.includes("session has an active provider lease")
    || normalized.includes("probe is already leased")
  ) return "capacity";
  if (
    normalized.includes("individual paid cost")
    || normalized.includes("individual openai cost")
    || normalized.includes("owner cost")
  ) return "individual-cost";
  if (
    normalized.includes("global paid cost")
    || normalized.includes("global openai cost")
    || normalized.includes("cost month is closed")
  ) return "global-cost";
  if (
    normalized.includes("quota is exhausted")
    || normalized.includes("billing period is closed for new reservations")
  ) return "quota";
  if (
    normalized.includes("cost limit is exhausted")
    || normalized.includes("cost period is closed")
  ) return "cost";
  return null;
}

function assertBoundedOpaqueReference(value: string, label: string): void {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > 200) {
    throw new Error(label + " is invalid.");
  }
}

function assertBoundedSuccessfulItemAttemptIds(value: readonly unknown[]): asserts value is readonly string[] {
  if (!Array.isArray(value) || value.length > 15 || new Set(value).size !== value.length) {
    throw new Error("Paid successful OpenAI item attempt ids are invalid.");
  }
  for (const attemptId of value) {
    if (typeof attemptId !== "string" || !isCommentTranslatorPaidAttemptId(attemptId)) {
      throw new Error("Paid successful OpenAI item attempt id is invalid.");
    }
  }
}

function assertCommentTranslatorPaidAttemptId(value: string): void {
  if (!isCommentTranslatorPaidAttemptId(value)) {
    throw new Error("Paid attempt id is invalid.");
  }
}

function assertPositiveBoundedInteger(value: number, maximum: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0 || value > maximum) {
    throw new Error(label + " is invalid.");
  }
}

function assertBoundedNonNegativeInteger(value: unknown, maximum: number, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > maximum) {
    throw new Error(label + " is invalid.");
  }
}

function readRuntimeAuthority(result: SupabaseRpcResult): CommentTranslatorPaidRuntimeAuthority {
  if (result.error) throw new Error("Paid runtime authority read failed.");
  const row = firstRpcRow(result.data);
  const billingPeriodInputCharacters = readSafeIntegerField(row, "billing_period_input_characters");
  const billingPeriodCharacterLimit = readSafeIntegerField(row, "billing_period_character_limit");
  const translatedMessagesInCurrentMinute = readSafeIntegerField(row, "translated_messages_in_current_minute");
  const translatedMessageCapacityAvailableAt = row.translated_message_capacity_available_at;
  const billingPeriodAvailable = row.billing_period_available;
  const individualCostAvailable = row.individual_cost_available;
  const globalCostAvailable = row.global_cost_available;
  if (
    typeof billingPeriodAvailable !== "boolean"
    || typeof individualCostAvailable !== "boolean"
    || typeof globalCostAvailable !== "boolean"
  ) {
    throw new Error("Paid runtime cost authority is unreadable.");
  }
  if (billingPeriodCharacterLimit <= 0 || billingPeriodInputCharacters > billingPeriodCharacterLimit) {
    throw new Error("Paid billing period authority is inconsistent.");
  }
  if (
    translatedMessageCapacityAvailableAt !== null
    && translatedMessageCapacityAvailableAt !== undefined
    && (typeof translatedMessageCapacityAvailableAt !== "string" || !Number.isFinite(Date.parse(translatedMessageCapacityAvailableAt)))
  ) {
    throw new Error("Paid message-rate authority is unreadable.");
  }
  return {
    billingPeriodAvailable,
    billingPeriodInputCharacters,
    billingPeriodCharacterLimit,
    individualCostAvailable,
    globalCostAvailable,
    translatedMessagesInCurrentMinute,
    translatedMessageCapacityAvailableAtIso: translatedMessageCapacityAvailableAt == null
      ? null
      : new Date(translatedMessageCapacityAvailableAt).toISOString()
  };
}

function readPollBudgetAuthority(result: SupabaseRpcResult): CommentTranslatorPaidPollBudgetAuthority {
  if (result.error) throw new Error("Paid poll budget authority read failed.");
  const row = firstRpcRow(result.data);
  const utcDay = readString(row, "utc_day");
  const dailyBudget = row.daily_budget === null || row.daily_budget === undefined
    ? null
    : readSafeIntegerField(row, "daily_budget");
  const reservedPolls = readSafeIntegerField(row, "reserved_polls");
  const sessionReservedPolls = readSafeIntegerField(row, "session_reserved_polls");
  const sessionReservationPresent = row.session_reservation_present;
  const nextResetAt = readString(row, "next_reset_at");
  if (
    typeof sessionReservationPresent !== "boolean"
    || !Number.isFinite(Date.parse(nextResetAt))
    || (dailyBudget !== null && dailyBudget <= 0)
    || (dailyBudget !== null && reservedPolls > dailyBudget)
    || sessionReservedPolls > 720
    || (!sessionReservationPresent && sessionReservedPolls !== 0)
  ) {
    throw new Error("Paid poll budget authority is unreadable.");
  }
  return {
    utcDay,
    dailyBudget,
    reservedPolls,
    sessionReservedPolls,
    sessionReservationPresent,
    nextResetAtIso: new Date(nextResetAt).toISOString()
  };
}

function readMessageRateReservation(result: SupabaseRpcResult): CommentTranslatorPaidMessageRateReservation {
  if (result.error) throw new Error("Paid message-rate reservation failed.");
  const row = firstRpcRow(result.data);
  const reservationStatus = readString(row, "reservation_status");
  const minuteStart = readString(row, "minute_start");
  const reservedMessages = readSafeIntegerField(row, "reserved_messages");
  const committedMessages = readSafeIntegerField(row, "committed_messages");
  const successfulMessageCount = readSafeIntegerField(row, "successful_message_count");
  const capacityRemaining = readSafeIntegerField(row, "capacity_remaining");
  if (
    !["reserved", "rate-limited", "committed"].includes(reservationStatus)
    || !Number.isFinite(Date.parse(minuteStart))
    || reservedMessages > 60
    || committedMessages > reservedMessages
    || successfulMessageCount > reservedMessages
    || capacityRemaining > 60
  ) {
    throw new Error("Paid message-rate reservation response is unreadable.");
  }
  return {
    reservationStatus: reservationStatus as CommentTranslatorPaidMessageRateReservation["reservationStatus"],
    minuteStartIso: new Date(minuteStart).toISOString(),
    reservedMessages,
    committedMessages,
    successfulMessageCount,
    capacityRemaining
  };
}

function readMessageRateFinalize(result: SupabaseRpcResult): CommentTranslatorPaidMessageRateFinalize {
  if (result.error) throw new Error("Paid message-rate finalize failed.");
  const row = firstRpcRow(result.data);
  const reservationStatus = readString(row, "reservation_status");
  const minuteStart = readString(row, "minute_start");
  const reservedMessages = readSafeIntegerField(row, "reserved_messages");
  const committedMessages = readSafeIntegerField(row, "committed_messages");
  const releasedMessages = readSafeIntegerField(row, "released_messages");
  if (
    !["committed", "released"].includes(reservationStatus)
    || !Number.isFinite(Date.parse(minuteStart))
    || reservedMessages > 60
    || committedMessages > reservedMessages
    || releasedMessages > reservedMessages
  ) {
    throw new Error("Paid message-rate finalize response is unreadable.");
  }
  return {
    reservationStatus: reservationStatus as CommentTranslatorPaidMessageRateFinalize["reservationStatus"],
    minuteStartIso: new Date(minuteStart).toISOString(),
    reservedMessages,
    committedMessages,
    releasedMessages
  };
}

function readSafeIntegerField(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed)) return parsed;
  }
  throw new Error("Trusted Paid authority response is invalid.");
}

function readInteger(result: SupabaseRpcResult, message: string): number {
  if (result.error) throw new Error(message);
  const value = Array.isArray(result.data) ? result.data[0] : result.data;
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const row = value as Record<string, unknown>;
    const candidate = row.reserved_characters ?? row.committed_characters ?? row.released_characters ?? row.reserved_polls;
    if (typeof candidate === "number" && Number.isInteger(candidate) && candidate >= 0) return candidate;
    if (typeof candidate === "string" && /^\d+$/.test(candidate)) return Number(candidate);
  }
  throw new Error(message);
}

function readBoolean(result: SupabaseRpcResult, message: string): boolean {
  if (result.error || result.data !== true) throw new Error(message);
  return true;
}

function readBooleanOutcome(result: SupabaseRpcResult, message: string): boolean {
  if (result.error || typeof result.data !== "boolean") throw new Error(message);
  return result.data;
}

function readUuid(result: SupabaseRpcResult, message: string): string {
  if (result.error) throw new Error(message);
  const value = Array.isArray(result.data) ? result.data[0] : result.data;
  if (typeof value === "string" && value.length > 0) return value;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const id = (value as Record<string, unknown>).id;
    if (typeof id === "string" && id.length > 0) return id;
  }
  throw new Error(message);
}

function firstRpcRow(value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) return asRecord(value[0]);
  return asRecord(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Trusted Paid store response is invalid.");
  return value as Record<string, unknown>;
}

function readString(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== "string" || value.length === 0) throw new Error("Trusted Paid store response is invalid.");
  return value;
}

function readNullableString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) return null;
  return readString(row, key);
}

function createTrustedSupabaseServiceRoleClient(url: string, serviceRoleKey: string): SupabaseClient {
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }) as unknown as SupabaseClient;
}
