import "server-only";

import {
  readCommentTranslatorBillingEntitlementSnapshot,
  type CommentTranslatorStripeEnv
} from "./comment-translator-billing-runtime";
import type { CommentTranslatorPaidEntitlementStore } from "./comment-translator-paid-entitlement-store";
import {
  readCommentTranslatorPaidUsageOrFailClosed,
  recordCommentTranslatorPaidUsageOrFailClosed
} from "./comment-translator-paid-usage-runtime";
import type { CommentTranslatorPaidUsageCounterStoreFactoryResult } from "./comment-translator-paid-usage-types";
import {
  executeCommentTranslatorProviderPolicyBatch,
  type CommentTranslatorProviderExecutionCache,
  type CommentTranslatorProviderExecutionResult,
  type CommentTranslatorProviderExecutionTranslation
} from "./comment-translator-provider-execution-runtime";
import {
  createCommentTranslatorDefaultTranslationProviderSet,
  type CommentTranslatorTranslationProviderSet
} from "./comment-translator-provider-policy-runtime";
import type { CommentTranslatorUsageLedgerSnapshot } from "./comment-translator-usage-ledger-runtime";
import type { YouTubeOAuthCredentialStatusCallerAuthorization } from "./comment-translator-youtube-credential-status-boundary";
import type { YouTubeProviderSafeCommentPayload } from "./comment-translator-youtube-input-boundary";

export type CommentTranslatorCreatorPaidProviderRouteRequest = {
  readonly callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  readonly entitlementStore?: CommentTranslatorPaidEntitlementStore;
  readonly paidUsageCounterStore?: CommentTranslatorPaidUsageCounterStoreFactoryResult;
  readonly env?: CommentTranslatorStripeEnv;
  readonly usage: CommentTranslatorUsageLedgerSnapshot;
  readonly comments: readonly YouTubeProviderSafeCommentPayload[];
  readonly sessionReferenceId: string;
  readonly occurredAtMs: number;
  readonly targetLanguage: string;
  readonly sourceLanguages?: readonly string[];
  readonly providers?: CommentTranslatorTranslationProviderSet;
  readonly cache?: CommentTranslatorProviderExecutionCache;
  readonly maxBatchSize?: number;
  readonly maxProviderAttemptsPerComment?: number;
};

type SanitizedPaidTranslation = Omit<CommentTranslatorProviderExecutionTranslation, "commentReferenceId">;

type SanitizedPaidExecution = Pick<
  CommentTranslatorProviderExecutionResult,
  | "status"
  | "providerRequestCount"
  | "providerCallCount"
  | "translatedCount"
  | "skippedCount"
  | "cacheHitCount"
  | "cacheMissCount"
  | "retryCount"
  | "skipsByReason"
  | "errorCounts"
  | "terminalErrorCodeCounts"
  | "usageRecorded"
  | "providerRouting"
  | "fallbackReasonCounts"
  | "estimatedCostMicros"
  | "browserStorage"
  | "handoffPayload"
  | "providerTargetMetadata"
  | "rawCommentText"
> & {
  readonly translations: readonly SanitizedPaidTranslation[];
};

export type CommentTranslatorCreatorPaidProviderRouteResult =
  | {
      readonly status: "completed";
      readonly plan: "paid";
      readonly billingState: "paid-active";
      readonly paidUsageAccounting: "recorded" | "ignored-replay" | "not-run-no-provider-executed-translation";
      readonly execution: SanitizedPaidExecution;
      readonly providerIdentifiers: "server-only-not-returned";
      readonly privateAuthorityReferences: "never-returned-by-design";
    }
  | {
      readonly status: "paid-provider-unavailable";
      readonly plan: "free";
      readonly billingState: "paid-inactive";
      readonly reason:
        | "paid-authority-unavailable"
        | "paid-provider-policy-unavailable"
        | "paid-provider-budget-stop"
        | "paid-provider-unavailable"
        | "paid-usage-accounting-unavailable";
      readonly providerCallCount: 0;
      readonly providerIdentifiers: "server-only-not-returned";
      readonly privateAuthorityReferences: "never-returned-by-design";
    };

export const commentTranslatorCreatorPaidProviderRouteContract = {
  implementationStage: "creator-closed-beta-c4-paid-provider-route",
  runtime: "server-only",
  paidAuthority: "authenticated-c2-allowlisted-c1-signed-entitlement-c3-current-period",
  paidPrimary: "environment-selected-openai-mini",
  paidFallback: "azure-recoverable-only-when-configured-and-under-budget",
  budgetAuthority: "server-env-policy-and-c3-current-period-counters",
  paidUsageAccounting: "c3-atomic-deduplicated-server-only-boundary",
  outputParsing: "strict-structured-output-only",
  browserReadableOutput: "sanitized-no-private-authority-references",
  liveProviderExecution: "not-run-in-c4-local-verification"
} as const;

export async function executeCommentTranslatorCreatorPaidProviderRoute(
  request: CommentTranslatorCreatorPaidProviderRouteRequest
): Promise<CommentTranslatorCreatorPaidProviderRouteResult> {
  const env = request.env ?? process.env;
  const billing = await readCommentTranslatorBillingEntitlementSnapshot({
    callerAuthorization: request.callerAuthorization,
    entitlementStore: request.entitlementStore,
    env,
    nowMs: request.occurredAtMs
  });
  if (billing.plan !== "paid" || billing.billingState !== "paid-active") {
    return unavailable("paid-authority-unavailable");
  }

  const paidUsage = await readCommentTranslatorPaidUsageOrFailClosed({
    callerAuthorization: request.callerAuthorization,
    entitlementStore: request.entitlementStore,
    paidUsageCounterStore: request.paidUsageCounterStore,
    env,
    nowMs: request.occurredAtMs
  });
  if (paidUsage.status !== "ready") {
    return unavailable("paid-authority-unavailable");
  }

  const budget = readPaidProviderBudgetPolicy(env);
  if (!isOpenAIMiniPolicyConfigured(env) || !budget) {
    return unavailable("paid-provider-policy-unavailable");
  }
  if (
    !request.usage.providerBudgetAvailable ||
    !request.usage.globalBudgetAvailable ||
    !request.usage.aiBudgetAvailable ||
    !request.usage.translationProviderAvailable ||
    paidUsage.usage.estimatedCostMicros >= budget.hardStopMicros
  ) {
    return unavailable("paid-provider-budget-stop");
  }

  const configuredProviders = request.providers ?? createCommentTranslatorDefaultTranslationProviderSet(env);
  if (!configuredProviders.openAiMini) {
    return unavailable("paid-provider-unavailable");
  }
  const providers = {
    openAiMini: configuredProviders.openAiMini,
    azure: canUseAzureFallback(env, paidUsage.usage.providerInputCharacterCount) ? configuredProviders.azure : null
  } satisfies CommentTranslatorTranslationProviderSet;
  const execution = await executeCommentTranslatorProviderPolicyBatch({
    providers,
    cache: request.cache,
    callerAuthorization: request.callerAuthorization,
    sessionReferenceId: request.sessionReferenceId,
    occurredAtMs: request.occurredAtMs,
    usage: {
      ...request.usage,
      monthlyProviderInputCharacterEstimate: paidUsage.usage.providerInputCharacterCount,
      planEntitlement: billing.planEntitlement
    },
    targetLanguage: request.targetLanguage,
    sourceLanguages: request.sourceLanguages,
    maxBatchSize: request.maxBatchSize,
    maxProviderAttemptsPerComment: request.maxProviderAttemptsPerComment,
    comments: request.comments
  });
  const providerExecutedTranslations = execution.translations.filter((translation) => translation.cacheOutcome !== "hit");
  if (providerExecutedTranslations.length === 0) {
    return completed(execution, "not-run-no-provider-executed-translation");
  }

  const accounting = await recordCommentTranslatorPaidUsageOrFailClosed({
    callerAuthorization: request.callerAuthorization,
    entitlementStore: request.entitlementStore,
    paidUsageCounterStore: request.paidUsageCounterStore,
    env,
    nowMs: request.occurredAtMs,
    event: {
      type: "ai-usage-estimated",
      provider: "youtube",
      sessionReferenceId: request.sessionReferenceId,
      occurredAtMs: request.occurredAtMs,
      translatedMessageEstimate: providerExecutedTranslations.length,
      providerInputCharacterEstimate: sum(providerExecutedTranslations, "providerInputCharacterEstimate"),
      translatedCharacterEstimate: sum(providerExecutedTranslations, "translatedCharacterEstimate"),
      estimatedCostMicros: sum(providerExecutedTranslations, "estimatedCostMicros"),
      rawCommentText: "never-recorded-by-design"
    }
  });
  if (accounting.status !== "recorded" && accounting.status !== "ignored-replay") {
    return unavailable("paid-usage-accounting-unavailable");
  }
  return completed(execution, accounting.status);
}

function readPaidProviderBudgetPolicy(env: CommentTranslatorStripeEnv): { readonly hardStopMicros: number } | null {
  const monthlyBudgetUsd = Number(env.COMMENT_TRANSLATOR_TRANSLATION_MONTHLY_BUDGET_USD);
  const softStopRatio = Number(env.COMMENT_TRANSLATOR_TRANSLATION_BUDGET_SOFT_STOP_RATIO);
  const hardStopRatio = Number(env.COMMENT_TRANSLATOR_TRANSLATION_BUDGET_HARD_STOP_RATIO);
  const monthlyBudgetMicros = Math.floor(monthlyBudgetUsd * 1_000_000);
  if (
    !Number.isSafeInteger(monthlyBudgetMicros) || monthlyBudgetMicros <= 0 ||
    !Number.isFinite(softStopRatio) || softStopRatio <= 0 ||
    !Number.isFinite(hardStopRatio) || hardStopRatio <= softStopRatio || hardStopRatio > 1
  ) {
    return null;
  }
  return { hardStopMicros: Math.floor(monthlyBudgetMicros * hardStopRatio) };
}

function isOpenAIMiniPolicyConfigured(env: CommentTranslatorStripeEnv): boolean {
  return env.COMMENT_TRANSLATOR_PAID_TRANSLATION_PROVIDER?.trim() === "openai-mini" &&
    Boolean(env.OPENAI_API_KEY?.trim()) && Boolean(env.OPENAI_TRANSLATION_MODEL?.trim());
}

function canUseAzureFallback(env: CommentTranslatorStripeEnv, currentProviderInputCharacters: number): boolean {
  const cap = Number(env.COMMENT_TRANSLATOR_AZURE_MONTHLY_CHARACTER_CAP);
  return Boolean(env.AZURE_TRANSLATOR_KEY?.trim()) && Boolean(env.AZURE_TRANSLATOR_ENDPOINT?.trim()) &&
    Boolean(env.AZURE_TRANSLATOR_REGION?.trim()) && Number.isSafeInteger(cap) && cap > currentProviderInputCharacters;
}

function sum(
  translations: readonly CommentTranslatorProviderExecutionTranslation[],
  field: "providerInputCharacterEstimate" | "translatedCharacterEstimate" | "estimatedCostMicros"
): number {
  return translations.reduce((total, translation) => total + Math.max(0, translation[field]), 0);
}

function completed(
  execution: CommentTranslatorProviderExecutionResult,
  paidUsageAccounting: Extract<CommentTranslatorCreatorPaidProviderRouteResult, { status: "completed" }>["paidUsageAccounting"]
): CommentTranslatorCreatorPaidProviderRouteResult {
  return {
    status: "completed",
    plan: "paid",
    billingState: "paid-active",
    paidUsageAccounting,
    execution: {
      ...execution,
      translations: execution.translations.map(({ commentReferenceId: _privateReference, ...translation }) => translation)
    },
    providerIdentifiers: "server-only-not-returned",
    privateAuthorityReferences: "never-returned-by-design"
  };
}

function unavailable(
  reason: Extract<CommentTranslatorCreatorPaidProviderRouteResult, { status: "paid-provider-unavailable" }>["reason"]
): CommentTranslatorCreatorPaidProviderRouteResult {
  return {
    status: "paid-provider-unavailable",
    plan: "free",
    billingState: "paid-inactive",
    reason,
    providerCallCount: 0,
    providerIdentifiers: "server-only-not-returned",
    privateAuthorityReferences: "never-returned-by-design"
  };
}
