import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  authorizeYouTubeOAuthCredentialStatusCaller,
  createYouTubeOAuthCredentialStatusUnavailablePayload,
  type YouTubeOAuthCredentialStatusCallerAuthorization,
  readYouTubeOAuthCredentialStatus
} from "@/lib/comment-translator-youtube-credential-status-boundary";
import { assessYouTubeOAuthCredentialTranslatorStartReadiness } from "@/lib/comment-translator-youtube-disconnect-runtime";
import {
  createTrustedYouTubeOAuthCredentialSupabaseStatusReader,
  createTrustedYouTubeOAuthCredentialSupabaseTokenMaterialRuntime
} from "@/lib/comment-translator-youtube-token-store-supabase-adapter";
import { createTrustedYouTubeOAuthStoredCredentialRefreshRuntime } from "@/lib/comment-translator-youtube-token-material-runtime";
import { isYouTubeOAuthCredentialResolutionDisabled } from "@/lib/comment-translator-youtube-token-store-runtime";
import {
  persistInMemoryCommentTranslatorActiveSession,
  readCommentTranslatorSessionCommand,
  type CommentTranslatorSessionCommandIntent
} from "@/lib/comment-translator-session-runtime";
import {
  createCommentTranslatorDurableSessionFailClosedState,
  createTrustedCommentTranslatorSessionSupabaseStore,
  persistCommentTranslatorDurableSessionStateOrFailClosed,
  readCommentTranslatorDurableActiveSessionOrFailClosed
} from "@/lib/comment-translator-durable-session-store";
import {
  recordInMemoryCommentTranslatorSessionLedgerState
} from "@/lib/comment-translator-usage-ledger-runtime";
import {
  createTrustedCommentTranslatorUsageCounterSupabaseStore,
  readCommentTranslatorDurableUsageSnapshotOrFailClosed,
  recordCommentTranslatorDurableSessionLedgerStateOrFailClosed
} from "@/lib/comment-translator-durable-usage-counter-store";
import { readCommentTranslatorBillingEntitlementSnapshot } from "@/lib/comment-translator-billing-runtime";
import { resolveCommentTranslatorPublicEntitlementBaseline } from "@/lib/comment-translator-public-entitlement-baseline";
import {
  resolveCommentTranslatorServerOnlyLiveChatTargetLookupForStart
} from "@/lib/comment-translator-server-only-live-chat-target-lookup";
import {
  clearCommentTranslatorBoundedLiveChatPollingState,
  readCommentTranslatorBoundedLiveChatPollingTick,
  seedCommentTranslatorBoundedLiveChatPollingStateForActiveSession
} from "@/lib/comment-translator-bounded-live-chat-polling-wiring";
import { createTrustedCommentTranslatorYouTubeLiveProviderRuntimeAdapter } from "@/lib/comment-translator-youtube-live-provider-runtime-adapter";
import { runCommentTranslatorLiveProviderSessionStep } from "@/lib/comment-translator-live-provider-session-step";
import {
  clearCommentTranslatorRealCommentsFeedForSession
} from "@/lib/comment-translator-real-comments-feed-session-bridge";
import {
  createTrustedCommentTranslatorRealCommentsFeedDurableStore
} from "@/lib/comment-translator-real-comments-feed-durable-store";
import {
  clearCommentTranslatorAzureNormalTranslationSessionDedupeState
} from "@/lib/comment-translator-azure-normal-translation-execution";
import {
  createCommentTranslatorPrivateLaunchBlockedSessionState,
  readCommentTranslatorPrivateLaunchAccess
} from "@/lib/comment-translator-private-launch-access-gate";
import {
  assertCommentTranslatorAbuseRequestAllowed,
  createCommentTranslatorAbuseRateLimitedSessionState,
  readCommentTranslatorRequestIp
} from "@/lib/comment-translator-abuse-rate-limit-runtime";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CommentTranslatorSourceLanguageId, CommentTranslatorTargetLanguageId } from "@/lib/comment-translator";

export const dynamic = "force-dynamic";

const credentialResolutionDisabledEnv = "YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED";

export async function POST(request: NextRequest) {
  const command = await readSessionCommand(request);
  const callerAuthorization = await readSessionCallerAuthorization();
  const nowMs = Date.now();
  const requestIp = readCommentTranslatorRequestIp(request.headers);
  const abuseCheck = assertCommentTranslatorAbuseRequestAllowed({
    surface: "/api/comment-translator/session",
    action: mapSessionIntentToAbuseAction(command.intent),
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

  const launchAccess = readCommentTranslatorPrivateLaunchAccess({ callerAuthorization });
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
    activeSession
  });
  const entitlementBaseline = resolveCommentTranslatorPublicEntitlementBaseline({
    billingSnapshot,
    durableUsageRead
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
  const credentialReadiness = credentialReferenceId
    ? await readCredentialReadiness({ credentialReferenceId, callerAuthorization })
    : assessYouTubeOAuthCredentialTranslatorStartReadiness(
        createYouTubeOAuthCredentialStatusUnavailablePayload({
          credentialReferenceId: "missing-credential-reference",
          reason: "trusted-adapter-not-wired"
        })
      );
  const liveProviderRuntime = createTrustedCommentTranslatorYouTubeLiveProviderRuntimeAdapter({
    credentialReferenceId,
    callerAuthorization
  });
  const liveChatTargetReadiness = await resolveCommentTranslatorServerOnlyLiveChatTargetLookupForStart({
    intent: command.intent,
    credentialReadiness,
    adapter: liveProviderRuntime.targetLookupAdapter
  });
  const pollingStep =
    command.intent === "heartbeat"
      ? await runCommentTranslatorLiveProviderSessionStep({
          activeSession,
          usage,
          callerAuthorization,
          credentialReadiness,
          targetLookupAdapter: liveProviderRuntime.targetLookupAdapter,
          pollingAdapter: liveProviderRuntime.pollingAdapter,
          durableUsageCounterStore,
          nowMs,
          targetLanguage: command.targetLanguage,
          sourceLanguages: command.sourceLanguage ? [command.sourceLanguage] : undefined
        })
      : null;
  const pollingTick =
    command.intent === "status"
      ? createCommentTranslatorStatusRestorePollingTick()
      : (pollingStep?.pollingTick ??
        (await readCommentTranslatorBoundedLiveChatPollingTick({
          intent: command.intent,
          activeSession,
          usage,
          adapter: liveProviderRuntime.pollingAdapter,
          nowMs
        })));

  const state = await readCommentTranslatorSessionCommand({
    intent: command.intent,
    nowMs,
    plan: entitlementBaseline.plan,
    callerAuthorization,
    credentialReadiness,
    activeSession,
    usage,
    liveChatTargetReadiness,
    browserConnected: command.browserConnected,
    stopReason: command.stopReason,
    providerSignal: pollingTick.providerSignal,
    providerSignalReasonUxCode: "reasonUxCode" in pollingTick ? pollingTick.reasonUxCode : null,
    createSessionReferenceId: () => `cts_${randomUUID()}`
  });

  const durablePersistResult = await persistCommentTranslatorDurableSessionStateOrFailClosed({
    callerAuthorization,
    durableSessionStore,
    state,
    planEntitlementReferenceId: usage.planEntitlement.planEntitlementReferenceId
  });
  if (durablePersistResult.status === "fail-closed") {
    return NextResponse.json(
      createCommentTranslatorDurableSessionFailClosedState({
        nowMs,
        plan: entitlementBaseline.plan
      })
    );
  }

  const durableUsagePersistResult = await recordCommentTranslatorDurableSessionLedgerStateOrFailClosed({
    callerAuthorization,
    durableUsageCounterStore,
    intent: command.intent,
    state,
    occurredAtMs: nowMs,
    planEntitlement: usage.planEntitlement
  });
  if (durableUsagePersistResult.status === "fail-closed") {
    return NextResponse.json(
      createCommentTranslatorDurableSessionFailClosedState({
        nowMs,
        plan: entitlementBaseline.plan
      })
    );
  }

  if (state.status === "active" && command.intent === "start") {
    seedCommentTranslatorBoundedLiveChatPollingStateForActiveSession({
      state,
      liveChatTargetReadiness,
      nowMs
    });
  }

  if (state.status === "stopped") {
    clearCommentTranslatorBoundedLiveChatPollingState(state.sessionReferenceId);
    clearCommentTranslatorAzureNormalTranslationSessionDedupeState(state.sessionReferenceId);
    await clearCommentTranslatorRealCommentsFeedForSession({
      callerAuthorization,
      sessionReferenceId: state.sessionReferenceId,
      durableFeedStore: createTrustedCommentTranslatorRealCommentsFeedDurableStore()
    });
  }

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

function createCommentTranslatorStatusRestorePollingTick() {
  return {
    status: "skipped-status-intent-session-restore",
    providerAccess: "not-run",
    providerSignal: null,
    publicLaunchAllowed: false
  } as const;
}

function mapSessionIntentToAbuseAction(intent: CommentTranslatorSessionCommandIntent) {
  if (intent === "start") {
    return "session-start";
  }

  if (intent === "stop") {
    return "session-stop";
  }

  if (intent === "heartbeat") {
    return "session-heartbeat";
  }

  return "session-status";
}

async function readSessionCommand(request: NextRequest): Promise<{
  intent: CommentTranslatorSessionCommandIntent;
  credentialReferenceId: string | null;
  browserConnected: boolean;
  stopReason: "user-stop" | "browser-disconnect" | undefined;
  sourceLanguage: CommentTranslatorSourceLanguageId | undefined;
  targetLanguage: CommentTranslatorTargetLanguageId;
}> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      const body = (await request.json()) as {
        intent?: unknown;
        credentialReferenceId?: unknown;
        browserConnected?: unknown;
        stopReason?: unknown;
        sourceLanguage?: unknown;
        targetLanguage?: unknown;
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
      stopReason: formData.get("stopReason"),
      sourceLanguage: formData.get("sourceLanguage"),
      targetLanguage: formData.get("targetLanguage")
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
  sourceLanguage?: unknown;
  targetLanguage?: unknown;
}): {
  intent: CommentTranslatorSessionCommandIntent;
  credentialReferenceId: string | null;
  browserConnected: boolean;
  stopReason: "user-stop" | "browser-disconnect" | undefined;
  sourceLanguage: CommentTranslatorSourceLanguageId | undefined;
  targetLanguage: CommentTranslatorTargetLanguageId;
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
  const sourceLanguage = normalizeSessionCommandSourceLanguage(body.sourceLanguage);
  const targetLanguage: CommentTranslatorTargetLanguageId = body.targetLanguage === "en" ? "en" : "ja";

  return {
    intent,
    credentialReferenceId,
    browserConnected,
    stopReason,
    sourceLanguage,
    targetLanguage
  };
}

function normalizeSessionCommandSourceLanguage(value: unknown): CommentTranslatorSourceLanguageId | undefined {
  return value === "ja" || value === "en" || value === "ko" || value === "zh" ? value : undefined;
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
  const trustedTokenMaterialRuntime =
    credentialResolutionDisabled || callerAuthorization.status !== "authorized"
      ? null
      : createTrustedYouTubeOAuthCredentialSupabaseTokenMaterialRuntime();
  const status = await readYouTubeOAuthCredentialStatus({
    credentialReferenceId,
    trustedAdapter: trustedStatusReader?.trustedAdapter ?? null,
    trustedRefreshRuntime:
      trustedTokenMaterialRuntime?.status === "ready"
        ? createTrustedYouTubeOAuthStoredCredentialRefreshRuntime({
            tokenMaterialAdapter: trustedTokenMaterialRuntime.trustedTokenMaterialAdapter
          })
        : null,
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
