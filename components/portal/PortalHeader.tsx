"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LanguageSwitch } from "@/components/portal/LanguageSwitch";
import { useLocale } from "@/components/portal/LocaleProvider";
import { PortalSettingsPanel } from "@/components/portal/PortalSettingsPanel";
import { SiteTipsDialog } from "@/components/portal/SiteTipsDialog";
import { ThemeToggle } from "@/components/portal/ThemeToggle";
import type { CommentTranslatorAdminShortcutState } from "@/lib/comment-translator-admin-shortcut-shared";
import { getToolCopy, portalCopy } from "@/lib/portal-copy";
import type { AccountSessionState } from "@/lib/supabase/session";
import { sidebarTools } from "@/lib/tools";

type NavigationCopy = (typeof portalCopy)["ja"]["navigation"] | (typeof portalCopy)["en"]["navigation"];

function getAccountCta(copy: NavigationCopy, accountStatus: AccountSessionState) {
  const signedIn = accountStatus.authStatus === "signed-in";
  const recoveryPending = accountStatus.authStatus === "recovery-pending";
  const email = accountStatus.user?.email ?? null;

  return {
    accountHref: recoveryPending ? "/account/security" : signedIn ? "/account" : "/login",
    accountCta: {
      title: recoveryPending ? copy.recoveryPendingTitle : signedIn ? copy.loginSignedInTitle : copy.loginTitle,
      body: recoveryPending ? copy.recoveryPendingBody : signedIn ? (email ?? copy.loginSignedInBody) : copy.loginBody,
      button: recoveryPending ? copy.recoveryPendingButton : signedIn ? copy.accountSettingsButton : copy.loginButton
    }
  };
}

export function PortalHeader({
  mode = "default",
  accountStatus,
  adminShortcut
}: {
  mode?: "default" | "workspace";
  accountStatus: AccountSessionState;
  adminShortcut: CommentTranslatorAdminShortcutState;
}) {
  const { locale } = useLocale();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const showDesktopTitle = mode !== "workspace";
  const copy = portalCopy[locale].navigation;
  const { accountHref, accountCta } = getAccountCta(copy, accountStatus);
  const isAccountRoute = pathname.startsWith("/account") || pathname.startsWith("/login") || pathname.startsWith("/signup") || pathname.startsWith("/reset-password");
  const showTipsButton = !isAccountRoute;
  const showSettingsControls = mode !== "workspace" && !isAccountRoute;
  const adminShortcutAvailable = adminShortcut.status === "available";
  const title = useMemo(() => {
    if (pathname === "/") {
      return "Kuro Stream Kit";
    }

    if (pathname.startsWith("/tools/schedule-calendar")) {
      return copy.toolTitles["schedule-calendar"];
    }

    if (pathname.startsWith("/tools/comment-translator")) {
      return copy.toolTitles["comment-translator"];
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

    if (pathname.startsWith("/account")) {
      return copy.toolTitles.account;
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
    { href: "/", label: copy.home },
    { href: "/tools", label: copy.tools },
    ...sidebarTools.map((tool) => ({
      href: tool.href,
      label: getToolCopy(tool.id, locale).name
    }))
  ];

  return (
    <>
      <header className="sticky top-0 z-[70] flex h-16 items-center justify-between gap-3 border-b border-border bg-background/92 px-4 backdrop-blur sm:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3 lg:hidden">
          <Link href="/" className="grid h-8 w-8 shrink-0 place-items-center rounded-base bg-primary text-sm font-black text-white">
            K
          </Link>
          <span className="min-w-0 truncate text-base font-bold tracking-tight text-foreground">{title}</span>
        </div>
        {showDesktopTitle ? <span className="hidden min-w-0 truncate text-base font-bold tracking-tight text-foreground lg:block">{title}</span> : <span className="hidden lg:block" />}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {showTipsButton ? <SiteTipsDialog pathname={pathname} variant="header" /> : null}
          <div className={showSettingsControls ? "hidden items-center gap-3 lg:flex" : "hidden"}>
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
        </div>
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
              {adminShortcutAvailable ? (
                <Link
                  href={adminShortcut.href}
                  onClick={() => setDrawerOpen(false)}
                  data-comment-translator-admin-shortcut="server-allowlisted-admin-only"
                  className={[
                    "block rounded-base border px-3 py-3 text-sm font-bold transition",
                    pathname.startsWith(adminShortcut.href)
                      ? "border-primary bg-primary-soft text-primary-strong"
                      : "border-border bg-surface-muted text-foreground hover:bg-surface"
                  ].join(" ")}
                >
                  {adminShortcut.label}
                </Link>
              ) : null}
            </nav>
            <div className="mb-4 rounded-base border border-border bg-surface-muted/55 p-3">
              <p className="text-sm font-black text-foreground">{accountCta.title}</p>
              <p className="mt-1 break-words text-xs leading-5 text-muted">{accountCta.body}</p>
              <Link
                href={accountHref}
                onClick={() => setDrawerOpen(false)}
                className="mt-3 inline-flex w-full justify-center rounded-base bg-primary px-3 py-2 text-sm font-bold text-white transition hover:bg-primary-strong"
              >
                {accountCta.button}
              </Link>
            </div>
            <PortalSettingsPanel variant="drawer" />
          </aside>
        </>
      ) : null}
    </>
  );
}
