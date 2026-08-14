import "server-only";

import { createHmac } from "node:crypto";
import type {
  CommentTranslatorStripeCurrentObjectGraph,
  CommentTranslatorStripeCurrentObjectReader,
  CommentTranslatorStripeEnv,
  CommentTranslatorStripeAdapter,
  CommentTranslatorBillingCheckoutSafetyAuthorityReader,
  CommentTranslatorStripeSubscriptionCancelAdapter,
  CommentTranslatorStripeSubscriptionSnapshot,
  CommentTranslatorStripeCheckoutSessionParams,
  CommentTranslatorStripeCheckoutSessionResult
} from "./comment-translator-billing-runtime";
import { readCommentTranslatorBillingCheckoutSafetyGate } from "./comment-translator-billing-runtime";
import type {
  CommentTranslatorPaidCheckoutLifecycle,
  CommentTranslatorPaidDisputeState,
  CommentTranslatorPaidEntitlementStatus,
  CommentTranslatorPaidEntitlementStore,
  CommentTranslatorPaidUnentitledOperatorDisposition
} from "./comment-translator-paid-entitlement-store";
import type {
  CommentTranslatorPaidReconcileClaim,
  CommentTranslatorPaidReconcilerErrorClass,
  CommentTranslatorPaidReconcilerStore,
  CommentTranslatorPaidReconcilerWorkKind
} from "./comment-translator-paid-reconciler-store";
import type { CommentTranslatorPaidUsageStore } from "./comment-translator-paid-usage-store";

export type CommentTranslatorPaidControlPlaneWorkKind = CommentTranslatorPaidReconcilerWorkKind;

export type CommentTranslatorPaidControlPlaneWorkItem = {
  lifecycleId: string;
  workKind: CommentTranslatorPaidControlPlaneWorkKind;
};

export type CommentTranslatorPaidOpaqueLeaseContext = Readonly<{
  lifecycleId: string;
  reconcileLeaseToken: string;
  reconcileLeaseUntilIso: string;
}>;

export type CommentTranslatorPaidControlPlaneActionRequest = Readonly<{
  item: CommentTranslatorPaidControlPlaneWorkItem;
  opaqueLeaseContext: CommentTranslatorPaidOpaqueLeaseContext;
  nowIso: string;
}>;

export type CommentTranslatorPaidControlPlaneActionCompletion = Readonly<{
  nextReconcileAtIso: string | null;
}>;

export type CommentTranslatorPaidControlPlaneAction = (
  request: CommentTranslatorPaidControlPlaneActionRequest
) => Promise<void | CommentTranslatorPaidControlPlaneActionCompletion>;

export type CommentTranslatorPaidControlPlaneActions = {
  checkoutExpiry: CommentTranslatorPaidControlPlaneAction;
  unboundCheckoutSession: CommentTranslatorPaidControlPlaneAction;
  paymentFailureSevenDay: CommentTranslatorPaidControlPlaneAction;
  cancelPending: CommentTranslatorPaidControlPlaneAction;
  refundReconciliation: CommentTranslatorPaidControlPlaneAction;
  disputeReconciliation: CommentTranslatorPaidControlPlaneAction;
  paidUnentitledReconciliation: CommentTranslatorPaidControlPlaneAction;
  billingPeriodRollover: CommentTranslatorPaidControlPlaneAction;
  utcMonthCostRollover: CommentTranslatorPaidControlPlaneAction;
};

export type CommentTranslatorPaidControlPlaneAuthoritativeOperations = {
  expireCheckoutSession: CommentTranslatorPaidControlPlaneAction;
  reconcileUnboundCheckoutSession: CommentTranslatorPaidControlPlaneAction;
  reconcilePaymentFailureAfterSevenDays: CommentTranslatorPaidControlPlaneAction;
  applyCancelPending: CommentTranslatorPaidControlPlaneAction;
  reconcileRefund: CommentTranslatorPaidControlPlaneAction;
  reconcileDispute: CommentTranslatorPaidControlPlaneAction;
  reconcilePaidUnentitled: CommentTranslatorPaidControlPlaneAction;
  rollOverBillingPeriod: CommentTranslatorPaidControlPlaneAction;
  rollOverUtcMonthCost: CommentTranslatorPaidControlPlaneAction;
};

export function createCommentTranslatorPaidControlPlaneActionImplementation(
  operations: CommentTranslatorPaidControlPlaneAuthoritativeOperations
): CommentTranslatorPaidControlPlaneActions {
  return Object.freeze({
    checkoutExpiry: (request) => operations.expireCheckoutSession(request),
    unboundCheckoutSession: (request) => operations.reconcileUnboundCheckoutSession(request),
    paymentFailureSevenDay: (request) => operations.reconcilePaymentFailureAfterSevenDays(request),
    cancelPending: (request) => operations.applyCancelPending(request),
    refundReconciliation: (request) => operations.reconcileRefund(request),
    disputeReconciliation: (request) => operations.reconcileDispute(request),
    paidUnentitledReconciliation: (request) => operations.reconcilePaidUnentitled(request),
    billingPeriodRollover: (request) => operations.rollOverBillingPeriod(request),
    utcMonthCostRollover: (request) => operations.rollOverUtcMonthCost(request)
  });
}

type CommentTranslatorPaidControlPlaneProjectionStore = Pick<
  CommentTranslatorPaidEntitlementStore,
  "expireCheckoutHold" | "resolveStripeBinding" | "claimEntitlementProjection" | "bindFirstSubscription" | "projectEntitlement"
  | "projectPaidUnentitledDisposition"
>;

export type CommentTranslatorPaidControlPlaneAuthoritativeDependencies = {
  readBillingLifecycle: (request: { lifecycleId: string }) => Promise<CommentTranslatorPaidCheckoutLifecycle | null>;
  entitlementStore: CommentTranslatorPaidControlPlaneProjectionStore;
  paidPlanAuthority: Readonly<{
    productId: string | undefined;
    priceId: string | undefined;
  }>;
  currentObjectReader: Pick<
    CommentTranslatorStripeCurrentObjectReader,
    "retrieveCurrentObjectState" | "retrieveCurrentSubscriptionAdjustmentState"
  >;
  checkoutExpiryAdapter?: Pick<CommentTranslatorStripeAdapter, "expireCheckoutSession">;
  subscriptionCancelAdapter: Pick<CommentTranslatorStripeSubscriptionCancelAdapter, "cancelSubscription">;
  usageStore: Pick<CommentTranslatorPaidUsageStore, "closeBillingPeriod" | "closeUtcMonth">;
  recoverUnboundCheckoutSession?: (request: {
    lifecycle: CommentTranslatorPaidCheckoutLifecycle;
    nowIso: string;
  }) => Promise<boolean>;
};

export function createCommentTranslatorPaidControlPlaneAuthoritativeActions(
  dependencies: CommentTranslatorPaidControlPlaneAuthoritativeDependencies
): CommentTranslatorPaidControlPlaneActions {
  const readLifecycle = async (request: CommentTranslatorPaidControlPlaneActionRequest) => {
    const lifecycle = await dependencies.readBillingLifecycle({ lifecycleId: request.item.lifecycleId });
    if (!lifecycle || lifecycle.lifecycleId !== request.item.lifecycleId) {
      throw createControlPlaneError("binding-not-ready");
    }
    return lifecycle;
  };

  const readCurrentStripeGraph = async ({
    eventType,
    objectId
  }: {
    eventType: Parameters<CommentTranslatorStripeCurrentObjectReader["retrieveCurrentObjectState"]>[0]["eventType"];
    objectId: string | null;
  }): Promise<CommentTranslatorStripeCurrentObjectGraph> => {
    if (!objectId) throw createControlPlaneError("binding-not-ready");
    try {
      return await dependencies.currentObjectReader.retrieveCurrentObjectState({ eventType, objectId });
    } catch {
      throw createControlPlaneError("object-retrieval-failed");
    }
  };

  const readCurrentAdjustmentGraph = async (
    lifecycle: CommentTranslatorPaidCheckoutLifecycle,
    subscriptionId = lifecycle.subscriptionId
  ): Promise<CommentTranslatorStripeCurrentObjectGraph> => {
    if (!subscriptionId) throw createControlPlaneError("binding-not-ready");
    let graph: CommentTranslatorStripeCurrentObjectGraph;
    try {
      graph = await dependencies.currentObjectReader.retrieveCurrentSubscriptionAdjustmentState({
        subscriptionId
      });
    } catch {
      throw createControlPlaneError("object-retrieval-failed");
    }
    const subscription = graph.subscription;
    const invoice = graph.invoice;
    if (
      !subscription
      || subscription.id !== subscriptionId
      || subscription.customerId !== lifecycle.stripeCustomerId
      || !subscription.latestInvoiceId
      || !invoice
      || invoice.id !== subscription.latestInvoiceId
      || invoice.subscriptionId !== subscription.id
      || invoice.customerId !== subscription.customerId
      || invoice.status !== "paid"
      || !invoice.paid
      || !invoice.paymentIntentId
      || !invoice.chargeId
      || !subscription.productId
      || !subscription.priceId
      || invoice.productId !== subscription.productId
      || invoice.priceId !== subscription.priceId
    ) throw createControlPlaneError("binding-not-ready");
    return graph;
  };

  const reconcileSubscription = async ({
    request,
    lifecycle,
    subscription,
    status,
    disputeState,
    lifecycleState,
    subscriptionStatus,
    operatorDisposition,
    checkoutSessionId
  }: {
    request: CommentTranslatorPaidControlPlaneActionRequest;
    lifecycle: CommentTranslatorPaidCheckoutLifecycle;
    subscription: CommentTranslatorStripeSubscriptionSnapshot;
    status?: CommentTranslatorPaidEntitlementStatus;
    disputeState?: CommentTranslatorPaidDisputeState;
    lifecycleState?: string;
    subscriptionStatus?: string | null;
    operatorDisposition?: CommentTranslatorPaidUnentitledOperatorDisposition;
    checkoutSessionId?: string | null;
  }) => {
    if (
      !subscription.id
      || !subscription.customerId
      || subscription.customerId !== lifecycle.stripeCustomerId
    ) {
      throw createControlPlaneError("binding-not-ready");
    }
    let bindingResult: Awaited<ReturnType<CommentTranslatorPaidControlPlaneProjectionStore["resolveStripeBinding"]>>;
    try {
      bindingResult = await dependencies.entitlementStore.resolveStripeBinding({
        stripeCustomerId: lifecycle.stripeCustomerId,
        stripeCheckoutSessionId: checkoutSessionId,
        stripeSubscriptionId: subscription.id
      });
    } catch {
      throw createControlPlaneError("database-transaction-failed");
    }
    if (bindingResult.status !== "ready") throw createControlPlaneError("binding-not-ready");
    const binding = bindingResult.binding;
    const productId = subscription.productId ?? binding.productId ?? lifecycle.productId ?? null;
    const priceId = subscription.priceId ?? binding.priceId ?? lifecycle.priceId ?? null;
    if (
      !productId
      || !priceId
      || binding.ownerUserId !== lifecycle.ownerUserId
      || binding.lifecycleId !== lifecycle.lifecycleId
      || binding.customerBindingId !== lifecycle.customerBindingId
      || binding.stripeCustomerId !== lifecycle.stripeCustomerId
      || (checkoutSessionId && binding.stripeCheckoutSessionId !== checkoutSessionId)
      || (binding.stripeSubscriptionId && binding.stripeSubscriptionId !== subscription.id)
      || (binding.productId && binding.productId !== productId)
      || (binding.priceId && binding.priceId !== priceId)
      || (lifecycle.productId && lifecycle.productId !== productId)
      || (lifecycle.priceId && lifecycle.priceId !== priceId)
    ) {
      throw createControlPlaneError("binding-not-ready");
    }

    let projectionClaim: Awaited<ReturnType<CommentTranslatorPaidControlPlaneProjectionStore["claimEntitlementProjection"]>>;
    try {
      projectionClaim = await dependencies.entitlementStore.claimEntitlementProjection({
        ownerUserId: lifecycle.ownerUserId,
        lifecycleId: lifecycle.lifecycleId,
        nowIso: request.nowIso
      });
    } catch {
      throw createControlPlaneError("database-transaction-failed");
    }
    if (!projectionClaim) throw createControlPlaneError("binding-not-ready");

    const resolvedStatus = status ?? resolveEntitlementStatus(subscription);
    const resolvedDisputeState = disputeState ?? "none";
    try {
      const projectionRequest = {
        lifecycleId: lifecycle.lifecycleId,
        ownerUserId: lifecycle.ownerUserId,
        customerBindingId: lifecycle.customerBindingId,
        productId,
        priceId,
        status: resolvedStatus,
        currentPeriodStartIso: subscription.currentPeriodStartIso,
        currentPeriodEndIso: subscription.currentPeriodEndIso,
        cancelAtPeriodEnd:
          resolvedStatus === "cancel_at_period_end"
          || resolvedStatus === "cancel_pending"
          || subscription.cancelAtPeriodEnd,
        disputeState: resolvedDisputeState,
        lifecycleState: lifecycleState ?? resolveLifecycleState(resolvedStatus),
        subscriptionStatus: subscriptionStatus === undefined
          ? resolveSubscriptionStatusForProjection(resolvedStatus, subscription.status)
          : subscriptionStatus,
        projectionLeaseToken: projectionClaim.projectionLeaseToken,
        reconcileLeaseToken: request.opaqueLeaseContext.reconcileLeaseToken,
        nowIso: request.nowIso
      };
      if (!binding.subscriptionBindingId) {
        if (operatorDisposition) throw createControlPlaneError("binding-not-ready");
        const subscriptionBindingId = await dependencies.entitlementStore.bindFirstSubscription({
          ...projectionRequest,
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: lifecycle.stripeCustomerId,
          entitlementStatus: resolvedStatus,
          lifecycleState: projectionRequest.lifecycleState,
          reconcileLeaseToken: request.opaqueLeaseContext.reconcileLeaseToken
        });
        if (!subscriptionBindingId) throw createControlPlaneError("database-transaction-failed");
        return;
      }
      if (operatorDisposition) {
        await dependencies.entitlementStore.projectPaidUnentitledDisposition({
          ...projectionRequest,
          subscriptionBindingId: binding.subscriptionBindingId,
          reconcileLeaseToken: request.opaqueLeaseContext.reconcileLeaseToken,
          operatorDisposition
        });
      } else {
        await dependencies.entitlementStore.projectEntitlement({
          ...projectionRequest,
          subscriptionBindingId: binding.subscriptionBindingId
        });
      }
    } catch {
      throw createControlPlaneError("database-transaction-failed");
    }
  };

  const reconcileCompletedCheckout = async ({
    request,
    lifecycle,
    session
  }: {
    request: CommentTranslatorPaidControlPlaneActionRequest;
    lifecycle: CommentTranslatorPaidCheckoutLifecycle;
    session: NonNullable<CommentTranslatorStripeCurrentObjectGraph["checkoutSession"]>;
  }) => {
    if (
      session.status !== "complete"
      || (session.paymentStatus !== "paid" && session.paymentStatus !== "no_payment_required")
      || !session.subscriptionId
    ) throw createControlPlaneError("binding-not-ready");

    const graph = await readCurrentAdjustmentGraph(lifecycle, session.subscriptionId);
    const subscription = graph.subscription;
    const invoice = graph.invoice;
    const configuredProductId = dependencies.paidPlanAuthority?.productId?.trim();
    const configuredPriceId = dependencies.paidPlanAuthority?.priceId?.trim();
    if (
      !configuredProductId
      || !configuredPriceId
      || !subscription
      || subscription.id !== session.subscriptionId
      || subscription.customerId !== lifecycle.stripeCustomerId
      || subscription.customerId !== session.customerId
      || (subscription.status !== "active" && subscription.status !== "trialing")
      || subscription.productId !== configuredProductId
      || subscription.priceId !== configuredPriceId
      || !subscription.latestInvoiceId
      || !isCurrentSubscriptionPeriod(subscription, request.nowIso)
      || !invoice
      || invoice.id !== subscription.latestInvoiceId
      || invoice.customerId !== subscription.customerId
      || invoice.subscriptionId !== subscription.id
      || invoice.productId !== configuredProductId
      || invoice.priceId !== configuredPriceId
    ) throw createControlPlaneError("binding-not-ready");

    // Stripe's existing Checkout snapshot has no completion timestamp. The safe
    // invariant is the exact durable expiry identity plus a current paid period;
    // no completion time is inferred from retrieval time.
    await reconcileSubscription({
      request,
      lifecycle,
      subscription,
      status: subscription.status === "trialing" ? "active" : undefined,
      checkoutSessionId: session.id
    });
  };

  const expireCheckout = async (request: CommentTranslatorPaidControlPlaneActionRequest) => {
    const lifecycle = await readLifecycle(request);
    if (!lifecycle.checkoutSessionId) {
      if (lifecycle.subscriptionId || lifecycle.subscriptionBindingId) {
        const graph = await readCurrentStripeGraph({
          eventType: "customer.subscription.updated",
          objectId: lifecycle.subscriptionId
        });
        const subscription = graph.subscription;
        if (!subscription) throw createControlPlaneError("object-retrieval-failed");
        await reconcileSubscription({ request, lifecycle, subscription });
        return;
      }
      if (!dependencies.recoverUnboundCheckoutSession) throw createControlPlaneError("binding-not-ready");
      try {
        const recovered = await dependencies.recoverUnboundCheckoutSession({ lifecycle, nowIso: request.nowIso });
        if (!recovered) throw createControlPlaneError("binding-not-ready");
      } catch (error) {
        if (isControlPlaneError(error)) throw error;
        throw createControlPlaneError("external-action-failed");
      }
      return {
        nextReconcileAtIso: resolveCheckoutExpiryReconcileAtIso(lifecycle, request.nowIso)
      };
    }
    let graph = await readCurrentStripeGraph({
      eventType: "checkout.session.expired",
      objectId: lifecycle.checkoutSessionId
    });
    let session = graph.checkoutSession;
    if (
      !session
      || session.id !== lifecycle.checkoutSessionId
      || session.customerId !== lifecycle.stripeCustomerId
      || !hasMatchingCheckoutExpiry({ session, lifecycle })
    ) {
      throw createControlPlaneError("binding-not-ready");
    }
    if (session.status === "complete") {
      await reconcileCompletedCheckout({ request, lifecycle, session });
      return;
    }
    if (session.status === "open") {
      const expireCheckoutSession = dependencies.checkoutExpiryAdapter?.expireCheckoutSession;
      if (!expireCheckoutSession) throw createControlPlaneError("external-action-failed");
      let expiryRequestFailed = false;
      try {
        await expireCheckoutSession({
          sessionId: lifecycle.checkoutSessionId,
          idempotencyKey: createReconcileIdempotencyKey("checkout-expire", lifecycle.lifecycleId)
        });
      } catch {
        // Stripe may have accepted the request before the response was lost.
        expiryRequestFailed = true;
      }
      graph = await readCurrentStripeGraph({
        eventType: "checkout.session.expired",
        objectId: lifecycle.checkoutSessionId
      });
      session = graph.checkoutSession;
      if (
        !session
        || session.id !== lifecycle.checkoutSessionId
        || session.customerId !== lifecycle.stripeCustomerId
        || !hasMatchingCheckoutExpiry({ session, lifecycle })
      ) {
        throw createControlPlaneError("binding-not-ready");
      }
      if (session.status === "complete") {
        await reconcileCompletedCheckout({ request, lifecycle, session });
        return;
      }
      if (session.status !== "expired" && expiryRequestFailed) {
        throw createControlPlaneError("external-action-failed");
      }
    }
    if (session.status !== "expired") throw createControlPlaneError("binding-not-ready");
    const checkedAtMs = Date.parse(request.nowIso);
    const targetMs = Math.max(
      Date.parse(lifecycle.checkoutExpiresAtTargetIso ?? ""),
      Date.parse(lifecycle.stripeExpiresAtIso ?? "")
    );
    if (!Number.isFinite(checkedAtMs) || !Number.isFinite(targetMs) || checkedAtMs < targetMs) {
      throw createControlPlaneError("binding-not-ready");
    }
    try {
      await dependencies.entitlementStore.expireCheckoutHold({
        lifecycleId: lifecycle.lifecycleId,
        ownerUserId: lifecycle.ownerUserId,
        holdId: lifecycle.holdId ?? "",
        stripeSessionStatus: "expired",
        stripeSessionCheckedAtIso: request.nowIso,
        reconcileLeaseToken: request.opaqueLeaseContext.reconcileLeaseToken,
        nowIso: request.nowIso
      });
    } catch {
      throw createControlPlaneError("database-transaction-failed");
    }
  };

  const reconcilePaymentFailure = async (request: CommentTranslatorPaidControlPlaneActionRequest) => {
    const lifecycle = await readLifecycle(request);
    const graph = await readCurrentStripeGraph({
      eventType: "customer.subscription.updated",
      objectId: lifecycle.subscriptionId
    });
    const subscription = graph.subscription;
    if (!subscription) throw createControlPlaneError("object-retrieval-failed");
    if (subscription.status === "active") {
      await reconcileSubscription({ request, lifecycle, subscription });
      return;
    }
    if (subscription.status !== "past_due" && subscription.status !== "unpaid") {
      if (subscription.status === "canceled") {
        await reconcileSubscription({ request, lifecycle, subscription, status: "canceled" });
        return;
      }
      throw createControlPlaneError("binding-not-ready");
    }
    let canceled: CommentTranslatorStripeSubscriptionSnapshot;
    try {
      canceled = await dependencies.subscriptionCancelAdapter.cancelSubscription({
        subscriptionId: subscription.id,
        idempotencyKey: createReconcileIdempotencyKey("cancel", lifecycle.lifecycleId),
        prorationBehavior: "none"
      });
    } catch {
      throw createControlPlaneError("external-action-failed");
    }
    if (canceled.status !== "canceled") throw createControlPlaneError("external-action-failed");
    await reconcileSubscription({ request, lifecycle, subscription: canceled, status: "canceled" });
  };

  const reconcileCancelPending = async (request: CommentTranslatorPaidControlPlaneActionRequest) => {
    const lifecycle = await readLifecycle(request);
    const graph = await readCurrentStripeGraph({
      eventType: "customer.subscription.updated",
      objectId: lifecycle.subscriptionId
    });
    const subscription = graph.subscription;
    if (!subscription) throw createControlPlaneError("object-retrieval-failed");
    if (subscription.status === "canceled") {
      await reconcileSubscription({ request, lifecycle, subscription, status: "canceled" });
      return;
    }
    await reconcileSubscription({
      request,
      lifecycle,
      subscription,
      status: "cancel_pending",
      lifecycleState: "cancel_pending",
      subscriptionStatus: null
    });
    throw createControlPlaneError("binding-not-ready");
  };

  const reconcileRefund = async (request: CommentTranslatorPaidControlPlaneActionRequest) => {
    const lifecycle = await readLifecycle(request);
    const graph = await readCurrentAdjustmentGraph(lifecycle);
    const subscription = graph.subscription;
    const adjustment = graph.paymentAdjustment;
    if (!subscription) throw createControlPlaneError("object-retrieval-failed");
    const targetsCurrentPeriod = isCurrentSubscriptionPeriod(subscription, request.nowIso)
      && adjustment?.targetsCurrentPeriod === true;
    if (!adjustment?.successful || !adjustment.fullAmount || !targetsCurrentPeriod) {
      await reconcileSubscription({ request, lifecycle, subscription });
      return;
    }
    await reconcileSubscription({
      request,
      lifecycle,
      subscription,
      status: "refund_reconciliation",
      disputeState: "none",
      lifecycleState: "refund_reconciliation",
      subscriptionStatus: null
    });
    if (subscription.status === "canceled") {
      await reconcileSubscription({ request, lifecycle, subscription, status: "canceled" });
      return;
    }
    let canceled: CommentTranslatorStripeSubscriptionSnapshot;
    try {
      canceled = await dependencies.subscriptionCancelAdapter.cancelSubscription({
        subscriptionId: subscription.id,
        idempotencyKey: createReconcileIdempotencyKey("refund-cancel", lifecycle.lifecycleId),
        prorationBehavior: "none"
      });
    } catch {
      throw createControlPlaneError("external-action-failed");
    }
    if (canceled.id !== subscription.id || canceled.customerId !== subscription.customerId || canceled.status !== "canceled") {
      throw createControlPlaneError("external-action-failed");
    }
    await reconcileSubscription({ request, lifecycle, subscription: canceled, status: "canceled" });
  };

  const reconcileDispute = async (request: CommentTranslatorPaidControlPlaneActionRequest) => {
    const lifecycle = await readLifecycle(request);
    const graph = await readCurrentAdjustmentGraph(lifecycle);
    const subscription = graph.subscription;
    const dispute = graph.dispute;
    const invoice = graph.invoice;
    if (!subscription || !invoice || !dispute) throw createControlPlaneError("binding-not-ready");
    if (
      dispute.subscriptionId !== subscription.id
      || dispute.customerId !== subscription.customerId
      || dispute.invoiceId !== invoice.id
      || dispute.paymentIntentId !== invoice.paymentIntentId
      || dispute.chargeId !== invoice.chargeId
    ) throw createControlPlaneError("binding-not-ready");
    if (dispute.status === "lost") {
      await reconcileSubscription({
        request,
        lifecycle,
        subscription,
        status: "dispute",
        disputeState: "lost",
        lifecycleState: "dispute",
        subscriptionStatus: null
      });
      if (subscription.status === "canceled") {
        await reconcileSubscription({ request, lifecycle, subscription, status: "canceled" });
        return;
      }
      let canceled: CommentTranslatorStripeSubscriptionSnapshot;
      try {
        canceled = await dependencies.subscriptionCancelAdapter.cancelSubscription({
          subscriptionId: subscription.id,
          idempotencyKey: createReconcileIdempotencyKey("dispute-cancel", lifecycle.lifecycleId),
          prorationBehavior: "none"
        });
      } catch {
        throw createControlPlaneError("external-action-failed");
      }
      if (canceled.id !== subscription.id || canceled.customerId !== subscription.customerId || canceled.status !== "canceled") {
        throw createControlPlaneError("external-action-failed");
      }
      await reconcileSubscription({ request, lifecycle, subscription: canceled, status: "canceled" });
      return;
    }
    if (dispute.status === "won") {
      const canRestore =
        subscription.status === "active"
        && isCurrentSubscriptionPeriod(subscription, request.nowIso)
        && (lifecycle.lifecycleState === "dispute" || lifecycle.lifecycleState === "dispute_reconciliation")
        && !lifecycle.paymentFailureStartedAtIso
        && graph.paymentAdjustment?.fullAmount !== true;
      if (canRestore) {
        await reconcileSubscription({ request, lifecycle, subscription, disputeState: "won" });
        return;
      }
      await reconcileSubscription({
        request,
        lifecycle,
        subscription,
        status: "dispute_reconciliation",
        disputeState: "reconciliation",
        lifecycleState: "dispute_reconciliation",
        subscriptionStatus: null
      });
      throw createControlPlaneError("binding-not-ready");
    }
    await reconcileSubscription({
      request,
      lifecycle,
      subscription,
      status: "dispute_reconciliation",
      disputeState: "reconciliation",
      lifecycleState: "dispute_reconciliation",
      subscriptionStatus: null
    });
    throw createControlPlaneError("binding-not-ready");
  };

  const reconcilePaidUnentitled = async (request: CommentTranslatorPaidControlPlaneActionRequest) => {
    const lifecycle = await readLifecycle(request);
    const operatorDisposition = lifecycle.operatorDisposition;
    if (!operatorDisposition) return;
    const graph = await readCurrentAdjustmentGraph(lifecycle);
    const subscription = graph.subscription;
    if (
      !subscription
      || subscription.id !== lifecycle.subscriptionId
      || subscription.customerId !== lifecycle.stripeCustomerId
      || !subscription.productId
      || !subscription.priceId
      || !subscription.currentPeriodStartIso
      || !subscription.currentPeriodEndIso
    ) throw createControlPlaneError("binding-not-ready");
    if (operatorDisposition === "capacity-correction-approved") {
      if (subscription.status !== "active" || !isCurrentSubscriptionPeriod(subscription, request.nowIso)) {
        throw createControlPlaneError("binding-not-ready");
      }
      await reconcileSubscription({
        request,
        lifecycle,
        subscription,
        operatorDisposition
      });
      return;
    }
    if (operatorDisposition !== "refund-cancel") throw createControlPlaneError("binding-not-ready");
    if (subscription.status === "canceled") {
      await reconcileSubscription({
        request,
        lifecycle,
        subscription,
        status: "canceled",
        operatorDisposition
      });
      return;
    }
    let canceled: CommentTranslatorStripeSubscriptionSnapshot;
    try {
      canceled = await dependencies.subscriptionCancelAdapter.cancelSubscription({
        subscriptionId: subscription.id,
        idempotencyKey: createReconcileIdempotencyKey("paid-unentitled-cancel", lifecycle.lifecycleId),
        prorationBehavior: "none"
      });
    } catch {
      throw createControlPlaneError("external-action-failed");
    }
    if (canceled.id !== subscription.id || canceled.customerId !== subscription.customerId || canceled.status !== "canceled") {
      throw createControlPlaneError("external-action-failed");
    }
    await reconcileSubscription({
      request,
      lifecycle,
      subscription: canceled,
      status: "canceled",
      operatorDisposition
    });
  };

  const rollOverBillingPeriod = async (request: CommentTranslatorPaidControlPlaneActionRequest) => {
    const lifecycle = await readLifecycle(request);
    const previousStart = lifecycle.currentPeriodStartIso;
    const previousEnd = lifecycle.currentPeriodEndIso;
    if (!previousStart || !previousEnd) throw createControlPlaneError("period-reconciliation-failed");
    const graph = await readCurrentStripeGraph({
      eventType: "customer.subscription.updated",
      objectId: lifecycle.subscriptionId
    });
    const subscription = graph.subscription;
    if (!subscription?.currentPeriodStartIso || !subscription.currentPeriodEndIso) {
      throw createControlPlaneError("period-reconciliation-failed");
    }
    if (Date.parse(subscription.currentPeriodEndIso) <= Date.parse(previousEnd)) {
      throw createControlPlaneError("period-reconciliation-failed");
    }
    if (!hasMatchingPaidRolloverInvoice({ graph, subscription })) {
      throw createControlPlaneError("period-reconciliation-failed");
    }
    try {
      await dependencies.usageStore.closeBillingPeriod({
        lifecycleId: lifecycle.lifecycleId,
        reconcileLeaseToken: request.opaqueLeaseContext.reconcileLeaseToken,
        ownerUserId: lifecycle.ownerUserId,
        periodStartIso: previousStart,
        periodEndIso: previousEnd,
        nowIso: request.nowIso
      });
    } catch {
      throw createControlPlaneError("period-reconciliation-failed");
    }
    await reconcileSubscription({ request, lifecycle, subscription });
  };

  const rollOverUtcMonth = async (request: CommentTranslatorPaidControlPlaneActionRequest) => {
    const nowMs = Date.parse(request.nowIso);
    if (!Number.isFinite(nowMs)) throw createControlPlaneError("period-reconciliation-failed");
    const now = new Date(nowMs);
    const utcMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString().slice(0, 10);
    let moreOverdueMonths: boolean;
    try {
      moreOverdueMonths = await dependencies.usageStore.closeUtcMonth({
        workItemId: request.item.lifecycleId,
        reconcileLeaseToken: request.opaqueLeaseContext.reconcileLeaseToken,
        utcMonth,
        nowIso: request.nowIso
      });
    } catch {
      throw createControlPlaneError("period-reconciliation-failed");
    }
    return {
      nextReconcileAtIso: moreOverdueMonths ? request.nowIso : null
    };
  };

  return createCommentTranslatorPaidControlPlaneActionImplementation({
    expireCheckoutSession: expireCheckout,
    reconcileUnboundCheckoutSession: expireCheckout,
    reconcilePaymentFailureAfterSevenDays: reconcilePaymentFailure,
    applyCancelPending: reconcileCancelPending,
    reconcileRefund,
    reconcileDispute,
    reconcilePaidUnentitled,
    rollOverBillingPeriod,
    rollOverUtcMonthCost: rollOverUtcMonth
  });
}

export function createCommentTranslatorPaidControlPlaneWorkItemResolver({
  readBillingLifecycle
}: {
  readBillingLifecycle: (request: { lifecycleId: string }) => Promise<CommentTranslatorPaidCheckoutLifecycle | null>;
}) {
  return async (claim: CommentTranslatorPaidReconcileClaim): Promise<CommentTranslatorPaidControlPlaneWorkItem | null> => {
    if (claim.workKind === "utc-month-cost-rollover") {
      return { lifecycleId: claim.lifecycleId, workKind: claim.workKind };
    }
    if (!claim.workKind || !isControlPlaneWorkKind(claim.workKind)) return null;
    const lifecycle = await readBillingLifecycle({ lifecycleId: claim.lifecycleId });
    if (!lifecycle || !isClaimWorkKindLifecycleCompatible(claim.workKind, lifecycle)) return null;
    return { lifecycleId: claim.lifecycleId, workKind: claim.workKind };
  };
}

export function createCommentTranslatorPaidUnboundCheckoutSessionRecovery({
  entitlementStore,
  stripeAdapter,
  checkoutSafetyAuthorityReader,
  env
}: {
  entitlementStore: Pick<CommentTranslatorPaidEntitlementStore, "bindCheckoutSession" | "markCheckoutExpireRequired">;
  stripeAdapter: Pick<
    CommentTranslatorStripeAdapter,
    "createCheckoutSession" | "expireCheckoutSession" | "retrieveCheckoutSession"
  >;
  checkoutSafetyAuthorityReader: CommentTranslatorBillingCheckoutSafetyAuthorityReader | null;
  env: CommentTranslatorStripeEnv;
}) {
  return async ({ lifecycle, nowIso }: {
    lifecycle: CommentTranslatorPaidCheckoutLifecycle;
    nowIso: string;
  }) => {
    if (
      (lifecycle.lifecycleState !== "checkout_hold" && lifecycle.lifecycleState !== "incomplete")
      || lifecycle.checkoutSessionId
      || lifecycle.subscriptionId
      || lifecycle.subscriptionBindingId
      || !lifecycle.holdId
      || !lifecycle.customerBindingId
      || !lifecycle.idempotencyKey
      || !lifecycle.checkoutExpiresAtTargetIso
    ) return false;
    const siteOrigin = readSafeSiteOrigin(env.NEXT_PUBLIC_SITE_URL);
    const priceReferenceId = env.COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID?.trim();
    const productReferenceId = env.COMMENT_TRANSLATOR_STRIPE_PAID_PRODUCT_ID?.trim();
    if (!siteOrigin || !priceReferenceId || !productReferenceId) {
      throw createControlPlaneError("binding-not-ready");
    }
    const nowMs = Date.parse(nowIso);
    if (!Number.isFinite(nowMs)) throw createControlPlaneError("binding-not-ready");
    const checkoutSafetyGate = await readCommentTranslatorBillingCheckoutSafetyGate({
      checkoutSafetyAuthorityReader,
      ownerUserId: lifecycle.ownerUserId,
      nowMs,
      capacityReservationAlreadyHeld: true
    });
    if (!checkoutSafetyGate.checkoutAvailable) throw createControlPlaneError("binding-not-ready");
    const clientReferenceId = `ctbill_${createHmac("sha256", env.STRIPE_SECRET_KEY?.trim() ?? "comment-translator-paid-client-reference")
      .update(lifecycle.holdId, "utf8")
      .digest("hex")
      .slice(0, 48)}` as `ctbill_${string}`;
    const checkoutParams: CommentTranslatorStripeCheckoutSessionParams = {
      mode: "subscription",
      customerReferenceId: lifecycle.stripeCustomerId,
      productReferenceId,
      priceReferenceId,
      currency: "usd",
      recurringInterval: "month",
      clientReferenceId,
      successUrl: new URL("/account/billing?billing=checkout-returned", siteOrigin).toString(),
      cancelUrl: new URL("/account/billing?billing=checkout-canceled", siteOrigin).toString(),
      expiresAtIso: lifecycle.checkoutExpiresAtTargetIso,
      idempotencyKey: lifecycle.idempotencyKey,
      automaticTax: true,
      billingAddressCollection: "required",
      paymentMethodTypes: ["card"],
      promotionCodeReferenceId: env.COMMENT_TRANSLATOR_STRIPE_PROMOTION_CODE_ID?.trim() || null,
      couponReferenceId: env.COMMENT_TRANSLATOR_STRIPE_COUPON_ID?.trim() || null,
      customerEmail: null
    };
    let session: CommentTranslatorStripeCheckoutSessionResult;
    try {
      session = await stripeAdapter.createCheckoutSession(checkoutParams);
    } catch {
      throw createControlPlaneError("external-action-failed");
    }
    const sessionExpiresAtIso = session.expiresAtIso;
    if (
      !session.id
      || !sessionExpiresAtIso
      || (session.customerId && session.customerId !== lifecycle.stripeCustomerId)
      || sessionExpiresAtIso !== lifecycle.checkoutExpiresAtTargetIso
    ) {
      throw createControlPlaneError("binding-not-ready");
    }
    try {
      await entitlementStore.bindCheckoutSession({
        ownerUserId: lifecycle.ownerUserId,
        lifecycleId: lifecycle.lifecycleId,
        holdId: lifecycle.holdId,
        customerBindingId: lifecycle.customerBindingId,
        stripeCheckoutSessionId: session.id,
        stripeCustomerId: lifecycle.stripeCustomerId,
        stripeExpiresAtIso: sessionExpiresAtIso,
        isRecoveryBinding: true,
        idempotencyKey: lifecycle.idempotencyKey,
        nowIso
      });
    } catch {
      try {
        await entitlementStore.markCheckoutExpireRequired({
          ownerUserId: lifecycle.ownerUserId,
          lifecycleId: lifecycle.lifecycleId,
          holdId: lifecycle.holdId,
          customerBindingId: lifecycle.customerBindingId,
          stripeCheckoutSessionId: session.id,
          stripeCustomerId: lifecycle.stripeCustomerId,
          stripeExpiresAtIso: sessionExpiresAtIso,
          idempotencyKey: lifecycle.idempotencyKey,
          checkoutExpiresAtTargetIso: lifecycle.checkoutExpiresAtTargetIso,
          nowIso
        });
      } catch {
        throw createControlPlaneError("database-transaction-failed");
      }
      const expireCheckoutSession = stripeAdapter.expireCheckoutSession;
      const retrieveCheckoutSession = stripeAdapter.retrieveCheckoutSession;
      if (!expireCheckoutSession || !retrieveCheckoutSession) {
        throw createControlPlaneError("external-action-failed");
      }
      try {
        await expireCheckoutSession({
          sessionId: session.id,
          idempotencyKey: `ct-paid-expire-${lifecycle.holdId}`
        });
      } catch {
        // Stripe may have accepted the idempotent expiry before the response was lost.
      }
      let confirmedSession: CommentTranslatorStripeCheckoutSessionResult;
      try {
        confirmedSession = await retrieveCheckoutSession(session.id);
      } catch {
        throw createControlPlaneError("external-action-failed");
      }
      if (
        confirmedSession.id !== session.id
        || confirmedSession.customerId !== lifecycle.stripeCustomerId
        || confirmedSession.expiresAtIso !== sessionExpiresAtIso
      ) {
        throw createControlPlaneError("binding-not-ready");
      }
      if (confirmedSession.status !== "expired") {
        throw createControlPlaneError("external-action-failed");
      }
    }
    return true;
  };
}

export const commentTranslatorPaidControlPlaneReconcilerContract = {
  implementationStage: "comment-translator-paid-v1-task9-control-plane-reconciler",
  runtime: "server-only",
  maxBatchSize: 50,
  leaseSeconds: 120,
  claimAuthority: "existing-ct-paid-claim-reconciler-rpc",
  finalizeAuthority: "existing-ct-paid-finalize-reconciler-rpc",
  retryAuthority: "existing-ct-paid-retry-reconciler-rpc",
  actionAuthority: "lease-context-bound-authoritative-idempotent-actions",
  invocationSeam: "explicit-server-only-bounded-fixture-ready-not-deployed",
  retryableErrorClasses: [
    "object-retrieval-failed",
    "database-transaction-failed",
    "external-action-failed",
    "binding-not-ready",
    "capacity-reconciliation-failed",
    "period-reconciliation-failed"
  ] as const,
  retryState: "Paid stopped; capacity retained; period stopped until later authoritative success",
  staleLeasePolicy: "reject-before-action-and-sanitized-stale-count-only",
  duplicateLeasePolicy: "one-action-per-claimed-opaque-lease-per-run",
  browserReadableOutput: "sanitized-aggregate-and-reference-only",
  deploymentStatus: "repository-invocation-seam-only-not-deployed",
  remoteSupabaseMutation: "not-run-by-codex-in-this-thread"
} as const;

type ReconcilerStore = Pick<
  CommentTranslatorPaidReconcilerStore,
  "claimDue" | "assertLeaseActive" | "finalize" | "retry" | "markFailureSafe"
>;

type CommentTranslatorPaidControlPlaneInvocationDependencies = {
  store: ReconcilerStore;
  resolveWorkItem: (
    claim: CommentTranslatorPaidReconcileClaim
  ) => Promise<CommentTranslatorPaidControlPlaneWorkItem | null>;
  actions: CommentTranslatorPaidControlPlaneActions;
  clock?: () => string;
};

export function createCommentTranslatorPaidControlPlaneInvocation(
  dependencies: CommentTranslatorPaidControlPlaneInvocationDependencies
) {
  return {
    run({
      nowIso,
      limit = commentTranslatorPaidControlPlaneReconcilerContract.maxBatchSize
    }: {
      nowIso: string;
      limit?: number;
    }) {
      return runCommentTranslatorPaidControlPlaneReconciler({
        ...dependencies,
        nowIso,
        limit
      });
    }
  };
}

export async function runCommentTranslatorPaidControlPlaneReconciler({
  store,
  resolveWorkItem,
  actions,
  nowIso,
  limit = commentTranslatorPaidControlPlaneReconcilerContract.maxBatchSize
}: CommentTranslatorPaidControlPlaneInvocationDependencies & {
  nowIso: string;
  limit?: number;
}) {
  const boundedLimit = normalizeLimit(limit);
  const claims = (await store.claimDue({ nowIso, limit: boundedLimit })).slice(
    0,
    commentTranslatorPaidControlPlaneReconcilerContract.maxBatchSize
  );
  const errorClassCounts: Record<CommentTranslatorPaidReconcilerErrorClass, number> = {} as Record<
    CommentTranslatorPaidReconcilerErrorClass,
    number
  >;
  const processedOpaqueLeases = new Set<string>();
  let completedCount = 0;
  let retryCount = 0;
  let staleCount = 0;

  for (const claim of claims) {
    const opaqueLeaseKey = `${claim.lifecycleId}:${claim.reconcileLeaseToken}`;
    if (processedOpaqueLeases.has(opaqueLeaseKey) || !await store.assertLeaseActive({
      lifecycleId: claim.lifecycleId,
      reconcileLeaseToken: claim.reconcileLeaseToken,
      workKind: claim.workKind ?? null
    })) {
      staleCount += 1;
      continue;
    }
    processedOpaqueLeases.add(opaqueLeaseKey);
    let failureSafetyWorkKind: CommentTranslatorPaidControlPlaneWorkKind | null = claim.workKind ?? null;

    try {
      const item = await resolveWorkItem(claim);
      const resolvedWorkKind = item?.workKind ?? claim.workKind;
      if (!resolvedWorkKind || !await store.assertLeaseActive({
        lifecycleId: claim.lifecycleId,
        reconcileLeaseToken: claim.reconcileLeaseToken,
        workKind: resolvedWorkKind
      })) {
        staleCount += 1;
        continue;
      }
      if (!item) {
        const finalized = await store.finalize({
          lifecycleId: claim.lifecycleId,
          reconcileLeaseToken: claim.reconcileLeaseToken,
          nextReconcileAtIso: null,
          nowIso
        });
        if (!finalized) {
          staleCount += 1;
          continue;
        }
        completedCount += 1;
        continue;
      }
      if (item.lifecycleId !== claim.lifecycleId) {
        throw createReconcileError("binding-not-ready");
      }
      if (!isControlPlaneWorkKind(item.workKind)) {
        throw createReconcileError("binding-not-ready");
      }
      failureSafetyWorkKind = item.workKind;

      const opaqueLeaseContext = Object.freeze({
        lifecycleId: claim.lifecycleId,
        reconcileLeaseToken: claim.reconcileLeaseToken,
        reconcileLeaseUntilIso: claim.reconcileLeaseUntilIso
      });
      const actionRequest = Object.freeze({ item, opaqueLeaseContext, nowIso });
      if (!await store.assertLeaseActive({
        lifecycleId: claim.lifecycleId,
        reconcileLeaseToken: claim.reconcileLeaseToken,
        workKind: item.workKind
      })) {
        staleCount += 1;
        continue;
      }
      const actionCompletion = await invokeConcreteControlPlaneAction({
        actions,
        request: actionRequest
      });
      const actionNextReconcileAtIso = actionCompletion && typeof actionCompletion === "object"
        ? actionCompletion.nextReconcileAtIso
        : null;

      const finalized = await store.finalize({
        lifecycleId: claim.lifecycleId,
        reconcileLeaseToken: claim.reconcileLeaseToken,
        nextReconcileAtIso: actionNextReconcileAtIso ?? (item.workKind === "utc-month-cost-rollover"
          ? nextUtcMonthBoundaryIso(nowIso)
          : null),
        nowIso
      });
      if (!finalized) {
        staleCount += 1;
        continue;
      }
      completedCount += 1;
    } catch (error) {
      const errorClass = readReconcileErrorClass(error);
      errorClassCounts[errorClass] = (errorClassCounts[errorClass] ?? 0) + 1;
      try {
        const failureSafetyApplied = await store.markFailureSafe({
          lifecycleId: claim.lifecycleId,
          reconcileLeaseToken: claim.reconcileLeaseToken,
          workKind: failureSafetyWorkKind,
          errorClass,
          nowIso
        });
        if (!failureSafetyApplied) {
          staleCount += 1;
          continue;
        }
      } catch {
        staleCount += 1;
        continue;
      }

      try {
        await store.retry({
          lifecycleId: claim.lifecycleId,
          reconcileLeaseToken: claim.reconcileLeaseToken,
          errorClass,
          nowIso
        });
        retryCount += 1;
      } catch {
        staleCount += 1;
      }
    }
  }

  return {
    status: staleCount > 0 ? "stale" as const : retryCount > 0 ? "retry-scheduled" as const : "success" as const,
    claimedCount: claims.length,
    completedCount,
    retryCount,
    staleCount,
    errorClassCounts,
    lastSuccessAtIso: staleCount > 0 || retryCount > 0 ? null : nowIso,
    outputBoundary: commentTranslatorPaidControlPlaneReconcilerContract.browserReadableOutput,
    deploymentStatus: commentTranslatorPaidControlPlaneReconcilerContract.deploymentStatus
  };
}

function createControlPlaneError(
  errorClass: CommentTranslatorPaidReconcilerErrorClass
): Error & { reconcileErrorClass: CommentTranslatorPaidReconcilerErrorClass } {
  const error = new Error("Paid control-plane reconciliation failed.") as Error & {
    reconcileErrorClass: CommentTranslatorPaidReconcilerErrorClass;
  };
  error.reconcileErrorClass = errorClass;
  return error;
}

function isControlPlaneError(value: unknown): value is Error & {
  reconcileErrorClass: CommentTranslatorPaidReconcilerErrorClass;
} {
  return Boolean(
    value
    && typeof value === "object"
    && "reconcileErrorClass" in value
    && typeof value.reconcileErrorClass === "string"
  );
}

function isClaimWorkKindLifecycleCompatible(
  workKind: CommentTranslatorPaidControlPlaneWorkKind,
  lifecycle: CommentTranslatorPaidCheckoutLifecycle
): boolean {
  switch (workKind) {
    case "checkout-expiry":
      return lifecycle.lifecycleState === "expire_required"
        || ((lifecycle.lifecycleState === "checkout_hold" || lifecycle.lifecycleState === "incomplete")
          && (Boolean(lifecycle.checkoutSessionId)
            || Boolean(lifecycle.subscriptionId)
            || Boolean(lifecycle.subscriptionBindingId)));
    case "unbound-checkout-session":
      return (lifecycle.lifecycleState === "checkout_hold" || lifecycle.lifecycleState === "incomplete")
        && !lifecycle.checkoutSessionId
        && !lifecycle.subscriptionId
        && !lifecycle.subscriptionBindingId;
    case "payment-failure-seven-day":
      return (lifecycle.lifecycleState === "past_due" || lifecycle.lifecycleState === "unpaid")
        && Boolean(lifecycle.paymentFailureStartedAtIso);
    case "cancel-pending":
      return lifecycle.lifecycleState === "cancel_pending";
    case "refund-reconciliation":
      return lifecycle.lifecycleState === "refund_reconciliation";
    case "dispute-reconciliation":
      return lifecycle.lifecycleState === "dispute" || lifecycle.lifecycleState === "dispute_reconciliation";
    case "paid-unentitled-reconciliation":
      return lifecycle.lifecycleState === "paid_unentitled_reconciliation" && Boolean(lifecycle.operatorDisposition);
    case "billing-period-rollover":
      return (lifecycle.lifecycleState === "active" || lifecycle.lifecycleState === "cancel_at_period_end")
        && Boolean(lifecycle.currentPeriodEndIso);
    case "utc-month-cost-rollover":
      return false;
  }
}

function resolveEntitlementStatus(
  subscription: CommentTranslatorStripeSubscriptionSnapshot
): CommentTranslatorPaidEntitlementStatus {
  if (subscription.status === "active") return subscription.cancelAtPeriodEnd ? "cancel_at_period_end" : "active";
  if (subscription.status === "past_due") return "past_due";
  if (subscription.status === "unpaid") return "unpaid";
  if (subscription.status === "canceled") return "canceled";
  if (subscription.status === "incomplete_expired") return "incomplete_expired";
  return "incomplete";
}

function hasMatchingPaidRolloverInvoice({
  graph,
  subscription
}: {
  graph: CommentTranslatorStripeCurrentObjectGraph;
  subscription: CommentTranslatorStripeSubscriptionSnapshot;
}) {
  const invoice = graph.invoice;
  return Boolean(
    subscription.latestInvoiceId
    && subscription.customerId
    && subscription.productId
    && subscription.priceId
    && invoice
    && invoice.id === subscription.latestInvoiceId
    && invoice.customerId === subscription.customerId
    && invoice.subscriptionId === subscription.id
    && invoice.productId === subscription.productId
    && invoice.priceId === subscription.priceId
    && invoice.status === "paid"
    && invoice.paid
  );
}

function hasMatchingCheckoutExpiry({
  session,
  lifecycle
}: {
  session: NonNullable<CommentTranslatorStripeCurrentObjectGraph["checkoutSession"]>;
  lifecycle: CommentTranslatorPaidCheckoutLifecycle;
}) {
  const sessionExpiryMs = Date.parse(session.expiresAtIso ?? "");
  const stripeBindingExpiryMs = Date.parse(lifecycle.stripeExpiresAtIso ?? "");
  const checkoutTargetExpiryMs = Date.parse(lifecycle.checkoutExpiresAtTargetIso ?? "");
  return Number.isFinite(sessionExpiryMs)
    && Number.isFinite(stripeBindingExpiryMs)
    && Number.isFinite(checkoutTargetExpiryMs)
    && sessionExpiryMs === stripeBindingExpiryMs
    && sessionExpiryMs === checkoutTargetExpiryMs;
}

function isCurrentSubscriptionPeriod(
  subscription: CommentTranslatorStripeSubscriptionSnapshot,
  nowIso: string
): boolean {
  const nowMs = Date.parse(nowIso);
  const periodStartMs = Date.parse(subscription.currentPeriodStartIso ?? "");
  const periodEndMs = Date.parse(subscription.currentPeriodEndIso ?? "");
  return Number.isFinite(nowMs)
    && Number.isFinite(periodStartMs)
    && Number.isFinite(periodEndMs)
    && periodStartMs <= nowMs
    && nowMs < periodEndMs;
}

function resolveCheckoutExpiryReconcileAtIso(
  lifecycle: CommentTranslatorPaidCheckoutLifecycle,
  nowIso: string
): string {
  const nowMs = Date.parse(nowIso);
  const targetCandidates = [
    Date.parse(lifecycle.checkoutExpiresAtTargetIso ?? ""),
    Date.parse(lifecycle.stripeExpiresAtIso ?? "")
  ].filter(Number.isFinite);
  const targetMs = targetCandidates.length > 0 ? Math.max(...targetCandidates) : nowMs;
  if (!Number.isFinite(nowMs)) throw createControlPlaneError("binding-not-ready");
  return new Date(Math.max(targetMs, nowMs)).toISOString();
}

function nextUtcMonthBoundaryIso(nowIso: string): string {
  const nowMs = Date.parse(nowIso);
  if (!Number.isFinite(nowMs)) throw createReconcileError("period-reconciliation-failed");
  const now = new Date(nowMs);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

function resolveLifecycleState(status: CommentTranslatorPaidEntitlementStatus): string {
  if (status === "inactive") return "terminated";
  return status;
}

function resolveSubscriptionStatusForProjection(
  status: CommentTranslatorPaidEntitlementStatus,
  observedStatus: CommentTranslatorStripeSubscriptionSnapshot["status"]
): string | null {
  if ([
    "dispute",
    "cancel_pending",
    "paid_unentitled_reconciliation",
    "refund_reconciliation",
    "dispute_reconciliation",
    "inactive"
  ].includes(status)) return null;
  if (observedStatus === "trialing") return "active";
  if (observedStatus === "paused") return "incomplete";
  return observedStatus;
}

function createReconcileIdempotencyKey(kind: string, lifecycleId: string): string {
  return `ct-paid-reconcile-${kind}-${createHmac("sha256", "comment-translator-paid-reconciler")
    .update(lifecycleId, "utf8")
    .digest("hex")
    .slice(0, 32)}`;
}

function readSafeSiteOrigin(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

async function invokeConcreteControlPlaneAction({
  actions,
  request
}: {
  actions: CommentTranslatorPaidControlPlaneActions;
  request: CommentTranslatorPaidControlPlaneActionRequest;
}) {
  switch (request.item.workKind) {
    case "checkout-expiry":
      return actions.checkoutExpiry(request);
    case "unbound-checkout-session":
      return actions.unboundCheckoutSession(request);
    case "payment-failure-seven-day":
      return actions.paymentFailureSevenDay(request);
    case "cancel-pending":
      return actions.cancelPending(request);
    case "refund-reconciliation":
      return actions.refundReconciliation(request);
    case "dispute-reconciliation":
      return actions.disputeReconciliation(request);
    case "paid-unentitled-reconciliation":
      return actions.paidUnentitledReconciliation(request);
    case "billing-period-rollover":
      return actions.billingPeriodRollover(request);
    case "utc-month-cost-rollover":
      return actions.utcMonthCostRollover(request);
  }
}

function normalizeLimit(limit: number): number {
  if (!Number.isFinite(limit) || !Number.isInteger(limit) || limit < 0) {
    throw new Error("Paid control-plane reconcile limit is invalid.");
  }
  return Math.min(limit, commentTranslatorPaidControlPlaneReconcilerContract.maxBatchSize);
}

function isControlPlaneWorkKind(value: unknown): value is CommentTranslatorPaidControlPlaneWorkKind {
  return typeof value === "string" && [
    "checkout-expiry",
    "unbound-checkout-session",
    "payment-failure-seven-day",
    "cancel-pending",
    "refund-reconciliation",
    "dispute-reconciliation",
    "paid-unentitled-reconciliation",
    "billing-period-rollover",
    "utc-month-cost-rollover"
  ].includes(value);
}

function createReconcileError(
  errorClass: CommentTranslatorPaidReconcilerErrorClass
): Error & { reconcileErrorClass: CommentTranslatorPaidReconcilerErrorClass } {
  const error = new Error("Paid reconciliation failed.") as Error & {
    reconcileErrorClass: CommentTranslatorPaidReconcilerErrorClass;
  };
  error.reconcileErrorClass = errorClass;
  return error;
}

function readReconcileErrorClass(error: unknown): CommentTranslatorPaidReconcilerErrorClass {
  if (error && typeof error === "object" && "reconcileErrorClass" in error) {
    const value = error.reconcileErrorClass;
    if (
      typeof value === "string"
      && (commentTranslatorPaidControlPlaneReconcilerContract.retryableErrorClasses as readonly string[]).includes(value)
    ) {
      return value as CommentTranslatorPaidReconcilerErrorClass;
    }
  }
  return "external-action-failed";
}
