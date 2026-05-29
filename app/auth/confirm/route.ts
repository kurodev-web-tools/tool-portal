import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const allowedNextPaths = new Set(["/account", "/account/security"]);
const passwordRecoveryOtpType: EmailOtpType = "recovery";

function safeNextPath(value: string | null, type: EmailOtpType | null) {
  if (type === passwordRecoveryOtpType) {
    return "/account/security";
  }

  return value && allowedNextPaths.has(value) ? value : "/account";
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(requestUrl.searchParams.get("next"), type);
  const redirectUrl = new URL(next, requestUrl.origin);

  if (!tokenHash || !type) {
    redirectUrl.searchParams.set("auth", "confirm-link-invalid");
    return NextResponse.redirect(redirectUrl);
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    redirectUrl.searchParams.set("auth", "supabase-env-missing");
    return NextResponse.redirect(redirectUrl);
  }

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type
  });

  redirectUrl.searchParams.set("auth", error ? "confirm-error" : "signed-in");
  return NextResponse.redirect(redirectUrl);
}
