"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const storageKey = "v-streamer-tools-theme";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  const stored = window.localStorage.getItem(storageKey);
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initialTheme = getInitialTheme();
    setTheme(initialTheme);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem(storageKey, theme);
  }, [mounted, theme]);

  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-muted" aria-label="テーマ切替">
      <span className={theme === "light" ? "text-primary-strong" : ""}>ライト</span>
      <button
        type="button"
        aria-label="ライトモードとダークモードを切り替える"
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
      <span className={theme === "dark" ? "text-primary-strong" : ""}>ダーク</span>
    </div>
  );
}
