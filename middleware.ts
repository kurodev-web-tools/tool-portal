import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import { authRecoverySessionCookieName } from "@/lib/supabase/recovery-session";

export async function middleware(request: NextRequest) {
  const config = getSupabasePublicConfig();
  const pathname = request.nextUrl.pathname;

  if (
    request.cookies.get(authRecoverySessionCookieName)?.value === "1" &&
    pathname.startsWith("/account") &&
    pathname !== "/account/security"
  ) {
    const redirectUrl = new URL("/account/security", request.url);
    redirectUrl.searchParams.set("auth", "recovery-pending");
    return NextResponse.redirect(redirectUrl);
  }

  let response = NextResponse.next({
    request
  });

  if (config.status === "missing") {
    return response;
  }

  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({
          request
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  await supabase.auth.getClaims();

  return response;
}

export const config = {
  matcher: ["/account/:path*", "/auth/:path*"]
};
