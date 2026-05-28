import type { Metadata } from "next";
import { updatePasswordAction } from "@/app/account/actions";
import { AuthFlowShell } from "@/components/account/AuthFlowShell";
import { PortalShell } from "@/components/portal/PortalShell";

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
  const params = await searchParams;

  return (
    <PortalShell>
      <AuthFlowShell mode="update-password" action={updatePasswordAction} authMessage={params?.auth ?? null} />
    </PortalShell>
  );
}
