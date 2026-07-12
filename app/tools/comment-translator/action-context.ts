import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  authorizeYouTubeOAuthCredentialStatusCaller,
  readYouTubeOAuthCredentialStatus,
  type YouTubeOAuthCredentialStatusCallerAuthorization
} from "@/lib/comment-translator-youtube-credential-status-boundary";
import { assessYouTubeOAuthCredentialTranslatorStartReadiness } from "@/lib/comment-translator-youtube-disconnect-runtime";
import {
  createTrustedYouTubeOAuthCredentialSupabaseStatusReader,
  createTrustedYouTubeOAuthCredentialSupabaseTokenMaterialRuntime
} from "@/lib/comment-translator-youtube-token-store-supabase-adapter";
import { createTrustedYouTubeOAuthStoredCredentialRefreshRuntime } from "@/lib/comment-translator-youtube-token-material-runtime";
import { isYouTubeOAuthCredentialResolutionDisabled } from "@/lib/comment-translator-youtube-token-store-runtime";
import type { CommentTranslatorCreatorWaitlistAccount } from "@/lib/comment-translator-free-beta-creator-locked-waitlist";
import type { CommentTranslatorActiveSessionRecord } from "@/lib/comment-translator-session-runtime";

const credentialResolutionDisabledEnv = "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED";

export async function readCommentTranslatorActionCallerAuthorization(): Promise<YouTubeOAuthCredentialStatusCallerAuthorization> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return authorizeYouTubeOAuthCredentialStatusCaller({ callerUserId: null, authUnavailable: true });
  }
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    return authorizeYouTubeOAuthCredentialStatusCaller({
      callerUserId: error ? null : user?.id ?? null,
      authUnavailable: Boolean(error)
    });
  } catch {
    return authorizeYouTubeOAuthCredentialStatusCaller({ callerUserId: null, authUnavailable: true });
  }
}

export async function readCommentTranslatorActionCredentialReadiness({
  activeSession,
  callerAuthorization,
  readFallbackCredentialStatus
}: {
  readonly activeSession: CommentTranslatorActiveSessionRecord | null;
  readonly callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
  readonly readFallbackCredentialStatus: () => Promise<Parameters<typeof assessYouTubeOAuthCredentialTranslatorStartReadiness>[0]>;
}) {
  if (!activeSession?.credentialReferenceId) {
    return assessYouTubeOAuthCredentialTranslatorStartReadiness(await readFallbackCredentialStatus());
  }
  const credentialResolutionDisabled = isYouTubeOAuthCredentialResolutionDisabled({
    [credentialResolutionDisabledEnv]: process.env[credentialResolutionDisabledEnv]
  });
  const trustedStatusReader = credentialResolutionDisabled || callerAuthorization.status !== "authorized"
    ? null
    : createTrustedYouTubeOAuthCredentialSupabaseStatusReader();
  const trustedTokenMaterialRuntime = credentialResolutionDisabled || callerAuthorization.status !== "authorized"
    ? null
    : createTrustedYouTubeOAuthCredentialSupabaseTokenMaterialRuntime();
  const status = await readYouTubeOAuthCredentialStatus({
    credentialReferenceId: activeSession.credentialReferenceId,
    trustedAdapter: trustedStatusReader?.trustedAdapter ?? null,
    trustedRefreshRuntime: trustedTokenMaterialRuntime?.status === "ready"
      ? createTrustedYouTubeOAuthStoredCredentialRefreshRuntime({
          tokenMaterialAdapter: trustedTokenMaterialRuntime.trustedTokenMaterialAdapter
        })
      : null,
    callerAuthorization,
    credentialResolutionDisabled
  });
  return assessYouTubeOAuthCredentialTranslatorStartReadiness(status);
}

export async function readCommentTranslatorCreatorWaitlistAccount(): Promise<CommentTranslatorCreatorWaitlistAccount> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { status: "unauthenticated", reason: "auth-unavailable" };
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return {
        status: "unauthenticated",
        reason: error ? "auth-unavailable" : "caller-not-authenticated"
      };
    }
    return {
      status: "authenticated",
      ownerUserId: user.id,
      email: user.email ?? null,
      displayName: readCreatorWaitlistDisplayName(user.user_metadata)
    };
  } catch {
    return { status: "unauthenticated", reason: "auth-unavailable" };
  }
}

function readCreatorWaitlistDisplayName(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const candidates = ["display_name", "full_name", "name"] as const;
  for (const key of candidates) {
    const value = Reflect.get(metadata, key);
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}
