import "server-only";

import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  createCommentTranslatorProviderCircuitAuthority,
  resolveCommentTranslatorProviderCircuitRoute,
  type CommentTranslatorProviderCircuitAuthority,
  type CommentTranslatorProviderCircuitRoute
} from "./comment-translator-provider-circuit-breaker";
import {
  createAzureCommentTranslationProvider,
  readAzureCommentTranslationProviderConfig,
  readOpenAIMiniCommentTranslationProviderConfig,
  type AzureCommentTranslationProviderConfig
} from "./comment-translator-provider-policy-runtime";
import {
  createTrustedCommentTranslatorPaidEntitlementStore,
  type CommentTranslatorPaidEntitlement,
  type CommentTranslatorPaidEntitlementStoreFactoryResult,
  type CommentTranslatorPaidStoreFactoryEnvName
} from "./comment-translator-paid-entitlement-store";
import {
  createTrustedCommentTranslatorPaidUsageStore,
  type CommentTranslatorPaidRuntimeAuthority,
  type CommentTranslatorPaidUsageStore,
  type CommentTranslatorPaidUsageStoreFactoryResult
} from "./comment-translator-paid-usage-store";
import type { CommentTranslatorPaidProviderKillSwitches } from "./comment-translator-provider-execution-runtime";
import {
  createCommentTranslatorSessionPlanEntitlement,
  type CommentTranslatorSessionPlan,
  type CommentTranslatorSessionPlanEntitlement,
  type CommentTranslatorSessionStopReason
} from "./comment-translator-session-runtime";
import { type CommentTranslatorBillingEntitlementSnapshot } from "./comment-translator-billing-runtime";
import {
  type CommentTranslatorDurableUsageRead,
  type CommentTranslatorDurableUsageSnapshot
} from "./comment-translator-durable-usage-counter-store";
import { type CommentTranslatorFreeBetaPreviewRateLimitSmokeOverride } from "./comment-translator-free-beta-preview-rate-limit-smoke-override";
import type { YouTubeOAuthCredentialStatusCallerAuthorization } from "./comment-translator-youtube-credential-status-boundary";
import { commentTranslatorPaidCostLedgerContract } from "./comment-translator-paid-cost-ledger";
import {
  readCommentTranslatorPaidPositiveIntegerEnv,
  resolveCommentTranslatorPaidPollBudgetGate
} from "./comment-translator-paid-poll-budget-gate";

export {
  readCommentTranslatorPaidPositiveIntegerEnv,
  resolveCommentTranslatorPaidPollBudgetGate
} from "./comment-translator-paid-poll-budget-gate";

const paidSessionLimitMs = 3 * 60 * 60 * 1_000;
const paidDailyTimeLimitMs = Number.MAX_SAFE_INTEGER;
const paidPollIntervalMs = 15_000;
export const commentTranslatorPaidPlanEntitlementReferenceId = "comment-translator-paid-core-v1";

export function createCommentTranslatorPaidPreSessionPollBudgetReference(
  callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization
): string | null {
  if (callerAuthorization.status !== "authorized") return null;
  const digest = createHash("sha256")
    .update(`comment-translator-paid-pre-session-poll-budget:${callerAuthorization.ownerUserId}`)
    .digest("hex")
    .slice(0, 32);
  return `ctpps_${digest}`;
}

export type CommentTranslatorPaidProviderRuntime = {
  usageStore: CommentTranslatorPaidUsageStore;
  circuitAuthority: CommentTranslatorProviderCircuitAuthority;
  serverSecret: string;
  attemptKeyVersion: string;
  killSwitches: CommentTranslatorPaidProviderKillSwitches;
  openAi: {
    apiKey: string | null;
    endpoint: string | null;
  };
  azureProvider: ReturnType<typeof createAzureCommentTranslationProvider> | null;
  dailyPollBudget: number;
};

export type CommentTranslatorPaidSessionAuthoritySnapshot = {
  status: "ready";
  entitlement: CommentTranslatorPaidEntitlement;
  costAuthority: CommentTranslatorPaidRuntimeAuthority;
  providerAuthority: {
    openAiAvailable: boolean;
    azureFallbackAvailable: boolean;
    effectiveRoute: CommentTranslatorProviderCircuitRoute;
  };
  pollBudget: {
    dailyBudget: number;
    reservedPolls: number;
    sessionReservedPolls: number;
    utcDay: string;
    nextResetAtIso: string;
    activeAutoPollAllowed: boolean;
    authorityReadable?: boolean;
  };
};

export type CommentTranslatorPaidSessionAuthorityRead =
  | CommentTranslatorPaidSessionAuthoritySnapshot & {
      providerRuntime: CommentTranslatorPaidProviderRuntime;
    }
  | {
      status: "not-entitled";
      entitlement: null;
    }
  | {
      status: "fail-closed";
      entitlement?: CommentTranslatorPaidEntitlement;
      reason:
        | "caller-not-authorized"
        | "entitlement-authority-unreadable"
        | "cost-authority-unreadable"
        | "provider-authority-unreadable"
        | "provider-configuration-unreadable"
        | "poll-budget-config-unreadable";
    };

export type CommentTranslatorPaidSessionAuthorityDependencies = {
  paidEntitlementStore: CommentTranslatorPaidEntitlementStoreFactoryResult;
  paidUsageStore: CommentTranslatorPaidUsageStoreFactoryResult;
  providerCircuitAuthority: CommentTranslatorProviderCircuitAuthority | null;
  providerRuntime: CommentTranslatorPaidProviderRuntime | null;
};

export type CommentTranslatorPublicEntitlementBaselineResult =
  | {
      status: "ready";
      plan: CommentTranslatorSessionPlan;
      usage: CommentTranslatorDurableUsageSnapshot;
      planEntitlement: CommentTranslatorSessionPlanEntitlement;
      monthlyProviderInputCharacterLimit: number;
      monthlyProviderInputCharacterEstimate: number;
      monthlyProviderInputCharacterRemaining: number;
      entitlementSource: "free-public-beta-baseline" | "durable-paid-entitlement";
      degradedFrom: "non-durable-paid-entitlement" | null;
      publicLaunchAllowed: false;
    }
  | {
      status: "fail-closed";
      stopReason: Extract<CommentTranslatorSessionStopReason, "global-budget-stop" | "paid-authority-unreadable">;
      reason:
        | Extract<CommentTranslatorDurableUsageRead, { status: "fail-closed" }>["reason"]
        | "paid-authority-unreadable";
      authority: "durable-usage-store-unavailable" | "paid-authority-unavailable";
      clientReadableDetail: "sanitized-stop-reason-only";
      publicLaunchAllowed: false;
    };

export const commentTranslatorPaidSessionIntegrationContract = {
  implementationStage: "comment-translator-paid-v1-task7-session-integration",
  runtime: "server-only",
  authorityRead: "durable-entitlement-usage-cost-provider-and-poll-fail-closed",
  paidDailyTimeLimit: "none",
  paidLimits: {
    translatedMessagesPerMinute: 60,
    sessionLimitMs: paidSessionLimitMs,
    activeSessionsPerUser: 1,
    billingPeriodInputCharacters: 500_000,
    dailyTimeLimitMs: paidDailyTimeLimitMs
  },
  pollBudget: {
    maximumPollsPerSession: 720,
    pollIntervalMs: paidPollIntervalMs,
    checkoutStopPercent: 80,
    newSessionStopPercent: 90,
    activeAutoPollStopPercent: 95,
    utcBoundary: "new-bucket-reservation-before-auto-poll-resume",
    unusedReservation: "held-until-utc-reset",
    unreadableAuthority: "no-paid-session-or-provider-call"
  },
  providerRouting: {
    paidPrimary: "openai-mini",
    paidRecoverableFallback: "azure-direct-paid-ledger",
    paidToFreeFallback: "forbidden",
    openAiRecovery: "same-session-next-normal-path",
    freeProviderPath: "unchanged"
  },
  privacy: {
    rawProviderPayload: "never-returned-by-design",
    rawCommentText: "never-recorded-by-design",
    privateIdentifiers: "server-only-not-returned"
  },
  publicLaunchAllowed: false
} as const;

export const commentTranslatorPublicEntitlementBaselineContract = {
  implementationStage: "free-public-beta-f5-public-entitlement-baseline",
  runtime: "server-only",
  planAuthority: "server-owned-free-baseline-or-durable-paid-entitlement",
  billingReadPath: "durable-entitlement-only-for-paid",
  paidProjectionAuthority: "signed-webhook-durable-supabase-only",
  checkoutRedirectAuthority: "never-grants-entitlement",
  durableUsageAuthority: "durable-usage-counter-required",
  publicLaunchAllowed: false,
  freePlanLimits: {
    dailyMinutes: 30,
    sessionMinutes: 30,
    translatedMessagesPerMinute: 30,
    activeSessionsPerUser: 1,
    monthlyProviderInputCharacters: 20_000
  },
  paidPlanLimits: {
    sessionMinutes: 180,
    translatedMessagesPerMinute: 60,
    activeSessionsPerUser: 1,
    billingPeriodProviderInputCharacters: 500_000,
    dailyTimeLimit: "none"
  },
  safeDegradation: "non-entitled-free-only; active-paid-authority-read-failure-fails-closed",
  failClosedFallback: "stop-session-when-durable-or-paid-authority-unavailable",
  remoteSupabaseMutation: "not-run-by-codex-in-this-thread",
  remoteSupabaseMigrationApply: "not-run-in-this-thread",
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

export function createCommentTranslatorPaidSessionAuthorityDependencies({
  env = process.env as Partial<Record<CommentTranslatorPaidStoreFactoryEnvName | string, string | undefined>>,
  createSupabaseClient = createClient
}: {
  env?: Partial<Record<CommentTranslatorPaidStoreFactoryEnvName | string, string | undefined>>;
  createSupabaseClient?: typeof createClient;
} = {}): CommentTranslatorPaidSessionAuthorityDependencies {
  const paidEntitlementStore = createTrustedCommentTranslatorPaidEntitlementStore({
    env,
    createSupabaseClient: (url, serviceRoleKey) => createSupabaseClient(url, serviceRoleKey) as never
  });
  const paidUsageStore = createTrustedCommentTranslatorPaidUsageStore({
    env,
    createSupabaseClient: (url, serviceRoleKey) => createSupabaseClient(url, serviceRoleKey) as never
  });
  const url = readNonEmptyEnv(env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = readNonEmptyEnv(env.SUPABASE_SERVICE_ROLE_KEY);
  const providerCircuitAuthority = url && serviceRoleKey
    ? createCommentTranslatorProviderCircuitAuthority({
        rpc: createSupabaseClient(url, serviceRoleKey) as never
      })
    : null;
  const providerRuntime =
    paidUsageStore.status === "ready" && providerCircuitAuthority
      ? createPaidProviderRuntime({
          env,
          usageStore: paidUsageStore.store,
          circuitAuthority: providerCircuitAuthority
        })
      : null;
  return { paidEntitlementStore, paidUsageStore, providerCircuitAuthority, providerRuntime };
}

export async function readCommentTranslatorPaidSessionAuthority({
  callerAuthorization,
  nowMs,
  pollBudgetSessionReferenceId,
  allowEmptyPollBudgetInitialization = false,
  dependencies = createCommentTranslatorPaidSessionAuthorityDependencies()
}: {
  callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  nowMs: number;
  pollBudgetSessionReferenceId?: string | null;
  allowEmptyPollBudgetInitialization?: boolean;
  dependencies?: CommentTranslatorPaidSessionAuthorityDependencies;
}): Promise<CommentTranslatorPaidSessionAuthorityRead> {
  if (callerAuthorization.status !== "authorized") {
    return { status: "fail-closed", reason: "caller-not-authorized" };
  }
  if (dependencies.paidEntitlementStore.status !== "ready") {
    return { status: "fail-closed", reason: "entitlement-authority-unreadable" };
  }

  let entitlement: CommentTranslatorPaidEntitlement | null;
  try {
    entitlement = await dependencies.paidEntitlementStore.store.readEntitlement({
      ownerUserId: callerAuthorization.ownerUserId
    });
  } catch {
    return { status: "fail-closed", reason: "entitlement-authority-unreadable" };
  }
  if (!entitlement) return { status: "not-entitled", entitlement: null };
  if (!isCurrentPaidEntitlement(entitlement, callerAuthorization.ownerUserId, nowMs)) {
    return { status: "not-entitled", entitlement: null };
  }
  if (
    dependencies.paidUsageStore.status !== "ready"
    || !dependencies.providerCircuitAuthority
    || !dependencies.providerRuntime
  ) {
    return { status: "fail-closed", reason: "provider-configuration-unreadable", entitlement };
  }

  const periodStartIso = entitlement.currentPeriodStartIso;
  const periodEndIso = entitlement.currentPeriodEndIso;
  if (!periodStartIso || !periodEndIso) {
    return { status: "fail-closed", reason: "entitlement-authority-unreadable", entitlement };
  }
  const utcMonth = monthBucketIso(nowMs);
  let costAuthority: CommentTranslatorPaidRuntimeAuthority;
  try {
    costAuthority = await dependencies.paidUsageStore.store.readRuntimeAuthority({
      ownerUserId: callerAuthorization.ownerUserId,
      periodStartIso,
      periodEndIso,
      utcMonth,
      nowIso: new Date(nowMs).toISOString()
    });
  } catch {
    return { status: "fail-closed", reason: "cost-authority-unreadable", entitlement };
  }
  if (!costAuthority.billingPeriodAvailable) {
    return { status: "fail-closed", reason: "cost-authority-unreadable", entitlement };
  }
  let openAiCircuit;
  let azureFallbackCircuit;
  try {
    openAiCircuit = await dependencies.providerCircuitAuthority.read("openai");
    azureFallbackCircuit = await dependencies.providerCircuitAuthority.read("azure_fallback");
  } catch {
    return { status: "fail-closed", reason: "cost-authority-unreadable", entitlement };
  }
  if (openAiCircuit.provider !== "openai" || azureFallbackCircuit.provider !== "azure_fallback") {
    return { status: "fail-closed", reason: "provider-authority-unreadable", entitlement };
  }

  const openAiCircuitRoute = resolveCommentTranslatorProviderCircuitRoute({
    snapshot: openAiCircuit,
    nowMs
  });
  const openAiProbeEligible =
    openAiCircuit.state === "degraded"
    && typeof openAiCircuit.degradedUntilMs === "number"
    && Number.isFinite(openAiCircuit.degradedUntilMs)
    && openAiCircuit.degradedUntilMs <= nowMs;
  const openAiAvailable =
    (openAiCircuitRoute === "openai" || openAiProbeEligible)
    && dependencies.providerRuntime.killSwitches.paid_translation_enabled
    && dependencies.providerRuntime.killSwitches.openai_enabled
    && Boolean(dependencies.providerRuntime.openAi.apiKey?.trim());
  const azureFallbackAvailable =
    openAiCircuitRoute === "azure-direct"
    && dependencies.providerRuntime.killSwitches.paid_translation_enabled
    && dependencies.providerRuntime.killSwitches.azure_fallback_enabled
    && azureFallbackCircuit.state !== "disabled"
    && dependencies.providerRuntime.azureProvider !== null;
  const effectiveRoute: CommentTranslatorProviderCircuitRoute = openAiAvailable
    ? "openai"
    : azureFallbackAvailable
      ? "azure-direct"
      : "blocked";
  if (effectiveRoute === "blocked") {
    return { status: "fail-closed", reason: "provider-configuration-unreadable", entitlement };
  }
  let pollBudget: CommentTranslatorPaidSessionAuthoritySnapshot["pollBudget"] = {
    dailyBudget: dependencies.providerRuntime.dailyPollBudget,
    reservedPolls: 0,
    sessionReservedPolls: 0,
    utcDay: dayBucket(nowMs),
    nextResetAtIso: utcDayEndIso(nowMs),
    activeAutoPollAllowed: false,
    authorityReadable: false
  };
  if (pollBudgetSessionReferenceId) {
    try {
      const authority = await dependencies.paidUsageStore.store.readPollBudget({
        sessionReferenceId: pollBudgetSessionReferenceId,
        ownerUserId: callerAuthorization.ownerUserId,
        nowIso: new Date(nowMs).toISOString()
      });
      const canInitializeEmptyPollBudget = allowEmptyPollBudgetInitialization
        && authority.dailyBudget === null
        && authority.reservedPolls === 0
        && authority.sessionReservedPolls === 0
        && !authority.sessionReservationPresent;
      const dailyBudget = authority.dailyBudget ?? (canInitializeEmptyPollBudget ? dependencies.providerRuntime.dailyPollBudget : null);
      if (dailyBudget === null) {
        return { status: "fail-closed", reason: "poll-budget-config-unreadable", entitlement };
      }
      const gate = resolveCommentTranslatorPaidPollBudgetGate({
        dailyBudget,
        reservedPolls: authority.reservedPolls,
        isNewSession: false,
        nowMs
      });
      pollBudget = {
        dailyBudget,
        reservedPolls: authority.reservedPolls,
        sessionReservedPolls: authority.sessionReservedPolls,
        utcDay: authority.utcDay,
        nextResetAtIso: authority.nextResetAtIso,
        activeAutoPollAllowed: gate.status === "allowed",
        authorityReadable: true
      };
    } catch {
      return { status: "fail-closed", reason: "poll-budget-config-unreadable", entitlement };
    }
  }
  return {
    status: "ready",
    entitlement,
    costAuthority,
    providerAuthority: { openAiAvailable, azureFallbackAvailable, effectiveRoute },
    pollBudget,
    providerRuntime: dependencies.providerRuntime
  };
}

export function createCommentTranslatorPaidSessionPlanEntitlement({
  costAuthority
}: {
  costAuthority: Pick<CommentTranslatorPaidRuntimeAuthority, "billingPeriodCharacterLimit">;
}): CommentTranslatorSessionPlanEntitlement {
  return createCommentTranslatorSessionPlanEntitlement({
    plan: "paid",
    paidEntitlement: {
      planEntitlementReferenceId: commentTranslatorPaidPlanEntitlementReferenceId,
      dailyLimitMs: paidDailyTimeLimitMs,
      sessionLimitMs: paidSessionLimitMs,
      translatedMessagesPerMinute: 60,
      activeSessionsPerUser: 1,
      monthlyProviderInputCharacterLimit: costAuthority.billingPeriodCharacterLimit,
      paidIndividualCostLimitMicros: 3_000_000,
      paidGlobalCostLimitMicros: 25_000_000,
      paidAzureFallbackMonthlyCharacterLimit: 200_000,
      paidAuthorityReadable: true
    }
  });
}

/**
 * Keeps an already-active Paid session on the Paid ledger while handling an
 * explicit Stop. This is not an entitlement grant and must never be used for
 * start/heartbeat/provider execution.
 */
export function createCommentTranslatorPaidSessionStopPlanEntitlement(): CommentTranslatorSessionPlanEntitlement {
  return createCommentTranslatorSessionPlanEntitlement({
    plan: "paid",
    paidEntitlement: {
      planEntitlementReferenceId: commentTranslatorPaidPlanEntitlementReferenceId,
      dailyLimitMs: paidDailyTimeLimitMs,
      sessionLimitMs: paidSessionLimitMs,
      translatedMessagesPerMinute: 60,
      activeSessionsPerUser: 1,
      monthlyProviderInputCharacterLimit: commentTranslatorPaidCostLedgerContract.paidBillingPeriodCharacterLimit,
      paidIndividualCostLimitMicros: commentTranslatorPaidCostLedgerContract.paidIndividualCostLimitMicros,
      paidGlobalCostLimitMicros: commentTranslatorPaidCostLedgerContract.paidGlobalCostLimitMicros,
      paidAzureFallbackMonthlyCharacterLimit: commentTranslatorPaidCostLedgerContract.paidAzureFallbackCharacterLimit,
      paidAuthorityReadable: false
    }
  });
}

export function resolveCommentTranslatorPaidSessionStopBaseline({
  durableUsageRead
}: {
  durableUsageRead: CommentTranslatorDurableUsageRead;
}): CommentTranslatorPublicEntitlementBaselineResult {
  if (durableUsageRead.status === "fail-closed") {
    return {
      status: "fail-closed",
      stopReason: "global-budget-stop",
      reason: durableUsageRead.reason,
      authority: "durable-usage-store-unavailable",
      clientReadableDetail: "sanitized-stop-reason-only",
      publicLaunchAllowed: false
    };
  }
  const planEntitlement = createCommentTranslatorPaidSessionStopPlanEntitlement();
  const publicUsageSnapshot = createPaidPublicUsageSnapshot(durableUsageRead.snapshot);
  const monthlyProviderInputCharacterLimit = planEntitlement.monthlyProviderInputCharacterLimit
    ?? commentTranslatorPaidCostLedgerContract.paidBillingPeriodCharacterLimit;
  const monthlyProviderInputCharacterEstimate = Math.max(
    0,
    durableUsageRead.snapshot.monthlyProviderInputCharacterEstimate ?? 0
  );
  return {
    status: "ready",
    plan: "paid",
    usage: {
      ...publicUsageSnapshot,
      planEntitlement,
      translationProviderAvailable: false,
      providerBudgetAvailable: false,
      aiBudgetAvailable: false,
      paidAuthorityReadable: false,
      paidBillingPeriodInputCharacters: monthlyProviderInputCharacterEstimate,
      paidBillingPeriodCharacterLimit: monthlyProviderInputCharacterLimit,
      paidIndividualCostAvailable: false,
      paidGlobalCostAvailable: false
    },
    planEntitlement,
    monthlyProviderInputCharacterLimit,
    monthlyProviderInputCharacterEstimate,
    monthlyProviderInputCharacterRemaining: Math.max(
      0,
      monthlyProviderInputCharacterLimit - monthlyProviderInputCharacterEstimate
    ),
    entitlementSource: "durable-paid-entitlement",
    degradedFrom: null,
    publicLaunchAllowed: false
  };
}

export function resolveCommentTranslatorPublicEntitlementBaseline({
  billingSnapshot,
  durableUsageRead,
  paidAuthority,
  previewRateLimitSmokeOverride,
  nowMs = Date.now()
}: {
  billingSnapshot?: Pick<CommentTranslatorBillingEntitlementSnapshot, "plan" | "billingState" | "planEntitlement"> | null;
  durableUsageRead: CommentTranslatorDurableUsageRead;
  paidAuthority?:
    | CommentTranslatorPaidSessionAuthoritySnapshot
    | Pick<Extract<CommentTranslatorPaidSessionAuthorityRead, { status: "fail-closed" }>, "status" | "reason">;
  previewRateLimitSmokeOverride?: CommentTranslatorFreeBetaPreviewRateLimitSmokeOverride;
  nowMs?: number;
}): CommentTranslatorPublicEntitlementBaselineResult {
  if (durableUsageRead.status === "fail-closed") {
    return {
      status: "fail-closed",
      stopReason: "global-budget-stop",
      reason: durableUsageRead.reason,
      authority: "durable-usage-store-unavailable",
      clientReadableDetail: "sanitized-stop-reason-only",
      publicLaunchAllowed: false
    };
  }
  if (paidAuthority?.status === "fail-closed") {
    return {
      status: "fail-closed",
      stopReason: "paid-authority-unreadable",
      reason: "paid-authority-unreadable",
      authority: "paid-authority-unavailable",
      clientReadableDetail: "sanitized-stop-reason-only",
      publicLaunchAllowed: false
    };
  }
  if (paidAuthority?.status === "ready") {
    return resolvePaidBaseline({
      durableUsageRead,
      paidAuthority,
      nowMs
    });
  }

  const defaultPlanEntitlement = createCommentTranslatorSessionPlanEntitlement({ plan: "free" });
  const planEntitlement = {
    ...defaultPlanEntitlement,
    translatedMessagesPerMinute:
      previewRateLimitSmokeOverride?.translatedMessagesPerMinute ?? defaultPlanEntitlement.translatedMessagesPerMinute
  };
  const monthlyProviderInputCharacterLimit =
    planEntitlement.monthlyProviderInputCharacterLimit ??
    commentTranslatorPublicEntitlementBaselineContract.freePlanLimits.monthlyProviderInputCharacters;
  const monthlyProviderInputCharacterEstimate = Math.max(0, durableUsageRead.snapshot.monthlyProviderInputCharacterEstimate);
  const monthlyProviderInputCharacterRemaining = Math.max(
    0,
    monthlyProviderInputCharacterLimit - monthlyProviderInputCharacterEstimate
  );
  const monthlyCharacterBudgetAvailable = monthlyProviderInputCharacterEstimate < monthlyProviderInputCharacterLimit;

  return {
    status: "ready",
    plan: "free",
    usage: {
      ...durableUsageRead.snapshot,
      planEntitlement,
      aiBudgetAvailable: durableUsageRead.snapshot.aiBudgetAvailable && monthlyCharacterBudgetAvailable
    },
    planEntitlement,
    monthlyProviderInputCharacterLimit,
    monthlyProviderInputCharacterEstimate,
    monthlyProviderInputCharacterRemaining,
    entitlementSource: "free-public-beta-baseline",
    degradedFrom: billingSnapshot?.plan === "paid" || billingSnapshot?.billingState === "paid-active" ? "non-durable-paid-entitlement" : null,
    publicLaunchAllowed: false
  };
}

export function resolveCommentTranslatorPaidMessageRateGate({
  usedMessages,
  candidateMessages,
  nowMs
}: {
  usedMessages: number;
  candidateMessages: number;
  nowMs: number;
}): {
  status: "allowed" | "rate-limit-paused";
  nextResetAtIso: string;
} {
  const nextResetAtIso = nextUtcMinuteIso(nowMs);
  if (
    !Number.isSafeInteger(usedMessages)
    || usedMessages < 0
    || !Number.isSafeInteger(candidateMessages)
    || candidateMessages <= 0
    || usedMessages + candidateMessages > 60
  ) {
    return { status: "rate-limit-paused", nextResetAtIso };
  }
  return { status: "allowed", nextResetAtIso };
}

function resolvePaidBaseline({
  durableUsageRead,
  paidAuthority,
  nowMs
}: {
  durableUsageRead: Extract<CommentTranslatorDurableUsageRead, { status: "ready" }>;
  paidAuthority: CommentTranslatorPaidSessionAuthoritySnapshot;
  nowMs: number;
}): Extract<CommentTranslatorPublicEntitlementBaselineResult, { status: "ready" }> {
  const planEntitlement = createCommentTranslatorPaidSessionPlanEntitlement({ costAuthority: paidAuthority.costAuthority });
  const publicUsageSnapshot = createPaidPublicUsageSnapshot(durableUsageRead.snapshot);
  const monthlyProviderInputCharacterLimit = paidAuthority.costAuthority.billingPeriodCharacterLimit;
  const monthlyProviderInputCharacterEstimate = paidAuthority.costAuthority.billingPeriodInputCharacters;
  const providerAuthorityAvailable = paidAuthority.providerAuthority.effectiveRoute !== "blocked";
  const monthlyProviderInputCharacterRemaining = Math.max(
    0,
    monthlyProviderInputCharacterLimit - monthlyProviderInputCharacterEstimate
  );
  const paidPollAuthorityReadable = paidAuthority.pollBudget.authorityReadable === true;
  const paidAuthorityReadable = paidPollAuthorityReadable && providerAuthorityAvailable;
  const paidSafetyStopReason = !paidPollAuthorityReadable
      ? "poll-budget-stop" as const
    : !providerAuthorityAvailable
      ? "infra-safety-stop" as const
      : monthlyProviderInputCharacterEstimate >= monthlyProviderInputCharacterLimit
        ? "character-quota" as const
        : !paidAuthority.costAuthority.individualCostAvailable
          ? "individual-safety-cap" as const
          : !paidAuthority.costAuthority.globalCostAvailable
            ? "global-safety-cap" as const
            : null;
  const paidPollBudgetStatus = !paidPollAuthorityReadable
    ? "unknown" as const
    : paidAuthority.pollBudget.activeAutoPollAllowed
    ? "allowed" as const
    : "stop-active-auto-poll" as const;
  return {
    status: "ready",
    plan: "paid",
    usage: {
      ...publicUsageSnapshot,
      planEntitlement,
      monthlyProviderInputCharacterEstimate,
      translatedMessagesInCurrentMinute: paidAuthority.costAuthority.translatedMessagesInCurrentMinute,
      translatedMessageCapacityAvailableAtMs: paidAuthority.costAuthority.translatedMessageCapacityAvailableAtIso
        ? Date.parse(paidAuthority.costAuthority.translatedMessageCapacityAvailableAtIso)
        : null,
      translationProviderAvailable: providerAuthorityAvailable,
      paidAuthorityReadable: paidAuthorityReadable,
      paidBillingPeriodInputCharacters: monthlyProviderInputCharacterEstimate,
      paidBillingPeriodCharacterLimit: monthlyProviderInputCharacterLimit,
      paidIndividualCostAvailable: paidAuthority.costAuthority.individualCostAvailable,
      paidGlobalCostAvailable: paidAuthority.costAuthority.globalCostAvailable,
      paidBillingPeriodNextResetAtIso: paidAuthority.entitlement.currentPeriodEndIso,
      paidProviderRoute: paidAuthority.providerAuthority.effectiveRoute,
      paidProviderFallbackActive: paidAuthority.providerAuthority.effectiveRoute === "azure-direct",
      paidProviderRecoveryExpected: paidAuthority.providerAuthority.effectiveRoute === "azure-direct",
      paidSafetyStopReason,
      paidSafetyStopNextResetAtIso: paidSafetyStopReason === "global-safety-cap"
        ? nextUtcMonthIso(nowMs)
        : paidAuthority.entitlement.currentPeriodEndIso,
      paidPollBudgetStatus,
      paidPollBudgetNextResetAtIso: paidAuthority.pollBudget.nextResetAtIso,
      aiBudgetAvailable:
        monthlyProviderInputCharacterEstimate < monthlyProviderInputCharacterLimit
        && paidAuthority.costAuthority.individualCostAvailable
        && paidAuthority.costAuthority.globalCostAvailable
        && paidAuthorityReadable
        && providerAuthorityAvailable,
      providerBudgetAvailable: providerAuthorityAvailable,
      globalBudgetAvailable: true
    },
    planEntitlement,
    monthlyProviderInputCharacterLimit,
    monthlyProviderInputCharacterEstimate,
    monthlyProviderInputCharacterRemaining,
    entitlementSource: "durable-paid-entitlement",
    degradedFrom: null,
    publicLaunchAllowed: false
  };
}

function createPaidPublicUsageSnapshot(
  snapshot: CommentTranslatorDurableUsageSnapshot
): CommentTranslatorDurableUsageSnapshot {
  const { rawCommentText: _rawCommentText, ...sanitizedAiUsageEstimate } = snapshot.aiUsageEstimate;
  return {
    ...snapshot,
    aiUsageEstimate: sanitizedAiUsageEstimate as CommentTranslatorDurableUsageSnapshot["aiUsageEstimate"]
  };
}

function createPaidProviderRuntime({
  env,
  usageStore,
  circuitAuthority
}: {
  env: Partial<Record<string, string | undefined>>;
  usageStore: CommentTranslatorPaidUsageStore;
  circuitAuthority: CommentTranslatorProviderCircuitAuthority;
}): CommentTranslatorPaidProviderRuntime | null {
  const serverSecret = readNonEmptyEnv(env.COMMENT_TRANSLATOR_PAID_ATTEMPT_HMAC_SECRET);
  const attemptKeyVersion = readNonEmptyEnv(env.COMMENT_TRANSLATOR_PAID_ATTEMPT_KEY_VERSION);
  const dailyPollBudget = readCommentTranslatorPaidPositiveIntegerEnv(env.COMMENT_TRANSLATOR_PAID_POLL_DAILY_BUDGET);
  const killSwitches = readCommentTranslatorPaidProviderKillSwitches(env);
  const openAiConfig = readOpenAIMiniCommentTranslationProviderConfig(env);
  const azureConfig = readAzureCommentTranslationProviderConfig(env);
  if (!serverSecret || !attemptKeyVersion || dailyPollBudget === null || !killSwitches) return null;
  return {
    usageStore,
    circuitAuthority,
    serverSecret,
    attemptKeyVersion,
    killSwitches,
    openAi: {
      apiKey: openAiConfig.apiKey?.trim() || null,
      endpoint: openAiConfig.endpoint?.trim() || null
    },
    azureProvider: openAzureProvider(azureConfig),
    dailyPollBudget
  };
}

function openAzureProvider(config: AzureCommentTranslationProviderConfig) {
  if (!config.key?.trim() || !config.endpoint?.trim()) return null;
  return createAzureCommentTranslationProvider(config);
}

export function readCommentTranslatorPaidProviderKillSwitches(
  env: Partial<Record<string, string | undefined>>
): CommentTranslatorPaidProviderKillSwitches | null {
  const values = {
    checkout_enabled: readBooleanEnv(env.COMMENT_TRANSLATOR_PAID_CHECKOUT_ENABLED),
    paid_translation_enabled: readBooleanEnv(env.COMMENT_TRANSLATOR_PAID_TRANSLATION_ENABLED),
    openai_enabled: readBooleanEnv(env.COMMENT_TRANSLATOR_PAID_OPENAI_ENABLED),
    azure_fallback_enabled: readBooleanEnv(env.COMMENT_TRANSLATOR_PAID_AZURE_FALLBACK_ENABLED)
  };
  return Object.values(values).some((value) => value === null)
    ? null
    : values as CommentTranslatorPaidProviderKillSwitches;
}

function isCurrentPaidEntitlement(entitlement: CommentTranslatorPaidEntitlement, ownerUserId: string, nowMs: number): boolean {
  if (entitlement.ownerUserId !== ownerUserId) return false;
  if (entitlement.status !== "active" && entitlement.status !== "cancel_at_period_end") return false;
  if (entitlement.disputeState !== "none") return false;
  const startMs = entitlement.currentPeriodStartIso ? Date.parse(entitlement.currentPeriodStartIso) : NaN;
  const endMs = entitlement.currentPeriodEndIso ? Date.parse(entitlement.currentPeriodEndIso) : NaN;
  return Number.isFinite(startMs) && Number.isFinite(endMs) && startMs <= nowMs && nowMs < endMs;
}

function readNonEmptyEnv(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized || null;
}

function readBooleanEnv(value: string | undefined): boolean | null {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return null;
}

function dayBucket(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

function monthBucketIso(nowMs: number): string {
  return `${dayBucket(nowMs).slice(0, 7)}-01`;
}

function utcDayEndIso(nowMs: number): string {
  const date = new Date(nowMs);
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
  return next.toISOString();
}

function nextUtcMinuteIso(nowMs: number): string {
  const date = new Date(nowMs);
  const next = new Date(date);
  next.setUTCSeconds(0, 0);
  next.setUTCMinutes(next.getUTCMinutes() + 1);
  return next.toISOString();
}

export function resolveCommentTranslatorPaidStopNextResetAtIso({
  reason,
  paidSessionAuthority,
  nowMs
}: {
  readonly reason: CommentTranslatorSessionStopReason;
  readonly paidSessionAuthority?: Pick<CommentTranslatorPaidSessionAuthoritySnapshot, "entitlement"> | null;
  readonly nowMs: number;
}): string | undefined {
  if (reason === "paid-character-quota-stop" || reason === "paid-individual-cost-stop") {
    return paidSessionAuthority?.entitlement.currentPeriodEndIso ?? utcDayEndIso(nowMs);
  }
  if (reason === "paid-global-cost-stop") {
    return nextUtcMonthIso(nowMs);
  }
  if (reason === "translated-message-cap") {
    return nextUtcMinuteIso(nowMs);
  }
  return undefined;
}

function nextUtcMonthIso(nowMs: number): string {
  const date = new Date(nowMs);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)).toISOString();
}
