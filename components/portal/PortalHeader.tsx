"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LanguageSwitch } from "@/components/portal/LanguageSwitch";
import { useLocale } from "@/components/portal/LocaleProvider";
import { PortalSettingsPanel } from "@/components/portal/PortalSettingsPanel";
import { ThemeToggle } from "@/components/portal/ThemeToggle";
import { getToolCopy, portalCopy } from "@/lib/portal-copy";
import { sidebarTools } from "@/lib/tools";

export function PortalHeader({ mode = "default" }: { mode?: "default" | "workspace" }) {
  const { locale } = useLocale();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const showDesktopTitle = mode !== "workspace";
  const copy = portalCopy[locale].navigation;
  const title = useMemo(() => {
    if (pathname === "/") {
      return "Kuro Stream Kit";
    }

    if (pathname.startsWith("/tools/schedule-calendar")) {
      return copy.toolTitles["schedule-calendar"];
    }

    if (pathname.startsWith("/tools/thumbnail-editor")) {
      return copy.toolTitles["thumbnail-editor"];
    }

    if (pathname.startsWith("/tools/sns-split-image-maker")) {
      return copy.toolTitles["sns-split-image-maker"];
    }

    if (pathname.startsWith("/tools")) {
      return copy.toolTitles.tools;
    }

    return "Kuro Stream Kit";
  }, [copy.toolTitles, pathname]);

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
    ...sidebarTools.map((tool) => ({
      href: tool.href,
      label: getToolCopy(tool.id, locale).name
    }))
  ];

  return (
    <>
      <header className="sticky top-0 z-[70] flex h-16 items-center justify-between gap-3 border-b border-border bg-background/92 px-4 backdrop-blur sm:px-8">
        <div className="flex min-w-0 items-center gap-3 lg:hidden">
          <Link href="/" className="grid h-8 w-8 shrink-0 place-items-center rounded-base bg-primary text-sm font-black text-white">
            K
          </Link>
          <span className="min-w-0 truncate text-base font-bold tracking-tight text-foreground">{title}</span>
        </div>
        {showDesktopTitle ? <span className="hidden min-w-0 truncate text-base font-bold tracking-tight text-foreground lg:block">{title}</span> : <span className="hidden lg:block" />}
        <div className={mode === "workspace" ? "hidden" : "hidden items-center gap-3 lg:flex"}>
          <LanguageSwitch />
          <ThemeToggle />
        </div>
        <button
          type="button"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-base border border-border bg-surface text-foreground lg:hidden"
          aria-label={copy.menuOpen}
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
            aria-label={copy.menuClose}
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="fixed bottom-0 right-0 top-0 z-[90] flex w-[min(82vw,20rem)] flex-col border-l border-border bg-surface p-4 shadow-2xl lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-base bg-primary text-sm font-black text-white">
                  K
                </span>
                <span className="text-sm font-bold text-foreground">Kuro Stream Kit</span>
              </div>
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-base border border-border text-lg text-muted"
                aria-label={copy.menuClose}
                onClick={() => setDrawerOpen(false)}
              >
                ×
              </button>
            </div>
            <nav className="mt-6 min-h-0 flex-1 space-y-2 overflow-y-auto pb-4">
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
            <PortalSettingsPanel variant="drawer" />
          </aside>
        </>
      ) : null}
    </>
  );
}
