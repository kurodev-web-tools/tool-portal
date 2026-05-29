import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { saveLocaleThemePreferenceAction, signOutAction } from "@/app/account/actions";
import { AccountPreferencesShell } from "@/components/account/AccountPreferencesShell";
import { PortalShell } from "@/components/portal/PortalShell";
import { portalMetadata } from "@/lib/portal-metadata";
import { isRecoverySessionPending } from "@/lib/supabase/recovery-session";
import { getAccountSessionState } from "@/lib/supabase/session";

const accountMetadata = portalMetadata.en.account;

export const metadata: Metadata = {
  title: accountMetadata.title,
  description: accountMetadata.description
};

type AccountPageProps = {
  searchParams?: Promise<{
    auth?: string;
  }>;
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const [authMessage, accountSession, recoveryPending] = await Promise.all([
    (await searchParams)?.auth ?? null,
    getAccountSessionState(),
    isRecoverySessionPending()
  ]);

  if (accountSession.authStatus === "signed-out") {
    redirect("/login?next=/account");
  }

  if (recoveryPending) {
    redirect("/account/security?auth=recovery-pending");
  }

  return (
    <PortalShell>
      <AccountPreferencesShell
        authMessage={authMessage}
        authStatus={accountSession}
        saveLocaleThemePreferenceAction={saveLocaleThemePreferenceAction}
        signOutAction={signOutAction}
      />
    </PortalShell>
  );
}
