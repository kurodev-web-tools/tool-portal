"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { LanguageSwitch } from "@/components/portal/LanguageSwitch";
import { useLocale } from "@/components/portal/LocaleProvider";
import { ThemeToggle } from "@/components/portal/ThemeToggle";
import { TimeZoneSelect } from "@/components/portal/TimeZoneSelect";
import type { CommentTranslatorBillingBrowserSafeViewModel } from "@/lib/comment-translator-billing-runtime";
import type { YouTubeAccountIntegrationViewModel } from "@/lib/comment-translator-youtube-account-integration";
import {
  localPreferenceStorageKeys,
  readLocalPreferenceSnapshot,
  themePreferenceChangeEvent,
  themePreferenceStorageKey,
  timeZonePreferenceChangeEvent,
  timeZonePreferenceStorageKey,
  type ThemePreference
} from "@/lib/local-preferences";
import type { Locale } from "@/lib/locale";
import type { AccountSessionBrowserSafeViewModel } from "@/lib/supabase/session";

type AccountFormAction = (formData: FormData) => void | Promise<void>;

const accountCopy = {
  ja: {
    eyebrow: "アカウント設定",
    title: "アカウントと表示設定",
    lead: "表示言語、テーマ、タイムゾーンは未ログインでもこのブラウザで使えます。ログインすると、同じ設定を別ブラウザやスマホでも引き継げます。",
    accountStatusEyebrow: "Current account",
    accountStatusTitle: "現在のアカウント状況",
    accountStatusBody: "ログイン、YouTube連携、プラン状態をまとめて確認します。",
    signedInAccount: "ログイン中のアカウント",
    youtubeIntegration: "YouTube連携",
    currentPlan: "現在のプラン",
    status: {
      signedIn: "Signed in",
      signedOut: "Signed out",
      unavailable: "Unavailable",
      connected: "接続済み",
      disconnected: "未接続",
      "reconnect-required": "再接続が必要",
      error: "確認エラー",
      free: "Free",
      "paid-active": "Paid Core v1 unavailable",
      "paid-inactive": "Paid Core v1 unavailable"
    },
    accountUnavailable: "確認できません",
    settingsEyebrow: "Settings",
    settingsTitle: "設定",
    displaySettings: "表示設定",
    authSignedOut: "未ログイン",
    authSignedIn: "ログイン中",
    authUnavailable: "アカウント設定待ち",
    authBody: "初期公開版では、表示設定の保存だけを小さく扱います。下書き、予定本文、画像、handoff payload は自動アップロードしません。",
    configMissing: "アカウント機能の公開設定が未完了です。",
    signOut: "ログアウト",
    signedInAs: "ログイン中のメールアドレス",
    remotePreferenceTitle: "アカウントに保存済みの設定",
    remotePreferenceEmpty: "アカウントにはまだ表示言語、テーマ、タイムゾーンが保存されていません。",
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
      "preferences-saved-timezone-pending": "表示言語とテーマをアカウントに保存しました。タイムゾーンの共有保存はデータベース更新後に有効になります。",
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
    planBody: "表示言語、テーマ、タイムゾーンを別ブラウザやスマホでも引き継げます。Comment Translator のYouTube連携管理と Free / Paid Core v1 unavailable の状態は専用ページで確認できます。",
    planItems: ["表示設定を保存", "Free / Paid Core v1 unavailable", "YouTube連携管理"],
    preferencesTitle: "表示設定",
    preferencesBody: "表示言語、テーマ、タイムゾーンはこのブラウザに保存されます。ログイン中は、同じ内容をアカウントにも明示的に保存でき、別ブラウザやスマホでも引き継げます。",
    language: "表示言語",
    theme: "テーマ",
    timeZone: "タイムゾーン",
    browserSaved: "このブラウザに保存",
    syncFrameTitle: "今後保存できるようにする項目",
    syncFrameBody: "今後はツールごとの軽い設定も保存対象にできます。下書き、予定本文、画像、handoff payload は自動アップロードしません。",
    providerTitle: "YouTube連携",
    providerBody: "Comment Translator のYouTube連携状態は専用ページで確認できます。接続だけではバックグラウンド監視、ポーリング、AI翻訳、クォータ消費は開始しません。",
    boundaryItems: ["Free は常に利用可能", "YouTube連携管理", "tokenやprovider target値は画面に表示しない", "既存ローカルデータは自動移行しない"],
    manageBilling: "FreeとPaid Core v1状態を開く",
    manageIntegrations: "連携設定を開く",
    backToTools: "ツール一覧へ戻る",
    openSecurity: "パスワード変更"
  },
  en: {
    eyebrow: "Account settings",
    title: "Account and display settings",
    lead: "Language, theme, and time zone work from this browser even when you are signed out. Sign in to carry the same settings across browsers and phones.",
    accountStatusEyebrow: "Current account",
    accountStatusTitle: "Current account status",
    accountStatusBody: "Review sign-in, YouTube integration, and plan status together.",
    signedInAccount: "Signed-in account",
    youtubeIntegration: "YouTube integration",
    currentPlan: "Current plan",
    status: {
      signedIn: "Signed in",
      signedOut: "Signed out",
      unavailable: "Unavailable",
      connected: "Connected",
      disconnected: "Disconnected",
      "reconnect-required": "Reconnect required",
      error: "Check failed",
      free: "Free",
      "paid-active": "Paid Core v1 unavailable",
      "paid-inactive": "Paid Core v1 unavailable"
    },
    accountUnavailable: "Unavailable",
    settingsEyebrow: "Settings",
    settingsTitle: "Settings",
    displaySettings: "Display settings",
    authSignedOut: "Signed out",
    authSignedIn: "Signed in",
    authUnavailable: "Account setup pending",
    authBody: "The first public account version only saves display settings. Drafts, schedule text, images, and handoff payloads are not uploaded automatically.",
    configMissing: "Account publishing settings are not ready.",
    signOut: "Sign out",
    signedInAs: "Signed-in email",
    remotePreferenceTitle: "Settings saved to your account",
    remotePreferenceEmpty: "No language, theme, or time zone setting has been saved to the account yet.",
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
      "preferences-saved-timezone-pending": "Saved language and theme to your account. Shared time zone saving will become available after the database update.",
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
    planBody: "Language, theme, and time zone can be carried across browsers and phones. Comment Translator YouTube integration management and Free / Paid Core v1 unavailable status are available on dedicated pages.",
    planItems: ["Save display settings", "Free / Paid Core v1 unavailable", "YouTube integration"],
    preferencesTitle: "Display settings",
    preferencesBody: "Language, theme, and time zone are saved in this browser. Signed-in users can explicitly save the same values to the account and carry them across browsers and phones.",
    language: "Language",
    theme: "Theme",
    timeZone: "Time zone",
    browserSaved: "Saved in this browser",
    syncFrameTitle: "Settings that can be saved later",
    syncFrameBody: "Later phases can add lightweight per-tool settings. Drafts, schedule text, images, and handoff payloads are not uploaded automatically.",
    providerTitle: "YouTube integration",
    providerBody: "YouTube integration state for Comment Translator is available on its own page. Connecting alone will not start background monitoring, polling, AI translation, or quota use.",
    boundaryItems: ["Free remains available", "YouTube integration management", "No token or provider target values in UI", "No automatic migration of local data"],
    manageBilling: "Open Free and Paid Core v1 status",
    manageIntegrations: "Open integrations",
    backToTools: "Back to tools",
    openSecurity: "Change password"
  }
} as const;

function StatusPill({ children, muted = false }: { children: string; muted?: boolean }) {
  return (
    <span
      className={[
        "inline-flex rounded-base border px-2.5 py-1 text-xs font-black",
        muted
          ? "border-border bg-surface-muted/45 text-muted"
          : "border-primary/30 bg-primary-soft/35 text-primary-strong"
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function StatusTile({
  label,
  value,
  status
}: {
  label: string;
  value: string;
  status: string;
}) {
  return (
    <div className="rounded-base border border-border bg-surface px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-xs font-black text-primary-strong">{label}</p>
        <StatusPill muted>{status}</StatusPill>
      </div>
      <p className="mt-3 break-words text-lg font-black text-foreground">{value}</p>
    </div>
  );
}

function SettingControlRow({
  label,
  helper,
  children
}: {
  label: string;
  helper: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div>
        <p className="text-sm font-black text-foreground">{label}</p>
        <p className="mt-1 text-xs font-semibold text-muted">{helper}</p>
      </div>
      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

function SettingsItem({
  title,
  body,
  action,
  href
}: {
  title: string;
  body: string;
  action: string;
  href: string;
}) {
  return (
    <div className="grid gap-3 border-t border-border py-4 first:border-t-0 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-center">
      <div className="min-w-0">
        <h3 className="text-sm font-black text-foreground">{title}</h3>
        <p className="mt-1 text-sm font-semibold leading-6 text-muted">{body}</p>
      </div>
      <Link
        href={href}
        className="inline-flex min-h-10 items-center justify-center rounded-base border border-border bg-surface px-4 py-2 text-sm font-bold text-foreground transition hover:border-primary hover:bg-primary-soft"
      >
        {action}
      </Link>
    </div>
  );
}

export function AccountPreferencesShell({
  authMessage,
  authStatus,
  youtubeIntegration,
  billing,
  saveLocaleThemePreferenceAction,
  signOutAction
}: {
  authMessage: string | null;
  authStatus: AccountSessionBrowserSafeViewModel;
  youtubeIntegration: YouTubeAccountIntegrationViewModel;
  billing: CommentTranslatorBillingBrowserSafeViewModel;
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
    timeZone: string | null;
  } | null>(null);
  const isSignedIn = authStatus.authStatus === "signed-in";
  const hiddenLocale = locale;
  const hiddenTheme = localSnapshot?.theme ?? "";
  const hiddenTimeZone = localSnapshot?.timeZone ?? "";
  const signedInEmail = authStatus.user?.email ?? "";
  const youtubeStatusLabel = copy.status[youtubeIntegration.status];
  const billingStatusLabel = copy.status[billing.billingState];
  const accountStatusItems = [
    {
      label: copy.signedInAccount,
      value: signedInEmail || copy.accountUnavailable,
      status: isSignedIn ? copy.status.signedIn : authStatus.authStatus === "signed-out" ? copy.status.signedOut : copy.status.unavailable
    },
    {
      label: copy.youtubeIntegration,
      value: youtubeStatusLabel,
      status: youtubeStatusLabel
    },
    {
      label: copy.currentPlan,
      value: billingStatusLabel,
      status: billing.billingState === "paid-active" ? copy.status["paid-active"] : copy.status.free
    }
  ];
  const settingsItems = [
    {
      title: copy.youtubeIntegration,
      body: copy.providerBody,
      action: copy.manageIntegrations,
      href: "/account/integrations"
    },
    {
      title: "Free / Paid Core v1 unavailable",
      body: locale === "ja" ? "Free の利用上限と、Paid Core v1 の明示的な利用不可状態を確認します。" : "Review Free limits and the explicit Paid Core v1 unavailable state.",
      action: copy.manageBilling,
      href: "/account/billing"
    },
    {
      title: copy.securityTitle,
      body: locale === "ja" ? "パスワードとログイン状態を管理します。" : "Manage password and sign-in state.",
      action: copy.openSecurity,
      href: "/account/security"
    }
  ];

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
        theme: snapshot.theme,
        timeZone: snapshot.timeZone
      });
    }

    function handleStorage(event: StorageEvent) {
      if (
        event.key === themePreferenceStorageKey ||
        event.key === timeZonePreferenceStorageKey ||
        event.key === localPreferenceStorageKeys.locale
      ) {
        refreshLocalSnapshot();
      }
    }

    refreshLocalSnapshot();
    window.addEventListener(themePreferenceChangeEvent, refreshLocalSnapshot);
    window.addEventListener(timeZonePreferenceChangeEvent, refreshLocalSnapshot);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(themePreferenceChangeEvent, refreshLocalSnapshot);
      window.removeEventListener(timeZonePreferenceChangeEvent, refreshLocalSnapshot);
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

      <section className="panel p-4 shadow-none sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-widest text-primary-strong">{copy.accountStatusEyebrow}</p>
            <h1 className="mt-2 text-xl font-black text-foreground">{copy.accountStatusTitle}</h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-muted">{copy.accountStatusBody}</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link
              href="/tools"
              className="inline-flex min-h-9 items-center justify-center rounded-base border border-border bg-surface px-3 py-2 text-sm font-bold text-foreground transition hover:border-primary hover:bg-primary-soft"
            >
              {copy.backToTools}
            </Link>
            {isSignedIn ? (
              <form action={signOutAction} className="flex justify-end">
                <button className="inline-flex min-h-9 items-center justify-center rounded-base border border-border bg-surface px-3 py-2 text-sm font-bold text-foreground transition hover:border-primary hover:bg-primary-soft">
                  {copy.signOut}
                </button>
              </form>
            ) : (
              <Link href="/login?next=/account" className="inline-flex min-h-9 items-center justify-center rounded-base bg-primary px-3 py-2 text-sm font-black text-white transition hover:bg-primary-strong">
                {locale === "ja" ? "ログイン / 登録" : "Log in / Sign up"}
              </Link>
            )}
          </div>
        </div>
        {authStatus.configStatus === "missing" ? (
          <p className="mt-3 text-xs font-bold leading-6 text-red-700 dark:text-red-300">{copy.configMissing}</p>
        ) : null}
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {accountStatusItems.map((item) => (
            <StatusTile key={item.label} {...item} />
          ))}
        </div>
      </section>

      <section className="grid gap-4">
        <div id="display-settings" className="panel p-4 shadow-none sm:p-5">
          <div className="mb-1">
            <p className="text-xs font-black uppercase tracking-widest text-primary-strong">{copy.settingsEyebrow}</p>
            <h2 className="mt-2 text-xl font-black text-foreground">{copy.settingsTitle}</h2>
          </div>
          <div className="mt-4 grid gap-0">
            <form action={saveLocaleThemePreferenceAction} className="py-4 first:pt-0">
              <input name="locale" type="hidden" value={hiddenLocale} />
              <input name="theme" type="hidden" value={hiddenTheme} />
              <input name="timeZone" type="hidden" value={hiddenTimeZone} />
              <div className="grid min-w-0 gap-4 rounded-base border border-border bg-surface px-4 py-3 sm:grid-cols-3">
                <SettingControlRow label={copy.language} helper={copy.browserSaved}>
                  <LanguageSwitch />
                </SettingControlRow>
                <SettingControlRow label={copy.theme} helper={copy.browserSaved}>
                  <ThemeToggle variant="segmented" />
                </SettingControlRow>
                <SettingControlRow label={copy.timeZone} helper={copy.browserSaved}>
                  <TimeZoneSelect />
                </SettingControlRow>
                <div className="border-t border-border pt-3 sm:col-span-3">
                  <button
                    disabled={!isSignedIn || !hiddenLocale || !hiddenTheme || !hiddenTimeZone}
                    className="rounded-base bg-primary px-4 py-2 text-sm font-black text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted"
                  >
                    {localSnapshot ? copy.saveLocalPreferences : copy.localSnapshotPending}
                  </button>
                </div>
              </div>
            </form>
            {settingsItems.map((item) => (
              <SettingsItem key={item.title} {...item} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
