"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { LanguageSwitch } from "@/components/portal/LanguageSwitch";
import { useLocale } from "@/components/portal/LocaleProvider";
import { ThemeToggle } from "@/components/portal/ThemeToggle";
import {
  localPreferenceStorageKeys,
  readLocalPreferenceSnapshot,
  type ThemePreference
} from "@/lib/local-preferences";
import type { Locale } from "@/lib/locale";
import type { AccountSessionState } from "@/lib/supabase/session";

type AccountFormAction = (formData: FormData) => void | Promise<void>;

const accountCopy = {
  ja: {
    eyebrow: "Account / Preferences",
    title: "アカウントと共通設定",
    lead: "Supabase Auth の最小接続として、ログイン状態と locale / theme の account 保存だけを確認できます。",
    authSignedOut: "未ログイン",
    authSignedIn: "ログイン中",
    authUnavailable: "Auth 設定待ち",
    authBody: "Email magic link でログインできます。既存 localStorage / IndexedDB / sessionStorage payload は変更せず、初回保存対象は locale / theme のみに閉じています。",
    configMissing: "Supabase URL / publishable key が未設定です。実値は repository に保存しません。",
    emailLabel: "メールアドレス",
    emailPlaceholder: "you@example.com",
    signIn: "ログインリンクを送る",
    signOut: "ログアウト",
    signedInAs: "ログイン中",
    remotePreferenceTitle: "Account preference",
    remotePreferenceEmpty: "account 側の locale / theme はまだ保存されていません。",
    remotePreferenceUnavailable: "user_preferences table 未適用、または RLS / GRANT 未設定の可能性があります。",
    saveLocalPreferences: "このブラウザの設定を account に保存",
    localSnapshotPending: "ブラウザ設定を確認中",
    authMessages: {
      "magic-link-sent": "ログインリンクを送信しました。メール内のリンクから戻ると session cookie が設定されます。",
      "signed-in": "ログインしました。",
      "signed-out": "ログアウトしました。",
      "preferences-saved": "locale / theme を account preference に保存しました。",
      "email-required": "メールアドレスを入力してください。",
      "sign-in-required": "保存するにはログインしてください。",
      "local-preference-required": "保存対象の locale / theme が見つかりません。",
      "supabase-env-missing": "Supabase public env が未設定です。",
      "sign-in-error": "ログインリンクの送信に失敗しました。",
      "confirm-link-invalid": "ログイン確認リンクが不正です。",
      "confirm-error": "ログイン確認に失敗しました。",
      "preference-save-error": "account preference の保存に失敗しました。migration / RLS / GRANT を確認してください。"
    },
    openPlan: "現在の枠",
    planName: "Local Free",
    planBody: "ログインしても paid plan、billing、quota 更新はまだ扱いません。既存ローカルデータも自動アップロードしません。",
    planItems: ["Email magic link", "locale / theme のみ", "既存 payload 変更なし"],
    preferencesTitle: "Preferences",
    preferencesBody: "既存の localStorage key を維持したまま、言語とテーマをこのページから切り替えられます。ログイン中だけ account 側へ明示保存できます。",
    language: "表示言語",
    theme: "テーマ",
    storageKey: "保存 key",
    localOnly: "local-only",
    syncFrameTitle: "将来の sync 候補",
    syncFrameBody: "初期候補は locale / theme と軽量 preference に限定します。draft、schedule events、画像、handoff payload は自動同期しません。",
    providerTitle: "Auth / DB boundary",
    providerBody: "Browser 側は publishable key のみを使い、secret / service_role key は要求・表示・保存しません。quota writes は trusted server only のままです。",
    boundaryItems: ["Supabase SSR cookie session", "user_preferences は locale / theme のみ", "billing / quota 更新なし", "既存 storage payload 変更なし"],
    backToTools: "ツール一覧へ戻る"
  },
  en: {
    eyebrow: "Account / Preferences",
    title: "Account and shared preferences",
    lead: "This first Supabase Auth slice verifies sign-in state and account storage for locale / theme only.",
    authSignedOut: "Signed out",
    authSignedIn: "Signed in",
    authUnavailable: "Auth setup pending",
    authBody: "Email magic links are available. Existing localStorage / IndexedDB / sessionStorage payloads stay unchanged, and the first account save is limited to locale / theme.",
    configMissing: "Supabase URL / publishable key is not configured. Real values are not stored in the repository.",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    signIn: "Send sign-in link",
    signOut: "Sign out",
    signedInAs: "Signed in as",
    remotePreferenceTitle: "Account preference",
    remotePreferenceEmpty: "No account locale / theme preference has been saved yet.",
    remotePreferenceUnavailable: "The user_preferences table may be unapplied, or RLS / GRANT may be missing.",
    saveLocalPreferences: "Save this browser's settings to account",
    localSnapshotPending: "Checking browser settings",
    authMessages: {
      "magic-link-sent": "Sign-in link sent. Open the email link to set the session cookie.",
      "signed-in": "Signed in.",
      "signed-out": "Signed out.",
      "preferences-saved": "Saved locale / theme to account preferences.",
      "email-required": "Enter an email address.",
      "sign-in-required": "Sign in before saving.",
      "local-preference-required": "Locale / theme was not found in this browser.",
      "supabase-env-missing": "Supabase public env is missing.",
      "sign-in-error": "Could not send the sign-in link.",
      "confirm-link-invalid": "The sign-in confirmation link is invalid.",
      "confirm-error": "Could not confirm sign-in.",
      "preference-save-error": "Could not save account preferences. Check migration / RLS / GRANT."
    },
    openPlan: "Current frame",
    planName: "Local Free",
    planBody: "Signing in does not add paid plans, billing, or quota updates yet. Existing local data is not uploaded automatically.",
    planItems: ["Email magic link", "Locale / theme only", "No existing payload changes"],
    preferencesTitle: "Preferences",
    preferencesBody: "Language and theme can be changed here while preserving the existing localStorage keys. Signed-in users can explicitly save them to the account.",
    language: "Language",
    theme: "Theme",
    storageKey: "Storage key",
    localOnly: "local-only",
    syncFrameTitle: "Future sync candidates",
    syncFrameBody: "The first sync candidates stay limited to locale / theme and lightweight preferences. Drafts, schedule events, images, and handoff payloads are not auto-synced.",
    providerTitle: "Auth / DB boundary",
    providerBody: "Browser code assumes the publishable key only. Secret / service_role keys are not requested, displayed, or saved. Quota writes stay trusted-server-only.",
    boundaryItems: ["Supabase SSR cookie session", "user_preferences stores locale / theme only", "No billing or quota updates", "No existing storage payload changes"],
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
  signInAction,
  signOutAction
}: {
  authMessage: string | null;
  authStatus: AccountSessionState;
  saveLocaleThemePreferenceAction: AccountFormAction;
  signInAction: AccountFormAction;
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

  useEffect(() => {
    setLocalSnapshot(readLocalPreferenceSnapshot());
  }, []);

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
            <StatusPill>{authStatus.configStatus === "missing" ? copy.authUnavailable : "Supabase Auth"}</StatusPill>
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
            <form action={signInAction} className="mt-4 grid gap-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted" htmlFor="account-email">
                {copy.emailLabel}
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="account-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder={copy.emailPlaceholder}
                  className="min-w-0 flex-1 rounded-base border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
                />
                <button className="rounded-base bg-primary px-3 py-2 text-sm font-black text-white transition hover:bg-primary-strong">
                  {copy.signIn}
                </button>
              </div>
            </form>
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
            <input name="locale" type="hidden" value={localSnapshot?.locale ?? ""} />
            <input name="theme" type="hidden" value={localSnapshot?.theme ?? ""} />
            <button
              disabled={!isSignedIn || !localSnapshot?.locale || !localSnapshot?.theme}
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
