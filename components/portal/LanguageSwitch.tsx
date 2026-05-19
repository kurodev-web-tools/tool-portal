"use client";

import { useLocale } from "@/components/portal/LocaleProvider";
import { supportedLocales, type Locale } from "@/lib/locale";

type LanguageSwitchVariant = "default" | "drawer" | "compact";

const labels: Record<Locale, { short: string; long: string; aria: string }> = {
  ja: {
    short: "JA",
    long: "日本語",
    aria: "日本語表示に切り替える"
  },
  en: {
    short: "EN",
    long: "English",
    aria: "Switch display language to English"
  }
};

export function LanguageSwitch({ variant = "default" }: { variant?: LanguageSwitchVariant }) {
  const { locale, setLocale } = useLocale();
  const isCompact = variant === "compact";
  const isDrawer = variant === "drawer";

  return (
    <div
      className={[
        "inline-flex items-center rounded-base border border-border bg-surface-muted p-1",
        isDrawer ? "shrink-0 gap-1" : "",
        isCompact ? "gap-1" : "gap-1.5"
      ].join(" ")}
      aria-label="Language"
    >
      {supportedLocales.map((item) => (
        <button
          key={item}
          type="button"
          aria-label={labels[item].aria}
          aria-pressed={locale === item}
          onClick={() => setLocale(item)}
          className={[
            "rounded-base font-bold transition",
            isCompact
              ? "min-w-9 px-2 py-1 text-xs"
              : isDrawer
                ? "min-w-14 px-2 py-1.5 text-xs"
                : "min-w-16 px-3 py-1.5 text-xs",
            locale === item
              ? "bg-primary text-white"
              : "text-muted hover:bg-surface hover:text-foreground"
          ].join(" ")}
        >
          {isCompact ? labels[item].short : labels[item].long}
        </button>
      ))}
    </div>
  );
}
