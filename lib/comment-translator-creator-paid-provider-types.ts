import type { CommentTranslationProviderRequest } from "./comment-translator-provider-boundary";
import type {
  CommentTranslatorCreatorCallerAuthority,
  CommentTranslatorCreatorPaidProviderAuthorization
} from "./comment-translator-creator-entitlement-runtime";
import type { CommentTranslatorCreatorEntitlementRecord } from "./comment-translator-creator-entitlement-store";
import type { createCommentTranslatorCreatorGlossaryRuntime } from "./comment-translator-creator-glossary-runtime";
import type { CommentTranslatorCreatorUsageRuntime } from "./comment-translator-creator-usage-runtime";
import type { CommentTranslatorProviderExecutionCache } from "./comment-translator-provider-execution-runtime";
import type { CommentTranslatorTranslationProviderSet } from "./comment-translator-provider-policy-runtime";
import type { CommentTranslatorCreatorUsageCounts } from "./comment-translator-creator-usage-store";
import type { YouTubeProviderSafeCommentPayload } from "./comment-translator-youtube-input-boundary";

export type CreatorPaidBudgetAuthorization =
  | { readonly status: "authorized" }
  | { readonly status: "blocked"; readonly reason: "over-limit" | "unavailable" };

export type ProviderRequestFactoryResult =
  | { readonly status: "ready"; readonly providerRequest: CommentTranslationProviderRequest }
  | { readonly status: "rejected" };

export type CreatorPaidProviderFailureReason =
  | Exclude<CommentTranslatorCreatorPaidProviderAuthorization, { readonly status: "ready" }>["reason"]
  | "budget-over-limit"
  | "budget-unavailable"
  | "provider-config-missing"
  | "glossary-unavailable"
  | "provider-request-rejected"
  | "provider-timeout"
  | "provider-recoverable"
  | "provider-terminal"
  | "accounting-unavailable";

export type CommentTranslatorCreatorPaidProviderResult =
  | {
      readonly status: "success";
      readonly source: "provider" | "cache";
      readonly translatedText: string;
      readonly detectedSourceLanguage: string | null;
      readonly confidence: number | null;
      readonly accounting: "provider-success-accounting-committed" | "cache-hit-not-counted";
      readonly counts: CommentTranslatorCreatorUsageCounts | null;
      readonly browserSafe: true;
    }
  | {
      readonly status: "fail-closed";
      readonly reason: CreatorPaidProviderFailureReason;
      readonly providerExecution: "not-started" | "failed" | "succeeded-accounting-failed";
      readonly translatedText: null;
      readonly accounting: "not-committed";
      readonly browserSafe: true;
    };

export type CommentTranslatorCreatorPaidProviderRuntimeDependencies = {
  readonly entitlementAuthorizer: {
    authorize(callerAuthority: CommentTranslatorCreatorCallerAuthority): Promise<CommentTranslatorCreatorPaidProviderAuthorization>;
  };
  readonly budgetAuthorizer: {
    authorize(request: {
      readonly ownerUserId: string;
      readonly entitlement: CommentTranslatorCreatorEntitlementRecord;
      readonly providerInputCharacterCount: number;
    }): Promise<CreatorPaidBudgetAuthorization>;
  };
  readonly glossaryRuntime: Pick<ReturnType<typeof createCommentTranslatorCreatorGlossaryRuntime>, "resolveProviderContext">;
  readonly usageRuntime: CommentTranslatorCreatorUsageRuntime;
  readonly providerRequestFactory: (request: {
    readonly comment: YouTubeProviderSafeCommentPayload;
    readonly targetLanguage: string;
    readonly sourceLanguages?: readonly string[];
    readonly glossaryTerms: readonly string[];
    readonly glossaryVersion: string;
  }) => ProviderRequestFactoryResult;
  readonly providers: CommentTranslatorTranslationProviderSet;
  readonly cache: CommentTranslatorProviderExecutionCache;
  readonly timeoutMs: number;
};

export type CommentTranslatorCreatorPaidProviderRequest = {
  readonly callerAuthority: CommentTranslatorCreatorCallerAuthority;
  readonly comment: YouTubeProviderSafeCommentPayload;
  readonly targetLanguage: string;
  readonly sourceLanguages?: readonly string[];
};
