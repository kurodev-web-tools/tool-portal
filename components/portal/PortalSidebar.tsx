"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type RefObject } from "react";
import { useLocale } from "@/components/portal/LocaleProvider";
import { PortalSettingsPanel } from "@/components/portal/PortalSettingsPanel";
import { SiteTipsDialog } from "@/components/portal/SiteTipsDialog";
import {
  setPortalWorkspaceSidebarState,
  usePortalWorkspaceSidebarState,
  type PortalWorkspaceSidebarState
} from "@/components/portal/PortalWorkspaceSidebarState";
import type { CommentTranslatorAdminShortcutState } from "@/lib/comment-translator-admin-shortcut-shared";
import { getToolCopy, portalCopy } from "@/lib/portal-copy";
import type { AccountSessionBrowserSafeViewModel } from "@/lib/supabase/session";
import { sidebarTools } from "@/lib/tools";

function SidebarLink({
  href,
  label,
  icon,
  layout,
  exact = false
}: {
  href: string;
  label: string;
  icon: string;
  layout: "responsive" | "expanded" | "rail";
  exact?: boolean;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={[
        "group relative flex items-center gap-3 rounded-base py-2.5 text-sm font-semibold transition",
        layout === "expanded" ? "justify-start px-3" : layout === "rail" ? "justify-center px-2" : "justify-center px-2 xl:justify-start xl:px-3",
        active
          ? "bg-primary-soft text-primary-strong"
          : "text-muted hover:bg-surface-muted hover:text-foreground"
      ].join(" ")}
      aria-label={label}
      title={label}
    >
      <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-base bg-surface text-xs font-bold text-primary-strong xl:h-7 xl:w-7">
        {icon}
      </span>
      <span className={layout === "expanded" ? "inline" : layout === "rail" ? "hidden" : "hidden xl:inline"}>{label}</span>
    </Link>
  );
}

function SidebarSectionLabel({ label, layout }: { readonly label: string; readonly layout: "responsive" | "expanded" | "rail" }) {
  return (
    <div className={["mb-3 items-center gap-2 px-2", layout === "expanded" ? "flex" : layout === "rail" ? "hidden" : "hidden xl:flex"].join(" ")}>
      <span className="h-px flex-1 bg-border" />
      <span className="shrink-0 text-[11px] font-bold uppercase tracking-normal text-muted/80">{label}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function WorkspaceSidebarControls({
  state,
  copy,
  expandedControlRef,
  onStateChange
}: {
  readonly state: PortalWorkspaceSidebarState;
  readonly copy: NavigationCopy;
  readonly expandedControlRef: RefObject<HTMLButtonElement | null>;
  readonly onStateChange: (state: PortalWorkspaceSidebarState) => void;
}) {
  const controls = [
    { state: "expanded", label: copy.workspaceSidebarExpand, shortLabel: copy.workspaceSidebarExpandedShort, icon: "E" },
    { state: "rail", label: copy.workspaceSidebarRail, shortLabel: copy.workspaceSidebarRailShort, icon: "R" },
    { state: "hidden", label: copy.workspaceSidebarHide, shortLabel: copy.workspaceSidebarHiddenShort, icon: "H" }
  ] as const;

  return (
    <div className={state === "expanded" ? "mb-3 grid grid-cols-3 gap-1" : "mb-3 flex flex-col items-center gap-1"} aria-label={copy.workspaceSidebarExpand}>
      {controls.map((control) => (
        <button
          key={control.state}
          ref={control.state === "expanded" ? expandedControlRef : undefined}
          type="button"
          data-portal-workspace-sidebar-control={control.state}
          className={[
            "inline-flex min-h-9 items-center justify-center rounded-base border text-xs font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            state === "expanded" ? "px-1" : "h-9 w-9",
            state === control.state ? "border-primary bg-primary-soft text-primary-strong" : "border-border bg-surface text-muted hover:border-primary/60 hover:text-primary-strong"
          ].join(" ")}
          aria-label={control.label}
          aria-pressed={state === control.state}
          title={control.label}
          onClick={() => onStateChange(control.state)}
        >
          <span aria-hidden="true">{state === "expanded" ? control.shortLabel : control.icon}</span>
        </button>
      ))}
    </div>
  );
}

type NavigationCopy = (typeof portalCopy)["ja"]["navigation"] | (typeof portalCopy)["en"]["navigation"];

function getAccountCta(copy: NavigationCopy, accountStatus: AccountSessionBrowserSafeViewModel) {
  const signedIn = accountStatus.authStatus === "signed-in";
  const recoveryPending = accountStatus.authStatus === "recovery-pending";
  const email = accountStatus.user?.email ?? null;

  return {
    signedIn,
    accountHref: recoveryPending ? "/account/security" : signedIn ? "/account" : "/login",
    accountCta: {
      title: recoveryPending ? copy.recoveryPendingTitle : signedIn ? copy.loginSignedInTitle : copy.loginTitle,
      body: recoveryPending ? copy.recoveryPendingBody : signedIn ? (email ?? copy.loginSignedInBody) : copy.loginBody,
      button: recoveryPending ? copy.recoveryPendingButton : signedIn ? copy.accountSettingsButton : copy.loginButton
    }
  };
}

export function PortalSidebar({
  mode = "default",
  accountStatus,
  adminShortcut
}: {
  mode?: "default" | "workspace";
  accountStatus: AccountSessionBrowserSafeViewModel;
  adminShortcut: CommentTranslatorAdminShortcutState;
}) {
  const { locale } = useLocale();
  const pathname = usePathname();
  const showWorkspaceSettings = mode === "workspace";
  const workspaceSidebarState = usePortalWorkspaceSidebarState(mode === "workspace");
  const reopenButtonRef = useRef<HTMLButtonElement>(null);
  const expandedControlRef = useRef<HTMLButtonElement>(null);
  const focusTargetRef = useRef<"reopen" | "expanded" | null>(null);
  const layout = mode === "default" ? "responsive" : workspaceSidebarState === "expanded" ? "expanded" : "rail";
  const copy = portalCopy[locale].navigation;
  const { signedIn, accountHref, accountCta } = getAccountCta(copy, accountStatus);
  const accountRailLabel = signedIn ? copy.accountSettingsButton : copy.loginButton;
  const adminShortcutAvailable = adminShortcut.status === "available";
  const topLevelItems = [
    { label: copy.home, href: "/", icon: "H" },
    { label: copy.tools, href: "/tools", icon: "T" }
  ];

  useEffect(() => {
    if (focusTargetRef.current === "reopen" && workspaceSidebarState === "hidden") {
      reopenButtonRef.current?.focus();
      focusTargetRef.current = null;
    } else if (focusTargetRef.current === "expanded" && workspaceSidebarState === "expanded") {
      expandedControlRef.current?.focus();
      focusTargetRef.current = null;
    }
  }, [workspaceSidebarState]);

  const changeWorkspaceSidebarState = (nextState: PortalWorkspaceSidebarState) => {
    if (nextState === "hidden") {
      focusTargetRef.current = "reopen";
    } else if (workspaceSidebarState === "hidden") {
      focusTargetRef.current = "expanded";
    } else {
      focusTargetRef.current = null;
    }
    setPortalWorkspaceSidebarState(nextState);
  };

  return (
    <>
      {mode === "workspace" && workspaceSidebarState === "hidden" ? (
        <button
          ref={reopenButtonRef}
          type="button"
          data-portal-workspace-sidebar-reopen="visible-when-hidden"
          className="fixed bottom-3 left-3 z-[60] hidden min-h-10 items-center gap-2 rounded-base border border-border bg-surface px-3 py-2 text-sm font-black text-primary-strong shadow-sm transition hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:inline-flex"
          aria-label={copy.workspaceSidebarExpand}
          aria-expanded={workspaceSidebarState !== "hidden"}
          aria-controls="portal-workspace-sidebar"
          onClick={() => changeWorkspaceSidebarState("expanded")}
        >
          <span aria-hidden="true">E</span>
          <span>{copy.workspaceSidebarExpand}</span>
        </button>
      ) : null}
      <aside
        id="portal-workspace-sidebar"
        data-portal-workspace-sidebar-state={workspaceSidebarState}
        className={[
          "shrink-0 border-r border-border bg-surface/78 lg:sticky lg:top-0 lg:h-screen lg:flex-col lg:overflow-hidden",
          mode === "workspace" && workspaceSidebarState === "hidden" ? "hidden" : "hidden lg:flex",
          layout === "expanded" ? "w-72 px-4 py-6" : layout === "rail" ? "w-20 px-2 py-5" : "w-20 px-2 py-5 xl:w-72 xl:px-4 xl:py-6"
        ].join(" ")}
      >
      <Link href="/" className={["mb-5 flex shrink-0 items-center gap-3 px-1", layout === "expanded" ? "justify-start px-2" : layout === "rail" ? "justify-center" : "justify-center xl:mb-6 xl:justify-start xl:px-2"].join(" ")} title="Kuro Stream Kit">
        <span className="grid h-9 w-9 place-items-center rounded-base bg-primary text-lg font-black text-white">
          K
        </span>
        <span className={["text-xl font-bold tracking-tight text-foreground", layout === "expanded" ? "inline" : layout === "rail" ? "hidden" : "hidden xl:inline"].join(" ")}>Kuro Stream Kit</span>
      </Link>

      <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0 scrollbar-accent xl:pr-1" aria-label="Portal navigation">
        <div className={layout === "expanded" ? "space-y-6 pb-4" : "space-y-5 pb-4 xl:space-y-6"}>
          <section>
            <div className="space-y-1">
              {topLevelItems.map((item) => (
                <SidebarLink key={item.href} {...item} layout={layout} exact={item.href === "/"} />
              ))}
            </div>
          </section>

          <section className={layout === "rail" ? "hidden" : layout === "expanded" ? "block" : "hidden xl:block"}>
            <SidebarSectionLabel label={copy.availableTools} layout={layout} />
            <div className="space-y-1">
              {sidebarTools.map((tool) => (
                <SidebarLink key={tool.id} href={tool.href} label={getToolCopy(tool.id, locale).name} icon={tool.icon} layout={layout} />
              ))}
            </div>
          </section>

          {adminShortcutAvailable ? (
            <section>
              <SidebarSectionLabel label="Admin" layout={layout} />
              <Link
                href={adminShortcut.href}
                data-comment-translator-admin-shortcut="server-allowlisted-admin-only"
                className={[
                  "group relative flex items-center gap-3 rounded-base py-2.5 text-sm font-semibold transition",
                  layout === "expanded" ? "justify-start px-3" : layout === "rail" ? "justify-center px-2" : "justify-center px-2 xl:justify-start xl:px-3",
                  pathname === adminShortcut.href || pathname.startsWith(`${adminShortcut.href}/`)
                    ? "bg-primary-soft text-primary-strong"
                    : "text-muted hover:bg-surface-muted hover:text-foreground"
                ].join(" ")}
                aria-label={copy.adminDashboard}
                title={copy.adminDashboard}
              >
                <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-base bg-surface text-xs font-bold text-primary-strong xl:h-7 xl:w-7">
                  A
                </span>
                <span className={layout === "expanded" ? "min-w-0 truncate" : layout === "rail" ? "hidden" : "hidden min-w-0 truncate xl:inline"}>{copy.adminDashboard}</span>
              </Link>
            </section>
          ) : null}
        </div>
      </nav>

      <div className={layout === "expanded" ? "shrink-0 border-t border-border pt-4" : "shrink-0 border-t border-border pt-3 xl:pt-4"}>
        {mode === "workspace" ? (
          <WorkspaceSidebarControls
            state={workspaceSidebarState}
            copy={copy}
            expandedControlRef={expandedControlRef}
            onStateChange={changeWorkspaceSidebarState}
          />
        ) : null}
        <div className={layout === "expanded" ? "hidden" : layout === "rail" ? "flex flex-col items-center gap-3" : "flex flex-col items-center gap-3 xl:hidden"}>
          {showWorkspaceSettings ? <SiteTipsDialog pathname={pathname} variant="rail" /> : null}
          {showWorkspaceSettings ? <PortalSettingsPanel variant="rail" /> : null}
          <Link
            href={accountHref}
            className="grid h-10 w-10 place-items-center rounded-base border border-border bg-surface text-xs font-black text-primary-strong transition hover:bg-surface-muted"
            aria-label={accountRailLabel}
            title={accountRailLabel}
          >
            A
          </Link>
        </div>

        <div className={layout === "expanded" ? "space-y-3" : layout === "rail" ? "hidden" : "hidden space-y-3 xl:block"}>
          {showWorkspaceSettings ? <SiteTipsDialog pathname={pathname} variant="panel" /> : null}
          {showWorkspaceSettings ? <PortalSettingsPanel /> : null}
          {showWorkspaceSettings ? (
            <div className="rounded-base border border-dashed border-border bg-surface-muted/35 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-xs font-bold text-muted">{accountCta.title}</span>
                <Link href={accountHref} className="shrink-0 rounded-base bg-surface px-2 py-1 text-[11px] font-bold text-primary-strong">
                  {accountCta.button}
                </Link>
              </div>
            </div>
          ) : (
            <div className="panel p-4 shadow-none">
              <p className="text-sm font-bold text-foreground">{accountCta.title}</p>
              <p className="mt-2 break-words text-xs leading-5 text-muted">{accountCta.body}</p>
              <Link href={accountHref} className="mt-4 inline-flex w-full justify-center rounded-base bg-primary px-3 py-2 text-sm font-bold text-white transition hover:bg-primary-strong">
                {accountCta.button}
              </Link>
            </div>
          )}
          <p className="px-2 text-xs text-muted">© 2026 Kuro Stream Kit</p>
        </div>
      </div>
      </aside>
    </>
  );
}
