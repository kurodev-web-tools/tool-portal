import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  disconnectYouTubeIntegrationAction,
  reconnectYouTubeIntegrationAction,
  startYouTubeIntegrationConnectAction
} from "@/app/account/actions";
import { AccountIntegrationsShell } from "@/components/account/AccountIntegrationsShell";
import { PortalShell } from "@/components/portal/PortalShell";
import { createYouTubeAccountIntegrationViewModel } from "@/lib/comment-translator-youtube-account-integration";
import { isRecoverySessionPending } from "@/lib/supabase/recovery-session";
import { getAccountSessionState } from "@/lib/supabase/session";

export const metadata: Metadata = {
  title: "Account integrations",
  description: "Review YouTube connection readiness for Kuro Live Comment Translator."
};

export const dynamic = "force-dynamic";

type AccountIntegrationsPageProps = {
  searchParams?: Promise<{
    integration?: string;
  }>;
};

export default async function AccountIntegrationsPage({ searchParams }: AccountIntegrationsPageProps) {
  const [params, accountSession, recoveryPending] = await Promise.all([
    searchParams,
    getAccountSessionState(),
    isRecoverySessionPending()
  ]);

  if (accountSession.authStatus === "signed-out") {
    redirect("/login?next=/account/integrations");
  }

  if (recoveryPending) {
    redirect("/account/security?auth=recovery-pending");
  }

  return (
    <PortalShell>
      <AccountIntegrationsShell
        accountStatus={accountSession}
        integrationMessage={params?.integration ?? null}
        youtubeIntegration={createYouTubeAccountIntegrationViewModel()}
        startYouTubeConnectAction={startYouTubeIntegrationConnectAction}
        reconnectYouTubeAction={reconnectYouTubeIntegrationAction}
        disconnectYouTubeAction={disconnectYouTubeIntegrationAction}
      />
    </PortalShell>
  );
}
