import type { Metadata } from "next";
import { signUpWithPasswordAction } from "@/app/account/actions";
import { AuthFlowShell } from "@/components/account/AuthFlowShell";
import { PortalShell } from "@/components/portal/PortalShell";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create a Kuro Stream Kit account with email and password."
};

type SignupPageProps = {
  searchParams?: Promise<{
    auth?: string;
  }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  return (
    <PortalShell>
      <AuthFlowShell mode="signup" action={signUpWithPasswordAction} authMessage={params?.auth ?? null} turnstileSiteKey={turnstileSiteKey} />
    </PortalShell>
  );
}
