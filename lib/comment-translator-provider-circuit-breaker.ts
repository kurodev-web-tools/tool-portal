import "server-only";

import type { CommentTranslatorOpenAiProviderFailureClass } from "./comment-translator-openai-execution";

export const commentTranslatorProviderCircuitBreakerContract = {
  implementationStage: "comment-translator-paid-v1-task6-provider-circuit-breaker",
  runtime: "server-only",
  eligibleFailureThreshold: 3,
  failureWindowMs: 60_000,
  degradedAzureDirectWindowMs: 300_000,
  probeLeaseMs: 120_000,
  states: ["closed", "degraded", "half_open", "disabled"],
  degradedRoute: "azure-direct",
  disabledRoute: "blocked",
  authority: "server-owned-rpc-read-and-atomic-probe-claim-or-fail-closed-fixture",
  rawProviderMaterial: "never-returned-or-logged"
} as const;

export type CommentTranslatorProviderCircuitName = "openai" | "azure_fallback";
export type CommentTranslatorProviderCircuitState = "closed" | "degraded" | "half_open" | "disabled";
export type CommentTranslatorProviderCircuitRoute = "openai" | "azure-direct" | "blocked";

export type CommentTranslatorProviderCircuitSnapshot = {
  provider: CommentTranslatorProviderCircuitName;
  state: CommentTranslatorProviderCircuitState;
  failureCount: number;
  windowStartedAtMs: number | null;
  degradedUntilMs: number | null;
  probeAttemptId: string | null;
  probeLeaseUntilMs: number | null;
  lastFailureClass: CommentTranslatorOpenAiProviderFailureClass | null;
};

export type CommentTranslatorProviderCircuitAuthority = {
  read: (provider: CommentTranslatorProviderCircuitName) => Promise<CommentTranslatorProviderCircuitSnapshot>;
  disable: (provider: CommentTranslatorProviderCircuitName, nowMs: number) => Promise<boolean>;
  recordFailure: (request: {
    provider: CommentTranslatorProviderCircuitName;
    failureClass: CommentTranslatorOpenAiProviderFailureClass;
    nowMs: number;
    probeAttemptId?: string | null;
  }) => Promise<CommentTranslatorProviderCircuitSnapshot>;
  probe: (request: {
    provider: CommentTranslatorProviderCircuitName;
    nowMs: number;
    probeAttemptId: string;
  }) => Promise<CommentTranslatorProviderCircuitSnapshot>;
  recordSuccess: (request: {
    provider: CommentTranslatorProviderCircuitName;
    nowMs: number;
    probeAttemptId?: string | null;
    receiptCommitted?: boolean;
  }) => Promise<CommentTranslatorProviderCircuitSnapshot>;
  recordAttemptFailure: (request: {
    provider: CommentTranslatorProviderCircuitName;
    attemptId: string;
    providerAttempt: string;
    failureClass: CommentTranslatorOpenAiProviderFailureClass;
    nowMs: number;
    allowDeferredPromotion?: boolean;
    disableProvider?: boolean;
  }) => Promise<CommentTranslatorProviderCircuitSnapshot>;
  recordAttemptSuccess: (request: {
    provider: CommentTranslatorProviderCircuitName;
    attemptId: string;
    providerAttempt: string;
    nowMs: number;
  }) => Promise<CommentTranslatorProviderCircuitSnapshot>;
};

export type CommentTranslatorProviderCircuitRpcClient = {
  rpc: (
    functionName: string,
    params: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message?: string } | null }>;
};

const eligibleFailureClasses = new Set<CommentTranslatorOpenAiProviderFailureClass>([
  "network",
  "timeout",
  "rate-limit",
  "server-error"
]);

export function createCommentTranslatorProviderCircuitSnapshot(
  provider: CommentTranslatorProviderCircuitName,
  state: CommentTranslatorProviderCircuitState = "closed"
): CommentTranslatorProviderCircuitSnapshot {
  return {
    provider,
    state,
    failureCount: 0,
    windowStartedAtMs: null,
    degradedUntilMs: null,
    probeAttemptId: null,
    probeLeaseUntilMs: null,
    lastFailureClass: null
  };
}

export function isCommentTranslatorProviderCircuitFailureEligible(
  failureClass: CommentTranslatorOpenAiProviderFailureClass
): boolean {
  return eligibleFailureClasses.has(failureClass);
}

export function recordCommentTranslatorProviderCircuitFailure({
  snapshot,
  failureClass,
  nowMs
}: {
  snapshot: CommentTranslatorProviderCircuitSnapshot;
  failureClass: CommentTranslatorOpenAiProviderFailureClass;
  nowMs: number;
}): CommentTranslatorProviderCircuitSnapshot {
  assertCircuitTime(nowMs);
  if (snapshot.state === "disabled") return { ...snapshot };
  if (!isCommentTranslatorProviderCircuitFailureEligible(failureClass)) {
    return { ...snapshot, lastFailureClass: failureClass };
  }

  if (snapshot.state === "degraded") {
    return {
      ...snapshot,
      failureCount: Math.max(3, snapshot.failureCount + 1),
      degradedUntilMs: Math.max(snapshot.degradedUntilMs ?? nowMs, nowMs + commentTranslatorProviderCircuitBreakerContract.degradedAzureDirectWindowMs),
      probeAttemptId: null,
      probeLeaseUntilMs: null,
      lastFailureClass: failureClass
    };
  }

  if (snapshot.state === "half_open") {
    return {
      ...snapshot,
      state: "degraded",
      failureCount: 3,
      windowStartedAtMs: snapshot.windowStartedAtMs ?? nowMs,
      degradedUntilMs: nowMs + commentTranslatorProviderCircuitBreakerContract.degradedAzureDirectWindowMs,
      probeAttemptId: null,
      probeLeaseUntilMs: null,
      lastFailureClass: failureClass
    };
  }

  const withinWindow =
    snapshot.windowStartedAtMs !== null
    && nowMs - snapshot.windowStartedAtMs < commentTranslatorProviderCircuitBreakerContract.failureWindowMs;
  const failureCount = withinWindow ? snapshot.failureCount + 1 : 1;
  if (failureCount >= commentTranslatorProviderCircuitBreakerContract.eligibleFailureThreshold) {
    return {
      ...snapshot,
      state: "degraded",
      failureCount,
      windowStartedAtMs: snapshot.windowStartedAtMs ?? nowMs,
      degradedUntilMs: nowMs + commentTranslatorProviderCircuitBreakerContract.degradedAzureDirectWindowMs,
      probeAttemptId: null,
      probeLeaseUntilMs: null,
      lastFailureClass: failureClass
    };
  }

  return {
    ...snapshot,
    state: "closed",
    failureCount,
    windowStartedAtMs: withinWindow ? snapshot.windowStartedAtMs : nowMs,
    lastFailureClass: failureClass
  };
}

export function disableCommentTranslatorProviderCircuit(
  snapshot: CommentTranslatorProviderCircuitSnapshot
): CommentTranslatorProviderCircuitSnapshot {
  return {
    ...snapshot,
    state: "disabled",
    failureCount: 0,
    windowStartedAtMs: null,
    degradedUntilMs: null,
    probeAttemptId: null,
    probeLeaseUntilMs: null,
    lastFailureClass: null
  };
}

export function probeCommentTranslatorProviderCircuit({
  snapshot,
  nowMs,
  probeAttemptId
}: {
  snapshot: CommentTranslatorProviderCircuitSnapshot;
  nowMs: number;
  probeAttemptId: string;
}): CommentTranslatorProviderCircuitSnapshot {
  assertCircuitTime(nowMs);
  if (snapshot.state === "disabled") return { ...snapshot };
  if (snapshot.state === "degraded" && (snapshot.degradedUntilMs ?? Number.POSITIVE_INFINITY) <= nowMs) {
    return {
      ...snapshot,
      state: "half_open",
      probeAttemptId,
      probeLeaseUntilMs: nowMs + commentTranslatorProviderCircuitBreakerContract.probeLeaseMs
    };
  }
  if (snapshot.state === "half_open") {
    if (snapshot.probeLeaseUntilMs !== null && snapshot.probeLeaseUntilMs > nowMs) {
      return { ...snapshot };
    }
    return {
      ...snapshot,
      probeAttemptId,
      probeLeaseUntilMs: nowMs + commentTranslatorProviderCircuitBreakerContract.probeLeaseMs
    };
  }
  return { ...snapshot };
}

export function recordCommentTranslatorProviderCircuitSuccess({
  snapshot,
  nowMs,
  probeAttemptId = null,
  receiptCommitted = true
}: {
  snapshot: CommentTranslatorProviderCircuitSnapshot;
  nowMs: number;
  probeAttemptId?: string | null;
  receiptCommitted?: boolean;
}): CommentTranslatorProviderCircuitSnapshot {
  assertCircuitTime(nowMs);
  if (snapshot.state === "disabled") return { ...snapshot };
  if (snapshot.state === "degraded") return { ...snapshot };
  if (snapshot.state === "half_open") {
    const validProbe =
      receiptCommitted
      && probeAttemptId !== null
      && probeAttemptId === snapshot.probeAttemptId
      && snapshot.probeLeaseUntilMs !== null
      && snapshot.probeLeaseUntilMs > nowMs;
    if (!validProbe) return { ...snapshot };
  }
  if (snapshot.state === "closed") return { ...snapshot };
  return {
    ...snapshot,
    state: "closed",
    failureCount: 0,
    windowStartedAtMs: null,
    degradedUntilMs: null,
    probeAttemptId: null,
    probeLeaseUntilMs: null,
    lastFailureClass: null
  };
}

export function resolveCommentTranslatorProviderCircuitRoute({
  snapshot,
  nowMs
}: {
  snapshot: CommentTranslatorProviderCircuitSnapshot;
  nowMs: number;
}): CommentTranslatorProviderCircuitRoute {
  if (snapshot.state === "disabled") return "blocked";
  if (snapshot.state === "degraded" && (snapshot.degradedUntilMs ?? 0) > nowMs) return "azure-direct";
  if (snapshot.state === "degraded") return "blocked";
  if (snapshot.state === "half_open") return "openai";
  return "openai";
}

export function createInMemoryCommentTranslatorProviderCircuitAuthority({
  snapshots = {}
}: {
  snapshots?: Partial<Record<CommentTranslatorProviderCircuitName, CommentTranslatorProviderCircuitSnapshot>>;
} = {}): CommentTranslatorProviderCircuitAuthority {
  const state = new Map<CommentTranslatorProviderCircuitName, CommentTranslatorProviderCircuitSnapshot>([
    ["openai", snapshots.openai ?? createCommentTranslatorProviderCircuitSnapshot("openai")],
    ["azure_fallback", snapshots.azure_fallback ?? createCommentTranslatorProviderCircuitSnapshot("azure_fallback")]
  ]);
  return {
    async read(provider) {
      return { ...(state.get(provider) ?? createCommentTranslatorProviderCircuitSnapshot(provider)) };
    },
    async disable(provider) {
      state.set(provider, disableCommentTranslatorProviderCircuit(state.get(provider) ?? createCommentTranslatorProviderCircuitSnapshot(provider)));
      return true;
    },
    async recordFailure(request) {
      const current = state.get(request.provider) ?? createCommentTranslatorProviderCircuitSnapshot(request.provider);
      const ownsHalfOpenProbe =
        current.state !== "half_open"
        || (request.probeAttemptId !== undefined
          && request.probeAttemptId !== null
          && request.probeAttemptId === current.probeAttemptId
          && current.probeLeaseUntilMs !== null
          && current.probeLeaseUntilMs > request.nowMs);
      if (!ownsHalfOpenProbe) return { ...current };
      const next = recordCommentTranslatorProviderCircuitFailure({
        snapshot: current,
        failureClass: request.failureClass,
        nowMs: request.nowMs
      });
      state.set(request.provider, next);
      return { ...next };
    },
    async probe(request) {
      const next = probeCommentTranslatorProviderCircuit({
        snapshot: state.get(request.provider) ?? createCommentTranslatorProviderCircuitSnapshot(request.provider),
        nowMs: request.nowMs,
        probeAttemptId: request.probeAttemptId
      });
      state.set(request.provider, next);
      return { ...next };
    },
    async recordSuccess(request) {
      const next = recordCommentTranslatorProviderCircuitSuccess({
        snapshot: state.get(request.provider) ?? createCommentTranslatorProviderCircuitSnapshot(request.provider),
        nowMs: request.nowMs,
        probeAttemptId: request.probeAttemptId,
        receiptCommitted: request.receiptCommitted
      });
      state.set(request.provider, next);
      return { ...next };
    },
    async recordAttemptFailure(request) {
      if (request.disableProvider) {
        const next = disableCommentTranslatorProviderCircuit(
          state.get(request.provider) ?? createCommentTranslatorProviderCircuitSnapshot(request.provider)
        );
        state.set(request.provider, next);
        return { ...next };
      }
      const current = state.get(request.provider) ?? createCommentTranslatorProviderCircuitSnapshot(request.provider);
      if (
        current.state === "half_open"
        && (
          current.probeAttemptId !== request.attemptId
          || current.probeLeaseUntilMs === null
          || current.probeLeaseUntilMs <= request.nowMs
        )
      ) return { ...current };
      const next = recordCommentTranslatorProviderCircuitFailure({
        snapshot: current,
        failureClass: request.failureClass,
        nowMs: request.nowMs
      });
      state.set(request.provider, next);
      return { ...next };
    },
    async recordAttemptSuccess(request) {
      const next = recordCommentTranslatorProviderCircuitSuccess({
        snapshot: state.get(request.provider) ?? createCommentTranslatorProviderCircuitSnapshot(request.provider),
        nowMs: request.nowMs,
        probeAttemptId: request.attemptId,
        receiptCommitted: true
      });
      state.set(request.provider, next);
      return { ...next };
    }
  };
}

export function createCommentTranslatorProviderCircuitAuthority({
  rpc
}: {
  rpc: CommentTranslatorProviderCircuitRpcClient;
}): CommentTranslatorProviderCircuitAuthority {
  return {
    async read(provider) {
      const result = await rpc.rpc("ct_paid_read_provider_circuit", { p_provider: provider });
      return readSnapshot(result, provider);
    },
    async disable(provider, nowMs) {
      assertCircuitTime(nowMs);
      const result = await rpc.rpc("ct_paid_disable_provider_circuit", {
        p_provider: provider,
        p_now: new Date(nowMs).toISOString()
      });
      if (result.error || result.data !== true) throw new Error("Provider circuit authority is unavailable.");
      return true;
    },
    async recordFailure({ provider, failureClass, nowMs, probeAttemptId = null }) {
      assertCircuitTime(nowMs);
      const result = await rpc.rpc("ct_paid_record_provider_circuit_failure_owned", {
        p_provider: provider,
        p_error_class: mapCircuitFailureClass(failureClass),
        p_probe_attempt_id: probeAttemptId,
        p_now: new Date(nowMs).toISOString()
      });
      return readSnapshot(result, provider);
    },
    async probe({ provider, nowMs, probeAttemptId }) {
      assertCircuitTime(nowMs);
      const result = await rpc.rpc("ct_paid_claim_provider_circuit_probe", {
        p_provider: provider,
        p_probe_attempt_id: probeAttemptId,
        p_now: new Date(nowMs).toISOString()
      });
      return readSnapshot(result, provider);
    },
    async recordSuccess({ provider, nowMs, probeAttemptId, receiptCommitted = true }) {
      assertCircuitTime(nowMs);
      const result = await rpc.rpc("ct_paid_record_provider_circuit_success", {
        p_provider: provider,
        p_probe_attempt_id: probeAttemptId ?? null,
        p_now: new Date(nowMs).toISOString()
      });
      if (result.error || result.data !== true) throw new Error("Provider circuit success authority is unavailable.");
      return readSnapshot(await rpc.rpc("ct_paid_read_provider_circuit", { p_provider: provider }), provider);
    },
    async recordAttemptFailure({
      provider,
      attemptId,
      providerAttempt,
      failureClass,
      nowMs,
      allowDeferredPromotion = false,
      disableProvider = false
    }) {
      assertCircuitTime(nowMs);
      const result = await rpc.rpc("ct_paid_record_attempt_circuit_failure", {
        p_provider: provider,
        p_attempt_id: attemptId,
        p_provider_attempt: providerAttempt,
        p_error_class: mapCircuitFailureClass(failureClass),
        p_allow_deferred_promotion: allowDeferredPromotion,
        p_disable_provider: disableProvider,
        p_now: new Date(nowMs).toISOString()
      });
      if (result.error || result.data !== true) throw new Error("Attempt circuit failure authority is unavailable.");
      return readSnapshot(await rpc.rpc("ct_paid_read_provider_circuit", { p_provider: provider }), provider);
    },
    async recordAttemptSuccess({ provider, attemptId, providerAttempt, nowMs }) {
      assertCircuitTime(nowMs);
      const result = await rpc.rpc("ct_paid_record_attempt_circuit_success", {
        p_provider: provider,
        p_attempt_id: attemptId,
        p_provider_attempt: providerAttempt,
        p_now: new Date(nowMs).toISOString()
      });
      if (result.error || result.data !== true) throw new Error("Attempt circuit success authority is unavailable.");
      return readSnapshot(await rpc.rpc("ct_paid_read_provider_circuit", { p_provider: provider }), provider);
    }
  };
}

function readSnapshot(
  result: { data: unknown; error: { message?: string } | null },
  provider: CommentTranslatorProviderCircuitName,
  probeAttemptId: string | null = null
): CommentTranslatorProviderCircuitSnapshot {
  if (result.error) throw new Error("Provider circuit authority is unavailable.");
  const value = Array.isArray(result.data) ? result.data[0] : result.data;
  if (typeof value === "string") {
    return {
      ...createCommentTranslatorProviderCircuitSnapshot(provider, readState(value)),
      probeAttemptId: readState(value) === "half_open" ? probeAttemptId : null,
      probeLeaseUntilMs: readState(value) === "half_open" ? Date.now() + commentTranslatorProviderCircuitBreakerContract.probeLeaseMs : null
    };
  }
  if (!isRecord(value)) throw new Error("Provider circuit authority returned unreadable state.");
  const state = readState(value.circuit_state ?? value.state);
  return {
    provider,
    state,
    failureCount: readNonNegativeInteger(value.failure_count),
    windowStartedAtMs: readTimestamp(value.window_started_at),
    degradedUntilMs: readTimestamp(value.degraded_until),
    probeAttemptId: typeof value.probe_attempt_id === "string" ? value.probe_attempt_id : null,
    probeLeaseUntilMs: readTimestamp(value.probe_lease_until),
    lastFailureClass: readFailureClass(value.last_error_class)
  };
}

function mapCircuitFailureClass(failureClass: CommentTranslatorOpenAiProviderFailureClass): string {
  if (failureClass === "invalid-response" || failureClass === "invalid-request") return "policy";
  if (failureClass === "authentication" || failureClass === "unsupported") return "configuration";
  if (failureClass === "cost") return "quota";
  return failureClass;
}

function readState(value: unknown): CommentTranslatorProviderCircuitState {
  if (value === "closed" || value === "degraded" || value === "half_open" || value === "disabled") return value;
  throw new Error("Provider circuit state is unreadable.");
}

function readFailureClass(value: unknown): CommentTranslatorOpenAiProviderFailureClass | null {
  return typeof value === "string" && isFailureClass(value) ? value : null;
}

function isFailureClass(value: string): value is CommentTranslatorOpenAiProviderFailureClass {
  return [
    "network",
    "timeout",
    "rate-limit",
    "server-error",
    "authentication",
    "configuration",
    "quota",
    "cost",
    "policy",
    "invalid-response",
    "invalid-request",
    "unsupported"
  ].includes(value as CommentTranslatorOpenAiProviderFailureClass);
}

function readNonNegativeInteger(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function readTimestamp(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function assertCircuitTime(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("Provider circuit time is invalid.");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
