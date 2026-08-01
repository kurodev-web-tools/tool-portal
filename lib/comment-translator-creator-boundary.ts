import "server-only";

export type CommentTranslatorCreatorCallerAuthorization = {
  readonly status: "authenticated" | "unauthenticated" | "unavailable";
};

export type CommentTranslatorCreatorUnavailableResult = {
  readonly status: "unavailable";
  readonly reason: "creator-authority-unavailable";
  readonly plan: "free";
  readonly creatorAccess: false;
  readonly providerExecutionAllowed: false;
  readonly persistenceAllowed: false;
  readonly browserAuthority: "ignored";
};

export interface CommentTranslatorCreatorBoundary {
  readonly mode: "unavailable";
  authorize(
    callerAuthorization: CommentTranslatorCreatorCallerAuthorization
  ): Promise<CommentTranslatorCreatorUnavailableResult>;
}

export const commentTranslatorCreatorBoundaryContract = {
  implementationStage: "nc-f1-disabled-creator-boundary",
  runtime: "server-only",
  authorization: "caller-derived-server-only",
  authority: "unavailable-fail-closed",
  failClosedAuthorityStates: ["missing", "unreadable", "inactive"],
  providerExecution: "forbidden",
  persistence: "forbidden",
  browserAuthority: "ignored",
  freeBehavior: "unchanged",
  containerFallback: "forbidden"
} as const;

const creatorUnavailableResult = {
  status: "unavailable",
  reason: "creator-authority-unavailable",
  plan: "free",
  creatorAccess: false,
  providerExecutionAllowed: false,
  persistenceAllowed: false,
  browserAuthority: "ignored"
} as const satisfies CommentTranslatorCreatorUnavailableResult;

export function createUnavailableCommentTranslatorCreatorBoundary(): CommentTranslatorCreatorBoundary {
  return {
    mode: "unavailable",
    async authorize(callerAuthorization) {
      void callerAuthorization;
      return creatorUnavailableResult;
    }
  };
}
