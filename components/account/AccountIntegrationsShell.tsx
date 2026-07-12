"use client";

import Link from "next/link";
import { useLocale } from "@/components/portal/LocaleProvider";
import type { YouTubeAccountIntegrationViewModel } from "@/lib/comment-translator-youtube-account-integration";
import type { AccountSessionBrowserSafeViewModel } from "@/lib/supabase/session";

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
    nextStepLabel: "次の操作",
    scopeLabel: "権限範囲",
    boundaryTitle: "表示しない情報",
    boundaryBody:
      "この画面ではtoken、owner id、provider channel id、liveChatId、authorization header、service role key、secret値、provider target metadataを表示・保存しません。",
    providerRoutingTitle: "翻訳provider方針",
    providerRoutingBody:
      "翻訳providerの切り替えは後続のserver-side Free/Paid policyで決まります。この画面でAzure、OpenAI mini、fallback providerは選択しません。",
    status: {
      connected: "接続済み",
      disconnected: "未接続",
      "reconnect-required": "再接続が必要",
      unavailable: "確認できません",
      error: "状態確認エラー"
    },
    readiness: {
      connected: "翻訳セッション開始時にserver-only境界で接続状態を再確認します。",
      disconnected: "YouTube接続を開始できます。",
      "reconnect-required": "再接続が必要です。",
      unavailable: "安全な接続状態だけを表示しています。設定が有効になるまで操作はfail closedします。",
      error: "接続状態の確認に失敗しました。tokenやprovider情報は表示せず、再確認できる状態だけを返しています。"
    },
    nextStep: {
      connected: "接続済みです。翻訳ツールを開き、ポーリングと翻訳を始めたい時だけ Start してください。",
      disconnected: "未接続です。この画面で YouTube を接続できます。接続だけではバックグラウンド監視は開始しません。",
      "reconnect-required": "安全に利用できない接続状態です。セッション開始前に YouTube を再接続してください。",
      unavailable: "server-only 設定が有効になるまで操作は fail closed します。",
      error: "状態確認に失敗しています。機密値を出さず、再確認または再接続だけを案内します。"
    },
    connect: "YouTubeを接続",
    reconnect: "再接続",
    disconnect: "切断",
    actionNote:
      "接続状態はtrusted credential statusからsanitized表示します。切断は既存のserver-only credential invalidationだけを使い、provider revokeやlive APIは実行しません。",
    authMessages: {
      "youtube-oauth-connected": "YouTube接続状態を更新しました。接続だけでは監視、ポーリング、AI翻訳、クォータ消費は開始しません。",
      "youtube-oauth-disabled": "YouTube credential resolution は現在無効化されています。安全のため接続状態の利用を停止しています。",
      "youtube-oauth-env-missing": "YouTube連携に必要なserver-only設定が未準備です。secret値はこの画面に表示しません。",
      "youtube-oauth-sign-in-required": "YouTube連携の操作にはログインが必要です。",
      "youtube-oauth-private-launch-gated": "YouTube連携はprivate launch gateで制限されています。",
      "youtube-oauth-start-unavailable": "YouTube接続開始に必要なserver-only設定が未準備です。",
      "youtube-oauth-state-unavailable": "YouTube接続のstate作成に失敗しました。OAuth値は保存していません。",
      "youtube-oauth-callback-error": "YouTube OAuth callback を安全に完了できませんでした。",
      "youtube-oauth-token-exchange-failed": "YouTube OAuth token exchange を安全に完了できませんでした。",
      "youtube-oauth-persistence-unavailable": "YouTube credential store が未準備です。",
      "youtube-oauth-persistence-failed": "YouTube credential store の更新に失敗しました。",
      "youtube-disconnect-disconnected": "YouTube credential reference をserver-only境界で切断しました。provider revokeは実行していません。",
      "youtube-disconnect-already-disconnected": "YouTube credential reference はすでに切断済みです。",
      "youtube-disconnect-unavailable": "YouTube切断は現在利用できません。credential値やprovider情報は表示していません。",
      "youtube-disconnect-failed": "YouTube切断処理に失敗しました。credential値やprovider応答は表示していません。"
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
    nextStepLabel: "Next action",
    scopeLabel: "Scope",
    boundaryTitle: "Not displayed",
    boundaryBody:
      "This screen does not display or store token, owner id, provider channel id, liveChatId, authorization header, service role key, secret value, or provider target metadata.",
    providerRoutingTitle: "Translation provider policy",
    providerRoutingBody:
      "Translation provider routing is decided later by server-side Free/Paid policy. This screen does not choose Azure, OpenAI mini, or fallback providers.",
    status: {
      connected: "Connected",
      disconnected: "Disconnected",
      "reconnect-required": "Reconnect required",
      unavailable: "Connection status unavailable",
      error: "Connection status check failed"
    },
    readiness: {
      connected: "The server-only boundary will recheck the connection when a translation session starts.",
      disconnected: "You can start the YouTube connection flow.",
      "reconnect-required": "Reconnect is required.",
      unavailable: "Only safe connection state is shown. Actions fail closed until the server-only setup is ready.",
      error: "The trusted status check failed. Token and provider details are not displayed."
    },
    nextStep: {
      connected: "Connection is ready. Open the translator and press Start only when you want polling and translation to begin.",
      disconnected: "YouTube is disconnected. Connect YouTube here; no background monitoring starts from connection alone.",
      "reconnect-required": "Connection cannot be used safely yet. Reconnect YouTube before starting a session.",
      unavailable: "Actions fail closed until the server-only setup is ready.",
      error: "Status cannot be trusted yet. Recheck or reconnect without exposing credential values."
    },
    connect: "Connect YouTube",
    reconnect: "Reconnect",
    disconnect: "Disconnect",
    actionNote:
      "Status is read from trusted credential status and shown as sanitized copy. Disconnect only invalidates the existing server-only credential reference; it does not run provider revoke or live APIs.",
    authMessages: {
      "youtube-oauth-connected": "YouTube connection status was updated. Connecting alone does not start monitoring, polling, AI translation, or quota use.",
      "youtube-oauth-disabled": "YouTube credential resolution is currently disabled. Connection use fails closed.",
      "youtube-oauth-env-missing": "Required server-only YouTube integration settings are not ready. Secret values are not displayed here.",
      "youtube-oauth-sign-in-required": "Sign in is required to manage YouTube integration.",
      "youtube-oauth-private-launch-gated": "YouTube integration is limited by the private launch gate.",
      "youtube-oauth-start-unavailable": "Server-only settings required to start YouTube connection are not ready.",
      "youtube-oauth-state-unavailable": "The YouTube connection state could not be created safely. OAuth values were not stored.",
      "youtube-oauth-callback-error": "The YouTube OAuth callback could not be completed safely.",
      "youtube-oauth-token-exchange-failed": "The YouTube OAuth token exchange could not be completed safely.",
      "youtube-oauth-persistence-unavailable": "The YouTube credential store is not ready.",
      "youtube-oauth-persistence-failed": "The YouTube credential store update failed.",
      "youtube-disconnect-disconnected": "The YouTube credential reference was disconnected through the server-only boundary. Provider revoke was not run.",
      "youtube-disconnect-already-disconnected": "The YouTube credential reference was already disconnected.",
      "youtube-disconnect-unavailable": "YouTube disconnect is currently unavailable. Credential values and provider details are not displayed.",
      "youtube-disconnect-failed": "YouTube disconnect failed. Credential values and provider responses are not displayed."
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
  accountStatus: AccountSessionBrowserSafeViewModel;
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
            <DetailRow label={copy.nextStepLabel} value={copy.nextStep[youtubeIntegration.status]} />
            <DetailRow label={copy.scopeLabel} value={youtubeIntegration.scopeLabel} />
          </dl>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <ActionButton action={startYouTubeConnectAction} disabled={!youtubeIntegration.canConnect} variant="primary">
              {copy.connect}
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
