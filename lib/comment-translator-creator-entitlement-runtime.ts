import "server-only";

import type {
  CommentTranslatorCreatorEntitlementRead,
  CommentTranslatorCreatorEntitlementStore
} from "./comment-translator-creator-entitlement-store";

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

export type CommentTranslatorCreatorPaidActivationPolicy =
  | { readonly status: "closed" }
  | { readonly status: "allowed"; readonly authority: "server-owned-approved" };

export type CommentTranslatorCreatorPaidProviderAuthorization =
  | {
      readonly status: "ready";
      readonly callerAuthority: Extract<CommentTranslatorCreatorCallerAuthority, { readonly status: "authenticated" }>;
      readonly entitlementRead: Extract<CommentTranslatorCreatorEntitlementRead, { readonly status: "ready" }>;
    }
  | {
      readonly status: "fail-closed";
      readonly reason:
        | "caller-not-authenticated"
        | "auth-unavailable"
        | "activation-closed"
        | "entitlement-missing"
        | "entitlement-unreadable"
        | "entitlement-invalid"
        | "entitlement-inactive"
        | "entitlement-expired";
    };

export const commentTranslatorCreatorPaidActivationPolicy = {
  status: "closed"
} as const satisfies CommentTranslatorCreatorPaidActivationPolicy;

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

export async function authorizeCommentTranslatorCreatorPaidProvider({
  callerAuthority,
  entitlementStore,
  activationPolicy = commentTranslatorCreatorPaidActivationPolicy,
  nowMs = () => Date.now()
}: {
  readonly callerAuthority: CommentTranslatorCreatorCallerAuthority;
  readonly entitlementStore: Pick<CommentTranslatorCreatorEntitlementStore, "readEntitlement">;
  readonly activationPolicy?: CommentTranslatorCreatorPaidActivationPolicy;
  readonly nowMs?: () => number;
}): Promise<CommentTranslatorCreatorPaidProviderAuthorization> {
  switch (callerAuthority.status) {
    case "unauthenticated":
      return { status: "fail-closed", reason: "caller-not-authenticated" };
    case "unavailable":
      return { status: "fail-closed", reason: "auth-unavailable" };
    case "authenticated":
      break;
    default:
      return assertNever(callerAuthority);
  }

  if (activationPolicy.status === "closed") {
    return { status: "fail-closed", reason: "activation-closed" };
  }

  let entitlementRead: CommentTranslatorCreatorEntitlementRead;
  try {
    entitlementRead = await entitlementStore.readEntitlement({ ownerUserId: callerAuthority.ownerUserId });
  } catch (error) {
    if (error instanceof Error) return { status: "fail-closed", reason: "entitlement-unreadable" };
    return { status: "fail-closed", reason: "entitlement-unreadable" };
  }

  switch (entitlementRead.status) {
    case "ready": {
      const periodStartMs = Date.parse(entitlementRead.entitlement.periodStartIso);
      const periodEndMs = Date.parse(entitlementRead.entitlement.periodEndIso);
      if (!Number.isFinite(periodStartMs) || !Number.isFinite(periodEndMs) || periodEndMs <= periodStartMs) {
        return { status: "fail-closed", reason: "entitlement-invalid" };
      }
      if (periodStartMs > nowMs()) return { status: "fail-closed", reason: "entitlement-inactive" };
      if (periodEndMs <= nowMs()) return { status: "fail-closed", reason: "entitlement-expired" };
      return { status: "ready", callerAuthority, entitlementRead };
    }
    case "paid-inactive":
      return { status: "fail-closed", reason: readPaidInactiveReason(entitlementRead.reason) };
    default:
      return assertNever(entitlementRead);
  }
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
