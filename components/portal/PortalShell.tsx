import type { ReactNode } from "react";
import { PortalHeader } from "@/components/portal/PortalHeader";
import { PortalSidebar } from "@/components/portal/PortalSidebar";

export function PortalShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen lg:flex">
      <PortalSidebar />
      <div className="min-w-0 flex-1">
        <PortalHeader />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
