"use client";

import Link from "next/link";
import { useLocale } from "@/components/portal/LocaleProvider";
import type { CommentTranslatorBillingBrowserSafeViewModel } from "@/lib/comment-translator-billing-runtime";
import type { AccountSessionBrowserSafeViewModel } from "@/lib/supabase/session";

type AccountFormAction = (formData: FormData) => void | Promise<void>;

const billingCopy = {
  ja: {
    eyebrow: "Comment Translator billing",
    title: "Free / Paid Core v1 unavailable",
    lead: "Free は常に利用できます。Paid Core v1 は永続的な権限情報が接続されるまで利用できません。",
    signedInAs: "ログイン中のメールアドレス",
    currentPlan: "現在のプラン",
    planContrastTitle: "Free / Paid Core v1 availability",
    freePlan: "Free",
    paidPlan: "Paid Core v1 unavailable",
    paidInactive: "Paid Core v1 unavailable",
    dailyLimit: "1日の上限",
    sessionLimit: "1セッション上限",
    messageLimit: "翻訳メッセージ/分",
    freeAvailable: "Free は常に利用可能",
    activeNow: "現在の表示",
    paidUnavailable: "永続的な権限情報が接続されるまで利用不可",
    availabilityLabel: "Paid Core v1 の利用可否",
    planContrast: {
      free: {
        label: "Free 基本枠",
        body: "Paid Core v1 が利用不可でも Free は利用できます。"
      },
      paid: {
        label: "Paid との差分",
        body: "Paid Core v1 は永続的な権限情報が接続されるまで利用できません。"
      },
      availability: {
        label: "明示的な利用不可境界",
        body: "旧Paid権限や旧価格設定からPaid状態を推測しません。"
      }
    },
    checkout: "Paid Core v1 unavailable",
    manage: "Paid Core v1 unavailable",
    checkoutUnavailable: "Paid Core v1 unavailable",
    portalUnavailable: "Paid Core v1 unavailable",
    billingControlsTitle: "Paid Core v1 操作",
    billingControlsBody: "Paid Core v1 の外部操作は、永続的な権限情報が接続されるまで無効です。Free の利用には影響しません。",
    providerPolicyTitle: "翻訳provider方針",
    providerPolicyBody:
      "Free の通常翻訳は Azure Translator を使用します。Paid Core v1 のprovider方針は永続的な権限情報の接続後に定義します。",
    safeBoundary:
      "この画面は Stripe secret、webhook secret、token、owner id、provider channel id、liveChatId、Authorization header、provider target metadata を表示・保存しません。",
    messages: {
      "checkout-returned": "Paid Core v1 は現在利用できません。Free は引き続き利用できます。",
      "checkout-canceled": "Paid Core v1 は現在利用できません。Free は引き続き利用できます。",
      "portal-returned": "Paid Core v1 は現在利用できません。",
      "paid-core-v1-unavailable": "Paid Core v1 は永続的な権限情報が接続されるまで利用できません。Free は引き続き利用できます。",
      "caller-not-authenticated": "Billing 操作にはログインが必要です。",
      "missing-config": "Stripe のサーバー設定がまだ揃っていません。",
      "missing-customer": "管理対象の Stripe customer がまだありません。",
      "stripe-session-url-missing": "Stripe セッション URL を取得できませんでした。"
    },
    backToAccount: "アカウント設定へ戻る",
    openTranslator: "翻訳ツールを開く",
    paidCoreV1AvailabilityNoticeLabel: "Paid Core v1 の利用可否"
  },
  en: {
    eyebrow: "Comment Translator billing",
    title: "Free / Paid Core v1 unavailable",
    lead: "Free remains available. Paid Core v1 is unavailable until durable entitlement authority is connected.",
    signedInAs: "Signed-in email",
    currentPlan: "Current plan",
    planContrastTitle: "Free / Paid Core v1 availability",
    freePlan: "Free",
    paidPlan: "Paid Core v1 unavailable",
    paidInactive: "Paid Core v1 unavailable",
    dailyLimit: "Daily limit",
    sessionLimit: "Session limit",
    messageLimit: "Translated messages/min",
    freeAvailable: "Free is always available",
    activeNow: "Current display",
    paidUnavailable: "Unavailable until durable entitlement is connected",
    availabilityLabel: "Paid Core v1 availability",
    planContrast: {
      free: {
        label: "Free baseline",
        body: "Free remains usable while Paid Core v1 is unavailable."
      },
      paid: {
        label: "Paid contrast",
        body: "Paid Core v1 is unavailable until durable entitlement authority is connected."
      },
      availability: {
        label: "Explicit unavailable boundary",
        body: "Old Paid entitlements and old prices do not imply Paid access."
      }
    },
    checkout: "Paid Core v1 unavailable",
    manage: "Paid Core v1 unavailable",
    checkoutUnavailable: "Paid Core v1 unavailable",
    portalUnavailable: "Paid Core v1 unavailable",
    billingControlsTitle: "Paid Core v1 actions",
    billingControlsBody: "Paid Core v1 external actions stay disabled until durable entitlement authority is connected. Free remains unaffected.",
    providerPolicyTitle: "Translation provider policy",
    providerPolicyBody:
      "Free normal translation uses Azure Translator. Paid Core v1 provider policy will be defined after durable entitlement authority is connected.",
    safeBoundary:
      "This screen does not display or store Stripe secrets, webhook secrets, tokens, owner ids, provider channel ids, liveChatId, Authorization headers, or provider target metadata.",
    messages: {
      "checkout-returned": "Paid Core v1 is unavailable. Free remains available.",
      "checkout-canceled": "Paid Core v1 is unavailable. Free remains available.",
      "portal-returned": "Paid Core v1 is unavailable.",
      "paid-core-v1-unavailable": "Paid Core v1 is unavailable until durable entitlement authority is connected. Free remains available.",
      "caller-not-authenticated": "Sign in before using billing actions.",
      "missing-config": "Stripe server configuration is not ready.",
      "missing-customer": "No Stripe customer is available to manage yet.",
      "stripe-session-url-missing": "Could not read a Stripe session URL."
    },
    backToAccount: "Back to account",
    openTranslator: "Open translator",
    paidCoreV1AvailabilityNoticeLabel: "Paid Core v1 availability"
  }
} as const;

type PlanOption = CommentTranslatorBillingBrowserSafeViewModel["planComparison"]["planOptions"][number];

function formatMinutes(ms: number) {
  return `${Math.floor(ms / 60_000)} min`;
}

function formatPrice(option: PlanOption, locale: "ja" | "en") {
  if (option.displayPrice.monthlyAmount === 0) {
    return locale === "ja" ? "無料" : "Free";
  }

  return "Unavailable";
}

function StatusPill({ children }: { children: string }) {
  return (
    <span className="inline-flex rounded-base border border-border bg-surface-muted px-2.5 py-1 text-xs font-bold text-muted">
      {children}
    </span>
  );
}

function PlanMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-base border border-border bg-surface-muted/45 px-3 py-2">
      <p className="text-[11px] font-bold text-muted">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-foreground">{value}</p>
    </div>
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

function PlanComparisonCard({
  option,
  current,
  locale,
  copy
}: {
  option: PlanOption;
  current: boolean;
  locale: "ja" | "en";
  copy: (typeof billingCopy)["ja"] | (typeof billingCopy)["en"];
}) {
  const localized = locale === "ja" ? "ja" : "en";

  return (
    <article
      className={[
        "flex min-w-0 flex-col rounded-base border p-4 shadow-none",
        current ? "border-primary bg-primary-soft/40" : "border-border bg-surface"
      ].join(" ")}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-base font-black text-foreground">{option.productName}</h3>
          <p className="mt-1 text-xs font-bold text-muted">{option.badge[localized]}</p>
        </div>
        <StatusPill>{current ? copy.activeNow : option.implementationEntitlement === "paid" ? copy.paidUnavailable : "Free"}</StatusPill>
      </div>
      <p className="mt-4 break-words text-2xl font-black text-foreground">{formatPrice(option, locale)}</p>
      <p className="mt-2 min-h-10 break-words text-sm font-semibold leading-6 text-muted">{option.description[localized]}</p>
      <div className="mt-4 grid gap-2">
        <PlanMetric label={copy.dailyLimit} value={formatMinutes(option.entitlement.dailyLimitMs)} />
        <PlanMetric label={copy.sessionLimit} value={formatMinutes(option.entitlement.sessionLimitMs)} />
        <PlanMetric label={copy.messageLimit} value={String(option.entitlement.translatedMessagesPerMinute)} />
      </div>
      <p className="mt-4 rounded-base border border-border bg-surface px-3 py-2 text-xs font-bold leading-5 text-muted">
        {option.implementationEntitlement === "paid" ? copy.paidUnavailable : option.cta[localized]}
      </p>
    </article>
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
  accountStatus: AccountSessionBrowserSafeViewModel;
  billingMessage: string | null;
  billing: CommentTranslatorBillingBrowserSafeViewModel;
  createCheckoutAction: AccountFormAction;
  createPortalAction: AccountFormAction;
}) {
  const { locale } = useLocale();
  const copy = billingCopy[locale];
  const message = billingMessage ? copy.messages[billingMessage as keyof typeof copy.messages] : null;
  const signedInEmail = accountStatus.user?.email ?? null;
  const currentPlanOption = billing.planComparison.planOptions.find((option) => option.id === billing.planComparison.currentPlanId);
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

      <section data-comment-translator-plan-comparison="free-only-paid-unavailable" className="grid gap-4">
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
          <div className="mt-4 rounded-base border border-border bg-surface-muted/45 px-3 py-3">
            <p className="text-xs font-black text-primary-strong">{copy.availabilityLabel}</p>
            <p className="mt-2 break-words text-sm font-semibold text-muted">
              {billing.paidCoreV1Availability === "unavailable-until-durable-entitlement"
                ? copy.paidUnavailable
                : copy.paidPlan}
            </p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          {billing.planComparison.planOptions.map((option) => (
            <PlanComparisonCard
              key={option.id}
              option={option}
              current={option.id === (currentPlanOption?.id ?? "free")}
              locale={locale}
              copy={copy}
            />
          ))}
        </div>

        <div className="panel p-4 shadow-none sm:p-5">
          <h2 className="text-base font-black text-foreground">{copy.planContrastTitle}</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {Object.values(copy.planContrast).map((item) => (
              <div key={item.label} className="rounded-base border border-border bg-surface-muted/45 px-3 py-3">
                <p className="text-xs font-black text-primary-strong">{item.label}</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div
          data-comment-translator-billing-copy="paid-core-v1-availability"
          className="rounded-base border border-primary/30 bg-primary-soft/45 px-4 py-3"
        >
          <h2 className="text-sm font-black text-primary-strong">{copy.paidCoreV1AvailabilityNoticeLabel}</h2>
          <p className="mt-2 text-sm font-bold leading-7 text-foreground">
            {billing.planComparison.advanceNoticeCopy[locale]}
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
        <div className="panel p-4 shadow-none sm:p-5">
          <h2 className="text-base font-black text-foreground">{copy.billingControlsTitle}</h2>
          <p className="mt-3 text-sm leading-7 text-muted">{copy.billingControlsBody}</p>
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
          <h3 className="mt-5 text-sm font-black text-foreground">{copy.providerPolicyTitle}</h3>
          <p className="mt-2 text-sm leading-7 text-muted">{copy.providerPolicyBody}</p>
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
