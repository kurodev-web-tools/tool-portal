"use client";

import Link from "next/link";
import { useLocale } from "@/components/portal/LocaleProvider";
import type { CommentTranslatorBillingBrowserSafeViewModel } from "@/lib/comment-translator-billing-runtime";
import type { AccountSessionState } from "@/lib/supabase/session";

type AccountFormAction = (formData: FormData) => void | Promise<void>;

const billingCopy = {
  ja: {
    eyebrow: "Comment Translator billing",
    title: "Free / Paid プラン",
    lead: "Free は常に利用できます。Paid は Stripe Checkout と署名付き webhook で反映し、支払い失敗・期限切れ・キャンセル時は Free または inactive paid として安全に扱います。",
    signedInAs: "ログイン中のメールアドレス",
    currentPlan: "現在のプラン",
    freePlan: "Free",
    paidPlan: "Paid",
    paidInactive: "Paid inactive",
    dailyLimit: "1日の上限",
    sessionLimit: "1セッション上限",
    messageLimit: "翻訳メッセージ/分",
    freeAvailable: "Free は常に利用可能",
    checkout: "Paid にアップグレード",
    manage: "支払いを管理",
    checkoutUnavailable: "決済設定の準備中",
    portalUnavailable: "Paid 管理は契約反映後に利用できます",
    safeBoundary:
      "この画面は Stripe secret、webhook secret、token、owner id、provider channel id、liveChatId、Authorization header、provider target metadata を表示・保存しません。",
    messages: {
      "checkout-returned": "Checkout から戻りました。契約状態は webhook 反映後に更新されます。",
      "checkout-canceled": "Checkout はキャンセルされました。Free は引き続き利用できます。",
      "portal-returned": "Billing Portal から戻りました。",
      "caller-not-authenticated": "Billing 操作にはログインが必要です。",
      "missing-config": "Stripe のサーバー設定がまだ揃っていません。",
      "missing-customer": "管理対象の Stripe customer がまだありません。",
      "stripe-session-url-missing": "Stripe セッション URL を取得できませんでした。"
    },
    backToAccount: "アカウント設定へ戻る",
    openTranslator: "翻訳ツールを開く"
  },
  en: {
    eyebrow: "Comment Translator billing",
    title: "Free / Paid plan",
    lead: "Free remains permanently available. Paid status is synced through Stripe Checkout and signed webhooks; failed, expired, or canceled payment states degrade to Free or inactive paid safely.",
    signedInAs: "Signed-in email",
    currentPlan: "Current plan",
    freePlan: "Free",
    paidPlan: "Paid",
    paidInactive: "Paid inactive",
    dailyLimit: "Daily limit",
    sessionLimit: "Session limit",
    messageLimit: "Translated messages/min",
    freeAvailable: "Free is always available",
    checkout: "Upgrade to Paid",
    manage: "Manage billing",
    checkoutUnavailable: "Billing setup pending",
    portalUnavailable: "Paid management is available after a subscription is synced",
    safeBoundary:
      "This screen does not display or store Stripe secrets, webhook secrets, tokens, owner ids, provider channel ids, liveChatId, Authorization headers, or provider target metadata.",
    messages: {
      "checkout-returned": "Returned from Checkout. Subscription state updates after webhook sync.",
      "checkout-canceled": "Checkout was canceled. Free remains available.",
      "portal-returned": "Returned from the Billing Portal.",
      "caller-not-authenticated": "Sign in before using billing actions.",
      "missing-config": "Stripe server configuration is not ready.",
      "missing-customer": "No Stripe customer is available to manage yet.",
      "stripe-session-url-missing": "Could not read a Stripe session URL."
    },
    backToAccount: "Back to account",
    openTranslator: "Open translator"
  }
} as const;

function formatMinutes(ms: number) {
  return `${Math.floor(ms / 60_000)} min`;
}

function StatusPill({ children }: { children: string }) {
  return (
    <span className="inline-flex rounded-base border border-border bg-surface-muted px-2.5 py-1 text-xs font-bold text-muted">
      {children}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-base border border-border bg-surface-muted/45 px-3 py-3">
      <p className="text-xs font-bold text-muted">{label}</p>
      <p className="mt-2 break-words text-lg font-black text-foreground">{value}</p>
    </div>
  );
}

function BillingButton({ action, children, disabled }: { action: AccountFormAction; children: string; disabled: boolean }) {
  return (
    <form action={action} className="min-w-0">
      <button
        disabled={disabled}
        className="min-h-10 w-full rounded-base border border-primary bg-primary px-4 py-2 text-sm font-black text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-muted disabled:text-muted"
      >
        {children}
      </button>
    </form>
  );
}

export function AccountBillingShell({
  accountStatus,
  billingMessage,
  billing,
  createCheckoutAction,
  createPortalAction
}: {
  accountStatus: AccountSessionState;
  billingMessage: string | null;
  billing: CommentTranslatorBillingBrowserSafeViewModel;
  createCheckoutAction: AccountFormAction;
  createPortalAction: AccountFormAction;
}) {
  const { locale } = useLocale();
  const copy = billingCopy[locale];
  const message = billingMessage ? copy.messages[billingMessage as keyof typeof copy.messages] : null;
  const signedInEmail = accountStatus.user?.email ?? null;
  const planLabel =
    billing.billingState === "paid-active" ? copy.paidPlan : billing.billingState === "paid-inactive" ? copy.paidInactive : copy.freePlan;

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

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
        <div className="panel p-4 shadow-none sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-widest text-primary-strong">{copy.currentPlan}</p>
              <h2 className="mt-2 text-xl font-black text-foreground">{planLabel}</h2>
            </div>
            <StatusPill>{copy.freeAvailable}</StatusPill>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Metric label={copy.dailyLimit} value={formatMinutes(billing.planEntitlement.dailyLimitMs)} />
            <Metric label={copy.sessionLimit} value={formatMinutes(billing.planEntitlement.sessionLimitMs)} />
            <Metric label={copy.messageLimit} value={String(billing.planEntitlement.translatedMessagesPerMinute)} />
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <BillingButton action={createCheckoutAction} disabled={!billing.checkoutAvailable}>
              {billing.checkoutAvailable ? copy.checkout : copy.checkoutUnavailable}
            </BillingButton>
            <BillingButton action={createPortalAction} disabled={!billing.portalAvailable}>
              {billing.portalAvailable ? copy.manage : copy.portalUnavailable}
            </BillingButton>
          </div>
        </div>

        <aside className="panel p-4 shadow-none sm:p-5">
          <h2 className="text-base font-black text-foreground">{copy.freeAvailable}</h2>
          <p className="mt-3 text-sm leading-7 text-muted">{copy.safeBoundary}</p>
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
