import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export const commentTranslatorPaidCostLedgerContract = {
  implementationStage: "comment-translator-paid-v1-task5",
  runtime: "server-only",
  paidBillingPeriodCharacterLimit: 500_000,
  paidPerItemCharacterLimit: 500,
  paidIndividualCostLimitMicros: 3_000_000,
  paidGlobalCostLimitMicros: 25_000_000,
  paidAzureFallbackCharacterLimit: 200_000,
  paidAzurePhysicalLimitCharacters: 2_000_000,
  paidAzurePhysicalSafetyMarginCharacters: 600_000,
  paidProviderReservationTtlMs: 120_000,
  paidLogicalAttemptTtlMs: 24 * 60 * 60 * 1_000,
  attemptIdentity: "HMAC-SHA-256-opaque-short-lived",
  retryFallbackBoundary: "same-logical-attempt-separate-provider-attempts",
  freeLedger: "separate-free-durable-usage-ledger",
  paidFallbackLedger: "paid-azure-fallback-reservation-bucket",
  physicalCapacityAuthority: "shared-strict-reservation",
  unknownChargePolicy: "conservative-max-cost-retained",
  settlementIdempotency: "at-most-once-logical-state-transition",
  providerExecution: "not-implemented-in-task-5",
  remoteSupabaseMutation: "not-run-in-this-thread",
  browserReadableOutput: "never-returned-by-this-server-only-policy"
} as const;

export type CommentTranslatorPaidTranslationDisposition =
  | "provider"
  | "cache-hit"
  | "empty"
  | "duplicate"
  | "language-skip";

export type CommentTranslatorPaidInputValidation =
  | {
      readonly accepted: true;
      readonly codePoints: number;
      readonly nonConsuming: false;
    }
  | {
      readonly accepted: false;
      readonly codePoints: number;
      readonly reason: "empty" | "too-long";
      readonly nonConsuming: true;
    };

export type CommentTranslatorPaidLogicalAttemptState = "reserved" | "committed" | "released";
export type CommentTranslatorPaidCostReservationState =
  | "reserved"
  | "committed"
  | "released"
  | "unknown-charge";

export type CommentTranslatorPaidAttemptIdentity = {
  readonly attemptId: string;
  readonly keyVersion: string;
  readonly expiresAtMs: number;
};

export type CommentTranslatorPaidCostReservationDecision =
  | {
      readonly allowed: true;
      readonly requestedCostMicros: number;
      readonly preProvider: true;
    }
  | {
      readonly allowed: false;
      readonly reason: "authority-unreadable" | "invalid-cost" | "individual-cost-limit" | "global-cost-limit";
      readonly preProvider: true;
      readonly nonConsuming: true;
    };

export type CommentTranslatorPaidCostSettlement = {
  readonly state: CommentTranslatorPaidCostReservationState;
  readonly reservedCostMicros: number;
  readonly committedCostMicros: number;
  readonly retainedConservativeCharge: boolean;
};

export type CommentTranslatorPaidLogicalAttemptSettlement = {
  readonly state: CommentTranslatorPaidLogicalAttemptState;
  readonly committedCharacters: number;
  readonly releasedCharacters: number;
  readonly retainedForFallback: boolean;
};

export type CommentTranslatorPaidAzureFallbackCapacityDecision =
  | {
      readonly allowed: true;
      readonly physicalProjectedCharacters: number;
      readonly logicalProjectedCharacters: number;
      readonly preProvider: true;
    }
  | {
      readonly allowed: false;
      readonly reason: "authority-unreadable" | "invalid-capacity" | "logical-limit" | "physical-limit";
      readonly preProvider: true;
      readonly nonConsuming: true;
    };

function requireFiniteNonNegativeInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative safe integer.`);
  }
}

function requirePositiveSafeInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive safe integer.`);
  }
}

export function countCommentTranslatorPaidUnicodeCodePoints(value: string): number {
  return Array.from(value).length;
}

export function validateCommentTranslatorPaidInputItem(value: string): CommentTranslatorPaidInputValidation {
  const codePoints = countCommentTranslatorPaidUnicodeCodePoints(value);
  if (codePoints === 0 || value.trim().length === 0) {
    return { accepted: false, codePoints, reason: "empty", nonConsuming: true };
  }
  if (codePoints > commentTranslatorPaidCostLedgerContract.paidPerItemCharacterLimit) {
    return { accepted: false, codePoints, reason: "too-long", nonConsuming: true };
  }
  return { accepted: true, codePoints, nonConsuming: false };
}

export function resolveCommentTranslatorPaidTranslationDisposition({
  cacheHit = false,
  empty = false,
  duplicate = false,
  languageSkip = false,
  providerEligible = true
}: {
  readonly cacheHit?: boolean;
  readonly empty?: boolean;
  readonly duplicate?: boolean;
  readonly languageSkip?: boolean;
  readonly providerEligible?: boolean;
}): CommentTranslatorPaidTranslationDisposition {
  if (cacheHit) return "cache-hit";
  if (empty || !providerEligible) return "empty";
  if (duplicate) return "duplicate";
  if (languageSkip) return "language-skip";
  return "provider";
}

export function shouldConsumeCommentTranslatorPaidCharacters({
  disposition,
  input
}: {
  readonly disposition: CommentTranslatorPaidTranslationDisposition;
  readonly input: CommentTranslatorPaidInputValidation;
}): boolean {
  return disposition === "provider" && input.accepted;
}

function canonicalizeAttemptInput(values: readonly string[]): string {
  return values.map((value) => `${value.length}:${value}`).join("|");
}

export function isCommentTranslatorPaidAttemptId(value: unknown): value is string {
  return typeof value === "string" && /^ctpa_[A-Za-z0-9_-]{1,32}_[A-Za-z0-9_-]{43}$/.test(value);
}

export function createCommentTranslatorPaidAttemptId({
  serverSecret,
  keyVersion,
  ownerUserId,
  sessionReferenceId,
  providerMessageId,
  targetLanguage,
  nowMs,
  ttlMs = commentTranslatorPaidCostLedgerContract.paidLogicalAttemptTtlMs
}: {
  readonly serverSecret: string;
  readonly keyVersion: string;
  readonly ownerUserId: string;
  readonly sessionReferenceId: string;
  readonly providerMessageId: string;
  readonly targetLanguage: string;
  readonly nowMs: number;
  readonly ttlMs?: number;
}): CommentTranslatorPaidAttemptIdentity {
  if (!serverSecret || !keyVersion || !ownerUserId || !sessionReferenceId || !providerMessageId || !targetLanguage) {
    throw new Error("Paid attempt identity input is incomplete.");
  }
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(keyVersion)) {
    throw new Error("Paid attempt key version is invalid.");
  }
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) {
    throw new Error("Paid attempt identity time is invalid.");
  }
  if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0 || ttlMs > commentTranslatorPaidCostLedgerContract.paidLogicalAttemptTtlMs) {
    throw new Error("Paid attempt identity TTL is invalid.");
  }

  const canonicalInput = canonicalizeAttemptInput([
    ownerUserId,
    sessionReferenceId,
    providerMessageId,
    targetLanguage
  ]);
  const digest = createHmac("sha256", serverSecret)
    .update(`${keyVersion}|${canonicalInput}`, "utf8")
    .digest("base64url");
  const attemptId = `ctpa_${keyVersion}_${digest}`;
  const expiresAtMs = nowMs + Math.min(ttlMs, commentTranslatorPaidCostLedgerContract.paidLogicalAttemptTtlMs);
  return {
    attemptId,
    keyVersion,
    expiresAtMs
  };
}

export function hasCommentTranslatorPaidAttemptId({
  expectedAttemptId,
  actualAttemptId
}: {
  readonly expectedAttemptId: string;
  readonly actualAttemptId: string;
}): boolean {
  const expected = Buffer.from(expectedAttemptId, "utf8");
  const actual = Buffer.from(actualAttemptId, "utf8");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function estimateCommentTranslatorPaidOpenAiCostMicros({
  inputCharacters,
  commentCount
}: {
  readonly inputCharacters: number;
  readonly commentCount: number;
}): number {
  requirePositiveSafeInteger(inputCharacters, "inputCharacters");
  requirePositiveSafeInteger(commentCount, "commentCount");
  if (inputCharacters > 7_500 || commentCount > 15) {
    throw new Error("Paid OpenAI batch estimate exceeds the Task 5 reservation envelope.");
  }
  const inputTokens = 400 + inputCharacters * 4;
  const outputTokens = commentCount * 128 + 384;
  const inputCostMicros = inputTokens * 0.15;
  const outputCostMicros = outputTokens * 0.6;
  return Math.max(1, Math.ceil(inputCostMicros + outputCostMicros));
}

export function assessCommentTranslatorPaidCostReservation({
  authorityReadable,
  individualCommittedCostMicros,
  individualReservedCostMicros,
  globalCommittedCostMicros,
  globalReservedCostMicros,
  requestedCostMicros
}: {
  readonly authorityReadable: boolean;
  readonly individualCommittedCostMicros: number;
  readonly individualReservedCostMicros: number;
  readonly globalCommittedCostMicros: number;
  readonly globalReservedCostMicros: number;
  readonly requestedCostMicros: number;
}): CommentTranslatorPaidCostReservationDecision {
  if (!authorityReadable) {
    return { allowed: false, reason: "authority-unreadable", preProvider: true, nonConsuming: true };
  }
  for (const [value, name] of [
    [individualCommittedCostMicros, "individualCommittedCostMicros"],
    [individualReservedCostMicros, "individualReservedCostMicros"],
    [globalCommittedCostMicros, "globalCommittedCostMicros"],
    [globalReservedCostMicros, "globalReservedCostMicros"]
  ] as const) {
    requireFiniteNonNegativeInteger(value, name);
  }
  if (!Number.isSafeInteger(requestedCostMicros) || requestedCostMicros <= 0) {
    return { allowed: false, reason: "invalid-cost", preProvider: true, nonConsuming: true };
  }
  if (individualCommittedCostMicros + individualReservedCostMicros + requestedCostMicros
    > commentTranslatorPaidCostLedgerContract.paidIndividualCostLimitMicros) {
    return { allowed: false, reason: "individual-cost-limit", preProvider: true, nonConsuming: true };
  }
  if (globalCommittedCostMicros + globalReservedCostMicros + requestedCostMicros
    > commentTranslatorPaidCostLedgerContract.paidGlobalCostLimitMicros) {
    return { allowed: false, reason: "global-cost-limit", preProvider: true, nonConsuming: true };
  }
  return { allowed: true, requestedCostMicros, preProvider: true };
}

export function settleCommentTranslatorPaidCostReservation({
  state,
  reservedCostMicros,
  committedCostMicros,
  outcome,
  actualCostMicros
}: {
  readonly state: CommentTranslatorPaidCostReservationState;
  readonly reservedCostMicros: number;
  readonly committedCostMicros: number;
  readonly outcome: "completed" | "provider-not-reached" | "unknown-charge";
  readonly actualCostMicros?: number;
}): CommentTranslatorPaidCostSettlement {
  requireFiniteNonNegativeInteger(reservedCostMicros, "reservedCostMicros");
  requireFiniteNonNegativeInteger(committedCostMicros, "committedCostMicros");
  if (state === "committed" || state === "unknown-charge") {
    return {
      state,
      reservedCostMicros: 0,
      committedCostMicros,
      retainedConservativeCharge: state === "unknown-charge"
    };
  }
  if (state === "released") {
    return { state, reservedCostMicros: 0, committedCostMicros, retainedConservativeCharge: false };
  }

  if (outcome === "provider-not-reached") {
    return { state: "released", reservedCostMicros: 0, committedCostMicros, retainedConservativeCharge: false };
  }
  if (outcome === "unknown-charge") {
    return {
      state: "unknown-charge",
      reservedCostMicros: 0,
      committedCostMicros: committedCostMicros + reservedCostMicros,
      retainedConservativeCharge: true
    };
  }

  if (actualCostMicros !== undefined
    && Number.isSafeInteger(actualCostMicros)
    && actualCostMicros >= 0
    && actualCostMicros <= reservedCostMicros) {
    return {
      state: "committed",
      reservedCostMicros: 0,
      committedCostMicros: committedCostMicros + actualCostMicros,
      retainedConservativeCharge: false
    };
  }
  return {
    state: "unknown-charge",
    reservedCostMicros: 0,
    committedCostMicros: committedCostMicros + reservedCostMicros,
    retainedConservativeCharge: true
  };
}

export function settleCommentTranslatorPaidLogicalAttempt({
  state,
  reservedCharacters,
  outcome,
  actualCharacters
}: {
  readonly state: CommentTranslatorPaidLogicalAttemptState;
  readonly reservedCharacters: number;
  readonly outcome: "commit" | "release" | "retain-for-fallback";
  readonly actualCharacters?: number;
}): CommentTranslatorPaidLogicalAttemptSettlement {
  requirePositiveSafeInteger(reservedCharacters, "reservedCharacters");
  if (state === "committed") {
    return { state, committedCharacters: 0, releasedCharacters: 0, retainedForFallback: false };
  }
  if (state === "released") {
    return { state, committedCharacters: 0, releasedCharacters: 0, retainedForFallback: false };
  }
  if (outcome === "retain-for-fallback") {
    return { state: "reserved", committedCharacters: 0, releasedCharacters: 0, retainedForFallback: true };
  }
  if (outcome === "release") {
    return { state: "released", committedCharacters: 0, releasedCharacters: reservedCharacters, retainedForFallback: false };
  }
  const committedCharacters = actualCharacters ?? reservedCharacters;
  if (!Number.isSafeInteger(committedCharacters) || committedCharacters <= 0 || committedCharacters > reservedCharacters) {
    throw new Error("Paid logical character commit is invalid; partial translation is not allowed.");
  }
  return { state: "committed", committedCharacters, releasedCharacters: 0, retainedForFallback: false };
}

export function assessCommentTranslatorPaidAzureFallbackCapacity({
  authorityReadable,
  freeUsageCharacters,
  paidFallbackReservedCharacters,
  paidFallbackCommittedCharacters = 0,
  currentLogicalCharacters = 0,
  requestedCharacters
}: {
  readonly authorityReadable: boolean;
  readonly freeUsageCharacters: number;
  readonly paidFallbackReservedCharacters: number;
  readonly paidFallbackCommittedCharacters?: number;
  readonly currentLogicalCharacters?: number;
  readonly requestedCharacters: number;
}): CommentTranslatorPaidAzureFallbackCapacityDecision {
  if (!authorityReadable) {
    return { allowed: false, reason: "authority-unreadable", preProvider: true, nonConsuming: true };
  }
  for (const [value, name] of [
    [freeUsageCharacters, "freeUsageCharacters"],
    [paidFallbackReservedCharacters, "paidFallbackReservedCharacters"],
    [paidFallbackCommittedCharacters, "paidFallbackCommittedCharacters"],
    [currentLogicalCharacters, "currentLogicalCharacters"]
  ] as const) {
    requireFiniteNonNegativeInteger(value, name);
  }
  requirePositiveSafeInteger(requestedCharacters, "requestedCharacters");
  const logicalProjectedCharacters = currentLogicalCharacters + requestedCharacters;
  if (logicalProjectedCharacters > commentTranslatorPaidCostLedgerContract.paidAzureFallbackCharacterLimit) {
    return { allowed: false, reason: "logical-limit", preProvider: true, nonConsuming: true };
  }
  const physicalProjectedCharacters = freeUsageCharacters
    + paidFallbackReservedCharacters
    + paidFallbackCommittedCharacters
    + commentTranslatorPaidCostLedgerContract.paidAzurePhysicalSafetyMarginCharacters
    + requestedCharacters;
  if (physicalProjectedCharacters >= commentTranslatorPaidCostLedgerContract.paidAzurePhysicalLimitCharacters) {
    return { allowed: false, reason: "physical-limit", preProvider: true, nonConsuming: true };
  }
  return { allowed: true, physicalProjectedCharacters, logicalProjectedCharacters, preProvider: true };
}

export const commentTranslatorPaidAzureBoundaryFixtures = {
  theoreticalFreeUsers: 60,
  strictFullFreeUsers: 59,
  fullFreeCharactersAtTheoreticalBoundary: 60 * 20_000,
  fullFreeCharactersAtStrictBoundary: 59 * 20_000
} as const;
