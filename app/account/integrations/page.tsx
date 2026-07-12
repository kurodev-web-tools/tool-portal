import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  disconnectYouTubeIntegrationAction,
  reconnectYouTubeIntegrationAction,
  startYouTubeIntegrationConnectAction
} from "@/app/account/actions";
import { AccountIntegrationsShell } from "@/components/account/AccountIntegrationsShell";
import { PortalShell } from "@/components/portal/PortalShell";
import { CommentTranslatorPrivateLaunchUnavailable } from "@/components/comment-translator/CommentTranslatorPrivateLaunchUnavailable";
import { readCommentTranslatorFreeBetaRuntimeAccessForAccountSession } from "@/lib/comment-translator-private-launch-access-gate";
import { readYouTubeAccountIntegrationStatusViewModel } from "@/lib/comment-translator-youtube-account-integration-status";
import { isRecoverySessionPending } from "@/lib/supabase/recovery-session";
import { createBrowserSafeAccountSessionViewModel, getAccountSessionState } from "@/lib/supabase/session";

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

  const launchAccess = readCommentTranslatorFreeBetaRuntimeAccessForAccountSession({ accountSession });

  if (launchAccess.status === "blocked") {
    return (
      <PortalShell>
        <CommentTranslatorPrivateLaunchUnavailable surface="integrations" access={launchAccess} />
      </PortalShell>
    );
  }

  const youtubeIntegration = await readYouTubeAccountIntegrationStatusViewModel({ accountSession });
  const browserSafeAccountSession = createBrowserSafeAccountSessionViewModel(accountSession);

  return (
    <PortalShell>
      <AccountIntegrationsShell
        accountStatus={browserSafeAccountSession}
        integrationMessage={params?.integration ?? null}
        youtubeIntegration={youtubeIntegration}
        startYouTubeConnectAction={startYouTubeIntegrationConnectAction}
        reconnectYouTubeAction={reconnectYouTubeIntegrationAction}
        disconnectYouTubeAction={disconnectYouTubeIntegrationAction}
      />
    </PortalShell>
  );
}
