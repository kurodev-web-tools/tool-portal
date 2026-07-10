import { notFound } from "next/navigation";
import {
  CommentTranslatorDock,
  type CommentTranslatorDockInitialSessionState
} from "@/components/comment-translator/CommentTranslatorDock";
import { PortalShell } from "@/components/portal/PortalShell";
import type { CommentTranslatorRealCommentsFeedState } from "@/lib/comment-translator-real-comments-feed-shared";
import type { CommentTranslatorToolCredentialStatusSource } from "@/lib/comment-translator-youtube-tool-credential-source";

const fixturePhases = ["running", "rate-paused", "resyncing"] as const;
type FixturePhase = (typeof fixturePhases)[number];

const phaseAllowlist = new Set<string>(fixturePhases);
const freeLimitSeconds = 30 * 60;
const fixtureAccountStatus: NonNullable<Parameters<typeof PortalShell>[0]["accountStatus"]> = {
  configStatus: "ready",
  missingEnv: [],
  authStatus: "signed-out",
  user: null,
  remotePreferences: null,
  remotePreferenceStatus: "not-signed-in"
};

const credentialStatusSource = {
  sourceId: "server-owned-trusted-connected-credential-status",
  statusMetadata: {
    status: "available",
    provider: "youtube",
    reconnectRequired: false,
    scopeLabel: "youtube.readonly",
    expiresAtIso: null,
    reason: null,
    payloadBoundary: "sanitized-credential-status-metadata-only"
  },
  clientReadableValues: "sanitized-credential-status-metadata-only",
  storageBoundary: "no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change",
  backgroundMonitoring: "not-started-by-connection"
} satisfies CommentTranslatorToolCredentialStatusSource;

const initialRealCommentsFeed = {
  status: "ready",
  source: "server-owned-live-session-state",
  rows: [],
  unavailableReason: null,
  sanitizedSummary: {
    displayRowCount: 0,
    safeRowSource: "f8-browser-safe-projection",
    fixtureFeedAuthority: "disabled",
    manualFeedAuthority: "disabled",
    rawProviderPayload: "not-returned-by-design",
    rawComments: "not-returned-by-design",
    authorChannelMaterial: "not-returned-by-design",
    providerTargetMetadata: "forbidden",
    serverOnlyCursor: "not-returned-by-design",
    liveProviderDiagnostics: null
  },
  rawProviderPayload: "not-returned-by-design",
  rawComments: "not-returned-by-design",
  providerTargetMetadata: "forbidden",
  serverOnlyCursor: "not-returned-by-design",
  browserStorage: "unchanged",
  handoffPayload: "unchanged",
  publicLaunchAllowed: false
} satisfies CommentTranslatorRealCommentsFeedState;

function createUsageDisplay(used: number): CommentTranslatorDockInitialSessionState["usageDisplay"] {
  return {
    status: "available",
    session: { usedSeconds: 120, limitSeconds: freeLimitSeconds, remainingSeconds: 1_680 },
    daily: { usedSeconds: 120, limitSeconds: freeLimitSeconds, remainingSeconds: 1_680 },
    perMinute: { used, limit: 30, remaining: Math.max(0, 30 - used) },
    monthlyInputCharacterCap: { used: 1_250, limit: 20_000, remaining: 18_750 },
    unavailableReason: null,
    providerCallPolicy: {
      status: "allowed",
      stopReason: null,
      clientReadableDetail: "sanitized-usage-only"
    },
    noProviderCallWhenOverLimit: true,
    clientReadableDetail: "sanitized-usage-only"
  };
}

function createActiveFixtureState(
  activePhase: FixturePhase
): CommentTranslatorDockInitialSessionState {
  const rateLimited = activePhase !== "running";
  return {
    status: "active",
    plan: "free",
    sessionReferenceId: null,
    elapsedSeconds: 120,
    remainingSessionSeconds: 1_680,
    remainingDailySeconds: 1_680,
    stopReason: null,
    reasonUx: null,
    usageDisplay: createUsageDisplay(rateLimited ? 30 : 7),
    nextAction: "send-heartbeat-or-stop",
    activePhase,
    ratePauseReason: rateLimited ? "translated-message-cap" : null,
    automaticResumeExpected: rateLimited,
    retryAfterSeconds: activePhase === "rate-paused" ? 20 : null
  };
}

const fixtureSessionStates = {
  running: createActiveFixtureState("running"),
  "rate-paused": createActiveFixtureState("rate-paused"),
  resyncing: createActiveFixtureState("resyncing")
} satisfies Record<FixturePhase, CommentTranslatorDockInitialSessionState>;

function resolvePhase(value: string | string[] | undefined): FixturePhase {
  if (typeof value !== "string" || !phaseAllowlist.has(value)) {
    return "running";
  }

  if (value === "rate-paused") {
    return "rate-paused";
  }

  return value === "resyncing" ? "resyncing" : "running";
}

export const dynamic = "force-dynamic";

export default async function CommentTranslatorPerMinuteAutoResumeFixturePage({
  searchParams
}: {
  readonly searchParams: Promise<{ readonly phase?: string | string[] }>;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const query = await searchParams;
  const phase = resolvePhase(query.phase);

  return (
    <PortalShell mode="workspace" accountStatus={fixtureAccountStatus}>
      <CommentTranslatorDock
        youtubeCredentialStatusSource={credentialStatusSource}
        initialRealCommentsFeed={initialRealCommentsFeed}
        initialSessionState={fixtureSessionStates[phase]}
        runtimeMode="dev-fixture"
      />
    </PortalShell>
  );
}
