import { NextResponse, type NextRequest } from "next/server";
import {
  createYouTubeOAuthCredentialStatusUnavailablePayload,
} from "@/lib/comment-translator-youtube-credential-status-boundary";
import { assessYouTubeOAuthCredentialTranslatorStartReadiness } from "@/lib/comment-translator-youtube-disconnect-runtime";
import {
  createCommentTranslatorDurableSessionFailClosedState,
  createTrustedCommentTranslatorSessionSupabaseStore,
  readCommentTranslatorDurableActiveSessionOrFailClosed
} from "@/lib/comment-translator-durable-session-store";
import {
  createTrustedCommentTranslatorUsageCounterSupabaseStore,
  readCommentTranslatorDurableUsageSnapshotOrFailClosed
} from "@/lib/comment-translator-durable-usage-counter-store";
import { readCommentTranslatorBillingEntitlementSnapshot } from "@/lib/comment-translator-billing-runtime";
import { resolveCommentTranslatorPublicEntitlementBaseline } from "@/lib/comment-translator-public-entitlement-baseline";
import { resolveCommentTranslatorFreeBetaPreviewRateLimitSmokeOverride } from "@/lib/comment-translator-free-beta-preview-rate-limit-smoke-override";
import { executeCommentTranslatorSessionCommand } from "@/lib/comment-translator-session-command-execution";
import {
  createCommentTranslatorPrivateLaunchBlockedSessionState,
  readCommentTranslatorFreeBetaRuntimeAccess,
  readCommentTranslatorPrivateLaunchAccess
} from "@/lib/comment-translator-private-launch-access-gate";
import {
  assertCommentTranslatorAbuseRequestAllowed,
  createCommentTranslatorAbuseRateLimitedSessionState,
  readCommentTranslatorRequestIp
} from "@/lib/comment-translator-abuse-rate-limit-runtime";
import {
  mapCommentTranslatorSessionIntentToAbuseAction,
  readCommentTranslatorRouteCallerAuthorization,
  readCommentTranslatorRouteCredentialReadiness,
  readCommentTranslatorSessionRouteCommand
} from "./route-context";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const command = await readCommentTranslatorSessionRouteCommand(request);
  const callerAuthorization = await readCommentTranslatorRouteCallerAuthorization();
  const nowMs = Date.now();
  const requestIp = readCommentTranslatorRequestIp(request.headers);
  const abuseCheck = assertCommentTranslatorAbuseRequestAllowed({
    surface: "/api/comment-translator/session",
    action: mapCommentTranslatorSessionIntentToAbuseAction(command.intent),
    callerAuthorization,
    requestIp,
    nowMs
  });
  if (abuseCheck.status === "blocked") {
    return NextResponse.json(
      createCommentTranslatorAbuseRateLimitedSessionState({
        nowMs,
        plan: "free",
        check: abuseCheck
      }),
      { status: 429 }
    );
  }

  const launchAccess = readCommentTranslatorFreeBetaRuntimeAccess({ callerAuthorization });
  if (launchAccess.status === "blocked") {
    const privateLaunchAbuseCheck = assertCommentTranslatorAbuseRequestAllowed({
      surface: "private-launch-gate-direct-call-denials",
      action: "private-launch-denied",
      callerAuthorization,
      requestIp,
      nowMs
    });
    if (privateLaunchAbuseCheck.status === "blocked") {
      return NextResponse.json(
        createCommentTranslatorAbuseRateLimitedSessionState({
          nowMs,
          plan: "free",
          check: privateLaunchAbuseCheck
        }),
        { status: 429 }
      );
    }

    return NextResponse.json(
      createCommentTranslatorPrivateLaunchBlockedSessionState({
        nowMs,
        plan: "free",
        access: launchAccess
      }),
      { status: 403 }
    );
  }

  const billingSnapshot = readCommentTranslatorBillingEntitlementSnapshot({ callerAuthorization });
  const previewRateLimitSmokeOverride = resolveCommentTranslatorFreeBetaPreviewRateLimitSmokeOverride({
    privateLaunchAccess: readCommentTranslatorPrivateLaunchAccess({ callerAuthorization })
  });
  const durableSessionStore = createTrustedCommentTranslatorSessionSupabaseStore();
  const durableUsageCounterStore = createTrustedCommentTranslatorUsageCounterSupabaseStore();
  const durableActiveSessionRead = await readCommentTranslatorDurableActiveSessionOrFailClosed({
    callerAuthorization,
    durableSessionStore
  });
  if (durableActiveSessionRead.status === "fail-closed") {
    return NextResponse.json(
      createCommentTranslatorDurableSessionFailClosedState({
        nowMs,
        plan: "free"
      })
    );
  }

  const activeSession = durableActiveSessionRead.activeSession;
  const durableUsageRead = await readCommentTranslatorDurableUsageSnapshotOrFailClosed({
    callerAuthorization,
    durableUsageCounterStore,
    nowMs,
    plan: "free",
    activeSession,
    planEntitlementOverride: previewRateLimitSmokeOverride
  });
  const entitlementBaseline = resolveCommentTranslatorPublicEntitlementBaseline({
    billingSnapshot,
    durableUsageRead,
    previewRateLimitSmokeOverride
  });
  if (entitlementBaseline.status === "fail-closed") {
    return NextResponse.json(
      createCommentTranslatorDurableSessionFailClosedState({
        nowMs,
        plan: "free"
      })
    );
  }

  const usage = entitlementBaseline.usage;
  const credentialReferenceId = command.credentialReferenceId ?? activeSession?.credentialReferenceId ?? null;
  if (command.intent === "status") {
    const state = await executeCommentTranslatorSessionCommand({
      intent: "status",
      nowMs,
      plan: entitlementBaseline.plan,
      callerAuthorization,
      credentialReadiness: null,
      credentialReferenceId,
      activeSession,
      usage,
      durableSessionStore,
      durableUsageCounterStore,
      browserConnected: command.browserConnected,
      stopReason: command.stopReason,
      targetLanguage: command.targetLanguage,
      sourceLanguages: command.sourceLanguage ? [command.sourceLanguage] : undefined
    });
    return NextResponse.json(state);
  }
  const credentialReadiness = credentialReferenceId
    ? await readCommentTranslatorRouteCredentialReadiness({ credentialReferenceId, callerAuthorization })
    : assessYouTubeOAuthCredentialTranslatorStartReadiness(
        createYouTubeOAuthCredentialStatusUnavailablePayload({
          credentialReferenceId: "missing-credential-reference",
          reason: "trusted-adapter-not-wired"
        })
      );
  const state = await executeCommentTranslatorSessionCommand({
    intent: command.intent,
    nowMs,
    plan: entitlementBaseline.plan,
    callerAuthorization,
    credentialReadiness,
    credentialReferenceId,
    activeSession,
    usage,
    durableSessionStore,
    durableUsageCounterStore,
    browserConnected: command.browserConnected,
    stopReason: command.stopReason,
    targetLanguage: command.targetLanguage,
    sourceLanguages: command.sourceLanguage ? [command.sourceLanguage] : undefined
  });
  return NextResponse.json(state);
}
