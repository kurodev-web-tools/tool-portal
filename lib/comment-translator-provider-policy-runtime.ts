import "server-only";

import type {
  CommentTranslationProvider,
  CommentTranslationProviderRecoverableError,
  CommentTranslationProviderRequest,
  CommentTranslationProviderResult,
  CommentTranslationProviderSecretBoundary,
  CommentTranslationUsageHandoff
} from "./comment-translator-provider-boundary";
import {
  createCommentTranslatorOpenAiProvider,
  parseCommentTranslatorOpenAiBatchResponse,
  type CommentTranslatorOpenAiFetch
} from "./comment-translator-openai-execution";
import type { CommentTranslatorSessionPlan, CommentTranslatorSessionPlanEntitlement } from "./comment-translator-session-runtime";
import type { CommentTranslatorOpenAiFetchResponse } from "./comment-translator-openai-execution";

export type CommentTranslatorTranslationProviderKind = "azure-translator" | "openai-mini";

export type CommentTranslatorProviderImplementationAlignmentContract = {
  implementationStage: "pre-main-task-20-provider-implementation-alignment";
  runtime: "server-only";
  freePlanPrimary: "azure-translator";
  paidPlanPrimary: "openai-mini";
  paidRecoverableFallback: "azure-translator";
  freeFallbackToPaidLlm: "forbidden";
  skippedComments: "not-sent-to-provider";
  llmOutputParsing: "strict-json-only";
  usageCostAccounting: "sanitized-estimates-only";
  providerIdentifiersReadableOutput: "forbidden";
  rawCommentLogging: "disabled-by-default";
  liveProviderExecution: "not-run-without-explicit-approval";
};

export type CommentTranslatorTranslationProviderSet = {
  azure?: CommentTranslationProvider | null;
  openAiMini?: CommentTranslationProvider | null;
};

export type CommentTranslatorTranslationProviderRoute =
  | {
      status: "ready";
      plan: CommentTranslatorSessionPlan;
      primaryProvider: CommentTranslationProvider;
      fallbackProvider: CommentTranslationProvider | null;
      fallbackBehavior: "free-no-paid-llm-fallback" | "paid-openai-recoverable-to-azure";
      providerIdentifiers: "server-only-not-returned";
    }
  | {
      status: "unavailable";
      plan: CommentTranslatorSessionPlan;
      reason: "missing-azure-provider" | "missing-openai-mini-provider";
      providerIdentifiers: "server-only-not-returned";
    };

export type AzureCommentTranslationProviderConfig = {
  key: string | null | undefined;
  endpoint: string | null | undefined;
  region?: string | null | undefined;
  fetchImpl?: ProviderFetch;
};

export type OpenAIMiniCommentTranslationProviderConfig = {
  apiKey: string | null | undefined;
  model: string | null | undefined;
  endpoint?: string | null | undefined;
  fetchImpl?: ProviderFetch | CommentTranslatorOpenAiFetch;
};

type ProviderFetchResponse = CommentTranslatorOpenAiFetchResponse & {
  ok: boolean;
  status: number;
  headers?: {
    get(name: string): string | null;
  };
  text(): Promise<string>;
};

type ProviderFetch = (url: string, init: RequestInit) => Promise<ProviderFetchResponse>;

export type ParsedOpenAITranslationProviderResponse =
  | {
      status: "parsed";
      translatedText: string;
      detectedSourceLanguage: string | null;
      confidence: number | null;
      totalTokens: number;
    }
  | {
      status: "invalid";
      reason: "missing-content" | "invalid-json" | "invalid-shape";
      failureClass: "policy" | "invalid-response";
    };

type AzureTranslateResponse = Array<{
  translations?: Array<{
    text?: string;
    to?: string;
  }>;
  detectedLanguage?: {
    language?: string;
    score?: number;
  };
}>;

const providerSecretBoundary = {
  runtime: "server-env-only",
  clientBundle: "forbidden",
  fixtures: "forbidden",
  docsAndTaskNotes: "no-secret-values"
} as const satisfies CommentTranslationProviderSecretBoundary;

const azureEnv = {
  key: "AZURE_TRANSLATOR_KEY",
  endpoint: "AZURE_TRANSLATOR_ENDPOINT",
  region: "AZURE_TRANSLATOR_REGION"
} as const;

const openAiEnv = {
  apiKey: "OPENAI_API_KEY",
  model: "OPENAI_TRANSLATION_MODEL"
} as const;

const defaultAzureEndpoint = "https://api.cognitive.microsofttranslator.com";
const defaultOpenAIEndpoint = "https://api.openai.com/v1/chat/completions";

export const commentTranslatorProviderImplementationAlignmentContract = {
  implementationStage: "pre-main-task-20-provider-implementation-alignment",
  runtime: "server-only",
  freePlanPrimary: "azure-translator",
  paidPlanPrimary: "openai-mini",
  paidRecoverableFallback: "azure-translator",
  freeFallbackToPaidLlm: "forbidden",
  skippedComments: "not-sent-to-provider",
  llmOutputParsing: "strict-json-only",
  usageCostAccounting: "sanitized-estimates-only",
  providerIdentifiersReadableOutput: "forbidden",
  rawCommentLogging: "disabled-by-default",
  liveProviderExecution: "not-run-without-explicit-approval"
} as const satisfies CommentTranslatorProviderImplementationAlignmentContract;

export function readAzureCommentTranslationProviderConfig(
  env: Record<string, string | undefined> = process.env
): AzureCommentTranslationProviderConfig {
  return {
    key: readOptionalEnv(env, azureEnv.key),
    endpoint: readOptionalEnv(env, azureEnv.endpoint) ?? defaultAzureEndpoint,
    region: readOptionalEnv(env, azureEnv.region)
  };
}

export function readOpenAIMiniCommentTranslationProviderConfig(
  env: Record<string, string | undefined> = process.env
): OpenAIMiniCommentTranslationProviderConfig {
  return {
    apiKey: readOptionalEnv(env, openAiEnv.apiKey),
    model: readOptionalEnv(env, openAiEnv.model),
    endpoint: defaultOpenAIEndpoint
  };
}

export function createAzureCommentTranslationProvider(config: AzureCommentTranslationProviderConfig) {
  return new AzureCommentTranslationProvider(config);
}

export function createOpenAIMiniCommentTranslationProvider(config: OpenAIMiniCommentTranslationProviderConfig) {
  return createCommentTranslatorOpenAiProvider({
    apiKey: config.apiKey,
    endpoint: config.endpoint,
    fetchImpl: config.fetchImpl
  });
}

export function createCommentTranslatorDefaultTranslationProviderSet(
  env: Record<string, string | undefined> = process.env
): CommentTranslatorTranslationProviderSet {
  return {
    azure: createAzureCommentTranslationProvider(readAzureCommentTranslationProviderConfig(env)),
    openAiMini: createOpenAIMiniCommentTranslationProvider(readOpenAIMiniCommentTranslationProviderConfig(env))
  };
}

export function resolveCommentTranslatorTranslationProviderRoute({
  planEntitlement,
  providers
}: {
  planEntitlement: CommentTranslatorSessionPlanEntitlement;
  providers: CommentTranslatorTranslationProviderSet;
}): CommentTranslatorTranslationProviderRoute {
  if (planEntitlement.plan === "free") {
    if (!providers.azure) {
      return {
        status: "unavailable",
        plan: "free",
        reason: "missing-azure-provider",
        providerIdentifiers: "server-only-not-returned"
      };
    }

    return {
      status: "ready",
      plan: "free",
      primaryProvider: providers.azure,
      fallbackProvider: null,
      fallbackBehavior: "free-no-paid-llm-fallback",
      providerIdentifiers: "server-only-not-returned"
    };
  }

  if (!providers.openAiMini) {
    return {
      status: "unavailable",
      plan: "paid",
      reason: "missing-openai-mini-provider",
      providerIdentifiers: "server-only-not-returned"
    };
  }

  return {
    status: "ready",
    plan: "paid",
    primaryProvider: providers.openAiMini,
    fallbackProvider: providers.azure ?? null,
    fallbackBehavior: "paid-openai-recoverable-to-azure",
    providerIdentifiers: "server-only-not-returned"
  };
}

class AzureCommentTranslationProvider implements CommentTranslationProvider {
  readonly id = "azure-translator";
  readonly name = "Azure Translator";
  readonly runtimeScope = "server-runtime-only" as const;
  readonly secretBoundary = providerSecretBoundary;

  private readonly key: string | null;
  private readonly endpoint: string;
  private readonly region: string | null;
  private readonly fetchImpl: ProviderFetch;

  constructor(config: AzureCommentTranslationProviderConfig) {
    this.key = config.key?.trim() || null;
    this.endpoint = normalizeEndpoint(config.endpoint, defaultAzureEndpoint);
    this.region = config.region?.trim() || null;
    this.fetchImpl = config.fetchImpl ?? ((url, init) => fetch(url, init));
  }

  async translate(request: CommentTranslationProviderRequest): Promise<CommentTranslationProviderResult> {
    if (!this.key) {
      return terminalError("credential-missing", "Azure Translator is not configured in server runtime env.");
    }

    const text = request.input.text.trim();
    if (!text) {
      return terminalError("invalid-request", "Translation text is required.");
    }

    const targetLanguage = normalizeAzureLanguage(request.input.targetLanguage);
    if (!targetLanguage) {
      return terminalError("unsupported-language", "Target language is not supported by the Azure policy route.");
    }

    const sourceLanguage = request.input.sourceLanguage === "auto" ? null : normalizeAzureLanguage(request.input.sourceLanguage);
    if (request.input.sourceLanguage !== "auto" && !sourceLanguage) {
      return terminalError("unsupported-language", "Source language is not supported by the Azure policy route.");
    }

    const usageHandoff = createUsageHandoff(request, "azure-translator", estimateCharacters(text), estimateAzureCostMicros(text), "miss");
    const url = new URL("/translate", this.endpoint);
    url.searchParams.set("api-version", "3.0");
    url.searchParams.set("to", targetLanguage);
    if (sourceLanguage) {
      url.searchParams.set("from", sourceLanguage);
    }

    let response: ProviderFetchResponse;
    try {
      response = await this.fetchImpl(url.toString(), {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": this.key,
          ...(this.region ? { "Ocp-Apim-Subscription-Region": this.region } : {}),
          "Content-Type": "application/json"
        },
        body: JSON.stringify([{ text }])
      });
    } catch {
      return recoverableError({
        code: "transport-uncertain",
        message: "Azure Translator request outcome is uncertain.",
        retryAfterMs: null,
        usageHandoff
      });
    }

    if (!response.ok) {
      return await mapProviderErrorResponse(response, usageHandoff);
    }

    let body: AzureTranslateResponse;
    try {
      body = (await response.json()) as AzureTranslateResponse;
    } catch {
      return recoverableError({
        code: "response-invalid",
        message: "Azure Translator response could not be parsed.",
        retryAfterMs: null,
        usageHandoff
      });
    }
    const first = Array.isArray(body) ? body[0] : undefined;
    const translatedText = first?.translations?.[0]?.text?.trim();
    if (!first || !translatedText) {
      return recoverableError({
        code: "response-invalid",
        message: "Azure Translator response did not contain translated text.",
        retryAfterMs: null,
        usageHandoff
      });
    }

    return {
      type: "translated",
      translatedText,
      detectedSourceLanguage: first.detectedLanguage?.language ?? (sourceLanguage ? request.input.sourceLanguage : null),
      confidence: first.detectedLanguage?.score ?? null,
      cacheOutcome: "miss",
      usageHandoff
    };
  }
}

export function parseOpenAITranslationProviderResponse(body: unknown): ParsedOpenAITranslationProviderResponse {
  const parsed = parseCommentTranslatorOpenAiBatchResponse(body, [{
    attemptId: "compatibility-attempt",
    text: "compatibility",
    sourceLanguage: "auto",
    targetLanguage: "ja"
  }]);
  if (parsed.status === "policy-rejected") {
    return {
      status: "invalid",
      reason: "invalid-shape",
      failureClass: "policy"
    };
  }
  if (parsed.status === "invalid-response") {
    return {
      status: "invalid",
      reason: "invalid-shape",
      failureClass: "invalid-response"
    };
  }
  if ((parsed.status === "complete" || parsed.status === "subset-retry") && parsed.items.length === 1) {
    return {
      status: "parsed",
      translatedText: parsed.items[0].translatedText,
      detectedSourceLanguage: null,
      confidence: null,
      totalTokens: 0
    };
  }

  const legacyContent = readOpenAIContent(body);
  if (!legacyContent) {
    return {
      status: "invalid",
      reason: "missing-content",
      failureClass: "invalid-response"
    };
  }

  let legacyParsed: unknown;
  try {
    legacyParsed = JSON.parse(legacyContent);
  } catch {
    return {
      status: "invalid",
      reason: "invalid-json",
      failureClass: "invalid-response"
    };
  }

  if (!isStrictTranslationObject(legacyParsed)) {
    return {
      status: "invalid",
      reason: "invalid-shape",
      failureClass: "invalid-response"
    };
  }

  return {
    status: "parsed",
    translatedText: legacyParsed.translatedText.trim(),
    detectedSourceLanguage: legacyParsed.detectedSourceLanguage ?? null,
    confidence: legacyParsed.confidence ?? null,
    totalTokens: 0
  };
}

function readOpenAIContent(body: unknown) {
  if (typeof body !== "object" || body === null || !("choices" in body) || !Array.isArray(body.choices)) {
    return null;
  }

  const firstChoice = body.choices[0];
  if (typeof firstChoice !== "object" || firstChoice === null || !("message" in firstChoice)) {
    return null;
  }

  const message = firstChoice.message;
  if (typeof message !== "object" || message === null || !("content" in message)) {
    return null;
  }

  return typeof message.content === "string" ? message.content.trim() : null;
}

function isStrictTranslationObject(
  value: unknown
): value is { translatedText: string; detectedSourceLanguage?: string | null; confidence?: number | null } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const keys = Object.keys(value).sort();
  const allowedKeys = ["confidence", "detectedSourceLanguage", "translatedText"];
  if (!keys.every((key) => allowedKeys.includes(key)) || !allowedKeys.every((key) => keys.includes(key))) {
    return false;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.translatedText !== "string" || !record.translatedText.trim()) {
    return false;
  }

  if (
    record.detectedSourceLanguage !== null &&
    typeof record.detectedSourceLanguage !== "string"
  ) {
    return false;
  }

  if (record.confidence !== null && typeof record.confidence !== "number") {
    return false;
  }

  return typeof record.confidence !== "number" || (record.confidence >= 0 && record.confidence <= 1);
}

async function mapProviderErrorResponse(
  response: ProviderFetchResponse,
  usageHandoff: CommentTranslationUsageHandoff
): Promise<CommentTranslationProviderResult> {
  if (response.status === 429 || response.status === 403) {
    const azureErrorKind = await readAllowlistedAzureErrorKind(response);
    if (azureErrorKind === "quota") {
      return terminalError("provider-quota-exhausted", "Azure Translator quota is exhausted.");
    }
    if (response.status === 403) {
      return terminalError("provider-not-configured", "Translation provider configuration was rejected.");
    }
    return recoverableError({
      code: "rate-limited",
      message: "Translation provider rate limit reached.",
      retryAfterMs: parseRetryAfterMs(response.headers?.get("retry-after") ?? null),
      usageHandoff
    });
  }

  if (response.status === 408 || response.status === 504) {
    return recoverableError({
      code: "timeout",
      message: "Translation provider request timed out.",
      retryAfterMs: null,
      usageHandoff
    });
  }

  if (response.status >= 500 && response.status <= 599) {
    return recoverableError({
      code: "temporary-unavailable",
      message: "Translation provider is temporarily unavailable.",
      retryAfterMs: parseRetryAfterMs(response.headers?.get("retry-after") ?? null),
      usageHandoff
    });
  }

  if (response.status === 400 || response.status === 413) {
    return terminalError("invalid-request", "Translation provider rejected the request.");
  }

  if (response.status === 401 || response.status === 403 || response.status === 404) {
    return terminalError("provider-not-configured", "Translation provider configuration was rejected.");
  }

  return terminalError("policy-blocked", "Translation provider rejected this request.");
}

function createUsageHandoff(
  request: CommentTranslationProviderRequest,
  providerId: CommentTranslatorTranslationProviderKind,
  estimatedUnits: number,
  estimatedCostMicros: number,
  cacheOutcome: CommentTranslationUsageHandoff["cacheOutcome"]
): CommentTranslationUsageHandoff {
  return {
    ...request.usageHandoff,
    providerId,
    estimatedUnits,
    estimatedCostMicros,
    cacheOutcome,
    enforcement: "not-implemented",
    databaseWrite: "not-implemented",
    logPolicy: "short-lived-provider-diagnostic-only"
  };
}

function terminalError(code: Extract<CommentTranslationProviderResult, { type: "terminal-error" }>["code"], message: string) {
  return {
    type: "terminal-error",
    code,
    message,
    retry: {
      retryable: false
    }
  } as const satisfies Extract<CommentTranslationProviderResult, { type: "terminal-error" }>;
}

function recoverableError({
  code,
  message,
  retryAfterMs,
  usageHandoff
}: {
  code: CommentTranslationProviderRecoverableError["code"];
  message: string;
  retryAfterMs: number | null;
  usageHandoff: CommentTranslationUsageHandoff;
}): CommentTranslationProviderRecoverableError {
  return {
    type: "recoverable-error",
    code,
    message,
    retry: {
      retryable: true,
      retryAfterMs,
      fallbackToOriginal: true
    },
    usageHandoff
  };
}

function normalizeEndpoint(value: string | null | undefined, fallback: string) {
  return (value?.trim() || fallback).replace(/\/+$/, "");
}

function normalizeAzureLanguage(language: string) {
  const normalized = language.trim().toLocaleLowerCase();
  if (normalized === "ja" || normalized === "jp" || normalized === "japanese") {
    return "ja";
  }
  if (normalized === "en" || normalized === "eng" || normalized === "english") {
    return "en";
  }
  if (normalized === "ko" || normalized === "kr" || normalized === "korean") {
    return "ko";
  }
  if (normalized === "zh" || normalized === "cn" || normalized === "chinese") {
    return "zh-Hans";
  }
  return null;
}

function readOptionalEnv(env: Record<string, string | undefined>, name: string) {
  const value = env[name]?.trim();
  return value ? value : null;
}

function estimateCharacters(text: string) {
  return Math.max(Array.from(text).length, 1);
}

function estimateAzureCostMicros(text: string) {
  return estimateCharacters(text);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const azureQuotaErrorCodes = new Set([
  "403001",
  "quotaexceeded",
  "outofquota",
  "subscriptionquotaexceeded",
  "quota_exceeded"
]);

async function readAllowlistedAzureErrorKind(
  response: ProviderFetchResponse
): Promise<"quota" | "other"> {
  let value: unknown;
  try {
    value = await response.json();
  } catch {
    return "other";
  }
  if (!isRecord(value)) return "other";
  const error = isRecord(value.error) ? value.error : value;
  const candidates = [error.code, error.type]
    .flatMap((candidate) => {
      if (typeof candidate === "string") return [candidate.trim().toLocaleLowerCase()];
      if (typeof candidate === "number" && Number.isSafeInteger(candidate)) return [String(candidate)];
      return [];
    });
  return candidates.some((candidate) => azureQuotaErrorCodes.has(candidate)) ? "quota" : "other";
}

function parseRetryAfterMs(value: string | null) {
  if (!value) {
    return null;
  }

  const seconds = Number.parseInt(value, 10);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  const dateMs = Date.parse(value);
  if (Number.isFinite(dateMs)) {
    return Math.max(dateMs - Date.now(), 0);
  }

  return null;
}
