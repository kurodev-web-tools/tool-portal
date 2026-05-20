"use client";

import { LanguageSwitch } from "@/components/portal/LanguageSwitch";
import { useLocale } from "@/components/portal/LocaleProvider";
import { ThemeToggle } from "@/components/portal/ThemeToggle";
import { portalCopy } from "@/lib/portal-copy";

type PortalSettingsPanelVariant = "panel" | "rail" | "drawer";

export function PortalSettingsPanel({ variant = "panel" }: { variant?: PortalSettingsPanelVariant }) {
  const { locale } = useLocale();
  const copy = portalCopy[locale].navigation;

  if (variant === "rail") {
    return (
      <section
        className="flex w-full flex-col items-center gap-3 rounded-base border border-border bg-surface-muted/45 px-1.5 py-3"
        aria-label={copy.settings}
      >
        <div
          className="grid h-10 w-10 place-items-center rounded-base border border-border bg-surface text-lg text-primary-strong"
          title={copy.settings}
          aria-hidden="true"
        >
          ⚙
        </div>
        <LanguageSwitch variant="rail" />
        <ThemeToggle variant="compact" />
      </section>
    );
  }

  return (
    <section
      className={[
        "rounded-base border border-border bg-surface-muted/45",
        variant === "drawer" ? "space-y-4 px-3 py-3" : "space-y-4 p-4"
      ].join(" ")}
      aria-label={copy.settings}
    >
      <div className="flex items-center gap-2 text-sm font-bold text-foreground">
        <span className="grid h-7 w-7 place-items-center rounded-base bg-surface text-primary-strong" aria-hidden="true">
          ⚙
        </span>
        <span>{copy.settings}</span>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-bold text-foreground">{copy.language}</span>
          <LanguageSwitch variant={variant === "drawer" ? "drawer" : "default"} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-bold text-foreground">{copy.theme}</span>
          <ThemeToggle />
        </div>
      </div>
    </section>
  );
}
