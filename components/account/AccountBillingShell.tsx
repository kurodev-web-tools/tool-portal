"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useLocale } from "@/components/portal/LocaleProvider";
import type {
  CommentTranslatorBillingBrowserSafeViewModel,
  CommentTranslatorBillingUiState
} from "@/lib/comment-translator-billing-runtime";
import type { AccountSessionBrowserSafeViewModel } from "@/lib/supabase/session";

type AccountFormAction = (formData: FormData) => void | Promise<void>;

const billingCopy = {
  ja: {
    eyebrow: "Comment Translator billing",
    title: "Kuro Live Comment Translator Plus",
    lead: "Freeは常に利用できます。Plusはサーバー側で確認できた契約・地域・安全状態だけを表示し、ブラウザのチェック状態や保存値を権限として扱いません。",
    signedInAs: "ログイン中のメールアドレス",
    currentPlan: "現在のプラン",
    planContrastTitle: "プランと利用条件",
    freePlan: "Free",
    paidPlan: "Kuro Live Comment Translator Plus",
    paidInactive: "Plus（利用停止中）",
    dailyLimit: "日次時間",
    sessionLimit: "1セッション",
    messageLimit: "翻訳メッセージ/分",
    freeAvailable: "Freeは常に利用可能",
    activeNow: "現在の契約",
    paidUnavailable: "サーバー確認待ち",
    availabilityLabel: "Plusのサーバー状態",
    planContrast: {
      free: {
        label: "Free",
        body: "Freeの既存セッション、OAuth、Start/Stop、heartbeat、feed、利用量表示は変更しません。"
      },
      paid: {
        label: "Plus",
        body: "US$6／月（税込・USD請求）。自動更新で、解約は次回更新時に反映します。"
      },
      safety: {
        label: "最大値と安全停止",
        body: "契約更新周期あたり最大500,000入力文字ですが、保証文字数ではありません。個人・全体の安全上限や運用上限で先に停止する場合があります。"
      }
    },
    paidPeriod: "契約更新周期あたりの入力文字数",
    paidPeriodBody: "最大500,000文字。保証文字数ではなく、個人・全体の安全上限や運用上限で先に停止する場合があります。",
    currencyNote: "カード会社の円換算額・海外利用手数料は変動する場合があります。請求はUSDです。",
    checkout: "利用条件に同意してCheckoutへ",
    manage: "Customer Portalを開く",
    checkoutUnavailable: "Checkoutは現在利用できません",
    portalUnavailable: "Customer Portalは現在利用できません",
    billingControlsTitle: "Billing操作",
    billingControlsBody: "Checkout前に必須同意とdocument versionをサーバー側へ保存します。Portalは同意未完了でも、既存契約の支払い方法・請求履歴・期間終了時解約を確認する導線です。",
    checkoutDisclosure: "Checkout直前: US$6／月（税込・USD請求・自動更新）。契約更新周期あたり最大500,000入力文字ですが保証値ではなく、解約は次回更新日に反映します。コメント本文は翻訳処理のためOpenAIまたはAzureへ送信されます。",
    privacyDataBoundary: "当サービスDBでは、画面表示とセッション復元に必要なsanitized feed snapshot（表示用コメント本文、翻訳結果、safe author display name）をセッション終了後最大24時間保存します。Provider request detail、ログ、集計、冪等台帳にはコメント本文を複製しません。Provider側では各社の処理・保持方針が適用されます。",
    consentTitle: "Checkoutに必要な同意",
    consentTerms: "利用規約を確認し、同意します。",
    consentPrivacy: "プライバシー通知を確認し、同意します。",
    consentPaidConditions: "Paid利用条件を確認し、同意します。",
    documentVersion: "document version",
    portalDetails: "Customer Portalでは支払い方法の更新、請求履歴の確認、期間終了時の解約へ進めます。past_due / unpaidの場合は新規Checkoutではなく支払い方法更新へ誘導します。",
    status: {
      ready: "購入可能",
      "region-unavailable": "現在の接続地域を確認できません",
      "unsupported-region": "現在の接続地域では購入できません",
      "capacity-full": "現在、新規受付を停止しています",
      "settings-stopped": "設定により購入を停止しています",
      "payment-stopped": "支払い状態の確認が必要です",
      "lifecycle-processing": "既存の契約処理を確認中です",
      "poll-budget-stop": "運用上限により購入を停止しています",
      infra: "安全設定を確認できないため購入を停止しています"
    } satisfies Record<CommentTranslatorBillingUiState, string>,
    activeStatus: "Plus利用中",
    activeStatusBody: "現在のPaid契約は有効です。新規購入用のCheckoutは表示・実行せず、契約変更や支払い方法の更新はCustomer Portalへ案内します。",
    statusBody: {
      ready: "地域・設定・既存lifecycleをサーバー側で確認しました。Checkout実行時にも同じauthorityで再確認します。",
      "region-unavailable": "Cloudflareのserver-derivedな接続地域を確認できないため、居住国を推測せず購入を停止しています。",
      "unsupported-region": "現在の接続地域では購入できません。居住国の判定や保存は行いません。",
      "capacity-full": "20枠のcapacity authorityが満員です。空きが確認されるまで新規Checkoutを作成しません。",
      "settings-stopped": "運用設定または支払い設定が停止状態です。Freeの利用には影響しません。",
      "payment-stopped": "past_due / unpaid / disputeまたは支払い停止状態です。既存契約はCustomer Portalで確認してください。",
      "lifecycle-processing": "既存の非終端billing lifecycleまたはreconciliationを確認中です。新規Subscriptionは作成しません。",
      "poll-budget-stop": "poll budgetの80%停止判定を含むserver-derivedな運用上限です。次のUTC reset後に再確認します。",
      infra: "Cloudflare / Supabase / Providerの安全設定をserver側で確認できないため、購入をfail closedにしています。"
    } satisfies Record<CommentTranslatorBillingUiState, string>,
    messages: {
      "checkout-returned": "Checkoutの完了はStripeのdurableな契約反映後に画面へ反映されます。",
      "checkout-canceled": "Checkoutをキャンセルしました。Freeは引き続き利用できます。",
      "portal-returned": "Customer Portalから戻りました。現在の契約状態を再確認しています。",
      "capacity-full": "現在、新規受付を停止しています。20枠のcapacity authorityが満員です。",
      "region-unavailable": "現在の接続地域を確認できないため購入できません。",
      "unsupported-region": "現在の接続地域では購入できません。",
      "missing-config": "請求のサーバー設定がまだ揃っていません。",
      "billing-store-unavailable": "請求状態を安全に確認できません。",
      "consent-required": "必須同意とdocument versionを確認してください。",
      "consent-store-unavailable": "同意をサーバー側へ保存できないためCheckoutを停止しました。",
      "past_due": "支払い状態を確認するためCustomer Portalを開いてください。",
      unpaid: "支払い状態を確認するためCustomer Portalを開いてください。",
      "portal-payment-method-update": "既存契約の支払い方法をCustomer Portalで更新してください。",
      "contract-management": "既存契約の管理はCustomer Portalから行ってください。",
      processing: "既存のbilling処理を確認中です。",
      "existing-checkout-session": "既存Checkoutを確認中です。新しいCheckoutは作成しません。",
      "billing-state-conflict": "既存のbilling状態を確認中です。",
      "settings-stopped": "設定によりCheckoutを停止しています。",
      "paid-core-v1-unavailable": "安全なサーバー状態を確認できないため、Plusの購入を停止しています。",
      "rate-limit-exceeded": "操作が短時間に集中しています。少し待ってから再試行してください。"
    } as Record<string, string>,
    backToAccount: "アカウント設定へ戻る",
    openTranslator: "翻訳ツールを開く",
    safeBoundary: "この画面はStripe secret、webhook secret、Checkout URL、token、原価、owner id、provider target metadata、ライブチャット識別子を表示・保存しません。",
    freeProvider: "Freeの通常翻訳と既存session/feed経路は従来どおりです。"
  },
  en: {
    eyebrow: "Comment Translator billing",
    title: "Kuro Live Comment Translator Plus",
    lead: "Free remains available. Plus reflects only server-derived contract, region, and safety state; browser checkboxes and storage are never entitlement authority.",
    signedInAs: "Signed-in email",
    currentPlan: "Current plan",
    planContrastTitle: "Plans and usage terms",
    freePlan: "Free",
    paidPlan: "Kuro Live Comment Translator Plus",
    paidInactive: "Plus (stopped)",
    dailyLimit: "Daily time",
    sessionLimit: "Session",
    messageLimit: "Translated messages/min",
    freeAvailable: "Free is always available",
    activeNow: "Current contract",
    paidUnavailable: "Waiting for server confirmation",
    availabilityLabel: "Plus server state",
    planContrast: {
      free: {
        label: "Free",
        body: "Existing Free sessions, OAuth, Start/Stop, heartbeat, feed, and usage display remain unchanged."
      },
      paid: {
        label: "Plus",
        body: "US$6/month (tax inclusive, billed in USD), automatic renewal, with cancellation at the next renewal."
      },
      safety: {
        label: "Maximum and safety stops",
        body: "Up to 500,000 input characters per contract renewal period; this is not a guaranteed character allowance. Individual, global, or operational safety caps may stop earlier."
      }
    },
    paidPeriod: "Input characters per contract renewal period",
    paidPeriodBody: "Maximum 500,000 characters. This is not a guarantee; individual, global, and operational safety caps may stop earlier.",
    currencyNote: "Your card issuer's JPY conversion and foreign transaction fees may vary. Billing is in USD.",
    checkout: "Agree to terms and open Checkout",
    manage: "Open Customer Portal",
    checkoutUnavailable: "Checkout is currently unavailable",
    portalUnavailable: "Customer Portal is currently unavailable",
    billingControlsTitle: "Billing actions",
    billingControlsBody: "Required consent and document versions are stored server-side before Checkout. Portal remains a separate path for payment method, invoice history, and cancel-at-period-end management even when consent is incomplete.",
    checkoutDisclosure: "Immediately before Checkout: US$6/month (tax inclusive, billed in USD, automatic renewal). Up to 500,000 input characters per contract renewal period is not guaranteed, and cancellation takes effect at the next renewal. Comment text is sent to OpenAI or Azure for translation processing.",
    privacyDataBoundary: "Our DB stores a sanitized feed snapshot needed for display and session restoration (displayed comment text, translation result, and safe author display name) for up to 24 hours after session end. Comment text is not copied into Provider request detail, logs, aggregates, or idempotency ledgers. Provider-specific processing and retention policies apply.",
    consentTitle: "Required Checkout consent",
    consentTerms: "I reviewed and agree to the Terms.",
    consentPrivacy: "I reviewed and agree to the Privacy Notice.",
    consentPaidConditions: "I reviewed and agree to the Paid Conditions.",
    documentVersion: "document version",
    portalDetails: "Customer Portal supports payment-method updates, invoice history, and cancel-at-period-end. past_due / unpaid accounts are sent to payment-method update rather than a new Checkout.",
    status: {
      ready: "Available to purchase",
      "region-unavailable": "Current connection region unavailable",
      "unsupported-region": "Purchase unavailable in the current connection region",
      "capacity-full": "New intake is currently paused",
      "settings-stopped": "Purchase stopped by settings",
      "payment-stopped": "Payment state needs attention",
      "lifecycle-processing": "Existing billing is processing",
      "poll-budget-stop": "Purchase stopped by an operational limit",
      infra: "Purchase stopped because safety configuration is unreadable"
    } satisfies Record<CommentTranslatorBillingUiState, string>,
    activeStatus: "Plus active",
    activeStatusBody: "The current Paid contract is active. New-purchase Checkout is not shown or executed; contract changes and payment-method updates go through Customer Portal.",
    statusBody: {
      ready: "Server-derived region, settings, and lifecycle checks are ready. Checkout repeats the same authority checks before creating a session.",
      "region-unavailable": "The Cloudflare server-derived connection region is unavailable. Residence is not inferred.",
      "unsupported-region": "Purchase is unavailable in the current connection region. Residence is not determined or stored.",
      "capacity-full": "The 20-slot capacity authority is full. No new Checkout is created until capacity is available.",
      "settings-stopped": "Operational or billing settings are stopped. Free remains unaffected.",
      "payment-stopped": "past_due / unpaid / dispute or another payment stop is active. Manage the existing contract in Customer Portal.",
      "lifecycle-processing": "An existing non-terminal billing lifecycle or reconciliation is being checked. No new Subscription is created.",
      "poll-budget-stop": "A server-derived operational gate, including the 80% poll-budget Checkout stop, is active. Recheck after the next UTC reset.",
      infra: "Cloudflare / Supabase / Provider safety configuration is not readable server-side, so purchase fails closed."
    } satisfies Record<CommentTranslatorBillingUiState, string>,
    messages: {
      "checkout-returned": "Checkout completion appears after Stripe durable contract projection is confirmed.",
      "checkout-canceled": "Checkout was canceled. Free remains available.",
      "portal-returned": "Returned from Customer Portal; the current contract state is being checked.",
      "capacity-full": "New intake is currently paused because the 20-slot capacity authority is full.",
      "region-unavailable": "Purchase is unavailable because the current connection region could not be confirmed.",
      "unsupported-region": "Purchase is unavailable in the current connection region.",
      "missing-config": "Billing server configuration is not ready.",
      "billing-store-unavailable": "Billing state could not be confirmed safely.",
      "consent-required": "Review all required consent checkboxes and document versions.",
      "consent-store-unavailable": "Checkout stopped because consent could not be stored server-side.",
      "past_due": "Open Customer Portal to update the payment method.",
      unpaid: "Open Customer Portal to update the payment method.",
      "portal-payment-method-update": "Update the existing contract's payment method in Customer Portal.",
      "contract-management": "Manage the existing contract in Customer Portal.",
      processing: "Existing billing processing is still being checked.",
      "existing-checkout-session": "An existing Checkout is being checked; no new Checkout is created.",
      "billing-state-conflict": "Existing billing state is being checked.",
      "settings-stopped": "Checkout is stopped by server settings.",
      "paid-core-v1-unavailable": "Purchase is stopped because a safe server state could not be confirmed.",
      "rate-limit-exceeded": "Too many billing actions arrived together. Wait briefly and retry."
    } as Record<string, string>,
    backToAccount: "Back to account",
    openTranslator: "Open translator",
    safeBoundary: "This screen does not display or store Stripe secrets, webhook secrets, Checkout URLs, tokens, costs, owner ids, provider target metadata, or live-chat target identifiers.",
    freeProvider: "The existing Free translation and session/feed paths remain unchanged."
  }
} as const;

type BillingCopy = (typeof billingCopy)[keyof typeof billingCopy];
type PlanOption = CommentTranslatorBillingBrowserSafeViewModel["planComparison"]["planOptions"][number];

function formatMinutes(ms: number, locale: "ja" | "en") {
  if (!Number.isFinite(ms) || ms >= Number.MAX_SAFE_INTEGER) return locale === "ja" ? "上限なし" : "No daily cap";
  return locale === "ja" ? `${Math.floor(ms / 60_000)}分` : `${Math.floor(ms / 60_000)} min`;
}

function formatPrice(option: PlanOption, locale: "ja" | "en") {
  if (option.displayPrice.monthlyAmount === 0) return locale === "ja" ? "無料" : "Free";
  return locale === "ja" ? "US$6／月（税込・USD請求）" : "US$6/month (tax inclusive, billed in USD)";
}

function StatusPill({ children }: { children: string }) {
  return <span className="inline-flex rounded-base border border-border bg-surface-muted px-2.5 py-1 text-xs font-bold text-muted">{children}</span>;
}

function PlanMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-base border border-border bg-surface-muted/45 px-3 py-2"><p className="text-[11px] font-bold text-muted">{label}</p><p className="mt-1 break-words text-sm font-black text-foreground">{value}</p></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-base border border-border bg-surface-muted/45 px-3 py-3"><p className="text-xs font-bold text-muted">{label}</p><p className="mt-2 break-words text-lg font-black text-foreground">{value}</p></div>;
}

function PlanComparisonCard({ option, current, locale, copy }: { option: PlanOption; current: boolean; locale: "ja" | "en"; copy: BillingCopy }) {
  const localized = locale === "ja" ? "ja" : "en";
  const paid = option.implementationEntitlement === "paid";
  return (
    <article className={["flex min-w-0 flex-col rounded-base border p-4 shadow-none", current ? "border-primary bg-primary-soft/40" : "border-border bg-surface"].join(" ")}>
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words text-base font-black text-foreground">{option.productName}</h3><p className="mt-1 text-xs font-bold text-muted">{option.badge[localized]}</p></div><StatusPill>{current ? copy.activeNow : paid ? copy.paidUnavailable : copy.freePlan}</StatusPill></div>
      <p className="mt-4 break-words text-2xl font-black text-foreground">{formatPrice(option, locale)}</p>
      <p className="mt-2 min-h-10 break-words text-sm font-semibold leading-6 text-muted">{option.description[localized]}</p>
      <div className="mt-4 grid gap-2"><PlanMetric label={copy.dailyLimit} value={formatMinutes(option.entitlement.dailyLimitMs, locale)} /><PlanMetric label={copy.sessionLimit} value={formatMinutes(option.entitlement.sessionLimitMs, locale)} /><PlanMetric label={copy.messageLimit} value={String(option.entitlement.translatedMessagesPerMinute)} /></div>
      <p className="mt-4 rounded-base border border-border bg-surface px-3 py-2 text-xs font-bold leading-5 text-muted">{paid ? copy.paidPeriodBody : option.cta[localized]}</p>
    </article>
  );
}

function ConsentCheckbox({ name, label, versionName, version, required = true }: { name: string; label: ReactNode; versionName: string; version: string | null; required?: boolean }) {
  return <label className="flex min-w-0 items-start gap-2 rounded-base border border-border bg-surface px-3 py-2 text-xs font-semibold leading-5 text-muted"><input required={required} type="checkbox" name={name} className="mt-1 h-4 w-4 shrink-0 accent-primary" /><span className="min-w-0 break-words">{label} <span className="font-black text-foreground">({versionName}: {version ?? "server confirmation required"})</span></span>{version ? <input type="hidden" name={versionName} value={version} /> : null}</label>;
}

function CheckoutForm({ action, billing, copy }: { action: AccountFormAction; billing: CommentTranslatorBillingBrowserSafeViewModel; copy: BillingCopy }) {
  return <form action={action} className="grid gap-3">
    <div className="rounded-base border border-border bg-surface-muted/45 px-3 py-3"><h3 className="text-sm font-black text-foreground">{copy.consentTitle}</h3><p className="mt-1 text-xs font-semibold leading-5 text-muted">{copy.checkoutDisclosure}</p><p className="mt-2 text-xs font-semibold leading-5 text-muted">{copy.privacyDataBoundary}</p><p className="mt-2 text-xs font-semibold leading-5 text-muted">{copy.documentVersion}: server-derived values are submitted for the server-side durable consent check.</p></div>
    <ConsentCheckbox name={billing.consentFieldNames.termsChecked} label={<Link href="/terms" className="underline underline-offset-2">{copy.consentTerms}</Link>} versionName={billing.consentFieldNames.termsVersion} version={billing.consentVersions.terms} />
    <ConsentCheckbox name={billing.consentFieldNames.privacyChecked} label={<Link href="/privacy" className="underline underline-offset-2">{copy.consentPrivacy}</Link>} versionName={billing.consentFieldNames.privacyVersion} version={billing.consentVersions.privacy} />
    <ConsentCheckbox name={billing.consentFieldNames.paidConditionsChecked} label={<Link href="#comment-translator-paid-conditions" className="underline underline-offset-2">{copy.consentPaidConditions}</Link>} versionName={billing.consentFieldNames.paidConditionsVersion} version={billing.consentVersions.paidConditions} />
    <button disabled={!billing.checkoutAvailable} className="min-h-10 w-full rounded-base border border-primary bg-primary px-4 py-2 text-sm font-black text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-muted disabled:text-muted">{billing.checkoutAvailable ? copy.checkout : copy.checkoutUnavailable}</button>
  </form>;
}

function PortalForm({ action, billing, copy }: { action: AccountFormAction; billing: CommentTranslatorBillingBrowserSafeViewModel; copy: BillingCopy }) {
  return <form action={action}><button disabled={!billing.portalAvailable} className="min-h-10 w-full rounded-base border border-primary bg-primary px-4 py-2 text-sm font-black text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-muted disabled:text-muted">{billing.portalAvailable ? copy.manage : copy.portalUnavailable}</button></form>;
}

export function AccountBillingShell({ accountStatus, billingMessage, billing, createCheckoutAction, createPortalAction }: { accountStatus: AccountSessionBrowserSafeViewModel; billingMessage: string | null; billing: CommentTranslatorBillingBrowserSafeViewModel; createCheckoutAction: AccountFormAction; createPortalAction: AccountFormAction }) {
  const { locale } = useLocale();
  const copy = billingCopy[locale];
  const message = billingMessage ? copy.messages[billingMessage as keyof typeof copy.messages] : null;
  const signedInEmail = accountStatus.user?.email ?? null;
  const currentPlanOption = billing.planComparison.planOptions.find((option) => option.id === billing.planComparison.currentPlanId);
  const planLabel = billing.billingState === "paid-active" ? copy.paidPlan : billing.billingState === "paid-inactive" ? copy.paidInactive : copy.freePlan;
  const statusLabel = billing.billingState === "paid-active" ? copy.activeStatus : copy.status[billing.uiState];
  const statusBody = billing.billingState === "paid-active" ? copy.activeStatusBody : copy.statusBody[billing.uiState];
  const currentStatusLabel = billing.billingState === "free" ? copy.freeAvailable : billing.uiState === "ready" ? copy.activeNow : statusLabel;
  return <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
    {message ? <div role="status" className="fixed right-4 top-20 z-50 max-w-[calc(100vw-2rem)] rounded-base border border-primary/30 bg-surface px-4 py-3 text-sm font-bold text-foreground shadow-soft">{message}</div> : null}
    <section className="border-b border-border pb-6"><p className="text-xs font-black uppercase tracking-widest text-primary-strong">{copy.eyebrow}</p><h1 className="mt-3 break-words text-3xl font-black tracking-tight text-foreground sm:text-4xl">{copy.title}</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-muted sm:text-base">{copy.lead}</p>{signedInEmail ? <p className="mt-3 break-all text-xs font-bold text-muted">{copy.signedInAs}: <span className="text-foreground">{signedInEmail}</span></p> : null}</section>
    <section data-comment-translator-plan-comparison="free-and-paid-server-derived" className="grid gap-4">
       <div className="panel p-4 shadow-none sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-black uppercase tracking-widest text-primary-strong">{copy.currentPlan}</p><h2 className="mt-2 break-words text-xl font-black text-foreground">{planLabel}</h2></div><StatusPill>{currentStatusLabel}</StatusPill></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><Metric label={copy.dailyLimit} value={formatMinutes(billing.planEntitlement.dailyLimitMs, locale)} /><Metric label={copy.sessionLimit} value={formatMinutes(billing.planEntitlement.sessionLimitMs, locale)} /><Metric label={copy.messageLimit} value={String(billing.planEntitlement.translatedMessagesPerMinute)} /></div><div data-comment-translator-billing-server-state={billing.uiState} data-comment-translator-billing-state-source="server-derived" className="mt-4 rounded-base border border-border bg-surface-muted/45 px-3 py-3"><p className="text-xs font-black text-primary-strong">{copy.availabilityLabel}</p><p className="mt-2 break-words text-sm font-black text-foreground">{statusLabel}</p><p className="mt-1 break-words text-sm font-semibold leading-6 text-muted">{statusBody}</p></div></div>
      <div className="grid gap-3 lg:grid-cols-2">{billing.planComparison.planOptions.map((option) => <PlanComparisonCard key={option.id} option={option} current={option.id === (currentPlanOption?.id ?? "free")} locale={locale} copy={copy} />)}</div>
      <div className="panel p-4 shadow-none sm:p-5"><h2 className="text-base font-black text-foreground">{copy.planContrastTitle}</h2><div className="mt-4 grid gap-3 md:grid-cols-3">{Object.values(copy.planContrast).map((item) => <div key={item.label} className="rounded-base border border-border bg-surface-muted/45 px-3 py-3"><p className="text-xs font-black text-primary-strong">{item.label}</p><p className="mt-2 break-words text-sm font-semibold leading-6 text-muted">{item.body}</p></div>)}</div><p className="mt-4 break-words rounded-base border border-border bg-surface px-3 py-3 text-xs font-semibold leading-5 text-muted">{copy.currencyNote}</p></div>
      <div id="comment-translator-paid-conditions" data-comment-translator-paid-safety="billing-period-maximum-not-guarantee" className="rounded-base border border-primary/30 bg-primary-soft/45 px-4 py-3"><h2 className="text-sm font-black text-primary-strong">{copy.paidPeriod}</h2><p className="mt-2 break-words text-sm font-bold leading-7 text-foreground">{copy.paidPeriodBody}</p></div>
    </section>
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]"><div className="panel p-4 shadow-none sm:p-5"><h2 className="text-base font-black text-foreground">{copy.billingControlsTitle}</h2><p className="mt-3 break-words text-sm leading-7 text-muted">{copy.billingControlsBody}</p><div className="mt-5"><CheckoutForm action={createCheckoutAction} billing={billing} copy={copy} /></div></div><aside className="panel p-4 shadow-none sm:p-5"><h2 className="text-base font-black text-foreground">Customer Portal</h2><p className="mt-3 break-words text-sm leading-7 text-muted">{copy.portalDetails}</p><div className="mt-5"><PortalForm action={createPortalAction} billing={billing} copy={copy} /></div><p className="mt-4 break-words text-xs font-semibold leading-5 text-muted">{copy.safeBoundary}</p><p className="mt-4 break-words text-xs font-semibold leading-5 text-muted">{copy.freeProvider}</p></aside></section>
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/account" className="inline-flex min-h-10 items-center rounded-base border border-border bg-surface px-4 py-2 text-sm font-bold text-foreground transition hover:border-primary hover:bg-primary-soft">{copy.backToAccount}</Link><Link href="/tools/comment-translator" className="inline-flex min-h-10 items-center rounded-base bg-primary px-4 py-2 text-sm font-black text-white transition hover:bg-primary-strong">{copy.openTranslator}</Link></div>
  </div>;
}
