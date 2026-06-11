import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  authorizeYouTubeOAuthCredentialStatusCaller,
  createYouTubeOAuthCredentialStatusUnavailablePayload,
  type YouTubeOAuthCredentialStatusCallerAuthorization,
  readYouTubeOAuthCredentialStatus
} from "@/lib/comment-translator-youtube-credential-status-boundary";
import { assessYouTubeOAuthCredentialTranslatorStartReadiness } from "@/lib/comment-translator-youtube-disconnect-runtime";
import { createTrustedYouTubeOAuthCredentialSupabaseStatusReader } from "@/lib/comment-translator-youtube-token-store-supabase-adapter";
import { isYouTubeOAuthCredentialResolutionDisabled } from "@/lib/comment-translator-youtube-token-store-runtime";
import {
  persistInMemoryCommentTranslatorActiveSession,
  readCommentTranslatorSessionCommand,
  readInMemoryCommentTranslatorActiveSession,
  type CommentTranslatorSessionCommandIntent
} from "@/lib/comment-translator-session-runtime";
import {
  readInMemoryCommentTranslatorUsageSnapshot,
  recordInMemoryCommentTranslatorSessionLedgerState
} from "@/lib/comment-translator-usage-ledger-runtime";
import { readCommentTranslatorBillingEntitlementSnapshot } from "@/lib/comment-translator-billing-runtime";
import {
  createCommentTranslatorPrivateLaunchBlockedSessionState,
  readCommentTranslatorPrivateLaunchAccess
} from "@/lib/comment-translator-private-launch-access-gate";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const credentialResolutionDisabledEnv = "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED";

export async function POST(request: NextRequest) {
  const command = await readSessionCommand(request);
  const callerAuthorization = await readSessionCallerAuthorization();
  const launchAccess = readCommentTranslatorPrivateLaunchAccess({ callerAuthorization });
  if (launchAccess.status === "blocked") {
    return NextResponse.json(
      createCommentTranslatorPrivateLaunchBlockedSessionState({
        nowMs: Date.now(),
        plan: "free",
        access: launchAccess
      }),
      { status: 403 }
    );
  }

  const activeSession = readInMemoryCommentTranslatorActiveSession(callerAuthorization);
  const nowMs = Date.now();
  const billingSnapshot = readCommentTranslatorBillingEntitlementSnapshot({ callerAuthorization });
  const usage = readInMemoryCommentTranslatorUsageSnapshot({
    callerAuthorization,
    nowMs,
    plan: billingSnapshot.plan,
    activeSession,
    paidEntitlement: billingSnapshot.plan === "paid" ? billingSnapshot.planEntitlement : undefined
  });
  const credentialReferenceId = command.credentialReferenceId ?? activeSession?.credentialReferenceId ?? null;
  const credentialReadiness = credentialReferenceId
    ? await readCredentialReadiness({ credentialReferenceId, callerAuthorization })
    : assessYouTubeOAuthCredentialTranslatorStartReadiness(
        createYouTubeOAuthCredentialStatusUnavailablePayload({
          credentialReferenceId: "missing-credential-reference",
          reason: "trusted-adapter-not-wired"
        })
      );

  const state = await readCommentTranslatorSessionCommand({
    intent: command.intent,
    nowMs,
    plan: billingSnapshot.plan,
    callerAuthorization,
    credentialReadiness,
    activeSession,
    usage,
    browserConnected: command.browserConnected,
    stopReason: command.stopReason,
    createSessionReferenceId: () => `cts_${randomUUID()}`
  });

  persistInMemoryCommentTranslatorActiveSession({ callerAuthorization, state });
  recordInMemoryCommentTranslatorSessionLedgerState({
    callerAuthorization,
    intent: command.intent,
    state,
    occurredAtMs: nowMs,
    planEntitlement: usage.planEntitlement
  });

  return NextResponse.json(state);
}

async function readSessionCommand(request: NextRequest): Promise<{
  intent: CommentTranslatorSessionCommandIntent;
  credentialReferenceId: string | null;
  browserConnected: boolean;
  stopReason: "user-stop" | "browser-disconnect" | undefined;
}> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      const body = (await request.json()) as {
        intent?: unknown;
        credentialReferenceId?: unknown;
        browserConnected?: unknown;
        stopReason?: unknown;
      };

      return normalizeCommandBody(body);
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
      stopReason: formData.get("stopReason")
    });
  } catch {
    return normalizeCommandBody({});
  }
}

function normalizeCommandBody(body: {
  intent?: unknown;
  credentialReferenceId?: unknown;
  browserConnected?: unknown;
  stopReason?: unknown;
}): {
  intent: CommentTranslatorSessionCommandIntent;
  credentialReferenceId: string | null;
  browserConnected: boolean;
  stopReason: "user-stop" | "browser-disconnect" | undefined;
} {
  let intent: CommentTranslatorSessionCommandIntent = "status";
  if (body.intent === "start" || body.intent === "stop" || body.intent === "heartbeat" || body.intent === "status") {
    intent = body.intent;
  }
  const credentialReferenceId =
    typeof body.credentialReferenceId === "string" && body.credentialReferenceId.trim()
      ? body.credentialReferenceId.trim()
      : null;
  const browserConnected =
    body.browserConnected === false || body.browserConnected === "false" || body.intent === "stop" ? false : true;
  const stopReason: "user-stop" | "browser-disconnect" | undefined =
    body.stopReason === "browser-disconnect" ? "browser-disconnect" : body.intent === "stop" ? "user-stop" : undefined;

  return {
    intent,
    credentialReferenceId,
    browserConnected,
    stopReason
  };
}

async function readCredentialReadiness({
  credentialReferenceId,
  callerAuthorization
}: {
  credentialReferenceId: string;
  callerAuthorization: YouTubeOAuthCredentialStatusCallerAuthorization;
}) {
  const credentialResolutionDisabled = isYouTubeOAuthCredentialResolutionDisabled({
    [credentialResolutionDisabledEnv]: process.env[credentialResolutionDisabledEnv]
  });
  const trustedStatusReader =
    credentialResolutionDisabled || callerAuthorization.status !== "authorized"
      ? null
      : createTrustedYouTubeOAuthCredentialSupabaseStatusReader();
  const status = await readYouTubeOAuthCredentialStatus({
    credentialReferenceId,
    trustedAdapter: trustedStatusReader?.trustedAdapter ?? null,
    callerAuthorization,
    credentialResolutionDisabled
  });

  return assessYouTubeOAuthCredentialTranslatorStartReadiness(status);
}

async function readSessionCallerAuthorization(): Promise<YouTubeOAuthCredentialStatusCallerAuthorization> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return authorizeYouTubeOAuthCredentialStatusCaller({
      callerUserId: null,
      authUnavailable: true
    });
  }

  try {
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    return authorizeYouTubeOAuthCredentialStatusCaller({
      callerUserId: error ? null : user?.id ?? null,
      authUnavailable: Boolean(error)
    });
  } catch {
    return authorizeYouTubeOAuthCredentialStatusCaller({
      callerUserId: null,
      authUnavailable: true
    });
  }
}
