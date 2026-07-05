import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";
import { readCommentTranslatorCreatorWaitlistAdminPageState } from "@/lib/comment-translator-creator-waitlist-admin";
import { getAccountSessionState } from "@/lib/supabase/session";

export const metadata: Metadata = {
  title: "Creator waitlist admin",
  description: "Review Creator closed beta pre-registrations for Kuro Live Comment Translator."
};

export const dynamic = "force-dynamic";

const waitlistAdminPath = "/admin/comment-translator/creator-waitlist";

export default async function CommentTranslatorCreatorWaitlistAdminPage() {
  const accountSession = await getAccountSessionState();

  if (accountSession.authStatus === "signed-out") {
    redirect(`/login?next=${waitlistAdminPath}`);
  }

  if (accountSession.authStatus === "recovery-pending") {
    redirect("/account/security?auth=recovery-pending");
  }

  const state = await readCommentTranslatorCreatorWaitlistAdminPageState({
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
    <PortalShell mode="workspace">
      <main className="mx-auto grid w-full max-w-6xl min-w-0 gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="grid min-w-0 gap-2">
          <p className="text-sm font-black uppercase tracking-normal text-primary-strong">Kuro Live Comment Translator</p>
          <h1 className="break-words text-2xl font-black text-foreground sm:text-3xl">Creator waitlist admin</h1>
          <p className="max-w-3xl break-words text-sm font-semibold leading-6 text-muted">
            Admin-only view for Creator closed beta pre-registrations. The table shows account email or display name
            when available, campaign, status, and registered date only.
          </p>
        </header>

        <section className="panel min-w-0 p-4" data-comment-translator-admin-waitlist="sanitized-admin-waitlist-list-only">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-black text-foreground">Registrations</h2>
              <p className="mt-1 break-words text-sm font-semibold text-muted">
                Access is gated by <span className="break-all">COMMENT_TRANSLATOR_ADMIN_ALLOWED_USER_HASHES</span>.
              </p>
            </div>
            <span className="rounded-base border border-primary/30 bg-primary-soft px-3 py-1 text-sm font-black text-primary-strong">
              {state.count} total
            </span>
          </div>

          {state.status === "blocked" ? (
            <div className="mt-4 rounded-base border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
              {state.reason === "admin-allowlist"
                ? "Admin access is not available for this signed-in account."
                : "Sign in with an allowed admin account to view registrations."}
            </div>
          ) : null}

          {state.status === "unavailable" ? (
            <div className="mt-4 rounded-base border border-red-200 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-800">
              Creator waitlist registrations are unavailable in this environment.
            </div>
          ) : null}

          {state.status === "available" && state.registrations.length === 0 ? (
            <div className="mt-4 rounded-base border border-border bg-background/70 p-4 text-sm font-semibold leading-6 text-muted">
              No Creator closed beta registrations yet.
            </div>
          ) : null}

          {state.status === "available" && state.registrations.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-sm">
                <thead>
                  <tr className="text-xs font-black uppercase tracking-normal text-muted">
                    <th className="border-b border-border px-3 py-2">Registered</th>
                    <th className="border-b border-border px-3 py-2">Campaign</th>
                    <th className="border-b border-border px-3 py-2">Status</th>
                    <th className="border-b border-border px-3 py-2">Email</th>
                    <th className="border-b border-border px-3 py-2">Display name</th>
                    <th className="border-b border-border px-3 py-2">Discount intent</th>
                  </tr>
                </thead>
                <tbody>
                  {state.registrations.map((registration) => (
                    <tr key={`${registration.campaign}-${registration.registeredAtIso}-${registration.accountEmail ?? "no-email"}`}>
                      <td className="border-b border-border px-3 py-3 font-semibold text-foreground">
                        {registration.registeredAtIso}
                      </td>
                      <td className="border-b border-border px-3 py-3 font-semibold text-muted">{registration.campaign}</td>
                      <td className="border-b border-border px-3 py-3 font-semibold text-muted">{registration.status}</td>
                      <td className="border-b border-border px-3 py-3 font-semibold text-muted">
                        {registration.accountEmail ?? "-"}
                      </td>
                      <td className="border-b border-border px-3 py-3 font-semibold text-muted">
                        {registration.accountDisplayName ?? "-"}
                      </td>
                      <td className="border-b border-border px-3 py-3 font-semibold text-muted">
                        {registration.discountIntent}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </main>
    </PortalShell>
  );
}
