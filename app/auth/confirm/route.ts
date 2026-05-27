import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function safeNextPath(value: string | null) {
  return value?.startsWith("/") ? value : "/account";
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(requestUrl.searchParams.get("next"));
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
