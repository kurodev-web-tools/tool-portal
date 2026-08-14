import Link from "next/link";
import { credentialStatusTone, operatorFlowTone, toneClassName } from "./comment-translator-dock-format";
import type { OperatorSessionState } from "./comment-translator-dock-model";

export function CommentTranslatorDockHeader({ locale, platformName, surfaceLabel, credentialStatusLabel, credentialStatusState, connectionStatusLabel, streamTitle, streamDockStatus, dockStatusLabel, plan }: {
  readonly locale: "ja" | "en";
  readonly platformName: string;
  readonly surfaceLabel: string;
  readonly credentialStatusLabel: string;
  readonly credentialStatusState: Parameters<typeof credentialStatusTone>[0];
  readonly connectionStatusLabel: string;
  readonly streamTitle: string;
  readonly streamDockStatus: "ready" | "standby" | "blocked";
  readonly dockStatusLabel: string;
  readonly plan: OperatorSessionState["plan"];
}) {
  return (
    <section className="panel p-4 shadow-sm sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-widest text-primary-strong">Live translator</p>
          <h1 className="mt-2 break-words text-2xl font-black tracking-tight text-foreground">{locale === "ja" ? "配信コメント翻訳" : "Live Comment Translator"}</h1>
          <p className="mt-1 break-words text-xs font-semibold text-muted">{platformName} / {surfaceLabel}</p>
          <p className="mt-2 max-w-3xl break-words text-sm font-semibold leading-6 text-muted">{locale === "ja" ? "YouTube連携と配信を確認してから、翻訳を始めるときだけ Start してください。接続だけでは監視や翻訳は始まりません。" : "Check YouTube and stream readiness, then press Start only when you want translation to begin. Connecting alone does not start monitoring or translation."}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <Link href="/account/integrations" className="inline-flex min-h-10 items-center justify-center rounded-base border border-border bg-surface px-4 py-2 text-sm font-bold text-foreground transition hover:border-primary hover:bg-primary-soft">{locale === "ja" ? "接続を確認" : "Check connection"}</Link>
          <Link href="/account/billing" className="inline-flex min-h-10 items-center justify-center rounded-base border border-border bg-surface px-4 py-2 text-sm font-bold text-foreground transition hover:border-primary hover:bg-primary-soft">{locale === "ja" ? "プラン" : "Plan"}</Link>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-base border border-border bg-surface px-4 py-3"><p className="text-xs font-black text-primary-strong">YouTube</p><div className="mt-2 flex flex-wrap items-center justify-between gap-2"><p className="break-words text-base font-black text-foreground">{credentialStatusLabel}</p><span className={["rounded-base border px-2.5 py-1 text-xs font-black", toneClassName(credentialStatusTone(credentialStatusState))].join(" ")}>{connectionStatusLabel}</span></div></div>
        <div className="rounded-base border border-border bg-surface px-4 py-3"><p className="text-xs font-black text-primary-strong">{locale === "ja" ? "配信" : "Stream"}</p><div className="mt-2 flex flex-wrap items-center justify-between gap-2"><p className="break-words text-base font-black text-foreground">{streamTitle}</p><span className={["rounded-base border px-2.5 py-1 text-xs font-black", toneClassName(operatorFlowTone(streamDockStatus))].join(" ")}>{dockStatusLabel}</span></div></div>
        <div className="rounded-base border border-border bg-surface px-4 py-3"><p className="text-xs font-black text-primary-strong">{locale === "ja" ? "プラン" : "Plan"}</p><div className="mt-2 flex flex-wrap items-center justify-between gap-2"><p className="break-words text-base font-black text-foreground">{plan === "paid" ? "Kuro Live Comment Translator Plus" : "Free"}</p><span className="rounded-base border border-primary/30 bg-primary-soft px-2.5 py-1 text-xs font-black text-primary-strong">{locale === "ja" ? "利用可" : "Available"}</span></div></div>
      </div>
    </section>
  );
}
