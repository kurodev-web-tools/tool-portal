import assert from "node:assert/strict";

class PaidCoreFixture {
  constructor() {
    this.lifecycleByOwner = new Map();
    this.capacityByLifecycle = new Map();
    this.capacityStages = new Map();
    this.openAiSlots = 0;
    this.sessionLeases = new Map();
    this.bindings = new Map();
    this.reconcilerLeases = new Map();
    this.projectionLeases = new Map();
    this.minuteRequests = 0;
    this.rateReservations = new Map();
    this.rollingTokens = 0;
    this.committedAttempts = new Set();
    this.appliedEvents = new Set();
    this.paymentFailure = { status: null, startedAt: null };
    this.entitlementStates = new Map();
    this.logicalAttempts = new Map();
    this.eventClaims = new Map();
    this.pollReservations = new Map();
    this.pollDailyReserved = new Map();
    this.ownerEntitlements = new Map();
    this.providerCosts = new Map();
    this.committedProviderCosts = new Map();
    this.billingLifecycles = new Map();
    this.checkoutHolds = new Map();
    this.checkoutSessions = new Map();
    this.providerCircuits = new Map();
    this.bindingCustomers = new Map();
    this.bindingLifecycles = new Map();
    this.bindingHolds = new Map();
    this.bindingSessions = new Map();
    this.bindingSubscriptions = new Map();
    this.externalIdTombstones = new Set();
    this.checkoutBegins = new Map();
    this.checkoutCustomers = new Map();
    this.hourlyDetails = new Map();
    this.hourlyDetailReceipts = new Map();
    this.logicalProviderAttempts = new Map();
    this.logicalOpenAiAllocations = 0;
    this.sessionSummaries = new Map();
    this.attemptLedgers = new Map();
    this.checkoutSequence = 0;
  }

  reserveLifecycle(owner, lifecycle) {
    if (this.lifecycleByOwner.has(owner) && this.lifecycleByOwner.get(owner) !== lifecycle) {
      return false;
    }
    this.lifecycleByOwner.set(owner, lifecycle);
    return true;
  }

  capacityStageForLifecycle(lifecycleState) {
    if (["checkout_hold", "incomplete", "active", "cancel_at_period_end"].includes(lifecycleState)) return lifecycleState;
    if (["past_due", "unpaid"].includes(lifecycleState)) return "payment_failure_hold";
    if (lifecycleState === "dispute") return "dispute";
    if (lifecycleState === "cancel_pending") return "cancel_pending";
    if (["paid_unentitled_reconciliation", "refund_reconciliation", "dispute_reconciliation"].includes(lifecycleState)) return "reconciliation";
    return null;
  }

  reserveCapacity(lifecycle, stage = "checkout_hold", lifecycleState = stage) {
    if (this.capacityByLifecycle.has(lifecycle)) {
      return this.capacityByLifecycle.get(lifecycle) !== "released" && this.capacityStages.get(lifecycle) === stage;
    }
    if (this.capacityStageForLifecycle(lifecycleState) !== stage) return false;
    if (this.capacityByLifecycle.size >= 20) {
      return false;
    }
    this.capacityByLifecycle.set(lifecycle, stage === "checkout_hold" ? "held" : "consuming");
    this.capacityStages.set(lifecycle, stage);
    return true;
  }

  convertCapacity(lifecycle, stage, lifecycleState) {
    const reservationState = this.capacityByLifecycle.get(lifecycle);
    if (!reservationState || reservationState === "released") return false;
    if (this.capacityStageForLifecycle(lifecycleState) !== stage) return false;
    this.capacityByLifecycle.set(lifecycle, "consuming");
    this.capacityStages.set(lifecycle, stage);
    return true;
  }

  bindFirstSubscriptionCapacity(lifecycle, initialLifecycleState, targetLifecycleState) {
    const initialStage = this.capacityStageForLifecycle(initialLifecycleState);
    const targetStage = this.capacityStageForLifecycle(targetLifecycleState);
    if (!initialStage || !targetStage) return false;
    if (!this.reserveCapacity(lifecycle, initialStage, initialLifecycleState)) return false;
    this.billingLifecycles.set(lifecycle, { lifecycleState: targetLifecycleState, terminal: false });
    return this.convertCapacity(lifecycle, targetStage, targetLifecycleState);
  }

  reserveProviderSessionLease(session, attemptId, providerAttempt, now = 0) {
    const lease = this.sessionLeases.get(session);
    if (lease && ["active", "uncertain"].includes(lease.state) && lease.leaseUntil > now && lease.attemptId !== attemptId) return false;
    this.sessionLeases.set(session, { attemptId, providerAttempt, state: "active", leaseUntil: now + 120 });
    return true;
  }

  finalizeOpenAiSessionLease(session, attemptId, providerAttempt, outcome, providerFailureClass, now = 0, openAiReceiptCount = 1) {
    const lease = this.sessionLeases.get(session);
    if (!lease
      || lease.attemptId !== attemptId
      || lease.providerAttempt !== providerAttempt
      || !["active", "uncertain"].includes(lease.state)
      || lease.leaseUntil <= now) return false;
    const preservesLease = (outcome === "provider_reached_failed"
        && ((providerFailureClass === "invalid-response" && openAiReceiptCount === 1)
          || ["network", "timeout", "rate-limit", "server-error"].includes(providerFailureClass)))
      || (outcome === "provider_not_reached" && ["network", "timeout"].includes(providerFailureClass));
    lease.state = preservesLease ? "active" : "released";
    lease.leaseUntil = preservesLease ? now + 120 : now;
    return true;
  }

  reserveAzureFromOpenAiLease(session, attemptId, azureProviderAttempt, predecessorReceipt, now = 0) {
    const lease = this.sessionLeases.get(session);
    const liveSameBatchLease = lease
      && ["active", "uncertain"].includes(lease.state)
      && lease.leaseUntil > now;
    const safeReleasedLease = lease?.state === "released";
    if (!lease
      || lease.attemptId !== attemptId
      || lease.providerAttempt !== predecessorReceipt.providerAttempt
      || (!liveSameBatchLease && !safeReleasedLease)) return false;
    lease.providerAttempt = azureProviderAttempt;
    lease.state = "active";
    lease.leaseUntil = now + 120;
    return true;
  }

  reserveOpenAiSlot(session, attempt = session) {
    const existing = this.sessionLeases.get(session);
    if ((existing && existing !== attempt) || this.openAiSlots >= 8) {
      return false;
    }
    this.sessionLeases.set(session, attempt);
    this.openAiSlots += 1;
    return true;
  }

  reserveAzureFallback(session, attempt = session) {
    const existing = this.sessionLeases.get(session);
    if (existing && existing !== attempt) return false;
    if (!existing) this.sessionLeases.set(session, attempt);
    return true;
  }

  reserveRate(requests, tokens, reservation = null) {
    if (this.minuteRequests + requests > 10 || this.rollingTokens + tokens > 100) return false;
    this.minuteRequests += requests;
    this.rollingTokens += tokens;
    if (reservation) this.rateReservations.set(reservation, { requests, state: "reserved" });
    return true;
  }

  finalizeProviderNotReached(reservation) {
    const rate = this.rateReservations.get(reservation);
    if (!rate || !["reserved", "uncertain"].includes(rate.state) || this.minuteRequests < rate.requests) return false;
    this.minuteRequests -= rate.requests;
    rate.state = "released";
    return true;
  }

  finalizeProviderReachedFailed(reservation, providerCostKey, session) {
    const rate = this.rateReservations.get(reservation);
    const reservedCost = this.providerCosts.get(providerCostKey);
    if (!rate || !["reserved", "uncertain"].includes(rate.state) || reservedCost === undefined) return false;
    rate.state = "completed";
    this.providerCosts.set(providerCostKey, 0);
    this.committedProviderCosts.set(providerCostKey, reservedCost);
    if (this.sessionLeases.has(session)) this.openAiSlots -= 1;
    return true;
  }

  bindImmutable(bindingKey, value) {
    if (this.bindings.has(bindingKey)) return this.bindings.get(bindingKey) === value;
    this.bindings.set(bindingKey, value);
    return true;
  }

  bindFirstSubscription(lifecycle, owner, customer) {
    const lifecycleBinding = this.billingLifecycles.get(lifecycle);
    const hold = this.checkoutHolds.get(lifecycle);
    const session = this.checkoutSessions.get(lifecycle);
    if (!lifecycleBinding || lifecycleBinding.owner !== owner || lifecycleBinding.terminal || lifecycleBinding.lifecycleState === "expire_required") return false;
    if (!hold || hold.owner !== owner || !["held", "converted"].includes(hold.state)) return false;
    return Boolean(
      session
      && session.owner === owner
      && session.hold === hold.hold
      && session.customer === customer
      && session.customerBinding === lifecycleBinding.customerBinding
    );
  }

  deleteImmutable(bindingKey, triggerDepth) {
    if (triggerDepth <= 1) return false;
    return this.bindings.delete(bindingKey);
  }

  deleteCheckoutHold(holdId, triggerDepth) {
    if (triggerDepth <= 1) return false;
    this.bindingHolds.delete(holdId);
    for (const [sessionId, session] of this.bindingSessions) {
      if (session.hold === holdId) this.bindingSessions.delete(sessionId);
    }
    return true;
  }

  insertCustomerBinding(customer, owner, stripeCustomer) {
    if (this.externalIdTombstones.has(`customer/${stripeCustomer}`)) return false;
    const existing = this.bindingCustomers.get(customer);
    if (existing) return existing.owner === owner && existing.stripeCustomer === stripeCustomer;
    if ([...this.bindingCustomers.values()].some((row) => row.owner === owner || row.stripeCustomer === stripeCustomer)) return false;
    this.bindingCustomers.set(customer, { owner, stripeCustomer });
    return true;
  }

  insertLifecycleBinding(lifecycle, customer, owner) {
    if (this.bindingCustomers.get(customer)?.owner !== owner) return false;
    if ([...this.bindingLifecycles.values()].some((row) => row.owner === owner && !row.terminal)) return false;
    this.bindingLifecycles.set(lifecycle, {
      id: lifecycle,
      customer,
      owner,
      createdAt: "created",
      state: "checkout_hold",
      terminal: false,
      reconcileLeaseToken: null
    });
    return true;
  }

  terminalizeLifecycleBinding(lifecycle) {
    const row = this.bindingLifecycles.get(lifecycle);
    if (!row) return false;
    row.terminal = true;
    row.state = "terminated";
    return true;
  }

  insertHoldBinding(hold, lifecycle, owner) {
    const parent = this.bindingLifecycles.get(lifecycle);
    if (!parent || parent.owner !== owner) return false;
    const existingForLifecycle = [...this.bindingHolds.entries()].find(([, row]) => row.lifecycle === lifecycle);
    if (existingForLifecycle && existingForLifecycle[0] !== hold) return false;
    this.bindingHolds.set(hold, {
      id: hold,
      lifecycle,
      owner,
      idempotencyKey: `key-${hold}`,
      checkoutExpiresAtTarget: "target",
      createdAt: "created",
      state: "held",
      releasedAt: null,
      updatedAt: "created"
    });
    return true;
  }

  insertSessionBinding(session, hold, lifecycle, customer, owner, stripeCustomer) {
    if (this.externalIdTombstones.has(`checkout_session/${session}`)) return false;
    const parent = this.bindingLifecycles.get(lifecycle);
    const holdBinding = this.bindingHolds.get(hold);
    const customerBinding = this.bindingCustomers.get(customer);
    if (!parent || parent.owner !== owner) return false;
    if (!holdBinding || holdBinding.owner !== owner || holdBinding.lifecycle !== lifecycle) return false;
    if (parent.customer !== customer) return false;
    if (!customerBinding || customerBinding.owner !== owner || customerBinding.stripeCustomer !== stripeCustomer) return false;
    const existingForLifecycle = [...this.bindingSessions.entries()].find(([, row]) => row.lifecycle === lifecycle || row.hold === hold);
    if (existingForLifecycle && existingForLifecycle[0] !== session) return false;
    this.bindingSessions.set(session, { hold, lifecycle, customer, owner, stripeCustomer });
    return true;
  }

  insertSubscriptionBinding(subscription, lifecycle, customer, owner, stripeCustomer) {
    if (this.externalIdTombstones.has(`subscription/${subscription}`)) return false;
    const parent = this.bindingLifecycles.get(lifecycle);
    const customerBinding = this.bindingCustomers.get(customer);
    if (!parent || parent.owner !== owner) return false;
    if (parent.customer !== customer) return false;
    if (!customerBinding || customerBinding.owner !== owner || customerBinding.stripeCustomer !== stripeCustomer) return false;
    this.bindingSubscriptions.set(subscription, { lifecycle, customer, owner, stripeCustomer });
    return true;
  }

  deleteAccountCascade(customer, session, subscription) {
    const customerRow = this.bindingCustomers.get(customer);
    const sessionRow = this.bindingSessions.get(session);
    const subscriptionRow = this.bindingSubscriptions.get(subscription);
    if (!customerRow || !sessionRow || !subscriptionRow) return false;
    this.externalIdTombstones.add(`customer/${customerRow.stripeCustomer}`);
    this.externalIdTombstones.add(`checkout_session/${session}`);
    this.externalIdTombstones.add(`subscription/${subscription}`);
    this.bindingCustomers.delete(customer);
    this.bindingSessions.delete(session);
    this.bindingSubscriptions.delete(subscription);
    for (const [lifecycle, row] of this.bindingLifecycles) {
      if (row.customer !== customer) continue;
      this.bindingLifecycles.delete(lifecycle);
      for (const [hold, holdRow] of this.bindingHolds) {
        if (holdRow.lifecycle === lifecycle) this.bindingHolds.delete(hold);
      }
    }
    return true;
  }

  updateHoldBinding(hold, changes) {
    const current = this.bindingHolds.get(hold);
    if (!current) return false;
    for (const field of ["id", "lifecycle", "owner", "idempotencyKey", "checkoutExpiresAtTarget", "createdAt"]) {
      if (field in changes && changes[field] !== current[field]) return false;
    }
    this.bindingHolds.set(hold, { ...current, ...changes });
    return true;
  }

  updateLifecycleBinding(lifecycle, changes) {
    const current = this.bindingLifecycles.get(lifecycle);
    if (!current) return false;
    for (const field of ["id", "owner", "customer", "createdAt"]) {
      if (field in changes && changes[field] !== current[field]) return false;
    }
    this.bindingLifecycles.set(lifecycle, { ...current, ...changes });
    return true;
  }

  insertEntitlementBinding(lifecycle, customer, subscription, owner) {
    const lifecycleBinding = this.bindingLifecycles.get(lifecycle);
    const subscriptionBinding = subscription ? this.bindingSubscriptions.get(subscription) : null;
    if (!lifecycleBinding || lifecycleBinding.owner !== owner || lifecycleBinding.customer !== customer) return false;
    if (this.bindingCustomers.get(customer)?.owner !== owner) return false;
    return !subscription || Boolean(
      subscriptionBinding
      && subscriptionBinding.owner === owner
      && subscriptionBinding.lifecycle === lifecycle
      && subscriptionBinding.customer === customer
    );
  }

  finalizeProviderAttempt(attemptState, heldSessionToken, suppliedSessionToken, heldSlotToken = null, suppliedSlotToken = null) {
    if (heldSessionToken === null || heldSessionToken !== suppliedSessionToken) return false;
    if (heldSlotToken !== null && heldSlotToken !== suppliedSlotToken) return false;
    if (["committed", "released", "expired"].includes(attemptState)) return true;
    return true;
  }

  finalizeAzureOutcome(attempt, outcome) {
    const existing = this.logicalAttempts.get(attempt);
    if (!existing || existing.settled || existing.released) return false;
    if (outcome === "uncertain_inflight") {
      existing.providers.set("azure", "uncertain");
      existing.azureReceiptExpiresInSeconds = 120;
      existing.sessionLeaseExpiresInSeconds = 120;
      return true;
    }
    if (outcome === "completed") return this.settleLogicalAttempt(attempt);
    if (outcome === "provider_not_reached") return this.failProviderAttempt(attempt, "azure");
    return false;
  }

  reclaimAzureUnknown(attempt) {
    const existing = this.logicalAttempts.get(attempt);
    if (!existing || existing.providers.get("azure") !== "uncertain") return false;
    existing.providers.set("azure", "unknown_expired");
    existing.azurePhysicalCommittedCharacters = existing.providerReservations.get("azure") ?? existing.characters;
    existing.providerReservations.set("azure", 0);
    return true;
  }

  recordOwnerEntitlement(owner, lifecycle, status, terminal) {
    const rows = this.ownerEntitlements.get(owner) ?? [];
    rows.push({ lifecycle, status, terminal });
    this.ownerEntitlements.set(owner, rows);
  }

  readOwnerEntitlement(owner, lifecycle = null) {
    const rows = this.ownerEntitlements.get(owner) ?? [];
    const candidates = lifecycle ? rows.filter((row) => row.lifecycle === lifecycle) : rows.filter((row) => !row.terminal);
    if (candidates.length > 1) return false;
    return candidates[0] ?? null;
  }

  attachNullableBinding(bindingKey, value) {
    if (!this.bindings.has(bindingKey)) {
      this.bindings.set(bindingKey, value ?? null);
      return true;
    }
    const existing = this.bindings.get(bindingKey);
    if (existing === null && value) {
      this.bindings.set(bindingKey, value);
      return true;
    }
    return existing === value;
  }

  claimReconciler(lifecycle, token) {
    if (this.reconcilerLeases.has(lifecycle)) return false;
    this.reconcilerLeases.set(lifecycle, token);
    return true;
  }

  finalizeReconciler(lifecycle, token) {
    if (this.reconcilerLeases.get(lifecycle) !== token) return false;
    this.reconcilerLeases.delete(lifecycle);
    return true;
  }

  claimProjection(lifecycle, owner, token, now) {
    const row = this.billingLifecycles.get(lifecycle);
    const current = this.projectionLeases.get(lifecycle);
    if (!row || row.owner !== owner || (current && current.until > now)) return false;
    this.projectionLeases.set(lifecycle, { token, until: now + 120 });
    return true;
  }

  projectClaimedEntitlement(lifecycle, token, now, status) {
    const lease = this.projectionLeases.get(lifecycle);
    if (!token || !lease || lease.token !== token || lease.until <= now) return false;
    this.entitlementStates.set(lifecycle, status);
    this.projectionLeases.delete(lifecycle);
    return true;
  }

  projectEntitlement(lifecycle, status, lifecycleState = null, disputeState = "none", subscriptionStatus = null, projection = {}) {
    const terminal = new Set(["canceled", "incomplete_expired", "inactive"]);
    const current = this.entitlementStates.get(lifecycle);
    if (current && terminal.has(current) && !terminal.has(status)) return false;
    const defaultLifecycle = new Map([
      ["inactive", "terminated"]
    ]).get(status) ?? status;
    const targetLifecycle = lifecycleState ?? defaultLifecycle;
    const subscriptionRequired = [
      "active", "cancel_at_period_end", "past_due", "unpaid", "canceled",
      "incomplete_expired", "dispute", "cancel_pending",
      "paid_unentitled_reconciliation", "refund_reconciliation", "dispute_reconciliation"
    ].includes(status);
    const subscriptionBindingId = Object.hasOwn(projection, "subscriptionBindingId")
      ? projection.subscriptionBindingId
      : (subscriptionRequired ? "subscription-1" : null);
    const periodStart = Object.hasOwn(projection, "periodStart") ? projection.periodStart : (subscriptionBindingId ? 0 : null);
    const periodEnd = Object.hasOwn(projection, "periodEnd") ? projection.periodEnd : (subscriptionBindingId ? 1 : null);
    const cancelAtPeriodEnd = Object.hasOwn(projection, "cancelAtPeriodEnd")
      ? projection.cancelAtPeriodEnd
      : ["cancel_at_period_end", "cancel_pending"].includes(status);
    if (subscriptionRequired && !subscriptionBindingId) return false;
    if ((periodStart === null) !== (periodEnd === null)) return false;
    if (periodStart !== null && (!Number.isFinite(periodStart) || !Number.isFinite(periodEnd) || periodEnd <= periodStart)) return false;
    if (subscriptionBindingId && periodStart === null) return false;
    if (cancelAtPeriodEnd !== ["cancel_at_period_end", "cancel_pending"].includes(status)) return false;
    const subscriptionMatches = (expected) => subscriptionStatus === null || subscriptionStatus === expected;
    const compatible =
      (status === "active" && targetLifecycle === "active" && ["none", "won"].includes(disputeState) && subscriptionMatches("active")) ||
      (status === "cancel_at_period_end" && targetLifecycle === "cancel_at_period_end" && ["none", "won"].includes(disputeState) && subscriptionMatches("active")) ||
      (status === "past_due" && targetLifecycle === "past_due" && disputeState === "none" && subscriptionMatches("past_due")) ||
      (status === "unpaid" && targetLifecycle === "unpaid" && disputeState === "none" && subscriptionMatches("unpaid")) ||
      (status === "incomplete" && ["checkout_hold", "incomplete", "expire_required"].includes(targetLifecycle) && disputeState === "none" && subscriptionMatches("incomplete")) ||
      (status === "dispute" && targetLifecycle === "dispute" && ["investigating", "lost", "reconciliation"].includes(disputeState) && subscriptionStatus === null) ||
      (status === "cancel_pending" && targetLifecycle === "cancel_pending" && disputeState === "none" && subscriptionStatus === null) ||
      (["paid_unentitled_reconciliation", "refund_reconciliation"].includes(status) && targetLifecycle === status && disputeState === "none" && subscriptionStatus === null) ||
      (status === "dispute_reconciliation" && targetLifecycle === "dispute_reconciliation" && disputeState === "reconciliation" && subscriptionStatus === null) ||
      (status === "incomplete_expired" && targetLifecycle === "incomplete_expired" && disputeState === "none" && subscriptionMatches("incomplete_expired")) ||
      (status === "canceled" && targetLifecycle === "canceled" && disputeState === "none" && subscriptionMatches("canceled")) ||
      (status === "inactive" && targetLifecycle === "terminated" && disputeState === "none" && subscriptionStatus === null);
    if (!compatible) return false;
    this.entitlementStates.set(lifecycle, status);
    return true;
  }

  recordProviderCircuitFailure(provider, now = 0, errorClass = "network") {
    const circuit = this.providerCircuits.get(provider);
    const state = typeof circuit === "string" ? circuit : circuit?.state;
    if (state === "disabled") return "disabled";
    if (["quota", "configuration", "policy"].includes(errorClass)) {
      this.providerCircuits.set(provider, { ...circuit, state, lastErrorClass: errorClass });
      return state;
    }
    if (state === "degraded") {
      this.providerCircuits.set(provider, {
        ...circuit,
        state: "degraded",
        failureCount: Math.max((circuit.failureCount ?? 0) + 1, 3),
        degradedUntil: Math.max(circuit.degradedUntil ?? now, now + 300),
        probeAttemptId: null,
        probeLeaseUntil: null
      });
      return "degraded";
    }
    if (state === "half_open") {
      this.providerCircuits.set(provider, {
        state: "degraded",
        failureCount: 3,
        windowStartedAt: circuit.windowStartedAt ?? now,
        degradedUntil: now + 300,
        probeAttemptId: null,
        probeLeaseUntil: null
      });
      return "degraded";
    }
    const windowStartedAt = typeof circuit === "object" ? circuit.windowStartedAt : null;
    const currentCount = typeof circuit === "object" ? circuit.failureCount ?? 0 : 0;
    const failureCount = windowStartedAt === null || windowStartedAt + 60 <= now ? 1 : currentCount + 1;
    const nextState = failureCount >= 3 ? "degraded" : "closed";
    this.providerCircuits.set(provider, {
      state: nextState,
      failureCount,
      windowStartedAt: failureCount === 1 ? now : windowStartedAt,
      degradedUntil: nextState === "degraded" ? now + 300 : null,
      probeAttemptId: null,
      probeLeaseUntil: null
    });
    return nextState;
  }

  probeProviderCircuit(provider, now = 0) {
    const circuit = this.providerCircuits.get(provider);
    const state = typeof circuit === "string" ? circuit : circuit?.state;
    if (state === "degraded" && circuit.degradedUntil <= now) {
      this.providerCircuits.set(provider, { ...circuit, state: "half_open", probeAttemptId: null, probeLeaseUntil: null });
      return "half_open";
    }
    return state;
  }

  canReserveProviderTraffic(provider) {
    const circuit = this.providerCircuits.get(provider);
    const state = typeof circuit === "string" ? circuit : circuit?.state;
    return state === "closed" || state === "half_open";
  }

  recordProviderCircuitSuccess(provider, probeAttemptId = null, now = 0) {
    if (!this.providerCircuits.has(provider)) return false;
    const circuit = this.providerCircuits.get(provider);
    const state = typeof circuit === "string" ? circuit : circuit.state;
    if (state === "disabled" || state === "closed") return true;
    if (state === "degraded" || state !== "half_open") return false;
    if (circuit.probeAttemptId !== probeAttemptId || circuit.probeLeaseUntil <= now) return false;
    this.providerCircuits.set(provider, "closed");
    return true;
  }

  disableProviderCircuit(provider) {
    if (!this.providerCircuits.has(provider)) return false;
    this.providerCircuits.set(provider, "disabled");
    return true;
  }

  reserveLogicalProviderAttempt(attempt, providerAttempt, provider, predecessorState = null, predecessorOutcome = null, predecessorResourcesReleased = false, openAiCircuitErrorClass = null, requestedInputCharacters = 1, requestedCostMicros = 1) {
    const rows = this.logicalProviderAttempts.get(attempt) ?? new Map();
    const existing = rows.get(providerAttempt);
    if (existing) return existing.provider === provider;
    const predecessors = [...rows.values()];
    if (provider === "openai" && rows.size > 0) {
      if (predecessors.length !== 1
        || predecessors[0].provider !== "openai"
        || predecessors[0].state !== "committed"
        || predecessors[0].outcome !== "provider_reached_failed"
        || predecessors[0].providerFailureClass !== "invalid-response"
        || predecessors[0].committedCost <= 0
        || !predecessors[0].rateCompleted
        || !predecessors[0].slotSessionReleased) return false;
    }
    if (provider === "azure") {
      if (predecessors.length === 0) {
        if (predecessorState !== "degraded"
          || !["network", "timeout", "rate-limit", "server-error"].includes(openAiCircuitErrorClass)) return false;
      } else {
        const latest = predecessors.at(-1);
        const safeTerminal = (row) => row.provider === "openai" && (
          (row.state === "released"
            && row.outcome === "provider_not_reached"
            && row.resourcesReleased
            && row.slotSessionReleased)
          || (row.state === "committed"
            && row.outcome === "provider_reached_failed"
            && !row.resourcesReleased
            && row.committedCost > 0
            && row.rateCompleted
            && row.slotSessionReleased)
        );
        const singleUncertain = predecessors.length === 1 && latest.provider === "openai" && latest.state === "uncertain";
        if (predecessors.length > 2
          || !["network", "timeout", "rate-limit", "server-error"].includes(latest.providerFailureClass)
          || (!singleUncertain && !predecessors.every(safeTerminal))) return false;
      }
    }
    rows.set(providerAttempt, {
      provider,
      state: provider === "azure" ? "active" : predecessorState ?? "active",
      outcome: predecessorOutcome,
      resourcesReleased: predecessorResourcesReleased,
      providerFailureClass: provider === "openai" ? openAiCircuitErrorClass : null,
      committedCost: 0,
      rateCompleted: false,
      slotSessionReleased: false,
      requestedInputCharacters,
      requestedCostMicros,
      committedInputCharacters: 0
    });
    this.logicalProviderAttempts.set(attempt, rows);
    if (provider === "openai") this.logicalOpenAiAllocations += 1;
    return true;
  }

  releaseLogicalProviderAttempt(attempt, providerAttempt, outcome = "provider_not_reached", resourcesReleased = true, providerFailureClass = null) {
    const row = this.logicalProviderAttempts.get(attempt)?.get(providerAttempt);
    if (!row) return false;
    row.state = outcome === "provider_reached_failed" ? "committed" : "released";
    row.outcome = outcome;
    row.resourcesReleased = resourcesReleased;
    row.providerFailureClass = providerFailureClass;
    row.committedCost = outcome === "provider_reached_failed" ? 1 : 0;
    row.rateCompleted = outcome === "provider_reached_failed";
    row.slotSessionReleased = true;
    return true;
  }

  finalizeOpenAiProviderAttempt(attempt, providerAttempt, outcome, providerFailureClass = null, actualInputCharacters = null, actualCostMicros = null) {
    const row = this.logicalProviderAttempts.get(attempt)?.get(providerAttempt);
    if (!row || row.provider !== "openai") return false;
    if (["committed", "released", "expired"].includes(row.state)) {
      if (row.state === "expired") return false;
      if (row.state === "committed") {
        return (outcome === "completed"
            && row.providerFailureClass === null
            && (actualInputCharacters ?? row.requestedInputCharacters) === row.committedInputCharacters
            && (actualCostMicros ?? row.requestedCostMicros) === row.committedCost)
          || (outcome === "provider_reached_failed" && row.providerFailureClass === providerFailureClass);
      }
      return outcome === "provider_not_reached" && row.providerFailureClass === providerFailureClass;
    }
    if (!["active", "uncertain"].includes(row.state)) return false;
    if (outcome === "uncertain_inflight") {
      row.state = "uncertain";
      row.providerFailureClass = providerFailureClass;
      return true;
    }
    if (outcome === "completed") {
      row.state = "committed";
      row.outcome = "completed";
      row.providerFailureClass = null;
      row.committedInputCharacters = actualInputCharacters ?? row.requestedInputCharacters;
      row.committedCost = actualCostMicros ?? row.requestedCostMicros;
      return true;
    }
    return this.releaseLogicalProviderAttempt(attempt, providerAttempt, outcome, outcome === "provider_not_reached", providerFailureClass);
  }

  finalizeAzureProviderAttempt(attempt, providerAttempt, outcome, providerFailureClass = null, actualInputCharacters = null) {
    const row = this.logicalProviderAttempts.get(attempt)?.get(providerAttempt);
    if (!row || row.provider !== "azure") return false;
    if (["committed", "released", "expired"].includes(row.state)) {
      if (row.state === "expired") return false;
      if (row.state === "committed") {
        return (outcome === "completed"
            && row.providerFailureClass === null
            && (actualInputCharacters ?? row.requestedInputCharacters) === row.committedInputCharacters)
          || (outcome === "provider_reached_failed" && row.providerFailureClass === providerFailureClass);
      }
      return outcome === "provider_not_reached" && row.providerFailureClass === providerFailureClass;
    }
    if (!["active", "uncertain"].includes(row.state)) return false;
    if (outcome === "uncertain_inflight") {
      row.state = "uncertain";
      row.providerFailureClass = providerFailureClass;
      return true;
    }
    if (outcome === "completed") {
      row.state = "committed";
      row.outcome = "completed";
      row.providerFailureClass = null;
      row.committedInputCharacters = actualInputCharacters ?? row.requestedInputCharacters;
      return true;
    }
    if (outcome === "provider_reached_failed") return false;
    return this.releaseLogicalProviderAttempt(attempt, providerAttempt, outcome, outcome === "provider_not_reached", providerFailureClass);
  }

  hasCommittedProviderSuccess(attempt, providerAttempt) {
    const row = this.logicalProviderAttempts.get(attempt)?.get(providerAttempt);
    return row?.state === "committed" && row.providerFailureClass === null;
  }

  recordHourlyDetail(attempt, providerAttempt, bucket, histogram, now = 0, logicalExpiresAt = 1440, providerReceiptExpiresAt = 120, sourceExpiresAt = providerReceiptExpiresAt) {
    const receipt = `${attempt}/${providerAttempt}`;
    if (logicalExpiresAt <= now) return false;
    if (this.hourlyDetailReceipts.has(receipt)) return false;
    if (sourceExpiresAt !== providerReceiptExpiresAt
      || providerReceiptExpiresAt <= now
      || providerReceiptExpiresAt > now + 120) return false;
    this.hourlyDetailReceipts.set(receipt, logicalExpiresAt);
    const current = this.hourlyDetails.get(bucket) ?? histogram.map(() => 0);
    this.hourlyDetails.set(bucket, current.map((count, index) => count + histogram[index]));
    return true;
  }

  cleanupHourlyDetailReceipts(now, limit = 1000) {
    const expired = [...this.hourlyDetailReceipts.entries()]
      .filter(([, expiresAt]) => expiresAt <= now)
      .slice(0, limit);
    for (const [receipt] of expired) this.hourlyDetailReceipts.delete(receipt);
    return expired.length;
  }

  seedAttemptLedger(attempt, expiresAt, logicalState, providerStates) {
    this.attemptLedgers.set(attempt, { expiresAt, logicalState, providerStates });
  }

  cleanupAttemptLedgers(now, limit = 500) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) return false;
    const terminalProviderStates = new Set(["committed", "released", "expired"]);
    const candidates = [...this.attemptLedgers.entries()]
      .filter(([, row]) => row.expiresAt <= now
        && ["committed", "released"].includes(row.logicalState)
        && row.providerStates.every((state) => terminalProviderStates.has(state)))
      .sort((left, right) => left[1].expiresAt - right[1].expiresAt || left[0].localeCompare(right[0]))
      .slice(0, limit);
    for (const [attempt] of candidates) this.attemptLedgers.delete(attempt);
    return candidates.length;
  }

  claimEvent(eventId, token, stale = false) {
    const existing = this.eventClaims.get(eventId);
    if (existing && !stale) return { status: "processing", token: null };
    this.eventClaims.set(eventId, token);
    return { status: "processing", token };
  }

  reservePoll(session, owner, budget, utcDay = "day-1", availableToday = 720) {
    const key = `${session}/${utcDay}`;
    const existing = this.pollReservations.get(key);
    if (!existing) {
      const sessionRows = [...this.pollReservations.entries()]
        .filter(([reservationKey]) => reservationKey.startsWith(`${session}/`))
        .map(([, row]) => row);
      if (sessionRows.some((row) => row.owner !== owner)) return false;
      const cumulative = sessionRows.reduce((sum, row) => sum + row.polls, 0);
      const polls = Math.min(availableToday, 720 - cumulative);
      if (polls <= 0) return false;
      const dailyReserved = this.pollDailyReserved.get(utcDay) ?? 0;
      if (cumulative === 0 && dailyReserved + polls > Math.floor(budget * 0.90)) return false;
      if (dailyReserved + polls > budget) return false;
      this.pollReservations.set(key, { owner, budget, polls });
      this.pollDailyReserved.set(utcDay, dailyReserved + polls);
      return polls;
    }
    if (existing.owner !== owner || existing.budget !== budget) return false;
    return existing.polls;
  }

  releaseCapacity(lifecycle, token) {
    const heldLease = this.reconcilerLeases.get(lifecycle);
    if (heldLease && heldLease !== token) return false;
    const entitlement = this.entitlementStates.get(lifecycle);
    if (entitlement && !["canceled", "incomplete_expired", "inactive"].includes(entitlement)) return false;
    if (!this.capacityByLifecycle.has(lifecycle)) return false;
    this.capacityByLifecycle.set(lifecycle, "released");
    return true;
  }

  reserveLogicalAttempt(attempt, provider, characters) {
    const existing = this.logicalAttempts.get(attempt);
    if (!existing) {
      this.logicalAttempts.set(attempt, { provider, characters, reservedCharacters: characters, committedCharacters: 0, settled: false, released: false, releaseCount: 0, providers: new Map([[provider, "active"]]), providerReservations: new Map([[provider, characters]]) });
      return characters;
    }
    if (characters <= 0 || characters > existing.characters) return false;
    if (existing.released) return false;
    if (existing.settled) return 0;
    if (!existing.providers.has(provider)) {
      existing.providers.set(provider, "active");
      existing.providerReservations.set(provider, characters);
    } else if (existing.providerReservations.get(provider) !== characters) {
      return false;
    }
    return 0;
  }

  reserveOpenAiRetryCharacters(attempt, characters) {
    const existing = this.logicalAttempts.get(attempt);
    if (!existing || existing.settled || existing.released || characters <= 0 || characters > existing.characters) return false;
    return 0;
  }

  settleLogicalAttempt(attempt, actualCharacters = null) {
    const existing = this.logicalAttempts.get(attempt);
    const committedCharacters = actualCharacters ?? existing?.characters;
    if (!existing || existing.settled || existing.released || committedCharacters <= 0 || committedCharacters > existing.characters) return false;
    existing.settled = true;
    existing.committedCharacters = committedCharacters;
    existing.reservedCharacters = 0;
    for (const provider of existing.providerReservations.keys()) existing.providerReservations.set(provider, 0);
    return true;
  }

  releaseLogicalAttempt(attempt) {
    const existing = this.logicalAttempts.get(attempt);
    if (!existing || existing.settled) return false;
    existing.released = true;
    existing.releaseCount += 1;
    existing.reservedCharacters = 0;
    for (const provider of existing.providerReservations.keys()) existing.providerReservations.set(provider, 0);
    return true;
  }

  failProviderAttempt(attempt, provider) {
    const existing = this.logicalAttempts.get(attempt);
    if (!existing || existing.settled || existing.released) return false;
    existing.providers.set(provider, "released");
    existing.providerReservations.set(provider, 0);
    if (provider === "openai" && !existing.providers.has("azure")) return false;
    if ([...existing.providers.values()].some((state) => ["active", "uncertain", "unknown_expired", "committed"].includes(state))) return false;
    return this.releaseLogicalAttempt(attempt);
  }

  abandonLogicalAttempt(attempt, releasedProvider, session = null) {
    const existing = this.logicalAttempts.get(attempt);
    if (!existing || existing.providers.get(releasedProvider) !== "released") return false;
    if (existing.settled || existing.released) return 0;
    const siblings = [...existing.providers.entries()].filter(([provider]) => provider !== releasedProvider);
    if (siblings.some(([, state]) => ["active", "uncertain", "unknown_expired", "committed"].includes(state))) return false;
    existing.released = true;
    existing.releaseCount += 1;
    existing.reservedCharacters = 0;
    const lease = session === null ? null : this.sessionLeases.get(session);
    if (lease?.attemptId === attempt && ["active", "uncertain"].includes(lease.state)) {
      lease.state = "released";
      lease.leaseUntil = 0;
    }
    return existing.characters;
  }

  expireUnknownProviderAttempt(attempt, provider) {
    const existing = this.logicalAttempts.get(attempt);
    if (!existing || existing.settled || existing.released) return false;
    existing.providers.set(provider, "unknown_expired");
    return true;
  }

  reclaimUnknownProviderAttempt(attempt, provider) {
    const existing = this.logicalAttempts.get(attempt);
    if (!existing || existing.settled || existing.released || existing.providers.get(provider) !== "unknown_expired") return false;
    existing.providers.set(provider, "reclaimed_unknown");
    existing.providerReservations.set(provider, 0);
    const hasActiveSibling = [...existing.providers.values()].some((state) => ["active", "uncertain", "unknown_expired"].includes(state));
    if (hasActiveSibling) return false;
    return this.releaseLogicalAttempt(attempt);
  }

  reserveProviderCost(attempt, providerAttempt, provider, cost) {
    const key = `${attempt}/${providerAttempt}`;
    if (this.providerCosts.has(key)) return this.providerCosts.get(key) === cost;
    this.providerCosts.set(key, provider === "openai" ? cost : 0);
    return true;
  }

  commitAttempt(attempt) {
    if (this.committedAttempts.has(attempt)) {
      return false;
    }
    this.committedAttempts.add(attempt);
    return true;
  }

  applyEvent(eventId) {
    if (this.appliedEvents.has(eventId)) {
      return false;
    }
    this.appliedEvents.add(eventId);
    return true;
  }

  recordPaymentFailure(status, observedAt) {
    if ((status === "past_due" || status === "unpaid") && !["past_due", "unpaid"].includes(this.paymentFailure.status)) {
      this.paymentFailure.startedAt = observedAt;
      this.paymentFailure.nextReconcileAt = `${observedAt}+7d`;
    } else if (status === "active" && ["past_due", "unpaid"].includes(this.paymentFailure.status)) {
      this.paymentFailure.startedAt = null;
      this.paymentFailure.nextReconcileAt = null;
    }
    this.paymentFailure.status = status;
    return this.paymentFailure.startedAt;
  }

  beginCheckout(owner, stripeCustomer, statementTime) {
    const customer = this.checkoutCustomers.get(owner);
    if (customer && customer.stripeCustomer !== stripeCustomer) return false;
    const ownerExisting = [...this.checkoutBegins.values()].find((row) => row.owner === owner && !row.terminal);
    if (ownerExisting) {
      if (ownerExisting.lifecycleState !== "checkout_hold"
        || ownerExisting.holdState !== "held"
        || this.capacityByLifecycle.get(ownerExisting.lifecycle) !== "held") return false;
      return ownerExisting.stripeCustomer === stripeCustomer ? ownerExisting : false;
    }
    if ([...this.checkoutCustomers.values()].some((row) => row.owner !== owner && row.stripeCustomer === stripeCustomer)) return false;
    if ([...this.capacityByLifecycle.values()].filter((state) => state !== "released").length >= 20) return false;
    this.checkoutSequence += 1;
    const hold = `hold-${this.checkoutSequence}`;
    const idempotencyKey = `ct-paid-checkout-${hold}`;
    const expiry = statementTime + 31;
    const binding = {
      owner,
      stripeCustomer,
      expiry,
      lifecycle: `lifecycle-${this.checkoutSequence}`,
      hold,
      idempotencyKey,
      customer: customer?.id ?? `customer-${owner}`,
      session: null,
      holdState: "held",
      lifecycleState: "checkout_hold",
      terminal: false,
      released: false,
      nextReconcileAt: expiry
    };
    this.checkoutCustomers.set(owner, { id: binding.customer, owner, stripeCustomer });
    this.checkoutBegins.set(idempotencyKey, binding);
    this.capacityByLifecycle.set(binding.lifecycle, "held");
    return binding;
  }

  bindCheckoutSession(owner, lifecycle, hold, customer, stripeSession, stripeCustomer, expiry, statementTime, isRecoveryBinding, idempotencyKey) {
    const checkout = [...this.checkoutBegins.values()].find((row) => row.lifecycle === lifecycle);
    if (!checkout || checkout.owner !== owner || checkout.hold !== hold || checkout.customer !== customer
      || checkout.stripeCustomer !== stripeCustomer || checkout.expiry !== expiry || checkout.terminal
      || checkout.lifecycleState === "expire_required" || checkout.holdState === "expire_required") return false;
    if (!isRecoveryBinding && expiry <= statementTime) return false;
    if (isRecoveryBinding && (checkout.holdState === "released"
      || idempotencyKey !== [...this.checkoutBegins.entries()].find(([, row]) => row === checkout)?.[0])) return false;
    const reassigned = [...this.checkoutSessions.values()].find((row) =>
      row.lifecycle === lifecycle || row.hold === hold || row.stripeSession === stripeSession
    );
    if (reassigned) {
      return reassigned.owner === owner && reassigned.lifecycle === lifecycle && reassigned.hold === hold
        && reassigned.customer === customer && reassigned.stripeSession === stripeSession
        && reassigned.stripeCustomer === stripeCustomer && reassigned.expiry === expiry
        ? reassigned.id
        : false;
    }
    if (checkout.holdState !== "held") return false;
    const binding = { id: `binding-${stripeSession}`, owner, lifecycle, hold, customer, stripeSession, stripeCustomer, expiry };
    this.checkoutSessions.set(stripeSession, binding);
    checkout.session = binding.id;
    checkout.nextReconcileAt = expiry;
    return binding.id;
  }

  markCheckoutExpireRequired(owner, lifecycle, hold, customer, stripeSession, stripeCustomer, stripeExpiry, idempotencyKey, targetExpiry, statementTime) {
    const checkout = this.checkoutBegins.get(idempotencyKey);
    if (!checkout || checkout.owner !== owner || checkout.lifecycle !== lifecycle || checkout.hold !== hold
      || checkout.customer !== customer || checkout.stripeCustomer !== stripeCustomer || checkout.expiry !== targetExpiry
      || !stripeSession || !stripeCustomer || stripeExpiry === null || stripeExpiry === undefined
      || checkout.terminal || this.capacityByLifecycle.get(lifecycle) !== "held") return false;
    const existing = [...this.checkoutSessions.values()].find((row) => row.lifecycle === lifecycle || row.hold === hold);
    if (existing) {
      if (existing.owner !== owner || existing.lifecycle !== lifecycle || existing.hold !== hold
        || existing.customer !== customer || existing.stripeSession !== stripeSession
        || existing.stripeCustomer !== stripeCustomer || existing.expiry !== stripeExpiry) return false;
    } else {
      if ([...this.checkoutSessions.values()].some((row) => row.stripeSession === stripeSession)) return false;
      const binding = { id: `binding-${stripeSession}`, owner, lifecycle, hold, customer, stripeSession, stripeCustomer, expiry: stripeExpiry };
      this.checkoutSessions.set(stripeSession, binding);
      checkout.session = binding.id;
    }
    if (checkout.lifecycleState === "expire_required" && checkout.holdState === "expire_required") return true;
    if (checkout.lifecycleState !== "checkout_hold" || checkout.holdState !== "held") return false;
    checkout.lifecycleState = "expire_required";
    checkout.holdState = "expire_required";
    checkout.nextReconcileAt = statementTime;
    return true;
  }

  expireCheckoutHold(owner, lifecycle, hold, stripeSessionStatus, stripeSessionCheckedAt, reconcileLeaseToken, statementTime) {
    const checkout = [...this.checkoutBegins.values()].find((row) => row.lifecycle === lifecycle);
    if (!checkout || checkout.owner !== owner || checkout.hold !== hold) return false;
    if (reconcileLeaseToken !== null) {
      if (checkout.reconcileLeaseToken !== reconcileLeaseToken || checkout.reconcileLeaseUntil <= statementTime) return false;
    } else if (checkout.reconcileLeaseToken && checkout.reconcileLeaseUntil > statementTime) {
      return false;
    }
    const session = [...this.checkoutSessions.values()].find((row) => row.lifecycle === lifecycle);
    if (!session || session.owner !== owner || session.hold !== hold || session.customer !== checkout.customer
    ) return false;
    if (stripeSessionStatus !== "expired" || stripeSessionCheckedAt === null
      || stripeSessionCheckedAt < session.expiry || stripeSessionCheckedAt < checkout.expiry
      || stripeSessionCheckedAt > statementTime) return false;
    if ([...this.bindingSubscriptions.values()].some((row) => row.lifecycle === lifecycle)) return false;
    const entitlement = this.ownerEntitlements.get(lifecycle);
    if (entitlement && !["canceled", "incomplete_expired", "inactive"].includes(entitlement.status)) return false;
    if (entitlement && (entitlement.owner !== owner || entitlement.customer !== checkout.customer
      || entitlement.status !== "incomplete_expired" || entitlement.disputeState !== "none")) return false;
    if (checkout.terminal && checkout.released && this.capacityByLifecycle.get(lifecycle) === "released") return true;
    if (checkout.terminal) return false;
    checkout.terminal = true;
    checkout.released = true;
    checkout.lifecycleState = "incomplete_expired";
    checkout.reconcileLeaseToken = null;
    checkout.reconcileLeaseUntil = null;
    this.capacityByLifecycle.set(lifecycle, "released");
    return true;
  }

  recordProviderHourlyDetail(owner, provider, hour, delta) {
    const key = `${owner}/${provider}/${hour}`;
    const current = this.hourlyDetails.get(key) ?? { requests: 0, comments: 0, cost: 0 };
    const next = {
      requests: current.requests + delta.requests,
      comments: current.comments + delta.comments,
      cost: current.cost + delta.cost
    };
    this.hourlyDetails.set(key, next);
    return next;
  }

  upsertSessionSummary(owner, session, startedAt, cumulative) {
    const current = this.sessionSummaries.get(session);
    if (current && (current.owner !== owner || current.startedAt !== startedAt)) return false;
    const next = {
      owner,
      startedAt,
      requests: Math.max(current?.requests ?? 0, cumulative.requests),
      translated: Math.max(current?.translated ?? 0, cumulative.translated)
    };
    this.sessionSummaries.set(session, next);
    return next;
  }
}

const fixture = new PaidCoreFixture();
assert.equal(typeof fixture.beginCheckout, "function", "fixture models atomic Checkout initialization");
assert.equal(typeof fixture.bindCheckoutSession, "function", "fixture models immutable Checkout Session binding");
assert.equal(typeof fixture.markCheckoutExpireRequired, "function", "fixture models confirmed DB binding failure transition");
assert.equal(typeof fixture.expireCheckoutHold, "function", "fixture models terminal Checkout hold release");
assert.equal(typeof fixture.recordProviderHourlyDetail, "function", "fixture models atomic hourly aggregate increments");
assert.equal(typeof fixture.upsertSessionSummary, "function", "fixture models duplicate-safe session summaries");
const checkoutFixture = new PaidCoreFixture();
const checkout = checkoutFixture.beginCheckout("owner-checkout", "cus-checkout", 100);
assert.equal(checkout.idempotencyKey, `ct-paid-checkout-${checkout.hold}`, "Checkout begin derives the canonical idempotency key from the hold ID");
assert.equal(checkout.expiry, 131, "Checkout begin derives the immutable target from statement time plus 31 minutes");
assert.equal(checkout.nextReconcileAt, 131, "Checkout begin durably schedules expiry reconciliation");
assert.equal(checkoutFixture.beginCheckout("owner-checkout", "cus-checkout", 101), checkout, "same-owner concurrent begin returns the exact existing binding without caller key authority");
assert.equal(checkoutFixture.capacityByLifecycle.size, 1, "Checkout idempotency retry cannot double-count capacity");
assert.equal(checkoutFixture.beginCheckout("owner-other", "cus-checkout", 100), false, "Checkout begin rejects a Stripe Customer bound to another owner");
assert.equal(checkoutFixture.beginCheckout("owner-checkout", "cus-other", 100), false, "Checkout begin rejects a different Customer for the existing nonterminal owner lifecycle");
for (const lifecycleState of ["active", "past_due", "unpaid", "dispute"]) {
  const lifecycleFixture = new PaidCoreFixture();
  const lifecycleCheckout = lifecycleFixture.beginCheckout(`owner-${lifecycleState}`, `cus-${lifecycleState}`, 100);
  lifecycleCheckout.lifecycleState = lifecycleState;
  assert.equal(lifecycleFixture.beginCheckout(`owner-${lifecycleState}`, `cus-${lifecycleState}`, 101), false, `Checkout begin rejects existing ${lifecycleState} lifecycle authority`);
}
const convertedCheckoutFixture = new PaidCoreFixture();
const convertedCheckout = convertedCheckoutFixture.beginCheckout("owner-converted", "cus-converted", 100);
convertedCheckout.holdState = "converted";
assert.equal(convertedCheckoutFixture.beginCheckout("owner-converted", "cus-converted", 101), false, "Checkout begin rejects a converted hold instead of returning Checkout authority");
assert.equal(checkoutFixture.bindCheckoutSession("owner-checkout", checkout.lifecycle, checkout.hold, checkout.customer, "cs-late-normal", "cus-checkout", 131, 131, false, checkout.idempotencyKey), false, "normal Checkout Session binding rejects at or after the immutable expiry boundary");
assert.equal(checkoutFixture.bindCheckoutSession("owner-checkout", checkout.lifecycle, checkout.hold, checkout.customer, "cs-late-recovery", "cus-checkout", null, 132, true, checkout.idempotencyKey), false, "late recovery without the immutable expiry boundary fails closed");
const checkoutSessionId = checkoutFixture.bindCheckoutSession("owner-checkout", checkout.lifecycle, checkout.hold, checkout.customer, "cs-checkout", "cus-checkout", 131, 132, true, checkout.idempotencyKey);
assert.equal(checkout.nextReconcileAt, 131, "Checkout Session binding preserves its exact expiry schedule");
assert.equal(checkoutFixture.checkoutSessions.size, 1, "late recovery inserts exactly one immutable Checkout Session binding");
assert.equal(checkoutFixture.bindCheckoutSession("owner-checkout", checkout.lifecycle, checkout.hold, checkout.customer, "cs-checkout", "cus-checkout", 131, 132, true, checkout.idempotencyKey), checkoutSessionId, "same late recovery returns the exact binding ID once");
checkout.holdState = "converted";
assert.equal(checkoutFixture.bindCheckoutSession("owner-checkout", checkout.lifecycle, checkout.hold, checkout.customer, "cs-checkout", "cus-checkout", 131, 132, true, checkout.idempotencyKey), checkoutSessionId, "exact Checkout Session replay remains idempotent after the hold converts");
assert.equal(checkoutFixture.bindCheckoutSession("owner-checkout", checkout.lifecycle, checkout.hold, checkout.customer, "cs-checkout", "cus-checkout", 131, 132, true, "idem-conflict"), false, "late recovery rejects conflicting idempotency");
assert.equal(checkoutFixture.bindCheckoutSession("owner-checkout", checkout.lifecycle, checkout.hold, checkout.customer, "cs-checkout", "cus-checkout", 132, 132, true, checkout.idempotencyKey), false, "late recovery rejects conflicting expiry");
assert.equal(checkoutFixture.bindCheckoutSession("owner-other", checkout.lifecycle, checkout.hold, checkout.customer, "cs-checkout", "cus-checkout", 131, 132, true, checkout.idempotencyKey), false, "late recovery rejects a wrong owner");
assert.equal(checkoutFixture.bindCheckoutSession("owner-checkout", checkout.lifecycle, checkout.hold, checkout.customer, "cs-checkout-2", "cus-checkout", 131, 132, true, checkout.idempotencyKey), false, "late recovery rejects session reassignment");
checkout.lifecycleState = "expire_required";
assert.equal(checkoutFixture.bindCheckoutSession("owner-checkout", checkout.lifecycle, checkout.hold, checkout.customer, "cs-checkout", "cus-checkout", 131, 132, true, checkout.idempotencyKey), false, "expire-required lifecycle rejects recovery binding");
assert.equal(checkoutFixture.bindCheckoutSession("owner-checkout", checkout.lifecycle, checkout.hold, checkout.customer, "cs-checkout", "cus-checkout", 131, 132, false, checkout.idempotencyKey), false, "expire-required lifecycle rejects normal binding");
checkout.lifecycleState = "checkout_hold";
checkoutFixture.bindingSubscriptions.set("sub-checkout", { lifecycle: checkout.lifecycle });
assert.equal(checkoutFixture.expireCheckoutHold("owner-checkout", checkout.lifecycle, checkout.hold, "expired", 132, null, 132), false, "Checkout release rejects a committed Subscription binding");
checkoutFixture.bindingSubscriptions.delete("sub-checkout");
assert.equal(checkoutFixture.expireCheckoutHold("owner-other", checkout.lifecycle, checkout.hold, "expired", 132, null, 132), false, "Checkout release rejects a stale owner binding");
assert.equal(checkoutFixture.expireCheckoutHold("owner-checkout", checkout.lifecycle, "hold-stale", "expired", 132, null, 132), false, "Checkout release rejects a stale hold binding");
checkoutFixture.ownerEntitlements.set(checkout.lifecycle, { owner: "owner-checkout", customer: checkout.customer, status: "incomplete" });
assert.equal(checkoutFixture.expireCheckoutHold("owner-checkout", checkout.lifecycle, checkout.hold, "expired", 132, null, 132), false, "Checkout release rejects an unresolved nonterminal entitlement");
assert.equal(checkoutFixture.capacityByLifecycle.get(checkout.lifecycle), "held", "Checkout release keeps capacity while a nonterminal entitlement remains");
checkoutFixture.ownerEntitlements.delete(checkout.lifecycle);
assert.equal(checkoutFixture.expireCheckoutHold("owner-checkout", checkout.lifecycle, checkout.hold, "complete", 131, null, 132), false, "completed Checkout Session cannot be released by delayed webhook handling");
assert.equal(checkoutFixture.expireCheckoutHold("owner-checkout", checkout.lifecycle, checkout.hold, "open", 132, null, 132), false, "open Checkout Session cannot be released after the target time");
assert.equal(checkoutFixture.expireCheckoutHold("owner-checkout", checkout.lifecycle, checkout.hold, "expired", null, null, 132), false, "missing Checkout Session confirmation fails closed");
assert.equal(checkoutFixture.expireCheckoutHold("owner-checkout", checkout.lifecycle, checkout.hold, "expired", 130, null, 132), false, "expiry confirmation before the immutable target fails closed");
checkout.reconcileLeaseToken = "lease-live";
checkout.reconcileLeaseUntil = 200;
assert.equal(checkoutFixture.expireCheckoutHold("owner-checkout", checkout.lifecycle, checkout.hold, "expired", 132, null, 150), false, "lease-free expiry cannot mutate during an active reconciler lease");
assert.equal(checkoutFixture.expireCheckoutHold("owner-checkout", checkout.lifecycle, checkout.hold, "expired", 132, "lease-stale", 150), false, "stale expiry token is rejected during an active reconciler lease");
assert.equal(checkoutFixture.expireCheckoutHold("owner-checkout", checkout.lifecycle, checkout.hold, "expired", 132, "lease-live", 150), true, "matching active reconciler token can expire the Checkout hold");
assert.equal(checkout.lifecycleState, "incomplete_expired", "Checkout release records the terminal incomplete_expired lifecycle state");
assert.equal(checkoutFixture.capacityByLifecycle.get(checkout.lifecycle), "released", "Checkout release frees exactly one capacity reservation");
assert.equal(checkoutFixture.expireCheckoutHold("owner-checkout", checkout.lifecycle, checkout.hold, "expired", 151, null, 151), true, "terminal Checkout release is idempotent after lease authority is cleared");

const failedBindingFixture = new PaidCoreFixture();
const failedBinding = failedBindingFixture.beginCheckout("owner-failed", "cus-failed", 100);
assert.equal(failedBindingFixture.markCheckoutExpireRequired("owner-failed", failedBinding.lifecycle, failedBinding.hold, failedBinding.customer, "cs-failed", "cus-failed", 140, failedBinding.idempotencyKey, 131, 110), true, "confirmed DB binding failure atomically binds the actual Session and marks lifecycle and hold expire-required");
assert.equal(failedBinding.nextReconcileAt, 110, "confirmed DB binding failure schedules reconciliation immediately");
assert.equal(failedBindingFixture.checkoutSessions.get("cs-failed")?.expiry, 140, "expire-required marker persists the actual Stripe Session expiry even when it differs from the hold target");
assert.equal(failedBindingFixture.markCheckoutExpireRequired("owner-failed", failedBinding.lifecycle, failedBinding.hold, failedBinding.customer, "cs-failed", "cus-failed", 140, failedBinding.idempotencyKey, 131, 111), true, "exact expire-required Session replay is idempotent");
assert.equal(failedBindingFixture.markCheckoutExpireRequired("owner-failed", failedBinding.lifecycle, failedBinding.hold, failedBinding.customer, "cs-conflict", "cus-failed", 140, failedBinding.idempotencyKey, 131, 111), false, "expire-required marker rejects conflicting Session identity");
assert.equal(failedBindingFixture.markCheckoutExpireRequired("owner-failed", failedBinding.lifecycle, failedBinding.hold, failedBinding.customer, "cs-failed", "cus-conflict", 140, failedBinding.idempotencyKey, 131, 111), false, "expire-required marker rejects conflicting Customer identity");
assert.equal(failedBindingFixture.markCheckoutExpireRequired("owner-failed", failedBinding.lifecycle, failedBinding.hold, failedBinding.customer, "cs-failed", "cus-failed", 141, failedBinding.idempotencyKey, 131, 111), false, "expire-required marker rejects conflicting Session expiry");
assert.equal(failedBindingFixture.beginCheckout("owner-failed", "cus-failed", 112), false, "expire-required Checkout begin replay cannot return usable binding IDs");
assert.equal(failedBindingFixture.bindCheckoutSession("owner-failed", failedBinding.lifecycle, failedBinding.hold, failedBinding.customer, "cs-failed", "cus-failed", 131, 150, false, failedBinding.idempotencyKey), false, "expire-required Checkout cannot return to normal binding");
assert.equal(failedBindingFixture.bindCheckoutSession("owner-failed", failedBinding.lifecycle, failedBinding.hold, failedBinding.customer, "cs-failed", "cus-failed", 131, 150, true, failedBinding.idempotencyKey), false, "expire-required Checkout cannot return to recovery binding");
assert.equal(failedBindingFixture.expireCheckoutHold("owner-failed", failedBinding.lifecycle, failedBinding.hold, "expired", 139, null, 150), false, "expire-required release rejects confirmation before the later actual Session expiry");
assert.equal(failedBindingFixture.expireCheckoutHold("owner-failed", failedBinding.lifecycle, failedBinding.hold, "expired", 140, null, 150), true, "actual Session expiry mismatch reaches terminal release after confirmed Stripe expiry");
assert.equal(failedBindingFixture.capacityByLifecycle.get(failedBinding.lifecycle), "released", "expire-required mismatch path releases its held capacity exactly once");

const aggregateFixture = new PaidCoreFixture();
aggregateFixture.recordProviderHourlyDetail("owner-aggregate", "openai", "hour-1", { requests: 1, comments: 2, cost: 3 });
assert.deepEqual(aggregateFixture.recordProviderHourlyDetail("owner-aggregate", "openai", "hour-1", { requests: 1, comments: 2, cost: 3 }), { requests: 2, comments: 4, cost: 6 }, "duplicate hourly deltas increment atomically without a lost update");
aggregateFixture.upsertSessionSummary("owner-aggregate", "session-aggregate", "start-1", { requests: 5, translated: 4 });
assert.deepEqual(aggregateFixture.upsertSessionSummary("owner-aggregate", "session-aggregate", "start-1", { requests: 5, translated: 4 }), { owner: "owner-aggregate", startedAt: "start-1", requests: 5, translated: 4 }, "duplicate cumulative session summary is idempotent");
assert.deepEqual(aggregateFixture.upsertSessionSummary("owner-aggregate", "session-aggregate", "start-1", { requests: 7, translated: 3 }), { owner: "owner-aggregate", startedAt: "start-1", requests: 7, translated: 4 }, "concurrent cumulative session summaries merge monotonically");
assert.equal(aggregateFixture.upsertSessionSummary("owner-other", "session-aggregate", "start-1", { requests: 8, translated: 8 }), false, "session summary rejects owner reassignment");
assert.equal(aggregateFixture.upsertSessionSummary("owner-aggregate", "session-aggregate", "start-2", { requests: 8, translated: 8 }), false, "session summary rejects start-time reassignment");
assert.equal(typeof fixture.bindFirstSubscription, "function", "fixture models bind-ready hold and Checkout Session authority");
fixture.billingLifecycles.set("missing-hold", { owner: "owner-1", terminal: false });
assert.equal(fixture.bindFirstSubscription("missing-hold", "owner-1", "customer-1"), false, "leading Subscription/Invoice recovery fails closed without a Checkout hold");
fixture.billingLifecycles.set("missing-session", { owner: "owner-1", terminal: false });
fixture.checkoutHolds.set("missing-session", { owner: "owner-1", hold: "hold-1", state: "held" });
assert.equal(fixture.bindFirstSubscription("missing-session", "owner-1", "customer-1"), false, "leading Subscription/Invoice recovery fails closed without a Checkout Session binding");
fixture.billingLifecycles.set("bind-ready", { owner: "owner-1", customerBinding: "customer-binding-1", terminal: false });
fixture.checkoutHolds.set("bind-ready", { owner: "owner-1", hold: "hold-2", state: "held" });
fixture.checkoutSessions.set("bind-ready", { owner: "owner-1", hold: "hold-2", customerBinding: "customer-binding-1", customer: "customer-1" });
assert.equal(fixture.bindFirstSubscription("bind-ready", "owner-1", "customer-1"), true, "matching locked hold/session authority is bind-ready");
assert.equal(fixture.bindFirstSubscription("bind-ready", "owner-2", "customer-1"), false, "hold/session owner mismatch fails closed");
assert.equal(fixture.bindFirstSubscription("bind-ready", "owner-1", "customer-2"), false, "Checkout Session customer mismatch fails closed");
fixture.checkoutSessions.set("bind-ready", { owner: "owner-1", hold: "hold-2", customerBinding: "customer-binding-2", customer: "customer-1" });
assert.equal(fixture.bindFirstSubscription("bind-ready", "owner-1", "customer-1"), false, "same-owner Checkout Session with another Customer binding fails closed");
fixture.billingLifecycles.set("terminal-lifecycle", { owner: "owner-1", terminal: true });
fixture.checkoutHolds.set("terminal-lifecycle", { owner: "owner-1", hold: "hold-3", state: "held" });
fixture.checkoutSessions.set("terminal-lifecycle", { owner: "owner-1", hold: "hold-3", customer: "customer-1" });
assert.equal(fixture.bindFirstSubscription("terminal-lifecycle", "owner-1", "customer-1"), false, "terminal lifecycle is not bind-ready");
fixture.billingLifecycles.set("released-hold", { owner: "owner-1", terminal: false });
fixture.checkoutHolds.set("released-hold", { owner: "owner-1", hold: "hold-4", state: "released" });
fixture.checkoutSessions.set("released-hold", { owner: "owner-1", hold: "hold-4", customer: "customer-1" });
assert.equal(fixture.bindFirstSubscription("released-hold", "owner-1", "customer-1"), false, "released Checkout hold is not bind-ready");
fixture.billingLifecycles.set("expire-required-hold", { owner: "owner-1", terminal: false });
fixture.checkoutHolds.set("expire-required-hold", { owner: "owner-1", hold: "hold-5", state: "expire_required" });
fixture.checkoutSessions.set("expire-required-hold", { owner: "owner-1", hold: "hold-5", customer: "customer-1" });
assert.equal(fixture.bindFirstSubscription("expire-required-hold", "owner-1", "customer-1"), false, "expire-required Checkout hold cannot return to binding");
fixture.billingLifecycles.set("expire-required-lifecycle", { owner: "owner-1", customerBinding: "customer-binding-1", terminal: false, lifecycleState: "expire_required" });
fixture.checkoutHolds.set("expire-required-lifecycle", { owner: "owner-1", hold: "hold-6", state: "converted" });
fixture.checkoutSessions.set("expire-required-lifecycle", { owner: "owner-1", hold: "hold-6", customerBinding: "customer-binding-1", customer: "customer-1" });
assert.equal(fixture.bindFirstSubscription("expire-required-lifecycle", "owner-1", "customer-1"), false, "expire-required lifecycle cannot bind a first Subscription even with converted hold/session identity");
const capacityResults = Array.from({ length: 21 }, (_, index) => fixture.reserveCapacity(`lifecycle-${index}`));
assert.equal(capacityResults.filter(Boolean).length, 20, "the twenty-first capacity request is rejected");
assert.equal(fixture.reserveCapacity("lifecycle-0"), true, "same lifecycle stage is idempotent and not double-counted");
assert.equal(fixture.reserveCapacity("lifecycle-0", "active", "active"), false, "an existing non-released reservation rejects a mismatched reserve stage");
const capacityTransitionFixture = new PaidCoreFixture();
assert.equal(capacityTransitionFixture.reserveCapacity("capacity-transition", "checkout_hold", "checkout_hold"), true);
assert.equal(capacityTransitionFixture.convertCapacity("capacity-transition", "active", "checkout_hold"), false, "standalone conversion cannot move checkout-hold capacity ahead of its locked lifecycle");
assert.equal(capacityTransitionFixture.bindFirstSubscriptionCapacity("bound-capacity-transition", "checkout_hold", "active"), true, "first-subscription binding updates lifecycle before converting capacity in one transaction model");
assert.equal(capacityTransitionFixture.billingLifecycles.get("bound-capacity-transition").lifecycleState, "active", "committed binding lifecycle matches the target state");
assert.equal(capacityTransitionFixture.capacityStages.get("bound-capacity-transition"), "active", "committed binding capacity stage matches the lifecycle");
assert.equal(capacityTransitionFixture.convertCapacity("capacity-transition", "dispute", "active"), false, "an arbitrary caller stage cannot contradict locked active lifecycle authority");
assert.equal(capacityTransitionFixture.bindFirstSubscriptionCapacity("terminal-capacity-transition", "checkout_hold", "canceled"), false, "terminal lifecycle targets are not capacity conversion targets");
assert.equal(fixture.reserveLifecycle("owner-1", "lifecycle-1"), true);
assert.equal(fixture.reserveLifecycle("owner-1", "lifecycle-2"), false, "an owner cannot hold two non-terminal lifecycles");
assert.equal(fixture.bindImmutable("checkout-1", "owner-1/lifecycle-1"), true);
assert.equal(fixture.bindImmutable("checkout-1", "owner-1/lifecycle-1"), true, "same binding is idempotent");
assert.equal(fixture.bindImmutable("checkout-1", "owner-2/lifecycle-2"), false, "binding reassignment is rejected");
assert.equal(fixture.deleteImmutable("checkout-1", 1), false, "direct immutable child DELETE is rejected");
assert.equal(fixture.deleteImmutable("checkout-1", 2), true, "an auth.users cascade may delete immutable children through the explicit nested-trigger path");
assert.equal(fixture.insertCustomerBinding("customer-owner-1", "owner-1", "stripe-customer-owner-1"), true);
assert.equal(fixture.insertCustomerBinding("customer-owner-1-alt", "owner-1", "stripe-customer-owner-1-alt"), false, "the Customer boundary rejects a second row for the same owner");
assert.equal(fixture.insertCustomerBinding("customer-owner-2", "owner-2", "stripe-customer-owner-2"), true);
assert.equal(fixture.insertLifecycleBinding("lifecycle-owner-1", "customer-owner-1", "owner-1"), true);
assert.equal(fixture.insertLifecycleBinding("cross-owner-lifecycle", "customer-owner-1", "owner-2"), false, "a lifecycle cannot bind another owner's Customer row on initial insert");
assert.equal(fixture.insertLifecycleBinding("lifecycle-owner-2", "customer-owner-2", "owner-2"), true);
assert.equal(fixture.insertHoldBinding("hold-owner-1", "lifecycle-owner-1", "owner-1"), true);
assert.equal(fixture.insertHoldBinding("cross-owner-hold", "lifecycle-owner-1", "owner-2"), false, "a Checkout hold cannot cross the lifecycle owner on initial insert");
assert.equal(fixture.insertSessionBinding("cross-lifecycle-session", "hold-owner-1", "lifecycle-owner-2", "customer-owner-2", "owner-2", "stripe-customer-owner-2"), false, "a Checkout Session cannot combine a hold with another lifecycle");
assert.equal(fixture.insertSessionBinding("wrong-customer-session", "hold-owner-1", "lifecycle-owner-1", "customer-owner-1-alt", "owner-1", "stripe-customer-owner-1-alt"), false, "a same-owner Checkout Session cannot bind a different Customer than its lifecycle");
assert.equal(fixture.insertSessionBinding("wrong-stripe-session", "hold-owner-1", "lifecycle-owner-1", "customer-owner-1", "owner-1", "stripe-customer-owner-1-alt"), false, "a Checkout Session Customer binding rejects a mismatched Stripe Customer ID");
assert.equal(fixture.insertSessionBinding("session-owner-1", "hold-owner-1", "lifecycle-owner-1", "customer-owner-1", "owner-1", "stripe-customer-owner-1"), true);
assert.equal(fixture.deleteCheckoutHold("hold-owner-1", 1), false, "direct Checkout hold deletion cannot cascade-delete its immutable Session binding");
assert.equal(fixture.bindingSessions.has("session-owner-1"), true, "the immutable Session binding survives rejected direct hold deletion");
assert.equal(fixture.insertHoldBinding("replacement-hold", "lifecycle-owner-1", "owner-1"), false, "a rejected hold deletion cannot be followed by replacement binding insertion");
assert.equal(fixture.updateHoldBinding("hold-owner-1", { lifecycle: "lifecycle-owner-2" }), false, "a Checkout hold cannot be reassigned to another lifecycle");
assert.equal(fixture.updateHoldBinding("hold-owner-1", { idempotencyKey: "replacement-key" }), false, "a Checkout hold identity field cannot be changed");
assert.equal(fixture.updateHoldBinding("hold-owner-1", { state: "converted", updatedAt: "later" }), true, "a trusted RPC may convert Checkout hold state");
assert.equal(fixture.updateLifecycleBinding("lifecycle-owner-1", { id: "replacement-lifecycle" }), false, "a billing lifecycle ID cannot be reassigned");
assert.equal(fixture.updateLifecycleBinding("lifecycle-owner-1", { state: "active", reconcileLeaseToken: "lease-1" }), true, "billing lifecycle state and reconciler controls remain mutable");
assert.equal(fixture.insertSubscriptionBinding("cross-owner-subscription", "lifecycle-owner-1", "customer-owner-1", "owner-2", "stripe-customer-owner-1"), false, "a Subscription cannot cross the lifecycle owner on initial insert");
assert.equal(fixture.insertSubscriptionBinding("wrong-customer-subscription", "lifecycle-owner-1", "customer-owner-1-alt", "owner-1", "stripe-customer-owner-1-alt"), false, "a same-owner Subscription cannot bind a different Customer than its lifecycle");
assert.equal(fixture.insertSubscriptionBinding("wrong-stripe-subscription", "lifecycle-owner-1", "customer-owner-1", "owner-1", "stripe-customer-owner-1-alt"), false, "a Subscription Customer binding rejects a mismatched Stripe Customer ID");
assert.equal(fixture.insertSubscriptionBinding("subscription-owner-1", "lifecycle-owner-1", "customer-owner-1", "owner-1", "stripe-customer-owner-1"), true);
assert.equal(fixture.insertSubscriptionBinding("subscription-owner-2", "lifecycle-owner-2", "customer-owner-2", "owner-2", "stripe-customer-owner-2"), true);
assert.equal(fixture.insertEntitlementBinding("lifecycle-owner-1", "customer-owner-2", "subscription-owner-1", "owner-1"), false, "an entitlement cannot cross its lifecycle Customer binding");
assert.equal(fixture.insertEntitlementBinding("lifecycle-owner-1", "customer-owner-1", "subscription-owner-2", "owner-1"), false, "an entitlement cannot cross its Subscription lifecycle");
assert.equal(fixture.insertEntitlementBinding("lifecycle-owner-1", "customer-owner-1", "subscription-owner-1", "owner-1"), true);
const subsequentLifecycleCustomerReuse = new PaidCoreFixture();
assert.equal(subsequentLifecycleCustomerReuse.insertCustomerBinding("customer-reuse", "owner-reuse", "stripe-customer-reuse"), true);
assert.equal(subsequentLifecycleCustomerReuse.insertCustomerBinding("customer-reuse", "owner-reuse", "stripe-customer-reuse"), true, "the exact same owner and Stripe Customer binding is reusable");
assert.equal(subsequentLifecycleCustomerReuse.insertCustomerBinding("customer-reuse-conflict", "owner-reuse", "stripe-customer-conflict"), false, "the same owner cannot switch to a different Stripe Customer");
assert.equal(subsequentLifecycleCustomerReuse.insertLifecycleBinding("lifecycle-reuse-first", "customer-reuse", "owner-reuse"), true);
assert.equal(subsequentLifecycleCustomerReuse.insertLifecycleBinding("lifecycle-reuse-overlap", "customer-reuse", "owner-reuse"), false, "a second lifecycle cannot begin before the first is terminal");
assert.equal(subsequentLifecycleCustomerReuse.terminalizeLifecycleBinding("lifecycle-reuse-first"), true);
assert.equal(subsequentLifecycleCustomerReuse.insertLifecycleBinding("lifecycle-reuse-next", "customer-reuse", "owner-reuse"), true, "a terminal first lifecycle permits a new lifecycle that reuses the same Customer row");
assert.equal(fixture.deleteAccountCascade("customer-owner-1", "session-owner-1", "subscription-owner-1"), true, "auth cascade preserves external billing identities as tombstones");
assert.equal(fixture.insertCustomerBinding("customer-reused", "owner-3", "stripe-customer-owner-1"), false, "a deleted Customer ID cannot be rebound to another owner");
assert.equal(fixture.insertCustomerBinding("customer-former-owner-reused", "owner-1", "stripe-customer-owner-1"), false, "a deleted Customer ID cannot be reinserted for its former owner");
fixture.insertCustomerBinding("customer-owner-1-new", "owner-1", "stripe-customer-owner-1-new");
fixture.insertLifecycleBinding("lifecycle-owner-1-new", "customer-owner-1-new", "owner-1");
fixture.insertHoldBinding("hold-owner-1-new", "lifecycle-owner-1-new", "owner-1");
assert.equal(fixture.insertSessionBinding("session-owner-1", "hold-owner-1-new", "lifecycle-owner-1-new", "customer-owner-1-new", "owner-1", "stripe-customer-owner-1-new"), false, "a deleted Checkout Session ID cannot be reinserted for its former owner");
assert.equal(fixture.insertSubscriptionBinding("subscription-owner-1", "lifecycle-owner-1-new", "customer-owner-1-new", "owner-1", "stripe-customer-owner-1-new"), false, "a deleted Subscription ID cannot be reinserted for its former owner");
fixture.insertCustomerBinding("customer-owner-3", "owner-3", "stripe-customer-owner-3");
fixture.insertLifecycleBinding("lifecycle-owner-3", "customer-owner-3", "owner-3");
fixture.insertHoldBinding("hold-owner-3", "lifecycle-owner-3", "owner-3");
assert.equal(fixture.insertSessionBinding("session-owner-1", "hold-owner-3", "lifecycle-owner-3", "customer-owner-3", "owner-3", "stripe-customer-owner-3"), false, "a deleted Checkout Session ID cannot be rebound to another owner");
assert.equal(fixture.insertSubscriptionBinding("subscription-owner-1", "lifecycle-owner-3", "customer-owner-3", "owner-3", "stripe-customer-owner-3"), false, "a deleted Subscription ID cannot be rebound to another owner");
assert.equal(fixture.attachNullableBinding("entitlement-1", null), true, "a nullable entitlement binding can start unbound");
assert.equal(fixture.attachNullableBinding("entitlement-1", "subscription-1"), true, "the first subscription binding can attach once");
assert.equal(fixture.attachNullableBinding("entitlement-1", "subscription-2"), false, "an attached subscription binding cannot be reassigned");

const slotResults = Array.from({ length: 9 }, (_, index) => fixture.reserveOpenAiSlot(`session-${index}`));
assert.equal(slotResults.filter(Boolean).length, 8, "the ninth OpenAI slot is rejected");
assert.equal(fixture.reserveOpenAiSlot("session-0", "attempt-retry"), false, "a session cannot acquire a second in-flight lease");
assert.equal(fixture.finalizeProviderAttempt("reserved", "session-token", null, "slot-token", "slot-token"), false, "active OpenAI finalize rejects a null session lease token even with the slot token");
assert.equal(fixture.finalizeProviderAttempt("reserved", "session-token", "stale-token", "slot-token", "slot-token"), false, "active OpenAI finalize rejects a stale session lease token");
assert.equal(fixture.finalizeProviderAttempt("reserved", "session-token", "session-token", "slot-token", null), false, "active OpenAI finalize does not weaken the slot-token check");
assert.equal(fixture.finalizeProviderAttempt("reserved", "azure-session-token", null), false, "active Azure finalize rejects a null session lease token");
assert.equal(fixture.finalizeProviderAttempt("reserved", "azure-session-token", "stale-token"), false, "active Azure finalize rejects a stale session lease token");
assert.equal(fixture.reserveAzureFallback("session-0", "session-0"), true, "Azure fallback reuses the same logical session lease");
const azureUnknownFixture = new PaidCoreFixture();
assert.equal(azureUnknownFixture.reserveLogicalAttempt("azure-unknown", "azure", 120), 120);
assert.equal(azureUnknownFixture.finalizeAzureOutcome("azure-unknown", "uncertain_inflight"), true, "Azure crash or timeout retains an uncertain receipt instead of claiming success");
assert.equal(azureUnknownFixture.logicalAttempts.get("azure-unknown").azureReceiptExpiresInSeconds, 120, "Azure uncertain receipt has the approved short TTL");
assert.equal(azureUnknownFixture.reclaimAzureUnknown("azure-unknown"), true, "Azure uncertain TTL reclaim settles physical reservation conservatively");
assert.equal(azureUnknownFixture.logicalAttempts.get("azure-unknown").committedCharacters, 0, "Azure unknown reclaim leaves billing-period user committed characters at zero");
assert.equal(azureUnknownFixture.logicalAttempts.get("azure-unknown").azurePhysicalCommittedCharacters, 120, "Azure unknown reclaim preserves conservative physical usage");
assert.equal(fixture.openAiSlots, 8, "Azure fallback does not consume an OpenAI slot");
const logicalProviderConcurrency = new PaidCoreFixture();
assert.equal(logicalProviderConcurrency.reserveLogicalProviderAttempt("logical-1", "openai-1", "openai"), true);
assert.equal(logicalProviderConcurrency.reserveLogicalProviderAttempt("logical-1", "openai-1", "openai"), true, "exact live provider-attempt replay remains idempotent");
assert.equal(logicalProviderConcurrency.reserveLogicalProviderAttempt("logical-1", "openai-2", "openai"), false, "same logical attempt cannot allocate a parallel OpenAI provider attempt");
assert.equal(logicalProviderConcurrency.logicalOpenAiAllocations, 1, "replay and rejected parallel attempt allocate OpenAI resources only once");
assert.equal(logicalProviderConcurrency.releaseLogicalProviderAttempt("logical-1", "openai-1", "provider_not_reached", true, "network"), true);
assert.equal(logicalProviderConcurrency.reserveLogicalProviderAttempt("logical-1", "azure-1", "azure", null, null, false, "network"), true, "released OpenAI attempt remains eligible for Azure fallback");
assert.equal(logicalProviderConcurrency.reserveLogicalProviderAttempt("logical-1", "azure-2", "azure", null, null, false, "network"), false, "a second Azure fallback is rejected for the same logical attempt");
assert.equal(logicalProviderConcurrency.logicalOpenAiAllocations, 1, "Azure fallback allocates no OpenAI resources");
const degradedDirectAzure = new PaidCoreFixture();
assert.equal(degradedDirectAzure.reserveLogicalProviderAttempt("logical-degraded", "azure-1", "azure", "degraded", null, false, "server-error"), true, "degraded OpenAI permits direct Azure only with a current allowed failure class");
assert.equal(degradedDirectAzure.reserveLogicalProviderAttempt("logical-degraded", "azure-2", "azure", "degraded", null, false, "server-error"), false, "direct Azure permits only one Azure receipt");
for (const forbiddenClass of [null, "quota", "configuration", "policy", "invalid-request", "unsupported-language", "kill-switch", "other"]) {
  const forbiddenDirectAzure = new PaidCoreFixture();
  assert.equal(forbiddenDirectAzure.reserveLogicalProviderAttempt(`logical-forbidden-${forbiddenClass}`, "azure-1", "azure", "degraded", null, false, forbiddenClass), false, `degraded OpenAI cannot bypass forbidden fallback class ${forbiddenClass}`);
}
const uncertainOpenAiFallback = new PaidCoreFixture();
assert.equal(uncertainOpenAiFallback.reserveLogicalProviderAttempt("logical-uncertain", "openai-1", "openai", "uncertain", null, false, "timeout"), true);
assert.equal(uncertainOpenAiFallback.reserveLogicalProviderAttempt("logical-uncertain", "azure-1", "azure", null, null, false, "timeout"), true, "uncertain OpenAI permits concurrent Azure without releasing OpenAI resources");
assert.equal(uncertainOpenAiFallback.logicalProviderAttempts.get("logical-uncertain").get("openai-1").state, "uncertain", "concurrent Azure preserves the uncertain OpenAI receipt");
const uncertainOpenAiCompletion = new PaidCoreFixture();
assert.equal(uncertainOpenAiCompletion.reserveLogicalProviderAttempt("logical-uncertain-completed", "openai-1", "openai", null, null, false, null, 40, 12), true);
assert.equal(uncertainOpenAiCompletion.finalizeOpenAiProviderAttempt("logical-uncertain-completed", "openai-1", "uncertain_inflight", "timeout"), true, "OpenAI timeout retains an uncertain receipt with a sanitized failure class");
assert.equal(uncertainOpenAiCompletion.finalizeOpenAiProviderAttempt("logical-uncertain-completed", "openai-1", "completed", null, 30, 9), true, "an authoritative completion before TTL settles the same uncertain OpenAI attempt");
assert.equal(uncertainOpenAiCompletion.logicalProviderAttempts.get("logical-uncertain-completed").get("openai-1").providerFailureClass, null, "OpenAI success receipt clears the earlier uncertain failure class");
assert.equal(uncertainOpenAiCompletion.finalizeOpenAiProviderAttempt("logical-uncertain-completed", "openai-1", "completed", null, 30, 9), true, "same-value completed OpenAI replay is idempotent");
assert.equal(uncertainOpenAiCompletion.finalizeOpenAiProviderAttempt("logical-uncertain-completed", "openai-1", "completed", null, 31, 9), false, "OpenAI replay rejects conflicting actual characters");
assert.equal(uncertainOpenAiCompletion.finalizeOpenAiProviderAttempt("logical-uncertain-completed", "openai-1", "completed", null, 30, 10), false, "OpenAI replay rejects conflicting actual cost");
assert.equal(uncertainOpenAiCompletion.reserveLogicalProviderAttempt("logical-uncertain-completed", "openai-2", "openai"), false, "a successful old attempt cannot authorize another OpenAI attempt");
assert.equal(uncertainOpenAiCompletion.finalizeOpenAiProviderAttempt("logical-uncertain-completed", "openai-1", "provider_reached_failed", "server-error"), false, "a newer attempt identity cannot rewrite an old successful receipt outcome");
assert.equal(uncertainOpenAiCompletion.hasCommittedProviderSuccess("logical-uncertain-completed", "openai-1"), true, "the normalized receipt is recognized as a committed provider success");
uncertainOpenAiCompletion.providerCircuits.set("openai", { state: "half_open", probeAttemptId: "logical-uncertain-completed", probeLeaseUntil: 200 });
assert.equal(uncertainOpenAiCompletion.recordProviderCircuitSuccess("openai", "logical-uncertain-completed", 150), true, "the normalized committed success receipt can close the matching half-open probe");
const unsafeOpenAiFallback = new PaidCoreFixture();
assert.equal(unsafeOpenAiFallback.reserveLogicalProviderAttempt("logical-expired", "openai-1", "openai", "expired"), true);
assert.equal(unsafeOpenAiFallback.reserveLogicalProviderAttempt("logical-expired", "azure-1", "azure", null, null, false, "network"), false, "expired OpenAI is not safe for Azure fallback");
assert.equal(unsafeOpenAiFallback.finalizeOpenAiProviderAttempt("logical-expired", "openai-1", "completed"), false, "reclaimed OpenAI receipt rejects stale delayed completion");
const boundedOpenAiRetry = new PaidCoreFixture();
assert.equal(boundedOpenAiRetry.reserveLogicalProviderAttempt("logical-retry", "openai-1", "openai"), true);
assert.equal(boundedOpenAiRetry.releaseLogicalProviderAttempt("logical-retry", "openai-1", "provider_not_reached", true, "network"), true);
assert.equal(boundedOpenAiRetry.reserveLogicalProviderAttempt("logical-retry", "openai-2", "openai"), false, "released provider_not_reached network failure cannot retry OpenAI");
assert.equal(boundedOpenAiRetry.reserveLogicalProviderAttempt("logical-retry", "azure-1", "azure"), true, "released provider_not_reached network failure remains Azure-fallback-only");
assert.equal(boundedOpenAiRetry.logicalOpenAiAllocations, 1, "network fallback does not allocate a second OpenAI resource set");
const invalidResponseRetry = new PaidCoreFixture();
assert.equal(invalidResponseRetry.reserveLogicalAttempt("logical-invalid-response", "openai", 100), 100);
assert.equal(invalidResponseRetry.reserveProviderSessionLease("invalid-response-session", "logical-invalid-response", "openai-1", 0), true);
assert.equal(invalidResponseRetry.reserveLogicalProviderAttempt("logical-invalid-response", "openai-1", "openai"), true);
assert.equal(invalidResponseRetry.releaseLogicalProviderAttempt("logical-invalid-response", "openai-1", "provider_reached_failed", false, "invalid-response"), true);
assert.equal(invalidResponseRetry.finalizeOpenAiSessionLease("invalid-response-session", "logical-invalid-response", "openai-1", "provider_reached_failed", "invalid-response", 10, 1), true);
assert.equal(invalidResponseRetry.sessionLeases.get("invalid-response-session").state, "active", "first invalid response keeps the logical batch lease active for retry");
assert.equal(invalidResponseRetry.reserveProviderSessionLease("invalid-response-session", "logical-invalid-response", "openai-2", 20), true, "the same logical batch transfers its lease to the one allowed retry");
assert.equal(invalidResponseRetry.reserveLogicalProviderAttempt("logical-invalid-response", "openai-2", "openai"), true, "invalid response permits one fresh OpenAI subset retry");
assert.equal(invalidResponseRetry.reserveOpenAiRetryCharacters("logical-invalid-response", 60), 0, "invalid-response subset retry reuses the original logical character reservation");
assert.equal(invalidResponseRetry.logicalAttempts.get("logical-invalid-response").reservedCharacters, 100, "invalid-response subset retry keeps the unresolved logical reservation bound once");
assert.equal(invalidResponseRetry.releaseLogicalProviderAttempt("logical-invalid-response", "openai-2", "provider_reached_failed", false, "invalid-response"), true);
assert.equal(invalidResponseRetry.finalizeOpenAiSessionLease("invalid-response-session", "logical-invalid-response", "openai-2", "provider_reached_failed", "invalid-response", 30, 2), true);
assert.equal(invalidResponseRetry.sessionLeases.get("invalid-response-session").state, "released", "second invalid response releases the lease when no active sibling remains");
assert.equal(invalidResponseRetry.reserveLogicalProviderAttempt("logical-invalid-response", "openai-3", "openai"), false, "invalid-response retry remains capped at one new OpenAI attempt");
assert.equal(invalidResponseRetry.failProviderAttempt("logical-invalid-response", "openai"), false, "second invalid response remains terminal without character success");
assert.equal(invalidResponseRetry.abandonLogicalAttempt("logical-invalid-response", "openai", "invalid-response-session"), 100, "abandonment releases characters and the same attempt's lease");
assert.equal(invalidResponseRetry.reserveProviderSessionLease("invalid-response-session", "different-logical-batch", "openai-other", 31), true, "a different batch immediately acquires the released session lease");
const retryThenAzureFallback = new PaidCoreFixture();
assert.equal(retryThenAzureFallback.reserveLogicalProviderAttempt("logical-retry-fallback", "openai-1", "openai"), true);
assert.equal(retryThenAzureFallback.releaseLogicalProviderAttempt("logical-retry-fallback", "openai-1", "provider_reached_failed", false, "invalid-response"), true);
assert.equal(retryThenAzureFallback.reserveLogicalProviderAttempt("logical-retry-fallback", "openai-2", "openai"), true);
assert.equal(retryThenAzureFallback.releaseLogicalProviderAttempt("logical-retry-fallback", "openai-2", "provider_reached_failed", false, "server-error"), true);
assert.equal(retryThenAzureFallback.finalizeOpenAiProviderAttempt("logical-retry-fallback", "openai-1", "provider_reached_failed", "invalid-response"), true, "old OpenAI duplicate remains idempotent after the session lease is reused by the second attempt");
assert.equal(retryThenAzureFallback.finalizeOpenAiProviderAttempt("logical-retry-fallback", "openai-1", "provider_reached_failed", "server-error"), false, "the newer attempt outcome cannot rewrite the old immutable receipt");
assert.equal(retryThenAzureFallback.reserveLogicalProviderAttempt("logical-retry-fallback", "azure-1", "azure"), true, "invalid-response followed by server-error permits Azure fallback");
assert.equal(retryThenAzureFallback.reserveLogicalProviderAttempt("logical-retry-fallback", "azure-2", "azure"), false, "the retry chain still permits only one Azure fallback receipt");
const protectedFallbackLease = new PaidCoreFixture();
assert.equal(protectedFallbackLease.reserveProviderSessionLease("protected-session", "logical-protected", "openai-1", 10), true);
assert.equal(protectedFallbackLease.finalizeOpenAiSessionLease("protected-session", "logical-protected", "openai-1", "provider_reached_failed", "server-error", 20), true);
assert.deepEqual(protectedFallbackLease.sessionLeases.get("protected-session"), {
  attemptId: "logical-protected",
  providerAttempt: "openai-1",
  state: "active",
  leaseUntil: 140
}, "OpenAI terminal failure keeps the same logical batch lease active for 120 seconds");
assert.equal(protectedFallbackLease.reserveProviderSessionLease("protected-session", "different-logical-batch", "openai-other", 30), false, "a different batch cannot acquire the protected mutable session lease");
assert.equal(protectedFallbackLease.reserveAzureFromOpenAiLease(
  "protected-session",
  "logical-protected",
  "azure-1",
  { attemptId: "logical-protected", providerAttempt: "openai-1", outcome: "provider_reached_failed", providerFailureClass: "server-error" },
  30
), true, "the same logical batch authorizes Azure from the immutable OpenAI predecessor receipt");
assert.deepEqual(protectedFallbackLease.sessionLeases.get("protected-session"), {
  attemptId: "logical-protected",
  providerAttempt: "azure-1",
  state: "active",
  leaseUntil: 150
}, "Azure reservation transfers the mutable lease to its provider attempt without changing logical ownership");
const reusedAzureSessionLease = { providerAttempt: "azure-1", attempt: "logical-retry-fallback" };
const deterministicOpenAiReceipts = [
  { providerAttempt: "openai-1", providerKind: "openai_attempt", createdAt: 10, id: "receipt-a" },
  { providerAttempt: "openai-2", providerKind: "openai_attempt", createdAt: 10, id: "receipt-b" },
  { providerAttempt: reusedAzureSessionLease.providerAttempt, providerKind: "azure_direct_fallback", createdAt: 30, id: "receipt-c" }
];
const selectedOpenAiPredecessor = deterministicOpenAiReceipts
  .filter((receipt) => receipt.providerKind === "openai_attempt")
  .sort((left, right) => right.createdAt - left.createdAt || right.id.localeCompare(left.id))[0];
assert.equal(selectedOpenAiPredecessor.providerAttempt, "openai-2", "session lease reuse by Azure does not hide the latest OpenAI predecessor");
const retryThenReleasedFallback = new PaidCoreFixture();
assert.equal(retryThenReleasedFallback.reserveLogicalProviderAttempt("logical-retry-released", "openai-1", "openai"), true);
assert.equal(retryThenReleasedFallback.releaseLogicalProviderAttempt("logical-retry-released", "openai-1", "provider_reached_failed", false, "invalid-response"), true);
assert.equal(retryThenReleasedFallback.reserveLogicalProviderAttempt("logical-retry-released", "openai-2", "openai"), true);
assert.equal(retryThenReleasedFallback.releaseLogicalProviderAttempt("logical-retry-released", "openai-2", "provider_not_reached", true, "timeout"), true);
assert.equal(retryThenReleasedFallback.reserveLogicalProviderAttempt("logical-retry-released", "azure-1", "azure"), true, "invalid-response retry followed by released timeout remains Azure-fallback safe");
const unresolvedRetryFallback = new PaidCoreFixture();
unresolvedRetryFallback.logicalProviderAttempts.set("logical-unresolved", new Map([
  ["openai-1", { provider: "openai", state: "committed", outcome: "provider_reached_failed", resourcesReleased: false, providerFailureClass: "invalid-response", committedCost: 1, rateCompleted: true, slotSessionReleased: true }],
  ["openai-2", { provider: "openai", state: "uncertain", outcome: "uncertain_inflight", resourcesReleased: false, providerFailureClass: "server-error", committedCost: 0, rateCompleted: false, slotSessionReleased: false }]
]));
assert.equal(unresolvedRetryFallback.reserveLogicalProviderAttempt("logical-unresolved", "azure-1", "azure"), false, "a two-attempt chain with unresolved state cannot authorize Azure fallback");
const excessiveRetryFallback = new PaidCoreFixture();
excessiveRetryFallback.logicalProviderAttempts.set("logical-excessive", new Map(Array.from({ length: 3 }, (_, index) => [`openai-${index + 1}`, { provider: "openai", state: "released", outcome: "provider_not_reached", resourcesReleased: true, providerFailureClass: "timeout", committedCost: 0, rateCompleted: false, slotSessionReleased: true }])));
assert.equal(excessiveRetryFallback.reserveLogicalProviderAttempt("logical-excessive", "azure-1", "azure"), false, "more than two OpenAI receipts cannot authorize Azure fallback");

const azureTerminalReplay = new PaidCoreFixture();
assert.equal(azureTerminalReplay.reserveLogicalProviderAttempt("azure-terminal", "azure-1", "azure", "degraded", null, false, "server-error"), true);
assert.equal(azureTerminalReplay.finalizeAzureProviderAttempt("azure-terminal", "azure-1", "provider_not_reached", "timeout"), true);
assert.equal(azureTerminalReplay.finalizeAzureProviderAttempt("azure-terminal", "azure-1", "provider_not_reached", "timeout"), true, "duplicate Azure release with the same class is idempotent");
assert.equal(azureTerminalReplay.finalizeAzureProviderAttempt("azure-terminal", "azure-1", "provider_not_reached", "network"), false, "Azure terminal replay rejects a conflicting failure class");
assert.equal(azureTerminalReplay.finalizeAzureProviderAttempt("azure-terminal", "azure-1", "completed"), false, "Azure terminal replay rejects a conflicting outcome");
const azureCompletedReplay = new PaidCoreFixture();
assert.equal(azureCompletedReplay.reserveLogicalProviderAttempt("azure-completed", "azure-1", "azure", "degraded", null, false, "server-error", 50), true);
assert.equal(azureCompletedReplay.finalizeAzureProviderAttempt("azure-completed", "azure-1", "completed", null, 35), true);
assert.equal(azureCompletedReplay.finalizeAzureProviderAttempt("azure-completed", "azure-1", "completed", null, 35), true, "same-value completed Azure replay is idempotent");
assert.equal(azureCompletedReplay.finalizeAzureProviderAttempt("azure-completed", "azure-1", "completed", null, 36), false, "Azure replay rejects conflicting actual characters");
assert.equal(azureCompletedReplay.finalizeAzureProviderAttempt("azure-completed", "azure-1", "provider_not_reached", "network"), false, "completed Azure receipt rejects a released-outcome replay");
const azureReachedFailureReplay = new PaidCoreFixture();
azureReachedFailureReplay.logicalProviderAttempts.set("azure-reached-failure", new Map([
  ["azure-1", { provider: "azure", state: "committed", outcome: "provider_reached_failed", providerFailureClass: "server-error" }]
]));
assert.equal(azureReachedFailureReplay.finalizeAzureProviderAttempt("azure-reached-failure", "azure-1", "provider_reached_failed", "server-error"), true, "stored Azure reached-failure duplicate requires the same class");
assert.equal(azureReachedFailureReplay.finalizeAzureProviderAttempt("azure-reached-failure", "azure-1", "provider_reached_failed", "rate-limit"), false, "stored Azure reached-failure rejects a conflicting class");
assert.equal(azureReachedFailureReplay.finalizeAzureProviderAttempt("azure-reached-failure", "azure-1", "completed"), false, "stored Azure reached-failure rejects a success replay");
const azureExpiredReplay = new PaidCoreFixture();
assert.equal(azureExpiredReplay.reserveLogicalProviderAttempt("azure-expired", "azure-1", "azure", "degraded", null, false, "server-error"), true);
azureExpiredReplay.logicalProviderAttempts.get("azure-expired").get("azure-1").state = "expired";
assert.equal(azureExpiredReplay.finalizeAzureProviderAttempt("azure-expired", "azure-1", "completed"), false, "expired Azure receipt rejects stale delayed completion");
const reachedProviderFailure = new PaidCoreFixture();
assert.equal(reachedProviderFailure.reserveLogicalAttempt("logical-reached-failure", "openai", 100), 100);
assert.equal(reachedProviderFailure.reserveLogicalProviderAttempt("logical-reached-failure", "openai-1", "openai"), true);
assert.equal(reachedProviderFailure.reserveProviderCost("logical-reached-failure", "openai-1", "openai", 25), true);
assert.equal(reachedProviderFailure.reserveRate(1, 20, "reached-rate"), true);
assert.equal(reachedProviderFailure.reserveOpenAiSlot("reached-session", "logical-reached-failure"), true);
assert.equal(reachedProviderFailure.releaseLogicalProviderAttempt("logical-reached-failure", "openai-1", "provider_reached_failed", false, "server-error"), true);
assert.equal(reachedProviderFailure.finalizeProviderReachedFailed("reached-rate", "logical-reached-failure/openai-1", "reached-session"), true, "HTTP 500 reached-provider failure terminates cost, RPM, and slot reservations while retaining session exclusion");
assert.equal(reachedProviderFailure.minuteRequests, 1, "reached-provider failure preserves consumed RPM");
assert.equal(reachedProviderFailure.committedProviderCosts.get("logical-reached-failure/openai-1"), 25, "reached-provider failure conservatively commits reserved cost");
assert.equal(reachedProviderFailure.openAiSlots, 0, "reached-provider failure releases the OpenAI slot");
assert.equal(reachedProviderFailure.sessionLeases.get("reached-session"), "logical-reached-failure", "reached-provider failure keeps the logical batch session lease");
assert.equal(reachedProviderFailure.logicalAttempts.get("logical-reached-failure").reservedCharacters, 100, "reached-provider failure preserves the logical character reservation");
assert.equal(reachedProviderFailure.reserveLogicalProviderAttempt("logical-reached-failure", "openai-2", "openai"), false, "reached-provider failure cannot authorize an OpenAI retry");
assert.equal(reachedProviderFailure.reserveLogicalProviderAttempt("logical-reached-failure", "azure-1", "azure", null, null, false, "server-error"), true, "HTTP 500 reached-provider failure permits only the approved Azure fallback subset");
for (const [failureClass, label] of [["rate-limit", "HTTP 429"], ["invalid-response", "strict JSON invalid response"], ["policy", "policy no-fallback"]]) {
  const reachedClassFixture = new PaidCoreFixture();
  assert.equal(reachedClassFixture.reserveLogicalProviderAttempt(`logical-${failureClass}`, "openai-1", "openai"), true);
  assert.equal(reachedClassFixture.releaseLogicalProviderAttempt(`logical-${failureClass}`, "openai-1", "provider_reached_failed", false, failureClass), true);
  assert.equal(
    reachedClassFixture.reserveLogicalProviderAttempt(`logical-${failureClass}`, "azure-1", "azure", null, null, false, failureClass),
    failureClass === "rate-limit",
    `${label} follows the exact sanitized fallback policy`
  );
}
for (const failureClass of ["server-error", "rate-limit"]) {
  const azureOnlyFixture = new PaidCoreFixture();
  assert.equal(azureOnlyFixture.reserveLogicalProviderAttempt(`logical-azure-only-${failureClass}`, "openai-1", "openai"), true);
  assert.equal(azureOnlyFixture.releaseLogicalProviderAttempt(`logical-azure-only-${failureClass}`, "openai-1", "provider_reached_failed", false, failureClass), true);
  assert.equal(azureOnlyFixture.reserveLogicalProviderAttempt(`logical-azure-only-${failureClass}`, "openai-2", "openai"), false, `${failureClass} reached failure cannot start another OpenAI attempt`);
  assert.equal(azureOnlyFixture.reserveLogicalProviderAttempt(`logical-azure-only-${failureClass}`, "azure-1", "azure", null, null, false, failureClass), true, `${failureClass} reached failure remains Azure-fallback eligible`);
}
for (const failureClass of ["policy", "quota", "configuration"]) {
  const noRetryOrFallbackFixture = new PaidCoreFixture();
  assert.equal(noRetryOrFallbackFixture.reserveLogicalProviderAttempt(`logical-no-provider-${failureClass}`, "openai-1", "openai"), true);
  assert.equal(noRetryOrFallbackFixture.releaseLogicalProviderAttempt(`logical-no-provider-${failureClass}`, "openai-1", "provider_reached_failed", false, failureClass), true);
  assert.equal(noRetryOrFallbackFixture.reserveLogicalProviderAttempt(`logical-no-provider-${failureClass}`, "openai-2", "openai"), false, `${failureClass} cannot authorize OpenAI retry`);
  assert.equal(noRetryOrFallbackFixture.reserveLogicalProviderAttempt(`logical-no-provider-${failureClass}`, "azure-1", "azure", null, null, false, failureClass), false, `${failureClass} cannot authorize Azure fallback`);
}
const activeOpenAiFallback = new PaidCoreFixture();
assert.equal(activeOpenAiFallback.reserveLogicalProviderAttempt("logical-active-openai", "openai-1", "openai"), true);
assert.equal(activeOpenAiFallback.reserveLogicalProviderAttempt("logical-active-openai", "azure-1", "azure", null, null, false, "rate-limit"), false, "Azure fallback is rejected while OpenAI remains active");
const activeAzureFallback = new PaidCoreFixture();
activeAzureFallback.logicalProviderAttempts.set("logical-active-azure", new Map([["azure-1", { provider: "azure", state: "active" }]]));
assert.equal(activeAzureFallback.reserveLogicalProviderAttempt("logical-active-azure", "openai-1", "openai"), false, "OpenAI is rejected while Azure fallback remains active");
const forbiddenCircuitFailure = new PaidCoreFixture();
forbiddenCircuitFailure.providerCircuits.set("openai", { state: "closed", failureCount: 2, windowStartedAt: 0, lastErrorClass: "network" });
assert.equal(forbiddenCircuitFailure.recordProviderCircuitFailure("openai", 10, "quota"), "closed", "quota does not advance the OpenAI fallback circuit");
assert.equal(forbiddenCircuitFailure.providerCircuits.get("openai").failureCount, 2, "forbidden failure preserves the transient failure count");
assert.equal(forbiddenCircuitFailure.providerCircuits.get("openai").lastErrorClass, "quota", "the latest sanitized forbidden class remains observable");
const exactReceiptFallback = new PaidCoreFixture();
assert.equal(exactReceiptFallback.reserveLogicalProviderAttempt("logical-exact-class", "openai-1", "openai"), true);
assert.equal(exactReceiptFallback.releaseLogicalProviderAttempt("logical-exact-class", "openai-1", "provider_not_reached", true, "network"), true);
assert.equal(exactReceiptFallback.reserveLogicalProviderAttempt("logical-exact-class", "azure-1", "azure", null, null, false, "configuration"), true, "an unrelated global class cannot override the exact allowed predecessor receipt");
const forbiddenReceiptFallback = new PaidCoreFixture();
assert.equal(forbiddenReceiptFallback.reserveLogicalProviderAttempt("logical-forbidden-receipt", "openai-1", "openai"), true);
assert.equal(forbiddenReceiptFallback.releaseLogicalProviderAttempt("logical-forbidden-receipt", "openai-1", "provider_not_reached", true, "policy"), true);
assert.equal(forbiddenReceiptFallback.reserveLogicalProviderAttempt("logical-forbidden-receipt", "azure-1", "azure", null, null, false, "network"), false, "an allowed global class cannot authorize a forbidden exact predecessor receipt");
const missingReceiptClass = new PaidCoreFixture();
assert.equal(missingReceiptClass.reserveLogicalProviderAttempt("logical-missing-class", "openai-1", "openai"), true);
assert.equal(missingReceiptClass.releaseLogicalProviderAttempt("logical-missing-class", "openai-1"), true);
assert.equal(missingReceiptClass.reserveLogicalProviderAttempt("logical-missing-class", "azure-1", "azure", null, null, false, "network"), false, "a global allowed class cannot authorize a predecessor receipt with no bound class");
const attemptLedgerCleanup = new PaidCoreFixture();
attemptLedgerCleanup.seedAttemptLedger("expired-terminal", 10, "released", ["released"]);
attemptLedgerCleanup.seedAttemptLedger("unexpired-terminal", 30, "committed", ["committed"]);
attemptLedgerCleanup.seedAttemptLedger("expired-logical-active", 10, "reserved", ["released"]);
attemptLedgerCleanup.seedAttemptLedger("expired-provider-active", 10, "released", ["reserved"]);
assert.equal(attemptLedgerCleanup.cleanupAttemptLedgers(20, 500), 1, "cleanup removes only expired fully terminal attempt ledgers");
assert.equal(attemptLedgerCleanup.attemptLedgers.has("expired-terminal"), false, "eligible terminal logical and provider rows are deleted together");
assert.equal(attemptLedgerCleanup.attemptLedgers.has("unexpired-terminal"), true, "unexpired terminal ledgers are retained");
assert.equal(attemptLedgerCleanup.attemptLedgers.has("expired-logical-active"), true, "expired nonterminal logical attempts are retained");
assert.equal(attemptLedgerCleanup.attemptLedgers.has("expired-provider-active"), true, "expired ledgers with a nonterminal provider receipt are retained");
const boundedAttemptCleanup = new PaidCoreFixture();
for (let index = 0; index < 3; index += 1) boundedAttemptCleanup.seedAttemptLedger(`expired-${index}`, index, "released", ["expired"]);
assert.equal(boundedAttemptCleanup.cleanupAttemptLedgers(20, 2), 2, "cleanup respects its bounded batch limit");
assert.equal(boundedAttemptCleanup.attemptLedgers.size, 1, "a bounded cleanup leaves later eligible rows for the next claim");
const hourlyDetailIdempotency = new PaidCoreFixture();
assert.equal(hourlyDetailIdempotency.recordHourlyDetail("detail-1", "openai-1", "owner/openai/hour", [1, 0, 0, 0, 0, 0, 0, 0], 0, 1440), true);
assert.equal(hourlyDetailIdempotency.recordHourlyDetail("detail-1", "openai-1", "owner/openai/hour", [1, 0, 0, 0, 0, 0, 0, 0], 119, 1440), false, "duplicate source receipt no-ops just before the 120-second submission expiry");
assert.equal(hourlyDetailIdempotency.recordHourlyDetail("detail-1", "openai-1", "owner/openai/hour", [1, 0, 0, 0, 0, 0, 0, 0], 121, 1440), false, "delayed replay after 120 seconds cannot increment the aggregate twice");
assert.equal(hourlyDetailIdempotency.recordHourlyDetail("detail-1", "openai-1", "owner/openai/hour", [1, 0, 0, 0, 0, 0, 0, 0], 121, 1440, 120, 241), false, "delayed duplicate with a refreshed caller expiry no-ops before source-window validation");
assert.equal(hourlyDetailIdempotency.recordHourlyDetail("detail-1", "openai-new", "owner/openai/hour", [1, 0, 0, 0, 0, 0, 0, 0], 121, 1440, 120, 241), false, "a new source identity cannot refresh the locked provider receipt expiry");
assert.deepEqual(hourlyDetailIdempotency.hourlyDetails.get("owner/openai/hour"), [1, 0, 0, 0, 0, 0, 0, 0], "fixed histogram increments exactly once per source");
assert.equal(hourlyDetailIdempotency.cleanupHourlyDetailReceipts(121), 0, "120-second submission expiry does not delete the 24-hour dedupe receipt");
assert.equal(hourlyDetailIdempotency.cleanupHourlyDetailReceipts(1440), 1, "provider detail receipt cleanup remains bounded by logical-attempt expiry");
assert.equal(hourlyDetailIdempotency.recordHourlyDetail("detail-1", "openai-1", "owner/openai/hour", [1, 0, 0, 0, 0, 0, 0, 0], 1440, 1440), false, "expired logical authority cannot recreate a deleted dedupe receipt");
assert.equal(fixture.reserveRate(7, 70), true, "RPM/TPM reservation stays below the configured boundary");
assert.equal(fixture.reserveRate(4, 1), false, "RPM reservation above the boundary is rejected");
assert.equal(fixture.reserveRate(1, 31), false, "TPM reservation above the rolling boundary is rejected");
const rpmRollback = new PaidCoreFixture();
assert.equal(rpmRollback.reserveRate(4, 40, "rate-1"), true);
assert.equal(rpmRollback.minuteRequests, 4);
assert.equal(rpmRollback.finalizeProviderNotReached("rate-1"), true, "provider_not_reached releases the active RPM reservation");
assert.equal(rpmRollback.minuteRequests, 0, "provider_not_reached subtracts the minute bucket reservation");
assert.equal(rpmRollback.finalizeProviderNotReached("rate-1"), false, "double finalize cannot subtract the minute bucket twice");
assert.equal(rpmRollback.minuteRequests, 0, "double finalize leaves the minute bucket nonnegative");
assert.equal(fixture.claimReconciler("lifecycle-1", "lease-a"), true);
assert.equal(fixture.claimReconciler("lifecycle-1", "lease-b"), false, "a lifecycle cannot be claimed twice concurrently");
assert.equal(fixture.finalizeReconciler("lifecycle-1", "stale-token"), false, "stale reconciler token is rejected");
assert.equal(fixture.projectEntitlement("lifecycle-1", "active"), true, "an active entitlement is established before terminal projection");
assert.equal(fixture.projectEntitlement("lifecycle-reconcile", "paid_unentitled_reconciliation"), true);
assert.equal(fixture.projectEntitlement("lifecycle-reconcile", "active"), true, "an unresolved reconciliation projection can converge to current active state");
assert.equal(fixture.projectEntitlement("invalid-active-dispute", "active", "dispute", "investigating", "active"), false, "active subscription plus dispute projection is rejected");
assert.equal(fixture.projectEntitlement("valid-dispute", "dispute", "dispute", "investigating", null), true, "dispute lifecycle with investigating state is valid");
assert.equal(fixture.projectEntitlement("valid-dispute-reconciliation", "dispute_reconciliation", "dispute_reconciliation", "reconciliation", null), true, "dispute reconciliation uses reconciliation dispute state");
assert.equal(fixture.projectEntitlement("won-dispute", "active", "active", "won", "active"), true, "operator-won dispute projects to active non-dispute lifecycle");
assert.equal(fixture.projectEntitlement("expire-required-incomplete", "incomplete", "expire_required", "none", "incomplete"), true, "expire_required remains valid for an incomplete hold path");
assert.equal(fixture.projectEntitlement("invalid-reconciliation-expiry", "paid_unentitled_reconciliation", "expire_required", "none", null), false, "reconciliation entitlement remains in its matching lifecycle");
assert.equal(fixture.projectEntitlement("null-subscription-period", "active", "active", "none", "active", { periodStart: null, periodEnd: null }), false, "subscription-bound active projection requires period bounds");
assert.equal(fixture.projectEntitlement("partial-subscription-period", "active", "active", "none", "active", { periodStart: 0, periodEnd: null }), false, "subscription-bound projection rejects a partial period");
assert.equal(fixture.projectEntitlement("invalid-subscription-period", "cancel_at_period_end", "cancel_at_period_end", "none", "active", { periodStart: 2, periodEnd: 1 }), false, "subscription-bound projection rejects a non-increasing period");
assert.equal(fixture.projectEntitlement("infinite-subscription-period", "active", "active", "none", "active", { periodStart: 0, periodEnd: Infinity }), false, "subscription-bound projection rejects a non-finite period");
assert.equal(fixture.projectEntitlement("active-cancel-flag", "active", "active", "none", "active", { cancelAtPeriodEnd: true }), false, "active entitlement rejects a contradictory cancel-at-period-end flag");
assert.equal(fixture.projectEntitlement("period-end-missing-flag", "cancel_at_period_end", "cancel_at_period_end", "none", "active", { cancelAtPeriodEnd: false }), false, "period-end entitlement requires its cancel-at-period-end flag");
assert.equal(fixture.projectEntitlement("cancel-wait-missing-flag", "cancel_pending", "cancel_pending", "none", null, { cancelAtPeriodEnd: false }), false, "cancel-wait entitlement requires its cancel-at-period-end flag");
assert.equal(fixture.releaseCapacity("lifecycle-1", "lease-a"), false, "capacity cannot release before terminal entitlement projection");
assert.equal(fixture.projectEntitlement("lifecycle-1", "canceled"), true, "terminal entitlement projection is accepted");
assert.equal(fixture.releaseCapacity("lifecycle-1", "stale-token"), false, "capacity release rejects stale reconciler tokens");
assert.equal(fixture.releaseCapacity("lifecycle-1", "lease-a"), true, "capacity release accepts the active reconciler token");
assert.equal(fixture.finalizeReconciler("lifecycle-1", "lease-a"), true);
assert.equal(fixture.recordPaymentFailure("past_due", "observed-10"), "observed-10");
assert.equal(fixture.paymentFailure.nextReconcileAt, "observed-10+7d", "first payment failure schedules seven-day reconciliation");
assert.equal(fixture.recordPaymentFailure("past_due", "observed-duplicate"), "observed-10", "duplicate failure does not move the origin");
assert.equal(fixture.paymentFailure.nextReconcileAt, "observed-10+7d", "duplicate payment failure preserves the original seven-day schedule");
assert.equal(fixture.recordPaymentFailure("past_due", "observed-out-of-order"), "observed-10", "out-of-order duplicate status does not move the origin");
assert.equal(fixture.recordPaymentFailure("active", "observed-recovery"), null, "current active recovery clears the failure origin");
assert.equal(fixture.paymentFailure.nextReconcileAt, null, "active recovery clears payment-failure reconciliation");
assert.equal(fixture.recordPaymentFailure("unpaid", "observed-new-failure"), "observed-new-failure", "a later independent failure creates a new origin");
const currentObjectProjectionFixture = new PaidCoreFixture();
assert.equal(currentObjectProjectionFixture.recordPaymentFailure("active", "observed-active-from-newer-event"), null);
assert.equal(currentObjectProjectionFixture.recordPaymentFailure("past_due", "observed-current-past-due-from-older-event"), "observed-current-past-due-from-older-event", "an out-of-order Event still projects the re-fetched current past_due object");
assert.equal(currentObjectProjectionFixture.paymentFailure.nextReconcileAt, "observed-current-past-due-from-older-event+7d", "current past_due replaces stale active projection regardless of Event.created");
assert.equal(currentObjectProjectionFixture.recordPaymentFailure("active", "observed-current-active-from-older-event"), null, "a re-fetched current active object clears past_due regardless of Event.created");
assert.equal(currentObjectProjectionFixture.paymentFailure.nextReconcileAt, null, "current active clears the payment-failure schedule");
assert.equal(fixture.commitAttempt("attempt-1"), true);
assert.equal(fixture.commitAttempt("attempt-1"), false, "a billing-period commit is idempotent and cannot double-commit");
assert.equal(fixture.reserveLogicalAttempt("attempt-2", "openai", 120), 120, "the first provider reserves the logical characters");
assert.equal(fixture.settleLogicalAttempt("attempt-2"), true, "the first provider settles the logical attempt");
assert.equal(fixture.reserveLogicalAttempt("attempt-2", "azure", 120), 0, "a settled fallback does not double-reserve logical characters");
assert.equal(fixture.reserveLogicalAttempt("attempt-2", "azure", 121), false, "a settled fallback with a different character count is rejected");
assert.equal(fixture.reserveLogicalAttempt("attempt-fallback", "openai", 90), 90);
assert.equal(fixture.reserveProviderCost("attempt-fallback", "openai-1", "openai", 12), true);
assert.equal(fixture.reserveLogicalAttempt("attempt-fallback", "azure", 90), 0, "Azure fallback shares the existing logical character reservation after OpenAI failure");
assert.equal(fixture.reserveProviderCost("attempt-fallback", "azure-1", "azure", 12), true);
assert.equal(fixture.providerCosts.get("attempt-fallback/azure-1"), 0, "Azure fallback does not reserve OpenAI cost");
assert.equal(fixture.settleLogicalAttempt("attempt-fallback"), true, "Azure success commits the logical characters exactly once");
assert.equal(fixture.settleLogicalAttempt("attempt-fallback"), false, "a delayed OpenAI result cannot double-commit logical characters");
const subsetRetryCharacters = new PaidCoreFixture();
assert.equal(subsetRetryCharacters.reserveLogicalAttempt("attempt-subset-retry", "openai", 100), 100);
assert.equal(subsetRetryCharacters.reserveOpenAiRetryCharacters("attempt-subset-retry", 60), 0, "subset OpenAI retry reuses the logical reservation without another character debit");
assert.equal(subsetRetryCharacters.logicalAttempts.get("attempt-subset-retry").reservedCharacters, 100, "subset retry preserves the single original logical character reservation");
assert.equal(subsetRetryCharacters.settleLogicalAttempt("attempt-subset-retry", 55), true, "subset retry success settles the logical attempt");
assert.equal(subsetRetryCharacters.logicalAttempts.get("attempt-subset-retry").reservedCharacters, 0, "subset retry commit consumes the full logical reservation");
assert.equal(subsetRetryCharacters.logicalAttempts.get("attempt-subset-retry").committedCharacters, 55, "subset retry commit records only the supplied actual characters");
assert.equal(subsetRetryCharacters.settleLogicalAttempt("attempt-subset-retry", 55), false, "duplicate subset commit cannot debit the logical reservation twice");
assert.equal(subsetRetryCharacters.logicalAttempts.get("attempt-subset-retry").reservedCharacters, 0, "duplicate subset commit cannot underflow reserved characters");
const subsetAzureCharacters = new PaidCoreFixture();
assert.equal(subsetAzureCharacters.reserveLogicalAttempt("attempt-subset-azure", "openai", 100), 100);
assert.equal(subsetAzureCharacters.reserveLogicalAttempt("attempt-subset-azure", "azure", 60), 0, "Azure fallback may use a subset of the existing logical reservation");
assert.equal(subsetAzureCharacters.failProviderAttempt("attempt-subset-azure", "azure"), false, "subset Azure release retains the logical reservation while OpenAI remains active");
assert.equal(subsetAzureCharacters.logicalAttempts.get("attempt-subset-azure").reservedCharacters, 100, "active sibling retains the full logical reservation");
assert.equal(subsetAzureCharacters.logicalAttempts.get("attempt-subset-azure").providerReservations.get("azure"), 0, "active-sibling release zeros only the current provider receipt");
assert.equal(subsetAzureCharacters.logicalAttempts.get("attempt-subset-azure").providerReservations.get("openai"), 100, "active-sibling release keeps the sibling provider receipt bound to the logical reservation");
assert.equal(subsetAzureCharacters.failProviderAttempt("attempt-subset-azure", "openai"), true, "final sibling release consumes the full logical reservation");
assert.equal(subsetAzureCharacters.logicalAttempts.get("attempt-subset-azure").reservedCharacters, 0, "subset release consumes the logical amount rather than the provider subset");
assert.deepEqual([...subsetAzureCharacters.logicalAttempts.get("attempt-subset-azure").providerReservations.values()], [0, 0], "final release zeros reserved characters on every sibling receipt");
assert.equal(subsetAzureCharacters.failProviderAttempt("attempt-subset-azure", "openai"), false, "duplicate subset release cannot debit twice");
assert.equal(subsetAzureCharacters.logicalAttempts.get("attempt-subset-azure").releaseCount, 1, "duplicate subset release cannot underflow the logical reservation");
assert.equal(fixture.reserveLogicalAttempt("attempt-both-fail", "openai", 70), 70);
assert.equal(fixture.reserveLogicalAttempt("attempt-both-fail", "azure", 70), 0);
assert.equal(fixture.releaseLogicalAttempt("attempt-both-fail"), true, "both provider failures release the one logical character reservation");
assert.equal(fixture.reserveLogicalAttempt("attempt-both-fail", "openai", 70), false, "a settled released logical attempt cannot start another provider attempt");

const azureFailureFirst = new PaidCoreFixture();
assert.equal(azureFailureFirst.reserveLogicalAttempt("azure-first", "openai", 80), 80);
assert.equal(azureFailureFirst.reserveLogicalAttempt("azure-first", "azure", 80), 0);
assert.equal(azureFailureFirst.failProviderAttempt("azure-first", "azure"), false, "Azure failure first retains logical characters while OpenAI is active");
assert.equal(azureFailureFirst.failProviderAttempt("azure-first", "openai"), true, "later OpenAI explicit failure releases logical characters");
assert.equal(azureFailureFirst.failProviderAttempt("azure-first", "openai"), false, "replayed explicit failure cannot release twice");
assert.equal(azureFailureFirst.logicalAttempts.get("azure-first").releaseCount, 1, "Azure-first completion order releases exactly once");

const openAiFailureFirst = new PaidCoreFixture();
assert.equal(openAiFailureFirst.reserveLogicalAttempt("openai-first", "openai", 81), 81);
assert.equal(openAiFailureFirst.failProviderAttempt("openai-first", "openai"), false, "OpenAI explicit failure without Azure fallback keeps logical characters reserved");
assert.equal(openAiFailureFirst.logicalAttempts.get("openai-first").released, false, "no-fallback OpenAI failure remains eligible for Azure reservation");
assert.equal(openAiFailureFirst.reserveLogicalAttempt("openai-first", "azure", 81), 0);
assert.equal(openAiFailureFirst.failProviderAttempt("openai-first", "azure"), true, "later Azure explicit failure releases logical characters");
assert.equal(openAiFailureFirst.failProviderAttempt("openai-first", "azure"), false, "Azure failure replay cannot release twice");
assert.equal(openAiFailureFirst.logicalAttempts.get("openai-first").releaseCount, 1, "OpenAI-first completion order releases exactly once");

const noFallbackAbandon = new PaidCoreFixture();
assert.equal(noFallbackAbandon.reserveLogicalAttempt("no-fallback", "openai", 83), 83);
assert.equal(noFallbackAbandon.failProviderAttempt("no-fallback", "openai"), false, "OpenAI failure preserves the fallback window until runtime explicitly abandons it");
assert.equal(noFallbackAbandon.abandonLogicalAttempt("no-fallback", "openai"), 83, "explicit no-fallback abandonment releases the logical character reservation");
assert.equal(noFallbackAbandon.logicalAttempts.get("no-fallback").reservedCharacters, 0, "abandonment zeros the logical reservation");
assert.equal(noFallbackAbandon.abandonLogicalAttempt("no-fallback", "openai"), 0, "double abandonment is idempotent");
assert.equal(noFallbackAbandon.logicalAttempts.get("no-fallback").releaseCount, 1, "double abandonment cannot decrement twice");

const activeFallbackAbandon = new PaidCoreFixture();
assert.equal(activeFallbackAbandon.reserveLogicalAttempt("active-fallback", "openai", 84), 84);
assert.equal(activeFallbackAbandon.failProviderAttempt("active-fallback", "openai"), false);
assert.equal(activeFallbackAbandon.reserveLogicalAttempt("active-fallback", "azure", 84), 0);
assert.equal(activeFallbackAbandon.abandonLogicalAttempt("active-fallback", "openai"), false, "abandonment rejects an active fallback sibling");

const unknownFallbackAbandon = new PaidCoreFixture();
assert.equal(unknownFallbackAbandon.reserveLogicalAttempt("unknown-fallback", "openai", 85), 85);
assert.equal(unknownFallbackAbandon.failProviderAttempt("unknown-fallback", "openai"), false);
assert.equal(unknownFallbackAbandon.reserveLogicalAttempt("unknown-fallback", "azure", 85), 0);
assert.equal(unknownFallbackAbandon.expireUnknownProviderAttempt("unknown-fallback", "azure"), true);
assert.equal(unknownFallbackAbandon.abandonLogicalAttempt("unknown-fallback", "openai"), false, "abandonment rejects an unknown-expiry sibling");
assert.equal(unknownFallbackAbandon.reclaimUnknownProviderAttempt("unknown-fallback", "azure"), true, "unknown reclaim releases logical characters after all siblings are terminal");
assert.equal(unknownFallbackAbandon.failProviderAttempt("unknown-fallback", "openai"), false, "a delayed terminal sibling cannot double-settle logical characters");
const activeSiblingUnknown = new PaidCoreFixture();
assert.equal(activeSiblingUnknown.reserveLogicalAttempt("active-sibling-unknown", "openai", 87), 87);
assert.equal(activeSiblingUnknown.reserveLogicalAttempt("active-sibling-unknown", "azure", 87), 0);
assert.equal(activeSiblingUnknown.expireUnknownProviderAttempt("active-sibling-unknown", "azure"), true);
assert.equal(activeSiblingUnknown.reclaimUnknownProviderAttempt("active-sibling-unknown", "azure"), false, "unknown reclaim retains logical characters while an active sibling remains");
assert.equal(activeSiblingUnknown.logicalAttempts.get("active-sibling-unknown").reservedCharacters, 87, "active sibling preserves the logical reservation");

const unknownOpenAi = new PaidCoreFixture();
assert.equal(unknownOpenAi.reserveLogicalAttempt("unknown-openai", "openai", 82), 82);
assert.equal(unknownOpenAi.expireUnknownProviderAttempt("unknown-openai", "openai"), true);
assert.equal(unknownOpenAi.reclaimUnknownProviderAttempt("unknown-openai", "openai"), true, "unknown OpenAI reclaim releases user logical characters when no active sibling remains");
assert.equal(unknownOpenAi.logicalAttempts.get("unknown-openai").reservedCharacters, 0, "unknown OpenAI reclaim makes billing-period close reachable");
assert.equal(unknownOpenAi.reclaimUnknownProviderAttempt("unknown-openai", "openai"), false, "unknown OpenAI reclaim cannot double-settle logical characters");
assert.equal(unknownOpenAi.logicalAttempts.get("unknown-openai").releaseCount, 1, "unknown OpenAI reclaim releases exactly once");
const unknownAzure = new PaidCoreFixture();
assert.equal(unknownAzure.reserveLogicalAttempt("unknown-azure", "azure", 86), 86);
assert.equal(unknownAzure.expireUnknownProviderAttempt("unknown-azure", "azure"), true);
assert.equal(unknownAzure.reclaimUnknownProviderAttempt("unknown-azure", "azure"), true, "unknown Azure reclaim releases user logical characters after conservative physical settlement");
assert.equal(unknownAzure.logicalAttempts.get("unknown-azure").reservedCharacters, 0, "unknown Azure reclaim makes billing-period close reachable");
assert.equal(fixture.applyEvent("event-1"), true);
assert.equal(fixture.applyEvent("event-1"), false, "a Stripe event is applied at most once");
const firstClaim = fixture.claimEvent("event-2", "lease-first");
const duplicateClaim = fixture.claimEvent("event-2", "lease-duplicate");
assert.equal(firstClaim.token, "lease-first", "only a new claim receives processing authority");
assert.equal(duplicateClaim.token, null, "an active duplicate claim cannot reuse the live processing token");
assert.equal(fixture.applyEvent("event-2"), true);
assert.equal(fixture.applyEvent("event-2"), false, "concurrent duplicate receipt processing cannot apply the event twice");
const projectionRace = new PaidCoreFixture();
projectionRace.billingLifecycles.set("projection-race", { owner: "owner-race", terminal: false });
assert.equal(projectionRace.claimProjection("projection-race", "owner-race", "projection-a", 0), true, "Worker A claims before refetching the current Stripe object");
assert.equal(projectionRace.claimProjection("projection-race", "owner-race", "projection-b", 60), false, "an active projection lease rejects a concurrent claim");
assert.equal(projectionRace.claimProjection("projection-race", "owner-race", "projection-b", 121), true, "Worker B reclaims after the short lease expires");
assert.equal(projectionRace.projectClaimedEntitlement("projection-race", "projection-b", 122, "past_due"), true, "Worker B projects the current past_due snapshot and clears only its lease");
assert.equal(projectionRace.projectClaimedEntitlement("projection-race", "projection-a", 123, "active"), false, "stale Worker A cannot overwrite current past_due with its old active snapshot");
assert.equal(projectionRace.entitlementStates.get("projection-race"), "past_due", "the atomic projection CAS preserves the newer current-object result");
assert.equal(fixture.reservePoll("poll-session", "owner-1", 1000), 720);
assert.equal(fixture.reservePoll("poll-session", "owner-2", 1000), false, "poll duplicate rejects an owner mismatch");
assert.equal(fixture.reservePoll("poll-session", "owner-1", 999), false, "poll duplicate rejects a budget configuration mismatch");
const rolloverPolls = new PaidCoreFixture();
assert.equal(rolloverPolls.reservePoll("rollover-session", "owner-1", 1000, "day-1", 240), 240, "pre-midnight reservation is bounded by remaining 15-second intervals");
assert.equal(rolloverPolls.reservePoll("rollover-session", "owner-1", 1000, "day-2", 720), 480, "post-midnight reservation is capped by the cumulative 720-poll session maximum");
assert.equal(rolloverPolls.reservePoll("rollover-session", "owner-1", 1000, "day-3", 720), false, "a fully reserved session cannot gain another UTC-day allocation");
const newSessionPollGate = new PaidCoreFixture();
newSessionPollGate.pollDailyReserved.set("day-1", 670);
assert.equal(newSessionPollGate.reservePoll("new-session", "owner-1", 1000, "day-1", 240), false, "a new session cannot cross the atomic ninety-percent daily threshold");
newSessionPollGate.pollReservations.set("existing-session/day-0", { owner: "owner-1", budget: 1000, polls: 240 });
assert.equal(newSessionPollGate.reservePoll("existing-session", "owner-1", 1000, "day-1", 240), 240, "an existing UTC-day continuation remains authorized above ninety percent up to the hard daily budget");
const disabledCircuits = new PaidCoreFixture();
disabledCircuits.providerCircuits.set("openai", "closed");
assert.equal(disabledCircuits.disableProviderCircuit("unknown"), false, "unknown provider cannot be disabled");
assert.equal(disabledCircuits.disableProviderCircuit("openai"), true, "known provider transitions durably to disabled");
assert.equal(disabledCircuits.disableProviderCircuit("openai"), true, "already-disabled transition is idempotent");
assert.equal(disabledCircuits.recordProviderCircuitFailure("openai"), "disabled", "delayed provider failure preserves disabled state");
assert.equal(disabledCircuits.providerCircuits.get("openai"), "disabled");
assert.equal(disabledCircuits.recordProviderCircuitSuccess("openai"), true, "delayed provider success is idempotently acknowledged while disabled");
assert.equal(disabledCircuits.providerCircuits.get("openai"), "disabled", "delayed provider success cannot reopen a disabled circuit");
disabledCircuits.providerCircuits.set("azure_fallback", { state: "closed", failureCount: 2, windowStartedAt: 0 });
assert.equal(disabledCircuits.recordProviderCircuitFailure("azure_fallback", 10), "degraded", "the third closed-window failure keeps normal degradation behavior");
assert.equal(disabledCircuits.recordProviderCircuitSuccess("azure_fallback", "delayed-attempt", 100), false, "delayed ordinary success cannot close a degraded circuit");
assert.equal(disabledCircuits.providerCircuits.get("azure_fallback").state, "degraded", "the configured degraded window remains durable after delayed success");
disabledCircuits.providerCircuits.set("azure_fallback", { state: "half_open", probeAttemptId: "probe-current", probeLeaseUntil: 200 });
assert.equal(disabledCircuits.recordProviderCircuitSuccess("azure_fallback", "probe-stale", 150), false, "a stale half-open probe success cannot reopen the circuit");
assert.deepEqual(disabledCircuits.providerCircuits.get("azure_fallback"), { state: "half_open", probeAttemptId: "probe-current", probeLeaseUntil: 200 }, "stale success preserves the active half-open probe lease");
assert.equal(disabledCircuits.recordProviderCircuitSuccess("azure_fallback", "probe-current", 150), true, "the valid live half-open probe success closes the circuit");
assert.equal(disabledCircuits.providerCircuits.get("azure_fallback"), "closed");
const delayedDegradedFailure = new PaidCoreFixture();
delayedDegradedFailure.providerCircuits.set("openai", { state: "degraded", failureCount: 3, windowStartedAt: 0, degradedUntil: 300 });
assert.equal(delayedDegradedFailure.recordProviderCircuitFailure("openai", 120), "degraded", "a delayed failure after the original rolling window cannot close a degraded circuit");
assert.equal(delayedDegradedFailure.canReserveProviderTraffic("openai"), false, "degraded traffic remains blocked before the probe transition");
assert.equal(delayedDegradedFailure.probeProviderCircuit("openai", 419), "degraded", "a safely extended degraded deadline cannot be probed early");
assert.equal(delayedDegradedFailure.recordProviderCircuitFailure("openai", 500), "degraded", "a failure after degraded_until still cannot bypass the explicit probe transition");
assert.equal(delayedDegradedFailure.canReserveProviderTraffic("openai"), false, "post-deadline delayed failure remains blocked while state is degraded");
assert.equal(delayedDegradedFailure.probeProviderCircuit("openai", 800), "half_open", "only the probe RPC transitions an elapsed degraded circuit to half-open");
assert.equal(delayedDegradedFailure.canReserveProviderTraffic("openai"), true, "half-open permits only probe-controlled reservation traffic");
assert.equal(delayedDegradedFailure.recordProviderCircuitFailure("openai", 810), "degraded", "a half-open failure returns to degraded");
assert.equal(delayedDegradedFailure.providerCircuits.get("openai").degradedUntil, 1110, "half-open failure starts a fresh five-minute degraded deadline");
assert.equal(delayedDegradedFailure.canReserveProviderTraffic("openai"), false, "traffic is blocked again after a half-open failure");
fixture.recordOwnerEntitlement("owner-current", "lifecycle-old", "canceled", true);
fixture.recordOwnerEntitlement("owner-current", "lifecycle-current", "active", false);
assert.equal(fixture.readOwnerEntitlement("owner-current").lifecycle, "lifecycle-current", "owner read ignores an older terminal lifecycle when a current active lifecycle exists");
assert.equal(fixture.readOwnerEntitlement("owner-current", "lifecycle-old").status, "canceled", "lifecycle-specific read returns only the requested historical lifecycle");

console.log("comment translator Paid Core v1 concurrency fixture checks passed");
