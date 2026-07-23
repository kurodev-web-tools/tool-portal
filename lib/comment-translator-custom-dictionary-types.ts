import "server-only";

import type { YouTubeOAuthCredentialStatusCallerAuthorization } from "./comment-translator-youtube-credential-status-boundary";

export const commentTranslatorCustomDictionarySourceLanguages = ["ja", "en", "ko", "zh"] as const;
export const commentTranslatorCustomDictionaryTargetLanguages = ["ja", "en"] as const;

export type CommentTranslatorCustomDictionarySourceLanguage =
  (typeof commentTranslatorCustomDictionarySourceLanguages)[number];
export type CommentTranslatorCustomDictionaryTargetLanguage =
  (typeof commentTranslatorCustomDictionaryTargetLanguages)[number];

export type CommentTranslatorCustomDictionaryEntryRecord = {
  readonly ownerUserId: string;
  readonly entryId: string;
  readonly term: string;
  readonly normalizedTerm: string;
  readonly replacement: string;
  readonly note: string | null;
  readonly sourceLanguage: CommentTranslatorCustomDictionarySourceLanguage;
  readonly targetLanguage: CommentTranslatorCustomDictionaryTargetLanguage;
  readonly createdAtIso: string;
  readonly updatedAtIso: string;
};

export type CommentTranslatorCustomDictionaryEntryWrite = Omit<
  CommentTranslatorCustomDictionaryEntryRecord,
  "ownerUserId"
>;

export type CommentTranslatorCustomDictionaryStoreMutationResult =
  | "applied"
  | "unchanged"
  | "duplicate-entry"
  | "conflicting-entry"
  | "term-limit-reached"
  | "entry-missing"
  | "stale-entry"
  | "invalid-entry";

export interface CommentTranslatorCustomDictionaryStore {
  readCurrent(request: { readonly ownerUserId: string }): Promise<readonly CommentTranslatorCustomDictionaryEntryRecord[]>;
  createEntry(request: {
    readonly ownerUserId: string;
    readonly entry: CommentTranslatorCustomDictionaryEntryWrite;
  }): Promise<CommentTranslatorCustomDictionaryStoreMutationResult>;
  updateEntry(request: {
    readonly ownerUserId: string;
    readonly entryId: string;
    readonly expectedUpdatedAtIso: string;
    readonly entry: CommentTranslatorCustomDictionaryEntryWrite;
  }): Promise<CommentTranslatorCustomDictionaryStoreMutationResult>;
  deleteEntry(request: {
    readonly ownerUserId: string;
    readonly entryId: string;
    readonly expectedUpdatedAtIso: string;
  }): Promise<CommentTranslatorCustomDictionaryStoreMutationResult>;
}

export type CommentTranslatorCustomDictionaryStoreFactoryEnvName =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "SUPABASE_SERVICE_ROLE_KEY";

export type CommentTranslatorCustomDictionaryStoreFactoryResult =
  | {
      readonly status: "ready";
      readonly store: CommentTranslatorCustomDictionaryStore;
      readonly missingEnvReferences: readonly [];
    }
  | {
      readonly status: "unavailable";
      readonly store: null;
      readonly missingEnvReferences: readonly CommentTranslatorCustomDictionaryStoreFactoryEnvName[];
      readonly reason: "trusted-service-role-env-missing";
    };

export type CommentTranslatorCustomDictionaryRuntimeAuthority = {
  readonly callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  readonly dictionaryStore?: CommentTranslatorCustomDictionaryStoreFactoryResult;
};

export type CommentTranslatorCustomDictionaryInput = {
  readonly term: string;
  readonly replacement: string;
  readonly note?: string | null;
  readonly sourceLanguage: string;
  readonly targetLanguage: string;
};

export type CommentTranslatorCustomDictionaryUpdateInput = CommentTranslatorCustomDictionaryInput & {
  readonly entryId: string;
  readonly expectedUpdatedAtIso: string;
};

export type CommentTranslatorCustomDictionaryMutationResult =
  | {
      readonly status: "applied";
      readonly operation: "create" | "update" | "delete";
      readonly currentTermCount: number;
      readonly dictionaryVersion: string | null;
      readonly browserReadableEntryContent: "not-returned-by-design";
    }
  | {
      readonly status: "unavailable";
      readonly reason:
        | "auth-unavailable"
        | "dictionary-store-unavailable"
        | "invalid-entry"
        | "duplicate-entry"
        | "conflicting-entry"
        | "term-limit-reached"
        | "entry-missing"
        | "stale-entry";
      readonly retryable: boolean;
      readonly browserReadableEntryContent: "not-returned-by-design";
    };
