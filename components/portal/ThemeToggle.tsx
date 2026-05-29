"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/portal/LocaleProvider";
import {
  readLocalThemePreference,
  themePreferenceChangeEvent,
  themePreferenceStorageKey,
  writeLocalThemePreference,
  type ThemePreference
} from "@/lib/local-preferences";
import { portalCopy } from "@/lib/portal-copy";

type ThemeToggleVariant = "default" | "compact";

export { themePreferenceStorageKey } from "@/lib/local-preferences";

function getInitialTheme(): ThemePreference {
  if (typeof window === "undefined") {
    return "light";
  }

  return readLocalThemePreference() ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}

export function ThemeToggle({ variant = "default" }: { variant?: ThemeToggleVariant }) {
  const { locale } = useLocale();
  const copy = portalCopy[locale].themeToggle;
  const [theme, setTheme] = useState<ThemePreference>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initialTheme = getInitialTheme();
    setTheme(initialTheme);
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== themePreferenceStorageKey) {
        return;
      }

      if (event.newValue === "light" || event.newValue === "dark") {
        setTheme(event.newValue);
      }
    };

    const handleThemeChange = (event: Event) => {
      const nextTheme = (event as CustomEvent<ThemePreference>).detail;
      if (nextTheme === "light" || nextTheme === "dark") {
        setTheme(nextTheme);
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(themePreferenceChangeEvent, handleThemeChange);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(themePreferenceChangeEvent, handleThemeChange);
    };
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    document.documentElement.classList.toggle("dark", theme === "dark");
    writeLocalThemePreference(theme);
    window.dispatchEvent(new CustomEvent(themePreferenceChangeEvent, { detail: theme }));
  }, [mounted, theme]);

  if (variant === "compact") {
    return (
      <button
        type="button"
        aria-label={copy.toggleAria}
        aria-pressed={theme === "dark"}
        title={copy.title}
        onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
        className="relative h-7 w-12 rounded-full border border-border bg-surface-muted transition hover:border-primary/60"
      >
        <span
          className={[
            "absolute top-1 h-5 w-5 rounded-full bg-foreground transition-all",
            theme === "dark" ? "left-6" : "left-1"
          ].join(" ")}
        />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-muted" aria-label={copy.groupLabel}>
      <span className={theme === "light" ? "text-primary-strong" : ""}>{copy.light}</span>
      <button
        type="button"
        aria-label={copy.toggleAria}
        aria-pressed={theme === "dark"}
        onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
        className="relative h-7 w-12 rounded-full border border-border bg-surface-muted transition hover:border-primary/60"
      >
        <span
          className={[
            "absolute top-1 h-5 w-5 rounded-full bg-foreground transition-all",
            theme === "dark" ? "left-6" : "left-1"
          ].join(" ")}
        />
      </button>
      <span className={theme === "dark" ? "text-primary-strong" : ""}>{copy.dark}</span>
    </div>
  );
}
