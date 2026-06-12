import "server-only";

import type {
  CommentTranslationProvider,
  CommentTranslationProviderRecoverableError,
  CommentTranslationProviderRequest,
  CommentTranslationProviderResult,
  CommentTranslationProviderSecretBoundary,
  CommentTranslationUsageHandoff
} from "./comment-translator-provider-boundary";
import type { CommentTranslatorSessionPlan, CommentTranslatorSessionPlanEntitlement } from "./comment-translator-session-runtime";

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
  fetchImpl?: ProviderFetch;
};

type ProviderFetchResponse = {
  ok: boolean;
  status: number;
  headers?: {
    get(name: string): string | null;
  };
  json(): Promise<unknown>;
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
const maxProviderDiagnosticLength = 160;

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
  return new OpenAIMiniCommentTranslationProvider(config);
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

    try {
      const response = await this.fetchImpl(url.toString(), {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": this.key,
          ...(this.region ? { "Ocp-Apim-Subscription-Region": this.region } : {}),
          "Content-Type": "application/json"
        },
        body: JSON.stringify([{ text }])
      });

      if (!response.ok) {
        return await mapProviderErrorResponse(response, usageHandoff);
      }

      const body = (await response.json()) as AzureTranslateResponse;
      const first = body[0];
      const translatedText = first?.translations?.[0]?.text?.trim();
      if (!translatedText) {
        return recoverableError({
          code: "temporary-unavailable",
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
    } catch {
      return recoverableError({
        code: "temporary-unavailable",
        message: "Azure Translator request failed temporarily.",
        retryAfterMs: null,
        usageHandoff
      });
    }
  }
}

class OpenAIMiniCommentTranslationProvider implements CommentTranslationProvider {
  readonly id = "openai-mini";
  readonly name = "OpenAI mini translation model";
  readonly runtimeScope = "server-runtime-only" as const;
  readonly secretBoundary = providerSecretBoundary;

  private readonly apiKey: string | null;
  private readonly model: string | null;
  private readonly endpoint: string;
  private readonly fetchImpl: ProviderFetch;

  constructor(config: OpenAIMiniCommentTranslationProviderConfig) {
    this.apiKey = config.apiKey?.trim() || null;
    this.model = config.model?.trim() || null;
    this.endpoint = normalizeEndpoint(config.endpoint, defaultOpenAIEndpoint);
    this.fetchImpl = config.fetchImpl ?? ((url, init) => fetch(url, init));
  }

  async translate(request: CommentTranslationProviderRequest): Promise<CommentTranslationProviderResult> {
    if (!this.apiKey || !this.model) {
      return terminalError("credential-missing", "OpenAI mini provider is not configured in server runtime env.");
    }

    const text = request.input.text.trim();
    if (!text) {
      return terminalError("invalid-request", "Translation text is required.");
    }

    const estimatedInputUnits = estimateOpenAITokens(text);
    const usageHandoff = createUsageHandoff(request, "openai-mini", estimatedInputUnits, estimateOpenAICostMicros(estimatedInputUnits), "miss");

    try {
      const response = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0,
          response_format: {
            type: "json_object"
          },
          messages: [
            {
              role: "system",
              content:
                "Translate short live chat comments. Return strict JSON with exactly translatedText, detectedSourceLanguage, and confidence. Do not include provider names or diagnostics."
            },
            {
              role: "user",
              content: JSON.stringify({
                text,
                sourceLanguage: request.input.sourceLanguage,
                targetLanguage: request.input.targetLanguage,
                glossaryTerms: request.glossary.terms
              })
            }
          ]
        })
      });

      if (!response.ok) {
        return await mapProviderErrorResponse(response, usageHandoff);
      }

      const parsed = parseOpenAITranslationProviderResponse(await response.json());
      if (parsed.status !== "parsed") {
        return terminalError("policy-blocked", "OpenAI mini response failed strict translation output parsing.");
      }

      return {
        type: "translated",
        translatedText: parsed.translatedText,
        detectedSourceLanguage: parsed.detectedSourceLanguage,
        confidence: parsed.confidence,
        cacheOutcome: "miss",
        usageHandoff: createUsageHandoff(
          request,
          "openai-mini",
          Math.max(parsed.totalTokens, estimatedInputUnits),
          estimateOpenAICostMicros(Math.max(parsed.totalTokens, estimatedInputUnits)),
          "miss"
        )
      };
    } catch {
      return recoverableError({
        code: "temporary-unavailable",
        message: "OpenAI mini request failed temporarily.",
        retryAfterMs: null,
        usageHandoff
      });
    }
  }
}

export function parseOpenAITranslationProviderResponse(body: unknown): ParsedOpenAITranslationProviderResponse {
  const content = readOpenAIContent(body);
  if (!content) {
    return {
      status: "invalid",
      reason: "missing-content"
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return {
      status: "invalid",
      reason: "invalid-json"
    };
  }

  if (!isStrictTranslationObject(parsed)) {
    return {
      status: "invalid",
      reason: "invalid-shape"
    };
  }

  return {
    status: "parsed",
    translatedText: parsed.translatedText.trim(),
    detectedSourceLanguage: parsed.detectedSourceLanguage ?? null,
    confidence: parsed.confidence ?? null,
    totalTokens: readOpenAITotalTokens(body)
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

function readOpenAITotalTokens(body: unknown) {
  if (typeof body !== "object" || body === null || !("usage" in body)) {
    return 0;
  }

  const usage = body.usage;
  if (typeof usage !== "object" || usage === null || !("total_tokens" in usage)) {
    return 0;
  }

  return typeof usage.total_tokens === "number" && Number.isFinite(usage.total_tokens) ? Math.max(0, usage.total_tokens) : 0;
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
  const message = sanitizeProviderMessage(await safeReadResponseText(response));

  if (response.status === 429) {
    return recoverableError({
      code: "rate-limited",
      message: message || "Translation provider rate limit reached.",
      retryAfterMs: parseRetryAfterMs(response.headers?.get("retry-after") ?? null),
      usageHandoff
    });
  }

  if (response.status === 408 || response.status === 504) {
    return recoverableError({
      code: "timeout",
      message: message || "Translation provider request timed out.",
      retryAfterMs: null,
      usageHandoff
    });
  }

  if (response.status >= 500 && response.status <= 599) {
    return recoverableError({
      code: "temporary-unavailable",
      message: message || "Translation provider is temporarily unavailable.",
      retryAfterMs: parseRetryAfterMs(response.headers?.get("retry-after") ?? null),
      usageHandoff
    });
  }

  if (response.status === 400 || response.status === 413) {
    return terminalError("invalid-request", message || "Translation provider rejected the request.");
  }

  if (response.status === 401 || response.status === 403 || response.status === 404) {
    return terminalError("provider-not-configured", message || "Translation provider configuration was rejected.");
  }

  return terminalError("policy-blocked", message || "Translation provider rejected this request.");
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

function estimateOpenAITokens(text: string) {
  return Math.max(Math.ceil(Array.from(text).length / 3), 1);
}

function estimateAzureCostMicros(text: string) {
  return estimateCharacters(text);
}

function estimateOpenAICostMicros(totalTokens: number) {
  return Math.max(Math.ceil(totalTokens), 1);
}

async function safeReadResponseText(response: ProviderFetchResponse) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function sanitizeProviderMessage(message: string) {
  return message.replace(/\s+/g, " ").trim().slice(0, maxProviderDiagnosticLength);
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
