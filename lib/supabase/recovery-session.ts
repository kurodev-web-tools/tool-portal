import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const authRecoverySessionCookieName = "v-streamer-tools-auth-recovery-pending";

const recoverySessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60
};

export function markRecoverySessionPending(response: NextResponse) {
  response.cookies.set(authRecoverySessionCookieName, "1", recoverySessionCookieOptions);
  return response;
}

export function clearRecoverySessionResponse(response: NextResponse) {
  response.cookies.set(authRecoverySessionCookieName, "", {
    ...recoverySessionCookieOptions,
    maxAge: 0
  });
  return response;
}

export async function clearRecoverySessionPending() {
  const cookieStore = await cookies();
  cookieStore.delete(authRecoverySessionCookieName);
}

export async function isRecoverySessionPending() {
  const cookieStore = await cookies();
  return cookieStore.get(authRecoverySessionCookieName)?.value === "1";
}
