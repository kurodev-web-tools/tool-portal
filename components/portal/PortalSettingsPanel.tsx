"use client";

import { useEffect, useState } from "react";
import { LanguageSwitch } from "@/components/portal/LanguageSwitch";
import { useLocale } from "@/components/portal/LocaleProvider";
import { ThemeToggle } from "@/components/portal/ThemeToggle";
import {
  readLocalThemePreference,
  themePreferenceChangeEvent,
  themePreferenceStorageKey,
  type ThemePreference
} from "@/lib/local-preferences";
import { portalCopy } from "@/lib/portal-copy";

type PortalSettingsPanelVariant = "panel" | "rail" | "drawer";

function getInitialTheme(): ThemePreference {
  if (typeof window === "undefined") {
    return "light";
  }

  return readLocalThemePreference() ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}

export function PortalSettingsPanel({ variant = "panel" }: { variant?: PortalSettingsPanelVariant }) {
  const { locale } = useLocale();
  const copy = portalCopy[locale].navigation;
  const themeCopy = portalCopy[locale].themeToggle;
  const [theme, setTheme] = useState<ThemePreference>("light");
  const localeLabel = locale === "ja" ? "日本語" : "English";
  const themeLabel = theme === "dark" ? themeCopy.dark : themeCopy.light;

  useEffect(() => {
    setTheme(getInitialTheme());

    function handleStorage(event: StorageEvent) {
      if (event.key === themePreferenceStorageKey && (event.newValue === "light" || event.newValue === "dark")) {
        setTheme(event.newValue);
      }
    }

    function handleThemeChange(event: Event) {
      const nextTheme = (event as CustomEvent<ThemePreference>).detail;
      if (nextTheme === "light" || nextTheme === "dark") {
        setTheme(nextTheme);
      }
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener(themePreferenceChangeEvent, handleThemeChange);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(themePreferenceChangeEvent, handleThemeChange);
    };
  }, []);

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

  if (variant === "panel") {
    return (
      <details className="group rounded-base border border-border bg-surface-muted/45 p-2" aria-label={copy.settings}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-base px-2 py-2 text-sm font-bold text-foreground transition hover:bg-surface [&::-webkit-details-marker]:hidden">
          <span className="flex min-w-0 items-center gap-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-base bg-surface text-primary-strong" aria-hidden="true">
              ⚙
            </span>
            <span>{copy.settings}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2 text-[11px] font-bold text-muted">
            <span>{localeLabel} / {themeLabel}</span>
            <span className="transition group-open:rotate-180" aria-hidden="true">
              ˅
            </span>
          </span>
        </summary>
        <div className="mt-2 space-y-3 border-t border-border px-2 pt-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-bold text-foreground">{copy.language}</span>
            <LanguageSwitch />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-bold text-foreground">{copy.theme}</span>
            <ThemeToggle />
          </div>
        </div>
      </details>
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
