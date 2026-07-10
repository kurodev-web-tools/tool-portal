import "server-only";

import { createClient } from "@supabase/supabase-js";
import {
  CommentTranslatorUsageRecoveryAuthorityError,
  createCommentTranslatorUsageLedgerUserReference,
  resolveCommentTranslatorUsagePlanEntitlement,
  type CommentTranslatorUsageLedgerEvent,
  type CommentTranslatorUsageLedgerSnapshot,
  type CommentTranslatorUsageLedgerUserReference,
  type CommentTranslatorUsageQuotaBudgetStopCategory
} from "./comment-translator-usage-ledger-runtime";
import {
  type CommentTranslatorActiveSessionRecord,
  type CommentTranslatorSessionBrowserSafeState,
  type CommentTranslatorSessionPlan,
  type CommentTranslatorSessionPlanEntitlement,
  type CommentTranslatorSessionStopReason
} from "./comment-translator-session-runtime";
import { type YouTubeOAuthCredentialStatusCallerAuthorization } from "./comment-translator-youtube-credential-status-boundary";

export type CommentTranslatorDurableUsageCounterRow = {
  id: string;
  owner_user_id: string;
  user_ledger_reference_id: CommentTranslatorUsageLedgerUserReference;
  session_reference_id: string | null;
  provider: "youtube";
  plan_entitlement_reference_id: string | null;
  event_type: CommentTranslatorUsageLedgerEvent["type"];
  occurred_at: string;
  usage_day: string;
  usage_month: string;
  session_elapsed_ms: number;
  provider_request_estimate_count: number;
  provider_quota_unit_estimate: number;
  translated_message_estimate: number;
  translated_character_estimate: number;
  estimated_cost_micros: number;
  provider_error_class: "recoverable-error" | "terminal-error" | null;
  provider_error_count: number;
  stop_reason: CommentTranslatorSessionStopReason | null;
  quota_stop_category: CommentTranslatorUsageQuotaBudgetStopCategory | null;
  client_readable_detail: "sanitized-stop-reason-only" | null;
  created_at: string;
};

export type CommentTranslatorDurableUsageCounterRowDraft = Omit<CommentTranslatorDurableUsageCounterRow, "id" | "created_at"> & {
  token_value: "never-returned-by-design";
  authorization_header_value: "never-returned-by-design";
  provider_target_metadata: "forbidden";
  raw_provider_payload: "never-recorded-by-design";
  raw_comment_text: "never-recorded-by-design";
};

export type CommentTranslatorDurableUsageSnapshot = CommentTranslatorUsageLedgerSnapshot;

export type CommentTranslatorDurableUsageRead =
  | {
      status: "ready";
      snapshot: CommentTranslatorDurableUsageSnapshot;
      authority: "durable-store";
    }
  | {
      status: "fail-closed";
      snapshot: null;
      stopReason: "global-budget-stop";
      authority: "durable-store-unavailable";
      reason: "trusted-service-role-env-missing" | "caller-not-authorized" | "query-failed";
      clientReadableDetail: "sanitized-stop-reason-only";
    };

export type CommentTranslatorDurableUsagePersistResult =
  | {
      status: "persisted";
      authority: "durable-store";
    }
  | Extract<CommentTranslatorDurableUsageRead, { status: "fail-closed" }>;

export type CommentTranslatorDurableUsageCounterStore = {
  readUsageEvents: (request: { ownerUserId: string; monthStartedAtIso: string }) => Promise<CommentTranslatorDurableUsageCounterRow[]>;
  persistUsageEvent: (request: {
    ownerUserId: string;
    userLedgerReferenceId: CommentTranslatorUsageLedgerUserReference;
    event: CommentTranslatorUsageLedgerEvent;
  }) => Promise<void>;
};

export type CommentTranslatorDurableUsageCounterStoreFactoryEnvName =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "SUPABASE_SERVICE_ROLE_KEY";

export type CommentTranslatorDurableUsageCounterStoreFactoryResult =
  | {
      status: "ready";
      store: CommentTranslatorDurableUsageCounterStore;
      missingEnvReferences: readonly [];
      failClosed: false;
    }
  | {
      status: "unavailable";
      store: null;
      missingEnvReferences: readonly CommentTranslatorDurableUsageCounterStoreFactoryEnvName[];
      failClosed: true;
      reason: "trusted-service-role-env-missing";
    };

type SupabaseError = { code?: string; message?: string } | null;
type SupabaseSingleResult = {
  data: CommentTranslatorDurableUsageCounterRow | null;
  error: SupabaseError;
};
type SupabaseRowsResult = {
  data: CommentTranslatorDurableUsageCounterRow[] | null;
  error: SupabaseError;
};

type SupabaseQuery = PromiseLike<SupabaseRowsResult> & {
  insert: (
    row: Omit<
      CommentTranslatorDurableUsageCounterRowDraft,
      "token_value" | "authorization_header_value" | "provider_target_metadata" | "raw_provider_payload" | "raw_comment_text"
    >
  ) => SupabaseQuery;
  select: (columns: typeof commentTranslatorDurableUsageCounterStoreContract.trustedSelectColumns) => SupabaseQuery;
  eq: (column: "owner_user_id", value: string) => SupabaseQuery;
  gte: (column: "occurred_at", value: string) => SupabaseQuery;
  order: (column: "occurred_at", options: { ascending: true }) => SupabaseQuery;
  single: () => Promise<SupabaseSingleResult>;
};

export type CommentTranslatorDurableUsageCounterSupabaseClient = {
  from: (tableName: typeof commentTranslatorDurableUsageCounterStoreContract.tableName) => SupabaseQuery;
};

export const commentTranslatorDurableUsageCounterStoreContract = {
  implementationStage: "free-public-beta-f4-durable-usage-counter-schema-adapter",
  runtime: "server-only",
  tableName: "comment_translator_usage_ledger_events",
  rowAccess: "trusted-server-service-role-only",
  monthlyUsageAuthority: "durable-store-required",
  dailyUsageAuthority: "durable-store-required",
  sessionUsageAuthority: "durable-store-required",
  browserReadableOutput: "sanitized-usage-metadata-only",
  failClosedFallback: "stop-session-when-durable-usage-store-unavailable",
  remoteSupabaseMigrationApply: "not-run-in-this-thread",
  remoteSupabaseMutation: "not-run-by-codex-in-this-thread",
  publicLaunchAllowed: false,
  trustedSelectColumns:
    "id, owner_user_id, user_ledger_reference_id, session_reference_id, provider, plan_entitlement_reference_id, event_type, occurred_at, usage_day, usage_month, session_elapsed_ms, provider_request_estimate_count, provider_quota_unit_estimate, translated_message_estimate, translated_character_estimate, estimated_cost_micros, provider_error_class, provider_error_count, stop_reason, quota_stop_category, client_readable_detail, created_at",
  forbiddenReadableOutput: [
    "oauth-token-value",
    "refresh-token-value",
    "authorization-code-value",
    "owner-user-id-value",
    "provider-channel-id-value",
    "liveChatId-value",
    "service-role-key-value",
    "authorization-header-value",
    "provider-target-metadata",
    "raw-provider-payload",
    "raw-comment-text",
    "provider-error-body"
  ]
} as const;

export function createTrustedCommentTranslatorUsageCounterSupabaseStore({
  env,
  createSupabaseClient = createTrustedSupabaseServiceRoleClient,
  nowIso = () => new Date().toISOString()
}: {
  env?: Partial<Record<CommentTranslatorDurableUsageCounterStoreFactoryEnvName, string | undefined>>;
  createSupabaseClient?: (url: string, serviceRoleKey: string) => CommentTranslatorDurableUsageCounterSupabaseClient;
  nowIso?: () => string;
} = {}): CommentTranslatorDurableUsageCounterStoreFactoryResult {
  const trustedEnv = env ?? (process.env as Partial<Record<CommentTranslatorDurableUsageCounterStoreFactoryEnvName, string | undefined>>);
  const url = readTrustedEnv(trustedEnv, "NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = readTrustedEnv(trustedEnv, "SUPABASE_SERVICE_ROLE_KEY");
  const missingEnvReferences: CommentTranslatorDurableUsageCounterStoreFactoryEnvName[] = [];

  if (!url) {
    missingEnvReferences.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!serviceRoleKey) {
    missingEnvReferences.push("SUPABASE_SERVICE_ROLE_KEY");
  }

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
    store: createCommentTranslatorDurableUsageCounterSupabaseStore({
      supabase: createSupabaseClient(url, serviceRoleKey),
      nowIso
    }),
    missingEnvReferences: [],
    failClosed: false
  };
}

export function createCommentTranslatorDurableUsageCounterSupabaseStore({
  supabase,
  nowIso
}: {
  supabase: CommentTranslatorDurableUsageCounterSupabaseClient;
  nowIso: () => string;
}): CommentTranslatorDurableUsageCounterStore {
  return {
    async readUsageEvents(request) {
      const result = await supabase
        .from(commentTranslatorDurableUsageCounterStoreContract.tableName)
        .select(commentTranslatorDurableUsageCounterStoreContract.trustedSelectColumns)
        .eq("owner_user_id", request.ownerUserId)
        .gte("occurred_at", request.monthStartedAtIso)
        .order("occurred_at", { ascending: true });

      if (result.error || !result.data) {
        throw new Error("Trusted comment translator usage counter read failed.");
      }

      return result.data;
    },
    async persistUsageEvent(request) {
      const rowDraft = createCommentTranslatorDurableUsageCounterRowDraft({
        ownerUserId: request.ownerUserId,
        userLedgerReferenceId: request.userLedgerReferenceId,
        event: request.event,
        nowIso: nowIso()
      });
      const result = await supabase
        .from(commentTranslatorDurableUsageCounterStoreContract.tableName)
        .insert(omitBrowserSafetyMarkers(rowDraft))
        .select(commentTranslatorDurableUsageCounterStoreContract.trustedSelectColumns)
        .single();

      if (result.error || !result.data) {
        throw new Error("Trusted comment translator usage counter write failed.");
      }
    }
  };
}

export async function readCommentTranslatorDurableUsageSnapshotOrFailClosed({
  callerAuthorization,
  durableUsageCounterStore,
  nowMs,
  plan,
  activeSession,
  paidEntitlement
}: {
  callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  durableUsageCounterStore: CommentTranslatorDurableUsageCounterStoreFactoryResult;
  nowMs: number;
  plan: CommentTranslatorSessionPlan;
  activeSession: CommentTranslatorActiveSessionRecord | null;
  paidEntitlement?: Pick<
    CommentTranslatorSessionPlanEntitlement,
    "planEntitlementReferenceId" | "dailyLimitMs" | "sessionLimitMs" | "translatedMessagesPerMinute" | "activeSessionsPerUser"
  >;
}): Promise<CommentTranslatorDurableUsageRead> {
  if (callerAuthorization.status !== "authorized") {
    return createUnavailableCommentTranslatorDurableUsageRead({
      reason: "caller-not-authorized"
    });
  }

  if (durableUsageCounterStore.status !== "ready") {
    return createUnavailableCommentTranslatorDurableUsageRead({
      reason: durableUsageCounterStore.reason
    });
  }

  try {
    const rows = await durableUsageCounterStore.store.readUsageEvents({
      ownerUserId: callerAuthorization.ownerUserId,
      monthStartedAtIso: monthBucketIso(nowMs)
    });

    return {
      status: "ready",
      snapshot: createUsageSnapshotFromRows({
        rows,
        nowMs,
        plan,
        activeSession,
        paidEntitlement
      }),
      authority: "durable-store"
    };
  } catch {
    return createUnavailableCommentTranslatorDurableUsageRead({
      reason: "query-failed"
    });
  }
}

export async function recordCommentTranslatorDurableUsageLedgerEventOrFailClosed({
  callerAuthorization,
  durableUsageCounterStore,
  event
}: {
  callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  durableUsageCounterStore: CommentTranslatorDurableUsageCounterStoreFactoryResult;
  event: CommentTranslatorUsageLedgerEvent;
}): Promise<CommentTranslatorDurableUsagePersistResult> {
  if (callerAuthorization.status !== "authorized") {
    return createUnavailableCommentTranslatorDurableUsageRead({
      reason: "caller-not-authorized"
    });
  }

  const userLedgerReferenceId = createCommentTranslatorUsageLedgerUserReference(callerAuthorization);
  if (!userLedgerReferenceId) {
    return createUnavailableCommentTranslatorDurableUsageRead({
      reason: "caller-not-authorized"
    });
  }

  if (durableUsageCounterStore.status !== "ready") {
    return createUnavailableCommentTranslatorDurableUsageRead({
      reason: durableUsageCounterStore.reason
    });
  }

  try {
    await durableUsageCounterStore.store.persistUsageEvent({
      ownerUserId: callerAuthorization.ownerUserId,
      userLedgerReferenceId,
      event
    });

    return {
      status: "persisted",
      authority: "durable-store"
    };
  } catch {
    return createUnavailableCommentTranslatorDurableUsageRead({
      reason: "query-failed"
    });
  }
}

export async function recordCommentTranslatorDurableSessionLedgerStateOrFailClosed({
  callerAuthorization,
  durableUsageCounterStore,
  intent,
  state,
  occurredAtMs,
  planEntitlement
}: {
  callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  durableUsageCounterStore: CommentTranslatorDurableUsageCounterStoreFactoryResult;
  intent: "status" | "start" | "stop" | "heartbeat";
  state: CommentTranslatorSessionBrowserSafeState;
  occurredAtMs: number;
  planEntitlement: CommentTranslatorSessionPlanEntitlement;
}): Promise<CommentTranslatorDurableUsagePersistResult> {
  if (intent === "start" && state.status === "active") {
    return recordCommentTranslatorDurableUsageLedgerEventOrFailClosed({
      callerAuthorization,
      durableUsageCounterStore,
      event: {
        type: "session-started",
        provider: "youtube",
        planEntitlement,
        sessionReferenceId: state.sessionReferenceId,
        occurredAtMs
      }
    });
  }

  if (state.status !== "stopped") {
    return {
      status: "persisted",
      authority: "durable-store"
    };
  }

  if (!state.sessionReferenceId) {
    const stopCategory = mapStopReasonToQuotaBudgetCategory(state.stopReason);
    if (!stopCategory) {
      return {
        status: "persisted",
        authority: "durable-store"
      };
    }

    return recordCommentTranslatorDurableUsageLedgerEventOrFailClosed({
      callerAuthorization,
      durableUsageCounterStore,
      event: {
        type: "quota-budget-stop",
        provider: "youtube",
        sessionReferenceId: null,
        occurredAtMs,
        stopReason: state.stopReason,
        stopCategory,
        clientReadableDetail: "sanitized-stop-reason-only"
      }
    });
  }

  const chargeableOccurredAtMs = chargeableSessionStoppedOccurredAtMs({
    state,
    fallbackOccurredAtMs: occurredAtMs
  });
  const stoppedResult = await recordCommentTranslatorDurableUsageLedgerEventOrFailClosed({
    callerAuthorization,
    durableUsageCounterStore,
    event: {
      type: "session-stopped",
      provider: "youtube",
      planEntitlement,
      sessionReferenceId: state.sessionReferenceId,
      occurredAtMs: chargeableOccurredAtMs,
      elapsedMs: state.elapsedSeconds * 1_000,
      stopReason: state.stopReason
    }
  });
  if (stoppedResult.status === "fail-closed") {
    return stoppedResult;
  }

  const stopCategory = mapStopReasonToQuotaBudgetCategory(state.stopReason);
  if (!stopCategory) {
    return stoppedResult;
  }

  return recordCommentTranslatorDurableUsageLedgerEventOrFailClosed({
    callerAuthorization,
    durableUsageCounterStore,
    event: {
      type: "quota-budget-stop",
      provider: "youtube",
      sessionReferenceId: state.sessionReferenceId,
      occurredAtMs: chargeableOccurredAtMs,
      stopReason: state.stopReason,
      stopCategory,
      clientReadableDetail: "sanitized-stop-reason-only"
    }
  });
}

export function createUnavailableCommentTranslatorDurableUsageRead({
  reason
}: {
  reason: Extract<CommentTranslatorDurableUsageRead, { status: "fail-closed" }>["reason"];
}): Extract<CommentTranslatorDurableUsageRead, { status: "fail-closed" }> {
  return {
    status: "fail-closed",
    snapshot: null,
    stopReason: "global-budget-stop",
    authority: "durable-store-unavailable",
    reason,
    clientReadableDetail: "sanitized-stop-reason-only"
  };
}

export function createCommentTranslatorDurableUsageCounterRowDraft({
  ownerUserId,
  userLedgerReferenceId,
  event,
  nowIso
}: {
  ownerUserId: string;
  userLedgerReferenceId: CommentTranslatorUsageLedgerUserReference;
  event: CommentTranslatorUsageLedgerEvent;
  nowIso: string;
}): CommentTranslatorDurableUsageCounterRowDraft {
  const occurredAtIso = new Date(event.occurredAtMs).toISOString();
  const base = {
    owner_user_id: ownerUserId,
    user_ledger_reference_id: userLedgerReferenceId,
    session_reference_id: "sessionReferenceId" in event ? event.sessionReferenceId : null,
    provider: event.provider,
    plan_entitlement_reference_id: "planEntitlement" in event ? event.planEntitlement.planEntitlementReferenceId : null,
    event_type: event.type,
    occurred_at: occurredAtIso,
    usage_day: dayBucket(event.occurredAtMs),
    usage_month: monthBucket(event.occurredAtMs),
    session_elapsed_ms: 0,
    provider_request_estimate_count: 0,
    provider_quota_unit_estimate: 0,
    translated_message_estimate: 0,
    translated_character_estimate: 0,
    estimated_cost_micros: 0,
    provider_error_class: null,
    provider_error_count: 0,
    stop_reason: null,
    quota_stop_category: null,
    client_readable_detail: null,
    token_value: "never-returned-by-design",
    authorization_header_value: "never-returned-by-design",
    provider_target_metadata: "forbidden",
    raw_provider_payload: "never-recorded-by-design",
    raw_comment_text: "never-recorded-by-design"
  } satisfies CommentTranslatorDurableUsageCounterRowDraft;

  if (event.type === "session-stopped") {
    return {
      ...base,
      session_elapsed_ms: Math.max(0, event.elapsedMs),
      stop_reason: event.stopReason
    };
  }

  if (event.type === "provider-request-estimated") {
    return {
      ...base,
      provider_request_estimate_count: Math.max(0, event.requestEstimateCount),
      provider_quota_unit_estimate: Math.max(0, event.quotaUnitEstimate)
    };
  }

  if (event.type === "ai-usage-estimated") {
    return {
      ...base,
      translated_message_estimate: Math.max(0, event.translatedMessageEstimate),
      translated_character_estimate: Math.max(0, event.providerInputCharacterEstimate),
      estimated_cost_micros: Math.max(0, event.estimatedCostMicros)
    };
  }

  if (event.type === "provider-translation-error-estimated") {
    return {
      ...base,
      provider_error_class: event.providerErrorClass,
      provider_error_count: Math.max(0, event.errorCount)
    };
  }

  if (event.type === "quota-budget-stop") {
    return {
      ...base,
      stop_reason: event.stopReason,
      quota_stop_category: event.stopCategory,
      client_readable_detail: event.clientReadableDetail
    };
  }

  return {
    ...base,
    occurred_at: occurredAtIso || nowIso
  };
}

function createUsageSnapshotFromRows({
  rows,
  nowMs,
  plan,
  activeSession,
  paidEntitlement
}: {
  rows: readonly CommentTranslatorDurableUsageCounterRow[];
  nowMs: number;
  plan: CommentTranslatorSessionPlan;
  activeSession: CommentTranslatorActiveSessionRecord | null;
  paidEntitlement?: Parameters<typeof resolveCommentTranslatorUsagePlanEntitlement>[0]["paidEntitlement"];
}): CommentTranslatorDurableUsageSnapshot {
  const planEntitlement = resolveCommentTranslatorUsagePlanEntitlement({ plan, paidEntitlement });
  const currentDay = dayBucket(nowMs);
  const currentMonth = monthBucket(nowMs);
  const dailyRows = rows.filter((row) => row.usage_day === currentDay);
  const activeSessionRows = activeSession
    ? dailyRows.filter((row) => row.session_reference_id === activeSession.sessionReferenceId)
    : [];
  const currentMinuteStartedAtMs = nowMs - 60_000;
  const currentWindowProviderExecutionRows = rows.filter((row) => {
    if (!activeSession || row.session_reference_id !== activeSession.sessionReferenceId) {
      return false;
    }

    if (row.event_type !== "ai-usage-estimated" || Math.max(0, row.translated_message_estimate) === 0) {
      return false;
    }

    const occurredAtMs = Date.parse(row.occurred_at);
    return !Number.isFinite(occurredAtMs) || occurredAtMs > currentMinuteStartedAtMs;
  });
  const translatedMessagesInCurrentMinute = currentWindowProviderExecutionRows.reduce(
    (total, row) => total + Math.max(0, row.translated_message_estimate),
    0
  );
  const translatedMessageCapacityAvailableAtMs =
    translatedMessagesInCurrentMinute >= planEntitlement.translatedMessagesPerMinute
      ? earliestDurableProviderExecutionExpiryOrThrow(currentWindowProviderExecutionRows)
      : null;

  return {
    dailyUsedMs: rows
      .filter((row) => row.event_type === "session-stopped")
      .reduce((total, row) => total + sessionElapsedMsForUsageDay(row, currentDay), 0),
    currentSessionElapsedMs: activeSession
      ? chargeableActiveSessionElapsedMs({
          activeSession,
          nowMs,
          sessionLimitMs: planEntitlement.sessionLimitMs
        })
      : 0,
    translatedMessagesInCurrentMinute,
    translatedMessageCapacityAvailableAtMs,
    providerBudgetAvailable: !dailyRows.some(
      (row) => row.event_type === "quota-budget-stop" && row.quota_stop_category === "provider-quota"
    ),
    globalBudgetAvailable: !dailyRows.some(
      (row) => row.event_type === "quota-budget-stop" && row.quota_stop_category === "global-budget"
    ),
    aiBudgetAvailable: !dailyRows.some((row) => row.event_type === "quota-budget-stop" && row.quota_stop_category === "ai-budget"),
    translationProviderAvailable: true,
    planEntitlement,
    providerRequestEstimate: {
      requestEstimateCount: activeSessionRows.reduce((total, row) => total + Math.max(0, row.provider_request_estimate_count), 0),
      quotaUnitEstimate: activeSessionRows.reduce((total, row) => total + Math.max(0, row.provider_quota_unit_estimate), 0),
      providerTargetMetadata: "forbidden"
    },
    aiUsageEstimate: {
      translatedMessageEstimate: activeSessionRows.reduce((total, row) => total + Math.max(0, row.translated_message_estimate), 0),
      providerInputCharacterEstimate: activeSessionRows.reduce(
        (total, row) => total + Math.max(0, row.translated_character_estimate),
        0
      ),
      translatedCharacterEstimate: 0,
      estimatedCostMicros: activeSessionRows.reduce((total, row) => total + Math.max(0, row.estimated_cost_micros), 0),
      rawCommentText: "never-recorded-by-design"
    },
    monthlyProviderInputCharacterEstimate: rows
      .filter((row) => row.usage_month === currentMonth && row.event_type === "ai-usage-estimated")
      .reduce((total, row) => total + Math.max(0, row.translated_character_estimate), 0)
  };
}

function earliestDurableProviderExecutionExpiryOrThrow(rows: readonly CommentTranslatorDurableUsageCounterRow[]) {
  const expiries = rows.map((row) => Date.parse(row.occurred_at) + 60_000);
  if (expiries.length === 0 || expiries.some((expiry) => !Number.isFinite(expiry))) {
    throw new CommentTranslatorUsageRecoveryAuthorityError();
  }

  return Math.min(...expiries);
}

function sessionElapsedMsForUsageDay(row: CommentTranslatorDurableUsageCounterRow, usageDay: string) {
  const elapsedMs = Math.max(0, row.session_elapsed_ms);
  if (elapsedMs === 0) {
    return 0;
  }

  const stoppedAtMs = Date.parse(row.occurred_at);
  const dayStartedAtMs = Date.parse(`${usageDay}T00:00:00.000Z`);
  if (!Number.isFinite(stoppedAtMs) || !Number.isFinite(dayStartedAtMs)) {
    return row.usage_day === usageDay ? elapsedMs : 0;
  }

  const startedAtMs = Math.max(0, stoppedAtMs - elapsedMs);
  const dayEndedAtMs = dayStartedAtMs + 24 * 60 * 60 * 1_000;
  return Math.max(0, Math.min(stoppedAtMs, dayEndedAtMs) - Math.max(startedAtMs, dayStartedAtMs));
}

function chargeableSessionStoppedOccurredAtMs({
  state,
  fallbackOccurredAtMs
}: {
  state: CommentTranslatorSessionBrowserSafeState;
  fallbackOccurredAtMs: number;
}) {
  if (!state.startedAtIso) {
    return fallbackOccurredAtMs;
  }

  const startedAtMs = Date.parse(state.startedAtIso);
  const elapsedMs = Math.max(0, state.elapsedSeconds * 1_000);
  const chargeableStoppedAtMs = startedAtMs + elapsedMs;
  if (!Number.isFinite(chargeableStoppedAtMs)) {
    return fallbackOccurredAtMs;
  }

  return Math.min(fallbackOccurredAtMs, chargeableStoppedAtMs);
}

function chargeableActiveSessionElapsedMs({
  activeSession,
  nowMs,
  sessionLimitMs
}: {
  activeSession: CommentTranslatorActiveSessionRecord;
  nowMs: number;
  sessionLimitMs: number;
}) {
  const heartbeatBoundedNowMs = Math.min(nowMs, Math.max(activeSession.startedAtMs, activeSession.lastHeartbeatAtMs) + 45_000);
  return Math.min(Math.max(0, heartbeatBoundedNowMs - activeSession.startedAtMs), Math.max(0, sessionLimitMs));
}

function omitBrowserSafetyMarkers(
  rowDraft: CommentTranslatorDurableUsageCounterRowDraft
): Omit<
  CommentTranslatorDurableUsageCounterRowDraft,
  "token_value" | "authorization_header_value" | "provider_target_metadata" | "raw_provider_payload" | "raw_comment_text"
> {
  const {
    token_value: _tokenValue,
    authorization_header_value: _authorizationHeaderValue,
    provider_target_metadata: _providerTargetMetadata,
    raw_provider_payload: _rawProviderPayload,
    raw_comment_text: _rawCommentText,
    ...row
  } = rowDraft;

  return row;
}

function mapStopReasonToQuotaBudgetCategory(
  stopReason: CommentTranslatorSessionStopReason
): CommentTranslatorUsageQuotaBudgetStopCategory | null {
  if (stopReason === "provider-quota-stop") {
    return "provider-quota";
  }

  if (stopReason === "global-budget-stop") {
    return "global-budget";
  }

  if (stopReason === "ai-budget-stop") {
    return "ai-budget";
  }

  if (stopReason === "translated-message-cap") {
    return "translated-message-cap";
  }

  if (stopReason === "session-time-limit") {
    return "session-time-limit";
  }

  if (stopReason === "daily-time-limit") {
    return "daily-time-limit";
  }

  return null;
}

function dayBucket(nowMs: number) {
  return new Date(nowMs).toISOString().slice(0, 10);
}

function monthBucket(nowMs: number) {
  return `${new Date(nowMs).toISOString().slice(0, 7)}-01`;
}

function monthBucketIso(nowMs: number) {
  return `${monthBucket(nowMs)}T00:00:00.000Z`;
}

function readTrustedEnv(
  env: Partial<Record<CommentTranslatorDurableUsageCounterStoreFactoryEnvName, string | undefined>>,
  name: CommentTranslatorDurableUsageCounterStoreFactoryEnvName
): string | null {
  const value = env[name]?.trim();
  return value ? value : null;
}

function createTrustedSupabaseServiceRoleClient(
  url: string,
  serviceRoleKey: string
): CommentTranslatorDurableUsageCounterSupabaseClient {
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }) as unknown as CommentTranslatorDurableUsageCounterSupabaseClient;
}
