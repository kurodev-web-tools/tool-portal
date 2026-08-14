import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  createCommentTranslatorPaidControlPlaneAuthoritativeActions,
  createCommentTranslatorPaidControlPlaneWorkItemResolver,
  createCommentTranslatorPaidUnboundCheckoutSessionRecovery,
  createCommentTranslatorPaidControlPlaneInvocation
} from "@/lib/comment-translator-paid-control-plane-reconciler";
import {
  createTrustedCommentTranslatorPaidEntitlementStore
} from "@/lib/comment-translator-paid-entitlement-store";
import {
  createTrustedCommentTranslatorPaidReconcilerStore
} from "@/lib/comment-translator-paid-reconciler-store";
import {
  createCommentTranslatorStripeAdapter,
  createDefaultCommentTranslatorBillingCheckoutSafetyAuthorityReader,
  createCommentTranslatorStripeCurrentObjectReader,
  createCommentTranslatorStripeSubscriptionCancelAdapter
} from "@/lib/comment-translator-billing-runtime";
import {
  createTrustedCommentTranslatorPaidRetentionStore,
  runCommentTranslatorPaidTask9ScheduledMaintenance,
  selectCommentTranslatorPaidSchedulerAuthority
} from "@/lib/comment-translator-paid-retention";
import { createTrustedCommentTranslatorPaidUsageStore } from "@/lib/comment-translator-paid-usage-store";

export const runtime = "nodejs";
const outputBoundary = "sanitized aggregate and reference-only" as const;

export async function GET(request: Request) {
  const expectedToken = process.env.COMMENT_TRANSLATOR_PAID_CRON_TOKEN?.trim();
  if (!expectedToken) {
    return NextResponse.json({ status: "unavailable", reason: "scheduler-auth-not-configured" }, { status: 503 });
  }
  if (!hasExpectedSchedulerToken(request, expectedToken)) {
    return NextResponse.json({ status: "unavailable", reason: "scheduler-unauthorized" }, { status: 401 });
  }

  const nowIso = new Date().toISOString();
  const configuredAuthority = process.env.COMMENT_TRANSLATOR_PAID_SCHEDULER_AUTHORITY?.trim();
  const callerAuthority = request.headers.get("x-comment-translator-paid-scheduler-authority")?.trim();
  const scheduler = selectCommentTranslatorPaidSchedulerAuthority({
    supabaseCronAvailable: configuredAuthority === "supabase-cron",
    cloudflareCronAvailable: configuredAuthority === "cloudflare-cron-fallback",
    configuredAuthority: configuredAuthority === "supabase-cron" || configuredAuthority === "cloudflare-cron-fallback"
      ? configuredAuthority
      : undefined,
    callerAuthority: callerAuthority === "supabase-cron" || callerAuthority === "cloudflare-cron-fallback"
      ? callerAuthority
      : undefined
  });
  if (scheduler.authority === "unavailable" || !callerAuthority || callerAuthority !== scheduler.authority) {
    return NextResponse.json({
      status: "unavailable",
      schedulerAuthority: scheduler.authority,
      errorClass: scheduler.errorClass ?? "scheduler-unavailable"
    }, { status: 503 });
  }

  const retentionResult = createTrustedCommentTranslatorPaidRetentionStore();
  const reconcilerResult = createTrustedCommentTranslatorPaidReconcilerStore();
  const entitlementResult = createTrustedCommentTranslatorPaidEntitlementStore();
  const usageResult = createTrustedCommentTranslatorPaidUsageStore();
  if (
    retentionResult.status !== "ready"
    || reconcilerResult.status !== "ready"
    || entitlementResult.status !== "ready"
    || usageResult.status !== "ready"
    || !entitlementResult.store.readBillingLifecycle
  ) {
    return NextResponse.json({
      status: "unavailable",
      schedulerAuthority: scheduler.authority,
      errorClass: "trusted-runtime-unavailable"
    }, { status: 503 });
  }

  const stripeAdapter = createCommentTranslatorStripeAdapter();
  const actions = createCommentTranslatorPaidControlPlaneAuthoritativeActions({
    readBillingLifecycle: entitlementResult.store.readBillingLifecycle,
    entitlementStore: entitlementResult.store,
    paidPlanAuthority: {
      productId: process.env.COMMENT_TRANSLATOR_STRIPE_PAID_PRODUCT_ID?.trim(),
      priceId: process.env.COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID?.trim()
    },
    currentObjectReader: createCommentTranslatorStripeCurrentObjectReader(),
    checkoutExpiryAdapter: { expireCheckoutSession: stripeAdapter.expireCheckoutSession },
    subscriptionCancelAdapter: createCommentTranslatorStripeSubscriptionCancelAdapter(),
    usageStore: usageResult.store,
    recoverUnboundCheckoutSession: createCommentTranslatorPaidUnboundCheckoutSessionRecovery({
      entitlementStore: entitlementResult.store,
      stripeAdapter,
      checkoutSafetyAuthorityReader: createDefaultCommentTranslatorBillingCheckoutSafetyAuthorityReader(process.env),
      env: process.env
    })
  });
  const resolveWorkItem = createCommentTranslatorPaidControlPlaneWorkItemResolver({
    readBillingLifecycle: entitlementResult.store.readBillingLifecycle
  });
  const invocation = createCommentTranslatorPaidControlPlaneInvocation({
    store: reconcilerResult.store,
    resolveWorkItem,
    actions
  });

  const result = await runCommentTranslatorPaidTask9ScheduledMaintenance({
    scheduler: {
      supabaseCronAvailable: scheduler.authority === "supabase-cron",
      cloudflareCronAvailable: scheduler.authority === "cloudflare-cron-fallback",
      configuredAuthority: scheduler.authority
    },
    cleanupStore: retentionResult.store,
    runReconcile: ({ nowIso: reconcileNowIso, limit }) => invocation.run({ nowIso: reconcileNowIso, limit }),
    nowIso
  });

  return NextResponse.json({
    status: result.status,
    schedulerAuthority: result.schedulerAuthority,
    deletedCount: result.deletedCount,
    claimCount: result.claimCount,
    retryCount: result.retryCount,
    staleCount: result.staleCount,
    errorClassCounts: result.errorClassCounts,
    errorClass: "errorClass" in result ? result.errorClass : null,
    lastSuccessAtIso: result.lastSuccessAtIso,
    outputBoundary
  }, { status: result.status === "success" ? 200 : 503 });
}

function hasExpectedSchedulerToken(request: Request, expectedToken: string): boolean {
  const actualToken = request.headers.get("x-comment-translator-paid-cron-token") ?? "";
  const expected = Buffer.from(expectedToken, "utf8");
  const actual = Buffer.from(actualToken, "utf8");
  return expected.length > 0 && expected.length === actual.length && timingSafeEqual(expected, actual);
}
