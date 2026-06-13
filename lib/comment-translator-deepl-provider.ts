import "server-only";

import type {
  CommentTranslationProvider,
  CommentTranslationProviderRecoverableError,
  CommentTranslationProviderRequest,
  CommentTranslationProviderResult,
  CommentTranslationProviderSecretBoundary,
  CommentTranslationUsageHandoff
} from "./comment-translator-provider-boundary";

export const deeplCommentTranslationProviderId = "deepl-text-v2";

export const deeplCommentTranslationProviderEnv = {
  authKey: "DEEPL_AUTH_KEY",
  apiBaseUrl: "DEEPL_API_BASE_URL",
  timeoutMs: "DEEPL_TIMEOUT_MS"
} as const;

type DeepLFetchResponse = {
  ok: boolean;
  status: number;
  headers?: {
    get(name: string): string | null;
  };
  json(): Promise<unknown>;
  text(): Promise<string>;
};

type DeepLFetch = (url: string, init: RequestInit) => Promise<DeepLFetchResponse>;

export type DeepLCommentTranslationProviderConfig = {
  authKey: string | null | undefined;
  apiBaseUrl?: string | null;
  timeoutMs?: number | null;
  fetchImpl?: DeepLFetch;
};

type DeepLTranslateResponse = {
  translations?: Array<{
    detected_source_language?: string;
    text?: string;
  }>;
  billed_characters?: number;
};

const deeplProviderSecretBoundary = {
  runtime: "server-env-only",
  clientBundle: "forbidden",
  fixtures: "forbidden",
  docsAndTaskNotes: "no-secret-values"
} as const satisfies CommentTranslationProviderSecretBoundary;

const defaultApiBaseUrl = "https://api-free.deepl.com";
const defaultTimeoutMs = 5000;
const maxDiagnosticMessageLength = 160;

const sourceLanguageMap: Record<string, string> = {
  en: "EN",
  es: "ES",
  ja: "JA",
  ko: "KO"
};

const targetLanguageMap: Record<string, string> = {
  en: "EN-US",
  es: "ES",
  ja: "JA",
  ko: "KO"
};

export function readDeepLCommentTranslationProviderConfig(
  env: Record<string, string | undefined> = process.env
): DeepLCommentTranslationProviderConfig {
  return {
    authKey: env[deeplCommentTranslationProviderEnv.authKey]?.trim() ?? null,
    apiBaseUrl: normalizeApiBaseUrl(env[deeplCommentTranslationProviderEnv.apiBaseUrl]),
    timeoutMs: parseTimeoutMs(env[deeplCommentTranslationProviderEnv.timeoutMs])
  };
}

export function createDeepLCommentTranslationProvider(config: DeepLCommentTranslationProviderConfig) {
  return new DeepLCommentTranslationProvider(config);
}

export class DeepLCommentTranslationProvider implements CommentTranslationProvider {
  readonly id = deeplCommentTranslationProviderId;
  readonly name = "DeepL Text Translation API v2";
  readonly runtimeScope = "server-runtime-only" as const;
  readonly secretBoundary = deeplProviderSecretBoundary;

  private readonly authKey: string | null;
  private readonly apiBaseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: DeepLFetch;

  constructor(config: DeepLCommentTranslationProviderConfig) {
    this.authKey = config.authKey?.trim() || null;
    this.apiBaseUrl = normalizeApiBaseUrl(config.apiBaseUrl);
    this.timeoutMs = config.timeoutMs && Number.isFinite(config.timeoutMs) ? config.timeoutMs : defaultTimeoutMs;
    this.fetchImpl = config.fetchImpl ?? ((url, init) => fetch(url, init));
  }

  async translate(request: CommentTranslationProviderRequest): Promise<CommentTranslationProviderResult> {
    if (!this.authKey) {
      return {
        type: "terminal-error",
        code: "credential-missing",
        message: "DeepL provider is not configured in server runtime env.",
        retry: {
          retryable: false
        }
      };
    }

    const text = request.input.text.trim();
    if (!text) {
      return {
        type: "terminal-error",
        code: "invalid-request",
        message: "Translation text is required.",
        retry: {
          retryable: false
        }
      };
    }

    const targetLanguage = normalizeLanguage(request.input.targetLanguage, targetLanguageMap);
    if (!targetLanguage) {
      return unsupportedLanguage("Target language is not supported by the DeepL prototype.");
    }

    const sourceLanguage =
      request.input.sourceLanguage === "auto"
        ? null
        : normalizeLanguage(request.input.sourceLanguage, sourceLanguageMap);
    if (request.input.sourceLanguage !== "auto" && !sourceLanguage) {
      return unsupportedLanguage("Source language is not supported by the DeepL prototype.");
    }

    const usageHandoff = createUsageHandoff(request, estimateTextUnits(text), "miss");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(`${this.apiBaseUrl}/v2/translate`, {
        method: "POST",
        headers: {
          Authorization: `DeepL-Auth-Key ${this.authKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: [text],
          target_lang: targetLanguage,
          ...(sourceLanguage ? { source_lang: sourceLanguage } : {}),
          show_billed_characters: true
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        return await mapDeepLErrorResponse(response, usageHandoff);
      }

      const body = (await response.json()) as DeepLTranslateResponse;
      const translation = body.translations?.[0];
      if (!translation?.text) {
        return recoverableError({
          code: "temporary-unavailable",
          message: "DeepL response did not contain translated text.",
          retryAfterMs: null,
          usageHandoff
        });
      }

      return {
        type: "translated",
        translatedText: translation.text,
        detectedSourceLanguage: translation.detected_source_language ?? null,
        confidence: null,
        cacheOutcome: "miss",
        usageHandoff: createUsageHandoff(request, body.billed_characters ?? estimateTextUnits(text), "miss")
      };
    } catch (error) {
      return recoverableError({
        code: isAbortError(error) ? "timeout" : "temporary-unavailable",
        message: isAbortError(error) ? "DeepL request timed out." : "DeepL request failed temporarily.",
        retryAfterMs: null,
        usageHandoff
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}

function normalizeApiBaseUrl(value: string | null | undefined) {
  const baseUrl = value?.trim() || defaultApiBaseUrl;
  return baseUrl.replace(/\/+$/, "");
}

function parseTimeoutMs(value: string | undefined) {
  if (!value) {
    return defaultTimeoutMs;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return defaultTimeoutMs;
  }

  return Math.min(parsed, 30_000);
}

function normalizeLanguage(language: string, knownMap: Record<string, string>) {
  const normalized = language.trim().toLocaleLowerCase();
  if (knownMap[normalized]) {
    return knownMap[normalized];
  }

  if (/^[a-z]{2}(?:-[a-z]{2})?$/i.test(language.trim())) {
    return language.trim().toLocaleUpperCase();
  }

  return null;
}

function unsupportedLanguage(message: string): CommentTranslationProviderResult {
  return {
    type: "terminal-error",
    code: "unsupported-language",
    message,
    retry: {
      retryable: false
    }
  };
}

function createUsageHandoff(
  request: CommentTranslationProviderRequest,
  estimatedUnits: number,
  cacheOutcome: CommentTranslationUsageHandoff["cacheOutcome"]
): CommentTranslationUsageHandoff {
  return {
    ...request.usageHandoff,
    providerId: deeplCommentTranslationProviderId,
    estimatedUnits,
    cacheOutcome,
    enforcement: "not-implemented",
    databaseWrite: "not-implemented",
    logPolicy: "short-lived-provider-diagnostic-only"
  };
}

function estimateTextUnits(text: string) {
  return Math.max(Array.from(text).length, 1);
}

async function mapDeepLErrorResponse(
  response: DeepLFetchResponse,
  usageHandoff: CommentTranslationUsageHandoff
): Promise<CommentTranslationProviderResult> {
  const message = sanitizeProviderMessage(await safeReadResponseText(response));

  if (response.status === 429) {
    return recoverableError({
      code: "rate-limited",
      message: message || "DeepL rate limit reached.",
      retryAfterMs: parseRetryAfterMs(response.headers?.get("retry-after") ?? null),
      usageHandoff
    });
  }

  if (response.status === 408 || response.status === 504) {
    return recoverableError({
      code: "timeout",
      message: message || "DeepL request timed out.",
      retryAfterMs: null,
      usageHandoff
    });
  }

  if (response.status >= 500 && response.status <= 599) {
    return recoverableError({
      code: "temporary-unavailable",
      message: message || "DeepL service is temporarily unavailable.",
      retryAfterMs: parseRetryAfterMs(response.headers?.get("retry-after") ?? null),
      usageHandoff
    });
  }

  if (response.status === 400 || response.status === 413) {
    return {
      type: "terminal-error",
      code: "invalid-request",
      message: message || "DeepL rejected the translation request.",
      retry: {
        retryable: false
      }
    };
  }

  if (response.status === 401 || response.status === 403 || response.status === 404) {
    return {
      type: "terminal-error",
      code: "provider-not-configured",
      message: message || "DeepL provider configuration was rejected.",
      retry: {
        retryable: false
      }
    };
  }

  return {
    type: "terminal-error",
    code: "policy-blocked",
    message: message || "DeepL provider rejected this request.",
    retry: {
      retryable: false
    }
  };
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

async function safeReadResponseText(response: DeepLFetchResponse) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function sanitizeProviderMessage(message: string) {
  return message.replace(/\s+/g, " ").trim().slice(0, maxDiagnosticMessageLength);
}

function isAbortError(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }

  return typeof error === "object" && error !== null && "name" in error && error.name === "AbortError";
}
