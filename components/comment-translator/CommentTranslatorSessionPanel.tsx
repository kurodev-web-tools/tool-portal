import Link from "next/link";
import { CommentTranslatorActivePhaseNotice } from "./CommentTranslatorActivePhaseNotice";
import { operatorSessionTone, toneClassName } from "./comment-translator-dock-format";
import type { CommentTranslatorUiCopy, OperatorSessionState, OperatorSessionUsageDisplay } from "./comment-translator-dock-model";

export function CommentTranslatorSessionPanel({ locale, copy, operatorFlowStatus, sessionState, usageDisplay, credentialStatusLabel, sessionReasonGroup, sessionStopReason, sessionReasonMessage, sessionRecommendedAction, usagePolicyStopReason, isSessionPending, startBlockedByCredentialStatus, startBlockedByUsagePolicy, startBlockedByRateLimit, showReconnectGuidance, onStart, onStop, onRefresh }: {
  readonly locale: "ja" | "en";
  readonly copy: CommentTranslatorUiCopy;
  readonly operatorFlowStatus: "ready" | "standby" | "blocked";
  readonly sessionState: OperatorSessionState;
  readonly usageDisplay: OperatorSessionUsageDisplay;
  readonly credentialStatusLabel: string;
  readonly sessionReasonGroup: string | null;
  readonly sessionStopReason: string;
  readonly sessionReasonMessage: string;
  readonly sessionRecommendedAction: string | null;
  readonly usagePolicyStopReason: string | null;
  readonly isSessionPending: boolean;
  readonly startBlockedByCredentialStatus: boolean;
  readonly startBlockedByUsagePolicy: boolean;
  readonly startBlockedByRateLimit: boolean;
  readonly showReconnectGuidance: boolean;
  readonly onStart: () => void;
  readonly onStop: () => void;
  readonly onRefresh: () => void;
}) {
  return (
    <section data-public-operator-session-ui="sanitized-session-usage-only" data-comment-translator-session-refresh-on-mount="server-status-restore" data-comment-translator-active-phase={sessionState.activePhase} className="panel p-4 md:col-span-2 xl:col-span-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0"><p className="text-xs font-black uppercase tracking-widest text-primary-strong">{operatorFlowStatus === "ready" ? "Ready" : "Check"}</p><h2 className="mt-2 break-words text-xl font-black text-foreground">{operatorFlowStatus === "ready" ? locale === "ja" ? "翻訳を開始できます" : "Ready to start" : copy.operatorSession.startBlockedTitle}</h2></div>
        <span className={["rounded-base border px-2 py-1 text-xs font-black", toneClassName(operatorSessionTone(sessionState.status))].join(" ")}>{isSessionPending ? copy.operatorSession.pending : copy.operatorSession.states[sessionState.status]}</span>
      </div>
      <p className="mt-2 break-words text-sm font-semibold leading-6 text-muted">{copy.operatorSession.helper}</p>
      {sessionState.status === "stopped" && sessionState.reasonUx ? <div data-comment-translator-start-stop-reason-ux="sanitized-reason-only" className="mt-3 rounded-base border border-border bg-background/70 p-3 text-xs"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-black text-foreground">{sessionReasonGroup}</span><span className="rounded-base border border-border bg-surface px-2 py-1 font-black text-muted">{sessionStopReason}</span></div><p className="mt-2 break-words font-semibold leading-5 text-muted">{sessionReasonMessage}</p>{sessionRecommendedAction ? <p className="mt-1 break-words font-black leading-5 text-primary-strong">{sessionRecommendedAction}</p> : null}</div> : null}
      <div data-comment-translator-session-actions="start-stop-refresh" className="mt-4 grid gap-2">
        <button type="button" onClick={onStart} disabled={isSessionPending || sessionState.status === "active" || startBlockedByCredentialStatus || startBlockedByUsagePolicy || startBlockedByRateLimit} className="min-h-12 rounded-base border border-primary bg-primary px-4 py-3 text-base font-black text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-muted disabled:text-muted/70">{isSessionPending ? copy.operatorSession.pending : copy.actions.startSession}</button>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1"><button type="button" onClick={onStop} disabled={isSessionPending || sessionState.status !== "active"} className="min-h-10 rounded-base border border-border bg-surface px-3 py-2 text-sm font-black text-muted transition hover:border-primary/60 hover:bg-primary-soft/40 disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-muted disabled:text-muted/70">{copy.actions.stopSession}</button><button type="button" onClick={onRefresh} disabled={isSessionPending} className="min-h-10 rounded-base border border-border bg-surface px-3 py-2 text-sm font-black text-muted transition hover:border-primary/60 hover:bg-primary-soft/40 disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-muted disabled:text-muted/70">{copy.actions.refreshSession}</button></div>
      </div>
      {sessionState.status === "active" && (sessionState.activePhase === "rate-paused" || sessionState.activePhase === "resyncing") ? <div data-comment-translator-rate-pause="auto-resume-current-cursor"><CommentTranslatorActivePhaseNotice activePhase={sessionState.activePhase} retryAfterSeconds={sessionState.retryAfterSeconds ?? null} ratePausedTitle={copy.operatorSession.ratePausedTitle} resyncingTitle={copy.operatorSession.resyncingTitle} ratePausedBody={copy.operatorSession.ratePausedBody} ratePausedSkipped={copy.operatorSession.ratePausedSkipped} perMinuteLabel={copy.fields.perMinuteCap} perMinuteUsed={usageDisplay.perMinute.used} perMinuteLimit={usageDisplay.perMinute.limit} /></div> : null}
      <div data-comment-translator-start-contrast="youtube-vs-session" className="mt-3 rounded-base border border-border bg-surface/80 p-3 text-xs">
        <p className="font-black text-foreground">{copy.operatorSession.readinessTitle}</p><div className="mt-2 grid gap-2"><div className="flex flex-wrap justify-between gap-2"><span className="font-bold text-muted">{copy.operatorSession.connectionReadiness}</span><span className="font-black text-foreground">{credentialStatusLabel}</span></div><p className="break-words font-semibold leading-5 text-muted">{copy.operatorSession.startReadiness}</p>
        {startBlockedByUsagePolicy ? <div data-comment-translator-start-blocked="usage-policy" className="rounded-base border border-amber-200 bg-amber-50/80 px-3 py-2"><p className="break-words font-black text-amber-900">{copy.operatorSession.usageStartBlockedTitle}</p><p className="mt-1 break-words font-semibold leading-5 text-amber-800">{copy.operatorSession.usageStartBlockedBody}{usagePolicyStopReason ? ` ${usagePolicyStopReason}` : ""}</p></div> : null}
        {startBlockedByRateLimit ? <div data-comment-translator-start-blocked="rate-limit" className="rounded-base border border-amber-200 bg-amber-50/80 px-3 py-2"><p className="break-words font-black text-amber-900">{copy.operatorSession.rateLimitStartBlockedTitle}</p><p className="mt-1 break-words font-semibold leading-5 text-amber-800">{copy.operatorSession.rateLimitStartBlockedBody}{typeof sessionState.retryAfterSeconds === "number" ? ` ${sessionState.retryAfterSeconds}s` : ""}</p></div> : null}</div>
      </div>
      {startBlockedByCredentialStatus ? <div data-comment-translator-start-blocked="youtube-connection-required" className="mt-3 rounded-base border border-amber-200 bg-amber-50/80 p-3"><p className="break-words text-sm font-black text-amber-900">{copy.operatorSession.startBlockedTitle}</p><p className="mt-1 break-words text-xs font-semibold leading-5 text-amber-800">{copy.operatorSession.startBlockedBody}</p><Link href="/account/integrations" className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-base border border-primary bg-primary px-3 py-2 text-sm font-black text-white transition hover:bg-primary-strong">{copy.operatorSession.openIntegrations}</Link></div> : null}
      {showReconnectGuidance ? <p className="mt-3 break-words rounded-base border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-800">{copy.operatorSession.reconnectGuidance}</p> : null}
    </section>
  );
}
