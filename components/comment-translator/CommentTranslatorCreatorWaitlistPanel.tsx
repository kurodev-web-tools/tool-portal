import Link from "next/link";
import type { CommentTranslatorUiCopy, CreatorWaitlistState } from "./comment-translator-dock-model";

export function CommentTranslatorCreatorWaitlistPanel({ copy, state, isPending, onRefresh, onRegister }: {
  readonly copy: CommentTranslatorUiCopy;
  readonly state: CreatorWaitlistState;
  readonly isPending: boolean;
  readonly onRefresh: () => void;
  readonly onRegister: () => void;
}) {
  const registeredAt = state.registration?.registeredAtIso ?? null;
  const statusLabel = copy.creatorWaitlist.states[state.status];
  const primaryLabel = state.status === "registered" ? copy.creatorWaitlist.registeredButton : state.status === "unauthenticated" ? copy.creatorWaitlist.loginButton : isPending ? copy.creatorWaitlist.pending : copy.creatorWaitlist.joinWaitlist;
  const helper = state.status === "registered" ? copy.creatorWaitlist.registeredHelper : state.status === "unauthenticated" ? copy.creatorWaitlist.loginHelper : state.status === "unavailable" ? copy.creatorWaitlist.unavailable : copy.creatorWaitlist.helper;
  return (
    <div data-comment-translator-creator-waitlist="creator-closed-beta-preregistration" className="rounded-base border border-primary/25 bg-primary-soft/25 px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0"><p className="break-words text-sm font-black text-foreground">{copy.creatorWaitlist.title}</p><p className="mt-1 break-words text-xs font-semibold leading-5 text-muted">{copy.creatorWaitlist.priceIntent}</p></div>
        <span className="rounded-base border border-primary/30 bg-surface px-2 py-1 text-xs font-black text-primary-strong">{statusLabel}</span>
      </div>
      <p className="mt-2 break-words text-xs font-semibold leading-5 text-muted">{helper}</p>
      <div className="mt-3 rounded-base border border-primary/20 bg-surface/80 px-3 py-2">
        <p className="break-words text-xs font-semibold leading-5 text-muted">{copy.creatorWaitlist.featureSummary}</p>
        {registeredAt ? <p className="mt-2 break-words text-xs font-black leading-5 text-foreground">{copy.creatorWaitlist.registeredAt}: {registeredAt}</p> : null}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        {state.actionState === "login-required" && state.loginHref ? <Link href={state.loginHref} className="inline-flex min-h-10 items-center justify-center rounded-base border border-primary bg-primary px-3 py-2 text-sm font-black text-white transition hover:bg-primary-strong">{primaryLabel}</Link> : <button type="button" onClick={onRegister} disabled={isPending || state.actionState !== "enabled"} className="min-h-10 rounded-base border border-primary bg-primary px-3 py-2 text-sm font-black text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-muted disabled:text-muted/70">{primaryLabel}</button>}
        <button type="button" onClick={onRefresh} disabled={isPending} className="min-h-10 rounded-base border border-border bg-surface px-3 py-2 text-sm font-black text-muted transition hover:border-primary/60 hover:bg-primary-soft/40 disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-muted disabled:text-muted/70">{copy.creatorWaitlist.refresh}</button>
      </div>
      <p className="mt-2 break-words text-xs font-semibold leading-5 text-muted">{copy.creatorWaitlist.boundary}</p>
    </div>
  );
}
