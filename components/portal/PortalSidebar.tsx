"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sidebarTools } from "@/lib/tools";

const fixedItems = [
  { label: "Home", href: "/", icon: "H" },
  { label: "Tools", href: "/tools", icon: "T" }
];

const futureItems = ["お気に入り", "最近使ったツール", "ピン留め"];

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

export function PortalSidebar() {
  return (
    <aside className="hidden w-20 shrink-0 border-r border-border bg-surface/78 px-2 py-5 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-hidden xl:w-72 xl:px-4 xl:py-6">
      <Link href="/" className="mb-8 flex items-center justify-center gap-3 px-1 xl:mb-9 xl:justify-start xl:px-2" title="V Streamer Tools">
        <span className="grid h-9 w-9 place-items-center rounded-base bg-primary text-lg font-black text-white">
          V
        </span>
        <span className="hidden text-xl font-bold tracking-tight text-foreground xl:inline">V Streamer Tools</span>
      </Link>

      <nav className="space-y-6 xl:space-y-8">
        <section>
          <p className="mb-3 hidden px-2 text-xs font-semibold text-muted xl:block">固定ナビ</p>
          <div className="space-y-1">
            {fixedItems.map((item) => (
              <SidebarLink key={item.href} {...item} exact={item.href === "/" || item.href === "/tools"} />
            ))}
          </div>
        </section>

        <section className="border-t border-border pt-6">
          <p className="mb-3 hidden px-2 text-xs font-semibold text-muted xl:block">実装済みツール</p>
          <div className="space-y-1">
            {sidebarTools.map((tool) => (
              <SidebarLink key={tool.id} href={tool.href} label={tool.name} icon="SC" />
            ))}
          </div>
        </section>

        <section className="hidden border-t border-dashed border-border pt-6 xl:block">
          <p className="mb-3 px-2 text-xs font-semibold text-muted">将来の機能（予定）</p>
          <div className="space-y-2">
            {futureItems.map((item) => (
              <div key={item} className="flex items-center justify-between rounded-base px-2 py-2 text-sm text-muted">
                <span>{item}</span>
                <span className="rounded-base bg-surface-muted px-2 py-1 text-xs">近日対応</span>
              </div>
            ))}
          </div>
        </section>
      </nav>

      <div className="mt-auto hidden space-y-5 pt-8 xl:block">
        <div className="panel p-4 shadow-none">
          <p className="text-sm font-bold text-foreground">ログインするともっと便利に</p>
          <p className="mt-2 text-xs leading-5 text-muted">
            お気に入りや履歴の保存など、あなた専用の体験は後続フェーズで追加予定です。
          </p>
          <button className="mt-4 w-full rounded-base bg-primary px-3 py-2 text-sm font-bold text-white opacity-80" disabled>
            ログイン予定
          </button>
        </div>
        <p className="px-2 text-xs text-muted">© 2026 V Streamer Tools</p>
      </div>
    </aside>
  );
}
