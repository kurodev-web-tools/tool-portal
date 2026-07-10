import "server-only";

import type { NextRequest } from "next/server";
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
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CommentTranslatorSourceLanguageId, CommentTranslatorTargetLanguageId } from "@/lib/comment-translator";
import type { CommentTranslatorSessionCommandIntent } from "@/lib/comment-translator-session-runtime";

const credentialResolutionDisabledEnv = "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED";

export type CommentTranslatorSessionRouteCommand = {
  readonly intent: CommentTranslatorSessionCommandIntent;
  readonly credentialReferenceId: string | null;
  readonly browserConnected: boolean;
  readonly stopReason: "user-stop" | "browser-disconnect" | undefined;
  readonly sourceLanguage: CommentTranslatorSourceLanguageId | undefined;
  readonly targetLanguage: CommentTranslatorTargetLanguageId;
};

export function mapCommentTranslatorSessionIntentToAbuseAction(intent: CommentTranslatorSessionCommandIntent) {
  if (intent === "start") return "session-start";
  if (intent === "stop") return "session-stop";
  if (intent === "heartbeat") return "session-heartbeat";
  return "session-status";
}

export async function readCommentTranslatorSessionRouteCommand(
  request: NextRequest
): Promise<CommentTranslatorSessionRouteCommand> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return normalizeCommandBody(await request.json());
    } catch {
      return normalizeCommandBody({});
    }
  }
  try {
    const formData = await request.formData();
    return normalizeCommandBody({
      intent: formData.get("intent"),
      credentialReferenceId: formData.get("credentialReferenceId"),
      browserConnected: formData.get("browserConnected"),
      stopReason: formData.get("stopReason"),
      sourceLanguage: formData.get("sourceLanguage"),
      targetLanguage: formData.get("targetLanguage")
    });
  } catch {
    return normalizeCommandBody({});
  }
}

export async function readCommentTranslatorRouteCredentialReadiness({
  credentialReferenceId,
  callerAuthorization
}: {
  readonly credentialReferenceId: string;
  readonly callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
}) {
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
    credentialReferenceId,
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

export async function readCommentTranslatorRouteCallerAuthorization(): Promise<YouTubeOAuthCredentialStatusCallerAuthorization> {
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

function normalizeCommandBody(body: {
  readonly intent?: unknown;
  readonly credentialReferenceId?: unknown;
  readonly browserConnected?: unknown;
  readonly stopReason?: unknown;
  readonly sourceLanguage?: unknown;
  readonly targetLanguage?: unknown;
}): CommentTranslatorSessionRouteCommand {
  const intent = body.intent === "start" || body.intent === "stop" || body.intent === "heartbeat" || body.intent === "status"
    ? body.intent
    : "status";
  const credentialReferenceId = typeof body.credentialReferenceId === "string" && body.credentialReferenceId.trim()
    ? body.credentialReferenceId.trim()
    : null;
  const browserConnected = !(body.browserConnected === false || body.browserConnected === "false" || body.intent === "stop");
  const stopReason = body.stopReason === "browser-disconnect"
    ? "browser-disconnect"
    : body.intent === "stop" ? "user-stop" : undefined;
  const sourceLanguage = body.sourceLanguage === "ja" || body.sourceLanguage === "en" || body.sourceLanguage === "ko" || body.sourceLanguage === "zh"
    ? body.sourceLanguage
    : undefined;
  return {
    intent,
    credentialReferenceId,
    browserConnected,
    stopReason,
    sourceLanguage,
    targetLanguage: body.targetLanguage === "en" ? "en" : "ja"
  };
}
