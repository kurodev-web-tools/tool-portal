import "server-only";

export const commentTranslatorCreatorModeratorTokenScope = "moderator-share-read" as const;

export type CommentTranslatorCreatorModeratorSessionAuthorityResult =
  | { readonly status: "active"; readonly sessionReferenceId: string; readonly expiresAtMs: number }
  | { readonly status: "unavailable"; readonly reason: "active-session-missing" | "session-authority-unavailable" };

export interface CommentTranslatorCreatorModeratorSessionAuthority {
  readCurrentForOwner(ownerUserId: string, nowMs?: number): Promise<CommentTranslatorCreatorModeratorSessionAuthorityResult>;
}

export type CommentTranslatorCreatorModeratorTokenRecord = {
  readonly ownerUserId: string;
  readonly sessionReferenceId: string;
  readonly scope: typeof commentTranslatorCreatorModeratorTokenScope;
  readonly tokenDigest: string;
  readonly issuedAtIso: string;
  readonly expiresAtIso: string;
  readonly revokedAtIso: string | null;
  readonly redeemedAtIso: string | null;
  readonly version: number;
};

export type CommentTranslatorCreatorModeratorTokenRecordDraft = Omit<CommentTranslatorCreatorModeratorTokenRecord, "scope" | "version">;

export interface CommentTranslatorCreatorModeratorTokenStore {
  readCurrent(request: { readonly ownerUserId: string; readonly nowIso: string }): Promise<
    | { readonly status: "ready"; readonly record: CommentTranslatorCreatorModeratorTokenRecord }
    | { readonly status: "missing" | "unreadable" }
  >;
  readByDigest(request: { readonly tokenDigest: string; readonly nowIso: string }): Promise<
    | { readonly status: "ready"; readonly record: CommentTranslatorCreatorModeratorTokenRecord }
    | { readonly status: "missing" | "unreadable" }
  >;
  issueCurrent(request: { readonly record: CommentTranslatorCreatorModeratorTokenRecordDraft }): Promise<
    | { readonly status: "applied" }
    | { readonly status: "rejected"; readonly reason: "current-token-exists" | "session-mismatch" | "unreadable" }
  >;
  revokeCurrent(request: {
    readonly ownerUserId: string;
    readonly sessionReferenceId: string;
    readonly revokedAtIso: string;
  }): Promise<{ readonly status: "revoked" | "missing" | "unreadable" }>;
}

export type CommentTranslatorCreatorModeratorTokenFailClosedReason =
  | "caller-unavailable"
  | "session-unavailable"
  | "session-mismatch"
  | "token-store-unavailable"
  | "token-missing"
  | "current-token-exists";

export type CommentTranslatorCreatorModeratorTokenFailClosed = {
  readonly status: "fail-closed";
  readonly reason: CommentTranslatorCreatorModeratorTokenFailClosedReason;
  readonly retryable: boolean;
  readonly browserSafe: true;
};

export type CommentTranslatorCreatorModeratorTokenIssueResult =
  | {
      readonly status: "issued";
      readonly token: string;
      readonly scope: typeof commentTranslatorCreatorModeratorTokenScope;
      readonly access: "read-only";
      readonly expiresAtIso: string;
      readonly browserSafe: true;
    }
  | CommentTranslatorCreatorModeratorTokenFailClosed;

export type CommentTranslatorCreatorModeratorTokenSafeStatus =
  | {
      readonly status: "ready";
      readonly scope: typeof commentTranslatorCreatorModeratorTokenScope;
      readonly access: "read-only";
      readonly expiresAtIso: string;
      readonly browserSafe: true;
    }
  | CommentTranslatorCreatorModeratorTokenFailClosed;

export type CommentTranslatorCreatorModeratorTokenValidationResult =
  | {
      readonly status: "authorized";
      readonly scope: typeof commentTranslatorCreatorModeratorTokenScope;
      readonly access: "read-only";
      readonly browserSafe: true;
    }
  | {
      readonly status: "denied";
      readonly reason: "invalid-token" | "moderator-share-unavailable";
      readonly retryable: boolean;
      readonly browserSafe: true;
    };

type CommentTranslatorCreatorModeratorTokenPrivateDenied = Extract<
  CommentTranslatorCreatorModeratorTokenValidationResult,
  { readonly status: "denied" }
>;

export type CommentTranslatorCreatorModeratorTokenBrowserSessionValidation =
  | {
      readonly status: "authorized";
      readonly expiresAtIso: string;
    }
  | CommentTranslatorCreatorModeratorTokenPrivateDenied;

export interface CommentTranslatorCreatorModeratorTokenBrowserSessionAuthority {
  validateBrowserSession(request: {
    readonly ownerUserId: string;
    readonly sessionReferenceId: string;
    readonly tokenVersion: number;
    readonly expiresAtIso: string;
    readonly nowMs: number;
  }): Promise<CommentTranslatorCreatorModeratorTokenBrowserSessionValidation>;
}
