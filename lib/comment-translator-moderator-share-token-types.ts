import "server-only";

export const commentTranslatorModeratorShareScope = "moderator-share-read" as const;

export type CommentTranslatorModeratorShareSessionAuthorityResult =
  | {
      readonly status: "active";
      readonly sessionReferenceId: string;
      readonly expiresAtMs: number;
    }
  | {
      readonly status: "unavailable";
      readonly reason: "active-session-missing" | "session-authority-unavailable";
    };

export type CommentTranslatorModeratorShareSessionAuthority = {
  readonly readCurrentForOwner: (ownerUserId: string) => Promise<CommentTranslatorModeratorShareSessionAuthorityResult>;
};

export type CommentTranslatorModeratorShareTokenRecord = {
  readonly ownerUserId: string;
  readonly sessionReferenceId: string;
  readonly scope: typeof commentTranslatorModeratorShareScope;
  readonly tokenDigest: string;
  readonly issuedAtIso: string;
  readonly expiresAtIso: string;
  readonly revokedAtIso: string | null;
  readonly version: number;
};

export type CommentTranslatorModeratorShareTokenRecordDraft = Omit<CommentTranslatorModeratorShareTokenRecord, "version">;

export type CommentTranslatorModeratorShareTokenStore = {
  readonly readCurrent: (request: {
    readonly ownerUserId: string;
    readonly scope: typeof commentTranslatorModeratorShareScope;
  }) => Promise<CommentTranslatorModeratorShareTokenRecord | null>;
  readonly readByDigest: (request: {
    readonly tokenDigest: string;
    readonly scope: typeof commentTranslatorModeratorShareScope;
  }) => Promise<CommentTranslatorModeratorShareTokenRecord | null>;
  readonly writeCurrent: (request: {
    readonly record: CommentTranslatorModeratorShareTokenRecordDraft;
  }) => Promise<"applied" | "current-token-exists">;
  readonly revokeCurrent: (request: {
    readonly ownerUserId: string;
    readonly scope: typeof commentTranslatorModeratorShareScope;
    readonly revokedAtIso: string;
  }) => Promise<"revoked" | "missing-token">;
};

export type CommentTranslatorModeratorShareTokenStoreFactoryEnvName =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "SUPABASE_SERVICE_ROLE_KEY";

export type CommentTranslatorModeratorShareTokenStoreFactoryResult =
  | {
      readonly status: "ready";
      readonly store: CommentTranslatorModeratorShareTokenStore;
      readonly missingEnvReferences: readonly [];
    }
  | {
      readonly status: "unavailable";
      readonly store: null;
      readonly missingEnvReferences: readonly CommentTranslatorModeratorShareTokenStoreFactoryEnvName[];
      readonly reason: "trusted-service-role-env-missing";
    };

export type CommentTranslatorModeratorShareTokenUnavailableReason =
  | "auth-unavailable"
  | "active-session-unavailable"
  | "token-store-unavailable"
  | "token-missing"
  | "current-token-exists";

export type CommentTranslatorModeratorShareTokenUnavailableResult = {
  readonly status: "unavailable";
  readonly reason: CommentTranslatorModeratorShareTokenUnavailableReason;
  readonly retryable: boolean;
};

export type CommentTranslatorModeratorShareTokenIssueResult =
  | {
      readonly status: "issued";
      readonly token: string;
      readonly scope: typeof commentTranslatorModeratorShareScope;
      readonly expiresAtIso: string;
      readonly access: "read-only";
    }
  | CommentTranslatorModeratorShareTokenUnavailableResult;

export type CommentTranslatorModeratorShareTokenReadResult =
  | {
      readonly status: "ready";
      readonly tokenState: "current";
      readonly scope: typeof commentTranslatorModeratorShareScope;
      readonly expiresAtIso: string;
      readonly access: "read-only";
    }
  | CommentTranslatorModeratorShareTokenUnavailableResult;

export type CommentTranslatorModeratorShareTokenRevokeResult =
  | {
      readonly status: "revoked";
      readonly scope: typeof commentTranslatorModeratorShareScope;
      readonly access: "read-only";
    }
  | CommentTranslatorModeratorShareTokenUnavailableResult;

export type CommentTranslatorModeratorShareTokenValidationResult =
  | {
      readonly status: "authorized";
      readonly scope: typeof commentTranslatorModeratorShareScope;
      readonly access: "read-only";
    }
  | {
      readonly status: "denied";
      readonly reason: "invalid-token" | "moderator-share-unavailable";
      readonly retryable: boolean;
    };

export type CommentTranslatorModeratorShareTokenPrivateAuthorization = {
  readonly status: "authorized";
  readonly ownerUserId: string;
  readonly sessionReferenceId: string;
  readonly tokenVersion: number;
  readonly expiresAtIso: string;
};

export type CommentTranslatorModeratorShareTokenPrivateAuthorizationResult =
  | CommentTranslatorModeratorShareTokenPrivateAuthorization
  | Extract<CommentTranslatorModeratorShareTokenValidationResult, { status: "denied" }>;
