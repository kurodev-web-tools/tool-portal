import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { clearRecoverySessionResponse, markRecoverySessionPending } from "@/lib/supabase/recovery-session";
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
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(requestUrl.searchParams.get("next"), type);
  const redirectUrl = new URL(next, requestUrl.origin);

  if (requestUrl.searchParams.has("error")) {
    redirectUrl.searchParams.set("auth", "confirm-error");
    return NextResponse.redirect(redirectUrl);
  }

  if (!code && (!tokenHash || !type)) {
    redirectUrl.searchParams.set("auth", "confirm-link-invalid");
    return NextResponse.redirect(redirectUrl);
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    redirectUrl.searchParams.set("auth", "supabase-env-missing");
    return NextResponse.redirect(redirectUrl);
  }

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({
        token_hash: tokenHash as string,
        type: type as EmailOtpType
      });

  const isPasswordRecovery = type === passwordRecoveryOtpType;
  if (error) {
    redirectUrl.searchParams.set("auth", "confirm-error");
  } else if (isPasswordRecovery) {
    redirectUrl.searchParams.set("auth", "recovery-pending");
  } else {
    redirectUrl.searchParams.set("auth", "signed-in");
  }
  const response = NextResponse.redirect(redirectUrl);

  if (!error && isPasswordRecovery) {
    return markRecoverySessionPending(response);
  }

  return clearRecoverySessionResponse(response);
}
