import type { ReactNode } from "react";
import { PortalHeader } from "@/components/portal/PortalHeader";
import { PortalSidebar } from "@/components/portal/PortalSidebar";

export function PortalShell({
  children,
  mode = "default"
}: {
  children: ReactNode;
  mode?: "default" | "workspace";
}) {
  const mainClassName =
    mode === "workspace"
      ? "h-[calc(100vh-4rem)] w-full overflow-hidden lg:h-screen"
      : "mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8";
  const shellClassName = mode === "workspace" ? "h-screen overflow-hidden lg:flex" : "min-h-screen lg:flex";

  return (
    <div className={shellClassName}>
      <PortalSidebar mode={mode} />
      <div className="min-w-0 flex-1">
        <div className={mode === "workspace" ? "lg:hidden" : undefined}>
          <PortalHeader mode={mode} />
        </div>
        <main className={mainClassName}>{children}</main>
      </div>
    </div>
  );
}
