import Link from "next/link";
import { type CommentTranslatorPrivateLaunchAccess } from "@/lib/comment-translator-private-launch-access-gate";

type CommentTranslatorPrivateLaunchUnavailableProps = {
  surface: "tool" | "integrations" | "billing";
  access: Extract<CommentTranslatorPrivateLaunchAccess, { status: "blocked" }>;
};

const surfaceCopy = {
  tool: {
    eyebrow: "Private launch",
    title: "Kuro Live Comment Translator is not yet available",
    body: "The translator is in a private launch gate before main promotion. General access is disabled while production smoke and launch hardening continue. Provider and billing setup remain approval-gated; public release is not enabled yet.",
    primaryHref: "/tools",
    primaryLabel: "Back to tools"
  },
  integrations: {
    eyebrow: "Private launch",
    title: "YouTube integration for Comment Translator is in preparation",
    body: "Connection controls are disabled for accounts outside the private tester allowlist. Connecting alone will not start monitoring, polling, translation, or quota use.",
    primaryHref: "/account",
    primaryLabel: "Back to account"
  },
  billing: {
    eyebrow: "Private launch",
    title: "Comment Translator billing is not yet available",
    body: "Checkout and portal actions are disabled for accounts outside the private tester allowlist. Free/Paid plan controls remain server-gated. Provider and billing setup remain approval-gated; public release is not enabled yet.",
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
      className="mx-auto grid w-full max-w-3xl gap-4 px-4 py-8 sm:px-6 lg:px-8"
    >
      <div className="panel border-amber-200 bg-amber-50/45 p-5 sm:p-6">
        <p className="text-xs font-black uppercase tracking-normal text-amber-700">{copy.eyebrow}</p>
        <h1 className="mt-2 break-words text-2xl font-black tracking-normal text-foreground sm:text-3xl">
          {copy.title}
        </h1>
        <p className="mt-3 break-words text-sm font-semibold leading-6 text-muted">{copy.body}</p>
        <p className="mt-3 break-words text-sm font-semibold leading-6 text-amber-800">
          準備中です。許可されたテスターのみ既存の preview flow を利用できます。provider / billing 設定は承認ゲート付きで、公開提供はまだ有効化していません。
        </p>
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
