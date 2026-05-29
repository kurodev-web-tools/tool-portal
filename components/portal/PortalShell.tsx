import type { ReactNode } from "react";
import { AccountRemoteDisplaySettingsApplier } from "@/components/account/AccountRemoteDisplaySettingsApplier";
import { PortalHeader } from "@/components/portal/PortalHeader";
import { PortalSidebar } from "@/components/portal/PortalSidebar";
import { getAccountSessionState } from "@/lib/supabase/session";

export async function PortalShell({
  children,
  mode = "default",
  accountStatus: providedAccountStatus
}: {
  children: ReactNode;
  mode?: "default" | "workspace";
  accountStatus?: Awaited<ReturnType<typeof getAccountSessionState>>;
}) {
  const accountStatus = providedAccountStatus ?? await getAccountSessionState();
  const mainClassName =
    mode === "workspace"
      ? "h-[calc(100vh-4rem)] w-full overflow-hidden lg:h-screen"
      : "mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8";
  const shellClassName = mode === "workspace" ? "h-screen overflow-hidden lg:flex" : "min-h-screen lg:flex";

  return (
    <div className={shellClassName}>
      <AccountRemoteDisplaySettingsApplier accountStatus={accountStatus} />
      <PortalSidebar mode={mode} accountStatus={accountStatus} />
      <div className="min-w-0 flex-1">
        <div className={mode === "workspace" ? "lg:hidden" : undefined}>
          <PortalHeader mode={mode} accountStatus={accountStatus} />
        </div>
        <main className={mainClassName}>{children}</main>
      </div>
    </div>
  );
}
