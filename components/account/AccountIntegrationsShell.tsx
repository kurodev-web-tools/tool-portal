"use client";

import Link from "next/link";
import { useLocale } from "@/components/portal/LocaleProvider";
import type { YouTubeAccountIntegrationViewModel } from "@/lib/comment-translator-youtube-account-integration";
import type { AccountSessionState } from "@/lib/supabase/session";

type AccountFormAction = (formData: FormData) => void | Promise<void>;

const integrationsCopy = {
  ja: {
    eyebrow: "アカウント連携",
    title: "外部サービス連携",
    lead: "Comment Translator で使うYouTube連携状態を、翻訳ツールの外側で確認できます。Start が使えない場合は、この画面で接続または再接続を確認してください。",
    signedInAs: "ログイン中のメールアドレス",
    youtubeTitle: "YouTube integration",
    youtubeBody:
      "YouTube接続は、明示的な翻訳セッション開始前の準備です。接続だけではバックグラウンド監視、ポーリング、AI翻訳、クォータ消費は開始しません。",
    statusLabel: "接続状態",
    readinessLabel: "準備状態",
    scopeLabel: "権限範囲",
    boundaryTitle: "表示しない情報",
    boundaryBody:
      "この画面ではtoken、owner id、provider channel id、liveChatId、authorization header、service role key、secret値、provider target metadataを表示・保存しません。",
    providerRoutingTitle: "翻訳provider方針",
    providerRoutingBody:
      "翻訳providerの切り替えは後続のserver-side Free/Paid policyで決まります。この画面でAzure、OpenAI mini、fallback providerは選択しません。",
    status: {
      "not-connected": "未接続",
      ready: "接続済み",
      "reconnect-required": "再接続が必要",
      unavailable: "確認できません"
    },
    readiness: {
      "not-connected": "YouTube接続を開始できます。",
      ready: "翻訳セッション開始時にserver-only境界で接続状態を再確認します。",
      "reconnect-required": "再接続が必要です。",
      unavailable: "安全な接続状態だけを表示しています。時間をおいて再確認してください。"
    },
    connect: "YouTubeを接続",
    reconnect: "再接続",
    disconnect: "切断",
    unavailableAction: "後続runtimeで有効化",
    actionNote:
      "このPRの操作はentry pointとaction boundaryの準備までです。OAuth開始、token更新、provider実行、切断runtimeはまだ実行しません。",
    authMessages: {
      "youtube-connect-prepared": "YouTube接続の開始操作は後続runtimeで有効化します。この操作ではprovider接続や監視は開始していません。",
      "youtube-reconnect-prepared": "YouTube再接続の操作は後続runtimeで有効化します。この操作ではtoken更新やprovider接続は実行していません。",
      "youtube-disconnect-prepared": "YouTube切断の操作は後続runtimeで有効化します。この操作ではrevocationやprovider通信は実行していません。"
    },
    backToAccount: "アカウント設定へ戻る",
    openTranslator: "翻訳ツールを開く"
  },
  en: {
    eyebrow: "Account integrations",
    title: "External service integrations",
    lead: "Review the YouTube integration state used by Comment Translator outside the translation tool. If Start is unavailable, use this screen to connect or reconnect YouTube.",
    signedInAs: "Signed-in email",
    youtubeTitle: "YouTube integration",
    youtubeBody:
      "A YouTube connection prepares the account for an explicit translation session. Connecting alone does not start background monitoring, polling, AI translation, or quota use.",
    statusLabel: "Connection status",
    readinessLabel: "Readiness",
    scopeLabel: "Scope",
    boundaryTitle: "Not displayed",
    boundaryBody:
      "This screen does not display or store token, owner id, provider channel id, liveChatId, authorization header, service role key, secret value, or provider target metadata.",
    providerRoutingTitle: "Translation provider policy",
    providerRoutingBody:
      "Translation provider routing is decided later by server-side Free/Paid policy. This screen does not choose Azure, OpenAI mini, or fallback providers.",
    status: {
      "not-connected": "Not connected",
      ready: "Connected",
      "reconnect-required": "Reconnect required",
      unavailable: "Unavailable"
    },
    readiness: {
      "not-connected": "You can start the YouTube connection flow.",
      ready: "The server-only boundary will recheck the connection when a translation session starts.",
      "reconnect-required": "Reconnect is required.",
      unavailable: "Only safe connection state is shown. Try again later."
    },
    connect: "Connect YouTube",
    reconnect: "Reconnect",
    disconnect: "Disconnect",
    unavailableAction: "Enabled by later runtime",
    actionNote:
      "This PR prepares the entry point and action boundary only. It does not run OAuth start, token renewal, provider execution, or disconnect runtime.",
    authMessages: {
      "youtube-connect-prepared": "The YouTube connect action is prepared for later runtime. This did not connect to a provider or start monitoring.",
      "youtube-reconnect-prepared": "The YouTube reconnect action is prepared for later runtime. This did not refresh tokens or connect to a provider.",
      "youtube-disconnect-prepared": "The YouTube disconnect action is prepared for later runtime. This did not revoke credentials or contact a provider."
    },
    backToAccount: "Back to account",
    openTranslator: "Open translator"
  }
} as const;

function StatusPill({ children }: { children: string }) {
  return (
    <span className="inline-flex rounded-base border border-border bg-surface-muted px-2.5 py-1 text-xs font-bold text-muted">
      {children}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 gap-1 border-t border-border py-3 first:border-t-0 sm:grid-cols-[minmax(8rem,12rem)_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm font-black text-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-sm font-semibold leading-6 text-muted">{value}</dd>
    </div>
  );
}

function ActionButton({
  action,
  children,
  disabled,
  variant = "secondary"
}: {
  action: AccountFormAction;
  children: string;
  disabled: boolean;
  variant?: "primary" | "secondary" | "danger";
}) {
  const className =
    variant === "primary"
      ? "border-primary bg-primary text-white hover:bg-primary-strong"
      : variant === "danger"
        ? "border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100"
        : "border-border bg-surface text-foreground hover:border-primary hover:bg-primary-soft";

  return (
    <form action={action} className="min-w-0">
      <button
        disabled={disabled}
        className={[
          "min-h-10 w-full rounded-base border px-4 py-2 text-sm font-black transition disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-muted disabled:text-muted",
          className
        ].join(" ")}
      >
        {children}
      </button>
    </form>
  );
}

export function AccountIntegrationsShell({
  accountStatus,
  integrationMessage,
  youtubeIntegration,
  startYouTubeConnectAction,
  reconnectYouTubeAction,
  disconnectYouTubeAction
}: {
  accountStatus: AccountSessionState;
  integrationMessage: string | null;
  youtubeIntegration: YouTubeAccountIntegrationViewModel;
  startYouTubeConnectAction: AccountFormAction;
  reconnectYouTubeAction: AccountFormAction;
  disconnectYouTubeAction: AccountFormAction;
}) {
  const { locale } = useLocale();
  const copy = integrationsCopy[locale];
  const message = integrationMessage ? copy.authMessages[integrationMessage as keyof typeof copy.authMessages] : null;
  const signedInEmail = accountStatus.user?.email ?? null;
  const statusLabel = copy.status[youtubeIntegration.status];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      {message ? (
        <div
          role="status"
          className="fixed right-4 top-20 z-50 max-w-[calc(100vw-2rem)] rounded-base border border-primary/30 bg-surface px-4 py-3 text-sm font-bold text-foreground shadow-soft"
        >
          {message}
        </div>
      ) : null}

      <section className="border-b border-border pb-6">
        <p className="text-xs font-black uppercase tracking-widest text-primary-strong">{copy.eyebrow}</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl">{copy.title}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-muted sm:text-base">{copy.lead}</p>
        {signedInEmail ? (
          <p className="mt-3 break-all text-xs font-bold text-muted">
            {copy.signedInAs}: <span className="text-foreground">{signedInEmail}</span>
          </p>
        ) : null}
      </section>

      <section data-account-integrations="youtube-sanitized-status" className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
        <div className="panel p-4 shadow-none sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-widest text-primary-strong">YouTube</p>
              <h2 className="mt-2 text-xl font-black text-foreground">{copy.youtubeTitle}</h2>
            </div>
            <StatusPill>{statusLabel}</StatusPill>
          </div>
          <p className="mt-4 text-sm leading-7 text-muted">{copy.youtubeBody}</p>
          <p className="mt-3 rounded-base border border-border bg-surface-muted/45 px-3 py-2 text-xs font-semibold leading-5 text-muted">
            {copy.providerRoutingBody}
          </p>
          <dl className="mt-5 grid gap-0">
            <DetailRow label={copy.statusLabel} value={statusLabel} />
            <DetailRow label={copy.readinessLabel} value={copy.readiness[youtubeIntegration.status]} />
            <DetailRow label={copy.scopeLabel} value={youtubeIntegration.scopeLabel} />
          </dl>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <ActionButton action={startYouTubeConnectAction} disabled={!youtubeIntegration.canConnect} variant="primary">
              {youtubeIntegration.canConnect ? copy.connect : copy.unavailableAction}
            </ActionButton>
            <ActionButton action={reconnectYouTubeAction} disabled={!youtubeIntegration.canReconnect}>
              {copy.reconnect}
            </ActionButton>
            <ActionButton action={disconnectYouTubeAction} disabled={!youtubeIntegration.canDisconnect} variant="danger">
              {copy.disconnect}
            </ActionButton>
          </div>
          <p className="mt-3 text-xs font-semibold leading-5 text-muted">{copy.actionNote}</p>
        </div>

        <aside className="panel p-4 shadow-none sm:p-5">
          <h2 className="text-base font-black text-foreground">{copy.boundaryTitle}</h2>
          <p className="mt-3 text-sm leading-7 text-muted">{copy.boundaryBody}</p>
          <h3 className="mt-5 text-sm font-black text-foreground">{copy.providerRoutingTitle}</h3>
          <p className="mt-2 text-sm leading-7 text-muted">{copy.providerRoutingBody}</p>
        </aside>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/account" className="inline-flex rounded-base border border-border bg-surface px-4 py-2 text-sm font-bold text-foreground transition hover:border-primary hover:bg-primary-soft">
          {copy.backToAccount}
        </Link>
        <Link href="/tools/comment-translator" className="inline-flex rounded-base bg-primary px-4 py-2 text-sm font-black text-white transition hover:bg-primary-strong">
          {copy.openTranslator}
        </Link>
      </div>
    </div>
  );
}
