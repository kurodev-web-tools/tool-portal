"use client";

import Link from "next/link";
import { useLocale } from "@/components/portal/LocaleProvider";

const footerCopy = {
  ja: {
    label: "Kuro Stream Kit legal",
    terms: "利用規約",
    privacy: "プライバシーポリシー",
    tokushoho: "特定商取引法に基づく表記"
  },
  en: {
    label: "Kuro Stream Kit legal",
    terms: "Terms",
    privacy: "Privacy Policy",
    tokushoho: "Legal Information"
  }
} as const;

export function PortalLegalFooter() {
  const { locale } = useLocale();
  const copy = footerCopy[locale];

  return (
    <footer className="mx-auto w-full max-w-7xl px-4 pb-6 pt-2 sm:px-6 lg:px-8 lg:pb-8">
      <div className="flex flex-col gap-3 border-t border-border pt-4 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <p className="font-semibold text-foreground">{copy.label}</p>
        <nav aria-label={copy.label} className="flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/terms" className="transition hover:text-primary-strong">
            {copy.terms}
          </Link>
          <Link href="/privacy" className="transition hover:text-primary-strong">
            {copy.privacy}
          </Link>
          <Link href="/legal/tokushoho" className="transition hover:text-primary-strong">
            {copy.tokushoho}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
