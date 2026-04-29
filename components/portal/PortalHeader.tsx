"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/portal/ThemeToggle";

export function PortalHeader() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const title = useMemo(() => {
    if (pathname === "/") {
      return "V Streamer Tools";
    }

    if (pathname.startsWith("/tools/schedule-calendar")) {
      return "スケジュールカレンダー";
    }

    if (pathname.startsWith("/tools")) {
      return "ツール一覧";
    }

    return "V Streamer Tools";
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [drawerOpen]);

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/tools", label: "Tools" },
    { href: "/tools/schedule-calendar", label: "Schedule Calendar" }
  ];

  return (
    <>
      <header className="sticky top-0 z-[70] flex h-16 items-center justify-between gap-3 border-b border-border bg-background/92 px-4 backdrop-blur sm:px-8">
        <div className="flex min-w-0 items-center gap-3 lg:hidden">
          <Link href="/" className="grid h-8 w-8 shrink-0 place-items-center rounded-base bg-primary text-sm font-black text-white">
            V
          </Link>
          <span className="min-w-0 truncate text-base font-bold tracking-tight text-foreground">{title}</span>
        </div>
        <span className="hidden min-w-0 truncate text-base font-bold tracking-tight text-foreground lg:block">{title}</span>
        <div className="hidden lg:block">
          <ThemeToggle />
        </div>
        <button
          type="button"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-base border border-border bg-surface text-foreground lg:hidden"
          aria-label="メニューを開く"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
        >
          <span className="flex flex-col gap-1">
            <span className="block h-0.5 w-5 rounded-full bg-current" />
            <span className="block h-0.5 w-5 rounded-full bg-current" />
            <span className="block h-0.5 w-5 rounded-full bg-current" />
          </span>
        </button>
      </header>
      {drawerOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[80] bg-black/50 lg:hidden"
            aria-label="メニューを閉じる"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="fixed bottom-0 right-0 top-0 z-[90] flex w-[min(82vw,20rem)] flex-col border-l border-border bg-surface p-4 shadow-2xl lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-base bg-primary text-sm font-black text-white">
                  V
                </span>
                <span className="text-sm font-bold text-foreground">V Streamer Tools</span>
              </div>
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-base border border-border text-lg text-muted"
                aria-label="メニューを閉じる"
                onClick={() => setDrawerOpen(false)}
              >
                ×
              </button>
            </div>
            <nav className="mt-6 space-y-2">
              {navItems.map((item) => {
                const active =
                  item.href === "/" || item.href === "/tools"
                    ? pathname === item.href
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={[
                      "block rounded-base border px-3 py-3 text-sm font-bold transition",
                      active ? "border-primary bg-primary-soft text-primary-strong" : "border-border bg-surface-muted text-foreground hover:bg-surface"
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-auto rounded-base border border-border bg-surface-muted/45 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-foreground">表示テーマ</span>
                <ThemeToggle />
              </div>
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}
