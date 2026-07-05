import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";
import { commentTranslatorAdminDashboardPath } from "@/lib/comment-translator-admin-shortcut-shared";
import { readCommentTranslatorAdminAccess } from "@/lib/comment-translator-admin-access-gate";
import { getAccountSessionState } from "@/lib/supabase/session";

export const metadata: Metadata = {
  title: "Comment Translator admin",
  description: "Admin-only dashboard shell for Kuro Live Comment Translator operations."
};

export const dynamic = "force-dynamic";

const creatorWaitlistAdminPath = "/admin/comment-translator/creator-waitlist";

export default async function CommentTranslatorAdminDashboardPage() {
  const accountSession = await getAccountSessionState();

  if (accountSession.authStatus === "signed-out") {
    redirect(`/login?next=${commentTranslatorAdminDashboardPath}`);
  }

  if (accountSession.authStatus === "recovery-pending") {
    redirect("/account/security?auth=recovery-pending");
  }

  const access = readCommentTranslatorAdminAccess({
    account:
      accountSession.authStatus === "signed-in" && accountSession.user?.id
        ? {
            status: "authenticated",
            ownerUserId: accountSession.user.id
          }
        : {
            status: "unauthenticated",
            reason: accountSession.authStatus === "unavailable" ? "auth-unavailable" : "caller-not-authenticated"
          }
  });

  return (
    <PortalShell mode="workspace" accountStatus={accountSession}>
      <main className="mx-auto grid w-full max-w-6xl min-w-0 gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="grid min-w-0 gap-2">
          <p className="text-sm font-black uppercase tracking-normal text-primary-strong">Kuro Live Comment Translator</p>
          <h1 className="break-words text-2xl font-black text-foreground sm:text-3xl">Comment Translator admin</h1>
          <p className="max-w-3xl break-words text-sm font-semibold leading-6 text-muted">
            Admin-only shell for the current free public beta integration line. This page links to reviewed read-only
            admin surfaces and keeps future operational mutations disabled until a dedicated approval-gated PR.
          </p>
        </header>

        <section
          className="panel min-w-0 p-4 sm:p-5"
          data-comment-translator-admin-dashboard="server-allowlisted-admin-only"
        >
          {access.status === "blocked" ? (
            <div className="rounded-base border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
              {access.reason === "admin-allowlist"
                ? "Admin access is not available for this signed-in account."
                : "Sign in with an allowed admin account to view this dashboard."}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Link
                href={creatorWaitlistAdminPath}
                className="rounded-base border border-border bg-surface px-4 py-4 transition hover:border-primary hover:bg-primary-soft/45"
              >
                <p className="text-xs font-black uppercase tracking-normal text-primary-strong">Read-only admin</p>
                <h2 className="mt-2 text-lg font-black text-foreground">Creator waitlist</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-muted">
                  Review Creator closed beta pre-registrations with count, campaign, status, registered date, email, and
                  display name only.
                </p>
              </Link>

              <div
                aria-disabled="true"
                data-comment-translator-admin-planned-tool="disabled-rate-limit-tools"
                className="rounded-base border border-dashed border-border bg-surface-muted/45 px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-xs font-black uppercase tracking-normal text-muted">Planned</p>
                  <span className="rounded-base border border-border bg-surface px-2.5 py-1 text-xs font-black text-muted">
                    Disabled
                  </span>
                </div>
                <h2 className="mt-2 text-lg font-black text-foreground">Rate-limit tools</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-muted">
                  Specific-user unblock and all-user reset remain future operational tools. This shell does not expose
                  mutation controls, endpoints, or server actions.
                </p>
              </div>
            </div>
          )}
        </section>
      </main>
    </PortalShell>
  );
}
