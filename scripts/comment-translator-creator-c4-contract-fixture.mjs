import assert from "node:assert/strict";
import { createHash } from "node:crypto";

export const nowMs = Date.parse("2026-07-22T06:00:00.000Z");
export const ownerUserId = "private-c4-owner-fixture";
export const callerAuthorization = { status: "authorized", ownerUserId };
const allowedOwnerHash = createHash("sha256").update(ownerUserId).digest("hex");

export const configuredEnv = {
  COMMENT_TRANSLATOR_PRIVATE_LAUNCH_ALLOWED_USER_HASHES: allowedOwnerHash,
  COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_BILLING_ACCESS: "enabled-reviewed",
  COMMENT_TRANSLATOR_PAID_TRANSLATION_PROVIDER: "openai-mini",
  COMMENT_TRANSLATOR_TRANSLATION_MONTHLY_BUDGET_USD: "25",
  COMMENT_TRANSLATOR_TRANSLATION_BUDGET_SOFT_STOP_RATIO: "0.70",
  COMMENT_TRANSLATOR_TRANSLATION_BUDGET_HARD_STOP_RATIO: "0.85",
  COMMENT_TRANSLATOR_AZURE_MONTHLY_CHARACTER_CAP: "2000000",
  OPENAI_API_KEY: "test-only-present",
  OPENAI_TRANSLATION_MODEL: "operator-selected-test-model",
  AZURE_TRANSLATOR_KEY: "test-only-present",
  AZURE_TRANSLATOR_ENDPOINT: "https://azure.example.test",
  AZURE_TRANSLATOR_REGION: "test-region"
};

export function createUsage() {
  return {
    dailyUsedMs: 0,
    currentSessionElapsedMs: 1_000,
    translatedMessagesInCurrentMinute: 0,
    translatedMessageCapacityAvailableAtMs: null,
    monthlyProviderInputCharacterEstimate: 0,
    providerBudgetAvailable: true,
    globalBudgetAvailable: true,
    aiBudgetAvailable: true,
    translationProviderAvailable: true,
    planEntitlement: {
      plan: "free",
      planEntitlementReferenceId: "browser-plan-must-not-be-authority",
      entitlementSource: "server-owned",
      dailyLimitMs: 1,
      sessionLimitMs: 1,
      translatedMessagesPerMinute: 1,
      activeSessionsPerUser: 1,
      paidPrioritization: "not-implemented",
      providerUsageCharging: "not-implemented"
    },
    providerRequestEstimate: {
      requestEstimateCount: 0,
      quotaUnitEstimate: 0,
      providerTargetMetadata: "forbidden"
    },
    aiUsageEstimate: {
      translatedMessageEstimate: 0,
      providerInputCharacterEstimate: 0,
      translatedCharacterEstimate: 0,
      estimatedCostMicros: 0,
      rawCommentText: "never-recorded-by-design"
    }
  };
}

export async function createAuthority({ billing, entitlementStores, paidUsageStores }, overrides = {}) {
  const entitlementStore = entitlementStores.createInMemoryCommentTranslatorPaidEntitlementStoreForTests();
  const paidUsageCounterStore = paidUsageStores.createInMemoryCommentTranslatorPaidUsageStoreForTests();
  const billingUserReferenceId = billing.createCommentTranslatorBillingUserReference(callerAuthorization);
  assert.ok(billingUserReferenceId);
  await entitlementStore.persistVerifiedBillingEvidence({
    evidenceSource: "signed-stripe-webhook",
    evidenceEventReferenceId: "private-signed-event-fixture",
    evidenceCreatedAtIso: "2026-07-22T05:00:00.000Z",
    billingUserReferenceId,
    customerReferenceId: "private-customer-fixture",
    subscriptionReferenceId: "private-subscription-fixture",
    subscriptionStatus: "active",
    billingState: "paid-active",
    currentPeriodEndIso: "2026-08-22T00:00:00.000Z",
    ...overrides
  });
  const entitlement = await entitlementStore.readByBillingUserReference(billingUserReferenceId);
  assert.ok(entitlement);
  paidUsageCounterStore.syncFromEntitlement(entitlement);
  return {
    entitlementStore,
    paidUsageCounterStore: { status: "ready", store: paidUsageCounterStore, missingEnvReferences: [] }
  };
}

export function createProvider(id, translate) {
  return {
    id,
    name: "server-only test provider",
    runtimeScope: "server-runtime-only",
    secretBoundary: {
      runtime: "server-env-only",
      clientBundle: "forbidden",
      fixtures: "forbidden",
      docsAndTaskNotes: "no-secret-values"
    },
    translate
  };
}

export function createRequest(authority, providers, overrides = {}) {
  return {
    callerAuthorization,
    entitlementStore: authority.entitlementStore,
    paidUsageCounterStore: authority.paidUsageCounterStore,
    env: configuredEnv,
    usage: createUsage(),
    comments: [{
      commentId: "private-comment-reference",
      publishedAt: "2026-07-22T05:59:59.000Z",
      text: "Hello live chat",
      platformLanguageHint: "en",
      authorDisplayName: null
    }],
    sessionReferenceId: "private-session-reference",
    occurredAtMs: nowMs,
    targetLanguage: "ja",
    sourceLanguages: ["en"],
    maxProviderAttemptsPerComment: 2,
    providers,
    ...overrides
  };
}
