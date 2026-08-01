import "server-only";

import type {
  CommentTranslationProvider,
  CommentTranslationProviderRecoverableError,
  CommentTranslationProviderRequest,
  CommentTranslationProviderResult
} from "./comment-translator-provider-boundary";
import type {
  CommentTranslatorCreatorPaidProviderRequest,
  CommentTranslatorCreatorPaidProviderResult,
  CommentTranslatorCreatorPaidProviderRuntimeDependencies,
  CreatorPaidBudgetAuthorization,
  CreatorPaidProviderFailureReason
} from "./comment-translator-creator-paid-provider-types";
import type { CachedCommentTranslation } from "./comment-translator-provider-execution-runtime";

export type { CommentTranslatorCreatorPaidProviderResult } from "./comment-translator-creator-paid-provider-types";

export const commentTranslatorCreatorPaidProviderRuntimeContract = {
  implementationStage: "nc-p1-local-paid-provider-route",
  runtime: "server-only",
  entitlementAuthority: "nc-e1-paid-provider-authorization",
  budgetAuthority: "server-owned-pre-provider-authorization",
  providerPolicy: "openai-mini-primary-approved-azure-fallback",
  approvedRecoverableFallbackCodes: ["temporary-unavailable", "rate-limited", "timeout"],
  strictOutputParsing: "existing-openai-strict-json-policy",
  timeout: "bounded-abort-signal",
  glossaryProjection: "term-and-replacement-only-note-forbidden",
  cacheIdentity: "effective-glossary-version",
  cacheHitAccounting: "cache-hit-not-counted",
  providerSuccess: "provider-success-accounting-committed",
  productionActivation: "fixed-closed",
  productionRouteWiring: "disconnected",
  freeBehavior: "unchanged"
} as const;

const approvedRecoverableFallbackCodes = new Set<CommentTranslationProviderRecoverableError["code"]>([
  "temporary-unavailable",
  "rate-limited",
  "timeout"
]);

export function createCommentTranslatorCreatorPaidProviderRuntime({
  entitlementAuthorizer,
  budgetAuthorizer,
  glossaryRuntime,
  usageRuntime,
  providerRequestFactory,
  providers,
  cache,
  timeoutMs
}: CommentTranslatorCreatorPaidProviderRuntimeDependencies) {
  return {
    async execute({ callerAuthority, comment, targetLanguage, sourceLanguages }: CommentTranslatorCreatorPaidProviderRequest): Promise<CommentTranslatorCreatorPaidProviderResult> {
      const authorization = await entitlementAuthorizer.authorize(callerAuthority);
      if (authorization.status !== "ready") return failClosed(authorization.reason, "not-started");

      const primaryProvider = providers.openAiMini;
      const fallbackProvider = isConfiguredProvider(providers.azure, "azure-translator") ? providers.azure : null;
      if (!isConfiguredProvider(primaryProvider, "openai-mini")) {
        return failClosed("provider-config-missing", "not-started");
      }
      if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
        return failClosed("provider-config-missing", "not-started");
      }

      const glossary = await glossaryRuntime.resolveProviderContext({ callerAuthority, targetLanguage });
      if (glossary.status !== "ready" || !glossary.glossaryVersion) {
        return failClosed("glossary-unavailable", "not-started");
      }

      const requestResult = providerRequestFactory({
        comment,
        targetLanguage,
        ...(sourceLanguages ? { sourceLanguages } : {}),
        glossaryTerms: glossary.glossaryTerms,
        glossaryVersion: glossary.glossaryVersion
      });
      if (requestResult.status !== "ready") return failClosed("provider-request-rejected", "not-started");
      const providerRequest = requestResult.providerRequest;
      if (
        providerRequest.glossary.version !== glossary.glossaryVersion ||
        providerRequest.cache.keyMaterial.glossaryVersion !== glossary.glossaryVersion
      ) {
        return failClosed("provider-request-rejected", "not-started");
      }

      let budget: CreatorPaidBudgetAuthorization;
      try {
        budget = await budgetAuthorizer.authorize({
          ownerUserId: authorization.callerAuthority.ownerUserId,
          entitlement: authorization.entitlementRead.entitlement,
          providerInputCharacterCount: countCharacters(providerRequest.input.text)
        });
      } catch (error) {
        if (error instanceof Error) return failClosed("budget-unavailable", "not-started");
        return failClosed("budget-unavailable", "not-started");
      }
      if (budget.status === "blocked") {
        return failClosed(budget.reason === "over-limit" ? "budget-over-limit" : "budget-unavailable", "not-started");
      }

      const lookupKey = providerRequest.cache.lookupKey;
      const cached = lookupKey ? cache.read(lookupKey) : null;
      if (cached) {
        const accounting = await usageRuntime.account({
          callerAuthority: authorization.callerAuthority,
          entitlementRead: authorization.entitlementRead,
          execution: { status: "cache-hit" }
        });
        if (accounting.status !== "not-counted" || accounting.reason !== "cache-hit") {
          return failClosed("accounting-unavailable", "not-started");
        }
        return successFromCache(cached);
      }

      let providerResult = await executeBoundedProvider(primaryProvider, providerRequest, timeoutMs);
      if (
        providerResult.type === "recoverable-error" &&
        approvedRecoverableFallbackCodes.has(providerResult.code) &&
        fallbackProvider
      ) {
        providerResult = await executeBoundedProvider(fallbackProvider, providerRequest, timeoutMs);
      }
      if (providerResult.type !== "translated") {
        return failClosed(readProviderFailureReason(providerResult), "failed");
      }

      const accounting = await usageRuntime.account({
        callerAuthority: authorization.callerAuthority,
        entitlementRead: authorization.entitlementRead,
        execution: {
          status: "provider-executed",
          usageEventReference: `creator-paid-provider:${crypto.randomUUID()}`,
          providerInputCharacterCount: countCharacters(providerRequest.input.text),
          translatedCharacterCount: countCharacters(providerResult.translatedText)
        }
      });
      if (accounting.status !== "recorded") {
        return failClosed("accounting-unavailable", "succeeded-accounting-failed");
      }

      if (lookupKey) {
        cache.write(lookupKey, {
          translatedText: providerResult.translatedText,
          detectedSourceLanguage: providerResult.detectedSourceLanguage,
          confidence: providerResult.confidence
        });
      }
      return {
        status: "success",
        source: "provider",
        translatedText: providerResult.translatedText,
        detectedSourceLanguage: providerResult.detectedSourceLanguage,
        confidence: providerResult.confidence,
        accounting: "provider-success-accounting-committed",
        counts: accounting.counts,
        browserSafe: true
      };
    }
  };
}

async function executeBoundedProvider(
  provider: CommentTranslationProvider,
  providerRequest: CommentTranslationProviderRequest,
  timeoutMs: number
): Promise<CommentTranslationProviderResult> {
  const abortController = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutResult = new Promise<CommentTranslationProviderRecoverableError>((resolve) => {
    timeoutId = setTimeout(() => {
      abortController.abort();
      resolve({
        type: "recoverable-error",
        code: "timeout",
        message: "Translation provider timed out.",
        retry: { retryable: true, retryAfterMs: null, fallbackToOriginal: true },
        usageHandoff: providerRequest.usageHandoff
      });
    }, timeoutMs);
  });
  try {
    return await Promise.race([
      provider.translate({ ...providerRequest, signal: abortController.signal }),
      timeoutResult
    ]);
  } catch (error) {
    if (error instanceof Error) {
      return {
        type: "terminal-error",
        code: "policy-blocked",
        message: "Translation provider execution failed closed.",
        retry: { retryable: false }
      };
    }
    return {
      type: "terminal-error",
      code: "policy-blocked",
      message: "Translation provider execution failed closed.",
      retry: { retryable: false }
    };
  } finally {
    if (timeoutId !== null) clearTimeout(timeoutId);
  }
}

function readProviderFailureReason(result: Exclude<CommentTranslationProviderResult, { readonly type: "translated" }>): CreatorPaidProviderFailureReason {
  if (result.type === "terminal-error") return "provider-terminal";
  return result.code === "timeout" ? "provider-timeout" : "provider-recoverable";
}

function successFromCache(cached: CachedCommentTranslation): CommentTranslatorCreatorPaidProviderResult {
  return {
    status: "success",
    source: "cache",
    translatedText: cached.translatedText,
    detectedSourceLanguage: cached.detectedSourceLanguage,
    confidence: cached.confidence,
    accounting: "cache-hit-not-counted",
    counts: null,
    browserSafe: true
  };
}

function failClosed(
  reason: CreatorPaidProviderFailureReason,
  providerExecution: "not-started" | "failed" | "succeeded-accounting-failed"
): CommentTranslatorCreatorPaidProviderResult {
  return { status: "fail-closed", reason, providerExecution, translatedText: null, accounting: "not-committed", browserSafe: true };
}

function isConfiguredProvider(
  provider: CommentTranslationProvider | null | undefined,
  expectedProviderId: "openai-mini" | "azure-translator"
): provider is CommentTranslationProvider {
  return Boolean(
    provider && provider.id === expectedProviderId && provider.configurationStatus === "ready" && provider.runtimeScope === "server-runtime-only" && provider.secretBoundary.runtime === "server-env-only" &&
    provider.secretBoundary.clientBundle === "forbidden" && provider.secretBoundary.fixtures === "forbidden" &&
    provider.secretBoundary.docsAndTaskNotes === "no-secret-values"
  );
}

function countCharacters(value: string): number {
  return Array.from(value).length;
}
