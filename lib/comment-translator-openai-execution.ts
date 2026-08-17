import "server-only";

import type {
  CommentTranslationProvider,
  CommentTranslationProviderRequest,
  CommentTranslationProviderResult,
  CommentTranslationUsageHandoff,
  CommentTranslationProviderSecretBoundary
} from "./comment-translator-provider-boundary";

/**
 * Task 6's provider adapter is deliberately independent from the session and
 * billing orchestration. The caller owns the reservation boundary; this file
 * owns only the sanitized request/response boundary and the HTTP result
 * classification.
 */
export const commentTranslatorOpenAiExecutionContract = {
  implementationStage: "comment-translator-paid-v1-task6-openai-adapter",
  runtime: "server-only",
  model: "gpt-4o-mini",
  storage: "store-false",
  responseFormat: "strict-json-schema",
  maxItems: 15,
  maxInputCodePoints: 7_500,
  maxInputItemCodePoints: 500,
  maxOutputItemCodePoints: 1_000,
  outputTokensPerItem: 128,
  fixedRequestTokenEnvelope: 384,
  requestTimeoutMs: 20_000,
  maxAdditionalWaitMs: 250,
  inputBoundary: "attempt-id-text-source-language-target-language-only",
  forbiddenInput: "author-youtube-private-metadata-secrets-glossary",
  retry: "unresolved-subset-only-at-most-once",
  successfulItemRetry: "forbidden",
  rawProviderMaterial: "never-returned-or-logged",
  fallbackClasses: ["network", "timeout", "408", "504", "500", "503", "429"],
  excludedFallbackClasses: [
    "authentication",
    "configuration",
    "quota",
    "cost",
    "policy",
    "invalid-request",
    "unsupported"
  ]
} as const;

export const commentTranslatorOpenAiModel = "gpt-4o-mini" as const;
export const commentTranslatorOpenAiRequestTimeoutMs = 20_000;
export const commentTranslatorOpenAiMaxAdditionalWaitMs = 250;
export const commentTranslatorOpenAiMaxItems = 15;
export const commentTranslatorOpenAiMaxInputCodePoints = 7_500;
export const commentTranslatorOpenAiMaxInputItemCodePoints = 500;
export const commentTranslatorOpenAiMaxOutputItemCodePoints = 1_000;
export const commentTranslatorOpenAiOutputTokensPerItem = 128;
export const commentTranslatorOpenAiFixedRequestTokenEnvelope = 384;
export const commentTranslatorOpenAiInputPricePerMillionTokens = 0.15;
export const commentTranslatorOpenAiOutputPricePerMillionTokens = 0.6;

export type CommentTranslatorOpenAiProviderFailureClass =
  | "network"
  | "timeout"
  | "rate-limit"
  | "server-error"
  | "authentication"
  | "configuration"
  | "quota"
  | "cost"
  | "policy"
  | "invalid-response"
  | "invalid-request"
  | "unsupported";

export type CommentTranslatorOpenAiBatchItem = {
  attemptId: string;
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
};

export type CommentTranslatorOpenAiBatchValidation =
  | {
      status: "valid";
      itemCount: number;
      inputCodePoints: number;
      languagePair: { sourceLanguage: string; targetLanguage: string };
    }
  | {
      status: "invalid";
      reason:
        | "empty-batch"
        | "too-many-items"
        | "duplicate-attempt-id"
        | "empty-text"
        | "item-too-long"
        | "batch-too-long"
        | "mixed-language-pair";
    };

export type CommentTranslatorOpenAiRequestBody = {
  model: typeof commentTranslatorOpenAiModel;
  store: false;
  messages: readonly [
    { role: "system"; content: string },
    { role: "user"; content: string }
  ];
  response_format: {
    type: "json_schema";
    json_schema: {
      name: "comment_translation_batch";
      strict: true;
      schema: Record<string, unknown>;
    };
  };
  max_completion_tokens: number;
};

export type CommentTranslatorOpenAiTranslatedItem = {
  attemptId: string;
  translatedText: string;
};

export type CommentTranslatorOpenAiParsedResponse =
  | {
      status: "complete" | "subset-retry";
      items: readonly CommentTranslatorOpenAiTranslatedItem[];
      successfulAttemptIds: readonly string[];
      retryAttemptIds: readonly string[];
      inputUsageTokens: number;
      outputUsageTokens: number;
    }
  | {
      status: "policy-rejected" | "invalid-response";
      failureClass: "policy" | "invalid-response";
      successfulAttemptIds: readonly string[];
      retryAttemptIds: readonly string[];
      inputUsageTokens: number;
      outputUsageTokens: number;
    };

export type CommentTranslatorOpenAiExecutionResult =
  | {
      status: "completed";
      items: readonly CommentTranslatorOpenAiTranslatedItem[];
      providerCallCount: number;
      subsetRetryCount: number;
      inputCodePoints: number;
      inputTokens: number;
      outputTokens: number;
      estimatedCostMicros: number;
      retryAttemptIds: readonly [];
      successfulAttemptIds?: readonly string[];
      providerFailureClass: null;
      fallbackEligible: false;
      uncertainInflight: false;
      providerReached: true;
    }
  | {
      status: "failed";
      items: readonly CommentTranslatorOpenAiTranslatedItem[];
      providerCallCount: number;
      subsetRetryCount: number;
      inputCodePoints: number;
      inputTokens: number;
      outputTokens: number;
      estimatedCostMicros: number;
      retryAttemptIds: readonly string[];
      successfulAttemptIds?: readonly string[];
      providerFailureClass: CommentTranslatorOpenAiProviderFailureClass;
      fallbackEligible: boolean;
      uncertainInflight: boolean;
      providerReached: boolean;
      httpStatus: number | null;
      preflightDecision?: CommentTranslatorOpenAiProviderPreflightDecision;
    };

export type CommentTranslatorOpenAiFetchResponse = {
  ok: boolean;
  status: number;
  headers?: { get(name: string): string | null };
  json(): Promise<unknown>;
};

export type CommentTranslatorOpenAiFetch = (
  url: string,
  init: RequestInit
) => Promise<CommentTranslatorOpenAiFetchResponse>;

export type CommentTranslatorOpenAiProviderPreflightDecision =
  | "allow"
  | "circuit-unavailable"
  | "authority-unreadable"
  | "kill-switch";

export type ExecuteCommentTranslatorOpenAiBatchRequest = {
  apiKey: string | null | undefined;
  endpoint?: string | null;
  items: readonly CommentTranslatorOpenAiBatchItem[];
  fetchImpl?: CommentTranslatorOpenAiFetch;
  requestTimeoutMs?: number;
  maxSubsetRetries?: number;
  maxHttpRetries?: number;
  beforeProviderCall?: () => Promise<CommentTranslatorOpenAiProviderPreflightDecision>;
};

export type CommentTranslatorOpenAiProviderConfig = {
  apiKey: string | null | undefined;
  endpoint?: string | null;
  fetchImpl?: CommentTranslatorOpenAiFetch;
};

const defaultEndpoint = "https://api.openai.com/v1/chat/completions";
const fallbackHttpStatuses = new Set([408, 500, 503, 504]);

export function countCommentTranslatorOpenAiCodePoints(value: string): number {
  return Array.from(value).length;
}

export function validateCommentTranslatorOpenAiBatchItems(
  items: readonly CommentTranslatorOpenAiBatchItem[]
): CommentTranslatorOpenAiBatchValidation {
  if (items.length === 0) return { status: "invalid", reason: "empty-batch" };
  if (items.length > commentTranslatorOpenAiMaxItems) {
    return { status: "invalid", reason: "too-many-items" };
  }

  const attemptIds = new Set<string>();
  let inputCodePoints = 0;
  let sourceLanguage: string | null = null;
  let targetLanguage: string | null = null;
  for (const item of items) {
    if (!item.attemptId || attemptIds.has(item.attemptId)) {
      return { status: "invalid", reason: "duplicate-attempt-id" };
    }
    attemptIds.add(item.attemptId);
    const text = item.text.trim();
    const itemCodePoints = countCommentTranslatorOpenAiCodePoints(text);
    if (itemCodePoints === 0) return { status: "invalid", reason: "empty-text" };
    if (itemCodePoints > commentTranslatorOpenAiMaxInputItemCodePoints) {
      return { status: "invalid", reason: "item-too-long" };
    }
    inputCodePoints += itemCodePoints;
    if (inputCodePoints > commentTranslatorOpenAiMaxInputCodePoints) {
      return { status: "invalid", reason: "batch-too-long" };
    }

    const normalizedSourceLanguage = item.sourceLanguage.trim().toLocaleLowerCase();
    const normalizedTargetLanguage = item.targetLanguage.trim().toLocaleLowerCase();
    if (!normalizedSourceLanguage || !normalizedTargetLanguage) {
      return { status: "invalid", reason: "mixed-language-pair" };
    }
    if (sourceLanguage === null) sourceLanguage = normalizedSourceLanguage;
    if (targetLanguage === null) targetLanguage = normalizedTargetLanguage;
    if (sourceLanguage !== normalizedSourceLanguage || targetLanguage !== normalizedTargetLanguage) {
      return { status: "invalid", reason: "mixed-language-pair" };
    }
  }

  return {
    status: "valid",
    itemCount: items.length,
    inputCodePoints,
    languagePair: {
      sourceLanguage: sourceLanguage ?? "auto",
      targetLanguage: targetLanguage ?? ""
    }
  };
}

export function estimateCommentTranslatorOpenAiBatchTokens({
  inputCodePoints,
  itemCount
}: {
  inputCodePoints: number;
  itemCount: number;
}): { inputTokens: number; outputTokens: number; requestTokenLimit: number; estimatedCostMicros: number } {
  const inputTokens = 400 + inputCodePoints * 4;
  const outputTokens = itemCount * commentTranslatorOpenAiOutputTokensPerItem + commentTranslatorOpenAiFixedRequestTokenEnvelope;
  const estimatedCostMicros = Math.max(
    1,
    Math.ceil(
      inputTokens * commentTranslatorOpenAiInputPricePerMillionTokens
        + outputTokens * commentTranslatorOpenAiOutputPricePerMillionTokens
    )
  );
  return {
    inputTokens,
    outputTokens,
    requestTokenLimit: outputTokens,
    estimatedCostMicros
  };
}

export function buildCommentTranslatorOpenAiRequestBody(
  items: readonly CommentTranslatorOpenAiBatchItem[]
): CommentTranslatorOpenAiRequestBody {
  const validation = validateCommentTranslatorOpenAiBatchItems(items);
  if (validation.status !== "valid") {
    throw new Error("OpenAI batch input does not satisfy the Paid translation contract.");
  }

  const tokenEstimate = estimateCommentTranslatorOpenAiBatchTokens({
    inputCodePoints: validation.inputCodePoints,
    itemCount: validation.itemCount
  });
  const safeItems = items.map((item) => ({
    attempt_id: item.attemptId,
    text: item.text.trim(),
    source_language: item.sourceLanguage.trim(),
    target_language: item.targetLanguage.trim()
  }));

  return {
    model: commentTranslatorOpenAiModel,
    store: false,
    messages: [
      {
        role: "system",
        content: "Translate each comment into its target language. Return one strict result item for every attempt_id. Do not add commentary."
      },
      {
        role: "user",
        content: JSON.stringify({ items: safeItems })
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "comment_translation_batch",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["items"],
          properties: {
            items: {
              type: "array",
              minItems: items.length,
              maxItems: items.length,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["attempt_id", "status", "translated_text"],
                properties: {
                  attempt_id: { type: "string" },
                  status: { type: "string", enum: ["translated", "rejected"] },
                  translated_text: { type: "string", maxLength: commentTranslatorOpenAiMaxOutputItemCodePoints }
                }
              }
            }
          }
        }
      }
    },
    max_completion_tokens: tokenEstimate.requestTokenLimit
  };
}

export function parseCommentTranslatorOpenAiBatchResponse(
  body: unknown,
  expectedItems: readonly CommentTranslatorOpenAiBatchItem[]
): CommentTranslatorOpenAiParsedResponse {
  const expectedAttemptIds = new Set(expectedItems.map((item) => item.attemptId));
  const expectedAttemptIdList = Array.from(expectedAttemptIds);
  const usage = readOpenAiUsage(body);
  if (hasOpenAiPolicyRefusal(body)) {
    return {
      status: "policy-rejected",
      failureClass: "policy",
      successfulAttemptIds: [],
      retryAttemptIds: [],
      inputUsageTokens: usage.inputTokens,
      outputUsageTokens: usage.outputTokens
    };
  }
  const content = readOpenAiMessageContent(body);
  if (!content) {
    return {
      status: "subset-retry",
      items: [],
      successfulAttemptIds: [],
      retryAttemptIds: expectedAttemptIdList,
      inputUsageTokens: usage.inputTokens,
      outputUsageTokens: usage.outputTokens
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return {
      status: "subset-retry",
      items: [],
      successfulAttemptIds: [],
      retryAttemptIds: expectedAttemptIdList,
      inputUsageTokens: usage.inputTokens,
      outputUsageTokens: usage.outputTokens
    };
  }

  if (!isRecord(parsed) || !Array.isArray(parsed.items)) {
    return {
      status: "subset-retry",
      items: [],
      successfulAttemptIds: [],
      retryAttemptIds: expectedAttemptIdList,
      inputUsageTokens: usage.inputTokens,
      outputUsageTokens: usage.outputTokens
    };
  }

  const parsedItems: unknown[] = Array.isArray(parsed.items) ? parsed.items : [];
  let hasInvalidResponseItem = Object.keys(parsed).some((key) => key !== "items");
  const responseAttemptIdCounts = new Map<string, number>();
  for (const rawItem of parsedItems) {
    if (!isRecord(rawItem) || typeof rawItem.attempt_id !== "string") continue;
    responseAttemptIdCounts.set(rawItem.attempt_id, (responseAttemptIdCounts.get(rawItem.attempt_id) ?? 0) + 1);
  }

  const successfulAttemptIds: string[] = [];
  const retryAttemptIds = new Set(expectedAttemptIds);
  for (const rawItem of parsedItems) {
    if (!isRecord(rawItem)) {
      hasInvalidResponseItem = true;
      continue;
    }
    if (Object.keys(rawItem).some((key) => !["attempt_id", "status", "translated_text"].includes(key))) {
      hasInvalidResponseItem = true;
      continue;
    }
    const attemptId = typeof rawItem.attempt_id === "string" ? rawItem.attempt_id : null;
    const status = typeof rawItem.status === "string" ? rawItem.status : null;
    const translatedText = typeof rawItem.translated_text === "string" ? rawItem.translated_text.trim() : null;
    if (
      !attemptId
      || !expectedAttemptIds.has(attemptId)
      || status !== "translated"
      || !translatedText
      || countCommentTranslatorOpenAiCodePoints(translatedText) > commentTranslatorOpenAiMaxOutputItemCodePoints
      || responseAttemptIdCounts.get(attemptId) !== 1
    ) {
      hasInvalidResponseItem = true;
      continue;
    }
    successfulAttemptIds.push(attemptId);
    retryAttemptIds.delete(attemptId);
  }

  const items = expectedItems
    .filter((item) => successfulAttemptIds.includes(item.attemptId))
    .map((item) => {
      const rawItem = parsedItems.find(
        (candidate): candidate is Record<string, unknown> =>
          isRecord(candidate) && candidate.attempt_id === item.attemptId && candidate.status === "translated"
      );
      return {
        attemptId: item.attemptId,
        translatedText: typeof rawItem?.translated_text === "string" ? rawItem.translated_text.trim() : ""
      };
    });

  if (retryAttemptIds.size > 0 || hasInvalidResponseItem) {
    return {
      status: "subset-retry",
      items,
      successfulAttemptIds,
      retryAttemptIds: Array.from(retryAttemptIds),
      inputUsageTokens: usage.inputTokens,
      outputUsageTokens: usage.outputTokens
    };
  }

  return {
    status: "complete",
    items,
    successfulAttemptIds,
    retryAttemptIds: [],
    inputUsageTokens: usage.inputTokens,
    outputUsageTokens: usage.outputTokens
  };
}

export function classifyCommentTranslatorOpenAiFailure({
  status,
  timedOut = false,
  networkFailure = false,
  errorCode,
  parseFailure = false,
  policyRefusal = false
}: {
  status?: number | null;
  timedOut?: boolean;
  networkFailure?: boolean;
  errorCode?: string | null;
  parseFailure?: boolean;
  policyRefusal?: boolean;
}): CommentTranslatorOpenAiProviderFailureClass {
  if (timedOut || errorCode === "AbortError") return "timeout";
  if (networkFailure) return "network";
  if (policyRefusal) return "policy";
  if (parseFailure) return "invalid-response";
  const normalizedErrorCode = errorCode?.trim().toLocaleLowerCase() ?? "";
  if (normalizedErrorCode.includes("insufficient_quota") || normalizedErrorCode.includes("quota_exceeded")) return "quota";
  if (normalizedErrorCode.includes("cost") || normalizedErrorCode.includes("billing")) return "cost";
  if (status === 429 && (normalizedErrorCode.includes("rate_limit_exceeded") || normalizedErrorCode.includes("rate_limit"))) {
    return "rate-limit";
  }
  if (normalizedErrorCode.includes("unsupported")) return "unsupported";
  if (normalizedErrorCode.includes("config")) return "configuration";
  if (normalizedErrorCode.includes("auth") || normalizedErrorCode.includes("credential")) return "authentication";
  if (normalizedErrorCode.includes("invalid")) return "invalid-request";
  if (status === 408) return "timeout";
  // A bare or malformed 429 is not sufficient evidence of an ordinary
  // provider rate limit. Quota/credit/spend-limit responses may also use
  // 429, so fail closed unless the sanitized error code positively identifies
  // the ordinary rate-limit family above.
  if (status === 429) return "invalid-response";
  if (status === 401 || status === 403) return "authentication";
  if (status === 402) return "cost";
  if (status === 404) return "configuration";
  if (status === 400 || status === 413 || status === 422) return "invalid-request";
  if (typeof status === "number" && status >= 500 && status <= 599) return "server-error";
  return "configuration";
}

export function isCommentTranslatorOpenAiAzureFallbackEligible({
  failureClass,
  status,
  boundedRetryExhausted = true
}: {
  failureClass: CommentTranslatorOpenAiProviderFailureClass;
  status?: number | null;
  boundedRetryExhausted?: boolean;
}): boolean {
  if (!boundedRetryExhausted) return false;
  if (failureClass === "network" || failureClass === "timeout") return true;
  if (failureClass === "rate-limit") return status === 429;
  return failureClass === "server-error" && typeof status === "number" && fallbackHttpStatuses.has(status);
}

export function createCommentTranslatorOpenAiProvider(
  config: CommentTranslatorOpenAiProviderConfig
): CommentTranslationProvider {
  const apiKey = config.apiKey?.trim() || null;
  const endpoint = normalizeEndpoint(config.endpoint ?? defaultEndpoint);
  const fetchImpl = config.fetchImpl ?? ((url, init) => fetch(url, init));
  const secretBoundary: CommentTranslationProviderSecretBoundary = {
    runtime: "server-env-only",
    clientBundle: "forbidden",
    fixtures: "forbidden",
    docsAndTaskNotes: "no-secret-values"
  };
  return {
    id: "openai-mini",
    name: "OpenAI mini translation model",
    runtimeScope: "server-runtime-only",
    secretBoundary,
    async translate(request: CommentTranslationProviderRequest): Promise<CommentTranslationProviderResult> {
      const text = request.input.text.trim();
      const usageHandoff = createOpenAiUsageHandoff(request, 0, 0);
      if (!apiKey) return openAiTerminalError("credential-missing", "OpenAI mini provider is not configured in server runtime env.");
      if (!text) return openAiTerminalError("invalid-request", "Translation text is required.");
      let result: CommentTranslatorOpenAiExecutionResult;
      try {
        result = await executeCommentTranslatorOpenAiBatch({
          apiKey,
          endpoint,
          fetchImpl,
          items: [{
            // The single-item compatibility seam does not need the caller's
            // identifier for correlation. Keep provider-visible attempt IDs
            // opaque even when an older caller supplies a raw message ID.
            attemptId: "single-item",
            text,
            sourceLanguage: request.input.sourceLanguage,
            targetLanguage: request.input.targetLanguage
          }]
        });
      } catch {
        return {
          type: "recoverable-error",
          code: "temporary-unavailable",
          message: "OpenAI mini request failed temporarily.",
          retry: { retryable: true, retryAfterMs: null, fallbackToOriginal: true },
          usageHandoff
        };
      }
      if (result.status === "completed" && result.items[0]) {
        return {
          type: "translated",
          translatedText: result.items[0].translatedText,
          detectedSourceLanguage: request.input.sourceLanguage === "auto" ? null : request.input.sourceLanguage,
          confidence: null,
          cacheOutcome: "miss",
          usageHandoff: createOpenAiUsageHandoff(request, result.inputTokens + result.outputTokens, result.estimatedCostMicros)
        };
      }
      if (result.status === "completed") {
        return openAiTerminalError("policy-blocked", "OpenAI mini response failed strict translation output parsing.");
      }
      if (result.providerFailureClass === "authentication") {
        return openAiTerminalError("provider-not-configured", "OpenAI mini provider configuration was rejected.");
      }
      if (result.providerFailureClass === "invalid-request" || result.providerFailureClass === "unsupported") {
        return openAiTerminalError("invalid-request", "OpenAI mini request was not accepted.");
      }
      if (result.providerFailureClass === "policy" || result.providerFailureClass === "invalid-response") {
        return openAiTerminalError("policy-blocked", "OpenAI mini response failed strict translation output parsing.");
      }
      return {
        type: "recoverable-error",
        code: result.providerFailureClass === "rate-limit" ? "rate-limited" : result.providerFailureClass === "timeout" ? "timeout" : "temporary-unavailable",
        message: "OpenAI mini request failed temporarily.",
        retry: { retryable: true, retryAfterMs: null, fallbackToOriginal: true },
        usageHandoff: createOpenAiUsageHandoff(request, result.inputTokens + result.outputTokens, result.estimatedCostMicros)
      };
    }
  };
}

function createOpenAiUsageHandoff(
  request: CommentTranslationProviderRequest,
  estimatedUnits: number,
  estimatedCostMicros: number
): CommentTranslationUsageHandoff {
  return {
    ...request.usageHandoff,
    providerId: "openai-mini",
    estimatedUnits,
    estimatedCostMicros,
    cacheOutcome: "miss",
    enforcement: "not-implemented",
    databaseWrite: "not-implemented",
    logPolicy: "short-lived-provider-diagnostic-only"
  };
}

function openAiTerminalError(
  code: "credential-missing" | "invalid-request" | "provider-not-configured" | "policy-blocked",
  message: string
): CommentTranslationProviderResult {
  return { type: "terminal-error", code, message, retry: { retryable: false } };
}

export async function executeCommentTranslatorOpenAiBatch({
  apiKey,
  endpoint = defaultEndpoint,
  items,
  fetchImpl = (url, init) => fetch(url, init),
  requestTimeoutMs = commentTranslatorOpenAiRequestTimeoutMs,
  maxSubsetRetries = 1,
  // Paid orchestration owns bounded 429 retries so every retry can acquire a
  // fresh durable slot/RPM/TPM/cost reservation.
  maxHttpRetries = 0,
  beforeProviderCall
}: ExecuteCommentTranslatorOpenAiBatchRequest): Promise<CommentTranslatorOpenAiExecutionResult> {
  const validation = validateCommentTranslatorOpenAiBatchItems(items);
  if (validation.status !== "valid") {
    return createFailedResult({
      items: [],
      inputCodePoints: 0,
      inputTokens: 0,
      outputTokens: 0,
      providerCallCount: 0,
      subsetRetryCount: 0,
      providerFailureClass: "invalid-request",
      fallbackEligible: false,
      uncertainInflight: false,
      providerReached: false,
      httpStatus: null
    });
  }
  if (!apiKey?.trim()) {
    return createFailedResult({
      items: [],
      inputCodePoints: validation.inputCodePoints,
      inputTokens: 0,
      outputTokens: 0,
      providerCallCount: 0,
      subsetRetryCount: 0,
      providerFailureClass: "authentication",
      fallbackEligible: false,
      uncertainInflight: false,
      providerReached: false,
      httpStatus: null
    });
  }
  const requestEndpoint = normalizeEndpoint(endpoint ?? defaultEndpoint);

  const allItems = [...items];
  let pendingItems = allItems;
  let completedItems: CommentTranslatorOpenAiTranslatedItem[] = [];
  let providerCallCount = 0;
  let subsetRetryCount = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let lastHttpStatus: number | null = null;

  while (pendingItems.length > 0) {
    const body = buildCommentTranslatorOpenAiRequestBody(pendingItems);
    const estimate = estimateCommentTranslatorOpenAiBatchTokens({
      inputCodePoints: countItemsCodePoints(pendingItems),
      itemCount: pendingItems.length
    });
    const controller = new AbortController();
    const timeoutDurationMs = Math.max(1, requestTimeoutMs);
    const deadlineMs = Date.now() + timeoutDurationMs;
    const timeout = setTimeout(() => controller.abort(), timeoutDurationMs);
    let httpRetryCount = 0;
    let response: CommentTranslatorOpenAiFetchResponse;
    while (true) {
      if (beforeProviderCall) {
        let preflightDecision: CommentTranslatorOpenAiProviderPreflightDecision;
        try {
          preflightDecision = await beforeProviderCall();
        } catch {
          clearTimeout(timeout);
          return createFailedResult({
            items: completedItems,
            inputCodePoints: countItemsCodePoints(allItems),
            inputTokens: inputTokens || estimate.inputTokens,
            outputTokens,
            providerCallCount,
            subsetRetryCount,
            retryAttemptIds: pendingItems.map((item) => item.attemptId),
            providerFailureClass: "configuration",
            fallbackEligible: false,
            uncertainInflight: providerCallCount > 0,
            providerReached: providerCallCount > 0,
            httpStatus: lastHttpStatus,
            preflightDecision: "authority-unreadable"
          });
        }
        if (preflightDecision !== "allow") {
          clearTimeout(timeout);
          return createFailedResult({
            items: completedItems,
            inputCodePoints: countItemsCodePoints(allItems),
            inputTokens: inputTokens || estimate.inputTokens,
            outputTokens,
            providerCallCount,
            subsetRetryCount,
            retryAttemptIds: pendingItems.map((item) => item.attemptId),
            providerFailureClass: preflightDecision === "circuit-unavailable" ? "network" : "configuration",
            fallbackEligible: preflightDecision === "circuit-unavailable",
            uncertainInflight: preflightDecision === "authority-unreadable" && providerCallCount > 0,
            providerReached: providerCallCount > 0,
            httpStatus: lastHttpStatus,
            preflightDecision
          });
        }
      }
      try {
        providerCallCount += 1;
        response = await fetchImpl(requestEndpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey.trim()}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body),
          signal: controller.signal
        });
      } catch (error) {
        clearTimeout(timeout);
        const timedOut = isAbortError(error) || controller.signal.aborted;
        const providerFailureClass = classifyCommentTranslatorOpenAiFailure({ timedOut, networkFailure: !timedOut });
        return createFailedResult({
          items: completedItems,
          inputCodePoints: countItemsCodePoints(allItems),
          inputTokens: inputTokens || estimate.inputTokens,
          outputTokens,
          providerCallCount,
          subsetRetryCount,
          retryAttemptIds: pendingItems.map((item) => item.attemptId),
          providerFailureClass,
          fallbackEligible: isCommentTranslatorOpenAiAzureFallbackEligible({ failureClass: providerFailureClass }),
          uncertainInflight: true,
          providerReached: true,
          httpStatus: null
        });
      }
      lastHttpStatus = response.status;
      if (response.ok) break;

      const sanitizedErrorCode = await readOpenAiSanitizedErrorCode(response, deadlineMs);
      if (sanitizedErrorCode === "response-timeout") {
        clearTimeout(timeout);
        const providerFailureClass = classifyCommentTranslatorOpenAiFailure({ status: response.status });
        const unreadableRateLimitBody = response.status === 429;
        return createFailedResult({
          items: completedItems,
          inputCodePoints: countItemsCodePoints(allItems),
          inputTokens: inputTokens || estimate.inputTokens,
          outputTokens,
          providerCallCount,
          subsetRetryCount,
          retryAttemptIds: pendingItems.map((item) => item.attemptId),
          providerFailureClass,
          fallbackEligible: unreadableRateLimitBody
            ? false
            : isCommentTranslatorOpenAiAzureFallbackEligible({
                failureClass: providerFailureClass,
                status: response.status
              }),
          uncertainInflight: false,
          providerReached: true,
          httpStatus: response.status
        });
      }
      const providerFailureClass = classifyCommentTranslatorOpenAiFailure({
        status: response.status,
        errorCode: sanitizedErrorCode
      });
      const ordinaryRateLimit = response.status === 429 && providerFailureClass === "rate-limit";
      if (ordinaryRateLimit && httpRetryCount < Math.max(0, Math.min(1, maxHttpRetries))) {
        httpRetryCount += 1;
        const remainingMs = deadlineMs - Date.now();
        if (remainingMs <= commentTranslatorOpenAiMaxAdditionalWaitMs) {
          clearTimeout(timeout);
          return createFailedResult({
            items: completedItems,
            inputCodePoints: countItemsCodePoints(allItems),
            inputTokens: inputTokens || estimate.inputTokens,
            outputTokens,
            providerCallCount,
            subsetRetryCount,
            retryAttemptIds: pendingItems.map((item) => item.attemptId),
            providerFailureClass: "timeout",
            fallbackEligible: true,
            uncertainInflight: true,
            providerReached: true,
            httpStatus: response.status
          });
        }
        await new Promise<void>((resolve) => setTimeout(resolve, commentTranslatorOpenAiMaxAdditionalWaitMs));
        continue;
      }
      clearTimeout(timeout);
      return createFailedResult({
        items: completedItems,
        inputCodePoints: countItemsCodePoints(allItems),
        inputTokens: inputTokens || estimate.inputTokens,
        outputTokens,
        providerCallCount,
        subsetRetryCount,
        retryAttemptIds: pendingItems.map((item) => item.attemptId),
        providerFailureClass,
        fallbackEligible: isCommentTranslatorOpenAiAzureFallbackEligible({
          failureClass: providerFailureClass,
          status: response.status,
          boundedRetryExhausted: !ordinaryRateLimit || httpRetryCount >= Math.max(0, Math.min(1, maxHttpRetries))
        }),
        uncertainInflight: false,
        providerReached: true,
        httpStatus: response.status
      });
    }
    let responseBody: unknown = null;
    try {
      responseBody = await readOpenAiResponseJsonWithTimeout(response, deadlineMs);
    } catch (error) {
      if (isOpenAiTimeoutError(error) || controller.signal.aborted || isAbortError(error)) {
        clearTimeout(timeout);
        return createFailedResult({
          items: completedItems,
          inputCodePoints: countItemsCodePoints(allItems),
          inputTokens: inputTokens || estimate.inputTokens,
          outputTokens,
          providerCallCount,
          subsetRetryCount,
          retryAttemptIds: pendingItems.map((item) => item.attemptId),
          providerFailureClass: "timeout",
          fallbackEligible: true,
          uncertainInflight: true,
          providerReached: true,
          httpStatus: lastHttpStatus
        });
      }
      responseBody = null;
    }
    clearTimeout(timeout);
    const parsed = parseCommentTranslatorOpenAiBatchResponse(responseBody, pendingItems);
    inputTokens += parsed.inputUsageTokens || estimate.inputTokens;
    outputTokens += parsed.outputUsageTokens || estimate.outputTokens;
    if (parsed.status === "policy-rejected" || parsed.status === "invalid-response") {
      return createFailedResult({
        items: completedItems,
        inputCodePoints: countItemsCodePoints(allItems),
        inputTokens,
        outputTokens,
        providerCallCount,
        subsetRetryCount,
        providerFailureClass: parsed.failureClass,
        fallbackEligible: false,
        uncertainInflight: false,
        providerReached: true,
        httpStatus: lastHttpStatus
      });
    }
    if (parsed.status === "complete") {
      completedItems = [...completedItems, ...parsed.items];
      const cost = calculateCostMicros(inputTokens, outputTokens);
      return {
        status: "completed",
        items: completedItems,
        providerCallCount,
        subsetRetryCount,
        inputCodePoints: countItemsCodePoints(allItems),
        inputTokens,
        outputTokens,
        estimatedCostMicros: cost,
        retryAttemptIds: [],
        providerFailureClass: null,
        fallbackEligible: false,
        uncertainInflight: false,
        providerReached: true
      };
    }
    if (parsed.status !== "subset-retry") {
      return createFailedResult({
        items: completedItems,
        inputCodePoints: countItemsCodePoints(allItems),
        inputTokens,
        outputTokens,
        providerCallCount,
        subsetRetryCount,
        retryAttemptIds: pendingItems.map((item) => item.attemptId),
        providerFailureClass: "invalid-response",
        fallbackEligible: false,
        uncertainInflight: false,
        providerReached: true,
        httpStatus: lastHttpStatus
      });
    }
    completedItems = [...completedItems, ...parsed.items];
    if (subsetRetryCount >= Math.max(0, maxSubsetRetries)) {
      return createFailedResult({
        items: completedItems,
        inputCodePoints: countItemsCodePoints(allItems),
        inputTokens,
        outputTokens,
        providerCallCount,
        subsetRetryCount,
        retryAttemptIds: parsed.retryAttemptIds,
        providerFailureClass: "invalid-response",
        fallbackEligible: false,
        uncertainInflight: false,
        providerReached: true,
        httpStatus: lastHttpStatus
      });
    }
    subsetRetryCount += 1;
    const successful = new Set(parsed.successfulAttemptIds);
    pendingItems = allItems.filter((item) => !successful.has(item.attemptId));
  }

  return createFailedResult({
    items: completedItems,
    inputCodePoints: countItemsCodePoints(allItems),
    inputTokens,
    outputTokens,
    providerCallCount,
    subsetRetryCount,
    providerFailureClass: "invalid-response",
    fallbackEligible: false,
    uncertainInflight: false,
    providerReached: true,
    httpStatus: lastHttpStatus
  });
}

function createFailedResult({
  items,
  inputCodePoints,
  inputTokens,
  outputTokens,
  providerCallCount,
  subsetRetryCount,
  retryAttemptIds = [],
  providerFailureClass,
  fallbackEligible,
  uncertainInflight,
  providerReached,
  httpStatus,
  preflightDecision
}: Omit<Extract<CommentTranslatorOpenAiExecutionResult, { status: "failed" }>, "status" | "estimatedCostMicros" | "retryAttemptIds"> & {
  retryAttemptIds?: readonly string[];
  preflightDecision?: CommentTranslatorOpenAiProviderPreflightDecision;
}): Extract<
  CommentTranslatorOpenAiExecutionResult,
  { status: "failed" }
> {
  return {
    status: "failed",
    items,
    providerCallCount,
    subsetRetryCount,
    inputCodePoints,
    inputTokens,
    outputTokens,
    estimatedCostMicros: calculateCostMicros(inputTokens, outputTokens),
    retryAttemptIds,
    providerFailureClass,
    fallbackEligible,
    uncertainInflight,
    providerReached,
    httpStatus,
    preflightDecision
  };
}

function calculateCostMicros(inputTokens: number, outputTokens: number): number {
  if (!Number.isFinite(inputTokens) || !Number.isFinite(outputTokens) || inputTokens < 0 || outputTokens < 0) return 0;
  return Math.max(
    0,
    Math.ceil(
      inputTokens * commentTranslatorOpenAiInputPricePerMillionTokens
        + outputTokens * commentTranslatorOpenAiOutputPricePerMillionTokens
    )
  );
}

function countItemsCodePoints(items: readonly CommentTranslatorOpenAiBatchItem[]): number {
  return items.reduce((total, item) => total + countCommentTranslatorOpenAiCodePoints(item.text.trim()), 0);
}

function normalizeEndpoint(value: string): string {
  return (value.trim() || defaultEndpoint).replace(/\/+$/, "");
}

function isAbortError(error: unknown): boolean {
  return isRecord(error) && error.name === "AbortError";
}

async function readOpenAiSanitizedErrorCode(
  response: CommentTranslatorOpenAiFetchResponse,
  deadlineMs: number
): Promise<string | "response-timeout" | null> {
  try {
    const body = await readOpenAiResponseJsonWithTimeout(response, deadlineMs);
    if (!isRecord(body) || !isRecord(body.error)) return null;
    const values = [body.error.code, body.error.type, body.error.message]
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim().toLocaleLowerCase());
    if (values.some((value) => value.includes("insufficient_quota") || value.includes("quota_exceeded") || value.includes("quota"))) {
      return "insufficient_quota";
    }
    if (values.some((value) => value.includes("billing") || value.includes("spend_limit") || value.includes("usage_limit"))) {
      return "billing_limit";
    }
    if (values.some((value) => value.includes("rate_limit_exceeded") || value.includes("rate_limit") || value.includes("rate limit"))) {
      return "rate_limit_exceeded";
    }
    if (values.some((value) => value.includes("authentication") || value.includes("credential"))) {
      return "authentication_failed";
    }
    if (values.some((value) => value.includes("unsupported"))) {
      return "unsupported";
    }
    if (values.some((value) => value.includes("invalid"))) {
      return "invalid_request";
    }
  } catch (error) {
    if (isOpenAiTimeoutError(error)) return "response-timeout";
    // A non-JSON error body remains unclassified and is never retained or returned.
  }
  return null;
}

async function readOpenAiResponseJsonWithTimeout(
  response: CommentTranslatorOpenAiFetchResponse,
  deadlineMs: number
): Promise<unknown> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      response.json(),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error("paid-openai-response-timeout")), Math.max(1, deadlineMs - Date.now()));
      })
    ]);
  } finally {
    if (timeout !== null) clearTimeout(timeout);
  }
}

function isOpenAiTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.message === "paid-openai-response-timeout";
}

function readOpenAiMessageContent(body: unknown): string | null {
  if (!isRecord(body) || !Array.isArray(body.choices)) return null;
  const firstChoice = body.choices[0];
  if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) return null;
  return typeof firstChoice.message.content === "string" ? firstChoice.message.content.trim() : null;
}

function hasOpenAiPolicyRefusal(body: unknown): boolean {
  if (!isRecord(body) || !Array.isArray(body.choices)) return false;
  const firstChoice = body.choices[0];
  if (!isRecord(firstChoice)) return false;
  if (firstChoice.finish_reason === "content_filter") return true;
  if (!isRecord(firstChoice.message)) return false;
  return typeof firstChoice.message.refusal === "string" && firstChoice.message.refusal.trim().length > 0;
}

function readOpenAiUsage(body: unknown): { inputTokens: number; outputTokens: number } {
  if (!isRecord(body) || !isRecord(body.usage)) return { inputTokens: 0, outputTokens: 0 };
  const inputTokens = readNonNegativeInteger(body.usage.prompt_tokens);
  const outputTokens = readNonNegativeInteger(body.usage.completion_tokens);
  return { inputTokens, outputTokens };
}

function readNonNegativeInteger(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
