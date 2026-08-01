import "server-only";

import type { CommentTranslatorCreatorEntitlementStore } from "./comment-translator-creator-entitlement-store";

export type CommentTranslatorCreatorCallerAuthority =
  | {
      readonly status: "authenticated";
      readonly ownerUserId: string;
    }
  | {
      readonly status: "unauthenticated";
    }
  | {
      readonly status: "unavailable";
    };

export type CommentTranslatorCreatorEntitlementProjection = {
  readonly status: "free" | "paid-inactive";
  readonly reason:
    | "caller-not-authenticated"
    | "auth-unavailable"
    | "activation-closed"
    | "entitlement-missing"
    | "entitlement-unreadable"
    | "entitlement-invalid"
    | "entitlement-inactive"
    | "entitlement-expired";
  readonly plan: "free";
  readonly creatorAccess: false;
  readonly paidActivation: "closed";
  readonly entitlementAuthority: "not-read" | "nc-d1-durable-store";
  readonly providerExecutionAllowed: false;
  readonly persistenceAllowed: false;
  readonly browserAuthority: "ignored";
};

export type CommentTranslatorCreatorEntitlementRuntime = {
  resolve(
    callerAuthority: CommentTranslatorCreatorCallerAuthority
  ): Promise<CommentTranslatorCreatorEntitlementProjection>;
};

export const commentTranslatorCreatorEntitlementRuntimeContract = {
  implementationStage: "nc-e1-local-entitlement-runtime",
  runtime: "server-only",
  callerAuthority: "server-derived-action-context-only",
  paidAuthority: "nc-d1-durable-store-only",
  writeAuthority: "signed-stripe-webhook-evidence-only",
  activationPolicy: "fixed-closed",
  productionStoreWiring: "disconnected-until-migration-apply-approved",
  browserAuthority: "ignored",
  browserProjection: "sanitized-free-or-paid-inactive-only",
  providerExecution: "forbidden",
  containerFallback: "forbidden"
} as const;

export function authorizeCommentTranslatorCreatorCaller({
  callerUserId,
  authUnavailable = false
}: {
  readonly callerUserId: string | null;
  readonly authUnavailable?: boolean;
}): CommentTranslatorCreatorCallerAuthority {
  if (authUnavailable) return { status: "unavailable" };
  if (!callerUserId) return { status: "unauthenticated" };
  return { status: "authenticated", ownerUserId: callerUserId };
}

export function createCommentTranslatorCreatorEntitlementRuntime({
  entitlementStore
}: {
  readonly entitlementStore: Pick<CommentTranslatorCreatorEntitlementStore, "readEntitlement">;
}): CommentTranslatorCreatorEntitlementRuntime {
  return {
    async resolve(callerAuthority) {
      switch (callerAuthority.status) {
        case "unauthenticated":
          return createProjection("free", "caller-not-authenticated", "not-read");
        case "unavailable":
          return createProjection("free", "auth-unavailable", "not-read");
        case "authenticated": {
          const read = await entitlementStore.readEntitlement({ ownerUserId: callerAuthority.ownerUserId });
          switch (read.status) {
            case "ready":
              return createProjection("paid-inactive", "activation-closed", "nc-d1-durable-store");
            case "paid-inactive":
              return createProjection(
                "paid-inactive",
                readPaidInactiveReason(read.reason),
                "nc-d1-durable-store"
              );
            default:
              return assertNever(read);
          }
        }
        default:
          return assertNever(callerAuthority);
      }
    }
  };
}

function readPaidInactiveReason(
  reason: "missing" | "unreadable" | "malformed" | "inactive" | "stale"
): CommentTranslatorCreatorEntitlementProjection["reason"] {
  switch (reason) {
    case "missing":
      return "entitlement-missing";
    case "unreadable":
      return "entitlement-unreadable";
    case "malformed":
      return "entitlement-invalid";
    case "inactive":
      return "entitlement-inactive";
    case "stale":
      return "entitlement-expired";
    default:
      return assertNever(reason);
  }
}

function createProjection(
  status: CommentTranslatorCreatorEntitlementProjection["status"],
  reason: CommentTranslatorCreatorEntitlementProjection["reason"],
  entitlementAuthority: CommentTranslatorCreatorEntitlementProjection["entitlementAuthority"]
): CommentTranslatorCreatorEntitlementProjection {
  return {
    status,
    reason,
    plan: "free",
    creatorAccess: false,
    paidActivation: "closed",
    entitlementAuthority,
    providerExecutionAllowed: false,
    persistenceAllowed: false,
    browserAuthority: "ignored"
  };
}

function assertNever(value: never): never {
  void value;
  throw new TypeError("Unreachable Creator entitlement state");
}
