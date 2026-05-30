import type { Metadata } from "next";
import { resetPasswordEmailAction } from "@/app/account/actions";
import { AuthFlowShell } from "@/components/account/AuthFlowShell";
import { PortalShell } from "@/components/portal/PortalShell";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Request a password reset email for Kuro Stream Kit."
};

type ResetPasswordPageProps = {
  searchParams?: Promise<{
    auth?: string;
  }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  return (
    <PortalShell>
      <AuthFlowShell mode="reset" action={resetPasswordEmailAction} authMessage={params?.auth ?? null} turnstileSiteKey={turnstileSiteKey} />
    </PortalShell>
  );
}
