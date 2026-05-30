import type { Metadata } from "next";
import { signInWithPasswordAction } from "@/app/account/actions";
import { AuthFlowShell } from "@/components/account/AuthFlowShell";
import { PortalShell } from "@/components/portal/PortalShell";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to Kuro Stream Kit with email and password."
};

type LoginPageProps = {
  searchParams?: Promise<{
    auth?: string;
    next?: string;
  }>;
};

function safeNextPath(value: string | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/account";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  return (
    <PortalShell>
      <AuthFlowShell
        mode="login"
        action={signInWithPasswordAction}
        authMessage={params?.auth ?? null}
        nextPath={safeNextPath(params?.next)}
        turnstileSiteKey={turnstileSiteKey}
      />
    </PortalShell>
  );
}
