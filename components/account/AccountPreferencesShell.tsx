"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { LanguageSwitch } from "@/components/portal/LanguageSwitch";
import { useLocale } from "@/components/portal/LocaleProvider";
import { ThemeToggle } from "@/components/portal/ThemeToggle";
import {
  localPreferenceStorageKeys,
  readLocalPreferenceSnapshot,
  themePreferenceChangeEvent,
  themePreferenceStorageKey,
  type ThemePreference
} from "@/lib/local-preferences";
import type { Locale } from "@/lib/locale";
import type { AccountSessionState } from "@/lib/supabase/session";

type AccountFormAction = (formData: FormData) => void | Promise<void>;

const accountCopy = {
  ja: {
    eyebrow: "Account / Preferences",
    title: "アカウントと共通設定",
    lead: "ログイン中のアカウントで、表示言語とテーマを共通設定として保存できます。",
    authSignedOut: "未ログイン",
    authSignedIn: "ログイン中",
    authUnavailable: "アカウント設定待ち",
    authBody: "初期公開版では、共通設定の保存だけを小さく扱います。制作データや予定は自動でアップロードしません。",
    configMissing: "アカウント機能の公開設定が未完了です。",
    signOut: "ログアウト",
    signedInAs: "ログイン中",
    remotePreferenceTitle: "Account preference",
    remotePreferenceEmpty: "account 側の locale / theme はまだ保存されていません。",
    remotePreferenceUnavailable: "account 側の保存状態を読み込めませんでした。",
    saveLocalPreferences: "このブラウザの設定を account に保存",
    localSnapshotPending: "ブラウザ設定を確認中",
    authMessages: {
      "signed-in": "ログインしました。",
      "signed-out": "ログアウトしました。",
      "preferences-saved": "locale / theme を account preference に保存しました。",
      "sign-in-required": "保存するにはログインしてください。",
      "local-preference-required": "保存対象の locale / theme が見つかりません。",
      "supabase-env-missing": "アカウント機能の公開設定が未完了です。",
      "confirm-link-invalid": "ログイン確認リンクが不正です。",
      "confirm-error": "ログイン確認に失敗しました。",
      "preference-save-error": "account preference の保存に失敗しました。時間をおいて再度お試しください。"
    },
    openPlan: "現在のアカウント",
    planName: "共通設定",
    planBody: "有料プランの契約状況や外部アカウント連携は後続で追加予定です。いまは表示言語とテーマの保存に限定します。",
    planItems: ["共通設定を保存", "有料プラン状況は後続対応", "外部アカウント連携は後続対応"],
    preferencesTitle: "Preferences",
    preferencesBody: "既存の localStorage key を維持したまま、言語とテーマをこのページから切り替えられます。ログイン中だけ account 側へ明示保存できます。",
    language: "表示言語",
    theme: "テーマ",
    storageKey: "保存 key",
    localOnly: "local-only",
    syncFrameTitle: "将来の sync 候補",
    syncFrameBody: "初期候補は locale / theme と軽量 preference に限定します。draft、schedule events、画像、handoff payload は自動同期しません。",
    providerTitle: "今後追加予定",
    providerBody: "契約状況の表示、外部アカウント連携、ツール別の軽い設定保存は、公開後の段階で追加します。",
    boundaryItems: ["有料プラン契約状況の表示", "外部アカウント連携", "ツール別の軽い設定保存", "既存ローカルデータは自動移行しない"],
    backToTools: "ツール一覧へ戻る"
  },
  en: {
    eyebrow: "Account / Preferences",
    title: "Account and shared preferences",
    lead: "Save display language and theme as shared settings for your signed-in account.",
    authSignedOut: "Signed out",
    authSignedIn: "Signed in",
    authUnavailable: "Account setup pending",
    authBody: "The first public account version only saves shared settings. Creative drafts and schedules are not uploaded automatically.",
    configMissing: "Account publishing settings are not ready.",
    signOut: "Sign out",
    signedInAs: "Signed in as",
    remotePreferenceTitle: "Account preference",
    remotePreferenceEmpty: "No account locale / theme preference has been saved yet.",
    remotePreferenceUnavailable: "Could not load the saved account settings.",
    saveLocalPreferences: "Save this browser's settings to account",
    localSnapshotPending: "Checking browser settings",
    authMessages: {
      "signed-in": "Signed in.",
      "signed-out": "Signed out.",
      "preferences-saved": "Saved locale / theme to account preferences.",
      "sign-in-required": "Sign in before saving.",
      "local-preference-required": "Locale / theme was not found in this browser.",
      "supabase-env-missing": "Account publishing settings are not ready.",
      "confirm-link-invalid": "The sign-in confirmation link is invalid.",
      "confirm-error": "Could not confirm sign-in.",
      "preference-save-error": "Could not save account preferences. Please try again later."
    },
    openPlan: "Current account",
    planName: "Shared settings",
    planBody: "Paid plan status and external account connections are planned for later. This version is limited to language and theme.",
    planItems: ["Save shared settings", "Paid plan status later", "External account links later"],
    preferencesTitle: "Preferences",
    preferencesBody: "Language and theme can be changed here while preserving the existing localStorage keys. Signed-in users can explicitly save them to the account.",
    language: "Language",
    theme: "Theme",
    storageKey: "Storage key",
    localOnly: "local-only",
    syncFrameTitle: "Future sync candidates",
    syncFrameBody: "The first sync candidates stay limited to locale / theme and lightweight preferences. Drafts, schedule events, images, and handoff payloads are not auto-synced.",
    providerTitle: "Planned next",
    providerBody: "Plan status, external account connections, and lightweight tool settings can be added in later phases.",
    boundaryItems: ["Paid plan status", "External account connections", "Lightweight tool settings", "No automatic migration of local data"],
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

export function AccountPreferencesShell({
  authMessage,
  authStatus,
  saveLocaleThemePreferenceAction,
  signOutAction
}: {
  authMessage: string | null;
  authStatus: AccountSessionState;
  saveLocaleThemePreferenceAction: AccountFormAction;
  signOutAction: AccountFormAction;
}) {
  const { locale } = useLocale();
  const copy = accountCopy[locale];
  const [localSnapshot, setLocalSnapshot] = useState<{
    locale: Locale | null;
    theme: ThemePreference | null;
  } | null>(null);
  const isSignedIn = authStatus.authStatus === "signed-in";
  const authStatusLabel =
    authStatus.authStatus === "signed-in"
      ? copy.authSignedIn
      : authStatus.authStatus === "signed-out"
        ? copy.authSignedOut
        : copy.authUnavailable;
  const message = authMessage ? copy.authMessages[authMessage as keyof typeof copy.authMessages] : null;
  const hiddenLocale = locale;
  const hiddenTheme = localSnapshot?.theme ?? "";

  useEffect(() => {
    function refreshLocalSnapshot() {
      const snapshot = readLocalPreferenceSnapshot();
      setLocalSnapshot({
        locale,
        theme: snapshot.theme
      });
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === themePreferenceStorageKey || event.key === localPreferenceStorageKeys.locale) {
        refreshLocalSnapshot();
      }
    }

    refreshLocalSnapshot();
    window.addEventListener(themePreferenceChangeEvent, refreshLocalSnapshot);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(themePreferenceChangeEvent, refreshLocalSnapshot);
      window.removeEventListener("storage", handleStorage);
    };
  }, [locale]);

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
            <p className="text-sm font-black text-foreground">{authStatusLabel}</p>
            <StatusPill>{authStatus.configStatus === "missing" ? copy.authUnavailable : copy.authSignedIn}</StatusPill>
          </div>
          <p className="mt-3 text-xs leading-6 text-muted">{copy.authBody}</p>
          {authStatus.configStatus === "missing" ? (
            <p className="mt-3 text-xs font-bold leading-6 text-red-700 dark:text-red-300">{copy.configMissing}</p>
          ) : null}
          {message ? <p className="mt-3 text-xs font-bold leading-6 text-primary-strong">{message}</p> : null}
          {isSignedIn && authStatus.user ? (
            <form action={signOutAction} className="mt-4">
              <p className="mb-3 break-all text-xs font-bold text-muted">
                {copy.signedInAs}: {authStatus.user.email ?? authStatus.user.id}
              </p>
              <button className="rounded-base border border-border bg-surface px-3 py-2 text-sm font-bold text-foreground transition hover:border-primary hover:bg-primary-soft">
                {copy.signOut}
              </button>
            </form>
          ) : (
            <Link href="/login?next=/account" className="mt-4 inline-flex rounded-base bg-primary px-3 py-2 text-sm font-black text-white transition hover:bg-primary-strong">
              {locale === "ja" ? "ログイン / 登録" : "Log in / Sign up"}
            </Link>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
        <div className="panel p-4 shadow-none sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-primary-strong">{copy.openPlan}</p>
              <h2 className="mt-2 text-xl font-black text-foreground">{copy.planName}</h2>
            </div>
            <StatusPill>{authStatusLabel}</StatusPill>
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
          <PreferenceRow label={copy.language} storageKey={localPreferenceStorageKeys.locale}>
            <LanguageSwitch />
          </PreferenceRow>
          <PreferenceRow label={copy.theme} storageKey={localPreferenceStorageKeys.theme}>
            <ThemeToggle />
          </PreferenceRow>
          <form action={saveLocaleThemePreferenceAction} className="mt-5 border-t border-border pt-4">
            <input name="locale" type="hidden" value={hiddenLocale} />
            <input name="theme" type="hidden" value={hiddenTheme} />
            <button
              disabled={!isSignedIn || !hiddenLocale || !hiddenTheme}
              className="rounded-base bg-primary px-4 py-2 text-sm font-black text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted"
            >
              {localSnapshot ? copy.saveLocalPreferences : copy.localSnapshotPending}
            </button>
          </form>
        </div>

        <div className="space-y-4">
          <div className="panel p-4 shadow-none sm:p-5">
            <h2 className="text-base font-black text-foreground">{copy.remotePreferenceTitle}</h2>
            {authStatus.remotePreferences ? (
              <div className="mt-3 grid gap-2 text-sm leading-7 text-muted">
                <p>
                  locale: <span className="font-bold text-foreground">{authStatus.remotePreferences.locale ?? "-"}</span>
                </p>
                <p>
                  theme: <span className="font-bold text-foreground">{authStatus.remotePreferences.theme ?? "-"}</span>
                </p>
                <p className="break-all text-xs">{authStatus.remotePreferences.updatedAt ?? "-"}</p>
              </div>
            ) : (
              <p className="mt-3 text-sm leading-7 text-muted">
                {authStatus.remotePreferenceStatus === "unavailable" ? copy.remotePreferenceUnavailable : copy.remotePreferenceEmpty}
              </p>
            )}
          </div>
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
