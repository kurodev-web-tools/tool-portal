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
    eyebrow: "アカウント設定",
    title: "アカウントと表示設定",
    lead: "表示言語とテーマは未ログインでもこのブラウザで使えます。ログインすると、同じ設定を別ブラウザやスマホでも引き継げます。",
    authSignedOut: "未ログイン",
    authSignedIn: "ログイン中",
    authUnavailable: "アカウント設定待ち",
    authBody: "初期公開版では、表示設定の保存だけを小さく扱います。下書き、予定本文、画像、handoff payload は自動アップロードしません。",
    configMissing: "アカウント機能の公開設定が未完了です。",
    signOut: "ログアウト",
    signedInAs: "ログイン中のメールアドレス",
    remotePreferenceTitle: "アカウントに保存済みの設定",
    remotePreferenceEmpty: "アカウントにはまだ表示言語とテーマが保存されていません。",
    remotePreferenceUnavailable: "アカウント側の保存状態を読み込めませんでした。",
    saveLocalPreferences: "このブラウザの表示設定をアカウントに保存",
    securityTitle: "セキュリティ",
    securityBody: "パスワードを変更するときは、現在のパスワードを確認してから新しいパスワードを保存します。",
    changePassword: "パスワード変更",
    localSnapshotPending: "ブラウザ設定を確認中",
    authMessages: {
      "signed-in": "ログインしました。",
      "signed-out": "ログアウトしました。",
      "preferences-saved": "表示設定をアカウントに保存しました。",
      "sign-in-required": "保存するにはログインしてください。",
      "local-preference-required": "保存対象の表示設定が見つかりません。",
      "supabase-env-missing": "アカウント機能の公開設定が未完了です。",
      "confirm-link-invalid": "ログイン確認リンクが不正です。",
      "confirm-error": "ログイン確認に失敗しました。",
      "password-updated": "パスワードを更新しました。",
      "preference-save-error": "表示設定の保存に失敗しました。時間をおいて再度お試しください。"
    },
    openPlan: "現在のアカウント",
    planName: "アカウント状況",
    planBody: "いまは表示言語とテーマを別ブラウザやスマホでも引き継げるようにする範囲へ限定します。Comment Translator のYouTube連携管理は専用ページで確認できます。有料プラン状況は後続で追加予定です。",
    planItems: ["表示設定を保存", "有料プラン状況は後続対応", "YouTube連携管理"],
    preferencesTitle: "表示設定",
    preferencesBody: "表示言語とテーマはこのブラウザに保存されます。ログイン中は、同じ内容をアカウントにも明示的に保存でき、別ブラウザやスマホでも引き継げます。",
    language: "表示言語",
    theme: "テーマ",
    browserSaved: "このブラウザに保存",
    syncFrameTitle: "今後保存できるようにする項目",
    syncFrameBody: "今後はツールごとの軽い設定も保存対象にできます。下書き、予定本文、画像、handoff payload は自動アップロードしません。",
    providerTitle: "YouTube連携",
    providerBody: "Comment Translator のYouTube連携状態は専用ページで確認できます。接続だけではバックグラウンド監視、ポーリング、AI翻訳、クォータ消費は開始しません。",
    boundaryItems: ["有料プラン契約状況の表示は後続対応", "YouTube連携管理", "tokenやprovider target値は画面に表示しない", "既存ローカルデータは自動移行しない"],
    manageIntegrations: "連携設定を開く",
    backToTools: "ツール一覧へ戻る"
  },
  en: {
    eyebrow: "Account settings",
    title: "Account and display settings",
    lead: "Language and theme work from this browser even when you are signed out. Sign in to carry the same settings across browsers and phones.",
    authSignedOut: "Signed out",
    authSignedIn: "Signed in",
    authUnavailable: "Account setup pending",
    authBody: "The first public account version only saves display settings. Drafts, schedule text, images, and handoff payloads are not uploaded automatically.",
    configMissing: "Account publishing settings are not ready.",
    signOut: "Sign out",
    signedInAs: "Signed-in email",
    remotePreferenceTitle: "Settings saved to your account",
    remotePreferenceEmpty: "No language or theme setting has been saved to the account yet.",
    remotePreferenceUnavailable: "Could not load the saved account settings.",
    saveLocalPreferences: "Save this browser's display settings to account",
    securityTitle: "Security",
    securityBody: "Password changes confirm the current password before saving a new password.",
    changePassword: "Change password",
    localSnapshotPending: "Checking browser settings",
    authMessages: {
      "signed-in": "Signed in.",
      "signed-out": "Signed out.",
      "preferences-saved": "Saved display settings to your account.",
      "sign-in-required": "Sign in before saving.",
      "local-preference-required": "Display settings were not found in this browser.",
      "supabase-env-missing": "Account publishing settings are not ready.",
      "confirm-link-invalid": "The sign-in confirmation link is invalid.",
      "confirm-error": "Could not confirm sign-in.",
      "password-updated": "Password updated.",
      "preference-save-error": "Could not save display settings. Please try again later."
    },
    openPlan: "Current account",
    planName: "Account status",
    planBody: "This version is limited to carrying language and theme across browsers and phones. Comment Translator YouTube integration management is available on its own page. Paid plan status is planned for later.",
    planItems: ["Save display settings", "Paid plan status later", "YouTube integration"],
    preferencesTitle: "Display settings",
    preferencesBody: "Language and theme are saved in this browser. Signed-in users can explicitly save the same values to the account and carry them across browsers and phones.",
    language: "Language",
    theme: "Theme",
    browserSaved: "Saved in this browser",
    syncFrameTitle: "Settings that can be saved later",
    syncFrameBody: "Later phases can add lightweight per-tool settings. Drafts, schedule text, images, and handoff payloads are not uploaded automatically.",
    providerTitle: "YouTube integration",
    providerBody: "YouTube integration state for Comment Translator is available on its own page. Connecting alone will not start background monitoring, polling, AI translation, or quota use.",
    boundaryItems: ["Paid plan status later", "YouTube integration management", "No token or provider target values in UI", "No automatic migration of local data"],
    manageIntegrations: "Open integrations",
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
  children
}: {
  label: string;
  children: ReactNode;
}) {
  const { locale } = useLocale();
  const copy = accountCopy[locale];

  return (
    <div className="grid gap-3 border-t border-border py-4 first:border-t-0 first:pt-0 last:pb-0 sm:grid-cols-[minmax(8rem,12rem)_minmax(0,1fr)] sm:items-center">
      <div>
        <p className="text-sm font-black text-foreground">{label}</p>
        <p className="mt-1 text-xs font-bold text-muted">{copy.browserSaved}</p>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        {children}
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
  const initialMessage = authMessage ? copy.authMessages[authMessage as keyof typeof copy.authMessages] : null;
  const [visibleMessage, setVisibleMessage] = useState<string | null>(initialMessage);
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
  const hiddenLocale = locale;
  const hiddenTheme = localSnapshot?.theme ?? "";
  const signedInEmail = authStatus.user?.email ?? authStatus.user?.id ?? "";

  useEffect(() => {
    setVisibleMessage(initialMessage);

    if (!initialMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setVisibleMessage(null);
      const url = new URL(window.location.href);
      if (url.searchParams.has("auth")) {
        url.searchParams.delete("auth");
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      }
    }, 4200);

    return () => window.clearTimeout(timeoutId);
  }, [initialMessage]);

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
      {visibleMessage ? (
        <div
          role="status"
          className="fixed right-4 top-20 z-50 max-w-[calc(100vw-2rem)] rounded-base border border-primary/30 bg-surface px-4 py-3 text-sm font-bold text-foreground shadow-soft"
        >
          {visibleMessage}
        </div>
      ) : null}

      <section className="border-b border-border pb-6">
        <p className="text-xs font-black uppercase tracking-widest text-primary-strong">{copy.eyebrow}</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl">{copy.title}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-muted sm:text-base">{copy.lead}</p>
      </section>

      <section>
        <div className="panel p-4 shadow-none sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-primary-strong">{copy.openPlan}</p>
              <h2 className="mt-2 text-xl font-black text-foreground">{copy.planName}</h2>
            </div>
            <StatusPill>{authStatusLabel}</StatusPill>
          </div>
          <p className="mt-4 text-sm leading-7 text-muted">{copy.planBody}</p>
          {isSignedIn && signedInEmail ? (
            <p className="mt-3 break-all text-xs font-bold text-muted">
              {copy.signedInAs}: <span className="text-foreground">{signedInEmail}</span>
            </p>
          ) : null}
          {authStatus.configStatus === "missing" ? (
            <p className="mt-3 text-xs font-bold leading-6 text-red-700 dark:text-red-300">{copy.configMissing}</p>
          ) : null}
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {copy.planItems.map((item) => (
              <div key={item} className="rounded-base border border-border bg-surface-muted/45 px-3 py-3 text-xs font-bold leading-5 text-foreground">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
        <div className="panel p-4 shadow-none sm:p-5">
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-widest text-primary-strong">{copy.preferencesTitle}</p>
            <h2 className="mt-2 text-xl font-black text-foreground">{copy.preferencesTitle}</h2>
            <p className="mt-3 text-sm leading-7 text-muted">{copy.preferencesBody}</p>
          </div>
          <PreferenceRow label={copy.language}>
            <LanguageSwitch />
          </PreferenceRow>
          <PreferenceRow label={copy.theme}>
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
                  {copy.language}: <span className="font-bold text-foreground">{authStatus.remotePreferences.locale ?? "-"}</span>
                </p>
                <p>
                  {copy.theme}: <span className="font-bold text-foreground">{authStatus.remotePreferences.theme ?? "-"}</span>
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
            <h2 className="text-base font-black text-foreground">{copy.securityTitle}</h2>
            <p className="mt-3 text-sm leading-7 text-muted">{copy.securityBody}</p>
            <Link
              href="/account/security"
              className="mt-4 inline-flex rounded-base border border-border bg-surface px-4 py-2 text-sm font-bold text-foreground transition hover:border-primary hover:bg-primary-soft"
            >
              {copy.changePassword}
            </Link>
          </div>
          <div className="panel p-4 shadow-none sm:p-5">
            <h2 className="text-base font-black text-foreground">{copy.syncFrameTitle}</h2>
            <p className="mt-3 text-sm leading-7 text-muted">{copy.syncFrameBody}</p>
          </div>
          <div className="panel p-4 shadow-none sm:p-5">
            <h2 className="text-base font-black text-foreground">{copy.providerTitle}</h2>
            <p className="mt-3 text-sm leading-7 text-muted">{copy.providerBody}</p>
            <ul className="mt-3 space-y-2">
              {copy.boundaryItems.map((item) => (
                <li key={item} className="flex gap-2 text-sm font-bold leading-6 text-foreground">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/account/integrations"
              className="mt-4 inline-flex rounded-base border border-border bg-surface px-4 py-2 text-sm font-bold text-foreground transition hover:border-primary hover:bg-primary-soft"
            >
              {copy.manageIntegrations}
            </Link>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/tools" className="inline-flex rounded-base border border-border bg-surface px-4 py-2 text-sm font-bold text-foreground transition hover:border-primary hover:bg-primary-soft">
          {copy.backToTools}
        </Link>
        {isSignedIn ? (
          <form action={signOutAction} className="flex justify-end">
            <button className="rounded-base border border-border bg-surface px-4 py-2 text-sm font-bold text-foreground transition hover:border-primary hover:bg-primary-soft">
              {copy.signOut}
            </button>
          </form>
        ) : (
          <Link href="/login?next=/account" className="inline-flex rounded-base bg-primary px-4 py-2 text-sm font-black text-white transition hover:bg-primary-strong">
            {locale === "ja" ? "ログイン / 登録" : "Log in / Sign up"}
          </Link>
        )}
      </div>
    </div>
  );
}
