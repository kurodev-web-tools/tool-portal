type CommentTranslatorActivePhaseNoticeProps = {
  readonly activePhase: "rate-paused" | "resyncing";
  readonly retryAfterSeconds: number | null;
  readonly ratePausedTitle: string;
  readonly resyncingTitle: string;
  readonly ratePausedBody: string;
  readonly ratePausedSkipped: string;
  readonly perMinuteLabel: string;
  readonly perMinuteUsed: number;
  readonly perMinuteLimit: number;
};

function roundedServerCountdown(seconds: number | null): number | null {
  if (seconds === null || !Number.isFinite(seconds)) {
    return null;
  }

  return Math.max(0, Math.round(seconds));
}

export function CommentTranslatorActivePhaseNotice({
  activePhase,
  retryAfterSeconds,
  ratePausedTitle,
  resyncingTitle,
  ratePausedBody,
  ratePausedSkipped,
  perMinuteLabel,
  perMinuteUsed,
  perMinuteLimit
}: CommentTranslatorActivePhaseNoticeProps) {
  const countdown = roundedServerCountdown(retryAfterSeconds);
  const countdownBody =
    activePhase === "rate-paused" && countdown !== null
      ? ratePausedBody.replace("{seconds}", String(countdown))
      : null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-3 rounded-base border border-amber-200 bg-amber-50/80 p-3 text-amber-900"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="break-words text-sm font-black">
          {activePhase === "rate-paused" ? ratePausedTitle : resyncingTitle}
        </p>
        <span
          data-comment-translator-per-minute-badge="theme-contrast"
          className="rounded-base border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-black text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-100"
        >
          {perMinuteLabel}: {perMinuteUsed} / {perMinuteLimit}
        </span>
      </div>
      {countdownBody ? <p className="mt-2 break-words text-xs font-semibold leading-5">{countdownBody}</p> : null}
      <p className="mt-1 break-words text-xs font-semibold leading-5">{ratePausedSkipped}</p>
    </div>
  );
}
