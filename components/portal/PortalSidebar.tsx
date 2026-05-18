"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LanguageSwitch } from "@/components/portal/LanguageSwitch";
import { useLocale } from "@/components/portal/LocaleProvider";
import { ThemeToggle } from "@/components/portal/ThemeToggle";
import { getToolCopy, portalCopy } from "@/lib/portal-copy";
import { sidebarTools } from "@/lib/tools";

const fixedItems = [
  { label: "Home", href: "/", icon: "H" },
  { label: "Tools", href: "/tools", icon: "T" }
];

function SidebarLink({
  href,
  label,
  icon,
  exact = false
}: {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={[
        "group relative flex items-center justify-center gap-3 rounded-base px-2 py-2.5 text-sm font-semibold transition xl:justify-start xl:px-3",
        active
          ? "bg-primary-soft text-primary-strong"
          : "text-muted hover:bg-surface-muted hover:text-foreground"
      ].join(" ")}
      title={label}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-base bg-surface text-xs font-bold text-primary-strong xl:h-7 xl:w-7">
        {icon}
      </span>
      <span className="hidden xl:inline">{label}</span>
    </Link>
  );
}

export function PortalSidebar({ mode = "default" }: { mode?: "default" | "workspace" }) {
  const { locale } = useLocale();
  const showWorkspaceThemeToggle = mode === "workspace";
  const copy = portalCopy[locale].navigation;

  return (
    <aside className="hidden w-20 shrink-0 border-r border-border bg-surface/78 px-2 py-5 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-hidden xl:w-72 xl:px-4 xl:py-6">
      <Link href="/" className="mb-8 flex items-center justify-center gap-3 px-1 xl:mb-9 xl:justify-start xl:px-2" title="Kuro Stream Kit">
        <span className="grid h-9 w-9 place-items-center rounded-base bg-primary text-lg font-black text-white">
          K
        </span>
        <span className="hidden text-xl font-bold tracking-tight text-foreground xl:inline">Kuro Stream Kit</span>
      </Link>

      <nav className="space-y-6 xl:space-y-8">
        <section>
          <p className="mb-3 hidden px-2 text-xs font-semibold text-muted xl:block">{copy.fixed}</p>
          <div className="space-y-1">
            {fixedItems.map((item) => (
              <SidebarLink key={item.href} {...item} exact={item.href === "/" || item.href === "/tools"} />
            ))}
          </div>
        </section>

        <section className="border-t border-border pt-6">
          <p className="mb-3 hidden px-2 text-xs font-semibold text-muted xl:block">{copy.availableTools}</p>
          <div className="space-y-1">
            {sidebarTools.map((tool) => (
              <SidebarLink key={tool.id} href={tool.href} label={getToolCopy(tool.id, locale).name} icon={tool.icon} />
            ))}
          </div>
        </section>

        <section className="hidden border-t border-dashed border-border pt-6 xl:block">
          <p className="mb-3 px-2 text-xs font-semibold text-muted">{copy.future}</p>
          <div className="space-y-2">
            {copy.futureItems.map((item) => (
              <div key={item} className="flex items-center justify-between rounded-base px-2 py-2 text-sm text-muted">
                <span>{item}</span>
                <span className="rounded-base bg-surface-muted px-2 py-1 text-xs">{copy.comingSoon}</span>
              </div>
            ))}
          </div>
        </section>
      </nav>

      {showWorkspaceThemeToggle ? (
        <div className="mt-auto flex flex-col items-center gap-3 pt-8 xl:hidden">
          <LanguageSwitch variant="compact" />
          <ThemeToggle variant="compact" />
        </div>
      ) : null}

      <div className="mt-auto hidden space-y-5 pt-8 xl:block">
        <div className="panel p-4 shadow-none">
          <p className="text-sm font-bold text-foreground">{copy.loginTitle}</p>
          <p className="mt-2 text-xs leading-5 text-muted">
            {copy.loginBody}
          </p>
          <button className="mt-4 w-full rounded-base bg-primary px-3 py-2 text-sm font-bold text-white opacity-80" disabled>
            {copy.loginButton}
          </button>
        </div>
        {showWorkspaceThemeToggle ? (
          <div className="panel p-4 shadow-none">
            <div className="flex flex-col items-center gap-4">
              <LanguageSwitch />
              <ThemeToggle />
            </div>
          </div>
        ) : null}
        <p className="px-2 text-xs text-muted">© 2026 Kuro Stream Kit</p>
      </div>
    </aside>
  );
}
