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
      ? "h-[calc(100vh-4rem)] w-full overflow-hidden"
      : "mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 lg:py-8";
  const shellClassName = mode === "workspace" ? "h-screen overflow-hidden lg:flex" : "min-h-screen lg:flex";

  return (
    <div className={shellClassName}>
      <PortalSidebar />
      <div className="min-w-0 flex-1">
        <PortalHeader />
        <main className={mainClassName}>{children}</main>
      </div>
    </div>
  );
}
