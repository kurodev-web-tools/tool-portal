import "server-only";

export const commentTranslatorObsOverlayScope = "obs-overlay-read" as const;

export type CommentTranslatorObsOverlaySessionAuthorityResult =
  | {
      readonly status: "active";
      readonly sessionReferenceId: string;
      readonly expiresAtMs: number;
    }
  | {
      readonly status: "unavailable";
      readonly reason: "active-session-missing" | "session-authority-unavailable";
    };

export type CommentTranslatorObsOverlaySessionAuthority = {
  readonly readCurrentForOwner: (ownerUserId: string) => Promise<CommentTranslatorObsOverlaySessionAuthorityResult>;
};

export type CommentTranslatorObsOverlayTokenRecord = {
  readonly ownerUserId: string;
  readonly sessionReferenceId: string;
  readonly scope: typeof commentTranslatorObsOverlayScope;
  readonly tokenDigest: string;
  readonly issuedAtIso: string;
  readonly expiresAtIso: string;
  readonly revokedAtIso: string | null;
  readonly version: number;
};

export type CommentTranslatorObsOverlayTokenRecordDraft = Omit<CommentTranslatorObsOverlayTokenRecord, "version">;

export type CommentTranslatorObsOverlayTokenStore = {
  readonly readCurrent: (request: {
    readonly ownerUserId: string;
    readonly scope: typeof commentTranslatorObsOverlayScope;
  }) => Promise<CommentTranslatorObsOverlayTokenRecord | null>;
  readonly readByDigest: (request: {
    readonly tokenDigest: string;
    readonly scope: typeof commentTranslatorObsOverlayScope;
  }) => Promise<CommentTranslatorObsOverlayTokenRecord | null>;
  readonly writeCurrent: (request: {
    readonly mode: "issue" | "rotate";
    readonly record: CommentTranslatorObsOverlayTokenRecordDraft;
  }) => Promise<"applied" | "current-token-exists" | "missing-current-token">;
  readonly revokeCurrent: (request: {
    readonly ownerUserId: string;
    readonly scope: typeof commentTranslatorObsOverlayScope;
    readonly revokedAtIso: string;
  }) => Promise<"revoked" | "missing-token">;
};

export type CommentTranslatorObsOverlayTokenStoreFactoryEnvName =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "SUPABASE_SERVICE_ROLE_KEY";

export type CommentTranslatorObsOverlayTokenStoreFactoryResult =
  | {
      readonly status: "ready";
      readonly store: CommentTranslatorObsOverlayTokenStore;
      readonly missingEnvReferences: readonly [];
    }
  | {
      readonly status: "unavailable";
      readonly store: null;
      readonly missingEnvReferences: readonly CommentTranslatorObsOverlayTokenStoreFactoryEnvName[];
      readonly reason: "trusted-service-role-env-missing";
    };

export type CommentTranslatorObsOverlayTokenUnavailableReason =
  | "auth-unavailable"
  | "active-session-unavailable"
  | "token-store-unavailable"
  | "token-missing"
  | "current-token-exists"
  | "current-token-missing";

export type CommentTranslatorObsOverlayTokenUnavailableResult = {
  readonly status: "unavailable";
  readonly reason: CommentTranslatorObsOverlayTokenUnavailableReason;
  readonly retryable: boolean;
};

export type CommentTranslatorObsOverlayTokenIssueResult =
  | {
      readonly status: "issued" | "rotated";
      readonly token: string;
      readonly scope: typeof commentTranslatorObsOverlayScope;
      readonly expiresAtIso: string;
      readonly access: "read-only";
    }
  | CommentTranslatorObsOverlayTokenUnavailableResult;

export type CommentTranslatorObsOverlayTokenReadResult =
  | {
      readonly status: "ready";
      readonly tokenState: "current";
      readonly scope: typeof commentTranslatorObsOverlayScope;
      readonly expiresAtIso: string;
      readonly access: "read-only";
    }
  | CommentTranslatorObsOverlayTokenUnavailableResult;

export type CommentTranslatorObsOverlayTokenRevokeResult =
  | {
      readonly status: "revoked";
      readonly scope: typeof commentTranslatorObsOverlayScope;
      readonly access: "read-only";
    }
  | CommentTranslatorObsOverlayTokenUnavailableResult;

export type CommentTranslatorObsOverlayTokenValidationResult =
  | {
      readonly status: "authorized";
      readonly scope: typeof commentTranslatorObsOverlayScope;
      readonly access: "read-only";
    }
  | {
      readonly status: "denied";
      readonly reason: "invalid-token" | "overlay-unavailable";
      readonly retryable: boolean;
    };

export type CommentTranslatorObsOverlayTokenPrivateAuthorization = {
  readonly status: "authorized";
  readonly ownerUserId: string;
  readonly sessionReferenceId: string;
  readonly tokenVersion: number;
  readonly expiresAtIso: string;
};

export type CommentTranslatorObsOverlayTokenPrivateAuthorizationResult =
  | CommentTranslatorObsOverlayTokenPrivateAuthorization
  | Extract<CommentTranslatorObsOverlayTokenValidationResult, { status: "denied" }>;
