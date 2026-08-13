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

export type CommentTranslatorPaidAzureFinalizeRequest = {
  attemptId: string;
  providerAttempt: string;
  sessionLeaseToken: string;
  actualInputCharacters?: number;
  nowIso: string;
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
    ownerUserId: string;
    periodStartIso: string;
    periodEndIso: string;
    nowIso: string;
  }) => Promise<boolean>;
  closeUtcMonth: (request: { utcMonth: string; nowIso: string }) => Promise<boolean>;
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
    nowIso: string;
  }) => Promise<boolean>;
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
    "ct_paid_record_provider_hourly_detail",
    "ct_paid_upsert_session_summary",
    "ct_paid_reserve_billing_period_characters",
    "ct_paid_commit_billing_period_characters",
    "ct_paid_release_billing_period_characters",
    "ct_paid_abandon_logical_attempt",
    "ct_paid_cleanup_attempt_ledgers",
    "ct_paid_close_billing_period",
    "ct_paid_close_utc_month",
    "ct_paid_openai_attempt",
    "ct_paid_extend_openai_attempt",
    "ct_paid_finalize_openai_attempt",
    "ct_paid_reclaim_openai_attempt",
    "ct_paid_azure_direct_fallback",
    "ct_paid_finalize_azure_fallback",
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
      const result = await supabase.rpc("ct_paid_close_billing_period", {
        p_owner_user_id: request.ownerUserId,
        p_period_start: request.periodStartIso,
        p_period_end: request.periodEndIso,
        p_now: request.nowIso
      });
      return readBoolean(result, "Paid billing-period close failed.");
    },
    async closeUtcMonth(request) {
      const result = await supabase.rpc("ct_paid_close_utc_month", {
        p_utc_month: request.utcMonth,
        p_now: request.nowIso
      });
      return readBoolean(result, "Paid UTC-month close failed.");
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
      const result = await supabase.rpc("ct_paid_finalize_openai_attempt", {
        p_attempt_id: request.attemptId,
        p_provider_attempt: request.providerAttempt,
        p_session_lease_token: request.sessionLeaseToken,
        p_openai_slot_lease_token: request.openAiSlotToken,
        p_outcome: request.outcome,
        p_actual_input_characters: request.actualInputCharacters ?? null,
        p_actual_cost_micros: request.actualCostMicros ?? null,
        p_provider_failure_class: request.providerFailureClass,
        p_now: request.nowIso
      });
      return readBoolean(result, "OpenAI attempt finalization failed.");
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
      const result = await supabase.rpc("ct_paid_finalize_azure_fallback", {
        p_attempt_id: request.attemptId,
        p_provider_attempt: request.providerAttempt,
        p_session_lease_token: request.sessionLeaseToken,
        p_outcome: request.outcome,
        p_actual_input_characters: request.actualInputCharacters ?? null,
        p_provider_failure_class: request.providerFailureClass,
        p_now: request.nowIso
      });
      return readBoolean(result, "Azure fallback finalization failed.");
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
  if (result.error) throw new Error(message);
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

function assertBoundedOpaqueReference(value: string, label: string): void {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > 200) {
    throw new Error(label + " is invalid.");
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
