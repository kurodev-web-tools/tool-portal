import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";
import { commentTranslatorAdminDashboardPath, globalAdminDashboardPath } from "@/lib/comment-translator-admin-shortcut-shared";
import { readCommentTranslatorAdminAccessForAccountSession } from "@/lib/comment-translator-admin-access-gate";
import { getAccountSessionState } from "@/lib/supabase/session";

export const metadata: Metadata = {
  title: "Admin dashboard",
  description: "Admin-only management dashboard for Kuro Stream Kit operations."
};

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const accountSession = await getAccountSessionState();

  if (accountSession.authStatus === "signed-out") {
    redirect(`/login?next=${globalAdminDashboardPath}`);
  }

  if (accountSession.authStatus === "recovery-pending") {
    redirect("/account/security?auth=recovery-pending");
  }

  const access = readCommentTranslatorAdminAccessForAccountSession({ accountSession });

  return (
    <PortalShell mode="workspace" accountStatus={accountSession}>
      <main className="mx-auto grid w-full max-w-6xl min-w-0 gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="grid min-w-0 gap-2">
          <p className="text-sm font-black uppercase tracking-normal text-primary-strong">Admin</p>
          <h1 className="break-words text-2xl font-black text-foreground sm:text-3xl">Admin dashboard</h1>
          <p className="max-w-3xl break-words text-sm font-semibold leading-6 text-muted">
            Management entry point for reviewed admin surfaces. Tool-specific operations stay behind their own
            server-gated dashboards.
          </p>
        </header>

        <section className="panel min-w-0 p-4 sm:p-5" data-admin-dashboard="server-allowlisted-admin-only">
          {access.status === "blocked" ? (
            <div className="rounded-base border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
              {access.reason === "admin-allowlist"
                ? "Admin access is not available for this signed-in account."
                : "Sign in with an allowed admin account to view this dashboard."}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Link
                href={commentTranslatorAdminDashboardPath}
                className="rounded-base border border-border bg-surface px-4 py-4 transition hover:border-primary hover:bg-primary-soft/45"
              >
                <p className="text-xs font-black uppercase tracking-normal text-primary-strong">Management dashboard</p>
                <h2 className="mt-2 text-lg font-black text-foreground">Kuro Live Comment Translator</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-muted">
                  Open the Comment Translator admin dashboard and its reviewed read-only operation views.
                </p>
              </Link>

              <div aria-disabled="true" className="rounded-base border border-dashed border-border bg-surface-muted/45 px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-xs font-black uppercase tracking-normal text-muted">Planned</p>
                  <span className="rounded-base border border-border bg-surface px-2.5 py-1 text-xs font-black text-muted">
                    Disabled
                  </span>
                </div>
                <h2 className="mt-2 text-lg font-black text-foreground">More admin areas</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-muted">
                  Additional management areas remain future work and are not exposed by this dashboard.
                </p>
              </div>
            </div>
          )}
        </section>
      </main>
    </PortalShell>
  );
}
