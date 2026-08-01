import "server-only";

import type {
  CommentTranslatorCreatorEntitlementRead,
  CommentTranslatorCreatorEntitlementRecord
} from "./comment-translator-creator-entitlement-store";
import type { CommentTranslatorCreatorCallerAuthority } from "./comment-translator-creator-entitlement-runtime";
import type {
  CommentTranslatorCreatorUsageCounts,
  CommentTranslatorCreatorUsageRecordFailureReason,
  CommentTranslatorCreatorUsageStore
} from "./comment-translator-creator-usage-store";

export type CommentTranslatorCreatorUsageExecution =
  | {
      readonly status: "provider-executed";
      readonly usageEventReference: string;
      readonly providerInputCharacterCount: number;
      readonly translatedCharacterCount: number;
    }
  | { readonly status: "cache-hit" }
  | { readonly status: "not-provider-executed" };

export type CommentTranslatorCreatorUsageRuntimeResult =
  | {
      readonly status: "recorded";
      readonly reason: "provider-executed-usage-recorded";
      readonly resultDisposition: "success";
      readonly counts: CommentTranslatorCreatorUsageCounts;
    }
  | {
      readonly status: "not-counted";
      readonly reason: "cache-hit" | "provider-not-executed";
      readonly resultDisposition: "success" | "preserved";
      readonly counts: null;
    }
  | {
      readonly status: "fail-closed";
      readonly reason: CommentTranslatorCreatorUsageRecordFailureReason;
      readonly resultDisposition: "suppressed";
      readonly counts: null;
    };

export type CommentTranslatorCreatorUsageRuntime = {
  account(request: {
    readonly callerAuthority: CommentTranslatorCreatorCallerAuthority;
    readonly entitlementRead: CommentTranslatorCreatorEntitlementRead;
    readonly execution: CommentTranslatorCreatorUsageExecution;
  }): Promise<CommentTranslatorCreatorUsageRuntimeResult>;
};

export const commentTranslatorCreatorUsageRuntimeContract = {
  implementationStage: "nc-u1-local-paid-usage-runtime",
  runtime: "server-only",
  periodAuthority: "nc-d1-signed-entitlement-period-only",
  providerExecutionAccounting: "provider-executed-success-only",
  atomicDeduplication: "nc-u1-rpc-only",
  cacheHitAccounting: "not-counted",
  nonProviderExecutionAccounting: "not-counted",
  accountingFailureResult: "provider-success-suppressed",
  browserOutput: "sanitized-counts-and-status-only",
  activationPolicy: "fixed-closed",
  productionStoreWiring: "disconnected-until-migration-apply-approved",
  freeBehavior: "unchanged",
  containerFallback: "forbidden"
} as const;

export function createCommentTranslatorCreatorUsageRuntime({
  usageStore
}: {
  readonly usageStore: CommentTranslatorCreatorUsageStore;
}): CommentTranslatorCreatorUsageRuntime {
  return {
    async account(request) {
      const entitlement = readAuthorizedEntitlement(request.callerAuthority, request.entitlementRead);
      if (entitlement.status === "rejected") return failClosed(entitlement.reason);

      switch (request.execution.status) {
        case "cache-hit":
          return { status: "not-counted", reason: "cache-hit", resultDisposition: "success", counts: null };
        case "not-provider-executed":
          return {
            status: "not-counted",
            reason: "provider-not-executed",
            resultDisposition: "preserved",
            counts: null
          };
        case "provider-executed": {
          if (
            !isCount(request.execution.providerInputCharacterCount) ||
            !isCount(request.execution.translatedCharacterCount) ||
            !request.execution.usageEventReference.trim()
          ) {
            return failClosed("accounting-unavailable");
          }
          try {
            const result = await usageStore.recordProviderExecutedUsage({
              ownerUserId: entitlement.ownerUserId,
              entitlementReferenceId: entitlement.entitlement.entitlementReferenceId,
              periodStartIso: entitlement.entitlement.periodStartIso,
              periodEndIso: entitlement.entitlement.periodEndIso,
              usageEventReference: request.execution.usageEventReference,
              providerInputCharacterCount: request.execution.providerInputCharacterCount,
              translatedCharacterCount: request.execution.translatedCharacterCount
            });
            switch (result.status) {
              case "recorded":
                return {
                  status: "recorded",
                  reason: "provider-executed-usage-recorded",
                  resultDisposition: "success",
                  counts: result.counts
                };
              case "rejected":
                return failClosed(result.reason);
              default:
                return assertNever(result);
            }
          } catch (error) {
            if (error instanceof Error) return failClosed("accounting-unavailable");
            return failClosed("accounting-unavailable");
          }
        }
        default:
          return assertNever(request.execution);
      }
    }
  };
}

type AuthorizedEntitlement =
  | {
      readonly status: "ready";
      readonly ownerUserId: string;
      readonly entitlement: CommentTranslatorCreatorEntitlementRecord;
    }
  | {
      readonly status: "rejected";
      readonly reason: CommentTranslatorCreatorUsageRecordFailureReason;
    };

function readAuthorizedEntitlement(
  callerAuthority: CommentTranslatorCreatorCallerAuthority,
  entitlementRead: CommentTranslatorCreatorEntitlementRead
): AuthorizedEntitlement {
  switch (callerAuthority.status) {
    case "unauthenticated":
    case "unavailable":
      return { status: "rejected", reason: "entitlement-unreadable" };
    case "authenticated":
      switch (entitlementRead.status) {
        case "ready":
          return { status: "ready", ownerUserId: callerAuthority.ownerUserId, entitlement: entitlementRead.entitlement };
        case "paid-inactive":
          return {
            status: "rejected",
            reason: entitlementRead.reason === "missing" ? "entitlement-missing" : readInactiveReason(entitlementRead.reason)
          };
        default:
          return assertNever(entitlementRead);
      }
    default:
      return assertNever(callerAuthority);
  }
}

function readInactiveReason(
  reason: "unreadable" | "malformed" | "inactive" | "stale"
): CommentTranslatorCreatorUsageRecordFailureReason {
  switch (reason) {
    case "unreadable":
      return "entitlement-unreadable";
    case "malformed":
    case "inactive":
    case "stale":
      return "period-mismatch";
    default:
      return assertNever(reason);
  }
}

function failClosed(
  reason: CommentTranslatorCreatorUsageRecordFailureReason
): CommentTranslatorCreatorUsageRuntimeResult {
  return { status: "fail-closed", reason, resultDisposition: "suppressed", counts: null };
}

function isCount(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function assertNever(value: never): never {
  void value;
  throw new TypeError("Unreachable Creator usage state");
}
