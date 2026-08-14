import "server-only";

export function readCommentTranslatorPaidPositiveIntegerEnv(value: string | undefined): number | null {
  const normalized = value?.trim();
  if (!normalized || !/^\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function resolveCommentTranslatorPaidPollBudgetGate({
  dailyBudget,
  reservedPolls,
  additionalReservedPolls = 0,
  isNewSession,
  nowMs
}: {
  dailyBudget: number;
  reservedPolls: number;
  additionalReservedPolls?: number;
  isNewSession: boolean;
  nowMs: number;
}): {
  status: "allowed" | "stop-checkout" | "stop-new-session" | "stop-active-auto-poll";
  nextResetAtIso: string;
} {
  if (
    !Number.isSafeInteger(dailyBudget)
    || dailyBudget <= 0
    || !Number.isSafeInteger(reservedPolls)
    || reservedPolls < 0
    || !Number.isSafeInteger(additionalReservedPolls)
    || additionalReservedPolls < 0
    || !Number.isSafeInteger(reservedPolls + additionalReservedPolls)
  ) {
    return { status: isNewSession ? "stop-new-session" : "stop-active-auto-poll", nextResetAtIso: utcDayEndIso(nowMs) };
  }
  const projectedReservedPolls = reservedPolls + additionalReservedPolls;
  const ratio = projectedReservedPolls / dailyBudget;
  if (isNewSession && ratio >= 0.9) {
    return { status: "stop-new-session", nextResetAtIso: utcDayEndIso(nowMs) };
  }
  if (!isNewSession && ratio >= 0.95) {
    return { status: "stop-active-auto-poll", nextResetAtIso: utcDayEndIso(nowMs) };
  }
  if (isNewSession && ratio >= 0.8) {
    return { status: "stop-checkout", nextResetAtIso: utcDayEndIso(nowMs) };
  }
  return { status: "allowed", nextResetAtIso: utcDayEndIso(nowMs) };
}

function utcDayEndIso(nowMs: number): string {
  const date = new Date(nowMs);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1)).toISOString();
}
