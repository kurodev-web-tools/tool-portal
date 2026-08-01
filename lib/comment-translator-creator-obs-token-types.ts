import "server-only";

export type CommentTranslatorCreatorObsSessionAuthorityResult =
  | { readonly status: "active"; readonly sessionReferenceId: string; readonly expiresAtMs: number }
  | { readonly status: "unavailable"; readonly reason: "active-session-missing" | "session-authority-unavailable" };

export interface CommentTranslatorCreatorObsSessionAuthority {
  readCurrentForOwner(ownerUserId: string): Promise<CommentTranslatorCreatorObsSessionAuthorityResult>;
}

export type CommentTranslatorCreatorObsTokenFailClosedReason =
  | "caller-unavailable"
  | "session-unavailable"
  | "session-mismatch"
  | "token-store-unavailable"
  | "token-missing"
  | "token-replayed"
  | "current-token-exists"
  | "current-token-missing";

export type CommentTranslatorCreatorObsTokenFailClosed = {
  readonly status: "fail-closed";
  readonly reason: CommentTranslatorCreatorObsTokenFailClosedReason;
  readonly retryable: boolean;
  readonly browserSafe: true;
};

export type CommentTranslatorCreatorObsTokenIssueResult =
  | {
      readonly status: "issued" | "rotated";
      readonly token: string;
      readonly scope: "obs-overlay-read";
      readonly access: "read-only";
      readonly expiresAtIso: string;
      readonly browserSafe: true;
    }
  | CommentTranslatorCreatorObsTokenFailClosed;

export type CommentTranslatorCreatorObsTokenSafeStatus =
  | {
      readonly status: "ready";
      readonly scope: "obs-overlay-read";
      readonly access: "read-only";
      readonly expiresAtIso: string;
      readonly browserSafe: true;
    }
  | CommentTranslatorCreatorObsTokenFailClosed;

export type CommentTranslatorCreatorObsTokenRedeemResult =
  | {
      readonly status: "authorized";
      readonly scope: "obs-overlay-read";
      readonly access: "read-only";
      readonly browserSafe: true;
    }
  | {
      readonly status: "denied";
      readonly reason: "invalid-token" | "stale-or-replayed-token" | "overlay-unavailable";
      readonly retryable: boolean;
      readonly browserSafe: true;
    };
