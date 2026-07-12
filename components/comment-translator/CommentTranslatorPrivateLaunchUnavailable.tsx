import Link from "next/link";
import { type CommentTranslatorPrivateLaunchAccess } from "@/lib/comment-translator-private-launch-access-gate";

type CommentTranslatorPrivateLaunchUnavailableProps = {
  surface: "tool" | "integrations" | "billing";
  access: Extract<CommentTranslatorPrivateLaunchAccess, { status: "blocked" }>;
};

const surfaceCopy = {
  tool: {
    eyebrow: "Private launch",
    statusLabel: "Private launch gate active",
    availableNowLabel: "Available now",
    nextStepLabel: "Next safe step",
    title: "Kuro Live Comment Translator is not yet available",
    body: "The translator is in a private launch gate before main promotion. General access is disabled while production smoke and launch hardening continue. Provider and billing setup remain approval-gated; public release is not enabled yet.",
    availableNow: "Private testers can continue the existing preview flow.",
    nextStep: "No connect, billing, polling, provider execution, or quota use starts from this fallback.",
    primaryHref: "/tools",
    primaryLabel: "Back to tools"
  },
  integrations: {
    eyebrow: "Private launch",
    statusLabel: "Private launch gate active",
    availableNowLabel: "Available now",
    nextStepLabel: "Next safe step",
    title: "YouTube integration for Comment Translator is in preparation",
    body: "Connection controls are disabled for accounts outside the private tester allowlist. Connecting alone will not start monitoring, polling, translation, or quota use.",
    availableNow: "Allowed testers can review the integration screen after signing in.",
    nextStep: "No connect, billing, polling, provider execution, or quota use starts from this fallback.",
    primaryHref: "/account",
    primaryLabel: "Back to account"
  },
  billing: {
    eyebrow: "Private launch",
    statusLabel: "Private launch gate active",
    availableNowLabel: "Available now",
    nextStepLabel: "Next safe step",
    title: "Comment Translator billing is not yet available",
    body: "Checkout and portal actions are disabled for accounts outside the private tester allowlist. Free/Paid plan controls remain server-gated. Provider and billing setup remain approval-gated; public release is not enabled yet.",
    availableNow: "Allowed testers can review billing state after signing in.",
    nextStep: "No connect, billing, polling, provider execution, or quota use starts from this fallback.",
    primaryHref: "/account",
    primaryLabel: "Back to account"
  }
} as const;

export function CommentTranslatorPrivateLaunchUnavailable({
  surface,
  access
}: CommentTranslatorPrivateLaunchUnavailableProps) {
  const copy = surfaceCopy[surface];

  return (
    <section
      data-comment-translator-private-launch="coming-soon"
      data-comment-translator-launch-access={access.launchAccess}
      className="mx-auto grid w-full max-w-3xl min-w-0 gap-4 px-4 py-8 sm:px-6 lg:px-8"
    >
      <div className="panel min-w-0 border-primary/30 bg-surface p-5 sm:p-6">
        <p className="text-xs font-black uppercase tracking-normal text-primary-strong">{copy.eyebrow}</p>
        <h1 className="mt-2 min-w-0 break-words text-2xl font-black tracking-normal text-foreground sm:text-3xl">
          {copy.title}
        </h1>
        <p className="mt-3 break-words text-sm font-semibold leading-6 text-muted">{copy.body}</p>
        <p className="mt-3 break-words text-sm font-semibold leading-6 text-muted">
          準備中です。許可されたテスターのみ既存の preview flow を利用できます。provider / billing 設定は承認ゲート付きで、公開提供はまだ有効化していません。
        </p>
        <dl className="mt-4 grid gap-2 text-sm">
          <div className="min-w-0 rounded-base border border-primary/30 bg-primary-soft/35 px-3 py-2">
            <dt className="text-xs font-black uppercase tracking-normal text-primary-strong">{copy.eyebrow}</dt>
            <dd className="mt-1 min-w-0 break-words font-black text-foreground">
              {copy.statusLabel} / private launch gate 有効
            </dd>
          </div>
          <div className="min-w-0 rounded-base border border-border bg-surface/80 px-3 py-2">
            <dt className="text-xs font-black text-muted">{copy.availableNowLabel} / 現在できること</dt>
            <dd className="mt-1 min-w-0 break-words font-semibold leading-6 text-muted">{copy.availableNow}</dd>
          </div>
          <div className="min-w-0 rounded-base border border-border bg-surface/80 px-3 py-2">
            <dt className="text-xs font-black text-muted">{copy.nextStepLabel} / 次の安全な操作</dt>
            <dd className="mt-1 min-w-0 break-words font-semibold leading-6 text-muted">
              {copy.nextStep} この fallback から接続、支払い、ポーリング、provider execution、クォータ消費は開始しません。
            </dd>
          </div>
        </dl>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={copy.primaryHref}
            className="inline-flex min-h-10 items-center justify-center rounded-base border border-primary bg-primary px-4 py-2 text-sm font-black text-white transition hover:bg-primary-strong"
          >
            {copy.primaryLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
