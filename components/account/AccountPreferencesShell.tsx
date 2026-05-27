"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { LanguageSwitch } from "@/components/portal/LanguageSwitch";
import { useLocale } from "@/components/portal/LocaleProvider";
import { ThemeToggle, themePreferenceStorageKey } from "@/components/portal/ThemeToggle";
import { localePreferenceStorageKey } from "@/lib/locale";

const accountCopy = {
  ja: {
    eyebrow: "Account / Preferences",
    title: "アカウントと共通設定",
    lead: "ログインや同期はまだ接続せず、複数ツール共通の設定入口だけを local-only で確認できます。",
    authStatus: "Auth 未接続",
    authBody: "ログインすると同期できます、という前提表示までに留めています。実ログイン、logout、DB、API route はこの slice では実装しません。",
    openPlan: "現在の枠",
    planName: "Local Free",
    planBody: "このブラウザ内の設定だけで利用できます。paid plan、billing、quota は候補比較後の別 scope です。",
    planItems: ["サーバー同期なし", "請求・支払いなし", "既存ローカルデータの自動アップロードなし"],
    preferencesTitle: "Preferences",
    preferencesBody: "既存の localStorage key を維持したまま、言語とテーマをこのページから切り替えられます。",
    language: "表示言語",
    theme: "テーマ",
    storageKey: "保存 key",
    localOnly: "local-only",
    syncFrameTitle: "将来の sync 候補",
    syncFrameBody: "初期候補は locale / theme と軽量 preference に限定します。draft、schedule events、画像、handoff payload は自動同期しません。",
    providerTitle: "Provider / billing placeholder",
    providerBody: "Supabase Auth、Clerk、Auth.js、Stripe Billing は候補比較まで。schema、migration、quota counter は未作成です。",
    boundaryItems: ["Auth provider 未接続", "DB schema / migration なし", "billing / quota 実装なし", "既存 storage payload 変更なし"],
    backToTools: "ツール一覧へ戻る"
  },
  en: {
    eyebrow: "Account / Preferences",
    title: "Account and shared preferences",
    lead: "This shell keeps auth and sync disconnected while making the shared settings entry point visible as local-only UI.",
    authStatus: "Auth not connected",
    authBody: "The page only shows the future sign-in/sync placeholder. Real login, logout, DB, and API routes are out of this slice.",
    openPlan: "Current frame",
    planName: "Local Free",
    planBody: "Settings stay in this browser. Paid plans, billing, and quota rules belong to a later provider decision slice.",
    planItems: ["No server sync", "No billing or payment", "No automatic upload of existing local data"],
    preferencesTitle: "Preferences",
    preferencesBody: "Language and theme can be changed here while preserving the existing localStorage keys.",
    language: "Language",
    theme: "Theme",
    storageKey: "Storage key",
    localOnly: "local-only",
    syncFrameTitle: "Future sync candidates",
    syncFrameBody: "The first sync candidates stay limited to locale / theme and lightweight preferences. Drafts, schedule events, images, and handoff payloads are not auto-synced.",
    providerTitle: "Provider / billing placeholder",
    providerBody: "Supabase Auth, Clerk, Auth.js, and Stripe Billing remain comparison candidates only. No schema, migration, or quota counter is created.",
    boundaryItems: ["Auth provider disconnected", "No DB schema or migration", "No billing or quota implementation", "No existing storage payload changes"],
    backToTools: "Back to tools"
  }
} as const;

function StatusPill({ children }: { children: string }) {
  return (
    <span className="inline-flex rounded-base border border-border bg-surface-muted px-2.5 py-1 text-xs font-bold text-muted">
      {children}
    </span>
  );
}

function PreferenceRow({
  label,
  storageKey,
  children
}: {
  label: string;
  storageKey: string;
  children: ReactNode;
}) {
  const { locale } = useLocale();
  const copy = accountCopy[locale];

  return (
    <div className="grid gap-3 border-t border-border py-4 first:border-t-0 first:pt-0 last:pb-0 sm:grid-cols-[minmax(8rem,12rem)_minmax(0,1fr)] sm:items-center">
      <div>
        <p className="text-sm font-black text-foreground">{label}</p>
        <p className="mt-1 break-all text-xs font-bold text-muted">
          {copy.storageKey}: <code>{storageKey}</code>
        </p>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        {children}
        <StatusPill>{copy.localOnly}</StatusPill>
      </div>
    </div>
  );
}

export function AccountPreferencesShell() {
  const { locale } = useLocale();
  const copy = accountCopy[locale];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <section className="grid gap-5 border-b border-border pb-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-primary-strong">{copy.eyebrow}</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl">{copy.title}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-muted sm:text-base">{copy.lead}</p>
        </div>
        <div className="rounded-base border border-dashed border-border bg-surface-muted/45 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-black text-foreground">{copy.authStatus}</p>
            <StatusPill>{copy.localOnly}</StatusPill>
          </div>
          <p className="mt-3 text-xs leading-6 text-muted">{copy.authBody}</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
        <div className="panel p-4 shadow-none sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-primary-strong">{copy.openPlan}</p>
              <h2 className="mt-2 text-xl font-black text-foreground">{copy.planName}</h2>
            </div>
            <StatusPill>{copy.authStatus}</StatusPill>
          </div>
          <p className="mt-4 text-sm leading-7 text-muted">{copy.planBody}</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {copy.planItems.map((item) => (
              <div key={item} className="rounded-base border border-border bg-surface-muted/45 px-3 py-3 text-xs font-bold leading-5 text-foreground">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-4 shadow-none sm:p-5">
          <h2 className="text-base font-black text-foreground">{copy.providerTitle}</h2>
          <p className="mt-3 text-sm leading-7 text-muted">{copy.providerBody}</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
        <div className="panel p-4 shadow-none sm:p-5">
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-widest text-primary-strong">{copy.preferencesTitle}</p>
            <h2 className="mt-2 text-xl font-black text-foreground">{copy.preferencesTitle}</h2>
            <p className="mt-3 text-sm leading-7 text-muted">{copy.preferencesBody}</p>
          </div>
          <PreferenceRow label={copy.language} storageKey={localePreferenceStorageKey}>
            <LanguageSwitch />
          </PreferenceRow>
          <PreferenceRow label={copy.theme} storageKey={themePreferenceStorageKey}>
            <ThemeToggle />
          </PreferenceRow>
        </div>

        <div className="space-y-4">
          <div className="panel p-4 shadow-none sm:p-5">
            <h2 className="text-base font-black text-foreground">{copy.syncFrameTitle}</h2>
            <p className="mt-3 text-sm leading-7 text-muted">{copy.syncFrameBody}</p>
          </div>
          <div className="panel p-4 shadow-none sm:p-5">
            <h2 className="text-base font-black text-foreground">{copy.providerTitle}</h2>
            <ul className="mt-3 space-y-2">
              {copy.boundaryItems.map((item) => (
                <li key={item} className="flex gap-2 text-sm font-bold leading-6 text-foreground">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div>
        <Link href="/tools" className="inline-flex rounded-base border border-border bg-surface px-4 py-2 text-sm font-bold text-foreground transition hover:border-primary hover:bg-primary-soft">
          {copy.backToTools}
        </Link>
      </div>
    </div>
  );
}
