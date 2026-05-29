import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { saveLocaleThemePreferenceAction, signOutAction } from "@/app/account/actions";
import { AccountPreferencesShell } from "@/components/account/AccountPreferencesShell";
import { PortalShell } from "@/components/portal/PortalShell";
import { portalMetadata } from "@/lib/portal-metadata";
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
  const [authMessage, accountSession] = await Promise.all([(await searchParams)?.auth ?? null, getAccountSessionState()]);

  if (accountSession.authStatus === "signed-out") {
    redirect("/login?next=/account");
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
