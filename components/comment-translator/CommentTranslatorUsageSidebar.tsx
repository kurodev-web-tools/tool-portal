import { CommentTranslatorCreatorWaitlistPanel } from "./CommentTranslatorCreatorWaitlistPanel";
import { StatTile } from "./CommentTranslatorDockAtoms";
import { formatCommentTranslatorResetAt, formatDuration, formatNumber, toneClassName } from "./comment-translator-dock-format";
import type { CommentTranslatorUiCopy, CreatorWaitlistState, OperatorSessionUsageDisplay } from "./comment-translator-dock-model";

export function CommentTranslatorUsageSidebar({ locale, timeZone, plan, copy, usageDisplay, usagePolicyLabel, usagePolicyStopReason, waitlistState, isWaitlistPending, onRefreshWaitlist, onRegisterWaitlist }: {
  readonly locale: "ja" | "en";
  readonly timeZone: string;
  readonly plan: "free" | "paid";
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
  const paidUsage = usageDisplay.paid;
  const paidCopy = copy.operatorSession.paidUsage;
  const isPaid = plan === "paid";
  const paidResetLabel = paidUsage ? formatCommentTranslatorResetAt(paidUsage.nextResetAtIso, locale, timeZone) : null;
  const paidSafetyResetLabel = paidUsage?.safetyStop ? formatCommentTranslatorResetAt(paidUsage.safetyStop.nextResetAtIso, locale, timeZone) : null;
  const paidPollResetLabel = paidUsage ? formatCommentTranslatorResetAt(paidUsage.pollBudget.nextResetAtIso, locale, timeZone) : null;
  return (
    <aside className="grid min-w-0 content-start gap-3">
      {isPaid ? (
        paidUsage ? (
        <section data-comment-translator-paid-usage="server-derived-sanitized-usage-only" data-comment-translator-paid-provider-route={paidUsage.providerRoute} data-comment-translator-paid-safety-caps="individual-global" className="panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-base font-black text-foreground">{paidCopy.usageTitle}</h2><span className={["rounded-base border px-2 py-1 text-xs font-black", toneClassName(usageTone)].join(" ")}>{copy.operatorSession.usageStates[usageDisplay.status]}</span></div>
          <ul className="mt-3 grid gap-2 text-xs font-semibold leading-5 text-muted sm:grid-cols-2"><li className="break-words rounded-base border border-border bg-background/70 px-2 py-1.5">{paidCopy.billingPeriod}</li><li className="break-words rounded-base border border-border bg-background/70 px-2 py-1.5">{paidCopy.maximumNotGuarantee}</li></ul>
          <div className="mt-4 grid gap-3"><StatTile label={paidCopy.billingPeriod} value={`${formatNumber(paidUsage.billingPeriod.used)} / ${formatNumber(paidUsage.billingPeriod.limit)}`} helper={`${formatNumber(paidUsage.billingPeriod.remaining)} ${paidCopy.remaining}`} /><StatTile label={paidCopy.nextReset} value={paidResetLabel ?? paidCopy.resetUnavailable} helper={paidCopy.serverDerived} /></div>
          {paidUsage.fallbackActive && paidUsage.providerRoute === "azure-direct" ? <div data-comment-translator-azure-fallback-banner="same-session-server-route" className="mt-3 rounded-base border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs font-bold leading-5 text-amber-900"><p>{paidCopy.azureFallback}</p>{paidUsage.recoveryExpected ? <p className="mt-1">{paidCopy.azureRecovery}</p> : null}</div> : null}
          {paidUsage.safetyStop ? <div data-comment-translator-paid-safety-stop={paidUsage.safetyStop.reason} className="mt-3 rounded-base border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs font-bold leading-5 text-amber-900"><p>{paidCopy.safetyStop}</p><p className="mt-1">{paidCopy.safetyStops[paidUsage.safetyStop.reason]}</p>{paidSafetyResetLabel ? <p className="mt-1">{paidCopy.nextReset}: {paidSafetyResetLabel}</p> : null}</div> : null}
          {paidUsage.pollBudget.status !== "allowed" ? <div data-comment-translator-paid-poll-budget={paidUsage.pollBudget.status} className="mt-3 rounded-base border border-border bg-surface-muted/45 px-3 py-2 text-xs font-semibold leading-5 text-muted"><p className="font-black text-foreground">{paidCopy.pollBudgetStop}</p>{paidPollResetLabel ? <p className="mt-1">{paidCopy.nextReset}: {paidPollResetLabel}</p> : null}</div> : null}
          <p className="mt-3 break-words text-xs font-semibold leading-5 text-muted">{paidCopy.serverDerived}</p>
        </section>
        ) : (
          <section data-comment-translator-paid-usage="server-derived-sanitized-usage-only" data-comment-translator-paid-provider-route="unknown" data-comment-translator-paid-safety-caps="individual-global" className="panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-base font-black text-foreground">{paidCopy.usageTitle}</h2><span className={["rounded-base border px-2 py-1 text-xs font-black", toneClassName("error")].join(" ")}>{copy.operatorSession.usageStates.unavailable}</span></div>
            <p className="mt-3 break-words text-sm font-bold leading-6 text-foreground">{paidCopy.safetyStop}</p>
            <p className="mt-1 break-words text-xs font-semibold leading-5 text-muted">{paidCopy.safetyStops["infra-safety-stop"]}</p>
            <p className="mt-3 break-words text-xs font-semibold leading-5 text-muted">{paidCopy.serverDerived}</p>
          </section>
        )
      ) : (
        <section data-comment-translator-free-beta-usage-display="right-authoritative-sanitized-usage-only" className="panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-base font-black text-foreground">{copy.operatorSession.usageTitle}</h2><span className={["rounded-base border px-2 py-1 text-xs font-black", toneClassName(usageTone)].join(" ")}>{copy.operatorSession.usageStates[usageDisplay.status]}</span></div>
          <ul data-comment-translator-free-limits-public-copy="enforced-free-limits" className="mt-3 grid gap-2 text-xs font-semibold leading-5 text-muted sm:grid-cols-2">{copy.operatorSession.publicLimitSummary.map((limit) => <li key={limit} className="break-words rounded-base border border-border bg-background/70 px-2 py-1.5">{limit}</li>)}</ul>
          <div className="mt-4 grid gap-3"><StatTile label={copy.fields.sessionRemaining} value={formatDuration(usageDisplay.session.remainingSeconds)} helper={`${formatDuration(usageDisplay.session.usedSeconds)} ${copy.stats.used}`} /><StatTile label={copy.fields.dailyRemaining} value={formatDuration(usageDisplay.daily.remainingSeconds)} helper={`${formatDuration(usageDisplay.daily.usedSeconds)} ${copy.stats.used}`} /><StatTile label={copy.fields.monthlyInputCharacterCap} value={`${formatNumber(usageDisplay.monthlyInputCharacterCap.used)} / ${formatNumber(usageDisplay.monthlyInputCharacterCap.limit)}`} helper={`${formatNumber(usageDisplay.monthlyInputCharacterCap.remaining)} ${copy.fields.monthlyRemaining}`} /><StatTile label={copy.fields.perMinuteCap} value={`${formatNumber(usageDisplay.perMinute.used)} / ${formatNumber(usageDisplay.perMinute.limit)}`} helper={`${formatNumber(usageDisplay.perMinute.remaining)} ${copy.operatorSession.perMinuteRemaining}`} /></div>
          <p className="mt-3 break-words text-xs font-semibold leading-5 text-muted">{usagePolicyLabel}{usagePolicyStopReason ? ` / ${usagePolicyStopReason}` : ""}</p>
        </section>
      )}
      <CommentTranslatorCreatorWaitlistPanel copy={copy} state={waitlistState} isPending={isWaitlistPending} onRefresh={onRefreshWaitlist} onRegister={onRegisterWaitlist} />
    </aside>
  );
}
