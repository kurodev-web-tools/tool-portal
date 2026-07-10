import { CommentTranslatorCreatorWaitlistPanel } from "./CommentTranslatorCreatorWaitlistPanel";
import { StatTile } from "./CommentTranslatorDockAtoms";
import { formatDuration, formatNumber, toneClassName } from "./comment-translator-dock-format";
import type { CommentTranslatorUiCopy, CreatorWaitlistState, OperatorSessionUsageDisplay } from "./comment-translator-dock-model";

export function CommentTranslatorUsageSidebar({ copy, usageDisplay, usagePolicyLabel, usagePolicyStopReason, waitlistState, isWaitlistPending, onRefreshWaitlist, onRegisterWaitlist }: {
  readonly copy: CommentTranslatorUiCopy;
  readonly usageDisplay: OperatorSessionUsageDisplay;
  readonly usagePolicyLabel: string;
  readonly usagePolicyStopReason: string | null;
  readonly waitlistState: CreatorWaitlistState;
  readonly isWaitlistPending: boolean;
  readonly onRefreshWaitlist: () => void;
  readonly onRegisterWaitlist: () => void;
}) {
  const usageTone = usageDisplay.status === "over-limit" ? "warning" : usageDisplay.status === "unavailable" ? "error" : "normal";
  return (
    <aside className="grid min-w-0 content-start gap-3">
      <section data-comment-translator-free-beta-usage-display="right-authoritative-sanitized-usage-only" className="panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-base font-black text-foreground">{copy.operatorSession.usageTitle}</h2><span className={["rounded-base border px-2 py-1 text-xs font-black", toneClassName(usageTone)].join(" ")}>{copy.operatorSession.usageStates[usageDisplay.status]}</span></div>
        <ul data-comment-translator-free-limits-public-copy="enforced-free-limits" className="mt-3 grid gap-2 text-xs font-semibold leading-5 text-muted sm:grid-cols-2">{copy.operatorSession.publicLimitSummary.map((limit) => <li key={limit} className="break-words rounded-base border border-border bg-background/70 px-2 py-1.5">{limit}</li>)}</ul>
        <div className="mt-4 grid gap-3">
          <StatTile label={copy.fields.sessionRemaining} value={formatDuration(usageDisplay.session.remainingSeconds)} helper={`${formatDuration(usageDisplay.session.usedSeconds)} ${copy.stats.used}`} />
          <StatTile label={copy.fields.dailyRemaining} value={formatDuration(usageDisplay.daily.remainingSeconds)} helper={`${formatDuration(usageDisplay.daily.usedSeconds)} ${copy.stats.used}`} />
          <StatTile label={copy.fields.monthlyInputCharacterCap} value={`${formatNumber(usageDisplay.monthlyInputCharacterCap.used)} / ${formatNumber(usageDisplay.monthlyInputCharacterCap.limit)}`} helper={`${formatNumber(usageDisplay.monthlyInputCharacterCap.remaining)} ${copy.fields.monthlyRemaining}`} />
          <StatTile label={copy.fields.perMinuteCap} value={`${formatNumber(usageDisplay.perMinute.used)} / ${formatNumber(usageDisplay.perMinute.limit)}`} helper={`${formatNumber(usageDisplay.perMinute.remaining)} ${copy.operatorSession.perMinuteRemaining}`} />
        </div>
        <p className="mt-3 break-words text-xs font-semibold leading-5 text-muted">{usagePolicyLabel}{usagePolicyStopReason ? ` / ${usagePolicyStopReason}` : ""}</p>
      </section>
      <CommentTranslatorCreatorWaitlistPanel copy={copy} state={waitlistState} isPending={isWaitlistPending} onRefresh={onRefreshWaitlist} onRegister={onRegisterWaitlist} />
    </aside>
  );
}
