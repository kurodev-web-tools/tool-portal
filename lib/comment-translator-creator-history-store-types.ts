export type CommentTranslatorCreatorHistoryStoredRow = {
  readonly ownerUserId: string;
  readonly sessionReferenceId: string;
  readonly recordedAtIso: string;
  readonly rows: readonly unknown[];
};

export type CommentTranslatorCreatorHistoryStore = {
  readonly persistSnapshot: (request: CommentTranslatorCreatorHistoryStoredRow) => Promise<void>;
  readonly readHistorySince: (request: {
    readonly ownerUserId: string;
    readonly cutoffIso: string;
    readonly nowIso: string;
  }) => Promise<readonly CommentTranslatorCreatorHistoryStoredRow[]>;
  readonly deleteExpiredForOwner: (request: {
    readonly ownerUserId: string;
    readonly cutoffIso: string;
  }) => Promise<void>;
  readonly deleteAllForOwner: (request: { readonly ownerUserId: string }) => Promise<void>;
};

export type CommentTranslatorCreatorHistoryStoreFactoryEnvName =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "SUPABASE_SERVICE_ROLE_KEY";

export type CommentTranslatorCreatorHistoryStoreFactoryResult =
  | {
      readonly status: "ready";
      readonly store: CommentTranslatorCreatorHistoryStore;
      readonly missingEnvReferences: readonly [];
    }
  | {
      readonly status: "unavailable";
      readonly store: null;
      readonly missingEnvReferences: readonly CommentTranslatorCreatorHistoryStoreFactoryEnvName[];
      readonly reason:
        | "trusted-service-role-env-missing"
        | "trusted-service-role-client-unavailable";
    };

export type CommentTranslatorCreatorHistorySupabaseResult = {
  readonly data: unknown;
  readonly error: { readonly code?: string; readonly message?: string } | null;
};

export type CommentTranslatorCreatorHistorySupabaseClient = {
  readonly upsertHistory: (request: {
    readonly owner_user_id: string;
    readonly session_reference_id: string;
    readonly history_rows: readonly unknown[];
    readonly recorded_at: string;
    readonly updated_at: string;
  }) => Promise<CommentTranslatorCreatorHistorySupabaseResult>;
  readonly readHistory: (request: {
    readonly ownerUserId: string;
    readonly cutoffIso: string;
    readonly nowIso: string;
  }) => Promise<CommentTranslatorCreatorHistorySupabaseResult>;
  readonly deleteExpired: (request: {
    readonly ownerUserId: string;
    readonly cutoffIso: string;
  }) => Promise<CommentTranslatorCreatorHistorySupabaseResult>;
  readonly deleteAll: (request: {
    readonly ownerUserId: string;
  }) => Promise<CommentTranslatorCreatorHistorySupabaseResult>;
};
