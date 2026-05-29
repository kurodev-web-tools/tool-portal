import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { updatePasswordAction } from "@/app/account/actions";
import { AuthFlowShell } from "@/components/account/AuthFlowShell";
import { PortalShell } from "@/components/portal/PortalShell";
import { getAccountSessionState } from "@/lib/supabase/session";

export const metadata: Metadata = {
  title: "Account security",
  description: "Update the password for your Kuro Stream Kit account."
};

type AccountSecurityPageProps = {
  searchParams?: Promise<{
    auth?: string;
  }>;
};

export default async function AccountSecurityPage({ searchParams }: AccountSecurityPageProps) {
  const [params, accountSession] = await Promise.all([searchParams, getAccountSessionState()]);

  if (accountSession.authStatus !== "signed-in") {
    redirect("/login?next=/account/security");
  }

  return (
    <PortalShell>
      <AuthFlowShell mode="update-password" action={updatePasswordAction} authMessage={params?.auth ?? null} />
    </PortalShell>
  );
}
